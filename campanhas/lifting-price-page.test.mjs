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

test("lifting price page answers the cost-composition intent above the first article block without monetary values", () => {
  const firstBlock = liftingPrice.indexOf('class="cv-article-body"');
  const individualBudget = liftingPrice.indexOf(
    "O orçamento é definido depois da avaliação",
  );

  assert.ok(firstBlock > 0);
  assert.ok(individualBudget > 0 && individualBudget < firstBlock);
  assert.doesNotMatch(liftingPrice, /R\$/);
  assert.doesNotMatch(liftingPrice, /18\s*(?:mil|[–-]\s*25)/i);
  assert.doesNotMatch(liftingPrice, /26\s*(?:mil|[–-]\s*42)/i);
  assert.doesNotMatch(liftingPrice, /faixas? de (?:preço|referência)/i);

  for (const component of [
    /equipe médica/i,
    /hospital/i,
    /anestesia/i,
    /materiais/i,
    /exames/i,
    /preparo/i,
    /acompanhamento/i,
  ]) {
    assert.match(liftingPrice.slice(0, firstBlock), component);
  }
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

test("the former surgical ranges do not leak through related public pages or structured data", () => {
  const relatedPublicPages = [liftingPrice, generalPrice, lifting, contentIndex];
  for (const page of relatedPublicPages) {
    assert.doesNotMatch(page, /R\$\s*18(?:\s*mil|[â€“-]\s*25)/i);
    assert.doesNotMatch(page, /R\$\s*25\s*mil/i);
    assert.doesNotMatch(page, /R\$\s*26(?:\s*mil|[â€“-]\s*42)/i);
    assert.doesNotMatch(page, /R\$\s*42\s*mil/i);
    assert.doesNotMatch(page, /faixas?\s+de\s+minilifting/i);
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
  assert.match(liftingPrice, /equipe médica/);
  assert.match(liftingPrice, /materiais/);
  assert.match(liftingPrice, /exames e preparo/);
  assert.match(liftingPrice, /acompanhamento/);
  assert.match(liftingPrice, /Hospital Sírio-Libanês/);
  assert.match(liftingPrice, /Hospital Nove de Julho/);
  assert.match(liftingPrice, /hospitais com custo mais acessível/);
  assert.match(liftingPrice, /Honorários profissionais/);
  assert.match(liftingPrice, /Anestesia e estrutura hospitalar/);
  assert.match(liftingPrice, /Preparo e recuperação/);
  assert.match(liftingPrice, /Pix ou débito/);
  assert.match(liftingPrice, /pagamento precisa estar concluído até a data da cirurgia/);
});
