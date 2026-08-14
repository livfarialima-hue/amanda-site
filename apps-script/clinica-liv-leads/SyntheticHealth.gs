const SYNTHETIC_HEALTH_SHEET = "_INTEGRATION_HEALTH_SYNTHETIC";

const SYNTHETIC_HEALTH_HEADERS = Object.freeze([
  "Run ID",
  "Data e hora",
  "Persistência",
  "Classificação",
  "Handoff",
  "Resultado",
  "Detalhe técnico",
]);

function avaliarContratosTesteSintetico_(now) {
  const classificationRow = Array(20).fill("");
  classificationRow[4] = "running";
  classificationRow[5] = new Date(now.getTime() - 60 * 60 * 1000);
  classificationRow[14] = 1;
  const classification = classificarAcaoReaperClassificacao_(
    classificationRow,
    now,
  );
  const handoff = normalizarEventoOperacional_({
    eventId: "synthetic-handoff",
    parentEventId: "synthetic-inbound",
    opportunityId: "synthetic-opportunity",
    type: "human_handoff_queued",
    source: "synthetic_health",
    at: now,
    outcome: "probe_only",
  });
  return {
    classificationOk: classification.action === "requeue",
    handoffOk: handoff.ok === true &&
      handoff.type === "human_handoff_queued",
  };
}

function executarTesteSinteticoIntegracoes_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    SYNTHETIC_HEALTH_SHEET,
    SYNTHETIC_HEALTH_HEADERS,
  );
  const now = new Date();
  const runId = "synthetic_" + Utilities.formatDate(
    now,
    CONFIG.timezone,
    "yyyyMMdd",
  );
  if (sheet.getLastRow() >= 2) {
    const duplicate = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(runId)
      .matchEntireCell(true)
      .findNext();
    if (duplicate) {
      return { ok: true, duplicate: true, runId };
    }
  }
  sheet.appendRow([
    runId,
    now,
    "pending",
    "pending",
    "pending",
    "running",
    "",
  ]);
  const row = sheet.getLastRow();
  SpreadsheetApp.flush();
  const persisted = String(sheet.getRange(row, 1).getDisplayValue()) === runId;
  const contracts = avaliarContratosTesteSintetico_(now);
  const ok = persisted && contracts.classificationOk && contracts.handoffOk;
  const detail = [
    persisted ? "persistence_ok" : "persistence_failed",
    contracts.classificationOk
      ? "classification_contract_ok"
      : "classification_contract_failed",
    contracts.handoffOk ? "handoff_contract_ok" : "handoff_contract_failed",
  ].join("|");
  sheet.getRange(row, 3, 1, 5).setValues([[
    persisted ? "ok" : "failed",
    contracts.classificationOk ? "ok" : "failed",
    contracts.handoffOk ? "ok" : "failed",
    ok ? "ok" : "failed",
    detail,
  ]]);
  if (!ok && typeof MailApp !== "undefined") {
    MailApp.sendEmail({
      to: CONFIG.reviewAlertEmail,
      subject: "[Clínica LIV] Falha no teste sintético de integrações",
      body: [
        "O teste técnico diário não envolveu paciente nem enviou WhatsApp.",
        "Run ID: " + runId,
        "Detalhe: " + detail,
      ].join("\n"),
    });
  }
  return { ok, duplicate: false, runId, detail };
}
