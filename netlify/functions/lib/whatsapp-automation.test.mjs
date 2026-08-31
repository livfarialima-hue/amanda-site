import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichAutomationPlanFromConversation,
  hasCampaignReferenceCode,
  isAvailabilityRequest,
  isConsultationInformationRequest,
  isConsultationPriceRequest,
  isLikelyMarketingPrefilledMessage,
  isSchedulingRequest,
  planAutomation,
} from "./whatsapp-automation.mjs";

const INITIAL_PRICE_REPLY =
  "Os valores cirúrgicos são definidos individualmente após a avaliação e o planejamento. Veja o que compõe o valor: https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/";
const CONVERSATIONAL_INITIAL_PRICE_REPLY =
  "Entendo — é natural querer saber o valor antes de decidir. Como cada cirurgia é planejada de forma individual, a Dra. Amanda confirma o valor exato após a avaliação. Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida.";
const CERVICAL_INITIAL_PRICE_REPLY =
  "Entendo — ter uma noção de valor ajuda bastante no planejamento. Na cervicoplastia, o orçamento pode variar porque o tratamento pode ser mais localizado ou envolver uma abordagem mais completa do pescoço e da face. A Dra. Amanda define isso após avaliar cada caso. Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida.";
const OTOPLASTY_INITIAL_PRICE_REPLY =
  "Entendo — é natural querer saber o valor antes de decidir. Como cada cirurgia é planejada de forma individual, a Dra. Amanda confirma o valor exato após a avaliação. Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida.";

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

test("intense appearance distress is reviewed without commercial automation", () => {
  const messages = [
    "Odeio meu rosto, ele acabou com a minha vida",
    "Preciso fazer a cirurgia para salvar meu relacionamento",
    "Quero ser perfeita",
    "Nunca vou ficar satisfeita com a minha aparência",
  ];

  for (const text of messages) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "M26F02S-C06H01",
      platform: "Meta",
    });

    assert.equal(plan.route, "human_review", text);
    assert.equal(plan.reason, "intense_appearance_distress", text);
    assert.equal(plan.automaticAllowed, false, text);
  }
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

test("the first lifting price question receives only the approved initial information", () => {
  const plan = planAutomation({
    text: "Qual o valor do lifting facial?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "price_initial_information");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.priceRequestKind, "amount");
  assert.equal(plan.automaticAllowed, true);
});

test("a repeated lifting price question receives the approved ranges automatically", () => {
  const preliminaryPlan = planAutomation({
    text: "Mas qual é a média do minilifting?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: INITIAL_PRICE_REPLY,
        at: "2026-08-02T11:00:00.000Z",
      },
    ],
  );

  assert.equal(preliminaryPlan.reason, "price_initial_information");
  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "lifting_price_range_direct");
  assert.equal(enrichedPlan.procedure, "lifting_facial");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("the conversational first price reply is recognized on a repeated lifting question", () => {
  const preliminaryPlan = planAutomation({
    text: "Mas qual é a média do lifting facial?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: CONVERSATIONAL_INITIAL_PRICE_REPLY,
      },
    ],
  );

  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "lifting_price_range_direct");
  assert.equal(enrichedPlan.procedure, "lifting_facial");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("the real cervical sequence receives the softer first price response instead of silence", () => {
  const preliminaryPlan = planAutomation({
    text: "E gostaria de saber os valores",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Olá! Quero saber sobre lifting cervical com a Dra. Amanda.",
      },
      {
        role: "assistant",
        source: "bruna",
        text: "O que você gostaria de entender primeiro sobre lifting cervical?",
      },
      { role: "user", source: "patient", text: "Sim, gostaria" },
    ],
  );

  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "price_initial_information");
  assert.equal(enrichedPlan.procedure, "lifting_cervical");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("a cervical patient who accepts the approved offer receives the range", () => {
  const preliminaryPlan = planAutomation({
    text: "Sim, pode me passar",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Quero saber sobre lifting cervical.",
      },
      {
        role: "assistant",
        source: "bruna",
        text: CERVICAL_INITIAL_PRICE_REPLY,
      },
    ],
  );

  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "lifting_price_range_direct");
  assert.equal(enrichedPlan.replyCode, "LIFTING-PRICE-RANGE-01");
  assert.equal(enrichedPlan.procedure, "lifting_cervical");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("the first otoplasty price question keeps the range for the next step", () => {
  const plan = planAutomation({
    text: "Tudo sobre otoplastia, inclusive valores",
    messageType: "text",
    reference: "G26OTO-816612405034-OT01",
    platform: "Google",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "price_initial_information");
  assert.equal(plan.procedure, "otoplastia");
  assert.equal(plan.priceRequestKind, "amount");
  assert.equal(plan.automaticAllowed, true);
});

test("an otoplasty patient who accepts the approved offer receives the range", () => {
  const preliminaryPlan = planAutomation({
    text: "Sim, pode me passar",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Quero saber sobre otoplastia em adultos.",
      },
      {
        role: "assistant",
        source: "bruna",
        text: OTOPLASTY_INITIAL_PRICE_REPLY,
      },
    ],
  );

  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "otoplasty_price_range_direct");
  assert.equal(enrichedPlan.replyCode, "OTOPLASTY-PRICE-RANGE-01");
  assert.equal(enrichedPlan.procedure, "otoplastia");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("a repeated otoplasty amount request receives the approved range", () => {
  const preliminaryPlan = planAutomation({
    text: "Mas qual é a média da otoplastia?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: OTOPLASTY_INITIAL_PRICE_REPLY,
      },
    ],
  );

  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "otoplasty_price_range_direct");
  assert.equal(enrichedPlan.procedure, "otoplastia");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("the otoplasty range is not sent twice in the recent context", () => {
  const preliminaryPlan = planAutomation({
    text: "Pode repetir a faixa da otoplastia?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: OTOPLASTY_INITIAL_PRICE_REPLY,
      },
      {
        role: "assistant",
        source: "bruna",
        text: "Como estimativa geral, a otoplastia costuma ficar entre R$ 8 mil e R$ 14 mil.",
      },
    ],
  );

  assert.equal(enrichedPlan.route, "human_review");
  assert.equal(enrichedPlan.reason, "otoplasty_price_range_already_sent_review");
  assert.equal(enrichedPlan.automaticAllowed, false);
});

test("the cervical range is not sent twice after an explicit repeat request", () => {
  const preliminaryPlan = planAutomation({
    text: "Pode repetir a faixa da cervicoplastia?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Quero saber sobre cervicoplastia.",
      },
      {
        role: "assistant",
        source: "bruna",
        text: CERVICAL_INITIAL_PRICE_REPLY,
      },
      {
        role: "assistant",
        source: "bruna",
        text: "Como estimativa geral, a cervicoplastia (lifting cervical) costuma ficar entre R$ 18 mil e R$ 26 mil.",
      },
    ],
  );

  assert.equal(enrichedPlan.route, "human_review");
  assert.equal(enrichedPlan.reason, "lifting_price_range_already_sent_review");
  assert.equal(enrichedPlan.automaticAllowed, false);
});

test("the bot does not send the full lifting range twice in the same recent context", () => {
  const preliminaryPlan = planAutomation({
    text: "Pode repetir a faixa do lifting?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: INITIAL_PRICE_REPLY,
      },
      {
        role: "assistant",
        source: "bruna",
        text: [
          "Como estimativa geral e apenas informativa:",
          "• Minilifting: entre R$ 18 mil e R$ 25 mil",
          "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
        ].join("\n"),
      },
    ],
  );

  assert.equal(enrichedPlan.route, "human_review");
  assert.equal(
    enrichedPlan.reason,
    "lifting_price_range_already_sent_review",
  );
  assert.equal(enrichedPlan.procedure, "lifting_facial");
  assert.equal(enrichedPlan.automaticAllowed, false);
});

test("a first price question for another surgery goes directly to human review", () => {
  const preliminaryPlan = planAutomation({
    text: "Qual o valor da blefaroplastia?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(preliminaryPlan.route, "human_review");
  assert.equal(preliminaryPlan.reason, "surgical_price_review");
  assert.equal(preliminaryPlan.procedure, "blefaroplastia");
  assert.equal(preliminaryPlan.automaticAllowed, false);
});

test("price terms without an approved automatic procedure go to human review", () => {
  for (const text of [
    "Vcs parcelam em quantas vezes?",
    "O valor que vocês passam já inclui hospital e anestesia?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "human_review", text);
    assert.equal(plan.reason, "price_without_confirmed_procedure", text);
    assert.equal(plan.priceRequestKind, "terms", text);
    assert.equal(plan.automaticAllowed, false, text);
  }
});

test("conversation context restores the automatic cervical price path", () => {
  const preliminaryPlan = planAutomation({
    text: "E os valores?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const plan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Quero saber sobre cervicoplastia.",
      },
      {
        role: "assistant",
        source: "bruna",
        text: "O que você gostaria de entender primeiro?",
      },
    ],
  );

  assert.equal(preliminaryPlan.route, "human_review");
  assert.equal(preliminaryPlan.reason, "price_without_confirmed_procedure");
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "price_initial_information");
  assert.equal(plan.procedure, "lifting_cervical");
  assert.equal(plan.automaticAllowed, true);
});

test("pending hospital quote remains human-only even with conversation context", () => {
  const text = [
    "Dra., quando voc\u00ea tiver o valor do hospital, poderia, por favor, me informar?",
    "Gostaria de realizar a cirurgia o mais r\u00e1pido poss\u00edvel.",
  ].join(" ");
  const preliminaryPlan = planAutomation({
    text,
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Obrigada pelo aviso.",
        at: "2026-07-29T14:47:00.000Z",
      },
    ],
  );

  assert.equal(preliminaryPlan.route, "human_review");
  assert.equal(
    preliminaryPlan.reason,
    "pending_hospital_quote_followup",
  );
  assert.equal(preliminaryPlan.automaticAllowed, false);
  assert.equal(enrichedPlan.route, "human_review");
  assert.equal(enrichedPlan.automaticAllowed, false);
});

test("answers the hospital setting directly for cervical and facial lifting", () => {
  for (const [text, procedure] of [
    ["O lifting cervical é feito no hospital?", "lifting_cervical"],
    ["O lifting facial é realizado em ambiente hospitalar?", "lifting_facial"],
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "standard_reply", text);
    assert.equal(plan.reason, "hospital_setting_request", text);
    assert.equal(plan.replyCode, "AMANDA-HOSPITAL-01", text);
    assert.equal(plan.procedure, procedure, text);
    assert.equal(plan.automaticAllowed, true, text);
  }
});

test("resolves a pronoun-only hospital question from the cervical campaign before any bot reply", () => {
  const preliminaryPlan = planAutomation({
    text: "Este procedimento é feito no hospital?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Olá! Quero saber sobre lifting cervical com a Dra. Amanda. Ref. M26C01W-C07H01",
      },
      { role: "user", source: "patient", text: "Olá" },
    ],
  );

  assert.equal(
    preliminaryPlan.reason,
    "hospital_setting_context_required",
  );
  assert.equal(preliminaryPlan.automaticAllowed, false);
  assert.equal(enrichedPlan.route, "standard_reply");
  assert.equal(enrichedPlan.reason, "hospital_setting_request");
  assert.equal(enrichedPlan.replyCode, "AMANDA-HOSPITAL-01");
  assert.equal(enrichedPlan.procedure, "lifting_cervical");
  assert.equal(enrichedPlan.automaticAllowed, true);
});

test("resolves a pronoun-only hospital question from campaign codes instead of assuming lifting", () => {
  const preliminaryPlan = planAutomation({
    text: "Este procedimento é feito no hospital?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const cases = [
    ["M26C01W-C07H01", "lifting_cervical", "standard_reply"],
    ["M26C02S-C07H01", "lifting_cervical", "standard_reply"],
    ["M26F01W-C06H01", "lifting_facial", "standard_reply"],
    ["M26O01W-DbHKuWfGP_N-OT02", "otoplastia", "human_review"],
  ];

  for (const [reference, procedure, route] of cases) {
    const enrichedPlan = enrichAutomationPlanFromConversation(
      preliminaryPlan,
      [
        {
          role: "user",
          source: "patient",
          text: `Olá! Quero saber mais. Ref. ${reference}`,
        },
        { role: "user", source: "patient", text: "Olá" },
      ],
    );

    assert.equal(enrichedPlan.route, route, reference);
    assert.equal(enrichedPlan.procedure, procedure, reference);
    assert.equal(
      enrichedPlan.automaticAllowed,
      route === "standard_reply",
      reference,
    );
  }
});

test("the latest explicit patient procedure overrides an older campaign context", () => {
  const preliminaryPlan = planAutomation({
    text: "Este procedimento é feito no hospital?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Olá! Quero saber mais. Ref. M26C01W-C07H01",
      },
      {
        role: "user",
        source: "patient",
        text: "Na verdade, agora quero saber sobre blefaroplastia.",
      },
    ],
  );

  assert.equal(enrichedPlan.route, "human_review");
  assert.equal(enrichedPlan.reason, "hospital_setting_context_required");
  assert.equal(enrichedPlan.procedure, "blefaroplastia");
  assert.equal(enrichedPlan.automaticAllowed, false);
});

test("does not generalize the approved hospital fact to another procedure", () => {
  const plan = planAutomation({
    text: "A blefaroplastia é feita no hospital?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "human_review");
  assert.equal(plan.reason, "hospital_setting_context_required");
  assert.equal(plan.procedure, "blefaroplastia");
  assert.equal(plan.automaticAllowed, false);
});

test("asking how the consultation works stays in automatic conversation", () => {
  for (const text of [
    "Estou fazendo uma pesquisa. Seria interessante saber como funciona a consulta.",
    "Como funciona a avaliação?",
    "Queria entender o que acontece na consulta",
    "Por favor, me explique a avaliação.",
    "Pode me explicar como funciona a consulta?",
    "Gostaria que me explicasse a avaliação.",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "M26F01W-C06H01",
      platform: "Meta",
    });

    assert.equal(isConsultationInformationRequest(text), true, text);
    assert.equal(isSchedulingRequest(text), false, text);
    assert.equal(plan.route, "standard_reply", text);
    assert.equal(plan.reason, "consultation_information_request", text);
    assert.equal(plan.replyCode, "AMANDA-CONSULTA-INFO-01", text);
    assert.equal(plan.automaticAllowed, true, text);
  }
});

test("a reply to an automatic follow-up resumes the safe consultation explanation", () => {
  const text = "Por favor, me explique a avaliação.";
  const preliminaryPlan = planAutomation({
    text,
    messageType: "text",
    reference: "M26F01W-C06H01",
    platform: "Meta",
  });
  const plan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [
      {
        role: "user",
        source: "patient",
        text: "Olá! Quero saber sobre lifting facial com a Dra. Amanda.",
      },
      {
        role: "assistant",
        source: "bruna",
        eventId: "scheduled-followup-case-1",
        text:
          "Olá! Queria retomar nossa conversa sobre lifting facial. Se preferir, também posso explicar como funciona a avaliação com a Dra. Amanda.",
      },
    ],
  );

  assert.equal(isConsultationInformationRequest(text), true);
  assert.equal(isSchedulingRequest(text), false);
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "consultation_information_request");
  assert.equal(plan.replyCode, "AMANDA-CONSULTA-INFO-01");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.automaticAllowed, true);
});

test("real appointment requests remain scheduling requests", () => {
  for (const text of [
    "Quero marcar uma avaliação.",
    "Tem horário para avaliação?",
    "Quais datas vocês têm para a consulta?",
  ]) {
    assert.equal(isConsultationInformationRequest(text), false, text);
    assert.equal(isSchedulingRequest(text), true, text);
  }
});

test("consultation access and price are not mistaken for surgical price", () => {
  const text =
    "Gostaria de saber como faço para passar em consulta com a Dra. e o valor?";
  const plan = planAutomation({
    text,
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(isConsultationInformationRequest(text), true);
  assert.equal(isConsultationPriceRequest(text), true);
  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "consultation_information_request");
  assert.equal(plan.professional, "amanda");
  assert.equal(plan.consultationPriceRequested, true);
  assert.equal(plan.automaticAllowed, true);
});

test("a low-risk aesthetic statement reaches AI triage even when conversation memory is unavailable", () => {
  const plan = planAutomation({
    text: "Eu tenho o pescoço flácido",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "ai_safety_triage");
  assert.equal(plan.automaticAllowed, true);
});

test("prefilled Google consultation text is treated as campaign context", () => {
  const text = [
    "Olá, gostaria de saber como funciona a consulta com a Dra. Amanda",
    "e consultar a disponibilidade. Ref. g26f01-816509565979-LF01",
    "GBRAID: 0AAAAA_test",
  ].join(" ");
  const plan = planAutomation({
    text,
    messageType: "text",
    reference: "G26F01",
    platform: "Google",
    templateId: "procedure_evaluation_v1",
  });

  assert.equal(isConsultationInformationRequest(text), true);
  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      templateId: "procedure_evaluation_v1",
    }),
    true,
  );
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "known_procedure");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.automaticAllowed, true);
});

test("prefilled Meta procedure text is context while a real consultation question is answered", () => {
  const prefilled =
    "Ol\u00e1! Quero saber sobre lifting facial com a Dra. Amanda. Ref. M26F01W-C06H01";
  const prefilledPlan = planAutomation({
    text: prefilled,
    messageType: "text",
    reference: "M26F01W-C06H01",
    platform: "Meta",
    templateId: "procedure_evaluation_v1",
  });
  const realQuestionPlan = planAutomation({
    text: "Como funciona a avalia\u00e7\u00e3o?",
    messageType: "text",
    reference: "M26F01W-C06H01",
    platform: "Meta",
  });

  assert.equal(
    isLikelyMarketingPrefilledMessage({
      templateId: "procedure_evaluation_v1",
    }),
    true,
  );
  assert.equal(prefilledPlan.reason, "known_procedure");
  assert.equal(realQuestionPlan.reason, "consultation_information_request");
});

test("an explicit lifting price question added to a marketing template uses the initial price route", () => {
  const plan = planAutomation({
    text:
      "Ol\u00e1! Quero saber sobre lifting facial com a Dra. Amanda. " +
      "Ref. M26F01W-C06H01. Qual \u00e9 o valor da cirurgia?",
    messageType: "text",
    reference: "M26F01W-C06H01",
    platform: "Meta",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "price_initial_information");
});

test("Google codes personalize the procedure without implying scheduling", () => {
  const cases = [
    ["G26LIFT", "lifting_facial"],
    ["G26CERV", "lifting_cervical"],
    ["G26BLEF", "blefaroplastia"],
    ["G26OTO", "otoplastia"],
    ["G26FACE", "avaliacao_facial"],
  ];

  for (const [reference, procedure] of cases) {
    const plan = planAutomation({
      text: "Gostaria de saber mais",
      messageType: "text",
      reference,
      platform: "Google",
    });

    assert.equal(plan.route, "standard_reply", reference);
    assert.equal(plan.reason, "known_procedure", reference);
    assert.equal(plan.procedure, procedure, reference);
    assert.equal(isAvailabilityRequest("Gostaria de saber mais"), false);
  }
});

test("procedure-page CTA codes preserve cervical, blepharoplasty and otoplasty context", () => {
  const cases = [
    ["LC01", "lifting_cervical"],
    ["BF01", "blefaroplastia"],
    ["OT01", "otoplastia"],
  ];

  for (const [reference, procedure] of cases) {
    const plan = planAutomation({
      text:
        "Olá, gostaria de saber como funciona a consulta com a Dra. Amanda " +
        `e consultar a disponibilidade. Ref. ${reference}`,
      messageType: "text",
      reference,
      platform: "Orgânico/Conteúdo",
      templateId: "procedure_evaluation_v1",
    });

    assert.equal(plan.route, "standard_reply", reference);
    assert.equal(plan.reason, "known_procedure", reference);
    assert.equal(plan.procedure, procedure, reference);
    assert.equal(plan.automaticAllowed, true, reference);
  }
});

test("existing patient documents are sent to human review without an automatic reply", () => {
  for (const text of [
    "Segue os documentos assinados",
    "Encaminho os exames para dar seguimento ao trâmite da cirurgia",
    "Documentos assinados para o procedimento",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "human_review");
    assert.equal(
      plan.reason,
      "existing_patient_administrative_followup",
    );
    assert.equal(plan.automaticAllowed, false);
  }
});

test("a repeated greeting shortly after a clinic reply is silent", () => {
  const plan = planAutomation({
    text: "Olá",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const now = Date.parse("2026-07-27T16:30:00.000Z");
  const enriched = enrichAutomationPlanFromConversation(
    plan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: "Boa tarde, Rosana! Como posso ajudar?",
        at: "2026-07-27T16:29:00.000Z",
      },
    ],
    now,
  );

  assert.equal(enriched.route, "ignore");
  assert.equal(
    enriched.reason,
    "repeated_greeting_after_recent_reply",
  );
  assert.equal(enriched.automaticAllowed, false);
});

test("a greeting after the short suppression window can restart the conversation", () => {
  const plan = planAutomation({
    text: "Boa tarde",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enriched = enrichAutomationPlanFromConversation(
    plan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: "Como posso ajudar?",
        at: "2026-07-27T16:20:00.000Z",
      },
    ],
    Date.parse("2026-07-27T16:30:00.000Z"),
  );

  assert.equal(enriched.route, "standard_reply");
});

test("incomplete C06 campaign reference still identifies lifting facial", () => {
  const plan = planAutomation({
    text: "Olá! Gostaria de saber mais sobre avaliação com a Dra. Amanda. Ref. M26F01W-C06",
    messageType: "text",
    reference: "M26F01W-C06",
    platform: "Meta",
    referralContext: null,
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "known_procedure");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.replyCode, "M-C06-WA-01");
  assert.equal(plan.automaticAllowed, true);
});

test("the first frontoplasty price question creates a human review", () => {
  const plan = planAutomation({
    text: "Gostaria de saber o valor da frontoplastia",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "human_review");
  assert.equal(plan.reason, "surgical_price_review");
  assert.equal(plan.replyCode, null);
  assert.equal(plan.procedure, "frontoplastia");
  assert.equal(plan.automaticAllowed, false);
});

test("generic first message from a Meta ad remains eligible for Bruna", () => {
  const plan = planAutomation({
    text: "Olá, posso obter mais informações sobre isso?",
    messageType: "text",
    reference: "META-DIRETO-SEM-CODIGO",
    platform: "Meta",
    referralContext: {
      sourceType: "ad",
      mediaType: "video",
      headline: "Conheça a Clínica LIV Faria Lima",
    },
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "meta_referral_initial_inquiry");
  assert.equal(plan.replyCode, "META-DIR-01");
  assert.equal(plan.professional, "amanda");
  assert.equal(plan.automaticAllowed, true);
});

test("Meta ad context identifies facial evaluation without inventing intent", () => {
  const plan = planAutomation({
    text: "Olá, posso obter mais informações sobre isso?",
    messageType: "text",
    reference: "META-DIRETO-SEM-CODIGO",
    platform: "Meta",
    referralContext: {
      sourceType: "ad",
      mediaType: "video",
      headline: "Como funciona a avaliação facial",
      body: "Entenda a consulta com a Dra. Amanda.",
    },
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.replyCode, "M-C01-WA-01");
  assert.equal(plan.procedure, "avaliacao_facial");
  assert.equal(plan.professional, "amanda");
});

test("commercial solicitations are ignored before spending on AI", () => {
  for (const text of [
    "Olá, somos uma agência de marketing digital e gostaríamos de apresentar nossos serviços",
    "Tenho uma proposta comercial para a clínica",
    "Gostaria de oferecer nossos serviços de gestão de tráfego",
    "Aceitam parceria de divulgação por permuta?",
    "Trabalho com gestão e otimização do Perfil da Empresa no Google para ampliar a visibilidade no Google Maps e conquistar clientes de forma orgânica.",
    "Sou a Magda, da Clínica OXY Maia. Agora temos uma Câmara Hiperbárica e uma condição especial de inauguração. Quer que eu envie os valores?",
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

test("promotional media inherits the recent commercial context while patient photos keep their review route", () => {
  const commercialTurn = {
    role: "user",
    source: "patient",
    at: "2026-08-31T12:14:00-03:00",
    text:
      "Sou da Clínica OXY Maia. Temos uma novidade e uma condição especial de inauguração. Quer que eu envie os valores?",
  };
  const promotionalImage = planAutomation({
    text: "",
    messageType: "image",
    recentConversation: [commercialTurn],
    contactAt: "2026-08-31T12:14:10-03:00",
  });

  assert.equal(promotionalImage.route, "ignore");
  assert.equal(
    promotionalImage.reason,
    "commercial_solicitation_or_partnership",
  );
  assert.equal(promotionalImage.automaticAllowed, false);

  const patientImage = planAutomation({
    text: "",
    messageType: "image",
    recentConversation: [
      {
        role: "user",
        source: "patient",
        at: "2026-08-31T12:14:00-03:00",
        text: "Quero mostrar o que está me incomodando no pescoço.",
      },
    ],
    contactAt: "2026-08-31T12:14:10-03:00",
  });

  assert.equal(patientImage.route, "human_review");
  assert.equal(patientImage.reason, "unsupported_or_empty_message");
});

test("patient questions about payment or insurance are not mistaken for sales", () => {
  for (const text of [
    "A consulta aceita convênio?",
    "Posso pagar a cirurgia no cartão?",
    "Quero uma avaliação para aumentar as mamas",
    "Pode me enviar a localização da clínica no Google Maps?",
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

test("a later explicit offer of health insurance is ignored", () => {
  for (const text of [
    "Trabalho com seguros e queria apresentar uma proposta",
    "Gostaria de oferecer um plano de saúde para a clínica",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "META-DIRETO-SEM-CODIGO",
      platform: "Meta",
      referralContext: {
        sourceType: "ad",
        headline: "Avaliação facial",
      },
    });

    assert.equal(plan.route, "ignore");
    assert.equal(
      plan.reason,
      "commercial_solicitation_or_partnership",
    );
  }
});

test("personal invitations and unrelated small talk are ignored", () => {
  for (const text of [
    "Dra Amanda, vamos almoçar amanhã?",
    "Queria te convidar para jantar",
    "A Dra Amanda está solteira?",
    "Me passa seu Instagram pessoal",
    "Qual o seu signo?",
    "Vai chover hoje?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "ignore");
    assert.equal(plan.reason, "irrelevant_or_personal_contact");
    assert.equal(plan.automaticAllowed, false);
  }
});

test("recovery questions containing lunch or leaving remain available for review", () => {
  for (const text of [
    "Posso almoçar normalmente depois da cirurgia?",
    "Quando posso sair de casa no pós-operatório?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.notEqual(plan.reason, "irrelevant_or_personal_contact");
  }
});

test("an unrelated short direct message reaches AI triage instead of being assumed to be a clinic inquiry", () => {
  const plan = planAutomation({
    text: "Qual seu time?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.notEqual(plan.reason, "short_direct_initial_inquiry");
  assert.equal(plan.reason, "ai_safety_triage");
  assert.equal(plan.automaticAllowed, true);
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

test("an official Instagram request is answered and inherits the lifting context", () => {
  const currentPlan = planAutomation({
    text: "Posso ver o Instagram?",
    messageType: "text",
    reference: "META-DIRETO-SEM-CODIGO",
    platform: "Meta",
  });
  const enriched = enrichAutomationPlanFromConversation(currentPlan, [
    {
      role: "patient",
      source: "paciente",
      text: "Olá! Quero saber sobre lifting facial com a Dra. Amanda. Ref. M26F01W-C06H01",
    },
    {
      role: "assistant",
      source: "bruna",
      text: "Posso te orientar sobre lifting facial.",
    },
  ]);

  assert.equal(enriched.route, "standard_reply");
  assert.equal(enriched.reason, "official_instagram_request");
  assert.equal(enriched.replyCode, "AMANDA-OFFICIAL-LINKS-01");
  assert.equal(enriched.professional, "amanda");
  assert.equal(enriched.procedure, "lifting_facial");
  assert.equal(enriched.automaticAllowed, true);
});

test("campaign reference questions are explained without human review", () => {
  for (const text of [
    "Não entendi essas referências dra. Amanda?",
    "O que significa essa Ref.?",
    "Para que serve esse código?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "M26F01W-C06H01",
      platform: "Meta",
    });

    assert.equal(plan.route, "standard_reply", text);
    assert.equal(plan.reason, "campaign_reference_explanation", text);
    assert.equal(plan.replyCode, "CAMPAIGN-REFERENCE-01", text);
    assert.equal(plan.automaticAllowed, true, text);
  }

  assert.equal(hasCampaignReferenceCode("Ref. M26F01W-C06H01"), true);
  assert.equal(hasCampaignReferenceCode("Sem código de campanha"), false);
});

test("a named health-plan acceptance question receives a safe automatic route", () => {
  const plan = planAutomation({
    text: "Aceitam Amil?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "insurance_acceptance_request");
  assert.equal(plan.automaticAllowed, true);
  assert.equal(plan.professional, null);
});

test("the generic LIV site service picker is not misclassified as cardiology", () => {
  const text = [
    "Ola, vim pelo site da Clinica LIV. Gostaria de agendar uma consulta. Meu interesse e: cirurgia plastica/estetica, cardiologia ou duvida sobre procedimento.",
    "Origem do contato: site LIV Faria Lima",
  ].join("\n\n");
  const plan = planAutomation({
    text,
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
    templateId: "procedure_evaluation_v1",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "marketing_prefilled_without_procedure");
  assert.equal(plan.professional, null);
  assert.equal(plan.automaticAllowed, true);
});

test("an insurance follow-up preserves blepharoplasty from the conversation", () => {
  const plan = enrichAutomationPlanFromConversation(
    planAutomation({
      text: "Pode ser realizado através do convênio?",
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    }),
    [
      {
        role: "assistant",
        source: "bruna",
        text: "Posso te orientar sobre a blefaroplastia.",
      },
    ],
  );

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.procedure, "blefaroplastia");
  assert.equal(plan.automaticAllowed, true);
});

test("prefilled site availability text is context rather than scheduling intent", () => {
  const text = [
    "Olá, gostaria de consultar os horários para uma avaliação facial com a Dra. Amanda.",
    "Referência: Avaliação facial",
  ].join("\n\n");
  const plan = planAutomation({
    text,
    messageType: "text",
    reference: "Avaliação facial",
    platform: "Orgânico/Conteúdo",
    templateId: "procedure_evaluation_v1",
  });

  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      templateId: "procedure_evaluation_v1",
    }),
    true,
  );
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "known_procedure");
  assert.equal(plan.procedure, "avaliacao_facial");
  assert.equal(plan.automaticAllowed, true);
});

test("standard Google lifting message treats values as template context", () => {
  const text = [
    "Olá, li sobre valores de lifting facial e gostaria de consultar os horários para uma avaliação com a Dra. Amanda.",
    "Ref. g26f01-820414650683-lifting-facial-preco",
  ].join("\n\n");
  const plan = planAutomation({
    text,
    messageType: "text",
    reference: "G26F01-820414650683-lifting-facial-preco",
    platform: "Google",
    templateId: "procedure_evaluation_v1",
  });

  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      templateId: "procedure_evaluation_v1",
    }),
    true,
  );
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "known_procedure");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.automaticAllowed, true);
  assert.equal(plan.priceMentionIsTemplateContext, true);
});

test("phrases and attribution codes alone never mark an automatic prefill", () => {
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      text: "Quero consultar a disponibilidade. Ref. M26F01W-C06H01",
      reference: "M26F01W-C06H01",
      platform: "Meta",
    }),
    false,
  );
});

test("an explicit price question added to the standard availability template is preserved", () => {
  const plan = planAutomation({
    text:
      "Olá, li sobre valores de lifting facial e gostaria de consultar os horários para uma avaliação com a Dra. Amanda. " +
      "Ref. g26f01-820414650683-lifting-facial-preco. Qual é o valor da cirurgia?",
    messageType: "text",
    reference: "G26F01-820414650683-lifting-facial-preco",
    platform: "Google",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "price_initial_information");
  assert.equal(plan.procedure, "lifting_facial");
});

test("exact professional experience remains partially answerable and human-reviewed", () => {
  const plan = planAutomation({
    text: "Há quanto tempo a Dra. Amanda atua na cirurgia plástica?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "human_review");
  assert.equal(plan.reason, "professional_experience_detail_review");
  assert.equal(plan.replyCode, "AMANDA-EXPERIENCE-PARTIAL-01");
  assert.equal(plan.automaticAllowed, false);
});

test("standalone lifting is preserved as lifting facial on the next turn", () => {
  const initialPlan = planAutomation({
    text: "Oi, quero saber mais sobre lifting",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(initialPlan.procedure, "lifting_facial");

  const continuationPlan = planAutomation({
    text: "Como funciona?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enriched = enrichAutomationPlanFromConversation(
    continuationPlan,
    [
      {
        role: "patient",
        source: "paciente",
        text: "Oi, quero saber mais sobre lifting",
      },
      {
        role: "assistant",
        source: "bruna",
        text: "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      },
    ],
  );

  assert.equal(enriched.procedure, "lifting_facial");
});
