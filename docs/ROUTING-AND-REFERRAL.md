# Mandate routing & referral lifecycle (pilot)

## Separation of concerns

| Concept | Meaning |
|---------|---------|
| Published | CM Status=Published after human moderation |
| Routing recommendation | Deterministic suggestion of institution(s) |
| Referral draft | Human-readable brief — not sent |
| Referral sent | Authorised operator + consent + channel evidence |
| Delivered / acknowledged / answered / resolved | Separate evidenced events |

## Registry

`lib/office-registry.js` — institutional entries only. No invented officeholders or contacts.

## Engine

`lib/routing-engine.js` → `routeMandate(input)`  
API: `POST /api/route-mandate`

## Lifecycle guards

`lib/referral-lifecycle.js` — model cannot publish, send, or complete gated stages.

## Pilot limits

- External delivery always disabled
- Human review always required
- Incomplete national directory represented honestly
