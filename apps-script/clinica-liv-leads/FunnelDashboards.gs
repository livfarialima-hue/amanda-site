const FUNNEL_DASHBOARD_CONFIG = Object.freeze({
  canonicalSheetName: "_FUNIL_CANONICO",
  funnelSheetName: "Funil Comercial",
  economicSheetName: "Painel Econômico",
  legacyOrphanSheetName: "_FUNIL_MANUAL_ORFAOS",
  visibleLeadSheetName: "Google Ads - Conversões",
  professional: "amanda",
  maximumRows: 499,
});

const FUNNEL_COMMERCIAL_HEADERS = Object.freeze([
  "Opportunity ID",
  "Data do contato",
  "Plataforma",
  "Campanha",
  "Criativo",
  "CTA",
  "Destino",
  "Situação atual",
  "Data situação atual",
  "Data qualificação",
  "Data agendamento",
  "Data consulta realizada",
  "Data fechamento",
  "Valor contratado (R$)",
  "Primeira resposta humana",
  "Minutos até 1ª resposta",
  "Follow-up realizado?",
  "Data/hora follow-up",
  "Motivo de não avanço",
  "Observação comercial",
]);

const FUNNEL_MANUAL_HEADERS = Object.freeze(
  FUNNEL_COMMERCIAL_HEADERS.slice(9),
);

function normalizarPlataformaFunil_(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!normalized) return "Não identificada";
  if (normalized.indexOf("google") >= 0) return "Google";
  if (normalized.indexOf("meta") >= 0) return "Meta";
  if (
    normalized.indexOf("organ") >= 0 ||
    normalized.indexOf("conteudo") >= 0
  ) {
    return "Orgânico/Conteúdo";
  }
  if (normalized.indexOf("whatsapp") >= 0) return "WhatsApp direto";
  return "Outros";
}

function linhaFunilComercialCanonica_(canonicalRow, manualValues, rowNumber) {
  const manual = Array.isArray(manualValues)
    ? manualValues.slice(0, FUNNEL_MANUAL_HEADERS.length)
    : [];
  while (manual.length < FUNNEL_MANUAL_HEADERS.length) manual.push("");
  manual[6] = `=IF(AND($B${rowNumber}<>"";$O${rowNumber}<>"");ROUND(($O${rowNumber}-$B${rowNumber})*1440;0);"")`;
  return [
    String(canonicalRow[0] || ""),
    canonicalRow[4] || "",
    normalizarPlataformaFunil_(canonicalRow[6]),
    canonicalRow[7] || "",
    canonicalRow[8] || "",
    canonicalRow[9] || "",
    canonicalRow[10] || "",
    canonicalRow[3] || "Novo",
    canonicalRow[5] || "",
  ].concat(manual);
}

function formulasPainelEconomicoCanonico_() {
  const stages = {
    qualified: ["Qualificado", "Consulta agendada", "Consulta realizada", "Paciente convertido"],
    scheduled: ["Consulta agendada", "Consulta realizada", "Paciente convertido"],
    realized: ["Consulta realizada", "Paciente convertido"],
    converted: ["Paciente convertido"],
  };
  function stageCount(platformCell, acceptedStages) {
    return acceptedStages.map(function formulaForStage(stage) {
      return platformCell
        ? `COUNTIFS('Funil Comercial'!$C$2:$C$500;${platformCell};'Funil Comercial'!$H$2:$H$500;"${stage}")`
        : `COUNTIF('Funil Comercial'!$H$2:$H$500;"${stage}")`;
    }).join("+");
  }
  return Object.freeze({
    total: "=COUNTUNIQUE(FILTER('Funil Comercial'!$A$2:$A$500;'Funil Comercial'!$A$2:$A$500<>\"\"))",
    qualified: "=" + stageCount("", stages.qualified),
    scheduled: "=" + stageCount("", stages.scheduled),
    realized: "=" + stageCount("", stages.realized),
    converted: "=" + stageCount("", stages.converted),
    responseCoverage: "=IFERROR('_BOT_METRICAS'!$E$2;0)",
    responseMedian: "=IFERROR('_BOT_METRICAS'!$H$2;0)",
    responseP95: "=IFERROR('_BOT_METRICAS'!$I$2;0)",
    handoffs: "=IFERROR('_BOT_METRICAS'!$J$2;0)",
    platformQualified: function platformQualified(platformCell) {
      return "=" + stageCount(platformCell, stages.qualified);
    },
    platformScheduled: function platformScheduled(platformCell) {
      return "=" + stageCount(platformCell, stages.scheduled);
    },
    platformRealized: function platformRealized(platformCell) {
      return "=" + stageCount(platformCell, stages.realized);
    },
    platformConverted: function platformConverted(platformCell) {
      return "=" + stageCount(platformCell, stages.converted);
    },
  });
}

function valoresManuaisFunilPorOportunidade_(spreadsheet, funnelSheet) {
  const result = { byOpportunityId: {}, orphanRows: [] };
  if (!funnelSheet || funnelSheet.getLastRow() < 2) return result;
  const rowCount = Math.min(
    funnelSheet.getLastRow() - 1,
    FUNNEL_DASHBOARD_CONFIG.maximumRows,
  );
  const values = funnelSheet.getRange(2, 1, rowCount, 20).getValues();
  const formulas = funnelSheet.getRange(2, 10, rowCount, 11).getFormulas();
  const leadSheet = spreadsheet.getSheetByName(
    FUNNEL_DASHBOARD_CONFIG.visibleLeadSheetName,
  );
  let leadOpportunityIds = [];
  if (leadSheet && leadSheet.getLastRow() >= 2) {
    const headers = mapaCabecalhosOportunidade_(leadSheet);
    const opportunityColumn = headers["Opportunity ID"] || 0;
    if (opportunityColumn) {
      leadOpportunityIds = leadSheet
        .getRange(2, opportunityColumn, rowCount, 1)
        .getDisplayValues();
    }
  }

  values.forEach(function preserveManualFields(row, index) {
    const manual = row.slice(9, 20);
    manual[6] = "";
    const hasManualValue = manual.some(function populated(value, column) {
      return column !== 6 && String(value || "").trim() !== "";
    });
    if (!hasManualValue) return;
    const directId = /^opp_/.test(String(row[0] || ""))
      ? String(row[0])
      : "";
    const legacyId = leadOpportunityIds[index]
      ? String(leadOpportunityIds[index][0] || "")
      : "";
    const opportunityId = directId || legacyId;
    if (!/^opp_/.test(opportunityId)) {
      result.orphanRows.push({
        sourceRow: index + 2,
        legacyKey: String(row[0] || ""),
        manualValues: manual,
      });
      return;
    }
    result.byOpportunityId[opportunityId] = manual.map(function valueOrBlank(
      value,
      column,
    ) {
      return formulas[index] && formulas[index][column] ? "" : value;
    });
  });
  return result;
}

function arquivarManuaisOrfaosFunil_(spreadsheet, orphanRows) {
  if (!orphanRows.length) return 0;
  let archive = spreadsheet.getSheetByName(
    FUNNEL_DASHBOARD_CONFIG.legacyOrphanSheetName,
  );
  if (!archive) {
    archive = spreadsheet.insertSheet(
      FUNNEL_DASHBOARD_CONFIG.legacyOrphanSheetName,
    );
    archive.appendRow([
      "Arquivado em",
      "Linha de origem",
      "Chave legada",
    ].concat(FUNNEL_MANUAL_HEADERS, ["Motivo"]));
    archive.setFrozenRows(1);
    archive.hideSheet();
  }
  const existingRows = archive.getLastRow() > 1
    ? archive.getRange(2, 2, archive.getLastRow() - 1, 1).getDisplayValues()
    : [];
  const existing = {};
  existingRows.forEach(function indexExisting(row) {
    existing[String(row[0] || "")] = true;
  });
  const pending = orphanRows.filter(function newOrphan(orphan) {
    return !existing[String(orphan.sourceRow)];
  }).map(function archiveRow(orphan) {
    return [new Date(), orphan.sourceRow, orphan.legacyKey]
      .concat(orphan.manualValues, ["Opportunity ID ausente na fonte legada"]);
  });
  if (pending.length) {
    archive
      .getRange(archive.getLastRow() + 1, 1, pending.length, pending[0].length)
      .setValues(pending);
  }
  return pending.length;
}

function atualizarPainelEconomicoCanonico_(economicSheet) {
  const formulas = formulasPainelEconomicoCanonico_();
  economicSheet.getRange("A2").setValue(
    "Fonte: uma oportunidade ativa por Opportunity ID no Funil Comercial. Entradas amarelas continuam manuais.",
  );
  economicSheet.getRange("E5:E9").setFormulas([
    [formulas.total],
    [formulas.qualified],
    [formulas.scheduled],
    [formulas.realized],
    [formulas.converted],
  ]);
  economicSheet.getRange("J5:J9").setValues([
    ["Cobertura da 1ª resposta"],
    ["Mediana da 1ª resposta (min úteis)"],
    ["P95 da 1ª resposta (min úteis)"],
    ["Handoffs tipados"],
    ["Follow-ups realizados"],
  ]);
  economicSheet.getRange("K5:K9").setFormulas([
    [formulas.responseCoverage],
    [formulas.responseMedian],
    [formulas.responseP95],
    [formulas.handoffs],
    ["=COUNTIF('Funil Comercial'!$Q$2:$Q$500;\"Sim\")"],
  ]);
  economicSheet.getRange("K5").setNumberFormat("0.0%");
  economicSheet.getRange("K6:K9").setNumberFormat("0.0");

  const platforms = [
    "Google",
    "Meta",
    "Orgânico/Conteúdo",
    "WhatsApp direto",
    "Não identificada",
  ];
  if (economicSheet.getMaxRows() < 25) {
    economicSheet.insertRowsAfter(
      economicSheet.getMaxRows(),
      25 - economicSheet.getMaxRows(),
    );
  }
  economicSheet.getRange("A22:G22").copyFormatToRange(
    economicSheet,
    1,
    7,
    23,
    24,
  );
  economicSheet.getRange("A23:G23").copyFormatToRange(
    economicSheet,
    1,
    7,
    25,
    25,
  );
  const platformRows = platforms.map(function buildPlatformRow(platform, index) {
    const row = index + 19;
    return [
      platform,
      `=COUNTIF('Funil Comercial'!$C$2:$C$500;$A${row})`,
      formulas.platformQualified(`$A${row}`),
      formulas.platformScheduled(`$A${row}`),
      formulas.platformRealized(`$A${row}`),
      formulas.platformConverted(`$A${row}`),
      `=IFERROR(C${row}/B${row};0)`,
    ];
  });
  platformRows.push([
    "Outros",
    "=$E$5-SUM(B19:B23)",
    "=$E$6-SUM(C19:C23)",
    "=$E$7-SUM(D19:D23)",
    "=$E$8-SUM(E19:E23)",
    "=$E$9-SUM(F19:F23)",
    "=IFERROR(C24/B24;0)",
  ]);
  platformRows.push([
    "TOTAL",
    "=SUM(B19:B24)",
    "=SUM(C19:C24)",
    "=SUM(D19:D24)",
    "=SUM(E19:E24)",
    "=SUM(F19:F24)",
    "=IFERROR(C25/B25;0)",
  ]);
  economicSheet.getRange(19, 1, platformRows.length, 7).setValues(platformRows);
}

function planejarMigracaoPaineisFunilCanonico_(spreadsheet) {
  const canonical = construirFonteFunilCanonico_(spreadsheet);
  const funnelSheet = spreadsheet.getSheetByName(
    FUNNEL_DASHBOARD_CONFIG.funnelSheetName,
  );
  const economicSheet = spreadsheet.getSheetByName(
    FUNNEL_DASHBOARD_CONFIG.economicSheetName,
  );
  if (!funnelSheet || !economicSheet) {
    return {
      ok: false,
      error: "funnel_dashboard_sheet_missing",
      reviewRequired: 0,
    };
  }
  const manual = valoresManuaisFunilPorOportunidade_(spreadsheet, funnelSheet);
  const rows = canonical.rows.filter(function onlyAmanda(row) {
    return String(row[1] || "") === FUNNEL_DASHBOARD_CONFIG.professional;
  });
  return {
    ok: canonical.ok && canonical.reviewRequired === 0,
    canonicalRows: canonical.rows.length,
    funnelRows: rows.length,
    reviewRequired: canonical.reviewRequired,
    orphanManualRows: manual.orphanRows.length,
    issues: canonical.issues,
    rows,
    manual,
    funnelSheet,
    economicSheet,
  };
}

function construirLinhaFunilCanonicoPorOportunidade_(spreadsheet, opportunityId) {
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const found = opportunitySheet
    ? localizarOportunidadePorId_(opportunitySheet, opportunityId)
    : null;
  if (!found) return { ok: false, reason: "opportunity_not_found" };
  if (/^(?:closed|voided|encerrada)$/i.test(String(found.values[6] || ""))) {
    return { ok: true, active: false, professional: "" };
  }
  const professional = normalizarProfissionalOportunidade_(found.values[3]);
  if (professional !== "amanda" && professional !== "daniel") {
    return { ok: true, active: false, professional };
  }
  const leadSheet = spreadsheet.getSheetByName(String(found.values[4] || ""));
  const leadRow = Number(found.values[5] || 0);
  if (!leadSheet || leadRow < 2 || leadRow > leadSheet.getLastRow()) {
    return { ok: false, reason: "visible_pointer_invalid" };
  }
  const columns = mapaCabecalhosOportunidade_(leadSheet);
  const row = leadSheet
    .getRange(leadRow, 1, 1, leadSheet.getLastColumn())
    .getValues()[0];
  function value(header, fallback) {
    const column = columns[header] || fallback || 0;
    return column ? row[column - 1] || "" : "";
  }
  return {
    ok: true,
    active: true,
    professional,
    row: [
      String(found.values[0] || ""),
      professional,
      String(found.values[6] || ""),
      String(found.values[7] || value("Situação do lead", 5)),
      value("Data do contato", 1),
      value("Data da situação", 6),
      value("Plataforma de aquisição", 20),
      value("Campanha", 21),
      value("Criativo", 22),
      value("CTA", 23),
      value("Destino", 24),
      value("Referência completa", 25),
      value("Origem do evento", 19),
      String(found.values[24] || ""),
    ],
  };
}

function localizarLinhaPorOpportunityIdFunil_(sheet, opportunityId) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const found = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(opportunityId || ""))
    .matchEntireCell(true)
    .findNext();
  return found ? found.getRow() : 0;
}

function primeiraLinhaVaziaFunil_(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) return 2;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (!String(ids[index][0] || "").trim()) return index + 2;
  }
  return lastRow + 1;
}

function atualizarLinhaFunilCanonicoPorOportunidade_(spreadsheet, opportunityId) {
  const funnelSheet = spreadsheet.getSheetByName(
    FUNNEL_DASHBOARD_CONFIG.funnelSheetName,
  );
  if (
    !funnelSheet ||
    funnelSheet.getRange("A1").getDisplayValue() !== "Opportunity ID"
  ) {
    return { ok: true, skipped: true, reason: "dashboard_not_migrated" };
  }
  const canonicalSheet = spreadsheet.getSheetByName(
    FUNNEL_DASHBOARD_CONFIG.canonicalSheetName,
  );
  if (!canonicalSheet) {
    return { ok: false, skipped: true, reason: "canonical_sheet_missing" };
  }
  const current = construirLinhaFunilCanonicoPorOportunidade_(
    spreadsheet,
    opportunityId,
  );
  if (!current.ok) return current;

  const canonicalRow = localizarLinhaPorOpportunityIdFunil_(
    canonicalSheet,
    opportunityId,
  );
  const funnelRow = localizarLinhaPorOpportunityIdFunil_(
    funnelSheet,
    opportunityId,
  );
  if (!current.active) {
    if (canonicalRow) canonicalSheet.getRange(canonicalRow, 1, 1, 14).clearContent();
    if (funnelRow) {
      funnelSheet.getRange(funnelRow, 1, 1, 9).clearContent();
      funnelSheet.getRange(funnelRow, 16).clearContent();
    }
    return { ok: true, active: false, removed: Boolean(canonicalRow || funnelRow) };
  }

  const targetCanonicalRow = canonicalRow || primeiraLinhaVaziaFunil_(canonicalSheet);
  canonicalSheet.getRange(targetCanonicalRow, 1, 1, 14).setValues([current.row]);
  if (current.professional !== FUNNEL_DASHBOARD_CONFIG.professional) {
    return { ok: true, active: true, professional: current.professional };
  }
  const targetFunnelRow = funnelRow || primeiraLinhaVaziaFunil_(funnelSheet);
  const manual = funnelRow
    ? funnelSheet.getRange(funnelRow, 10, 1, 11).getValues()[0]
    : [];
  const commercialRow = linhaFunilComercialCanonica_(
    current.row,
    manual,
    targetFunnelRow,
  );
  funnelSheet.getRange(targetFunnelRow, 1, 1, 20).setValues([commercialRow]);
  return {
    ok: true,
    active: true,
    professional: current.professional,
    canonicalRow: targetCanonicalRow,
    funnelRow: targetFunnelRow,
  };
}

function migrarPaineisFunilCanonico(input) {
  const apply = Boolean(input && input.apply === true);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const plan = planejarMigracaoPaineisFunilCanonico_(spreadsheet);
  const summary = {
    ok: plan.ok,
    applied: apply,
    canonicalRows: Number(plan.canonicalRows || 0),
    funnelRows: Number(plan.funnelRows || 0),
    reviewRequired: Number(plan.reviewRequired || 0),
    orphanManualRows: Number(plan.orphanManualRows || 0),
    error: String(plan.error || ""),
  };
  if (!apply || !plan.ok) return summary;

  arquivarManuaisOrfaosFunil_(spreadsheet, plan.manual.orphanRows);
  const rows = plan.rows.map(function buildRow(row, index) {
    return linhaFunilComercialCanonica_(
      row,
      plan.manual.byOpportunityId[String(row[0] || "")] || [],
      index + 2,
    );
  });
  plan.funnelSheet.getRange(1, 1, 1, 20).setValues([
    [...FUNNEL_COMMERCIAL_HEADERS],
  ]);
  plan.funnelSheet
    .getRange(2, 1, FUNNEL_DASHBOARD_CONFIG.maximumRows, 20)
    .clearContent();
  if (rows.length) {
    plan.funnelSheet.getRange(2, 1, rows.length, 20).setValues(rows);
  }
  atualizarPainelEconomicoCanonico_(plan.economicSheet);
  SpreadsheetApp.flush();

  const ids = plan.funnelSheet
    .getRange(2, 1, Math.max(rows.length, 1), 1)
    .getDisplayValues()
    .map(function idValue(row) { return String(row[0] || ""); })
    .filter(Boolean);
  const uniqueIds = {};
  ids.forEach(function indexId(id) { uniqueIds[id] = true; });
  const panelTotal = Number(plan.economicSheet.getRange("E5").getValue() || 0);
  return Object.assign(summary, {
    ok:
      ids.length === rows.length &&
      Object.keys(uniqueIds).length === rows.length &&
      panelTotal === rows.length,
    archivedOrphans: plan.orphanManualRows,
    populatedRows: ids.length,
    uniqueRows: Object.keys(uniqueIds).length,
    panelTotal,
  });
}

function simularMigracaoPaineisFunilCanonico() {
  const result = migrarPaineisFunilCanonico({ apply: false });
  console.log("FUNNEL_DASHBOARD_DRY_RUN " + JSON.stringify(result));
  return result;
}

function aplicarMigracaoPaineisFunilCanonicoAutorizada() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, applied: false, error: "funnel_dashboard_lock_timeout" };
  }
  try {
    const result = migrarPaineisFunilCanonico({ apply: true });
    console.log("FUNNEL_DASHBOARD_APPLY " + JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}
