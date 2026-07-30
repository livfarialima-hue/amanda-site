import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GUARD_DELAY_MS,
  guardAutomaticReplyAgainstHumanRace,
  guardBookedAppointmentReplyAgainstHumanRace,
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

test("booking confirmation may continue after an unchanged earlier human offer", async () => {
  const baselineControl = {
    status: "human_active",
    generation: "offer-message",
    updatedAt: "2026-07-29T14:00:00.000Z",
  };
  const result =
    await guardBookedAppointmentReplyAgainstHumanRace(
      {
        phone: "+5511900000000",
        baselineControl,
      },
      {
        waitImpl: async () => {},
        getHumanResumeControlImpl: async () => ({
          ...baselineControl,
        }),
      },
    );

  assert.equal(result.shouldSend, true);
  assert.equal(result.humanChanged, false);
});

test("a new human message cancels the automatic booking confirmation", async () => {
  const result =
    await guardBookedAppointmentReplyAgainstHumanRace(
      {
        phone: "+5511900000000",
        baselineControl: {
          status: "human_active",
          generation: "offer-message",
          updatedAt: "2026-07-29T14:00:00.000Z",
        },
      },
      {
        waitImpl: async () => {},
        getHumanResumeControlImpl: async () => ({
          status: "human_active",
          generation: "new-human-reply",
          updatedAt: "2026-07-29T14:02:00.000Z",
        }),
      },
    );

  assert.equal(result.shouldSend, false);
  assert.equal(result.humanChanged, true);
});
