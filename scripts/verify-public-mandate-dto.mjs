/**
 * Contract tests: PublicMandateRecord allowlist + privacy strip.
 */
import {
  stripToPublicMandateRecord,
  voicesToPublicRecords,
  toCommunityEvidence,
  PUBLIC_MANDATE_ALLOWED_KEYS,
} from '../lib/public-mandate-dto.js';

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

const clean = {
  id: 'abc123',
  sentence: 'Repair the ward clinic road.',
  duty: 'Health',
  office: 'Governor',
  state: 'Kaduna',
  lga: 'Kaduna South',
  created: '2026-09-22T19:00:00.000Z',
  email: 'should-be-dropped@example.com',
};

const stripped = stripToPublicMandateRecord(clean);
ok(stripped && stripped.id === 'abc123', 'strips to public id');
ok(stripped && !('email' in stripped), 'drops email key');
ok(stripped && stripped.publicUrl.includes('/mandate/abc123'), 'adds publicUrl');

const poisoned = stripToPublicMandateRecord({
  id: 'x',
  sentence: 'Test',
  duty: 'Water',
  office: 'Governor',
  state: 'Kaduna',
  created: '2026-01-01T00:00:00.000Z',
  submitterEmail: 'leak@example.com',
});
ok(poisoned === null, 'rejects objects with forbidden key names');

const voices = voicesToPublicRecords([
  clean,
  { id: '', sentence: 'bad' },
  { sentence: 'no id' },
]);
ok(voices.length === 1, 'voicesToPublicRecords filters invalid');

const ev = toCommunityEvidence(stripped);
ok(ev && ev.sourceType === 'community_submission', 'evidence type community_submission');
ok(ev && ev.id === 'mandate:abc123', 'evidence id prefix');
ok(Array.isArray(PUBLIC_MANDATE_ALLOWED_KEYS) && PUBLIC_MANDATE_ALLOWED_KEYS.includes('id'), 'allowlist exported');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('PublicMandateRecord DTO checks passed.');
