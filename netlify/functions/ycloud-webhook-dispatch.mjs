import { AsyncWorkloadsClient } from "@netlify/async-workloads";
import { isAppointmentAlertEnabled } from "./lib/appointment-suggestions.mjs";
import {
  appendConversationTurn,
} from "./lib/conversation-memory.mjs";
import {
  markLatestInboundForReply,
} from "./lib/reply-debounce.mjs";
import {
  registerInboundRecovery,
} from "./lib/inbound-recovery.mjs";
import { normalizeAutomationMode } from "./lib/whatsapp-automation.mjs";
import { isReviewAlertConfigured } from "./lib/ycloud-review-alert.mjs";
import { verifyYCloudSignature } from "./lib/ycloud-webhook-security.mjs";

export const DURABLE_YCLOUD_EVENT = "liv.ycloud.webhook.received";
export const DEFAULT_DURABLE_DELAY_MS = 0;
const MIN_DURABLE_DELAY_MS = 0;
const MAX_DURABLE_DELAY_MS = 52_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function health(env = process.env) {
  return {
    ok: true,
    service: "ycloud-webhook",
    apiKeyConfigured: Boolean(env.YCLOUD_API_KEY),
    signatureProtection: env.YCLOUD_WEBHOOK_SECRET
      ? "active"
      : "setup_pending",
    sheetsWebhookConfigured: Boolean(env.GOOGLE_SHEETS_WEBHOOK_URL),
    sheetsSecretConfigured: Boolean(env.GOOGLE_SHEETS_WEBHOOK_SECRET),
    openAIConfigured: Boolean(env.OPENAI_API_KEY),
    reviewAlertConfigured: isReviewAlertConfigured(env),
    appointmentReviewEnabled: isAppointmentAlertEnabled(env),
    automationMode: normalizeAutomationMode(env.WHATSAPP_AUTOMATION_MODE),
    processingMode: "durable_async_workload",
    initialQueueDelayMs: durableDelayMs(
      env.WHATSAPP_DURABLE_QUEUE_DELAY_MS,
    ),
    asyncWorkloadsConfigured: Boolean(
      env.AWL_API_KEY || env.AWL_API_KEY_P100,
    ),
  };
}

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^55\d{10,11}$/.test(compact)) return `+${compact}`;
  return null;
}

function durableDelayMs(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DURABLE_DELAY_MS;
  return Math.min(
    Math.max(parsed, MIN_DURABLE_DELAY_MS),
    MAX_DURABLE_DELAY_MS,
  );
}

function inboundContext(payload) {
  if (payload?.type !== "whatsapp.inbound_message.received") return null;

  const message = payload.whatsappInboundMessage || {};
  const phone = normalizePhone(message.from);
  const eventId = payload.id || message.id || message.wamid;
  if (!phone || !eventId) return null;

  return {
    eventId: String(eventId),
    phone,
    text: String(message.text?.body || ""),
    messageType: String(message.type || ""),
    at: String(message.sendTime || payload.createTime || ""),
  };
}

async function prepareInboundForDurableReply(
  context,
  {
    markLatestInboundForReplyImpl = markLatestInboundForReply,
    appendConversationTurnImpl = appendConversationTurn,
  } = {},
) {
  if (
    !context ||
    context.messageType.toLowerCase() !== "text" ||
    !context.text.trim()
  ) {
    return { markerStatus: "skipped", memoryStatus: "skipped" };
  }

  const marker = await markLatestInboundForReplyImpl({
    phone: context.phone,
    eventId: context.eventId,
  });
  const memory = await appendConversationTurnImpl({
    phone: context.phone,
    role: "user",
    text: context.text,
    eventId: context.eventId,
    at: context.at,
    source: "patient",
  });

  return {
    markerStatus: marker.status,
    memoryStatus: memory.status,
  };
}

export async function dispatchYCloudWebhook(
  request,
  {
    env = process.env,
    sendEventImpl,
    markLatestInboundForReplyImpl = markLatestInboundForReply,
    appendConversationTurnImpl = appendConversationTurn,
    registerInboundRecoveryImpl = registerInboundRecovery,
    now = Date.now(),
  } = {},
) {
  if (request.method === "GET") return json(health(env));
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const secret = env.YCLOUD_WEBHOOK_SECRET;
  if (!secret) {
    return json({ received: false, error: "webhook_not_configured" }, 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("YCloud-Signature");
  if (!verifyYCloudSignature(rawBody, signature, secret)) {
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const inbound = inboundContext(payload);
  const preparation = await prepareInboundForDurableReply(inbound, {
    markLatestInboundForReplyImpl,
    appendConversationTurnImpl,
  });
  const isTextInbound =
    inbound?.messageType.toLowerCase() === "text" &&
    Boolean(inbound?.text.trim());
  const delayMs = isTextInbound
    ? durableDelayMs(env.WHATSAPP_DURABLE_QUEUE_DELAY_MS)
    : 0;
  const recovery = isTextInbound
    ? await registerInboundRecoveryImpl({
        rawBody,
        signature,
        contentType:
          request.headers.get("content-type") || "application/json",
        origin: new URL(request.url).origin,
        eventId: inbound.eventId,
        phone: inbound.phone,
      })
    : { status: "skipped" };
  const send = sendEventImpl || (async (eventName, options) => {
    const client = new AsyncWorkloadsClient({
      baseUrl: new URL(request.url).origin,
      apiKey: env.AWL_API_KEY || env.AWL_API_KEY_P100,
    });
    return client.send(eventName, options);
  });

  let queued;
  try {
    queued = await send(DURABLE_YCLOUD_EVENT, {
      data: {
        rawBody,
        signature,
        contentType:
          request.headers.get("content-type") || "application/json",
        origin: new URL(request.url).origin,
        eventId: inbound?.eventId || String(payload.id || ""),
        phone: inbound?.phone || "",
        isTextInbound,
      },
      ...(delayMs ? { delayUntil: now + delayMs } : {}),
      priority: isTextInbound ? 0 : 40,
    });
  } catch {
    return json({ received: false, error: "durable_queue_failed" }, 503);
  }

  if (queued?.sendStatus !== "succeeded") {
    return json({ received: false, error: "durable_queue_failed" }, 503);
  }

  return json({
    received: true,
    queued: true,
    queueEventId: queued.eventId,
    delayMs,
    markerStatus: preparation.markerStatus,
    memoryStatus: preparation.memoryStatus,
    recoveryStatus: recovery.status,
  });
}

export default dispatchYCloudWebhook;

export const config = {
  // Retain the durable queue as an isolated diagnostic endpoint, but do not
  // place it between YCloud and the normal patient response path.
  path: "/api/ycloud/webhook-queued",
};
