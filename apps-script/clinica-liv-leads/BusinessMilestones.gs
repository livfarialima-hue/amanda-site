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

// Administrative invalidation is an owner operation. It preserves the original
// event and all evidence columns; consumers already exclude the typed voided state.
function planejarInvalidacaoMarcoAuditada_(spreadsheet, input, preview) {
  if (!input || !/^opp_[A-Za-z0-9_-]{8,160}$/.test(String(input.opportunityId || "")) ||
      !String(input.eventId || "").trim() || String(input.eventId).length > 220 ||
      input.expectedMilestone !== "accepted" ||
      !["recorded", "review_required"].includes(input.expectedState) ||
      input.reasonCode !== "no_concrete_proposal_acceptance") {
    throw new Error("administrative_milestone_input_invalid");
  }
  const sheet = spreadsheet.getSheetByName(BUSINESS_MILESTONE_SHEET);
  if (!sheet || sheet.getLastRow() < 2) throw new Error("administrative_milestone_missing");
  const headers = sheet.getRange(1, 1, 1, BUSINESS_MILESTONE_HEADERS.length).getDisplayValues()[0];
  if (JSON.stringify(headers) !== JSON.stringify(BUSINESS_MILESTONE_HEADERS)) {
    throw new Error("administrative_milestone_schema_invalid");
  }
  const matches = [];
  sheet.getRange(2, 1, sheet.getLastRow() - 1, BUSINESS_MILESTONE_HEADERS.length)
    .getValues().forEach(function match(row, index) {
      if (row[0] === input.eventId) matches.push({ row: index + 2, values: row });
    });
  if (matches.length !== 1) throw new Error("administrative_milestone_not_unique");
  const target = matches[0];
  if (target.values[1] !== input.opportunityId || target.values[2] !== "accepted" ||
      target.values[6] !== input.expectedState) {
    throw new Error("administrative_milestone_precondition_failed");
  }
  const opportunities = linhasReconciliacaoAdministrativa_(spreadsheet,
    OPPORTUNITY_STORE_CONFIG.sheetName, OPPORTUNITY_HEADERS.length)
    .filter(function same(row) { return row[0] === input.opportunityId; });
  if (opportunities.length !== 1) throw new Error("administrative_milestone_identity_invalid");
  const stateHash = hashReconciliacaoAdministrativa_(target.values);
  if (input.expectedStateHash !== stateHash && !(preview && !input.expectedStateHash)) {
    throw new Error("administrative_milestone_state_changed");
  }
  return { stateHash, eventId: input.eventId, opportunityId: input.opportunityId,
    beforeState: input.expectedState, afterState: "voided", row: target.row, values: target.values };
}

function invalidarMarcoOportunidadeAuditado_(spreadsheet, item) {
  const receipt = reciboReconciliacaoAdministrativa_(spreadsheet, item);
  if (!receipt || receipt[3] !== "prepared") {
    throw new Error("administrative_milestone_receipt_required");
  }
  const plan = planejarInvalidacaoMarcoAuditada_(spreadsheet, item.payload, false);
  const sheet = spreadsheet.getSheetByName(BUSINESS_MILESTONE_SHEET);
  sheet.getRange(plan.row, 7).setValue("voided");
  SpreadsheetApp.flush();
  const expected = plan.values.slice();
  expected[6] = "voided";
  const actual = sheet.getRange(plan.row, 1, 1, BUSINESS_MILESTONE_HEADERS.length).getValues()[0];
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error("administrative_milestone_postflight_failed");
  }
  registrarReciboReconciliacaoAdministrativa_(spreadsheet, item, "milestone_voided", plan);
  return { ok: true, changed: true };
}
