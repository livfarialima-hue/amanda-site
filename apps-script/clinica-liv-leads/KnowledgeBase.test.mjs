import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./KnowledgeBase.gs", import.meta.url),
  "utf8",
);

function runtime() {
  const context = vm.createContext({ console });
  vm.runInContext(source, context, { filename: "KnowledgeBase.gs" });
  return context;
}

test("knowledge matching ignores common words and prioritizes the subject", () => {
  const context = runtime();
  const score = vm.runInContext(
    `pontuarConhecimento_(
      "A clínica tem estacionamento?",
      "Estacionamento da clínica",
      "Onde estacionar; tem estacionamento",
      ""
    )`,
    context,
  );

  assert.ok(score > 0.8);
});

test("only promoted rules from the active snapshot become candidates", () => {
  const context = runtime();
  const active = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-1", "Aprovada", "Automática", "Baixo", "Assunto", "", "Resposta",
      "", "", "", "", "", "", "", "", "", "1", "active", "kb-2026-08-11"
    ], new Date("2026-08-09T12:00:00Z"), "kb-2026-08-11")`,
    context,
  );
  const highRisk = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-2", "Aprovada", "Automática", "Alto", "Assunto", "", "Resposta",
      "", "", "", "", "", "", "", "", "", "1", "active", "kb-2026-08-11"
    ], new Date("2026-08-09T12:00:00Z"), "kb-2026-08-11")`,
    context,
  );

  assert.equal(active, true);
  assert.equal(highRisk, false);
  const draft = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-3", "Aprovada", "Automática", "Baixo", "Assunto", "", "Resposta",
      "", "", "", "", "", "", "", "", "", "1", "review", "kb-2026-08-11"
    ], new Date("2026-08-09T12:00:00Z"), "kb-2026-08-11")`,
    context,
  );
  assert.equal(draft, false);
});

test("captured human answers default to safer modes by risk", () => {
  const context = runtime();

  assert.equal(
    vm.runInContext(`modoPadraoConhecimento_("Baixo")`, context),
    "Automática",
  );
  assert.equal(
    vm.runInContext(`modoPadraoConhecimento_("Médio")`, context),
    "Sugestão interna",
  );
  assert.equal(
    vm.runInContext(`modoPadraoConhecimento_("Alto")`, context),
    "Nunca automática",
  );
});

test("unknown reviews keep a draft only for low or medium internal use", () => {
  const context = runtime();
  const input = {
    suggestedReply:
      "Resposta contextual para a equipe conferir antes de copiar.",
  };

  assert.equal(
    context.rascunhoInternoAprendizadoSeguro_(input, "Médio"),
    input.suggestedReply,
  );
  assert.equal(
    context.rascunhoInternoAprendizadoSeguro_(input, "Alto"),
    "",
  );
});

test("an unanswered unknown creates an operational response review with context", () => {
  const context = runtime();
  let recorded = null;
  context.registrarRevisaoBot_ = (_spreadsheet, input) => {
    recorded = input;
    return { ok: true, created: true, row: 2 };
  };
  const result = context.registrarRevisaoDuvidaBot_(
    {},
    {
      eventId: "evt-synthetic",
      phone: "+5511999999999",
      patientName: "Paciente Teste",
      receivedAt: new Date("2026-08-20T12:19:00-03:00"),
      subject: "comparação de técnicas",
      status: "Aguardando resposta humana",
      suggestedReply: "Rascunho seguro para conferência.",
      confidence: "low",
    },
    "Médio",
    "Qual é a diferença entre as técnicas?",
    "bruna: Posso te orientar.",
    new Date("2026-08-20T12:19:10-03:00"),
  );

  assert.equal(result.ok, true);
  assert.equal(recorded.type, "Resposta");
  assert.equal(recorded.priority, "Alta");
  assert.equal(recorded.status, "Aberta");
  assert.equal(recorded.key, "unknown-response:evt-synthetic");
  assert.match(recorded.context, /Pergunta da paciente:/);
  assert.equal(recorded.suggestion, "Rascunho seguro para conferência.");
});
