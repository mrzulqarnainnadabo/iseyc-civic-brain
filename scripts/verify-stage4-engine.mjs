import {
  validateCivicBrief,
  narrativeFallbackFromFailure,
  BRIEF_SCHEMA_VERSION,
} from '../lib/civic-brief-engine.js';
import { assessCitationRelevance } from '../lib/citation-relevance.js';
import { canAdvanceAccountability } from '../lib/accountability-states.js';
import { stripToPublicMandateRecord } from '../lib/public-mandate-dto.js';
import { buildTrustedRegistry } from '../lib/trusted-evidence-registry.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

const reg = buildTrustedRegistry(
  {
    records: [
      {
        id: 'src-pulse',
        sentence: 'At least one published Health demand exists for Kaduna in the pulse sample.',
        duty: 'Health',
        state: 'Kaduna',
        lga: 'Kaduna South',
        created: '2026-09-26T15:55:00.000Z',
      },
    ],
  },
  { publishedCount: 24, generatedAt: '2026-10-30T00:00:00.000Z', statesRepresented: 3 }
);

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
        citations: ['mandate:src-pulse'],
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
    sources: [{ id: 'ignored-model-source', title: 'Model', sourceType: 'independently_verified' }],
    limitations: 'Pilot published records only; not a national survey.',
    ...overrides,
  };
}

const v1 = validateCivicBrief(baseBrief(), reg);
ok(v1.ok, 'valid brief passes');
ok(v1.brief?.sources?.every((s) => s.serverOwned), 'server-owned sources');

ok(
  !validateCivicBrief(
    baseBrief({
      findings: [{ text: 'x', classification: 'FACT', citations: [] }],
    }),
    reg
  ).brief.findings[0].classification === 'FACT',
  'FACT no citations demoted'
);

const unknownCite = validateCivicBrief(
  baseBrief({
    findings: [{ text: 'Health demand Kaduna', classification: 'FACT', citations: ['nope'] }],
  }),
  reg
);
ok(unknownCite.brief.findings[0].classification !== 'FACT', 'unknown citation demotes');

const prev = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: '80% of Nigerians lack water',
        classification: 'FACT',
        citations: ['mandate:src-pulse'],
      },
    ],
  }),
  reg
);
ok(prev.brief.findings[0].classification === 'UNKNOWN', 'prevalence demoted');

const done = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: 'Water supply was fully implemented and resolved across Lagos beaches yesterday.',
        classification: 'FACT',
        citations: ['mandate:src-pulse'],
      },
    ],
  }),
  reg
);
ok(done.brief.findings[0].classification === 'UNKNOWN', 'completion demoted');

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

const rel = assessCitationRelevance(
  { text: 'Health primary care medicines in Kaduna South' },
  { title: 'Health PHC medicines Kaduna South', geoCoverage: 'Kaduna South', subjectCategory: 'Health' }
);
ok(rel.independentlyVerified === false, 'relevance never independentlyVerified');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Stage 4 engine checks passed.');
