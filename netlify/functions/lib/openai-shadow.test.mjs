import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  applyFirstReplyGreetingGuard,
  applyReturningPatientReplyGuard,
  createSafetyIdentifier,
  parseOpenAIShadowResponse,
  runOpenAIShadow,
} from "./openai-shadow.mjs";
import webhook, {
  attributionFallbackReason,
  classifyAttribution,
  normalizeResolvedJourneyAttribution,
  resolveInboundAttributionJourney,
  stripAttributionTransportToken,
} from "../ycloud-webhook.mjs";

const PHONE = "+5511961957144";

function validDecision(overrides = {}) {
  return {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    professional: "amanda",
    procedure: "blefaroplastia",
    replyCode: "",
    suggestedReply: "Ola! Posso ajudar com sua avaliacao. Qual periodo prefere?",
    reviewReason: "",
    ...overrides,
  };
}

test("returning-patient guard removes a repeated Bruna introduction", () => {
  const guarded = applyReturningPatientReplyGuard(
    validDecision({
      suggestedReply:
        "OlÃ¡, Ana! Eu sou a Bruna, concierge da ClÃ­nica LIV Faria Lima. Como posso ajudar?",
    }),
    {
      knownPatient: true,
      state: "former_patient",
    },
  );

  assert.match(
    guarded.suggestedReply,
    /Que bom falar com vocÃª novamente/i,
  );
  assert.doesNotMatch(
    guarded.suggestedReply,
    /Eu sou a Bruna/i,
  );
});

test("first acquisition reply always starts with a human greeting and Bruna introduction", () => {
  const guarded = applyFirstReplyGreetingGuard(
    validDecision({
      suggestedReply:
        "Eu sou a Bruna, concierge da ClÃ­nica LIV Faria Lima. O lifting facial reposiciona tecidos da face e do pescoÃ§o.",
    }),
    {
      patientProfileName: "Rosana Macedo",
      recentConversation: [],
      patientRelationship: { knownPatient: false, state: "new_lead" },
    },
  );

  assert.equal(
    guarded.suggestedReply,
    "OlÃ¡, Rosana! Eu sou a Bruna, concierge da ClÃ­nica LIV Faria Lima. O lifting facial reposiciona tecidos da face e do pescoÃ§o.",
  );
});

test("first acquisition reply inserts the introduction when the model omits it", () => {
  const guarded = applyFirstReplyGreetingGuard(
    validDecision({
      suggestedReply: "Oi! Posso te orientar sobre o lifting facial.",
    }),
    {
      patientProfileName: "",
      recentConversation: [],
      patientRelationship: { knownPatient: false, state: "new_lead" },
    },
  );

  assert.equal(
    guarded.suggestedReply,
    "OlÃ¡! Eu sou a Bruna, concierge da ClÃ­nica LIV Faria Lima. Posso te orientar sobre o lifting facial.",
  );
});

test("known patient receives a greeting without a new-lead introduction", () => {
  const guarded = applyFirstReplyGreetingGuard(
    validDecision({
      suggestedReply: "Claro, vou te ajudar com isso.",
    }),
    {
      patientProfileName: "MÃ´nica Mussolino",
      recentConversation: [],
      patientRelationship: { knownPatient: true, state: "former_patient" },
    },
  );

  assert.equal(
    guarded.suggestedReply,
    "OlÃ¡, MÃ´nica! Claro, vou te ajudar com isso.",
  );
  assert.doesNotMatch(guarded.suggestedReply, /Eu sou a Bruna/i);
});

test("greeting guard does not repeat the greeting in an ongoing conversation", () => {
  const decision = validDecision({
    suggestedReply: "Claro, posso explicar melhor.",
  });
  const guarded = applyFirstReplyGreetingGuard(decision, {
    patientProfileName: "Rosana",
    recentConversation: [
      { role: "assistant", source: "bruna", text: "OlÃ¡, Rosana!" },
    ],
    patientRelationship: { knownPatient: false, state: "engaged_lead" },
  });

  assert.deepEqual(guarded, decision);
});

function validResponse(decision = validDecision()) {
  return {
    model: "test-model",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(decision),
          },
        ],
      },
    ],
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
    },
  };
}

test("missing configuration is skipped without throwing", async () => {
  const result = await runOpenAIShadow(
    { phone: PHONE, text: "Ola", platform: "Google" },
    { env: {} },
  );

  assert.deepEqual(result, {
    status: "skipped",
    errorCode: "configuration_missing",
  });
});

test("recognizes the current site WhatsApp reference as a website visit", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "OlÃ¡, vim pela pÃ¡gina da Dra. Amanda.\n\nReferÃªncia: Blefaroplastia",
  );

  assert.equal(attribution.platform, "OrgÃ¢nico/ConteÃºdo");
  assert.equal(attribution.referenceCategory, "site_page");
  assert.equal(attribution.reference, "Blefaroplastia");
});

test("recognizes the stable organic SITE reference created by every page", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "OlÃ¡, vim pelo site.\n\nRef. SITE-lifting-facial",
  );

  assert.equal(attribution.platform, "OrgÃ¢nico/ConteÃºdo");
  assert.equal(attribution.referenceCategory, "site_page");
  assert.equal(attribution.reference, "SITE-lifting-facial");
});

test("recognizes Google Ads without exposing a click ID before consent", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "OlÃ¡, gostaria de uma avaliaÃ§Ã£o.\n\nRef. G26ADS-lifting-facial",
  );

  assert.equal(attribution.platform, "Google");
  assert.equal(attribution.referenceCategory, "google_coded");
  assert.equal(attribution.reference, "G26ADS-lifting-facial");
  assert.deepEqual(attribution.clickIds, {});
});

test("recognizes a complete Meta site journey with creative and page codes", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "OlÃ¡, gostaria de saber mais.\n\nRef. M26O01W-DbHKuWfGP_N-OT02",
  );

  assert.equal(attribution.platform, "Meta");
  assert.equal(attribution.referenceCategory, "meta_coded");
  assert.equal(attribution.reference, "M26O01W-DbHKuWfGP_N-OT02");
});

test("recognizes the exact M26F02S site journey used by the active campaign", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "OlÃƒÂ¡, gostaria de saber mais.\n\nRef. M26F02S-avaliacao-facial",
  );

  assert.equal(attribution.platform, "Meta");
  assert.equal(attribution.referenceCategory, "meta_coded");
  assert.equal(attribution.reference, "M26F02S-avaliacao-facial");
  assert.equal(attribution.fallbackReason, "");
  assert.deepEqual(attribution.clickIds, {});
});

test("distinguishes the cervical direct and site references before persistence", () => {
  const direct = classifyAttribution(
    {},
    {},
    "OlÃ¡! Quero saber sobre lifting cervical. Ref. M26C01W-C07H01",
  );
  const site = classifyAttribution(
    {},
    {},
    "OlÃ¡! Vim pelo site. Ref. M26C02S-C07H01-lifting-cervical",
  );

  assert.equal(direct.platform, "Meta");
  assert.equal(direct.referenceCategory, "meta_coded");
  assert.equal(direct.reference, "M26C01W-C07H01");
  assert.equal(site.platform, "Meta");
  assert.equal(site.referenceCategory, "meta_coded");
  assert.equal(site.reference, "M26C02S-C07H01-lifting-cervical");
});

test("resolved journey enriches the lead contract without exposing its token", async () => {
  const claimantId = `C1_${"a".repeat(43)}`;
  const journey = {
    version: 1,
    first_touch: {
      occurred_at: "2026-08-15T10:00:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      creative_code: "C01H01",
      meta_campaign_id: "120000000000000000",
      meta_adset_id: "120000000000000001",
      meta_ad_id: "120000000000000002",
      page_path: "/avaliacao-facial/",
    },
    last_touch: {
      occurred_at: "2026-08-15T12:00:00.000Z",
      origin: "Acesso direto",
      channel: "direct",
      page_path: "/blefaroplastia/",
    },
    last_non_direct_touch: {
      occurred_at: "2026-08-15T10:00:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      creative_code: "C01H01",
      meta_campaign_id: "120000000000000000",
      meta_adset_id: "120000000000000001",
      meta_ad_id: "120000000000000002",
      page_path: "/avaliacao-facial/",
    },
    conversion_path: "meta_site_return_whatsapp",
    cta: { page_path: "/blefaroplastia/", location: "final" },
    click_ids: {},
    confidence: "observed",
    fallback_reason: "",
  };
  const resolution = await resolveInboundAttributionJourney(
    `Mensagem\nJID: J1_${"A".repeat(22)}`,
    {
      claimantId,
      resolveImpl: async (_token, options) => {
        assert.equal(options.claimantId, claimantId);
        return journey;
      },
    },
  );
  assert.equal(resolution.status, "resolved");
  const attribution = classifyAttribution(
    {},
    {},
    "Mensagem sem referÃªncia",
    resolution.journey,
  );

  assert.equal(attribution.platform, "Meta");
  assert.equal(attribution.referenceCategory, "meta_coded");
  assert.equal(attribution.journey.initialOrigin, "Meta Ads");
  assert.equal(attribution.journey.currentChannel, "direct");
  assert.equal(attribution.journey.initialCampaignCode, "M26F02S");
  assert.equal(attribution.journey.currentCampaignCode, "");
  assert.equal(
    attribution.journey.conversionPath,
    "meta_site_return_whatsapp",
  );
  assert.equal(attribution.journey.landingPage, "/avaliacao-facial/");
  assert.equal(attribution.journey.ctaPage, "/blefaroplastia/");
  assert.equal("token" in attribution.journey, false);
  assert.equal(
    "token" in normalizeResolvedJourneyAttribution(journey),
    false,
  );
});

test("first-touch dimensions never absorb a later paid campaign", () => {
  const journey = {
    version: 1,
    first_touch: {
      occurred_at: "2026-08-15T10:00:00.000Z",
      origin: "Google orgÃ¢nico",
      channel: "organic_search",
      page_path: "/avaliacao-facial/",
    },
    last_touch: {
      occurred_at: "2026-08-15T12:00:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      adgroup_code: "ADSET01",
      creative_code: "C01H01",
      meta_campaign_id: "120000000000000000",
      meta_adset_id: "120000000000000001",
      meta_ad_id: "120000000000000002",
      page_path: "/blefaroplastia/",
    },
    last_non_direct_touch: {
      occurred_at: "2026-08-15T12:00:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      creative_code: "C01H01",
      page_path: "/blefaroplastia/",
    },
    conversion_path: "meta_site_return_whatsapp",
    cta: { page_path: "/blefaroplastia/", location: "hero" },
    confidence: "partial",
  };
  const normalized = normalizeResolvedJourneyAttribution(journey);
  assert.equal(normalized.initialOrigin, "Google orgÃ¢nico");
  assert.equal(normalized.campaignCode, "");
  assert.equal(normalized.initialCampaignCode, "");
  assert.equal(normalized.initialMetaCampaignId, "");
  assert.equal(normalized.currentOrigin, "Meta Ads");
  assert.equal(normalized.currentCampaignCode, "M26F02S");
  assert.equal(normalized.currentCreativeCode, "C01H01");
  assert.equal(normalized.currentMetaAdsetId, "120000000000000001");
  assert.equal(normalized.currentMetaAdId, "120000000000000002");
  assert.equal(normalized.platform, "OrgÃ¢nico/ConteÃºdo");
});

test("full webhook claims J1, strips it, and delivers resolved attribution to Sheets", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "ATTRIBUTION_CLAIM_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const sheetsRequests = [];
  const token = `J1_${"D".repeat(22)}`;
  const eventId = "synthetic-meta-site-event";

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    ATTRIBUTION_CLAIM_SECRET:
      "dedicated-attribution-claim-secret-with-adequate-length",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    WHATSAPP_AUTOMATION_MODE: "off",
  });
  delete process.env.OPENAI_API_KEY;
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const request = JSON.parse(options.body);
      sheetsRequests.push(request);
      return new Response(JSON.stringify({
        ok: true,
        inserted: true,
        updated: false,
        duplicate: false,
        opportunityId: "opp_v2_amanda_synthetic",
        professional: "amanda",
        routeStatus: "resolved",
        routed: true,
      }), { status: 200 });
    }
    throw new Error(`unexpected destination: ${url}`);
  };

  const journey = {
    version: 1,
    first_touch: {
      occurred_at: "2026-08-15T10:00:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      adgroup_code: "ADSET01",
      creative_code: "C01H01",
      meta_campaign_id: "120000000000000000",
      meta_adset_id: "120000000000000001",
      meta_ad_id: "120000000000000002",
      page_path: "/avaliacao-facial/",
    },
    last_touch: {
      occurred_at: "2026-08-15T10:03:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      adgroup_code: "ADSET01",
      creative_code: "C01H01",
      meta_campaign_id: "120000000000000000",
      meta_adset_id: "120000000000000001",
      meta_ad_id: "120000000000000002",
      page_path: "/blefaroplastia/",
    },
    last_non_direct_touch: {
      occurred_at: "2026-08-15T10:03:00.000Z",
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      creative_code: "C01H01",
      page_path: "/blefaroplastia/",
    },
    conversion_path: "meta_site_whatsapp",
    cta: { page_path: "/blefaroplastia/", location: "hero" },
    confidence: "observed",
    fallback_reason: "",
  };

  try {
    const rawBody = JSON.stringify({
      id: eventId,
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "synthetic-meta-site-message",
        from: "+5511900000000",
        to: PHONE,
        type: "text",
        customerProfile: { name: "Paciente Teste" },
        text: { body: `OlÃ¡, quero uma avaliaÃ§Ã£o.\nJID: ${token}` },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    ).update(`${timestamp}.${rawBody}`).digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` },
        body: rawBody,
      }),
÷÷¶‰ËkºwµçHÔØˆ°(€€€€€ÁÉ½•ÍÌ¹•¹Ø¹e1=U}]	!==-}MIP°(€€€€¤(€€€€€€¹ÕÁ‘…Ñ”¡€‘íÑ¥µ•ÍÑ…µÁô¸‘íÉ…İ	½‘åõ€¤(€€€€€€¹‘¥•ÍĞ ‰¡•àˆ¤ì(€€€½¹ÍĞÉ•ÍÁ½¹Í”€ô…İ…¥Ğİ•‰¡½½¬ (€€€€€¹•ÜI•ÅÕ•ÍĞ ‰¡ÑÑÀè¼½±½…±¡½ÍĞ½…Á¤½å±½Õ½İ•‰¡½½¬ˆ°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€€‰e±½ÕµM¥¹…ÑÕÉ”ˆèĞô‘íÑ¥µ•ÍÑ…µÁô±Ìô‘íÍ¥¹…ÑÕÉ•õ€°(€€€€€€€ô°(€€€€€€€‰½‘äèÉ…İ	½‘ä°(€€€€€ô¤°(€€€€€ìİ…¥ÑU¹Ñ¥°è€¡ÁÉ½µ¥Í”¤€ôøÁ•¹‘¥¹œ¹ÁÕÍ ¡ÁÉ½µ¥Í”¤ô°(€€€€¤ì(€€€½¹ÍĞ‰½‘ä€ô…İ…¥ĞÉ•ÍÁ½¹Í”¹©Í½¸ ¤ì(€€€…İ…¥ĞAÉ½µ¥Í”¹…±°¡Á•¹‘¥¹œ¤ì((€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…¥M¡…‘½İEÕ•Õ•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…¥Ñ¥Ù•EÕ•Õ•°ÑÉÕ”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹Á…Ñ¥•¹ÑI•Á±åEÕ•Õ•°™…±Í”¤ì((€€€½¹ÍĞÁ…Ñ¥•¹ÑI•ÅÕ•ÍÑÌ€ôÉ•ÅÕ•ÍÑÌ¹™¥±Ñ•È (€€€€€€¡É•ÅÕ•ÍĞ¤€ôø(€€€€€€€É•ÅÕ•ÍĞ¹ÕÉ°€ôôô(€€€€€€€€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡Á…Ñ¥•¹ÑI•ÅÕ•ÍÑÌ¹±•¹Ñ °€Ä¤ì(€€€½¹ÍĞÁ…Ñ¥•¹Ñ	½‘ä€ô)M=8¹Á…ÉÍ”¡Á…Ñ¥•¹ÑI•ÅÕ•ÍÑÍlÁt¹½ÁÑ¥½¹Ì¹‰½‘ä¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡Á…Ñ¥•¹Ñ	½‘ä¹ÑåÁ”°€‰Ñ•áĞˆ¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…° (€€€€€Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°(€€€€€€‰=³„°5…É¥„„ÔÍ½Ô„	ÉÕ¹„°½¹¥•É”‘„³µ¹¥„1%X…É¥„1¥µ„¸…Ù…±¥‡Ÿ¼ƒ¤¥¹‘¥Ù¥‘Õ…°¸<ÅÕ”Ù½¨‘•Í•©„µ•±¡½É…Èüˆ°(€€€€¤ì(€€€½¹ÍĞ½Á•É…Ñ¥½¹…±I•ÅÕ•ÍĞ€ôÉ•ÅÕ•ÍÑÌ¹™¥¹ ¡É•ÅÕ•ÍĞ¤€ôøì(€€€€€¥˜€¡É•ÅÕ•ÍĞ¹ÕÉ°€„ôôÁÉ½•ÍÌ¹•¹Ø¹==1}M!QM}]	!==-}UI0¤É•ÑÕÉ¸™…±Í”ì(€€€€€É•ÑÕÉ¸)M=8¹Á…ÉÍ”¡É•ÅÕ•ÍĞ¹½ÁÑ¥½¹Ì¹‰½‘ä¤¹…Ñ¥½¸€ôôô(€€€€€€€€‰É•½É‘}½Á•É…Ñ¥½¹…±}•Ù•¹Ğˆì(€€€ô¤ì(€€€…ÍÍ•ÉĞ¹½¬¡½Á•É…Ñ¥½¹…±I•ÅÕ•ÍĞ¤ì(€€€½¹ÍĞ½Á•É…Ñ¥½¹…±Ù•¹Ğ€ô)M=8¹Á…ÉÍ” (€€€€€½Á•É…Ñ¥½¹…±I•ÅÕ•ÍĞ¹½ÁÑ¥½¹Ì¹‰½‘ä°(€€€€¤¹•Ù•¹Ğì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡½Á•É…Ñ¥½¹…±Ù•¹Ğ¹½ÁÁ½ÉÑÕ¹¥Ñå%°€‰½ÁÀµ…Ñ¥Ù”µÍÑ…¹‘…Éˆ¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡½Á•É…Ñ¥½¹…±Ù•¹Ğ¹ÑåÁ”°€‰…ÕÑ½µ…Ñ¥}É•Á±å}Í•¹Ğˆ¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡=‰©•Ğ¹¡…Í=İ¸¡½Á•É…Ñ¥½¹…±Ù•¹Ğ°€‰Ñ•áĞˆ¤°™…±Í”¤ì(€ô™¥¹…±±äì(€€€±½‰…±Q¡¥Ì¹™•Ñ €ô½É¥¥¹…±•Ñ ì(€€€½¹Í½±”¹±½œ€ô½É¥¥¹…±1½œì((€€€™½È€¡½¹ÍĞm­•ä°Ù…±Õ•t½˜=‰©•Ğ¹•¹ÑÉ¥•Ì¡Í…Ù•‘¹Ù¥É½¹µ•¹Ğ¤¤ì(€€€€€¥˜€¡Ù…±Õ”€ôôôÕ¹‘•™¥¹•¤‘•±•Ñ”ÁÉ½•ÍÌ¹•¹Ùm­•åtì(€€€€€•±Í”ÁÉ½•ÍÌ¹•¹Ùm­•åt€ôÙ…±Õ”ì(€€€ô(€ô)ô¤ì()Ñ•ÍĞ ‰½‘•…ÅÕ¥Í¥Ñ¥½¸É•µ…¥¹ÌÍ¥±•¹Ğİ¡•¸M¡••ÑÌ…¹¹½Ğ•ÍÑ…‰±¥Í „É½ÕÑ”ˆ°…Íå¹Œ€ ¤€ôøì(€½¹ÍĞ•¹Ù¥É½¹µ•¹Ñ-•åÌ€ôl(€€€€‰e1=U}]	!==-}MIPˆ°(€€€€‰e1=U}A%}-dˆ°(€€€€‰==1}M!QM}]	!==-}UI0ˆ°(€€€€‰==1}M!QM}]	!==-}MIPˆ°(€€€€‰=A9%}A%}-dˆ°(€€€€‰]!QMAA}UQ=5Q%=9}5=ˆ°(€€€€‰]!QMAA}1IQ}9U5	Hˆ°(€tì(€½¹ÍĞÍ…Ù•‘¹Ù¥É½¹µ•¹Ğ€ô=‰©•Ğ¹™É½µ¹ÑÉ¥•Ì (€€€•¹Ù¥É½¹µ•¹Ñ-•åÌ¹µ…À ¡­•ä¤€ôøm­•ä°ÁÉ½•ÍÌ¹•¹Ùm­•åut¤°(€€¤ì(€½¹ÍĞ½É¥¥¹…±•Ñ €ô±½‰…±Q¡¥Ì¹™•Ñ ì(€½¹ÍĞ½É¥¥¹…±1½œ€ô½¹Í½±”¹±½œì(€½¹ÍĞÉ•ÅÕ•ÍÑÌ€ômtì((€=‰©•Ğ¹…ÍÍ¥¸¡ÁÉ½•ÍÌ¹•¹Ø°ì(€€€e1=U}]	!==-}MIPè€‰İ•‰¡½½¬µÑ•ÍĞµÍ•É•Ğˆ°(€€€e1=U}A%}-dè€‰å±½ÕµÑ•ÍĞµ­•äˆ°(€€€==1}M!QM}]	!==-}UI0è(€€€€€€‰¡ÑÑÁÌè¼½Í¡••ÑÌ¹•á…µÁ±”¹Ñ•ÍĞ½İ•‰¡½½¬ˆ°(€€€==1}M!QM}]	!==-}MIPè€‰Í¡••ÑÌµÑ•ÍĞµÍ•É•Ğˆ°(€€€=A9%}A%}-dè€‰½Á•¹…¤µÑ•ÍĞµ­•äˆ°(€€€]!QMAA}UQ=5Q%=9}5=è€‰…Ñ¥Ù”ˆ°(€ô¤ì(€‘•±•Ñ”ÁÉ½•ÍÌ¹•¹Ø¹]!QMAA}1IQ}9U5	Hì(€½¹Í½±”¹±½œ€ô€ ¤€ôøíôì(€±½‰…±Q¡¥Ì¹™•Ñ €ô…Íå¹Œ€¡ÕÉ°°½ÁÑ¥½¹Ì¤€ôøì(€€€É•ÅÕ•ÍÑÌ¹ÁÕÍ ¡ìÕÉ°°½ÁÑ¥½¹Ìô¤ì((€€€¥˜€¡ÕÉ°€ôôôÁÉ½•ÍÌ¹•¹Ø¹==1}M!QM}]	!==-}UI0¤ì(€€€€€½¹ÍĞ•ÉÉ½È€ô¹•ÜÉÉ½È ‰M¡••ÑÌÑ¥µ•½ÕĞˆ¤ì(€€€€€•ÉÉ½È¹¹…µ”€ô€‰‰½ÉÑÉÉ½Èˆì(€€€€€Ñ¡É½Ü•ÉÉ½Èì(€€€ô((€€€¥˜€¡ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” ì‰ÍÑ…ÑÕÌˆè‰…•ÁÑ•‰ôœ°ìÍÑ…ÑÕÌè€ÈÀÀô¤ì(€€€ô((€€€Ñ¡É½Ü¹•ÜÉÉ½È¡Õ¹•áÁ•Ñ•‘•ÍÑ¥¹…Ñ¥½¸è€‘íÕÉ±õ€¤ì(€ôì((€ÑÉäì(€€€½¹ÍĞÉ…İ	½‘ä€ô)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€¥è€‰Í¡••ÑÌµ™…±±‰…¬µ•Ù•¹Ğˆ°(€€€€€ÑåÁ”è€‰İ¡…ÑÍ…ÁÀ¹¥¹‰½Õ¹‘}µ•ÍÍ…”¹É••¥Ù•ˆ°(€€€€€İ¡…ÑÍ…ÁÁ%¹‰½Õ¹‘5•ÍÍ…”èì(€€€€€€€¥è€‰Í¡••ÑÌµ™…±±‰…¬µµ•ÍÍ…”ˆ°(€€€€€€€™É½´è€ˆ¬ÔÔÄÄäÜØÌØÀÈÀäˆ°(€€€€€€€Ñ¼èA!=9°(€€€€€€€ÑåÁ”è€‰Ñ•áĞˆ°(€€€€€€€ÕÍÑ½µ•ÉAÉ½™¥±”èì¹…µ”è€‰5…É¥Í„ˆô°(€€€€€€€É•™•ÉÉ…°èìÍ½ÕÉ•}ÑåÁ”è€‰…ˆô°(€€€€€€€Ñ•áĞèì(€€€€€€€€€‰½‘äè(€€€€€€€€€€€€‰=³„„EÕ•É¼Í…‰•ÈÍ½‰É”±¥™Ñ¥¹œ™…¥…°½´„É„¸µ…¹‘„¸I•˜¸4ÈÙÀÅ\µÀÙ ÀÄˆ°(€€€€€€€ô°(€€€€€ô°(€€€ô¤ì(€€€½¹ÍĞÑ¥µ•ÍÑ…µÀ€ô€ˆÄÜÈÄäÀààÀÀˆì(€€€½¹ÍĞÍ¥¹…ÑÕÉ”€ôÉ•…Ñ•!µ…Œ (€€€€€€‰Í¡„ÈÔØˆ°(€€€€€ÁÉ½•ÍÌ¹•¹Ø¹e1=U}]	!==-}MIP°(€€€€¤(€€€€€€¹ÕÁ‘…Ñ”¡€‘íÑ¥µ•ÍÑ…µÁô¸‘íÉ…İ	½‘åõ€¤(€€€€€€¹‘¥•ÍĞ ‰¡•àˆ¤ì(€€€½¹ÍĞÉ•ÍÁ½¹Í”€ô…İ…¥Ğİ•‰¡½½¬ (€€€€€¹•ÜI•ÅÕ•ÍĞ ‰¡ÑÑÀè¼½±½…±¡½ÍĞ½…Á¤½å±½Õ½İ•‰¡½½¬ˆ°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€€‰e±½ÕµM¥¹…ÑÕÉ”ˆèĞô‘íÑ¥µ•ÍÑ…µÁô±Ìô‘íÍ¥¹…ÑÕÉ•õ€°(€€€€€€€ô°(€€€€€€€‰½‘äèÉ…İ	½‘ä°(€€€€€ô¤°(€€€€¤ì(€€€½¹ÍĞ‰½‘ä€ô…İ…¥ĞÉ•ÍÁ½¹Í”¹©Í½¸ ¤ì((€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡É•ÍÁ½¹Í”¹ÍÑ…ÑÕÌ°€ÔÀÈ¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹É••¥Ù•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹•ÉÉ½È°€‰±•…‘}‘•±¥Ù•Éå}™…¥±•ˆ¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÕÑ½µ…Ñ¥]½É­¥¹¥Í¡•°™…±Í”¤ì((€€€½¹ÍĞÁ…Ñ¥•¹ÑI•ÅÕ•ÍÑÌ€ôÉ•ÅÕ•ÍÑÌ¹™¥±Ñ•È (€€€€€€¡É•ÅÕ•ÍĞ¤€ôø(€€€€€€€É•ÅÕ•ÍĞ¹ÕÉ°€ôôô(€€€€€€€€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡Á…Ñ¥•¹ÑI•ÅÕ•ÍÑÌ¹±•¹Ñ °€À¤ì(€ô™¥¹…±±äì(€€€±½‰…±Q¡¥Ì¹™•Ñ €ô½É¥¥¹…±•Ñ ì(€€€½¹Í½±”¹±½œ€ô½É¥¥¹…±1½œì((€€€™½È€¡½¹ÍĞm­•ä°Ù…±Õ•t½˜=‰©•Ğ¹•¹ÑÉ¥•Ì¡Í…Ù•‘¹Ù¥É½¹µ•¹Ğ¤¤ì(€€€€€¥˜€¡Ù…±Õ”€ôôôÕ¹‘•™¥¹•¤‘•±•Ñ”ÁÉ½•ÍÌ¹•¹Ùm­•åtì(€€€€€•±Í”ÁÉ½•ÍÌ¹•¹Ùm­•åt€ôÙ…±Õ”ì(€€€ô(€ô)ô¤ì()Ñ•ÍĞ ‰„ÁÉ•™¥±±•…Ù…¥±…‰¥±¥ÑäÑ•µÁ±…Ñ”½±±•ÑÌÍ¡•‘Õ±¥¹œÁÉ•™•É•¹”ˆ°…Íå¹Œ€ ¤€ôøì(€½¹ÍĞ•¹Ù¥É½¹µ•¹Ñ-•åÌ€ôl(€€€€‰e1=U}]	!==-}MIPˆ°(€€€€‰e1=U}A%}-dˆ°(€€€€‰==1}M!QM}]	!==-}UI0ˆ°(€€€€‰==1}M!QM}]	!==-}MIPˆ°(€€€€‰=A9%}A%}-dˆ°(€€€€‰]!QMAA}UQ=5Q%=9}5=ˆ°(€€€€‰]!QMAA}1IQ}9U5	Hˆ°(€tì(€½¹ÍĞÍ…Ù•‘¹Ù¥É½¹µ•¹Ğ€ô=‰©•Ğ¹™É½µ¹ÑÉ¥•Ì (€€€•¹Ù¥É½¹µ•¹Ñ-•åÌ¹µ…À ¡­•ä¤€ôøm­•ä°ÁÉ½•ÍÌ¹•¹Ùm­•åut¤°(€€¤ì(€½¹ÍĞ½É¥¥¹…±•Ñ €ô±½‰…±Q¡¥Ì¹™•Ñ ì(€½¹ÍĞ½É¥¥¹…±1½œ€ô½¹Í½±”¹±½œì(€½¹ÍĞÉ•ÅÕ•ÍÑÌ€ômtì(€½¹ÍĞÁ•¹‘¥¹œ€ômtì((€=‰©•Ğ¹…ÍÍ¥¸¡ÁÉ½•ÍÌ¹•¹Ø°ì(€€€e1=U}]	!==-}MIPè€‰İ•‰¡½½¬µÑ•ÍĞµÍ•É•Ğˆ°(€€€e1=U}A%}-dè€‰å±½ÕµÑ•ÍĞµ­•äˆ°(€€€==1}M!QM}]	!==-}UI0è€‰¡ÑÑÁÌè¼½Í¡••ÑÌ¹•á…µÁ±”¹Ñ•ÍĞ½İ•‰¡½½¬ˆ°(€€€==1}M!QM}]	!==-}MIPè€‰Í¡••ÑÌµÑ•ÍĞµÍ•É•Ğˆ°(€€€=A9%}A%}-dè€‰½Á•¹…¤µÑ•ÍĞµ­•äˆ°(€€€]!QMAA}UQ=5Q%=9}5=è€‰…Ñ¥Ù”ˆ°(€ô¤ì(€‘•±•Ñ”ÁÉ½•ÍÌ¹•¹Ø¹]!QMAA}1IQ}9U5	Hì(€½¹Í½±”¹±½œ€ô€ ¤€ôøíôì(€±½‰…±Q¡¥Ì¹™•Ñ €ô…Íå¹Œ€¡ÕÉ°°½ÁÑ¥½¹Ì¤€ôøì(€€€É•ÅÕ•ÍÑÌ¹ÁÕÍ ¡ìÕÉ°°½ÁÑ¥½¹Ìô¤ì((€€€¥˜€¡ÕÉ°€ôôôÁÉ½•ÍÌ¹•¹Ø¹==1}M!QM}]	!==-}UI0¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” (€€€€€€€)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€€€€€½¬èÑÉÕ”°(€€€€€€€€€¥¹Í•ÉÑ•è™…±Í”°(€€€€€€€€€ÕÁ‘…Ñ•èÑÉÕ”°(€€€€€€€€€‘ÕÁ±¥…Ñ”è™…±Í”°(€€€€€€€€€¡Õµ…¹Q…­•½Ù•ÉQ½‘…äè™…±Í”°(€€€€€€€€€½ÁÁ½ÉÑÕ¹¥Ñå%è€‰½ÁÀµ½¹ÍÕ±Ñ…Ñ¥½¸µ¥¹™½Éµ…Ñ¥½¸ˆ°(€€€€€€€€€ÁÉ½™•ÍÍ¥½¹…°è€‰…µ…¹‘„ˆ°(€€€€€€€€€É½ÕÑ•MÑ…ÑÕÌè€‰É•Í½±Ù•ˆ°(€€€€€€€€€É½ÕÑ•èÑÉÕ”°(€€€€€€€ô¤°(€€€€€€€ìÍÑ…ÑÕÌè€ÈÀÀô°(€€€€€€¤ì(€€€ô((€€€¥˜€¡ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹½Á•¹…¤¹½´½ØÄ½É•ÍÁ½¹Í•Ìˆ¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” (€€€€€€€)M=8¹ÍÑÉ¥¹¥™ä (€€€€€€€€€Ù…±¥‘I•ÍÁ½¹Í” (€€€€€€€€€€€Ù…±¥‘•¥Í¥½¸¡ì(€€€€€€€€€€€€€ÁÉ½•‘ÕÉ”è€‰±¥™Ñ¥¹}™…¥…°ˆ°(€€€€€€€€€€€€€ÍÕ•ÍÑ•‘I•Á±äè(€€€€€€€€€€€€€€€€‰=³„°KĞ„ÔÍ½Ô„	ÉÕ¹„°½¹¥•É”‘„³µ¹¥„1%X…É¥„1¥µ„¸€ˆ€¬(€€€€€€€€€€€€€€€€‰Y¤ÅÕ”Í•Ô¥¹Ñ•É•ÍÍ”ƒ¤•´±¥™Ñ¥¹œ™…¥…°¸<ÅÕ”Í•É¥„µ…¥ÌƒéÑ¥°€ˆ€¬(€€€€€€€€€€€€€€€€‰•¹Ñ•¹‘•ÈÁÉ¥µ•¥É¼è¼ÁÉ½•‘¥µ•¹Ñ¼°„É•ÕÁ•É‡Ÿ¼°½ÌÙ…±½É•Ì½Ô„…Ù…±¥‡Ÿ¼üˆ°(€€€€€€€€€€€ô¤°(€€€€€€€€€€¤°(€€€€€€€€¤°(€€€€€€€ìÍÑ…ÑÕÌè€ÈÀÀô°(€€€€€€¤ì(€€€ô((€€€¥˜€¡ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” ì‰ÍÑ…ÑÕÌˆè‰…•ÁÑ•‰ôœ°ìÍÑ…ÑÕÌè€ÈÀÀô¤ì(€€€ô((€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰Õ¹•áÁ•Ñ•‘•ÍÑ¥¹…Ñ¥½¸ˆ¤ì(€ôì((€ÑÉäì(€€€½¹ÍĞÉ…İ	½‘ä€ô)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€¥è€‰½¹ÍÕ±Ñ…Ñ¥½¸µ¥¹™½Éµ…Ñ¥½¸µ•Ù•¹Ğˆ°(€€€€€ÑåÁ”è€‰İ¡…ÑÍ…ÁÀ¹¥¹‰½Õ¹‘}µ•ÍÍ…”¹É••¥Ù•ˆ°(€€€€€İ¡…ÑÍ…ÁÁ%¹‰½Õ¹‘5•ÍÍ…”èì(€€€€€€€¥è€‰½¹ÍÕ±Ñ…Ñ¥½¸µ¥¹™½Éµ…Ñ¥½¸µµ•ÍÍ…”ˆ°(€€€€€€€™É½´è€ˆ¬ÔÔÄÄäÀÀÀÀÀÀÀÀˆ°(€€€€€€€Ñ¼èA!=9°(€€€€€€€ÑåÁ”è€‰Ñ•áĞˆ°(€€€€€€€ÕÍÑ½µ•ÉAÉ½™¥±”èì¹…µ”è€‰…‰Ëµ¥„M¥±Ù„ˆô°(€€€€€€€Ñ•áĞèì(€€€€€€€€€‰½‘äè(€€€€€€€€€€€€‰=³„°½ÍÑ…É¥„‘”½¹ÍÕ±Ñ…È½Ì¡½Ë…É¥½ÌÁ…É„Õµ„…Ù…±¥‡Ÿ¼™…¥…°½´„É„¸µ…¹‘„¹q¹q¹I•™•Ë©¹¥„èÙ…±¥‡Ÿ¼™…¥…°ˆ°(€€€€€€€ô°(€€€€€ô°(€€€ô¤ì(€€€½¹ÍĞÑ¥µ•ÍÑ…µÀ€ô€ˆÄÜÈÄäÀààÀÀˆì(€€€½¹ÍĞÍ¥¹…ÑÕÉ”€ôÉ•…Ñ•!µ…Œ (€€€€€€‰Í¡„ÈÔØˆ°(€€€€€ÁÉ½•ÍÌ¹•¹Ø¹e1=U}]	!==-}MIP°(€€€€¤(€€€€€€¹ÕÁ‘…Ñ”¡€‘íÑ¥µ•ÍÑ…µÁô¸‘íÉ…İ	½‘åõ€¤(€€€€€€¹‘¥•ÍĞ ‰¡•àˆ¤ì(€€€½¹ÍĞÉ•ÍÁ½¹Í”€ô…İ…¥Ğİ•‰¡½½¬ (€€€€€¹•ÜI•ÅÕ•ÍĞ ‰¡ÑÑÀè¼½±½…±¡½ÍĞ½…Á¤½å±½Õ½İ•‰¡½½¬ˆ°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€€‰e±½ÕµM¥¹…ÑÕÉ”ˆèĞô‘íÑ¥µ•ÍÑ…µÁô±Ìô‘íÍ¥¹…ÑÕÉ•õ€°(€€€€€€€ô°(€€€€€€€‰½‘äèÉ…İ	½‘ä°(€€€€€ô¤°(€€€€€ìİ…¥ÑU¹Ñ¥°è€¡ÁÉ½µ¥Í”¤€ôøÁ•¹‘¥¹œ¹ÁÕÍ ¡ÁÉ½µ¥Í”¤ô°(€€€€¤ì(€€€½¹ÍĞ‰½‘ä€ô…İ…¥ĞÉ•ÍÁ½¹Í”¹©Í½¸ ¤ì(€€€…İ…¥ĞAÉ½µ¥Í”¹…±°¡Á•¹‘¥¹œ¤ì((€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…¥Ñ¥Ù•EÕ•Õ•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÁÁ½¥¹Ñµ•¹Ñ9••‘ÍAÉ•™•É•¹”°ÑÉÕ”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÁÁ½¥¹Ñµ•¹ÑAÉ•™•É•¹•I•Á±åM•¹Ğ°ÑÉÕ”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÁÁ½¥¹Ñµ•¹ÑI•Ù¥•İEÕ•Õ•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…° (€€€€€É•ÅÕ•ÍÑÌ¹Í½µ” (€€€€€€€€¡É•ÅÕ•ÍĞ¤€ôø(€€€€€€€€€É•ÅÕ•ÍĞ¹ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹½Á•¹…¤¹½´½ØÄ½É•ÍÁ½¹Í•Ìˆ°(€€€€€€¤°(€€€€€™…±Í”°(€€€€¤ì((€€€½¹ÍĞÁ…Ñ¥•¹ÑI•ÅÕ•ÍÑÌ€ôÉ•ÅÕ•ÍÑÌ¹™¥±Ñ•È (€€€€€€¡É•ÅÕ•ÍĞ¤€ôø(€€€€€€€É•ÅÕ•ÍĞ¹ÕÉ°€ôôô(€€€€€€€€€€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ€˜˜(€€€€€€€)M=8¹Á…ÉÍ”¡É•ÅÕ•ÍĞ¹½ÁÑ¥½¹Ì¹‰½‘ä¤¹ÑåÁ”€ôôô€‰Ñ•áĞˆ°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡Á…Ñ¥•¹ÑI•ÅÕ•ÍÑÌ¹±•¹Ñ °€Ä¤ì(€€€½¹ÍĞÁ…Ñ¥•¹ÑI•Á±ä€ô)M=8¹Á…ÉÍ” (€€€€€Á…Ñ¥•¹ÑI•ÅÕ•ÍÑÍlÁt¹½ÁÑ¥½¹Ì¹‰½‘ä°(€€€€¤¹Ñ•áĞ¹‰½‘äì(€€€…ÍÍ•ÉĞ¹•ÅÕ…° (€€€€€Á…Ñ¥•¹ÑI•Á±ä°(€€€€€€‰=³„°…‰Ëµ¥„„ÔÍ½Ô„	ÉÕ¹„°½¹¥•É”‘„³µ¹¥„1%X…É¥„1¥µ„¸€ˆ€¬(€€€€€€€€‰±…É¼°Á½ÍÍ¼Ñ”…©Õ‘…È½´¼…•¹‘…µ•¹Ñ¼¸EÕ…¥Ì‘¥…Ì‘„Í•µ…¹„”ÅÕ…°€ˆ€¬(€€€€€€€€‰Á•Ëµ½‘¼ƒŠPµ…¹£Œ½ÔÑ…É‘”ƒŠP½ÍÑÕµ…´™Õ¹¥½¹…Èµ•±¡½ÈÁ…É„Ù½¨üˆ°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹‘½•Í9½Ñ5…Ñ ¡Á…Ñ¥•¹ÑI•Á±ä°€½Ip€ÔÀÀ¼¤ì(€€€…ÍÍ•ÉĞ¹‘½•Í9½Ñ5…Ñ ¡Á…Ñ¥•¹ÑI•Á±ä°€½½‰É¥…‘„Á•±„½¹™¥…»„½¤¤ì(€€€…ÍÍ•ÉĞ¹‘½•Í9½Ñ5…Ñ ¡Á…Ñ¥•¹ÑI•Á±ä°€½Á½ÍÍ¥‰¥±¥‘…‘•Ì°±¥µ¥Ñ•Ì½¤¤ì(€€€…ÍÍ•ÉĞ¹‘½•Í9½Ñ5…Ñ ¡Á…Ñ¥•¹ÑI•Á±ä°€½¡ÑÑÁÌép½p½‘É……µ…¹‘…Í¡É½•‘•È¼¤ì(€ô™¥¹…±±äì(€€€±½‰…±Q¡¥Ì¹™•Ñ €ô½É¥¥¹…±•Ñ ì(€€€½¹Í½±”¹±½œ€ô½É¥¥¹…±1½œì((€€€™½È€¡½¹ÍĞm­•ä°Ù…±Õ•t½˜=‰©•Ğ¹•¹ÑÉ¥•Ì¡Í…Ù•‘¹Ù¥É½¹µ•¹Ğ¤¤ì(€€€€€¥˜€¡Ù…±Õ”€ôôôÕ¹‘•™¥¹•¤‘•±•Ñ”ÁÉ½•ÍÌ¹•¹Ùm­•åtì(€€€€€•±Í”ÁÉ½•ÍÌ¹•¹Ùm­•åt€ôÙ…±Õ”ì(€€€ô(€ô)ô¤ì()Ñ•ÍĞ ‰Ñ¡”™¥ÉÍĞÍÕÉ¥…°ÁÉ¥”ÅÕ•ÍÑ¥½¸ÕÍ•ÌÑ¡”…ÁÁÉ½Ù•¥¹ÍÑ¥ÑÕÑ¥½¹…°É•Á±äˆ°…Íå¹Œ€ ¤€ôøì(€½¹ÍĞ•¹Ù¥É½¹µ•¹Ñ-•åÌ€ôl(€€€€‰e1=U}]	!==-}MIPˆ°(€€€€‰e1=U}A%}-dˆ°(€€€€‰==1}M!QM}]	!==-}UI0ˆ°(€€€€‰==1}M!QM}]	!==-}MIPˆ°(€€€€‰=A9%}A%}-dˆ°(€€€€‰]!QMAA}UQ=5Q%=9}5=ˆ°(€€€€‰]!QMAA}1IQ}9U5	Hˆ°(€€€€‰e1=U}1IQ}Q5A1Q}95ˆ°(€€€€‰e1=U}1IQ}Q5A1Q}19Uˆ°(€tì(€½¹ÍĞÍ…Ù•‘¹Ù¥É½¹µ•¹Ğ€ô=‰©•Ğ¹™É½µ¹ÑÉ¥•Ì (€€€•¹Ù¥É½¹µ•¹Ñ-•åÌ¹µ…À ¡­•ä¤€ôøm­•ä°ÁÉ½•ÍÌ¹•¹Ùm­•åut¤°(€€¤ì(€½¹ÍĞ½É¥¥¹…±•Ñ €ô±½‰…±Q¡¥Ì¹™•Ñ ì(€½¹ÍĞ½É¥¥¹…±1½œ€ô½¹Í½±”¹±½œì(€½¹ÍĞÉ•ÅÕ•ÍÑÌ€ômtì(€½¹ÍĞÁ•¹‘¥¹œ€ômtì((€=‰©•Ğ¹…ÍÍ¥¸¡ÁÉ½•ÍÌ¹•¹Ø°ì(€€€e1=U}]	!==-}MIPè€‰İ•‰¡½½¬µÑ•ÍĞµÍ•É•Ğˆ°(€€€e1=U}A%}-dè€‰å±½ÕµÑ•ÍĞµ­•äˆ°(€€€==1}M!QM}]	!==-}UI0è€‰¡ÑÑÁÌè¼½Í¡••ÑÌ¹•á…µÁ±”¹Ñ•ÍĞ½İ•‰¡½½¬ˆ°(€€€==1}M!QM}]	!==-}MIPè€‰Í¡••ÑÌµÑ•ÍĞµÍ•É•Ğˆ°(€€€=A9%}A%}-dè€‰½Á•¹…¤µÑ•ÍĞµ­•äˆ°(€€€]!QMAA}UQ=5Q%=9}5=è€‰…Ñ¥Ù”ˆ°(€€€]!QMAA}1IQ}9U5	Hè€ˆ¬ÔÔÄÄäØÜÜĞÌÌÜĞˆ°(€€€e1=U}1IQ}Q5A1Q}95è€‰…±•ÉÑ…}É•Ù¥Í…½}±¥Ù}ØÄˆ°(€€€e1=U}1IQ}Q5A1Q}19Uè€‰ÁÑ}	Hˆ°(€ô¤ì(€½¹Í½±”¹±½œ€ô€ ¤€ôøíôì(€±½‰…±Q¡¥Ì¹™•Ñ €ô…Íå¹Œ€¡ÕÉ°°½ÁÑ¥½¹Ì¤€ôøì(€€€É•ÅÕ•ÍÑÌ¹ÁÕÍ ¡ìÕÉ°°½ÁÑ¥½¹Ìô¤ì((€€€¥˜€¡ÕÉ°€ôôôÁÉ½•ÍÌ¹•¹Ø¹==1}M!QM}]	!==-}UI0¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” (€€€€€€€)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€€€€€½¬èÑÉÕ”°(€€€€€€€€€¥¹Í•ÉÑ•è™…±Í”°(€€€€€€€€€ÕÁ‘…Ñ•èÑÉÕ”°(€€€€€€€€€‘ÕÁ±¥…Ñ”è™…±Í”°(€€€€€€€€€¡Õµ…¹Q…­•½Ù•ÉQ½‘…äè™…±Í”°(€€€€€€€€€½ÁÁ½ÉÑÕ¹¥Ñå%è€‰½ÁÀµ…Ñ¥Ù”µÁÉ¥”ˆ°(€€€€€€€€€ÁÉ½™•ÍÍ¥½¹…°è€‰…µ…¹‘„ˆ°(€€€€€€€€€É½ÕÑ•MÑ…ÑÕÌè€‰É•Í½±Ù•ˆ°(€€€€€€€€€É½ÕÑ•èÑÉÕ”°(€€€€€€€ô¤°(€€€€€€€ìÍÑ…ÑÕÌè€ÈÀÀô°(€€€€€€¤ì(€€€ô((€€€¥˜€¡ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹½Á•¹…¤¹½´½ØÄ½É•ÍÁ½¹Í•Ìˆ¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” (€€€€€€€)M=8¹ÍÑÉ¥¹¥™ä (€€€€€€€€€Ù…±¥‘I•ÍÁ½¹Í” (€€€€€€€€€€€Ù…±¥‘•¥Í¥½¸¡ì(€€€€€€€€€€€€€É½ÕÑ”è€‰¡Õµ…¹}É•Ù¥•Üˆ°(€€€€€€€€€€€€€…ÕÑ½µ…Ñ¥±±½İ•è™…±Í”°(€€€€€€€€€€€€€ÍÕ•ÍÑ•‘I•Á±äè€ˆˆ°(€€€€€€€€€€€€€É•Ù¥•İI•…Í½¸è€‰ÁÉ¥•}É…¹•}É•ÅÕ•ÍÑ•ˆ°(€€€€€€€€€€€ô¤°(€€€€€€€€€€¤°(€€€€€€€€¤°(€€€€€€€ìÍÑ…ÑÕÌè€ÈÀÀô°(€€€€€€¤ì(€€€ô((€€€¥˜€¡ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” ì‰ÍÑ…ÑÕÌˆè‰…•ÁÑ•‰ôœ°ìÍÑ…ÑÕÌè€ÈÀÀô¤ì(€€€ô((€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰Õ¹•áÁ•Ñ•‘•ÍÑ¥¹…Ñ¥½¸ˆ¤ì(€ôì((€ÑÉäì(€€€½¹ÍĞÉ…İ	½‘ä€ô)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€¥è€‰…Ñ¥Ù”µÁÉ¥”µ•Ù•¹Ğˆ°(€€€€€ÑåÁ”è€‰İ¡…ÑÍ…ÁÀ¹¥¹‰½Õ¹‘}µ•ÍÍ…”¹É••¥Ù•ˆ°(€€€€€É•…Ñ•Q¥µ”è€ˆÈÀÈØ´ÀÜ´ÈåPÄÄèÄÀèÀÀ¸ÀÀÁhˆ°(€€€€€İ¡…ÑÍ…ÁÁ%¹‰½Õ¹‘5•ÍÍ…”èì(€€€€€€€¥è€‰…Ñ¥Ù”µÁÉ¥”µµ•ÍÍ…”ˆ°(€€€€€€€™É½´è€ˆ¬ÔÔÄÄäÀÀÀÀÀÀÀÀˆ°(€€€€€€€Ñ¼èA!=9°(€€€€€€€Í•¹‘Q¥µ”è€ˆÈÀÈØ´ÀÜ´ÈåPÄÄèÄÀèÀÀ¸ÀÀÁhˆ°(€€€€€€€ÑåÁ”è€‰Ñ•áĞˆ°(€€€€€€€ÕÍÑ½µ•ÉAÉ½™¥±”èì¹…µ”è€‰5…É¥„ˆô°(€€€€€€€Ñ•áĞèì(€€€€€€€€€‰½‘äè(€€€€€€€€€€€€‰EÕ…°¼Ù…±½È‘„‰±•™…É½Á±…ÍÑ¥„üA½‘”µ”Á…ÍÍ…ÈÕµ„·¥‘¥„üˆ°(€€€€€€€ô°(€€€€€ô°(€€€ô¤ì(€€€½¹ÍĞÑ¥µ•ÍÑ…µÀ€ô€ˆÄÜÈÄäÀààÀÀˆì(€€€½¹ÍĞÍ¥¹…ÑÕÉ”€ôÉ•…Ñ•!µ…Œ (€€€€€€‰Í¡„ÈÔØˆ°(€€€€€ÁÉ½•ÍÌ¹•¹Ø¹e1=U}]	!==-}MIP°(€€€€¤(€€€€€€¹ÕÁ‘…Ñ”¡€‘íÑ¥µ•ÍÑ…µÁô¸‘íÉ…İ	½‘åõ€¤(€€€€€€¹‘¥•ÍĞ ‰¡•àˆ¤ì(€€€½¹ÍĞÉ•ÍÁ½¹Í”€ô…İ…¥Ğİ•‰¡½½¬ (€€€€€¹•ÜI•ÅÕ•ÍĞ ‰¡ÑÑÀè¼½±½…±¡½ÍĞ½…Á¤½å±½Õ½İ•‰¡½½¬ˆ°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€€‰e±½ÕµM¥¹…ÑÕÉ”ˆèĞô‘íÑ¥µ•ÍÑ…µÁô±Ìô‘íÍ¥¹…ÑÕÉ•õ€°(€€€€€€€ô°(€€€€€€€‰½‘äèÉ…İ	½‘ä°(€€€€€ô¤°(€€€€€ìİ…¥ÑU¹Ñ¥°è€¡ÁÉ½µ¥Í”¤€ôøÁ•¹‘¥¹œ¹ÁÕÍ ¡ÁÉ½µ¥Í”¤ô°(€€€€¤ì(€€€½¹ÍĞ‰½‘ä€ô…İ…¥ĞÉ•ÍÁ½¹Í”¹©Í½¸ ¤ì(€€€…İ…¥ĞAÉ½µ¥Í”¹…±°¡Á•¹‘¥¹œ¤ì((€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…¥Ñ¥Ù•EÕ•Õ•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹É•Ù¥•İ±•ÉÑEÕ•Õ•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹ÁÉ¥•!½±‘¥¹EÕ•Õ•°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹ÁÉ¥•!½±‘¥¹M•¹Ğ°™…±Í”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÁÁÉ½Ù•‘AÉ¥•I•Á±å-¥¹°€‰¥¹¥Ñ¥…±}¥¹™½Éµ…Ñ¥½¸ˆ¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÁÁÉ½Ù•‘AÉ¥•I•Á±åEÕ•Õ•°ÑÉÕ”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡‰½‘ä¹…ÁÁÉ½Ù•‘AÉ¥•I•Á±åM•¹Ğ°ÑÉÕ”¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…° (€€€€€É•ÅÕ•ÍÑÌ¹Í½µ” (€€€€€€€€¡É•ÅÕ•ÍĞ¤€ôø(€€€€€€€€€É•ÅÕ•ÍĞ¹ÕÉ°€ôôô€‰¡ÑÑÁÌè¼½…Á¤¹½Á•¹…¤¹½´½ØÄ½É•ÍÁ½¹Í•Ìˆ°(€€€€€€¤°(€€€€€™…±Í”°(€€€€¤ì((€€€½¹ÍĞå±½Õ‘I•ÅÕ•ÍÑÌ€ôÉ•ÅÕ•ÍÑÌ¹™¥±Ñ•È (€€€€€€¡É•ÅÕ•ÍĞ¤€ôø(€€€€€€€É•ÅÕ•ÍĞ¹ÕÉ°€ôôô(€€€€€€€€‰¡ÑÑÁÌè¼½…Á¤¹å±½Õ¹½´½ØÈ½İ¡…ÑÍ…ÁÀ½µ•ÍÍ…•Ìˆ°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡å±½Õ‘I•ÅÕ•ÍÑÌ¹±•¹Ñ °€Ä¤ì(€€€½¹ÍĞå±½Õ‘	½‘¥•Ì€ôå±½Õ‘I•ÅÕ•ÍÑÌ¹µ…À (€€€€€€¡É•ÅÕ•ÍĞ¤€ôø)M=8¹Á…ÉÍ”¡É•ÅÕ•ÍĞ¹½ÁÑ¥½¹Ì¹‰½‘ä¤°(€€€€¤ì(€€€½¹ÍĞÁ…Ñ¥•¹Ñ	½‘ä€ôå±½Õ‘	½‘¥•Ì¹™¥¹ (€€€€€€¡É•ÅÕ•ÍĞ¤€ôøÉ•ÅÕ•ÍĞ¹ÑåÁ”€ôôô€‰Ñ•áĞˆ°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹•ÅÕ…°¡Á…Ñ¥•¹Ñ	½‘ä¹Ñ¼°€ˆ¬ÔÔÄÄäÀÀÀÀÀÀÀÀˆ¤ì(€€€…ÍÍ•ÉĞ¹µ…Ñ ¡Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°€½‘•™¥¹¥‘½Ì¥¹‘¥Ù¥‘Õ…±µ•¹Ñ”½¤¤ì(€€€…ÍÍ•ÉĞ¹µ…Ñ ¡Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°€½Ó¥¹¥„°„½µÁ±•á¥‘…‘”½¤¤ì(€€€…ÍÍ•ÉĞ¹µ…Ñ ¡Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°€½¡½ÍÁ¥Ñ…°°„…¹•ÍÑ•Í¥„½¤¤ì(€€€…ÍÍ•ÉĞ¹µ…Ñ ¡Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°€½»¼…ÁÉ•Í•¹Ñ…µ½ÌÕ´¡½¹½Ë…É¥¼¥Í½±…‘¼½¤¤ì(€€€…ÍÍ•ÉĞ¹µ…Ñ  (€€€€€Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°(€€€€€€½ÅÕ…¹Ñ¼µÕÍÑ„µ¥ÉÕÉ¥„µÁ±…ÍÑ¥„µ™…¥…°µÍ…¼µÁ…Õ±¼¼°(€€€€¤ì(€€€…ÍÍ•ÉĞ¹‘½•Í9½Ñ5…Ñ ¡Á…Ñ¥•¹Ñ	½‘ä¹Ñ•áĞ¹‰½‘ä°€½Ip¼¤ì(€ô™¥¹…±±äì(€€€±½‰…±Q¡¥Ì¹™•Ñ €ô½É¥¥¹…±•Ñ ì(€€€½¹Í½±”¹±½œ€ô½É¥¥¹…±1½œì((€€€™½È€¡½¹ÍĞm­•ä°Ù…±Õ•t½˜=‰©•Ğ¹•¹ÑÉ¥•Ì¡Í…Ù•‘¹Ù¥É½¹µ•¹Ğ¤¤ì(€€€€€¥˜€¡Ù…±Õ”€ôôôÕ¹‘•™¥¹•¤‘•±•Ñ”ÁÉ½•ÍÌ¹•¹Ùm­•åtì(€€€€€•±Í”ÁÉ½•ÍÌ¹•¹Ùm­•åt€ôÙ…±Õ”ì(€€€ô(€ô)ô¤ì(