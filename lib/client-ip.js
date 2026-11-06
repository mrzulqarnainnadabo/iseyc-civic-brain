/**
 * Resolve the client address using Vercel's platform-provided header.
 *
 * On Vercel, x-real-ip is set by the platform and documented as identical
 * to x-forwarded-for. Do not parse arbitrary client-supplied forwarding chains.
 * Local development falls back to the socket address.
 */
export function getClientIp(req) {
  const platformIp = req.headers?.['x-real-ip'];
  if (typeof platformIp === 'string' && platformIp.trim()) {
    return platformIp.trim().slice(0, 64);
  }
  return req.socket?.remoteAddress || 'unknown';
}
