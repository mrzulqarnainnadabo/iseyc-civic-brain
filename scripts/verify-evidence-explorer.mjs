import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
let failed = 0;
function ok(c, m) {
  if (!c) { console.error("FAIL:", m); failed++; }
  else console.log("OK:", m);
}
ok(existsSync(join(root, "src/components/EvidenceExplorer.jsx")), "EvidenceExplorer component");
ok(existsSync(join(root, "api/public-records.js")), "public-records API proxy");
const ws = readFileSync(join(root, "src/components/EvidenceWorkspace.jsx"), "utf8");
ok(ws.includes("EvidenceExplorer"), "EvidenceWorkspace mounts EvidenceExplorer");
const api = readFileSync(join(root, "api/public-records.js"), "utf8");
ok(api.includes("published-only") || api.includes("Published"), "API documents published-only");
ok(api.includes("publicUrl"), "API returns publicUrl");
if (failed) process.exit(1);
console.log("Evidence explorer checks passed.");
