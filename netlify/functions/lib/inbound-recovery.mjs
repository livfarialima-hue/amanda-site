import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-inbound-recovery-v1";
const DEFAULT_RECOVERY_DELAY_MS = 2 * 60 * 1_000;
// A background invocation can run for 15 minutes. A lease must outlive it,
// including when the next five-minute schedule overlaps the current worker.
const CLAIM_TTL_MS = 16 * 60 * 1_000;

function limited(value, maximumLength = 20_000) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^55\d{10,11}$/.test(compact)) return `+${compact}`;
  return "";
}

function eventHash(eventId) {
  return createHash("sha256")
    .update(`liv-inbound-recovery-v1:${limited(eventId, 300)}`)
    .digest("hex");
}

function contentReceipt(rawBody) {
  try {
    const payload = JSON.parse(rawBody);
    const message = payload?.whatsappInboundMessage;
    const from = normalizedPhone(message?.from), to = normalizedPhone(message?.to);
    const id = String(message?.wamid || message?.id || "");
    const at = Date.parse(message?.sendTime || "");
    if (payload?.type !== "whatsapp.inbound_message.received" || !from || !to || !id || !Number.isFinite(at)) return null;
    const body = [message?.text?.body, typeof message?.text === "string" ? message.text : "", message?.body]
      .find(value => typeof value === "string" && value.trim());
    const kind = message.type === "text" && body ? "text"
      : ["text", "unsupported"].includes(message.type) && !body ? "unavailable" : "other";
    return { identity: createHash("sha256").update(JSON.stringify([from, to, id, at])).digest("hex"), kind };
  } catch { return null; }
}

function isContentUpgrade(previous, next) {
  return previous?.kind === "unavailable" && next?.kind === "text" && previous.identity === next.identity;
}

function pendingKey(eventId, receipt) {
  // Separate immutable payloads: an old worker can only remove its own version.
  const suffix = ["text", "unavailable"].includes(receipt?.kind) ? `/${receipt.kind}` : "";
  return `pending/${eventHash(eventId)}${suffix}`;
}

function completedKey(eventId) {
  return `completed/${eventHash(eventId)}`;
}

function recoveryStore(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

export function shouldCompleteInboundRecovery({
  automaticWorkFinished,
  recoveryRegistration,
  suppressExactDuplicate,
}) {
  if (!automaticWorkFinished) return false;

  // A regular YCloud retry can arrive while the first invocation still has
  // deferred work pending. In that case Sheets already knows the message, but
  // the patient reply/review alert has not necessarily finished. Completing
  // the durable recovery here would silently discard the only retry capable
  // of finishing that work.
  if (
    suppressExactDuplicate &&
    recoveryRegistration?.status === "duplicate" &&
    recoveryRegistration?.reason === "already_pending"
  ) {
    return false;
  }

  return true;
}

export function shouldSuppressExactInboundDuplicate({
  exactMessageDuplicate,
  recoveredExactDuplicate,
  durableRetry,
  recoveryRegistration,
}) {
  if (!exactMessageDuplicate) return false;
  if (recoveredExactDuplicate || durableRetry) return false;

  // The spreadsheet can already contain the inbound event even though the
  // patient-facing reply failed later in the same invocation. We may silence
  // an exact provider retry only when the durable lifecycle itself proves that
  // all applicable automatic work was completed. Outbound delivery remains
  // idempotent by event id, so retrying an unfinished event cannot send twice.
  return (
    recoveryRegistration?.status === "duplicate" &&
    recoveryRegistration?.reason === "already_completed"
  );
}

export function shouldAwaitActiveReplyBeforeAcknowledgement({
  deterministicReply,
  recoveryRegistration,
}) {
  return (
    deterministicReply === true ||
    recoveryRegistration?.status === "failed"
  );
}

const TERMINAL_DEFERRED_OUTCOMES = new Set([
  "awaiting_human_learning",
  "blocked_contact_preference",
  "completed",
  "completed_no_reply",
  "duplicate",
  "reviewed",
  "superseded",
]);

export async function settleDeferredInboundRecovery(
  work,
  {
    eventId,
    rawBody,
    outcome = "processed",
    completeInboundRecoveryImpl = completeInboundRecovery,
  } = {},
) {
  let result;
  try {
    result = await work;
  } catch {
    return {
      status: "failed",
      errorCode: "deferred_work_rejected",
      replySent: false,
      recoveryStatus: "pending",
    };
  }

  const status = String(result?.status || "");
  if (!TERMINAL_DEFERRED_OUTCOMES.has(status)) {
    return {
      ...(result || { status: "failed", replySent: false }),
      recoveryStatus: "pending",
    };
  }

  const completion = await completeInboundRecoveryImpl(
    { eventId: String(eventId || ""), rawBody },
    { outcome },
  );
  return {
    ...result,
    recoveryStatus: completion.status,
  };
}

function normalizedPending(value) {
  if (!value || typeof value !== "object") return null;

  const eventId = limited(value.eventId, 300);
  const phone = normalizedPhone(value.phone);
  // The signature covers the original bytes, including surrounding whitespace.
  // Reject oversized inputs instead of acknowledging a truncated, unreplayable job.
  const rawBody = String(value.rawBody || "");
  const signature = limited(value.signature, 2_000);
  const origin = limited(value.origin, 1_000);
  if (
    Array.from(rawBody).length > 40_000 ||
    Array.from(String(value.eventId || "").trim()).length > 300 ||
    Array.from(String(value.signature || "").trim()).length > 2_000 ||
    Array.from(String(value.origin || "").trim()).length > 1_000
  ) return null;
  if (!eventId || !phone || !rawBody || !signature || !origin) {
    return null;
  }

  return {
    version: 1,
    primaryIntake: value.primaryIntake === true,
    status: ["pending", "processing"].includes(value.status)
      ? value.status
      : "pending",
    eventId,
    phone,
    rawBody,
    contentReceipt: contentReceipt(rawBody),
    signature,
    contentType:
      limited(value.contentType, 200) || "application/json",
    origin,
    dueAt: Number(value.dueAt) || 0,
    claimUntil: Number(value.claimUntil) || 0,
    claimToken: limited(value.claimToken, 200),
    attempts: Math.max(Number(value.attempts) || 0, 0),
    createdAt: limited(value.createdAt, 100),
    updatedAt: limited(value.updatedAt, 100),
  };
}

export async function registerInboundRecovery(
  {
    eventId,
    phone,
    rawBody,
    signature,
    contentType,
    origin,
    primaryIntake = false,
  },
  {
    getStoreImpl = getStore,
    now = Date.now(),
    recoveryDelayMs = DEFAULT_RECOVERY_DELAY_MS,
  } = {},
) {
  const normalized = normalizedPending({
    status: "pending",
    primaryIntake,
    eventId,
    phone,
    rawBody,
    signature,
    contentType,
    origin,
    dueAt: now + Math.max(Number(recoveryDelayMs) || 0, 0),
    attempts: 0,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  });
  if (!normalized) return { status: "skipped", reason: "invalid_event" };

  try {
    const store = recoveryStore(getStoreImpl);
    const done = await store.get(completedKey(normalized.eventId), {
      type: "json",
      consistency: "strong",
    });
    if (done?.eventId === normalized.eventId && !isContentUpgrade(done.contentReceipt, normalized.contentReceipt)) {
      return { status: "duplicate", reason: "already_completed" };
    }

    const key = pendingKey(normalized.eventId, normalized.contentReceipt);
    if (normalized.contentReceipt) {
      const alternativeKeys = [...new Set([pendingKey(normalized.eventId),
        pendingKey(normalized.eventId, { kind: "text" }), pendingKey(normalized.eventId, { kind: "unavailable" })])]
        .filter(candidate => candidate !== key);
      for (const otherKey of alternativeKeys) {
        const existing = await store.get(otherKey, { type: "json", consistency: "strong" });
        if (!existing) continue;
        const previous = contentReceipt(existing.rawBody);
        if (previous?.identity && previous.identity !== normalized.contentReceipt.identity) {
          return { status: "failed", reason: "inbound_identity_conflict" };
        }
        if (!isContentUpgrade(previous, normalized.contentReceipt)) {
          return { status: "duplicate", reason: "already_pending" };
        }
      }
    }
    const write = await store.setJSON(key, normalized, {
      onlyIfNew: true,
    });
    return write.modified
      ? { status: "completed", queueKey: key }
      : { status: "duplicate", reason: "already_pending" };
  } catch {
    return { status: "failed", reason: "storage_failed" };
  }
}

export async function claimDueInboundRecoveries(
  {
    getStoreImpl = getStore,
    now = Date.now(),
    limit = 5,
  } = {},
) {
  try {
    const store = recoveryStore(getStoreImpl);
    const listing = await store.list({ prefix: "pending/" });
    const jobs = [];

    for (const blob of listing.blobs || []) {
      if (jobs.length >= limit) break;

      const entry = await store.getWithMetadata(blob.key, {
        type: "json",
        consistency: "strong",
      });
      const pending = normalizedPending(entry?.data);
      if (!pending || ![pendingKey(pending.eventId), pendingKey(pending.eventId, pending.contentReceipt)].includes(blob.key)) continue;
      const completed = await store.get(completedKey(pending.eventId), {
        type: "json",
        consistency: "strong",
      });
      if (completed?.eventId === pending.eventId && !isContentUpgrade(completed.contentReceipt, pending.contentReceipt)) {
        // Old unconditional registrations could recreate pending after the
        // terminal receipt. That receipt wins: discard only this exact queue
        // key, before reserving work or invoking any patient-facing handler.
        await store.delete(blob.key);
        continue;
      }
      if (pending.contentReceipt?.kind === "unavailable") {
        const recovered = await store.get(pendingKey(pending.eventId, { kind: "text" }), { type: "json", consistency: "strong" });
        if (isContentUpgrade(pending.contentReceipt, contentReceipt(recovered?.rawBody))) continue;
      }
      if (pending.contentReceipt?.kind === "text") {
        let previousWorkerActive = false;
        for (const oldKey of [pendingKey(pending.eventId), pendingKey(pending.eventId, { kind: "unavailable" })]) {
          if (oldKey === blob.key) continue;
          const previous = await store.get(oldKey, { type: "json", consistency: "strong" });
          if (previous?.status === "processing" && previous.claimUntil > now) previousWorkerActive = true;
        }
        // Finish the original response claim before checking its receipt. Two
        // workers for the same message must not race a clarification and answer.
        if (previousWorkerActive) continue;
      }
      if (
        pending.dueAt > now ||
        (
          pending.status === "processing" &&
          pending.claimUntil > now
        )
      ) {
        continue;
      }

      const claimToken = randomUUID();
      const claimed = {
        ...pending,
        status: "processing",
        claimToken,
        claimUntil: now + CLAIM_TTL_MS,
        attempts: pending.attempts + 1,
        updatedAt: new Date(now).toISOString(),
      };
      const write = await store.setJSON(blob.key, claimed, {
        onlyIfMatch: entry.etag,
      });
      if (write.modified) {
        jobs.push({ ...claimed, queueKey: blob.key });
      }
    }

    return { status: "completed", jobs };
  } catch {
    return { status: "failed", jobs: [] };
  }
}

export async function completeInboundRecovery(
  job,
  {
    outcome = "completed",
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  const eventId = limited(job?.eventId, 300);
  if (!eventId) return { status: "skipped" };

  try {
    const store = recoveryStore(getStoreImpl);
    const doneEntry = await store.getWithMetadata(completedKey(eventId), {
      type: "json",
      consistency: "strong",
    });
    const done = doneEntry?.data;
    const receipt = contentReceipt(job?.rawBody);
    const key = job?.queueKey || pendingKey(eventId, receipt);
    if (done?.eventId === eventId && !isContentUpgrade(done.contentReceipt, receipt)) {
      await store.delete(key);
      return { status: "completed", duplicate: true };
    }
    const entry = await store.getWithMetadata(key, {
      type: "json",
      consistency: "strong",
    });
    if (
      job?.claimToken &&
      entry?.data?.claimToken !== job.claimToken
    ) {
      return { status: "superseded" };
    }

    const write = await store.setJSON(
      completedKey(eventId),
      {
        version: 1,
        eventId,
        contentReceipt: receipt || contentReceipt(entry?.data?.rawBody),
        outcome: limited(outcome, 100),
        completedAt: new Date(now).toISOString(),
      },
      doneEntry ? { onlyIfMatch: doneEntry.etag } : { onlyIfNew: true },
    );
    if (!write.modified) return { status: "superseded" };
    if (entry) await store.delete(key);
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export async function rescheduleInboundRecovery(
  job,
  {
    getStoreImpl = getStore,
    now = Date.now(),
    delayMs = 60_000,
  } = {},
) {
  if (!job?.queueKey || !job?.claimToken) {
    return { status: "skipped" };
  }

  try {
    const store = recoveryStore(getStoreImpl);
    const entry = await store.getWithMetadata(job.queueKey, {
      type: "json",
      consistency: "strong",
    });
    if (
      entry?.data?.claimToken !== job.claimToken ||
      !entry?.etag
    ) {
      return { status: "superseded" };
    }

    const write = await store.setJSON(
      job.queueKey,
      {
        ...entry.data,
        status: "pending",
        claimToken: "",
        claimUntil: 0,
        dueAt: now + Math.max(Number(delayMs) || 0, 0),
        updatedAt: new Date(now).toISOString(),
      },
      { onlyIfMatch: entry.etag },
    );
    return {
      status: write.modified ? "completed" : "superseded",
    };
  } catch {
    return { status: "failed" };
  }
}

export { DEFAULT_RECOVERY_DELAY_MS };
