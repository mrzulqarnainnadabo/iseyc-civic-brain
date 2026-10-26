import { describe, expect, it } from 'vitest';
import { canTransition, createAction, isOverdueApproval, transitionAction } from './actionQueue';

describe('Civic Brain action governance', () => {
  it('allows the governed lifecycle', () => {
    expect(canTransition('new', 'triaged')).toBe(true);
    expect(canTransition('triaged', 'planned')).toBe(true);
    expect(canTransition('planned', 'awaiting_approval')).toBe(true);
    expect(canTransition('awaiting_approval', 'approved')).toBe(true);
    expect(canTransition('approved', 'executing')).toBe(true);
    expect(canTransition('executing', 'completed')).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(canTransition('new', 'executing')).toBe(false);
  });

  it('requires human approval for consequential actions', () => {
    const action = createAction({ type: 'publish', proposedAction: 'Publish approved civic update' });
    const approved = transitionAction(action, 'triaged');
    const planned = transitionAction(approved, 'planned');
    const waiting = transitionAction(planned, 'awaiting_approval');
    const approvedAction = transitionAction(waiting, 'approved', { approvedBy: 'human' });
    expect(() => transitionAction(approvedAction, 'executing')).toThrow(/Human approval/);
    expect(transitionAction(approvedAction, 'executing', { approvedBy: 'human' }).state).toBe('executing');
  });

  it('detects stale approval requests', () => {
    const old = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const action = createAction({ state: 'awaiting_approval', updatedAt: old });
    expect(isOverdueApproval(action)).toBe(true);
  });
});
