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
    `${source}\nglobalThis.__test = { resolverRotaLead_, criarOpportunityId_, OPPORTUNITY_STORE_CONFIG };`,
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
