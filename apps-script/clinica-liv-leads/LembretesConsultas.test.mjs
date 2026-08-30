import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("./LembretesConsultas.gs", import.meta.url),
  "utf8",
);

function formatDate(date, _timezone, format) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return format
    .replace("yyyy", parts.year)
    .replace("MM", parts.month)
    .replace("dd", parts.day)
    .replace("HH", parts.hour)
    .replace("H", String(Number(parts.hour)))
    .replace("mm", parts.minute);
}

const context = vm.createContext({
  Utilities: { formatDate },
  Date,
});

vm.runInContext(source, context, {
  filename: "LembretesConsultas.gs",
});

test("only active appointment statuses receive reminders", () => {
  assert.equal(
    context.statusPermiteLembreteConsulta_(
      "Consulta agendada",
    ),
    true,
  );
  assert.equal(
    context.statusPermiteLembreteConsulta_("Confirmada"),
    true,
  );
  assert.equal(
    context.statusPermiteLembreteConsulta_("Cancelada"),
    false,
  );
  assert.equal(
    context.statusPermiteLembreteConsulta_(
      "Consulta realizada",
    ),
    false,
  );
});

test("explicit refusal of contact blocks reminders", () => {
  assert.equal(
    context.consentimentoPermiteLembreteConsulta_(""),
    true,
  );
  assert.equal(
    context.consentimentoPermiteLembreteConsulta_("Sim"),
    true,
  );
  assert.equal(
    context.consentimentoPermiteLembreteConsulta_("Não"),
    false,
  );
});

test("the single reminder is due at 10am on the previous day", () => {
  const appointment = new Date("2026-07-30T14:00:00-03:00");

  assert.equal(
    context.definirTipoLembreteConsulta_({
      now: new Date("2026-07-29T09:59:00-03:00"),
      appointment,
      reminder48hSent: "",
      sameDaySent: "",
    }),
    "",
  );

  assert.equal(
    context.definirTipoLembreteConsulta_({
      now: new Date("2026-07-29T10:00:00-03:00"),
      appointment,
      reminder48hSent: "",
      sameDaySent: "",
    }),
    "48h",
  );
});

test("an appointment that already received the old 48h reminder gets no second reminder", () => {
  const appointment = new Date("2026-07-30T14:00:00-03:00");

  assert.equal(
    context.definirTipoLembreteConsulta_({
      now: new Date("2026-07-29T10:00:00-03:00"),
      appointment,
      reminder48hSent: new Date(),
      sameDaySent: "",
    }),
    "",
  );
});

test("an appointment that already received the old same-day reminder gets no new reminder", () => {
  const appointment = new Date("2026-07-30T14:00:00-03:00");

  assert.equal(
    context.definirTipoLembreteConsulta_({
      now: new Date("2026-07-29T10:00:00-03:00"),
      appointment,
      reminder48hSent: "",
      sameDaySent: new Date(),
    }),
    "",
  );
});

test("a reminder attempt is never repeated even when the delivery response was lost", () => {
  const appointment = new Date("2026-07-30T14:00:00-03:00");

  assert.equal(
    context.definirTipoLembreteConsulta_({
      now: new Date("2026-07-29T10:15:00-03:00"),
      appointment,
      reminder48hSent: "",
      sameDaySent: "",
      lastAttempt: new Date("2026-07-29T10:00:00-03:00"),
    }),
    "",
  );
});

test("all appointments use a 10am reminder on the previous day", () => {
  const appointment = new Date("2026-07-30T09:00:00-03:00");
  const target =
    context.horarioAlvoLembretePrincipalConsulta_(appointment);

  assert.equal(target.toISOString(), "2026-07-29T13:00:00.000Z");
});

test("a monitored appointment converted to Date by Sheets keeps the same key", () => {
  assert.equal(
    context.normalizarChaveAgendamentoMonitorado_(
      new Date("2026-08-11T16:00:00-03:00"),
    ),
    "2026-08-11 16:00",
  );
});

test("text representations of a monitored appointment keep a stable key", () => {
  assert.equal(
    context.normalizarChaveAgendamentoMonitorado_(
      "2026-08-11 16:00:00",
    ),
    "2026-08-11 16:00",
  );
  assert.equal(
    context.normalizarChaveAgendamentoMonitorado_(
      "11/08/2026, 16:00:00",
    ),
    "2026-08-11 16:00",
  );
});

test("only explicit patient confirmation is treated as confirmed", () => {
  assert.equal(
    context.statusIndicaConfirmacaoDaPaciente_(
      "Consulta confirmada",
    ),
    true,
  );
  assert.equal(
    context.statusIndicaConfirmacaoDaPaciente_("Confirmada"),
    false,
  );
});

test("reminder processing never operates overnight", () => {
  assert.equal(
    context.estaNoHorarioLembretesConsultas_(
      new Date("2026-07-28T11:59:59.000Z"),
    ),
    false,
  );
  assert.equal(
    context.estaNoHorarioLembretesConsultas_(
      new Date("2026-07-28T12:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    context.estaNoHorarioLembretesConsultas_(
      new Date("2026-07-28T22:00:00.000Z"),
    ),
    false,
  );
});

test("clinic reminder location includes address and Google Maps", () => {
  const location = context.formatarLocalLembreteConsulta_(
    "Clínica LIV Faria Lima",
  );

  assert.match(location, /Rua Pais Leme, 215/);
  assert.match(location, /maps\.google\.com/);
});

test("custom reminder locations are not replaced", () => {
  assert.equal(
    context.formatarLocalLembreteConsulta_("Teleconsulta"),
    "Teleconsulta",
  );
});

test("automatic reminders fail closed without a valid Brazilian E.164 phone", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        context.validarDadosPacienteLembreteConsulta_({
          phone: "",
          name: "Maria Silva",
        }),
      ),
    ),
    { ok: false, reason: "missing_valid_phone" },
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        context.validarDadosPacienteLembreteConsulta_({
          phone: "+5511999999999",
          name: "Maria Silva",
        }),
      ),
    ),
    {
      ok: true,
      phone: "+5511999999999",
      firstName: "Maria",
    },
  );
});

test("automatic reminders fail closed instead of inventing a patient name", () => {
  for (const name of ["", "Não informado", "Paciente"]) {
    const result =
      context.validarDadosPacienteLembreteConsulta_({
        phone: "+5511999999999",
        name,
      });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing_valid_name");
  }
  assert.equal(context.primeiroNomeLembretesConsultas_(""), "");
});

test("in-person reminders require a live Calendar link", () => {
  const result = context.validarVinculoAgendaLembreteConsulta_(
    {
      appointment: new Date("2026-09-02T14:00:00-03:00"),
      consultationType: "Primeira consulta",
      location: "Clínica LIV",
      calendarId: "",
      calendarEventId: "",
      calendarSyncStatus: "",
    },
    null,
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "calendar_link_missing");
});

test("an exact live Calendar event authorizes the reminder contract", () => {
  const calendarApp = {
    getCalendarById(calendarId) {
      assert.equal(calendarId, "calendar-1");
      return {
        getEventById(eventId) {
          assert.equal(eventId, "event-1");
          return {
            getStartTime: () =>
              new Date("2026-09-02T14:00:00-03:00"),
          };
        },
      };
    },
  };
  const result = context.validarVinculoAgendaLembreteConsulta_(
    {
      appointment: new Date("2026-09-02T14:00:00-03:00"),
      consultationType: "Primeira consulta",
      location: "Clínica LIV",
      calendarId: "calendar-1",
      calendarEventId: "event-1",
      calendarSyncStatus: "Sincronizado em 30/08/2026 12:00",
    },
    calendarApp,
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, "in_person");
});

test("a Calendar event moved to another time blocks the reminder", () => {
  const calendarApp = {
    getCalendarById: () => ({
      getEventById: () => ({
        getStartTime: () =>
          new Date("2026-09-02T15:00:00-03:00"),
      }),
    }),
  };
  const result = context.validarVinculoAgendaLembreteConsulta_(
    {
      appointment: new Date("2026-09-02T14:00:00-03:00"),
      location: "Clínica LIV",
      calendarId: "calendar-1",
      calendarEventId: "event-1",
      calendarSyncStatus: "Sincronizado em 30/08/2026 12:00",
    },
    calendarApp,
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "calendar_start_mismatch");
});

test("Calendar read errors and deleted events fail closed", () => {
  const base = {
    appointment: new Date("2026-09-02T14:00:00-03:00"),
    location: "Clínica LIV",
    calendarId: "calendar-1",
    calendarEventId: "event-1",
    calendarSyncStatus: "Sincronizado em 30/08/2026 12:00",
  };
  const missing = context.validarVinculoAgendaLembreteConsulta_(
    base,
    {
      getCalendarById: () => ({ getEventById: () => null }),
    },
  );
  const failed = context.validarVinculoAgendaLembreteConsulta_(
    base,
    {
      getCalendarById: () => {
        throw new Error("calendar unavailable");
      },
    },
  );

  assert.equal(missing.ok, false);
  assert.equal(missing.reason, "calendar_event_missing");
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, "calendar_read_failed");
});

test("only an explicitly synchronized remote appointment can omit Calendar", () => {
  const accepted = context.validarVinculoAgendaLembreteConsulta_(
    {
      appointment: new Date("2026-09-02T14:00:00-03:00"),
      consultationType: "Teleconsulta",
      location: "Teleconsulta",
      calendarSyncStatus: "Não se aplica — atendimento remoto",
    },
    null,
  );
  const incomplete = context.validarVinculoAgendaLembreteConsulta_(
    {
      appointment: new Date("2026-09-02T14:00:00-03:00"),
      consultationType: "Teleconsulta",
      location: "Teleconsulta",
      calendarSyncStatus: "",
    },
    null,
  );

  assert.equal(accepted.ok, true);
  assert.equal(accepted.mode, "remote");
  assert.equal(incomplete.ok, false);
  assert.equal(incomplete.reason, "remote_schedule_not_verified");
});

test("schedule verification happens before any reminder state write", () => {
  const start = source.indexOf(
    "function processarLembretesConsultasInterno_",
  );
  const end = source.indexOf(
    "function validarVinculoAgendaLembreteConsulta_",
  );
  const processor = source.slice(start, end);
  const verification = processor.indexOf(
    "validarVinculoAgendaLembreteConsulta_",
  );
  const monitoredWrite = processor.indexOf(
    "monitoredAppointmentRange.setValue",
  );
  const attemptReservation = processor.indexOf(
    "columns.lastAttempt + 1)\n      .setValue(now)",
  );

  assert.ok(verification >= 0);
  assert.ok(monitoredWrite > verification);
  assert.ok(attemptReservation > verification);
});

test("the safer reminder contract is default-off until coordinated activation", () => {
  assert.match(
    source,
    /safeContractProperty:\s*\n?\s*"LEMBRETES_CONSULTA_CONTRATO_SEGURO_ATIVO"/,
  );
  assert.match(source, /safe_contract_not_activated/);
  assert.match(
    source,
    /safeContractProperty[\s\S]*?"true"[\s\S]*?instalarGatilhoLembretesConsultas_/,
  );
});
