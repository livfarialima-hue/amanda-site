import { createHmac, timingSafeEqual } from "node:crypto";
import {
  enrichAutomationPlanFromConversation,
  isConsultationInformationRequest,
  isSchedulingRequest,
  normalizeAutomationMode,
  planAutomation,
} from "./lib/whatsapp-automation.mjs";
import {
  buildAppointmentSuggestion,
  isAppointmentAlertEnabled,
  isAppointmentPreferenceReply,
} from "./lib/appointment-suggestions.mjs";
import {
  buildConsultationInformationReply,
  buildPatientReply,
  hasPendingReactivationHandoff,
  shouldSendAutomaticPatientReply,
  shouldSendOpenAIPatientReply,
} from "./lib/patient-replies.mjs";
import {
  normalizeDuplicateReason,
  shouldSuppressAutomationForDuplicate,
} from "./lib/lead-deduplication.mjs";
import {
  appendConversationTurn,
  toOpenAIConversation,
} from "./lib/conversation-memory.mjs";
import { runOpenAIShadow } from "./lib/openai-shadow.mjs";
import {
  checkLatestInboundReply,
  getLatestInboundReplyMarker,
  markLatestInboundForReply,
  shouldRecoverExactDuplicateRetry,
  waitForLatestInboundReply,
} from "./lib/reply-debounce.mjs";
import {
  isReviewAlertConfigured,
  sendYCloudReviewAlert,
} from "./lib/ycloud-review-alert.mjs";
import { sendYCloudPatientText } from "./lib/ycloud-patient-message.mjs";
import { getRecommendedSiteResource } from "./lib/site-content.mjs";
import {
  buildPriceReviewAlert,
  isSurgicalPriceReview,
} from "./lib/surgical-price-review.mjs";
import {
  getHumanResumeControl,
  markHumanTakeover,
  scheduleHumanResume,
} from "./lib/human-resume-queue.mjs";
import { rememberBusinessNumber } from "./lib/business-number-registry.mjs";
import {
  detectConfirmedAppointment,
  detectPatientAppointmentReply,
} from "./lib/appointment-confirmation.mjs";
import {
  buildOvernightHandoffMessage,
  isHumanResumeServiceOpen,
  shouldSendOvernightHandoff,
} from "./lib/human-resume-policy.mjs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function overnightHandoffReason(
  plan,
  appointmentReviewCandidate,
) {
  if (appointmentReviewCandidate) {
    return "scheduling_or_confirmation";
  }

  const reason = String(plan?.reason || "");
  return shouldSendOvernightHandoff(reason) ? reason : "";
}

function isOutsideHumanServiceHours(value, env = process.env) {
  const timestamp = new Date(value || "").getTime();
  if (!Number.isFinite(timestamp)) return false;
  return !isHumanResumeServiceOpen(timestamp, env);
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

function normalizeComparableMessage(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function isWhatsAppBusinessAutomaticGreeting(echo) {
  if (String(echo?.type || "").toLowerCase() !== "text") return false;

  const text = normalizeComparableMessage(echo?.text?.body);

  return new Set([
    "oi como podemos ajudar",
    "ola como podemos ajudar",
  ]).has(text);
}

function boundedReferralText(value, maximumLength = 300) {
  return Array.from(
    String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, maximumLength)
    .join("");
}

function extractReferralContext(message) {
  const referral = message?.referral;

  if (!referral || typeof referral !== "object") return null;

  const sourceType = boundedReferralText(
    referral.source_type || referral.sourceType,
    40,
  ).toLowerCase();

  if (sourceType !== "ad") return null;

  const context = {
    sourceType: "ad",
    mediaType: boundedReferralText(
      referral.media_type || referral.mediaType,
      40,
    ),
    headline: boundedReferralText(referral.headline, 300),
    body: boundedReferralText(referral.body, 500),
  };

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => Boolean(value)),
  );
}

function matchMetaCode(value, anchored = false) {
  const boundary = anchored ? "^\\s*" : "\\b";
  const pattern = new RegExp(
    `${boundary}(M26[A-Z]\\d{2}[A-Z])` +
      `(?:\\s*(?:-|\\|)\\s*(C\\d{2}(?:H\\d{2})?))?` +
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

const SITE_PAGE_REFERENCES = [
  ["Lifting Facial", /^\s*lifting\s+facial\b/i],
  ["Lifting Cervical", /^\s*lifting\s+cervical\b/i],
  ["Blefaroplastia", /^\s*blefaroplastia\b/i],
  ["Otoplastia", /^\s*otoplastia\b/i],
  ["Avaliacao Facial", /^\s*avalia[cç][aã]o\s+facial\b/i],
  ["Lip Lifting", /^\s*(?:lip\s*lifting|lifting\s+labial)\b/i],
  ["Lipo de Papada", /^\s*lipo\s+de\s+papada\b/i],
  ["Lipoaspiracao", /^\s*lipoaspira[cç][aã]o\b/i],
  ["Abdominoplastia", /^\s*abdominoplastia\b/i],
  ["Mastopexia com Protese", /^\s*mastopexia\s+com\s+pr[oó]tese\b/i],
  ["Mastopexia", /^\s*mastopexia\b/i],
  ["Protese de Mama", /^\s*pr[oó]tese\s+de\s+mama\b/i],
  ["Mamoplastia Redutora", /^\s*mamoplastia\s+redutora\b/i],
  ["Braquioplastia", /^\s*braquioplastia\b/i],
  ["Ninfoplastia", /^\s*ninfoplastia\b/i],
  ["Contorno Corporal", /^\s*contorno\s+corporal\b/i],
  ["Pos-Bariatrica", /^\s*p[oó]s[- ]bari[aá]trica\b/i],
];

const META_AD_REFERENCES = Object.freeze({
  // M26F01W | C01H01 | Como funciona a avaliação | WA
  "120250469052940627": "M26F01W-C01H01",
  // M26F01W | C06H01 | Lifting
  "120250446134900627": "M26F01W-C06H01",
});

function matchMetaAdReference(message) {
  const sourceId = String(
    message?.referral?.source_id ||
    message?.referral?.sourceId ||
    "",
  ).trim();

  if (!/^\d{5,30}$/.test(sourceId)) return null;

  return {
    value: META_AD_REFERENCES[sourceId] || `META-AD-${sourceId}`,
    family: META_AD_REFERENCES[sourceId] ? "meta_mapped" : "meta_ad_id",
  };
}

function matchSitePageReference(value) {
  for (const [canonical, pattern] of SITE_PAGE_REFERENCES) {
    if (pattern.test(String(value || ""))) return canonical;
  }

  return null;
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

  if (anchored) {
    const sitePage = matchSitePageReference(value);
    if (sitePage) return { value: sitePage, family: "site_page" };
  }

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

export function classifyAttribution(payload, message, text) {
  const referralIsMeta =
    String(
      message.referral?.source_type ||
      message.referral?.sourceType ||
      "",
    ).trim().toLowerCase() ===
    "ad";
  const referralReference = referralIsMeta
    ? matchMetaAdReference(message)
    : null;
  const explicitReference = extractExplicitReference(text);
  const metaCode = matchMetaCode(text);
  const googleCode = matchGoogleCode(text);
  const legacyGoogleCode = matchLegacyGoogleCode(text);
  const siteCta = matchSiteCta(text);
  const clickIds = extractClickIds(text);

  const parsedReference =
    explicitReference ||
    (metaCode && { value: metaCode, family: "meta" }) ||
    (googleCode && { value: googleCode, family: "google" }) ||
    (legacyGoogleCode && {
      value: legacyGoogleCode,
      family: "google_legacy",
    }) ||
    (siteCta && { value: siteCta, family: "site_cta" });
  const parsedMetaReferenceIsIncomplete =
    parsedReference?.family === "meta" &&
    !/-C\d{2}H\d{2}\b/i.test(parsedReference.value);
  const reference =
    referralReference &&
    (!parsedReference || parsedMetaReferenceIsIncomplete)
      ? referralReference
      : parsedReference;

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
  const hasSitePageReference = reference?.family === "site_page";

  let platform;

  if (referralIsMeta || hasMetaCode) {
    platform = "Meta";
  } else if (hasGoogleCode || hasGoogleClickId) {
    platform = "Google";
  } else if (
    hasSiteCtaCode ||
    hasSitePageReference ||
    referenceValue === "SITE-ORGANICO-SEM-CODIGO"
  ) {
    platform = "Orgânico/Conteúdo";
  } else {
    platform = "WhatsApp direto";
  }

  let referenceCategory;

  if (platform === "Meta") {
    referenceCategory =
      reference?.family === "meta_mapped"
        ? "meta_coded"
        : reference?.family === "meta_ad_id"
          ? "meta_ad_id"
          : hasMetaCode
            ? "meta_coded"
            : "meta_uncoded";
  } else if (hasGoogleCode) {
    referenceCategory = "google_coded";
  } else if (hasGoogleClickId) {
    referenceCategory = "google_click_id";
  } else if (hasSitePageReference) {
    referenceCategory = "site_page";
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
    limit: 50,
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
      ? result.responseData.slots.slice(0, 50)
      : [],
  };
}

function isExactMessageDuplicate(delivery) {
  return (
    delivery?.duplicate === true &&
    ["event_id", "message_id"].includes(delivery.duplicateReason)
  );
}

function logOpenAIResult(eventId, result, executionMode = "shadow") {
  if (result.status === "completed") {
    console.log(
      JSON.stringify({
        source: `openai_${executionMode}_completed`,
        eventId,
        model: result.model,
        route: result.decision.route,
        confidence: result.decision.confidence,
        automaticAllowed: result.decision.automaticAllowed,
        urgent: result.decision.urgent,
        professional: result.decision.professional,
        procedure: result.decision.procedure,
        replyCode: result.decision.replyCode,
        suggestedReply: result.decision.suggestedReply,
        reviewReason: result.decision.reviewReason,
        usage: result.usage,
      }),
    );
    return;
  }

  console.log(
    JSON.stringify({
      source: `openai_${executionMode}_failed`,
      eventId,
      httpStatus: result.httpStatus ?? null,
      errorCode: result.errorCode || "unknown_failure",
    }),
  );
}

function shouldSendReviewAlertForPlan(plan) {
  return (
    plan?.route === "human_review" ||
    plan?.route === "daniel_greeting_and_alert" ||
    plan?.route === "reactivation_notice"
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

function prepareReviewAlertInput(input, { decision, plan } = {}) {
  const planReason = String(plan?.reason || "");
  const priceReview =
    isSurgicalPriceReview(decision, plan) ||
    (
      plan?.route === "human_review" &&
      /(?:price|preco|valor|orcamento)/i.test(planReason)
    );

  if (priceReview) {
    return {
      ...input,
      messageText: buildPriceReviewAlert({
        patientName: input.patientName,
        patientMessage: input.messageText,
        procedure:
          decision?.procedure ||
          plan?.procedure ||
          null,
      }),
    };
  }

  const suggestedReply = String(
    decision?.suggestedReply || "",
  ).trim();

  if (!suggestedReply) return input;

  return {
    ...input,
    messageText: [
      input.messageText,
      "Sugestão para copiar após conferir:",
      suggestedReply,
    ].filter(Boolean).join("\n"),
  };
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

function isAppointmentReviewCandidate(
  plan,
  text,
  recentConversation = [],
) {
  return Boolean(
    plan?.professional === "amanda" &&
      (
        isSchedulingRequest(text) ||
        isAppointmentPreferenceReply(text, recentConversation)
      ),
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
    preferenceText: input.preferenceText || input.messageText,
  });

  console.log(
    JSON.stringify({
      source: "appointment_review_prepared",
      eventId: input.eventId,
      professional: input.professional,
      procedure: input.procedure || null,
      availabilityRead: availability.ok ? "success" : "failure",
      availableSlots: availability.slots.length,
      preferenceCaptured: Boolean(
        input.preferenceText || input.messageText,
      ),
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
  plan,
) {
  try {
    const shadowResult = await runOpenAIShadow(input);
    logOpenAIResult(input.eventId, shadowResult, "shadow");

    if (
      shadowResult.status === "completed" &&
      shadowResult.decision.route === "appointment_review" &&
      !reviewAlertAlreadyQueued &&
      isAppointmentAlertEnabled() &&
      isReviewAlertConfigured()
    ) {
      await completeAppointmentReview({
        ...alertInput,
        professional:
          shadowResult.decision.professional || plan?.professional,
        procedure:
          shadowResult.decision.procedure || plan?.procedure,
        preferenceText: input.text,
      });
      return;
    }

    if (
      shadowResult.status === "completed" &&
      !reviewAlertAlreadyQueued &&
      isReviewAlertConfigured() &&
      shouldSendReviewAlertForDecision(shadowResult.decision)
    ) {
      await completeReviewAlert(
        prepareReviewAlertInput(alertInput, {
          decision: shadowResult.decision,
          plan,
        }),
      );
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

async function completeOpenAIActive({
  input,
  alertInput,
  reviewAlertAlreadyQueued,
  plan,
  humanTakeoverToday,
  exactDuplicate,
  schedulingRequest,
  from,
  to,
  replyDebounceMarkerStatus,
}) {
  try {
    const debounceResult = await waitForLatestInboundReply({
      phone: to,
      eventId: input.eventId,
      markerStatus: replyDebounceMarkerStatus,
      configuredDelayMs: process.env.WHATSAPP_REPLY_DEBOUNCE_MS,
    });

    if (!debounceResult.shouldProcess) {
      console.log(
        JSON.stringify({
          source: "openai_active_debounced",
          eventId: input.eventId,
          patientLast4: String(to || "").slice(-4),
          delayMs: debounceResult.delayMs,
        }),
      );
      return;
    }

    const consultationInformationRequest =
      plan?.reason === "consultation_information_request" &&
      isConsultationInformationRequest(input.text);
    const siteResource = consultationInformationRequest
      ? getRecommendedSiteResource({
          procedure: plan?.procedure || input.procedure,
          referenceCategory: input.referenceCategory,
          recentConversation: input.recentConversation,
          currentMessage: input.text,
        })
      : null;
    const activeResult = consultationInformationRequest
      ? {
          status: "completed",
          model: "deterministic-consultation-information",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure:
              plan?.procedure ||
              input.procedure ||
              "",
            replyCode: "AMANDA-CONSULTA-INFO-01",
            suggestedReply: buildConsultationInformationReply({
              patientName: input.patientProfileName,
              siteResource,
            }),
            reviewReason: "",
          },
          usage: null,
        }
      : await runOpenAIShadow(input);
    logOpenAIResult(input.eventId, activeResult, "active");

    if (activeResult.status !== "completed") {
      return;
    }

    const latestAfterGeneration = await checkLatestInboundReply({
      phone: to,
      eventId: input.eventId,
      markerStatus: replyDebounceMarkerStatus,
    });

    if (!latestAfterGeneration.shouldProcess) {
      console.log(
        JSON.stringify({
          source: "openai_active_superseded_after_generation",
          eventId: input.eventId,
          patientLast4: String(to || "").slice(-4),
        }),
      );
      return;
    }

    if (activeResult.decision.route === "appointment_review") {
      if (
        !reviewAlertAlreadyQueued &&
        isAppointmentAlertEnabled() &&
        isReviewAlertConfigured()
      ) {
        await completeAppointmentReview({
          ...alertInput,
          professional:
            activeResult.decision.professional || plan?.professional,
          procedure:
            activeResult.decision.procedure || plan?.procedure,
          preferenceText: input.text,
        });
      }
      return;
    }

    if (
      !reviewAlertAlreadyQueued &&
      isReviewAlertConfigured() &&
      shouldSendReviewAlertForDecision(activeResult.decision)
    ) {
      await completeReviewAlert(
        prepareReviewAlertInput(alertInput, {
          decision: activeResult.decision,
          plan,
        }),
      );
    }

    if (
      !shouldSendOpenAIPatientReply({
        mode: "active",
        plan,
        decision: activeResult.decision,
        humanTakeoverToday,
        exactDuplicate,
        schedulingRequest,
      })
    ) {
      return;
    }

    const replyResult = await sendYCloudPatientText({
      from,
      to,
      eventId: input.eventId,
      body: activeResult.decision.suggestedReply,
    });
    logPatientReplyResult(input.eventId, to, replyResult);

    if (replyResult.status === "completed") {
      const memoryResult = await appendConversationTurn({
        phone: to,
        role: "assistant",
        text: activeResult.decision.suggestedReply,
        eventId: `${input.eventId}:bruna`,
        source: "bruna",
      });

      console.log(
        JSON.stringify({
          source: "conversation_memory_reply",
          eventId: input.eventId,
          status: memoryResult.status,
        }),
      );
    }
  } catch {
    console.log(
      JSON.stringify({
        source: "openai_active_failed",
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
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
      reviewAlertConfigured: isReviewAlertConfigured(),
      appointmentReviewEnabled: isAppointmentAlertEnabled(),
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
    await rememberBusinessNumber(echo.from);
    const patientPhone = normalizePhone(echo.to);
    const eventId = payload.id || echo.id || echo.wamid;
    const messageId = echo.wamid || echo.id || eventId;

    if (!patientPhone) {
      return json({ received: false, error: "invalid_phone" }, 400);
    }

    if (!eventId || !messageId) {
      return json({ received: false, error: "missing_event_id" }, 400);
    }

    if (isWhatsAppBusinessAutomaticGreeting(echo)) {
      console.log(
        JSON.stringify({
          source: "ycloud_automatic_greeting_ignored",
          eventId: String(eventId),
          eventType: payload.type,
          messageId: String(messageId),
          patientLast4: patientPhone.slice(-4),
        }),
      );

      return json({
        received: true,
        ignored: true,
        ignoreReason: "whatsapp_business_automatic_greeting",
      });
    }

    const humanResumeControl = await markHumanTakeover({
      phone: patientPhone,
      eventId: String(eventId),
      at: String(
        echo.sendTime ||
          echo.createTime ||
          payload.createTime ||
          "",
      ),
    });
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

    const memoryResult = await appendConversationTurn({
      phone: patientPhone,
      role: "assistant",
      text: String(echo.text?.body || ""),
      eventId: String(eventId),
      at: String(
        echo.sendTime ||
          echo.createTime ||
          payload.createTime ||
          "",
      ),
      source: "human",
    });
    const confirmedAppointment = detectConfirmedAppointment({
      currentText: String(echo.text?.body || ""),
      recentConversation: memoryResult.historyAfter,
      at: String(
        echo.sendTime ||
          echo.createTime ||
          payload.createTime ||
          "",
      ),
    });
    let appointmentSyncStatus = "not_detected";

    if (confirmedAppointment) {
      const appointmentSync = await deliverSheetsAction(
        "upsert_appointment",
        {
          appointment: {
            ...confirmedAppointment,
            eventId: String(eventId),
            appointmentId: `whatsapp-${String(messageId)}`,
            phone: patientPhone,
          },
        },
      );
      appointmentSyncStatus = appointmentSync.ok
        ? "completed"
        : appointmentSync.errorCode;

      console.log(
        JSON.stringify({
          source: "appointment_confirmation_sync",
          eventId: String(eventId),
          patientLast4: patientPhone.slice(-4),
          status: appointmentSyncStatus,
        }),
      );
    }

    const humanInteractionSync = await deliverSheetsAction(
      "touch_appointment",
      {
        appointment: {
          appointmentId: confirmedAppointment
            ? `whatsapp-${String(messageId)}`
            : "",
          phone: patientPhone,
          at: String(
            echo.sendTime ||
              echo.createTime ||
              payload.createTime ||
              "",
          ),
        },
      },
    );
    const humanInteractionSyncStatus = humanInteractionSync.ok
      ? humanInteractionSync.updated
        ? "updated"
        : "not_found"
      : humanInteractionSync.errorCode;

    return json({
      received: true,
      humanTakeoverRecorded: true,
      takeoverCreated: takeoverDelivery.created === true,
      conversationMemory: memoryResult.status,
      humanResumeControl: humanResumeControl.status,
      appointmentSyncStatus,
      humanInteractionSyncStatus,
    });
  }

  if (payload.type !== "whatsapp.inbound_message.received") {
    return json({ received: true, ignored: true });
  }

  const message = payload.whatsappInboundMessage || {};
  await rememberBusinessNumber(message.to);
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
  const referralContext = extractReferralContext(message);
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
    referralContext,
  });

  if (preliminaryAutomationPlan.route === "ignore") {
    let appointmentReplySyncStatus = "not_detected";

    if (
      String(message.type || "").toLowerCase() === "text" &&
      text.trim()
    ) {
      const ignoredMemory = await appendConversationTurn({
        phone,
        role: "user",
        text,
        eventId: String(eventId),
        at: contactAt,
        source: "patient",
      });
      const appointmentReply = detectPatientAppointmentReply({
        currentText: text,
        recentConversation: ignoredMemory.historyAfter,
        at: contactAt,
      });

      if (appointmentReply) {
        const statusSync = await deliverSheetsAction(
          "update_appointment_status",
          {
            appointment: {
              ...appointmentReply,
              phone,
              at: contactAt,
            },
          },
        );
        appointmentReplySyncStatus = statusSync.ok
          ? "completed"
          : statusSync.errorCode;
      }
    }

    console.log(
      JSON.stringify({
        source: "ycloud",
        eventId: String(eventId),
        eventType: payload.type,
        messageType: message.type || null,
        senderLast4: phone.slice(-4),
        ignored: true,
        ignoreReason: preliminaryAutomationPlan.reason,
        leadDelivery: "skipped",
        appointmentReplySyncStatus,
        aiShadowQueued: false,
        aiActiveQueued: false,
      }),
    );

    return json({
      received: true,
      ignored: true,
      ignoreReason: preliminaryAutomationPlan.reason,
      leadRecorded: false,
      appointmentReplySyncStatus,
      aiShadowQueued: false,
      aiActiveQueued: false,
    });
  }

  // The spreadsheet uses this only to keep cardiology fully isolated from
  // the Amanda acquisition/conversion table. It never changes patient-facing
  // behavior.
  lead.professional = preliminaryAutomationPlan.professional;

  const delivery = await deliverLead(lead);
  let conversationHistory = [];
  let conversationHistoryWithCurrent = [];
  let conversationMemoryStatus = "skipped";
  let conversationExpired = false;
  let replyDebounceMarkerStatus = "skipped";
  let patientAppointmentReply = null;
  let patientAppointmentReplySyncStatus = "not_detected";
  const exactMessageDuplicate = isExactMessageDuplicate(delivery);
  let recoveredExactDuplicate = false;

  if (delivery.ok && exactMessageDuplicate) {
    const latestMarker = await getLatestInboundReplyMarker({ phone });
    recoveredExactDuplicate = shouldRecoverExactDuplicateRetry({
      marker: latestMarker,
      eventId: String(eventId),
      messageAt: contactAt,
    });
  }

  const suppressExactDuplicate =
    exactMessageDuplicate && !recoveredExactDuplicate;

  if (delivery.ok && !suppressExactDuplicate) {
    const markerResult = await markLatestInboundForReply({
      phone,
      eventId: String(eventId),
    });
    replyDebounceMarkerStatus = markerResult.status;
  }

  if (
    delivery.ok &&
    !suppressExactDuplicate &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0
  ) {
    const memoryResult = await appendConversationTurn({
      phone,
      role: "user",
      text,
      eventId: String(eventId),
      at: contactAt,
      source: "patient",
    });
    conversationMemoryStatus = memoryResult.status;
    conversationExpired = memoryResult.expired === true;
    conversationHistory = toOpenAIConversation(
      memoryResult.historyBefore,
    );
    conversationHistoryWithCurrent = toOpenAIConversation(
      memoryResult.historyAfter,
    );
    patientAppointmentReply = detectPatientAppointmentReply({
      currentText: text,
      recentConversation: memoryResult.historyAfter,
      at: contactAt,
    });
  }
  if (!conversationHistoryWithCurrent.length) {
    conversationHistoryWithCurrent = conversationHistory;
  }

  if (patientAppointmentReply) {
    const statusSync = await deliverSheetsAction(
      "update_appointment_status",
      {
        appointment: {
          ...patientAppointmentReply,
          phone,
          at: contactAt,
        },
      },
    );
    patientAppointmentReplySyncStatus = statusSync.ok
      ? "completed"
      : statusSync.errorCode;
  }

  const reactivationHandoffPending =
    hasPendingReactivationHandoff(conversationHistory);
  const humanResumeControl =
    delivery.humanTakeoverToday
      ? await getHumanResumeControl(phone)
      : null;
  const humanTakeoverActive =
    delivery.humanTakeoverToday &&
    humanResumeControl?.status !== "bruna_resumed";

  const automationPlan = humanTakeoverActive
    ? {
        route: "human_takeover_active",
        reason: "manual_reply_today",
        replyCode: "HUMAN-DAY-01",
        professional: null,
        procedure: null,
        automaticAllowed: false,
      }
    : shouldSuppressAutomationForDuplicate(delivery) &&
        !recoveredExactDuplicate
    ? {
        route: "ignored_duplicate",
        reason: "message_already_processed",
        replyCode: null,
        professional: null,
        procedure: null,
        automaticAllowed: false,
      }
    : conversationExpired
      ? {
          route: "reactivation_notice",
          reason: "conversation_inactive_over_7_days",
          replyCode: "MANUAL-RETURN-7D-01",
          professional: enrichAutomationPlanFromConversation(
            preliminaryAutomationPlan,
            conversationHistory,
          ).professional,
          procedure: enrichAutomationPlanFromConversation(
            preliminaryAutomationPlan,
            conversationHistory,
          ).procedure,
          automaticAllowed: true,
        }
    : reactivationHandoffPending
      ? {
          route: "human_handoff_pending",
          reason: "reactivation_waiting_for_human",
          replyCode: null,
          professional: null,
          procedure: null,
          automaticAllowed: false,
        }
    : enrichAutomationPlanFromConversation(
        preliminaryAutomationPlan,
        conversationHistory,
      );

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
    conversationHistory,
  );
  const shouldQueueAppointmentReview =
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    appointmentReviewCandidate &&
    isAppointmentAlertEnabled() &&
    isReviewAlertConfigured();
  const shouldQueueReviewAlert =
    delivery.ok &&
    !suppressExactDuplicate &&
    !shouldQueueAppointmentReview &&
    isReviewAlertConfigured() &&
    shouldSendReviewAlertForPlan(automationPlan);
  const overnightReason = overnightHandoffReason(
    automationPlan,
    appointmentReviewCandidate,
  );
  const shouldQueueOvernightHandoff =
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    Boolean(overnightReason) &&
    isOutsideHumanServiceHours(contactAt) &&
    (
      shouldQueueReviewAlert ||
      shouldQueueAppointmentReview
    );
  let reviewAlertQueued = false;
  let appointmentReviewQueued = false;
  let patientReplyQueued = false;
  let patientReplySent = false;
  let overnightHandoffQueued = false;
  let overnightHandoffSent = false;
  let aiActiveQueued = false;
  let humanResumeScheduleStatus = "skipped";

  if (
    delivery.ok &&
    humanTakeoverActive &&
    automationMode === "active" &&
    !suppressExactDuplicate
  ) {
    const resumeContextPlan = enrichAutomationPlanFromConversation(
      preliminaryAutomationPlan,
      conversationHistory,
    );
    const scheduleResult = await scheduleHumanResume({
      phone,
      from: String(message.to || ""),
      eventId: String(eventId),
      patientName: String(message.customerProfile?.name || ""),
      text,
      messageType: String(message.type || ""),
      platform: attribution.platform,
      reference: attribution.reference,
      referenceCategory: attribution.referenceCategory,
      procedure: resumeContextPlan.procedure,
      referralContext,
      recentConversation: conversationHistoryWithCurrent,
      receivedAt: String(
        message.sendTime || payload.createTime || "",
      ),
    });
    humanResumeScheduleStatus = scheduleResult.status;
  }

  if (shouldQueueReviewAlert) {
    const alertPromise = completeReviewAlert(
      prepareReviewAlertInput(alertInput, {
        plan: automationPlan,
      }),
    );
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
      preferenceText: text,
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

  if (shouldQueueOvernightHandoff) {
    overnightHandoffQueued = true;
    const overnightBody =
      buildOvernightHandoffMessage(overnightReason);
    const overnightResult = await sendYCloudPatientText({
      from: String(message.to || ""),
      to: phone,
      eventId: `${String(eventId)}-overnight-handoff`,
      body: overnightBody,
    });
    overnightHandoffSent =
      overnightResult.status === "completed";
    logPatientReplyResult(
      `${String(eventId)}-overnight-handoff`,
      phone,
      overnightResult,
    );

    if (overnightHandoffSent) {
      await appendConversationTurn({
        phone,
        role: "assistant",
        text: overnightBody,
        eventId: `${String(eventId)}:overnight-handoff`,
        source: "bruna",
      });
    }
  }

  const patientReplyBody = buildPatientReply({
    replyCode: automationPlan.replyCode,
    patientName: String(message.customerProfile?.name || ""),
    procedure: automationPlan.procedure,
  });
  const shouldQueuePatientReply =
    [
      "daniel_greeting_and_alert",
      "reactivation_notice",
    ].includes(automationPlan.route) &&
    Boolean(patientReplyBody) &&
    delivery.ok &&
    shouldSendAutomaticPatientReply({
      mode: automationMode,
      plan: automationPlan,
      humanTakeoverToday: humanTakeoverActive,
      exactDuplicate: suppressExactDuplicate,
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

    if (patientReplySent) {
      const memoryResult = await appendConversationTurn({
        phone,
        role: "assistant",
        text: patientReplyBody,
        eventId: `${eventId}:bruna`,
        source: "bruna",
      });

      console.log(
        JSON.stringify({
          source: "conversation_memory_reply",
          eventId: String(eventId),
          status: memoryResult.status,
        }),
      );
    }
  }

  const shouldQueueOpenAIShadow =
    delivery.ok &&
    !humanTakeoverActive &&
    automationMode === "shadow" &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0 &&
    automationPlan.route === "standard_reply" &&
    automationPlan.professional !== "daniel" &&
    !appointmentReviewCandidate &&
    !suppressExactDuplicate;
  const shouldQueueOpenAIActive =
    delivery.ok &&
    !humanTakeoverActive &&
    automationMode === "active" &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0 &&
    automationPlan.route === "standard_reply" &&
    automationPlan.professional !== "daniel" &&
    !appointmentReviewCandidate &&
    !suppressExactDuplicate;
  let aiShadowQueued = false;

  if (shouldQueueOpenAIShadow) {
    const shadowPromise = completeOpenAIShadow(
      {
        eventId: String(eventId),
        phone,
        text,
        platform: attribution.platform,
        procedure: automationPlan.procedure,
        referenceCategory: attribution.referenceCategory,
        patientProfileName: String(
          message.customerProfile?.name || "",
        ),
        recentConversation: conversationHistory,
        referralContext,
        deterministicUrgent:
          automationPlan.reason === "possible_urgent_symptoms",
      },
      alertInput,
      reviewAlertQueued,
      automationPlan,
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

  if (shouldQueueOpenAIActive) {
    const activePromise = completeOpenAIActive({
      input: {
        eventId: String(eventId),
        phone,
        text,
        platform: attribution.platform,
        procedure: automationPlan.procedure,
        referenceCategory: attribution.referenceCategory,
        patientProfileName: String(
          message.customerProfile?.name || "",
        ),
        recentConversation: conversationHistory,
        referralContext,
        deterministicUrgent:
          automationPlan.reason === "possible_urgent_symptoms",
      },
      alertInput,
      reviewAlertAlreadyQueued: reviewAlertQueued,
      plan: automationPlan,
      humanTakeoverToday: humanTakeoverActive,
      exactDuplicate: suppressExactDuplicate,
      schedulingRequest: appointmentReviewCandidate,
      from: String(message.to || ""),
      to: phone,
      replyDebounceMarkerStatus,
    });

    aiActiveQueued = true;

    if (typeof context?.waitUntil === "function") {
      try {
        context.waitUntil(activePromise);
      } catch {
        await activePromise;
      }
    } else {
      await activePromise;
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
      recoveredExactDuplicate,
      leadInserted: delivery.inserted === true,
      leadUpdated: delivery.updated === true,
      humanTakeoverToday: humanTakeoverActive,
      sheetsHumanTakeoverToday:
        delivery.humanTakeoverToday === true,
      humanResumeControl:
        humanResumeControl?.status || null,
      humanResumeScheduleStatus,
      conversationMemoryStatus,
      patientAppointmentReplySyncStatus,
      conversationExpired,
      reactivationHandoffPending,
      conversationHistoryTurns: conversationHistory.length,
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
      overnightHandoffQueued,
      overnightHandoffSent,
      aiShadowQueued,
      aiActiveQueued,
      replyDebounceMarkerStatus,
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
    humanTakeoverToday: humanTakeoverActive,
    sheetsHumanTakeoverToday:
      delivery.humanTakeoverToday === true,
    humanResumeControl:
      humanResumeControl?.status || null,
    humanResumeScheduleStatus,
    duplicate: delivery.duplicate === true,
    duplicateReason: delivery.duplicateReason,
    recoveredExactDuplicate,
    conversationMemory: conversationMemoryStatus,
    patientAppointmentReplySyncStatus,
    conversationExpired,
    reactivationHandoffPending,
    automation: {
      mode: automationMode,
      route: automationPlan.route,
      replyCode: automationPlan.replyCode,
    },
    reviewAlertQueued,
    appointmentReviewQueued,
    patientReplyQueued,
    patientReplySent,
    overnightHandoffQueued,
    overnightHandoffSent,
    aiShadowQueued,
    aiActiveQueued,
  });
};

export const config = {
  path: "/api/ycloud/webhook",
};
