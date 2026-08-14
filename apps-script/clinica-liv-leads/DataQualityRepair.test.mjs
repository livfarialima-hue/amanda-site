import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./DataQualityRepair.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = {
    Array,
    Boolean,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    rankFaseOportunidade_(value) {
      return {
        Novo: 1,
        Qualificado: 2,
        "N\u00e3o qualificado": 2,
        "Consulta agendada": 3,
        "Consulta realizada": 4,
        "Paciente convertido": 5,
      }[String(value || "")] || 0;
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { escolherLinhaCanonicaDuplicidade_, agruparLinhasPorOportunidade_ };`,
    sandbox,
  );
  return sandbox.__test;
}

test("duplicate planning keeps the highest stage and returns every excess row", () => {
  const { escolherLinhaCanonicaDuplicidade_ } = load();
  const result = escolherLinhaCanonicaDuplicidade_([
    { rowNumber: 2, stage: "Novo" },
    { rowNumber: 8, stage: "Consulta agendada" },
    { rowNumber: 9, stage: "Qualificado" },
  ], 2);

  assert.equal(result.ok, true);
  assert.equal(result.canonicalRow, 8);
  assert.equal(result.targetStage, "Consulta agendada");
  assert.deepEqual(Array.from(result.duplicateRows), [2, 9]);
});

test("CRM pointer breaks a tie only among rows at the highest stage", () => {
  const { escolherLinhaCanonicaDuplicidade_ } = load();
  const result = escolherLinhaCanonicaDuplicidade_([
    { rowNumber: 2, stage: "Qualificado" },
    { rowNumber: 8, stage: "Qualificado" },
  ], 2);

  assert.equal(result.ok, true);
  assert.equal(result.canonicalRow, 2);
});

test("qualified versus non-qualified is never resolved automatically", () => {
  const { escolherLinhaCanonicaDuplicidade_ } = load();
  const result = escolherLinhaCanonicaDuplicidade_([
    { rowNumber: 2, stage: "Qualificado" },
    { rowNumber: 8, stage: "N\u00e3o qualificado" },
  ], 2);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "equal_rank_stage_conflict");
});

test("groups only non-empty opportunity ids", () => {
  const { agruparLinhasPorOportunidade_ } = load();
  const columns = { "Opportunity ID": 2, "Situa\u00e7\u00e3o do lead": 3 };
  const groups = agruparLinhasPorOportunidade_([
    ["a", "opp-1", "Novo"],
    ["b", "", "Novo"],
    ["c", "opp-1", "Qualificado"],
  ], columns);

  assert.deepEqual(Object.keys(groups), ["opp-1"]);
  assert.equal(groups["opp-1"].length, 2);
});

test("integrated repair runner keeps every mutating repair in dry-run mode", () => {
  const start = source.indexOf(
    "function executarSimulacoesCorrecaoIntegrada()",
  );
  assert.notEqual(start, -1);
  const runner = source.slice(start);

  assert.match(runner, /auditarIntegridadeFunilLocal_\(\)/);
  assert.match(runner, /executarDeduplicacaoReversivelLeads\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarFasesHistoricasLeads\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarConsultasHistoricas\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarAtribuicaoHistoricaLeads\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarGoogleAdsLedgerEImportacao\(\{ apply: false \}\)/);
  assert.match(runner, /reconstruirFonteFunilCanonico\(\{ apply: false \}\)/);
  assert.match(runner, /executarReaperFilaClassificacao\(\{ apply: false \}\)/);
  assert.match(runner, /auditarSlaOperacional\(\)/);
  assert.doesNotMatch(runner, /apply:\s*true/);
  assert.match(runner, /INTEGRATED_DRY_RUN/);
});

test("split repair runners expose every check without enabling writes", () => {
  const start = source.indexOf(
    "function executarSimulacaoCorrecaoIntegrada_",
  );
  assert.notEqual(start, -1);
  const runners = source.slice(start);

  for (let index = 1; index <= 9; index += 1) {
    assert.match(runners, new RegExp(`function simularCorrecao0${index}`));
  }
  assert.match(runners, /INTEGRATED_DRY_RUN_CHECK/);
  assert.doesNotMatch(runners, /apply:\s*true/);
});
