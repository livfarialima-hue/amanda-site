import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-conversations-v1";
const MEMORY_VERSION = 1;
const MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_TURNS = 8;
const MAX_TURN_TEXT_LENGTH = 700;

function text(value, maximumLength = MAX_TURN_TEXT_LENGTH) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function timestamp(value, fallback) {
  const parsed = new Date(value || fallback);
  return Number.isNaN(parsed.getTime())
    ? new Date(fallback).toISOString()
    : parsed.toISOString();
}

function emptyConversation(now) {
  return {
    version: MEMORY_VERSION,
    updatedAt: new Date(now).toISOString(),
    turns: [],
  };
}

function normalizeConversation(value, now) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== MEMORY_VERSION ||
    !Array.isArray(value.turns)
  ) {
    return {
      conversation: emptyConversation(now),
      expired: false,
    };
  }

  const updatedAt = new Date(value.updatedAt || 0).getTime();

  if (!Number.isFinite(updatedAt) || now - updatedAt > MEMORY_TTL_MS) {
    return {
      conversation: emptyConversation(now),
      expired: value.turns.length > 0,
    };
  }

  const turns = value.turns
    .filter(
      (turn) =>
        turn &&
        ["user", "assistant"].includes(turn.role) &&
        text(turn.text).length > 0,
    )
    .slice(-MAX_TURNS)
    .map((turn) => ({
      role: turn.role,
      text: text(turn.text),
      eventId: text(turn.eventId, 200),
      at: timestamp(turn.at, now),
      source: ["patient", "bruna", "human"].includes(turn.source)
        ? turn.source
        : turn.role === "user"
          ? "patient"
          : "bruna",
    }));

  return {
    conversation: {
      version: MEMORY_VERSION,
      updatedAt: new Date(updatedAt).toISOString(),
      turns,
    },
    expired: false,
  };
}

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

export function conversationKey(phone) {
  return createHash("sha256")
    .update(`liv-conversation-v1:${String(phone || "")}`)
    .digest("hex");
}

export async function appendConversationTurn(
  {
    phone,
    role,
    text: turnText,
    eventId,
    at,
    source,
  },
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  if (
    !phone ||
    !["user", "assistant"].includes(role) ||
    !text(turnText)
  ) {
    return {
      status: "skipped",
      expired: false,
      historyBefore: [],
      historyAfter: [],
    };
  }

  try {
    const conversationStore = store(getStoreImpl);
    const key = conversationKey(phone);
    const normalized = normalizeConversation(
      await conversationStore.get(key, {
        type: "json",
        consistency: "strong",
      }),
      now,
    );
    const existing = normalized.conversation;
    const historyBefore = existing.turns;
    const normalizedEventId = text(eventId, 200);

    if (
      normalizedEventId &&
      historyBefore.some((turn) => turn.eventId === normalizedEventId)
    ) {
      return {
        status: "duplicate",
        expired: false,
        historyBefore,
        historyAfter: historyBefore,
      };
    }

    const nextTurn = {
      role,
      text: text(turnText),
      eventId: normalizedEventId,
      at: timestamp(at, now),
      source: ["patient", "bruna", "human"].includes(source)
        ? source
        : role === "user"
          ? "patient"
          : "bruna",
    };
    const nextConversation = {
      version: MEMORY_VERSION,
      updatedAt: new Date(now).toISOString(),
      turns: [...historyBefore, nextTurn].slice(-MAX_TURNS),
    };

    await conversationStore.setJSON(key, nextConversation);

    return {
      status: "completed",
      expired: normalized.expired,
      historyBefore,
      historyAfter: nextConversation.turns,
    };
  } catch {
    return {
      status: "failed",
      expired: false,
      historyBefore: [],
      historyAfter: [],
    };
  }
}

export function toOpenAIConversation(turns) {
  return (Array.isArray(turns) ? turns : [])
    .slice(-MAX_TURNS)
    .map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "patient",
      text: text(turn.text, 500),
      source:
        turn.source === "human"
          ? "equipe_humana"
          : turn.source === "bruna"
            ? "bruna"
            : "paciente",
    }))
    .filter((turn) => turn.text);
}
