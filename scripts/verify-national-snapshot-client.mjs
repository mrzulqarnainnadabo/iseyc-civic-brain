import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fetchNationalSnapshots, formatNationalSnapshotBlock, DEFAULT_NATIONAL_SNAPSHOTS_URL } from '../lib/national-snapshot-client.js';

const stateNames = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
const portalStates = new Set(['Anambra','Bauchi','Borno','Ebonyi','Edo','Ekiti','Enugu','Imo','Kaduna','Kano','Kebbi','Osun','Sokoto','Jigawa','Kwara']);
const jurisdictions = stateNames.map((name) => ({
  name, type: 'state',
  status: name === 'Abia' ? 'official_documents_located' : portalStates.has(name) ? 'official_portal_located' : 'not_reviewed',
  fiscalTransparency: {
    quarter: 'Q2 2026',
    citizensBudget: { score: name === 'Rivers' ? 0 : 15, max: 15 },
    quarterlyBir: { score: name === 'Rivers' ? 0 : 16, max: 16 },
    eProcurement: { score: name === 'Rivers' ? 0 : 11, max: 11 },
    fiscalWebsite: { score: name === 'Rivers' ? 8 : 12, max: 12 },
    totalScore: name === 'Rivers' ? 15 : 100,
    sourceId: 'budgit-state-fiscal-transparency-league-q2-2026',
  },
}));
jurisdictions.push({ name: 'Federal Capital Territory', type: 'fct', status: 'official_law_not_confirmed', fiscalTransparency: null });
const stateBudgetCoverage = {
  scope: {
    states: 36, fctTrackedSeparately: true, officialStatePortalsLocated: 15,
    officialStateDocumentsLocated: 1, stateBudgetSourceDiscoveryCompleted: 16,
    fiscalTransparencyCoverage: 36, h1_2026SectorSpendingCoverage: 34,
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
  observations: [who, healthSpend, abiaBudget, kadunaSchool],
  catalogOnlySources: [ngfCatalogue, nbsCatalogue],
  reconciliationNotes: [
    { id: 'who-underfive-series-conflict', severity: 'high', title: 'WHO under-five mortality values are not reconciled', detail: 'Different WHO pages show materially different years and values; 59.5 is excluded.', action: 'Do not construct a trend until series are reconciled.' },
    { id: 'budgit-h1-health-total-revision', severity: 'high', title: 'BudgIT H1 2026 health expenditure totals differ across publications', detail: 'Earlier infographic reports ₦614.55bn; later detailed report reports ₦621.34bn for 34 states.', action: 'Reconcile state-level BIR extracts before treating the total as final.' },
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
assert.match(formatNationalSnapshotBlock(healthResult), /curated, dated source transcriptions/i);
assert.match(formatNationalSnapshotBlock(healthResult), /15\/36 official state portals located/i);
assert.match(formatNationalSnapshotBlock(healthResult), /1 additional official appropriation source located/i);
assert.equal(healthResult.stateBudgetCoverage.officialDocumentsLocated, 1);
assert.equal(healthResult.stateBudgetCoverage.statesNotReviewed, 20);
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
assert.match(clientSource, /api\/evidence\/source-snapshots/);
assert.match(clientSource, /MAX_OBSERVATIONS = 6/);
assert.match(clientSource, /stateBudgetCoverage/);
console.log('National snapshot client security, source boundaries and relevance checks passed.');
