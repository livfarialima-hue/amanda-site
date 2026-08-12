const OPPORTUNITY_STORE_CONFIG = Object.freeze({
  sheetName: "_CRM_OPORTUNIDADES",
  amandaSheetName: "Google Ads - Conversões",
  danielSheetName: "Leads Dr. Daniel",
});

const OPPORTUNITY_HEADERS = Object.freeze([
  "Opportunity ID",
  "Telefone (E.164)",
  "Telefone hash",
  "Profissional",
  "Aba visível",
  "Linha visível",
  "Estado",
  "Fase",
  "Relacionamento",
  "Responsável atual",
  "Aguardando ação de",
  "Objeção principal",
  "Resumo automático",
  "Próxima ação automática",
  "Referência inicial",
  "Plataforma inicial",
  "GCLID",
  "GBRAID",
  "WBRAID",
  "Atribuição fixada em",
  "Primeiro Event ID",
  "Último Event ID",
  "Versão",
  "Criado em",
  "Atualizado em",
  "Encerrado em",
]);

const LEAD_INTEGRATION_HEADERS = Object.freeze([
  "Opportunity ID",
  "Profissional responsável",
  "Versão da oportunidade",
  "Último Event ID",
  "Status operacional",
  "Resumo automático",
  "Próxima ação automática",
  "Objeção principal",
  "Relacionamento",
  "Responsável atual",
  "Aguardando ação de",
  "Status de roteamento",
  "Atribuição fixada em",
]);

function normalizarProfissionalOportunidade_(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (/^(?:amanda|dra\.?\s+amanda)/.test(normalized)) return "amanda";
  if (/^(?:daniel|dr\.?\s+daniel)/.test(normalized)) return "daniel";
  if (/^(?:external|externo|outro|henrique|marina|laerte)/.test(normalized)) {
    return "external";
  }
  if (/^(?:nonpatient|nao_paciente|emprego|marketing|fornecedor)/.test(normalized)) {
    return "nonpatient";
  }
  return "unknown";
}

function profissionalPermitidoOportunidade_(value) {
  const professional = normalizarProfissionalOportunidade_(value);
  return professional === "amanda" || professional === "daniel";
}

function nomeAbaLeadOportunidade_(professional) {
  const key = normalizarProfissionalOportunidade_(professional);
  if (key === "amanda") return OPPORTUNITY_STORE_CONFIG.amandaSheetName;
  if (key === "daniel") return OPPORTUNITY_STORE_CONFIG.danielSheetName;
  return "";
}

function resolverRotaLead_(lead) {
  const explicit = normalizarProfissionalOportunidade_(
    lead && lead.professional,
  );
  if (explicit === "amanda" || explicit === "daniel") {
    return {
      professional: explicit,
      routeStatus: "resolved",
      sheetName: nomeAbaLeadOportunidade_(explicit),
    };
  }
  if (explicit === "external" || explicit === "nonpatient") {
    return {
      professional: explicit,
      routeStatus: "nonlead",
      sheetName: "",
    };
  }

  const platform = String(lead && lead.platform || "").trim();
  const reference = String(lead && lead.reference || "").trim();
  if (
    platform === "Google" ||
    platform === "Meta" ||
    /^(?:G26|M26|SITE[-_]|INSTAGRAM[-_])/i.test(reference)
  ) {
    return {
      professional: "amanda",
      routeStatus: "resolved_by_acquisition",
      sheetName: OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    };
  }

  return {
    professional: "unknown",
    routeStatus: "pending",
    sheetName: "",
  };
}

function mapaCabecalhosOportunidade_(sheet) {
  const width = Math.max(sheet && sheet.getLastColumn
    ? sheet.getLastColumn()
    : 0, 1);
  const headers = sheet
    .getRange(1, 1, 1, width)
    .getDisplayValues()[0];
  const map = {};
  headers.forEach(function mapHeader(header, index) {
    const key = String(header || "").trim();
    if (key && map[key] === undefined) map[key] = index + 1;
  });
  return map;
}

function garantirCabecalhosAditivos_(sheet, expectedHeaders) {
  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet
    .getRange(1, 1, 1, width)
    .getDisplayValues()[0]
    .map(function normalizeHeader(value) {
      return String(value || "").trim();
    });

  expectedHeaders.forEach(function ensureHeader(header) {
    if (existing.includes(header)) return;
    let targetColumn = existing.findIndex(function findEmpty(value) {
      return !String(value || "").trim();
    }) + 1;
    if (!targetColumn) {
      if (
        typeof sheet.getMaxColumns === "function" &&
        typeof sheet.insertColumnsAfter === "function" &&
        existing.length >= sheet.getMaxColumns()
      ) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), 5);
      }
      existing.push(header);
      targetColumn = existing.length;
    } else {
      existing[targetColumn - 1] = header;
    }
    const newColumnRange = sheet.getRange(
      1,
      targetColumn,
      typeof sheet.getMaxRows === "function" ? sheet.getMaxRows() : 1,
      1,
    );
    if (typeof newColumnRange.clearDataValidations === "function") {
      newColumnRange.clearDataValidations();
    }
    sheet.getRange(1, targetColumn).setValue(header);
  });

  return mapaCabecalhosOportunidade_(sheet);
}

function garantirEstruturaIntegradaLead_(sheet) {
  return garantirCabecalhosAditivos_(sheet, LEAD_INTEGRATION_HEADERS);
}

function obterOuCriarPlanilhaOportunidades_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  if (!sheet) {
    sheet = spreadsheet.insertSheet(OPPORTUNITY_STORE_CONFIG.sheetName);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  garantirCabecalhosAditivos_(sheet, OPPORTUNITY_HEADERS);
  return sheet;
}

function hashOportunidade_(value) {
  if (typeof stableLeadHash_ === "function") {
    return stableLeadHash_(value);
  }
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

function criarOpportunityId_(professional, eventId) {
  return "opp_" + hashOportunidade_([
    normalizarProfissionalOportunidade_(professional),
    String(eventId || Utilities.getUuid()),
  ].join("|"));
}

function localizarOportunidadeAtiva_(sheet, phone, professional) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, OPPORTUNITY_HEADERS.length)
    .getDisplayValues();
  const normalizedPhone = normalizePhone_(phone);
  const normalizedProfessional = normalizarProfissionalOportunidade_(
    professional,
  );

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (
      normalizePhone_(row[1]) === normalizedPhone &&
      normalizarProfissionalOportunidade_(row[3]) === normalizedProfessional &&
      !/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))
    ) {
      return { row: index + 2, values: row };
    }
  }
  return null;
}

function localizarOportunidadePorId_(sheet, opportunityId) {
  if (!sheet || sheet.getLastRow() < 2 || !opportunityId) return null;
  const match = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(opportunityId))
    .matchEntireCell(true)
    .findNext();
  if (!match) return null;
  return {
    row: match.getRow(),
    values: sheet
      .getRange(match.getRow(), 1, 1, OPPORTUNITY_HEADERS.length)
      .getDisplayValues()[0],
  };
}

function localizarOportunidadeMaisRecentePorTelefone_(spreadsheet, phone) {
  const sheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  if (!sheet || sheet.getLastRow() < 2) return null;
  const normalizedPhone = normalizePhone_(phone);
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, OPPORTUNITY_HEADERS.length)
    .getDisplayValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (
      normalizePhone_(row[1]) === normalizedPhone &&
      profissionalPermitidoOportunidade_(row[3]) &&
      !/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))
    ) {
      return {
        opportunityId: String(row[0] || ""),
        professional: normalizarProfissionalOportunidade_(row[3]),
        sheetName: String(row[4] || ""),
        leadRow: Number(row[5]) || null,
      };
    }
  }
  return null;
}

function definirCampoPorCabecalho_(sheet, row, columns, header, value) {
  const column = columns[header];
  if (!column) return;
  sheet.getRange(row, column).setValue(value);
}

function vincularOportunidadeAoLead_(sheet, row, opportunity, routeStatus) {
  if (!sheet || !row || !opportunity) return;
  const columns = garantirEstruturaIntegradaLead_(sheet);
  const now = new Date();
  const currentVersion = Number(
    sheet.getRange(row, columns["Versão da oportunidade"]).getValue(),
  ) || 0;
  const values = {
    "Opportunity ID": opportunity.opportunityId,
    "Profissional responsável": opportunity.professional,
    "Versão da oportunidade": currentVersion + 1,
    "Último Event ID": opportunity.lastEventId,
    "Status operacional": opportunity.operationalStatus || "open",
    "Responsável atual": opportunity.owner || "bruna",
    "Aguardando ação de": opportunity.expectedParty || "patient",
    "Status de roteamento": routeStatus || "resolved",
    "Atribuição fixada em": opportunity.attributionLockedAt || now,
  };
  const startColumn = columns[LEAD_INTEGRATION_HEADERS[0]];
  const currentValues = sheet
    .getRange(row, startColumn, 1, LEAD_INTEGRATION_HEADERS.length)
    .getValues()[0];
  const output = LEAD_INTEGRATION_HEADERS.map(function buildField(header, index) {
    return Object.prototype.hasOwnProperty.call(values, header)
      ? values[header]
      : currentValues[index];
  });
  sheet
    .getRange(row, startColumn, 1, LEAD_INTEGRATION_HEADERS.length)
    .setValues([output]);
}

function garantirOportunidadeLead_(spreadsheet, lead, leadSheet, leadRow) {
  const route = resolverRotaLead_(lead);
  if (!profissionalPermitidoOportunidade_(route.professional)) {
    return {
      created: false,
      opportunityId: "",
      professional: route.professional,
      routeStatus: route.routeStatus,
    };
  }

  const sheet = obterOuCriarPlanilhaOportunidades_(spreadsheet);
  let found = lead.opportunityId
    ? localizarOportunidadePorId_(sheet, lead.opportunityId)
    : null;
  if (!found) {
    found = localizarOportunidadeAtiva_(
      sheet,
      lead.phone,
      route.professional,
    );
  }

  const now = new Date();
  const opportunityId = found
    ? String(found.values[0])
    : criarOpportunityId_(route.professional, lead.eventId);
  const attributionLockedAt = found && found.values[19]
    ? found.values[19]
    : now;
  const clickIds = route.professional === "amanda"
    ? [lead.gclid || "", lead.gbraid || "", lead.wbraid || ""]
    : ["", "", ""];

  if (!found) {
    sheet.appendRow([
      opportunityId,
      lead.phone,
      hashOportunidade_(normalizePhone_(lead.phone)),
      route.professional,
      route.sheetName,
      leadRow || "",
      "open",
      "Novo",
      "new_lead",
      "bruna",
      "patient",
      "",
      "",
      "",
      lead.reference || "",
      lead.platform || "",
      clickIds[0],
      clickIds[1],
      clickIds[2],
      attributionLockedAt,
      lead.eventId,
      lead.eventId,
      1,
      now,
      now,
      "",
    ]);
  } else {
    const row = found.row;
    const version = Number(found.values[22] || 0) + 1;
    sheet.getRange(row, 5, 1, 2).setValues([[
      route.sheetName,
      leadRow || found.values[5] || "",
    ]]);
    sheet.getRange(row, 22, 1, 4).setValues([[
      lead.eventId,
      version,
      found.values[23] || now,
      now,
    ]]);
  }

  const opportunity = {
    opportunityId,
    professional: route.professional,
    lastEventId: lead.eventId,
    operationalStatus: "open",
    owner: "bruna",
    expectedParty: "patient",
    attributionLockedAt,
  };
  vincularOportunidadeAoLead_(
    leadSheet,
    leadRow,
    opportunity,
    route.routeStatus,
  );
  return Object.assign({ created: !found }, opportunity, {
    routeStatus: route.routeStatus,
  });
}

function localizarLeadPorOportunidadeOuTelefone_(
  sheet,
  opportunityId,
  phone,
) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const columns = garantirEstruturaIntegradaLead_(sheet);
  if (opportunityId && columns["Opportunity ID"]) {
    const match = sheet
      .getRange(2, columns["Opportunity ID"], sheet.getLastRow() - 1, 1)
      .createTextFinder(String(opportunityId))
      .matchEntireCell(true)
      .findNext();
    if (match) return match.getRow();
  }
  const headers = mapaCabecalhosOportunidade_(sheet);
  const phoneColumn = headers["Telefone (E.164)"] || 3;
  const normalizedPhone = normalizePhone_(phone);
  const values = sheet
    .getRange(2, phoneColumn, sheet.getLastRow() - 1, 1)
    .getDisplayValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (normalizePhone_(values[index][0]) === normalizedPhone) {
      return index + 2;
    }
  }
  return null;
}

function atualizarOportunidadeClassificada_(spreadsheet, input) {
  const sheet = obterOuCriarPlanilhaOportunidades_(spreadsheet);
  const found = localizarOportunidadePorId_(sheet, input.opportunityId);
  if (!found) return false;
  const now = new Date();
  const nextVersion = Number(found.values[22] || 0) + 1;
  sheet.getRange(found.row, 8, 1, 7).setValues([[
    input.stage || found.values[7],
    input.relationship || found.values[8],
    input.owner || found.values[9],
    input.expectedParty || found.values[10],
    input.objection || found.values[11],
    input.summary || found.values[12],
    input.nextAction || found.values[13],
  ]]);
  sheet.getRange(found.row, 23, 1, 3).setValues([[
    nextVersion,
    found.values[23] || now,
    now,
  ]]);
  return true;
}

function encerrarOportunidadeNaoLead_(spreadsheet, input) {
  const sheet = obterOuCriarPlanilhaOportunidades_(spreadsheet);
  const found = localizarOportunidadePorId_(sheet, input.opportunityId);
  if (!found) return false;
  const now = new Date();
  const nextVersion = Number(found.values[22] || 0) + 1;
  sheet.getRange(found.row, 4, 1, 11).setValues([[
    normalizarProfissionalOportunidade_(input.professional),
    String(input.archiveSheetName || "_CONTATOS_NAO_LEADS"),
    Number(input.archiveRow || 0) || "",
    "voided",
    "Não qualificado",
    "unknown",
    "human",
    "clinic",
    "Não qualificado",
    safeText_(input.reason, 300),
    "Nenhuma ação comercial automática",
  ]]);
  sheet.getRange(found.row, 23, 1, 4).setValues([[
    nextVersion,
    found.values[23] || now,
    now,
    now,
  ]]);
  return true;
}

function prepararIntegracaoCompletaLeads() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  obterOuCriarPlanilhaOportunidades_(spreadsheet);
  [
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    OPPORTUNITY_STORE_CONFIG.danielSheetName,
  ].forEach(function prepareSheet(name) {
    const sheet = spreadsheet.getSheetByName(name);
    if (sheet) garantirEstruturaIntegradaLead_(sheet);
  });
  return {
    ok: true,
    spreadsheetId: CONFIG.spreadsheetId,
    visibleLeadSheets: [
      OPPORTUNITY_STORE_CONFIG.amandaSheetName,
      OPPORTUNITY_STORE_CONFIG.danielSheetName,
    ],
    googleAdsSource: OPPORTUNITY_STORE_CONFIG.amandaSheetName,
  };
}

function valorLinhaPorCabecalho_(rowValues, columns, header) {
  const column = columns[header];
  return column ? rowValues[column - 1] : "";
}

function migrarOportunidadesExistentesLeads() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const opportunitySheet = obterOuCriarPlanilhaOportunidades_(spreadsheet);
  const migratedByProfessionalPhone = {};
  const stats = {
    ok: true,
    spreadsheetId: CONFIG.spreadsheetId,
    workbookCount: 1,
    visibleRowsLinked: 0,
    opportunitiesCreatedOrReused: 0,
    messageRowsBackfilled: 0,
    queueRowsBackfilled: 0,
    stageEventRowsBackfilled: 0,
    googleAdsEventRowsBackfilled: 0,
    consultationRowsBackfilled: 0,
  };

  [
    { name: OPPORTUNITY_STORE_CONFIG.amandaSheetName, professional: "amanda" },
    { name: OPPORTUNITY_STORE_CONFIG.danielSheetName, professional: "daniel" },
  ].forEach(function migrateVisibleSheet(config) {
    const sheet = spreadsheet.getSheetByName(config.name);
    if (!sheet) return;
    const columns = garantirEstruturaIntegradaLead_(sheet);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2) return;
    const values = sheet
      .getRange(2, 1, lastRow - 1, lastColumn)
      .getDisplayValues();

    for (let index = values.length - 1; index >= 0; index -= 1) {
      const rowNumber = index + 2;
      const row = values[index];
      const phone = normalizePhone_(
        valorLinhaPorCabecalho_(row, columns, "Telefone (E.164)"),
      );
      if (!phone) continue;
      const existingOpportunityId = String(
        valorLinhaPorCabecalho_(row, columns, "Opportunity ID") || "",
      ).trim();
      const key = config.professional + "|" + phone;
      let opportunity = migratedByProfessionalPhone[key];

      if (!opportunity && existingOpportunityId) {
        const found = localizarOportunidadePorId_(
          opportunitySheet,
          existingOpportunityId,
        );
        if (found) {
          opportunity = {
            opportunityId: existingOpportunityId,
            professional: config.professional,
            lastEventId: String(found.values[21] || ""),
            operationalStatus: String(found.values[6] || "open"),
            owner: String(found.values[9] || "bruna"),
            expectedParty: String(found.values[10] || "patient"),
            attributionLockedAt: found.values[19] || "",
          };
          migratedByProfessionalPhone[key] = opportunity;
          stats.visibleRowsLinked += 1;
          continue;
        }
      }

      if (!opportunity) {
        const contactAt = valorLinhaPorCabecalho_(
          row,
          columns,
          "Data do contato",
        );
        const legacyEventId = "legacy_" + hashOportunidade_([
          config.name,
          phone,
          contactAt,
          rowNumber,
        ].join("|"));
        opportunity = garantirOportunidadeLead_(
          spreadsheet,
          {
            eventId: legacyEventId,
            phone,
            professional: config.professional,
            opportunityId: existingOpportunityId,
            reference: valorLinhaPorCabecalho_(
              row,
              columns,
              "Referência da campanha",
            ),
            platform: valorLinhaPorCabecalho_(
              row,
              columns,
              "Plataforma de aquisição",
            ),
            gclid: config.professional === "amanda"
              ? valorLinhaPorCabecalho_(row, columns, "GCLID")
              : "",
            gbraid: config.professional === "amanda"
              ? valorLinhaPorCabecalho_(row, columns, "GBRAID")
              : "",
            wbraid: config.professional === "amanda"
              ? valorLinhaPorCabecalho_(row, columns, "WBRAID")
              : "",
          },
          sheet,
          rowNumber,
        );
        migratedByProfessionalPhone[key] = opportunity;
        stats.opportunitiesCreatedOrReused += 1;
      } else {
        vincularOportunidadeAoLead_(
          sheet,
          rowNumber,
          opportunity,
          "migrated_legacy",
        );
      }
      stats.visibleRowsLinked += 1;
    }
  });

  function backfillLedger(sheetName, headers, opportunityHeader, professionalHeader, leadSheetHeader) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return 0;
    const columns = garantirCabecalhosAditivos_(sheet, headers);
    const width = sheet.getLastColumn();
    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, width)
      .getDisplayValues();
    let changed = 0;
    values.forEach(function backfillRow(row, index) {
      const rowNumber = index + 2;
      const opportunityId = String(
        valorLinhaPorCabecalho_(row, columns, opportunityHeader) || "",
      ).trim();
      const professional = normalizarProfissionalOportunidade_(
        valorLinhaPorCabecalho_(row, columns, professionalHeader),
      );
      if (opportunityId && profissionalPermitidoOportunidade_(professional)) {
        return;
      }
      const phone = normalizePhone_(
        valorLinhaPorCabecalho_(row, columns, "Telefone"),
      );
      if (!phone) return;
      const legacyOpportunity = migratedByProfessionalPhone["amanda|" + phone];
      if (!legacyOpportunity) return;
      sheet.getRange(rowNumber, columns[opportunityHeader]).setValue(
        legacyOpportunity.opportunityId,
      );
      sheet.getRange(rowNumber, columns[professionalHeader]).setValue("amanda");
      sheet.getRange(rowNumber, columns[leadSheetHeader]).setValue(
        OPPORTUNITY_STORE_CONFIG.amandaSheetName,
      );
      changed += 1;
    });
    return changed;
  }

  if (typeof LEAD_MESSAGE_HEADERS !== "undefined") {
    stats.messageRowsBackfilled = backfillLedger(
      CONFIG.messageSheetName,
      LEAD_MESSAGE_HEADERS,
      "Opportunity ID",
      "Profissional",
      "Aba do lead",
    );
  }
  if (typeof LEAD_CLASSIFICATION_HEADERS !== "undefined") {
    stats.queueRowsBackfilled = backfillLedger(
      CONFIG.classificationSheetName,
      LEAD_CLASSIFICATION_HEADERS,
      "Opportunity ID",
      "Profissional",
      "Aba do lead",
    );
  }

  const opportunityById = {};
  const opportunityByPhoneHash = {};
  if (opportunitySheet.getLastRow() >= 2) {
    opportunitySheet
      .getRange(2, 1, opportunitySheet.getLastRow() - 1, OPPORTUNITY_HEADERS.length)
      .getDisplayValues()
      .forEach(function indexOpportunity(row) {
        const opportunityId = String(row[0] || "").trim();
        const phoneHash = String(row[2] || "").trim();
        const professional = normalizarProfissionalOportunidade_(row[3]);
        if (!opportunityId || !profissionalPermitidoOportunidade_(professional)) return;
        const indexed = { opportunityId, professional };
        opportunityById[opportunityId] = indexed;
        if (phoneHash) opportunityByPhoneHash[phoneHash] = indexed;
      });
  }
  const migratedEventOpportunityIds = {};

  function backfillEventProfessional(sheetName, headers, phoneHashHeader) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return 0;
    const columns = garantirCabecalhosAditivos_(sheet, headers);
    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getDisplayValues();
    const updates = [];
    values.forEach(function backfillEventRow(row, index) {
      const currentProfessional = normalizarProfissionalOportunidade_(
        valorLinhaPorCabecalho_(row, columns, "Profissional"),
      );
      const opportunityId = String(
        valorLinhaPorCabecalho_(row, columns, "Opportunity ID") || "",
      ).trim();
      if (!opportunityId) return;
      const phoneHash = phoneHashHeader
        ? String(valorLinhaPorCabecalho_(row, columns, phoneHashHeader) || "").trim()
        : "";
      const target = opportunityById[opportunityId]
        || migratedEventOpportunityIds[opportunityId]
        || opportunityByPhoneHash[phoneHash];
      if (!target) return;
      if (
        opportunityId === target.opportunityId &&
        currentProfessional === target.professional
      ) return;
      migratedEventOpportunityIds[opportunityId] = target;
      updates.push({
        rowNumber: index + 2,
        oldOpportunityId: opportunityId,
        opportunityId: target.opportunityId,
        professional: target.professional,
      });
    });
    updates.forEach(function applyEventProfessional(update) {
      if (update.oldOpportunityId !== update.opportunityId) {
        sheet
          .getRange(update.rowNumber, columns["Opportunity ID"])
          .setValue(update.opportunityId);
      }
      sheet
        .getRange(update.rowNumber, columns["Profissional"])
        .setValue(update.professional);
    });
    return updates.length;
  }

  if (typeof LEAD_STAGE_EVENT_HEADERS !== "undefined") {
    stats.stageEventRowsBackfilled = backfillEventProfessional(
      "_LEAD_FASE_EVENTOS",
      LEAD_STAGE_EVENT_HEADERS,
      "Telefone hash",
    );
  }
  if (typeof GOOGLE_ADS_EVENT_HEADERS !== "undefined") {
    stats.googleAdsEventRowsBackfilled = backfillEventProfessional(
      "_GOOGLE_ADS_EVENTOS",
      GOOGLE_ADS_EVENT_HEADERS,
      "",
    );
  }

  const consultations = spreadsheet.getSheetByName("Consultas");
  if (consultations && consultations.getLastRow() >= 2) {
    const columns = garantirCabecalhosAditivos_(
      consultations,
      ["Opportunity ID"],
    );
    const values = consultations
      .getRange(2, 1, consultations.getLastRow() - 1, consultations.getLastColumn())
      .getDisplayValues();
    values.forEach(function backfillConsultation(row, index) {
      if (valorLinhaPorCabecalho_(row, columns, "Opportunity ID")) return;
      const phone = normalizePhone_(
        valorLinhaPorCabecalho_(row, columns, "Telefone (E.164)"),
      );
      const professional = normalizarProfissionalOportunidade_(
        valorLinhaPorCabecalho_(row, columns, "Profissional"),
      );
      if (!phone || !profissionalPermitidoOportunidade_(professional)) return;
      const opportunity = migratedByProfessionalPhone[professional + "|" + phone]
        || localizarOportunidadeAtiva_(opportunitySheet, phone, professional);
      if (!opportunity) return;
      const opportunityId = opportunity.opportunityId
        || String(opportunity.values && opportunity.values[0] || "");
      if (!opportunityId) return;
      consultations
        .getRange(index + 2, columns["Opportunity ID"])
        .setValue(opportunityId);
      stats.consultationRowsBackfilled += 1;
    });
  }

  return stats;
}

function registrarSelecaoPendenteAgendamento_(input) {
  const phone = normalizePhone_(input && input.phone);
  const professional = normalizarProfissionalOportunidade_(
    input && input.professional,
  );
  if (!phone || !profissionalPermitidoOportunidade_(professional)) {
    return { ok: false, error: "invalid_pending_appointment" };
  }
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const opportunity = input.opportunityId
    ? {
        opportunityId: String(input.opportunityId),
        professional,
        sheetName: nomeAbaLeadOportunidade_(professional),
      }
    : localizarOportunidadeMaisRecentePorTelefone_(spreadsheet, phone);
  if (
    !opportunity ||
    normalizarProfissionalOportunidade_(opportunity.professional) !== professional
  ) {
    return { ok: false, error: "opportunity_not_found" };
  }

  const headers = [
    "Event ID",
    "Opportunity ID",
    "Telefone",
    "Profissional",
    "Data escolhida",
    "Horário escolhido",
    "Estado",
    "Criado em",
    "Confirmado em",
  ];
  let sheet = spreadsheet.getSheetByName("_AGENDAMENTOS_PENDENTES");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("_AGENDAMENTOS_PENDENTES");
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  garantirCabecalhosAditivos_(sheet, headers);
  const eventId = String(input.eventId || "");
  const duplicate = eventId && sheet.getLastRow() >= 2
    ? Boolean(
        sheet
          .getRange(2, 1, sheet.getLastRow() - 1, 1)
          .createTextFinder(eventId)
          .matchEntireCell(true)
          .findNext(),
      )
    : false;
  if (!duplicate) {
    sheet.appendRow([
      eventId,
      opportunity.opportunityId,
      phone,
      professional,
      String(input.scheduledDate || ""),
      String(input.scheduledTime || ""),
      "selected_pending_human",
      new Date(),
      "",
    ]);
  }

  const leadSheet = spreadsheet.getSheetByName(opportunity.sheetName);
  const leadRow = leadSheet
    ? localizarLeadPorOportunidadeOuTelefone_(
        leadSheet,
        opportunity.opportunityId,
        phone,
      )
    : null;
  if (leadRow) {
    const columns = garantirEstruturaIntegradaLead_(leadSheet);
    definirCampoPorCabecalho_(
      leadSheet,
      leadRow,
      columns,
      "Status operacional",
      "appointment_pending_human",
    );
    definirCampoPorCabecalho_(
      leadSheet,
      leadRow,
      columns,
      "Responsável atual",
      "human",
    );
    definirCampoPorCabecalho_(
      leadSheet,
      leadRow,
      columns,
      "Aguardando ação de",
      "clinic",
    );
  }
  atualizarOportunidadeClassificada_(spreadsheet, {
    opportunityId: opportunity.opportunityId,
    owner: "human",
    expectedParty: "clinic",
    nextAction: "Confirmar ou recusar o horário escolhido",
  });

  return {
    ok: true,
    created: !duplicate,
    duplicate,
    opportunityId: opportunity.opportunityId,
    state: "selected_pending_human",
  };
}
