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
      "auditarSlaOperacionalInterno_, OPERATIONAL_EVENT_TYPES };",
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
});

test("SLA audit pairs only routed inbound events from the selected period", () => {
  const { auditarSlaOperacionalInterno_ } = load();
  const now = new Date(2026, 7, 14, 12, 0);
  const inboundRows = [
    ["message-1", "inbound-1", "", new Date(2026, 7, 14, 9, 0), "", "", "opp-1", "amanda", "resolved"],
    ["message-2", "inbound-2", "", new Date(2026, 7, 14, 10, 0), "", "", "opp-2", "amanda", "resolved"],
    ["message-old", "inbound-old", "", new Date(2026, 6, 1, 10, 0), "", "", "opp-old", "amanda", "resolved"],
  ];
  const operationalRows = [
    ["reply-1", "inbound-1", "opp-1", "human_reply_sent", "equipe_humana", new Date(2026, 7, 14, 9, 30), "recorded", now],
    ["pause-1", "inbound-1", "opp-1", "automation_paused", "equipe_humana", new Date(2026, 7, 14, 9, 31), "human_takeover", now],
    ["handoff-2", "inbound-2", "opp-2", "human_handoff_queued", "bruna", new Date(2026, 7, 14, 10, 5), "queued", now],
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
  });

  assert.equal(result.inboundEvents, 2);
  assert.equal(result.measurableResponses, 1);
  assert.equal(result.coverage, 0.5);
  assert.equal(result.humanResponses, 1);
  assert.equal(result.medianMinutes, 30);
  assert.equal(result.p95Minutes, 30);
  assert.equal(result.handoffs, 1);
  assert.equal(result.pauses, 1);
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
