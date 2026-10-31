# ISEYC Evidence and Claim Governance

## Public presentation vs internal flags

| Layer | What users see | What is retained server-side |
|-------|----------------|------------------------------|
| Structured brief | Markdown from `renderValidatedBriefMarkdown` only | Validated brief object with classifications |
| Narrative | Sentence-level neutralization of high-risk claims | `evidencePolicyFlags` |
| Raw model JSON | **Not returned** in `content.text` after validation | Discarded |

Unsupported institutional completion, acknowledgement, prevalence, and false aggregates are shown as **Unverified / unknown**, not as facts with a footer disclaimer only.

## Aggregate metric binding

Numbers bind only through explicit patterns such as `24 published records`, `3 states`, `10 LGAs`. Cross-metric reuse of a number is rejected. Ambiguous unbound numbers require human review.

## Limits of heuristics

Phrase and pattern controls are not semantic entailment. They reduce unsafe presentation; they do not prove truth.

## Human correction

Consequential verification, referrals, and publication remain human-governed in Civic Mandate moderation. Civic Brain does not write Mandate publication state.

## Evidence categories

Community testimony · Published community record · Official documentary evidence · Institutional commitment · Implementation evidence · Independent outcome verification — each with distinct establishment limits (see prior section in history of this file).

## Implemented vs future

Implemented: server registry, metric pairs, shared claim policy, validated brief renderer, narrative neutralization, fail-closed body read.  
Future: official dataset ingestion, dual-control verification UI, full semantic citation checking.
