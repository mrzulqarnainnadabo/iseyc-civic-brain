/**
 * Read-only CommunityRecord consumer for Civic Brain.
 * Consumes Mandate GET /api/v1/community-records only; outages fail closed.
 * Valid empty responses stay empty. Invalid or truncated contracts fail closed.
 */

export const DEFAULT_COMMUNITY_RECORDS_URL =
  process.env.CIVIC_MANDATE_COMMUNITY_RECORDS_URL ||
  'https://2027-street-mandate.vercel.app/api/v1/community-records';

const CONTRACT_VERSION = '0.1.0';
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const RECORD_KEYS = new Set([
  'id', 'contractVersion', 'publicationStatus', 'verificationStatus', 'text',
  'sector', 'duty', 'issueCategory', 'state', 'lga', 'ward', 'facilityRef',
  'officeLabel', 'reportedAt', 'publishedAt', 'createdAt', 'evidenceRefIds',
  'followUpStatus', 'relatedSuggestedIds',
]);
const VERIFICATION_STATUSES = new Set([
  'unverified', 'partially-verified', 'independently-verified', 'unknown',
]);
const FOLLOW_UP_STATUSES = new Set([
  'none', 'under-review', 'response-documented', 'outcome-unknown', 'unknown',
]);
const NULLABLE_TEXT_FIELDS = [
  'sector', 'duty', 'issueCategory', 'state', 'lga', 'ward', 'facilityRef',
  'officeLabel', 'reportedAt', 'publishedAt',
];

export function fromCommunityRecord(r) {
  return {
    id: String(r.id),
    sourceRecordId: String(r.id),
    sentence: r.text,
    duty: r.duty,
    sector: r.sector ?? null,
    issueCategory: r.issueCategory ?? null,
    office: r.officeLabel,
    state: r.state,
    lga: r.lga,
    ward: r.ward ?? null,
    facilityRef: r.facilityRef ?? null,
    reportedAt: r.reportedAt ?? null,
    publishedAt: r.publishedAt ?? null,
    created: r.createdAt,
    evidenceRefIds: Array.isArray(r.evidenceRefIds) ? r.evidenceRefIds : [],
    followUpStatus: r.followUpStatus ?? 'unknown',
    relatedSuggestedIds: Array.isArray(r.relatedSuggestedIds) ? r.relatedSuggestedIds : [],
    contractVersion: r.contractVersion,
    publicationStatus: r.publicationStatus,
    verificationStatus: r.verificationStatus,
    publicUrl: 'https://2027-street-mandate.vercel.app/mandate/' + encodeURIComponent(String(r.id)),
  };
}

function malformed(message) {
  const err = new Error(message || 'PUBLIC_RECORDS_MALFORMED');
  err.code = 'PUBLIC_RECORDS_MALFORMED';
  return err;
}

function isValidPage(data) {
  if (!data || data.contractVersion !== CONTRACT_VERSION ||
      data.publicationBoundary !== 'published-only' ||
      !Array.isArray(data.records) ||
      !Number.isInteger(data.page) || data.page < 1 ||
      !Number.isInteger(data.pageSize) || data.pageSize < 1 ||
      !Number.isInteger(data.total) || data.total < 0 ||
      !Number.isInteger(data.totalPages) || data.totalPages < 1 ||
      data.truncatedUpstream !== false ||
      data.records.length > data.pageSize) return false;
  return data.totalPages === Math.max(1, Math.ceil(data.total / data.pageSize));
}

function validateRecord(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r) ||
      Object.keys(r).some((key) => !RECORD_KEYS.has(key)) ||
      r.contractVersion !== CONTRACT_VERSION ||
      r.publicationStatus !== 'published' ||
      typeof r.id !== 'string' || !r.id.trim() ||
      typeof r.text !== 'string' || !r.text.trim() ||
      typeof r.createdAt !== 'string' ||
      !VERIFICATION_STATUSES.has(r.verificationStatus) ||
      !FOLLOW_UP_STATUSES.has(r.followUpStatus) ||
      !Array.isArray(r.evidenceRefIds) ||
      !r.evidenceRefIds.every((value) => typeof value === 'string') ||
      !Array.isArray(r.relatedSuggestedIds) ||
      !r.relatedSuggestedIds.every((value) => typeof value === 'string') ||
      NULLABLE_TEXT_FIELDS.some((key) => r[key] !== undefined && r[key] !== null && typeof r[key] !== 'string')) {
    throw malformed('CommunityRecord violated the published v0.1 allowlist or field contract');
  }
}

/**
 * @returns {{source:string, records:object[], total:number, truncated:boolean|null, states:number|null, contractVersion:string|null, limitations:string[]}}
 */
export async function fetchPublishedCommunityRecords(fetchImpl = fetch) {
  let first;
  try {
    const url = new URL(DEFAULT_COMMUNITY_RECORDS_URL);
    url.searchParams.set('page', '1');
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    const response = await fetchImpl(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('CommunityRecord HTTP ' + response.status);
    first = await response.json();
  } catch {
    const err = new Error('PUBLIC_RECORDS_UNAVAILABLE');
    err.code = 'PUBLIC_RECORDS_UNAVAILABLE';
    throw err;
  }

  if (!isValidPage(first) || first.page !== 1) {
    throw malformed('Unsupported CommunityRecord v0.1 response');
  }

  const all = [...first.records];
  const totalPages = first.totalPages;
  if (totalPages > MAX_PAGES) {
    throw malformed('CommunityRecord pagination exceeds the safe page limit');
  }

  for (let page = 2; page <= totalPages; page++) {
    let next;
    try {
      const url = new URL(DEFAULT_COMMUNITY_RECORDS_URL);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      const response = await fetchImpl(url.toString(), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('CommunityRecord HTTP ' + response.status);
      next = await response.json();
    } catch {
      const err = new Error('PUBLIC_RECORDS_UNAVAILABLE');
      err.code = 'PUBLIC_RECORDS_UNAVAILABLE';
      throw err;
    }
    if (!isValidPage(next) || next.page !== page ||
        next.pageSize !== first.pageSize || next.total !== first.total ||
        next.totalPages !== first.totalPages) {
      throw malformed('Invalid or inconsistent CommunityRecord pagination response');
    }
    all.push(...next.records);
  }

  all.forEach(validateRecord);
  if (all.length !== first.total) {
    throw malformed('CommunityRecord pagination did not return the declared complete record count');
  }
  const records = all.map(fromCommunityRecord);
  return {
    source: 'civic-mandate-community-records-v0.1',
    contractVersion: CONTRACT_VERSION,
    records,
    total: first.total,
    truncated: false,
    states: null,
    limitations: [
      first.verificationNote ||
        'verificationStatus defaults to unverified; publication is not independent verification.',
      first.prevalenceNote ||
        'Published records only — not a measure of national need.',
      'Named office is as recorded on the public record, not a legal determination.',
    ],
  };
}
