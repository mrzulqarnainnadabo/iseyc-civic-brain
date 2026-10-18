/**
 * Best-effort in-memory rate limit for serverless.
 *
 * LIMITATION: Each Vercel isolate has its own Map. This reduces casual abuse
 * but is NOT a durable global quota. For production-grade protection, put an
 * edge/WAF limit or authenticated gateway with a shared store in front of this API.
 */

const buckets = new Map();

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 20;

export function checkRateLimit(key) {
  const limit = Number(process.env.CIVIC_BRAIN_RATE_LIMIT_PER_MIN) || DEFAULT_LIMIT;
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    buckets.set(key, entry);
  }
  entry.count += 1;

  // Opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now - v.windowStart >= WINDOW_MS * 2) buckets.delete(k);
    }
  }

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/** Test helper */
export function _resetRateLimitForTests() {
  buckets.clear();
}
