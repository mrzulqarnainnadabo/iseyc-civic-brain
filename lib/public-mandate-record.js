/**
 * PublicMandateRecord v1 — Brain-side allowlist converter for Civic Mandate pulse voices.
 * Published community records only. Never forward unknown or private fields.
 */

export const PUBLIC_MANDATE_SCHEMA_VERSION = '1.0.0';

const MAX = {
  id: 80,
  sentence: 2000,
  duty: 120,
  office: 120,
  state: 80,
  lga: 120,
};

function str(v, max) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

/**
 * Convert one pulse voice into a public record DTO.
 * Returns null if the voice cannot form a valid published public record.
 */
export function voiceToPublicMandateRecord(voice, opts = {}) {
  if (!voice || typeof voice !== 'object' || Array.isArray(voice)) return null;
  const id = str(voice.id, MAX.id);
  const sentence = str(voice.sentence, MAX.sentence);
  if (!id || !sentence) return null;

  const duty = str(voice.duty, MAX.duty) || str(voice.mandate, MAX.duty);
  const office = str(voice.office, MAX.office);
  const state = str(voice.state, MAX.state);
  const lga = str(voice.lga, MAX.lga);
  const created = str(voice.created, 40);

  const baseUrl = (opts.mandateHome || 'https://2027-street-mandate.vercel.app').replace(/\/$/, '');

  /** Explicit allowlist construction — never Object.assign from the voice. */
  return {
    schemaVersion: PUBLIC_MANDATE_SCHEMA_VERSION,
    id,
    sentence,
    duty,
    office,
    state,
    lga,
    created,
    reviewStatus: 'published',
    synthetic: false,
    origin: 'civic-mandate',
    publicUrl: `${baseUrl}/mandate/${encodeURIComponent(id)}`,
    limitations: [
      'Published after human review; not independently field-verified.',
      'Not a representative national survey sample.',
      'Named office is as recorded on the public record, not a verified legal determination.',
    ],
  };
}

export function voicesToPublicMandateRecords(voices, opts = {}) {
  if (!Array.isArray(voices)) return [];
  const out = [];
  for (const v of voices) {
    const rec = voiceToPublicMandateRecord(v, opts);
    if (rec) out.push(rec);
  }
  return out;
}

/** Fields that must never appear on a public DTO even if present on input. */
export const FORBIDDEN_PUBLIC_KEYS = [
  'email',
  'phone',
  'contact',
  'fingerprint',
  'deviceId',
  'age',
  'gender',
  'operatorNotes',
  'notionId',
  'submitter',
  'ip',
];
