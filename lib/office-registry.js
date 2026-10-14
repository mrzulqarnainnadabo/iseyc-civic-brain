/**
 * Office responsibility registry (pilot). No invented officeholders or contacts.
 * Kaduna specialised patterns are partial — confirm competent body before any external referral.
 */

export const OFFICE_REGISTRY = [
  {
    id: 'fed-president',
    category: 'federal_executive',
    institutionalName: 'President of the Federal Republic of Nigeria',
    governmentLevel: 'federal',
    roleType: 'executive_delivery',
    responsibilityDescription: 'Federal executive authority including national security architecture and major federal programmes.',
    jurisdictionType: 'federal',
    applicableDuties: ['Security', 'Power', 'Public Finance', 'Transparency', 'Justice', 'Jobs & Economy'],
    sourceNote: 'Constitutional federal executive; not automatic for every concurrent state service.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: [],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'fed-vp',
    category: 'federal_executive',
    institutionalName: 'Vice President of the Federal Republic of Nigeria',
    governmentLevel: 'federal',
    roleType: 'coordination',
    responsibilityDescription: 'Constitutional deputy and roles expressly delegated; not the default for all national issues.',
    jurisdictionType: 'federal',
    applicableDuties: [],
    sourceNote: 'VP must not be auto-routed for every federal issue.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: ['fed-president'],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'fed-senator',
    category: 'federal_legislature',
    institutionalName: 'Senator (Federal Republic of Nigeria)',
    governmentLevel: 'federal',
    roleType: 'legislative_oversight',
    responsibilityDescription: 'Legislative representation for a senatorial district; oversight — not operational command.',
    jurisdictionType: 'federal',
    applicableDuties: ['Security', 'Public Finance', 'Transparency', 'Justice'],
    sourceNote: 'Senatorial district ≠ federal constituency ≠ LGA.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: [],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'fed-rep',
    category: 'federal_legislature',
    institutionalName: 'Member, House of Representatives',
    governmentLevel: 'federal',
    roleType: 'legislative_oversight',
    responsibilityDescription: 'Legislative representation for a federal constituency; oversight and advocacy.',
    jurisdictionType: 'federal',
    applicableDuties: ['Health', 'Education', 'Roads & Transport', 'Power', 'Public Finance'],
    sourceNote: 'Federal constituency ≠ senatorial district ≠ LGA.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: [],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'state-governor',
    category: 'state_executive',
    institutionalName: 'State Governor',
    governmentLevel: 'state',
    roleType: 'executive_delivery',
    responsibilityDescription: 'State executive authority for concurrent and residual matters as practised in the state.',
    jurisdictionType: 'state',
    stateScope: '*',
    applicableDuties: ['Health', 'Education', 'Water', 'Roads & Transport', 'Agriculture', 'Jobs & Economy', 'Housing', 'Environment', 'Youth Development'],
    sourceNote: 'Often first operational destination for state services; not automatic for federal highways or federal security command.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: [],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'state-assembly',
    category: 'state_legislature',
    institutionalName: 'State House of Assembly Member',
    governmentLevel: 'state',
    roleType: 'legislative_oversight',
    responsibilityDescription: 'State legislative representation and oversight; not day-to-day service operations.',
    jurisdictionType: 'state',
    stateScope: '*',
    applicableDuties: ['Education', 'Health', 'Public Finance', 'Transparency'],
    sourceNote: 'State constituency is not interchangeable with federal constituency.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: [],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'lga-chairman',
    category: 'local_government',
    institutionalName: 'Local Government Chairman',
    governmentLevel: 'local',
    roleType: 'executive_delivery',
    responsibilityDescription: 'Local government executive for LGA-level services under state law and practice.',
    jurisdictionType: 'lga',
    stateScope: '*',
    applicableDuties: ['Water', 'Environment', 'Roads & Transport', 'Health', 'Education'],
    sourceNote: 'LGA capacity varies widely by state; often needs_review when ownership is unclear.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: ['state-governor'],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'kd-subeb',
    category: 'specialised_agency',
    institutionalName: 'State Universal Basic Education Board (SUBEB) — state-level pattern',
    governmentLevel: 'state',
    roleType: 'specialised_delivery',
    responsibilityDescription: 'State basic education delivery structures for primary education logistics and basic schools — subject to state practice.',
    jurisdictionType: 'state',
    stateScope: 'Kaduna',
    applicableDuties: ['Education'],
    sourceNote: 'Kaduna pilot pattern. Confirm exact statutory name before external referral.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: ['state-governor'],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'kd-primary-health',
    category: 'specialised_agency',
    institutionalName: 'State primary health system / PHC authority — state-level pattern',
    governmentLevel: 'state',
    roleType: 'specialised_delivery',
    responsibilityDescription: 'State PHC operations, essential medicines logistics, and PHC workforce as organised under state health structures.',
    jurisdictionType: 'state',
    stateScope: 'Kaduna',
    applicableDuties: ['Health'],
    sourceNote: 'Kaduna pilot pattern. Confirm competent state health agency before external referral.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: ['state-governor', 'lga-chairman'],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'kd-water-board',
    category: 'specialised_agency',
    institutionalName: 'State water board / water corporation — state-level pattern',
    governmentLevel: 'state',
    roleType: 'specialised_delivery',
    responsibilityDescription: 'State water supply schemes where a state water board or corporation is the operational owner.',
    jurisdictionType: 'state',
    stateScope: 'Kaduna',
    applicableDuties: ['Water'],
    sourceNote: 'Rural boreholes may be LGA/community; urban schemes often state. Confirm ownership.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: ['state-governor', 'lga-chairman'],
    holdsOfficeholderIdentity: false,
  },
  {
    id: 'kd-state-roads',
    category: 'specialised_agency',
    institutionalName: 'State ministry / agency for works and transport — state roads pattern',
    governmentLevel: 'state',
    roleType: 'specialised_delivery',
    responsibilityDescription: 'State road construction and maintenance for state-classified roads.',
    jurisdictionType: 'state',
    stateScope: 'Kaduna',
    applicableDuties: ['Roads & Transport'],
    sourceNote: 'Road class is decisive. Federal corridors → federal; local streets may be LGA.',
    sourceUrl: null,
    verificationStatus: 'partial',
    lastVerifiedAt: null,
    routingEligibility: 'review_only',
    alternativeOfficeIds: ['state-governor', 'fed-president', 'lga-chairman'],
    holdsOfficeholderIdentity: false,
  },
];

export const REGISTRY_VERSION = '2026-10-13-pilot-v2-kaduna-depth';

export function getOfficeById(id) {
  return OFFICE_REGISTRY.find((o) => o.id === id) || null;
}

export function listOfficesByLevel(level) {
  return OFFICE_REGISTRY.filter((o) => o.governmentLevel === level);
}

export function candidateOfficesForDuty(duty, opts = {}) {
  const d = (duty || '').trim();
  if (!d) return [];
  const state = (opts.state || '').trim().toLowerCase();
  return OFFICE_REGISTRY.filter((o) => {
    if (!o.applicableDuties.some((x) => x.toLowerCase() === d.toLowerCase())) return false;
    if (o.stateScope && o.stateScope !== '*') {
      if (state && o.stateScope.toLowerCase() !== state) return false;
    }
    return true;
  });
}

export function canUseForExternalDelivery(officeId) {
  const o = getOfficeById(officeId);
  if (!o) return false;
  if (o.holdsOfficeholderIdentity) return false;
  if (o.verificationStatus !== 'verified') return false;
  if (o.routingEligibility !== 'eligible') return false;
  return false; // pilot hard-stop
}
