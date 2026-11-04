import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fetchInecEvidence,
  formatInecEvidenceBlock,
} from '../lib/inec-evidence-client.js';

const publisher = 'Independent National Electoral Commission (INEC)';
const base = {
  contractVersion: '1.0.0',
  status: 'ok',
  publisher,
  methodology: 'Direct transcription of the official INEC source.',
  limitations: ['Historical or source-specific evidence; not a live INEC feed.'],
  recordCount: 1,
  records: [],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const pvc2023 = {
  ...base,
  datasetId: 'inec-2023-registered-voters-pvc-collection',
  title: '2023 registered voters and PVC collection',
  sourceUrl: 'https://www.inecnigeria.org/wp-content/uploads/2023/02/PVCs-Collected-Registered-Voters.pdf',
  sourceReferenceDate: '2023-02-05',
  sourceReportedNationalTotals: { registeredVoters: 93469008, collectedPVCs: 87209007, collectionRate: 93.3 },
  reconciliation: { phaseOneCountDifference: null, note: 'Uncollected PVC values do not reconcile.' },
  records: [{ state: 'Kaduna', registeredVoters: 4335208, collectedPVCs: 4164473, collectionRateReported: 96.1 }],
};
const cvr = {
  ...base,
  datasetId: 'inec-cvr-2025-26-phase-one-reported-counts',
  title: 'CVR 2025–2026 official phase statements',
  sourceUrl: 'https://wp1.inecnigeria.org/remarks-by-the-honourable-chairman-independent-national-electoral-commission/',
  sourceReferenceDate: null,
  nationalFinalPostCvrRegister: null,
  reconciliation: { phaseOneCountDifference: 2, note: 'Two official statements differ by two registrations.' },
  recordCount: 2,
  records: [
    { statementId: 'chairman', publicationDate: '2026-02-05', newEligibleVotersReported: 2782587, sourceUrl: 'https://wp1.inecnigeria.org/remarks/' },
    { statementId: 'release', publicationDate: '2026-02-04', newEligibleVotersReported: 2782589, sourceUrl: 'https://wp1.inecnigeria.org/release/' },
  ],
};

let calls = [];
const mockFetch = async (url) => {
  const parsed = new URL(url);
  calls.push(parsed);
  const dataset = parsed.searchParams.get('dataset');
  if (dataset === '2023-pvc') return json(pvc2023);
  if (dataset === 'cvr-2025-26') return json(cvr);
  return json({ error: 'DATASET_NOT_FOUND' }, 404);
};

// National voter question retrieves the dated baseline and latest CVR statements separately.
const result = await fetchInecEvidence('How many registered voters are in Kaduna today?', mockFetch);
assert.equal(result.status, 'ready');
assert.equal(result.stateFilter, 'Kaduna');
assert.equal(result.datasets.length, 2);
assert.equal(calls.length, 2);
assert.equal(calls.find((url) => url.searchParams.get('dataset') === '2023-pvc').searchParams.get('state'), 'Kaduna');
const block = formatInecEvidenceBlock(result);
assert.match(block, /2023-02-05/);
assert.match(block, /93469008/);
assert.match(block, /registeredVoters: 4335208/);
assert.match(block, /newEligibleVotersReported: 2782587/);
assert.match(block, /phaseOneCountDifference/);
assert.match(block, /not a live INEC API/);

// A 2023-specific question does not silently pull in later CVR registrations.
calls = [];
const historical = await fetchInecEvidence('How many registered voters and PVCs were collected in 2023?', mockFetch);
assert.equal(historical.status, 'ready');
assert.equal(historical.datasets.length, 1);
assert.equal(calls.length, 1);
assert.equal(calls[0].searchParams.get('dataset'), '2023-pvc');
assert.equal(calls[0].searchParams.has('state'), false);

// An unrelated civic question does not make an unnecessary upstream request.
calls = [];
const skipped = await fetchInecEvidence('How does the state budget cycle work?', mockFetch);
assert.equal(skipped.status, 'skipped');
assert.equal(calls.length, 0);

// Reject arbitrary hosts before making a request.
calls = [];
const untrusted = await fetchInecEvidence('PVC collection in Nigeria', mockFetch, { url: 'https://example.com/api/evidence/inec' });
assert.equal(untrusted.status, 'invalid');
assert.equal(untrusted.errorCode, 'UNTRUSTED_ENDPOINT');
assert.equal(calls.length, 0);

// Partial evidence is labelled partial and never replaced with invented data.
const partial = await fetchInecEvidence('How many registered voters are there?', async (url) => {
  const parsed = new URL(url);
  if (parsed.searchParams.get('dataset') === '2023-pvc') return json(pvc2023);
  return json({ error: 'UPSTREAM_UNAVAILABLE' }, 503);
});
assert.equal(partial.status, 'partial');
assert.equal(partial.datasets.length, 1);
assert.equal(partial.errorCode, 'UPSTREAM_UNAVAILABLE');

// Wrong publisher fails closed.
const wrongPublisher = await fetchInecEvidence('PVCs collected in Nigeria', async () => json({ ...pvc2023, publisher: 'Unknown source' }));
assert.equal(wrongPublisher.status, 'unavailable');
assert.equal(wrongPublisher.errorCode, 'PUBLISHER_MISMATCH');

const root = new URL('../', import.meta.url);
const chatSource = fs.readFileSync(new URL('api/chat.js', root), 'utf8');
const promptSource = fs.readFileSync(new URL('lib/system-prompt.js', root), 'utf8');
assert.match(chatSource, /fetchInecEvidence\(latestUserMessage\)/);
assert.match(chatSource, /nationalEvidence: inecMeta/);
assert.match(chatSource, /NATIONAL OFFICIAL EVIDENCE \(INEC\)/);
assert.match(promptSource, /NATIONAL OFFICIAL EVIDENCE RULES/);
assert.match(promptSource, /Never add phase-one CVR registrations to the 2023 register/);

console.log('verify-inec-evidence-client: PASS');
