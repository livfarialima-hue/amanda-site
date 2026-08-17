import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppearanceDistressReviewReply,
  buildCampaignReferenceExplanationReply,
  buildConsultationInformationReply,
  buildImageAcknowledgementReply,
  buildInsuranceAcceptanceReply,
  buildInsuranceCoverageReply,
  buildMarketingPrefilledOpeningReply,
  buildOfficialChannelsReply,
  buildPatientReply,
  hasPendingReactivationHandoff,
  REACTIVATION_REPLY,
  shouldSendAutomaticPatientReply,
  shouldSendOpenAIPatientReply,
} from "./patient-replies.mjs";

test("acknowledges a patient photo gently without interpreting it", () => {
  const firstReply = buildImageAcknowledgementReply({
    patientName: "Mariana Silva",
  });

  assert.match(
    firstReply,
    /^Olá, Mariana! Eu sou a Bruna, concierge da Clínica LIV Faria Lima\./,
  );
  assert.match(firstReply, /Obrigada por confiar em nós/i);
  assert.match(firstReply, /encaminhá-la à equipe/i);
  assert.match(firstReply, /Não fazemos diagnóstico/i);
  assert.match(firstReply, /apenas pela imagem/i);
  assert.doesNotMatch(firstReply, /defeito|corrigir|bonit[ao]|feio/i);

  const continuation = buildImageAcknowledgementReply({
    patientName: "Mariana Silva",
    greetPatient: false,
    introduceBruna: false,
  });
  assert.doesNotMatch(continuation, /Olá|Eu sou a Bruna/);
  assert.match(continuation, /^Obrigada por confiar em nós/i);
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
      "O que você gostaria de entender primeiro sobre avaliação facial?",
  );
  assert.doesNotMatch(reply, /manhã|tarde|noite|horário/i);
  assert.doesNotMatch(reply, /obrigada pela confiança/i);
});

test("asks the name instead of addressing a long concatenated profile identifier", () => {
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
  assert.doesNotMatch(reply, /O que você gostaria de entender primeiro/i);
});

test("sends the official Instagram and lifting page without asking the team", () => {
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
  assert.match(
    reply,
    /https:\/\/draamandaschroeder\.com\.br\/lifting-facial\//,
  );
  assert.match(reply, /apenas um código interno/i);
  assert.match(reply, /Não é um termo médico/i);
  assert.doesNotMatch(reply, /vou confirmar|com a equipe|segurança/i);
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

test("answers the approved lifting hospital fact and asks for an unclear name", () => {
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
  assert.match(cervicalReply, /o lifting cervical é uma cirurgia realizada em hospital/i);
  assert.match(cervicalReply, /anestesista e equipe cirúrgica/i);
  assert.match(cervicalReply, /Como posso te chamar\?/i);
  assert.match(facialReply, /^Olá, Marina! Eu sou a Bruna/);
  assert.match(facialReply, /o lifting facial é uma cirurgia realizada em hospital/i);
  assert.doesNotMatch(facialReply, /Como posso te chamar/i);
});

test("price fallback is transparent about the consultation and clarifies the requested price", () => {
  const reply = buildPatientReply({
    replyCode: "P-PRECO-01",
    patientName: "Maria",
    procedure: "blefaroplastia",
  });

  assert.match(reply, /preço antes de decidir/);
  assert.match(reply, /consulta presencial/);
  assert.match(reply, /R\$ 500/);
  assert.match(reply, /Pix, débito ou parcelamento/);
  assert.match(reply, /abatido/);
  assert.match(reply, /nota fiscal/);
  assert.match(reply, /comprovante de despesa médica/);
  assert.match(reply, /Imposto de Renda/);
  assert.match(reply, /faixa atual de blefaroplastia/);
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
    /^Olá, Rô! Eu sou a Bruna, concierge da Clínica LIV Faria Lima\. Claro\./,
  );
  assert.match(reply, /conversa sobre o que você percebe no rosto/);
  assert.match(reply, /face e o pescoço em repouso e em movimento/);
  assert.match(reply, /Nada precisa ser decidido nesse momento/);
  assert.match(reply, /contorno da mandíbula/);
  assert.doesNotMatch(reply, /R\$ 500/);
  assert.doesNotMatch(reply, /abatido se a cirurgia/);
  assert.doesNotMatch(reply, /https:\/\/draamandaschroeder\.com\.br/);
  assert.doesNotMatch(reply, /Posso ver os horários/);
});

test("answers the consultation value when the patient asks for access and price", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Renata",
    consultationPriceRequested: true,
    availabilityRequested: true,
    introduceBruna: true,
  });

  assert.match(reply, /^Olá, Renata!/);
  assert.match(reply, /consulta presencial custa R\$ 500/i);
  assert.match(reply, /Pix, débito ou parcelamento/i);
  assert.match(reply, /nota fiscal/i);
  assert.match(reply, /abatido se a cirurgia/i);
  assert.match(reply, /prefere manhã ou tarde/i);
  assert.doesNotMatch(reply, /qual cirurgia você está pesquisando/i);
});

test("uses a low-friction exploration question for the main facial procedures", () => {
  const cases = [
    [
      "lifting_cervical",
      /contorno do pescoço, a papada, a linha da mandíbula ou a recuperação/,
    ],
    [
      "blefaroplastia",
      /pálpebras superiores, as bolsas abaixo dos olhos, a recuperação ou como funciona a avaliação/,
    ],
    [
      "otoplastia",
      /para um adulto, uma criança ou um adolescente/,
    ],
  ];

  for (const [procedure, expectedQuestion] of cases) {
    const reply = buildConsultationInformationReply({
      patientName: "Maria",
      procedure,
      introduceBruna: false,
    });

    assert.match(reply, expectedQuestion, procedure);
    assert.doesNotMatch(reply, /o que mais incomoda/i, procedure);
    assert.doesNotMatch(reply, /R\$ 500/, procedure);
    assert.doesNotMatch(
      reply,
      /https:\/\/draamandaschroeder\.com\.br/,
      procedure,
    );
  }
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

  assert.match(reply, /se o lifting faz sentido/);
  assert.match(reply, /Rua Pais Leme, 215/);
  assert.match(reply, /Se quiser que eu busque opções/);
  assert.match(reply, /prefere manhã ou tarde/);
  assert.doesNotMatch(reply, /R\$ 500/);
  assert.doesNotMatch(reply, /Posso ver os horários/);
  assert.doesNotMatch(reply, /https:\/\/draamandaschroeder/);
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
