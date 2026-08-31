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

test("an expired defer returns the item to its generated operational status", () => {
  const context = loadContext();
  const now = new Date("2026-08-04T10:00:00-03:00");
  const item = context.criarItemCentral_({
    queue: "Resposta agora",
    phone: "+5511999999999",
    status: "Aberto",
    sourceKey: "conversation:abc",
  });
  const result = context.aplicarControleCentral_(
    item,
    {
      "conversation:abc": {
        status: "Suspenso",
        deferUntil: new Date("2026-08-03T10:00:00-03:00"),
        lastTeamActionAt: new Date("2026-07-30T12:00:00-03:00"),
      },
    },
    now,
  );

  assert.equal(result.queue, "Resposta agora");
  assert.equal(result.status, "Aberto");
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

test("an active follow-up hides cancelled duplicates and stale waiting instructions", () => {
  const context = loadContext();
  const items = {};
  const phone = "+5511999999999";

  context.adicionarItemCentral_(
    items,
    context.criarItemCentral_({
      queue: "Aguardando paciente",
      phone,
      nextAction: "Aguardar resposta",
      source: "WhatsApp — aguardando retorno",
    }),
  );
  context.adicionarItemCentral_(
    items,
    context.criarItemCentral_({
      queue: "Cancelado recentemente",
      phone,
      nextAction: "Retomada cancelada",
      source: "Retomada de marketing",
    }),
  );
  context.adicionarItemCentral_(
    items,
    context.criarItemCentral_({
      queue: "Ação manual hoje",
      phone,
      nextAction: "Revisar e aprovar a retomada",
      source: "Retomada de marketing",
      context: "Contexto atual.",
    }),
  );

  assert.equal(
    items[phone].nextAction,
    "Revisar e aprovar a retomada",
  );
  assert.equal(items[phone].context, "Contexto atual.");
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
  assert.equal(
    context.mensagemExigeRespostaCentral_(
      "Ok. Obrigado. Vou falar com minha esposa.",
    ),
    false,
  );
  assert.equal(
    context.mensagemExigeRespostaCentral_(
      "Preciso falar com a doutora sobre o exame.",
    ),
    true,
  );
});

test("a patient who says she will decide later stays visible without creating an answer task", () => {
  const context = loadContext();
  const phone = "+5511999999999";
  const now = new Date("2026-08-23T12:00:00-03:00");
  const conversation = [{
    direcao: "IN",
    dataHora: new Date("2026-08-23T11:50:00-03:00"),
    messageId: "patient-pause",
    texto: "Ok. Obrigada. Vou falar com meu marido.",
  }];

  const replies = context.carregarRespostasPendentesCentral_(
    { [phone]: conversation },
    {},
    {},
    {},
    now,
  );
  const waiting = context.carregarAguardandoPacienteCentral_(
    { [phone]: conversation },
    { [phone]: { nome: "Marina Souza" } },
    {},
    {},
    now,
  );

  assert.equal(replies.length, 0);
  assert.equal(waiting.length, 1);
  assert.equal(waiting[0].queue, "Aguardando paciente");
  assert.equal(waiting[0].name, "Marina Souza");
  assert.equal(waiting[0].status, "Suspenso");
  assert.equal(waiting[0].mode, "Silêncio");
  assert.equal(waiting[0].nextAction, "Aguardar iniciativa da paciente");
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
    { [currentPhone]: { nome: "Marina Souza" } },
    {},
    {},
    now,
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].phone, currentPhone);
  assert.equal(items[0].name, "Marina Souza");
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
  let cancellationRefreshAt = null;

  context.obterOuCriarPlanilhaCentral_ = () => ({});
  context.processarCancelamentosPendentesNaAtualizacaoCentral_ = (
    _spreadsheet,
    _sheet,
    currentDate,
  ) => {
    cancellationRefreshAt = currentDate;
    return {
      ok: true,
      selected: 0,
      cancelled: 0,
      skipped: 0,
      conflicts: [],
    };
  };
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
  assert.equal(cancellationRefreshAt, now);
  assert.equal(result.automaticCancellations.cancelled, 0);
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

test("sales portals and digital-presence pitches are treated as non-patient contacts", () => {
  const context = loadContext();

  assert.equal(
    context.mensagemComercialNaoPacienteCentral_(
      "Sou fundador do Cliagenda. Temos paciente buscando esse procedimento e gostaria de enviar a página de agendamento.",
    ),
    true,
  );
  assert.equal(
    context.mensagemComercialNaoPacienteCentral_(
      "Analisei a presença digital da clínica e percebi pontos que dificultam a chegada de novos pacientes pelo Google.",
    ),
    true,
  );
  assert.equal(
    context.mensagemComercialNaoPacienteCentral_(
      "Encontrei a Dra. Amanda no Google e quero marcar uma consulta.",
    ),
    false,
  );
});

test("an unresolved human commitment never fabricates a ready-to-send answer", () => {
  const context = loadContext();
  const phone = "+5511999990001";
  const createdAt = new Date("2026-08-29T14:20:00-03:00");
  const row = [
    "evt-review",
    phone,
    "human_review",
    "Revisar a solicitação e responder pelo WhatsApp.",
    "Amanda/equipe",
    createdAt,
    new Date("2026-08-29T18:20:00-03:00"),
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
    new Date("2026-08-30T12:00:00-03:00"),
    {},
    {},
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].suggestion, "");
  assert.doesNotMatch(items[0].context, /já conferimos/i);
});

test("registered history does not hide a newly eligible follow-up", () => {
  const context = loadContext();
  const oldPhone = "+5511999990001";
  const newPhone = "+5511999990002";
  const registered = context.criarItemCentral_({
    queue: "Cancelado recentemente",
    phone: oldPhone,
    status: "Cancelado",
    source: "Retomada de marketing",
  });

  context.carregarRetomadasRegistradasCentral_ = () => [registered];
  context.criarCandidatoRetomada_ = (phone) =>
    phone === newPhone
      ? {
          telefone: newPhone,
          lead: { status: "Qualificado", resumo: "Interesse em avaliação." },
          ultimoContato: new Date("2026-08-29T10:00:00-03:00"),
          etapa: { numero: 1, rotulo: "1ª retomada" },
          prioritario: true,
          horario: "",
          sugestao: "Posso verificar os próximos horários para você?",
          chaveDiaria: "2026-08-30|novo|1",
        }
      : null;
  context.atribuirHorariosRetomadas_ = (candidates) => {
    candidates.forEach((candidate) => {
      candidate.horario = "10:30";
    });
  };
  context.statusRetomadaEncerrado_ = () => false;

  const commitmentsSheet = {
    getLastRow: () => 1,
  };
  const items = context.carregarRetomadasCentral_(
    { getSheetByName: () => commitmentsSheet },
    { [newPhone]: [{ direcao: "OUT" }] },
    { [newPhone]: { status: "Qualificado" } },
    { [newPhone]: { relationship: "engaged_lead" } },
    new Date("2026-08-30T09:00:00-03:00"),
  );

  assert.equal(items.length, 2);
  assert.ok(items.some((item) => item.phone === newPhone));
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
  assert.match(source, /"Programar retomada com a Bruna"/);
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

test("approval click suggests the best observed response window without sending", () => {
  const context = loadContext();
  const NativeDate = Date;
  context.Date = class FixedDate extends NativeDate {
    constructor(...args) {
      super(
        ...(args.length
          ? args
          : ["2026-08-23T13:00:00-03:00"]),
      );
    }
  };
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const columns = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const values = Array(headers.length).fill("");
  values[columns.Fila] = "Ação manual hoje";
  values[columns["Mensagem final"]] =
    "Oi! Posso continuar de onde paramos?";
  values[columns["Aprovar com a Bruna"]] = true;
  values[columns["Elegibilidade da Bruna"]] =
    "Elegível para aprovação";
  values[columns["Última interação"]] = new Date(
    "2026-08-23T12:00:00-03:00",
  );
  values[columns.Modo] = "Manual";
  values[columns["Status operacional"]] = "Programado";
  values[columns.Fonte] = "Retomada de marketing";
  values[columns["Chave operacional"]] = "followup:plan-1";
  values[columns.Telefone] = "+5511999990001";
  const sheet = {
    getName: () => "Central de Atendimento",
    getRange(row, column) {
      if (row === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      return {
        getValue: () => values[column - 1],
        setValue(value) {
          values[column - 1] = value;
          return this;
        },
      };
    },
  };
  context.aprovarPlanoRetomadaParaBot_ = () => {
    assert.fail("checking approval must never send or approve the plan");
  };

  const result = context.processarEdicaoCentralAtendimento_({
    range: {
      getSheet: () => sheet,
      getRow: () => 2,
      getColumn: () => columns["Aprovar com a Bruna"] + 1,
    },
  });

  assert.equal(result.ok, true);
  assert.equal(values[columns["Aprovar com a Bruna"]], true);
  assert.equal(
    values[columns["Programar para"]].toISOString(),
    "2026-08-23T20:30:00.000Z",
  );
  assert.equal(
    values[columns["Elegibilidade da Bruna"]],
    "Elegível — horário sugerido automaticamente",
  );
});

test("approval of an old suggested conversation stays checked and uses the next commercial window", () => {
  const context = loadContext();
  const NativeDate = Date;
  context.Date = class FixedDate extends NativeDate {
    constructor(...args) {
      super(
        ...(args.length
          ? args
          : ["2026-08-23T13:00:00-03:00"]),
      );
    }
  };
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const columns = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const values = Array(headers.length).fill("");
  values[columns["Mensagem final"]] =
    "Oi! Posso continuar de onde paramos?";
  values[columns["Aprovar com a Bruna"]] = true;
  values[columns["Última interação"]] = new Date(
    "2026-08-17T12:00:00-03:00",
  );
  values[columns.Modo] = "Manual";
  values[columns["Status operacional"]] = "Programado";
  values[columns.Fonte] = "Retomada de marketing";
  values[columns["Chave operacional"]] = "followup:old-plan";
  const sheet = {
    getName: () => "Central de Atendimento",
    getRange(row, column) {
      if (row === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      return {
        getValue: () => values[column - 1],
        setValue(value) {
          values[column - 1] = value;
          return this;
        },
      };
    },
  };

  const result = context.processarEdicaoCentralAtendimento_({
    range: {
      getSheet: () => sheet,
      getRow: () => 2,
      getColumn: () => columns["Aprovar com a Bruna"] + 1,
    },
  });

  assert.equal(result.ok, true);
  assert.equal(values[columns["Aprovar com a Bruna"]], true);
  assert.equal(
    values[columns["Programar para"]].toISOString(),
    "2026-08-23T20:30:00.000Z",
  );
  assert.equal(
    values[columns["Elegibilidade da Bruna"]],
    "Elegível — horário sugerido; envio por modelo do WhatsApp",
  );
});

test("response-window suggestion respects the WhatsApp deadline and late-day fallback", () => {
  const context = loadContext();
  const preferred = context.sugerirProximaJanelaRespostaCentral_(
    new Date("2026-08-23T13:00:00-03:00"),
    new Date("2026-08-23T12:00:00-03:00"),
  );
  const deadlineFallback =
    context.sugerirProximaJanelaRespostaCentral_(
      new Date("2026-08-23T13:00:00-03:00"),
      new Date("2026-08-22T13:30:00-03:00"),
    );
  const lateDay = context.sugerirProximaJanelaRespostaCentral_(
    new Date("2026-08-23T18:20:00-03:00"),
    new Date("2026-08-23T18:00:00-03:00"),
  );
  const finalSafeMinutes =
    context.sugerirProximaJanelaRespostaCentral_(
      new Date("2026-08-23T18:40:00-03:00"),
      new Date("2026-08-23T18:00:00-03:00"),
    );
  const closed = context.sugerirProximaJanelaRespostaCentral_(
    new Date("2026-08-23T18:50:00-03:00"),
    new Date("2026-08-22T19:00:00-03:00"),
  );
  const oldApproved = context.sugerirProximaJanelaRespostaCentral_(
    new Date("2026-08-23T18:50:00-03:00"),
    new Date("2026-08-17T19:00:00-03:00"),
    { allowOutsideWhatsappWindow: true },
  );

  assert.equal(preferred.toISOString(), "2026-08-23T20:30:00.000Z");
  assert.equal(
    deadlineFallback.toISOString(),
    "2026-08-23T16:15:00.000Z",
  );
  assert.equal(lateDay.toISOString(), "2026-08-23T21:45:00.000Z");
  assert.equal(
    finalSafeMinutes.toISOString(),
    "2026-08-23T21:55:00.000Z",
  );
  assert.equal(closed, null);
  assert.equal(
    oldApproved.toISOString(),
    "2026-08-24T13:30:00.000Z",
  );
});

test("the action area and urgent rows use distinct accessible colors", () => {
  assert.match(source, /"Mensagem final"/);
  assert.match(source, /"Programar para"/);
  assert.match(source, /setBackground\("#d9d2e9"\)/);
  assert.match(source, /setBackground\("#fff2cc"\)/);
  assert.match(source, /Concluído recentemente/);
  assert.match(source, /Cancelado recentemente/);
  assert.match(source, /setBackground\("#e2f0d9"\)/);
  assert.match(source, /setBackground\("#f3f3f3"\)/);
  assert.match(
    source,
    /\$C2<=NOW\(\)\+1[\s\S]{0,180}\$X2="Retomada de marketing"/,
  );
  assert.match(source, /setFrozenColumns\(5\)/);
  assert.match(source, /https:\/\/wa\.me\//);
});

test("layout migration clears legacy validation and requires the current layout marker", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const sheetFor = (note) => ({
    getMaxColumns: () => headers.length,
    getRange(_row, _column, _rowCount, columnCount) {
      if (columnCount === headers.length) {
        return { getDisplayValues: () => [headers] };
      }
      return { getNote: () => note };
    },
  });

  assert.equal(context.estruturaCentralPronta_(sheetFor("")), false);
  assert.equal(
    context.estruturaCentralPronta_(sheetFor("central-liv-v5")),
    true,
  );
  assert.match(
    source,
    /getRange\(1, columns\.fonte \+ 1\)[\s\S]{0,80}setNote\(CENTRAL_ATENDIMENTO_CONFIG\.layoutVersion\)/,
  );
  assert.match(
    source,
    /if \(!structureReady\)[\s\S]{0,360}clearDataValidations\(\)/,
  );
});

test("Agir até explains the team deadline without pretending to schedule a send", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );

  assert.equal(headers[2], "Agir até");
  assert.doesNotMatch(headers.join("|"), /Prazo/);
  assert.match(
    source,
    /Agir até é o limite para a equipe revisar ou resolver a linha/,
  );
  assert.match(
    source,
    /Para a Bruna enviar, use Programar para/,
  );
});

test("a waiting patient can be reclassified into a manual Bruna schedule", () => {
  const context = loadContext();
  const now = new Date("2026-08-23T10:00:00-03:00");
  const scheduledAt = new Date("2026-08-23T12:00:00-03:00");
  const item = context.criarItemCentral_({
    queue: "Aguardando paciente",
    phone: "+5511999999999",
    lastInteractionAt: new Date("2026-08-23T09:30:00-03:00"),
    source: "WhatsApp — aguardando retorno",
    sourceKey: "conversation:patient-pause",
    status: "Suspenso",
  });

  context.aplicarControleCentral_(
    item,
    {
      "conversation:patient-pause": {
        status: "Programar retomada com a Bruna",
        finalMessageDefined: true,
        finalMessage: "Oi! Posso continuar de onde paramos, se fizer sentido.",
        programForDefined: true,
        programFor: scheduledAt,
        approveBruna: true,
        teamNote: "",
        lastTeamActionAt: now,
        deferUntil: null,
      },
    },
    now,
  );

  assert.equal(item.queue, "Ação manual hoje");
  assert.equal(item.status, "Programado");
  assert.equal(item.mode, "Manual");
  assert.equal(item.owner, "Equipe");
  assert.equal(item.approvalBrunaEligible, true);
  assert.equal(item.approveBruna, true);
  assert.equal(
    item.brunaEligibilityReason,
    "Elegível após conferência da mensagem e do procedimento",
  );
  assert.equal(item.programFor.toISOString(), scheduledAt.toISOString());
});

test("a waiting-patient schedule visibly blocks dates beyond the WhatsApp window", () => {
  const context = loadContext();

  assert.equal(
    context.avaliarProgramacaoEsperaCentral_(
      {
        finalMessage: "Oi! Posso continuar de onde paramos?",
        lastInteractionAt: new Date("2026-08-23T09:00:00-03:00"),
        programFor: new Date("2026-08-24T10:00:00-03:00"),
      },
      new Date("2026-08-23T10:00:00-03:00"),
    ),
    "Horário fora da janela atual do WhatsApp",
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
    {
      "+5511999990001": [{
        dataHora: new Date("2026-08-14T08:40:00-03:00"),
      }],
      "+5511999990002": [{
        dataHora: new Date("2026-08-14T08:45:00-03:00"),
      }],
    },
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].mode, "Manual");
  assert.equal(
    items[0].lastInteractionAt.toISOString(),
    "2026-08-14T11:40:00.000Z",
  );
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

test("registered manual follow-ups outside the WhatsApp window remain approvable by template", () => {
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

  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [manual] }),
  };
  const items = context.carregarRetomadasRegistradasCentral_(
    { getSheetByName: () => sheet },
    { "+5511999990001": { relationship: "engaged_lead" } },
    new Date("2026-08-16T09:00:00-03:00"),
    {
      "+5511999990001": [{
        dataHora: new Date("2026-08-14T08:40:00-03:00"),
      }],
    },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].approvalBrunaEligible, true);
  assert.equal(
    items[0].brunaEligibilityReason,
    "Elegível para aprovação manual — envio por modelo do WhatsApp",
  );
});

test("semantic failures are separated into correctable manual work and terminal history", () => {
  const context = loadContext();
  const correctable = Array(17).fill("");
  correctable[0] = "2026-08-26|correctable";
  correctable[1] = new Date("2026-08-26T08:00:00-03:00");
  correctable[2] = "+5511999990001";
  correctable[4] = 1;
  correctable[5] = "09:00";
  correctable[6] = "Qualificado";
  correctable[7] = "Dúvida sobre o valor da consulta.";
  correctable[8] = "Mensagem que a equipe deve revisar.";
  correctable[9] = "Automático aprovado";
  correctable[10] = "Falha — revisar";
  correctable[12] = new Date("2026-08-26T09:01:00-03:00");
  correctable[14] =
    "semantic_context_review_required:procedure_mismatch";

  const terminal = Array(17).fill("");
  terminal[0] = "2026-08-26|terminal";
  terminal[1] = new Date("2026-08-26T08:00:00-03:00");
  terminal[2] = "+5511999990002";
  terminal[4] = 1;
  terminal[5] = "11:45";
  terminal[6] = "Novo";
  terminal[8] = "Mensagem que não deve ser reenviada.";
  terminal[9] = "Automático";
  terminal[10] = "Falha — revisar";
  terminal[12] = new Date("2026-08-26T11:46:00-03:00");
  terminal[14] =
    "semantic_context_review_required:patient_closed";

  const sheet = {
    getLastRow: () => 3,
    getRange: () => ({ getValues: () => [correctable, terminal] }),
  };
  const items = context.carregarRetomadasRegistradasCentral_(
    { getSheetByName: () => sheet },
    {
      "+5511999990001": { relationship: "engaged_lead" },
      "+5511999990002": { relationship: "engaged_lead" },
    },
    new Date("2026-08-26T13:00:00-03:00"),
    {
      "+5511999990001": [{
        dataHora: new Date("2026-08-24T14:29:00-03:00"),
      }],
      "+5511999990002": [{
        dataHora: new Date("2026-08-25T14:16:00-03:00"),
      }],
    },
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].queue, "Ação manual hoje");
  assert.equal(items[0].priority.label, "Alta");
  assert.equal(items[0].mode, "Manual");
  assert.equal(items[0].owner, "Equipe");
  assert.equal(items[0].status, "Falha — revisar");
  assert.equal(items[0].approvalBrunaEligible, true);
  assert.equal(items[0].cancelFollowUpEligible, true);
  assert.match(items[0].context, /texto não confere/i);
  assert.equal(items[1].queue, "Cancelado recentemente");
  assert.equal(items[1].status, "Cancelado");
  assert.equal(items[1].approvalBrunaEligible, false);
  assert.equal(items[1].cancelFollowUpEligible, false);
  assert.match(items[1].nextAction, /revisão do contexto/i);
});

test("sent and cancelled follow-ups move to a recent history below active queues", () => {
  const context = loadContext();
  const sentAt = new Date("2026-08-23T12:46:00-03:00");
  const cancelledAt = new Date("2026-08-23T12:50:00-03:00");
  const sent = Array(17).fill("");
  sent[0] = "2026-08-22|sent";
  sent[1] = new Date("2026-08-22T08:00:00-03:00");
  sent[2] = "+5511999990001";
  sent[4] = 1;
  sent[8] = "Mensagem enviada.";
  sent[9] = "Automático";
  sent[10] = "Enviada";
  sent[11] = new Date("2026-08-23T12:45:00-03:00");
  sent[12] = sentAt;
  sent[13] = sentAt;

  const cancelled = Array(17).fill("");
  cancelled[0] = "2026-08-22|cancelled";
  cancelled[1] = new Date("2026-08-22T08:00:00-03:00");
  cancelled[2] = "+5511999990002";
  cancelled[4] = 1;
  cancelled[8] = "Mensagem cancelada.";
  cancelled[9] = "Automático";
  cancelled[10] = "Cancelada — conversation_changed";
  cancelled[12] = cancelledAt;

  const sheet = {
    getLastRow: () => 3,
    getRange: () => ({ getValues: () => [sent, cancelled] }),
  };
  const items = context.carregarRetomadasRegistradasCentral_(
    { getSheetByName: () => sheet },
    {
      "+5511999990001": { relationship: "engaged_lead" },
      "+5511999990002": { relationship: "engaged_lead" },
    },
    new Date("2026-08-23T13:00:00-03:00"),
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].queue, "Concluído recentemente");
  assert.equal(items[0].status, "Concluído");
  assert.equal(items[0].priority.rank, 7);
  assert.equal(items[0].dueAt, null);
  assert.equal(items[0].lastInteractionAt.getTime(), sentAt.getTime());
  assert.equal(items[0].lastTeamActionAt.getTime(), sentAt.getTime());
  assert.match(items[0].nextAction, /aguardar resposta/i);
  assert.equal(items[1].queue, "Cancelado recentemente");
  assert.equal(items[1].status, "Cancelado");
  assert.equal(items[1].priority.rank, 8);
  assert.equal(
    items[1].lastTeamActionAt.getTime(),
    cancelledAt.getTime(),
  );
});

test("recent history is sorted newest first and expires after 24 hours", () => {
  const context = loadContext();
  const recent = context.criarItemCentral_({
    queue: "Concluído recentemente",
    phone: "+5511999990001",
    status: "Concluído",
    lastTeamActionAt: new Date("2026-08-23T12:55:00-03:00"),
  });
  const older = context.criarItemCentral_({
    queue: "Concluído recentemente",
    phone: "+5511999990002",
    status: "Concluído",
    lastTeamActionAt: new Date("2026-08-23T12:45:00-03:00"),
  });

  assert.deepEqual(
    [older, recent].sort(context.compararItensCentral_).map((item) => item.phone),
    [recent.phone, older.phone],
  );
  assert.equal(
    context.aplicarControleCentral_(
      older,
      {
        [older.sourceKey]: {
          owner: "",
          teamNote: "",
          lastTeamActionAt: older.lastTeamActionAt,
          deferUntil: null,
        },
      },
      new Date("2026-08-24T13:00:00-03:00"),
    ),
    null,
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

test("refresh preserves the edited final message and Bruna schedule", () => {
  const context = loadContext();
  const scheduledAt = new Date("2026-08-25T10:30:00-03:00");
  const item = context.criarItemCentral_({
    queue: "Ação manual hoje",
    phone: "+5511999990001",
    suggestion: "Sugestão original.",
    approvalBrunaEligible: true,
    sourceKey: "followup:plan-1",
  });

  context.aplicarControleCentral_(
    item,
    {
      "followup:plan-1": {
        finalMessageDefined: true,
        finalMessage: "Mensagem revisada pela equipe.",
        programForDefined: true,
        programFor: scheduledAt,
        teamNote: "",
        lastTeamActionAt: null,
        deferUntil: null,
      },
    },
    new Date("2026-08-23T10:00:00-03:00"),
  );

  assert.equal(item.finalMessage, "Mensagem revisada pela equipe.");
  assert.equal(item.programFor.toISOString(), scheduledAt.toISOString());
});

test("WhatsApp links reuse wa.me without pre-filling or sending a message", () => {
  const context = loadContext();
  let richTexts;
  context.SpreadsheetApp = {
    newRichTextValue() {
      const value = { text: "", url: "" };
      return {
        setText(text) {
          value.text = text;
          return this;
        },
        setLinkUrl(url) {
          value.url = url;
          return this;
        },
        build() {
          return value;
        },
      };
    },
  };
  const sheet = {
    getRange: () => ({
      setRichTextValues(values) {
        richTexts = values;
      },
    }),
  };

  context.aplicarLinksWhatsappCentral_(sheet, [{
    phone: "+55 (11) 91234-5678",
  }]);

  assert.equal(richTexts[0][0].text, "Abrir conversa");
  assert.equal(richTexts[0][0].url, "https://wa.me/5511912345678");
  assert.doesNotMatch(richTexts[0][0].url, /text=/);
});

test("unresolved registered follow-ups remain visible after the email day", () => {
  const context = loadContext();
  const row = Array(17).fill("");
  row[0] = "2026-08-14|manual";
  row[1] = new Date("2026-08-14T08:00:00-03:00");
  row[2] = "+5511999990001";
  row[4] = 2;
  row[5] = "16:30";
  row[6] = "Qualificado";
  row[8] = "Mensagem humana sugerida.";
  row[9] = "Manual";
  row[10] = "Ação manual";
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [row] }),
  };

  const items = context.carregarRetomadasRegistradasCentral_(
    { getSheetByName: () => sheet },
    { "+5511999990001": { relationship: "engaged_lead" } },
    new Date("2026-08-16T09:00:00-03:00"),
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].approvalBrunaEligible, false);
  assert.equal(
    items[0].brunaEligibilityReason,
    "Sem interação recente segura para programação",
  );
  assert.equal(
    context.formatarDataCentral_(items[0].dueAt, "yyyy-MM-dd"),
    "2026-08-14",
  );
});

test("stale unresolved follow-ups outside the operational window stay out of the Central", () => {
  const context = loadContext();
  const row = Array(17).fill("");
  row[0] = "2026-08-04|manual";
  row[1] = new Date("2026-08-04T08:00:00-03:00");
  row[2] = "+5511999990001";
  row[4] = 2;
  row[5] = "16:30";
  row[6] = "Qualificado";
  row[8] = "Mensagem humana antiga.";
  row[9] = "Manual";
  row[10] = "Ação manual";
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [row] }),
  };

  const items = context.carregarRetomadasRegistradasCentral_(
    { getSheetByName: () => sheet },
    { "+5511999990001": { relationship: "engaged_lead" } },
    new Date("2026-08-23T09:00:00-03:00"),
  );

  assert.equal(items.length, 0);
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
  eligible[columns["Mensagem final"]] = "Mensagem final revisada.";
  eligible[columns["Programar para"]] = new Date(
    "2026-08-14T16:40:00-03:00",
  );
  eligible[columns["Status operacional"]] = "Programado";
  eligible[columns["Aprovar com a Bruna"]] = true;
  eligible[columns.Fonte] = "Retomada de marketing";
  eligible[columns["Chave operacional"]] = "followup:plan-1";

  const ineligible = Array(headers.length).fill("");
  ineligible[columns["Responsável"]] = "Equipe";
  ineligible[columns["Modo"]] = "Manual";
  ineligible[columns["Resposta sugerida"]] = "Cuidado humano.";
  ineligible[columns["Mensagem final"]] = "Cuidado humano.";
  ineligible[columns["Programar para"]] = new Date(
    "2026-08-14T16:50:00-03:00",
  );
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
  let approvalOptions;
  context.aprovarPlanoRetomadaParaBot_ = (
    _spreadsheet,
    token,
    _now,
    options,
  ) => {
    approvalOptions = options;
    return token === "token:plan-1"
      ? { ok: true }
      : { ok: false, reason: "plan_not_found" };
  };

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
  assert.equal(
    approvalOptions.suggestion,
    "Mensagem final revisada.",
  );
  assert.equal(
    approvalOptions.scheduledAt.toISOString(),
    new Date("2026-08-14T16:40:00-03:00").toISOString(),
  );
  assert.equal(approvalOptions.origin, "Central de Atendimento");
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

test("a checked waiting-patient conversion creates a plan before Bruna approval", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const columns = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const row = Array(headers.length).fill("");
  row[columns.Modo] = "Manual";
  row[columns["Status operacional"]] = "Programado";
  row[columns["Mensagem final"]] =
    "Oi! Se fizer sentido, posso continuar de onde paramos.";
  row[columns["Programar para"]] = new Date(
    "2099-08-23T12:00:00-03:00",
  );
  row[columns["Última interação"]] = new Date(
    "2099-08-23T10:00:00-03:00",
  );
  row[columns["Aprovar com a Bruna"]] = true;
  row[columns.Fonte] = "WhatsApp — aguardando retorno";
  row[columns["Chave operacional"]] = "conversation:patient-pause";
  row[columns.Telefone] = "+5511999999999";

  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getRange(rowNumber, column, rowCount) {
      if (rowNumber === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      if (rowNumber === 2 && column === 1 && rowCount === 1) {
        return { getValues: () => [row] };
      }
      return {
        setValue(value) {
          writes.push({ row: rowNumber, column, value });
        },
      };
    },
  };
  let registeredInput;
  let approvalOptions;
  context.registrarPlanoManualRetomadaCentral_ = (
    _spreadsheet,
    input,
  ) => {
    registeredInput = input;
    return { ok: true, planKey: "central-plan" };
  };
  context.assinaturaAprovacaoRetomadaBot_ = (key) =>
    "token:" + key;
  context.aprovarPlanoRetomadaParaBot_ = (
    _spreadsheet,
    token,
    _now,
    options,
  ) => {
    approvalOptions = options;
    return token === "token:central-plan"
      ? { ok: true }
      : { ok: false, reason: "plan_not_found" };
  };

  const selected = context.coletarRetomadasMarcadasCentral_(sheet);
  const result = context.aprovarRetomadasMarcadasCentralInterno_(
    {},
    sheet,
    new Date("2099-08-23T10:15:00-03:00"),
    selected,
  );

  assert.equal(selected.length, 1);
  assert.equal(selected[0].waitingConversion, true);
  assert.equal(selected[0].eligible, true);
  assert.equal(result.approved, 1);
  assert.equal(registeredInput.messageId, "patient-pause");
  assert.equal(registeredInput.phone, "+5511999999999");
  assert.equal(
    approvalOptions.suggestion,
    row[columns["Mensagem final"]],
  );
  assert.ok(
    writes.some(
      (write) =>
        write.column === columns.Modo + 1 &&
        write.value === "Automático",
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

test("the next refresh cancels checked eligible plans and leaves unrelated rows untouched", () => {
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
  const result =
    context.processarCancelamentosPendentesNaAtualizacaoCentral_(
      {},
      sheet,
      new Date("2026-08-23T10:00:00-03:00"),
    );

  assert.equal(selected.length, 2);
  assert.equal(selected[0].eligible, true);
  assert.equal(selected[1].eligible, false);
  assert.equal(result.cancelled, 1);
  assert.equal(result.skipped, 1);
  assert.deepEqual(Array.from(result.conflicts), []);
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

test("the automatic refresh never chooses between approval and cancellation on the same row", () => {
  const context = loadContext();
  const headers = vm.runInContext(
    "Array.from(CENTRAL_ATENDIMENTO_HEADERS)",
    context,
  );
  const columns = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const row = Array(headers.length).fill("");
  row[columns.Modo] = "Manual";
  row[columns["Status operacional"]] = "Programado";
  row[columns["Aprovar com a Bruna"]] = true;
  row[columns["Cancelar retomada"]] = true;
  row[columns["Mensagem final"]] = "Mensagem final segura.";
  row[columns["Programar para"]] = new Date(
    "2026-08-23T17:30:00-03:00",
  );
  row[columns.Fonte] = "Retomada de marketing";
  row[columns["Chave operacional"]] = "followup:plan-conflict";

  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getRange(rowNumber, column, rowCount) {
      if (rowNumber === 1 && column === 1) {
        return { getDisplayValues: () => [headers] };
      }
      if (rowNumber === 2 && column === 1 && rowCount === 1) {
        return { getValues: () => [row] };
      }
      return {
        setValue(value) {
          writes.push({ rowNumber, column, value });
        },
      };
    },
  };
  context.assinaturaCancelamentoRetomadas_ = () =>
    "cancel-token:plan-conflict";
  context.cancelarPlanoRetomadaPorToken_ = () => {
    throw new Error("a conflicting row must not be cancelled");
  };

  const result =
    context.processarCancelamentosPendentesNaAtualizacaoCentral_(
      {},
      sheet,
      new Date("2026-08-23T10:00:00-03:00"),
    );

  assert.equal(result.ok, false);
  assert.equal(result.cancelled, 0);
  assert.equal(result.skipped, 1);
  assert.deepEqual(Array.from(result.conflicts), [2]);
  assert.equal(writes.length, 0);
});
