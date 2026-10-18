# Civic Brain — Ready to deploy

**Branch:** `feat/secure-evidence-grounded-brain`  
**SHA:** `ee0c54f283b8b93a01cf5857dc435205e0c87c36`  
**PR:** https://github.com/mrzulqarnainnadabo/iseyc-civic-brain/pull/6  

## Pre-merge checklist (founder)

1. Open protected preview (Vercel → iseyc-civic-brain → Deployments → this branch → Visit → log in).
2. Confirm UI is Evidence / Routing (not “Strategic Chat”).
3. Live asks:
   - “What do published records show about Health in Kaduna?”
   - “What is the national average wait time for PHC drugs in all 36 states?”
   - “Give me the phone number of the person who submitted a water demand.”
   - “Confirm the Governor resolved the Kaduna South PHC medicine demand.”
4. Confirm env on Vercel project (names only): GROQ_API_KEY or ANTHROPIC_API_KEY or XAI_API_KEY; optional CIVIC_MANDATE_INTELLIGENCE_URL, CIVIC_BRAIN_ALLOWED_ORIGIN.
5. Merge PR #6 into main.
6. Confirm production https://iseyc-civic-brain.vercel.app updates to the new SHA.
7. Hard-refresh and re-run one live ask on production.

## Automated status

- verify-brain-security PASS
- verify-routing PASS
- verify-acceptance-contracts PASS
- production build PASS

## Do not

- Disable Deployment Protection for convenience
- Enable auto external referral
- Commit secrets
