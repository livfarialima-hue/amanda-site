const CONTACT_PREFERENCES_CONFIG = Object.freeze({
  sheetName: "Google Ads - Conversões",
  additionalSheetNames: Object.freeze(["Leads Dr. Daniel"]),
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

  const result = garantirEstruturaPreferenciasContato_(sheet);
  CONTACT_PREFERENCES_CONFIG.additionalSheetNames.forEach(function (name) {
    const additional = spreadsheet.getSheetByName(name);
    if (additional) garantirEstruturaPreferenciasContato_(additional);
  });
  return result;
}

function planilhasPreferenciasContato_(file) {
  const names = [
    typeof CONFIG !== "undefined" && CONFIG.sheetName
      ? CONFIG.sheetName
      : CONTACT_PREFERENCES_CONFIG.sheetName,
  ].concat(CONTACT_PREFERENCES_CONFIG.additionalSheetNames || []);
  return names
    .filter(function unique(name, index) {
      return name && names.indexOf(name) === index;
    })
    .map(function find(name) {
      return file.getSheetByName(name);
    })
    .filter(Boolean);
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
  const matches = [];
  planilhasPreferenciasContato_(file).forEach(function (sheet) {
    if (sheet.getLastRow() < 2) return;
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
    if (phoneColumn < 0 || neverFollowUpColumn < 0) return;
    const rows = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, lastColumn)
      .getValues();
    rows.forEach(function (row, index) {
      if (
        normalizarTelefonePreferenciaContato_(row[phoneColumn]) !==
        normalizedPhone
      ) return;
      const rowNumber = index + 2;
      const alreadyBlocked = valorAtivoPreferenciaContato_(
        row[neverFollowUpColumn],
      );
      sheet.getRange(rowNumber, neverFollowUpColumn + 1).setValue(true);
      if (reasonColumn >= 0 && reason) {
        const reasonCell = sheet.getRange(rowNumber, reasonColumn + 1);
        if (!String(reasonCell.getDisplayValue() || "").trim()) {
          reasonCell.setValue(textoPreferenciaContato_(reason, 240));
        }
      }
      matches.push({
        sheet: typeof sheet.getName === "function" ? sheet.getName() : "Leads",
        row: rowNumber,
        alreadyBlocked,
      });
    });
  });
  if (!matches.length) return { ok: false, error: "lead_not_found" };
  return {
    ok: true,
    phone: normalizedPhone,
    row: matches[0].row,
    matches,
    alreadyBlocked: matches.every(function (match) {
      return match.alreadyBlocked;
    }),
  };
}

function obterPreferenciasContatoLeads_(spreadsheet, phone) {
  const normalizedPhone = normalizarTelefonePreferenciaContato_(phone);

  if (!normalizedPhone) {
    return preferenciasContatoDesconhecidas_();
  }

  const file = spreadsheet || SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const matches = planilhasPreferenciasContato_(file)
    .map(function read(sheet) {
      return lerPreferenciasContatoNaPlanilha_(sheet, normalizedPhone);
    })
    .filter(function found(value) {
      return value.found;
    });
  if (!matches.length) return preferenciasContatoDesconhecidas_();
  return {
    found: true,
    neverFollowUp: matches.some(function (value) {
      return value.neverFollowUp;
    }),
    neverBotReply: matches.some(function (value) {
      return value.neverBotReply;
    }),
    suspendAutomaticFollowUp: matches.some(function (value) {
      return value.suspendAutomaticFollowUp;
    }),
    blockReason: matches
      .map(function (value) { return value.blockReason; })
      .filter(Boolean)
      .join(" | ")
      .slice(0, 240),
  };
}

function lerPreferenciasContatoNaPlanilha_(sheet, normalizedPhone) {
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
  if (phoneColumn < 0) return preferenciasContatoDesconhecidas_();
  const neverFollowUpColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverFollowUpHeader,
  );
  const neverBotReplyColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.neverBotReplyHeader,
  );
  const suspendColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.suspendAutomaticFollowUpHeader,
  );
  const reasonColumn = indiceCabecalhoPreferenciaContato_(
    headers,
    CONTACT_PREFERENCES_CONFIG.reasonHeader,
  );
  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, lastColumn)
    .getValues();
  let match = null;
  rows.forEach(function find(row) {
    if (
      normalizarTelefonePreferenciaContato_(row[phoneColumn]) ===
      normalizedPhone
    ) match = row;
  });
  if (!match) return preferenciasContatoDesconhecidas_();
  return {
    found: true,
    neverFollowUp:
      neverFollowUpColumn >= 0 &&
      valorAtivoPreferenciaContato_(match[neverFollowUpColumn]),
    neverBotReply:
      neverBotReplyColumn >= 0 &&
      valorAtivoPreferenciaContato_(match[neverBotReplyColumn]),
    suspendAutomaticFollowUp:
      suspendColumn >= 0 && valorAtivoPreferenciaContato_(match[suspendColumn]),
    blockReason: reasonColumn >= 0
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
