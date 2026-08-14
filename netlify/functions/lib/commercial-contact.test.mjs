import assert from "node:assert/strict";
import test from "node:test";

import { isCommercialSolicitation } from "./commercial-contact.mjs";

test("detects Google Business Profile sales offers without blocking location questions", () => {
  for (const text of [
    "Trabalho com gestão e otimização do Perfil da Empresa no Google para conquistar clientes de forma orgânica.",
    "Posso apresentar nosso trabalho de otimização do Google Meu Negócio?",
    "Ajudamos empresas a ter mais visibilidade no Google Maps e atrair novos clientes.",
  ]) {
    assert.equal(isCommercialSolicitation(text), true, text);
  }

  for (const text of [
    "Pode me mandar a localização da clínica no Google Maps?",
    "Encontrei a Dra. Amanda no Google e quero marcar uma consulta.",
    "Qual é o valor da avaliação?",
  ]) {
    assert.equal(isCommercialSolicitation(text), false, text);
  }
});
