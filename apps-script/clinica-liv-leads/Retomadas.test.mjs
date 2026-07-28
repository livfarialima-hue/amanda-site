import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("./Retomadas.gs", import.meta.url),
  "utf8",
);
const context = vm.createContext({});

vm.runInContext(source, context, {
  filename: "Retomadas.gs",
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
