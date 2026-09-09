export const ACTION_STATES = Object.freeze([
  'new',
  'triaged',
  'planned',
  'awaiting_approval',
  'approved',
  'executing',
  'completed',
  'failed',
  'escalated',
]);

const TRANSITIONS = {
  new: ['triaged', 'escalated'],
  triaged: ['planned', 'escalated'],
  planned: ['awaiting_approval', 'escalated'],
  awaiting_approval: ['approved', 'escalated'],
  approved: ['executing', 'escalated'],
  executing: ['completed', 'failed', 'escalated'],
  completed: [],
  failed: ['planned', 'escalated'],
  escalated: ['triaged', 'planned'],
};

export const CONSEQUENT_ACTION_TYPES = new Set([
  'publish',
  'send_official_communication',
  'mutate_authoritative_record',
  'external_write',
]);

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function requiresHumanApproval(action) {
  return CONSEQUENT_ACTION_TYPES.has(action?.type) || action?.requiresApproval === true;
}

export function createAction(input = {}) {
  return {
    id: input.id ?? `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    state: input.state ?? 'new',
    type: input.type ?? 'draft',
    title: input.title ?? 'Untitled action',
    source: input.source ?? 'civic-brain',
    pillar: input.pillar ?? null,
    geography: input.geography ?? null,
    owner: input.owner ?? null,
    urgency: input.urgency ?? 'normal',
    confidence: typeof input.confidence === 'number' ? input.confidence : null,
    proposedAction: input.proposedAction ?? '',
    requiresApproval: requiresHumanApproval(input),
    dryRun: input.dryRun ?? true,
    result: null,
    audit: [],
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function transitionAction(action, nextState, metadata = {}) {
  if (!canTransition(action.state, nextState)) {
    throw new Error(`Invalid action transition: ${action.state} -> ${nextState}`);
  }
  if (nextState === 'executing' && requiresHumanApproval(action) && metadata.approvedBy == null) {
    throw new Error('Human approval is required before executing this action.');
  }

  const now = new Date().toISOString();
  return {
    ...action,
    state: nextState,
    updatedAt: now,
    audit: [
      ...(action.audit ?? []),
      {
        timestamp: now,
        from: action.state,
        to: nextState,
        actor: metadata.actor ?? 'civic-brain',
        approvedBy: metadata.approvedBy ?? null,
        note: metadata.note ?? null,
      },
    ],
  };
}

export function isOverdueApproval(action, now = Date.now(), timeoutMs = 48 * 60 * 60 * 1000) {
  if (action?.state !== 'awaiting_approval') return false;
  return now - Date.parse(action.updatedAt ?? action.createdAt) > timeoutMs;
}
