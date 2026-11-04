import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  fetchNationalINECEvidence,
  formatNationalINECEvidenceBlock,
} from '../lib/national-evidence-client.js';

const pvc = {
  datasetId: 'inec-2023-registered-voters-pvc-collection',
  title: '2023 voter register and PVC collection',
  publisher: 'Independent National Electoral Commission (INEC)',
  sourceUrl: 'https://www.inecnigeria.org/wp-content/uploads/2023/02/PVCs-Collected-Registered-Voters.pdf',
  sourceReferenceDate: '2023-02-05',
  sourceReportedNationalTotals: { registeredVoters: 93469008, collectedPVCs: 87209007, collectionRate: 93.3 },
  records: [{ state: 'Kaduna', registeredVoters: 4335208, collectedPVCs: 4164473, collectionRateReported: 96.1 }],
  limitations: ['Historical 2023 snapshot'],
};
const ekiti = {
  datasetId: 'inec-ekiti-2026-election-register-snapshot',
  title: 'Ekiti 2026 election register',
  publisher: 'Independent National Electoral Commission (INEC)',
  sourceUrl: 'https://wp1.inecnigeria.org/news-letters/why-we-appealed-court-judgments-on-2027-election-timetable-inec-chairman/',
  records: [{ registeredVotersForElection: 1059360, baseRegister2023: 987647, newRegistrantsReported: 66664, doubleRegistrationsInvalidatedReported: 2103, calculatedBasePlusNew: 1054311, unreconciledDifference: 5049 }],
  limitations: ['State-specific snapshot'],
};
const osun = {
  datasetId: 'inec-osun-2026-pvc-collection',
  title: 'Osun 2026 PVC collection',
  publisher: 'Independent National Electoral Commission (INEC)',
  sourceUrl: 'https://www.inecnigeria.org/statistics/pvc',
  records: [{ collectedPVCs: 1518485, localGovernmentAreas: 30 }],
  limitations: ['No denominator'],
};
const cvr = {
  datasetId: 'inec-cvr-2025-26-phase-one-reported-counts',
  title: 'CVR phase-one statements',
  publisher: 'Independent National Electoral Commission (INEC)',
  sourceUrl: 'https://wp1.inecnigeria.org/remarks-by-the-honourable-chairman-independent-national-electoral-commission-inec-prof-joash-amupitan-san-at-the-first-regular-consultative-meeting-with-political-parties-held-at-the-inec-confe/',
  records: [
    { publicationDate: '2026-02-04', statementId: 'press-release', newEligibleVotersReported: 2782589, sourceUrl: 'https://wp1.inecnigeria.org/news-all/inec-to-revalidate-and-clean-up-voters-register-nationwide-schedules-mock-accreditation-ahead-of-fct-area-council-elections/' },
    { publicationDate: '2026-02-05', statementId: 'chairman-remarks', newEligibleVotersReported: 2782587, sourceUrl: 'https://wp1.inecnigeria.org/remarks-by-the-honourable-chairman-independent-national-electoral-commission-inec-prof-joash-amupitan-san-at-the-first-regular-consultative-meeting-with-political-parties-held-at-the-inec-confe/' },
  ],
  limitations: ['Two official values differ'],
};

const payload = { contractVersion: '1.0.0', status: 'ok', datasets: [pvc, ekiti, osun, cvr] };
const fetchOk = async (url) => {
  assert.match(url, /dataset=all/);
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
};

const bundle = await fetchNationalINECEvidence(fetchOk);
assert.equal(bundle.status, 'ready');
assert.equal(bundle.datasets.length, 4);
const block = formatNationalINECEvidenceBlock(bundle, 'PVC collection in Kaduna');
assert.match(block, /93,469,008/);
assert.match(block, /87,209,007/);
assert.match(block, /4,335,208/);
assert.match(block, /4,164,473/);
assert.match(block, /2,782,587/);
assert.match(block, /2,782,589/);
assert.match(block, /5,049/);
assert.match(block, /1,518,485/);
assert.match(block, /not a live INEC API/);

const unavailable = await fetchNationalINECEvidence(async () => new Response('{"error":"SOURCE_OFFLINE"}', { status: 503 }));
assert.equal(unavailable.status, 'unavailable');
assert.match(formatNationalINECEvidenceBlock(unavailable), /Do not invent/);

const invalid = await fetchNationalINECEvidence(async () => new Response('{"contractVersion":"9.0.0","status":"ok","datasets":[]}', { status: 200 }));
assert.equal(invalid.status, 'invalid');

const chat = fs.readFileSync('api/chat.js', 'utf8');
const prompt = fs.readFileSync('lib/system-prompt.js', 'utf8');
assert.match(chat, /fetchNationalINECEvidence/);
assert.match(chat, /formatNationalINECEvidenceBlock/);
assert.match(chat, /nationalEvidence: nationalEvidenceMeta/);
assert.match(chat, /NATIONAL INSTITUTIONAL EVIDENCE/);
assert.match(prompt, /What is happening\?/);
assert.match(prompt, /Which sources support the findings\?/);
assert.match(prompt, /NBS, CBN, NPC, UBEC/);
console.log('verify-national-evidence-client: PASS');
