const MAX_COMMUNITY_RECORDS = 25;
const MAX_OBSERVATIONS = 20;
const OBSERVATION_SOURCE_URL = 'https://2027-street-mandate.vercel.app/api/v1/community-observations';

function text(value, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function location(...values) {
  return values.map((value) => text(value, 100)).filter(Boolean).join(', ') || null;
}

/**
 * Build citation metadata only from server-retrieved, validated evidence bundles.
 * No model-generated source entry or source URL is ever accepted here.
 */
export function buildTrustedBriefSources({
  snapshot = null,
  evidenceMeta = null,
  communityRecordsBundle = null,
  observationBundle = null,
  inecBundle = null,
} = {}) {
  const sources = [];
  const add = (source) => {
    if (source && source.id && !sources.some((item) => item.id === source.id)) sources.push(source);
  };

  if (evidenceMeta?.ok === true && snapshot && !snapshot.error) {
    add({
      id: 'src-civic-mandate-aggregate',
      title: 'Civic Mandate published-record aggregate snapshot',
      publisher: 'Civic Mandate Nigeria',
      sourceType: 'platform_aggregate',
      sourceUrl: text(evidenceMeta.sourceUrl, 500) || 'https://2027-street-mandate.vercel.app/api/civic-intelligence',
      referenceDate: text(snapshot.generatedAt, 80) || null,
      geoCoverage: 'Nigeria; represented geography varies by published records',
      subjectCategory: 'Published community-demand aggregate',
      verificationStatus: 'unverified',
    });
  }

  if (communityRecordsBundle?.source === 'civic-mandate-community-records-v0.1' &&
      communityRecordsBundle.contractVersion === '0.1.0' &&
      !communityRecordsBundle.fallbackReason && Array.isArray(communityRecordsBundle.records)) {
    for (const record of communityRecordsBundle.records.slice(0, MAX_COMMUNITY_RECORDS)) {
      const id = text(record?.id, 200);
      if (!id) continue;
      add({
        id: 'src-community-record:' + encodeURIComponent(id),
        recordId: id,
        title: 'Civic Mandate published CommunityRecord ' + id,
        publisher: 'Civic Mandate Nigeria',
        sourceType: 'community_submission',
        sourceUrl: text(record.publicUrl, 500) || 'https://2027-street-mandate.vercel.app',
        referenceDate: text(record.publishedAt || record.created, 80) || null,
        geoCoverage: location(record.state, record.lga, record.ward),
        subjectCategory: text(record.duty || record.sector || record.issueCategory, 120) || 'Community demand',
        verificationStatus: text(record.verificationStatus, 60) || 'unverified',
        excerpt: text(record.sentence, 1200),
      });
    }
  }

  if (observationBundle?.status === 'ready' && Array.isArray(observationBundle.records)) {
    for (const record of observationBundle.records.slice(0, MAX_OBSERVATIONS)) {
      const id = text(record?.id, 200);
      if (!id) continue;
      add({
        id: 'src-community-observation:' + encodeURIComponent(id),
        recordId: id,
        title: 'Published community observation ' + (text(record.displayId, 80) || id),
        publisher: 'Civic Mandate Nigeria — Community Observations',
        sourceType: 'community_observation',
        sourceUrl: OBSERVATION_SOURCE_URL,
        referenceDate: text(record.publishedAt || record.observedOn, 80) || null,
        geoCoverage: location(record.state, record.lga, record.ward),
        subjectCategory: text(record.sector || record.reportType, 120) || 'Community observation',
        verificationStatus: text(record.verificationStatus, 60) || 'unverified',
        excerpt: text(record.description, 1200),
      });
    }
  }

  if ((inecBundle?.status === 'ready' || inecBundle?.status === 'partial') && Array.isArray(inecBundle.datasets)) {
    for (const dataset of inecBundle.datasets) {
      const id = text(dataset?.datasetId, 160);
      if (!id || !text(dataset.sourceUrl, 500).startsWith('https://')) continue;
      add({
        id: 'src-inec:' + id,
        title: text(dataset.title, 240) || 'INEC published dataset ' + id,
        publisher: text(dataset.publisher, 160) || 'Independent National Electoral Commission (INEC)',
        sourceType: 'official_source',
        sourceUrl: text(dataset.sourceUrl, 500),
        referenceDate: text(dataset.sourceReferenceDate, 80) || null,
        geoCoverage: text(inecBundle.stateFilter, 120) || 'Dataset-defined geography',
        subjectCategory: 'Voter registration and PVC administration',
        verificationStatus: 'official_source_transcription',
        excerpt: text(dataset.methodology, 1200),
      });
    }
  }

  return sources;
}

export function formatTrustedBriefSources(sources = []) {
  const safe = Array.isArray(sources) ? sources.map((source) => ({
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl || null,
    referenceDate: source.referenceDate || null,
    geoCoverage: source.geoCoverage || null,
    subjectCategory: source.subjectCategory || null,
    verificationStatus: source.verificationStatus || 'unknown',
  })) : [];
  return JSON.stringify(safe, null, 2);
}
