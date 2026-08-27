import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./ConsultasSync.gs", import.meta.url),
  "utf8",
);

function formatDate(date, _timezone, pattern) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return pattern.replace(
    /yyyy|MM|dd|HH|H|mm/g,
    (token) => ({
      yyyy: values.year,
      MM: values.month,
      dd: values.day,
      HH: values.hour,
      H: String(Number(values.hour)),
      mm: values.minute,
    })[token],
  );
}

function loadContext() {
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    Utilities: { formatDate },
    SpreadsheetApp: { flush() {} },
  });
  vm.runInContext(source, context, { filename: "ConsultasSync.gs" });
  return context;
}

test("commercial review is due exactly 15 local days later at 11:30", () => {
  const context = loadContext();
  const dueAt = context.calcularRevisaoComercialEm_(
    new Date("2026-08-05T14:00:00-03:00"),
  );

  assert.equal(
    formatDate(dueAt, "America/Sao_Paulo", "yyyy-MM-dd HH:mm"),
    "2026-08-20 11:30",
  );
});

test("completed consultation prepares a pending commercial review without patient outreach", () => {
  const context = loadContext();
  const headers = [
    "Status",
    "Data realizada",
    "Revisão comercial prevista em",
    "Resultado comercial",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const row = [
    "Consulta realizada",
    new Date("2026-08-05T14:00:00-03:00"),
    "",
    "",
  ];
  const writes = [];
  const sheet = {
    getRange(rowNumber, column) {
      return {
        setValue(value) {
          writes.push({ rowNumber, column, value });
        },
      };
    },
  };
  const result = context.prepararRevisaoComercialNaLinha_(
    sheet,
    2,
    columns,
    row,
    new Date("2026-08-05T15:00:00-03:00"),
  );

  assert.equal(result.ok, true);
  assert.equal(result.prepared, true);
  assert.equal(result.pending, true);
  assert.equal(
    writes.some((write) =>
      write.column === 4 && write.value === "Pendente"
    ),
    true,
  );
  const dueWrite = writes.find((write) => write.column === 3);
  assert.equal(
    formatDate(
      dueWrite.value,
      "America/Sao_Paulo",
      "yyyy-MM-dd HH:mm",
    ),
    "2026-08-20 11:30",
  );
});

function createFunnel(existing = {}) {
  const headers = [
    "Opportunity ID",
    "Data do contato",
    "Plataforma",
    "Campanha",
    "Criativo",
    "CTA",
    "Destino",
    "Situação atual",
    "Data situação atual",
    "Data qualificação",
    "Data agendamento",
    "Data consulta realizada",
    "Data fechamento",
    "Valor contratado (R$)",
    "Primeira resposta humana",
    "Minutos até 1ª resposta",
    "Follow-up realizado?",
    "Data/hora follow-up",
    "Motivo de não avanço",
    "Observação comercial",
  ];
  const row = Array(headers.length).fill("");
  row[0] = "opp_test_1";
  if (existing.closedAt) row[12] = existing.closedAt;
  if (existing.closedValue !== undefined) row[13] = existing.closedValue;
  if (existing.reason !== undefined) row[18] = existing.reason;
  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getLastColumn: () => headers.length,
    getRange(rowNumber, column, _rowCount, columnCount) {
      if (rowNumber === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      if (rowNumber === 2 && column === 1 && columnCount === 1) {
        return {
          createTextFinder(value) {
            return {
              matchEntireCell() { return this; },
              findNext() {
                return value === row[0] ? { getRow: () => 2 } : null;
              },
            };
          },
        };
      }
      if (rowNumber === 2 && column === 1) {
        return { getValues: () => [row] };
      }
      return {
        setValue(value) {
          row[column - 1] = value;
          writes.push({ rowNumber, column, value });
          return this;
        },
        setNumberFormat() { return this; },
      };
    },
  };
  return { sheet, row, writes };
}

test("confirmed closure fills protected funnel fields without overwriting unrelated data", () => {
  const context = loadContext();
  const funnel = createFunnel();
  const spreadsheet = {
    getSheetByName: (name) =>
      name === "Funil Comercial" ? funnel.sheet : null,
  };
  const closedAt = new Date("2026-08-18T12:00:00-03:00");
  const result = context.sincronizarRevisaoComercialNoFunil_(
    spreadsheet,
    {
      opportunityId: "opp_test_1",
      outcome: "Procedimento fechado",
      closedProcedure: "Procedimento confirmado pela equipe",
      closedAt,
      closedValue: 25000,
      notes: "Registro sintético de teste",
    },
  );

  assert.equal(result.ok, true);
  assert.equal(funnel.row[12], closedAt);
  assert.equal(funnel.row[13], 25000);
  assert.match(funnel.row[19], /Procedimento fechado/);
  assert.match(funnel.row[19], /Registro sintético de teste/);
});

test("commercial review fails closed on a conflicting existing value", () => {
  const context = loadContext();
  const funnel = createFunnel({
    closedAt: new Date("2026-08-18T12:00:00-03:00"),
    closedValue: 24000,
  });
  const spreadsheet = {
    getSheetByName: (name) =>
      name === "Funil Comercial" ? funnel.sheet : null,
  };
  const result = context.sincronizarRevisaoComercialNoFunil_(
    spreadsheet,
    {
      opportunityId: "opp_test_1",
      outcome: "Procedimento fechado",
      closedProcedure: "Procedimento confirmado pela equipe",
      closedAt: new Date("2026-08-18T12:00:00-03:00"),
      closedValue: 25000,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "conflicting_closed_value");
  assert.equal(funnel.row[13], 24000);
});

test("a later closure clears only the automatic non-advance placeholder", () => {
  const context = loadContext();
  const funnel = createFunnel({ reason: "Não fechou" });
  const spreadsheet = {
    getSheetByName: (name) =>
      name === "Funil Comercial" ? funnel.sheet : null,
  };
  const result = context.sincronizarRevisaoComercialNoFunil_(
    spreadsheet,
    {
      opportunityId: "opp_test_1",
      outcome: "Procedimento fechado",
      closedProcedure: "Procedimento confirmado pela equipe",
      closedAt: new Date("2026-08-25T12:00:00-03:00"),
      closedValue: 25000,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(funnel.row[18], "");
});

test("a fully confirmed closure advances the CRM and completes the D+15 task", () => {
  const context = loadContext();
  const headers = [
    "Status",
    "Data realizada",
    "Revisão comercial prevista em",
    "Resultado comercial",
    "Procedimento fechado",
    "Data do fechamento",
    "Valor fechado (R$)",
    "Próxima revisão comercial",
    "Revisão comercial concluída em",
    "Observação comercial",
    "Erro da revisão comercial",
    "Opportunity ID",
    "Telefone (E.164)",
    "Profissional",
  ];
  const columns = context.mapearCabecalhosConsultas_(headers);
  const row = [
    "Consulta realizada",
    new Date("2026-08-05T14:00:00-03:00"),
    new Date("2026-08-20T11:30:00-03:00"),
    "Procedimento fechado",
    "Procedimento confirmado pela equipe",
    new Date("2026-08-18T12:00:00-03:00"),
    25000,
    "",
    "",
    "Registro sintético de teste",
    "",
    "opp_test_1",
    "+5511900000102",
    "Dra. Amanda",
  ];
  const funnel = createFunnel();
  const consultationSheet = {
    getLastColumn: () => headers.length,
    getRange(rowNumber, column, _rowCount, columnCount) {
      if (rowNumber === 2 && column === 1 && columnCount === headers.length) {
        return { getValues: () => [row] };
      }
      return {
        setValue(value) {
          row[column - 1] = value;
          return this;
        },
      };
    },
  };
  const spreadsheet = {
    getSheetByName: (name) =>
      name === "Funil Comercial" ? funnel.sheet : null,
  };
  const stages = [];
  const events = [];
  context.sincronizarFaseOportunidadeELead_ = (_spreadsheet, input) => {
    stages.push(input);
    return {
      ok: true,
      changed: true,
      opportunityId: input.opportunityId,
      previousStage: "Consulta realizada",
      stage: "Paciente convertido",
    };
  };
  context.recordLeadStageEvent_ = (_spreadsheet, event) => {
    events.push(event);
  };
  const completedAt = new Date("2026-08-20T12:00:00-03:00");
  const result = context.processarRevisaoComercialNaLinha_(
    spreadsheet,
    consultationSheet,
    2,
    columns,
    row,
    completedAt,
  );

  assert.equal(result.ok, true);
  assert.equal(result.completed, true);
  assert.equal(stages.length, 1);
  assert.equal(stages[0].stage, "Paciente convertido");
  assert.equal(events.length, 1);
  assert.equal(events[0].decision, "human_override");
  assert.equal(row[8], completedAt);
  assert.equal(row[10], "");
});
