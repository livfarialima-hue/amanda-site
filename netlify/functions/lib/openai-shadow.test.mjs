import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  applyContextClarificationGuard,
  applyContextContinuationGuard,
  applyContextReopenGuard,
  applyFirstReplyGreetingGuard,
  applyReturningPatientReplyGuard,
  createSafetyIdentifier,
  parseOpenAIShadowResponse,
  runOpenAIShadow,
} from "./openai-shadow.mjs";
import webhook, {
  attributionFallbackReason,
  classifyAttribution,
  isAutomatedAppointmentMutationEnabled,
  normalizeResolvedJourneyAttribution,
  resolveInboundAttributionJourney,
  semanticDecisionConfirmsDeterministicReply,
  stripAttributionTransportToken,
} from "../ycloud-webhook.mjs";

const PHONE = "+5511961957144";

test("only active mode may mutate an appointment from an inbound reply", () => {
  assert.equal(isAutomatedAppointmentMutationEnabled("active"), true);
  assert.equal(isAutomatedAppointmentMutationEnabled("shadow"), false);
  assert.equal(isAutomatedAppointmentMutationEnabled("off"), false);
  assert.equal(isAutomatedAppointmentMutationEnabled("unexpected"), false);
});

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
    conversationState: {
      activeTopic: "blefaroplastia",
      patientAct: "question",
      refersToEventId: "",
      lastClinicQuestion: "",
      lastClinicOffer: "",
      unresolvedQuestions: [],
      factsAlreadyProvided: [],
      owner: "bruna",
      nextExpectedAction: "responder a paciente",
      ambiguity: "",
      contextConfidence: "high",
    },
    ...overrides,
  };
}

test("context clarification is normalized as a safe high-confidence question", () => {
  const guarded = applyContextClarificationGuard(
    validDecision({
      confidence: "low",
      automaticAllowed: false,
      replyCode: "CONTEXT-CLARIFY-01",
      suggestedReply:
        "Quando você diz que já fez, foi a lipo de papada ou a cervicoplastia?",
      reviewReason: "context_clarification:procedimento_anterior",
    }),
  );

  assert.equal(guarded.route, "standard_reply");
  assert.equal(guarded.confidence, "high");
  assert.equal(guarded.automaticAllowed, true);
  assert.equal(guarded.replyCode, "CONTEXT-CLARIFY-01");
});

test("invalid context clarification fails closed", () => {
  const guarded = applyContextClarificationGuard(
    validDecision({
      confidence: "low",
      automaticAllowed: false,
      replyCode: "CONTEXT-CLARIFY-01",
      suggestedReply: "Não entendi.",
      reviewReason: "context_clarification:sentido",
    }),
  );

  assert.equal(guarded.route, "human_review");
  assert.equal(guarded.automaticAllowed, false);
  assert.equal(guarded.suggestedReply, "");
});

test("context clarification never clears a clinical urgency", () => {
  const decision = validDecision({
    urgent: true,
    replyCode: "CONTEXT-CLARIFY-01",
    suggestedReply: "Você está com falta de ar agora?",
    reviewReason: "context_clarification:sintoma_atual",
  });

  assert.deepEqual(applyContextClarificationGuard(decision), decision);
});

test("context reopen is normalized only for a concrete automatic reply", () => {
  const guarded = applyContextReopenGuard(
    validDecision({
      confidence: "medium",
      automaticAllowed: false,
      replyCode: "CONTEXT-REOPEN-01",
      suggestedReply:
        "Sim, realizamos cervicoplastia em ambiente hospitalar, com anestesista e equipe cirúrgica.",
      reviewReason: "context_reopen:cervicoplastia",
    }),
  );

  assert.equal(guarded.route, "standard_reply");
  assert.equal(guarded.confidence, "high");
  assert.equal(guarded.automaticAllowed, true);
  assert.equal(guarded.replyCode, "CONTEXT-REOPEN-01");
});

test("invalid context reopen fails closed", () => {
  const guarded = applyContextReopenGuard(
    validDecision({
      route: "ignore",
      replyCode: "CONTEXT-REOPEN-01",
      suggestedReply: "",
      reviewReason: "context_reopen:missing_reply",
    }),
  );

  assert.equal(guarded.route, "human_review");
  assert.equal(guarded.automaticAllowed, false);
  assert.equal(guarded.suggestedReply, "");
});

test("context reopen never clears a clinical urgency", () => {
  const decision = validDecision({
    urgent: true,
    replyCode: "CONTEXT-REOPEN-01",
    reviewReason: "context_reopen:urgent_symptom",
  });

  assert.deepEqual(applyContextReopenGuard(decision), decision);
});

test("context continuation fulfills an accepted information offer without a new question", () => {
  const guarded = applyContextContinuationGuard(
    validDecision({
      confidence: "medium",
      automaticAllowed: false,
      replyCode: "CONTEXT-CONTINUE-01",
      suggestedReply:
        "Na consulta, a Dra. Amanda entende seus objetivos, avalia o rosto e o pescoço e explica possibilidades, limites e recuperação.",
      reviewReason: "context_continue:consulta",
    }),
    { enabled: true },
  );

  assert.equal(guarded.route, "standard_reply");
  assert.equal(guarded.confidence, "high");
  assert.equal(guarded.automaticAllowed, true);
  assert.equal(guarded.replyCode, "CONTEXT-CONTINUE-01");
});

test("context continuation fails closed outside the bounded candidate or with a follow-up question", () => {
  const decision = validDecision({
    replyCode: "CONTEXT-CONTINUE-01",
    suggestedReply:
      "Na consulta, a Dra. Amanda entende seus objetivos. Quer ver horários?",
    reviewReason: "context_continue:consulta",
  });

  assert.equal(
    applyContextContinuationGuard(decision).route,
    "human_review",
  );
  assert.equal(
    applyContextContinuationGuard(decision, { enabled: true })
      .suggestedReply,
    "",
  );
});

test("context continuation never clears a clinical urgency", () => {
  const decision = validDecision({
    urgent: true,
    replyCode: "CONTEXT-CONTINUE-01",
    reviewReason: "context_continue:postop",
  });

  assert.deepEqual(
    applyContextContinuationGuard(decision, { enabled: true }),
    decision,
  );
});

test("returning-patient guard removes a repeated Bruna introduction", () => {
  const guarded = applyReturningPatientReplyGuard(
    validDecision({
      suggestedReply:
        "Olá, Ana! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Como posso ajudar?",
    }),
    {
      knownPatient: true,
      state: "former_patient",
    },
  );

  assert.match(
    guarded.suggestedReply,
    /Que bom falar com você novamente/i,
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
        "Eu sou a Bruna, concierge da Clínica LIV Faria Lima. O lifting facial reposiciona tecidos da face e do pescoço.",
    }),
    {
      patientProfileName: "Rosana Macedo",
      recentConversation: [],
      patientRelationship: { knownPatient: false, state: "new_lead" },
    },
  );

  assert.equal(
    guarded.suggestedReply,
    "Olá, Rosana! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. O lifting facial reposiciona tecidos da face e do pescoço.",
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
    "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Posso te orientar sobre o lifting facial.",
  );
});

test("known patient receives a greeting without a new-lead introduction", () => {
  const guarded = applyFirstReplyGreetingGuard(
    validDecision({
      suggestedReply: "Claro, vou te ajudar com isso.",
    }),
    {
      patientProfileName: "Mônica Mussolino",
      recentConversation: [],
      patientRelationship: { knownPatient: true, state: "former_patient" },
    },
  );

  assert.equal(
    guarded.suggestedReply,
    "Olá, Mônica! Claro, vou te ajudar com isso.",
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
      { role: "assistant", source: "bruna", text: "Olá, Rosana!" },
    ],
    patientRelationship: { knownPatient: false, state: "engaged_lead" },
  });

  assert.deepEqual(guarded, decision);
});

test("known prior interaction prevents a repeated introduction when conversation memory is unavailable", () => {
  const decision = validDecision({
    suggestedReply:
      "Entendo. Posso te fazer uma pergunta para compreender melhor?",
  });
  const guarded = applyFirstReplyGreetingGuard(decision, {
    patientProfileName: "Isabel",
    recentConversation: [],
    patientRelationship: { knownPatient: false, state: "engaged_lead" },
    priorInteractionKnown: true,
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

test("a deterministic copy remains only a guide until the semantic decision confirms its code", () => {
  const deterministic = {
    status: "completed",
    decision: validDecision({
      replyCode: "SURGICAL-PRICE-INITIAL-01",
      suggestedReply: "Texto institucional aprovado.",
    }),
  };
  const confirmed = {
    status: "completed",
    decision: validDecision({
      replyCode: "SURGICAL-PRICE-INITIAL-01",
      suggestedReply: "A pergunta é sobre valor cirúrgico.",
    }),
  };
  const disagreed = {
    status: "completed",
    decision: validDecision({
      replyCode: "CONTEXT-CLARIFY-01",
      suggestedReply: "Você quer saber o valor da consulta ou da cirurgia?",
    }),
  };

  assert.equal(
    semanticDecisionConfirmsDeterministicReply(confirmed, deterministic),
    true,
  );
  assert.equal(
    semanticDecisionConfirmsDeterministicReply(disagreed, deterministic),
    false,
  );
  assert.equal(
    semanticDecisionConfirmsDeterministicReply(
      {
        status: "completed",
        decision: validDecision({
          professional: "daniel",
          replyCode: "SURGICAL-PRICE-INITIAL-01",
        }),
      },
      deterministic,
    ),
    false,
  );
  assert.equal(
    semanticDecisionConfirmsDeterministicReply(
      {
        status: "completed",
        decision: validDecision({
          procedure: "lifting_facial",
          replyCode: "SURGICAL-PRICE-INITIAL-01",
        }),
      },
      deterministic,
    ),
    false,
  );
});

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
    "Olá, vim pela página da Dra. Amanda.\n\nReferência: Blefaroplastia",
  );

  assert.equal(attribution.platform, "Orgânico/Conteúdo");
  assert.equal(attribution.referenceCategory, "site_page");
  assert.equal(attribution.reference, "Blefaroplastia");
});

test("recognizes the stable organic SITE reference created by every page", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "Olá, vim pelo site.\n\nRef. SITE-lifting-facial",
  );

  assert.equal(attribution.platform, "Orgânico/Conteúdo");
  assert.equal(attribution.referenceCategory, "site_page");
  assert.equal(attribution.reference, "SITE-lifting-facial");
});

test("recognizes Google Ads without exposing a click ID before consent", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "Olá, gostaria de uma avaliação.\n\nRef. G26ADS-lifting-facial",
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
    "Olá, gostaria de saber mais.\n\nRef. M26O01W-DbHKuWfGP_N-OT02",
  );

  assert.equal(attribution.platform, "Meta");
  assert.equal(attribution.referenceCategory, "meta_coded");
  assert.equal(attribution.reference, "M26O01W-DbHKuWfGP_N-OT02");
});

test("recognizes the exact M26F02S site journey used by the active campaign", () => {
  const attribution = classifyAttribution(
    {},
    {},
    "OlÃ¡, gostaria de saber mais.\n\nRef. M26F02S-avaliacao-facial",
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
    "Olá! Quero saber sobre lifting cervical. Ref. M26C01W-C07H01",
  );
  const site = classifyAttribution(
    {},
    {},
    "Olá! Vim pelo site. Ref. M26C02S-C07H01-lifting-cervical",
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
    "Mensagem sem referência",
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
      origin: "Google orgânico",
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
  assert.equal(normalized.initialOrigin, "Google orgânico");
  assert.equal(normalized.campaignCode, "");
  assert.equal(normalized.initialCampaignCode, "");
  assert.equal(normalized.initialMetaCampaignId, "");
  assert.equal(normalized.currentOrigin, "Meta Ads");
  assert.equal(normalized.currentCampaignCode, "M26F02S");
  assert.equal(normalized.currentCreativeCode, "C01H01");
  assert.equal(normalized.currentMetaAdsetId, "120000000000000001");
  assert.equal(normalized.currentMetaAdId, "120000000000000002");
  assert.equal(normalized.platform, "Orgânico/Conteúdo");
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
        text: { body: `Olá, quero uma avaliação.\nJID: ${token}` },
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
      undefined,
      {
        resolveAttributionImpl: async (receivedToken, options) => {
          assert.equal(receivedToken, token);
          assert.match(options.claimantId, /^C1_[A-Za-z0-9_-]{43}$/);
          assert.equal(options.claimantId.includes(eventId), false);
          return journey;
        },
      },
    );
    assert.equal(response.status, 200);
    const responseBody = await response.json();
    assert.equal(responseBody.emergencyStop, true);
    assert.equal(responseBody.automationMode, "off");
    assert.equal(responseBody.patientMessageSuppressed, true);
    assert.equal(responseBody.appointmentMutationSuppressed, true);
    assert.equal(responseBody.aiShadowQueued, false);
    assert.equal(responseBody.aiActiveQueued, false);
    const append = sheetsRequests.find((request) => request.action === "append_lead");
    assert.ok(append);
    assert.equal(append.lead.text, "Olá, quero uma avaliação.");
    assert.equal(append.lead.reference, "M26F02S-C01H01-avaliacao-facial");
    assert.equal(append.lead.attribution.initialOrigin, "Meta Ads");
    assert.equal(append.lead.attribution.initialCampaignCode, "M26F02S");
    assert.equal(append.lead.attribution.currentCampaignCode, "M26F02S");
    assert.equal(append.lead.attribution.journeyStatus, "resolved");
    assert.equal(JSON.stringify(append.lead).includes(token), false);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("a missing journey fails open to the legacy attribution parser", async () => {
  const resolution = await resolveInboundAttributionJourney(
    `Mensagem\nJID: J1_${"B".repeat(22)}`,
    {
      claimantId: `C1_${"b".repeat(43)}`,
      resolveImpl: async () => null,
    },
  );
  assert.equal(resolution.status, "not_found");
  assert.equal(resolution.journey, null);
  const attribution = classifyAttribution(
    {},
    {},
    "Olá. Ref. M26F02S-C01H01",
    resolution.journey,
  );
  assert.equal(attribution.platform, "Meta");
  assert.equal(attribution.referenceCategory, "meta_coded");
});

test("a transport token without an opaque claimant fails closed", async () => {
  let called = false;
  const resolution = await resolveInboundAttributionJourney(
    `Mensagem\nJID: J1_${"C".repeat(22)}`,
    { resolveImpl: async () => { called = true; return {}; } },
  );
  assert.equal(resolution.status, "unavailable");
  assert.equal(resolution.journey, null);
  assert.equal(called, false);
});

test("the transport token is removed before message, bot or Sheets persistence", () => {
  const token = `J1_${"D".repeat(22)}`;
  assert.equal(
    stripAttributionTransportToken(`Quero saber mais.\nJID: ${token}`),
    "Quero saber mais.",
  );
  assert.equal(
    stripAttributionTransportToken(`JID: ${token}\nMensagem personalizada`),
    "Mensagem personalizada",
  );
});

test("uncoded acquisition sources carry an explicit bounded fallback reason", () => {
  assert.equal(
    attributionFallbackReason("meta_uncoded"),
    "meta_referral_without_mapped_code",
  );
  assert.equal(
    attributionFallbackReason("site_uncoded"),
    "site_source_without_campaign_code",
  );
  assert.equal(attributionFallbackReason("meta_coded"), "");
  assert.equal(attributionFallbackReason("unexpected"), "");
});

test("maps known Meta ad IDs to complete campaign references", () => {
  const historical = classifyAttribution(
    {},
    {
      referral: {
        source_type: "ad",
        source_id: "120250469052940627",
      },
    },
    "Olá! Gostaria de saber mais. Ref. M26F01W-C01",
  );
  const currentLifting = classifyAttribution(
    {},
    {
      referral: {
        source_type: "ad",
        source_id: "120251254720680627",
      },
    },
    "Quero saber sobre lifting facial",
  );

  assert.equal(historical.platform, "Meta");
  assert.equal(historical.referenceCategory, "meta_coded");
  assert.equal(historical.reference, "M26F01W-C01H01");
  assert.equal(currentLifting.platform, "Meta");
  assert.equal(currentLifting.referenceCategory, "meta_coded");
  assert.equal(currentLifting.reference, "M26F01W-C06H01");
});

test("maps the cervical WhatsApp and Site Meta ad IDs to distinct routes", () => {
  const direct = classifyAttribution(
    {},
    {
      referral: {
        source_type: "ad",
        source_id: "120251248762170627",
      },
    },
    "Quero entender o lifting cervical",
  );
  const site = classifyAttribution(
    {},
    {
      referral: {
        source_type: "ad",
        source_id: "120251249058760627",
      },
    },
    "Quero entender o lifting cervical",
  );

  assert.equal(direct.referenceCategory, "meta_coded");
  assert.equal(direct.reference, "M26C01W-C07H01");
  assert.equal(site.referenceCategory, "meta_coded");
  assert.equal(site.reference, "M26C02S-C07H01");
});

test("keeps an auditable Meta ad ID when the ad is not mapped yet", () => {
  const attribution = classifyAttribution(
    {},
    {
      referral: {
        source_type: "ad",
        source_id: "120999999999999999",
      },
    },
    "Quero saber mais",
  );

  assert.equal(attribution.platform, "Meta");
  assert.equal(attribution.referenceCategory, "meta_ad_id");
  assert.equal(
    attribution.reference,
    "META-AD-120999999999999999",
  );
});

test("safety identifier is stable and does not contain the phone", () => {
  const first = createSafetyIdentifier(PHONE);
  const second = createSafetyIdentifier(PHONE);

  assert.equal(first, second);
  assert.equal(first.includes(PHONE), false);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("valid structured response is parsed", () => {
  const result = parseOpenAIShadowResponse(validResponse(), "fallback-model");

  assert.equal(result.status, "completed");
  assert.equal(result.model, "test-model");
  assert.deepEqual(result.decision, validDecision());
  assert.deepEqual(result.usage, {
    input_tokens: 10,
    output_tokens: 20,
    total_tokens: 30,
  });
});

test("a known WhatsApp profile name prevents asking the name again", () => {
  const result = parseOpenAIShadowResponse(
    validResponse(
      validDecision({
        suggestedReply:
          "Boa tarde! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Como posso te chamar?",
      }),
    ),
    "fallback-model",
    { patientProfileName: "Rosana Macedo" },
  );

  assert.equal(result.status, "completed");
  assert.equal(
    result.decision.suggestedReply,
    "Boa tarde! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Como posso ajudar?",
  );
});

test("a generic WhatsApp profile does not suppress the name question", () => {
  for (const patientProfileName of [
    "Paciente",
    "Clínica Rosana",
    "Studio RM",
    "Rosana 2026",
    "Loja da Rô",
    "Dra. Amanda",
    "Rosana 💙",
    "soniamariamontoromenezes",
  ]) {
    const decision = validDecision({
      suggestedReply: "Como posso te chamar?",
    });
    const result = parseOpenAIShadowResponse(
      validResponse(decision),
      "fallback-model",
      { patientProfileName },
    );

    assert.equal(result.status, "completed");
    assert.equal(
      result.decision.suggestedReply,
      "Como posso te chamar?",
    );
  }
});

test("existing conversation history prevents asking the name even without a profile name", () => {
  const result = parseOpenAIShadowResponse(
    validResponse(
      validDecision({
        suggestedReply: "Tudo bem! Como posso te chamar?",
      }),
    ),
    "fallback-model",
    {
      patientProfileName: "",
      hasConversationHistory: true,
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(
    result.decision.suggestedReply,
    "Tudo bem! Como posso ajudar?",
  );
});

test("OpenAI HTTP error returns a controlled failure", async () => {
  const result = await runOpenAIShadow(
    { phone: PHONE, text: "Ola", platform: "Google" },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async () => new Response("ignored", { status: 429 }),
    },
  );

  assert.deepEqual(result, {
    status: "failed",
    httpStatus: 429,
    errorCode: "http_error",
  });
});

test("OpenAI failure does not throw to the webhook caller", async () => {
  await assert.doesNotReject(() =>
    runOpenAIShadow(
      { phone: PHONE, text: "Ola", platform: "Google" },
      {
        env: { OPENAI_API_KEY: "test-key" },
        fetchImpl: async () => {
          throw new Error("network unavailable");
        },
      },
    ),
  );
});

test("urgency forces silent human review without a patient reply", () => {
  const result = parseOpenAIShadowResponse(
    validResponse(validDecision({ urgent: true })),
    "fallback-model",
  );

  assert.equal(result.status, "completed");
  assert.equal(result.decision.route, "human_review");
  assert.equal(result.decision.automaticAllowed, false);
  assert.equal(result.decision.replyCode, "ALERT-URG-01");
  assert.equal(result.decision.suggestedReply, "");
  assert.equal(
    result.decision.reviewReason,
    "possible_urgent_symptoms",
  );
});

test("only OpenAI is called and the request omits the raw phone", async () => {
  const calls = [];
  const longText = "a".repeat(2_100);
  const result = await runOpenAIShadow(
    { phone: PHONE, text: longText, platform: "Meta" },
    {
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "test-model",
        OPENAI_REASONING_EFFORT: "low",
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), { status: 200 });
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/responses");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.store, false);
  assert.equal(body.safety_identifier.includes(PHONE), false);
  assert.equal(calls[0].options.body.includes(PHONE), false);
  const input = JSON.parse(body.input);
  assert.equal(input.currentMessage.length, 2_000);
  assert.equal(input.whatsappProfileName, "");
  assert.deepEqual(input.recentConversation, []);
  assert.equal(body.text.verbosity, "low");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
});

test("appointment review is accepted as a strict structured route", () => {
  const result = parseOpenAIShadowResponse(
    validResponse(
      validDecision({
        route: "appointment_review",
        automaticAllowed: true,
        suggestedReply: "Mensagem que não pode ser enviada.",
        reviewReason: "",
      }),
    ),
    "fallback-model",
  );

  assert.equal(result.status, "completed");
  assert.equal(result.decision.route, "appointment_review");
  assert.equal(result.decision.automaticAllowed, false);
  assert.equal(result.decision.suggestedReply, "");
  assert.equal(
    result.decision.reviewReason,
    "appointment_preference_captured",
  );
});

test("short conversation history is sent in full without the phone", async () => {
  const calls = [];
  const result = await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Superior",
      platform: "WhatsApp direto",
      patientProfileName: "Maria S.",
      recentConversation: [
        {
          role: "patient",
          source: "paciente",
          text: "Quero saber sobre blefaroplastia",
        },
        {
          role: "assistant",
          source: "bruna",
          text: "O que mais incomoda nas pálpebras?",
        },
      ],
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  assert.equal(result.status, "completed");
  const requestBody = JSON.parse(calls[0].options.body);
  const input = JSON.parse(requestBody.input);

  assert.equal(input.currentMessage, "Superior");
  assert.equal(input.whatsappProfileName, "Maria S.");
  assert.equal(input.recentConversation.length, 2);
  assert.equal(
    input.recentConversation[1].text,
    "O que mais incomoda nas pálpebras?",
  );
  assert.equal(calls[0].options.body.includes(PHONE), false);
});

test("the model receives the latest thirty-two turns with speaker sources", async () => {
  const calls = [];
  const recentConversation = Array.from(
    { length: 40 },
    (_value, index) => ({
      role: index % 2 === 0 ? "assistant" : "patient",
      source: index % 4 === 0 ? "equipe_humana" : index % 2 === 0 ? "bruna" : "paciente",
      text: `Mensagem ${index + 1}`,
    }),
  );

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Pode sim",
      platform: "WhatsApp direto",
      recentConversation,
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  const input = JSON.parse(
    JSON.parse(calls[0].options.body).input,
  );

  assert.equal(input.recentConversation.length, 32);
  assert.equal(input.recentConversation[0].text, "Mensagem 9");
  assert.equal(input.recentConversation[0].source, "equipe_humana");
  assert.equal(input.recentConversation[31].text, "Mensagem 40");
  assert.equal(input.recentConversation[31].source, "paciente");
});

test("the model receives event-linked semantic state under a strict schema", async () => {
  const calls = [];
  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Certo",
      platform: "WhatsApp direto",
      recentConversation: [{
        role: "assistant",
        source: "bruna",
        eventId: "offer-1",
        text: "Posso te explicar como funciona a consulta.",
      }],
      previousConversationState: {
        activeTopic: "consulta",
        patientAct: "statement",
        refersToEventId: "",
        lastClinicQuestion: "",
        lastClinicOffer: "Posso te explicar como funciona a consulta.",
        unresolvedQuestions: ["como funciona a consulta"],
        factsAlreadyProvided: [],
        owner: "patient",
        nextExpectedAction: "responder a oferta",
        ambiguity: "",
        contextConfidence: "high",
      },
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), { status: 200 });
      },
    },
  );

  const request = JSON.parse(calls[0].options.body);
  const input = JSON.parse(request.input);
  assert.equal(input.recentConversation[0].eventId, "offer-1");
  assert.equal(input.previousConversationState.activeTopic, "consulta");
  assert.equal(
    request.text.format.schema.required.includes("conversationState"),
    true,
  );
  assert.equal(
    request.text.format.schema.properties.conversationState.additionalProperties,
    false,
  );
});

test("the model receives bounded mechanical hints as non-authoritative context", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Ai fazem cervicoplastia",
      platform: "WhatsApp direto",
      recentConversation: [
        {
          role: "assistant",
          source: "bruna",
          text: "A clínica fica em Pinheiros.",
        },
      ],
      policyHints: {
        route: "standard_reply",
        reason: "known_procedure",
        replyCode: "G-LIFT-CERV-01",
        deterministicReplyCode: "MARKETING-PREFILL-OPENING-01",
        deterministicReplyPreview:
          "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
        deterministicReplyProfessional: "amanda",
        deterministicReplyProcedure: "lifting_cervical",
        professional: "amanda",
        procedure: "lifting_cervical",
        automaticAllowed: true,
        semanticRoutePending: true,
        ignoredField: "not-forwarded",
      },
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  const input = JSON.parse(
    JSON.parse(calls[0].options.body).input,
  );
  assert.deepEqual(input.policyHints, {
    route: "standard_reply",
    reason: "known_procedure",
    replyCode: "G-LIFT-CERV-01",
    deterministicReplyCode: "MARKETING-PREFILL-OPENING-01",
    deterministicReplyProfessional: "amanda",
    deterministicReplyProcedure: "lifting_cervical",
    professional: "amanda",
    procedure: "lifting_cervical",
    deterministicReplyPreview:
      "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
    automaticAllowed: true,
    semanticRoutePending: true,
  });
});

test("passes bounded Meta ad context without referral URLs", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Olá, posso obter mais informações sobre isso?",
      platform: "Meta",
      procedure: "avaliacao_facial",
      referenceCategory: "meta_uncoded",
      referralContext: {
        sourceType: "ad",
        mediaType: "video",
        headline: "Como funciona a avaliação facial",
        body: "Conheça a consulta da Dra. Amanda.",
        sourceUrl: "https://facebook.example/private-tracking",
      },
      recentConversation: [],
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  const requestBody = JSON.parse(calls[0].options.body);
  const input = JSON.parse(requestBody.input);

  assert.deepEqual(input.metaAdContext, {
    sourceType: "ad",
    mediaType: "video",
    headline: "Como funciona a avaliação facial",
    body: "Conheça a consulta da Dra. Amanda.",
  });
  assert.equal(
    calls[0].options.body.includes("facebook.example"),
    false,
  );
});

test("passes one approved procedure page only to eligible non-site conversations", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Tenho receio da recuperação",
      platform: "Meta",
      procedure: "blefaroplastia",
      referenceCategory: "meta_uncoded",
      recentConversation: [
        {
          role: "assistant",
          text: "Você está começando a pesquisar?",
        },
        {
          role: "patient",
          text: "Sim, e tenho receio da recuperação.",
        },
      ],
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  const input = JSON.parse(
    JSON.parse(calls[0].options.body).input,
  );

  assert.equal(input.cameFromWebsite, false);
  assert.deepEqual(input.siteResource, {
    title: "Blefaroplastia",
    url: "https://draamandaschroeder.com.br/blefaroplastia/",
    context:
      "Página completa do procedimento, com explicações, consulta, recuperação, dúvidas e casos reais com antes e depois.",
  });
});

test("passes approved lifting facts for every safe part of the real multi-question message", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text:
        "Boa tarde, Bruna, tudo bem? Quanto tempo leva a cirurgia, se tem um longo período de recuperação, indicações para realização (talvez eu ainda não precise)",
      platform: "Meta",
      procedure: "lifting_facial",
      referenceCategory: "meta_coded",
      recentConversation: [
        {
          role: "assistant",
          source: "bruna",
          text: "O que você gostaria de entender primeiro sobre o lifting facial?",
        },
      ],
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), { status: 200 });
      },
    },
  );

  const input = JSON.parse(JSON.parse(calls[0].options.body).input);
  assert.equal(input.approvedClinicalFacts.procedure, "lifting_facial");
  assert.deepEqual(input.approvedClinicalFacts.topics, [
    "duration",
    "recovery",
    "indication",
  ]);
  assert.deepEqual(
    input.approvedClinicalFacts.facts.map((fact) => fact.topic),
    input.approvedClinicalFacts.topics,
  );
  assert.match(
    input.approvedClinicalFacts.boundaries.join(" "),
    /não concluir indicação individual/i,
  );
});

test("does not pass a site page back to a person who came from the site", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Quero saber mais",
      platform: "Orgânico/Conteúdo",
      procedure: "blefaroplastia",
      referenceCategory: "site_page",
      recentConversation: [],
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  const input = JSON.parse(
    JSON.parse(calls[0].options.body).input,
  );

  assert.equal(input.cameFromWebsite, true);
  assert.equal(input.siteResource, null);
});

test("does not pass a site resource while a human task is pending", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Quero entender melhor a recuperação",
      platform: "Meta",
      procedure: "lifting_facial",
      referenceCategory: "meta_coded",
      patientRelationship: {
        knownPatient: false,
        state: "lead",
        hasPendingHumanTask: true,
      },
      recentConversation: [
        {
          role: "assistant",
          text: "O que você gostaria de entender primeiro?",
        },
        {
          role: "patient",
          text: "Quero conhecer melhor a recuperação.",
        },
      ],
    },
    {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
        });
      },
    },
  );

  const input = JSON.parse(
    JSON.parse(calls[0].options.body).input,
  );

  assert.equal(input.siteResource, null);
  assert.equal(input.patientRelationship.hasPendingHumanTask, true);
});

test("OpenAI failure keeps the webhook successful and never sends to YCloud", async () => {
  const savedEnvironment = {
    YCLOUD_WEBHOOK_SECRET: process.env.YCLOUD_WEBHOOK_SECRET,
    GOOGLE_SHEETS_WEBHOOK_URL: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WHATSAPP_AUTOMATION_MODE: process.env.WHATSAPP_AUTOMATION_MODE,
    WHATSAPP_ALERT_NUMBER: process.env.WHATSAPP_ALERT_NUMBER,
  };
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];

  process.env.YCLOUD_WEBHOOK_SECRET = "webhook-test-secret";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  process.env.OPENAI_API_KEY = "openai-test-key";
  process.env.WHATSAPP_AUTOMATION_MODE = "shadow";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};
  globalThis.fetch = async (url) => {
    requests.push(url);

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response('{"ok":true}', { status: 200 });
    }

    if (url === "https://api.openai.com/v1/responses") {
      throw new Error("OpenAI unavailable");
    }

    throw new Error("unexpected destination");
  };

  try {
    const payload = {
      id: "event-test",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "message-test",
        from: PHONE,
        type: "text",
        text: { body: "Ola, quero uma avaliacao" },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = "1721908800";
    const signature = createHmac("sha256", process.env.YCLOUD_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` },
        body: rawBody,
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.aiShadowQueued, true);
    assert.equal(body.semanticAssessmentAttempted, true);
    assert.equal(
      requests.filter(
        (url) => url === "https://api.openai.com/v1/responses",
      ).length,
      1,
    );
    assert.equal(
      requests.some(
        (url) => url === "https://api.ycloud.com/v2/whatsapp/messages",
      ),
      false,
    );
    assert.equal(
      requests.every((url) =>
        [
          process.env.GOOGLE_SHEETS_WEBHOOK_URL,
          "https://api.openai.com/v1/responses",
        ].includes(url),
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("commercial and clearly irrelevant contacts are ignored before downstream services", async () => {
  const savedSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  let fetchCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = "webhook-test-secret";
  console.log = () => {};
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("ignored contact must not call downstream services");
  };

  try {
    const cases = [
      {
        id: "commercial",
        text:
          "Olá, somos uma agência de marketing digital e gostaríamos de apresentar nossos serviços",
        reason: "commercial_solicitation_or_partnership",
      },
      {
        id: "personal",
        text: "Dra Amanda, vamos almoçar amanhã?",
        reason: "irrelevant_or_personal_contact",
      },
    ];

    for (const testCase of cases) {
      const rawBody = JSON.stringify({
        id: `${testCase.id}-event`,
        type: "whatsapp.inbound_message.received",
        whatsappInboundMessage: {
          id: `${testCase.id}-message`,
          from: "+5511900000001",
          to: PHONE,
          type: "text",
          text: {
            body: testCase.text,
          },
        },
      });
      const timestamp = "1721908800";
      const signature = createHmac(
        "sha256",
        process.env.YCLOUD_WEBHOOK_SECRET,
      )
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
      const response = await webhook(
        new Request("http://localhost/api/ycloud/webhook", {
          method: "POST",
          headers: {
            "YCloud-Signature": `t=${timestamp},s=${signature}`,
          },
          body: rawBody,
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.ignored, true);
      assert.equal(body.ignoreReason, testCase.reason);
      assert.equal(body.leadRecorded, false);
      assert.equal(body.aiActiveQueued, false);
    }

    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    if (savedSecret === undefined) {
      delete process.env.YCLOUD_WEBHOOK_SECRET;
    } else {
      process.env.YCLOUD_WEBHOOK_SECRET = savedSecret;
    }
  }
});

test("an exact event duplicate without durable completion remains recoverable", async () => {
  const savedEnvironment = {
    YCLOUD_WEBHOOK_SECRET: process.env.YCLOUD_WEBHOOK_SECRET,
    GOOGLE_SHEETS_WEBHOOK_URL: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WHATSAPP_AUTOMATION_MODE: process.env.WHATSAPP_AUTOMATION_MODE,
    WHATSAPP_ALERT_NUMBER: process.env.WHATSAPP_ALERT_NUMBER,
  };
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  let sheetsResponse = {
    ok: true,
    inserted: false,
    updated: true,
    duplicate: false,
    duplicateReason: null,
  };
  let openAiCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = "webhook-test-secret";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  process.env.OPENAI_API_KEY = "openai-test-key";
  process.env.WHATSAPP_AUTOMATION_MODE = "shadow";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};
  globalThis.fetch = async (url) => {
    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify(sheetsResponse),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      openAiCalls += 1;
      return new Response(JSON.stringify(validResponse()), { status: 200 });
    }

    throw new Error("unexpected destination");
  };

  async function invoke(eventId) {
    const rawBody = JSON.stringify({
      id: eventId,
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: `${eventId}-message`,
        from: PHONE,
        type: "text",
        text: { body: "Ola, quero uma avaliacao" },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac("sha256", process.env.YCLOUD_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` },
        body: rawBody,
      }),
    );

    return response.json();
  }

  try {
    const continuation = await invoke("existing-phone-event");
    assert.equal(continuation.leadInserted, false);
    assert.equal(continuation.leadUpdated, true);
    assert.equal(continuation.duplicate, false);
    assert.equal(continuation.aiShadowQueued, true);
    assert.equal(openAiCalls, 1);

    sheetsResponse = {
      ok: true,
      inserted: false,
      updated: false,
      duplicate: true,
      duplicateReason: "event_id",
    };
    const exactDuplicate = await invoke("event-id-duplicate");
    assert.equal(exactDuplicate.leadInserted, false);
    assert.equal(exactDuplicate.leadUpdated, false);
    assert.equal(exactDuplicate.duplicate, true);
    assert.equal(exactDuplicate.aiShadowQueued, true);
    assert.equal(openAiCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("active mode sends only the high-confidence OpenAI reply", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.YCLOUD_ALERT_TEMPLATE_NAME;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: true,
          updated: false,
          duplicate: false,
          humanTakeoverToday: false,
          opportunityId: "opp-active-standard",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify(
          validResponse(
            validDecision({
              suggestedReply:
                "Olá! A avaliação é individual. O que você deseja melhorar?",
            }),
          ),
        ),
        { status: 200 },
      );
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error("unexpected destination");
  };

  try {
    const rawBody = JSON.stringify({
      id: "active-standard-event",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "active-standard-message",
        from: "+5511900000000",
        to: PHONE,
        type: "text",
        customerProfile: { name: "Maria" },
        text: { body: "Quero saber sobre blefaroplastia" },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(body.aiShadowQueued, false);
    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.patientReplyQueued, false);

    const patientRequests = requests.filter(
      (request) =>
        request.url ===
        "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(patientRequests.length, 1);
    const patientBody = JSON.parse(patientRequests[0].options.body);
    assert.equal(patientBody.type, "text");
    assert.equal(
      patientBody.text.body,
      "Olá, Maria! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. A avaliação é individual. O que você deseja melhorar?",
    );
    const operationalRequest = requests.find((request) => {
      if (request.url !== process.env.GOOGLE_SHEETS_WEBHOOK_URL) return false;
      return JSON.parse(request.options.body).action ===
        "record_operational_event";
    });
    assert.ok(operationalRequest);
    const operationalEvent = JSON.parse(
      operationalRequest.options.body,
    ).event;
    assert.equal(operationalEvent.opportunityId, "opp-active-standard");
    assert.equal(operationalEvent.type, "automatic_reply_sent");
    assert.equal(Object.hasOwn(operationalEvent, "text"), false);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("the real multi-part lifting question uses the approved complete reply instead of unknown holding", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.YCLOUD_ALERT_TEMPLATE_NAME;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const sheetsRequest = JSON.parse(options.body);
      if (sheetsRequest.action === "get_conversation_context") {
        return new Response(
          JSON.stringify({
            ok: true,
            opportunityId: "opp-lifting-information-regression",
            professional: "amanda",
            turns: [
              {
                role: "user",
                source: "patient",
                text: "Olá! Quero saber sobre lifting facial com a Dra. Amanda.",
                eventId: "lifting-information-prefill",
                at: "2026-08-19T19:35:04.000Z",
              },
              {
                role: "assistant",
                source: "bruna",
                text: "Olá, Dani! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. O que você gostaria de entender primeiro sobre o lifting facial?",
                eventId: "lifting-information-opening",
                at: "2026-08-19T19:35:42.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (sheetsRequest.action === "get_bot_knowledge_context") {
        return new Response(
          JSON.stringify({ ok: true, candidates: [], pendingQuestion: null }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: false,
          updated: true,
          duplicate: false,
          humanTakeoverToday: false,
          patientRelationship: { found: false },
          opportunityId: "opp-lifting-information-regression",
          professional: "amanda",
          routeStatus: "resolved_by_open_opportunity",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      const input = JSON.parse(JSON.parse(options.body).input);
      assert.equal(
        input.policyHints.deterministicReplyCode,
        "LIFTING-FACIAL-INFORMATION-01",
      );
      assert.match(
        input.policyHints.deterministicReplyPreview,
        /10 a 14 dias/i,
      );
      assert.deepEqual(input.approvedClinicalFacts.topics, [
        "duration",
        "recovery",
        "indication",
      ]);

      return new Response(
        JSON.stringify(
          validResponse(
            validDecision({
              procedure: "lifting_facial",
              replyCode: "LIFTING-FACIAL-INFORMATION-01",
              suggestedReply: "A prévia factual aprovada resolve a mensagem.",
              reviewReason: "approved_lifting_information",
              conversationState: {
                activeTopic: "duração, recuperação e indicação do lifting facial",
                patientAct: "question",
                refersToEventId: "",
                lastClinicQuestion: "",
                lastClinicOffer: "",
                unresolvedQuestions: [],
                factsAlreadyProvided: [],
                owner: "bruna",
                nextExpectedAction: "aguardar resposta da paciente",
                ambiguity: "",
                contextConfidence: "high",
              },
            }),
          ),
        ),
        { status: 200 },
      );
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const rawBody = JSON.stringify({
      id: "lifting-information-regression-event",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-08-19T19:37:15.000Z",
      whatsappInboundMessage: {
        id: "lifting-information-regression-message",
        from: "+5511900000077",
        to: PHONE,
        sendTime: "2026-08-19T19:37:15.000Z",
        type: "text",
        customerProfile: { name: "Dani" },
        text: {
          body:
            "Boa tarde, Bruna, tudo bem? Quanto tempo leva a cirurgia, se tem um longo período de recuperação, indicações para realização (talvez eu ainda não precise)",
        },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.conversationHistorySource, "durable_ledger_fallback");

    const patientRequests = requests.filter(
      (request) =>
        request.url === "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(patientRequests.length, 1);
    const reply = JSON.parse(patientRequests[0].options.body).text.body;
    assert.match(reply, /duração da cirurgia varia conforme o planejamento/i);
    assert.match(reply, /10 a 14 dias/i);
    assert.match(reply, /3 e 4 semanas/i);
    assert.match(reply, /não existe uma idade única/i);
    assert.match(reply, /sem compromisso de operar/i);
    assert.doesNotMatch(reply, /vou confirmar|com a equipe/i);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("active AI interprets a colloquial procedure question without punctuation", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.YCLOUD_ALERT_TEMPLATE_NAME;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: false,
          updated: true,
          duplicate: false,
          humanTakeoverToday: false,
          opportunityId: "opp-ai-triage-continuation",
          professional: "amanda",
          routeStatus: "resolved_by_open_opportunity",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify(
          validResponse(
            validDecision({
              procedure: "lifting_cervical",
              suggestedReply:
                "Sim, fazemos cervicoplastia. É uma cirurgia realizada em hospital, com anestesista e equipe cirúrgica, e o planejamento é definido individualmente na consulta.",
            }),
          ),
        ),
        { status: 200 },
      );
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const rawBody = JSON.stringify({
      id: "ai-triage-continuation-event",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "ai-triage-continuation-message",
        from: "+5511900000091",
        to: PHONE,
        type: "text",
        customerProfile: { name: "Isabel Ribeiro" },
        text: { body: "Ai fazem cervicoplastia" },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.reviewAlertQueued, false);

    const openAIRequest = requests.find(
      (request) => request.url === "https://api.openai.com/v1/responses",
    );
    assert.ok(openAIRequest);
    const openAIInput = JSON.parse(
      JSON.parse(openAIRequest.options.body).input,
    );
    assert.equal(openAIInput.priorInteractionKnown, true);
    assert.deepEqual(openAIInput.recentConversation, []);
    assert.equal(openAIInput.policyHints.reason, "known_procedure");
    assert.equal(openAIInput.policyHints.procedure, "lifting_cervical");

    const patientRequests = requests.filter(
      (request) =>
        request.url === "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(patientRequests.length, 1);
    assert.equal(
      JSON.parse(patientRequests[0].options.body).text.body,
      "Sim, fazemos cervicoplastia. É uma cirurgia realizada em hospital, com anestesista e equipe cirúrgica, e o planejamento é definido individualmente na consulta.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("coded acquisition remains silent when Sheets cannot establish a route", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
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
  const requests = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL:
      "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const error = new Error("Sheets timeout");
      error.name = "AbortError";
      throw error;
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const rawBody = JSON.stringify({
      id: "sheets-fallback-event",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "sheets-fallback-message",
        from: "+5511976360209",
        to: PHONE,
        type: "text",
        customerProfile: { name: "Marisa" },
        referral: { source_type: "ad" },
        text: {
          body:
            "Olá! Quero saber sobre lifting facial com a Dra. Amanda. Ref. M26F01W-C06H01",
        },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.received, false);
    assert.equal(body.error, "lead_delivery_failed");
    assert.equal(body.automaticWorkFinished, false);

    const patientRequests = requests.filter(
      (request) =>
        request.url ===
        "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(patientRequests.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("a structured lipo prefill opens a conversation without jumping to schedule", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
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
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: false,
          updated: true,
          duplicate: false,
          humanTakeoverToday: false,
          opportunityId: "opp-consultation-information",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify(
          validResponse(
              validDecision({
                procedure: "lipo_papada",
                replyCode: "MARKETING-PREFILL-OPENING-01",
                suggestedReply:
                  "A mensagem abre uma conversa sobre lipo de papada sem solicitar agenda.",
              }),
          ),
        ),
        { status: 200 },
      );
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error("unexpected destination");
  };

  try {
    const rawBody = JSON.stringify({
      id: "consultation-information-event",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "consultation-information-message",
        from: "+5511900000000",
        to: PHONE,
        type: "text",
        template_id: "procedure_evaluation_v1",
        customerProfile: { name: "Fabrícia Silva" },
        text: {
          body:
            "Olá! Tenho interesse em lipo de papada com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.\n\nRef. G26LIPO-OT01",
        },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.appointmentNeedsPreference, false);
    assert.equal(body.appointmentPreferenceReplySent, false);
    assert.equal(body.appointmentReviewQueued, false);
    assert.equal(body.automation.marketingPrefill, true);
    const appendLeadRequest = requests
      .filter((request) =>
        request.url === process.env.GOOGLE_SHEETS_WEBHOOK_URL)
      .map((request) => JSON.parse(request.options.body))
      .find((requestBody) => requestBody.action === "append_lead");
    assert.equal(
      appendLeadRequest?.lead?.templateId,
      "procedure_evaluation_v1",
    );
    assert.equal(
      requests.some(
        (request) =>
          request.url === "https://api.openai.com/v1/responses",
      ),
      true,
    );

    const patientRequests = requests.filter(
      (request) =>
        request.url ===
          "https://api.ycloud.com/v2/whatsapp/messages" &&
        JSON.parse(request.options.body).type === "text",
    );
    assert.equal(patientRequests.length, 1);
    const patientReply = JSON.parse(
      patientRequests[0].options.body,
    ).text.body;
    assert.equal(
      patientReply,
      "Olá, Fabrícia! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
        "Posso te orientar sobre lipo de papada. " +
        "O que você gostaria de entender primeiro?",
    );
    assert.doesNotMatch(patientReply, /R\$ 500/);
    assert.doesNotMatch(patientReply, /obrigada pela confiança/i);
    assert.doesNotMatch(patientReply, /possibilidades, limites/i);
    assert.doesNotMatch(patientReply, /https:\/\/draamandaschroeder/);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("the first surgical price question uses the approved institutional reply", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: false,
          updated: true,
          duplicate: false,
          humanTakeoverToday: false,
          opportunityId: "opp-active-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify(
          validResponse(
            validDecision({
              route: "standard_reply",
              automaticAllowed: true,
              confidence: "high",
              replyCode: "SURGICAL-PRICE-INITIAL-01",
              suggestedReply: "A pergunta é sobre o valor da cirurgia.",
              reviewReason: "price_initial_information",
            }),
          ),
        ),
        { status: 200 },
      );
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error("unexpected destination");
  };

  try {
    const rawBody = JSON.stringify({
      id: "active-price-event",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-07-29T11:10:00.000Z",
      whatsappInboundMessage: {
        id: "active-price-message",
        from: "+5511900000000",
        to: PHONE,
        sendTime: "2026-07-29T11:10:00.000Z",
        type: "text",
        customerProfile: { name: "Maria" },
        text: {
          body:
            "Qual o valor da blefaroplastia? Pode me passar uma média?",
        },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.priceHoldingQueued, false);
    assert.equal(body.priceHoldingSent, false);
    assert.equal(body.approvedPriceReplyKind, "initial_information");
    assert.equal(body.approvedPriceReplyQueued, true);
    assert.equal(body.approvedPriceReplySent, true);
    assert.equal(
      requests.some(
        (request) =>
          request.url === "https://api.openai.com/v1/responses",
      ),
      true,
    );

    const ycloudRequests = requests.filter(
      (request) =>
        request.url ===
        "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(ycloudRequests.length, 1);
    const ycloudBodies = ycloudRequests.map(
      (request) => JSON.parse(request.options.body),
    );
    const patientBody = ycloudBodies.find(
      (request) => request.type === "text",
    );
    assert.equal(patientBody.to, "+5511900000000");
    assert.match(patientBody.text.body, /é natural querer saber o valor antes de decidir/i);
    assert.match(patientBody.text.body, /confirma o valor exato após a avaliação/i);
    assert.equal((patientBody.text.body.match(/\?/g) || []).length, 0);
    assert.doesNotMatch(patientBody.text.body, /o que mais te incomoda/i);
    assert.doesNotMatch(patientBody.text.body, /técnica|complexidade|hospital|anestesia|materiais/i);
    assert.match(
      patientBody.text.body,
      /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
    );
    assert.doesNotMatch(patientBody.text.body, /R\$/);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
