import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./FunnelDashboards.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = { Object, String, Array };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { normalizarPlataformaFunil_, linhaFunilComercialCanonica_, formulasPainelEconomicoCanonico_, FUNNEL_COMMERCIAL_HEADERS };`,
    sandbox,
  );
  return sandbox.__test;
}

test("normalizes acquisition platforms without collapsing direct WhatsApp", () => {
  const { normalizarPlataformaFunil_ } = load();
  assert.equal(normalizarPlataformaFunil_("Meta"), "Meta");
  assert.equal(normalizarPlataformaFunil_("Google Ads"), "Google");
  assert.equal(normalizarPlataformaFunil_("conteúdo educativo"), "Orgânico/Conteúdo");
  assert.equal(normalizarPlataformaFunil_("WhatsApp direto"), "WhatsApp direto");
  assert.equal(normalizarPlataformaFunil_(""), "Não identificada");
});

test("builds one commercial row per opaque opportunity and preserves manual fields", () => {
  const { linhaFunilComercialCanonica_ } = load();
  const canonical = [
    "opp_example",
    "amanda",
    "open",
    "Qualificado",
    46000,
    46001,
    "Meta",
    "M26F01W",
    "C06H01",
    "CTA",
    "WhatsApp",
  ];
  const manual = [46001, "", "", "", 1000, 46000.5, "stale", "Sim", 46002, "", ""];
  const row = linhaFunilComercialCanonica_(canonical, manual, 2);
  assert.equal(row.length, 20);
  assert.equal(row[0], "opp_example");
  assert.equal(row[2], "Meta");
  assert.equal(row[9], 46001);
  assert.equal(row[13], 1000);
  assert.match(row[15], /^=IF\(AND\(\$B2/);
  assert.equal(row[16], "Sim");
});

test("economic formulas count canonical populated IDs and current funnel stages", () => {
  const { formulasPainelEconomicoCanonico_ } = load();
  const formulas = formulasPainelEconomicoCanonico_();
  assert.match(formulas.total, /COUNTUNIQUE\(FILTER/);
  assert.match(formulas.total, /Funil Comercial/);
  assert.match(formulas.qualified, /Consulta agendada/);
  assert.match(formulas.qualified, /Paciente convertido/);
  assert.match(formulas.responseCoverage, /_BOT_METRICAS/);
  assert.doesNotMatch(formulas.total, /COUNTA/);
});

test("commercial funnel keeps the established 20-column layout", () => {
  const { FUNNEL_COMMERCIAL_HEADERS } = load();
  assert.equal(FUNNEL_COMMERCIAL_HEADERS.length, 20);
  assert.equal(FUNNEL_COMMERCIAL_HEADERS[0], "Opportunity ID");
  assert.equal(FUNNEL_COMMERCIAL_HEADERS[19], "Observação comercial");
});
