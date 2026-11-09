/**
 * Read-only client for the Observatory's curated, dated national source snapshots.
 * Values remain publisher-attributed transcriptions, not live source API observations.
 */
export const DEFAULT_OBSERVATORY_SNAPSHOT_URL =
  "https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/snapshots";

const CONTRACT_VERSION = "1.0.0";
const ALLOWED_HOST = "iseyc-civic-intelligence-observatory.vercel.app";
const ALLOWED_PUBLISHER_HOSTS = new Set([
  "www.who.int",
  "who.int",
  "nimc.gov.ng",
  "www.nimc.gov.ng",
  "dashboard.digitalliteracy.nitda.gov.ng",
  "nitda.gov.ng",
  "www.nitda.gov.ng",
  "innovation.naseni.gov.ng",
  "microdata.nigerianstat.gov.ng",
  "isnhubs.org.ng",
  "www.isnhubs.org.ng",
  "emis.education.gov.ng",
  "www.worldbank.org",
  "worldbank.org",
]);
const MAX_BODY_CHARS = 180_000;
const MAX_RECORDS = 12;
const MAX_METRICS = 20;

function empty(status, limitations = [], errorCode = null, records = []) {
  return {
    source: "iseyc-observatory-national-snapshots-v1",
    contractVersion: CONTRACT_VERSION,
    status,
    records,
    limitations,
    errorCode,
    fetchedAt: new Date().toISOString(),
  };
}

function isApprovedPublisherUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_PUBLISHER_HOSTS.has(url.hostname);
  } catch { return false; }
}

export function selectSnapshotRecords(query) {
  const text = String(query || "").toLowerCase();
  const broad = /\b(national indicators?|national data|nigeria statistics|national overview|national picture|overview of nigeria)\b/.test(text);
  const selected = [];
  const add = (id) => { if (!selected.includes(id)) selected.push(id); };
  if (broad || /\b(health|hiv|mortality|maternal|neonatal|child health|immuni[sz]ation|disease|healthcare)\b/.test(text)) add("who-nigeria-health-2021-23");
  if (broad || /\b(nin|identity|national identity|identity registration|digital id)\b/.test(text)) add("nimc-enrolment-2025-10");
  if (broad || /\b(education|school|learning|school census|teacher|classroom)\b/.test(text)) add("fme-annual-school-census-national-2024-25");
  if (/\b(kaduna|kaduna state|kaduna south)\b/.test(text)) add("fme-annual-school-census-kaduna-2024-25");
  if (broad || /\b(digital literacy|digital skills|software|technology|digital economy|digital access|education|school|learning)\b/.test(text)) add("nitda-dl4all-2026-10");
  if (broad || /\b(naseni|innovation|innovator|manufacturing|engineering|startup|start-up)\b/.test(text)) add("naseni-innovatenaija-2025");
  if (broad || /\b(innovation hub|innovation hubs|hub directory|hub assessment|startup ecosystem|tech hub|technology hubs|software sector|software ecosystem|digital economy)\b/.test(text)) add("isn-innovation-hub-assessment-2026");
  if (broad || /\b(gdp|economic growth|macroeconomic|national economy|economy|gross domestic product)\b/.test(text)) add("nbs-gdp-q1-2026");
  if (broad || /\b(macroeconomic|current account|foreign reserves|gross reserves|world bank development update|fiscal revenue)\b/.test(text)) add("worldbank-ndu-2026-10");
  return selected.slice(0, MAX_RECORDS);
}

function validateRecord(record, expectedId) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return "RECORD_INVALID";
  if (record.id !== expectedId || typeof record.title !== "string" || !record.title.trim()) return "RECORD_ID_OR_TITLE_INVALID";
  if (typeof record.publisher !== "string" || !record.publisher.trim() || typeof record.sourceId !== "string" || !record.sourceId.trim()) return "RECORD_PUBLISHER_INVALID";
  if (!isApprovedPublisherUrl(record.sourceUrl)) return "RECORD_SOURCE_NOT_ALLOWLISTED";
  if (typeof record.referencePeriod !== "string" || !record.referencePeriod.trim() || typeof record.retrievedAt !== "string") return "RECORD_PERIOD_INVALID";
  if (!record.geography || typeof record.geography !== "object" || typeof record.geography.level !== "string" || typeof record.geography.label !== "string") return "RECORD_GEOGRAPHY_INVALID";
  if (typeof record.evidenceType !== "string" || !Array.isArray(record.metrics) || record.metrics.length < 1 || record.metrics.length > MAX_METRICS) return "RECORD_METRICS_INVALID";
  for (const metric of record.metrics) {
    if (!metric || typeof metric.label !== "string" || typeof metric.value !== "string" || typeof metric.unit !== "string" || typeof metric.period !== "string" || (metric.measurementType !== undefined && typeof metric.measurementType !== "string")) return "METRIC_SCHEMA_INVALID";
  }
  if (!Array.isArray(record.limitations) || record.limitations.length < 1 || record.limitations.some((item) => typeof item !== "string" || item.length > 2000)) return "RECORD_LIMITATIONS_INVALID";
  if (typeof record.interpretation !== "string" || record.interpretation.length > 2000) return "RECORD_INTERPRETATION_INVALID";
  return null;
}

async function fetchBundle(fetchImpl, url, ids, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal });
    const raw = await response.text();
    if (raw.length > MAX_BODY_CHARS) return { error: "RESPONSE_TOO_LARGE" };
    let data;
    try { data = JSON.parse(raw); } catch { return { error: "RESPONSE_PARSE_ERROR" }; }
    if (!response.ok) return { error: "UPSTREAM_HTTP_" + response.status };
    if (!data || data.contractVersion !== CONTRACT_VERSION || data.source !== "iseyc-observatory-national-snapshots-v1" ||
        !["ok", "empty"].includes(data.status) || !Array.isArray(data.records) || data.records.length > MAX_RECORDS) {
      return { error: "UPSTREAM_CONTRACT_INVALID" };
    }
    const byId = new Map(data.records.map((record) => [record.id, record]));
    const records = [];
    for (const id of ids) {
      const record = byId.get(id);
      if (!record) continue;
      const error = validateRecord(record, id);
      if (error) return { error };
      records.push({
        id: record.id,
        title: record.title,
        publisher: record.publisher,
        sourceId: record.sourceId,
        sourceUrl: record.sourceUrl,
        referencePeriod: record.referencePeriod,
        retrievedAt: record.retrievedAt,
        geography: record.geography,
        evidenceType: record.evidenceType,
        metrics: record.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value,
          unit: metric.unit,
          period: metric.period,
          interval: metric.interval || null,
          measurementType: metric.measurementType || null,
        })),
        limitations: record.limitations.slice(0, 10),
        interpretation: record.interpretation,
        departmentIds: Array.isArray(record.departmentIds) ? record.departmentIds.slice(0, 4) : [],
      });
    }
    if (records.length !== ids.length) return { error: "REQUESTED_SNAPSHOT_MISSING" };
    return { data: {
      source: "iseyc-observatory-national-snapshots-v1",
      contractVersion: CONTRACT_VERSION,
      status: records.length ? "ready" : "empty",
      records,
      limitations: Array.isArray(data.limitations) ? data.limitations.slice(0, 8) : [],
      fetchedAt: data.retrievedAt || new Date().toISOString(),
    } };
  } catch (error) {
    return { error: error?.name === "AbortError" ? "SOURCE_TIMEOUT" : "SOURCE_FETCH_FAILED" };
  } finally { clearTimeout(timer); }
}

export async function fetchObservatorySnapshots(query, fetchImpl = fetch, options = {}) {
  const ids = selectSnapshotRecords(query);
  if (!ids.length) return empty("skipped", ["No curated national snapshot was relevant to this question."]);
  const baseUrl = String(options.url || process.env.CIVIC_OBSERVATORY_SNAPSHOT_URL || DEFAULT_OBSERVATORY_SNAPSHOT_URL).trim();
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST || parsed.pathname !== "/api/evidence/snapshots") {
      return empty("invalid", ["The configured national snapshot endpoint is not the approved ISEYC Observatory endpoint."], "UNTRUSTED_ENDPOINT");
    }
    const requestUrl = new URL(baseUrl);
    requestUrl.searchParams.set("catalog", "0");
    const result = await fetchBundle(fetchImpl, requestUrl.toString(), ids, options.timeoutMs || 6000);
    if (result.error) return empty("unavailable", ["The Observatory snapshot feed failed contract validation. No substitute values are used."], result.error);
    return result.data;
  } catch {
    return empty("invalid", ["The configured national snapshot endpoint URL is invalid."], "INVALID_ENDPOINT");
  }
}

export function formatObservatorySnapshotBlock(bundle) {
  if (!bundle || bundle.status === "skipped") return "No curated national source snapshots were requested for this question.";
  if (bundle.status === "invalid" || bundle.status === "unavailable") return "OBSERVATORY_SNAPSHOTS_STATUS: " + bundle.status + "\nNo curated national snapshot was available. Do not invent or substitute values.";
  const lines = [
    "SOURCE_LAYER: ISEYC Civic Intelligence Observatory — curated national source snapshots",
    "SOURCE_TYPE: dated manual transcriptions from named publisher sources; not a live feed from those publishers.",
    "CONTRACT_VERSION: " + CONTRACT_VERSION,
    "STATUS: " + bundle.status,
    "RETRIEVED_AT: " + (bundle.fetchedAt || "unknown"),
  ];
  for (const record of bundle.records || []) {
    lines.push("", "SNAPSHOT_ID: " + record.id, "TITLE: " + record.title, "PUBLISHER: " + record.publisher,
      "SOURCE_URL: " + record.sourceUrl, "SOURCE_REFERENCE_PERIOD: " + record.referencePeriod,
      "GEOGRAPHY: " + record.geography.label + " (" + record.geography.level + ")",
      "EVIDENCE_TYPE: " + record.evidenceType, "INTERPRETATION: " + record.interpretation);
    for (const metric of record.metrics) {
      lines.push("METRIC: " + metric.label + " = " + metric.value + " " + metric.unit +
        " | reference period: " + metric.period + (metric.interval ? " | uncertainty interval: " + metric.interval : "") + (metric.measurementType ? " | measurement type: " + metric.measurementType : ""));
    }
    lines.push("LIMITATIONS: " + record.limitations.join(" | "));
  }
  for (const limitation of bundle.limitations || []) lines.push("BUNDLE_LIMITATION: " + limitation);
  lines.push("INTERPRETATION RULE: Preserve publisher, reference period, geography and evidence type. Do not turn estimates into direct counts, announcements into delivered outcomes, programme targets into achieved rates, or national aggregates into state/LGA/facility facts.");
  return lines.join("\n");
}
