/**
 * Evidence quality helpers — provenance and limitation signals.
 * Does not claim verification merely because a URL exists.
 */

const STALE_DAYS_DEFAULT = 365;

export function daysSince(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (86400 * 1000));
}

export function assessEvidenceItem(item = {}) {
  const issues = [];
  if (!item.id) issues.push('missing_id');
  if (!item.publisher) issues.push('missing_publisher');
  if (!item.title) issues.push('missing_title');
  if (!item.sourceUrl && !item.documentRef) issues.push('missing_source_ref');
  if (!item.sourceType) issues.push('missing_source_type');
  if (!item.verificationStatus) issues.push('missing_verification_status');

  const age = daysSince(item.publishedAt || item.lastCheckedAt);
  if (age != null && age > STALE_DAYS_DEFAULT) {
    issues.push('possibly_stale');
  }

  if (item.sourceType === 'community_submission' && item.verificationStatus === 'independently_verified') {
    issues.push('community_marked_independently_verified_without_extra_proof');
  }

  return {
    id: item.id || null,
    ok: issues.length === 0,
    issues,
    qualityBand: issues.length === 0 ? 'adequate' : issues.includes('missing_source_ref') ? 'weak' : 'limited',
  };
}

export function findDuplicateEvidenceIds(items = []) {
  const seen = new Map();
  const dupes = [];
  for (const it of items) {
    if (!it?.id) continue;
    if (seen.has(it.id)) dupes.push(it.id);
    else seen.set(it.id, true);
  }
  return dupes;
}

export function geographicMismatch(itemGeo = '', questionGeo = '') {
  const a = String(itemGeo || '').toLowerCase().trim();
  const b = String(questionGeo || '').toLowerCase().trim();
  if (!a || !b) return { mismatch: false, reason: 'insufficient_geo' };
  if (a.includes(b) || b.includes(a)) return { mismatch: false, reason: 'overlap' };
  // Simple token overlap
  const ta = new Set(a.split(/[\s,/]+/).filter(Boolean));
  const tb = b.split(/[\s,/]+/).filter(Boolean);
  if (tb.some((t) => ta.has(t))) return { mismatch: false, reason: 'token_overlap' };
  return { mismatch: true, reason: 'no_overlap' };
}

export function summariseEvidenceQuality(items = []) {
  const assessments = items.map(assessEvidenceItem);
  const dupes = findDuplicateEvidenceIds(items);
  return {
    count: items.length,
    adequate: assessments.filter((a) => a.qualityBand === 'adequate').length,
    weak: assessments.filter((a) => a.qualityBand === 'weak').length,
    limited: assessments.filter((a) => a.qualityBand === 'limited').length,
    duplicateIds: dupes,
    assessments,
  };
}
