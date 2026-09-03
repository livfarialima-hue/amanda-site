import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const general = read("../otoplastia/index.html");
const child = read("../otoplastia-infantil/index.html");
const adult = read("../otoplastia-adulto/index.html");

test("general otoplasty page routes visitors to child and adult journeys above the fold", () => {
  const hero = general.match(/<section class="cv-hero"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(hero, /data-audience-route="child"[^>]+href="\.\.\/otoplastia-infantil\/"/);
  assert.match(hero, /data-audience-route="adult"[^>]+href="\.\.\/otoplastia-adulto\/"/);
  assert.doesNotMatch(hero, /data-track="whatsapp"/);
});

test("child and adult landing pages keep their result cases audience-specific", () => {
  assert.match(child, /otoplastia-antes-depois\.webp/);
  assert.match(child, /otoplastia-caso-02-antes-depois\.webp/);
  assert.doesNotMatch(child, /resultados\/otoplastia-adulto-antes-depois\.jpg/);

  assert.match(adult, /resultados\/otoplastia-adulto-antes-depois\.jpg/);
  assert.doesNotMatch(adult, /resultados\/otoplastia-antes-depois\.webp/);
  assert.doesNotMatch(adult, /resultados\/otoplastia-caso-02-antes-depois\.webp/);
});

test("the persuasion layer addresses emotional context and the three main barriers", () => {
  assert.match(child, /situações simples — prender o cabelo, aparecer em fotos ou deixar o boné de lado/);
  assert.match(child, /Três dúvidas que merecem resposta sem pressa/);
  assert.equal((child.match(/<article class="oti2-barrier-card">/g) || []).length, 3);

  assert.match(adult, /Não existe uma fase “tarde demais”/);
  assert.match(adult, /Três barreiras que podem ser esclarecidas na avaliação/);
  assert.equal((adult.match(/<article class="ota2-barrier-card">/g) || []).length, 3);
  assert.match(adult, /\.ota2-barriers\{order:4\}/);
});

test("campaign copy changes preserve the approved hero and result image configuration", () => {
  const sharedHero = /<img alt="Dra\. Amanda Schroeder" decoding="async" fetchpriority="high" height="813" sizes="\(max-width:760px\) 92vw, 50vw" src="\.\.\/campanhas\/assets\/amanda-hero\.webp" srcset="\.\.\/campanhas\/assets\/amanda-hero-480\.webp 480w, \.\.\/campanhas\/assets\/amanda-hero-720\.webp 720w, \.\.\/campanhas\/assets\/amanda-hero\.webp 970w" width="970"\/>/;
  assert.match(child, sharedHero);
  assert.match(adult, sharedHero);
  assert.match(child, /height="424" src="\.\.\/campanhas\/assets\/resultados\/otoplastia-antes-depois\.webp" width="1401"/);
  assert.match(child, /height="754" loading="lazy" src="\.\.\/campanhas\/assets\/resultados\/otoplastia-caso-02-antes-depois\.webp" width="1536"/);
  assert.match(adult, /height="1913" src="\.\.\/campanhas\/assets\/resultados\/otoplastia-adulto-antes-depois\.jpg" width="3683"/);
  assert.match(child, /\.oti2-hero-media img\{display:block;width:100%;height:auto;aspect-ratio:4\/3;object-fit:cover;object-position:center 20%\}/);
  assert.match(adult, /\.ota2-hero-media img\{display:block;width:100%;height:auto;aspect-ratio:4\/3;object-fit:cover;object-position:center 20%\}/);
});

test("audience pages prepare their WhatsApp message before attribution runs", () => {
  for (const page of [child, adult]) {
    const campaignScript = page.indexOf("otoplasty-campaign.js");
    const attributionScript = page.indexOf("conversion-tracking.js");
    assert.ok(campaignScript > 0);
    assert.ok(attributionScript > campaignScript);
  }
  assert.match(child, /data-audience-route="adult"/);
  assert.match(adult, /data-audience-route="child"/);
});

test("the revised audience pages expose the current modification date", () => {
  for (const page of [child, adult]) {
    assert.match(page, /"dateModified"\s*:\s*"2026-09-03"/);
  }
});

test("adult and child pages answer value intent without publishing surgery prices", () => {
  assert.match(adult, /data-search-intent="[^"]*otoplastia-valor[^"]*cirurgia-de-orelha-valor[^"]*otomodelacao/);
  assert.match(adult, /id="valor-da-otoplastia"/);
  assert.match(adult, /Quanto custa uma otoplastia em adultos\?/);
  assert.match(adult, /Otomodelação e otoplastia são a mesma coisa\?/);
  assert.match(adult, /Nesta página, <strong>otoplastia é uma cirurgia<\/strong>/);
  assert.match(adult, /\.ota2-value \.ota2-fit-grid\{grid-auto-flow:row;grid-auto-columns:auto;grid-template-columns:1fr!important;overflow:visible/);

  assert.match(child, /data-search-intent="[^"]*otoplastia-infantil-valor/);
  assert.match(child, /id="valor-da-otoplastia"/);
  assert.match(child, /Quanto custa uma otoplastia infantil\?/);

  for (const page of [child, adult]) {
    assert.match(page, /A consulta presencial custa R\$ 500; esse é o valor da consulta, não da cirurgia\./);
    assert.doesNotMatch(page, /R\$\s*(?:8(?:\.000)?|14(?:\.000)?)(?:\s*mil)?/i);
  }
});

test("conversion mechanics remain unchanged on both audience pages", () => {
  for (const [page, procedure, reference] of [
    [adult, "otoplastia-adulto", "OT01"],
    [child, "otoplastia-infantil", "OT02"],
  ]) {
    const trackedAnchors = page.match(/<a\b[^>]*data-track="whatsapp"[^>]*>/g) || [];
    assert.equal(trackedAnchors.length, 5);
    for (const anchor of trackedAnchors) {
      assert.match(anchor, /wa\.me\/5511961957144/);
      assert.match(anchor, new RegExp(`data-procedure="${procedure}"`));
      assert.match(anchor, new RegExp(`Ref\.%20${reference}`));
    }
  }
});
