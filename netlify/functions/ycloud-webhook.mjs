import { createHmac, timingSafeEqual } from "node:crypto";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = {};

  for (const item of signatureHeader.split(",")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;

    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    parts[key] = value;
  }

  if (!parts.t || !parts.s) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(parts.s, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export default async (request) => {
  const webhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;

  if (request.method === "GET") {
    return json({
      ok: true,
      service: "ycloud-webhook",
      apiKeyConfigured: Boolean(process.env.YCLOUD_API_KEY),
      signatureProtection: webhookSecret ? "active" : "setup_pending",
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const rawBody = await request.text();

  if (
    webhookSecret &&
    !verifySignature(
      rawBody,
      request.headers.get("YCloud-Signature"),
      webhookSecret,
    )
  ) {
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const message = payload.whatsappInboundMessage || {};
  const sender = String(message.from || "");

  console.log(
    JSON.stringify({
      source: "ycloud",
      eventId: payload.id || null,
      eventType: payload.type || null,
      messageId: message.id || message.wamid || null,
      messageType: message.type || null,
      senderLast4: sender.slice(-4),
      hasCampaignReferral: Boolean(message.referral),
    }),
  );

  return json({ received: true });
};

export const config = {
  path: "/api/ycloud/webhook",
};
