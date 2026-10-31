/**
 * Metric-specific aggregate claim validation against server-owned snapshot fields.
 * A number valid for one metric must not validate a different metric.
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
  hundred: 100,
};

/** Map phrase contexts to metric keys on aggregateMeta */
const METRIC_PATTERNS = [
  {
    key: 'publishedCount',
    re: /\b(?:published\s+)?records?\b|\bvoices?\b|\bpublished\s+count\b/i,
  },
  {
    key: 'statesRepresented',
    re: /\bstates?(?:\s+represented)?\b/i,
  },
  {
    key: 'lgasRepresented',
    re: /\blgas?(?:\s+represented)?\b|\blocal\s+government/i,
  },
  {
    key: 'dutiesRepresented',
    re: /\bduties?(?:\s+represented)?\b|\bduty\s+categor/i,
  },
  {
    key: 'pulseTotal',
    re: /\bpulse\s+total\b/i,
  },
];

function extractNumbers(text) {
  const out = [];
  const digit = /\b(\d{1,6})(?:\.(\d+))?\s*(%|percent)?\b/gi;
  let m;
  while ((m = digit.exec(text)) !== null) {
    out.push({
      value: Number(m[1]),
      isPercent: Boolean(m[3]) || /percent/i.test(m[0]),
      raw: m[0],
      index: m.index,
    });
  }
  const lower = text.toLowerCase();
  for (const [word, value] of Object.entries(WORD_NUM)) {
    const re = new RegExp('\\b' + word + '\\b', 'gi');
    let wm;
    while ((wm = re.exec(lower)) !== null) {
      out.push({ value, isPercent: false, raw: word, index: wm.index, fromWord: true });
    }
  }
  return out;
}

function windowAround(text, index, radius = 48) {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius));
}

/**
 * @param {string} text
 * @param {object|null} meta aggregateMeta from trusted registry
 */
export function assessAggregateClaim(text, meta) {
  if (!text || typeof text !== 'string') {
    return { ok: true, reason: 'no_text' };
  }

  if (NAT.test(text) || RANK.test(text)) {
    return {
      ok: false,
      demoteTo: 'UNKNOWN',
      reason: 'national_or_rank_language',
      requiresHumanReview: true,
    };
  }
  if (TREND.test(text)) {
    return {
      ok: false,
      demoteTo: 'ANALYSIS',
      reason: 'trend_not_supported_by_snapshot',
      requiresHumanReview: true,
    };
  }

  const numbers = extractNumbers(text);
  const mentionsMetric = METRIC_PATTERNS.some((p) => p.re.test(text));

  // Percentages tied to platform metrics are never in snapshot as %
  if (numbers.some((n) => n.isPercent) && mentionsMetric) {
    return {
      ok: false,
      demoteTo: 'ANALYSIS',
      reason: 'percentage_not_in_snapshot',
      requiresHumanReview: true,
    };
  }

  if (!mentionsMetric) {
    return { ok: true, reason: 'no_metric_vocabulary' };
  }

  if (!meta) {
    return {
      ok: false,
      demoteTo: 'UNKNOWN',
      reason: 'metric_claim_without_aggregate_meta',
      requiresHumanReview: true,
    };
  }

  // Validate each number near metric vocabulary against the specific metric
  for (const n of numbers) {
    if (n.isPercent) continue;
    // Skip pure ordinals zero/one when not clearly totals — still check context
    const ctx = windowAround(text, n.index);
    let matchedMetric = null;
    for (const p of METRIC_PATTERNS) {
      if (p.re.test(ctx)) {
        matchedMetric = p.key;
        break;
      }
    }
    // If sentence mentions metrics but this number's window is unclear
    if (!matchedMetric) {
      // Multiple metrics in sentence — require each number to bind
      if (METRIC_PATTERNS.filter((p) => p.re.test(text)).length > 1) {
        return {
          ok: false,
          demoteTo: 'UNKNOWN',
          reason: 'ambiguous_metric_binding:' + n.value,
          requiresHumanReview: true,
        };
      }
      // Single metric in sentence — bind to that metric
      const only = METRIC_PATTERNS.find((p) => p.re.test(text));
      matchedMetric = only?.key || null;
    }
    if (!matchedMetric) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'unbound_number:' + n.value,
        requiresHumanReview: true,
      };
    }
    const expected = meta[matchedMetric];
    if (typeof expected !== 'number' || !Number.isFinite(expected)) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'metric_missing_in_meta:' + matchedMetric,
        requiresHumanReview: true,
      };
    }
    if (n.value !== expected) {
      return {
        ok: false,
        demoteTo: 'UNKNOWN',
        reason: 'metric_value_mismatch:' + matchedMetric + ':' + n.value + '!=' + expected,
        requiresHumanReview: true,
      };
    }
  }

  // Metric vocabulary with no parseable number → uncertain
  if (mentionsMetric && numbers.length === 0 && /\b(many|most|majority|few|several)\b/i.test(text)) {
    return {
      ok: false,
      demoteTo: 'ANALYSIS',
      reason: 'vague_quantity_with_metric',
      requiresHumanReview: true,
    };
  }

  return { ok: true, reason: 'metric_values_match' };
}

/** Apply aggregate assessment to arbitrary text; return demotion descriptor or null */
export function demoteIfBadAggregate(text, meta) {
  const a = assessAggregateClaim(text, meta);
  if (a.ok) return null;
  return a;
}
