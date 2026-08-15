import assert from "node:assert/strict";
import test from "node:test";
import {
  settleDeferredInboundRecovery,
  shouldAwaitActiveReplyBeforeAcknowledgement,
  shouldCompleteInboundRecovery,
  shouldSuppressExactInboundDuplicate,
} from "./inbound-recovery.mjs";

test("exact webhook retry does not discard pending durable recovery", () => {
  assert.equal(
    shouldCompleteInboundRecovery({
      automaticWorkFinished: true,
      suppressExactDuplicate: true,
      recoveryRegistration: {
        status: "duplicate",
        reason: "already_pending",
      },
    }),
    false,
  );
});

test("already completed duplicate remains terminal", () => {
  assert.equal(
    shouldCompleteInboundRecovery({
      automaticWorkFinished: true,
      suppressExactDuplicate: true,
      recoveryRegistration: {
        status: "duplicate",
        reason: "already_completed",
      },
    }),
    true,
  );
});

test("unfinished automatic work always keeps recovery pending", () => {
  assert.equal(
    shouldCompleteInboundRecovery({
      automaticWorkFinished: false,
      suppressExactDuplicate: false,
      recoveryRegistration: { status: "completed" },
    }),
    false,
  );
});

test("an exact provider retry is processed while automatic work is pending", () => {
  assert.equal(
    shouldSuppressExactInboundDuplicate({
      exactMessageDuplicate: true,
      recoveredExactDuplicate: false,
      durableRetry: false,
      recoveryRegistration: {
        status: "duplicate",
        reason: "already_pending",
      },
    }),
    false,
  );
});

test("an exact provider retry is silenced only after durable completion", () => {
  assert.equal(
    shouldSuppressExactInboundDuplicate({
      exactMessageDuplicate: true,
      recoveredExactDuplicate: false,
      durableRetry: false,
      recoveryRegistration: {
        status: "duplicate",
        reason: "already_completed",
      },
    }),
    true,
  );
});

test("a storage failure never turns a duplicate inbound into a silent miss", () => {
  assert.equal(
    shouldSuppressExactInboundDuplicate({
      exactMessageDuplicate: true,
      recoveredExactDuplicate: false,
      durableRetry: false,
      recoveryRegistration: {
        status: "failed",
        reason: "storage_failed",
      },
    }),
    false,
  );
});

test("a deterministic campaign opening finishes before webhook acknowledgement", () => {
  assert.equal(
    shouldAwaitActiveReplyBeforeAcknowledgement({
      deterministicReply: true,
      recoveryRegistration: { status: "completed" },
    }),
    true,
  );
});

test("missing durable storage forces the active reply into the request lifecycle", () => {
  assert.equal(
    shouldAwaitActiveReplyBeforeAcknowledgement({
      deterministicReply: false,
      recoveryRegistration: { status: "failed" },
    }),
    true,
  );
});

test("ordinary AI work may be deferred when durable recovery is registered", () => {
  assert.equal(
    shouldAwaitActiveReplyBeforeAcknowledgement({
      deterministicReply: false,
      recoveryRegistration: { status: "completed" },
    }),
    false,
  );
});

test("successful deferred work closes the durable recovery immediately", async () => {
  let completedEventId = "";
  const result = await settleDeferredInboundRecovery(
    Promise.resolve({ status: "completed", replySent: true }),
    {
      eventId: "deferred-success",
      completeInboundRecoveryImpl: async (job) => {
        completedEventId = job.eventId;
        return { status: "completed" };
      },
    },
  );

  assert.equal(completedEventId, "deferred-success");
  assert.equal(result.status, "completed");
  assert.equal(result.replySent, true);
  assert.equal(result.recoveryStatus, "completed");
});

test("failed deferred work stays pending for the scheduled recovery", async () => {
  let completed = false;
  const result = await settleDeferredInboundRecovery(
    Promise.resolve({ status: "failed", replySent: false }),
    {
      eventId: "deferred-failure",
      completeInboundRecoveryImpl: async () => {
        completed = true;
        return { status: "completed" };
      },
    },
  );

  assert.equal(completed, false);
  assert.equal(result.status, "failed");
  assert.equal(result.recoveryStatus, "pending");
});

test("a rejected deferred task stays pending without an unhandled rejection", async () => {
  const result = await settleDeferredInboundRecovery(
    Promise.reject(new Error("simulated worker interruption")),
    {
      eventId: "deferred-rejection",
      completeInboundRecoveryImpl: async () => {
        throw new Error("must not complete");
      },
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "deferred_work_rejected");
  assert.equal(result.recoveryStatus, "pending");
});
