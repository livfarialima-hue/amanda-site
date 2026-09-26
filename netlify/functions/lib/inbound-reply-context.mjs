import { readConversationTurns, toOpenAIConversation } from "./conversation-memory.mjs";
import { coalesceUnansweredPatientBlock } from "./inbound-burst-context.mjs";

// Refresh after the quiet window, when all accepted fragments are already in
// the shared cache. Keep durable/canonical metadata from the initial input.
export async function refreshInboundReplyContext(
  input,
  { readConversationTurnsImpl = readConversationTurns } = {},
) {
  let latest;
  try {
    latest = await readConversationTurnsImpl(input.phone);
  } catch {
    latest = { status: "failed", turns: [] };
  }
  const completed = latest?.status === "completed";
  const block = coalesceUnansweredPatientBlock({
    recentConversation: [
      ...(completed ? toOpenAIConversation(latest.turns) : []),
      ...(input.recentConversation || []),
    ],
    currentText: input.text,
    currentEventId: input.eventId,
    currentAt: input.receivedAt,
    currentTemplateId: input.templateId,
  });
  return {
    status: completed ? "completed" : "failed",
    source: completed ? "refreshed_inbound_cache" : "volatile_cache_fallback",
    block,
  };
}
