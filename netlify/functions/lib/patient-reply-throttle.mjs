import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-patient-reply-throttle-v1";
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1_000;
const PENDING_TTL_MS = 2 * 60 * 1_000;

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : "";
}

function limited(value, maximumLength = 200) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizedFamily(value) {
  const family = limited(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return family;
}

function replyFamilyKey(phone, family) {
  return createHash("sha256")
    .update(`liv-patient-reply-throttle-v1:${phone}:${family}`)
    .digest("hex");
}

function replyStore(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

function normalizedRecord(value) {
  if (!value || value.version !== 1) return null;

  const status = String(value.status || "");
  const eventId = limited(value.eventId);
  const updatedAt = Number(value.updatedAt);
  if (
    !["pending", "sent"].includes(status) ||
    !eventId ||
    !Number.isFinite(updatedAt)
  ) {
    return null;
  }

  return {
    version: 1,
    status,
    eventId,
    updatedAt,
  };
}

function normalizedCooldown(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 30_000
    ? parsed
    : DEFAULT_COOLDOWN_MS;
}

export async function claimPatientReplySlot(
  { phone, family, eventId },
  {
    getStoreImpl = getStore,
    now = Date.now(),
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = {},
) {
  const recipient = normalizedPhone(phone);
  const normalizedReplyFamily = normalizedFamily(family);
  const normalizedEventId = limited(eventId);
  if (!recipient || !normalizedReplyFamily || !normalizedEventId) {
    return { status: "unavailable", reason: "invalid_identity" };
  }

  try {
    const store = replyStore(getStoreImpl);
    const key = replyFamilyKey(recipient, normalizedReplyFamily);
    const entry = await store.getWithMetadata(key, {
      type: "json",
      consistency: "strong",
    });
    const current = normalizedRecord(entry?.data);
    const activeFor = current?.status === "pending"
      ? PENDING_TTL_MS
      : normalizedCooldown(cooldownMs);

    if (
      current &&
      now - current.updatedAt >= 0 &&
      now - current.updatedAt < activeFor
    ) {
      return {
        status: "suppressed",
        reason: current.status === "pending"
          ? "same_reply_family_in_progress"
          : "same_reply_family_cooldown",
      };
    }

    const write = await store.setJSON(
      key,
      {
        version: 1,
        status: "pending",
        eventId: normalizedEventId,
        updatedAt: now,
      },
      entry?.etag
        ? { onlyIfMatch: entry.etag }
        : { onlyIfNew: true },
    );

    if (write?.modified === false) {
      return {
        status: "suppressed",
        reason: "same_reply_family_in_progress",
      };
    }

    return {
      status: "claimed",
      key,
      eventId: normalizedEventId,
    };
  } catch {
    if (
      getStoreImpl === getStore &&
      process.env.NETLIFY !== "true" &&
      !process.env.CONTEXT
    ) {
      return {
        status: "claimed",
        key: `local-development:${replyFamilyKey(recipient, normalizedReplyFamily)}`,
        eventId: normalizedEventId,
        localDevelopment: true,
      };
    }
    return { status: "unavailable", reason: "storage_failed" };
  }
}

export async function completePatientReplySlot(
  claim,
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  if (claim?.localDevelopment === true) {
    return { status: "completed" };
  }
  if (claim?.status !== "claimed" || !claim.key) {
    return { status: "skipped" };
  }

  try {
    const store = replyStore(getStoreImpl);
    const entry = await store.getWithMetadata(claim.key, {
      type: "json",
      consistency: "strong",
    });
    const current = normalizedRecord(entry?.data);
    if (
      !current ||
      current.status !== "pending" ||
      current.eventId !== claim.eventId
    ) {
      return { status: "superseded" };
    }

    const write = await store.setJSON(
      claim.key,
      {
        version: 1,
        status: "sent",
        eventId: claim.eventId,
        updatedAt: now,
      },
      entry?.etag ? { onlyIfMatch: entry.etag } : {},
    );
    return {
      status: write?.modified === false
        ? "superseded"
        : "completed",
    };
  } catch {
    return { status: "failed" };
  }
}

export async function releasePatientReplySlot(
  claim,
  { getStoreImpl = getStore } = {},
) {
  if (claim?.localDevelopment === true) {
    return { status: "completed" };
  }
  if (claim?.status !== "claimed" || !claim.key) {
    return { status: "skipped" };
  }

  try {
    const store = replyStore(getStoreImpl);
    const current = normalizedRecord(
      await store.get(claim.key, {
        type: "json",
        consistency: "strong",
      }),
    );
    if (
      current?.status !== "pending" ||
      current.eventId !== claim.eventId
    ) {
      return { status: "superseded" };
    }

    await store.delete(claim.key);
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export const PATIENT_REPLY_COOLDOWN_MS = DEFAULT_COOLDOWN_MS;
