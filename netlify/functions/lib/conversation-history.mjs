import { UNAVAILABLE_PATIENT_TEXT, PENDING_AUDIO_TEXT } from "./patient-turn-context.mjs";

// Historical evidence for the model only. This does not enlarge the operational
// windows used for consent, scheduling, ownership or message delivery.
export const FULL_CONVERSATION_CHARACTER_BUDGET = 120_000;
export const FULL_CONVERSATION_TURN_CHARACTERS = 32_768;

function bounded(value, maximum) {
  const text = Array.from(String(value || "").trim());
  if (text.length <= maximum) return text.join("");
  return text.slice(0, maximum - 24).join("") + " [conteúdo omitido]";
}

function normalizeTurn(turn, recentProjection = false) {
  if (!turn || typeof turn !== "object") return null;
  const role = turn.role === "assistant" ? "assistant" : "patient";
  const source = role !== "assistant" ? "paciente" :
    turn.source === "bruna" ? "bruna" :
    ["human", "equipe_humana", "human_team"].includes(turn.source) ? "equipe_humana" : "clinica_autoria_desconhecida";
  const original = String(turn.text || "").trim();
  const uncertainAudio = /^\[(?:Transcrição incerta de áudio|Áudio de conteúdo não confirmado)/i.test(original);
  const text = uncertainAudio ? "[Áudio de conteúdo não confirmado; aguardar atendimento humano.]" :
    bounded(original, FULL_CONVERSATION_TURN_CHARACTERS) || UNAVAILABLE_PATIENT_TEXT;
  const at = Date.parse(turn.at);
  return {
    role, source, text,
    ...(Number.isFinite(at) ? { at: new Date(at).toISOString() } : {}),
    ...Object.fromEntries(["eventId", "messageId", "relatedMessageId", "templateId"].flatMap(key =>
      turn[key] ? [[key, bounded(turn[key], key === "templateId" ? 80 : 500)]] : [])),
    messageType: uncertainAudio || /^\[(?:Transcrição|Áudio)/i.test(original) ? "audio" : bounded(turn.messageType || "unknown", 40),
    ...(turn.textTruncated === true || recentProjection && original.includes(" … ") || Array.from(original).length > FULL_CONVERSATION_TURN_CHARACTERS ? { textTruncated: true } : {}),
  };
}

function unavailable(turn) {
  return [UNAVAILABLE_PATIENT_TEXT, PENDING_AUDIO_TEXT].includes(turn.text) ||
    /^\[(?:Áudio de conteúdo não confirmado|Conteúdo indisponível)/.test(turn.text);
}

function identity(turn) {
  return turn.eventId ? `event:${turn.eventId}` : turn.messageId ? `message:${turn.messageId}` :
    [turn.role, turn.source, turn.at || "", turn.text].join("|");
}

function mergeCopies(previous, next) {
  if (!previous) return next;
  const useNextText = unavailable(previous) && !unavailable(next) ||
    !unavailable(next) && next.text.length > previous.text.length;
  const chosen = useNextText ? next : previous;
  const merged = { ...next, ...previous, text: chosen.text };
  if (chosen.textTruncated) merged.textTruncated = true;
  else delete merged.textTruncated;
  if (previous.source === "clinica_autoria_desconhecida" && next.source === "equipe_humana") merged.source = next.source;
  if (previous.messageType === "audio" || next.messageType === "audio") merged.messageType = "audio";
  return merged;
}

export function buildFullConversationContext(durable, recentConversation = []) {
  const full = durable?.status === "completed" && durable.historyMode === "full";
  const indexed = new Map();
  const aliases = new Map();
  for (const [raw, recentProjection] of [...(full ? durable.turns || [] : []).map(turn => [turn, false]), ...(recentConversation || []).map(turn => [turn, true])]) {
    const turn = normalizeTurn(raw, recentProjection);
    if (!turn) continue;
    const identities = [turn.eventId && `event:${turn.eventId}`, turn.messageId && `message:${turn.messageId}`].filter(Boolean);
    if (!identities.length) identities.push(identity(turn));
    const matches = [...new Set(identities.map(id => aliases.get(id)).filter(key => key !== undefined))];
    const key = matches[0] ?? identities[0];
    let previous = indexed.get(key);
    for (const duplicate of matches.slice(1)) {
      previous = mergeCopies(previous, indexed.get(duplicate));
      indexed.delete(duplicate);
      for (const [alias, owner] of aliases) if (owner === duplicate) aliases.set(alias, key);
    }
    // A short cache projection must not replace the original ledger text.
    indexed.set(key, mergeCopies(previous, turn));
    for (const alias of identities) aliases.set(alias, key);
  }
  const all = [...indexed.values()].sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0));
  let turns = all;
  if (JSON.stringify(all).length > FULL_CONVERSATION_CHARACTER_BUDGET) {
    // Preserve the opening and the latest exchanges, with an explicit gap.
    const head = [], tail = [];
    let used = 2;
    for (const turn of all) {
      const size = JSON.stringify(turn).length + 1;
      if (used + size > FULL_CONVERSATION_CHARACTER_BUDGET / 4) break;
      head.push(turn); used += size;
    }
    for (let index = all.length - 1; index >= head.length; index -= 1) {
      const size = JSON.stringify(all[index]).length + 1;
      if (used + size > FULL_CONVERSATION_CHARACTER_BUDGET) break;
      tail.unshift(all[index]); used += size;
    }
    turns = [...head, ...tail];
  }
  const omittedTurns = Math.max(0, Number(durable?.coverage?.omittedTurns) || 0) + all.length - turns.length;
  const truncatedTurns = turns.filter(turn => turn.textTruncated).length;
  return {
    turns,
    coverage: {
      source: full ? "canonical_conversation_ledger" : "recent_context_fallback",
      scope: "current_opportunity_and_professional",
      status: full && !omittedTurns && !truncatedTurns ? "all_available" : "partial",
      returnedTurns: turns.length, omittedTurns, truncatedTurns,
      ...(full ? { availableTurns: Math.max(all.length, Number(durable.coverage?.availableTurns) || 0) } : {}),
      excludedUnlinkedHumanTurns: Math.max(0, Number(durable?.coverage?.excludedUnlinkedHumanTurns) || 0),
      excludedUnlinkedLedgerTurns: Math.max(0, Number(durable?.coverage?.excludedUnlinkedLedgerTurns) || 0),
      providerHistoryMayBeIncomplete: true,
      ...(full ? {} : { reason: durable?.errorCode || "full_history_unavailable" }),
      firstAt: turns[0]?.at || "", lastAt: turns.at(-1)?.at || "",
    },
  };
}
