import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const stylesheet = readFileSync(new URL("campanhas/secondary-conversion.css", root), "utf8");
const secondaryPages = [
  "abdominoplastia",
  "braquioplastia",
  "lip-lifting",
  "lipoaspiracao",
  "mamoplastia-redutora",
  "mastopexia",
  "mastopexia-com-protese",
  "ninfoplastia",
  "pos-bariatrica",
  "protese-de-mama",
];
const refreshedSecondaryPages = new Set([
  "abdominoplastia",
  "braquioplastia",
  "lipoaspiracao",
  "mamoplastia-redutora",
  "mastopexia",
  "mastopexia-com-protese",
  "pos-bariatrica",
  "protese-de-mama",
]);
const mamaAndBodyPages = [
  "mama",
  "mamoplastia-redutora",
  "mastopexia",
  "mastopexia-com-protese",
  "protese-de-mama",
  "contorno-corporal",
  "abdominoplastia",
  "lipoaspiracao",
  "braquioplastia",
  "pos-bariatrica",
];

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("secondary procedure colors meet WCAG AA contrast", () => {
  assert.ok(contrast("#fffaf7", "#62473e") >= 4.5);
  assert.ok(contrast("#f0dfd7", "#62473e") >= 4.5);
  assert.ok(contrast("#584940", "#f0e6e0") >= 4.5);
});

test("secondary procedure stylesheet contains scoped contrast overrides", () => {
  assert.match(stylesheet, /main \.secondary-practical :is\(\.eyebrow, h2, p\)/);
  assert.match(stylesheet, /main \.step > span/);
  assert.match(stylesheet, /main #resultados\.results/);
  assert.match(stylesheet, /main #faq\.results/);
  assert.match(stylesheet, /footer :is\(a, span, strong, p, button\)/);
  assert.match(stylesheet, /footer \.footer-navigation \.footer-nav-group > strong/);
});

test("every secondary procedure page requests the contrast-fixed stylesheet", () => {
  for (const page of secondaryPages) {
    const html = readFileSync(new URL(`${page}/index.html`, root), "utf8");
    const expectedVersion = refreshedSecondaryPages.has(page)
      ? "20260912-mobile-contrast-2"
      : "20260814-contrast-1";
    assert.match(
      html,
      new RegExp(`secondary-conversion\\.css\\?v=${expectedVersion}`),
    );
  }
});

test("mama and body pages avoid formulaic copy and load the humanized dynamic text", () => {
  const bannedPatterns = [
    /questão central/i,
    /partes? centrais? da decisão/i,
    /jornada organizada/i,
    /transforma .{0,90} em/i,
    /plano possível/i,
    /sequência viável/i,
    /troca cirúrgica/i,
    /vale essa troca/i,
    /capacidade dos tecidos/i,
    /raciocínio geral/i,
    /a consulta testa/i,
    /a prioridade cruza/i,
    /não são caminhos intercambiáveis/i,
    /quando pode fazer sentido/i,
    /principal componente/i,
    /qual componente/i,
    /entra na conversa/i,
    /técnicas que fazem sentido/i,
    /a redução é dimensionada/i,
    /as respostas delimitam/i,
    /participam da mudança/i,
    /mantém o cuidado proporcional/i,
    /o plano é construído/i,
    /a cicatriz fica planejada/i,
    /plano por prioridades/i,
    /entram no cronograma/i,
    /a troca que precisa ser compreendida/i,
    /prontidão clínica/i,
    /ajudam a ordenar/i,
    /recuperação mais estruturada/i,
    /cicatriz planejada/i,
  ];

  const sourceBannedPatterns = [
    /pode fazer sentido e como a cicatriz entra na decisão/i,
    /ponderando melhora de contorno/i,
  ];

  for (const page of mamaAndBodyPages) {
    const html = readFileSync(new URL(`${page}/index.html`, root), "utf8");
    const text = visibleText(html);
    for (const pattern of bannedPatterns) {
      assert.doesNotMatch(text, pattern, `${page}/index.html`);
    }
    for (const pattern of sourceBannedPatterns) {
      assert.doesNotMatch(html, pattern, `${page}/index.html metadata`);
    }
  }

  for (const page of refreshedSecondaryPages) {
    const html = readFileSync(new URL(`${page}/index.html`, root), "utf8");
    assert.match(html, /secondary-conversion\.js\?v=20260912-human-copy-2/);
    assert.match(html, /site-enhancements\.js\?v=20260912-human-copy-2/);
  }

  const contourHtml = readFileSync(new URL("contorno-corporal/index.html", root), "utf8");
  assert.match(contourHtml, /site-enhancements\.js\?v=20260912-human-copy-2/);

  const secondaryScript = readFileSync(new URL("campanhas/secondary-conversion.js", root), "utf8");
  assert.match(secondaryScript, /Na consulta, você descobre onde a lipo pode ajudar/);
  assert.doesNotMatch(secondaryScript, /principal componente|capacidade dos tecidos|vale essa troca/i);

  const enhancementsScript = readFileSync(new URL("campanhas/site-enhancements.js", root), "utf8");
  assert.match(enhancementsScript, /Sua cirurgia envolve uma equipe inteira/);
  assert.match(enhancementsScript, /Um lugar reservado para conversar com calma/);
  assert.doesNotMatch(enhancementsScript, /a associação entra na conversa|orientar a leitura — não para prometer/i);
});
