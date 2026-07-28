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

  assert.match(reply, /^Olá, Rô!/);
  assert.match(reply, /entre R\$ 33\.000 e R\$ 42\.000/);
  assert.doesNotMatch(reply, /R\$ 36\.400|R\$ 38\.400/);
  assert.match(
    reply,
    /cirurgiã principal, auxiliar, anestesista e instrumentadora/,
  );
  assert.match(reply, /referência hospitalar, quando aplicável/);
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
  assert.match(alert, /NÃO ENVIADO À PACIENTE/);
  assert.match(alert, /Revise e copie manualmente/);
  assert.match(alert, /entre R\$ 18\.000 e R\$ 23\.000/);
  assert.doesNotMatch(alert, /R\$ 19\.900|R\$ 21\.000/);
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
