import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan = JSON.parse(
  readFileSync(
    new URL(
      '../auditorias/google-ads-ajustes-campanhas-2026-09-13/PLANO.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

test('pacote reduz somente G26FACE e preserva o total em R$ 99/dia', () => {
  assert.equal(plan.accountId, '995-334-4486');
  assert.equal(plan.changes.budgets.length, 1);
  assert.deepEqual(plan.changes.budgets[0], {
    campaignId: '24028168714',
    campaign: 'S_BR_SP_CIRURGIA_FACIAL',
    code: 'G26FACE',
    beforeDailyBRL: 8,
    afterDailyBRL: 4,
  });
  assert.equal(plan.budgetAfterDailyBRL, 99);
});

test('pausa é reversível e limitada à frase genérica de face', () => {
  assert.equal(plan.changes.pauseKeywords.length, 1);
  const [keyword] = plan.changes.pauseKeywords;
  assert.equal(keyword.adGroup, 'AG_CIRURGIA_FACIAL');
  assert.equal(keyword.text, 'cirurgiã plástica em são paulo');
  assert.equal(keyword.matchType, 'PHRASE');
  assert.equal(keyword.delete, false);
});

test('quatro exatas cervicais reproduzem demanda observada e ficam nos grupos corretos', () => {
  const keywords = plan.changes.addExactKeywords;
  assert.equal(keywords.length, 4);
  assert.deepEqual(
    keywords.map(({ adGroup, text, matchType }) => ({ adGroup, text, matchType })),
    [
      { adGroup: 'AG_LIPO_PAPADA', text: 'lipo de papada valor', matchType: 'EXACT' },
      { adGroup: 'AG_LIPO_PAPADA', text: 'cirurgia de papada preço', matchType: 'EXACT' },
      { adGroup: 'AG_LIPO_PAPADA', text: 'lipo de papada preço', matchType: 'EXACT' },
      { adGroup: 'AG_CERVICOPLASTIA', text: 'cervicoplastia valor', matchType: 'EXACT' },
    ],
  );
  for (const keyword of keywords) {
    assert.equal(keyword.campaignId, '24023843174');
    assert.ok(keyword.observedClicks >= 3);
    assert.ok(keyword.observedCostBRL > 0);
  }
});

test('recomendações automáticas expansivas e termos genéricos ficam excluídos', () => {
  const declined = plan.declinedRecommendations.flatMap((entry) => entry.items);
  for (const item of [
    'procedimento para papada',
    'estetica papada',
    'gordura queixo',
    'Display',
    'parceiros de pesquisa',
    'Maximizar conversões',
    'remoção em massa de palavras exatas',
  ]) {
    assert.ok(declined.includes(item));
  }
  assert.ok(plan.preserved.includes('R$ 12/dia em G26CERV'));
  assert.ok(plan.preserved.includes('metas e ações de conversão'));
  assert.ok(plan.preserved.includes('site, Netlify, Apps Script, LEADS, CRM, WhatsApp, Calendar e Meta'));
});
