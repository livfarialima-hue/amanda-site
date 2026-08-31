import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./GoogleAdsFunnelReview.gs", import.meta.url), "utf8");

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
        if (pattern.includes("HH")) return "2026-08-15T08:15:00-03:00";
        return date.toISOString().slice(0, 10);
      },
    },
  });
}

test("o agregado contém somente dimensões e contagens anônimas", () => {
  const build = load("construirAgregadosFunilGoogleAds_");
  const headers = ["Opportunity ID", "Profissional", "Estado", "Fase", "Data do contato", "Data da situação", "Plataforma de aquisição", "Campanha"];
  const rows = build([
    headers,
    ["opp_sintetica_1", "amanda", "open", "Qualificado", new Date("2026-08-14T12:00:00Z"), new Date(), "Google", "G26BLEF"],
    ["opp_sintetica_2", "amanda", "open", "Não qualificado", new Date("2026-08-13T12:00:00Z"), new Date(), "Google", "LEGADO"],
    ["opp_sintetica_3", "daniel", "open", "Qualificado", new Date("2026-08-14T12:00:00Z"), new Date(), "Google", "G26BLEF"],
  ], [["Event ID", "Opportunity ID", "Marco"], ["evt_sintetico", "opp_sintetica_1", "accepted"]], new Date("2026-08-15T15:00:00Z"));
  const total7 = rows.find((row) => row[2] === 7 && row[5] === "__TOTAL__");
  assert.equal(total7[6], 2);
  assert.equal(total7[8], 1);
  assert.equal(total7[9], 1);
  assert.equal(total7[13], 1);
  assert.equal(total7[14], 1);
  assert.equal(total7[15], 1);
  const serialized = JSON.stringify(rows);
  assert.equal(serialized.includes("opp_sintetica"), false);
  assert.equal(serialized.includes("evt_sintetico"), false);
});

test("tolera o cabeçalho histórico com mojibake sem aceitar campo arbitrário", () => {
  const build = load("construirAgregadosFunilGoogleAds_");
  const rows = build([
    ["Opportunity ID", "Profissional", "Estado", "Fase", "Data do contato", "Plataforma de aquisiÃ§Ã£o", "Campanha"],
    ["opp_sintetica_1", "amanda", "open", "NÃ£o qualificado", new Date("2026-08-14T12:00:00Z"), "Google", "G26BLEF"],
  ], [], new Date("2026-08-15T15:00:00Z"));
  const total7 = rows.find((row) => row[2] === 7 && row[5] === "__TOTAL__");
  assert.equal(total7[6], 1);
  assert.equal(total7[8], 0);
});

test("ignora marco de fechamento explicitamente invalidado", () => {
  const build = load("construirAgregadosFunilGoogleAds_");
  const rows = build([
    ["Opportunity ID", "Profissional", "Estado", "Fase", "Data do contato", "Plataforma de aquisição", "Campanha"],
    ["opp_sintetica_1", "amanda", "open", "Consulta realizada", new Date("2026-08-14T12:00:00Z"), "Google", "G26BLEF"],
  ], [
    ["Event ID", "Opportunity ID", "Marco", "Estado"],
    ["evt_sintetico", "opp_sintetica_1", "payment_confirmed", "voided"],
  ], new Date("2026-08-15T15:00:00Z"));
  const total7 = rows.find((row) => row[2] === 7 && row[5] === "__TOTAL__");
  assert.equal(total7[13], 0);
});

test("alias legado não é inventado como campanha canônica", () => {
  const resolve = load("resolverCampanhaGoogleAds_");
  assert.equal(resolve("G26BLEF"), "S_BR_SP_BLEFAROPLASTIA");
  assert.equal(resolve("G26F03"), null);
  assert.equal(resolve("BF01"), null);
});

test("arquivo não envia e-mail nem contém campos de PII", () => {
  ["MailApp", "GmailApp", "Telefone", "Nome do paciente", "Mensagem"].forEach((token) => {
    assert.equal(source.includes(token), false, token);
  });
});
