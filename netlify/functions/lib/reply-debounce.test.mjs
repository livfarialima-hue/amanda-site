import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLatestInboundReply,
  DEFAULT_AI_DEBOUNCE_MS,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_DETERMINISTIC_DEBOUNCE_MS,
  DEFAULT_MEDIA_DEBOUNCE_MS,
  getLatestInboundReplyMarker,
  markLatestInboundForReply,
  replyDebounceKindForInbound,
  shouldRecoverExactDuplicateRetry,
  waitForLatestInboundReply,
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

test("only the latest inbound event may answer after the quiet window", async () => {
  const blobs = fakeBlobs();
  const now = Date.parse("2026-08-14T10:35:00-03:00");
  const first = await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-1" },
    { ...blobs, now },
  );
  const second = await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-2" },
    { ...blobs, now },
  );
  const options = {
    ...blobs,
    now,
    waitImpl: async () => {},
  };
  const firstResult = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "evt-1",
      markerStatus: first.status,
      configuredDelayMs: 6_000,
    },
    options,
  );
  const secondResult = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "evt-2",
      markerStatus: second.status,
      configuredDelayMs: 6_000,
    },
    options,
  );

  assert.equal(firstResult.shouldProcess, false);
  assert.equal(secondResult.shouldProcess, true);
  assert.equal(secondResult.delayMs, 6_000);
});

test("default quiet windows are fast and bounded by reply type", () => {
  assert.equal(DEFAULT_DEBOUNCE_MS, 3_000);
  assert.equal(DEFAULT_DETERMINISTIC_DEBOUNCE_MS, 3_000);
  assert.equal(DEFAULT_AI_DEBOUNCE_MS, 5_000);
  assert.equal(DEFAULT_MEDIA_DEBOUNCE_MS, 5_000);
});

test("AI and media replies wait five seconds while deterministic replies wait three", async () => {
  const blobs = fakeBlobs();
  const now = Date.parse("2026-08-14T10:35:00-03:00");
  await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "typed-delay" },
    { ...blobs, now },
  );
  const waits = [];
  const options = {
    ...blobs,
    now,
    waitImpl: async (milliseconds) => waits.push(milliseconds),
  };
  const deterministic = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "typed-delay",
      markerStatus: "completed",
      replyKind: "deterministic",
    },
    options,
  );
  const ai = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "typed-delay",
      markerStatus: "completed",
      replyKind: "ai",
    },
    options,
  );
  const media = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "typed-delay",
      markerStatus: "completed",
      replyKind: "media",
    },
    options,
  );

  assert.equal(deterministic.delayMs, 3_000);
  assert.equal(ai.delayMs, 5_000);
  assert.equal(media.delayMs, 5_000);
  assert.deepEqual(waits, [3_000, 5_000, 5_000]);
});

test("image messages join the inbound reply debounce as media", () => {
  assert.equal(
    replyDebounceKindForInbound({ messageType: "image" }),
    "media",
  );
  assert.equal(
    replyDebounceKindForInbound({ messageType: "text" }),
    "deterministic",
  );
  assert.equal(
    replyDebounceKindForInbound({
      messageType: "unsupported",
      unsupportedInboundContent: true,
    }),
    "deterministic",
  );
  assert.equal(
    replyDebounceKindForInbound({ messageType: "video" }),
    "",
  );
});

test("a newer image burst supersedes the prior text turn", async () => {
  const blobs = fakeBlobs();
  const textAt = Date.parse("2026-08-24T08:46:01-03:00");
  await markLatestInboundForReply(
    {
      phone: "+5511900000000",
      eventId: "synthetic-text-before-images",
      eventAt: "2026-08-24T08:46:01-03:00",
      priority: 100,
    },
    { ...blobs, now: textAt },
  );
  const imageMarker = await markLatestInboundForReply(
    {
      phone: "+5511900000000",
      eventId: "synthetic-image-latest",
      eventAt: "2026-08-24T08:47:06-03:00",
      priority: 100,
    },
    { ...blobs, now: textAt + 65_000 },
  );
  const marker = await getLatestInboundReplyMarker(
    { phone: "+5511900000000" },
    blobs,
  );

  assert.equal(imageMarker.preserved, undefined);
  assert.equal(marker.eventId, "synthetic-image-latest");
});

test("slow lead routing consumes the quiet window instead of adding another delay", async () => {
  const blobs = fakeBlobs();
  const markedAt = Date.parse("2026-08-14T10:36:22-03:00");
  await markLatestInboundForReply(
    {
      phone: "+5511900000000",
      eventId: "slow-route-event",
      eventAt: "2026-08-14T10:36:22-03:00",
    },
    { ...blobs, now: markedAt },
  );
  let waitedFor = null;
  const result = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "slow-route-event",
      markerStatus: "completed",
      configuredDelayMs: 8_000,
    },
    {
      ...blobs,
      now: markedAt + 14_000,
      waitImpl: async (milliseconds) => {
        waitedFor = milliseconds;
      },
    },
  );

  assert.equal(result.shouldProcess, true);
  assert.equal(result.delayMs, 0);
  assert.equal(waitedFor, null);
});

test("a newer message arriving during generation supersedes the older reply", async () => {
  const blobs = fakeBlobs();
  const first = await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-1" },
    blobs,
  );

  await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-2" },
    blobs,
  );

  const firstAfterGeneration = await checkLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "evt-1",
      markerStatus: first.status,
    },
    blobs,
  );
  const secondAfterGeneration = await checkLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "evt-2",
      markerStatus: "completed",
    },
    blobs,
  );

  assert.equal(firstAfterGeneration.shouldProcess, false);
  assert.equal(secondAfterGeneration.shouldProcess, true);
});

test("a repeated low-priority entry template cannot supersede a recent patient question", async () => {
  const blobs = fakeBlobs();
  const now = Date.parse("2026-08-04T10:48:00-03:00");
  await markLatestInboundForReply(
    {
      phone: "+5511999913021",
      eventId: "amil-question",
      eventAt: "2026-08-04T10:45:10-03:00",
      priority: 100,
    },
    { ...blobs, now },
  );
  const repeatedTemplate = await markLatestInboundForReply(
    {
      phone: "+5511999913021",
      eventId: "site-template-again",
      eventAt: "2026-08-04T10:48:00-03:00",
      priority: 10,
    },
    { ...blobs, now: now + 1_000 },
  );
  const marker = await getLatestInboundReplyMarker(
    { phone: "+5511999913021" },
    blobs,
  );

  assert.equal(repeatedTemplate.preserved, true);
  assert.equal(marker.eventId, "amil-question");
});

test("an out-of-order older event cannot replace a newer inbound marker", async () => {
  const blobs = fakeBlobs();
  await markLatestInboundForReply(
    {
      phone: "+5511999913021",
      eventId: "newer-event",
      eventAt: "2026-08-04T10:48:00-03:00",
    },
    blobs,
  );
  const older = await markLatestInboundForReply(
    {
      phone: "+5511999913021",
      eventId: "older-event",
      eventAt: "2026-08-04T10:45:00-03:00",
    },
    blobs,
  );
  const marker = await getLatestInboundReplyMarker(
    { phone: "+5511999913021" },
    blobs,
  );

  assert.equal(older.preserved, true);
  assert.equal(marker.eventId, "newer-event");
});

test("a storage failure never loses the patient response", async () => {
  let waited = false;
  const result = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "evt-1",
      markerStatus: "failed",
    },
    {
      waitImpl: async () => {
        waited = true;
      },
    },
  );

  assert.equal(result.shouldProcess, true);
  assert.equal(result.status, "skipped");
  assert.equal(waited, false);
});

test("an exact duplicate retry is recovered when the first attempt never marked it", async () => {
  const blobs = fakeBlobs();
  const marker = await getLatestInboundReplyMarker(
    { phone: "+5511900000000" },
    blobs,
  );

  assert.equal(marker.status, "completed");
  assert.equal(marker.found, false);
  assert.equal(
    shouldRecoverExactDuplicateRetry({
      marker,
      eventId: "evt-retry",
      messageAt: "2026-07-27T21:58:00-03:00",
    }),
    true,
  );
});

test("an exact duplicate retry is suppressed after the event was marked", async () => {
  const blobs = fakeBlobs();
  await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-processed" },
    {
      ...blobs,
      now: Date.parse("2026-07-27T21:58:01-03:00"),
    },
  );
  const marker = await getLatestInboundReplyMarker(
    { phone: "+5511900000000" },
    blobs,
  );

  assert.equal(marker.found, true);
  assert.equal(marker.eventId, "evt-processed");
  assert.equal(
    shouldRecoverExactDuplicateRetry({
      marker,
      eventId: "evt-processed",
      messageAt: "2026-07-27T21:58:00-03:00",
    }),
    false,
  );
});

test("an older phone marker does not block recovery of a newer exact duplicate", async () => {
  const blobs = fakeBlobs();
  await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-older" },
    {
      ...blobs,
      now: Date.parse("2026-07-27T20:00:00-03:00"),
    },
  );
  const marker = await getLatestInboundReplyMarker(
    { phone: "+5511900000000" },
    blobs,
  );

  assert.equal(
    shouldRecoverExactDuplicateRetry({
      marker,
      eventId: "evt-newer",
      messageAt: "2026-07-27T21:58:00-03:00",
    }),
    true,
  );
});
