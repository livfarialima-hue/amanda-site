const QUALITY_DASHBOARD_CONFIG = Object.freeze({
  healthSheetName: "Saúde das Integrações",
  botPanelSheetName: "Painel do Bot",
  canonicalFunnelSheetName: "_FUNIL_CANONICO",
  healthRuleCell: "A14",
  healthReviewDateCell: "B15",
  reviewDate: "14/08/2026",
});

function formulasPaineisQualidade_() {
  return Object.freeze({
    markedVersusExported:
      "=IFERROR(ABS(COUNTUNIQUE(FILTER('Google Ads - Conversões'!$O$2:$O;'Google Ads - Conversões'!$G$2:$G=\"Sim\";'Google Ads - Conversões'!$O$2:$O<>\"\"))-COUNTUNIQUE(FILTER(IMPORT_GOOGLE_ADS!$A$2:$A;IMPORT_GOOGLE_ADS!$A$2:$A<>\"\")));999)",
    conflictingClickIds:
      "=SUMPRODUCT(N((LEN('Google Ads - Conversões'!$K$2:$K)>0)+(LEN('Google Ads - Conversões'!$L$2:$L)>0)+(LEN('Google Ads - Conversões'!$M$2:$M)>0)>1))",
    repeatedPhones:
      "=IFERROR(COUNTA(FILTER('Google Ads - Conversões'!$C$2:$C;'Google Ads - Conversões'!$C$2:$C<>\"\"))-COUNTUNIQUE(FILTER('Google Ads - Conversões'!$C$2:$C;'Google Ads - Conversões'!$C$2:$C<>\"\"));0)",
    canonicalFunnelDifference:
      "=IFERROR(ABS(COUNTUNIQUE(FILTER('_CRM_OPORTUNIDADES'!$A$2:$A;'_CRM_OPORTUNIDADES'!$A$2:$A<>\"\";REGEXMATCH(LOWER('_CRM_OPORTUNIDADES'!$D$2:$D);\"amanda|daniel\");'_CRM_OPORTUNIDADES'!$G$2:$G<>\"closed\";'_CRM_OPORTUNIDADES'!$G$2:$G<>\"voided\";'_CRM_OPORTUNIDADES'!$G$2:$G<>\"encerrada\"))-COUNTUNIQUE(FILTER('_FUNIL_CANONICO'!$A$2:$A;'_FUNIL_CANONICO'!$A$2:$A<>\"\")));999)",
    latestCapturedContact:
      "=IFERROR(MAX('Google Ads - Conversões'!$A$2:$A);\"\")",
    latestPreparedConversion:
      "=IFERROR(INDEX(SORT(FILTER('Google Ads - Conversões'!$N$2:$N;'Google Ads - Conversões'!$G$2:$G=\"Sim\");1;FALSE);1);\"\")",
    technicalClassificationFailures:
      "=COUNTIFS('_WHATSAPP_CLASSIFICACAO_EXCECOES'!$H$2:$H;\">=\"&TODAY()-$B$3;'_WHATSAPP_CLASSIFICACAO_EXCECOES'!$E$2:$E;\"technical_failure\")",
  });
}

function aplicarCorrecoesPaineisQualidadeAutorizadas() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, applied: false, error: "quality_dashboard_lock_timeout" };
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const health = spreadsheet.getSheetByName(
      QUALITY_DASHBOARD_CONFIG.healthSheetName,
    );
    const botPanel = spreadsheet.getSheetByName(
      QUALITY_DASHBOARD_CONFIG.botPanelSheetName,
    );
    if (!health || !botPanel) {
      return {
        ok: false,
        applied: false,
        error: "quality_dashboard_sheet_missing",
      };
    }

    const preflight = construirFonteFunilCanonico_(spreadsheet);
    if (!preflight.ok || preflight.reviewRequired > 0) {
      return {
        ok: false,
        applied: false,
        error: "canonical_funnel_preflight_failed",
        canonicalRows: preflight.rows.length,
        reviewRequired: preflight.reviewRequired,
        issues: preflight.issues,
      };
    }

    const canonical = reconstruirFonteFunilCanonico({ apply: true });
    if (!canonical.ok || canonical.reviewRequired > 0) {
      return Object.assign(
        {},
        canonical,
        { applied: false, error: "canonical_funnel_apply_failed" },
      );
    }

    const formulas = formulasPaineisQualidade_();
    health.getRange("C5").setFormula(formulas.markedVersusExported);
    health.getRange("C6").setFormula(formulas.conflictingClickIds);
    health.getRange("C7").setFormula(formulas.repeatedPhones);
    health.getRange("A8").setValue("Diferença: oportunidades ativas x funil canônico");
    health.getRange("C8").setFormula(formulas.canonicalFunnelDifference);
    health
      .getRange("D8")
      .setValue("Se for diferente de zero, reconstruir o funil canônico e revisar os vínculos.");
    health.getRange("E8").setValue("Automático / Codex");
    health.getRange("C10").setFormula(formulas.latestCapturedContact);
    health.getRange("C11").setFormula(formulas.latestPreparedConversion);
    health
      .getRange(QUALITY_DASHBOARD_CONFIG.healthRuleCell)
      .setValue(
        "Edite apenas células amarelas. Células brancas, cinzas ou protegidas são automáticas. IMPORT_GOOGLE_ADS deve permanecer na primeira posição; IMPORT_GCLID é somente legado e não alimenta o Google Ads.",
      );
    health.getRange("A13").setValue("REGRA DE EDIÇÃO");
    health
      .getRange(QUALITY_DASHBOARD_CONFIG.healthReviewDateCell)
      .setValue(QUALITY_DASHBOARD_CONFIG.reviewDate);

    botPanel
      .getRange("D8")
      .setValue("Falhas técnicas de classificação")
      .setNote(
        "Conta somente technical_failure na fonte _WHATSAPP_CLASSIFICACAO_EXCECOES. Exclusões de negócio, espera esperada e revisão humana não são falha técnica.",
      );
    botPanel
      .getRange("E8")
      .setFormula(formulas.technicalClassificationFailures);

    SpreadsheetApp.flush();
    const healthStates = health.getRange("B5:C11").getDisplayValues();
    const formulaErrors = healthStates.reduce(function countErrors(total, row) {
      return total + row.filter(function isFormulaError(value) {
        return /^#/.test(String(value || ""));
      }).length;
    }, 0);
    const technicalFailures = Number(botPanel.getRange("E8").getValue() || 0);
    const report = {
      ok: formulaErrors === 0,
      applied: true,
      canonicalRows: canonical.canonicalRows,
      reviewRequired: canonical.reviewRequired,
      formulaErrors,
      technicalFailures,
      healthStates,
    };
    console.log("QUALITY_DASHBOARDS_APPLY " + JSON.stringify(report));
    return report;
  } finally {
    lock.releaseLock();
  }
}
