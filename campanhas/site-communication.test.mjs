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
    assert.equal(hash(navigation), page.protectedHashes.navigation, page.file + ' destinations and tracking');
    assert.equal(hash(scripts), page.protectedHashes.scripts, page.file + ' operational scripts');
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

test('primary consultation invitations disclose the established fee without changing WhatsApp', () => {
  for (const file of ['index.html','avaliacao-facial/index.html','lifting-facial/index.html','blefaroplastia/index.html','lifting-cervical/index.html','lipo-de-papada/index.html','injetaveis/index.html','mama/index.html','contorno-corporal/index.html']) {
    const hero = read(file).match(/<section\b[^>]*class="[^"]*hero[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero, file);
    assert.match(plain(hero), /Consulta particular: R\$ 500/, file);
    assert.match(hero, />Ver horários da consulta<\/a>/, file);
    assert.match(hero, /data-track="whatsapp"/, file);
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
