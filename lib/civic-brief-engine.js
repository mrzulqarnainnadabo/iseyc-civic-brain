/**
 * Structured Civic Brief v1 — machine-validated response contract.
 * Narrative chat remains the default; brief mode is opt-in via format=civic_brief_v1 (API-only in product UI).
 *
 * Citation id membership is structural. Relevance heuristics may demote FACT → ANALYSIS/UNKNOWN.
 * Neither step proves semantic entailment or independent verification.
 */

import { applyRelevanceToFindings } from './citation-relevance.js';

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

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function asArray(v) {
  return Array.isArray(v) ? v : null;
}

export function validateCivicBrief(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['brief_not_object'], brief: null };
  }

  if (raw.schemaVersion !== BRIEF_SCHEMA_VERSION) {
    errors.push('schemaVersion_must_be_' + BRIEF_SCHEMA_VERSION);
  }

  const requiredStrings = ['executiveSummary', 'whatIsHappening', 'geographicScope', 'limitations'];
  for (const k of requiredStrings) {
    if (!isNonEmptyString(raw[k])) errors.push('missing_or_empty:' + k);
  }

  const requiredArrays = [
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
  ];
  for (const k of requiredArrays) {
    if (!asArray(raw[k])) errors.push('missing_array:' + k);
  }

  const sources = asArray(raw.sources) || [];
  const sourceById = new Map();
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s || !isNonEmptyString(s.id) || !isNonEmptyString(s.title)) {
      errors.push('source_incomplete:' + i);
      continue;
    }
    sourceById.set(s.id, s);
  }

  const hasIndependentSource = [...sourceById.values()].some(
    (s) => s.sourceType === 'independently_verified'
  );

  const findings = asArray(raw.findings) || [];
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    if (!f || typeof f !== 'object') {
      errors.push('finding_invalid:' + i);
      continue;
    }
    if (!CLAIM_TYPES.includes(f.classification)) {
      errors.push('finding_bad_classification:' + i);
    }
    if (f.classification === 'FACT') {
      if (!Array.isArray(f.citations) || f.citations.length === 0) {
        errors.push('fact_missing_citations:' + i);
      } else {
        for (const c of f.citations) {
          if (typeof c === 'string' && c && !sourceById.has(c)) {
            errors.push('unknown_citation:' + c);
          }
        }
      }
      if (typeof f.text === 'string' && COMPLETION_LANG.test(f.text) && !hasIndependentSource) {
        errors.push('completion_claim_without_independent_source:' + i);
      }
    }
    if (typeof f.text === 'string' && /\b\d{1,3}\s*%\s*of\s*(nigerians|citizens|voters)/i.test(f.text)) {
      if (f.classification === 'COMMUNITY_REPORT' || f.classification === 'FACT') {
        errors.push('prevalence_claim_without_survey_evidence:' + i);
      }
    }
  }

  const reports = asArray(raw.communityReports) || [];
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    if (!r || typeof r !== 'object') {
      errors.push('community_report_invalid:' + i);
      continue;
    }
    if (r.classification && r.classification !== 'COMMUNITY_REPORT') {
      errors.push('community_report_wrong_class:' + i);
    }
    if (typeof r.text === 'string' && /\b\d{1,3}\s*%\s*of\s*(nigerians|citizens|voters)/i.test(r.text)) {
      errors.push('community_prevalence_claim:' + i);
    }
  }

  const responsibilities = asArray(raw.institutionalResponsibilities) || [];
  for (let i = 0; i < responsibilities.length; i++) {
    const ir = responsibilities[i];
    if (!ir || typeof ir !== 'object') {
      errors.push('responsibility_invalid:' + i);
      continue;
    }
    const status = String(ir.verificationStatus || '').toLowerCase();
    if (status === 'independently_verified' || status === 'verified') {
      const basis = ir.legalOrAdminSource || ir.basis || ir.source || '';
      if (!isNonEmptyString(basis)) {
        errors.push('responsibility_verified_without_source:' + i);
      }
    }
  }

  const verifiedImpl = asArray(raw.verifiedImplementation) || [];
  for (let i = 0; i < verifiedImpl.length; i++) {
    const item = verifiedImpl[i];
    const text = typeof item === 'string' ? item : item?.text;
    if (typeof text === 'string' && COMPLETION_LANG.test(text) && !hasIndependentSource) {
      errors.push('verified_implementation_without_independent_source:' + i);
    }
  }

  const official = asArray(raw.officialEvidence) || [];
  for (let i = 0; i < official.length; i++) {
    const o = official[i];
    if (!o || typeof o !== 'object') continue;
    if (
      o.classification === 'FACT' &&
      typeof o.text === 'string' &&
      COMPLETION_LANG.test(o.text) &&
      !hasIndependentSource
    ) {
      errors.push('announcement_treated_as_completed_implementation:' + i);
    }
  }

  if (errors.length) return { ok: false, errors, brief: null };

  let brief = {
    ...raw,
    schemaVersion: BRIEF_SCHEMA_VERSION,
    briefId: typeof raw.briefId === 'string' ? raw.briefId : 'brief-' + Date.now(),
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date().toISOString(),
    validationNote:
      'Structural validation + heuristic citation relevance. Citation IDs must exist in sources[]. Relevance overlap does not prove semantic support or independent verification.',
  };

  const applied = applyRelevanceToFindings(brief);
  brief = applied.brief;
  brief.citationDemotions = applied.demotions;

  return { ok: true, errors: [], brief };
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
      ? 'Published Civic Mandate evidence was retrieved, but a structured Civic Brief could not be validated for this turn (' +
          errs +
          '). Treat any prior draft numbers as unverified until a valid brief is produced.'
      : 'Published Civic Mandate evidence was not available for this turn. No structured brief was produced.',
    '',
    '**What it does not mean**',
    'This fallback is not a verified national survey result, ranking, or proof of official action. It is not a validated civic_brief_v1 object.',
    '',
    '**What remains unknown**',
    'A complete structured brief (with cited FACT claims) was not available. Question considered: ' + q,
    '',
    '**Useful next step**',
    'Retry with a narrower question (duty + state), or open https://2027-street-mandate.vercel.app to inspect published records directly.',
  ].join('\n');
}

export function briefModeSystemAppendix() {
  return [
    'STRUCTURED OUTPUT MODE: civic_brief_v1',
    'Respond with a single JSON object only (no markdown outside JSON).',
    'schemaVersion must be "1.0.0".',
    'Every FACT finding must include citations[] that match sources[].id.',
    'Populate sources with title, sourceType, and when known geoCoverage and subjectCategory so relevance can be checked.',
    'Community submissions are COMMUNITY_REPORT — never prevalence statistics.',
    'Do not invent source ids, dates, or official actions.',
    'Do not describe announcements as completed implementation without independently_verified sources.',
    'Never claim independently verified merely because you cited a source.',
    'If evidence is insufficient, use empty arrays and state gaps in evidenceGaps and limitations.',
  ].join('\n');
}
