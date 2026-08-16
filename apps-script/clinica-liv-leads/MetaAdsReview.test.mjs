import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./MetaAdsReview.gs", import.meta.url), "utf8");

function load(name) {
  return runInNewContext(`${source}\n;${name};`, {
    Date,
    Object,
    Array,
    String,
    Number,
    Math,
    JSON,
    RegExp,
    Map,
    Set,
    Utilities: {
      formatDate(date, zone, pattern) {
        if (pattern.includes("HH")) return "2026-08-18 10:05:00";
        return date.toISOString().slice(0, 10);
      },
    },
  });
}

test("a rotina da Meta usa somente leitura e não contém operações de mutação", () => {
  const forbidden = [
    /method\s*:\s*["']post["']/i,
    /method\s*:\s*["']delete["']/i,
    /method\s*:\s*["']put["']/i,
    /\/campaigns\/[^\s]+\?[^\s]*status=/i,
    /setStatus\s*\(/,
    /updateCampaign/i,
  ];
  forbidden.forEach((pattern) => assert.equal(pattern.test(source), false, String(pattern)));
  assert.match(source, /Nenhuma campanha foi alterada/);
  assert.match(source, /function executarTesteRevisaoMetaAds\(\)/);
  assert.match(source, /mutations:\s*0/);
});

test("terça-feira gera revisão semanal e o segundo dia útil gera revisão mensal", () => {
  const create = load("criarContextoRevisaoMetaAds_");
  const weekly = create(new Date("2026-08-18T14:00:00.000Z"));
  assert.equal(weekly.today, "2026-08-18");
  assert.equal(weekly.isWeekly, true);
  assert.equal(weekly.week.start, "2026-08-10");
  assert.equal(weekly.week.end, "2026-08-16");

  const monthly = create(new Date("2026-09-02T14:00:00.000Z"));
  assert.equal(monthly.isMonthly, true);
  const thirdBusinessDay = create(new Date("2026-09-03T14:00:00.000Z"));
  assert.equal(thirdBusinessDay.isMonthly, false);
});

test("normaliza as ações relevantes sem misturar conversa com LPV", () => {
  const normalize = load("normalizarInsightMeta_");
  const direct = normalize({
    campaign_name: "M26F01W | Facial SP | WhatsApp",
    spend: "40",
    impressions: "1000",
    reach: "500",
    inline_link_clicks: "20",
    actions: [
      { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "8" },
      { action_type: "landing_page_view", value: "3" },
    ],
  });
  assert.equal(direct.conversations, 8);
  assert.equal(direct.landingPageViews, 3);
  assert.equal(direct.primaryResults, 8);
  assert.equal(direct.linkCtr, 2);

  const site = normalize({
    campaign_name: "M26F02S | Facial SP | Site",
    spend: "30",
    impressions: "600",
    inline_link_clicks: "50",
    actions: [{ action_type: "landing_page_view", value: "35" }],
  });
  assert.equal(site.primaryResults, 35);
});

test("a Meta Site com gasto e zero atribuição gera alerta sem afirmar zero contato real", () => {
  const alerts = load("construirAlertasCriticosMeta_");
  const rows = [];
  Object.defineProperty(rows, "__sourceOk", { value: true });
  const result = alerts({
    sourceStatus: { daily: false, campaigns: false, adsets: false, thirty: true, funnel: true, landingHealth: false },
    thirty: [{ campaignCode: "M26F02S", spend: 120, impressions: 1000, reach: 800, linkClicks: 100, landingPageViews: 80, conversations: 0, primaryResults: 80 }],
    funnel: Object.assign(rows, [{ windowDays: 30, campaignCode: "M26F02S", creativeCode: "__TOTAL__", contacts: 0 }]),
  });
  const item = result.find((row) => row.signature === "meta_site_zero_attributed_contacts");
  assert.ok(item);
  assert.match(item.evidence, /não prova zero contatos reais/i);
});

test("idade menor que 40 em campanha facial é alerta e nunca ajuste automático", () => {
  const alerts = load("construirAlertasCriticosMeta_");
  const result = alerts({
    sourceStatus: { daily: false, campaigns: false, adsets: true, thirty: false, funnel: true, landingHealth: false },
    adsets: [{ id: "synthetic", name: "M26F01W | SP | 40+", targeting: { age_min: 35 } }],
    funnel: [],
  });
  assert.equal(result.some((row) => row.signature === "meta_age_floor|synthetic"), true);
  assert.match(result[0].action, /não editar automaticamente/i);
});

test("fadiga exige sinais combinados e amostra mínima", () => {
  const suggestions = load("construirSugestoesMeta_");
  const current = [{ campaignId: "c1", campaign: "M26F01W", campaignCode: "M26F01W", adId: "a1", ad: "C06H01", spend: 100, impressions: 2000, reach: 700, linkClicks: 20, landingPageViews: 0, conversations: 5, primaryResults: 5 }];
  const previous = [{ campaignId: "c1", campaign: "M26F01W", campaignCode: "M26F01W", adId: "a1", ad: "C06H01", spend: 80, impressions: 1400, reach: 700, linkClicks: 35, landingPageViews: 0, conversations: 10, primaryResults: 10 }];
  const result = suggestions({ seven: current, previousSeven: previous, thirty: [], funnel: [], sourceStatus: { ageGender: false } });
  assert.equal(result.some((row) => row.problem === "Sinal combinado de fadiga criativa"), true);
  assert.equal(result[0].queue, "Pode testar");
});

test("HTML escapa conteúdo recebido da plataforma", () => {
  const escape = load("htmlMeta_");
  assert.equal(escape("<script>'x' & \"y\"</script>"), "&lt;script&gt;&#39;x&#39; &amp; &quot;y&quot;&lt;/script&gt;");
});

test("credenciais ficam somente em Script Properties", () => {
  assert.match(source, /getProperty\("META_MARKETING_API_TOKEN"\)/);
  assert.equal(/META_MARKETING_API_TOKEN\s*:\s*["'][^"']+["']/.test(source), false);
  assert.equal(/EA[A-Za-z0-9_-]{20,}/.test(source), false);
});
