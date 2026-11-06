/**
 * Best-effort in-memory rate limit for serverless.
 *
 * LIMITATION: Each Vercel isolate has its own Map. This is only a local
 * abuse-friction control, NOT a durable global quota. Configure a Vercel
 * Firewall/WAF limit (or a shared-store gateway) for production protection.
 */
const buckets = new Map();

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;
const MAX_BUCKETS = 5000;
const BUCKET_TTL_MS = WINDOW_MS * 2;

function configuredLimit() {
  const configured = Number(process.env.CIVIC_BRAIN_RATE_LIMIT_PER_MIN);
  if (!Number.isSafeInteger(configured) || configured < 1) return DEFAULT_LIMIT;
  return Math.min(configured, MAX_LIMIT);
}

function pruneBuckets(now) {
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart >= BUCKET_TTL_MS) buckets.delete(key);
  }
}

export function checkRateLimit(key) {
  const normalizedKey = String(key || 'unknown').slice(0, 128);
  const now = Date.now();
  let entry = buckets.get(normalizedKey);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    if (buckets.size >= MAX_BUCKETS) {
      pruneBuckets(now);
      // Map preserves insertion order. Evict the oldest bucket if all
      // existing entries are still within their short TTL.
      if (buckets.size >= MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
    }
    entry = { windowStart: now, count: 0 };
    buckets.set(normalizedKey, entry);
  }

  entry.count += 1;
  if (entry.count > configuredLimit()) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/** Test helpers */
export function _resetRateLimitForTests() {
  buckets.clear();
}

export function _getRateLimitBucketCountForTests() {
  return buckets.size;
}
