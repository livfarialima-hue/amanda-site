import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_ACTIONS,
  clinicTurnInvitesResponse,
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

test("a patient reply to a Bruna follow-up becomes an active response turn", () => {
  const decision = decideConversationAction({
    text: "Por favor, me explique a avaliação.",
    plan: {
      route: "standard_reply",
      reason: "consultation_information_request",
      replyCode: "AMANDA-CONSULTA-INFO-01",
      professional: "amanda",
      procedure: "lifting_facial",
      automaticAllowed: true,
    },
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        eventId: "scheduled-followup-case-1",
        text:
          "Se preferir, também posso explicar como funciona a avaliação com a Dra. Amanda.",
      },
    ],
    humanTakeoverActive: false,
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.owner, "bruna");
  assert.equal(decision.allowAutomaticReply, true);
  assert.equal(decision.followupPolicy, "none");
  assert.equal(decision.replyContract.allowedResponseKind, "direct_answer");
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

test("a short acknowledgement after a concrete offer reaches semantic interpretation", () => {
  const recentConversation = [{
    role: "assistant",
    source: "bruna",
    text: "Posso te explicar como funciona a consulta com a Dra. Amanda.",
  }];

  assert.equal(clinicTurnInvitesResponse(recentConversation[0]), true);
  assert.equal(hasUnresolvedPatientRequest("Certo", recentConversation), true);

  const decision = decideConversationAction({
    text: "Certo",
    plan: standardPlan,
    recentConversation,
  });
  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.unresolvedRequest, true);
});

test("gratitude remains a closing even when an older offer exists", () => {
  const recentConversation = [{
    role: "assistant",
    source: "bruna",
    text: "Posso te explicar como funciona a consulta.",
  }];

  assert.equal(
    hasUnresolvedPatientRequest("Obrigada, até mais", recentConversation),
    false,
  );
  assert.equal(
    decideConversationAction({
      text: "Obrigada, até mais",
      plan: standardPlan,
      recentConversation,
    }).action,
    CONVERSATION_ACTIONS.CLOSED,
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

test("semantic evaluation handles a colloquial question without punctuation", () => {
  const text = "Ai fazem cervicoplastia";
  assert.equal(hasUnresolvedPatientRequest(text, []), false);

  const decision = decideConversationAction({
    text,
    plan: {
      route: "standard_reply",
      reason: "known_procedure",
      automaticAllowed: true,
      procedure: "lifting_cervical",
    },
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "A Clínica LIV fica em Pinheiros, São Paulo.",
      },
    ],
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.allowAutomaticReply, true);
  assert.equal(decision.unresolvedRequest, true);
  assert.equal(decision.replyContract.allowedResponseKind, "direct_answer");
});

test("a multi-part lifting question keeps each safe topic available to the AI", () => {
  const decision = decideConversationAction({
    text:
      "Boa tarde, Bruna, tudo bem? Quanto tempo leva a cirurgia, se tem um longo período de recuperação, indicações para realização (talvez eu ainda não precise)",
    plan: {
      route: "standard_reply",
      reason: "known_procedure",
      automaticAllowed: true,
      professional: "amanda",
      procedure: "lifting_facial",
    },
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "O que você gostaria de entender primeiro sobre o lifting facial?",
      },
    ],
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.replyContract.allowedResponseKind, "direct_answer");
  assert.deepEqual(decision.replyContract.unresolvedIntents, [
    "recovery",
    "lifting_duration",
    "lifting_recovery",
    "lifting_indication",
  ]);
  assert.equal(decision.replyContract.risk, "green");
  assert.equal(decision.replyContract.maxQuestions, 1);
  assert.equal(decision.replyContract.allowCta, true);
});

test("a safe conversational statement reaches semantic evaluation instead of being silenced by patterns", () => {
  const decision = decideConversationAction({
    text: "Eu já fiz lipo de papada e ainda percebo flacidez",
    plan: {
      route: "standard_reply",
      reason: "known_procedure",
      automaticAllowed: true,
      procedure: "lifting_cervical",
    },
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.allowAutomaticReply, true);
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

test("a budget refusal pauses the conversation without a new invitation", () => {
  const decision = decideConversationAction({
    text: "Ficou fora do meu orçamento. Vou me programar e retorno.",
    plan: standardPlan,
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.WAIT_PATIENT);
  assert.equal(decision.minimumFollowupDelayHours, 0);
  assert.equal(decision.followupPolicy, "patient_initiated");
  assert.equal(decision.replyContract.allowedResponseKind, "none");
  assert.equal(decision.replyContract.allowCta, false);
  assert.equal(decision.silenceReason, "patient_declined_or_budget_pause");
});

test("an answer in human context reaches the semantic model when no takeover flag is active", () => {
  const decision = decideConversationAction({
    text: "Pode sim",
    plan: standardPlan,
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Posso emitir a nota fiscal?",
      },
    ],
  });

  assert.equal(decision.action, CONVERSATION_ACTIONS.RESPOND);
  assert.equal(decision.owner, "bruna");
  assert.equal(decision.allowAutomaticReply, true);
  assert.equal(decision.allowHoldingReply, false);
  assert.equal(decision.replyContract.allowedResponseKind, "direct_answer");
});

test("the reply contract removes forced questions from a known surgical price answer", () => {
  const decision = decideConversationAction({
    text: "Quanto custa o lifting facial?",
    plan: {
      ...standardPlan,
      reason: "price_initial_information",
    },
  });

  assert.deepEqual(decision.replyContract.unresolvedIntents, ["price_surgery"]);
  assert.equal(decision.replyContract.maxQuestions, 0);
  assert.equal(decision.replyContract.maxLinks, 1);
  assert.equal(decision.replyContract.allowCta, false);
});

test("the consultation price contract permits a low-pressure next-step offer without a question or link", () => {
  const decision = decideConversationAction({
    text: "Qual é o valor da consulta com a Dra. Amanda?",
    plan: {
      ...standardPlan,
      reason: "consultation_information_request",
      procedure: "avaliacao_facial",
    },
  });

  assert.deepEqual(
    decision.replyContract.unresolvedIntents,
    ["price_consultation"],
  );
  assert.equal(decision.replyContract.maxQuestions, 0);
  assert.equal(decision.replyContract.maxLinks, 0);
  assert.equal(decision.replyContract.allowCta, true);
});

test("the cervical first price contract permits only the approved range offer", () => {
  const decision = decideConversationAction({
    text: "Gostaria de saber os valores da cervicoplastia",
    plan: {
      ...standardPlan,
      reason: "price_initial_information",
      procedure: "lifting_cervical",
    },
  });

  assert.deepEqual(decision.replyContract.unresolvedIntents, ["price_surgery"]);
  assert.equal(decision.replyContract.maxQuestions, 0);
  assert.equal(decision.replyContract.maxLinks, 1);
  assert.equal(decision.replyContract.allowCta, true);
});

test("the otoplasty price contracts permit the approved offer and range guide", () => {
  const initial = decideConversationAction({
    text: "Tudo sobre otoplastia, inclusive valores",
    plan: {
      ...standardPlan,
      reason: "price_initial_information",
      procedure: "otoplastia",
    },
  });
  const range = decideConversationAction({
    text: "Pode me passar a faixa da otoplastia?",
    plan: {
      ...standardPlan,
      reason: "otoplasty_price_range_direct",
      procedure: "otoplastia",
    },
  });

  assert.equal(initial.replyContract.maxQuestions, 0);
  assert.equal(initial.replyContract.maxLinks, 1);
  assert.equal(initial.replyContract.allowCta, true);
  assert.deepEqual(range.replyContract.unresolvedIntents, ["price_surgery"]);
  assert.equal(range.replyContract.maxQuestions, 0);
  assert.equal(range.replyContract.maxLinks, 1);
  assert.equal(range.replyContract.allowCta, false);
});

test("the reply contract allows one necessary question only when the surgery is unknown", () => {
  const decision = decideConversationAction({
    text: "Quanto custa a cirurgia?",
    plan: {
      ...standardPlan,
      reason: "price_initial_information",
    },
  });

  assert.equal(decision.replyContract.maxQuestions, 1);
  assert.equal(decision.replyContract.maxLinks, 0);
});

test("a price word inherited from the availability template does not block the scheduling question", () => {
  const decision = decideConversationAction({
    text:
      "Olá, li sobre valores de lifting facial e gostaria de consultar os horários para uma avaliação com a Dra. Amanda.",
    plan: {
      ...standardPlan,
      reason: "known_procedure",
      procedure: "lifting_facial",
      priceMentionIsTemplateContext: true,
    },
  });

  assert.deepEqual(decision.replyContract.unresolvedIntents, ["scheduling"]);
  assert.equal(decision.replyContract.maxQuestions, 1);
  assert.equal(decision.replyContract.allowCta, true);
});

test("photo and scheduling contexts receive different response limits", () => {
  const photo = decideConversationAction({
    text: "",
    messageType: "image",
    plan: {
      route: "human_review",
      reason: "unsupported_or_empty_message",
      automaticAllowed: false,
    },
  });
  const scheduling = decideConversationAction({
    text: "Quero agendar uma avaliação",
    plan: standardPlan,
  });

  assert.equal(photo.replyContract.requirePhotoDistanceLimit, true);
  assert.equal(photo.replyContract.maxQuestions, 0);
  assert.equal(scheduling.replyContract.allowCta, true);
  assert.equal(scheduling.replyContract.maxQuestions, 1);
});
