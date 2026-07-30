import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("./CentralAtendimento.gs", import.meta.url),
  "utf8",
);

function loadContext() {
  const context = {
    console,
    Date,
    Number,
    Object,
    Set,
    Array,
    String,
    Math,
    JSON,
    Utilities: {
      formatDate(date, _timezone, format) {
        const parts = {
          yyyy: String(date.getFullYear()),
          MM: String(date.getMonth() + 1).padStart(2, "0"),
          dd: String(date.getDate()).padStart(2, "0"),
          H: String(date.getHours()),
          m: String(date.getMinutes()),
        };
        if (format === "yyyy-MM-dd") {
          return `${parts.yyyy}-${parts.MM}-${parts.dd}`;
        }
        if (format === "H") return parts.H;
        if (format === "m") return parts.m;
        return `${parts.yyyy}-${parts.MM}-${parts.dd}`;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, {
    filename: "CentralAtendimento.gs",
  });
  return context;
}

test("prioritizes overdue commitments over other queues", () => {
  const context = loadContext();
  const overdue = context.criarItemCentral_({
    queue: "Pendência vencida",
    phone: "+5511999999999",
    nextAction: "Confirmar orçamento",
  });
  const reply = context.criarItemCentral_({
    queue: "Resposta agora",
    phone: "+5511999999999",
    nextAction: "Responder mensagem",
  });
  const items = {};

  context.adicionarItemCentral_(items, reply);
  context.adicionarItemCentral_(items, overdue);

  assert.equal(
    items["+5511999999999"].queue,
    "Pendência vencida",
  );
  assert.match(
    items["+5511999999999"].context,
    /Também previsto: Responder mensagem/,
  );
});

test("price questions create a direct operational suggestion", () => {
  const context = loadContext();
  const suggestion = context.sugerirRespostaCentral_(
    "Qual é o valor da cirurgia?",
    "Marina Silva",
    "new_lead",
  );

  assert.match(suggestion, /^Oi, Marina!/);
  assert.match(suggestion, /confirmar a faixa atual/i);
  assert.equal(
    context.proximaAcaoRespostaCentral_(
      "Quanto custa o procedimento?",
    ),
    "Confirmar faixa de valor e responder",
  );
});

test("scheduled and active-care relationships require human continuity", () => {
  const context = loadContext();

  assert.equal(
    context.relacionamentoExigeHumanoCentral_(
      "appointment_scheduled",
    ),
    true,
  );
  assert.equal(
    context.relacionamentoExigeHumanoCentral_("active_postop"),
    true,
  );
  assert.equal(
    context.relacionamentoExigeHumanoCentral_("new_lead"),
    false,
  );
});

test("a future defer moves the item to silent waiting", () => {
  const context = loadContext();
  const now = new Date("2026-07-30T12:00:00-03:00");
  const item = context.criarItemCentral_({
    queue: "Resposta agora",
    phone: "+5511999999999",
    sourceKey: "conversation:abc",
  });
  const result = context.aplicarControleCentral_(
    item,
    {
      "conversation:abc": {
        owner: "Daniel",
        status: "Suspenso",
        deferUntil: new Date("2026-08-03T10:00:00-03:00"),
        teamNote: "Paciente pediu contato na próxima semana",
        lastTeamActionAt: now,
      },
    },
    now,
  );

  assert.equal(result.queue, "Aguardando paciente");
  assert.equal(result.mode, "Silêncio");
  assert.equal(result.owner, "Daniel");
  assert.match(result.teamNote, /próxima semana/);
});

test("completed items disappear after the configured visibility window", () => {
  const context = loadContext();
  const now = new Date("2026-07-30T15:00:00-03:00");
  const item = context.criarItemCentral_({
    queue: "Resposta agora",
    phone: "+5511999999999",
    sourceKey: "conversation:abc",
  });
  const result = context.aplicarControleCentral_(
    item,
    {
      "conversation:abc": {
        status: "Concluído",
        lastTeamActionAt: new Date(
          "2026-07-29T12:00:00-03:00",
        ),
      },
    },
    now,
  );

  assert.equal(result, null);
});

test("one patient remains one row even with several actions", () => {
  const context = loadContext();
  const items = {};

  context.adicionarItemCentral_(
    items,
    context.criarItemCentral_({
      queue: "Consultas e cuidados",
      phone: "5511999999999",
      nextAction: "Lembrete de consulta",
    }),
  );
  context.adicionarItemCentral_(
    items,
    context.criarItemCentral_({
      queue: "Ação manual hoje",
      phone: "+55 (11) 99999-9999",
      nextAction: "Confirmar documento",
    }),
  );

  assert.equal(Object.keys(items).length, 1);
  assert.equal(
    items["+5511999999999"].nextAction,
    "Confirmar documento",
  );
  assert.match(
    items["+5511999999999"].context,
    /Lembrete de consulta/,
  );
});

test("a later human response removes the patient from the answer-now queue", () => {
  const context = loadContext();
  const phone = "+5511999999999";
  const inboundAt = new Date("2026-07-30T11:00:00-03:00");
  const items = context.carregarRespostasPendentesCentral_(
    {
      [phone]: [{
        direcao: "IN",
        dataHora: inboundAt,
        messageId: "patient-message",
        texto: "Vocês têm horário amanhã?",
      }],
    },
    {},
    {},
    {
      [phone]: {
        dataHora: new Date("2026-07-30T11:05:00-03:00"),
        messageId: "human-message",
        texto: "Claro, vou verificar.",
      },
    },
    new Date("2026-07-30T11:10:00-03:00"),
  );

  assert.equal(items.length, 0);
});

test("the central refresh passes the current Date to the follow-up loader", () => {
  const context = loadContext();
  const now = new Date("2026-07-30T14:00:00-03:00");
  let receivedNow = null;

  context.obterOuCriarPlanilhaCentral_ = () => ({});
  context.carregarControlesCentral_ = () => ({});
  context.escreverCentralAtendimento_ = () => {};
  context.carregarRetomadasCentral_ = (
    _spreadsheet,
    _conversations,
    _leads,
    _profiles,
    currentDate,
  ) => {
    receivedNow = currentDate;
    return [];
  };

  const result = context.atualizarCentralAtendimentoInterno_(
    {
      getSheetByName() {
        return null;
      },
    },
    now,
  );

  assert.equal(receivedNow, now);
  assert.equal(result.ok, true);
});
