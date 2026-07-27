import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichAutomationPlanFromConversation,
  planAutomation,
} from "./whatsapp-automation.mjs";

test("possible urgency never authorizes a patient response", () => {
  const plan = planAutomation({
    text: "Estou com falta de ar e muita dor no peito",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.deepEqual(plan, {
    route: "human_review",
    reason: "possible_urgent_symptoms",
    replyCode: "ALERT-URG-01",
    professional: null,
    procedure: null,
    automaticAllowed: false,
  });
});

test("known procedure remains eligible for a standard reply", () => {
  const plan = planAutomation({
    text: "Gostaria de saber sobre blefaroplastia",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.replyCode, "G-BLEF-01");
  assert.equal(plan.automaticAllowed, true);
});

test("commercial solicitations are ignored before spending on AI", () => {
  for (const text of [
    "Olá, somos uma agência de marketing digital e gostaríamos de apresentar nossos serviços",
    "Tenho uma proposta comercial para a clínica",
    "Gostaria de oferecer nossos serviços de gestão de tráfego",
    "Aceitam parceria de divulgação por permuta?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "ignore");
    assert.equal(
      plan.reason,
      "commercial_solicitation_or_partnership",
    );
    assert.equal(plan.automaticAllowed, false);
  }
});

test("patient questions about payment or insurance are not mistaken for sales", () => {
  for (const text of [
    "A consulta aceita convênio?",
    "Posso pagar a cirurgia no cartão?",
    "Quero uma avaliação para aumentar as mamas",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.notEqual(
      plan.reason,
      "commercial_solicitation_or_partnership",
    );
  }
});

test("recent conversation preserves Amanda and the procedure on a continuation", () => {
  const currentPlan = planAutomation({
    text: "Consigo de manhã segunda e quinta",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enriched = enrichAutomationPlanFromConversation(currentPlan, [
    {
      role: "patient",
      source: "paciente",
      text: "Quero saber sobre blefaroplastia",
    },
    {
      role: "assistant",
      source: "bruna",
      text: "Quais dias e períodos costumam ser melhores para você?",
    },
  ]);

  assert.equal(enriched.route, "standard_reply");
  assert.equal(enriched.professional, "amanda");
  assert.equal(enriched.procedure, "blefaroplastia");
});
