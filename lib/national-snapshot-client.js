/**
 * Read-only consumer for ISEYC Observatory curated national source snapshots.
 * Fixed Observatory host, strict source allowlist, bounded response and explicit non-live semantics.
 */
export const DEFAULT_NATIONAL_SNAPSHOTS_URL =
  'https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/snapshots';

const ALLOWED_ENDPOINT_HOST = 'iseyc-civic-intelligence-observatory.vercel.app';
const ALLOWED_SOURCE_HOSTS = new Set([
  'afro.who.int',
  'www.afro.who.int',
  'dashboard.digitalliteracy.nitda.gov.ng',
  'nimc.gov.ng',
  'www.imf.org',
  'imf.org',
  'isnhubs.org.ng',
  'innovation.naseni.gov.ng',
  'emis.education.gov.ng',
  'ubec.gov.ng',
  'www.unicef.org',
  'nemis.education.gov.ng',
  'fmohconnect.gov.ng',
  'hfr.fmohconnect.gov.ng',
  'health.gov.ng',
  'budgetoffice.gov.ng', 'nphcda.gov.ng', 'phc.nphcda.gov.ng', 'portal.nphcda.gov.ng',
  'nphcda.gov.ng',
  'publicfinance.ngf.org.ng',
  'www.publicfinance.ngf.org.ng',
]);
const MAX_BODY_BYTES = 300_000;
const MAX_OBSERVATIONS = 8;
const ALLOWED_SOURCE_IDS = new Set([
  'who-gho-nigeria',
  'nitda-dl4all-dashboard',
  'nimc-nin-enrolment-2025',
  'imf-article-iv-2026',
  'isn-innovation-hub-assessment',
  'naseni-innovation-hub',
  'fme-education-emis-asc-2024-25',
  'nphcda-phc-progress-2025',
  'ngf-public-finance-database',
]);

function safeHttps(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.has(url.hostname);
  } catch {
    return false;
  }
}

function validObservation(item) {
  return Boolean(
    item && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.title === 'string' && item.title.length > 0 &&
    typeof item.value === 'number' && Number.isFinite(item.value) &&
    typeof item.unit === 'string' && item.unit.length > 0 &&
    typeof item.referencePeriod === 'string' && item.referencePeriod.length > 0 &&
    typeof item.measurementType === 'string' &&
    typeof item.sourceId === 'string' && ALLOWED_SOURCE_IDS.has(item.sourceId) &&
    ['official_source', 'published_research'].includes(item.sourceType) &&
    typeof item.sourcePublisher === 'string' && item.sourcePublisher.length > 0 &&
    safeHttps(item.sourceUrl, ALLOWED_SOURCE_HOSTS) &&
    Array.isArray(item.limitations) && item.limitations.every((x) => typeof x === 'string') &&
    Array.isArray(item.departments) && item.departments.every((x) => typeof x === 'string')
  );
}

function terms(value) {
  return [...new Set(String(value || '').toLowerCase().match(/[a-z0-9-]{3,}/g) || [])];
}

function relevanceScore(item, query) {
  const q = String(query || '').toLowerCase();
  const departmentTerms = [];
  if (/\b(health|hospital|phc|maternal|mortality|child|medicine|clinic|facility)\b/.test(q)) departmentTerms.push('health');
  if (/\b(education|school|teacher|learning|digital literacy|skills|classroom|learner)\b/.test(q)) departmentTerms.push('education');
  if (/\b(technology|software|digital|innovation|startup|hub|engineering)\b/.test(q)) departmentTerms.push('software-technology');
  if (/\b(civic|identity|nin|population|voter|registration)\b/.test(q)) departmentTerms.push('civic');
  let score = departmentTerms.some((id) => item.departments.includes(id)) ? 3 : 0;
  const geography = String(item.geographicCoverage || '').toLowerCase();
  if (q.includes('kaduna') && geography.includes('kaduna')) score += 12;
  if (q.includes('national') && item.geoLevel === 'national') score += 3;
  const words = terms(q);
  const title = String(item.title || '').toLowerCase();
  const publisher = String(item.sourcePublisher || '').toLowerCase();
  const context = [item.interpretation, item.unit, item.referencePeriod].join(' ').toLowerCase();
  for (const word of words) {
    if (title.includes(word)) score += 4;
    if (publisher.includes(word)) score += 2;
    if (context.includes(word)) score += 1;
  }
  if (/\b(teacher|classroom|toilet|school|learner|reporting)\b/.test(q) && item.sourceId === 'fme-education-emis-asc-2024-25') score += 3;
  return score;
}

export async function fetchNationalSnapshots(query = '', fetchImpl = fetch, options = {}) {
  const endpoint = String(options.url || DEFAULT_NATIONAL_SNAPSHOTS_URL).trim();
  if (!safeHttps(endpoint, new Set([ALLOWED_ENDPOINT_HOST]))) {
    return { status: 'invalid', observations: [], catalogOnlySources: [], limitations: ['The configured national snapshot endpoint is not the approved ISEYC Observatory host.'] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 7000);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const raw = await response.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return { status: 'invalid', observations: [], catalogOnlySources: [], limitations: ['The national snapshot response exceeded the safe size limit.'] };
    }
    let data;
    try { data = JSON.parse(raw); } catch {
      return { status: 'invalid', observations: [], catalogOnlySources: [], limitations: ['The national snapshot response was not valid JSON.'] };
    }
    if (!response.ok || data?.contractVersion !== '1.0.0' || !Array.isArray(data.observations)) {
      return { status: 'unavailable', observations: [], catalogOnlySources: [], limitations: ['The Observatory national snapshot endpoint is unavailable or returned an unsupported contract.'] };
    }

    const valid = data.observations.filter(validObservation);
    const invalidCount = data.observations.length - valid.length;
    const selected = valid.map((item, index) => ({ item, index, score: relevanceScore(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, MAX_OBSERVATIONS)
      .map((entry) => entry.item);
    const catalogOnlySources = (Array.isArray(data.catalogOnlySources) ? data.catalogOnlySources : [])
      .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' &&
        typeof item.note === 'string' && safeHttps(item.url, new Set([
          'microdata.nigerianstat.gov.ng', 'www.ondi.nitda.gov.ng', 'ondi.nitda.gov.ng', 'innovation.naseni.gov.ng', 'ubec.gov.ng', 'www.unicef.org', 'nemis.education.gov.ng', 'fmohconnect.gov.ng', 'hfr.fmohconnect.gov.ng', 'health.gov.ng', 'budgetoffice.gov.ng',
        ])) && (!query || isCatalogueRelevant(item, query)))
      .slice(0, 4);

    return {
      status: invalidCount ? (selected.length ? 'partial' : 'invalid') : selected.length || catalogOnlySources.length ? 'ready' : 'empty',
      checkedAt: typeof data.checkedAt === 'string' ? data.checkedAt : null,
      observations: selected,
      catalogOnlySources,
      limitations: [
        'These are curated source transcriptions, not live source feeds.',
        ...(Array.isArray(data.limitations) ? data.limitations.slice(0, 6) : []),
        ...(invalidCount ? ['One or more snapshot rows failed the source allowlist and were excluded.'] : []),
      ],
      invalidCount,
    };
  } catch (error) {
    return {
      status: error?.name === 'AbortError' ? 'unavailable' : 'unavailable',
      observations: [],
      catalogOnlySources: [],
      limitations: ['The Observatory national snapshot endpoint could not be retrieved. No substitute statistics are used.'],
    };
  } finally {
    clearTimeout(timer);
  }
}

function isCatalogueRelevant(item, query) {
  const q = String(query || '').toLowerCase();
  if (/\b(inflation|cpi|prices|cost of living)\b/.test(q) && /nbs|price|inflation|consumer/.test((item.publisher + ' ' + item.title).toLowerCase())) return true;
  if (/\b(technology|software|digital|innovation|startup|hub|engineering)\b/.test(q) && /innovation|technology|naseni|ondi/.test((item.publisher + ' ' + item.title).toLowerCase())) return true;
  return terms(q).some((word) => (item.publisher + ' ' + item.title).toLowerCase().includes(word));
}

export function formatNationalSnapshotBlock(bundle) {
  if (!bundle || ['unavailable', 'invalid'].includes(bundle.status)) {
    return 'NATIONAL_SNAPSHOT_STATUS: ' + (bundle?.status || 'unavailable') + '\nNo curated national snapshots were available. Do not invent statistics or substitute another geography.';
  }
  if (bundle.status === 'empty') {
    return 'NATIONAL_SNAPSHOT_STATUS: empty\nNo relevant curated snapshot was selected for this question. This is not evidence that no data exist.';
  }

  const lines = [
    'SOURCE_LAYER: ISEYC Civic Intelligence Observatory — curated national source snapshots',
    'SOURCE_TYPE: Manual source transcriptions from cited official publications and published research; not live feeds.',
    'STATUS: ' + bundle.status,
    'SOURCE_CHECKED_AT: ' + (bundle.checkedAt || 'not stated'),
    'SELECTED_OBSERVATIONS: ' + bundle.observations.length,
  ];
  for (const item of bundle.observations) {
    lines.push('');
    lines.push('INDICATOR: ' + item.title);
    lines.push('VALUE: ' + (item.valueQualifier ? item.valueQualifier + ' ' : '') + item.value + ' ' + item.unit);
    lines.push('REFERENCE_PERIOD: ' + item.referencePeriod);
    lines.push('SOURCE_UPDATE_DATE: ' + (item.sourceUpdateDate || 'not stated'));
    lines.push('MEASUREMENT_TYPE: ' + item.measurementType);
    lines.push('GEOGRAPHY: ' + item.geographicCoverage + ' (' + item.geoLevel + ')');
    lines.push('PUBLISHER: ' + item.sourcePublisher);
    lines.push('SOURCE_TYPE: ' + item.sourceType);
    lines.push('SOURCE_URL: ' + item.sourceUrl);
    lines.push('INTERPRETATION: ' + String(item.interpretation || '').slice(0, 700));
    lines.push('LIMITATIONS:');
    for (const limitation of item.limitations.slice(0, 5)) lines.push('- ' + limitation.slice(0, 400));
  }
  for (const item of bundle.catalogOnlySources || []) {
    lines.push('');
    lines.push('CATALOGUE_ONLY_SOURCE: ' + item.title);
    lines.push('PUBLISHER: ' + item.publisher);
    lines.push('SOURCE_URL: ' + item.url);
    lines.push('STATUS: No observation has been integrated from this catalogue entry.');
    lines.push('NOTE: ' + item.note);
  }
  for (const limitation of bundle.limitations || []) lines.push('GLOBAL_LIMITATION: ' + limitation);
  return lines.join('\n');
}
