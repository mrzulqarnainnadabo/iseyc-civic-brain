# Open-source capability evaluation (Civic Brain)

Evaluation date: 2026-10-18. Principle: smallest effective combination; no paid cost without founder approval.

| Project | Problem it could solve | Licence / cost | Runtime fit (Vercel serverless) | Privacy | Decision |
|---------|------------------------|----------------|----------------------------------|---------|----------|
| **Ragas** | RAG faithfulness metrics | Apache-2.0; free self-run | Python-heavy; not native to this JS serverless app | Needs sample prompts/answers offline | **Later** — offline eval notebooks, not production runtime |
| **Langfuse** | LLM tracing / eval UI | OSS + optional cloud | Self-host heavy; cloud may bill and export prompts | **Risk**: civic prompts off-prem | **Not now** — local scripts + redaction; revisit if self-hosted with DPA |
| **Presidio** | PII detection | MIT | Python service; overkill for current surface | Good NLP PII | **Not now** — lightweight `lib/redact.js` for logs |
| **OpenTelemetry JS** | Request traces | Apache-2.0 | Possible on Node; adds complexity | Safe if no PII in spans | **Later** — after product stabilises |
| **Crawl4AI** | Web ingest | Apache-2.0 | Separate worker; not Vercel-friendly as-is | Crawl / ToS risk | **Not now** — primary source is Civic Mandate API |
| **Haystack** | Full RAG pipelines | Apache-2.0 | Python stack; more than we need | — | **Not now** — adapter + prompt adequate for pilot |

## Public data APIs

| Source | Use | Notes | Decision |
|--------|-----|-------|----------|
| **Civic Mandate `/api/civic-intelligence`** | Primary published evidence | Already integrated | **Keep primary** |
| World Bank Indicators | Macro context | Not street-level demands | Optional later, labelled secondary |
| OpenAlex | Research literature | Academic | Later |
| Wikidata | Entity facts | Ambiguity risk | Later with human review |
| OSM / Nominatim | Geocoding | Rate limits | Later for location assist only |

## Adopted in this branch (no new paid deps)

1. Provenance labels in evidence block (source URL, primary source, retrieved_at).
2. Stronger prompt rules for privacy + resolution claims.
3. Lightweight log redaction helper.
4. Automated acceptance contracts for the five founder scenarios.
