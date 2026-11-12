/**
 * Read-only adapter for the Observatory's curated source-snapshot contract.
 * This is a dated transcription feed, not a live feed from source publishers.
 */
export const DEFAULT_OBSERVATORY_SNAPSHOT_URL =
  "https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/source-snapshots";

const CONTRACT_VERSION = "1.0.0";
const ALLOWED_HOST = "iseyc-civic-intelligence-observatory.vercel.app";
const ALLOWED_PATH = "/api/evidence/source-snapshots";
const ALLOWED_PUBLISHER_HOSTS = new Set([
  "www.afro.who.int", "afro.who.int", "who.int", "www.who.int", "data.who.int",
  "nimc.gov.ng", "www.nimc.gov.ng", "nphcda.gov.ng", "www.nphcda.gov.ng",
  "www.imf.org", "imf.org", "agorapolicy.org", "www.agorapolicy.org",
  "budgit.org", "www.budgit.org", "statehouse.gov.ng", "abiastate.gov.ng",
  "kdsg.gov.ng", "dashboard.digitalliteracy.nitda.gov.ng", "nitda.gov.ng",
  "www.nitda.gov.ng", "innovation.naseni.gov.ng", "microdata.nigerianstat.gov.ng",
  "isnhubs.org.ng", "www.isnhubs.org.ng", "emis.education.gov.ng",
  "www.worldbank.org", "worldbank.org", "publicfinance.ngf.org.ng",
  "www.publicfinance.ngf.org.ng"
]);
const MAX_BODY_CHARS = 180_000;
const MAX_RECORDS = 12;

function empty(status, limitations = [], errorCode = null, records = []) {
  return {
    source: "iseyc-observatory-curated-source-snapshots-v1",
    contractVersion: CONTRACT_VERSION,
    status,
    records,
    limitations,
    errorCode,
    fetchedAt: new Date().toISOString()
  };
}

function isApprovedPublisherUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ALLOWED_PUBLISHER_HOSTS.has(url.hostname);
  } catch { return false; }
}

export function selectSnapshotRecords(query) {
  const text = String(query || "").toLowerCase();
  const broad = /\b(national|nigeria|countrywide|overview|statewide|states)\b/.test(text);
  const selected = [];
  const add = (id) => { if (!selected.includes(id)) selected.push(id); };
  if (broad || /\b(health|hospital|phc|medicine|maternal|mortality|immuni[sz]ation|disease)\b/.test(text)) add("health");
  if (broad || /\b(education|school|teacher|learning|classroom|skills)\b/.test(text)) add("education");
  if (broad || /\b(digital|technology|software|connectivity|innovation|startup|internet)\b/.test(text)) add("software-technology");
  if (broad || /\b(budget|appropriation|revenue|expenditure|allocation|fiscal|governance|accountability)\b/.test(text)) add("civic");
  return selected;
}

function validateObservation(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return "RECORD_INVALID";
  if (typeof item.id !== "string" || !item.id.trim() ||
      typeof item.title !== "string" || !item.title.trim()) return "RECORD_ID_OR_TITLE_INVALID";
  if (typeof item.sourcePublisher !== "string" || !item.sourcePublisher.trim() ||
      typeof item.sourceId !== "string" || !item.sourceId.trim()) return "RECORD_PUBLISHER_INVALID";
  if (!isApprovedPublisherUrl(item.sourceUrl)) return "RECORD_SOURCE_NOT_ALLOWLISTED";
  if (typeof item.referencePeriod !== "string" || !item.referencePeriod.trim() ||
      typeof item.measurementType !== "string" || !item.measurementType.trim()) return "RECORD_PERIOD_INVALID";
  if (typeof item.value !== "number" || !Number.isFinite(item.value) ||
      typeof item.unit !== "string" || !item.unit.trim()) return "RECORD_VALUE_INVALID";
  if (!["national", "state", "varies"].includes(item.geoLevel) ||
      typeof item.geographicCoverage !== "string" || !item.geographicCoverage.trim()) return "RECORD_GEOGRAPHY_INVALID";
  if (!["official_source", "published_research"].includes(item.sourceType)) return "RECORD_TYPE_INVALID";
  if (!Array.isArray(item.departments) || !item.departments.length ||
      item.departments.some((x) => !["education", "health", "software-technology", "civic"].includes(x))) return "RECORD_DEPARTMENTS_INVALID";
  if (!Array.isArray(item.limitations) || !item.limitations.length ||
      item.limitations.some((x) => typeof x !== "string" || !x.trim())) return "RECORD_LIMITATIONS_INVALID";
  if (typeof item.interpretation !== "string" || !item.interpretation.trim()) return "RECORD_INTERPRETATION_INVALID";
  return null;
}

function mapObservation(item, checkedAt) {
  return {
    id: item.id,
    title: item.title,
    publisher: item.sourcePublisher,
    sourceId: item.sourceId,
    sourceUrl: item.sourceUrl,
    referencePeriod: item.referencePeriod,
    retrievedAt: checkedAt,
    geography: { level: item.geoLevel, label: item.geographicCoverage },
    evidenceType: item.sourceType,
    metrics: [{
      label: item.title,
      value: String(item.value),
      unit: item.unit,
      period: item.referencePeriod,
      measurementType: item.measurementType
    }],
    limitations: item.limitations.slice(0, 8),
    interpretation: item.interpretation,
    departmentIds: item.departments.slice(0, 4)
  };
}

async function fetchBundle(fetchImpl, url, selected, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const raw = await response.text();
    if (raw.length > MAX_BODY_CHARS) return { error: "RESPONSE_TOO_LARGE" };
    if (!response.ok) return { error: "UPSTREAM_HTTP_" + response.status };
    let data;
    try { data = JSON.parse(raw); } catch { return { error: "RESPONSE_PARSE_ERROR" }; }
    if (!data || data.contractVersion !== CONTRACT_VERSION ||
        data.source !== "iseyc-observatory-curated-source-snapshots-v1" ||
        !["curated", "empty"].includes(data.status) ||
        !Array.isArray(data.observations) || data.observations.length > 200 ||
        typeof data.checkedAt !== "string") return { error: "UPSTREAM_CONTRACT_INVALID" };

    const matched = data.observations.filter((item) =>
      selected.some((department) => item.departments?.includes(department))
    );
    const records = [];
    for (const item of matched) {
      const error = validateObservation(item);
      if (error) return { error };
      records.push(mapObservation(item, data.checkedAt));
      if (records.length >= MAX_RECORDS) break;
    }
    return { data: {
      source: "iseyc-observatory-curated-source-snapshots-v1",
      contractVersion: CONTRACT_VERSION,
      status: records.length ? "ready" : "empty",
      records,
      limitations: [
        "Curated, dated transcriptions; not live publisher feeds.",
        ...(Array.isArray(data.limitations) ? data.limitations.slice(0, 5) : [])
      ],
      reconciliationNotes: Array.isArray(data.reconciliationNotes) ? data.reconciliationNotes.slice(0, 8) : [],
      stateBudgetCoverage: data.stateBudgetCoverage || null,
      fetchedAt: data.checkedAt
    } };
  } catch (error) {
    return { error: error?.name === "AbortError" ? "SOURCE_TIMEOUT" : "SOURCE_FETCH_FAILED" };
  } finally { clearTimeout(timer); }
}

export async function fetchObservatorySnapshots(query, fetchImpl = fetch, options = {}) {
  const selected = selectSnapshotRecords(query);
  if (!selected.length) return empty("skipped", ["No curated source-snapshot department was relevant to this question."]);
  const baseUrl = String(options.url || process.env.CIVIC_OBSERVATORY_SNAPSHOT_URL || DEFAULT_OBSERVATORY_SNAPSHOT_URL).trim();
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST || parsed.pathname !== ALLOWED_PATH) {
      return empty("invalid", ["The configured source-snapshot endpoint is not the approved ISEYC Observatory endpoint."], "UNTRUSTED_ENDPOINT");
    }
    const result = await fetchBundle(fetchImpl, parsed.toString(), selected, options.timeoutMs || 6000);
    if (result.error) return empty("unavailable", ["The Observatory source-snapshot feed failed contract validation. No substitute values are used."], result.error);
    return result.data;
  } catch {
    return empty("invalid", ["The configured source-snapshot endpoint URL is invalid."], "INVALID_ENDPOINT");
  }
}

export function formatObservatorySnapshotBlock(bundle) {
  if (!bundle || bundle.status === "skipped") return "No curated national source snapshots were requested for this question.";
  if (bundle.status === "invalid" || bundle.status === "unavailable") return "OBSERVATORY_SNAPSHOTS_STATUS: " + bundle.status + "\nNo curated national snapshot was available. Do not invent or substitute values.";
  const lines = [
    "SOURCE_LAYER: ISEYC Intelligence Observatory — curated national and state source snapshots",
    "SOURCE_TYPE: dated manual transcriptions from named publisher sources; not live feeds from those publishers.",
    "CONTRACT_VERSION: " + CONTRACT_VERSION,
    "STATUS: " + bundle.status,
    "CHECKED_AT: " + (bundle.fetchedAt || "unknown")
  ];
  for (const record of bundle.records || []) {
    lines.push("", "SNAPSHOT_ID: " + record.id, "TITLE: " + record.title, "PUBLISHER: " + record.publisher,
      "SOURCE_URL: " + record.sourceUrl, "SOURCE_REFERENCE_PERIOD: " + record.referencePeriod,
      "GEOGRAPHY: " + record.geography.label + " (" + record.geography.level + ")",
      "EVIDENCE_TYPE: " + record.evidenceType, "INTERPRETATION: " + record.interpretation);
    for (const metric of record.metrics) {
      lines.push("METRIC: " + metric.label + " = " + metric.value + " " + metric.unit +
        " | reference period: " + metric.period + (metric.measurementType ? " | measurement type: " + metric.measurementType : ""));
    }
    lines.push("LIMITATIONS: " + record.limitations.join(" | "));
  }
  for (const note of bundle.reconciliationNotes || []) lines.push("RECONCILIATION_NOTE: " + note.title + " — " + note.detail);
  for (const limitation of bundle.limitations || []) lines.push("BUNDLE_LIMITATION: " + limitation);
  lines.push("INTERPRETATION RULE: Preserve publisher, reference period, geography and evidence type. Do not turn estimates into direct counts, allocations into spending, announcements into delivered outcomes, programme targets into achieved rates, or national aggregates into state/LGA/facility facts.");
  return lines.join("\n");
}
