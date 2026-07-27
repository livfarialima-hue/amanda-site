import assert from "node:assert/strict";
import test from "node:test";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";

test("conversion playbook defines the identity, progression and writing standard", () => {
  assert.match(CONVERSATION_GUIDELINES, /Eu sou a Bruna/);
  assert.match(CONVERSATION_GUIDELINES, /Como posso te chamar/);
  assert.match(CONVERSATION_GUIDELINES, /uma única pergunta útil/);
  assert.match(CONVERSATION_GUIDELINES, /responda brevemente à intenção/);
  assert.match(CONVERSATION_GUIDELINES, /Meta\/Facebook\/Instagram/);
  assert.match(CONVERSATION_GUIDELINES, /metaAdContext/);
  assert.match(CONVERSATION_GUIDELINES, /interesse legítimo na clínica/);
  assert.match(CONVERSATION_GUIDELINES, /não invente procedimento/);
  assert.match(CONVERSATION_GUIDELINES, /Google: intenção geralmente mais alta/);
});

test("playbook protects price, scheduling, continuity and human handoff", () => {
  assert.match(CONVERSATION_GUIDELINES, /appointment_review/);
  assert.match(CONVERSATION_GUIDELINES, /três opções/);
  assert.match(CONVERSATION_GUIDELINES, /nunca informe preço automaticamente/);
  assert.match(CONVERSATION_GUIDELINES, /mais de sete dias/);
  assert.match(CONVERSATION_GUIDELINES, /Não repita credenciais/);
  assert.match(CONVERSATION_GUIDELINES, /não tiver sido executada/);
});

test("playbook uses approved site content to reduce barriers without pressure", () => {
  assert.match(CONVERSATION_GUIDELINES, /siteResource/);
  assert.match(CONVERSATION_GUIDELINES, /única URL autorizada/);
  assert.match(CONVERSATION_GUIDELINES, /Não envie o link na primeira resposta/);
  assert.match(CONVERSATION_GUIDELINES, /Nunca diga nem insinue.*jovem/);
  assert.match(CONVERSATION_GUIDELINES, /preocupação financeira/);
  assert.match(CONVERSATION_GUIDELINES, /resultado artificial/);
});

test("playbook ignores commercial solicitations without a courtesy response", () => {
  assert.match(CONVERSATION_GUIDELINES, /proposta de parceria comercial/);
  assert.match(CONVERSATION_GUIDELINES, /Não gaste uma resposta de cortesia/);
  assert.match(CONVERSATION_GUIDELINES, /depois ficar claramente comercial/);
});

test("playbook ignores personal and unrelated approaches while preserving context", () => {
  assert.match(CONVERSATION_GUIDELINES, /convite pessoal, flerte, paquera/);
  assert.match(CONVERSATION_GUIDELINES, /assunto sem relação plausível/);
  assert.match(CONVERSATION_GUIDELINES, /não tente redirecionar a conversa/);
  assert.match(CONVERSATION_GUIDELINES, /use o histórico/);
  assert.match(CONVERSATION_GUIDELINES, /prefira human_review a ignore/);
});
