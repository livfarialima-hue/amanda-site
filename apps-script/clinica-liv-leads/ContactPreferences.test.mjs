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
    getRange(row, column, rowCount, columnCount) {
      const values = rows
        .slice(row - 1, row - 1 + rowCount)
        .map((sourceRow) =>
          sourceRow.slice(column - 1, column - 1 + columnCount),
        );
      return {
        getDisplayValues: () => values,
        getValues: () => values,
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
