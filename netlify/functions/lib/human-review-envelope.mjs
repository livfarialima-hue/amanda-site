import { reviewOwnerForProfessional } from "./professional-registry.mjs";

export const NO_SAFE_REVIEW_SUGGESTION =
  "SEM SUGESTÃO PRONTA — leia o histórico completo antes de responder. Se o contexto continuar ambíguo ou depender de decisão clínica, mantenha o caso com a pessoa responsável.";

function limited(value, maxLength) {
  return String(value || "").replace(/[ \t]+/g, " ").trim().slice(0, maxLength);
}

function safeCode(value, fallback) {
  const code = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return code || fallback;
}

function relationshipState(value) {
  const raw = typeof value === "object" && value
    ? value.state || value.relationshipState
    : value;
  return safeCode(raw, "unknown");
}

export function buildHumanReviewEnvelope({
  reason,
  professional,
  relationship,
  contextSummary,
  suggestedReply,
  suggestionAvailable = false,
  urgent = false,
  risk = "",
  owner = "",
  actionRequired = "Conferir a solicitação no contexto e decidir a resposta pelo WhatsApp.",
} = {}) {
  const rawSuggestion = String(suggestedReply || "").trim();
  const suggestion = rawSuggestion.length <= 1_500 ? rawSuggestion : "";
  const normalizedRisk = ["low", "medium", "high"].includes(
    String(risk || "").toLowerCase(),
  )
    ? String(risk).toLowerCase()
    : urgent
      ? "high"
      : "medium";

  return Object.freeze({
    reason: safeCode(reason, "human_review_required"),
    owner: limited(owner, 120) || reviewOwnerForProfessional(professional),
    professional: safeCode(professional, "unknown"),
    relationship: relationshipState(relationship),
    risk: normalizedRisk,
    actionRequired: limited(actionRequired, 400),
    contextSummary: limited(contextSummary, 3_500),
    suggestionStatus: suggestion
      ? "ready_for_human_review"
      : !rawSuggestion && suggestionAvailable
        ? "ready_in_context"
        : "none_safe",
    suggestedReply: suggestion,
  });
}

export function formatHumanReviewEnvelope(envelope) {
  const value = envelope || buildHumanReviewEnvelope();
  const header = [
    "REVISÃO HUMANA — CONTEXTO OPERACIONAL",
    `Motivo: ${value.reason}`,
    `Responsável: ${value.owner}`,
    `Profissional: ${value.professional}`,
    `Relação: ${value.relationship}`,
    `Risco: ${value.risk}`,
    `Ação necessária: ${value.actionRequired || "Revisar a solicitação."}`,
  ];
  const content = value.contextSummary
    ? ["Contexto para conferência:", value.contextSummary]
    : [];
  const suggestion = value.suggestedReply
    ? ["Sugestão para copiar após conferir:", value.suggestedReply]
    : value.suggestionStatus === "ready_in_context"
      ? []
      : [NO_SAFE_REVIEW_SUGGESTION];

  return [...header, ...suggestion, ...content].filter(Boolean).join("\n");
}
