# Civic Brain ↔ Civic Mandate data contract

**Status:** Implemented for aggregate Civic Intelligence (v1)  
**Brain must never use Notion credentials or private fields.**

## Primary endpoint (aggregates)

`GET https://2027-street-mandate.vercel.app/api/civic-intelligence`

Optional override via env `CIVIC_MANDATE_INTELLIGENCE_URL` (HTTPS only).

### Success shape (allowlisted by Brain)

| Field | Type | Notes |
|-------|------|--------|
| version | string | e.g. `1.0.0` |
| generatedAt | ISO string | Snapshot time |
| publishedCount | number | Published records only |
| statesRepresented | number | Distinct states |
| lgasRepresented | number | Distinct LGA labels |
| dutiesRepresented | number | Distinct duties |
| periodStart / periodEnd | string \| null | From record created times |
| truncated | boolean | Upstream fetch truncated |
| duties[] | { duty, count, shareOfPublished } | Among published only |
| states[] | { state, count, shareOfPublished } | |
| offices[] | { office, count, shareOfPublished } | |
| topLgas[] | { state, lga, count } | Capped |
| methodology[] | string[] | |
| limitations[] | string[] | |
| framingLine | string | Honest framing |

### Error shape

HTTP 503 with `{ "error": "CIVIC_INTELLIGENCE_UNAVAILABLE" }`.

Brain behaviour: state retrieval failed; **do not invent counts**.

## Pulse endpoint

`GET /api/pulse` exposes public voice fields. This Brain revision grounds on **Civic Intelligence aggregates**, not unbounded Pulse dumps.

## Private (never)

Unpublished rows, demographics, fingerprints, operator notes, receipts, secrets, Notion tokens.
