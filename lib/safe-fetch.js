/**
 * Policy-bound HTTPS fetch with fail-closed bounded body reading.
 */

const CANONICAL_HOST = '2027-street-mandate.vercel.app';
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 200_000;

export const SOURCE_POLICIES = Object.freeze({
  pulse: { host: CANONICAL_HOST, path: '/api/pulse', allowQuery: false, allowFragment: false },
  intelligence: {
    host: CANONICAL_HOST,
    path: '/api/civic-intelligence',
    allowQuery: false,
    allowFragment: false,
  },
  mandateRecord: {
    host: CANONICAL_HOST,
    pathPrefix: '/mandate/',
    allowQuery: false,
    allowFragment: false,
  },
});

export function validateSourceUrl(urlString, policyKey) {
  const policy = SOURCE_POLICIES[policyKey];
  if (!policy) return { ok: false, reason: 'unknown_policy' };
  if (typeof urlString !== 'string' || !urlString.trim()) return { ok: false, reason: 'empty_url' };
  let u;
  try {
    u = new URL(urlString.trim());
  } catch {
    return { ok: false, reason: 'malformed_url' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (u.username || u.password) return { ok: false, reason: 'credentials_forbidden' };
  if (u.port && u.port !== '443') return { ok: false, reason: 'unexpected_port' };
  if (u.hostname.toLowerCase() !== policy.host) return { ok: false, reason: 'host_not_allowed' };
  let path;
  try {
    path = decodeURIComponent(u.pathname);
  } catch {
    return { ok: false, reason: 'path_decode_error' };
  }
  if (path.includes('..') || path.includes('//') || path.includes('%00')) {
    return { ok: false, reason: 'path_trick' };
  }
  if (policy.path && path !== policy.path) return { ok: false, reason: 'path_mismatch' };
  if (policy.pathPrefix) {
    if (!path.startsWith(policy.pathPrefix)) return { ok: false, reason: 'path_mismatch' };
    const rest = path.slice(policy.pathPrefix.length);
    if (!rest || !/^[a-zA-Z0-9_-]{1,64}$/.test(rest)) return { ok: false, reason: 'invalid_mandate_id' };
  }
  if (!policy.allowQuery && u.search) return { ok: false, reason: 'query_forbidden' };
  if (!policy.allowFragment && u.hash) return { ok: false, reason: 'fragment_forbidden' };
  return { ok: true, url: u.origin + u.pathname, host: u.hostname.toLowerCase() };
}

export function validatePublicHttpsUrl(urlString) {
  if (typeof urlString !== 'string' || !urlString.trim()) return { ok: false, reason: 'empty_url' };
  let u;
  try {
    u = new URL(urlString.trim());
  } catch {
    return { ok: false, reason: 'malformed_url' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (u.username || u.password) return { ok: false, reason: 'credentials_forbidden' };
  if (u.port && u.port !== '443') return { ok: false, reason: 'unexpected_port' };
  if (u.hostname.toLowerCase() !== CANONICAL_HOST) return { ok: false, reason: 'host_not_allowed' };
  return { ok: true, url: u.toString(), host: u.hostname.toLowerCase() };
}

export function buildMandatePublicUrl(recordId) {
  const id = String(recordId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!id) return null;
  const url = 'https://' + CANONICAL_HOST + '/mandate/' + id;
  const v = validateSourceUrl(url, 'mandateRecord');
  return v.ok ? v.url : null;
}

function supportsBoundedStream(res) {
  return Boolean(res.body && typeof res.body.getReader === 'function');
}

async function readBodyBounded(res, maxBytes, signal) {
  if (!supportsBoundedStream(res)) {
    // Fail closed — do not buffer unbounded responses
    return { ok: false, error: 'BOUNDED_READ_UNSUPPORTED' };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      if (signal?.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const n = value.byteLength ?? value.length ?? 0;
        total += n;
        if (total > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          return { ok: false, error: 'BODY_TOO_LARGE', bytes: total };
        }
        chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
      }
    }
  } finally {
    try {
      reader.releaseLock?.();
    } catch {
      /* ignore */
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(merged);
  return { ok: true, text, bytes: total };
}

export async function safeFetchJson(urlString, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const externalSignal = opts.signal;
  const policyKey = opts.policyKey;
  const v = policyKey ? validateSourceUrl(urlString, policyKey) : validatePublicHttpsUrl(urlString);
  if (!v.ok) return { ok: false, error: 'INVALID_URL', reason: v.reason };

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(v.url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });

    const cl = res.headers?.get?.('content-length');
    if (cl && Number(cl) > maxBytes) {
      return { ok: false, error: 'BODY_TOO_LARGE', status: res.status };
    }

    const body = await readBodyBounded(res, maxBytes, controller.signal);
    if (!body.ok) return { ok: false, error: body.error, status: res.status, bytes: body.bytes };

    if (!res.ok) return { ok: false, error: 'HTTP_' + res.status, status: res.status };
    if (!body.text.trim()) return { ok: false, error: 'EMPTY_BODY', status: res.status };

    let data;
    try {
      data = JSON.parse(body.text);
    } catch {
      return { ok: false, error: 'JSON_PARSE_ERROR', status: res.status };
    }
    return { ok: true, data, status: res.status, bytes: body.bytes };
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR';
    return { ok: false, error: msg, detail: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}
