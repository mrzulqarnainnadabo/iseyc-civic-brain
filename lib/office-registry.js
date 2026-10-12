/**
 * Office responsibility registry (pilot). No invented officeholders or contacts.
 */

export const OFFICE_REGISTRY = [
  {
    id: 'fed-president',
    category: 'federal_executive',
    institutionalName: 'President of the Federal Republic of Nigeria',
    governmentLevel: 'federal',
    responsibilityDescription: 'Federal executive authority including national security architecture and major federal programmes.',
    jurisdictionType: 'federal',
    applicableDuties: ['Security', 'Power', 'Public Finance', 'Transparency', 'Justice', 'Jobs & Economy'],
    sourceNote: 'Constitutional federal executive; programme ownership varies by statute and practice.',
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
    responsibilityDescription: 'Legislative representation for a senatorial district; oversight — not operational command.',
    jurisdictionType: 'federal',
    applicableDuties: ['Security', 'Public Finance', 'Transparency', 'Justice'],
    sourceNote: 'Senatorial district is not interchangeable with federal constituency or LGA.',
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
    responsibilityDescription: 'State executive authority for concurrent and residual matters as practised in the state.',
    jurisdictionType: 'state',
    stateScope: '*',
    applicableDuties: ['Health', 'Education', 'Water', 'Roads & Transport', 'Agriculture', 'Jobs & Economy', 'Housing', 'Environment', 'Youth Development'],
    sourceNote: 'Often primary for state services; not automatically responsible for federal highways or federal security command.',
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
];

export const REGISTRY_VERSION = '2026-10-12-pilot-v1';

export function getOfficeById(id) {
  return OFFICE_REGISTRY.find((o) => o.id === id) || null;
}

export function listOfficesByLevel(level) {
  return OFFICE_REGISTRY.filter((o) => o.governmentLevel === level);
}

export function candidateOfficesForDuty(duty) {
  const d = (duty || '').trim();
  if (!d) return [];
  return OFFICE_REGISTRY.filter((o) =>
    o.applicableDuties.some((x) => x.toLowerCase() === d.toLowerCase())
  );
}
