import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSurgicalInitialPriceReply, buildSurgicalPriceSuggestedReply, buildPriceReviewAlert } from './surgical-price-review.mjs';
import { validateOutboundReply } from './outbound-reply-gate.mjs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { ensureReviewAlertSuggestion, sendReviewAlertEmailCopy } from './ycloud-review-alert.mjs';

const history = [{ role: 'assistant', source: 'bruna', text: 'Veja https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/' }];
const range = (procedure, currentText = 'Pode me passar') => buildSurgicalPriceSuggestedReply({ procedure, currentText, recentConversation: history, directToPatient: true });

test('price planning keeps the first answer brief without conditioning the range on reading', () => {
  const body = buildSurgicalInitialPriceReply({ procedure: 'lifting_cervical', recentConversation: history });
  assert.ok(body.length < 350);
  assert.doesNotMatch(body, /R\$|depois desse contexto|desconto|parcel|agend/i);
  assert.match(body, /posso te passar uma faixa geral/i);
});

test('unapproved numeric references cannot enter the direct patient builder', () => {
  for (const procedure of ['blefaroplastia','rinoplastia','lipoaspiracao','abdominoplastia','protese_mama','mamoplastia_redutora','braquioplastia','ninfoplastia']) {
    assert.doesNotMatch(range(procedure), /R\$\s*\d/, procedure);
  }
});

test('ranges do not introduce discounts or installments when only price was asked', () => {
  for (const procedure of ['lifting_facial','lifting_cervical','otoplastia']) {
    const body = range(procedure);
    assert.doesNotMatch(body, /desconto|parcel|agend/i);
    assert.match(body, /não é orçamento, proposta nem garantia de preço/i);
    assert.match(body, /após avaliação e planejamento/i);
    assert.ok(body.length <= 650);
  }
});

test('explicit minilifting uses its own range without anchoring a different surgery', () => {
  const body = range('lifting_facial', 'Qual a faixa do minilifting?');
  assert.match(body, /18 mil e R\$ 25 mil/);
  assert.doesNotMatch(body, /26 mil|42 mil/);
  assert.equal(validateOutboundReply({body,currentText:'Qual a faixa do minilifting?',recentConversation:history,conversationAction:{action:'respond'}}).allowed, true);
});

test('internal price draft has a historical source, proposed range and assessment caveat', () => {
  const alert = buildPriceReviewAlert({patientName:'Teste',patientMessage:'Qual o valor da blefaroplastia completa?',procedure:'blefaroplastia'});
  assert.match(alert, /2025/);
  assert.match(alert, /histórica|histórico/i);
  assert.match(alert, /confirmar valores atuais/i);
  assert.match(alert, /18 mil e R\$ 23 mil/);
  assert.match(alert, /não é orçamento, proposta nem garantia de preço/i);
  assert.match(alert, /após avaliação e planejamento/i);
  assert.match(alert, /VALOR NÃO ENVIADO/);
});

test('a specific eyelid request does not receive the complete blepharoplasty estimate', () => {
  const alert = buildPriceReviewAlert({patientMessage:'Quero saber o valor só das pálpebras superiores',procedure:'blefaroplastia'});
  assert.doesNotMatch(alert, /18 mil e R\$ 23 mil/);
  assert.match(alert, /SEM FAIXA SEGURA|superior/i);
});

test('unknown or combined prices stay explicit about missing reference', () => {
  for (const procedure of ['lip_lifting','mastopexia','cirurgias_combinadas']) {
    const alert = buildPriceReviewAlert({patientMessage:'Qual valor?',procedure});
    assert.match(alert, /SEM FAIXA SEGURA/);
    assert.doesNotMatch(alert.split('Revise e copie manualmente:')[1], /\btabela\b|R\$\s*\d/i);
  }
});

test('an allowed range cannot smuggle an extra unapproved monetary amount', () => {
  const body = range('lifting_cervical') + '\nA blefaroplastia fica em R$ 20 mil.';
  const result = validateOutboundReply({body,currentText:'Qual o valor?',recentConversation:history,conversationAction:{action:'respond'}});
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'unapproved_monetary_amount');
});

test('shortened offer passes the real contract and acceptance unlocks only one specific range', () => {
  const text = 'Qual o preço do minilifting?';
  const first = planAutomation({text,messageType:'text'});
  const body = buildSurgicalInitialPriceReply({procedure:first.procedure,currentText:text});
  const action = decideConversationAction({text,messageType:'text',plan:first});
  assert.equal(validateOutboundReply({body,currentText:text,conversationAction:action}).allowed,true);
  const conversation = [{role:'user',text},{role:'assistant',source:'bruna',text:body}];
  const accepted = enrichAutomationPlanFromConversation(planAutomation({text:'Sim',messageType:'text'}),conversation);
  assert.equal(accepted.reason,'lifting_price_range_direct');
  const specific = buildSurgicalPriceSuggestedReply({procedure:accepted.procedure,currentText:'Sim',recentConversation:conversation,directToPatient:true});
  assert.match(specific,/18 mil e R\$ 25 mil/);
  assert.doesNotMatch(specific,/42 mil/);
  conversation.push({role:'assistant',source:'equipe_humana',text:specific});
  const repeated = enrichAutomationPlanFromConversation(planAutomation({text:'Qual o preço do minilifting?',messageType:'text'}),conversation);
  assert.equal(repeated.route,'human_review');
  assert.equal(repeated.automaticAllowed,false);
});

test('mixed authorized ranges, repeated numbers and currency-free additions are rejected', () => {
  for (const extra of ['\nOtoplastia entre R$ 8 mil e R$ 14 mil.','\nCusta mais 20 mil.','\nAdicional R$ 18 mil.']) {
    const result = validateOutboundReply({body:range('lifting_cervical')+extra,currentText:'Qual a faixa?',recentConversation:history,conversationAction:{action:'respond'}});
    assert.equal(result.allowed,false);
    assert.equal(result.reason,'unapproved_monetary_amount');
  }
});

test('a number inserted inside an authorized range description cannot disappear during validation', () => {
  const body = range('lifting_facial').replace('Minilifting:', 'Minilifting: adicional R$ 9 mil;');
  assert.equal(validateOutboundReply({body,currentText:'Qual a faixa?',recentConversation:history,conversationAction:{action:'respond'}}).allowed,false);
});

test('internal email delivery retains the full proposed range, caveat and source', async () => {
  const messageText = buildPriceReviewAlert({patientName:'Teste',patientMessage:'Qual a faixa da blefaroplastia superior?',procedure:'blefaroplastia'});
  const email = ensureReviewAlertSuggestion({messageText,patientName:'Teste',maximumLength:10000});
  let payload;
  await sendReviewAlertEmailCopy({eventId:'synthetic-price',patientName:'Teste',patientPhone:'+5511900000001',messageText:email},{
    env:{GOOGLE_SHEETS_WEBHOOK_URL:'https://sheets.example.test/webhook',GOOGLE_SHEETS_WEBHOOK_SECRET:'synthetic-secret'},
    fetchImpl:async(_url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify({ok:true}),{status:200});},
  });
  assert.equal(payload.action,'send_review_alert_email');
  assert.match(payload.alert.messageText,/14 mil e R\$ 18 mil/);
  assert.match(payload.alert.messageText,/2025/);
  assert.match(payload.alert.messageText,/garantia de preço/);
  assert.match(payload.alert.messageText,/quanto-custa-cirurgia-plastica-facial-sao-paulo\/$/);
});
