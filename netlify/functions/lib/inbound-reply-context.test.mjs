import assert from "node:assert/strict";
import test from "node:test";
import { refreshInboundReplyContext } from "./inbound-reply-context.mjs";
import { appendConversationTurn, readConversationTurns } from "./conversation-memory.mjs";
import { planAutomation } from "./whatsapp-automation.mjs";
import { buildConsultationQuestionBundle } from "./consultation-question-bundle.mjs";

const phone = "+5511900000000";
const start = Date.parse("2026-09-26T12:00:00Z");
function turn(text, index, extra = {}) {
  return { text, eventId: `fragment-${index}`, role: "user", source: "patient",
    at: new Date(start + index * 30_000).toISOString(), ...extra };
}
const messages = [
  "O pescoço é o que mais me incomoda.",
  "Gostaria de saber valores da consulta e se é possível online.",
  "Tenho convênio Bradesco.",
  "Se não aceitar, preciso de relatório para reembolso.",
  "E qual a média de valores para lifting?",
].map((text, index) => turn(text, index));
const input = {phone, text: messages.at(-1).text, eventId: messages.at(-1).eventId,
  receivedAt: messages.at(-1).at, recentConversation: []};

test("late cache refresh supplies all five questions even if older workers have not reached LEADS", async () => {
  let value = null, revision = 0;
  const store = {
    get: async () => structuredClone(value),
    getWithMetadata: async () => value ? {data: structuredClone(value), etag: String(revision)} : null,
    setJSON: async (_key, data, options = {}) => {
      if ((options.onlyIfNew && value) || (options.onlyIfMatch && options.onlyIfMatch !== String(revision))) return {modified: false};
      value = structuredClone(data); revision++; return {modified: true};
    },
  };
  const deps = {getStoreImpl: () => store, now: start + 300_000};
  // Persist in a different order: processing order must not erase earlier inputs.
  for (const index of [4, 1, 3, 0, 2]) {
    assert.equal((await appendConversationTurn({phone, ...messages[index]}, deps)).status, "completed");
  }
  const result = await refreshInboundReplyContext(input, {
    readConversationTurnsImpl: p => readConversationTurns(p, deps),
  });
  assert.equal(result.status, "completed");
  assert.equal(result.block.blockTurnCount, 5);
  assert.equal(result.block.text, messages.map(m => m.text).join("\n"));
  const plan = planAutomation({text: result.block.text, messageType: "text"});
  const draft = buildConsultationQuestionBundle({plan, text: result.block.text});
  assert.equal(plan.reason, "consultation_question_bundle");
  assert.match(draft.body, /R\$ 500/);
  assert.match(draft.body, /online/);
  assert.match(draft.body, /relatório/);
  assert.match(draft.body, /reembolso/);
  assert.match(draft.body, /pescoço apenas ou também para o rosto/);
});

for (const boundary of [
  {role: "assistant", source: "human", text: "Já te expliquei os valores."},
  {text: "Vou pensar com calma e depois volto"},
  {text: "Mensagem de campanha", templateId: "procedure_evaluation_v1"},
]) {
  test(`refresh respects the existing boundary: ${boundary.source || boundary.templateId || 'decline'}`, async () => {
    const result = await refreshInboundReplyContext(input, {
      readConversationTurnsImpl: async () => ({status: "completed", turns: [messages[0], turn(boundary.text, 3, boundary)]}),
    });
    assert.equal(result.block.coalesced, false);
    assert.equal(result.block.text, input.text);
  });
}

test("fresh history is merged with the canonical snapshot and deduplicated by event", async () => {
  const result = await refreshInboundReplyContext({...input, recentConversation: messages.slice(0, 3)}, {
    readConversationTurnsImpl: async () => ({status: "completed", turns: messages.slice(2)}),
  });
  assert.equal(result.block.blockTurnCount, 5);
  assert.equal(result.block.text, messages.map(m => m.text).join("\n"));
});

test("an unavailable refresh is distinguishable from an empty conversation", async () => {
  for (const readConversationTurnsImpl of [async () => ({status: "failed", turns: []}), async () => {throw Error('offline');}]) {
    const result = await refreshInboundReplyContext(input, {readConversationTurnsImpl});
    assert.equal(result.status, "failed");
  }
});
