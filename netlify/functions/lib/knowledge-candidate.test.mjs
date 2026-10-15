import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { proposeKnowledgeCandidate } from "./knowledge-candidate.mjs";
import { buildOperationalLogRecord } from "./operational-log.mjs";

// All data and credentials are synthetic. Every provider request is mocked.
const pendingQuestion = { id: "synthetic-question", questionRevision: "a".repeat(64),
  conversationRevision: "b".repeat(64), opportunityId: "synthetic-opportunity", professional: "amanda",
  question: "Tem nota fiscal?", risk: "Baixo" };
const input = { answer: "Emitimos nota fiscal da consulta.", pendingQuestion };
const proposal = { reusable: true, answersQuestion: true, subject: "Nota fiscal",
  question: "Emitem nota fiscal da consulta?", answer: "Emitimos nota fiscal da consulta.",
  boundaries: "Somente a nota da consulta, sem garantia de reembolso.", existingRuleId: "" };
const usage = { input_tokens: 77, output_tokens: 11, total_tokens: 88,
  input_tokens_details: { cached_tokens: 50 }, output_tokens_details: { reasoning_tokens: 8 } };
const envelope = (value = proposal, observedUsage = usage) => ({ status: "completed", usage: observedUsage,
  output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
const failure = name => Object.assign(new Error("private provider failure"), { name });

test("knowledge telemetry preserves the baseline request bytes, timer and proposal contract", async t => {
  const logs = [];
  let calls = 0;
  const originalTimeout = AbortSignal.timeout;
  const delays = [];
  t.mock.method(AbortSignal, "timeout", delay => { delays.push(delay); return originalTimeout(delay); });
  const result = await proposeKnowledgeCandidate(input, { env: { OPENAI_API_KEY: "test-key" },
    logImpl: record => logs.push(record), fetchImpl: async (url, request) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(request.method, "POST");
      assert.deepEqual(request.headers, { authorization: "Bearer test-key", "content-type": "application/json" });
      // Captured from baseline 426ea798 with the identical synthetic input.
      assert.equal(createHash("sha256").update(request.body).digest("hex"), "4730371ff9cfab20b9ba3cd819587e1d6dc9a84c4bd7a1935d1743affb9f1957");
      assert.ok(request.signal instanceof AbortSignal);
      return Response.json(envelope());
    } });
  assert.equal(calls, 1);
  assert.deepEqual(delays, [12000]);
  assert.deepEqual(result, { subject: proposal.subject, question: proposal.question, answer: proposal.answer,
    boundaries: proposal.boundaries, sourceQuestionId: pendingQuestion.id,
    questionRevision: pendingQuestion.questionRevision, conversationRevision: pendingQuestion.conversationRevision,
    opportunityId: pendingQuestion.opportunityId, professional: pendingQuestion.professional,
    answersQuestion: true, risk: "Baixo", version: "learning-proposal-v2" });
  assert.equal(logs.length, 1);
  const [record] = logs;
  assert.equal(record.source, "knowledge_inference");
  assert.equal(record.category, "ai_usage");
  assert.equal(record.reason, "execution_recorded");
  assert.equal(record.fields.model, "gpt-6.1-sol");
  assert.match(record.sourceId, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.equal(record.fields.aiExecution.version, 1);
  assert.equal(record.fields.aiExecution.attemptCount, 1);
  assert.equal(record.fields.aiExecution.usageCoverage, "complete");
  assert.deepEqual(record.fields.aiExecution.knownUsage, usage);
  assert.equal(record.fields.aiExecution.attempts[0].outcome, "completed");
  assert.equal(record.fields.aiExecution.attempts[0].stage, "initial");
  assert.ok(Number.isSafeInteger(record.fields.aiExecution.durationMs));
  assert.ok(record.fields.aiExecution.durationMs >= 0);
  const serialized = JSON.stringify(buildOperationalLogRecord({ ...record, env: { LOG_CORRELATION_SECRET: "synthetic-log-key" } }));
  assert.doesNotMatch(serialized, /test-key|synthetic-question|synthetic-opportunity|Tem nota|Emitimos|private|sourceId/);
});

test("knowledge records partial, absent and measured zero usage without manufacturing counters", async () => {
  for (const [observed, expectedCoverage, expectedUsage, unknownAttempts] of [
    [undefined, "unknown", null, 1],
    [{ total_tokens: 9, input_tokens: "private", output_tokens: -1, private: "secret" }, "partial", { total_tokens: 9 }, 0],
    [{ input_tokens: 0, output_tokens: 0, total_tokens: 0 }, "complete", { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, 0],
  ]) {
    const logs = [];
    const data = envelope();
    data.usage = observed;
    await proposeKnowledgeCandidate(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => Response.json(data), logImpl: record => logs.push(record) });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].fields.aiExecution.usageCoverage, expectedCoverage);
    assert.equal(logs[0].fields.aiExecution.unknownAttempts, unknownAttempts);
    assert.deepEqual(logs[0].fields.aiExecution.knownUsage, expectedUsage);
    assert.doesNotMatch(JSON.stringify(logs), /private|secret/);
  }
});

const failureCases = [
  ["HTTP", "http_error", () => ({ ok: false, status: 429, json: () => assert.fail("do not parse an HTTP error body") })],
  ...["Error", "AbortError", "TimeoutError"].map(name => [`fetch ${name}`, name === "Error" ? "request_failed" : "timeout", () => { throw failure(name); }]),
  ...["SyntaxError", "Error", "AbortError", "TimeoutError"].map(name => [`body ${name}`,
    name === "SyntaxError" ? "invalid_response" : name === "Error" ? "request_failed" : "timeout",
    () => ({ ok: true, status: 200, json: async () => { throw failure(name); } })]),
  ["incomplete", "incomplete_response", () => Response.json({ ...envelope(), status: "incomplete" }), true],
  ["invalid output JSON", "invalid_response", () => Response.json({ ...envelope(), output: [{ content: [{ type: "output_text", text: "private-invalid-json" }] }] }), true],
  ["invalid output shape", "invalid_response", () => Response.json({ ...envelope(), output: {} }), true],
];

for (const [label, expectedOutcome, respond, reported = false] of failureCases) {
  test(`knowledge keeps null and counts one real attempt on ${label}`, async () => {
    let calls = 0;
    const logs = [];
    const result = await proposeKnowledgeCandidate(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => { calls++; return respond(); }, logImpl: record => logs.push(record) });
    assert.equal(result, null);
    assert.equal(calls, 1);
    assert.equal(logs.length, 1);
    const execution = logs[0].fields.aiExecution;
    assert.equal(execution.attemptCount, 1);
    assert.equal(execution.attempts[0].outcome, expectedOutcome);
    assert.equal(execution.unknownAttempts, reported ? 0 : 1);
    assert.equal(execution.usageCoverage, reported ? "complete" : "unknown");
    assert.deepEqual(execution.knownUsage, reported ? usage : null);
    assert.doesNotMatch(JSON.stringify(logs), /private|test-key|synthetic-question|synthetic-opportunity/);
  });
}

test("completed inference does not mean knowledge accepted, approved or reusable", async () => {
  const ids = new Set();
  for (const rejected of [{}, { ...proposal, reusable: false }, { ...proposal, answersQuestion: false },
    { ...proposal, answer: "Solicite por synthetic@example.org" }]) {
    const logs = [];
    const result = await proposeKnowledgeCandidate(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => Response.json(envelope(rejected)), logImpl: record => logs.push(record) });
    assert.equal(result, null);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].fields.aiExecution.attempts[0].outcome, "completed");
    assert.deepEqual(logs[0].fields.aiExecution.knownUsage, usage);
    ids.add(logs[0].sourceId);
  }
  assert.equal(ids.size, 4);
});

test("knowledge does not count blocked inputs or failed request preparation as inference", async () => {
  const circular = {};
  circular.self = circular;
  for (const [candidate, env] of [
    [input, {}], [{ ...input, pendingQuestion: null }, { OPENAI_API_KEY: "test-key" }],
    [{ ...input, pendingQuestion: { ...pendingQuestion, risk: "Médio" } }, { OPENAI_API_KEY: "test-key" }],
    [{ ...input, answer: "Vou conferir com a equipe." }, { OPENAI_API_KEY: "test-key" }],
    [{ ...input, answer: "Tome medicamento" }, { OPENAI_API_KEY: "test-key" }],
    [{ ...input, answer: "" }, { OPENAI_API_KEY: "test-key" }],
    [{ ...input, answer: "a".repeat(2001) }, { OPENAI_API_KEY: "test-key" }],
    [{ ...input, existingCandidates: [circular] }, { OPENAI_API_KEY: "test-key" }],
  ]) {
    const result = await proposeKnowledgeCandidate(candidate, { env,
      fetchImpl: () => assert.fail("blocked or unprepared input cannot call inference"),
      logImpl: () => assert.fail("no attempted inference to record") });
    assert.equal(result, null);
  }
});

test("knowledge logging is best-effort, not awaited, and never retries or changes the proposal", { timeout: 1000 }, async () => {
  for (const mode of ["throw", "reject", "pending"]) {
    let calls = 0;
    let logs = 0;
    const result = await proposeKnowledgeCandidate(input, { env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => { calls++; return Response.json(envelope()); }, logImpl: () => {
        logs++;
        if (mode === "throw") throw new Error("private logger failure");
        if (mode === "reject") return Promise.reject(new Error("private logger failure"));
        return new Promise(() => {});
      } });
    assert.equal(result.answer, proposal.answer);
    assert.equal(calls, 1);
    assert.equal(logs, 1);
  }
});
