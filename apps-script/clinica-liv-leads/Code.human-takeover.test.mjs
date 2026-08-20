import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function loadCode() {
  const rows = [];
  const takeoverSheet = {
    getLastRow: () => rows.length + 1,
    getRange(row, column, rowCount, columnCount) {
      return {
        getDisplayValues() {
          return rows
            .slice(row - 2, row - 2 + rowCount)
            .map((entry) =>
              entry.slice(
                column - 1,
                column - 1 + columnCount,
              ),
            );
        },
        setValues() {},
      };
    },
    appendRow(values) {
      rows.push(values);
    },
    setFrozenRows() {},
    hideSheet() {},
  };
  const spreadsheet = {
    getSheetByName(name) {
      return name === "_WHATSAPP_ATENDIMENTO_HUMANO"
        ? takeoverSheet
        : null;
    },
    insertSheet() {
      return takeoverSheet;
    },
  };
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    SpreadsheetApp: {
      openById: () => spreadsheet,
      flush() {},
    },
    Utilities: {
      formatDate(_date, _timezone, pattern) {
        return pattern === "yyyy-MM-dd"
          ? "2026-07-29"
          : "29/07/2026";
      },
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__test = {
  registrarAtendimentoHumano_,
  houveAtendimentoHumanoNoDia_,
};`,
    sandbox,
  );

  return {
    ...sandbox.__test,
    spreadsheet,
    rows,
  };
}

test("records a human takeover once and detects it on the same local day", () => {
  const {
    registrarAtendimentoHumano_,
    houveAtendimentoHumanoNoDia_,
    spreadsheet,
    rows,
  } = loadCode();
  const input = {
    eventId: "echo-event",
    messageId: "echo-message",
    phone: "+55 11 90000-0000",
    takenAt: "2026-07-29T20:00:00-03:00",
    text: "Resposta humana contextual ".repeat(40),
  };
  const created = registrarAtendimentoHumano_(input);
  const duplicate = registrarAtendimentoHumano_(input);

  assert.deepEqual(JSON.parse(JSON.stringify(created)), {
    ok: true,
    marked: true,
    created: true,
    duplicate: false,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(duplicate)), {
    ok: true,
    marked: true,
    created: false,
    duplicate: true,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0][5], input.text.trim());
  assert.equal(rows[0][5].length > 500, true);
  assert.equal(
    houveAtendimentoHumanoNoDia_(
      spreadsheet,
      "+5511900000000",
      new Date("2026-07-29T21:00:00-03:00"),
    ),
    true,
  );
});
