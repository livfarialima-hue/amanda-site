import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-reply-debounce-v1";
const DEFAULT_DETERMINISTIC_DEBOUNCE_MS = 3_000;
const DEFAULT_AI_DEBOUNCE_MS = 5_000;
const DEFAULT_DEBOUNCE_MS = DEFAULT_DETERMINISTIC_DEBOUNCE_MS;
const MIN_DEBOUNCE_MS = 2_000;
const MAX_DEBOUNCE_MS = 8_000;
const PRIORITY_HOLD_MS = 10 * 60 * 1_000;

function key(phone) {
  return createHash("sha256")
    .update(`liv-reply-debounce-v1:${String(phone || "")}`)
    .digest("hex");
}

function debounceMs(value, replyKind = "deterministic", messageText = "") {
  const parsed = Number.parseInt(String(value || ""), 10);
  const fallback = replyKind === "ai"
    ? DEFAULT_AI_DEBOUNCE_MS
    : DEFAULT_DETERMINISTIC_DEBOUNCE_MS;
  const base = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_DEBOUNCE_MS), MAX_DEBOUNCE_MS)
    : fallback;
  const longMultipart =
    Array.from(String(messageText || "")).length > 500 ||
    (String(messageText || "").match(/\n/g) || []).length >= 3;

  return longMultipart
    ? Math.min(Math.max(base, replyKind === "ai" ? 6_000 : 4_000), MAX_DEBOUNCE_MS)
    : base;
}

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

export async function markLatestInboundForReply(
  { phone, eventId, eventAt, priority = 100 },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  if (!phone || !eventId) {
    return { status: "skipped" };
  }

  try {
    const replyStore = store(getStoreImpl);
    const current = await replyStore.get(key(phone), {
      type: "json",
      consistency: "strong",
    });
    const incomingAt = Date.parse(String(eventAt || ""));
    const currentEventAt = Date.parse(String(current?.eventAt || ""));
    const currentMarkedAt = Date.parse(String(current?.markedAt || ""));
    const incomingPriority = Number(priority) || 0;
    const currentPriority = Number(current?.priority) || 0;
    const currentIsRecent =
      Number.isFinite(currentMarkedAt) &&
      now - currentMarkedAt >= 0 &&
      now - currentMarkedAt <= PRIORITY_HOLD_MS;
    const currentIsNewer =
      Number.isFinite(incomingAt) &&
      Number.isFinite(currentEventAt) &&
      currentEventAt > incomingAt;
    const protectsMoreSpecificMessage =
      current?.eventId &&
      current.eventId !== String(eventId) &&
      currentIsRecent &&
      currentPriority > incomingPriority;

    if (currentIsNewer || protectsMoreSpecificMessage) {
      return {
        status: "completed",
        preserved: true,
        eventId: String(current.eventId),
      };
    }

    await replyStore.setJSON(key(phone), {
      eventId: String(eventId),
      eventAt: Number.isFinite(incomingAt)
        ? new Date(incomingAt).toISOString()
        : null,
      priority: incomingPriority,
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
    replyKind = "deterministic",
    messageText = "",
  },
  {
    getStoreImpl = getStore,
    waitImpl = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
    now = Date.now(),
  } = {},
) {
  if (markerStatus !== "completed") {
    return {
      status: "skipped",
      shouldProcess: true,
      delayMs: 0,
    };
  }

  const configuredQuietWindowMs = debounceMs(
    configuredDelayMs,
    replyKind,
    messageText,
  );
  let delayMs = configuredQuietWindowMs;

  try {
    const latestBeforeWait = await store(getStoreImpl).get(key(phone), {
      type: "json",
      consistency: "strong",
    });
    if (
      latestBeforeWait?.eventId &&
      latestBeforeWait.eventId !== String(eventId)
    ) {
      return {
        status: "completed",
        shouldProcess: false,
        delayMs: 0,
      };
    }

    const markedAt = Date.parse(String(latestBeforeWait?.markedAt || ""));
    if (Number.isFinite(markedAt) && now >= markedAt) {
      delayMs = Math.max(
        0,
        configuredQuietWindowMs - (now - markedAt),
      );
    }
  } catch {
    delayMs = configuredQuietWindowMs;
  }

  if (delayMs > 0) await waitImpl(delayMs);

  const latestResult = await checkLatestInboundReply(
    {
      phone,
      eventId,
      markerStatus,
    },
    { getStoreImpl },
  );

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

export {
  DEFAULT_AI_DEBOUNCE_MS,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_DETERMINISTIC_DEBOUNCE_MS,
};
