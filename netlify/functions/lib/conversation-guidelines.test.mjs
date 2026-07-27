import assert from "node:assert/strict";
import test from "node:test";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";

test("conversion playbook defines the identity, progression and writing standard", () => {
  assert.match(CONVERSATION_GUIDELINES, /Eu sou a Bruna/);
  assert.match(CONVERSATION_GUIDELINES, /Como posso te chamar/);
  assert.match(CONVERSATION_GUIDELINES, /uma única pergunta útil/);
  assert.match(CONVERSATION_GUIDELINES, /responda brevemente à intenção/);
  assert.match(CONVERSATION_GUIDELINES, /Meta\/Facebook\/Instagram/);
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
