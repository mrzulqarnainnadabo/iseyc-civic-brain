/**
 * Public accountability state model — distinct, non-interchangeable states.
 * Aligns with referral-lifecycle.js; clarifies what each state does NOT prove.
 */

export const ACCOUNTABILITY_STATES = Object.freeze([
  'community_issue_reported',
  'record_published',
  'referral_prepared_for_review',
  'referral_approved_or_sent',
  'institution_acknowledged',
  'institution_announced_commitment',
  'implementation_evidence_available',
  'outcome_independently_verified',
  'outcome_unverified_or_disputed',
]);

/** What a state must not be confused with. */
export const STATE_DOES_NOT_MEAN = Object.freeze({
  community_issue_reported: 'Not published; not national prevalence; not official action.',
  record_published: 'Not proof the institution received or acted on the demand.',
  referral_prepared_for_review: 'Not sent; not acknowledgement.',
  referral_approved_or_sent: 'Not acknowledgement, implementation, or successful outcome.',
  institution_acknowledged: 'Not implementation or successful delivery.',
  institution_announced_commitment: 'Not verified implementation.',
  implementation_evidence_available: 'Not automatically a successful or complete outcome.',
  outcome_independently_verified: 'Only applies when independent verification evidence is recorded.',
  outcome_unverified_or_disputed: 'Not a closed success; remains open or contested.',
});

const ORDER = ACCOUNTABILITY_STATES;

export function canAdvanceAccountability(from, to, ctx = {}) {
  if (!ACCOUNTABILITY_STATES.includes(to)) {
    return { ok: false, reason: 'unknown_state' };
  }
  if (ctx.actorRole === 'model') {
    // Model may only propose early analytical states
    if (to !== 'referral_prepared_for_review' && to !== 'community_issue_reported') {
      return { ok: false, reason: 'model_cannot_set_operational_state' };
    }
  }
  if (to === 'referral_approved_or_sent') {
    if (ctx.actorRole !== 'authorised_operator') {
      return { ok: false, reason: 'authorised_operator_required' };
    }
    if (!ctx.consentRecorded) return { ok: false, reason: 'consent_required' };
  }
  if (to === 'outcome_independently_verified' && !ctx.hasIndependentEvidence) {
    return { ok: false, reason: 'independent_evidence_required' };
  }
  if (from && ORDER.indexOf(from) > ORDER.indexOf(to) && !ctx.allowRegression) {
    return { ok: false, reason: 'regression_not_allowed' };
  }
  return { ok: true };
}

export function describeState(state) {
  return {
    state,
    doesNotMean: STATE_DOES_NOT_MEAN[state] || 'Unknown state.',
  };
}
