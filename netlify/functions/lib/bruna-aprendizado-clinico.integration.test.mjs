import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isPriceAmountInquiry, isConsultationCostInquiry } from './patient-turn-context.mjs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { approvedProcedureInformationFacts } from './lifting-information.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { runOpenAIShadow } from './openai-shadow.mjs';
import * as semantic from './semantic-reply-policy.mjs';

const history = [
  {role:'user', source:'patient', text:'Quero informações sobre lifting cervical.'},
  {role:'assistant', source:'bruna', text:'Olá! Sou a Bruna, da Clínica LIV. Qual é a sua dúvida?'},
];
const plan = (text, recent = history) => enrichAutomationPlanFromConversation(
  planAutomation({text, messageType:'text', platform:'WhatsApp direto'}), recent);

test('custo is a price request but a cost-benefit idiom is not', () => {
  for (const text of ['Qual o custo?', 'Como é feita e o custo?', 'Quais são os custos da consulta?']) {
    assert.equal(isPriceAmountInquiry(text), true, text);
  }
  for (const text of ['Quero entender o custo-benefício.', 'Não quero operar a todo custo.']) {
    assert.equal(isPriceAmountInquiry(text), false, text);
  }
  assert.equal(plan('Qual o custo da cervicoplastia?').reason, 'lifting_price_range_direct');
  assert.equal(isConsultationCostInquiry('Não quero consulta a todo custo.'), false);
  assert.notEqual(plan('Não quero saber o custo. Como é a recuperação?').reason, 'lifting_price_range_direct');
});

test('an explicit cervical association has educational facts and keeps both questions open', () => {
  const text = 'Gostaria de saber como é feita a lipo de papada com cervicoplastia e o custo?';
  const p = plan(text);
  assert.equal(p.procedure, 'lifting_cervical');
  assert.equal(p.reason, 'lifting_price_range_direct');
  const facts = approvedProcedureInformationFacts({text, procedure:p.procedure});
  assert.ok(facts.topics.includes('neck_procedure_explanation'));
  assert.match(facts.facts.map(f => f.statement).join(' '), /gordura.*pele.*platisma/s);
  const action = decideConversationAction({text, plan:p, recentConversation:history, messageType:'text'});
  assert.ok(action.replyContract.unresolvedIntents.includes('price_surgery'));
  assert.ok(action.replyContract.unresolvedIntents.includes('procedure_information'));
});

test('a platysma clarification gets only educational information in the known neck context', () => {
  for (const text of ['Seria lipo com plastimoplastia', 'Lipo com platismoplastia', 'O que é platisma?']) {
    const facts = approvedProcedureInformationFacts({text, procedure:'lifting_cervical'});
    assert.ok(facts?.topics.includes('neck_procedure_explanation'), text);
    assert.match(facts.boundaries.join(' '), /Não.*(?:indica|técnica)/i);
    assert.doesNotMatch(facts.facts.map(f => f.statement).join(' '), /R\$|no seu caso|precisa fazer|alta no dia seguinte/i);
  }
  assert.equal(approvedProcedureInformationFacts({text:'Como é feita?', procedure:'otoplastia'}), null);
});

test('isolated lipo never inherits a cervical price or a hospital discharge promise', () => {
  const text = 'Se for só lipo de papada, qual seria o custo e como é feita?';
  const p = plan(text);
  assert.equal(p.procedure, 'lipo_papada');
  assert.equal(p.automaticAllowed, false);
  const facts = approvedProcedureInformationFacts({text, procedure:p.procedure});
  assert.ok(facts?.topics.includes('neck_procedure_explanation'));
  assert.doesNotMatch(facts.facts.map(f=>f.statement).join(' '), /R\$|mil|polo inferior|passa a noite|dia seguinte/);
  assert.equal(approvedProcedureInformationFacts({text:'Fica internada? Tem alta amanhã?', procedure:'lipo_papada'}), null);
});

test('lipo recovery is sourced and does not borrow facial recovery deadlines', () => {
  const facts = approvedProcedureInformationFacts({text:'Como é a recuperação?', procedure:'lipo_papada'});
  assert.deepEqual(facts?.topics, ['recovery']);
  assert.match(facts.facts[0].source, /lipo-de-papada/);
  assert.match(facts.facts[0].statement, /inchaço.*roxos|roxos.*inchaço/);
  assert.doesNotMatch(facts.facts[0].statement, /7 a 14|10 a 14|3 e 4 semanas|alta/);
  const page = readFileSync(new URL('../../../lipo-de-papada/index.html', import.meta.url), 'utf8');
  assert.match(page, /platisma/i);
  assert.match(page, /inchaço/i);
});

test('administrative explanations do not inject surgical information from old context', () => {
  for (const text of ['Como funciona a consulta?', 'Como é feita a avaliação?', 'Como funciona o pagamento?', 'Como é feito o agendamento?']) {
    assert.equal(approvedProcedureInformationFacts({text, procedure:'lifting_cervical'}), null, text);
  }
});

test('hospital facts remain general and public photos are offered only when requested', async () => {
  const facts = approvedProcedureInformationFacts({text:'A lipo de papada é feita em hospital?', procedure:'lipo_papada'});
  assert.ok(facts.topics.includes('surgical_setting'));
  assert.match(facts.boundaries.join(' '), /Não confirmar.*anestesia individual/);
  for (const [text, requested] of [['Tem fotos?',true],['Como é a recuperação?',false]]) {
    let input;
    await runOpenAIShadow({phone:'+5511900000000',text,procedure:'lifting_cervical'}, {env:{OPENAI_API_KEY:'synthetic'},fetchImpl:async (_u,o)=>{
      input=JSON.parse(JSON.parse(o.body).input);return new Response('{}',{status:200});
    }});
    assert.equal(Boolean(input.siteResource),requested);
    if(requested)assert.equal(input.siteResource.url,'https://draamandaschroeder.com.br/lifting-cervical/');
  }
});

test('the model receives the verified explanation for a mixed explanation and cost request', async () => {
  const text = 'Como é feita a lipo de papada com cervicoplastia e o custo?';
  const p = plan(text);
  let input;
  await runOpenAIShadow({phone:'+5511900000000', text, procedure:p.procedure, recentConversation:history}, {
    env:{OPENAI_API_KEY:'synthetic'},
    fetchImpl:async (_url, options) => {
      input = JSON.parse(JSON.parse(options.body).input);
      return new Response('{}', {status:200});
    },
  });
  assert.ok(input.approvedClinicalFacts?.topics.includes('neck_procedure_explanation'));
  assert.match(input.approvedClinicalFacts.boundaries.join(' '), /individual|pessoa/);
});

test('a price-only template cannot erase another question from a semantically approved reply', () => {
  const candidate = {decision:{replyCode:'LIFTING-PRICE-RANGE-01'}};
  const check = semantic.deterministicReplyCoversPatientQuestions;
  assert.equal(typeof check, 'function');
  assert.equal(check(candidate, {replyContract:{unresolvedIntents:['price_surgery']}}), true);
  for (const extra of ['procedure_information','recovery','resource','location']) {
    assert.equal(check(candidate, {replyContract:{unresolvedIntents:['price_surgery', extra]}}), false, extra);
  }
});
