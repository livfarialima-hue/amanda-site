import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOperationalLogRecord as buildWebhookLog,
} from "../ycloud-webhook.mjs";
import {
  buildOperationalLogRecord as buildHumanResumeLog,
} from "../human-resume.mjs";
import {
  buildOperationalLogRecord as buildRecoveryLog,
} from "../ycloud-recovery.mjs";
import { attributionClaimantId } from "./operational-log.mjs";

const BUILDERS = [
  ["webhook", buildWebhookLog],
  ["human resume", buildHumanResumeLog],
  ["recovery", buildRecoveryLog],
];

const TEST_ENV = {
  LOG_CORRELATION_SECRET: "test-only-correlation-secret",
  LOG_CORRELATION_KEY_VERSION: "k7",
};

test("attribution claimant is opaque, deterministic and domain separated", () => {
  const first = attributionClaimantId("provider-event-sensitive-123", TEST_ENV);
  const repeated = attributionClaimantId("provider-event-sensitive-123", TEST_ENV);
  const different = attributionClaimantId("another-event", TEST_ENV);
  assert.match(first, /^C1_[A-Za-z0-9_-]{43}$/);
  assert.equal(first, repeated);
  assert.notEqual(first, different);
  assert.doesNotMatch(first, /provider-event-sensitive/);
  assert.equal(attributionClaimantId("provider-event-sensitive-123", {}), "");
});

for (const [label, buildLog] of BUILDERS) {
  test(`${label} operational logs use deterministic versioned HMAC correlation`, () => {
    const common = {
      source: "test_source",
      category: "test_category",
      reason: "completed",
      sourceId: "provider-event-sensitive-123",
      loggedAt: "2026-08-15T12:00:00.000Z",
      env: TEST_ENV,
    };
    const first = buildLog(common);
    const repeated = buildLog(common);
    const different = buildLog({ ...common, sourceId: "another-event" });

    assert.match(first.correlationId, /^lc1-k7-[a-f0-9]{24}$/);
    assert.equal(first.correlationId, repeated.correlationId);
    assert.notEqual(first.correlationId, different.correlationId);
    assert.equal(first.loggedAt, "2026-08-15T12:00:00.000Z");
    assert.equal(first.category, "test_category");
    assert.equal(first.reason, "completed");
    assert.doesNotMatch(JSON.stringify(first), /provider-event-sensitive-123/);
  });

  test(`${label} operational logs fail closed without a correlation secret`, () => {
    const record = buildLog({
      source: "test_source",
      category: "test_category",
      reason: "failed",
      sourceId: "raw-event-must-not-appear",
      loggedAt: "2026-08-15T12:00:00.000Z",
      env: {},
    });

    assert.equal(record.correlationId, "lc1-k1-unavailable");
    assert.doesNotMatch(JSON.stringify(record), /raw-event-must-not-appear/);
  });

  test(`${label} operational logs recursively remove identifiers and clinical content`, () => {
    const record = buildLog({
      source: "test_source",
      category: "test_category",
      reason: "processed",
      sourceId: "raw-provider-event",
      loggedAt: "2026-08-15T12:00:00.000Z",
      env: TEST_ENV,
      fields: {
        status: "completed",
        jobs: 1,
        patientLast4: "6789",
        senderLast4: "6789",
        eventId: "raw-provider-event",
        messageId: "raw-provider-message",
        providerId: "raw-provider-id",
        internalTraceId: "raw-internal-id",
        procedure: "sensitive-procedure",
        messageText: "sensitive message content",
        nested: [{
          status: "completed",
          phone: "+5511999999999",
          suggestedReply: "sensitive reply",
        }],
      },
    });
    const serialized = JSON.stringify(record);

    assert.equal(record.status, "completed");
    assert.equal(record.jobs, 1);
    assert.deepEqual(record.nested, [{ status: "completed" }]);
    for (const forbidden of [
      "6789",
      "raw-provider-event",
      "raw-provider-message",
      "raw-provider-id",
      "raw-internal-id",
      "sensitive-procedure",
      "sensitive message content",
      "+5511999999999",
      "sensitive reply",
    ]) {
      assert.doesNotMatch(serialized, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  test(`${label} operational logs preserve the canonical envelope`, () => {
    const record = buildLog({
      source: "canonical_source",
      category: "canonical_category",
      reason: "canonical_reason",
      sourceId: "raw-provider-event",
      loggedAt: "2026-08-15T12:00:00.000Z",
      env: TEST_ENV,
      fields: {
        source: "spoofed_source",
        category: "spoofed_category",
        reason: "spoofed_reason",
        loggedAt: "1999-01-01T00:00:00.000Z",
        correlationId: "spoofed-correlation",
      },
    });

    assert.equal(record.source, "canonical_source");
    assert.equal(record.category, "canonical_category");
    assert.equal(record.reason, "canonical_reason");
    assert.equal(record.loggedAt, "2026-08-15T12:00:00.000Z");
    assert.match(record.correlationId, /^lc1-k7-[a-f0-9]{24}$/);
  });
}
