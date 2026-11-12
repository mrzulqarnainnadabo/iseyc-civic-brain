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
const observatorySnapshotSources = buildTrustedBriefSources({
  observatorySnapshotsBundle: {
    status: 'ready',
    records: [{
      id: 'who-nigeria-health-2021-23',
      title: 'WHO · Nigeria health indicators',
      publisher: 'World Health Organization',
      sourceId: 'who-gho-nigeria',
      sourceUrl: 'https://www.who.int/data/gho/data/countries/country-details/GHO/nigeria',
      referencePeriod: 'Indicator-specific · 2021–2023',
      geography: { level: 'national', label: 'Nigeria' },
      evidenceType: 'WHO country profile · indicator-specific estimates and reported series',
      metrics: [{ label: 'Under-five mortality', value: '108.1', unit: 'per 1,000 live births', period: '2022', interval: '77.5–153.8', measurementType: 'estimated' }],
      limitations: ['WHO statistical estimates; preserve uncertainty intervals and reference periods.'],
      interpretation: 'National context only.',
    }],
  },
});
assert.equal(observatorySnapshotSources.length, 1);
assert.equal(observatorySnapshotSources[0].id, 'src-observatory-snapshot:who-nigeria-health-2021-23');
assert.equal(observatorySnapshotSources[0].sourceType, 'official_source');
assert.match(observatorySnapshotSources[0].excerpt, /77.5–153.8/);
assert.match(observatorySnapshotSources[0].excerpt, /measurement: estimated/);
const isnSnapshotSource = buildTrustedBriefSources({
  observatorySnapshotsBundle: {
    status: 'ready',
    records: [{
      id: 'isn-innovation-hub-assessment-2026',
      title: 'ISN · Nigerian Innovation Hub Assessment',
      publisher: 'Innovation Support Network (ISN)',
      sourceId: 'isn-hub-assessment-2026',
      sourceUrl: 'https://isnhubs.org.ng/nigerias-innovation-landmark-isn-launches-comprehensive-hub-assessment-report-and-unveils-2026-2030-strategic-outlook/',
      referencePeriod: 'Summary released 22 May 2026',
      geography: { level: 'national', label: 'Nigeria' },
      evidenceType: 'Industry ecosystem assessment summary',
      metrics: [{ label: 'Hubs offering structured training', value: '90%', unit: 'of respondents', period: '2026 summary', measurementType: 'survey respondent share' }],
      limitations: ['Geographic percentages are respondent shares, not a national census.'],
      interpretation: 'Survey summary only.',
    }],
  },
});
assert.equal(isnSnapshotSource.length, 1);
assert.equal(isnSnapshotSource[0].id, 'src-observatory-snapshot:isn-innovation-hub-assessment-2026');
assert.match(isnSnapshotSource[0].excerpt, /survey respondent share/);

const worldBankSnapshotSource = buildTrustedBriefSources({
  observatorySnapshotsBundle: {
    status: 'ready',
    records: [{
      id: 'worldbank-ndu-2026-10',
      title: 'World Bank Development Update',
      publisher: 'World Bank',
      sourceId: 'worldbank-ndu-2026-10',
      sourceUrl: 'https://www.worldbank.org/en/publication/global-economic-prospects',
      referencePeriod: 'October 2026',
      geography: { level: 'national', label: 'Nigeria' },
      evidenceType: 'World Bank publication transcription',
      metrics: [{ label: 'Foreign reserves', value: '12.3', unit: 'USD billion', period: 'October 2026', measurementType: 'published estimate' }],
      limitations: ['Published estimate; retain the source period and methodology.'],
      interpretation: 'National context only.',
    }],
  },
});
assert.equal(worldBankSnapshotSource.length, 1);
assert.equal(worldBankSnapshotSource[0].id, 'src-observatory-snapshot:worldbank-ndu-2026-10');
assert.equal(worldBankSnapshotSource[0].sourceUrl, 'https://www.worldbank.org/en/publication/global-economic-prospects');
assert.match(worldBankSnapshotSource[0].excerpt, /published estimate/);

const nationalObservationSources = buildTrustedBriefSources({
  nationalSnapshotsBundle: {
    status: 'ready',
    observations: [{
      id: 'budgit-h1-2026-health-total-report',
      title: 'Combined state health expenditure · updated report',
      value: 621.34,
      unit: '₦ billion',
      referencePeriod: 'H1 2026 (through Q2)',
      measurementType: 'Actual health expenditure reported in detailed subnational review',
      geographicCoverage: '34 of 36 states; Rivers and Osun excluded',
      sourceId: 'budgit-subnational-health-h1-2026-report',
      sourceType: 'published_research',
      sourcePublisher: 'BudgIT Foundation · Nigeria’s Subnational Health Expenditure Report, H1 2026',
      sourceUrl: 'https://budgit.org/post_publications/nigerias-subnational-health-expenditure-report-h1-2026/',
      departments: ['health', 'civic'],
      interpretation: 'Combined state health outturn.',
      limitations: ['Rivers and Osun are excluded.', 'Spending is not proof of PHC functionality.'],
    }, {
      id: 'abia-2026-approved-budget-total',
      title: 'Abia State approved 2026 budget',
      value: 1016.22807265199,
      unit: '₦ billion',
      referencePeriod: '2026 approved appropriation',
      measurementType: 'Official government-reported appropriation headline',
      geographicCoverage: 'Abia State',
      sourceId: 'state-budget-abia',
      sourceType: 'official_source',
      sourcePublisher: 'Abia State Government',
      sourceUrl: 'https://abiastate.gov.ng/gov-otti-signs-2026-appropriation-bill-into-law/',
      departments: ['civic'],
      interpretation: 'Official appropriation headline only.',
      limitations: ['Detailed schedule not transcribed.'],
    }, {
      id: 'anambra-2026-q3-total-revenue',
      title: 'Anambra total revenue including opening balance · Q3 2026',
      value: 300.80226147912,
      unit: '₦ billion',
      referencePeriod: '1 Jan–30 Sep 2026',
      measurementType: 'Actual revenue including opening balance',
      geographicCoverage: 'Anambra State',
      sourceId: 'state-budget-anambra',
      sourceType: 'official_source',
      sourcePublisher: 'Anambra State Government — Office of the Accountant General / Open Finance',
      sourceUrl: 'https://smart.anambrastate.gov.ng/open-finance',
      departments: ['civic'],
      interpretation: 'Official state BIR summary.',
      limitations: ['Revenue receipt does not establish service delivery.'],
    }],
  },
});
assert.equal(nationalObservationSources.length, 3);
assert.ok(nationalObservationSources.some((source) => source.id === 'src-observatory-national-observation:budgit-h1-2026-health-total-report' && source.sourceType === 'published_research'));
assert.ok(nationalObservationSources.some((source) => source.id === 'src-observatory-national-observation:abia-2026-approved-budget-total' && source.sourceType === 'official_source'));
assert.ok(nationalObservationSources.some((source) => source.id === 'src-observatory-national-observation:anambra-2026-q3-total-revenue' && source.sourceType === 'official_source'));
assert.match(nationalObservationSources[0].excerpt, /621.34 ₦ billion/);

const untrustedSnapshotSource = buildTrustedBriefSources({
  observatorySnapshotsBundle: {
    status: 'ready',
    records: [{
      id: 'fake', title: 'Fake', publisher: 'Fake publisher', sourceUrl: 'https://attacker.example/fake',
      referencePeriod: '2026', geography: { level: 'national', label: 'Nigeria' },
      evidenceType: 'fake', metrics: [{ label: 'Fake', value: '999', unit: 'people', period: '2026' }],
      limitations: ['Untrusted'], interpretation: 'Untrusted',
    }],
  },
});
assert.equal(untrustedSnapshotSource.length, 0);

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
assert.ok(chatSource.includes('fetchObservatorySnapshots'));
assert.ok(chatSource.includes('fetchNationalSnapshots'));
assert.ok(chatSource.includes('nationalSnapshotsBundle'));
assert.ok(chatSource.includes('observatorySnapshotsBundle'));
assert.ok(chatSource.includes('CURATED NATIONAL SOURCE SNAPSHOTS'));
assert.ok(chatSource.includes('!briefMode || canonicalCommunityRecordsAvailable'));

console.log('Trusted Civic Brief source allowlist checks passed.');
