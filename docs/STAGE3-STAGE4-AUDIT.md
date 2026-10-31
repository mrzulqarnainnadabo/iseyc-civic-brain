# Stage 3 + Stage 4 integration audit (2026-10-30)

## PR structure recommendation: **A — one consolidated PR**

Stage 4 is based on Stage 3 and shares chat/evidence paths. Splitting would force rebase noise. Ship **one** PR from `feat/stage4-civic-intelligence-engine` → `main` covering Stage 3+4.

Do **not** open a second parallel Stage 3 PR against main.

## Live Civic Mandate integration (read-only)

| Endpoint | Result |
|----------|--------|
| `GET https://2027-street-mandate.vercel.app/api/pulse` | **24** voices, 3 states |
| Sample id | `4005db88ef468116ae20ec69bc81b114` |
| Fields | id, sentence, duty/mandate, office, state, lga, created |
| PII in sample | **None** observed |
| Production Brain `/api/public-records` | Returns same 24 with `publicUrl` (pre-Stage3 deploy shape; Stage 3 allowlist not yet on production) |

**Citation accuracy:** Chat injects `record_id` + text from Pulse. Structural ID match is enforced in structured brief mode. **Semantic support of a claim by a citation is not fully proven by ID match** — disclosed in `validationNote`.

## Stage 4 challenge results (after hardening)

| Attack | Result |
|--------|--------|
| Unsupported FACT (no citations) | **Blocked** |
| Citation to nonexistent ID | **Blocked** |
| Citation ID exists but claim is completion language without independent source | **Blocked** (new) |
| Invented responsibility with verificationStatus=verified and no basis | **Blocked** (new) |
| Community prevalence “% of Nigerians” | **Blocked** |
| Announcement as completed implementation | **Blocked** (new) |
| Outcome independently verified without evidence flag (lifecycle) | **Blocked** |
| Malformed JSON / wrong schema | **Blocked**; chat returns narrative_fallback |
| Fallback labelled as validated brief | **No** — `briefValid: false`, `format: narrative_fallback` |

**Remaining honest limit:** A carefully worded FACT with a real but **irrelevant** citation ID can still pass structural validation. Full NLP entailment is not implemented.

## UX: `civic_brief_v1`

- Product UI (`EvidenceWorkspace`) sends **narrative only** (`mode: civic`, no `format`).
- Structured mode is **API-only** until a UI control is added.
- UI still labels assistant cards “Civic Brief” meaning the **narrative four-heading** format — not the JSON schema.

## Tests executed

```
npm test  → must pass after this commit
npm run build → must pass
```

## Production / merge

- Do not merge without founder review.
- Production Brain does not yet include Stage 3/4 until merge + Vercel deploy.
