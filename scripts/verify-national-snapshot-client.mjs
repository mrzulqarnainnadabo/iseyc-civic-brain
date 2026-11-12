import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fetchNationalSnapshots, formatNationalSnapshotBlock, DEFAULT_NATIONAL_SNAPSHOTS_URL } from '../lib/national-snapshot-client.js';

const stateNames = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
const portalStates = new Set(['Anambra','Bauchi','Borno','Ebonyi','Edo','Ekiti','Enugu','Imo','Kaduna','Kano','Kebbi','Osun','Sokoto','Jigawa','Kwara']);
const documentStates = new Set(['Abia','Akwa Ibom','Kogi']);
const jurisdictions = stateNames.map((name) => ({
  name, type: 'state',
  status: documentStates.has(name) ? 'official_documents_located' : portalStates.has(name) ? 'official_portal_located' : 'not_reviewed',
  fiscalTransparency: {
    quarter: 'Q2 2026',
    citizensBudget: { score: name === 'Rivers' ? 0 : 15, max: 15 },
    quarterlyBir: { score: name === 'Rivers' ? 0 : 16, max: 16 },
    eProcurement: { score: name === 'Rivers' ? 0 : 11, max: 11 },
    fiscalWebsite: { score: name === 'Rivers' ? 8 : 12, max: 12 },
    totalScore: name === 'Rivers' ? 15 : 100,
    sourceId: 'budgit-state-fiscal-transparency-league-q2-2026',
  },
  agora2025: name === 'Rivers' ? null : {
    actualRevenueBn: name === 'Kaduna' ? 357.9 : name === 'Lagos' ? 2627.9 : 100,
    actualExpenditureBn: name === 'Kaduna' ? 510.91 : name === 'Lagos' ? 2838.2 : 120,
    budgetExecutionPct: name === 'Kaduna' ? 64.6 : name === 'Lagos' ? 84.3 : 60,
    capitalExecutionPct: name === 'Kaduna' ? 59.1 : name === 'Lagos' ? 85.6 : 55,
    igrSharePct: name === 'Kaduna' ? 24 : name === 'Lagos' ? 70 : 30,
    igrBudgetPerformancePct: name === 'Kaduna' ? 77.3 : name === 'Lagos' ? 80.6 : 70,
  },
}));
jurisdictions.push({ name: 'Federal Capital Territory', type: 'fct', status: 'official_law_not_confirmed', fiscalTransparency: null, agora2025: null });
const stateBudgetCoverage = {
  scope: {
    states: 36, fctTrackedSeparately: true, officialStatePortalsLocated: 15,
    officialStateDocumentsLocated: 3, stateBudgetSourceDiscoveryCompleted: 18,
    fiscalTransparencyCoverage: 36, h1_2026SectorSpendingCoverage: 34,
    agora2025Coverage: 35, agora2025ExcludedStates: ['Rivers'],
  },
  jurisdictions,
};

const who = {
  id: 'who-nga-life-expectancy-male-2023', title: 'Life expectancy at birth, male',
  value: 61.4, unit: 'years', referencePeriod: '2023', measurementType: 'WHO estimate',
  geoLevel: 'national', geographicCoverage: 'Nigeria', sourceId: 'who-afro-nigeria',
  sourceType: 'official_source', sourcePublisher: 'WHO Regional Office for Africa',
  sourceUrl: 'https://www.afro.who.int/node/992', departments: ['health'],
  interpretation: 'National estimate only.', limitations: ['Not a Kaduna State or facility measure.'],
};
const healthSpend = {
  id: 'budgit-h1-2026-health-total-report', title: 'Combined state health expenditure · updated report',
  value: 621.34, unit: '₦ billion', referencePeriod: 'H1 2026 (through Q2)',
  measurementType: 'Actual health expenditure reported in detailed subnational review',
  geoLevel: 'varies', geographicCoverage: '34 of 36 states; Rivers and Osun excluded',
  sourceId: 'budgit-subnational-health-h1-2026-report', sourceType: 'published_research',
  sourcePublisher: 'BudgIT Foundation · Nigeria’s Subnational Health Expenditure Report, H1 2026',
  sourceUrl: 'https://budgit.org/post_publications/nigerias-subnational-health-expenditure-report-h1-2026/',
  departments: ['health', 'civic'], interpretation: 'Combined state health outturn.',
  limitations: ['Rivers and Osun are excluded.', 'Spending is not proof of PHC functionality.'],
};
const abiaBudget = {
  id: 'abia-2026-approved-budget-total', title: 'Abia State approved 2026 budget',
  value: 1016.22807265199, unit: '₦ billion', referencePeriod: '2026 approved appropriation',
  measurementType: 'Official government-reported appropriation headline', geoLevel: 'state',
  geographicCoverage: 'Abia State', sourceId: 'state-budget-abia', sourceType: 'official_source',
  sourcePublisher: 'Abia State Government',
  sourceUrl: 'https://abiastate.gov.ng/gov-otti-signs-2026-appropriation-bill-into-law/',
  departments: ['civic'], interpretation: 'Official appropriation headline only.',
  limitations: ['Detailed schedule not transcribed.'],
};
const kadunaSchool = {
  id: 'fme-annual-school-census-kaduna-2024-25', title: 'Kaduna State learner–teacher ratio',
  value: 51.3, unit: 'learners per teacher', referencePeriod: '2024/2025 school year',
  measurementType: 'Annual School Census administrative ratio', geoLevel: 'state',
  geographicCoverage: 'Kaduna State', sourceId: 'fme-annual-school-census',
  sourceType: 'official_source', sourcePublisher: 'Federal Ministry of Education',
  sourceUrl: 'https://emis.education.gov.ng/portal/', departments: ['education'],
  interpretation: 'State-level context only; not a Kaduna South or school-level measure.',
  limitations: ['Do not infer LGA or school conditions.'],
};
const anambraRevenue = {
  id: 'anambra-2026-q3-total-revenue', title: 'Anambra total revenue including opening balance · Q3 2026',
  value: 300.80226147912, unit: '₦ billion', referencePeriod: '1 Jan–30 Sep 2026',
  measurementType: 'Actual revenue including opening balance', geoLevel: 'state',
  geographicCoverage: 'Anambra State', sourceId: 'state-budget-anambra', sourceType: 'official_source',
  sourcePublisher: 'Anambra State Government — Office of the Accountant General / Open Finance',
  sourceUrl: 'https://smart.anambrastate.gov.ng/open-finance', departments: ['civic'],
  interpretation: 'Total revenue received was ₦300.80bn, 39.3% of the ₦766.37bn 2026 original budget.',
  limitations: ['Official state BIR summary; amounts include opening balance.', 'Revenue receipt does not establish service delivery.'],
};
const agoraLagosIgr = {
  id: 'agora-state-budget-performance-2025-lagos-igr', title: 'Lagos 2025 internally generated revenue',
  value: 1.85, unit: '₦ trillion', referencePeriod: '2025 full year', measurementType: 'Internally generated revenue',
  geoLevel: 'state', geographicCoverage: 'Lagos State', sourceId: 'agora-state-budget-performance-2025',
  sourceType: 'published_research', sourcePublisher: 'Agora Policy',
  sourceUrl: 'https://agorapolicy.org/our-blogs/251-review-of-performance-of-states-budgets-in-2025.html',
  departments: ['civic'], interpretation: 'Agora Policy reports ₦1.85tn Lagos IGR in 2025.',
  limitations: ['Secondary analysis of state BIRs.', 'Differs from BudgIT’s ₦1.71tn; unresolved.'],
};
const budgitLagosIgr = {
  id: 'budgit-2025-lagos-igr-sos-2026', title: 'Lagos 2025 internally generated revenue',
  value: 1.71, unit: '₦ trillion', referencePeriod: '2025 full year', measurementType: 'Internally generated revenue',
  geoLevel: 'state', geographicCoverage: 'Lagos State', sourceId: 'budgit-state-of-states-2026',
  sourceType: 'published_research', sourcePublisher: 'BudgIT Foundation · 2026 State of States Report',
  sourceUrl: 'https://budgit.org/post_publications/from-allocation-to-impact-rethinking-state-spending-priorities-2026-state-of-states-report/',
  departments: ['civic'], interpretation: 'BudgIT reports ₦1.71tn Lagos IGR in 2025.',
  limitations: ['Secondary fiscal analysis.', 'Differs from Agora Policy’s ₦1.85tn; unresolved.'],
};
const ngfCatalogue = {
  id: 'ngf-state-public-finance-db', title: 'NGF Public Finance Database',
  publisher: "Nigeria Governors' Forum", url: 'https://publicfinance.ngf.org.ng/',
  status: 'under_review', note: 'Portal integrity requires review; no numeric observations ingested.',
  departments: ['civic'],
};
const nbsCatalogue = {
  id: 'nbs-cpi-monthly', title: 'NBS CPI catalogue', publisher: 'National Bureau of Statistics',
  url: 'https://microdata.nigerianstat.gov.ng/index.php/catalog/154/related-materials',
  status: 'catalogue', note: 'Catalogue only; no current CPI observation integrated.',
  departments: ['civic'],
};
const sourceBody = {
  contractVersion: '1.0.0',
  source: 'iseyc-observatory-curated-source-snapshots-v1',
  status: 'curated',
  checkedAt: '2026-11-12',
  observations: [who, healthSpend, abiaBudget, kadunaSchool, anambraRevenue, agoraLagosIgr, budgitLagosIgr],
  catalogOnlySources: [ngfCatalogue, nbsCatalogue],
  reconciliationNotes: [
    { id: 'who-underfive-series-conflict', severity: 'high', title: 'WHO under-five mortality values are not reconciled', detail: 'Different WHO pages show materially different years and values; 59.5 is excluded.', action: 'Do not construct a trend until series are reconciled.' },
    { id: 'budgit-h1-health-total-revision', severity: 'high', title: 'BudgIT H1 2026 health expenditure totals differ across publications', detail: 'Earlier infographic reports ₦614.55bn; later detailed report reports ₦621.34bn for 34 states.', action: 'Reconcile state-level BIR extracts before treating the total as final.' },
    { id: 'lagos-igr-2025-source-difference', severity: 'medium', title: 'Lagos 2025 IGR differs between Agora Policy and BudgIT', detail: 'Agora Policy cites ₦1.85tn; BudgIT cites ₦1.71tn. The ₦140bn difference is unexplained.', action: 'Keep both values source-attributed; reconcile against audited accounts.' },
  ],
  stateBudgetCoverage,
  limitations: ['Curated transcriptions, not live publisher feeds.'],
};
function response(body, ok = true) {
  return { ok, status: ok ? 200 : 503, text: async () => JSON.stringify(body) };
}
let requested = '';
const mock = async (url) => {
  requested = String(url);
  return response(sourceBody);
};

assert.match(DEFAULT_NATIONAL_SNAPSHOTS_URL, /\/api\/evidence\/source-snapshots$/);
const healthResult = await fetchNationalSnapshots('health', mock);
assert.equal(healthResult.status, 'ready');
assert.ok(healthResult.observations.some((item) => item.id === who.id));
assert.ok(healthResult.observations.some((item) => item.id === healthSpend.id));
assert.ok(!healthResult.observations.some((item) => item.value === 59.5), 'unreconciled WHO value must never be surfaced');
assert.equal(healthResult.stateBudgetCoverage.fiscalTransparencyCoverage, 36);
assert.equal(healthResult.stateBudgetCoverage.agora2025Coverage, 35);
assert.match(formatNationalSnapshotBlock(healthResult), /curated, dated source transcriptions/i);
assert.match(formatNationalSnapshotBlock(healthResult), /15\/36 official state portals located/i);
assert.match(formatNationalSnapshotBlock(healthResult), /3 additional official appropriation sources located/i);
assert.match(formatNationalSnapshotBlock(healthResult), /2025 state fiscal outturns cover 35 states/i);
assert.equal(healthResult.stateBudgetCoverage.officialDocumentsLocated, 3);
assert.equal(healthResult.stateBudgetCoverage.statesNotReviewed, 18);
assert.ok(healthResult.reconciliationNotes.some((note) => note.id === 'budgit-h1-health-total-revision'));
assert.match(formatNationalSnapshotBlock(healthResult), /WHO under-five mortality values are not reconciled/i);
assert.match(requested, /api\/evidence\/source-snapshots/);

const educationResult = await fetchNationalSnapshots('education school Kaduna', mock);
assert.equal(educationResult.status, 'ready');
assert.ok(educationResult.observations.some((item) => item.id === kadunaSchool.id));
assert.equal(educationResult.observations.find((item) => item.id === kadunaSchool.id).geographicCoverage, 'Kaduna State');

const fiscalResult = await fetchNationalSnapshots('fiscal transparency Rivers', mock);
assert.equal(fiscalResult.status, 'ready');
assert.ok(fiscalResult.observations.some((item) => item.id === 'sftl-q2-2026-rivers' && item.value === 15));
assert.match(formatNationalSnapshotBlock(fiscalResult), /citizens' budget 0\/15/i);

const abiaResult = await fetchNationalSnapshots('state budget Abia', mock);
assert.equal(abiaResult.status, 'ready');
assert.ok(abiaResult.observations.some((item) => item.id === abiaBudget.id));
assert.ok(abiaResult.catalogOnlySources.some((item) => item.id === 'ngf-state-public-finance-db' && item.status === 'under_review'));
assert.ok(!abiaResult.observations.some((item) => item.sourceId === 'ngf-state-public-finance-db'), 'NGF under-review portal must not supply numeric observations');

const anambraResult = await fetchNationalSnapshots('Anambra Q3 2026 revenue', mock);
assert.equal(anambraResult.status, 'ready');
assert.ok(anambraResult.observations.some((item) => item.id === anambraRevenue.id && item.value === 300.80226147912));

const kadunaFiscalResult = await fetchNationalSnapshots('Kaduna 2025 budget execution', mock);
assert.equal(kadunaFiscalResult.status, 'ready');
assert.ok(kadunaFiscalResult.observations.some((item) => item.id === 'agora-2025-kaduna-budgetExecutionPct' && item.value === 64.6));

const lagosIgrResult = await fetchNationalSnapshots('Lagos IGR 2025', mock);
assert.equal(lagosIgrResult.status, 'ready');
assert.ok(lagosIgrResult.observations.some((item) => item.id === agoraLagosIgr.id && item.value === 1.85));
assert.ok(lagosIgrResult.observations.some((item) => item.id === budgitLagosIgr.id && item.value === 1.71));
assert.ok(lagosIgrResult.reconciliationNotes.some((note) => note.id === 'lagos-igr-2025-source-difference'));
assert.ok(!lagosIgrResult.observations.some((item) => item.id === 'agora-2025-lagos-igrSharePct'), 'IGR amount query must not be confused with IGR share');

const inflationResult = await fetchNationalSnapshots('inflation CPI', mock);
assert.equal(inflationResult.status, 'ready');
assert.equal(inflationResult.observations.length, 0);
assert.ok(inflationResult.catalogOnlySources.some((item) => item.id === 'nbs-cpi-monthly'));
assert.match(formatNationalSnapshotBlock(inflationResult), /CATALOGUE ONLY \(catalogue\): NBS CPI catalogue/i);

let called = false;
const skipped = await fetchNationalSnapshots('unrelated question', async () => { called = true; });
assert.equal(skipped.status, 'skipped');
assert.equal(called, false);

const blocked = await fetchNationalSnapshots('health', async () => { called = true; }, { url: 'https://evil.example/snapshots' });
assert.equal(blocked.status, 'invalid');
assert.equal(called, false);

const maliciousBody = { ...sourceBody, observations: [{ ...healthSpend, sourceUrl: 'https://evil.example/fake' }] };
const malicious = await fetchNationalSnapshots('health', async () => response(maliciousBody));
assert.equal(malicious.status, 'invalid');
assert.equal(malicious.observations.length, 0);

const badCoverage = { ...sourceBody, stateBudgetCoverage: { ...stateBudgetCoverage, scope: { ...stateBudgetCoverage.scope, officialStatePortalsLocated: 13 } } };
const rejectedCoverage = await fetchNationalSnapshots('health', async () => response(badCoverage));
assert.equal(rejectedCoverage.status, 'invalid');

const chatSource = fs.readFileSync('api/chat.js', 'utf8');
const promptSource = fs.readFileSync('lib/system-prompt.js', 'utf8');
const clientSource = fs.readFileSync('lib/national-snapshot-client.js', 'utf8');
assert.match(chatSource, /fetchNationalSnapshots/);
assert.match(chatSource, /nationalSnapshotsBlock/);
assert.match(chatSource, /nationalSnapshots: nationalSnapshotsMeta/);
assert.match(promptSource, /Default to 45–90 words/);
assert.match(promptSource, /₦621\.34bn/);
assert.match(promptSource, /18 states remain unreviewed/);
assert.match(promptSource, /Agora cites ₦1.85tn/);
assert.match(promptSource, /Anambra's official Q3 2026 BIR/);
assert.match(clientSource, /api\/evidence\/source-snapshots/);
assert.match(clientSource, /MAX_OBSERVATIONS = 6/);
assert.match(clientSource, /stateBudgetCoverage/);
console.log('National snapshot client security, source boundaries and relevance checks passed.');
