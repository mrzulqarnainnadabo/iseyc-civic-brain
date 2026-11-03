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
});
assert.equal(cr.sentence, 'Fix PHC water');
assert.equal(cr.verificationStatus, 'unverified');
assert.equal(cr.office, 'LGA');
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

// CommunityRecord API missing → pulse fallback
const bundle = await fetchPublishedCommunityRecords(async (url) => {
  if (String(url).includes('community-records')) {
    return { ok: false, status: 404, json: async () => ({}) };
  }
  return {
    ok: true,
    json: async () => ({
      voices: [
        {
          id: 'p1',
          sentence: 'Published only',
          duty: 'Security',
          office: 'President',
          state: 'Kaduna',
          lga: 'Igabi',
          created: '2026-10-14T00:00:00.000Z',
        },
      ],
      total: 1,
      truncated: false,
      states: 1,
    }),
  };
});
assert.equal(bundle.source, 'civic-mandate-pulse-published-only');
assert.equal(bundle.records.length, 1);
assert.equal(bundle.records[0].verificationStatus, 'unverified');

// Prefer CommunityRecord when present
const preferred = await fetchPublishedCommunityRecords(async (url) => {
  if (String(url).includes('community-records')) {
    return {
      ok: true,
      json: async () => ({
        contractVersion: '0.1.0',
        total: 1,
        truncatedUpstream: false,
        records: [
          {
            id: 'c1',
            contractVersion: '0.1.0',
            publicationStatus: 'published',
            verificationStatus: 'unverified',
            text: 'From CR API',
            duty: 'Health',
            officeLabel: 'LGA',
            state: 'Kaduna',
            lga: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ],
        verificationNote: 'unverified default',
        prevalenceNote: 'not national need',
      }),
    };
  }
  throw new Error('pulse should not be called');
});
assert.equal(preferred.source, 'civic-mandate-community-records-v0.1');
assert.equal(preferred.contractVersion, '0.1.0');
assert.equal(preferred.records[0].sentence, 'From CR API');

console.log('verify-community-record-client: PASS');
