/** Verify CommunityRecord client maps and does not invent verification. */
import assert from 'node:assert/strict';
import {
  fromCommunityRecord,
  fromPulseVoice,
  fetchPublishedCommunityRecords,
} from '../lib/community-record-client.js';

const cr = fromCommunityRecord({
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
  sector: 'health', issueCategory: 'staffing', ward: 'Ungwan Rimi', facilityRef: null,
  evidenceRefIds: ['evidence-1'], followUpStatus: 'under-review', relatedSuggestedIds: ['abc-2'],
});
assert.equal(cr.sentence, 'Fix PHC water');
assert.equal(cr.verificationStatus, 'unverified');
assert.equal(cr.office, 'LGA');
assert.equal(cr.sector, 'health');
assert.deepEqual(cr.evidenceRefIds, ['evidence-1']);
assert.equal(cr.followUpStatus, 'under-review');
assert.deepEqual(cr.relatedSuggestedIds, ['abc-2']);
assert.ok(!('email' in cr));

const pulse = fromPulseVoice({
  id: 'x',
  sentence: 'Road',
  duty: 'Infrastructure',
  office: 'State',
  state: 'Ondo',
  lga: 'Owo',
  created: '2026-10-02T00:00:00.000Z',
});
assert.equal(pulse.publicationStatus, 'published');
assert.equal(pulse.verificationStatus, 'unverified');
assert.equal(pulse.contractVersion, null);

// CommunityRecord API missing → pulse fallback with an explicit reason.
const bundle = await fetchPublishedCommunityRecords(async (url) => {
  if (String(url).includes('community-records')) {
    return { ok: false, status: 404, json: async () => ({}) };
  }
  return {
    ok: true,
    json: async () => ({
      voices: [{ id: 'p1', sentence: 'Published only', duty: 'Security', office: 'President',
        state: 'Kaduna', lga: 'Igabi', created: '2026-10-14T00:00:00.000Z' }],
      total: 1, truncated: false, states: 1,
    }),
  };
});
assert.equal(bundle.source, 'civic-mandate-pulse-published-only');
assert.equal(bundle.fallbackReason, 'community_record_http_404');
assert.equal(bundle.records.length, 1);
assert.equal(bundle.records[0].verificationStatus, 'unverified');

// Prefer CommunityRecord when present.
const preferred = await fetchPublishedCommunityRecords(async (url) => {
  if (String(url).includes('community-records')) {
    return { ok: true, json: async () => ({
      contractVersion: '0.1.0', publicationBoundary: 'published-only',
      page: 1, pageSize: 50, totalPages: 1, total: 1, truncatedUpstream: false,
      records: [{ id: 'c1', contractVersion: '0.1.0', publicationStatus: 'published',
        verificationStatus: 'unverified', text: 'From CR API', duty: 'Health',
        officeLabel: 'LGA', state: 'Kaduna', lga: null, createdAt: '2026-10-01T00:00:00.000Z' }],
      verificationNote: 'unverified default', prevalenceNote: 'not national need',
    }) };
  }
  throw new Error('pulse should not be called');
});
assert.equal(preferred.source, 'civic-mandate-community-records-v0.1');
assert.equal(preferred.fallbackReason, null);
assert.equal(preferred.contractVersion, '0.1.0');
assert.equal(preferred.records[0].sentence, 'From CR API');

// A valid empty CommunityRecord response is authoritative and does not fall back.
let pulseCalled = false;
const empty = await fetchPublishedCommunityRecords(async (url) => {
  if (String(url).includes('community-records')) return { ok: true, json: async () => ({
    contractVersion: '0.1.0', publicationBoundary: 'published-only',
    page: 1, pageSize: 50, total: 0, totalPages: 1, truncatedUpstream: false, records: [],
  }) };
  pulseCalled = true;
  throw new Error('Pulse must not be called for an empty v0.1 feed');
});
assert.equal(empty.source, 'civic-mandate-community-records-v0.1');
assert.equal(empty.records.length, 0);
assert.equal(pulseCalled, false);

// A broken contract must fail closed rather than silently falling back.
let fallbackCalled = false;
await assert.rejects(fetchPublishedCommunityRecords(async (url) => {
  if (String(url).includes('community-records')) return { ok: true, json: async () => ({
    contractVersion: '9.9.9', publicationBoundary: 'published-only',
    page: 1, pageSize: 50, total: 0, totalPages: 1, records: [],
  }) };
  fallbackCalled = true;
  throw new Error('Fallback must not mask contract errors');
}), /Unsupported CommunityRecord v0.1 response/);
assert.equal(fallbackCalled, false);

// Follow all pages and preserve the upstream completeness flag.
const paged = await fetchPublishedCommunityRecords(async (url) => {
  const n = Number(new URL(String(url)).searchParams.get('page') || 1);
  return { ok: true, json: async () => ({
    contractVersion: '0.1.0', publicationBoundary: 'published-only',
    page: n, pageSize: 50, total: 2, totalPages: 2, truncatedUpstream: true,
    records: [{ id: 'page-' + n, contractVersion: '0.1.0', publicationStatus: 'published',
      verificationStatus: 'unverified', text: 'Page ' + n, duty: 'Health',
      officeLabel: null, state: null, lga: null, createdAt: '2026-10-01T00:00:00.000Z' }],
  }) };
});
assert.equal(paged.records.length, 2);
assert.equal(paged.truncated, true);
assert.ok(paged.limitations.some((x) => /upstream published feed is truncated/.test(x)));

console.log('verify-community-record-client: PASS');
