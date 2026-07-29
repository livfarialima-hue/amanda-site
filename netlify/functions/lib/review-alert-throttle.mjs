import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-review-alert-throttle-v1";
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1_000;
const PENDING_TTL_MS = 2 * 60 * 1_000;

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : "";
}

function limitedText(value, maximumLength = 200) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function alertKey(phone) {
  return createHash("sha256")
    .update(`liv-review-alert-throttle-v1:${normalizedPhone(phone)}`)
    .digest("hex");
}

function alertStore(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

function normalizedRecord(value) {
  if (!value || value.version !== 1) return null;

  const status = String(value.status || "");
  const eventId = limitedText(value.eventId);
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
  return Number.isFinite(parsed) && parsed >= 60_000
    ? parsed
    : DEFAULT_COOLDOWN_MS;
}

export async function claimReviewAlertSlot(
  {
    patientPhone,
    eventId,
  },
  {
    getStoreImpl = getStore,
    now = Date.now(),
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = {},
) {
  const phone = normalizedPhone(patientPhone);
  const normalizedEventId = limitedText(eventId);

  if (!phone || !normalizedEventId) {
    return {
      status: "allowed",
      failOpen: true,
    };
  }

  try {
    const store = alertStore(getStoreImpl);
    const key = alertKey(phone);
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
          ? "same_patient_alert_in_progress"
          : "same_patient_cooldown",
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
        reason: "same_patient_alert_in_progress",
      };
    }

    return {
      status: "claimed",
      key,
      eventId: normalizedEventId,
    };
  } catch {
    return {
      status: "allowed",
      failOpen: true,
    };
  }
}

export async function completeReviewAlertSlot(
  claim,
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  if (claim?.status !== "claimed" || !claim.key) {
    return { status: "skipped" };
  }

  try {
    const store = alertStore(getStoreImpl);
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

export async function releaseReviewAlertSlot(
  claim,
  { getStoreImpl = getStore } = {},
) {
  if (claim?.status !== "claimed" || !claim.key) {
    return { status: "skipped" };
  }

  try {
    const store = alertStore(getStoreImpl);
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

export const REVIEW_ALERT_COOLDOWN_MS = DEFAULT_COOLDOWN_MS;
