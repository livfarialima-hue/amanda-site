// Numeric inference evidence only. Missing usage is unknown, never zero cost.
const STAGES = new Set(["initial", "revision"]);
const OUTCOMES = new Set(["completed", "incomplete_response", "invalid_response", "http_error", "timeout", "request_failed"]);
const COUNTERS = ["input_tokens", "output_tokens", "total_tokens"];
const DETAILS = [["input_tokens_details", "cached_tokens"], ["output_tokens_details", "reasoning_tokens"]];

function count(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function normalizeAIUsage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const usage = {};
  for (const key of COUNTERS) if (count(value[key])) usage[key] = value[key];
  for (const [group, key] of DETAILS) {
    if (count(value[group]?.[key])) usage[group] = { [key]: value[group][key] };
  }
  return Object.keys(usage).length ? usage : null;
}

function normalizeAttempt(value) {
  if (!value || !STAGES.has(value.stage) || !OUTCOMES.has(value.outcome)) return null;
  return {
    stage: value.stage,
    outcome: value.outcome,
    ...(count(value.durationMs) ? { durationMs: value.durationMs } : {}),
    ...(Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599 ? { httpStatus: value.httpStatus } : {}),
    usage: normalizeAIUsage(value.usage),
  };
}

function sumKnown(attempts) {
  const combined = {};
  const sum = values => {
    if (!values.length) return null;
    const total = values.reduce((left, right) => left + right, 0);
    return count(total) ? total : null;
  };
  for (const key of COUNTERS) {
    const total = sum(attempts.map(attempt => attempt.usage?.[key]).filter(count));
    if (total !== null) combined[key] = total;
  }
  for (const [group, key] of DETAILS) {
    const total = sum(attempts.map(attempt => attempt.usage?.[group]?.[key]).filter(count));
    if (total !== null) combined[group] = { [key]: total };
  }
  return Object.keys(combined).length ? combined : null;
}

// Also used by the log sanitizer: rebuild this closed schema instead of
// permitting arbitrary fields whose names happen to look like usage counters.
export function summarizeAIExecution(values, durationMs) {
  const source = Array.isArray(values) ? values : [];
  const attempts = source.slice(0, 20).map(normalizeAttempt).filter(Boolean);
  const omittedAttempts = source.length - attempts.length;
  const reportedAttempts = attempts.filter(attempt => attempt.usage !== null).length;
  const completeAttempts = attempts.filter(attempt => COUNTERS.every(key => count(attempt.usage?.[key]))).length;
  const knownUsage = sumKnown(attempts);
  return {
    version: 1,
    attemptCount: attempts.length,
    omittedAttempts,
    reportedAttempts,
    unknownAttempts: attempts.length - reportedAttempts,
    usageCoverage: omittedAttempts ? "partial" : !attempts.length ? "not_requested" : completeAttempts === attempts.length && COUNTERS.every(key => count(knownUsage?.[key])) ? "complete" : reportedAttempts ? "partial" : "unknown",
    ...(count(durationMs) ? { durationMs } : {}),
    knownUsage,
    attempts,
  };
}

export function sanitizeAIExecution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.attempts)) return null;
  const execution = summarizeAIExecution(value.attempts, value.durationMs);
  if (count(value.omittedAttempts) && value.omittedAttempts > 0) {
    const omitted = execution.omittedAttempts + value.omittedAttempts;
    execution.omittedAttempts = count(omitted) ? omitted : Number.MAX_SAFE_INTEGER;
    execution.usageCoverage = "partial";
  }
  return execution;
}
