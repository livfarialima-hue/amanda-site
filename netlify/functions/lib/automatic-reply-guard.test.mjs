import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GUARD_DELAY_MS,
  guardAutomaticReplyAgainstHumanRace,
} from "./automatic-reply-guard.mjs";

test("a human reply arriving while AI prepares cancels the automatic send", async () => {
  let waited = 0;
  const result = await guardAutomaticReplyAgainstHumanRace(
    {
      phone: "+5511900000000",
    },
    {
      waitImpl: async (milliseconds) => {
        waited = milliseconds;
      },
      getHumanResumeControlImpl: async () => ({
        status: "human_active",
      }),
    },
  );

  assert.equal(waited, DEFAULT_GUARD_DELAY_MS);
  assert.equal(result.shouldSend, false);
  assert.equal(result.humanActive, true);
  assert.equal(result.controlStatus, "human_active");
});

test("the guard allows the reply when no human took over", async () => {
  const result = await guardAutomaticReplyAgainstHumanRace(
    {
      phone: "+5511900000000",
      configuredDelayMs: 800,
    },
    {
      waitImpl: async () => {},
      getHumanResumeControlImpl: async () => ({
        status: "bruna_resumed",
      }),
    },
  );

  assert.equal(result.shouldSend, true);
  assert.equal(result.humanActive, false);
  assert.equal(result.delayMs, 800);
});
