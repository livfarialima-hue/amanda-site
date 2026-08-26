import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import webhook from "../ycloud-webhook.mjs";

test("a text event with an omitted body receives one safe clarification", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_HUMAN_REPLY_GUARD_MS",
    "WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS",
    "WHATSAPP_ALERT_NUMBER",
    "OPENAI_API_KEY",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];

  process.env.YCLOUD_WEBHOOK_SECRET = "missing-text-secret";
  process.env.YCLOUD_API_KEY = "ycloud-key";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL =
    "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  process.env.WHATSAPP_AUTOMATION_MODE = "active";
  process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS = "0";
  process.env.WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS = "0";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.OPENAI_API_KEY;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const requestBody = JSON.parse(options.body);
      if (requestBody.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }),
          { status: 200 },
        );
      }

      return new Response('{"ok":true}', { status: 200 });
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const payload = {
      id: "evt-missing-text-real-shape",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-08-19T23:50:31.000Z",
      whatsappInboundMessage: {
        id: "provider-message-without-body",
        wamid: "wamid.missing-text-real-shape",
        from: "+5511900000099",
        to: "+5511961957144",
        sendTime: "2026-08-19T23:50:31.000Z",
        type: "text",
        text: {},
        customerProfile: { name: "Paciente Teste" },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = "1787183431";
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
          "content-type": "application/json",
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
    );
    const responseBody = await response.json();
    const patientMessages = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((body) => body.to === payload.whatsappInboundMessage.from);

    assert.equal(response.status, 200);
    assert.equal(responseBody.leadRouted, false);
    assert.equal(responseBody.automation.route, "human_review");
    assert.equal(responseBody.missingInboundText, true);
    assert.equal(responseBody.missingTextClarificationQueued, true);
    assert.equal(responseBody.missingTextClarificationSent, true);
    assert.equal(patientMessages.length, 1);
    assert.match(
      patientMessages[0].text.body,
      /Eu sou a Bruna, concierge da Clínica LIV Faria Lima/i,
    );
    assert.match(
      patientMessages[0].text.body,
      /primeira mensagem não carregou para mim/i,
    );
    assert.match(
      patientMessages[0].text.body,
      /reenviar sua dúvida em uma frase/i,
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

test("an unsupported inbound event receives one safe clarification without inferred routing", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_HUMAN_REPLY_GUARD_MS",
    "WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS",
    "WHATSAPP_ALERT_NUMBER",
    "OPENAI_API_KEY",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const operationalLogs = [];

  process.env.YCLOUD_WEBHOOK_SECRET = "unsupported-event-secret";
  process.env.YCLOUD_API_KEY = "ycloud-key";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL =
    "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  process.env.WHATSAPP_AUTOMATION_MODE = "active";
  process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS = "0";
  process.env.WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS = "0";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.OPENAI_API_KEY;
  console.log = (line) => operationalLogs.push(String(line));
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const requestBody = JSON.parse(options.body);
      if (requestBody.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }),
          { status: 200 },
        );
      }

      return new Response('{"ok":true}', { status: 200 });
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const payload = {
      id: "evt-unsupported-content",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-08-22T18:08:56.000Z",
      whatsappInboundMessage: {
        id: "provider-message-unsupported",
        wamid: "wamid.unsupported-content",
        from: "+5511900000098",
        to: "+5511961957144",
        sendTime: "2026-08-22T18:08:56.000Z",
        type: "unsupported",
        unsupported: {},
        errors: [
          {
            code: 131060,
            title: "Synthetic provider error",
            message: "Synthetic content that must not appear in logs",
          },
        ],
        customerProfile: { name: "Rosana" },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = "1787422136";
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
          "content-type": "application/json",
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
    );
    const responseBody = await response.json();
    const patientMessages = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((body) => body.to === payload.whatsappInboundMessage.from);
    const processingLog = operationalLogs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .find((entry) => entry?.category === "inbound_processing");

    assert.equal(response.status, 200);
    assert.equal(responseBody.leadRouted, false);
    assert.equal(responseBody.automation.route, "human_review");
    assert.equal(responseBody.missingInboundText, false);
    assert.equal(responseBody.unsupportedInboundContent, true);
    assert.equal(responseBody.unavailableInboundContent, true);
    assert.equal(responseBody.missingTextClarificationQueued, true);
    assert.equal(responseBody.missingTextClarificationSent, true);
    assert.equal(patientMessages.length, 1);
    assert.equal(
      patientMessages[0].text.body,
      "Olá, Rosana! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. " +
        "Sua primeira mensagem não carregou para mim. " +
        "Pode me reenviar sua dúvida em uma frase? " +
        "Assim já consigo te orientar por aqui.",
    );
    assert.equal(
      (patientMessages[0].text.body.match(/\?/g) || []).length,
      1,
    );
    assert.doesNotMatch(
      patientMessages[0].text.body,
      /lifting|procedimento|M26|131060/i,
    );
    assert.equal(processingLog?.inboundAvailability, "upstream_unsupported");
    assert.equal(processingLog?.unsupportedSubtype, "unknown");
    assert.deepEqual(processingLog?.unsupportedErrorCodes, ["131060"]);
    assert.doesNotMatch(
      JSON.stringify(processingLog),
      /Synthetic provider error|Synthetic content|Rosana/i,
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
