import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("./ConsultasSync.gs", import.meta.url),
  "utf8",
);
const context = {
  Date,
  Math,
  Number,
  Object,
  Set,
  String,
  console,
  Utilities: {
    formatDate(date, _timezone, format) {
      const pad = (value) => String(value).padStart(2, "0");
      const parts = {
        yyyy: date.getUTCFullYear(),
        MM: pad(date.getUTCMonth() + 1),
        dd: pad(date.getUTCDate()),
        HH: pad(date.getUTCHours()),
        mm: pad(date.getUTCMinutes()),
        H: date.getUTCHours(),
      };
      return format.replace(
        /yyyy|MM|dd|HH|mm|H/g,
        (token) => parts[token],
      );
    },
  },
};

vm.createContext(context);
vm.runInContext(source, context, {
  filename: "ConsultasSync.gs",
});

test("recognizes only scheduling and completed statuses", () => {
  assert.equal(
    context.statusAgendaConsulta_("consulta agendada"),
    true,
  );
  assert.equal(
    context.statusAgendaConsulta_("consulta realizada"),
    true,
  );
  assert.equal(context.statusAgendaConsulta_("novo"), false);
});

test("post-consult queue is limited to completed consultations", () => {
  assert.equal(
    context.statusConsultaRealizada_("consulta realizada"),
    true,
  );
  assert.equal(
    context.statusConsultaRealizada_("consulta agendada"),
    false,
  );
});

test("normalizes Brazilian phone numbers and refuses short values", () => {
  assert.equal(
    context.normalizarTelefoneConsultasSync_(
      "(11) 99999-9999",
    ),
    "+11999999999",
  );
  assert.equal(
    context.normalizarTelefoneConsultasSync_("1234"),
    "",
  );
});

test("uses the care window and blocks nighttime sends", () => {
  assert.equal(
    context.estaNoHorarioConsultasSync_(
      new Date("2026-07-28T10:00:00Z"),
    ),
    true,
  );
  assert.equal(
    context.estaNoHorarioConsultasSync_(
      new Date("2026-07-28T20:00:00Z"),
    ),
    false,
  );
});

test("deduplication helpers compare normalized date and time", () => {
  assert.equal(
    context.mesmaDataConsulta_(
      "30/07/2026",
      "2026-07-30",
    ),
    true,
  );
  assert.equal(
    context.mesmoHorarioConsulta_("9:30", "09:30"),
    true,
  );
});

test("maps headers despite invisible spacing and punctuation changes", () => {
  const columns = context.mapearCabecalhosConsultas_([
    "ID da consulta",
    "Telefone (E.164)",
    "Profissional",
    "Status",
  ]);

  assert.equal(columns["Telefone (E.164)"], 1);
});

test("classifies the patient journey without exposing clinical detail", () => {
  assert.equal(
    context.classificarEstadoRelacionamentoPaciente_({
      status: "Consulta agendada",
      context: "",
      now: new Date("2026-07-30T12:00:00Z"),
    }),
    "appointment_scheduled",
  );
  assert.equal(
    context.classificarEstadoRelacionamentoPaciente_({
      status: "Consulta realizada",
      context: "aguardando orçamento do hospital",
      completedAt: new Date("2026-07-29T12:00:00Z"),
      now: new Date("2026-07-30T12:00:00Z"),
    }),
    "surgical_planning",
  );
  assert.equal(
    context.classificarEstadoRelacionamentoPaciente_({
      status: "Consulta realizada",
      context: "",
      completedAt: new Date("2025-07-29T12:00:00Z"),
      now: new Date("2026-07-30T12:00:00Z"),
    }),
    "former_patient",
  );
});

test("classifies only the operational type of a pending task", () => {
  assert.equal(
    context.classificarPendenciaRelacionamentoPaciente_(
      "Confirmar valor do hospital",
    ),
    "quote_or_price",
  );
  assert.equal(
    context.classificarPendenciaRelacionamentoPaciente_(
      "Aguardar laudo e exames",
    ),
    "documents_or_exams",
  );
});
