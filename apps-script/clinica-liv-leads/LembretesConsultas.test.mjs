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
