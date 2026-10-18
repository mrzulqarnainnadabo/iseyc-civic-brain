# Civic Brain — deployment readiness (no deploy yet)

**Policy:** Do not deploy from automation. Founder controls Vercel usage and limits.

## Code readiness checklist

- [x] Server-owned system prompt; client cannot override
- [x] Chat validation, CORS restriction pattern, rate-limit (best-effort)
- [x] Civic Mandate Intelligence read-only evidence adapter
- [x] Deterministic routing + lifecycle guards
- [x] Pilot registry without invented officeholders/contacts
- [x] Kaduna specialised institutional patterns (partial verification)
- [x] Operator referral brief draft (not sent)
- [x] Security + routing automated tests
- [x] Production build (`vite build`) succeeds in engineering environment

## Before *you* deploy a preview (founder action)

1. Confirm Vercel project for Civic Brain and remaining quota.
2. Set env (names only): `GROQ_API_KEY` and/or `ANTHROPIC_API_KEY` / `XAI_API_KEY`
3. Optional: `CIVIC_BRAIN_ALLOWED_ORIGIN`, `CIVIC_MANDATE_INTELLIGENCE_URL`, `CIVIC_BRAIN_RATE_LIMIT_PER_MIN`
4. Deploy **preview** of `feat/secure-evidence-grounded-brain` only if quota allows.
5. Phone QA: Civic Intelligence question + Mandate Routing (Health/Kaduna) + confirm no "sent" claim.

## Before production

- Durable rate limiting (edge/WAF or shared store)
- Verified contacts only if external referral is ever enabled
- Operator auth for gated lifecycle stages
- Explicit merge approval

## Residual risks (accepted until addressed)

- In-memory rate limit is per isolate, not global
- Registry is pilot-incomplete; specialised names need local confirmation
- No persistent operator audit store yet
