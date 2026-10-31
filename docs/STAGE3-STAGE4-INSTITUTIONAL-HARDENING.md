# Stage 3+4 Institutional Hardening

**Branch:** `feat/stage4-institutional-hardening` (from `feat/stage4-civic-intelligence-engine`)

## Trusted evidence model

1. Server fetches Pulse + Civic Intelligence via `safeFetchJson` (HTTPS host allowlist, timeout 8s, max 200KB, no redirects).
2. `buildTrustedRegistry` creates server-owned sources only (`mandate:<id>`, `intelligence:snapshot`).
3. Model `sources[]` is **not** trusted; brief output replaces sources with registry entries.
4. FACT citations must `resolveTrustedCitation` against the registry.
5. `sourceType: independently_verified` from the model is ignored; community submissions are `human_reviewed_published` only.
6. Empty registry ⇒ no FACT evidence.

## What community sources cannot establish

National prevalence, official acknowledgement, implementation, independently verified outcomes, referral sent.

## Limitations

- Heuristic relevance ≠ semantic entailment.
- Structured brief remains **API-only** (`format: civic_brief_v1`).
- Not production-ready until founder review, merge, and deploy.

## Main not merged / production not deployed by this work.
