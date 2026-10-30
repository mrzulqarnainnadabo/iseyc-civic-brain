# Stage 4 — Civic Intelligence Engine

**Base branch:** `feat/stage3-evidence-integration` (Stage 3 **not** merged to `main` at implementation time).

## Modules

| Module | Role |
|--------|------|
| `lib/civic-brief-engine.js` | Structured brief validation, JSON extract, safe fallback |
| `lib/evidence-quality.js` | Provenance / stale / duplicate / geo mismatch helpers |
| `lib/accountability-states.js` | Distinct lifecycle states; model cannot fake send/verify |
| `api/chat.js` | `format: "civic_brief_v1"` optional; default narrative unchanged |

## API

```json
{ "messages": [{ "role": "user", "content": "..." }], "mode": "civic", "format": "civic_brief_v1" }
```

On valid brief: `briefValid: true`, `brief: { ... }`.
On invalid model JSON: `format: "narrative_fallback"`, never presents invalid JSON as verified brief.

## Tests

```bash
npm test   # includes verify-stage4-engine.mjs
npm run build
```
