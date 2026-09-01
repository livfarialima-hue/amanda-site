import assert from "node:assert/strict";
import test from "node:test";
import {
  reviewScheduledFollowupContext,
} from "./scheduled-followup-context-review.mjs";

const input = {
  patientPhone: "+5511999990001",
  body: "Olá! Queria retomar nossa conversa com calma.",
  recentConversation: [
    {
      direction: "IN",
      at: "2026-08-22T12:00:00-03:00",
      text: "Gostaria de entender como funciona a avaliação.",
    },
    {
      direction: "OUT",
      at: "2026-08-22T12:02:00-03:00",
      text: "Claro. A avaliação é individual e sem compromisso de operar.",
    },
  ],
  leadContext: {
    status: "Qualificado",
    summary: "Pesquisa sobre avaliação",
    nextAction: "Aguardar decisão",
  },
  humanApproved: true,
};

function openAIResponse(decision) {
  return new Response(
    JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify(decision),
        }],
      }],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

test("semantic follow-up review reads every recent turn and preserves the exact approved text", async () => {
  let requestBody;
  const result = await reviewScheduledFollowupContext(input, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return openAIResponse({
        decision: "send_exact",
        reasonCode: "context_aligned",
        confidence: "high",
      });
    },
  });

  assert.equal(result.allowed, true);
  assert.equal(result.decision, "send_exact");
  const modelInput = JSON.parse(requestBody.input);
  assert.equal(modelInput.recentConversation.length, 2);
  assert.equal(modelInput.recentConversation[0].direction, "IN");
  assert.equal(modelInput.recentConversation[1].direction, "OUT");
  assert.equal(modelInput.proposedMessage, input.body);
  assert.equal(modelInput.humanApproved, true);
  assert.equal(modelInput.patientPhone, undefined);
  assert.equal(requestBody.store, false);
  assert.match(
    requestBody.instructions,
    /simples menção ao nome de um procedimento estético/,
  );
});

test("semantic follow-up review keeps only the 20 latest chronological turns", async () => {
  let requestBody;
  const recentConversation = Array.from({ length: 23 }, (_, index) => ({
    direction: index % 2 === 0 ? "IN" : "OUT",
    at: `2026-08-22T${String(index).padStart(2, "0")}:00:00-03:00`,
    text: `turn-${index}`,
  }));

  const result = await reviewScheduledFollowupContext(
    { ...input, recentConversation },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return openAIResponse({
          decision: "send_exact",
          reasonCode: "context_aligned",
          confidence: "high",
        });
      },
    },
  );

  assert.equal(result.allowed, true);
  const modelInput = JSON.parse(requestBody.input);
  assert.deepEqual(
    modelInput.recentConversation.map((turn) => turn.text),
    recentConversation.slice(-20).map((turn) => turn.text),
  );
});

test("semantic follow-up review can only veto when context changed", async () => {
  const result = await reviewScheduledFollowupContext(input, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async () => openAIResponse({
      decision: "cancel_for_review",
      reasonCode: "patient_paused",
      confidence: "high",
    }),
  });

  assert.deepEqual(result, {
    status: "completed",
    allowed: false,
    decision: "cancel_for_review",
    reasonCode: "patient_paused",
    confidence: "high",
  });
});

test("semantic follow-up review fails closed on low confidence or missing context", async () => {
  const lowConfidence = await reviewScheduledFollowupContext(input, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async () => openAIResponse({
      decision: "send_exact",
      reasonCode: "context_aligned",
      confidence: "medium",
    }),
  });
  let calls = 0;
  const missingContext = await reviewScheduledFollowupContext(
    { ...input, recentConversation: [] },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => {
        calls += 1;
        return openAIResponse({});
      },
    },
  );

  assert.equal(lowConfidence.allowed, false);
  assert.equal(lowConfidence.decision, "cancel_for_review");
  assert.equal(lowConfidence.reasonCode, "insufficient_context");
  assert.equal(missingContext.allowed, false);
  assert.equal(missingContext.reasonCode, "insufficient_context");
  assert.equal(calls, 0);
});

test("semantic follow-up review fails closed when OpenAI is unavailable", async () => {
  const missingConfiguration = await reviewScheduledFollowupContext(
    input,
    { env: {} },
  );
  const providerFailure = await reviewScheduledFollowupContext(input, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
  });

  assert.equal(missingConfiguration.allowed, false);
  assert.equal(missingConfiguration.errorCode, "configuration_missing");
  assert.equal(providerFailure.allowed, false);
  assert.equal(providerFailure.errorCode, "http_error");
});
