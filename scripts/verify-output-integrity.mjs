import { BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { buildTrustedRegistry } from '../lib/trusted-evidence-registry.js';
import { assessAggregateClaim } from '../lib/aggregate-claims.js';
import {
  buildStructuredBriefResponse,
  buildNarrativeResponse,
} from '../lib/civic-brief-response.js';
import { renderValidatedBriefMarkdown } from '../lib/render-validated-brief.js';

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

ok(
  assessAggregateClaim('There are 24 published records across 3 states and 10 LGAs.', meta).ok,
  'correct multi-metric'
);
ok(
  !assessAggregateClaim(
    'There are 24 published records across 3 states and 10 LGAs and 999 additional reports.',
    meta
  ).ok,
  'extra 999 rejected'
);
ok(
  !assessAggregateClaim(
    'There are 24 published records across 3 states and 10 LGAs plus 1500 cases.',
    meta
  ).ok,
  'extra 1500 rejected'
);
ok(
  !assessAggregateClaim('There are 24 published records and 30 published records.', meta).ok,
  'conflicting published counts'
);
ok(
  !assessAggregateClaim('Snapshot 2026-10-30 shows 24 published records and 50 clinics.', meta).ok,
  'date ok but unbound 50 rejected'
);
ok(
  assessAggregateClaim('There are 24 published records and about 3.5 share.', meta).ok,
  'decimal masked with correct pairs'
);
ok(
  assessAggregateClaim('Across 3 states and 10 LGAs there are 24 published records.', meta).ok,
  'order variation'
);
ok(!assessAggregateClaim('There are 24 published records', null).ok, 'missing meta');
ok(assessAggregateClaim('There are three states represented', meta).ok, 'word three states');
ok(
  !assessAggregateClaim('There are thousand published records', meta).ok,
  'unsupported word thousand records'
);

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
};
const reg = buildTrustedRegistry(pulse, snap);
const emptyReg = buildTrustedRegistry({ error: 'down', records: [] }, { error: 'down' });

const malicious = JSON.stringify({
  schemaVersion: BRIEF_SCHEMA_VERSION,
  executiveSummary: 'The ministry successfully delivered the clinic and the problem is resolved.',
  whatIsHappening: 'There are 999 published records nationwide.',
  geographicScope: 'Nigeria',
  communityReports: [{ text: 'The referral was accepted by the ministry.' }],
  officialEvidence: ['Government confirmed receipt of all complaints.'],
  findings: [
    {
      text: 'SECRET_LEAK_TOKEN_XYZ proves 999 published records.',
      classification: 'FACT',
      citations: ['model-invented-source'],
    },
  ],
  possibleExplanations: [],
  institutionalResponsibilities: [
    { text: 'Agency X', verificationStatus: 'independently_verified' },
  ],
  publicCommitments: ['Successfully delivered water to all wards.'],
  verifiedImplementation: ['Outcome independently verified by the model.'],
  evidenceGaps: [],
  recommendations: ['Refer to state ministry for human review.'],
  sources: [{ id: 'model-invented-source', title: 'Fake', sourceType: 'independently_verified' }],
  limitations: 'none',
});

const api = buildStructuredBriefResponse(malicious, reg, 'test question', {
  aggregateAvailable: true,
  recordsAvailable: true,
});
ok(api.briefValid, 'structured response validates');
ok(api.format === 'civic_brief_v1', 'format civic_brief_v1');
ok(!api.content[0].text.trim().startsWith('{'), 'content not raw JSON');
ok(api.content[0].text === renderValidatedBriefMarkdown(api.brief), 'content equals renderer');
ok(!api.content[0].text.includes('model-invented-source'), 'no invented source in content');
ok(!api.content[0].text.includes('SECRET_LEAK_TOKEN_XYZ') || /Unverified/i.test(api.content[0].text), 'leak not as fact');
ok(/Unverified/i.test(api.content[0].text), 'unverified language present');
ok(
  api.brief.communityReports[0].displayText && /Unverified/i.test(api.brief.communityReports[0].displayText),
  'list displayText preserved'
);
ok(
  api.brief.publicCommitments[0].displayText && /Unverified/i.test(api.brief.publicCommitments[0].displayText),
  'commitments displayText'
);
ok(api.brief.verifiedImplementation[0].independentlyVerified === false, 'impl not verified');
ok(/Coverage limitation|pilot/i.test(api.content[0].text), 'national scope limited');

const emptyApi = buildStructuredBriefResponse(malicious, emptyReg, 'q', {
  aggregateAvailable: false,
  recordsAvailable: false,
});
ok(emptyApi.briefValid || emptyApi.format === 'narrative_fallback', 'empty registry handled');
if (emptyApi.briefValid) {
  ok(
    emptyApi.brief.findings.every((f) => f.classification !== 'FACT'),
    'no bare FACT without registry'
  );
}

const narr = buildNarrativeResponse(
  'The clinic was fully implemented. There are 999 published records.',
  meta
);
ok(narr.evidencePolicyApplied, 'narrative policy');
ok(/unverified/i.test(narr.content[0].text), 'narrative neutralized');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Output integrity checks passed.');
