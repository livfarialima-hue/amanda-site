import assert from "node:assert/strict";
import test from "node:test";
import { hasKnownPriorClinicInteraction } from "./bruna-conversion-experience.mjs";
import { applyFirstReplyGreetingGuard, applyReturningPatientReplyGuard } from "./openai-shadow.mjs";
import { planAutomation, enrichAutomationPlanFromConversation, isConsultationPriceRequest } from "./whatsapp-automation.mjs";
import { decideConversationAction } from "./conversation-action-controller.mjs";
import { buildConsultationInformationReply } from "./patient-replies.mjs";
import { buildSurgicalInitialPriceReply } from "./surgical-price-review.mjs";
import { conformOutboundReplyToContract, validateOutboundReply } from "./outbound-reply-gate.mjs";

const enabled = { BRUNA_CONVERSION_EXPERIENCE_V1: "true" };
const clinic = text => ({ role: "assistant", source: "bruna", text });
const history = [clinic("Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Posso te orientar sobre otoplastia.")];
const planFor = (text, recentConversation = history) => enrichAutomationPlanFromConversation(
  planAutomation({ text, messageType: "text", env: enabled }), recentConversation);
const actionFor = (text, plan, recentConversation) => decideConversationAction({
  text, plan, recentConversation, messageType: "text", conversionExperienceEnabled: true,
});

test("inbound prefill plus greeting does not masquerade as a previous clinic reply", () => {
  const recentConversation = [{ role: "user", source: "patient", text: "Bom dia" }];
  for (const delivery of [{}, { updated: true }, { duplicate: true, duplicateReason: "message_id" }]) {
    const priorInteractionKnown = hasKnownPriorClinicInteraction({ recentConversation, delivery });
    const decision = { route: "standard_reply", suggestedReply: "Posso te orientar sobre otoplastia. O que gostaria de entender primeiro?" };
    const guarded = applyFirstReplyGreetingGuard(applyReturningPatientReplyGuard(decision, null,
      { recentConversation, priorInteractionKnown }), { patientProfileName: "Lucas", recentConversation, priorInteractionKnown });
    assert.match(guarded.suggestedReply, /^Olá, Lucas! Eu sou a Bruna/);
  }
});

test("recovery of the first inbound does not invent a previous conversation from the duplicate write", () => {
  assert.equal(hasKnownPriorClinicInteraction({ recentConversation: [], delivery: {
    updated: true, duplicate: true, duplicateReason: "message_id",
  }}), false);
  assert.equal(hasKnownPriorClinicInteraction({ recentConversation: [], delivery: {
    updated: true, recoveredAfterTransientFailure: true,
  }}), false);
});

test("real clinic history and legacy continuity still prevent repeated introductions", () => {
  for (const turn of [clinic("Olá! Eu sou a Bruna."), { role: "assistant", source: "equipe_humana", text: "Posso ajudar." }]) {
    assert.equal(hasKnownPriorClinicInteraction({ recentConversation: [turn] }), true);
  }
  assert.equal(hasKnownPriorClinicInteraction({ delivery: { updated: true } }), true);
});

test("an ear-reduction price request stays specific and does not presume the otoplasty scope", () => {
  const text = "Eu gostaria de saber quanto é uma cirurgia para redução de orelha";
  const plan = planFor(text);
  assert.equal(plan.procedure, "otoplastia");
  assert.equal(plan.reason, "surgical_price_review");
  assert.equal(plan.automaticAllowed, false);
  assert.equal(plan.priceClarification, "ambiguous");
});

for (const text of ["Quanto fica para eu fazer uma consulta", "Quanto é a consulta?", "Quanto sai a avaliação?", "Qual o preço da consulta?"]) {
  test(`consultation price and optional next step survive the actual outbound contract: ${text}`, () => {
    assert.equal(isConsultationPriceRequest(text), true);
    const plan = planFor(text);
    const conversationAction = actionFor(text, plan, history);
    assert.ok(conversationAction.replyContract.unresolvedIntents.includes("price_consultation"));
    const body = buildConsultationInformationReply({ procedure: "otoplastia", consultationPriceRequested: true, conversionExperienceEnabled: true });
    const final = conformOutboundReplyToContract({ body, currentText: text, conversationAction, recentConversation: history });
    assert.match(final, /R\$ 500/);
    assert.match(final, /Se quiser, posso verificar opções de horário/);
    assert.doesNotMatch(final, /Quais dias|Eu sou a Bruna/);
    assert.equal(validateOutboundReply({ body: final, currentText: text, conversationAction, recentConversation: history }).allowed, true);
  });
}

test("time, postoperative care and deferred decisions cannot become a price or booking invitation", () => {
  for (const text of ["Quanto é o tempo de recuperação da otoplastia?", "Quanto tempo fica inchado?", "Quanto fica inchado depois da otoplastia?", "Quanto é o risco da cirurgia?"]) {
    const plan = planFor(text);
    assert.notEqual(plan.reason, "price_initial_information", text);
    assert.equal(isConsultationPriceRequest(text), false);
  }
  const text = "Obrigada, vou pensar e depois volto";
  const action = actionFor(text, planFor(text), history);
  assert.equal(action.replyContract.allowCta, false);
});

test("a useful availability offer is not repeated after being declined", () => {
  const recentConversation = [...history, clinic("Se quiser, posso verificar opções de horário."),
    { role: "user", text: "Vou pensar primeiro" }];
  const text = "Qual o valor da consulta?";
  const conversationAction = actionFor(text, planFor(text, recentConversation), recentConversation);
  const body = buildConsultationInformationReply({ consultationPriceRequested: true, conversionExperienceEnabled: true });
  const final = conformOutboundReplyToContract({ body, currentText: text, conversationAction, recentConversation });
  assert.match(final, /R\$ 500/);
  assert.doesNotMatch(final, /verificar opções/);
});

test("a price question with an explicit pause answers the price without an invitation", () => {
  const text = "Quanto fica a consulta? Não quero agendar agora, só estou pesquisando.";
  const conversationAction = actionFor(text, planFor(text), history);
  const body = buildConsultationInformationReply({ consultationPriceRequested: true, conversionExperienceEnabled: true });
  const final = conformOutboundReplyToContract({ body, currentText: text, conversationAction, recentConversation: history });
  assert.match(final, /R\$ 500/);
  assert.doesNotMatch(final, /verificar opções|Quais dias/);
});

test("otoplasty evaluation is specific, welcoming and leaves the decision with the person", () => {
  const body = buildConsultationInformationReply({ patientName: "Lucas", procedure: "otoplastia", introduceBruna: true });
  assert.match(body, /^Olá, Lucas! Eu sou a Bruna/);
  assert.match(body, /escuta o que você gostaria de mudar/);
  assert.match(body, /projeção, as dobras e as assimetrias de cada orelha/);
  assert.match(body, /tirar suas dúvidas com calma/);
  assert.doesNotMatch(body, /você precisa|seu caso|garanti|R\$|Quais dias|horário/i);
  assert.equal((body.match(/\?/g) || []).length, 1);
});
