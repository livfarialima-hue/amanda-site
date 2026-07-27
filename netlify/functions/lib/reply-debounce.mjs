import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-reply-debounce-v1";
const DEFAULT_DEBOUNCE_MS = 6_000;
const MAX_DEBOUNCE_MS = 15_000;

function key(phone) {
  return createHash("sha256")
    .update(`liv-reply-debounce-v1:${String(phone || "")}`)
    .digest("hex");
}

function debounceMs(value) {
  const parsed = Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed)) return DEFAULT_DEBOUNCE_MS;
  return Math.min(Math.max(parsed, 0), MAX_DEBOUNCE_MS);
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
  await waitImpl(delayMs);

  try {
    const latest = await store(getStoreImpl).get(key(phone), {
      type: "json",
      consistency: "strong",
    });

    return {
      status: "completed",
      shouldProcess: latest?.eventId === String(eventId),
      delayMs,
    };
  } catch {
    return {
      status: "failed",
      shouldProcess: true,
      delayMs,
    };
  }
}

export { DEFAULT_DEBOUNCE_MS };
