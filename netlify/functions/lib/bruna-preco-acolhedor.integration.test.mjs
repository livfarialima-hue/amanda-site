import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { buildSurgicalPriceSuggestedReply } from './surgical-price-review.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { conformOutboundReplyToContract, validateOutboundReply } from './outbound-reply-gate.mjs';

const prefill = 'Olá! Li sobre o valor do lifting facial e gostaria de conversar sobre uma faixa geral de valores como ponto de partida.\nRef. SITE-lifting-facial-preco';
const patient = text => ({role:'user',source:'patient',text});
const clinic = text => ({role:'assistant',source:'bruna',text});
function reply(text, history = []) {
  const plan = enrichAutomationPlanFromConversation(planAutomation({text,messageType:'text'}),history);
  const action = decideConversationAction({text,plan,recentConversation:history,messageType:'text',conversionExperienceEnabled:true});
  const draft = buildSurgicalPriceSuggestedReply({procedure:plan.procedure,patientName:'Ana',currentText:text,recentConversation:history,directToPatient:true});
  const body = conformOutboundReplyToContract({body:draft,currentText:text,conversationAction:action,recentConversation:history});
  return {plan,action,body,draft,validate: changed => validateOutboundReply({body:changed || body,currentText:text,conversationAction:action,recentConversation:history})};
}

for (const text of [prefill, 'Olá! Gostaria de uma faixa geral de valores para o lifting facial como ponto de partida.']) {
  test(`price-page request gets a welcoming, concise and protected answer: ${text.slice(0,22)}`, () => {
    const r = reply(text);
    assert.match(r.body,/Eu sou a Bruna/);
    assert.match(r.body,/lifting facial.*R\$ 26 mil e R\$ 42 mil/);
    assert.match(r.body,/referência.*não.*orçamento fechado/);
    assert.match(r.body,/valor individual.*após avaliação.*plano cirúrgico.*equipe.*hospital.*anestesia.*materiais/);
    assert.doesNotMatch(r.body,/pode ficar fora|proposta nem garantia|honorários isolados|posso te passar|já (?:leu|avaliou|decidiu)|você leu|Sei como|https?:/i);
    assert.ok(r.body.length <= 650, r.body.length);
    assert.equal(r.validate().allowed,true,JSON.stringify(r.validate()));
  });
}

test('a price-page reference does not request an article just because the attribution says SITE', () => {
  assert.doesNotMatch(reply(prefill).draft,/https?:/);
});

test('price does not automatically become a booking offer after an earlier evaluation explanation', () => {
  const r = reply('E qual o valor do lifting facial?', [patient('Como funciona a avaliação?'), clinic('Na consulta, a Dra. Amanda examina a região e explica as possibilidades, os limites e a recuperação.')]);
  assert.doesNotMatch(r.body,/Eu sou a Bruna|horário|agendar|já (?:fez|passou|avaliou)/i);
  assert.match(r.body,/26 mil e R\$ 42 mil/);
  assert.equal(r.validate().allowed,true);
});

test('price disclosure cannot lose its individual budget qualification', () => {
  const r = reply(prefill);
  const unsafe = r.body.replace('não é um orçamento fechado','é um orçamento fechado');
  assert.notEqual(unsafe,r.body);
  assert.equal(r.validate(unsafe).allowed,false);
});

for (const extra of [' O preço é garantido.', ' Tudo incluído.', ' São apenas honorários médicos.', ' O valor nunca ultrapassa essa faixa.']) {
  test(`an approved range cannot acquire an unsupported inclusion or price guarantee: ${extra}`, () => {
    const r = reply(prefill);
    assert.equal(r.validate(r.body + extra).allowed,false);
  });
}

test('a personal correction after the price-page message wins over the prefill', () => {
  const r = reply('Na verdade, quero o valor do lifting cervical.',[patient(prefill)]);
  assert.equal(r.plan.procedure,'lifting_cervical');
  assert.match(r.body,/18 mil e R\$ 26 mil/);
  assert.doesNotMatch(r.body,/42 mil|minilifting/);
  assert.equal(r.validate().allowed,true);
});

test('a new price answer does not unlock a duplicate automatic range', () => {
  const first = reply(prefill);
  const plan = enrichAutomationPlanFromConversation(planAutomation({text:'Qual o valor mesmo?',messageType:'text'}),[patient(prefill),clinic(first.body)]);
  assert.equal(plan.automaticAllowed,false);
  assert.match(plan.reason,/already_sent_review/);
});

test('site prefill asks for a reference without claiming that the person read the page', () => {
  const source=readFileSync(new URL('../../../campanhas/conversion-tracking.js',import.meta.url),'utf8');
  const section=source.slice(source.indexOf("if (intent === 'price_range_reference')"),source.indexOf("if (procedure === 'blefaroplastia-preco'"));
  assert.doesNotMatch(section,/Li sobre|Li a página/);
  assert.match(section,/faixa geral de valores para o lifting facial/);
});
