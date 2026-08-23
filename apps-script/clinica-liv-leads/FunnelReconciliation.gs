/**
 * Reconciliação incremental das projeções do funil.
 *
 * A origem de verdade continua sendo `_CRM_OPORTUNIDADES` combinada com as
 * abas visíveis. A rotina apenas compara as colunas automáticas por
 * Opportunity ID e reaplica o projetor incremental existente quando encontra
 * divergência. Ela nunca reconstrói o funil inteiro e não altera os campos
 * comerciais manuais do `Funil Comercial`.
 *
 * A publicação deste arquivo não ativa a rotina. A ativação exige a execução
 * explícita de `configurarReconciliacaoPeriodicaFunilAutorizada`.
 */

const FUNNEL_RECONCILIATION_CONFIG = Object.freeze({
  canonicalSheetName: "_FUNIL_CANONICO",
  commercialSheetName: "Funil Comercial",
  handler: "reconciliarProjecoesFunilPeriodicamente",
  enabledProperty: "FUNNEL_RECONCILIATION_ENABLED",
  intervalMinutes: 15,
  maximumRepairsPerRun: 25,
  alertAfterMinutes: 10,
  alertCooldownHours: 6,
  // Datas são conferidas na projeção comercial, onde o formato visível é parte
  // do contrato. Na aba canônica, essas mesmas datas podem ter valor idêntico
  // com formatos de exibição diferentes; compará-las como texto criaria
  // reparos falsos. Os demais campos abaixo são estáveis e pertencem ao
  // contrato incremental do projetor.
  canonicalStableColumnIndexes: Object.freeze([
    0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12,
  ]),
  properties: Object.freeze({
    pendingDigest: "FUNNEL_RECONCILIATION_PENDING_DIGEST",
    pendingSince: "FUNNEL_RECONCILIATION_PENDING_SINCE",
    lastAlertAt: "FUNNEL_RECONCILIATION_LAST_ALERT_AT",
    lastRunAt: "FUNNEL_RECONCILIATION_LAST_RUN_AT",
    lastOkAt: "FUNNEL_RECONCILIATION_LAST_OK_AT",
    lastSummary: "FUNNEL_RECONCILIATION_LAST_SUMMARY",
  }),
});

function normalizarValorReconciliacaoFunil_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return String(value.getTime());
  }
  return String(value === null || value === undefined ? "" : value).trim();
}

function linhaTemConteudoReconciliacaoFunil_(row) {
  return (row || []).some(function hasValue(value) {
    return normalizarValorReconciliacaoFunil_(value) !== "";
  });
}

function indexarLinhasReconciliacaoFunil_(rows, width) {
  const byId = {};
  let blankRowsWithContent = 0;
  (rows || []).forEach(function indexRow(inputRow) {
    const row = Array.isArray(inputRow) ? inputRow.slice(0, width) : [];
    while (row.length < width) row.push("");
    const opportunityId = normalizarValorReconciliacaoFunil_(row[0]);
    if (!opportunityId) {
      if (linhaTemConteudoReconciliacaoFunil_(row)) blankRowsWithContent += 1;
      return;
    }
    if (!byId[opportunityId]) byId[opportunityId] = [];
    byId[opportunityId].push(row);
  });
  const duplicateIds = Object.keys(byId).filter(function duplicated(id) {
    return byId[id].length > 1;
  });
  return {
    byId,
    duplicateIds,
    blankRowsWithContent,
    rowCount: Object.keys(byId).reduce(function countRows(total, id) {
      return total + byId[id].length;
    }, 0),
    uniqueCount: Object.keys(byId).length,
  };
}

function linhasIguaisReconciliacaoFunil_(left, right, width) {
  for (let index = 0; index < width; index += 1) {
    if (
      normalizarValorReconciliacaoFunil_((left || [])[index]) !==
      normalizarValorReconciliacaoFunil_((right || [])[index])
    ) {
      return false;
    }
  }
  return true;
}

function linhasIguaisPorIndicesReconciliacaoFunil_(left, right, indexes) {
  return (indexes || []).every(function sameStableColumn(index) {
    return normalizarValorReconciliacaoFunil_((left || [])[index]) ===
      normalizarValorReconciliacaoFunil_((right || [])[index]);
  });
}

function linhaAutomaticaFunilComercialEsperada_(canonicalRow) {
  return [
    String((canonicalRow || [])[0] || ""),
    (canonicalRow || [])[4] || "",
    normalizarPlataformaFunil_((canonicalRow || [])[6]),
    (canonicalRow || [])[7] || "",
    (canonicalRow || [])[8] || "",
    (canonicalRow || [])[9] || "",
    (canonicalRow || [])[10] || "",
    (canonicalRow || [])[3] || "Novo",
    (canonicalRow || [])[5] || "",
  ];
}

function incrementarMotivoReconciliacaoFunil_(counts, reason, amount) {
  counts[reason] = Number(counts[reason] || 0) + Number(amount || 1);
}

function totalMotivosReconciliacaoFunil_(counts) {
  return Object.keys(counts || {}).reduce(function sum(total, reason) {
    return total + Number(counts[reason] || 0);
  }, 0);
}

/**
 * Compara snapshots já lidos. O retorno interno contém IDs somente para que o
 * projetor possa repará-los; resumos, logs, propriedades e e-mails removem os
 * IDs antes de sair desta camada.
 */
function auditarProjecoesFunilComDados_(expectedRows, canonicalRows, funnelRows) {
  const expected = indexarLinhasReconciliacaoFunil_(expectedRows, 14);
  const canonical = indexarLinhasReconciliacaoFunil_(canonicalRows, 14);
  const commercial = indexarLinhasReconciliacaoFunil_(funnelRows, 20);
  const issueCounts = {};
  const repairCandidates = {};
  const blockedIds = {};

  function register(reason, opportunityId, repairable) {
    incrementarMotivoReconciliacaoFunil_(issueCounts, reason, 1);
    if (repairable && opportunityId) repairCandidates[opportunityId] = true;
  }

  if (expected.blankRowsWithContent) {
    incrementarMotivoReconciliacaoFunil_(
      issueCounts,
      "expected_row_without_id",
      expected.blankRowsWithContent,
    );
  }
  if (canonical.blankRowsWithContent) {
    incrementarMotivoReconciliacaoFunil_(
      issueCounts,
      "canonical_row_without_id",
      canonical.blankRowsWithContent,
    );
  }
  // Linhas sem ID que contêm somente campos manuais podem permanecer depois
  // do encerramento de uma oportunidade. Elas são preservadas e não indicam
  // falha da projeção automática.

  expected.duplicateIds.forEach(function blockDuplicate(id) {
    blockedIds[id] = true;
    register("duplicate_id_in_source", id, false);
  });
  canonical.duplicateIds.forEach(function blockDuplicate(id) {
    blockedIds[id] = true;
    register("duplicate_id_in_canonical_projection", id, false);
  });
  commercial.duplicateIds.forEach(function blockDuplicate(id) {
    blockedIds[id] = true;
    register("duplicate_id_in_commercial_projection", id, false);
  });

  Object.keys(expected.byId).forEach(function inspectExpected(opportunityId) {
    if (expected.byId[opportunityId].length !== 1) return;
    const expectedRow = expected.byId[opportunityId][0];
    const canonicalMatches = canonical.byId[opportunityId] || [];
    if (!canonicalMatches.length) {
      register("missing_canonical_projection", opportunityId, true);
    } else if (
      canonicalMatches.length === 1 &&
      !linhasIguaisPorIndicesReconciliacaoFunil_(
        expectedRow,
        canonicalMatches[0],
        FUNNEL_RECONCILIATION_CONFIG.canonicalStableColumnIndexes,
      )
    ) {
      register("canonical_projection_mismatch", opportunityId, true);
    }

    const professional = normalizarValorReconciliacaoFunil_(expectedRow[1])
      .toLowerCase();
    const commercialMatches = commercial.byId[opportunityId] || [];
    if (professional === "amanda") {
      if (!commercialMatches.length) {
        register("missing_commercial_projection", opportunityId, true);
      } else if (
        commercialMatches.length === 1 &&
        !linhasIguaisReconciliacaoFunil_(
          linhaAutomaticaFunilComercialEsperada_(expectedRow),
          commercialMatches[0],
          9,
        )
      ) {
        register("commercial_projection_mismatch", opportunityId, true);
      }
    } else if (commercialMatches.length) {
      blockedIds[opportunityId] = true;
      register("non_amanda_in_commercial_projection", opportunityId, false);
    }
  });

  Object.keys(canonical.byId).forEach(function inspectUnexpected(opportunityId) {
    if (expected.byId[opportunityId]) return;
    register("unexpected_canonical_projection", opportunityId, true);
  });

  Object.keys(commercial.byId).forEach(function inspectUnexpected(opportunityId) {
    const expectedRowsForId = expected.byId[opportunityId] || [];
    const expectedAmanda = expectedRowsForId.some(function isAmanda(row) {
      return normalizarValorReconciliacaoFunil_(row[1]).toLowerCase() === "amanda";
    });
    if (expectedAmanda) return;
    if (expectedRowsForId.length) {
      blockedIds[opportunityId] = true;
      return;
    }
    register("unexpected_commercial_projection", opportunityId, true);
  });

  Object.keys(blockedIds).forEach(function removeUnsafeCandidate(id) {
    delete repairCandidates[id];
  });

  const repairCandidateIds = Object.keys(repairCandidates).sort();
  const totalIssues = totalMotivosReconciliacaoFunil_(issueCounts);
  return {
    ok: totalIssues === 0,
    sourceOk: expected.duplicateIds.length === 0 &&
      expected.blankRowsWithContent === 0,
    expectedRows: expected.rowCount,
    canonicalRows: canonical.rowCount,
    commercialRows: commercial.rowCount,
    preservedManualRowsWithoutId: commercial.blankRowsWithContent,
    issueCounts,
    totalIssues,
    repairCandidateIds,
    repairable: repairCandidateIds.length,
    blocked: Object.keys(blockedIds).length,
  };
}

function lerProjecaoFunil_(spreadsheet, sheetName, width) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return { ok: false, reason: "sheet_missing", rows: [] };
  if (
    sheet.getLastColumn() < width ||
    String(sheet.getRange(1, 1).getDisplayValue() || "").trim() !==
      "Opportunity ID"
  ) {
    return { ok: false, reason: "sheet_contract_invalid", rows: [] };
  }
  const lastRow = sheet.getLastRow();
  return {
    ok: true,
    reason: "",
    rows: lastRow < 2
      ? []
      : sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues(),
  };
}

function auditarProjecoesFunil_(spreadsheet) {
  if (typeof construirFonteFunilCanonico_ !== "function") {
    return {
      ok: false,
      sourceOk: false,
      expectedRows: 0,
      canonicalRows: 0,
      commercialRows: 0,
      issueCounts: { canonical_source_unavailable: 1 },
      totalIssues: 1,
      repairCandidateIds: [],
      repairable: 0,
      blocked: 1,
    };
  }
  const source = construirFonteFunilCanonico_(spreadsheet);
  if (!source || !source.ok || Number(source.reviewRequired || 0) > 0) {
    const reasons = { canonical_source_preflight_failed: 1 };
    (source && source.issues || []).forEach(function countSourceIssue(issue) {
      incrementarMotivoReconciliacaoFunil_(
        reasons,
        String(issue && issue.reason || "canonical_source_issue"),
        1,
      );
    });
    return {
      ok: false,
      sourceOk: false,
      expectedRows: Number(source && source.rows && source.rows.length || 0),
      canonicalRows: 0,
      commercialRows: 0,
      issueCounts: reasons,
      totalIssues: totalMotivosReconciliacaoFunil_(reasons),
      repairCandidateIds: [],
      repairable: 0,
      blocked: Number(source && source.reviewRequired || 1),
    };
  }

  const canonical = lerProjecaoFunil_(
    spreadsheet,
    FUNNEL_RECONCILIATION_CONFIG.canonicalSheetName,
    14,
  );
  const commercial = lerProjecaoFunil_(
    spreadsheet,
    FUNNEL_RECONCILIATION_CONFIG.commercialSheetName,
    20,
  );
  if (!canonical.ok || !commercial.ok) {
    const reasons = {};
    if (!canonical.ok) {
      incrementarMotivoReconciliacaoFunil_(
        reasons,
        "canonical_" + canonical.reason,
        1,
      );
    }
    if (!commercial.ok) {
      incrementarMotivoReconciliacaoFunil_(
        reasons,
        "commercial_" + commercial.reason,
        1,
      );
    }
    return {
      ok: false,
      sourceOk: false,
      expectedRows: source.rows.length,
      canonicalRows: canonical.rows.length,
      commercialRows: commercial.rows.length,
      issueCounts: reasons,
      totalIssues: totalMotivosReconciliacaoFunil_(reasons),
      repairCandidateIds: [],
      repairable: 0,
      blocked: totalMotivosReconciliacaoFunil_(reasons),
    };
  }
  return auditarProjecoesFunilComDados_(
    source.rows,
    canonical.rows,
    commercial.rows,
  );
}

function resumirAuditoriaProjecoesFunil_(audit) {
  return {
    ok: Boolean(audit && audit.ok),
    sourceOk: Boolean(audit && audit.sourceOk),
    expectedRows: Number(audit && audit.expectedRows || 0),
    canonicalRows: Number(audit && audit.canonicalRows || 0),
    commercialRows: Number(audit && audit.commercialRows || 0),
    preservedManualRowsWithoutId: Number(
      audit && audit.preservedManualRowsWithoutId || 0,
    ),
    totalIssues: Number(audit && audit.totalIssues || 0),
    repairable: Number(audit && audit.repairable || 0),
    blocked: Number(audit && audit.blocked || 0),
    issueCounts: Object.assign({}, audit && audit.issueCounts || {}),
  };
}

function criarDigestAlertasFunil_(summary) {
  const counts = summary && summary.issueCounts || {};
  return Object.keys(counts).sort().map(function digestPart(reason) {
    return reason + ":" + Number(counts[reason] || 0);
  }).join("|") || "healthy";
}

function decidirAlertaFunil_(input) {
  const nowMs = Number(input && input.nowMs || 0);
  const digest = String(input && input.digest || "");
  const previousDigest = String(input && input.previousDigest || "");
  const previousPendingSince = Number(input && input.pendingSince || 0);
  const lastAlertAt = Number(input && input.lastAlertAt || 0);
  const alertAfterMs = Number(input && input.alertAfterMinutes || 0) * 60000;
  const cooldownMs = Number(input && input.cooldownHours || 0) * 3600000;
  if (!digest || digest === "healthy") {
    return { shouldSend: false, pendingSince: 0, digest: "" };
  }
  if (digest !== previousDigest || !previousPendingSince) {
    return { shouldSend: false, pendingSince: nowMs, digest };
  }
  const persistent = nowMs - previousPendingSince >= alertAfterMs;
  const cooldownComplete = !lastAlertAt || nowMs - lastAlertAt >= cooldownMs;
  return {
    shouldSend: persistent && cooldownComplete,
    pendingSince: previousPendingSince,
    digest,
  };
}

function corpoAlertaReconciliacaoFunil_(report) {
  const summary = report && report.postflight || report && report.preflight || {};
  return [
    "A reconciliação automática encontrou divergência persistente nas projeções do funil.",
    "",
    "A origem canônica (CRM e abas visíveis) foi preservada.",
    "A rotina não enviou WhatsApp, não alterou campanhas e não removeu campos comerciais manuais.",
    "",
    "Esperadas: " + Number(summary.expectedRows || 0),
    "No funil canônico: " + Number(summary.canonicalRows || 0),
    "No Funil Comercial: " + Number(summary.commercialRows || 0),
    "Divergências: " + Number(summary.totalIssues || 0),
    "Reparáveis: " + Number(summary.repairable || 0),
    "Bloqueadas para revisão: " + Number(summary.blocked || 0),
    "Tentativas nesta execução: " + Number(report && report.attempted || 0),
    "Reparos concluídos: " + Number(report && report.repaired || 0),
    "Falhas de reparo: " + Number(report && report.failedRepairs || 0),
    "Pendentes por limite: " + Number(report && report.deferredRepairs || 0),
    "Motivos: " + JSON.stringify(summary.issueCounts || {}),
    "",
    "Revisar o trigger, os vínculos por Opportunity ID e os logs técnicos antes de qualquer reconstrução ampla.",
  ].join("\n");
}

function registrarEAlertarSaudeReconciliacaoFunil_(report, properties, now) {
  const keys = FUNNEL_RECONCILIATION_CONFIG.properties;
  const summary = report && report.postflight || report && report.preflight || {};
  const nowMs = now.getTime();
  properties.setProperty(keys.lastRunAt, String(nowMs));
  properties.setProperty(keys.lastSummary, JSON.stringify({
    ok: Boolean(report && report.ok),
    attempted: Number(report && report.attempted || 0),
    repaired: Number(report && report.repaired || 0),
    failedRepairs: Number(report && report.failedRepairs || 0),
    deferredRepairs: Number(report && report.deferredRepairs || 0),
    summary,
  }));

  if (report && report.ok) {
    properties.setProperty(keys.lastOkAt, String(nowMs));
    properties.deleteProperty(keys.pendingDigest);
    properties.deleteProperty(keys.pendingSince);
    properties.deleteProperty(keys.lastAlertAt);
    return { sent: false, healthy: true };
  }

  const digest = criarDigestAlertasFunil_(summary);
  const decision = decidirAlertaFunil_({
    nowMs,
    digest,
    previousDigest: properties.getProperty(keys.pendingDigest),
    pendingSince: properties.getProperty(keys.pendingSince),
    lastAlertAt: properties.getProperty(keys.lastAlertAt),
    alertAfterMinutes: FUNNEL_RECONCILIATION_CONFIG.alertAfterMinutes,
    cooldownHours: FUNNEL_RECONCILIATION_CONFIG.alertCooldownHours,
  });
  properties.setProperty(keys.pendingDigest, decision.digest);
  properties.setProperty(keys.pendingSince, String(decision.pendingSince));
  if (!decision.shouldSend) return { sent: false, healthy: false };

  const recipient = typeof CONFIG !== "undefined"
    ? String(CONFIG.reviewAlertEmail || "").trim()
    : "";
  if (!recipient || typeof MailApp === "undefined") {
    return { sent: false, healthy: false, error: "alert_channel_unavailable" };
  }
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: "[Clínica LIV] Divergência persistente nas projeções do funil",
      body: corpoAlertaReconciliacaoFunil_(report),
      name: "Clínica LIV — saúde do funil",
    });
    properties.setProperty(keys.lastAlertAt, String(nowMs));
    return { sent: true, healthy: false };
  } catch (_error) {
    console.error("FUNNEL_RECONCILIATION_ALERT_FAILED");
    return { sent: false, healthy: false, error: "alert_send_failed" };
  }
}

function executarReparosIncrementaisFunil_(
  spreadsheet,
  candidateIds,
  projector,
) {
  const candidates = (candidateIds || []).slice();
  const bounded = candidates.slice(
    0,
    FUNNEL_RECONCILIATION_CONFIG.maximumRepairsPerRun,
  );
  const result = {
    attempted: 0,
    repaired: 0,
    failedRepairs: 0,
    deferredRepairs: Math.max(0, candidates.length - bounded.length),
  };
  const project = typeof projector === "function"
    ? projector
    : atualizarLinhaFunilCanonicoPorOportunidade_;
  bounded.forEach(function repair(opportunityId) {
    result.attempted += 1;
    try {
      const projection = project(spreadsheet, opportunityId);
      if (projection && projection.ok && !projection.skipped) {
        result.repaired += 1;
      } else {
        result.failedRepairs += 1;
      }
    } catch (_error) {
      result.failedRepairs += 1;
      console.error("FUNNEL_RECONCILIATION_INCREMENTAL_REPAIR_FAILED");
    }
  });
  return result;
}

function executarReconciliacaoProjecoesFunil_(spreadsheet, options) {
  const apply = Boolean(options && options.apply === true);
  const preflightAudit = auditarProjecoesFunil_(spreadsheet);
  const preflight = resumirAuditoriaProjecoesFunil_(preflightAudit);
  const report = {
    ok: preflight.ok,
    applied: apply,
    attempted: 0,
    repaired: 0,
    failedRepairs: 0,
    deferredRepairs: 0,
    preflight,
    postflight: preflight,
  };
  if (!apply || preflight.ok || !preflight.sourceOk) return report;

  const repairs = executarReparosIncrementaisFunil_(
    spreadsheet,
    preflightAudit.repairCandidateIds,
  );
  report.attempted = repairs.attempted;
  report.repaired = repairs.repaired;
  report.failedRepairs = repairs.failedRepairs;
  report.deferredRepairs = repairs.deferredRepairs;
  if (report.attempted && typeof SpreadsheetApp !== "undefined") {
    SpreadsheetApp.flush();
  }
  const postflightAudit = auditarProjecoesFunil_(spreadsheet);
  report.postflight = resumirAuditoriaProjecoesFunil_(postflightAudit);
  report.ok = report.postflight.ok;
  return report;
}

function relatorioFalhaOperacionalReconciliacaoFunil_(reason) {
  const issueCounts = {};
  issueCounts[String(reason || "funnel_reconciliation_operational_failure")] = 1;
  const summary = {
    ok: false,
    sourceOk: false,
    expectedRows: 0,
    canonicalRows: 0,
    commercialRows: 0,
    preservedManualRowsWithoutId: 0,
    totalIssues: 1,
    repairable: 0,
    blocked: 1,
    issueCounts,
  };
  return {
    ok: false,
    applied: false,
    attempted: 0,
    repaired: 0,
    failedRepairs: 0,
    deferredRepairs: 0,
    preflight: summary,
    postflight: summary,
  };
}

function simularReconciliacaoProjecoesFunil() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const report = executarReconciliacaoProjecoesFunil_(spreadsheet, {
    apply: false,
  });
  console.log("FUNNEL_RECONCILIATION_DRY_RUN " + JSON.stringify(report));
  return report;
}

function obterLockReconciliacaoFunil_() {
  if (
    typeof LockService !== "undefined" &&
    typeof LockService.getDocumentLock === "function"
  ) {
    const documentLock = LockService.getDocumentLock();
    if (documentLock) return documentLock;
  }
  return LockService.getScriptLock();
}

function executarReconciliacaoProjecoesFunilComLock_(options) {
  const lock = obterLockReconciliacaoFunil_();
  if (!lock.tryLock(30000)) {
    return {
      ok: false,
      applied: false,
      skipped: true,
      reason: "funnel_reconciliation_lock_timeout",
      preflight: {
        ok: false,
        sourceOk: false,
        expectedRows: 0,
        canonicalRows: 0,
        commercialRows: 0,
        preservedManualRowsWithoutId: 0,
        totalIssues: 1,
        repairable: 0,
        blocked: 1,
        issueCounts: { funnel_reconciliation_lock_timeout: 1 },
      },
    };
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    return executarReconciliacaoProjecoesFunil_(spreadsheet, options);
  } finally {
    lock.releaseLock();
  }
}

function reconciliarProjecoesFunilAgoraAutorizada() {
  const report = executarReconciliacaoProjecoesFunilComLock_({ apply: true });
  console.log("FUNNEL_RECONCILIATION_MANUAL " + JSON.stringify(report));
  return report;
}

function reconciliarProjecoesFunilPeriodicamente() {
  const properties = PropertiesService.getScriptProperties();
  const enabled = String(
    properties.getProperty(FUNNEL_RECONCILIATION_CONFIG.enabledProperty) || "",
  ).toLowerCase() === "true";
  if (!enabled) {
    return { ok: true, enabled: false, applied: false };
  }
  const now = new Date();
  let report;
  try {
    report = executarReconciliacaoProjecoesFunilComLock_({ apply: true });
  } catch (_error) {
    console.error("FUNNEL_RECONCILIATION_PERIODIC_FAILED");
    report = relatorioFalhaOperacionalReconciliacaoFunil_(
      "funnel_reconciliation_periodic_failure",
    );
  }
  report.enabled = true;
  report.alert = registrarEAlertarSaudeReconciliacaoFunil_(
    report,
    properties,
    now,
  );
  console.log("FUNNEL_RECONCILIATION_PERIODIC " + JSON.stringify(report));
  return report;
}

function configurarReconciliacaoPeriodicaFunilAutorizada() {
  const handler = FUNNEL_RECONCILIATION_CONFIG.handler;
  const existing = ScriptApp.getProjectTriggers().filter(function sameHandler(trigger) {
    return trigger.getHandlerFunction() === handler;
  });
  const trigger = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(FUNNEL_RECONCILIATION_CONFIG.intervalMinutes)
    .create();
  existing.forEach(function removePrevious(previous) {
    ScriptApp.deleteTrigger(previous);
  });
  PropertiesService.getScriptProperties().setProperty(
    FUNNEL_RECONCILIATION_CONFIG.enabledProperty,
    "true",
  );
  return {
    ok: true,
    enabled: true,
    handler,
    triggerId: trigger.getUniqueId(),
    schedule: "a cada 15 minutos",
    maximumRepairsPerRun:
      FUNNEL_RECONCILIATION_CONFIG.maximumRepairsPerRun,
  };
}

function desativarReconciliacaoPeriodicaFunilAutorizada() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(
    FUNNEL_RECONCILIATION_CONFIG.enabledProperty,
    "false",
  );
  const handler = FUNNEL_RECONCILIATION_CONFIG.handler;
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function removeTrigger(trigger) {
    if (trigger.getHandlerFunction() !== handler) return;
    ScriptApp.deleteTrigger(trigger);
    removed += 1;
  });
  return { ok: true, enabled: false, handler, removed };
}
