# Stage 3+4 Institutional Hardening (review corrections applied)

**Branch:** `feat/stage4-institutional-hardening`

## Review fixes

1. **Aggregate numerical claims** — `lib/aggregate-claims.js` compares claimed numbers to `registry.aggregateMeta` (publishedCount, states, LGAs, duties, pulseTotal). Mismatches demoted; national/trend language blocked.
2. **Endpoint policies** — `validateSourceUrl(url, 'pulse'|'intelligence'|'mandateRecord')` enforces exact paths, no query/fragment/port/userinfo, fixed host.
3. **Streaming body limit** — `readBodyWithLimit` counts bytes while reading; aborts over max; Content-Length advisory only.
4. **Field-level claims** — `claim-guards.js` scans verifiedImplementation, publicCommitments, officialEvidence, communityReports, responsibilities.
5. **Independent fetches** — chat loads Pulse and intelligence separately; partial registry + `unavailableEvidence`.
6. **Citations** — malformed entries rejected; only server registry IDs retained; model sources discarded.

## Limits

Semantic entailment not solved. Structured brief API-only. Not production-approved until founder merge.

## main not merged · production not deployed
