import assert from "node:assert/strict";
import test from "node:test";
import {
  markLatestInboundForReply,
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
  assert.equal(secondResult.delayMs, 6_000);
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
