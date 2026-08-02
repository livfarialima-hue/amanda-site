import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPendingHospitalQuoteAlert,
  buildPriceReviewAlert,
  buildSurgicalPriceHoldingReply,
  buildSurgicalPriceSuggestedReply,
  getSurgicalPriceReference,
  isSurgicalPriceReview,
} from "./surgical-price-review.mjs";

test("consultation price suggestion includes the invoice without promising tax savings", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "avaliacao_facial",
  });

  assert.match(reply, /R\$ 500/);
  assert.match(reply, /nota fiscal/);
  assert.match(reply, /comprovante de despesa médica/);
  assert.match(reply, /Imposto de Renda/);
  assert.doesNotMatch(reply, /(?:garante|garantida|restituição|economia tributária)/i);
});

test("combines professional and hospital references for lifting facial", () => {
  const reference = getSurgicalPriceReference("lifting_facial");

  assert.equal(reference.cashTotal, 36422.2);
  assert.equal(reference.installmentTotal, 38435.32);
  assert.equal(reference.rangeMinimum, 33000);
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
  assert.match(reply, /entre R\$ 33 mil e R\$ 42 mil/);
  assert.doesNotMatch(reply, /R\$ 36\.400|R\$ 38\.400/);
  assert.doesNotMatch(reply, /referência hospitalar|valor do hospital/i);
  assert.doesNotMatch(
    reply,
    /cirurgiã principal|auxiliar|anestesista|instrumentadora/,
  );
  assert.match(reply, /face, pescoço ou ambos/);
  assert.match(reply, /avaliação individual/);
  assert.match(reply, /pagamento antecipado até a cirurgia/);
  assert.match(reply, /condição à vista/);
  assert.match(reply, /consulta custa R\$ 500/);
  assert.match(reply, /é abatida se a cirurgia/);
  assert.match(reply, /equipe médica, anestesia, hospital, materiais e acompanhamento/);
  assert.match(reply, /custo total da jornada/);
  assert.match(
    reply,
    /conteudos\/quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.match(reply, /verificar um horário/);
  assert.doesNotMatch(
    reply,
    /Se quiser, posso te explicar o que costuma aproximar/,
  );
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
  assert.match(reply, /R\$ 500/);
  assert.match(reply, /nota fiscal/);
  assert.match(reply, /equipe médica, anestesia, hospital, materiais e acompanhamento/);
  assert.match(
    reply,
    /conteudos\/quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.doesNotMatch(reply, /R\$ (?:1[89]|2[349]|3[38]|4[2]) mil/);
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
  assert.match(alert, /pagamento antecipado até a cirurgia/);
  assert.match(alert, /condição à vista/);
  assert.match(alert, /custo total da jornada/);
  assert.match(alert, /verificar um horário/);
  assert.ok(alert.length <= 1100);
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
