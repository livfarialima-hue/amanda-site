import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_ACTIONS,
  decideConversationAction,
  hasUnresolvedPatientRequest,
} from "./conversation-action-controller.mjs";

const standardPlan = {
  route: "standard_reply",
  reason: "known_conversation_continuation",
  automaticAllowed: true,
};

test("latest patient closing overrides an older clinic question", () => {
  const decision = decideConversationAction({
    text:
      "Legal, obrigada. Ainda estou pensando mas qlqr coisa volto com vc",
    plan: standardPlan,
    recentConversation: [
      {
        role: "assistant",
        text: "Gostaria que eu verificasse mais alguma informação?",
      },
    ],
    humanTakeoverActive: true,
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.CLOSED);
  assert.equal(decision.allowAutomaticReply, false);
  assert.equal(decision.allowHoldingReply, false);
  assert.equal(decision.allowAlert, false);
  assert.equal(decision.scheduleHumanResume, false);
  assert.equal(decision.followupPolicy, "patient_initiated");
});

test("a patient still deciding creates no immediate response obligation", () => {
  const decision = decideConversationAction({
    text: "Entendi, vou pensar com calma",
    plan: standardPlan,
    recentConversation: [
      {
        role: "assistant",
        text: "Quer que eu te explique mais alguma coisa?",
      },
    ],
  });

  assert.equal(
    decision.action,
    CONVERSATION_ACTIONS.WAIT_PATIENT,
  );
  assert.equal(decision.minimumFollowupDelayHours, 24);
  assert.equal(decision.allowAutomaticReply, false);
});

test("a real question reopens a deferred conversation", () => {
  const decision = decideConversationAction({
    text:
      "Ainda estou pensando, mas qual é o endereço da clínica?",
    plan: standardPlan,
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.unresolvedRequest, true);
});

test("human takeover schedules a resume only for a concrete pending request", () => {
  const pending = decideConversationAction({
    text: "Você consegue confirmar o endereço?",
    plan: {
      route: "human_takeover_active",
      automaticAllowed: false,
    },
    humanTakeoverActive: true,
  });
  const waiting = decideConversationAction({
    text: "Obrigada, vou pensar",
    plan: {
      route: "human_takeover_active",
      automaticAllowed: false,
    },
    humanTakeoverActive: true,
  });

  assert.equal(pending.scheduleHumanResume, true);
  assert.equal(waiting.scheduleHumanResume, false);
});

test("a duplicate revision can never produce a second action", () => {
  const decision = decideConversationAction({
    text: "Qual é o valor?",
    plan: standardPlan,
    exactDuplicate: true,
  });

  assert.equal(
    decision.action,
    CONVERSATION_ACTIONS.IGNORE_DUPLICATE,
  );
  assert.equal(decision.allowAutomaticReply, false);
  assert.equal(decision.allowAlert, false);
});

test("an answer to the clinic question remains a response obligation", () => {
  assert.equal(
    hasUnresolvedPatientRequest(
      "De alguns pacientes em quem foi feito",
      [
        {
          role: "assistant",
          text: "Você gostaria de vídeos da cirurgia?",
        },
      ],
    ),
    true,
  );
});

test("a fresh greeting can receive the controlled reactivation notice", () => {
  const decision = decideConversationAction({
    text: "Oi",
    plan: {
      route: "reactivation_notice",
      reason: "conversation_inactive_over_7_days",
      automaticAllowed: true,
    },
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.allowAutomaticReply, true);
});
