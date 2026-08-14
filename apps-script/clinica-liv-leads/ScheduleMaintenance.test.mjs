import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("./ScheduleMaintenance.gs", import.meta.url),
  "utf8",
);

function loadMaintenance(rows) {
  const writes = [];
  const sheet = {
    getLastRow() {
      return rows.length + 5;
    },
    getRange(row, column, rowCount, columnCount) {
      if (row === 6 && column === 1) {
        assert.equal(columnCount, 7);
        return {
          getDisplayValues() {
            return rows.slice(0, rowCount);
          },
        };
      }
      return {
        setValue(value) {
          writes.push({ row, column, value });
        },
      };
    },
  };
  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    SpreadsheetApp: { flush() {} },
  };
  vm.createContext(context);
  vm.runInContext(source, context, {
    filename: "ScheduleMaintenance.gs",
  });
  return {
    context,
    spreadsheet: {
      getSheetByName(name) {
        return name === "Datas Consulta" ? sheet : null;
      },
    },
    writes,
  };
}

const HEADERS = [
  "Data",
  "Dia",
  "Horário",
  "Status",
  "Profissional",
  "Observação",
  "Semana",
];

test("expires only past slots that are still available", () => {
  const rows = [
    HEADERS,
    ["13/08/2026", "Quinta", "10:00", "Disponível", "Amanda", "", ""],
    ["14/08/2026", "Sexta", "14:00", "Disponível", "Daniel", "", ""],
    ["14/08/2026", "Sexta", "16:00", "Disponível", "Amanda", "", ""],
    ["12/08/2026", "Quarta", "09:00", "Reservado", "Amanda", "", ""],
    ["inválida", "", "09:00", "Disponível", "Amanda", "", ""],
  ];
  const { context, spreadsheet, writes } = loadMaintenance(rows);
  const result = context.expirarHorariosPassadosInterno_(
    spreadsheet,
    new Date("2026-08-14T15:00:00-03:00"),
    { apply: true },
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: true,
    applied: true,
    inspected: 5,
    expired: 2,
    remainingPastAvailable: 0,
  });
  assert.deepEqual(writes, [
    { row: 7, column: 4, value: "Indisponível" },
    { row: 8, column: 4, value: "Indisponível" },
  ]);
});

test("dry run is non-mutating and reports every expired slot", () => {
  const rows = [
    HEADERS,
    ["01/08/2026", "Sábado", "09:00", "Disponível", "Amanda", "", ""],
  ];
  const { context, spreadsheet, writes } = loadMaintenance(rows);
  const result = context.expirarHorariosPassadosInterno_(
    spreadsheet,
    new Date("2026-08-14T15:00:00-03:00"),
    { apply: false },
  );

  assert.equal(result.expired, 1);
  assert.equal(result.remainingPastAvailable, 1);
  assert.deepEqual(writes, []);
});

test("the expiration plan fails closed when a required column is absent", () => {
  const { context } = loadMaintenance([]);
  assert.throws(
    () => context.planejarExpiracaoHorariosPassados_([
      ["Data", "Horário"],
    ], new Date()),
    /Estrutura inesperada/,
  );
});
