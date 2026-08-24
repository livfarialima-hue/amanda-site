import assert from "node:assert/strict";
import test from "node:test";
import {
  claimPatientReplySlot,
  completePatientReplySlot,
  releasePatientReplySlot,
} from "./patient-reply-throttle.mjs";

function memoryStore() {
  const values = new Map();
  let revision = 0;

  return {
    async get(key) {
      return values.has(key)
        ? structuredClone(values.get(key).data)
        : null;
    },
    async getWithMetadata(key) {
      const value = values.get(key);
      return value
        ? {
            data: structuredClone(value.data),
            etag: value.etag,
            metadata: {},
          }
        : null;
    },
    async setJSON(key, data, options = {}) {
      const current = values.get(key);
      if (options.onlyIfNew && current) {
        return { modified: false };
      }
      if (
        options.onlyIfMatch &&
        current?.etag !== options.onlyIfMatch
      ) {
        return { modified: false };
      }

      revision += 1;
      const etag = `etag-${revision}`;
      values.set(key, {
        data: structuredClone(data),
        etag,
      });
      return { modified: true, etag };
    },
    async delete(key) {
      values.delete(key);
    },
  };
}

test("allows only one simultaneous acknowledgement for a media burst", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-08-24T08:47:06-03:00");

  const claims = await Promise.all([
    claimPatientReplySlot(
      {
        phone: "+5511900000001",
        family: "image_acknowledgement",
        eventId: "synthetic-image-1",
      },
      { getStoreImpl, now },
    ),
    claimPatientReplySlot(
      {
        phone: "+5511900000001",
        family: "image_acknowledgement",
        eventId: "synthetic-image-2",
      },
      { getStoreImpl, now },
    ),
    claimPatientReplySlot(
      {
        phone: "+5511900000001",
        family: "image_acknowledgement",
        eventId: "synthetic-image-3",
      },
      { getStoreImpl, now },
    ),
  ]);

  assert.deepEqual(
    claims.map((claim) => claim.status).sort(),
    ["claimed", "suppressed", "suppressed"],
  );
});

test("keeps the image acknowledgement suppressed during the cooldown", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-08-24T08:47:06-03:00");
  const first = await claimPatientReplySlot(
    {
      phone: "+5511900000001",
      family: "image_acknowledgement",
      eventId: "synthetic-image-1",
    },
    { getStoreImpl, now },
  );
  assert.equal(first.status, "claimed");
  assert.equal(
    (
      await completePatientReplySlot(first, {
        getStoreImpl,
        now,
      })
    ).status,
    "completed",
  );

  const repeated = await claimPatientReplySlot(
    {
      phone: "+5511900000001",
      family: "image_acknowledgement",
      eventId: "synthetic-image-2",
    },
    { getStoreImpl, now: now + 60_000 },
  );
  assert.deepEqual(repeated, {
    status: "suppressed",
    reason: "same_reply_family_cooldown",
  });
});

test("releases a failed acknowledgement so a later image may retry", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-08-24T08:47:06-03:00");
  const first = await claimPatientReplySlot(
    {
      phone: "+5511900000001",
      family: "image_acknowledgement",
      eventId: "synthetic-image-1",
    },
    { getStoreImpl, now },
  );
  assert.equal(first.status, "claimed");
  assert.equal(
    (
      await releasePatientReplySlot(first, {
        getStoreImpl,
      })
    ).status,
    "completed",
  );

  const retry = await claimPatientReplySlot(
    {
      phone: "+5511900000001",
      family: "image_acknowledgement",
      eventId: "synthetic-image-2",
    },
    { getStoreImpl, now: now + 1_000 },
  );
  assert.equal(retry.status, "claimed");
});
