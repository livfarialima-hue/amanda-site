import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  createSafetyIdentifier,
  parseOpenAIShadowResponse,
  runOpenAIShadow,
} from "./openai-shadow.mjs";
import webhook from "../ycloud-webhook.mjs";

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
  assert.equal(JSON.parse(body.input).message.length, 2_000);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
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
