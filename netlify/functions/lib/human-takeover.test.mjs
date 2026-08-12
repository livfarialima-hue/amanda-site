import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "webhook-test-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";
const PATIENT_PHONE = "+5511967743374";

function signedRequest(payload) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1721908800";
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return new Request("http://localhost/api/ycloud/webhook", {
    method: "POST",
    headers: {
      "YCloud-Signature": `t=${timestamp},s=${signature}`,
    },
    body: rawBody,
  });
}

test("manual SMB echo marks takeover and suppresses later AI for the day", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
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
  const sheetActions = [];
  let openAiCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = SHEETS_URL;
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  process.env.OPENAI_API_KEY = "openai-test-key";
  process.env.WHATSAPP_AUTOMATION_MODE = "shadow";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};

  globalThis.fetch = async (url, options) => {
    if (url === SHEETS_URL) {
      const body = JSON.parse(options.body);
      sheetActions.push(body);

      if (body.action === "mark_human_takeover") {
        return new Response(
          JSON.stringify({
            ok: true,
            marked: true,
            created: true,
          }),
          { status: 200 },
        );
      }

      if (body.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: true,
            duplicate: false,
            duplicateReason: null,
            humanTakeoverToday: true,
          }),
          { status: 200 },
        );
      }
    }

    if (url === "https://api.openai.com/v1/responses") {
      openAiCalls += 1;
      throw new Error("OpenAI must not be called after human takeover");
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const echoResponse = await webhook(
      signedRequest({
        id: "echo-event",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-07-26T15:04:09.483Z",
        whatsappMessage: {
          id: "echo-message",
          wamid: "wamid.echo-message",
          status: "sent",
          from: "+5511961957144",
          to: PATIENT_PHONE,
          type: "text",
          text: { body: "Assumi a conversa" },
          sendTime: "2026-07-26T15:04:08.000Z",
        },
      }),
    );
    const echoBody = await echoResponse.json();

    assert.equal(echoResponse.status, 200);
    assert.equal(echoBody.humanTakeoverRecorded, true);
    assert.equal(echoBody.takeoverCreated, true);
    assert.equal(sheetActions[0].action, "mark_human_takeover");
    assert.equal(sheetActions[0].takeover.phone, PATIENT_PHONE);
    assert.equal(
      sheetActions[0].takeover.text,
      "Assumi a conversa",
    );

    const inboundResponse = await webhook(
      signedRequest({
        id: "inbound-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-07-26T15:10:00.000Z",
        whatsappInboundMessage: {
          id: "inbound-message",
          wamid: "wamid.inbound-message",
          from: PATIENT_PHONE,
          to: "+5511961957144",
          type: "text",
          text: { body: "Obrigada" },
          sendTime: "2026-07-26T15:10:00.000Z",
        },
      }),
    );
    const inboundBody = await inboundResponse.json();

    assert.equal(inboundResponse.status, 200);
    assert.equal(inboundBody.humanTakeoverToday, true);
    assert.equal(inboundBody.automation.route, "human_takeover_active");
    assert.equal(inboundBody.automation.replyCode, "HUMAN-DAY-01");
    assert.equal(inboundBody.aiShadowQueued, false);
    assert.equal(openAiCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("WhatsApp Business automatic greeting does not mark human takeover", async () => {
  const savedSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  let downstreamCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  console.log = () => {};
  globalThis.fetch = async () => {
    downstreamCalls += 1;
    throw new Error("automatic greeting must not reach downstream services");
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "automatic-greeting-event",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-07-27T21:30:00.000Z",
        whatsappMessage: {
          id: "automatic-greeting-message",
          wamid: "wamid.automatic-greeting-message",
          status: "sent",
          from: "+5511961957144",
          to: PATIENT_PHONE,
          type: "text",
          text: { body: "Oi! Como podemos ajudar?" },
          sendTime: "2026-07-27T21:29:59.000Z",
        },
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.received, true);
    assert.equal(body.ignored, true);
    assert.equal(
      body.ignoreReason,
      "whatsapp_business_automatic_greeting",
    );
    assert.equal(downstreamCalls, 0);
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

test("Dr. Henrique appointment echo preserves history and never takes over Amanda scheduling", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const sheetActions = [];

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = SHEETS_URL;
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    if (url !== SHEETS_URL) {
      throw new Error(`unexpected destination: ${url}`);
    }
    const body = JSON.parse(options.body);
    sheetActions.push(body);
    return new Response(
      JSON.stringify({ ok: true, preserved: true }),
      { status: 200 },
    );
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "henrique-appointment-echo",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-08-03T14:41:00.000Z",
        whatsappMessage: {
          id: "henrique-appointment-message",
          wamid: "wamid.henrique-appointment-message",
          status: "sent",
          from: "+5511961957144",
          to: PATIENT_PHONE,
          type: "text",
          text: {
            body:
              "Agendamento confirmado. Nome: Jacqueline. Data: 05/08/2026. Horário: 16h00. Médico: Dr. Henrique Lane Staniak.",
          },
          sendTime: "2026-08-03T14:41:00.000Z",
        },
      }),
    );
    const body = await response.json();

    assert.equal(body.ignored, true);
    assert.equal(
      body.ignoreReason,
      "external_professional_appointment",
    );
    const cleanupActions = sheetActions.filter(
      (action) =>
        action.action ===
        "record_external_professional_contact",
    );
    assert.equal(cleanupActions.length, 1);
    assert.equal(
      sheetActions.some(
        (action) => action.action === "mark_human_takeover",
      ),
      false,
    );
    assert.equal(
      cleanupActions[0].action,
      "record_external_professional_contact",
    );
    assert.equal(cleanupActions[0].contact.phone, PATIENT_PHONE);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
