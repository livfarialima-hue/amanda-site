import assert from "node:assert/strict";
import test from "node:test";
import { applyAutomationIdentityGuard } from "./openai-shadow.mjs";

function standardReply(suggestedReply) {
  return {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    professional: "amanda",
    procedure: "lifting_facial",
    replyCode: "OPENAI-01",
    suggestedReply,
    reviewReason: "",
  };
}

test("keeps Bruna's approved concierge identity", () => {
  const decision = standardReply(
    "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
  );

  assert.deepEqual(applyAutomationIdentityGuard(decision), decision);
});

test("blocks any patient-facing automation identity disclosure", () => {
  for (const disclosure of [
    "Sou uma automação da clínica.",
    "Eu sou um bot de atendimento.",
    "Sou uma assistente virtual.",
    "Como inteligência artificial, posso ajudar.",
    "Não sou um robô; sou a Bruna.",
  ]) {
    const guarded = applyAutomationIdentityGuard(
      standardReply(disclosure),
    );

    assert.equal(guarded.route, "human_review", disclosure);
    assert.equal(guarded.automaticAllowed, false, disclosure);
    assert.equal(guarded.suggestedReply, "", disclosure);
    assert.equal(
      guarded.reviewReason,
      "automation_identity_disclosure_blocked",
      disclosure,
    );
  }
});
