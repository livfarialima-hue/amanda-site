import { hasCampaignReferenceCode } from "./marketing-prefill.mjs";

export function hasInternalReferenceExposure(value) {
  const text = String(value || "");

  return Boolean(
    hasCampaignReferenceCode(text) ||
      /\b(?:JID|Opportunity\s+ID|Event\s+ID|Message\s+ID|Template\s+ID|replyCode)\b/i.test(
        text,
      ) ||
      /\bJ1_[A-Za-z0-9_-]{8,}\b|\bwamid\.[A-Za-z0-9+/=_-]+/i.test(text) ||
      /\bc[oó]digo\s+interno\b/i.test(text) ||
      /\b(?:c[oó]digo|refer[eê]ncia)\b[\s\S]{0,80}\b(?:an[uú]ncio|campanha|rastreamento|atribui[cç][aã]o)\b/i.test(
        text,
      ) ||
      /\b(?:an[uú]ncio|campanha|rastreamento|atribui[cç][aã]o)\b[\s\S]{0,80}\b(?:c[oó]digo|refer[eê]ncia)\b/i.test(
        text,
      ) ||
      /\b(?:rastre(?:ar|amento)|atribui[cç][aã]o)\b[\s\S]{0,80}\b(?:an[uú]ncio|campanha|origem|contato)\b/i.test(
        text,
      ) ||
      /\bidentific(?:ar|armos?)\b[\s\S]{0,60}\b(?:an[uú]ncio|campanha)\b/i.test(
        text,
      )
  );
}
