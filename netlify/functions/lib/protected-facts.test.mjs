import assert from "node:assert/strict";
import test from "node:test";
import { preservesKnowledgeLiterals } from "./knowledge-wording.mjs";

test("knowledge wording accepts only unambiguous equivalent BRL formatting", () => {
  for (const [source, draft] of [
    ["A consulta custa R$ 500.", "A consulta custa R$ 500,00."],
    ["O valor é R$ 1.500,00.", "O valor é R$ 1500."],
    ["O valor é R$ 500,50.", "O valor informado é R$500,50."],
  ]) assert.equal(preservesKnowledgeLiterals(draft, source), true, `${source} => ${draft}`);
  for (const draft of ["R$ 700", "R$ 500,01", "US$ 500", "R$ 500.00", "R$ 5,00", "R$ 500 mil", "R$ 500 e R$ 900", "-R$ 500", "R$ -500", "−R$ 500", "R$ 500k", "R$ 500 k", "R$ 500 K", "R$ 500 mi"]) {
    assert.equal(preservesKnowledgeLiterals(draft, "R$ 500"), false, draft);
  }
});

test("equivalent currency formatting cannot hide an added or removed monetary occurrence", () => {
  const source = "A consulta custa R$ 500.";
  for (const draft of ["A consulta custa R$ 500. Cada retorno custa R$ 500,00.",
    "A consulta custa R$ 500. Cada retorno custa R$ 500."]) {
    assert.equal(preservesKnowledgeLiterals(draft, source), false, draft);
    assert.equal(preservesKnowledgeLiterals(source, draft), false, draft);
  }
  assert.equal(preservesKnowledgeLiterals("Consulta R$ 500,00 e retorno R$ 500,00.", "Consulta R$ 500 e retorno R$ 500."), true);
  assert.equal(preservesKnowledgeLiterals("Consulta R$ 200 e exame R$ 500.", "Consulta R$ 500 e exame R$ 200."), false);
});

test("knowledge wording preserves quantities, units, links and bounded protected polarity", () => {
  for (const [source, draft] of [
    ["Em 10 a 14 dias.", "Em 10 a 14 semanas."],
    ["Em 24 a 48 horas.", "Em 24 a 48 dias."],
    ["Em 10 dias.", "Em 14 dias."],
    ["Não atendemos por convênio.", "Atendemos por convênio."],
    ["A consulta não vira crédito para a cirurgia.", "A consulta vira crédito para a cirurgia."],
    ["O reembolso não é garantido.", "O reembolso é garantido."],
    ["A consulta não está confirmada.", "A consulta está confirmada."],
    ["Veja https://example.test/consulta", "Veja https://example.test/cirurgia"],
    ["Veja https://example.test/consulta", "Sem link."],
  ]) assert.equal(preservesKnowledgeLiterals(draft, source), false, `${source} => ${draft}`);
  assert.equal(preservesKnowledgeLiterals("A previsão é de 10 dias a 14 dias.", "A previsão é de 10 a 14 dias."), true);
  assert.equal(preservesKnowledgeLiterals("A clínica não aceita convênios.", "Não atendemos por convênio."), true);
});
