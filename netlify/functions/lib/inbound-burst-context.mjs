const DEFAULT_BURST_WINDOW_MS = 45_000;
const MAX_TURNS = 32;

function limitedText(value, maximum = 1_600) {
  return Array.from(String(value || "").trim()).slice(0, maximum).join("");
}

function normalizedRole(turn) {
  return turn?.role === "assistant" ? "assistant" : "patient";
}

function normalizedSource(turn, role) {
  const source = String(turn?.source || "").trim().toLowerCase();
  if (["human", "equipe_humana"].includes(source)) return "equipe_humana";
  if (source === "bruna") return "bruna";
  return role === "assistant" ? "equipe_humana" : "paciente";
}

function normalizedTurn(turn, sequence) {
  const text = limitedText(turn?.text);
  if (!text) return null;
  const role = normalizedRole(turn);
  const parsedAt = new Date(turn?.at || 0);
  return {
    role,
    source: normalizedSource(turn, role),
    text,
    eventId: limitedText(turn?.eventId, 200),
    templateId: limitedText(turn?.templateId, 80).toLowerCase(),
    at: Number.isFinite(parsedAt.getTime())
      ? parsedAt.toISOString()
      : "",
    sequence,
  };
}

function identity(turn) {
  return turn.eventId
    ? `event:${turn.eventId}`
    : [turn.role, turn.source, turn.at, turn.text].join("|");
}

function chronologicalTurns(recentConversation, currentTurn) {
  const indexed = new Map();
  let sequence = 0;
  for (const candidate of [
    ...(Array.isArray(recentConversation) ? recentConversation : []),
    currentTurn,
  ]) {
    sequence += 1;
    const turn = normalizedTurn(candidate, sequence);
    if (!turn) continue;
    indexed.set(identity(turn), turn);
  }

  return [...indexed.values()]
    .sort((left, right) => {
      const leftAt = new Date(left.at || 0).getTime();
      const rightAt = new Date(right.at || 0).getTime();
      const validTimes = Number.isFinite(leftAt) && Number.isFinite(rightAt);
      return validTimes && leftAt !== rightAt
        ? leftAt - rightAt
        : left.sequence - right.sequence;
    })
    .slice(-MAX_TURNS);
}

function patientTurn(turn) {
  return turn?.role === "patient" && turn?.source === "paciente";
}

function timeGapMs(earlier, later) {
  const earlierAt = new Date(earlier?.at || 0).getTime();
  const laterAt = new Date(later?.at || 0).getTime();
  if (!Number.isFinite(earlierAt) || !Number.isFinite(laterAt)) return 0;
  return laterAt - earlierAt;
}

function publicTurn(turn) {
  return {
    role: turn.role,
    text: turn.text,
    ...(turn.eventId ? { eventId: turn.eventId } : {}),
    ...(turn.templateId ? { templateId: turn.templateId } : {}),
    ...(turn.at ? { at: turn.at } : {}),
    source: turn.source,
  };
}

export function coalesceLatestPatientBurst({
  recentConversation = [],
  currentText,
  currentEventId,
  currentAt,
  maximumGapMs = DEFAULT_BURST_WINDOW_MS,
}) {
  const currentTurn = {
    role: "patient",
    source: "paciente",
    text: currentText,
    eventId: currentEventId,
    at: currentAt,
  };
  const turns = chronologicalTurns(recentConversation, currentTurn);
  const currentIndex = turns.findIndex(
    (turn) =>
      (currentEventId && turn.eventId === String(currentEventId)) ||
      (!currentEventId && turn.sequence === turns.at(-1)?.sequence),
  );

  if (currentIndex < 0 || !patientTurn(turns[currentIndex])) {
    return {
      text: limitedText(currentText),
      recentConversation: turns.map(publicTurn),
      coalesced: false,
      burstTurnCount: 1,
    };
  }

  let burstStart = currentIndex;
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const earlier = turns[index];
    const later = turns[index + 1];
    const gap = timeGapMs(earlier, later);
    if (
      !patientTurn(earlier) ||
      gap < 0 ||
      gap > Math.max(0, Number(maximumGapMs) || DEFAULT_BURST_WINDOW_MS)
    ) {
      break;
    }
    burstStart = index;
  }

  const burst = turns.slice(burstStart, currentIndex + 1);
  return {
    text: burst.map((turn) => turn.text).join("\n"),
    recentConversation: turns.slice(0, burstStart).map(publicTurn),
    coalesced: burst.length > 1,
    burstTurnCount: burst.length,
  };
}
