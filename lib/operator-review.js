/**
 * Operator review notes for routing recommendations (in-memory shape only).
 * Does not persist; does not send external messages.
 */

import { canTransition } from './referral-lifecycle.js';

export function buildReferralBriefDraft(input) {
  const r = input.routing || {};
  const primary = r.primary;
  const lines = [];
  lines.push('ISEYC Civic Brain — Referral brief DRAFT (not sent)');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('## Demand');
  lines.push(input.mandateText || '(not provided)');
  lines.push('');
  lines.push('## Classification');
  lines.push('Duty: ' + (input.duty || '—'));
  lines.push('State: ' + (input.state || '—'));
  lines.push('LGA: ' + (input.lga || '—'));
  lines.push('Routing status: ' + (r.status || '—'));
  lines.push('');
  lines.push('## Recommended institution (pending human approval)');
  if (primary) {
    lines.push('Name: ' + primary.institutionalName);
    lines.push('Level: ' + primary.governmentLevel);
    lines.push('Role type: ' + (primary.roleType || '—'));
    lines.push('Confidence: ' + primary.confidence);
    lines.push('Reason: ' + primary.reason);
  } else {
    lines.push('None — needs review or more information.');
  }
  lines.push('');
  lines.push('## Additional institutions');
  for (const a of r.additional || []) {
    lines.push('- ' + a.institutionalName + ' (' + a.confidence + '): ' + a.reason);
  }
  if (!(r.additional || []).length) lines.push('- None listed');
  lines.push('');
  lines.push('## Missing information');
  for (const m of r.missingInformation || []) lines.push('- ' + m);
  if (!(r.missingInformation || []).length) lines.push('- None flagged by engine');
  lines.push('');
  lines.push('## Governance');
  lines.push('- This draft is not a referral.');
  lines.push('- External delivery is disabled until contacts, consent, and approval exist.');
  lines.push('- Model/system cannot mark referral_sent.');
  const gate = canTransition('referral_draft', 'referral_sent', {
    actorRole: 'model',
    hasEvidence: false,
    consentRecorded: false,
  });
  lines.push('- Model send attempt blocked: ' + !gate.ok + ' (' + (gate.reason || 'ok') + ')');
  lines.push('');
  lines.push('## Operator decision (fill manually)');
  lines.push('- [ ] Agree with primary');
  lines.push('- [ ] Override primary → _______________');
  lines.push('- [ ] Request more information from citizen/source');
  lines.push('- [ ] Do not refer');
  lines.push('Reviewer name/role: _______________  Date: _______________');
  return lines.join('\n');
}

export function makeOperatorDecision(input) {
  const allowed = new Set(['agree', 'override', 'need_more_info', 'do_not_refer']);
  const decision = allowed.has(input.decision) ? input.decision : null;
  if (!decision) return { ok: false, error: 'INVALID_DECISION' };
  if (input.actorRole === 'model') return { ok: false, error: 'MODEL_CANNOT_DECIDE' };
  return {
    ok: true,
    decision,
    overrideOfficeId: decision === 'override' ? input.overrideOfficeId || null : null,
    note: typeof input.note === 'string' ? input.note.slice(0, 1000) : '',
    at: new Date().toISOString(),
    actorRole: input.actorRole || 'authorised_operator',
  };
}
