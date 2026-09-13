import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan = JSON.parse(
  readFileSync(
    new URL(
      '../auditorias/google-ads-lift-max-conversions-2026-09-13/PLANO.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const preflight = JSON.parse(
  readFileSync(
    new URL(
      '../auditorias/google-ads-lift-max-conversions-2026-09-13/PREFLIGHT.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

test('piloto altera somente a campanha canônica de lifting facial', () => {
  assert.equal(plan.accountId, '995-334-4486');
  assert.equal(plan.pilot.campaignId, '24028216444');
  assert.equal(plan.pilot.campaign, 'S_BR_SP_LIFTING_FACIAL');
  assert.equal(plan.pilot.code, 'G26LIFT');
});

test('lance final é Maximizar conversões sem CPA desejado', () => {
  assert.equal(plan.pilot.changes.bidding.before, 'MAXIMIZE_CLICKS');
  assert.equal(plan.pilot.changes.bidding.after, 'MAXIMIZE_CONVERSIONS');
  assert.equal(plan.pilot.changes.bidding.targetCpaBRL, null);
  assert.equal(plan.pilot.changes.bidding.portfolioStrategy, false);
});

test('orçamento autorizado é R$ 30 e total esperado é R$ 105', () => {
  assert.deepEqual(plan.pilot.changes.budget, {
    beforeDailyBRL: 24,
    afterDailyBRL: 30,
    googleRecommendationDailyBRL: 47,
    applyGoogleRecommendation: false,
  });
  assert.deepEqual(plan.accountDailyBudgetBRL, { before: 99, after: 105 });
  assert.ok(plan.notApplied.includes('Google budget recommendation of R$ 47/day'));
});

test('demais campanhas, mensuração e recomendações automáticas ficam preservadas', () => {
  for (const invariant of [
    'the other seven campaign budgets and bid strategies',
    'qualified-lead goal and all conversion actions',
    'automatic recommendation application disabled',
    'site, Netlify, Apps Script, LEADS, CRM, WhatsApp, Calendar and Meta',
  ]) {
    assert.ok(plan.preserved.includes(invariant));
  }
  for (const excluded of [
    'target CPA',
    'broad match expansion',
    'Display inclusion, search partners, Performance Max or optimized targeting',
  ]) {
    assert.ok(plan.notApplied.includes(excluded));
  }
});

test('falha do runtime mantém o candidato sem escrita externa', () => {
  assert.equal(plan.execution.status, 'not_started');
  assert.equal(plan.execution.externalWritesPerformed, false);
  assert.equal(preflight.status, 'blocked_before_google_ads_live_preflight');
  assert.equal(
    preflight.liveGoogleAdsPreflight.status,
    'blocked_runtime_unavailable_before_initialization',
  );
  assert.equal(preflight.liveGoogleAdsPreflight.externalWritesPerformed, false);
  assert.match(preflight.liveGoogleAdsPreflight.error, /failed to write kernel assets/);
  assert.equal(preflight.authorizedIntent.budget.afterDailyBRL, 30);
  assert.equal(preflight.authorizedIntent.budget.applyGoogleRecommendation, false);
});

test('monitoramento depende do horário real de ativação e mede downstream', () => {
  assert.equal(plan.monitoring.activationAt, null);
  assert.deepEqual(plan.monitoring.primaryMetrics, [
    'identified and valid contacts from G26LIFT',
    'qualified leads accepted by Google Ads',
    'consultations scheduled and completed from the same cohort',
    'cost per qualified lead and cost per consultation',
  ]);
  assert.match(plan.rollback.action, /Maximize clicks/);
  assert.match(plan.rollback.action, /R\$ 24\/day/);
});
