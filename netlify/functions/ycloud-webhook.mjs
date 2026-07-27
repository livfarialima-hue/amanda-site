import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isSchedulingRequest,
  normalizeAutomationMode,
  planAutomation,
} from "./lib/whatsapp-automation.mjs";
import {
  buildAppointmentSuggestion,
  isAppointmentAlertEnabled,
} from "./lib/appointment-suggestions.mjs";
import {
  buildPatientReply,
  shouldSendAutomaticPatientReply,
} from "./lib/patient-replies.mjs";
import {
  normalizeDuplicateReason,
  shouldSuppressAutomationForDuplicate,
} from "./lib/lead-deduplication.mjs";
import { runOpenAIShadow } from "./lib/openai-shadow.mjs";
import {
  isReviewAlertConfigured,
  sendYCloudReviewAlert,
} from "./lib/ycloud-review-alert.mjs";
import { sendYCloudPatientText } from "./lib/ycloud-patient-message.mjs";

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
    platform = "Google";
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
  "busy_retry",
  "internal_error",
  "internal_error_parse_body",
  "internal_error_normalize_takeover",
  "internal_error_normalize_lead",
  "internal_error_acquire_lock",
  "internal_error_open_spreadsheet",
  "internal_error_find_sheet",
  "internal_error_assert_headers",
  "internal_error_event_sheet",
  "internal_error_takeover_sheet",
  "internal_error_record_takeover",
  "internal_error_human_takeover_check",
  "internal_error_duplicate_check",
  "internal_error_phone_lookup",
  "internal_error_enrich_existing",
  "internal_error_find_row",
  "internal_error_prepare_row",
  "internal_error_write_row",
  "internal_error_write_formats",
  "internal_error_write_contact",
  "internal_error_write_status",
  "internal_error_write_primary_consent",
  "internal_error_write_click_id",
  "internal_error_write_identity",
  "internal_error_write_secondary_consent",
  "internal_error_write_origin",
  "internal_error_write_destination",
  "internal_error_flush",
  "internal_error_unknown",
]);

function deliveryResult(ok, httpStatus, errorCode, details = {}) {
  return { ok, httpStatus, errorCode, ...details };
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

async function deliverSheetsAction(action, payload) {
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
        action,
        ...payload,
      }),
      redirect: "follow",
      signal: controller.signal,
    });

    const httpStatus = response.status;
    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();

    if (responseText.length > 100_000) {
      return deliveryResult(false, httpStatus, "response_too_large");
    }

    if (!responseText.trim()) {
      return deliveryResult(false, httpStatus, "empty_response");
    }

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      const errorCode = contentType.toLowerCase().includes("text/html")
        ? "html_response"
        : "invalid_json_response";

      return deliveryResult(false, httpStatus, errorCode);
    }

    if (
      (response.ok && responseData?.ok === true) ||
      (httpStatus < 500 && isDuplicateConfirmation(responseData))
    ) {
      return deliveryResult(true, httpStatus, "none", {
        responseData,
      });
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

async function deliverLead(lead) {
  const result = await deliverSheetsAction("append_lead", { lead });

  if (!result.ok) return result;

  const responseData = result.responseData;

  return deliveryResult(true, result.httpStatus, "none", {
    duplicate:
      responseData?.duplicate === true ||
      isDuplicateConfirmation(responseData),
    duplicateReason: normalizeDuplicateReason(responseData),
    inserted: responseData?.inserted === true,
    updated: responseData?.updated === true,
    humanTakeoverToday: responseData?.humanTakeoverToday === true,
  });
}

async function recordHumanTakeover(takeover) {
  const result = await deliverSheetsAction(
    "mark_human_takeover",
    { takeover },
  );

  if (!result.ok) return result;

  return deliveryResult(true, result.httpStatus, "none", {
    marked: result.responseData?.marked === true,
    created: result.responseData?.created === true,
  });
}

async function getAvailableAppointmentSlots(professional) {
  const result = await deliverSheetsAction("get_available_slots", {
    professional,
    limit: 3,
  });

  if (!result.ok) {
    return {
      ok: false,
      httpStatus: result.httpStatus,
      errorCode: result.errorCode,
      slots: [],
    };
  }

  return {
    ok: true,
    httpStatus: result.httpStatus,
    errorCode: "none",
    slots: Array.isArray(result.responseData?.slots)
      ? result.responseData.slots.slice(0, 3)
      : [],
  };
}

function isExactMessageDuplicate(delivery) {
  return (
    delivery?.duplicate === true &&
    ["event_id", "message_id"].includes(delivery.duplicateReason)
  );
}

function logOpenAIShadowResult(eventId, shadowResult) {
  if (shadowResult.status === "completed") {
    console.log(
      JSON.stringify({
        source: "openai_shadow_completed",
        eventId,
        model: shadowResult.model,
        route: shadowResult.decision.route,
        confidence: shadowResult.decision.confidence,
        automaticAllowed: shadowResult.decision.automaticAllowed,
        urgent: shadowResult.decision.urgent,
        professional: shadowResult.decision.professional,
        procedure: shadowResult.decision.procedure,
        replyCode: shadowResult.decision.replyCode,
        suggestedReply: shadowResult.decision.suggestedReply,
        reviewReason: shadowResult.decision.reviewReason,
        usage: shadowResult.usage,
      }),
    );
    return;
  }

  console.log(
    JSON.stringify({
      source: "openai_shadow_failed",
      eventId,
      httpStatus: shadowResult.httpStatus ?? null,
      errorCode: shadowResult.errorCode || "unknown_failure",
    }),
  );
}

function shouldSendReviewAlertForPlan(plan) {
  return (
    plan?.route === "human_review" ||
    plan?.route === "daniel_greeting_and_alert"
  );
}

function shouldSendReviewAlertForDecision(decision) {
  return (
    decision?.urgent === true ||
    decision?.route === "human_review" ||
    decision?.route === "daniel_greeting_and_alert"
  );
}

function logReviewAlertResult(eventId, phone, alertResult) {
  console.log(
    JSON.stringify({
      source:
        alertResult.status === "completed"
          ? "ycloud_review_alert_completed"
          : "ycloud_review_alert_failed",
      eventId,
      patientLast4: String(phone || "").slice(-4),
      httpStatus: alertResult.httpStatus ?? null,
      errorCode: alertResult.errorCode || "none",
    }),
  );
}

function logPatientReplyResult(eventId, phone, replyResult) {
  console.log(
    JSON.stringify({
      source:
        replyResult.status === "completed"
          ? "ycloud_patient_reply_completed"
          : "ycloud_patient_reply_failed",
      eventId,
      patientLast4: String(phone || "").slice(-4),
      httpStatus: replyResult.httpStatus ?? null,
      errorCode: replyResult.errorCode || "none",
    }),
  );
}

async function completeReviewAlert(input) {
  try {
    const alertResult = await sendYCloudReviewAlert(input);
    logReviewAlertResult(
      input.eventId,
      input.patientPhone,
      alertResult,
    );
  } catch {
    logReviewAlertResult(input.eventId, input.patientPhone, {
      status: "failed",
      httpStatus: null,
      errorCode: "request_failed",
    });
  }
}

function isAppointmentReviewCandidate(plan, text) {
  return Boolean(
    plan?.professional === "amanda" &&
      isSchedulingRequest(text),
  );
}

async function completeAppointmentReview(input) {
  const availability = await getAvailableAppointmentSlots(
    input.professional,
  );
  const suggestion = buildAppointmentSuggestion({
    patientName: input.patientName,
    professional: input.professional,
    procedure: input.procedure,
    slots: availability.slots,
  });

  console.log(
    JSON.stringify({
      source: "appointment_review_prepared",
      eventId: input.eventId,
      professional: input.professional,
      procedure: input.procedure || null,
      availabilityRead: availability.ok ? "success" : "failure",
      availableSlots: availability.slots.length,
      downstreamStatus: availability.httpStatus,
      downstreamError: availability.errorCode,
    }),
  );

  await completeReviewAlert({
    ...input,
    messageText: suggestion,
  });
}

async function completeOpenAIShadow(
  input,
  alertInput,
  reviewAlertAlreadyQueued,
) {
  try {
    const shadowResult = await runOpenAIShadow(input);
    logOpenAIShadowResult(input.eventId, shadowResult);

    if (
      shadowResult.status === "completed" &&
      !reviewAlertAlreadyQueued &&
      isReviewAlertConfigured() &&
      shouldSendReviewAlertForDecision(shadowResult.decision)
    ) {
      await completeReviewAlert(alertInput);
    }
  } catch {
    console.log(
      JSON.stringify({
        source: "openai_shadow_failed",
        eventId: input.eventId,
        httpStatus: null,
        errorCode: "request_failed",
      }),
    );
  }
}

export default async (request, context) => {
  const webhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const automationMode = normalizeAutomationMode(
    process.env.WHATSAPP_AUTOMATION_MODE,
  );

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
      reviewAlertConfigured: isReviewAlertConfigured(),
      automationMode,
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

  if (payload.type === "whatsapp.smb.message.echoes") {
    const echo = payload.whatsappMessage || {};
    const patientPhone = normalizePhone(echo.to);
    const eventId = payload.id || echo.id || echo.wamid;
    const messageId = echo.wamid || echo.id || eventId;

    if (!patientPhone) {
      return json({ received: false, error: "invalid_phone" }, 400);
    }

    if (!eventId || !messageId) {
      return json({ received: false, error: "missing_event_id" }, 400);
    }

    const takeoverDelivery = await recordHumanTakeover({
      eventId: String(eventId),
      messageId: String(messageId),
      phone: patientPhone,
      takenAt: String(echo.sendTime || echo.createTime || payload.createTime || ""),
      text: String(echo.text?.body || ""),
    });

    console.log(
      JSON.stringify({
        source: "ycloud_human_takeover",
        eventId: String(eventId),
        eventType: payload.type,
        messageId: String(messageId),
        patientLast4: patientPhone.slice(-4),
        takeoverDelivery: takeoverDelivery.ok ? "success" : "failure",
        takeoverCreated: takeoverDelivery.created === true,
        downstreamStatus: takeoverDelivery.httpStatus,
        downstreamError: takeoverDelivery.errorCode,
      }),
    );

    if (!takeoverDelivery.ok) {
      return json(
        {
          received: false,
          error: "takeover_delivery_failed",
          downstreamStatus: takeoverDelivery.httpStatus,
          downstreamError: takeoverDelivery.errorCode,
        },
        502,
      );
    }

    return json({
      received: true,
      humanTakeoverRecorded: true,
      takeoverCreated: takeoverDelivery.created === true,
    });
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
  const messageId = message.wamid || message.id || eventId;
  const lead = {
    eventId: String(eventId),
    messageId: String(messageId),
    phone,
    name: String(message.customerProfile?.name || ""),
    text,
    reference: attribution.reference,
    platform: attribution.platform,
    ...attribution.clickIds,
  };

  if (contactAt) lead.contactAt = String(contactAt);

  const preliminaryAutomationPlan = planAutomation({
    text,
    messageType: message.type,
    reference: attribution.reference,
    platform: attribution.platform,
  });

  // The spreadsheet uses this only to keep cardiology fully isolated from
  // the Amanda acquisition/conversion table. It never changes patient-facing
  // behavior.
  lead.professional = preliminaryAutomationPlan.professional;

  const delivery = await deliverLead(lead);
  const automationPlan = delivery.humanTakeoverToday
    ? {
        route: "human_takeover_active",
        reason: "manual_reply_today",
        replyCode: "HUMAN-DAY-01",
        professional: null,
        procedure: null,
        automaticAllowed: false,
      }
    : shouldSuppressAutomationForDuplicate(delivery)
    ? {
        route: "ignored_duplicate",
        reason: "message_already_processed",
        replyCode: null,
        professional: null,
        procedure: null,
        automaticAllowed: false,
      }
    : preliminaryAutomationPlan;

  const alertInput = {
    from: String(message.to || ""),
    eventId: String(eventId),
    patientName: String(message.customerProfile?.name || ""),
    patientPhone: phone,
    messageText: text,
  };
  const appointmentReviewCandidate = isAppointmentReviewCandidate(
    automationPlan,
    text,
  );
  const shouldQueueAppointmentReview =
    delivery.ok &&
    !delivery.humanTakeoverToday &&
    !isExactMessageDuplicate(delivery) &&
    appointmentReviewCandidate &&
    isAppointmentAlertEnabled() &&
    isReviewAlertConfigured();
  const shouldQueueReviewAlert =
    delivery.ok &&
    !isExactMessageDuplicate(delivery) &&
    !shouldQueueAppointmentReview &&
    isReviewAlertConfigured() &&
    shouldSendReviewAlertForPlan(automationPlan);
  let reviewAlertQueued = false;
  let appointmentReviewQueued = false;
  let patientReplyQueued = false;
  let patientReplySent = false;

  if (shouldQueueReviewAlert) {
    const alertPromise = completeReviewAlert(alertInput);
    reviewAlertQueued = true;

    if (typeof context?.waitUntil === "function") {
      try {
        context.waitUntil(alertPromise);
      } catch {
        await alertPromise;
      }
    } else {
      await alertPromise;
    }
  }

  if (shouldQueueAppointmentReview) {
    const appointmentPromise = completeAppointmentReview({
      ...alertInput,
      professional: automationPlan.professional,
      procedure: automationPlan.procedure,
    });
    appointmentReviewQueued = true;

    if (typeof context?.waitUntil === "function") {
      try {
        context.waitUntil(appointmentPromise);
      } catch {
        await appointmentPromise;
      }
    } else {
      await appointmentPromise;
    }
  }

  const patientReplyBody = buildPatientReply({
    replyCode: automationPlan.replyCode,
    patientName: String(message.customerProfile?.name || ""),
    procedure: automationPlan.procedure,
  });
  const shouldQueuePatientReply =
    Boolean(patientReplyBody) &&
    delivery.ok &&
    shouldSendAutomaticPatientReply({
      mode: automationMode,
      plan: automationPlan,
      humanTakeoverToday: delivery.humanTakeoverToday,
      exactDuplicate: isExactMessageDuplicate(delivery),
      schedulingRequest: appointmentReviewCandidate,
      reviewAlertConfigured: isReviewAlertConfigured(),
    });

  if (shouldQueuePatientReply) {
    patientReplyQueued = true;
    const replyResult = await sendYCloudPatientText({
      from: String(message.to || ""),
      to: phone,
      eventId: String(eventId),
      body: patientReplyBody,
    });
    patientReplySent = replyResult.status === "completed";
    logPatientReplyResult(String(eventId), phone, replyResult);
  }

  const shouldQueueOpenAIShadow =
    delivery.ok &&
    !delivery.humanTakeoverToday &&
    automationMode === "shadow" &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0 &&
    automationPlan.professional !== "daniel" &&
    !isExactMessageDuplicate(delivery);
  let aiShadowQueued = false;

  if (shouldQueueOpenAIShadow) {
    const shadowPromise = completeOpenAIShadow(
      {
        eventId: String(eventId),
        phone,
        text,
        platform: attribution.platform,
        deterministicUrgent:
          automationPlan.reason === "possible_urgent_symptoms",
      },
      alertInput,
      reviewAlertQueued,
    );

    aiShadowQueued = true;

    if (typeof context?.waitUntil === "function") {
      try {
        context.waitUntil(shadowPromise);
      } catch {
        await shadowPromise;
      }
    } else {
      await shadowPromise;
    }
  }

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
      leadDuplicate: delivery.duplicate === true,
      leadDuplicateReason: delivery.duplicateReason,
      leadInserted: delivery.inserted === true,
      leadUpdated: delivery.updated === true,
      humanTakeoverToday: delivery.humanTakeoverToday === true,
      downstreamStatus: delivery.httpStatus,
      downstreamError: delivery.errorCode,
      automationMode,
      automationRoute: automationPlan.route,
      automationReason: automationPlan.reason,
      automationReplyCode: automationPlan.replyCode,
      automationProfessional: automationPlan.professional,
      automationProcedure: automationPlan.procedure,
      reviewAlertQueued,
      appointmentReviewQueued,
      patientReplyQueued,
      patientReplySent,
      aiShadowQueued,
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

  return json({
    received: true,
    leadRecorded: true,
    leadInserted: delivery.inserted === true,
    leadUpdated: delivery.updated === true,
    humanTakeoverToday: delivery.humanTakeoverToday === true,
    duplicate: delivery.duplicate === true,
    duplicateReason: delivery.duplicateReason,
    automation: {
      mode: automationMode,
      route: automationPlan.route,
      replyCode: automationPlan.replyCode,
    },
    reviewAlertQueued,
    appointmentReviewQueued,
    patientReplyQueued,
    patientReplySent,
    aiShadowQueued,
  });
};

export const config = {
  path: "/api/ycloud/webhook",
};
