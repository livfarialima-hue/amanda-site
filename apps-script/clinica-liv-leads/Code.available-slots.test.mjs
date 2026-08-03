import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function loadCode(rows, now = "2026-07-29T14:00:00-03:00") {
  const writes = [];
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }

    static now() {
      return new RealDate(now).getTime();
    }
  }
  const sheet = {
    getLastRow() {
      return rows.length + 5;
    },
    getRange(row, column, rowCount, columnCount) {
      if (row !== 6) {
        return {
          setValue(value) {
            writes.push({ row, column, value });
          },
        };
      }

      assert.equal(column, 1);
      assert.equal(columnCount, 7);

      return {
        getDisplayValues() {
          return rows.slice(0, rowCount);
        },
      };
    },
  };
  const sandbox = {
    console,
    Date: FixedDate,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName(name) {
            return name === "Datas Consulta" ? sheet : null;
          },
        };
      },
      flush() {},
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__test = {
  CONFIG,
  getAvailableAppointmentSlots_,
  parseScheduleDateTime_,
};`,
    sandbox,
  );

  return { ...sandbox.__test, writes };
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

test("returns only future available slots for the requested professional", () => {
  const rows = [
    HEADERS,
    [
      "29/07/2026",
      "Quarta-feira",
      "10:00",
      "Disponível",
      "Dra. Amanda",
      "",
      "27/07–01/08",
    ],
    [
      "29/07/2026",
      "Quarta-feira",
      "16:00",
      "Disponível",
      "Dra. Amanda",
      "",
      "27/07–01/08",
    ],
    [
      "30/07/2026",
      "Quinta-feira",
      "",
      "Bloqueado",
      "Dra. Amanda",
      "Dia bloqueado",
      "27/07–01/08",
    ],
    [
      "31/07/2026",
      "Sexta-feira",
      "09:00",
      "Disponível",
      "Dr. Daniel",
      "",
      "27/07–01/08",
    ],
  ];
  const { getAvailableAppointmentSlots_, writes } = loadCode(rows);
  const slots = getAvailableAppointmentSlots_({
    professional: "amanda",
    limit: 50,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(slots)), [
    {
      date: "29/07/2026",
      day: "Quarta-feira",
      time: "16:00",
      professional: "Dra. Amanda",
    },
  ]);
  assert.deepEqual(writes, [
    { row: 7, column: 4, value: "Indisponível" },
  ]);
});

test("normalizes single-digit times and honors the requested limit", () => {
  const rows = [
    HEADERS,
    [
      "03/08/2026",
      "Segunda-feira",
      "8:00",
      "Disponível",
      "Dra. Amanda",
      "",
      "03/08–08/08",
    ],
    [
      "03/08/2026",
      "Segunda-feira",
      "10:00",
      "Disponível",
      "Dra. Amanda",
      "",
      "03/08–08/08",
    ],
  ];
  const { getAvailableAppointmentSlots_ } = loadCode(rows);
  const slots = getAvailableAppointmentSlots_({
    professional: "amanda",
    limit: 1,
  });

  assert.equal(slots.length, 1);
  assert.equal(slots[0].time, "08:00");
});
