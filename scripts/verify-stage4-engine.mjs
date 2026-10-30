import {
  validateCivicBrief,
  extractJsonBrief,
  narrativeFallbackFromFailure,
  BRIEF_SCHEMA_VERSION,
} from '../lib/civic-brief-engine.js';
import { assessCitationRelevance, applyRelevanceToFindings } from '../lib/citation-relevance.js';
import {
  canAdvanceAccountability,
  describeState,
} from '../lib/accountability-states.js';
import { stripToPublicMandateRecord } from '../lib/public-mandate-dto.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

function baseBrief(overrides = {}) {
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    executiveSummary: 'Pilot published health demands in Kaduna exist.',
    whatIsHappening: 'Published records describe primary care access concerns.',
    geographicScope: 'Kaduna (pilot coverage only)',
    communityReports: [{ text: 'PHC medicines gap', classification: 'COMMUNITY_REPORT', recordId: 'r1' }],
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
        limitations: 'Registry pattern only.',
      },
    ],
    publicCommitments: [],
    verifiedImplementation: [],
    evidenceGaps: ['No independently verified implementation evidence.'],
    recommendations: [{ text: 'Human review before any referral draft.', classification: 'RECOMMENDATION' }],
    sources: [
      {
        id: 'src-pulse',
        title: 'Civic Mandate Pulse published Health records Kaduna',
        sourceType: 'community_submission',
        geoCoverage: 'Kaduna',
        subjectCategory: 'Health',
      },
    ],
    limitations: 'Pilot published records only; not a national survey.',
    ...overrides,
  };
}

ok(validateCivicBrief(baseBrief()).ok, 'valid brief passes');

// Irrelevant citation: FACT about water cites a security-only source
const irrelevant = baseBrief({
  findings: [
    {
      text: 'Water supply was fully fixed across Lagos beaches yesterday.',
      classification: 'FACT',
      citations: ['src-security'],
    },
  ],
  sources: [
    {
      id: 'src-security',
      title: 'Security neighbourhood response notes',
      sourceType: 'community_submission',
      geoCoverage: 'Zamfara',
      subjectCategory: 'Security',
    },
  ],
});
// Completion language blocks before relevance
ok(!validateCivicBrief(irrelevant).ok, 'completion + irrelevant path fails validation');

const weakOnly = baseBrief({
  findings: [
    {
      text: 'Water pipes require maintenance schedules in remote desert counties.',
      classification: 'FACT',
      citations: ['src-security'],
    },
  ],
  sources: [
    {
      id: 'src-security',
      title: 'Security neighbourhood response notes',
      sourceType: 'community_submission',
      geoCoverage: 'Zamfara',
      subjectCategory: 'Security',
    },
  ],
});
const weakResult = validateCivicBrief(weakOnly);
ok(weakResult.ok, 'structurally valid brief with weak citation still validates structurally');
ok(
  weakResult.brief?.findings?.[0]?.classification === 'UNKNOWN' ||
    weakResult.brief?.findings?.[0]?.classification === 'ANALYSIS',
  'weak citation demotes FACT classification'
);
ok(weakResult.brief?.findings?.[0]?.claimRelevance?.independentlyVerified === false, 'never independently verified from heuristic');
ok(weakResult.brief?.findings?.[0]?.claimRelevance?.requiresHumanReview === true, 'requires human review on weak relevance');

const rel = assessCitationRelevance(
  { text: 'Health primary care medicines in Kaduna South' },
  { title: 'Health PHC medicines Kaduna South', geoCoverage: 'Kaduna South', subjectCategory: 'Health' }
);
ok(rel.supportLevel === 'plausible_related' || rel.related, 'related health/kaduna scores related');
ok(rel.independentlyVerified === false, 'relevance never sets independentlyVerified');

ok(!validateCivicBrief(baseBrief({ findings: [{ text: 'x', classification: 'FACT', citations: [] }] })).ok, 'FACT no citations');
ok(!validateCivicBrief(baseBrief({ findings: [{ text: 'x', classification: 'FACT', citations: ['nope'] }] })).ok, 'unknown citation');

const fb = narrativeFallbackFromFailure('q', ['x'], true);
ok(fb.includes('not a validated civic_brief_v1'), 'fallback not validated brief');

ok(canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'model' }).ok === false, 'model cannot verify outcome');

const live = stripToPublicMandateRecord({
  id: '4005db88ef468116ae20ec69bc81b114',
  sentence: 'Public access points in schools and civic centres.',
  duty: 'Digital Infrastructure',
  office: 'President',
  state: 'Ondo',
  lga: 'Owo',
  created: '2026-10-21T18:15:00.000Z',
  email: 'x@y.com',
});
ok(live && !('email' in live), 'privacy strip');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Stage 4 engine checks passed.');
