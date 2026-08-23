export const MARKETING_PREFILL_TEMPLATE_ID = "procedure_evaluation_v1";

const CAMPAIGN_REFERENCE_CODE_PATTERN = /\b(?:M26|G26)[A-Z0-9_-]+\b/i;

export function normalizeMarketingPrefillTemplateId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === MARKETING_PREFILL_TEMPLATE_ID ? normalized : "";
}

export function foldMarketingText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isSiteServicePickerPrefill(text) {
  const normalizedText = foldMarketingText(text);
  return (
    /\borigem do contato\s*:\s*site liv faria lima\b/i.test(
      normalizedText,
    ) &&
    /\bgostaria de (?:agendar|marcar) uma consulta\b/i.test(
      normalizedText,
    ) &&
    /\bcirurgia plastica\/estetica\b/i.test(normalizedText) &&
    /\bcardiologia\b/i.test(normalizedText)
  );
}

export function inboundReplyPriority(text) {
  const normalizedText = foldMarketingText(text);
  if (isSiteServicePickerPrefill(normalizedText)) return 10;
  if (/^(?:oi|ola|bom dia|boa tarde|boa noite)[!.\s]*$/i.test(normalizedText)) {
    return 30;
  }
  return 100;
}

export function isLikelyMarketingPrefilledMessage({ templateId } = {}) {
  return Boolean(normalizeMarketingPrefillTemplateId(templateId));
}

export function hasCampaignReferenceCode(value) {
  return CAMPAIGN_REFERENCE_CODE_PATTERN.test(String(value || ""));
}
