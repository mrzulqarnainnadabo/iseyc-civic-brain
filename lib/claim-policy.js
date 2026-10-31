/**
 * Shared claim policy — presentation-affecting for structured and narrative modes.
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

export function validateClaimText(text, opts = {}) {
  const { aggregateMeta = null, preferredClassification = 'ANALYSIS' } = opts;
  const base = {
    text: typeof text === 'string' ? text : '',
    classification: preferredClassification,
    requiresHumanReview: false,
    independentlyVerified: false,
    note: null,
    displayText: typeof text === 'string' ? text : '',
  };
  if (!base.text.trim()) return base;

  const risk = detectInstitutionalRisk(base.text);
  if (risk === 'prevalence') {
    return {
      ...base,
      classification: 'UNKNOWN',
      requiresHumanReview: true,
      note: 'Prevalence language unsupported.',
      displayText:
        '**Unverified:** A national prevalence claim was not established from published Civic Mandate pilot records.',
    };
  }
  if (risk === 'completion' || risk === 'acknowledgement' || risk === 'implementation_started') {
    return {
      ...base,
      classification: 'UNKNOWN',
      requiresHumanReview: true,
      note: 'Institutional ' + risk + ' unsupported.',
      displayText:
        '**Unverified:** A claim of institutional ' +
        risk.replace(/_/g, ' ') +
        ' is not established by available published evidence in this system.',
    };
  }

  const agg = assessAggregateClaim(base.text, aggregateMeta);
  if (!agg.ok) {
    return {
      ...base,
      classification: agg.demoteTo || 'UNKNOWN',
      requiresHumanReview: true,
      note: 'Aggregate: ' + agg.reason,
      displayText:
        '**Unverified:** A numerical platform claim could not be confirmed against the server aggregate snapshot.',
    };
  }

  return base;
}

/**
 * Neutralise high-risk sentences in narrative text (presentation, not just a footer).
 */
export function applyNarrativeEvidencePolicy(text, aggregateMeta) {
  if (typeof text !== 'string' || !text.trim()) {
    return { text: text || '', policyApplied: false, flags: [] };
  }

  const flags = [];
  // Split on sentence boundaries (conservative)
  const parts = text.split(/(?<=[.!?])\s+/);
  const out = [];

  for (const part of parts) {
    const risk = detectInstitutionalRisk(part);
    const agg = assessAggregateClaim(part, aggregateMeta);
    if (risk || !agg.ok) {
      if (risk) flags.push(risk);
      if (!agg.ok) flags.push(agg.reason);
      const v = validateClaimText(part, { aggregateMeta });
      out.push(v.displayText);
    } else {
      out.push(part);
    }
  }

  if (!flags.length) {
    return { text, policyApplied: false, flags: [] };
  }

  const body = out.join(' ').replace(/\s+/g, ' ').trim();
  const footer = [
    '',
    '---',
    '**Evidence limits:** Published Civic Mandate records are pilot community reports after human review — not national statistics, official acknowledgements, or verified outcomes.',
  ].join('\n');

  return { text: body + footer, policyApplied: true, flags: [...new Set(flags)] };
}

export function itemText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    return item.text || item.statement || item.summary || item.limitations || '';
  }
  return '';
}
