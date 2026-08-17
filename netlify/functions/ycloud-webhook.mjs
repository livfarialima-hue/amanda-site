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
  readConversationTurns,
  toOpenAIConversation,
} from "./lib/conversation-memory.mjs";
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
  ["Avaliacao Facial", /^\s*avalia[cÃ§][aÃ£]o\s+facial\b/i],
  ["Lip Lifting", /^\s*(?:lip\s*lifting|lifting\s+labial)\b/i],
  ["Lipo de Papada", /^\s*lipo\s+de\s+papada\b/i],
  ["Lipoaspiracao", /^\s*lipoaspira[cÃ§][aÃ£]o\b/i],
  ["Abdominoplastia", /^\s*abdominoplastia\b/i],
  ["Mastopexia com Protese", /^\s*mastopexia\s+com\s+pr[oÃ³]tese\b/i],
  ["Mastopexia", /^\s*mastopexia\b/i],
  ["Protese de Mama", /^\s*pr[oÃ³]tese\s+de\s+mama\b/i],
  ["Mamoplastia Redutora", /^\s*mamoplastia\s+redutora\b/i],
  ["Braquioplastia", /^\s*braquioplastia\b/i],
  ["Ninfoplastia", /^\s*ninfoplastia\b/i],
  ["Contorno Corporal", /^\s*contorno\s+corporal\b/i],
  ["Pos-Bariatrica", /^\s*p[oÃ³]s[- ]bari[aÃ¡]trica\b/i],
];

const META_AD_REFERENCES = Object.freeze({
  // M26F01W | C01H01 | Como funciona a avaliaÃ§Ã£o | WA
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
  const labelPattern = /\b(?:refer[eÃª]ncia|ref)\.?\s*:?\s*/giu;

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
      return "OrgÃ¢nico/ConteÃºdo";
    case "direct":
      return "WhatsApp direto";
    default:
      return "NÃ£o identificada";
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
  if (platform === "OrgÃ¢nico/ConteÃºdo") return "site_page";
  return "whatsapp_uncoded";
}

export function normalizeResolvedJourneyAttribution(journey) {
  if (!journey || journey.version !== 1 || !journey.first_touch) return null;
  const first = journey.first_touch || {};
  const current = journey.laß¯=öÚ$z{-®éÜj×7W'&VçEFW‡C¢FW‡BÀÐ¢&V6VçD6öçfW'6F–öã¢6öçfW'6F–öä†—7F÷'’ÀÐ¢6öçfW'6F–öä7F–öâÀ¢&WÇ”FV&÷Væ6TÖ&¶W%7FGW2À¢F–VçE&VÆF–öç6†—À¢÷÷'GVæ—G”–C¢FVÆ—fW'’æ÷÷'GVæ—G”–BÀ¢&öfW76–öæÃ¢FVÆ—fW'’ç&öfW76–öæÂÀ¢Ò“°¢F–VçE&WÇ•6VçBÒ&WÇ•&W7VÇBç7FGW2ÓÓÒ&6ö×ÆWFVB#°Ð¢F–VçE&WÇ•7FGW2Ò&WÇ•&W7VÇBç7FGW3°Ð¢ÆöuF–VçE&WÇ•&W7VÇB…7G&–ær†WfVçD–B’Â†öæRÂ&WÇ•&W7VÇB“°Ð Ð¢–b‡F–VçE&WÇ•6VçB’°Ð¢6öç7BÖVÖ÷'•&W7VÇBÒv—BVæD6öçfW'6F–öåGW&â‡°Ð¢†öæRÀÐ¢&öÆS¢&76—7FçB"ÀÐ¢FW‡C¢F–VçE&WÇ”&öG’ÀÐ¢WfVçD–C¢G¶WfVçD–GÓ¦''VæÀÐ¢6÷W&6S¢&''Væ"ÀÐ¢Ò“°Ð Ð¢w&—FT÷W&F–öæÄÆör‡°¢6÷W&6S¢&6öçfW'6F–öåöÖVÖ÷'•÷&WÇ’"À¢6FVv÷'“¢&6öçfW'6F–öåöÖVÖ÷'’"À¢&V6öã¢'&WÇ•÷&V6÷&FVB"À¢6÷W&6T–C¢WfVçD–BÀ¢f–VÆG3¢°¢7FGW3¢ÖVÖ÷'•&W7VÇBç7FGW2À¢ÒÀ¢Ò“°¢ÐÐ¢ÐÐ Ð¢6öç7BFWFW&Ö–æ—7F–4Ö&¶WF–æt÷Væ–æt6æF–FFRÐ¢WFöÖF–öåÆâç&V6öâÓÓÒ&¶æ÷vå÷&ö6VGW&R"b`¢—4Æ–¶VÇ”Ö&¶WF–æu&Vf–ÆÆVDÖW76vR‡°¢FW‡BÀ¢ÆFf÷&Ó¢GG&–'WF–öâçÆFf÷&ÒÀ¢&VfW'&Ä6öçFW‡BÀ¢Ò“°¢6öç7BÆV&æ–æt6öçFW‡BÐ¢6†÷VÆDÆöD&÷D¶æ÷vÆVFvT6öçFW‡B‡°¢F–VçDWFöÖF–öå&VG’À¢‡VÖåF¶V÷fW$7F—fRÀ¢WFöÖF–öäÖöFRÀ¢ÖW76vUG—S¢ÖW76vRçG—RÀ¢WFöÖF–öåÆâÀ¢ö–çFÖVçE&Wf–Wt6æF–FFRÀ¢ö–çFÖVçDæVVG5&VfW&Væ6RÀ¢&öfW76–öæÄf7E&Wf–WrÀ¢&÷fVE&–6U&WÇ”6æF–FFRÀ¢FWFW&Ö–æ—7F–4Ö&¶WF–æt÷Væ–æt6æF–FFRÀ¢Ò¢òv—BvWD&÷D¶æ÷vÆVFvT6öçFW‡B‡°¢†öæRÀ¢VW7F–öã¢FW‡BÀ¢&ö6VGW&S¢WFöÖF–öåÆâç&ö6VGW&RÇÂ""ÀÐ¢ÒÐ¢¢²6æF–FFW3¢µÒÂVæF–æuVW7F–öã¢çVÆÂÓ°Ð¢6öç7B6†÷VÆEVWVT÷Vä•6†F÷rÐÐ¢FVÆ—fW'’æö²b`Ð¢‡VÖåF¶V÷fW$7F—fRb`Ð¢WFöÖF–öäÖöFRÓÓÒ'6†F÷r"b`Ð¢7G&–ær†ÖW76vRçG—RÇÂ""’çFôÆ÷vW$66R‚’ÓÓÒ'FW‡B"b`Ð¢FW‡BçG&–Ò‚’æÆVæwF‚âb`Ð¢WFöÖF–öåÆâç&÷WFRÓÓÒ'7FæF&E÷&WÇ’"b`Ð¢6öçfW'6F–öä7F–öâæÆÆ÷tWFöÖF–5&WÇ’b`Ð¢WFöÖF–öåÆâç&öfW76–öæÂÓÒ&Fæ–VÂ"b`Ð¢ö–çFÖVçE&Wf–Wt6æF–FFRb`Ð¢ö–çFÖVçDæVVG5&VfW&Væ6Rb`Ð¢7W&W74W†7DGWÆ–6FRb`Ð¢&öfW76–öæÄf7E&Wf–Ws°Ð¢6öç7B6†÷VÆEVWVT÷Vä”7F—fRÐÐ¢F–VçDWFöÖF–öå&VG’b`Ð¢‡VÖåF¶V÷fW$7F—fRb`Ð¢WFöÖF–öäÖöFRÓÓÒ&7F—fR"b`Ð¢7G&–ær†ÖW76vRçG—RÇÂ""’çFôÆ÷vW$66R‚’ÓÓÒ'FW‡B"b`Ð¢FW‡BçG&–Ò‚’æÆVæwF‚âb`Ð¢WFöÖF–öåÆâç&÷WFRÓÓÒ'7FæF&E÷&WÇ’"b`Ð¢6öçfW'6F–öä7F–öâæÆÆ÷tWFöÖF–5&WÇ’b`Ð¢WFöÖF–öåÆâç&öfW76–öæÂÓÒ&Fæ–VÂ"b`Ð¢ö–çFÖVçE&Wf–Wt6æF–FFRb`Ð¢ö–çFÖVçDæVVG5&VfW&Væ6Rb`Ð¢7W&W74W†7DGWÆ–6FRb`Ð¢&öfW76–öæÄf7E&Wf–Wrb`Ð¢&÷fVE&–6U&WÇ”6æF–FFS°Ð¢ÆWB•6†F÷uVWVVBÒfÇ6S°Ð Ð¢–b‡6†÷VÆEVWVT÷Vä•6†F÷r’°Ð¢6öç7B6†F÷u&öÖ—6RÒ6ö×ÆWFT÷Vä•6†F÷r€Ð¢°Ð¢WfVçD–C¢7G&–ær†WfVçD–B’ÀÐ¢&V6V—fVDC¢7G&–ær€Ð¢ÖW76vRç6VæEF–ÖRÇÂ–ÆöBæ7&VFUF–ÖRÇÂ""ÀÐ¢’ÀÐ¢†öæRÀÐ¢FW‡BÀÐ¢ÆFf÷&Ó¢GG&–'WF–öâçÆFf÷&ÒÀÐ¢&ö6VGW&S¢WFöÖF–öåÆâç&ö6VGW&RÀÐ¢&VfW&Væ6T6FVv÷'“¢GG&–'WF–öâç&VfW&Væ6T6FVv÷'’ÀÐ¢F–VçE&öf–ÆTæÖS¢F–VçDF—7Æ”æÖRÀ¢&V6VçD6öçfW'6F–öã¢6öçfW'6F–öä†—7F÷'’À¢&–÷$–çFW&7F–öä¶æ÷vã¢FVÆ—fW'’çWFFVBÓÓÒG'VRÀ¢&VfW'&Ä6öçFW‡BÀ¢F–VçE&VÆF–öç6†— Ð¢F–VçE&VÆF–öç6†—&ö×D6öçFW‡B€Ð¢F–VçE&VÆF–öç6†—ÀÐ¢’ÀÐ¢ÆV&æ–æt6öçFW‡BÀÐ¢FWFW&Ö–æ—7F–5W&vVçC Ð¢WFöÖF–öåÆâç&V6öâÓÓÒ'÷76–&ÆU÷W&vVçE÷7–×Fö×2"ÀÐ¢ÒÀÐ¢ÆW'D–çWBÀÐ¢&Wf–WtÆW'EVWVVBÀÐ¢WFöÖF–öåÆâÀÐ¢“°Ð Ð¢•6†F÷uVWVVBÒG'VS°Ð Ð¢–b‡G—Vöb6öçFW‡Còçv—EVçF–ÂÓÓÒ&gVæ7F–öâ"’°Ð¢G'’°Ð¢6öçFW‡Bçv—EVçF–Â‡6†F÷u&öÖ—6R“°Ð¢Ò6F6‚°Ð¢v—B6†F÷u&öÖ—6S°Ð¢ÐÐ¢ÒVÇ6R°Ð¢v—B6†F÷u&öÖ—6S°Ð¢ÐÐ¢ÐÐ Ð¢–b‡6†÷VÆEVWVT÷Vä”7F—fR’°¢6öç7B7F—fU&öÖ—6RÒ6ö×ÆWFT÷Vä”7F—fR‡°¢–çWC¢°¢WfVçD–C¢7G&–ær†WfVçD–B’À¢÷÷'GVæ—G”–C¢FVÆ—fW'’æ÷÷'GVæ—G”–BÀ¢&öfW76–öæÃ¢FVÆ—fW'’ç&öfW76–öæÂÀ¢&V6V—fVDC¢7G&–ær€¢ÖW76vRç6VæEF–ÖRÇÂ–ÆöBæ7&VFUF–ÖRÇÂ""ÀÐ¢’ÀÐ¢†öæRÀÐ¢FW‡BÀÐ¢ÆFf÷&Ó¢GG&–'WF–öâçÆFf÷&ÒÀÐ¢&ö6VGW&S¢WFöÖF–öåÆâç&ö6VGW&RÀÐ¢&VfW&Væ6T6FVv÷'“¢GG&–'WF–öâç&VfW&Væ6T6FVv÷'’ÀÐ¢F–VçE&öf–ÆTæÖS¢F–VçDF—7Æ”æÖRÀ¢&V6VçD6öçfW'6F–öã¢6öçfW'6F–öä†—7F÷'’À¢&–÷$–çFW&7F–öä¶æ÷vã¢FVÆ—fW'’çWFFVBÓÓÒG'VRÀ¢&VfW'&Ä6öçFW‡BÀ¢F–VçE&VÆF–öç6†— Ð¢F–VçE&VÆF–öç6†—&ö×D6öçFW‡B€Ð¢F–VçE&VÆF–öç6†—ÀÐ¢’ÀÐ¢ÆV&æ–æt6öçFW‡BÀÐ¢FWFW&Ö–æ—7F–5W&vVçC Ð¢WFöÖF–öåÆâç&V6öâÓÓÒ'÷76–&ÆU÷W&vVçE÷7–×Fö×2"ÀÐ¢ÒÀÐ¢ÆW'D–çWBÀÐ¢&Wf–WtÆW'DÇ&VG•VWVVC¢&Wf–WtÆW'EVWVVBÀÐ¢Æã¢WFöÖF–öåÆâÀÐ¢‡VÖåF¶V÷fW%FöF“¢‡VÖåF¶V÷fW$7F—fRÀÐ¢W†7DGWÆ–6FS¢7W&W74W†7DGWÆ–6FRÀÐ¢66†VGVÆ–æu&WVW7C¢ö–çFÖVçE&Wf–Wt6æF–FFRÀÐ¢g&öÓ¢7G&–ær†ÖW76vRçFòÇÂ""’ÀÐ¢Fó¢†öæRÀÐ¢&WÇ”FV&÷Væ6TÖ&¶W%7FGW2ÀÐ¢6öçfW'6F–öä7F–öâÀÐ¢F–VçE&VÆF–öç6†—ÀÐ¢Ò“°Ð ¢”7F—fUVWVVBÒG'VS° ¢6öç7B×W7Df–æ—6„&Vf÷&T6¶æ÷vÆVFvVÖVçBÐ¢6†÷VÆDv—D7F—fU&WÇ”&Vf÷&T6¶æ÷vÆVFvVÖVçB‡°¢FWFW&Ö–æ—7F–5&WÇ“ ¢FWFW&Ö–æ—7F–4Ö&¶WF–æt÷Væ–æt6æF–FFRÀ¢&V6÷fW'•&Vv—7G&F–öâÀ¢Ò“° ¢–b€¢G—Vöb6öçFW‡Còçv—EVçF–ÂÓÓÒ&gVæ7F–öâ"b`¢×W7Df–æ—6„&Vf÷&T6¶æ÷vÆVFvVÖVç@¢’°¢”7F—fU7FGW2Ò&FVfW'&VB#°¢6öç7BG&6¶VD7F—fU&öÖ—6RÒ6WGFÆTFVfW'&VD–æ&÷VæE&V6÷fW'’€¢7F—fU&öÖ—6RÀ¢°¢WfVçD–C¢7G&–ær†WfVçD–B’À¢÷WF6öÖS¢‡VÖåF¶V÷fW$7F—fP¢ò&‡VÖå÷F¶V÷fW" ¢¢'&ö6W76VB"À¢ÒÀ¢“°¢G'’°¢6öçFW‡Bçv—EVçF–Â‡G&6¶VD7F—fU&öÖ—6R“°¢Ò6F6‚°¢6öç7B÷WF6öÖRÒv—BG&6¶VD7F—fU&öÖ—6S°¢”7F—fU7FGW2Ò÷WF6öÖSòç7FGW2ÇÂ&f–ÆVB#°¢”7F—fU&WÇ•6VçBÒ÷WF6öÖSòç&WÇ•6VçBÓÓÒG'VS°¢Ð¢ÒVÇ6R°Ð¢6öç7B÷WF6öÖRÒv—B7F—fU&öÖ—6S°Ð¢”7F—fU7FGW2Ò÷WF6öÖSòç7FGW2ÇÂ&f–ÆVB#°Ð¢”7F—fU&WÇ•6VçBÒ÷WF6öÖSòç&WÇ•6VçBÓÓÒG'VS°Ð¢ÐÐ¢ÐÐ Ð¢–b‡6†÷VÆEVWVT–ÖvT6¶æ÷vÆVFvVÖVçB’°¢–ÖvT6¶æ÷vÆVFvVÖVçEVWVVBÒG'VS°Ð¢6öç7B†5&Wf–÷W46Æ–æ–5&WÇ’Ò6öçfW'6F–öä†—7F÷'’ç6öÖR€Ð¢‡GW&â’ÓàÐ¢GW&ãòç&öÆRÓÓÒ&76—7FçB"ÇÀÐ¢²&''Væ"Â&WV—Uö‡VÖæ%Òæ–æ6ÇVFW2‡GW&ãòç6÷W&6R’ÀÐ¢“°Ð¢6öç7B–ÖvT6¶æ÷vÆVFvVÖVçD&öG’ÐÐ¢'V–ÆD–ÖvT6¶æ÷vÆVFvVÖVçE&WÇ’‡°¢F–VçDæÖS¢F–VçDF—7Æ”æÖRÀ¢w&VWEF–VçC¢†5&Wf–÷W46Æ–æ–5&WÇ’À¢–çG&öGV6T''Væ Ð¢†5&Wf–÷W46Æ–æ–5&WÇ’b`Ð¢F–VçE&VÆF–öç6†—òæ¶æ÷våF–VçBÓÒG'VRÀÐ¢Ò“°Ð¢6öç7B–ÖvT6¶æ÷vÆVFvVÖVçE&W7VÇBÐÐ¢v—B6VæD7W'&VçD–æ&÷VæE&WÇ’‡°Ð¢g&öÓ¢7G&–ær†ÖW76vRçFòÇÂ""’ÀÐ¢Fó¢†öæRÀÐ¢WfVçD–C¢Gµ7G&–ær†WfVçD–B—ÒÖ–ÖvRÖ6¶æ÷vÆVFvVÖVçFÀÐ¢&Wf—6–öäWfVçD–C¢7G&–ær†WfVçD–B’ÀÐ¢&öG“¢–ÖvT6¶æ÷vÆVFvVÖVçD&öG’ÀÐ¢7W'&VçEFW‡C¢FW‡BÀÐ¢&V6VçD6öçfW'6F–öã¢6öçfW'6F–öä†—7F÷'’ÀÐ¢6öçfW'6F–öä7F–öâÀ¢&WÇ”FV&÷Væ6TÖ&¶W%7FGW2À¢F–VçE&VÆF–öç6†—À¢÷÷'GVæ—G”–C¢FVÆ—fW'’æ÷÷'GVæ—G”–BÀ¢&öfW76–öæÃ¢FVÆ—fW'’ç&öfW76–öæÂÀ¢Ò“°¢–ÖvT6¶æ÷vÆVFvVÖVçE6VçBÐÐ¢–ÖvT6¶æ÷vÆVFvVÖVçE&W7VÇBç7FGW2ÓÓÒ&6ö×ÆWFVB#°Ð¢–ÖvT6¶æ÷vÆVFvVÖVçE7FGW2ÐÐ¢–ÖvT6¶æ÷vÆVFvVÖVçE&W7VÇBç7FGW3°Ð¢ÆöuF–VçE&WÇ•&W7VÇB€Ð¢Gµ7G&–ær†WfVçD–B—ÒÖ–ÖvRÖ6¶æ÷vÆVFvVÖVçFÀÐ¢†öæRÀÐ¢–ÖvT6¶æ÷vÆVFvVÖVçE&W7VÇBÀÐ¢“°Ð Ð¢–b†–ÖvT6¶æ÷vÆVFvVÖVçE6VçB’°Ð¢v—BVæD6öçfW'6F–öåGW&â‡°Ð¢†öæRÀÐ¢&öÆS¢&76—7FçB"ÀÐ¢FW‡C¢–ÖvT6¶æ÷vÆVFvVÖVçD&öG’ÀÐ¢WfVçD–C¢Gµ7G&–ær†WfVçD–B—Ó¦–ÖvRÖ6¶æ÷vÆVFvVÖVçFÀÐ¢6÷W&6S¢&''Væ"ÀÐ¢Ò“°Ð¢Ð¢Ð ¢–b‚‡&Wf–WtÆW'EVWVVBÇÂö–çFÖVçE&Wf–WuVWVVB’bbFVÆ—fW'’æö²’°¢v—B&V6÷&D÷W&F–öæÄWfVçB‡°¢WfVçD–C¢Gµ7G&–ær†WfVçD–B—ÒÖ‡VÖâÖ†æFöffÀ¢&VçDWfVçD–C¢7G&–ær†WfVçD–B’À¢÷÷'GVæ—G”–C¢FVÆ—fW'’æ÷÷'GVæ—G”–BÀ¢†öæRÀ¢&öfW76–öæÃ¢FVÆ—fW'’ç&öfW76–öæÂÀ¢G—S¢&‡VÖåö†æFöfe÷VWVVB"À¢6÷W&6S¢&''Væ"À¢C¢æWrFFR‚’çFô•4õ7G&–ær‚’À¢÷WF6öÖS¢'VWVVB"À¢Ò“°¢Ð ¢6öç7BFW&Ö–æÅ6VæE7FGW6W2ÒæWr6WB…°¢&6ö×ÆWFVB"ÀÐ¢&GWÆ–6FR"ÀÐ¢&&Æö6¶VB"ÀÐ¢'7WW'6VFVB"ÀÐ¢Ò“°Ð¢6öç7BÆVE&÷WF–ætf–æ—6†VBÐÐ¢FVÆ—fW'’æö²b`Ð¢€Ð¢FVÆ—fW'’ç&÷WFVBÓÒfÇ6RÇÀÐ¢FVÆ—fW'’ç&÷WFU7FGW2ÓÓÒ&æöæÆVB Ð¢“°Ð¢6öç7BWFöÖF–5v÷&´f–æ—6†VBÐÐ¢ÆVE&÷WF–ætf–æ—6†VBb`Ð¢‚”7F—fUVWVVBÇÂ²&f–ÆVB"Â&FVfW'&VB%Òæ–æ6ÇVFW2†”7F—fU7FGW2’’b`Ð¢‚&–6T†öÆF–æuVWVVBÇÂFW&Ö–æÅ6VæE7FGW6W2æ†2‡&–6T†öÆF–æu7FGW2’’b`Ð¢‚&÷fVE&–6U&WÇ•VWVVBÇÂFW&Ö–æÅ6VæE7FGW6W2æ†2†&÷fVE&–6U&WÇ•7FGW2’’b`Ð¢‚÷fW&æ–v‡D†æFöfeVWVVBÇÂFW&Ö–æÅ6VæE7FGW6W2æ†2†÷fW&æ–v‡D†æFöfe7FGW2’’b`Ð¢‚–ÖvT6¶æ÷vÆVFvVÖVçEVWVVBÇÂFW&Ö–æÅ6VæE7FGW6W2æ†2†–ÖvT6¶æ÷vÆVFvVÖVçE7FGW2’’b`Ð¢‚F–VçE&WÇ•VWVVBÇÂFW&Ö–æÅ6VæE7FGW6W2æ†2‡F–VçE&WÇ•7FGW2’“°Ð¢ÆWB&V6÷fW'•7FGW2Ò&V6÷fW'•&Vv—7G&F–öâç7FGW3°Ð¢–b€Ð¢&V6÷fW'•&Vv—7G&F–öâç7FGW2ÓÒ'6¶—VB"b`Ð¢6†÷VÆD6ö×ÆWFT–æ&÷VæE&V6÷fW'’‡°Ð¢WFöÖF–5v÷&´f–æ—6†VBÀÐ¢&V6÷fW'•&Vv—7G&F–öâÀÐ¢7W&W74W†7DGWÆ–6FRÀÐ¢ÒÐ¢’°Ð¢6öç7B&V6÷fW'”6ö×ÆWF–öâÒv—B6ö×ÆWFT–æ&÷VæE&V6÷fW'’€Ð¢²WfVçD–C¢7G&–ær†WfVçD–B’ÒÀÐ¢°Ð¢÷WF6öÖS¢‡VÖåF¶V÷fW$7F—fPÐ¢ò&‡VÖå÷F¶V÷fW" Ð¢¢'&ö6W76VB"ÀÐ¢ÒÀÐ¢“°Ð¢&V6÷fW'•7FGW2Ò&V6÷fW'”6ö×ÆWF–öâç7FGW3°Ð¢ÐÐ Ð¢w&—FT÷W&F–öæÄÆör‡°¢6÷W&6S¢'–6Æ÷VB"À¢6FVv÷'“¢&–æ&÷VæE÷&ö6W76–ær"À¢&V6öã¢FVÆ—fW'’æö²ò'&ö6W76VB"¢&FVÆ—fW'•öf–ÆVB"À¢6÷W&6T–C¢WfVçD–BÀ¢f–VÆG3¢°¢WfVçEG—S¢–ÆöBçG—RÀ¢ÖW76vUG—S¢ÖW76vRçG—RÇÂçVÆÂÀ¢ÆFf÷&Ó¢GG&–'WF–öâçÆFf÷&ÒÀ¢†5&VfW'&Ã¢&ööÆVâ†ÖW76vRç&VfW'&Â’À¢&VfW&Væ6T6FVv÷'“¢GG&–'WF–öâç&VfW&Væ6T6FVv÷'’À¢ÆVDFVÆ—fW'“¢FVÆ—fW'’æö²ò'7V66W72"¢&f–ÇW&R"ÀÐ¢ÆVDFVÆ—fW'”fÆÆ&6´7F—fRÀÐ¢ÆVDGWÆ–6FS¢FVÆ—fW'’æGWÆ–6FRÓÓÒG'VRÀÐ¢ÆVDGWÆ–6FU&V6öã¢FVÆ—fW'’æGWÆ–6FU&V6öâÀÐ¢&V6÷fW&VDW†7DGWÆ–6FRÀÐ¢ÆVD–ç6W'FVC¢FVÆ—fW'’æ–ç6W'FVBÓÓÒG'VRÀÐ¢ÆVEWFFVC¢FVÆ—fW'’çWFFVBÓÓÒG'VRÀÐ¢‡VÖåF¶V÷fW%FöF“¢‡VÖåF¶V÷fW$7F—fRÀÐ¢6†VWG4‡VÖåF¶V÷fW%FöF“ Ð¢FVÆ—fW'’æ‡VÖåF¶V÷fW%FöF’ÓÓÒG'VRÀÐ¢‡VÖå&W7VÖT6öçG&öÃ Ð¢‡VÖå&W7VÖT6öçG&öÃòç7FGW2ÇÂçVÆÂÀÐ¢‡VÖå&W7VÖU66†VGVÆU7FGW2ÀÐ¢6öÖÖ—FÖVçE7–æ57FGW2ÀÐ¢6öçfW'6F–öäÖVÖ÷'•7FGW2ÀÐ¢F–VçDö–çFÖVçE&WÇ•7–æ57FGW2ÀÐ¢6öçfW'6F–öäW‡—&VBÀÐ¢&V7F—fF–öä†æFöfeVæF–ærÀÐ¢6öçfW'6F–öä†—7F÷'•GW&ç3¢6öçfW'6F–öä†—7F÷'’æÆVæwF‚ÀÐ¢F÷vç7G&VÕ7FGW3¢FVÆ—fW'’æ‡GG7FGW2ÀÐ¢F÷vç7G&VÔW'&÷#¢FVÆ—fW'’æW'&÷$6öFRÀ¢WFöÖF–öäÖöFRÀ¢WFöÖF–öå&÷WFS¢WFöÖF–öåÆâç&÷WFRÀ¢6öçfW'6F–öä7F–öã¢6öçfW'6F–öä7F–öâæ7F–öâÀ¢6öçfW'6F–öå7FFS¢6öçfW'6F–öä7F–öâç7FFRÀ¢6öçfW'6F–öä÷væW#¢6öçfW'6F–öä7F–öâæ÷væW"À¢6öçfW'6F–öäæW‡D7F–öã¢6öçfW'6F–öä7F–öâææW‡D7F–öâÀ¢&Wf–WtÆW'EVWVVBÀ¢ö–çFÖVçE&Wf–WuVWVVBÀ¢ö–çFÖVçDæVVG5&VfW&Væ6RÀ¢ö–çFÖVçE&VfW&Væ6U&WÇ•6VçBÀÐ¢ö–çFÖVçE&VfW&Væ6U&WÇ•7FGW2ÀÐ¢–ÖvT6¶æ÷vÆVFvVÖVçEVWVVBÀ¢–ÖvT6¶æ÷vÆVFvVÖVçE6VçBÀ¢–ÖvT6¶æ÷vÆVFvVÖVçE7FGW2À¢÷fW&æ–v‡D†æFöfeVWVVBÀ¢÷fW&æ–v‡D†æFöfe6VçBÀ¢&–6T†öÆF–æuVWVVBÀ¢&–6T†öÆF–æu6VçBÀ¢&÷fVE&–6U&WÇ•VWVVBÀ¢&÷fVE&–6U&WÇ•6VçBÀ¢&÷fVE&–6U&WÇ•7FGW2À¢•6†F÷uVWVVBÀ¢”7F—fUVWVVBÀ¢”7F—fU7FGW2À¢”7F—fU&WÇ•6VçBÀ¢&WÇ”FV&÷Væ6TÖ&¶W%7FGW2À¢&V6÷fW'•7FGW2À¢ÒÀ¢Ò“° Ð¢–b‚FVÆ—fW'’æö²’°¢&WGW&â§6öâ€Ð¢°Ð¢&V6V—fVC¢fÇ6RÀÐ¢W'&÷#¢&ÆVEöFVÆ—fW'•öf–ÆVB"ÀÐ¢F÷vç7G&VÕ7FGW3¢FVÆ—fW'’æ‡GG7FGW2ÀÐ¢F÷vç7G&VÔW'&÷#¢FVÆ—fW'’æW'&÷$6öFRÀÐ¢WFöÖF–5v÷&´f–æ—6†VC¢fÇ6RÀÐ¢ÒÀÐ¢S"ÀÐ¢“°Ð¢ÐÐ Ð¢&WGW&â§6öâ‡°Ð¢&V6V—fVC¢G'VRÀÐ¢ÆVE&V6÷&FVC¢G'VRÀÐ¢ÆVE&÷WFVC¢FVÆ—fW'’ç&÷WFVBÓÒfÇ6RÀÐ¢ÆVE&÷WFU7FGW3¢FVÆ—fW'’ç&÷WFU7FGW2ÇÂ'&W6öÇfVB"ÀÐ¢WFöÖF–5v÷&´f–æ—6†VBÀÐ¢ÆVD–ç6W'FVC¢FVÆ—fW'’æ–ç6W'FVBÓÓÒG'VRÀÐ¢ÆVEWFFVC¢FVÆ—fW'’çWFFVBÓÓÒG'VRÀÐ¢‡VÖåF¶V÷fW%FöF“¢‡VÖåF¶V÷fW$7F—fRÀÐ¢6†VWG4‡VÖåF¶V÷fW%FöF“ Ð¢FVÆ—fW'’æ‡VÖåF¶V÷fW%FöF’ÓÓÒG'VRÀÐ¢‡VÖå&W7VÖT6öçG&öÃ Ð¢‡VÖå&W7VÖT6öçG&öÃòç7FGW2ÇÂçVÆÂÀÐ¢‡VÖå&W7VÖU66†VGVÆU7FGW2ÀÐ¢6öÖÖ—FÖVçE7–æ57FGW2ÀÐ¢GWÆ–6FS¢FVÆ—fW'’æGWÆ–6FRÓÓÒG'VRÀÐ¢GWÆ–6FU&V6öã¢FVÆ—fW'’æGWÆ–6FU&V6öâÀÐ¢&V6÷fW&VDW†7DGWÆ–6FRÀÐ¢6öçfW'6F–öäÖVÖ÷'“¢6öçfW'6F–öäÖVÖ÷'•7FGW2ÀÐ¢F–VçDö–çFÖVçE&WÇ•7–æ57FGW2ÀÐ¢6öçfW'6F–öäW‡—&VBÀÐ¢&V7F—fF–öä†æFöfeVæF–ærÀÐ¢WFöÖF–öã¢°Ð¢ÖöFS¢WFöÖF–öäÖöFRÀÐ¢&÷WFS¢WFöÖF–öåÆâç&÷WFRÀÐ¢&WÇ”6öFS¢WFöÖF–öåÆâç&WÇ”6öFRÀÐ¢F–VçE&VÆF–öç6†— Ð¢WFöÖF–öåÆâçF–VçE&VÆF–öç6†—òç7FFRÇÂ'Væ¶æ÷vâ"ÀÐ¢ÒÀÐ¢6öçfW'6F–öä7F–öã¢°Ð¢7F–öã¢6öçfW'6F–öä7F–öâæ7F–öâÀÐ¢&V6öã¢6öçfW'6F–öä7F–öâç&V6öâÀÐ¢Vç&W6öÇfVE&WVW7C Ð¢6öçfW'6F–öä7F–öâçVç&W6öÇfVE&WVW7BÀÐ¢föÆÆ÷wWöÆ–7“ Ð¢6öçfW'6F–öä7F–öâæföÆÆ÷wWöÆ–7’ÀÐ¢Ö–æ–×VÔföÆÆ÷wWFVÆ”†÷W'3 Ð¢6öçfW'6F–öä7F–öâæÖ–æ–×VÔföÆÆ÷wWFVÆ”†÷W'2ÀÐ¢ÒÀÐ¢&Wf–WtÆW'EVWVVBÀÐ¢ö–çFÖVçE&Wf–WuVWVVBÀÐ¢ö–çFÖVçDæVVG5&VfW&Væ6RÀÐ¢ö–çFÖVçE&VfW&Væ6U&WÇ•6VçBÀÐ¢ö–çFÖVçE&VfW&Væ6U&WÇ•7FGW2ÀÐ¢–ÖvT6¶æ÷vÆVFvVÖVçEVWVVBÀÐ¢–ÖvT6¶æ÷vÆVFvVÖVçE6VçBÀÐ¢–ÖvT6¶æ÷vÆVFvVÖVçE7FGW2ÀÐ¢F–VçE&WÇ•VWVVBÀÐ¢F–VçE&WÇ•6VçBÀÐ¢÷fW&æ–v‡D†æFöfeVWVVBÀÐ¢÷fW&æ–v‡D†æFöfe6VçBÀÐ¢&–6T†öÆF–æuVWVVBÀÐ¢&–6T†öÆF–æu6VçBÀÐ¢&÷fVE&–6U&WÇ”¶–æBÀÐ¢&÷fVE&–6U&WÇ•VWVVBÀÐ¢&÷fVE&–6U&WÇ•6VçBÀÐ¢&÷fVE&–6U&WÇ•7FGW2ÀÐ¢F—&V7DÆ–gF–æu&–6UVWVVC Ð¢&÷fVE&–6U&WÇ”¶–æBÓÓÒ&Æ–gF–æu÷&ævR"b`Ð¢&÷fVE&–6U&WÇ•VWVVBÀÐ¢F—&V7DÆ–gF–æu&–6U6VçC Ð¢&÷fVE&–6U&WÇ”¶–æBÓÓÒ&Æ–gF–æu÷&ævR"b`Ð¢&÷fVE&–6U&WÇ•6VçBÀÐ¢•6†F÷uVWVVBÀÐ¢”7F—fUVWVVBÀÐ¢”7F—fU7FGW2ÀÐ¢”7F—fU&WÇ•6VçBÀÐ¢&öfW76–öæÄf7E&WÇ•6VçBÀÐ¢&öfW76–öæÄf7E&WÇ•7FGW2ÀÐ¢&V6÷fW'•7FGW2ÀÐ¢Ò“°Ð§Ð ¦W‡÷'BFVfVÇB†æFÆU”6Æ÷VEvV&†öö³° Ð¦W‡÷'B6öç7B6öæf–rÒ°Ð¢òò¶VWF†RF–VçBÖf6–ærvV&†öö²öâF†R6–×ÆW7BF‚âW‡Vç6—fR&WÇÐ¢òòv÷&²7F–ÆÂW6W26öçFW‡Bçv—EVçF–Æv†VâæWFÆ–g’&÷f–FW2—BÂv†–ÆRF†PÐ¢òòf–æÂ÷WF&÷VæBÆö6²&WfVçG26öæ7W'&VçB‡VÖâ÷"&WG'’g&öÒGWÆ–6F–æpÐ¢òòF†R&W7öç6RàÐ¢Fƒ¢"ö’÷–6Æ÷VB÷vV&†öö²"ÀÐ§Ó°Ð 