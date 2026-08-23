import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  buildLiftingFacialInformationReply,
} from "../../netlify/functions/lib/lifting-information.mjs";

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

test("the Brenda minilifting question has the same approved answer in the bot and the Central", () => {
  const context = loadContext();
  const message =
    "Sei que tem o lifting e o mini lifting, qual a diferença de ambos";
  const centralSuggestion = context.sugerirRespostaCentral_(
    message,
    "Brenda Rebecca",
    "new_lead",
  );
  const botReply = buildLiftingFacialInformationReply({
    text: message,
    procedure: "lifting_facial",
    patientName: "Brenda Rebecca",
  });

  assert.equal(centralSuggestion, botReply);
  assert.match(centralSuggestion, /principal diferença está na extensão/i);
  assert.match(centralSuggestion, /como essa escolha é feita na consulta\?/i);
});

test("the Central uses a matching open internal review draft", () => {
  const context = loadContext();
  const phone = "+5511999999999";
  const message = "Quero entender a diferença entre as duas técnicas";
  const receivedAt = new Date("2026-08-20T12:19:00-03:00");
  const suggestion =
    "As técnicas têm extensões diferentes; a escolha é individualizada na avaliação.";
  const row = [
    "Resposta",
    "Alta",
    new Date("2026-08-20T12:19:10-03:00"),
    "Paciente Teste",
    phone,
    "Assunto: comparação\nPergunta da paciente: " + message,
    suggestion,
    "low",
    "Aberta",
    "",
    "",
    "unknown-response:evt-synthetic",
    new Date("2026-08-20T12:19:10-03:00"),
  ];
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [row] }),
  };
  const drafts = context.carregarSugestoesRevisaoCentral_({
    getSheetByName: () => sheet,
  });

  assert.equal(
    context.selecionarSugestaoRevisaoCentral_(
      drafts,
      phone,
      message,
      receivedAt,
    ),
    suggestion,
  );
});

test("the generic Central fallback is explicitly not copy-ready", () => {
  const context = loadContext();
  const suggestion = context.sugerirRespostaCentral_(
    "Tenho uma dúvida diferente.",
    "Marina",
    "new_lead",
  );

  assert.match(suggestion, /^SEM SUGESTÃO PRONTA/);
  assert.doesNotMatch(suggestion, /^Oi, Marina!/);
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
      "Trabalho com gestão e otimização do Perfil da Empresa no Google para conquistar clientes.",
    ),
    false,
  );
  assert.equal(
    context.mensagemExigeRespostaCentral_(
      "Pode enviar a localização da clínica no Google Maps?",
    ),
    true,
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

test("old commercial commitments are downgraded to silent exclusion review", () => {
  const context = loadContext();
  const phone = "+5511999990001";
  const createdAt = new Date("2026-08-03T14:20:00-03:00");
  const row = [
    "evt-commercial",
    phone,
    "human_review",
    "Revisar a solicitação e responder pelo WhatsApp.",
    "Amanda/equipe",
    createdAt,
    new Date("2026-08-03T18:20:00-03:00"),
    "Pendente",
    "",
    "WhatsApp — revisão humana",
  ];
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [row] }),
  };
  const items = context.carregarCompromissosCentral_(
    { getSheetByName: () => sheet },
    new Date("2026-08-14T12:00:00-03:00"),
    {},
    {
      [phone]: [{
        direcao: "IN",
        dataHora: createdAt,
        messageId: "evt-commercial",
        texto:
          "Trabalho com gestão e otimização do Perfil da Empresa no Google para conquistar clientes.",
      }],
    },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].queue, "Revisar exclusão comercial");
  assert.equal(items[0].priority.label, "Normal");
  assert.equal(items[0].mode, "Silêncio");
  assert.equal(items[0].suggestion, "");
  assert.match(items[0].nextAction, /Encerrar/);
  assert.doesNotMatch(items[0].context, /seguir por aqui/i);
});

test("commercial close status resolves, archives and records the decision", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const values = Array(headers.length).fill("");
  const index = Object.fromEntries(
    headers.map((header, column) => [header, column]),
  );
  values[index.Telefone] = "+5511999990001";
  values[index["Status operacional"]] =
    "Encerrar — comercial/não paciente";
  values[index["Chave operacional"]] =
    "commitment:evt-commercial";
  const writes = [];
  const spreadsheet = {};
  const sheet = {
    getName: () => "Central de Atendimento",
    getParent: () => spreadsheet,
    getRange(row, column) {
      if (row === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      return {
        getValue: () => values[column - 1],
        setValue(value) {
          values[column - 1] = value;
          writes.push({ column, value });
        },
      };
    },
  };
  let resolved = null;
  let closed = null;
  context.resolverCompromissoCentral_ = (
    eventId,
    _now,
    file,
    reason,
  ) => {
    resolved = { eventId, file, reason };
  };
  context.encerrarContatoComercialCentral_ = (file, input) => {
    closed = { file, input };
  };

  const result = context.processarEdicaoCentralAtendimento_({
    range: {
      getSheet: () => sheet,
      getRow: () => 2,
      getColumn: () => index["Status operacional"] + 1,
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(resolved, {
    eventId: "evt-commercial",
    file: spreadsheet,
    reason:
      "Contato comercial/marketing — não paciente. Encerrado sem resposta.",
  });
  assert.equal(closed.file, spreadsheet);
  assert.equal(closed.input.phone, "+5511999990001");
  assert.equal(closed.input.eventId, "evt-commercial");
  assert.match(
    String(values[index["Observação da equipe"]]),
    /comercial\/marketing/i,
  );
  assert.ok(writes.length >= 2);
});

test("status validation exposes one-step commercial closure", () => {
  assert.match(source, /"Encerrar — comercial\/não paciente"/);
});

test("central exposes batch decisions without making an on-edit send", () => {
  assert.match(source, /"Aprovar com a Bruna"/);
  assert.match(source, /"Cancelar retomada"/);
  assert.match(source, /"Processar decisões marcadas"/);
  assert.match(source, /insertCheckboxes\(\)/);
  assert.match(source, /ui\.ButtonSet\.YES_NO/);
  assert.doesNotMatch(
    source,
    /processarEdicaoCentralAtendimento_[\s\S]{0,1800}aprovarPlanoRetomadaParaBot_/,
  );
});

test("next-24-hour actions use distinct accessible colors", () => {
  assert.match(source, /Roxo: retomada humana sugerida/);
  assert.match(source, /Amarelo: ação geral prevista/);
  assert.match(source, /setBackground\("#d9d2e9"\)/);
  assert.match(source, /setBackground\("#fff2cc"\)/);
  assert.match(
    source,
    /\$C2<=NOW\(\)\+1[\s\S]{0,180}\$V2="Retomada de marketing"/,
  );
});

test("registered manual follow-ups are eligible while approved plans are shown as automatic", () => {
  const context = loadContext();
  const manual = Array(17).fill("");
  manual[0] = "2026-08-14|manual";
  manual[1] = new Date("2026-08-14T08:00:00-03:00");
  manual[2] = "+5511999990001";
  manual[4] = 2;
  manual[5] = "16:30";
  manual[6] = "Qualificado";
  manual[8] = "Mensagem humana sugerida.";
  manual[9] = "Manual";
  manual[10] = "Ação manual";

  const automatic = Array(17).fill("");
  automatic[0] = "2026-08-14|automatic";
  automatic[1] = new Date("2026-08-14T08:00:00-03:00");
  automatic[2] = "+5511999990002";
  automatic[4] = 2;
  automatic[5] = "16:45";
  automatic[6] = "Qualificado";
  automatic[8] = "Mensagem já aprovada.";
  automatic[9] = "Automático aprovado";
  automatic[10] = "Programada";
  automatic[11] = new Date("2026-08-14T16:45:00-03:00");

  const sheet = {
    getLastRow: () => 3,
    getRange: () => ({ getValues: () => [manual, automatic] }),
  };
  const items = context.carregarRetomadasRegistradasCentral_(
    { getSheetByName: () => sheet },
    {
      "+5511999990001": { relationship: "engaged_lead" },
      "+5511999990002": { relationship: "engaged_lead" },
    },
    new Date("2026-08-14T09:00:00-03:00"),
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].mode, "Manual");
  assert.equal(items[0].approvalBrunaEligible, true);
  assert.equal(items[0].cancelFollowUpEligible, true);
  assert.equal(items[0].brunaEligibilityReason, "Elegível para aprovação");
  assert.equal(items[1].mode, "Automático");
  assert.equal(items[1].owner, "Bruna/bot");
  assert.equal(items[1].approvalBrunaEligible, false);
  assert.equal(items[1].cancelFollowUpEligible, true);
  assert.equal(
    items[1].brunaEligibilityReason,
    "Já programada com a Bruna",
  );
});

test("refresh preserves a checked approval only while the follow-up remains eligible", () => {
  const context = loadContext();
  const now = new Date("2026-08-14T10:00:00-03:00");
  const controls = {
    "followup:plan-1": {
      approveBruna: true,
      teamNote: "",
      lastTeamActionAt: null,
      deferUntil: null,
      status: "",
    },
  };
  const eligible = context.criarItemCentral_({
    queue: "Ação manual hoje",
    phone: "+5511999990001",
    approvalBrunaEligible: true,
    sourceKey: "followup:plan-1",
  });
  const ineligible = context.criarItemCentral_({
    queue: "Consultas e cuidados",
    phone: "+5511999990002",
    approvalBrunaEligible: false,
    sourceKey: "followup:plan-1",
  });

  context.aplicarControleCentral_(eligible, controls, now);
  context.aplicarControleCentral_(ineligible, controls, now);

  assert.equal(eligible.approveBruna, true);
  assert.equal(ineligible.approveBruna, false);
});

test("a final queue status wins over a stale visible follow-up control", () => {
  const context = loadContext();
  const now = new Date("2026-08-23T10:00:00-03:00");
  const item = context.criarItemCentral_({
    queue: "Ação manual hoje",
    phone: "+5511999990001",
    status: "Cancelado",
    source: "Retomada de marketing",
    sourceKey: "followup:plan-cancelled",
  });

  context.aplicarControleCentral_(
    item,
    {
      "followup:plan-cancelled": {
        status: "Programado",
        teamNote: "",
        lastTeamActionAt: null,
        deferUntil: null,
      },
    },
    now,
  );

  assert.equal(item.status, "Cancelado");
});

test("checked eligible rows are approved in one batch and ineligible rows remain human", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const columns = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const eligible = Array(headers.length).fill("");
  eligible[columns["Responsável"]] = "Equipe";
  eligible[columns["Modo"]] = "Manual";
  eligible[columns["Resposta sugerida"]] = "Mensagem aprovada.";
  eligible[columns["Status operacional"]] = "Programado";
  eligible[columns["Aprovar com a Bruna"]] = true;
  eligible[columns.Fonte] = "Retomada de marketing";
  eligible[columns["Chave operacional"]] = "followup:plan-1";

  const ineligible = Array(headers.length).fill("");
  ineligible[columns["Responsável"]] = "Equipe";
  ineligible[columns["Modo"]] = "Manual";
  ineligible[columns["Resposta sugerida"]] = "Cuidado humano.";
  ineligible[columns["Status operacional"]] = "Programado";
  ineligible[columns["Aprovar com a Bruna"]] = true;
  ineligible[columns.Fonte] = "Consultas";
  ineligible[columns["Chave operacional"]] = "appointment:1";

  const rows = [eligible, ineligible];
  const writes = [];
  const sheet = {
    getLastRow: () => 3,
    getRange(row, column, rowCount, columnCount) {
      if (row === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      if (row === 2 && column === 1 && rowCount === 2) {
        return { getValues: () => rows };
      }
      return {
        setValue(value) {
          writes.push({ row, column, value });
        },
      };
    },
  };
  context.assinaturaAprovacaoRetomadaBot_ = (key) =>
    "token:" + key;
  context.aprovarPlanoRetomadaParaBot_ = (
    _spreadsheet,
    token,
  ) =>
    token === "token:plan-1"
      ? { ok: true }
      : { ok: false, reason: "plan_not_found" };

  const selected = context.coletarRetomadasMarcadasCentral_(sheet);
  const result = context.aprovarRetomadasMarcadasCentralInterno_(
    {},
    sheet,
    new Date("2026-08-14T10:00:00-03:00"),
    selected,
  );

  assert.equal(selected.length, 2);
  assert.equal(selected[0].eligible, true);
  assert.equal(selected[1].eligible, false);
  assert.equal(result.approved, 1);
  assert.equal(result.skipped, 1);
  assert.ok(
    writes.some(
      (write) =>
        write.row === 2 &&
        write.column === columns["Modo"] + 1 &&
        write.value === "Automático",
    ),
  );
  assert.equal(
    writes.filter(
      (write) =>
        write.column === columns["Aprovar com a Bruna"] + 1 &&
        write.value === false,
    ).length,
    2,
  );
  assert.ok(
    writes.some(
      (write) =>
        write.row === 3 &&
        write.column === columns["Observação da equipe"] + 1 &&
        /não programada/i.test(write.value),
    ),
  );
});

test("missing safe copy explains why Bruna approval is unavailable", () => {
  const context = loadContext();

  assert.equal(
    context.motivoElegibilidadeBrunaCentral_({
      automatic: false,
      suggestion: "",
      normalizedStatus: "acao manual",
      approvalEligible: false,
    }),
    "Sem mensagem segura preenchida",
  );
});

test("checked cancellations remove only eligible follow-up plans in one batch", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const columns = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const eligible = Array(headers.length).fill("");
  eligible[columns.Modo] = "Automático";
  eligible[columns["Status operacional"]] = "Programado";
  eligible[columns["Cancelar retomada"]] = true;
  eligible[columns.Fonte] = "Retomada de marketing";
  eligible[columns["Chave operacional"]] = "followup:plan-cancel";

  const ineligible = Array(headers.length).fill("");
  ineligible[columns.Modo] = "Manual";
  ineligible[columns["Status operacional"]] = "Programado";
  ineligible[columns["Cancelar retomada"]] = true;
  ineligible[columns.Fonte] = "Consultas";
  ineligible[columns["Chave operacional"]] = "appointment:1";

  const rows = [eligible, ineligible];
  const writes = [];
  const sheet = {
    getLastRow: () => 3,
    getRange(row, column, rowCount) {
      if (row === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      if (row === 2 && column === 1 && rowCount === 2) {
        return { getValues: () => rows };
      }
      return {
        setValue(value) {
          writes.push({ row, column, value });
        },
      };
    },
  };
  context.assinaturaCancelamentoRetomadas_ = (key) =>
    "cancel-token:" + key;
  context.cancelarPlanoRetomadaPorToken_ = (
    _spreadsheet,
    token,
  ) =>
    token === "cancel-token:plan-cancel"
      ? { ok: true }
      : { ok: false, reason: "plan_not_found" };

  const selected = context.coletarCancelamentosMarcadosCentral_(sheet);
  const result = context.cancelarRetomadasMarcadasCentralInterno_(
    {},
    sheet,
    new Date("2026-08-23T10:00:00-03:00"),
    selected,
  );

  assert.equal(selected.length, 2);
  assert.equal(selected[0].eligible, true);
  assert.equal(selected[1].eligible, false);
  assert.equal(result.cancelled, 1);
  assert.equal(result.skipped, 1);
  assert.equal(
    writes.filter(
      (write) =>
        write.column === columns["Cancelar retomada"] + 1 &&
        write.value === false,
    ).length,
    2,
  );
  assert.ok(
    writes.some(
      (write) =>
        write.row === 2 &&
        write.column === columns["Status operacional"] + 1 &&
        write.value === "Cancelado",
    ),
  );
});
