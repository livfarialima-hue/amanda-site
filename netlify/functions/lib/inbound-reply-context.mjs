import { readConversationTurns, toOpenAIConversation } from "./conversation-memory.mjs";
import { coalesceUnansweredPatientBlock } from "./inbound-burst-context.mjs";
import { PENDING_AUDIO_TEXT } from "./patient-turn-context.mjs";

// Refresh after the quiet window, when all accepted fragments are already in
// the shared cache. Keep durable/canonical metadata from the initial input.
export async function refreshInboundReplyContext(
  input,
  { readConversationTurnsImpl = readConversationTurns, now = Date.now() } = {},
) {
  let latest;
  try {
    latest = await readConversationTurnsImpl(input.phone);
  } catch {
    latest = { status: "failed", turns: [] };
  }
  const completed = latest?.status === "completed";
  const turns = completed ? latest.turns || [] : [];
  const lastClinicAt = Math.max(0, ...turns.filter(turn => turn.role === "assistant").map(turn => Date.parse(turn.at) || 0));
  const pendingAudio = turns.some(turn => turn.text === PENDING_AUDIO_TEXT && turn.eventId !== input.eventId &&
    Date.parse(turn.at) >= lastClinicAt && now - Date.parse(turn.at) < 10 * 60_000);
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
    status: pendingAudio ? "pending_audio" : completed ? "completed" : "failed",
    source: pendingAudio ? "awaiting_audio_transcription" : completed ? "refreshed_inbound_cache" : "volatile_cache_fallback",
    block,
  };
}
