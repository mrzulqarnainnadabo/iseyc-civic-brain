import { readFileSync } from "node:fs";
import { SERVER_SYSTEM_PROMPT, MODE_HINTS } from "../lib/system-prompt.js";

const prompt = SERVER_SYSTEM_PROMPT;
const architecture = readFileSync(new URL("../public/iseyc-system-architecture.svg", import.meta.url), "utf8");
const headings = [
  "**What the public record shows**",
  "**What it does not mean**",
  "**What remains unknown**",
  "**Useful next step**",
];
let failed = 0;
for (const heading of headings) {
  if (!prompt.includes(heading)) {
    console.error("FAIL: missing Civic Brief heading:", heading);
    failed++;
  } else {
    console.log("OK: Civic Brief heading:", heading);
  }
}
const indexes = headings.map((h) => prompt.indexOf(h));
if (!indexes.every((value, i) => i === 0 || value > indexes[i - 1])) {
  console.error("FAIL: Civic Brief headings are not in required order");
  failed++;
} else {
  console.log("OK: Civic Brief headings are ordered");
}
for (const required of [
  "https://2027-street-mandate.vercel.app",
  "not a representative national survey",
  "Never invent counts",
  "Do not automatically contact officials",
  "unpublished submissions",
]) {
  if (!prompt.toLowerCase().includes(required.toLowerCase())) {
    console.error("FAIL: missing guardrail:", required);
    failed++;
  } else {
    console.log("OK: guardrail:", required);
  }
}
if (!MODE_HINTS.civic.includes("45–90 words") || MODE_HINTS.civic.includes("four required CIVIC BRIEF headings")) {
  console.error("FAIL: ordinary civic mode must be concise and must not force the structured brief");
  failed++;
} else console.log("OK: civic mode defaults to concise narrative");
if (!prompt.includes("BudgIT's H1 2026 subnational health report covers 34 states") || !prompt.includes("Rivers and Osun are missing, not zero")) {
  console.error("FAIL: health expenditure reconciliation caveats missing");
  failed++;
} else console.log("OK: secondary health expenditure caveats preserved");
if (!prompt.includes("Kaduna's 2026 approved budget announcement reports")) {
  console.error("FAIL: Kaduna state-budget scope and allocation caveat missing");
  failed++;
} else console.log("OK: Kaduna statewide budget caveat preserved");
if (!prompt.includes("STRUCTURED CIVIC BRIEF — OPT-IN ONLY") || !prompt.includes("format=civic_brief_v1")) {
  console.error("FAIL: structured Civic Brief must remain explicit and opt-in");
  failed++;
} else console.log("OK: structured Civic Brief remains opt-in");
const header = readFileSync(new URL("../src/components/ui/Header.jsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../src/components/EvidenceWorkspace.jsx", import.meta.url), "utf8");
if (!header.includes('src="/iseyc-wordmark.svg"') || !header.includes('ISEYC — Initiative for Sustainable Evolution for Youth and Community')) {
  console.error("FAIL: header does not use the approved ISEYC wordmark");
  failed++;
} else console.log("OK: header uses approved ISEYC wordmark");
for (const label of ["Civic Mandate", "Civic Intelligence", "Civic Brain", "Education", "Health", "Software", "Civic Department", "Digital Operations Centre"]) {
  if (!architecture.includes(label)) throw new Error(`ISEYC system map is missing ${label}`);
}
for (const label of ["Understand a community issue", "Check national evidence", "Find responsible institutions", "Generate a structured Civic Brief", "Read state budgets"]) {
  if (!workspace.includes(label)) {
    console.error("FAIL: missing starter:", label);
    failed++;
  } else console.log("OK: starter:", label);
}
if (failed) process.exit(1);
console.log("Civic Brief acceptance checks passed.");
