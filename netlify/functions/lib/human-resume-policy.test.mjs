import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOvernightHandoffMessage,
  classifyHumanResume,
  hasConcreteResponseExpectation,
  isExplicitDeferralWithoutRequest,
  isHumanResumeServiceOpen,
  nextHumanResumeServiceTime,
  shouldSendOvernightHandoff,
} from "./human-resume-policy.mjs";

function standardPlan(reason = "known_procedure") {
  return {
    route: "standard_reply",
    reason,
    automaticAllowed: true,
  };
}

test("allows only a safe standard continuation", () => {
  const result = classifyHumanResume({
    text: "Como costuma funcionar a consulta?",
    messageType: "text",
    preliminaryPlan: standardPlan("consultation_information_request"),
    enrichedPlan: standardPlan("consultation_information_request"),
    recentConversation: [],
  });

  assert.equal(result.action, "attempt_reply");
});

test("keeps surgical price and schedule confirmation human-only", () => {
  const price = classifyHumanResume({
    text: "Quanto custa o lifting?",
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "surgical_price_review",
      automaticAllowed: false,
    },
    enrichedPlan: standardPlan("known_conversation_continuation"),
    recentConversation: [],
  });
  const confirmation = classifyHumanResume({
    text: "Pode ser esse horário",
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    enrichedPlan: standardPlan("known_conversation_continuation"),
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Tenho quinta-feira às 10h.",
      },
    ],
  });

  assert.equal(price.action, "sensitive");
  assert.equal(confirmation.action, "sensitive");
  assert.equal(
    confirmation.reason,
    "scheduling_or_confirmation",
  );
});

test("does not reopen a conversation for a simple acknowledgment", () => {
  for (const text of [
    "Obrigada!",
    "Ok obrigada",
    "Ok, muito obrigada!",
    "Perfeito, obrigada pela ajuda.",
    "Obrigada, combinado. Até terça!",
  ]) {
    const result = classifyHumanResume({
      text,
      messageType: "text",
      preliminaryPlan: {
        route: "human_review",
        reason: "outside_conservative_rules",
        automaticAllowed: false,
      },
      enrichedPlan: standardPlan("known_conversation_continuation"),
      recentConversation: [],
    });

    assert.equal(result.action, "no_action", text);
  }
});

test("an explicit decision to think and return later closes the conversation", () => {
  const exactMessage =
    "Legal, obrigada. Ainda estou pensando mas qlqr coisa volto com vc";
  const result = classifyHumanResume({
    text: exactMessage,
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    enrichedPlan: standardPlan("known_conversation_continuation"),
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Você gostaria que eu verificasse mais alguma informação?",
      },
    ],
  });

  assert.equal(
    isExplicitDeferralWithoutRequest(exactMessage),
    true,
  );
  assert.equal(
    hasConcreteResponseExpectation(exactMessage, [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Você gostaria que eu verificasse mais alguma informação?",
      },
    ]),
    false,
  );
  assert.equal(result.action, "no_action");
  assert.equal(
    result.reason,
    "conversation_closing_or_ignored",
  );
});

test("a deferral followed by a real question is not silenced", () => {
  const text =
    "Ainda estou pensando, mas qual é o endereço da clínica?";

  assert.equal(isExplicitDeferralWithoutRequest(text), false);
  assert.equal(
    hasConcreteResponseExpectation(text, []),
    true,
  );
});

test("does not hide an actionable request that starts with thanks", () => {
  const result = classifyHumanResume({
    text: "Ok, obrigada, mas qual é o endereço?",
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    enrichedPlan: standardPlan("known_conversation_continuation"),
    recentConversation: [],
  });

  assert.notEqual(result.action, "no_action");
});

test("uses a holding message only for a non-sensitive uncertainty", () => {
  const result = classifyHumanResume({
    text: "Você consegue verificar isso para mim?",
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    enrichedPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    recentConversation: [],
  });

  assert.equal(result.action, "holding_and_alert");
});

test("alerts silently when uncertainty has no concrete unanswered request", () => {
  const result = classifyHumanResume({
    text: "Entendi, vou pensar com calma",
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    enrichedPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Aqui estão as informações sobre a consulta.",
      },
    ],
  });

  assert.equal(result.action, "alert_only");
});

test("recognizes both direct requests and answers to a pending question", () => {
  assert.equal(
    hasConcreteResponseExpectation(
      "Você consegue verificar isso para mim?",
      [],
    ),
    true,
  );
  assert.equal(
    hasConcreteResponseExpectation(
      "Contorno facial, flacidez e linhas marionetes.",
      [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "O que você gostaria de melhorar?",
        },
      ],
    ),
    true,
  );
  assert.equal(
    hasConcreteResponseExpectation(
      "Perfeito, obrigada pela ajuda.",
      [],
    ),
    false,
  );
});

test("identifies the daytime human-service window in São Paulo", () => {
  const env = {
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
  };

  assert.equal(
    isHumanResumeServiceOpen(
      Date.parse("2026-07-28T10:59:00.000Z"),
      env,
    ),
    false,
  );
  assert.equal(
    isHumanResumeServiceOpen(
      Date.parse("2026-07-28T11:00:00.000Z"),
      env,
    ),
    true,
  );
  assert.equal(
    isHumanResumeServiceOpen(
      Date.parse("2026-07-28T23:00:00.000Z"),
      env,
    ),
    false,
  );
  assert.equal(
    new Date(
      nextHumanResumeServiceTime(
        Date.parse("2026-07-28T23:00:00.000Z"),
        env,
      ),
    ).toISOString(),
    "2026-07-29T11:00:00.000Z",
  );
});

test("overnight handoff is limited to price and scheduling", () => {
  assert.equal(
    shouldSendOvernightHandoff("surgical_price_review"),
    true,
  );
  assert.equal(
    shouldSendOvernightHandoff("scheduling_or_confirmation"),
    true,
  );
  assert.equal(
    shouldSendOvernightHandoff("possible_urgent_symptoms"),
    false,
  );
  assert.match(
    buildOvernightHandoffMessage("scheduling_or_confirmation"),
    /retornamos por aqui amanhã pela manhã/,
  );
});
