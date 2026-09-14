import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const plan = JSON.parse(readFileSync(new URL('../auditorias/google-ads-qualidade-2026-09-13/REVISAO.json', import.meta.url), 'utf8'));

test('banco cobre os 17 anúncios vivos e delimita os onze deltas', () => {
  assert.equal(plan.ads.length, 17);
  assert.equal(new Set(plan.ads.map(a => a.adId)).size, 17);
  assert.equal(new Set(plan.ads.map(a => a.campaign)).size, 8);
  assert.equal(plan.ads.filter(a => a.textChanged).length, 11);
  for (const ad of plan.ads.filter(a => !a.textChanged)) {
    assert.equal(ad.editorQuality, 'Excelente');
    assert.deepEqual(ad.after, ad.before);
  }
});

test('redação publicável preserva identificação e limites de recursos', () => {
  for (const ad of plan.ads) {
    assert.equal(ad.after.descriptions[0], plan.preserve.description1);
    assert.equal(ad.after.description1Pinned, true);
    assert.equal(ad.after.descriptions.length, 4);
    assert.ok(ad.after.headlines.length >= 3 && ad.after.headlines.length <= 15);
    assert.equal(new Set(ad.after.headlines.map(x => x.toLocaleLowerCase('pt-BR'))).size, ad.after.headlines.length);
    for (const text of ad.after.headlines) assert.ok([...text].length <= 30, `${ad.group}: ${text}`);
    for (const text of ad.after.descriptions) assert.ok([...text].length <= 90, `${ad.group}: ${text}`);
    assert.ok(!/resultado garantido|sem riscos|a melhor cirurgiã|promoção|desconto/i.test(JSON.stringify(ad.after)));
    assert.ok(!Object.hasOwn(ad.edits.d, '0'));
  }
});

test('otoplastia conserva a decisão recente de transparência e participação infantil', () => {
  for (const group of ['Adulto', 'AG_OTOPLASTIA_INFANTIL']) {
    const ad = plan.ads.find(a => a.group === group);
    assert.ok(ad.after.headlines.includes('Consulta Particular: R$ 500'));
    assert.match(ad.after.descriptions[3], /Consulta particular: R\$ 500/);
    assert.match(ad.after.descriptions[1], /residência na Unicamp/);
  }
  assert.ok(plan.ads.find(a => a.group === 'AG_OTOPLASTIA_INFANTIL').after.headlines.includes('A Criança Também é Ouvida'));
});

test('sitelinks têm destinos existentes, distintos e abrangentes na campanha', () => {
  assert.equal(plan.sitelinks.length, 2);
  for (const item of plan.sitelinks) {
    assert.equal(item.action, 'associate_existing');
    assert.equal(item.scope, 'campaign');
    assert.equal(item.assets.length, 2);
    assert.equal(new Set(item.assets.map(a => a.url)).size, 2);
    for (const asset of item.assets) {
      const url = new URL(asset.url);
      assert.equal(url.hostname, 'draamandaschroeder.com.br');
      assert.ok(existsSync(`${root}${url.pathname.slice(1)}index.html`));
      assert.ok([...asset.text].length <= 25);
      assert.ok([...asset.description1].length <= 35);
      assert.ok([...asset.description2].length <= 35);
    }
  }
});

test('melhoria editorial não muda o piloto e o teto autorizado', () => {
  assert.equal(plan.preserve.liftBudgetBRL, 30);
  assert.equal(plan.preserve.budgetBRL, 105);
  assert.equal(plan.preserve.liftBidding, 'MAXIMIZE_CONVERSIONS');
  assert.equal(plan.preserve.liftTargetCpaBRL, null);
});
