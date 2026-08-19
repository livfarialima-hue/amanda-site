import assert from "node:assert/strict";
import test from "node:test";
import {
  getDurableConversationContext,
  recordDurableConversationTurn,
} from "./conversation-ledger.mjs";

test("durable history preserves role, authorship and bounded identity", async () => {
  let request;
  const result = await getDurableConversationContext(
    {
      phone: "+5511900000000",
      opportunityId: "opp-test",
      professional: "amanda",
    },
    {
      callSheetsImpl: async (action, payload) => {
        request = { action, payload };
        return {
          status: "completed",
          data: {
            ok: true,
            opportunityId: "opp-test",
            professional: "amanda",
            turns: [
              {
                role: "assistant",
                source: "human",
                text: "Posso te explicar como funciona a consulta.",
                eventId: "human-1",
                at: "2026-08-18T18:00:00.000Z",
              },
              {
                role: "user",
                source: "patient",
                text: "Sim",
                eventId: "patient-1",
                at: "2026-08-18T18:01:00.000Z",
              },
            ],
          },
        };
      },
    },
  );

  assert.equal(request.action, "get_conversation_context");
  assert.equal(request.payload.conversation.opportunityId, "opp-test");
  assert.equal(result.status, "completed");
  assert.deepEqual(result.turns.map((turn) => turn.source), ["human", "patient"]);
  assert.deepEqual(result.turns.map((turn) => turn.eventId), ["human-1", "patient-1"]);
});

test("automatic replies are written to the canonical conversation ledger", async () => {
  let request;
  const result = await recordDurableConversationTurn(
    {
      phone: "+5511900000000",
      eventId: "event-1",
      text: "Na consulta, a Dra. Amanda entende seus objetivos.",
      source: "bruna",
      opportunityId: "opp-test",
      professional: "amanda",
    },
    {
      callSheetsImpl: async (action, payload) => {
        request = { action, payload };
        return { status: "completed", data: { ok: true, duplicate: false } };
      },
    },
  );

  assert.equal(request.action, "record_conversation_turn");
  assert.equal(request.payload.conversation.messageId, "bruna:event-1");
  assert.equal(request.payload.conversation.source, "bruna");
  assert.equal(result.status, "completed");
});

test("ledger outages fail closed for hydration without exposing text", async () => {
  const result = await getDurableConversationContext(
    { phone: "+5511900000000" },
    {
      callSheetsImpl: async () => ({
        status: "failed",
        errorCode: "timeout",
      }),
    },
  );

  assert.deepEqual(result, {
    status: "failed",
    errorCode: "timeout",
    turns: [],
  });
});
