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

test("only approved, current and non-high-risk rules become candidates", () => {
  const context = runtime();
  const active = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-1", "Aprovada", "Automática", "Baixo", "Assunto", "", "Resposta",
      "", "", "", "", ""
    ], new Date("2026-08-09T12:00:00Z"))`,
    context,
  );
  const highRisk = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-2", "Aprovada", "Automática", "Alto", "Assunto", "", "Resposta",
      "", "", "", "", ""
    ], new Date("2026-08-09T12:00:00Z"))`,
    context,
  );

  assert.equal(active, true);
  assert.equal(highRisk, false);
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
