import {
  enrichAutomationPlanFromConversation,
  isAvailabilityRequest,
  isConsultationInformationRequest,
  isLikelyMarketingPrefilledMessage,
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
  buildInsuranceCoverageReply,
  buildMarketingPrefilledOpeningReply,
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
  readConversationTurns,
  toOpenAIConversation,
} from "./lib/conversation-memory.mjs";
import {
  clearExternalProfessionalContext,
  getExternalProfessionalContext,
  isExternalProfessionalAppointmentMessage,
  isExplicitAmandaInquiry,
  markExternalProfessionalContext,
} from "./lib/external-professional-context.mjs";
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
import {
  getRecommendedSiteResource,
  isDirectSiteRequest,
} from "./lib/site-content.mjs";
import {
  buildPendingHospitalQuoteAlert,
  buildPriceReviewAlert,
  buildSurgicalPriceHoldingReply,
  isSurgicalPriceReview,
} from "./lib/surgical-price-review.mjs";
import {
  cancelPendingHumanResume,
  getHumanResumeControl,
  markHumanTakeover,
  scheduleHumanResume,
} from "./lib/human-resume-queue.mjs";
import {
  guardAutomaticReplyAgainstHumanRace,
  guardBookedAppointmentReplyAgainstHumanRace,
} from "./lib/automatic-reply-guard.mjs";
import { rememberBusinessNumber } from "./lib/business-number-registry.mjs";
import {
  buildBookedAppointmentReply,
  detectManualAppointment,
  detectPatientAppointmentSelection,
  detectPatientAppointmentReply,
} from "./lib/appointment-confirmation.mjs";
import {
  buildAppointmentReviewUrl,
  createAppointmentReview,
} from "./lib/appointment-review-store.mjs";
import {
  buildOvernightHandoffMessage,
  isHumanResumeServiceOpen,
  shouldSendOvernightHandoff,
} from "./lib/human-resume-policy.mjs";
import {
  decideConversationAction,
} from "./lib/conversation-action-controller.mjs";
import {
  sendControlledPatientReply,
} from "./lib/outbound-reply-gate.mjs";
import {
  completeInboundRecovery,
  registerInboundRecovery,
} from "./lib/inbound-recovery.mjs";
import {
  applyPatientRelationshipPolicy,
  blocksAutomatedPatientMessages,
  buildPatientCommitment,
  buildRelationshipAlertMessage,
  patientRelationshipPromptContext,
  prependRelationshipAlertContext,
} from "./lib/patient-relationship.mjs";
import { verifyYCloudSignature } from "./lib/ycloud-webhook-security.mjs";
import {
  buildProfessionalFactPartialReview,
  buildProfessionalFactReviewAlert,
} from "./lib/professional-fact-review.mjs";

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
    patientRelationship:
      responseData?.patientRelationship || null,
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

async function recordPatientCommitment(commitment) {
  if (!commitment) {
    return deliveryResult(true, null, "none", {
      skipped: true,
    });
  }

  return deliverSheetsAction(
    "record_patient_commitment",
    { commitment },
  );
}

async function resolvePatientCommitments(phone, at) {
  return deliverSheetsAction(
    "resolve_patient_commitments",
    {
      resolution: { phone, at },
    },
  );
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
  const planReason = [plan?.reason, plan?.requestReason]
    .filter(Boolean)
    .join(" ");
  if (/\bpending_hospital_quote_followup\b/.test(planReason)) {
    return {
      ...input,
      messageText: prependRelationshipAlertContext({
        relationship: input.relationship,
        messageText: buildPendingHospitalQuoteAlert({
          patientName: input.patientName,
          patientMessage: input.messageText,
        }),
      }),
    };
  }

  const priceReview =
    isSurgicalPriceReview(decision, plan) ||
    (
      plan?.route === "human_review" &&
      /(?:price|preco|valor|orcamento)/i.test(planReason)
    );

  if (priceReview) {
    return {
      ...input,
      messageText: prependRelationshipAlertContext({
        relationship: input.relationship,
        messageText: buildPriceReviewAlert({
          patientName: input.patientName,
          patientMessage: input.messageText,
          procedure:
            decision?.procedure ||
            plan?.procedure ||
            null,
          recentConversation: input.recentConversation,
        }),
      }),
    };
  }

  const suggestedReply = String(
    decision?.suggestedReply || "",
  ).trim();

  if (!suggestedReply) {
    return {
      ...input,
      messageText: buildRelationshipAlertMessage({
        messageText: input.messageText,
        patientName: input.patientName,
        relationship: input.relationship,
      }),
    };
  }

  return {
    ...input,
    messageText: [
      prependRelationshipAlertContext({
        messageText: input.messageText,
        relationship: input.relationship,
      }),
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
  const standaloneMarketingPrefilledMessage =
    plan?.reason === "known_procedure" &&
    isLikelyMarketingPrefilledMessage({ text });

  return Boolean(
    !standaloneMarketingPrefilledMessage &&
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

export async function completeSelectedAppointment(
  {
    from,
    eventId,
    messageId,
    patientName,
    patientPhone,
    selection,
  },
  {
    getHumanResumeControlImpl = getHumanResumeControl,
    deliverSheetsActionImpl = deliverSheetsAction,
    completeReviewAlertImpl = completeReviewAlert,
    sendAppointmentEmailImpl = sendAppointmentEmailNotification,
    guardBookedAppointmentReplyImpl =
      guardBookedAppointmentReplyAgainstHumanRace,
    sendControlledPatientReplyImpl =
      sendControlledPatientReply,
    appendConversationTurnImpl = appendConversationTurn,
  } = {},
) {
  const baselineControl =
    await getHumanResumeControlImpl(patientPhone);
  const reservation = await deliverSheetsActionImpl(
    "reserve_appointment_slot",
    {
      appointment: {
        ...selection,
        eventId,
        appointmentId: `whatsapp-${messageId || eventId}`,
        phone: patientPhone,
        name: patientName,
      },
    },
  );

  if (!reservation.ok || reservation.responseData?.reserved !== true) {
    const firstName =
      String(patientName || "").trim().split(/\s+/)[0] || "";
    const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
    const unavailable =
      reservation.errorCode === "slot_not_available";
    const suggestedReply = unavailable
      ? `${greeting} Esse horário não está mais disponível. Vou conferir outras opções e retorno por aqui.`
      : `${greeting} Vou confirmar esse horário com a equipe e retorno por aqui assim que possível.`;

    const reviewAlert = {
      from,
      eventId: `${eventId}-booking-review`,
      patientName,
      patientPhone,
      messageText: [
        "AGENDAMENTO — reserva não concluída",
        `Data escolhida: ${selection.scheduledDate}`,
        `Horário escolhido: ${selection.scheduledTime}`,
        `Motivo técnico: ${reservation.errorCode || "unknown_failure"}`,
        "Sugestão para copiar após conferir:",
        suggestedReply,
      ].join("\n"),
    };
    await sendAppointmentEmailImpl(reviewAlert, {
      deliverSheetsActionImpl,
    });
    await completeReviewAlertImpl(reviewAlert);

    return {
      status: "review_required",
      reserved: false,
      confirmationSent: false,
      errorCode:
        reservation.errorCode || "reservation_failed",
    };
  }

  if (reservation.responseData?.duplicate !== true) {
    await sendAppointmentEmailImpl(
      {
        eventId: `${eventId}-booking-confirmed-email`,
        patientName,
        patientPhone,
        messageText: appointmentEmailBody({
          heading: "AGENDAMENTO CONFIRMADO E REGISTRADO",
          appointment: selection,
          detail:
            "A consulta foi registrada na aba Consultas e o horário foi retirado dos disponíveis.",
        }),
      },
      { deliverSheetsActionImpl },
    );
  }

  const body = buildBookedAppointmentReply({
    patientName,
    ...selection,
  });
  const humanGuard =
    await guardBookedAppointmentReplyImpl({
      phone: patientPhone,
      baselineControl,
      configuredDelayMs:
        process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS,
    });

  if (!humanGuard.shouldSend || !body) {
    return {
      status: humanGuard.shouldSend
        ? "confirmation_unavailable"
        : "confirmation_cancelled_by_human",
      reserved: true,
      confirmationSent: false,
      errorCode: humanGuard.shouldSend
        ? "confirmation_body_missing"
        : "new_human_reply",
    };
  }

  const confirmation = await sendControlledPatientReplyImpl({
    from,
    to: patientPhone,
    eventId: `${eventId}-booking-confirmed`,
    body,
    currentText:
      `Escolha do horário ${selection.scheduledDate} ${selection.scheduledTime}`,
    recentConversation: [],
    conversationAction: {
      action: "respond",
      allowHoldingReply: false,
    },
  });
  logPatientReplyResult(
    `${eventId}-booking-confirmed`,
    patientPhone,
    confirmation,
  );
  const confirmationSent =
    confirmation.status === "completed";

  if (confirmationSent) {
    await appendConversationTurnImpl({
      phone: patientPhone,
      role: "assistant",
      text: body,
      eventId: `${eventId}:booking-confirmed`,
      source: "bruna",
    });
  } else {
    await completeReviewAlertImpl({
      from,
      eventId: `${eventId}-booking-send-failed`,
      patientName,
      patientPhone,
      messageText: [
        "AGENDAMENTO REGISTRADO, MAS A CONFIRMAÇÃO NÃO FOI ENVIADA.",
        "Sugestão para copiar ao paciente:",
        body,
      ].join("\n"),
    });
  }

  return {
    status: confirmationSent
      ? "completed"
      : "confirmation_failed",
    reserved: true,
    confirmationSent,
    errorCode:
      confirmation.errorCode || "none",
  };
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
      return { status: "superseded", replySent: false };
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

export async function supersedePendingReplyForIgnoredInbound(
  {
    phone,
    eventId,
    messageType,
    text,
  },
  {
    markLatestInboundForReplyImpl =
      markLatestInboundForReply,
  } = {},
) {
  if (
    String(messageType || "").toLowerCase() !== "text" ||
    !String(text || "").trim() ||
    !phone ||
    !eventId
  ) {
    return { status: "skipped" };
  }

  return markLatestInboundForReplyImpl({
    phone,
    eventId: String(eventId),
  });
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
  conversationAction,
  patientRelationship,
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
      return { status: "superseded", replySent: false };
    }

    const insuranceCoverageReply = buildInsuranceCoverageReply({
      text: input.text,
      procedure: plan?.procedure || input.procedure || "",
    });
    const standaloneMarketingPrefilledMessage =
      plan?.route === "standard_reply" &&
      plan?.reason === "known_procedure" &&
      isLikelyMarketingPrefilledMessage({
        text: input.text,
        platform: input.platform,
        referralContext: input.referralContext,
      });
    const consultationInformationRequest =
      plan?.reason === "consultation_information_request" &&
      isConsultationInformationRequest(input.text);
    const availabilityRequested =
      consultationInformationRequest &&
      isAvailabilityRequest(input.text);
    const siteRequested =
      consultationInformationRequest &&
      isDirectSiteRequest(input.text);
    const siteResource =
      consultationInformationRequest &&
      !availabilityRequested &&
      siteRequested
      ? getRecommendedSiteResource({
          procedure: plan?.procedure || input.procedure,
          referenceCategory: input.referenceCategory,
          recentConversation: input.recentConversation,
          currentMessage: input.text,
        })
      : null;
    const introduceBruna = !input.recentConversation.some(
      (turn) =>
        turn?.role === "assistant" ||
        ["bruna", "equipe_humana"].includes(turn?.source),
    );
    const activeResult = insuranceCoverageReply
      ? {
          status: "completed",
          model: "deterministic-insurance-coverage",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure: plan?.procedure || input.procedure || "",
            replyCode: "BLEF-CONVENIO-01",
            suggestedReply: insuranceCoverageReply,
            reviewReason: "",
          },
          usage: null,
        }
      : standaloneMarketingPrefilledMessage
      ? {
          status: "completed",
          model: "deterministic-marketing-prefill-opening",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure: plan?.procedure || input.procedure || "",
            replyCode: "MARKETING-PREFILL-OPENING-01",
            suggestedReply: buildMarketingPrefilledOpeningReply({
              patientName: input.patientProfileName,
              procedure: plan?.procedure || input.procedure || "",
              introduceBruna,
            }),
            reviewReason: "",
          },
          usage: null,
        }
      : consultationInformationRequest
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
              procedure:
                plan?.procedure ||
                input.procedure ||
                "",
              availabilityRequested,
              siteRequested,
              introduceBruna,
            }),
            reviewReason: "",
          },
          usage: null,
        }
      : await runOpenAIShadow(input);
    logOpenAIResult(input.eventId, activeResult, "active");

    if (activeResult.status !== "completed") {
      return {
        status: "failed",
        errorCode: activeResult.errorCode || "openai_failed",
        replySent: false,
      };
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
      return { status: "superseded", replySent: false };
    }

    const finalHumanGuard =
      await guardAutomaticReplyAgainstHumanRace({
        phone: to,
        configuredDelayMs:
          process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS,
      });

    if (!finalHumanGuard.shouldSend) {
      console.log(
        JSON.stringify({
          source: "openai_active_cancelled_by_human_reply",
          eventId: input.eventId,
          patientLast4: String(to || "").slice(-4),
          controlStatus: finalHumanGuard.controlStatus,
          delayMs: finalHumanGuard.delayMs,
        }),
      );
      return { status: "superseded", replySent: false };
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
      return { status: "reviewed", replySent: false };
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
      return { status: "completed_no_reply", replySent: false };
    }

    const contactPreferenceGuard =
      await guardAutomaticContactPreference({
        phone: to,
        fallbackRelationship: patientRelationship,
      });
    if (!contactPreferenceGuard.shouldSend) {
      return {
        status: contactPreferenceGuard.status,
        replySent: false,
      };
    }

    const replyResult = await sendControlledPatientReply({
      from,
      to,
      eventId: input.eventId,
      body: activeResult.decision.suggestedReply,
      currentText: input.text,
      recentConversation: input.recentConversation,
      conversationAction,
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

    if (replyResult.status === "completed") {
      return { status: "completed", replySent: true };
    }

    if (["duplicate", "blocked", "superseded"].includes(replyResult.status)) {
      return {
        status: "completed_no_reply",
        errorCode: replyResult.errorCode || replyResult.status,
        replySent: false,
      };
    }

    return {
      status: "failed",
      errorCode: replyResult.errorCode || "patient_reply_failed",
      replySent: false,
    };
  } catch {
    console.log(
      JSON.stringify({
        source: "openai_active_failed",
        eventId: input.eventId,
        httpStatus: null,
        errorCode: "request_failed",
      }),
    );
    return {
      status: "failed",
      errorCode: "request_failed",
      replySent: false,
    };
  }
}

async function lookupPatientRelationship(phone) {
  if (!phone) {
    return deliveryResult(false, null, "missing_phone");
  }

  const result = await deliverSheetsAction(
    "get_patient_relationship",
    { patient: { phone } },
  );

  if (!result.ok) return result;

  return deliveryResult(true, result.httpStatus, "none", {
    relationship: result.responseData?.relationship || null,
  });
}

async function guardAutomaticContactPreference({
  phone,
  fallbackRelationship = null,
}) {
  const lookup = await lookupPatientRelationship(phone);
  const relationship = lookup.ok
    ? lookup.relationship
    : fallbackRelationship;

  if (blocksAutomatedPatientMessages(relationship)) {
    return {
      shouldSend: false,
      status: "blocked_contact_preference",
      relationship,
      lookupStatus: lookup.ok ? "completed" : lookup.errorCode,
    };
  }

  return {
    shouldSend: true,
    status: "allowed",
    relationship,
    lookupStatus: lookup.ok ? "completed" : lookup.errorCode,
  };
}

async function sendAppointmentEmailNotification(
  input,
  { deliverSheetsActionImpl = deliverSheetsAction } = {},
) {
  const result = await deliverSheetsActionImpl(
    "send_review_alert_email",
    {
      alert: {
        eventId: String(input.eventId || ""),
        patientName: String(input.patientName || ""),
        patientPhone: String(input.patientPhone || ""),
        messageText: String(input.messageText || ""),
      },
    },
  );

  console.log(
    JSON.stringify({
      source: "appointment_email_notification",
      eventId: String(input.eventId || ""),
      patientLast4: String(input.patientPhone || "").slice(-4),
      status: result.ok ? "completed" : "failed",
      errorCode: result.errorCode,
    }),
  );
  return result;
}

function appointmentEmailBody({
  heading,
  appointment,
  detail,
  reviewUrl,
}) {
  return [
    heading,
    `Data: ${appointment.scheduledDate || "não identificada — completar na planilha"}`,
    `Horário: ${appointment.scheduledTime || "não identificado — completar na planilha"}`,
    `Profissional: ${appointment.professional || "Dra. Amanda"}`,
    detail,
    reviewUrl
      ? [
          "",
          "Revise o caso e confirme com segurança neste link:",
          reviewUrl,
          "",
          "A agenda só será alterada depois de clicar em Confirmar agendamento.",
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function enrichPricePlanFromPatientRelationship(
  plan,
  relationship,
) {
  if (
    !plan ||
    plan.procedure ||
    plan.reason !== "price_without_confirmed_procedure"
  ) {
    return plan;
  }

  const procedureTopic = String(
    relationship?.procedureTopic || "",
  ).trim();
  if (!procedureTopic) return plan;

  const contextPlan = planAutomation({
    text: procedureTopic,
    messageType: "text",
    reference: "",
    platform: "WhatsApp direto",
  });
  if (!contextPlan.procedure) return plan;

  return {
    ...plan,
    reason: "surgical_price_review",
    professional: plan.professional || "amanda",
    procedure: contextPlan.procedure,
    automaticAllowed: false,
  };
}

export async function completeManualAppointmentDetection(
  {
    eventId,
    messageId,
    patientName,
    patientPhone,
    detection,
  },
  {
    deliverSheetsActionImpl = deliverSheetsAction,
    sendAppointmentEmailImpl = sendAppointmentEmailNotification,
    createAppointmentReviewImpl = createAppointmentReview,
    buildAppointmentReviewUrlImpl = buildAppointmentReviewUrl,
  } = {},
) {
  if (!detection) {
    return { status: "not_detected", reserved: false };
  }

  const { confidence, ...appointment } = detection;
  const appointmentId = `manual-${String(messageId || eventId)}`;
  const appointmentPayload = {
    ...appointment,
    appointmentId,
    eventId: String(eventId || ""),
    phone: patientPhone,
    name: patientName,
  };

  if (confidence === "confirmed_partial") {
    const missingFields = Array.isArray(appointment.missingFields)
      ? appointment.missingFields
      : [];
    const missingLabel = missingFields.includes("scheduledTime")
      ? "horário"
      : "data";
    const incompletePayload = {
      ...appointmentPayload,
      status: "Aguardando confirmação",
      source:
        "WhatsApp — confirmação manual com agenda incompleta",
      notes:
        `Confirmação humana detectada, mas o ${missingLabel} não apareceu ` +
        "de forma inequívoca na conversa. Completar na aba Consultas.",
    };
    const registration = await deliverSheetsActionImpl(
      "upsert_appointment",
      { appointment: incompletePayload },
    );
    const recorded =
      registration.ok && registration.responseData?.ok !== false;

    await sendAppointmentEmailImpl(
      {
        eventId: `${eventId}-manual-booking-incomplete-email`,
        patientName,
        patientPhone,
        messageText: appointmentEmailBody({
          heading: recorded
            ? "AGENDAMENTO MANUAL REGISTRADO — COMPLETAR DADOS"
            : "AGENDAMENTO MANUAL INCOMPLETO — REVISÃO NECESSÁRIA",
          appointment: incompletePayload,
          detail: recorded
            ? `A linha foi criada em Consultas sem inventar o ${missingLabel}. Complete esse dado para ativar os lembretes.`
            : `Não foi possível criar a linha. Motivo: ${registration.errorCode || "registration_failed"}.`,
        }),
      },
      { deliverSheetsActionImpl },
    );

    return {
      status: recorded ? "recorded_incomplete" : "review_required",
      reserved: false,
      recorded,
      appointmentId:
        registration.responseData?.appointmentId || appointmentId,
      errorCode: recorded
        ? "missing_schedule_data"
        : registration.errorCode || "registration_failed",
    };
  }

  if (confidence === "confirmed") {
    const reservation = await deliverSheetsActionImpl(
      "reserve_appointment_slot",
      { appointment: appointmentPayload },
    );
    const reserved =
      reservation.ok &&
      reservation.responseData?.reserved === true;
    const duplicate = reservation.responseData?.duplicate === true;
    let registration = null;
    let recorded = reserved;

    if (!reserved) {
      registration = await deliverSheetsActionImpl(
        "upsert_appointment",
        {
          appointment: {
            ...appointmentPayload,
            status: "Agendada",
            source:
              "WhatsApp — confirmação manual fora da grade automática",
            notes:
              "A equipe confirmou este horário no WhatsApp. A linha foi preservada em Consultas mesmo sem reserva automática; conferir a grade de horários.",
          },
        },
      );
      recorded =
        registration.ok && registration.responseData?.ok !== false;
    }

    if (!duplicate || !reserved) {
      await sendAppointmentEmailImpl(
        {
          eventId: `${eventId}-manual-booking-email`,
          patientName,
          patientPhone,
          messageText: appointmentEmailBody({
            heading: reserved
              ? "AGENDAMENTO MANUAL CONFIRMADO E REGISTRADO"
              : recorded
                ? "AGENDAMENTO MANUAL REGISTRADO — CONFERIR GRADE"
                : "CONFIRMAÇÃO MANUAL DETECTADA — REVISÃO NECESSÁRIA",
            appointment: appointmentPayload,
            detail: reserved
              ? "A consulta foi registrada e o horário foi retirado dos disponíveis."
              : recorded
                ? `A consulta foi registrada em Consultas, mas o horário não foi bloqueado na grade automática. Motivo: ${reservation.errorCode || "slot_not_available"}.`
                : `O sistema não conseguiu registrar nem reservar automaticamente. Motivo: ${registration?.errorCode || reservation.errorCode || "registration_failed"}.`,
          }),
        },
        { deliverSheetsActionImpl },
      );
    }

    return {
      status: reserved
        ? "completed"
        : recorded
          ? "completed_with_schedule_review"
          : "review_required",
      reserved,
      recorded,
      duplicate,
      appointmentId:
        reservation.responseData?.appointmentId ||
        registration?.responseData?.appointmentId ||
        appointmentId,
      errorCode: reserved || recorded
        ? "none"
        : registration?.errorCode ||
          reservation.errorCode ||
          "registration_failed",
    };
  }

  let review = null;
  try {
    review = await createAppointmentReviewImpl(appointmentPayload);
  } catch {
    review = { ok: false, errorCode: "review_store_failed" };
  }
  const reviewUrl = review?.ok
    ? buildAppointmentReviewUrlImpl(review)
    : "";
  await sendAppointmentEmailImpl(
    {
      eventId: `${eventId}-possible-booking-email`,
      patientName,
      patientPhone,
      messageText: appointmentEmailBody({
        heading: "POSSÍVEL AGENDAMENTO MANUAL — CONFIRME",
        appointment: appointmentPayload,
        detail:
          "A conversa parece indicar um agendamento, mas não foi segura o bastante para alterar a agenda automaticamente.",
        reviewUrl,
      }),
    },
    { deliverSheetsActionImpl },
  );

  return {
    status: review?.ok ? "approval_requested" : "review_store_failed",
    reserved: false,
    reviewCreated: review?.ok === true,
    errorCode: review?.errorCode || "none",
  };
}

async function sendCurrentInboundReply({
  from,
  to,
  eventId,
  revisionEventId = eventId,
  body,
  currentText,
  recentConversation,
  conversationAction,
  replyDebounceMarkerStatus,
  patientRelationship,
}) {
  const debounceResult = await waitForLatestInboundReply({
    phone: to,
    eventId: revisionEventId,
    markerStatus: replyDebounceMarkerStatus,
    configuredDelayMs: process.env.WHATSAPP_REPLY_DEBOUNCE_MS,
  });

  if (!debounceResult.shouldProcess) {
    return {
      status: "superseded",
      errorCode: "newer_patient_message",
    };
  }

  const finalHumanGuard =
    await guardAutomaticReplyAgainstHumanRace({
      phone: to,
      configuredDelayMs:
        process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS,
    });
  if (!finalHumanGuard.shouldSend) {
    return {
      status: "superseded",
      errorCode: "human_reply_detected",
    };
  }

  const contactPreferenceGuard =
    await guardAutomaticContactPreference({
      phone: to,
      fallbackRelationship: patientRelationship,
    });
  if (!contactPreferenceGuard.shouldSend) {
    return {
      status: contactPreferenceGuard.status,
      errorCode: "contact_preference_no_bot",
    };
  }

  return sendControlledPatientReply({
    from,
    to,
    eventId,
    body,
    currentText,
    recentConversation,
    conversationAction,
  });
}

export default async (request, context) => {
  const webhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const automationMode = normalizeAutomationMode(
    process.env.WHATSAPP_AUTOMATION_MODE,
  );
  const durableRetry =
    request.headers.get("X-LIV-Durable-Retry") === "1";

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
      processingMode: "direct_with_background_completion",
      contactPreferencesGuard: "active",
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
    !verifyYCloudSignature(
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

    const echoText = String(echo.text?.body || "");
    if (isExternalProfessionalAppointmentMessage(echoText)) {
      const externalContext = await markExternalProfessionalContext({
        phone: patientPhone,
        at: String(
          echo.sendTime ||
            echo.createTime ||
            payload.createTime ||
            "",
        ),
      });
      const cleanup = await deliverSheetsAction(
        "remove_external_professional_contact",
        {
          contact: {
            phone: patientPhone,
            professional: "Dr. Henrique Lane Staniak",
          },
        },
      );

      return json({
        received: true,
        ignored: true,
        ignoreReason: "external_dr_henrique_appointment",
        externalContextStatus: externalContext.status,
        spreadsheetCleanupStatus: cleanup.ok
          ? "completed"
          : cleanup.errorCode,
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
    const manualAppointment = detectManualAppointment({
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
    let manualAppointmentResult = null;

    if (manualAppointment) {
      manualAppointmentResult =
        await completeManualAppointmentDetection({
          eventId: String(eventId),
          messageId: String(messageId),
          patientName: String(
            echo.customerProfile?.name ||
              payload.customerProfile?.name ||
              "",
          ),
          patientPhone,
          detection: manualAppointment,
        });
      appointmentSyncStatus = manualAppointmentResult.status;

      console.log(
        JSON.stringify({
          source: "appointment_confirmation_sync",
          eventId: String(eventId),
          patientLast4: patientPhone.slice(-4),
          status: appointmentSyncStatus,
          confidence: manualAppointment.confidence,
        }),
      );
    }

    const humanInteractionSync = await deliverSheetsAction(
      "touch_appointment",
      {
        appointment: {
          appointmentId:
            manualAppointmentResult?.appointmentId || "",
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
    const commitmentResolution =
      await resolvePatientCommitments(
        patientPhone,
        String(
          echo.sendTime ||
            echo.createTime ||
            payload.createTime ||
            "",
        ),
      );

    return json({
      received: true,
      humanTakeoverRecorded: true,
      takeoverCreated: takeoverDelivery.created === true,
      conversationMemory: memoryResult.status,
      humanResumeControl: humanResumeControl.status,
      appointmentSyncStatus,
      humanInteractionSyncStatus,
      commitmentsResolved:
        commitmentResolution.ok === true,
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
  let externalProfessionalContext =
    await getExternalProfessionalContext(phone);
  const directExternalProfessionalRequest =
    isExternalProfessionalAppointmentMessage(text);
  if (!externalProfessionalContext) {
    const rememberedConversation = await readConversationTurns(phone);
    const rememberedExternalAppointment = rememberedConversation.turns.some(
      (turn) => isExternalProfessionalAppointmentMessage(turn.text),
    );

    if (directExternalProfessionalRequest || rememberedExternalAppointment) {
      await markExternalProfessionalContext({ phone, at: contactAt });
      externalProfessionalContext = {
        professional: "dr_henrique_staniak",
      };
      await deliverSheetsAction(
        "remove_external_professional_contact",
        {
          contact: {
            phone,
            professional: "Dr. Henrique Lane Staniak",
          },
        },
      );
    }
  }
  if (
    externalProfessionalContext &&
    !isExplicitAmandaInquiry(text)
  ) {
    return json({
      received: true,
      ignored: true,
      ignoreReason: "external_dr_henrique_conversation",
      leadRecorded: false,
      appointmentReserved: false,
      aiShadowQueued: false,
      aiActiveQueued: false,
    });
  }
  if (
    externalProfessionalContext &&
    isExplicitAmandaInquiry(text)
  ) {
    await clearExternalProfessionalContext(phone);
  }
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
    const ignoredReplyMarker =
      await supersedePendingReplyForIgnoredInbound({
        phone,
        eventId: String(eventId),
        messageType: message.type,
        text,
      });

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
      const appointmentSelection =
        detectPatientAppointmentSelection({
          currentText: text,
          recentConversation:
            ignoredMemory.historyAfter,
          at: contactAt,
        });

      if (appointmentSelection) {
        const bookingResult =
          await completeSelectedAppointment({
            from: String(message.to || ""),
            eventId: String(eventId),
            messageId: String(messageId),
            patientName: String(
              message.customerProfile?.name || "",
            ),
            patientPhone: phone,
            selection: appointmentSelection,
          });

        return json({
          received: true,
          ignored: false,
          leadRecorded: false,
          appointmentSelectionDetected: true,
          appointmentReserved: bookingResult.reserved,
          appointmentConfirmationSent:
            bookingResult.confirmationSent,
          appointmentSelectionStatus:
            bookingResult.status,
          appointmentSelectionError:
            bookingResult.errorCode,
          aiShadowQueued: false,
          aiActiveQueued: false,
        });
      }

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
        replyDebounceMarkerStatus:
          ignoredReplyMarker.status,
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
      replyDebounceMarkerStatus:
        ignoredReplyMarker.status,
      aiShadowQueued: false,
      aiActiveQueued: false,
    });
  }

  // The spreadsheet uses this only to keep cardiology fully isolated from
  // the Amanda acquisition/conversion table. It never changes patient-facing
  // behavior.
  lead.professional = preliminaryAutomationPlan.professional;

  const recoveryRegistration =
    String(message.type || "").toLowerCase() === "text" &&
    text.trim()
      ? await registerInboundRecovery({
          rawBody,
          signature: request.headers.get("YCloud-Signature"),
          contentType:
            request.headers.get("content-type") || "application/json",
          origin: new URL(request.url).origin,
          eventId: String(eventId),
          phone,
        })
      : { status: "skipped" };

  const delivery = await deliverLead(lead);
  const patientRelationship = {
    ...(delivery.patientRelationship || {}),
    lookupStatus: delivery.patientRelationship
      ? "completed"
      : delivery.ok
        ? "not_returned"
        : delivery.errorCode,
  };
  let conversationHistory = [];
  let conversationHistoryWithCurrent = [];
  let conversationMemoryStatus = "skipped";
  let conversationExpired = false;
  let replyDebounceMarkerStatus = "skipped";
  let patientAppointmentSelection = null;
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
    exactMessageDuplicate && !recoveredExactDuplicate && !durableRetry;

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
      memoryResult.historyBefore.filter(
        (turn) => turn.eventId !== String(eventId),
      ),
    );
    conversationHistoryWithCurrent = toOpenAIConversation(
      memoryResult.historyAfter,
    );
    patientAppointmentSelection =
      detectPatientAppointmentSelection({
        currentText: text,
        recentConversation: memoryResult.historyAfter,
        at: contactAt,
      });
    patientAppointmentReply = patientAppointmentSelection
      ? null
      : detectPatientAppointmentReply({
          currentText: text,
          recentConversation: memoryResult.historyAfter,
          at: contactAt,
        });
  }
  if (!conversationHistoryWithCurrent.length) {
    conversationHistoryWithCurrent = conversationHistory;
  }

  if (
    patientAppointmentSelection &&
    !blocksAutomatedPatientMessages(patientRelationship)
  ) {
    const bookingResult =
      await completeSelectedAppointment({
        from: String(message.to || ""),
        eventId: String(eventId),
        messageId: String(messageId),
        patientName: String(
          message.customerProfile?.name || "",
        ),
        patientPhone: phone,
        selection: patientAppointmentSelection,
      });

    return json({
      received: true,
      leadRecorded: delivery.ok,
      leadInserted: delivery.inserted === true,
      leadUpdated: delivery.updated === true,
      duplicate: delivery.duplicate === true,
      duplicateReason: delivery.duplicateReason,
      conversationMemory: conversationMemoryStatus,
      appointmentSelectionDetected: true,
      appointmentReserved: bookingResult.reserved,
      appointmentConfirmationSent:
        bookingResult.confirmationSent,
      appointmentSelectionStatus:
        bookingResult.status,
      appointmentSelectionError:
        bookingResult.errorCode,
      aiShadowQueued: false,
      aiActiveQueued: false,
    });
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

  const baseAutomationPlan = humanTakeoverActive
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
  const relationshipAwarePlan =
    enrichPricePlanFromPatientRelationship(
      baseAutomationPlan,
      patientRelationship,
    );
  const automationPlan = applyPatientRelationshipPolicy(
    relationshipAwarePlan,
    patientRelationship,
  );

  const alertInput = {
    from: String(message.to || ""),
    eventId: String(eventId),
    patientName: String(message.customerProfile?.name || ""),
    patientPhone: phone,
    messageText: text,
    recentConversation: conversationHistoryWithCurrent,
    relationship: patientRelationship,
    urgent:
      automationPlan.reason === "possible_urgent_symptoms",
  };
  const professionalFactReview =
    buildProfessionalFactPartialReview({
      currentText: text,
      recentConversation: conversationHistory,
      patientName: String(message.customerProfile?.name || ""),
      procedure: automationPlan.procedure,
    });
  const appointmentReviewCandidate =
    isAppointmentReviewCandidate(
      automationPlan,
      text,
      conversationHistory,
    ) &&
    ![
      "appointment_scheduled",
      "consultation_completed",
      "surgical_planning",
      "active_postop",
    ].includes(
      automationPlan.patientRelationship?.state,
    );
  const conversationAction = decideConversationAction({
    text,
    messageType: message.type,
    plan: automationPlan,
    recentConversation: conversationHistory,
    humanTakeoverActive,
    exactDuplicate: suppressExactDuplicate,
    schedulingRequest: appointmentReviewCandidate,
  });
  const shouldQueueAppointmentReview =
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    conversationAction.allowAlert &&
    appointmentReviewCandidate &&
    isAppointmentAlertEnabled() &&
    isReviewAlertConfigured();
  const priceReviewCandidate = isSurgicalPriceReview(
    {
      route: automationPlan.route,
      reviewReason: automationPlan.reason,
    },
    automationPlan,
  );
  const shouldQueueReviewAlert =
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    conversationAction.allowAlert &&
    !shouldQueueAppointmentReview &&
    isReviewAlertConfigured() &&
    shouldSendReviewAlertForPlan(automationPlan);
  const outsideHumanServiceHours =
    isOutsideHumanServiceHours(contactAt);
  const shouldQueuePriceHolding =
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    conversationAction.allowHoldingReply &&
    automationMode === "active" &&
    priceReviewCandidate &&
    shouldQueueReviewAlert;
  const overnightReason = overnightHandoffReason(
    automationPlan,
    appointmentReviewCandidate,
  );
  const shouldQueueOvernightHandoff =
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    conversationAction.allowHoldingReply &&
    !priceReviewCandidate &&
    Boolean(overnightReason) &&
    outsideHumanServiceHours &&
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
  let priceHoldingQueued = false;
  let priceHoldingSent = false;
  let priceHoldingStatus = "not_queued";
  let overnightHandoffStatus = "not_queued";
  let patientReplyStatus = "not_queued";
  let aiActiveQueued = false;
  let aiActiveStatus = "not_queued";
  let aiActiveReplySent = false;
  let humanResumeScheduleStatus = "skipped";
  let commitmentSyncStatus = "skipped";
  let professionalFactReplySent = false;
  let professionalFactReplyStatus = "not_queued";

  const patientCommitment =
    delivery.ok &&
    !suppressExactDuplicate &&
    conversationAction.allowAlert
      ? buildPatientCommitment({
          eventId: String(eventId),
          phone,
          plan: automationPlan,
          appointmentReview:
            shouldQueueAppointmentReview,
          receivedAt: String(
            message.sendTime ||
              payload.createTime ||
              "",
          ),
        })
      : null;

  if (patientCommitment) {
    const commitmentResult =
      await recordPatientCommitment(patientCommitment);
    commitmentSyncStatus = commitmentResult.ok
      ? commitmentResult.responseData?.duplicate
        ? "duplicate"
        : "completed"
      : commitmentResult.errorCode;
  }

  if (
    delivery.ok &&
    humanTakeoverActive &&
    automationMode === "active" &&
    !suppressExactDuplicate &&
    conversationAction.scheduleHumanResume
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
      expectedHumanGeneration:
        humanResumeControl?.generation || "",
      receivedAt: String(
        message.sendTime || payload.createTime || "",
      ),
    });
    humanResumeScheduleStatus = scheduleResult.status;
  } else if (
    delivery.ok &&
    humanTakeoverActive &&
    automationMode === "active" &&
    !suppressExactDuplicate
  ) {
    const cancelResult =
      await cancelPendingHumanResume(phone);
    humanResumeScheduleStatus =
      cancelResult.status === "completed"
        ? "cancelled_no_pending_request"
        : cancelResult.status;
  }

  if (
    professionalFactReview &&
    delivery.ok &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    automationMode === "active"
  ) {
    const partialReplyResult = await sendCurrentInboundReply({
      from: String(message.to || ""),
      to: phone,
      eventId: `${String(eventId)}-verified-partial`,
      revisionEventId: String(eventId),
      body: professionalFactReview.safeReply,
      currentText: text,
      recentConversation: conversationHistory,
      conversationAction,
      replyDebounceMarkerStatus,
      patientRelationship,
    });
    professionalFactReplySent =
      partialReplyResult.status === "completed";
    professionalFactReplyStatus = partialReplyResult.status;
    logPatientReplyResult(
      `${String(eventId)}-verified-partial`,
      phone,
      partialReplyResult,
    );

    if (professionalFactReplySent) {
      await appendConversationTurn({
        phone,
        role: "assistant",
        text: professionalFactReview.safeReply,
        eventId: `${String(eventId)}:verified-partial`,
        source: "bruna",
      });
    }
  }

  if (shouldQueueReviewAlert) {
    const alertPromise = completeReviewAlert(
      professionalFactReview
        ? {
            ...alertInput,
            messageText: buildProfessionalFactReviewAlert({
              review: professionalFactReview,
              patientMessage: text,
              safeReplySent: professionalFactReplySent,
            }),
          }
        : prepareReviewAlertInput(alertInput, {
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

  if (shouldQueuePriceHolding) {
    priceHoldingQueued = true;
    const priceHoldingBody = buildSurgicalPriceHoldingReply({
      patientName: String(message.customerProfile?.name || ""),
      procedure: automationPlan.procedure,
      overnight: outsideHumanServiceHours,
    });
    const priceHoldingResult = await sendCurrentInboundReply({
      from: String(message.to || ""),
      to: phone,
      eventId: `${String(eventId)}-price-holding`,
      revisionEventId: String(eventId),
      body: priceHoldingBody,
      currentText: text,
      recentConversation: conversationHistory,
      conversationAction,
      replyDebounceMarkerStatus,
      patientRelationship,
    });
    priceHoldingSent =
      priceHoldingResult.status === "completed";
    priceHoldingStatus = priceHoldingResult.status;
    logPatientReplyResult(
      `${String(eventId)}-price-holding`,
      phone,
      priceHoldingResult,
    );

    if (priceHoldingSent) {
      await appendConversationTurn({
        phone,
        role: "assistant",
        text: priceHoldingBody,
        eventId: `${String(eventId)}:price-holding`,
        source: "bruna",
      });
    }
  }

  if (shouldQueueOvernightHandoff) {
    overnightHandoffQueued = true;
    const overnightBody =
      buildOvernightHandoffMessage(overnightReason);
    const overnightResult = await sendCurrentInboundReply({
      from: String(message.to || ""),
      to: phone,
      eventId: `${String(eventId)}-overnight-handoff`,
      revisionEventId: String(eventId),
      body: overnightBody,
      currentText: text,
      recentConversation: conversationHistory,
      conversationAction,
      replyDebounceMarkerStatus,
      patientRelationship,
    });
    overnightHandoffSent =
      overnightResult.status === "completed";
    overnightHandoffStatus = overnightResult.status;
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
    conversationAction.allowAutomaticReply &&
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
    const replyResult = await sendCurrentInboundReply({
      from: String(message.to || ""),
      to: phone,
      eventId: String(eventId),
      body: patientReplyBody,
      currentText: text,
      recentConversation: conversationHistory,
      conversationAction,
      replyDebounceMarkerStatus,
      patientRelationship,
    });
    patientReplySent = replyResult.status === "completed";
    patientReplyStatus = replyResult.status;
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
    conversationAction.allowAutomaticReply &&
    automationPlan.professional !== "daniel" &&
    !appointmentReviewCandidate &&
    !suppressExactDuplicate &&
    !professionalFactReview;
  const shouldQueueOpenAIActive =
    delivery.ok &&
    !humanTakeoverActive &&
    automationMode === "active" &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0 &&
    automationPlan.route === "standard_reply" &&
    conversationAction.allowAutomaticReply &&
    automationPlan.professional !== "daniel" &&
    !appointmentReviewCandidate &&
    !suppressExactDuplicate &&
    !professionalFactReview;
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
        patientRelationship:
          patientRelationshipPromptContext(
            patientRelationship,
          ),
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
        patientRelationship:
          patientRelationshipPromptContext(
            patientRelationship,
          ),
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
      conversationAction,
      patientRelationship,
    });

    aiActiveQueued = true;

    if (typeof context?.waitUntil === "function") {
      aiActiveStatus = "deferred";
      try {
        context.waitUntil(activePromise);
      } catch {
        const outcome = await activePromise;
        aiActiveStatus = outcome?.status || "failed";
        aiActiveReplySent = outcome?.replySent === true;
      }
    } else {
      const outcome = await activePromise;
      aiActiveStatus = outcome?.status || "failed";
      aiActiveReplySent = outcome?.replySent === true;
    }
  }

  const terminalSendStatuses = new Set([
    "completed",
    "duplicate",
    "blocked",
    "superseded",
  ]);
  const automaticWorkFinished =
    delivery.ok &&
    (!aiActiveQueued || !["failed", "deferred"].includes(aiActiveStatus)) &&
    (!priceHoldingQueued || terminalSendStatuses.has(priceHoldingStatus)) &&
    (!overnightHandoffQueued || terminalSendStatuses.has(overnightHandoffStatus)) &&
    (!patientReplyQueued || terminalSendStatuses.has(patientReplyStatus));
  let recoveryStatus = recoveryRegistration.status;
  if (automaticWorkFinished && recoveryRegistration.status !== "skipped") {
    const recoveryCompletion = await completeInboundRecovery(
      { eventId: String(eventId) },
      {
        outcome: humanTakeoverActive
          ? "human_takeover"
          : "processed",
      },
    );
    recoveryStatus = recoveryCompletion.status;
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
      commitmentSyncStatus,
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
      patientRelationship:
        automationPlan.patientRelationship?.state || "unknown",
      patientRelationshipLookup:
        patientRelationship.lookupStatus || "unknown",
      conversationAction: conversationAction.action,
      conversationActionReason: conversationAction.reason,
      conversationState: conversationAction.state,
      conversationOwner: conversationAction.owner,
      conversationNextAction: conversationAction.nextAction,
      conversationUnresolvedRequest:
        conversationAction.unresolvedRequest,
      conversationFollowupPolicy:
        conversationAction.followupPolicy,
      reviewAlertQueued,
      appointmentReviewQueued,
      patientReplyQueued,
      patientReplySent,
      overnightHandoffQueued,
      overnightHandoffSent,
      priceHoldingQueued,
      priceHoldingSent,
      aiShadowQueued,
      aiActiveQueued,
      aiActiveStatus,
      aiActiveReplySent,
      professionalFactReplySent,
      professionalFactReplyStatus,
      replyDebounceMarkerStatus,
      recoveryStatus,
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
    commitmentSyncStatus,
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
      patientRelationship:
        automationPlan.patientRelationship?.state || "unknown",
    },
    conversationAction: {
      action: conversationAction.action,
      reason: conversationAction.reason,
      unresolvedRequest:
        conversationAction.unresolvedRequest,
      followupPolicy:
        conversationAction.followupPolicy,
      minimumFollowupDelayHours:
        conversationAction.minimumFollowupDelayHours,
    },
    reviewAlertQueued,
    appointmentReviewQueued,
    patientReplyQueued,
    patientReplySent,
    overnightHandoffQueued,
    overnightHandoffSent,
    priceHoldingQueued,
    priceHoldingSent,
    aiShadowQueued,
    aiActiveQueued,
    aiActiveStatus,
    aiActiveReplySent,
    professionalFactReplySent,
    professionalFactReplyStatus,
    recoveryStatus,
  });
};

export const config = {
  // Keep the patient-facing webhook on the simplest path. Expensive reply
  // work still uses `context.waitUntil` when Netlify provides it, while the
  // final outbound lock prevents a concurrent human or retry from duplicating
  // the response.
  path: "/api/ycloud/webhook",
};
