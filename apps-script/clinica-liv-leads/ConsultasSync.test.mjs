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

test("assigns fixed rooms and keeps Marina and Laerte flexible", () => {
  assert.deepEqual(
    Array.from(context.salasPermitidasProfissional_("Dra. Amanda")),
    ["Sala 1"],
  );
  assert.deepEqual(
    Array.from(context.salasPermitidasProfissional_("Dr. Henrique")),
    ["Sala 2"],
  );
  assert.deepEqual(
    Array.from(context.salasPermitidasProfissional_("Dr. Daniel")),
    ["Sala 2"],
  );
  assert.deepEqual(
    Array.from(context.salasPermitidasProfissional_("Dra. Marina")),
    ["Sala 1", "Sala 2"],
  );
  assert.deepEqual(
    Array.from(context.salasPermitidasProfissional_("Dr. Laerte")),
    ["Sala 1", "Sala 2"],
  );
});

test("WhatsApp appointment automation is limited to Amanda and Daniel", () => {
  assert.equal(
    context.profissionalPermitidoAutomacaoConsulta_("Dra. Amanda"),
    true,
  );
  assert.equal(
    context.profissionalPermitidoAutomacaoConsulta_("Dr. Daniel"),
    true,
  );
  assert.equal(
    context.profissionalPermitidoAutomacaoConsulta_("Dr. Henrique"),
    false,
  );
  assert.equal(
    context.profissionalPermitidoAutomacaoConsulta_("Dra. Marina"),
    false,
  );
});

test("uses the other room for a flexible professional when the first is busy", () => {
  let calendarReads = 0;
  context.CalendarApp = {
    getCalendarById() {
      calendarReads += 1;
      return {
        getEvents() {
          return calendarReads === 1
            ? [{ getId: () => "busy-event" }]
            : [];
        },
      };
    },
  };

  const result = context.escolherSalaDisponivelConsulta_({
    professional: "Dra. Marina",
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
  });

  assert.equal(result.ok, true);
  assert.equal(result.room, "Sala 2");
});

test("writes consultation statuses using the visible dropdown vocabulary", () => {
  assert.equal(
    context.statusCanonicoConsultas_("Consulta agendada"),
    "Agendada",
  );
  assert.equal(
    context.statusCanonicoConsultas_("Consulta confirmada"),
    "Confirmada",
  );
  assert.equal(
    context.statusCanonicoConsultas_("Reagendamento solicitado"),
    "Remarcada",
  );
  assert.equal(
    context.statusCanonicoConsultas_("Não compareceu"),
    "Não compareceu",
  );
});

test("maps classified administrative outcomes to consultation rows", () => {
  assert.equal(
    context.statusConsultaDoMarcoClassificado_("confirmed"),
    "Confirmada",
  );
  assert.equal(
    context.statusConsultaDoMarcoClassificado_("missed"),
    "Não compareceu",
  );
  assert.equal(
    context.statusConsultaDoMarcoClassificado_("attended"),
    "Realizada",
  );
  assert.equal(context.statusConsultaDoMarcoClassificado_("none"), "");
});

test("maps consultation vocabulary to canonical lead phases", () => {
  assert.equal(
    context.statusCanonicoLeadDaConsulta_("Confirmada"),
    "Consulta agendada",
  );
  assert.equal(
    context.statusCanonicoLeadDaConsulta_("Remarcada"),
    "Consulta agendada",
  );
  assert.equal(
    context.statusCanonicoLeadDaConsulta_("Realizada"),
    "Consulta realizada",
  );
  assert.equal(
    context.statusCanonicoLeadDaConsulta_("Cancelada"),
    "",
  );
  assert.equal(
    context.statusCanonicoLeadDaConsulta_("Não compareceu"),
    "",
  );
});

test("treats no-show as a closed appointment without calling it completed", () => {
  assert.equal(
    context.statusNaoCompareceuConsulta_("Não compareceu"),
    true,
  );
  assert.equal(
    context.statusConsultaEncerrada_("Não compareceu"),
    true,
  );
  assert.equal(
    context.statusConsultaRealizada_("Não compareceu"),
    false,
  );
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

test("historical Drive imports require explicit contact permission", () => {
  assert.equal(
    context.consentimentoPermiteContatoConsultas_(
      "",
      "Prontuário Google Drive",
    ),
    false,
  );
  assert.equal(
    context.consentimentoPermiteContatoConsultas_(
      "Não informado",
      "Prontuário Google Drive",
    ),
    false,
  );
  assert.equal(
    context.consentimentoPermiteContatoConsultas_(
      "Sim",
      "Prontuário Google Drive",
    ),
    true,
  );
  assert.equal(
    context.consentimentoPermiteContatoConsultas_(
      "",
      "WhatsApp / atendimento atual",
    ),
    true,
  );
});

test("post-consult recency rejects historical and future dates", () => {
  const now = new Date("2026-07-30T15:00:00Z");

  assert.equal(
    context.validarRecenciaPosConsulta_(
      new Date("2026-07-29T15:00:00Z"),
      now,
    ).ok,
    true,
  );
  assert.equal(
    context.validarRecenciaPosConsulta_(
      new Date("2026-07-20T15:00:00Z"),
      now,
    ).reason,
    "historical_completed_at",
  );
  assert.equal(
    context.validarRecenciaPosConsulta_(
      new Date("2026-07-31T15:00:00Z"),
      now,
    ).reason,
    "future_completed_at",
  );
});

test("eligibility accepts only recent due operational records", () => {
  const headers = [
    "Status",
    "Data realizada",
    "Consentimento para contato",
    "Origem do registro",
    "Pós-consulta elegível em",
    "Pós-consulta enviado",
    "Pós-consulta suprimido em",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const now = new Date("2026-07-30T15:00:00Z");
  const recentRow = [
    "Consulta realizada",
    new Date("2026-07-30T11:00:00Z"),
    "",
    "WhatsApp / atendimento atual",
    new Date("2026-07-30T14:00:00Z"),
    "",
    "",
  ];

  assert.equal(
    context.avaliarElegibilidadePosConsulta_(
      recentRow,
      columns,
      now,
    ).eligible,
    true,
  );

  const importedRow = [...recentRow];
  importedRow[3] = "Prontuário Google Drive";
  assert.equal(
    context.avaliarElegibilidadePosConsulta_(
      importedRow,
      columns,
      now,
    ).reason,
    "consent_not_confirmed",
  );
});

test("preparation never queues an unconsented Drive import", () => {
  const headers = [
    "Data realizada",
    "Consentimento para contato",
    "Origem do registro",
    "Pós-consulta elegível em",
    "Pós-consulta enviado",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const row = [
    new Date("2026-07-30T11:00:00Z"),
    "",
    "Prontuário Google Drive",
    "",
    "",
  ];
  let writes = 0;
  const sheet = {
    getRange() {
      writes += 1;
      return {
        setValue() {},
      };
    },
  };

  const result = context.prepararPosConsultaNaLinha_(
    sheet,
    2,
    columns,
    row,
    new Date("2026-07-30T15:00:00Z"),
  );

  assert.equal(result.queued, false);
  assert.equal(result.reason, "consent_not_confirmed");
  assert.equal(writes, 0);
});

test("no-show follow-up is eligible only when due and consented", () => {
  const headers = [
    "Status",
    "Não comparecimento registrado em",
    "Retomada de ausência elegível em",
    "Retomada de ausência enviada",
    "Retomada de ausência suprimida em",
    "Consentimento para contato",
    "Origem do registro",
    "Erro na retomada de ausência",
    "Última tentativa de retomada de ausência",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const now = new Date("2026-08-04T15:00:00Z");
  const row = [
    "Não compareceu",
    new Date("2026-08-04T12:00:00Z"),
    new Date("2026-08-04T14:00:00Z"),
    "",
    "",
    "Sim",
    "WhatsApp / atendimento atual",
    "",
    "",
  ];

  assert.equal(
    context.avaliarElegibilidadeRetomadaNaoComparecimento_(
      row,
      columns,
      now,
    ).eligible,
    true,
  );

  const imported = [...row];
  imported[5] = "";
  imported[6] = "Prontuário Google Drive";
  assert.equal(
    context.avaliarElegibilidadeRetomadaNaoComparecimento_(
      imported,
      columns,
      now,
    ).reason,
    "consent_not_confirmed",
  );
});

test("no-show message is empathetic and names Daniel naturally", () => {
  const headers = ["Nome do paciente", "Profissional"];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const message = context.mensagemRetomadaNaoComparecimento_(
    ["Carlos Silva", "Dr. Daniel"],
    columns,
  );

  assert.match(message, /Oi, Carlos\./);
  assert.match(message, /esperamos que esteja tudo bem/);
  assert.match(message, /com o Dr\. Daniel/);
  assert.doesNotMatch(message, /faltou|penalidade|cobrança/i);
});

test("counts no-shows per phone and professional", () => {
  const headers = ["Telefone (E.164)", "Profissional", "Status"];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const rows = [
    ["+5511999990000", "Dra. Amanda", "Não compareceu"],
    ["+5511999990000", "Dra. Amanda", "Não compareceu"],
    ["+5511999990000", "Dr. Daniel", "Não compareceu"],
    ["+5511999990000", "Dra. Amanda", "Realizada"],
  ];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => headers.length,
    getRange: () => ({ getValues: () => rows }),
  };

  assert.equal(
    context.contarNaoComparecimentosConsulta_(
      sheet,
      columns,
      "+5511999990000",
      "Dra. Amanda",
    ),
    2,
  );
});

test("sends the first no-show care message only inside the open WhatsApp window", () => {
  const headers = [
    "ID da consulta",
    "Telefone (E.164)",
    "Nome do paciente",
    "Profissional",
    "Status",
    "Consentimento para contato",
    "Origem do registro",
    "Não comparecimento registrado em",
    "Retomada de ausência elegível em",
    "Retomada de ausência enviada",
    "Retomada de ausência suprimida em",
    "Última tentativa de retomada de ausência",
    "Erro na retomada de ausência",
    "Retomada manual de ausência sugerida em",
    "Última interação humana",
    "Próxima ação",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const row = [
    "consulta-99",
    "+5511999990099",
    "Luciana Silva",
    "Dra. Amanda",
    "Não compareceu",
    "Sim",
    "WhatsApp / atendimento atual",
    new Date("2026-08-04T12:00:00Z"),
    new Date("2026-08-04T14:00:00Z"),
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getLastColumn: () => headers.length,
    getParent: () => ({}),
    getRange(rowNumber, columnNumber, rowCount) {
      if (rowCount) return { getValues: () => [row] };
      return {
        setValue(value) {
          writes.push({ rowNumber, columnNumber, value });
        },
      };
    },
  };
  let delivered = 0;
  context.enviarRetomadaNaoComparecimento_ = () => {
    delivered += 1;
    return { ok: true, sent: true };
  };
  context.registrarMensagemNaoComparecimento_ = () => {};

  const result = context.processarRetomadaNaoComparecimentoNaLinha_(
    sheet,
    2,
    columns,
    row,
    new Date("2026-08-04T15:00:00Z"),
    "secret",
    { getProperty: () => "" },
    {},
    [
      {
        direcao: "IN",
        dataHora: new Date("2026-08-04T11:30:00Z"),
        texto: "Confirmado",
      },
    ],
  );

  assert.equal(result.sent, true);
  assert.equal(delivered, 1);
  assert.equal(
    writes.some(
      (write) =>
        write.columnNumber ===
        columns["Retomada de ausência enviada"] + 1,
    ),
    true,
  );
});

test("moves a no-show follow-up to the manual email when the WhatsApp window is closed", () => {
  const headers = [
    "ID da consulta",
    "Telefone (E.164)",
    "Nome do paciente",
    "Profissional",
    "Status",
    "Consentimento para contato",
    "Origem do registro",
    "Não comparecimento registrado em",
    "Retomada de ausência elegível em",
    "Retomada de ausência enviada",
    "Retomada de ausência suprimida em",
    "Última tentativa de retomada de ausência",
    "Erro na retomada de ausência",
    "Retomada manual de ausência sugerida em",
    "Última interação humana",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const row = [
    "consulta-100",
    "+5511999990100",
    "Marina Silva",
    "Dra. Amanda",
    "Não compareceu",
    "Sim",
    "WhatsApp / atendimento atual",
    new Date("2026-08-04T12:00:00Z"),
    new Date("2026-08-04T14:00:00Z"),
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getLastColumn: () => headers.length,
    getParent: () => ({}),
    getRange(rowNumber, columnNumber, rowCount) {
      if (rowCount) return { getValues: () => [row] };
      return {
        setValue(value) {
          writes.push({ rowNumber, columnNumber, value });
        },
      };
    },
  };

  const result = context.processarRetomadaNaoComparecimentoNaLinha_(
    sheet,
    2,
    columns,
    row,
    new Date("2026-08-04T15:00:00Z"),
    "secret",
    { getProperty: () => "" },
    {},
    [],
  );

  assert.equal(result.manual, true);
  assert.equal(result.reason, "whatsapp_window_closed_manual");
  assert.equal(
    writes.some(
      (write) =>
        write.columnNumber ===
        columns["Retomada manual de ausência sugerida em"] + 1,
    ),
    true,
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

test("maps legacy headers that were saved with UTF-8 mojibake", () => {
  const columns = context.mapearCabecalhosConsultas_([
    "Telefone (E.164)",
    "SituaÃ§Ã£o do lead",
    "Data da situaÃ§Ã£o",
  ]);

  assert.equal(columns["Situação do lead"], 1);
  assert.equal(columns["Data da situação"], 2);
});

test("record origin prefers the lead origin over sync metadata", () => {
  const columns = context.mapearCabecalhosConsultas_([
    "Fonte da sincronização",
    "Origem do lead",
  ]);

  assert.equal(columns["Origem do registro"], 1);
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
