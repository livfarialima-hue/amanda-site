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
      "collectLeadMessagesForOpportunity_, classificationAdministrativeSignal_, " +
      "administrativeLeadStatus_, effectiveLeadStatusFromClassification_, " +
      "relationshipFromClassification_, shouldAlertLowConfidenceAdministrativeChange_, " +
      "validarLinhaImportacaoGoogleAds_, GOOGLE_ADS_IMPORT_HEADERS };",
    sandbox,
  );
  return sandbox.__test;
}

test("Google Ads import preserves the mapped conversion value header", () => {
  const { GOOGLE_ADS_IMPORT_HEADERS } = loadFunctions();

  assert.equal(GOOGLE_ADS_IMPORT_HEADERS[6], "Valor (R$)");
});

test("Google Ads import accepts exactly one click id and all required fields", () => {
  const { validarLinhaImportacaoGoogleAds_ } = loadFunctions();
  const valid = validarLinhaImportacaoGoogleAds_([
    "transaction-1",
    "gclid-1",
    "",
    "",
    "Lead qualificado GCLID",
    "2026-08-14 12:00:00-03:00",
    1,
    "BRL",
  ]);
  assert.equal(valid.ok, true);
  assert.equal(valid.identifierType, "GCLID");

  const invalid = validarLinhaImportacaoGoogleAds_([
    "transaction-2",
    "gclid-2",
    "gbraid-2",
    "",
    "Lead qualificado GCLID",
    "2026-08-14 12:00:00-03:00",
    1,
    "BRL",
  ]);
  assert.equal(invalid.ok, false);
  assert.deepEqual(Array.from(invalid.errors), ["click_id_cardinality"]);
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

test("classification recovers later unknown messages only for a verified opportunity", () => {
  const { collectLeadMessagesForOpportunity_ } = loadFunctions();
  const row = ({ id, opportunity = "", professional = "unknown" }) => [
    "+5511900005416",
    "IN",
    "2026-08-12T15:00:00.000Z",
    id,
    `evt-${id}`,
    `texto ${id}`,
    "",
    opportunity,
    professional,
    "",
  ];
  const values = [
    row({ id: "unknown-before" }),
    row({ id: "linked", opportunity: "opp-amanda", professional: "amanda" }),
    row({ id: "unknown-after" }),
    row({ id: "explicit-amanda", professional: "amanda" }),
    row({ id: "explicit-daniel", professional: "daniel" }),
    row({ id: "other-opportunity", opportunity: "opp-other", professional: "amanda" }),
  ];
  const sheet = {
    getLastRow: () => values.length + 1,
    getRange: () => ({ getValues: () => values }),
  };

  const withoutRecovery = collectLeadMessagesForOpportunity_(
    sheet,
    "opp-amanda",
    "+5511900005416",
    "amanda",
    24,
    false,
  );
  assert.deepEqual(
    withoutRecovery.map((message) => message.messageId),
    ["linked", "explicit-amanda"],
  );

  const withRecovery = collectLeadMessagesForOpportunity_(
    sheet,
    "opp-amanda",
    "+5511900005416",
    "amanda",
    24,
    true,
  );
  assert.deepEqual(
    withRecovery.map((message) => message.messageId),
    ["linked", "unknown-after", "explicit-amanda"],
  );
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

test("administrative milestones protect funnel updates", () => {
  const {
    administrativeLeadStatus_,
    effectiveLeadStatusFromClassification_,
    shouldApplyLeadStatus_,
  } = loadFunctions();

  assert.equal(
    effectiveLeadStatusFromClassification_("Consulta realizada", {
      recommendedStatus: "Paciente convertido",
      procedureMilestone: "quote_sent",
    }),
    "Consulta realizada",
  );
  assert.equal(
    administrativeLeadStatus_({ procedureMilestone: "accepted" }),
    "Paciente convertido",
  );
  assert.equal(
    administrativeLeadStatus_({ appointmentOutcome: "attended" }),
    "Consulta realizada",
  );
  assert.equal(
    shouldApplyLeadStatus_("Novo", "Consulta agendada", "low", true),
    true,
  );
});

test("low-confidence administrative changes are flagged for email review", () => {
  const {
    relationshipFromClassification_,
    shouldAlertLowConfidenceAdministrativeChange_,
  } = loadFunctions();

  assert.equal(
    shouldAlertLowConfidenceAdministrativeChange_({
      confidence: "low",
      appointmentOutcome: "confirmed",
      procedureMilestone: "none",
    }),
    true,
  );
  assert.equal(
    shouldAlertLowConfidenceAdministrativeChange_({
      confidence: "medium",
      appointmentOutcome: "attended",
      procedureMilestone: "none",
    }),
    false,
  );
  assert.equal(
    relationshipFromClassification_("Paciente convertido", {
      procedureMilestone: "completed",
    }),
    "active_postop",
  );
  assert.equal(
    relationshipFromClassification_("Consulta realizada", {
      procedureMilestone: "quote_sent",
    }),
    "surgical_planning",
  );
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
