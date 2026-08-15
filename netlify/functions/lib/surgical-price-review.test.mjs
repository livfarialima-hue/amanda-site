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

test("creates the approved first response for price, installments and cost composition", () => {
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
  assert.match(reply, /definidos individualmente após a avaliação e o planejamento/i);
  assert.match(reply, /técnica, a complexidade, as necessidades de cada pessoa/i);
  assert.match(reply, /equipe, o hospital, a anestesia, os materiais e o acompanhamento/i);
  assert.match(reply, /não apresentamos um honorário isolado/i);
  assert.match(
    reply,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
  assert.ok(Array.from(reply).length <= 650);
});

test("the first price response does not ask for a procedure already identified", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Maria",
    procedure: "lifting_facial",
  });

  assert.match(reply, /explicar como funciona a avaliação/i);
  assert.match(
    reply,
    /quanto-custa-lifting-facial-sao-paulo/,
  );
  assert.doesNotMatch(reply, /qual cirurgia você está pesquisando/i);
  assert.doesNotMatch(reply, /(?:informar|passar).{0,20}(?:média|faixa)/i);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
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
  assert.match(reply, /explico a avaliação/i);
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
  assert.match(reply, /quanto-custa-lifting-facial-sao-paulo/);
  assert.match(reply, /explico a avaliação/i);
  assert.doesNotMatch(reply, /obrigada por aguardar/i);
  assert.doesNotMatch(reply, /[\u200B-\u200D\u2060\uFEFF]/);
  assert.ok(Array.from(reply).length <= 650);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("direct lifting price answers location in the same first reply", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "lifting_facial",
    directToPatient: true,
    currentText: "Onde fica e qual o valor do lifting?",
  });

  assert.match(reply, /Rua Pais Leme, 215/);
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
  assert.match(daytime, /faixa de referência para o lifting facial/);
  assert.match(daytime, /possibilidades de pagamento/);
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
  assert.match(reply, /Rua Pais Leme, 215/);
  assert.match(reply, /Pinheiros/);
  assert.match(reply, /pr[oó]xima à Av\. Faria Lima/i);
  assert.match(reply, /faixa de refer[eê]ncia para o lifting facial/i);
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

test("does not offer the facial guide for breast or body procedures", () => {
  for (const procedure of [
    "mastopexia",
    "protese_mama",
    "abdominoplastia",
    "lipoaspiracao",
    "ninfoplastia",
  ]) {
    const reply = buildSurgicalPriceSuggestedReply({
      patientName: "Maria",
      procedure,
    });

    assert.doesNotMatch(
      reply,
      /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
    );
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

test("the range message includes the composition guide even if it appeared earlier", () => {
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
  assert.match(
    reply,
    /quanto-custa-lifting-facial-sao-paulo/,
  );
  assert.equal((reply.match(/https?:\/\//g) || []).length, 1);
});

test("the first lifting price answer does not repeat a guide already in the history", () => {
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

  assert.match(reply, /definidos individualmente/i);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.doesNotMatch(reply, /https?:\/\//);
});

test("the first price answer does not attach a facial guide to another region", () => {
  const reply = buildSurgicalInitialPriceReply({
    patientName: "Maria",
    procedure: "abdominoplastia",
  });

  assert.match(reply, /definidos individualmente/i);
  assert.doesNotMatch(reply, /R\$ 18 mil|R\$ 26 mil/);
  assert.doesNotMatch(reply, /quanto-custa-(?:cirurgia-plastica-facial|lifting-facial)/);
  assert.equal((reply.match(/https?:\/\//g) || []).length, 0);
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
  assert.match(alert, /parcelamento antecipado até a cirurgia/);
  assert.match(alert, /condição à vista/);
  assert.match(alert, /segurança, naturalidade/);
  assert.match(alert, /hospital, anestesista, auxiliar, instrumentador/i);
  assert.match(alert, /quanto-custa-cirurgia-plastica-facial-sao-paulo/);
  assert.match(alert, /Prefere manhã ou tarde/);
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
