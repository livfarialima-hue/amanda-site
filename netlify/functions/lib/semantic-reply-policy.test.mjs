import assert from "node:assert/strict";
import test from "node:test";

import { prepareSemanticContextContinuationAction } from "./semantic-reply-policy.mjs";
import { selectConfirmedReplyText } from "./semantic-reply-policy.mjs";
import { validateOutboundReply } from "./outbound-reply-gate.mjs";

const approved = { status: "completed", decision: { route: "standard_reply", confidence: "high",
  automaticAllowed: true, urgent: false, professional: "amanda", procedure: "lifting_facial",
  replyCode: "AMANDA-CONSULTA-INFO-01", suggestedReply: "A consulta presencial custa R$ 500." } };
function contextual(text, changes = {}) {
  return { status: "completed", decision: { ...approved.decision, replyWording: "contextual", suggestedReply: text, ...changes } };
}
test("confirmed institutional facts allow a contextual answer without restoring the stock phrase", () => {
  const text = "A consulta presencial com a Dra. Amanda é R$ 500. Você pode esclarecer suas dúvidas sem decidir agora por uma cirurgia.";
  assert.equal(selectConfirmedReplyText(contextual(text), approved), text);
});
test("missing or invalid contextual permission keeps the exact approved text", () => {
  for (const replyWording of [undefined, "approved_exact", "anything"]) {
    assert.equal(selectConfirmedReplyText(contextual("A consulta é R$ 500.", { replyWording }), approved), approved.decision.suggestedReply);
  }
});
test("rewriting cannot alter or drop approved amounts and links", () => {
  const withLink = { ...approved, decision: { ...approved.decision, suggestedReply: approved.decision.suggestedReply + " https://example.test/consulta" } };
  for (const text of ["Custa R$ 700.", "A consulta é individual.", "Custa R$ 500. https://unapproved.example/", "Custa R$ 500."]) {
    assert.equal(selectConfirmedReplyText(contextual(text), withLink), withLink.decision.suggestedReply);
  }
});
test("price, agenda, insurance, pending tasks and unknown codes remain exact", () => {
  for (const replyCode of ["LIFTING-PRICE-RANGE-01", "OTOPLASTY-PRICE-RANGE-01", "SURGICAL-PRICE-INITIAL-01",
    "AMANDA-AGENDA-PREFERENCE-01", "INSURANCE-ACCEPTANCE-01", "AMANDA-CONSULTA-BUNDLE-01", "NEW-UNKNOWN-CODE"]) {
    const candidate = { ...approved, decision: { ...approved.decision, replyCode } };
    assert.equal(selectConfirmedReplyText(contextual("Outra redação com R$ 500.", { replyCode }), candidate), candidate.decision.suggestedReply);
  }
});
test("wording permission cannot override semantic uncertainty, urgency or a different professional", () => {
  for (const changes of [{ confidence: "low" }, { automaticAllowed: false }, { urgent: true }, { professional: "daniel" }, { procedure: "otoplastia" }]) {
    assert.equal(selectConfirmedReplyText(contextual("Outra redação com R$ 500.", changes), approved), approved.decision.suggestedReply);
  }
});
test("contextual wording still goes through clinical, appointment and question limits", () => {
  const conversationAction = { action: "respond", replyContract: { maxQuestions: 0, maxLinks: 0,
    allowCta: false, allowAppointmentConfirmation: false } };
  for (const text of ["A consulta custa R$ 500. Sua consulta está confirmada.",
    "A consulta custa R$ 500. A melhor cirurgia para você é o lifting.",
    "A consulta custa R$ 500. Qual dia prefere?"]) {
    const body = selectConfirmedReplyText(contextual(text), approved);
    assert.equal(body, text);
    assert.equal(validateOutboundReply({ body, currentText: "Qual o valor da consulta?", conversationAction }).allowed, false);
  }
});

test("takeover continuation preserves only the approved initial price envelope", () => {
  const action = prepareSemanticContextContinuationAction({
    replyContract: {
      sourceReason: "price_initial_information",
      allowedResponseKind: "direct_answer",
      maxQuestions: 0,
      maxLinks: 1,
      allowCta: true,
      allowAppointmentConfirmation: false,
    },
  });

  assert.equal(action.replyContract.owner, "bruna");
  assert.equal(action.replyContract.maxQuestions, 0);
  assert.equal(action.replyContract.maxLinks, 1);
  assert.equal(action.replyContract.allowCta, true);
  assert.equal(action.replyContract.allowAppointmentConfirmation, false);
});

test("ordinary takeover continuation remains linkless and without CTA", () => {
  const action = prepareSemanticContextContinuationAction({
    replyContract: {
      sourceReason: "known_procedure",
      maxQuestions: 1,
      maxLinks: 1,
      allowCta: true,
    },
  });

  assert.equal(action.replyContract.maxQuestions, 1);
  assert.equal(action.replyContract.maxLinks, 0);
  assert.equal(action.replyContract.allowCta, false);
});
