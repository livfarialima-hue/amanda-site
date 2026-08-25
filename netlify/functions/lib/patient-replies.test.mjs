import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppearanceDistressReviewReply,
  buildCampaignReferenceExplanationReply,
  buildConsultationInformationReply,
  buildContextRoutingClarificationReply,
  buildImageAcknowledgementReply,
  buildInsuranceAcceptanceReply,
  buildInsuranceCoverageReply,
  buildMarketingPrefilledOpeningReply,
  buildMissingInboundTextClarificationReply,
  buildOfficialChannelsReply,
  buildPatientReply,
  hasClinicLocationInConversation,
  hasConsultationExplanationInConversation,
  hasPendingReactivationHandoff,
  REACTIVATION_REPLY,
  shouldSendAutomaticPatientReply,
  shouldSendOpenAIPatientReply,
} from "./patient-replies.mjs";

test("asks for context naturally when the provider omits the inbound text", () => {
  const reply = buildMissingInboundTextClarificationReply();

  assert.match(
    reply,
    /^Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima\./,
  );
  assert.match(reply, /mensagem não apareceu completa para mim/i);
  assert.match(reply, /qual procedimento ou dúvida/i);
  assert.doesNotMatch(reply, /diagnóstico|indicação|erro|falha técnica/i);
});

test("asks for routing context without sounding like an administrative menu", () => {
  const continuation = buildContextRoutingClarificationReply();
  assert.match(continuation, /^Quero entender direitinho/i);
  assert.match(continuation, /explicar um pouco melhor/i);
  assert.doesNotMatch(continuation, /selecione|opção|departamento|roteamento/i);

  const firstReply = buildContextRoutingClarificationReply({
    patientName: "Marina",
    introduceBruna: true,
  });
  assert.match(firstReply, /^Olá, Marina! Eu sou a Bruna, concierge/i);
});

test("acknowledges a patient photo gently without interpreting it", () => {
  const firstReply = buildImageAcknowledgementReply({
    patientName: "Mariana Silva",
  });

  assert.match(
    firstReply,
    /^Olá, Mariana! Eu sou a Bruna, concierge da Clínica LIV Faria Lima\./,
  );
  assert.match(firstReply, /Obrigada por compartilhar sua foto e confiar na gente/i);
  assert.match(firstReply, /boas abordagens que podem ajudar a tratar/i);
  assert.match(firstReply, /Vou mostrar a foto à Dra\. Amanda/i);
  assert.match(firstReply, /respeitando suas características/i);
  assert.doesNotMatch(firstReply, /momento pessoal|algo tão sensível/i);
  assert.doesNotMatch(
    firstReply,
    /sem concluir diagnóstico|sem concluir indicação|apenas pela imagem/i,
  );
  assert.doesNotMatch(firstReply, /defeito|corrigir|bonit[ao]|feio/i);

  const continuation = buildImageAcknowledgementReply({
    patientName: "Mariana Silva",
    greetPatient: false,
    introduceBruna: false,
  });
  assert.doesNotMatch(continuation, /Olá|Eu sou a Bruna/);
  assert.match(continuation, /^Obrigada por compartilhar sua foto/i);
});

test("suggests an empathetic human response for intense body distress", () => {
  const reply = buildAppearanceDistressReviewReply({
    patientName: "Mariana Silva",
  });

  assert.match(reply, /^Olá, Mariana!/);
  assert.match(reply, /compartilhar algo tão sensível/i);
  assert.match(reply, /sem julgamentos/i);
  assert.match(reply, /como você está se sentindo/i);
  assert.doesNotMatch(reply, /defeito|corrigir|cirurgia vai|autoestima/i);
});

test("answers a named health plan directly while clarifying the requested specialty", () => {
  const reply = buildInsuranceAcceptanceReply({
    text: "Aceitam Amil?",
    patientName: "alexandre ccimabi",
    professional: null,
  });

  assert.match(reply, /^Olá, Alexandre!/);
  assert.match(reply, /atendimentos da clínica são particulares/i);
  assert.match(reply, /nota fiscal/i);
  assert.match(reply, /reembolso ao plano Amil/i);
  assert.match(reply, /Dra\. Amanda/);
  assert.match(reply, /Dr\. Daniel/);
  assert.doesNotMatch(reply, /vou conferir|retorno assim que possível/i);
});

test("answers a generic insurance question without malformed wording", () => {
  const reply = buildInsuranceAcceptanceReply({
    text: "Vocês aceitam convênio?",
    patientName: "Maria",
    professional: "amanda",
    introduceBruna: false,
  });

  assert.match(reply, /^Claro\./);
  assert.match(reply, /apresentada ao seu plano de saúde/i);
  assert.match(reply, /eventual solicitação de reembolso/i);
  assert.doesNotMatch(reply, /ao plano seu convênio/i);
  assert.doesNotMatch(reply, /reembolso garantido|garantia de reembolso/i);
});

test("answers blepharoplasty insurance without promising coverage or pushing scheduling", () => {
  const reply = buildInsuranceCoverageReply({
    text: "Pode ser realizado através do convênio?",
    procedure: "blefaroplastia",
  });

  assert.equal(
    reply,
    "Pode ser avaliado, sim. Na consulta, a Dra. Amanda verifica se há indicação funcional além da estética, como possível impacto no campo visual. A autorização e a eventual cobertura dependem da análise do convênio.\n\n" +
      "A consulta é particular e emitimos a documentação necessária quando houver indicação.",
  );
  assert.doesNotMatch(reply, /mais chance|garant|manhã|tarde|horário/i);
});

test("does not invent insurance guidance for another or unknown procedure", () => {
  assert.equal(
    buildInsuranceCoverageReply({
      text: "O convênio cobre?",
      procedure: "lifting_facial",
    }),
    null,
  );
  assert.equal(
    buildInsuranceCoverageReply({
      text: "Meu convênio negou a cobertura.",
      procedure: "blefaroplastia",
    }),
    null,
  );
});

test("opens a prefilled site inquiry without assuming scheduling intent", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "Fabrícia Silva",
    procedure: "avaliacao_facial",
    introduceBruna: true,
  });

  assert.equal(
    reply,
      "Olá, Fabrícia! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre avaliação facial. " +
      "O que você gostaria de entender primeiro?",
  );
  assert.doesNotMatch(reply, /manhã|tarde|noite|horário/i);
  assert.doesNotMatch(reply, /obrigada pela confiança/i);
});

test("future otoplasty prefills receive a conversational response without agenda", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "Carla",
    procedure: "otoplastia",
  });

  assert.equal(
    reply,
    "Olá, Carla! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre otoplastia. O que você gostaria de entender primeiro?",
  );
  assert.doesNotMatch(reply, /agenda|agendar|horário|manhã|tarde/i);
});

test("a ninfoplastia prefill names the procedure and adds privacy without requesting sensitive details", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "Gessica",
    procedure: "ninfoplastia",
  });

  assert.equal(
    reply,
    "Olá, Gessica! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre ninfoplastia. Essa conversa é tratada com privacidade e cuidado. " +
      "O que você gostaria de entender primeiro?",
  );
  assert.equal((reply.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(reply, /o que incomoda|foto|imagem|agenda|horário/i);
});

test("uses the patient-recognized cervical name without treating the prefill as scheduling intent", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "Maria",
    procedure: "lifting_cervical",
  });

  assert.equal(
    reply,
    "Olá, Maria! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre cervicoplastia (lifting cervical). " +
      "O que você gostaria de entender primeiro?",
  );
  assert.doesNotMatch(reply, /agenda|agendar|horário|manhã|tarde/i);
});

test("answers the procedure and asks the name when the profile identifier is not usable", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "soniamariamontoromenezes",
    procedure: "lifting_facial",
    introduceBruna: true,
  });

  assert.equal(
    reply,
      "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre lifting facial. Como posso te chamar?",
  );
  assert.doesNotMatch(reply, /Soniamariamontoromenezes/i);
  assert.match(reply, /Como posso te chamar\?/i);
});

test("does not use a business profile as a name and asks the contact name", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "Monah Semijoias",
    procedure: "lifting_facial",
  });

  assert.equal(
    reply,
    "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre lifting facial. Como posso te chamar?",
  );
  assert.doesNotMatch(reply, /Monah|Semijoias/i);
  assert.match(reply, /Como posso te chamar\?/i);
});

test("a decorated acronym is never used as a name in a lifting prefill", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "SVS :-",
    procedure: "lifting_facial",
    introduceBruna: true,
  });

  assert.equal(
    reply,
    "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre lifting facial. Como posso te chamar?",
  );
  assert.doesNotMatch(reply, /SVS/i);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test("a clear personal name with a trailing emoji personalizes the lifting prefill", () => {
  const reply = buildMarketingPrefilledOpeningReply({
    patientName: "Mariza Alves 🥰",
    procedure: "lifting_cervical",
    introduceBruna: true,
  });

  assert.equal(
    reply,
    "Olá, Mariza! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "Posso te orientar sobre cervicoplastia (lifting cervical). " +
      "O que você gostaria de entender primeiro?",
  );
  assert.doesNotMatch(reply, /Como posso te chamar\?/i);
  assert.doesNotMatch(reply, /🥰/u);
});

test("sends only the requested official Instagram without adding a site or CTA", () => {
  const reply = buildOfficialChannelsReply({
    patientName: "MARINA",
    procedure: "lifting_facial",
    introduceBruna: false,
    explainCampaignReference: true,
  });

  assert.match(reply, /^Claro!/);
  assert.match(
    reply,
    /https:\/\/www\.instagram\.com\/dra\.amanda_plastica\//,
  );
  assert.doesNotMatch(reply, /https:\/\/draamandaschroeder\.com\.br/);
  assert.match(reply, /apenas um código interno/i);
  assert.match(reply, /Não é um termo médico/i);
  assert.doesNotMatch(reply, /vou confirmar|com a equipe|segurança/i);
  assert.doesNotMatch(reply, /se quiser|me conte/i);
});

test("explains the campaign reference directly and uses natural name casing", () => {
  const reply = buildCampaignReferenceExplanationReply({
    patientName: "MARINA",
    introduceBruna: true,
  });

  assert.match(reply, /^Olá, Marina!/);
  assert.match(reply, /código interno/i);
  assert.match(reply, /não muda seu atendimento/i);
  assert.doesNotMatch(reply, /Olá, MARINA/);
  assert.doesNotMatch(reply, /vou confirmar|equipe/i);
});

test("builds a natural routing greeting without internal codes", () => {
  const reply = buildPatientReply({
    replyCode: "ORG-DIR-01",
    patientName: "Maria Silva",
  });

  assert.match(reply, /^Olá, Maria!/);
  assert.match(
    reply,
    /Eu sou a Bruna, concierge da Clínica LIV Faria Lima/,
  );
  assert.match(reply, /Dra\. Amanda/);
  assert.match(reply, /Dr\. Daniel/);
  assert.doesNotMatch(reply, /ORG-DIR-01/);
});

test("answers the approved lifting hospital fact without diverting to a name question", () => {
  const cervicalReply = buildPatientReply({
    replyCode: "AMANDA-HOSPITAL-01",
    patientName: "",
    procedure: "lifting_cervical",
  });
  const facialReply = buildPatientReply({
    replyCode: "AMANDA-HOSPITAL-01",
    patientName: "Marina Silva",
    procedure: "lifting_facial",
  });

  assert.match(cervicalReply, /^Olá! Eu sou a Bruna/);
  assert.match(
    cervicalReply,
    /a cervicoplastia \(lifting cervical\) é uma cirurgia realizada em hospital/i,
  );
  assert.match(cervicalReply, /anestesista e equipe cirúrgica/i);
  assert.doesNotMatch(cervicalReply, /Como posso te chamar\?/i);
  assert.match(facialReply, /^Olá, Marina! Eu sou a Bruna/);
  assert.match(facialReply, /o lifting facial é uma cirurgia realizada em hospital/i);
  assert.doesNotMatch(facialReply, /Como posso te chamar/i);
});

test("price fallback stays concise and does not invite an unapproved range", () => {
  const reply = buildPatientReply({
    replyCode: "P-PRECO-01",
    patientName: "Maria",
    procedure: "blefaroplastia",
  });

  assert.match(reply, /preço antes de decidir/);
  assert.match(reply, /confirma o valor exato depois da avaliação/);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(reply, /faixa|R\$ 18 mil|R\$ 26 mil|consulta presencial/i);
  assert.doesNotMatch(reply, /investimento/);
});

test("explains the consultation gradually without anticipating price or a link", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Rô de Souza",
    procedure: "lifting_facial",
    introduceBruna: true,
    siteResource: {
      url: "https://draamandaschroeder.com.br/conteudos/consulta-cirurgia-plastica/",
    },
  });

  assert.match(
    reply,
    /^Olá, Rô! Eu sou a Bruna, concierge da Clínica LIV Faria Lima\./,
  );
  assert.match(reply, /avaliação de lifting facial começa com uma conversa/);
  assert.match(reply, /face e o pescoço em repouso e em movimento/);
  assert.match(reply, /Você não precisa decidir nada nesse momento/);
  assert.match(reply, /O que seria mais útil entender agora sobre lifting facial\?/);
  assert.equal((reply.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(reply, /R\$ 500/);
  assert.doesNotMatch(reply, /abatido se a cirurgia/);
  assert.doesNotMatch(reply, /https:\/\/draamandaschroeder\.com\.br/);
  assert.doesNotMatch(reply, /Posso ver os horários/);
});

test("answers the consultation value directly and invites the next step without pressure", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Renata",
    consultationPriceRequested: true,
    introduceBruna: true,
  });

  assert.match(reply, /^Olá, Renata!/);
  assert.match(reply, /consulta presencial com a Dra\. Amanda custa R\$ 500/i);
  assert.match(reply, /Na avaliação, a Dra\. Amanda entende o que você busca/i);
  assert.match(reply, /sem obrigação de decidir nada nesse momento/i);
  assert.match(reply, /Pix, débito ou parcelamento/i);
  assert.match(reply, /nota fiscal/i);
  assert.match(reply, /R\. Pais Leme, 215/);
  assert.match(reply, /CEP 05424-150/);
  assert.match(reply, /Se fizer sentido para você, posso verificar opções de horário\./i);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(
    reply,
    /reembols|devolvid|descontad|abatid|Imposto de Renda|teleconsulta|consulta online|estacionamento|retornos/i,
  );
  assert.doesNotMatch(reply, /maps\.app\.goo\.gl/);
  assert.doesNotMatch(reply, /qual cirurgia você está pesquisando/i);
});

test("does not repeat the consultation location when it is already in the conversation", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Renata",
    consultationPriceRequested: true,
    introduceBruna: false,
    locationPreviouslyShared: true,
  });

  assert.match(reply, /^Claro\. A consulta presencial com a Dra\. Amanda custa R\$ 500\./);
  assert.doesNotMatch(reply, /Pais Leme|05424-150|Google Maps/i);
  assert.match(reply, /posso verificar opções de horário/i);
});

test("keeps a consultation price reply especially short when the evaluation was already explained", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Renata",
    consultationContextPreviouslyShared: true,
    consultationPriceRequested: true,
    introduceBruna: false,
    locationPreviouslyShared: true,
  });

  assert.equal(
    reply,
    [
      "Claro. A consulta presencial com a Dra. Amanda custa R$ 500.",
      "O pagamento pode ser feito por Pix, débito ou parcelamento, com emissão de nota fiscal.",
      "Se fizer sentido para você, posso verificar opções de horário.",
    ].join("\n\n"),
  );
  assert.doesNotMatch(reply, /avaliação|examina|possibilidades|decidir/i);
});

test("recognizes a previously shared clinic location in recent conversation turns", () => {
  assert.equal(
    hasClinicLocationInConversation([
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Nosso endereço é R. Pais Leme, 215, em Pinheiros.",
      },
    ]),
    true,
  );
  assert.equal(
    hasClinicLocationInConversation([
      "Google Maps: https://maps.app.goo.gl/yDFBmbcn5oDpHSM46",
    ]),
    true,
  );
  assert.equal(
    hasClinicLocationInConversation([
      {
        role: "assistant",
        source: "bruna",
        text: "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      },
    ]),
    false,
  );
});

test("recognizes when the consultation was already explained without treating a generic inquiry as an explanation", () => {
  assert.equal(
    hasConsultationExplanationInConversation([
      {
        role: "assistant",
        source: "bruna",
        text: "Na consulta, a Dra. Amanda conversa sobre o que você busca, avalia a região e explica possibilidades, limites e recuperação.",
      },
    ]),
    true,
  );
  assert.equal(
    hasConsultationExplanationInConversation([
      {
        role: "user",
        source: "paciente",
        text: "Gostaria de entender melhor como funciona a avaliação.",
      },
    ]),
    false,
  );
});

test("every known procedure evaluation ends with one low-friction question instead of a menu", () => {
  const cases = [
    ["lifting_facial", "lifting facial"],
    ["lifting_cervical", "cervicoplastia (lifting cervical)"],
    ["blefaroplastia", "blefaroplastia"],
    ["frontoplastia", "frontoplastia"],
    ["otoplastia", "otoplastia"],
    ["avaliacao_facial", "avaliação facial"],
    ["lip_lifting", "lifting labial"],
    ["lipo_papada", "lipo de papada"],
    ["rinoplastia", "rinoplastia"],
    ["lipoaspiracao", "lipoaspiração"],
    ["abdominoplastia", "abdominoplastia"],
    ["mastopexia", "mastopexia"],
    ["protese_mama", "prótese de mama"],
    ["mamoplastia_redutora", "mamoplastia redutora"],
    ["braquioplastia", "braquioplastia"],
    ["ninfoplastia", "ninfoplastia"],
    ["contorno_corporal", "cirurgia de contorno corporal"],
    ["cirurgias_combinadas", "cirurgias combinadas"],
  ];

  for (const [procedure, label] of cases) {
    const reply = buildConsultationInformationReply({
      patientName: "Maria",
      procedure,
      introduceBruna: false,
    });

    assert.match(reply, new RegExp(`avaliação de ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), procedure);
    assert.match(reply, new RegExp(`O que seria mais útil entender agora sobre ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?`, "i"), procedure);
    assert.equal((reply.match(/\?/g) || []).length, 1, procedure);
    assert.doesNotMatch(reply, /indicação, recuperação ou valores/i, procedure);
    assert.doesNotMatch(reply, /o que mais incomoda/i, procedure);
    assert.doesNotMatch(reply, /R\$ 500/, procedure);
    assert.doesNotMatch(
      reply,
      /https:\/\/draamandaschroeder\.com\.br/,
      procedure,
    );
  }
});

test("the ninfoplastia evaluation is reserved, procedural and conversational", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Gessica",
    procedure: "ninfoplastia",
    introduceBruna: true,
  });

  assert.equal(
    reply,
    "Olá, Gessica! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
      "A avaliação de ninfoplastia é feita de forma individual e reservada. " +
      "A Dra. Amanda começa entendendo o que você busca, avalia a região com cuidado e explica as possibilidades, os limites e como seria a recuperação. " +
      "Você não precisa decidir nada nesse momento.\n\n" +
      "O que seria mais útil entender agora sobre ninfoplastia?",
  );
  assert.doesNotMatch(reply, /o que incomoda|envie|foto|imagem|orçamento|R\$/i);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test("uses the complete procedure page only when the patient requests it", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Edilene",
    procedure: "lifting_facial",
    introduceBruna: false,
    siteRequested: true,
    siteResource: {
      url: "https://draamandaschroeder.com.br/lifting-facial/",
      context:
        "Página completa com consulta, recuperação e casos reais com antes e depois.",
    },
  });

  assert.match(reply, /^Claro\./);
  assert.doesNotMatch(reply, /Olá, Edilene/);
  assert.match(reply, /casos reais em contexto educativo/);
  assert.match(
    reply,
    /https:\/\/draamandaschroeder\.com\.br\/lifting-facial\//,
  );
  assert.doesNotMatch(reply, /R\$ 500/);
});

test("an explicit availability request can advance to period preference", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Van",
    procedure: "lifting_facial",
    availabilityRequested: true,
    introduceBruna: true,
    siteResource: {
      url: "https://draamandaschroeder.com.br/lifting-facial/",
    },
  });

  assert.match(reply, /se o lifting facial faz sentido/);
  assert.match(reply, /R\. Pais Leme, 215/);
  assert.match(reply, /cj\. 710/);
  assert.match(reply, /CEP 05424-150/);
  assert.match(reply, /maps\.app\.goo\.gl\/yDFBmbcn5oDpHSM46/);
  assert.match(reply, /Quais dias da semana e qual período/);
  assert.match(reply, /manhã ou tarde/);
  assert.equal((reply.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(reply, /R\$ 500/);
  assert.doesNotMatch(reply, /Posso ver os horários/);
  assert.doesNotMatch(reply, /https:\/\/draamandaschroeder/);
});

test("an availability request does not repeat a location already shared", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Van",
    procedure: "lifting_facial",
    availabilityRequested: true,
    introduceBruna: false,
    locationPreviouslyShared: true,
  });

  assert.doesNotMatch(reply, /Pais Leme|05424-150|Google Maps/i);
  assert.match(reply, /Quais dias da semana e qual período/);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test("builds the single fixed notice for a conversation resumed after seven days", () => {
  const reply = buildPatientReply({
    replyCode: "MANUAL-RETURN-7D-01",
    patientName: "Maria",
  });

  assert.equal(reply, REACTIVATION_REPLY);
  assert.match(reply, /direcionar sua mensagem à equipe/);
  assert.match(reply, /continuaremos por aqui/);
});

test("keeps automation silent after the seven-day notice until a human answers", () => {
  assert.equal(
    hasPendingReactivationHandoff([
      {
        role: "assistant",
        source: "bruna",
        text: REACTIVATION_REPLY,
      },
      {
        role: "patient",
        source: "paciente",
        text: "Tudo bem, aguardo",
      },
    ]),
    true,
  );

  assert.equal(
    hasPendingReactivationHandoff([
      {
        role: "assistant",
        source: "bruna",
        text: REACTIVATION_REPLY,
      },
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Olá, vou continuar seu atendimento.",
      },
    ]),
    false,
  );
});

test("blocks automatic sending for schedules, takeover and shadow mode", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      replyCode: "G-BLEF-01",
      automaticAllowed: true,
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
    reviewAlertConfigured: true,
  };

  assert.equal(shouldSendAutomaticPatientReply(base), true);
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      humanTakeoverToday: true,
    }),
    false,
  );
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      mode: "shadow",
    }),
    false,
  );
});

test("allows the fixed reactivation notice only in active mode", () => {
  const base = {
    mode: "active",
    plan: {
      route: "reactivation_notice",
      replyCode: "MANUAL-RETURN-7D-01",
      automaticAllowed: true,
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
    reviewAlertConfigured: true,
  };

  assert.equal(shouldSendAutomaticPatientReply(base), true);
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      mode: "shadow",
    }),
    false,
  );
});

test("Daniel greeting requires the internal review alert configuration", () => {
  const plan = {
    route: "daniel_greeting_and_alert",
    replyCode: "DANIEL-ENC-01",
    automaticAllowed: true,
  };

  assert.equal(
    shouldSendAutomaticPatientReply({
      mode: "active",
      plan,
      humanTakeoverToday: false,
      exactDuplicate: false,
      schedulingRequest: false,
      reviewAlertConfigured: false,
    }),
    false,
  );
});

test("active AI reply requires a high-confidence explicit authorization", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Olá! Posso te explicar como funciona a avaliação?",
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
  };

  assert.equal(shouldSendOpenAIPatientReply(base), true);
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        confidence: "medium",
      },
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        automaticAllowed: false,
        route: "human_review",
        suggestedReply: "",
      },
    }),
    false,
  );
});

test("active AI reply remains blocked for schedules and deterministic review", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Resposta autorizada.",
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
  };

  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      plan: {
        route: "human_review",
        automaticAllowed: false,
      },
    }),
    false,
  );
});

test("human takeover only yields to an explicitly validated semantic continuation", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
      humanContextContinuationCandidate: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      replyCode: "CONTEXT-CONTINUE-01",
      suggestedReply:
        "Na consulta, a Dra. Amanda entende seus objetivos e explica as possibilidades com calma.",
      reviewReason: "context_continue:consulta",
    },
    humanTakeoverToday: true,
    exactDuplicate: false,
    schedulingRequest: false,
    allowHumanContextContinuation: true,
  };

  assert.equal(shouldSendOpenAIPatientReply(base), true);
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      allowHumanContextContinuation: false,
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        replyCode: "CONTEXT-REOPEN-01",
        reviewReason: "context_reopen:consulta",
      },
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
});

test("human takeover may ask one safe semantic clarification", () => {
  assert.equal(
    shouldSendOpenAIPatientReply({
      mode: "active",
      plan: {
        route: "standard_reply",
        automaticAllowed: true,
        humanContextContinuationCandidate: true,
      },
      decision: {
        route: "standard_reply",
        confidence: "high",
        automaticAllowed: true,
        urgent: false,
        replyCode: "CONTEXT-CLARIFY-01",
        suggestedReply:
          "Você quer que eu explique como funciona a consulta ou a recuperação?",
        reviewReason: "context_clarification:oferta_anterior",
      },
      humanTakeoverToday: true,
      exactDuplicate: false,
      schedulingRequest: false,
      allowHumanContextContinuation: true,
    }),
    true,
  );
});
