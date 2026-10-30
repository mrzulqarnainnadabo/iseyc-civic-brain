# Stage 3 — Evidence integration

## Changes

1. `lib/public-mandate-dto.js` — PublicMandateRecord allowlist + community EvidenceRecord mapper.
2. `lib/civic-evidence.js` — `fetchPublishedRecords` + citation block for chat.
3. `api/public-records.js` — uses allowlist (drops unknown/private keys).
4. `api/chat.js` — injects aggregate intelligence **and** sample published records with `record_id`.
5. `scripts/verify-public-mandate-dto.mjs` — automated privacy/DTO tests.

## Behaviour

- Still published-only; still no Notion credentials on Brain.
- Community reports labelled for citation; not prevalence stats.
- Default chat format (Civic Brief headings) unchanged.

## Verify

```bash
npm test
npm run build
```

## Live dependency

Requires public Mandate `GET /api/pulse` (observed total 24 on 2026-10-30).
