import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppointmentReviewUrl,
  createAppointmentReview,
  getAppointmentReview,
  verifyAppointmentReviewToken,
} from "./appointment-review-store.mjs";
import { handleAppointmentReview } from "../appointment-review.mjs";

function memoryStore() {
  const values = new Map();
  return {
    async setJSON(key, value) {
      values.set(key, structuredClone(value));
    },
    async get(key) {
      return values.has(key) ? structuredClone(values.get(key)) : null;
    },
  };
}

const APPOINTMENT = {
  appointmentId: "manual-review-1",
  eventId: "event-1",
  phone: "+5511900001234",
  name: "Maria Silva",
  professional: "Dra. Amanda",
  scheduledDate: "2026-08-10",
  scheduledTime: "10:00",
};

test("creates an opaque signed review link and verifies it", async () => {
  const backing = memoryStore();
  const env = {
    GOOGLE_SHEETS_WEBHOOK_SECRET: "review-secret",
    URL: "https://example.com",
  };
  const review = await createAppointmentReview(APPOINTMENT, {
    env,
    getStoreImpl: () => backing,
    now: 1_000,
    ttlMs: 60_000,
    id: "review-id",
  });
  const url = buildAppointmentReviewUrl(review, { env });

  assert.equal(review.ok, true);
  assert.match(url, /id=review-id/);
  assert.doesNotMatch(url, /5511900001234|Maria/);
  assert.equal(
    verifyAppointmentReviewToken(
      {
        id: review.id,
        expiresAt: review.expiresAt,
        signature: review.signature,
      },
      { env, now: 2_000 },
    ).ok,
    true,
  );
  assert.equal(
    (await getAppointmentReview("review-id", {
      getStoreImpl: () => backing,
    }))?.appointment?.scheduledTime,
    "10:00",
  );
});

test("GET only displays the review and POST performs the reservation", async () => {
  const env = {
    GOOGLE_SHEETS_WEBHOOK_SECRET: "review-secret",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://script.example.com/webhook",
  };
  const review = {
    id: "review-id",
    status: "pending",
    appointment: APPOINTMENT,
  };
  const token = {
    id: "review-id",
    expiresAt: String(Date.now() + 60_000),
    signature: "signature",
  };
  let fetchCalls = 0;
  const fetchBodies = [];
  const updates = [];
  const dependencies = {
    env,
    fetchImpl: async (_url, options) => {
      fetchCalls += 1;
      const body = JSON.parse(options.body);
      fetchBodies.push(body);
      if (body.action === "reserve_appointment_slot") {
        return new Response(
          JSON.stringify({ ok: true, reserved: true }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, sent: true }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
    verifyTokenImpl: () => ({ ok: true, id: "review-id" }),
    getAppointmentReviewImpl: async () => review,
    updateAppointmentReviewImpl: async (_id, patch) => {
      updates.push(patch);
      return { ...review, ...patch };
    },
  };
  const query = new URLSearchParams({
    id: token.id,
    exp: token.expiresAt,
    sig: token.signature,
  });
  const getResponse = await handleAppointmentReview(
    new Request(`https://example.com/review?${query}`),
    dependencies,
  );

  assert.equal(getResponse.status, 200);
  assert.equal(fetchCalls, 0);
  assert.match(await getResponse.text(), /Confirmar e atualizar agenda/);

  const form = new URLSearchParams({
    id: token.id,
    exp: token.expiresAt,
    sig: token.signature,
    action: "confirm",
  });
  const postResponse = await handleAppointmentReview(
    new Request("https://example.com/review", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    }),
    dependencies,
  );

  assert.equal(postResponse.status, 200);
  assert.equal(fetchCalls, 2);
  assert.equal(
    fetchBodies[0].appointment.humanConfirmed,
    true,
  );
  assert.equal(updates[0].status, "approved");
  assert.match(await postResponse.text(), /agenda foi atualizada/);
});

test("POST keeps the review pending when Sala 1 already has another appointment", async () => {
  const env = {
    GOOGLE_SHEETS_WEBHOOK_SECRET: "review-secret",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://script.example.com/webhook",
  };
  const review = {
    id: "room-conflict-review",
    status: "pending",
    appointment: APPOINTMENT,
  };
  const updates = [];
  const form = new URLSearchParams({
    id: review.id,
    exp: String(Date.now() + 60_000),
    sig: "signature",
    action: "confirm",
  });
  const response = await handleAppointmentReview(
    new Request("https://example.com/review", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    }),
    {
      env,
      verifyTokenImpl: () => ({ ok: true, id: review.id }),
      getAppointmentReviewImpl: async () => review,
      updateAppointmentReviewImpl: async (_id, patch) => {
        updates.push(patch);
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ ok: false, error: "room_not_available" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    },
  );

  assert.equal(response.status, 409);
  assert.equal(updates.length, 0);
  assert.match(await response.text(), /outro compromisso na Sala 1/);
});

test("a legacy review without a name recovers it from LEADS before display", async () => {
  const env = {
    GOOGLE_SHEETS_WEBHOOK_SECRET: "review-secret",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://script.example.com/webhook",
  };
  const review = {
    id: "legacy-review-id",
    status: "pending",
    appointment: { ...APPOINTMENT, name: "" },
  };
  const updates = [];
  const fetchBodies = [];
  const response = await handleAppointmentReview(
    new Request(
      "https://example.com/review?id=legacy-review-id&exp=123&sig=signed",
    ),
    {
      env,
      verifyTokenImpl: () => ({ ok: true, id: "legacy-review-id" }),
      getAppointmentReviewImpl: async () => review,
      updateAppointmentReviewImpl: async (_id, patch) => {
        updates.push(patch);
        return { ...review, ...patch };
      },
      fetchImpl: async (_url, options) => {
        const body = JSON.parse(options.body);
        fetchBodies.push(body);
        return new Response(
          JSON.stringify({
            ok: true,
            relationship: {
              found: false,
              patientName: "Mariana Alves de Souza Lima",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  );

  assert.equal(response.status, 200);
  assert.match(await response.text(), /Mariana Alves de Souza Lima/);
  assert.equal(fetchBodies.length, 1);
  assert.equal(fetchBodies[0].action, "get_patient_relationship");
  assert.deepEqual(fetchBodies[0].patient, {
    phone: APPOINTMENT.phone,
    professional: "amanda",
    includeIdentity: true,
  });
  assert.equal(
    updates[0].appointment.name,
    "Mariana Alves de Souza Lima",
  );
});
