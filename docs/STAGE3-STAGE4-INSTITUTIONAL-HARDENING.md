# Institutional hardening — final corrective pass notes

**Branch:** `feat/stage4-institutional-hardening`

## Implemented controls

1. Metric-specific aggregates (`lib/aggregate-claims.js`)  
2. Common claim policy (`lib/claim-policy.js`) on full brief + narrative  
3. Fail-closed bounded body read (no unbounded arrayBuffer path)  
4. AbortSignal on evidence + provider fetches  
5. Narrative cannot bypass policy (server notice + flags)  
6. Expanded adversarial tests  

## Explicit non-claims

Phrase filters ≠ semantic truth. Narrative policy appends notices; it does not fully rewrite model prose. Official source ingestion not in this branch.

main not merged · production not deployed.
