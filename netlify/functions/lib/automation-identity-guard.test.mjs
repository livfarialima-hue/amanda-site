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

test("allows truthful disclosure and rejects a claim of being human", () => {
  for (const text of ["Sou uma assistente virtual.", "Sou uma automação da clínica.", "Eu sou um bot de atendimento."]) {
    const decision=standardReply(text);
    assert.deepEqual(applyAutomationIdentityGuard(decision),decision);
  }
  for (const text of ["Não sou um robô; sou a Bruna.", "Sou uma pessoa de verdade."]) {
    const guarded=applyAutomationIdentityGuard(standardReply(text));
    assert.equal(guarded.route,"human_review"); assert.equal(guarded.suggestedReply,"");
    assert.equal(guarded.reviewReason,"false_human_identity");
  }
});
