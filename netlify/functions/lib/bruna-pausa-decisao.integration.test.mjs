import assert from "node:assert/strict";
import test from "node:test";
import { decideConversationAction, isPatientDecisionPause } from "./conversation-action-controller.mjs";
import { classifyHumanResume } from "./human-resume-policy.mjs";
import { sendControlledPatientReply, validateOutboundReply } from "./outbound-reply-gate.mjs";
import { handleScheduledFollowup } from "../scheduled-followup.mjs";
import { isSemanticHumanContextContinuationCandidate } from "../ycloud-webhook.mjs";

// Synthetic cases; no customer conversation or identity is stored here.
const plan = { route: "standard_reply", automaticAllowed: true, professional: "amanda", procedure: "otoplastia", reason: "known_procedure" };
const clinic = (text, source = "bruna") => ({ role: "assistant", source, text });
const patient = text => ({ role: "user", source: "paciente", text });
const invitation = clinic("Gostaria de consultar datas para agendamento?", "equipe_humana");
const paused = [invitation, patient("Ainda não"), patient("Preciso de um pouco mais de tempo")];
const mistakenContinuation = [...paused, clinic("Quer mais tempo para decidir ou mais informações sobre a cirurgia?")];

for (const [text, recentConversation] of [
  ["Ainda não", [invitation]],
  ["Ainda não\nEstou precisando um pouco mais", [invitation]],
  ["Estou precisando um pouco mais", [invitation, patient("Ainda não")]],
  ["Preciso de mais tempo para decidir", []],
  ["Não quero agendar agora", [invitation]],
  ["Também", mistakenContinuation],
  ["Sim", mistakenContinuation],
  ["Tá bom", mistakenContinuation],
  ["Obrigada", mistakenContinuation],
]) {
  test(`decision pause suppresses reply, holding, alert and automatic resumption: ${text}`, async () => {
    for (const humanTakeoverActive of [false, true]) {
      const action = decideConversationAction({ text, plan, recentConversation, humanTakeoverActive });
      assert.equal(action.action, "wait_patient");
      assert.equal(action.allowAutomaticReply, false);
      assert.equal(action.allowHoldingReply, false);
      assert.equal(action.allowAlert, false);
      assert.equal(action.scheduleHumanResume, false);
      assert.equal(action.followupPolicy, "patient_initiated");
    }
    assert.equal(classifyHumanResume({ text, messageType: "text", preliminaryPlan: plan, enrichedPlan: plan, recentConversation }).action, "no_action");
    assert.equal(isSemanticHumanContextContinuationCandidate({ patientAutomationReady: true, humanTakeoverActive: true,
      professional: "amanda", messageType: "text", text, recentConversation, exactDuplicate: false,
      protectedAppointmentContinuation: false, professionalFactReview: null, patientRelationship: {} }), false);
    // Even an already generated semantic candidate must not get through.
    const staleAction = { action: "respond", semanticReplyAuthorized: true, semanticReplyCode: "CONTEXT-CLARIFY-01" };
    assert.equal(validateOutboundReply({ body: "O que você gostaria de esclarecer?", currentText: text, recentConversation, conversationAction: staleAction }).reason, "patient_decision_pause");
    let effects = 0;
    const fail = async () => { effects++; throw new Error("unexpected external effect"); };
    for (let delivery = 0; delivery < 2; delivery++) {
      const result = await sendControlledPatientReply({ from: "+5511900000001", to: "+5511900000000", eventId: "synthetic-pause",
        body: "O que você gostaria de esclarecer?", currentText: text, recentConversation, conversationAction: staleAction },
      { sendYCloudPatientTextImpl: fail, getStoreImpl: fail, recordDurableConversationTurnImpl: fail, appendConversationTurnImpl: fail });
      assert.equal(result.status, "blocked");
      assert.equal(result.errorCode, "patient_decision_pause");
    }
    assert.equal(effects, 0);
  });
}

test("pause follows event chronology, including out-of-order completion and duplicate turns", () => {
  const ordered = mistakenContinuation.map((turn, index) => ({ ...turn, at: `2026-10-01T12:0${index}:00Z` }));
  assert.equal(isPatientDecisionPause("Também", [ordered[3], ordered[1], ordered[0], ordered[2], ordered[1]]), true);
});

for (const text of [
  "Qual é o endereço da clínica?", "Tem estacionamento", "Preciso saber o valor da consulta",
  "Ainda não, mas como é a recuperação?", "Preciso de mais tempo, mas qual é a localização?",
  "Quero agendar agora", "O local precisa ser perto de casa e quero saber o preço",
  "Estou com falta de ar após a cirurgia", "Quero saber mais", "Tenho uma dúvida sobre os exames",
  "Preciso de mais tempo, estou com falta de ar", "Não quero agendar agora, estou com falta de ar",
]) {
  test(`a substantive new patient turn remains eligible after a pause: ${text}`, () => {
    assert.equal(isPatientDecisionPause(text, mistakenContinuation), false);
    assert.notEqual(decideConversationAction({ text, plan, recentConversation: mistakenContinuation }).action, "wait_patient");
  });
}

test("a new patient question clears the historical pause for its next informational acceptance", () => {
  const resumed = [...paused, patient("Como funciona a avaliação?"), clinic("Posso explicar as etapas?")];
  assert.equal(isPatientDecisionPause("Sim", resumed), false);
  assert.equal(decideConversationAction({ text: "Sim", plan, recentConversation: resumed }).action, "respond");
});

for (const [text, recentConversation] of [
  ["Ainda não", [clinic("Você já recebeu o resultado do exame?")]],
  ["Também", [clinic("Você quer informações da consulta ou do procedimento?")]],
  ["Sim", [clinic("Posso explicar como funciona a avaliação?")]],
  ["Estou precisando um pouco mais", []],
]) {
  test(`short answers are not a global stop list: ${text}`, () => {
    assert.equal(isPatientDecisionPause(text, recentConversation), false);
  });
}

for (const deliveryMode of ["text", "template"]) {
  test(`existing commercial follow-up endpoint respects pause before model or ${deliveryMode} provider`, async () => {
    let effects = 0;
    const fail = async () => { effects++; throw new Error("unexpected external effect"); };
    const response = await handleScheduledFollowup(new Request("https://example.test/followup", {
      method: "POST", headers: { "x-liv-secret": "synthetic-secret" }, body: JSON.stringify({
        planId: "synthetic-plan", patientPhone: "+5511900000000", body: "Podemos retomar?", humanApproved: true, deliveryMode,
        recentConversation: [...mistakenContinuation, patient("Também")].map((turn, index) => ({
          direction: turn.role === "user" ? "IN" : "OUT", text: turn.text, at: `2026-10-01T12:0${index}:00Z`, messageId: `synthetic-${index}`,
        })),
      }),
    }), { env: { GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic-secret", WHATSAPP_AUTOMATION_MODE: "active", WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true" },
      now: new Date("2026-10-01T15:00:00Z"), reviewScheduledFollowupContextImpl: fail, sendYCloudPatientTextImpl: fail,
      sendYCloudPatientFollowupTemplateImpl: fail, appendConversationTurnImpl: fail, getBusinessNumberImpl: fail });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).ignoreReason, "patient_decision_pause");
    assert.equal(effects, 0);
  });
}
