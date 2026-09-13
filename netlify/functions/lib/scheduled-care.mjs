import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { callClassificationSheets } from "./sheets-classification-client.mjs";
import { readConversationTurns, appendConversationTurn } from "./conversation-memory.mjs";
import { getBusinessNumber } from "./business-number-registry.mjs";
import { sendYCloudPatientFollowupTemplate, renderYCloudFollowupTemplateText } from "./ycloud-patient-message.mjs";

export const BIRTHDAY_CARE_TEXT = "A equipe da Clínica LIV deseja um feliz aniversário! Que seu novo ciclo traga saúde e bons momentos. Receba nosso carinho.";
const STORE = "liv-scheduled-care-receipts-v1";
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function validateCareReceipt(care, now) {
  if (!care || care.ok !== true || !/^care:[\w-]{43}$/.test(care.planId || "") || !/^\+\d{8,15}$/.test(care.patientPhone || "")) return "care_identity_invalid";
  if (care.purpose === "birthday") return "birthday_manual_only";
  if (!["amanda", "daniel"].includes(care.professional) || !["post_consult", "post_surgery", "quote"].includes(care.purpose)) return "care_purpose_invalid";
  const local = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(now).map(part => [part.type, part.value]));
  if (Number(local.hour) < 9 || Number(local.hour) >= 18 || ["Sat", "Sun"].includes(local.weekday)) return "care_outside_send_window";
  const age = now.getTime() - Date.parse(care.checkedAt);
  if (!Number.isFinite(age) || age < -5000 || age > 60000 || !care.contextSignature || !care.contextAnchorMessageId) return "care_receipt_expired";
  const approvedAt = Date.parse(care.approvedAt);
  if (!Number.isFinite(approvedAt) || approvedAt > now.getTime() || now.getTime() - approvedAt > 4 * 86400000) return "care_approval_expired";
  if (!care.body || Array.from(care.body).length > 900) return "care_message_invalid";
  return "";
}

// Compatibility adapter: birthday greetings must be sent by the human team.
export async function sendBirthdayCare() {
  return { status: "failed", errorCode: "birthday_manual_only" };
}

// The request supplies only a plan identity. Recipient, exact text, purpose,
// consent and Calendar validation are obtained afresh from the canonical sheet.
export async function handleScheduledCare(payload, {
  env = process.env, fetchImpl = fetch, now = new Date(), getStoreImpl = getStore,
  callSheetsImpl = callClassificationSheets, readMemoryImpl = readConversationTurns,
  getBusinessNumberImpl = getBusinessNumber, appendMemoryImpl = appendConversationTurn,
  sendTemplateImpl = sendYCloudPatientFollowupTemplate,
} = {}) {
  if (env.WHATSAPP_SCHEDULED_CARE_ENABLED !== "true") return json({ ok: false, sent: false, error: "care_disabled" }, 503);
  const planId = String(payload.planId || "");
  if (!/^care:[\w-]{43}$/.test(planId)) return json({ ok: false, error: "care_identity_invalid" }, 400);
  const key = createHash("sha256").update(planId).digest("hex");
  const eventId = `liv-care-${key}`;
  let receiptStore;
  try {
    receiptStore = getStoreImpl({ name: STORE, consistency: "strong" });
    const prior = await receiptStore.get(key, { type: "json", consistency: "strong" });
    if (prior?.status === "sent") return json({ ok: true, sent: true, duplicate: true, effectiveBody: prior.body });
    if (prior) return json({ ok: false, sent: false, uncertain: prior.status !== "cancelled", error: "care_delivery_requires_reconciliation" }, 409);
    if (payload.statusOnly === true) return json({ ok: true, sent: false, status: "not_attempted" });
  } catch { return json({ ok: false, sent: false, error: "care_receipt_store_unavailable" }, 503); }

  const read = async () => {
    const response = await callSheetsImpl("validate_care_send", { care: { planId } }, { env, fetchImpl, timeoutMs: 12000 });
    return response.status === "completed" ? response.data : { ok: false, error: response.errorCode || "care_read_failed" };
  };
  const startedAt = Date.now();
  const currentTime = () => new Date(now.getTime() + Date.now() - startedAt);
  const care = await read();
  const invalid = care.error || validateCareReceipt(care, currentTime());
  if (invalid) return json({ ok: false, sent: false, error: invalid }, 409);
  if (!env.YCLOUD_FOLLOWUP_TEMPLATE_NAME) return json({ ok: false, sent: false, error: "followup_template_missing" }, 503);
  const from = await getBusinessNumberImpl({ env });
  if (!from || !env.YCLOUD_API_KEY) return json({ ok: false, sent: false, error: "configuration_missing" }, 503);

  let claim;
  try {
    claim = await receiptStore.setJSON(key, { status: "reserved", at: now.toISOString() }, { onlyIfNew: true });
  } catch { return json({ ok: false, sent: false, error: "care_claim_unavailable" }, 503); }
  if (!claim.modified) return json({ ok: false, sent: false, error: "care_concurrent_claim" }, 409);
  // A reservation never expires into a resend: provider timeouts require checking
  // the receipt. This is intentionally stricter than reply retry behaviour.
  const fresh = await read();
  const memory = await readMemoryImpl(care.patientPhone, { now: now.getTime() });
  const changed = fresh.error || validateCareReceipt(fresh, currentTime()) ||
    fresh.contextSignature !== care.contextSignature || fresh.body !== care.body || fresh.patientPhone !== care.patientPhone ||
    memory.status !== "completed" ||
    (memory.turns || []).some(turn => Date.parse(turn.at) > Date.parse(care.approvedAt));
  if (changed) {
    await receiptStore.setJSON(key, { status: "cancelled", reason: "care_context_changed", at: now.toISOString() });
    return json({ ok: false, sent: false, error: "care_context_changed" }, 409);
  }
  const effectiveBody = renderYCloudFollowupTemplateText(care.body);
  let result;
  try {
    result = await sendTemplateImpl(
      { from, to: care.patientPhone, eventId, body: care.body }, { env, fetchImpl },
    );
  } catch { result = { status: "failed", errorCode: "delivery_unknown" }; }
  if (result.status !== "completed") {
    await receiptStore.setJSON(key, { status: "uncertain", at: now.toISOString(), error: result.errorCode || "delivery_unknown" });
    return json({ ok: false, sent: false, uncertain: true, error: result.errorCode || "delivery_unknown" }, 502);
  }
  try {
    await receiptStore.setJSON(key, { status: "sent", at: now.toISOString(), body: effectiveBody });
    await appendMemoryImpl({ phone: care.patientPhone, role: "assistant", text: effectiveBody, eventId, source: "bruna", at: now.toISOString() });
  } catch {
    return json({ ok: false, sent: false, uncertain: true, error: "care_receipt_write_failed" }, 503);
  }
  return json({ ok: true, sent: true, effectiveBody });
}
