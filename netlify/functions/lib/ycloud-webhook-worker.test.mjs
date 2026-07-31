import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { queueYCloudWebhookWorker } from "../ycloud-webhook-worker.mjs";

const SECRET = "worker-test-secret";

function signedRequest(body, signatureSecret = SECRET) {
  const timestamp = "1785520800";
  const signature = createHmac("sha256", signatureSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return new Request(
    "https://draamandaschroeder.com.br/api/ycloud/webhook-worker",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "YCloud-Signature": `t=${timestamp},s=${signature}`,
      },
      body,
    },
  );
}

test("worker acknowledges immediately and keeps processing with waitUntil", async () => {
  const body = JSON.stringify({ id: "evt-worker-test" });
  const pending = [];
  let processedBody = null;

  const response = await queueYCloudWebhookWorker(
    signedRequest(body),
    {
      waitUntil: (promise) => pending.push(promise),
    },
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      processImpl: async (request) => {
        processedBody = await request.text();
        return new Response(JSON.stringify({ received: true }));
      },
    },
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    received: true,
    processing: true,
  });
  assert.equal(pending.length, 1);

  await pending[0];
  assert.equal(processedBody, body);
});

test("worker rejects an invalid signature before scheduling", async () => {
  const pending = [];
  let called = false;
  const response = await queueYCloudWebhookWorker(
    signedRequest("{}", "wrong-secret"),
    {
      waitUntil: (promise) => pending.push(promise),
    },
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      processImpl: async () => {
        called = true;
        return new Response(null, { status: 200 });
      },
    },
  );

  assert.equal(response.status, 401);
  assert.equal(pending.length, 0);
  assert.equal(called, false);
});

test("worker remains directly testable without a Netlify context", async () => {
  const response = await queueYCloudWebhookWorker(
    signedRequest("{}"),
    {},
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      processImpl: async () =>
        new Response(JSON.stringify({ completed: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { completed: true });
});
