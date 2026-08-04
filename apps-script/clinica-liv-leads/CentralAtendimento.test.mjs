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

test("normalizes every automatic Bruna label to the panel vocabulary", () => {
  const context = loadContext();

  assert.equal(
    context.normalizarResponsavelCentral_("Bruna/automação"),
    "Bruna/bot",
  );
  assert.equal(
    context.criarItemCentral_({
      queue: "Consultas e cuidados",
      phone: "+5511999999999",
      owner: "Bruna/automação",
    }).owner,
    "Bruna/bot",
  );
  assert.equal(
    context.normalizarResponsavelCentral_("responsável desconhecido"),
    "Equipe",
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

test("acknowledgements, automated openers and solicitations do not create false work", () => {
  const context = loadContext();

  assert.equal(
    context.mensagemExigeRespostaCentral_("Que maravilha"),
    false,
  );
  assert.equal(
    context.mensagemExigeRespostaCentral_("Ok, brigadaa!"),
    false,
  );
  assert.equal(
    context.mensagemExigeRespostaCentral_(
      "Olá! Quero saber sobre lifting facial. Ref. M26F01W-C06H01",
    ),
    false,
  );
  assert.equal(
    context.mensagemExigeRespostaCentral_(
      "Estamos com uma oferta especial para a clínica.",
    ),
    false,
  );
  assert.equal(
    context.mensagemExigeRespostaCentral_(
      "Qual é o valor do procedimento?",
    ),
    true,
  );
});

test("answer-now only includes a recent message that still needs a reply", () => {
  const context = loadContext();
  const now = new Date("2026-07-30T14:00:00-03:00");
  const oldPhone = "+5511999999998";
  const currentPhone = "+5511999999999";
  const items = context.carregarRespostasPendentesCentral_(
    {
      [oldPhone]: [{
        direcao: "IN",
        dataHora: new Date("2026-07-28T12:00:00-03:00"),
        messageId: "old-question",
        texto: "Qual é o valor?",
      }],
      [currentPhone]: [{
        direcao: "IN",
        dataHora: new Date("2026-07-30T13:30:00-03:00"),
        messageId: "current-question",
        texto: "Qual é o valor?",
      }],
    },
    {},
    {},
    {},
    now,
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].phone, currentPhone);
});

test("marketing follow-up is not reused for an established patient", () => {
  const context = loadContext();

  assert.equal(
    context.relacionamentoPermiteRetomadaMarketingCentral_(
      "former_patient",
    ),
    false,
  );
  assert.equal(
    context.relacionamentoPermiteRetomadaMarketingCentral_(
      "consultation_completed",
    ),
    false,
  );
  assert.equal(
    context.relacionamentoPermiteRetomadaMarketingCentral_(
      "new_lead",
    ),
    true,
  );
});

test("local ISO dates keep the intended day in scheduled actions", () => {
  const context = loadContext();
  const time = new Date("2026-07-29T10:30:00-03:00");
  const combined = context.combinarDataHorarioCentral_(
    "2026-07-30",
    time,
  );

  assert.equal(
    combined.toISOString(),
    "2026-07-30T13:30:00.000Z",
  );
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

test("excludes Dr. Henrique appointments without hiding a referral", () => {
  const context = loadContext();
  const excluded = context.identificarTelefonesProfissionaisExternosCentral_({
    "+5511999990001": [
      {
        texto: "Agendamento confirmado. Data: 05/08/2026. Horário: 15h. Médico: Dr. Henrique Lane Staniak.",
      },
    ],
    "+5511999990002": [
      { texto: "O Dr. Henrique Staniak indicou a Dra. Amanda." },
    ],
  });

  assert.equal(excluded["+5511999990001"], true);
  assert.equal(excluded["+5511999990002"], undefined);
});
