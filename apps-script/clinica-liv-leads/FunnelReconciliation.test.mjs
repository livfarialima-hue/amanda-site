import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const dashboardSource = readFileSync(
  new URL("./FunnelDashboards.gs", import.meta.url),
  "utf8",
);
const reconciliationSource = readFileSync(
  new URL("./FunnelReconciliation.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = {
    Object,
    String,
    Array,
    JSON,
    Date,
    Number,
    Boolean,
    console: { log() {}, error() {} },
  };
  vm.runInNewContext(
    `${dashboardSource}\n${reconciliationSource}\nglobalThis.__test = {
      auditarProjecoesFunilComDados_,
      resumirAuditoriaProjecoesFunil_,
      criarDigestAlertasFunil_,
      decidirAlertaFunil_,
      corpoAlertaReconciliacaoFunil_,
      executarReparosIncrementaisFunil_,
      FUNNEL_RECONCILIATION_CONFIG
    };`,
    sandbox,
  );
  return sandbox.__test;
}

function canonicalRow({
  id = "opp_synthetic_1",
  professional = "amanda",
  stage = "Consulta agendada",
} = {}) {
  return [
    id,
    professional,
    "open",
    stage,
    "23/08/2026",
    "23/08/2026",
    "Meta",
    "M26C01W",
    "C07H01",
    "lifting-cervical",
    "WhatsApp",
    "ref_synthetic",
    "meta",
    "23/08/2026 12:00:00",
  ];
}

function commercialRow(expected, manual = []) {
  const row = [
    expected[0],
    expected[4],
    expected[6],
    expected[7],
    expected[8],
    expected[9],
    expected[10],
    expected[3],
    expected[5],
  ].concat(manual);
  while (row.length < 20) row.push("");
  return row.slice(0, 20);
}

test("detects a phase mismatch even when every projection has the same row count", () => {
  const { auditarProjecoesFunilComDados_ } = load();
  const expected = canonicalRow();
  const staleCanonical = canonicalRow({ stage: "Novo" });
  const staleCommercial = commercialRow(staleCanonical);

  const audit = auditarProjecoesFunilComDados_(
    [expected],
    [staleCanonical],
    [staleCommercial],
  );

  assert.equal(audit.ok, false);
  assert.equal(audit.expectedRows, 1);
  assert.equal(audit.canonicalRows, 1);
  assert.equal(audit.commercialRows, 1);
  assert.equal(audit.issueCounts.canonical_projection_mismatch, 1);
  assert.equal(audit.issueCounts.commercial_projection_mismatch, 1);
  assert.deepEqual([...audit.repairCandidateIds], ["opp_synthetic_1"]);
});

test("ignores canonical date display differences when the visible funnel is current", () => {
  const { auditarProjecoesFunilComDados_ } = load();
  const expected = canonicalRow();
  const formattedCanonical = [...expected];
  formattedCanonical[4] = "23/08/2026 00:00:00";
  formattedCanonical[5] = "23/08/2026 12:30:00";
  formattedCanonical[13] = "23/08/2026 12:00";

  const audit = auditarProjecoesFunilComDados_(
    [expected],
    [formattedCanonical],
    [commercialRow(expected)],
  );

  assert.equal(audit.ok, true);
  assert.equal(audit.totalIssues, 0);
  assert.deepEqual([...audit.repairCandidateIds], []);
});

test("ignores all commercial manual fields when automatic columns are healthy", () => {
  const { auditarProjecoesFunilComDados_ } = load();
  const expected = canonicalRow();
  const manual = [
    "23/08/2026",
    "24/08/2026",
    "",
    "",
    25000,
    "23/08/2026 12:05",
    5,
    "Sim",
    "24/08/2026 10:00",
    "Aguardando decisão",
    "Observação humana preservada",
  ];

  const audit = auditarProjecoesFunilComDados_(
    [expected],
    [expected],
    [commercialRow(expected, manual)],
  );

  assert.equal(audit.ok, true);
  assert.equal(audit.totalIssues, 0);
  assert.deepEqual([...audit.repairCandidateIds], []);
});

test("preserves closed commercial rows that retain only manual history", () => {
  const { auditarProjecoesFunilComDados_ } = load();
  const orphanManual = Array(20).fill("");
  orphanManual[9] = "23/08/2026";
  orphanManual[19] = "Histórico comercial preservado";

  const audit = auditarProjecoesFunilComDados_([], [], [orphanManual]);

  assert.equal(audit.ok, true);
  assert.equal(audit.totalIssues, 0);
  assert.equal(audit.preservedManualRowsWithoutId, 1);
});

test("flags duplicate IDs and never schedules an automatic repair for them", () => {
  const { auditarProjecoesFunilComDados_ } = load();
  const expected = canonicalRow();
  const audit = auditarProjecoesFunilComDados_(
    [expected],
    [expected, expected],
    [commercialRow(expected)],
  );

  assert.equal(audit.ok, false);
  assert.equal(audit.issueCounts.duplicate_id_in_canonical_projection, 1);
  assert.equal(audit.blocked, 1);
  assert.deepEqual([...audit.repairCandidateIds], []);
});

test("schedules missing and stale unique projections for bounded retry", () => {
  const { auditarProjecoesFunilComDados_ } = load();
  const first = canonicalRow({ id: "opp_synthetic_1" });
  const second = canonicalRow({ id: "opp_synthetic_2", stage: "Qualificado" });
  const audit = auditarProjecoesFunilComDados_(
    [first, second],
    [first],
    [commercialRow(first)],
  );

  assert.equal(audit.issueCounts.missing_canonical_projection, 1);
  assert.equal(audit.issueCounts.missing_commercial_projection, 1);
  assert.deepEqual([...audit.repairCandidateIds], ["opp_synthetic_2"]);
});

test("stakeholder summaries and digests never expose Opportunity IDs", () => {
  const {
    auditarProjecoesFunilComDados_,
    resumirAuditoriaProjecoesFunil_,
    criarDigestAlertasFunil_,
  } = load();
  const expected = canonicalRow();
  const audit = auditarProjecoesFunilComDados_([expected], [], []);
  const summary = resumirAuditoriaProjecoesFunil_(audit);
  const digest = criarDigestAlertasFunil_(summary);
  const serialized = JSON.stringify({ summary, digest });

  assert.doesNotMatch(serialized, /opp_synthetic_1/);
  assert.match(digest, /missing_canonical_projection:1/);
  assert.match(digest, /missing_commercial_projection:1/);
});

test("alerts only after persistence and respects the cooldown", () => {
  const { decidirAlertaFunil_ } = load();
  const first = decidirAlertaFunil_({
    nowMs: 1_000_000,
    digest: "mismatch:1",
    previousDigest: "",
    pendingSince: 0,
    lastAlertAt: 0,
    alertAfterMinutes: 10,
    cooldownHours: 6,
  });
  assert.equal(first.shouldSend, false);

  const persistent = decidirAlertaFunil_({
    nowMs: 1_000_000 + 11 * 60_000,
    digest: "mismatch:1",
    previousDigest: "mismatch:1",
    pendingSince: first.pendingSince,
    lastAlertAt: 0,
    alertAfterMinutes: 10,
    cooldownHours: 6,
  });
  assert.equal(persistent.shouldSend, true);

  const coolingDown = decidirAlertaFunil_({
    nowMs: 1_000_000 + 12 * 60_000,
    digest: "mismatch:1",
    previousDigest: "mismatch:1",
    pendingSince: first.pendingSince,
    lastAlertAt: 1_000_000 + 11 * 60_000,
    alertAfterMinutes: 10,
    cooldownHours: 6,
  });
  assert.equal(coolingDown.shouldSend, false);
});

test("a partial projector failure does not stop the remaining safe retries", () => {
  const { executarReparosIncrementaisFunil_ } = load();
  const calls = [];
  const report = executarReparosIncrementaisFunil_(
    {},
    ["opp_synthetic_1", "opp_synthetic_2", "opp_synthetic_3"],
    (_spreadsheet, id) => {
      calls.push(id);
      if (id === "opp_synthetic_2") throw new Error("synthetic failure");
      return { ok: true };
    },
  );

  assert.deepEqual([...calls], [
    "opp_synthetic_1",
    "opp_synthetic_2",
    "opp_synthetic_3",
  ]);
  assert.equal(report.attempted, 3);
  assert.equal(report.repaired, 2);
  assert.equal(report.failedRepairs, 1);
  assert.equal(report.deferredRepairs, 0);
});

test("an empty healthy retry set is idempotent and performs no projection", () => {
  const { executarReparosIncrementaisFunil_ } = load();
  let calls = 0;
  const report = executarReparosIncrementaisFunil_({}, [], () => {
    calls += 1;
    return { ok: true };
  });

  assert.equal(calls, 0);
  assert.deepEqual({ ...report }, {
    attempted: 0,
    repaired: 0,
    failedRepairs: 0,
    deferredRepairs: 0,
  });
});

test("the package is default-off, incremental and scheduled every 15 minutes", () => {
  const { FUNNEL_RECONCILIATION_CONFIG } = load();
  assert.equal(FUNNEL_RECONCILIATION_CONFIG.intervalMinutes, 15);
  assert.equal(FUNNEL_RECONCILIATION_CONFIG.maximumRepairsPerRun, 25);
  assert.match(reconciliationSource, /FUNNEL_RECONCILIATION_ENABLED/);
  assert.match(reconciliationSource, /everyMinutes\(FUNNEL_RECONCILIATION_CONFIG\.intervalMinutes\)/);
  assert.match(
    reconciliationSource,
    /:\s*atualizarLinhaFunilCanonicoPorOportunidade_;/,
  );
  assert.doesNotMatch(
    reconciliationSource,
    /reconstruirFonteFunilCanonico\(\{\s*apply:\s*true/,
  );
  assert.doesNotMatch(reconciliationSource, /clearContent\(/);
});

test("the alert body contains no patient, click or message fields", () => {
  const { corpoAlertaReconciliacaoFunil_ } = load();
  const body = corpoAlertaReconciliacaoFunil_({
    attempted: 1,
    repaired: 0,
    failedRepairs: 1,
    deferredRepairs: 0,
    postflight: {
      expectedRows: 2,
      canonicalRows: 1,
      commercialRows: 1,
      totalIssues: 1,
      repairable: 1,
      blocked: 0,
      issueCounts: { canonical_projection_mismatch: 1 },
    },
  });
  [
    "Telefone (E.164)",
    "Nome do paciente",
    "E-mail",
    "Mensagem",
    "GCLID",
    "GBRAID",
    "WBRAID",
  ].forEach((token) => {
    assert.doesNotMatch(body, new RegExp(token, "i"));
  });
});
