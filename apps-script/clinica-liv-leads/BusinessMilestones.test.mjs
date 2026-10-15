import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./BusinessMilestones.gs", import.meta.url),
  "utf8",
);

function load(overrides = {}) {
  const sandbox = {
    Array,
    Date,
    Number,
    Object,
    String,
    boundedText_(value, length) {
      return String(value || "").trim().slice(0, length);
    },
    ...overrides,
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { normalizarMarcoOportunidade_, planejarInvalidacaoMarcoAuditada_, invalidarMarcoOportunidadeAuditado_ };`,
    sandbox,
  );
  return sandbox.__test;
}

test("business milestone is typed, opportunity-bound and contains no evidence text", () => {
  const { normalizarMarcoOportunidade_ } = load();
  const result = normalizarMarcoOportunidade_({
    eventId: "milestone-1",
    opportunityId: "opp-1",
    milestone: "quote_sent",
    at: "2026-08-14T15:00:00.000Z",
    source: "whatsapp_classifier",
    confidence: "low",
    evidence: "must never be persisted",
  });

  assert.equal(result.ok, true);
  assert.equal(result.milestone, "quote_sent");
  assert.equal(result.confidence, "low");
  assert.equal(Object.hasOwn(result, "evidence"), false);
  assert.equal(
    normalizarMarcoOportunidade_({
      eventId: "milestone-2",
      opportunityId: "",
      milestone: "accepted",
    }).reason,
    "opportunity_id_required",
  );
  assert.equal(
    normalizarMarcoOportunidade_({
      eventId: "milestone-3",
      opportunityId: "opp-1",
      milestone: "invented",
    }).reason,
    "invalid_business_milestone",
  );
});

function auditedMilestoneFixture() {
  const headers = ["Event ID", "Opportunity ID", "Marco", "Data e hora", "Origem", "Confiança", "Estado", "Criado em"];
  const original = ["synthetic-event", "opp_v2_amanda_12345678", "accepted", new Date("2026-10-01T12:00:00Z"),
    "whatsapp_classifier", "high", "recorded", new Date("2026-10-01T12:01:00Z")];
  const rows = [headers, [...original]];
  const writes = [];
  let receipt = ["admin_request", "void_accepted", "hash", "prepared"];
  const sheet = { getLastRow: () => rows.length, getRange(row, column, height = 1, width = 1) {
    return { getValues: () => rows.slice(row - 1, row - 1 + height).map(line => line.slice(column - 1, column - 1 + width)),
      getDisplayValues: () => rows.slice(row - 1, row - 1 + height).map(line => line.slice(column - 1, column - 1 + width).map(String)),
      setValue(value) { writes.push([row, column, value]); rows[row - 1][column - 1] = value; } };
  } };
  const spreadsheet = { getSheetByName: () => sheet };
  const item = { payload: { eventId: original[0], opportunityId: original[1], expectedMilestone: "accepted", expectedState: "recorded",
    reasonCode: "no_concrete_proposal_acceptance", expectedStateHash: JSON.stringify(original) } };
  const api = load({ JSON, Array,
    SpreadsheetApp: { flush() {} }, OPPORTUNITY_STORE_CONFIG: { sheetName: "crm" }, OPPORTUNITY_HEADERS: Array(26),
    linhasReconciliacaoAdministrativa_: () => [[original[1]]],
    hashReconciliacaoAdministrativa_: value => JSON.stringify(value),
    reciboReconciliacaoAdministrativa_: () => receipt,
    registrarReciboReconciliacaoAdministrativa_: (_spreadsheet, _item, state, plan) => {
      writes.push({ state, before: plan.beforeState, after: plan.afterState });
    },
  });
  return { api, spreadsheet, item, rows, original, writes, setReceipt: value => { receipt = value; } };
}

test("audited accepted invalidation changes only state and appends the owner audit transition", () => {
  const f = auditedMilestoneFixture();
  const result = f.api.invalidarMarcoOportunidadeAuditado_(f.spreadsheet, f.item);
  assert.equal(result.ok, true);
  const expected = [...f.original]; expected[6] = "voided";
  assert.deepEqual(f.rows[1], expected);
  assert.deepEqual(f.writes, [[2, 7, "voided"], { state: "milestone_voided", before: "recorded", after: "voided" }]);
});

test("audited milestone mismatch or missing prepared receipt cannot modify evidence", () => {
  for (const mode of ["event", "opportunity", "type", "state", "hash", "duplicate", "receipt"]) {
    const f = auditedMilestoneFixture();
    if (mode === "event") f.item.payload.eventId = "wrong-event";
    if (mode === "opportunity") f.item.payload.opportunityId = "opp_v2_amanda_99999999";
    if (mode === "type") f.rows[1][2] = "payment_confirmed";
    if (mode === "state") f.rows[1][6] = "voided";
    if (mode === "hash") f.item.payload.expectedStateHash = "stale";
    if (mode === "duplicate") f.rows.push([...f.rows[1]]);
    if (mode === "receipt") f.setReceipt(null);
    assert.throws(() => f.api.invalidarMarcoOportunidadeAuditado_(f.spreadsheet, f.item), /administrative_milestone_/);
    assert.equal(f.writes.length, 0, mode);
  }
});
