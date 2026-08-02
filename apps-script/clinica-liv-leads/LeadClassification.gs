const LEAD_MESSAGE_HEADERS = Object.freeze([
  "Telefone",
  "Direção",
  "Data e hora",
  "Message ID",
  "Event ID",
  "Texto",
  "Linha do lead",
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
]);

function getOrCreateLeadAuxiliarySheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
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

function hasMessageInSheet_(sheet, messageId) {
  if (!messageId || !sheet || sheet.getLastRow() < 2) return false;
  return Boolean(
    sheet
      .getRange(2, 4, sheet.getLastRow() - 1, 1)
      .createTextFinder(String(messageId))
      .matchEntireCell(true)
      .findNext(),
  );
}

function recordLeadMessageAndQueue_(spreadsheet, leadRow, lead, direction) {
  const phone = normalizePhone_(lead.phone);
  const messageId = safeText_(lead.messageId || lead.eventId, 500);
  const eventId = safeText_(lead.eventId || messageId, 200);
  const at = lead.contactAt instanceof Date
    ? lead.contactAt
    : new Date(lead.contactAt || Date.now());

  if (!phone || !messageId || Number.isNaN(at.getTime())) return;

  const messageSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.messageSheetName,
    LEAD_MESSAGE_HEADERS,
  );

  if (!hasMessageInSheet_(messageSheet, messageId)) {
    messageSheet.appendRow([
      phone,
      direction === "OUT" ? "OUT" : "IN",
      at,
      messageId,
      eventId,
      safeText_(lead.text, 4000),
      leadRow,
    ]);
  }

  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const queueRow = findPhoneRowInSheet_(queueSheet, phone);
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
    ]);
    return;
  }

  const current = queueSheet
    .getRange(queueRow, 1, 1, LEAD_CLASSIFICATION_HEADERS.length)
    .getValues()[0];
  const messageCount = Number(current[9] || 0) + 1;

  queueSheet.getRange(queueRow, 2, 1, 5).setValues([[
    leadRow,
    at,
    dueAt,
    "pending",
    "",
  ]]);
  queueSheet.getRange(queueRow, 9, 1, 2).setValues([[
    messageId,
    messageCount,
  ]]);
  queueSheet.getRange(queueRow, 14).setValue("");
}

function parseClassificationDate_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function claimDueLeadClassifications_(requestedLimit) {
  const limit = Math.min(Math.max(Number(requestedLimit) || 5, 1), 20);
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
  const leadsSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 10 * 60 * 1000);
  const jobs = [];

  if (!leadsSheet || queueSheet.getLastRow() < 2) return { jobs };
  const queueValues = queueSheet
    .getRange(2, 1, queueSheet.getLastRow() - 1, 15)
    .getValues();

  for (let index = 0; index < queueValues.length; index += 1) {
    if (jobs.length >= limit) break;
    const row = queueValues[index];
    const state = String(row[4] || "pending");
    const dueAt = parseClassificationDate_(row[3]);
    const currentLease = parseClassificationDate_(row[5]);
    const eligibleState = state === "pending" || state === "failed" ||
      (state === "running" && (!currentLease || currentLease <= now));

    if (!eligibleState || (dueAt && dueAt > now)) continue;

    const phone = normalizePhone_(row[0]);
    const leadRow = findLeadRowByPhone_(leadsSheet, phone);

    if (!leadRow) {
      queueSheet.getRange(index + 2, 5).setValue("orphaned");
      continue;
    }

    const leadValues = leadsSheet
      .getRange(leadRow, 1, 1, CONFIG.totalColumns)
      .getDisplayValues()[0];
    const messages = collectLeadMessages_(messageSheet, phone, 12);

    if (!messages.length) {
      queueSheet.getRange(index + 2, 5).setValue("waiting_messages");
      continue;
    }

    const throughMessageId = String(row[8] || messages[messages.length - 1].messageId || "");
    const attempts = Number(row[14] || 0) + 1;
    queueSheet.getRange(index + 2, 2).setValue(leadRow);
    queueSheet.getRange(index + 2, 5, 1, 2).setValues([["running", leaseUntil]]);
    queueSheet.getRange(index + 2, 15).setValue(attempts);

    jobs.push({
      phone,
      leadRow,
      throughMessageId,
      currentStatus: String(leadValues[4] || "Novo"),
      currentSummary: String(leadValues[16] || ""),
      currentNextAction: String(leadValues[17] || ""),
      messages,
    });
  }

  return { jobs };
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

function shouldApplyLeadStatus_(currentStatus, proposedStatus, confidence) {
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

function googleConversionTransactionId_(values, phone, date) {
  const reference = String(values[1] || "GOOGLE")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 30) || "GOOGLE";
  return [
    "WA",
    Utilities.formatDate(date, CONFIG.timezone, "yyyyMMdd"),
    reference,
    String(phone || "").replace(/\D/g, "").slice(-4),
  ].join("-");
}

function ensureQualifiedGoogleConversion_(sheet, row, phone, conversionAt) {
  const values = sheet
    .getRange(row, 1, 1, CONFIG.totalColumns)
    .getDisplayValues()[0];
  const gclid = String(values[10] || "").trim();

  if (!gclid) return false;

  const conversionDate = conversionAt instanceof Date
    ? conversionAt
    : new Date();
  const transactionId = googleConversionTransactionId_(
    values,
    phone,
    conversionDate,
  );

  sheet.getRange(row, 7, 1, 3).setValues([[
    "Sim",
    "Lead qualificado",
    0,
  ]]);
  sheet.getRange(row, 14, 1, 3).setValues([[
    values[13] || googleConversionTimestamp_(conversionDate),
    values[14] && !/^wamid\./i.test(values[14])
      ? values[14]
      : transactionId,
    "BRL",
  ]]);
  return true;
}

function completeLeadClassification_(job, classification) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  const leadsSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  const phone = normalizePhone_(job.phone);
  const queueRow = findPhoneRowInSheet_(queueSheet, phone);
  const leadRow = leadsSheet ? findLeadRowByPhone_(leadsSheet, phone) : null;

  if (!queueRow || !leadRow) {
    return { status: "ignored", error: "lead_not_found" };
  }

  const currentValues = leadsSheet
    .getRange(leadRow, 1, 1, CONFIG.totalColumns)
    .getDisplayValues()[0];
  const currentStatus = String(currentValues[4] || "Novo");
  const proposedStatus = String(classification.recommendedStatus || currentStatus);
  const confidence = String(classification.confidence || "low");
  const now = new Date();
  const statusToKeep = shouldApplyLeadStatus_(
    currentStatus,
    proposedStatus,
    confidence,
  ) ? proposedStatus : currentStatus;

  if (statusToKeep !== currentStatus) {
    leadsSheet.getRange(leadRow, 5, 1, 2).setValues([[
      statusToKeep,
      Utilities.formatDate(now, CONFIG.timezone, "dd/MM/yyyy"),
    ]]);
  }

  if (leadStatusRank_(statusToKeep) >= leadStatusRank_("Qualificado")) {
    ensureQualifiedGoogleConversion_(leadsSheet, leadRow, phone, now);
  }

  if (classification.summary) {
    leadsSheet.getRange(leadRow, 17).setValue(
      safeText_(classification.summary, 600),
    );
  }
  if (classification.nextAction) {
    leadsSheet.getRange(leadRow, 18).setValue(
      safeText_(classification.nextAction, 300),
    );
  }

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

  SpreadsheetApp.flush();
  return {
    status: "completed",
    leadRow,
    appliedStatus: statusToKeep,
    googleConversionReady:
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
  const queueRow = findPhoneRowInSheet_(queueSheet, job.phone);

  if (!queueRow) return { status: "ignored" };

  const attempts = Number(queueSheet.getRange(queueRow, 15).getValue() || 1);
  const retryMinutes = Math.min(Math.max(attempts, 1) * 15, 180);
  queueSheet.getRange(queueRow, 4, 1, 3).setValues([[
    new Date(Date.now() + retryMinutes * 60 * 1000),
    "failed",
    "",
  ]]);
  queueSheet.getRange(queueRow, 14).setValue(
    safeText_(job.errorCode || "classification_failed", 120),
  );
  return { status: "failed", retryMinutes };
}
