# ISEYC Evidence and Claim Governance

**Audience:** Developers, civic researchers, moderators, partners.  
**Branch controls:** Implemented in `feat/stage4-institutional-hardening` (presentation policy + registry).

## Six evidence categories

### 1. Community testimony
**Establishes:** What a person reported experiencing or requesting.  
**Cannot establish:** Prevalence, official action, implementation, national statistics.  
**Minimum metadata:** Approximate place/duty if given; collection channel; consent for publication.  
**Verification authority:** Human moderator decides publishability only — not truth of conditions on the ground.

### 2. Published community record
**Establishes:** Human-reviewed public text after ISEYC moderation (Civic Mandate Published status).  
**Cannot establish:** That government acted; national representativeness; legal duty assignment.  
**Minimum metadata:** Record id, sentence, duty, state/LGA if present, created time, public URL.  
**Verification authority:** Moderation workflow; corrections via human review.

### 3. Official documentary evidence
**Establishes:** What an institution published (budget line, circular, speech transcript, gazette).  
**Cannot establish:** Delivery or outcomes unless the document itself proves them.  
**Minimum metadata:** Publisher, title, URL/doc ref, date, geography, limitations.  
**Verification authority:** Designated evidence officer; dual review recommended for high impact.

### 4. Institutional commitment
**Establishes:** Stated intent or promise.  
**Cannot establish:** That work occurred or succeeded.  
**Minimum metadata:** As official documentary evidence plus commitment date/scope.  
**Verification authority:** Evidence officer + editorial review.

### 5. Implementation evidence
**Establishes:** Documented works, procurement completion artefacts, audited expenditure trails.  
**Cannot establish:** User-level outcomes or independent field verification.  
**Minimum metadata:** Artefact refs, dates, geography, method.  
**Verification authority:** Evidence officer; dual review recommended.

### 6. Independent outcome verification
**Establishes:** Third-party or structured field-verified results.  
**Cannot establish:** Political endorsement or ranking of parties/candidates.  
**Minimum metadata:** Named verifier, method, date, conflict-of-interest note.  
**Verification authority:** Named verifier + audit log; never model-assigned.

## Distinctions
Report count ≠ prevalence · Publication ≠ ground-truth verification · Announcement ≠ implementation · Referral ≠ acknowledgement · Acknowledgement ≠ delivery · Implementation ≠ independently verified outcome.

## Public presentation vs internal flags

| Layer | User sees | Internal |
|-------|-----------|----------|
| Structured brief | `displayText` / renderer markdown only | classifications, `_policyNote`, registry |
| Narrative | Neutralised sentences + limits footer | `evidencePolicyFlags` |
| Raw model JSON | **Not in content.text** | discarded |

When policy replaces a claim, **displayText** is mandatory in list fields and preferred in the renderer. Original unsupported wording is not shown as established fact.

## Aggregate metric binding
Explicit pairs only (`N published records`, `N states`, `N LGAs`, …). **Every integer** in a metric-bearing claim must bind to an accepted pair value. Extra numbers (e.g. 999) fail the claim. Conflicting pairs for the same metric fail. ISO dates and simple decimals are masked, not treated as metric counts.

## Geographic methodology
Progressive state → LGA coverage. Pilot records must not be labelled nationally representative. Claims of “Nigeria” as scope without national data show an explicit coverage limitation.

## Human review and correction
Mandate publication and consequential verification remain human-governed. Brain does not write Mandate status. Corrections preserve audit history.

## Implemented vs future
**Implemented:** server registry, metric binding, displayText policy, validated brief renderer, narrative neutralization, API response builder tests, fail-closed body read.  
**Future:** official dataset ingestion, dual-control verification UI, semantic citation entailment.
