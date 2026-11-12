import assert from "node:assert/strict";
import {
  fetchObservatorySnapshots,
  selectSnapshotRecords,
  formatObservatorySnapshotBlock,
  DEFAULT_OBSERVATORY_SNAPSHOT_URL
} from "../lib/observatory-snapshot-client.js";

const observations = [
  {
    id: "who-health-life-expectancy", title: "Life expectancy at birth", value: 61.4, unit: "years",
    referencePeriod: "2023", measurementType: "WHO estimate", geoLevel: "national",
    geographicCoverage: "Nigeria", sourceId: "who-afro-nigeria", sourcePublisher: "WHO Regional Office for Africa",
    sourceUrl: "https://www.afro.who.int/node/992", sourceType: "official_source", departments: ["health"],
    interpretation: "National estimate only.", limitations: ["National aggregate; not a state or facility measure."]
  },
  {
    id: "budgit-health-spending", title: "Combined state health expenditure", value: 621.34, unit: "₦ billion",
    referencePeriod: "H1 2026", measurementType: "Actual expenditure reported in secondary analysis",
    geoLevel: "varies", geographicCoverage: "34 of 36 states; Rivers and Osun excluded",
    sourceId: "budgit-health-report", sourcePublisher: "BudgIT Foundation",
    sourceUrl: "https://budgit.org/post_publications/nigerias-subnational-health-expenditure-report-h1-2026/",
    sourceType: "published_research", departments: ["health", "civic"],
    interpretation: "Secondary report aggregate; discrepancy with earlier infographic remains under reconciliation.",
    limitations: ["Not an independent audit.", "Does not establish service quality."]
  },
  {
    id: "kaduna-education-budget", title: "Kaduna approved education budget share", value: 25, unit: "%",
    referencePeriod: "2026 approved budget", measurementType: "Budget allocation share", geoLevel: "state",
    geographicCoverage: "Kaduna State", sourceId: "kdsg-budget", sourcePublisher: "Kaduna State Government",
    sourceUrl: "https://kdsg.gov.ng/budget", sourceType: "official_source", departments: ["education", "civic"],
    interpretation: "Approved allocation, not actual expenditure.", limitations: ["Statewide only; not Kaduna South or an individual school."]
  }
];
const payload = {
  contractVersion: "1.0.0", source: "iseyc-observatory-curated-source-snapshots-v1",
  status: "curated", checkedAt: "2026-11-12", observations,
  limitations: ["Curated dated transcriptions; not live publisher feeds."],
  reconciliationNotes: [{ id: "health-total", severity: "high", title: "Health total discrepancy", detail: "Two publications report different totals." }]
};

assert.deepEqual(selectSnapshotRecords("health in Nigeria"), ["health"]);
assert.deepEqual(selectSnapshotRecords("health budget 2026"), ["health", "civic"]);
assert.deepEqual(selectSnapshotRecords("education budget Kaduna"), ["education", "civic"]);
assert.deepEqual(selectSnapshotRecords("unrelated question"), []);
assert.equal(DEFAULT_OBSERVATORY_SNAPSHOT_URL.endsWith("/api/evidence/source-snapshots"), true);

let requested = "";
const fetchMock = async (url) => {
  requested = String(url);
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
};
const health = await fetchObservatorySnapshots("health in Nigeria", fetchMock);
assert.equal(health.status, "ready");
assert.equal(health.records.length, 2);
assert.equal(health.records[1].metrics[0].value, "621.34");
assert.match(requested, /api\/evidence\/source-snapshots/);
assert.match(formatObservatorySnapshotBlock(health), /H1 2026/);
assert.match(formatObservatorySnapshotBlock(health), /Health total discrepancy/);
assert.match(formatObservatorySnapshotBlock(health), /not live feeds/i);

const education = await fetchObservatorySnapshots("education budget Kaduna", fetchMock);
assert.equal(education.status, "ready");
assert.equal(education.records.length, 1);
assert.match(formatObservatorySnapshotBlock(education), /Kaduna State/);

const skipped = await fetchObservatorySnapshots("unrelated question", async () => { throw new Error("must not fetch"); });
assert.equal(skipped.status, "skipped");

const untrusted = await fetchObservatorySnapshots("health", fetchMock, { url: "https://example.com/api/evidence/source-snapshots" });
assert.equal(untrusted.status, "invalid");
assert.equal(untrusted.errorCode, "UNTRUSTED_ENDPOINT");

const badContract = await fetchObservatorySnapshots("health", async () => ({
  ok: true, status: 200, text: async () => JSON.stringify({ ...payload, contractVersion: "9.9.9" })
}));
assert.equal(badContract.status, "unavailable");
assert.equal(badContract.records.length, 0);

const badSource = structuredClone(payload);
badSource.observations[0].sourceUrl = "https://example.com/fake";
const rejected = await fetchObservatorySnapshots("health", async () => ({
  ok: true, status: 200, text: async () => JSON.stringify(badSource)
}));
assert.equal(rejected.status, "unavailable");
assert.equal(rejected.records.length, 0);

console.log("Observatory source-snapshot client contract checks passed.");
