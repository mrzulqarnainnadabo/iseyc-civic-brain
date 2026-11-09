import assert from "node:assert/strict";
import {
  fetchObservatorySnapshots,
  selectSnapshotRecords,
  formatObservatorySnapshotBlock,
} from "../lib/observatory-snapshot-client.js";

const records = [
  {
    id: "who-nigeria-health-2021-23", title: "WHO · Nigeria health indicators",
    publisher: "World Health Organization", sourceId: "who-gho-nigeria",
    sourceUrl: "https://www.who.int/data/gho/data/countries/country-details/GHO/nigeria",
    referencePeriod: "Indicator-specific · 2022–2025", retrievedAt: "2026-11-09",
    geography: { level: "national", label: "Nigeria" }, evidenceType: "WHO statistical estimates",
    metrics: [{ label: "New HIV infections", value: "0.27", unit: "per 1,000 uninfected population", period: "2025", interval: "0.21–0.39" }],
    limitations: ["Statistical estimates, not direct counts."], interpretation: "National context only.",
  },
  {
    id: "nimc-enrolment-2025-10", title: "NIMC · National identity enrolment",
    publisher: "National Identity Management Commission", sourceId: "nimc-enrolment-oct-2025",
    sourceUrl: "https://nimc.gov.ng/nin/enrolment-report/october-2025",
    referencePeriod: "As at 31 October 2025", retrievedAt: "2026-11-09",
    geography: { level: "national-and-state", label: "Nigeria · national and state records" },
    evidenceType: "Official cumulative administrative enrolment snapshot",
    metrics: [{ label: "Total enrolment records", value: "123,906,318", unit: "records", period: "31 Oct 2025" }],
    limitations: ["Not a population census."], interpretation: "Administrative enrolment only.",
  },
  {
    id: "nitda-dl4all-2026-10", title: "NITDA · Digital Literacy for All",
    publisher: "National Information Technology Development Agency", sourceId: "nitda-dl4all-dashboard",
    sourceUrl: "https://dashboard.digitalliteracy.nitda.gov.ng/",
    referencePeriod: "Dashboard updated 24 October 2026", retrievedAt: "2026-11-09",
    geography: { level: "national-and-subnational", label: "Nigeria · 36 states + FCT, LGAs and communities" },
    evidenceType: "Government programme dashboard · verified training records",
    metrics: [{ label: "Progress against 50m programme target", value: "5.57%", unit: "of target", period: "Dashboard update" }],
    limitations: ["Not national digital-literacy prevalence."], interpretation: "Programme reach only.",
    departmentIds: ["software-technology", "education"],
  },
  {
    id: "naseni-innovatenaija-2025", title: "NASENI · InnovateNaija challenge",
    publisher: "NASENI Innovation Hub", sourceId: "naseni-innovation-hub",
    sourceUrl: "https://innovation.naseni.gov.ng/naseni-launches-innovatenaija/",
    referencePeriod: "Announcement · 3 September 2025", retrievedAt: "2026-11-09",
    geography: { level: "national", label: "National programme" }, evidenceType: "Official programme announcement",
    metrics: [{ label: "Announced prize pool", value: "₦250 million", unit: "programme terms", period: "3 Sep 2025" }],
    limitations: ["Announcement is not evidence of disbursement."], interpretation: "Programme terms only.",
  },
  {
    id: "nbs-gdp-q1-2026", title: "NBS · Real GDP growth",
    publisher: "National Bureau of Statistics", sourceId: "nbs-gdp-quarterly",
    sourceUrl: "https://microdata.nigerianstat.gov.ng/index.php/catalog/147/related-materials",
    referencePeriod: "Q1 2026", retrievedAt: "2026-11-09",
    geography: { level: "national", label: "Nigeria" }, evidenceType: "Official quarterly national-accounts estimate",
    metrics: [{ label: "Real GDP growth, year-on-year", value: "3.89%", unit: "annual percentage change", period: "Q1 2026" }],
    limitations: ["National estimate only."], interpretation: "National context only.",
  },
];

assert.deepEqual(selectSnapshotRecords("health in Nigeria"), ["who-nigeria-health-2021-23"]);
assert.deepEqual(selectSnapshotRecords("education access"), ["nitda-dl4all-2026-10"]);
assert.deepEqual(selectSnapshotRecords("NIN identity registration"), ["nimc-enrolment-2025-10"]);
assert.deepEqual(selectSnapshotRecords("NASENI innovation challenge"), ["naseni-innovatenaija-2025"]);
assert.deepEqual(selectSnapshotRecords("Q1 2026 GDP growth"), ["nbs-gdp-q1-2026"]);
assert.equal(selectSnapshotRecords("unrelated question").length, 0);

let requested = "";
const fetchMock = async (url) => {
  requested = String(url);
  return { ok: true, status: 200, text: async () => JSON.stringify({
    contractVersion: "1.0.0", status: "ok",
    source: "iseyc-observatory-national-snapshots-v1",
    retrievedAt: "2026-11-09", recordCount: records.length, records,
    limitations: ["Curated source transcriptions; not live publisher feeds."],
  }) };
};
const bundle = await fetchObservatorySnapshots("health", fetchMock);
assert.equal(bundle.status, "ready");
assert.equal(bundle.records[0].id, "who-nigeria-health-2021-23");
assert.match(requested, /api\/evidence\/snapshots/);
assert.match(requested, /catalog=0/);
assert.match(formatObservatorySnapshotBlock(bundle), /0.21–0.39/);
assert.match(formatObservatorySnapshotBlock(bundle), /not a live feed/);

const skipped = await fetchObservatorySnapshots("unrelated question", async () => { throw new Error("must not fetch"); });
assert.equal(skipped.status, "skipped");

const untrusted = await fetchObservatorySnapshots("health", fetchMock, { url: "https://example.com/api/evidence/snapshots" });
assert.equal(untrusted.status, "invalid");
assert.equal(untrusted.errorCode, "UNTRUSTED_ENDPOINT");

const bad = await fetchObservatorySnapshots("health", async () => ({
  ok: true, status: 200, text: async () => JSON.stringify({ contractVersion: "9.9.9", status: "ok", source: "fake", records }),
}));
assert.equal(bad.status, "unavailable");
assert.equal(bad.records.length, 0);

const badSource = structuredClone(records);
badSource[0].sourceUrl = "https://example.com/fake";
const rejected = await fetchObservatorySnapshots("health", async () => ({
  ok: true, status: 200, text: async () => JSON.stringify({
    contractVersion: "1.0.0", status: "ok", source: "iseyc-observatory-national-snapshots-v1",
    records: badSource, retrievedAt: "2026-11-09",
  }),
}));
assert.equal(rejected.status, "unavailable");
assert.equal(rejected.records.length, 0);

console.log("Observatory snapshot client contract checks passed.");
