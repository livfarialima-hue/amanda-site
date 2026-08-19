import {
  enrichAutomationPlanFromConversation,
  hasCampaignReferenceCode,
  inboundReplyPriority,
  isAvailabilityRequest,
  isConsultationInformationRequest,
  isConsultationPriceRequest,
  isLikelyMarketingPrefilledMessage,
  isSchedulingRequest,
  normalizeAutomationMode,
  planAutomation,
} from "./lib/whatsapp-automation.mjs";
import {
  buildAppointmentPreferenceCollectionReply,
  buildAppointmentSuggestion,
  hasAppointmentPreferenceInConversation,
  isAppointmentAlertEnabled,
  isAppointmentOfferAcceptance,
  isAppointmentPreferenceReply,
} from "./lib/appointment-suggestions.mjs";
import {
  buildAppearanceDistressReviewReply,
  buildCampaignReferenceExplanationReply,
  buildConsultationInformationReply,
  buildImageAcknowledgementReply,
  buildInsuranceAcceptanceReply,
  buildInsuranceCoverageReply,
  buildMarketingPrefilledOpeningReply,
  buildOfficialChannelsReply,
  buildPatientReply,
  hasPendingReactivationHandoff,
  shouldSendAutomaticPatientReply,
  shouldSendOpenAIPatientReply,
} from "./lib/patient-replies.mjs";
import {
  normalizeDuplicateReason,
} from "./lib/lead-deduplication.mjs";
import {
  appendConversationTurn,
  hydrateConversationMemory,
  readConversationTurns,
  toOpenAIConversation,
  updateConversationSemanticState,
} from "./lib/conversation-memory.mjs";
import {
  getDurableConversationContext,
} from "./lib/conversation-ledger.mjs";
import {
  clearExternalProfessionalContext,
  detectExternalProfessionalAppointment,
  getExternalProfessionalContext,
  isExplicitAmandaInquiry,
  markExternalProfessionalContext,
} from "./lib/external-professional-context.mjs";
import { runOpenAIShadow } from "./lib/openai-shadow.mjs";
import {
  buildUnknownHoldingReply,
  classifyLearningRisk,
  isKnowledgeDecision,
  isUnknownClarificationDecision,
  isUnknownReviewDecision,
  knowledgeRuleId,
  learningSubject,
  shouldDigestLearningDecision,
} from "./lib/knowledge-learning.mjs";
import {
  checkLatestInboundReply,
  getLatestInboundReplyMarker,
  markLatestInboundForReply,
  shouldRecoverExactDuplicateRetry,
  waitForLatestInboundReply,
} from "./lib/reply-debounce.mjs";
import {
  isReviewAlertConfigured,
  sendReviewAlertEmailCopy,
  sendYCloudReviewAlert,
} from "./lib/ycloud-review-alert.mjs";
import {
  getRecommendedSiteResource,
  isDirectSiteRequest,
} from "./lib/site-content.mjs";
import {
  buildPendingHospitalQuoteAlert,
  buildPriceReviewAlert,
  buildSurgicalInitialPriceReply,
  buildSurgicalPriceHoldingReply,
  buildSurgicalPriceSuggestedReply,
  isSurgicalPriceReview,
} from "./lib/surgical-price-review.mjs";
import {
  cancelPendingHumanResume,
  getHumanResumeControl,
  markBrunaResumed,
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
  nextHumanResumeServiceTime,
  shouldSendOvernightHandoff,
} from "./lib/human-resume-policy.mjs";
import {
  decideConversationAction,
  hasUnresolvedPatientRequest,
  isExplicitNightPause,
  isReplyToHumanContextWithoutStandaloneRequest,
  isShortAffirmativeReplyToHumanQuestion,
} from "./lib/conversation-action-controller.mjs";
import {
  buildExtremeNightAcknowledgement,
  buildExtremeNightEmailAlert,
  hasExtremeNightAcknowledgement,
  isExtremeNight,
} from "./lib/extreme-night-policy.mjs";
import {
  sendControlledPatientReply,
} from "./lib/outbound-reply-gate.mjs";
import {
  buildSemanticReplyConversationAction,
  CONTEXT_CLARIFICATION_CODE,
  CONTEXT_CONTINUATION_CODE,
  prepareSemanticContextContinuationAction,
  semanticDecisionConfirmsDeterministicReply,
} from "./lib/semantic-reply-policy.mjs";
export { semanticDecisionConfirmsDeterministicReply };
import {
  attributionClaimantId,
  writeOperationalLog,
} from "./lib/operational-log.mjs";
export { buildOperationalLogRecord } from "./lib/operational-log.mjs";
import {
  extractAttributionJourneyToken,
  resolveAttributionJourney,
} from "./lib/attribution-journey-store.mjs";

import {
  completeInboundRecovery,
  registerInboundRecovery,
  settleDeferredInboundRecovery,
  shouldAwaitActiveReplyBeforeAcknowledgement,
  shouldCompleteInboundRecovery,
  shouldSuppressExactInboundDuplicate,
} from "./lib/inbound-recovery.mjs";
import {
  applyPatientRelationshipPolicy,
  blocksAutomatedPatientMessages,
  buildPatientCommitment,
  buildRelationshipAlertMessage,
  normalizePatientRelationship,
  patientRelationshipPromptContext,
  prependRelationshipAlertContext,
} from "./lib/patient-relationship.mjs";
import { verifyYCloudSignature } from "./lib/ycloud-webhook-security.mjs";
import {
  buildProfessionalFactPartialReview,
  buildProfessionalFactReviewAlert,
} from "./lib/professional-fact-review.mjs";
import {
  resolvePatientDisplayName,
  usableProfileFirstName,
} from "./lib/profile-name.mjs";
import {
  hasConfiguredInternalTeamPhones,
  isInternalTeamPhone,
} from "./lib/internal-team-phones.mjs";

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

function matchStructuredSiteReference(value, anchored = false) {
  const boundary = anchored ? "^\\s*" : "\\b";
  const pattern = new RegExp(
    `${boundary}(` +
      `(?:SITE-[A-Z0-9_]+(?:-[A-Z0-9_]+)*)|` +
      `(?:G26[A-Z0-9]{2,16}(?:-[A-Z0-9_]+)*)|` +
      `(?:M26[A-Z]\\d{2}[A-Z](?:-[A-Z0-9_]+)*)` +
      `)(?![A-Z0-9_-])`,
    "i",
  );
  const match = String(value || "").match(pattern);
  if (!match) return null;

  const reference = match[1];
  if (/^SITE-/i.test(reference)) {
    return { value: reference, family: "site_page" };
  }
  if (/^G26/i.test(reference)) {
    return { value: reference, family: "google" };
  }
  return { value: reference, family: "meta" };
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
  // M26F01W | C06H01 | Lifting facial | novo ciclo 40+ | WA direto
  "120251254720680627": "M26F01W-C06H01",
  // M26C01W | C07H01 | Lifting cervical | WA direto
  "120251248762170627": "M26C01W-C07H01",
  // M26C02S | C07H01 | Lifting cervical | Site -> WhatsApp
  "120251249058760627": "M26C02S-C07H01",
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
  const structuredSiteReference = matchStructuredSiteReference(value, anchored);
  if (structuredSiteReference) return structuredSiteReference;

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

export function attributionFallbackReason(referenceCategory) {
  switch (String(referenceCategory || "")) {
    case "meta_uncoded":
      return "meta_referral_without_mapped_code";
    case "meta_ad_id":
      return "meta_ad_id_without_campaign_mapping";
    case "google_click_id":
      return "google_click_without_campaign_code";
    case "site_uncoded":
      return "site_source_without_campaign_code";
    case "whatsapp_uncoded":
      return "direct_or_unknown_without_code";
    default:
      return "";
  }
}

function platformFromJourneyChannel(channel) {
  switch (String(channel || "")) {
    case "meta_ads":
      return "Meta";
    case "google_ads":
      return "Google";
    case "organic_search":
    case "ai_referral":
    case "social_organic":
    case "referral":
      return "Orgânico/Conteúdo";
    case "direct":
      return "WhatsApp direto";
    default:
      return "Não identificada";
  }
}

function referenceCategoryFromJourney(journey, platform) {
  const campaignCode = String(
    journey?.first_touch?.campaign_code || "",
  );
  if (platform === "Meta") return campaignCode ? "meta_coded" : "meta_uncoded";
  if (platform === "Google") {
    return campaignCode ? "google_coded" : "google_click_id";
  }
  if (platform === "Orgânico/Conteúdo") return "site_page";
  return "whatsapp_uncoded";
}

export function normalizeResolvedJourneyAttribution(journey) {
  if (!journey || journey.version !== 1 || !journey.first_touch) return null;
  const first = journey.first_touch || {};
  const current = journey.last_touch || first;
  const platform = platformFromJourneyChannel(first.channel);
  const referenceCategory = referenceCategoryFromJourney(journey, platform);
  const confidence = String(journey.confidence || "unknown");
  const fallbackReason = String(
    journey.fallback_reason || attributionFallbackReason(referenceCategory),
  );

  return {
    resolved: true,
    initialOrigin: String(first.origin || "Desconhecida"),
    initialChannel: String(first.channel || "unknown"),
    currentOrigin: String(current.origin || "Desconhecida"),
    currentChannel: String(current.channel || "unknown"),
    conversionPath: String(journey.conversion_path || "unknown"),
    // Backward-compatible aliases always describe the first touch. Never mix
    // a later paid touch into columns labelled as initial.
    campaignCode: String(first.campaign_code || ""),
    adgroupCode: String(first.adgroup_code || ""),
    creativeCode: String(first.creative_code || ""),
    metaCampaignId: String(first.meta_campaign_id || ""),
    metaAdsetId: String(first.meta_adset_id || ""),
    metaAdId: String(first.meta_ad_id || ""),
    initialCampaignCode: String(first.campaign_code || ""),
    initialAdgroupCode: String(first.adgroup_code || ""),
    initialCreativeCode: String(first.creative_code || ""),
    initialMetaCampaignId: String(first.meta_campaign_id || ""),
    initialMetaAdsetId: String(first.meta_adset_id || ""),
    initialMetaAdId: String(first.meta_ad_id || ""),
    currentCampaignCode: String(current.campaign_code || ""),
    currentAdgroupCode: String(current.adgroup_code || ""),
    currentCreativeCode: String(current.creative_code || ""),
    currentMetaCampaignId: String(current.meta_campaign_id || ""),
    currentMetaAdsetId: String(current.meta_adset_id || ""),
    currentMetaAdId: String(current.meta_ad_id || ""),
    landingPage: String(first.page_path || ""),
    ctaPage: String(journey.cta?.page_path || ""),
    ctaLocation: String(journey.cta?.location || ""),
    firstTouchAt: String(first.occurred_at || ""),
    lastTouchAt: String(current.occurred_at || ""),
    confidence,
    fallbackReason,
    platform,
    referenceCategory,
    clickIds: { ...(journey.click_ids || {}) },
  };
}

function canonicalReferenceFromJourney(attribution) {
  if (!attribution || !attribution.initialCampaignCode) return "";
  const landingSlug = String(attribution.landingPage || "")
    .split("/")
    .filter(Boolean)
    .pop() || "";
  return [
    attribution.initialCampaignCode,
    attribution.initialCreativeCode,
    landingSlug,
  ].filter(Boolean).join("-");
}

export async function resolveInboundAttributionJourney(
  text,
  {
    resolveImpl = resolveAttributionJourney,
    claimantId = "",
  } = {},
) {
  const token = extractAttributionJourneyToken(text);
  if (!token) return { status: "absent", journey: null };
  if (!claimantId) return { status: "unavailable", journey: null };
  try {
    const journey = await resolveImpl(token, { claimantId });
    return journey
      ? { status: "resolved", journey }
      : { status: "not_found", journey: null };
  } catch {
    return { status: "unavailable", journey: null };
  }
}

export function stripAttributionTransportToken(text) {
  return String(text || "")
    .replace(
      /(?:\r?\n)?\s*JID\s*:\s*J1_[A-Za-z0-9_-]{22}(?![A-Za-z0-9_-])/gi,
      "",
    )
    .trim();
}

export function classifyAttribution(payload, message, text, resolvedJourney) {
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
  const journeyAttribution = normalizeResolvedJourneyAttribution(
    resolvedJourney,
  );
  const clickIds = {
    ...extractClickIds(text),
    ...(journeyAttribution?.clickIds || {}),
  };

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

  const legacyResult = {
    reference: referenceValue,
    platform,
    referenceCategory,
    fallbackReason: attributionFallbackReason(referenceCategory),
    clickIds,
  };

  if (!journeyAttribution) return legacyResult;
  return {
    ...legacyResult,
    reference: canonicalReferenceFromJourney(journeyAttribution) ||
      legacyResult.reference,
    platform: journeyAttribution.platform,
    referenceCategory: journeyAttribution.referenceCategory,
    fallbackReason: journeyAttribution.fallbackReason,
    clickIds,
    journey: journeyAttribution,
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

export function sheetsActionTimeoutMs(action, configuredValue) {
  if (String(action || "") !== "append_lead") return 8_000;
  const configured = Number.parseInt(String(configuredValue || ""), 10);
  if (!Number.isFinite(configured)) return 20_000;
  return Math.min(Math.max(configured, 8_000), 25_000);
}

async function deliverSheetsAction(action, payload) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

  if (!url || !secret) {
    return deliveryResult(false, null, "configuration_missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    sheetsActionTimeoutMs(
      action,
      process.env.GOOGLE_SHEETS_APPEND_TIMEOUT_MS,
    ),
  );

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
    routed: responseData?.routed !== false,
    opportunityId: String(responseData?.opportunityId || ""),
    professional: String(responseData?.professional || ""),
    routeStatus: String(responseData?.routeStatus || ""),
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

async function getBotKnowledgeContext(knowledge) {
  const result = await deliverSheetsAction(
    "get_bot_knowledge_context",
    { knowledge },
  );
  return result.ok
    ? {
        candidates: result.responseData?.candidates || [],
        pendingQuestion: result.responseData?.pendingQuestion || null,
      }
    : { candidates: [], pendingQuestion: null };
}

async function recordBotUnknownQuestion(learning) {
  return deliverSheetsAction(
    "record_bot_unknown_question",
    { learning },
  );
}

async function recordHumanLearningAnswer(answer) {
  return deliverSheetsAction(
    "record_human_learning_answer",
    { answer },
  );
}

async function recordBotKnowledgeUsage(usage) {
  return deliverSheetsAction(
    "record_bot_knowledge_usage",
    { usage },
  );
}

async function recordOperationalEvent(event) {
  return deliverSheetsAction(
    "record_operational_event",
    { event },
  );
}

async function recordAutomaticReplyOperationally({
  result,
  eventId,
  parentEventId,
  opportunityId,
  phone,
  professional,
}) {
  if (!["completed", "duplicate"].includes(result?.status)) return;
  try {
    await recordOperationalEvent({
      eventId,
      parentEventId,
      opportunityId,
      phone,
      professional,
      type: "automatic_reply_sent",
      source: "bruna",
      at: new Date().toISOString(),
      outcome: result.status,
    });
  } catch (error) {
    writeOperationalLog({
      source: "operational_event_write_failed",
      category: "operational_event",
      reason: "request_failed",
      sourceId: eventId,
      fields: { errorCode: "request_failed" },
    }, "error");
  }
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
    writeOperationalLog({
      source: `openai_${executionMode}_completed`,
      category: "openai_execution",
      reason: "completed",
      sourceId: eventId,
      fields: {
        model: result.model,
        route: result.decision.route,
        confidence: result.decision.confidence,
        automaticAllowed: result.decision.automaticAllowed,
        suggestedReplyLength: String(
          result.decision.suggestedReply || "",
        ).length,
        policyVersion: process.env.BRUNA_POLICY_VERSION || "unversioned",
        promptVersion: process.env.BRUNA_PROMPT_VERSION || "unversioned",
        knowledgeSnapshot:
          process.env.BRUNA_KB_SNAPSHOT || "unversioned",
        schemaVersion: "bruna-decision-v2",
        usage: result.usage,
      },
    });
    return;
  }

  writeOperationalLog({
    source: `openai_${executionMode}_failed`,
    category: "openai_execution",
    reason: "failed",
    sourceId: eventId,
    fields: {
      httpStatus: result.httpStatus ?? null,
      errorCode: result.errorCode || "unknown_failure",
    },
  });
}

function shouldSendReviewAlertForPlan(plan) {
  return (
    plan?.route === "human_review" ||
    plan?.route === "daniel_greeting_and_alert" ||
    plan?.route === "reactivation_notice"
  );
}

function shouldSendReviewAlertForDecision(decision) {
  if (shouldDigestLearningDecision(decision)) return false;
  return (
    decision?.urgent === true ||
    decision?.route === "human_review" ||
    decision?.route === "daniel_greeting_and_alert"
  );
}

function logReviewAlertResult(eventId, phone, alertResult) {
  const completed = alertResult.status === "completed";
  writeOperationalLog({
    source: completed
      ? "ycloud_review_alert_completed"
      : "ycloud_review_alert_failed",
    category: "review_alert_delivery",
    reason: completed ? "completed" : "failed",
    sourceId: eventId,
    fields: {
      httpStatus: alertResult.httpStatus ?? null,
      errorCode: alertResult.errorCode || "none",
    },
  });
}

function logPatientReplyResult(eventId, phone, replyResult) {
  const completed = replyResult.status === "completed";
  writeOperationalLog({
    source: completed
      ? "ycloud_patient_reply_completed"
      : "ycloud_patient_reply_failed",
    category: "reply_delivery",
    reason: completed ? "completed" : "failed",
    sourceId: eventId,
    fields: {
      httpStatus: replyResult.httpStatus ?? null,
      errorCode: replyResult.errorCode || "none",
    },
  });
}

function prepareReviewAlertInput(input, { decision, plan } = {}) {
  const planReason = [plan?.reason, plan?.requestReason]
    .filter(Boolean)
    .join(" ");
  if (/\bintense_appearance_distress\b/.test(planReason)) {
    return {
      ...input,
      messageText: [
        buildRelationshipAlertMessage({
          messageText: input.messageText,
          patientName: input.patientName,
          relationship: input.relationship,
        }),
        "Sugestão para copiar após conferir:",
        buildAppearanceDistressReviewReply({
          patientName: input.patientName,
        }),
      ].filter(Boolean).join("\n"),
    };
  }

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
          referenceCategory: input.referenceCategory,
          sourceReference: input.reference,
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

async function completeExtremeNightEmail(input) {
  try {
    const result = await sendReviewAlertEmailCopy(input);
    writeOperationalLog({
      source: "extreme_night_email_copy",
      category: "review_alert_delivery",
      reason: result.status || "unknown",
      sourceId: input.eventId,
      fields: {
        status: result.status,
        httpStatus: result.httpStatus || null,
        errorCode: result.errorCode || null,
        duplicate: result.duplicate === true,
      },
    });
    return result;
  } catch {
    writeOperationalLog({
      source: "extreme_night_email_copy",
      category: "review_alert_delivery",
      reason: "failed",
      sourceId: input.eventId,
      fields: { errorCode: "request_failed" },
    });
    return { status: "failed", errorCode: "request_failed" };
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
  const prefilledAvailabilityRequest =
    standaloneMarketingPrefilledMessage &&
    isAvailabilityRequest(text);

  return Boolean(
    (!standaloneMarketingPrefilledMessage || prefilledAvailabilityRequest) &&
    plan?.professional === "amanda" &&
      (
        isSchedulingRequest(text) ||
        isAppointmentOfferAcceptance(text, recentConversation) ||
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

  writeOperationalLog({
    source: "appointment_review_prepared",
    category: "appointment_review",
    reason: "prepared",
    sourceId: input.eventId,
    fields: {
      availabilityRead: availability.ok ? "success" : "failure",
      availableSlots: availability.slots.length,
      preferenceCaptured: Boolean(
        input.preferenceText || input.messageText,
      ),
      downstreamStatus: availability.httpStatus,
      downstreamError: availability.errorCode,
    },
  });

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
    opportunityId,
    professional,
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
    cancelPendingHumanResumeImpl = cancelPendingHumanResume,
  } = {},
) {
  const {
    silentConfirmation = false,
    ...appointmentSelection
  } = selection || {};
  const selectedProfessional =
    appointmentSelection.professional || professional || "";
  const requiresHumanConfirmation =
    String(
      process.env.APPOINTMENT_PATIENT_SELECTION_REQUIRES_HUMAN || "true",
    ).toLowerCase() !== "false";
  if (requiresHumanConfirmation && !silentConfirmation) {
    const pendingRecord = await deliverSheetsActionImpl(
      "record_pending_appointment_selection",
      {
        appointment: {
          ...appointmentSelection,
          eventId,
          opportunityId,
          phone: patientPhone,
          name: patientName,
          professional: selectedProfessional,
        },
      },
    );
    const suggestedConfirmation = buildBookedAppointmentReply({
      patientName,
      ...appointmentSelection,
      professional: selectedProfessional,
    });
    const reviewAlert = {
      from,
      eventId: `${eventId}-booking-human-confirmation`,
      patientName,
      patientPhone,
      messageText: [
        "HORÁRIO ESCOLHIDO — AGUARDANDO CONFIRMAÇÃO HUMANA",
        `Data escolhida: ${appointmentSelection.scheduledDate || "não informada"}`,
        `Horário escolhido: ${appointmentSelection.scheduledTime || "não informado"}`,
        `Profissional: ${selectedProfessional || "confirmar"}`,
        pendingRecord.ok
          ? "A escolha foi registrada na planilha, sem reservar a agenda."
          : `Registro pendente: ${pendingRecord.errorCode || "falha técnica"}`,
        "Após conferir e registrar o horário, envie:",
        suggestedConfirmation || "Confirmar manualmente com a paciente.",
      ].join("\n"),
    };
    await sendAppointmentEmailImpl(reviewAlert, {
      deliverSheetsActionImpl,
    });
    await completeReviewAlertImpl(reviewAlert);
    return {
      status: "pending_human_confirmation",
      reserved: false,
      confirmationSent: false,
      pendingRecorded: pendingRecord.ok === true,
      errorCode: pendingRecord.ok
        ? "none"
        : pendingRecord.errorCode || "pending_record_failed",
    };
  }
  const baselineControl =
    await getHumanResumeControlImpl(patientPhone);
  const reservation = await deliverSheetsActionImpl(
    "reserve_appointment_slot",
    {
      appointment: {
        ...appointmentSelection,
        eventId,
        appointmentId: `whatsapp-${messageId || eventId}`,
        opportunityId,
        phone: patientPhone,
        name: patientName,
      },
    },
  );

  if (!reservation.ok || reservation.responseData?.reserved !== true) {
    const firstName = usableProfileFirstName(patientName);
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
          appointment: appointmentSelection,
          detail:
            "A consulta foi registrada na aba Consultas e o horário foi retirado dos disponíveis.",
        }),
      },
      { deliverSheetsActionImpl },
    );
  }

  await cancelPendingHumanResumeImpl(patientPhone);

  if (silentConfirmation) {
    return {
      status: "recorded_silently",
      reserved: true,
      confirmationSent: false,
      errorCode: "none",
    };
  }

  const body = buildBookedAppointmentReply({
    patientName,
    ...appointmentSelection,
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
      `Escolha do horário ${appointmentSelection.scheduledDate} ${appointmentSelection.scheduledTime}`,
    recentConversation: [],
    opportunityId,
    professional: selectedProfessional,
    conversationAction: {
      action: "respond",
      allowHoldingReply: false,
      replyContract: {
        version: "reply-contract-v1",
        allowedResponseKind: "direct_answer",
        maxQuestions: 0,
        maxLinks: 0,
        allowCta: false,
        allowAppointmentConfirmation: true,
      },
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
    const shadowResult = await runOpenAIShadow({
      ...input,
      policyHints: plan,
    });
    logOpenAIResult(input.eventId, shadowResult, "shadow");
    return {
      status: shadowResult.status,
      replySent: false,
      sideEffects: false,
    };
  } catch {
    writeOperationalLog({
      source: "openai_shadow_failed",
      category: "openai_execution",
      reason: "request_failed",
      sourceId: input.eventId,
      fields: {
        httpStatus: null,
        errorCode: "request_failed",
      },
    });
    return { status: "failed", replySent: false, sideEffects: false };
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

export function shouldLoadBotKnowledgeContext({
  patientAutomationReady,
  humanTakeoverActive,
  automationMode,
  messageType,
  automationPlan,
  appointmentReviewCandidate,
  appointmentNeedsPreference,
  professionalFactReview,
  approvedPriceReplyCandidate,
  deterministicMarketingOpeningCandidate,
}) {
  return Boolean(
    patientAutomationReady &&
      !humanTakeoverActive &&
      ["active", "shadow"].includes(automationMode) &&
      String(messageType || "").toLowerCase() === "text" &&
      automationPlan?.route === "standard_reply" &&
      !appointmentReviewCandidate &&
      !appointmentNeedsPreference &&
      !professionalFactReview &&
      !approvedPriceReplyCandidate &&
      !deterministicMarketingOpeningCandidate,
  );
}

export function isSemanticHumanContextContinuationCandidate({
  patientAutomationReady,
  humanTakeoverActive,
  professional,
  messageType,
  text,
  recentConversation,
  exactDuplicate,
  protectedAppointmentContinuation,
  professionalFactReview,
  patientRelationship,
}) {
  return Boolean(
    patientAutomationReady &&
      humanTakeoverActive &&
      professional === "amanda" &&
      String(messageType || "").toLowerCase() === "text" &&
      String(text || "").trim() &&
      !exactDuplicate &&
      !protectedAppointmentContinuation &&
      !professionalFactReview &&
      !blocksAutomatedPatientMessages(patientRelationship) &&
      (
        isReplyToHumanContextWithoutStandaloneRequest(
          text,
          recentConversation,
        ) ||
        isShortAffirmativeReplyToHumanQuestion(
          text,
          recentConversation,
        )
      ) &&
      hasUnresolvedPatientRequest(text, recentConversation),
  );
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
  appointmentNeedsPreference,
  approvedPriceReplyKind,
  humanContextContinuationCandidate = false,
  humanResumeGeneration = "",
}) {
  try {
    const aiSafetyTriage = plan?.reason === "ai_safety_triage";
    const queueAiSafetyFallback = async () => {
      if (
        !aiSafetyTriage ||
        reviewAlertAlreadyQueued ||
        !isReviewAlertConfigured()
      ) {
        return false;
      }

      await completeReviewAlert(
        prepareReviewAlertInput(alertInput, {
          decision: {
            route: "human_review",
            suggestedReply: "",
          },
          plan,
        }),
      );
      return true;
    };

    const debounceResult = await waitForLatestInboundReply({
      phone: to,
      eventId: input.eventId,
      markerStatus: replyDebounceMarkerStatus,
      configuredDelayMs:
        process.env.WHATSAPP_REPLY_DEBOUNCE_AI_MS,
      replyKind: [
        "official_instagram_request",
        "campaign_reference_explanation",
        "insurance_acceptance_request",
        "consultation_information_request",
        "known_procedure",
      ].includes(plan?.reason)
        ? "deterministic"
        : "ai",
      messageText: input.text,
    });

    if (!debounceResult.shouldProcess) {
      writeOperationalLog({
        source: "openai_active_debounced",
        category: "reply_control",
        reason: "debounced",
        sourceId: input.eventId,
        fields: {
          delayMs: debounceResult.delayMs,
        },
      });
      return { status: "superseded", replySent: false };
    }

    const introduceBruna = !input.recentConversation.some(
      (turn) =>
        turn?.role === "assistant" ||
        ["bruna", "equipe_humana"].includes(turn?.source),
    );
    const insuranceCoverageReply = buildInsuranceCoverageReply({
      text: input.text,
      procedure: plan?.procedure || input.procedure || "",
    });
    const insuranceAcceptanceReply = buildInsuranceAcceptanceReply({
      text: input.text,
      patientName: input.patientProfileName,
      professional: plan?.professional || "",
      introduceBruna,
    });
    const standaloneMarketingPrefilledMessage =
      plan?.route === "standard_reply" &&
      plan?.reason === "known_procedure" &&
      isLikelyMarketingPrefilledMessage({
        text: input.text,
        platform: input.platform,
        referralContext: input.referralContext,
      });
    const officialInstagramRequest =
      plan?.reason === "official_instagram_request";
    const campaignReferenceQuestion =
      plan?.reason === "campaign_reference_explanation";
    const campaignReferencePreviouslyShown =
      hasCampaignReferenceCode(input.text) ||
      (input.recentConversation || []).some((turn) =>
        hasCampaignReferenceCode(turn?.text),
      );
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
    const appointmentPreferenceBody = appointmentNeedsPreference
      ? buildAppointmentPreferenceCollectionReply({
          patientName: input.patientProfileName,
          introduceBruna,
        })
      : "";
    const approvedPriceBody =
      approvedPriceReplyKind === "initial_information"
        ? buildSurgicalInitialPriceReply({
            patientName: input.patientProfileName,
            procedure: plan?.procedure || input.procedure,
            recentConversation: input.recentConversation,
            currentText: input.text,
          })
        : approvedPriceReplyKind === "lifting_range"
          ? buildSurgicalPriceSuggestedReply({
              patientName: input.patientProfileName,
              procedure: "lifting_facial",
              recentConversation: input.recentConversation,
              referenceCategory: input.referenceCategory,
              sourceReference: input.sourceReference,
              directToPatient: true,
              currentText: input.text,
            })
          : "";
    const deterministicReplyResult = appointmentPreferenceBody
      ? {
          status: "completed",
          model: "deterministic-appointment-preference",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure: plan?.procedure || input.procedure || "",
            replyCode: "AMANDA-AGENDA-PREFERENCE-01",
            suggestedReply: appointmentPreferenceBody,
            reviewReason: "",
          },
        }
      : approvedPriceBody
      ? {
          status: "completed",
          model: "deterministic-approved-price",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure: plan?.procedure || input.procedure || "",
            replyCode:
              approvedPriceReplyKind === "lifting_range"
                ? "LIFTING-PRICE-RANGE-01"
                : "SURGICAL-PRICE-INITIAL-01",
            suggestedReply: approvedPriceBody,
            reviewReason: "",
          },
        }
      : officialInstagramRequest
      ? {
          status: "completed",
          model: "deterministic-official-channels",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure: plan?.procedure || input.procedure || "",
            replyCode: "AMANDA-OFFICIAL-LINKS-01",
            suggestedReply: buildOfficialChannelsReply({
              patientName: input.patientProfileName,
              procedure: plan?.procedure || input.procedure || "",
              introduceBruna,
              explainCampaignReference:
                campaignReferencePreviouslyShown,
            }),
            reviewReason: "",
          },
          usage: null,
        }
      : campaignReferenceQuestion
      ? {
          status: "completed",
          model: "deterministic-campaign-reference",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: "amanda",
            procedure: plan?.procedure || input.procedure || "",
            replyCode: "CAMPAIGN-REFERENCE-01",
            suggestedReply: buildCampaignReferenceExplanationReply({
              patientName: input.patientProfileName,
              introduceBruna,
            }),
            reviewReason: "",
          },
          usage: null,
        }
      : insuranceAcceptanceReply
      ? {
          status: "completed",
          model: "deterministic-insurance-acceptance",
          decision: {
            route: "standard_reply",
            confidence: "high",
            automaticAllowed: true,
            urgent: false,
            professional: plan?.professional || null,
            procedure: plan?.procedure || input.procedure || "",
            replyCode: "INSURANCE-ACCEPTANCE-01",
            suggestedReply: insuranceAcceptanceReply,
            reviewReason: "",
          },
          usage: null,
        }
      : insuranceCoverageReply
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
              consultationPriceRequested:
                isConsultationPriceRequest(input.text),
              siteRequested,
              introduceBruna,
            }),
            reviewReason: "",
          },
          usage: null,
        }
      : null;
    const semanticResult = await runOpenAIShadow({
      ...input,
      policyHints: {
        ...plan,
        deterministicReplyCode:
          deterministicReplyResult?.decision?.replyCode || "",
        deterministicReplyPreview:
          deterministicReplyResult?.decision?.suggestedReply || "",
        deterministicReplyProfessional:
          deterministicReplyResult?.decision?.professional || "",
        deterministicReplyProcedure:
          deterministicReplyResult?.decision?.procedure || "",
      },
      replyContract: conversationAction?.replyContract,
    });
    const selectedDeterministicReply =
      semanticDecisionConfirmsDeterministicReply(
        semanticResult,
        deterministicReplyResult,
      );
    const deterministicReplyContextMismatch = Boolean(
      deterministicReplyResult &&
        semanticResult?.status === "completed" &&
        semanticResult.decision?.replyCode ===
          deterministicReplyResult.decision?.replyCode &&
        !selectedDeterministicReply,
    );
    const replyKind = selectedDeterministicReply
      ? appointmentPreferenceBody
        ? "appointment_preference"
        : approvedPriceBody
          ? approvedPriceReplyKind
          : "deterministic"
      : "ai";
    const activeResult =
      selectedDeterministicReply
        ? {
            ...semanticResult,
            decision: {
              ...semanticResult.decision,
              professional:
                deterministicReplyResult.decision.professional,
              procedure:
                deterministicReplyResult.decision.procedure,
              replyCode:
                deterministicReplyResult.decision.replyCode,
              suggestedReply:
                deterministicReplyResult.decision.suggestedReply,
            },
          }
        : semanticResult;
    logOpenAIResult(input.eventId, activeResult, "active");

    if (activeResult.status !== "completed") {
      await queueAiSafetyFallback();
      return {
        status: "failed",
        errorCode: activeResult.errorCode || "openai_failed",
        replySent: false,
      };
    }

    const semanticStateResult = await updateConversationSemanticState({
      phone: to,
      semanticState: activeResult.decision.conversationState,
    });
    writeOperationalLog({
      source: "conversation_semantic_state",
      category: "conversation_memory",
      reason: "semantic_state_processed",
      sourceId: input.eventId,
      fields: { status: semanticStateResult.status },
    });

    if (deterministicReplyContextMismatch) {
      writeOperationalLog({
        source: "openai_active_deterministic_context_mismatch",
        category: "reply_control",
        reason: "deterministic_context_mismatch",
        sourceId: input.eventId,
        fields: {
          semanticProfessional:
            semanticResult.decision?.professional || "",
          semanticProcedure:
            semanticResult.decision?.procedure || "",
          candidateProfessional:
            deterministicReplyResult.decision?.professional || "",
          candidateProcedure:
            deterministicReplyResult.decision?.procedure || "",
          replyCode:
            deterministicReplyResult.decision?.replyCode || "",
        },
      });
      if (!reviewAlertAlreadyQueued && isReviewAlertConfigured()) {
        await completeReviewAlert(
          prepareReviewAlertInput(alertInput, {
            decision: {
              ...semanticResult.decision,
              route: "human_review",
              automaticAllowed: false,
              suggestedReply: "",
              reviewReason: "deterministic_context_mismatch",
            },
            plan,
          }),
        );
      }
      return {
        status: "reviewed",
        errorCode: "deterministic_context_mismatch",
        replySent: false,
      };
    }

    const latestAfterGeneration = await checkLatestInboundReply({
      phone: to,
      eventId: input.eventId,
      markerStatus: replyDebounceMarkerStatus,
    });

    if (!latestAfterGeneration.shouldProcess) {
      writeOperationalLog({
        source: "openai_active_superseded_after_generation",
        category: "reply_control",
        reason: "superseded_after_generation",
        sourceId: input.eventId,
      });
      return { status: "superseded", replySent: false };
    }

    const finalHumanGuard =
      await guardAutomaticReplyAgainstHumanRace({
        phone: to,
        configuredDelayMs:
          process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS,
      });

    if (!finalHumanGuard.shouldSend) {
      writeOperationalLog({
        source: "openai_active_cancelled_by_human_reply",
        category: "reply_control",
        reason: "cancelled_by_human_reply",
        sourceId: input.eventId,
        fields: {
          controlStatus: finalHumanGuard.controlStatus,
          delayMs: finalHumanGuard.delayMs,
        },
      });
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

    const unknownClarification =
      isUnknownClarificationDecision(activeResult.decision);
    const unknownReview =
      isUnknownReviewDecision(activeResult.decision);
    const learningRisk = classifyLearningRisk({
      text: input.text,
      reviewReason: activeResult.decision.reviewReason,
      procedure: activeResult.decision.procedure || plan?.procedure,
    });

    if (unknownClarification || unknownReview) {
      await recordBotUnknownQuestion({
        eventId: String(input.eventId),
        phone: to,
        patientName: input.patientProfileName,
        receivedAt: input.receivedAt || "",
        question: input.text,
        subject: learningSubject(activeResult.decision),
        context: (input.recentConversation || [])
          .slice(-4)
          .map((turn) => `${turn.source || turn.role}: ${turn.text || ""}`)
          .join("\n"),
        risk: learningRisk,
        clarificationCount: unknownClarification ? 1 : 0,
        status: unknownClarification
          ? "Aguardando esclarecimento"
          : "Aguardando resposta humana",
        priority:
          learningRisk === "Alto" ? "Imediata" : "Resumo diário",
        procedure:
          activeResult.decision.procedure || plan?.procedure || "",
      });
    }

    if (unknownReview) {
      if (
        learningRisk === "Alto" &&
        !reviewAlertAlreadyQueued &&
        isReviewAlertConfigured()
      ) {
        await completeReviewAlert(
          prepareReviewAlertInput(alertInput, {
            decision: activeResult.decision,
            plan,
          }),
        );
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

      const holdingReply = buildUnknownHoldingReply({
        patientName: input.patientProfileName,
        introduceBruna,
        currentText: input.text,
        reviewReason: activeResult.decision.reviewReason,
        procedure:
          activeResult.decision.procedure || plan?.procedure || "",
      });
      if (!holdingReply) {
        return {
          status: "awaiting_human_learning",
          errorCode: "no_contextual_holding_reply",
          replySent: false,
        };
      }
      const holdingResult = await sendControlledPatientReply({
        from,
        to,
        eventId: `${input.eventId}-unknown-holding`,
        body: holdingReply,
        currentText: input.text,
        recentConversation: input.recentConversation,
        opportunityId: input.opportunityId,
        professional: input.professional,
        conversationAction,
      });
      await recordAutomaticReplyOperationally({
        result: holdingResult,
        eventId: `${input.eventId}-unknown-holding`,
        parentEventId: input.eventId,
        opportunityId: input.opportunityId,
        phone: to,
        professional: input.professional,
      });
      logPatientReplyResult(
        `${input.eventId}-unknown-holding`,
        to,
        holdingResult,
      );

      if (holdingResult.status === "completed") {
        await appendConversationTurn({
          phone: to,
          role: "assistant",
          text: holdingReply,
          eventId: `${input.eventId}:unknown-holding`,
          source: "bruna",
        });
        return { status: "awaiting_human_learning", replySent: true };
      }

      return {
        status: "completed_no_reply",
        errorCode: holdingResult.errorCode || holdingResult.status,
        replySent: false,
      };
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

    const semanticHumanContextContinuationApproved = Boolean(
      humanContextContinuationCandidate === true &&
        (
          (
            activeResult.decision.replyCode ===
              CONTEXT_CONTINUATION_CODE &&
            String(activeResult.decision.reviewReason || "").startsWith(
              "context_continue:",
            )
          ) ||
          (
            activeResult.decision.replyCode ===
              CONTEXT_CLARIFICATION_CODE &&
            String(activeResult.decision.reviewReason || "").startsWith(
              "context_clarification:",
            )
          )
        ),
    );
    const openAIReplyApproved =
      shouldSendOpenAIPatientReply({
        mode: "active",
        plan,
        decision: activeResult.decision,
        humanTakeoverToday,
        exactDuplicate,
        schedulingRequest,
        allowHumanContextContinuation:
          semanticHumanContextContinuationApproved,
      });

    if (!openAIReplyApproved) {
      if (activeResult.decision.route === "standard_reply") {
        await queueAiSafetyFallback();
      }
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
      opportunityId: input.opportunityId,
      professional: input.professional,
      conversationAction: buildSemanticReplyConversationAction(
        conversationAction,
        activeResult.decision,
        {
          deterministicReplyConfirmed: selectedDeterministicReply,
        },
      ),
    });
    await recordAutomaticReplyOperationally({
      result: replyResult,
      eventId: input.eventId,
      parentEventId: input.eventId,
      opportunityId: input.opportunityId,
      phone: to,
      professional: input.professional,
    });
    logPatientReplyResult(input.eventId, to, replyResult);

    if (
      replyResult.status === "blocked" &&
      !reviewAlertAlreadyQueued &&
      isReviewAlertConfigured()
    ) {
      await completeReviewAlert(
        prepareReviewAlertInput(alertInput, {
          decision: {
            route: "human_review",
            automaticAllowed: false,
            suggestedReply: "",
            reviewReason: `outbound_guard:${replyResult.errorCode || "blocked"}`,
          },
          plan,
        }),
      );
    }

    if (replyResult.status === "completed") {
      const memoryResult = await appendConversationTurn({
        phone: to,
        role: "assistant",
        text: activeResult.decision.suggestedReply,
        eventId: `${input.eventId}:bruna`,
        source: "bruna",
      });

      writeOperationalLog({
        source: "conversation_memory_reply",
        category: "conversation_memory",
        reason: "reply_recorded",
        sourceId: input.eventId,
        fields: {
          status: memoryResult.status,
        },
      });

      if (semanticHumanContextContinuationApproved) {
        const resumeResult = await markBrunaResumed({
          phone: to,
          expectedHumanGeneration: humanResumeGeneration,
        });
        writeOperationalLog({
          source: "semantic_context_continuation_resume",
          category: "reply_control",
          reason:
            resumeResult.status === "completed"
              ? "bruna_resumed"
              : resumeResult.reason || resumeResult.status,
          sourceId: input.eventId,
          fields: {
            status: resumeResult.status,
          },
        });
      }
    }

    if (replyResult.status === "completed") {
      return {
        status: "completed",
        replySent: true,
        replyKind,
        deliveryStatus: replyResult.status,
      };
    }

    if (["duplicate", "blocked", "superseded"].includes(replyResult.status)) {
      return {
        status: "completed_no_reply",
        errorCode: replyResult.errorCode || replyResult.status,
        replySent: false,
        replyKind,
        deliveryStatus: replyResult.status,
      };
    }

    return {
      status: "failed",
      errorCode: replyResult.errorCode || "patient_reply_failed",
      replySent: false,
      replyKind,
      deliveryStatus: replyResult.status,
    };
  } catch {
    writeOperationalLog({
      source: "openai_active_failed",
      category: "openai_execution",
      reason: "request_failed",
      sourceId: input.eventId,
      fields: {
        httpStatus: null,
        errorCode: "request_failed",
      },
    });
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

export function hasFreshPatientRelationship(relationship) {
  return Boolean(
    relationship &&
      typeof relationship === "object" &&
      relationship.lookupStatus === "completed",
  );
}

export async function guardAutomaticContactPreference(
  {
    phone,
    fallbackRelationship = null,
  },
  {
    lookupPatientRelationshipImpl = lookupPatientRelationship,
  } = {},
) {
  const reuseFreshRelationship =
    hasFreshPatientRelationship(fallbackRelationship);
  const lookup = reuseFreshRelationship
    ? deliveryResult(true, null, "none", {
        relationship: fallbackRelationship,
      })
    : await lookupPatientRelationshipImpl(phone);
  const relationship = lookup.ok
    ? lookup.relationship
    : fallbackRelationship;

  if (blocksAutomatedPatientMessages(relationship)) {
    return {
      shouldSend: false,
      status: "blocked_contact_preference",
      relationship,
      lookupStatus: reuseFreshRelationship
        ? "reused_append_lead"
        : lookup.ok
          ? "completed"
          : lookup.errorCode,
    };
  }

  return {
    shouldSend: true,
    status: "allowed",
    relationship,
    lookupStatus: reuseFreshRelationship
      ? "reused_append_lead"
      : lookup.ok
        ? "completed"
        : lookup.errorCode,
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

  writeOperationalLog({
    source: "appointment_email_notification",
    category: "appointment_notification",
    reason: result.ok ? "completed" : "failed",
    sourceId: input.eventId,
    fields: {
      status: result.ok ? "completed" : "failed",
      errorCode: result.errorCode,
    },
  });
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
    ![
      "price_initial_information",
      "price_range_without_confirmed_procedure",
    ].includes(plan.reason)
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

  if (plan.reason === "price_initial_information") {
    return {
      ...plan,
      professional: plan.professional || "amanda",
      procedure: contextPlan.procedure,
    };
  }

  const directLiftingRange =
    contextPlan.procedure === "lifting_facial";

  return {
    ...plan,
    route: directLiftingRange
      ? "standard_reply"
      : "human_review",
    reason: directLiftingRange
      ? "lifting_price_range_direct"
      : "surgical_price_range_review",
    professional: plan.professional || "amanda",
    procedure: contextPlan.procedure,
    automaticAllowed: directLiftingRange,
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

  const {
    confidence,
    patientName: detectedPatientName,
    ...appointment
  } = detection;
  const resolvedPatientName = String(
    detectedPatientName || patientName || "",
  ).trim();
  const appointmentId = `manual-${String(messageId || eventId)}`;
  const appointmentPayload = {
    ...appointment,
    appointmentId,
    eventId: String(eventId || ""),
    phone: patientPhone,
    name: resolvedPatientName,
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
        patientName: resolvedPatientName,
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
          patientName: resolvedPatientName,
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
      patientName: resolvedPatientName,
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
  opportunityId = "",
  professional = "",
}) {
  const debounceResult = await waitForLatestInboundReply({
    phone: to,
    eventId: revisionEventId,
    markerStatus: replyDebounceMarkerStatus,
    configuredDelayMs:
      process.env.WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS,
    replyKind: "deterministic",
    messageText: currentText,
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

  const result = await sendControlledPatientReply({
    from,
    to,
    eventId,
    body,
    currentText,
    recentConversation,
    opportunityId,
    professional,
    conversationAction,
  });
  await recordAutomaticReplyOperationally({
    result,
    eventId,
    parentEventId: revisionEventId,
    opportunityId,
    phone: to,
    professional,
  });
  return result;
}

export async function handleYCloudWebhook(
  request,
  context,
  { resolveAttributionImpl = resolveAttributionJourney } = {},
) {
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
      internalPhoneExclusionConfigured:
        hasConfiguredInternalTeamPhones(),
      leadDeliveryFallback: "acquisition_only",
      leadFailureEmailAlert: "required_after_retries",
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!webhookSecret) {
    writeOperationalLog({
      source: "ycloud_webhook_intake",
      category: "webhook_intake",
      reason: "configuration_missing",
      fields: {
        method: request.method,
        deployMode: process.env.CONTEXT || null,
      },
    });
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
    writeOperationalLog({
      source: "ycloud_webhook_intake",
      category: "webhook_intake",
      reason: "invalid_signature",
      fields: {
        method: request.method,
        deployMode: process.env.CONTEXT || null,
      },
    });
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    writeOperationalLog({
      source: "ycloud_webhook_intake",
      category: "webhook_intake",
      reason: "invalid_json",
      fields: {
        method: request.method,
        deployMode: process.env.CONTEXT || null,
      },
    });
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

    if (isInternalTeamPhone(patientPhone)) {
      return json({
        received: true,
        ignored: true,
        ignoreReason: "internal_team_phone",
        leadRecorded: false,
        appointmentReserved: false,
        aiShadowQueued: false,
        aiActiveQueued: false,
      });
    }

    await rememberBusinessNumber(echo.from);

    if (!eventId || !messageId) {
      return json({ received: false, error: "missing_event_id" }, 400);
    }

    if (isWhatsAppBusinessAutomaticGreeting(echo)) {
      writeOperationalLog({
        source: "ycloud_automatic_greeting_ignored",
        category: "inbound_control",
        reason: "automatic_greeting_ignored",
        sourceId: eventId,
        fields: {
          eventType: payload.type,
        },
      });

      return json({
        received: true,
        ignored: true,
        ignoreReason: "whatsapp_business_automatic_greeting",
      });
    }

    const echoText = String(echo.text?.body || "");
    const echoAt = String(
      echo.sendTime || echo.createTime || payload.createTime || "",
    );
    const echoExternalProfessional =
      detectExternalProfessionalAppointment(echoText);
    if (echoExternalProfessional) {
      const externalContext = await markExternalProfessionalContext({
        phone: patientPhone,
        professional: echoExternalProfessional.key,
        displayName: echoExternalProfessional.displayName,
        at: String(
          echo.sendTime ||
            echo.createTime ||
            payload.createTime ||
            "",
        ),
      });
      const cleanup = await deliverSheetsAction(
        "record_external_professional_contact",
        {
          contact: {
            phone: patientPhone,
            professional: echoExternalProfessional.displayName,
            eventId: String(eventId),
            messageId: String(messageId),
            at: String(
              echo.sendTime || echo.createTime || payload.createTime || "",
            ),
          },
        },
      );

      return json({
        received: true,
        ignored: true,
        ignoreReason: "external_professional_appointment",
        externalContextStatus: externalContext.status,
        spreadsheetCleanupStatus: cleanup.ok
          ? "completed"
          : cleanup.errorCode,
      });
    }

    const standaloneAppointment = detectManualAppointment({
      currentText: echoText,
      recentConversation: [],
      at: echoAt,
    });
    const structuredAppointment =
      standaloneAppointment?.source ===
      "WhatsApp - comprovante estruturado de agendamento"
        ? standaloneAppointment
        : null;
    let appointmentSyncStatus = "not_detected";
    let manualAppointmentResult = null;

    const syncManualAppointment = async (manualAppointment) => {
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

      writeOperationalLog({
        source: "appointment_confirmation_sync",
        category: "appointment_sync",
        reason: appointmentSyncStatus || "unknown",
        sourceId: eventId,
        fields: {
          status: appointmentSyncStatus,
          confidence: manualAppointment.confidence,
          structuredReceipt:
            manualAppointment === structuredAppointment,
        },
      });
    };

    const humanResumeControl = await markHumanTakeover({
      phone: patientPhone,
      eventId: String(eventId),
      at: echoAt,
    });

    // A mensagem estruturada é a confirmação final da equipe. A reserva
    // canônica precisa acontecer antes da persistência secundária da tomada
    // humana, que pode sofrer timeout sem invalidar o comprovante já enviado.
    if (structuredAppointment) {
      await syncManualAppointment(structuredAppointment);
    }

    const takeoverDelivery = await recordHumanTakeover({
      eventId: String(eventId),
      messageId: String(messageId),
      phone: patientPhone,
      takenAt: echoAt,
      text: echoText,
    });

    writeOperationalLog({
      source: "ycloud_human_takeover",
      category: "human_takeover",
      reason: takeoverDelivery.ok ? "completed" : "failed",
      sourceId: eventId,
      fields: {
        eventType: payload.type,
        takeoverDelivery: takeoverDelivery.ok ? "success" : "failure",
        takeoverCreated: takeoverDelivery.created === true,
        downstreamStatus: takeoverDelivery.httpStatus,
        downstreamError: takeoverDelivery.errorCode,
      },
    });

    if (!takeoverDelivery.ok) {
      return json(
        {
          received: false,
          error: "takeover_delivery_failed",
          downstreamStatus: takeoverDelivery.httpStatus,
          downstreamError: takeoverDelivery.errorCode,
          appointmentSyncStatus,
          appointmentId:
            manualAppointmentResult?.appointmentId || "",
        },
        502,
      );
    }

    const memoryResult = await appendConversationTurn({
      phone: patientPhone,
      role: "assistant",
      text: echoText,
      eventId: String(eventId),
      at: echoAt,
      source: "human",
    });
    const humanLearning = echoText.trim()
      ? await recordHumanLearningAnswer({
          phone: patientPhone,
          answer: echoText,
          eventId: String(eventId),
          at: echoAt,
        })
      : deliveryResult(true, null, "none", {
          responseData: { captured: false, correction: false },
        });
    const manualAppointment =
      structuredAppointment ||
      detectManualAppointment({
        currentText: echoText,
        recentConversation: memoryResult.historyAfter,
        at: echoAt,
      });

    if (manualAppointment && !manualAppointmentResult) {
      await syncManualAppointment(manualAppointment);
    }

    const humanInteractionSync = await deliverSheetsAction(
      "touch_appointment",
      {
        appointment: {
          appointmentId:
            manualAppointmentResult?.appointmentId || "",
          phone: patientPhone,
          at: echoAt,
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
        echoAt,
      );

    return json({
      received: true,
      humanTakeoverRecorded: true,
      takeoverCreated: takeoverDelivery.created === true,
      conversationMemory: memoryResult.status,
      humanLearningStatus: humanLearning.ok
        ? humanLearning.responseData?.captured
          ? "candidate_captured"
          : humanLearning.responseData?.correction
            ? "possible_correction"
            : "nothing_pending"
        : humanLearning.errorCode,
      humanResumeControl: humanResumeControl.status,
      appointmentSyncStatus,
      humanInteractionSyncStatus,
      commitmentsResolved:
        commitmentResolution.ok === true,
    });
  }

  if (payload.type !== "whatsapp.inbound_message.received") {
    writeOperationalLog({
      source: "ycloud_webhook_intake",
      category: "webhook_intake",
      reason: "unsupported_event_type",
      sourceId: payload.id,
      fields: {
        eventType: payload.type || null,
        apiVersion: payload.apiVersion || null,
        deployMode: process.env.CONTEXT || null,
      },
    });
    return json({ received: true, ignored: true });
  }

  const message = payload.whatsappInboundMessage || {};
  const phone = normalizePhone(message.from);

  if (!phone) {
    writeOperationalLog({
      source: "ycloud_webhook_intake",
      category: "webhook_intake",
      reason: "invalid_inbound_phone",
      sourceId: payload.id,
      fields: {
        eventType: payload.type,
        messageType: message.type || null,
      },
    });
    return json({ received: false, error: "invalid_phone" }, 400);
  }

  if (isInternalTeamPhone(phone)) {
    return json({
      received: true,
      ignored: true,
      ignoreReason: "internal_team_phone",
      leadRecorded: false,
      appointmentReserved: false,
      aiShadowQueued: false,
      aiActiveQueued: false,
    });
  }

  await rememberBusinessNumber(message.to);

  const eventId = payload.id || message.id || message.wamid;

  if (!eventId) {
    writeOperationalLog({
      source: "ycloud_webhook_intake",
      category: "webhook_intake",
      reason: "missing_inbound_event_id",
      fields: {
        eventType: payload.type,
        messageType: message.type || null,
      },
    });
    return json({ received: false, error: "missing_event_id" }, 400);
  }

  const contactAt = message.sendTime || payload.createTime;
  const rawInboundText = String(message.text?.body || "");
  const text = stripAttributionTransportToken(rawInboundText);
  const normalizedMessageType = String(message.type || "")
    .trim()
    .toLowerCase();
  const recoveryRegistration =
    normalizedMessageType === "text" && text.trim()
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
  let replyDebounceMarkerStatus = "skipped";
  if (
    normalizedMessageType === "text" &&
    text.trim()
  ) {
    const markerResult = await markLatestInboundForReply({
      phone,
      eventId: String(eventId),
      eventAt: contactAt,
      priority: inboundReplyPriority(text),
    });
    replyDebounceMarkerStatus = markerResult.status;
  }
  const finishEarlyRecovery = async (outcome) => {
    if (!["completed", "duplicate"].includes(recoveryRegistration.status)) {
      return recoveryRegistration.status;
    }
    const completion = await completeInboundRecovery(
      { eventId: String(eventId) },
      { outcome },
    );
    return completion.status;
  };
  let externalProfessionalContext =
    await getExternalProfessionalContext(phone);
  const directExternalProfessionalRequest =
    detectExternalProfessionalAppointment(text);
  if (!externalProfessionalContext) {
    const rememberedConversation = await readConversationTurns(phone);
    const rememberedExternalAppointment = rememberedConversation.turns
      .map((turn) => detectExternalProfessionalAppointment(turn.text))
      .find(Boolean);

    if (directExternalProfessionalRequest || rememberedExternalAppointment) {
      const detectedProfessional =
        directExternalProfessionalRequest || rememberedExternalAppointment;
      await markExternalProfessionalContext({
        phone,
        at: contactAt,
        professional: detectedProfessional.key,
        displayName: detectedProfessional.displayName,
      });
      externalProfessionalContext = {
        professional: detectedProfessional.key,
        displayName: detectedProfessional.displayName,
      };
      await deliverSheetsAction(
        "record_external_professional_contact",
        {
          contact: {
            phone,
            professional: detectedProfessional.displayName,
            eventId: String(eventId),
            messageId: String(message.wamid || message.id || eventId),
            at: contactAt,
          },
        },
      );
    }
  }
  if (
    externalProfessionalContext &&
    !isExplicitAmandaInquiry(text)
  ) {
    if (isReviewAlertConfigured()) {
      await completeReviewAlert({
        from: String(message.to || ""),
        eventId: `${String(eventId)}-external-professional`,
        patientName: String(message.customerProfile?.name || ""),
        patientPhone: phone,
        messageText: [
          "OUTRO PROFISSIONAL — atendimento humano",
          "A conversa não foi incluída nos Leads da Amanda nem do Daniel.",
          "Encaminhar manualmente ao profissional solicitado.",
          `Mensagem recebida: ${text}`,
        ].join("\n"),
      });
    }
    const recoveryStatus = await finishEarlyRecovery(
      "external_professional_handoff",
    );
    return json({
      received: true,
      ignored: true,
      ignoreReason: "external_professional_conversation",
      leadRecorded: false,
      appointmentReserved: false,
      aiShadowQueued: false,
      aiActiveQueued: false,
      recoveryStatus,
    });
  }
  if (
    externalProfessionalContext &&
    isExplicitAmandaInquiry(text)
  ) {
    await clearExternalProfessionalContext(phone);
  }
  const journeyResolution = await resolveInboundAttributionJourney(rawInboundText, {
    claimantId: attributionClaimantId(String(eventId)),
    resolveImpl: resolveAttributionImpl,
  });
  const attribution = classifyAttribution(
    payload,
    message,
    text,
    journeyResolution.journey,
  );
  const referralContext = extractReferralContext(message);
  const messageId = message.wamid || message.id || eventId;
  const lead = {
    eventId: String(eventId),
    messageId: String(messageId),
    phone,
    name: resolvePatientDisplayName({
      profileName: String(message.customerProfile?.name || ""),
      currentText: text,
    }),
    text,
    reference: attribution.reference,
    platform: attribution.platform,
    referenceCategory: attribution.referenceCategory,
    attributionFallbackReason: attribution.fallbackReason,
    ...attribution.clickIds,
  };
  if (attribution.journey) {
    lead.attribution = {
      ...attribution.journey,
      journeyStatus: journeyResolution.status,
    };
  } else if (journeyResolution.status !== "absent") {
    lead.attribution = {
      journeyStatus: journeyResolution.status,
      resolved: false,
      confidence: "unknown",
      fallbackReason: "journey_not_resolved",
    };
  }

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
            professional: appointmentSelection.professional,
            selection: appointmentSelection,
          });
        const recoveryStatus = await finishEarlyRecovery(
          "appointment_selection_processed",
        );

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
          recoveryStatus,
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

    writeOperationalLog({
      source: "ycloud",
      category: "inbound_processing",
      reason: "ignored",
      sourceId: eventId,
      fields: {
        eventType: payload.type,
        messageType: message.type || null,
        ignored: true,
        leadDelivery: "skipped",
        appointmentReplySyncStatus,
        replyDebounceMarkerStatus:
          ignoredReplyMarker.status,
        aiShadowQueued: false,
        aiActiveQueued: false,
      },
    });

    const recoveryStatus = await finishEarlyRecovery(
      "ignored_inbound_processed",
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
      recoveryStatus,
    });
  }

  // The spreadsheet uses this only to keep cardiology fully isolated from
  // the Amanda acquisition/conversion table. It never changes patient-facing
  // behavior.
  lead.professional = preliminaryAutomationPlan.professional;

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
  let conversationHistorySource = "volatile_cache";
  let conversationSemanticState = null;
  let conversationExpired = false;
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

  const suppressExactDuplicate = shouldSuppressExactInboundDuplicate({
    exactMessageDuplicate,
    recoveredExactDuplicate,
    durableRetry,
    recoveryRegistration,
  });

  if (
    !suppressExactDuplicate &&
    normalizedMessageType === "text" &&
    text.trim().length > 0
  ) {
    let memoryResult = await appendConversationTurn({
      phone,
      role: "user",
      text,
      eventId: String(eventId),
      at: contactAt,
      source: "patient",
    });
    const volatileConversationExpired = memoryResult.expired === true;
    const shouldHydrateDurableHistory = Boolean(
      delivery.ok &&
        (
          memoryResult.status === "failed" ||
          memoryResult.expired === true ||
          (
            memoryResult.historyBefore.length === 0 &&
            delivery.updated === true
          )
        ),
    );
    if (shouldHydrateDurableHistory) {
      const durableContext = await getDurableConversationContext({
        phone,
        opportunityId: delivery.opportunityId,
        professional: delivery.professional,
        limit: 32,
      });
      if (durableContext.status === "completed" && durableContext.turns.length) {
        const hydrated = await hydrateConversationMemory({
          phone,
          turns: durableContext.turns,
          semanticState: memoryResult.semanticState,
        });
        if (hydrated.status === "completed") {
          memoryResult = hydrated;
          conversationHistorySource = "durable_ledger";
        }
      }
    }
    conversationMemoryStatus = memoryResult.status;
    conversationSemanticState = memoryResult.semanticState || null;
    conversationExpired = volatileConversationExpired;
    conversationHistory = toOpenAIConversation(
      memoryResult.historyAfter.filter(
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
          appointmentScheduled:
            normalizePatientRelationship(patientRelationship).state ===
            "appointment_scheduled",
        });
  } else if (
    !suppressExactDuplicate &&
    normalizedMessageType === "image"
  ) {
    const memoryResult = await appendConversationTurn({
      phone,
      role: "user",
      text: "A paciente enviou uma foto.",
      eventId: String(eventId),
      at: contactAt,
      source: "patient",
    });
    conversationMemoryStatus = memoryResult.status;
    conversationSemanticState = memoryResult.semanticState || null;
    conversationExpired = memoryResult.expired === true;
    conversationHistory = toOpenAIConversation(
      memoryResult.historyBefore.filter(
        (turn) => turn.eventId !== String(eventId),
      ),
    );
    conversationHistoryWithCurrent = toOpenAIConversation(
      memoryResult.historyAfter,
    );
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
        opportunityId: delivery.opportunityId,
        professional:
          delivery.professional || patientAppointmentSelection.professional,
        selection: patientAppointmentSelection,
      });

    const appointmentAutomaticWorkFinished =
      delivery.ok &&
      (
        delivery.routed !== false ||
        delivery.routeStatus === "nonlead"
      ) &&
      !["failed", "deferred"].includes(bookingResult.status);
    const recoveryStatus = appointmentAutomaticWorkFinished
      ? await finishEarlyRecovery("appointment_selection_processed")
      : recoveryRegistration.status;

    return json({
      received: true,
      leadRecorded: delivery.ok,
      leadInserted: delivery.inserted === true,
      leadUpdated: delivery.updated === true,
      leadRouted: delivery.routed !== false,
      leadRouteStatus: delivery.routeStatus || "unknown",
      automaticWorkFinished: appointmentAutomaticWorkFinished,
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
      recoveryStatus,
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

    if (patientAppointmentReply.state === "confirmed") {
      const cancelResult = await cancelPendingHumanResume(phone);
      const automaticWorkFinished = delivery.ok && statusSync.ok;
      const recoveryStatus = automaticWorkFinished
        ? await finishEarlyRecovery("appointment_attendance_confirmed")
        : recoveryRegistration.status;

      return json({
        received: true,
        leadRecorded: delivery.ok,
        leadInserted: delivery.inserted === true,
        leadUpdated: delivery.updated === true,
        leadRouted: delivery.routed !== false,
        leadRouteStatus: delivery.routeStatus || "unknown",
        automaticWorkFinished,
        appointmentReplyDetected: true,
        appointmentReplyState: "confirmed",
        appointmentReplySyncStatus:
          patientAppointmentReplySyncStatus,
        humanResumeScheduleStatus:
          cancelResult.status === "completed"
            ? "cancelled_appointment_confirmed"
            : cancelResult.status,
        aiShadowQueued: false,
        aiActiveQueued: false,
        recoveryStatus,
      });
    }
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
    : suppressExactDuplicate
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
  const patientDisplayName = resolvePatientDisplayName({
    profileName: String(message.customerProfile?.name || ""),
    currentText: text,
    recentConversation: conversationHistoryWithCurrent,
  });
  const leadDeliveryFallbackActive = false;
  const patientAutomationReady =
    delivery.ok &&
    delivery.routed !== false &&
    ["amanda", "daniel"].includes(delivery.professional);
  const alertInput = {
    from: String(message.to || ""),
    eventId: String(eventId),
    patientName: patientDisplayName,
    patientPhone: phone,
    messageText:
      text ||
      (normalizedMessageType === "image"
        ? "A paciente enviou uma foto no WhatsApp. Revise a imagem e dê continuidade com acolhimento, sem concluir diagnóstico ou indicação somente pela foto."
        : "Mensagem sem texto."),
    recentConversation: conversationHistoryWithCurrent,
    reference: attribution.reference,
    referenceCategory: attribution.referenceCategory,
    relationship: patientRelationship,
    urgent:
      automationPlan.reason === "possible_urgent_symptoms",
  };
  const professionalFactReview =
    buildProfessionalFactPartialReview({
      currentText: text,
      recentConversation: conversationHistory,
      patientName: patientDisplayName,
      procedure: automationPlan.procedure,
    });
  const appointmentRequestCandidate =
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
  const marketingPrefilledAvailabilityRequest =
    isAvailabilityRequest(text) &&
    isLikelyMarketingPrefilledMessage({
      text,
      reference: attribution.reference,
      platform: attribution.platform,
      referralContext,
    });
  const appointmentNeedsPreference =
    appointmentRequestCandidate &&
    (
      !isAvailabilityRequest(text) ||
      marketingPrefilledAvailabilityRequest
    ) &&
    !isAppointmentOfferAcceptance(text, conversationHistory) &&
    !isAppointmentPreferenceReply(text, conversationHistory) &&
    !hasAppointmentPreferenceInConversation(
      text,
      conversationHistory,
    );
  const appointmentReviewCandidate =
    appointmentRequestCandidate && !appointmentNeedsPreference;
  const conversationAction = decideConversationAction({
    text,
    messageType: message.type,
    plan: automationPlan,
    recentConversation: conversationHistory,
    humanTakeoverActive,
    exactDuplicate: suppressExactDuplicate,
    schedulingRequest: appointmentReviewCandidate,
  });
  const humanContextPlan = enrichAutomationPlanFromConversation(
    preliminaryAutomationPlan,
    conversationHistory,
  );
  const latestHumanContextTurn = conversationHistory
    .slice()
    .reverse()
    .find(
      (turn) =>
        turn?.role === "assistant" &&
        ["human", "equipe_humana"].includes(
          String(turn?.source || ""),
        ),
    );
  const latestHumanContext = latestHumanContextTurn
    ? [latestHumanContextTurn]
    : [];
  const protectedAppointmentContinuation = Boolean(
    patientAppointmentReply ||
      isSchedulingRequest(text) ||
      isAppointmentOfferAcceptance(text, latestHumanContext) ||
      isAppointmentPreferenceReply(text, latestHumanContext),
  );
  const semanticHumanContextContinuationCandidate =
    isSemanticHumanContextContinuationCandidate({
      patientAutomationReady,
      humanTakeoverActive,
      professional: delivery.professional,
      messageType: normalizedMessageType,
      text,
      recentConversation: conversationHistory,
      exactDuplicate: suppressExactDuplicate,
      protectedAppointmentContinuation,
      professionalFactReview,
      patientRelationship,
    });
  const openAIActivePlan = semanticHumanContextContinuationCandidate
    ? {
        ...humanContextPlan,
        route: "standard_reply",
        reason: "semantic_context_continuation_candidate",
        replyCode: "",
        professional:
          humanContextPlan.professional || delivery.professional,
        procedure:
          humanContextPlan.procedure || automationPlan.procedure,
        automaticAllowed: true,
        humanContextContinuationCandidate: true,
      }
    : automationPlan;
  const openAIConversationAction =
    semanticHumanContextContinuationCandidate
      ? prepareSemanticContextContinuationAction(
          conversationAction,
        )
      : conversationAction;
  const extremeNightActive = isExtremeNight(
    contactAt,
  );
  const explicitNightPause = isExplicitNightPause(text);
  const extremeNightActionable =
    conversationAction.unresolvedRequest ||
    conversationAction.allowAutomaticReply ||
    conversationAction.allowHoldingReply ||
    explicitNightPause ||
    ["human_review", "appointment_review"].includes(
      automationPlan.route,
    );
  const priorExtremeNightAcknowledgement =
    hasExtremeNightAcknowledgement(
      conversationHistory,
      contactAt,
    );
  const extremeNightDeferral =
    extremeNightActive &&
    alertInput.urgent !== true &&
    delivery.ok &&
    !suppressExactDuplicate &&
    automationMode === "active" &&
    automationPlan.professional !== "daniel" &&
    !blocksAutomatedPatientMessages(patientRelationship) &&
    extremeNightActionable;
  const shouldQueueExtremeNightAcknowledgement =
    extremeNightDeferral &&
    !humanTakeoverActive &&
    !explicitNightPause &&
    !priorExtremeNightAcknowledgement;
  const shouldQueueExtremeNightEmail =
    extremeNightDeferral &&
    !priorExtremeNightAcknowledgement;
  const shouldQueueAppointmentReview =
    delivery.ok &&
    !extremeNightDeferral &&
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
  const approvedPriceReplyKind =
    relationshipAwarePlan.reason === "price_initial_information"
      ? "initial_information"
      : relationshipAwarePlan.reason === "lifting_price_range_direct"
        ? "lifting_range"
        : "";
  const approvedPriceReplyCandidate =
    Boolean(approvedPriceReplyKind) &&
    automationPlan.route === "standard_reply" &&
    automationPlan.automaticAllowed === true;
  const shouldQueueReviewAlert =
    (delivery.ok || alertInput.urgent) &&
    !extremeNightDeferral &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    conversationAction.allowAlert &&
    !shouldQueueAppointmentReview &&
    isReviewAlertConfigured() &&
    shouldSendReviewAlertForPlan(automationPlan);
  const shouldQueueImageAcknowledgement =
    delivery.ok &&
    !extremeNightDeferral &&
    !humanTakeoverActive &&
    !suppressExactDuplicate &&
    automationMode === "active" &&
    normalizedMessageType === "image" &&
    automationPlan.reason === "unsupported_or_empty_message" &&
    conversationAction.allowHoldingReply &&
    shouldQueueReviewAlert;
  const outsideHumanServiceHours =
    isOutsideHumanServiceHours(contactAt);
  const shouldQueuePriceHolding =
    delivery.ok &&
    !extremeNightDeferral &&
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
    !extremeNightDeferral &&
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
  let approvedPriceReplyQueued = false;
  let approvedPriceReplySent = false;
  let approvedPriceReplyStatus = "not_queued";
  let appointmentPreferenceReplySent = false;
  let appointmentPreferenceReplyStatus = "not_queued";
  let imageAcknowledgementQueued = false;
  let imageAcknowledgementSent = false;
  let imageAcknowledgementStatus = "not_queued";
  let extremeNightAcknowledgementQueued = false;
  let extremeNightAcknowledgementSent = false;
  let extremeNightAcknowledgementStatus = "not_queued";
  let extremeNightMorningResumeStatus = "not_scheduled";
  let extremeNightEmailStatus = "not_queued";

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
          messageText: text,
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

  if (extremeNightDeferral) {
    let morningConversation = conversationHistoryWithCurrent;
    let acknowledgementBody = "";

    if (shouldQueueExtremeNightAcknowledgement) {
      extremeNightAcknowledgementQueued = true;
      acknowledgementBody = buildExtremeNightAcknowledgement({
        patientName: patientDisplayName,
        procedure: automationPlan.procedure,
        currentText: text,
        messageType: normalizedMessageType,
      });
      const acknowledgementResult = await sendCurrentInboundReply({
        from: String(message.to || ""),
        to: phone,
        eventId: `${String(eventId)}-extreme-night-acknowledgement`,
        revisionEventId: String(eventId),
        body: acknowledgementBody,
        currentText: text || "A paciente enviou uma foto.",
        recentConversation: conversationHistory,
        conversationAction,
        replyDebounceMarkerStatus,
        patientRelationship,
        opportunityId: delivery.opportunityId,
        professional: delivery.professional,
      });
      extremeNightAcknowledgementSent =
        acknowledgementResult.status === "completed";
      extremeNightAcknowledgementStatus =
        acknowledgementResult.status;
      logPatientReplyResult(
        `${String(eventId)}-extreme-night-acknowledgement`,
        phone,
        acknowledgementResult,
      );

      if (extremeNightAcknowledgementSent) {
        const memoryResult = await appendConversationTurn({
          phone,
          role: "assistant",
          text: acknowledgementBody,
          eventId: `${String(eventId)}:extreme-night-acknowledgement`,
          source: "bruna",
        });
        morningConversation = toOpenAIConversation(
          memoryResult.historyAfter,
        );
      }
    }

    const receivedAtMs = new Date(contactAt || Date.now()).getTime();
    const scheduleBase = Number.isFinite(receivedAtMs)
      ? receivedAtMs
      : Date.now();
    const morningAt = nextHumanResumeServiceTime(
      scheduleBase,
      process.env,
    );
    const morningSchedule = await scheduleHumanResume(
      {
        phone,
        from: String(message.to || ""),
        eventId: String(eventId),
        patientName: patientDisplayName,
        text: text || "A paciente enviou uma foto.",
        messageType: normalizedMessageType || "text",
        platform: attribution.platform,
        reference: attribution.reference,
        referenceCategory: attribution.referenceCategory,
        procedure: automationPlan.procedure,
        referralContext,
        recentConversation: morningConversation,
        expectedHumanGeneration:
          humanResumeControl?.generation || "",
        receivedAt: new Date(scheduleBase).toISOString(),
        morningResume: true,
      },
      {
        now: scheduleBase,
        delayMs: Math.max(1, morningAt - scheduleBase),
      },
    );
    extremeNightMorningResumeStatus = morningSchedule.status;

    if (shouldQueueExtremeNightEmail) {
      const emailPromise = completeExtremeNightEmail({
        eventId: `${String(eventId)}-extreme-night-morning`,
        patientName: patientDisplayName,
        patientPhone: phone,
        messageText: buildExtremeNightEmailAlert({
          patientName: patientDisplayName,
          messageText:
            text || "A paciente enviou uma foto.",
          procedure: automationPlan.procedure,
          messageType: normalizedMessageType,
          recentConversation: conversationHistoryWithCurrent,
          acknowledgementSent:
            extremeNightAcknowledgementSent,
        }),
      });
      extremeNightEmailStatus = "queued";
      if (typeof context?.waitUntil === "function") {
        try {
          context.waitUntil(emailPromise);
        } catch {
          const emailResult = await emailPromise;
          extremeNightEmailStatus = emailResult.status;
        }
      } else {
        const emailResult = await emailPromise;
        extremeNightEmailStatus = emailResult.status;
      }
    }
  }

  if (
    delivery.ok &&
    !extremeNightDeferral &&
    humanTakeoverActive &&
    automationMode === "active" &&
    !suppressExactDuplicate &&
    conversationAction.scheduleHumanResume
  ) {
    const safeResumeDelay =
      humanContextPlan.route === "standard_reply" &&
      classifyLearningRisk({
        text,
        reviewReason: humanContextPlan.reason,
        procedure: humanContextPlan.procedure,
      }) === "Baixo";
    const scheduleResult = await scheduleHumanResume(
      {
        phone,
        from: String(message.to || ""),
        eventId: String(eventId),
        patientName: patientDisplayName,
        text,
        messageType: String(message.type || ""),
        platform: attribution.platform,
        reference: attribution.reference,
        referenceCategory: attribution.referenceCategory,
        procedure: humanContextPlan.procedure,
        referralContext,
        recentConversation: conversationHistoryWithCurrent,
        expectedHumanGeneration:
          humanResumeControl?.generation || "",
        receivedAt: String(
          message.sendTime || payload.createTime || "",
        ),
      },
      { delayMs: safeResumeDelay ? 5 * 60 * 1000 : 20 * 60 * 1000 },
    );
    humanResumeScheduleStatus = scheduleResult.status;
  } else if (
    delivery.ok &&
    !extremeNightDeferral &&
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
    !extremeNightDeferral &&
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
      opportunityId: delivery.opportunityId,
      professional: delivery.professional,
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
      professional: automationPlan.professional || "amanda",
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
      patientName: patientDisplayName,
      procedure: automationPlan.procedure,
      overnight: outsideHumanServiceHours,
      currentText: text,
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
      opportunityId: delivery.opportunityId,
      professional: delivery.professional,
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
    const overnightBody = buildOvernightHandoffMessage(
      overnightReason,
      {
        text,
        procedure: automationPlan.procedure,
      },
    );
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
      opportunityId: delivery.opportunityId,
      professional: delivery.professional,
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
    patientName: patientDisplayName,
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
    !extremeNightDeferral &&
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
      opportunityId: delivery.opportunityId,
      professional: delivery.professional,
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

      writeOperationalLog({
        source: "conversation_memory_reply",
        category: "conversation_memory",
        reason: "reply_recorded",
        sourceId: eventId,
        fields: {
          status: memoryResult.status,
        },
      });
    }
  }

  const deterministicMarketingOpeningCandidate =
    automationPlan.reason === "known_procedure" &&
    isLikelyMarketingPrefilledMessage({
      text,
      platform: attribution.platform,
      referralContext,
    });
  const learningContext =
    (
      semanticHumanContextContinuationCandidate ||
      shouldLoadBotKnowledgeContext({
      patientAutomationReady,
      humanTakeoverActive,
      automationMode,
      messageType: message.type,
      automationPlan,
      appointmentReviewCandidate,
      appointmentNeedsPreference,
      professionalFactReview,
      approvedPriceReplyCandidate,
      deterministicMarketingOpeningCandidate,
      })
    )
      ? await getBotKnowledgeContext({
          phone,
          question: text,
          procedure: openAIActivePlan.procedure || "",
        })
      : { candidates: [], pendingQuestion: null };
  const shouldQueueOpenAIShadow =
    delivery.ok &&
    !extremeNightDeferral &&
    !humanTakeoverActive &&
    automationMode === "shadow" &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0 &&
    automationPlan.route === "standard_reply" &&
    conversationAction.allowAutomaticReply &&
    automationPlan.professional !== "daniel" &&
    !appointmentReviewCandidate &&
    !appointmentNeedsPreference &&
    !suppressExactDuplicate &&
    !professionalFactReview;
  const commonOpenAIActiveEligibility =
    patientAutomationReady &&
    !extremeNightDeferral &&
    automationMode === "active" &&
    String(message.type || "").toLowerCase() === "text" &&
    text.trim().length > 0 &&
    !appointmentReviewCandidate &&
    !suppressExactDuplicate &&
    !professionalFactReview;
  const shouldQueueOpenAIActive =
    commonOpenAIActiveEligibility &&
    (
      (
        !humanTakeoverActive &&
        automationPlan.route === "standard_reply" &&
        conversationAction.allowAutomaticReply &&
        automationPlan.professional !== "daniel"
      ) ||
      semanticHumanContextContinuationCandidate
    );
  let aiShadowQueued = false;

  if (shouldQueueOpenAIShadow) {
    const shadowPromise = completeOpenAIShadow(
      {
        eventId: String(eventId),
        receivedAt: String(
          message.sendTime || payload.createTime || "",
        ),
        phone,
        text,
        platform: attribution.platform,
        procedure: openAIActivePlan.procedure,
        sourceReference: attribution.reference,
        referenceCategory: attribution.referenceCategory,
        patientProfileName: patientDisplayName,
        recentConversation: conversationHistory,
        previousConversationState: conversationSemanticState,
        priorInteractionKnown: delivery.updated === true,
        referralContext,
        patientRelationship:
          patientRelationshipPromptContext(
            patientRelationship,
          ),
        learningContext,
        deterministicUrgent:
          openAIActivePlan.reason === "possible_urgent_symptoms",
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
        opportunityId: delivery.opportunityId,
        professional: delivery.professional,
        receivedAt: String(
          message.sendTime || payload.createTime || "",
        ),
        phone,
        text,
        platform: attribution.platform,
        procedure: automationPlan.procedure,
        sourceReference: attribution.reference,
        referenceCategory: attribution.referenceCategory,
        patientProfileName: patientDisplayName,
        recentConversation: conversationHistory,
        previousConversationState: conversationSemanticState,
        priorInteractionKnown: delivery.updated === true,
        referralContext,
        patientRelationship:
          patientRelationshipPromptContext(
            patientRelationship,
          ),
        learningContext,
        deterministicUrgent:
          automationPlan.reason === "possible_urgent_symptoms",
      },
      alertInput,
      reviewAlertAlreadyQueued: reviewAlertQueued,
      plan: openAIActivePlan,
      humanTakeoverToday: humanTakeoverActive,
      exactDuplicate: suppressExactDuplicate,
      schedulingRequest: appointmentReviewCandidate,
      from: String(message.to || ""),
      to: phone,
      replyDebounceMarkerStatus,
      conversationAction: openAIConversationAction,
      patientRelationship,
      appointmentNeedsPreference,
      approvedPriceReplyKind,
      humanContextContinuationCandidate:
        semanticHumanContextContinuationCandidate,
      humanResumeGeneration:
        humanResumeControl?.generation || "",
    });

    aiActiveQueued = true;

    const mustFinishBeforeAcknowledgement =
      shouldAwaitActiveReplyBeforeAcknowledgement({
        deterministicReply:
          deterministicMarketingOpeningCandidate ||
          appointmentNeedsPreference ||
          approvedPriceReplyCandidate,
        recoveryRegistration,
      });
    const registerActiveOutcome = (outcome) => {
      aiActiveStatus = outcome?.status || "failed";
      aiActiveReplySent = outcome?.replySent === true;

      if (outcome?.replyKind === "appointment_preference") {
        appointmentPreferenceReplySent =
          outcome.replySent === true;
        appointmentPreferenceReplyStatus =
          outcome.deliveryStatus || outcome.status || "failed";
      }

      if (
        ["initial_information", "lifting_range"].includes(
          outcome?.replyKind,
        )
      ) {
        approvedPriceReplyQueued = true;
        approvedPriceReplySent = outcome.replySent === true;
        approvedPriceReplyStatus =
          outcome.deliveryStatus || outcome.status || "failed";
      }
    };

    if (
      typeof context?.waitUntil === "function" &&
      !mustFinishBeforeAcknowledgement
    ) {
      aiActiveStatus = "deferred";
      const trackedActivePromise = settleDeferredInboundRecovery(
        activePromise,
        {
          eventId: String(eventId),
          outcome: semanticHumanContextContinuationCandidate
            ? "processed"
            : humanTakeoverActive
            ? "human_takeover"
            : "processed",
        },
      );
      try {
        context.waitUntil(trackedActivePromise);
      } catch {
        const outcome = await trackedActivePromise;
        registerActiveOutcome(outcome);
      }
    } else {
      const outcome = await activePromise;
      registerActiveOutcome(outcome);
    }
  }

  if (shouldQueueImageAcknowledgement) {
    imageAcknowledgementQueued = true;
    const hasPreviousClinicReply = conversationHistory.some(
      (turn) =>
        turn?.role === "assistant" ||
        ["bruna", "equipe_humana"].includes(turn?.source),
    );
    const imageAcknowledgementBody =
      buildImageAcknowledgementReply({
        patientName: patientDisplayName,
        greetPatient: !hasPreviousClinicReply,
        introduceBruna:
          !hasPreviousClinicReply &&
          patientRelationship?.knownPatient !== true,
      });
    const imageAcknowledgementResult =
      await sendCurrentInboundReply({
        from: String(message.to || ""),
        to: phone,
        eventId: `${String(eventId)}-image-acknowledgement`,
        revisionEventId: String(eventId),
        body: imageAcknowledgementBody,
        currentText: text,
        recentConversation: conversationHistory,
        conversationAction,
        replyDebounceMarkerStatus,
        patientRelationship,
        opportunityId: delivery.opportunityId,
        professional: delivery.professional,
      });
    imageAcknowledgementSent =
      imageAcknowledgementResult.status === "completed";
    imageAcknowledgementStatus =
      imageAcknowledgementResult.status;
    logPatientReplyResult(
      `${String(eventId)}-image-acknowledgement`,
      phone,
      imageAcknowledgementResult,
    );

    if (imageAcknowledgementSent) {
      await appendConversationTurn({
        phone,
        role: "assistant",
        text: imageAcknowledgementBody,
        eventId: `${String(eventId)}:image-acknowledgement`,
        source: "bruna",
      });
    }
  }

  if ((reviewAlertQueued || appointmentReviewQueued) && delivery.ok) {
    await recordOperationalEvent({
      eventId: `${String(eventId)}-human-handoff`,
      parentEventId: String(eventId),
      opportunityId: delivery.opportunityId,
      phone,
      professional: delivery.professional,
      type: "human_handoff_queued",
      source: "bruna",
      at: new Date().toISOString(),
      outcome: "queued",
    });
  }

  const terminalSendStatuses = new Set([
    "completed",
    "duplicate",
    "blocked",
    "superseded",
  ]);
  const leadRoutingFinished =
    delivery.ok &&
    (
      delivery.routed !== false ||
      delivery.routeStatus === "nonlead"
    );
  const automaticWorkFinished =
    leadRoutingFinished &&
    (!aiActiveQueued || !["failed", "deferred"].includes(aiActiveStatus)) &&
    (!priceHoldingQueued || terminalSendStatuses.has(priceHoldingStatus)) &&
    (!approvedPriceReplyQueued || terminalSendStatuses.has(approvedPriceReplyStatus)) &&
    (!overnightHandoffQueued || terminalSendStatuses.has(overnightHandoffStatus)) &&
    (!imageAcknowledgementQueued || terminalSendStatuses.has(imageAcknowledgementStatus)) &&
    (!extremeNightAcknowledgementQueued || terminalSendStatuses.has(extremeNightAcknowledgementStatus)) &&
    (!extremeNightDeferral || ["scheduled", "waiting_human"].includes(extremeNightMorningResumeStatus)) &&
    (!patientReplyQueued || terminalSendStatuses.has(patientReplyStatus));
  let recoveryStatus = recoveryRegistration.status;
  if (
    recoveryRegistration.status !== "skipped" &&
    shouldCompleteInboundRecovery({
      automaticWorkFinished,
      recoveryRegistration,
      suppressExactDuplicate,
    })
  ) {
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

  writeOperationalLog({
    source: "ycloud",
    category: "inbound_processing",
    reason: delivery.ok ? "processed" : "delivery_failed",
    sourceId: eventId,
    fields: {
      eventType: payload.type,
      messageType: message.type || null,
      platform: attribution.platform,
      hasReferral: Boolean(message.referral),
      referenceCategory: attribution.referenceCategory,
      leadDelivery: delivery.ok ? "success" : "failure",
      leadDeliveryFallbackActive,
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
      conversationHistorySource,
      patientAppointmentReplySyncStatus,
      conversationExpired,
      reactivationHandoffPending,
      conversationHistoryTurns: conversationHistory.length,
      downstreamStatus: delivery.httpStatus,
      downstreamError: delivery.errorCode,
      automationMode,
      automationRoute: automationPlan.route,
      conversationAction: conversationAction.action,
      conversationState: conversationAction.state,
      conversationOwner: conversationAction.owner,
      conversationNextAction: conversationAction.nextAction,
      reviewAlertQueued,
      appointmentReviewQueued,
      appointmentNeedsPreference,
      appointmentPreferenceReplySent,
      appointmentPreferenceReplyStatus,
      imageAcknowledgementQueued,
      imageAcknowledgementSent,
      imageAcknowledgementStatus,
      extremeNightActive,
      extremeNightDeferral,
      explicitNightPause,
      extremeNightAcknowledgementQueued,
      extremeNightAcknowledgementSent,
      extremeNightAcknowledgementStatus,
      extremeNightMorningResumeStatus,
      extremeNightEmailStatus,
      overnightHandoffQueued,
      overnightHandoffSent,
      priceHoldingQueued,
      priceHoldingSent,
      approvedPriceReplyQueued,
      approvedPriceReplySent,
      approvedPriceReplyStatus,
      aiShadowQueued,
      aiActiveQueued,
      aiActiveStatus,
      aiActiveReplySent,
      replyDebounceMarkerStatus,
      recoveryStatus,
    },
  });

  if (!delivery.ok) {
    return json(
      {
        received: false,
        error: "lead_delivery_failed",
        downstreamStatus: delivery.httpStatus,
        downstreamError: delivery.errorCode,
        automaticWorkFinished: false,
      },
      502,
    );
  }

  return json({
    received: true,
    leadRecorded: true,
    leadRouted: delivery.routed !== false,
    leadRouteStatus: delivery.routeStatus || "resolved",
    automaticWorkFinished,
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
    conversationHistorySource,
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
    appointmentNeedsPreference,
    appointmentPreferenceReplySent,
    appointmentPreferenceReplyStatus,
    imageAcknowledgementQueued,
    imageAcknowledgementSent,
    imageAcknowledgementStatus,
    extremeNightActive,
    extremeNightDeferral,
    explicitNightPause,
    extremeNightAcknowledgementQueued,
    extremeNightAcknowledgementSent,
    extremeNightAcknowledgementStatus,
    extremeNightMorningResumeStatus,
    extremeNightEmailStatus,
    patientReplyQueued,
    patientReplySent,
    overnightHandoffQueued,
    overnightHandoffSent,
    priceHoldingQueued,
    priceHoldingSent,
    approvedPriceReplyKind,
    approvedPriceReplyQueued,
    approvedPriceReplySent,
    approvedPriceReplyStatus,
    directLiftingPriceQueued:
      approvedPriceReplyKind === "lifting_range" &&
      approvedPriceReplyQueued,
    directLiftingPriceSent:
      approvedPriceReplyKind === "lifting_range" &&
      approvedPriceReplySent,
    aiShadowQueued,
    aiActiveQueued,
    aiActiveStatus,
    aiActiveReplySent,
    professionalFactReplySent,
    professionalFactReplyStatus,
    recoveryStatus,
  });
}

export default handleYCloudWebhook;

export const config = {
  // Keep the patient-facing webhook on the simplest path. Expensive reply
  // work still uses `context.waitUntil` when Netlify provides it, while the
  // final outbound lock prevents a concurrent human or retry from duplicating
  // the response.
  path: "/api/ycloud/webhook",
};
