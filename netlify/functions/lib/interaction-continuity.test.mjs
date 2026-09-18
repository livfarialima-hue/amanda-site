import assert from "node:assert/strict";
import test from "node:test";
import { planAutomation, enrichAutomationPlanFromConversation } from "./whatsapp-automation.mjs";
import { hasUnresolvedPatientRequest, clinicTurnInvitesResponse } from "./conversation-action-controller.mjs";
import { classifyHumanResume } from "./human-resume-policy.mjs";
import { usableProfileName, resolveContactIdentity } from "./profile-name.mjs";
import { enforcePrefillOnlyClassificationGuard } from "./lead-classifier.mjs";
import { coalesceUnansweredPatientBlock } from "./inbound-burst-context.mjs";
import { shouldHydrateConversationHistory } from "./conversation-memory.mjs";
import { approvedProcedureInformationFacts } from "./lifting-information.mjs";
import { runOpenAIShadow } from "./openai-shadow.mjs";

const opening = [
  { role: "user", source: "patient", text: "Quero informações de lifting cervical." },
  { role: "assistant", source: "bruna", text: "Posso te passar uma faixa geral de valores como ponto de partida." },
];
function plan(text, history = opening) {
  return enrichAutomationPlanFromConversation(planAutomation({ text, messageType: "text", platform: "WhatsApp direto" }), history);
}

test("polite acceptance fulfills the existing price offer once without asking again", () => {
  for (const text of ["Quero sim, por gentileza.", "Sim, por favor!", "Gostaria sim", "Pode me passar, por favor."]) {
    const result = plan(text);
    assert.equal(result.reason, "lifting_price_range_direct", text);
    assert.equal(result.procedure, "lifting_cervical");
    assert.equal(result.automaticAllowed, true);
  }
});
test("a renewed amount request uses the known procedure and prior offer", () => {
  const result = plan("Passa o valor por gentileza");
  assert.equal(result.reason, "lifting_price_range_direct");
  assert.equal(result.priceRequestKind, "amount");
  assert.equal(hasUnresolvedPatientRequest("Passa o valor por gentileza", []), true);
});
test("acceptance is not consent to a different procedure or financial term", () => {
  for (const text of ["Sim, mas não quero operar", "Quero sim, com desconto", "Sim, mas para lipo de papada"]) {
    assert.notEqual(plan(text).reason, "lifting_price_range_direct", text);
  }
  assert.notEqual(plan("Quero sim", [{ role: "assistant", source: "human", text: "Posso conferir os horários?" }]).reason, "lifting_price_range_direct");
  assert.equal(plan("Qual o valor?", [...opening, { role: "assistant", source: "bruna", text: "Na cervicoplastia, a referência é entre R$ 18 mil e R$ 26 mil." }]).automaticAllowed, false);
});
test("the clinic's offer to pass information creates an obligation after acceptance", () => {
  assert.equal(clinicTurnInvitesResponse(opening[1]), true);
  assert.equal(hasUnresolvedPatientRequest("Sim, por gentileza", opening), true);
  const recentConversation = [{ role: "assistant", source: "human", text: "Você gostaria de mais informações a respeito da avaliação médica?" }];
  const enrichedPlan = plan("Sim por gentileza", recentConversation);
  const result = classifyHumanResume({ text: "Sim por gentileza", messageType: "text", preliminaryPlan: planAutomation({ text: "Sim por gentileza" }), enrichedPlan, recentConversation });
  assert.equal(result.action, "attempt_reply");
});
test("profile slogans, business names and initials do not become a salutation", () => {
  for (const value of ["Estamos felizes", "Soluções Digitais", "YN", "Sou feliz", "Deus é fiel"]) assert.equal(usableProfileName(value), "", value);
  for (const value of ["Yara", "Lia", "Ana Souza", "Li", "MARIA"]) assert.ok(usableProfileName(value), value);
  assert.equal(resolveContactIdentity({ currentText: "Sou aposentada e gostaria de informações." }).name, "");
  assert.equal(resolveContactIdentity({ currentText: "Me chamo Helena e gostaria de informações." }).name, "Helena");
});
test("business away response is not a patient question or qualification", () => {
  const text = "Agradecemos seu contato. No momento estamos indisponíveis. Nosso horário de atendimento é das 9h às 18h.";
  assert.equal(planAutomation({ text, messageType: "text" }).reason, "automated_business_reply");
  const c = enforcePrefillOnlyClassificationGuard({ currentStatus: "Novo", messages: [
    { direction: "IN", text: "Interesse de anúncio", marketingPrefill: true },
    { direction: "OUT", text: "O que gostaria de saber?" },
    { direction: "IN", text },
  ], classification: { recommendedStatus: "Qualificado", appointmentOutcome: "confirmed", procedureMilestone: "accepted" } });
  assert.equal(c.recommendedStatus, "Novo");
  assert.equal(c.appointmentOutcome, "none");
  assert.equal(c.procedureMilestone, "none");
  for (const personal of ["Estou indisponível agora, mas qual o valor da consulta?", "Agradeço o contato. Estou com febre depois da cirurgia."]) assert.notEqual(planAutomation({ text: personal }).reason, "automated_business_reply");
});
test("a courtesy fragment never erases an unanswered practical question", () => {
  const input = coalesceUnansweredPatientBlock({ currentText: "Desde já agradeço", currentEventId: "synthetic-thanks", currentAt: "2026-09-17T18:01:00Z", recentConversation: [
    { role: "user", source: "patient", text: "Qual o valor da consulta e onde fica a clínica?", eventId: "synthetic-question", at: "2026-09-17T18:00:00Z" },
  ] });
  assert.match(input.text, /valor da consulta/);
  assert.match(input.text, /onde fica/);
  assert.equal(hasUnresolvedPatientRequest(input.text, input.recentConversation), true);
});

test("nonempty cache is not proof of a complete conversation", () => {
  assert.equal(shouldHydrateConversationHistory({ delivery: { ok: true }, memoryResult: { status: "completed", historyBefore: opening.slice(0, 1) } }), true);
  assert.equal(shouldHydrateConversationHistory({ delivery: { ok: true, updated: true }, memoryResult: { status: "completed", historyBefore: [] } }), true);
  assert.equal(shouldHydrateConversationHistory({ delivery: { ok: true }, memoryResult: { status: "completed", historyBefore: [] } }), false);
  assert.equal(shouldHydrateConversationHistory({ delivery: { ok: false }, memoryResult: { status: "failed", historyBefore: [] } }), false);
});

test("acceptance of a recovery explanation loads approved facts for the same procedure", () => {
  for (const procedure of ["lifting_cervical", "lifting_facial", "otoplastia"]) {
    const facts = approvedProcedureInformationFacts({ procedure, text: "Quero sim, por favor", recentConversation: [
      { role: "assistant", source: "bruna", text: "Posso te ajudar com uma dúvida prática: como se organizar para a recuperação. Quer que eu te explique?" },
    ] });
    assert.equal(facts.procedure, procedure);
    assert.ok(facts.topics.includes("recovery"));
    assert.ok(facts.boundaries.length);
  }
  assert.equal(approvedProcedureInformationFacts({ procedure: "lipo_papada", text: "Como é a recuperação?" }), null);
  assert.equal(approvedProcedureInformationFacts({ procedure: "lifting_cervical", text: "Sim", recentConversation: [{ role: "assistant", text: "Quer que eu confira os horários?" }] }), null);
});

test("the actual model request includes the accepted topic after conversation normalization", async () => {
  let input;
  await runOpenAIShadow({ phone: "+5511900000000", text: "Quero sim, por favor", procedure: "lifting_cervical", recentConversation: [
    { role: "assistant", source: "bruna", text: "Sobre lifting cervical, posso te ajudar com uma dúvida prática: como se organizar para a recuperação. Quer que eu te explique?" },
  ] }, { env: { OPENAI_API_KEY: "synthetic-key" }, fetchImpl: async (_url, options) => {
    input = JSON.parse(JSON.parse(options.body).input);
    return new Response("{}", { status: 200 });
  } });
  assert.equal(input.approvedClinicalFacts.procedure, "lifting_cervical");
  assert.deepEqual(input.approvedClinicalFacts.topics, ["recovery"]);
  assert.match(input.approvedClinicalFacts.facts[0].source, /^lifting-cervical\//);
});


test("natural information acceptances recover only the concrete prior explanation", async () => {
  const {isClearInformationAcceptance}=await import("./patient-turn-context.mjs");
  for(const text of ["Pode me explicar", "Sim, quero saber", "Gostaria, sim", "Me explica", "Quero saber mais, por favor"]) {
    assert.equal(isClearInformationAcceptance(text),true,text);
    const facts=approvedProcedureInformationFacts({procedure:"lifting_cervical",text,recentConversation:[
      {role:"assistant",source:"bruna",text:"Quer que eu te explique como se organizar para a recuperação?"},
    ]});
    assert.ok(facts?.topics.includes("recovery"),text);
  }
  for(const text of ["Não, obrigada", "Pode me explicar, mas antes me diga o endereço", "Quero saber se posso operar", "Sim, com desconto"]) {
    assert.equal(isClearInformationAcceptance(text),false,text);
  }
});
