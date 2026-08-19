import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-conversations-v1";
const MEMORY_VERSION = 2;
const SUPPORTED_MEMORY_VERSIONS = new Set([1, MEMORY_VERSION]);
const MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_TURNS = 32;
const MAX_TURN_TEXT_LENGTH = 1_600;
const MAX_OPENAI_TURN_TEXT_LENGTH = 1_200;
const TRUNCATION_MARKER = " … ";

function text(value, maximumLength = MAX_TURN_TEXT_LENGTH) {
  const characters = Array.from(String(value || "").trim());
  if (characters.length <= maximumLength) return characters.join("");

  const available = Math.max(0, maximumLength - TRUNCATION_MARKER.length);
  const headLength = Math.ceil(available * 0.6);
  const tailLength = Math.max(0, available - headLength);
  return [
    ...characters.slice(0, headLength),
    ...Array.from(TRUNCATION_MARKER),
    ...characters.slice(-tailLength),
  ].slice(0, maximumLength).join("");
}

function timestamp(value, fallback) {
  const parsed = new Date(value || fallback);
  return Number.isNaN(parsed.getTime())
    ? new Date(fallback).toISOString()
    : parsed.toISOString();
}

function stringList(value, maximumItems = 8, maximumLength = 160) {
  return (Array.isArray(value) ? value : [])
    .map((item) => text(item, maximumLength))
    .filter(Boolean)
    .slice(0, maximumItems);
}

export function normalizeConversationSemanticState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const patientActs = new Set([
    "question",
    "request",
    "answer",
    "acceptance",
    "acknowledgement",
    "deferral",
    "decline",
    "closing",
    "statement",
    "unknown",
  ]);
  const owners = new Set(["bruna", "human_team", "patient", "none"]);
  return {
    activeTopic: text(value.activeTopic, 160),
    patientAct: patientActs.has(value.patientAct)
      ? value.patientAct
      : "unknown",
    refersToEventId: text(value.refersToEventId, 200),
    lastClinicQuestion: text(value.lastClinicQuestion, 300),
    lastClinicOffer: text(value.lastClinicOffer, 300),
    unresolvedQuestions: stringList(value.unresolvedQuestions),
    factsAlreadyProvided: stringList(value.factsAlreadyProvided, 12),
    owner: owners.has(value.owner) ? value.owner : "none",
    nextExpectedAction: text(value.nextExpectedAction, 160),
    ambiguity: text(value.ambiguity, 200),
    contextConfidence: ["low", "medium", "high"].includes(
      value.contextConfidence,
    )
      ? value.contextConfidence
      : "low",
  };
}

function normalizeTurn(turn, now) {
  if (
    !turn ||
    !["user", "assistant"].includes(turn.role) ||
    !text(turn.text)
  ) {
    return null;
  }

  return {
    role: turn.role,
    text: text(turn.text),
    eventId: text(turn.eventId, 200),
    at: timestamp(turn.at, now),
    source: ["patient", "bruna", "human"].includes(turn.source)
      ? turn.source
      : turn.role === "user"
        ? "patient"
        : "bruna",
    templateId: text(turn.templateId, 80).toLowerCase(),
  };
}

function emptyConversation(now) {
  return {
    version: MEMORY_VERSION,
    updatedAt: new Date(now).toISOString(),
    turns: [],
    semanticState: null,
  };
}

function normalizeConversation(value, now) {
  if (
    !value ||
    typeof value !== "object" ||
    !SUPPORTED_MEMORY_VERSIONS.has(value.version) ||
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
    .map((turn) => normalizeTurn(turn, now))
    .filter(Boolean)
    .slice(-MAX_TURNS);

  return {
    conversation: {
      version: MEMORY_VERSION,
      updatedAt: new Date(updatedAt).toISOString(),
      turns,
      semanticState: normalizeConversationSemanticState(value.semanticState),
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

function turnIdentity(turn) {
  if (turn.eventId) return `event:${turn.eventId}`;
  return [turn.role, turn.source, turn.at, turn.text].join("|");
}

function mergeTurns(...collections) {
  const indexed = new Map();
  let sequence = 0;

  for (const collection of collections) {
    for (const turn of Array.isArray(collection) ? collection : []) {
      sequence += 1;
      indexed.set(turnIdentity(turn), { turn, sequence });
    }
  }

  return [...indexed.values()]
    .sort((left, right) => {
      const timeDifference =
        new Date(left.turn.at).getTime() - new Date(right.turn.at).getTime();
      return timeDifference || left.sequence - right.sequence;
    })
    .map((entry) => entry.turn)
    .slice(-MAX_TURNS);
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
    templateId,
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
      semanticState: null,
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
        semanticState: existing.semanticState,
      };
    }

    const nextTurn = normalizeTurn({
      role,
      text: turnText,
      eventId: normalizedEventId,
      at,
      source,
      templateId,
    }, now);
    const nextConversation = {
      version: MEMORY_VERSION,
      updatedAt: new Date(now).toISOString(),
      turns: [...historyBefore, nextTurn].slice(-MAX_TURNS),
      semanticState: existing.semanticState,
    };

    await conversationStore.setJSON(key, nextConversation);

    return {
      status: "completed",
      expired: normalized.expired,
      historyBefore,
      historyAfter: nextConversation.turns,
      semanticState: nextConversation.semanticState,
    };
  } catch {
    return {
      status: "failed",
      expired: false,
      historyBefore: [],
      historyAfter: [],
      semanticState: null,
    };
  }
}

export async function hydrateConversationMemory(
  { phone, turns, semanticState },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  if (!phone || !Array.isArray(turns) || turns.length === 0) {
    return {
      status: "skipped",
      expired: false,
      historyBefore: [],
      historyAfter: [],
      semanticState: null,
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
    const durableTurns = turns
      .map((turn) => normalizeTurn(turn, now))
      .filter(Boolean);
    const merged = mergeTurns(
      durableTurns,
      normalized.conversation.turns,
    );
    const nextState = normalizeConversationSemanticState(semanticState) ||
      normalized.conversation.semanticState;
    const nextConversation = {
      version: MEMORY_VERSION,
      updatedAt: new Date(now).toISOString(),
      turns: merged,
      semanticState: nextState,
    };
    await conversationStore.setJSON(key, nextConversation);

    return {
      status: "completed",
      expired: normalized.expired,
      historyBefore: normalized.conversation.turns,
      historyAfter: merged,
      semanticState: nextState,
    };
  } catch {
    return {
      status: "failed",
      expired: false,
      historyBefore: [],
      historyAfter: [],
      semanticState: null,
    };
  }
}

export async function updateConversationSemanticState(
  { phone, semanticState },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  const normalizedState = normalizeConversationSemanticState(semanticState);
  if (!phone || !normalizedState) return { status: "skipped" };

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
    const nextConversation = {
      ...normalized.conversation,
      version: MEMORY_VERSION,
      updatedAt: new Date(now).toISOString(),
      semanticState: normalizedState,
    };
    await conversationStore.setJSON(key, nextConversation);
    return { status: "completed", semanticState: normalizedState };
  } catch {
    return { status: "failed" };
  }
}

export async function readConversationTurns(
  phone,
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  if (!phone) {
    return {
      status: "skipped",
      expired: false,
      turns: [],
      semanticState: null,
    };
  }

  try {
    const conversationStore = store(getStoreImpl);
    const normalized = normalizeConversation(
      await conversationStore.get(conversationKey(phone), {
        type: "json",
        consistency: "strong",
      }),
      now,
    );

    return {
      status: "completed",
      expired: normalized.expired,
      turns: normalized.conversation.turns,
      semanticState: normalized.conversation.semanticState,
    };
  } catch {
    return {
      status: "failed",
      expired: false,
      turns: [],
      semanticState: null,
    };
  }
}

export function toOpenAIConversation(turns) {
  return (Array.isArray(turns) ? turns : [])
    .slice(-MAX_TURNS)
    .map((turn) => {
      const parsedAt = new Date(turn.at || 0);
      const hasValidAt =
        Boolean(turn.at) && Number.isFinite(parsedAt.getTime());
      const eventId = text(turn.eventId, 200);
      const templateId = text(turn.templateId, 80).toLowerCase();

      return {
        role: turn.role === "assistant" ? "assistant" : "patient",
        text: text(turn.text, MAX_OPENAI_TURN_TEXT_LENGTH),
        ...(eventId ? { eventId } : {}),
        ...(templateId ? { templateId } : {}),
        ...(hasValidAt ? { at: parsedAt.toISOString() } : {}),
        source:
          turn.source === "human"
            ? "equipe_humana"
            : turn.source === "bruna"
              ? "bruna"
              : "paciente",
      };
    })
    .filter((turn) => turn.text);
}
