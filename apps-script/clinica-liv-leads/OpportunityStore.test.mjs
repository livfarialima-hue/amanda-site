import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./OpportunityStore.gs", import.meta.url),
  "utf8",
);

function load({ schemaEnabled = true, spreadsheet = null } = {}) {
  const sandbox = {
    Object,
    String,
    Number,
    Date,
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha" },
      Charset: { UTF_8: "utf8" },
      computeDigest(_algorithm, value) {
        return Array.from({ length: 32 }, (_, index) =>
          String(value || "").charCodeAt(index % Math.max(String(value || "").length, 1)) || index,
        );
      },
      getUuid: () => "uuid",
      formatDate: () => "14/08/2026",
    },
    LockService: {
      getDocumentLock: () => ({
        waitLock() {},
        releaseLock() {},
      }),
      getScriptLock: () => ({
        waitLock() {},
        releaseLock() {},
      }),
    },
    SpreadsheetApp: {
      flush() {},
      openById() {
        if (!spreadsheet) throw new Error("test_spreadsheet_not_configured");
        return spreadsheet;
      },
    },
    CONFIG: {
      spreadsheetId: "synthetic-sheet",
      leadStageEventSheetName: "_LEAD_FASE_EVENTOS",
      eventSheetName: "_WHATSAPP_EVENTOS",
    },
    WHATSAPP_EVENT_HEADERS: Object.freeze([
      "Message ID",
      "Event ID",
      "Origem inicial canônica",
    ]),
    normalizePhone_(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits ? `+${digits}` : "";
    },
    attributionSchemaEnabled_: () => schemaEnabled,
    segredoIdentidadeLead_: () => "s".repeat(43),
    versaoChaveIdentidadeLead_: () => "k1",
    pseudonimoIdentidadeLead_: (value) => `pid_k1_${String(value || "").replace(/\D/g, "")}`,
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { resolverRotaLead_, resolverRotaLeadComContexto_, criarOpportunityId_, resolverLinhaLeadCanonica_, resolverFaseSincronizada_, sincronizarFaseOportunidadeELead_, aplicarAtribuicaoOportunidade_, lerAtribuicaoOportunidade_, atribuicaoLegadaOportunidade_, normalizarAtribuicaoOportunidade_, vincularOportunidadeAoLead_, migrarPseudonimosIdentidadeLead, migrarSchemaAtribuicaoV1, OPPORTUNITY_STORE_CONFIG, OPPORTUNITY_HEADERS, OPPORTUNITY_ALL_HEADERS, OPPORTUNITY_ATTRIBUTION_HEADERS, OPPORTUNITY_STAGE_VALUES, LEAD_INTEGRATION_HEADERS, LEAD_ALL_INTEGRATION_HEADERS };`,
    sandbox,
  );
  return sandbox.__test;
}

function makeSheet(name, headers, rows) {
  const data = [headers.slice(), ...rows.map((row) => row.slice())];
  let writeCount = 0;
  let maxColumns = Math.max(...data.map((row) => row.length));
  return {
    data,
    getWriteCount: () => writeCount,
    getName: () => name,
    getLastRow: () => data.length,
    getLastColumn: () => Math.max(...data.map((row) => row.length)),
    getMaxColumns: () => maxColumns,
    getMaxRows: () => data.length,
    insertColumnsAfter(_after, count) {
      writeCount += 1;
      maxColumns += Number(count) || 0;
    },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      const range = {
        getValue: () => data[row - 1]?.[column - 1] ?? "",
        getDisplayValue: () => String(data[row - 1]?.[column - 1] ?? ""),
        getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
          Array.from({ length: columnCount }, (_, columnOffset) =>
            data[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? "",
          ),
        ),
        getDisplayValues: () => Array.from(
          { length: rowCount },
          (_, rowOffset) => Array.from(
            { length: columnCount },
            (_, columnOffset) => String(
              data[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? "",
            ),
          ),
        ),
        setValue(value) {
          writeCount += 1;
          while (data.length < row) data.push([]);
          data[row - 1][column - 1] = value;
          return range;
        },
        setValues(values) {
          writeCount += 1;
          values.forEach((valuesRow, rowOffset) => {
            valuesRow.forEach((value, columnOffset) => {
              while (data.length < row + rowOffset) data.push([]);
              data[row - 1 + rowOffset][column - 1 + columnOffset] = value;
            });
          });
          return range;
        },
        clearDataValidations() {
          return range;
        },
        createTextFinder(search) {
          return {
            matchEntireCell() {
              return this;
            },
            findNext() {
              for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
                for (
                  let columnOffset = 0;
                  columnOffset < columnCount;
                  columnOffset += 1
                ) {
                  if (
                    String(
                      data[row - 1 + rowOffset]?.[
                        column - 1 + columnOffset
                      ] ?? "",
                    ) === String(search)
                  ) {
                    return { getRow: () => row + rowOffset };
                  }
                }
              }
              return null;
            },
          };
        },
      };
      return range;
    },
  };
}

test("one workbook keeps Amanda as the only Google Ads source", () => {
  const { OPPORTUNITY_STORE_CONFIG } = load();
  assert.equal(
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    "Google Ads - Conversões",
  );
  assert.equal(OPPORTUNITY_STORE_CONFIG.danielSheetName, "Leads Dr. Daniel");
});

test("routing separates Amanda, Daniel, external and unresolved contacts", () => {
  const { resolverRotaLead_ } = load();
  assert.equal(
    resolverRotaLead_({ professional: "daniel" }).professional,
    "daniel",
  );
  assert.equal(
    resolverRotaLead_({ professional: "henrique" }).routeStatus,
    "nonlead",
  );
  assert.equal(
    resolverRotaLead_({ platform: "Google", reference: "G26LIFT" }).professional,
    "amanda",
  );
  assert.equal(
    resolverRotaLead_({ platform: "WhatsApp direto" }).routeStatus,
    "pending",
  );
});

test("the same event produces different opportunity ids by professional", () => {
  const { criarOpportunityId_ } = load();
  assert.notEqual(
    criarOpportunityId_("amanda", "event-1"),
    criarOpportunityId_("daniel", "event-1"),
  );
});

test("first attribution is immutable while a newer current touch advances", () => {
  const {
    aplicarAtribuicaoOportunidade_,
    lerAtribuicaoOportunidade_,
    OPPORTUNITY_ALL_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const row = Array(OPPORTUNITY_ALL_HEADERS.length).fill("");
  row[0] = "opp-1";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Origem inicial canônica")] = "Meta Ads";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Canal inicial")] = "meta_ads";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Campanha inicial")] = "M26F02S";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Último toque em")] =
    "2026-08-15T10:00:00.000Z";
  const sheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.sheetName,
    Array.from(OPPORTUNITY_ALL_HEADERS),
    [row],
  );

  aplicarAtribuicaoOportunidade_(sheet, 2, {
    "Origem inicial canônica": "Google Ads",
    "Canal inicial": "google_ads",
    "Campanha inicial": "G26LIFT",
    "Origem da conversa atual": "Acesso direto",
    "Canal da conversa atual": "direct",
    "Caminho de conversão atual": "meta_site_return_whatsapp",
    "Campanha atual": "M26F02S",
    "Criativo atual": "C01H01",
    "Último toque em": "2026-08-15T12:00:00.000Z",
    "Status da jornada": "resolved",
  });
  const attribution = lerAtribuicaoOportunidade_(sheet, 2);

  assert.equal(attribution["Origem inicial canônica"], "Meta Ads");
  assert.equal(attribution["Canal inicial"], "meta_ads");
  assert.equal(attribution["Campanha inicial"], "M26F02S");
  assert.equal(attribution["Origem da conversa atual"], "Acesso direto");
  assert.equal(attribution["Canal da conversa atual"], "direct");
  assert.equal(attribution["Último toque em"], "2026-08-15T12:00:00.000Z");
});

test("reported origin fills CRM separately without overwriting observed touches", () => {
  const {
    aplicarAtribuicaoOportunidade_,
    lerAtribuicaoOportunidade_,
    OPPORTUNITY_ALL_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const row = Array(OPPORTUNITY_ALL_HEADERS.length).fill("");
  row[0] = "opp-reported-1";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Origem inicial canônica")] = "Meta Ads";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Canal inicial")] = "meta_ads";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Origem da conversa atual")] = "Google Ads";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Canal da conversa atual")] = "google_ads";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Último toque em")] =
    "2026-08-15T12:00:00.000Z";
  const sheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.sheetName,
    Array.from(OPPORTUNITY_ALL_HEADERS),
    [row],
  );

  aplicarAtribuicaoOportunidade_(sheet, 2, {
    "Origem informada pelo paciente": "Indicação",
    "Confiança da origem informada": "patient_reported",
  });
  aplicarAtribuicaoOportunidade_(sheet, 2, {
    "Origem informada pelo paciente": "Instagram",
    "Confiança da origem informada": "patient_reported",
  });
  const attribution = lerAtribuicaoOportunidade_(sheet, 2);

  assert.equal(attribution["Origem inicial canônica"], "Meta Ads");
  assert.equal(attribution["Canal inicial"], "meta_ads");
  assert.equal(attribution["Origem da conversa atual"], "Google Ads");
  assert.equal(attribution["Canal da conversa atual"], "google_ads");
  assert.equal(attribution["Origem informada pelo paciente"], "Indicação");
  assert.equal(
    attribution["Confiança da origem informada"],
    "patient_reported",
  );
});

test("reported origin projects to LEADS only into blank dedicated fields", () => {
  const {
    vincularOportunidadeAoLead_,
    LEAD_ALL_INTEGRATION_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const headers = Array.from(LEAD_ALL_INTEGRATION_HEADERS);
  const row = Array(headers.length).fill("");
  const sheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    headers,
    [row],
  );
  const baseOpportunity = {
    opportunityId: "opp-reported-1",
    professional: "amanda",
    lastEventId: "event-1",
    attribution: {
      "Origem inicial canônica": "Meta Ads",
      "Canal inicial": "meta_ads",
      "Origem da conversa atual": "Google Ads",
      "Canal da conversa atual": "google_ads",
      "Origem informada pelo paciente": "Indicação",
      "Confiança da origem informada": "patient_reported",
    },
  };

  vincularOportunidadeAoLead_(sheet, 2, baseOpportunity, "resolved");
  assert.equal(
    sheet.data[1][headers.indexOf("Origem informada pelo paciente")],
    "Indicação",
  );
  assert.equal(
    sheet.data[1][headers.indexOf("Confiança da origem informada")],
    "patient_reported",
  );

  vincularOportunidadeAoLead_(sheet, 2, {
    ...baseOpportunity,
    attribution: {
      ...baseOpportunity.attribution,
      "Origem informada pelo paciente": "Instagram",
    },
  }, "resolved");
  assert.equal(
    sheet.data[1][headers.indexOf("Origem informada pelo paciente")],
    "Indicação",
  );
  assert.equal(
    sheet.data[1][headers.indexOf("Origem inicial canônica")],
    "Meta Ads",
  );
  assert.equal(
    sheet.data[1][headers.indexOf("Origem da conversa atual")],
    "Google Ads",
  );
});

test("a later event never becomes first touch for a legacy blank opportunity", () => {
  const {
    aplicarAtribuicaoOportunidade_,
    lerAtribuicaoOportunidade_,
    OPPORTUNITY_ALL_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const row = Array(OPPORTUNITY_ALL_HEADERS.length).fill("");
  row[0] = "opp-v1-legacy";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Referência inicial")] = "SITE-avaliacao-facial";
  row[OPPORTUNITY_ALL_HEADERS.indexOf("Plataforma inicial")] = "Orgânico/Conteúdo";
  const sheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.sheetName,
    Array.from(OPPORTUNITY_ALL_HEADERS),
    [row],
  );

  aplicarAtribuicaoOportunidade_(sheet, 2, {
    "Origem inicial canônica": "Google Ads",
    "Canal inicial": "google_ads",
    "Caminho de conversão inicial": "google_site_whatsapp",
    "Campanha inicial": "G26LIFT",
    "Origem da conversa atual": "Google Ads",
    "Canal da conversa atual": "google_ads",
    "Caminho de conversão atual": "google_site_whatsapp",
    "Campanha atual": "G26LIFT",
    "Último toque em": "2026-08-15T12:00:00.000Z",
    "Status da jornada": "resolved",
  }, { allowInitialFill: false });
  const attribution = lerAtribuicaoOportunidade_(sheet, 2);

  assert.equal(attribution["Origem inicial canônica"], "");
  assert.equal(attribution["Canal inicial"], "");
  assert.equal(attribution["Campanha inicial"], "");
  assert.equal(attribution["Origem da conversa atual"], "Google Ads");
  assert.equal(attribution["Campanha atual"], "G26LIFT");
});

test("ambiguous SITE history is not rewritten as organic or given a synthetic first-touch time", () => {
  const {
    atribuicaoLegadaOportunidade_,
    OPPORTUNITY_HEADERS,
  } = load();
  const columns = Object.fromEntries(
    OPPORTUNITY_HEADERS.map((header, index) => [header, index + 1]),
  );
  const row = Array(OPPORTUNITY_HEADERS.length).fill("");
  row[columns["Referência inicial"] - 1] = "SITE-avaliacao-facial";
  row[columns["Plataforma inicial"] - 1] = "Orgânico/Conteúdo";
  row[columns["Atribuição fixada em"] - 1] = "15/08/2026 10:00:00";
  row[columns["Criado em"] - 1] = "15/08/2026 10:01:00";
  const attribution = atribuicaoLegadaOportunidade_(row, columns);
  assert.equal(attribution["Origem inicial canônica"], "Desconhecida");
  assert.equal(attribution["Canal inicial"], "unknown");
  assert.equal(attribution["Caminho de conversão inicial"], "unknown");
  assert.equal(attribution["Confiança inicial"], "unknown");
  assert.equal(attribution["Motivo fallback inicial"], "legacy_source_ambiguous");
  assert.equal(attribution["Primeiro toque em"], "");
});

test("conflicting M26O01W history never invents a direct WhatsApp path", () => {
  const {
    atribuicaoLegadaOportunidade_,
    OPPORTUNITY_HEADERS,
  } = load();
  const columns = Object.fromEntries(
    OPPORTUNITY_HEADERS.map((header, index) => [header, index + 1]),
  );
  const row = Array(OPPORTUNITY_HEADERS.length).fill("");
  row[columns["Referência inicial"] - 1] = "M26O01W-C01H01-OT02";
  row[columns["Plataforma inicial"] - 1] = "Meta";

  const attribution = atribuicaoLegadaOportunidade_(row, columns);

  assert.equal(attribution["Origem inicial canônica"], "Meta Ads");
  assert.equal(attribution["Canal inicial"], "meta_ads");
  assert.equal(attribution["Caminho de conversão inicial"], "unknown");
  assert.equal(attribution["Motivo fallback inicial"], "legacy_path_conflict");
});

test("cervical campaign codes preserve distinct site and WhatsApp paths", () => {
  const {
    atribuicaoLegadaOportunidade_,
    OPPORTUNITY_HEADERS,
  } = load();
  const columns = Object.fromEntries(
    OPPORTUNITY_HEADERS.map((header, index) => [header, index + 1]),
  );

  const siteRow = Array(OPPORTUNITY_HEADERS.length).fill("");
  siteRow[columns["Referência inicial"] - 1] = "M26C02S-C07H01-lifting-cervical";
  siteRow[columns["Plataforma inicial"] - 1] = "Meta";
  const site = atribuicaoLegadaOportunidade_(siteRow, columns);
  assert.equal(site["Caminho de conversão inicial"], "meta_site_whatsapp");

  const directRow = Array(OPPORTUNITY_HEADERS.length).fill("");
  directRow[columns["Referência inicial"] - 1] = "M26C01W-C07H01";
  directRow[columns["Plataforma inicial"] - 1] = "Meta";
  const direct = atribuicaoLegadaOportunidade_(directRow, columns);
  assert.equal(direct["Caminho de conversão inicial"], "meta_whatsapp_direct");
});

test("resolved first and current campaign dimensions remain separate", () => {
  const { normalizarAtribuicaoOportunidade_ } = load();
  const attribution = normalizarAtribuicaoOportunidade_({
    platform: "Orgânico/Conteúdo",
    reference: "M26F02S-C01H01-avaliacao-facial",
    attribution: {
      resolved: true,
      initialOrigin: "Google orgânico",
      initialChannel: "organic_search",
      initialCampaignCode: "",
      initialCreativeCode: "",
      currentOrigin: "Meta Ads",
      currentChannel: "meta_ads",
      currentCampaignCode: "M26F02S",
      currentAdgroupCode: "ADSET01",
      currentCreativeCode: "C01H01",
      currentMetaCampaignId: "120000000000000000",
      currentMetaAdsetId: "120000000000000001",
      currentMetaAdId: "120000000000000002",
      conversionPath: "meta_site_return_whatsapp",
      reportedOrigin: " indicação ",
      reportedOriginConfidence: "observed",
    },
  });
  assert.equal(attribution["Origem inicial canônica"], "Google orgânico");
  assert.equal(attribution["Campanha inicial"], "");
  assert.equal(attribution["Criativo inicial"], "");
  assert.equal(attribution["Origem da conversa atual"], "Meta Ads");
  assert.equal(attribution["Campanha atual"], "M26F02S");
  assert.equal(attribution["Grupo/conjunto atual"], "ADSET01");
  assert.equal(attribution["Criativo atual"], "C01H01");
  assert.equal(attribution["Meta Adset ID atual"], "120000000000000001");
  assert.equal(attribution["Meta Ad ID atual"], "120000000000000002");
  assert.equal(attribution["Origem informada pelo paciente"], "Indicação");
  assert.equal(
    attribution["Confiança da origem informada"],
    "patient_reported",
  );
});

test("a later Google reference cannot replace a resolved Meta first touch", () => {
  const { normalizarAtribuicaoOportunidade_ } = load();
  const attribution = normalizarAtribuicaoOportunidade_({
    platform: "Google",
    reference: "G26BLEF-C03H01-blefaroplastia",
    attribution: {
      resolved: true,
      initialOrigin: "Meta Ads",
      initialChannel: "meta_ads",
      initialCampaignCode: "M26F02S",
      initialCreativeCode: "C01H01",
      currentOrigin: "Google Ads",
      currentChannel: "google_ads",
      currentCampaignCode: "G26BLEF",
      currentCreativeCode: "C03H01",
      conversionPath: "google_site_whatsapp",
    },
  });
  assert.equal(attribution["Origem inicial canônica"], "Meta Ads");
  assert.equal(attribution["Campanha inicial"], "M26F02S");
  assert.equal(attribution["Criativo inicial"], "C01H01");
  assert.equal(attribution["Origem da conversa atual"], "Google Ads");
  assert.equal(attribution["Campanha atual"], "G26BLEF");
  assert.equal(attribution["Criativo atual"], "C03H01");
});

test("identity migration dry-run performs zero sheet writes", () => {
  const opportunityHeaders = [
    "Opportunity ID",
    "Telefone (E.164)",
    "Telefone hash",
  ];
  const opportunitySheet = makeSheet(
    "_CRM_OPORTUNIDADES",
    opportunityHeaders,
    [["opp-1", "+5511900000000", "legacy-hash"]],
  );
  const stageSheet = makeSheet(
    "_LEAD_FASE_EVENTOS",
    ["Opportunity ID", "Telefone hash"],
    [["opp-1", "legacy-hash"]],
  );
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_CRM_OPORTUNIDADES") return opportunitySheet;
      if (name === "_LEAD_FASE_EVENTOS") return stageSheet;
      return null;
    },
  };
  const { migrarPseudonimosIdentidadeLead } = load({ spreadsheet });
  const result = migrarPseudonimosIdentidadeLead({ apply: false });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry_run");
  assert.equal(result.opportunityRowsToUpdate, 1);
  assert.equal(result.stageRowsToUpdate, 1);
  assert.equal(opportunitySheet.getWriteCount(), 0);
  assert.equal(stageSheet.getWriteCount(), 0);
  assert.equal(opportunitySheet.data[1][2], "legacy-hash");
  assert.equal(stageSheet.data[1][1], "legacy-hash");
});

test("identity migration apply changes only the two pseudonym cells after confirmation", () => {
  const opportunitySheet = makeSheet(
    "_CRM_OPORTUNIDADES",
    ["Opportunity ID", "Telefone (E.164)", "Telefone hash", "Fase"],
    [["opp-1", "+5511900000000", "legacy-hash", "Qualificado"]],
  );
  const stageSheet = makeSheet(
    "_LEAD_FASE_EVENTOS",
    ["Opportunity ID", "Telefone hash", "Evento"],
    [["opp-1", "legacy-hash", "lead_qualified"]],
  );
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_CRM_OPORTUNIDADES") return opportunitySheet;
      if (name === "_LEAD_FASE_EVENTOS") return stageSheet;
      return null;
    },
  };
  const { migrarPseudonimosIdentidadeLead } = load({ spreadsheet });
  const result = migrarPseudonimosIdentidadeLead({
    apply: true,
    confirmation: "APLICAR_HMAC_IDENTIDADE_K1",
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "applied");
  assert.equal(opportunitySheet.getWriteCount(), 1);
  assert.equal(stageSheet.getWriteCount(), 1);
  assert.equal(opportunitySheet.data[1][2], "pid_k1_5511900000000");
  assert.equal(stageSheet.data[1][1], "pid_k1_5511900000000");
  assert.equal(opportunitySheet.data[1][3], "Qualificado");
  assert.equal(stageSheet.data[1][2], "lead_qualified");
});

test("attribution schema dry-run reports the known duplicate without any writes", () => {
  const base = load();
  const headers = Array.from(base.OPPORTUNITY_HEADERS).concat("Encerrado em");
  const row = Array(headers.length).fill("");
  row[headers.indexOf("Opportunity ID")] = "opp-1";
  row[headers.indexOf("Referência inicial")] = "M26F02S-C01H01";
  row[headers.indexOf("Plataforma inicial")] = "Meta";
  const opportunitySheet = makeSheet("_CRM_OPORTUNIDADES", headers, [row]);
  const eventSheet = makeSheet(
    "_WHATSAPP_EVENTOS",
    ["Message ID", "Event ID"],
    [],
  );
  const amandaSheet = makeSheet("Google Ads - Conversões", ["Opportunity ID"], []);
  const danielSheet = makeSheet("Leads Dr. Daniel", ["Opportunity ID"], []);
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_CRM_OPORTUNIDADES") return opportunitySheet;
      if (name === "_WHATSAPP_EVENTOS") return eventSheet;
      if (name === "Google Ads - Conversões") return amandaSheet;
      if (name === "Leads Dr. Daniel") return danielSheet;
      return null;
    },
  };
  const { migrarSchemaAtribuicaoV1 } = load({ spreadsheet });
  const result = migrarSchemaAtribuicaoV1({ apply: false });
  assert.equal(result.ok, true);
  assert.equal(result.blocked, false);
  assert.equal(result.mode, "dry_run");
  assert.equal(result.duplicateHeaders.length, 1);
  assert.equal(result.duplicateHeaders[0].header, "Encerrado em");
  assert.equal(result.opportunityRowsToBackfill, 1);
  assert.equal(opportunitySheet.getWriteCount(), 0);
  assert.equal(eventSheet.getWriteCount(), 0);
  assert.equal(amandaSheet.getWriteCount(), 0);
  assert.equal(danielSheet.getWriteCount(), 0);
  assert.equal(headers.filter((header) => header === "Encerrado em").length, 2);
});

test("attribution schema dry-run blocks an unsupported duplicate without writes", () => {
  const base = load();
  const headers = Array.from(base.OPPORTUNITY_HEADERS).concat("Fase");
  const opportunitySheet = makeSheet("_CRM_OPORTUNIDADES", headers, []);
  const eventSheet = makeSheet(
    "_WHATSAPP_EVENTOS",
    ["Message ID", "Event ID"],
    [],
  );
  const amandaSheet = makeSheet("Google Ads - Conversões", ["Opportunity ID"], []);
  const danielSheet = makeSheet("Leads Dr. Daniel", ["Opportunity ID"], []);
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_CRM_OPORTUNIDADES") return opportunitySheet;
      if (name === "_WHATSAPP_EVENTOS") return eventSheet;
      if (name === "Google Ads - Conversões") return amandaSheet;
      if (name === "Leads Dr. Daniel") return danielSheet;
      return null;
    },
  };
  const { migrarSchemaAtribuicaoV1 } = load({ spreadsheet });
  const result = migrarSchemaAtribuicaoV1({ apply: false });
  assert.equal(result.ok, true);
  assert.equal(result.blocked, true);
  assert.equal(result.unsupportedDuplicateHeaders, 1);
  assert.equal(opportunitySheet.getWriteCount(), 0);
  assert.equal(eventSheet.getWriteCount(), 0);
});

test("attribution schema apply preserves existing first-touch dimensions and duplicate-column data", () => {
  const base = load();
  const headers = Array.from(base.OPPORTUNITY_HEADERS).concat(
    "Encerrado em",
    "Origem inicial canônica",
    "Campanha inicial",
  );
  const row = Array(headers.length).fill("");
  row[headers.indexOf("Opportunity ID")] = "opp-1";
  row[headers.indexOf("Referência inicial")] = "M26F02S-C01H01";
  row[headers.indexOf("Plataforma inicial")] = "Meta";
  row[headers.lastIndexOf("Encerrado em")] = "legacy-duplicate-value";
  row[headers.indexOf("Origem inicial canônica")] = "Google Ads";
  row[headers.indexOf("Campanha inicial")] = "G26FACE";
  const opportunitySheet = makeSheet("_CRM_OPORTUNIDADES", headers, [row]);
  const eventSheet = makeSheet(
    "_WHATSAPP_EVENTOS",
    ["Message ID", "Event ID"],
    [],
  );
  const amandaSheet = makeSheet("Google Ads - Conversões", ["Opportunity ID"], []);
  const danielSheet = makeSheet("Leads Dr. Daniel", ["Opportunity ID"], []);
  const spreadsheet = {
    getSheetByName(name) {
      if (name === "_CRM_OPORTUNIDADES") return opportunitySheet;
      if (name === "_WHATSAPP_EVENTOS") return eventSheet;
      if (name === "Google Ads - Conversões") return amandaSheet;
      if (name === "Leads Dr. Daniel") return danielSheet;
      return null;
    },
  };
  const { migrarSchemaAtribuicaoV1 } = load({ spreadsheet });
  const result = migrarSchemaAtribuicaoV1({
    apply: true,
    confirmation: "APLICAR_SCHEMA_ATRIBUICAO_V1",
  });
  assert.equal(result.ok, true);
  assert.equal(result.blocked, false);
  const finalHeaders = opportunitySheet.data[0];
  const finalRow = opportunitySheet.data[1];
  assert.equal(finalHeaders.filter((header) => header === "Encerrado em").length, 1);
  const legacyColumn = finalHeaders.indexOf("Encerrado em (legado duplicado)");
  assert.notEqual(legacyColumn, -1);
  assert.equal(finalRow[legacyColumn], "legacy-duplicate-value");
  assert.equal(
    finalRow[finalHeaders.indexOf("Origem inicial canônica")],
    "Google Ads",
  );
  assert.equal(finalRow[finalHeaders.indexOf("Campanha inicial")], "G26FACE");
  assert.equal(finalRow[finalHeaders.indexOf("Canal inicial")] || "", "");
});

test("schema flag off makes attribution writes and reads inert", () => {
  const {
    aplicarAtribuicaoOportunidade_,
    lerAtribuicaoOportunidade_,
    vincularOportunidadeAoLead_,
    OPPORTUNITY_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
    LEAD_INTEGRATION_HEADERS,
  } = load({ schemaEnabled: false });
  const sheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.sheetName,
    Array.from(OPPORTUNITY_HEADERS),
    [Array(OPPORTUNITY_HEADERS.length).fill("")],
  );
  aplicarAtribuicaoOportunidade_(sheet, 2, {
    "Origem inicial canônica": "Meta Ads",
  }, { allowInitialFill: true });
  assert.deepEqual(
    JSON.parse(JSON.stringify(lerAtribuicaoOportunidade_(sheet, 2))),
    {},
  );
  assert.equal(sheet.data[0].length, OPPORTUNITY_HEADERS.length);

  const leadSheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    Array.from(LEAD_INTEGRATION_HEADERS),
    [Array(LEAD_INTEGRATION_HEADERS.length).fill("")],
  );
  vincularOportunidadeAoLead_(leadSheet, 2, {
    opportunityId: "opp-reported-off",
    professional: "amanda",
    attribution: {
      "Origem informada pelo paciente": "Indicação",
      "Confiança da origem informada": "patient_reported",
    },
  }, "resolved");
  assert.equal(
    leadSheet.data[0].includes("Origem informada pelo paciente"),
    false,
  );
});

test("a follow-up without attribution inherits its open Amanda opportunity", () => {
  const {
    resolverRotaLeadComContexto_,
    OPPORTUNITY_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const opportunityRow = Array(OPPORTUNITY_HEADERS.length).fill("");
  opportunityRow[0] = "opp-amanda-1";
  opportunityRow[1] = "+5511900005416";
  opportunityRow[3] = "amanda";
  opportunityRow[4] = OPPORTUNITY_STORE_CONFIG.amandaSheetName;
  opportunityRow[5] = "127";
  opportunityRow[6] = "open";
  const opportunitySheet = {
    getLastRow: () => 2,
    getRange: () => ({
      getDisplayValues: () => [opportunityRow],
    }),
  };
  const spreadsheet = {
    getSheetByName: (name) =>
      name === OPPORTUNITY_STORE_CONFIG.sheetName
        ? opportunitySheet
        : null,
  };

  const route = resolverRotaLeadComContexto_(spreadsheet, {
    phone: "+5511900005416",
    platform: "WhatsApp direto",
    text: "Aonde fica seu endereço?",
  });

  assert.equal(route.professional, "amanda");
  assert.equal(route.routeStatus, "resolved_by_open_opportunity");
  assert.equal(route.opportunityId, "opp-amanda-1");
  assert.equal(route.leadRow, 127);
  assert.equal(route.sheetName, "Google Ads - Conversões");
});

test("an ambiguous open opportunity never crosses Amanda and Daniel", () => {
  const {
    resolverRotaLeadComContexto_,
    OPPORTUNITY_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const amanda = Array(OPPORTUNITY_HEADERS.length).fill("");
  amanda[0] = "opp-amanda-1";
  amanda[1] = "+5511999999999";
  amanda[3] = "amanda";
  amanda[4] = OPPORTUNITY_STORE_CONFIG.amandaSheetName;
  amanda[6] = "open";
  const daniel = [...amanda];
  daniel[0] = "opp-daniel-1";
  daniel[3] = "daniel";
  daniel[4] = OPPORTUNITY_STORE_CONFIG.danielSheetName;
  const opportunitySheet = {
    getLastRow: () => 3,
    getRange: () => ({ getDisplayValues: () => [amanda, daniel] }),
  };
  const spreadsheet = {
    getSheetByName: (name) =>
      name === OPPORTUNITY_STORE_CONFIG.sheetName
        ? opportunitySheet
        : null,
  };

  const route = resolverRotaLeadComContexto_(spreadsheet, {
    phone: "+5511999999999",
    platform: "WhatsApp direto",
  });

  assert.equal(route.professional, "unknown");
  assert.equal(route.routeStatus, "pending");
  assert.equal(route.sheetName, "");
});

test("an explicit opportunity id wins and a phone-only duplicate fails closed", () => {
  const {
    resolverLinhaLeadCanonica_,
    LEAD_INTEGRATION_HEADERS,
  } = load();
  const headers = [
    "Data do contato",
    "ReferÃªncia da campanha",
    "Telefone (E.164)",
    "Nome",
    "SituaÃ§Ã£o do lead",
    "Data da situaÃ§Ã£o",
    ...Array.from(LEAD_INTEGRATION_HEADERS),
  ];
  const opportunityColumn = headers.indexOf("Opportunity ID");
  const first = Array(headers.length).fill("");
  first[2] = "+5511999999999";
  first[opportunityColumn] = "opp-1";
  const second = first.slice();
  second[opportunityColumn] = "opp-2";
  const sheet = makeSheet("Google Ads - ConversÃµes", headers, [first, second]);

  assert.equal(
    resolverLinhaLeadCanonica_(sheet, "opp-1", "+5511999999999").row,
    2,
  );
  assert.equal(
    resolverLinhaLeadCanonica_(sheet, "", "+5511999999999").reason,
    "ambiguous_phone",
  );
  assert.equal(
    resolverLinhaLeadCanonica_(sheet, "opp-missing", "+5511999999999")
      .reason,
    "opportunity_id_not_found_in_visible_sheet",
  );
});

test("canonical phase sync updates CRM and visible row once and permits human correction", () => {
  const {
    sincronizarFaseOportunidadeELead_,
    OPPORTUNITY_HEADERS,
    OPPORTUNITY_STAGE_VALUES,
    LEAD_INTEGRATION_HEADERS,
    OPPORTUNITY_STORE_CONFIG,
  } = load();
  const opportunity = Array(OPPORTUNITY_HEADERS.length).fill("");
  opportunity[0] = "opp-1";
  opportunity[1] = "+5511999999999";
  opportunity[3] = "amanda";
  opportunity[4] = OPPORTUNITY_STORE_CONFIG.amandaSheetName;
  opportunity[5] = 2;
  opportunity[6] = "open";
  opportunity[7] = "Novo";
  opportunity[22] = 1;
  const opportunitySheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.sheetName,
    Array.from(OPPORTUNITY_HEADERS),
    [opportunity],
  );
  const leadHeaders = [
    "Data do contato",
    "ReferÃªncia da campanha",
    "Telefone (E.164)",
    "Nome",
    "SituaÃ§Ã£o do lead",
    "Data da situaÃ§Ã£o",
    ...Array.from(LEAD_INTEGRATION_HEADERS),
  ];
  const versionHeader = Array.from(LEAD_INTEGRATION_HEADERS).find(
    (header) => header.startsWith("Vers"),
  );
  const lead = Array(leadHeaders.length).fill("");
  lead[2] = "+5511999999999";
  lead[4] = "Novo";
  lead[leadHeaders.indexOf("Opportunity ID")] = "opp-1";
  lead[leadHeaders.indexOf(versionHeader)] = 1;
  const leadSheet = makeSheet(
    OPPORTUNITY_STORE_CONFIG.amandaSheetName,
    leadHeaders,
    [lead],
  );
  const spreadsheet = {
    getSheetByName(name) {
      if (name === OPPORTUNITY_STORE_CONFIG.sheetName) return opportunitySheet;
      if (name === OPPORTUNITY_STORE_CONFIG.amandaSheetName) return leadSheet;
      return null;
    },
  };

  const advanced = sincronizarFaseOportunidadeELead_(spreadsheet, {
    opportunityId: "opp-1",
    stage: "Consulta agendada",
    at: new Date("2026-08-14T12:00:00Z"),
  });
  assert.equal(advanced.ok, true);
  assert.equal(advanced.changed, true);
  assert.equal(opportunitySheet.data[1][7], "Consulta agendada");
  assert.equal(leadSheet.data[1][4], "Consulta agendada");
  assert.equal(opportunitySheet.data[1][22], 2);
  assert.equal(
    leadSheet.data[1][leadHeaders.indexOf(versionHeader)],
    2,
  );

  const repeated = sincronizarFaseOportunidadeELead_(spreadsheet, {
    opportunityId: "opp-1",
    stage: "Consulta agendada",
  });
  assert.equal(repeated.changed, false);
  assert.equal(opportunitySheet.data[1][22], 2);

  const corrected = sincronizarFaseOportunidadeELead_(spreadsheet, {
    opportunityId: "opp-1",
    stage: "Qualificado",
    humanOverride: true,
  });
  assert.equal(corrected.ok, true);
  assert.equal(opportunitySheet.data[1][7], "Qualificado");
  assert.equal(leadSheet.data[1][4], "Qualificado");
  assert.equal(opportunitySheet.data[1][22], 3);
});

test("automatic sync refuses an equal-rank qualified/non-qualified conflict", () => {
  const { resolverFaseSincronizada_ } = load();
  assert.equal(
    resolverFaseSincronizada_("Qualificado", "N\u00e3o qualificado", {
      stage: "Qualificado",
    }).reason,
    "ambiguous_stage_conflict",
  );
});
