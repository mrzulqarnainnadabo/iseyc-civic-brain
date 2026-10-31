/**
 * Structured Civic Brief v1 — server-validated; citations resolve against trusted registry.
 * Model sources[] are ignored for trust. Empty registry ⇒ no FACT evidence.
 */

import { assessCitationRelevance } from './citation-relevance.js';
import { resolveTrustedCitation, serverSourcesForBrief } from './trusted-evidence-registry.js';

export const CLAIM_TYPES = Object.freeze([
  'FACT',
  'COMMUNITY_REPORT',
  'ANALYSIS',
  'HYPOTHESIS',
  'RECOMMENDATION',
  'UNKNOWN',
]);

export const BRIEF_SCHEMA_VERSION = '1.0.0';

const COMPLETION_LANG =
  /\b(resolved|fully\s+implemented|successfully\s+delivered|completed\s+implementation|problem\s+is\s+solved|outcome\s+independently\s+verified)\b/i;
const PREVALENCE =
  /\b\d{1,3}\s*%\s*of\s*(nigerians|citizens|voters)|national\s+prevalence|all\s+nigerians\b/i;
const ACK_LANG =
  /\b(officially\s+acknowledged|institution\s+acknowledged|referral\s+was\s+sent|government\s+confirmed\s+receipt)\b/i;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function asArray(v) {
  return Array.isArray(v) ? v : null;
}

/**
 * @param {object} raw - model brief
 * @param {object|null} trustedRegistry - server-owned registry
 */
export function validateCivicBrief(raw, trustedRegistry = null) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['brief_not_object'], brief: null };
  }
  if (raw.schemaVersion !== BRIEF_SCHEMA_VERSION) {
    errors.push('schemaVersion_must_be_' + BRIEF_SCHEMA_VERSION);
  }

  for (const k of ['executiveSummary', 'whatIsHappening', 'geographicScope', 'limitations']) {
    if (!isNonEmptyString(raw[k])) errors.push('missing_or_empty:' + k);
  }
  for (const k of [
    'communityReports',
    'officialEvidence',
    'findings',
    'possibleExplanations',
    'institutionalResponsibilities',
    'publicCommitments',
    'verifiedImplementation',
    'evidenceGaps',
    'recommendations',
    'sources',
  ]) {
    if (!asArray(raw[k])) errors.push('missing_array:' + k);
  }

  const registryEmpty = !trustedRegistry || trustedRegistry.empty || !trustedRegistry.byId?.size;

  // Model sources ignored for trust — use server list in output
  const serverSources = serverSourcesForBrief(trustedRegistry);

  const findingsIn = asArray(raw.findings) || [];
  const findingsOut = [];

  for (let i = 0; i < findingsIn.length; i++) {
    const f = findingsIn[i];
    if (!f || typeof f !== 'object') {
      errors.push('finding_invalid:' + i);
      continue;
    }
    let classification = f.classification;
    if (!CLAIM_TYPES.includes(classification)) {
      errors.push('finding_bad_classification:' + i);
      continue;
    }
    const text = typeof f.text === 'string' ? f.text : '';
    const citations = Array.isArray(f.citations) ? f.citations.filter((c) => typeof c === 'string') : [];

    if (PREVALENCE.test(text) && (classification === 'FACT' || classification === 'COMMUNITY_REPORT')) {
      classification = 'UNKNOWN';
      findingsOut.push({
        ...f,
        classification,
        claimRelevance: {
          supportLevel: 'unsupported',
          requiresHumanReview: true,
          independentlyVerified: false,
          note: 'Prevalence/national statistic language cannot be supported by community or pilot platform data alone.',
        },
      });
      continue;
    }

    if (classification === 'FACT') {
      if (registryEmpty) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'Trusted evidence registry empty — FACT not permitted.',
          },
        });
        continue;
      }
      if (!citations.length) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'FACT requires at least one server-resolved citation.',
          },
        });
        continue;
      }

      const resolved = [];
      let anyUnresolved = false;
      for (const cid of citations) {
        const r = resolveTrustedCitation(cid, trustedRegistry);
        if (!r.ok) {
          anyUnresolved = true;
        } else {
          resolved.push(r.source);
        }
      }

      if (!resolved.length) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          citations,
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'No citation resolved to server-owned trusted registry.',
          },
        });
        continue;
      }

      // Community submission cannot support completion/ack as FACT
      const onlyCommunity = resolved.every((s) => s.sourceType === 'community_submission');
      if (onlyCommunity && (COMPLETION_LANG.test(text) || ACK_LANG.test(text))) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'Community submissions cannot establish acknowledgement, implementation, or resolution.',
          },
        });
        continue;
      }

      // Platform aggregate: only allow platform-count style FACTs
      const onlyAgg = resolved.every((s) => s.sourceType === 'platform_aggregate');
      if (onlyAgg && COMPLETION_LANG.test(text)) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'Aggregate snapshot cannot establish implementation or resolution.',
          },
        });
        continue;
      }

      // Relevance heuristic (not entailment)
      let best = { supportLevel: 'unsupported', score: 0, independentlyVerified: false };
      for (const src of resolved) {
        const a = assessCitationRelevance({ text }, src);
        if (a.score > best.score) best = a;
      }

      if (best.supportLevel === 'unsupported' || best.supportLevel === 'weak_related') {
        findingsOut.push({
          ...f,
          classification: best.supportLevel === 'unsupported' ? 'UNKNOWN' : 'ANALYSIS',
          citations: resolved.map((s) => s.id),
          claimRelevance: {
            supportLevel: best.supportLevel,
            requiresHumanReview: true,
            independentlyVerified: false,
            note:
              'Server-resolved citation present but relevance heuristics did not establish reliable support. Not independent verification.',
          },
        });
        continue;
      }

      // Never allow model to mark independently verified
      findingsOut.push({
        ...f,
        classification: 'FACT',
        citations: resolved.map((s) => s.id),
        claimRelevance: {
          supportLevel: best.supportLevel,
          requiresHumanReview: false,
          independentlyVerified: false,
          note:
            'Server-resolved citation + heuristic relevance only. Semantic entailment and independent verification are not established by this validator.',
        },
      });
      continue;
    }

    // COMMUNITY_REPORT: may cite mandate records
    if (classification === 'COMMUNITY_REPORT') {
      if (ACK_LANG.test(text) || COMPLETION_LANG.test(text)) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'Community report classification cannot state official acknowledgement or completion.',
          },
        });
        continue;
      }
    }

    findingsOut.push({ ...f, classification, claimRelevance: f.claimRelevance || null });
  }

  // Responsibilities: model cannot set verified without server basis (still reject bare verified)
  const responsibilities = (asArray(raw.institutionalResponsibilities) || []).map((ir, i) => {
    if (!ir || typeof ir !== 'object') return ir;
    const status = String(ir.verificationStatus || '').toLowerCase();
    if (status === 'independently_verified' || status === 'verified') {
      return {
        ...ir,
        verificationStatus: 'unverified',
        limitations:
          (ir.limitations || '') +
          ' [Server: verificationStatus demoted — AI cannot independently verify institutional duty.]',
      };
    }
    return ir;
  });

  const verifiedImpl = asArray(raw.verifiedImplementation) || [];
  for (let i = 0; i < verifiedImpl.length; i++) {
    const item = verifiedImpl[i];
    const text = typeof item === 'string' ? item : item?.text;
    if (typeof text === 'string' && COMPLETION_LANG.test(text)) {
      errors.push('verified_implementation_forbidden_without_trusted_independent_evidence:' + i);
    }
  }

  if (errors.length) return { ok: false, errors, brief: null };

  return {
    ok: true,
    errors: [],
    brief: {
      schemaVersion: BRIEF_SCHEMA_VERSION,
      briefId: typeof raw.briefId === 'string' ? raw.briefId : 'brief-' + Date.now(),
      generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date().toISOString(),
      executiveSummary: raw.executiveSummary,
      whatIsHappening: raw.whatIsHappening,
      geographicScope: raw.geographicScope,
      communityReports: raw.communityReports,
      officialEvidence: raw.officialEvidence,
      findings: findingsOut,
      possibleExplanations: raw.possibleExplanations,
      institutionalResponsibilities: responsibilities,
      publicCommitments: raw.publicCommitments,
      verifiedImplementation: registryEmpty ? [] : verifiedImpl,
      evidenceGaps: raw.evidenceGaps,
      recommendations: raw.recommendations,
      sources: serverSources,
      limitations: raw.limitations,
      validationNote:
        'Citations resolve only against server-owned trusted registry built from published Civic Mandate data. Model-supplied sources[] are not trusted. Heuristic relevance ≠ semantic entailment ≠ independent verification.',
      trustedRegistryEmpty: registryEmpty,
    },
  };
}

export function extractJsonBrief(text) {
  if (!isNonEmptyString(text)) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function narrativeFallbackFromFailure(question, validationErrors, evidenceAvailable) {
  const q = isNonEmptyString(question) ? question.slice(0, 280) : 'your question';
  const errs = (validationErrors || []).slice(0, 6).join('; ') || 'structure incomplete';
  return [
    '**What the public record shows**',
    evidenceAvailable
      ? 'Published Civic Mandate evidence was retrieved, but a structured Civic Brief could not be validated (' +
          errs +
          ').'
      : 'Published Civic Mandate evidence was not available. No structured brief was produced.',
    '',
    '**What it does not mean**',
    'This fallback is not a validated civic_brief_v1 object and is not independent verification.',
    '',
    '**What remains unknown**',
    'Question considered: ' + q,
    '',
    '**Useful next step**',
    'Open https://2027-street-mandate.vercel.app to inspect published records directly.',
  ].join('\n');
}

export function briefModeSystemAppendix() {
  return [
    'STRUCTURED OUTPUT MODE: civic_brief_v1',
    'Respond with a single JSON object only.',
    'schemaVersion must be "1.0.0".',
    'Cite only record ids or intelligence:snapshot ids provided in the SERVER EVIDENCE blocks.',
    'Do not invent sources[] metadata; the server replaces sources with its trusted registry.',
    'Community submissions support COMMUNITY_REPORT about that submission only — not prevalence or official action.',
    'Never claim independently verified outcomes.',
  ].join('\n');
}
