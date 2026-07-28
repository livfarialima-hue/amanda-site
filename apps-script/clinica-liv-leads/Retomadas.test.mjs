import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("./Retomadas.gs", import.meta.url),
  "utf8",
);
const context = vm.createContext({
  Utilities: {
    formatDate: () => "27/07/2026 09:00",
  },
});

vm.runInContext(source, context, {
  filename: "Retomadas.gs",
});

test("sends the daily follow-up email to Amanda and Daniel", () => {
  assert.match(
    source,
    /destinatario:\s*"amandaschh@hotmail\.com, daniel\.added@gmail\.com"/,
  );
});

test("waits at least 24 hours when the patient says she will return", () => {
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
      new Date("2026-07-29T12:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    context.mensagemIndicaRetornoFuturo_(
      "Mais pra frente eu entro em contato com vocês.",
    ),
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
    }),
    "bruna",
  );
  assert.equal(
    context.responsavelRetomada_({
      etapa: { numero: 1 },
      contextoAgenda: false,
      contextoPreco: true,
    }),
    "equipe",
  );
  assert.equal(
    context.responsavelRetomada_({
      etapa: { numero: 2 },
      contextoAgenda: false,
      contextoPreco: false,
    }),
    "equipe",
  );
});

test("daily email is informational and drafts only the human actions", () => {
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
    sugestao: "Mensagem que não deve aparecer na ação humana.",
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
  );
  const html = context.montarHtmlEmailRetomadas_(
    [planned, human],
    [human],
    "28/07/2026",
  );

  assert.match(text, /apenas informativo/);
  assert.match(text, /PLANO DO DIA \(2\)/);
  assert.match(text, /AÇÃO SUGERIDA PARA AMANDA\/EQUIPE \(1\)/);
  assert.match(text, /Mensagem sugerida para a equipe/);
  assert.doesNotMatch(
    text,
    /Mensagem que não deve aparecer na ação humana/,
  );
  assert.match(html, /Plano do dia \(2\)/);
  assert.match(html, /Ação sugerida para Amanda\/equipe \(1\)/);
  assert.match(html, /Mensagem sugerida para a equipe/);
  assert.doesNotMatch(
    html,
    /Mensagem que não deve aparecer na ação humana/,
  );
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
      assert.deepEqual(
        [startRow, startColumn, rowCount, columnCount],
        [2, 1, 1, 25],
      );
      return { getDisplayValues: () => [row] };
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
});

test("first follow-up offers a specific facial resource without pressure", () => {
  const material = context.selecionarMaterialRetomada_(
    lead(),
    conversation([
      "Tenho medo de ficar com o rosto artificial",
      "A avaliação respeita sua identidade.",
    ]),
    "tenho medo de ficar com o rosto artificial lifting facial",
    1,
    false,
  );
  const message = context.sugerirMensagemRetomada_(
    1,
    false,
    material,
    false,
    false,
  );

  assert.equal(
    material.url,
    "https://draamandaschroeder.com.br/conteudos/naturalidade-envelhecimento/",
  );
  assert.match(message, /Lembrei da sua dúvida/);
  assert.match(message, /Talvez ele ajude você a pensar com calma/);
  assert.match(message, /Se quiser/);
});

test("does not add a site link to price, scheduling or website-origin follow-ups", () => {
  const cases = [
    {
      patientLead: lead(),
      contextText: "qual o valor da cirurgia",
      priority: true,
    },
    {
      patientLead: lead(),
      contextText: "quero agendar uma consulta",
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
        1,
        item.priority,
      ),
      null,
    );
  }
});

test("does not repeat a site link or use material in later follow-ups", () => {
  const withLink = conversation([
    "Quero saber sobre lifting",
    "Veja https://draamandaschroeder.com.br/lifting-facial/",
  ]);

  assert.equal(
    context.selecionarMaterialRetomada_(
      lead(),
      withLink,
      "lifting facial",
      1,
      false,
    ),
    null,
  );
  assert.equal(
    context.selecionarMaterialRetomada_(
      lead(),
      conversation(["Lifting", "Como posso ajudar?"]),
      "lifting facial",
      2,
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
      1,
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
  );
  const schedule = context.sugerirMensagemRetomada_(
    1,
    true,
    null,
    true,
    false,
  );
  const general = context.sugerirMensagemRetomada_(
    1,
    false,
    null,
    false,
    false,
  );
  const second = context.sugerirMensagemRetomada_(
    2,
    false,
    null,
    false,
    false,
  );
  const last = context.sugerirMensagemRetomada_(
    3,
    false,
    null,
    false,
    false,
  );

  assert.match(price, /É uma dúvida importante/);
  assert.match(schedule, /pensar com calma/);
  assert.match(schedule, /sem compromisso/);
  assert.match(general, /não precisa decidir nada agora/);
  assert.match(second, /sem pressa/);
  assert.match(last, /para não ser inconveniente/);
  assert.match(last, /em outro momento/);
});

test("second follow-up continues the pending price or scheduling thread", () => {
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

  assert.match(price, /dúvida sobre valores/);
  assert.match(price, /exatamente desse ponto/);
  assert.match(schedule, /um dia possível/);
  assert.match(schedule, /está tudo bem/);
});
