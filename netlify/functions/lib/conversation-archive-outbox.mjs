import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { extractInboundText } from "./extract-inbound-text.mjs";

const STORE = "liv-whatsapp-text-archive-outbox-v1";
const digest = text => createHash("sha256").update(text).digest("hex");
export const archiveEnabled = env => env.WHATSAPP_CONVERSATION_ARCHIVE_ENABLED === "true" && (!env.CONTEXT || env.CONTEXT === "production");
const store = getStoreImpl => getStoreImpl({ name: STORE, consistency: "strong" });
export function archiveFileDigest(entry) {
  return digest(JSON.stringify({ kind: "backup_metadata", schemaVersion: 2, revision: entry.revision,
    mediaFilesIncluded: false, authority: "read_only_projection" }) + "\n" + JSON.stringify(entry.record) + "\n");
}

// Only explicitly selected text/metadata cross this boundary. No media URL,
// token, binary, provider payload or CRM mutation belongs in the archive.
export function archiveRecord(value) {
  if (!/^\+?\d{8,15}$/.test(value?.phone || "") || !value?.eventId) return null;
  const string = (key, limit) => String(value[key] || "").slice(0, limit);
  return { schemaVersion: 2, phone: string("phone", 20), eventId: string("eventId", 200),
    messageId: string("messageId", 500), externalId: string("externalId", 200), providerMessageId: string("providerMessageId", 200),
    direction: value.direction === "OUT" ? "OUT" : "IN",
    author: ["patient", "human", "bruna", "clinic_unspecified"].includes(value.author) ? value.author : "clinic_unspecified",
    at: string("at", 40), text: string("text", 32768), messageType: string("messageType", 40),
    relatedMessageId: string("relatedMessageId", 500), source: string("source", 80),
    transcription: ["automatic", "uncertain", "unavailable"].includes(value.transcription) ? value.transcription : null,
    deliveryState: string("deliveryState", 40), textTruncated: String(value.text || "").length > 32768 };
}

export function archiveRecordFromEnvelope(payload) {
  const inbound = payload?.type === "whatsapp.inbound_message.received";
  const human = payload?.type === "whatsapp.smb.message.echoes";
  const status = payload?.type === "whatsapp.message.updated";
  if (!inbound && !human && !status) return null;
  const message = (inbound ? payload.whatsappInboundMessage : payload.whatsappMessage) || {};
  const text = extractInboundText(message) ||
    message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || message.reaction?.emoji || "";
  return archiveRecord({ phone: inbound ? message.from : message.to, eventId: payload.id || message.id || message.wamid,
    messageId: message.wamid || message.id, externalId: message.externalId, providerMessageId: message.id,
    direction: inbound ? "IN" : "OUT",
    author: inbound ? "patient" : human ? "human" : "clinic_unspecified", at: message.sendTime || message.createTime || payload.createTime,
    text, messageType: message.type, relatedMessageId: message.context?.message_id || message.context?.id || message.reaction?.message_id,
    source: payload.type, deliveryState: status ? message.status : "" });
}

// Archive the exact effective body before crossing the provider boundary. A
// lost response keeps that durable prepared entry, explicitly not delivered.
// Archival failure after acceptance must never turn success into a resend.
export async function fetchWithConversationArchive(url, init, { env = process.env, fetchImpl = fetch,
  text, source = "bruna_transport", queueImpl = queueConversationArchive } = {}) {
  if (!archiveEnabled(env)) return fetchImpl(url, init);
  const payload = JSON.parse(init.body);
  const base = { phone: payload.to, eventId: payload.externalId, externalId: payload.externalId, direction: "OUT", author: "bruna",
    text, messageType: payload.type, source, deliveryState: "prepared_not_sent" };
  if (!archiveRecord(base) || !text) throw new Error("archive_outbound_identity_missing");
  const prepared = await queueImpl(base, { env });
  if (!["queued", "duplicate"].includes(prepared.status)) throw new Error("archive_outbound_prepare_failed");
  const response = await fetchImpl(url, init);
  let accepted = {};
  try { accepted = await response.clone().json(); } catch { /* Keep prepared evidence on ambiguous transport. */ }
  try {
    const receipt = await queueImpl({ ...base, messageId: accepted.wamid || accepted.id || "", providerMessageId: accepted.id || "", at: accepted.createTime || "",
      deliveryState: response.ok ? "accepted_not_delivered" : "provider_rejected" }, { env });
    if (!["queued", "duplicate"].includes(receipt.status)) throw new Error("archive_status_pending");
  } catch {
    // Provider acceptance remains acceptance. The prepared text is durable and
    // provider status webhooks can enrich it; never request a patient resend.
    console.warn(JSON.stringify({ source: "conversation_archive", reason: "outbound_status_pending" }));
  }
  return response;
}

export async function queueConversationArchive(value, { env = process.env, getStoreImpl = getStore, now = Date.now() } = {}) {
  if (!archiveEnabled(env)) return { status: "disabled" };
  const record = archiveRecord(value);
  if (!record) return { status: "skipped" };
  const start = Date.parse(env.WHATSAPP_CONVERSATION_ARCHIVE_START_AT);
  if (!Number.isFinite(start) || now < start) return { status: "failed", errorCode: "archive_start_invalid" };
  // Identical retries share a key; enrichment creates a new immutable revision
  // with the same message/event identity, never overwriting earlier evidence.
  const revision = digest(JSON.stringify(record));
  try {
    const storage = store(getStoreImpl);
    if (await storage.get("done/" + revision, { type: "json" })) return { status: "duplicate" };
    const written = await storage.setJSON("pending/" + revision,
      { revision, record, receivedAt: new Date(now).toISOString() }, { onlyIfNew: true });
    return { status: written.modified ? "queued" : "duplicate" };
  } catch { return { status: "failed", errorCode: "archive_storage_unavailable" }; }
}

export async function exportConversationArchive({ env = process.env, getStoreImpl = getStore, callSheetsImpl } = {}) {
  if (!archiveEnabled(env)) return { status: "disabled", rows: 0 };
  if (!Number.isFinite(Date.parse(env.WHATSAPP_CONVERSATION_ARCHIVE_START_AT))) return { status: "failed", errorCode: "archive_start_missing", rows: 0 };
  try {
    const storage = store(getStoreImpl), entries = [];
    // A bounded batch of immutable files avoids shifting batch boundaries when
    // an acknowledgement is lost and another message arrives in the meantime.
    for await (const page of storage.list({ prefix: "pending/", paginate: true })) {
      for (const item of page.blobs || []) {
        const entry = await storage.get(item.key, { type: "json" });
        if (!entry) continue;
        if (await storage.get("done/" + entry.revision, { type: "json" })) { await storage.delete(item.key); continue; }
        entries.push(entry);
        if (entries.length === 3) break;
      }
      if (entries.length === 3) break;
    }
    const result = await callSheetsImpl("archive_conversations", { archive: { startAt: env.WHATSAPP_CONVERSATION_ARCHIVE_START_AT, entries } }, { env, timeoutMs: 20000 });
    if (result.status !== "completed") return { status: "failed", errorCode: result.errorCode, rows: 0 };
    const receipts = result.data.receipts || [];
    if (receipts.length !== entries.length || entries.some(entry => !receipts.some(r => r.revision === entry.revision && r.sha256 === archiveFileDigest(entry) && r.fileId))) {
      return { status: "failed", errorCode: "archive_receipt_mismatch", rows: 0 };
    }
    for (const receipt of receipts) {
      await storage.setJSON("done/" + receipt.revision, receipt, { onlyIfNew: true });
      await storage.delete("pending/" + receipt.revision);
    }
    return { status: entries.length ? "archived" : "caught_up", rows: entries.length, receipts };
  } catch { return { status: "failed", errorCode: "archive_export_unavailable", rows: 0 }; }
}
