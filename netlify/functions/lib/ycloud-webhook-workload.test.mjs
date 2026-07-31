import assert from "node:assert/strict";
import test from "node:test";
import {
  processDurableYCloudEvent,
} from "../ycloud-webhook-workload.mjs";

function queuedData() {
  const payload = {
    id: "evt-latest",
    type: "whatsapp.inbound_message.received",
    whatsappInboundMessage: {
      id: "msg-latest",
      from: "+5511999999999",
      to: "+5511888888888",
      type: "text",
      customerProfile: { name: "Rosana" },
      text: { body: "Quero saber sobre lifting facial" },
    },
  };

  return {
    rawBody: JSON.stringify(payload),
    signature: "t=1,s=abc",
    contentType: "application/json",
    origin: "https://example.netlify.app",
    eventId: "evt-latest",
    phone: "+5511999999999",
    isTextInbound: true,
  };
}

test("durable workload ignores an inbound event superseded by a newer message", async () => {
  let processorCalls = 0;
  await processDurableYCloudEvent(
    { eventData: queuedData(), attempt: 0 },
    {
      getLatestInboundReplyMarkerImpl: async () => ({
        status: "completed",
        found: true,
        eventId: "evt-newer",
      }),
      processImpl: async () => {
        processorCalls += 1;
        return new Response("{}");
      },
    },
  );

  assert.equal(processorCalls, 0);
});

test("durable workload reconstructs and awaits the internal processor request", async () => {
  let receivedRequest;
  await processDurableYCloudEvent(
    { eventData: queuedData(), attempt: 0 },
    {
      getLatestInboundReplyMarkerImpl: async () => ({
        status: "completed",
        found: true,
        eventId: "evt-latest",
      }),
      processImpl: async (request) => {
        receivedRequest = request;
        return new Response(
          JSON.stringify({ aiActiveStatus: "completed" }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(
    receivedRequest.url,
    "https://example.netlify.app/api/ycloud/webhook-processor",
  );
  assert.equal(receivedRequest.headers.get("X-LIV-Durable-Retry"), "0");
  assert.equal(receivedRequest.headers.get("YCloud-Signature"), "t=1,s=abc");
});

test("durable workload requests a retry when active reply processing fails", async () => {
  await assert.rejects(
    () =>
      processDurableYCloudEvent(
        { eventData: queuedData(), attempt: 1 },
        {
          getLatestInboundReplyMarkerImpl: async () => ({
            status: "completed",
            found: true,
            eventId: "evt-latest",
          }),
          processImpl: async () =>
            new Response(
              JSON.stringify({ aiActiveStatus: "failed" }),
              { status: 200 },
            ),
        },
      ),
    /ycloud_active_reply_failed/,
  );
});

test("durable workload alerts the team with a suggested greeting after final failure", async () => {
  const alerts = [];
  await assert.rejects(
    () =>
      processDurableYCloudEvent(
        { eventData: queuedData(), attempt: 4 },
        {
          getLatestInboundReplyMarkerImpl: async () => ({
            status: "completed",
            found: true,
            eventId: "evt-latest",
          }),
          processImpl: async () =>
            new Response("unavailable", { status: 503 }),
          sendYCloudReviewAlertImpl: async (input) => {
            alerts.push(input);
            return { status: "completed" };
          },
        },
      ),
    /ycloud_processor_http_503/,
  );

  assert.equal(alerts.length, 1);
  assert.match(alerts[0].messageText, /Sugestão para copiar:/i);
  assert.match(alerts[0].messageText, /Olá, Rosana!/i);
});
