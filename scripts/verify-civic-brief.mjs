import { readFileSync } from "node:fs";
import { SERVER_SYSTEM_PROMPT, MODE_HINTS } from "../lib/system-prompt.js";

const prompt = SERVER_SYSTEM_PROMPT;
const architecture = readFileSync(new URL("../public/iseyc-system-architecture.svg", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../src/components/EvidenceWorkspace.jsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../src/components/CivicBriefCard.jsx", import.meta.url), "utf8");
const headings = ["**Answer**", "**Evidence**", "**Limit**", "**Next step**"];
let failed = 0;
for (const heading of headings) {
  if (!prompt.includes(heading)) { console.error("FAIL: missing answer heading:", heading); failed++; }
}
const indexes = headings.map((heading) => prompt.indexOf(heading));
if (!indexes.every((value, index) => index === 0 || value > indexes[index - 1])) {
  console.error("FAIL: concise answer headings are not ordered"); failed++;
}
for (const required of [
  "https://2027-street-mandate.vercel.app",
  "not a representative national survey",
  "Never invent counts",
  "Do not automatically contact officials",
  "unpublished submissions",
  "STATE FISCAL AND NATIONAL EVIDENCE RULES",
  "covers 35 states and excludes Rivers",
  "preserve each source-attributed value",
  "measure public disclosure availability",
]) {
  if (!prompt.toLowerCase().includes(required.toLowerCase())) { console.error("FAIL: missing rule:", required); failed++; }
}
if (!MODE_HINTS.civic.includes("Answer, Evidence, Limit, Next step") || !MODE_HINTS.civic.includes("hard limit: 120 words")) {
  console.error("FAIL: civic mode does not enforce concise answer structure"); failed++;
}
if (/four required CIVIC BRIEF headings|What the public record shows|What it does not mean/.test(prompt)) {
  console.error("FAIL: obsolete long-form answer headings remain"); failed++;
}
const header = readFileSync(new URL("../src/components/ui/Header.jsx", import.meta.url), "utf8");
if (!header.includes('src="/iseyc-wordmark.svg"') || !header.includes('ISEYC — Initiative for Sustainable Evolution for Youth and Community')) {
  console.error("FAIL: header does not use the approved ISEYC wordmark"); failed++;
}
for (const label of ["Civic Mandate", "Civic Intelligence", "Civic Brain", "Education", "Health", "Software", "Civic Department", "Digital Operations Centre"]) {
  if (!architecture.includes(label)) throw new Error("ISEYC system map is missing " + label);
}
for (const label of ["What is published so far?", "National health evidence", "State budget execution", "Education spending", "All-state fiscal disclosure", "Prepare an evidence brief"]) {
  if (!workspace.includes(label)) { console.error("FAIL: missing starter:", label); failed++; }
}
if (!workspace.includes("Ask about a published record or public evidence") || !workspace.includes("<details") || !workspace.includes("Evidence brief")) {
  console.error("FAIL: concise evidence workspace contract missing"); failed++;
}
if (!card.includes("brief.findings.slice(0, 3)") || !card.includes("brief.institutionalResponsibilities.slice(0, 2)")) {
  console.error("FAIL: visible Civic Brief lists are not bounded"); failed++;
}
if (failed) process.exit(1);
console.log("Civic Brain concise evidence acceptance checks passed.");
