/**
 * Read-only consumer for ISEYC Observatory's curated source snapshot contract.
 * Never treats catalogue-only sources as numeric evidence.
 */
export const DEFAULT_NATIONAL_SNAPSHOTS_URL =
  'https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/source-snapshots';

const ALLOWED_ENDPOINT_HOST = 'iseyc-civic-intelligence-observatory.vercel.app';
const ALLOWED_SOURCE_HOSTS = new Set([
  'www.afro.who.int', 'afro.who.int', 'data.who.int',
  'dashboard.digitalliteracy.nitda.gov.ng',
  'nimc.gov.ng', 'www.imf.org', 'imf.org',
  'isnhubs.org.ng', 'innovation.naseni.gov.ng',
  'microdata.nigerianstat.gov.ng', 'emis.education.gov.ng',
  'www.worldbank.org', 'worldbank.org',
  'nphcda.gov.ng', 'phc.nphcda.gov.ng', 'portal.nphcda.gov.ng',
  'agorapolicy.org', 'www.agorapolicy.org', 'publicfinance.ngf.org.ng',
  'budgit.org', 'www.budgit.org', 'fiscalleague.budgit.org',
  'statehouse.gov.ng', 'www.statehouse.gov.ng',
  'budgetoffice.gov.ng', 'kdsg.gov.ng', 'abiastate.gov.ng', 'jsbepd.org', 'kwarastate.gov.ng', 'smart.anambrastate.gov.ng',
]);
const MAX_BODY_BYTES = 350_000;
const MAX_OBSERVATIONS = 6;
const MAX_CATALOGUE = 3;
const MAX_RECONCILIATION_NOTES = 3;

const ALLOWED_SOURCE_IDS = new Set([
  'who-afro-nigeria', 'who-gho-nigeria',
  'nimc-nin-enrolment-2025', 'nimc-enrolment-oct-2025',
  'imf-article-iv-2026', 'nphcda-phc-progress-2025',
  'agora-state-budget-performance-2025',
  'budgit-state-revenue-h1-2026', 'budgit-state-expenditure-h1-2026',
  'budgit-state-education-h1-2026', 'budgit-state-health-h1-2026',
  'budgit-state-fiscal-transparency-league-q2-2026',
  'budgit-state-of-states-2026', 'budgit-subnational-health-h1-2026-report', 'state-budget-abia', 'state-budget-kaduna-2026-appropriation-announcement', 'state-budget-jigawa', 'state-budget-kwara', 'state-house-2026-appropriation',
  'state-house-2025-extension-dec2026', 'budgetoffice-q2-2026-bir', 'state-budget-anambra',
  'ngf-state-public-finance-db',
  'nitda-dl4all-dashboard', 'naseni-innovation-hub',
  'nbs-gdp-quarterly', 'nbs-cpi-monthly', 'isn-hub-assessment-2026',
  'fme-annual-school-census', 'worldbank-ndu-2026-10',
]);

const PUBLISHED_RESEARCH_IDS = new Set([
  'imf-article-iv-2026',
  'isn-hub-assessment-2026',
  'agora-state-budget-performance-2025',
  'budgit-state-revenue-h1-2026',
  'budgit-state-expenditure-h1-2026',
  'budgit-state-education-h1-2026',
  'budgit-state-health-h1-2026',
  'budgit-state-fiscal-transparency-league-q2-2026',
  'budgit-state-of-states-2026',
  'budgit-subnational-health-h1-2026-report',
]);

function safeHttps(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.has(url.hostname);
  } catch {
    return false;
  }
}

function sourceTypeFor(sourceId) {
  return PUBLISHED_RESEARCH_IDS.has(sourceId) ? 'published_research' : 'official_source';
}

function validObservation(item) {
  return Boolean(
    item && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.title === 'string' && item.title.length > 0 &&
    typeof item.value === 'number' && Number.isFinite(item.value) &&
    typeof item.unit === 'string' && item.unit.length > 0 &&
    typeof item.referencePeriod === 'string' && item.referencePeriod.length > 0 &&
    typeof item.measurementType === 'string' && item.measurementType.length > 0 &&
    typeof item.sourceId === 'string' && ALLOWED_SOURCE_IDS.has(item.sourceId) &&
    item.sourceType === sourceTypeFor(item.sourceId) &&
    typeof item.sourcePublisher === 'string' && item.sourcePublisher.length > 0 &&
    safeHttps(item.sourceUrl, ALLOWED_SOURCE_HOSTS) &&
    ['national', 'state', 'varies'].includes(item.geoLevel) &&
    typeof item.geographicCoverage === 'string' && item.geographicCoverage.length > 0 &&
    Array.isArray(item.limitations) && item.limitations.every((x) => typeof x === 'string') &&
    Array.isArray(item.departments) && item.departments.length > 0 &&
    item.departments.every((x) => ['education', 'health', 'software-technology', 'civic'].includes(x))
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
  if (/\b(civic|identity|nin|population|voter|registration|budget|expenditure|revenue|fiscal|appropriation|spending|finance|transparency|procurement)\b/.test(q)) departmentTerms.push('civic');

  let score = departmentTerms.some((id) => item.departments.includes(id)) ? 3 : 0;
  const geography = String(item.geographicCoverage || '').toLowerCase();
  if (terms(q).some((word) => word.length > 3 && geography.includes(word))) score += 12;
  if (q.includes('national') && item.geoLevel === 'national') score += 3;
  const words = terms(q);
  const title = String(item.title || '').toLowerCase();
  const publisher = String(item.sourcePublisher || '').toLowerCase();
  const context = [item.interpretation, item.unit, item.referencePeriod, item.measurementType].join(' ').toLowerCase();
  for (const word of words) {
    if (title.includes(word)) score += 4;
    if (publisher.includes(word)) score += 2;
    if (context.includes(word)) score += 1;
  }
  if (/\b(teacher|classroom|toilet|school|learner|reporting)\b/.test(q) && item.sourceId === 'fme-annual-school-census') score += 4;
  if (/\b(digital literacy|digital skills|skills programme)\b/.test(q) && item.sourceId === 'nitda-dl4all-dashboard') score += 5;
  if (/\b(state budget|fiscal|revenue|expenditure|appropriation)\b/.test(q) && item.sourceId.startsWith('budgit-')) score += 3;
  return score;
}

function fiscalTransparencyObservations(coverage, query) {
  const states = Array.isArray(coverage?.jurisdictions)
    ? coverage.jurisdictions.filter((item) => item.type === 'state' && item.fiscalTransparency)
    : [];
  if (states.length !== 36) return [];
  const q = String(query || '').toLowerCase();
  const named = states.filter((item) => q.includes(item.name.toLowerCase()));
  const asksDisclosure = /fiscal|transparency|e-procurement|citizens.? budget|quarterly bir|disclosure|fiscal website|budget publication/.test(q);
  const sourceId = 'budgit-state-fiscal-transparency-league-q2-2026';
  const sourceUrl = 'https://fiscalleague.budgit.org/latest-ranking';
  const base = {
    unit: 'points out of 100',
    referencePeriod: 'Q2 2026',
    measurementType: 'BudgIT fiscal information availability score',
    geoLevel: 'state',
    sourceId,
    sourcePublisher: 'BudgIT Foundation · States Fiscal Transparency League',
    sourceUrl,
    departments: ['civic'],
    sourceType: 'published_research',
    limitations: [
      'This score measures public fiscal information availability, not service delivery, government effectiveness or public trust.',
      'Components cover citizens\' budgets, quarterly BIRs, e-procurement and fiscal-data websites.',
      'FCT is not included in the 36-state table.',
    ],
  };
  if (named.length && asksDisclosure) {
    return named.slice(0, 3).map((state) => {
      const score = state.fiscalTransparency;
      return {
        ...base,
        id: 'sftl-q2-2026-' + state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: state.name + ' fiscal information availability',
        value: score.totalScore,
        geographicCoverage: state.name,
        interpretation: 'Citizens\' budget ' + score.citizensBudget.score + '/' + score.citizensBudget.max +
          '; quarterly BIR ' + score.quarterlyBir.score + '/' + score.quarterlyBir.max +
          '; e-procurement ' + score.eProcurement.score + '/' + score.eProcurement.max +
          '; fiscal website ' + score.fiscalWebsite.score + '/' + score.fiscalWebsite.max + '.',
      };
    });
  }
  if (!/fiscal|transparency|procurement|citizens.? budget|budget disclosure/.test(q)) return [];
  const scores = states.map((item) => ({ name: item.name, ...item.fiscalTransparency }));
  const perfect = scores.filter((item) => item.totalScore === 100);
  const ninetyPlus = scores.filter((item) => item.totalScore >= 90);
  const lowest = [...scores].sort((a, b) => a.totalScore - b.totalScore).slice(0, 3);
  return [{
    ...base,
    id: 'sftl-q2-2026-national-summary',
    title: 'Q2 2026 fiscal information availability across all 36 states',
    value: perfect.length,
    unit: 'states scoring 100/100',
    geoLevel: 'varies',
    geographicCoverage: 'All 36 states; FCT excluded',
    interpretation: perfect.length + ' states score 100; ' + ninetyPlus.length +
      ' score at least 90. Lowest scores: ' + lowest.map((item) => item.name + ' ' + item.totalScore).join(', ') + '.',
  }];
}

function agora2025Observations(coverage, query) {
  const states = Array.isArray(coverage?.jurisdictions)
    ? coverage.jurisdictions.filter((item) => item.type === 'state' && item.agora2025)
    : [];
  if (states.length !== 35) return [];
  const q = String(query || '').toLowerCase();
  const named = states.filter((item) => q.includes(item.name.toLowerCase()));
  if (!named.length || !/\b(budget|fiscal|revenue|receipts|expenditure|spending|capital|execution|implementation|performance|igr)\b/.test(q)) return [];

  let key = 'budgetExecutionPct';
  let label = 'total budget execution';
  let unit = '% of approved state budget';
  let measurement = 'Actual expenditure as a share of approved budget';
  if (/\b(capital)\b/.test(q)) {
    key = 'capitalExecutionPct'; label = 'capital budget execution';
    unit = '% of approved capital budget'; measurement = 'Actual capital expenditure as a share of approved capital budget';
  } else if (/\b(igr share|share of revenue)\b/.test(q)) {
    key = 'igrSharePct'; label = 'IGR share of actual revenue';
    unit = '% of actual revenue'; measurement = 'Internally generated revenue as a share of actual revenue';
  } else if (/\b(igr budget|budgeted igr)\b/.test(q)) {
    key = 'igrBudgetPerformancePct'; label = 'IGR budget performance';
    unit = '% of budgeted IGR'; measurement = 'Actual internally generated revenue as a share of budgeted IGR';
  } else if (/\b(revenue|receipts)\b/.test(q) && !/\b(igr)\b/.test(q)) {
    key = 'actualRevenueBn'; label = 'actual state revenue';
    unit = '₦ billion'; measurement = 'Actual state revenue reported in Budget Implementation Reports';
  } else if (/\b(expenditure|spending)\b/.test(q) && !/\b(capital)\b/.test(q)) {
    key = 'actualExpenditureBn'; label = 'actual state expenditure';
    unit = '₦ billion'; measurement = 'Actual state expenditure reported in Budget Implementation Reports';
  }

  return named.slice(0, 3).map((state) => {
    const fiscal = state.agora2025;
    const value = fiscal[key];
    if (!Number.isFinite(value)) return null;
    return {
      id: 'agora-2025-' + state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + key,
      title: state.name + ' 2025 ' + label,
      value,
      unit,
      referencePeriod: '2025 full year (Q1–Q4)',
      measurementType: measurement,
      geoLevel: 'state',
      geographicCoverage: state.name,
      sourceId: 'agora-state-budget-performance-2025',
      sourceType: 'published_research',
      sourcePublisher: 'Agora Policy · Review of Performance of States’ Budgets in 2025',
      sourceUrl: 'https://agorapolicy.org/our-blogs/251-review-of-performance-of-states-budgets-in-2025.html',
      departments: ['civic'],
      interpretation: 'The source covers 35 of 36 states; Rivers is excluded. Reported actual revenue ₦' +
        fiscal.actualRevenueBn + 'bn; actual expenditure ₦' + fiscal.actualExpenditureBn +
        'bn; total budget execution ' + fiscal.budgetExecutionPct + '%; capital execution ' +
        fiscal.capitalExecutionPct + '%; IGR share ' + fiscal.igrSharePct +
        '%; IGR budget performance ' + fiscal.igrBudgetPerformancePct + '%.',
      limitations: [
        'Secondary analysis of state Budget Implementation Reports; not an independent audit.',
        'Rivers is excluded from the 35-state comparison; FCT is separate.',
        'Execution rates are fiscal measures, not proof of project completion or service delivery.',
      ],
    };
  }).filter(Boolean);
}

function catalogueRelevant(item, query) {
  const q = String(query || '').toLowerCase();
  if (!q) return false;
  const context = (String(item.publisher || '') + ' ' + String(item.title || '') + ' ' + String(item.note || '')).toLowerCase();
  if (/budget|fiscal|revenue|expenditure|appropriation|finance|transparency|procurement/.test(q) && /budget|fiscal|revenue|expenditure|finance|transparency|procurement|state/.test(context)) return true;
  if (/health|phc|hospital|medicine|mortality/.test(q) && /health|phc|hospital|medicine|who|nphcda/.test(context)) return true;
  if (/education|school|teacher|learning/.test(q) && /education|school|teacher|learning|ubec|nemis/.test(context)) return true;
  if (/technology|software|digital|innovation|hub/.test(q) && /technology|digital|innovation|hub|nitda|naseni/.test(context)) return true;
  return terms(q).some((word) => context.includes(word));
}

async function readJson(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const raw = await response.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return { status: 'invalid', data: null };
    let data;
    try { data = JSON.parse(raw); } catch { return { status: 'invalid', data: null }; }
    return response.ok ? { status: 'ready', data } : { status: 'unavailable', data: null };
  } catch {
    return { status: 'unavailable', data: null };
  } finally {
    clearTimeout(timer);
  }
}

function validStateBudgetCoverage(coverage) {
  const rows = Array.isArray(coverage?.jurisdictions) ? coverage.jurisdictions : [];
  const states = rows.filter((item) => item.type === 'state');
  const fct = rows.filter((item) => item.type === 'fct');
  const uniqueNames = new Set(states.map((item) => item.name)).size === 36;
  const portals = states.filter((item) => item.status === 'official_portal_located').length;
  const documents = states.filter((item) => item.status === 'official_documents_located').length;
  const unreviewed = states.filter((item) => item.status === 'not_reviewed').length;
  return coverage?.scope?.states === 36 &&
    coverage.scope?.fctTrackedSeparately === true &&
    coverage.scope?.officialStatePortalsLocated === 15 &&
    coverage.scope?.officialStateDocumentsLocated === 3 &&
    coverage.scope?.stateBudgetSourceDiscoveryCompleted === 18 &&
    coverage.scope?.agora2025Coverage === 35 &&
    coverage.scope?.fiscalTransparencyCoverage === 36 &&
    coverage.scope?.h1_2026SectorSpendingCoverage === 34 &&
    states.length === 36 && uniqueNames && fct.length === 1 &&
    portals === 15 && documents === 3 && unreviewed === 18 &&
    states.filter((item) => item.agora2025 && ['actualRevenueBn', 'actualExpenditureBn', 'budgetExecutionPct', 'capitalExecutionPct', 'igrSharePct', 'igrBudgetPerformancePct'].every((key) => Number.isFinite(item.agora2025[key]))).length === 35 &&
    states.find((item) => item.name === 'Rivers')?.agora2025 === null &&
    states.every((item) => Number.isFinite(item.fiscalTransparency?.totalScore) &&
      item.fiscalTransparency.totalScore >= 0 && item.fiscalTransparency.totalScore <= 100 &&
      item.fiscalTransparency.sourceId === 'budgit-state-fiscal-transparency-league-q2-2026');
}

export async function fetchNationalSnapshots(query = '', fetchImpl = fetch, options = {}) {
  const queryText = String(query || '').toLowerCase();
  const relevant = /\b(health|phc|hospital|medicine|mortality|education|school|teacher|learning|digital|software|technology|innovation|hub|budget|fiscal|revenue|expenditure|appropriation|spending|finance|transparency|procurement|national|nigeria|state|kaduna|abia|enugu|lagos|inflation|cpi|price|food)\b/.test(queryText);
  if (!relevant) return { status: 'skipped', observations: [], catalogOnlySources: [], reconciliationNotes: [], stateBudgetCoverage: null, limitations: ['No national source snapshot was relevant to this question.'] };
  const endpoint = String(options.url || process.env.CIVIC_OBSERVATORY_SOURCE_SNAPSHOTS_URL || DEFAULT_NATIONAL_SNAPSHOTS_URL).trim();
  if (!safeHttps(endpoint, new Set([ALLOWED_ENDPOINT_HOST]))) {
    return { status: 'invalid', observations: [], catalogOnlySources: [], reconciliationNotes: [], limitations: ['The configured Observatory endpoint is not the approved ISEYC host.'] };
  }
  let parsed;
  try { parsed = new URL(endpoint); } catch {
    return { status: 'invalid', observations: [], catalogOnlySources: [], reconciliationNotes: [], limitations: ['The configured Observatory endpoint URL is invalid.'] };
  }
  if (parsed.pathname !== '/api/evidence/source-snapshots') {
    return { status: 'invalid', observations: [], catalogOnlySources: [], reconciliationNotes: [], limitations: ['The configured Observatory endpoint path is not the approved source snapshot contract.'] };
  }

  const sourceResult = await readJson(endpoint, fetchImpl, options.timeoutMs || 7000);
  if (sourceResult.status !== 'ready') {
    return { status: sourceResult.status === 'invalid' ? 'invalid' : 'unavailable', observations: [], catalogOnlySources: [], reconciliationNotes: [], limitations: ['The Observatory source snapshot endpoint could not be read safely. No substitute values are used.'] };
  }
  const sourceData = sourceResult.data;
  const sourceContractOk = sourceData?.contractVersion === '1.0.0' &&
    sourceData?.source === 'iseyc-observatory-curated-source-snapshots-v1' &&
    ['curated', 'empty'].includes(sourceData.status) &&
    Array.isArray(sourceData.observations) &&
    Array.isArray(sourceData.catalogOnlySources) &&
    Array.isArray(sourceData.reconciliationNotes) &&
    validStateBudgetCoverage(sourceData.stateBudgetCoverage);
  if (!sourceContractOk) {
    return { status: 'invalid', observations: [], catalogOnlySources: [], reconciliationNotes: [], limitations: ['The Observatory source snapshot response failed contract and coverage validation. No substitute values are used.'] };
  }

  const sourceObservations = sourceData.observations.filter(validObservation);
  const invalidCount = sourceData.observations.length - sourceObservations.length;
  const coverageObservations = fiscalTransparencyObservations(sourceData.stateBudgetCoverage, query);
  const agoraObservations = agora2025Observations(sourceData.stateBudgetCoverage, query);
  const all = [...sourceObservations, ...coverageObservations, ...agoraObservations];
  const unique = new Map();
  for (const item of all) if (!unique.has(item.id)) unique.set(item.id, item);
  const selected = [...unique.values()]
    .map((item, index) => ({ item, index, score: relevanceScore(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_OBSERVATIONS)
    .map((entry) => entry.item);

  const catalogue = sourceData.catalogOnlySources
    .filter((item) => item && ALLOWED_SOURCE_IDS.has(item.id) &&
      typeof item.title === 'string' && typeof item.note === 'string' &&
      ['catalogue', 'partial', 'under_review'].includes(item.status) &&
      safeHttps(item.url, ALLOWED_SOURCE_HOSTS) && catalogueRelevant(item, query))
    .slice(0, MAX_CATALOGUE);

  const reconciliationNotes = sourceData.reconciliationNotes
    .filter((note) => {
      const context = (note.title + ' ' + note.detail + ' ' + note.action).toLowerCase();
      const words = terms(query);
      return words.some((word) => context.includes(word)) ||
        (note.severity === 'high' && /budget|fiscal|health|education|mortality|school|state|technology|digital/.test(query.toLowerCase()));
    }).slice(0, MAX_RECONCILIATION_NOTES);

  const coverage = sourceData.stateBudgetCoverage;
  const status = invalidCount ? (selected.length ? 'partial' : 'invalid') : selected.length || catalogue.length ? 'ready' : 'empty';
  return {
    status,
    checkedAt: sourceData.checkedAt || null,
    observations: selected,
    sourceObservationCount: sourceObservations.length,
    availableObservationCount: unique.size,
    selectedCount: selected.length,
    catalogOnlySources: catalogue,
    reconciliationNotes,
    stateBudgetCoverage: {
      stateCount: coverage.scope.states,
      fctTrackedSeparately: coverage.scope.fctTrackedSeparately,
      officialPortalsLocated: coverage.scope.officialStatePortalsLocated,
      officialDocumentsLocated: coverage.scope.officialStateDocumentsLocated,
      statesNotReviewed: coverage.jurisdictions.filter((item) => item.type === 'state' && item.status === 'not_reviewed').length,
      fiscalTransparencyCoverage: coverage.scope.fiscalTransparencyCoverage,
      h1_2026SectorSpendingCoverage: coverage.scope.h1_2026SectorSpendingCoverage,
      agora2025Coverage: coverage.scope.agora2025Coverage,
      agora2025ExcludedStates: coverage.scope.agora2025ExcludedStates,
    },
    limitations: [
      'These are curated, dated transcriptions; they are not live feeds from the publishers.',
      ...(Array.isArray(sourceData.limitations) ? sourceData.limitations.slice(0, 4) : []),
      ...(invalidCount ? ['One or more source rows failed the Brain allowlist and were excluded.'] : []),
    ],
    invalidCount,
  };
}

export function formatNationalSnapshotBlock(bundle) {
  if (bundle?.status === 'skipped') return 'NATIONAL_EVIDENCE_STATUS: not requested for this question; no substitute data used.';
  if (!bundle || ['unavailable', 'invalid'].includes(bundle.status)) {
    return 'NATIONAL_EVIDENCE_STATUS: unavailable. No substitute statistics are used; state this limitation briefly if relevant.';
  }
  if (bundle.status === 'empty') {
    return 'NATIONAL_EVIDENCE_STATUS: no relevant curated observation selected. This is not evidence that no data exist.';
  }

  const lines = [
    'SOURCE_LAYER: ISEYC Intelligence Observatory · curated, dated source transcriptions',
    'STATUS: ' + bundle.status + ' · checked ' + (bundle.checkedAt || 'date not stated'),
    'SOURCE_SEMANTICS: Official data and published research are distinct. These are not live feeds.',
  ];
  if (bundle.stateBudgetCoverage) {
    const c = bundle.stateBudgetCoverage;
    lines.push('STATE_BUDGET_COVERAGE: ' + c.officialPortalsLocated + '/36 official state portals located; ' +
      (c.officialDocumentsLocated ?? 0) + ' additional official appropriation sources located; ' +
      c.statesNotReviewed + ' states not yet reviewed; Q2 2026 fiscal-information scores cover ' +
      c.fiscalTransparencyCoverage + ' states; H1 2026 sector-spending comparisons cover ' +
      c.h1_2026SectorSpendingCoverage + ' states; 2025 state fiscal outturns cover ' +
      c.agora2025Coverage + ' states (Rivers excluded); FCT is tracked separately.');
  }
  for (const item of bundle.observations || []) {
    lines.push('- ' + item.title + ': ' + (item.valueQualifier ? item.valueQualifier + ' ' : '') +
      item.value + ' ' + item.unit + ' · ' + item.referencePeriod + ' · ' +
      item.geographicCoverage + ' · ' + item.sourceType + ' · ' + item.sourcePublisher +
      ' · ' + item.sourceUrl);
    if (item.interpretation) lines.push('  Context: ' + String(item.interpretation).slice(0, 220));
    if (item.limitations?.length) lines.push('  Limit: ' + item.limitations.slice(0, 2).map((x) => String(x).slice(0, 160)).join(' | '));
  }
  for (const note of bundle.reconciliationNotes || []) {
    lines.push('RECONCILIATION: ' + note.title + ' — ' + String(note.detail).slice(0, 260) +
      ' Action: ' + String(note.action).slice(0, 160));
  }
  for (const item of bundle.catalogOnlySources || []) {
    lines.push('CATALOGUE ONLY (' + item.status + '): ' + item.title + ' — ' + String(item.note).slice(0, 200) +
      ' Source: ' + item.url);
  }
  for (const limitation of (bundle.limitations || []).slice(0, 3)) {
    lines.push('GLOBAL_LIMIT: ' + String(limitation).slice(0, 220));
  }
  return lines.join('\n');
}
