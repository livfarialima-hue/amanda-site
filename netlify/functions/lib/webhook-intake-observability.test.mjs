import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { handleYCloudWebhook } from "../ycloud-webhook.mjs";

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
