import assert from 'node:assert/strict';
import test from 'node:test';
import { consultationQuestionTopics, latestConsultationModality, isConsultationCostInquiry } from './patient-turn-context.mjs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { buildConsultationQuestionBundle } from './consultation-question-bundle.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { validateOutboundReply } from './outbound-reply-gate.mjs';
import { buildMorningResumeOpening, buildContextualHumanSuggestion } from './extreme-night-policy.mjs';
import { buildConversationGuidelines } from './conversation-guidelines.mjs';

test('effective conversion prompt does not revoke the confirmed remote modality or transfer presencial payment conditions',()=>{
  const prompt=buildConversationGuidelines({conversionExperienceEnabled:true});
  assert.match(prompt,/A Dra\. Amanda atende por consulta online, inclusive quem está no exterior/);
  assert.doesNotMatch(prompt,/Modalidade remota, frequência de retornos.*dependem de confirmação humana/);
  assert.match(prompt,/orçamento individual depende da avaliação/);
  assert.match(prompt,/sem afirmar que o orçamento será fechado online ou antes da viagem/);
  assert.match(prompt,/condições de pagamento confirmadas para essa modalidade/);
  assert.doesNotMatch(prompt,/Se a faixa já tiver sido enviada no contexto recente, use human_review/);
  assert.match(prompt,/Uma pergunta nova sobre consulta ou modalidade recebe os fatos aprovados desse novo assunto/);
});

const patient = text => ({role:'user',source:'patient',text});
const clinic = text => ({role:'assistant',source:'bruna',text});
const remoteHistory = [patient('A Dra. Amanda atende por teleconsulta?'), clinic('Sim, a Dra. Amanda atende por consulta online, inclusive quem está no exterior.')];
const danielHistory = [patient('Quero consulta com o Dr. Daniel.'), clinic('O Dr. Daniel atende cardiologia.')];
const planFor = (text, history = []) => enrichAutomationPlanFromConversation(planAutomation({text,messageType:'text'}),history);

for (const text of ['Quanto custa a teleconsulta?', 'Quanto custa a consulta online?', 'Qual o valor da consulta online? Moro no exterior.']) {
  test(`approved remote consultation cost: ${text}`, () => {
    const plan=planFor(text,remoteHistory), bundle=buildConsultationQuestionBundle({plan,text,recentConversation:remoteHistory});
    assert.ok(consultationQuestionTopics(text).includes('price_consultation'));
    assert.match(bundle.body,/consulta online.*R\$ 500/);
    assert.match(bundle.body,/exterior/);
    assert.equal(bundle.pendingDetails.length,0);
    assert.doesNotMatch(bundle.body,/presencial|Pix|parcelamento|confirmar com a equipe|horário|agendada/);
    const action=decideConversationAction({text,plan,recentConversation:remoteHistory,conversionExperienceEnabled:true});
    assert.equal(validateOutboundReply({body:bundle.body,currentText:text,recentConversation:remoteHistory,conversationAction:action}).allowed,true);
  });
}

for (const text of ['E qual o valor da consulta?', 'Quanto custa?']) test(`remote continuation avoids presencial/surgical preview: ${text}`, () => {
  const plan=planFor(text,remoteHistory);
  assert.equal(plan.reason,'open_question_for_ai'); assert.equal(plan.replyCode,null); assert.equal(plan.professional,'amanda');
  assert.equal(latestConsultationModality(text,[...remoteHistory,patient('Agora prefiro presencial.')]),'presencial');
  assert.equal(latestConsultationModality(text,[...remoteHistory,patient('Quero falar de rinoplastia.')]),'');
  assert.equal(latestConsultationModality('Quanto custa a consulta presencial?',remoteHistory),'presencial');
});

for (const text of ['Quanto custa a consulta online?', 'Quanto custa a teleconsulta?', 'E qual o valor da consulta?', 'Quanto custa?']) test(`Amanda fee never replaces Daniel context: ${text}`, () => {
  const plan=planFor(text,danielHistory);
  assert.equal(plan.professional,'daniel');
  assert.equal(buildConsultationQuestionBundle({plan,text,recentConversation:danielHistory}),null);
});

test('explicit current Amanda overrides older Daniel context and composer rejects mismatched professional',()=>{
  const text='Qual o valor da consulta online com a Dra. Amanda?';
  const plan=planFor(text,danielHistory);
  assert.equal(plan.professional,'amanda');
  assert.match(buildConsultationQuestionBundle({plan,text,recentConversation:danielHistory}).body,/R\$ 500/);
  assert.equal(buildConsultationQuestionBundle({plan:{...plan,professional:'daniel'},text}),null);
});

test('latest explicit professional wins after a conversation changes from Daniel to Amanda',()=>{
  const history=[...danielHistory,patient('Agora quero falar da consulta com a Dra. Amanda.'),...remoteHistory];
  for(const text of ['Quanto custa a teleconsulta?','E qual o valor da consulta?','Quanto custa?']) {
    const plan=planFor(text,history);
    assert.equal(plan.professional,'amanda');
    assert.notEqual(plan.route,'daniel_greeting_and_alert');
  }
  const returnedToDaniel=[...history,patient('Agora quero falar da consulta com o Dr. Daniel.')];
  assert.equal(planFor('Quanto custa a teleconsulta?',returnedToDaniel).professional,'daniel');
  assert.equal(planFor('Quanto custa a teleconsulta?',[...danielHistory,clinic('A Dra. Amanda atende online.')]).professional,'daniel');
  for(const text of ['Quanto custa a teleconsulta?','E qual o valor da consulta?']) {
    assert.equal(planFor(text,[...danielHistory,...remoteHistory]).professional,'amanda');
  }
});

for(const message of ['Meu cardiologista recomendou conversar com vocês.','Não quero consultar o Dr. Daniel.',
  'O Dr. Daniel me encaminhou para vocês.','Minha consulta com minha cardiologista foi ontem.']) {
  test(`an incidental/referral/declined professional does not replace Amanda: ${message}`,()=>{
    const history=[patient('Quero consultar a Dra. Amanda.'),clinic('A Dra. Amanda atende por consulta online.'),patient(message)];
    for(const text of ['Qual o valor da consulta online?','E qual o valor da consulta?']) {
      assert.equal(planFor(text,history).professional,'amanda');
      assert.notEqual(planFor(text,history).route,'daniel_greeting_and_alert');
    }
  });
}

for (const text of ['Não quero consulta online. Qual o valor?','Não quero teleconsulta.',
  'Qual o valor da consulta? O pagamento é online?','É possível agendar online?','Posso pagar a teleconsulta por Pix?']) {
  test(`ambiguous or declined modality stays with the semantic reader: ${text}`,()=>{
    assert.equal(latestConsultationModality(text),'');
    assert.ok(!consultationQuestionTopics(text).includes('remote_consultation'));
    const plan=planFor(text,remoteHistory);
    assert.equal(plan.reason,'open_question_for_ai');
    assert.equal(buildConsultationQuestionBundle({plan,text,recentConversation:remoteHistory}),null);
  });
}

test('modality signal does not confuse an unrelated negation or a corrected preference',()=>{
  assert.equal(latestConsultationModality('A consulta pode ser online. O orçamento não é fechado por mensagem.'),'remote');
  assert.equal(latestConsultationModality('Não quero consulta presencial. Quanto custa a online?'),'remote');
  assert.equal(latestConsultationModality('Não quero consulta online. Prefiro presencial.'),'presencial');
  assert.equal(latestConsultationModality('A consulta pode ser online ou presencial?'),'');
  assert.equal(latestConsultationModality('Quanto custa?',[...remoteHistory,patient('Não quero mais teleconsulta.')]),'');
});

test('an individual estimate through teleconsultation is not a request for the consultation fee',()=>{
  const text='É possível um orçamento por teleconsulta?';
  assert.equal(isConsultationCostInquiry(text),false);
  assert.equal(planFor(text,remoteHistory).reason,'open_question_for_ai');
  assert.equal(isConsultationCostInquiry(`${text} E qual o valor da teleconsulta?`),true);
});

test('online availability plus a surgical range does not introduce a consultation fee',()=>{
  const text='A consulta pode ser online? Qual o preço do lifting facial?';
  const plan=planFor(text), bundle=buildConsultationQuestionBundle({plan,text});
  assert.match(bundle.body,/26 mil e R\$ 42 mil/); assert.doesNotMatch(bundle.body,/500/);
});

test('remote fee plus a surgical range keeps exact labels, no extra or doubled amounts',()=>{
  const text='Qual o preço da consulta online e do lifting facial?';
  const plan=planFor(text), bundle=buildConsultationQuestionBundle({plan,text});
  assert.match(bundle.body,/consulta online.*R\$ 500/); assert.match(bundle.body,/26 mil e R\$ 42 mil/);
  const conversationAction=decideConversationAction({text,plan,conversionExperienceEnabled:true});
  assert.equal(validateOutboundReply({body:bundle.body,currentText:text,conversationAction}).allowed,true);
  for (const body of [bundle.body+' R$ 500.',bundle.body.replace('R$ 500','R$ 900'),bundle.body.replace('A consulta online com a Dra. Amanda custa','A cirurgia custa')]) {
    assert.equal(validateOutboundReply({body,currentText:text,conversationAction}).allowed,false,body);
  }
});

test('urgency and existing administrative followup retain human route',()=>{
  for(const text of ['Quanto custa a teleconsulta? Estou com falta de ar.','Preciso corrigir a nota fiscal anterior. A consulta pode ser online?']) {
    assert.equal(planFor(text,remoteHistory).route,'human_review');
  }
});

test('morning and team drafts share remote facts without presumed payment or scheduling',()=>{
  for(const body of [buildMorningResumeOpening({currentText:'Quanto custa?',recentConversation:remoteHistory}),buildContextualHumanSuggestion({messageText:'Quanto custa a teleconsulta?'})]) {
    assert.match(body,/consulta online.*exterior/); assert.match(body,/R\$ 500/);
    assert.doesNotMatch(body,/presencial|Pix|parcelamento|agendada/);
  }
  assert.doesNotMatch(buildContextualHumanSuggestion({messageText:'A Dra. Amanda atende online?'}),/500/);
  assert.equal(buildContextualHumanSuggestion({messageText:'Quanto custa a teleconsulta do Dr. Daniel?'}),'');
  assert.match(buildContextualHumanSuggestion({messageText:'Quanto custa a consulta presencial?'}),/presencial.*R\$ 500/);
});
