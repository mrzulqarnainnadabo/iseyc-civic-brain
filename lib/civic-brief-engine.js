/**
 * Structured Civic Brief v1 — server-validated against trusted registry.
 */
import { assessCitationRelevance } from './citation-relevance.js';
import { resolveTrustedCitation, serverSourcesForBrief } from './trusted-evidence-registry.js';
import { assessAggregateClaim } from './aggregate-claims.js';
import { scanBriefFields, textRisk } from './claim-guards.js';

export const CLAIM_TYPES = Object.freeze([
  'FACT',
  'COMMUNITY_REPORT',
  'ANALYSIS',
  'HYPOTHESIS',
  'RECOMMENDATION',
  'UNKNOWN',
]);
export const BRIEF_SCHEMA_VERSION = '1.0.0';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function asArray(v) {
  return Array.isArray(v) ? v : null;
}

function normaliseCitations(raw) {
  if (!Array.isArray(raw)) return { ok: false, citations: [], reason: 'citations_not_array' };
  const out = [];
  for (const c of raw) {
    if (typeof c !== 'string' || !c.trim()) {
      return { ok: false, citations: [], reason: 'malformed_citation_entry' };
    }
    out.push(c.trim());
  }
  return { ok: true, citations: out };
}

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
  const aggregateMeta = trustedRegistry?.aggregateMeta || null;
  const serverSources = serverSourcesForBrief(trustedRegistry);

  // Field-level unsafe claims → errors for verifiedImplementation completion; demote others
  const fieldHits = scanBriefFields(raw);
  for (const h of fieldHits) {
    if (h.field === 'verifiedImplementation') {
      errors.push('verified_implementation_unsafe:' + h.risk + ':' + h.index);
    }
  }
  if (errors.length) return { ok: false, errors, brief: null };

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
    const citeNorm = normaliseCitations(f.citations);
    if (classification === 'FACT' && !citeNorm.ok) {
      findingsOut.push({
        ...f,
        classification: 'UNKNOWN',
        claimRelevance: {
          supportLevel: 'unsupported',
          requiresHumanReview: true,
          independentlyVerified: false,
          note: citeNorm.reason,
        },
      });
      continue;
    }
    const citations = citeNorm.ok ? citeNorm.citations : [];

    const risk = textRisk(text);
    if (risk === 'prevalence') {
      findingsOut.push({
        ...f,
        classification: 'UNKNOWN',
        claimRelevance: {
          supportLevel: 'unsupported',
          requiresHumanReview: true,
          independentlyVerified: false,
          note: 'Prevalence/national statistic language blocked.',
        },
      });
      continue;
    }

    // Aggregate numerical match
    const agg = assessAggregateClaim(text, aggregateMeta);
    if (!agg.ok && (classification === 'FACT' || classification === 'ANALYSIS')) {
      findingsOut.push({
        ...f,
        classification: agg.demoteTo || 'UNKNOWN',
        claimRelevance: {
          supportLevel: 'unsupported',
          requiresHumanReview: true,
          independentlyVerified: false,
          note: 'Aggregate claim validation: ' + agg.reason,
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
            note: 'Trusted registry empty.',
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
            note: 'FACT requires server-resolved citation.',
          },
        });
        continue;
      }
      const resolved = [];
      for (const cid of citations) {
        const r = resolveTrustedCitation(cid, trustedRegistry);
        if (r.ok) resolved.push(r.source);
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
            note: 'No citation in server registry.',
          },
        });
        continue;
      }
      const onlyCommunity = resolved.every((s) => s.sourceType === 'community_submission');
      if (onlyCommunity && (risk === 'completion' || risk === 'acknowledgement' || risk === 'implementation_started')) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'Community submission cannot establish ' + risk,
          },
        });
        continue;
      }

      let best = { supportLevel: 'unsupported', score: 0 };
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
            note: 'Heuristic relevance weak. Not independent verification.',
          },
        });
        continue;
      }
      findingsOut.push({
        ...f,
        classification: 'FACT',
        citations: resolved.map((s) => s.id),
        claimRelevance: {
          supportLevel: best.supportLevel,
          requiresHumanReview: false,
          independentlyVerified: false,
          note: 'Server-resolved + heuristic only. Not semantic entailment or independent verification.',
        },
      });
      continue;
    }

    if (classification === 'COMMUNITY_REPORT' && (risk === 'completion' || risk === 'acknowledgement')) {
      findingsOut.push({
        ...f,
        classification: 'UNKNOWN',
        claimRelevance: {
          supportLevel: 'unsupported',
          requiresHumanReview: true,
          independentlyVerified: false,
          note: 'COMMUNITY_REPORT cannot state acknowledgement/completion.',
        },
      });
      continue;
    }

    findingsOut.push({ ...f, classification });
  }

  // Sanitise other arrays
  const responsibilities = (asArray(raw.institutionalResponsibilities) || []).map((ir) => {
    if (!ir || typeof ir !== 'object') return ir;
    const status = String(ir.verificationStatus || '').toLowerCase();
    if (status === 'independently_verified' || status === 'verified') {
      return {
        ...ir,
        verificationStatus: 'unverified',
        limitations:
          (ir.limitations || '') +
          ' [Server demoted verificationStatus — AI cannot verify duty.]',
      };
    }
    return ir;
  });

  const scrub = (arr) =>
    (asArray(arr) || []).map((item) => {
      const t = typeof item === 'string' ? item : item?.text;
      const r = textRisk(t || '');
      if (!r) return item;
      if (typeof item === 'string') {
        return {
          text: item,
          classification: 'UNKNOWN',
          requiresHumanReview: true,
          note: 'Demoted: ' + r,
        };
      }
      return {
        ...item,
        classification: 'UNKNOWN',
        requiresHumanReview: true,
        note: 'Demoted: ' + r,
      };
    });

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
      communityReports: scrub(raw.communityReports),
      officialEvidence: scrub(raw.officialEvidence),
      findings: findingsOut,
      possibleExplanations: raw.possibleExplanations,
      institutionalResponsibilities: responsibilities,
      publicCommitments: scrub(raw.publicCommitments),
      verifiedImplementation: registryEmpty ? [] : raw.verifiedImplementation,
      evidenceGaps: raw.evidenceGaps,
      recommendations: raw.recommendations,
      sources: serverSources,
      limitations: raw.limitations,
      unavailableEvidence: trustedRegistry?.unavailable || [],
      validationNote:
        'Server registry + aggregate number matching + field guards. Model sources discarded. Heuristic relevance ≠ entailment ≠ independent verification.',
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
      ? 'Evidence was partially or fully retrieved, but structured brief validation failed (' + errs + ').'
      : 'Published evidence was not available. No structured brief was produced.',
    '',
    '**What it does not mean**',
    'This fallback is not a validated civic_brief_v1 object and is not independent verification.',
    '',
    '**What remains unknown**',
    'Question considered: ' + q,
    '',
    '**Useful next step**',
    'Open https://2027-street-mandate.vercel.app to inspect published records.',
  ].join('\n');
}

export function briefModeSystemAppendix() {
  return [
    'STRUCTURED OUTPUT MODE: civic_brief_v1',
    'Cite only server evidence ids (mandate:<id> or intelligence:snapshot).',
    'Do not invent aggregate numbers — only use counts provided in evidence blocks.',
    'Never claim independently verified outcomes or national prevalence.',
  ].join('\n');
}
