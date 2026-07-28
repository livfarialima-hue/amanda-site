import { timingSafeEqual } from "node:crypto";
import {
  isAppointmentReminderConfigured,
  sendYCloudAppointmentReminder,
} from "./lib/ycloud-appointment-reminder.mjs";
import { getBusinessNumber } from "./lib/business-number-registry.mjs";

const TIMEZONE = "America/Sao_Paulo";
const ALLOWED_KINDS = new Set(["48h", "same_day"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function localHour(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Number(
    parts.find((part) => part.type === "hour")?.value,
  );
}

export function isAppointmentReminderWindow(
  date = new Date(),
) {
  const hour = localHour(date);
  return Number.isFinite(hour) && hour >= 9 && hour < 19;
}

function normalizePayload(value) {
  const body =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    appointmentId: String(body.appointmentId || "").trim(),
    reminderKind: String(body.reminderKind || "").trim(),
    patientPhone: String(body.patientPhone || "").trim(),
    patientName: String(body.patientName || "").trim(),
    professional: String(body.professional || "").trim(),
    appointmentDate: String(body.appointmentDate || "").trim(),
    appointmentTime: String(body.appointmentTime || "").trim(),
    location: String(body.location || "").trim(),
  };
}

export async function handleAppointmentReminder(
  request,
  {
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    getBusinessNumberImpl = getBusinessNumber,
  } = {},
) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expectedSecret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-liv-secret");

  if (
    !expectedSecret ||
    !secureEqual(receivedSecret, expectedSecret)
  ) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (env.WHATSAPP_APPOINTMENT_REMINDERS_ENABLED !== "true") {
    return json(
      { ok: false, sent: false, error: "reminders_disabled" },
      503,
    );
  }

  if (!isAppointmentReminderWindow(now)) {
    return json(
      { ok: false, sent: false, error: "outside_send_window" },
      409,
    );
  }

  const from = await getBusinessNumberImpl({ env });

  if (!isAppointmentReminderConfigured(env, from)) {
    return json(
      { ok: false, sent: false, error: "configuration_missing" },
      503,
    );
  }

  let payload;

  try {
    payload = normalizePayload(await request.json());
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (
    !payload.appointmentId ||
    !ALLOWED_KINDS.has(payload.reminderKind) ||
    !payload.patientPhone ||
    !payload.appointmentDate ||
    !payload.appointmentTime
  ) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const result = await sendYCloudAppointmentReminder(
    { ...payload, from },
    { env, fetchImpl },
  );

  if (result.status !== "completed") {
    return json(
      {
        ok: false,
        sent: false,
        error: result.errorCode,
        downstreamStatus: result.httpStatus,
      },
      502,
    );
  }

  return json({
    ok: true,
    sent: true,
    reminderKind: payload.reminderKind,
  });
}

export default (request) =>
  handleAppointmentReminder(request);
