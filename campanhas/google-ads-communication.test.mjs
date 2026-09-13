import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = suffix => JSON.parse(readFileSync(new URL(`../auditorias/google-ads-comunicacao-2026-09-12/REVISAO-COMUNICACAO-GOOGLE-ADS-2026-09-12${suffix}.json`, import.meta.url), 'utf8'));
const bank = read('-SEGURANCA');
const assets = read('-RECURSOS');
const receipt = read('-VERIFICACAO');
const identification = 'Dra. Amanda Schroeder. Médica, cirurgiã plástica. CRM-SP 191605. RQE 110472.';

test('editorial bank covers 17 active groups with valid unique headlines and pinned identification', () => {
  assert.equal(bank.ads.length, 17);
  assert.equal(new Set(bank.ads.map(a => a.group)).size, 17);
  assert.equal(bank.ads.reduce((n, a) => n + a.headlines.length, 0), 236);
  assert.equal(bank.ads.reduce((n, a) => n + a.descriptions.length, 0), 68);
  for (const ad of bank.ads) {
    assert.ok([13, 14].includes(ad.headlines.length), ad.group);
    assert.equal(new Set(ad.headlines).size, ad.headlines.length, ad.group);
    assert.ok(ad.headlines.every(s => s.length > 0 && s.length <= 30), ad.group);
    assert.equal(ad.descriptions.length, 4);
    assert.ok(ad.descriptions.every(s => s.length > 0 && s.length <= 90), ad.group);
    assert.equal(ad.descriptions[0], identification, ad.group);
    assert.equal(ad.description1Pinned, true, ad.group);
    assert.doesNotMatch([...ad.headlines, ...ad.descriptions].join(' '), /sem risco|risco zero|garantid|melhor cirurg|mais segur|equipe da USP/i);
  }
});

test('adult cardiology is conditional and infant copy does not imply pediatric cardiology', () => {
  for (const ad of bank.ads) {
    const text = [...ad.headlines, ...ad.descriptions].join(' ');
    if (ad.group === 'AG_OTOPLASTIA_INFANTIL') {
      assert.doesNotMatch(text, /USP|cardiolog/i);
      assert.match(text, /conforme a idade, a saúde e a cirurgia da criança/);
    } else {
      assert.match(text, /Avaliação cardiológica na clínica, quando indicada, com médico formado pela USP\./);
    }
  }
  assert.ok(Object.values(assets.edits.account).every(s => !/cardiolog|USP|facial|pálpebra/i.test(s)));
});

test('29 callout changes and eight sitelink text models stay within format limits', () => {
  const callouts = [...Object.values(assets.edits.account), ...Object.values(assets.edits.campaigns).flatMap(Object.values)];
  assert.equal(callouts.length, 29);
  assert.ok(callouts.every(s => s.length <= 25));
  assert.equal(assets.sitelinks.length, 8);
  assert.equal(assets.sitelinkAssociationsChanged, 12);
  for (const s of assets.sitelinks) {
    assert.ok(s.title.length <= 25);
    assert.ok(s.description1.length <= 35);
    assert.ok(s.description2.length <= 35);
  }
});

test('post-save UI receipts cover every RSA and all changed sitelinks without URL changes', () => {
  const listed = receipt.rsaListing.evidence.rsaFinalListing;
  assert.deepEqual(listed.map(a => a.group).sort(), bank.ads.map(a => a.group).sort());
  assert.ok(listed.every(a => a.text.includes('Ativado') && a.text.includes(identification) && a.text.includes('Qualificada')));
  const changes = receipt.sitelinkBeforeAfter.evidence.sitelinkChangeEvidence;
  assert.equal(changes.length, 8);
  for (const change of changes) assert.deepEqual(change.before.slice(3), change.after.slice(3));
  const completion = receipt.sitelinkFinalCompletion.evidence.sitelinkVerificationComplete;
  assert.equal(completion.uniqueAssociations, 76);
  assert.equal(completion.changedTextsVerified.length, 12);
});

test('nine additional complete editor rereads exactly match the final bank', () => {
  const rereads = receipt.rsaDetailedReread.evidence.rsaFullFieldsVerified;
  assert.equal(rereads.length, 9);
  for (const r of rereads) {
    const ad = bank.ads.find(a => a.group === r.group);
    assert.deepEqual(r.fields.slice(3, 18).map(f => f.value).filter(Boolean), ad.headlines, r.group);
    assert.deepEqual(r.fields.filter(f => f.label === 'Descrição').map(f => f.value), ad.descriptions, r.group);
    assert.match(JSON.stringify(r.pin || r.pinLines), /fixado na posição/);
  }
});
