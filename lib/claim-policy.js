/**
 * Common evidence/claim policy for structured briefs AND narrative mode.
 * Server-side; does not claim semantic entailment.
 */

import { assessAggregateClaim } from './aggregate-claims.js';

export const CLAIM_TYPES = Object.freeze([
  'FACT',
  'COMMUNITY_REPORT',
  'ANALYSIS',
  'HYPOTHESIS',
  'RECOMMENDATION',
  'UNKNOWN',
]);

const COMPLETION =
  /\b(resolved|fully\s+implemented|successfully\s+delivered|completed\s+(the\s+)?(project|implementation)|work\s+is\s+done|outcome\s+independently\s+verified|finished\s+construction|has\s+been\s+fixed)\b/i;
const ACK =
  /\b(officially\s+acknowledged|acknowledged\s+receipt|accepted\s+the\s+referral|referral\s+was\s+sent|government\s+confirmed|institution\s+confirmed|ministry\s+has\s+acted)\b/i;
const STARTED =
  /\b(commenced\s+implementation|began\s+implementation|started\s+construction|work\s+has\s+begun)\b/i;
const PREVALENCE =
  /\b\d{1,3}\s*%\s*of\s*(nigerians|citizens|voters)|national\s+prevalence|all\s+nigerians\b/i;

export function detectInstitutionalRisk(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  if (PREVALENCE.test(text)) return 'prevalence';
  if (COMPLETION.test(text)) return 'completion';
  if (ACK.test(text)) return 'acknowledgement';
  if (STARTED.test(text)) return 'implementation_started';
  return null;
}

/**
 * Validate a single claim string under policy.
 * @returns {{ text, classification, requiresHumanReview, independentlyVerified, note }}
 */
export function validateClaimText(text, opts = {}) {
  const {
    aggregateMeta = null,
    preferredClassification = 'ANALYSIS',
    allowCommunity = false,
  } = opts;

  const base = {
    text: typeof text === 'string' ? text : '',
    classification: preferredClassification,
    requiresHumanReview: false,
    independentlyVerified: false,
    note: null,
  };

  if (!base.text.trim()) return base;

  const risk = detectInstitutionalRisk(base.text);
  if (risk === 'prevalence') {
    return {
      ...base,
      classification: 'UNKNOWN',
      requiresHumanReview: true,
      note: 'Prevalence/national statistic language is not supported by pilot published records.',
    };
  }
  if (risk === 'completion' || risk === 'acknowledgement' || risk === 'implementation_started') {
    return {
      ...base,
      classification: 'UNKNOWN',
      requiresHumanReview: true,
      note:
        'Institutional ' +
        risk +
        ' cannot be established without trusted non-community verification evidence (not present in model output path).',
    };
  }

  const agg = assessAggregateClaim(base.text, aggregateMeta);
  if (!agg.ok) {
    return {
      ...base,
      classification: agg.demoteTo || 'UNKNOWN',
      requiresHumanReview: true,
      note: 'Aggregate/metric validation: ' + agg.reason,
    };
  }

  if (allowCommunity && preferredClassification === 'COMMUNITY_REPORT') {
    return { ...base, classification: 'COMMUNITY_REPORT' };
  }

  return base;
}

/**
 * Lightweight narrative post-filter: append honesty block if risky language detected.
 * Does not rewrite the whole answer; constrains presentation.
 */
export function applyNarrativeEvidencePolicy(text, aggregateMeta) {
  if (typeof text !== 'string' || !text.trim()) {
    return { text: text || '', policyApplied: false, flags: [] };
  }
  const flags = [];
  const risk = detectInstitutionalRisk(text);
  if (risk) flags.push(risk);
  const agg = assessAggregateClaim(text, aggregateMeta);
  if (!agg.ok) flags.push(agg.reason);

  if (!flags.length) {
    return { text, policyApplied: false, flags: [] };
  }

  const notice = [
    '',
    '---',
    '**Evidence policy notice (server)**',
    'Parts of the answer above may overstate what published Civic Mandate evidence can establish.',
    'Flags: ' + flags.join(', ') + '.',
    'Published community records are not national statistics, official acknowledgements, or verified outcomes.',
    'Treat institutional action claims as **unverified** unless independently documented outside this assistant.',
  ].join('\n');

  return { text: text + notice, policyApplied: true, flags };
}

export function itemText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    return item.text || item.statement || item.summary || item.limitations || '';
  }
  return '';
}
