/**
 * Conservative metric-value binding for aggregate claims.
 * Prefer explicit "<number> <metric>" pairs; reject ambiguity.
 */

const NAT =
  /\b(nationally|nationwide|all\s+nigerians|%\s*of\s*(nigerians|citizens|voters)|percentage\s+of\s+(the\s+)?population)\b/i;
const RANK = /\b(ranking|ranked\s+#?\d+|top\s+state\s+in\s+nigeria)\b/i;
const TREND =
  /\b(increased\s+by|decreased\s+by|grew\s+by|fell\s+by|\d+\s*%\s*(increase|decrease|growth)|year[- ]on[- ]year)\b/i;

const WORD_NUM = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

/** Ordered patterns: number immediately before metric label (and common prepositions). */
const PAIR_PATTERNS = [
  {
    key: 'publishedCount',
    re: /\b(\d{1,6})\s+(?:published\s+)?records?\b/gi,
  },
  {
    key: 'publishedCount',
    re: /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty)\s+(?:published\s+)?records?\b/gi,
  },
  {
    key: 'statesRepresented',
    re: /\b(\d{1,6})\s+states?(?:\s+represented)?\b/gi,
  },
  {
    key: 'statesRepresented',
    re: /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty)\s+states?(?:\s+represented)?\b/gi,
  },
  {
    key: 'lgasRepresented',
    re: /\b(\d{1,6})\s+lgas?(?:\s+represented)?\b/gi,
  },
  {
    key: 'lgasRepresented',
    re: /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty)\s+lgas?(?:\s+represented)?\b/gi,
  },
  {
    key: 'dutiesRepresented',
    re: /\b(\d{1,6})\s+duties?(?:\s+represented)?\b/gi,
  },
  {
    key: 'pulseTotal',
    re: /\b(\d{1,6})\s+pulse\s+total\b/gi,
  },
];

function parseNumToken(tok) {
  if (/^\d+$/.test(tok)) return Number(tok);
  const w = WORD_NUM[tok.toLowerCase()];
  return typeof w === 'number' ? w : null;
}

/** Extract explicit metric-value pairs from text. */
export function extractMetricPairs(text) {
  const pairs = [];
  for (const p of PAIR_PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const value = parseNumToken(m[1]);
      if (value == null) continue;
      pairs.push({ key: p.key, value, raw: m[0], index: m.index });
    }
  }
  return pairs;
}

function hasMetricVocab(text) {
  return /\b(published\s+)?records?\b|\bstates?(?:\s+represented)?\b|\blgas?\b|\bduties?\b|\bpulse\s+total\b/i.test(
    text
  );
}

/**
 * @param {string} text
 * @param {object|null} meta
 */
export function assessAggregateClaim(text, meta) {
  if (!text || typeof text !== 'string') return { ok: true, reason: 'no_text' };

  if (NAT.test(text) || RANK.test(text)) {
    return { ok: false, demoteTo: 'UNKNOWN', reason: 'national_or_rank_language', requiresHumanReview: true };
  }
  if (TREND.test(text)) {
    return { ok: false, demoteTo: 'ANALYSIS', reason: 'trend_not_supported_by_snapshot', requiresHumanReview: true };
  }

  // Dates / decimals: ignore pure ISO dates as metric numbers
  const cleaned = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');

  if (/%|\bpercent\b/i.test(cleaned) && hasMetricVocab(cleaned)) {
    return { ok: false, demoteTo: 'ANALYSIS', reason: 'percentage_not_in_snapshot', requiresHumanReview: true };
  }

  if (!hasMetricVocab(cleaned)) return { ok: true, reason: 'no_metric_vocabulary' };

  if (!meta) {
    return {
      ok: false,
      demoteTo: 'UNKNOWN',
      reason: 'metric_claim_without_aggregate_meta',
      requiresHumanReview: true,
    };
  }

  const pairs = extractMetricPairs(cleaned);
  if (!pairs.length) {
    // Metric vocab but no explicit number-metric pair → uncertain
    if (/\b\d{1,6}\b/.test(cleaned) || /\b(many|most|majority|few|several)\b/i.test(cleaned)) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'unbound_or_ambiguous_metric_number',
        requiresHumanReview: true,
      };
    }
    return { ok: true, reason: 'metric_vocab_without_numbers' };
  }

  for (const pair of pairs) {
    const expected = meta[pair.key];
    if (typeof expected !== 'number' || !Number.isFinite(expected)) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'metric_missing_in_meta:' + pair.key,
        requiresHumanReview: true,
      };
    }
    if (pair.value !== expected) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'metric_value_mismatch:' + pair.key + ':' + pair.value + '!=' + expected,
        requiresHumanReview: true,
      };
    }
  }

  return { ok: true, reason: 'metric_pairs_match', pairs };
}

export function demoteIfBadAggregate(text, meta) {
  const a = assessAggregateClaim(text, meta);
  if (a.ok) return null;
  return a;
}
