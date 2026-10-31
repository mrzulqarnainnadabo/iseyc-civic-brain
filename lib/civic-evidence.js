/**
 * Read-only Civic Mandate public evidence adapter.
 * Uses safe-fetch (HTTPS allowlist, timeout, size limit).
 */

import { voicesToPublicRecords, toCommunityEvidence } from './public-mandate-dto.js';
import { safeFetchJson, validatePublicHttpsUrl } from './safe-fetch.js';

const DEFAULT_INTELLIGENCE_URL = 'https://2027-street-mandate.vercel.app/api/civic-intelligence';
const DEFAULT_PULSE_URL = 'https://2027-street-mandate.vercel.app/api/pulse';

export async function fetchCivicIntelligence() {
  const url = (process.env.CIVIC_MANDATE_INTELLIGENCE_URL || DEFAULT_INTELLIGENCE_URL).trim();
  const check = validatePublicHttpsUrl(url);
  if (!check.ok) return { error: 'INVALID_EVIDENCE_URL', reason: check.reason };

  const result = await safeFetchJson(url);
  if (!result.ok) return { error: result.error || 'CIVIC_INTELLIGENCE_UNAVAILABLE' };
  if (result.data?.error) return { error: result.data.error };
  return sanitizeSnapshot(result.data);
}

export async function fetchPublishedRecords() {
  const url = (process.env.CIVIC_MANDATE_PULSE_URL || DEFAULT_PULSE_URL).trim();
  const check = validatePublicHttpsUrl(url);
  if (!check.ok) return { error: 'INVALID_PULSE_URL', reason: check.reason, records: [] };

  const result = await safeFetchJson(url);
  if (!result.ok) return { error: result.error || 'PULSE_UNAVAILABLE', records: [] };
  const data = result.data;
  if (data?.error || !Array.isArray(data?.voices)) {
    return { error: data?.error || 'PULSE_UNAVAILABLE', records: [] };
  }
  const records = voicesToPublicRecords(data.voices);
  return {
    records,
    total: typeof data.total === 'number' ? data.total : records.length,
    states: data.states ?? null,
    truncated: Boolean(data.truncated),
    source: 'civic-mandate-pulse-published-only',
    fetchedAt: new Date().toISOString(),
  };
}

function num(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
function str(s, max = 200) {
  if (typeof s !== 'string') return '';
  return s.slice(0, max);
}

export function sanitizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'INVALID_SNAPSHOT' };
  const duties = Array.isArray(raw.duties)
    ? raw.duties.slice(0, 30).map((d) => ({
        duty: str(d.duty, 80),
        count: num(d.count),
        shareOfPublished: num(d.shareOfPublished),
      }))
    : [];
  const states = Array.isArray(raw.states)
    ? raw.states.slice(0, 40).map((s) => ({
        state: str(s.state, 80),
        count: num(s.count),
        shareOfPublished: num(s.shareOfPublished),
      }))
    : [];
  const offices = Array.isArray(raw.offices)
    ? raw.offices.slice(0, 30).map((o) => ({
        office: str(o.office, 80),
        count: num(o.count),
        shareOfPublished: num(o.shareOfPublished),
      }))
    : [];
  const topLgas = Array.isArray(raw.topLgas)
    ? raw.topLgas.slice(0, 20).map((l) => ({
        state: str(l.state, 80),
        lga: str(l.lga, 80),
        count: num(l.count),
      }))
    : [];
  const methodology = Array.isArray(raw.methodology)
    ? raw.methodology.slice(0, 12).map((m) => str(m, 300))
    : [];
  const limitations = Array.isArray(raw.limitations)
    ? raw.limitations.slice(0, 12).map((m) => str(m, 300))
    : [];
  return {
    version: str(raw.version || '1.0.0', 20),
    generatedAt: str(raw.generatedAt, 40),
    publishedCount: num(raw.publishedCount),
    statesRepresented: num(raw.statesRepresented),
    lgasRepresented: num(raw.lgasRepresented),
    dutiesRepresented: num(raw.dutiesRepresented),
    periodStart: raw.periodStart ? str(raw.periodStart, 40) : null,
    periodEnd: raw.periodEnd ? str(raw.periodEnd, 40) : null,
    truncated: Boolean(raw.truncated),
    duties,
    states,
    offices,
    topLgas,
    methodology,
    limitations,
    framingLine: str(raw.framingLine, 500),
  };
}

export function formatEvidenceBlock(snap) {
  if (!snap || snap.error) return 'Evidence status: unavailable. Do not invent figures.';
  const sourceUrl =
    (typeof process !== 'undefined' && process.env && process.env.CIVIC_MANDATE_INTELLIGENCE_URL) ||
    DEFAULT_INTELLIGENCE_URL;
  const lines = [];
  lines.push('PRIMARY_SOURCE: Civic Mandate Nigeria public Civic Intelligence API (Published records only)');
  lines.push('SOURCE_URL: ' + sourceUrl);
  lines.push('LABELS: counts are platform published records — not national public opinion');
  lines.push('Schema version: ' + snap.version);
  lines.push('Snapshot time: ' + (snap.generatedAt || 'unknown'));
  lines.push('Retrieved_at (server): ' + new Date().toISOString());
  lines.push('Published records: ' + snap.publishedCount);
  lines.push('States represented: ' + snap.statesRepresented);
  if (snap.duties?.length) {
    lines.push('Duties (count among published):');
    for (const d of snap.duties.slice(0, 12)) lines.push('  - ' + d.duty + ': ' + d.count);
  }
  if (snap.states?.length) {
    lines.push('States (count among published):');
    for (const s of snap.states.slice(0, 15)) lines.push('  - ' + s.state + ': ' + s.count);
  }
  if (snap.limitations?.length) {
    lines.push('Limitations:');
    for (const L of snap.limitations) lines.push('  • ' + L);
  }
  lines.push('Public product: https://2027-street-mandate.vercel.app');
  return lines.join('\n');
}

export function formatRecordEvidenceBlock(pulse) {
  if (!pulse || pulse.error || !Array.isArray(pulse.records) || !pulse.records.length) {
    return 'Published individual records: unavailable or empty. Do not invent record ids.';
  }
  const lines = [];
  lines.push('PUBLISHED_RECORDS (cite as mandate:<id> or bare id; COMMUNITY_REPORT only)');
  lines.push('Pulse total: ' + (pulse.total ?? pulse.records.length));
  const sample = pulse.records.slice(0, 12);
  for (const r of sample) {
    const ev = toCommunityEvidence(r);
    lines.push('---');
    lines.push('record_id: ' + r.id);
    lines.push('trusted_source_id: mandate:' + r.id);
    lines.push('classification: COMMUNITY_REPORT');
    lines.push('duty: ' + (r.duty || r.mandate || ''));
    lines.push('geo: ' + [r.state, r.lga].filter(Boolean).join(' / '));
    lines.push('text: ' + (r.sentence || '').slice(0, 280));
    if (ev?.sourceUrl) lines.push('url: ' + ev.sourceUrl);
  }
  return lines.join('\n');
}
