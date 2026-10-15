import assert from 'node:assert/strict';
import test from 'node:test';
import { isProcedureExplanationInquiry } from './patient-turn-context.mjs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { approvedProcedureInformationFacts } from './lifting-information.mjs';
import { buildAcceptedProcedurePriceReply, buildSurgicalPriceSuggestedReply, buildSurgicalPriceHoldingReply } from './surgical-price-review.mjs';
import { buildConsultationQuestionBundle } from './consultation-question-bundle.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { deterministicReplyCoversPatientQuestions } from './semantic-reply-policy.mjs';
import { validateOutboundReply } from './outbound-reply-gate.mjs';

const patient = text => ({role:'user',source:'patient',text});
const clinic = text => ({role:'assistant',source:'bruna',text});
const history = [patient('Quero informações sobre lipo de papada.'),clinic('Qual é a sua dúvida?')];
const planFor = (text, turns=history, extra={}) => enrichAutomationPlanFromConversation({...planAutomation({text,messageType:'text',...extra}),currentText:text},turns);

test('natural requests about the procedure preserve the independent educational intent',()=>{
  for(const text of ['Gostaria de saber sobre o procedimento, valor e recuperação','Quero entender o procedimento e os valores','Pode me explicar o procedimento?','Como é o procedimento?']) {
    assert.equal(isProcedureExplanationInquiry(text),true,text);
    const facts=approvedProcedureInformationFacts({text,procedure:'lipo_papada'});
    assert.ok(facts?.topics.includes('neck_procedure_explanation'),text);
  }
  for(const text of ['Quero saber o valor do procedimento','Como funciona o pagamento?','Gostaria de saber sobre a consulta']) assert.equal(isProcedureExplanationInquiry(text),false,text);
});

test('the requested isolated lipo range shares a complete procedure and recovery answer',()=>{
  const text='Gostaria de saber sobre o procedimento, valor e recuperação';
  const plan=planFor(text);
  assert.equal(plan.reason,'lipo_papada_price_range_direct');
  const candidate=buildAcceptedProcedurePriceReply({plan,currentText:text,recentConversation:history});
  assert.ok(candidate);
  const body=candidate.decision.suggestedReply;
  assert.match(body,/remove gordura.*flacidez.*platisma.*Dra\. Amanda/s);
  assert.match(body,/inchaço.*sensibilidade.*roxos/s);
  assert.match(body,/lipo de papada isolada.*R\$ 12 mil e R\$ 18 mil/);
  assert.match(body,/não é um orçamento fechado/);
  assert.doesNotMatch(body,/cervicoplastia|R\$ 26|confirmar.*equipe|alta.*amanhã/);
  const action=decideConversationAction({text,plan,recentConversation:history,messageType:'text'});
  assert.equal(deterministicReplyCoversPatientQuestions(candidate,action),true);
  assert.equal(validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation:history}).allowed,true);
});

test('isolated lipo requires patient scope and never inherits approval from an ad or another procedure',()=>{
  for(const [text,turns,extra] of [
    ['Qual o valor?',[],{reference:'G26PAPADA'}],
    ['Qual o valor?',[clinic('Posso orientar sobre lipo de papada.')],{}],
    ['Quero lipo de papada com platismoplastia. Qual o valor?',[],{}],
    ['Qual o valor da lipo de papada e blefaroplastia?',[],{}],
    ['Quanto custa a lipo de papada com tratamento do músculo?',[],{}],
    ...['com retirada de pele','com tratamento da flacidez','com tratamento muscular','junto com preenchimento','+ botox','e bichectomia','junto da mentoplastia','com Renuvion'].map(extra=>[`Quanto custa lipo de papada ${extra}?`,[],{}]),
    ...['bichectomia e','mentoplastia junto com','botox +'].map(extra=>[`Quanto custa ${extra} lipo de papada?`,[],{}]),
  ]) assert.notEqual(planFor(text,turns,extra).reason,'lipo_papada_price_range_direct',text);
  assert.equal(planFor('Qual o valor da lipo de papada isolada?',[]).reason,'lipo_papada_price_range_direct');
  assert.equal(planFor('Não quero cervicoplastia, só lipo de papada. Qual o valor?',[]).reason,'lipo_papada_price_range_direct');
  for(const text of ['Quero informações sobre lipo de papada. Gostaria de saber mais sobre o procedimento, valor e recuperação.','Quanto custa a lipo de papada mais ou menos?','Qual o valor da lipo de papada? E obrigada pela atenção.']) {
    assert.equal(planFor(text,[]).reason,'lipo_papada_price_range_direct',text);
  }
});

test('historical human price wording blocks repetition without authorizing a looser outgoing range',()=>{
  const text='E qual é o valor da lipo de papada?';
  for(const prior of ['Para lipo de papada isolada, a referência é de R$ 12.000 a R$ 18.000.','A lipo de papada fica de 12 a 18 mil.','Fica de 12 a 18 mil.','Fica entre R$ 12.000 e R$ 18.000.']) {
    const turns=[...history,{role:'assistant',source:'equipe_humana',text:prior},clinic('Posso ajudar com outra dúvida?')];
    assert.equal(planFor(text,turns).reason,'lipo_papada_price_range_already_sent_review');
    const plan=planFor(text), body=buildSurgicalPriceSuggestedReply({procedure:'lipo_papada',currentText:text,recentConversation:history,directToPatient:true});
    const action=decideConversationAction({text,plan,recentConversation:history,messageType:'text'});
    assert.equal(validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation:turns}).allowed,false);
  }
  assert.equal(planFor(text,[...history,patient('A lipo de papada fica de 12 a 18 mil?')]).reason,'lipo_papada_price_range_direct');
  assert.equal(planFor(text,[...history,patient('Fica de 12 a 18 mil?')]).reason,'lipo_papada_price_range_direct');
});

test('lipo range does not authorize different amounts, missing caveats, other procedures or undefined scope',()=>{
  const text='Qual o valor da lipo de papada isolada?', plan=planFor(text,[]);
  const body=buildSurgicalPriceSuggestedReply({procedure:'lipo_papada',currentText:text,directToPatient:true});
  const action=decideConversationAction({text,plan,messageType:'text'});
  for(const invalid of [body.replace('12 mil','10 mil'),body+' Há uma taxa de R$ 900.',body.replace('não é um orçamento fechado','é um orçamento fechado')]) {
    assert.equal(validateOutboundReply({body:invalid,currentText:text,conversationAction:action}).allowed,false);
  }
  for(const currentText of ['Quanto custa a lipo de papada com Renuvion?','Qual valor?']) assert.equal(validateOutboundReply({body,currentText,conversationAction:action}).allowed,false);
  const mismatch={...action,replyContract:{...action.replyContract,procedure:'lifting_cervical'}};
  assert.equal(validateOutboundReply({body,currentText:text,conversationAction:mismatch}).allowed,false);
  assert.equal(validateOutboundReply({body,currentText:text,conversationAction:{action:'respond'}}).allowed,false);
});

test('consultation and isolated lipo questions retain both approved amounts in the shared bundle',()=>{
  for(const text of ['Quanto custa a consulta e a lipo de papada?','Qual o valor da lipo de papada e da consulta?']) {
    const plan=planFor(text,[]),bundle=buildConsultationQuestionBundle({plan,text,recentConversation:[]});
    assert.equal(plan.reason,'consultation_question_bundle');
    assert.match(bundle.body,/R\$ 500/);assert.match(bundle.body,/R\$ 12 mil e R\$ 18 mil/);
    const action=decideConversationAction({text,plan,messageType:'text'});
    assert.equal(validateOutboundReply({body:bundle.body,currentText:text,conversationAction:action}).allowed,true);
  }
});

test('cervical association preserves its prior range and unapproved association keeps educational facts only',()=>{
  const text='Como funciona a lipo de papada com cervicoplastia e qual o valor?';
  const plan=planFor(text,[]);
  assert.equal(plan.reason,'lifting_price_range_direct');assert.equal(plan.procedure,'lifting_cervical');
  const body=buildSurgicalPriceSuggestedReply({procedure:plan.procedure,currentText:text,directToPatient:true});
  assert.match(body,/R\$ 18 mil e R\$ 26 mil/);assert.doesNotMatch(body,/12 mil/);
  const pending='Quero lipo de papada com tratamento muscular. Gostaria de saber sobre o procedimento, valor e recuperação';
  const hold=buildSurgicalPriceHoldingReply({procedure:'lipo_papada',currentText:pending,recentConversation:history,introduceBruna:false});
  assert.match(hold,/gordura.*platisma.*inchaço.*sensibilidade.*roxos.*confirmar/s);assert.doesNotMatch(hold,/R\$/);
});

test('lipo range is sent once and explicit courtesy acceptance is scoped to the latest offer',()=>{
  const offer=[...history,clinic('Posso te passar uma faixa geral de valores como referência inicial?')];
  assert.equal(planFor('Por favor',offer).reason,'lipo_papada_price_range_direct');
  const body=buildSurgicalPriceSuggestedReply({procedure:'lipo_papada',currentText:'Qual o valor?',recentConversation:history,directToPatient:true});
  assert.equal(planFor('E o valor?', [...history,clinic(body)]).reason,'lipo_papada_price_range_already_sent_review');
  assert.notEqual(planFor('Não quero saber o valor. Como é a recuperação?').reason,'lipo_papada_price_range_direct');
});

test('new numeric permission does not change clinical, urgent, third-person or takeover decisions',()=>{
  const third='Estou pesquisando lipo de papada para minha mãe. Gostaria de saber sobre o procedimento, valor e recuperação';
  assert.equal(planFor(third,[]).reason,'lipo_papada_price_range_direct');
  assert.equal(planFor('Fiz lipo de papada e estou com falta de ar. Qual o valor?').reason,'possible_urgent_symptoms');
  const text='Qual o valor da lipo de papada?';
  assert.equal(decideConversationAction({text,plan:planFor(text),recentConversation:history,humanTakeoverActive:true,messageType:'text'}).action,'wait_team');
  const noProcedure=planFor('Gostaria de saber sobre o procedimento, valor e recuperação',[]);
  assert.equal(buildAcceptedProcedurePriceReply({plan:noProcedure,currentText:text,recentConversation:[]}),null);
});
