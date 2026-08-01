import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-inbound-recovery-v1";
const DEFAULT_RECOVERY_DELAY_MS = 2 * 60 * 1_000;
const CLAIM_TTL_MS = 90 * 1_000;

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

function pendingKey(eventId) {
  return `pending/${eventHash(eventId)}`;
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

function normalizedPending(value) {
  if (!value || typeof value !== "object") return null;

  const eventId = limited(value.eventId, 300);
  const phone = normalizedPhone(value.phone);
  const rawBody = limited(value.rawBody, 40_000);
  const signature = limited(value.signature, 2_000);
  const origin = limited(value.origin, 1_000);
  if (!eventId || !phone || !rawBody || !signature || !origin) {
    return null;
  }

  return {
    version: 1,
    status: ["pending", "processing"].includes(value.status)
      ? value.status
      : "pending",
    eventId,
    phone,
    rawBody,
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
  },
  {
    getStoreImpl = getStore,
    now = Date.now(),
    recoveryDelayMs = DEFAULT_RECOVERY_DELAY_MS,
  } = {},
) {
  const normalized = normalizedPending({
    status: "pending",
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
    if (done?.eventId === normalized.eventId) {
      return { status: "duplicate", reason: "already_completed" };
    }

    const key = pendingKey(normalized.eventId);
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
      if (
        !pending ||
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
    const done = await store.get(completedKey(eventId), {
      type: "json",
      consistency: "strong",
    });
    if (done?.eventId === eventId) {
      return { status: "completed", duplicate: true };
    }
    const key = job?.queueKey || pendingKey(eventId);
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

    await store.setJSON(
      completedKey(eventId),
      {
        version: 1,
        eventId,
        outcome: limited(outcome, 100),
        completedAt: new Date(now).toISOString(),
      },
      { onlyIfNew: true },
    );
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
