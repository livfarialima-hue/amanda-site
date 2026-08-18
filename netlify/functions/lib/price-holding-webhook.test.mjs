import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "price-holding-webhook-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";
const YCLOUD_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";

function requestFor(payload) {
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

test("a first lifting price question receives the approved initial information without an alert", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
    "HUMAN_RESUME_TIME_ZONE",
    "HUMAN_RESUME_START_HOUR",
    "HUMAN_RESUME_END_HOUR",
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
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: true,
          updated: false,
          duplicate: false,
          humanTakeoverToday: false,
          patientRelationship: { found: false },
          opportunityId: "opp-daytime-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === YCLOUD_URL) {
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "daytime-price-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-07-29T11:10:00.000Z",
        whatsappInboundMessage: {
          id: "daytime-price-message",
          from: "+5511900000000",
          to: "+5511961957144",
          sendTime: "2026-07-29T11:10:00.000Z",
          type: "text",
          customerProfile: { name: "Van" },
          text: {
            body: "Quanto custa o lifting facial?",
          },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.priceHoldingQueued, false);
    assert.equal(body.priceHoldingSent, false);
    assert.equal(body.approvedPriceReplyKind, "initial_information");
    assert.equal(body.approvedPriceReplyQueued, true);
    assert.equal(body.approvedPriceReplySent, true);
    assert.equal(body.directLiftingPriceQueued, false);
    assert.equal(body.directLiftingPriceSent, false);
    assert.equal(body.overnightHandoffQueued, false);

    const ycloudRequests = requests.filter(
      (request) => request.url === YCLOUD_URL,
    );
    assert.equal(ycloudRequests.length, 1);

    const messages = ycloudRequests.map(
      (request) => JSON.parse(request.options.body),
    );
    const patientRequest = messages.find(
      (request) => request.to === "+5511900000000",
    );
    assert.equal(patientRequest.type, "text");
    assert.doesNotMatch(patientRequest.text.body, /R\$ 18 mil|R\$ 26 mil/);
    assert.equal(
      (patientRequest.text.body.match(/https?:\/\//g) || []).length,
      0,
    );
    assert.doesNotMatch(
      patientRequest.text.body,
      /[\u200B-\u200D\u2060\uFEFF]/,
    );
    assert.match(patientRequest.text.body, /é natural querer saber o valor antes de decidir/i);
    assert.match(patientRequest.text.body, /confirma o valor exato após a avaliação/i);
    assert.equal((patientRequest.text.body.match(/\?/g) || []).length, 0);
    assert.doesNotMatch(patientRequest.text.body, /o que mais te incomoda/i);
    assert.doesNotMatch(patientRequest.text.body, /técnica|complexidade|hospital|anestesia|materiais/i);
    assert.doesNotMatch(patientRequest.text.body, /(?:informar|passar).{0,20}(?:média|faixa)/i);
    assert.ok(Array.from(patientRequest.text.body).length <= 360);
    assert.doesNotMatch(
      patientRequest.text.body,
      /Se quiser, posso te explicar o que costuma aproximar/,
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
