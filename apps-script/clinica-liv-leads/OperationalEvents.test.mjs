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
      "parseDataEventoOperacional_, OPERATIONAL_EVENT_TYPES };",
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
