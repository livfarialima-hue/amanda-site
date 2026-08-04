import assert from "node:assert/strict";
import test from "node:test";
import {
  canContinuePatientAutomationWithoutLeadDelivery,
  hasRecentAcquisitionContext,
} from "./lead-delivery-fallback.mjs";

const standardPlan = {
  route: "standard_reply",
  reason: "known_procedure",
  professional: "amanda",
  procedure: "lifting_facial",
  automaticAllowed: true,
};

test("a coded Meta lead can be answered while Sheets is unavailable", () => {
  assert.equal(
    canContinuePatientAutomationWithoutLeadDelivery({
      automationMode: "active",
      messageType: "text",
      text: "Quero referências",
      plan: standardPlan,
      attribution: { referenceCategory: "meta_coded" },
    }),
    true,
  );
});

test("the next messages inherit acquisition context from the conversation", () => {
  const recentConversation = [
    {
      role: "user",
      text:
        "Olá! Quero saber sobre lifting facial. Ref. M26F01W-C06H01",
    },
  ];

  assert.equal(
    hasRecentAcquisitionContext({
      attribution: { referenceCategory: "whatsapp_uncoded" },
      recentConversation,
    }),
    true,
  );
  assert.equal(
    canContinuePatientAutomationWithoutLeadDelivery({
      automationMode: "active",
      messageType: "text",
      text: "Aonde fica a clínica?",
      plan: standardPlan,
      attribution: { referenceCategory: "whatsapp_uncoded" },
      recentConversation,
    }),
    true,
  );
});

test("an unrelated direct WhatsApp contact remains fail-closed", () => {
  assert.equal(
    canContinuePatientAutomationWithoutLeadDelivery({
      automationMode: "active",
      messageType: "text",
      text: "Quero falar com a doutora",
      plan: standardPlan,
      attribution: { referenceCategory: "whatsapp_uncoded" },
      recentConversation: [],
    }),
    false,
  );
});

test("human review, Daniel and non-active modes never use the fallback", () => {
  const base = {
    automationMode: "active",
    messageType: "text",
    text: "Olá! Ref. M26F01W-C06H01",
    attribution: { referenceCategory: "meta_coded" },
  };

  assert.equal(
    canContinuePatientAutomationWithoutLeadDelivery({
      ...base,
      plan: { ...standardPlan, route: "human_review" },
    }),
    false,
  );
  assert.equal(
    canContinuePatientAutomationWithoutLeadDelivery({
      ...base,
      plan: { ...standardPlan, professional: "daniel" },
    }),
    false,
  );
  assert.equal(
    canContinuePatientAutomationWithoutLeadDelivery({
      ...base,
      automationMode: "shadow",
      plan: standardPlan,
    }),
    false,
  );
});
