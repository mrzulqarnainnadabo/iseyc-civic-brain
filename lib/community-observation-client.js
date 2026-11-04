/**
 * Read-only client for the separate Community Observation v0.1 feed.
 * Never falls back to Civic Mandate demands, pulse, synthetic data or public statistics.
 */

export const DEFAULT_COMMUNITY_OBSERVATIONS_URL =
  process.env.CIVIC_MANDATE_COMMUNITY_OBSERVATIONS_URL ||
  'https://2027-street-mandate.vercel.app/api/v1/community-observations';

const CONTRACT_VERSION = '0.1.0';
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const MAX_CONTEXT_RECORDS = 20;
const VALID_VERIFICATION = new Set(['unverified', 'corroborated', 'independently-verified', 'disputed']);
const VALID_SECTORS = new Set(['Health', 'Education', 'Security', 'Infrastructure', 'Water and sanitation', 'Employment', 'Public finance', 'Governance', 'Agriculture', 'Environment']);
const PUBLIC_KEYS = new Set([
  'id', 'displayId', 'contractVersion', 'publicationStatus', 'verificationStatus',
  'title', 'reportType', 'sector', 'state', 'lga', 'ward', 'placeOrFacility',
  'observedOn', 'description', 'evidenceTypes', 'evidenceLink', 'submittedAt', 'publishedAt',
]);

function feed(status, records = [], total = null, limitations = [], errorCode = null) {
  return { source: 'civic-mandate-community-observations-v0.1', contractVersion: CONTRACT_VERSION, status, records, total, limitations, errorCode };
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  const keys = Object.keys(record);
  if (keys.some((key) => !PUBLIC_KEYS.has(key))) return false;
  return record.contractVersion === CONTRACT_VERSION &&
    record.publicationStatus === 'published' &&
    typeof record.id === 'string' && record.id.length > 0 &&
    isNullableString(record.displayId) &&
    typeof record.title === 'string' && record.title.trim().length > 0 &&
    typeof record.description === 'string' && record.description.trim().length > 0 &&
    typeof record.reportType === 'string' && record.reportType.length > 0 &&
    typeof record.sector === 'string' && VALID_SECTORS.has(record.sector) &&
    typeof record.state === 'string' && record.state.length > 0 &&
    isNullableString(record.lga) && isNullableString(record.ward) &&
    isNullableString(record.placeOrFacility) && isNullableString(record.observedOn) &&
    Array.isArray(record.evidenceTypes) && record.evidenceTypes.every((item) => typeof item === 'string') &&
    (record.evidenceLink === null || (typeof record.evidenceLink === 'string' && record.evidenceLink.startsWith('https://'))) &&
    VALID_VERIFICATION.has(record.verificationStatus) &&
    typeof record.submittedAt === 'string' && isNullableString(record.publishedAt);
}

function tokenize(value) {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'where', 'when', 'how', 'are', 'was', 'were', 'has', 'have', 'does', 'into', 'about', 'near', 'show', 'tell']);
  return String(value || '').toLowerCase().match(/[a-z0-9-]{3,}/g)?.filter((word) => !stop.has(word)) || [];
}

function rankRelevant(records, query) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [...records].slice(0, MAX_CONTEXT_RECORDS);
  return [...records]
    .map((record, index) => {
      const haystack = [
        record.title, record.description, record.reportType, record.sector,
        record.state, record.lga || '', record.ward || '', record.placeOrFacility || '',
      ].join(' ').toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { record, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_CONTEXT_RECORDS)
    .map((item) => item.record);
}

export async function fetchPublishedCommunityObservations(fetchImpl = fetch, options = {}) {
  const baseUrl = String(options.url || DEFAULT_COMMUNITY_OBSERVATIONS_URL).trim();
  if (!/^https:\/\//i.test(baseUrl)) {
    return feed('invalid', [], null, ['The configured observation source URL is invalid.']);
  }

  async function getPage(page) {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { return { error: 'OBSERVATION_FEED_PARSE_ERROR' }; }
      if (!response.ok) return { error: data?.diagnosticCode || 'OBSERVATION_FEED_UNAVAILABLE' };
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const first = await getPage(1);
    if (first?.error) return feed('unavailable', [], null, ['The published community observation feed is unavailable. No substitute records are used.'], first.error);
    if (!first || first.contractVersion !== CONTRACT_VERSION || first.publicationBoundary !== 'published-only' ||
      first.page !== 1 || !Number.isInteger(first.total) || first.total < 0 ||
      !Number.isInteger(first.totalPages) || first.totalPages < 1 || !Array.isArray(first.records)) {
      return feed('invalid', [], null, ['The community observation feed returned an unsupported contract.']);
    }
    if (first.truncatedUpstream) {
      return feed('incomplete', [], first.total, ['The source reports an incomplete feed. No records are used as a complete set.']);
    }
    if (first.totalPages > MAX_PAGES) {
      return feed('incomplete', [], first.total, ['The feed exceeds the safe pagination limit.']);
    }

    const all = [...first.records];
    for (let page = 2; page <= first.totalPages; page += 1) {
      const next = await getPage(page);
      if (next?.error) return feed('unavailable', [], first.total, ['A later page could not be retrieved. The feed is withheld.'], next.error);
      if (!next || next.contractVersion !== CONTRACT_VERSION || next.publicationBoundary !== 'published-only' ||
        next.page !== page || next.total !== first.total || next.totalPages !== first.totalPages || !Array.isArray(next.records)) {
        return feed('invalid', [], first.total, ['Community observation pagination is inconsistent.']);
      }
      if (next.truncatedUpstream) {
        return feed('incomplete', [], first.total, ['The source reports an incomplete feed.']);
      }
      all.push(...next.records);
    }

    if (all.length !== first.total) {
      return feed('incomplete', [], first.total, ['The retrieved record count does not match the source total.']);
    }
    if (!all.every(validateRecord)) {
      return feed('invalid', [], first.total, ['One or more records failed the public allowlist and contract checks.']);
    }
    if (new Set(all.map((record) => record.id)).size !== all.length) {
      return feed('invalid', [], first.total, ['Duplicate observation IDs were returned.']);
    }
    if (!all.length) {
      return feed('empty', [], 0, [
        'No community observations have passed the dual-review publication gate.',
        'An empty feed does not mean there are no community concerns or service gaps.',
      ]);
    }

    return feed('ready', all, first.total, [
      'Community observations are submitted reports, not representative survey results.',
      'Publication means dual editorial review, not independent verification.',
      'A community report is not official administrative evidence unless separately corroborated.',
      'Report counts are not prevalence or population estimates.',
    ]);
  } catch {
    return feed('unavailable', [], null, ['The published community observation feed could not be retrieved. No substitute records are used.']);
  }
}

export function formatCommunityObservationBlock(bundle, query = '') {
  if (!bundle || bundle.status === 'unavailable' || bundle.status === 'invalid' || bundle.status === 'incomplete') {
    const status = bundle?.status || 'unavailable';
    return 'COMMUNITY_OBSERVATION_FEED_STATUS: ' + status + '\nNo community observation records are available for this answer. Do not infer absence of community concerns and do not substitute Civic Mandate demands, synthetic data or national indicators.';
  }
  if (bundle.status === 'empty') {
    return 'COMMUNITY_OBSERVATION_FEED_STATUS: empty\nNo observations have passed the dual-review publication gate. This does not mean there are no community concerns or service gaps.';
  }

  const selected = rankRelevant(bundle.records, query);
  const lines = [
    'PRIMARY_SOURCE: Civic Mandate Nigeria — ISEYC Community Observations (published-only, dual-review gate)',
    'SOURCE_URL: ' + (bundle.sourceUrl || DEFAULT_COMMUNITY_OBSERVATIONS_URL),
    'CONTRACT_VERSION: ' + CONTRACT_VERSION,
    'PUBLISHED_OBSERVATIONS_TOTAL: ' + bundle.total,
    'INCLUDED_IN_CONTEXT: ' + selected.length,
    'RETRIEVED_AT: ' + new Date().toISOString(),
    'INTERPRETATION: These are published community reports. Publication is not independent verification or official confirmation.',
  ];
  if (bundle.records.length > selected.length) lines.push('CONTEXT_LIMIT: Only the most relevant 20 records are included; this is not an exhaustive list.');
  for (const record of selected) {
    const location = [record.state, record.lga, record.ward, record.placeOrFacility].filter(Boolean).join(' / ') || 'Place not specified';
    lines.push([
      'RECORD ' + (record.displayId || record.id),
      'Title: ' + record.title,
      'Type: ' + record.reportType,
      'Sector: ' + record.sector,
      'Location: ' + location,
      'Observed on: ' + (record.observedOn || 'not specified'),
      'Published on: ' + (record.publishedAt || 'not specified'),
      'Verification status: ' + record.verificationStatus,
      'Evidence basis: ' + (record.evidenceTypes.join(', ') || 'not specified'),
      'Description: ' + record.description,
      'Evidence link: ' + (record.evidenceLink || 'none supplied'),
    ].join('\n'));
  }
  lines.push('LIMITATIONS:');
  for (const limitation of bundle.limitations) lines.push('- ' + limitation);
  return lines.join('\n');
}
