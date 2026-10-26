# Civic Brain Agent Layer

This module adds the first governed agent primitive without replacing the existing Civic Brain UI or API contracts.

## Lifecycle

`new → triaged → planned → awaiting_approval → approved → executing → completed`

Failure can move to `failed` and work can be escalated when human intervention is required.

## Safety model

Consequential actions (publication, official communications, authoritative record mutations, and external writes) require a human approval token before execution. The queue records transitions in an append-only-in-memory audit trail; the production persistence layer should mirror these events into the existing Postgres audit-log design.

## Next integration

- Connect Civic Signal submissions to `createAction()`.
- Surface `awaiting_approval` items in the Digital Operations Centre.
- Add server-side execution adapters for approved action types.
- Persist action/audit records in Supabase/Postgres.
- Add scheduled stale-approval and stalled-action checks.
