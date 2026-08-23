import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "overnight-webhook-secret";
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

test("a nighttime price request for another surgery alerts and acknowledges receipt", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
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
    OPENAI_API_KEY: "openai-test-key",
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
          opportunityId: "opp-overnight-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify({
          model: "test-model",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    route: "standard_reply",
                    confidence: "high",
                    automaticAllowed: true,
                    urgent: false,
                    professional: "amanda",
                    procedure: "blefaroplastia",
                    replyCode: "SURGICAL-PRICE-INITIAL-01",
                    suggestedReply: "A pergunta é sobre o valor da cirurgia.",
                    reviewReason: "price_initial_information",
                    conversationState: {
                      activeTopic: "preço da blefaroplastia",
                      patientAct: "question",
                      refersToEventId: "",
                      lastClinicQuestion: "",
                      lastClinicOffer: "",
                      unresolvedQuestions: ["valor da cirurgia"],
                      factsAlreadyProvided: [],
                      owner: "bruna",
                      nextExpectedAction: "responder preço inicial",
                      ambiguity: "",
                      contextConfidence: "high",
                    },
                  }),
                },
              ],
            },
          ],
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
        id: "overnight-price-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-07-29T00:31:00.000Z",
        whatsappInboundMessage: {
          id: "overnight-price-message",
          from: "+5511900000000",
          to: "+5511961957144",
          sendTime: "2026-07-29T00:31:00.000Z",
          type: "text",
          customerProfile: { name: "Maria" },
          text: {
            body: "Quanto custa a blefaroplastia?",
          },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.automation.route, "human_review");
    assert.equal(body.automation.reason, "surgical_price_review");
    assert.equal(body.reviewAlertQueued, true);
    assert.equal(body.priceHoldingQueued, true);
    assert.equal(body.priceHoldingSent, true);
    assert.equal(body.approvedPriceReplyKind, "");
    assert.equal(body.approvedPriceReplyQueued, false);
    assert.equal(body.approvedPriceReplySent, false);
    assert.equal(body.aiActiveQueued, false);
    assert.equal(body.overnightHandoffQueued, false);
    assert.equal(body.overnightHandoffSent, false);

    const ycloudRequests = requests.filter(
      (request) => request.url === YCLOUD_URL,
    );
    assert.equal(ycloudRequests.length, 2);

    const ycloudBodies = ycloudRequests.map(
      (request) => JSON.parse(request.options.body),
    );
    const patientRequest = ycloudBodies.find(
      (request) =>
        request.type === "text" &&
        request.to === "+5511900000000",
    );
    const alertRequest = ycloudBodies.find(
      (request) =>
        request.type === "template" &&
        request.to === process.env.WHATSAPP_ALERT_NUMBER,
    );
    assert.ok(patientRequest);
    assert.ok(alertRequest);
    assert.equal(patientRequest.type, "text");
    assert.match(patientRequest.text.body, /equipe/i);
    assert.match(patientRequest.text.body, /retorno pela manhã/i);
    assert.equal((patientRequest.text.body.match(/\?/g) || []).length, 0);
    assert.doesNotMatch(patientRequest.text.body, /R\$/);
    assert.doesNotMatch(patientRequest.text.body, /confirmação humana/i);
    const alertText = alertRequest.template.components[0].parameters
      .map((parameter) => parameter.text)
      .join("\n");
    assert.match(alertText, /PREÇO CIRÚRGICO — REVISAR/);
    assert.match(alertText, /blefaroplastia/i);
    assert.match(alertText, /R\$ 18 mil e R\$ 23 mil/i);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
