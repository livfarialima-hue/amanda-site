import assert from "node:assert/strict";
import test from "node:test";
import { conformOutboundReplyToContract, validateOutboundReply } from "./outbound-reply-gate.mjs";
import { runOpenAIShadow } from "./openai-shadow.mjs";

const history = [
  { role: "assistant", source: "bruna", text: "Na avaliação, a Dra. Amanda observa a região para entender as possibilidades. O que você gostaria de entender primeiro?" },
  { role: "user", text: "Tenho dúvidas se esse é o meu caso." },
  { role: "assistant", source: "bruna", text: "Entendo a sua dúvida. A indicação depende de uma avaliação presencial, em que a Dra. Amanda examina a região e conversa sobre possibilidades e limites. O que mais chamou sua atenção no pescoço?" },
  { role: "user", text: "Tenho algumas linhas de expressão que me incomodam." },
];
const current = "No pescoço";
const redundant = "Entendo a preocupação com as linhas no pescoço. Só a avaliação presencial permite entender se faz sentido para o seu caso e conversar sobre possibilidades e limites.";
const action = { action: "respond", replyContract: { maxLinks: 0, maxQuestions: 1, allowCta: false } };
const conform = (body, currentText = current, recentConversation = history) => conformOutboundReplyToContract({ body, currentText, recentConversation, conversationAction: action });

test("removes paraphrased consultation boilerplate while preserving the new answer", () => {
  const reply = conform(redundant + " Você não precisa chegar com a decisão de fazer uma cirurgia.");
  assert.equal(reply, "Você não precisa chegar com a decisão de fazer uma cirurgia.");
});

test("a purely repetitive answer cannot pass the final gate", () => {
  assert.equal(validateOutboundReply({ body: redundant, currentText: current, recentConversation: history, conversationAction: action }).allowed, false);
});

test("removes an already answered discovery question across different wording", () => {
  const reply = conform("Você não precisa escolher a técnica antes da consulta. O que mais te incomoda no pescoço?");
  assert.equal(reply, "Você não precisa escolher a técnica antes da consulta.");
});

test("does not offer to explain a consultation that was already explained", () => {
  const reply = conform("Você não precisa decidir pela cirurgia agora. Se quiser, posso explicar como funciona a avaliação.");
  assert.equal(reply, "Você não precisa decidir pela cirurgia agora.");
});

test("general repetition handling applies to other procedures and practical questions", () => {
  for (const procedure of ["blefaroplastia", "otoplastia", "mastopexia"]) {
    const recentConversation = [{ role: "assistant", text: `Na avaliação de ${procedure}, a Dra. Amanda examina a região e explica possibilidades e limites.` }];
    assert.equal(conform("A Dra. Amanda examina a região na avaliação e explica as possibilidades para o seu caso. A consulta custa R$ 500.", "Qual o valor da consulta?", recentConversation), "A consulta custa R$ 500.");
  }
});

test("an explicit request to hear the information again remains answerable", () => {
  const body = "A consulta custa R$ 500.";
  const recentConversation = [{ role: "assistant", text: body }];
  const currentText = "Pode repetir o valor da consulta?";
  assert.equal(conform(body, currentText, recentConversation), body);
  assert.equal(validateOutboundReply({ body, currentText, recentConversation, conversationAction: action }).allowed, true);
});

test("keeps a newly requested explanation and clinically necessary new information", () => {
  const body = "A indicação depende de uma avaliação presencial. A recuperação varia conforme o procedimento.";
  assert.equal(conform(body, "Mas como vou saber se tenho indicação? E a recuperação?"), body);
});

function decision(suggestedReply) {
  return { route: "standard_reply", confidence: "high", automaticAllowed: true, urgent: false,
    professional: "amanda", procedure: "lifting_cervical", replyCode: "", suggestedReply, reviewReason: "",
    conversationState: { activeTopic: "lifting cervical", patientAct: "answer", refersToEventId: "", lastClinicQuestion: "", lastClinicOffer: "", unresolvedQuestions: [], factsAlreadyProvided: [], owner: "bruna", nextExpectedAction: "responder", ambiguity: "", contextConfidence: "high" } };
}

async function modelRun(replies, overrides = {}) {
  const calls = [], signals = [];
  const result = await runOpenAIShadow({ phone: "+5511900000000", text: current, procedure: "lifting_cervical", recentConversation: history, replyContract: action.replyContract, ...overrides }, {
    env: { OPENAI_API_KEY: "synthetic", BRUNA_CONVERSION_EXPERIENCE_V1: "enabled" },
    fetchImpl: async (_url, options) => { calls.push(JSON.parse(options.body)); signals.push(options.signal); const reply = replies[Math.min(calls.length - 1, replies.length - 1)]; if (reply instanceof Error) throw reply; return new Response(JSON.stringify({ model: "test", output_text: JSON.stringify(decision(reply)) })); },
  });
  return { result, calls, signals };
}

test("model gets continuity facts and one bounded revision for a response without progress", async () => {
  const useful = "Você não precisa chegar com a decisão de fazer uma cirurgia.";
  const { result, calls, signals } = await modelRun([redundant, useful]);
  assert.equal(calls.length, 2);
  assert.equal(signals[0], signals[1], "revision shares the first request deadline");
  const input = JSON.parse(calls[0].input);
  assert.ok(input.replyContinuity.previouslyExplained.includes("consultation_process"));
  assert.match(JSON.stringify(input.replyContinuity.patientAnswer), /linhas de expressão/);
  assert.equal(result.decision.suggestedReply, useful);
  assert.equal(result.decision.automaticAllowed, true);
});

test("a second repetitive draft escalates with context instead of looping or sending empty text", async () => {
  const { result, calls } = await modelRun([redundant]);
  assert.equal(calls.length, 2);
  assert.equal(result.decision.route, "human_review");
  assert.equal(result.decision.automaticAllowed, false);
  assert.match(result.decision.reviewReason, /continuity/);
  assert.equal(result.decision.conversationState.owner, "human_team");
});

test("a useful first response does not make an extra model call", async () => {
  const { calls } = await modelRun(["Você não precisa escolher uma técnica antes da consulta."]);
  assert.equal(calls.length, 1);
});

test("revision timeout produces one contextual human review rather than retrying the event", async () => {
  const error = new Error("synthetic timeout"); error.name = "AbortError";
  const { result, calls } = await modelRun([redundant, error]);
  assert.equal(calls.length, 2);
  assert.equal(result.status, "completed");
  assert.equal(result.decision.route, "human_review");
  assert.equal(result.decision.automaticAllowed, false);
  assert.equal(result.decision.suggestedReply, "");
});
