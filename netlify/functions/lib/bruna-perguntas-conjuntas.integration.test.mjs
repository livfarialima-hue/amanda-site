import assert from 'node:assert/strict';
import test from 'node:test';
import { consultationQuestionTopics } from './patient-turn-context.mjs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { buildConsultationQuestionBundle } from './consultation-question-bundle.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { conformOutboundReplyToContract, validateOutboundReply } from './outbound-reply-gate.mjs';
import { buildSurgicalPriceSuggestedReply } from './surgical-price-review.mjs';
import { coalesceUnansweredPatientBlock } from './inbound-burst-context.mjs';

const messages = [
  'Tenho 52 anos. O pescoço flácido é o que mais me incomoda.',
  'Gostaria de saber valores de consulta. E se é possível online.',
  'Eu tenho convênio Unimed.',
  'Se a dra não aceitar, preciso do relatório para reembolso.',
  'E qual a média de valores para lifting?',
];
const clinic = {role:'assistant',source:'bruna',text:'Olá! Sou a Bruna, da equipe da Dra. Amanda. Como posso ajudar?'};
const patient = text => ({role:'user',source:'patient',text});
function response(text, history = [clinic]) {
  const plan = enrichAutomationPlanFromConversation(planAutomation({text,messageType:'text'}),history);
  const bundle = buildConsultationQuestionBundle({plan,text,recentConversation:history,introduceBruna:!history.length});
  const action = decideConversationAction({text,plan,recentConversation:history,messageType:'text',conversionExperienceEnabled:true});
  const body = conformOutboundReplyToContract({body:bundle?.body,currentText:text,recentConversation:history,conversationAction:action});
  return {plan,bundle,action,body,check:validateOutboundReply({body,currentText:text,recentConversation:history,conversationAction:action})};
}

test('five consecutive messages retain every question without inferring facial lifting from neck concern',()=>{
  const {plan,bundle,action,body,check}=response(messages.join('\n'));
  assert.equal(plan.reason,'consultation_question_bundle');
  assert.deepEqual(bundle.topics,['price_consultation','price_surgery','insurance','remote_consultation','reimbursement_document']);
  assert.deepEqual(action.replyContract.unresolvedIntents,bundle.topics);
  assert.equal(plan.procedure,null);
  assert.match(body,/pescoço é o que mais incomoda/);
  assert.match(body,/consulta presencial.*R\$ 500/);
  assert.match(body,/particular.*nota fiscal.*eventual reembolso/s);
  assert.match(body,/confirmar com a equipe.*consulta online.*emissão do relatório/s);
  assert.match(body,/pescoço apenas ou também para o rosto\?/);
  assert.equal(bundle.pendingDetails.length,2);
  assert.doesNotMatch(body,/Eu sou a Bruna|mil|https:|opções de horário/);
  assert.equal(check.allowed,true,JSON.stringify(check));
});

test('the same questions in one paragraph get the same complete answer',()=>{
  const {bundle,check}=response(messages.join(' '));
  assert.equal(bundle.topics.length,5);
  assert.equal(check.allowed,true,JSON.stringify(check));
});

for(const [text,expected] of [
  ['Quanto custa a consulta para avaliar o lifting cervical?',['price_consultation']],
  ['Qual o valor da consulta de avaliação para otoplastia?',['price_consultation']],
  ['Qual o preço da consulta e do lifting cervical?',['price_consultation','price_surgery']],
  ['Qual o preço do lifting cervical e da consulta?',['price_consultation','price_surgery']],
  ['Quanto custa a consulta? E o lifting cervical?',['price_consultation','price_surgery']],
  ['Quanto custa a consulta? Não quero valores da cirurgia. Aceita convênio?',['price_consultation','insurance']],
]) test(`independent price permissions: ${text}`,()=>assert.deepEqual(consultationQuestionTopics(text),expected));

for(const [procedure,range] of [['lifting cervical',/18 mil e R\$ 26 mil/],['lifting facial',/26 mil e R\$ 42 mil/],['otoplastia',/8 mil e R\$ 14 mil/]]) {
  test(`consultation and ${procedure} can be answered together with only the approved amounts`,()=>{
    const {bundle,body,check,action}=response(`Qual o preço da consulta e do ${procedure}?`);
    assert.match(body,/R\$ 500/); assert.match(body,range);
    assert.equal(bundle.priceAllowed,true);
    assert.equal(check.allowed,true,JSON.stringify(check));
    assert.equal(action.replyContract.maxQuestions,0);
    assert.doesNotMatch(body,/\?|horário|https:/);
  });
}

test('extra, doubled and mislabelled amounts still fail the final gate',()=>{
  const text='Qual o preço da consulta e do lifting cervical?';
  const {body,action}=response(text);
  for(const changed of [body+' R$ 500.',body+' R$ 900.',body.replace('R$ 500','R$ 600'),body.replace('A consulta presencial com a Dra. Amanda custa','A cirurgia custa'),body+' 900 reais']) {
    const check=validateOutboundReply({body:changed,currentText:text,recentConversation:[clinic],conversationAction:action});
    assert.equal(check.allowed,false,changed);
    assert.equal(check.reason,'unapproved_monetary_amount');
  }
});

test('consultation plus insurance cannot authorize an unsolicited surgical range',()=>{
  const text='Quanto custa a consulta? Aceita convênio?';
  const {body,action}=response(text);
  const range=buildSurgicalPriceSuggestedReply({procedure:'otoplastia',directToPatient:true,currentText:'Quanto custa a otoplastia?',introduceBruna:false});
  assert.equal(validateOutboundReply({body:body+'\n\n'+range,currentText:text,conversationAction:action}).allowed,false);
});

test('the same range is not repeated and an unsupported surgery gets a concrete human pending detail',()=>{
  const first=response('Quanto custa a consulta e o lifting cervical?');
  const repeat=response('Quanto custa a consulta e o lifting cervical?',[patient('Quero lifting cervical'),{...clinic,text:first.body}]);
  assert.equal(repeat.bundle.priceAllowed,false);
  assert.equal(repeat.bundle.pendingDetails.length,1);
  assert.doesNotMatch(repeat.body,/mil/);
  const unsupported=response('Quanto custa a consulta e a rinoplastia?');
  assert.equal(unsupported.bundle.priceAllowed,false);
  assert.doesNotMatch(unsupported.body,/mil/);
  assert.match(unsupported.body,/confirmar com a equipe.*cirurgia/s);
});

test('a first bundle introduces Bruna once and never confirms online or a report',()=>{
  const {body,check}=response('Qual o valor da consulta com a Dra. Amanda? Pode ser online? Meu convênio pede relatório para reembolso.',[]);
  assert.match(body,/Eu sou a Bruna/);
  assert.equal((body.match(/Bruna/g)||[]).length,1);
  assert.doesNotMatch(body,/consulta online custa|emitimos.*relatório|reembolso garantido|atendemos online/i);
  assert.equal(check.allowed,true,JSON.stringify(check));
});

test('clinical urgency and another professional stay outside this composer',()=>{
  for(const text of ['Quanto custa a consulta? É online? Estou com falta de ar.','Quanto custa a consulta com o Dr. Daniel? Aceita Unimed?']) {
    const {plan,bundle}=response(text);
    assert.notEqual(plan.reason,'consultation_question_bundle'); assert.equal(bundle,null);
  }
});

test('a current mixed-procedure question never inherits an old authorized range',()=>{
  const {bundle}=response('Qual o valor da consulta e do lifting facial e cervical?',[patient('Quero otoplastia')]);
  assert.equal(bundle.priceAllowed,false); assert.equal(bundle.needsPriceClarification,true);
});
