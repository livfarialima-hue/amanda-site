import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const audit = JSON.parse(read('auditorias/site-comunicacao-2026-09-13/REVISAO.json'));
// The frozen editorial audit remains historical; later authorized OTO copy has its own receipt.
const otoContinuation = JSON.parse(read('auditorias/otoplastia-estrategia-2026-09-13/PLANO.json'));
const currentPages = audit.pages.map(page => {
  const continuation = otoContinuation.pages.find(item => item.file === page.file);
  return continuation ? { ...page, after: { ...page.after, ...continuation.after }, protectedHashes: continuation.protectedHashes } : page;
});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// The September audit remains immutable. These exact navigation snapshots cover
// the authorized 14/10 neutral prefills and removal of duplicate breadcrumbs.
// Pre/post validation preserves destinations, references and every data attribute.
const continuityNavigationHashes = {
  "abdominoplastia/index.html": "cfa0336485bc554c8618b3f854f50bfb3ef1cf2a1501bc33cfb95bf7c36cb16a",
  "avaliacao-facial/index.html": "fefd95f6b1547966423b3e149467bf2c44237c2294f0101fb4841ffa8f72151d",
  "blefaroplastia/index.html": "d589ed44448be04aa65bae6300585998da9f99ffca95682e1ec59779cab843b1",
  "braquioplastia/index.html": "1d033fc1b7481d183fd128c77fd3d7529bda4b15b87b5bce39f49e8318bc7736",
  "conteudos/blefaroplastia-quando-faz-sentido/index.html": "6532d3a1761b885210fc168558bfe825b5e07fac516b59420843f47a67b05f60",
  "conteudos/botox-preenchimento-bioestimulador/index.html": "597829f7c7536c304ffe5f71faaba2b6af1802eddbdd0f9f6e14315318fdf05f",
  "conteudos/como-escolher-protese-de-mama/index.html": "21bfd6eff749f1fafe312ea8bb911cbaaa7a82853014eb3b2814895eee47cc05",
  "conteudos/consulta-cirurgia-plastica/index.html": "a536d288a0a2453d4d5419112c4836bdd5ce1dce77836da72262b4016e0b43a3",
  "conteudos/lifting-facial-ou-injetaveis/index.html": "d19f05bfb6ab18b2504f7435fbe888668f61bae8a9e6026fbf216069fae33245",
  "conteudos/lipoenxertia-facial/index.html": "4d6457272a8927a4341fbfd7faa53f62b570bef489dcc7dfef203d0c31b1e897",
  "conteudos/naturalidade-envelhecimento/index.html": "a5319d6e592a2cba5ce41d12e87c24f129d1c56569e29d7593a3b1d0efb3c986",
  "conteudos/quanto-custa-blefaroplastia-sao-paulo/index.html": "f91d9e07564490ae47e20885fba5df9c0fed5dd49f635b49050908b6b560c916",
  "conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/index.html": "b91f32d473c00de1e84c72de14b73ab6eb4fa6c64e2bdf2995ddfeb8bd12bb0f",
  "conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/index.html": "7f79e774b79a251fd41886b57e7dbb349f9435d8b4e476324488d3f1dbd8cf41",
  "conteudos/quanto-custa-cirurgia-plastica-mama-sao-paulo/index.html": "ef4d2c9e2b121d28930fa371ed6851911e11537c7cfbc82fd497e0b7a1e79c67",
  "conteudos/quanto-custa-lifting-cervical-sao-paulo/index.html": "2b7fd9ad1c1b3e1547b1f8fa421f4961287c45847b967f791ab89fc4e1c3ac24",
  "conteudos/quanto-custa-lifting-facial-sao-paulo/index.html": "e386807dfdc539fffd8f4a1fcc0629a1fdf90dea0144364d629327d093826ae7",
  "conteudos/recuperacao-lifting-facial/index.html": "a3aefa369d482cabd8540e6261d28362fa6994c0fbef06c8206baa184efdccbc",
  "conteudos/seguranca-cirurgia-plastica/index.html": "4644d5af8a10d272c740f10dc25c5d1915cad802467d79efa8bdaea5992f1497",
  "contorno-corporal/index.html": "b61b88197cd48b6f75948eb399a96725a32032c8939128ed967a4cb31a1931fd",
  "dra-amanda-schroeder/index.html": "5c97a970363c7d96c0236ef6cc84553f5d6b65a90495799bf46917bc79423501",
  "index.html": "c732e5c48d6da3f0fc8884f6737d679ea85cf18c3ebed8f66f6a690d1e8a6625",
  "injetaveis/index.html": "18699b5adbd00eaabdb88cd850ebc912a3b64e62d888dff8ce53b5cb9d79f50d",
  "lifting-cervical/index.html": "0a0d1da1cada5f8bb35b294b6d5ced2d7f7fec9b72a78bd61ce0cf516458293f",
  "lifting-facial/index.html": "34fe580ac4dd68d0f26b17ce88bad6f4b6353dbdbe609df1c3ef89b3be88b602",
  "lip-lifting/index.html": "e651dc45f257e5695bb1ef3e5c6540cfc34761967195a9966544195aa242e4af",
  "lipo-de-papada/index.html": "81741edd4bc596421bb3248f0c63dd1e03b29ca184baef90448cfa67cdab9e29",
  "lipoaspiracao/index.html": "d87e3d25f022b17516e21d0129a690f791873a70885a7213f8f1b1e63ba4eaa6",
  "mama/index.html": "2b86f178e435324c6370f7897992bffd22b798d109417e031b9b92aef16fdc6d",
  "mamoplastia-redutora/index.html": "a8148b2ba871950ffa440848701f8b2cae6d1e3e922c8b2c78383d2fddcf2dd9",
  "mastopexia-com-protese/index.html": "49397b8beb51a7a9a73c21694bcc2ac3cafaa8f5cccdb6c0a52d7c3fd398bb9d",
  "mastopexia/index.html": "147e877391c033ecd7adfee259e1f6723b0d9e3d7e6f063efce2919a4088fbde",
  "ninfoplastia/index.html": "65d55611f5a4fa668f7ca31e9ddcb64f4b78f30b004c2e7ce9d7bade14c32ed5",
  "otoplastia-adulto/index.html": "d42bb618ccb68459110bfc3cf1e34cdbf36d5b66ab1764460f4923cdad27a07d",
  "otoplastia-infantil/index.html": "982cc744cad5c5262e5831295a437d9426fe5034c22b20d08d8e495ba4f48b7f",
  "otoplastia/index.html": "c37f75205ee8fd9a506721097f6e5535ba886a082539c0ab67bdc50ce798ac7d",
  "pos-bariatrica/index.html": "e5e0accd4d40cddd07036946abb43dd605f7d2645a3076b743ddaee7a99a6162",
  "procedimentos/index.html": "c911427ca9a94b67d486703393ac686d6d5472049145044ac40aba52b1b056e9",
  "protese-de-mama/index.html": "00a88cb271be870bab21dbeea198b6bbde4cd7086e6e593077b3314c2e9a4879"
};
// Only cache keys for the explicitly changed text owners are normalized here.
// Every other script tag and inline operation still matches the frozen audit.
const historicalScriptCache = (source, file) => source
  .replaceAll('conversion-tracking.js?v=20261014-site-continuity', 'conversion-tracking.js?v=20260823-price-range-1')
  .replaceAll('site-enhancements.js?v=20261014-site-continuity', 'site-enhancements.js?v=20260912-seo-profile-1')
  .replaceAll('secondary-conversion.js?v=20261014-site-continuity', 'secondary-conversion.js?v=' + (['lip-lifting/index.html', 'ninfoplastia/index.html'].includes(file) ? '20260809-secondary-premium-2' : '20260912-human-copy-2'))
  .replaceAll('article-conversion.js?v=20261014-site-continuity', 'article-conversion.js?v=20260809')
  .replaceAll('landing-behavior.js?v=20261014-site-continuity', 'landing-behavior.js')
  .replaceAll('procedure-terra-fixes.js?v=20261014-site-continuity', 'procedure-terra-fixes.js?v=20260714');
const plain = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const nodes = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => {
  const parsed = JSON.parse(match[1]);
  return parsed['@graph'] || [parsed];
});

test('editorial inventory covers the requested scope without adding public routes', () => {
  assert.equal(audit.inventory.publicPages, 54);
  assert.equal(audit.pages.length, 39);
  assert.equal(audit.inventory.unchangedPages.length, 15);
  assert.equal(new Set(audit.pages.map(page => page.file)).size, 39);
  for (const page of currentPages) {
    const html = read(page.file);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, page.file);
    assert.equal(plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]), page.after.h1, page.file);
    assert.ok(nodes(html).length > 0, page.file);
    assert.ok(html.includes('191605') && html.includes('110472'), page.file);
  }
});

test('all revised pages preserve link destinations, attribution and operational scripts', () => {
  for (const page of currentPages) {
    const html = read(page.file);
    const navigation = [...html.matchAll(/\b(?:href|data-track|data-procedure|data-cta-location|data-attribution-code)="[^"]*"/g)].map(match => match[0]);
    const scripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map(match => match[0]).filter(source => !source.includes('application/ld+json'));
    assert.equal(hash(navigation), continuityNavigationHashes[page.file], page.file + ' destinations and tracking');
    assert.equal(hash(scripts.map(source => historicalScriptCache(source, page.file))), page.protectedHashes.scripts, page.file + ' operational scripts');
  }
});

test('images, video, embeds and existing medical attribution are unchanged', () => {
  for (const page of currentPages) {
    const html = read(page.file);
    const media = [...html.matchAll(/<(?:img|video|source|iframe)\b[^>]*>/g)].map(match => match[0]);
    assert.equal(hash(media), page.protectedHashes.media, page.file + ' media');
    const attribution = nodes(html).map(node => ({
      type: node['@type'], author: node.author, reviewedBy: node.reviewedBy, lastReviewed: node.lastReviewed,
    })).filter(node => node.author || node.reviewedBy || node.lastReviewed);
    assert.deepEqual(JSON.parse(JSON.stringify(attribution)), page.reviewAttribution, page.file + ' no invented clinical review');
  }
});

test('facial positioning does not replace the message for breast and body surgery', () => {
  for (const slug of ['avaliacao-facial','lifting-facial','blefaroplastia','lifting-cervical','lipo-de-papada','lip-lifting','injetaveis']) {
    assert.match(plain(read(slug + '/index.html')), /atuação focada em (?:cirurgias da )?face/i, slug);
  }
  for (const slug of ['mama','contorno-corporal','protese-de-mama','mastopexia','mastopexia-com-protese','mamoplastia-redutora','lipoaspiracao','abdominoplastia','braquioplastia','pos-bariatrica','ninfoplastia']) {
    assert.doesNotMatch(plain(read(slug + '/index.html')), /atuação (?:focada|concentrada) em (?:cirurgias da )?face/i, slug);
  }
});

test('primary consultation invitations disclose the established fee and describe the conversation', () => {
  for (const file of ['index.html','avaliacao-facial/index.html','lifting-facial/index.html','blefaroplastia/index.html','lifting-cervical/index.html','lipo-de-papada/index.html','injetaveis/index.html','mama/index.html','contorno-corporal/index.html']) {
    const hero = read(file).match(/<section\b[^>]*class="[^"]*hero[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero, file);
    assert.match(plain(hero), /Consulta particular: R\$ 500/, file);
    assert.match(hero, />Conversar sobre a consulta<\/a>/, file);
    assert.match(hero, /data-track="whatsapp"/, file);
  }
});

test('every public WhatsApp fallback describes a conversation without claiming reading or scheduling', () => {
  const files = [...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => {
    const path = new URL(url).pathname;
    return path === '/' ? 'index.html' : path.slice(1) + 'index.html';
  }).filter(file => file !== 'privacidade/index.html');
  assert.equal(files.length, 53);
  for (const file of files) {
    const html = read(file);
    const links = [...html.matchAll(/<a\b[^>]*data-track="whatsapp"[^>]*>[\s\S]*?<\/a>/g)].map(([link]) => link);
    assert.ok(links.length, file);
    assert.match(html, /conversion-tracking\.js\?v=20261014-site-continuity/, file);
    for (const link of links) {
      const href = link.match(/\bhref="([^"]+)"/)?.[1].replaceAll('&amp;', '&');
      const url = new URL(href);
      assert.equal(url.hostname, 'wa.me', file);
      assert.equal(url.pathname, '/5511961957144', file);
      const message = url.searchParams.get('text');
      assert.doesNotMatch(plain(link), /horários|disponibilidade|marcar consulta/i, file);
      assert.doesNotMatch(message, /\bli (?:a página|o conteúdo|sobre|como|um conteúdo)|consultar (?:os )?horários|ver horários|reservar|confirmar agendamento/i, file);
      if (link.includes('data-prefill-intent="price_range_reference"')) {
        assert.match(message, /^Olá! Gostaria de uma faixa geral de valores para (?:o lifting facial|a cervicoplastia \(lifting cervical\)) como ponto de partida\./, file);
      } else if (link.includes('data-prefill-intent="price_planning"')) {
        assert.match(message, /^Olá! Gostaria de entender como o orçamento da blefaroplastia é montado e como funciona a avaliação\./, file);
      } else {
        assert.match(message, /^Olá! Tenho interesse em .+ com a Dra\. Amanda e gostaria de entender melhor como funciona a avaliação\./, file);
      }
    }
  }
});

test('revised FAQ answers agree between visible copy and structured data', () => {
  for (const file of ['lifting-facial/index.html','blefaroplastia/index.html']) {
    const html = read(file);
    const faq = nodes(html).find(node => [node['@type']].flat().includes('FAQPage'));
    assert.ok(faq, file);
    const targets = file.startsWith('lifting') ? ['Vou ficar com o rosto artificial?','Quando volto ao trabalho e à vida social?'] : ['Quando volto ao trabalho e à vida social?'];
    for (const question of targets) {
      const block = [...html.matchAll(/<details\b[\s\S]*?<\/details>/g)].map(match => match[0]).find(text => text.includes('<summary>' + question + '</summary>'));
      const answer = block?.match(/<div class="cv-faq-answer">([\s\S]*?)<\/div>/)?.[1];
      const structured = faq.mainEntity.find(entity => entity.name === question)?.acceptedAnswer?.text;
      assert.equal(plain(structured), plain(answer), file + ' ' + question);
    }
  }
});

test('new copy contains no surgical fee, superiority or risk-free claim', () => {
  for (const page of currentPages) {
    for (const change of page.changes) {
      const text = plain(change.to);
      assert.doesNotMatch(text, /melhor cirurgiã|mais segura que|resultado garantido|cirurgia sem risco|risco zero|clínica da USP|equipe da USP|garantia de resultado/i, page.file);
      for (const amount of text.matchAll(/R\$\s*([\d.,]+)/g)) assert.equal(amount[1], '500', page.file + ' no new surgical price');
    }
  }
  const safety = plain(read('conteudos/seguranca-cirurgia-plastica/index.html'));
  assert.match(safety, /pacote cirúrgico inclui a consulta cardiológica pré-operatória/);
  assert.match(safety, /Daniel Added/);
  assert.match(safety, /199104/);
  assert.match(safety, /145565/);
  assert.match(safety, /diferente da primeira consulta/);
  assert.match(safety, /não substitui|funções diferentes/);
});

test('analytical caveats retain unknown classification and unmatched periods', () => {
  const leads = audit.data.leadsAggregate;
  assert.equal(leads.identifiedContacts - leads.classifiedContacts, leads.classificationUnknown);
  assert.equal(leads.classificationUnknown, 19);
  assert.equal(leads.canonicalContacts + leads.legacyContacts, leads.identifiedContacts);
  assert.notDeepEqual(audit.data.ga4.period, audit.data.ads.period);
  assert.equal(leads.pageAndCtaAttribution, 'not_available');
  assert.equal(audit.data.ga4.configuredKeyEventNames, 'not_verified');
});
