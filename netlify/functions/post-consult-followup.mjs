import { timingSafeEqual } from "node:crypto";
import {
  isPostConsultConfigured,
  sendYCloudPostConsult,
} from "./lib/ycloud-post-consult.mjs";
import { getBusinessNumber } from "./lib/business-number-registry.mjs";
import {
  allowsPatientSideEffects,
  normalizeAutomationMode,
} from "./lib/automation-mode.mjs";

const TIMEZONE = "America/Sao_Paulo";

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

export function isPostConsultWindow(date = new Date()) {
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
    patientPhone: String(body.patientPhone || "").trim(),
    patientName: String(body.patientName || "").trim(),
    professional: String(body.professional || "").trim(),
  };
}

export async function handlePostConsultFollowup(
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

  if (env.WHATSAPP_POST_CONSULT_ENABLED !== "true") {
    return json(
      {
        ok: false,
        sent: false,
        error: "post_consult_disabled",
      },
      503,
    );
  }

  const automationMode = normalizeAutomationMode(
    env.WHATSAPP_AUTOMATION_MODE,
  );
  if (!allowsPatientSideEffects(automationMode)) {
    return json(
      {
        ok: false,
        sent: false,
        error: "automation_inactive",
        automationMode,
      },
      503,
    );
  }

  if (!isPostConsultWindow(now)) {
    return json(
      {
        ok: false,
        sent: false,
        error: "outside_send_window",
      },
      409,
    );
  }

  let payload;

  try {
    payload = normalizePayload(await request.json());
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!payload.appointmentId || !payload.patientPhone) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const from = await getBusinessNumberImpl({ env });

  if (!isPostConsultConfigured(env, from)) {
    return json(
      {
        ok: false,
        sent: false,
        error: "configuration_missing",
      },
      503,
    );
  }

  const result = await sendYCloudPostConsult(
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

  return json({ ok: true, sent: true });
}

export default (request) =>
  handlePostConsultFollowup(request);
