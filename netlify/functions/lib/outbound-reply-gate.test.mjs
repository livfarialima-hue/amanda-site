import assert from "node:assert/strict";
import test from "node:test";
import {
  claimOutboundReply,
  conformOutboundReplyToContract,
  sendControlledPatientReply,
  validateOutboundReply,
} from "./outbound-reply-gate.mjs";
import {
  CONVERSATION_ACTIONS,
  decideConversationAction,
} from "./conversation-action-controller.mjs";
import {
  buildSemanticReplyConversationAction,
} from "./semantic-reply-policy.mjs";
import {
  buildSurgicalPriceSuggestedReply,
} from "./surgical-price-review.mjs";

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

test("the approved first cervical price reply passes with its bounded range offer", () => {
  const currentText = "E gostaria de saber os valores";
  const conversationAction = decideConversationAction({
    text: currentText,
    plan: {
      route: "standard_reply",
      reason: "price_initial_information",
      professional: "amanda",
      procedure: "lifting_cervical",
      automaticAllowed: true,
    },
  });
  const result = validateOutboundReply({
    body:
      "Claro, Adriana. Entendo — ter uma noção de valor ajuda bastante no planejamento. Na cervicoplastia, o orçamento pode variar porque o tratamento pode ser mais localizado ou envolver uma abordagem mais completa do pescoço e da face. A Dra. Amanda define isso após avaliar cada caso.\n\nEste conteúdo explica de forma simples o que costuma compor o valor de uma cirurgia facial: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/\n\nSe, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida.",
    currentText,
    conversationAction,
  });

  assert.equal(result.allowed, true);
});

test("the cervical price exception does not permit a scheduling CTA", () => {
  const currentText = "Gostaria de saber os valores da cervicoplastia";
  const conversationAction = decideConversationAction({
    text: currentText,
    plan: {
      route: "standard_reply",
      reason: "price_initial_information",
      professional: "amanda",
      procedure: "lifting_cervical",
      automaticAllowed: true,
    },
  });
  const result = validateOutboundReply({
    body:
      "Entendo. Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida. Podemos agendar uma avaliação.",
    currentText,
    conversationAction,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "cta_not_allowed_for_context");
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

test("the protected lifting range omits a guide already shared", () => {
  const body = [
    "Como estimativa geral e apenas informativa — não é orçamento, proposta nem garantia de preço:",
    "• Minilifting: entre R$ 18 mil e R$ 25 mil",
    "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
    "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia por técnica, complexidade, necessidades individuais, equipe, hospital, anestesia, materiais e acompanhamento. Não representa honorários isolados.",
  ].join("\n\n");
  const result = validateOutboundReply({
    body,
    currentText: "Mas qual é a faixa?",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "Este conteúdo explica o valor: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/",
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

test("the lifting range without a current or prior guide is blocked", () => {
  const body = [
    "Como estimativa geral e apenas informativa — não é orçamento, proposta nem garantia de preço:",
    "• Minilifting: entre R$ 18 mil e R$ 25 mil",
    "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
    "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia por técnica, complexidade, necessidades individuais, equipe, hospital, anestesia, materiais e acompanhamento. Não representa honorários isolados.",
  ].join("\n\n");
  const result = validateOutboundReply({
    body,
    currentText: "Mas qual é a faixa?",
    recentConversation: [],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "unapproved_monetary_amount");
});

test("the protected otoplasty range passes with the facial price guide", () => {
  const body = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "otoplastia",
    directToPatient: true,
  });
  const result = validateOutboundReply({
    body,
    currentText: "Pode me passar a faixa?",
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
});

test("the protected otoplasty range omits a facial guide already shared", () => {
  const recentConversation = [
    {
      role: "assistant",
      source: "bruna",
      text: "Este guia explica o orçamento: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/",
    },
    {
      role: "patient",
      source: "paciente",
      text: "Pode me passar a faixa?",
    },
  ];
  const body = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "otoplastia",
    directToPatient: true,
    recentConversation,
  });
  const result = validateOutboundReply({
    body,
    currentText: "Pode me passar a faixa?",
    recentConversation,
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
  assert.equal((body.match(/https?:\/\//g) || []).length, 0);
});

test("the otoplasty range without all approved caveats is blocked", () => {
  const body = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "otoplastia",
    directToPatient: true,
  }).replace("Não representa honorários isolados.", "");
  const result = validateOutboundReply({
    body,
    currentText: "Pode me passar a faixa?",
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "unapproved_monetary_amount");
});

test("a different otoplasty range remains blocked", () => {
  const body = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "otoplastia",
    directToPatient: true,
  }).replace("R$ 14 mil", "R$ 15 mil");
  const result = validateOutboundReply({
    body,
    currentText: "Pode me passar a faixa?",
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "unapproved_monetary_amount");
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

test("an explicit semantic continuation can fulfill a human information offer", () => {
  const decision = {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: "CONTEXT-CONTINUE-01",
    suggestedReply:
      "Na consulta, a Dra. Amanda entende seus objetivos, faz a avaliação presencial e explica possibilidades, limites e recuperação.",
    reviewReason: "context_continue:consulta",
  };
  const action = buildSemanticReplyConversationAction(
    respond,
    decision,
  );
  const context = [
    {
      role: "assistant",
      source: "equipe_humana",
      text: "Quer que eu te explique como funciona a consulta com ela?",
    },
  ];

  assert.equal(validateOutboundReply({
    body: decision.suggestedReply,
    currentText: "Sim",
    recentConversation: context,
    conversationAction: action,
  }).allowed, true);
  assert.equal(validateOutboundReply({
    body:
      `${decision.suggestedReply} Quer que eu veja horários?`,
    currentText: "Sim",
    recentConversation: context,
    conversationAction: action,
  }).reason, "too_many_questions_for_context");
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
  let ledgerBody = "";
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
      recordDurableConversationTurnImpl: async ({ text }) => {
        ledgerBody = text;
        return { status: "completed" };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(deliveredBody, "Claro. Posso ajudar com essa informação.");
  assert.equal(ledgerBody, deliveredBody);
  assert.equal(result.conversationLedgerStatus, "completed");
});

test("a zero-link continuation removes the link sentence and sends the useful answer", async () => {
  const blobs = fakeBlobs();
  let deliveredBody = "";
  let ledgerBody = "";
  const conversationAction = {
    ...respond,
    semanticReplyAuthorized: true,
    semanticReplyCode: "CONTEXT-CONTINUE-01",
    replyContract: {
      maxQuestions: 0,
      maxLinks: 0,
      allowCta: false,
      allowAppointmentConfirmation: false,
    },
  };
  const generatedBody =
    "O lifting cervical trata a flacidez do pescoço e melhora seu contorno. " +
    "A indicação e o planejamento são individuais. " +
    "Você pode conhecer mais no site: https://draamandaschroeder.com.br/lifting-cervical";

  assert.equal(
    conformOutboundReplyToContract({
      body: generatedBody,
      conversationAction,
    }),
    "O lifting cervical trata a flacidez do pescoço e melhora seu contorno. A indicação e o planejamento são individuais.",
  );

  const result = await sendControlledPatientReply(
    {
      from: "+5511000000000",
      to: "+5511900000000",
      eventId: "event-zero-link-continuation",
      body: generatedBody,
      currentText: "Lifting cervical",
      recentConversation: [{
        role: "assistant",
        source: "bruna",
        text:
          "Posso te orientar sobre cervicoplastia (lifting cervical). O que você gostaria de entender primeiro?",
      }],
      conversationAction,
    },
    {
      ...blobs,
      sendYCloudPatientTextImpl: async ({ body }) => {
        deliveredBody = body;
        return { status: "completed", errorCode: "none" };
      },
      recordDurableConversationTurnImpl: async ({ text }) => {
        ledgerBody = text;
        return { status: "completed" };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(result.body, deliveredBody);
  assert.equal(ledgerBody, deliveredBody);
  assert.doesNotMatch(deliveredBody, /https?:\/\//i);
});

test("a zero-link contract still fails closed when the reply contains only a link", async () => {
  let sends = 0;
  const result = await sendControlledPatientReply(
    {
      from: "+5511000000000",
      to: "+5511900000000",
      eventId: "event-link-only",
      body: "Veja https://draamandaschroeder.com.br/lifting-cervical",
      currentText: "Lifting cervical",
      conversationAction: {
        ...respond,
        replyContract: {
          maxQuestions: 0,
          maxLinks: 0,
          allowCta: false,
          allowAppointmentConfirmation: false,
        },
      },
    },
    {
      ...fakeBlobs(),
      sendYCloudPatientTextImpl: async () => {
        sends += 1;
        return { status: "completed", errorCode: "none" };
      },
    },
  );

  assert.equal(result.status, "blocked");
  assert.equal(result.errorCode, "empty_reply");
  assert.equal(sends, 0);
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

test("a photo reply acknowledges the patient and offers a human path without a mechanical disclaimer", () => {
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
    body: "Obrigada por compartilhar sua foto e confiar na equipe. A Dra. Amanda poderá avaliar pessoalmente os detalhes importantes e conversar com você sobre as possibilidades que façam sentido.",
    currentText: "Enviei uma foto.",
    conversationAction: photoAction,
  });
  const approved = validateOutboundReply({
    body: "Obrigada por compartilhar sua foto e confiar na gente. Entendo que você queira saber o que pode ser feito, e acredito que temos boas abordagens que podem ajudar a tratar esse tipo de queixa. Vou mostrar a foto à Dra. Amanda para que ela veja o que você gostaria de melhorar. Em uma avaliação, ela poderá observar todos os detalhes com cuidado e conversar com você sobre o caminho que faça mais sentido, sempre respeitando suas características.",
    currentText: "Enviei uma foto.",
    conversationAction: photoAction,
  });
  const mechanical = validateOutboundReply({
    body: "Obrigada por compartilhar sua foto. Vou encaminhá-la à equipe, sem concluir diagnóstico ou indicação apenas pela imagem.",
    currentText: "Enviei uma foto.",
    conversationAction: photoAction,
  });

  assert.equal(incomplete.reason, "incomplete_photo_safety_reply");
  assert.equal(complete.allowed, true);
  assert.equal(approved.allowed, true);
  assert.equal(mechanical.reason, "mechanical_photo_disclaimer");
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

test("a validated semantic continuation overrides only the mechanical closing label", () => {
  const allowed = validateOutboundReply({
    body:
      "Na consulta, a Dra. Amanda entende seus objetivos, faz a avaliação presencial e explica possibilidades, limites e recuperação.",
    currentText: "Certo",
    recentConversation: [{
      role: "assistant",
      source: "bruna",
      text: "Posso te explicar como funciona a consulta.",
    }],
    conversationAction: {
      ...respond,
      semanticReplyAuthorized: true,
      semanticReplyCode: "CONTEXT-CONTINUE-01",
      replyContract: {
        maxQuestions: 0,
        maxLinks: 0,
        allowCta: false,
        allowAppointmentConfirmation: false,
      },
    },
  });
  const mechanicalOnly = validateOutboundReply({
    body: "Claro, posso ajudar.",
    currentText: "Certo",
    conversationAction: respond,
  });

  assert.equal(allowed.allowed, true);
  assert.equal(mechanicalOnly.reason, "patient_closed_or_deferred");
});
