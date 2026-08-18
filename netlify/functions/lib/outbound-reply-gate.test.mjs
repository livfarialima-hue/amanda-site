import assert from "node:assert/strict";
import test from "node:test";
import {
  claimOutboundReply,
  sendControlledPatientReply,
  validateOutboundReply,
} from "./outbound-reply-gate.mjs";
import {
  CONVERSATION_ACTIONS,
} from "./conversation-action-controller.mjs";
import {
  buildSemanticReplyConversationAction,
} from "./semantic-reply-policy.mjs";

function fakeBlobs() {
  const values = new Map();
  let version = 0;
  const store = {
    async getWithMetadata(key) {
      const entry = values.get(key);
      return entry
        ? {
            data: structuredClone(entry.data),
            etag: entry.etag,
          }
        : null;
    },
    async setJSON(key, data, options = {}) {
      const existing = values.get(key);
      if (options.onlyIfNew && existing) {
        return { modified: false };
      }
      if (
        options.onlyIfMatch &&
        existing?.etag !== options.onlyIfMatch
      ) {
        return { modified: false };
      }
      version += 1;
      values.set(key, {
        data: structuredClone(data),
        etag: `etag-${version}`,
      });
      return { modified: true, etag: `etag-${version}` };
    },
  };
  return { getStoreImpl: () => store };
}

const respond = {
  action: CONVERSATION_ACTIONS.RESPOND,
  allowHoldingReply: false,
};

test("final validation blocks replies after closing or deferral", () => {
  for (const currentText of [
    "Ok, obrigada",
    "Ainda estou pensando, qualquer coisa volto",
  ]) {
    const result = validateOutboundReply({
      body: "Posso te ajudar com mais alguma coisa?",
      currentText,
      conversationAction: respond,
    });
    assert.equal(result.allowed, false, currentText);
  }
});

test("an explicitly scheduled morning resume may continue a night deferral", () => {
  const result = validateOutboundReply({
    body:
      "Bom dia, Lia! Como combinamos, estou retomando nossa conversa sobre lifting cervical.",
    currentText: "Já está muito tarde. Amanhã a gente conversa, melhor né?",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text:
          "Como já é madrugada, deixei seu atendimento organizado para retomarmos por aqui pela manhã.",
      },
    ],
    conversationAction: {
      action: CONVERSATION_ACTIONS.RESPOND,
      allowHoldingReply: false,
      followupPolicy: "morning_resume",
    },
  });

  assert.equal(result.allowed, true);
});

test("final validation blocks a substantially repeated answer", () => {
  const result = validateOutboundReply({
    body:
      "Não temos vídeo disponível para envio por aqui. A página reúne casos reais para consulta.",
    currentText: "De alguns pacientes em quem foi feito",
    recentConversation: [
      {
        role: "assistant",
        text:
          "Não temos vídeo disponível para envio por aqui. A página reúne alguns casos reais para consulta.",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "substantially_repeated_reply");
});

test("the protected lifting range may repeat only its required composition URL", () => {
  const body = [
    "Como estimativa geral e apenas informativa — não é orçamento, proposta nem garantia de preço:",
    "• Minilifting: entre R$ 18 mil e R$ 25 mil",
    "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
    "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia por técnica, complexidade, necessidades individuais, equipe, hospital, anestesia, materiais e acompanhamento. Não representa honorários isolados.",
    "Veja o que compõe o valor: https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/",
  ].join("\n\n");
  const result = validateOutboundReply({
    body,
    currentText: "Mas qual é a faixa?",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "Veja o que compõe o valor: https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Mas qual é a faixa?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
});

test("the full lifting range and its URL are blocked when already sent", () => {
  const range = [
    "Como estimativa geral e apenas informativa — não é orçamento, proposta nem garantia de preço:",
    "• Minilifting: entre R$ 18 mil e R$ 25 mil",
    "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
    "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Não representa honorários isolados.",
    "Veja o que compõe o valor: https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/",
  ].join("\n");
  const result = validateOutboundReply({
    body: range,
    currentText: "Pode repetir a faixa?",
    recentConversation: [
      { role: "assistant", source: "bruna", text: range },
      { role: "patient", source: "paciente", text: "Pode repetir?" },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "substantially_repeated_reply");
});

test("an ordinary resource remains blocked when its URL was already shared", () => {
  const result = validateOutboundReply({
    body: "Veja novamente: https://draamandaschroeder.com.br/lifting-facial/",
    currentText: "Pode mandar o link?",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "Material: https://draamandaschroeder.com.br/lifting-facial/",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "repeated_resource");
});

test("final validation keeps the bot out of an answer to the human team", () => {
  const result = validateOutboundReply({
    body:
      "Recebi sua mensagem e vou confirmar essa informação com a equipe para te responder com segurança.",
    currentText: "Bom dia! Pode sim",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text:
          "Bom dia, tudo bem? Sua consulta está marcada para hoje às 15h. Posso confirmar sua presença?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "patient_answer_belongs_to_human_context",
  );
});

test("final validation blocks the reported post-quote intrusion even when history includes the patient turn", () => {
  const currentText =
    "Boa noite! Ok, vamos vê lá. Obg, ótimo descanso";
  const result = validateOutboundReply({
    body:
      "Recebi sua mensagem sobre o agendamento. Vou confirmar essa informação com a equipe e retornamos por aqui amanhã pela manhã.",
    currentText,
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
        text: currentText,
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "patient_closed_or_deferred");
});

test("final validation blocks a non-question answer owned by the human context", () => {
  const result = validateOutboundReply({
    body: "Obrigada pela confirmação. Vou dar continuidade por aqui.",
    currentText: "Pescoço",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "A queixa é maior no rosto ou no pescoço?",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Pescoço",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "patient_answer_belongs_to_human_context",
  );
});

test("a new standalone question can reopen a human exchange", () => {
  const result = validateOutboundReply({
    body: "Claro. A Clínica LIV fica na Rua Pais Leme, 215, em Pinheiros.",
    currentText: "Pode sim. Qual é o endereço?",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Posso confirmar sua presença?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
});

test("a broad semantic flag cannot bypass a human-owned context", () => {
  const result = validateOutboundReply({
    body:
      "Sim, fazemos cervicoplastia. É uma cirurgia realizada em hospital, com anestesista e equipe cirúrgica.",
    currentText: "Ai fazem cervicoplastia",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "A Clínica LIV fica em Pinheiros, São Paulo.",
      },
    ],
    conversationAction: {
      ...respond,
      semanticReplyAuthorized: true,
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "patient_answer_belongs_to_human_context");
});

test("an explicit semantic reopen can answer a colloquial question without punctuation", () => {
  const decision = {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: "CONTEXT-REOPEN-01",
    suggestedReply:
      "Sim, fazemos cervicoplastia. É uma cirurgia realizada em hospital, com anestesista e equipe cirúrgica.",
    reviewReason: "context_reopen:cervicoplastia",
  };
  const result = validateOutboundReply({
    body: decision.suggestedReply,
    currentText: "Ai fazem cervicoplastia",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "A Clínica LIV fica em Pinheiros, São Paulo.",
      },
    ],
    conversationAction: buildSemanticReplyConversationAction(
      respond,
      decision,
    ),
  });

  assert.equal(result.allowed, true);
});

test("a semantic reopen still cannot override a closing or deferral", () => {
  const decision = {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: "CONTEXT-REOPEN-01",
    suggestedReply: "Claro, posso continuar te orientando.",
    reviewReason: "context_reopen:continuation",
  };
  const result = validateOutboundReply({
    body: decision.suggestedReply,
    currentText: "Obrigada, qualquer coisa volto depois",
    conversationAction: buildSemanticReplyConversationAction(
      respond,
      decision,
    ),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "patient_closed_or_deferred");
});

test("a validated context clarification gets one question but no link or CTA", () => {
  const decision = {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: "CONTEXT-CLARIFY-01",
    suggestedReply:
      "Quando você diz esse valor, está falando da consulta ou da cirurgia?",
    reviewReason: "context_clarification:price_scope",
  };
  const action = buildSemanticReplyConversationAction(
    {
      ...respond,
      replyContract: {
        maxQuestions: 0,
        maxLinks: 1,
        allowCta: true,
        allowAppointmentConfirmation: false,
      },
    },
    decision,
  );

  assert.equal(validateOutboundReply({
    body: decision.suggestedReply,
    currentText: "E esse valor",
    conversationAction: action,
  }).allowed, true);
  assert.equal(validateOutboundReply({
    body:
      "É sobre a consulta? Você também quer saber o valor da cirurgia?",
    currentText: "E esse valor",
    conversationAction: action,
  }).reason, "too_many_questions_for_context");
  assert.equal(validateOutboundReply({
    body:
      "Você está falando da consulta ou da cirurgia? https://example.com",
    currentText: "E esse valor",
    conversationAction: action,
  }).reason, "too_many_links_for_context");
  assert.equal(validateOutboundReply({
    body: "Quer que eu agende para entender esse valor?",
    currentText: "E esse valor",
    conversationAction: action,
  }).reason, "cta_not_allowed_for_context");
});

test("final validation blocks a planned reply that restarts bot context", () => {
  const result = validateOutboundReply({
    body: "Entendi. Como posso te ajudar?",
    currentText: "Superior",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "A queixa é maior na pálpebra superior ou inferior?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "planned_reply_restarts_context");
});

test("final validation permits a planned reply that uses the bot context", () => {
  const result = validateOutboundReply({
    body:
      "Entendi, a sua dúvida é sobre a pálpebra superior. Nessa região, a avaliação observa pele, bolsas e a posição das sobrancelhas.",
    currentText: "Superior",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "A queixa é maior na pálpebra superior ou inferior?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
});

test("final validation blocks unsafe or unfinished outbound content", () => {
  const cases = [
    ["BEGIN:VCARD\nVERSION:3.0\nTEL:+5511000000000\nEND:VCARD", "contact_card_content"],
    ["Olá, [nome]! Posso ajudar?", "unresolved_placeholder"],
    ["Veja https://draamandaschroeder/lifting-facial/", "malformed_clinic_url"],
    ["Confirmado para 12:00, 12:00.", "duplicated_time"],
    ["x".repeat(1501), "reply_too_long"],
  ];

  for (const [body, reason] of cases) {
    const result = validateOutboundReply({
      body,
      currentText: "Pode me confirmar?",
      conversationAction: respond,
    });
    assert.equal(result.allowed, false, reason);
    assert.equal(result.reason, reason);
  }
});

test("one conversation revision permits only one simultaneous claim", async () => {
  const blobs = fakeBlobs();
  const input = {
    phone: "+5511900000000",
    eventId: "event-1",
  };
  const [first, second] = await Promise.all([
    claimOutboundReply(input, blobs),
    claimOutboundReply(input, blobs),
  ]);

  assert.deepEqual(
    [first.status, second.status].sort(),
    ["completed", "duplicate"],
  );
});

test("controlled send delivers once and suppresses a retry", async () => {
  const blobs = fakeBlobs();
  let sends = 0;
  const input = {
    from: "+5511000000000",
    to: "+5511900000000",
    eventId: "event-2",
    body: "Claro. O endereço é Rua Pais Leme, 215.",
    currentText: "Qual é o endereço?",
    recentConversation: [],
    conversationAction: respond,
  };
  const options = {
    ...blobs,
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed", errorCode: "none" };
    },
  };

  const first = await sendControlledPatientReply(input, options);
  const retry = await sendControlledPatientReply(input, options);

  assert.equal(first.status, "completed");
  assert.equal(retry.status, "duplicate");
  assert.equal(sends, 1);
});

test("controlled send uses the validated trimmed body", async () => {
  const blobs = fakeBlobs();
  let deliveredBody = "";
  const result = await sendControlledPatientReply(
    {
      from: "+5511000000000",
      to: "+5511900000000",
      eventId: "event-trimmed",
      body: "  Claro. Posso ajudar com essa informação.  ",
      currentText: "Pode me ajudar?",
      recentConversation: [],
      conversationAction: respond,
    },
    {
      ...blobs,
      sendYCloudPatientTextImpl: async ({ body }) => {
        deliveredBody = body;
        return { status: "completed", errorCode: "none" };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(deliveredBody, "Claro. Posso ajudar com essa informação.");
});

test("storage failure blocks the send instead of risking a duplicate", async () => {
  let sends = 0;
  const result = await sendControlledPatientReply(
    {
      from: "+5511000000000",
      to: "+5511900000000",
      eventId: "event-storage-failure",
      body: "Claro. Posso ajudar com essa informação.",
      currentText: "Pode me ajudar?",
      recentConversation: [],
      conversationAction: respond,
    },
    {
      getStoreImpl: () => {
        throw new Error("storage unavailable");
      },
      sendYCloudPatientTextImpl: async () => {
        sends += 1;
        return { status: "completed" };
      },
    },
  );

  assert.equal(result.status, "blocked");
  assert.equal(result.errorCode, "reply_claim_unavailable");
  assert.equal(sends, 0);
});

test("a team holding reply requires a real pending request", () => {
  const result = validateOutboundReply({
    body: "Vou confirmar essa informação com a equipe.",
    currentText: "Obrigada, vou pensar",
    conversationAction: {
      action: CONVERSATION_ACTIONS.WAIT_PATIENT,
      allowHoldingReply: false,
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "conversation_action_blocks_reply",
  );
});

test("semantic validation blocks unsafe medical, commercial and contextual claims", () => {
  const cases = [
    ["Sou uma assistente virtual da clínica.", "automation_identity_disclosure"],
    ["Vou confirmar essa informação com a equipe.", "generic_holding_reply"],
    ["O valor da consulta será abatido da cirurgia.", "consultation_credit_claim"],
    ["A nota permite abatimento no Imposto de Renda.", "tax_benefit_claim"],
    ["O reembolso integral é garantido pelo plano.", "reimbursement_promise"],
    ["Parcelamos em 10x sem juros.", "unapproved_payment_specifics"],
    ["A cirurgia custa R$ 30 mil.", "unapproved_monetary_amount"],
    ["Sua consulta está confirmada para amanhã.", "unverified_appointment_confirmation"],
    ["Pela sua foto, predomina flacidez e a melhor opção é o lifting.", "remote_diagnosis_or_indication"],
    ["O resultado é garantido e não deixa cicatriz.", "medical_or_result_promise"],
    ["Você quer saber indicação, recuperação ou valores?", "menu_like_continuation"],
  ];

  for (const [body, reason] of cases) {
    const result = validateOutboundReply({
      body,
      currentText: "Pode me orientar?",
      conversationAction: respond,
    });
    assert.equal(result.allowed, false, body);
    assert.equal(result.reason, reason, body);
  }
});

test("a specific pending fact remains eligible for the human-review acknowledgement", () => {
  const result = validateOutboundReply({
    body:
      "Sobre o tempo exato de atuação da Dra. Amanda, vou confirmar essa informação com a equipe para te responder com precisão.",
    currentText: "Há quantos anos a Dra. Amanda atua?",
    conversationAction: {
      action: CONVERSATION_ACTIONS.WAIT_TEAM,
      allowHoldingReply: true,
      unresolvedRequest: true,
      replyContract: {
        maxQuestions: 0,
        maxLinks: 0,
        allowCta: false,
        allowAppointmentConfirmation: false,
      },
    },
  });

  assert.equal(result.allowed, true);
});

test("the reply contract enforces question, link and CTA limits", () => {
  const contractAction = {
    ...respond,
    replyContract: {
      maxQuestions: 0,
      maxLinks: 0,
      allowCta: false,
      allowAppointmentConfirmation: false,
    },
  };
  const cases = [
    ["O valor é definido após a avaliação. Qual cirurgia você pesquisa?", "too_many_questions_for_context"],
    ["Veja https://draamandaschroeder.com.br/lifting-facial/", "too_many_links_for_context"],
    ["A avaliação é individual. Se quiser, posso te ajudar.", "cta_not_allowed_for_context"],
  ];

  for (const [body, reason] of cases) {
    const result = validateOutboundReply({
      body,
      currentText: "Quanto custa o lifting?",
      conversationAction: contractAction,
    });
    assert.equal(result.allowed, false, body);
    assert.equal(result.reason, reason, body);
  }
});

test("a photo reply must combine empathy, options and the distance limit", () => {
  const photoAction = {
    ...respond,
    replyContract: {
      maxQuestions: 0,
      maxLinks: 0,
      allowCta: false,
      allowAppointmentConfirmation: false,
      requirePhotoDistanceLimit: true,
    },
  };
  const incomplete = validateOutboundReply({
    body: "Obrigada por enviar a foto. Há boas opções.",
    currentText: "Enviei uma foto.",
    conversationAction: photoAction,
  });
  const complete = validateOutboundReply({
    body: "Obrigada por confiar em nós e compartilhar a foto. Há boas opções que podem ajudar, mas uma foto e uma avaliação à distância não permitem definir com segurança o melhor caminho.",
    currentText: "Enviei uma foto.",
    conversationAction: photoAction,
  });

  assert.equal(incomplete.reason, "incomplete_photo_safety_reply");
  assert.equal(complete.allowed, true);
});

test("a verified booking path can send the single appointment confirmation", () => {
  const result = validateOutboundReply({
    body: "Sua consulta está confirmada para 22 de agosto, às 14h.",
    currentText: "Escolha do horário 22/08/2026 14:00",
    conversationAction: {
      ...respond,
      replyContract: {
        maxQuestions: 0,
        maxLinks: 0,
        allowCta: false,
        allowAppointmentConfirmation: true,
      },
    },
  });

  assert.equal(result.allowed, true);
});
