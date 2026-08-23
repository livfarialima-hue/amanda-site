import { timingSafeEqual } from "node:crypto";
import { getBusinessNumber } from "./lib/business-number-registry.mjs";
import { appendConversationTurn } from "./lib/conversation-memory.mjs";
import {
  reviewScheduledFollowupContext,
} from "./lib/scheduled-followup-context-review.mjs";
import { normalizeAutomationMode } from "./lib/whatsapp-automation.mjs";
import { sendYCloudPatientText } from "./lib/ycloud-patient-message.mjs";

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

  return Number(parts.find((part) => part.type === "hour")?.value);
}

export function isScheduledFollowupWindow(date = new Date()) {
  const hour = localHour(date);
  return Number.isFinite(hour) && hour >= 9 && hour < 19;
}

function normalizePayload(value) {
  const body =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    planId: String(body.planId || "").trim().slice(0, 160),
    patientPhone: String(body.patientPhone || "").trim(),
    body: Array.from(String(body.body || "").trim())
      .slice(0, 1500)
      .join(""),
    humanApproved: body.humanApproved === true,
    recentConversation: Array.isArray(body.recentConversation)
      ? body.recentConversation.slice(-20).map((turn) => ({
          direction:
            String(turn?.direction || "").toUpperCase() === "OUT"
              ? "OUT"
              : "IN",
          at: String(turn?.at || "").trim().slice(0, 40),
          text: Array.from(String(turn?.text || "").trim())
            .slice(0, 1200)
            .join(""),
        }))
      : [],
    leadContext: {
      status: String(body.leadContext?.status || "")
        .trim()
        .slice(0, 120),
      summary: Array.from(
        String(body.leadContext?.summary || "").trim(),
      ).slice(0, 600).join(""),
      nextAction: Array.from(
        String(body.leadContext?.nextAction || "").trim(),
      ).slice(0, 300).join(""),
    },
  };
}

export async function handleScheduledFollowup(
  request,
  {
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    getBusinessNumberImpl = getBusinessNumber,
    appendConversationTurnImpl = appendConversationTurn,
    reviewScheduledFollowupContextImpl =
      reviewScheduledFollowupContext,
    sendYCloudPatientTextImpl = sendYCloudPatientText,
  } = {},
) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expectedSecret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-liv-secret");

  if (!expectedSecret || !secureEqual(receivedSecret, expectedSecret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (env.WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED !== "true") {
    return json(
      { ok: false, sent: false, error: "scheduled_followups_disabled" },
      503,
    );
  }

  const automationMode = normalizeAutomationMode(
    env.WHATSAPP_AUTOMATION_MODE,
  );
  if (automationMode !== "active") {
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

  if (!isScheduledFollowupWindow(now)) {
    return json(
      { ok: false, sent: false, error: "outside_send_window" },
      409,
    );
  }

  let payload;

  try {
    payload = normalizePayload(await request.json());
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!payload.planId || !payload.patientPhone || !payload.body) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const contextReview = await reviewScheduledFollowupContextImpl(
    payload,
    { env, fetchImpl },
  );

  if (contextReview?.status !== "completed") {
    return json(
      {
        ok: false,
        sent: false,
        error: "semantic_context_review_unavailable",
        semanticReason:
          contextReview?.errorCode || "review_failed",
      },
      503,
    );
  }

  if (contextReview.allowed !== true) {
    return json(
      {
        ok: false,
        sent: false,
        error: "semantic_context_review_required",
        semanticReason:
          contextReview.reasonCode || "context_not_aligned",
      },
      409,
    );
  }

  const from = await getBusinessNumberImpl({ env });

  if (!from || !env.YCLOUD_API_KEY) {
    return json(
      { ok: false, sent: false, error: "configuration_missing" },
      503,
    );
  }

  const eventId = `scheduled-followup-${payload.planId}`;
  const result = await sendYCloudPatientTextImpl(
    {
      from,
      to: payload.patientPhone,
      eventId,
      body: payload.body,
    },
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

  await appendConversationTurnImpl({
    phone: payload.patientPhone,
    role: "assistant",
    text: payload.body,
    eventId,
    source: "bruna",
    at: now.toISOString(),
  });

  return json({ ok: true, sent: true });
}

export default (request) => handleScheduledFollowup(request);
