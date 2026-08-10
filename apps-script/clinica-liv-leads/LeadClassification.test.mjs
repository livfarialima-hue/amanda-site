import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const codeSource = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);
const classificationSource = readFileSync(
  new URL("./LeadClassification.gs", import.meta.url),
  "utf8",
);

function loadFunctions() {
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    Utilities: {
      formatDate(_date, _timezone, pattern) {
        if (pattern === "yyyyMMdd") return "20260802";
        if (pattern.includes("XXX")) return "2026-08-02 12:00:00-03:00";
        return "02/08/2026";
      },
    },
    SpreadsheetApp: { flush() {} },
  };

  vm.runInNewContext(
    `${codeSource}\n${classificationSource}\n` +
      "globalThis.__test = { findLeadRowByPhone_, " +
      "shouldApplyLeadStatus_, ensureQualifiedGoogleConversion_ };",
    sandbox,
  );
  return sandbox.__test;
}

test("one phone always resolves to the first canonical lead row", () => {
  const { findLeadRowByPhone_ } = loadFunctions();
  const sheet = {
    getLastRow: () => 5,
    getRange: () => ({
      getDisplayValues: () => [
        ["+5511999990001"],
        ["+55 (11) 98888-7777"],
        ["+5511988887777"],
        ["+5511977776666"],
      ],
    }),
  };

  assert.equal(findLeadRowByPhone_(sheet, "5511988887777"), 3);
});

test("automatic classification advances but never downgrades the funnel", () => {
  const { shouldApplyLeadStatus_ } = loadFunctions();

  assert.equal(shouldApplyLeadStatus_("Novo", "Qualificado", "high"), true);
  assert.equal(
    shouldApplyLeadStatus_("Consulta agendada", "Qualificado", "high"),
    false,
  );
  assert.equal(shouldApplyLeadStatus_("Novo", "Não qualificado", "low"), false);
});

test("a qualified row with GCLID becomes ready for IMPORT_GCLID", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();
  const writes = [];
  const values = Array(25).fill("");
  values[1] = "G26F03";
  values[10] = "test-gclid";
  values[14] = "wamid.old-message";
  const sheet = {
    getRange(row, column, rows, columns) {
      return {
        getDisplayValues: () => [values],
        setValues(next) {
          writes.push({ row, column, rows, columns, values: next });
        },
      };
    },
  };

  assert.equal(
    ensureQualifiedGoogleConversion_(
      sheet,
      7,
      "+5511988887777",
      new Date("2026-08-02T15:00:00Z"),
    ),
    true,
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(writes[0].values)),
    [["Sim", "Lead qualificado", 1]],
  );
  assert.match(writes[1].values[0][1], /^WA-20260802-G26F03-7777$/);
});
