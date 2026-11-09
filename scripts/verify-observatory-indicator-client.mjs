import { fetchObservatoryIndicators, selectIndicators, formatObservatoryIndicatorBlock } from "../lib/observatory-indicator-client.js";
import { buildTrustedBriefSources } from "../lib/trusted-brief-sources.js";

let failed = 0;
function assert(condition, message) {
  if (!condition) { console.error("FAIL:", message); failed++; }
  else console.log("OK:", message);
}
function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}

const indicatorId = "wb-nga-it-net-user-zs";
const sourceUrl = "https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=NG";
const fixture = {
  contractVersion: "1.0.0",
  status: "ok",
  indicator: {
    id: indicatorId,
    title: "Individuals using the Internet (% of population)",
    definition: "Share of the population using the Internet.",
    unit: "percent of population",
    measurementType: "estimated",
    sector: "infrastructure",
    geoLevel: "national",
    sourcePublisher: "World Bank — World Development Indicators",
    sourceUrl,
    methodologyNotes: "Underlying national and international sources.",
    limitations: ["National aggregate only."],
  },
  observations: [
    { indicatorId, referencePeriod: "2022", value: 40, unit: "percent of population", geoLevel: "national", geoCode: "NGA", sourceAttribution: "World Bank — World Development Indicators", sourceUrl, retrievedAt: "2026-11-09T00:00:00.000Z" },
    { indicatorId, referencePeriod: "2023", value: 45, unit: "percent of population", geoLevel: "national", geoCode: "NGA", sourcePublisher: "World Bank — World Development Indicators", sourceUrl },
  ],
  receipt: { retrievedAt: "2026-11-09T00:00:00.000Z" },
};

assert(selectIndicators("internet access in Nigeria").includes(indicatorId), "internet query selects internet indicator");
assert(selectIndicators("health services").includes("wb-nga-sh-dyn-mort"), "health query selects health indicator");
assert(selectIndicators("school enrolment").includes("wb-nga-se-prm-enrr"), "education query selects education indicator");
assert(selectIndicators("employment and jobs").includes("wb-nga-sl-uem-totl-zs"), "employment query selects labour indicator");
assert(selectIndicators("unrelated product question").length === 0, "unrelated query selects no national indicators");

let calls = 0;
const fetched = await fetchObservatoryIndicators("internet usage in Nigeria", async (url) => {
  calls++;
  assert(url.includes("indicatorId=" + indicatorId), "client requests only selected allowlisted indicator");
  return response(fixture);
});
assert(calls === 1, "one relevant indicator request is made");
assert(fetched.status === "ready", "valid national indicator is accepted");
assert(fetched.indicators[0].observations.at(-1).referencePeriod === "2023", "latest reference period is retained");
assert(fetched.indicators[0].measurementType === "estimated", "measurement type is retained");
assert(formatObservatoryIndicatorBlock(fetched).includes("national aggregate only"), "evidence block preserves national-only geography");
assert(formatObservatoryIndicatorBlock(fetched).includes("estimated"), "evidence block preserves estimate label");

const trusted = buildTrustedBriefSources({ observatoryIndicatorsBundle: fetched });
assert(trusted.length === 1, "retrieved indicator becomes one trusted source");
assert(trusted[0].sourceType === "official_source", "indicator source is eligible for official evidence citation");
assert(trusted[0].id === "src-observatory-indicator:" + indicatorId, "indicator source id is deterministic");
assert(trusted[0].referenceDate === "2023", "trusted source carries the observation reference period");

const skipped = await fetchObservatoryIndicators("explain Civic Mandate", async () => { throw new Error("must not fetch"); });
assert(skipped.status === "skipped", "irrelevant questions skip the indicator gateway");

const invalidEndpoint = await fetchObservatoryIndicators("internet", async () => { throw new Error("must not fetch"); }, { url: "https://example.com/api/evidence" });
assert(invalidEndpoint.status === "invalid", "unapproved endpoint is rejected");

const badFixture = structuredClone(fixture);
badFixture.indicator.sourceUrl = "https://example.com/fake";
const invalidSource = await fetchObservatoryIndicators("internet", async () => response(badFixture));
assert(invalidSource.status === "unavailable", "untrusted source URL is withheld");

const localFixture = structuredClone(fixture);
localFixture.observations[0].geoLevel = "state";
const invalidGeography = await fetchObservatoryIndicators("internet", async () => response(localFixture));
assert(invalidGeography.status === "unavailable", "subnational row is rejected by national-only pilot client");

if (failed) { console.error(failed + " indicator client checks failed"); process.exit(1); }
console.log("\nverify-observatory-indicator-client: PASS");
