import assert from 'node:assert/strict';
import test from 'node:test';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { buildSurgicalPriceSuggestedReply, buildSurgicalPriceHoldingReply } from './surgical-price-review.mjs';
import { buildConsultationInformationReply } from './patient-replies.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { conformOutboundReplyToContract, validateOutboundReply } from './outbound-reply-gate.mjs';

const clinic = text => ({role:'assistant',source:'bruna',text});
const patient = text => ({role:'user',source:'patient',text});
const planFor = (text, history=[]) => enrichAutomationPlanFromConversation(planAutomation({text,messageType:'text'}),history);
function replyFor(text, history=[]) {
  const plan=planFor(text,history);
  const action=decideConversationAction({text,plan,recentConversation:history,messageType:'text',conversionExperienceEnabled:true});
  const draft=buildSurgicalPriceSuggestedReply({procedure:plan.procedure,currentText:text,recentConversation:history,directToPatient:true});
  const body=conformOutboundReplyToContract({body:draft,currentText:text,conversationAction:action,recentConversation:history});
  return {plan,action,body,validation:validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation:history})};
}

for (const [text,procedure,range] of [
  ['Quanto custa a otoplastia?','otoplastia',/8 mil e R\$ 14 mil/],
  ['Qual o preço do lifting cervical?','lifting_cervical',/18 mil e R\$ 26 mil/],
  ['Qual o valor do lifting facial?','lifting_facial',/26 mil e R\$ 42 mil/],
  ['Qual o valor do minilifting?','lifting_facial',/18 mil e R\$ 25 mil/],
]) {
  test(`first explicit price request has the right protected range without an extra permission: ${procedure} ${text}`,()=>{
    const {plan,body,validation}=replyFor(text);
    assert.match(plan.reason,/price_range_direct$/);
    assert.equal(plan.procedure,procedure);
    assert.match(body,range);
    assert.match(body,/Eu sou a Bruna/);
    assert.match(body,/não é orçamento, proposta nem garantia de preço/);
    assert.match(body,/pode ficar fora dessa faixa/);
    assert.doesNotMatch(body,/https?:|posso te passar|desconto|Quais dias/);
    assert.equal(validation.allowed,true,JSON.stringify(validation));
  });
}

test('short price follow-up retains the procedure from the prior patient message',()=>{
  const {plan,body,validation}=replyFor('E o preço?',[patient('Olá! Quero saber sobre lifting cervical com a Dra. Amanda.')]);
  assert.equal(plan.procedure,'lifting_cervical');
  assert.match(body,/18 mil e R\$ 26 mil/);
  assert.doesNotMatch(body,/qual.*procedimento|minilifting|42 mil/i);
  assert.equal(validation.allowed,true);
});

test('range, payment and requested location are answered together without an unsolicited article',()=>{
  const {body,validation}=replyFor('Quanto custa a otoplastia, posso parcelar e onde fica a clínica?');
  assert.match(body,/8 mil e R\$ 14 mil/);
  assert.match(body,/parcelado antecipadamente/);
  assert.match(body,/Pais Leme/);
  assert.doesNotMatch(body,/quanto-custa/);
  assert.equal(validation.allowed,true,JSON.stringify(validation));
});

test('a range is not repeated even when the first response did not include a guide',()=>{
  const first=replyFor('Quanto custa a otoplastia?');
  const again=planFor('Qual o valor mesmo?',[patient('Quanto custa a otoplastia?'),clinic(first.body)]);
  assert.equal(again.automaticAllowed,false);
  assert.equal(again.reason,'otoplasty_price_range_already_sent_review');
});

test('only payment terms, price refusal and generic interest do not unlock numbers',()=>{
  for(const text of ['Como funciona o parcelamento da otoplastia?','Não quero saber valores da otoplastia','Olá! Tenho interesse em otoplastia e gostaria de entender a avaliação.']) {
    assert.doesNotMatch(planFor(text).reason,/price_range_direct$/,text);
  }
});

test('the outbound gate rejects a range on a terms-only or unapproved procedure route',()=>{
  const approved=replyFor('Quanto custa a otoplastia?');
  for (const text of ['Como funciona o parcelamento da otoplastia?', 'Quanto custa a rinoplastia?']) {
    const plan=planFor(text);
    const action=decideConversationAction({text,plan,messageType:'text',conversionExperienceEnabled:true});
    const result=validateOutboundReply({body:approved.body,currentText:text,conversationAction:action});
    assert.equal(result.allowed,false,text);
    assert.equal(result.reason,'surgical_range_not_authorized');
  }
});

test('an approved range for a different procedure is rejected at the final gate',()=>{
  const facial=replyFor('Qual o valor do lifting facial?');
  const cervical=replyFor('Qual o valor do lifting cervical?');
  const result=validateOutboundReply({body:facial.body,currentText:'Qual o valor do lifting cervical?',conversationAction:cervical.action});
  assert.equal(result.allowed,false);
  assert.equal(result.reason,'surgical_range_procedure_mismatch');
});

test('an explicit new facial procedure does not inherit an earlier ear size ambiguity',()=>{
  const {plan,body,validation}=replyFor('Agora gostaria de saber o valor do lifting facial.',[patient('Quero diminuir o tamanho das orelhas')]);
  assert.equal(plan.procedure,'lifting_facial');
  assert.match(body,/26 mil e R\$ 42 mil/);
  assert.doesNotMatch(body,/orelha|8 mil e/);
  assert.equal(validation.allowed,true);
});

test('ear reduction gets a meaningful clarification instead of the standard otoplasty amount',()=>{
  const history=[patient('Tenho interesse em otoplastia'),clinic('Como posso ajudar?')];
  const text='Quanto custa uma cirurgia para redução de orelha?';
  const plan=planFor(text,history);
  assert.equal(plan.automaticAllowed,false);
  assert.equal(plan.reason,'surgical_price_review');
  const body=buildSurgicalPriceHoldingReply({procedure:plan.procedure,currentText:text,recentConversation:history});
  assert.match(body,/tamanho.*afastamento|afastamento.*tamanho/i);
  assert.doesNotMatch(body,/R\$/);
  const action=decideConversationAction({text,plan,recentConversation:history,messageType:'text',conversionExperienceEnabled:true});
  assert.equal(validateOutboundReply({body,currentText:text,recentConversation:history,conversationAction:action}).allowed,true);
});

test('a pending size reduction concern cannot inherit an otoplasty range on a short follow-up',()=>{
  const plan=planFor('E quanto custa?',[patient('Quero otoplastia para diminuir o tamanho das orelhas'),clinic('Você quer diminuir o tamanho ou corrigir o afastamento?')]);
  assert.equal(plan.automaticAllowed,false);
});

test('an explicit clarification of ear projection can use the approved otoplasty range',()=>{
  const {body,validation}=replyFor('É só o afastamento, orelha de abano. Quanto custa?',[patient('Quero reduzir a orelha'),clinic('Você quer diminuir o tamanho ou corrigir o afastamento?')]);
  assert.match(body,/8 mil e R\$ 14 mil/);
  assert.equal(validation.allowed,true);
});

test('consultation price briefly explains its purpose without repeating a previous explanation',()=>{
  const first=buildConsultationInformationReply({consultationPriceRequested:true,conversionExperienceEnabled:true});
  assert.match(first,/R\$ 500/);
  assert.match(first,/examinar|examina/);
  assert.match(first,/Pix, débito ou parcelamento/);
  const repeated=buildConsultationInformationReply({consultationPriceRequested:true,conversionExperienceEnabled:true,consultationContextPreviouslyShared:true});
  assert.doesNotMatch(repeated,/examinar|examina/);
});

test('approved range can offer evaluation once and respects research or refusal',()=>{
  const first=replyFor('Quanto custa a otoplastia?');
  assert.match(first.body,/Se quiser, posso.*avaliação/);
  const refused=replyFor('Quanto custa a otoplastia? Só estou pesquisando, não quero agendar agora.');
  assert.match(refused.body,/8 mil e R\$ 14 mil/);
  assert.doesNotMatch(refused.body,/Se quiser|horário|agendar/);
  assert.equal(refused.validation.allowed,true);
});

test('a requested cost article is optional and does not replace the price answer',()=>{
  const {body,validation}=replyFor('Quanto custa o lifting cervical? Pode mandar o artigo sobre o preço?');
  assert.match(body,/18 mil e R\$ 26 mil/);
  assert.match(body,/https:\/\/draamandaschroeder.com.br\/conteudos\//);
  assert.equal(validation.allowed,true,JSON.stringify(validation));
});

test('other surgical procedures never receive another procedure range',()=>{
  for(const text of ['Qual o preço da blefaroplastia inferior?','Quanto custa reduzir o tamanho da orelha?','Quanto custa lipo de papada?']) {
    const plan=planFor(text);
    assert.equal(plan.automaticAllowed,false,text);
  }
});
