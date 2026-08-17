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
  CONFIG: CONSULTAS_SYNC_CONFIG,
  HEADERS: CONSULTAS_SYNC_HEADERS,
  CALENDAR_TRIGGER_HEADERS: CONSULTAS_SYNC_CALENDAR_TRIGGER_HEADERS,
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

test("creates an Amanda procedure only in Sala 1 without patient data", () => {
  const { context, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.id,
    HEADERS.opportunityId,
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
    [HEADERS.opportunityId]: "opp-amanda-1",
    [HEADERS.phone]: "+5511999999999",
    [HEADERS.name]: "Paciente Privada",
    [HEADERS.professional]: "Dra. Amanda",
    [HEADERS.consultationType]: "Procedimento",
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
  assert.equal(created[0].title, "Procedimento — Dra. Amanda");
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

test("does not call Calendar or write when the Opportunity ID is absent", () => {
  const { context, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.opportunityId,
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
    [HEADERS.professional]: "Dra. Amanda",
    [HEADERS.room]: "Sala 2",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.status]: "Cancelada",
    [HEADERS.calendarId]: "calendar-2",
    [HEADERS.calendarEventId]: "calendar-event-2",
  });
  const writes = [];
  let calendarCalls = 0;
  context.CalendarApp = {
    getCalendarById() {
      calendarCalls += 1;
      throw new Error("Calendar must not be called");
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    3,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "missing_or_invalid_opportunity_id");
  assert.equal(calendarCalls, 0);
  assert.deepEqual(writes, []);
});

test("keeps statuses outside the calendar allowlist as an explicit no-op", () => {
  const { context, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.opportunityId,
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
    [HEADERS.opportunityId]: "opp-daniel-1",
    [HEADERS.professional]: "Dr. Daniel",
    [HEADERS.room]: "Sala 2",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.status]: "Remarcada",
    [HEADERS.calendarId]: "calendar-2",
    [HEADERS.calendarEventId]: "calendar-event-2",
  });
  const writes = [];
  let calendarCalls = 0;
  context.CalendarApp = {
    getCalendarById() {
      calendarCalls += 1;
      throw new Error("Calendar must not be called");
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    3,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "status_not_calendar_eligible");
  assert.equal(calendarCalls, 0);
  assert.deepEqual(writes, []);
});

test("removes linked Calendar events for cancelled and no-show consultations", () => {
  for (const scenario of [
    { status: "Cancelada", reason: "consultation_cancelled" },
    { status: "Não compareceu", reason: "consultation_no_show" },
  ]) {
    const { context, CONFIG, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
      loadCalendarSync();
    const headers = [
      HEADERS.opportunityId,
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
      [HEADERS.opportunityId]: "opp-daniel-1",
      [HEADERS.professional]: "Dr. Daniel",
      [HEADERS.room]: "Sala 2",
      [HEADERS.scheduledDate]: "2026-08-04",
      [HEADERS.scheduledTime]: "10:00",
      [HEADERS.status]: scenario.status,
      [HEADERS.calendarId]: CONFIG.roomCalendars["Sala 2"],
      [HEADERS.calendarEventId]: "calendar-event-2",
    });
    const writes = [];
    let deleted = 0;
    context.CalendarApp = {
      getCalendarById(calendarId) {
        assert.equal(
          calendarId,
          CONFIG.roomCalendars["Sala 2"],
          scenario.status,
        );
        return {
          getEventById(eventId) {
            assert.equal(eventId, "calendar-event-2", scenario.status);
            return {
              deleteEvent() {
                deleted += 1;
              },
            };
          },
        };
      },
    };

    const result = sincronizarConsultaComAgendaNaLinha_(
      writableSheet(row, writes),
      4,
      mapearCabecalhosConsultas_(headers),
      row,
    );

    assert.equal(result.ok, true, scenario.status);
    assert.equal(result.removed, true, scenario.status);
    assert.equal(result.reason, scenario.reason, scenario.status);
    assert.equal(deleted, 1, scenario.status);
    assert.equal(
      row[headers.indexOf(HEADERS.calendarId)],
      "",
      scenario.status,
    );
    assert.equal(
      row[headers.indexOf(HEADERS.calendarEventId)],
      "",
      scenario.status,
    );
  }
});

test("Opportunity ID is a Calendar synchronization trigger", () => {
  const { HEADERS, CALENDAR_TRIGGER_HEADERS } = loadCalendarSync();

  assert.equal(
    Array.from(CALENDAR_TRIGGER_HEADERS).includes(HEADERS.opportunityId),
    true,
  );
});

test("does not remove a linked event when room and professional do not match", () => {
  const { context, CONFIG, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.opportunityId,
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
    [HEADERS.opportunityId]: "opp-daniel-1",
    [HEADERS.professional]: "Dr. Daniel",
    [HEADERS.room]: "Sala 1",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.status]: "Cancelada",
    [HEADERS.calendarId]: CONFIG.roomCalendars["Sala 1"],
    [HEADERS.calendarEventId]: "calendar-event-1",
  });
  const writes = [];
  let calendarCalls = 0;
  context.CalendarApp = {
    getCalendarById() {
      calendarCalls += 1;
      throw new Error("Calendar must not be called");
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    6,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "invalid_room_or_calendar_link");
  assert.equal(calendarCalls, 0);
  assert.deepEqual(writes, []);
});

test("does not call Calendar when professional, date, or time is incomplete or invalid", () => {
  const cases = [
    {
      label: "missing professional",
      patch: { professional: "" },
      reason: "invalid_professional",
    },
    {
      label: "unknown professional",
      patch: { professional: "Profissional desconhecido" },
      reason: "invalid_professional",
    },
    {
      label: "missing date",
      patch: { scheduledDate: "" },
      reason: "incomplete_or_invalid_schedule",
    },
    {
      label: "invalid date",
      patch: { scheduledDate: "2026-02-30" },
      reason: "incomplete_or_invalid_schedule",
    },
    {
      label: "missing time",
      patch: { scheduledTime: "" },
      reason: "incomplete_or_invalid_schedule",
    },
    {
      label: "invalid time",
      patch: { scheduledTime: "25:00" },
      reason: "incomplete_or_invalid_schedule",
    },
  ];

  for (const scenario of cases) {
    const { context, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
      loadCalendarSync();
    const headers = [
      HEADERS.opportunityId,
      HEADERS.professional,
      HEADERS.scheduledDate,
      HEADERS.scheduledTime,
      HEADERS.durationMinutes,
      HEADERS.status,
      HEADERS.calendarSyncStatus,
      HEADERS.calendarSyncError,
    ];
    const values = {
      opportunityId: "opp-amanda-1",
      professional: "Dra. Amanda",
      scheduledDate: "2026-08-04",
      scheduledTime: "10:00",
      durationMinutes: 60,
      status: "Confirmada",
      ...scenario.patch,
    };
    const row = buildRow(headers, {
      [HEADERS.opportunityId]: values.opportunityId,
      [HEADERS.professional]: values.professional,
      [HEADERS.scheduledDate]: values.scheduledDate,
      [HEADERS.scheduledTime]: values.scheduledTime,
      [HEADERS.durationMinutes]: values.durationMinutes,
      [HEADERS.status]: values.status,
    });
    const writes = [];
    let calendarCalls = 0;
    context.CalendarApp = {
      getCalendarById() {
        calendarCalls += 1;
        throw new Error("Calendar must not be called");
      },
    };

    const result = sincronizarConsultaComAgendaNaLinha_(
      writableSheet(row, writes),
      4,
      mapearCabecalhosConsultas_(headers),
      row,
    );

    assert.equal(result.ok, true, scenario.label);
    assert.equal(result.skipped, true, scenario.label);
    assert.equal(result.reason, scenario.reason, scenario.label);
    assert.equal(calendarCalls, 0, scenario.label);
    assert.deepEqual(writes, [], scenario.label);
  }
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

test("removes the previous room event before completing a move to remote care", () => {
  const { context, CONFIG, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.opportunityId,
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
    [HEADERS.opportunityId]: "opp-amanda-remote-success",
    [HEADERS.professional]: "Dra. Amanda",
    [HEADERS.room]: "Sala 1",
    [HEADERS.consultationType]: "Teleconsulta",
    [HEADERS.location]: "Videochamada",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.durationMinutes]: 60,
    [HEADERS.status]: "Confirmada",
    [HEADERS.calendarId]: CONFIG.roomCalendars["Sala 1"],
    [HEADERS.calendarEventId]: "old-room-event",
  });
  const writes = [];
  let deleted = 0;
  context.CalendarApp = {
    getCalendarById(calendarId) {
      assert.equal(calendarId, CONFIG.roomCalendars["Sala 1"]);
      return {
        getEventById(eventId) {
          assert.equal(eventId, "old-room-event");
          return {
            deleteEvent() {
              deleted += 1;
            },
          };
        },
      };
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    8,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.equal(result.remote, true);
  assert.equal(deleted, 1);
  assert.equal(row[headers.indexOf(HEADERS.room)], "");
  assert.equal(row[headers.indexOf(HEADERS.calendarId)], "");
  assert.equal(row[headers.indexOf(HEADERS.calendarEventId)], "");
});

test("preserves the room link when moving to remote care cannot delete the old event", () => {
  const { context, CONFIG, HEADERS, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    loadCalendarSync();
  const headers = [
    HEADERS.opportunityId,
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
  const oldCalendarId = CONFIG.roomCalendars["Sala 1"];
  const row = buildRow(headers, {
    [HEADERS.opportunityId]: "opp-amanda-remote-failure",
    [HEADERS.professional]: "Dra. Amanda",
    [HEADERS.room]: "Sala 1",
    [HEADERS.consultationType]: "Teleconsulta",
    [HEADERS.location]: "Videochamada",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.durationMinutes]: 60,
    [HEADERS.status]: "Confirmada",
    [HEADERS.calendarId]: oldCalendarId,
    [HEADERS.calendarEventId]: "missing-room-event",
  });
  const writes = [];
  context.CalendarApp = {
    getCalendarById: () => ({ getEventById: () => null }),
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, writes),
    9,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "calendar_event_not_found");
  assert.equal(row[headers.indexOf(HEADERS.room)], "Sala 1");
  assert.equal(row[headers.indexOf(HEADERS.calendarId)], oldCalendarId);
  assert.equal(
    row[headers.indexOf(HEADERS.calendarEventId)],
    "missing-room-event",
  );
});

function buildCrossCalendarMoveScenario(overrides = {}) {
  const loaded = loadCalendarSync();
  const { CONFIG, HEADERS } = loaded;
  const headers = [
    HEADERS.opportunityId,
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
    [HEADERS.opportunityId]: "opp-marina-move",
    [HEADERS.professional]: "Dra. Marina",
    [HEADERS.room]: "Sala 1",
    [HEADERS.consultationType]: "Consulta presencial",
    [HEADERS.location]: "ClÃ­nica LIV Faria Lima",
    [HEADERS.scheduledDate]: "2026-08-04",
    [HEADERS.scheduledTime]: "10:00",
    [HEADERS.durationMinutes]: 60,
    [HEADERS.status]: "Confirmada",
    [HEADERS.calendarId]: CONFIG.roomCalendars["Sala 1"],
    [HEADERS.calendarEventId]: "old-room-event",
    ...overrides,
  });
  return { ...loaded, headers, row };
}

test("deletes the old Calendar event before creating a cross-calendar replacement", () => {
  const { context, CONFIG, HEADERS, headers, row, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    buildCrossCalendarMoveScenario();
  const actions = [];
  const roomOneCalendar = {
    getEvents: () => [
      { getId: () => "old-room-event" },
      { getId: () => "blocking-event" },
    ],
    getEventById: () => ({
      deleteEvent() {
        actions.push("delete-old");
      },
    }),
  };
  const roomTwoCalendar = {
    getEvents: () => [],
    createEvent() {
      actions.push("create-new");
      return { getId: () => "new-room-event" };
    },
  };
  context.CalendarApp = {
    getCalendarById(calendarId) {
      return calendarId === CONFIG.roomCalendars["Sala 1"]
        ? roomOneCalendar
        : roomTwoCalendar;
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, []),
    10,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(actions, ["delete-old", "create-new"]);
  assert.equal(row[headers.indexOf(HEADERS.room)], "Sala 2");
  assert.equal(
    row[headers.indexOf(HEADERS.calendarId)],
    CONFIG.roomCalendars["Sala 2"],
  );
  assert.equal(row[headers.indexOf(HEADERS.calendarEventId)], "new-room-event");
});

test("does not create a cross-calendar replacement when deleting the old event fails", () => {
  const { context, CONFIG, HEADERS, headers, row, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    buildCrossCalendarMoveScenario();
  let createCalls = 0;
  context.CalendarApp = {
    getCalendarById(calendarId) {
      if (calendarId === CONFIG.roomCalendars["Sala 1"]) {
        return {
          getEvents: () => [
            { getId: () => "old-room-event" },
            { getId: () => "blocking-event" },
          ],
          getEventById: () => null,
        };
      }
      return {
        getEvents: () => [],
        createEvent() {
          createCalls += 1;
          return { getId: () => "must-not-exist" };
        },
      };
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, []),
    11,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "calendar_event_not_found");
  assert.equal(createCalls, 0);
  assert.equal(row[headers.indexOf(HEADERS.room)], "Sala 1");
  assert.equal(
    row[headers.indexOf(HEADERS.calendarId)],
    CONFIG.roomCalendars["Sala 1"],
  );
  assert.equal(row[headers.indexOf(HEADERS.calendarEventId)], "old-room-event");
});

test("clears the confirmed-deleted old link when cross-calendar creation then fails", () => {
  const { context, CONFIG, HEADERS, headers, row, mapearCabecalhosConsultas_, sincronizarConsultaComAgendaNaLinha_ } =
    buildCrossCalendarMoveScenario();
  let deleted = 0;
  context.CalendarApp = {
    getCalendarById(calendarId) {
      if (calendarId === CONFIG.roomCalendars["Sala 1"]) {
        return {
          getEvents: () => [
            { getId: () => "old-room-event" },
            { getId: () => "blocking-event" },
          ],
          getEventById: () => ({
            deleteEvent() {
              deleted += 1;
            },
          }),
        };
      }
      return {
        getEvents: () => [],
        createEvent() {
          throw new Error("new_calendar_create_failed");
        },
      };
    },
  };

  const result = sincronizarConsultaComAgendaNaLinha_(
    writableSheet(row, []),
    12,
    mapearCabecalhosConsultas_(headers),
    row,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "new_calendar_create_failed");
  assert.equal(deleted, 1);
  assert.equal(row[headers.indexOf(HEADERS.calendarId)], "");
  assert.equal(row[headers.indexOf(HEADERS.calendarEventId)], "");
});
