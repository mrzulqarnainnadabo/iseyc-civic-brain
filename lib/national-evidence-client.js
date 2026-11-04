/**
 * Read-only client for the ISEYC Observatory's versioned INEC evidence snapshots.
 * This is an allowlisted transcription feed, not a live INEC API.
 */
export const DEFAULT_INEC_EVIDENCE_URL =
  process.env.CIVIC_OBSERVATORY_INEC_EVIDENCE_URL ||
  'https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/inec';

const CONTRACT_VERSION = '1.0.0';
const ALLOWED_DATASETS = new Set([
  'inec-2023-registered-voters-pvc-collection',
  'inec-ekiti-2026-election-register-snapshot',
  'inec-osun-2026-pvc-collection',
  'inec-cvr-2025-26-phase-one-reported-counts',
]);
const MAX_BODY_BYTES = 100_000;
const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa',
  'Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger',
  'Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT',
];

function result(status, datasets = [], errorCode = null, limitations = []) {
  return { status, contractVersion: CONTRACT_VERSION, datasets, errorCode, limitations, sourceUrl: DEFAULT_INEC_EVIDENCE_URL };
}

export async function fetchNationalINECEvidence(fetchImpl = fetch, options = {}) {
  const baseUrl = String(options.url || DEFAULT_INEC_EVIDENCE_URL).trim();
  if (!/^https:\/\//i.test(baseUrl)) {
    return result('invalid', [], 'INVALID_INEC_EVIDENCE_URL', ['Configured INEC evidence URL is invalid.'], baseUrl);
  }

  const url = new URL(baseUrl);
  url.searchParams.set('dataset', 'all');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 7000);
  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const raw = await response.text();
    if (raw.length > MAX_BODY_BYTES) return result('invalid', [], 'INEC_EVIDENCE_TOO_LARGE', [], baseUrl);
    let data;
    try { data = JSON.parse(raw); } catch { return result('invalid', [], 'INEC_EVIDENCE_PARSE_ERROR', [], baseUrl); }
    if (!response.ok) return result('unavailable', [], data?.error || 'INEC_EVIDENCE_UNAVAILABLE', [], baseUrl);
    if (data?.contractVersion !== CONTRACT_VERSION || data?.status !== 'ok' || !Array.isArray(data.datasets)) {
      return result('invalid', [], 'INEC_EVIDENCE_CONTRACT_INVALID', [], baseUrl);
    }

    const datasets = data.datasets.filter((dataset) =>
      dataset && ALLOWED_DATASETS.has(dataset.datasetId) &&
      typeof dataset.title === 'string' &&
      typeof dataset.publisher === 'string' &&
      typeof dataset.sourceUrl === 'string' &&
      dataset.sourceUrl.startsWith('https://') &&
      Array.isArray(dataset.records) &&
      Array.isArray(dataset.limitations)
    );
    if (datasets.length !== ALLOWED_DATASETS.size) {
      return result('invalid', [], 'INEC_EVIDENCE_DATASET_SET_INCOMPLETE', [], baseUrl);
    }
    if (!datasets.every((dataset) => dataset.publisher.includes('INEC'))) {
      return result('invalid', [], 'INEC_EVIDENCE_PUBLISHER_INVALID', [], baseUrl);
    }

    return result('ready', datasets, null, [
      'These are official-source transcriptions maintained by ISEYC, not a live INEC API.',
      'The source reference dates differ by dataset; do not combine the measures into one current national total.',
    ]);
  } catch (error) {
    return result('unavailable', [], error?.name === 'AbortError' ? 'INEC_EVIDENCE_TIMEOUT' : 'INEC_EVIDENCE_FETCH_FAILED', [], baseUrl);
  } finally {
    clearTimeout(timeout);
  }
}

function formatNumber(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('en-NG').format(value) : 'not reported';
}

function findDataset(bundle, fragment) {
  return bundle.datasets.find((dataset) => dataset.datasetId.includes(fragment));
}

function findStateInQuery(query) {
  const normalized = String(query || '').toLowerCase();
  return NIGERIAN_STATES.find((state) => new RegExp('(^|[^a-z])' + state.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(normalized));
}

export function formatNationalINECEvidenceBlock(bundle, query = '') {
  if (!bundle || bundle.status !== 'ready') {
    return 'INEC_EVIDENCE_STATUS: ' + (bundle?.status || 'unavailable') +
      '\nThe ISEYC INEC evidence snapshot is not available. Do not invent voter registration, PVC collection or turnout figures.';
  }

  const pvc = findDataset(bundle, '2023-registered-voters-pvc');
  const ekiti = findDataset(bundle, 'ekiti-2026');
  const osun = findDataset(bundle, 'osun-2026');
  const cvr = findDataset(bundle, 'cvr-2025-26');
  const state = findStateInQuery(query);
  const lines = [
    'PRIMARY_SOURCE: INEC official publications transcribed into ISEYC Observatory evidence contract v1.0.0',
    'SOURCE_URL: ' + bundle.sourceUrl,
    'IMPORTANT: This is a small allowlist of official-source transcriptions, not a live INEC API or a complete current national register.',
  ];

  if (pvc) {
    const totals = pvc.sourceReportedNationalTotals;
    lines.push('2023 GENERAL ELECTION — NATIONAL BASELINE (PVC collection as at ' + pvc.sourceReferenceDate + ')');
    lines.push('Registered voters: ' + formatNumber(totals.registeredVoters));
    lines.push('PVCs collected: ' + formatNumber(totals.collectedPVCs));
    lines.push('PVC collection rate reported by INEC: ' + totals.collectionRate + '%');
    if (state) {
      const row = pvc.records.find((item) => item.state.toLowerCase() === state.toLowerCase());
      if (row) {
        lines.push('State: ' + row.state);
        lines.push('Registered voters: ' + formatNumber(row.registeredVoters));
        lines.push('PVCs collected: ' + formatNumber(row.collectedPVCs));
        lines.push('Collection rate reported by INEC: ' + row.collectionRateReported + '%');
      }
    }
    lines.push('Source PDF: ' + pvc.sourceUrl);
    lines.push('2023 source arithmetic warning: published uncollected-PVC figures do not reconcile; 16 state rows differ from registered minus collected. Published state-row sum is 6,259,231; printed national total is 6,259,229; registered-minus-collected arithmetic is 6,260,001. Do not use the uncollected count as settled fact.');
  }

  if (ekiti?.records?.[0]) {
    const row = ekiti.records[0];
    lines.push('EKITI 2026 GOVERNORSHIP ELECTION REGISTER — INEC bulletin 9 June 2026');
    lines.push('Election register: ' + formatNumber(row.registeredVotersForElection));
    lines.push('2023 base: ' + formatNumber(row.baseRegister2023));
    lines.push('New registrants reported: ' + formatNumber(row.newRegistrantsReported));
    lines.push('Double registrations invalidated: ' + formatNumber(row.doubleRegistrationsInvalidatedReported));
    lines.push('Base plus new registrants: ' + formatNumber(row.calculatedBasePlusNew));
    lines.push('Unreconciled difference: ' + formatNumber(row.unreconciledDifference) + ' — the bulletin does not explain this gap.');
    lines.push('Source: ' + ekiti.sourceUrl);
  }

  if (osun?.records?.[0]) {
    const row = osun.records[0];
    lines.push('OSUN 2026 OFF-CYCLE ELECTION PVC SNAPSHOT');
    lines.push('PVCs collected: ' + formatNumber(row.collectedPVCs) + ' across ' + row.localGovernmentAreas + ' LGAs.');
    lines.push('No registered-voter denominator or exact cutoff date was displayed on the source page; do not calculate a collection rate.');
    lines.push('Source: ' + osun.sourceUrl);
  }

  if (cvr) {
    lines.push('CONTINUOUS VOTER REGISTRATION 2025–2026');
    for (const statement of cvr.records) {
      lines.push(statement.publicationDate + ' official statement (' + statement.statementId + '): phase-one registrations ' + formatNumber(statement.newEligibleVotersReported) + '. Source: ' + statement.sourceUrl);
    }
    lines.push('The two official phase-one statements differ by two registrations. Preserve both values until INEC clarifies.');
    lines.push('The official timetable scheduled phase 3 registration 4 May–17 August 2026 and register display 24–30 August 2026. A final consolidated nationwide post-CVR register was not present in the reviewed source set.');
    lines.push('Do not add phase-one registrations to the 2023 register to claim a current national total.');
  }

  lines.push('Interpretation limits: registered voters are not all eligible citizens; collected PVCs are not turnout; election-specific state registers are not national totals.');
  lines.push('If no state is named, do not infer a state value from the national aggregate. If a state is named but not represented in this dataset, say the available snapshot does not answer the state-level question.');
  return lines.join('\n');
}
