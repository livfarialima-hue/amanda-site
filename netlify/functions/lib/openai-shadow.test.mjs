import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  createSafetyIdentifier,
  parseOpenAIShadowResponse,
  runOpenAIShadow,
} from "./openai-shadow.mjs";
import webhook, { classifyAttribution } from "../ycloud-webhook.mjs";

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
    "Olá, vim pela página da Dra. Amanda.\n\nReferência: Blefaroplastia",
  );

  assert.equal(attribution.platform, "Orgânico/Conteúdo");
  assert.equal(attribution.referenceCategory, "site_page");
  assert.equal(attribution.reference, "Blefaroplastia");
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

test("passes one approved procedure page only to eligible non-site conversations", async () => {
  const calls = [];

  await runOpenAIShadow(
    {
      phone: PHONE,
      text: "Tenho receio da recuperação",
      platform: "Meta",
      procedure: "blefaroplastia",
      referenceCategory: "meta_uncoded",
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

  assert.equal(input.cameFromWebsite, false);
  assert.deepEqual(input.siteResource, {
    title: "Blefaroplastia",
    url: "https://draamandaschroeder.com.br/blefaroplastia/",
  });
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
    assert.equal((await response.json()).aiShadowQueued, true);
    assert.deepEqual(requests, [
      process.env.GOOGLE_SHEETS_WEBHOOK_URL,
      "https://api.openai.com/v1/responses",
    ]);
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

test("existing phone update runs shadow AI but exact event duplicate does not", async () => {
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
    assert.equal(exactDuplicate.aiShadowQueued, false);
    assert.equal(openAiCalls, 1);
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
      "Olá! A avaliação é individual. O que você deseja melhorar?",
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

test("active price insistence alerts the reviewer and never replies to the patient", async () => {
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
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify(
          validResponse(
            validDecision({
              route: "human_review",
              automaticAllowed: false,
              suggestedReply: "",
              reviewReason: "price_range_requested",
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
      whatsappInboundMessage: {
        id: "active-price-message",
        from: "+5511900000000",
        to: PHONE,
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

    const ycloudRequests = requests.filter(
      (request) =>
        request.url ===
        "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(ycloudRequests.length, 1);
    const alertBody = JSON.parse(ycloudRequests[0].options.body);
    assert.equal(alertBody.type, "template");
    assert.equal(alertBody.to, process.env.WHATSAPP_ALERT_NUMBER);
    assert.equal(
      ycloudRequests.some(
        (request) =>
          JSON.parse(request.options.body).type === "text",
      ),
      false,
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
