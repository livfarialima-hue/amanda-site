const LEAD_MESSAGE_HEADERS = Object.freeze([
  "Telefone",
  "Direção",
  "Data e hora",
  "Message ID",
  "Event ID",
  "Texto",
  "Linha do lead",
  "Opportunity ID",
  "Profissional",
  "Aba do lead",
  "Origem",
  "Template ID",
  "Tipo de mensagem",
  "Message ID relacionado",
]);

const LEAD_CLASSIFICATION_HEADERS = Object.freeze([
  "Telefone",
  "Linha do lead",
  "Última atividade",
  "Classificar após",
  "Estado",
  "Lease até",
  "Última classificação",
  "Até Message ID",
  "Último Message ID",
  "Quantidade de mensagens",
  "Último status automático",
  "Último resumo automático",
  "Última próxima ação automática",
  "Último erro",
  "Tentativas",
  "Lease token",
  "Opportunity ID",
  "Profissional",
  "Aba do lead",
  "Versão reivindicada",
]);

const CLASSIFICATION_EXCEPTION_HEADERS = Object.freeze([
  "Incident ID",
  "Linha da fila",
  "Opportunity ID",
  "Estado",
  "Categoria",
  "Erro",
  "Tentativas",
  "Detectado em",
  "Última atividade",
  "Ação",
  "Resolvido em",
]);

const CLASSIFICATION_EXCEPTION_SHEET = "_WHATSAPP_CLASSIFICACAO_EXCECOES";

const CLASSIFICATION_STALE_ATTEMPT_REPAIR = Object.freeze({
  cutoff: "2026-08-30T23:59:59-03:00",
  confirmation: "REQUEUE_STALE_ATTEMPTS_AFTER_NEW_ACTIVITY_V1",
  legacyError: "max_attempts_exceeded:unknown",
});

const LEAD_STAGE_EVENT_HEADERS = Object.freeze([
  "Data e hora",
  "Event ID",
  "Opportunity ID",
  "Telefone hash",
  "Origem",
  "Fase anterior",
  "Fase proposta",
  "Fase aplicada",
  "Confiança",
  "Até Message ID",
  "Decisão",
  "Evidência administrativa",
  "Profissional",
]);

const GOOGLE_ADS_EVENT_HEADERS = Object.freeze([
  "Event ID",
  "Opportunity ID",
  "Marco",
  "Tipo de identificador",
  "Identificador do clique",
  "Nome da conversão",
  "Data e hora da conversão",
  "Valor",
  "Moeda",
  "ID da transação",
  "Estado",
  "Último erro",
  "Criado em",
  "Atualizado em",
  "Profissional",
]);

const GOOGLE_ADS_IMPORT_HEADERS = Object.freeze([
  "ID da transação",
  "GCLID",
  "GBRAID",
  "WBRAID",
  "Nome da conversão",
  "Data e hora da conversão",
  "Valor (R$)",
  "Moeda",
]);

const GOOGLE_ADS_ADJUSTMENT_HEADERS = Object.freeze([
  "Order ID",
  "Conversion Name",
  "Adjustment Time",
  "Adjustment Type",
  "Adjusted Value",
  "Adjusted Value Currency",
]);

const GOOGLE_ADS_ADJUSTMENT_RECEIPT_HEADERS = Object.freeze([
  ...GOOGLE_ADS_ADJUSTMENT_HEADERS,
  "Receipt Status",
  "Receipt Detail",
  "Confirmed At",
  "Confirmed By",
]);

const GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT = Object.freeze({
  status: "confirmed_not_found",
  detail: "Essa conversão não existe",
  confirmedBy: "google_ads_upload_history_2026-08-22",
  cutoff: "2026-08-22 23:59:59-0300",
  confirmation: "ARCHIVE_CONFIRMED_NOT_FOUND_GOOGLE_ADS_ADJUSTMENTS_V1",
});

const GOOGLE_ADS_TRANSACTION_ID_PATTERN =
  /^LIV-QL-v1-[A-Za-z0-9_-]{43}$/;
const GOOGLE_ADS_QUARANTINE_STATE = "quarantined_legacy";
const GOOGLE_ADS_QUARANTINE_REASON =
  "legacy_source_imported; attribution_result_nd";

function validarLinhaImportacaoGoogleAds_(row) {
  const values = Array.isArray(row) ? row : [];
  const transactionId = String(values[0] || "").trim();
  const identifiers = [
    { type: "GCLID", value: String(values[1] || "").trim() },
    { type: "GBRAID", value: String(values[2] || "").trim() },
    { type: "WBRAID", value: String(values[3] || "").trim() },
  ].filter(function present(identifier) {
    return Boolean(identifier.value);
  });
  const errors = [];
  if (!transactionId) errors.push("missing_transaction_id");
  if (
    transactionId &&
    !GOOGLE_ADS_TRANSACTION_ID_PATTERN.test(transactionId)
  ) {
    errors.push("unsafe_transaction_id");
  }
  if (identifiers.length !== 1) errors.push("click_id_cardinality");
  if (
    String(values[4] || "").trim() !== CONFIG.qualifiedConversionName
  ) {
    errors.push("invalid_conversion_name");
  }
  if (!String(values[5] || "").trim()) errors.push("missing_timestamp");
  if (!String(values[7] || "").trim()) errors.push("missing_currency");
  return {
    ok: errors.length === 0,
    errors,
    transactionId,
    identifierType: identifiers.length === 1 ? identifiers[0].type : "",
    clickId: identifiers.length === 1 ? identifiers[0].value : "",
    conversionName: String(values[4] || "").trim(),
    conversionTimestamp: String(values[5] || "").trim(),
    value: values[6],
    currency: String(values[7] || "").trim(),
  };
}

function linhaExigeNomeConversaoQualificadoGoogleAds_(row, columns) {
  const values = Array.isArray(row) ? row : [];
  const headerMap = columns || {};
  const sendColumn = Number(headerMap["Enviar ao Google Ads?"] || 0);
  if (!sendColumn) return false;

  const sendValue = String(values[sendColumn - 1] || "")
    .trim()
    .toLowerCase();
  if (sendValue !== "sim") return false;

  const clickIdCount = ["GCLID", "GBRAID", "WBRAID"].filter(
    function hasClickId(header) {
      const column = Number(headerMap[header] || 0);
      return column && Boolean(String(values[column - 1] || "").trim());
    },
  ).length;

  return clickIdCount === 1;
}

function normalizarNomeConversaoGoogleAdsAoEditar_(e) {
  if (!e || !e.range) {
    return { ok: false, error: "missing_edit_event" };
  }

  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.sheetName || e.range.getLastRow() < 2) {
    return { ok: true, ignored: true, corrected: 0 };
  }

  const columns = mapaCabecalhosOportunidade_(sheet);
  const requiredHeaders = [
    "Enviar ao Google Ads?",
    "Nome da conversão",
    "GCLID",
    "GBRAID",
    "WBRAID",
  ];
  if (requiredHeaders.some(function missing(header) { return !columns[header]; })) {
    return { ok: false, error: "missing_google_ads_visible_header" };
  }

  const editedFirstColumn = e.range.getColumn();
  const editedLastColumn = e.range.getLastColumn();
  const touchesRelevantColumn = requiredHeaders.some(function touched(header) {
    const column = columns[header];
    return column >= editedFirstColumn && column <= editedLastColumn;
  });
  if (!touchesRelevantColumn) {
    return { ok: true, ignored: true, corrected: 0 };
  }

  let corrected = 0;
  const firstRow = Math.max(2, e.range.getRow());
  for (let row = firstRow; row <= e.range.getLastRow(); row += 1) {
    const values = sheet
      .getRange(row, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0];
    const conversionColumn = columns["Nome da conversão"];
    if (
      linhaExigeNomeConversaoQualificadoGoogleAds_(values, columns) &&
      String(values[conversionColumn - 1] || "").trim() !==
        CONFIG.qualifiedConversionName
    ) {
      sheet
        .getRange(row, conversionColumn)
        .setValue(CONFIG.qualifiedConversionName);
      corrected += 1;
    }
  }

  return { ok: true, ignored: false, corrected };
}

function prepararFonteGoogleAdsPrimeiraAba() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const target = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.googleAdsImportSheetName,
    GOOGLE_ADS_IMPORT_HEADERS,
  );
  const legacy = spreadsheet.getSheetByName("IMPORT_GCLID");
  let migrated = 0;
  let quarantinedLegacyRows = 0;

  if (legacy && legacy.getLastRow() >= 2) {
    const legacyRows = legacy
      .getRange(2, 1, legacy.getLastRow() - 1, 6)
      .getDisplayValues();
    const existingTransactions = {};
    if (target.getLastRow() >= 2) {
      target
        .getRange(2, 1, target.getLastRow() - 1, 1)
        .getDisplayValues()
        .forEach(function indexTransaction(row) {
          if (row[0]) existingTransactions[String(row[0])] = true;
        });
    }
    legacyRows.forEach(function migrateLegacyConversion(row) {
      const transactionId = String(row[5] || "").trim();
      const gclid = String(row[0] || "").trim();
      if (!transactionId || !gclid || existingTransactions[transactionId]) {
        return;
      }
      if (!GOOGLE_ADS_TRANSACTION_ID_PATTERN.test(transactionId)) {
        quarantinedLegacyRows += 1;
        return;
      }
      target.appendRow([
        transactionId,
        gclid,
        "",
        "",
        String(row[1] || ""),
        String(row[2] || ""),
        row[3],
        String(row[4] || "BRL"),
      ]);
      existingTransactions[transactionId] = true;
      migrated += 1;
    });
  }

  target.showSheet();
  target.setFrozenRows(1);
  target
    .getRange(1, 1, 1, GOOGLE_ADS_IMPORT_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#0b5e55")
    .setFontColor("#ffffff");
  target.autoResizeColumns(1, GOOGLE_ADS_IMPORT_HEADERS.length);
  target.setColumnWidth(1, 210);
  target.setColumnWidth(5, 190);
  target.setColumnWidth(6, 190);
  target.getRange("A1").setNote(
    "Fonte canônica para importação de conversões offline no Google Ads. " +
      "Não editar manualmente; novas linhas são adicionadas pela automação.",
  );
  spreadsheet.setActiveSheet(target);
  spreadsheet.moveActiveSheet(1);
  SpreadsheetApp.flush();

  return {
    ok: true,
    firstSheet: target.getName(),
    migratedLegacyRows: migrated,
    quarantinedLegacyRows,
    totalConversions: Math.max(target.getLastRow() - 1, 0),
  };
}

function stableLeadHash_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ""),
    Utilities.Charset.UTF_8,
  );
  return bytes
    .map(function toHex(byte) {
      return (byte + 256).toString(16).slice(-2);
    })
    .join("")
    .slice(0, 20);
}

function segredoIdentidadeLead_(allowMissing) {
  const secret = String(
    PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.leadIdentitySecretProperty) || "",
  );
  if (secret.length < 43 && !allowMissing) {
    throw new Error("missing_lead_identity_hmac_secret");
  }
  return secret.length >= 43 ? secret : "";
}

function versaoChaveIdentidadeLead_() {
  const version = String(
    PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.leadIdentityKeyVersionProperty) || "k1",
  ).trim();
  return /^k\d{1,4}$/.test(version) ? version : "k1";
}

function pseudonimoIdentidadeLead_(value) {
  const secret = segredoIdentidadeLead_(true);
  const normalized = String(value || "").trim();
  if (!secret || !normalized) return "";
  const signature = Utilities.computeHmacSha256Signature(
    "lead_identity_v1|" + normalized,
    secret,
    Utilities.Charset.UTF_8,
  );
  return [
    "pid",
    versaoChaveIdentidadeLead_(),
    googleAdsBase64UrlSemPadding_(signature),
  ].join("_");
}

function provisionarSegredoIdentidadeLead() {
  const properties = PropertiesService.getScriptProperties();
  const existing = segredoIdentidadeLead_(true);
  if (existing) {
    return {
      ok: true,
      created: false,
      keyVersion: versaoChaveIdentidadeLead_(),
      fingerprint: stableLeadHash_(existing),
    };
  }
  const seed = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(new Date().getTime()),
  ].join("|");
  const secret = googleAdsBase64UrlSemPadding_(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      seed,
      Utilities.Charset.UTF_8,
    ),
  );
  if (secret.length !== 43) {
    throw new Error("invalid_lead_identity_hmac_secret");
  }
  properties.setProperty(CONFIG.leadIdentitySecretProperty, secret);
  properties.setProperty(CONFIG.leadIdentityKeyVersionProperty, "k1");
  return {
    ok: true,
    created: true,
    keyVersion: "k1",
    fingerprint: stableLeadHash_(secret),
  };
}

function googleAdsTransactionIdSeguro_(value) {
  return GOOGLE_ADS_TRANSACTION_ID_PATTERN.test(String(value || "").trim());
}

function googleAdsTransactionSecret_() {
  const secret = String(
    PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.googleAdsTransactionSecretProperty) || "",
  );
  if (secret.length < 43) {
    throw new Error("missing_google_ads_transaction_hmac_secret");
  }
  return secret;
}

function googleAdsBase64UrlSemPadding_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, "");
}

function provisionarSegredoTransacaoGoogleAds() {
  const properties = PropertiesService.getScriptProperties();
  const existing = String(
    properties.getProperty(CONFIG.googleAdsTransactionSecretProperty) || "",
  );
  if (existing.length >= 43) {
    return {
      ok: true,
      created: false,
      fingerprint: stableLeadHash_(existing),
    };
  }

  const seed = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(new Date().getTime()),
  ].join("|");
  const secretBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    seed,
    Utilities.Charset.UTF_8,
  );
  const secret = googleAdsBase64UrlSemPadding_(secretBytes);
  if (secret.length !== 43) {
    throw new Error("invalid_google_ads_transaction_hmac_secret");
  }
  properties.setProperty(CONFIG.googleAdsTransactionSecretProperty, secret);
  return {
    ok: true,
    created: true,
    fingerprint: stableLeadHash_(secret),
  };
}

function leadOpportunityId_(leadValues, phone) {
  const contactDate = String(leadValues && leadValues[0] || "");
  const reference = String(leadValues && leadValues[1] || "");
  const pseudonym = pseudonimoIdentidadeLead_([
    normalizePhone_(phone),
    contactDate,
    reference,
  ].join("|"));
  if (!pseudonym) throw new Error("missing_lead_identity_hmac_secret");
  return "opp_legacy_" + pseudonym.replace(/^pid_/, "");
}

function recordLeadStageEvent_(spreadsheet, event) {
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.leadStageEventSheetName,
    LEAD_STAGE_EVENT_HEADERS,
  );
  const now = event.at instanceof Date ? event.at : new Date();
  const eventId = String(event.eventId || Utilities.getUuid());

  sheet.appendRow([
    now,
    eventId,
    String(event.opportunityId || ""),
    pseudonimoIdentidadeLead_(normalizePhone_(event.phone)),
    safeText_(event.source, 80),
    safeText_(event.fromStatus, 80),
    safeText_(event.proposedStatus, 80),
    safeText_(event.appliedStatus, 80),
    safeText_(event.confidence, 20),
    safeText_(event.throughMessageId, 500),
    safeText_(event.decision, 80),
    safeText_(event.evidence, 300),
    safeText_(event.professional, 80),
  ]);
  return eventId;
}

function findGoogleAdsEventRow_(sheet, eventId) {
  if (!sheet || sheet.getLastRow() < 2 || !eventId) return null;
  const match = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(eventId))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function ensureGoogleAdsImportRow_(spreadsheet, details) {
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.googleAdsImportSheetName,
    GOOGLE_ADS_IMPORT_HEADERS,
  );
  sheet.showSheet();
  const transactionId = String(details.transactionId || "");
  const row = [
    transactionId,
    details.identifierType === "GCLID" ? details.clickId : "",
    details.identifierType === "GBRAID" ? details.clickId : "",
    details.identifierType === "WBRAID" ? details.clickId : "",
    details.conversionName,
    details.conversionTimestamp,
    details.value,
    details.currency,
  ];
  const validation = validarLinhaImportacaoGoogleAds_(row);
  if (!validation.ok) {
    throw new Error(
      "invalid_google_ads_import_row:" + validation.errors.join(","),
    );
  }
  if (findGoogleAdsEventRow_(sheet, transactionId)) return false;

  sheet.appendRow(row);
  return true;
}

function ensureGoogleAdsRetractionRow_(spreadsheet, details) {
  const transactionId = String(details.transactionId || "").trim();
  const conversionName = String(details.conversionName || "").trim();
  if (!googleAdsTransactionIdSeguro_(transactionId)) {
    throw new Error("invalid_google_ads_adjustment_transaction_id");
  }
  if (conversionName !== CONFIG.qualifiedConversionName) {
    throw new Error("invalid_google_ads_adjustment_conversion_name");
  }
  if (googleAdsAdjustmentReceiptRecorded_(spreadsheet, transactionId)) {
    return false;
  }
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.googleAdsAdjustmentSheetName,
    GOOGLE_ADS_ADJUSTMENT_HEADERS,
  );
  const row = [
    transactionId,
    conversionName,
    googleAdsAdjustmentTimestamp_(
      details.adjustmentAt instanceof Date ? details.adjustmentAt : new Date(),
    ),
    "RETRACT",
    "",
    "",
  ];
  let added = false;
  if (!findGoogleAdsEventRow_(sheet, transactionId)) {
    sheet.appendRow(row);
    added = true;
  }
  sheet.showSheet();
  const projectionAdded = ensureGoogleAdsRetractionProjectionRow_(row);
  return added || projectionAdded;
}

function googleAdsAdjustmentReceiptRecorded_(spreadsheet, transactionId) {
  const sheet = spreadsheet && spreadsheet.getSheetByName
    ? spreadsheet.getSheetByName(CONFIG.googleAdsAdjustmentReceiptSheetName)
    : null;
  return Boolean(findGoogleAdsEventRow_(sheet, String(transactionId || "").trim()));
}

function googleAdsAdjustmentRowsThroughCutoff_(values, cutoff) {
  const rows = Array.isArray(values) ? values : [];
  const cutoffValue = String(cutoff || "").trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{4}$/.test(cutoffValue)) {
    throw new Error("invalid_google_ads_adjustment_receipt_cutoff");
  }
  return rows.slice(1).reduce(function selectEligible(selected, row, index) {
    const transactionId = String(row[0] || "").trim();
    const conversionName = String(row[1] || "").trim();
    const adjustmentTime = String(row[2] || "").trim();
    const adjustmentType = String(row[3] || "").trim().toUpperCase();
    if (
      googleAdsTransactionIdSeguro_(transactionId) &&
      conversionName === CONFIG.qualifiedConversionName &&
      adjustmentType === "RETRACT" &&
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{4}$/.test(adjustmentTime) &&
      adjustmentTime <= cutoffValue
    ) {
      selected.push({
        rowNumber: index + 2,
        transactionId,
        values: row.slice(0, GOOGLE_ADS_ADJUSTMENT_HEADERS.length),
      });
    }
    return selected;
  }, []);
}

function googleAdsAdjustmentSheetValues_(sheet) {
  if (!sheet) throw new Error("missing_google_ads_adjustment_sheet");
  const lastRow = Math.max(Number(sheet.getLastRow() || 0), 1);
  return sheet
    .getRange(1, 1, lastRow, GOOGLE_ADS_ADJUSTMENT_HEADERS.length)
    .getDisplayValues();
}

function validateGoogleAdsAdjustmentHeaders_(values, label) {
  const headers = Array.isArray(values) && values.length ? values[0] : [];
  const exact = GOOGLE_ADS_ADJUSTMENT_HEADERS.every(function exactHeader(value, index) {
    return String(headers[index] || "").trim() === value;
  });
  if (!exact) {
    throw new Error("invalid_google_ads_adjustment_headers:" + String(label || "unknown"));
  }
}

function googleAdsAdjustmentProjectionSheet_() {
  const spreadsheetId = String(CONFIG.googleAdsAdjustmentSpreadsheetId || "").trim();
  if (!spreadsheetId) throw new Error("missing_google_ads_adjustment_projection_id");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheets = spreadsheet.getSheets();
  const sheet = sheets && sheets[0];
  if (!sheet) throw new Error("missing_google_ads_adjustment_projection_sheet");
  return sheet;
}

function deleteGoogleAdsAdjustmentRows_(sheet, transactionIds) {
  const ids = transactionIds && typeof transactionIds.has === "function"
    ? transactionIds
    : new Set();
  if (!sheet || sheet.getLastRow() < 2 || ids.size === 0) return 0;
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();
  let deleted = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (!ids.has(String(values[index][0] || "").trim())) continue;
    sheet.deleteRow(index + 2);
    deleted += 1;
  }
  return deleted;
}

function reconcileGoogleAdsAdjustmentNotFoundReceipts_(input) {
  input = input && typeof input === "object" ? input : {};
  const apply = input.apply === true;
  if (
    apply &&
    input.confirmation !== GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.confirmation
  ) {
    throw new Error("google_ads_adjustment_receipt_confirmation_required");
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const activeSheet = obterPlanilhaGoogleAdsExistente_(
    spreadsheet,
    CONFIG.googleAdsAdjustmentSheetName,
    GOOGLE_ADS_ADJUSTMENT_HEADERS,
  );
  const projectionSheet = googleAdsAdjustmentProjectionSheet_();
  const activeValues = googleAdsAdjustmentSheetValues_(activeSheet);
  const projectionValues = googleAdsAdjustmentSheetValues_(projectionSheet);
  validateGoogleAdsAdjustmentHeaders_(activeValues, "canonical");
  validateGoogleAdsAdjustmentHeaders_(projectionValues, "projection");

  const candidates = googleAdsAdjustmentRowsThroughCutoff_(
    activeValues,
    GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.cutoff,
  );
  const projectionIds = new Set(
    projectionValues.slice(1).map(function projectionTransaction(row) {
      return String(row[0] || "").trim();
    }).filter(Boolean),
  );
  const missingProjection = candidates
    .map(function candidateId(candidate) { return candidate.transactionId; })
    .filter(function absentFromProjection(transactionId) {
      return !projectionIds.has(transactionId);
    });
  const result = {
    ok: missingProjection.length === 0,
    applied: false,
    cutoff: GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.cutoff,
    candidates: candidates.length,
    missingProjection,
    receiptsAdded: 0,
    canonicalRowsRemoved: 0,
    projectionRowsRemoved: 0,
    containsPii: false,
  };
  if (!result.ok || !apply || candidates.length === 0) return result;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("google_ads_adjustment_receipt_lock_timeout");
  }
  try {
    const receiptSheet = getOrCreateLeadAuxiliarySheet_(
      spreadsheet,
      CONFIG.googleAdsAdjustmentReceiptSheetName,
      GOOGLE_ADS_ADJUSTMENT_RECEIPT_HEADERS,
    );
    const transactionIds = new Set();
    candidates.forEach(function archiveConfirmedNotFound(candidate) {
      transactionIds.add(candidate.transactionId);
      if (googleAdsAdjustmentReceiptRecorded_(spreadsheet, candidate.transactionId)) return;
      receiptSheet.appendRow(candidate.values.concat([
        GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.status,
        GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.detail,
        googleConversionTimestamp_(new Date()),
        GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.confirmedBy,
      ]));
      result.receiptsAdded += 1;
    });
    result.canonicalRowsRemoved = deleteGoogleAdsAdjustmentRows_(
      activeSheet,
      transactionIds,
    );
    result.projectionRowsRemoved = deleteGoogleAdsAdjustmentRows_(
      projectionSheet,
      transactionIds,
    );
    SpreadsheetApp.flush();
    result.applied = true;
    return result;
  } finally {
    lock.releaseLock();
  }
}

function diagnosticarRecibosAjustesGoogleAdsNaoEncontrados() {
  const result = reconcileGoogleAdsAdjustmentNotFoundReceipts_({ apply: false });
  console.log(JSON.stringify(result));
  return result;
}

function aplicarRecibosAjustesGoogleAdsNaoEncontradosConfirmados() {
  const result = reconcileGoogleAdsAdjustmentNotFoundReceipts_({
    apply: true,
    confirmation: GOOGLE_ADS_ADJUSTMENT_NOT_FOUND_RECEIPT.confirmation,
  });
  console.log(JSON.stringify(result));
  return result;
}

function ensureGoogleAdsRetractionProjectionRow_(row) {
  const spreadsheetId = String(
    CONFIG.googleAdsAdjustmentSpreadsheetId || "",
  ).trim();
  if (!spreadsheetId) {
    throw new Error("missing_google_ads_adjustment_projection_id");
  }
  const projectionSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheets = projectionSpreadsheet.getSheets();
  const sheet = sheets && sheets[0];
  if (!sheet) {
    throw new Error("missing_google_ads_adjustment_projection_sheet");
  }
  const headers = sheet
    .getRange(1, 1, 1, GOOGLE_ADS_ADJUSTMENT_HEADERS.length)
    .getDisplayValues()[0];
  const exactHeaders = headers.every(function matchesHeader(value, index) {
    return String(value || "") === GOOGLE_ADS_ADJUSTMENT_HEADERS[index];
  });
  if (!exactHeaders) {
    throw new Error("invalid_google_ads_adjustment_projection_headers");
  }
  if (findGoogleAdsEventRow_(sheet, String(row[0] || ""))) return false;
  sheet.appendRow(row);
  return true;
}

function googleAdsQualificationMilestone_(spreadsheet, opportunityId) {
  const eventSheet = spreadsheet && spreadsheet.getSheetByName
    ? spreadsheet.getSheetByName(CONFIG.googleAdsEventSheetName)
    : null;
  if (!eventSheet || eventSheet.getLastRow() < 2) return "qualified_lead";
  const rows = eventSheet
    .getRange(2, 1, eventSheet.getLastRow() - 1, GOOGLE_ADS_EVENT_HEADERS.length)
    .getDisplayValues();
  const milestones = {};
  let latestReady = "";
  rows.forEach(function inspectQualificationCycle(row) {
    if (String(row[1] || "") !== String(opportunityId || "")) return;
    const milestone = String(row[2] || "");
    if (!/^qualified_lead(?:_v\d+)?$/.test(milestone)) return;
    milestones[milestone] = true;
    if (String(row[10] || "") === "ready") latestReady = milestone;
  });
  if (latestReady) return latestReady;
  const cycleCount = Object.keys(milestones).length;
  return cycleCount ? "qualified_lead_v" + (cycleCount + 1) : "qualified_lead";
}

function reativarGoogleAdsMilestoneExistente_(sheet, row, details) {
  const existingCreatedAt = sheet.getRange(row, 13).getValue();
  sheet.getRange(row, 2, 1, 14).setValues([[
    details.opportunityId,
    details.milestone,
    details.identifierType,
    details.clickId,
    details.conversionName,
    details.conversionTimestamp,
    details.value,
    details.currency,
    details.transactionId,
    "ready",
    "",
    existingCreatedAt || new Date(),
    new Date(),
    details.professional || "amanda",
  ]]);
  return { created: false, reactivated: true, row };
}

function enqueueGoogleAdsMilestone_(spreadsheet, details) {
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.googleAdsEventSheetName,
    GOOGLE_ADS_EVENT_HEADERS,
  );
  const eventId = String(details.eventId || "");
  const existingRow = findGoogleAdsEventRow_(sheet, eventId);
  const state = String(details.state || "ready");
  if (state === "ready") {
    ensureGoogleAdsImportRow_(spreadsheet, details);
  }
  if (existingRow) {
    if (state === "ready") {
      return reativarGoogleAdsMilestoneExistente_(
        sheet,
        existingRow,
        details,
      );
    }
    return { created: false, reactivated: false, row: existingRow };
  }

  const now = new Date();
  sheet.appendRow([
    eventId,
    details.opportunityId,
    details.milestone,
    details.identifierType,
    details.clickId,
    details.conversionName,
    details.conversionTimestamp,
    details.value,
    details.currency,
    details.transactionId,
    state,
    String(details.error || ""),
    now,
    now,
    details.professional || "amanda",
  ]);
  return { created: true, row: sheet.getLastRow() };
}

function obterPlanilhaGoogleAdsExistente_(spreadsheet, name, expectedHeaders) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error("missing_google_ads_sheet:" + name);
  const headers = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getDisplayValues()[0]
    .map(function normalizeHeader(value) {
      return String(value || "").trim();
    });
  expectedHeaders.forEach(function validateHeader(expected, index) {
    if (headers[index] !== expected) {
      throw new Error(
        "invalid_google_ads_header:" + name + ":" + (index + 1),
      );
    }
  });
  return sheet;
}

function motivoVinculoVisivelGoogleAds_(visibleRows, details, opportunityId) {
  if (!visibleRows || visibleRows.length === 0) {
    return "visible_transaction_not_found";
  }
  if (visibleRows.length > 1) return "ambiguous_visible_transaction";
  const visible = visibleRows[0];
  if (!visible.opportunityId) return "visible_opportunity_missing";
  if (visible.professional !== "amanda") return "visible_professional_mismatch";
  if (
    opportunityId &&
    String(visible.opportunityId) !== String(opportunityId)
  ) {
    return "visible_opportunity_mismatch";
  }
  if (visible.clickIdCount !== 1) return "visible_click_id_cardinality";
  if (
    visible.identifierType !== details.identifierType ||
    String(visible.clickId) !== String(details.clickId)
  ) {
    return "visible_click_id_mismatch";
  }
  return "";
}

function motivoVinculoLedgerGoogleAds_(ledgerRow, details, opportunityId) {
  if (!ledgerRow) return "";
  if (String(ledgerRow[1] || "") !== String(opportunityId || "")) {
    return "ledger_opportunity_mismatch";
  }
  if (String(ledgerRow[14] || "") !== "amanda") {
    return "ledger_professional_mismatch";
  }
  if (
    String(ledgerRow[3] || "") !== String(details.identifierType || "") ||
    String(ledgerRow[4] || "") !== String(details.clickId || "")
  ) {
    return "ledger_click_id_mismatch";
  }
  return "";
}

function reconciliarGoogleAdsLedgerEImportacao(input) {
  const apply = Boolean(input && input.apply === true);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const importSheet = obterPlanilhaGoogleAdsExistente_(
    spreadsheet,
    CONFIG.googleAdsImportSheetName,
    GOOGLE_ADS_IMPORT_HEADERS,
  );
  const eventSheet = obterPlanilhaGoogleAdsExistente_(
    spreadsheet,
    CONFIG.googleAdsEventSheetName,
    GOOGLE_ADS_EVENT_HEADERS,
  );
  const result = {
    ok: true,
    applied: false,
    importRows: Math.max(importSheet.getLastRow() - 1, 0),
    ledgerRows: Math.max(eventSheet.getLastRow() - 1, 0),
    invalidImportRows: 0,
    duplicateTransactions: 0,
    conversionNameMismatches: 0,
    visibleConversionNameMismatches: 0,
    missingLedger: 0,
    reconstructedLedger: 0,
    missingImport: 0,
    reconstructedImport: 0,
    reviewRequired: 0,
    issues: [],
  };
  const plans = {
    importNameRows: [],
    ledgerNameRows: [],
    visibleNameRows: [],
    ledgerRows: [],
    importRows: [],
  };
  const importRows = importSheet.getLastRow() >= 2
    ? importSheet
        .getRange(
          2,
          1,
          importSheet.getLastRow() - 1,
          GOOGLE_ADS_IMPORT_HEADERS.length,
        )
        .getValues()
    : [];
  const importsByTransaction = {};
  importRows.forEach(function indexImport(row, index) {
    const validation = validarLinhaImportacaoGoogleAds_(row);
    if (!validation.ok) {
      result.invalidImportRows += 1;
      result.reviewRequired += 1;
      result.issues.push({
        importRow: index + 2,
        reason: validation.errors.join(","),
      });
      return;
    }
    if (importsByTransaction[validation.transactionId]) {
      result.duplicateTransactions += 1;
      result.reviewRequired += 1;
      result.issues.push({
        importRow: index + 2,
        reason: "duplicate_transaction_id",
      });
      return;
    }
    importsByTransaction[validation.transactionId] = {
      row: index + 2,
      validation,
    };
    if (validation.conversionName !== CONFIG.qualifiedConversionName) {
      result.conversionNameMismatches += 1;
      plans.importNameRows.push(index + 2);
      validation.conversionName = CONFIG.qualifiedConversionName;
    }
  });

  const ledgersByTransaction = {};
  const ledgerRows = eventSheet.getLastRow() >= 2
    ? eventSheet
        .getRange(
          2,
          1,
          eventSheet.getLastRow() - 1,
          GOOGLE_ADS_EVENT_HEADERS.length,
        )
        .getValues()
    : [];
  ledgerRows.forEach(function indexLedger(row, index) {
    const transactionId = String(row[9] || "").trim();
    if (!transactionId) {
      result.reviewRequired += 1;
      result.issues.push({ ledgerRow: index + 2, reason: "missing_transaction_id" });
      return;
    }
    if (ledgersByTransaction[transactionId]) {
      result.duplicateTransactions += 1;
      result.reviewRequired += 1;
      result.issues.push({ ledgerRow: index + 2, reason: "duplicate_ledger_transaction" });
      return;
    }
    ledgersByTransaction[transactionId] = { row: index + 2, values: row };
    if (
      String(row[10] || "") === "ready" &&
      !googleAdsTransactionIdSeguro_(transactionId)
    ) {
      result.reviewRequired += 1;
      result.issues.push({
        ledgerRow: index + 2,
        reason: "unsafe_ready_transaction_id",
      });
    }
    if (String(row[5] || "") !== CONFIG.qualifiedConversionName) {
      result.conversionNameMismatches += 1;
      plans.ledgerNameRows.push(index + 2);
    }
  });

  const visibleByTransaction = {};
  const leadSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (leadSheet && leadSheet.getLastRow() >= 2) {
    const columns = mapaCabecalhosOportunidade_(leadSheet);
    [
      "ID da transação",
      "Opportunity ID",
      "Profissional responsável",
      "Nome da conversão",
      "GCLID",
      "GBRAID",
      "WBRAID",
    ].forEach(function requireVisibleHeader(header) {
      if (!columns[header]) {
        throw new Error("missing_google_ads_visible_header:" + header);
      }
    });
    const rows = leadSheet
      .getRange(2, 1, leadSheet.getLastRow() - 1, leadSheet.getLastColumn())
      .getDisplayValues();
    rows.forEach(function indexVisible(row, index) {
      const transactionId = String(
        row[(columns["ID da transação"] || 15) - 1] || "",
      ).trim();
      if (!transactionId) return;
      if (!visibleByTransaction[transactionId]) {
        visibleByTransaction[transactionId] = [];
      }
      visibleByTransaction[transactionId].push({
        row: index + 2,
        opportunityId: String(row[columns["Opportunity ID"] - 1] || ""),
        professional: normalizarProfissionalOportunidade_(
          row[columns["Profissional responsável"] - 1],
        ),
        conversionName: String(
          row[columns["Nome da conversão"] - 1] || "",
        ),
        clickIdCount: ["GCLID", "GBRAID", "WBRAID"].filter(
          function hasVisibleClickId(header) {
            return Boolean(String(row[columns[header] - 1] || "").trim());
          },
        ).length,
        identifierType: ["GCLID", "GBRAID", "WBRAID"].find(
          function findVisibleClickId(header) {
            return Boolean(String(row[columns[header] - 1] || "").trim());
          },
        ) || "",
        clickId: ["GCLID", "GBRAID", "WBRAID"].reduce(
          function readVisibleClickId(found, header) {
            return found || String(row[columns[header] - 1] || "").trim();
          },
          "",
        ),
      });
    });

    Object.keys(importsByTransaction).forEach(function planVisibleName(
      transactionId,
    ) {
      const visible = visibleByTransaction[transactionId] || [];
      const details = importsByTransaction[transactionId].validation;
      let reason = motivoVinculoVisivelGoogleAds_(visible, details, "");
      if (!reason && ledgersByTransaction[transactionId]) {
        reason = motivoVinculoLedgerGoogleAds_(
          ledgersByTransaction[transactionId].values,
          details,
          visible[0].opportunityId,
        );
      }
      if (reason) {
        result.reviewRequired += 1;
        result.issues.push({ transactionId, reason });
        return;
      }
      if (visible[0].conversionName !== CONFIG.qualifiedConversionName) {
        result.visibleConversionNameMismatches += 1;
        plans.visibleNameRows.push({
          row: visible[0].row,
          column: columns["Nome da conversão"],
        });
      }
    });
  }

  Object.keys(importsByTransaction).forEach(function repairLedger(transactionId) {
    if (ledgersByTransaction[transactionId]) return;
    result.missingLedger += 1;
    const visible = visibleByTransaction[transactionId] || [];
    const details = importsByTransaction[transactionId].validation;
    const visibleReason = motivoVinculoVisivelGoogleAds_(
      visible,
      details,
      "",
    );
    if (visibleReason) {
      result.reviewRequired += 1;
      result.issues.push({
        transactionId,
        reason: visibleReason,
      });
      return;
    }
    const milestone = "qualified_lead";
    const eventId = "ga_" + stableLeadHash_(
      visible[0].opportunityId + "|" + milestone,
    );
    plans.ledgerRows.push([
      eventId,
      visible[0].opportunityId,
      milestone,
      details.identifierType,
      details.clickId,
      CONFIG.qualifiedConversionName,
      details.conversionTimestamp,
      details.value,
      details.currency,
      transactionId,
      "ready",
      "",
      new Date(),
      new Date(),
      "amanda",
    ]);
  });

  Object.keys(ledgersByTransaction).forEach(function repairImport(transactionId) {
    if (importsByTransaction[transactionId]) return;
    result.missingImport += 1;
    const row = ledgersByTransaction[transactionId].values;
    if (String(row[10] || "") !== "ready") {
      result.missingImport -= 1;
      return;
    }
    const validation = validarLinhaImportacaoGoogleAds_([
      transactionId,
      String(row[3] || "") === "GCLID" ? row[4] : "",
      String(row[3] || "") === "GBRAID" ? row[4] : "",
      String(row[3] || "") === "WBRAID" ? row[4] : "",
      CONFIG.qualifiedConversionName,
      row[6],
      row[7],
      row[8],
    ]);
    const visible = visibleByTransaction[transactionId] || [];
    const visibleReason = validation.ok
      ? motivoVinculoVisivelGoogleAds_(visible, validation, row[1])
      : "invalid_ledger_payload";
    if (
      !validation.ok ||
      String(row[14] || "") !== "amanda" ||
      visibleReason
    ) {
      result.reviewRequired += 1;
      result.issues.push({
        transactionId,
        reason: visibleReason || "invalid_ledger_payload",
      });
      return;
    }
    plans.importRows.push([
      validation.transactionId,
      validation.identifierType === "GCLID" ? validation.clickId : "",
      validation.identifierType === "GBRAID" ? validation.clickId : "",
      validation.identifierType === "WBRAID" ? validation.clickId : "",
      CONFIG.qualifiedConversionName,
      validation.conversionTimestamp,
      validation.value,
      validation.currency,
    ]);
  });

  result.ok = result.reviewRequired === 0 &&
    result.invalidImportRows === 0 &&
    result.duplicateTransactions === 0;
  if (apply && result.ok) {
    plans.importNameRows.forEach(function repairImportName(row) {
      importSheet.getRange(row, 5).setValue(CONFIG.qualifiedConversionName);
    });
    plans.ledgerNameRows.forEach(function repairLedgerName(row) {
      eventSheet.getRange(row, 6).setValue(CONFIG.qualifiedConversionName);
    });
    plans.visibleNameRows.forEach(function repairVisibleName(target) {
      leadSheet
        .getRange(target.row, target.column)
        .setValue(CONFIG.qualifiedConversionName);
    });
    plans.ledgerRows.forEach(function appendLedger(row) {
      eventSheet.appendRow(row);
      result.reconstructedLedger += 1;
    });
    plans.importRows.forEach(function appendImport(row) {
      importSheet.appendRow(row);
      result.reconstructedImport += 1;
    });
    importSheet.showSheet();
    spreadsheet.setActiveSheet(importSheet);
    spreadsheet.moveActiveSheet(1);
    SpreadsheetApp.flush();
    result.applied = true;
  }
  return result;
}

function quarantinarConversoesGoogleAdsLegadas(input) {
  const apply = Boolean(
    input &&
    input.apply === true &&
    input.confirmation === "QUARANTINE_LEGACY_GOOGLE_ADS",
  );
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const importSheet = obterPlanilhaGoogleAdsExistente_(
    spreadsheet,
    CONFIG.googleAdsImportSheetName,
    GOOGLE_ADS_IMPORT_HEADERS,
  );
  const eventSheet = obterPlanilhaGoogleAdsExistente_(
    spreadsheet,
    CONFIG.googleAdsEventSheetName,
    GOOGLE_ADS_EVENT_HEADERS,
  );
  const leadSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!leadSheet) throw new Error("missing_google_ads_visible_sheet");
  const columns = mapaCabecalhosOportunidade_(leadSheet);
  [
    "Enviar ao Google Ads?",
    "Nome da conversão",
    "ID da transação",
  ].forEach(function requireHeader(header) {
    if (!columns[header]) {
      throw new Error("missing_google_ads_visible_header:" + header);
    }
  });

  const legacySheet = spreadsheet.getSheetByName("IMPORT_GCLID");
  const importRows = importSheet.getLastRow() >= 2
    ? importSheet
        .getRange(
          2,
          1,
          importSheet.getLastRow() - 1,
          GOOGLE_ADS_IMPORT_HEADERS.length,
        )
        .getValues()
    : [];
  const ledgerRows = eventSheet.getLastRow() >= 2
    ? eventSheet
        .getRange(
          2,
          1,
          eventSheet.getLastRow() - 1,
          GOOGLE_ADS_EVENT_HEADERS.length,
        )
        .getValues()
    : [];
  const ledgersByLegacyTransaction = {};
  ledgerRows.forEach(function indexLedger(row, index) {
    const transactionId = String(row[9] || "").trim();
    if (!transactionId) return;
    if (!ledgersByLegacyTransaction[transactionId]) {
      ledgersByLegacyTransaction[transactionId] = [];
    }
    ledgersByLegacyTransaction[transactionId].push({
      row: index + 2,
      values: row,
    });
  });

  const visibleByLegacyTransaction = {};
  if (leadSheet.getLastRow() >= 2) {
    const transactionValues = leadSheet
      .getRange(
        2,
        columns["ID da transação"],
        leadSheet.getLastRow() - 1,
        1,
      )
      .getDisplayValues();
    transactionValues.forEach(function indexVisible(row, index) {
      const transactionId = String(row[0] || "").trim();
      if (!transactionId) return;
      if (!visibleByLegacyTransaction[transactionId]) {
        visibleByLegacyTransaction[transactionId] = [];
      }
      visibleByLegacyTransaction[transactionId].push(index + 2);
    });
  }

  const legacyRowsByTransaction = {};
  if (legacySheet && legacySheet.getLastRow() >= 2) {
    legacySheet
      .getRange(2, 6, legacySheet.getLastRow() - 1, 1)
      .getDisplayValues()
      .forEach(function indexLegacy(row, index) {
        const transactionId = String(row[0] || "").trim();
        if (!transactionId) return;
        if (!legacyRowsByTransaction[transactionId]) {
          legacyRowsByTransaction[transactionId] = [];
        }
        legacyRowsByTransaction[transactionId].push(index + 2);
      });
  }

  const plans = [];
  const result = {
    ok: true,
    applied: false,
    unsafeSourceRows: 0,
    quarantinedRows: 0,
    reviewRequired: 0,
    issues: [],
  };
  importRows.forEach(function planQuarantine(row, index) {
    const legacyTransactionId = String(row[0] || "").trim();
    if (googleAdsTransactionIdSeguro_(legacyTransactionId)) return;
    result.unsafeSourceRows += 1;
    const ledgers = ledgersByLegacyTransaction[legacyTransactionId] || [];
    const visibleRows = visibleByLegacyTransaction[legacyTransactionId] || [];
    if (ledgers.length !== 1 || visibleRows.length !== 1) {
      result.reviewRequired += 1;
      result.issues.push({
        importRow: index + 2,
        reason: ledgers.length !== 1
          ? "legacy_ledger_cardinality"
          : "legacy_visible_cardinality",
      });
      return;
    }
    const opportunityId = String(ledgers[0].values[1] || "").trim();
    const milestone = String(ledgers[0].values[2] || "qualified_lead").trim();
    if (!opportunityId) {
      result.reviewRequired += 1;
      result.issues.push({
        importRow: index + 2,
        reason: "legacy_opportunity_missing",
      });
      return;
    }
    plans.push({
      importRow: index + 2,
      ledgerRow: ledgers[0].row,
      visibleRow: visibleRows[0],
      legacyRows: legacyRowsByTransaction[legacyTransactionId] || [],
      safeTransactionId: googleConversionTransactionId_(
        opportunityId,
        milestone,
      ),
    });
  });

  result.ok = result.reviewRequired === 0 &&
    plans.length === result.unsafeSourceRows;
  if (!apply || !result.ok) return result;

  const now = new Date();
  plans.forEach(function applyQuarantine(plan) {
    eventSheet.getRange(plan.ledgerRow, 10, 1, 5).setValues([[
      plan.safeTransactionId,
      GOOGLE_ADS_QUARANTINE_STATE,
      GOOGLE_ADS_QUARANTINE_REASON,
      eventSheet.getRange(plan.ledgerRow, 13).getValue() || now,
      now,
    ]]);
    leadSheet
      .getRange(plan.visibleRow, columns["Enviar ao Google Ads?"])
      .setValue("Não");
    leadSheet
      .getRange(plan.visibleRow, columns["Nome da conversão"])
      .setValue(CONFIG.qualifiedConversionName);
    leadSheet
      .getRange(plan.visibleRow, columns["ID da transação"])
      .setValue(plan.safeTransactionId);
    plan.legacyRows.forEach(function updateLegacy(row) {
      legacySheet.getRange(row, 6).setValue(plan.safeTransactionId);
    });
    result.quarantinedRows += 1;
  });
  plans
    .map(function importRow(plan) { return plan.importRow; })
    .sort(function descending(a, b) { return b - a; })
    .forEach(function removeUnsafeSource(row) {
      importSheet.deleteRow(row);
    });
  if (legacySheet) legacySheet.hideSheet();
  SpreadsheetApp.flush();
  result.applied = true;
  return result;
}

function planejarQuarentenaConversoesGoogleAdsLegadas() {
  const result = quarantinarConversoesGoogleAdsLegadas({ apply: false });
  console.log(JSON.stringify(result));
  return result;
}

function aplicarQuarentenaConversoesGoogleAdsLegadas() {
  const result = quarantinarConversoesGoogleAdsLegadas({
    apply: true,
    confirmation: "QUARANTINE_LEGACY_GOOGLE_ADS",
  });
  console.log(JSON.stringify(result));
  return result;
}

function higienizarIdsTransacaoVisiveisLegados(input) {
  const apply = Boolean(
    input &&
    input.apply === true &&
    input.confirmation === "CLEAR_VISIBLE_LEGACY_TRANSACTION_IDS",
  );
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error("missing_google_ads_visible_sheet");
  const columns = mapaCabecalhosOportunidade_(sheet);
  const sendColumn = Number(columns["Enviar ao Google Ads?"] || 0);
  const transactionColumn = Number(columns["ID da transação"] || 0);
  if (!sendColumn || !transactionColumn) {
    throw new Error("missing_google_ads_visible_transaction_headers");
  }

  const result = {
    ok: true,
    applied: false,
    legacyIdsFound: 0,
    clearedRows: 0,
    reviewRequired: 0,
  };
  if (sheet.getLastRow() < 2) return result;
  const startColumn = Math.min(sendColumn, transactionColumn);
  const width = Math.abs(transactionColumn - sendColumn) + 1;
  const rows = sheet
    .getRange(2, startColumn, sheet.getLastRow() - 1, width)
    .getDisplayValues();
  const sendOffset = sendColumn - startColumn;
  const transactionOffset = transactionColumn - startColumn;
  const rowsToClear = [];
  rows.forEach(function planVisibleCleanup(row, index) {
    const transactionId = String(row[transactionOffset] || "").trim();
    if (!transactionId || googleAdsTransactionIdSeguro_(transactionId)) {
      return;
    }
    result.legacyIdsFound += 1;
    if (String(row[sendOffset] || "").trim() === "Sim") {
      result.reviewRequired += 1;
      return;
    }
    rowsToClear.push(index + 2);
  });
  result.ok = result.reviewRequired === 0;
  if (!apply || !result.ok) return result;

  rowsToClear.forEach(function clearLegacyId(row) {
    sheet.getRange(row, transactionColumn).clearContent();
    result.clearedRows += 1;
  });
  SpreadsheetApp.flush();
  result.applied = true;
  return result;
}

function planejarHigieneIdsTransacaoVisiveisLegados() {
  const result = higienizarIdsTransacaoVisiveisLegados({ apply: false });
  console.log(JSON.stringify(result));
  return result;
}

function aplicarHigieneIdsTransacaoVisiveisLegados() {
  const result = higienizarIdsTransacaoVisiveisLegados({
    apply: true,
    confirmation: "CLEAR_VISIBLE_LEGACY_TRANSACTION_IDS",
  });
  console.log(JSON.stringify(result));
  return result;
}

function invalidarConversoesGoogleAdsOportunidade_(
  spreadsheet,
  opportunityId,
  options,
) {
  if (!opportunityId) return 0;
  options = options && typeof options === "object" ? options : {};
  const state = safeText_(options.state, 80) || "invalidated_nonlead";
  const reason = safeText_(options.reason, 300) ||
    "Contato excluído das bases de leads";
  const eventSheet = spreadsheet.getSheetByName(
    CONFIG.googleAdsEventSheetName,
  );
  const importSheet = spreadsheet.getSheetByName(
    CONFIG.googleAdsImportSheetName,
  );
  if (!eventSheet || eventSheet.getLastRow() < 2) return 0;
  const values = eventSheet
    .getRange(2, 1, eventSheet.getLastRow() - 1, GOOGLE_ADS_EVENT_HEADERS.length)
    .getDisplayValues();
  const transactions = {};
  const retractions = {};
  let invalidated = 0;
  values.forEach(function invalidateEvent(row, index) {
    if (String(row[1] || "") !== String(opportunityId)) return;
    const transactionId = String(row[9] || "").trim();
    if (transactionId) transactions[transactionId] = true;
    if (
      googleAdsTransactionIdSeguro_(transactionId) &&
      String(row[5] || "") === CONFIG.qualifiedConversionName &&
      String(row[10] || "") !== GOOGLE_ADS_QUARANTINE_STATE &&
      String(row[14] || "amanda") === "amanda"
    ) {
      retractions[transactionId] = {
        transactionId,
        conversionName: String(row[5] || ""),
      };
    }
    eventSheet.getRange(index + 2, 11, 1, 4).setValues([[
      state,
      reason,
      row[12] || new Date(),
      new Date(),
    ]]);
    invalidated += 1;
  });
  let retractionsQueued = 0;
  Object.keys(retractions).forEach(function enqueueRetraction(transactionId) {
    if (ensureGoogleAdsRetractionRow_(spreadsheet, Object.assign(
      { adjustmentAt: new Date() },
      retractions[transactionId],
    ))) {
      retractionsQueued += 1;
    }
  });
  if (options.metrics && typeof options.metrics === "object") {
    options.metrics.retractionsQueued = retractionsQueued;
  }
  if (importSheet && importSheet.getLastRow() >= 2) {
    const transactionRows = importSheet
      .getRange(2, 1, importSheet.getLastRow() - 1, 1)
      .getDisplayValues();
    for (let index = transactionRows.length - 1; index >= 0; index -= 1) {
      if (transactions[String(transactionRows[index][0] || "")]) {
        importSheet.deleteRow(index + 2);
      }
    }
  }
  return invalidated;
}

function getOrCreateLeadAuxiliarySheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }

  const currentWidth = Math.max(sheet.getLastColumn(), 0);
  const currentHeaders = currentWidth
    ? sheet.getRange(1, 1, 1, currentWidth).getDisplayValues()[0]
    : [];
  for (let index = 0; index < headers.length; index += 1) {
    if (String(currentHeaders[index] || "").trim() !== headers[index]) {
      sheet.getRange(1, index + 1).setValue(headers[index]);
    }
  }

  return sheet;
}

function findPhoneRowInSheet_(sheet, phone) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const normalizedPhone = normalizePhone_(phone);
  const phones = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  for (let index = 0; index < phones.length; index += 1) {
    if (normalizePhone_(phones[index][0]) === normalizedPhone) {
      return index + 2;
    }
  }

  return null;
}

function findClassificationQueueRow_(
  sheet,
  opportunityId,
  phone,
  professional,
  leaseToken,
) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      LEAD_CLASSIFICATION_HEADERS.length,
    )
    .getDisplayValues();
  const normalizedPhone = normalizePhone_(phone);
  const normalizedProfessional = typeof normalizarProfissionalOportunidade_ === "function"
    ? normalizarProfissionalOportunidade_(professional)
    : String(professional || "");
  if (leaseToken) {
    const matches = [];
    values.forEach(function (row, index) {
      const sameIdentity = opportunityId
        ? String(row[16] || "") === String(opportunityId)
        : !row[16];
      const sameProfessional = opportunityId ? String(row[17] || "") === normalizedProfessional
        : !row[17] || String(row[17]) === normalizedProfessional;
      if (sameIdentity && normalizePhone_(row[0]) === normalizedPhone && sameProfessional &&
        String(row[4]) === "running" && String(row[15] || "") === String(leaseToken)) matches.push(index + 2);
    });
    // Duplicate historical rows are legitimate evidence, not interchangeable
    // reservations. Never complete or release a different row by proximity.
    return matches.length === 1 ? matches[0] : null;
  }
  if (opportunityId) {
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (String(values[index][16] || "") === String(opportunityId)) return index + 2;
    }
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (
      !row[16] &&
      normalizePhone_(row[0]) === normalizedPhone &&
      (!row[17] || String(row[17]) === normalizedProfessional)
    ) {
      return index + 2;
    }
  }
  return null;
}

function findMessageRowInSheet_(sheet, messageId) {
  if (!messageId || !sheet || sheet.getLastRow() < 2) return null;
  const match = sheet
    .getRange(2, 4, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(messageId))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function hasMessageInSheet_(sheet, messageId) {
  return Boolean(findMessageRowInSheet_(sheet, messageId));
}

function normalizeLeadMessageSource_(direction, source, messageId, eventId) {
  if (String(direction || "").toUpperCase() !== "OUT") return "paciente";
  const normalized = String(source || "").trim().toLowerCase();
  if (["bruna", "bot", "automatic", "automatica", "automático"].indexOf(normalized) >= 0) {
    return "bruna";
  }
  if (["human", "humano", "equipe_humana", "equipe humana"].indexOf(normalized) >= 0) {
    return "equipe_humana";
  }
  const identity = [messageId, eventId].join(" ").toLowerCase();
  if (
    /(?:bruna|retomada|lembrete|reminder|post-consult|price-holding|overnight|image-acknowledgement|booking-confirmed|verified-partial|unknown-holding)/.test(identity)
  ) {
    return "bruna";
  }
  return "equipe_humana";
}

function recordLeadMessageOnly_(spreadsheet, leadRow, lead, direction) {
  const phone = normalizePhone_(lead.phone);
  const messageId = safeText_(lead.messageId || lead.eventId, 500);
  const eventId = safeText_(lead.eventId || messageId, 200);
  const at = lead.contactAt instanceof Date
    ? lead.contactAt
    : new Date(lead.contactAt || Date.now());
  const source = normalizeLeadMessageSource_(
    direction,
    lead.source,
    messageId,
    eventId,
  );

  if (!phone || !messageId || Number.isNaN(at.getTime())) return null;

  const messageSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.messageSheetName,
    LEAD_MESSAGE_HEADERS,
  );

  const existingMessageRow = findMessageRowInSheet_(
    messageSheet,
    messageId,
  );
  const created = !existingMessageRow;
  let enriched = false;
  let contentRecovered = false;
  let canonicalEventId = eventId;
  if (existingMessageRow) {
    const prior = messageSheet.getRange(existingMessageRow, 1, 1, 14).getValues()[0];
    // Provider corrections fill an absent body, never a different person, turn,
    // direction or valid text. Keep the original event id and provider time.
    if (normalizePhone_(prior[0]) !== phone || String(prior[1]) !== (direction === "OUT" ? "OUT" : "IN") ||
        new Date(prior[2]).getTime() !== at.getTime()) return null;
    if (direction === "IN" && String(prior[5] || "").trim() && String(lead.text || "").trim() &&
        String(prior[5]) !== safeText_(lead.text, 4000)) return null;
    canonicalEventId = String(prior[4] || eventId);
    if (direction === "IN" && !String(prior[5] || "").trim() &&
        ["", "unknown", "unsupported", "text"].includes(String(prior[12] || "")) &&
        lead.messageType === "text" && String(lead.text || "").trim()) {
      messageSheet.getRange(existingMessageRow, 6, 1, 8).setValues([[
        safeText_(lead.text, 4000), ...prior.slice(6, 12), "text",
      ]]);
      enriched = true;
      contentRecovered = true;
    }
  }
  if (!existingMessageRow) {
    messageSheet.appendRow([
      phone,
      direction === "OUT" ? "OUT" : "IN",
      at,
      messageId,
      eventId,
      safeText_(lead.text, 4000),
      Number(leadRow) > 0 ? Number(leadRow) : "",
      safeText_(lead.opportunityId, 120),
      safeText_(lead.professional, 80),
      safeText_(lead.leadSheetName, 120),
      source,
      safeText_(lead.templateId, 80).toLowerCase(),
      normalizarTipoMensagemClassificacao_(lead.messageType, lead.text),
      safeText_(lead.relatedMessageId, 500),
    ]);
  } else if (
    Number(leadRow) > 0 ||
    lead.opportunityId ||
    lead.professional ||
    lead.leadSheetName
  ) {
    const currentLink = messageSheet
      .getRange(existingMessageRow, 7, 1, 4)
      .getValues()[0];
    messageSheet
      .getRange(existingMessageRow, 7, 1, 4)
      .setValues([[
        Number(leadRow) > 0 ? Number(leadRow) : currentLink[0],
        safeText_(lead.opportunityId, 120) || currentLink[1],
        safeText_(lead.professional, 80) || currentLink[2],
        safeText_(lead.leadSheetName, 120) || currentLink[3],
      ]]);
  }
  if (
    existingMessageRow &&
    source &&
    !messageSheet.getRange(existingMessageRow, 11).getDisplayValue()
  ) {
    messageSheet.getRange(existingMessageRow, 11).setValue(source);
  }
  if (
    existingMessageRow &&
    lead.templateId &&
    !messageSheet.getRange(existingMessageRow, 12).getDisplayValue()
  ) {
    messageSheet
      .getRange(existingMessageRow, 12)
      .setValue(safeText_(lead.templateId, 80).toLowerCase());
  }
  if (existingMessageRow && lead.messageType && !messageSheet.getRange(existingMessageRow, 13).getDisplayValue()) {
    messageSheet.getRange(existingMessageRow, 13, 1, 2).setValues([[
      normalizarTipoMensagemClassificacao_(lead.messageType, lead.text), safeText_(lead.relatedMessageId, 500),
    ]]);
    enriched = true;
  } else if (existingMessageRow && lead.relatedMessageId && !messageSheet.getRange(existingMessageRow, 14).getDisplayValue()) {
    messageSheet.getRange(existingMessageRow, 14).setValue(safeText_(lead.relatedMessageId, 500));
    enriched = true;
  }

  return {
    phone: phone,
    messageId: messageId,
    at: at,
    created: created,
    enriched: enriched,
    contentRecovered: contentRecovered,
    eventId: canonicalEventId,
  };
}

function normalizarTipoMensagemClassificacao_(value, text) {
  const kind = String(value || "").toLowerCase();
  return ["text", "image", "audio", "video", "document", "reaction", "sticker"].includes(kind)
    ? kind : String(text || "").trim() ? "text" : "unknown";
}

function revisaoHistoricoClassificacao_(messages) {
  return stableLeadHash_(JSON.stringify((messages || []).map(function (message) {
    return [message.messageId, message.eventId, message.at, message.direction, message.source,
      message.text, message.messageType || "unknown", message.relatedMessageId || ""];
  })));
}

function recordLeadMessageAndQueue_(spreadsheet, leadRow, lead, direction) {
  const recorded = recordLeadMessageOnly_(
    spreadsheet,
    leadRow,
    lead,
    direction,
  );

  if (!recorded) return;

  const phone = recorded.phone;
  const messageId = recorded.messageId;
  const at = recorded.at;

  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const queueRow = findClassificationQueueRow_(
    queueSheet,
    lead.opportunityId,
    phone,
    lead.professional,
  );
  const dueAt = new Date(
    at.getTime() + CONFIG.classificationDelayMinutes * 60 * 1000,
  );

  if (!queueRow) {
    queueSheet.appendRow([
      phone,
      leadRow,
      at,
      dueAt,
      "pending",
      "",
      "",
      "",
      messageId,
      1,
      "",
      "",
      "",
      "",
      0,
      "",
      safeText_(lead.opportunityId, 120),
      safeText_(lead.professional, 80),
      safeText_(lead.leadSheetName, 120),
      "",
    ]);
    return recorded;
  }

  const current = queueSheet
    .getRange(queueRow, 1, 1, LEAD_CLASSIFICATION_HEADERS.length)
    .getValues()[0];
  if (!recorded.created && !recorded.enriched) return recorded;
  const messageCount = Number(current[9] || 0) + (recorded.created ? 1 : 0);
  const previousAt = parseClassificationDate_(current[2]);
  const latestIsCurrent = previousAt && previousAt.getTime() > at.getTime();

  queueSheet.getRange(queueRow, 2, 1, 5).setValues([[
    leadRow,
    latestIsCurrent ? previousAt : at,
    latestIsCurrent ? new Date(previousAt.getTime() + CONFIG.classificationDelayMinutes * 60000) : dueAt,
    "pending",
    "",
  ]]);
  queueSheet.getRange(queueRow, 9, 1, 2).setValues([[
    latestIsCurrent ? current[8] : messageId,
    messageCount,
  ]]);
  resetClassificationAttemptCycle_(queueSheet, queueRow);
  queueSheet.getRange(queueRow, 17, 1, 3).setValues([[
    safeText_(lead.opportunityId, 120),
    safeText_(lead.professional, 80),
    safeText_(lead.leadSheetName, 120),
  ]]);
  return recorded;
}

function resetClassificationAttemptCycle_(queueSheet, queueRow) {
  queueSheet.getRange(queueRow, 14, 1, 2).setValues([["", 0]]);
  queueSheet.getRange(queueRow, 16).setValue("");
}

function parseClassificationDate_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function compareClassificationCandidates_(left, right) {
  if (left.attempts !== right.attempts) {
    return left.attempts - right.attempts;
  }
  const leftTime = left.dueAt ? left.dueAt.getTime() : 0;
  const rightTime = right.dueAt ? right.dueAt.getTime() : 0;
  return leftTime - rightTime || left.index - right.index;
}

function categoriaExcecaoClassificacao_(state, error) {
  const normalizedState = String(state || "");
  const normalizedError = String(error || "");
  if (normalizedState === "waiting_messages") return "expected_wait";
  if (/^(?:external|nonpatient|business_exclusion)/.test(normalizedError)) {
    return "business_exclusion";
  }
  if (/review|confidence|ambiguous/.test(normalizedError)) {
    return "human_review";
  }
  return "technical_failure";
}

function classificarAcaoReaperClassificacao_(row, now) {
  const state = String(row && row[4] || "");
  const lease = parseClassificationDate_(row && row[5]);
  const error = String(row && row[13] || "");
  const attempts = Number(row && row[14] || 0);
  const maximumAttempts = Number(CONFIG.classificationMaxAttempts || 8);
  const category = categoriaExcecaoClassificacao_(state, error);
  if (state === "orphaned" || state === "dead_letter") {
    return {
      action: "exception_review",
      category,
      reason: error || state,
    };
  }
  if (attempts >= maximumAttempts) {
    return {
      action: "dead_letter",
      category: "technical_failure",
      reason: "max_attempts_exceeded",
    };
  }
  if (state === "running" && (!lease || lease <= now)) {
    return {
      action: "requeue",
      category: "technical_failure",
      reason: "expired_lease",
    };
  }
  if (
    state === "failed" &&
    /^(?:complete_|hydrate_|lead_not_found|stale_lease)/.test(error)
  ) {
    return {
      action: "requeue",
      category: "technical_failure",
      reason: error,
    };
  }
  return { action: "none", category, reason: "" };
}

function collectLeadMessages_(messageSheet, phone, limit) {
  if (!messageSheet || messageSheet.getLastRow() < 2) return [];
  const normalizedPhone = normalizePhone_(phone);
  const values = messageSheet
    .getRange(2, 1, messageSheet.getLastRow() - 1, 7)
    .getValues();

  return values
    .filter(function samePhone(row) {
      return normalizePhone_(row[0]) === normalizedPhone;
    })
    .slice(-Math.max(1, Number(limit) || 12))
    .map(function toMessage(row) {
      return {
        direction: String(row[1] || "IN"),
        at: row[2] instanceof Date
          ? row[2].toISOString()
          : String(row[2] || ""),
        messageId: String(row[3] || ""),
        text: String(row[5] || ""),
      };
    });
}

function indexLeadRowsForClassification_(leadsSheet) {
  const index = {};
  if (!leadsSheet || leadsSheet.getLastRow() < 2) return index;
  const values = leadsSheet
    .getRange(2, 1, leadsSheet.getLastRow() - 1, CONFIG.totalColumns)
    .getDisplayValues();

  values.forEach(function indexLead(row, offset) {
    const phone = normalizePhone_(row[2]);
    if (!phone) return;
    index[phone] = {
      row: offset + 2,
      values: row,
    };
  });
  return index;
}

function indexLeadMessagesForClassification_(messageSheet, limit) {
  const index = {};
  if (!messageSheet || messageSheet.getLastRow() < 2) return index;
  const values = messageSheet
    .getRange(2, 1, messageSheet.getLastRow() - 1, 7)
    .getValues();
  const maxMessages = Math.max(1, Number(limit) || 12);

  values.forEach(function indexMessage(row) {
    const phone = normalizePhone_(row[0]);
    if (!phone) return;
    if (!index[phone]) index[phone] = [];
    index[phone].push({
      direction: String(row[1] || "IN"),
      at: row[2] instanceof Date
        ? row[2].toISOString()
        : String(row[2] || ""),
      messageId: String(row[3] || ""),
      text: String(row[5] || ""),
    });
    if (index[phone].length > maxMessages) index[phone].shift();
  });
  return index;
}

function collectLeadMessagesForOpportunity_(
  messageSheet,
  opportunityId,
  phone,
  professional,
  limit,
  includeUnassignedUnknown,
) {
  if (!messageSheet || messageSheet.getLastRow() < 2) return [];
  const values = messageSheet
    .getRange(2, 1, messageSheet.getLastRow() - 1, LEAD_MESSAGE_HEADERS.length)
    .getValues();
  const normalizedPhone = normalizePhone_(phone);
  const normalizedProfessional = String(professional || "");
  function matchesLinkedIdentity(row) {
    const rowProfessional = String(row[8] || "");
    return Boolean(normalizedPhone && normalizePhone_(row[0]) === normalizedPhone &&
      (!rowProfessional || rowProfessional === "unknown" || rowProfessional === normalizedProfessional));
  }
  const firstLinkedIndex = opportunityId
    ? values.findIndex(function findFirstLinkedMessage(row) {
        return String(row[7] || "") === String(opportunityId) && matchesLinkedIdentity(row);
      })
    : -1;
  const matching = values.filter(function matchMessage(row, index) {
    if (opportunityId && String(row[7] || "") === String(opportunityId)) {
      return matchesLinkedIdentity(row);
    }
    const rowProfessional = String(row[8] || "");
    const canRecoverUnassigned = Boolean(
      includeUnassignedUnknown &&
      opportunityId &&
      firstLinkedIndex >= 0 &&
      index >= firstLinkedIndex &&
      (!rowProfessional || rowProfessional === "unknown"),
    );
    const canRecoverPhoneOnlyUnknown = Boolean(
      includeUnassignedUnknown &&
      !opportunityId &&
      (!rowProfessional || rowProfessional === "unknown"),
    );
    return (
      !row[7] &&
      normalizePhone_(row[0]) === normalizedPhone &&
      (
        !rowProfessional ||
        rowProfessional === normalizedProfessional ||
        canRecoverUnassigned ||
        canRecoverPhoneOnlyUnknown
      )
    );
  });
  const messages = matching.map(function (row) {
    const direction = String(row[1] || "IN");
    return {
      direction: direction,
      at: row[2] instanceof Date ? row[2].toISOString() : String(row[2] || ""),
      messageId: String(row[3] || ""),
      eventId: String(row[4] || ""),
      text: String(row[5] || ""),
      source: normalizeLeadMessageSource_(
        direction,
        row[10],
        row[3],
        row[4],
      ),
      templateId: String(row[11] || "").toLowerCase(),
      messageType: normalizarTipoMensagemClassificacao_(row[12], row[5]),
      relatedMessageId: String(row[13] || ""),
    };
  });
  return mergeConversationMessages_([messages], limit);
}

function collectHumanTakeoverMessagesForPhone_(
  takeoverSheet,
  phone,
  limit,
) {
  if (!takeoverSheet || takeoverSheet.getLastRow() < 2) return [];
  const normalizedPhone = normalizePhone_(phone);
  if (!normalizedPhone) return [];
  const values = takeoverSheet
    .getRange(2, 1, takeoverSheet.getLastRow() - 1, 6)
    .getValues();
  return values
    .filter(function samePhone(row) {
      return normalizePhone_(row[2]) === normalizedPhone;
    })
    .slice(-Math.max(1, Number(limit) || 12))
    .map(function publicHumanTurn(row) {
      return {
        direction: "OUT",
        at: row[3] instanceof Date
          ? row[3].toISOString()
          : String(row[3] || ""),
        messageId: String(row[1] || ""),
        eventId: String(row[0] || ""),
        text: String(row[5] || ""),
        source: "equipe_humana",
        templateId: "",
      };
    });
}

function mergeConversationMessages_(messageGroups, limit) {
  const merged = [];
  const seen = {};
  (Array.isArray(messageGroups) ? messageGroups : []).forEach(
    function mergeGroup(group) {
      (Array.isArray(group) ? group : []).forEach(function mergeMessage(message) {
        const key = String(
          message.eventId ||
          message.messageId ||
          [message.direction, message.at, message.text].join("|"),
        );
        if (seen[key]) return;
        seen[key] = true;
        merged.push({
          ...message,
          __order: merged.length,
        });
      });
    },
  );
  merged.sort(function chronologicalConversation(left, right) {
    const leftAt = new Date(left.at || 0).getTime();
    const rightAt = new Date(right.at || 0).getTime();
    if (Number.isFinite(leftAt) && Number.isFinite(rightAt) && leftAt !== rightAt) {
      return leftAt - rightAt;
    }
    return left.__order - right.__order;
  });
  return merged
    .slice(-Math.max(1, Number(limit) || 12))
    .map(function withoutOrder(message) {
      const result = { ...message };
      delete result.__order;
      return result;
    });
}

function boundedConversationText_(value, limit) {
  const characters = Array.from(String(value || "").trim());
  const maximum = Math.max(1, Number(limit) || 1600);
  if (characters.length <= maximum) return characters.join("");
  const marker = " … ";
  const available = Math.max(0, maximum - marker.length);
  const headLength = Math.ceil(available * 0.6);
  return characters.slice(0, headLength).join("") +
    marker +
    characters.slice(-(available - headLength)).join("");
}

function vinculoConversaPorEvento_(spreadsheet, phone, parentEventId) {
  if (!parentEventId) return null;
  const sheet = spreadsheet.getSheetByName(CONFIG.messageSheetName);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const matches = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues()
    .filter(function (row) {
      return normalizePhone_(row[0]) === phone && String(row[4] || "") === parentEventId && row[7];
    });
  const identities = new Set(matches.map(function (row) { return row[7] + ":" + row[8]; }));
  if (identities.size !== 1) return null;
  const row = matches[0];
  return { opportunityId: String(row[7]), professional: String(row[8] || ""),
    sheetName: String(row[9] || ""), leadRow: Number(row[6]) || null };
}

function registrarTurnoConversa_(input) {
  input = input && typeof input === "object" ? input : {};
  const phone = normalizePhone_(input.phone);
  const eventId = safeText_(input.eventId, 200);
  const messageId = safeText_(input.messageId || eventId, 500);
  const text = safeText_(input.text, 4000);
  const at = new Date(input.at || Date.now());
  if (!phone || !eventId || !messageId || !text || Number.isNaN(at.getTime())) {
    return { ok: false, error: "invalid_conversation_turn" };
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const parentEventId = safeText_(input.parentEventId, 200);
  const linked = vinculoConversaPorEvento_(spreadsheet, phone, parentEventId);
  // A delayed receipt must stay attached to its originating opportunity.
  // Missing parent evidence is recoverable; guessing the newest patient is not.
  if (parentEventId && !linked && !input.opportunityId) {
    return { ok: false, error: "conversation_parent_not_found" };
  }
  const latest = linked || (!parentEventId &&
    typeof localizarOportunidadeMaisRecentePorTelefone_ === "function"
    ? localizarOportunidadeMaisRecentePorTelefone_(spreadsheet, phone) : null);
  const requestedOpportunityId = safeText_(input.opportunityId, 120);
  if (linked && (requestedOpportunityId && requestedOpportunityId !== linked.opportunityId ||
    input.professional && input.professional !== linked.professional)) {
    return { ok: false, error: "conversation_identity_conflict" };
  }
  const opportunityMatches = Boolean(
    latest &&
    (!requestedOpportunityId || latest.opportunityId === requestedOpportunityId),
  );
  const opportunityId = requestedOpportunityId ||
    (latest && latest.opportunityId) || "";
  const professional = safeText_(input.professional, 80) ||
    (latest && latest.professional) || "";
  const leadSheetName = opportunityMatches
    ? latest.sheetName || ""
    : "";
  const leadRow = opportunityMatches ? latest.leadRow : null;
  const lead = {
    phone: phone,
    contactAt: at,
    messageId: messageId,
    eventId: eventId,
    text: text,
    opportunityId: opportunityId,
    professional: professional,
    leadSheetName: leadSheetName,
    source: safeText_(input.source, 40),
    templateId: safeText_(input.templateId, 80).toLowerCase(),
    messageType: normalizarTipoMensagemClassificacao_(input.messageType, text),
    relatedMessageId: safeText_(input.relatedMessageId, 500),
  };
  // Every newly persisted turn invalidates a completed or running view. Replay
  // keeps the same message and does not increment the queue a second time.
  const recorded = recordLeadMessageAndQueue_(
    spreadsheet,
    leadRow || "",
    lead,
    "OUT",
  );

  return {
    ok: Boolean(recorded),
    recorded: Boolean(recorded),
    duplicate: Boolean(recorded && recorded.created === false),
    opportunityId: opportunityId,
    professional: professional,
  };
}

function obterContextoConversa_(input) {
  input = input && typeof input === "object" ? input : {};
  const phone = normalizePhone_(input.phone);
  if (!phone) return { ok: false, error: "invalid_conversation_identity" };

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const latest = typeof localizarOportunidadeMaisRecentePorTelefone_ === "function"
    ? localizarOportunidadeMaisRecentePorTelefone_(spreadsheet, phone)
    : null;
  const requestedOpportunityId = safeText_(input.opportunityId, 120);
  const opportunityId = requestedOpportunityId ||
    (latest && latest.opportunityId) || "";
  const professional = safeText_(input.professional, 80) ||
    (latest && latest.professional) || "";
  const messageSheet = spreadsheet.getSheetByName(CONFIG.messageSheetName);
  const takeoverSheet = spreadsheet.getSheetByName(
    CONFIG.humanTakeoverSheetName,
  );
  const limit = Math.max(1, Math.min(32, Number(input.limit) || 32));
  const messages = mergeConversationMessages_(
    [
      collectLeadMessagesForOpportunity_(
        messageSheet,
        opportunityId,
        phone,
        professional,
        limit,
        true,
      ),
      collectHumanTakeoverMessagesForPhone_(
        takeoverSheet,
        phone,
        limit,
      ),
    ],
    limit,
  );
  const turns = messages.map(function publicConversationTurn(message) {
    const outbound = message.direction === "OUT";
    return {
      role: outbound ? "assistant" : "user",
      source: outbound
        ? message.source === "bruna" ? "bruna" : "human"
        : "patient",
      at: message.at,
      eventId: safeText_(message.eventId || message.messageId, 200),
      text: boundedConversationText_(message.text, 1600),
      messageType: message.messageType || "unknown",
    };
  }).filter(function nonEmptyConversationTurn(turn) {
    return Boolean(turn.text) || turn.messageType !== "reaction";
  });
  const pendingCommitments =
    typeof listarCompromissosPendentesPaciente_ === "function"
      ? listarCompromissosPendentesPaciente_(
          spreadsheet,
          phone,
          5,
        )
      : [];

  return {
    ok: true,
    opportunityId: opportunityId,
    professional: professional,
    turns: turns,
    pendingCommitments: pendingCommitments,
  };
}

function relationshipFromCanonicalLeadStatus_(status) {
  const states = {
    "Consulta agendada": "appointment_scheduled",
    "Consulta realizada": "consultation_completed",
    "Paciente convertido": "surgical_planning",
  };
  return {
    found: Boolean(states[String(status || "")]),
    relationshipState: states[String(status || "")] || "unknown",
  };
}

function classificationAdministrativeSignal_(classification) {
  const appointmentOutcome = String(
    classification && classification.appointmentOutcome || "none",
  );
  let procedureMilestone = String(
    classification && classification.procedureMilestone || "none",
  );
  const validAppointmentOutcomes = ["confirmed", "missed", "attended"];
  const validProcedureMilestones = [
    "quote_sent",
    "accepted",
    "completed",
    "payment_confirmed",
  ];
  const administrativeText = [
    classification && classification.summary,
    classification && classification.evidence,
    classification && classification.nextAction,
  ].join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const consultationPayment =
    procedureMilestone === "payment_confirmed" &&
    /(?:pagamento|pix|pago|paga).{0,60}(?:consulta|avaliacao)|(?:consulta|avaliacao).{0,60}(?:pagamento|pix|pago|paga)/.test(
      administrativeText,
    );
  if (consultationPayment) procedureMilestone = "none";

  return {
    appointmentOutcome: validAppointmentOutcomes.includes(appointmentOutcome)
      ? appointmentOutcome
      : "none",
    procedureMilestone: validProcedureMilestones.includes(procedureMilestone)
      ? procedureMilestone
      : "none",
  };
}

function administrativeLeadStatus_(classification) {
  const signal = classificationAdministrativeSignal_(classification);
  if (["accepted", "completed", "payment_confirmed"].includes(
    signal.procedureMilestone,
  )) {
    return "Paciente convertido";
  }
  if (signal.appointmentOutcome === "attended") {
    return "Consulta realizada";
  }
  if (signal.appointmentOutcome === "confirmed") {
    return "Consulta agendada";
  }
  return "";
}

function effectiveLeadStatusFromClassification_(
  currentStatus,
  classification,
) {
  const signal = classificationAdministrativeSignal_(classification);
  const conversionConfirmed = [
    "accepted",
    "completed",
    "payment_confirmed",
  ].includes(signal.procedureMilestone);
  const administrativeStatus = administrativeLeadStatus_(classification);
  let proposedStatus = String(
    classification && classification.recommendedStatus || currentStatus,
  );

  if (proposedStatus === "Paciente convertido" && !conversionConfirmed) {
    proposedStatus = administrativeStatus || String(currentStatus || "Novo");
  }
  if (
    administrativeStatus &&
    leadStatusRank_(administrativeStatus) > leadStatusRank_(proposedStatus)
  ) {
    proposedStatus = administrativeStatus;
  }
  return proposedStatus;
}

function relationshipFromClassification_(status, classification, fallback) {
  const knownStates = ["active_postop", "surgical_planning", "appointment_scheduled",
    "consultation_completed", "former_patient", "known_patient"];
  const previous = knownStates.includes(String(fallback || "")) ? String(fallback) : "";
  if (classification && classification.confidence === "low") {
    return previous || relationshipFromCanonicalLeadStatus_(status).relationshipState;
  }
  const signal = classificationAdministrativeSignal_(classification);
  if (signal.procedureMilestone === "completed") return "active_postop";
  if ([
    "quote_sent",
    "accepted",
    "payment_confirmed",
  ].includes(signal.procedureMilestone)) {
    return "surgical_planning";
  }
  if (previous === "active_postop" || previous === "surgical_planning") return previous;
  const mapped = relationshipFromCanonicalLeadStatus_(status);
  return mapped.found ? mapped.relationshipState : previous ||
    (status === "Qualificado" ? "engaged_lead" : status === "Novo" ? "new_lead" : "unknown");
}

function classificationOperationalContext_(spreadsheet, phone, opportunityId, professional) {
  const available = typeof listarCompromissosPendentesPaciente_ === "function" &&
    typeof houveAtendimentoHumanoNoDia_ === "function";
  if (!available) return { operationalContextVerified: false, pendingCommitments: [] };
  const pending = listarCompromissosPendentesPaciente_(spreadsheet, phone, 10,
    { opportunityId: opportunityId, professional: professional });
  return { operationalContextVerified: true, professional: professional, opportunityId: opportunityId,
    checkedAt: new Date().toISOString(), pendingCommitments: pending,
    humanTakeoverToday: houveAtendimentoHumanoNoDia_(spreadsheet, phone, new Date()),
    patientRelationship: { hasPendingHumanTask: pending.length > 0 } };
}

function safeAdministrativeClassification_(job, relationship) {
  if (!job || !job.operationalContextVerified || job.humanTakeoverToday ||
    job.patientRelationship && job.patientRelationship.hasPendingHumanTask ||
    !["new_lead", "engaged_lead", "unknown"].includes(relationship) ||
    typeof classificarPerguntaAdministrativaSegura_ !== "function") return null;
  const messages = Array.isArray(job.messages) ? job.messages : [];
  const last = messages[messages.length - 1];
  if (!last || last.direction !== "IN" || last.messageType && last.messageType !== "text") return null;
  const now = parseClassificationDate_(job.checkedAt) || new Date();
  const recentHuman = messages.some(function (message) {
    if (message.direction !== "OUT" || message.source !== "equipe_humana") return false;
    const at = parseClassificationDate_(message.at);
    return !at || now.getTime() - at.getTime() < 24 * 60 * 60 * 1000;
  });
  return recentHuman ? null : classificarPerguntaAdministrativaSegura_(last.text, job.professional);
}

function ownerFromClassificationContext_(classification, job, relationship, currentOwner) {
  if (safeAdministrativeClassification_(job, relationship) && String(currentOwner || "") !== "human") return "bruna";
  const activeCare = ["active_postop", "surgical_planning", "appointment_scheduled", "consultation_completed"];
  const messages = job && Array.isArray(job.messages) ? job.messages : [];
  const humanAuthorship = messages.some(function humanTurn(message) {
    return message.direction === "OUT" && message.source === "equipe_humana";
  });
  if (lastMessageIsHumanResumeReceipt_(job) || ["human_team", "human"].includes(String(currentOwner || "")) || humanAuthorship ||
    activeCare.includes(relationship) || classification && classification.confidence === "low" ||
    job && job.patientRelationship && job.patientRelationship.hasPendingHumanTask === true) return "human_team";
  return "bruna";
}

function lastMessageIsHumanResumeReceipt_(job) {
  const messages = job && Array.isArray(job.messages) ? job.messages : [];
  const last = messages[messages.length - 1];
  return Boolean(last && last.direction === "OUT" && last.source === "bruna" &&
    (/-human-resume-holding(?::bruna)?$/.test(String(last.eventId || last.messageId || "")) ||
     /^Recebi (?:sua mensagem|seu pedido sobre o agendamento|o material que você enviou)\. A equipe foi avisada para conferir e retornar por aqui assim que possível\.$/.test(String(last.text || ""))));
}

function expectedPartyFromClassification_(classification, job) {
  if (job && job.patientRelationship && job.patientRelationship.hasPendingHumanTask === true) return "clinic";
  if (lastMessageIsHumanResumeReceipt_(job)) return "clinic";
  const explicit = String(
    classification && classification.expectedParty || "",
  ).trim().toLowerCase();
  if (explicit === "clinic" || explicit === "patient") return explicit;
  const nextAction = String(
    classification && classification.nextAction || "",
  ).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /(?:aguardar|esperar).{0,80}(?:retorno|resposta|mensagem|manifestacao)|(?:retorno|resposta|mensagem|manifestacao).{0,80}(?:paciente|pessoa|contato)/.test(
    nextAction,
  ) ? "patient" : "clinic";
}

function shouldAlertLowConfidenceAdministrativeChange_(classification) {
  if (String(classification && classification.confidence) !== "low") {
    return false;
  }
  const signal = classificationAdministrativeSignal_(classification);
  return signal.appointmentOutcome !== "none" ||
    signal.procedureMilestone !== "none";
}

function claimDueLeadClassifications_(requestedLimit, requestIdInput) {
  const requestId = String(requestIdInput || "");
  if (requestId && (!/^claim-\d{13}-[a-f0-9-]{36}$/.test(requestId) ||
    Math.abs(Date.now() - Number(requestId.split("-")[1])) > 5 * 60 * 1000)) {
    return { jobs: [], error: "invalid_claim_request" };
  }
  const limit = Math.min(Math.max(Number(requestedLimit) || 5, 1), 20);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  // The idempotent reservation path must not rescan the incident archive under
  // the global lock. Expired leases and exhausted attempts are handled below;
  // the full reaper remains available for operational reconciliation.
  const reaper = requestId ? { deferred: true } : executarReaperFilaClassificacaoInterno_(spreadsheet, true);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const now = new Date();
  const leaseUntil = new Date(
    now.getTime() + CONFIG.classificationLeaseMinutes * 60 * 1000,
  );
  const jobs = [];
  if (queueSheet.getLastRow() < 2) return { jobs, reaper };
  const queueValues = queueSheet
    .getRange(
      2,
      1,
      queueSheet.getLastRow() - 1,
      LEAD_CLASSIFICATION_HEADERS.length,
    )
    .getValues();
  const queueUpdates = [];
  if (requestId) {
    const existing = queueValues.filter(function (row) {
      return String(row[15] || "").indexOf(requestId + ":") === 0;
    });
    if (existing.length) return { jobs: existing.filter(function (row) {
      const lease = parseClassificationDate_(row[5]);
      return String(row[4]) === "running" && lease && lease > now;
    }).map(function (row) {
      return { phone: normalizePhone_(row[0]), throughMessageId: String(row[8] || row[7] || ""),
        leaseToken: String(row[15]), opportunityId: String(row[16] || ""),
        professional: String(row[17] || ""), leadSheetName: String(row[18] || "") };
    }), recoveredReservation: true, reaper };
  }

  const candidates = [];
  for (let index = 0; index < queueValues.length; index += 1) {
    const row = queueValues[index];
    const state = String(row[4] || "pending");
    const attempts = Number(row[14] || 0);
    const dueAt = parseClassificationDate_(row[3]);
    const currentLease = parseClassificationDate_(row[5]);
    const eligibleState = state === "pending" || state === "failed" ||
      (state === "running" && (!currentLease || currentLease <= now));

    if (!eligibleState || (dueAt && dueAt > now)) continue;

    if (attempts >= CONFIG.classificationMaxAttempts) {
      row[4] = "dead_letter";
      row[5] = "";
      row[13] = "max_attempts_exceeded";
      row[15] = "";
      queueUpdates.push({
        row: index + 2,
        values: row.slice(4, 16),
      });
      continue;
    }

    candidates.push({ index, row, attempts, dueAt });
  }

  candidates.sort(compareClassificationCandidates_);
  for (
    let candidateIndex = 0;
    candidateIndex < candidates.length;
    candidateIndex += 1
  ) {
    if (jobs.length >= limit) break;
    const candidate = candidates[candidateIndex];
    const index = candidate.index;
    const row = candidate.row;

    const phone = normalizePhone_(row[0]);
    const throughMessageId = String(row[8] || row[7] || "");
    const attempts = candidate.attempts + 1;
    const leaseToken = (requestId ? requestId + ":" : "") + Utilities.getUuid();
    row[4] = "running";
    // Em atualizacoes em lote, algumas planilhas converteram Date para o
    // serial zero. ISO preserva o instante e parseClassificationDate_ o le.
    row[5] = leaseUntil.toISOString();
    row[14] = attempts;
    row[15] = leaseToken;
    queueUpdates.push({
      row: index + 2,
      values: row.slice(4, 16),
    });

    jobs.push({
      phone,
      throughMessageId,
      leaseToken,
      opportunityId: String(row[16] || ""),
      professional: String(row[17] || ""),
      leadSheetName: String(row[18] || ""),
    });
  }

  // O claim roda sob ScriptLock. Gravar apenas as colunas mutadas das linhas
  // selecionadas evita reescrever toda a fila e reduz o risco de timeout que
  // deixava leases válidas sem resposta para o trabalhador.
  queueUpdates.forEach(function writeQueueUpdate(update) {
    queueSheet
      .getRange(update.row, 5, 1, 12)
      .setValues([update.values]);
  });

  return { jobs, reaper };
}

function hydrateLeadClassificationJobs_(claimedJobs) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const messageSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.messageSheetName,
    LEAD_MESSAGE_HEADERS,
  );
  const classificationGuidance =
    typeof carregarOrientacoesClassificacaoBot_ === "function"
      ? carregarOrientacoesClassificacaoBot_(spreadsheet)
      : [];
  const queueValues = queueSheet.getLastRow() < 2
    ? []
    : queueSheet
      .getRange(
        2,
        1,
        queueSheet.getLastRow() - 1,
        LEAD_CLASSIFICATION_HEADERS.length,
      )
      .getDisplayValues();
  const activeLeases = {};
  queueValues.forEach(function indexLease(row) {
    const phone = normalizePhone_(row[0]);
    const token = String(row[15] || "");
    const opportunityId = String(row[16] || "");
    if ((opportunityId || phone) && token && String(row[4] || "") === "running") {
      activeLeases[[opportunityId || phone, token].join("|")] = row;
    }
  });

  const jobs = (Array.isArray(claimedJobs) ? claimedJobs : [])
    .slice(0, 20)
    .map(function hydrateJob(job) {
      const phone = normalizePhone_(job && job.phone);
      const leaseToken = String(job && job.leaseToken || "");
      const opportunityId = String(job && job.opportunityId || "");
      const professional = String(job && job.professional || "");
      const leadSheetName = String(
        job && job.leadSheetName ||
        (professional === "daniel" ? CONFIG.danielSheetName : CONFIG.sheetName),
      );
      const base = {
        phone,
        opportunityId,
        professional,
        leadSheetName,
        throughMessageId: String(job && job.throughMessageId || ""),
        leaseToken,
      };
      const activeQueueRow = activeLeases[[opportunityId || phone, leaseToken].join("|")];
      if (!activeQueueRow) {
        return Object.assign(base, { errorCode: "stale_lease" });
      }
      const leadsSheet = spreadsheet.getSheetByName(leadSheetName);
      if (!leadsSheet) return Object.assign(base, { errorCode: "orphaned" });
      const leadRow = typeof localizarLeadPorOportunidadeOuTelefone_ === "function"
        ? localizarLeadPorOportunidadeOuTelefone_(
            leadsSheet,
            opportunityId,
            phone,
          )
        : findLeadRowByPhone_(leadsSheet, phone);
      if (!leadRow) return Object.assign(base, { errorCode: "orphaned" });
      const headers = typeof mapaCabecalhosOportunidade_ === "function"
        ? mapaCabecalhosOportunidade_(leadsSheet)
        : {};
      const leadValues = leadsSheet
        .getRange(leadRow, 1, 1, leadsSheet.getLastColumn())
        .getDisplayValues()[0];
      const statusColumn = headers["Situação do lead"] || 5;
      const summaryColumn = headers["Resumo automático"] || 0;
      const nextActionColumn = headers["Próxima ação automática"] || 0;
      const versionColumn = headers["Versão da oportunidade"] || 0;
      const currentStatus = String(leadValues[statusColumn - 1] || "Novo");
      const uniqueRouteContext =
        typeof localizarContextoRotaUnicoPorTelefone_ === "function"
          ? localizarContextoRotaUnicoPorTelefone_(spreadsheet, phone)
          : null;
      const canRecoverUnassignedMessages = Boolean(
        uniqueRouteContext &&
        String(uniqueRouteContext.opportunityId || "") === opportunityId &&
        String(uniqueRouteContext.professional || "") === professional,
      );
      const messages = collectLeadMessagesForOpportunity_(
        messageSheet,
        opportunityId,
        phone,
        professional,
        24,
        canRecoverUnassignedMessages,
      );
      if (!messages.length) {
        return Object.assign(base, { errorCode: "waiting_messages" });
      }
      const relationshipColumn = headers["Relacionamento"] || 0;
      const relationshipState = relationshipFromClassification_(currentStatus, {},
        relationshipColumn ? String(leadValues[relationshipColumn - 1] || "") : "unknown");
      const relationship = {
        found: !["new_lead", "engaged_lead", "unknown"].includes(relationshipState),
        relationshipState: relationshipState,
      };
      const operational = classificationOperationalContext_(spreadsheet, phone, opportunityId, professional);
      relationship.hasPendingHumanTask = Boolean(operational.patientRelationship && operational.patientRelationship.hasPendingHumanTask);
      return Object.assign(base, operational, {
        leadRow,
        conversationRevision: revisaoHistoricoClassificacao_(messages),
        includeUnassignedUnknown: canRecoverUnassignedMessages,
        throughMessageId: base.throughMessageId ||
          String(messages[messages.length - 1].messageId || ""),
        currentStatus,
        currentSummary: summaryColumn
          ? String(leadValues[summaryColumn - 1] || "")
          : "",
        currentNextAction: nextActionColumn
          ? String(leadValues[nextActionColumn - 1] || "")
          : "",
        claimedVersion: versionColumn
          ? Number(leadValues[versionColumn - 1] || 0)
          : 0,
        patientRelationship: relationship,
        classificationGuidance,
        messages,
      });
    });
  return { jobs };
}

function classificationLeaseMatches_(queueSheet, queueRow, leaseToken) {
  const activeToken = String(
    queueSheet.getRange(queueRow, 16).getDisplayValue() || "",
  );
  return Boolean(leaseToken) && activeToken === String(leaseToken);
}

function leadStatusRank_(status) {
  return {
    Novo: 1,
    Qualificado: 2,
    "Consulta agendada": 3,
    "Consulta realizada": 4,
    "Paciente convertido": 5,
  }[String(status || "")] || 0;
}

function shouldApplyLeadStatus_(
  currentStatus,
  proposedStatus,
  confidence,
  allowLowConfidenceAdministrative,
) {
  // Uncertain evidence belongs to review, including administrative milestones.
  if (confidence === "low") return false;
  if (proposedStatus === "Não qualificado") {
    return confidence === "high" && leadStatusRank_(currentStatus) <= 2;
  }
  return leadStatusRank_(proposedStatus) > leadStatusRank_(currentStatus);
}

function googleConversionTimestamp_(date) {
  return Utilities.formatDate(
    date,
    CONFIG.timezone,
    "yyyy-MM-dd HH:mm:ssXXX",
  );
}

function googleAdsAdjustmentTimestamp_(date) {
  return Utilities.formatDate(
    date,
    CONFIG.timezone,
    "yyyy-MM-dd HH:mm:ssZ",
  );
}

function googleConversionTransactionId_(opportunityId, milestone) {
  const payload = [
    CONFIG.googleAdsCustomerId,
    opportunityId,
    milestone,
  ].join("|");
  const signature = Utilities.computeHmacSha256Signature(
    payload,
    googleAdsTransactionSecret_(),
    Utilities.Charset.UTF_8,
  );
  const transactionId =
    "LIV-QL-v1-" + googleAdsBase64UrlSemPadding_(signature);
  if (!googleAdsTransactionIdSeguro_(transactionId)) {
    throw new Error("invalid_google_ads_transaction_id");
  }
  return transactionId;
}

function ensureQualifiedGoogleConversion_(
  sheet,
  row,
  phone,
  conversionAt,
  details,
) {
  const professional = typeof normalizarProfissionalOportunidade_ === "function"
    ? normalizarProfissionalOportunidade_(details && details.professional)
    : String(details && details.professional || "amanda");
  if (professional !== "amanda") return false;
  if (
    typeof sheet.getName === "function" &&
    sheet.getName() !== CONFIG.sheetName
  ) {
    return false;
  }
  const values = sheet
    .getRange(row, 1, 1, CONFIG.totalColumns)
    .getDisplayValues()[0];
  const clickIdentifiers = [
    { type: "GCLID", value: String(values[10] || "").trim() },
    { type: "GBRAID", value: String(values[11] || "").trim() },
    { type: "WBRAID", value: String(values[12] || "").trim() },
  ];
  const identifiers = clickIdentifiers.filter(function hasValue(item) {
    return Boolean(item.value);
  });

  if (identifiers.length !== 1) return false;
  const identifier = identifiers[0];

  const conversionDate = conversionAt instanceof Date
    ? conversionAt
    : new Date();
  const opportunityId = String(details && details.opportunityId || "") ||
    leadOpportunityId_(values, phone);
  const parentSpreadsheet = typeof sheet.getParent === "function"
    ? sheet.getParent()
    : null;
  const milestone = googleAdsQualificationMilestone_(
    parentSpreadsheet,
    opportunityId,
  );
  const existingTransactionId = String(values[14] || "").trim();
  const existingTransactionIsSafe = googleAdsTransactionIdSeguro_(
    existingTransactionId,
  );
  const quarantinedLegacy = Boolean(existingTransactionId) &&
    !existingTransactionIsSafe;
  const transactionId = String(values[6] || "") === "Sim" &&
    existingTransactionIsSafe
    ? existingTransactionId
    : googleConversionTransactionId_(opportunityId, milestone);
  const conversionTimestamp = values[13] ||
    googleConversionTimestamp_(conversionDate);

  sheet.getRange(row, 7, 1, 3).setValues([[
    quarantinedLegacy ? "Não" : "Sim",
    CONFIG.qualifiedConversionName,
    1,
  ]]);
  sheet.getRange(row, 14, 1, 3).setValues([[
    conversionTimestamp,
    transactionId,
    "BRL",
  ]]);

  if (parentSpreadsheet) {
    enqueueGoogleAdsMilestone_(parentSpreadsheet, {
      eventId: "ga_" + stableLeadHash_(opportunityId + "|" + milestone),
      opportunityId,
      milestone,
      identifierType: identifier.type,
      clickId: identifier.value,
      conversionName: CONFIG.qualifiedConversionName,
      conversionTimestamp,
      value: 1,
      currency: "BRL",
      transactionId,
      professional: "amanda",
      state: quarantinedLegacy ? GOOGLE_ADS_QUARANTINE_STATE : "ready",
      error: quarantinedLegacy ? GOOGLE_ADS_QUARANTINE_REASON : "",
    });
  }
  return !quarantinedLegacy;
}

function faseRequerConversaoQualificadaGoogleAds_(stage) {
  const normalized = String(stage || "");
  return normalized !== "Não qualificado" &&
    leadStatusRank_(normalized) >= leadStatusRank_("Qualificado");
}

function limparConversaoQualificadaVisivelPorLinha_(sheet, row) {
  const columns = mapaCabecalhosOportunidade_(sheet);
  const sendColumn = Number(columns["Enviar ao Google Ads?"] || 0);
  const payloadHeaders = [
    "Nome da conversão",
    "Valor (R$)",
    "Data e hora da conversão",
    "ID da transação",
    "Moeda",
  ];
  if (!sendColumn || payloadHeaders.some(function missing(header) {
    return !columns[header];
  })) {
    throw new Error("missing_google_ads_visible_header");
  }
  const values = sheet
    .getRange(row, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  let cleared = 0;
  if (String(values[sendColumn - 1] || "") !== "Não") {
    sheet.getRange(row, sendColumn).setValue("Não");
    cleared += 1;
  }
  payloadHeaders.forEach(function clearPayload(header) {
    const column = columns[header];
    if (!String(values[column - 1] || "").trim()) return;
    sheet.getRange(row, column).clearContent();
    cleared += 1;
  });
  return cleared;
}

function reconciliarConversaoGoogleAdsComFase_(spreadsheet, input) {
  input = input && typeof input === "object" ? input : {};
  const professional = typeof normalizarProfissionalOportunidade_ === "function"
    ? normalizarProfissionalOportunidade_(input.professional)
    : String(input.professional || "");
  if (professional !== "amanda") {
    return { ok: true, ignored: true, reason: "professional_not_amanda" };
  }
  const sheet = input.sheet || spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet || sheet.getName() !== CONFIG.sheetName) {
    return { ok: false, reason: "visible_sheet_not_found" };
  }
  const row = Number(input.row || 0);
  const opportunityId = String(input.opportunityId || "").trim();
  const stage = String(input.stage || "").trim();
  if (!row || !opportunityId || !stage) {
    return { ok: false, reason: "incomplete_google_ads_reconciliation" };
  }
  if (faseRequerConversaoQualificadaGoogleAds_(stage)) {
    const ready = ensureQualifiedGoogleConversion_(
      sheet,
      row,
      input.phone,
      input.at,
      { opportunityId, professional },
    );
    return {
      ok: true,
      ignored: false,
      stage,
      ready,
      invalidatedEvents: 0,
      retractionsQueued: 0,
    };
  }
  if (stage !== "Novo" && stage !== "Não qualificado") {
    return { ok: true, ignored: true, reason: "stage_not_actionable" };
  }

  const metrics = {};
  const invalidatedEvents = invalidarConversoesGoogleAdsOportunidade_(
    spreadsheet,
    opportunityId,
    {
      state: stage === "Não qualificado"
        ? "invalidated_not_qualified"
        : "invalidated_downgraded_to_new",
      reason: safeText_(
        input.reason || input.source || "Fase canônica rebaixada",
        300,
      ),
      metrics,
    },
  );
  const clearedVisibleFields = limparConversaoQualificadaVisivelPorLinha_(
    sheet,
    row,
  );
  return {
    ok: true,
    ignored: false,
    stage,
    ready: false,
    invalidatedEvents,
    retractionsQueued: Number(metrics.retractionsQueued || 0),
    clearedVisibleFields,
  };
}

function reconciliarConversoesGoogleAdsFasesAtuais(input) {
  input = input && typeof input === "object" ? input : {};
  const apply = input.apply === true;
  if (
    apply &&
    input.confirmation !== "RECONCILIAR_CONVERSOES_GOOGLE_ADS_FASES_V1"
  ) {
    throw new Error("google_ads_stage_reconciliation_confirmation_required");
  }
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error("visible_sheet_not_found");
  const columns = mapaCabecalhosOportunidade_(sheet);
  const required = [
    "Telefone (E.164)",
    "Situação do lead",
    "GCLID",
    "GBRAID",
    "WBRAID",
    "Opportunity ID",
    "Profissional responsável",
  ];
  required.forEach(function requireHeader(header) {
    if (!columns[header]) throw new Error("missing_visible_header:" + header);
  });
  const result = {
    ok: true,
    applied: false,
    inspected: 0,
    qualifiedWithClickId: 0,
    qualifiedWithoutSingleClickId: 0,
    lowStageRows: 0,
    ready: 0,
    invalidatedEvents: 0,
    retractionsQueued: 0,
    clearedVisibleFields: 0,
    issues: [],
  };
  if (sheet.getLastRow() < 2) return result;
  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getDisplayValues();
  rows.forEach(function reconcileRow(values, index) {
    const professional = normalizarProfissionalOportunidade_(
      values[columns["Profissional responsável"] - 1],
    );
    const opportunityId = String(
      values[columns["Opportunity ID"] - 1] || "",
    ).trim();
    if (professional !== "amanda" || !opportunityId) return;
    const stage = String(values[columns["Situação do lead"] - 1] || "").trim();
    const clickIdCount = ["GCLID", "GBRAID", "WBRAID"].filter(
      function hasClickId(header) {
        return Boolean(String(values[columns[header] - 1] || "").trim());
      },
    ).length;
    result.inspected += 1;
    if (faseRequerConversaoQualificadaGoogleAds_(stage)) {
      if (clickIdCount === 1) result.qualifiedWithClickId += 1;
      else result.qualifiedWithoutSingleClickId += 1;
    } else if (stage === "Novo" || stage === "Não qualificado") {
      result.lowStageRows += 1;
    } else {
      return;
    }
    if (!apply) return;
    try {
      const reconciled = reconciliarConversaoGoogleAdsComFase_(spreadsheet, {
        sheet,
        row: index + 2,
        phone: values[columns["Telefone (E.164)"] - 1],
        opportunityId,
        professional,
        stage,
        source: "stage_reconciliation_postflight",
        at: new Date(),
      });
      if (!reconciled.ok) throw new Error(reconciled.reason || "unknown");
      if (reconciled.ready) result.ready += 1;
      result.invalidatedEvents += Number(reconciled.invalidatedEvents || 0);
      result.retractionsQueued += Number(reconciled.retractionsQueued || 0);
      result.clearedVisibleFields += Number(
        reconciled.clearedVisibleFields || 0,
      );
    } catch (error) {
      result.ok = false;
      result.issues.push({
        row: index + 2,
        opportunityId,
        reason: String(error && error.message || error),
      });
    }
  });
  SpreadsheetApp.flush();
  result.applied = apply;
  return result;
}

function planejarReconciliacaoConversoesGoogleAdsFasesAtuais() {
  const result = reconciliarConversoesGoogleAdsFasesAtuais({ apply: false });
  console.log(JSON.stringify(result));
  return result;
}

function aplicarReconciliacaoConversoesGoogleAdsFasesAtuais() {
  const result = reconciliarConversoesGoogleAdsFasesAtuais({
    apply: true,
    confirmation: "RECONCILIAR_CONVERSOES_GOOGLE_ADS_FASES_V1",
  });
  console.log(JSON.stringify(result));
  return result;
}

function completeLeadClassification_(job, classification) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const phone = normalizePhone_(job.phone);
  const professional = typeof normalizarProfissionalOportunidade_ === "function"
    ? normalizarProfissionalOportunidade_(job.professional)
    : String(job.professional || "amanda");
  const leadSheetName = String(job.leadSheetName || "") ||
    (professional === "daniel" ? CONFIG.danielSheetName : CONFIG.sheetName);
  const leadsSheet = spreadsheet.getSheetByName(leadSheetName);
  const opportunityId = String(job.opportunityId || "");
  const queueRow = findClassificationQueueRow_(
    queueSheet,
    opportunityId,
    phone,
    professional,
    job.leaseToken,
  );
  const leadRow = leadsSheet
    ? localizarLeadPorOportunidadeOuTelefone_(
        leadsSheet,
        opportunityId,
        phone,
      )
    : null;

  if (!queueRow) return { status: "ignored", error: "stale_lease" };
  if (!leadRow) {
    return { status: "ignored", error: "lead_not_found" };
  }

  if (!classificationLeaseMatches_(queueSheet, queueRow, job.leaseToken)) {
    return { status: "ignored", error: "stale_lease" };
  }

  const columns = mapaCabecalhosOportunidade_(leadsSheet);
  const currentValues = leadsSheet
    .getRange(leadRow, 1, 1, leadsSheet.getLastColumn())
    .getDisplayValues()[0];
  const statusColumn = columns["Situação do lead"] || 5;
  const statusDateColumn = columns["Data da situação"] || 6;
  const versionColumn = columns["Versão da oportunidade"] || 0;
  const currentVersion = versionColumn
    ? Number(currentValues[versionColumn - 1] || 0)
    : 0;
  if (
    Number(job.claimedVersion || 0) > 0 &&
    currentVersion !== Number(job.claimedVersion)
  ) {
    queueSheet.getRange(queueRow, 5, 1, 2).setValues([["pending", ""]]);
    queueSheet.getRange(queueRow, 16).setValue("");
    return { status: "ignored", error: "stale_row_version" };
  }
  const currentStatus = String(currentValues[statusColumn - 1] || "Novo");
  if (job.conversationRevision) {
    const liveMessages = collectLeadMessagesForOpportunity_(spreadsheet.getSheetByName(CONFIG.messageSheetName),
      opportunityId, phone, professional, 24, job.includeUnassignedUnknown === true);
    if (revisaoHistoricoClassificacao_(liveMessages) !== String(job.conversationRevision)) {
      queueSheet.getRange(queueRow, 5, 1, 2).setValues([["pending", ""]]);
      queueSheet.getRange(queueRow, 16).setValue("");
      return { status: "ignored", error: "stale_conversation_revision" };
    }
  }
  const queuedLatestMessageId = String(queueSheet.getRange(queueRow, 9).getDisplayValue() || "");
  if (queuedLatestMessageId && job.throughMessageId && queuedLatestMessageId !== String(job.throughMessageId)) {
    queueSheet.getRange(queueRow, 5, 1, 2).setValues([["pending", ""]]);
    queueSheet.getRange(queueRow, 16).setValue("");
    return { status: "ignored", error: "stale_conversation_revision" };
  }
  const rawProposedStatus = String(
    classification.recommendedStatus || currentStatus,
  );
  const proposedStatus = effectiveLeadStatusFromClassification_(
    currentStatus,
    classification,
  );
  const confidence = String(classification.confidence || "low");
  const administrativeSignal = classificationAdministrativeSignal_(
    classification,
  );
  const hasAdministrativeEvidence = Boolean(
    String(classification.evidence || "").trim() &&
    (
      administrativeSignal.appointmentOutcome !== "none" ||
      administrativeSignal.procedureMilestone !== "none"
    ),
  );
  const now = new Date();
  const statusToKeep = shouldApplyLeadStatus_(
    currentStatus,
    proposedStatus,
    confidence,
    hasAdministrativeEvidence,
  ) ? proposedStatus : currentStatus;
  let needsClassificationReview =
    confidence === "low" ||
    rawProposedStatus !== proposedStatus ||
    (
      proposedStatus !== currentStatus &&
      statusToKeep === currentStatus
    );
  const canonicalOpportunityId = opportunityId ||
    String(currentValues[(columns["Opportunity ID"] || 0) - 1] || "") ||
    leadOpportunityId_(currentValues, phone);
  const classifiedProfessional =
    typeof normalizarProfissionalOportunidade_ === "function"
      ? normalizarProfissionalOportunidade_(classification.professional)
      : String(classification.professional || "unknown");

  if (
    confidence === "high" &&
    (classifiedProfessional === "external" ||
      classifiedProfessional === "nonpatient")
  ) {
    recordLeadStageEvent_(spreadsheet, {
      opportunityId: canonicalOpportunityId,
      phone,
      source: "whatsapp_classifier",
      fromStatus: currentStatus,
      proposedStatus: "Não qualificado",
      appliedStatus: "Não qualificado",
      confidence,
      throughMessageId: job.throughMessageId,
      decision: "archived_nonlead",
      evidence: classification.evidence,
      professional: classifiedProfessional,
      at: now,
    });
    queueSheet.getRange(queueRow, 5, 1, 4).setValues([[
      "excluded",
      "",
      now,
      String(job.throughMessageId || ""),
    ]]);
    queueSheet.getRange(queueRow, 11, 1, 6).setValues([[
      "Não qualificado",
      safeText_(classification.summary, 600),
      "Nenhuma ação comercial automática",
      "",
      0,
      "",
    ]]);
    const archiveResult = typeof arquivarContatoNaoLead_ === "function"
      ? arquivarContatoNaoLead_(spreadsheet, {
          phone,
          opportunityId: canonicalOpportunityId,
          professional: classifiedProfessional,
          reason: safeText_(classification.evidence, 300),
          eventId: String(job.throughMessageId || ""),
          at: now,
        })
      : { archivedLeadRows: 0 };
    SpreadsheetApp.flush();
    return {
      status: "completed",
      excluded: true,
      professional: classifiedProfessional,
      archivedLeadRows: Number(archiveResult.archivedLeadRows || 0),
      googleConversionReady: false,
    };
  }

  const storedRelationship = String(currentValues[(columns["Relacionamento"] || 0) - 1] || "");
  const relationshipToKeep = relationshipFromClassification_(statusToKeep, classification,
    storedRelationship || job.patientRelationship && job.patientRelationship.relationshipState || "unknown");
  // The worker returns identifiers and classification, not the raw transcript.
  // Re-read authorship here, at the owner of the canonical write.
  const completionContext = {
    messages: collectLeadMessagesForOpportunity_(
      spreadsheet.getSheetByName(CONFIG.messageSheetName),
      canonicalOpportunityId, phone, professional, 24,
    ),
  };
  Object.assign(completionContext, classificationOperationalContext_(spreadsheet, phone, canonicalOpportunityId, professional));
  const safeAdministrative = safeAdministrativeClassification_(completionContext, relationshipToKeep);
  const pendingHumanTask = completionContext.patientRelationship && completionContext.patientRelationship.hasPendingHumanTask;
  const automaticValues = {
    "Resumo automático": safeText_(classification.summary, 600),
    "Próxima ação automática": pendingHumanTask
      ? "Equipe: conferir e resolver a solicitação pendente antes de nova ação comercial."
      : safeAdministrative
      ? "Bruna: esclarecer " + safeAdministrative.subject.toLowerCase() + " com a resposta administrativa aprovada, após os gates do turno."
      : lastMessageIsHumanResumeReceipt_(completionContext)
      ? "Equipe: conferir a solicitação pendente e responder; houve apenas confirmação automática de recebimento."
      : confidence === "low"
      ? "Revisar o histórico antes de confirmar a próxima ação; classificação incerta."
      : safeText_(classification.nextAction, 300),
    "Objeção principal": safeText_(classification.commercialReason, 80),
    "Relacionamento": relationshipToKeep,
    "Responsável atual": ownerFromClassificationContext_(classification, completionContext, relationshipToKeep,
      currentValues[(columns["Responsável atual"] || 0) - 1]),
    "Aguardando ação de": safeAdministrative || confidence === "low" ? "clinic" : expectedPartyFromClassification_(classification, completionContext),
  };
  const phaseSync = typeof sincronizarFaseOportunidadeELead_ === "function"
    ? sincronizarFaseOportunidadeELead_(spreadsheet, {
        opportunityId: canonicalOpportunityId,
        phone,
        professional,
        stage: statusToKeep,
        allowNonQualified: statusToKeep === "Não qualificado",
        relationship: automaticValues["Relacionamento"],
        owner: automaticValues["Responsável atual"],
        expectedParty: automaticValues["Aguardando ação de"],
        objection: automaticValues["Objeção principal"],
        summary: automaticValues["Resumo automático"],
        nextAction: automaticValues["Próxima ação automática"],
        source: "whatsapp_classifier",
        at: now,
      })
    : { ok: false, reason: "canonical_stage_sync_unavailable" };
  const appliedStatus = phaseSync.ok ? phaseSync.stage : currentStatus;
  if (!phaseSync.ok) needsClassificationReview = true;

  const appointmentUpdate =
    confidence !== "low" &&
    administrativeSignal.appointmentOutcome !== "none" &&
    typeof registrarMarcoAdministrativoClassificado_ === "function"
      ? registrarMarcoAdministrativoClassificado_(spreadsheet, {
          phone,
          professional,
          opportunityId: canonicalOpportunityId,
          outcome: administrativeSignal.appointmentOutcome,
          at: now,
          confidence,
          evidence: classification.evidence,
        })
      : { updated: false, reason: "no_appointment_signal" };

  const businessMilestone =
    confidence !== "low" &&
    administrativeSignal.procedureMilestone !== "none" &&
    typeof registrarMarcoOportunidade_ === "function"
      ? registrarMarcoOportunidade_(spreadsheet, {
          eventId: "milestone_" + stableLeadHash_([
            canonicalOpportunityId,
            String(job.throughMessageId || ""),
            administrativeSignal.procedureMilestone,
          ].join("|")),
          opportunityId: canonicalOpportunityId,
          milestone: administrativeSignal.procedureMilestone,
          at: now,
          source: "whatsapp_classifier",
          confidence,
        })
      : { ok: true, created: false, reason: "no_procedure_milestone" };

  recordLeadStageEvent_(spreadsheet, {
    opportunityId: canonicalOpportunityId,
    phone,
    source: "whatsapp_classifier",
    fromStatus: currentStatus,
    proposedStatus,
    appliedStatus,
    confidence,
    throughMessageId: job.throughMessageId,
    decision: phaseSync.ok && appliedStatus !== currentStatus
      ? "applied"
      : needsClassificationReview
        ? "review_required"
        : "no_change",
    evidence: classification.evidence,
    professional,
    at: now,
  });

  const latestMessageId = String(
    queueSheet.getRange(queueRow, 9).getDisplayValue() || "",
  );
  const throughMessageId = String(job.throughMessageId || "");
  const hasNewerMessages = Boolean(
    latestMessageId && throughMessageId && latestMessageId !== throughMessageId,
  );

  queueSheet.getRange(queueRow, 2).setValue(leadRow);
  queueSheet.getRange(queueRow, 5, 1, 4).setValues([[
    hasNewerMessages ? "pending" : "done",
    "",
    now,
    throughMessageId,
  ]]);
  queueSheet.getRange(queueRow, 11, 1, 5).setValues([[
    proposedStatus,
    safeText_(classification.summary, 600),
    safeText_(classification.nextAction, 300),
    "",
    0,
  ]]);
  queueSheet.getRange(queueRow, 16).setValue("");

  if (
    needsClassificationReview &&
    typeof registrarRevisaoClassificacaoBot_ === "function"
  ) {
    registrarRevisaoClassificacaoBot_({
      phone,
      key: [phone, throughMessageId || latestMessageId].join(":"),
      confidence,
      context: [
        "Status atual: " + currentStatus,
        "Resumo: " + String(classification.summary || ""),
        "Evidência: " + String(classification.evidence || ""),
        "Resultado da consulta: " + administrativeSignal.appointmentOutcome,
        "Marco do procedimento: " + administrativeSignal.procedureMilestone,
      ].join("\n"),
      suggestion: [
        "Status sugerido pelo classificador: " + rawProposedStatus,
        "Status protegido aplicado: " + appliedStatus,
        "Sincronização canônica: " + (phaseSync.ok
          ? "ok"
          : String(phaseSync.reason || "falhou")),
        "Próxima ação: " + String(classification.nextAction || ""),
      ].join("\n"),
    });
  }

  let lowConfidenceAlert = { sent: false, skipped: true };
  if (
    shouldAlertLowConfidenceAdministrativeChange_(classification) &&
    typeof sendReviewAlertEmail_ === "function"
  ) {
    try {
      const nameColumn = columns["Nome"] || columns["Nome do paciente"] || 0;
      lowConfidenceAlert = sendReviewAlertEmail_({
        eventId: [
          "classification-low-confidence",
          canonicalOpportunityId,
          throughMessageId || latestMessageId,
          administrativeSignal.appointmentOutcome,
          administrativeSignal.procedureMilestone,
        ].join(":"),
        patientName: nameColumn
          ? String(currentValues[nameColumn - 1] || "")
          : "",
        patientPhone: phone,
        messageText: [
          "Decisão humana necessária: conferir o marco administrativo antes de alterar a fase.",
          "O marco incerto não foi aplicado automaticamente à agenda ou ao fechamento.",
          "Status anterior: " + currentStatus,
          "Status aplicado: " + appliedStatus,
          "Resultado da consulta: " + administrativeSignal.appointmentOutcome,
          "Marco do procedimento: " + administrativeSignal.procedureMilestone,
          "Consulta localizada: " + (appointmentUpdate.updated ? "sim" : "não"),
          "Evidência administrativa: " + String(classification.evidence || ""),
          "Revise a linha do lead e a aba Revisões do Bot.",
          "SEM SUGESTÃO PRONTA: confirme o registro administrativo antes de responder sobre agenda ou fechamento.",
        ].join("\n"),
      });
    } catch (alertError) {
      console.error(JSON.stringify({
        event: "classification_low_confidence_email_failed",
        opportunityId: canonicalOpportunityId,
        detail: safeText_(alertError && alertError.message, 160),
      }));
      lowConfidenceAlert = { sent: false, error: "email_failed" };
    }
  }

  SpreadsheetApp.flush();
  return {
    status: "completed",
    leadRow,
    appliedStatus,
    appointmentUpdated: appointmentUpdate.updated === true,
    businessMilestoneRecorded: businessMilestone.created === true,
    lowConfidenceAlertSent: lowConfidenceAlert.sent === true,
    googleConversionReady:
      professional === "amanda" &&
      String(leadsSheet.getRange(leadRow, 7).getDisplayValue()) === "Sim",
  };
}

function failLeadClassification_(job) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const queueRow = findClassificationQueueRow_(
    queueSheet,
    job.opportunityId,
    job.phone,
    job.professional,
    job.leaseToken,
  );

  if (!queueRow) return { status: "ignored", error: "stale_lease" };

  if (!classificationLeaseMatches_(queueSheet, queueRow, job.leaseToken)) {
    return { status: "ignored", error: "stale_lease" };
  }

  const terminalState = {
    orphaned: "orphaned",
    waiting_messages: "waiting_messages",
  }[String(job.errorCode || "")];
  if (terminalState) {
    queueSheet.getRange(queueRow, 5, 1, 2).setValues([[
      terminalState,
      "",
    ]]);
    queueSheet.getRange(queueRow, 14).setValue(String(job.errorCode));
    queueSheet.getRange(queueRow, 16).setValue("");
    return { status: terminalState };
  }

  const attempts = Number(queueSheet.getRange(queueRow, 15).getValue() || 1);
  if (attempts >= CONFIG.classificationMaxAttempts) {
    queueSheet.getRange(queueRow, 5, 1, 2).setValues([[
      "dead_letter",
      "",
    ]]);
    queueSheet.getRange(queueRow, 14).setValue(
      safeText_(job.errorCode || "max_attempts_exceeded", 120),
    );
    queueSheet.getRange(queueRow, 16).setValue("");
    return { status: "dead_letter", attempts };
  }
  const retryMinutes = Math.min(Math.max(attempts, 1) * 15, 180);
  queueSheet.getRange(queueRow, 4, 1, 3).setValues([[
    new Date(Date.now() + retryMinutes * 60 * 1000),
    "failed",
    "",
  ]]);
  queueSheet.getRange(queueRow, 14).setValue(
    safeText_(job.errorCode || "classification_failed", 120),
  );
  queueSheet.getRange(queueRow, 16).setValue("");
  return { status: "failed", retryMinutes };
}

function obterOuCriarExcecoesClassificacao_(spreadsheet) {
  return getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CLASSIFICATION_EXCEPTION_SHEET,
    CLASSIFICATION_EXCEPTION_HEADERS,
  );
}

function registrarExcecaoClassificacao_(sheet, incident) {
  const incidentId = "class_" + hashOportunidade_([
    incident.queueRow,
    incident.opportunityId,
    incident.state,
    incident.error,
    incident.attempts,
    incident.action,
  ].join("|"));
  if (sheet.getLastRow() >= 2) {
    const duplicate = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(incidentId)
      .matchEntireCell(true)
      .findNext();
    if (duplicate) return false;
  }
  sheet.appendRow([
    incidentId,
    incident.queueRow,
    incident.opportunityId,
    incident.state,
    incident.category,
    incident.error,
    incident.attempts,
    new Date(),
    incident.lastActivity,
    incident.action,
    "",
  ]);
  return true;
}

function executarReaperFilaClassificacaoInterno_(spreadsheet, apply) {
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const result = {
    applied: apply === true,
    inspected: 0,
    requeueable: 0,
    requeued: 0,
    deadLetterable: 0,
    deadLettered: 0,
    attentionRequired: 0,
    incidentsCreated: 0,
  };
  if (queueSheet.getLastRow() < 2) return result;
  const now = new Date();
  const values = queueSheet
    .getRange(2, 1, queueSheet.getLastRow() - 1, LEAD_CLASSIFICATION_HEADERS.length)
    .getValues();
  const exceptionSheet = apply
    ? obterOuCriarExcecoesClassificacao_(spreadsheet)
    : null;
  values.forEach(function inspectQueueRow(row, index) {
    result.inspected += 1;
    const decision = classificarAcaoReaperClassificacao_(row, now);
    if (decision.action === "none") return;
    const queueRow = index + 2;
    const state = String(row[4] || "");
    const error = String(row[13] || "");
    const attempts = Number(row[14] || 0);
    if (decision.action === "requeue") result.requeueable += 1;
    if (decision.action === "dead_letter") result.deadLetterable += 1;
    if (decision.action === "exception_review") {
      result.attentionRequired += 1;
    }
    if (!apply) return;
    if (registrarExcecaoClassificacao_(exceptionSheet, {
      queueRow,
      opportunityId: String(row[16] || ""),
      state,
      category: decision.category,
      error: error || decision.reason,
      attempts,
      lastActivity: row[2] || "",
      action: decision.action,
    })) {
      result.incidentsCreated += 1;
    }
    if (decision.action === "requeue") {
      queueSheet.getRange(queueRow, 4, 1, 3).setValues([[
        now,
        "pending",
        "",
      ]]);
      queueSheet.getRange(queueRow, 14).setValue(
        safeText_("reaper_requeued:" + decision.reason, 120),
      );
      queueSheet.getRange(queueRow, 16).setValue("");
      result.requeued += 1;
      return;
    }
    if (decision.action === "dead_letter") {
      queueSheet.getRange(queueRow, 5, 1, 2).setValues([[
        "dead_letter",
        "",
      ]]);
      queueSheet.getRange(queueRow, 14).setValue(
        safeText_("max_attempts_exceeded:" + (error || "unknown"), 120),
      );
      queueSheet.getRange(queueRow, 16).setValue("");
      result.deadLettered += 1;
    }
  });
  if (apply) SpreadsheetApp.flush();
  return result;
}

function executarReaperFilaClassificacao(input) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  return executarReaperFilaClassificacaoInterno_(
    spreadsheet,
    Boolean(input && input.apply === true),
  );
}

function repararFilaClassificacaoTravada() {
  return executarReaperFilaClassificacao({ apply: true });
}

function staleAttemptCycleRepairCandidates_(values, cutoff) {
  const rows = Array.isArray(values) ? values : [];
  const cutoffDate = parseClassificationDate_(cutoff);
  if (!cutoffDate) throw new Error("invalid_classification_repair_cutoff");
  const maximumAttempts = Number(CONFIG.classificationMaxAttempts || 8);
  return rows.slice(1).reduce(function selectRepairCandidate(selected, row, index) {
    const lastActivity = parseClassificationDate_(row[2]);
    const lastClassification = parseClassificationDate_(row[6]);
    const state = String(row[4] || "").trim();
    const error = String(row[13] || "").trim();
    const attempts = Number(row[14] || 0);
    const opportunityId = String(row[16] || "").trim();
    const professional = String(row[17] || "").trim();
    const leadSheetName = String(row[18] || "").trim();
    if (
      state !== "dead_letter" ||
      error !== CLASSIFICATION_STALE_ATTEMPT_REPAIR.legacyError ||
      attempts < maximumAttempts ||
      !lastActivity ||
      !lastClassification ||
      lastActivity <= lastClassification ||
      lastActivity > cutoffDate ||
      !opportunityId ||
      !professional ||
      !leadSheetName
    ) {
      return selected;
    }
    selected.push({ rowNumber: index + 2 });
    return selected;
  }, []);
}

function reconcileStaleClassificationAttemptCycles_(input) {
  input = input && typeof input === "object" ? input : {};
  const apply = input.apply === true;
  if (
    apply &&
    input.confirmation !== CLASSIFICATION_STALE_ATTEMPT_REPAIR.confirmation
  ) {
    throw new Error("classification_attempt_cycle_repair_confirmation_required");
  }
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const values = queueSheet.getDataRange().getValues();
  const candidates = staleAttemptCycleRepairCandidates_(
    values,
    CLASSIFICATION_STALE_ATTEMPT_REPAIR.cutoff,
  );
  const result = {
    ok: true,
    applied: false,
    cutoff: CLASSIFICATION_STALE_ATTEMPT_REPAIR.cutoff,
    candidates: candidates.length,
    requeued: 0,
    containsPii: false,
  };
  if (!apply || candidates.length === 0) return result;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("classification_attempt_cycle_repair_lock_timeout");
  }
  try {
    const currentValues = queueSheet.getDataRange().getValues();
    const currentCandidates = staleAttemptCycleRepairCandidates_(
      currentValues,
      CLASSIFICATION_STALE_ATTEMPT_REPAIR.cutoff,
    );
    currentCandidates.forEach(function requeueClassificationCycle(candidate) {
      queueSheet.getRange(candidate.rowNumber, 4, 1, 3).setValues([[
        new Date(),
        "pending",
        "",
      ]]);
      resetClassificationAttemptCycle_(queueSheet, candidate.rowNumber);
      result.requeued += 1;
    });
    SpreadsheetApp.flush();
    result.applied = true;
    result.candidates = currentCandidates.length;
    return result;
  } finally {
    lock.releaseLock();
  }
}

function diagnosticarReaberturaCicloClassificacaoComNovaAtividade() {
  const result = reconcileStaleClassificationAttemptCycles_({ apply: false });
  console.log(JSON.stringify(result));
  return result;
}

function aplicarReaberturaCicloClassificacaoComNovaAtividadeConfirmada() {
  const result = reconcileStaleClassificationAttemptCycles_({
    apply: true,
    confirmation: CLASSIFICATION_STALE_ATTEMPT_REPAIR.confirmation,
  });
  console.log(JSON.stringify(result));
  return result;
}

function classificationRecoveryCandidates20260918_(queueRows, opportunityRows) {
  const opportunities = {};
  (opportunityRows || []).slice(1).forEach(function (row) {
    if (row[0]) (opportunities[row[0]] || (opportunities[row[0]] = [])).push(row);
  });
  return (queueRows || []).slice(1).reduce(function (selected, row, index) {
    const activity = parseClassificationDate_(row[2]), classified = parseClassificationDate_(row[6]);
    const matches = opportunities[row[16]] || [];
    const opportunity = matches[0];
    if (String(row[4]) !== "dead_letter" || Number(row[14]) !== 8 ||
      String(row[13]) !== "max_attempts_exceeded:reaper_requeued:expired_lease" ||
      !activity || !classified || activity <= classified ||
      activity < new Date("2026-09-15T00:00:00-03:00") || activity > new Date("2026-09-16T23:59:59-03:00") ||
      !row[8] || !row[16] || row[17] !== "amanda" || matches.length !== 1 ||
      opportunity[6] !== "open" || opportunity[3] !== row[17] ||
      normalizePhone_(opportunity[1]) !== normalizePhone_(row[0])) return selected;
    selected.push({ row: index + 2, opportunityVersion: Number(opportunity[22] || 0) });
    return selected;
  }, []);
}

function recuperarClassificacoesExpiradas20260918_(apply) {
  const props = PropertiesService.getScriptProperties();
  const key = "BRUNA_CLASSIFICATION_RECOVERY_20260918";
  if (props.getProperty(key)) return { ok: true, alreadyApplied: true, requeued: 0 };
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queue = spreadsheet.getSheetByName(CONFIG.classificationSheetName);
  const crm = spreadsheet.getSheetByName("_CRM_OPORTUNIDADES");
  if (!queue || !crm) throw new Error("recovery_source_missing");
  const candidates = classificationRecoveryCandidates20260918_(queue.getDataRange().getValues(), crm.getDataRange().getValues());
  if (candidates.length > 4) throw new Error("recovery_scope_changed");
  const result = { ok: true, candidates: candidates.length, requeued: 0, applied: apply === true };
  if (!apply) return result;
  candidates.forEach(function (item) {
    const fields = queue.getRange(item.row, 4, 1, 13).getValues()[0];
    fields[0] = new Date(); fields[1] = "pending"; fields[2] = "";
    fields[10] = "operator_requeued:2026-09-18"; fields[11] = 0; fields[12] = "";
    queue.getRange(item.row, 4, 1, 13).setValues([fields]);
    result.requeued += 1;
  });
  SpreadsheetApp.flush();
  props.setProperty(key, JSON.stringify({ at: new Date().toISOString(), requeued: result.requeued }));
  return result;
}

function diagnosticarClassificacoesExpiradas20260918() {
  const result = recuperarClassificacoesExpiradas20260918_(false);
  console.log(JSON.stringify(result));
  return result;
}

function aplicarRecuperacaoClassificacoesExpiradas20260918() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("busy_retry");
  try {
    const result = recuperarClassificacoesExpiradas20260918_(true);
    console.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}
