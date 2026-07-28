import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHumanResume,
  isHumanResumeServiceOpen,
  nextHumanResumeServiceTime,
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

test("resumes only between 08:00 and 20:00 in São Paulo", () => {
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
