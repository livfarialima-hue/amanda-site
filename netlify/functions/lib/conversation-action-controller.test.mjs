import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_ACTIONS,
  decideConversationAction,
  hasUnresolvedPatientRequest,
  isExplicitNightPause,
  isReplyToHumanContextWithoutStandaloneRequest,
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
  assert.equal(decision.state, "bot_active");
  assert.equal(decision.owner, "bruna");
  assert.equal(decision.nextAction, "send_patient_message");
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

test("a request to continue tomorrow is a stop signal even with a confirmation tag", () => {
  const text = "Já está muito tarde. Amanhã a gente conversa, melhor né?";
  assert.equal(isExplicitNightPause(text), true);

  const decision = decideConversationAction({
    text,
    plan: standardPlan,
  });
  assert.equal(
    decision.action,
    CONVERSATION_ACTIONS.WAIT_PATIENT,
  );
  assert.equal(decision.allowAutomaticReply, false);
  assert.equal(decision.allowHoldingReply, false);
});

test("a separate question after the night pause remains visible", () => {
  const text =
    "Já está muito tarde. Amanhã a gente conversa. Qual é o valor da consulta?";
  assert.equal(isExplicitNightPause(text), false);

  const decision = decideConversationAction({
    text,
    plan: standardPlan,
  });
  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
});

test("a polite acknowledgment after a human surgical quote closes the exchange", () => {
  const text = "Boa noite! Ok, vamos vê lá. Obg, ótimo descanso";
  const recentConversation = [
    {
      role: "assistant",
      source: "equipe_humana",
      text:
        "Boa noite, tudo bem? O orçamento cirúrgico foi enviado por e-mail. Se tiver alguma dúvida, pode nos enviar por aqui. Uma boa noite!",
    },
    {
      role: "patient",
      source: "paciente",
      text,
    },
  ];

  assert.equal(
    hasUnresolvedPatientRequest(text, recentConversation),
    false,
  );
  assert.equal(
    isReplyToHumanContextWithoutStandaloneRequest(
      text,
      recentConversation,
    ),
    true,
  );

  const decision = decideConversationAction({
    text,
    plan: standardPlan,
    recentConversation,
    humanTakeoverActive: true,
  });
  assert.equal(decision.action, CONVERSATION_ACTIONS.CLOSED);
  assert.equal(decision.allowAutomaticReply, false);
  assert.equal(decision.scheduleHumanResume, false);
});

test("a real new question after a human update remains actionable", () => {
  const recentConversation = [
    {
      role: "assistant",
      source: "equipe_humana",
      text: "O orçamento foi enviado por e-mail. Uma boa noite!",
    },
  ];

  assert.equal(
    isReplyToHumanContextWithoutStandaloneRequest(
      "Obrigada. Qual é o prazo para decidir?",
      recentConversation,
    ),
    false,
  );
});

test("AI safety triage evaluates a relevant statement without relying on conversation memory", () => {
  const decision = decideConversationAction({
    text: "Eu tenho o pescoço flácido",
    plan: {
      route: "standard_reply",
      reason: "ai_safety_triage",
      automaticAllowed: true,
    },
    recentConversation: [],
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.allowAutomaticReply, true);
  assert.equal(decision.unresolvedRequest, true);
  assert.equal(decision.reason, "ai_safety_triage");
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
