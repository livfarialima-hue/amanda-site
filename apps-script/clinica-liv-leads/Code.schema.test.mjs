import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function loadCode({ schemaEnabled = true } = {}) {
  const properties = new Map(
    schemaEnabled ? [["ATTRIBUTION_SCHEMA_VERSION", "v1"]] : [],
  );
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    Utilities: {
      formatDate: (_date, _timezone, pattern) =>
        pattern.includes("HH:mm")
          ? "28/07/2026 21:31"
          : "28/07/2026",
    },
    SpreadsheetApp: {
      flush() {},
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty: (key) => properties.get(key) || null,
          setProperty: (key, value) => properties.set(key, String(value)),
          deleteProperty: (key) => properties.delete(key),
        };
      },
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__test = {
  CONFIG,
  EXPECTED_HEADERS,
  WHATSAPP_EVENT_HEADERS,
  normalizeLead_,
  writeLead_,
  mergeLeadIntoExistingRow_,
  colunaNomeLead_,
  gravarNomeLeadSeDisponivel_,
  decomporReferenciaAquisicao_,
  isKnownPatientRelationship_,
  findProcessedEvent_,
  recordProcessedEvent_,
  attributionSchemaEnabled_,
  cabecalhosEventosWhatsAppAtivos_,
  resolvePendingProcessedEvent_,
  resolucaoLeadBloqueiaInsercao_,
};`,
    sandbox,
  );

  return sandbox.__test;
}

test("lead ingestion schema matches the 25 live spreadsheet headers", () => {
  const { CONFIG, EXPECTED_HEADERS } = loadCode();

  assert.equal(CONFIG.totalColumns, 25);
  assert.deepEqual(Array.from(EXPECTED_HEADERS), [
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
    "Origem do evento",
    "Plataforma de aquisição",
    "Campanha",
    "Criativo",
    "CTA",
    "Destino",
    "Referência completa",
  ]);
});

test("known patients are recognized before acquisition ingestion", () => {
  const { isKnownPatientRelationship_ } = loadCode();

  assert.equal(
    isKnownPatientRelationship_({
      found: true,
      relationshipState: "appointment_scheduled",
    }),
    true,
  );
  assert.equal(
    isKnownPatientRelationship_({
      found: false,
      relationshipState: "unknown",
    }),
    false,
  );
});

test("ambiguous lead identity blocks insertion while a genuinely new phone does not", () => {
  const { resolucaoLeadBloqueiaInsercao_ } = loadCode();

  assert.equal(
    resolucaoLeadBloqueiaInsercao_({ ok: false, reason: "ambiguous_phone" }),
    true,
  );
  assert.equal(
    resolucaoLeadBloqueiaInsercao_({
      ok: false,
      reason: "duplicate_opportunity_id_in_visible_sheet",
    }),
    true,
  );
  assert.equal(
    resolucaoLeadBloqueiaInsercao_({ ok: false, reason: "phone_not_found" }),
    false,
  );
});

test("lead writes origin and destination into the live column positions", () => {
  const { writeLead_ } = loadCode();
  const writes = [];
  const headers = [
    ...Array(25).fill(""),
    "Opportunity ID",
    "Nome",
  ];
  const sheet = {
    getLastColumn: () => headers.length,
    getRange(row, column, rows, columns) {
      return {
        getDisplayValues() {
          assert.equal(row, 1);
          return [headers.slice(column - 1, column - 1 + columns)];
        },
        setValue(value) {
          writes.push({ row, column, rows: 1, columns: 1, value });
        },
        setValues(values) {
          writes.push({ row, column, rows, columns, values });
        },
      };
    },
  };

  writeLead_(
    sheet,
    2,
    {
      messageId: "message-1",
      name: "Marina Souza",
      contactAt: new Date("2026-07-29T00:31:00.000Z"),
      reference: "M26F01W-C06H01",
      phone: "+5511987985578",
      platform: "Meta",
      gclid: "",
      gbraid: "",
      wbraid: "",
    },
    () => {},
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      writes.find((write) => write.column === 19)?.values,
    )),
    [["WHATSAPP", "Meta"]],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      writes.find((write) => write.column === 21)?.values,
    )),
    [["M26F01W", "C06H01", "", "WhatsApp", "M26F01W-C06H01"]],
  );
  assert.equal(
    writes.filter(
      (write) =>
        write.column + (write.columns || 1) - 1 > 25,
    ).length,
    1,
  );
  assert.deepEqual(
    writes.find((write) => write.column === 27),
    {
      row: 2,
      column: 27,
      rows: 1,
      columns: 1,
      value: "Marina Souza",
    },
  );
  assert.equal(
    writes.some((write) => write.column === 15),
    false,
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      writes.find((write) => write.column === 16)?.values,
    )),
    [["BRL", "Contato inicial recebido automaticamente pelo WhatsApp."]],
  );
});

test("patient name is stored only in the additive LEADS name column", () => {
  const { gravarNomeLeadSeDisponivel_ } = loadCode();
  const headers = [
    ...Array.from({ length: 25 }, (_, index) =>
      index === 2 ? "Telefone (E.164)" : "",
    ),
    "Opportunity ID",
    "Nome",
  ];
  let storedName = "";
  const sheet = {
    getLastColumn: () => headers.length,
    getRange(row, column, rows = 1, columns = 1) {
      return {
        getDisplayValues() {
          if (row === 1) {
            return [headers.slice(column - 1, column - 1 + columns)];
          }
          return [[storedName]];
        },
        getDisplayValue: () => storedName,
        setValue(value) {
          assert.equal(row, 2);
          assert.equal(column, 27);
          storedName = value;
        },
      };
    },
  };

  assert.equal(
    gravarNomeLeadSeDisponivel_(sheet, 2, "Marina Souza", true),
    true,
  );
  assert.equal(storedName, "Marina Souza");
  assert.equal(
    gravarNomeLeadSeDisponivel_(sheet, 2, "Outro nome", true),
    false,
  );
  assert.equal(storedName, "Marina Souza");
});

test("Meta site reference fills the canonical campaign and page fields", () => {
  const { decomporReferenciaAquisicao_ } = loadCode();

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      decomporReferenciaAquisicao_("M26F02S-avaliacao-facial"),
    )),
    {
      campaign: "M26F02S",
      creative: "",
      cta: "avaliacao-facial",
      reference: "M26F02S-avaliacao-facial",
    },
  );
});

test("cervical references keep campaign, creative and page separately", () => {
  const { decomporReferenciaAquisicao_ } = loadCode();

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      decomporReferenciaAquisicao_("M26C02S-C07H01-lifting-cervical"),
    )),
    {
      campaign: "M26C02S",
      creative: "C07H01",
      cta: "lifting-cervical",
      reference: "M26C02S-C07H01-lifting-cervical",
    },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      decomporReferenciaAquisicao_("M26C01W-C07H01"),
    )),
    {
      campaign: "M26C01W",
      creative: "C07H01",
      cta: "",
      reference: "M26C01W-C07H01",
    },
  );
});

test("Meta creative and CTA remain independently auditable", () => {
  const { decomporReferenciaAquisicao_ } = loadCode();

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      decomporReferenciaAquisicao_("M26O01W-DbHKuWfGP_N-OT02"),
    )),
    {
      campaign: "M26O01W",
      creative: "DbHKuWfGP_N",
      cta: "OT02",
      reference: "M26O01W-DbHKuWfGP_N-OT02",
    },
  );
});

test("legacy first-touch fields are filled independently and never overwritten", () => {
  const { mergeLeadIntoExistingRow_ } = loadCode();
  const existing = Array(25).fill("");
  existing[1] = "SITE-avaliacao-facial";
  existing[19] = "Orgânico/Conteúdo";
  existing[20] = "ORIGINAL_CAMPAIGN";
  existing[24] = "SITE-avaliacao-facial";
  const writes = [];
  const sheet = {
    getRange(row, column, rows = 1, columns = 1) {
      return {
        getDisplayValues() {
          return [existing.slice(column - 1, column - 1 + columns)];
        },
        setValue(value) {
          writes.push({ row, column, value });
        },
      };
    },
  };

  mergeLeadIntoExistingRow_(sheet, 2, {
    reference: "M26F02S-C01H01-avaliacao-facial",
    platform: "Meta",
    gclid: "",
    gbraid: "",
    wbraid: "",
  });

  assert.equal(writes.some((write) => write.column === 2), false);
  assert.equal(writes.some((write) => write.column === 20), false);
  assert.equal(writes.some((write) => write.column === 21), false);
  assert.equal(writes.some((write) => write.column === 25), false);
  assert.equal(writes.some((write) => write.column === 24), true);
});

test("a frozen legacy reference never borrows platform from a later touch", () => {
  const { mergeLeadIntoExistingRow_ } = loadCode();
  const existing = Array(25).fill("");
  existing[1] = "SITE-avaliacao-facial";
  existing[19] = "";
  existing[24] = "SITE-avaliacao-facial";
  const writes = [];
  const sheet = {
    getRange(row, column, rows = 1, columns = 1) {
      return {
        getDisplayValues: () => [existing.slice(column - 1, column - 1 + columns)],
        setValue(value) { writes.push({ row, column, value }); },
      };
    },
  };

  mergeLeadIntoExistingRow_(sheet, 2, {
    reference: "M26F02S-C01H01",
    platform: "Meta",
  });

  assert.deepEqual(
    writes.filter((write) => write.column === 20),
    [{ row: 2, column: 20, value: "Orgânico/Conteúdo" }],
  );
  assert.equal(
    writes.some((write) => write.column === 20 && write.value === "Meta"),
    false,
  );
});

test("lead normalization keeps only bounded attribution diagnostics", () => {
  const { normalizeLead_ } = loadCode();
  const lead = normalizeLead_({
    eventId: "event-1",
    messageId: "message-1",
    phone: "+5511900000000",
    contactAt: "2026-08-14T12:00:00.000Z",
    reference: "M26F02S-C01H01-avaliacao-facial",
    platform: "Meta",
    referenceCategory: "meta_coded",
    attributionFallbackReason: "arbitrary_reason",
    templateId: "procedure_evaluation_v1",
  });

  assert.equal(lead.referenceCategory, "meta_coded");
  assert.equal(lead.attributionFallbackReason, "");
  assert.equal(lead.templateId, "procedure_evaluation_v1");
  assert.equal(
    normalizeLead_({
      eventId: "event-invalid-template",
      messageId: "message-invalid-template",
      phone: "+5511900000000",
      templateId: "free_text_template",
    }).templateId,
    "",
  );
});

test("processed lead event persists campaign coverage and fallback reason", () => {
  const { recordProcessedEvent_, WHATSAPP_EVENT_HEADERS } = loadCode();
  let appended = null;
  const sheet = {
    getLastColumn() {
      return WHATSAPP_EVENT_HEADERS.length;
    },
    getRange() {
      return {
        getDisplayValues() {
          return [Array.from(WHATSAPP_EVENT_HEADERS)];
        },
      };
    },
    appendRow(values) {
      appended = values;
    },
  };

  recordProcessedEvent_(
    sheet,
    {
      messageId: "message-1",
      eventId: "event-1",
      phone: "+5511900000000",
      contactAt: new Date("2026-08-14T12:00:00.000Z"),
      referenceCategory: "meta_uncoded",
      attributionFallbackReason: "meta_referral_without_mapped_code",
      reference: "META-DIRETO-SEM-CODIGO",
      platform: "Meta",
      attribution: {
        resolved: true,
        initialOrigin: "Google orgânico",
        initialChannel: "organic_search",
        initialCampaignCode: "",
        initialCreativeCode: "",
        currentOrigin: "Meta Ads",
        currentChannel: "meta_ads",
        currentCampaignCode: "M26F02S",
        currentCreativeCode: "C01H01",
        conversionPath: "meta_site_return_whatsapp",
        journeyStatus: "resolved",
        reportedOrigin: "Indicação",
        reportedOriginConfidence: "patient_reported",
      },
    },
    27,
    "inserted",
    "opp-amanda-1",
    "amanda",
    "resolved",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(appended.slice(9, 13))), [
    "meta_uncoded",
    "meta_referral_without_mapped_code",
    "META-DIRETO-SEM-CODIGO",
    "Meta",
  ]);
  const column = Object.fromEntries(
    WHATSAPP_EVENT_HEADERS.map((header, index) => [header, index]),
  );
  assert.equal(appended[column["Origem inicial canônica"]], "Google orgânico");
  assert.equal(appended[column["Campanha inicial da jornada"]], "");
  assert.equal(appended[column["Origem da conversa atual"]], "Meta Ads");
  assert.equal(appended[column["Campanha da conversa atual"]], "M26F02S");
  assert.equal(appended[column["Criativo da conversa atual"]], "C01H01");
  assert.equal(appended[column["Status da jornada"]], "resolved");
  assert.equal(
    appended[column["Origem informada pelo paciente"]],
    "Indicação",
  );
  assert.equal(
    appended[column["Confiança da origem informada"]],
    "patient_reported",
  );
});

test("disabled attribution schema leaves additive event columns blank", () => {
  const {
    recordProcessedEvent_,
    WHATSAPP_EVENT_HEADERS,
    attributionSchemaEnabled_,
    cabecalhosEventosWhatsAppAtivos_,
  } = loadCode({ schemaEnabled: false });
  let appended = null;
  const sheet = {
    getLastColumn: () => WHATSAPP_EVENT_HEADERS.length,
    getRange: () => ({
      getDisplayValues: () => [Array.from(WHATSAPP_EVENT_HEADERS)],
    }),
    appendRow(values) { appended = values; },
  };

  recordProcessedEvent_(sheet, {
    messageId: "message-schema-off",
    eventId: "event-schema-off",
    phone: "+5511900000000",
    contactAt: new Date("2026-08-15T12:00:00.000Z"),
    reference: "M26F02S-C01H01",
    platform: "Meta",
    attribution: {
      initialOrigin: "Meta Ads",
      initialChannel: "meta_ads",
      conversionPath: "meta_site_whatsapp",
    },
  }, 2, "inserted", "opp-1", "amanda", "resolved");

  assert.equal(attributionSchemaEnabled_(), false);
  assert.equal(cabecalhosEventosWhatsAppAtivos_().length, 13);
  assert.equal(appended.length, WHATSAPP_EVENT_HEADERS.length);
  assert.deepEqual(appended.slice(13), Array(WHATSAPP_EVENT_HEADERS.length - 13).fill(""));
});

test("lead normalization preserves only the closed journey data contract", () => {
  const { normalizeLead_ } = loadCode();
  const lead = normalizeLead_({
    eventId: "event-journey",
    messageId: "message-journey",
    phone: "+5511900000000",
    platform: "Meta",
    attribution: {
      resolved: true,
      journeyStatus: "resolved",
      initialOrigin: "Meta Ads",
      initialChannel: "meta_ads",
      currentOrigin: "Acesso direto",
      currentChannel: "direct",
      conversionPath: "meta_site_return_whatsapp",
      initialCampaignCode: "M26F02S",
      initialAdgroupCode: "AG01",
      initialCreativeCode: "C01H01",
      initialMetaCampaignId: "120000000000000000",
      initialMetaAdsetId: "not-an-id",
      currentCampaignCode: "M26F03S",
      currentAdgroupCode: "AG03",
      currentCreativeCode: "C03H01",
      currentMetaCampaignId: "120000000000000003",
      currentMetaAdsetId: "120000000000000004",
      currentMetaAdId: "120000000000000005",
      landingPage: "/avaliacao-facial/",
      ctaPage: "https://malicious.example/",
      ctaLocation: "hero",
      confidence: "observed",
      fallbackReason: "",
      firstTouchAt: "2026-08-15T10:00:00.000Z",
      lastTouchAt: "2026-08-15T12:00:00.000Z",
      reportedOrigin: " indicação ",
      reportedOriginConfidence: "observed",
    },
  });

  assert.equal(lead.attribution.initialOrigin, "Meta Ads");
  assert.equal(lead.attribution.conversionPath, "meta_site_return_whatsapp");
  assert.equal(lead.attribution.metaCampaignId, "120000000000000000");
  assert.equal(lead.attribution.metaAdsetId, "");
  assert.equal(lead.attribution.initialCampaignCode, "M26F02S");
  assert.equal(lead.attribution.currentCampaignCode, "M26F03S");
  assert.equal(lead.attribution.currentAdgroupCode, "AG03");
  assert.equal(lead.attribution.currentCreativeCode, "C03H01");
  assert.equal(lead.attribution.currentMetaCampaignId, "120000000000000003");
  assert.equal(lead.attribution.currentMetaAdsetId, "120000000000000004");
  assert.equal(lead.attribution.currentMetaAdId, "120000000000000005");
  assert.equal(lead.attribution.landingPage, "/avaliacao-facial/");
  assert.equal(lead.attribution.ctaPage, "");
  assert.equal(lead.attribution.journeyStatus, "resolved");
  assert.equal(lead.attribution.reportedOrigin, "Indicação");
  assert.equal(
    lead.attribution.reportedOriginConfidence,
    "patient_reported",
  );
});

test("patient-reported origin is never inferred into observed attribution", () => {
  const { normalizeLead_ } = loadCode();
  const lead = normalizeLead_({
    eventId: "event-reported-separation",
    messageId: "message-reported-separation",
    phone: "+5511900000000",
    attribution: {
      initialOrigin: "Origem informada pelo paciente",
      initialChannel: "patient_reported",
      currentOrigin: "Meta Ads",
      currentChannel: "meta_ads",
      confidence: "patient_reported",
    },
  });

  assert.equal(lead.attribution.initialOrigin, "Desconhecida");
  assert.equal(lead.attribution.initialChannel, "unknown");
  assert.equal(lead.attribution.currentOrigin, "Meta Ads");
  assert.equal(lead.attribution.currentChannel, "meta_ads");
  assert.equal(lead.attribution.confidence, "unknown");
  assert.equal(lead.attribution.reportedOrigin, "");
  assert.equal(lead.attribution.reportedOriginConfidence, "");

  const invalid = normalizeLead_({
    eventId: "event-invalid-reported-origin",
    messageId: "message-invalid-reported-origin",
    phone: "+5511900000000",
    attribution: { reportedOrigin: "TikTok ou texto livre" },
  });
  assert.equal(invalid.attribution.reportedOrigin, "");
  assert.equal(invalid.attribution.reportedOriginConfidence, "");
});

test("a duplicate keeps the pending route state visible to the caller", () => {
  const { findProcessedEvent_ } = loadCode();
  const sheet = {
    getLastRow: () => 2,
    getRange(row, column, rows, columns) {
      if (row === 2 && column === 1 && rows === 1 && columns === 2) {
        return {
          createTextFinder: () => ({
            matchEntireCell: () => ({
              findNext: () => ({ getRow: () => 2 }),
            }),
          }),
        };
      }
      if (row === 2 && column === 5 && rows === 1 && columns === 5) {
        return {
          getDisplayValues: () => [[
            "",
            "route_pending",
            "",
            "unknown",
            "pending",
          ]],
        };
      }
      throw new Error(`Unexpected range ${row}:${column}:${rows}:${columns}`);
    },
  };

  const event = findProcessedEvent_(sheet, ["message-1"]);

  assert.equal(event.leadRow, null);
  assert.equal(event.result, "route_pending");
  assert.equal(event.routeStatus, "pending");
  assert.equal(event.professional, "unknown");
});

test("route recovery updates the existing event instead of appending another", () => {
  const { resolvePendingProcessedEvent_ } = loadCode();
  let update = null;
  const sheet = {
    getRange(row, column, rows, columns) {
      return {
        setValues(values) {
          update = { row, column, rows, columns, values };
        },
      };
    },
  };

  resolvePendingProcessedEvent_(
    sheet,
    628,
    127,
    "opp-amanda-1",
    "amanda",
    "resolved_by_open_opportunity",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(update)), {
    row: 628,
    column: 5,
    rows: 1,
    columns: 5,
    values: [[
      127,
      "route_recovered",
      "opp-amanda-1",
      "amanda",
      "resolved_by_open_opportunity",
    ]],
  });
});
