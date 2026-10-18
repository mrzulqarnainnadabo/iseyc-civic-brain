# Deploy Civic Mandate + Civic Brain together

**Do not deploy from automation.** Founder merges PRs, then deploys when Vercel quota allows.

## PRs to merge (order)

1. **Civic Mandate** — https://github.com/mrzulqarnainnadabo/2027-street-mandate/pull/62  
   Branch: `feat/pilot-trust-framing` → `main`
2. **Civic Brain** — https://github.com/mrzulqarnainnadabo/iseyc-civic-brain/pull/6  
   Branch: `feat/secure-evidence-grounded-brain` → `main`

## Pre-merge checks (local)

### Mandate
```bash
npm install && npm test && npx tsc --noEmit && npm run build
```

### Brain
```bash
npm install && npm test && npm run build
```

## Vercel (after merge)

### Mandate project (`2027-street-mandate`)
- Production tracks `main`
- Keep existing Notion env — do not change unless broken
- Deploy production from `main` after PR #62 merge

### Brain project (`iseyc-civic-brain`)
- Production tracks `main`
- Env (set if missing):
  - `GROQ_API_KEY` and/or `ANTHROPIC_API_KEY` / `XAI_API_KEY`
  - Optional: `CIVIC_MANDATE_INTELLIGENCE_URL=https://2027-street-mandate.vercel.app/api/civic-intelligence`
  - Optional: `CIVIC_BRAIN_ALLOWED_ORIGIN`, `CIVIC_BRAIN_RATE_LIMIT_PER_MIN`
- Deploy production from `main` after PR #6 merge

## Phone QA (15 min) after both are live

1. Mandate home: pilot language; form works; Pulse honest empty/unavailable
2. Mandate → How it works / footer link to Brain
3. Brain Evidence: published snapshot; no national-opinion claim
4. Brain Routing: Health + Kaduna → **Human review required. Not sent to anyone.**
5. Both footers: Strictly Non-Partisan

## Rollback

- Vercel → previous deployment per project only
- Do not rewrite Notion production data as part of rollback
