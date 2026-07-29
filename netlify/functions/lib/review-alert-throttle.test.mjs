import assert from "node:assert/strict";
import test from "node:test";
import {
  claimReviewAlertSlot,
  completeReviewAlertSlot,
  releaseReviewAlertSlot,
} from "./review-alert-throttle.mjs";

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

test("allows one alert per patient during the cooldown window", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const start = Date.parse("2026-07-29T14:00:00.000Z");

  const first = await claimReviewAlertSlot(
    {
      patientPhone: "+5511900000000",
      eventId: "event-1",
    },
    { getStoreImpl, now: start },
  );
  assert.equal(first.status, "claimed");

  await completeReviewAlertSlot(first, {
    getStoreImpl,
    now: start,
  });

  const repeated = await claimReviewAlertSlot(
    {
      patientPhone: "+5511900000000",
      eventId: "event-2",
    },
    {
      getStoreImpl,
      now: start + 12 * 60 * 1_000,
    },
  );
  assert.deepEqual(repeated, {
    status: "suppressed",
    reason: "same_patient_cooldown",
  });

  const otherPatient = await claimReviewAlertSlot(
    {
      patientPhone: "+5511911111111",
      eventId: "event-3",
    },
    {
      getStoreImpl,
      now: start + 12 * 60 * 1_000,
    },
  );
  assert.equal(otherPatient.status, "claimed");

  const afterCooldown = await claimReviewAlertSlot(
    {
      patientPhone: "+5511900000000",
      eventId: "event-4",
    },
    {
      getStoreImpl,
      now: start + 31 * 60 * 1_000,
    },
  );
  assert.equal(afterCooldown.status, "claimed");
});

test("allows only one simultaneous claim for the same patient", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-29T14:00:00.000Z");

  const claims = await Promise.all([
    claimReviewAlertSlot(
      {
        patientPhone: "+5511900000000",
        eventId: "event-1",
      },
      { getStoreImpl, now },
    ),
    claimReviewAlertSlot(
      {
        patientPhone: "+5511900000000",
        eventId: "event-2",
      },
      { getStoreImpl, now },
    ),
  ]);

  assert.deepEqual(
    claims.map((claim) => claim.status).sort(),
    ["claimed", "suppressed"],
  );
});

test("releases a failed delivery so the next alert can proceed", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-29T14:00:00.000Z");

  const first = await claimReviewAlertSlot(
    {
      patientPhone: "+5511900000000",
      eventId: "event-1",
    },
    { getStoreImpl, now },
  );
  assert.equal(first.status, "claimed");
  assert.equal(
    (
      await releaseReviewAlertSlot(first, {
        getStoreImpl,
      })
    ).status,
    "completed",
  );

  const retry = await claimReviewAlertSlot(
    {
      patientPhone: "+5511900000000",
      eventId: "event-2",
    },
    { getStoreImpl, now: now + 1_000 },
  );
  assert.equal(retry.status, "claimed");
});
