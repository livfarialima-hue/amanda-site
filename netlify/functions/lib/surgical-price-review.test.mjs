import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPriceReviewAlert,
  buildSurgicalPriceSuggestedReply,
  getSurgicalPriceReference,
  isSurgicalPriceReview,
} from "./surgical-price-review.mjs";

test("combines professional and hospital references for lifting facial", () => {
  const reference = getSurgicalPriceReference("lifting_facial");

  assert.equal(reference.cashTotal, 36422.2);
  assert.equal(reference.installmentTotal, 38435.32);
  assert.match(reference.source, /CIRURGIAS 2025/);
  assert.match(reference.source, /Página7/);
});

test("creates a patient-ready lifting facial price suggestion for human review", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Rô de Souza",
    procedure: "lifting_facial",
  });

  assert.match(reply, /^Olá, Rô!/);
  assert.match(reply, /R\$ 36\.400 à vista/);
  assert.match(reply, /R\$ 38\.400 no valor parcelado/);
  assert.match(reply, /honorários, equipe e a referência hospitalar/);
  assert.match(reply, /orçamento final pode variar/);
  assert.match(reply, /consulta custa R\$ 500/);
  assert.match(reply, /valor é abatido/);
});

test("keeps ambiguous procedures useful without inventing a number", () => {
  const reply = buildSurgicalPriceSuggestedReply({
    patientName: "Maria",
    procedure: "mastopexia",
  });

  assert.match(reply, /com ou sem prótese/);
  assert.doesNotMatch(reply, /R\$ \d/);
});

test("price review alert contains the original question and a copyable answer", () => {
  const alert = buildPriceReviewAlert({
    patientName: "Maria",
    patientMessage: "Qual o valor da blefaroplastia?",
    procedure: "blefaroplastia",
  });

  assert.match(alert, /PREÇO CIRÚRGICO — REVISÃO NECESSÁRIA/);
  assert.match(alert, /Qual o valor da blefaroplastia/);
  assert.match(alert, /Sugestão para copiar após conferir/);
  assert.match(alert, /R\$ 19\.900 à vista/);
  assert.match(alert, /R\$ 21\.000 no valor parcelado/);
  assert.ok(alert.length <= 700);
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
