import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  DEFAULT_DURABLE_DELAY_MS,
  DURABLE_YCLOUD_EVENT,
  dispatchYCloudWebhook,
} from "../ycloud-webhook-dispatch.mjs";

const SECRET = "dispatch-test-secret";

function signedRequest(payload, { signature = null } = {}) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1785500000";
  const digest = createHmac("sha256", SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return new Request("https://example.netlify.app/api/ycloud/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "YCloud-Signature": signature || `t=${timestamp},s=${digest}`,
    },
    body: rawBody,
  });
}

function inboundPayload(overrides = {}) {
  return {
    id: "evt-1",
    type: "whatsapp.inbound_message.received",
    createTime: "2026-07-31T17:00:00.000Z",
    whatsappInboundMessage: {
      id: "msg-1",
      from: "+5511999999999",
      to: "+5511888888888",
      type: "text",
      text: { body: "Gostaria de saber mais sobre lifting facial" },
      ...overrides,
    },
  };
}

test("durable dispatcher rejects an invalid YCloud signature", async () => {
  let queueCalls = 0;
  const response = await dispatchYCloudWebhook(
    signedRequest(inboundPayload(), { signature: "t=1,s=00" }),
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      sendEventImpl: async () => {
        queueCalls += 1;
      },
    },
  );

  assert.equal(response.status, 401);
  assert.equal(queueCalls, 0);
});

test("durable dispatcher records text context and queues it immediately", async () => {
  const calls = { marker: [], memory: [], queue: [] };
  const now = Date.parse("2026-07-31T17:00:00.000Z");
  const response = await dispatchYCloudWebhook(signedRequest(inboundPayload()), {
    env: { YCLOUD_WEBHOOK_SECRET: SECRET },
    now,
    markLatestInboundForReplyImpl: async (input) => {
      calls.marker.push(input);
      return { status: "completed" };
    },
    appendConversationTurnImpl: async (input) => {
      calls.memory.push(input);
      return { status: "completed" };
    },
    sendEventImpl: async (...args) => {
      calls.queue.push(args);
      return { sendStatus: "succeeded", eventId: "queue-1" };
    },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.queued, true);
  assert.equal(body.delayMs, DEFAULT_DURABLE_DELAY_MS);
  assert.deepEqual(calls.marker, [
    { phone: "+5511999999999", eventId: "evt-1" },
  ]);
  assert.equal(calls.memory.length, 1);
  assert.equal(calls.memory[0].text, "Gostaria de saber mais sobre lifting facial");
  assert.equal(calls.queue.length, 1);
  assert.equal(calls.queue[0][0], DURABLE_YCLOUD_EVENT);
  assert.equal(calls.queue[0][1].delayUntil, undefined);
  assert.equal(calls.queue[0][1].data.isTextInbound, true);
});

test("durable dispatcher queues non-text events immediately", async () => {
  let options;
  const response = await dispatchYCloudWebhook(
    signedRequest(inboundPayload({ type: "image", text: undefined })),
    {
      env: { YCLOUD_WEBHOOK_SECRET: SECRET },
      markLatestInboundForReplyImpl: async () => {
        throw new Error("must not mark a non-text event");
      },
      appendConversationTurnImpl: async () => {
        throw new Error("must not append a non-text event");
      },
      sendEventImpl: async (_eventName, receivedOptions) => {
        options = receivedOptions;
        return { sendStatus: "succeeded", eventId: "queue-2" };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(options.delayUntil, undefined);
  assert.equal(options.priority, 40);
});

test("durable dispatcher fails closed when the queue does not acknowledge", async () => {
  const response = await dispatchYCloudWebhook(signedRequest(inboundPayload()), {
    env: { YCLOUD_WEBHOOK_SECRET: SECRET },
    markLatestInboundForReplyImpl: async () => ({ status: "completed" }),
    appendConversationTurnImpl: async () => ({ status: "completed" }),
    sendEventImpl: async () => ({ sendStatus: "failed", eventId: "" }),
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    received: false,
    error: "durable_queue_failed",
  });
});

test("durable dispatcher health exposes the active processing mode", async () => {
  const response = await dispatchYCloudWebhook(
    new Request("https://example.netlify.app/api/ycloud/webhook"),
    {
      env: {
        YCLOUD_WEBHOOK_SECRET: SECRET,
        AWL_API_KEY_P100: "configured",
      },
    },
  );
  const body = await response.json();

  assert.equal(body.processingMode, "durable_async_workload");
  assert.equal(body.asyncWorkloadsConfigured, true);
  assert.equal(body.initialQueueDelayMs, 0);
});
