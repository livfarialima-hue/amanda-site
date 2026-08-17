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

test("a repeated price question for another surgery goes to human review with its procedure", () => {
  const preliminaryPlan = planAutomation({
    text: "Qual o valor da blefaroplastia?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  const plan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    [{ role: "assistant", source: "bruna", text: INITIAL_PRICE_REPLY }],
  );

  assert.equal(plan.route, "human_review");
  assert.equal(plan.reason, "surgical_price_range_review");
  assert.equal(plan.procedure, "blefaroplastia");
  assert.equal(plan.automaticAllowed, false);
});

test("installment and hospital composition questions can receive the first price response", () => {
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

    assert.equal(plan.route, "standard_reply", text);
    assert.equal(plan.reason, "price_initial_information", text);
    assert.equal(plan.priceRequestKind, "terms", text);
    assert.equal(plan.automaticAllowed, true, text);
  }
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

test("asking how the consultation works stays in automatic conversation", () => {
  for (const text of [
    "Estou fazendo uma pesquisa. Seria interessante saber como funciona a consulta.",
    "Como funciona a avaliação?",
    "Queria entender o que acontece na consulta",
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
  });

  assert.equal(isConsultationInformationRequest(text), true);
  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      text,
      reference: "G26F01",
      platform: "Google",
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
  });
  const realQuestionPlan = planAutomation({
    text: "Como funciona a avalia\u00e7\u00e3o?",
    messageType: "text",
    reference: "M26F01W-C06H01",
    platform: "Meta",
  });

  assert.equal(
    isLikelyMarketingPrefilledMessage({
      text: prefilled,
      reference: "M26F01W-C06H01",
      platform: "Meta",
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

test("the first frontoplasty price question receives the same initial information", () => {
  const plan = planAutomation({
    text: "Gostaria de saber o valor da frontoplastia",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "price_initial_information");
  assert.equal(plan.replyCode, null);
  assert.equal(plan.procedure, "frontoplastia");
  assert.equal(plan.automaticAllowed, true);
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

test("an unrelated short direct message is no longer treated as a clinic inquiry", () => {
  const plan = planAutomation({
    text: "Qual seu time?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.notEqual(plan.reason, "short_direct_initial_inquiry");
  assert.equal(plan.automaticAllowed, false);
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
  });

  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(
    isLikelyMarketingPrefilledMessage({ text }),
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
  });

  assert.equal(isAvailabilityRequest(text), true);
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      text,
      reference: "G26F01-820414650683-lifting-facial-preco",
      platform: "Google",
    }),
    true,
  );
  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "known_procedure");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.automaticAllowed, true);
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
