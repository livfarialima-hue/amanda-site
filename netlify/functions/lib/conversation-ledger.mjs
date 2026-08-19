import { callClassificationSheets } from "./sheets-classification-client.mjs";

const MAX_TURNS = 32;
const MAX_TEXT_LENGTH = 1_600;

function boundedText(value, maximumLength = MAX_TEXT_LENGTH) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizeTurn(turn) {
  if (!turn || typeof turn !== "object") return null;
  const text = boundedText(turn.text);
  if (!text) return null;
  const role = turn.role === "assistant" ? "assistant" : "user";
  const source = ["patient", "bruna", "human"].includes(turn.source)
    ? turn.source
    : role === "user"
      ? "patient"
      : "human";
  const parsedAt = new Date(turn.at || 0);

  return {
    role,
    source,
    text,
    eventId: boundedText(turn.eventId, 200),
    templateId: boundedText(turn.templateId, 80).toLowerCase(),
    at: Number.isFinite(parsedAt.getTime())
      ? parsedAt.toISOString()
      : new Date(0).toISOString(),
  };
}

export async function getDurableConversationContext(
  { phone, opportunityId = "", professional = "", limit = MAX_TURNS },
  { callSheetsImpl = callClassificationSheets } = {},
) {
  if (!phone) return { status: "skipped", turns: [] };

  const result = await callSheetsImpl("get_conversation_context", {
    conversation: {
      phone,
      opportunityId: boundedText(opportunityId, 120),
      professional: boundedText(professional, 80),
      limit: Math.max(1, Math.min(MAX_TURNS, Number(limit) || MAX_TURNS)),
    },
  }, { timeoutMs: 6_000 });
  if (result.status !== "completed") {
    return {
      status: "failed",
      errorCode: result.errorCode || "request_failed",
      turns: [],
    };
  }

  const turns = (Array.isArray(result.data?.turns) ? result.data.turns : [])
    .map(normalizeTurn)
    .filter(Boolean)
    .slice(-MAX_TURNS);
  return {
    status: "completed",
    turns,
    opportunityId: boundedText(result.data?.opportunityId, 120),
    professional: boundedText(result.data?.professional, 80),
  };
}

export async function recordDurableConversationTurn(
  {
    phone,
    eventId,
    messageId,
    text,
    at,
    source = "bruna",
    opportunityId = "",
    professional = "",
    templateId = "",
  },
  { callSheetsImpl = callClassificationSheets } = {},
) {
  const normalizedText = boundedText(text, 4_000);
  if (!phone || !eventId || !normalizedText) {
    return { status: "skipped" };
  }

  const result = await callSheetsImpl("record_conversation_turn", {
    conversation: {
      phone,
      eventId: boundedText(eventId, 200),
      messageId: boundedText(messageId || `bruna:${eventId}`, 500),
      text: normalizedText,
      at: at || new Date().toISOString(),
      source: ["bruna", "human", "patient"].includes(source)
        ? source
        : "bruna",
      opportunityId: boundedText(opportunityId, 120),
      professional: boundedText(professional, 80),
      templateId: boundedText(templateId, 80).toLowerCase(),
    },
  }, { timeoutMs: 4_000 });

  return result.status === "completed"
    ? {
        status: "completed",
        duplicate: result.data?.duplicate === true,
      }
    : {
        status: "failed",
        errorCode: result.errorCode || "request_failed",
      };
}
