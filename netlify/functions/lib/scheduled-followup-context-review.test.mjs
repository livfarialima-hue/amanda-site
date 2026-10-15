import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildOperationalLogRecord } from "./operational-log.mjs";
import { BRUNA_FOLLOWUP_REVIEW_TIMEOUT_MS } from "./bruna-model-config.mjs";
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

// Synthetic provider envelopes only; no network request reaches a service.
const measuredUsage = { input_tokens: 77, output_tokens: 11, total_tokens: 88,
  input_tokens_details: { cached_tokens: 50 }, output_tokens_details: { reasoning_tokens: 8 } };
const alignedDecision = { decision: "send_exact", reasonCode: "context_aligned", confidence: "high" };
const measuredEnvelope = (decision = alignedDecision) => ({ status: "completed", usage: measuredUsage,
  output: [{ content: [{ type: "output_text", text: JSON.stringify(decision) }] }] });
const providerFailure = name => Object.assign(new Error("private provider failure"), { name });

test("follow-up telemetry preserves baseline request bytes, timer and decision", async t => {
  const logs = [];
  let calls = 0;
  const originalTimeout = globalThis.setTimeout;
  const delays = [];
  const timers = [];
  const cleared = [];
  const originalClear = globalThis.clearTimeout;
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    delays.push(delay);
    const timer = originalTimeout(callback, delay);
    timers.push(timer);
    return timer;
  });
  t.mock.method(globalThis, "clearTimeout", timer => { cleared.push(timer); originalClear(timer); });
  const result = await reviewScheduledFollowupContext(input, { env: { OPENAI_API_KEY: "test-key" },
    logImpl: record => logs.push(record), fetchImpl: async (url, request) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(request.method, "POST");
      assert.deepEqual(request.headers, { authorization: "Bearer test-key", "content-type": "application/json; charset=utf-8" });
      // Captured from baseline 426ea798 with the identical synthetic input.
      assert.equal(createHash("sha256").update(request.body).digest("hex"), "063aad876a425df1124775d45df93cc32d03fd0b331c9ecdab89a7ea118742e0");
      assert.ok(request.signal instanceof AbortSignal);
      return Response.json(measuredEnvelope());
    } });
  assert.equal(calls, 1);
  assert.deepEqual(delays, [BRUNA_FOLLOWUP_REVIEW_TIMEOUT_MS]);
  assert.deepEqual(cleared, timers);
  assert.deepEqual(result, { status: "completed", allowed: true, ...alignedDecision });
  assert.equal(logs.length, 1);
  const [record] = logs;
  assert.equal(record.source, "followup_review_inference");
  assert.equal(record.category, "ai_usage");
  assert.equal(record.reason, "execution_recorded");
  assert.equal(record.fields.model, "gpt-6.1-sol");
  assert.match(record.sourceId, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.equal(record.fields.aiExecution.version, 1);
  assert.equal(record.fields.aiExecution.attemptCount, 1);
  assert.equal(record.fields.aiExecution.usageCoverage, "complete");
  assert.deepEqual(record.fields.aiExecution.knownUsage, measuredUsage);
  assert.equal(record.fields.aiExecution.attempts[0].outcome, "completed");
  assert.equal(record.fields.aiExecution.attempts[0].stage, "initial");
  assert.ok(Number.isSafeInteger(record.fields.aiExecution.durationMs));
  assert.ok(record.fields.aiExecution.durationMs >= 0);
  const serialized = JSON.stringify(buildOperationalLogRecord({ ...record, env: { LOG_CORRELATION_SECRET: "synthetic-log-key" } }));
  assert.doesNotMatch(serialized, /test-key|5511999990001|Queria retomar|Pesquisa sobre|private|sourceId/);
});

test("follow-up usage distinguishes absent, partial and measured zero counters", async () => {
  for (const [observed, expectedCoverage, expectedUsage, unknownAttempts] of [
    [undefined, "unknown", null, 1],
    [{ total_tokens: 9, input_tokens: "private", output_tokens: -1, private: "secret" }, "partial", { total_tokens: 9 }, 0],
    [{ input_tokens: 0, output_tokens: 0, total_tokens: 0 }, "complete", { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, 0],
  ]) {
    const logs = [];
    const data = measuredEnvelope();
    data.usage = observed;
    await reviewScheduledFollowupContext(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => Response.json(data), logImpl: record => logs.push(record) });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].fields.aiExecution.usageCoverage, expectedCoverage);
    assert.equal(logs[0].fields.aiExecution.unknownAttempts, unknownAttempts);
    assert.deepEqual(logs[0].fields.aiExecution.knownUsage, expectedUsage);
    assert.doesNotMatch(JSON.stringify(logs), /private|secret/);
  }
});

const reviewFailureCases = [
  ["HTTP", "http_error", { status: "failed", allowed: false, errorCode: "http_error", httpStatus: 429 },
    () => ({ ok: false, status: 429, json: () => assert.fail("do not parse an HTTP error body") })],
  ...["Error", "AbortError", "TimeoutError"].map(name => [`fetch ${name}`, name === "Error" ? "request_failed" : "timeout",
    { status: "failed", allowed: false, errorCode: name === "AbortError" ? "timeout" : "request_failed" }, () => { throw providerFailure(name); }]),
  ...["SyntaxError", "Error", "AbortError", "TimeoutError"].map(name => [`body ${name}`,
    name === "SyntaxError" ? "invalid_response" : name === "Error" ? "request_failed" : "timeout",
    { status: "failed", allowed: false, errorCode: name === "AbortError" ? "timeout" : "request_failed" },
    () => ({ ok: true, status: 200, json: async () => { throw providerFailure(name); } })]),
  ["incomplete", "incomplete_response", { status: "failed", allowed: false, errorCode: "incomplete_response" },
    () => Response.json({ ...measuredEnvelope(), status: "incomplete" }), true],
  ["invalid output JSON", "invalid_response", { status: "failed", allowed: false, errorCode: "invalid_response" },
    () => Response.json({ ...measuredEnvelope(), output: [{ content: [{ type: "output_text", text: "private-invalid-json" }] }] }), true],
  ["invalid output shape", "invalid_response", { status: "failed", allowed: false, errorCode: "request_failed" },
    () => Response.json({ ...measuredEnvelope(), output: {} }), true],
  ["invalid decision", "invalid_response", { status: "failed", allowed: false, errorCode: "invalid_decision" },
    () => Response.json(measuredEnvelope({})), true],
];

for (const [label, expectedOutcome, expectedResult, respond, reported = false] of reviewFailureCases) {
  test(`follow-up preserves its legacy return and records one attempt on ${label}`, async () => {
    let calls = 0;
    const logs = [];
    const result = await reviewScheduledFollowupContext(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => { calls++; return respond(); }, logImpl: record => logs.push(record) });
    assert.deepEqual(result, expectedResult);
    assert.equal(calls, 1);
    assert.equal(logs.length, 1);
    const execution = logs[0].fields.aiExecution;
    assert.equal(execution.attemptCount, 1);
    assert.equal(execution.attempts[0].outcome, expectedOutcome);
    assert.equal(execution.unknownAttempts, reported ? 0 : 1);
    assert.equal(execution.usageCoverage, reported ? "complete" : "unknown");
    assert.deepEqual(execution.knownUsage, reported ? measuredUsage : null);
    assert.doesNotMatch(JSON.stringify(logs), /private|test-key|5511999990001|Queria retomar/);
  });
}

test("a completed follow-up inference can still veto delivery or require more confidence", async () => {
  const ids = new Set();
  for (const decision of [{ decision: "cancel_for_review", reasonCode: "patient_paused", confidence: "high" },
    { ...alignedDecision, confidence: "medium" }]) {
    const logs = [];
    const result = await reviewScheduledFollowupContext(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => Response.json(measuredEnvelope(decision)), logImpl: record => logs.push(record) });
    assert.deepEqual(result, { status: "completed", allowed: false, decision: "cancel_for_review",
      reasonCode: decision.decision === "cancel_for_review" ? "patient_paused" : "insufficient_context", confidence: decision.confidence });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].fields.aiExecution.attempts[0].outcome, "completed");
    assert.deepEqual(logs[0].fields.aiExecution.knownUsage, measuredUsage);
    ids.add(logs[0].sourceId);
  }
  assert.equal(ids.size, 2);
});

test("follow-up does not count missing inputs or failed request preparation as inference", async () => {
  const badContext = { toString() { throw new Error("private preparation failure"); } };
  for (const [candidate, env, expected] of [
    [input, {}, { status: "skipped", allowed: false, errorCode: "configuration_missing" }],
    [{ ...input, body: "" }, { OPENAI_API_KEY: "test-key" }, { status: "completed", allowed: false, decision: "cancel_for_review", reasonCode: "insufficient_context", confidence: "high" }],
    [{ ...input, recentConversation: [] }, { OPENAI_API_KEY: "test-key" }, { status: "completed", allowed: false, decision: "cancel_for_review", reasonCode: "insufficient_context", confidence: "high" }],
    [{ ...input, leadContext: { status: badContext } }, { OPENAI_API_KEY: "test-key" }, { status: "failed", allowed: false, errorCode: "request_failed" }],
  ]) {
    const result = await reviewScheduledFollowupContext(candidate, { env,
      fetchImpl: () => assert.fail("blocked or unprepared input cannot call inference"),
      logImpl: () => assert.fail("no attempted inference to record") });
    assert.deepEqual(result, expected);
  }
});

test("follow-up logging is best-effort, not awaited, and cannot change the decision or retry", { timeout: 1000 }, async () => {
  for (const mode of ["throw", "reject", "pending"]) {
    let calls = 0;
    let logs = 0;
    const result = await reviewScheduledFollowupContext(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => { calls++; return Response.json(measuredEnvelope()); }, logImpl: () => {
        logs++;
        if (mode === "throw") throw new Error("private logger failure");
        if (mode === "reject") return Promise.reject(new Error("private logger failure"));
        return new Promise(() => {});
      } });
    assert.deepEqual(result, { status: "completed", allowed: true, ...alignedDecision });
    assert.equal(calls, 1);
    assert.equal(logs, 1);
  }
});
