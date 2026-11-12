import assert from 'node:assert/strict';
import { fetchNationalSnapshots, formatNationalSnapshotBlock } from '../lib/national-snapshot-client.js';
import fs from 'node:fs';

const health = {
  id: 'who-nga-under5-mortality-2024', title: 'Under-five mortality rate',
  value: 59.5, unit: 'deaths per 1,000 live births', referencePeriod: '2024',
  measurementType: 'WHO estimate', geoLevel: 'national', geographicCoverage: 'Nigeria',
  sourceId: 'who-gho-nigeria', sourceType: 'official_source',
  sourcePublisher: 'WHO Regional Office for Africa', sourceUrl: 'https://www.afro.who.int/node/992',
  departments: ['health'], interpretation: 'National estimate only.',
  limitations: ['Not a Kaduna South or facility measure.'],
};
const civic = {
  ...health, id: 'nimc-nin-enrolment-2025-06-30', title: 'NIN enrolment',
  value: 121404601, unit: 'records', referencePeriod: '2025-06-30',
  sourceId: 'nimc-nin-enrolment-2025', sourcePublisher: 'NIMC',
  sourceUrl: 'https://nimc.gov.ng/nin/enrolment-report/june-2025',
  departments: ['civic'],
};
const budget = {
  id: 'ngf-state-budget-health-share-2026', title: 'Health share of 36-state original budgets',
  value: 9.3, unit: '% of aggregate 36-state original expenditure', referencePeriod: '2026 original state budgets',
  measurementType: 'NGF-published aggregate of state original budgets by NCOA function',
  geoLevel: 'national', geographicCoverage: 'All 36 state governments; FCT excluded',
  sourceId: 'ngf-public-finance-database', sourceType: 'published_research',
  sourcePublisher: "Nigeria Governors' Forum (NGF) · Public Finance Database",
  sourceUrl: 'https://publicfinance.ngf.org.ng/', departments: ['health', 'civic'],
  interpretation: 'NGF reports ₦3.34 trillion (9.3%) for health in the 2026 original state budgets.',
  limitations: ['Original budget is planned expenditure, not actual expenditure or verified service delivery.'],
};
const nbs = {
  id: 'nbs-cpi-catalog', title: 'NBS CPI catalogue', publisher: 'NBS',
  url: 'https://microdata.nigerianstat.gov.ng/index.php/catalog/154/related-materials',
  note: 'Catalogue only; no current numeric observation integrated.',
};
const education = {
  id: 'fme-asc-kaduna-learner-teacher-ratio-2024-25',
  title: 'Kaduna State learner–teacher ratio',
  value: 51.3, unit: 'learners per teacher', referencePeriod: '2024/2025',
  sourceUpdateDate: '2026-07-18', measurementType: 'Annual School Census administrative ratio',
  geoLevel: 'state', geographicCoverage: 'Kaduna State',
  sourceId: 'fme-education-emis-asc-2024-25', sourceType: 'official_source',
  sourcePublisher: 'Federal Ministry of Education — Digital Nigeria EMIS',
  sourceUrl: 'https://emis.education.gov.ng/portal/',
  departments: ['education'],
  interpretation: 'State-level administrative data only; not Kaduna South or an individual school.',
  limitations: ['The national school reporting rate is 57.9%.'],
};
const educationNational = {
  ...education, id: 'fme-asc-schools-reported-2024-25',
  title: 'Schools reported in Annual School Census', value: 124543,
  unit: 'schools', geoLevel: 'national', geographicCoverage: 'Nigeria',
  interpretation: 'National school census count with incomplete reporting.',
};
function response(body, ok = true) {
  return { ok, status: ok ? 200 : 503, text: async () => JSON.stringify(body) };
}

const fetchMock = async () => response({
  contractVersion: '1.0.0', status: 'curated', checkedAt: '2026-11-09',
  observations: [health, civic, educationNational, education], catalogOnlySources: [nbs], limitations: ['Manual snapshots, not live feeds.'],
});
const healthResult = await fetchNationalSnapshots('health', fetchMock);
assert.equal(healthResult.status, 'ready');
assert.equal(healthResult.observations.length, 1);
assert.equal(healthResult.observations[0].id, health.id);
assert.match(formatNationalSnapshotBlock(healthResult), /not live feeds/i);
assert.match(formatNationalSnapshotBlock(healthResult), /REFERENCE_PERIOD: 2024/);
assert.match(formatNationalSnapshotBlock(healthResult), /59.5 deaths per 1,000 live births/);

const educationResult = await fetchNationalSnapshots('education school Kaduna', fetchMock);
assert.equal(educationResult.status, 'ready');
assert.equal(educationResult.observations.length, 2);
assert.equal(educationResult.observations[0].id, education.id, 'Kaduna State evidence must rank ahead of national context when Kaduna is requested');
assert.match(formatNationalSnapshotBlock(educationResult), /GEOGRAPHY: Kaduna State/);
assert.match(formatNationalSnapshotBlock(educationResult), /SOURCE_UPDATE_DATE: 2026-07-18/);

const budgetResult = await fetchNationalSnapshots('health state budget 2026', async () => response({
  contractVersion: '1.0.0', status: 'ok', checkedAt: '2026-11-12',
  observations: [budget], catalogOnlySources: [], limitations: ['Curated snapshot, not a live feed.'],
}));
assert.equal(budgetResult.status, 'ready');
assert.equal(budgetResult.observations[0].id, budget.id);
assert.match(formatNationalSnapshotBlock(budgetResult), /2026 original state budgets/);
assert.match(formatNationalSnapshotBlock(budgetResult), /Original budget is planned expenditure/);

const inflationResult = await fetchNationalSnapshots('inflation CPI', fetchMock);
assert.equal(inflationResult.observations.length, 0);
assert.equal(inflationResult.catalogOnlySources.length, 1);
assert.match(formatNationalSnapshotBlock(inflationResult), /No observation has been integrated/);

let called = false;
const blocked = await fetchNationalSnapshots('health', async () => { called = true; }, { url: 'https://evil.example/snapshots' });
assert.equal(blocked.status, 'invalid');
assert.equal(called, false);

const malicious = await fetchNationalSnapshots('health', async () => response({
  contractVersion: '1.0.0', status: 'curated', observations: [{ ...health, sourceUrl: 'https://evil.example/fake' }],
}));
assert.equal(malicious.status, 'invalid');
assert.equal(malicious.observations.length, 0);


const chatSource = fs.readFileSync('api/chat.js', 'utf8');
const promptSource = fs.readFileSync('lib/system-prompt.js', 'utf8');
assert.match(chatSource, /fetchNationalSnapshots/);
assert.match(chatSource, /=== NATIONAL SOURCE SNAPSHOTS/);
assert.match(chatSource, /nationalSnapshots: nationalSnapshotsMeta/);
assert.match(promptSource, /NITDA DL4ALL dashboard counts are programme reporting/);
assert.match(promptSource, /NIMC NIN enrolment records are administrative identity records/);
assert.match(fs.readFileSync('../iseyc-civic-brain/lib/national-snapshot-client.js', 'utf8'), /ngf-public-finance-database/);

console.log('National snapshot client security and interpretation checks passed.');
