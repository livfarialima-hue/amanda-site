const OPPORTUNITY_STORE_CONFIG = Object.freeze({
  sheetName: "_CRM_OPORTUNIDADES",
  amandaSheetName: "Google Ads - Conversões",
  danielSheetName: "Leads Dr. Daniel",
  timezone: "America/Sao_Paulo",
});

const OPPORTUNITY_STAGE_VALUES = Object.freeze([
  "Novo",
  "Qualificado",
  "Não qualificado",
  "Consulta agendada",
  "Consulta realizada",
  "Paciente convertido",
]);

const OPPORTUNITY_SYNC_FIELDS = Object.freeze([
  Object.freeze({
    input: "relationship",
    visible: "Relacionamento",
    opportunityIndex: 8,
  }),
  Object.freeze({
    input: "owner",
    visible: "Responsável atual",
    opportunityIndex: 9,
  }),
  Object.freeze({
    input: "expectedParty",
    visible: "Aguardando ação de",
    opportunityIndex: 10,
  }),
  Object.freeze({
    input: "objection",
    visible: "Objeção principal",
    opportunityIndex: 11,
  }),
  Object.freeze({
    input: "summary",
    visible: "Resumo automático",
    opportunityIndex: 12,
  }),
  Object.freeze({
    input: "nextAction",
    visible: "Próxima ação automática",
    opportunityIndex: 13,
  }),
]);

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

function localizarContextoRotaUnicoPorTelefone_(spreadsheet, phone) {
  const sheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  if (!sheet || sheet.getLastRow() < 2) return null;
  const normalizedPhone = normalizePhone_(phone);
  if (!normalizedPhone) return null;
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, OPPORTUNITY_HEADERS.length)
    .getDisplayValues();
  const active = values.filter(function filterOpportunity(row) {
    return (
      normalizePhone_(row[1]) === normalizedPhone &&
      profissionalPermitidoOportunidade_(row[3]) &&
      !/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))
    );
  });
  if (!active.length) return null;
  const professionals = active.reduce(function collect(result, row) {
    const professional = normalizarProfissionalOportunidade_(row[3]);
    if (result.indexOf(professional) < 0) result.push(professional);
    return result;
  }, []);
  // Falha fechada: duas oportunidades ativas de profissionais distintos
  // nunca podem contaminar uma a outra sem atribuicao explicita.
  if (professionals.length !== 1) return null;
  const row = active[active.length - 1];
  return {
    opportunityId: String(row[0] || ""),
    professional: professionals[0],
    sheetName: String(row[4] || ""),
    leadRow: Number(row[5]) || null,
  };
}

function resolverRotaLeadComContexto_(spreadsheet, lead) {
  const directRoute = resolverRotaLead_(lead);
  if (directRoute.routeStatus !== "pending") return directRoute;

  const opportunity = localizarContextoRotaUnicoPorTelefone_(
    spreadsheet,
    lead && lead.phone,
  );
  if (!opportunity) return directRoute;

  const professional = normalizarProfissionalOportunidade_(
    opportunity.professional,
  );
  if (!profissionalPermitidoOportunidade_(professional)) {
    return directRoute;
  }

  return {
    professional: professional,
    routeStatus: "resolved_by_open_opportunity",
    sheetName:
      opportunity.sheetName || nomeAbaLeadOportunidade_(professional),
    opportunityId: opportunity.opportunityId,
    leadRow: opportunity.leadRow,
  };
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
  const result = resolverLinhaLeadCanonica_(sheet, opportunityId, phone);
  return result.ok ? result.row : null;
}

function resolverLinhaLeadCanonica_(sheet, opportunityId, phone) {
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: false, reason: "lead_sheet_empty" };
  }
  const columns = garantirEstruturaIntegradaLead_(sheet);
  if (opportunityId && columns["Opportunity ID"]) {
    const ids = sheet
      .getRange(2, columns["Opportunity ID"], sheet.getLastRow() - 1, 1)
      .getDisplayValues();
    const matches = [];
    ids.forEach(function collectId(row, index) {
      if (String(row[0] || "") === String(opportunityId)) {
        matches.push(index + 2);
      }
    });
    if (matches.length === 1) {
      return { ok: true, row: matches[0], matchedBy: "opportunity_id" };
    }
    return {
      ok: false,
      reason: matches.length
        ? "duplicate_opportunity_id_in_visible_sheet"
        : "opportunity_id_not_found_in_visible_sheet",
      matchCount: matches.length,
    };
  }
  const headers = mapaCabecalhosOportunidade_(sheet);
  const phoneColumn = headers["Telefone (E.164)"] || 3;
  const normalizedPhone = normalizePhone_(phone);
  if (!normalizedPhone) {
    return { ok: false, reason: "invalid_phone" };
  }
  const values = sheet
    .getRange(2, phoneColumn, sheet.getLastRow() - 1, 1)
    .getDisplayValues();
  const matches = [];
  for (let index = 0; index < values.length; index += 1) {
    if (normalizePhone_(values[index][0]) === normalizedPhone) {
      matches.push(index + 2);
    }
  }
  if (matches.length === 1) {
    return { ok: true, row: matches[0], matchedBy: "unique_phone" };
  }
  return {
    ok: false,
    reason: matches.length ? "ambiguous_phone" : "phone_not_found",
    matchCount: matches.length,
  };
}

function rankFaseOportunidade_(value) {
  return {
    Novo: 1,
    Qualificado: 2,
    "Não qualificado": 2,
    "Consulta agendada": 3,
    "Consulta realizada": 4,
    "Paciente convertido": 5,
  }[String(value || "")] || 0;
}

function faseOportunidadeValida_(value) {
  return OPPORTUNITY_STAGE_VALUES.indexOf(String(value || "")) >= 0;
}

function resolverOportunidadeCanonica_(spreadsheet, input) {
  const sheet = obterOuCriarPlanilhaOportunidades_(spreadsheet);
  if (input.opportunityId) {
    const found = localizarOportunidadePorId_(sheet, input.opportunityId);
    return found
      ? { ok: true, sheet, found, matchedBy: "opportunity_id" }
      : { ok: false, reason: "opportunity_id_not_found" };
  }

  const phone = normalizePhone_(input.phone);
  const professional = normalizarProfissionalOportunidade_(
    input.professional,
  );
  if (!phone || !profissionalPermitidoOportunidade_(professional)) {
    return { ok: false, reason: "missing_canonical_identity" };
  }
  if (sheet.getLastRow() < 2) {
    return { ok: false, reason: "opportunity_not_found" };
  }
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, OPPORTUNITY_HEADERS.length)
    .getDisplayValues();
  const matches = [];
  values.forEach(function collectOpportunity(row, index) {
    if (
      normalizePhone_(row[1]) === phone &&
      normalizarProfissionalOportunidade_(row[3]) === professional &&
      !/^(?:closed|voided|encerrada)$/i.test(String(row[6] || ""))
    ) {
      matches.push({ row: index + 2, values: row });
    }
  });
  if (matches.length !== 1) {
    return {
      ok: false,
      reason: matches.length
        ? "ambiguous_active_opportunity"
        : "opportunity_not_found",
      matchCount: matches.length,
    };
  }
  return {
    ok: true,
    sheet,
    found: matches[0],
    matchedBy: "unique_active_professional_phone",
  };
}

function resolverFaseSincronizada_(crmStage, visibleStage, input) {
  const requestedStage = String(input.stage || "");
  if (requestedStage && !faseOportunidadeValida_(requestedStage)) {
    return { ok: false, reason: "invalid_stage" };
  }
  if (input.humanOverride) {
    return requestedStage
      ? { ok: true, stage: requestedStage }
      : { ok: false, reason: "human_stage_required" };
  }

  const crm = faseOportunidadeValida_(crmStage) ? String(crmStage) : "";
  const visible = faseOportunidadeValida_(visibleStage)
    ? String(visibleStage)
    : "";
  if (
    crm &&
    visible &&
    crm !== visible &&
    rankFaseOportunidade_(crm) === rankFaseOportunidade_(visible)
  ) {
    return { ok: false, reason: "ambiguous_stage_conflict" };
  }

  let stage = rankFaseOportunidade_(visible) > rankFaseOportunidade_(crm)
    ? visible
    : crm;
  if (!stage) stage = "Novo";
  if (!requestedStage || requestedStage === stage) {
    return { ok: true, stage };
  }
  if (requestedStage === "Não qualificado") {
    if (
      input.allowNonQualified === true &&
      rankFaseOportunidade_(stage) <= rankFaseOportunidade_("Qualificado")
    ) {
      return { ok: true, stage: requestedStage };
    }
    return { ok: true, stage };
  }
  return {
    ok: true,
    stage: rankFaseOportunidade_(requestedStage) >
      rankFaseOportunidade_(stage)
      ? requestedStage
      : stage,
  };
}

function sincronizarFaseOportunidadeELead_(spreadsheet, input) {
  const lock = typeof LockService !== "undefined" &&
    typeof LockService.getDocumentLock === "function"
    ? LockService.getDocumentLock()
    : null;
  if (lock && typeof lock.waitLock === "function") lock.waitLock(15000);

  const rollback = [];
  function writeCell(range, value) {
    rollback.push({ range, value: range.getValue() });
    range.setValue(value);
  }

  try {
    const opportunityResult = resolverOportunidadeCanonica_(
      spreadsheet,
      input || {},
    );
    if (!opportunityResult.ok) return opportunityResult;

    const opportunitySheet = opportunityResult.sheet;
    const found = localizarOportunidadePorId_(
      opportunitySheet,
      opportunityResult.found.values[0],
    );
    if (!found) return { ok: false, reason: "opportunity_disappeared" };

    const opportunityId = String(found.values[0] || "");
    const professional = normalizarProfissionalOportunidade_(
      found.values[3] || input.professional,
    );
    const leadSheetName = String(found.values[4] || "") ||
      nomeAbaLeadOportunidade_(professional);
    const leadSheet = spreadsheet.getSheetByName(leadSheetName);
    if (!leadSheet) return { ok: false, reason: "visible_sheet_not_found" };

    const leadResult = resolverLinhaLeadCanonica_(
      leadSheet,
      opportunityId,
      input.phone || found.values[1],
    );
    if (!leadResult.ok) return leadResult;

    const leadColumns = garantirEstruturaIntegradaLead_(leadSheet);
    const visibleHeaders = mapaCabecalhosOportunidade_(leadSheet);
    const statusColumn = visibleHeaders["Situação do lead"] || 5;
    const statusDateColumn = visibleHeaders["Data da situação"] || 6;
    const visibleStage = String(
      leadSheet.getRange(leadResult.row, statusColumn).getDisplayValue() || "",
    );
    const phaseResult = resolverFaseSincronizada_(
      String(found.values[7] || ""),
      visibleStage,
      input || {},
    );
    if (!phaseResult.ok) return phaseResult;

    const fieldChanges = OPPORTUNITY_SYNC_FIELDS.map(function mapField(field) {
      if (!Object.prototype.hasOwnProperty.call(input, field.input)) {
        return null;
      }
      const value = input[field.input];
      const visibleColumn = leadColumns[field.visible];
      const visibleValue = visibleColumn
        ? leadSheet.getRange(leadResult.row, visibleColumn).getValue()
        : undefined;
      return {
        field,
        value,
        visibleColumn,
        visibleChanged: visibleColumn && String(visibleValue || "") !==
          String(value || ""),
        opportunityChanged: String(found.values[field.opportunityIndex] || "") !==
          String(value || ""),
      };
    }).filter(Boolean);
    const stageChanged = visibleStage !== phaseResult.stage ||
      String(found.values[7] || "") !== phaseResult.stage;
    const metadataChanged = fieldChanges.some(function hasChange(change) {
      return change.visibleChanged || change.opportunityChanged;
    });
    const pointerChanged = String(found.values[4] || "") !== leadSheetName ||
      Number(found.values[5] || 0) !== leadResult.row;
    if (!stageChanged && !metadataChanged && !pointerChanged) {
      return {
        ok: true,
        changed: false,
        opportunityId,
        row: leadResult.row,
        stage: phaseResult.stage,
        previousStage: visibleStage || String(found.values[7] || ""),
        matchedBy: opportunityResult.matchedBy,
      };
    }

    const now = input.at instanceof Date ? input.at : new Date();
    const visibleVersion = Number(
      leadSheet
        .getRange(leadResult.row, leadColumns["Versão da oportunidade"])
        .getValue() || 0,
    );
    const nextVersion = Math.max(
      Number(found.values[22] || 0),
      visibleVersion,
    ) + 1;

    if (visibleStage !== phaseResult.stage) {
      writeCell(
        leadSheet.getRange(leadResult.row, statusColumn),
        phaseResult.stage,
      );
      if (statusDateColumn) {
        writeCell(
          leadSheet.getRange(leadResult.row, statusDateColumn),
          Utilities.formatDate(
            now,
            OPPORTUNITY_STORE_CONFIG.timezone,
            "dd/MM/yyyy",
          ),
        );
      }
    }
    fieldChanges.forEach(function writeVisibleField(change) {
      if (!change.visibleChanged) return;
      writeCell(
        leadSheet.getRange(leadResult.row, change.visibleColumn),
        change.value,
      );
    });
    writeCell(
      leadSheet.getRange(
        leadResult.row,
        leadColumns["Versão da oportunidade"],
      ),
      nextVersion,
    );

    if (pointerChanged) {
      writeCell(opportunitySheet.getRange(found.row, 5), leadSheetName);
      writeCell(opportunitySheet.getRange(found.row, 6), leadResult.row);
    }
    if (String(found.values[7] || "") !== phaseResult.stage) {
      writeCell(opportunitySheet.getRange(found.row, 8), phaseResult.stage);
    }
    fieldChanges.forEach(function writeOpportunityField(change) {
      if (!change.opportunityChanged) return;
      writeCell(
        opportunitySheet.getRange(
          found.row,
          change.field.opportunityIndex + 1,
        ),
        change.value,
      );
    });
    writeCell(opportunitySheet.getRange(found.row, 23), nextVersion);
    if (!found.values[23]) {
      writeCell(opportunitySheet.getRange(found.row, 24), now);
    }
    writeCell(opportunitySheet.getRange(found.row, 25), now);
    if (
      typeof SpreadsheetApp !== "undefined" &&
      typeof SpreadsheetApp.flush === "function"
    ) {
      SpreadsheetApp.flush();
    }

    return {
      ok: true,
      changed: true,
      opportunityId,
      row: leadResult.row,
      stage: phaseResult.stage,
      previousStage: visibleStage || String(found.values[7] || ""),
      version: nextVersion,
      matchedBy: opportunityResult.matchedBy,
    };
  } catch (error) {
    for (let index = rollback.length - 1; index >= 0; index -= 1) {
      try {
        rollback[index].range.setValue(rollback[index].value);
      } catch (_rollbackError) {
        // A falha será exposta ao chamador; a reconciliação posterior repara o par.
      }
    }
    throw error;
  } finally {
    if (lock && typeof lock.releaseLock === "function") lock.releaseLock();
  }
}

function atualizarOportunidadeClassificada_(spreadsheet, input) {
  const result = sincronizarFaseOportunidadeELead_(spreadsheet, input || {});
  return Boolean(result && result.ok);
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
  const resolvedOpportunity = resolverOportunidadeCanonica_(spreadsheet, {
    opportunityId: input.opportunityId,
    phone,
    professional,
  });
  const opportunity = resolvedOpportunity.ok
    ? {
        opportunityId: String(resolvedOpportunity.found.values[0] || ""),
        professional: normalizarProfissionalOportunidade_(
          resolvedOpportunity.found.values[3],
        ),
        sheetName: String(resolvedOpportunity.found.values[4] || "") ||
          nomeAbaLeadOportunidade_(professional),
      }
    : null;
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
