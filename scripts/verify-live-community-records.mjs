/**
 * Live integration smoke test: Mandate CommunityRecord v0.1 → Civic Brain proxy.
 * No credentials required. Fails if Brain silently falls back to legacy pulse.
 */
const BASE = 'https://2027-street-mandate.vercel.app/api/v1/community-records';
const BRAIN = 'https://iseyc-civic-brain.vercel.app/api/public-records';
const PAGE_SIZE = 50;
const MAX_PAGES = 100;

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'ISEYC-Civic-Integration-Smoke/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const firstUrl = new URL(BASE);
firstUrl.searchParams.set('page', '1');
firstUrl.searchParams.set('pageSize', String(PAGE_SIZE));
const first = await getJson(firstUrl);

assert(first.contractVersion === '0.1.0', 'Mandate contractVersion must be 0.1.0');
assert(first.publicationBoundary === 'published-only', 'Mandate must declare published-only boundary');
assert(first.page === 1 && Number.isInteger(first.totalPages) && first.totalPages >= 1, 'Mandate pagination metadata is invalid');
assert(Array.isArray(first.records), 'Mandate records must be an array');
assert(first.truncatedUpstream === false, 'Mandate upstream feed is truncated; refusing completeness claim');
assert(first.totalPages <= MAX_PAGES, 'Mandate pagination exceeds safe limit');

const mandateRecords = [...first.records];
for (let page = 2; page <= first.totalPages; page += 1) {
  const url = new URL(BASE);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(PAGE_SIZE));
  const data = await getJson(url);
  assert(data.contractVersion === '0.1.0' && data.publicationBoundary === 'published-only', `Mandate page ${page} contract mismatch`);
  assert(data.page === page && Array.isArray(data.records), `Mandate page ${page} pagination mismatch`);
  assert(data.truncatedUpstream === false, `Mandate page ${page} reports upstream truncation`);
  mandateRecords.push(...data.records);
}

const forbidden = ['email', 'phone', 'contact', 'deviceId', 'fingerprint', 'responseRequested', 'responseReceived', 'resolutionStatus'];
for (const record of mandateRecords) {
  assert(record.contractVersion === '0.1.0', `Record ${record.id} has wrong contract version`);
  assert(record.publicationStatus === 'published', `Record ${record.id} is not published`);
  assert(record.verificationStatus === 'unverified', `Record ${record.id} has unexpected verification state`);
  assert(typeof record.id === 'string' && record.id.length > 0, 'Record ID missing');
  assert(typeof record.text === 'string' && record.text.trim(), `Record ${record.id} text missing`);
  const keys = Object.keys(record).map((key) => key.toLowerCase());
  assert(!keys.some((key) => forbidden.some((term) => key.includes(term.toLowerCase()))), `Private field leaked in record ${record.id}`);
}

const mandateIds = mandateRecords.map((record) => String(record.id));
assert(new Set(mandateIds).size === mandateIds.length, 'Mandate returned duplicate record IDs');
assert(first.total === mandateRecords.length, `Mandate total mismatch: metadata ${first.total}, fetched ${mandateRecords.length}`);

const brain = await getJson(BRAIN);
assert(brain.version === '1.2.0', 'Civic Brain public-records API version mismatch');
assert(Object.prototype.hasOwnProperty.call(brain, 'fallbackReason'), 'Civic Brain must expose fallbackReason');
assert(brain.fallbackReason === null, 'Civic Brain is on the Pulse compatibility path; primary CommunityRecord path expected');
assert(brain.source === 'civic-mandate-community-records-v0.1', 'Civic Brain is not consuming CommunityRecord v0.1 (possible legacy fallback)');
assert(brain.contractVersion === '0.1.0', 'Civic Brain contractVersion mismatch');
assert(Array.isArray(brain.records), 'Civic Brain records must be an array');
assert(brain.truncated === false, 'Civic Brain reports a truncated feed');
const brainIds = brain.records.map((record) => String(record.id));
assert(new Set(brainIds).size === brainIds.length, 'Civic Brain returned duplicate record IDs');
assert(brainIds.length === mandateIds.length, `Record count mismatch: Mandate ${mandateIds.length}, Brain ${brainIds.length}`);
const expected = new Set(mandateIds);
for (const id of brainIds) assert(expected.has(id), `Civic Brain contains unexpected record ID ${id}`);
const received = new Set(brainIds);
for (const id of mandateIds) assert(received.has(id), `Civic Brain is missing Mandate record ID ${id}`);

console.log(JSON.stringify({
  ok: true,
  contractVersion: first.contractVersion,
  publicationBoundary: first.publicationBoundary,
  mandateTotal: mandateRecords.length,
  brainTotal: brain.records.length,
  recordIdsMatch: true,
  source: brain.source,
  fallbackReason: brain.fallbackReason,
  upstreamTruncated: first.truncatedUpstream,
  limitations: brain.limitations ?? [],
}, null, 2));
