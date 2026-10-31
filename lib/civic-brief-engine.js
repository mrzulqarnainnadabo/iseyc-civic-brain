/**
 * Structured Civic Brief v1 — full-document claim policy + trusted registry.
 */
import { assessCitationRelevance } from './citation-relevance.js';
import { resolveTrustedCitation, serverSourcesForBrief } from './trusted-evidence-registry.js';
import { validateClaimText, itemText, detectInstitutionalRisk } from './claim-policy.js';
import { assessAggregateClaim } from './aggregate-claims.js';

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

function policyString(text, meta, preferred = 'ANALYSIS') {
  const v = validateClaimText(text, { aggregateMeta: meta, preferredClassification: preferred });
  return v;
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
  if (errors.length) return { ok: false, errors, brief: null };

  const registryEmpty = !trustedRegistry || trustedRegistry.empty || !trustedRegistry.byId?.size;
  const aggregateMeta = trustedRegistry?.aggregateMeta || null;
  const serverSources = serverSourcesForBrief(trustedRegistry);

  // String sections — preserve text with policy annotations
  const exec = policyString(raw.executiveSummary, aggregateMeta);
  const happening = policyString(raw.whatIsHappening, aggregateMeta);
  const geo = policyString(raw.geographicScope, aggregateMeta, 'ANALYSIS');
  const limits = policyString(raw.limitations, aggregateMeta, 'ANALYSIS');

  // verifiedImplementation: never trust content as verified outcome
  const verifiedImplIn = asArray(raw.verifiedImplementation) || [];
  const verifiedImplOut = [];
  for (let i = 0; i < verifiedImplIn.length; i++) {
    const t = itemText(verifiedImplIn[i]);
    const risk = detectInstitutionalRisk(t);
    const agg = assessAggregateClaim(t, aggregateMeta);
    if (risk || !agg.ok || t.trim()) {
      // Any implementation claim without independent registry class is unverified
      verifiedImplOut.push({
        text: t,
        classification: 'UNKNOWN',
        requiresHumanReview: true,
        independentlyVerified: false,
        note:
          'verifiedImplementation entries are never treated as independently verified outcomes from model output alone. risk=' +
          (risk || (agg.ok ? 'none' : agg.reason)),
      });
    }
  }

  const mapList = (arr, preferred) =>
    (asArray(arr) || []).map((item) => {
      const t = itemText(item);
      const v = validateClaimText(t, {
        aggregateMeta,
        preferredClassification: preferred,
        allowCommunity: preferred === 'COMMUNITY_REPORT',
      });
      if (typeof item === 'string') {
        return {
          text: t,
          classification: v.classification,
          requiresHumanReview: v.requiresHumanReview,
          independentlyVerified: false,
          note: v.note,
        };
      }
      return {
        ...item,
        text: t || item.text,
        classification: v.classification,
        requiresHumanReview: v.requiresHumanReview || Boolean(item.requiresHumanReview),
        independentlyVerified: false,
        note: v.note || item.note || null,
        verificationStatus:
          item.verificationStatus &&
          ['verified', 'independently_verified'].includes(String(item.verificationStatus).toLowerCase())
            ? 'unverified'
            : item.verificationStatus || 'unverified',
      };
    });

  const findingsIn = asArray(raw.findings) || [];
  const findingsOut = [];
  for (let i = 0; i < findingsIn.length; i++) {
    const f = findingsIn[i];
    if (!f || typeof f !== 'object') continue;
    let classification = CLAIM_TYPES.includes(f.classification) ? f.classification : 'UNKNOWN';
    const text = typeof f.text === 'string' ? f.text : '';
    const pre = validateClaimText(text, { aggregateMeta, preferredClassification: classification });
    if (pre.classification === 'UNKNOWN' || pre.requiresHumanReview) {
      // Keep demotion from shared policy for prevalence/completion/aggregate
      if (detectInstitutionalRisk(text) || !assessAggregateClaim(text, aggregateMeta).ok) {
        findingsOut.push({
          ...f,
          classification: pre.classification,
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: pre.note,
          },
        });
        continue;
      }
    }

    if (classification === 'FACT') {
      const citeNorm = normaliseCitations(f.citations);
      if (registryEmpty || !citeNorm.ok || !citeNorm.citations.length) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: registryEmpty ? 'Trusted registry empty.' : citeNorm.reason || 'FACT needs citation',
          },
        });
        continue;
      }
      const resolved = [];
      for (const cid of citeNorm.citations) {
        const r = resolveTrustedCitation(cid, trustedRegistry);
        if (r.ok) resolved.push(r.source);
      }
      if (!resolved.length) {
        findingsOut.push({
          ...f,
          classification: 'UNKNOWN',
          claimRelevance: {
            supportLevel: 'unsupported',
            requiresHumanReview: true,
            independentlyVerified: false,
            note: 'No server-resolved citation.',
          },
        });
        continue;
      }
      const onlyCommunity = resolved.every((s) => s.sourceType === 'community_submission');
      const risk = detectInstitutionalRisk(text);
      if (onlyCommunity && risk) {
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
            note: 'Weak heuristic relevance. Not independent verification.',
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
          note: 'Server-resolved + heuristic only.',
        },
      });
      continue;
    }

    findingsOut.push({
      ...f,
      classification,
      claimRelevance: {
        supportLevel: 'n/a',
        requiresHumanReview: pre.requiresHumanReview,
        independentlyVerified: false,
        note: pre.note,
      },
    });
  }

  return {
    ok: true,
    errors: [],
    brief: {
      schemaVersion: BRIEF_SCHEMA_VERSION,
      briefId: typeof raw.briefId === 'string' ? raw.briefId : 'brief-' + Date.now(),
      generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date().toISOString(),
      executiveSummary: exec.text,
      executiveSummaryPolicy: exec,
      whatIsHappening: happening.text,
      whatIsHappeningPolicy: happening,
      geographicScope: geo.text,
      communityReports: mapList(raw.communityReports, 'COMMUNITY_REPORT'),
      officialEvidence: mapList(raw.officialEvidence, 'ANALYSIS'),
      findings: findingsOut,
      possibleExplanations: mapList(raw.possibleExplanations, 'HYPOTHESIS'),
      institutionalResponsibilities: mapList(raw.institutionalResponsibilities, 'ANALYSIS'),
      publicCommitments: mapList(raw.publicCommitments, 'ANALYSIS'),
      verifiedImplementation: verifiedImplOut,
      evidenceGaps: mapList(raw.evidenceGaps, 'UNKNOWN'),
      recommendations: mapList(raw.recommendations, 'RECOMMENDATION'),
      sources: serverSources,
      limitations: limits.text,
      limitationsPolicy: limits,
      unavailableEvidence: trustedRegistry?.unavailable || [],
      validationNote:
        'Full-document claim policy + metric-specific aggregates + server registry. Narrative mode uses the same claim-policy module. Not semantic entailment; never independently verified from model output.',
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
      ? 'Evidence was retrieved, but structured brief validation failed (' + errs + ').'
      : 'Published evidence was not available.',
    '',
    '**What it does not mean**',
    'Not a validated civic_brief_v1; not independent verification.',
    '',
    '**What remains unknown**',
    'Question considered: ' + q,
    '',
    '**Useful next step**',
    'Open https://2027-street-mandate.vercel.app',
  ].join('\n');
}

export function briefModeSystemAppendix() {
  return [
    'STRUCTURED OUTPUT MODE: civic_brief_v1',
    'Cite only server evidence ids. Do not invent aggregate numbers.',
    'Never claim independently verified outcomes or national prevalence.',
  ].join('\n');
}
