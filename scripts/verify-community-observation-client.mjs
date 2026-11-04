import assert from 'node:assert/strict';
import {
  fetchPublishedCommunityObservations,
  formatCommunityObservationBlock,
} from '../lib/community-observation-client.js';

const record = {
  id: 'aabbcc',
  displayId: 'CR-7',
  contractVersion: '0.1.0',
  publicationStatus: 'published',
  verificationStatus: 'unverified',
  title: 'Water supply interruption at a Kaduna PHC',
  reportType: 'Service access gap',
  sector: 'Health',
  state: 'Kaduna',
  lga: 'Kaduna South',
  ward: 'Television',
  placeOrFacility: 'Primary Health Centre A',
  observedOn: '2026-10-22',
  description: 'A community report describes an interruption in water access at the named primary health centre.',
  evidenceTypes: ['First-hand observation'],
  evidenceLink: 'https://example.gov.ng/report',
  submittedAt: '2026-10-23T10:00:00.000Z',
  publishedAt: '2026-10-25',
};

function response(records, overrides = {}) {
  return {
    contractVersion: '0.1.0',
    publicationBoundary: 'published-only',
    page: 1,
    pageSize: 50,
    total: records.length,
    totalPages: 1,
    truncatedUpstream: false,
    records,
    ...overrides,
  };
}

const ok = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' },
});

// Valid empty feed remains empty.
const empty = await fetchPublishedCommunityObservations(async () => ok(response([], { total: 0 })));
assert.equal(empty.status, 'empty');
assert.equal(empty.total, 0);
assert.match(formatCommunityObservationBlock(empty), /does not mean there are no community concerns/);

// Published report keeps its own verification status and source fields.
const ready = await fetchPublishedCommunityObservations(async () => ok(response([record])), { query: 'Kaduna PHC water' });
assert.equal(ready.status, 'ready');
assert.equal(ready.records.length, 1);
assert.equal(ready.records[0].displayId, 'CR-7');
assert.equal(ready.records[0].verificationStatus, 'unverified');
const block = formatCommunityObservationBlock(ready, 'Kaduna PHC water');
assert.match(block, /CR-7/);
assert.match(block, /Verification status: unverified/);
assert.match(block, /Publication is not independent verification/);
assert.match(block, /https:\/\/example.gov.ng\/report/);

// Unknown/private fields fail closed.
const privateField = await fetchPublishedCommunityObservations(async () => ok(response([{ ...record, reviewerNotes: 'private' }])));
assert.equal(privateField.status, 'invalid');
assert.equal(privateField.records.length, 0);

// Truncated upstream feed is withheld.
const truncated = await fetchPublishedCommunityObservations(async () => ok(response([record], { total: 2, totalPages: 2, truncatedUpstream: true })));
assert.equal(truncated.status, 'incomplete');
assert.equal(truncated.records.length, 0);

// Invalid contract fails closed.
const invalid = await fetchPublishedCommunityObservations(async () => ok(response([record], { contractVersion: '9.9.9' })));
assert.equal(invalid.status, 'invalid');

// Pagination must reconcile with total.
const mismatch = await fetchPublishedCommunityObservations(async () => ok(response([record], { total: 2 })));
assert.equal(mismatch.status, 'incomplete');

// Outage does not fall back to the demand or pulse feed.
let calls = 0;
const unavailable = await fetchPublishedCommunityObservations(async () => {
  calls += 1;
  return ok({ diagnosticCode: 'NOTION_ACCESS_DENIED' }, 503);
});
assert.equal(unavailable.status, 'unavailable');
assert.equal(calls, 1);
assert.match(formatCommunityObservationBlock(unavailable), /Do not infer absence/);

console.log('verify-community-observation-client: PASS');
