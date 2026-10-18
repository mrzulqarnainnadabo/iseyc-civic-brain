/**
 * Lightweight redaction for logs and diagnostics.
 * Not a substitute for access control. Prefer not logging user content at all.
 */

const PATTERNS = [
  { re: /\+?234[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/g, rep: '[REDACTED_PHONE]' },
  { re: /\b0[789][01]\d{8}\b/g, rep: '[REDACTED_PHONE]' },
  { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, rep: '[REDACTED_EMAIL]' },
  { re: /\b\d{10,}\b/g, rep: '[REDACTED_DIGITS]' },
];

export function redactSensitive(text) {
  if (typeof text !== 'string') return '';
  let out = text.slice(0, 4000);
  for (const { re, rep } of PATTERNS) {
    out = out.replace(re, rep);
  }
  return out;
}
