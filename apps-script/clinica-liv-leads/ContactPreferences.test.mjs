import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./ContactPreferences.gs", import.meta.url),
  "utf8",
);

function loadContext() {
  const context = vm.createContext({
    Array,
    Boolean,
    JSON,
    Math,
    Number,
    Object,
    String,
    console,
    SpreadsheetApp: {
      newDataValidation: () => ({
        requireCheckbox() {
          return this;
        },
        setAllowInvalid() {
          return this;
        },
        build() {
          return {};
        },
      }),
    },
  });
  vm.runInContext(source, context, {
    filename: "ContactPreferences.gs",
  });
  return context;
}

function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getMaxRows: () => rows.length,
    getRange(row, column, rowCount, columnCount) {
      const requestedRows = rowCount ?? 1;
      const requestedColumns = columnCount ?? 1;
      const values = rows
        .slice(row - 1, row - 1 + requestedRows)
        .map((sourceRow) =>
          sourceRow.slice(
            column - 1,
            column - 1 + requestedColumns,
          ),
        );
      return {
        getDisplayValues: () => values,
        getValues: () => values,
        getDisplayValue: () => values[0][0],
        setValue(value) {
          rows[row - 1][column - 1] = value;
          return this;
        },
        setDataValidation() {
          return this;
        },
        setNote() {
          return this;
        },
      };
    },
  };
}

test("reads independent permanent contact preferences by phone", () => {
  const context = loadContext();
  const rows = [
    [
      "Telefone (E.164)",
      "Nunca retomar",
      "Nunca responder com robô",
      "Motivo / observação do bloqueio",
    ],
    [
      "+55 11 99999-0000",
      true,
      false,
      "Pediu para não receber retomadas.",
    ],
  ];
  const sheet = fakeSheet(rows);
  const spreadsheet = {
    getSheetByName: () => sheet,
  };

  const result = context.obterPreferenciasContatoLeads_(
    spreadsheet,
    "11999990000",
  );

  assert.equal(result.found, true);
  assert.equal(result.neverFollowUp, true);
  assert.equal(result.neverBotReply, false);
  assert.match(result.blockReason, /retomadas/);
});

test("unknown phone defaults to no block", () => {
  const context = loadContext();
  const sheet = fakeSheet([
    [
      "Telefone (E.164)",
      "Nunca retomar",
      "Nunca responder com robô",
    ],
    ["+5511999990000", true, true],
  ]);
  const result = context.obterPreferenciasContatoLeads_(
    { getSheetByName: () => sheet },
    "+5511888880000",
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    {
      found: false,
      neverFollowUp: false,
      neverBotReply: false,
      suspendAutomaticFollowUp: false,
      blockReason: "",
    },
  );
});

test("bulk map uses the same normalized E.164 key", () => {
  const context = loadContext();
  const sheet = fakeSheet([
    [
      "Telefone (E.164)",
      "Nunca retomar",
      "Nunca responder com robô",
    ],
    ["(11) 98888-0000", false, "Sim"],
  ]);
  const result = context.carregarPreferenciasContatoPorTelefone_(sheet);

  assert.equal(result["+5511988880000"].neverBotReply, true);
  assert.equal(result["+5511988880000"].neverFollowUp, false);
});

test("marks Never follow up on the matching Leads row", () => {
  const context = loadContext();
  const rows = [
    [
      "Telefone (E.164)",
      "Nunca retomar",
      "Nunca responder com robô",
      "Suspender retomada automática",
      "Motivo / observação do bloqueio",
    ],
    ["+55 11 97777-0000", false, false, false, ""],
  ];
  const sheet = fakeSheet(rows);
  const result = context.marcarNuncaRetomarPorTelefone_(
    { getSheetByName: () => sheet },
    "11977770000",
    "Cancelado pela agenda diária",
  );

  assert.equal(result.ok, true);
  assert.equal(result.alreadyBlocked, false);
  assert.equal(rows[1][1], true);
  assert.equal(rows[1][4], "Cancelado pela agenda diária");
});
