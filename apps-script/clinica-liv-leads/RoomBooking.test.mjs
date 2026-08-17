import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("./RoomBooking.gs", import.meta.url),
  "utf8",
);
const formSource = fs.readFileSync(
  new URL("./RoomBookingForm.html", import.meta.url),
  "utf8",
);

const TEST_ACCESS_TOKEN = "room-booking-test-token";
const FUTURE_APPOINTMENT_DATE = (() => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 7);
  while (date.getDay() !== 3) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
})();
const TEST_ACCESS_TOKEN_HASH = crypto
  .createHash("sha256")
  .update(TEST_ACCESS_TOKEN)
  .digest("hex");

function loadRoomBooking({ available = true } = {}) {
  const writes = [];
  const event = {
    deleted: false,
    getId: () => "calendar-event-1",
    deleteEvent() {
      this.deleted = true;
    },
  };
  const lock = {
    locked: false,
    tryLock() {
      this.locked = true;
      return true;
    },
    hasLock() {
      return this.locked;
    },
    releaseLock() {
      this.locked = false;
    },
  };
  const sheet = {
    getLastColumn: () => 10,
    getRange: () => ({
      getDisplayValues: () => [["ID da consulta"]],
    }),
  };
  const context = {
    console,
    Date,
    Number,
    Object,
    String,
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet }),
      flush() {},
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, value) {
        return [...crypto.createHash("sha256").update(value).digest()]
          .map((byte) => (byte > 127 ? byte - 256 : byte));
      },
      formatDate(date, _timezone, format) {
        if (format === "dd/MM/yyyy") return "05/08/2026";
        return "03/08/2026 20:00";
      },
      getUuid: () => "11111111-2222-3333-4444-555555555555",
    },
    CONSULTAS_SYNC_CONFIG: {
      spreadsheetId: "sheet-1",
      consultationsSheetName: "Consultas",
      timezone: "America/Sao_Paulo",
    },
    CONSULTAS_SYNC_HEADERS: {
      id: "id",
      name: "name",
      professional: "professional",
      room: "room",
      consultationType: "type",
      topic: "topic",
      location: "location",
      scheduledDate: "date",
      scheduledTime: "time",
      durationMinutes: "duration",
      status: "status",
      source: "source",
      notes: "notes",
      calendarId: "calendarId",
      calendarEventId: "calendarEventId",
      calendarSyncStatus: "calendarSyncStatus",
      calendarSyncError: "calendarSyncError",
    },
    chaveProfissionalConsulta_(value) {
      const match = String(value || "")
        .toLowerCase()
        .match(/amanda|henrique|marina|laerte|matheus|daniel/);
      return match ? match[0] : "";
    },
    extrairDataConsultasSync_: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "",
    extrairHorarioConsultasSync_: (value) => /^\d{2}:\d{2}$/.test(value) ? value : "",
    intervaloConsultaAgenda_(date, time, duration) {
      if (!date || !time) return null;
      const start = new Date(`${date}T${time}:00-03:00`);
      return {
        start,
        end: new Date(start.getTime() + duration * 60000),
      };
    },
    escolherSalaDisponivelConsulta_() {
      if (!available) return { ok: false, error: "room_not_available" };
      return {
        ok: true,
        room: "Sala 2",
        calendarId: "calendar-2",
        start: new Date("2026-08-05T10:00:00-03:00"),
        end: new Date("2026-08-05T11:00:00-03:00"),
        calendar: { createEvent: () => event },
      };
    },
    garantirEstruturaSincronizacaoConsultas_() {},
    mapearCabecalhosConsultas_: () => ({}),
    primeiraLinhaLivreConsultas_: () => 2,
    definirValorConsulta_(_sheet, row, _columns, header, value) {
      writes.push({ row, header, value });
    },
    textoConsultasSync_: (value, maximum) => String(value || "").slice(0, maximum),
  };

  vm.createContext(context);
  vm.runInContext(
    source.replace(
      /accessTokenSha256:\s*\n?\s*"[a-f0-9]{64}"/,
      `accessTokenSha256: "${TEST_ACCESS_TOKEN_HASH}"`,
    ),
    context,
    { filename: "RoomBooking.gs" },
  );
  return { context, writes, event, lock };
}

test("accepts only the private booking link", () => {
  const { context } = loadRoomBooking();
  assert.equal(
    context.tokenFormularioReservaSalasValido_(
      TEST_ACCESS_TOKEN,
    ),
    true,
  );
  assert.equal(
    context.tokenFormularioReservaSalasValido_("wrong-link"),
    false,
  );
});

test("allows every professional configured for the room form", () => {
  const { context } = loadRoomBooking();
  assert.equal(
    context.profissionalFormularioReservaSalas_("Dra. Amanda"),
    "Dra. Amanda",
  );
  assert.equal(
    context.profissionalFormularioReservaSalas_("Dr. Henrique"),
    "Dr. Henrique",
  );
  assert.equal(
    context.profissionalFormularioReservaSalas_("Dr. Daniel"),
    "Dr. Daniel",
  );
  assert.equal(
    context.profissionalFormularioReservaSalas_("Matheus (ortop)"),
    "Matheus (ortop)",
  );
  assert.equal(
    context.profissionalFormularioReservaSalas_("Outra pessoa"),
    "",
  );
});

test("shows Matheus in the room form with the fixed Sala 2 rule", () => {
  assert.match(
    formSource,
    /<option value="Matheus \(ortop\)">Matheus \(ortop\)<\/option>/,
  );
  assert.match(
    formSource,
    /"Matheus \(ortop\)": "Reserva sempre na Sala 2\."/,
  );
});

test("creates the calendar event and records the reservation", () => {
  const { context, writes, event, lock } = loadRoomBooking();
  const result = context.reservarSalaPeloFormulario({
    accessToken: TEST_ACCESS_TOKEN,
    professional: "Dra. Marina",
    scheduledDate: FUTURE_APPOINTMENT_DATE,
    scheduledTime: "10:00",
    durationMinutes: 60,
    patientName: "Paciente Exemplo",
    consultationType: "Primeira consulta",
    notes: "Retorno",
  });

  assert.equal(result.ok, true);
  assert.equal(result.room, "Sala 2");
  assert.equal(event.deleted, false);
  assert.equal(lock.locked, false);
  assert.equal(
    writes.some(({ header, value }) =>
      header === "name" && value === "Paciente Exemplo"),
    true,
  );
  assert.equal(
    writes.some(({ header, value }) =>
      header === "type" && value === "Primeira consulta"),
    true,
  );
  assert.equal(
    writes.some(({ header, value }) =>
      header === "source" && value === "WhatsApp direto"),
    true,
  );
  assert.equal(
    writes.some(({ header, value }) =>
      header === "calendarEventId" && value === "calendar-event-1"),
    true,
  );
});

test("does not write when no room is available", () => {
  const { context, writes, lock } = loadRoomBooking({ available: false });
  const result = context.reservarSalaPeloFormulario({
    accessToken: TEST_ACCESS_TOKEN,
    professional: "Dr. Laerte",
    scheduledDate: FUTURE_APPOINTMENT_DATE,
    scheduledTime: "10:00",
    durationMinutes: 60,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "room_not_available");
  assert.equal(writes.length, 0);
  assert.equal(lock.locked, false);
});
