import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL(
    "../apps-script/clinica-liv-leads/Code.gs",
    import.meta.url,
  ),
  "utf8",
);

const tests = `
(() => {
  const canonicalRows = [
    ["+5511999990000"],
    ["+5511888880000"],
  ];
  const canonicalSheet = {
    getLastRow: () => canonicalRows.length + 1,
    getRange: () => ({
      getDisplayValues: () => canonicalRows,
    }),
  };

  const unrelatedRows = [
    ["+5511777770000"],
  ];
  const unrelatedSheet = {
    getLastRow: () => unrelatedRows.length + 1,
    getRange: () => ({
      getDisplayValues: () => unrelatedRows,
    }),
  };

  globalThis.__testResults = {
    normalizedPhone: normalizePhone_("(11) 99999-0000"),
    parsedTimestamp:
      parseSheetContactDate_("25/07/2026 11:00").getTime(),
    canonicalRow: findRecentLeadRow_(
      canonicalSheet,
      "+5511999990000",
    ),
    noMatch: findRecentLeadRow_(
      unrelatedSheet,
      "+5511999990000",
    ),
  };
})();
`;

const context = { console };
vm.runInNewContext(`${source}\n${tests}`, context, {
  filename: "Code.gs",
});

assert.equal(context.__testResults.normalizedPhone, "+11999990000");
assert.ok(Number.isFinite(context.__testResults.parsedTimestamp));
assert.equal(context.__testResults.canonicalRow, 2);
assert.equal(context.__testResults.noMatch, null);

console.log("apps script lead deduplication: 4 cases passed");
