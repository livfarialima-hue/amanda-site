import test from "node:test";
import assert from "node:assert/strict";
import { archiveRecordFromEnvelope, archiveFileDigest, queueConversationArchive, exportConversationArchive, fetchWithConversationArchive } from "./conversation-archive-outbox.mjs";
import { handleYCloudWebhook } from "../ycloud-webhook.mjs";
import { createHmac } from "node:crypto";
const env = { WHATSAPP_CONVERSATION_ARCHIVE_ENABLED: "true", WHATSAPP_CONVERSATION_ARCHIVE_START_AT: "2026-10-13T23:25:00.000Z" };
export function fakeArchiveStore() {
  const data = new Map();
  return { data, getStoreImpl: () => ({ get: async key => data.get(key) || null,
    setJSON: async (key, value, { onlyIfNew } = {}) => { if (onlyIfNew && data.has(key)) return { modified: false }; data.set(key, structuredClone(value)); return { modified: true }; },
    delete: async key => data.delete(key), list: async function* () { yield { blobs: [...data.keys()].filter(k => k.startsWith("pending/")).map(key => ({ key })) }; } }) };
}
const envelope = { id: "synthetic-archive", type: "whatsapp.inbound_message.received", createTime: "2026-10-14T00:00:00Z",
  whatsappInboundMessage: { from: "+5511900000000", to: "+5511900000001", wamid: "synthetic-message", type: "audio",
    audio: { link: "https://private.invalid/audio?secret=secret", data: "binary-secret" } } };

test("quoted replies retain the provider message identity without copying media", () => {
  const record = archiveRecordFromEnvelope({ ...envelope, whatsappInboundMessage: {
    ...envelope.whatsappInboundMessage, type: "text", text: { body: "É esse horário" }, context: { message_id: "quoted-slot" }
  } });
  assert.equal(record.relatedMessageId, "quoted-slot");
  assert.equal(record.text, "É esse horário");
});

test("outbound archive records prepared text before transport and preserves provider acceptance after receipt failure", async () => {
  const payload = { to: "+5511900000000", externalId: "synthetic-template", type: "template" };
  for (const failAfterAcceptance of [false, true]) {
    const steps = [], records = [];
    const response = await fetchWithConversationArchive("https://synthetic.invalid", { body: JSON.stringify(payload) }, {
      env, text: "Lembrete de consulta", source: "appointment_reminder_template",
      queueImpl: async record => {
        steps.push(record.deliveryState); records.push(record);
        if (failAfterAcceptance && records.length === 2) throw new Error("storage unavailable");
        return { status: "queued" };
      },
      fetchImpl: async () => { steps.push("provider"); return Response.json({ id: "accepted-id", wamid: "provider-id" }); }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(steps, ["prepared_not_sent", "provider", "accepted_not_delivered"]);
    assert.equal(records[0].text, "Lembrete de consulta");
    assert.equal(records[1].messageId, "provider-id");
    assert.equal((await response.json()).id, "accepted-id");
    const delivered = archiveRecordFromEnvelope({ id: "status-event", type: "whatsapp.message.updated", whatsappMessage: {
      ...payload, id: "accepted-id", wamid: "provider-id", status: "delivered"
    } });
    assert.equal(delivered.externalId, records[0].externalId);
    assert.equal(delivered.providerMessageId, records[1].providerMessageId);
    assert.equal(delivered.messageId, records[1].messageId);
    assert.equal(delivered.deliveryState, "delivered");
  }
});

test("outbound transport stays untouched when backup preparation fails", async () => {
  await assert.rejects(fetchWithConversationArchive("https://synthetic.invalid", {
    body: JSON.stringify({ to: "+5511900000000", externalId: "synthetic", type: "text" })
  }, { env, text: "Texto", queueImpl: async () => ({ status: "failed" }), fetchImpl: async () => assert.fail("must not send") }), /prepare_failed/);
});

test("text-only snapshot excludes provider payload and preserves immutable enrichment", async () => {
  const h = fakeArchiveStore(), options = { env, getStoreImpl: h.getStoreImpl, now: Date.parse(envelope.createTime) };
  const raw = archiveRecordFromEnvelope(envelope);
  assert.equal((await queueConversationArchive(raw, options)).status, "queued");
  assert.equal((await queueConversationArchive(raw, options)).status, "duplicate");
  assert.equal((await queueConversationArchive({ ...raw, text: "Qual o endereço?", transcription: "automatic" }, options)).status, "queued");
  assert.equal(h.data.size, 2); assert.doesNotMatch(JSON.stringify([...h.data.values()]), /private.invalid|secret|binary/);
  assert.equal(new Set([...h.data.values()].map(e => e.record.eventId)).size, 1);
});

test("Drive failures retain text and a valid readback receipt acknowledges only exact revisions", async () => {
  const h = fakeArchiveStore(), options = { env, getStoreImpl: h.getStoreImpl };
  const raw = archiveRecordFromEnvelope(envelope);
  await queueConversationArchive(raw, options);
  const bad = await exportConversationArchive({ ...options, callSheetsImpl: async () => ({ status: "completed", data: { receipts: [] } }) });
  assert.equal(bad.status, "failed"); assert.equal(h.data.size, 1);
  const result = await exportConversationArchive({ ...options, callSheetsImpl: async (action, payload) => {
    assert.equal(action, "archive_conversations"); return { status: "completed", data: { receipts: payload.archive.entries.map(e => ({ revision: e.revision, fileId: "synthetic", sha256: archiveFileDigest(e) })) } }; } });
  assert.equal(result.rows, 1); assert.ok([...h.data.keys()].every(k => k.startsWith("done/")));
  assert.equal((await queueConversationArchive(raw, options)).status, "duplicate");
  await queueConversationArchive({ ...raw, text: "Recuperado depois do backup" }, options);
  assert.equal([...h.data.keys()].filter(k => k.startsWith("pending/")).length, 1);
});

test("disabled and preview contexts never touch production archive storage", async () => {
  const getStoreImpl = () => assert.fail("must not open shared storage");
  for (const e of [{}, { ...env, CONTEXT: "deploy-preview" }]) {
    assert.equal((await queueConversationArchive(archiveRecordFromEnvelope(envelope), { env: e, getStoreImpl })).status, "disabled");
    assert.equal((await exportConversationArchive({ env: e, getStoreImpl })).status, "disabled");
  }
});

test("authenticated reactions are captured before business filtering; unsigned requests never archive", async () => {
  const old = process.env.YCLOUD_WEBHOOK_SECRET;
  process.env.YCLOUD_WEBHOOK_SECRET = "synthetic-archive-secret";
  try {
    const raw = JSON.stringify({ ...envelope, whatsappInboundMessage: { ...envelope.whatsappInboundMessage, type: "reaction", reaction: { emoji: "👍", message_id: "reply-id" } } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", process.env.YCLOUD_WEBHOOK_SECRET).update(timestamp + "." + raw).digest("hex");
    const captured = [];
    const deps = { queueConversationArchiveImpl: async record => { captured.push(record); return { status: "queued" }; } };
    const unauthorized = await handleYCloudWebhook(new Request("https://synthetic.invalid", { method: "POST", body: raw }), {}, deps);
    assert.equal(unauthorized.status, 401); assert.equal(captured.length, 0);
    const response = await handleYCloudWebhook(new Request("https://synthetic.invalid", { method: "POST", body: raw, headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` } }), {}, deps);
    assert.equal(response.status, 200); assert.equal(captured.length, 1); assert.equal(captured[0].text, "👍");
  } finally { if (old === undefined) delete process.env.YCLOUD_WEBHOOK_SECRET; else process.env.YCLOUD_WEBHOOK_SECRET = old; }
});
