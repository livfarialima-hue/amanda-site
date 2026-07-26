const CONFIG = Object.freeze({
  spreadsheetId: "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Google Ads - Conversões",
  secretProperty: "LEADS_INGEST_SECRET",
  eventSheetName: "_WHATSAPP_EVENTOS",
  timezone: "America/Sao_Paulo",
  totalColumns: 27,
  leadWindowHours: 24,
});

const EXPECTED_HEADERS = Object.freeze([
  "Data do contato",
  "Referência da campanha",
  "Telefone (E.164)",
  "E-mail",
  "Situação do lead",
  "Data da situação",
  "Enviar ao Google Ads?",
  "Nome da conversão",
  "Valor (R$)",
  "Consentimento para medição",
  "GCLID",
  "GBRAID",
  "WBRAID",
  "Data e hora da conversão",
  "ID da transação",
  "Moeda",
  "Observação administrativa",
  "Planejamento Individual",
  "Consentimento para medição",
  "Observação administrativa",
  "Origem do evento",
  "Plataforma de aquisição",
  "Campanha",
  "Criativo",
  "CTA",
  "Destino",
  "Referência completa",
]);

function doGet() {
  return json_({
    ok: true,
    service: "clinica-liv-leads",
    leadWindowHours: CONFIG.leadWindowHours,
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let stage = "parse_body";

  try {
    const body = parseBody_(e);
    const expectedSecret = PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.secretProperty);

    if (!expectedSecret || body.secret !== expectedSecret) {
      return json_({ ok: false, error: "unauthorized" });
    }

    if (body.action !== "append_lead") {
      return json_({ ok: false, error: "unsupported_action" });
    }

    stage = "normalize_lead";
    const lead = normalizeLead_(body.lead || {});

    stage = "acquire_lock";

    if (!lock.tryLock(5000)) {
      return json_({ ok: false, error: "busy_retry" });
    }

    stage = "open_spreadsheet";
    const spreadsheet = SpreadsheetApp.openById(
      CONFIG.spreadsheetId,
    );

    stage = "find_sheet";
    const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

    if (!sheet) {
      throw new Error("Aba configurada não encontrada.");
    }

    stage = "assert_headers";
    assertHeaders_(sheet);

    stage = "event_sheet";
    const eventSheet = getOrCreateEventSheet_(spreadsheet);

    stage = "duplicate_check";
    const processedEvent = findProcessedEvent_(
      eventSheet,
      [lead.messageId, lead.eventId],
    );

    if (processedEvent) {
      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "message_id",
        row: processedEvent.leadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
      });
    }

    const legacyDuplicateRow = findExactDuplicateRow_(
      sheet,
      [lead.messageId, lead.eventId],
    );

    if (legacyDuplicateRow) {
      stage = "record_event";
      recordProcessedEvent_(
        eventSheet,
        lead,
        legacyDuplicateRow,
        "message_id_backfill",
      );

      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "message_id",
        row: legacyDuplicateRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
      });
    }

    stage = "phone_window_check";
    const existingLeadRow = findRecentLeadRow_(
      sheet,
      lead.phone,
      lead.contactAt,
    );

    if (existingLeadRow) {
      stage = "record_event";
      recordProcessedEvent_(
        eventSheet,
        lead,
        existingLeadRow,
        "phone_window",
      );

      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "phone_window",
        row: existingLeadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
      });
    }

    stage = "find_row";
    const row = findFirstAvailableRow_(sheet);

    writeLead_(sheet, row, lead, function setStage(nextStage) {
      stage = nextStage;
    });

    stage = "record_event";
    recordProcessedEvent_(
      eventSheet,
      lead,
      row,
      "inserted",
    );

    return json_({
      ok: true,
      inserted: true,
      duplicate: false,
      duplicateReason: null,
      row,
      eventId: lead.eventId,
      messageId: lead.messageId,
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);

    const allowedStages = new Set([
      "parse_body",
      "normalize_lead",
      "acquire_lock",
      "open_spreadsheet",
      "find_sheet",
      "assert_headers",
      "event_sheet",
      "duplicate_check",
      "phone_window_check",
      "find_row",
      "write_identity",
      "write_contact",
      "write_status",
      "write_primary_consent",
      "write_click_id",
      "write_secondary_consent",
      "write_origin",
      "write_destination",
      "flush",
      "record_event",
    ]);

    const safeStage = allowedStages.has(stage) ? stage : "unknown";

    return json_({
      ok: false,
      error: `internal_error_${safeStage}`,
    });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Corpo da solicitação ausente.");
  }

  return JSON.parse(e.postData.contents);
}

function normalizeLead_(input) {
  const eventId = safeText_(input.eventId, 200);
  const messageId = safeText_(input.messageId || eventId, 500);
  const phone = normalizePhone_(input.phone);
  const contactAt = new Date(input.contactAt || Date.now());

  if (!eventId) {
    throw new Error("Event ID ausente.");
  }

  if (!messageId) {
    throw new Error("Message ID ausente.");
  }

  if (!phone) {
    throw new Error("Telefone ausente.");
  }

  if (Number.isNaN(contactAt.getTime())) {
    throw new Error("Data do contato inválida.");
  }

  const allowedPlatforms = new Set([
    "Google",
    "Meta",
    "Orgânico/Conteúdo",
    "WhatsApp direto",
    "Não identificada",
  ]);

  const platform = allowedPlatforms.has(input.platform)
    ? input.platform
    : "Não identificada";

  const gclid = safeText_(input.gclid, 500);
  const gbraid = gclid ? "" : safeText_(input.gbraid, 500);
  const wbraid = gclid || gbraid
    ? ""
    : safeText_(input.wbraid, 500);

  return {
    eventId,
    messageId,
    phone,
    contactAt,
    reference: safeText_(
      input.reference || "Não informada",
      200,
    ),
    platform,
    gclid,
    gbraid,
    wbraid,
  };
}

function normalizePhone_(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function safeText_(value, maximumLength) {
  const text = String(value || "")
    .trim()
    .slice(0, maximumLength);

  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function assertHeaders_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, CONFIG.totalColumns)
    .getDisplayValues()[0];

  for (
    let index = 0;
    index < EXPECTED_HEADERS.length;
    index += 1
  ) {
    if (headers[index] !== EXPECTED_HEADERS[index]) {
      throw new Error(
        `Estrutura inesperada na coluna ${index + 1}: ` +
          `${headers[index]}`,
      );
    }
  }
}

function getOrCreateEventSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);

  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(CONFIG.eventSheetName);
  sheet.getRange(1, 1, 1, 6).setValues([[
    "Message ID",
    "Event ID",
    "Telefone",
    "Data do evento",
    "Linha do lead",
    "Resultado",
  ]]);
  sheet.setFrozenRows(1);
  sheet.hideSheet();

  return sheet;
}

function findProcessedEvent_(sheet, identifiers) {
  const uniqueIdentifiers = Array.from(
    new Set(
      identifiers
        .map(function normalizeIdentifier(value) {
          return String(value || "").trim();
        })
        .filter(Boolean),
    ),
  );

  if (!uniqueIdentifiers.length || sheet.getLastRow() < 2) {
    return null;
  }

  const range = sheet.getRange(
    2,
    1,
    sheet.getLastRow() - 1,
    2,
  );

  for (let index = 0; index < uniqueIdentifiers.length; index += 1) {
    const match = range
      .createTextFinder(uniqueIdentifiers[index])
      .matchEntireCell(true)
      .findNext();

    if (!match) continue;

    const leadRow = Number(
      sheet.getRange(match.getRow(), 5).getValue(),
    );

    return {
      eventRow: match.getRow(),
      leadRow: Number.isFinite(leadRow) && leadRow > 0
        ? leadRow
        : null,
    };
  }

  return null;
}

function recordProcessedEvent_(
  sheet,
  lead,
  leadRow,
  result,
) {
  const processedAt = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm:ss",
  );

  sheet.appendRow([
    lead.messageId,
    lead.eventId,
    lead.phone,
    processedAt,
    leadRow,
    result,
  ]);
}

function findExactDuplicateRow_(sheet, identifiers) {
  const uniqueIdentifiers = Array.from(
    new Set(
      identifiers
        .map(function normalizeIdentifier(value) {
          return String(value || "").trim();
        })
        .filter(Boolean),
    ),
  );

  if (!uniqueIdentifiers.length) return null;

  const range = sheet.getRange(
    2,
    15,
    Math.max(sheet.getMaxRows() - 1, 1),
    1,
  );

  for (let index = 0; index < uniqueIdentifiers.length; index += 1) {
    const match = range
      .createTextFinder(uniqueIdentifiers[index])
      .matchEntireCell(true)
      .findNext();

    if (match) return match.getRow();
  }

  return null;
}

function findRecentLeadRow_(sheet, phone, contactAt) {
  const lastRow = Math.max(sheet.getLastRow(), 2);

  if (lastRow < 2) return null;

  const values = sheet
    .getRange(2, 1, lastRow - 1, 3)
    .getDisplayValues();

  const normalizedPhone = normalizePhone_(phone);
  const windowMilliseconds =
    CONFIG.leadWindowHours * 60 * 60 * 1000;
  let bestRow = null;
  let smallestDifference = Number.POSITIVE_INFINITY;

  for (let index = 0; index < values.length; index += 1) {
    const rowPhone = normalizePhone_(values[index][2]);

    if (!rowPhone || rowPhone !== normalizedPhone) continue;

    const rowDate = parseSheetContactDate_(values[index][0]);

    if (!rowDate) continue;

    const difference = Math.abs(
      contactAt.getTime() - rowDate.getTime(),
    );

    if (
      difference <= windowMilliseconds &&
      difference < smallestDifference
    ) {
      bestRow = index + 2;
      smallestDifference = difference;
    }
  }

  return bestRow;
}

function parseSheetContactDate_(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/,
  );

  if (!match) return null;

  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0,
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function findFirstAvailableRow_(sheet) {
  const maximumRows = sheet.getMaxRows();
  const values = sheet
    .getRange(2, 1, maximumRows - 1, 1)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (!String(values[index][0] || "").trim()) {
      return index + 2;
    }
  }

  sheet.insertRowsAfter(maximumRows, 100);
  return maximumRows + 1;
}

function writeLead_(sheet, row, lead, setStage) {
  const contactDateTime = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm",
  );

  const statusDate = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy",
  );

  // Persist the stable WhatsApp message ID first. If a later write
  // fails and YCloud retries, the same message is not appended again.
  setStage("write_identity");
  sheet.getRange(row, 15, 1, 3).setValues([[
    lead.messageId,
    "BRL",
    "Contato inicial recebido automaticamente pelo WhatsApp.",
  ]]);

  setStage("write_contact");
  sheet.getRange(row, 1, 1, 3).setValues([[
    contactDateTime,
    lead.reference,
    lead.phone,
  ]]);

  setStage("write_status");
  sheet.getRange(row, 5, 1, 3).setValues([[
    "Novo",
    statusDate,
    "Não",
  ]]);

  setStage("write_primary_consent");
  sheet.getRange(row, 10).setValue("Não informado");

  setStage("write_click_id");

  if (lead.gclid) {
    sheet.getRange(row, 11).setValue(lead.gclid);
  } else if (lead.gbraid) {
    sheet.getRange(row, 12).setValue(lead.gbraid);
  } else if (lead.wbraid) {
    sheet.getRange(row, 13).setValue(lead.wbraid);
  }

  setStage("write_secondary_consent");
  sheet.getRange(row, 19).setValue("Não informado");

  setStage("write_origin");
  sheet.getRange(row, 21, 1, 2).setValues([[
    "WHATSAPP",
    lead.platform,
  ]]);

  setStage("write_destination");
  sheet.getRange(row, 26, 1, 2).setValues([[
    "WhatsApp",
    lead.reference,
  ]]);

  setStage("flush");
  SpreadsheetApp.flush();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
