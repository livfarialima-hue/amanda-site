import { callClassificationSheets } from "./sheets-classification-client.mjs";
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { appendConversationTurn, conversationTurnWithinMemoryWindow } from "./conversation-memory.mjs";

const MAX_TURNS = 32;
const MAX_TEXT_LENGTH = 1_600;
const RECEIPT_STORE = "liv-whatsapp-conversation-ledger-receipts-v1";

function ledgerReceiptStore(getStoreImpl) {
  return getStoreImpl({ name: RECEIPT_STORE, consistency: "strong" });
}

export async function prepareConversationLedgerReceipt(turn, { getStoreImpl = getStore, now = Date.now() } = {}) {
  if (!turn?.phone || !turn?.eventId || !turn?.text) return { status: "failed", errorCode: "invalid_ledger_receipt" };
  const key = "pending/" + createHash("sha256").update(`${turn.phone}|${turn.eventId}`).digest("hex");
  try {
    const storage = ledgerReceiptStore(getStoreImpl);
    const done = await storage.getWithMetadata(key.replace("pending/", "done/"), { type: "json", consistency: "strong" });
    if (done?.data?.state === "persisted") return { status: "duplicate", key, state: "persisted" };
    const existing = await storage.getWithMetadata(key, { type: "json", consistency: "strong" });
    if (existing?.data) return { status: "duplicate", key, state: existing.data.state };
    const write = await storage.setJSON(key, { state: "prepared", turn: {
      phone: boundedText(turn.phone, 20), eventId: boundedText(turn.eventId, 200),
      parentEventId: boundedText(turn.parentEventId, 200), messageId: boundedText(turn.messageId, 500),
      text: boundedText(turn.text, 4000), source: "bruna", at: turn.at || new Date(now).toISOString(),
      opportunityId: boundedText(turn.opportunityId, 120), professional: boundedText(turn.professional, 80),
    }, createdAt: new Date(now).toISOString() }, { onlyIfNew: true });
    return { status: write.modified ? "completed" : "duplicate", key };
  } catch { return { status: "failed", errorCode: "ledger_receipt_unavailable" }; }
}

export async function markConversationLedgerAccepted(receipt, { getStoreImpl = getStore } = {}) {
  try {
    const storage = ledgerReceiptStore(getStoreImpl);
    const entry = await storage.getWithMetadata(receipt.key, { type: "json", consistency: "strong" });
    if (!entry?.etag || !["prepared", "accepted"].includes(entry.data?.state)) return { status: "ignored" };
    const write = await storage.setJSON(receipt.key, { ...entry.data, state: "accepted" }, { onlyIfMatch: entry.etag });
    return { status: write.modified ? "completed" : "failed" };
  } catch { return { status: "failed" }; }
}

export async function completeConversationLedgerReceipt(receipt, { getStoreImpl = getStore } = {}) {
  try {
    const storage = ledgerReceiptStore(getStoreImpl);
    const entry = await storage.getWithMetadata(receipt.key, { type: "json", consistency: "strong" });
    if (!entry?.etag) return { status: "ignored" };
    // Keep only an opaque tombstone; no transcript after canonical persistence.
    await storage.setJSON(receipt.key.replace("pending/", "done/"), { state: "persisted" }, { onlyIfNew: true });
    await storage.delete(receipt.key);
    return { status: "completed" };
  } catch { return { status: "failed" }; }
}

export async function reconcileConversationLedgerReceipts({ getStoreImpl = getStore,
  recordImpl = recordDurableConversationTurn, appendImpl = appendConversationTurn, limit = 3, now = Date.now() } = {}) {
  const counts = { persisted: 0, failed: 0, uncertain: 0 };
  try {
    const storage = ledgerReceiptStore(getStoreImpl);
    const listing = await storage.list({ prefix: "pending/" });
    for (const blob of listing.blobs || []) {
      if (counts.persisted + counts.failed >= Math.min(10, Math.max(1, limit))) break;
      const entry = await storage.getWithMetadata(blob.key, { type: "json", consistency: "strong" });
      if (entry?.data?.state === "prepared") { counts.uncertain += 1; continue; }
      if (entry?.data?.state !== "accepted" || !entry.data.turn) continue;
      // Accepted receipts prove delivery. Rebuild only those cache turns, with
      // their original timestamp; this never calls the provider or replays IN.
      if (conversationTurnWithinMemoryWindow(entry.data.turn, now)) {
        await appendImpl({ ...entry.data.turn, role: "assistant", source: "bruna" }, { getStoreImpl, now });
      }
      const result = await recordImpl(entry.data.turn);
      if (result.status === "completed") {
        await completeConversationLedgerReceipt({ key: blob.key }, { getStoreImpl });
        counts.persisted += 1;
      } else counts.failed += 1;
    }
    return { status: "completed", ...counts };
  } catch { return { status: "failed", ...counts }; }
}

function boundedText(value, maximumLength = MAX_TEXT_LENGTH) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizeTurn(turn) {
  if (!turn || typeof turn !== "object") return null;
  const messageType = ["text", "image", "audio", "video", "document", "reaction", "sticker"].includes(turn.messageType) ? turn.messageType : "unknown";
  const text = boundedText(turn.text) || (messageType === "reaction" ? "[Reação recebida.]" : "[Conteúdo indisponível; conferir o tipo e o contexto.]");
  const role = turn.role === "assistant" ? "assistant" : "user";
  const source = ["patient", "bruna", "human"].includes(turn.source)
    ? turn.source
    : role === "user"
      ? "patient"
      : "human";
  const parsedAt = new Date(turn.at || 0);

  return {
    role,
    source,
    text,
    messageType,
    eventId: boundedText(turn.eventId, 200),
    templateId: boundedText(turn.templateId, 80).toLowerCase(),
    at: Number.isFinite(parsedAt.getTime())
      ? parsedAt.toISOString()
      : new Date(0).toISOString(),
  };
}

function normalizePendingCommitment(commitment) {
  if (!commitment || typeof commitment !== "object") return null;
  const eventId = boundedText(commitment.eventId, 200);
  const kind = boundedText(commitment.kind, 80);
  if (!eventId || !kind) return null;

  return {
    eventId,
    kind,
    summary: boundedText(commitment.summary, 180),
    owner: boundedText(commitment.owner, 80),
    createdAt: boundedText(commitment.createdAt, 40),
    dueAt: boundedText(commitment.dueAt, 40),
    status: "pending",
    source: boundedText(commitment.source, 80),
  };
}

export async function getDurableConversationContext(
  { phone, opportunityId = "", professional = "", limit = MAX_TURNS },
  { callSheetsImpl = callClassificationSheets } = {},
) {
  if (!phone) {
    return { status: "skipped", turns: [], pendingCommitments: [] };
  }

  const result = await callSheetsImpl("get_conversation_context", {
    conversation: {
      phone,
      opportunityId: boundedText(opportunityId, 120),
      professional: boundedText(professional, 80),
      limit: Math.max(1, Math.min(MAX_TURNS, Number(limit) || MAX_TURNS)),
    },
  }, { timeoutMs: 6_000 });
  if (result.status !== "completed") {
    return {
      status: "failed",
      errorCode: result.errorCode || "request_failed",
      turns: [],
      pendingCommitments: [],
    };
  }

  const turns = (Array.isArray(result.data?.turns) ? result.data.turns : [])
    .map(normalizeTurn)
    .filter(Boolean)
    .slice(-MAX_TURNS);
  const pendingCommitments = (
    Array.isArray(result.data?.pendingCommitments)
      ? result.data.pendingCommitments
      : []
  )
    .map(normalizePendingCommitment)
    .filter(Boolean)
    .slice(0, 10);
  return {
    status: "completed",
    turns,
    pendingCommitments,
    opportunityId: boundedText(result.data?.opportunityId, 120),
    professional: boundedText(result.data?.professional, 80),
  };
}

export async function recordDurableConversationTurn(
  {
    phone,
    eventId,
    parentEventId = "",
    messageId,
    text,
    at,
    source = "bruna",
    opportunityId = "",
    professional = "",
    templateId = "",
  },
  { callSheetsImpl = callClassificationSheets } = {},
) {
  const normalizedText = boundedText(text, 4_000);
  if (!phone || !eventId || !normalizedText) {
    return { status: "skipped" };
  }

  const result = await callSheetsImpl("record_conversation_turn", {
    conversation: {
      phone,
      eventId: boundedText(eventId, 200),
      parentEventId: boundedText(parentEventId, 200),
      messageId: boundedText(messageId || `bruna:${eventId}`, 500),
      text: normalizedText,
      at: at || new Date().toISOString(),
      source: ["bruna", "human", "patient"].includes(source)
        ? source
        : "bruna",
      opportunityId: boundedText(opportunityId, 120),
      professional: boundedText(professional, 80),
      templateId: boundedText(templateId, 80).toLowerCase(),
    },
  }, { timeoutMs: 4_000 });

  return result.status === "completed"
    ? {
        status: "completed",
        duplicate: result.data?.duplicate === true,
      }
    : {
        status: "failed",
        errorCode: result.errorCode || "request_failed",
      };
}
