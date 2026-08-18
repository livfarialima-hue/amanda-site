import { isCommercialSolicitation } from "./commercial-contact.mjs";

const RELATIONSHIP_STATES = new Set([
  "new_lead",
  "engaged_lead",
  "appointment_scheduled",
  "consultation_completed",
  "surgical_planning",
  "active_postop",
  "former_patient",
  "known_patient",
  "unknown",
]);

const ACTIVE_CARE_STATES = new Set([
  "appointment_scheduled",
  "consultation_completed",
  "surgical_planning",
  "active_postop",
]);

const KNOWN_PATIENT_STATES = new Set([
  ...ACTIVE_CARE_STATES,
  "former_patient",
  "known_patient",
]);

const LABELS = Object.freeze({
  new_lead: "lead novo",
  engaged_lead: "lead em conversa",
  appointment_scheduled: "consulta agendada",
  consultation_completed: "consulta recente",
  surgical_planning: "planejamento em andamento",
  active_postop: "acompanhamento pós-operatório",
  former_patient: "paciente antiga",
  known_patient: "paciente já conhecida",
  unknown: "histórico não localizado",
});

function limitText(value, maximumLength) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function activeBoolean(value) {
  if (value === true || value === 1) return true;

  return ["true", "sim", "1", "yes"].includes(
    String(value || "").trim().toLowerCase(),
  );
}

export function normalizePatientRelationship(value) {
  const state = String(value?.state || value?.relationshipState || "unknown")
    .trim()
    .toLowerCase();
  const normalizedState = RELATIONSHIP_STATES.has(state)
    ? state
    : "unknown";

  return {
    found:
      value?.found === true ||
      KNOWN_PATIENT_STATES.has(normalizedState),
    state: normalizedState,
    label: LABELS[normalizedState],
    patientName: limitText(value?.patientName, 120),
    professional: limitText(value?.professional, 80),
    procedureTopic: limitText(value?.procedureTopic, 160),
    hasPendingHumanTask: value?.hasPendingHumanTask === true,
    pendingTaskType: limitText(value?.pendingTaskType, 80),
    contactPreferencesFound:
      value?.contactPreferencesFound === true,
    neverFollowUp: activeBoolean(value?.neverFollowUp),
    neverBotReply: activeBoolean(value?.neverBotReply),
    // Administrative only. Never include this field in model prompts or
    // patient-facing copy.
    blockReason: limitText(value?.blockReason, 240),
  };
}

export function blocksAutomatedPatientMessages(value) {
  return normalizePatientRelationship(value).neverBotReply;
}

export function isKnownPatientRelationship(value) {
  return KNOWN_PATIENT_STATES.has(
    normalizePatientRelationship(value).state,
  );
}

export function applyPatientRelationshipPolicy(
  plan,
  relationshipValue,
) {
  const relationship =
    normalizePatientRelationship(relationshipValue);

  if (relationship.neverBotReply) {
    return {
      ...plan,
      route: "human_review",
      requestReason:
        plan?.requestReason || plan?.reason || "",
      reason: "contact_preference_no_bot",
      replyCode: null,
      automaticAllowed: false,
      patientRelationship: relationship,
    };
  }

  if (!isKnownPatientRelationship(relationship)) {
    return { ...plan, patientRelationship: relationship };
  }

  if (
    ACTIVE_CARE_STATES.has(relationship.state) ||
    relationship.hasPendingHumanTask
  ) {
    return {
      ...plan,
      route: "human_review",
      requestReason:
        plan?.requestReason || plan?.reason || "",
      reason:
        relationship.state === "active_postop"
          ? "known_patient_active_postop"
          : relationship.hasPendingHumanTask
            ? "known_patient_pending_human_task"
            : "known_patient_active_care",
      replyCode: null,
      automaticAllowed: false,
      patientRelationship: relationship,
    };
  }

  if (plan?.route === "human_review" || plan?.route === "ignore") {
    return { ...plan, patientRelationship: relationship };
  }

  return {
    ...plan,
    route: "standard_reply",
    reason: plan?.procedure
      ? "returning_patient_new_interest"
      : "returning_patient_reconnection",
    automaticAllowed: true,
    patientRelationship: relationship,
  };
}

export function patientRelationshipPromptContext(value) {
  const relationship = normalizePatientRelationship(value);

  return {
    knownPatient: isKnownPatientRelationship(relationship),
    state: relationship.state,
    label: relationship.label,
    hasPendingHumanTask: relationship.hasPendingHumanTask,
  };
}

export function buildRelationshipAlertMessage({
  messageText,
  relationship: relationshipValue,
  patientName,
}) {
  const relationship =
    normalizePatientRelationship(relationshipValue);
  const original =
    limitText(messageText, 420) || "Mensagem sem texto.";

  if (!isKnownPatientRelationship(relationship)) return original;

  return prependRelationshipAlertContext({
    messageText: original,
    relationship,
  });
}

export function prependRelationshipAlertContext({
  messageText,
  relationship: relationshipValue,
}) {
  const relationship =
    normalizePatientRelationship(relationshipValue);
  const raw =
    String(messageText || "").trim() || "Mensagem sem texto.";

  if (!isKnownPatientRelationship(relationship)) return raw;

  const original = limitText(raw, 980);

  return [
    `Relacionamento: ${relationship.label}.`,
    original,
  ].join("\n");
}

export function buildPatientCommitment({
  eventId,
  phone,
  plan,
  appointmentReview = false,
  receivedAt,
  messageText,
}) {
  if (
    !eventId ||
    !phone ||
    isCommercialSolicitation(messageText) ||
    (
      plan?.route !== "human_review" &&
      !appointmentReview
    )
  ) {
    return null;
  }

  const reason = [plan?.reason, plan?.requestReason]
    .filter(Boolean)
    .join(" ");
  let kind = "human_review";
  let summary = "Revisar a solicitação e responder pelo WhatsApp.";

  if (appointmentReview || /schedul|agenda|appointment/.test(reason)) {
    kind = "scheduling";
    summary = "Conferir agenda e responder com opções válidas.";
  } else if (/hospital/.test(reason)) {
    kind = "hospital_quote";
    summary = "Confirmar a informação hospitalar prometida.";
  } else if (/price|preco|valor|orcamento/.test(reason)) {
    kind = "procedure_price";
    summary = "Conferir a faixa atual e responder manualmente.";
  } else if (/postop|active_care|pending_human_task/.test(reason)) {
    kind = "care_journey";
    summary = "Revisar o contexto de cuidado antes de responder.";
  }

  const base = new Date(receivedAt || Date.now());
  const due = Number.isNaN(base.getTime())
    ? new Date(Date.now() + 4 * 60 * 60 * 1000)
    : new Date(base.getTime() + 4 * 60 * 60 * 1000);

  return {
    eventId: String(eventId),
    phone: String(phone),
    kind,
    summary,
    owner: "Amanda/equipe",
    dueAt: due.toISOString(),
    source: "WhatsApp — revisão humana",
  };
}
