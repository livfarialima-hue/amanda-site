import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "appointment-webhook-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";

function requestFor(payload) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1721908800";
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return new Request("http://localhost/api/ycloud/webhook", {
    method: "POST",
    headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` },
    body: rawBody,
  });
}

test("scheduling request sends a three-slot suggestion to the reviewer only", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_ALERT_NUMBER",
    "WHATSAPP_APPOINTMENT_REVIEW_ENABLED",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "WHATSAPP_AUTOMATION_MODE",
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
    WHATSAPP_APPOINTMENT_REVIEW_ENABLED: "true",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    WHATSAPP_AUTOMATION_MODE: "off",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      const body = JSON.parse(options.body);

      if (body.action === "append_lead") {
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

      if (body.action === "get_available_slots") {
        return new Response(
          JSON.stringify({
            ok: true,
            slots: [
              { day: "Segunda-feira", date: "27/07/2026", time: "08:00" },
              { day: "Segunda-feira", date: "27/07/2026", time: "10:00" },
              { day: "Quarta-feira", date: "29/07/2026", time: "13:00" },
            ],
          }),
          { status: 200 },
        );
      }
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error("unexpected destination");
  };

  try {
    const response = await webhook(
      requestFor({
        id: "appointment-event",
        type: "whatsapp.inbound_message.received",
        whatsappInboundMessage: {
          id: "appointment-message",
          from: "+5511900000000",
          to: "+5511961957144",
          type: "text",
          customerProfile: { name: "Maria Silva" },
          text: {
            body: "Quais datas estão disponíveis para blefaroplastia com a Dra Amanda?",
          },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.appointmentReviewQueued, true);
    assert.equal(body.reviewAlertQueued, false);
    assert.deepEqual(
      requests.filter((request) => request.url === SHEETS_URL).map(
        (request) => JSON.parse(request.options.body).action,
      ),
      ["append_lead", "get_available_slots"],
    );
    const scheduleRequest = requests.find(
      (request) =>
        request.url === SHEETS_URL &&
        JSON.parse(request.options.body).action === "get_available_slots",
    );
    assert.equal(JSON.parse(scheduleRequest.options.body).limit, 50);

    const alertRequest = requests.find(
      (request) => request.url === "https://api.ycloud.com/v2/whatsapp/messages",
    );
    const alertBody = JSON.parse(alertRequest.options.body);
    assert.equal(alertBody.to, process.env.WHATSAPP_ALERT_NUMBER);
    assert.notEqual(alertBody.to, "+5511900000000");
    assert.match(
      alertBody.template.components[0].parameters[2].text,
      /1\. segunda-feira \(27\/07\/2026\) às 08:00/,
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
