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

Includes Kaduna **specialised patterns** (SUBEB, PHC, water, works) with `verificationStatus: partial` and `routingEligibility: review_only`.

## Engine

`lib/routing-engine.js` → `routeMandate(input)`  
API: `POST /api/route-mandate`

Prefer specialised operational patterns over generic political labels when state matches pilot depth.

## Operator support

`lib/operator-review.js` — brief draft + decision helper. Model cannot decide or send.

## Lifecycle guards

`lib/referral-lifecycle.js` — model cannot publish, send, or complete gated stages.

## Pilot limits

- External delivery always disabled  
- Human review always required  
- Incomplete national directory represented honestly  
- No automated Vercel deploy from this project’s agent workflows  
