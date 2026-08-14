const BUSINESS_MILESTONE_SHEET = "_OPORTUNIDADE_MARCOS";

const BUSINESS_MILESTONE_HEADERS = Object.freeze([
  "Event ID",
  "Opportunity ID",
  "Marco",
  "Data e hora",
  "Origem",
  "Confiança",
  "Estado",
  "Criado em",
]);

const BUSINESS_MILESTONE_TYPES = Object.freeze([
  "quote_sent",
  "accepted",
  "completed",
  "payment_confirmed",
]);

function normalizarMarcoOportunidade_(input) {
  const opportunityId = boundedText_(input && input.opportunityId, 120);
  const milestone = boundedText_(input && input.milestone, 80);
  const eventId = boundedText_(input && input.eventId, 220);
  const source = boundedText_(input && input.source, 80);
  const confidence = boundedText_(input && input.confidence, 20);
  const at = new Date(input && input.at || Date.now());
  if (!eventId) return { ok: false, reason: "event_id_required" };
  if (!opportunityId) {
    return { ok: false, reason: "opportunity_id_required" };
  }
  if (BUSINESS_MILESTONE_TYPES.indexOf(milestone) < 0) {
    return { ok: false, reason: "invalid_business_milestone" };
  }
  if (Number.isNaN(at.getTime())) {
    return { ok: false, reason: "invalid_business_milestone_date" };
  }
  return {
    ok: true,
    eventId,
    opportunityId,
    milestone,
    at,
    source: source || "unknown",
    confidence: ["high", "medium", "low"].includes(confidence)
      ? confidence
      : "low",
  };
}

function registrarMarcoOportunidade_(spreadsheet, input) {
  const milestone = normalizarMarcoOportunidade_(input || {});
  if (!milestone.ok) return milestone;
  const identity = resolverOportunidadeCanonica_(spreadsheet, {
    opportunityId: milestone.opportunityId,
  });
  if (!identity.ok) return identity;
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    BUSINESS_MILESTONE_SHEET,
    BUSINESS_MILESTONE_HEADERS,
  );
  if (sheet.getLastRow() >= 2) {
    const duplicate = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(milestone.eventId)
      .matchEntireCell(true)
      .findNext();
    if (duplicate) {
      return { ok: true, created: false, duplicate: true };
    }
  }
  sheet.appendRow([
    milestone.eventId,
    milestone.opportunityId,
    milestone.milestone,
    milestone.at,
    milestone.source,
    milestone.confidence,
    milestone.confidence === "low" ? "review_required" : "recorded",
    new Date(),
  ]);
  return { ok: true, created: true, duplicate: false };
}
