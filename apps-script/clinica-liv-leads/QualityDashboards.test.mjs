import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./QualityDashboards.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = { Object };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { formulasPaineisQualidade_, QUALITY_DASHBOARD_CONFIG };`,
    sandbox,
  );
  return sandbox.__test;
}

test("health formulas use the current Google Ads import and compatible ranges", () => {
  const { formulasPaineisQualidade_ } = load();
  const formulas = formulasPaineisQualidade_();

  assert.match(formulas.markedVersusExported, /IMPORT_GOOGLE_ADS/);
  assert.doesNotMatch(formulas.markedVersusExported, /IMPORT_GCLID/);
  assert.match(formulas.conflictingClickIds, /\$K\$2:\$K/);
  assert.match(formulas.conflictingClickIds, /\$L\$2:\$L/);
  assert.match(formulas.conflictingClickIds, /\$M\$2:\$M/);
});

test("canonical funnel health fails explicitly when its source cannot be read", () => {
  const { formulasPaineisQualidade_ } = load();
  const formula = formulasPaineisQualidade_().canonicalFunnelDifference;

  assert.match(formula, /_CRM_OPORTUNIDADES/);
  assert.match(formula, /_FUNIL_CANONICO/);
  assert.match(formula, /;999\)$/);
});

test("classification panel counts only typed technical failures", () => {
  const { formulasPaineisQualidade_ } = load();
  const formula = formulasPaineisQualidade_().technicalClassificationFailures;

  assert.match(formula, /_WHATSAPP_CLASSIFICACAO_EXCECOES/);
  assert.match(formula, /technical_failure/);
  assert.doesNotMatch(formula, /_WHATSAPP_CLASSIFICACAO'!/);
});

test("health edit rule never overwrites the section heading", () => {
  const { QUALITY_DASHBOARD_CONFIG } = load();

  assert.equal(QUALITY_DASHBOARD_CONFIG.healthRuleCell, "A14");
  assert.equal(QUALITY_DASHBOARD_CONFIG.healthReviewDateCell, "B15");
});
