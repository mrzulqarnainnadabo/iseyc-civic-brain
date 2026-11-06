/** Verify CommunityRecord client maps and validates the complete published v0.1 contract. */
import assert from 'node:assert/strict';
import {
  fromCommunityRecord,
  fetchPublishedCommunityRecords,
} from '../lib/community-record-client.js';

const record = (overrides = {}) => ({
  id: 'abc',
  contractVersion: '0.1.0',
  publicationStatus: 'published',
  verificationStatus: 'unverified',
  text: 'Fix PHC water',
  duty: 'Health',
  officeLabel: 'LGA',
  state: 'Kaduna',
  lga: 'Chikun',
  createdAt: '2026-10-01T00:00:00.000Z',
  sector: 'health',
  issueCategory: 'staffing',
  ward: 'Ungwan Rimi',
  facilityRef: null,
  reportedAt: null,
  publishedAt: null,
  evidenceRefIds: ['evidence-1'],
  followUpStatus: 'under-review',
  relatedSuggestedIds: ['abc-2'],
  ...overrides,
});
const page = (records, overrides = {}) => ({
  contractVersion: '0.1.0',
  publicationBoundary: 'published-only',
  page: 1,
  pageSize: 50,
  total: records.length,
  totalPages: 1,
  truncatedUpstream: false,
  records,
  ...overrides,
});

const cr = fromCommunityRecord(record());
assert.equal(cr.sentence, 'Fix PHC water');
assert.equal(cr.sourceRecordId, 'abc');
assert.equal(cr.verificationStatus, 'unverified');
assert.equal(cr.office, 'LGA');
assert.equal(cr.sector, 'health');
assert.deepEqual(cr.evidenceRefIds, ['evidence-1']);
assert.equal(cr.followUpStatus, 'under-review');
assert.deepEqual(cr.relatedSuggestedIds, ['abc-2']);
assert.ok(!('email' in cr));

// Reject extra/private fields and invalid verification states, even if core fields look valid.
await assert.rejects(
  fetchPublishedCommunityRecords(async () => ({ ok: true, json: async () => page([record({ email: 'private@example.test' })]) })),
  (error) => error.code === 'PUBLIC_RECORDS_MALFORMED',
);
await assert.rejects(
  fetchPublishedCommunityRecords(async () => ({ ok: true, json: async () => page([record({ verificationStatus: 'verified' })]) })),
  (error) => error.code === 'PUBLIC_RECORDS_MALFORMED',
);

// CommunityRecord outage must fail closed; legacy Pulse is never requested.
await assert.rejects(
  fetchPublishedCommunityRecords(async () => ({ ok: false, status: 503, json: async () => ({}) })),
  (error) => error.code === 'PUBLIC_RECORDS_UNAVAILABLE',
);

// A later-page outage must not return a partial feed or switch to Pulse.
let pageCalls = 0;
await assert.rejects(
  fetchPublishedCommunityRecords(async (url) => {
    const n = Number(new URL(String(url)).searchParams.get('page') || 1);
    pageCalls++;
    if (n === 1) return {
      ok: true,
      json: async () => page(Array.from({ length: 50 }, (_, i) => record({ id: 'first-' + i })), {
        total: 51, totalPages: 2,
      }),
    };
    return { ok: false, status: 503, json: async () => ({}) };
  }),
  (error) => error.code === 'PUBLIC_RECORDS_UNAVAILABLE',
);
assert.equal(pageCalls, 2);

// An upstream-truncated page is not accepted as a complete feed.
await assert.rejects(
  fetchPublishedCommunityRecords(async () => ({
    ok: true,
    json: async () => page([], { total: 60, totalPages: 2, truncatedUpstream: true }),
  })),
  (error) => error.code === 'PUBLIC_RECORDS_MALFORMED',
);

// Prefer CommunityRecord and preserve source identity, duty, office and geography.
const preferred = await fetchPublishedCommunityRecords(async () => ({
  ok: true,
  json: async () => page([record({ id: 'c1', text: 'From CR API' })], {
    verificationNote: 'unverified default',
    prevalenceNote: 'not national need',
  }),
}));
assert.equal(preferred.source, 'civic-mandate-community-records-v0.1');
assert.equal(preferred.contractVersion, '0.1.0');
assert.equal(preferred.records[0].sentence, 'From CR API');
assert.equal(preferred.records[0].sourceRecordId, 'c1');
assert.equal(preferred.records[0].state, 'Kaduna');
assert.equal(preferred.records[0].lga, 'Chikun');
assert.equal(preferred.records[0].duty, 'Health');
assert.equal(preferred.records[0].office, 'LGA');

// A valid empty CommunityRecord response is authoritative and does not fall back.
let pulseCalled = false;
const empty = await fetchPublishedCommunityRecords(async () => ({
  ok: true,
  json: async () => page([]),
}));
assert.equal(empty.source, 'civic-mandate-community-records-v0.1');
assert.equal(empty.records.length, 0);
assert.equal(pulseCalled, false);

// Follow all pages and reject a feed that does not match its declared total.
const firstPageRecords = Array.from({ length: 50 }, (_, i) => record({ id: 'page-1-' + i }));
const paged = await fetchPublishedCommunityRecords(async (url) => {
  const n = Number(new URL(String(url)).searchParams.get('page') || 1);
  return {
    ok: true,
    json: async () => page(
      n === 1 ? firstPageRecords : [record({ id: 'page-2-1' })],
      { page: n, total: 51, totalPages: 2 },
    ),
  };
});
assert.equal(paged.records.length, 51);
assert.equal(paged.truncated, false);

await assert.rejects(
  fetchPublishedCommunityRecords(async (url) => {
    const n = Number(new URL(String(url)).searchParams.get('page') || 1);
    return { ok: true, json: async () => page([record({ id: 'short-' + n })], { page: n, total: 51, totalPages: 2 }) };
  }),
  (error) => error.code === 'PUBLIC_RECORDS_MALFORMED',
);

console.log('verify-community-record-client: PASS');
