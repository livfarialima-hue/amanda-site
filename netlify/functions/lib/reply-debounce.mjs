import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-reply-debounce-v1";
const DEFAULT_DEBOUNCE_MS = 120_000;
const MIN_DEBOUNCE_MS = 120_000;
const MAX_DEBOUNCE_MS = 180_000;
const SUPERSEDED_CHECK_INTERVAL_MS = 10_000;

function key(phone) {
  return createHash("sha256")
    .update(`liv-reply-debounce-v1:${String(phone || "")}`)
    .digest("hex");
}

function debounceMs(value) {
  const parsed = Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed)) return DEFAULT_DEBOUNCE_MS;
  return Math.min(
    Math.max(parsed, MIN_DEBOUNCE_MS),
    MAX_DEBOUNCE_MS,
  );
}

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

export async function markLatestInboundForReply(
  { phone, eventId },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  if (!phone || !eventId) {
    return { status: "skipped" };
  }

  try {
    await store(getStoreImpl).setJSON(key(phone), {
      eventId: String(eventId),
      markedAt: new Date(now).toISOString(),
    });
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export async function getLatestInboundReplyMarker(
  { phone },
  { getStoreImpl = getStore } = {},
) {
  if (!phone) {
    return { status: "skipped", found: false };
  }

  try {
    const latest = await store(getStoreImpl).get(key(phone), {
      type: "json",
      consistency: "strong",
    });

    return {
      status: "completed",
      found: Boolean(latest?.eventId),
      eventId: latest?.eventId ? String(latest.eventId) : null,
      markedAt: latest?.markedAt ? String(latest.markedAt) : null,
    };
  } catch {
    return { status: "failed", found: false };
  }
}

export function shouldRecoverExactDuplicateRetry({
  marker,
  eventId,
  messageAt,
}) {
  if (marker?.status !== "completed" || !eventId) return false;
  if (!marker.found) return true;
  if (marker.eventId === String(eventId)) return false;

  const markerTime = Date.parse(String(marker.markedAt || ""));
  const messageTime = Date.parse(String(messageAt || ""));

  return (
    Number.isFinite(markerTime) &&
    Number.isFinite(messageTime) &&
    markerTime < messageTime
  );
}

export async function waitForLatestInboundReply(
  {
    phone,
    eventId,
    markerStatus,
    configuredDelayMs,
  },
  {
    getStoreImpl = getStore,
    waitImpl = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  if (markerStatus !== "completed") {
    return {
      status: "skipped",
      shouldProcess: true,
      delayMs: 0,
    };
  }

  const delayMs = debounceMs(configuredDelayMs);
  let elapsedMs = 0;
  let latestResult = {
    status: "completed",
    shouldProcess: true,
  };

  while (elapsedMs < delayMs) {
    const intervalMs = Math.min(
      SUPERSEDED_CHECK_INTERVAL_MS,
      delayMs - elapsedMs,
    );
    await waitImpl(intervalMs);
    elapsedMs += intervalMs;
    latestResult = await checkLatestInboundReply(
      {
        phone,
        eventId,
        markerStatus,
      },
      { getStoreImpl },
    );

    if (!latestResult.shouldProcess) break;
  }

  return {
    ...latestResult,
    delayMs,
  };
}

export async function checkLatestInboundReply(
  {
    phone,
    eventId,
    markerStatus,
  },
  { getStoreImpl = getStore } = {},
) {
  if (markerStatus !== "completed") {
    return {
      status: "skipped",
      shouldProcess: true,
    };
  }

  try {
    const latest = await store(getStoreImpl).get(key(phone), {
      type: "json",
      consistency: "strong",
    });

    return {
      status: "completed",
      shouldProcess: latest?.eventId === String(eventId),
    };
  } catch {
    return {
      status: "failed",
      shouldProcess: true,
    };
  }
}

export { DEFAULT_DEBOUNCE_MS };
