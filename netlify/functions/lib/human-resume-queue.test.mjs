import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelPendingHumanResume,
  claimDueHumanResumes,
  completeHumanResume,
  getHumanResumeControl,
  markHumanTakeover,
  scheduleHumanResume,
} from "./human-resume-queue.mjs";

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
    async list({ prefix = "" } = {}) {
      return {
        blobs: [...values.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, value]) => ({
            key,
            etag: value.etag,
          })),
        directories: [],
      };
    },
  };
}

function sampleInput(overrides = {}) {
  return {
    phone: "+5511900000000",
    from: "+5511961957144",
    eventId: "patient-event-1",
    patientName: "Maria",
    text: "Como funciona a consulta?",
    messageType: "text",
    platform: "Meta",
    reference: "M26F01W-C06H01",
    procedure: "lifting_facial",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Olá, Maria. Como posso ajudar?",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Como funciona a consulta?",
      },
    ],
    receivedAt: "2026-07-28T15:00:00.000Z",
    ...overrides,
  };
}

test("queues the latest patient message for twenty minutes", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-28T15:00:00.000Z");

  await markHumanTakeover(
    {
      phone: "+5511900000000",
      eventId: "human-event-1",
      at: new Date(now).toISOString(),
    },
    { getStoreImpl, now },
  );
  const scheduled = await scheduleHumanResume(sampleInput(), {
    getStoreImpl,
    now,
  });

  assert.equal(scheduled.status, "scheduled");
  assert.equal(
    scheduled.dueAt,
    "2026-07-28T15:20:00.000Z",
  );
  assert.equal(
    (
      await claimDueHumanResumes({
        getStoreImpl,
        now: now + 19 * 60 * 1_000,
      })
    ).jobs.length,
    0,
  );

  const claim = await claimDueHumanResumes({
    getStoreImpl,
    now: now + 20 * 60 * 1_000,
  });
  assert.equal(claim.jobs.length, 1);
  assert.equal(claim.jobs[0].eventId, "patient-event-1");
});

test("a new human message cancels a queued resume", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-28T15:00:00.000Z");

  await markHumanTakeover(
    {
      phone: "+5511900000000",
      eventId: "human-event-1",
    },
    { getStoreImpl, now },
  );
  await scheduleHumanResume(sampleInput(), {
    getStoreImpl,
    now,
    delayMs: 1,
  });
  await markHumanTakeover(
    {
      phone: "+5511900000000",
      eventId: "human-event-2",
    },
    { getStoreImpl, now: now + 1 },
  );

  const claim = await claimDueHumanResumes({
    getStoreImpl,
    now: now + 2,
  });
  const control = await getHumanResumeControl(
    "+5511900000000",
    { getStoreImpl },
  );

  assert.equal(claim.jobs.length, 0);
  assert.equal(control.status, "human_active");
  assert.equal(control.generation, "human-event-2");
});

test("a newer patient closing cancels the older queued resume", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-28T15:00:00.000Z");

  await markHumanTakeover(
    {
      phone: "+5511900000000",
      eventId: "human-event-1",
    },
    { getStoreImpl, now },
  );
  await scheduleHumanResume(sampleInput(), {
    getStoreImpl,
    now,
    delayMs: 1,
  });
  const cancellation = await cancelPendingHumanResume(
    "+5511900000000",
    { getStoreImpl },
  );
  const claim = await claimDueHumanResumes({
    getStoreImpl,
    now: now + 2,
  });
  const control = await getHumanResumeControl(
    "+5511900000000",
    { getStoreImpl },
  );

  assert.equal(cancellation.status, "completed");
  assert.equal(claim.jobs.length, 0);
  assert.equal(control.status, "human_active");
});

test("successful automatic continuation releases the human block", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-28T15:00:00.000Z");

  await markHumanTakeover(
    {
      phone: "+5511900000000",
      eventId: "human-event-1",
    },
    { getStoreImpl, now },
  );
  await scheduleHumanResume(sampleInput(), {
    getStoreImpl,
    now,
    delayMs: 1,
  });
  const claim = await claimDueHumanResumes({
    getStoreImpl,
    now: now + 1,
  });
  const completion = await completeHumanResume(
    claim.jobs[0],
    {
      getStoreImpl,
      now: now + 2,
      controlStatus: "bruna_resumed",
    },
  );
  const control = await getHumanResumeControl(
    "+5511900000000",
    { getStoreImpl },
  );

  assert.equal(completion.status, "completed");
  assert.equal(control.status, "bruna_resumed");
});

test("queues a non-text message so it can alert the human later", async () => {
  const store = memoryStore();
  const getStoreImpl = () => store;
  const now = Date.parse("2026-07-28T15:00:00.000Z");

  await markHumanTakeover(
    {
      phone: "+5511900000000",
      eventId: "human-event-1",
    },
    { getStoreImpl, now },
  );
  const scheduled = await scheduleHumanResume(
    sampleInput({
      text: "",
      messageType: "image",
      eventId: "patient-image-1",
    }),
    {
      getStoreImpl,
      now,
      delayMs: 1,
    },
  );
  const claim = await claimDueHumanResumes({
    getStoreImpl,
    now: now + 1,
  });

  assert.equal(scheduled.status, "scheduled");
  assert.equal(claim.jobs.length, 1);
  assert.equal(claim.jobs[0].messageType, "image");
});
