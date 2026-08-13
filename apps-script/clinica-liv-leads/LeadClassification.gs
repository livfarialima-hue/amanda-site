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

function prepararFonteGoogleAdsPrimeiraAba() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const target = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.googleAdsImportSheetName,
    GOOGLE_ADS_IMPORT_HEADERS,
  );
  const legacy = spreadsheet.getSheetByName("IMPORT_GCLID");
  let migrated = 0;

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

function leadOpportunityId_(leadValues, phone) {
  const contactDate = String(leadValues && leadValues[0] || "");
  const reference = String(leadValues && leadValues[1] || "");
  return "opp_" + stableLeadHash_([
    normalizePhone_(phone),
    contactDate,
    reference,
  ].join("|"));
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
    stableLeadHash_(normalizePhone_(event.phone)),
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
  if (findGoogleAdsEventRow_(sheet, transactionId)) return false;

  sheet.appendRow([
    transactionId,
    details.identifierType === "GCLID" ? details.clickId : "",
    details.identifierType === "GBRAID" ? details.clickId : "",
    details.identifierType === "WBRAID" ? details.clickId : "",
    details.conversionName,
    details.conversionTimestamp,
    details.value,
    details.currency,
  ]);
  return true;
}

function enqueueGoogleAdsMilestone_(spreadsheet, details) {
  const sheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.googleAdsEventSheetName,
    GOOGLE_ADS_EVENT_HEADERS,
  );
  const eventId = String(details.eventId || "");
  const existingRow = findGoogleAdsEventRow_(sheet, eventId);
  ensureGoogleAdsImportRow_(spreadsheet, details);
  if (existingRow) return { created: false, row: existingRow };

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
    "ready",
    "",
    now,
    now,
    details.professional || "amanda",
  ]);
  return { created: true, row: sheet.getLastRow() };
}

function invalidarConversoesGoogleAdsOportunidade_(spreadsheet, opportunityId) {
  if (!opportunityId) return 0;
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
  let invalidated = 0;
  values.forEach(function invalidateEvent(row, index) {
    if (String(row[1] || "") !== String(opportunityId)) return;
    if (row[9]) transactions[String(row[9])] = true;
    eventSheet.getRange(index + 2, 11, 1, 4).setValues([[
      "invalidated_nonlead",
      "Contato excluído das bases de leads",
      row[12] || new Date(),
      new Date(),
    ]]);
    invalidated += 1;
  });
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
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (opportunityId && String(row[16] || "") === String(opportunityId)) {
      return index + 2;
    }
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

function recordLeadMessageOnly_(spreadsheet, leadRow, lead, direction) {
  const phone = normalizePhone_(lead.phone);
  const messageId = safeText_(lead.messageId || lead.eventId, 500);
  const eventId = safeText_(lead.eventId || messageId, 200);
  const at = lead.contactAt instanceof Date
    ? lead.contactAt
    : new Date(lead.contactAt || Date.now());

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

  return {
    phone: phone,
    messageId: messageId,
    at: at,
  };
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
  queueSheet.getRange(queueRow, 16).setValue("");
  queueSheet.getRange(queueRow, 17, 1, 3).setValues([[
    safeText_(lead.opportunityId, 120),
    safeText_(lead.professional, 80),
    safeText_(lead.leadSheetName, 120),
  ]]);
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
) {
  if (!messageSheet || messageSheet.getLastRow() < 2) return [];
  const values = messageSheet
    .getRange(2, 1, messageSheet.getLastRow() - 1, LEAD_MESSAGE_HEADERS.length)
    .getValues();
  const normalizedPhone = normalizePhone_(phone);
  const normalizedProfessional = String(professional || "");
  const matching = values.filter(function matchMessage(row) {
    if (opportunityId && String(row[7] || "") === String(opportunityId)) {
      return true;
    }
    return (
      !row[7] &&
      normalizePhone_(row[0]) === normalizedPhone &&
      (!row[8] || String(row[8]) === normalizedProfessional)
    );
  });
  return matching.slice(-Math.max(1, Number(limit) || 12)).map(function (row) {
    return {
      direction: String(row[1] || "IN"),
      at: row[2] instanceof Date ? row[2].toISOString() : String(row[2] || ""),
      messageId: String(row[3] || ""),
      text: String(row[5] || ""),
    };
  });
}

function relationshipFromCanonicalLeadStatus_(status) {
  const states = {
    "Consulta agendada": "appointment_scheduled",
    "Consulta realizada": "consultation_completed",
    "Paciente convertido": "converted",
  };
  return {
    found: Boolean(states[String(status || "")]),
    relationshipState: states[String(status || "")] || "unknown",
  };
}

function claimDueLeadClassifications_(requestedLimit) {
  const limit = Math.min(Math.max(Number(requestedLimit) || 5, 1), 20);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
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
  if (queueSheet.getLastRow() < 2) return { jobs };
  const queueValues = queueSheet
    .getRange(
      2,
      1,
      queueSheet.getLastRow() - 1,
      LEAD_CLASSIFICATION_HEADERS.length,
    )
    .getValues();
  const queueUpdates = [];

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
    const leaseToken = Utilities.getUuid();
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

  return { jobs };
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
      const messages = collectLeadMessagesForOpportunity_(
        messageSheet,
        opportunityId,
        phone,
        professional,
        24,
      );
      if (!messages.length) {
        return Object.assign(base, { errorCode: "waiting_messages" });
      }
      const relationship = relationshipFromCanonicalLeadStatus_(
        currentStatus,
      );
      return Object.assign(base, {
        leadRow,
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

function googleConversionTransactionId_(opportunityId, milestone) {
  return "LIV-" + stableLeadHash_([
    opportunityId,
    milestone,
  ].join("|"));
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
  const identifier = clickIdentifiers.find(function hasValue(item) {
    return Boolean(item.value);
  });

  if (!identifier) return false;

  const conversionDate = conversionAt instanceof Date
    ? conversionAt
    : new Date();
  const opportunityId = String(details && details.opportunityId || "") ||
    leadOpportunityId_(values, phone);
  const milestone = "qualified_lead";
  const existingTransactionId = String(values[14] || "").trim();
  const transactionId = String(values[6] || "") === "Sim" &&
    existingTransactionId
    ? existingTransactionId
    : googleConversionTransactionId_(opportunityId, milestone);
  const conversionTimestamp = values[13] ||
    googleConversionTimestamp_(conversionDate);

  sheet.getRange(row, 7, 1, 3).setValues([[
    "Sim",
    CONFIG.qualifiedConversionName,
    1,
  ]]);
  sheet.getRange(row, 14, 1, 3).setValues([[
    conversionTimestamp,
    transactionId,
    "BRL",
  ]]);

  if (typeof sheet.getParent === "function") {
    enqueueGoogleAdsMilestone_(sheet.getParent(), {
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
    });
  }
  return true;
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
  );
  const leadRow = leadsSheet
    ? localizarLeadPorOportunidadeOuTelefone_(
        leadsSheet,
        opportunityId,
        phone,
      )
    : null;

  if (!queueRow || !leadRow) {
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
  const proposedStatus = String(classification.recommendedStatus || currentStatus);
  const confidence = String(classification.confidence || "low");
  const now = new Date();
  const statusToKeep = shouldApplyLeadStatus_(
    currentStatus,
    proposedStatus,
    confidence,
  ) ? proposedStatus : currentStatus;
  const needsClassificationReview =
    confidence === "low" ||
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

  if (statusToKeep !== currentStatus) {
    leadsSheet.getRange(leadRow, statusColumn).setValue(statusToKeep);
    leadsSheet.getRange(leadRow, statusDateColumn).setValue(
      Utilities.formatDate(now, CONFIG.timezone, "dd/MM/yyyy"),
    );
  }

  if (
    professional === "amanda" &&
    leadStatusRank_(statusToKeep) >= leadStatusRank_("Qualificado")
  ) {
    ensureQualifiedGoogleConversion_(leadsSheet, leadRow, phone, now, {
      opportunityId: canonicalOpportunityId,
      professional,
    });
  }

  const integrationColumns = garantirEstruturaIntegradaLead_(leadsSheet);
  const automaticValues = {
    "Resumo automático": safeText_(classification.summary, 600),
    "Próxima ação automática": safeText_(classification.nextAction, 300),
    "Objeção principal": safeText_(classification.commercialReason, 80),
    "Relacionamento": String(
      job.patientRelationship && job.patientRelationship.relationshipState ||
      "unknown",
    ),
    "Responsável atual": "bruna",
    "Aguardando ação de": /aguardar retorno/i.test(
      String(classification.nextAction || ""),
    ) ? "patient" : "clinic",
  };
  Object.keys(automaticValues).forEach(function writeAutomatic(header) {
    if (!integrationColumns[header]) return;
    leadsSheet
      .getRange(leadRow, integrationColumns[header])
      .setValue(automaticValues[header]);
  });
  if (integrationColumns["Versão da oportunidade"]) {
    leadsSheet
      .getRange(leadRow, integrationColumns["Versão da oportunidade"])
      .setValue(currentVersion + 1);
  }

  recordLeadStageEvent_(spreadsheet, {
    opportunityId: canonicalOpportunityId,
    phone,
    source: "whatsapp_classifier",
    fromStatus: currentStatus,
    proposedStatus,
    appliedStatus: statusToKeep,
    confidence,
    throughMessageId: job.throughMessageId,
    decision: statusToKeep !== currentStatus
      ? "applied"
      : needsClassificationReview
        ? "review_required"
        : "no_change",
    evidence: classification.evidence,
    professional,
    at: now,
  });

  if (typeof atualizarOportunidadeClassificada_ === "function") {
    atualizarOportunidadeClassificada_(spreadsheet, {
      opportunityId: canonicalOpportunityId,
      stage: statusToKeep,
      relationship: automaticValues["Relacionamento"],
      owner: automaticValues["Responsável atual"],
      expectedParty: automaticValues["Aguardando ação de"],
      objection: automaticValues["Objeção principal"],
      summary: automaticValues["Resumo automático"],
      nextAction: automaticValues["Próxima ação automática"],
    });
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
      ].join("\n"),
      suggestion: [
        "Status sugerido: " + proposedStatus,
        "Próxima ação: " + String(classification.nextAction || ""),
      ].join("\n"),
    });
  }

  SpreadsheetApp.flush();
  return {
    status: "completed",
    leadRow,
    appliedStatus: statusToKeep,
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
  );

  if (!queueRow) return { status: "ignored" };

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

function repararFilaClassificacaoTravada() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const queueSheet = getOrCreateLeadAuxiliarySheet_(
    spreadsheet,
    CONFIG.classificationSheetName,
    LEAD_CLASSIFICATION_HEADERS,
  );
  if (queueSheet.getLastRow() < 2) return { repaired: 0 };
  const now = new Date();
  const values = queueSheet
    .getRange(2, 1, queueSheet.getLastRow() - 1, LEAD_CLASSIFICATION_HEADERS.length)
    .getValues();
  let repaired = 0;
  values.forEach(function repairQueueRow(row, index) {
    const state = String(row[4] || "");
    const lease = parseClassificationDate_(row[5]);
    if (state === "running" && (!lease || lease <= now)) {
      queueSheet.getRange(index + 2, 4, 1, 3).setValues([[
        now,
        "pending",
        "",
      ]]);
      queueSheet.getRange(index + 2, 14, 1, 3).setValues([[
        "lease_expirada_reparada_2026-08-12",
        0,
        "",
      ]]);
      repaired += 1;
      return;
    }
    if (
      ["failed", "dead_letter"].includes(state) &&
      /^(?:complete_|hydrate_|lead_not_found|stale_lease)/.test(
        String(row[13] || ""),
      )
    ) {
      queueSheet.getRange(index + 2, 4, 1, 3).setValues([[
        now,
        "pending",
        "",
      ]]);
      queueSheet.getRange(index + 2, 14, 1, 3).setValues([[
        "reprocessamento_pos_correcao_2026-08-12",
        0,
        "",
      ]]);
      repaired += 1;
    }
  });
  SpreadsheetApp.flush();
  return { repaired: repaired };
}
