import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./OperationalEvents.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = {
    Array,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    CONFIG: {
      operationalEventSheetName: "_WHATSAPP_OPERACAO_EVENTOS",
      eventSheetName: "_WHATSAPP_EVENTOS",
    },
    boundedText_(value, length) {
      return String(value || "").trim().slice(0, length);
    },
    normalizePhone_(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits ? `+${digits}` : "";
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { ` +
      "normalizarEventoOperacional_, percentileOperacional_, " +
      "parseDataEventoOperacional_, minutosUteisSlaOperacional_, " +
      "auditarSlaOperacionalInterno_, atualizarResumoSlaOperacionalInterno_, " +
      "OPERATIONAL_EVENT_TYPES };",
    sandbox,
  );
  return sandbox.__test;
}

test("operational ledger accepts only typed events without message content", () => {
  const { normalizarEventoOperacional_ } = load();
  const result = normalizarEventoOperacional_({
    eventId: "evt-1",
    parentEventId: "inbound-1",
    opportunityId: "opp-1",
    phone: "+55 11 90000-0000",
    type: "automatic_reply_sent",
    source: "bruna",
    at: "2026-08-14T15:00:00.000Z",
    outcome: "completed",
    text: "must never be persisted",
  });

  assert.equal(result.ok, true);
  assert.equal(result.phone, "+5511900000000");
  assert.equal(Object.hasOwn(result, "text"), false);
  assert.equal(
    normalizarEventoOperacional_({
      eventId: "evt-2",
      type: "untyped_event",
      source: "bruna",
    }).ok,
    false,
  );
});

test("SLA counts only minutes inside the published 8am to 8pm window", () => {
  const { minutosUteisSlaOperacional_ } = load();

  assert.equal(
    minutosUteisSlaOperacional_(
      new Date(2026, 7, 14, 19, 50),
      new Date(2026, 7, 15, 8, 10),
    ),
    20,
  );
  assert.equal(
    minutosUteisSlaOperacional_(
      new Date(2026, 7, 14, 21, 0),
      new Date(2026, 7, 15, 7, 0),
    ),
    0,
  );
  assert.equal(
    minutosUteisSlaOperacional_(
      new Date(2026, 7, 15, 9, 0),
      new Date(2026, 7, 15, 8, 59),
    ),
    null,
  );
  assert.equal(
    minutosUteisSlaOperacional_("invalid", new Date(2026, 7, 15, 9, 0)),
    null,
  );
});

test("SLA denominator includes pending routes and rejects invalid response time", () => {
  const { auditarSlaOperacionalInterno_ } = load();
  const now = new Date(2026, 7, 14, 12, 0);
  const inboundRows = [
    ["message-1", "inbound-1", "", new Date(2026, 7, 14, 9, 0), "", "", "opp-1", "amanda", "resolved"],
    ["message-2", "inbound-2", "", new Date(2026, 7, 14, 10, 0), "", "route_pending", "", "unknown", "pending"],
    ["message-nonlead", "inbound-nonlead", "", new Date(2026, 7, 14, 10, 30), "", "nonlead", "", "unknown", "nonlead"],
    ["message-future", "inbound-future", "", new Date(2026, 7, 14, 13, 0), "", "", "opp-future", "amanda", "resolved"],
    ["message-invalid-date", "inbound-invalid-date", "", "not-a-date", "", "", "opp-invalid", "amanda", "resolved"],
    ["message-old", "inbound-old", "", new Date(2026, 6, 1, 10, 0), "", "", "opp-old", "amanda", "resolved"],
  ];
  const operationalRows = [
    ["reply-before", "inbound-1", "opp-1", "human_reply_sent", "equipe_humana", new Date(2026, 7, 14, 8, 59), "recorded", now],
    ["reply-1", "inbound-1", "opp-1", "human_reply_sent", "equipe_humana", new Date(2026, 7, 14, 9, 30), "recorded", now],
    ["reply-mismatch", "inbound-1", "opp-other", "human_reply_sent", "equipe_humana", new Date(2026, 7, 14, 9, 10), "recorded", now],
    ["reply-future", "inbound-1", "opp-1", "automatic_reply_sent", "bruna", new Date(2026, 7, 14, 13, 0), "completed", now],
    ["pause-1", "inbound-1", "opp-1", "automation_paused", "equipe_humana", new Date(2026, 7, 14, 9, 31), "human_takeover", now],
    ["handoff-2", "inbound-2", "", "human_handoff_queued", "bruna", new Date(2026, 7, 14, 10, 5), "queued", now],
  ];
  const buildSheet = (rows) => ({
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getValues: () => rows }),
  });
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_WHATSAPP_EVENTOS") return buildSheet(inboundRows);
      if (name === "_WHATSAPP_OPERACAO_EVENTOS") {
        return buildSheet(operationalRows);
      }
      return null;
    },
  };

  const result = auditarSlaOperacionalInterno_(spreadsheet, {
    periodDays: 7,
    now,
    overdueP0P1: 0,
  });

  assert.equal(result.inboundEvents, 2);
  assert.equal(result.validRouteEvents, 1);
  assert.equal(result.pendingRouteEvents, 1);
  assert.equal(result.invalidRouteEvents, 0);
  assert.equal(result.excludedNonLeadEvents, 1);
  assert.equal(result.invalidInboundDates, 1);
  assert.equal(result.routeCoverage, 0.5);
  assert.equal(result.measurableResponses, 1);
  assert.equal(result.coverage, 0.5);
  assert.equal(result.humanResponses, 1);
  assert.equal(result.medianMinutes, 30);
  assert.equal(result.p95Minutes, 30);
  assert.equal(result.handoffs, 1);
  assert.equal(result.pauses, 1);
  assert.equal(result.preInboundResponsesExcluded, 1);
  assert.equal(result.futureResponsesExcluded, 1);
  assert.equal(result.invalidResponseIntervals, 1);
  assert.equal(result.responseCoverageGate, false);
  assert.equal(result.routeCoverageGate, false);
  assert.equal(result.overdueP0P1Gate, true);
  assert.equal(result.operationalGate, false);
});

test("zero eligible inbound is N/D rather than zero coverage", () => {
  const { auditarSlaOperacionalInterno_ } = load();
  const now = new Date(2026, 7, 14, 12, 0);
  const inboundRows = [
    ["message-nonlead", "inbound-nonlead", "", new Date(2026, 7, 14, 10, 0), "", "nonlead", "", "unknown", "nonlead"],
    ["message-future", "inbound-future", "", new Date(2026, 7, 14, 13, 0), "", "", "opp-future", "amanda", "resolved"],
  ];
  const buildSheet = (rows) => ({
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getValues: () => rows }),
  });
  const result = auditarSlaOperacionalInterno_({
    getSheetByName(name) {
      if (name === "_WHATSAPP_EVENTOS") return buildSheet(inboundRows);
      if (name === "_WHATSAPP_OPERACAO_EVENTOS") return buildSheet([]);
      return null;
    },
  }, { now, periodDays: 7, overdueP0P1: 0 });

  assert.equal(result.inboundEvents, 0);
  assert.equal(result.coverage, null);
  assert.equal(result.routeCoverage, null);
  assert.equal(result.responseCoverageGate, null);
  assert.equal(result.routeCoverageGate, null);
  assert.equal(result.overdueP0P1Gate, true);
  assert.equal(result.operationalGate, null);
});

test("operational gate requires SLA 95%, valid route 99% and no overdue P0/P1", () => {
  const { auditarSlaOperacionalInterno_ } = load();
  const now = new Date(2026, 7, 14, 12, 0);
  const inboundRows = [];
  const operationalRows = [];
  for (let index = 0; index < 100; index += 1) {
    const eventId = `inbound-${index}`;
    const validRoute = index < 99;
    inboundRows.push([
      `message-${index}`,
      eventId,
      "",
      new Date(2026, 7, 14, 9, index % 60),
      "",
      validRoute ? "inserted" : "route_pending",
      validRoute ? `opp-${index}` : "",
      validRoute ? "amanda" : "unknown",
      validRoute ? "resolved" : "pending",
    ]);
    if (index < 95) {
      operationalRows.push([
        `reply-${index}`,
        eventId,
        `opp-${index}`,
        "automatic_reply_sent",
        "bruna",
        new Date(2026, 7, 14, 11, index % 60),
        "completed",
        now,
      ]);
    }
  }
  const buildSheet = (rows) => ({
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getValues: () => rows }),
  });
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_WHATSAPP_EVENTOS") return buildSheet(inboundRows);
      if (name === "_WHATSAPP_OPERACAO_EVENTOS") {
        return buildSheet(operationalRows);
      }
      return null;
    },
  };

  const passed = auditarSlaOperacionalInterno_(spreadsheet, {
    now,
    periodDays: 7,
    overdueP0P1: 0,
  });
  assert.equal(passed.coverage, 0.95);
  assert.equal(passed.routeCoverage, 0.99);
  assert.equal(passed.responseCoverageGate, true);
  assert.equal(passed.routeCoverageGate, true);
  assert.equal(passed.overdueP0P1Gate, true);
  assert.equal(passed.operationalGate, true);

  const overdue = auditarSlaOperacionalInterno_(spreadsheet, {
    now,
    periodDays: 7,
    overdueP0P1: 1,
  });
  assert.equal(overdue.overdueP0P1Gate, false);
  assert.equal(overdue.operationalGate, false);
});

test("summary writes N/D when the denominator or critical-source evidence is absent", () => {
  const { atualizarResumoSlaOperacionalInterno_ } = load();
  const now = new Date(2026, 7, 14, 12, 0);
  let summaryRow = null;
  const emptySheet = {
    getLastRow: () => 1,
    getRange: () => ({ getValues: () => [] }),
  };
  const summarySheet = {
    getMaxColumns: () => 40,
    insertColumnsAfter() {},
    getRange(row) {
      return {
        setValues(values) {
          if (row === 2) summaryRow = values[0];
          return this;
        },
      };
    },
  };
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_WHATSAPP_EVENTOS") return emptySheet;
      if (name === "_WHATSAPP_OPERACAO_EVENTOS") return emptySheet;
      if (name === "_BOT_METRICAS") return summarySheet;
      return null;
    },
  };

  const result = atualizarResumoSlaOperacionalInterno_(spreadsheet, {
    now,
    periodDays: 7,
  });
  assert.equal(result.coverage, null);
  assert.equal(result.overdueP0P1, null);
  assert.equal(summaryRow[4], "N/D");
  assert.equal(summaryRow[7], "N/D");
  assert.equal(summaryRow[8], "N/D");
  assert.equal(summaryRow[18], "N/D");
  assert.equal(summaryRow[19], "N/D");
  assert.equal(summaryRow[20], "N/D");
  assert.equal(summaryRow[21], "N/D");
  assert.equal(summaryRow[22], "N/D");
  assert.equal(summaryRow[23], "N/D");
});

test("SLA percentiles are deterministic for small operational samples", () => {
  const { percentileOperacional_, parseDataEventoOperacional_ } = load();

  assert.equal(percentileOperacional_([30, 5, 10, 20], 0.5), 10);
  assert.equal(percentileOperacional_([30, 5, 10, 20], 0.95), 30);
  assert.equal(percentileOperacional_([], 0.5), null);
  assert.equal(
    parseDataEventoOperacional_("14/08/2026 12:30:45").getFullYear(),
    2026,
  );
});
