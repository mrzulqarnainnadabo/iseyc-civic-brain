# ISEYC Civic Brain

Evidence tool for **published** Civic Mandate Nigeria records, plus **recommendation-only** institutional routing.

> Duty over personality. Not a poll. Not an endorsement.

## What it does

- **Evidence** — questions grounded on published Civic Mandate aggregates (pilot data, not a national survey)
- **Routing** — deterministic recommendation of responsible institutions; **never auto-sends**; always requires human review

## What it does not do

- Invent published counts or national public opinion
- Rank candidates or issue awards
- Contact officeholders or claim a referral was sent
- Expose internal planning tools on the public surface

## Stack

- React + Vite
- Serverless `api/chat.js`, `api/route-mandate.js`
- Providers via server env only (Groq / Anthropic / xAI)

## Local

```bash
npm install
npm test
npm run build
npm run dev
```

## Deploy (founder)

See `docs/DEPLOY-TOGETHER.md` (deploy Mandate + Brain in one window).

Active branch: `feat/secure-evidence-grounded-brain` (PR #6)
