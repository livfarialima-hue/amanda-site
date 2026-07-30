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
    hasPendingHumanTask: value?.hasPendingHumanTask === true,
    pendingTaskType: limitText(value?.pendingTaskType, 80),
  };
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

  const firstName =
    limitText(patientName || relationship.patientName, 120)
      .split(/\s+/)[0] || "";
  const greeting = firstName ? `Oi, ${firstName}!` : "Oi!";
  const suggestion = relationship.state === "active_postop"
    ? `${greeting} Recebi sua mensagem e já vou direcioná-la à equipe para acompanharmos você com o cuidado necessário.`
    : `${greeting} Que bom falar com você novamente. Recebi sua mensagem e vou alinhar esse ponto com a equipe para seguirmos com o seu atendimento por aqui.`;

  return [
    prependRelationshipAlertContext({
      messageText: original,
      relationship,
    }),
    "Sugestão para copiar após conferir:",
    suggestion,
  ].join("\n\n");
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

  const original = limitText(raw, 650);

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
}) {
  if (
    !eventId ||
    !phone ||
    (
      plan?.route !== "human_review" &&
      !appointmentReview
    )
  ) {
    return null;
  }

  const reason = String(plan?.reason || "");
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
