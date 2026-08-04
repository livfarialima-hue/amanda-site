import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./ConsultasSync.gs", import.meta.url),
  "utf8",
);

const CONSULTATION_HEADERS = [
  "ID da consulta",
  "Telefone (E.164)",
  "Nome do paciente",
  "Profissional",
  "Tipo de consulta",
  "Tema / procedimento",
  "Local / modalidade",
  "Data agendada",
  "Horário agendado",
  "Status",
];

function loadReservation({
  status = "Disponível",
  professional = "Dra. Amanda",
  room = "Sala 1",
} = {}) {
  const writes = [];
  const scheduleRows = [
    [
      "Data",
      "Dia",
      "Horário",
      "Status",
      "Profissional",
      "Observação",
      "Semana",
    ],
    [
      "04/08/2026",
      "Terça-feira",
      "10:00",
      status,
      professional,
      "",
      "03/08–08/08",
    ],
  ];
  const scheduleSheet = {
    getLastRow: () => 7,
    getRange(row, column, rowCount, columnCount) {
      if (row === 6 && column === 1 && rowCount === 2) {
        return {
          getDisplayValues: () => scheduleRows,
        };
      }

      return {
        setValue(value) {
          writes.push({ row, column, value });
        },
      };
    },
  };
  const consultationSheet = {
    getLastRow: () => 1,
    getLastColumn: () => CONSULTATION_HEADERS.length,
    getRange() {
      return {
        getDisplayValues: () => [CONSULTATION_HEADERS],
        getValues: () => [CONSULTATION_HEADERS],
      };
    },
    setColumnWidth() {},
  };
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "Datas Consulta") return scheduleSheet;
      if (name === "Consultas") return consultationSheet;
      return null;
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
    CONFIG: {
      appointmentSlotsSheetName: "Datas Consulta",
      appointmentSlotsHeaderRow: 6,
      appointmentSlotsColumns: 7,
    },
    findScheduleColumn_(headers, expected) {
      return headers.indexOf(expected);
    },
    SpreadsheetApp: {
      openById: () => spreadsheet,
      flush() {},
    },
    Utilities: {
      formatDate(date, _timezone, pattern) {
        if (pattern === "yyyy-MM-dd") {
          return date.toISOString().slice(0, 10);
        }
        return "29/07/2026 21:00";
      },
    },
  };

  vm.runInNewContext(source, sandbox);
  sandbox.garantirEstruturaSincronizacaoConsultas_ = () => {};
  sandbox.localizarConsultaExistente_ = () => null;
  sandbox.escolherSalaDisponivelConsulta_ = () => ({
    ok: true,
    room,
    durationMinutes: 60,
  });
  sandbox.sincronizarConsultaComAgendaNaLinha_ = () => ({
    ok: true,
    room,
  });
  sandbox.upsertConsulta_ = (_sheet, input) => ({
    ok: true,
    row: 2,
    appointmentId: input.appointmentId,
  });
  sandbox.atualizarStatusLeadDaConsulta_ = (
    _spreadsheet,
    _phone,
    _professional,
    leadStatus,
  ) => {
    writes.push({ leadStatus });
  };

  return {
    reserve: sandbox.reservarHorarioEAgendarConsulta_,
    writes,
  };
}

test("atomically blocks the selected slot and schedules the consultation", () => {
  const { reserve, writes } = loadReservation();
  const result = reserve({
    appointmentId: "whatsapp-selection-1",
    phone: "+5511900000000",
    name: "Maria Silva",
    professional: "Dra. Amanda",
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
  });

  assert.equal(result.ok, true);
  assert.equal(result.reserved, true);
  assert.equal(result.scheduledDate, "2026-08-04");
  assert.equal(result.scheduledTime, "10:00");
  assert.equal(result.room, "Sala 1");
  assert.deepEqual(
    writes.find((write) => write.column === 4),
    { row: 7, column: 4, value: "Bloqueado" },
  );
  assert.equal(
    writes.some(
      (write) => write.leadStatus === "Consulta agendada",
    ),
    true,
  );
});

test("refuses a slot that is no longer available", () => {
  const { reserve, writes } = loadReservation({
    status: "Bloqueado",
  });
  const result = reserve({
    appointmentId: "whatsapp-selection-2",
    phone: "+5511900000000",
    professional: "Dra. Amanda",
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: false,
    error: "slot_not_available",
  });
  assert.equal(writes.length, 0);
});

test("blocks a Daniel slot and assigns Sala 2", () => {
  const { reserve, writes } = loadReservation({
    professional: "Dr. Daniel",
    room: "Sala 2",
  });
  const result = reserve({
    appointmentId: "whatsapp-daniel-1",
    phone: "+5511900000001",
    name: "Paciente Daniel",
    professional: "Dr. Daniel",
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
  });

  assert.equal(result.ok, true);
  assert.equal(result.reserved, true);
  assert.equal(result.room, "Sala 2");
  assert.equal(
    writes.some(
      (write) => write.leadStatus === "Consulta agendada",
    ),
    true,
  );
});

test("refuses WhatsApp appointment automation for other professionals", () => {
  const { reserve, writes } = loadReservation();
  const result = reserve({
    appointmentId: "whatsapp-external-1",
    phone: "+5511900000002",
    professional: "Dra. Marina",
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: false,
    error: "unsupported_professional",
  });
  assert.equal(writes.length, 0);
});
