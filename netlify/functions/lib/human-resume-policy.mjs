import { isAppointmentPreferenceReply } from "./appointment-suggestions.mjs";
import { detectPatientAppointmentReply } from "./appointment-confirmation.mjs";
import { isSchedulingRequest } from "./whatsapp-automation.mjs";
import {
  CONVERSATION_ACTIONS,
  decideConversationAction,
  hasUnresolvedPatientRequest,
  isExplicitDeferralWithoutRequest,
  isReplyToHumanContextWithoutStandaloneRequest,
  isShortAffirmativeReplyToHumanQuestion,
} from "./conversation-action-controller.mjs";

const SCHEDULING_CONTEXT_PATTERN =
  /\b(?:agenda|agendar|marcar|hor[aá]rio|data|dia|per[ií]odo|disponibilidade|consulta\s+(?:para|em)|\d{1,2}(?::|h)\d{0,2})\b/i;
const CONFIRMATION_PATTERN =
  /\b(?:confirmo|confirmar|pode\s+ser|fechado|combinado|esse\s+hor[aá]rio|essa\s+data|nesse\s+dia)\b/i;
const SIMPLE_COORDINATION_COMMITMENT_PATTERN =
  /\b(?:vou|iremos|tentarei|vamos)\s+(?:tentar\s+)?(?:acessar|achar|buscar|encaminhar|enviar|localizar|mandar|passar|separar)\b/i;
const SIMPLE_COORDINATION_PERMISSION_PATTERN =
  /\b(?:pode|podem)\s+(?:dar\s+andamento|emitir|encaminhar|enviar|fazer|mandar|prosseguir)(?:\s+(?:sim|tranquilamente|sem\s+problemas))?\b/i;
const SIMPLE_COORDINATION_REQUEST_PATTERN =
  /\b(?:(?:você|vocês)\s+(?:pode|podem|consegue|conseguem)|(?:me|nos)\s+(?:avisa|avise|confirma|confirme|envia|envie|manda|mande)|gostaria|preciso|quero)\b/i;
const SIMPLE_COORDINATION_RISK_PATTERN =
  /\b(?:alergia|complica[cç][aã]o|desmaio|dor\s+(?:forte|intensa)|febre|falta\s+de\s+ar|medica[cç][aã]o|rem[eé]dio|sangramento|secre[cç][aã]o|urgente|urgência)\b/i;

const SENSITIVE_REASONS = new Set([
  "surgical_price_review",
  "price_without_confirmed_procedure",
  "surgical_price_range_review",
  "price_range_without_confirmed_procedure",
  "surgical_price_terms_review",
  "possible_urgent_symptoms",
  "intense_appearance_distress",
  "existing_patient_administrative_followup",
  "unsupported_or_empty_message",
  "cardiology_or_dr_daniel",
]);
const OVERNIGHT_HANDOFF_REASONS = new Set([
  "scheduling_or_confirmation",
  "surgical_price_review",
  "price_without_confirmed_procedure",
  "surgical_price_range_review",
  "price_range_without_confirmed_procedure",
  "surgical_price_terms_review",
]);

function localHour(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    hour: values.hour,
    minute: values.minute,
  };
}

function boundedHour(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23
    ? parsed
    : fallback;
}

export function isHumanResumeServiceOpen(
  now = Date.now(),
  env = process.env,
) {
  const timeZone =
    String(env.HUMAN_RESUME_TIME_ZONE || "").trim() ||
    "America/Sao_Paulo";
  const startHour = boundedHour(
    env.HUMAN_RESUME_START_HOUR,
    8,
  );
  const endHour = boundedHour(
    env.HUMAN_RESUME_END_HOUR,
    20,
  );
  const current = localHour(now, timeZone);
  const minutes = current.hour * 60 + current.minute;

  return (
    minutes >= startHour * 60 &&
    minutes < endHour * 60
  );
}

export function nextHumanResumeServiceTime(
  now = Date.now(),
  env = process.env,
) {
  const step = 5 * 60 * 1_000;
  const firstCandidate = Math.ceil((now + 1) / step) * step;

  for (
    let candidate = firstCandidate;
    candidate <= now + 48 * 60 * 60 * 1_000;
    candidate += step
  ) {
    if (isHumanResumeServiceOpen(candidate, env)) return candidate;
  }

  return now + 12 * 60 * 60 * 1_000;
}

export function shouldSendOvernightHandoff(reason) {
  return OVERNIGHT_HANDOFF_REASONS.has(String(reason || ""));
}

export function buildOvernightHandoffMessage(
  reason,
  { text = "", procedure = "" } = {},
) {
  const procedureLabel = String(procedure || "")
    .replaceAll("_", " ")
    .trim();
  if (
    [
      "surgical_price_review",
      "price_without_confirmed_procedure",
      "surgical_price_range_review",
      "price_range_without_confirmed_procedure",
      "surgical_price_terms_review",
    ]
      .includes(String(reason || ""))
  ) {
    const pendingTopic = /parcel|quantas?\s+vezes/i.test(text)
      ? "a quantidade de parcelas disponível"
      : /desconto|[àa]\s+vista/i.test(text)
        ? "a condição atual de desconto à vista"
        : procedureLabel
          ? `a informação de valor para ${procedureLabel}`
          : "a informação de valor do procedimento";
    return `Anotei sua pergunta sobre ${pendingTopic}. A equipe confere esse ponto e retoma por aqui amanhã pela manhã.`;
  }

  if (String(reason || "") === "scheduling_or_confirmation") {
    return "Anotei seu pedido de horário para a avaliação. A equipe confere a disponibilidade e retoma por aqui amanhã pela manhã.";
  }

  return "";
}

function hasSchedulingContext(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .slice(-4)
    .some((turn) =>
      SCHEDULING_CONTEXT_PATTERN.test(String(turn?.text || "")),
    );
}

function coordinationSubstance(text) {
  return String(text || "")
    .trim()
    .replace(
      /^(?:oi[,!\s]*)?(?:tudo\s+bem|como\s+vai)\s*\?+\s*/i,
      "",
    )
    .replace(
      /[,!\s]*(?:ok|tudo\s+bem|certo|combinado)\s*\?+\s*$/i,
      "",
    )
    .trim();
}

export function classifySimpleCoordinationAcknowledgement(
  text,
  recentConversation = [],
) {
  const value = coordinationSubstance(text);
  const hasConversationContext = (
    Array.isArray(recentConversation)
      ? recentConversation
      : []
  ).some((turn) => turn?.role === "assistant");

  if (
    !value ||
    !hasConversationContext ||
    value.includes("?") ||
    SIMPLE_COORDINATION_REQUEST_PATTERN.test(value) ||
    SIMPLE_COORDINATION_RISK_PATTERN.test(value)
  ) {
    return null;
  }

  if (SIMPLE_COORDINATION_COMMITMENT_PATTERN.test(value)) {
    return /\bexames?\b/i.test(value)
      ? "send_exams_later"
      : "send_material_later";
  }

  if (SIMPLE_COORDINATION_PERMISSION_PATTERN.test(value)) {
    return "permission_confirmed";
  }

  return null;
}

function usableFirstName(value) {
  const firstName = String(value || "")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^\p{L}\p{M}'’-]/gu, "");
  return firstName && firstName.length >= 2 ? firstName : "";
}

export function buildSimpleCoordinationReply({
  kind,
  patientName,
} = {}) {
  const firstName = usableFirstName(patientName);
  const opening = firstName ? `Perfeito, ${firstName}.` : "Perfeito.";

  if (kind === "send_exams_later") {
    return `${opening} Pode nos enviar os exames quando conseguir.`;
  }

  if (kind === "send_material_later") {
    return `${opening} Pode nos enviar quando conseguir.`;
  }

  return `${opening} Obrigada pela confirmação.`;
}

export const hasConcreteResponseExpectation =
  hasUnresolvedPatientRequest;
export { isExplicitDeferralWithoutRequest };

export function classifyHumanResume({
  text,
  messageType,
  preliminaryPlan,
  enrichedPlan,
  recentConversation,
}) {
  const normalizedText = String(text || "").trim();
  const scheduling =
    isSchedulingRequest(normalizedText) ||
    isAppointmentPreferenceReply(
      normalizedText,
      recentConversation,
    ) ||
    (
      CONFIRMATION_PATTERN.test(normalizedText) &&
      hasSchedulingContext(recentConversation)
    );
  const conversationAction = decideConversationAction({
    text: normalizedText,
    messageType,
    plan: enrichedPlan || preliminaryPlan,
    recentConversation,
    humanTakeoverActive: false,
    schedulingRequest: scheduling,
  });

  if (
    conversationAction.action ===
    CONVERSATION_ACTIONS.CLOSED
  ) {
    return {
      action: "no_action",
      reason: "conversation_closing_or_ignored",
    };
  }

  const appointmentReply = detectPatientAppointmentReply({
    currentText: normalizedText,
    recentConversation,
  });
  if (appointmentReply?.state === "confirmed") {
    return {
      action: "no_action",
      reason: "appointment_attendance_confirmed",
    };
  }

  if (
    conversationAction.action ===
    CONVERSATION_ACTIONS.WAIT_PATIENT
  ) {
    return {
      action: "alert_only",
      reason: conversationAction.reason,
    };
  }

  if (scheduling) {
    return {
      action: "sensitive",
      reason: "scheduling_or_confirmation",
    };
  }

  const simpleCoordination =
    classifySimpleCoordinationAcknowledgement(
      normalizedText,
      recentConversation,
    );
  if (simpleCoordination) {
    return {
      action: "attempt_reply",
      reason: "semantic_coordination_candidate",
      replyKind: simpleCoordination,
    };
  }

  const reasons = [
    preliminaryPlan?.reason,
    enrichedPlan?.reason,
  ].filter(Boolean);
  const sensitiveReason = reasons.find((reason) =>
    SENSITIVE_REASONS.has(reason),
  );

  if (
    preliminaryPlan?.route === "daniel_greeting_and_alert" ||
    enrichedPlan?.route === "daniel_greeting_and_alert" ||
    sensitiveReason
  ) {
    return {
      action: "sensitive",
      reason: sensitiveReason || reasons[0] || "reserved_topic",
    };
  }

  if (
    (
      isReplyToHumanContextWithoutStandaloneRequest(
        normalizedText,
        recentConversation,
      ) ||
      isShortAffirmativeReplyToHumanQuestion(
        normalizedText,
        recentConversation,
      )
    ) &&
    hasUnresolvedPatientRequest(
      normalizedText,
      recentConversation,
    )
  ) {
    return {
      action: "attempt_reply",
      reason: "semantic_context_continuation_candidate",
    };
  }

  if (
    enrichedPlan?.route === "standard_reply" &&
    enrichedPlan?.automaticAllowed === true
  ) {
    return {
      action: "attempt_reply",
      reason: enrichedPlan.reason,
    };
  }

  return {
    action: conversationAction.allowHoldingReply
      ? "holding_and_alert"
      : "alert_only",
    reason: enrichedPlan?.reason || "low_confidence",
  };
}

export const HUMAN_RESUME_HOLDING_MESSAGE =
  "";
