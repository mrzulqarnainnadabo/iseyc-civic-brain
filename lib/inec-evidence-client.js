/**
 * Read-only client for ISEYC Observatory's allowlisted official-source INEC snapshots.
 * These are transcriptions of INEC publications, not a live INEC API.
 */

export const DEFAULT_INEC_EVIDENCE_URL =
  'https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/inec';

const CONTRACT_VERSION = '1.0.0';
const ALLOWED_HOST = 'iseyc-civic-intelligence-observatory.vercel.app';
const OFFICIAL_SOURCE_HOSTS = ['inecnigeria.org'];
const DATASETS = new Set([
  '2023-pvc',
  'cvr-2025-26',
  'ekiti-2026-register',
  'osun-2026-pvc',
]);
const STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers',
  'Sokoto','Taraba','Yobe','Zamfara',
];
const MAX_BODY_BYTES = 250_000;
const MAX_LIMITATIONS = 8;

function empty(status, limitations = [], errorCode = null, datasets = []) {
  return { source: 'iseyc-observatory-inec-v1', contractVersion: CONTRACT_VERSION, status, datasets, limitations, errorCode };
}

function isOfficialSource(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      OFFICIAL_SOURCE_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

function stateFromQuery(query) {
  const text = String(query || '').toLowerCase();
  return STATES.find((state) => new RegExp('(^|[^a-z])' + state.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(text)) || null;
}

function selectDatasets(query) {
  const text = String(query || '').toLowerCase();
  const relevant = /\b(voter|voters|pvcs?|cvr|continuous voter registration|registered voters?|voter register|electoral register)\b/.test(text);
  if (!relevant) return [];

  if (/\bosun\b/.test(text) && /\b(pvcs?|collected|collection)\b/.test(text)) return ['osun-2026-pvc'];
  if (/\bekiti\b/.test(text) && /\b(voter|register|registration|election)\b/.test(text)) return ['ekiti-2026-register'];
  if (/\b2023\b/.test(text)) return ['2023-pvc'];
  if (/\b(cvr|continuous voter registration|current|latest|2026|today)\b/.test(text)) {
    return ['cvr-2025-26', '2023-pvc'];
  }
  return ['2023-pvc', 'cvr-2025-26'];
}
const RECORD_KEYS = {
  'inec-2023-registered-voters-pvc-collection': new Set([
    'state', 'registeredVoters', 'collectedPVCs', 'uncollectedPVCsReported',
    'uncollectedPVCsCalculated', 'uncollectedDiscrepancy',
    'collectionRateReported', 'collectionRateCalculated',
  ]),
  'inec-cvr-2025-26-phase-one-reported-counts': new Set([
    'statementId', 'publicationDate', 'phase', 'registrationStart',
    'registrationEnd', 'newEligibleVotersReported', 'sourceUrl',
  ]),
  'inec-ekiti-2026-election-register-snapshot': new Set([
    'state', 'registeredVotersForElection', 'baseRegister2023',
    'newRegistrantsReported', 'doubleRegistrationsInvalidatedReported',
    'calculatedBasePlusNew', 'unreconciledDifference', 'pollingUnits',
    'localGovernmentAreas',
  ]),
  'inec-osun-2026-pvc-collection': new Set([
    'state', 'collectedPVCs', 'localGovernmentAreas', 'breakdown',
  ]),
};

function validateRecord(record, datasetId) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  const allowed = RECORD_KEYS[datasetId];
  if (!allowed || Object.keys(record).some((key) => !allowed.has(key))) return false;
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return false;
    if (typeof value === 'number' && !Number.isFinite(value)) return false;
    if (key === 'sourceUrl' && !isOfficialSource(value)) return false;
  }
  return true;
}

function validateDataset(data, expectedId) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'INVALID_PAYLOAD';
  if (data.contractVersion !== CONTRACT_VERSION) return 'UNSUPPORTED_CONTRACT';
  if (data.status !== 'ok' && data.status !== 'empty') return 'UPSTREAM_DATASET_ERROR';
  if (data.datasetId !== expectedId || !DATASETS.has(
    expectedId === 'inec-2023-registered-voters-pvc-collection' ? '2023-pvc' :
    expectedId === 'inec-cvr-2025-26-phase-one-reported-counts' ? 'cvr-2025-26' :
    expectedId === 'inec-ekiti-2026-election-register-snapshot' ? 'ekiti-2026-register' :
    expectedId === 'inec-osun-2026-pvc-collection' ? 'osun-2026-pvc' : ''
  )) return 'DATASET_ID_MISMATCH';
  if (data.publisher !== 'Independent National Electoral Commission (INEC)') return 'PUBLISHER_MISMATCH';
  if (typeof data.title !== 'string' || !data.title.trim() || typeof data.retrievedAt !== 'string') return 'MISSING_DATASET_METADATA';
  if (data.sourceReferenceDate !== null && typeof data.sourceReferenceDate !== 'string') return 'INVALID_REFERENCE_DATE';
  if (!isOfficialSource(data.sourceUrl)) return 'UNTRUSTED_SOURCE_URL';
  if (!Array.isArray(data.records) || !Number.isInteger(data.recordCount) || data.recordCount !== data.records.length) return 'RECORD_COUNT_MISMATCH';
  if (!Array.isArray(data.limitations) || data.limitations.some((item) => typeof item !== 'string' || item.length > 2000) || typeof data.methodology !== 'string' || data.methodology.length > 3000) return 'MISSING_METHOD_OR_LIMITATIONS';
  if (data.records.some((record) => !validateRecord(record, expectedId))) return 'RECORD_SCHEMA_MISMATCH';
  if (data.sourceReportedNationalTotals && Object.entries(data.sourceReportedNationalTotals).some(([key, value]) => !['registeredVoters', 'collectedPVCs', 'collectionRate', 'uncollectedPVCs', 'uncollectedRate'].includes(key) || typeof value !== 'number' || !Number.isFinite(value))) return 'NATIONAL_TOTAL_SCHEMA_MISMATCH';
  return null;
}

async function fetchDataset(fetchImpl, baseUrl, datasetId, state, timeoutMs) {
  const url = new URL(baseUrl);
  url.searchParams.set('dataset', datasetId);
  if (state && datasetId !== 'cvr-2025-26') url.searchParams.set('state', state);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const raw = await response.text();
    if (raw.length > MAX_BODY_BYTES) return { error: 'RESPONSE_TOO_LARGE' };
    let data;
    try { data = JSON.parse(raw); } catch { return { error: 'RESPONSE_PARSE_ERROR' }; }
    if (!response.ok) return { error: data?.error || 'UPSTREAM_HTTP_' + response.status };
    const expectedIds = {
      '2023-pvc': 'inec-2023-registered-voters-pvc-collection',
      'cvr-2025-26': 'inec-cvr-2025-26-phase-one-reported-counts',
      'ekiti-2026-register': 'inec-ekiti-2026-election-register-snapshot',
      'osun-2026-pvc': 'inec-osun-2026-pvc-collection',
    };
    const validationError = validateDataset(data, expectedIds[datasetId]);
    if (validationError) return { error: validationError };
    return { data };
  } catch (error) {
    return { error: error?.name === 'AbortError' ? 'SOURCE_TIMEOUT' : 'SOURCE_FETCH_FAILED' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchInecEvidence(query, fetchImpl = fetch, options = {}) {
  const datasetIds = selectDatasets(query);
  if (!datasetIds.length) return empty('skipped', ['The question did not require the available INEC voter-register or PVC datasets.']);

  const baseUrl = String(options.url || DEFAULT_INEC_EVIDENCE_URL).trim();
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) {
      return empty('invalid', ['The configured INEC evidence endpoint is not on the approved ISEYC Observatory host.'], 'UNTRUSTED_ENDPOINT');
    }
  } catch {
    return empty('invalid', ['The configured INEC evidence endpoint URL is invalid.'], 'INVALID_ENDPOINT');
  }

  const state = stateFromQuery(query);
  const results = await Promise.all(datasetIds.map((id) =>
    fetchDataset(fetchImpl, baseUrl, id, state, options.timeoutMs || 6000)
  ));
  const valid = results.filter((result) => result.data).map((result) => result.data);
  const errors = results.filter((result) => result.error).map((result) => result.error);
  if (!valid.length) return empty('unavailable', ['The ISEYC Observatory INEC evidence source could not be retrieved. No substitute data are used.'], errors[0] || 'SOURCE_UNAVAILABLE');
  return {
    source: 'iseyc-observatory-inec-v1',
    contractVersion: CONTRACT_VERSION,
    status: errors.length ? 'partial' : 'ready',
    datasets: valid,
    limitations: errors.length ? ['One or more requested INEC datasets could not be retrieved; this answer uses only the datasets listed as available.'] : [],
    errorCode: errors[0] || null,
    stateFilter: state,
    fetchedAt: new Date().toISOString(),
  };
}

function formatRecord(dataset, stateFilter) {
  const records = Array.isArray(dataset.records) ? dataset.records : [];
  const selected = dataset.datasetId === 'inec-cvr-2025-26-phase-one-reported-counts' || !stateFilter
    ? records
    : records.filter((record) => String(record.state || '').toLowerCase() === stateFilter.toLowerCase());
  if (dataset.datasetId === 'inec-2023-registered-voters-pvc-collection' && !stateFilter) return [];
  const shown = selected.slice(0, 5);
  return shown.map((record) => {
    const fields = Object.entries(record)
      .filter(([key, value]) => value !== null && value !== undefined && typeof value !== 'object')
      .map(([key, value]) => key + ': ' + String(value));
    if (record.breakdown) fields.push('breakdown: ' + record.breakdown);
    return fields.join('\n');
  });
}

export function formatInecEvidenceBlock(bundle) {
  if (!bundle || bundle.status === 'skipped') return 'No INEC dataset was requested for this question.';
  if (bundle.status === 'unavailable' || bundle.status === 'invalid') {
    return 'INEC_EVIDENCE_STATUS: ' + bundle.status + '\nThe official-source evidence endpoint is unavailable or invalid. Do not invent voter-register or PVC figures.';
  }

  const lines = [
    'SOURCE_LAYER: ISEYC Civic Intelligence Observatory — official-source INEC transcriptions',
    'SOURCE_TYPE: Official INEC publications transcribed by ISEYC; this is not a live INEC API.',
    'CONTRACT_VERSION: ' + CONTRACT_VERSION,
    'STATUS: ' + bundle.status,
    'RETRIEVED_AT: ' + (bundle.fetchedAt || 'unknown'),
    'GEOGRAPHIC_FILTER: ' + (bundle.stateFilter || 'national / dataset-defined'),
  ];

  for (const dataset of bundle.datasets || []) {
    lines.push('');
    lines.push('DATASET: ' + dataset.datasetId);
    lines.push('TITLE: ' + dataset.title);
    lines.push('PUBLISHER: ' + dataset.publisher);
    lines.push('REFERENCE_DATE: ' + (dataset.sourceReferenceDate || 'not specified by source'));
    lines.push('SOURCE_URL: ' + dataset.sourceUrl);
    lines.push('METHODOLOGY: ' + dataset.methodology.slice(0, 1600));

    if (dataset.sourceReportedNationalTotals) {
      lines.push('SOURCE_REPORTED_NATIONAL_TOTALS: ' + JSON.stringify(dataset.sourceReportedNationalTotals));
    }
    if (dataset.nationalFinalPostCvrRegister !== undefined) {
      lines.push('FINAL_POST_CVR_REGISTER: ' + (dataset.nationalFinalPostCvrRegister === null ? 'not published in reviewed source set' : JSON.stringify(dataset.nationalFinalPostCvrRegister)));
    }
    if (typeof dataset.reconciliation?.note === 'string') {
      lines.push('RECONCILIATION: ' + dataset.reconciliation.note.slice(0, 1200));
    }

    for (const record of formatRecord(dataset, bundle.stateFilter)) {
      lines.push('RECORD:\n' + record);
    }
    if (dataset.limitations?.length) {
      lines.push('LIMITATIONS:');
      for (const limitation of dataset.limitations.slice(0, MAX_LIMITATIONS)) lines.push('- ' + limitation.slice(0, 500));
    }
  }

  if (bundle.limitations?.length) {
    lines.push('RETRIEVAL_LIMITATIONS:');
    for (const limitation of bundle.limitations) lines.push('- ' + limitation);
  }
  return lines.join('\n');
}
