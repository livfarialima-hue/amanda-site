import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./MetaAdsFunnelReview.gs", import.meta.url), "utf8");

function load(name) {
  return runInNewContext(`${source}\n;${name};`, {
    Date,
    Set,
    Map,
    Object,
    Array,
    String,
    Number,
    Utilities: {
      formatDate(date, zone, pattern) {
        if (pattern.includes("HH")) return "2026-08-15T08:25:00-03:00";
        return date.toISOString().slice(0, 10);
      },
    },
  });
}

test("agrega Meta direto e Meta via site sem expor IDs de oportunidade", () => {
  const build = load("construirAgregadosFunilMetaAds_");
  const headers = ["Opportunity ID", "Profissional", "Estado", "Fase", "Data do contato", "Plataforma de aquisição", "Campanha", "Criativo"];
  const rows = build([
    headers,
    ["opp_sintetica_1", "amanda", "open", "Qualificado", new Date("2026-08-14T12:00:00Z"), "Meta Ads", "M26F01W", "C06H01"],
    ["opp_sintetica_2", "amanda", "open", "Consulta agendada", new Date("2026-08-13T12:00:00Z"), "Meta Ads", "M26F02S", "C01H01"],
    ["opp_sintetica_3", "amanda", "open", "Novo", new Date("2026-08-12T12:00:00Z"), "Meta Ads", "M26O01W", "C99H99"],
  ], [["Event ID", "Opportunity ID", "Marco"], ["evt_sintetico", "opp_sintetica_2", "accepted"]], new Date("2026-08-15T15:00:00Z"));

  const direct = rows.find((row) => row[2] === 7 && row[5] === "meta_whatsapp_direct" && row[6] === "M26F01W" && row[7] === "__TOTAL__");
  const site = rows.find((row) => row[2] === 7 && row[5] === "meta_site_whatsapp" && row[6] === "M26F02S" && row[7] === "__TOTAL__");
  const unknown = rows.find((row) => row[2] === 7 && row[5] === "__UNKNOWN_PATH__" && row[7] === "__TOTAL__");
  assert.equal(direct[8], 1);
  assert.equal(direct[11], 1);
  assert.equal(site[12], 1);
  assert.equal(site[15], 1);
  assert.equal(unknown[8], 1);
  assert.equal(unknown[17], 1);
  assert.equal(JSON.stringify(rows).includes("opp_sintetica"), false);
  assert.equal(JSON.stringify(rows).includes("evt_sintetico"), false);
});

test("M26O01W permanece conflitante e não vira WhatsApp direto por sufixo", () => {
  const resolve = load("resolverCampanhaMetaAds_");
  assert.equal(resolve("M26F01W").path, "meta_whatsapp_direct");
  assert.equal(resolve("M26F02S").path, "meta_site_whatsapp");
  assert.equal(resolve("M26O01W"), null);
  assert.equal(resolve("M26O02W"), null);
});

test("criativo exige código CxxHxx explícito", () => {
  const resolve = load("resolverCriativoMetaAds_");
  assert.equal(resolve("Ref. M26F01W-C06H01"), "C06H01");
  assert.equal(resolve("META-AD-120250"), null);
});

test("arquivo agregado não envia e-mail nem contém campos de PII", () => {
  ["MailApp", "GmailApp", "Telefone", "Nome do paciente", "Mensagem"].forEach((token) => {
    assert.equal(source.includes(token), false, token);
  });
});
