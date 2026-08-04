import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldCompleteInboundRecovery,
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
