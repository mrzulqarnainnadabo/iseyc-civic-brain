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
import { voicesToPublicRecords, stripToPublicMandateRecord } from '../lib/public-mandate-dto.js';

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
    sources: [
      {
        id: 'src-pulse',
        title: 'Civic Mandate Pulse (published)',
        sourceType: 'community_submission',
      },
    ],
    limitations: 'Pilot published records only; not a national survey.',
    ...overrides,
  };
}

const v1 = validateCivicBrief(baseBrief());
ok(v1.ok, 'valid brief passes');
ok(v1.brief?.validationNote?.includes('Structural'), 'validationNote discloses structural limit');

ok(!validateCivicBrief(baseBrief({ findings: [{ text: 'x', classification: 'FACT', citations: [] }] })).ok, 'FACT without citations fails');
ok(
  !validateCivicBrief(
    baseBrief({ findings: [{ text: 'x', classification: 'FACT', citations: ['missing'] }] })
  ).ok,
  'unknown citation fails'
);
ok(
  !validateCivicBrief(
    baseBrief({
      findings: [
        {
          text: '80% of Nigerians lack water',
          classification: 'FACT',
          citations: ['src-pulse'],
        },
      ],
    })
  ).ok,
  'prevalence-style claim flagged'
);
ok(
  !validateCivicBrief(
    baseBrief({
      findings: [
        {
          text: 'The clinic problem is resolved and fully implemented.',
          classification: 'FACT',
          citations: ['src-pulse'],
        },
      ],
    })
  ).ok,
  'completion claim without independent source fails'
);
ok(
  !validateCivicBrief(
    baseBrief({
      institutionalResponsibilities: [
        {
          institution: 'Invented Agency',
          verificationStatus: 'verified',
        },
      ],
    })
  ).ok,
  'verified responsibility without source fails'
);
ok(
  !validateCivicBrief(
    baseBrief({
      verifiedImplementation: ['The road was successfully delivered and resolved.'],
    })
  ).ok,
  'verifiedImplementation completion language fails without independent source'
);
ok(
  !validateCivicBrief(
    baseBrief({
      officialEvidence: [
        {
          text: 'The project was fully implemented and resolved.',
          classification: 'FACT',
        },
      ],
    })
  ).ok,
  'announcement-as-completion fails'
);

ok(extractJsonBrief('```json\n' + JSON.stringify(baseBrief()) + '\n```')?.schemaVersion === BRIEF_SCHEMA_VERSION, 'extract fenced JSON');
const fb = narrativeFallbackFromFailure('health in Kaduna', ['fact_missing_citations:0'], true);
ok(fb.includes('What the public record shows'), 'fallback preserves headings');
ok(fb.includes('not a validated civic_brief_v1'), 'fallback not labelled validated brief');

// Malformed cannot pass
ok(!validateCivicBrief(null).ok, 'null brief fails');
ok(!validateCivicBrief('string').ok, 'string brief fails');
ok(!validateCivicBrief({ schemaVersion: '9.9.9' }).ok, 'wrong schema version fails');

// Accountability
ok(canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'model' }).ok === false, 'model cannot mark independently verified');
ok(canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'authorised_operator' }).ok === false, 'operator still needs independent evidence flag');
ok(
  canAdvanceAccountability('record_published', 'outcome_independently_verified', {
    actorRole: 'authorised_operator',
    hasIndependentEvidence: true,
  }).ok === true,
  'operator with independent evidence can mark verified'
);
ok(describeState('record_published').doesNotMean.includes('Not proof'), 'published does not mean action');

// Live-shaped Pulse allowlist (fixture mirrors production shape)
const liveVoice = {
  id: '4005db88ef468116ae20ec69bc81b114',
  sentence: 'Public access points in schools and civic centres.',
  mandate: 'Digital Infrastructure',
  duty: 'Digital Infrastructure',
  office: 'President',
  state: 'Ondo',
  lga: 'Owo',
  created: '2026-10-21T18:15:00.000Z',
  email: 'should-not-leak@example.com',
};
const stripped = stripToPublicMandateRecord(liveVoice);
ok(stripped && stripped.id === liveVoice.id, 'live-shaped id preserved');
ok(stripped && !('email' in stripped), 'live-shaped email stripped');
ok(voicesToPublicRecords([liveVoice]).length === 1, 'live-shaped voice maps');

// Evidence quality
ok(assessEvidenceItem({ id: '1', title: 'x' }).issues.includes('missing_publisher'), 'missing publisher');
ok(findDuplicateEvidenceIds([{ id: 'a' }, { id: 'a' }]).includes('a'), 'duplicates');
ok(geographicMismatch('Kaduna South', 'Lagos').mismatch === true, 'geo mismatch');
ok(ACCOUNTABILITY_STATES.includes('record_published'), 'states list');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Stage 4 engine checks passed.');
