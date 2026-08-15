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

const OPPORTUNITY_ATTRIBUTION_HEADERS = Object.freeze([
  "Origem inicial canônica",
  "Canal inicial",
  "Caminho de conversão inicial",
  "Campanha inicial",
  "Grupo/conjunto inicial",
  "Criativo inicial",
  "Meta Campaign ID inicial",
  "Meta Adset ID inicial",
  "Meta Ad ID inicial",
  "Landing page inicial",
  "Página do CTA inicial",
  "Local do CTA inicial",
  "Confiança inicial",
  "Motivo fallback inicial",
  "Primeiro toque em",
  "Origem da conversa atual",
  "Canal da conversa atual",
  "Caminho de conversão atual",
  "Campanha atual",
  "Grupo/conjunto atual",
  "Criativo atual",
  "Meta Campaign ID atual",
  "Meta Adset ID atual",
  "Meta Ad ID atual",
  "Último toque em",
  "Status da jornada",
  "Origem informada pelo paciente",
  "Confiança da origem informada",
]);

const OPPORTUNITY_INITIAL_ATTRIBUTION_HEADERS = Object.freeze(
  OPPORTUNITY_ATTRIBUTION_HEADERS.slice(0, 15),
);

const OPPORTUNITY_REPORTED_ATTRIBUTION_HEADERS = Object.freeze([
  "Origem informada pelo paciente",
  "Confiança da origem informada",
]);

const OPPORTUNITY_CURRENT_ATTRIBUTION_HEADERS = Object.freeze(
  OPPORTUNITY_ATTRIBUTION_HEADERS.slice(
    OPPORTUNITY_INITIAL_ATTRIBUTION_HEADERS.length,
    -OPPORTUNITY_REPORTED_ATTRIBUTION_HEADERS.length,
  ),
);

const OPPORTUNITY_ALL_HEADERS = Object.freeze(
  OPPORTUNITY_HEADERS.concat(OPPORTUNITY_ATTRIBUTION_HEADERS),
);

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

const LEAD_ATTRIBUTION_HEADERS = Object.freeze([
  "Origem inicial canônica",
  "Canal inicial",
  "Caminho de conversão inicial",
  "Campanha inicial canônica",
  "Grupo/conjunto inicial",
  "Criativo inicial canônico",
  "Landing page inicial",
  "Página do CTA",
  "Origem da conversa atual",
  "Canal da conversa atual",
  "Caminho da conversa atual",
  "Campanha da conversa atual",
  "Grupo/conjunto da conversa atual",
  "Criativo da conversa atual",
  "Meta Campaign ID atual",
  "Meta Adset ID atual",
  "Meta Ad ID atual",
  "Confiança da atribuição",
  "Motivo fallback da atribuição",
  "Primeiro toque em",
  "Último toque em",
  "Origem informada pelo paciente",
  "Confiança da origem informada",
]);

const LEAD_REPORTED_ATTRIBUTION_HEADERS = Object.freeze([
  "Origem informada pelo paciente",
  "Confiança da origem informada",
]);

const LEAD_ALL_INTEGRATION_HEADERS = Object.freeze(
  LEAD_INTEGRATION_HEADERS.concat(LEAD_ATTRIBUTION_HEADERS),
);

function esquemaAtribuicaoAtivo_() {
  return typeof attributionSchemaEnabled_ === "function" &&
    attributionSchemaEnabled_();
}

function cabecalhosOportunidadeAtivos_() {
  return esquemaAtribuicaoAtivo_()
    ? OPPORTUNITY_ALL_HEADERS
    : OPPORTUNITY_HEADERS;
}

function cabecalhosIntegracaoLeadAtivos_() {
  return esquemaAtribuicaoAtivo_()
    ? LEAD_ALL_INTEGRATION_HEADERS
    : LEAD_INTEGRATION_HEADERS;
}

function normalizarAtribuicaoOportunidade_(lead) {
  const input = lead && lead.attribution || {};
  const parsed = typeof decomporReferenciaAquisicao_ === "function"
    ? decomporReferenciaAquisicao_(lead && lead.reference || "")
    : { campaign: "", creative: "" };
  const platform = String(lead && lead.platform || "").trim();
  const platformDefaults = {
    Google: { origin: "Google Ads", channel: "google_ads" },
    Meta: { origin: "Meta Ads", channel: "meta_ads" },
    "Orgânico/Conteúdo": {
      origin: "Desconhecida",
      channel: "unknown",
    },
    "WhatsApp direto": {
      origin: "Desconhecida",
      channel: "unknown",
    },
  };
  const fallback = platformDefaults[platform] || {
    origin: "Desconhecida",
    channel: "unknown",
  };
  const journeyResolved = input.resolved === true;
  const initialOrigin = journeyResolved
    ? input.initialOrigin
    : fallback.origin;
  const initialChannel = journeyResolved
    ? input.initialChannel
    : fallback.channel;
  const campaign = journeyResolved
    ? input.initialCampaignCode || input.campaignCode || ""
    : input.initialCampaignCode ||
      input.campaignCode ||
      parsed.campaign ||
      "";
  const creative = journeyResolved
    ? input.initialCreativeCode || input.creativeCode || ""
    : input.initialCreativeCode ||
      input.creativeCode ||
      parsed.creative ||
      "";
  const currentCampaign = journeyResolved
    ? input.currentCampaignCode || ""
    : campaign;
  const currentCreative = journeyResolved
    ? input.currentCreativeCode || ""
    : creative;
  const reportedOrigin = normalizarOrigemInformadaOportunidade_(
    input.reportedOrigin,
  );

  return {
    "Origem inicial canônica": initialOrigin || "Desconhecida",
    "Canal inicial": initialChannel || "unknown",
    "Caminho de conversão inicial": input.conversionPath || "unknown",
    "Campanha inicial": campaign,
    "Grupo/conjunto inicial": input.initialAdgroupCode || input.adgroupCode || "",
    "Criativo inicial": creative,
    "Meta Campaign ID inicial": input.initialMetaCampaignId || input.metaCampaignId || "",
    "Meta Adset ID inicial": input.initialMetaAdsetId || input.metaAdsetId || "",
    "Meta Ad ID inicial": input.initialMetaAdId || input.metaAdId || "",
    "Landing page inicial": input.landingPage || "",
    "Página do CTA inicial": input.ctaPage || "",
    "Local do CTA inicial": input.ctaLocation || "",
    "Confiança inicial": journeyResolved
      ? input.confidence || "unknown"
      : platform === "Google" || platform === "Meta"
        ? "partial"
        : "unknown",
    "Motivo fallback inicial": input.fallbackReason ||
      lead && lead.attributionFallbackReason || "",
    "Primeiro toque em": input.firstTouchAt || lead && lead.contactAt || "",
    "Origem da conversa atual": input.currentOrigin || initialOrigin || "Desconhecida",
    "Canal da conversa atual": input.currentChannel || initialChannel || "unknown",
    "Caminho de conversão atual": input.conversionPath || "unknown",
    "Campanha atual": currentCampaign,
    "Grupo/conjunto atual": journeyResolved
      ? input.currentAdgroupCode || ""
      : input.initialAdgroupCode || input.adgroupCode || "",
    "Criativo atual": currentCreative,
    "Meta Campaign ID atual": journeyResolved
      ? input.currentMetaCampaignId || ""
      : input.initialMetaCampaignId || input.metaCampaignId || "",
    "Meta Adset ID atual": journeyResolved
      ? input.currentMetaAdsetId || ""
      : input.initialMetaAdsetId || input.metaAdsetId || "",
    "Meta Ad ID atual": journeyResolved
      ? input.currentMetaAdId || ""
      : input.initialMetaAdId || input.metaAdId || "",
    "Último toque em": input.lastTouchAt || lead && lead.contactAt || "",
    "Status da jornada": input.journeyStatus || "absent",
    "Origem informada pelo paciente": reportedOrigin,
    "Confiança da origem informada": reportedOrigin
      ? "patient_reported"
      : "",
  };
}

function normalizarOrigemInformadaOportunidade_(value) {
  const allowed = {
    indicacao: "Indicação",
    instagram: "Instagram",
    google: "Google",
    ia: "IA",
    retorno: "Retorno",
    outro: "Outro",
    "nao sabe": "Não sabe",
  };
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return allowed[normalized] || "";
}

function valoresAtribuicaoOportunidade_(attribution) {
  return OPPORTUNITY_ATTRIBUTION_HEADERS.map(function mapField(header) {
    return Object.prototype.hasOwnProperty.call(attribution, header)
      ? attribution[header]
      : "";
  });
}

function aplicarAtribuicaoOportunidade_(sheet, row, attribution, options) {
  if (!esquemaAtribuicaoAtivo_() || !sheet || !row || !attribution) return;
  options = options && typeof options === "object" ? options : {};
  const columns = garantirCabecalhosAditivos_(
    sheet,
    OPPORTUNITY_ALL_HEADERS,
  );
  if (options.allowInitialFill === true) {
    OPPORTUNITY_INITIAL_ATTRIBUTION_HEADERS.forEach(
      function preserveFirstTouch(header) {
        const column = columns[header];
        if (!column || !attribution[header]) return;
        const current = sheet.getRange(row, column).getValue();
        if (!String(current || "").trim()) {
          sheet.getRange(row, column).setValue(attribution[header]);
        }
      },
    );
  }

  const lastTouchHeader = "Último toque em";
  const currentLastTouch = columns[lastTouchHeader]
    ? sheet.getRange(row, columns[lastTouchHeader]).getValue()
    : "";
  const currentAt = new Date(currentLastTouch || 0).getTime();
  const incomingAt = new Date(attribution[lastTouchHeader] || 0).getTime();
  if (
    !Number.isFinite(currentAt) ||
    !currentLastTouch ||
    (Number.isFinite(incomingAt) && incomingAt >= currentAt)
  ) {
    OPPORTUNITY_CURRENT_ATTRIBUTION_HEADERS.forEach(
      function updateCurrentTouch(header) {
        const column = columns[header];
        if (column && attribution[header] !== undefined) {
          sheet.getRange(row, column).setValue(attribution[header]);
        }
      },
    );
  }

  if (attribution["Origem informada pelo paciente"]) {
    OPPORTUNITY_REPORTED_ATTRIBUTION_HEADERS.forEach(
      function fillReportedOriginOnlyWhenBlank(header) {
        const column = columns[header];
        if (!column || !attribution[header]) return;
        const current = sheet.getRange(row, column).getValue();
        if (!String(current || "").trim()) {
          sheet.getRange(row, column).setValue(attribution[header]);
        }
      },
    );
  }
}

function lerAtribuicaoOportunidade_(sheet, row) {
  if (!esquemaAtribuicaoAtivo_()) return {};
  const columns = garantirCabecalhosAditivos_(
    sheet,
    OPPORTUNITY_ALL_HEADERS,
  );
  return OPPORTUNITY_ATTRIBUTION_HEADERS.reduce(function readField(result, header) {
    const column = columns[header];
    result[header] = column
      ? sheet.getRange(row, column).getValue()
      : "";
    return result;
  }, {});
}

function appendOportunidadePorCabecalho_(sheet, values) {
  const activeHeaders = cabecalhosOportunidadeAtivos_();
  const columns = garantirCabecalhosAditivos_(sheet, activeHeaders);
  const width = Math.max(sheet.getLastColumn(), activeHeaders.length);
  const row = Array(width).fill("");
  Object.keys(values || {}).forEach(function mapValue(header) {
    const column = columns[header];
    if (column) row[column - 1] = values[header];
  });
  sheet.appendRow(row);
}

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
    if (
      typeof sheet.getMaxColumns === "function" &&
      typeof sheet.insertColumnsAfter === "function" &&
      existing.length >= sheet.getMaxColumns()
    ) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), 5);
    }
    // Always append additive fields. Reusing a blank header between legacy
    // positional columns can silently shift appendRow payloads.
    existing.push(header);
    const targetColumn = existing.length;
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
  return garantirCabecalhosAditivos_(
    sheet,
    cabecalhosIntegracaoLeadAtivos_(),
  );
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
  garantirCabecalhosAditivos_(sheet, cabecalhosOportunidadeAtivos_());
  return sheet;
}

function cabecalhosDuplicadosPlanilha_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(function normalize(value) { return String(value || "").trim(); });
  const firstByHeader = {};
  const duplicates = [];
  headers.forEach(function collect(header, index) {
    if (!header) return;
    if (!firstByHeader[header]) {
      firstByHeader[header] = index + 1;
      return;
    }
    duplicates.push({
      header: header,
      firstColumn: firstByHeader[header],
      duplicateColumn: index + 1,
    });
  });
  return duplicates;
}

function normalizarCabecalhoLegadoDuplicado_(sheet, duplicate) {
  if (
    !sheet ||
    !duplicate ||
    duplicate.header !== "Encerrado em"
  ) {
    return false;
  }
  const base = "Encerrado em (legado duplicado)";
  const existing = mapaCabecalhosOportunidade_(sheet);
  let target = base;
  let suffix = 2;
  while (existing[target]) {
    target = base + " " + suffix;
    suffix += 1;
  }
  // Header-only rename: values and column position remain untouched.
  sheet.getRange(1, duplicate.duplicateColumn).setValue(target);
  return true;
}

function atribuicaoLegadaOportunidade_(row, columns) {
  function value(header) {
    const column = columns[header];
    return column ? row[column - 1] : "";
  }
  const reference = String(value("Referência inicial") || "").trim();
  const platform = String(value("Plataforma inicial") || "").trim();
  const parsed = typeof decomporReferenciaAquisicao_ === "function"
    ? decomporReferenciaAquisicao_(reference)
    : { campaign: "", creative: "" };
  let origin = "Desconhecida";
  let channel = "unknown";
  let path = "unknown";
  const legacyPathConflict = /^M26O01W(?:-|$)/i.test(reference);
  if (platform === "Google" || /^G26/i.test(reference)) {
    origin = "Google Ads";
    channel = "google_ads";
    path = "google_site_whatsapp";
  } else if (platform === "Meta" || /^M26/i.test(reference)) {
    origin = "Meta Ads";
    channel = "meta_ads";
    if (/^M26F02S(?:-|$)/i.test(reference)) {
      path = "meta_site_whatsapp";
    } else if (
      !legacyPathConflict &&
      /^M26[A-Z]\d{2}W(?:-|$)/i.test(reference)
    ) {
      path = "meta_whatsapp_direct";
    }
  }
  // “Orgânico/Conteúdo”, SITE and an absent referrer are not enough to
  // distinguish search, AI, social, referral or direct. Preserve the legacy
  // fields and leave the canonical source unknown instead of inventing it.
  const recognizedPaidSource = origin === "Google Ads" || origin === "Meta Ads";
  return {
    "Origem inicial canônica": origin,
    "Canal inicial": channel,
    "Caminho de conversão inicial": path,
    "Campanha inicial": parsed.campaign || "",
    "Grupo/conjunto inicial": "",
    "Criativo inicial": parsed.creative || "",
    "Meta Campaign ID inicial": "",
    "Meta Adset ID inicial": "",
    "Meta Ad ID inicial": "",
    "Landing page inicial": "",
    "Página do CTA inicial": "",
    "Local do CTA inicial": "",
    "Confiança inicial": recognizedPaidSource ? "partial" : "unknown",
    "Motivo fallback inicial": legacyPathConflict
      ? "legacy_path_conflict"
      : recognizedPaidSource
        ? "legacy_paid_backfill"
        : "legacy_source_ambiguous",
    // Neither “Criado em” nor “Atribuição fixada em” proves the timestamp of
    // the first website touch. Keep the canonical timestamp unavailable.
    "Primeiro toque em": "",
    "Origem da conversa atual": "",
    "Canal da conversa atual": "",
    "Caminho de conversão atual": "",
    "Campanha atual": "",
    "Grupo/conjunto atual": "",
    "Criativo atual": "",
    "Meta Campaign ID atual": "",
    "Meta Adset ID atual": "",
    "Meta Ad ID atual": "",
    "Último toque em": "",
    "Status da jornada": "absent",
    "Origem informada pelo paciente": "",
    "Confiança da origem informada": "",
  };
}

function migrarSchemaAtribuicaoV1(input) {
  input = input && typeof input === "object" ? input : {};
  const apply = input.apply === true;
  if (apply && input.confirmation !== "APLICAR_SCHEMA_ATRIBUICAO_V1") {
    throw new Error("attribution_schema_migration_confirmation_required");
  }
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const eventSheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);
  const visibleSheets = [
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    OPPORTUNITY_STORE_CONFIG.danielSheetName,
  ].map(function resolveVisible(name) {
    return { name: name, sheet: spreadsheet.getSheetByName(name) };
  });
  const opportunityDuplicates = opportunitySheet
    ? cabecalhosDuplicadosPlanilha_(opportunitySheet)
    : [];
  const eventDuplicates = eventSheet
    ? cabecalhosDuplicadosPlanilha_(eventSheet)
    : [];
  const visibleDuplicates = visibleSheets.reduce(function collect(result, item) {
    if (!item.sheet) return result;
    return result.concat(
      cabecalhosDuplicadosPlanilha_(item.sheet).map(function withSheet(duplicate) {
        return Object.assign({ sheet: item.name }, duplicate);
      }),
    );
  }, []);
  const unsupportedOpportunityDuplicates = opportunityDuplicates.filter(
    function unsupported(item) {
    return item.header !== "Encerrado em";
    },
  );
  const unsupportedDuplicates = unsupportedOpportunityDuplicates
    .map(function withSheet(item) {
      return Object.assign({ sheet: OPPORTUNITY_STORE_CONFIG.sheetName }, item);
    })
    .concat(eventDuplicates.map(function withSheet(item) {
      return Object.assign({ sheet: CONFIG.eventSheetName }, item);
    }))
    .concat(visibleDuplicates);
  const missingVisibleSheets = visibleSheets.filter(function missing(item) {
    return !item.sheet;
  }).map(function name(item) { return item.name; });
  const identityHmacReady =
    typeof segredoIdentidadeLead_ === "function" &&
    Boolean(segredoIdentidadeLead_(true));
  const result = {
    ok: Boolean(
      opportunitySheet &&
      eventSheet &&
      missingVisibleSheets.length === 0 &&
      identityHmacReady
    ),
    blocked:
      !opportunitySheet ||
      !eventSheet ||
      missingVisibleSheets.length > 0 ||
      !identityHmacReady ||
      unsupportedDuplicates.length > 0,
    mode: apply ? "applied" : "dry_run",
    opportunitySheetFound: Boolean(opportunitySheet),
    eventSheetFound: Boolean(eventSheet),
    visibleSheetsFound: visibleSheets.filter(function found(item) {
      return Boolean(item.sheet);
    }).map(function name(item) { return item.name; }),
    duplicateHeaders: opportunityDuplicates.map(function safeDuplicate(item) {
      return {
        sheet: OPPORTUNITY_STORE_CONFIG.sheetName,
        header: item.header,
        firstColumn: item.firstColumn,
        duplicateColumn: item.duplicateColumn,
      };
    }),
    eventDuplicateHeaders: eventDuplicates.map(function safeDuplicate(item) {
      return {
        sheet: CONFIG.eventSheetName,
        header: item.header,
        firstColumn: item.firstColumn,
        duplicateColumn: item.duplicateColumn,
      };
    }),
    visibleDuplicateHeaders: visibleDuplicates,
    missingVisibleSheets: missingVisibleSheets,
    unsupportedDuplicateHeaders: unsupportedDuplicates.length,
    identityHmacReady: identityHmacReady,
    opportunityRowsScanned: 0,
    opportunityRowsToBackfill: 0,
    visibleRowsToProject: 0,
    eventHeadersToAdd: 0,
    opportunityHeadersToAdd: 0,
    visibleHeadersToAdd: 0,
  };
  if (result.blocked) return result;

  function missingHeaderCount(sheet, headers) {
    const map = mapaCabecalhosOportunidade_(sheet);
    return headers.filter(function missing(header) { return !map[header]; }).length;
  }
  result.eventHeadersToAdd = missingHeaderCount(eventSheet, WHATSAPP_EVENT_HEADERS);
  result.opportunityHeadersToAdd = missingHeaderCount(
    opportunitySheet,
    OPPORTUNITY_ALL_HEADERS,
  );
  visibleSheets.forEach(function countVisible(item) {
    if (!item.sheet) return;
    result.visibleHeadersToAdd += missingHeaderCount(
      item.sheet,
      LEAD_ALL_INTEGRATION_HEADERS,
    );
  });

  const currentOpportunityColumns = mapaCabecalhosOportunidade_(opportunitySheet);
  let opportunityRows = [];
  if (opportunitySheet.getLastRow() >= 2) {
    opportunityRows = opportunitySheet.getRange(
      2,
      1,
      opportunitySheet.getLastRow() - 1,
      opportunitySheet.getLastColumn(),
    ).getValues();
  }
  result.opportunityRowsScanned = opportunityRows.length;
  result.opportunityRowsToBackfill = opportunityRows.filter(function needs(row) {
    const initialColumn = currentOpportunityColumns["Origem inicial canônica"];
    if (initialColumn && String(row[initialColumn - 1] || "").trim()) {
      return false;
    }
    return (
      atribuicaoLegadaOportunidade_(row, currentOpportunityColumns)[
        "Origem inicial canônica"
      ] !== "Desconhecida"
    );
  }).length;

  visibleSheets.forEach(function countProjection(item) {
    if (!item.sheet || item.sheet.getLastRow() < 2) return;
    const columns = mapaCabecalhosOportunidade_(item.sheet);
    const opportunityColumn = columns["Opportunity ID"];
    if (!opportunityColumn) return;
    const values = item.sheet.getRange(
      2,
      opportunityColumn,
      item.sheet.getLastRow() - 1,
      1,
    ).getDisplayValues();
    result.visibleRowsToProject += values.filter(function linked(row) {
      return Boolean(String(row[0] || "").trim());
    }).length;
  });

  if (!apply) return result;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    opportunityDuplicates.forEach(function renameKnownDuplicate(item) {
      normalizarCabecalhoLegadoDuplicado_(opportunitySheet, item);
    });
    garantirCabecalhosAditivos_(eventSheet, WHATSAPP_EVENT_HEADERS);
    const opportunityColumns = garantirCabecalhosAditivos_(
      opportunitySheet,
      OPPORTUNITY_ALL_HEADERS,
    );
    const attributionByOpportunity = {};
    opportunityRows.forEach(function backfill(row, index) {
      const opportunityId = String(
        row[(currentOpportunityColumns["Opportunity ID"] || 1) - 1] || "",
      ).trim();
      if (!opportunityId) return;
      const legacy = atribuicaoLegadaOportunidade_(
        row,
        currentOpportunityColumns,
      );
      const existingInitialOriginColumn =
        currentOpportunityColumns["Origem inicial canônica"];
      const existingInitialOrigin = existingInitialOriginColumn
        ? String(row[existingInitialOriginColumn - 1] || "").trim()
        : "";
      const canBackfillInitial =
        !existingInitialOrigin &&
        legacy["Origem inicial canônica"] !== "Desconhecida";
      const resolvedAttribution = {};
      OPPORTUNITY_INITIAL_ATTRIBUTION_HEADERS.forEach(
        function fillOnlyBlank(header) {
          const column = opportunityColumns[header];
          if (!column) return;
          const current = opportunitySheet.getRange(index + 2, column).getValue();
          if (
            canBackfillInitial &&
            !String(current || "").trim() &&
            legacy[header]
          ) {
            opportunitySheet.getRange(index + 2, column).setValue(legacy[header]);
            resolvedAttribution[header] = legacy[header];
            return;
          }
          resolvedAttribution[header] = current || "";
        },
      );
      OPPORTUNITY_REPORTED_ATTRIBUTION_HEADERS.forEach(
        function preserveReportedOrigin(header) {
          const column = opportunityColumns[header];
          resolvedAttribution[header] = column
            ? opportunitySheet.getRange(index + 2, column).getValue()
            : "";
        },
      );
      const statusColumn = opportunityColumns["Status da jornada"];
      if (statusColumn) {
        const currentStatus = opportunitySheet
          .getRange(index + 2, statusColumn)
          .getValue();
        if (!String(currentStatus || "").trim()) {
          opportunitySheet.getRange(index + 2, statusColumn).setValue("absent");
        }
      }
      attributionByOpportunity[opportunityId] = resolvedAttribution;
    });

    visibleSheets.forEach(function projectVisible(item) {
      if (!item.sheet || item.sheet.getLastRow() < 2) return;
      const columns = garantirCabecalhosAditivos_(
        item.sheet,
        LEAD_ALL_INTEGRATION_HEADERS,
      );
      const opportunityColumn = columns["Opportunity ID"];
      if (!opportunityColumn) return;
      const ids = item.sheet.getRange(
        2,
        opportunityColumn,
        item.sheet.getLastRow() - 1,
        1,
      ).getDisplayValues();
      ids.forEach(function project(row, index) {
        const attribution = attributionByOpportunity[
          String(row[0] || "").trim()
        ];
        if (!attribution) return;
        const values = {
          "Origem inicial canônica": attribution["Origem inicial canônica"],
          "Canal inicial": attribution["Canal inicial"],
          "Caminho de conversão inicial": attribution["Caminho de conversão inicial"],
          "Campanha inicial canônica": attribution["Campanha inicial"],
          "Grupo/conjunto inicial": attribution["Grupo/conjunto inicial"],
          "Criativo inicial canônico": attribution["Criativo inicial"],
          "Landing page inicial": attribution["Landing page inicial"],
          "Página do CTA": attribution["Página do CTA inicial"],
          "Confiança da atribuição": attribution["Confiança inicial"],
          "Motivo fallback da atribuição": attribution["Motivo fallback inicial"],
          "Primeiro toque em": attribution["Primeiro toque em"],
          "Origem informada pelo paciente":
            attribution["Origem informada pelo paciente"],
          "Confiança da origem informada":
            attribution["Confiança da origem informada"],
        };
        Object.keys(values).forEach(function fillVisible(header) {
          const column = columns[header];
          if (!column || !values[header]) return;
          const current = item.sheet.getRange(index + 2, column).getValue();
          if (!String(current || "").trim()) {
            item.sheet.getRange(index + 2, column).setValue(values[header]);
          }
        });
      });
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return result;
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
  const owner = normalizarProfissionalOportunidade_(professional);
  const randomId = String(Utilities.getUuid()).replace(/[^A-Za-z0-9-]/g, "");
  return ["opp_v2", owner || "unknown", randomId].join("_");
}

function pseudonimoTelefoneOportunidade_(phone) {
  return typeof pseudonimoIdentidadeLead_ === "function"
    ? pseudonimoIdentidadeLead_(normalizePhone_(phone))
    : "";
}

function migrarPseudonimosIdentidadeLead(input) {
  input = input && typeof input === "object" ? input : {};
  const apply = input.apply === true;
  if (apply && input.confirmation !== "APLICAR_HMAC_IDENTIDADE_K1") {
    throw new Error("identity_migration_confirmation_required");
  }
  if (typeof segredoIdentidadeLead_ !== "function") {
    throw new Error("identity_hmac_not_available");
  }
  segredoIdentidadeLead_(false);

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const opportunitySheet = spreadsheet.getSheetByName(
    OPPORTUNITY_STORE_CONFIG.sheetName,
  );
  const opportunityColumns = opportunitySheet
    ? mapaCabecalhosOportunidade_(opportunitySheet)
    : {};
  const missingOpportunityHeaders = [
    "Opportunity ID",
    "Telefone (E.164)",
    "Telefone hash",
  ].filter(function missing(header) { return !opportunityColumns[header]; });
  const stageSheet = spreadsheet.getSheetByName(
    CONFIG.leadStageEventSheetName,
  );
  const stageColumns = stageSheet
    ? mapaCabecalhosOportunidade_(stageSheet)
    : {};
  const missingStageHeaders = stageSheet
    ? ["Opportunity ID", "Telefone hash"].filter(function missing(header) {
        return !stageColumns[header];
      })
    : [];
  const blocked =
    !opportunitySheet ||
    missingOpportunityHeaders.length > 0 ||
    missingStageHeaders.length > 0;
  if (blocked) {
    return {
      ok: false,
      blocked: true,
      mode: apply ? "apply_blocked" : "dry_run",
      keyVersion: versaoChaveIdentidadeLead_(),
      opportunitySheetFound: Boolean(opportunitySheet),
      stageSheetFound: Boolean(stageSheet),
      missingOpportunityHeaders: missingOpportunityHeaders,
      missingStageHeaders: missingStageHeaders,
      opportunityRowsScanned: 0,
      opportunityRowsToUpdate: 0,
      stageRowsToUpdate: 0,
    };
  }
  const opportunityIdColumn = opportunityColumns["Opportunity ID"];
  const phoneColumn = opportunityColumns["Telefone (E.164)"];
  const hashColumn = opportunityColumns["Telefone hash"];
  const mapping = {};
  const opportunityUpdates = [];
  if (opportunitySheet.getLastRow() >= 2) {
    const rows = opportunitySheet
      .getRange(
        2,
        1,
        opportunitySheet.getLastRow() - 1,
        opportunitySheet.getLastColumn(),
      )
      .getDisplayValues();
    rows.forEach(function planOpportunity(row, index) {
      const opportunityId = String(row[opportunityIdColumn - 1] || "").trim();
      const phone = normalizePhone_(row[phoneColumn - 1]);
      if (!opportunityId || !phone) return;
      const target = pseudonimoIdentidadeLead_(phone);
      if (!target) throw new Error("identity_pseudonym_unavailable");
      mapping[opportunityId] = target;
      const current = String(row[hashColumn - 1] || "").trim();
      if (current !== target) {
        opportunityUpdates.push({ row: index + 2, value: target });
      }
    });
  }

  const stageUpdates = [];
  if (stageSheet && stageSheet.getLastRow() >= 2) {
    const rows = stageSheet
      .getRange(2, 1, stageSheet.getLastRow() - 1, stageSheet.getLastColumn())
      .getDisplayValues();
    rows.forEach(function planStageEvent(row, index) {
      const opportunityId = String(
        row[stageColumns["Opportunity ID"] - 1] || "",
      ).trim();
      const target = mapping[opportunityId];
      if (!target) return;
      const current = String(
        row[stageColumns["Telefone hash"] - 1] || "",
      ).trim();
      if (current !== target) {
        stageUpdates.push({
          row: index + 2,
          column: stageColumns["Telefone hash"],
          value: target,
        });
      }
    });
  }

  if (apply) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      opportunityUpdates.forEach(function updateOpportunity(update) {
        opportunitySheet
          .getRange(update.row, hashColumn)
          .setValue(update.value);
      });
      stageUpdates.forEach(function updateStageEvent(update) {
        stageSheet
          .getRange(update.row, update.column)
          .setValue(update.value);
      });
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  }

  return {
    ok: true,
    blocked: false,
    mode: apply ? "applied" : "dry_run",
    keyVersion: versaoChaveIdentidadeLead_(),
    opportunityRowsScanned: Object.keys(mapping).length,
    opportunityRowsToUpdate: opportunityUpdates.length,
    stageRowsToUpdate: stageUpdates.length,
  };
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
    "Origem inicial canônica": opportunity.attribution &&
      opportunity.attribution["Origem inicial canônica"],
    "Canal inicial": opportunity.attribution &&
      opportunity.attribution["Canal inicial"],
    "Caminho de conversão inicial": opportunity.attribution &&
      opportunity.attribution["Caminho de conversão inicial"],
    "Campanha inicial canônica": opportunity.attribution &&
      opportunity.attribution["Campanha inicial"],
    "Grupo/conjunto inicial": opportunity.attribution &&
      opportunity.attribution["Grupo/conjunto inicial"],
    "Criativo inicial canônico": opportunity.attribution &&
      opportunity.attribution["Criativo inicial"],
    "Landing page inicial": opportunity.attribution &&
      opportunity.attribution["Landing page inicial"],
    "Página do CTA": opportunity.attribution &&
      opportunity.attribution["Página do CTA inicial"],
    "Origem da conversa atual": opportunity.attribution &&
      opportunity.attribution["Origem da conversa atual"],
    "Canal da conversa atual": opportunity.attribution &&
      opportunity.attribution["Canal da conversa atual"],
    "Caminho da conversa atual": opportunity.attribution &&
      opportunity.attribution["Caminho de conversão atual"],
    "Campanha da conversa atual": opportunity.attribution &&
      opportunity.attribution["Campanha atual"],
    "Grupo/conjunto da conversa atual": opportunity.attribution &&
      opportunity.attribution["Grupo/conjunto atual"],
    "Criativo da conversa atual": opportunity.attribution &&
      opportunity.attribution["Criativo atual"],
    "Meta Campaign ID atual": opportunity.attribution &&
      opportunity.attribution["Meta Campaign ID atual"],
    "Meta Adset ID atual": opportunity.attribution &&
      opportunity.attribution["Meta Adset ID atual"],
    "Meta Ad ID atual": opportunity.attribution &&
      opportunity.attribution["Meta Ad ID atual"],
    "Confiança da atribuição": opportunity.attribution &&
      opportunity.attribution["Confiança inicial"],
    "Motivo fallback da atribuição": opportunity.attribution &&
      opportunity.attribution["Motivo fallback inicial"],
    "Primeiro toque em": opportunity.attribution &&
      opportunity.attribution["Primeiro toque em"],
    "Último toque em": opportunity.attribution &&
      opportunity.attribution["Último toque em"],
    "Origem informada pelo paciente": opportunity.attribution &&
      opportunity.attribution["Origem informada pelo paciente"],
    "Confiança da origem informada": opportunity.attribution &&
      opportunity.attribution["Confiança da origem informada"],
  };
  cabecalhosIntegracaoLeadAtivos_().forEach(function writeMappedField(header) {
    if (!Object.prototype.hasOwnProperty.call(values, header)) return;
    const column = columns[header];
    if (!column || values[header] === undefined) return;
    if (LEAD_REPORTED_ATTRIBUTION_HEADERS.includes(header)) {
      if (!values[header]) return;
      const current = sheet.getRange(row, column).getValue();
      if (String(current || "").trim()) return;
    }
    sheet.getRange(row, column).setValue(values[header]);
  });
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
  let opportunityAttribution = esquemaAtribuicaoAtivo_()
    ? normalizarAtribuicaoOportunidade_(lead)
    : {};

  if (!found) {
    const opportunityValues = {
      "Opportunity ID": opportunityId,
      "Telefone (E.164)": lead.phone,
      "Telefone hash": pseudonimoTelefoneOportunidade_(lead.phone),
      "Profissional": route.professional,
      "Aba visível": route.sheetName,
      "Linha visível": leadRow || "",
      "Estado": "open",
      "Fase": "Novo",
      "Relacionamento": "new_lead",
      "Responsável atual": "bruna",
      "Aguardando ação de": "patient",
      "Referência inicial": lead.reference || "",
      "Plataforma inicial": lead.platform || "",
      "GCLID": clickIds[0],
      "GBRAID": clickIds[1],
      "WBRAID": clickIds[2],
      "Atribuição fixada em": attributionLockedAt,
      "Primeiro Event ID": lead.eventId,
      "Último Event ID": lead.eventId,
      "Versão": 1,
      "Criado em": now,
      "Atualizado em": now,
    };
    if (esquemaAtribuicaoAtivo_()) {
      OPPORTUNITY_ATTRIBUTION_HEADERS.forEach(function addAttribution(header) {
        opportunityValues[header] = opportunityAttribution[header] || "";
      });
    }
    appendOportunidadePorCabecalho_(sheet, opportunityValues);
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
    aplicarAtribuicaoOportunidade_(
      sheet,
      row,
      opportunityAttribution,
      { allowInitialFill: false },
    );
    opportunityAttribution = esquemaAtribuicaoAtivo_()
      ? lerAtribuicaoOportunidade_(sheet, row)
      : {};
  }

  const opportunity = {
    opportunityId,
    professional: route.professional,
    lastEventId: lead.eventId,
    operationalStatus: "open",
    owner: "bruna",
    expectedParty: "patient",
    attributionLockedAt,
    attribution: opportunityAttribution,
  };
  vincularOportunidadeAoLead_(
    leadSheet,
    leadRow,
    opportunity,
    route.routeStatus,
  );
  if (typeof atualizarLinhaFunilCanonicoPorOportunidade_ === "function") {
    try {
      atualizarLinhaFunilCanonicoPorOportunidade_(spreadsheet, opportunityId);
    } catch (dashboardError) {
      console.error(
        "FUNNEL_DASHBOARD_INCREMENTAL_ERROR " +
        String(dashboardError && dashboardError.message || dashboardError),
      );
    }
  }
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
      if (typeof atualizarLinhaFunilCanonicoPorOportunidade_ === "function") {
        try {
          atualizarLinhaFunilCanonicoPorOportunidade_(spreadsheet, opportunityId);
        } catch (dashboardError) {
          console.error(
            "FUNNEL_DASHBOARD_INCREMENTAL_ERROR " +
            String(dashboardError && dashboardError.message || dashboardError),
          );
        }
      }
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
    if (typeof atualizarLinhaFunilCanonicoPorOportunidade_ === "function") {
      try {
        atualizarLinhaFunilCanonicoPorOportunidade_(spreadsheet, opportunityId);
      } catch (dashboardError) {
        console.error(
          "FUNNEL_DASHBOARD_INCREMENTAL_ERROR " +
          String(dashboardError && dashboardError.message || dashboardError),
        );
      }
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
  if (typeof atualizarLinhaFunilCanonicoPorOportunidade_ === "function") {
    try {
      atualizarLinhaFunilCanonicoPorOportunidade_(
        spreadsheet,
        input.opportunityId,
      );
    } catch (dashboardError) {
      console.error(
        "FUNNEL_DASHBOARD_INCREMENTAL_ERROR " +
        String(dashboardError && dashboardError.message || dashboardError),
      );
    }
  }
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
