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
  const rowsInsideWindow = [
    ["25/07/2026 11:00", "REF-01", "+5511999990000"],
    ["24/07/2026 08:00", "REF-02", "+5511888880000"],
  ];
  const sheetInsideWindow = {
    getLastRow: () => rowsInsideWindow.length + 1,
    getRange: () => ({
      getDisplayValues: () => rowsInsideWindow,
    }),
  };

  const rowsOutsideWindow = [
    ["24/07/2026 09:59", "REF-01", "+5511999990000"],
  ];
  const sheetOutsideWindow = {
    getLastRow: () => rowsOutsideWindow.length + 1,
    getRange: () => ({
      getDisplayValues: () => rowsOutsideWindow,
    }),
  };

  const incoming = new Date(2026, 6, 26, 10, 0, 0, 0);

  globalThis.__testResults = {
    normalizedPhone: normalizePhone_("(11) 99999-0000"),
    parsedTimestamp:
      parseSheetContactDate_("25/07/2026 11:00").getTime(),
    insideWindow: findRecentLeadRow_(
      sheetInsideWindow,
      "+5511999990000",
      incoming,
    ),
    outsideWindow: findRecentLeadRow_(
      sheetOutsideWindow,
      "+5511999990000",
      incoming,
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
assert.equal(context.__testResults.insideWindow, 2);
assert.equal(context.__testResults.outsideWindow, null);

console.log("apps script lead deduplication: 4 cases passed");
