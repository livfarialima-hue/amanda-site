import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const liftingPrice = readFileSync(
  new URL(
    "../conteudos/quanto-custa-lifting-facial-sao-paulo/index.html",
    import.meta.url,
  ),
  "utf8",
);
const generalPrice = readFileSync(
  new URL(
    "../conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/index.html",
    import.meta.url,
  ),
  "utf8",
);
const lifting = readFileSync(
  new URL("../lifting-facial/index.html", import.meta.url),
  "utf8",
);
const contentIndex = readFileSync(
  new URL("../conteudos/index.html", import.meta.url),
  "utf8",
);
const sitemap = readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");

test("lifting price page answers the price intent above the first article block", () => {
  const firstBlock = liftingPrice.indexOf('class="cv-article-body"');
  const miniRange = liftingPrice.indexOf("R$ 18 mil e R$ 25 mil");
  const liftingRange = liftingPrice.indexOf("R$ 26 mil e R$ 42 mil");

  assert.ok(firstBlock > 0);
  assert.ok(miniRange > 0 && miniRange < firstBlock);
  assert.ok(liftingRange > 0 && liftingRange < firstBlock);
});

test("lifting price page preserves procedure depth and direct conversion routes", () => {
  assert.match(liftingPrice, /href="\.\.\/\.\.\/lifting-facial\/"/);
  assert.match(liftingPrice, /data-track="content-depth"/);
  assert.match(liftingPrice, /data-track-id="procedure_overview"/);
  assert.match(liftingPrice, /data-procedure="lifting-facial-preco"/);
  assert.match(liftingPrice, /data-track="whatsapp"/);
  assert.match(liftingPrice, /Refer%C3%AAncia%3A%20pre%C3%A7o%20de%20lifting%20facial/);
  assert.match(
    liftingPrice,
    /href="\.\.\/quanto-custa-cirurgia-plastica-facial-sao-paulo\/"/,
  );
});

test("the generic guide and lifting page link to the specific price guide", () => {
  for (const page of [generalPrice, lifting, contentIndex]) {
    assert.match(page, /quanto-custa-lifting-facial-sao-paulo/);
  }
});

test("deep plane is answered briefly without making it the universal technique", () => {
  assert.match(liftingPrice, /abordagem <strong>deep plane<\/strong>/i);
  assert.match(lifting, /A Dra\. Amanda realiza lifting facial com abordagem deep plane/);
  assert.match(lifting, /não é necessariamente a melhor opção para todas as pessoas/);
});

test("the specific price guide is canonical and discoverable", () => {
  assert.match(
    liftingPrice,
    /rel="canonical" href="https:\/\/draamandaschroeder\.com\.br\/conteudos\/quanto-custa-lifting-facial-sao-paulo\/"/,
  );
  assert.match(liftingPrice, /"@type":"FAQPage"/);
  assert.match(sitemap, /quanto-custa-lifting-facial-sao-paulo/);
});

test("price communication is patient-facing and total-plan oriented", () => {
  assert.doesNotMatch(liftingPrice, /Não divulgamos apenas o honorário da cirurgiã/);
  assert.doesNotMatch(liftingPrice, /operação de atendimento em volume/);
  assert.match(liftingPrice, /equipe, hospital, anestesia, materiais e acompanhamento/);
  assert.match(liftingPrice, /Hospital Sírio-Libanês/);
  assert.match(liftingPrice, /Hospital Nove de Julho/);
  assert.match(liftingPrice, /hospitais com custo mais acessível/);
  assert.match(liftingPrice, /Honorários profissionais/);
  assert.match(liftingPrice, /Anestesia e estrutura hospitalar/);
  assert.match(liftingPrice, /Preparo e recuperação/);
  assert.match(liftingPrice, /Pix ou débito/);
  assert.match(liftingPrice, /pagamento precisa estar concluído até a data da cirurgia/);
});
