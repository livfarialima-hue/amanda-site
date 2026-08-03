import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function loadHelper() {
  const sandbox = { console, JSON, Math, Number, Object, Set, String };
  vm.runInNewContext(
    `${source}\nglobalThis.__helper = removerLinhasPorTelefone_;`,
    sandbox,
  );
  return sandbox.__helper;
}

test("removes every derived row for one external-professional phone", () => {
  const rows = [
    ["Telefone", "Status"],
    ["+5511999990000", "Novo"],
    ["+5511888880000", "Novo"],
    ["5511999990000", "Pendente"],
  ];
  const deleted = [];
  const sheet = {
    getLastRow() {
      return rows.length;
    },
    getLastColumn() {
      return rows[0].length;
    },
    getRange(row, column, rowCount, columnCount) {
      return {
        getDisplayValues() {
          return rows
            .slice(row - 1, row - 1 + rowCount)
            .map((values) =>
              values.slice(column - 1, column - 1 + columnCount),
            );
        },
      };
    },
    deleteRow(row) {
      deleted.push(row);
      rows.splice(row - 1, 1);
    },
  };

  assert.equal(
    loadHelper()(sheet, "+5511999990000"),
    2,
  );
  assert.deepEqual(deleted, [4, 2]);
  assert.deepEqual(rows, [
    ["Telefone", "Status"],
    ["+5511888880000", "Novo"],
  ]);
});
