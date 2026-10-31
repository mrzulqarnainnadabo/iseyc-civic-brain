/**
 * Adversarial institutional hardening suite.
 */
import { validatePublicHttpsUrl, buildMandatePublicUrl } from '../lib/safe-fetch.js';
import { buildTrustedRegistry, resolveTrustedCitation } from '../lib/trusted-evidence-registry.js';
import { validateCivicBrief, BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { canAdvanceAccountability } from '../lib/accountability-states.js';

let failed = 0;
function ok(c, m) {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  } else console.log('OK:', m);
}

// --- URL safety ---
ok(validatePublicHttpsUrl('https://2027-street-mandate.vercel.app/api/pulse').ok, 'approved host https');
ok(!validatePublicHttpsUrl('http://2027-street-mandate.vercel.app/api/pulse').ok, 'http rejected');
ok(!validatePublicHttpsUrl('https://evil.example.com/x').ok, 'unapproved host rejected');
ok(!validatePublicHttpsUrl('not-a-url').ok, 'malformed rejected');
ok(buildMandatePublicUrl('abc123').includes('/mandate/abc123'), 'mandate url built');

// --- Registry ---
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
};
const snap = { publishedCount: 24, generatedAt: '2026-10-30T00:00:00.000Z', statesRepresented: 3 };
const reg = buildTrustedRegistry(pulse, snap);
ok(reg.sourceCount >= 2, 'registry has record + aggregate');
ok(resolveTrustedCitation('mandate:rec1', reg).ok, 'mandate:id resolves');
ok(resolveTrustedCitation('rec1', reg).ok, 'bare id resolves');
ok(!resolveTrustedCitation('invented-source', reg).ok, 'invented id rejected');
ok(!resolveTrustedCitation('mandate:unpublished', reg).ok, 'unpublished id rejected');

const emptyReg = buildTrustedRegistry({ records: [] }, null);
ok(emptyReg.empty, 'empty registry');

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

// Invented citation cannot support FACT
const inv = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: 'Primary health centre needs medicines in Kaduna South are documented in published records.',
        classification: 'FACT',
        citations: ['model-fake'],
      },
    ],
  }),
  reg
);
ok(inv.ok, 'structurally ok after demotion');
ok(inv.brief.findings[0].classification !== 'FACT', 'invented citation demotes FACT');
ok(inv.brief.sources.every((s) => s.serverOwned), 'output sources are server-owned');
ok(!inv.brief.sources.some((s) => s.id === 'model-fake'), 'model source stripped');

// Valid related citation can remain FACT
const valid = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: 'Primary health centre needs medicines in Kaduna South',
        classification: 'FACT',
        citations: ['mandate:rec1'],
      },
    ],
  }),
  reg
);
ok(valid.ok && valid.brief.findings[0].classification === 'FACT', 'valid related FACT retained');
ok(valid.brief.findings[0].claimRelevance.independentlyVerified === false, 'never independently verified');

// Empty registry blocks FACT
const emptyF = validateCivicBrief(
  baseBrief({
    findings: [{ text: 'Something', classification: 'FACT', citations: ['mandate:rec1'] }],
  }),
  emptyReg
);
ok(emptyF.brief.findings[0].classification === 'UNKNOWN', 'empty registry demotes FACT');

// Prevalence
const prev = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: '80% of Nigerians lack water',
        classification: 'FACT',
        citations: ['mandate:rec1'],
      },
    ],
  }),
  reg
);
ok(prev.brief.findings[0].classification === 'UNKNOWN', 'prevalence demoted');

// Completion via community
const done = validateCivicBrief(
  baseBrief({
    findings: [
      {
        text: 'The clinic problem is resolved and fully implemented.',
        classification: 'FACT',
        citations: ['mandate:rec1'],
      },
    ],
  }),
  reg
);
ok(done.brief.findings[0].classification === 'UNKNOWN', 'completion via community demoted');

// Model sets verified responsibility
const ir = validateCivicBrief(
  baseBrief({
    findings: [],
    institutionalResponsibilities: [
      { institution: 'X', verificationStatus: 'independently_verified' },
    ],
  }),
  reg
);
ok(ir.brief.institutionalResponsibilities[0].verificationStatus === 'unverified', 'AI verification demoted');

// verifiedImplementation completion errors
const vi = validateCivicBrief(
  baseBrief({
    findings: [],
    verifiedImplementation: ['The road was successfully delivered and resolved.'],
  }),
  reg
);
ok(!vi.ok, 'verifiedImplementation completion rejected');

// Accountability
ok(
  canAdvanceAccountability('record_published', 'outcome_independently_verified', { actorRole: 'model' }).ok === false,
  'model cannot independently verify'
);
ok(
  canAdvanceAccountability('record_published', 'referral_approved_or_sent', {
    actorRole: 'model',
  }).ok === false,
  'model cannot mark referral sent'
);

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Institutional hardening adversarial checks passed.');
