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
    },
    normalizePhone_(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits ? `+${digits}` : "";
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { resolverRotaLead_, resolverRotaLeadComContexto_, criarOpportunityId_, OPPORTUNITY_STORE_CONFIG, OPPORTUNITY_HEADERS };`,
    sandbox,
  );
  return sandbox.__test;
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
