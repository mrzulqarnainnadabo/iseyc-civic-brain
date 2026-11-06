# Structured Civic Brief v1 — API contract

## Availability

The structured format is API-only. Narrative chat remains the default. The product UI does not enable this format automatically.

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

- `mode`: `civic`, `research`, or `planning`; defaults to `civic`.
- `format`: `narrative` or `civic_brief_v1`; defaults to `narrative`.
- Messages remain user/assistant only; the last message must be from the user.

## Server-owned citation boundary

The model cannot author the source registry.

Before calling the model, the server builds a per-request allowlist from the validated evidence bundles it actually retrieved:

- Canonical Civic Mandate CommunityRecord v0.1 records only. The legacy pulse compatibility fallback is excluded from structured citations.
- Published Community Observations that passed the source client's contract and publication checks.
- INEC datasets returned by the allowlisted ISEYC Observatory endpoint and validated against official INEC source domains.
- The Civic Mandate aggregate snapshot, kept distinct from record-level sources.

Each source receives a stable server-generated ID. The server injects this manifest into the model context. Any model source ID or FACT citation not present in that exact request's allowlist is rejected.

The server discards all model-authored source metadata and reconstructs the returned `sources[]` from its own allowlist. A matching ID establishes only that the source was retrieved for this request; it does not establish that the source semantically supports the claim.

## Evidence-array rules

- Every FACT finding must cite one or more IDs from the server allowlist.
- Every `communityReports[]` item must reference an allowlisted community record/observation source. The server reconstructs its text and metadata from the retrieved record; model-authored report text is discarded.
- Every `officialEvidence[]` item must reference an allowlisted official source. The server reconstructs the returned source metadata.
- `publicCommitments[]` is withheld until a dedicated trusted public-commitment source is connected.
- Model-generated institutional responsibilities are always marked unverified and require human review. A model cannot independently verify an institution's legal duty.
- `verifiedImplementation[]` is rejected while the server has no independent outcome-verification source.
- Citation relevance is a heuristic only. Every structured finding remains marked for human review.

## Validation scope

`briefValid: true` means the JSON structure passed schema checks and all cited source IDs belonged to the server-owned allowlist. It does **not** mean that claims have been independently verified, that citations semantically entail the claims, or that implementation has occurred.

The response includes `briefValidationScope` and each finding includes a `claimRelevance` assessment with `requiresHumanReview: true`.

If JSON parsing or validation fails, the API returns a narrative fallback with `brief: null` and `briefValid: false`. Invalid model JSON is never returned as a validated structured brief.

## Not included

- No autonomous contact with public officials.
- No automatic referrals or workflow actions.
- No public rankings, polls, prevalence estimates, or endorsements.
- No independent verification of outcomes.
- No UI toggle; this remains an API-only contract pending separate UX and accessibility review.
