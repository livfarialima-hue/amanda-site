import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProfessionalFactPartialReview,
  buildProfessionalFactReviewAlert,
  isProfessionalExperienceDetailRequest,
} from "./professional-fact-review.mjs";

test("recognizes an exact professional experience question", () => {
  assert.equal(
    isProfessionalExperienceDetailRequest(
      "Gostaria de saber há quanto tempo ela atua na cirurgia plástica",
    ),
    true,
  );
});

test("answers verified facts and leaves only the duration pending", () => {
  const review = buildProfessionalFactPartialReview({
    currentText: "E se ela faz lifting facial",
    patientName: "Kelly",
    procedure: "lifting_facial",
    recentConversation: [
      {
        role: "patient",
        text: "E gostaria de saber há quanto tempo ela atua na cirurgia plástica",
      },
    ],
  });

  assert.match(review.safeReply, /Sim, a Dra\. Amanda realiza lifting facial/);
  assert.match(review.safeReply, /residência médica em Cirurgia Plástica pela Unicamp/);
  assert.match(review.safeReply, /RQE 110472/);
  assert.match(review.safeReply, /vou confirmar essa informação/);
  assert.doesNotMatch(review.safeReply, /mais de 10 anos|exclusivamente/i);
});

test("a later assistant reply closes the old experience question", () => {
  const review = buildProfessionalFactPartialReview({
    currentText: "Ela faz lifting facial?",
    patientName: "Kelly",
    procedure: "lifting_facial",
    recentConversation: [
      {
        role: "patient",
        text: "Há quanto tempo ela atua?",
      },
      {
        role: "assistant",
        text: "Vou confirmar essa informação.",
      },
    ],
  });

  assert.equal(review, null);
});

test("the alert distinguishes what was answered from what remains pending", () => {
  const review = buildProfessionalFactPartialReview({
    currentText: "Há quanto tempo ela atua?",
    patientName: "Kelly",
    recentConversation: [],
  });
  const alert = buildProfessionalFactReviewAlert({
    review,
    patientMessage: "Há quanto tempo ela atua?",
    safeReplySent: true,
  });

  assert.match(alert, /Resposta segura já enviada automaticamente/);
  assert.match(alert, /Pendente para a equipe/);
  assert.match(alert, /Sugestão de complemento após confirmar/);
  assert.match(alert, /\[ANO CONFIRMADO\]/);
});
