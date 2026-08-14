import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function loadCode() {
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
      formatDate: (_date, _timezone, pattern) =>
        pattern.includes("HH:mm")
          ? "28/07/2026 21:31"
          : "28/07/2026",
    },
    SpreadsheetApp: {
      flush() {},
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__test = {
  CONFIG,
  EXPECTED_HEADERS,
  writeLead_,
  decomporReferenciaAquisicao_,
  isKnownPatientRelationship_,
  findProcessedEvent_,
  resolvePendingProcessedEvent_,
  resolucaoLeadBloqueiaInsercao_,
};`,
    sandbox,
  );

  return sandbox.__test;
}

test("lead ingestion schema matches the 25 live spreadsheet headers", () => {
  const { CONFIG, EXPECTED_HEADERS } = loadCode();

  assert.equal(CONFIG.totalColumns, 25);
  assert.deepEqual(Array.from(EXPECTED_HEADERS), [
    "Data do contato",
    "Referência da campanha",
    "Telefone (E.164)",
    "E-mail",
    "Situação do lead",
    "Data da situação",
    "Enviar ao Google Ads?",
    "Nome da conversão",
    "Valor (R$)",
    "Consentimento para medição",
    "GCLID",
    "GBRAID",
    "WBRAID",
    "Data e hora da conversão",
    "ID da transação",
    "Moeda",
    "Observação administrativa",
    "Planejamento Individual",
    "Origem do evento",
    "Plataforma de aquisição",
    "Campanha",
    "Criativo",
    "CTA",
    "Destino",
    "Referência completa",
  ]);
});

test("known patients are recognized before acquisition ingestion", () => {
  const { isKnownPatientRelationship_ } = loadCode();

  assert.equal(
    isKnownPatientRelationship_({
      found: true,
      relationshipState: "appointment_scheduled",
    }),
    true,
  );
  assert.equal(
    isKnownPatientRelationship_({
      found: false,
      relationshipState: "unknown",
    }),
    false,
  );
});

test("ambiguous lead identity blocks insertion while a genuinely new phone does not", () => {
  const { resolucaoLeadBloqueiaInsercao_ } = loadCode();

  assert.equal(
    resolucaoLeadBloqueiaInsercao_({ ok: false, reason: "ambiguous_phone" }),
    true,
  );
  assert.equal(
    resolucaoLeadBloqueiaInsercao_({
      ok: false,
      reason: "duplicate_opportunity_id_in_visible_sheet",
    }),
    true,
  );
  assert.equal(
    resolucaoLeadBloqueiaInsercao_({ ok: false, reason: "phone_not_found" }),
    false,
  );
});

test("lead writes origin and destination into the live column positions", () => {
  const { writeLead_ } = loadCode();
  const writes = [];
  const sheet = {
    getRange(row, column, rows, columns) {
      return {
        setValue(value) {
          writes.push({ row, column, rows: 1, columns: 1, value });
        },
        setValues(values) {
          writes.push({ row, column, rows, columns, values });
        },
      };
    },
  };

  writeLead_(
    sheet,
    2,
    {
      messageId: "message-1",
      contactAt: new Date("2026-07-29T00:31:00.000Z"),
      reference: "M26F01W-C06H01",
      phone: "+5511987985578",
      platform: "Meta",
      gclid: "",
      gbraid: "",
      wbraid: "",
    },
    () => {},
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      writes.find((write) => write.column === 19)?.values,
    )),
    [["WHATSAPP", "Meta"]],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      writes.find((write) => write.column === 21)?.values,
    )),
    [["M26F01W", "C06H01", "", "WhatsApp", "M26F01W-C06H01"]],
  );
  assert.equal(
    writes.some(
      (write) =>
        write.column + (write.columns || 1) - 1 > 25,
    ),
    false,
  );
});

test("Meta site reference fills the canonical campaign and page fields", () => {
  const { decomporReferenciaAquisicao_ } = loadCode();

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      decomporReferenciaAquisicao_("M26F02S-avaliacao-facial"),
    )),
    {
      campaign: "M26F02S",
      creative: "",
      cta: "avaliacao-facial",
      reference: "M26F02S-avaliacao-facial",
    },
  );
});

test("Meta creative and CTA remain independently auditable", () => {
  const { decomporReferenciaAquisicao_ } = loadCode();

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      decomporReferenciaAquisicao_("M26O01W-DbHKuWfGP_N-OT02"),
    )),
    {
      campaign: "M26O01W",
      creative: "DbHKuWfGP_N",
      cta: "OT02",
      reference: "M26O01W-DbHKuWfGP_N-OT02",
    },
  );
});

test("a duplicate keeps the pending route state visible to the caller", () => {
  const { findProcessedEvent_ } = loadCode();
  const sheet = {
    getLastRow: () => 2,
    getRange(row, column, rows, columns) {
      if (row === 2 && column === 1 && rows === 1 && columns === 2) {
        return {
          createTextFinder: () => ({
            matchEntireCell: () => ({
              findNext: () => ({ getRow: () => 2 }),
            }),
          }),
        };
      }
      if (row === 2 && column === 5 && rows === 1 && columns === 5) {
        return {
          getDisplayValues: () => [[
            "",
            "route_pending",
            "",
            "unknown",
            "pending",
          ]],
        };
      }
      throw new Error(`Unexpected range ${row}:${column}:${rows}:${columns}`);
    },
  };

  const event = findProcessedEvent_(sheet, ["message-1"]);

  assert.equal(event.leadRow, null);
  assert.equal(event.result, "route_pending");
  assert.equal(event.routeStatus, "pending");
  assert.equal(event.professional, "unknown");
});

test("route recovery updates the existing event instead of appending another", () => {
  const { resolvePendingProcessedEvent_ } = loadCode();
  let update = null;
  const sheet = {
    getRange(row, column, rows, columns) {
      return {
        setValues(values) {
          update = { row, column, rows, columns, values };
        },
      };
    },
  };

  resolvePendingProcessedEvent_(
    sheet,
    628,
    127,
    "opp-amanda-1",
    "amanda",
    "resolved_by_open_opportunity",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(update)), {
    row: 628,
    column: 5,
    rows: 1,
    columns: 5,
    values: [[
      127,
      "route_recovered",
      "opp-amanda-1",
      "amanda",
      "resolved_by_open_opportunity",
    ]],
  });
});
