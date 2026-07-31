import { isAppointmentAlertEnabled } from "./lib/appointment-suggestions.mjs";
import { normalizeAutomationMode } from "./lib/whatsapp-automation.mjs";
import { isReviewAlertConfigured } from "./lib/ycloud-review-alert.mjs";
import { verifyYCloudSignature } from "./lib/ycloud-webhook-security.mjs";

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
  const webhookSecret = env.YCLOUD_WEBHOOK_SECRET;

  return {
    ok: true,
    service: "ycloud-webhook",
    apiKeyConfigured: Boolean(env.YCLOUD_API_KEY),
    signatureProtection: webhookSecret ? "active" : "setup_pending",
    sheetsWebhookConfigured: Boolean(env.GOOGLE_SHEETS_WEBHOOK_URL),
    sheetsSecretConfigured: Boolean(env.GOOGLE_SHEETS_WEBHOOK_SECRET),
    openAIConfigured: Boolean(env.OPENAI_API_KEY),
    reviewAlertConfigured: isReviewAlertConfigured(env),
    appointmentReviewEnabled: isAppointmentAlertEnabled(env),
    automationMode: normalizeAutomationMode(env.WHATSAPP_AUTOMATION_MODE),
    processingMode: "wait_until",
  };
}

function workerUrl(requestUrl) {
  const url = new URL(requestUrl);
  url.pathname = "/api/ycloud/webhook-worker";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function dispatchYCloudWebhook(
  request,
  {
    env = process.env,
    fetchImpl = fetch,
  } = {},
) {
  if (request.method === "GET") {
    return json(health(env));
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const webhookSecret = env.YCLOUD_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return json(
      { received: false, error: "webhook_not_configured" },
      503,
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("YCloud-Signature");

  if (!verifyYCloudSignature(rawBody, signature, webhookSecret)) {
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  let workerResponse;

  try {
    workerResponse = await fetchImpl(workerUrl(request.url), {
      method: "POST",
      headers: {
        "content-type":
          request.headers.get("content-type") || "application/json",
        "YCloud-Signature": signature,
      },
      body: rawBody,
    });
  } catch {
    return json(
      { received: false, error: "worker_dispatch_failed" },
      502,
    );
  }

  if (!workerResponse.ok) {
    return json(
      {
        received: false,
        error: "worker_dispatch_rejected",
        workerStatus: workerResponse.status,
      },
      502,
    );
  }

  return json({ received: true, queued: true });
}

export default dispatchYCloudWebhook;

export const config = {
  path: "/api/ycloud/webhook",
};
