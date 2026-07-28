import { isAppointmentPreferenceReply } from "./appointment-suggestions.mjs";
import { isSchedulingRequest } from "./whatsapp-automation.mjs";

const CLOSING_PATTERN =
  /^(?:(?:(?:muito\s+)?obrigad[ao](?:\s+pela\s+ajuda)?|agrade[cç]o|grata|valeu|ok(?:ay)?|t[aá]\s+bom|tudo bem|entendi|perfeito|combinado|certo|beleza|j[aá]\s+entendi|sem problemas|at[eé](?:\s+(?:mais|logo|amanh[aã]|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo))?)[,!.?\s]*)+$/i;
const SCHEDULING_CONTEXT_PATTERN =
  /\b(?:agenda|agendar|marcar|hor[aá]rio|data|dia|per[ií]odo|disponibilidade|consulta\s+(?:para|em)|\d{1,2}(?::|h)\d{0,2})\b/i;
const CONFIRMATION_PATTERN =
  /\b(?:confirmo|confirmar|pode\s+ser|fechado|combinado|esse\s+hor[aá]rio|essa\s+data|nesse\s+dia)\b/i;

const SENSITIVE_REASONS = new Set([
  "surgical_price_review",
  "price_without_confirmed_procedure",
  "possible_urgent_symptoms",
  "intense_appearance_distress",
  "existing_patient_administrative_followup",
  "unsupported_or_empty_message",
  "cardiology_or_dr_daniel",
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

  for (
    let candidate = now + step;
    candidate <= now + 48 * 60 * 60 * 1_000;
    candidate += step
  ) {
    if (isHumanResumeServiceOpen(candidate, env)) return candidate;
  }

  return now + 12 * 60 * 60 * 1_000;
}

function hasSchedulingContext(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .slice(-4)
    .some((turn) =>
      SCHEDULING_CONTEXT_PATTERN.test(String(turn?.text || "")),
    );
}

export function classifyHumanResume({
  text,
  messageType,
  preliminaryPlan,
  enrichedPlan,
  recentConversation,
}) {
  const normalizedText = String(text || "").trim();

  if (
    String(messageType || "text").toLowerCase() !== "text" ||
    !normalizedText
  ) {
    return {
      action: "sensitive",
      reason: "unsupported_or_empty_message",
    };
  }

  if (
    preliminaryPlan?.route === "ignore" ||
    enrichedPlan?.route === "ignore" ||
    CLOSING_PATTERN.test(normalizedText)
  ) {
    return {
      action: "no_action",
      reason: "conversation_closing_or_ignored",
    };
  }

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

  if (scheduling) {
    return {
      action: "sensitive",
      reason: "scheduling_or_confirmation",
    };
  }

  const reasons = [
    preliminaryPlan?.reason,
    enrichedPlan?.reason,
  ].filter(Boolean);

  if (
    preliminaryPlan?.route === "daniel_greeting_and_alert" ||
    enrichedPlan?.route === "daniel_greeting_and_alert" ||
    reasons.some((reason) => SENSITIVE_REASONS.has(reason))
  ) {
    return {
      action: "sensitive",
      reason: reasons[0] || "reserved_topic",
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
    action: "holding_and_alert",
    reason: enrichedPlan?.reason || "low_confidence",
  };
}

export const HUMAN_RESUME_HOLDING_MESSAGE =
  "Recebi sua mensagem e vou confirmar essa informação com a equipe para te responder com segurança.";
