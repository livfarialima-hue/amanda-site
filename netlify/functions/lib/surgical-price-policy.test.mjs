import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SURGICAL_PRICE_DISCLOSURE,
  hasApprovedSurgicalPriceDisclosure,
  hasApprovedGlobalSurgicalPriceDisclosure,
  hasOnlyApprovedSurgicalAmounts,
} from './surgical-price-policy.mjs';

const previousDisclosure = 'É uma referência para planejamento, não é um orçamento fechado. O valor individual é definido após avaliação, conforme o plano cirúrgico, a equipe, o hospital, a anestesia e os materiais.';

test('current reference explains the global scope and the individually itemized quote', () => {
  assert.match(SURGICAL_PRICE_DISCLOSURE, /planejamento do valor global/);
  assert.match(SURGICAL_PRICE_DISCLOSURE, /equipe, o hospital, a anestesia e os materiais/);
  assert.match(SURGICAL_PRICE_DISCLOSURE, /discrimina esses componentes/);
  assert.match(SURGICAL_PRICE_DISCLOSURE, /incluído ou cobrado à parte/);
  assert.equal(hasApprovedGlobalSurgicalPriceDisclosure(SURGICAL_PRICE_DISCLOSURE), true);
});

test('historical disclosure remains recognizable but cannot stand in for the new global contract', () => {
  assert.equal(hasApprovedSurgicalPriceDisclosure(previousDisclosure), true);
  assert.equal(hasApprovedGlobalSurgicalPriceDisclosure(previousDisclosure), false);
});

test('the global contract cannot lose its itemization or become an inclusive fixed quote', () => {
  for (const unsafe of [
    SURGICAL_PRICE_DISCLOSURE.replace('do valor global', ''),
    SURGICAL_PRICE_DISCLOSURE.replace(/ O orçamento discrimina.*$/, ''),
    SURGICAL_PRICE_DISCLOSURE + ' Tudo incluído.',
    SURGICAL_PRICE_DISCLOSURE + ' São apenas honorários médicos.',
    SURGICAL_PRICE_DISCLOSURE + ' O preço é garantido.',
  ]) assert.equal(hasApprovedGlobalSurgicalPriceDisclosure(unsafe), false, unsafe);
});

test('component explanation never authorizes a component price or a second charge', () => {
  const reference = `A lipo de papada isolada tem uma referência entre R$ 12 mil e R$ 18 mil. ${SURGICAL_PRICE_DISCLOSURE}`;
  assert.equal(hasOnlyApprovedSurgicalAmounts(reference), true);
  assert.equal(hasOnlyApprovedSurgicalAmounts(reference + ' Hospital: R$ 4 mil.'), false);
  assert.equal(hasOnlyApprovedSurgicalAmounts(reference + ' Anestesia: R$ 2 mil.'), false);
});
