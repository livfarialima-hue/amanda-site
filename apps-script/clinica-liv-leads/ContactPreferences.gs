const CONTACT_PREFERENCES_CONFIG = Object.freeze({
  sheetName: "Google Ads - Conversões",
  phoneHeader: "Telefone (E.164)",
  neverFollowUpHeader: "Nunca retomar",
  neverBotReplyHeader: "Nunca responder com robô",
  suspendAutomaticFollowUpHeader: "Suspender retomada automática",
  reasonHeader: "Motivo / observação do bloqueio",
});

/**
 * Prepara os controles manuais sem alterar as 25 colunas usadas pela
 * ingestão e pelo Google Ads. As preferências ficam sempre depois do
 * esquema operacional existente.
 */
function garantirPreferenciasContatoLeads() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    throw new Error("A aba de leads não foi encontrada.");
  }

  return garantirEstruturaPreferenciasContato_(sheet);
}

function garantirEstruturaPreferenciasContato_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });
  const requiredHeaders = [
    CONTACT_PREFERENCES_CONFIG.neverFollowUpHeader,
    CONTACT_PREFERENCES_CONFIG.neverBotReplyHeader,
    CONTACT_PREFERENCES_CONFIG.suspendAutomaticFollowUpHeader,
    CONTACT_PREFERENCES_CONFIG.reasonHeader,
  ];

  requiredHeaders.forEach(function (header) {
    if (indiceCabecalhoPreferenciaContato_(headers, header) >= 0) {
      return;
    }

    headers.push(header);
    sheet.getRange(1, headers.length).setValue(header);
  });

  const neverFollowUpColumn =
    indiceCabecalhoPreferenciaContato_(
      headers,
      CONTACT_PREFERENCES_CONFIG.neverFollowUpHeader,
    ) + 1;
  const neverBotReplyColumn =
    indiceCabecalhoPreferenciaContato_(
      headers,
      CONTACT_PREFERENCES_CONFIG.neverBotReplyHeader,
    ) + 1;
  const suspendAutomaticFollowUpColumn =
    indiceCabecalhoPreferenciaContato_(
      headers,
      CONTACT_PREFERENCES_CONFIG.suspendAutomaticFollowUpHeader,
    ) + 1;
  const reasonColumn =
    indiceCabecalhoPreferenciaContato_(
      headers,
      CONTACT_PREFERENCES_CONFIG.reasonHeader,
    ) + 1;
  const availableRows = Math.max(sheet.getMaxRows() - 1, 1);
  const checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();

  sheet
    .getRange(2, neverFollowUpColumn, availableRows, 1)
    .setDataValidation(checkboxRule);
  sheet
    .getRange(2, neverBotReplyColumn, availableRows, 1)
    .setDataValidation(checkboxRule);
  sheet
    .getRange(2, suspendAutomaticFollowUpColumn, availableRows, 1)
    .setDataValidation(checkboxRule);
  sheet
    .getRange(1, neverFollowUpColumn)
    .setNote(
      "Marque para impedir retomadas comerciais, aniversários, contatos de pacientes antigos e demais contatos proativos. Uma nova mensagem da própria pessoa ainda pode ser respondida.",
    );
  sheet
    .getRange(1, neverBotReplyColumn)
    .setNote(
      "Marque para impedir qualquer mensagem automática ao paciente, inclusive respostas, lembretes e acompanhamentos. O sistema pode continuar emitindo alerta interno para resposta humana.",
    );
  sheet
    .getRange(1, suspendAutomaticFollowUpColumn)
    .setNote(
      "Marque para suspender apenas a primeira retomada automática programada. Respostas normais do bot, lembretes de consulta e ações humanas não são bloqueados por este campo.",
    );
  sheet
    .getRange(1, reasonColumn)
    .setNote(
      "Campo administrativo opcional. Não é enviado ao paciente nem incluído nas instruções da IA.",
    );

  return {
    ok: true,
    neverFollowUpColumn: neverFollowUpColumn,
    neverBotReplyColumn: neverBotReplyColumn,
    suspendAutomaticFollowUpColumn:
      suspendAutomaticFollowUpColumn,
    reasonColumn: reasonColumn,
  };
}

/**
 * Bloqueia de forma permanente as retomadas de um contato. Esta é a mesma
 * preferência exposta como checkbox na aba Leads, para que o cancelamento
 * feito pela agenda diária não crie um segundo estado concorrente.
 */
function marcarNuncaRetomarPorTelefone_(spreadsheet, phone, reason) {
  const normalizedPhone = normalizarTelefonePreferenciaContato_(phone);

  if (!normalizedPhone) {
    return { ok: false, error: "invalid_phone" };
  }

  const file = spreadsheet || SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const configuredSheetName =
    typeof CONFIG !== "undefined" && CONFIG.sheetName
      ? CONFIG.sheetName
      : CONTACT_PREFERENCES_CONFIG.sheetName;
  const sheet =
    file.getSheetByName(configuredSheetName) ||
    file.getSheetByName(CONTACT_PREFERENCES_CONFIG.sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: false, error: "lead_not_found" };
  }

  garantirEstruturaPreferenciasContato_(sheet);

  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0];
  const phoneColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.phoneHeader,
  );
  const neverFollowUpColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverFollowUpHeader,
  );
  const reasonColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.reasonHeader,
  );

  if (phoneColumn < 0 || neverFollowUpColumn < 0) {
    return { ok: false, error: "invalid_leads_schema" };
  }

  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, lastColumn)
    .getValues();
  let matchedRow = 0;

  rows.forEach(function (row, index) {
    if (
      normalizarTelefonePreferenciaContato_(row[phoneColumn]) ===
      normalizedPhone
    ) {
      matchedRow = index + 2;
    }
  });

  if (!matchedRow) {
    return { ok: false, error: "lead_not_found" };
  }

  sheet
    .getRange(matchedRow, neverFollowUpColumn + 1)
    .setValue(true);

  if (reasonColumn >= 0) {
    const reasonCell = sheet.getRange(matchedRow, reasonColumn + 1);
    const existingReason = String(reasonCell.getDisplayValue() || "").trim();

    if (!existingReason && reason) {
      reasonCell.setValue(textoPreferenciaContato_(reason, 240));
    }
  }

  return {
    ok: true,
    phone: normalizedPhone,
    row: matchedRow,
    alreadyBlocked: valorAtivoPreferenciaContato_(
      rows[matchedRow - 2][neverFollowUpColumn],
    ),
  };
}

function obterPreferenciasContatoLeads_(spreadsheet, phone) {
  const normalizedPhone = normalizarTelefonePreferenciaContato_(phone);

  if (!normalizedPhone) {
    return preferenciasContatoDesconhecidas_();
  }

  const file = spreadsheet || SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const configuredSheetName =
    typeof CONFIG !== "undefined" && CONFIG.sheetName
      ? CONFIG.sheetName
      : CONTACT_PREFERENCES_CONFIG.sheetName;
  const sheet =
    file.getSheetByName(configuredSheetName) ||
    file.getSheetByName(CONTACT_PREFERENCES_CONFIG.sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return preferenciasContatoDesconhecidas_();
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0];
  const phoneColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.phoneHeader,
  );
  const neverFollowUpColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverFollowUpHeader,
  );
  const neverBotReplyColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverBotReplyHeader,
  );
  const suspendAutomaticFollowUpColumn =
    indiceCabecalhoPreferenciaContato_(
      headers,
      CONTACT_PREFERENCES_CONFIG.suspendAutomaticFollowUpHeader,
    );
  const reasonColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.reasonHeader,
  );

  if (phoneColumn < 0) {
    return preferenciasContatoDesconhecidas_();
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, lastColumn)
    .getValues();
  let match = null;

  values.forEach(function (row) {
    if (
      normalizarTelefonePreferenciaContato_(row[phoneColumn]) ===
      normalizedPhone
    ) {
      match = row;
    }
  });

  if (!match) {
    return preferenciasContatoDesconhecidas_();
  }

  return {
    found: true,
    neverFollowUp:
      neverFollowUpColumn >= 0 &&
      valorAtivoPreferenciaContato_(match[neverFollowUpColumn]),
    neverBotReply:
      neverBotReplyColumn >= 0 &&
      valorAtivoPreferenciaContato_(match[neverBotReplyColumn]),
    suspendAutomaticFollowUp:
      suspendAutomaticFollowUpColumn >= 0 &&
      valorAtivoPreferenciaContato_(
        match[suspendAutomaticFollowUpColumn],
      ),
    blockReason:
      reasonColumn >= 0
        ? textoPreferenciaContato_(match[reasonColumn], 240)
        : "",
  };
}

function carregarPreferenciasContatoPorTelefone_(sheet) {
  const result = {};

  if (!sheet || sheet.getLastRow() < 2) return result;

  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0];
  const phoneColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.phoneHeader,
  );
  const neverFollowUpColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverFollowUpHeader,
  );
  const neverBotReplyColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverBotReplyHeader,
  );
  const suspendAutomaticFollowUpColumn =
    indiceCabecalhoPreferenciaContato_(
      headers,
      CONTACT_PREFERENCES_CONFIG.suspendAutomaticFollowUpHeader,
    );
  const reasonColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.reasonHeader,
  );

  if (phoneColumn < 0) return result;

  sheet
    .getRange(2, 1, sheet.getLastRow() - 1, lastColumn)
    .getValues()
    .forEach(function (row) {
      const phone = normalizarTelefonePreferenciaContato_(
        row[phoneColumn],
      );
      if (!phone) return;

      result[phone] = {
        found: true,
        neverFollowUp:
          neverFollowUpColumn >= 0 &&
          valorAtivoPreferenciaContato_(
            row[neverFollowUpColumn],
          ),
        neverBotReply:
          neverBotReplyColumn >= 0 &&
          valorAtivoPreferenciaContato_(
            row[neverBotReplyColumn],
          ),
        suspendAutomaticFollowUp:
          suspendAutomaticFollowUpColumn >= 0 &&
          valorAtivoPreferenciaContato_(
            row[suspendAutomaticFollowUpColumn],
          ),
        blockReason:
          reasonColumn >= 0
            ? textoPreferenciaContato_(row[reasonColumn], 240)
            : "",
      };
    });

  return result;
}

function anexarPreferenciasContatoRelacionamento_(
  relationship,
  preferences,
) {
  const safeRelationship = relationship || {};
  const safePreferences =
    preferences || preferenciasContatoDesconhecidas_();

  return Object.assign({}, safeRelationship, {
    contactPreferencesFound: safePreferences.found === true,
    neverFollowUp: safePreferences.neverFollowUp === true,
    neverBotReply: safePreferences.neverBotReply === true,
    suspendAutomaticFollowUp:
      safePreferences.suspendAutomaticFollowUp === true,
    blockReason: textoPreferenciaContato_(
      safePreferences.blockReason,
      240,
    ),
  });
}

function preferenciasContatoDesconhecidas_() {
  return {
    found: false,
    neverFollowUp: false,
    neverBotReply: false,
    suspendAutomaticFollowUp: false,
    blockReason: "",
  };
}

function indiceCabecalhoPreferenciaContato_(headers, expected) {
  const normalizedExpected = normalizarCabecalhoPreferenciaContato_(
    expected,
  );

  return (headers || []).findIndex(function (header) {
    return (
      normalizarCabecalhoPreferenciaContato_(header) ===
      normalizedExpected
    );
  });
}

function normalizarCabecalhoPreferenciaContato_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizarTelefonePreferenciaContato_(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length >= 12 && digits.indexOf("55") === 0) {
    return "+" + digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return "+55" + digits;
  }

  return "+" + digits;
}

function valorAtivoPreferenciaContato_(value) {
  if (value === true || value === 1) return true;

  return ["sim", "true", "verdadeiro", "1", "x", "bloqueado"].includes(
    normalizarCabecalhoPreferenciaContato_(value),
  );
}

function textoPreferenciaContato_(value, limit) {
  return Array.from(String(value || "").trim())
    .slice(0, limit)
    .join("");
}
