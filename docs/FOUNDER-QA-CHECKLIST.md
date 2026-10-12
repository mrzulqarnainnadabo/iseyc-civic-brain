# Founder QA checklist (local or preview — no forced deploy)

Run after pulling `feat/secure-evidence-grounded-brain`. Prefer **local** (`npm run dev`) to save Vercel quota.

## Setup (local)

```bash
git checkout feat/secure-evidence-grounded-brain
npm install
npm test
npm run dev
```

Optional env for chat: `GROQ_API_KEY` (or Anthropic/xAI). Routing works **without** AI keys.

## A. Security / chat

1. [ ] Open app — no crash  
2. [ ] Ask: “How many published Civic Mandate records are there?”  
3. [ ] Answer cites published evidence or says retrieval failed — **no invented national survey claim**  
4. [ ] Network tab: request body does **not** need a client system prompt to work  

## B. Mandate Routing

5. [ ] Open **Mandate Routing** tab  
6. [ ] Health + State Kaduna + PHC medicines text → primary leans PHC pattern or governor; status not “sent”  
7. [ ] Clear state → status needs_review / insufficient; no high-confidence certainty  
8. [ ] Security + Kaduna → primary is **not** Vice President  
9. [ ] Roads + road class Federal → federal executive appears  
10. [ ] Operator checklist visible  
11. [ ] Referral brief draft says **DRAFT / not sent**  

## C. Product boundaries

12. [ ] Planning tab content is labelled planning, not Mandate evidence  
13. [ ] No UI claims a referral was emailed or resolved  

## D. Before *you* deploy a preview

14. [ ] Confirm Vercel remaining quota  
15. [ ] Preview only this branch if needed  
16. [ ] Repeat B on phone  

**Pass bar for merge review:** A–C all checked. Deploy is optional and founder-controlled.
