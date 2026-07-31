import processYCloudWebhook from "./ycloud-webhook.mjs";
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

function requestFromRawBody(request, rawBody) {
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  });
}

export async function queueYCloudWebhookWorker(
  request,
  context = {},
  {
    env = process.env,
    processImpl = processYCloudWebhook,
  } = {},
) {
  if (request.method === "GET") {
    return processImpl(request, context);
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

  const processingPromise = Promise.resolve()
    .then(() =>
      processImpl(requestFromRawBody(request, rawBody), context),
    )
    .then(async (response) => {
      if (response.ok) return response;

      const error = new Error(
        `ycloud_worker_processing_failed:${response.status}`,
      );
      error.status = response.status;
      throw error;
    })
    .catch((error) => {
      console.log(
        JSON.stringify({
          source: "ycloud_worker_failed",
          httpStatus: error?.status || null,
          errorCode: "processing_failed",
        }),
      );
      throw error;
    });

  if (typeof context?.waitUntil !== "function") {
    return processingPromise;
  }

  context.waitUntil(processingPromise);
  return json({ received: true, processing: true }, 202);
}

export default queueYCloudWebhookWorker;

export const config = {
  path: "/api/ycloud/webhook-worker",
};
