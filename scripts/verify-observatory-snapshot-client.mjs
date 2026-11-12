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
    interpretation: "Secondary report aggregate; discrepancy with earlier infographic remains under reconciliation.", verificationStatus: "reconciliation_required",
    limitations: ["Not an independent audit.", "Does not establish service quality."]
  },
  {
    id: "budgit-h1-2026-health-total", title: "Combined state health expenditure · earlier infographic total (superseded)",
    value: 614.55, unit: "₦ billion", referencePeriod: "H1 2026 (through Q2)",
    measurementType: "Actual health expenditure reported in earlier published infographic",
    geoLevel: "varies", geographicCoverage: "34 of 36 states; Rivers and Osun excluded",
    sourceId: "budgit-state-health-h1-2026", sourcePublisher: "BudgIT Foundation",
    sourceUrl: "https://budgit.org/post_infographics/h1-2026-health-expenditure-performance-by-state/",
    sourceType: "published_research", departments: ["health", "civic"], recordStatus: "superseded",
    supersededBy: "budgit-health-spending",
    interpretation: "Earlier 21 October infographic total; retained only for explicit reconciliation.",
    limitations: ["Superseded by later detailed report total; do not use as current aggregate."]
  },
  {
    id: "kaduna-education-budget", title: "Kaduna approved education budget share", value: 25, unit: "%",
    referencePeriod: "2026 approved budget", measurementType: "Budget allocation share", geoLevel: "state",
    geographicCoverage: "Kaduna State", sourceId: "kdsg-budget", sourcePublisher: "Kaduna State Government",
    sourceUrl: "https://kdsg.gov.ng/budget", sourceType: "official_source", departments: ["education", "civic"],
    interpretation: "Approved allocation, not actual expenditure.", limitations: ["Statewide only; not Kaduna South or an individual school."]
  }
];
observations.push(
  {
    id: "budgit-health-actual-spend-kaduna-h1-2026", title: "H1 2026 health actual expenditure — Kaduna State", value: 18.68, unit: "₦ billion",
    referencePeriod: "H1 2026", measurementType: "Actual health expenditure transcribed from state BIRs",
    geoLevel: "state", geographicCoverage: "Kaduna State", sourceId: "budgit-health-report",
    sourcePublisher: "BudgIT Foundation", sourceUrl: "https://budgit.org/post_publications/nigerias-subnational-health-expenditure-report-h1-2026/",
    sourceType: "published_research", departments: ["health", "civic"], verificationStatus: "published_secondary_report",
    interpretation: "BudgIT Table 5 reports ₦18.68bn for Kaduna State; secondary report data, not independently reconciled.",
    limitations: ["Secondary report; check original Q1/Q2 BIRs.", "Statewide only; not Kaduna South."]
  },
  {
    id: "budgit-health-actual-spend-kano-h1-2026", title: "H1 2026 health actual expenditure — Kano State", value: 79.17, unit: "₦ billion",
    referencePeriod: "H1 2026", measurementType: "Actual health expenditure transcribed from state BIRs",
    geoLevel: "state", geographicCoverage: "Kano State", sourceId: "budgit-health-report",
    sourcePublisher: "BudgIT Foundation", sourceUrl: "https://budgit.org/post_publications/nigerias-subnational-health-expenditure-report-h1-2026/",
    sourceType: "published_research", departments: ["health", "civic"], verificationStatus: "published_secondary_report",
    interpretation: "BudgIT Table 5 reports ₦79.17bn for Kano State; secondary report data, not independently reconciled.",
    limitations: ["Secondary report; check original Q1/Q2 BIRs."]
  }
);
observations.push(
  {
    id: "ncc-broadband-penetration-sep-2026", title: "Broadband penetration", value: 59.05,
    unit: "% subscription-based penetration", referencePeriod: "September 2026",
    measurementType: "Active broadband subscriptions as a percentage of estimated population",
    geoLevel: "national", geographicCoverage: "Nigeria", sourceId: "ncc-industry-statistics-2026",
    sourcePublisher: "Nigerian Communications Commission (NCC)",
    sourceUrl: "https://ncc.gov.ng/market-data-reports/industry-statistics",
    sourceType: "official_source", departments: ["software-technology", "civic"],
    interpretation: "Subscription-based penetration; not unique individuals using the internet.",
    limitations: ["Multiple subscriptions per person are possible.", "Do not equate with population internet-use rate."]
  },
  {
    id: "world-bank-nigeria-internet-use-2024", title: "Individuals using the Internet", value: 41.21,
    unit: "% of population", referencePeriod: "2024",
    measurementType: "Individuals who used the Internet from any location in the previous three months",
    geoLevel: "national", geographicCoverage: "Nigeria", sourceId: "world-bank-wdi-internet-use-nigeria",
    sourcePublisher: "World Bank World Development Indicators (underlying source: ITU)",
    sourceUrl: "https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=NG",
    sourceType: "official_source", departments: ["software-technology", "civic"],
    interpretation: "People-based internet-use indicator; not the same as broadband subscription penetration.",
    limitations: ["Latest observed period is 2024.", "National average hides state and household access gaps."]
  }
);
const payload = {
  contractVersion: "1.0.0", source: "iseyc-observatory-curated-source-snapshots-v1",
  status: "curated", checkedAt: "2026-11-12", observations,
  limitations: ["Curated dated transcriptions; not live publisher feeds."],
  reconciliationNotes: [{ id: "health-total", severity: "high", title: "Health total discrepancy", detail: "Two publications report different totals." }],
  stateBudgetCoverage: { officialStateSourceRoutesLocated: 19, totalStates: 36, budgitHealthActualExpenditureStates: 34, budgitHealthActualExpenditureMissingStates: ["Osun", "Rivers"] }
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
assert.ok(!health.records.some((record) => record.recordStatus === "superseded"), "superseded totals stay out of normal answers");
assert.equal(health.records[1].metrics[0].value, "621.34");
assert.match(requested, /api\/evidence\/source-snapshots/);
assert.match(formatObservatorySnapshotBlock(health), /H1 2026/);
assert.match(formatObservatorySnapshotBlock(health), /Health total discrepancy/);
assert.match(formatObservatorySnapshotBlock(health), /not live feeds/i);
assert.match(formatObservatorySnapshotBlock(health), /reconciliation_required/);
assert.match(formatObservatorySnapshotBlock(health), /STATE_BUDGET_COVERAGE/);
const stateHealth = await fetchObservatorySnapshots("health actual expenditure by state H1 2026", fetchMock);
assert.equal(stateHealth.records.filter((record) => record.geography.level === "state").length, 2);
const kadunaHealth = await fetchObservatorySnapshots("Kaduna health actual expenditure H1 2026", fetchMock);
assert.equal(kadunaHealth.records.length, 1);
assert.equal(kadunaHealth.records[0].id, "budgit-health-actual-spend-kaduna-h1-2026");
const budgetHealth = await fetchObservatorySnapshots("health budget 2026", fetchMock);
assert.equal(budgetHealth.status, "ready");
assert.equal(budgetHealth.records.length, 1, "budget questions should not be diluted by unrelated health indicators");
assert.equal(budgetHealth.records[0].id, "budgit-health-spending");
const reconciliation = await fetchObservatorySnapshots("health expenditure discrepancy compare sources", fetchMock);
assert.ok(reconciliation.records.some((record) => record.recordStatus === "superseded" && record.metrics[0].value === "614.55"));
assert.match(formatObservatorySnapshotBlock(reconciliation), /RECORD_STATUS: superseded/);


const education = await fetchObservatorySnapshots("education budget Kaduna", fetchMock);
assert.equal(education.status, "ready");
assert.equal(education.records.length, 1);
assert.match(formatObservatorySnapshotBlock(education), /Kaduna State/);
const digital = await fetchObservatorySnapshots("digital technology broadband internet", fetchMock);
assert.equal(digital.status, "ready");
assert.ok(digital.records.some((record) => record.id === "ncc-broadband-penetration-sep-2026"));
assert.ok(digital.records.some((record) => record.id === "world-bank-nigeria-internet-use-2024"));
assert.match(formatObservatorySnapshotBlock(digital), /subscription-based penetration/);


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
