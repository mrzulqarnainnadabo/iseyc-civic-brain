import { validateSourceUrl, validatePublicHttpsUrl, buildMandatePublicUrl } from '../lib/safe-fetch.js';
import { buildTrustedRegistry, resolveTrustedCitation } from '../lib/trusted-evidence-registry.js';
import { validateCivicBrief, BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { assessAggregateClaim } from '../lib/aggregate-claims.js';
import { canAdvanceAccountability } from '../lib/accountability-states.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

// URL policy
ok(validateSourceUrl('https://2027-street-mandate.vercel.app/api/pulse', 'pulse').ok, 'pulse path ok');
ok(!validateSourceUrl('https://2027-street-mandate.vercel.app/api/pulse?x=1', 'pulse').ok, 'pulse query rejected');
ok(!validateSourceUrl('https://2027-street-mandate.vercel.app/api/admin', 'pulse').ok, 'wrong path rejected');
ok(!validateSourceUrl('https://2027-street-mandate.vercel.app:8443/api/pulse', 'pulse').ok, 'port rejected');
ok(!validateSourceUrl('https://user:pass@2027-street-mandate.vercel.app/api/pulse', 'pulse').ok, 'userinfo rejected');
ok(!validateSourceUrl('https://evil.com/api/pulse', 'pulse').ok, 'host rejected');
ok(!validateSourceUrl('https://2027-street-mandate.vercel.app/api/pulse#x', 'pulse').ok, 'fragment rejected');
ok(validateSourceUrl('https://2027-street-mandate.vercel.app/api/civic-intelligence', 'intelligence').ok, 'intel path ok');
ok(!validateSourceUrl('https://2027-street-mandate.vercel.app/api/civic-intelligence/../admin', 'intelligence').ok, 'path trick rejected');
ok(buildMandatePublicUrl('abc').endsWith('/mandate/abc'), 'mandate url');

// Aggregate claims
const meta = { publishedCount: 24, statesRepresented: 3, lgasRepresented: 10, dutiesRepresented: 8 };
ok(assessAggregateClaim('There are 24 published records', meta).ok, 'matching count ok');
ok(!assessAggregateClaim('There are 999 published records', meta).ok, 'fabricated count rejected');
ok(!assessAggregateClaim('80% of Nigerians lack water', meta).ok, 'national stat rejected');
ok(!assessAggregateClaim('Published records increased by 40%', meta).ok, 'trend rejected');

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
ok(reg.aggregateMeta?.publishedCount === 24, 'aggregate meta stored');

function baseBrief(overrides = {}) {
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    executiveSummary: 'Summary',
    whatIsHappening: 'Happening',
    geographicScope: 'Kaduna',
    communityReports: [],
    officialEvidence: [],
    findings: [],
    possibleExplanations: [],
    institutionalResponsibilities: [],
    publicCommitments: [],
    verifiedImplementation: [],
    evidenceGaps: [],
    recommendations: [],
    sources: [{ id: 'model-fake', title: 'Fake', sourceType: 'independently_verified' }],
    limitations: 'limits',
    ...overrides,
  };
}

// Fabricated aggregate with genuine citation id
const fab = validateCivicBrief(
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
ok(fab.ok && fab.brief.findings[0].classification !== 'FACT', 'fabricated aggregate demoted');

// Matching aggregate
const good = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: 'There are 24 published records in the platform snapshot.',
        classification: 'FACT',
        citations: ['intelligence:snapshot'],
      },
    ],
  }),
  reg
);
ok(good.ok && good.brief.findings[0].classification === 'FACT', 'matching aggregate FACT ok');

// Indirect completion in publicCommitments scrubbed
const pc = validateCivicBrief(
  baseBrief({
    findings: [],
    publicCommitments: ['The ministry successfully delivered the clinic and the problem is resolved.'],
  }),
  reg
);
ok(pc.ok && pc.brief.publicCommitments[0].requiresHumanReview, 'commitment completion scrubbed');

// verifiedImplementation still hard-fails
const vi = validateCivicBrief(
  baseBrief({
    findings: [],
    verifiedImplementation: ['Construction finished and outcome independently verified.'],
  }),
  reg
);
ok(!vi.ok, 'verifiedImplementation completion rejected');

// Malformed citation
const mal = validateCivicBrief(
  baseBrief({
    findings: [{ text: 'Health Kaduna medicines', classification: 'FACT', citations: [123] }],
  }),
  reg
);
ok(mal.brief.findings[0].classification === 'UNKNOWN', 'malformed citation demoted');

// Partial registry: pulse only
const pulseOnly = buildTrustedRegistry(pulse, { error: 'down' });
ok(pulseOnly.unavailable.some((u) => u.channel === 'intelligence'), 'intel unavailable recorded');
ok(resolveTrustedCitation('mandate:rec1', pulseOnly).ok, 'pulse still usable');

ok(canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'model' }).ok === false, 'model cannot verify');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Institutional hardening adversarial checks passed.');
