/**
 * Referral / case lifecycle — separate from Civic Mandate publication status.
 * Published ≠ referred ≠ delivered ≠ acknowledged ≠ answered ≠ resolved.
 */

export const LIFECYCLE_STAGES = [
  'demand_submitted',
  'demand_moderated',
  'published_record',
  'routing_recommendation',
  'human_routing_review',
  'referral_draft',
  'referral_approved',
  'referral_sent',
  'delivery_evidence_recorded',
  'acknowledgement_verified',
  'substantive_response_recorded',
  'outcome_reviewed',
  'case_closed',
  'case_escalated',
];

export const SAFE_AUTOMATED_STAGES = new Set([
  'routing_recommendation',
  'referral_draft',
]);

export const HUMAN_GATED_STAGES = new Set([
  'human_routing_review',
  'referral_approved',
  'referral_sent',
  'delivery_evidence_recorded',
  'acknowledgement_verified',
  'substantive_response_recorded',
  'outcome_reviewed',
  'case_closed',
  'case_escalated',
]);

export function canTransition(from, to, ctx = {}) {
  if (!LIFECYCLE_STAGES.includes(to)) {
    return { ok: false, reason: 'unknown_target_stage' };
  }
  if (to === 'referral_sent') {
    if (!ctx.consentRecorded) return { ok: false, reason: 'consent_required_before_send' };
    if (!ctx.hasEvidence) return { ok: false, reason: 'delivery_channel_evidence_required' };
    if (ctx.actorRole !== 'authorised_operator') return { ok: false, reason: 'authorised_operator_required' };
  }
  if (HUMAN_GATED_STAGES.has(to) && ctx.actorRole === 'model') {
    return { ok: false, reason: 'model_cannot_advance_gated_stage' };
  }
  if (to === 'published_record' && ctx.actorRole === 'model') {
    return { ok: false, reason: 'model_cannot_publish' };
  }
  return { ok: true };
}

export function createCaseShell(input = {}) {
  return {
    caseId: input.caseId || 'case-draft-' + Date.now(),
    recordId: input.recordId || null,
    stage: 'routing_recommendation',
    routing: input.routing || null,
    audit: [
      {
        at: new Date().toISOString(),
        stage: 'routing_recommendation',
        actorRole: input.actorRole || 'system',
        note: 'Routing recommendation generated; not sent externally.',
      },
    ],
    externalActions: [],
  };
}
