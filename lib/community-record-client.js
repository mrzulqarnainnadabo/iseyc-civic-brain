/**
 * Read-only CommunityRecord consumer for Civic Brain.
 * Prefers Mandate GET /api/v1/community-records; pulse is a temporary outage fallback.
 * Valid empty responses stay empty. Invalid contracts fail closed.
 */

export const DEFAULT_COMMUNITY_RECORDS_URL =
  process.env.CIVIC_MANDATE_COMMUNITY_RECORDS_URL ||
  'https://2027-street-mandate.vercel.app/api/v1/community-records';

export const DEFAULT_PULSE_URL =
  process.env.CIVIC_MANDATE_PULSE_URL ||
  'https://2027-street-mandate.vercel.app/api/pulse';

const CONTRACT_VERSION = '0.1.0';
const PAGE_SIZE = 50;
const MAX_PAGES = 100;

export function fromCommunityRecord(r) {
  return {
    id: String(r.id),
    sentence: r.text,
    duty: r.duty,
    sector: r.sector ?? null,
    issueCategory: r.issueCategory ?? null,
    office: r.officeLabel,
    state: r.state,
    lga: r.lga,
    ward: r.ward ?? null,
    facilityRef: r.facilityRef ?? null,
    reportedAt: r.reportedAt ?? null,
    publishedAt: r.publishedAt ?? null,
    created: r.createdAt,
    evidenceRefIds: Array.isArray(r.evidenceRefIds) ? r.evidenceRefIds : [],
    followUpStatus: r.followUpStatus ?? 'unknown',
    relatedSuggestedIds: Array.isArray(r.relatedSuggestedIds) ? r.relatedSuggestedIds : [],
    contractVersion: r.contractVersion,
    publicationStatus: r.publicationStatus,
    verificationStatus: r.verificationStatus,
    publicUrl: 'https://2027-street-mandate.vercel.app/mandate/' + encodeURIComponent(String(r.id)),
  };
}

/** Normalize legacy pulse voice → same public record shape. */
export function fromPulseVoice(v) {
  return {
    id: String(v.id),
    sentence: v.sentence || '',
    duty: v.duty || v.mandate || null,
    sector: null,
    issueCategory: null,
    office: v.office || null,
    state: v.state || null,
    lga: v.lga || null,
    ward: null,
    facilityRef: null,
    reportedAt: null,
    publishedAt: null,
    created: v.created || null,
    evidenceRefIds: [],
    followUpStatus: 'unknown',
    relatedSuggestedIds: [],
    contractVersion: null,
    publicationStatus: 'published',
    verificationStatus: 'unverified',
    publicUrl: 'https://2027-street-mandate.vercel.app/mandate/' + encodeURIComponent(String(v.id)),
  };
}

function malformed(message) {
  const err = new Error(message || 'PUBLIC_RECORDS_MALFORMED');
  err.code = 'PUBLIC_RECORDS_MALFORMED';
  return err;
}

function retrievalFailureReason(error, stage) {
  const message = String(error?.message || '');
  const status = message.match(/HTTP (\d{3})/i)?.[1];
  if (status) return `${stage}_http_${status}`;
  if (error instanceof SyntaxError || /json/i.test(message)) return `${stage}_invalid_json`;
  return `${stage}_network_error`;
}

function isValidPage(data) {
  return Boolean(
    data &&
    data.contractVersion === CONTRACT_VERSION &&
    data.publicationBoundary === 'published-only' &&
    Array.isArray(data.records) &&
    Number.isInteger(data.page) &&
    Number.isInteger(data.totalPages)
  );
}

function validateRecord(r) {
  if (
    !r ||
    r.contractVersion !== CONTRACT_VERSION ||
    r.publicationStatus !== 'published' ||
    !r.id ||
    typeof r.text !== 'string' ||
    !r.text.trim() ||
    typeof r.verificationStatus !== 'string'
  ) {
    throw malformed('CommunityRecord violated the published v0.1 contract');
  }
}

/**
 * @returns {{source:string, fallbackReason:string|null, records:object[], total:number, truncated:boolean|null, states:number|null, contractVersion:string|null, limitations:string[]}}
 */
export async function fetchPublishedCommunityRecords(fetchImpl = fetch) {
  let first;
  try {
    const url = new URL(DEFAULT_COMMUNITY_RECORDS_URL);
    url.searchParams.set('page', '1');
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    const response = await fetchImpl(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('CommunityRecord HTTP ' + response.status);
    first = await response.json();
  } catch (error) {
    return fetchPulse(fetchImpl, retrievalFailureReason(error, 'community_record'));
  }

  if (!isValidPage(first)) {
    throw malformed('Unsupported CommunityRecord v0.1 response');
  }

  const all = [...first.records];
  const totalPages = Math.max(1, Number(first.totalPages) || 1);
  if (totalPages > MAX_PAGES) {
    throw malformed('CommunityRecord pagination exceeds the safe page limit');
  }

  for (let page = 2; page <= totalPages; page++) {
    let next;
    try {
      const url = new URL(DEFAULT_COMMUNITY_RECORDS_URL);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      const response = await fetchImpl(url.toString(), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('CommunityRecord HTTP ' + response.status);
      next = await response.json();
    } catch (error) {
      return fetchPulse(fetchImpl, retrievalFailureReason(error, 'community_record_page_' + page));
    }
    if (!isValidPage(next) || next.page !== page) {
      throw malformed('Invalid CommunityRecord pagination response');
    }
    all.push(...next.records);
  }

  all.forEach(validateRecord);
  const records = all.map(fromCommunityRecord);
  return {
    source: 'civic-mandate-community-records-v0.1',
    fallbackReason: null,
    contractVersion: CONTRACT_VERSION,
    records,
    total: typeof first.total === 'number' ? first.total : records.length,
    truncated: Boolean(first.truncatedUpstream),
    states: null,
    limitations: [
      first.verificationNote ||
        'verificationStatus defaults to unverified; publication is not independent verification.',
      first.prevalenceNote ||
        'Published records only — not a measure of national need.',
      'Named office is as recorded on the public record, not a legal determination.',
      ...(first.truncatedUpstream ? ['The upstream published feed is truncated; this is not a complete record set.'] : []),
    ],
  };
}

async function fetchPulse(fetchImpl, fallbackReason) {
  let data;
  try {
    const response = await fetchImpl(DEFAULT_PULSE_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Pulse HTTP ' + response.status);
    data = await response.json();
  } catch (error) {
    const err = new Error('PUBLIC_RECORDS_UNAVAILABLE');
    err.code = 'PUBLIC_RECORDS_UNAVAILABLE';
    err.fallbackReason = fallbackReason || retrievalFailureReason(error, 'pulse');
    throw err;
  }
  if (data?.error || !Array.isArray(data?.voices)) {
    const err = malformed('Pulse returned an invalid published-only response');
    err.fallbackReason = fallbackReason || 'pulse_invalid_contract';
    throw err;
  }
  const records = data.voices.map(fromPulseVoice);
  return {
    source: 'civic-mandate-pulse-published-only',
    fallbackReason: fallbackReason || 'community_record_unavailable',
    contractVersion: null,
    records,
    total: typeof data.total === 'number' ? data.total : records.length,
    truncated: Boolean(data.truncated),
    states: data.states ?? null,
    limitations: [
      'Published records only after human ISEYC review.',
      'Pilot coverage — not a representative national survey.',
      'Named office is as recorded on the public record, not a legal determination.',
      'Serving legacy pulse shape; CommunityRecord API is temporarily unavailable.',
    ],
  };
}
