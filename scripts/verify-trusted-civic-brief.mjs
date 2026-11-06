import assert from 'node:assert/strict';
import { validateCivicBrief, BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { buildTrustedBriefSources, formatTrustedBriefSources } from '../lib/trusted-brief-sources.js';

const trusted = [{
  id: 'src-community-record:cr-001',
  title: 'Server-owned Civic Mandate record cr-001',
  publisher: 'Civic Mandate Nigeria',
  sourceType: 'community_submission',
  sourceUrl: 'https://2027-street-mandate.vercel.app/mandate/cr-001',
  referenceDate: '2026-10-01',
  geoCoverage: 'Kaduna, Kaduna South',
  subjectCategory: 'Health',
  verificationStatus: 'unverified',
}];

function brief(overrides = {}) {
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    executiveSummary: 'A published health record exists in Kaduna.',
    whatIsHappening: 'One published community record describes a health concern.',
    geographicScope: 'Kaduna, Kaduna South',
    limitations: 'This is a published community report, not a prevalence estimate.',
    communityReports: [{ classification: 'COMMUNITY_REPORT', recordId: 'cr-001' }],
    officialEvidence: [],
    findings: [{
      text: 'A published Health community record describes a concern in Kaduna.',
      classification: 'FACT',
      citations: ['src-community-record:cr-001'],
    }],
    possibleExplanations: [],
    institutionalResponsibilities: [],
    publicCommitments: [],
    verifiedImplementation: [],
    evidenceGaps: ['No independent outcome verification is available.'],
    recommendations: [],
    sources: [{
      id: 'src-community-record:cr-001',
      title: 'MODEL-FABRICATED TITLE',
      publisher: 'Invented publisher',
      sourceType: 'independently_verified',
      sourceUrl: 'https://attacker.example/fake-source',
      verificationStatus: 'verified',
    }],
    ...overrides,
  };
}

const valid = validateCivicBrief(brief(), trusted);
assert.equal(valid.ok, true, JSON.stringify(valid.errors));
assert.equal(valid.brief.sources[0].title, trusted[0].title);
assert.equal(valid.brief.sources[0].publisher, trusted[0].publisher);
assert.equal(valid.brief.sources[0].sourceType, 'community_submission');
assert.equal(valid.brief.sources[0].sourceUrl, trusted[0].sourceUrl);
assert.equal(valid.brief.sources[0].independentVerification, false);

const invented = validateCivicBrief(brief({
  sources: [{
    id: 'src-model-invented',
    title: 'Invented official report',
    publisher: 'Invented publisher',
    sourceType: 'independently_verified',
  }],
  findings: [{
    text: 'The project was fully implemented and resolved.',
    classification: 'FACT',
    citations: ['src-model-invented'],
  }],
}), trusted);
assert.equal(invented.ok, false);
assert.ok(invented.errors.some((error) => error.includes('untrusted_source_id')));
assert.ok(invented.errors.some((error) => error.includes('unknown_or_untrusted_citation')));
assert.ok(invented.errors.some((error) => error.includes('completion_claim_without_independent_source')));

const forgedIndependent = validateCivicBrief(brief({
  findings: [{
    text: 'The programme was successfully delivered.',
    classification: 'FACT',
    citations: ['src-community-record:cr-001'],
  }],
}), trusted);
assert.equal(forgedIndependent.ok, false);
assert.ok(forgedIndependent.errors.some((error) => error.includes('completion_claim_without_independent_source')));

const missingAllowlist = validateCivicBrief(brief());
assert.equal(missingAllowlist.ok, false);
assert.ok(missingAllowlist.errors.includes('trusted_source_allowlist_missing'));

const bundles = buildTrustedBriefSources({
  snapshot: { generatedAt: '2026-11-06T10:00:00.000Z' },
  evidenceMeta: { ok: true, sourceUrl: 'https://2027-street-mandate.vercel.app/api/civic-intelligence' },
  communityRecordsBundle: {
    source: 'civic-mandate-community-records-v0.1',
    records: [{ id: 'cr-001', sentence: 'PHC medicine access', duty: 'Health', state: 'Kaduna', lga: 'Kaduna South', verificationStatus: 'unverified', publicUrl: 'https://2027-street-mandate.vercel.app/mandate/cr-001' }],
  },
  observationBundle: {
    status: 'ready',
    records: [{ id: 'obs-1', title: 'Facility staffing', description: 'Observed staffing gap', sector: 'Health', state: 'Kaduna', evidenceLink: 'https://untrusted.example/evidence' }],
  },
  inecBundle: {
    status: 'ready',
    datasets: [{ datasetId: '2023-pvc', title: 'INEC 2023 PVC snapshot', publisher: 'Independent National Electoral Commission (INEC)', sourceUrl: 'https://www.inecnigeria.org/report.pdf', sourceReferenceDate: '2023-02-05' }],
  },
});
assert.ok(bundles.some((source) => source.id === 'src-civic-mandate-aggregate'));
assert.ok(bundles.some((source) => source.id === 'src-community-record:cr-001'));
assert.ok(bundles.some((source) => source.id === 'src-community-observation:obs-1'));
assert.ok(bundles.some((source) => source.id === 'src-inec:2023-pvc'));
assert.equal(bundles.find((source) => source.id === 'src-community-observation:obs-1').sourceUrl, 'https://2027-street-mandate.vercel.app/api/v1/community-observations');
assert.equal(bundles.some((source) => source.independentVerification === true), false);
assert.ok(formatTrustedBriefSources(bundles).includes('src-inec:2023-pvc'));

console.log('Trusted Civic Brief source allowlist checks passed.');
