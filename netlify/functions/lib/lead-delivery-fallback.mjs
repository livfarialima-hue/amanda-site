const ACQUISITION_REFERENCE_CATEGORIES = new Set([
  "meta_coded",
  "meta_ad_id",
  "meta_uncoded",
  "google_coded",
  "google_click_id",
  "site_page",
  "site_cta",
  "site_uncoded",
]);

function textOfTurn(turn) {
  return String(turn?.text || turn?.content || "").trim();
}

function hasEmbeddedAcquisitionEvidence(value) {
  const text = String(value || "");
  return (
    /\b(?:M26|G26)[A-Z0-9-]*\b/i.test(text) ||
    /\b(?:GCLID|GBRAID|WBRAID)\s*:/i.test(text) ||
    /\b(?:refer[eê]ncia|ref\.)\s*:/i.test(text) ||
    /\borigem do contato\s*:\s*site liv faria lima\b/i.test(text)
  );
}

export function hasRecentAcquisitionContext({
  attribution,
  recentConversation = [],
} = {}) {
  if (
    ACQUISITION_REFERENCE_CATEGORIES.has(
      String(attribution?.referenceCategory || ""),
    )
  ) {
    return true;
  }

  return recentConversation.some((turn) =>
    hasEmbeddedAcquisitionEvidence(textOfTurn(turn)),
  );
}

export function canContinuePatientAutomationWithoutLeadDelivery({
  automationMode,
  messageType,
  text,
  plan,
  attribution,
  recentConversation,
} = {}) {
  if (String(automationMode || "").toLowerCase() !== "active") {
    return false;
  }
  if (
    String(messageType || "").toLowerCase() !== "text" ||
    !String(text || "").trim()
  ) {
    return false;
  }
  if (
    plan?.route !== "standard_reply" ||
    plan?.automaticAllowed === false ||
    plan?.professional === "daniel"
  ) {
    return false;
  }

  return hasRecentAcquisitionContext({
    attribution,
    recentConversation,
  });
}

export { ACQUISITION_REFERENCE_CATEGORIES };
