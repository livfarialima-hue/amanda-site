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
const MAX_WRITE_ATTEMPTS = 4;

export function conversationTurnWithinMemoryWindow(turn, now = Date.now()) {
  const at = Date.parse(turn?.at);
  return Number.isFinite(at) && at <= now && now - at <= MEMORY_TTL_MS;
}

function conversationSource(turn) {
  if (["human", "equipe_humana", "human_team"].includes(turn?.source)) return "human";
  if (turn?.source === "bruna") return "bruna";
  if (turn?.role === "assistant") return "unknown";
  return "patient";
}

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
    source: conversationSource(turn),
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

  const turns = mergeTurns(
    value.turns
      .map((turn) => normalizeTurn(turn, now))
      .filter(Boolean),
  );

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

// Every retry merges against the current version: an AI result must never
// replace a patient message or human echo that arrived while it was computed.
async function mutateConversation(phone, getStoreImpl, now, calculate) {
  const conversationStore = store(getStoreImpl);
  const key = conversationKey(phone);
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const entry = await conversationStore.getWithMetadata(key, {
      type: "json", consistency: "strong",
    });
    if (entry && !entry.etag) throw new Error("conversation_version_unavailable");
    const update = calculate(normalizeConversation(entry?.data, now));
    if (!update.conversation) return update.result;
    const write = await conversationStore.setJSON(key, update.conversation,
      entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
    if (write?.modified === true) return update.result;
  }
  throw new Error("conversation_write_conflict");
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

export function shouldHydrateConversationHistory({ memoryResult, delivery }) {
  return Boolean(delivery?.ok && (
    memoryResult?.status === "failed" || memoryResult?.expired === true ||
    memoryResult?.historyBefore?.length > 0 || delivery.updated === true ||
    delivery.routed === false || delivery.routeStatus === "pending"
  ));
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
    return await mutateConversation(phone, getStoreImpl, now, (normalized) => {
    const existing = normalized.conversation;
    const historyBefore = existing.turns;
    const normalizedEventId = text(eventId, 200);

    if (
      normalizedEventId &&
      historyBefore.some((turn) => turn.eventId === normalizedEventId)
    ) {
      return { result: {
        status: "duplicate",
        expired: false,
        historyBefore,
        historyAfter: historyBefore,
        semanticState: existing.semanticState,
      } };
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
      turns: mergeTurns(historyBefore, [nextTurn]),
      semanticState: existing.semanticState,
    };

    return { conversation: nextConversation, result: {
      status: "completed",
      expired: normalized.expired,
      historyBefore,
      historyAfter: nextConversation.turns,
      semanticState: nextConversation.semanticState,
    } };
    });
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
    return await mutateConversation(phone, getStoreImpl, now, (normalized) => {
    const durableTurns = turns
      .map((turn) => normalizeTurn(turn, now))
      .filter(Boolean);
    const merged = mergeTurns(
      durableTurns,
      normalized.conversation.turns,
    );
    const nextState = normalized.conversation.semanticState ||
      normalizeConversationSemanticState(semanticState);
    const nextConversation = {
      version: MEMORY_VERSION,
      updatedAt: new Date(now).toISOString(),
      turns: merged,
      semanticState: nextState,
    };
    return { conversation: nextConversation, result: {
      status: "completed",
      expired: normalized.expired,
      historyBefore: normalized.conversation.turns,
      historyAfter: merged,
      semanticState: nextState,
    } };
    });
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
  { phone, semanticState, basedOnEventId },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  const normalizedState = normalizeConversationSemanticState(semanticState);
  if (!phone || !normalizedState) return { status: "skipped" };

  try {
    return await mutateConversation(phone, getStoreImpl, now, (normalized) => {
    if (basedOnEventId) {
      const turns = normalized.conversation.turns;
      const anchor = turns.findIndex((turn) => turn.eventId === basedOnEventId);
      if (anchor < 0 || turns.slice(anchor + 1).some((turn) =>
        turn.role === "user" || turn.source !== "bruna")) {
        return { result: { status: "superseded", reason: "newer_conversation_activity" } };
      }
    }
    const nextConversation = {
      ...normalized.conversation,
      version: MEMORY_VERSION,
      updatedAt: new Date(now).toISOString(),
      semanticState: normalizedState,
    };
    return { conversation: nextConversation,
      result: { status: "completed", semanticState: normalizedState } };
    });
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
          conversationSource(turn) === "human"
            ? "equipe_humana"
            : conversationSource(turn) === "bruna"
              ? "bruna"
              : turn.role === "assistant" ? "clinica_autoria_desconhecida" : "paciente",
      };
    })
    .filter((turn) => turn.text);
}
