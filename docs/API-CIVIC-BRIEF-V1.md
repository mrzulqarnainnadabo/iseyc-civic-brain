# API: Structured Civic Brief (`civic_brief_v1`)

## Status

**API-only.** The product UI (`EvidenceWorkspace`) does **not** send `format: "civic_brief_v1"`. It uses narrative chat with the four Civic Brief headings.

## Request

`POST /api/chat`

```json
{
  "mode": "civic",
  "format": "civic_brief_v1",
  "messages": [
    { "role": "user", "content": "What do published Health records show for Kaduna?" }
  ]
}
```

| Field | Values |
|-------|--------|
| `mode` | `civic` \| `research` \| `planning` (default `civic`) |
| `format` | `narrative` (default) \| `civic_brief_v1` |
| `messages` | user/assistant only; last must be user |

## Success response (validated)

```json
{
  "content": [{ "type": "text", "text": "{...raw model json...}" }],
  "brief": { "schemaVersion": "1.0.0", "executiveSummary": "...", "findings": [], "sources": [], "validationNote": "..." },
  "briefValid": true,
  "format": "civic_brief_v1",
  "provider": "groq",
  "model": "...",
  "evidence": { "available": true, "recordsInContext": 24 }
}
```

## Fallback response (invalid model JSON or failed validation)

```json
{
  "content": [{ "type": "text", "text": "**What the public record shows**\n..." }],
  "brief": null,
  "briefValid": false,
  "briefErrors": ["fact_missing_citations:0"],
  "format": "narrative_fallback",
  "evidence": {}
}
```

Fallback is **never** a validated structured brief.

## UI work required later (not in this PR)

1. Optional toggle “Structured brief” in EvidenceWorkspace.
2. Pass `format: "civic_brief_v1"` when enabled.
3. Render `brief` object in sections; if `briefValid: false`, show narrative fallback only.
4. Surface `claimRelevance.requiresHumanReview` badges.
5. Accessibility and mobile layout for long JSON-derived sections.

## Env

Same as existing chat: `GROQ_API_KEY` (or Anthropic/xAI). Optional `CIVIC_MANDATE_PULSE_URL`, `CIVIC_MANDATE_INTELLIGENCE_URL`.
