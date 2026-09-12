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

test("a delivered YCloud message is durably recorded without patient data", async () => {
  const previousSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const previousContext = process.env.CONTEXT;
  const previousSheetsUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const previousSheetsSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const previousConsoleLog = console.log;
  const previousFetch = globalThis.fetch;
  const secret = "test-webhook-secret";
  const timestamp = "1787011200";
  const body = JSON.stringify({
    id: "evt-observability-test",
    type: "whatsapp.message.updated",
    apiVersion: "v2",
    createTime: "2026-10-01T10:00:00.000Z",
    whatsappMessage: {
      id: "provider-message-id",
      wamid: "wamid-patient-secret",
      from: "+5511961957144",
      to: "+5511999999999",
      status: "delivered",
      type: "template",
      externalId: "liv-appointment-consulta-42-48h",
      template: { name: "lembrete_consulta_liv_v1" },
      pricingCategory: "utility",
      totalPrice: 0.03,
      currency: "BRL",
      regionCode: "BR",
      text: { body: "mensagem privada" },
    },
  });
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const logs = [];

  process.env.YCLOUD_WEBHOOK_SECRET = secret;
  process.env.CONTEXT = "production";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://sheets.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  console.log = (value) => logs.push(String(value));
  let sheetsPayload;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://sheets.test/webhook");
    sheetsPayload = JSON.parse(options.body);
    return new Response(JSON.stringify({
      ok: true,
      inserted: true,
      updated: false,
      duplicate: false,
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
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
    const record = JSON.parse(logs.at(-1));

    assert.equal(response.status, 200);
    assert.equal(responseBody.messageStatusRecorded, true);
    assert.equal(responseBody.inserted, true);
    assert.equal(sheetsPayload.action, "record_ycloud_message_status");
    assert.equal(sheetsPayload.messageStatus.status, "delivered");
    assert.equal(sheetsPayload.messageStatus.totalPrice, 0.03);
    assert.match(
      sheetsPayload.messageStatus.providerMessageKey,
      /^sha256:[a-f0-9]{64}$/,
    );
    const downstream = JSON.stringify(sheetsPayload.messageStatus);
    for (const forbidden of [
      "wamid-patient-secret",
      "+5511961957144",
      "+5511999999999",
      "mensagem privada",
    ]) {
      assert.equal(downstream.includes(forbidden), false);
    }
    assert.equal(record.source, "ycloud_message_status");
    assert.equal(record.reason, "recorded");
    assert.equal(record.eventType, "whatsapp.message.updated");
    assert.equal(JSON.stringify(record).includes("evt-observability-test"), false);
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
    if (previousSheetsUrl === undefined) {
      delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    } else {
      process.env.GOOGLE_SHEETS_WEBHOOK_URL = previousSheetsUrl;
    }
    if (previousSheetsSecret === undefined) {
      delete process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
    } else {
      process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = previousSheetsSecret;
    }
  }
});

test("message status returns 502 when durable cost storage fails", async () => {
  const previous = {
    secret: process.env.YCLOUD_WEBHOOK_SECRET,
    sheetsUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    sheetsSecret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
    fetch: globalThis.fetch,
    log: console.log,
  };
  const secret = "test-durable-failure-secret";
  const timestamp = "1787011201";
  const body = JSON.stringify({
    type: "whatsapp.message.updated",
    whatsappMessage: {
      id: "provider-message-retry",
      from: "+5511961957144",
      status: "delivered",
      totalPrice: 0.03,
      currency: "BRL",
    },
  });
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  process.env.YCLOUD_WEBHOOK_SECRET = secret;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://sheets.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  console.log = () => {};
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: false, error: "busy_retry" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

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
    assert.equal(response.status, 502);
    assert.equal(responseBody.error, "message_status_delivery_failed");
    assert.equal(responseBody.downstreamError, "busy_retry");
  } finally {
    globalThis.fetch = previous.fetch;
    console.log = previous.log;
    for (const [name, value] of [
      ["YCLOUD_WEBHOOK_SECRET", previous.secret],
      ["GOOGLE_SHEETS_WEBHOOK_URL", previous.sheetsUrl],
      ["GOOGLE_SHEETS_WEBHOOK_SECRET", previous.sheetsSecret],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("template quality events are persisted for operational review", async () => {
  const previous = {
    secret: process.env.YCLOUD_WEBHOOK_SECRET,
    sheetsUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    sheetsSecret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
    fetch: globalThis.fetch,
    log: console.log,
  };
  const secret = "test-template-event-secret";
  const timestamp = "1787011202";
  const body = JSON.stringify({
    id: "template-event-1",
    type: "whatsapp.template.quality_updated",
    createTime: "2026-10-01T10:00:00.000Z",
    whatsappTemplate: {
      name: "retomada_manual_bruna_v1",
      language: "pt_BR",
      category: "marketing",
      status: "paused",
      qualityRating: "red",
      reason: "provider free text must not leave Netlify",
    },
  });
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  let sheetsPayload;
  process.env.YCLOUD_WEBHOOK_SECRET = secret;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://sheets.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  console.log = () => {};
  globalThis.fetch = async (_url, options) => {
    sheetsPayload = JSON.parse(options.body);
    return new Response(JSON.stringify({
      ok: true,
      inserted: true,
      duplicate: false,
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
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
    assert.equal(responseBody.templateEventRecorded, true);
    assert.equal(sheetsPayload.action, "record_ycloud_template_event");
    assert.equal(sheetsPayload.templateEvent.actionRequired, true);
    assert.equal(
      JSON.stringify(sheetsPayload).includes("provider free text"),
      false,
    );
  } finally {
    globalThis.fetch = previous.fetch;
    console.log = previous.log;
    for (const [name, value] of [
      ["YCLOUD_WEBHOOK_SECRET", previous.secret],
      ["GOOGLE_SHEETS_WEBHOOK_URL", previous.sheetsUrl],
      ["GOOGLE_SHEETS_WEBHOOK_SECRET", previous.sheetsSecret],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("a clinic sales pitch is ignored before lead, AI, alert, or patient reply", async () => {
  const previousSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const previousContext = process.env.CONTEXT;
  const previousConsoleLog = console.log;
  const previousFetch = globalThis.fetch;
  const secret = "test-commercial-pitch-secret";
  const timestamp = "1788213600";
  const salesPitch = [
    "Bom dia, Bruna, tudo bem? Sou a Daniela, da The Baysse.",
    "Ajudamos clínicas a venderem mais usando apenas os contatos que já têm no WhatsApp, sem investir em anúncios.",
    "Em 2025, geramos R$ 200 mil em vendas para uma cliente com essa estratégia.",
    "Você teria 10 minutos para uma reunião, hoje, para que nosso analista explique como essa ação funciona?",
  ].join(" ");
  const body = JSON.stringify({
    id: "evt-commercial-sales-pitch",
    type: "whatsapp.inbound_message.received",
    whatsappInboundMessage: {
      id: "wamid-commercial-sales-pitch",
      from: "+5511900000002",
      to: "+5511961957144",
      type: "text",
      text: { body: salesPitch },
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
    throw new Error("commercial pitch must not call downstream services");
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
