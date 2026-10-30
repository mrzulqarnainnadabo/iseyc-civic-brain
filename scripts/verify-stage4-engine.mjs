import {
  validateCivicBrief,
  extractJsonBrief,
  narrativeFallbackFromFailure,
  BRIEF_SCHEMA_VERSION,
} from '../lib/civic-brief-engine.js';
import {
  assessEvidenceItem,
  findDuplicateEvidenceIds,
  geographicMismatch,
  summariseEvidenceQuality,
} from '../lib/evidence-quality.js';
import {
  canAdvanceAccountability,
  describeState,
  ACCOUNTABILITY_STATES,
} from '../lib/accountability-states.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

// --- Civic Brief validation ---
const validBrief = {
  schemaVersion: BRIEF_SCHEMA_VERSION,
  executiveSummary: 'Pilot published health demands in Kaduna exist.',
  whatIsHappening: 'Published records describe primary care access concerns.',
  geographicScope: 'Kaduna (pilot coverage only)',
  communityReports: [
    { text: 'PHC medicines gap', classification: 'COMMUNITY_REPORT', recordId: 'r1' },
  ],
  officialEvidence: [],
  findings: [
    {
      text: 'At least one published Health demand exists for Kaduna in the pulse sample.',
      classification: 'FACT',
      citations: ['src-pulse'],
    },
  ],
  possibleExplanations: [{ text: 'May reflect local service gaps', classification: 'HYPOTHESIS' }],
  institutionalResponsibilities: [
    {
      institution: 'State primary health structures (pilot pattern)',
      level: 'state',
      duty: 'Health',
      verificationStatus: 'unverified',
      limitations: 'Registry pattern only; not a legal determination.',
    },
  ],
  publicCommitments: [],
  verifiedImplementation: [],
  evidenceGaps: ['No independently verified implementation evidence in this turn.'],
  recommendations: [
    { text: 'Human review before any referral draft.', classification: 'RECOMMENDATION' },
  ],
  sources: [{ id: 'src-pulse', title: 'Civic Mandate Pulse (published)', sourceType: 'community_submission' }],
  limitations: 'Pilot published records only; not a national survey.',
};

const v1 = validateCivicBrief(validBrief);
ok(v1.ok, 'valid brief passes');

const badFact = JSON.parse(JSON.stringify(validBrief));
badFact.findings[0].citations = [];
ok(!validateCivicBrief(badFact).ok, 'FACT without citations fails');

const badCite = JSON.parse(JSON.stringify(validBrief));
badCite.findings[0].citations = ['does-not-exist'];
ok(!validateCivicBrief(badCite).ok, 'unknown citation fails');

const prevalence = JSON.parse(JSON.stringify(validBrief));
prevalence.findings[0].text = '80% of Nigerians lack water';
ok(!validateCivicBrief(prevalence).ok, 'prevalence-style claim flagged');

ok(extractJsonBrief('```json\n' + JSON.stringify(validBrief) + '\n```')?.schemaVersion === BRIEF_SCHEMA_VERSION, 'extract fenced JSON');
ok(
  narrativeFallbackFromFailure('health in Kaduna', ['fact_missing_citations:0'], true).includes('What the public record shows'),
  'fallback preserves Civic Brief headings'
);

// --- Evidence quality ---
const weak = assessEvidenceItem({ id: '1', title: 'x' });
ok(weak.issues.includes('missing_publisher'), 'missing publisher detected');
ok(findDuplicateEvidenceIds([{ id: 'a' }, { id: 'a' }]).includes('a'), 'duplicate ids');
ok(geographicMismatch('Kaduna South', 'Lagos').mismatch === true, 'geo mismatch');
ok(summariseEvidenceQuality([{ id: '1', publisher: 'ISEYC', title: 't', sourceUrl: 'https://example.com', sourceType: 'community_submission', verificationStatus: 'reviewed' }]).adequate === 1, 'adequate count');

// --- Accountability ---
ok(ACCOUNTABILITY_STATES.includes('record_published'), 'published state exists');
ok(canAdvanceAccountability('record_published', 'referral_approved_or_sent', { actorRole: 'model' }).ok === false, 'model cannot send referral');
ok(canAdvanceAccountability('record_published', 'referral_approved_or_sent', { actorRole: 'authorised_operator', consentRecorded: true }).ok === true, 'operator can advance with consent');
ok(canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'authorised_operator' }).ok === false, 'verified outcome needs independent evidence');
ok(describeState('record_published').doesNotMean.includes('Not proof'), 'published does not mean action');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Stage 4 engine checks passed.');
