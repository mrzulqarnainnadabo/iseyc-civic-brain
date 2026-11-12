/**
 * Read-only consumer for ISEYC Observatory's curated source snapshots and existing
 * National Department Snapshot contract. Never treats catalogue-only sources as data.
 */
export const DEFAULT_NATIONAL_SNAPSHOTS_URL =
  'https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/source-snapshots';
export const DEFAULT_DEPARTMENT_SNAPSHOTS_URL =
  'https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/snapshots';

const ALLOWED_ENDPOINT_HOST = 'iseyc-civic-intelligence-observatory.vercel.app';
const ALLOWED_SOURCE_HOSTS = new Set([
  'www.afro.who.int', 'afro.who.int', 'data.who.int',
  'dashboard.digitalliteracy.nitda.gov.ng',
  'nimc.gov.ng', 'www.imf.org', 'imf.org',
  'isnhubs.org.ng', 'innovation.naseni.gov.ng',
  'microdata.nigerianstat.gov.ng', 'emis.education.gov.ng',
  'www.worldbank.org', 'worldbank.org',
  'nphcda.gov.ng', 'phc.nphcda.gov.ng', 'portal.nphcda.gov.ng',
  'agorapolicy.org', 'www.agorapolicy.org',
  'budgit.org', 'www.budgit.org', 'fiscalleague.budgit.org',
  'statehouse.gov.ng', 'www.statehouse.gov.ng',
  'budgetoffice.gov.ng',
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
  'budgit-state-of-states-2026', 'state-house-2026-appropriation',
  'state-house-2025-extension-dec2026', 'budgetoffice-q2-2026-bir',
  'ngf-state-public-finance-db',
  'nitda-dl4all-dashboard', 'naseni-innovation-hub',
  'nbs-gdp-quarterly', 'isn-hub-assessment-2026',
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

function validLegacyRecord(record) {
  return Boolean(
    record && typeof record === 'object' && !Array.isArray(record) &&
    typeof record.id === 'string' && record.id.length > 0 &&
    typeof record.title === 'string' && record.title.length > 0 &&
    typeof record.publisher === 'string' && record.publisher.length > 0 &&
    typeof record.sourceId === 'string' && ALLOWED_SOURCE_IDS.has(record.sourceId) &&
    safeHttps(record.sourceUrl, ALLOWED_SOURCE_HOSTS) &&
    typeof record.referencePeriod === 'string' &&
    record.geography && typeof record.geography.label === 'string' &&
    Array.isArray(record.metrics) &&
    Array.isArray(record.limitations)
  );
}

function normalizeDepartment(value) {
  if (value === 'digital-systems') return 'software-technology';
  if (value === 'civic-affairs') return 'civic';
  return value;
}

function numericMetric(metric) {
  const raw = String(metric?.value ?? '').trim();
  if (!raw || /^(closed|ended)$/i.test(raw) || /states\s*\+\s*fct/i.test(raw)) return null;
  const match = raw.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;

  let unit = String(metric.unit || 'not stated');
  if (raw.includes('₦')) unit = raw.includes('billion') ? '₦ billion' : '₦ million';
  else if (raw.includes('US$')) unit = raw.includes('billion') ? 'US$ billion' : 'US$';
  else if (raw.includes('%') && !unit.startsWith('%')) unit = '% ' + unit;

  const valueQualifier = /^\s*>/.test(raw) ? 'more than' : /\+\s*$/.test(raw) ? 'at least' : undefined;
  return { value, unit, valueQualifier };
}

function legacyRecordObservations(record) {
  const departmentIds = Array.isArray(record.departmentIds)
    ? record.departmentIds.map(normalizeDepartment)
    : record.departmentId
      ? [normalizeDepartment(record.departmentId)]
      : ['education', 'health', 'software-technology', 'civic'];
  const geographyLevel = String(record.geography?.level || 'national');
  const geoLevel = geographyLevel === 'state' ? 'state'
    : geographyLevel === 'national' ? 'national' : 'varies';
  const metrics = [...(record.metrics || []), ...(record.additionalMetrics || [])];

  return metrics.map((metric, index) => {
    const parsed = numericMetric(metric);
    if (!parsed) return null;
    return {
      id: 'legacy:' + record.id + ':' + String(index + 1),
      title: record.title + ' — ' + String(metric.label || 'Indicator'),
      value: parsed.value,
      unit: parsed.unit,
      ...(parsed.valueQualifier ? { valueQualifier: parsed.valueQualifier } : {}),
      referencePeriod: String(metric.period || record.referencePeriod),
      measurementType: String(metric.measurementType || record.evidenceType || 'Published source metric'),
      geoLevel,
      geographicCoverage: String(record.geography.label),
      sourceId: record.sourceId,
      sourcePublisher: record.publisher,
      sourceUrl: record.sourceUrl,
      departments: departmentIds,
      interpretation: String(record.interpretation || '').slice(0, 420),
      limitations: record.limitations.slice(0, 5).map((item) => String(item).slice(0, 240)),
      sourceType: sourceTypeFor(record.sourceId),
    };
  }).filter(Boolean);
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
  if (named.length) {
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

export async function fetchNationalSnapshots(query = '', fetchImpl = fetch, options = {}) {
  const endpoint = String(options.url || DEFAULT_NATIONAL_SNAPSHOTS_URL).trim();
  const departmentEndpoint = String(options.departmentUrl || DEFAULT_DEPARTMENT_SNAPSHOTS_URL).trim();
  if (!safeHttps(endpoint, new Set([ALLOWED_ENDPOINT_HOST])) ||
      !safeHttps(departmentEndpoint, new Set([ALLOWED_ENDPOINT_HOST]))) {
    return { status: 'invalid', observations: [], catalogOnlySources: [], reconciliationNotes: [], limitations: ['The configured Observatory endpoint is not the approved ISEYC host.'] };
  }

  const [sourceResult, departmentResult] = await Promise.all([
    readJson(endpoint, fetchImpl, options.timeoutMs || 7000),
    readJson(departmentEndpoint, fetchImpl, options.timeoutMs || 7000),
  ]);
  const sourceData = sourceResult.data;
  const departmentData = departmentResult.data;

  const sourceContractOk = sourceResult.status === 'ready' &&
    sourceData?.contractVersion === '1.0.0' && Array.isArray(sourceData.observations);
  const departmentContractOk = departmentResult.status === 'ready' &&
    departmentData?.contractVersion === '1.0.0' && Array.isArray(departmentData.records);

  const sourceObservations = sourceContractOk ? sourceData.observations.filter(validObservation) : [];
  const invalidCount = sourceContractOk ? sourceData.observations.length - sourceObservations.length : 0;
  const legacyObservations = departmentContractOk
    ? departmentData.records.filter(validLegacyRecord).flatMap(legacyRecordObservations)
    : [];
  const coverageObservations = sourceContractOk
    ? fiscalTransparencyObservations(sourceData.stateBudgetCoverage, query)
    : [];

  const all = [...sourceObservations, ...legacyObservations, ...coverageObservations];
  const unique = new Map();
  for (const item of all) if (!unique.has(item.id)) unique.set(item.id, item);
  const selected = [...unique.values()]
    .map((item, index) => ({ item, index, score: relevanceScore(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_OBSERVATIONS)
    .map((entry) => entry.item);

  const catalogue = sourceContractOk && Array.isArray(sourceData.catalogOnlySources)
    ? sourceData.catalogOnlySources
      .filter((item) => item && ALLOWED_SOURCE_IDS.has(item.id) &&
        safeHttps(item.url, ALLOWED_SOURCE_HOSTS) && catalogueRelevant(item, query))
      .slice(0, MAX_CATALOGUE)
    : [];

  const reconciliationNotes = sourceContractOk && Array.isArray(sourceData.reconciliationNotes)
    ? sourceData.reconciliationNotes.filter((note) => {
        const context = (note.title + ' ' + note.detail + ' ' + note.action).toLowerCase();
        const words = terms(query);
        return words.some((word) => context.includes(word)) ||
          (note.severity === 'high' && /budget|fiscal|health|education|mortality|school|state|technology|digital/.test(query.toLowerCase()));
      }).slice(0, MAX_RECONCILIATION_NOTES)
    : [];

  const coverage = sourceContractOk ? sourceData.stateBudgetCoverage : null;
  const status = sourceContractOk && departmentContractOk
    ? (invalidCount ? (selected.length ? 'partial' : 'invalid') : selected.length || catalogue.length ? 'ready' : 'empty')
    : sourceContractOk || departmentContractOk ? (selected.length ? 'partial' : 'unavailable') : 'unavailable';

  return {
    status,
    checkedAt: sourceData?.checkedAt || departmentData?.retrievedAt || null,
    observations: selected,
    catalogOnlySources: catalogue,
    reconciliationNotes,
    stateBudgetCoverage: coverage ? {
      stateCount: coverage.scope?.states ?? 36,
      fctTrackedSeparately: coverage.scope?.fctTrackedSeparately ?? true,
      officialPortalsLocated: coverage.scope?.officialStatePortalsLocated ?? null,
      statesNotReviewed: coverage.jurisdictions?.filter((item) => item.type === 'state' && item.status === 'not_reviewed').length ?? null,
      fiscalTransparencyCoverage: coverage.scope?.fiscalTransparencyCoverage ?? null,
      h1_2026SectorSpendingCoverage: coverage.scope?.h1_2026SectorSpendingCoverage ?? null,
    } : null,
    limitations: [
      'These are curated, dated transcriptions; they are not live feeds from the publishers.',
      ...(sourceContractOk && Array.isArray(sourceData.limitations) ? sourceData.limitations.slice(0, 3) : ['The source snapshot endpoint was unavailable.']),
      ...(departmentContractOk && Array.isArray(departmentData.limitations) ? departmentData.limitations.slice(0, 2) : ['The National Department Snapshot endpoint was unavailable.']),
      ...(invalidCount ? ['One or more new snapshot rows failed the source allowlist and were excluded.'] : []),
    ],
    invalidCount,
  };
}

export function formatNationalSnapshotBlock(bundle) {
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
    lines.push('STATE_BUDGET_COVERAGE: ' + c.officialPortalsLocated + '/36 official state portals located in the current source pass; ' +
      c.statesNotReviewed + ' states not yet reviewed; Q2 2026 fiscal-information scores cover ' +
      c.fiscalTransparencyCoverage + ' states; H1 2026 sector-spending comparisons cover ' +
      c.h1_2026SectorSpendingCoverage + ' states; FCT is tracked separately.');
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
