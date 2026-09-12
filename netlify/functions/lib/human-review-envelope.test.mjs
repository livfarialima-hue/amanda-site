import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHumanReviewEnvelope,
  formatHumanReviewEnvelope,
  NO_SAFE_REVIEW_SUGGESTION,
} from "./human-review-envelope.mjs";

test("human review always names a reason, owner, context and safe suggestion status", () => {
  const envelope = buildHumanReviewEnvelope({
    reason: "appointment_professional_conflict",
    professional: "Matheus (ortop)",
    relationship: { state: "known_patient" },
    contextSummary: "Horário informado para conferência.",
  });

  assert.equal(envelope.reason, "appointment_professional_conflict");
  assert.equal(envelope.owner, "Equipe administrativa — Matheus (ortop)");
  assert.equal(envelope.relationship, "known_patient");
  assert.equal(envelope.suggestionStatus, "none_safe");
  assert.match(formatHumanReviewEnvelope(envelope), /Horário informado/);
  assert.match(formatHumanReviewEnvelope(envelope), /SEM SUGESTÃO PRONTA/);
});

test("a safe draft remains internal and explicitly reviewable", () => {
  const envelope = buildHumanReviewEnvelope({
    reason: "safe_information_needs_review",
    professional: "amanda",
    relationship: "new_lead",
    suggestedReply: "Oi! Posso esclarecer esse ponto com você.",
  });
  const formatted = formatHumanReviewEnvelope(envelope);

  assert.equal(envelope.owner, "Dra. Amanda/equipe");
  assert.equal(envelope.suggestionStatus, "ready_for_human_review");
  assert.match(formatted, /Sugestão para copiar após conferir/);
  assert.doesNotMatch(formatted, new RegExp(NO_SAFE_REVIEW_SUGGESTION));
});

test("urgent review defaults to high risk and never invents a draft", () => {
  const envelope = buildHumanReviewEnvelope({
    reason: "possible_urgent_symptoms",
    professional: "amanda",
    urgent: true,
  });

  assert.equal(envelope.risk, "high");
  assert.equal(envelope.suggestedReply, "");
  assert.equal(envelope.suggestionStatus, "none_safe");
});
