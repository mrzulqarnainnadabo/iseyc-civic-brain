/**
 * Deterministic mandate → office routing (recommendation only).
 */
import {
  REGISTRY_VERSION,
  getOfficeById,
  candidateOfficesForDuty,
  canUseForExternalDelivery,
} from './office-registry.js';

const DUTY_ALIASES = {
  health: 'Health', education: 'Education', security: 'Security', power: 'Power', water: 'Water',
  roads: 'Roads & Transport', transport: 'Roads & Transport', 'roads & transport': 'Roads & Transport',
  agriculture: 'Agriculture', jobs: 'Jobs & Economy', economy: 'Jobs & Economy',
  'jobs & economy': 'Jobs & Economy', housing: 'Housing', environment: 'Environment',
  justice: 'Justice', transparency: 'Transparency', 'public finance': 'Public Finance',
  youth: 'Youth Development', 'youth development': 'Youth Development',
};

export function normaliseDuty(duty) {
  if (!duty || typeof duty !== 'string') return '';
  const key = duty.trim().toLowerCase();
  return DUTY_ALIASES[key] || duty.trim();
}

function textHints(text = '') {
  const t = text.toLowerCase();
  return {
    mentionsFederalHighway: /federal (highway|road)|expressway|\ba[0-9]{1,3}\b/.test(t),
    mentionsPhc: /phc|primary health|health centre|health center|essential medicine/.test(t),
    mentionsSchool: /school|teacher|classroom|primary school|ube|subeb/.test(t),
    mentionsLga: /\blga\b|local government|ward\b/.test(t),
    mentionsOversight: /oversight|public hearing|budget hearing|legislative/.test(t),
  };
}

function rankScore(rank) {
  if (rank === 'primary') return 3;
  if (rank === 'shared') return 2;
  return 1;
}

function toCandidate(o, fields) {
  return {
    officeId: o.id,
    institutionalName: o.institutionalName,
    governmentLevel: o.governmentLevel,
    roleType: o.roleType || 'executive_delivery',
    role: o.responsibilityDescription,
    rank: fields.rank,
    reason: fields.reason,
    evidenceNotes: fields.evidenceNotes || [],
    confidence: fields.confidence,
  };
}

export function routeMandate(input = {}) {
  const generatedAt = new Date().toISOString();
  const warnings = [];
  const missingInformation = [];
  const duty = normaliseDuty(input.duty);
  const state = (input.state || '').trim();
  const lga = (input.lga || '').trim();
  const roadClass = input.roadClass || 'unknown';
  const hints = textHints(input.mandateText || '');
  const recordId = typeof input.recordId === 'string' ? input.recordId.slice(0, 64) : null;

  if (!duty && !(input.mandateText || '').trim()) {
    return {
      registryVersion: REGISTRY_VERSION, generatedAt, recordId: null, primary: null, additional: [],
      status: 'insufficient_information', missingInformation: ['mandate text or duty category'],
      humanReviewRequired: true,
      suggestedNextAction: 'Collect a concrete public-service demand and duty category before routing.',
      externalDeliveryAllowed: false,
      operatorReview: { required: true, checklist: ['Insufficient input — collect demand text and location before review.'] },
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
  const dutyOffices = duty ? candidateOfficesForDuty(duty, { state }) : [];

  for (const o of dutyOffices) {
    const isSpecialised = o.category === 'specialised_agency';
    const isLegislative = o.roleType === 'legislative_oversight';
    let rank = 'shared';
    let confidence = 'low';
    if (isSpecialised && jurisdictionKnown) { rank = 'primary'; confidence = 'medium'; }
    else if (isLegislative) { rank = hints.mentionsOversight ? 'shared' : 'alternative'; confidence = 'low'; }
    candidates.push(toCandidate(o, {
      rank, confidence,
      reason: isSpecialised
        ? 'Specialised institutional pattern for duty "' + duty + '" (pilot). Confirm competent body before referral.'
        : isLegislative
          ? 'Legislative/oversight body may be relevant — not the same as operational service delivery.'
          : 'Registry lists this office among applicable institutions for duty "' + duty + '".',
      evidenceNotes: ['Registry ' + REGISTRY_VERSION, o.sourceNote || 'Source note incomplete', 'verificationStatus=' + o.verificationStatus],
    }));
  }

  if (duty === 'Roads & Transport' && (roadClass === 'federal' || hints.mentionsFederalHighway)) {
    const fed = getOfficeById('fed-president');
    if (fed) {
      candidates = candidates.filter((c) => c.officeId !== 'fed-president');
      candidates.unshift(toCandidate(fed, {
        rank: 'primary', confidence: roadClass === 'federal' ? 'medium' : 'low',
        reason: 'Road class or text indicates a federal corridor.',
        evidenceNotes: ['Confirm corridor classification before referral.'],
      }));
    }
  }

  if (duty === 'Health' && state.toLowerCase() === 'kaduna') {
    const ph = candidates.find((c) => c.officeId === 'kd-primary-health');
    if (ph) {
      ph.rank = 'primary';
      ph.confidence = hints.mentionsPhc ? 'medium' : 'low';
      ph.reason = 'Kaduna pilot: primary health / PHC pattern preferred for primary care or medicines logistics.';
    }
  }
  if (duty === 'Education' && state.toLowerCase() === 'kaduna') {
    const subeb = candidates.find((c) => c.officeId === 'kd-subeb');
    if (subeb) {
      subeb.rank = 'primary';
      subeb.confidence = hints.mentionsSchool ? 'medium' : 'low';
      subeb.reason = 'Kaduna pilot: basic-education operations often sit with SUBEB-pattern structures.';
    }
  }
  if (duty === 'Security') {
    candidates = candidates.filter((c) => c.officeId !== 'fed-vp');
    const pres = candidates.find((c) => c.officeId === 'fed-president');
    if (pres) {
      pres.rank = 'primary';
      pres.reason = 'Federal security architecture is primarily a national executive responsibility.';
      pres.confidence = jurisdictionKnown ? 'medium' : 'low';
    }
  }
  if (!input.vpDelegatedRoleDocumented) {
    candidates = candidates.filter((c) => c.officeId !== 'fed-vp');
  } else {
    const vp = getOfficeById('fed-vp');
    if (vp) candidates.push(toCandidate(vp, {
      rank: 'alternative', confidence: 'low',
      reason: 'Documented VP delegated role flagged; VP is never the automatic national default.',
      evidenceNotes: ['VP non-default rule.'],
    }));
  }

  const seen = new Set();
  candidates = candidates.filter((c) => { if (seen.has(c.officeId)) return false; seen.add(c.officeId); return true; });

  if (!jurisdictionKnown) {
    warnings.push('State unknown: cannot finalise geographic jurisdiction.');
    for (const c of candidates) { c.confidence = 'insufficient'; if (c.rank === 'primary') c.rank = 'shared'; }
  }

  const specialisedPrimary = candidates.find((c) => c.rank === 'primary' && String(c.officeId).startsWith('kd-'));
  if (specialisedPrimary) {
    for (const c of candidates) {
      if (c.officeId === 'state-governor' && c.rank === 'primary') {
        c.rank = 'shared';
        c.reason = 'Governor remains relevant for coordination; specialised pattern preferred as first operational candidate.';
      }
    }
  } else if (jurisdictionKnown && duty && duty !== 'Security' && !(duty === 'Roads & Transport' && (roadClass === 'federal' || hints.mentionsFederalHighway))) {
    const gov = candidates.find((c) => c.officeId === 'state-governor');
    if (gov && !candidates.some((c) => c.rank === 'primary')) {
      gov.rank = 'primary';
      gov.reason = 'For duty "' + duty + '" with state "' + state + '", state executive is often the first operational destination — still requires human review.';
      if (gov.confidence === 'low') gov.confidence = 'medium';
    }
  }

  candidates.sort((a, b) => rankScore(b.rank) - rankScore(a.rank));
  const primary = candidates.find((c) => c.rank === 'primary') || null;
  const rest = candidates.filter((c) => c !== primary);

  let status = 'recommended';
  if (!primary || primary.confidence === 'insufficient' || !jurisdictionKnown) {
    status = missingInformation.length ? 'insufficient_information' : 'needs_review';
  } else if (primary.confidence === 'low') status = 'needs_review';

  warnings.push('Pilot registry has no verified officeholder contacts; external referral send is disabled.');
  if (recordId) warnings.push('Linked published record id: ' + recordId);

  const externalDeliveryAllowed = Boolean(primary) && canUseForExternalDelivery(primary.officeId);
  let suggestedNextAction = status === 'insufficient_information'
    ? 'Gather missing location/jurisdiction fields, then re-run routing for human review.'
    : 'Human reviewer should confirm institution, jurisdiction, and evidence before any referral draft is approved.';
  if (status === 'recommended') {
    suggestedNextAction = 'Prepare a human-reviewable referral brief; do not send externally until approved and contacts are verified.';
  }

  return {
    registryVersion: REGISTRY_VERSION, generatedAt, recordId, primary, additional: rest.slice(0, 6),
    status, missingInformation, humanReviewRequired: true, suggestedNextAction, externalDeliveryAllowed,
    operatorReview: {
      required: true,
      checklist: [
        'Confirm duty label matches the demand text',
        'Confirm state/LGA and any road or facility ownership',
        'Confirm primary institution is operationally competent (not only political)',
        'Record agreement or override with a short reason',
        'Do not mark referral sent without consent, verified channel, and delivery evidence',
      ],
    },
    warnings,
  };
}
