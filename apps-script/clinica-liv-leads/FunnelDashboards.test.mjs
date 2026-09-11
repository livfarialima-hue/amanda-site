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
    `${source}\nglobalThis.__test = { normalizarPlataformaFunil_, linhaFunilComercialCanonica_, mesclarMarcosAutomaticosFunil_, construirIndiceMarcosAutomaticosFunil_, formulasPainelEconomicoCanonico_, FUNNEL_COMMERCIAL_HEADERS };`,
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

test("fills verified funnel milestones without overwriting manual decisions", () => {
  const { mesclarMarcosAutomaticosFunil_ } = load();
  const manual = ["manual qualification", "", "", "", 25000];
  const merged = mesclarMarcosAutomaticosFunil_(manual, {
    qualificationAt: "automatic qualification",
    scheduledAt: "2026-09-17",
    completedAt: "2026-09-24",
    closedAt: "2026-09-25",
    closedValue: 30000,
  });

  assert.equal(merged[0], "manual qualification");
  assert.equal(merged[1], "2026-09-17");
  assert.equal(merged[2], "2026-09-24");
  assert.equal(merged[3], "2026-09-25");
  assert.equal(merged[4], 25000);
});

test("uses event time for scheduling and excludes milestones awaiting review", () => {
  const { construirIndiceMarcosAutomaticosFunil_ } = load();
  const qualificationAt = new Date("2026-09-01T12:00:00Z");
  const scheduledAt = new Date("2026-09-02T13:00:00Z");
  const appointmentDate = new Date("2026-10-13T12:00:00Z");
  const completedAt = new Date("2026-10-13T15:00:00Z");
  const reviewedMilestoneAt = new Date("2026-09-03T12:00:00Z");
  const recordedMilestoneAt = new Date("2026-09-04T12:00:00Z");
  const sheets = {
    _LEAD_FASE_EVENTOS: {
      getLastRow: () => 3,
      getRange: () => ({
        getValues: () => [
          [qualificationAt, "evt_q", "opp_1", "hash", "test", "Novo", "Qualificado", "Qualificado", "high", "m1", "applied", "", "amanda"],
          [scheduledAt, "evt_s", "opp_1", "hash", "test", "Qualificado", "Consulta agendada", "Consulta agendada", "high", "m2", "applied", "", "amanda"],
        ],
      }),
    },
    Consultas: {
      getLastRow: () => 2,
      getLastColumn: () => 8,
      getRange: (row) => ({
        getDisplayValues: () => [[
          "Opportunity ID",
          "Data agendada",
          "Status",
          "Data realizada",
          "Resultado comercial",
          "Data do fechamento",
          "Valor fechado (R$)",
          "Confirmação da paciente",
        ]],
        getValues: () => row === 1 ? [] : [[
          "opp_1",
          appointmentDate,
          "Realizada",
          completedAt,
          "",
          "",
          "",
          "",
        ]],
      }),
    },
    _OPORTUNIDADE_MARCOS: {
      getLastRow: () => 3,
      getRange: () => ({
        getValues: () => [
          ["evt_review", "opp_1", "accepted", reviewedMilestoneAt, "test", "low", "review_required", new Date()],
          ["evt_recorded", "opp_1", "accepted", recordedMilestoneAt, "test", "high", "recorded", new Date()],
        ],
      }),
    },
  };
  const index = construirIndiceMarcosAutomaticosFunil_({
    getSheetByName: (name) => sheets[name] || null,
  });

  assert.equal(index.opp_1.qualificationAt.getTime(), qualificationAt.getTime());
  assert.equal(index.opp_1.scheduledAt.getTime(), scheduledAt.getTime());
  assert.notEqual(index.opp_1.scheduledAt.getTime(), appointmentDate.getTime());
  assert.equal(index.opp_1.completedAt.getTime(), completedAt.getTime());
  assert.equal(index.opp_1.closedAt.getTime(), recordedMilestoneAt.getTime());
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
  assert.match(formulas.responseCoverage, /"N\/D"/);
  assert.doesNotMatch(formulas.responseCoverage, /;0\)/);
  assert.match(formulas.responseMedian, /"N\/D"/);
  assert.match(formulas.responseP95, /"N\/D"/);
  assert.match(formulas.routeCoverage, /\$S\$2/);
  assert.match(formulas.pendingRoutes, /\$P\$2/);
  assert.match(formulas.overdueP0P1, /\$V\$2/);
  assert.match(formulas.operationalGate, /\$X\$2/);
  assert.doesNotMatch(formulas.total, /COUNTA/);
});

test("commercial funnel keeps the established 20-column layout", () => {
  const { FUNNEL_COMMERCIAL_HEADERS } = load();
  assert.equal(FUNNEL_COMMERCIAL_HEADERS.length, 20);
  assert.equal(FUNNEL_COMMERCIAL_HEADERS[0], "Opportunity ID");
  assert.equal(FUNNEL_COMMERCIAL_HEADERS[19], "Observação comercial");
});
