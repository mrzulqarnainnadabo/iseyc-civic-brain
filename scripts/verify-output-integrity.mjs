/**
 * API-level output integrity: no raw model leakage; metric binding; narrative neutralize.
 */
import { validateCivicBrief, BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { renderValidatedBriefMarkdown } from '../lib/render-validated-brief.js';
import { buildTrustedRegistry } from '../lib/trusted-evidence-registry.js';
import { assessAggregateClaim, extractMetricPairs } from '../lib/aggregate-claims.js';
import { applyNarrativeEvidencePolicy } from '../lib/claim-policy.js';

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

// Multi-metric correct
ok(
  assessAggregateClaim('There are 24 published records across 3 states and 10 LGAs.', meta).ok,
  'multi-metric correct sentence'
);
// One wrong
ok(
  !assessAggregateClaim('There are 25 published records across 3 states and 10 LGAs.', meta).ok,
  'multi-metric one wrong'
);
// Different order
ok(
  assessAggregateClaim('Across 3 states and 10 LGAs there are 24 published records.', meta).ok,
  'metric order variation'
);
// Unbound number near metrics
ok(
  !assessAggregateClaim('Published records total something like 15 in the pilot.', meta).ok,
  'unbound number rejected'
);
// Dates ignored
ok(assessAggregateClaim('Snapshot generated 2026-10-30 with 24 published records.', meta).ok, 'date + correct count');

const pairs = extractMetricPairs('24 published records across 3 states and 10 LGAs');
ok(pairs.some((p) => p.key === 'publishedCount' && p.value === 24), 'pair published');
ok(pairs.some((p) => p.key === 'statesRepresented' && p.value === 3), 'pair states');
ok(pairs.some((p) => p.key === 'lgasRepresented' && p.value === 10), 'pair lgas');

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
const snap = { publishedCount: 24, statesRepresented: 3, lgasRepresented: 10, dutiesRepresented: 8 };
const reg = buildTrustedRegistry(pulse, snap);

// Malicious provider payload with secret + bad claims
const maliciousRaw = JSON.stringify({
  schemaVersion: BRIEF_SCHEMA_VERSION,
  executiveSummary: 'The ministry successfully delivered the clinic and the problem is resolved.',
  whatIsHappening: 'There are 999 published records nationwide.',
  geographicScope: 'Nigeria',
  communityReports: [],
  officialEvidence: [],
  findings: [
    {
      text: 'SECRET_LEAK_TOKEN_XYZ and 999 published records prove national success.',
      classification: 'FACT',
      citations: ['model-invented-source'],
    },
  ],
  possibleExplanations: [],
  institutionalResponsibilities: [],
  publicCommitments: [],
  verifiedImplementation: ['Outcome independently verified by the model.'],
  evidenceGaps: [],
  recommendations: [],
  sources: [{ id: 'model-invented-source', title: 'Fake', sourceType: 'independently_verified' }],
  limitations: 'none',
});

const parsed = JSON.parse(maliciousRaw);
const validated = validateCivicBrief(parsed, reg);
ok(validated.ok, 'structure still validates after demotion');
const md = renderValidatedBriefMarkdown(validated.brief);

ok(!md.includes('SECRET_LEAK_TOKEN_XYZ') || md.includes('Unverified'), 'leak token not presented as fact');
ok(!md.includes('model-invented-source'), 'invented source id not in user markdown');
ok(!/independently verified by the model/i.test(md) || /Unverified/i.test(md), 'model verification not asserted');
ok(md.includes('server-validated') || md.includes('Integrity note'), 'integrity note present');
ok(
  validated.brief.sources.every((s) => s.serverOwned),
  'brief.sources server-owned only'
);

// Simulate API contract: content.text must equal renderer, not raw
const apiContentText = renderValidatedBriefMarkdown(validated.brief);
ok(apiContentText !== maliciousRaw, 'content.text is not raw provider JSON');
ok(!apiContentText.trim().startsWith('{'), 'content.text is not JSON object');

// Narrative neutralization removes claim as established fact
const narr = applyNarrativeEvidencePolicy(
  'The clinic was fully implemented. There are 999 published records.',
  meta
);
ok(narr.policyApplied, 'narrative policy applied');
ok(/unverified/i.test(narr.text), 'narrative replaces with unverified');
ok(!/fully implemented\. There are 999/.test(narr.text), 'raw false pair not left intact');

if (failed) {
  console.error(failed + ' failure(s)');
  process.exit(1);
}
console.log('Output integrity checks passed.');
