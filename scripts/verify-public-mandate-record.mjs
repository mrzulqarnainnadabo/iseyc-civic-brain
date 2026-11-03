import { voiceToPublicMandateRecord, voicesToPublicMandateRecords, FORBIDDEN_PUBLIC_KEYS } from '../lib/public-mandate-record.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

const clean = voiceToPublicMandateRecord({
  id: 'abc',
  sentence: 'PHC needs staff',
  duty: 'Health',
  state: 'Kaduna',
  lga: 'Igabi',
  office: 'Governor',
  created: '2026-09-01T00:00:00.000Z',
  email: 'secret@example.com',
  fingerprint: 'fp-xyz',
  operatorNotes: 'internal',
});
ok(clean && clean.synthetic === false, 'synthetic false');
ok(clean.reviewStatus === 'published', 'reviewStatus published');
ok(clean.origin === 'civic-mandate', 'origin civic-mandate');
ok(!('email' in clean) && !('fingerprint' in clean), 'private fields stripped');
ok(clean.publicUrl.includes('/mandate/abc'), 'publicUrl set');

const poisoned = voiceToPublicMandateRecord({
  id: 'x',
  sentence: 'Road repair',
  email: 'a@b.c',
  phone: '080',
  contact: 'me',
  age: 20,
  gender: 'x',
  deviceId: 'd',
  notionId: 'n',
  submitter: 's',
  ip: '1.1.1.1',
});
ok(poisoned, 'valid voice still converts');
for (const k of FORBIDDEN_PUBLIC_KEYS) {
  ok(!(k in poisoned), `forbidden key absent: ${k}`);
}

ok(voiceToPublicMandateRecord({ sentence: 'no id' }) === null, 'reject missing id');
ok(voiceToPublicMandateRecord({ id: '1' }) === null, 'reject missing sentence');
ok(voicesToPublicMandateRecords(null).length === 0, 'null voices -> []');
ok(voicesToPublicMandateRecords([{ id: '1', sentence: 'ok' }, { id: '2' }]).length === 1, 'skip invalid');

if (failed) process.exit(1);
console.log('PublicMandateRecord checks passed.');
