/**
 * Server-owned trusted evidence registry.
 */
import { buildMandatePublicUrl } from './safe-fetch.js';

export const REGISTRY_SCHEMA = 'trusted-evidence-v1';

export function buildTrustedRegistry(pulse, intelligenceSnap) {
  const sources = [];
  const byId = new Map();
  const unavailable = [];

  if (!pulse || pulse.error) {
    unavailable.push({ channel: 'pulse', reason: pulse?.error || 'missing' });
  }
  if (!intelligenceSnap || intelligenceSnap.error) {
    unavailable.push({ channel: 'intelligence', reason: intelligenceSnap?.error || 'missing' });
  }

  let aggregateMeta = null;
  if (intelligenceSnap && !intelligenceSnap.error && intelligenceSnap.publishedCount != null) {
    aggregateMeta = {
      publishedCount: intelligenceSnap.publishedCount,
      statesRepresented: intelligenceSnap.statesRepresented,
      lgasRepresented: intelligenceSnap.lgasRepresented,
      dutiesRepresented: intelligenceSnap.dutiesRepresented,
      pulseTotal:
        pulse && !pulse.error && typeof pulse.total === 'number' ? pulse.total : undefined,
    };
  } else if (pulse && !pulse.error && typeof pulse.total === 'number') {
    aggregateMeta = { pulseTotal: pulse.total, publishedCount: pulse.total };
  }

  if (pulse && !pulse.error && Array.isArray(pulse.records)) {
    for (const rec of pulse.records) {
      if (!rec?.id) continue;
      const id = 'mandate:' + rec.id;
      const publicUrl = buildMandatePublicUrl(rec.id) || null;
      const entry = {
        id,
        recordId: rec.id,
        title: (rec.sentence || 'Published civic demand').slice(0, 200),
        publisher: 'ISEYC Civic Mandate Nigeria',
        sourceUrl: publicUrl,
        sourceType: 'community_submission',
        verificationStatus: 'human_reviewed_published',
        geoCoverage: [rec.state, rec.lga].filter(Boolean).join(' / ') || null,
        subjectCategory: rec.duty || rec.mandate || null,
        publishedAt: rec.created || null,
        classificationSupport: ['COMMUNITY_REPORT'],
        cannotEstablish: [
          'national_prevalence',
          'official_acknowledgement',
          'implementation',
          'independently_verified_outcome',
          'referral_sent',
        ],
        serverOwned: true,
      };
      sources.push(entry);
      byId.set(id, entry);
      byId.set(rec.id, entry);
    }
  }

  if (intelligenceSnap && !intelligenceSnap.error && intelligenceSnap.publishedCount != null) {
    const id = 'intelligence:snapshot';
    const entry = {
      id,
      title: 'Civic Mandate public intelligence aggregate',
      publisher: 'ISEYC Civic Mandate Nigeria',
      sourceUrl: 'https://2027-street-mandate.vercel.app/api/civic-intelligence',
      sourceType: 'platform_aggregate',
      verificationStatus: 'human_reviewed_published',
      geoCoverage: 'Published records only (pilot)',
      subjectCategory: 'aggregate',
      publishedAt: intelligenceSnap.generatedAt || null,
      classificationSupport: ['FACT', 'ANALYSIS'],
      cannotEstablish: ['national_prevalence', 'implementation', 'independently_verified_outcome'],
      meta: aggregateMeta,
      serverOwned: true,
    };
    sources.push(entry);
    byId.set(id, entry);
  }

  return {
    schema: REGISTRY_SCHEMA,
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    sources,
    byId,
    empty: sources.length === 0,
    aggregateMeta,
    unavailable,
  };
}

export function resolveTrustedCitation(citationId, registry) {
  if (!registry || citationId == null) return { ok: false, reason: 'invalid_citation_id' };
  if (typeof citationId !== 'string') return { ok: false, reason: 'malformed_citation_type' };
  const id = citationId.trim();
  if (!id) return { ok: false, reason: 'empty_citation_id' };
  const entry = registry.byId?.get(id);
  if (!entry) return { ok: false, reason: 'not_in_trusted_registry' };
  return { ok: true, source: entry };
}

export function serverSourcesForBrief(registry) {
  if (!registry?.sources?.length) return [];
  return registry.sources.map((s) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher,
    sourceUrl: s.sourceUrl,
    sourceType: s.sourceType,
    verificationStatus: s.verificationStatus,
    geoCoverage: s.geoCoverage,
    subjectCategory: s.subjectCategory,
    publishedAt: s.publishedAt,
    serverOwned: true,
  }));
}
