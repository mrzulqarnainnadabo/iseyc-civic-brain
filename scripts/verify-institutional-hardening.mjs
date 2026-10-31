import { validateSourceUrl, buildMandatePublicUrl } from '../lib/safe-fetch.js';
import { buildTrustedRegistry } from '../lib/trusted-evidence-registry.js';
import { validateCivicBrief, BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { assessAggregateClaim } from '../lib/aggregate-claims.js';
import { applyNarrativeEvidencePolicy, validateClaimText } from '../lib/claim-policy.js';
import { canAdvanceAccountability } from '../lib/accountability-states.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

const meta = {
  publishedCount: 24,
  statesRepresented: 3,
  lgasRepresented: 10,
  dutiesRepresented: 8,
  pulseTotal: 24,
};

// Cross-field substitution: 3 is states, not published records
ok(!assessAggregateClaim('There are 3 published records', meta).ok, 'cross-field 3 as published rejected');
ok(assessAggregateClaim('There are 3 states represented', meta).ok, '3 as states accepted');
ok(!assessAggregateClaim('There are 24 states represented', meta).ok, '24 as states rejected');
ok(assessAggregateClaim('There are 24 published records', meta).ok, '24 published ok');
ok(!assessAggregateClaim('twenty-four published records'.replace('twenty-four', '999'), meta).ok, 'wrong digit rejected');
ok(!assessAggregateClaim('Published records are 50 percent of the pilot', meta).ok, 'percent rejected');
ok(!assessAggregateClaim('80% of Nigerians lack water', meta).ok, 'national rejected');
ok(!assessAggregateClaim('Published records increased by 40%', meta).ok, 'trend rejected');

// Number words
ok(assessAggregateClaim('There are three states represented', meta).ok, 'word three states ok');

// Missing meta
ok(!assessAggregateClaim('There are 24 published records', null).ok, 'no meta rejects metric claim');

const pulse = {
  records: [
    {
      id: 'rec1',
      sentence: 'Primary health centre needs medicines in Kaduna South',
      duty: 'Health',
      state: 'Kaduna',
      lga: 'Kaduna South',
      created: '2026-09-26T15:55:00.000Z',
    },
  ],
  total: 24,
};
const snap = {
  publishedCount: 24,
  statesRepresented: 3,
  lgasRepresented: 10,
  dutiesRepresented: 8,
  generatedAt: '2026-10-30T00:00:00.000Z',
};
const reg = buildTrustedRegistry(pulse, snap);

function baseBrief(overrides = {}) {
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    executiveSummary: 'Summary of pilot published health records.',
    whatIsHappening: 'Communities report health access issues.',
    geographicScope: 'Kaduna pilot',
    communityReports: [],
    officialEvidence: [],
    findings: [],
    possibleExplanations: [],
    institutionalResponsibilities: [],
    publicCommitments: [],
    verifiedImplementation: [],
    evidenceGaps: [],
    recommendations: [],
    sources: [],
    limitations: 'Pilot only',
    ...overrides,
  };
}

// False number with genuine citation
const falseNum = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: 'There are 999 published records in the platform.',
        classification: 'FACT',
        citations: ['intelligence:snapshot'],
      },
    ],
  }),
  reg
);
ok(falseNum.brief.findings[0].classification !== 'FACT', 'false aggregate demoted');

// Executive summary unverified achievement
const exec = validateCivicBrief(
  baseBrief({
    executiveSummary: 'The ministry successfully delivered the clinic and the problem is resolved.',
    findings: [],
  }),
  reg
);
ok(exec.brief.executiveSummaryPolicy.requiresHumanReview, 'exec summary achievement flagged');

// Fabricated implementation with non-empty registry
const impl = validateCivicBrief(
  baseBrief({
    findings: [],
    verifiedImplementation: ['Road construction finished and outcome independently verified.'],
  }),
  reg
);
ok(
  impl.brief.verifiedImplementation[0].classification === 'UNKNOWN' &&
    impl.brief.verifiedImplementation[0].independentlyVerified === false,
  'implementation never trusted from model'
);

// Indirect ministry acted
const acted = validateClaimText('The ministry has acted on the referral and accepted the referral.', {
  aggregateMeta: meta,
});
ok(acted.classification === 'UNKNOWN', 'indirect ministry action demoted');

// Model verification status
const ir = validateCivicBrief(
  baseBrief({
    findings: [],
    institutionalResponsibilities: [
      { institution: 'X', verificationStatus: 'independently_verified', text: 'Responsible body' },
    ],
  }),
  reg
);
ok(ir.brief.institutionalResponsibilities[0].verificationStatus === 'unverified', 'status demoted');

// Narrative policy
const narr = applyNarrativeEvidencePolicy(
  'There are 999 published records and the clinic was fully implemented.',
  meta
);
ok(narr.policyApplied && narr.flags.length > 0, 'narrative policy flags unsupported claims');

// URL policy
ok(validateSourceUrl('https://2027-street-mandate.vercel.app/api/pulse', 'pulse').ok, 'pulse ok');
ok(!validateSourceUrl('https://2027-street-mandate.vercel.app/api/other', 'pulse').ok, 'wrong path');
ok(buildMandatePublicUrl('x').includes('/mandate/x'), 'mandate url');

// Partial evidence
const partial = buildTrustedRegistry(pulse, { error: 'down' });
ok(partial.unavailable.some((u) => u.channel === 'intelligence'), 'partial failure recorded');

ok(canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'model' }).ok === false, 'model cannot verify');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Institutional hardening adversarial checks passed.');
