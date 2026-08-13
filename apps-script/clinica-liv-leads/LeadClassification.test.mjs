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
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, value) {
        const bytes = Array.from(String(value || ""), (character) =>
          character.charCodeAt(0) % 256,
        );
        return Array.from({ length: 32 }, (_, index) =>
          bytes[index % Math.max(bytes.length, 1)] || index,
        );
      },
      getUuid: () => "test-uuid",
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
      "shouldApplyLeadStatus_, ensureQualifiedGoogleConversion_, " +
      "compareClassificationCandidates_, classificationLeaseMatches_, " +
      "GOOGLE_ADS_IMPORT_HEADERS };",
    sandbox,
  );
  return sandbox.__test;
}

test("Google Ads import preserves the mapped conversion value header", () => {
  const { GOOGLE_ADS_IMPORT_HEADERS } = loadFunctions();

  assert.equal(GOOGLE_ADS_IMPORT_HEADERS[6], "Valor (R$)");
});

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

test("fresh queue items run before poison retries and oldest wins ties", () => {
  const { compareClassificationCandidates_ } = loadFunctions();
  const candidates = [
    { index: 0, attempts: 7, dueAt: new Date("2026-08-01") },
    { index: 1, attempts: 0, dueAt: new Date("2026-08-03") },
    { index: 2, attempts: 0, dueAt: new Date("2026-08-02") },
  ];

  candidates.sort(compareClassificationCandidates_);
  assert.deepEqual(candidates.map((item) => item.index), [2, 1, 0]);
});

test("a stale worker cannot complete a newer lease", () => {
  const { classificationLeaseMatches_ } = loadFunctions();
  const sheet = {
    getRange: () => ({ getDisplayValue: () => "current-lease" }),
  };

  assert.equal(
    classificationLeaseMatches_(sheet, 2, "old-lease"),
    false,
  );
  assert.equal(
    classificationLeaseMatches_(sheet, 2, "current-lease"),
    true,
  );
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
    [["Sim", "Lead qualificado GCLID", 1]],
  );
  assert.match(writes[1].values[0][1], /^LIV-[a-f0-9]{20}$/);
});

test("GBRAID and WBRAID are eligible even without GCLID", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();

  for (const clickColumn of [11, 12]) {
    const values = Array(25).fill("");
    values[0] = "02/08/2026";
    values[1] = "campanha-mobile";
    values[clickColumn] = "mobile-click-id";
    const writes = [];
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
        3,
        "+5511988887777",
        new Date("2026-08-02T15:00:00Z"),
      ),
      true,
    );
    assert.equal(writes[0].values[0][0], "Sim");
  }
});

test("an event already marked for Google preserves its transaction id", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();
  const values = Array(25).fill("");
  values[6] = "Sim";
  values[10] = "existing-gclid";
  values[14] = "existing-order-id";
  const writes = [];
  const sheet = {
    getRange() {
      return {
        getDisplayValues: () => [values],
        setValues(next) {
          writes.push(next);
        },
      };
    },
  };

  ensureQualifiedGoogleConversion_(
    sheet,
    2,
    "+5511988887777",
    new Date("2026-08-02T15:00:00Z"),
  );
  assert.equal(writes[1][0][1], "existing-order-id");
});

test("Daniel is never eligible for the Google Ads import", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();
  const values = Array(25).fill("");
  values[10] = "gclid-that-must-not-be-used";
  let writes = 0;
  const sheet = {
    getName: () => "Leads Dr. Daniel",
    getRange() {
      return {
        getDisplayValues: () => [values],
        setValues() { writes += 1; },
      };
    },
  };
  assert.equal(
    ensureQualifiedGoogleConversion_(
      sheet,
      2,
      "+5511900000000",
      new Date(),
      { opportunityId: "opp-daniel", professional: "daniel" },
    ),
    false,
  );
  assert.equal(writes, 0);
});
