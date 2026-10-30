/**
 * Practical citation relevance heuristics (not semantic entailment).
 * A matching source id proves the source exists in the brief payload — not that it supports the claim.
 * Never treat model self-assessment as independent verification.
 */

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were',
  'be', 'been', 'that', 'this', 'with', 'from', 'at', 'by', 'as', 'it', 'its', 'not',
  'no', 'yes', 'may', 'can', 'will', 'has', 'have', 'had', 'one', 'at', 'least',
]);

function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function overlapScore(a, b) {
  const ta = new Set(tokens(a));
  const tb = tokens(b);
  if (!ta.size || !tb.length) return 0;
  let hit = 0;
  for (const t of tb) if (ta.has(t)) hit++;
  return hit / Math.max(tb.length, 1);
}

/**
 * @param {object} claim - { text, classification }
 * @param {object} source - evidence metadata from sources[]
 * @returns {{ related: boolean, score: number, reasons: string[], supportLevel: string }}
 */
export function assessCitationRelevance(claim, source) {
  const reasons = [];
  if (!claim || !source) {
    return { related: false, score: 0, reasons: ['missing_claim_or_source'], supportLevel: 'unsupported' };
  }

  const claimText = claim.text || '';
  const hay = [source.title, source.subjectCategory, source.geoCoverage, source.publisher, source.sourceType]
    .filter(Boolean)
    .join(' ');

  const subjectScore = overlapScore(hay, claimText);
  if (subjectScore >= 0.15) reasons.push('subject_token_overlap');
  else reasons.push('weak_subject_overlap');

  let geoOk = true;
  if (source.geoCoverage && claimText) {
    const geoTokens = tokens(source.geoCoverage);
    const claimToks = new Set(tokens(claimText));
    const geoHit = geoTokens.some((g) => claimToks.has(g));
    // If claim names a place and source has geo, prefer some overlap
    const claimPlaces = tokens(claimText).filter((t) =>
      /kaduna|lagos|kano|ondo|zamfara|abuja|fct|nigeria|state|lga|ward/.test(t)
    );
    if (claimPlaces.length && source.geoCoverage && !geoHit) {
      geoOk = false;
      reasons.push('geographic_mismatch_signal');
    } else if (geoHit) reasons.push('geographic_overlap');
  }

  // Observation period: if both have dates far apart, flag (best-effort)
  if (source.publishedAt && claim.observationPeriod) {
    const a = Date.parse(source.publishedAt);
    const b = Date.parse(claim.observationPeriod);
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1000 * 60 * 60 * 24 * 800) {
      reasons.push('observation_period_far_apart');
    }
  }

  let score = subjectScore;
  if (!geoOk) score *= 0.4;

  // Source existence ≠ verification of claim
  const supportLevel =
    score >= 0.25 && geoOk
      ? 'plausible_related'
      : score >= 0.12
        ? 'weak_related'
        : 'unsupported';

  return {
    related: supportLevel !== 'unsupported',
    score,
    reasons,
    supportLevel,
    // Explicit: never independently_verified from this heuristic alone
    independentlyVerified: false,
  };
}

/**
 * Apply relevance to FACT findings. Mutates a copy of the brief findings.
 * Weak/unsupported → attach claimRelevance requires_human_review; optional demotion flag.
 */
export function applyRelevanceToFindings(brief) {
  if (!brief || !Array.isArray(brief.findings) || !Array.isArray(brief.sources)) {
    return { brief, demotions: [] };
  }
  const byId = new Map(brief.sources.map((s) => [s.id, s]));
  const demotions = [];
  const findings = brief.findings.map((f, i) => {
    if (!f || f.classification !== 'FACT' || !Array.isArray(f.citations) || !f.citations.length) {
      return f;
    }
    const assessments = f.citations.map((cid) => assessCitationRelevance(f, byId.get(cid)));
    const best = assessments.reduce(
      (a, b) => (b.score > a.score ? b : a),
      assessments[0] || { supportLevel: 'unsupported', score: 0, independentlyVerified: false }
    );

    if (best.supportLevel === 'unsupported' || best.supportLevel === 'weak_related') {
      demotions.push({ index: i, from: 'FACT', supportLevel: best.supportLevel });
      return {
        ...f,
        // Keep text; mark for review rather than silently inventing ANALYSIS rewrite by server
        classification: best.supportLevel === 'unsupported' ? 'UNKNOWN' : 'ANALYSIS',
        claimRelevance: {
          supportLevel: best.supportLevel,
          requiresHumanReview: true,
          independentlyVerified: false,
          note:
            'Citation id was present but relevance heuristics did not establish reliable support for this claim.',
          assessments,
        },
      };
    }

    return {
      ...f,
      claimRelevance: {
        supportLevel: best.supportLevel,
        requiresHumanReview: best.supportLevel !== 'plausible_related',
        independentlyVerified: false,
        note: 'Structural + heuristic relevance only; not independent verification.',
        assessments,
      },
    };
  });

  return { brief: { ...brief, findings }, demotions };
}
