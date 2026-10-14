import assert from 'node:assert/strict';
import test from 'node:test';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { buildSurgicalPriceSuggestedReply } from './surgical-price-review.mjs';
import { buildUnknownHoldingReply } from './knowledge-learning.mjs';
import { conformOutboundReplyToContract, validateOutboundReply } from './outbound-reply-gate.mjs';
import { deterministicReplyCoversPatientQuestions, semanticDecisionConfirmsDeterministicReply } from './semantic-reply-policy.mjs';
import { CONVERSATION_GUIDELINES } from './conversation-guidelines.mjs';

// Entirely synthetic; never reuse patient names, identifiers or literal messages.
const history = [
  {role:'user',source:'patient',text:'Gostaria de entender o lifting facial.'},
  {role:'assistant',source:'bruna',text:'Sou a Bruna. O que você gostaria de esclarecer?'},
];
function context(text, recentConversation=history, messageType='text') {
  const plan = enrichAutomationPlanFromConversation(planAutomation({text,messageType}),recentConversation);
  const action = decideConversationAction({text,messageType,plan,recentConversation,conversionExperienceEnabled:true});
  return {plan,action};
}
function reply(text, recentConversation=history, contextualPrefix='') {
  const {plan,action} = context(text,recentConversation);
  const draft = buildSurgicalPriceSuggestedReply({patientName:'Helena',procedure:plan.procedure,currentText:text,recentConversation,directToPatient:true,introduceBruna:false,offerNextStep:action.replyContract.allowCta});
  const body = conformOutboundReplyToContract({body:contextualPrefix + draft,currentText:text,conversationAction:action,recentConversation});
  return {plan,action,body,gate:validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation})};
}

test('a textual request to send personal photos is independent of a price request',()=>{
  const {plan,action}=context('Posso enviar uma foto minha para avaliar e saber o orçamento? Estou me organizando.');
  assert.equal(plan.reason,'lifting_price_range_direct');
  assert.equal(action.action,'respond');
  assert.ok(action.replyContract.unresolvedIntents.includes('photo_assessment_request'));
  assert.ok(action.replyContract.unresolvedIntents.includes('price_surgery'));
  assert.equal(action.replyContract.requirePhotoDistanceLimit,false,'future photos are not a received image');
  const candidate={decision:{replyCode:'LIFTING-PRICE-RANGE-01'}};
  assert.equal(deterministicReplyCoversPatientQuestions(candidate,action),false,'price alone cannot answer photo questions');
});

for(const [procedure,range] of [['lifting facial',/26 mil e R\$ 42 mil/],['minilifting',/18 mil e R\$ 25 mil/],['lifting cervical',/18 mil e R\$ 26 mil/],['otoplastia',/8 mil e R\$ 14 mil/]]) {
  test(`photo context preserves the already approved range and individual limits: ${procedure}`,()=>{
    const text=`Quanto custa ${procedure}? Quero mandar fotos minhas para avaliação e orçamento.`;
    const result=reply(text,[], 'Sobre as fotos, elas podem contextualizar o que você quer avaliar; a indicação e o orçamento individual ficam para a consulta.\n\n');
    assert.match(result.body,range);
    assert.match(result.body,/fotos/i);
    assert.match(result.body,/orçamento individual ficam para a consulta/);
    assert.match(result.body,/não é um orçamento fechado/);
    assert.doesNotMatch(result.body,/recebi|vi suas fotos|obrigad.*(?:enviar|foto)|vou confirmar.*valor|quer.*agendar/i);
    assert.equal(result.gate.allowed,true,JSON.stringify(result.gate));
  });
}

test('personal concerns and financial planning remain in the unanswered context',()=>{
  const text='Meu nome é Helena. Gostaria de entender lifting facial; tenho flacidez nas bochechas e linhas perto da boca. Posso mandar fotos minhas para avaliar e ter um orçamento? Estou planejando os gastos.';
  const {action}=context(text);
  assert.ok(action.replyContract.unresolvedIntents.includes('appearance_concerns'));
  assert.ok(action.replyContract.unresolvedIntents.includes('photo_assessment_request'));
  assert.ok(action.replyContract.unresolvedIntents.includes('price_surgery'));
  assert.equal(action.action,'respond','planning with an open question is not a closing');
  assert.match(CONVERSATION_GUIDELINES,/foto ainda não recebida/);
  assert.match(CONVERSATION_GUIDELINES,/queixas.*planejamento financeiro/);
  assert.match(CONVERSATION_GUIDELINES,/Não existe frase obrigatória/);
  assert.match(CONVERSATION_GUIDELINES,/a prévia pode ser parcial/);
});

test('different photo explanations can pass without a required sentence; facts remain protected',()=>{
  const text='Vou enviar minhas fotos para vocês avaliarem; qual o preço do lifting facial?';
  const {action}=context(text);
  const check=body=>validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation:history});
  for (const explanation of [
    'As fotos ajudam a contextualizar sua dúvida. A indicação e o orçamento individual são definidos na consulta.',
    'Para definir o orçamento do seu caso é preciso a avaliação com a médica; fotos, sozinhas, não permitem fechar esse plano.',
    'Podemos conversar sobre valores gerais. Com ou sem fotos, a definição da cirurgia e do orçamento individual depende da consulta.',
  ]) {
    const body=reply(text,history,explanation+'\n\n').body;
    assert.equal(check(body).allowed,true,JSON.stringify(check(body)));
    assert.equal(check(body+' Há uma taxa de R$ 900.').allowed,false);
    assert.equal(check(body+' A melhor cirurgia para você é o lifting.').allowed,false);
    assert.equal(check(body+' Sua consulta está confirmada.').allowed,false);
  }
});

test('clinical handoff names individual assessment rather than pretending the known range is missing',()=>{
  const body=buildUnknownHoldingReply({patientName:'Helena',introduceBruna:false,currentText:'Posso mandar fotos minhas para avaliação e orçamento?',reviewReason:'unknown_digest:avaliacao_individual',procedure:'lifting_facial'});
  assert.match(body,/pedido de avaliação individual/);
  assert.match(body,/equipe/);
  assert.doesNotMatch(body,/confirmar a informação de valor|R\$|recebi|já analisou/);
  const payment=buildUnknownHoldingReply({patientName:'Helena',introduceBruna:false,
    currentText:'Vou enviar minhas fotos. Qual a quantidade de parcelas?',
    reviewReason:'unknown_digest:parcelamento',procedure:'lifting_facial'});
  assert.match(payment,/condições de pagamento/,'photos must not hide the actual unknown fact');
  assert.doesNotMatch(payment,/pedido de avaliação individual/);
});

test('photo intent does not swallow a request for examples, marketing or a refusal',()=>{
  for(const text of ['Vocês têm fotos de antes e depois do lifting facial?', 'Não quero enviar fotos. Quanto custa lifting facial?', 'Faço fotos profissionais para clínicas.']) {
    assert.equal(context(text).action.replyContract.unresolvedIntents.includes('photo_assessment_request'),false,text);
  }
  assert.equal(context('Segue a foto.',history,'image').action.replyContract.requirePhotoDistanceLimit,true);
});

test('photos never authorize another surgery, repeat range, or override a semantic veto',()=>{
  const text='Quanto custa blefaroplastia? Posso mandar fotos minhas para avaliação?';
  assert.doesNotMatch(context(text).plan.reason,/price_range_direct$/);
  const first=reply('Qual o preço do lifting facial?');
  const repeated=context('Qual o valor? Posso enviar fotos minhas?', [...history,{role:'assistant',source:'bruna',text:first.body}]);
  assert.equal(repeated.plan.automaticAllowed,false);
  const candidate={status:'completed',decision:{route:'standard_reply',automaticAllowed:true,confidence:'high',urgent:false,professional:'amanda',procedure:'lifting_facial',replyCode:'LIFTING-PRICE-RANGE-01',suggestedReply:first.body}};
  const veto={...candidate,decision:{...candidate.decision,route:'human_review',automaticAllowed:false}};
  assert.equal(semanticDecisionConfirmsDeterministicReply(veto,candidate),false);
});
