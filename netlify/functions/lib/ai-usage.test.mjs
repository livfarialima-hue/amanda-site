import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAIUsage, summarizeAIExecution, sanitizeAIExecution } from "./ai-usage.mjs";

test("usage keeps only reported nonnegative integer counters and never fills missing counters", () => {
  assert.equal(normalizeAIUsage({ input_tokens: "100", output_tokens: -1, total_tokens: Infinity }), null);
  assert.deepEqual(normalizeAIUsage({ input_tokens: 0, total_tokens: 9, message: "private", input_tokens_details: { cached_tokens: 0, text: "private" } }),
    { input_tokens: 0, total_tokens: 9, input_tokens_details: { cached_tokens: 0 } });
});

test("known usage sums all attempts even when a draft is rejected, without claiming unknown usage is zero", () => {
  const execution = summarizeAIExecution([
    { stage: "initial", outcome: "completed", usage: { input_tokens: 100, output_tokens: 30, total_tokens: 130, input_tokens_details: { cached_tokens: 80 } } },
    { stage: "revision", outcome: "incomplete_response", usage: { input_tokens: 120, output_tokens: 50, total_tokens: 170, output_tokens_details: { reasoning_tokens: 40 } } },
    { stage: "revision", outcome: "timeout", usage: null },
  ], 9000);
  assert.equal(execution.attemptCount, 3);
  assert.equal(execution.reportedAttempts, 2);
  assert.equal(execution.unknownAttempts, 1);
  assert.equal(execution.usageCoverage, "partial");
  assert.deepEqual(execution.knownUsage, { input_tokens: 220, output_tokens: 80, total_tokens: 300,
    input_tokens_details: { cached_tokens: 80 }, output_tokens_details: { reasoning_tokens: 40 } });
});

test("no request, unknown usage and a complete measured zero are distinct", () => {
  assert.equal(summarizeAIExecution([]).usageCoverage, "not_requested");
  const unknown = summarizeAIExecution([{ stage: "initial", outcome: "http_error" }]);
  assert.equal(unknown.knownUsage, null);
  assert.equal(unknown.usageCoverage, "unknown");
  const measured = summarizeAIExecution([{ stage: "initial", outcome: "completed", usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } }]);
  assert.equal(measured.usageCoverage, "complete");
  assert.deepEqual(measured.knownUsage, { input_tokens: 0, output_tokens: 0, total_tokens: 0 });
});

test("the log schema discards arbitrary values, identifiers and forged aggregates", () => {
  const cleaned = sanitizeAIExecution({ attemptCount: 42, knownUsage: { input_tokens: 100000 }, private: "secret",
    attempts: [{ stage: "initial", outcome: "completed", httpStatus: 200, durationMs: 25, body: "private", requestId: "secret",
      usage: { total_tokens: 15, input_tokens: "private", output_tokens_details: { reasoning_tokens: 3, content: "private" } } }] });
  assert.equal(cleaned.attemptCount, 1);
  assert.equal(cleaned.usageCoverage, "partial");
  assert.equal(cleaned.knownUsage.total_tokens, 15);
  assert.doesNotMatch(JSON.stringify(cleaned), /secret|private|100000|requestId/);
  assert.equal(sanitizeAIExecution("private"), null);
});

test("bounded telemetry declares omitted attempts and remains honest after log sanitization", () => {
  const execution = summarizeAIExecution(Array.from({ length: 21 }, () => ({ stage: "initial", outcome: "completed",
    usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } })));
  assert.equal(execution.omittedAttempts, 1);
  assert.equal(execution.usageCoverage, "partial");
  assert.deepEqual(sanitizeAIExecution(execution), execution);
});
