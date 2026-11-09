import assert from 'node:assert/strict';
import { validateCivicBrief, BRIEF_SCHEMA_VERSION } from '../lib/civic-brief-engine.js';
import { buildTrustedBriefSources, formatTrustedBriefSources } from '../lib/trusted-brief-sources.js';
import { assessCitationRelevance, applyRelevanceToFindings } from '../lib/citation-relevance.js';

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
  recordId: 'cr-001',
  excerpt: 'A published health record exists in Kaduna.',
}];

function brief(overrides = {}) {
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    executiveSummary: 'A published health record exists in Kaduna.',
    whatIsHappening: 'One published community record describes a health concern.',
    geographicScope: 'Kaduna, Kaduna South',
    limitations: 'This is a published community report, not a prevalence estimate.',
    communityReports: [{ classification: 'COMMUNITY_REPORT', sourceId: 'src-community-record:cr-001', recordId: 'cr-001', text: 'MODEL-FABRICATED REPORT TEXT' }],
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
assert.equal(valid.brief.communityReports[0].text, trusted[0].excerpt);
assert.notEqual(valid.brief.communityReports[0].text, 'MODEL-FABRICATED REPORT TEXT');
const plausible = assessCitationRelevance(
  { text: 'Health community record in Kaduna' },
  { title: 'Civic Mandate Health record', publisher: 'Civic Mandate Nigeria', geoCoverage: 'Kaduna', subjectCategory: 'Health' },
);
const reviewed = applyRelevanceToFindings({
  sources: [{ id: 'src', title: 'Civic Mandate Health record', publisher: 'Civic Mandate Nigeria', geoCoverage: 'Kaduna', subjectCategory: 'Health' }],
  findings: [{ text: 'Health community record in Kaduna', classification: 'FACT', citations: ['src'] }],
});
assert.ok(plausible.related);
assert.equal(reviewed.brief.findings[0].claimRelevance.requiresHumanReview, true);

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

const trustedOfficial = {
  id: 'src-inec:2023-pvc',
  title: 'INEC 2023 PVC collection transcription',
  publisher: 'Independent National Electoral Commission (INEC)',
  sourceType: 'official_source',
  sourceUrl: 'https://www.inecnigeria.org/report.pdf',
  referenceDate: '2023-02-05',
  geoCoverage: 'Nigeria',
  subjectCategory: 'PVC collection',
  verificationStatus: 'official_source_transcription',
  excerpt: 'Official dataset methodology from the server bundle.',
};
const officialValid = validateCivicBrief(brief({
  sources: [
    { id: trusted[0].id, title: 'Fake community source title', sourceType: 'independently_verified' },
    { id: trustedOfficial.id, title: 'Fake INEC source title', sourceType: 'independently_verified' },
  ],
  officialEvidence: [{ sourceId: trustedOfficial.id, title: 'Fake title', text: 'Model-authored official evidence.' }],
}), [...trusted, trustedOfficial]);
assert.equal(officialValid.ok, true, JSON.stringify(officialValid.errors));
assert.equal(officialValid.brief.officialEvidence[0].title, trustedOfficial.title);
assert.equal(officialValid.brief.officialEvidence[0].summary, trustedOfficial.excerpt);
assert.equal('text' in officialValid.brief.officialEvidence[0], false);

const unlistedCitation = validateCivicBrief(brief({
  sources: [],
  findings: [{
    text: 'A claim cites a trusted ID not declared in sources.',
    classification: 'FACT',
    citations: ['src-community-record:cr-001'],
  }],
}), trusted);
assert.equal(unlistedCitation.ok, false);
assert.ok(unlistedCitation.errors.some((error) => error.includes('unknown_or_untrusted_citation')));

const inventedImplementation = validateCivicBrief(brief({
  verifiedImplementation: [{ text: 'A project is now operational.' }],
}), trusted);
assert.equal(inventedImplementation.ok, false);
assert.ok(inventedImplementation.errors.includes('verified_implementation_without_independent_source'));

const forgedIndependent = validateCivicBrief(brief({
  findings: [{
    text: 'The programme was successfully delivered.',
    classification: 'FACT',
    citations: ['src-community-record:cr-001'],
  }],
}), trusted);
assert.equal(forgedIndependent.ok, false);
assert.ok(forgedIndependent.errors.some((error) => error.includes('completion_claim_without_independent_source')));

const fabricatedOfficial = validateCivicBrief(brief({
  officialEvidence: [{ sourceId: 'src-invented-official', title: 'Fake INEC report', text: 'A false official claim.' }],
}), trusted);
assert.equal(fabricatedOfficial.ok, false);
assert.ok(fabricatedOfficial.errors.some((error) => error.includes('official_evidence_untrusted_source')));

const fabricatedCommitment = validateCivicBrief(brief({
  publicCommitments: [{ text: 'The ministry committed to deliver next month.' }],
}), trusted);
assert.equal(fabricatedCommitment.ok, false);
assert.ok(fabricatedCommitment.errors.includes('public_commitments_require_dedicated_trusted_source'));

const claimedResponsibility = validateCivicBrief(brief({
  institutionalResponsibilities: [{ institution: 'Ministry', verificationStatus: 'verified', legalOrAdminSource: 'Model says so' }],
}), trusted);
assert.equal(claimedResponsibility.ok, false);
assert.ok(claimedResponsibility.errors.some((error) => error.includes('model_cannot_verify_institutional_responsibility')));

const missingAllowlist = validateCivicBrief(brief());
assert.equal(missingAllowlist.ok, false);
assert.ok(missingAllowlist.errors.includes('trusted_source_allowlist_missing'));

const bundles = buildTrustedBriefSources({
  snapshot: { generatedAt: '2026-11-06T10:00:00.000Z' },
  evidenceMeta: { ok: true, sourceUrl: 'https://2027-street-mandate.vercel.app/api/civic-intelligence' },
  communityRecordsBundle: {
    source: 'civic-mandate-community-records-v0.1',
    contractVersion: '0.1.0',
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
const rejectedOfficial = buildTrustedBriefSources({
  inecBundle: {
    status: 'ready',
    datasets: [{ datasetId: 'fake', title: 'Fake publisher data', publisher: 'Unknown publisher', sourceUrl: 'https://not-inec.example/report.pdf' }],
  },
});
assert.equal(rejectedOfficial.length, 0);
assert.equal(bundles.find((source) => source.id === 'src-community-observation:obs-1').sourceUrl, 'https://2027-street-mandate.vercel.app/api/v1/community-observations');
assert.equal(bundles.some((source) => source.independentVerification === true), false);
const legacyPulseSources = buildTrustedBriefSources({
  communityRecordsBundle: { source: 'civic-mandate-pulse-published-only', fallbackReason: 'community_record_http_503', records: [{ id: 'legacy-1', sentence: 'Legacy fallback record' }] },
});
assert.equal(legacyPulseSources.some((source) => source.recordId === 'legacy-1'), false);
assert.ok(formatTrustedBriefSources(bundles).includes('src-inec:2023-pvc'));

const nationalSources = buildTrustedBriefSources({
  nationalSnapshotsBundle: {
    status: 'ready',
    observations: [{
      id: 'who-nga-under5-mortality-2024',
      title: 'Under-five mortality rate',
      value: 59.5,
      unit: 'deaths per 1,000 live births',
      referencePeriod: '2024',
      measurementType: 'WHO estimate',
      geographicCoverage: 'Nigeria',
      sourceId: 'who-gho-nigeria',
      sourceType: 'official_source',
      sourcePublisher: 'WHO Regional Office for Africa',
      sourceUrl: 'https://www.afro.who.int/node/992',
      departments: ['health'],
      interpretation: 'National estimate only.',
      limitations: ['Not a Kaduna South or facility measure.'],
    },
    {
      id: 'fme-asc-kaduna-learner-teacher-ratio-2024-25',
      title: 'Kaduna State learner–teacher ratio',
      value: 51.3,
      unit: 'learners per teacher',
      referencePeriod: '2024/2025',
      sourceUpdateDate: '2026-07-18',
      measurementType: 'Annual School Census administrative ratio',
      geographicCoverage: 'Kaduna State',
      sourceId: 'fme-education-emis-asc-2024-25',
      sourceType: 'official_source',
      sourcePublisher: 'Federal Ministry of Education — Digital Nigeria EMIS',
      sourceUrl: 'https://emis.education.gov.ng/portal/',
      departments: ['education'],
      interpretation: 'State-level administrative data only.',
      limitations: ['Not a Kaduna South or individual-school measure.'],
    }],
  },
});
const whoSource = nationalSources.find((source) => source.id === 'src-national-snapshot:who-nga-under5-mortality-2024');
assert.ok(whoSource, 'national snapshot must enter the server-owned source allowlist');
assert.equal(whoSource.sourceType, 'official_source');
assert.equal(whoSource.referenceDate, '2024');
assert.ok(whoSource.excerpt.includes('59.5 deaths per 1,000 live births'));
const fmeSource = nationalSources.find((source) => source.id === 'src-national-snapshot:fme-asc-kaduna-learner-teacher-ratio-2024-25');
assert.ok(fmeSource);
assert.equal(fmeSource.referenceDate, '2024/2025');
assert.equal(fmeSource.sourceUpdateDate, '2026-07-18');
const nationalBrief = validateCivicBrief(brief({
  communityReports: [],
  sources: [{ id: whoSource.id, title: 'Model-authored title', sourceType: 'fake' }],
  officialEvidence: [{ sourceId: whoSource.id, title: 'Model-authored evidence' }],
  findings: [{
    text: 'WHO reports a national under-five mortality estimate for 2024.',
    classification: 'FACT',
    citations: [whoSource.id],
  }],
}), nationalSources);
assert.equal(nationalBrief.ok, true, JSON.stringify(nationalBrief.errors));
assert.equal(nationalBrief.brief.officialEvidence[0].title, whoSource.title);
assert.ok(nationalBrief.brief.officialEvidence[0].summary.includes('59.5 deaths per 1,000 live births'));

import { validateChatBody } from '../lib/request-validate.js';
const structuredRequest = validateChatBody({ format: 'civic_brief_v1', messages: [{ role: 'user', content: 'What is published for Kaduna?' }] });
assert.equal(structuredRequest.ok, true);
assert.equal(structuredRequest.value.format, 'civic_brief_v1');
const unsupportedFormat = validateChatBody({ format: 'untrusted_mode', messages: [{ role: 'user', content: 'Hello' }] });
assert.equal(unsupportedFormat.ok, false);

import { readFileSync } from 'node:fs';
const chatSource = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
assert.ok(chatSource.includes('validateCivicBrief(parsed, trustedSources)'));
assert.ok(chatSource.includes('buildTrustedBriefSources'));
assert.ok(chatSource.includes('!briefMode || canonicalCommunityRecordsAvailable'));

console.log('Trusted Civic Brief source allowlist checks passed.');
