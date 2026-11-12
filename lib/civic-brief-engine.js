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

export function validateCivicBrief(raw, trustedSources) {
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

  if (!Array.isArray(trustedSources)) {
    errors.push('trusted_source_allowlist_missing');
  }
  const trustedById = new Map();
  for (const source of Array.isArray(trustedSources) ? trustedSources : []) {
    if (!source || !isNonEmptyString(source.id) || !isNonEmptyString(source.title) ||
        !isNonEmptyString(source.sourceType) || !isNonEmptyString(source.publisher)) {
      errors.push('trusted_source_incomplete');
      continue;
    }
    if (trustedById.has(source.id)) errors.push('trusted_source_duplicate_id:' + source.id);
    else trustedById.set(source.id, {
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      sourceType: source.sourceType,
      sourceUrl: isNonEmptyString(source.sourceUrl) ? source.sourceUrl : null,
      referenceDate: isNonEmptyString(source.referenceDate) ? source.referenceDate : null,
      sourceUpdateDate: isNonEmptyString(source.sourceUpdateDate) ? source.sourceUpdateDate : null,
      geoCoverage: isNonEmptyString(source.geoCoverage) ? source.geoCoverage : null,
      subjectCategory: isNonEmptyString(source.subjectCategory) ? source.subjectCategory : null,
      verificationStatus: isNonEmptyString(source.verificationStatus) ? source.verificationStatus : 'unknown',
      recordId: isNonEmptyString(source.recordId) ? source.recordId : null,
      excerpt: isNonEmptyString(source.excerpt) ? source.excerpt.slice(0, 1200) : null,
      independentVerification: source.independentVerification === true,
    });
  }

  const modelSources = asArray(raw.sources) || [];
  const modelSourceIds = new Set();
  for (let i = 0; i < modelSources.length; i++) {
    const source = modelSources[i];
    if (!source || !isNonEmptyString(source.id)) {
      errors.push('source_incomplete:' + i);
      continue;
    }
    if (!trustedById.has(source.id)) {
      errors.push('untrusted_source_id:' + source.id);
      continue;
    }
    if (modelSourceIds.has(source.id)) errors.push('duplicate_model_source_id:' + source.id);
    modelSourceIds.add(source.id);
  }

  // Independent verification is a server-owned property, never a model-supplied sourceType.
  const hasIndependentSource = [...trustedById.values()].some(
    (source) => source.independentVerification === true
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
          if (typeof c !== 'string' || !c || !trustedById.has(c) || !modelSourceIds.has(c)) {
            errors.push('unknown_or_untrusted_citation:' + String(c));
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
  const trustedCommunityReports = [];
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    if (!report || typeof report !== 'object') {
      errors.push('community_report_invalid:' + i);
      continue;
    }
    const source = trustedById.get(report.sourceId);
    if (!source || !modelSourceIds.has(source.id) || !['community_submission', 'community_observation'].includes(source.sourceType)) {
      errors.push('community_report_untrusted_source:' + i);
      continue;
    }
    trustedCommunityReports.push({
      classification: 'COMMUNITY_REPORT',
      sourceId: source.id,
      recordId: source.recordId,
      title: source.title,
      text: source.excerpt || source.title,
      sourceUrl: source.sourceUrl,
      verificationStatus: source.verificationStatus,
      geoCoverage: source.geoCoverage,
    });
  }

  const responsibilities = asArray(raw.institutionalResponsibilities) || [];
  const safeResponsibilities = [];
  for (let i = 0; i < responsibilities.length; i++) {
    const item = responsibilities[i];
    if (!item || typeof item !== 'object') {
      errors.push('responsibility_invalid:' + i);
      continue;
    }
    const status = String(item.verificationStatus || '').toLowerCase();
    if (status === 'independently_verified' || status === 'independently-verified' || status === 'verified') {
      errors.push('model_cannot_verify_institutional_responsibility:' + i);
    }
    safeResponsibilities.push({
      ...item,
      verificationStatus: 'unverified',
      legalOrAdminSource: null,
      source: null,
      sourceId: null,
      requiresHumanReview: true,
    });
  }

  const commitments = asArray(raw.publicCommitments) || [];
  if (commitments.length > 0) {
    errors.push('public_commitments_require_dedicated_trusted_source');
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
  const trustedOfficialEvidence = [];
  for (let i = 0; i < official.length; i++) {
    const item = official[i];
    if (!item || typeof item !== 'object') {
      errors.push('official_evidence_invalid:' + i);
      continue;
    }
    const source = trustedById.get(item.sourceId);
    if (!source || !modelSourceIds.has(source.id) || source.sourceType !== 'official_source') {
      errors.push('official_evidence_untrusted_source:' + i);
      continue;
    }
    trustedOfficialEvidence.push({
      classification: 'OFFICIAL_SOURCE',
      sourceId: source.id,
      title: source.title,
      publisher: source.publisher,
      sourceUrl: source.sourceUrl,
      referenceDate: source.referenceDate,
      summary: source.excerpt || 'Consult the linked official-source transcription.',
    });
  }
  if (verifiedImpl.length > 0 && !hasIndependentSource) {
    errors.push('verified_implementation_without_independent_source');
  }

  if (errors.length) return { ok: false, errors, brief: null };

  const trustedOutputSources = [...modelSourceIds]
    .map((id) => trustedById.get(id))
    .filter(Boolean);

  let brief = {
    ...raw,
    // Never return model-authored source metadata. Replace it with the server-owned manifest.
    sources: trustedOutputSources,
    communityReports: trustedCommunityReports,
    officialEvidence: trustedOfficialEvidence,
    institutionalResponsibilities: safeResponsibilities,
    publicCommitments: [],
    schemaVersion: BRIEF_SCHEMA_VERSION,
    briefId: typeof raw.briefId === 'string' ? raw.briefId : 'brief-' + Date.now(),
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date().toISOString(),
    validationNote:
      'Structural validation against a server-owned source allowlist + heuristic citation relevance. Model-authored source metadata is discarded. Relevance overlap does not prove semantic support or independent verification.',
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
  const q = isNonEmptyString(question) ? question.slice(0, 160) : 'your question';
  const reason = (validationErrors || []).slice(0, 2).join('; ') || 'the brief structure was incomplete';
  return [
    evidenceAvailable
      ? '**Answer** — Evidence was retrieved, but the structured brief did not pass validation. No unsupported conclusion is being presented.'
      : '**Answer** — The published evidence needed for this question was unavailable.',
    '',
    '**Limit** — This is not proof of national prevalence, government action or issue resolution. Validation issue: ' + reason + '.',
    '',
    '**Next step** — Narrow the question by duty and state, or inspect published records at https://2027-street-mandate.vercel.app.',
  ].join('\\n');
}

export function briefModeSystemAppendix() {
  return [
    'FORMAT OVERRIDE: This request explicitly uses civic_brief_v1 and replaces the narrative four-heading response format for this request only.',
    'STRUCTURED OUTPUT MODE: civic_brief_v1',
    'Respond with a single JSON object only (no markdown outside JSON).',
    'schemaVersion must be "1.0.0".',
    'Every FACT finding must cite IDs from the SERVER-TRUSTED SOURCE ALLOWLIST below. Never invent or create source IDs.',
    'The server will reject any citation not retrieved for this request and replace all source metadata with trusted server metadata.',
    'Every communityReports[] item must include sourceId from the allowlist and refer only to community_submission or community_observation sources. The server reconstructs its text from the retrieved record.',
    'Every officialEvidence[] item must include sourceId from an allowlisted official_source. The server replaces its metadata from the retrieved dataset.',
    'Do not invent source ids, record ids, dates, public commitments, or official actions.',
    'Do not claim verified institutional responsibility or completed implementation. No independent outcome-verification source is available in the current server source manifest.',
    'Never claim independently verified merely because you cited a source or the model labels it that way.',
    'If evidence is insufficient, use empty arrays and state gaps in evidenceGaps and limitations.',
  ].join('\n');
}
