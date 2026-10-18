import { readFileSync } from "node:fs";
import { SERVER_SYSTEM_PROMPT, MODE_HINTS } from "../lib/system-prompt.js";

const prompt = SERVER_SYSTEM_PROMPT;
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
if (!MODE_HINTS.civic.includes("four required CIVIC BRIEF headings")) {
  console.error("FAIL: civic mode does not enforce Civic Brief");
  failed++;
}
const header = readFileSync(new URL("../src/components/ui/Header.jsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../src/components/EvidenceWorkspace.jsx", import.meta.url), "utf8");
if (!header.includes('src="/iseyc-logo.svg"')) {
  console.error("FAIL: header does not use available interim logo");
  failed++;
} else console.log("OK: header uses existing logo asset");
for (const label of ["What is Civic Mandate?", "What is published so far?", "Health in the record", "How Mandate + Brain work"]) {
  if (!workspace.includes(label)) {
    console.error("FAIL: missing starter:", label);
    failed++;
  } else console.log("OK: starter:", label);
}
if (failed) process.exit(1);
console.log("Civic Brief acceptance checks passed.");
