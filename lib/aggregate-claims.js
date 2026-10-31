/**
 * Server-side validation of numerical aggregate claims against trusted snapshot meta.
 */

const NAT_STAT =
  /\b(nationally|nationwide|all\s+nigerians|%\s*of\s*(nigerians|citizens|voters)|percentage\s+of\s+(the\s+)?population|ranking|ranked\s+#?\d+)\b/i;
const TREND =
  /\b(increased\s+by|decreased\s+by|grew\s+by|fell\s+by|\d+\s*%\s*(increase|decrease|growth))\b/i;

/**
 * @param {string} text
 * @param {{ publishedCount?: number, statesRepresented?: number, lgasRepresented?: number, dutiesRepresented?: number, pulseTotal?: number }|null} meta
 */
export function assessAggregateClaim(text, meta) {
  if (!text || typeof text !== 'string') {
    return { ok: true, reason: 'no_text' };
  }
  if (NAT_STAT.test(text)) {
    return {
      ok: false,
      demoteTo: 'UNKNOWN',
      reason: 'national_statistic_language',
      requiresHumanReview: true,
    };
  }
  if (TREND.test(text) && meta) {
    return {
      ok: false,
      demoteTo: 'ANALYSIS',
      reason: 'trend_not_in_snapshot',
      requiresHumanReview: true,
    };
  }

  if (!meta) {
    if (/\b\d{1,6}\b/.test(text) && /published|records|states|lgas|duties/i.test(text)) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'numerical_claim_without_aggregate_meta',
        requiresHumanReview: true,
      };
    }
    return { ok: true, reason: 'no_meta_no_platform_number' };
  }

  const allowed = new Set();
  for (const k of ['publishedCount', 'statesRepresented', 'lgasRepresented', 'dutiesRepresented', 'pulseTotal']) {
    if (typeof meta[k] === 'number' && Number.isFinite(meta[k])) {
      allowed.add(meta[k]);
    }
  }

  const lower = text.toLowerCase();
  const mentionsAggregate =
    /published\s+records?|states?\s+represented|lgas?|duties?\s+represented|pulse\s+total|among\s+published/i.test(
      lower
    );

  if (!mentionsAggregate) {
    return { ok: true, reason: 'no_aggregate_vocabulary' };
  }

  const nums = [];
  const re = /\b(\d{1,6})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    nums.push(Number(m[1]));
  }

  for (const n of nums) {
    if (!allowed.has(n)) {
      if (n === 0 || n === 1) continue;
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'aggregate_number_mismatch:' + n,
        requiresHumanReview: true,
        allowed: [...allowed],
      };
    }
  }

  if (/%/.test(text) && mentionsAggregate) {
    return {
      ok: false,
      demoteTo: 'ANALYSIS',
      reason: 'percentage_not_in_snapshot',
      requiresHumanReview: true,
    };
  }

  return { ok: true, reason: 'numbers_match_or_benign' };
}
