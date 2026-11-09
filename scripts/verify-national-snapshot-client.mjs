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
const nbs = {
  id: 'nbs-cpi-catalog', title: 'NBS CPI catalogue', publisher: 'NBS',
  url: 'https://microdata.nigerianstat.gov.ng/index.php/catalog/154/related-materials',
  note: 'Catalogue only; no current numeric observation integrated.',
};
function response(body, ok = true) {
  return { ok, status: ok ? 200 : 503, text: async () => JSON.stringify(body) };
}

const fetchMock = async () => response({
  contractVersion: '1.0.0', status: 'curated', checkedAt: '2026-11-09',
  observations: [health, civic], catalogOnlySources: [nbs], limitations: ['Manual snapshots, not live feeds.'],
});
const healthResult = await fetchNationalSnapshots('health', fetchMock);
assert.equal(healthResult.status, 'ready');
assert.equal(healthResult.observations.length, 1);
assert.equal(healthResult.observations[0].id, health.id);
assert.match(formatNationalSnapshotBlock(healthResult), /not live feeds/i);
assert.match(formatNationalSnapshotBlock(healthResult), /REFERENCE_PERIOD: 2024/);
assert.match(formatNationalSnapshotBlock(healthResult), /59.5 deaths per 1,000 live births/);

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

console.log('National snapshot client security and interpretation checks passed.');

const chatSource = fs.readFileSync('api/chat.js', 'utf8');
const promptSource = fs.readFileSync('lib/system-prompt.js', 'utf8');
assert.match(chatSource, /fetchNationalSnapshots/);
assert.match(chatSource, /=== NATIONAL SOURCE SNAPSHOTS/);
assert.match(chatSource, /nationalSnapshots: nationalSnapshotsMeta/);
assert.match(promptSource, /NITDA DL4ALL dashboard counts are programme reporting/);
assert.match(promptSource, /NIMC NIN enrolment records are administrative identity records/);
