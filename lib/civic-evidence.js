/**
 * Read-only Civic Mandate public evidence adapter.
 * Uses only the public Civic Intelligence aggregate API — never Notion credentials.
 */

const DEFAULT_URL = 'https://2027-street-mandate.vercel.app/api/civic-intelligence';
const MAX_BODY_BYTES = 200_000;

export async function fetchCivicIntelligence() {
  const url = (process.env.CIVIC_MANDATE_INTELLIGENCE_URL || DEFAULT_URL).trim();
  if (!/^https:\/\//i.test(url)) {
    return { error: 'INVALID_EVIDENCE_URL' };
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) {
    return { error: 'EVIDENCE_TOO_LARGE' };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'EVIDENCE_PARSE_ERROR' };
  }

  if (!res.ok || data?.error) {
    return { error: data?.error || 'CIVIC_INTELLIGENCE_UNAVAILABLE' };
  }

  return sanitizeSnapshot(data);
}

function num(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function str(s, max = 200) {
  if (typeof s !== 'string') return '';
  return s.slice(0, max);
}

/** Allowlist fields from Civic Intelligence v1.0.0 */
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
  if (!snap || snap.error) {
    return 'Evidence status: unavailable. Do not invent figures.';
  }
  const sourceUrl =
    (typeof process !== 'undefined' && process.env && process.env.CIVIC_MANDATE_INTELLIGENCE_URL) ||
    DEFAULT_URL;
  const lines = [];
  lines.push('PRIMARY_SOURCE: Civic Mandate Nigeria public Civic Intelligence API (Published records only)');
  lines.push('SOURCE_URL: ' + sourceUrl);
  lines.push('LABELS: counts below are platform published records — not national public opinion');
  lines.push('Schema version: ' + snap.version);
  lines.push('Snapshot time (source generatedAt): ' + (snap.generatedAt || 'unknown'));
  lines.push('Retrieved_at (server): ' + new Date().toISOString());
  lines.push('Published records: ' + snap.publishedCount);
  lines.push('States represented: ' + snap.statesRepresented);
  lines.push('LGAs represented: ' + snap.lgasRepresented);
  lines.push('Duties represented: ' + snap.dutiesRepresented);
  if (snap.periodStart || snap.periodEnd) {
    lines.push('Period: ' + (snap.periodStart || '—') + ' → ' + (snap.periodEnd || '—'));
  }
  if (snap.truncated) lines.push('Note: underlying fetch may be truncated.');
  if (snap.framingLine) lines.push('Framing: ' + snap.framingLine);
  if (snap.duties?.length) {
    lines.push('Duties (count among published):');
    for (const d of snap.duties.slice(0, 12)) {
      lines.push('  - ' + d.duty + ': ' + d.count);
    }
  }
  if (snap.states?.length) {
    lines.push('States (count among published):');
    for (const s of snap.states.slice(0, 15)) {
      lines.push('  - ' + s.state + ': ' + s.count);
    }
  }
  if (snap.offices?.length) {
    lines.push('Offices named (count among published):');
    for (const o of snap.offices.slice(0, 10)) {
      lines.push('  - ' + o.office + ': ' + o.count);
    }
  }
  if (snap.methodology?.length) {
    lines.push('Methodology:');
    for (const m of snap.methodology) lines.push('  • ' + m);
  }
  if (snap.limitations?.length) {
    lines.push('Limitations:');
    for (const L of snap.limitations) lines.push('  • ' + L);
  }
  lines.push('Public product: https://2027-street-mandate.vercel.app');
  lines.push('Intelligence page: https://2027-street-mandate.vercel.app/intelligence');
  return lines.join('\n');
}
