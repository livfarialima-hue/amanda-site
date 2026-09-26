import assert from "node:assert/strict";
import test from "node:test";

test("unavailable text keeps a distinct marker while ordinary media stays media", async () => {
  const result = await getDurableConversationContext({phone: "+5511900000081"}, {
    callSheetsImpl: async () => ({status: "completed", data: {turns: [
      {role: "user", source: "patient", text: "", messageType: "unsupported"},
      {role: "user", source: "patient", text: "", messageType: "text"},
      {role: "user", source: "patient", text: "", messageType: "image"},
      {role: "user", source: "patient", text: "lifting cervical", messageType: "text"},
    ]}}),
  });
  assert.equal(result.turns[0].text, "[Mensagem de texto indisponível na integração.]");
  assert.equal(result.turns[1].text, result.turns[0].text);
  assert.notEqual(result.turns[2].text, result.turns[0].text);
  assert.equal(result.turns[3].text, "lifting cervical");
});
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

test("accepted receipt restores the delivered turn before retrying the ledger, without rewriting its timestamp", async () => {
  const fake = receiptStore(); const restored = []; const sequence = [];
  const turn = { phone: "+5511900000000", eventId: "synthetic-memory-repair:bruna", text: "Posso explicar a consulta.", at: new Date().toISOString() };
  const receipt = await prepareConversationLedgerReceipt(turn, fake);
  const deps = { ...fake, appendImpl: async value => { restored.push(value); sequence.push("memory"); }, recordImpl: async () => { sequence.push("ledger"); return { status: "completed" }; } };
  await reconcileConversationLedgerReceipts(deps);
  assert.equal(restored.length, 0);
  await markConversationLedgerAccepted(receipt, fake);
  await reconcileConversationLedgerReceipts(deps);
  await reconcileConversationLedgerReceipts(deps);
  assert.deepEqual(sequence, ["memory", "ledger"]);
  assert.equal(restored[0].at, turn.at);
  assert.equal(restored[0].text, turn.text);
  assert.equal(restored[0].source, "bruna");
});

test("old accepted receipts reach the ledger without reviving expired memory", async () => {
  const fake = receiptStore(); let cached = 0; let persisted = 0;
  const now = Date.parse("2026-09-17T18:00:00Z");
  const turn = { phone: "+5511900000000", eventId: "synthetic-expired", text: "Informação antiga", at: "2026-09-01T18:00:00Z" };
  const receipt = await prepareConversationLedgerReceipt(turn, { ...fake, now });
  await markConversationLedgerAccepted(receipt, fake);
  await reconcileConversationLedgerReceipts({ ...fake, now, appendImpl: async () => { cached++; }, recordImpl: async () => { persisted++; return { status: "completed" }; } });
  assert.equal(cached, 0);
  assert.equal(persisted, 1);
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

test('only the outbound owner can replace an unattempted prepared receipt; accepted receipts stay closed', async()=>{
 const fake=receiptStore(); const turn={phone:'+5511900000000',eventId:'synthetic-prepared-retry',text:'Como funciona a avaliação?'};
 assert.equal((await prepareConversationLedgerReceipt(turn,fake)).status,'completed');
 assert.equal((await prepareConversationLedgerReceipt(turn,fake)).status,'duplicate');
 assert.equal((await prepareConversationLedgerReceipt(turn,{...fake,canReplacePreparedImpl:async()=>false})).status,'duplicate');
 const replaced=await prepareConversationLedgerReceipt({...turn,text:'A avaliação é individual.'},{...fake,canReplacePreparedImpl:async()=>true});
 assert.equal(replaced.status,'completed');
 await markConversationLedgerAccepted(replaced,fake);
 assert.equal((await prepareConversationLedgerReceipt(turn,{...fake,canReplacePreparedImpl:async()=>true})).status,'duplicate');
});
