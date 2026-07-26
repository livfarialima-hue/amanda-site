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

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");

  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^55\d{10,11}$/.test(compact)) return `+${compact}`;

  return null;
}

function matchMetaCode(value, anchored = false) {
  const boundary = anchored ? "^\\s*" : "\\b";
  const pattern = new RegExp(
    `${boundary}(M26[A-Z]\\d{2}[A-Z])` +
      `(?:\\s*(?:-|\\|)\\s*(C\\d{2}H\\d{2}))?` +
      `(?:\\s*(?:-|\\|)\\s*(AF\\d{2}))?` +
      `(?![A-Z0-9-])`,
    "i",
  );
  const match = String(value || "").match(pattern);

  if (!match) return null;

  return [match[1], match[2], match[3]]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

function matchGoogleCode(value, anchored = false) {
  const boundary = anchored ? "^\\s*" : "\\b";
  const pattern = new RegExp(
    `${boundary}(G26[A-Z0-9]{2,16})` +
      `(?:\\s*-\\s*(AF\\d{2}))?` +
      `(?![A-Z0-9-])`,
    "i",
  );
  const match = String(value || "").match(pattern);

  if (!match) return null;

  return [match[1], match[2]].filter(Boolean).join("-").toUpperCase();
}

function matchLegacyGoogleCode(value, anchored = false) {
  const boundary = anchored ? "^\\s*" : "\\b";
  const pattern = new RegExp(
    `${boundary}((?:LC|LF|BF)\\d{2})(?![A-Z0-9])`,
    "i",
  );
  const match = String(value || "").match(pattern);

  return match ? match[1].toUpperCase() : null;
}

function matchSiteCta(value, anchored = false) {
  const boundary = anchored ? "^\\s*" : "\\b";
  const pattern = new RegExp(
    `${boundary}(AF\\d{2})(?![A-Z0-9])`,
    "i",
  );
  const match = String(value || "").match(pattern);

  return match ? match[1].toUpperCase() : null;
}

function matchNeutralCode(value, anchored = false) {
  const meta = matchMetaCode(value, anchored);
  if (meta) return { value: meta, family: "meta" };

  const google = matchGoogleCode(value, anchored);
  if (google) return { value: google, family: "google" };

  const legacyGoogle = matchLegacyGoogleCode(value, anchored);
  if (legacyGoogle) {
    return { value: legacyGoogle, family: "google_legacy" };
  }

  const siteCta = matchSiteCta(value, anchored);
  if (siteCta) return { value: siteCta, family: "site_cta" };

  return null;
}

function extractExplicitReference(text) {
  const labelPattern = /\b(?:refer[eê]ncia|ref)\.?\s*:?\s*/giu;

  for (const label of String(text || "").matchAll(labelPattern)) {
    const remainder = text.slice(label.index + label[0].length);
    const reference = matchNeutralCode(remainder, true);
    if (reference) return reference;
  }

  return null;
}

function extractClickIds(text) {
  const clickIds = {};
  const pattern =
    /\b(GCLID|GBRAID|WBRAID)\s*[:=]\s*([A-Za-z0-9._~-]{10,300})(?![A-Za-z0-9._~-])/gi;

  for (const match of String(text || "").matchAll(pattern)) {
    const field = match[1].toLowerCase();
    if (!clickIds[field]) clickIds[field] = match[2];
  }

  return clickIds;
}

function hasSafeSiteEvidence(payload, message) {
  const candidates = [
    message.source,
    message.sourceType,
    message.origin?.type,
    message.context?.source,
    payload.source,
    payload.origin?.type,
  ];
  const safeSiteValues = new Set(["site", "web", "website"]);

  return candidates.some((value) =>
    safeSiteValues.has(String(value || "").trim().toLowerCase()),
  );
}

function classifyAttribution(payload, message, text) {
  const referralIsMeta =
    String(message.referral?.source_type || "").trim().toLowerCase() ===
    "ad";
  const explicitReference = extractExplicitReference(text);
  const metaCode = matchMetaCode(text);
  const googleCode = matchGoogleCode(text);
  const legacyGoogleCode = matchLegacyGoogleCode(text);
  const siteCta = matchSiteCta(text);
  const clickIds = extractClickIds(text);

  const reference =
    explicitReference ||
    (metaCode && { value: metaCode, family: "meta" }) ||
    (googleCode && { value: googleCode, family: "google" }) ||
    (legacyGoogleCode && {
      value: legacyGoogleCode,
      family: "google_legacy",
    }) ||
    (siteCta && { value: siteCta, family: "site_cta" });

  let referenceValue;

  if (reference) {
    referenceValue = reference.value;
  } else if (referralIsMeta) {
    referenceValue = "META-DIRETO-SEM-CODIGO";
  } else if (hasSafeSiteEvidence(payload, message)) {
    referenceValue = "SITE-ORGANICO-SEM-CODIGO";
  } else {
    referenceValue = "WHATSAPP-DIRETO-SEM-CODIGO";
  }

  const hasMetaCode = reference?.family === "meta" || Boolean(metaCode);
  const hasGoogleCode =
    reference?.family === "google" ||
    reference?.family === "google_legacy" ||
    Boolean(googleCode) ||
    Boolean(legacyGoogleCode);
  const hasGoogleClickId = Object.keys(clickIds).length > 0;
  const hasSiteCtaCode =
    reference?.family === "site_cta" || Boolean(siteCta);

  let platform;

  if (referralIsMeta || hasMetaCode) {
    platform = "Meta";
  } else if (hasGoogleCode || hasGoogleClickId) {
    platform = "Google Ads";
  } else if (
    hasSiteCtaCode ||
    referenceValue === "SITE-ORGANICO-SEM-CODIGO"
  ) {
    platform = "Orgânico/Conteúdo";
  } else {
    platform = "WhatsApp direto";
  }

  let referenceCategory;

  if (platform === "Meta") {
    referenceCategory = hasMetaCode ? "meta_coded" : "meta_uncoded";
  } else if (hasGoogleCode) {
    referenceCategory = "google_coded";
  } else if (hasGoogleClickId) {
    referenceCategory = "google_click_id";
  } else if (hasSiteCtaCode) {
    referenceCategory = "site_cta";
  } else if (referenceValue === "SITE-ORGANICO-SEM-CODIGO") {
    referenceCategory = "site_uncoded";
  } else {
    referenceCategory = "whatsapp_uncoded";
  }

  return {
    reference: referenceValue,
    platform,
    referenceCategory,
    clickIds,
  };
}

function isDuplicateConfirmation(data) {
  if (!data || typeof data !== "object") return false;

  if (data.duplicate === true || data.idempotent === true) return true;

  const indicators = [data.status, data.code, data.result]
    .filter((value) => typeof value === "string")
    .map((value) => value.trim().toLowerCase());

  return indicators.some((value) =>
    [
      "duplicate",
      "duplicated",
      "already_processed",
      "already-processed",
      "idempotent",
    ].includes(value),
  );
}

const SAFE_DOWNSTREAM_ERROR_CODES = new Set([
  "unauthorized",
  "unsupported_action",
  "internal_error",
  "internal_error_parse_body",
  "internal_error_normalize_lead",
  "internal_error_acquire_lock",
  "internal_error_open_spreadsheet",
  "internal_error_find_sheet",
  "internal_error_assert_headers",
  "internal_error_duplicate_check",
  "internal_error_find_row",
  "internal_error_prepare_row",
  "internal_error_write_row",
  "internal_error_flush",
  "internal_error_unknown",
]);

function deliveryResult(ok, httpStatus, errorCode) {
  return { ok, httpStatus, errorCode };
}

function safeDownstreamErrorCode(data) {
  const candidates = [data?.error, data?.errorCode, data?.code];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const normalized = candidate.trim().toLowerCase();
    if (SAFE_DOWNSTREAM_ERROR_CODES.has(normalized)) return normalized;
  }

  return null;
}

async function readResponseTextSafely(response, maxBytes = 100_000) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;

      if (bytesRead > maxBytes) {
        await reader.cancel();
        return null;
      }

      result += decoder.decode(value, { stream: true });
    }

    return result + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function deliverLead(lead) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

  if (!url || !secret) {
    return deliveryResult(false, null, "configuration_missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        secret,
        action: "append_lead",
        lead,
      }),
      redirect: "follow",
      signal: controller.signal,
    });

    const httpStatus = response.status;
    const responseText = await readResponseTextSafely(response);

    if (responseText === null) {
      return deliveryResult(false, httpStatus, "invalid_response");
    }

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      return deliveryResult(false, httpStatus, "invalid_response");
    }

    if (
      (response.ok && responseData?.ok === true) ||
      (httpStatus < 500 && isDuplicateConfirmation(responseData))
    ) {
      return deliveryResult(true, httpStatus, "none");
    }

    if (responseData?.ok === false) {
      const errorCode = safeDownstreamErrorCode(responseData);

      return deliveryResult(
        false,
        httpStatus,
        errorCode || "unconfirmed_response",
      );
    }

    return deliveryResult(false, httpStatus, "unconfirmed_response");
  } catch (error) {
    if (error?.name === "AbortError") {
      return deliveryResult(false, null, "timeout");
    }

    return deliveryResult(false, null, "request_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export default async (request) => {
  const webhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;

  if (request.method === "GET") {
    return json({
      ok: true,
      service: "ycloud-webhook",
      apiKeyConfigured: Boolean(process.env.YCLOUD_API_KEY),
      signatureProtection: webhookSecret ? "active" : "setup_pending",
      sheetsWebhookConfigured: Boolean(
        process.env.GOOGLE_SHEETS_WEBHOOK_URL,
      ),
      sheetsSecretConfigured: Boolean(
        process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
      ),
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!webhookSecret) {
    return json(
      { received: false, error: "webhook_not_configured" },
      503,
    );
  }

  const rawBody = await request.text();

  if (
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

  if (payload.type !== "whatsapp.inbound_message.received") {
    return json({ received: true, ignored: true });
  }

  const message = payload.whatsappInboundMessage || {};
  const phone = normalizePhone(message.from);

  if (!phone) {
    return json({ received: false, error: "invalid_phone" }, 400);
  }

  const eventId = payload.id || message.id || message.wamid;

  if (!eventId) {
    return json({ received: false, error: "missing_event_id" }, 400);
  }

  const contactAt = message.sendTime || payload.createTime;
  const text = String(message.text?.body || "");
  const attribution = classifyAttribution(payload, message, text);
  const lead = {
    eventId: String(eventId),
    phone,
    reference: attribution.reference,
    platform: attribution.platform,
    ...attribution.clickIds,
  };

  if (contactAt) lead.contactAt = String(contactAt);

  const delivery = await deliverLead(lead);

  console.log(
    JSON.stringify({
      source: "ycloud",
      eventId: String(eventId),
      eventType: payload.type,
      messageId: message.id || message.wamid || null,
      messageType: message.type || null,
      senderLast4: phone.slice(-4),
      platform: attribution.platform,
      hasReferral: Boolean(message.referral),
      referenceCategory: attribution.referenceCategory,
      leadDelivery: delivery.ok ? "success" : "failure",
      downstreamStatus: delivery.httpStatus,
      downstreamError: delivery.errorCode,
    }),
  );

  if (!delivery.ok) {
    return json(
      {
        received: false,
        error: "lead_delivery_failed",
        downstreamStatus: delivery.httpStatus,
        downstreamError: delivery.errorCode,
      },
      502,
    );
  }

  return json({ received: true, leadRecorded: true });
};

export const config = {
  path: "/api/ycloud/webhook",
};
