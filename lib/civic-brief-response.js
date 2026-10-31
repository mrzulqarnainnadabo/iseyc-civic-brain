/**
 * Pure response construction for structured brief mode — testable without HTTP.
 */
import { extractJsonBrief, validateCivicBrief, narrativeFallbackFromFailure } from './civic-brief-engine.js';
import { renderValidatedBriefMarkdown } from './render-validated-brief.js';
import { applyNarrativeEvidencePolicy } from './claim-policy.js';

/**
 * Build the JSON body returned to clients for structured brief attempts.
 * @param {string} providerText raw model text
 * @param {object} trustedRegistry
 * @param {string} lastUser
 * @param {{ ok: boolean }} evidenceFlags
 */
export function buildStructuredBriefResponse(providerText, trustedRegistry, lastUser, evidenceFlags = {}) {
  const parsed = extractJsonBrief(providerText);
  const validated = parsed
    ? validateCivicBrief(parsed, trustedRegistry)
    : { ok: false, errors: ['json_parse_failed'], brief: null };

  if (validated.ok) {
    const safeMarkdown = renderValidatedBriefMarkdown(validated.brief);
    return {
      content: [{ type: 'text', text: safeMarkdown }],
      brief: validated.brief,
      briefValid: true,
      format: 'civic_brief_v1',
      // raw provider text intentionally omitted
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: narrativeFallbackFromFailure(
          lastUser,
          validated.errors,
          Boolean(evidenceFlags.aggregateAvailable || evidenceFlags.recordsAvailable)
        ),
      },
    ],
    brief: null,
    briefValid: false,
    briefErrors: validated.errors,
    format: 'narrative_fallback',
  };
}

export function buildNarrativeResponse(providerText, aggregateMeta) {
  const policed = applyNarrativeEvidencePolicy(providerText, aggregateMeta);
  return {
    content: [{ type: 'text', text: policed.text }],
    format: 'narrative',
    evidencePolicyApplied: policed.policyApplied,
    evidencePolicyFlags: policed.flags,
  };
}
