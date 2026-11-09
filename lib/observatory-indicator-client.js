/**
 * Read-only client for the Observatory's allowlisted national indicator gateway.
 * The gateway returns source observations; this client never promotes them to local facts.
 */

export const DEFAULT_OBSERVATORY_INDICATOR_URL =
  "https://iseyc-civic-intelligence-observatory.vercel.app/api/evidence/observations";

const CONTRACT_VERSION = "1.0.0";
const ALLOWED_HOST = "iseyc-civic-intelligence-observatory.vercel.app";
const OFFICIAL_SOURCE_HOSTS = ["data.worldbank.org", "api.worldbank.org"];
const MAX_BODY_CHARS = 250_000;
const MAX_INDICATORS = 5;
const MAX_OBSERVATIONS = 5;

export const INDICATOR_CATALOG = Object.freeze([
  { id: "wb-nga-sh-dyn-mort", topics: ["health", "mortality", "maternal", "child health", "children", "infant"] },
  { id: "wb-nga-se-prm-enrr", topics: ["education", "school", "enrolment", "enrollment", "primary education", "learners"] },
  { id: "wb-nga-sl-uem-totl-zs", topics: ["employment", "jobs", "unemployment", "labour", "labor", "workforce", "work"] },
  { id: "wb-nga-it-net-user-zs", topics: ["internet", "digital", "broadband", "connectivity", "technology", "online"] },
  { id: "wb-nga-eg-elc-accs-zs", topics: ["electricity", "power", "energy", "grid", "electrification"] },
  { id: "wb-nga-sp-pop-totl", topics: ["population", "demographic", "people", "population size"] },
]);

function empty(status, limitations = [], errorCode = null, indicators = []) {
  return { source: "iseyc-observatory-indicators-v1", contractVersion: CONTRACT_VERSION, status, indicators, limitations, errorCode, fetchedAt: new Date().toISOString() };
}

function officialWorldBankUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OFFICIAL_SOURCE_HOSTS.includes(url.hostname);
  } catch { return false; }
}

export function selectIndicators(query) {
  const text = String(query || "").toLowerCase();
  const broad = /\b(national indicators?|national data|country indicators?|overview of nigeria|nigeria statistics)\b/.test(text);
  const selected = INDICATOR_CATALOG.filter((item) => broad || item.topics.some((topic) => text.includes(topic)));
  return selected.slice(0, MAX_INDICATORS).map((item) => item.id);
}

function validatePayload(data, expectedId) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "INVALID_PAYLOAD";
  if (data.contractVersion !== CONTRACT_VERSION) return "UNSUPPORTED_CONTRACT";
  if (data.status !== "ok" && data.status !== "empty") return "UPSTREAM_STATUS_INVALID";
  const meta = data.indicator;
  if (!meta || typeof meta !== "object" || meta.id !== expectedId) return "INDICATOR_ID_MISMATCH";
  if (typeof meta.title !== "string" || !meta.title.trim() || typeof meta.definition !== "string" || typeof meta.unit !== "string") return "INDICATOR_METADATA_MISSING";
  if (!["measured", "estimated", "modelled", "derived"].includes(meta.measurementType)) return "MEASUREMENT_TYPE_INVALID";
  if (meta.geoLevel !== "national") return "GEOGRAPHY_NOT_NATIONAL";
  if (typeof meta.sourcePublisher !== "string" || !meta.sourcePublisher.trim() || !officialWorldBankUrl(meta.sourceUrl)) return "SOURCE_NOT_TRUSTED";
  if (!Array.isArray(meta.limitations) || meta.limitations.some((item) => typeof item !== "string" || item.length > 2000)) return "LIMITATIONS_INVALID";
  if (!Array.isArray(data.observations) || data.observations.length > 30) return "OBSERVATIONS_INVALID";
  for (const observation of data.observations) {
    if (!observation || observation.indicatorId !== expectedId || typeof observation.referencePeriod !== "string" ||
        typeof observation.value !== "number" || !Number.isFinite(observation.value) ||
        observation.geoLevel !== "national" || observation.geoCode !== "NGA" ||
        observation.sourcePublisher !== meta.sourcePublisher || !officialWorldBankUrl(observation.sourceUrl || meta.sourceUrl)) {
      return "OBSERVATION_SCHEMA_INVALID";
    }
  }
  if (data.status === "ok" && data.observations.length === 0) return "OBSERVATION_COUNT_MISMATCH";
  return null;
}

async function fetchOne(fetchImpl, baseUrl, indicatorId, timeoutMs) {
  const url = new URL(baseUrl);
  url.searchParams.set("indicatorId", indicatorId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url.toString(), { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal });
    const raw = await response.text();
    if (raw.length > MAX_BODY_CHARS) return { error: "RESPONSE_TOO_LARGE" };
    let data;
    try { data = JSON.parse(raw); } catch { return { error: "RESPONSE_PARSE_ERROR" }; }
    if (!response.ok) return { error: "UPSTREAM_HTTP_" + response.status };
    const validationError = validatePayload(data, indicatorId);
    if (validationError) return { error: validationError };
    const observations = [...data.observations].sort((a, b) => String(a.referencePeriod).localeCompare(String(b.referencePeriod))).slice(-MAX_OBSERVATIONS);
    return {
      data: {
        id: indicatorId,
        title: data.indicator.title,
        definition: data.indicator.definition,
        unit: data.indicator.unit,
        measurementType: data.indicator.measurementType,
        sector: data.indicator.sector || null,
        geoLevel: data.indicator.geoLevel,
        geoCode: data.indicator.geoCode,
        sourcePublisher: data.indicator.sourcePublisher,
        sourceUrl: data.indicator.sourceUrl,
        methodologyNotes: data.indicator.methodologyNotes || "",
        limitations: data.indicator.limitations.slice(0, 8),
        observations: observations.map((item) => ({
          referencePeriod: item.referencePeriod,
          value: item.value,
          unit: item.unit || data.indicator.unit,
          retrievedAt: item.retrievedAt || data.receipt?.retrievedAt || null,
          qualityFlags: Array.isArray(item.qualityFlags) ? item.qualityFlags.slice(0, 8) : [],
        })),
        retrievedAt: data.receipt?.retrievedAt || observations.at(-1)?.retrievedAt || new Date().toISOString(),
      },
    };
  } catch (error) {
    return { error: error?.name === "AbortError" ? "SOURCE_TIMEOUT" : "SOURCE_FETCH_FAILED" };
  } finally { clearTimeout(timer); }
}

export async function fetchObservatoryIndicators(query, fetchImpl = fetch, options = {}) {
  const indicatorIds = selectIndicators(query);
  if (!indicatorIds.length) return empty("skipped", ["No national indicator was relevant to this question."]);
  const baseUrl = String(options.url || process.env.CIVIC_OBSERVATORY_EVIDENCE_URL || DEFAULT_OBSERVATORY_INDICATOR_URL).trim();
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) return empty("invalid", ["The configured evidence endpoint is not on the approved ISEYC Observatory host."], "UNTRUSTED_ENDPOINT");
  } catch { return empty("invalid", ["The configured evidence endpoint URL is invalid."], "INVALID_ENDPOINT"); }

  const results = await Promise.all(indicatorIds.map((id) => fetchOne(fetchImpl, baseUrl, id, options.timeoutMs || 6000)));
  const valid = results.filter((result) => result.data).map((result) => result.data);
  const errors = results.filter((result) => result.error).map((result) => result.error);
  if (!valid.length) return empty("unavailable", ["The Observatory national-indicator gateway could not be retrieved. No substitute values are used."], errors[0] || "SOURCE_UNAVAILABLE");
  return {
    source: "iseyc-observatory-indicators-v1",
    contractVersion: CONTRACT_VERSION,
    status: errors.length ? "partial" : valid.every((item) => item.observations.length === 0) ? "empty" : "ready",
    indicators: valid,
    requested: indicatorIds,
    limitations: errors.length ? ["One or more requested indicators were unavailable. Only listed observations are available to this response."] : [],
    errorCode: errors[0] || null,
    fetchedAt: new Date().toISOString(),
  };
}

export function formatObservatoryIndicatorBlock(bundle) {
  if (!bundle || bundle.status === "skipped") return "No Observatory national indicators were requested for this question.";
  if (bundle.status === "invalid" || bundle.status === "unavailable") return "OBSERVATORY_INDICATORS_STATUS: " + bundle.status + "\nThe national-indicator source is unavailable or invalid. Do not invent national values.";
  const lines = [
    "SOURCE_LAYER: ISEYC Civic Intelligence Observatory — allowlisted national indicator gateway",
    "SOURCE_TYPE: World Bank World Development Indicators via ISEYC's read-only gateway; not ISEYC-produced statistics.",
    "CONTRACT_VERSION: " + CONTRACT_VERSION,
    "STATUS: " + bundle.status,
    "RETRIEVED_AT: " + (bundle.fetchedAt || "unknown"),
  ];
  for (const indicator of bundle.indicators || []) {
    lines.push("", "INDICATOR: " + indicator.id, "TITLE: " + indicator.title, "DEFINITION: " + indicator.definition,
      "MEASUREMENT_TYPE: " + indicator.measurementType, "UNIT: " + indicator.unit,
      "GEOGRAPHY: Nigeria national aggregate only", "PUBLISHER: " + indicator.sourcePublisher,
      "SOURCE_URL: " + indicator.sourceUrl, "METHODOLOGY: " + indicator.methodologyNotes);
    for (const observation of indicator.observations) lines.push("OBSERVATION: " + observation.referencePeriod + " = " + observation.value + " " + (observation.unit || indicator.unit));
    lines.push("LIMITATIONS: " + indicator.limitations.join(" | "));
  }
  for (const limitation of bundle.limitations || []) lines.push("BUNDLE_LIMITATION: " + limitation);
  lines.push("INTERPRETATION RULE: These are national-only observations. Do not infer a state, LGA, ward, facility or household value. Preserve the source's measurement type, unit and reference year.");
  return lines.join("\n");
}
