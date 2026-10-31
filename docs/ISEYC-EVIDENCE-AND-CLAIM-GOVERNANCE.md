# ISEYC Evidence and Claim Governance

**Status:** Institutional methodology + implemented server controls (partial).  
**Audience:** Developers, civic researchers, moderators, partners.

## Evidence categories

| Category | Establishes | Does not establish | Who changes verification |
|----------|-------------|--------------------|--------------------------|
| **Community testimony** | What a person reported | Prevalence, official action | Human moderator (publish only) |
| **Published community record** | Human-reviewed public text + place/duty labels | National stats, implementation, acknowledgement | ISEYC moderation workflow |
| **Official documentary evidence** | What an institution published | Delivery unless document proves it | Designated evidence officer |
| **Institutional commitment** | Stated intent/promise | That work occurred | Evidence officer + editorial review |
| **Implementation evidence** | Documented works/expenditure artefacts | Successful outcomes for users | Evidence officer; dual review recommended |
| **Independent outcome verification** | Third-party or field-verified result | Political endorsement | Named verifier + audit log |

### Minimum metadata
Publisher, title, URL/doc ref, date, geography, subject, verification status, known limitations, licence if known.

### Conflicts & corrections
Prefer newer verified sources; keep superseded records visible with correction notes; never delete audit history silently.

## Distinctions (non-negotiable)

- Report count ≠ prevalence  
- Publication ≠ factual verification of conditions on the ground  
- Announcement ≠ implementation  
- Referral ≠ acknowledgement  
- Acknowledgement ≠ delivery  
- Implementation ≠ independently verified outcome  

## Implemented in Civic Brain (code)

- Server-owned registry from Pulse + intelligence only  
- Metric-specific aggregate number checks  
- Shared `claim-policy` for structured brief fields and narrative post-notice  
- Model cannot set independently_verified  
- Endpoint path policies; fail-closed bounded body read  

## Not implemented (future)

- Official NBS/ministry dataset ingestion  
- Semantic entailment of citations  
- Full narrative rewrite (currently notice + flags)  
- Dual-control production verification UI  

## Geographic coverage methodology (draft)

Progressive state → LGA → ward coverage. Pilot records (e.g. Kaduna-heavy) **must not** be labelled nationally representative. Coverage dashboards must show gaps. Comparisons only when methods are comparable.

## Progressive research model

1. Strengthen published Mandate evidence quality.  
2. Register official sources with update schedules.  
3. Human-reviewed linkage of commitments to implementation artefacts.  
4. Independent verification only with named method and date.  
