import assert from "node:assert/strict";
import test from "node:test";
import {
  getDurableConversationContext,
  recordDurableConversationTurn,
  prepareConversationLedgerReceipt,
  markConversationLedgerAccepted,
  reconcileConversationLedgerReceipts,
} from "./conversation-ledger.mjs";

function receiptStore() {
  const data = new Map(); let revision = 0;
  const store = {
    async getWithMetadata(key) { return data.has(key) ? structuredClone(data.get(key)) : null; },
    async setJSON(key, value, options = {}) {
      const old = data.get(key);
      if (options.onlyIfNew && old || options.onlyIfMatch && old?.etag !== options.onlyIfMatch) return { modified: false };
      data.set(key, { data: structuredClone(value), etag: String(++revision) }); return { modified: true };
    },
    async list() { return { blobs: [...data.keys()].map(key => ({ key })) }; },
    async delete(key) { data.delete(key); },
  };
  return { getStoreImpl: () => store, data };
}

test("ledger recovery persists only accepted messages and never invokes WhatsApp", async () => {
  const fake = receiptStore(); const writes = [];
  const turn = { phone: "+5511900000000", eventId: "synthetic:bruna", parentEventId: "synthetic", text: "A consulta custa R$ 500.", professional: "amanda", opportunityId: "op-synthetic" };
  const receipt = await prepareConversationLedgerReceipt(turn, fake);
  assert.equal(receipt.status, "completed");
  const recordImpl = async payload => { writes.push(payload); return { status: "completed" }; };
  await reconcileConversationLedgerReceipts({ ...fake, recordImpl });
  assert.equal(writes.length, 0, "prepared does not prove provider acceptance");
  await markConversationLedgerAccepted(receipt, fake);
  await reconcileConversationLedgerReceipts({ ...fake, recordImpl });
  await reconcileConversationLedgerReceipts({ ...fake, recordImpl });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].parentEventId, "synthetic");
  assert.equal([...fake.data.values()][0].data.turn, undefined, "receipt drops transcript after persistence");
});

test("failed ledger recovery remains pending for idempotent persistence", async () => {
  const fake = receiptStore();
  const receipt = await prepareConversationLedgerReceipt({ phone: "+5511900000000", eventId: "synthetic-2", text: "Informação administrativa" }, fake);
  await markConversationLedgerAccepted(receipt, fake);
  const result = await reconcileConversationLedgerReceipts({ ...fake, recordImpl: async () => ({ status: "failed" }) });
  assert.equal(result.failed, 1);
  assert.equal([...fake.data.values()][0].data.state, "accepted");
});

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
                templateId: "procedure_evaluation_v1",
                at: "2026-08-18T18:01:00.000Z",
              },
            ],
            pendingCommitments: [
              {
                eventId: "price-review-1",
                kind: "procedure_price",
                summary: "Conferir a faixa atual e responder manualmente.",
                owner: "Amanda/equipe",
                createdAt: "2026-08-18T18:01:30.000Z",
                dueAt: "2026-08-18T22:01:30.000Z",
                status: "pending",
                source: "WhatsApp — revisão humana",
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
  assert.equal(result.turns[1].templateId, "procedure_evaluation_v1");
  assert.deepEqual(result.pendingCommitments, [
    {
      eventId: "price-review-1",
      kind: "procedure_price",
      summary: "Conferir a faixa atual e responder manualmente.",
      owner: "Amanda/equipe",
      createdAt: "2026-08-18T18:01:30.000Z",
      dueAt: "2026-08-18T22:01:30.000Z",
      status: "pending",
      source: "WhatsApp — revisão humana",
    },
  ]);
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
    pendingCommitments: [],
  });
});
