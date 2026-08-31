import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  extractInboundText,
  handleYCloudWebhook,
} from "../ycloud-webhook.mjs";

test("reads known safe text envelopes before declaring the inbound empty", () => {
  assert.equal(
    extractInboundText({ text: { body: "Mensagem padrão" } }),
    "Mensagem padrão",
  );
  assert.equal(
    extractInboundText({ text: "Mensagem em envelope alternativo" }),
    "Mensagem em envelope alternativo",
  );
  assert.equal(
    extractInboundText({ content: { text: { body: "Mensagem aninhada" } } }),
    "Mensagem aninhada",
  );
  assert.equal(extractInboundText({ text: {} }), "");
  assert.equal(
    extractInboundText({ image: { caption: "Condição especial" } }),
    "Condição especial",
  );
});

test("an unsupported YCloud event is ignored with an observable safe log", async () => {
  const previousSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const previousContext = process.env.CONTEXT;
  const previousConsoleLog = console.log;
  const secret = "test-webhook-secret";
  const timestamp = "1787011200";
  const body = JSON.stringify({
    id: "evt-observability-test",
    type: "whatsapp.message.updated",
    apiVersion: "v2",
  });
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const logs = [];

  process.env.YCLOUD_WEBHOOK_SECRET = secret;
  process.env.CONTEXT = "production";
  console.log = (value) => logs.push(String(value));

  try {
    const response = await handleYCloudWebhook(
      new Request("https://example.test/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body,
      }),
      {},
    );
    const responseBody = await response.json();
    const record = JSON.parse(logs.at(-1));

    assert.equal(response.status, 200);
    assert.equal(responseBody.ignored, true);
    assert.equal(record.source, "ycloud_webhook_intake");
    assert.equal(record.reason, "unsupported_event_type");
    assert.equal(record.eventType, "whatsapp.message.updated");
    assert.equal(record.apiVersion, "v2");
    assert.equal(record.deployMode, "production");
    assert.equal(JSON.stringify(record).includes("evt-observability-test"), false);
  } finally {
    console.log = previousConsoleLog;
    if (previousSecret === undefined) {
      delete process.env.YCLOUD_WEBHOOK_SECRET;
    } else {
      process.env.YCLOUD_WEBHOOK_SECRET = previousSecret;
    }
    if (previousContext === undefined) {
      delete process.env.CONTEXT;
    } else {
      process.env.CONTEXT = previousContext;
    }
  }
});

test("a promotional image caption is ignored before lead, AI, alert, or patient reply", async () => {
  const previousSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const previousContext = process.env.CONTEXT;
  const previousConsoleLog = console.log;
  const previousFetch = globalThis.fetch;
  const secret = "test-promotional-media-secret";
  const timestamp = "1788178500";
  const body = JSON.stringify({
    id: "evt-promotional-media",
    type: "whatsapp.inbound_message.received",
    whatsappInboundMessage: {
      id: "wamid-promotional-media",
      from: "+5511900000001",
      to: "+5511961957144",
      type: "image",
      image: {
        id: "image-promotional-media",
        mimeType: "image/jpeg",
        caption:
          "Somos da Clínica OXY Maia. Agora temos uma Câmara Hiperbárica, com condição especial de inauguração. Quer que eu envie os valores?",
      },
    },
  });
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  let fetchCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = secret;
  process.env.CONTEXT = "production";
  console.log = () => {};
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("promotional media must not call downstream services");
  };

  try {
    const response = await handleYCloudWebhook(
      new Request("https://example.test/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body,
      }),
      {},
    );
    const responseBody = await response.json();

    assert.equal(response.status, 200);
    assert.equal(responseBody.ignored, true);
    assert.equal(
      responseBody.ignoreReason,
      "commercial_solicitation_or_partnership",
    );
    assert.equal(responseBody.leadRecorded, false);
    assert.equal(responseBody.aiShadowQueued, false);
    assert.equal(responseBody.aiActiveQueued, false);
    assert.equal(responseBody.imageAcknowledgementQueued, undefined);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    console.log = previousConsoleLog;
    if (previousSecret === undefined) {
      delete process.env.YCLOUD_WEBHOOK_SECRET;
    } else {
      process.env.YCLOUD_WEBHOOK_SECRET = previousSecret;
    }
    if (previousContext === undefined) {
      delete process.env.CONTEXT;
    } else {
      process.env.CONTEXT = previousContext;
    }
  }
});
