import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import dispatchYCloudWebhook, {
  config as dispatchConfig,
} from "../ycloud-webhook-dispatch.mjs";
import { config as workerConfig } from "../ycloud-webhook.mjs";

const SECRET = "webhook-test-secret";

function signedRequest(body, {
  url = "https://draamandaschroeder.com.br/api/ycloud/webhook",
  secret = SECRET,
} = {}) {
  const timestamp = "1785517200";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "YCloud-Signature": `t=${timestamp},s=${signature}`,
    },
    body,
  });
}

test("production webhook remains synchronous while the worker is background", () => {
  assert.deepEqual(dispatchConfig, {
    path: "/api/ycloud/webhook",
  });
  assert.deepEqual(workerConfig, {
    path: "/api/ycloud/webhook-worker",
    background: true,
  });
});

test("dispatcher validates the signature before queueing the background worker", async () => {
  let called = false;
  const response = await dispatchYCloudWebhook(
    new Request("https://example.test/api/ycloud/webhook", {
      method: "POST",
      headers: { "YCloud-Signature": "t=1,s=00" },
      body: "{}",
    }),
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      fetchImpl: async () => {
        called = true;
        return new Response(null, { status: 202 });
      },
    },
  );

  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("dispatcher queues the exact signed event in the background", async () => {
  const body = JSON.stringify({
    id: "evt-background-test",
    type: "whatsapp.inbound_message.received",
  });
  const calls = [];
  const response = await dispatchYCloudWebhook(
    signedRequest(body),
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(null, { status: 202 });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    received: true,
    queued: true,
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://draamandaschroeder.com.br/api/ycloud/webhook-worker",
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body, body);
  assert.match(
    calls[0].options.headers["YCloud-Signature"],
    /^t=1785517200,s=[a-f0-9]{64}$/,
  );
});

test("dispatcher asks YCloud to retry when the worker cannot be queued", async () => {
  const response = await dispatchYCloudWebhook(
    signedRequest("{}"),
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      fetchImpl: async () => new Response(null, { status: 503 }),
    },
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    received: false,
    error: "background_dispatch_rejected",
    workerStatus: 503,
  });
});

test("health endpoint exposes that processing is background", async () => {
  const response = await dispatchYCloudWebhook(
    new Request("https://example.test/api/ycloud/webhook"),
    {
      env: {
        YCLOUD_WEBHOOK_SECRET: SECRET,
        YCLOUD_API_KEY: "key",
        OPENAI_API_KEY: "openai",
        GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test",
        GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-secret",
        WHATSAPP_AUTOMATION_MODE: "active",
      },
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.signatureProtection, "active");
  assert.equal(body.automationMode, "active");
  assert.equal(body.processingMode, "background");
});
