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

test("a known patient asking a generic surgical price gets an immediate holding reply and a complete review alert", async () => {
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
          patientRelationship: {
            found: true,
            relationshipState: "surgical_planning",
            patientName: "Van",
            professional: "Dra. Amanda",
            procedureTopic: "Lifting facial",
            hasPendingHumanTask: false,
          },
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
            body: "O preço da cirurgia?",
          },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.reviewAlertQueued, true);
    assert.equal(body.priceHoldingQueued, true);
    assert.equal(body.priceHoldingSent, true);
    assert.equal(body.overnightHandoffQueued, false);

    const ycloudRequests = requests.filter(
      (request) => request.url === YCLOUD_URL,
    );
    assert.equal(ycloudRequests.length, 2);

    const messages = ycloudRequests.map(
      (request) => JSON.parse(request.options.body),
    );
    const patientRequest = messages.find(
      (request) => request.to === "+5511900000000",
    );
    const alertRequest = messages.find(
      (request) => request.to === "+5511967743374",
    );

    assert.equal(patientRequest.type, "text");
    assert.match(
      patientRequest.text.body,
      /faixa de referência para o lifting facial/,
    );
    assert.match(
      patientRequest.text.body,
      /possibilidades de pagamento/,
    );
    assert.match(patientRequest.text.body, /te retorno por aqui/);
    assert.doesNotMatch(patientRequest.text.body, /R\$/);

    assert.equal(alertRequest.type, "template");
    const alertText = JSON.stringify(alertRequest);
    assert.match(alertText, /R\\u0024 33 mil|R\$ 33 mil/);
    assert.match(alertText, /condição à vista|condiçã/);
    assert.match(
      alertText,
      /equipe médica, anestesia, hospital, materiais e acompanhamento/,
    );
    assert.match(
      alertText,
      /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
    );
    assert.match(alertText, /verificar um horário/);
    assert.doesNotMatch(
      alertText,
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
