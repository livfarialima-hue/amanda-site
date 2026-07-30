import assert from "node:assert/strict";
import test from "node:test";
import { supersedePendingReplyForIgnoredInbound } from "../ycloud-webhook.mjs";
import {
  checkLatestInboundReply,
  markLatestInboundForReply,
} from "./reply-debounce.mjs";

function fakeBlobs() {
  let value = null;
  const store = {
    async setJSON(_key, nextValue) {
      value = structuredClone(nextValue);
    },
    async get() {
      return value ? structuredClone(value) : null;
    },
  };

  return {
    getStoreImpl: () => store,
  };
}

test("an ignored acknowledgment cancels the older reply still being prepared", async () => {
  const blobs = fakeBlobs();
  const phone = "+5511900000000";

  await markLatestInboundForReply(
    { phone, eventId: "clarification-event" },
    blobs,
  );

  const ignoredMarker =
    await supersedePendingReplyForIgnoredInbound(
      {
        phone,
        eventId: "acknowledgment-event",
        messageType: "text",
        text: "Ok",
      },
      {
        markLatestInboundForReplyImpl: (input) =>
          markLatestInboundForReply(input, blobs),
      },
    );

  const olderReply = await checkLatestInboundReply(
    {
      phone,
      eventId: "clarification-event",
      markerStatus: "completed",
    },
    blobs,
  );
  const acknowledgment = await checkLatestInboundReply(
    {
      phone,
      eventId: "acknowledgment-event",
      markerStatus: ignoredMarker.status,
    },
    blobs,
  );

  assert.equal(ignoredMarker.status, "completed");
  assert.equal(olderReply.shouldProcess, false);
  assert.equal(acknowledgment.shouldProcess, true);
});

test("non-text ignored events do not replace the active text marker", async () => {
  let calls = 0;
  const result = await supersedePendingReplyForIgnoredInbound(
    {
      phone: "+5511900000000",
      eventId: "image-event",
      messageType: "image",
      text: "",
    },
    {
      markLatestInboundForReplyImpl: async () => {
        calls += 1;
        return { status: "completed" };
      },
    },
  );

  assert.deepEqual(result, { status: "skipped" });
  assert.equal(calls, 0);
});
