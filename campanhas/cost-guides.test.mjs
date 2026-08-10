import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const breast = read("../conteudos/quanto-custa-cirurgia-plastica-mama-sao-paulo/index.html");
const body = read("../conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/index.html");
const facial = read("../conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/index.html");
const lifting = read("../conteudos/quanto-custa-lifting-facial-sao-paulo/index.html");
const library = read("../conteudos/index.html");
const breastHub = read("../mama/index.html");
const bodyHub = read("../contorno-corporal/index.html");
const sitemap = read("../sitemap.xml");

function assertGuide(page, { canonical, procedure, destination, terms }) {
  assert.match(page, new RegExp(`<link rel="canonical" href="${canonical}">`));
  assert.match(page, new RegExp(`data-procedure="${procedure}"`));
  assert.match(page, /data-track="whatsapp"/);
  assert.match(page, /data-track="content-depth"/);
  assert.match(page, new RegExp(`href="${destination}"`));
  assert.match(page, /Pix ou débito/);
  assert.match(page, /pagamento (?:precisa|esteja) concluído até a data da cirurgia/);
  assert.match(page, /R\$ 500/);
  assert.match(page, /hospital/i);
  assert.match(page, /anestesia/i);
  terms.forEach((term) => assert.match(page, term));

  const withoutConsultation = page.replaceAll("R$ 500", "");
  assert.doesNotMatch(withoutConsultation, /R\$\s*[\d.]+(?:,\d{2})?/);

  const jsonLd = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(jsonLd.length > 0);
  jsonLd.forEach((match) => assert.doesNotThrow(() => JSON.parse(match[1])));
}

test("breast cost guide has its own content, attribution and route", () => {
  assertGuide(breast, {
    canonical: "https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-mama-sao-paulo/",
    procedure: "custos-cirurgia-mama",
    destination: "../../mama/",
    terms: [/Mastopexia/, /Mamoplastia redutora/, /eventual implante/],
  });
});

test("body cost guide has its own content, attribution and route", () => {
  assertGuide(body, {
    canonical: "https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/",
    procedure: "custos-cirurgia-corporal",
    destination: "../../contorno-corporal/",
    terms: [/Lipoaspiração/, /Abdominoplastia/, /plano por etapas/],
  });
});

test("the general facial cost guide is preserved beside the specific lifting guide", () => {
  assert.match(facial, /Quanto custa uma cirurgia plástica facial em São Paulo\?/);
  assert.match(facial, /quanto-custa-lifting-facial-sao-paulo/);
  assert.match(lifting, /quanto-custa-cirurgia-plastica-facial-sao-paulo/);
  assert.match(sitemap, /quanto-custa-cirurgia-plastica-facial-sao-paulo/);
});

test("new guides are discoverable from the library, their hubs and the sitemap", () => {
  for (const slug of [
    "quanto-custa-cirurgia-plastica-mama-sao-paulo",
    "quanto-custa-cirurgia-plastica-corporal-sao-paulo",
  ]) {
    assert.match(library, new RegExp(`${slug}/`));
    assert.match(sitemap, new RegExp(`${slug}/`));
  }

  assert.match(breastHub, /quanto-custa-cirurgia-plastica-mama-sao-paulo/);
  assert.match(bodyHub, /quanto-custa-cirurgia-plastica-corporal-sao-paulo/);
  assert.match(library, /19 leituras educativas/);
});
