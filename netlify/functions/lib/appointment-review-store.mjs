import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-appointment-reviews-v1";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

function reviewKey(id) {
  return `review:${String(id || "").trim()}`;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signatureFor(id, expiresAt, secret) {
  return createHmac("sha256", String(secret || ""))
    .update(`${id}.${expiresAt}`)
    .digest("base64url");
}

function normalizeAppointment(input = {}) {
  return {
    appointmentId: String(input.appointmentId || "").trim(),
    eventId: String(input.eventId || "").trim(),
    phone: String(input.phone || "").trim(),
    name: String(input.name || "").trim().slice(0, 120),
    professional:
      String(input.professional || "").trim() || "Dra. Amanda",
    consultationType:
      String(input.consultationType || "").trim() ||
      "Consulta presencial",
    topic: String(input.topic || "").trim().slice(0, 160),
    location:
      String(input.location || "").trim() ||
      "Clínica LIV Faria Lima",
    scheduledDate: String(input.scheduledDate || "").trim(),
    scheduledTime: String(input.scheduledTime || "").trim(),
    status: "Consulta agendada",
    source:
      String(input.source || "").trim() ||
      "WhatsApp — agendamento manual aprovado por e-mail",
    notes: String(input.notes || "").trim().slice(0, 500),
  };
}

export async function createAppointmentReview(
  input,
  {
    env = process.env,
    getStoreImpl = getStore,
    now = Date.now(),
    ttlMs = DEFAULT_TTL_MS,
    id = randomUUID(),
  } = {},
) {
  const secret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, errorCode: "configuration_missing" };
  }

  const appointment = normalizeAppointment(input);
  if (
    !appointment.phone ||
    !appointment.scheduledDate ||
    !appointment.scheduledTime
  ) {
    return { ok: false, errorCode: "invalid_appointment" };
  }

  const expiresAt = now + Math.max(60_000, Number(ttlMs) || DEFAULT_TTL_MS);
  const record = {
    id,
    status: "pending",
    createdAt: new Date(now).toISOString(),
    expiresAt,
    appointment,
  };
  await store(getStoreImpl).setJSON(reviewKey(id), record);

  return {
    ok: true,
    id,
    expiresAt,
    signature: signatureFor(id, expiresAt, secret),
    appointment,
  };
}

export function verifyAppointmentReviewToken(
  { id, expiresAt, signature },
  { env = process.env, now = Date.now() } = {},
) {
  const secret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const expiration = Number(expiresAt);
  if (!secret || !id || !Number.isFinite(expiration) || !signature) {
    return { ok: false, errorCode: "invalid_token" };
  }
  if (expiration < now) {
    return { ok: false, errorCode: "expired_token" };
  }
  const expected = signatureFor(id, expiration, secret);
  return safeEqual(expected, signature)
    ? { ok: true, id: String(id), expiresAt: expiration }
    : { ok: false, errorCode: "invalid_token" };
}

export async function getAppointmentReview(
  id,
  { getStoreImpl = getStore } = {},
) {
  const record = await store(getStoreImpl).get(reviewKey(id), {
    type: "json",
  });
  return record && typeof record === "object" ? record : null;
}

export async function updateAppointmentReview(
  id,
  patch,
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  const current = await getAppointmentReview(id, { getStoreImpl });
  if (!current) return null;
  const updated = {
    ...current,
    ...patch,
    updatedAt: new Date(now).toISOString(),
  };
  await store(getStoreImpl).setJSON(reviewKey(id), updated);
  return updated;
}

export function buildAppointmentReviewUrl(
  review,
  { env = process.env } = {},
) {
  if (!review?.ok) return "";
  const base = String(
    env.APPOINTMENT_REVIEW_BASE_URL ||
      env.URL ||
      "https://draamandaschroeder.com.br",
  ).replace(/\/$/, "");
  const query = new URLSearchParams({
    id: review.id,
    exp: String(review.expiresAt),
    sig: review.signature,
  });
  return `${base}/.netlify/functions/appointment-review?${query}`;
}
