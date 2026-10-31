# API: civic_brief_v1 (updated — institutional hardening)

## Status

**API-only.** Product UI uses narrative chat.

## Request

```json
{
  "mode": "civic",
  "format": "civic_brief_v1",
  "messages": [{ "role": "user", "content": "What do published Health records show for Kaduna?" }]
}
```

## Validation

- Citations resolve only against **server trusted registry** built from published Pulse/intelligence.
- Model-invented source IDs cannot support FACT.
- Output `sources` are server-owned; model metadata is discarded.
- `claimRelevance.independentlyVerified` is always false from this path.
- Fallback: `briefValid: false`, `format: narrative_fallback`.

## Limits

Semantic entailment not proven. Human review required for consequential decisions.
