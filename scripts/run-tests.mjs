import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = [
  "apps-script/clinica-liv-leads",
  "google-ads-scripts",
  "netlify/functions",
];

const standaloneTests = [
  "campanhas/site-technical-regression.test.mjs",
];

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(path);
    return entry.isFile() && entry.name.endsWith(".test.mjs") ? [path] : [];
  });
}

const tests = [
  ...roots.flatMap(collectTests),
  ...standaloneTests,
].sort();
const result = spawnSync(process.execPath, [
  "--test",
  ...tests,
], {
  cwd: process.cwd(),
  stdio: "inherit",
});

process.exit(result.status ?? 1);
