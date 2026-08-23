import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("./Retomadas.gs", import.meta.url),
  "utf8",
);
const productionTarget = JSON.parse(
  await readFile(
    new URL("./production-target.json", import.meta.url),
    "utf8",
  ),
);
const agendaSource = await readFile(
  new URL("./AgendaCuidados.gs", import.meta.url),
  "utf8",
);
const contactPreferencesSource = await readFile(
  new URL("./ContactPreferences.gs", import.meta.url),
  "utf8",
);
const context = vm.createContext({
  Utilities: {
    formatDate: (date, _timezone, format) => {
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
      const replacements = {
        yyyy: values.year,
        MM: values.month,
        dd: values.day,
        HH: values.hour,
        H: String(Number(values.hour)),
        mm: values.minute,
      };

      return format.replace(
        /yyyy|MM|dd|HH|H|mm/g,
        (token) => replacements[token],
      );
    },
  },
});

vm.runInContext(contactPreferencesSource, context, {
  filename: "ContactPreferences.gs",
});
vm.runInContext(source, context, {
  filename: "Retomadas.gs",
});
vm.runInContext(agendaSource, context, {
  filename: "AgendaCuidados.gs",
});

test("sends the daily follow-up email to Amanda and Daniel", () => {
  assert.match(
    source,
    /destinatario:\s*"amandaschh@hotmail\.com, daniel\.added@gmail\.com"/,
  );
});

test("keeps follow-up suppressed when the patient says she will return", () => {
  const patientMessageAt = new Date("2026-07-28T12:00:00.000Z");
  const conversationWithPromise = [
    {
      direcao: "IN",
      dataHora: patientMessageAt,
      texto: "Obrigada, vou conversar com minha família e te chamo.",
    },
    {
      direcao: "OUT",
      dataHora: new Date("2026-07-28T12:01:00.000Z"),
      texto: "Claro, fique à vontade.",
    },
  ];

  assert.equal(
    context.retornoFuturoRecente_(
      conversationWithPromise,
      new Date("2026-07-29T11:59:59.000Z"),
    ),
    true,
  );
  assert.equal(
    context.retornoFuturoRecente_(
      conversationWithPromise,
      new Date("2026-08-29T12:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    context.mensagemIndicaRetornoFuturo_(
      "Mais pra frente eu entro em contato com vocês.",
    ),
    true,
  );
});

test("a later patient message reopens a previously deferred conversation", () => {
  const conversationWithReturn = [
    {
      direcao: "IN",
      dataHora: new Date("2026-07-20T12:00:00.000Z"),
      texto: "Quando eu decidir, entro em contato.",
    },
    {
      direcao: "OUT",
      dataHora: new Date("2026-07-20T12:01:00.000Z"),
      texto: "Claro, fique à vontade.",
    },
    {
      direcao: "IN",
      dataHora: new Date("2026-07-30T12:00:00.000Z"),
      texto: "Agora gostaria de ver horários.",
    },
  ];

  assert.equal(
    context.retornoFuturoRecente_(
      conversationWithReturn,
      new Date("2026-07-30T13:00:00.000Z"),
    ),
    false,
  );
});

test("reflection receives a four-day pause without permanent suppression", () => {
  const conversationThinking = [{
    direcao: "IN",
    dataHora: new Date("2026-07-28T12:00:00.000Z"),
    texto: "Vou pensar com calma.",
  }];

  assert.equal(
    context.retornoFuturoRecente_(
      conversationThinking,
      new Date("2026-07-30T12:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    context.retornoFuturoRecente_(
      conversationThinking,
      new Date("2026-08-02T12:00:01.000Z"),
    ),
    false,
  );
});

test("engagement controls the maximum follow-up budget", () => {
  assert.equal(
    context.classificarEngajamentoRetomada_([
      { direcao: "IN", texto: "Quero saber mais" },
      { direcao: "OUT", texto: "Claro" },
    ]),
    "passivo",
  );
  assert.equal(
    context.classificarEngajamentoRetomada_([
      { direcao: "IN", texto: "Qual o valor?" },
      { direcao: "OUT", texto: "Vou confirmar" },
    ]),
    "engajado",
  );
});

test("commercial follow-up has only the 24h and 72h stages", () => {
  const stages = vm.runInContext("RETOMADAS_ETAPAS", context);

  assert.equal(stages.length, 2);
  assert.equal(stages[0].diasMinimos, 1);
  assert.equal(stages[1].diasMinimos, 3);
  assert.match(stages[1].rotulo, /última/);
});

test("a human promise blocks commercial follow-up", () => {
  assert.equal(
    context.conversaTemPromessaHumanaPendente_([
      { direcao: "IN", texto: "Qual o valor?" },
      {
        direcao: "OUT",
        texto: "Vou confirmar com a equipe e te retorno.",
      },
    ]),
    true,
  );
});

test("never plans a commercial follow-up overnight", () => {
  assert.equal(
    context.horarioRetomadaPorIndice_(["10:30"], 0),
    "10:30",
  );
  assert.equal(
    context.horarioRetomadaPorIndice_(["17:45"], 4),
    "18:45",
  );
  assert.equal(
    context.horarioRetomadaPorIndice_(["17:45"], 5),
    "",
  );
  assert.equal(
    context.horarioRetomadaPorIndice_(["08:30"], 0),
    "",
  );
});

test("classifies only a safe first follow-up as planned for Bruna", () => {
  assert.equal(
    context.responsavelRetomada_({
      etapa: { numero: 1 },
      contextoAgenda: false,
      contextoPreco: false,
      sugestao: "Retomada contextual segura.",
    }),
    "bruna",
  );
  assert.equal(
    context.responsavelRetomada_({
      etapa: { numero: 1 },
      contextoAgenda: false,
      contextoPreco: true,
      sugestao: "Retomada de preço para revisão humana.",
    }),
    "equipe",
  );
  assert.equal(
    context.responsavelRetomada_({
      etapa: { numero: 2 },
      contextoAgenda: false,
      contextoPreco: false,
      sugestao: "Encerramento contextual.",
    }),
    "equipe",
  );
  assert.equal(
    context.responsavelRetomada_({
      etapa: { numero: 1 },
      contextoAgenda: false,
      contextoPreco: false,
      sugestao: "",
    }),
    "equipe",
  );
});

test("prefill identifies the procedure but never proves scheduling intent", () => {
  const messages = [
    {
      direcao: "IN",
      texto:
        "Olá! Tenho interesse em lifting facial e gostaria de entender melhor como funciona a avaliação. Ref. G26F01-123-lifting-facial JID: J1_abc123",
    },
    {
      direcao: "OUT",
      texto: "Posso te orientar sobre lifting facial.",
    },
  ];
  const authorialContext = context.contextoAutoralRetomada_(messages);

  assert.equal(authorialContext, "");
  assert.equal(
    context.intencaoAgendaRetomada_(messages, authorialContext),
    false,
  );
  assert.equal(
    context.identificarAssuntoRetomada_(messages[0].texto),
    "lifting facial",
  );
});

test("prefill-only candidate receives a contextual continuation without agenda", () => {
  const candidate = context.criarCandidatoRetomada_(
    "+5511999999999",
    {
      status: "Novo",
      resumo: "",
      proximaAcao: "",
      referencia: "G26F01-123-lifting-facial",
      plataforma: "Meta",
      campanha: "",
      criativo: "",
      destino: "WhatsApp",
      referenciaCompleta: "G26F01-123-lifting-facial",
    },
    [
      {
        direcao: "IN",
        dataHora: new Date("2026-08-20T10:00:00-03:00"),
        messageId: "in-prefill",
        texto:
          "Olá! Tenho interesse em lifting facial com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação. Ref. G26F01-123-lifting-facial JID: J1_abc123",
      },
      {
        direcao: "OUT",
        dataHora: new Date("2026-08-20T10:01:00-03:00"),
        messageId: "out-opening",
        texto:
          "Posso te orientar sobre lifting facial. O que você gostaria de entender primeiro?",
      },
    ],
    new Date("2026-08-21T10:30:00-03:00"),
    "2026-08-21",
  );

  assert.ok(candidate);
  assert.equal(candidate.contextoAgenda, false);
  assert.equal(candidate.contextoPreco, false);
  assert.equal(candidate.assuntoRetomada, "lifting facial");
  assert.match(candidate.sugestao, /conversa sobre lifting facial/);
  assert.doesNotMatch(candidate.sugestao, /agenda|horário/);
  assert.equal(context.responsavelRetomada_(candidate), "bruna");
});

test("scheduling requires a direct request or explicit acceptance", () => {
  assert.equal(
    context.intencaoAgendaRetomada_(
      [{ direcao: "IN", texto: "Quero marcar uma avaliação." }],
      "quero marcar uma avaliacao",
    ),
    true,
  );
  assert.equal(
    context.intencaoAgendaRetomada_(
      [
        {
          direcao: "OUT",
          texto: "Posso consultar a agenda e separar horários?",
        },
        { direcao: "IN", texto: "Sim, por favor." },
      ],
      "sim por favor",
    ),
    true,
  );
  assert.equal(
    context.intencaoAgendaRetomada_(
      [{ direcao: "IN", texto: "Como funciona a avaliação?" }],
      "como funciona a avaliacao",
    ),
    false,
  );
});

test("email fails closed when no contextual suggestion is safe", () => {
  const item = {
    telefone: "+5511999999999",
    categoria: "1ª retomada",
    automatico: false,
    sugestao: "",
  };

  assert.equal(
    context.mensagemSugeridaItemRetomada_(item),
    "SEM SUGESTÃO PRONTA",
  );
  assert.equal(
    context.converterRetomadaParaCuidadoEmail_({
      ...item,
      horario: "16:30",
      modo: "Manual",
      etapa: { rotulo: "1ª retomada" },
      lead: {
        referencia: "Paciente",
        resumo: "",
        status: "Novo",
      },
      chaveDiaria: "plano-sem-sugestao",
    }).aprovacaoBotDisponivel,
    false,
  );
});

test("contextual first follow-up names the procedure without offering agenda", () => {
  const message = context.sugerirMensagemRetomada_(
    1,
    false,
    null,
    false,
    false,
    "",
    false,
    "lifting facial",
  );

  assert.match(message, /nossa conversa sobre lifting facial/);
  assert.match(message, /Ficou alguma dúvida/);
  assert.match(
    message,
    /como funciona a avaliação com a Dra\. Amanda/,
  );
  assert.doesNotMatch(message, /agenda|horário|menu|caminhos/);
});

test("no procedure or prior question produces no copy-ready fallback", () => {
  assert.equal(
    context.sugerirMensagemRetomada_(
      1,
      false,
      null,
      false,
      false,
      "",
      false,
      "",
    ),
    "",
  );
});

test("daily email shows the exact automatic message and drafts human actions", () => {
  const common = {
    telefone: "+5511999999999",
    horario: "10:30",
    ultimoContato: new Date("2026-07-27T12:00:00.000Z"),
    etapa: { numero: 1, rotulo: "1ª retomada" },
    lead: {
      status: "Novo",
      resumo: "Pesquisa sobre lifting facial",
      proximaAcao: "",
    },
  };
  const planned = {
    ...common,
    responsavel: "bruna",
    automatico: true,
    sugestao: "Mensagem exata da retomada automática.",
  };
  const human = {
    ...common,
    telefone: "+5511888888888",
    responsavel: "equipe",
    sugestao: "Mensagem sugerida para a equipe.",
  };
  const text = context.montarTextoEmailRetomadas_(
    [planned, human],
    [human],
    "28/07/2026",
    [],
    "https://docs.google.com/spreadsheets/d/test/edit#gid=123",
  );
  const html = context.montarHtmlEmailRetomadas_(
    [planned, human],
    [human],
    "28/07/2026",
    [],
    "https://docs.google.com/spreadsheets/d/test/edit#gid=123",
  );

  assert.match(text, /Agenda única do dia/);
  assert.match(
    text,
    /ENVIOS AUTOMÁTICOS PREVISTOS HOJE \(1\)/,
  );
  assert.match(
    text,
    /AÇÕES HUMANAS SUGERIDAS HOJE \(1\)/,
  );
  assert.match(text, /Mensagem sugerida para a equipe/);
  assert.match(text, /Mensagem exata da retomada automática/);
  assert.match(text, /Abrir a fila de decisões na Central de Atendimento/);
  assert.doesNotMatch(text, /PLANO DO DIA|AÇÃO SUGERIDA PARA/);
  assert.match(
    html,
    /Envios automáticos previstos hoje \(1\)/,
  );
  assert.match(
    html,
    /Ações humanas sugeridas hoje \(1\)/,
  );
  assert.match(html, /Mensagem sugerida para a equipe/);
  assert.match(html, /Mensagem exata da retomada automática/);
  assert.match(html, />Abrir fila de decisões</);
  assert.doesNotMatch(html, /Plano do dia|Ação sugerida para Amanda/);
  assert.equal(
    (text.match(/Mensagem sugerida para a equipe/g) || []).length,
    1,
  );
  assert.equal(
    (html.match(/Mensagem sugerida para a equipe/g) || []).length,
    1,
  );
});

test("daily email deep link opens the Central de Atendimento tab", () => {
  const spreadsheet = {
    getUrl: () =>
      "https://docs.google.com/spreadsheets/d/test/edit#gid=999",
    getSheetByName: (name) =>
      name === "Central de Atendimento"
        ? { getSheetId: () => 123 }
        : null,
  };

  assert.equal(
    context.linkCentralAtendimentoRetomadas_(spreadsheet),
    "https://docs.google.com/spreadsheets/d/test/edit#gid=123",
  );
});

test("follow-up items receive a secure cancel link with a confirmation step", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET"
          ? "test-secret"
          : key === "RETOMADAS_WEB_APP_URL"
            ? "https://script.google.com/macros/s/test/exec"
            : "",
    }),
  };
  context.Utilities.computeHmacSha256Signature = () => [1, 2, 3];
  context.Utilities.base64EncodeWebSafe = () => "AQID=";

  const planKey =
    "2026-08-21|+5511999990000|out-1|1";
  const link = context.linkCancelamentoRetomadas_(planKey);

  assert.match(link, /view=cancelar_retomadas/);
  assert.match(link, /cancel=AQID/);
  assert.doesNotMatch(link, /phone|5511999990000|out-1/);
  assert.doesNotMatch(link, /confirmar=1/);

  const page = context.paginaCancelamentoRetomadas_(
    "Confirmar",
    "Mensagem",
    "AQID",
  );
  assert.match(page, /Confirmar cancelamento/);
  assert.match(page, /Cancelando\.\.\./);
  assert.match(page, /google\.script\.run/);
  assert.match(page, /confirmarCancelamentoRetomada/);
  assert.doesNotMatch(page, /target="_top"|confirmar=1/);
});

test("cancel action updates only the selected plan and is idempotent", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET" ? "test-secret" : "",
    }),
  };
  context.Utilities.computeHmacSha256Signature = (value) =>
    String(value).endsWith("plan-a") ? [1] : [2];
  context.Utilities.base64EncodeWebSafe = (bytes) =>
    bytes[0] === 1 ? "TOKEN_A=" : "TOKEN_B=";

  const rows = [Array(17).fill(""), Array(17).fill("")];
  rows[0][0] = "plan-a";
  rows[0][2] = "+5511999990000";
  rows[0][10] = "Programada";
  rows[0][11] = new Date("2026-08-21T16:30:00-03:00");
  rows[1][0] = "plan-b";
  rows[1][2] = "+5511999990000";
  rows[1][10] = "Programada";
  const writes = [];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange(row, column, rowCount, columnCount) {
      if (row === 2 && column === 1) {
        return { getValues: () => rows };
      }
      return {
        setValues(values) {
          writes.push({ row, column, rowCount, columnCount, values });
          if (column === 11) {
            for (let index = 0; index < columnCount; index += 1) {
              rows[row - 2][10 + index] = values[0][index];
            }
          }
        },
      };
    },
  };
  const file = {
    getSheetByName(name) {
      assert.equal(name, "_WHATSAPP_RETOMADAS");
      return sheet;
    },
  };
  const now = new Date("2026-08-21T12:00:00-03:00");

  const cancelled = context.cancelarPlanoRetomadaPorToken_(
    file,
    "TOKEN_A",
    now,
  );

  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.alreadyCancelled, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].row, 2);
  assert.equal(writes[0].column, 11);
  assert.equal(writes[0].columnCount, 5);
  assert.equal(
    writes[0].values[0][0],
    "Cancelada — solicitação da equipe",
  );
  assert.equal(
    writes[0].values[0][4],
    "cancelled_by_team_request",
  );
  assert.equal(rows[1][10], "Programada");

  const repeated = context.cancelarPlanoRetomadaPorToken_(
    file,
    "TOKEN_A",
    now,
  );
  assert.equal(repeated.ok, true);
  assert.equal(repeated.alreadyCancelled, true);
  assert.equal(writes.length, 1);
});

test("recognizes a manual first follow-up and schedules only the second stage", () => {
  const leadData = {
    nome: "Marina Souza",
    status: "Novo",
    resumo: "Pesquisa sobre lifting facial",
    proximaAcao: "",
    referencia: "M26F01W-C06H01",
    plataforma: "Meta",
    campanha: "M26F01W",
    criativo: "C06H01",
    destino: "WhatsApp",
    referenciaCompleta: "M26F01W-C06H01",
  };
  const conversationData = [
    {
      direcao: "IN",
      dataHora: new Date("2026-08-10T10:13:00-03:00"),
      messageId: "in-1",
      texto: "Quero saber sobre lifting facial.",
    },
    {
      direcao: "OUT",
      dataHora: new Date("2026-08-15T16:25:00-03:00"),
      messageId: "human-out-1",
      texto:
        "Olá! Passando para saber se você conseguiu ver nossa mensagem sobre a avaliação. https://draamandaschroeder.com.br/lifting-facial/",
    },
  ];

  assert.equal(
    context.proximaEtapaRetomada_(conversationData),
    2,
  );
  assert.equal(
    context.criarCandidatoRetomada_(
      "+5511999999999",
      leadData,
      conversationData,
      new Date("2026-08-17T08:00:00-03:00"),
      "2026-08-17",
    ),
    null,
  );

  const secondStage = context.criarCandidatoRetomada_(
    "+5511999999999",
    leadData,
    conversationData,
    new Date("2026-08-18T08:00:00-03:00"),
    "2026-08-18",
  );

  assert.equal(secondStage.etapa.numero, 2);
  assert.match(secondStage.sugestao, /^Oi, Marina!/);
  assert.equal(
    context.responsavelRetomada_(secondStage),
    "equipe",
  );
});

test("keeps a genuine initial reply eligible for the first follow-up", () => {
  const conversationData = [
    {
      direcao: "IN",
      dataHora: new Date("2026-08-16T18:00:00-03:00"),
      messageId: "in-1",
      texto: "Quero saber como funciona a avaliação.",
    },
    {
      direcao: "OUT",
      dataHora: new Date("2026-08-16T18:05:00-03:00"),
      messageId: "out-1",
      texto: "Claro, posso explicar como funciona a consulta.",
    },
  ];

  assert.equal(
    context.proximaEtapaRetomada_(conversationData),
    1,
  );
});

test("manual commercial follow-up receives an opaque approval button for Bruna", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET"
          ? "test-secret"
          : key === "RETOMADAS_WEB_APP_URL"
            ? "https://script.google.com/macros/s/test/exec"
            : "",
    }),
  };
  context.ScriptApp = undefined;
  context.Utilities.computeHmacSha256Signature = () => [4, 5, 6];
  context.Utilities.base64EncodeWebSafe = () => "BAUG=";

  const candidate = {
    telefone: "+5511999990000",
    horario: "16:30",
    ultimoContato: new Date("2026-08-13T12:00:00-03:00"),
    etapa: { numero: 2, rotulo: "2ª retomada" },
    chaveDiaria:
      "2026-08-14|+5511999990000|out-1|2",
    modo: "Manual",
    automatico: false,
    responsavel: "equipe",
    sugestao: "Mensagem revisável pela equipe.",
    lead: {
      referencia: "Paciente",
      status: "Qualificado",
      resumo: "Retomada sobre valor",
      proximaAcao: "",
    },
  };
  const text = context.montarTextoEmailRetomadas_(
    [candidate],
    [candidate],
    "14/08/2026",
  );
  const html = context.montarHtmlEmailRetomadas_(
    [candidate],
    [candidate],
    "14/08/2026",
  );

  assert.match(text, /Passar para a Bruna:/);
  assert.match(html, />Passar para a Bruna</);
  assert.match(text, /Cancelar esta retomada:/);
  assert.match(html, />Cancelar esta retomada</);
  assert.doesNotMatch(text + html, /Não retomar mais/);
  assert.match(html, /approval=BAUG/);
  const approvalHref = html.match(
    /href="([^"]*view=aprovar_retomada_bot[^"]*)"/,
  )[1];
  assert.doesNotMatch(approvalHref, /5511999990000/);
  assert.doesNotMatch(approvalHref, /2026-08-14%7C/);

  const confirmationPage = context.paginaAprovacaoRetomadaBot_(
    "Confirmar",
    "Revise antes.",
    candidate.sugestao,
    "BAUG",
  );
  assert.match(confirmationPage, /<form method="get"/);
  assert.match(confirmationPage, /target="_top"/);
  assert.match(confirmationPage, /name="confirmar" value="1"/);
  assert.match(confirmationPage, /Mensagem revisável pela equipe/);
});

test("every eligible human follow-up can be passed to Bruna", () => {
  const base = {
    telefone: "+5511999990000",
    horario: "16:30",
    etapa: { numero: 2, rotulo: "2ª retomada" },
    chaveDiaria: "plan-human",
    automatico: false,
    responsavel: "equipe",
    sugestao: "Mensagem contextual revisável.",
    lead: {
      referencia: "Paciente",
      status: "Qualificado",
      resumo: "Retomada sobre recuperação",
      neverBotReply: false,
    },
  };

  for (const mode of ["Manual", "Ação humana"]) {
    assert.equal(
      context.converterRetomadaParaCuidadoEmail_({
        ...base,
        modo: mode,
      }).aprovacaoBotDisponivel,
      true,
    );
  }

  assert.equal(
    context.converterRetomadaParaCuidadoEmail_({
      ...base,
      modo: "Suspensa na planilha",
    }).aprovacaoBotDisponivel,
    false,
  );
  assert.equal(
    context.converterRetomadaParaCuidadoEmail_({
      ...base,
      modo: "Manual",
      lead: { ...base.lead, neverBotReply: true },
    }).aprovacaoBotDisponivel,
    false,
  );
});

test("approval moves only the selected manual plan to the bot queue and is idempotent", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET"
          ? "test-secret"
          : key === "RETOMADAS_AUTOMATICAS_ATIVAS"
            ? "true"
            : "",
    }),
  };
  context.Utilities.computeHmacSha256Signature = () => [7, 8, 9];
  context.Utilities.base64EncodeWebSafe = () => "BwgJ=";

  const row = Array(17).fill("");
  row[0] = "2026-08-14|opaque-plan";
  row[2] = "+5511999990000";
  row[3] = "out-1";
  row[4] = 2;
  row[5] = "16:30";
  row[8] = "Mensagem aprovada pela equipe.";
  row[9] = "Manual";
  row[10] = "Ação manual";
  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getRange(rowNumber, column, rowCount, columnCount) {
      if (rowNumber === 2 && column === 1) {
        return { getValues: () => [row] };
      }
      return {
        setValues(values) {
          writes.push({
            rowNumber,
            column,
            rowCount,
            columnCount,
            values,
          });
        },
      };
    },
  };
  const file = { getSheetByName: () => sheet };
  const now = new Date("2026-08-14T08:15:00-03:00");
  const approved = context.aprovarPlanoRetomadaParaBot_(
    file,
    "BwgJ",
    now,
  );

  assert.equal(approved.ok, true);
  assert.equal(approved.alreadyApproved, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].column, 9);
  assert.equal(writes[0].columnCount, 9);
  assert.equal(
    writes[0].values[0][0],
    "Mensagem aprovada pela equipe.",
  );
  assert.equal(writes[0].values[0][1], "Automático aprovado");
  assert.equal(writes[0].values[0][2], "Programada");
  assert.equal(writes[0].values[0][8], "E-mail diário");
  assert.equal(
    context.formatarDataRetomadas_(
      writes[0].values[0][3],
      "HH:mm",
    ),
    "16:30",
  );

  row[9] = "Automático aprovado";
  row[10] = "Programada";
  row[11] = writes[0].values[0][3];
  const repeated = context.aprovarPlanoRetomadaParaBot_(
    file,
    "BwgJ",
    now,
  );
  assert.equal(repeated.ok, true);
  assert.equal(repeated.alreadyApproved, true);
  assert.equal(writes.length, 1);
});

test("Central approval persists the exact edited message and future schedule", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET"
          ? "test-secret"
          : key === "RETOMADAS_AUTOMATICAS_ATIVAS"
            ? "true"
            : "",
    }),
  };
  context.Utilities.computeHmacSha256Signature = () => [7, 8, 9];
  context.Utilities.base64EncodeWebSafe = () => "BwgJ=";

  const row = Array(17).fill("");
  row[0] = "2026-08-14|central-plan";
  row[2] = "+5511999990000";
  row[3] = "out-1";
  row[5] = "16:30";
  row[8] = "Sugestão original.";
  row[9] = "Manual";
  row[10] = "Ação manual";
  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getRange(rowNumber, column, rowCount, columnCount) {
      if (rowNumber === 2 && column === 1) {
        return { getValues: () => [row] };
      }
      return {
        setValues(values) {
          writes.push({ column, columnCount, values });
        },
      };
    },
  };
  const scheduledAt = new Date("2026-08-16T10:15:00-03:00");
  const result = context.aprovarPlanoRetomadaParaBot_(
    { getSheetByName: () => sheet },
    "BwgJ",
    new Date("2026-08-14T10:00:00-03:00"),
    {
      suggestion: "Mensagem final revisada pela equipe.",
      scheduledAt,
      origin: "Central de Atendimento",
    },
  );

  assert.equal(result.ok, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].values[0][0], "Mensagem final revisada pela equipe.");
  assert.equal(writes[0].values[0][3].toISOString(), scheduledAt.toISOString());
  assert.equal(writes[0].values[0][8], "Central de Atendimento");
});

test("Central approval rejects unsafe copy and invalid send times", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET"
          ? "test-secret"
          : key === "RETOMADAS_AUTOMATICAS_ATIVAS"
            ? "true"
            : "",
    }),
  };
  context.Utilities.computeHmacSha256Signature = () => [7, 8, 9];
  context.Utilities.base64EncodeWebSafe = () => "BwgJ=";
  const row = Array(17).fill("");
  row[0] = "2026-08-14|central-plan";
  row[2] = "+5511999990000";
  row[3] = "out-1";
  row[8] = "Sugestão original.";
  row[9] = "Manual";
  row[10] = "Ação manual";
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({
      getValues: () => [row],
      setValues: () => assert.fail("invalid approval must not write"),
    }),
  };
  const file = { getSheetByName: () => sheet };
  const now = new Date("2026-08-14T10:00:00-03:00");

  assert.equal(
    context.aprovarPlanoRetomadaParaBot_(file, "BwgJ", now, {
      suggestion: "SEM SUGESTÃO PRONTA — revisar",
      scheduledAt: new Date("2026-08-14T11:00:00-03:00"),
      origin: "Central de Atendimento",
    }).reason,
    "unsafe_message",
  );
  assert.equal(
    context.aprovarPlanoRetomadaParaBot_(file, "BwgJ", now, {
      suggestion: "Mensagem revisada.",
      scheduledAt: new Date("2026-08-15T08:30:00-03:00"),
      origin: "Central de Atendimento",
    }).reason,
    "outside_send_window",
  );
});

test("cancel link always uses the canonical deployment when runtime URLs diverge", () => {
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) =>
        key === "LEADS_INGEST_SECRET"
          ? "test-secret"
          : key === "RETOMADAS_WEB_APP_URL"
            ? "https://script.google.com/macros/s/old-deployment/exec"
            : "",
    }),
  };
  context.ScriptApp = {
    getService: () => ({
      getUrl: () =>
        "https://script.google.com/macros/s/current-deployment/exec",
    }),
  };
  context.Utilities.computeHmacSha256Signature = () => [1, 2, 3];
  context.Utilities.base64EncodeWebSafe = () => "AQID=";

  const link = context.linkCancelamentoRetomadas_(
    "+55 11 99999-0000",
    false,
  );

  assert.equal(link.split("?")[0], productionTarget.webAppUrl);
  assert.doesNotMatch(link, /current-deployment/);
  assert.doesNotMatch(link, /old-deployment/);
});

test("cancel link rejects editor, development and malformed Apps Script URLs", () => {
  for (const invalidUrl of [
    "https://script.google.com/home/projects/test/edit",
    "https://script.google.com/macros/s/test/dev",
    "https://drive.google.com/file/d/test/view",
    "javascript:alert(1)",
  ]) {
    assert.equal(
      context.normalizarUrlAplicativoRetomadas_(invalidUrl),
      "",
    );
  }

  assert.equal(
    context.normalizarUrlAplicativoRetomadas_(
      "https://script.google.com/macros/s/current/exec?cache=old#link",
    ),
    "https://script.google.com/macros/s/current/exec",
  );
});

test("cancel action stops only pending plans for the selected phone", () => {
  const rows = [
    Array(15).fill(""),
    Array(15).fill(""),
    Array(15).fill(""),
  ];
  rows[0][2] = "+5511999990000";
  rows[0][10] = "Programada";
  rows[0][11] = new Date("2026-08-09T13:30:00-03:00");
  rows[1][2] = "+5511888880000";
  rows[1][10] = "Programada";
  rows[2][2] = "+5511999990000";
  rows[2][10] = "Enviada";
  const writes = [];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange(row, column, rowCount, columnCount) {
      if (row === 2 && column === 1) {
        return { getValues: () => rows };
      }
      return {
        setValues(values) {
          writes.push({ row, column, rowCount, columnCount, values });
        },
      };
    },
  };
  const now = new Date("2026-08-09T13:00:00-03:00");
  const cancelled = context.cancelarPlanosPendentesRetomadas_(
    { getSheetByName: () => sheet },
    "+55 11 99999-0000",
    now,
  );

  assert.equal(cancelled, 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].row, 2);
  assert.equal(writes[0].values[0][0], "Cancelada — nunca retomar");
  assert.equal(writes[0].values[0][4], "never_follow_up");
});

function lead(overrides = {}) {
  return {
    plataforma: "Meta",
    referencia: "M26F02S-C06H01",
    referenciaCompleta: "M26F02S-C06H01",
    ...overrides,
  };
}

function conversation(texts) {
  return texts.map((text, index) => ({
    direcao: index % 2 === 0 ? "IN" : "OUT",
    texto: text,
  }));
}

test("reads acquisition context from the current 25-column lead layout", () => {
  const headers = Array(25).fill("");
  headers[2] = "Telefone (E.164)";
  const row = Array(25).fill("");
  row[1] = "M26F02S-C06H01";
  row[2] = "+5511999999999";
  row[4] = "Novo";
  row[18] = "WHATSAPP";
  row[19] = "Meta";
  row[20] = "M26F02S";
  row[21] = "C06H01";
  row[23] = "WhatsApp";
  row[24] = "M26F02S-C06H01";
  const sheet = {
    getLastRow: () => 2,
    getRange: (startRow, startColumn, rowCount, columnCount) => {
      assert.equal(startColumn, 1);
      assert.equal(rowCount, 1);
      assert.equal(columnCount, 25);
      return {
        getDisplayValues: () => [
          startRow === 1 ? headers : row,
        ],
      };
    },
  };

  const result = context.carregarLeadsRetomadas_(sheet);
  const loaded = result["+5511999999999"];

  assert.equal(loaded.origemEvento, "WHATSAPP");
  assert.equal(loaded.plataforma, "Meta");
  assert.equal(loaded.campanha, "M26F02S");
  assert.equal(loaded.criativo, "C06H01");
  assert.equal(loaded.destino, "WhatsApp");
  assert.equal(loaded.referenciaCompleta, "M26F02S-C06H01");
  assert.equal(loaded.nome, "");
});

test("reads the patient name from an additive LEADS column", () => {
  const headers = Array(30).fill("");
  headers[2] = "Telefone (E.164)";
  headers[29] = "Nome";
  const row = Array(30).fill("");
  row[2] = "+5511999999999";
  row[29] = "Marina Souza";
  const sheet = {
    getLastRow: () => 2,
    getLastColumn: () => 30,
    getRange: (startRow) => ({
      getDisplayValues: () => [
        startRow === 1 ? headers : row,
      ],
    }),
  };

  const loaded = context.carregarLeadsRetomadas_(sheet)[
    "+5511999999999"
  ];

  assert.equal(loaded.nome, "Marina Souza");
  assert.equal(loaded.referencia, "");
});

test("reads permanent blocks and the automatic follow-up suspension", () => {
  const headers = Array(29).fill("");
  headers[2] = "Telefone (E.164)";
  headers[25] = "Nunca retomar";
  headers[26] = "Nunca responder com robô";
  headers[27] = "Motivo / observação do bloqueio";
  headers[28] = "Suspender retomada automática";
  const row = Array(29).fill("");
  row[2] = "+5511999999999";
  row[25] = true;
  row[26] = "Sim";
  row[28] = true;
  const sheet = {
    getLastRow: () => 2,
    getLastColumn: () => 29,
    getRange: (startRow) => ({
      getDisplayValues: () => [
        startRow === 1 ? headers : row,
      ],
    }),
  };

  const loaded = context.carregarLeadsRetomadas_(sheet)[
    "+5511999999999"
  ];

  assert.equal(loaded.neverFollowUp, true);
  assert.equal(loaded.neverBotReply, true);
  assert.equal(loaded.suspendAutomaticFollowUp, true);
});

test("automatic follow-up revalidation cancels suspension and new activity", () => {
  const now = new Date("2026-08-03T10:35:00-03:00");
  const leadData = {
    status: "Novo",
    resumo: "Pesquisa sobre lifting facial",
    proximaAcao: "",
    neverFollowUp: false,
    neverBotReply: false,
    suspendAutomaticFollowUp: false,
  };
  const conversationData = [
    {
      direcao: "IN",
      dataHora: new Date("2026-08-02T18:00:00-03:00"),
      messageId: "in-1",
      texto: "Quero entender melhor o lifting facial.",
    },
    {
      direcao: "OUT",
      dataHora: new Date("2026-08-02T18:01:00-03:00"),
      messageId: "out-1",
      texto: "Claro, posso te orientar.",
    },
  ];
  const plan = {
    etapa: 1,
    atrasoMinutos: 5,
    messageIdBase: "out-1",
    sugestao: "Olá! Fiquei à disposição para continuar.",
  };

  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      leadData,
      conversationData,
      now,
    ).ok,
    true,
  );
  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      { ...leadData, suspendAutomaticFollowUp: true },
      conversationData,
      now,
    ).reason,
    "suspended_in_leads",
  );
  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      leadData,
      conversationData.concat({
        direcao: "IN",
        dataHora: new Date("2026-08-03T10:31:00-03:00"),
        messageId: "in-2",
        texto: "Obrigada, já resolvi.",
      }),
      now,
    ).reason,
    "conversation_changed",
  );
});

test("human approval permits the exact second or price follow-up but never bypasses safety", () => {
  const now = new Date("2026-08-14T10:35:00-03:00");
  const leadData = {
    status: "Qualificado",
    resumo: "Paciente perguntou o valor do procedimento",
    proximaAcao: "",
    neverFollowUp: false,
    neverBotReply: false,
    suspendAutomaticFollowUp: false,
  };
  const conversationData = [
    {
      direcao: "IN",
      dataHora: new Date("2026-08-13T18:00:00-03:00"),
      messageId: "in-1",
      texto: "Queria entender o valor.",
    },
    {
      direcao: "OUT",
      dataHora: new Date("2026-08-13T18:01:00-03:00"),
      messageId: "out-1",
      texto: "Vou deixar essa informação para a equipe revisar.",
    },
  ];
  const plan = {
    etapa: 2,
    atrasoMinutos: 5,
    messageIdBase: "out-1",
    sugestao: "Mensagem exata revisada pela equipe.",
    aprovadoPelaEquipe: true,
  };

  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      leadData,
      conversationData,
      now,
    ).ok,
    true,
  );
  assert.equal(
    context.validarRetomadaAutomatica_(
      { ...plan, aprovadoPelaEquipe: false },
      leadData,
      conversationData,
      now,
    ).reason,
    "only_first_followup",
  );
  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      { ...leadData, neverFollowUp: true },
      conversationData,
      now,
    ).reason,
    "suspended_in_leads",
  );
  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      { ...leadData, resumo: "A aparência arruinou minha vida" },
      conversationData,
      now,
    ).reason,
    "sensitive_context",
  );
  assert.equal(
    context.validarRetomadaAutomatica_(
      plan,
      leadData,
      conversationData.concat({
        direcao: "IN",
        dataHora: new Date("2026-08-14T10:34:00-03:00"),
        messageId: "in-2",
        texto: "Não precisa mais, obrigada.",
      }),
      now,
    ).reason,
    "conversation_changed",
  );
});

test("first follow-up addresses the objection and second sends one proof", () => {
  const material = context.selecionarMaterialRetomada_(
    lead(),
    conversation([
      "Tenho medo de ficar com o rosto artificial",
      "A avaliação respeita sua identidade.",
    ]),
    "tenho medo de ficar com o rosto artificial lifting facial",
    2,
    false,
  );
  const first = context.sugerirMensagemRetomada_(
    1,
    false,
    null,
    false,
    false,
    "manter naturalidade, expressão e identidade",
    true,
  );
  const second = context.sugerirMensagemRetomada_(
    2,
    false,
    material,
    false,
    false,
    "manter naturalidade, expressão e identidade",
    true,
  );

  assert.equal(
    material.url,
    "https://draamandaschroeder.com.br/conteudos/naturalidade-envelhecimento/",
  );
  assert.match(first, /principal preocupação/);
  assert.match(first, /avaliação com a Dra\. Amanda/);
  assert.doesNotMatch(first, /agenda|horário/);
  assert.doesNotMatch(first, /https:/);
  assert.match(second, /conteúdo da Dra\. Amanda/);
  assert.match(second, /conversa com a sua dúvida/);
  assert.match(second, /pode ler com calma/);
  assert.match(second, /continuo exatamente desse ponto/);
  assert.doesNotMatch(second, /última retomada|inconveniente/);
  assert.match(second, /https:/);
});

test("does not repeat a site link or use a generic link for price", () => {
  const cases = [
    {
      patientLead: lead(),
      contextText: "qual o valor da cirurgia",
      priority: true,
    },
    {
      patientLead: lead({
        plataforma: "Orgânico/Conteúdo",
        referencia: "SITE-PAGE-lifting-facial",
      }),
      contextText: "lifting facial",
      priority: false,
    },
  ];

  for (const item of cases) {
    assert.equal(
      context.selecionarMaterialRetomada_(
        item.patientLead,
        conversation(["Olá", "Como posso ajudar?"]),
        item.contextText,
        2,
        item.priority,
      ),
      null,
    );
  }
});

test("does not repeat a site link and reserves material for the last follow-up", () => {
  const withLink = conversation([
    "Quero saber sobre lifting",
    "Veja https://draamandaschroeder.com.br/lifting-facial/",
  ]);

  assert.equal(
    context.selecionarMaterialRetomada_(
      lead(),
      withLink,
      "lifting facial",
      2,
      false,
    ),
    null,
  );
  assert.equal(
    context.selecionarMaterialRetomada_(
      lead(),
      conversation(["Lifting", "Como posso ajudar?"]),
      "lifting facial",
      1,
      false,
    ),
    null,
  );
});

test("suppresses commercial material for intense appearance distress", () => {
  assert.equal(
    context.selecionarMaterialRetomada_(
      lead(),
      conversation([
        "Odeio meu rosto, ele acabou com minha vida",
        "Entendo como isso pode pesar.",
      ]),
      "odeio meu rosto ele acabou com minha vida",
      2,
      false,
    ),
    null,
  );
});

test("excludes intense distress and explicit opt-out from commercial follow-up", () => {
  const blockedContexts = [
    "odeio meu rosto ele acabou com minha vida",
    "nao quero mais interesse",
    "nao me envie mensagens",
    "nao entre mais em contato",
    "pode encerrar o atendimento",
    "somos uma agencia de marketing e temos uma proposta comercial",
    "oferecemos gestao de trafego pago para captar mais pacientes",
  ];

  for (const contextText of blockedContexts) {
    assert.equal(
      context.retomadaComercialPermitida_(contextText),
      false,
      contextText,
    );
  }

  assert.equal(
    context.retomadaComercialPermitida_(
      "estou pesquisando lifting facial e ainda tenho duvidas",
    ),
    true,
  );
});

test("follow-up sequence stays warm, unhurried and respectful", () => {
  const price = context.sugerirMensagemRetomada_(
    1,
    true,
    null,
    false,
    true,
    "",
    false,
    "lifting facial",
  );
  const schedule = context.sugerirMensagemRetomada_(
    1,
    true,
    null,
    true,
    false,
    "",
    false,
    "lifting facial",
  );
  const general = context.sugerirMensagemRetomada_(
    1,
    false,
    null,
    false,
    false,
    "",
    false,
    "lifting facial",
  );
  const second = context.sugerirMensagemRetomada_(
    2,
    false,
    null,
    false,
    false,
    "",
    false,
    "lifting facial",
    "Marina Souza",
  );
  assert.match(price, /o valor e o que está incluído/);
  assert.match(schedule, /duas opções reais/);
  assert.match(general, /nossa conversa sobre lifting facial/);
  assert.match(general, /Ficou alguma dúvida/);
  assert.match(general, /como funciona a avaliação/);
  assert.doesNotMatch(general, /agenda|horário|caminhos/);
  assert.match(second, /nossa conversa sobre lifting facial/);
  assert.match(second, /^Oi, Marina!/);
  assert.match(second, /deixar você à vontade por aqui/);
  assert.match(second, /sem novas mensagens/);
  assert.match(second, /quando for um bom momento para você/);
  assert.match(second, /Vou ficar feliz em ajudar/);
  assert.doesNotMatch(
    second,
    /encerrar minhas retomadas|última retomada|inconveniente/,
  );
});

test("last follow-up uses a neutral greeting when the LEADS name is unsafe", () => {
  const unsafeNames = [
    "",
    "Não informado",
    "+55 11 99999-9999",
    "Clínica Exemplo",
    "Paciente",
  ];

  for (const name of unsafeNames) {
    const message = context.sugerirMensagemRetomada_(
      2,
      false,
      null,
      false,
      false,
      "",
      false,
      "lifting facial",
      name,
    );
    assert.match(message, /^Olá!/);
    assert.doesNotMatch(
      message,
      /Oi, Não|Oi, Clínica|Oi, Paciente|\+55/,
    );
  }
});

test("second follow-up gives one concrete proof and closes proactive contact", () => {
  const price = context.sugerirMensagemRetomada_(
    2,
    true,
    null,
    false,
    true,
  );
  const schedule = context.sugerirMensagemRetomada_(
    2,
    true,
    null,
    true,
    false,
  );

  assert.match(price, /orçamento cirúrgico reúne/);
  assert.match(price, /honorários, hospital, anestesia, materiais e acompanhamento/);
  assert.match(price, /continuar exatamente desse ponto/);
  assert.match(schedule, /possibilidades, limites, recuperação e orçamento/);
  assert.match(schedule, /nada precisa ser decidido naquele momento/);
  assert.match(schedule, /duas opções reais de horário/);
  assert.doesNotMatch(
    price + schedule,
    /última retomada|inconveniente/,
  );
});

test("daily care agenda consolidates appointments, post-consult, birthdays and surgical follow-up", () => {
  const headers = [
    "Telefone (E.164)",
    "Nome do paciente",
    "Profissional",
    "Tema / procedimento",
    "Data agendada",
    "Horário agendado",
    "Status",
    "Consentimento para contato",
    "Data de nascimento",
    "Aniversário pelo bot",
    "Último aniversário contatado",
    "Checagem pós-consulta",
    "Data prevista da checagem",
    "Data da checagem realizada",
    "Data realizada",
    "Pós-consulta elegível em",
    "Pós-consulta enviado",
    "Pós-consulta suprimido em",
    "Erro pós-consulta",
    "Retomada pelo bot",
    "Data da próxima retomada",
    "Próxima ação",
    "Retomadas encerradas?",
    "Lembrete 48h enviado",
    "Lembrete no dia enviado",
    "Confirmação da paciente",
    "Motivo de supressão",
  ];
  const makeRow = (values) =>
    headers.map((header) => values[header] ?? "");
  const rows = [
    makeRow({
      "Telefone (E.164)": "+5511900000001",
      "Nome do paciente": "Ana",
      Status: "Consulta realizada",
      "Consentimento para contato": "Sim",
      "Data de nascimento": "1980-07-29",
      "Aniversário pelo bot": "Sim",
    }),
    makeRow({
      "Telefone (E.164)": "+5511900000002",
      "Nome do paciente": "Beatriz",
      Status: "Consulta realizada",
      "Consentimento para contato": "Sim",
      "Checagem pós-consulta": "Sim",
      "Data prevista da checagem": "2026-07-29 09:00",
      "Data realizada": "2026-07-29",
      "Pós-consulta elegível em": "2026-07-29 10:00",
      "Erro pós-consulta": "post_consult_disabled",
    }),
    makeRow({
      "Telefone (E.164)": "+5511900000003",
      "Nome do paciente": "Carla",
      Profissional: "Dra. Amanda",
      "Data agendada": "2026-07-30",
      "Horário agendado": "10:00",
      Status: "Consulta agendada",
      "Consentimento para contato": "Sim",
    }),
    makeRow({
      "Telefone (E.164)": "+5511900000004",
      "Nome do paciente": "Diana",
      Status: "Consulta realizada",
      "Consentimento para contato": "Sim",
      "Retomada pelo bot": "Sim",
      "Data da próxima retomada": "2026-07-29",
      "Próxima ação":
        "Confirmar hospital e data da cirurgia",
    }),
    makeRow({
      "Telefone (E.164)": "+5511900000005",
      "Nome do paciente": "Elisa",
      Status: "Consulta realizada",
      "Consentimento para contato": "Não",
      "Data de nascimento": "1985-07-29",
      "Aniversário pelo bot": "Sim",
    }),
  ];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getDataRange: () => ({
      getValues: () => [headers, ...rows],
    }),
  };
  const agenda = context.criarAgendaCuidadosConsultas_(
    sheet,
    new Date("2026-07-29T08:00:00-03:00"),
  );
  const categories = agenda.map((item) => item.categoria);

  assert.ok(categories.includes("Aniversário"));
  assert.ok(categories.includes("Lembrete de consulta"));
  assert.ok(
    categories.includes("Pós-consulta aguardando ativação"),
  );
  assert.ok(
    categories.includes("Checagem humana pós-consulta"),
  );
  assert.ok(categories.includes("Jornada cirúrgica"));
  assert.equal(
    agenda.every((item) => String(item.sugestao || "").trim()),
    true,
  );
  assert.equal(
    agenda.some((item) => item.nome === "Elisa"),
    false,
  );
  const appointmentReminder = agenda.find(
    (item) => item.nome === "Carla",
  );
  assert.match(appointmentReminder.sugestao, /Rua Pais Leme, 215/);
  assert.match(appointmentReminder.sugestao, /maps\.google\.com/);
});

test("no-show appears as a gentle manual rebooking action", () => {
  const headers = [
    "Telefone (E.164)",
    "Nome do paciente",
    "Profissional",
    "Status",
    "Consentimento para contato",
    "Não comparecimento registrado em",
    "Retomada de ausência elegível em",
    "Retomada manual de ausência sugerida em",
    "Erro na retomada de ausência",
  ];
  const row = headers.map((header) => ({
    "Telefone (E.164)": "+5511900000099",
    "Nome do paciente": "Luciana",
    Profissional: "Dra. Amanda",
    Status: "Não compareceu",
    "Consentimento para contato": "Sim",
    "Não comparecimento registrado em": "2026-08-04 11:00",
    "Retomada de ausência elegível em": "2026-08-04 13:00",
    "Retomada manual de ausência sugerida em": "2026-08-04 13:00",
    "Erro na retomada de ausência": "whatsapp_window_closed_manual",
  })[header] ?? "");
  const sheet = {
    getLastRow: () => 2,
    getDataRange: () => ({ getValues: () => [headers, row] }),
  };
  const agenda = context.criarAgendaCuidadosConsultas_(
    sheet,
    new Date("2026-08-04T12:00:00-03:00"),
  );
  const item = agenda.find(
    (entry) =>
      entry.categoria === "Não comparecimento — retomada humana",
  );

  assert.equal(item.automatico, false);
  assert.equal(item.responsavel, "Amanda/equipe");
  assert.match(item.sugestao, /esperamos que esteja tudo bem/);
  assert.doesNotMatch(item.sugestao, /penalidade|cobrança/i);
});

test("care agenda appears before commercial follow-ups and drafts only manual care", () => {
  const automatic = {
    categoria: "Lembrete de consulta",
    telefone: "+5511999999999",
    nome: "Ana",
    horario: "09:00",
    contexto: "Consulta amanhã às 10:00",
    responsavel: "Bruna/automação",
    automatico: true,
    futuro: false,
    sugestao: "",
  };
  const manual = {
    categoria: "Checagem humana pós-consulta",
    telefone: "+5511888888888",
    nome: "Bia",
    horario: "11:00",
    contexto: "Confirmar se ficaram dúvidas.",
    responsavel: "Amanda/equipe",
    automatico: false,
    futuro: false,
    sugestao: "Oi, Bia! Como você ficou depois da consulta?",
  };
  const text = context.montarTextoEmailRetomadas_(
    [],
    [],
    "29/07/2026",
    [automatic, manual],
  );
  const html = context.montarHtmlEmailRetomadas_(
    [],
    [],
    "29/07/2026",
    [automatic, manual],
  );

  assert.match(
    text,
    /ENVIOS AUTOMÁTICOS PREVISTOS HOJE \(1\)/,
  );
  assert.match(
    text,
    /AÇÕES HUMANAS SUGERIDAS HOJE \(1\)/,
  );
  assert.match(text, /Checagem humana pós-consulta/);
  assert.match(text, /Como você ficou depois da consulta/);
  assert.match(
    html,
    /Envios automáticos previstos hoje \(1\)/,
  );
  assert.match(
    html,
    /Ações humanas sugeridas hoje \(1\)/,
  );
  assert.match(html, /Nada desta seção é enviado automaticamente/);
});

test("later post-consult and old-client contacts stay manual with a ready message", () => {
  const headers = [
    "Telefone (E.164)",
    "Nome do paciente",
    "Tema / procedimento",
    "Status",
    "Consentimento para contato",
    "Data realizada",
    "Retomada pelo bot",
    "Periodicidade da retomada",
    "Retomadas encerradas?",
  ];
  const makeRow = (values) =>
    headers.map((header) => values[header] ?? "");
  const rows = [
    makeRow({
      "Telefone (E.164)": "+5511900000010",
      "Nome do paciente": "Fernanda",
      "Tema / procedimento": "lifting facial",
      Status: "Consulta realizada",
      "Consentimento para contato": "Sim",
      "Data realizada": "2026-07-26",
    }),
    makeRow({
      "Telefone (E.164)": "+5511900000011",
      "Nome do paciente": "Gabriela",
      Status: "Consulta realizada",
      "Consentimento para contato": "Sim",
      "Data realizada": "2026-01-30",
      "Retomada pelo bot": "Sim",
    }),
  ];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getDataRange: () => ({
      getValues: () => [headers, ...rows],
    }),
  };
  const agenda = context.criarAgendaCuidadosConsultas_(
    sheet,
    new Date("2026-07-29T08:00:00-03:00"),
  );
  const postConsult = agenda.find(
    (item) =>
      item.categoria === "Follow-up pós-consulta — 3 dias",
  );
  const oldClient = agenda.find(
    (item) =>
      item.categoria === "Cliente antigo — retomada humana",
  );

  assert.equal(postConsult.automatico, false);
  assert.equal(postConsult.horario, "11:00");
  assert.match(postConsult.sugestao, /avaliação sobre lifting facial/);
  assert.match(postConsult.sugestao, /continuar por ele/);
  assert.equal(oldClient.automatico, false);
  assert.equal(oldClient.horario, "16:30");
  assert.match(oldClient.sugestao, /desde seu atendimento na Clínica LIV/);
  assert.match(oldClient.sugestao, /retomar seu acompanhamento/);
  assert.doesNotMatch(oldClient.contexto, /lifting facial/i);
});
