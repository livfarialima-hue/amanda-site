import { isCommercialSolicitation } from "./commercial-contact.mjs";
import {
  introducesStandalonePatientRequest,
  isExplicitDeferralWithoutRequest,
  isExplicitReturnLaterClosing,
  isPatientDeclineWithoutRequest,
} from "./conversation-action-controller.mjs";

const DEFAULT_BURST_WINDOW_MS = 45_000;
const MAX_TURNS = 32;
const DEFAULT_UNANSWERED_BLOCK_WINDOW_MS = 10 * 60 * 1_000;
const MAX_UNANSWERED_BLOCK_TURNS = 8;
const MAX_UNANSWERED_BLOCK_TEXT_LENGTH = 1_900;

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

function measuredTimeGapMs(earlier, later) {
  const earlierAt = new Date(earlier?.at || "").getTime();
  const laterAt = new Date(later?.at || "").getTime();
  if (!Number.isFinite(earlierAt) || !Number.isFinite(laterAt)) return null;
  return laterAt - earlierAt;
}

function isPatientBlockBoundary(turn) {
  return Boolean(
    turn?.templateId ||
      isCommercialSolicitation(turn?.text) ||
      isExplicitDeferralWithoutRequest(turn?.text) ||
      isExplicitReturnLaterClosing(turn?.text) ||
      isPatientDeclineWithoutRequest(turn?.text),
  );
}

function substantivePatientContent(turn) {
  return String(turn?.text || "")
    .replace(
      /^(?:(?:oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite)[,!\s]*)+/i,
      "",
    )
    .trim();
}

function isSubstantivePatientContent(turn) {
  return /[\p{L}\p{N}]/u.test(substantivePatientContent(turn));
}

function isSubstantivePatientRequest(turn) {
  const value = substantivePatientContent(turn);
  return Boolean(
    isSubstantivePatientContent(turn) &&
      introducesStandalonePatientRequest(value),
  );
}

function boundedPatientBlock(turns, start, end) {
  let blockStart = Math.max(start, end - MAX_UNANSWERED_BLOCK_TURNS + 1);
  let block = turns.slice(blockStart, end + 1);
  while (
    block.length > 1 &&
    block.map((turn) => turn.text).join("\n").length >
      MAX_UNANSWERED_BLOCK_TEXT_LENGTH
  ) {
    blockStart += 1;
    block = turns.slice(blockStart, end + 1);
  }
  return { block, blockStart };
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

export function coalesceUnansweredPatientBlock({
  recentConversation = [],
  currentText,
  currentEventId,
  currentAt,
  currentTemplateId = "",
  maximumGapMs = DEFAULT_UNANSWERED_BLOCK_WINDOW_MS,
}) {
  const currentTurn = {
    role: "patient",
    source: "paciente",
    text: currentText,
    eventId: currentEventId,
    at: currentAt,
    templateId: currentTemplateId,
  };
  const turns = chronologicalTurns(recentConversation, currentTurn);
  const currentIndex = turns.findIndex(
    (turn) =>
      (currentEventId && turn.eventId === String(currentEventId)) ||
      (!currentEventId && turn.sequence === turns.at(-1)?.sequence),
  );

  const unchanged = () => ({
    text: limitedText(currentText),
    recentConversation: turns
      .filter((_turn, index) => index !== currentIndex)
      .map(publicTurn),
    coalesced: false,
    blockTurnCount: 1,
    substantiveRequestCount:
      currentIndex >= 0 && isSubstantivePatientRequest(turns[currentIndex])
        ? 1
        : 0,
    substantiveTurnCount:
      currentIndex >= 0 && isSubstantivePatientContent(turns[currentIndex])
        ? 1
        : 0,
    multipleRequests: false,
    requiresContextualReply: false,
  });

  if (
    currentIndex < 0 ||
    !patientTurn(turns[currentIndex]) ||
    isPatientBlockBoundary(turns[currentIndex])
  ) {
    return unchanged();
  }

  let blockStart = currentIndex;
  const allowedGapMs = Math.max(
    0,
    Number(maximumGapMs) || DEFAULT_UNANSWERED_BLOCK_WINDOW_MS,
  );
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const earlier = turns[index];
    const later = turns[index + 1];
    const gap = measuredTimeGapMs(earlier, later);
    const totalGap = measuredTimeGapMs(earlier, turns[currentIndex]);
    if (
      !patientTurn(earlier) ||
      isPatientBlockBoundary(earlier) ||
      gap === null ||
      totalGap === null ||
      gap < 0 ||
      gap > allowedGapMs ||
      totalGap > allowedGapMs
    ) {
      break;
    }
    blockStart = index;
  }

  const bounded = boundedPatientBlock(turns, blockStart, currentIndex);
  const requestCount = bounded.block.filter(isSubstantivePatientRequest).length;
  const substantiveTurnCount = bounded.block.filter(
    isSubstantivePatientContent,
  ).length;
  return {
    text: bounded.block.map((turn) => turn.text).join("\n"),
    recentConversation: turns.slice(0, bounded.blockStart).map(publicTurn),
    coalesced: bounded.block.length > 1,
    blockTurnCount: bounded.block.length,
    substantiveRequestCount: requestCount,
    substantiveTurnCount,
    multipleRequests: requestCount > 1,
    requiresContextualReply: Boolean(
      requestCount > 1 ||
        (requestCount > 0 && substantiveTurnCount > 1),
    ),
  };
}
