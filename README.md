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

Current evidence/response work: `feat/concise-observatory-evidence` (draft PR #44).


## National evidence and concise answers

Civic Brain reads two separate Observatory evidence surfaces:
- `/api/evidence/snapshots` for the existing National Department Snapshot contract.
- `/api/evidence/source-snapshots` for source-attributed national observations, catalogue-only research leads, reconciliation notes and state-budget source coverage.

The source-observation client is read-only and uses fixed endpoint, source-ID and publisher-host allowlists. The Observatory pack contains 104 curated observations from 18 observation sources, 28 catalogue-only or partially integrated sources and 105 registered source entries. Brain selects at most six relevant observations, three catalogue leads and three relevant reconciliation notes. Catalogue entries are never treated as numeric evidence.

Current source coverage is deliberately partial: 15 official state budget portals and three additional official state budget documents have been located; 18 states remain unreviewed in this discovery pass. The fiscal-transparency availability table covers all 36 states; Agora Policy's 2025 state fiscal outturn table covers 35 states (Rivers excluded); H1 2026 sector-spending comparisons cover 34 states. The FCT is tracked separately.

The latest BudgIT H1 2026 health report reports ₦621.34bn across 34 states; an earlier infographic reported ₦614.55bn. The discrepancy remains unresolved and is disclosed in answers where relevant. Agora Policy cites Lagos 2025 IGR at ₦1.85tn while BudgIT cites ₦1.71tn; both are retained with a reconciliation note. Anambra's official Q3 2026 BIR is also available for state-specific fiscal questions. NCC reports 128.02m active broadband subscriptions and 59.05% subscription-based penetration in September 2026, while World Bank/ITU internet use is 41.21% for 2024; these measure different things.

### Response standard

- Default answer length: 45–90 words; hard ceiling 120 words.
- One to three short sentences or bullets.
- No forced headings for ordinary questions.
- Sources and reconciliation details are collapsed and available on demand.
- Structured Civic Briefs remain separate and require human review.
