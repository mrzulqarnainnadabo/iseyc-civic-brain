import { voicesToPublicRecords } from './public-mandate-dto.js';
import { safeFetchJson } from './safe-fetch.js';

const DEFAULT_INTELLIGENCE_URL = 'https://2027-street-mandate.vercel.app/api/civic-intelligence';
const DEFAULT_PULSE_URL = 'https://2027-street-mandate.vercel.app/api/pulse';

export async function fetchCivicIntelligence(signal) {
  const url = (process.env.CIVIC_MANDATE_INTELLIGENCE_URL || DEFAULT_INTELLIGENCE_URL).trim();
  const result = await safeFetchJson(url, { policyKey: 'intelligence', signal });
  if (!result.ok) return { error: result.error || 'CIVIC_INTELLIGENCE_UNAVAILABLE', reason: result.reason };
  if (result.data?.error) return { error: result.data.error };
  return sanitizeSnapshot(result.data);
}

export async function fetchPublishedRecords(signal) {
  const url = (process.env.CIVIC_MANDATE_PULSE_URL || DEFAULT_PULSE_URL).trim();
  const result = await safeFetchJson(url, { policyKey: 'pulse', signal });
  if (!result.ok) return { error: result.error || 'PULSE_UNAVAILABLE', reason: result.reason, records: [] };
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
    duties: Array.isArray(raw.duties)
      ? raw.duties.slice(0, 30).map((d) => ({ duty: str(d.duty, 80), count: num(d.count) }))
      : [],
    states: Array.isArray(raw.states)
      ? raw.states.slice(0, 40).map((s) => ({ state: str(s.state, 80), count: num(s.count) }))
      : [],
    offices: Array.isArray(raw.offices)
      ? raw.offices.slice(0, 30).map((o) => ({ office: str(o.office, 80), count: num(o.count) }))
      : [],
    topLgas: Array.isArray(raw.topLgas)
      ? raw.topLgas.slice(0, 20).map((l) => ({
          state: str(l.state, 80),
          lga: str(l.lga, 80),
          count: num(l.count),
        }))
      : [],
    methodology: Array.isArray(raw.methodology)
      ? raw.methodology.slice(0, 12).map((m) => str(m, 300))
      : [],
    limitations: Array.isArray(raw.limitations)
      ? raw.limitations.slice(0, 12).map((m) => str(m, 300))
      : [],
    framingLine: str(raw.framingLine, 500),
  };
}

export function formatEvidenceBlock(snap) {
  if (!snap || snap.error) return 'Evidence status: aggregate unavailable. Do not invent figures.';
  const lines = [
    'PRIMARY_SOURCE: Civic Mandate public intelligence (Published only)',
    'LABELS: platform published counts — not national opinion',
    'Published records: ' + snap.publishedCount,
    'States represented: ' + snap.statesRepresented,
    'LGAs represented: ' + snap.lgasRepresented,
    'Duties represented: ' + snap.dutiesRepresented,
  ];
  if (snap.duties?.length) {
    lines.push('Duties (count among published):');
    for (const d of snap.duties.slice(0, 12)) lines.push('  - ' + d.duty + ': ' + d.count);
  }
  if (snap.states?.length) {
    lines.push('States (count among published):');
    for (const s of snap.states.slice(0, 15)) lines.push('  - ' + s.state + ': ' + s.count);
  }
  lines.push('Public product: https://2027-street-mandate.vercel.app');
  return lines.join('\n');
}

export function formatRecordEvidenceBlock(pulse) {
  if (!pulse || pulse.error || !Array.isArray(pulse.records) || !pulse.records.length) {
    return 'Published individual records: unavailable. Do not invent record ids.';
  }
  const lines = [
    'PUBLISHED_RECORDS (cite mandate:<id> or bare id)',
    'Pulse total: ' + (pulse.total ?? pulse.records.length),
  ];
  for (const r of pulse.records.slice(0, 12)) {
    lines.push('---');
    lines.push('record_id: ' + r.id);
    lines.push('trusted_source_id: mandate:' + r.id);
    lines.push('classification: COMMUNITY_REPORT');
    lines.push('duty: ' + (r.duty || ''));
    lines.push('geo: ' + [r.state, r.lga].filter(Boolean).join(' / '));
    lines.push('text: ' + (r.sentence || '').slice(0, 280));
  }
  return lines.join('\n');
}
