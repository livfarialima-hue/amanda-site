import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "extreme-night-webhook-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";
const YCLOUD_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";

function requestFor(payload) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1787027460";
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

test("between midnight and 6am the webhook sends one short receipt and prepares a precise morning email", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_ALERT_NUMBER",
    "WHATSAPP_AUTOMATION_MODE",
    "HUMAN_RESUME_TIME_ZONE",
    "HUMAN_RESUME_START_HOUR",
    "HUMAN_RESUME_END_HOUR",
    "WHATSAPP_HUMAN_REPLY_GUARD_MS",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    WHATSAPP_AUTOMATION_MODE: "active",
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
    WHATSAPP_HUMAN_REPLY_GUARD_MS: "500",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      const body = JSON.parse(options.body);
      if (body.action === "send_review_alert_email") {
        return new Response('{"ok":true,"sent":true}', {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: true,
          updated: false,
          duplicate: false,
          humanTakeoverToday: false,
          opportunityId: "opp-extreme-night",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === YCLOUD_URL) {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "extreme-night-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-08-18T04:31:00.000Z",
        whatsappInboundMessage: {
          id: "extreme-night-message",
          from: "+5511900000000",
          to: "+5511961957144",
          sendTime: "2026-08-18T04:31:00.000Z",
          type: "text",
          customerProfile: { name: "Lia Teste" },
          text: { body: "Papada, valor?" },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.extremeNightActive, true);
    assert.equal(body.extremeNightDeferral, true);
    assert.equal(body.extremeNightAcknowledgementQueued, true);
    assert.equal(body.extremeNightAcknowledgementSent, true);
    assert.equal(body.approvedPriceReplyQueued, false);
    assert.equal(body.aiActiveQueued, false);
    assert.equal(body.overnightHandoffQueued, false);

    const ycloudBodies = requests
      .filter((request) => request.url === YCLOUD_URL)
      .map((request) => JSON.parse(request.options.body));
    assert.equal(ycloudBodies.length, 1);
    assert.equal(ycloudBodies[0].to, "+5511900000000");
    assert.match(ycloudBodies[0].text.body, /papada/i);
    assert.match(ycloudBodies[0].text.body, /já é madrugada/i);
    assert.match(ycloudBodies[0].text.body, /pela manhã/i);
    assert.doesNotMatch(ycloudBodies[0].text.body, /https?:\/\//i);
    assert.doesNotMatch(ycloudBodies[0].text.body, /\?$/);

    const emailRequest = requests
      .filter((request) => request.url === SHEETS_URL)
      .map((request) => JSON.parse(request.options.body))
      .find((request) => request.action === "send_review_alert_email");
    assert.ok(emailRequest);
    assert.match(
      emailRequest.alert.messageText,
      /RETOMAR PELA MANHÃ/,
    );
    assert.match(
      emailRequest.alert.messageText,
      /valor de tratamento da papada/i,
    );
    assert.doesNotMatch(
      emailRequest.alert.messageText,
      /Vou conferir essa informação com a equipe/i,
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
