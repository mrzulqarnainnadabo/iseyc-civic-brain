/**
 * Conservative upstream fetch: HTTPS, host allowlist, timeout, body size limit.
 */

const DEFAULT_ALLOWED_HOSTS = new Set([
  '2027-street-mandate.vercel.app',
]);

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 200_000;

export function allowedHostsFromEnv() {
  const extra = (process.env.CIVIC_MANDATE_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set(DEFAULT_ALLOWED_HOSTS);
  for (const h of extra) set.add(h);
  return set;
}

/**
 * Validate absolute https URL against allowlisted hosts. No credentials, no userinfo.
 */
export function validatePublicHttpsUrl(urlString, opts = {}) {
  const allowed = opts.allowedHosts || allowedHostsFromEnv();
  if (typeof urlString !== 'string' || !urlString.trim()) {
    return { ok: false, reason: 'empty_url' };
  }
  let u;
  try {
    u = new URL(urlString.trim());
  } catch {
    return { ok: false, reason: 'malformed_url' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (u.username || u.password) return { ok: false, reason: 'credentials_forbidden' };
  const host = u.hostname.toLowerCase();
  if (!allowed.has(host)) return { ok: false, reason: 'host_not_allowed:' + host };
  return { ok: true, url: u.toString(), host };
}

/**
 * Build mandate publicUrl only for approved origin + /mandate/:id pattern.
 */
export function buildMandatePublicUrl(recordId, origin = 'https://2027-street-mandate.vercel.app') {
  const id = String(recordId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!id) return null;
  const baseCheck = validatePublicHttpsUrl(origin);
  if (!baseCheck.ok) return null;
  const originUrl = new URL(baseCheck.url);
  return originUrl.origin + '/mandate/' + id;
}

export async function safeFetchJson(urlString, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const v = validatePublicHttpsUrl(urlString, opts);
  if (!v.ok) return { ok: false, error: 'INVALID_URL', reason: v.reason };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(v.url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });
    const text = await res.text();
    if (text.length > maxBytes) {
      return { ok: false, error: 'BODY_TOO_LARGE', status: res.status };
    }
    if (!res.ok) {
      return { ok: false, error: 'HTTP_' + res.status, status: res.status };
    }
    if (!text.trim()) {
      return { ok: false, error: 'EMPTY_BODY', status: res.status };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: 'JSON_PARSE_ERROR', status: res.status };
    }
    return { ok: true, data, status: res.status, bytes: text.length };
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR';
    return { ok: false, error: msg, detail: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
}
