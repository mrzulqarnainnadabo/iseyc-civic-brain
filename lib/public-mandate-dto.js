/**
 * PublicMandateRecord v1.0.0 — allowlist for Published Pulse voices.
 * Never include submitter PII or Notion property dumps.
 */

export const PUBLIC_MANDATE_ALLOWED_KEYS = Object.freeze([
  'id',
  'sentence',
  'duty',
  'mandate',
  'office',
  'state',
  'lga',
  'created',
  'schemaVersion',
  'publicUrl',
]);

const FORBIDDEN_KEY = /email|phone|fingerprint|gender|ageBand|device|submitter|notion|properties|response|resolution|followUp|follow-up/i;

/**
 * Build allowlisted public record. Unknown and forbidden keys are dropped (not echoed).
 * Returns null only when required public fields are missing.
 */
export function stripToPublicMandateRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const sentence = typeof raw.sentence === 'string' ? raw.sentence.trim() : '';
  if (!id || !sentence) return null;

  const duty =
    (typeof raw.duty === 'string' && raw.duty.trim()) ||
    (typeof raw.mandate === 'string' && raw.mandate.trim()) ||
    '';
  const office = typeof raw.office === 'string' ? raw.office.trim() : '';
  const state = typeof raw.state === 'string' ? raw.state.trim() : '';
  const lga = typeof raw.lga === 'string' ? raw.lga.trim() : '';
  const created = typeof raw.created === 'string' ? raw.created.trim() : '';

  const out = {
    schemaVersion: '1.0.0',
    id: id.slice(0, 128),
    sentence: sentence.slice(0, 2000),
    duty: duty.slice(0, 120),
    office: office.slice(0, 120),
    state: state.slice(0, 80),
    lga: lga.slice(0, 80),
    created: created.slice(0, 40),
  };
  if (typeof raw.mandate === 'string' && raw.mandate.trim()) {
    out.mandate = raw.mandate.trim().slice(0, 120);
  }
  if (typeof raw.publicUrl === 'string' && raw.publicUrl.startsWith('https://')) {
    out.publicUrl = raw.publicUrl.slice(0, 300);
  } else if (id) {
    out.publicUrl = 'https://2027-street-mandate.vercel.app/mandate/' + id;
  }

  // Safety: never copy keys matching forbidden patterns onto output
  for (const k of Object.keys(out)) {
    if (FORBIDDEN_KEY.test(k)) delete out[k];
  }
  return out;
}

export function voicesToPublicRecords(voices) {
  if (!Array.isArray(voices)) return [];
  const out = [];
  for (const v of voices.slice(0, 200)) {
    const rec = stripToPublicMandateRecord(v);
    if (rec) out.push(rec);
  }
  return out;
}

/** Map a public record to EvidenceRecord community_submission shape (metadata only). */
export function toCommunityEvidence(rec) {
  if (!rec?.id) return null;
  return {
    schemaVersion: '1.0.0',
    id: 'mandate:' + rec.id,
    publisher: 'ISEYC Civic Mandate Nigeria',
    title: (rec.sentence || '').slice(0, 120),
    sourceUrl: rec.publicUrl || 'https://2027-street-mandate.vercel.app/mandate/' + rec.id,
    sourceType: 'community_submission',
    geoCoverage: [rec.state, rec.lga].filter(Boolean).join(' / ') || 'unspecified',
    subjectCategory: rec.duty || rec.mandate || 'unspecified',
    publishedAt: rec.created || null,
    lastCheckedAt: new Date().toISOString(),
    verificationStatus: 'reviewed',
    knownLimitations:
      'Published community demand after human review; not proof of prevalence, official receipt, or resolution.',
  };
}
