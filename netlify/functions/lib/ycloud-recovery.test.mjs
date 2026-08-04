import assert from "node:assert/strict";
import test from "node:test";
import {
  processInboundRecoveryJob,
} from "../ycloud-recovery.mjs";

test("recovery remains pending until the lead reaches Sheets", async () => {
  let completed = false;
  let rescheduled = false;

  const result = await processInboundRecoveryJob(
    {
      eventId: "fallback-event",
      phone: "+5511976360209",
      attempts: 1,
      rawBody: "{}",
      signature: "signature",
      contentType: "application/json",
      origin: "https://example.test",
      queueKey: "pending/fallback-event",
      claimToken: "claim-token",
    },
    {
      getLatestInboundReplyMarkerImpl: async () => ({
        status: "completed",
        found: true,
        eventId: "fallback-event",
      }),
      processImpl: async () =>
        new Response(
          JSON.stringify({
            received: true,
            leadRecorded: false,
            degradedMode: "sheets_delivery_fallback",
            aiActiveStatus: "completed",
          }),
          { status: 200 },
        ),
      completeInboundRecoveryImpl: async () => {
        completed = true;
        return { status: "completed" };
      },
      rescheduleInboundRecoveryImpl: async () => {
        rescheduled = true;
        return { status: "completed" };
      },
      sendYCloudReviewAlertImpl: async () => ({
        status: "completed",
      }),
    },
  );

  assert.equal(result.status, "rescheduled");
  assert.equal(completed, false);
  assert.equal(rescheduled, true);
});
