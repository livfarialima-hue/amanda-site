import test from "node:test";
import assert from "node:assert/strict";

import {
  hasCampaignReferenceCode,
  inboundReplyPriority,
  isLikelyMarketingPrefilledMessage,
  isSiteServicePickerPrefill,
  MARKETING_PREFILL_TEMPLATE_ID,
  normalizeMarketingPrefillTemplateId,
} from "./marketing-prefill.mjs";
import {
  hasCampaignReferenceCode as legacyHasCampaignReferenceCode,
  inboundReplyPriority as legacyInboundReplyPriority,
} from "./whatsapp-automation.mjs";

const SITE_PICKER_MESSAGE = `Olá!
Origem do contato: Site LIV Faria Lima
Gostaria de agendar uma consulta
Cirurgia Plástica/Estética
Cardiologia`;

test("site service picker remains the highest-priority inbound prefill", () => {
  assert.equal(isSiteServicePickerPrefill(SITE_PICKER_MESSAGE), true);
  assert.equal(inboundReplyPriority(SITE_PICKER_MESSAGE), 10);
  assert.equal(inboundReplyPriority("Olá"), 30);
  assert.equal(inboundReplyPriority("Quero saber sobre a consulta"), 100);
});

test("marketing template ids fail closed to the known template", () => {
  assert.equal(
    normalizeMarketingPrefillTemplateId(" PROCEDURE_EVALUATION_V1 "),
    MARKETING_PREFILL_TEMPLATE_ID,
  );
  assert.equal(normalizeMarketingPrefillTemplateId("unknown"), "");
  assert.equal(
    isLikelyMarketingPrefilledMessage({
      templateId: MARKETING_PREFILL_TEMPLATE_ID,
    }),
    true,
  );
  assert.equal(isLikelyMarketingPrefilledMessage({ templateId: "unknown" }), false);
});

test("Google and Meta journey reference codes remain recognizable", () => {
  for (const value of ["Ref: G26CERV", "m26f01w", "campanha M26O01W-extra"]) {
    assert.equal(hasCampaignReferenceCode(value), true);
    assert.equal(
      legacyHasCampaignReferenceCode(value),
      hasCampaignReferenceCode(value),
    );
  }
  assert.equal(hasCampaignReferenceCode("X-FRONTO-01"), false);
});

test("legacy marketing exports remain compatible", () => {
  for (const text of [SITE_PICKER_MESSAGE, "Olá", "Quero uma avaliação"]) {
    assert.equal(legacyInboundReplyPriority(text), inboundReplyPriority(text));
  }
});
