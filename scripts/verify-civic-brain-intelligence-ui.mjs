import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function assert(condition, message) {
  if (!condition) { console.error("FAIL:", message); failed++; }
  else console.log("OK:", message);
}
function read(path) { return readFileSync(join(root, path), "utf8"); }

const workspace = read("src/components/EvidenceWorkspace.jsx");
const expectedStarters = [
  "What is published so far?",
  "National health evidence",
  "State budget execution",
  "Education spending",
  "All-state fiscal disclosure",
  "Prepare an evidence brief",
];
for (const label of expectedStarters) {
  assert(workspace.includes(label), `chat includes current evidence-led starter: ${label}`);
}
assert(!workspace.includes("What is Civic Mandate?"), "obsolete generic starter prompts are not required");
assert(workspace.includes("Ask about a published record or public evidence"), "chat introduction is concise");
assert(workspace.includes("<details") && workspace.includes("Evidence brief"), "evidence provenance is collapsed behind a short brief label");
const briefCard = read("src/components/CivicBriefCard.jsx");
assert(briefCard.includes("Draft · Human review"), "structured brief is visibly a human-review draft");
assert(briefCard.includes("Structural validation is not independent verification"), "brief UI distinguishes validation from verification");
assert(briefCard.includes("Source register"), "structured brief exposes source register");
assert(briefCard.includes("What remains unknown"), "structured brief exposes evidence gaps");
assert(briefCard.includes("brief.findings.slice(0, 3)"), "structured brief shows at most three findings");
assert(briefCard.includes("brief.institutionalResponsibilities.slice(0, 2)"), "structured brief shows at most two responsibilities");

const api = read("api/chat.js");
assert(api.includes("fetchObservatoryIndicators"), "chat retrieves Observatory national indicators");
assert(api.includes("fetchNationalSnapshots"), "chat retrieves curated national source snapshots");
assert(api.includes("observatoryIndicatorsBundle"), "retrieved indicator bundle is passed to source validation");
assert(api.includes("observatoryIndicators: observatoryIndicatorsMeta"), "chat response exposes indicator provenance");
assert(api.includes("MAX_BRIEF_TOKENS = 512"), "structured brief has a bounded output budget");
assert(api.includes("briefMode ? MAX_BRIEF_TOKENS : MAX_NARRATIVE_TOKENS"), "all providers receive format-specific output budget");

const prompt = read("lib/system-prompt.js");
assert(prompt.includes("OBSERVATORY NATIONAL INDICATOR RULES"), "server prompt includes indicator interpretation rules");
assert(prompt.includes("OBSERVATORY CURATED NATIONAL SNAPSHOT RULES"), "server prompt includes curated snapshot interpretation rules");
assert(prompt.includes("ISN hub-assessment percentages are survey respondent shares"), "server prompt preserves ISN survey-sample limits");
assert(prompt.includes("Never infer state, LGA, ward, facility, community or household values"), "national-only geography boundary is explicit");
assert(prompt.includes("modelled"), "measurement types must be preserved");

const routing = read("src/RoutingWorkspace.jsx");
assert(routing.includes('duty: ""') && routing.includes('state: ""'), "routing starts without an assumed duty or jurisdiction");
assert(routing.includes("Select state / FCT"), "routing requires an explicit state selection");
assert(routing.includes("Roads & Transport"), "routing duty labels match registry taxonomy");
assert(routing.includes("Potential responsible institution"), "routing output avoids implying a confirmed assignment");

const header = read("src/components/ui/Header.jsx");
assert(header.includes("Ask Civic Brain") && header.includes("Institutional routing"), "Brain modes have clear user-facing names");

if (failed) { console.error(failed + " Civic Brain UI checks failed"); process.exit(1); }
console.log("\nverify-civic-brain-intelligence-ui: PASS");
