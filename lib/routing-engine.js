/**
 * Deterministic mandate → office routing (recommendation only).
 */
import {
  OFFICE_REGISTRY,
  REGISTRY_VERSION,
  getOfficeById,
  candidateOfficesForDuty,
} from './office-registry.js';

const DUTY_ALIASES = {
  health: 'Health',
  education: 'Education',
  security: 'Security',
  power: 'Power',
  water: 'Water',
  roads: 'Roads & Transport',
  transport: 'Roads & Transport',
  'roads & transport': 'Roads & Transport',
  agriculture: 'Agriculture',
  jobs: 'Jobs & Economy',
  economy: 'Jobs & Economy',
  'jobs & economy': 'Jobs & Economy',
  housing: 'Housing',
  environment: 'Environment',
  justice: 'Justice',
  transparency: 'Transparency',
  'public finance': 'Public Finance',
  youth: 'Youth Development',
  'youth development': 'Youth Development',
};

export function normaliseDuty(duty) {
  if (!duty || typeof duty !== 'string') return '';
  const key = duty.trim().toLowerCase();
  return DUTY_ALIASES[key] || duty.trim();
}

function textHints(text = '') {
  const t = text.toLowerCase();
  return {
    mentionsFederalHighway: /federal (highway|road)|expressway|a[0-9]{1,3}\b/.test(t),
    mentionsLga: /\blga\b|local government/.test(t),
  };
}

function rankScore(rank) {
  if (rank === 'primary') return 3;
  if (rank === 'shared') return 2;
  return 1;
}

export function routeMandate(input = {}) {
  const generatedAt = new Date().toISOString();
  const warnings = [];
  const missingInformation = [];

  const duty = normaliseDuty(input.duty);
  const state = (input.state || '').trim();
  const lga = (input.lga || '').trim();
  const namedOffice = (input.namedOffice || '').trim();
  const roadClass = input.roadClass || 'unknown';
  const hints = textHints(input.mandateText || '');

  if (!duty && !(input.mandateText || '').trim()) {
    return {
      registryVersion: REGISTRY_VERSION,
      generatedAt,
      primary: null,
      additional: [],
      status: 'insufficient_information',
      missingInformation: ['mandate text or duty category'],
      humanReviewRequired: true,
      suggestedNextAction: 'Collect a concrete public-service demand and duty category before routing.',
      externalDeliveryAllowed: false,
      warnings: ['No demand content provided.'],
    };
  }

  if (!state) missingInformation.push('state');
  if (!lga && (duty === 'Water' || duty === 'Roads & Transport' || hints.mentionsLga)) {
    missingInformation.push('LGA (helpful for local vs state distinction)');
  }
  if (duty === 'Roads & Transport' && roadClass === 'unknown' && !hints.mentionsFederalHighway) {
    missingInformation.push('road class (federal / state / local)');
  }

  const jurisdictionKnown = Boolean(state);
  let candidates = [];

  const dutyOffices = duty ? candidateOfficesForDuty(duty) : [];
  for (const o of dutyOffices) {
    candidates.push({
      officeId: o.id,
      institutionalName: o.institutionalName,
      governmentLevel: o.governmentLevel,
      role: o.responsibilityDescription,
      rank: o.governmentLevel === 'state' && jurisdictionKnown ? 'primary' : 'shared',
      reason: 'Registry lists this office among applicable institutions for duty "' + duty + '".',
      evidenceNotes: [
        'Registry version ' + REGISTRY_VERSION,
        o.sourceNote || 'Source note incomplete',
        'verificationStatus=' + o.verificationStatus,
      ],
      confidence: o.verificationStatus === 'verified' && jurisdictionKnown ? 'medium' : 'low',
    });
  }

  if (duty === 'Roads & Transport') {
    candidates = candidates.filter(
      (c) => c.officeId !== 'fed-president' || roadClass === 'federal' || hints.mentionsFederalHighway
    );
    if (roadClass === 'federal' || hints.mentionsFederalHighway) {
      const fed = getOfficeById('fed-president');
      if (fed) {
        candidates.unshift({
          officeId: fed.id,
          institutionalName: fed.institutionalName,
          governmentLevel: fed.governmentLevel,
          role: 'Federal highway / federal road policy framework',
          rank: 'primary',
          reason: 'Road class or text indicates a federal corridor.',
          evidenceNotes: ['Road ownership determines office; confirm corridor classification.'],
          confidence: roadClass === 'federal' ? 'medium' : 'low',
        });
      }
    }
  }

  if (duty === 'Security') {
    candidates = candidates.filter((c) => c.officeId !== 'fed-vp');
    const pres = candidates.find((c) => c.officeId === 'fed-president');
    if (pres) {
      pres.rank = 'primary';
      pres.reason =
        'Federal security architecture is primarily a national executive responsibility; state coordination may still apply.';
      pres.confidence = jurisdictionKnown ? 'medium' : 'low';
    }
  }

  if (!input.vpDelegatedRoleDocumented) {
    candidates = candidates.filter((c) => c.officeId !== 'fed-vp');
  } else {
    const vp = getOfficeById('fed-vp');
    if (vp) {
      candidates.push({
        officeId: vp.id,
        institutionalName: vp.institutionalName,
        governmentLevel: vp.governmentLevel,
        role: 'Documented delegated or coordination role only',
        rank: 'alternative',
        reason: 'Caller marked a documented VP delegated role; still requires human review.',
        evidenceNotes: ['VP is never the automatic national default.'],
        confidence: 'low',
      });
    }
  }

  const seen = new Set();
  candidates = candidates.filter((c) => {
    if (seen.has(c.officeId)) return false;
    seen.add(c.officeId);
    return true;
  });

  if (!jurisdictionKnown) {
    warnings.push('State unknown: cannot finalise geographic jurisdiction.');
    for (const c of candidates) {
      c.confidence = 'insufficient';
      c.rank = c.rank === 'primary' ? 'shared' : c.rank;
    }
  }

  if (
    jurisdictionKnown &&
    duty &&
    duty !== 'Security' &&
    !(duty === 'Roads & Transport' && (roadClass === 'federal' || hints.mentionsFederalHighway))
  ) {
    const gov = candidates.find((c) => c.officeId === 'state-governor');
    if (gov) {
      gov.rank = 'primary';
      gov.reason =
        'For duty "' +
        duty +
        '" with state "' +
        state +
        '", state executive is often the first operational destination under concurrent practice — still requires human review.';
      if (gov.confidence === 'insufficient') gov.confidence = 'low';
      else if (gov.confidence === 'low') gov.confidence = 'medium';
    }
  }

  candidates.sort((a, b) => rankScore(b.rank) - rankScore(a.rank));
  const primary = candidates.find((c) => c.rank === 'primary') || null;
  const rest = candidates.filter((c) => c !== primary);

  let status = 'recommended';
  if (!primary || primary.confidence === 'insufficient' || !jurisdictionKnown) {
    status = missingInformation.length ? 'insufficient_information' : 'needs_review';
  } else if (primary.confidence === 'low') {
    status = 'needs_review';
  }

  warnings.push('Pilot registry has no verified officeholder contacts; external referral send is disabled.');

  let suggestedNextAction =
    status === 'insufficient_information'
      ? 'Gather missing location/jurisdiction fields, then re-run routing for human review.'
      : 'Human reviewer should confirm institution, jurisdiction, and evidence before any referral draft is approved.';
  if (status === 'recommended') {
    suggestedNextAction =
      'Prepare a human-reviewable referral brief for the primary institution; do not send externally until approved and contacts are verified.';
  }

  return {
    registryVersion: REGISTRY_VERSION,
    generatedAt,
    primary,
    additional: rest.slice(0, 5),
    status,
    missingInformation,
    humanReviewRequired: true,
    suggestedNextAction,
    externalDeliveryAllowed: false,
    warnings,
  };
}
