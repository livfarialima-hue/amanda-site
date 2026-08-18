import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOvernightHandoffMessage,
  buildSimpleCoordinationReply,
  classifyHumanResume,
  classifySimpleCoordinationAcknowledgement,
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

test("keeps the reported post-quote acknowledgment in human ownership", () => {
  const text = "Boa noite! Ok, vamos vê lá. Obg, ótimo descanso";
  const result = classifyHumanResume({
    text,
    messageType: "text",
    preliminaryPlan: standardPlan("ai_safety_triage"),
    enrichedPlan: standardPlan("ai_safety_triage"),
    recentConversation: [
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
    ],
  });

  assert.equal(result.action, "no_action");
  assert.match(
    result.reason,
    /conversation_closing|human_context/,
  );
});

test("does not send an overnight holding message after a negotiated appointment is accepted", () => {
  const recentConversation = [
    {
      role: "user",
      text: "Pode ser no dia 12, poderia ser às 11h?",
    },
    {
      role: "assistant",
      source: "equipe_humana",
      text: "Este horário está perfeito. Podemos combinar?",
    },
  ];
  const result = classifyHumanResume({
    text: "Podemos! Combinado",
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "outside_conservative_rules",
      automaticAllowed: false,
    },
    enrichedPlan: standardPlan("known_conversation_continuation"),
    recentConversation,
  });

  assert.equal(result.action, "no_action");
  assert.equal(result.reason, "conversation_closing_or_ignored");
});

test("keeps a greeting plus attendance confirmation silent", () => {
  const result = classifyHumanResume({
    text: "Bom dia! Pode sim",
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
        text:
          "Você tem um horário agendado hoje às 15:00. Posso confirmar sua presença?",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Bom dia! Pode sim",
      },
    ],
  });

  assert.deepEqual(result, {
    action: "no_action",
    reason: "appointment_attendance_confirmed",
  });
});

test("recognizes a safe operational continuation without inventing a team check", () => {
  const text =
    "Tudo bem? Eu acho que pode emitir sim. Vou tentar acessar os exames, se conseguir te passo, OK?";
  const recentConversation = [
    {
      role: "assistant",
      source: "equipe_humana",
      text: "Estou te devendo uma NF também. Posso emitir?",
    },
  ];
  const result = classifyHumanResume({
    text,
    messageType: "text",
    preliminaryPlan: {
      route: "human_review",
      reason: "existing_patient_administrative_followup",
      automaticAllowed: false,
    },
    enrichedPlan: {
      route: "human_review",
      reason: "existing_patient_administrative_followup",
      automaticAllowed: false,
    },
    recentConversation,
  });

  assert.equal(
    classifySimpleCoordinationAcknowledgement(
      text,
      recentConversation,
    ),
    "send_exams_later",
  );
  assert.equal(result.action, "attempt_reply");
  assert.equal(result.reason, "semantic_coordination_candidate");
  assert.equal(
    buildSimpleCoordinationReply({
      kind: result.replyKind,
      patientName: "Geraldo Silva",
    }),
    "Perfeito, Geraldo. Pode nos enviar os exames quando conseguir.",
  );
});

test("does not treat a real administrative request as simple coordination", () => {
  const recentConversation = [
    {
      role: "assistant",
      source: "equipe_humana",
      text: "A nota fiscal ainda não foi emitida.",
    },
  ];

  assert.equal(
    classifySimpleCoordinationAcknowledgement(
      "Você pode emitir a nota fiscal para mim?",
      recentConversation,
    ),
    null,
  );
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
    /retoma por aqui amanhã pela manhã/,
  );
});
