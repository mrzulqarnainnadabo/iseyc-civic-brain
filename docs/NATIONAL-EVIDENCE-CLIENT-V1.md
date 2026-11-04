# National official evidence consumer v1

## Purpose

Civic Brain now has a read-only client for the INEC evidence contract published by the ISEYC Civic Intelligence Observatory. This extends Brain beyond Civic Mandate demand aggregates and community observations while keeping those evidence streams separate.

## Upstream

- Endpoint: `https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/inec`
- Contract: `1.0.0`
- Publisher represented: Independent National Electoral Commission (INEC)
- Source of the endpoint: ISEYC Observatory allowlisted transcriptions of official INEC publications.
- This is not a live INEC API.

## Supported datasets

- `2023-pvc`: 2023 validated voter register and collected PVCs, with state/FCT rows and source arithmetic warnings.
- `cvr-2025-26`: official phase-one registration statements and the missing final consolidated post-CVR register.
- `ekiti-2026-register`: Ekiti election-specific register snapshot and unreconciled components.
- `osun-2026-pvc`: Osun election-specific PVC collection count.

The client retrieves only datasets relevant to voter-register/PVC questions. A state named in the question is passed as an exact filter where the contract supports it. The 2023 national totals are retained separately from state rows.

## Evidence and interpretation rules

- Official source, ISEYC transcription, reference period, retrieval date, geography, methodology and limitations travel with the evidence.
- 2023 register, 2025–2026 CVR registrations, state election registers, PVC collection, accreditation and turnout are different measures.
- Never add CVR phase-one registrations to the 2023 register to claim a current national total.
- Preserve the two phase-one INEC statements (2,782,587 and 2,782,589) as separate official statements.
- Preserve the 2023 uncollected-PVC arithmetic discrepancy. Do not silently reconcile it.
- PVC collection is not turnout.
- State or national figures cannot establish an LGA, ward or polling-unit value unless that geographic row is present.
- If the Observatory endpoint is unavailable, partial or invalid, Brain discloses the status and does not substitute synthetic or unrelated figures.

## Security and reliability

- The client only calls the approved ISEYC Observatory HTTPS hostname.
- Only four explicit dataset IDs are allowed.
- Responses are bounded to 250 KB and six seconds per dataset request.
- Contract version, publisher, official INEC source host, record count and limitations are validated before use.
- Partial retrieval is labelled partial; invalid or unavailable evidence is withheld.
- No API keys or private Notion credentials are used.

## Deployment sequence

1. Deploy the Observatory main commit that includes `GET /api/evidence/inec`.
2. Confirm the public catalogue and all four dataset endpoints return contract v1.0.0.
3. Deploy Civic Brain with this consumer.
4. Test 2023 national and Kaduna figures, current CVR limitations, Ekiti and Osun election-specific figures.
5. Confirm the chat response metadata reports the dataset IDs and source URLs.
6. Only then describe Civic Brain as consuming national INEC evidence in production.

Until the Observatory endpoint is deployed, the Brain consumer remains fail-closed and reports the source as unavailable.
