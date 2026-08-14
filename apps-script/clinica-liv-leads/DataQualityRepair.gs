const DATA_QUALITY_REPAIR_CONFIG = Object.freeze({
  duplicateArchiveSheetName: "_LEADS_DUPLICADOS_ARQUIVO",
  canonicalFunnelSheetName: "_FUNIL_CANONICO",
  duplicateArchiveHeaders: Object.freeze([
    "Backup ID",
    "Criado em",
    "Aba",
    "Opportunity ID",
    "Linha canônica",
    "Linha arquivada",
    "Conteúdo JSON",
    "Estado",
  ]),
  canonicalFunnelHeaders: Object.freeze([
    "Opportunity ID",
    "Profissional",
    "Estado",
    "Fase",
    "Data do contato",
    "Data da situaÃ§Ã£o",
    "Plataforma de aquisiÃ§Ã£o",
    "Campanha",
    "Criativo",
    "CTA",
    "Destino",
    "ReferÃªncia completa",
    "Origem do evento",
    "Atualizado em",
  ]),
});

function statusLinhaQualidade_(row, columns) {
  const column = columns["Situação do lead"] || 5;
  return String(row[column - 1] || "");
}

function construirIndiceLeadsVisiveis_(spreadsheet) {
  const index = {};
  [
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    OPPORTUNITY_STORE_CONFIG.danielSheetName,
  ].forEach(function indexSheet(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const columns = mapaCabecalhosOportunidade_(sheet);
    const rows = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getDisplayValues();
    const byOpportunityId = {};
    const byPhone = {};
    const opportunityColumn = columns["Opportunity ID"];
    const phoneColumn = columns["Telefone (E.164)"] || 3;
    rows.forEach(function indexRow(row, rowIndex) {
      const rowNumber = rowIndex + 2;
      const opportunityId = opportunityColumn
        ? String(row[opportunityColumn - 1] || "").trim()
        : "";
      if (opportunityId) {
        if (!byOpportunityId[opportunityId]) byOpportunityId[opportunityId] = [];
        byOpportunityId[opportunityId].push(rowNumber);
      }
      const phone = normalizePhone_(row[phoneColumn - 1]);
      if (phone) {
        if (!byPhone[phone]) byPhone[phone] = [];
        byPhone[phone].push(rowNumber);
      }
    });
    index[sheetName] = {
      sheet,
      columns,
      rows,
      byOpportunityId,
      byPhone,
    };
  });
  return index;
}

function resolverLinhaLeadIndexada_(entry, opportunityId, phone) {
  if (!entry) return { ok: false, reason: "visible_sheet_not_found" };
  let matches;
  if (opportunityId && entry.columns["Opportunity ID"]) {
    matches = entry.byOpportunityId[String(opportunityId)] || [];
    return matches.length === 1
      ? { ok: true, row: matches[0], matchedBy: "opportunity_id" }
      : {
        ok: false,
        reason: matches.length
          ? "duplicate_opportunity_id_in_visible_sheet"
          : "opportunity_id_not_found_in_visible_sheet",
        matchCount: matches.length,
      };
  }
  const normalizedPhone = normalizePhone_(phone);
  if (!normalizedPhone) return { ok: false, reason: "invalid_phone" };
  matches = entry.byPhone[normalizedPhone] || [];
  return matches.length === 1
    ? { ok: true, row: matches[0], matchedBy: "unique_phone" }
    : {
      ok: false,
      reason: matches.length ? "ambiguous_phone" : "phone_not_found",
      matchCount: matches.length,
    };
}

function agruparLinhasPorOportunidade_(rows, columns) {
  const opportunityColumn = columns["Opportunity ID"];
  const groups = {};
  if (!opportunityColumn) return groups;
  rows.forEach(function collect(row, index) {
    const opportunityId = String(row[opportunityColumn - 1] || "").trim();
    if (!opportunityId) return;
    if (!groups[opportunityId]) groups[opportunityId] = [];
    groups[opportunityId].push({
      rowNumber: index + 2,
      stage: statusLinhaQualidade_(row, columns),
      values: row,
    });
  });
  return groups;
}

function escolherLinhaCanonicaDuplicidade_(entries, crmPointer) {
  if (!Array.isArray(entries) || entries.length < 2) {
    return { ok: false, reason: "duplicate_group_required" };
  }
  const valid = entries.map(function normalize(entry) {
    return {
      rowNumber: Number(entry.rowNumber || 0),
      stage: String(entry.stage || ""),
      rank: typeof rankFaseOportunidade_ === "function"
        ? rankFaseOportunidade_(entry.stage)
        : 0,
    };
  });
  const stageNamesByRank = {};
  valid.forEach(function groupStage(entry) {
    if (!entry.rank || !entry.stage) return;
    if (!stageNamesByRank[entry.rank]) stageNamesByRank[entry.rank] = [];
    if (stageNamesByRank[entry.rank].indexOf(entry.stage) < 0) {
      stageNamesByRank[entry.rank].push(entry.stage);
    }
  });
  const equalRankConflict = Object.keys(stageNamesByRank).some(function (rank) {
    return stageNamesByRank[rank].length > 1;
  });
  if (equalRankConflict) {
    return { ok: false, reason: "equal_rank_stage_conflict" };
  }

  const highestRank = valid.reduce(function maxRank(maximum, entry) {
    return Math.max(maximum, entry.rank);
  }, 0);
  const highest = valid.filter(function highestStage(entry) {
    return entry.rank === highestRank;
  });
  const pointed = highest.find(function matchesPointer(entry) {
    return entry.rowNumber === Number(crmPointer || 0);
  });
  const canonical = pointed || highest.reduce(function latest(best, entry) {
    return !best || entry.rowNumber > best.rowNumber ? entry : best;
  }, null);
  if (!canonical) return { ok: false, reason: "canonical_row_not_found" };
  return {
    ok: true,
    canonicalRow: canonical.rowNumber,
    targetStage: canonical.stage || "Novo",
    duplicateRows: valid
      .filter(function excess(entry) {
        return entry.rowNumber !== canonical.rowNumber;
      })
      .map(function rowNumber(entry) {
        return entry.rowNumber;
      }),
  };
}

function obterOuCriarArquivoDuplicidades_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    DATA_QUALITY_REPAIR_CONFIG.duplicateArchiveSheetName,
  );
  if (!sheet) {
    sheet = spreadsheet.insertSheet(
      DATA_QUALITY_REPAIR_CONFIG.duplicateArchiveSheetName,
    );
    sheet.getRange(
      1,
      1,
      1,
      DATA_QUALITY_REPAIR_CONFIG.duplicateArchiveHeaders.length,
    ).setValues([[...DATA_QUALITY_REPAIR_CONFIG.duplicateArchiveHeaders]]);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  garantirCabecalhosAditivos_(
    sheet,
    DATA_QUALITY_REPAIR_CONFIG.duplicateArchiveHeaders,
  );
  return sheet;
}

function planejarDeduplicacaoLeads_(spreadsheet) {
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const plan = {
    ok: true,
    duplicateGroups: 0,
    excessRows: 0,
    reviewRequired: 0,
    actions: [],
    issues: [],
  };
  [
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    OPPORTUNITY_STORE_CONFIG.danielSheetName,
  ].forEach(function inspectSheet(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const columns = mapaCabecalhosOportunidade_(sheet);
    const rows = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues();
    const groups = agruparLinhasPorOportunidade_(rows, columns);
    Object.keys(groups).forEach(function inspectGroup(opportunityId) {
      const entries = groups[opportunityId];
      if (entries.length < 2) return;
      plan.duplicateGroups += 1;
      plan.excessRows += entries.length - 1;
      const found = opportunitySheet
        ? localizarOportunidadePorId_(opportunitySheet, opportunityId)
        : null;
      const choice = escolherLinhaCanonicaDuplicidade_(
        entries,
        found && found.values[5],
      );
      if (!choice.ok) {
        plan.reviewRequired += 1;
        plan.issues.push({
          sheetName,
          opportunityId,
          reason: choice.reason,
          rows: entries.map(function rowNumber(entry) {
            return entry.rowNumber;
          }),
        });
        return;
      }
      plan.actions.push({
        sheetName,
        opportunityId,
        canonicalRow: choice.canonicalRow,
        duplicateRows: choice.duplicateRows,
        targetStage: choice.targetStage,
      });
    });
  });
  return plan;
}

function executarDeduplicacaoReversivelLeads(input) {
  const apply = Boolean(input && input.apply === true);
  if (!apply) {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const plan = planejarDeduplicacaoLeads_(spreadsheet);
    return Object.assign({ applied: false }, plan);
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, applied: false, error: "deduplication_lock_timeout" };
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const plan = planejarDeduplicacaoLeads_(spreadsheet);
    if (!plan.ok || plan.reviewRequired > 0) {
      return Object.assign({ applied: false }, plan);
    }
    const archive = obterOuCriarArquivoDuplicidades_(spreadsheet);
    let archivedRows = 0;
    let rolledBackGroups = 0;
    const backupIds = [];
    const applyIssues = plan.issues.slice();
    plan.actions.forEach(function applyGroup(action) {
      const sheet = spreadsheet.getSheetByName(action.sheetName);
      if (!sheet) {
        rolledBackGroups += 1;
        applyIssues.push({
          sheetName: action.sheetName,
          opportunityId: action.opportunityId,
          reason: "visible_sheet_not_found_during_apply",
        });
        return;
      }
      const backupRows = [];
      try {
        action.duplicateRows.forEach(function backup(rowNumber) {
          const values = sheet
            .getRange(rowNumber, 1, 1, sheet.getLastColumn())
            .getValues()[0];
          const backupId = "dup_" + Utilities.getUuid();
          archive.appendRow([
            backupId,
            new Date(),
            action.sheetName,
            action.opportunityId,
            action.canonicalRow,
            rowNumber,
            JSON.stringify(values),
            "pending",
          ]);
          backupRows.push({
            backupId,
            archiveRow: archive.getLastRow(),
            rowNumber,
            values,
          });
          sheet
            .getRange(rowNumber, 1, 1, sheet.getLastColumn())
            .clearContent();
        });

        const syncResult = sincronizarFaseOportunidadeELead_(spreadsheet, {
          opportunityId: action.opportunityId,
          stage: action.targetStage,
          source: "duplicate_repair",
          at: new Date(),
        });
        if (!syncResult.ok) {
          throw new Error(
            "canonical_sync_failed_" + String(syncResult.reason || "unknown"),
          );
        }
        backupRows.forEach(function commitBackup(entry) {
          archive.getRange(entry.archiveRow, 8).setValue("archived");
          backupIds.push(entry.backupId);
          archivedRows += 1;
        });
      } catch (error) {
        backupRows.forEach(function rollback(entry) {
          sheet
            .getRange(entry.rowNumber, 1, 1, entry.values.length)
            .setValues([entry.values]);
          archive.getRange(entry.archiveRow, 8).setValue("rolled_back");
        });
        rolledBackGroups += 1;
        applyIssues.push({
          sheetName: action.sheetName,
          opportunityId: action.opportunityId,
          reason: String(error && error.message || error || "apply_failed"),
        });
      }
    });
    SpreadsheetApp.flush();
    return {
      ok: rolledBackGroups === 0 && plan.reviewRequired === 0,
      applied: true,
      duplicateGroups: plan.duplicateGroups,
      archivedRows,
      backupIds,
      reviewRequired: plan.reviewRequired,
      rolledBackGroups,
      issues: applyIssues,
    };
  } finally {
    lock.releaseLock();
  }
}

function aplicarDeduplicacaoReversivelAutorizada() {
  const result = executarDeduplicacaoReversivelLeads({ apply: true });
  console.log("DEDUPLICATION_APPLY " + JSON.stringify({
    ok: Boolean(result && result.ok),
    applied: Boolean(result && result.applied),
    duplicateGroups: Number(result && result.duplicateGroups || 0),
    archivedRows: Number(result && result.archivedRows || 0),
    backupIds: result && result.backupIds || [],
    reviewRequired: Number(result && result.reviewRequired || 0),
    rolledBackGroups: Number(result && result.rolledBackGroups || 0),
    issuesCount: Array.isArray(result && result.issues)
      ? result.issues.length
      : 0,
    error: String(result && result.error || ""),
  }));
  return result;
}

function restaurarLeadDuplicadoArquivado(input) {
  const backupId = String(input && input.backupId || "");
  if (!backupId) return { ok: false, error: "backup_id_required" };
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const archive = spreadsheet.getSheetByName(
    DATA_QUALITY_REPAIR_CONFIG.duplicateArchiveSheetName,
  );
  if (!archive || archive.getLastRow() < 2) {
    return { ok: false, error: "backup_not_found" };
  }
  const match = archive
    .getRange(2, 1, archive.getLastRow() - 1, 1)
    .createTextFinder(backupId)
    .matchEntireCell(true)
    .findNext();
  if (!match) return { ok: false, error: "backup_not_found" };
  const archiveRow = archive
    .getRange(match.getRow(), 1, 1, 8)
    .getValues()[0];
  if (String(archiveRow[7] || "") !== "archived") {
    return { ok: false, error: "backup_not_restorable" };
  }
  const sheet = spreadsheet.getSheetByName(String(archiveRow[2] || ""));
  const rowNumber = Number(archiveRow[5] || 0);
  if (!sheet || rowNumber < 2) {
    return { ok: false, error: "restore_target_missing" };
  }
  const current = sheet
    .getRange(rowNumber, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  if (current.some(function populated(value) {
    return Boolean(String(value || "").trim());
  })) {
    return { ok: false, error: "restore_target_reused" };
  }
  const values = JSON.parse(String(archiveRow[6] || "[]"));
  sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
  archive.getRange(match.getRow(), 8).setValue("restored");
  SpreadsheetApp.flush();
  return { ok: true, restored: true, backupId };
}

function auditarIntegridadeFunilLocal_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const visibleIndex = construirIndiceLeadsVisiveis_(spreadsheet);
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const result = {
    ok: true,
    visibleOperationalRows: 0,
    visibleUniqueOpportunityIds: 0,
    visibleMissingOpportunityId: 0,
    duplicateGroups: 0,
    excessRows: 0,
    stageMismatches: 0,
    missingVisibleRows: 0,
    consultationRows: 0,
    consultationsMissingOpportunityId: 0,
    consultationsMissingCalendarEvent: 0,
  };
  const visibleIds = {};
  [
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    OPPORTUNITY_STORE_CONFIG.danielSheetName,
  ].forEach(function auditVisible(sheetName) {
    const entry = visibleIndex[sheetName];
    if (!entry) return;
    const columns = entry.columns;
    const rows = entry.rows;
    const phoneColumn = columns["Telefone (E.164)"] || 3;
    const opportunityColumn = columns["Opportunity ID"];
    rows.forEach(function auditRow(row) {
      if (!normalizePhone_(row[phoneColumn - 1])) return;
      result.visibleOperationalRows += 1;
      const opportunityId = String(row[opportunityColumn - 1] || "");
      if (!opportunityId) {
        result.visibleMissingOpportunityId += 1;
        return;
      }
      visibleIds[opportunityId] = (visibleIds[opportunityId] || 0) + 1;
    });
  });
  result.visibleUniqueOpportunityIds = Object.keys(visibleIds).length;
  Object.keys(visibleIds).forEach(function countDuplicate(opportunityId) {
    if (visibleIds[opportunityId] < 2) return;
    result.duplicateGroups += 1;
    result.excessRows += visibleIds[opportunityId] - 1;
  });

  if (opportunitySheet && opportunitySheet.getLastRow() >= 2) {
    const rows = opportunitySheet
      .getRange(
        2,
        1,
        opportunitySheet.getLastRow() - 1,
        OPPORTUNITY_HEADERS.length,
      )
      .getDisplayValues();
    rows.forEach(function auditOpportunity(row) {
      if (/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))) return;
      const entry = visibleIndex[String(row[4] || "")];
      const resolution = resolverLinhaLeadIndexada_(entry, row[0], row[1]);
      if (!resolution.ok) {
        result.missingVisibleRows += 1;
        return;
      }
      const columns = entry.columns;
      const visibleStage = entry.rows[resolution.row - 2][
        (columns["Situação do lead"] || 5) - 1
      ];
      if (String(visibleStage || "") !== String(row[7] || "")) {
        result.stageMismatches += 1;
      }
    });
  }

  const consultations = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );
  if (consultations && consultations.getLastRow() >= 2) {
    const columns = mapearCabecalhosConsultas_(
      consultations
        .getRange(1, 1, 1, consultations.getLastColumn())
        .getDisplayValues()[0],
    );
    const rows = consultations
      .getRange(
        2,
        1,
        consultations.getLastRow() - 1,
        consultations.getLastColumn(),
      )
      .getDisplayValues();
    rows.forEach(function auditConsultation(row) {
      const phone = valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.phone,
      );
      if (!normalizarTelefoneConsultasSync_(phone)) return;
      result.consultationRows += 1;
      const opportunityId = valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.opportunityId,
      );
      if (!opportunityId) result.consultationsMissingOpportunityId += 1;
      const status = valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.status,
      );
      const requiresCalendar = !statusConsultaEncerrada_(status) &&
        Boolean(valorDaLinhaConsultas_(
          row,
          columns,
          CONSULTAS_SYNC_HEADERS.scheduledDate,
        )) &&
        Boolean(valorDaLinhaConsultas_(
          row,
          columns,
          CONSULTAS_SYNC_HEADERS.scheduledTime,
        ));
      if (
        requiresCalendar &&
        !valorDaLinhaConsultas_(
          row,
          columns,
          CONSULTAS_SYNC_HEADERS.calendarEventId,
        )
      ) {
        result.consultationsMissingCalendarEvent += 1;
      }
    });
  }
  result.ok = result.visibleMissingOpportunityId === 0 &&
    result.excessRows === 0 &&
    result.stageMismatches === 0 &&
    result.missingVisibleRows === 0 &&
    result.consultationsMissingOpportunityId === 0 &&
    result.consultationsMissingCalendarEvent === 0;
  return result;
}

function reconciliarFasesHistoricasLeads(input) {
  const apply = Boolean(input && input.apply === true);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const visibleIndex = apply ? null : construirIndiceLeadsVisiveis_(spreadsheet);
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const result = {
    ok: true,
    applied: apply,
    inspected: 0,
    alreadyConsistent: 0,
    repairable: 0,
    repaired: 0,
    reviewRequired: 0,
    issues: [],
  };
  if (!opportunitySheet || opportunitySheet.getLastRow() < 2) {
    return Object.assign(result, { ok: false, error: "crm_missing" });
  }
  const rows = opportunitySheet
    .getRange(
      2,
      1,
      opportunitySheet.getLastRow() - 1,
      OPPORTUNITY_HEADERS.length,
    )
    .getDisplayValues();
  rows.forEach(function reconcile(row) {
    if (/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))) return;
    result.inspected += 1;
    const opportunityId = String(row[0] || "");
    const sheetName = String(row[4] || "");
    const sheet = spreadsheet.getSheetByName(sheetName);
    const indexed = visibleIndex && visibleIndex[sheetName];
    if (!sheet || (!apply && !indexed)) {
      result.reviewRequired += 1;
      result.issues.push({ opportunityId, reason: "visible_sheet_not_found" });
      return;
    }
    const leadResult = apply
      ? resolverLinhaLeadCanonica_(sheet, opportunityId, row[1])
      : resolverLinhaLeadIndexada_(indexed, opportunityId, row[1]);
    if (!leadResult.ok) {
      result.reviewRequired += 1;
      result.issues.push({
        opportunityId,
        reason: leadResult.reason,
      });
      return;
    }
    const columns = apply
      ? mapaCabecalhosOportunidade_(sheet)
      : indexed.columns;
    const visibleStage = String(apply
      ? sheet
        .getRange(leadResult.row, columns["Situação do lead"] || 5)
        .getDisplayValue() || ""
      : indexed.rows[leadResult.row - 2][
        (columns["Situação do lead"] || 5) - 1
      ] || "");
    const phaseResult = resolverFaseSincronizada_(
      String(row[7] || ""),
      visibleStage,
      { stage: String(row[7] || "") },
    );
    if (!phaseResult.ok) {
      result.reviewRequired += 1;
      result.issues.push({ opportunityId, reason: phaseResult.reason });
      return;
    }
    if (
      visibleStage === phaseResult.stage &&
      String(row[7] || "") === phaseResult.stage &&
      Number(row[5] || 0) === leadResult.row
    ) {
      result.alreadyConsistent += 1;
      return;
    }
    result.repairable += 1;
    if (!apply) return;
    const sync = sincronizarFaseOportunidadeELead_(spreadsheet, {
      opportunityId,
      stage: phaseResult.stage,
      source: "historical_stage_reconciliation",
      at: new Date(),
    });
    if (sync.ok) {
      result.repaired += 1;
    } else {
      result.reviewRequired += 1;
      result.issues.push({ opportunityId, reason: sync.reason });
    }
  });
  result.ok = result.reviewRequired === 0;
  if (apply) SpreadsheetApp.flush();
  return result;
}

function aplicarReconciliacaoFasesHistoricasAutorizada() {
  const expectedInspected = 131;
  const expectedRepairable = 27;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("historical_stage_reconciliation_lock_timeout");
  }

  function summarize(result) {
    return {
      ok: Boolean(result && result.ok),
      applied: Boolean(result && result.applied),
      inspected: Number(result && result.inspected || 0),
      alreadyConsistent: Number(result && result.alreadyConsistent || 0),
      repairable: Number(result && result.repairable || 0),
      repaired: Number(result && result.repaired || 0),
      reviewRequired: Number(result && result.reviewRequired || 0),
      issuesCount: Array.isArray(result && result.issues)
        ? result.issues.length
        : 0,
      error: String(result && result.error || ""),
    };
  }

  try {
    const preflight = reconciliarFasesHistoricasLeads({ apply: false });
    const preflightSummary = summarize(preflight);
    if (
      preflightSummary.ok &&
      preflightSummary.inspected === expectedInspected &&
      preflightSummary.repairable === 0 &&
      preflightSummary.reviewRequired === 0
    ) {
      const alreadyReconciled = {
        ok: true,
        applied: false,
        alreadyReconciled: true,
        preflight: preflightSummary,
      };
      console.log(
        "HISTORICAL_STAGE_RECONCILIATION_APPLY " +
          JSON.stringify(alreadyReconciled),
      );
      return alreadyReconciled;
    }
    if (
      !preflightSummary.ok ||
      preflightSummary.inspected !== expectedInspected ||
      preflightSummary.repairable !== expectedRepairable ||
      preflightSummary.reviewRequired !== 0 ||
      preflightSummary.issuesCount !== 0
    ) {
      const blocked = {
        ok: false,
        applied: false,
        reason: "preflight_mismatch",
        expectedInspected,
        expectedRepairable,
        preflight: preflightSummary,
      };
      console.log(
        "HISTORICAL_STAGE_RECONCILIATION_APPLY " + JSON.stringify(blocked),
      );
      return blocked;
    }

    const applied = reconciliarFasesHistoricasLeads({ apply: true });
    const postflight = reconciliarFasesHistoricasLeads({ apply: false });
    const appliedSummary = summarize(applied);
    const postflightSummary = summarize(postflight);
    const result = {
      ok: appliedSummary.ok &&
        appliedSummary.repaired === expectedRepairable &&
        appliedSummary.reviewRequired === 0 &&
        postflightSummary.ok &&
        postflightSummary.inspected === expectedInspected &&
        postflightSummary.repairable === 0 &&
        postflightSummary.reviewRequired === 0,
      applied: true,
      preflight: preflightSummary,
      write: appliedSummary,
      postflight: postflightSummary,
    };
    console.log(
      "HISTORICAL_STAGE_RECONCILIATION_APPLY " + JSON.stringify(result),
    );
    return result;
  } finally {
    lock.releaseLock();
  }
}

function construirIndiceOportunidadesConsultas_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const index = {
    sheet,
    byOpportunityId: {},
    byIdentity: {},
  };
  if (!sheet || sheet.getLastRow() < 2) return index;

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      OPPORTUNITY_HEADERS.length,
    )
    .getDisplayValues();
  rows.forEach(function indexOpportunity(row, rowIndex) {
    const entry = { row: rowIndex + 2, values: row };
    const opportunityId = String(row[0] || "").trim();
    if (opportunityId) {
      if (!index.byOpportunityId[opportunityId]) {
        index.byOpportunityId[opportunityId] = [];
      }
      index.byOpportunityId[opportunityId].push(entry);
    }

    if (/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))) {
      return;
    }
    const phone = normalizePhone_(row[1]);
    const professional = normalizarProfissionalOportunidade_(row[3]);
    if (!phone || !profissionalPermitidoOportunidade_(professional)) return;
    const key = professional + "|" + phone;
    if (!index.byIdentity[key]) index.byIdentity[key] = [];
    index.byIdentity[key].push(entry);
  });
  return index;
}

function resolverOportunidadeConsultaIndexada_(index, input) {
  if (!index || !index.sheet) {
    return { ok: false, reason: "crm_missing" };
  }
  const opportunityId = String(input && input.opportunityId || "").trim();
  if (opportunityId) {
    const matches = index.byOpportunityId[opportunityId] || [];
    if (matches.length !== 1) {
      return {
        ok: false,
        reason: matches.length
          ? "duplicate_opportunity_id"
          : "opportunity_id_not_found",
        matchCount: matches.length,
      };
    }
    const phone = normalizePhone_(input && input.phone);
    const professional = normalizarProfissionalOportunidade_(
      input && input.professional,
    );
    const foundPhone = normalizePhone_(matches[0].values[1]);
    const foundProfessional = normalizarProfissionalOportunidade_(
      matches[0].values[3],
    );
    if (!phone || !profissionalPermitidoOportunidade_(professional)) {
      return {
        ok: false,
        reason: profissionalPermitidoOportunidade_(professional)
          ? "missing_canonical_identity"
          : "unsupported_professional_opportunity_link",
      };
    }
    if (professional !== foundProfessional) {
      return { ok: false, reason: "opportunity_professional_mismatch" };
    }
    if (phone !== foundPhone) {
      return { ok: false, reason: "opportunity_phone_mismatch" };
    }
    return {
      ok: true,
      sheet: index.sheet,
      found: matches[0],
      opportunityId,
      matchedBy: "opportunity_id",
    };
  }

  const phone = normalizePhone_(input && input.phone);
  const professional = normalizarProfissionalOportunidade_(
    input && input.professional,
  );
  if (!phone || !profissionalPermitidoOportunidade_(professional)) {
    return { ok: false, reason: "missing_canonical_identity" };
  }
  const matches = index.byIdentity[professional + "|" + phone] || [];
  return matches.length === 1
    ? {
      ok: true,
      sheet: index.sheet,
      found: matches[0],
      opportunityId: String(matches[0].values[0] || ""),
      matchedBy: "unique_active_professional_phone",
    }
    : {
      ok: false,
      reason: matches.length
        ? "ambiguous_active_opportunity"
        : "opportunity_not_found",
      matchCount: matches.length,
    };
}

function auditarFaseConsultaIndexada_(visibleIndex, identity, stage) {
  if (!stage) return { ok: true, state: "not_applicable" };
  const found = identity && identity.found;
  const opportunity = found && found.values;
  if (!opportunity) {
    return { ok: false, state: "review", reason: "opportunity_missing" };
  }
  const opportunityId = String(opportunity[0] || "");
  const entry = visibleIndex[String(opportunity[4] || "")];
  const lead = resolverLinhaLeadIndexada_(
    entry,
    opportunityId,
    opportunity[1],
  );
  if (!lead.ok) {
    return { ok: false, state: "review", reason: lead.reason };
  }
  const visibleStage = String(
    statusLinhaQualidade_(entry.rows[lead.row - 2], entry.columns) || "",
  );
  const phase = resolverFaseSincronizada_(
    String(opportunity[7] || ""),
    visibleStage,
    { stage },
  );
  if (!phase.ok) {
    return { ok: false, state: "review", reason: phase.reason };
  }
  const consistent = visibleStage === phase.stage &&
    String(opportunity[7] || "") === phase.stage &&
    Number(opportunity[5] || 0) === lead.row;
  const stageMismatch = visibleStage !== phase.stage ||
    String(opportunity[7] || "") !== phase.stage;
  return {
    ok: true,
    state: consistent ? "consistent" : "repairable",
    reason: consistent
      ? ""
      : stageMismatch
        ? "stage_mismatch"
        : "visible_pointer_mismatch",
    targetStage: phase.stage,
  };
}

function diagnosticarEventoAgendaConsulta_(event, expected) {
  if (!event || !expected) {
    return { consistent: false, reason: "calendar_event_missing" };
  }
  const normalizedDescription = String(event.getDescription() || "")
    .replace(/\s+/g, " ")
    .trim();
  const acceptedDescriptions = (expected.acceptedDescriptions || [
    expected.description,
  ]).map(function normalizeDescription(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  });
  const checks = {
    time: event.getStartTime().getTime() === expected.start.getTime() &&
      event.getEndTime().getTime() === expected.end.getTime(),
    title: String(event.getTitle() || "") === expected.title,
    description: acceptedDescriptions.indexOf(normalizedDescription) >= 0,
    location: String(event.getLocation() || "") === expected.location,
  };
  const failed = Object.keys(checks).filter(function failedCheck(key) {
    return !checks[key];
  });
  return {
    consistent: failed.length === 0,
    reason: failed.length ? "calendar_drift_" + failed.join("_") : "",
  };
}

function eventoAgendaConsultaConsistente_(event, expected) {
  return diagnosticarEventoAgendaConsulta_(event, expected).consistent;
}

function auditarAgendaConsultaHistorica_(row, columns) {
  const status = valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.status,
  );
  const scheduledDate = valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.scheduledDate,
  );
  const scheduledTime = valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.scheduledTime,
  );
  if (!scheduledDate || !scheduledTime || statusConsultaEncerrada_(status)) {
    return { ok: true, state: "not_applicable" };
  }

  const professional = textoConsultasSync_(valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.professional,
  ), 80);
  const consultationType = valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.consultationType,
  );
  const location = valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.location,
  );
  const room = normalizarSalaConsulta_(valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.room,
  ));
  const calendarId = textoConsultasSync_(valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.calendarId,
  ), 240);
  const eventId = textoConsultasSync_(valorDaLinhaConsultas_(
    row,
    columns,
    CONSULTAS_SYNC_HEADERS.calendarEventId,
  ), 240);

  if (!consultaOcupaSala_({ consultationType, location })) {
    const needsRepair = Boolean(room || calendarId || eventId);
    return {
      ok: true,
      state: needsRepair ? "repairable" : "consistent",
      safeToApply: false,
      reason: needsRepair
        ? "remote_consultation_has_room_event"
        : "",
    };
  }
  if (!professional) {
    return { ok: false, state: "review", reason: "professional_missing" };
  }
  const interval = intervaloConsultaAgenda_(
    scheduledDate,
    scheduledTime,
    valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_HEADERS.durationMinutes,
    ),
  );
  if (!interval) {
    return { ok: false, state: "review", reason: "invalid_schedule" };
  }
  const allowedRooms = salasPermitidasProfissional_(professional);
  const expectedCalendarId = CONSULTAS_SYNC_CONFIG.roomCalendars[room];
  if (
    !room ||
    allowedRooms.indexOf(room) < 0 ||
    !calendarId ||
    calendarId !== expectedCalendarId ||
    !eventId
  ) {
    return {
      ok: true,
      state: "repairable",
      safeToApply: false,
      reason: "calendar_link_missing_or_invalid",
    };
  }

  try {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      return { ok: false, state: "review", reason: "calendar_not_accessible" };
    }
    const event = calendar.getEventById(eventId);
    if (!event) {
      return {
        ok: true,
        state: "repairable",
        safeToApply: false,
        reason: "calendar_event_missing",
      };
    }
    const noShow = statusNaoCompareceuConsulta_(status);
    const expected = {
      start: interval.start,
      end: interval.end,
      title: (noShow
        ? "N\u00e3o compareceu \u2014 "
        : "Consulta \u2014 ") + professional,
      description:
        "Reserva operacional vinculada \u00e0 aba Consultas. " +
        "Dados da paciente permanecem somente na planilha." +
        (noShow
          ? " Resultado operacional: n\u00e3o compareceu."
          : ""),
      acceptedDescriptions: [
        "Reserva operacional vinculada \u00e0 aba Consultas. " +
          "Dados da paciente permanecem somente na planilha." +
          (noShow
            ? " Resultado operacional: n\u00e3o compareceu."
            : ""),
        "Reserva realizada pelo formul\u00e1rio da Cl\u00ednica LIV. " +
          "Nenhum dado de paciente \u00e9 inclu\u00eddo no Google Agenda.",
      ],
      location: "Cl\u00ednica LIV Faria Lima \u2014 " + room,
    };
    const diagnostic = diagnosticarEventoAgendaConsulta_(event, expected);
    return {
      ok: true,
      state: diagnostic.consistent ? "consistent" : "repairable",
      safeToApply: !diagnostic.consistent &&
        diagnostic.reason.indexOf("time") < 0,
      reason: diagnostic.reason,
    };
  } catch (error) {
    return {
      ok: false,
      state: "review",
      reason: "calendar_audit_failed",
    };
  }
}

function reconciliarConsultasHistoricas(input) {
  const apply = Boolean(input && input.apply === true);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const opportunityIndex = construirIndiceOportunidadesConsultas_(spreadsheet);
  const visibleIndex = construirIndiceLeadsVisiveis_(spreadsheet);
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );
  const result = {
    ok: true,
    applied: apply,
    inspected: 0,
    identityEligible: 0,
    identityAlreadyConsistent: 0,
    identityNotApplicable: 0,
    identityMissing: 0,
    identityRepairable: 0,
    identityRepaired: 0,
    phaseEligible: 0,
    phaseAlreadyConsistent: 0,
    phaseRepairable: 0,
    phaseRepaired: 0,
    phaseNotApplicable: 0,
    calendarEligible: 0,
    calendarAlreadyConsistent: 0,
    calendarRepairable: 0,
    calendarSafeRepairable: 0,
    calendarBlockedRepairable: 0,
    calendarRepaired: 0,
    calendarNotApplicable: 0,
    reviewRequired: 0,
    issues: [],
    repairs: [],
  };
  if (!sheet) {
    return Object.assign(result, { ok: false, error: "consultations_missing" });
  }
  if (apply) garantirEstruturaSincronizacaoConsultas_(sheet);
  const columns = mapearCabecalhosConsultas_(
    sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0],
  );
  const rows = sheet.getLastRow() >= 2
    ? sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues()
    : [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rowNumber = rowIndex + 2;
    let row = rows[rowIndex];
    const phone = valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_HEADERS.phone,
    );
    const professional = valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_HEADERS.professional,
    );
    const professionalKey = normalizarProfissionalOportunidade_(professional);
    let opportunityId = String(valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_HEADERS.opportunityId,
    ) || "");
    const hasOperationalContent = Boolean(
      normalizarTelefoneConsultasSync_(phone) ||
      opportunityId ||
      String(professional || "").trim() ||
      valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.scheduledDate,
      ) ||
      valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.status,
      ),
    );
    if (!hasOperationalContent) continue;
    result.inspected += 1;
    const identityRequired = opportunityId ||
      profissionalPermitidoOportunidade_(professionalKey);
    let identity = null;
    if (!identityRequired) {
      result.identityNotApplicable += 1;
    } else {
      result.identityEligible += 1;
      identity = resolverOportunidadeConsultaIndexada_(opportunityIndex, {
        opportunityId,
        phone,
        professional,
      });
      if (!opportunityId) result.identityMissing += 1;
      if (!identity.ok) {
        result.reviewRequired += 1;
        result.issues.push({
          consultationRow: rowNumber,
          reason: identity.reason,
        });
      } else if (!opportunityId) {
        opportunityId = identity.opportunityId;
        result.identityRepairable += 1;
        if (apply) {
          definirValorConsulta_(
            sheet,
            rowNumber,
            columns,
            CONSULTAS_SYNC_HEADERS.opportunityId,
            opportunityId,
          );
          result.identityRepaired += 1;
          row[columns[CONSULTAS_SYNC_HEADERS.opportunityId]] = opportunityId;
        }
      } else {
        result.identityAlreadyConsistent += 1;
      }
    }

    const status = valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_HEADERS.status,
    );
    const canonicalStage = statusCanonicoLeadDaConsulta_(status);
    const phaseAudit = identity && identity.ok
      ? auditarFaseConsultaIndexada_(visibleIndex, identity, canonicalStage)
      : { ok: true, state: "not_applicable" };
    if (phaseAudit.state === "not_applicable") {
      result.phaseNotApplicable += 1;
    } else {
      result.phaseEligible += 1;
      if (!phaseAudit.ok) {
        result.reviewRequired += 1;
        result.issues.push({
          consultationRow: rowNumber,
          reason: phaseAudit.reason || "phase_audit_failed",
        });
      } else if (phaseAudit.state === "consistent") {
        result.phaseAlreadyConsistent += 1;
      } else if (phaseAudit.state === "repairable") {
        result.phaseRepairable += 1;
        result.repairs.push({
          consultationRow: rowNumber,
          area: "phase",
          reason: phaseAudit.reason || "phase_repair_required",
        });
      }
      if (apply && phaseAudit.ok && phaseAudit.state === "repairable") {
        const phase = atualizarStatusLeadDaConsulta_(
          spreadsheet,
          phone,
          professional,
          status,
          opportunityId,
        );
        if (phase && phase.ok) result.phaseRepaired += phase.changed ? 1 : 0;
        else {
          result.reviewRequired += 1;
          result.issues.push({
            consultationRow: rowNumber,
            reason: phase && phase.reason || "phase_sync_failed",
          });
        }
      }
    }

    const calendarAudit = auditarAgendaConsultaHistorica_(row, columns);
    if (calendarAudit.state === "not_applicable") {
      result.calendarNotApplicable += 1;
      continue;
    }
    result.calendarEligible += 1;
    if (!calendarAudit.ok) {
      result.reviewRequired += 1;
      result.issues.push({
        consultationRow: rowNumber,
        reason: calendarAudit.reason || "calendar_audit_failed",
      });
      continue;
    }
    if (calendarAudit.state === "consistent") {
      result.calendarAlreadyConsistent += 1;
      continue;
    }
    result.calendarRepairable += 1;
    if (calendarAudit.safeToApply) {
      result.calendarSafeRepairable += 1;
    } else {
      result.calendarBlockedRepairable += 1;
      result.reviewRequired += 1;
      result.issues.push({
        consultationRow: rowNumber,
        reason: calendarAudit.reason || "calendar_repair_blocked",
      });
    }
    result.repairs.push({
      consultationRow: rowNumber,
      area: "calendar",
      reason: calendarAudit.reason || "calendar_repair_required",
    });
    if (!apply || !calendarAudit.safeToApply) continue;
    const calendar = sincronizarConsultaComAgendaNaLinha_(
      sheet,
      rowNumber,
      columns,
      row,
    );
    if (calendar.ok) result.calendarRepaired += 1;
    else {
      result.reviewRequired += 1;
      result.issues.push({
        consultationRow: rowNumber,
        reason: calendar.error || "calendar_sync_failed",
      });
    }
  }
  result.ok = result.reviewRequired === 0;
  if (apply) SpreadsheetApp.flush();
  return result;
}

function aplicarReconciliacaoConsultasSegurasAutorizada() {
  const expected = Object.freeze({
    inspected: 43,
    identityAlreadyConsistent: 9,
    identityMissing: 26,
    identityRepairable: 0,
    identityNotApplicable: 7,
    phaseRepairable: 3,
    calendarSafeRepairable: 9,
    calendarBlockedRepairable: 2,
    reviewRequired: 29,
  });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("safe_consultation_reconciliation_lock_timeout");
  }

  function summarize(result) {
    return {
      ok: Boolean(result && result.ok),
      applied: Boolean(result && result.applied),
      inspected: Number(result && result.inspected || 0),
      identityAlreadyConsistent: Number(
        result && result.identityAlreadyConsistent || 0,
      ),
      identityMissing: Number(result && result.identityMissing || 0),
      identityRepairable: Number(result && result.identityRepairable || 0),
      identityNotApplicable: Number(
        result && result.identityNotApplicable || 0,
      ),
      phaseRepairable: Number(result && result.phaseRepairable || 0),
      phaseRepaired: Number(result && result.phaseRepaired || 0),
      calendarSafeRepairable: Number(
        result && result.calendarSafeRepairable || 0,
      ),
      calendarBlockedRepairable: Number(
        result && result.calendarBlockedRepairable || 0,
      ),
      calendarRepaired: Number(result && result.calendarRepaired || 0),
      reviewRequired: Number(result && result.reviewRequired || 0),
      issuesCount: Array.isArray(result && result.issues)
        ? result.issues.length
        : 0,
    };
  }

  function matchesExpected(summary, allowSafeRepairs) {
    return summary.inspected === expected.inspected &&
      summary.identityAlreadyConsistent ===
        expected.identityAlreadyConsistent &&
      summary.identityMissing === expected.identityMissing &&
      summary.identityRepairable === expected.identityRepairable &&
      summary.identityNotApplicable === expected.identityNotApplicable &&
      summary.phaseRepairable === (allowSafeRepairs
        ? expected.phaseRepairable
        : 0) &&
      summary.calendarSafeRepairable === (allowSafeRepairs
        ? expected.calendarSafeRepairable
        : 0) &&
      summary.calendarBlockedRepairable ===
        expected.calendarBlockedRepairable &&
      summary.reviewRequired === expected.reviewRequired &&
      summary.issuesCount === expected.reviewRequired;
  }

  try {
    const preflight = summarize(
      reconciliarConsultasHistoricas({ apply: false }),
    );
    if (matchesExpected(preflight, false)) {
      const alreadyReconciled = {
        ok: true,
        applied: false,
        alreadyReconciled: true,
        preflight,
      };
      console.log(
        "SAFE_CONSULTATION_RECONCILIATION_APPLY " +
          JSON.stringify(alreadyReconciled),
      );
      return alreadyReconciled;
    }
    if (!matchesExpected(preflight, true)) {
      const blocked = {
        ok: false,
        applied: false,
        reason: "preflight_mismatch",
        expected,
        preflight,
      };
      console.log(
        "SAFE_CONSULTATION_RECONCILIATION_APPLY " + JSON.stringify(blocked),
      );
      return blocked;
    }

    const write = summarize(
      reconciliarConsultasHistoricas({ apply: true }),
    );
    const postflight = summarize(
      reconciliarConsultasHistoricas({ apply: false }),
    );
    const result = {
      ok: write.phaseRepaired >= 1 &&
        write.phaseRepaired <= expected.phaseRepairable &&
        write.calendarRepaired === expected.calendarSafeRepairable &&
        matchesExpected(postflight, false),
      applied: true,
      preflight,
      write,
      postflight,
    };
    console.log(
      "SAFE_CONSULTATION_RECONCILIATION_APPLY " + JSON.stringify(result),
    );
    return result;
  } finally {
    lock.releaseLock();
  }
}

function reconciliarAtribuicaoHistoricaLeads(input) {
  const apply = Boolean(input && input.apply === true);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const result = {
    ok: true,
    applied: apply,
    inspected: 0,
    alreadyComplete: 0,
    repairable: 0,
    repaired: 0,
    m26f02sRows: 0,
    reviewRequired: 0,
    issues: [],
  };
  [
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    OPPORTUNITY_STORE_CONFIG.danielSheetName,
  ].forEach(function reconcileSheet(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const columns = apply
      ? garantirEstruturaIntegradaLead_(sheet)
      : mapaCabecalhosOportunidade_(sheet);
    const width = sheet.getLastColumn();
    const rows = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, width)
      .getDisplayValues();
    rows.forEach(function reconcileRow(row, index) {
      const phoneColumn = columns["Telefone (E.164)"] || 3;
      if (!normalizePhone_(row[phoneColumn - 1])) return;
      result.inspected += 1;
      const rowNumber = index + 2;
      const fullReference = String(
        row[(columns["ReferÃªncia completa"] || 25) - 1] ||
        row[(columns["ReferÃªncia da campanha"] || 2) - 1] ||
        "",
      ).trim();
      const parsed = decomporReferenciaAquisicao_(fullReference);
      if (parsed.campaign === "M26F02S") result.m26f02sRows += 1;
      const desired = {
        "Campanha": parsed.campaign,
        "Criativo": parsed.creative,
        "CTA": parsed.cta,
        "ReferÃªncia completa": parsed.reference,
      };
      const writes = [];
      let conflict = false;
      Object.keys(desired).forEach(function inspectField(header) {
        const column = columns[header];
        const value = String(desired[header] || "").trim();
        if (!column || !value) return;
        const current = String(row[column - 1] || "").trim();
        if (!current) {
          writes.push({ column, value });
          return;
        }
        if (current !== value) conflict = true;
      });
      if (conflict) {
        result.reviewRequired += 1;
        result.issues.push({
          sheetName,
          row: rowNumber,
          reason: "frozen_attribution_conflict",
        });
        return;
      }
      if (!writes.length) {
        result.alreadyComplete += 1;
        return;
      }
      result.repairable += 1;
      if (!apply) return;
      writes.forEach(function writeField(write) {
        sheet.getRange(rowNumber, write.column).setValue(write.value);
      });
      result.repaired += 1;
    });
  });
  result.ok = result.reviewRequired === 0;
  if (apply) SpreadsheetApp.flush();
  return result;
}

function construirFonteFunilCanonico_(spreadsheet) {
  const visibleIndex = construirIndiceLeadsVisiveis_(spreadsheet);
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const result = {
    ok: true,
    rows: [],
    reviewRequired: 0,
    issues: [],
  };
  if (!opportunitySheet || opportunitySheet.getLastRow() < 2) {
    return Object.assign(result, { ok: false, error: "crm_missing" });
  }
  const opportunities = opportunitySheet
    .getRange(
      2,
      1,
      opportunitySheet.getLastRow() - 1,
      OPPORTUNITY_HEADERS.length,
    )
    .getDisplayValues();
  opportunities.forEach(function buildRow(opportunity) {
    if (/^(?:closed|voided|encerrada)$/i.test(String(opportunity[6] || ""))) {
      return;
    }
    const professional = normalizarProfissionalOportunidade_(opportunity[3]);
    if (professional !== "amanda" && professional !== "daniel") return;
    const opportunityId = String(opportunity[0] || "");
    const entry = visibleIndex[String(opportunity[4] || "")];
    const identity = resolverLinhaLeadIndexada_(
      entry,
      opportunityId,
      opportunity[1],
    );
    if (!identity.ok) {
      result.reviewRequired += 1;
      result.issues.push({
        opportunityId,
        reason: identity.reason || "visible_identity_not_found",
      });
      return;
    }
    const columns = entry.columns;
    const row = entry.rows[identity.row - 2];
    function value(header, fallback) {
      const column = columns[header] || fallback || 0;
      return column ? row[column - 1] || "" : "";
    }
    result.rows.push([
      opportunityId,
      professional,
      String(opportunity[6] || ""),
      String(opportunity[7] || value("SituaÃ§Ã£o do lead", 5)),
      value("Data do contato", 1),
      value("Data da situaÃ§Ã£o", 6),
      value("Plataforma de aquisiÃ§Ã£o", 20),
      value("Campanha", 21),
      value("Criativo", 22),
      value("CTA", 23),
      value("Destino", 24),
      value("ReferÃªncia completa", 25),
      value("Origem do evento", 19),
      String(opportunity[24] || ""),
    ]);
  });
  result.ok = result.reviewRequired === 0;
  return result;
}

function reconstruirFonteFunilCanonico(input) {
  const apply = Boolean(input && input.apply === true);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const source = construirFonteFunilCanonico_(spreadsheet);
  const publicResult = {
    ok: source.ok,
    applied: apply,
    canonicalRows: source.rows.length,
    reviewRequired: source.reviewRequired,
    issues: source.issues,
  };
  if (!apply || !source.ok) return publicResult;
  let sheet = spreadsheet.getSheetByName(
    DATA_QUALITY_REPAIR_CONFIG.canonicalFunnelSheetName,
  );
  if (!sheet) {
    sheet = spreadsheet.insertSheet(
      DATA_QUALITY_REPAIR_CONFIG.canonicalFunnelSheetName,
    );
  }
  const headers = DATA_QUALITY_REPAIR_CONFIG.canonicalFunnelHeaders;
  garantirCabecalhosAditivos_(sheet, headers);
  sheet.getRange(1, 1, 1, headers.length).setValues([[...headers]]);
  if (sheet.getLastRow() > 1) {
    sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .clearContent();
  }
  if (source.rows.length) {
    sheet
      .getRange(2, 1, source.rows.length, headers.length)
      .setValues(source.rows);
  }
  sheet.setFrozenRows(1);
  sheet.hideSheet();
  SpreadsheetApp.flush();
  return publicResult;
}

function resumirSimulacaoCorrecaoIntegrada_(result) {
  if (!result || typeof result !== "object") return result;
  const summary = {};
  Object.keys(result).forEach(function summarizeField(key) {
    const value = result[key];
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      summary[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      summary[key + "Count"] = value.length;
      if (key === "issues") {
        summary.issueReasons = value.reduce(function countReasons(counts, issue) {
          const reason = String(issue && issue.reason || "unknown");
          counts[reason] = Number(counts[reason] || 0) + 1;
          return counts;
        }, {});
      }
      if (key === "repairs") {
        summary.repairReasons = value.reduce(function countRepairs(
          counts,
          repair,
        ) {
          const reason = [
            String(repair && repair.area || "unknown"),
            String(repair && repair.reason || "unknown"),
          ].join(":");
          counts[reason] = Number(counts[reason] || 0) + 1;
          return counts;
        }, {});
      }
    }
  });
  return summary;
}

function executarSimulacaoCorrecaoIntegrada_(name, callback) {
  let summary;
  try {
    summary = resumirSimulacaoCorrecaoIntegrada_(callback());
  } catch (error) {
    summary = {
      ok: false,
      error: String(error && error.message || error || "unknown"),
    };
  }
  const report = {
    name,
    apply: false,
    generatedAt: new Date().toISOString(),
    result: summary,
  };
  console.log("INTEGRATED_DRY_RUN_CHECK " + JSON.stringify(report));
  return report;
}

function simularCorrecao01IntegridadeFunil() {
  return executarSimulacaoCorrecaoIntegrada_("integridade_funil", function run() {
    return auditarIntegridadeFunilLocal_();
  });
}

function simularCorrecao02Deduplicacao() {
  return executarSimulacaoCorrecaoIntegrada_("deduplicacao", function run() {
    return executarDeduplicacaoReversivelLeads({ apply: false });
  });
}

function simularCorrecao03FasesHistoricas() {
  return executarSimulacaoCorrecaoIntegrada_("fases_historicas", function run() {
    return reconciliarFasesHistoricasLeads({ apply: false });
  });
}

function simularCorrecao04ConsultasHistoricas() {
  return executarSimulacaoCorrecaoIntegrada_("consultas_historicas", function run() {
    return reconciliarConsultasHistoricas({ apply: false });
  });
}

function simularCorrecao05AtribuicaoHistorica() {
  return executarSimulacaoCorrecaoIntegrada_("atribuicao_historica", function run() {
    return reconciliarAtribuicaoHistoricaLeads({ apply: false });
  });
}

function simularCorrecao06GoogleAds() {
  return executarSimulacaoCorrecaoIntegrada_("google_ads", function run() {
    return reconciliarGoogleAdsLedgerEImportacao({ apply: false });
  });
}

function resumoReconciliacaoGoogleAdsCorresponde_(summary, expected) {
  return Object.keys(expected).every(function compareExpected(key) {
    return Number(summary && summary[key]) === Number(expected[key]);
  });
}

function aplicarReconciliacaoGoogleAdsSeguraAutorizada() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("google_ads_reconciliation_lock_unavailable");
  }
  try {
    const expectedBefore = {
      importRows: 5,
      ledgerRows: 2,
      invalidImportRows: 0,
      duplicateTransactions: 0,
      conversionNameMismatches: 3,
      visibleConversionNameMismatches: 5,
      missingLedger: 3,
      missingImport: 0,
      reviewRequired: 0,
    };
    const expectedAfter = {
      importRows: 5,
      ledgerRows: 5,
      invalidImportRows: 0,
      duplicateTransactions: 0,
      conversionNameMismatches: 0,
      visibleConversionNameMismatches: 0,
      missingLedger: 0,
      missingImport: 0,
      reviewRequired: 0,
    };
    const before = reconciliarGoogleAdsLedgerEImportacao({ apply: false });
    if (resumoReconciliacaoGoogleAdsCorresponde_(before, expectedAfter)) {
      return {
        ok: true,
        applied: false,
        alreadyReconciled: true,
        before,
        after: before,
      };
    }
    if (
      !before.ok ||
      !resumoReconciliacaoGoogleAdsCorresponde_(before, expectedBefore)
    ) {
      throw new Error(
        "google_ads_reconciliation_preflight_mismatch:" +
          JSON.stringify(resumirSimulacaoCorrecaoIntegrada_(before)),
      );
    }
    const applied = reconciliarGoogleAdsLedgerEImportacao({ apply: true });
    if (
      !applied.ok ||
      !applied.applied ||
      applied.reconstructedLedger !== 3 ||
      applied.reconstructedImport !== 0
    ) {
      throw new Error(
        "google_ads_reconciliation_apply_failed:" +
          JSON.stringify(resumirSimulacaoCorrecaoIntegrada_(applied)),
      );
    }
    const after = reconciliarGoogleAdsLedgerEImportacao({ apply: false });
    if (
      !after.ok ||
      !resumoReconciliacaoGoogleAdsCorresponde_(after, expectedAfter)
    ) {
      throw new Error(
        "google_ads_reconciliation_postflight_failed:" +
          JSON.stringify(resumirSimulacaoCorrecaoIntegrada_(after)),
      );
    }
    const report = {
      ok: true,
      applied: true,
      alreadyReconciled: false,
      reconstructedLedger: applied.reconstructedLedger,
      reconstructedImport: applied.reconstructedImport,
      before: resumirSimulacaoCorrecaoIntegrada_(before),
      after: resumirSimulacaoCorrecaoIntegrada_(after),
    };
    console.log(
      "SAFE_GOOGLE_ADS_RECONCILIATION_APPLY " + JSON.stringify(report),
    );
    return report;
  } finally {
    lock.releaseLock();
  }
}

function simularCorrecao07FunilCanonico() {
  return executarSimulacaoCorrecaoIntegrada_("funil_canonico", function run() {
    return reconstruirFonteFunilCanonico({ apply: false });
  });
}

function simularCorrecao08ReaperClassificacao() {
  return executarSimulacaoCorrecaoIntegrada_("reaper_classificacao", function run() {
    return executarReaperFilaClassificacao({ apply: false });
  });
}

function simularCorrecao09SlaOperacional() {
  return executarSimulacaoCorrecaoIntegrada_("sla_operacional", function run() {
    return auditarSlaOperacional();
  });
}

function executarSimulacoesCorrecaoIntegrada() {
  const checks = [
    ["integridade_funil", function runIntegrity() {
      return auditarIntegridadeFunilLocal_();
    }],
    ["deduplicacao", function runDeduplication() {
      return executarDeduplicacaoReversivelLeads({ apply: false });
    }],
    ["fases_historicas", function runStages() {
      return reconciliarFasesHistoricasLeads({ apply: false });
    }],
    ["consultas_historicas", function runAppointments() {
      return reconciliarConsultasHistoricas({ apply: false });
    }],
    ["atribuicao_historica", function runAttribution() {
      return reconciliarAtribuicaoHistoricaLeads({ apply: false });
    }],
    ["google_ads", function runGoogleAds() {
      return reconciliarGoogleAdsLedgerEImportacao({ apply: false });
    }],
    ["funil_canonico", function runCanonicalFunnel() {
      return reconstruirFonteFunilCanonico({ apply: false });
    }],
    ["reaper_classificacao", function runClassificationReaper() {
      return executarReaperFilaClassificacao({ apply: false });
    }],
    ["sla_operacional", function runOperationalSla() {
      return auditarSlaOperacional();
    }],
  ];
  const report = {
    ok: true,
    apply: false,
    generatedAt: new Date().toISOString(),
    checks: {},
  };
  checks.forEach(function runCheck(entry) {
    const name = entry[0];
    try {
      report.checks[name] = resumirSimulacaoCorrecaoIntegrada_(entry[1]());
    } catch (error) {
      report.ok = false;
      report.checks[name] = {
        ok: false,
        error: String(error && error.message || error || "unknown"),
      };
    }
  });
  console.log("INTEGRATED_DRY_RUN " + JSON.stringify(report));
  return report;
}
