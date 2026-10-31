/** Field-level claim language guards (not only findings). */

const COMPLETION =
  /\b(resolved|fully\s+implemented|successfully\s+delivered|completed\s+(the\s+)?(project|implementation)|work\s+is\s+done|outcome\s+independently\s+verified|finished\s+construction)\b/i;
const ACK =
  /\b(officially\s+acknowledged|acknowledged\s+receipt|accepted\s+the\s+referral|referral\s+was\s+sent|government\s+confirmed|institution\s+confirmed)\b/i;
const STARTED =
  /\b(commenced\s+implementation|began\s+implementation|started\s+construction|work\s+has\s+begun)\b/i;
const PREVALENCE =
  /\b\d{1,3}\s*%\s*of\s*(nigerians|citizens|voters)|national\s+prevalence|all\s+nigerians\b/i;

export function textRisk(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  if (PREVALENCE.test(text)) return 'prevalence';
  if (COMPLETION.test(text)) return 'completion';
  if (ACK.test(text)) return 'acknowledgement';
  if (STARTED.test(text)) return 'implementation_started';
  return null;
}

export function fieldItemText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') return item.text || item.statement || item.summary || '';
  return '';
}

/** Returns list of { field, index, risk } for unsafe model-authored content. */
export function scanBriefFields(raw) {
  const hits = [];
  const fields = [
    'verifiedImplementation',
    'publicCommitments',
    'officialEvidence',
    'communityReports',
    'institutionalResponsibilities',
  ];
  for (const field of fields) {
    const arr = Array.isArray(raw[field]) ? raw[field] : [];
    arr.forEach((item, index) => {
      const t = fieldItemText(item);
      const risk = textRisk(t);
      if (risk) hits.push({ field, index, risk, text: t.slice(0, 120) });
      if (field === 'institutionalResponsibilities' && item && typeof item === 'object') {
        const st = String(item.verificationStatus || '').toLowerCase();
        if (st === 'verified' || st === 'independently_verified') {
          hits.push({ field, index, risk: 'verification_status', text: st });
        }
      }
    });
  }
  return hits;
}
