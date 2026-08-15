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
