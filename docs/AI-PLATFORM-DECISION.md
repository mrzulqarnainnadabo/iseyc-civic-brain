# AI Platform vs Civic Brain (this release)

## What Civic Brain implements directly (now)

- Server-owned system prompt and mode hints
- Request validation and size limits
- Best-effort per-isolate rate limiting
- Read-only Civic Mandate Intelligence retrieval + sanitization
- Evidence-first answer policy in the system prompt
- Provider fallback (Groq → Anthropic → xAI) without exposing keys

## What AI Platform could provide later

- Durable authentication / capability checks
- Shared rate limiting and audit trails
- Case → evidence → assertion workflows for **internal** operators
- Multi-tenant policy isolation

## Why not integrate AI Platform in this PR

- Adds operational dependency without fixing the immediate public-endpoint risks that we can address in-repo
- Civic methodology and publication rules belong in the civic domain layer, not a generic kernel
- Current Brain is Vite + Vercel serverless JS; AI Platform is a separate governed runtime

## Minimum conditions to adopt AI Platform later

1. Public Brain requires authenticated institutional users **or** a hardened edge gateway with shared quotas
2. Need durable audit of tool calls and evidence attachments
3. Founder-approved dependency and ops ownership

Until then, keep Brain self-contained with public read-only Mandate APIs.
