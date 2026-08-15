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
  const scriptProperties = new Map([
    ["GOOGLE_ADS_TRANSACTION_HMAC_SECRET", "S".repeat(43)],
    ["LEAD_IDENTITY_HMAC_SECRET", "I".repeat(43)],
    ["LEAD_IDENTITY_HMAC_KEY_VERSION", "k1"],
  ]);
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
      computeHmacSha256Signature(value, secret) {
        const input = `${value}|${secret}`;
        return Array.from({ length: 32 }, (_, index) =>
          input.charCodeAt(index % input.length) % 256,
        );
      },
      base64EncodeWebSafe(bytes) {
        const alphabet =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        return Array.from({ length: 43 }, (_, index) =>
          alphabet[Math.abs(bytes[index % bytes.length]) % alphabet.length],
        ).join("");
      },
      getUuid: () => "test-uuid",
      formatDate(_date, _timezone, pattern) {
        if (pattern === "yyyyMMdd") return "20260802";
        if (pattern.includes("XXX")) return "2026-08-02 12:00:00-03:00";
        return "02/08/2026";
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty: (key) => scriptProperties.get(key) || null,
          setProperty: (key, value) => scriptProperties.set(key, value),
        };
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
      "validarLinhaImportacaoGoogleAds_, GOOGLE_ADS_IMPORT_HEADERS, " +
      "googleAdsTransactionIdSeguro_, googleConversionTransactionId_, " +
      "pseudonimoIdentidadeLead_, " +
      "leadOpportunityId_, " +
      "linhaExigeNomeConversaoQualificadoGoogleAds_, " +
      "motivoVinculoVisivelGoogleAds_, motivoVinculoLedgerGoogleAds_, " +
      "classificarAcaoReaperClassificacao_, categoriaExcecaoClassificacao_ };",
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
    `LIV-QL-v1-${"A".repeat(43)}`,
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
    `LIV-QL-v1-${"B".repeat(43)}`,
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

test("Google Ads import rejects legacy or personally-derived transaction ids", () => {
  const { validarLinhaImportacaoGoogleAds_ } = loadFunctions();
  const invalid = validarLinhaImportacaoGoogleAds_([
    "WA-legacy-last4",
    "gclid-1",
    "",
    "",
    "Lead qualificado GCLID",
    "2026-08-14 12:00:00-03:00",
    1,
    "BRL",
  ]);
  assert.equal(invalid.ok, false);
  assert.deepEqual(Array.from(invalid.errors), ["unsafe_transaction_id"]);
});

test("Google Ads transaction ids use the opaque HMAC v1 contract", () => {
  const {
    googleAdsTransactionIdSeguro_,
    googleConversionTransactionId_,
  } = loadFunctions();
  const transactionId = googleConversionTransactionId_(
    "opp_synthetic",
    "qualified_lead",
  );
  assert.equal(googleAdsTransactionIdSeguro_(transactionId), true);
  assert.match(transactionId, /^LIV-QL-v1-[A-Za-z0-9_-]{43}$/);
  assert.doesNotMatch(transactionId, /opp_synthetic|qualified_lead/);
});

test("person pseudonyms use a versioned HMAC and never expose the phone", () => {
  const { pseudonimoIdentidadeLead_ } = loadFunctions();
  const phone = "+5511900000000";
  const first = pseudonimoIdentidadeLead_(phone);
  const second = pseudonimoIdentidadeLead_(phone);

  assert.equal(first, second);
  assert.match(first, /^pid_k1_[A-Za-z0-9_-]{43}$/);
  assert.equal(first.includes(phone.replace(/\D/g, "")), false);
});

test("legacy opportunity fallback is deterministic HMAC rather than raw-event hash", () => {
  const { leadOpportunityId_ } = loadFunctions();
  const row = ["15/08/2026 10:00", "M26F02S"];
  const phone = "+5511900000000";
  const first = leadOpportunityId_(row, phone);
  const second = leadOpportunityId_(row, phone);

  assert.equal(first, second);
  assert.match(first, /^opp_legacy_k1_[A-Za-z0-9_-]{43}$/);
  assert.equal(first.includes(phone.replace(/\D/g, "")), false);
});

test("visible Google Ads rows use the canonical name only with one click id", () => {
  const { linhaExigeNomeConversaoQualificadoGoogleAds_ } = loadFunctions();
  const columns = {
    "Enviar ao Google Ads?": 7,
    "Nome da conversão": 8,
    GCLID: 11,
    GBRAID: 12,
    WBRAID: 13,
  };
  const eligible = Array(13).fill("");
  eligible[6] = "Sim";
  eligible[10] = "gclid-1";
  assert.equal(
    linhaExigeNomeConversaoQualificadoGoogleAds_(eligible, columns),
    true,
  );

  const notSent = eligible.slice();
  notSent[6] = "Não";
  assert.equal(
    linhaExigeNomeConversaoQualificadoGoogleAds_(notSent, columns),
    false,
  );

  const ambiguous = eligible.slice();
  ambiguous[11] = "gbraid-1";
  assert.equal(
    linhaExigeNomeConversaoQualificadoGoogleAds_(ambiguous, columns),
    false,
  );
});

test("Google Ads reconciliation accepts only exact visible and ledger identities", () => {
  const {
    motivoVinculoVisivelGoogleAds_,
    motivoVinculoLedgerGoogleAds_,
  } = loadFunctions();
  const details = {
    identifierType: "GCLID",
    clickId: "gclid-1",
  };
  const visible = [{
    opportunityId: "opp-1",
    professional: "amanda",
    clickIdCount: 1,
    identifierType: "GCLID",
    clickId: "gclid-1",
  }];

  assert.equal(
    motivoVinculoVisivelGoogleAds_(visible, details, "opp-1"),
    "",
  );
  assert.equal(
    motivoVinculoVisivelGoogleAds_(visible, details, "opp-2"),
    "visible_opportunity_mismatch",
  );
  assert.equal(
    motivoVinculoVisivelGoogleAds_(
      [{ ...visible[0], clickId: "other-click" }],
      details,
      "opp-1",
    ),
    "visible_click_id_mismatch",
  );
  assert.equal(
    motivoVinculoVisivelGoogleAds_([visible[0], visible[0]], details, "opp-1"),
    "ambiguous_visible_transaction",
  );
  const ledger = Array(15).fill("");
  ledger[1] = "opp-1";
  ledger[3] = "GCLID";
  ledger[4] = "gclid-1";
  ledger[14] = "amanda";
  assert.equal(
    motivoVinculoLedgerGoogleAds_(ledger, details, "opp-1"),
    "",
  );
  const wrongLedger = Array.from(ledger);
  wrongLedger[4] = "other-click";
  assert.equal(
    motivoVinculoLedgerGoogleAds_(wrongLedger, details, "opp-1"),
    "ledger_click_id_mismatch",
  );
});

test("classification reaper separates retries, dead letters and orphan review", () => {
  const { classificarAcaoReaperClassificacao_ } = loadFunctions();
  const now = new Date("2026-08-14T15:00:00.000Z");
  const row = () => Array(20).fill("");

  const expired = row();
  expired[4] = "running";
  expired[5] = "2026-08-14T14:00:00.000Z";
  expired[14] = 2;
  assert.equal(
    classificarAcaoReaperClassificacao_(expired, now).action,
    "requeue",
  );

  const exhausted = row();
  exhausted[4] = "failed";
  exhausted[13] = "request_failed";
  exhausted[14] = 8;
  assert.equal(
    classificarAcaoReaperClassificacao_(exhausted, now).action,
    "dead_letter",
  );

  const orphan = row();
  orphan[4] = "orphaned";
  orphan[13] = "lead_not_found";
  orphan[14] = 170;
  assert.equal(
    classificarAcaoReaperClassificacao_(orphan, now).action,
    "exception_review",
  );
});

test("business exclusion is not reported as a technical failure", () => {
  const { categoriaExcecaoClassificacao_ } = loadFunctions();

  assert.equal(
    categoriaExcecaoClassificacao_("completed", "business_exclusion"),
    "business_exclusion",
  );
  assert.equal(
    categoriaExcecaoClassificacao_("failed", "request_failed"),
    "technical_failure",
  );
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

test("a qualified row with GCLID becomes ready for IMPORT_GOOGLE_ADS", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();
  const writes = [];
  const values = Array(25).fill("");
  values[1] = "G26F03";
  values[10] = "test-gclid";
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
  assert.match(
    writes[1].values[0][1],
    /^LIV-QL-v1-[A-Za-z0-9_-]{43}$/,
  );
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

test("an event already marked for Google preserves a safe transaction id", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();
  const values = Array(25).fill("");
  values[6] = "Sim";
  values[10] = "existing-gclid";
  values[14] = `LIV-QL-v1-${"C".repeat(43)}`;
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
  assert.equal(writes[1][0][1], `LIV-QL-v1-${"C".repeat(43)}`);
});

test("an unsafe legacy transaction is quarantined instead of re-exported", () => {
  const { ensureQualifiedGoogleConversion_ } = loadFunctions();
  const values = Array(25).fill("");
  values[6] = "Sim";
  values[10] = "existing-gclid";
  values[14] = "WA-legacy-last4";
  const writes = [];
  const sheet = {
    getRange() {
      return {
        getDisplayValues: () => [values],
        setValues(next) { writes.push(next); },
      };
    },
  };

  assert.equal(
    ensureQualifiedGoogleConversion_(
      sheet,
      2,
      "+5511900000000",
      new Date("2026-08-02T15:00:00Z"),
    ),
    false,
  );
  assert.equal(writes[0][0][0], "Não");
  assert.match(writes[1][0][1], /^LIV-QL-v1-[A-Za-z0-9_-]{43}$/);
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
