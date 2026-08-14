import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./OpportunityStore.gs", import.meta.url),
  "utf8",
);

function load() {
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
    },
    SpreadsheetApp: { flush() {} },
    normalizePhone_(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits ? `+${digits}` : "";
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { resolverRotaLead_, resolverRotaLeadComContexto_, criarOpportunityId_, resolverLinhaLeadCanonica_, resolverFaseSincronizada_, sincronizarFaseOportunidadeELead_, OPPORTUNITY_STORE_CONFIG, OPPORTUNITY_HEADERS, OPPORTUNITY_STAGE_VALUES, LEAD_INTEGRATION_HEADERS };`,
    sandbox,
  );
  return sandbox.__test;
}

function makeSheet(name, headers, rows) {
  const data = [headers.slice(), ...rows.map((row) => row.slice())];
  return {
    data,
    getName: () => name,
    getLastRow: () => data.length,
    getLastColumn: () => Math.max(...data.map((row) => row.length)),
    getMaxColumns: () => Math.max(...data.map((row) => row.length)),
    getMaxRows: () => data.length,
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
          while (data.length < row) data.push([]);
          data[row - 1][column - 1] = value;
          return range;
        },
        setValues(values) {
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
