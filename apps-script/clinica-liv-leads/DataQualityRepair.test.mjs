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
    normalizePhone_(value) {
      return String(value || "").replace(/\D/g, "");
    },
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
    normalizarProfissionalOportunidade_(value) {
      const normalized = String(value || "").toLowerCase();
      if (normalized.includes("amanda")) return "amanda";
      if (normalized.includes("daniel")) return "daniel";
      return "unknown";
    },
    profissionalPermitidoOportunidade_(value) {
      return value === "amanda" || value === "daniel";
    },
    safeText_(value, maximumLength) {
      return Array.from(String(value || "")).slice(0, maximumLength).join("");
    },
    resolverFaseSincronizada_(crmStage, visibleStage, input) {
      const ranks = {
        Novo: 1,
        Qualificado: 2,
        "Consulta agendada": 3,
        "Consulta realizada": 4,
        "Paciente convertido": 5,
      };
      const stages = [crmStage, visibleStage, input.stage].filter(Boolean);
      const stage = stages.reduce((best, current) =>
        (ranks[current] || 0) > (ranks[best] || 0) ? current : best, "");
      return { ok: true, stage };
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { escolherLinhaCanonicaDuplicidade_, agruparLinhasPorOportunidade_, resolverLinhaLeadIndexada_, resolverOportunidadeConsultaIndexada_, auditarFaseConsultaIndexada_, eventoAgendaConsultaConsistente_, validarCorrecaoClassificacaoAuditada_ };`,
    sandbox,
  );
  return sandbox.__test;
}

test("audited classification corrections accept explicit human downgrades", () => {
  const { validarCorrecaoClassificacaoAuditada_ } = load();
  const correction = validarCorrecaoClassificacaoAuditada_({
    opportunityId: "opp_v2_amanda_12345678",
    expectedStage: "Qualificado",
    stage: "Novo",
    invalidateQualifiedConversion: true,
    reason: "Somente prefill estruturado, sem intenção pessoal posterior.",
  });

  assert.equal(correction.ok, true);
  assert.equal(correction.stage, "Novo");
  assert.equal(correction.invalidateQualifiedConversion, true);
});

test("conversion invalidation fails closed for a still-qualified stage", () => {
  const { validarCorrecaoClassificacaoAuditada_ } = load();
  const correction = validarCorrecaoClassificacaoAuditada_({
    opportunityId: "opp_v2_amanda_12345678",
    expectedStage: "Qualificado",
    stage: "Qualificado",
    invalidateQualifiedConversion: true,
  });

  assert.equal(correction.ok, false);
  assert.equal(correction.reason, "invalid_conversion_invalidation_target");
});

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

test("indexed lead resolution preserves duplicate and unique-match safety", () => {
  const { resolverLinhaLeadIndexada_ } = load();
  const entry = {
    columns: { "Opportunity ID": 2 },
    byOpportunityId: { duplicated: [2, 9], unique: [8] },
    byPhone: { 5511999999999: [8] },
  };

  assert.equal(resolverLinhaLeadIndexada_(entry, "unique", "").row, 8);
  assert.equal(
    resolverLinhaLeadIndexada_(entry, "duplicated", "").reason,
    "duplicate_opportunity_id_in_visible_sheet",
  );
  assert.equal(
    resolverLinhaLeadIndexada_(entry, "", "+55 11 99999-9999").row,
    8,
  );
});

test("consultation identity index only accepts one canonical match", () => {
  const { resolverOportunidadeConsultaIndexada_ } = load();
  const unique = {
    sheet: {},
    byOpportunityId: {
      "opp-1": [{
        row: 2,
        values: ["opp-1", "5511999999999", "", "amanda"],
      }],
      duplicated: [
        { row: 3, values: ["duplicated"] },
        { row: 4, values: ["duplicated"] },
      ],
    },
    byIdentity: {
      "amanda|5511999999999": [
        {
          row: 2,
          values: ["opp-1", "5511999999999", "", "amanda"],
        },
      ],
    },
  };

  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "opp-1",
      phone: "+55 11 99999-9999",
      professional: "Dra. Amanda",
    }).opportunityId,
    "opp-1",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      phone: "+55 11 99999-9999",
      professional: "Dra. Amanda",
    }).matchedBy,
    "unique_active_professional_phone",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "duplicated",
    }).reason,
    "duplicate_opportunity_id",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "opp-1",
      phone: "+55 11 99999-9999",
      professional: "Dr. Henrique",
    }).reason,
    "unsupported_professional_opportunity_link",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "opp-1",
      phone: "+55 11 98888-8888",
      professional: "Dra. Amanda",
    }).reason,
    "opportunity_phone_mismatch",
  );
});

test("consultation stage audit separates consistency from a real repair", () => {
  const { auditarFaseConsultaIndexada_ } = load();
  const columns = {
    "Opportunity ID": 1,
    "Situação do lead": 2,
  };
  const visibleIndex = {
    Leads: {
      columns,
      rows: [["opp-1", "Consulta agendada"]],
      byOpportunityId: { "opp-1": [2] },
      byPhone: {},
    },
  };
  const identity = {
    found: {
      row: 2,
      values: [
        "opp-1",
        "5511999999999",
        "",
        "amanda",
        "Leads",
        2,
        "open",
        "Consulta agendada",
      ],
    },
  };

  assert.equal(
    auditarFaseConsultaIndexada_(
      visibleIndex,
      identity,
      "Consulta agendada",
    ).state,
    "consistent",
  );
  identity.found.values[5] = 9;
  assert.equal(
    auditarFaseConsultaIndexada_(
      visibleIndex,
      identity,
      "Consulta agendada",
    ).state,
    "repairable",
  );
});

test("calendar event audit requires exact time and operational metadata", () => {
  const { eventoAgendaConsultaConsistente_ } = load();
  const start = new Date("2026-08-20T15:00:00-03:00");
  const end = new Date("2026-08-20T16:00:00-03:00");
  const expected = {
    start,
    end,
    title: "Consulta — Dra. Amanda",
    description: "Reserva operacional",
    acceptedDescriptions: [
      "Reserva operacional",
      "Reserva antiga, mas segura.",
    ],
    location: "Clínica LIV Faria Lima — Sala 1",
  };
  const event = {
    getStartTime: () => start,
    getEndTime: () => end,
    getTitle: () => expected.title,
    getDescription: () => expected.description,
    getLocation: () => expected.location,
  };

  assert.equal(eventoAgendaConsultaConsistente_(event, expected), true);
  event.getDescription = () => "  Reserva antiga,\nmas segura.  ";
  assert.equal(eventoAgendaConsultaConsistente_(event, expected), true);
  event.getEndTime = () => new Date(end.getTime() + 15 * 60 * 1000);
  assert.equal(eventoAgendaConsultaConsistente_(event, expected), false);
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
  const wrapper = source.match(
    /function executarSimulacaoCorrecaoIntegrada_\([\s\S]*?\n\}/,
  );
  assert.ok(wrapper);
  assert.match(wrapper[0], /INTEGRATED_DRY_RUN_CHECK/);
  assert.doesNotMatch(wrapper[0], /apply:\s*true/);
  for (let index = 1; index <= 9; index += 1) {
    const runner = source.match(
      new RegExp(`function simularCorrecao0${index}[\\s\\S]*?\\n\\}`),
    );
    assert.ok(runner);
    assert.doesNotMatch(runner[0], /apply:\s*true/);
  }
});

test("read-only repair paths use cached visible rows and do not repair headers", () => {
  assert.match(source, /function construirIndiceLeadsVisiveis_/);
  assert.match(source, /function resolverLinhaLeadIndexada_/);
  assert.match(
    source,
    /if \(apply\) garantirEstruturaSincronizacaoConsultas_\(sheet\)/,
  );
  assert.match(
    source,
    /const columns = apply\s*\? garantirEstruturaIntegradaLead_\(sheet\)\s*:\s*mapaCabecalhosOportunidade_\(sheet\)/,
  );
});

test("authorized deduplication is locked, reversible and exposes opaque backup ids", () => {
  const start = source.indexOf(
    "function executarDeduplicacaoReversivelLeads(input)",
  );
  const end = source.indexOf(
    "function restaurarLeadDuplicadoArquivado(input)",
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const applyFlow = source.slice(start, end);

  assert.match(applyFlow, /LockService\.getScriptLock\(\)/);
  assert.match(applyFlow, /lock\.tryLock\(30000\)/);
  assert.match(applyFlow, /finally\s*{\s*lock\.releaseLock\(\)/);
  assert.match(applyFlow, /setValue\("rolled_back"\)/);
  assert.match(applyFlow, /backupIds\.push\(entry\.backupId\)/);
  assert.match(applyFlow, /function aplicarDeduplicacaoReversivelAutorizada/);
  assert.match(applyFlow, /DEDUPLICATION_APPLY/);
});

test("authorized historical stage reconciliation is guarded and idempotent", () => {
  const start = source.indexOf(
    "function aplicarReconciliacaoFasesHistoricasAutorizada()",
  );
  const end = source.indexOf(
    "function reconciliarConsultasHistoricas(input)",
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const applyFlow = source.slice(start, end);

  assert.match(applyFlow, /expectedInspected = 131/);
  assert.match(applyFlow, /expectedRepairable = 27/);
  assert.match(applyFlow, /LockService\.getScriptLock\(\)/);
  assert.match(applyFlow, /lock\.tryLock\(30000\)/);
  assert.match(applyFlow, /preflight_mismatch/);
  assert.match(applyFlow, /alreadyReconciled: true/);
  assert.match(
    applyFlow,
    /reconciliarFasesHistoricasLeads\(\{ apply: true \}\)/,
  );
  assert.match(applyFlow, /postflightSummary\.repairable === 0/);
  assert.match(applyFlow, /finally\s*{\s*lock\.releaseLock\(\)/);
  assert.match(applyFlow, /HISTORICAL_STAGE_RECONCILIATION_APPLY/);
});

test("authorized consultation reconciliation applies only the locked safe subset", () => {
  const start = source.indexOf(
    "function aplicarReconciliacaoConsultasSegurasAutorizada()",
  );
  const end = source.indexOf(
    "function reconciliarAtribuicaoHistoricaLeads(input)",
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const applyFlow = source.slice(start, end);

  assert.match(applyFlow, /inspected: 43/);
  assert.match(applyFlow, /phaseRepairable: 3/);
  assert.match(applyFlow, /calendarSafeRepairable: 9/);
  assert.match(applyFlow, /calendarBlockedRepairable: 2/);
  assert.match(applyFlow, /reviewRequired: 29/);
  assert.match(applyFlow, /LockService\.getScriptLock\(\)/);
  assert.match(applyFlow, /lock\.tryLock\(30000\)/);
  assert.match(applyFlow, /preflight_mismatch/);
  assert.match(applyFlow, /alreadyReconciled: true/);
  assert.match(
    applyFlow,
    /reconciliarConsultasHistoricas\(\{ apply: true \}\)/,
  );
  assert.match(
    applyFlow,
    /reconciliarConsultasHistoricas\(\{ apply: false \}\)/,
  );
  assert.match(applyFlow, /matchesExpected\(postflight, false\)/);
  assert.match(applyFlow, /finally\s*{\s*lock\.releaseLock\(\)/);
  assert.match(applyFlow, /SAFE_CONSULTATION_RECONCILIATION_APPLY/);
});

test("authorized Google Ads reconciliation is locked, bounded and idempotent", () => {
  const source = readFileSync(
    new URL("./DataQualityRepair.gs", import.meta.url),
    "utf8",
  );
  const runner = source.match(
    /function aplicarReconciliacaoGoogleAdsSeguraAutorizada\(\) \{[\s\S]*?\n\}/,
  );

  assert.ok(runner);
  assert.match(runner[0], /tryLock\(30000\)/);
  assert.match(runner[0], /importRows: 5/);
  assert.match(runner[0], /ledgerRows: 2/);
  assert.match(runner[0], /visibleConversionNameMismatches: 5/);
  assert.match(runner[0], /missingLedger: 3/);
  assert.match(runner[0], /ledgerRows: 5/);
  assert.match(runner[0], /alreadyReconciled: true/);
  assert.match(runner[0], /reconstructedLedger !== 3/);
  assert.match(runner[0], /finally \{\s*lock\.releaseLock\(\)/);
});
