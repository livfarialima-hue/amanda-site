import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPendingHospitalQuoteAlert,
  buildPriceReviewAlert,
  buildSurgicalInitialPriceReply,
  buildSurgicalPriceHoldingReply,
  buildSurgicalPriceSuggestedReply,
  getSurgicalPriceReference,
  isSurgicalPriceReview,
} from "./surgical-price-review.mjs";

test("creates an empathetic first price response and answers payment terms briefly", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Eliana",
    procedure: "blefaroplastia",
    currentText: [
      "Qual o valor de uma cirurgia facial?",
      "Vcs parcelam em quantas vezes?",
      "O valor já inclui hospital e anestesia?",
    ].join(" "),
  });

  assert.match(reply, /^Olá, Eliana! Eu sou a Bruna/);
  assert.match(reply, /é natural querer saber o valor antes de decidir/i);
  assert.match(reply, /confirma o valor exato após a avaliação/i);
  assert.match(reply, /orçamento reúne os itens aplicáveis/i);
  assert.match(reply, /parcelado antecipadamente/i);
  assert.match(reply, /quitação antes da cirurgia/i);
  assert.match(reply, /desconto à vista/i);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(reply, /técnica|complexidade|materiais|honorário isolado/i);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.match(
    reply,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
  assert.ok(Array.from(reply).length <= 850);
});

test("the first known lifting price response answers without a mandatory continuation", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Maria",
    procedure: "lifting_facial",
  });

  assert.match(reply, /é natural querer saber o valor antes de decidir/i);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(reply, /o que mais te incomoda/i);
  assert.doesNotMatch(reply, /qual cirurgia ou qual região/i);
  assert.doesNotMatch(reply, /(?:informar|passar).{0,20}(?:média|faixa)/i);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.match(
    reply,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
});

test("the first cervical price response uses the approved soft range offer", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Adriana",
    procedure: "lifting_cervical",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "O que você gostaria de entender primeiro sobre lifting cervical?",
      },
    ],
    currentText: "E gostaria de saber os valores",
  });

  assert.equal(
    reply,
    [
      "Claro, Adriana.",
      "Entendo — ter uma noção de valor ajuda bastante no planejamento. Na cervicoplastia, o orçamento pode variar porque o tratamento pode ser mais localizado ou envolver uma abordagem mais completa do pescoço e da face. A Dra. Amanda define isso após avaliar cada caso.",
      "Este conteúdo explica de forma simples o que costuma compor o valor de uma cirurgia facial: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/",
      "Se você quiser, posso te passar uma faixa geral como referência inicial.",
    ].join("\n\n"),
  );
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("the short price question receives a concise direct copy", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Queila",
    procedure: "lifting_facial",
    currentText: "Qual o valor Dra",
  });

  assert.match(reply, /^Olá, Queila! Eu sou a Bruna/);
  assert.match(reply, /é natural querer saber o valor antes de decidir/i);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(reply, /o que mais te incomoda/i);
  assert.doesNotMatch(reply, /técnica|complexidade|equipe|hospital|anestesia|materiais/i);
  assert.match(
    reply,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.ok(Array.from(reply).length <= 600);
});

test("consultation price suggestion includes the invoice without promising tax savings", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "avaliacao_facial",
  });

  assert.match(reply, /R\$ 500/);
  assert.match(reply, /Pix, débito ou parcelamento/);
  assert.match(reply, /nota fiscal/);
  assert.match(reply, /comprovante de despesa médica/);
  assert.match(reply, /Imposto de Renda/);
  assert.doesNotMatch(reply, /reembols|devolvid|descontad|abatid/i);
  assert.doesNotMatch(reply, /(?:garante|garantida|restituição|economia tributária)/i);
});

test("combines professional and hospital references for lifting facial", () => {
  const reference = getSurgicalPriceReference("lifting_facial");

  assert.equal(reference.cashTotal, 36422.2);
  assert.equal(reference.installmentTotal, 38435.32);
  assert.equal(reference.rangeMinimum, 26000);
  assert.equal(reference.rangeMaximum, 42000);
  assert.match(reference.source, /CIRURGIAS 2025/);
  assert.match(reference.source, /Página7/);
});

test("creates a patient-ready lifting facial price suggestion for human review", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Rô de Souza",
    procedure: "lifting_facial",
  });

  assert.match(reply, /^Rô, obrigada por aguardar\./);
  assert.match(reply, /Minilifting: entre R\$ 18 mil e R\$ 25 mil/);
  assert.match(reply, /Lifting facial: entre R\$ 26 mil e R\$ 42 mil/);
  assert.match(reply, /estimativas gerais, apenas informativas/i);
  assert.match(reply, /não são orçamento, proposta nem garantia de preço/i);
  assert.doesNotMatch(reply, /R\$ 36\.400|R\$ 38\.400/);
  assert.doesNotMatch(reply, /referência hospitalar|valor do hospital/i);
  assert.match(reply, /valor final é definido após avaliação e planejamento/i);
  assert.match(reply, /pode ficar fora dessa faixa/i);
  assert.match(reply, /técnica, complexidade, necessidades individuais/i);
  assert.match(reply, /equipe, hospital, anestesia, materiais e acompanhamento/i);
  assert.match(reply, /não representa honorários isolados/i);
  assert.match(reply, /parcelado antecipadamente/i);
  assert.match(reply, /desconto à vista/i);
  assert.match(
    reply,
    /conteudos\/quanto-custa-lifting-facial-sao-paulo/,
  );
  assert.doesNotMatch(reply, /https:\/\/draamandaschroeder\.com\.br\/lifting-facial\//);
  assert.doesNotMatch(reply, /[\u200B-\u200D\u2060\uFEFF]/);
  assert.ok(
    reply.indexOf("entre R$ 26 mil e R$ 42 mil") <
      reply.indexOf("quanto-custa-lifting-facial"),
  );
  assert.doesNotMatch(reply, /explico a avaliação|prefere manhã ou tarde/i);
  assert.doesNotMatch(
    reply,
    /Se quiser, posso te explicar o que costuma aproximar/,
  );
});

test("creates the approved lifting price reply for direct patient delivery", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    directToPatient: true,
  });

  assert.match(
    reply,
    /^Olá, Maria! Eu sou a Bruna, concierge da Clínica LIV Faria Lima\./,
  );
  assert.match(reply, /Minilifting: entre R\$ 18 mil e R\$ 25 mil/);
  assert.match(reply, /Lifting facial: entre R\$ 26 mil e R\$ 42 mil/);
  assert.match(reply, /apenas informativa/i);
  assert.match(reply, /não é orçamento, proposta nem garantia de preço/i);
  assert.match(reply, /valor final é definido após avaliação e planejamento/i);
  assert.match(reply, /pode ficar fora dessa faixa/i);
  assert.match(reply, /não representa honorários isolados/i);
  assert.match(reply, /parcelado antecipadamente/i);
  assert.match(reply, /desconto à vista/i);
  assert.match(reply, /quanto-custa-lifting-facial-sao-paulo/);
  assert.doesNotMatch(reply, /explico a avaliação|prefere manhã ou tarde/i);
  assert.doesNotMatch(reply, /obrigada por aguardar/i);
  assert.doesNotMatch(reply, /[\u200B-\u200D\u2060\uFEFF]/);
  assert.ok(Array.from(reply).length <= 800);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("direct lifting price answers location in the same first reply", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    directToPatient: true,
    currentText: "Onde fica e qual o valor do lifting?",
  });

  assert.match(reply, /R\. Pais Leme, 215, cj\. 710/);
  assert.match(reply, /CEP 05424-150/);
  assert.match(reply, /maps\.app\.goo\.gl\/yDFBmbcn5oDpHSM46/);
  assert.match(reply, /Minilifting: entre R\$ 18 mil e R\$ 25 mil/);
  assert.match(reply, /Lifting facial: entre R\$ 26 mil e R\$ 42 mil/);
});

test("acknowledges a price request while the approved value is pending", () => {
  const daytime = buildSurgicalPriceHoldingReply({
    patientName: "Van",
    procedure: "lifting_facial",
  });
  const overnight = buildSurgicalPriceHoldingReply({
    patientName: "Van",
    procedure: "lifting_facial",
    overnight: true,
  });

  assert.match(daytime, /^Claro, Van\./);
  assert.match(daytime, /faixa atual de valor para o lifting facial/);
  assert.match(daytime, /desconto à vista/);
  assert.match(daytime, /parcelado antecipadamente/);
  assert.match(daytime, /te retorno por aqui/);
  assert.doesNotMatch(daytime, /R\$/);
  assert.match(overnight, /te retorno pela manhã/);
  assert.doesNotMatch(overnight, /R\$/);
});

test("answers a location question immediately while the surgical price waits for review", () => {
  const reply = buildSurgicalPriceHoldingReply({
    patientName: "nady",
    procedure: "lifting_facial",
    currentText: "ONDE FICA E QUAL O VALOR?",
  });

  assert.match(reply, /^Claro, Nady\./);
  assert.match(reply, /R\. Pais Leme, 215, cj\. 710/);
  assert.match(reply, /CEP 05424-150/);
  assert.match(reply, /maps\.app\.goo\.gl\/yDFBmbcn5oDpHSM46/);
  assert.match(reply, /Pinheiros/);
  assert.match(reply, /faixa atual de valor para o lifting facial/i);
  assert.doesNotMatch(reply, /R\$ 500/);
});

test("keeps ambiguous procedures useful without inventing a number", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "mastopexia",
  });

  assert.match(reply, /com ou sem prótese/);
  assert.doesNotMatch(reply, /R\$ \d/);
});

test("an unspecified surgery asks for the procedure but still supports conversion", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Roseli",
    procedure: null,
  });

  assert.match(reply, /qual cirurgia está pesquisando/);
  assert.doesNotMatch(reply, /R\$ 500/);
  assert.doesNotMatch(
    reply,
    /conteudos\/quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.doesNotMatch(reply, /R\$ (?:1[89]|2[349]|3[38]|4[2]) mil/);
});

test("uses the breast guide for breast procedures and never the facial guide", () => {
  for (const procedure of ["protese_mama", "mamoplastia_redutora"]) {
    const reply = buildSurgicalPriceSuggestedReply({
      patientName: "Maria",
      procedure,
    });

    assert.match(reply, /quanto-custa-cirurgia-plastica-mama-sao-paulo/);
    assert.doesNotMatch(reply, /quanto-custa-cirurgia-plastica-facial-sao-paulo/);
    assert.doesNotMatch(reply, /quanto-custa-cirurgia-plastica-corporal-sao-paulo/);
  }
});

test("uses the body guide for body procedures and never the facial guide", () => {
  for (const procedure of [
    "abdominoplastia",
    "lipoaspiracao",
    "braquioplastia",
    "ninfoplastia",
  ]) {
    const reply = buildSurgicalPriceSuggestedReply({
      patientName: "Maria",
      procedure,
    });

    assert.match(reply, /quanto-custa-cirurgia-plastica-corporal-sao-paulo/);
    assert.doesNotMatch(reply, /quanto-custa-cirurgia-plastica-facial-sao-paulo/);
    assert.doesNotMatch(reply, /quanto-custa-cirurgia-plastica-mama-sao-paulo/);
  }
});

test("offers the facial guide only once in the conversation", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "blefaroplastia",
    recentConversation: [
      {
        role: "assistant",
        text:
          "Veja este guia: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo?utm_source=whatsapp",
      },
    ],
  });

  assert.match(reply, /entre R\$ 18 mil e R\$ 23 mil/);
  assert.doesNotMatch(
    reply,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
});

test("the range message does not repeat a composition guide already shared", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    recentConversation: [
      {
        role: "user",
        text:
          "Olá, li o conteúdo sobre o valor do lifting facial: https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/",
      },
    ],
  });

  assert.match(reply, /entre R\$ 26 mil e R\$ 42 mil/);
  assert.doesNotMatch(reply, /https?:\/\//);
});

test("delivers the approved range after a cervical patient accepts the offer", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Adriana",
    procedure: "lifting_cervical",
    directToPatient: true,
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "Este conteúdo explica de forma simples o que costuma compor o valor de uma cirurgia facial: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/\n\nSe você quiser, posso te passar uma faixa geral como referência inicial.",
      },
    ],
  });

  assert.match(reply, /^Claro, Adriana\./);
  assert.match(reply, /Minilifting: entre R\$ 18 mil e R\$ 25 mil/);
  assert.match(reply, /Lifting facial: entre R\$ 26 mil e R\$ 42 mil/);
  assert.match(reply, /Na cervicoplastia, a faixa aplicável depende/i);
  assert.match(reply, /não é orçamento, proposta nem garantia de preço/i);
  assert.doesNotMatch(reply, /https?:\/\//);
});

test("the cervical range keeps the specific lifting guide as a safe fallback", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Adriana",
    procedure: "lifting_cervical",
    directToPatient: true,
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "Se você quiser, posso te passar uma faixa geral como referência inicial.",
      },
    ],
  });

  assert.match(reply, /quanto-custa-lifting-facial-sao-paulo/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("the first lifting price answer stays concise when a guide is already in the history", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    recentConversation: [
      {
        role: "assistant",
        text: "Veja https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/",
      },
    ],
  });

  assert.match(reply, /é natural querer saber o valor antes de decidir/i);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(reply, /o que mais te incomoda/i);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.doesNotMatch(reply, /https?:\/\//);
});

test("the first body price answer uses the body composition guide", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Maria",
    procedure: "abdominoplastia",
  });

  assert.match(reply, /é natural querer saber o valor antes de decidir/i);
  assert.equal((reply.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.match(reply, /quanto-custa-cirurgia-plastica-corporal-sao-paulo/);
  assert.doesNotMatch(reply, /quanto-custa-(?:cirurgia-plastica-facial|lifting-facial)/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("the first breast price answer uses the breast composition guide", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Maria",
    procedure: "mastopexia",
  });

  assert.match(reply, /quanto-custa-cirurgia-plastica-mama-sao-paulo/);
  assert.doesNotMatch(reply, /quanto-custa-cirurgia-plastica-(?:facial|corporal)-sao-paulo/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("does not replace the composition guide with the main lifting page", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    referenceCategory: "site_page",
    sourceReference: "Lifting Facial",
  });

  assert.match(reply, /entre R\$ 26 mil e R\$ 42 mil/);
  assert.match(reply, /quanto-custa-lifting-facial-sao-paulo/);
  assert.doesNotMatch(
    reply,
    /https:\/\/draamandaschroeder\.com\.br\/lifting-facial\//,
  );
});

test("keeps only the composition guide in a lifting price answer", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    recentConversation: [
      {
        role: "assistant",
        text:
          "Veja https://draamandaschroeder.com.br/lifting-facial/",
      },
    ],
  });

  assert.doesNotMatch(
    reply,
    /https:\/\/draamandaschroeder\.com\.br\/lifting-facial\//,
  );
  assert.match(reply, /quanto-custa-lifting-facial-sao-paulo/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("lifting links remain complete and free of invisible characters", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    referenceCategory: "meta_coded",
    sourceReference: "M26F01W-C06H01",
  });

  assert.match(
    reply,
    /https:\/\/draamandaschroeder\.com\.br\/conteudos\/quanto-custa-lifting-facial-sao-paulo\//,
  );
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
  assert.doesNotMatch(reply, /[\u200B-\u200D\u2060\uFEFF]/);
});

test("price review alert contains the original question and a copyable answer", () => {
  const alert = buildPriceReviewAlert({
    patientName: "Maria",
    patientMessage: "Qual o valor da blefaroplastia?",
    procedure: "blefaroplastia",
  });

  assert.match(alert, /PREÇO CIRÚRGICO — REVISAR/);
  assert.match(alert, /Qual o valor da blefaroplastia/);
  assert.match(alert, /VALOR NÃO ENVIADO/);
  assert.match(alert, /Revise e copie manualmente/);
  assert.match(alert, /entre R\$ 18 mil e R\$ 23 mil/);
  assert.doesNotMatch(alert, /R\$ 19\.900|R\$ 21\.000/);
  assert.match(alert, /parcelamento antecipado/);
  assert.match(alert, /desconto à vista/);
  assert.match(alert, /segurança, naturalidade/);
  assert.match(alert, /hospital, anestesista, auxiliar, instrumentador/i);
  assert.match(alert, /quanto-custa-cirurgia-plastica-facial-sao-paulo/);
  assert.doesNotMatch(alert, /Prefere manhã ou tarde|posso verificar horários/i);
  assert.ok(alert.length <= 1100);
});

test("price review alert preserves the one-guide-per-conversation rule", () => {
  const alert = buildPriceReviewAlert({
    patientName: "Maria",
    patientMessage: "Qual o valor da blefaroplastia?",
    procedure: "blefaroplastia",
    recentConversation: [
      {
        role: "assistant",
        text:
          "Guia: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/",
      },
    ],
  });

  assert.match(alert, /entre R\$ 18 mil e R\$ 23 mil/);
  assert.doesNotMatch(
    alert,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
});

test("recognizes a price request preserved under a known-patient policy", () => {
  assert.equal(
    isSurgicalPriceReview(
      {
        route: "human_review",
        reviewReason: "known_patient_active_care",
      },
      {
        route: "human_review",
        reason: "known_patient_active_care",
        requestReason: "surgical_price_review",
      },
    ),
    true,
  );
});

test("recognizes price decisions that must remain human-reviewed", () => {
  assert.equal(
    isSurgicalPriceReview(
      {
        route: "human_review",
        reviewReason: "price_range_requested",
      },
      { reason: "known_conversation_continuation" },
    ),
    true,
  );

  assert.equal(
    isSurgicalPriceReview(
      {
        route: "standard_reply",
        reviewReason: "price_range_requested",
      },
      {},
    ),
    false,
  );
});

test("pending hospital quote creates only a copyable human alert", () => {
  const plan = {
    route: "human_review",
    reason: "pending_hospital_quote_followup",
  };
  const alert = buildPendingHospitalQuoteAlert({
    patientName: "M\u00f4nica Mussolino",
    patientMessage:
      "Quando tiver o valor do hospital, poderia me informar?",
  });

  assert.equal(isSurgicalPriceReview(plan, plan), false);
  assert.match(alert, /OR\u00c7AMENTO HOSPITALAR/);
  assert.match(alert, /N\u00c3O RESPONDER AUTOMATICAMENTE/);
  assert.match(alert, /Estamos confirmando o valor do hospital/);
  assert.match(alert, /retornaremos assim que tivermos/);
});
