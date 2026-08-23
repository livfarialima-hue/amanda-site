import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./google-ads-search-review-email.js", import.meta.url), "utf8");

function loadFunction(name) {
  return runInNewContext(`${source}\n;${name};`, {
    console,
    Date,
    Intl,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    RegExp,
    Math,
    JSON,
    Utilities: {
      formatDate(date) {
        return date.toISOString().slice(0, 10);
      },
    },
  });
}

test("a rotina não contém chamadas de mutação do Google Ads", () => {
  const forbidden = [
    ".createNegativeKeyword(",
    ".newKeywordBuilder(",
    ".setBudget(",
    ".setAmount(",
    ".setBid(",
    ".pause(",
    ".enable(",
    "AdsApp.mutate(",
    "AdsApp.mutateAll(",
  ];
  forbidden.forEach((token) => assert.equal(source.includes(token), false, token));
});

test("protege linguagem leiga legítima de negativa automática", () => {
  const classify = loadFunction("classifySearchTerm");
  assert.equal(classify("plástica das pálpebras").kind, "protected_lay_term");
  assert.equal(classify("cirurgia de orelha de abano").kind, "protected_lay_term");
});

test("separa preço de irrelevância", () => {
  const classify = loadFunction("classifySearchTerm");
  assert.equal(classify("quanto custa lifting facial").kind, "price_intent");
  assert.equal(classify("lifting facial preço").kind, "price_intent");
  assert.equal(classify("curso de blefaroplastia").kind, "negative_candidate");
});

test("sugere positiva exata apenas para termo compatível com evidência mínima", () => {
  const buildSuggestions = loadFunction("buildSuggestions");
  const suggestions = buildSuggestions({
    searchTerms: [{
      campaign: "S_BR_SP_BLEFAROPLASTIA",
      adGroup: "AG_BLEFAROPLASTIA",
      searchTerm: "blefaroplastia superior",
      clicks: 4,
      cost: 12,
      conversions: 0,
    }],
    keywords: [],
    directNegatives: [],
    thirtyDayCampaigns: [],
    conversionActions: [],
    changes: [],
  });
  assert.equal(suggestions.some((row) => row.change.includes("[blefaroplastia superior]")), true);
});

test("negativa proposta é exata e nunca aplicada", () => {
  const buildSuggestions = loadFunction("buildSuggestions");
  const suggestions = buildSuggestions({
    searchTerms: [{
      campaign: "S_BR_SP_BLEFAROPLASTIA",
      adGroup: "AG_BLEFAROPLASTIA",
      searchTerm: "curso de blefaroplastia",
      clicks: 3,
      cost: 8,
      conversions: 0,
    }],
    keywords: [],
    directNegatives: [],
    thirtyDayCampaigns: [],
    conversionActions: [],
    changes: [],
  });
  assert.equal(suggestions[0].change.includes("adicionar [curso de blefaroplastia] como negativa exata"), true);
  assert.equal(suggestions[0].guardrail.includes("nunca aplicar automaticamente"), true);
});

test("segunda-feira gera revisão semanal", () => {
  const createContext = loadFunction("createRunContext");
  const context = createContext(new Date("2026-08-17T12:00:00.000Z"));
  assert.equal(context.today, "2026-08-17");
  assert.equal(context.isWeekly, true);
  assert.equal(context.week.start, "2026-08-10");
  assert.equal(context.week.end, "2026-08-16");
});

test("primeiro dia útil do mês é identificado sem marcar fim de semana", () => {
  const firstBusinessDay = loadFunction("isFirstBusinessDay");
  assert.equal(firstBusinessDay("2026-08-03"), true);
  assert.equal(firstBusinessDay("2026-08-01"), false);
  assert.equal(firstBusinessDay("2026-08-04"), false);
});

test("HTML escapa conteúdo potencialmente interpretável", () => {
  const escapeHtml = loadFunction("html");
  assert.equal(escapeHtml("<script>'x' & \"y\"</script>"), "&lt;script&gt;&#39;x&#39; &amp; &quot;y&quot;&lt;/script&gt;");
});

test("falha de fonte não vira falso zero de lead qualificado", () => {
  const buildAlerts = loadFunction("buildCriticalAlerts");
  const alerts = buildAlerts({
    sourceStatus: {
      yesterdayCampaigns: false,
      dailyCampaigns: false,
      policyIssues: false,
      thirtyDayCampaigns: true,
      conversionActions: false,
      conversionSettings: false,
      landingHealth: false,
    },
    thirtyDayCampaigns: [{ impressions: 1000, clicks: 100, cost: 500, conversions: 0, allConversions: 0 }],
    conversionActions: [],
  });
  assert.equal(alerts.some((row) => row.title.includes("Nenhum lead qualificado")), false);
});

test("zero qualificado só gera alerta quando a consulta foi concluída", () => {
  const buildAlerts = loadFunction("buildCriticalAlerts");
  const alerts = buildAlerts({
    sourceStatus: {
      yesterdayCampaigns: false,
      dailyCampaigns: false,
      policyIssues: false,
      thirtyDayCampaigns: true,
      conversionActions: true,
      conversionSettings: false,
      landingHealth: false,
    },
    thirtyDayCampaigns: [{ impressions: 1000, clicks: 100, cost: 500, conversions: 0, allConversions: 0 }],
    conversionActions: [],
  });
  assert.equal(alerts.some((row) => row.title.includes("Nenhum lead qualificado")), true);
  assert.equal(alerts[0].evidence.includes("não prova zero leads reais"), true);
});

test("anomalia usa o mesmo dia da semana e exige diferença absoluta", () => {
  const anomaly = loadFunction("accountSameWeekdayAnomaly");
  const rows = [
    { date: "2026-08-14", cost: 100 },
    { date: "2026-08-07", cost: 20 },
    { date: "2026-07-31", cost: 20 },
    { date: "2026-07-24", cost: 20 },
    { date: "2026-07-17", cost: 20 },
  ];
  const result = anomaly(rows);
  assert.equal(result.samples, 4);
  assert.equal(result.isAnomaly, true);
});

test("decisões do e-mail usam as quatro filas operacionais", () => {
  const normalize = loadFunction("normalizeDecision");
  assert.equal(normalize("corrigir"), "Corrigir agora");
  assert.equal(normalize("testar"), "Pode testar");
  assert.equal(normalize("observar"), "Aguardar dados");
  assert.equal(normalize("não alterar"), "Não alterar");
});

test("consolida variações de preço por campanha e grupo", () => {
  const buildSuggestions = loadFunction("buildSuggestions");
  const suggestions = buildSuggestions({
    searchTerms: [
      { campaign: "S_BR_SP_BLEFAROPLASTIA", adGroup: "AG_BLEFAROPLASTIA", searchTerm: "blefaroplastia preço", clicks: 2, cost: 8, conversions: 0 },
      { campaign: "S_BR_SP_BLEFAROPLASTIA", adGroup: "AG_BLEFAROPLASTIA", searchTerm: "valor blefaroplastia", clicks: 3, cost: 12, conversions: 1 },
    ],
    keywords: [], directNegatives: [], sharedNegatives: [], thirtyDayCampaigns: [],
    conversionActions: [], changes: [], funnelAggregates: [],
  });
  const price = suggestions.filter((row) => row.problem.includes("Intenção explícita de preço"));
  assert.equal(price.length, 1);
  assert.equal(price[0].evidence.includes("2 consulta(s); 5 cliques; R$ 20,00"), true);
});

test("preserva roteamentos verificados e sinaliza autobloqueio cervical", () => {
  const buildSuggestions = loadFunction("buildSuggestions");
  const suggestions = buildSuggestions({
    searchTerms: [], keywords: [], sharedNegatives: [], thirtyDayCampaigns: [],
    conversionActions: [], changes: [], funnelAggregates: [],
    directNegatives: [
      { level: "campanha", campaign: "S_BR_SP_BLEFAROPLASTIA", adGroup: "—", text: "lipo de papada", matchType: "PHRASE" },
      { level: "campanha", campaign: "S_BR_SP_LIFTING_CERVICAL", adGroup: "—", text: "lipoaspiração de papada", matchType: "PHRASE" },
    ],
  });
  const risks = suggestions.filter((row) => row.problem === "Negativa com risco de bloquear busca legítima");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].area.includes("LIFTING_CERVICAL"), true);
});

test("meta personalizada válida prevalece sobre categoria/origem não biddable", () => {
  const findMissing = loadFunction("findCampaignsMissingQualifiedGoal");
  const setting = { resourceName: "customers/1/conversionActions/10", category: "QUALIFIED_LEAD", origin: "UPLOAD" };
  const missing = findMissing({
    campaignGoalConfigs: [{ campaign: "S_BR_SP_BLEFAROPLASTIA", goalConfigLevel: "CAMPAIGN", customConversionGoal: "customers/1/customConversionGoals/20" }],
    customConversionGoals: [{ resourceName: "customers/1/customConversionGoals/20", status: "ENABLED", conversionActions: [setting.resourceName] }],
    campaignGoals: [{ campaign: "S_BR_SP_BLEFAROPLASTIA", category: setting.category, origin: setting.origin, biddable: false }],
  }, setting);
  assert.equal(missing.length, 0);
});

test("meta personalizada sem a ação qualificada é sinalizada", () => {
  const findMissing = loadFunction("findCampaignsMissingQualifiedGoal");
  const setting = { resourceName: "customers/1/conversionActions/10", category: "QUALIFIED_LEAD", origin: "UPLOAD" };
  const missing = findMissing({
    campaignGoalConfigs: [{ campaign: "S_BR_SP_OTOPLASTIA", goalConfigLevel: "CAMPAIGN", customConversionGoal: "customers/1/customConversionGoals/20" }],
    customConversionGoals: [{ resourceName: "customers/1/customConversionGoals/20", status: "ENABLED", conversionActions: [] }],
    campaignGoals: [],
  }, setting);
  assert.equal(missing.length, 1);
  assert.equal(missing[0], "S_BR_SP_OTOPLASTIA");
});

test("consultas evitam combinações e campos não suportados observados ao vivo", () => {
  const conversionQuery = loadFunction("conversionActionQuery")("2026-07-01", "2026-07-31");
  const assetQuery = loadFunction("assetPerformanceQuery")("2026-07-01", "2026-07-31");
  assert.equal(conversionQuery.includes("metrics.cost_micros"), false);
  assert.equal(assetQuery.includes("policy_summary"), false);
});

test("e-mail declara quando uma seção foi truncada", () => {
  const buildEmail = loadFunction("buildPlainTextEmail");
  const rows = Array.from({ length: 41 }, (_, index) => ({
    priority: "P3", decision: "Aguardar dados", area: `Área ${index}`, problem: "P", evidence: "E",
    change: "C", minimum: "M", metric: "M", guardrail: "G", rollback: "R",
  }));
  const report = { accountName: "Conta", accountId: "1", generatedAt: "2026-08-22", accountTimeZone: "America/Sao_Paulo", criticalAlerts: [], suggestions: rows, funnelAggregates: [], warnings: [] };
  const context = { week: { start: "2026-08-10", end: "2026-08-16" } };
  assert.equal(buildEmail(report, context).includes("exibindo 40; 1 omitida(s)"), true);
});
