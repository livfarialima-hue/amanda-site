import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./ConsultasSync.gs", import.meta.url),
  "utf8",
);

function loadCalendarSync() {
  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    Utilities: {
      formatDate() {
        return "04/08/2026 09:00";
      },
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__calendarTest = {
  HEADERS: CONSULTAS_SYNC_HEADERS,
  mapearCabecalhosConsultas_,
  sincronizarConsultaComAgendaNaLinha_,
  nomePlanilhaLeadProfissional_,
};`,
    context,
  );

  return { context, ...context.__calendarTest };
}

function buildRow(headers, values) {
  return headers.map((header) => values[header] ?? "");
}

function writableSheet(row, writes) {
  return {
    getRange(rowNumber, columnNumber) {
      return {
        setValue(value) {
          row[columnNumber - 1] = value;
          writes.push({ row: rowNumber, column: columnNumber, value });
        },
      };
    },
  };
}

test("creates an Amanda event only in Sala 1 without patient data", () => {
  const { context, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.id,
    HEADERS.phone,
    HEADERS.name,
    HEADERS.professional,
    HEADERS.room,
    HEADERS.consultationType,
    HEADERS.location,
    HEADERS.scheduledDate,
    HEADERS.scheduledTime,
    HEADERS.durationMinutes,
    HEADERS.status,
    HEADERS.calendarId,
    HEADERS.calendarEventId,
    HEADERS.calendarSyncStatus,
    HEADERS.calendarSyncError,
  ];
  const row = buildRow(headers, {
    [HEADERS.id]: "appointment-1",
    [HEADERS.phone]: "+5511999999999",
    [HEADERS.name]: "Paciente Privada",
    [HEADERS.professional]: "Dra. Amanda",
    [HEADERS.consultationType]: "Consulta presencial",
    [HEADERS.location]: "Clínica LIV Faria Lima",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.status]: "Agendada",
  });
  const writes = [];
  const created = [];
  const calendar = {
    getEvents: () => [],
    getEventById: () => null,
    createEvent(title, start, end, options) {
      created.push({ title, start, end, options });
      return { getId: () => "calendar-event-1" };
    },
  };
  context.CalendarApp = {
    getCalendarById: () => calendar,
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    2,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.equal(result.room, "Sala 1");
  assert.equal(created.length, 1);
  assert.equal(created[0].title, "Consulta — Dra. Amanda");
  assert.equal(created[0].options.location.endsWith("Sala 1"), true);
  assert.equal(
    JSON.stringify(created[0]).includes("Paciente Privada"),
    false,
  );
  assert.equal(
    writes.some((write) => write.value === "calendar-event-1"),
    true,
  );
});

test("deletes the Google event when the consultation is cancelled", () => {
  const { context, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.professional,
    HEADERS.room,
    HEADERS.scheduledDate,
    HEADERS.scheduledTime,
    HEADERS.status,
    HEADERS.calendarId,
    HEADERS.calendarEventId,
    HEADERS.calendarSyncStatus,
    HEADERS.calendarSyncError,
  ];
  const row = buildRow(headers, {
    [HEADERS.professional]: "Dr. Daniel",
    [HEADERS.room]: "Sala 2",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.status]: "Cancelada",
    [HEADERS.calendarId]: "calendar-2",
    [HEADERS.calendarEventId]: "calendar-event-2",
  });
  const writes = [];
  let deleted = 0;
  context.CalendarApp = {
    getCalendarById: () => ({
      getEventById: () => ({
        deleteEvent() {
          deleted += 1;
        },
      }),
    }),
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    3,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.equal(result.cancelled, true);
  assert.equal(deleted, 1);
  assert.equal(
    writes.some(
      (write) =>
        write.column === headers.indexOf(HEADERS.calendarEventId) + 1 &&
        write.value === "",
    ),
    true,
  );
});

test("keeps external professionals out of Amanda and Daniel lead tabs", () => {
  const { nomePlanilhaLeadProfissional_ } = loadCalendarSync();

  assert.equal(
    nomePlanilhaLeadProfissional_("Dra. Amanda"),
    "Google Ads - Conversões",
  );
  assert.equal(
    nomePlanilhaLeadProfissional_("Dr. Daniel"),
    "Leads Dr. Daniel",
  );
  assert.equal(nomePlanilhaLeadProfissional_("Dr. Henrique"), "");
  assert.equal(nomePlanilhaLeadProfissional_("Dra. Marina"), "");
  assert.equal(nomePlanilhaLeadProfissional_("Dr. Laerte"), "");
});
