/**
 * Reconcilia classificacoes que ficaram atras da conversa duravel.
 *
 * A entrada do paciente abre a classificacao normal. As saidas posteriores da
 * Bruna e da equipe ficam no ledger sem iniciar uma segunda chamada imediata,
 * para nao competir com o atendimento. Esta rotina observa somente filas ja
 * concluidas e as devolve para `pending` quando existe um turno textual mais
 * recente que ainda nao foi considerado.
 *
 * A publicacao deste arquivo nao ativa a rotina. A ativacao exige a execucao
 * explicita de `configurarReconciliacaoPeriodicaClassificacoesAutorizada`.
 */

const CLASSIFICATION_RECONCILIATION_CONFIG = Object.freeze({
  handler: "reconciliarClassificacoesPorConversaPeriodicamente",
  enabledProperty: "CLASSIFICATION_RECONCILIATION_ENABLED",
  intervalMinutes: 15,
  lookbackDays: 90,
  maximumRequeuesPerRun: 20,
  properties: Object.freeze({
    activatedAt: "CLASSIFICATION_RECONCILIATION_ACTIVATED_AT",
    lastRunAt: "CLASSIFICATION_RECONCILIATION_LAST_RUN_AT",
    lastOkAt: "CLASSIFICATION_RECONCILIATION_LAST_OK_AT",
    lastSummary: "CLASSIFICATION_RECONCILIATION_LAST_SUMMARY",
  }),
});

function dataReconciliacaoClassificacao_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value || "").trim();
  if (!text) return null;
  const br = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (br) {
    const parsed = new Date(
      Number(br[3]),
      Number(br[2]) - 1,
      Number(br[1]),
      Number(br[4] || 0),
      Number(br[5] || 0),
      Number(br[6] || 0),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function indexarOportunidadesAbertasReconciliacaoClassificacao_(rows) {
  const index = {};
  (Array.isArray(rows) ? rows : []).forEach(function indexOpportunity(row) {
    const opportunityId = String(row && row[0] || "").trim();
    if (!opportunityId || index[opportunityId]) return;
    index[opportunityId] = {
      phone: normalizePhone_(row[1]),
      professional: typeof normalizarProfissionalOportunidade_ === "function"
        ? normalizarProfissionalOportunidade_(row[3])
        : String(row[3] || ""),
      sheetName: String(row[4] || ""),
      state: String(row[6] || ""),
      stage: String(row[7] || ""),
    };
  });
  return index;
}

function indexarMensagensReconciliacaoClassificacao_(rows) {
  const index = {};
  (Array.isArray(rows) ? rows : []).forEach(function indexMessage(row, order) {
    const opportunityId = String(row && row[7] || "").trim();
    const messageId = String(row && row[3] || row && row[4] || "").trim();
    const text = String(row && row[5] || "").trim();
    const at = dataReconciliacaoClassificacao_(row && row[2]);
    if (!opportunityId || !messageId || !at) return;
    if (!index[opportunityId]) {
      index[opportunityId] = { messages: 0, latest: null };
    }
    const entry = index[opportunityId];
    entry.messages += 1;
    const candidate = {
      messageId,
      at,
      direction: String(row[1] || "").toUpperCase(),
      source: String(row[10] || "").toLowerCase(),
      hasText: Boolean(text),
      order,
    };
    if (
      !entry.latest ||
      candidate.at.getTime() > entry.latest.at.getTime() ||
      (
        candidate.at.getTime() === entry.latest.at.getTime() &&
        candidate.order > entry.latest.order
      )
    ) {
      entry.latest = candidate;
    }
  });
  return index;
}

function indexarAuditoriasHumanasReconciliacaoClassificacao_(rows) {
  const index = {};
  (Array.isArray(rows) ? rows : []).forEach(function indexAudit(row) {
    const opportunityId = String(row && row[2] || "").trim();
    const source = String(row && row[4] || "").trim();
    const decision = String(row && row[10] || "").trim();
    const at = dataReconciliacaoClassificacao_(row && row[0]);
    if (
      !opportunityId ||
      !at ||
      source !== "human_conversation_audit" ||
      decision !== "human_override_applied"
    ) {
      return;
    }
    if (!index[opportunityId] || at > index[opportunityId]) {
      index[opportunityId] = at;
    }
  });
  return index;
}

function candidatosReconciliacaoClassificacao_(input) {
  input = input && typeof input === "object" ? input : {};
  const now = dataReconciliacaoClassificacao_(input.now) || new Date();
  const cutoff = new Date(
    now.getTime() -
      Math.max(1, Number(input.lookbackDays) || 90) * 24 * 60 * 60 * 1000,
  );
  const maximum = Math.max(1, Number(input.limit) || 20);
  const notBefore = dataReconciliacaoClassificacao_(input.notBefore);
  const opportunities = indexarOportunidadesAbertasReconciliacaoClassificacao_(
    input.opportunityRows,
  );
  const messages = indexarMensagensReconciliacaoClassificacao_(
    input.messageRows,
  );
  const humanAudits = indexarAuditoriasHumanasReconciliacaoClassificacao_(
    input.phaseEventRows,
  );
  const reasons = {};
  const candidates = [];

  (Array.isArray(input.queueRows) ? input.queueRows : []).forEach(
    function inspectQueue(row, index) {
      const state = String(row && row[4] || "").trim();
      if (state !== "done") {
        reasons.queue_not_done = Number(reasons.queue_not_done || 0) + 1;
        return;
      }
      const opportunityId = String(row[16] || "").trim();
      const opportunity = opportunities[opportunityId];
      if (!opportunity || opportunity.state !== "open") {
        reasons.opportunity_not_open =
          Number(reasons.opportunity_not_open || 0) + 1;
        return;
      }
      const conversation = messages[opportunityId];
      const latest = conversation && conversation.latest;
      if (!latest || latest.at < cutoff) {
        reasons.no_recent_message = Number(reasons.no_recent_message || 0) + 1;
        return;
      }
      if (notBefore && latest.at.getTime() < notBefore.getTime()) {
        reasons.before_activation = Number(reasons.before_activation || 0) + 1;
        return;
      }
      if (!latest.hasText) {
        reasons.latest_message_without_text =
          Number(reasons.latest_message_without_text || 0) + 1;
        return;
      }
      const throughMessageId = String(row[7] || "").trim();
      if (throughMessageId === latest.messageId) {
        reasons.already_current = Number(reasons.already_current || 0) + 1;
        return;
      }
      const auditAt = humanAudits[opportunityId];
      if (auditAt && auditAt.getTime() >= latest.at.getTime()) {
        reasons.human_audit_is_current =
          Number(reasons.human_audit_is_current || 0) + 1;
        return;
      }
      if (
        normalizePhone_(row[0]) !== opportunity.phone ||
        String(row[17] || "") !== opportunity.professional ||
        String(row[18] || "") !== opportunity.sheetName
      ) {
        reasons.identity_mismatch = Number(reasons.identity_mismatch || 0) + 1;
        return;
      }
      candidates.push({
        rowNumber: index + 2,
        opportunityId,
        latestMessageId: latest.messageId,
        latestAt: latest.at,
        messageCount: conversation.messages,
        latestDirection: latest.direction,
        latestSource: latest.source,
      });
    },
  );

  candidates.sort(function oldestConversationFirst(left, right) {
    return left.latestAt.getTime() - right.latestAt.getTime() ||
      left.rowNumber - right.rowNumber;
  });
  return {
    candidates: candidates.slice(0, maximum),
    totalCandidates: candidates.length,
    deferred: Math.max(0, candidates.length - maximum),
    reasons,
  };
}

function executarReconciliacaoClassificacoesConversas_(spreadsheet, options) {
  options = options && typeof options === "object" ? options : {};
  const apply = options.apply === true;
  const queueSheet = spreadsheet.getSheetByName(CONFIG.classificationSheetName);
  const messageSheet = spreadsheet.getSheetByName(CONFIG.messageSheetName);
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const phaseEventSheet = spreadsheet.getSheetByName(
    CONFIG.leadStageEventSheetName,
  );
  if (!queueSheet || !messageSheet || !opportunitySheet || !phaseEventSheet) {
    return {
      ok: false,
      applied: false,
      containsPii: false,
      reason: "classification_reconciliation_source_missing",
    };
  }
  const readRows = function readRows(sheet, width) {
    return sheet.getLastRow() < 2
      ? []
      : sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  };
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: readRows(queueSheet, LEAD_CLASSIFICATION_HEADERS.length),
    messageRows: readRows(messageSheet, LEAD_MESSAGE_HEADERS.length),
    opportunityRows: readRows(opportunitySheet, OPPORTUNITY_HEADERS.length),
    phaseEventRows: readRows(phaseEventSheet, LEAD_STAGE_EVENT_HEADERS.length),
    now: options.now || new Date(),
    lookbackDays: CLASSIFICATION_RECONCILIATION_CONFIG.lookbackDays,
    limit: CLASSIFICATION_RECONCILIATION_CONFIG.maximumRequeuesPerRun,
    notBefore: options.notBefore,
  });
  const result = {
    ok: true,
    applied: apply,
    containsPii: false,
    candidates: plan.totalCandidates,
    requeued: 0,
    deferred: plan.deferred,
    reasons: plan.reasons,
  };
  if (!apply || !plan.candidates.length) return result;

  const dueAt = new Date();
  plan.candidates.forEach(function requeue(candidate) {
    queueSheet.getRange(candidate.rowNumber, 3, 1, 4).setValues([[
      candidate.latestAt,
      dueAt,
      "pending",
      "",
    ]]);
    queueSheet.getRange(candidate.rowNumber, 9, 1, 2).setValues([[
      candidate.latestMessageId,
      candidate.messageCount,
    ]]);
    resetClassificationAttemptCycle_(queueSheet, candidate.rowNumber);
    result.requeued += 1;
  });
  SpreadsheetApp.flush();
  return result;
}

function executarReconciliacaoClassificacoesConversasComLock_(options) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      ok: false,
      applied: false,
      containsPii: false,
      reason: "classification_reconciliation_lock_timeout",
    };
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    return executarReconciliacaoClassificacoesConversas_(spreadsheet, options);
  } finally {
    lock.releaseLock();
  }
}

function diagnosticarReconciliacaoClassificacoesConversas() {
  const report = executarReconciliacaoClassificacoesConversasComLock_({
    apply: false,
  });
  console.log(
    "CLASSIFICATION_RECONCILIATION_DRY_RUN " + JSON.stringify(report),
  );
  return report;
}

function reconciliarClassificacoesConversasAgoraAutorizada() {
  const report = executarReconciliacaoClassificacoesConversasComLock_({
    apply: true,
  });
  console.log(
    "CLASSIFICATION_RECONCILIATION_MANUAL " + JSON.stringify(report),
  );
  return report;
}

function reconciliarClassificacoesPorConversaPeriodicamente() {
  const properties = PropertiesService.getScriptProperties();
  const enabled = String(
    properties.getProperty(
      CLASSIFICATION_RECONCILIATION_CONFIG.enabledProperty,
    ) || "",
  ).toLowerCase() === "true";
  if (!enabled) {
    return { ok: true, enabled: false, applied: false, containsPii: false };
  }
  const activatedAt = dataReconciliacaoClassificacao_(
    properties.getProperty(
      CLASSIFICATION_RECONCILIATION_CONFIG.properties.activatedAt,
    ),
  );
  if (!activatedAt) {
    return {
      ok: false,
      enabled: true,
      applied: false,
      containsPii: false,
      reason: "classification_reconciliation_activation_missing",
    };
  }
  const now = new Date();
  let report;
  try {
    report = executarReconciliacaoClassificacoesConversasComLock_({
      apply: true,
      now,
      notBefore: activatedAt,
    });
  } catch (_error) {
    report = {
      ok: false,
      applied: false,
      containsPii: false,
      reason: "classification_reconciliation_periodic_failure",
    };
  }
  properties.setProperty(
    CLASSIFICATION_RECONCILIATION_CONFIG.properties.lastRunAt,
    now.toISOString(),
  );
  if (report.ok) {
    properties.setProperty(
      CLASSIFICATION_RECONCILIATION_CONFIG.properties.lastOkAt,
      now.toISOString(),
    );
  }
  properties.setProperty(
    CLASSIFICATION_RECONCILIATION_CONFIG.properties.lastSummary,
    JSON.stringify(report),
  );
  report.enabled = true;
  console.log(
    "CLASSIFICATION_RECONCILIATION_PERIODIC " + JSON.stringify(report),
  );
  return report;
}

function configurarReconciliacaoPeriodicaClassificacoesAutorizada() {
  const handler = CLASSIFICATION_RECONCILIATION_CONFIG.handler;
  const activatedAt = new Date();
  const existing = ScriptApp.getProjectTriggers().filter(function sameHandler(
    trigger,
  ) {
    return trigger.getHandlerFunction() === handler;
  });
  const trigger = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(CLASSIFICATION_RECONCILIATION_CONFIG.intervalMinutes)
    .create();
  existing.forEach(function removePrevious(previous) {
    ScriptApp.deleteTrigger(previous);
  });
  PropertiesService.getScriptProperties().setProperties({
    [CLASSIFICATION_RECONCILIATION_CONFIG.enabledProperty]: "true",
    [CLASSIFICATION_RECONCILIATION_CONFIG.properties.activatedAt]:
      activatedAt.toISOString(),
  });
  return {
    ok: true,
    enabled: true,
    containsPii: false,
    handler,
    activatedAt: activatedAt.toISOString(),
    triggerId: trigger.getUniqueId(),
    schedule: "a cada 15 minutos",
    lookbackDays: CLASSIFICATION_RECONCILIATION_CONFIG.lookbackDays,
    maximumRequeuesPerRun:
      CLASSIFICATION_RECONCILIATION_CONFIG.maximumRequeuesPerRun,
  };
}

function desativarReconciliacaoPeriodicaClassificacoesAutorizada() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(
    CLASSIFICATION_RECONCILIATION_CONFIG.enabledProperty,
    "false",
  );
  const handler = CLASSIFICATION_RECONCILIATION_CONFIG.handler;
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function removeTrigger(trigger) {
    if (trigger.getHandlerFunction() !== handler) return;
    ScriptApp.deleteTrigger(trigger);
    removed += 1;
  });
  return { ok: true, enabled: false, containsPii: false, handler, removed };
}
