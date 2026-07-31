import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLatestInboundReply,
  DEFAULT_DEBOUNCE_MS,
  getLatestInboundReplyMarker,
  markLatestInboundForReply,
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
  const first = await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-1" },
    blobs,
  );
  const second = await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-2" },
    blobs,
  );
  const options = {
    ...blobs,
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
  assert.equal(secondResult.delayMs, 30_000);
});

test("default quiet window fits inside the synchronous execution limit", () => {
  assert.equal(DEFAULT_DEBOUNCE_MS, 30_000);
});

test("an earlier burst event exits on the first superseded check", async () => {
  const blobs = fakeBlobs();
  const first = await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-1" },
    blobs,
  );
  await markLatestInboundForReply(
    { phone: "+5511900000000", eventId: "evt-2" },
    blobs,
  );
  const waits = [];

  const result = await waitForLatestInboundReply(
    {
      phone: "+5511900000000",
      eventId: "evt-1",
      markerStatus: first.status,
    },
    {
      ...blobs,
      waitImpl: async (delayMs) => waits.push(delayMs),
    },
  );

  assert.equal(result.shouldProcess, false);
  assert.deepEqual(waits, [5_000]);
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
