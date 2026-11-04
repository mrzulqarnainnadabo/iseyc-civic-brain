# National evidence consumer v1.0

## Purpose

Civic Brain reads the ISEYC Observatory's public, versioned INEC evidence endpoint:

`GET https://iseyc-civic-intelligence-observator.vercel.app/api/evidence/inec?dataset=all`

The endpoint is an allowlisted transcription of official INEC publications. It is not a live INEC API or a complete current nationwide voter register.

## Current datasets

- 2023 national registered-voter and PVC collection totals, with 36-state/FCT rows.
- Ekiti 2026 governorship election register snapshot.
- Osun 2026 off-cycle PVC collection snapshot.
- INEC's 2025–2026 CVR phase-one statements and official timetable.

The client validates contract version, dataset IDs, publisher labels, HTTPS source links and record structures. Invalid, incomplete or unavailable evidence is disclosed; it is never replaced with a guessed number or a synthetic dataset.

## Chat integration

The chat handler retrieves three evidence streams in parallel:
1. Civic Mandate published-demand intelligence.
2. Community Observations published report feed.
3. Observatory INEC official-source snapshots.

These streams remain separate in the server prompt and response metadata. Community observations are not official statistics. Civic Mandate demands are not observed conditions. INEC records are not a representative survey of all eligible citizens.

The response metadata exposes INEC evidence availability, contract version, dataset IDs, source URL, retrieval time, error code and limitations.

## Research response structure

Simple factual questions use the short Civic Brief. Research, policy, institutional-accountability and broadcast preparation use all 12 questions:

1. What is happening?
2. Where is it happening?
3. Who is affected or represented in the available evidence?
4. What do we know?
5. What does the evidence suggest?
6. What might explain the situation?
7. Which institutions have responsibility?
8. What has been announced or committed?
9. What has actually been verified?
10. What remains unknown?
11. What should happen next?
12. Which sources support the findings?

The model must distinguish facts, source-reported claims, derived calculations, interpretation and hypotheses. Unknowns remain unknown.

## Important limitation

The INEC feed is the only new national institutional evidence stream wired into Civic Brain in this release. NBS, CBN, NPC, UBEC, budgets, procurement, health and state sources are listed in the Observatory source-readiness register but are not yet injected into Brain. They must not be claimed as available until their datasets have been acquired, validated and connected.

## Environment

Optional override:

`CIVIC_OBSERVATORY_INEC_EVIDENCE_URL`

Default:

`https://iseyc-civic-intelligence-observator.vercel.app/api/evidence/inec`

No credentials are required for this public read-only endpoint. Never add INEC, Observatory or Notion secrets to client-side code.
