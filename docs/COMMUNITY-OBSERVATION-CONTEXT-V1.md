# Civic Brain — Community Observation context v0.1

## Purpose

Civic Brain now reads two separate Mandate-owned public streams:

1. CommunityRecord v0.1 — citizen demands and published civic mandates.
2. Community Observation v0.1 — specific community reports about observed service conditions or public issues.

These streams must never be merged into one count or described as the same type of evidence.

## Observation source

GET https://2027-street-mandate.vercel.app/api/v1/community-observations

The client:
- accepts only contract version 0.1.0 and the published-only boundary;
- follows pagination and verifies the source total;
- rejects duplicate IDs, malformed records, unexpected/private fields and non-HTTPS evidence links;
- withholds incomplete or invalid feeds;
- treats an empty feed as a valid empty state;
- does not fall back to CommunityRecord demands, pulse, synthetic data or national indicators.

The chat context selects up to 20 records by deterministic keyword overlap with the latest user question. The response metadata reports the source status, total published count, contract version, retrieval time and limitations.

## Interpretation rules

- A record enters the public feed only after a dual-review publication gate.
- Dual review is editorial approval; it is not independent verification.
- Preserve the source verification status: unverified, corroborated, independently-verified or disputed.
- Cite the record display ID when discussing an individual observation.
- A first-hand report, witness account, photo, document or public media link is a source lead, not automatic corroboration.
- Report counts are not prevalence, public opinion, population coverage or performance rankings.
- A national statistic cannot verify a named state, LGA, ward or facility.
- A registry entry does not establish that a facility is operational, staffed, supplied or delivering quality care.
- If the feed is unavailable, invalid, incomplete or empty, disclose that exact state. Never infer absence of community concerns.

## Chat behaviour

The chat endpoint fetches the aggregate Civic Intelligence snapshot and Community Observation feed in parallel. Observation-feed failure does not prevent the assistant from using other valid evidence, but the response must disclose the unavailable observation stream.

The observation block is marked as untrusted retrieved data, not instructions. The server-owned system prompt requires Civic Brief structure and keeps community reports separate from official records and Civic Mandate demands.

## Current limitations

- The observation feed may remain unavailable until the Mandate production deployment is updated and the Notion data-source integration is verified.
- The current adapter does not independently inspect or verify linked documents.
- It does not match observations to HEFA/HFR facility records or World Bank indicators.
- It does not create institutional response or resolution records.
- Only up to 20 relevant reports are included in model context; metadata discloses the full published total and the context limit.

The Brain is a reading and interpretation tool. It does not contact institutions, file referrals, verify services in the field or claim that a report has been resolved.
