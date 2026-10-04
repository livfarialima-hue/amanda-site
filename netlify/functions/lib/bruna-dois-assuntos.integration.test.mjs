import assert from 'node:assert/strict';
import test from 'node:test';
import * as context from './patient-turn-context.mjs';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { approvedProcedureInformationFacts } from './lifting-information.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import * as price from './surgical-price-review.mjs';
import { deterministicReplyCoversPatientQuestions } from './semantic-reply-policy.mjs';
import { conformOutboundReplyToContract, validateOutboundReply } from './outbound-reply-gate.mjs';

const clinic = text => ({role:'assistant',source:'bruna',text});
const patient = text => ({role:'user',source:'patient',text});
const offer = 'Sobre lifting facial, você prefere entender como funciona o procedimento ou como são definidos os valores?';
const history = [patient('Quero saber sobre lifting facial.'),clinic('Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.'),clinic(offer)];
const planFor = (text, turns=history) => enrichAutomationPlanFromConversation({...planAutomation({text,messageType:'text'}),currentText:text},turns);
const actionFor = (text, plan, turns=history) => decideConversationAction({text,plan,recentConversation:turns,messageType:'text',conversionExperienceEnabled:true});

test('both topics offered by a follow-up reach the plan, approved facts and outbound contract',()=>{
  const plan = planFor('Os dois');
  assert.equal(plan.reason,'lifting_price_range_direct');
  assert.equal(plan.procedure,'lifting_facial');
  assert.equal(plan.currentText,'Os dois','do not rewrite the patient ledger');
  const facts = approvedProcedureInformationFacts({text:'Os dois',procedure:plan.procedure,recentConversation:history});
  assert.ok(facts?.topics.includes('procedure_explanation'));
  const intents = actionFor('Os dois',plan).replyContract.unresolvedIntents;
  assert.ok(intents.includes('price_surgery'));
  assert.ok(intents.includes('procedure_information'));
});

test('strict plural acceptance supports polite variants and the reverse order of the same topics',()=>{
  for (const text of ['Os dois','Ambos','As duas, por favor','Quero os dois','Os 2 😊','Pode explicar ambos']) {
    for (const question of [offer,'Você prefere saber os valores ou como funciona o procedimento?']) {
      const turns = [patient('Quero saber sobre lifting facial.'),clinic(question)];
      assert.equal(planFor(text,turns).reason,'lifting_price_range_direct',`${text}: ${question}`);
      assert.match(context.informationRequestText({text,recentConversation:turns}),/Como funciona o procedimento/);
    }
  }
});

test('plural shorthand never resurrects an old offer or accepts scheduling, two procedures or a new condition',()=>{
  for (const [text,turns] of [
    ['Os dois',[]],['Os dois',[...history,clinic('Prefere manhã ou tarde?')]],
    ['Os dois',[clinic('Você quer lifting facial ou cervical?')]],
    ['Os dois',[clinic('Posso explicar o procedimento. Quer agendar ou pagar a consulta?')]],
    ['Sim',history],['Os dois, mas só se for sem cirurgia',history],['Não quero os dois',history],
    ['Os dois. Estou com falta de ar',history],['Os dois. Pode ser online?',history],
    ['Os dois',[clinic('Prefere procedimento, recuperação ou valores?')]],
  ]) assert.equal(context.informationRequestText({text,recentConversation:turns}),text,JSON.stringify({text,turns}));
  assert.equal(planFor('Os dois. Estou com falta de ar').reason,'possible_urgent_symptoms');
});

test('information acceptance keeps scheduling closed and preserves takeover',()=>{
  const text='Os dois',plan=planFor(text),action=actionFor(text,plan);
  assert.ok(!action.replyContract.unresolvedIntents.includes('scheduling'));
  const held=decideConversationAction({text,plan,recentConversation:history,messageType:'text',humanTakeoverActive:true});
  assert.equal(held.action,'wait_team');
});

test('unknown procedures and already delivered ranges stay under the existing price policy',()=>{
  const unknown=[patient('Quero saber sobre rinoplastia.'),clinic(offer.replace('lifting facial','rinoplastia'))];
  assert.equal(planFor('Os dois',unknown).automaticAllowed,false);
  const repeated=[...history,clinic(price.buildSurgicalPriceSuggestedReply({procedure:'lifting_facial',currentText:'Qual o valor?',directToPatient:true,recentConversation:history})),clinic(offer)];
  assert.equal(planFor('Os dois',repeated).reason,'lifting_price_range_already_sent_review');
});

test('the approved combined reply explains first, keeps the disclosure and does not repeat introduction',()=>{
  const text='Os dois',plan=planFor(text);
  assert.equal(typeof price.buildAcceptedProcedurePriceReply,'function');
  const candidate=price.buildAcceptedProcedurePriceReply({plan,currentText:text,recentConversation:history});
  const action=actionFor(text,plan);
  const body=conformOutboundReplyToContract({body:candidate.decision.suggestedReply,currentText:text,conversationAction:action,recentConversation:history});
  assert.match(body,/reposiciona os tecidos/);
  assert.match(body,/R\$ 26 mil e R\$ 42 mil/);
  assert.match(body,/não é um orçamento fechado/);
  assert.match(body,/equipe.*hospital.*anestesia.*materiais/s);
  assert.ok(body.indexOf('reposiciona')<body.indexOf('R$'));
  assert.doesNotMatch(body,/Olá|sou a Bruna|confirmar.*equipe|https?:/);
  assert.equal(validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation:history}).allowed,true);
});

test('a price-only template cannot replace both answers; unrelated pending questions still veto the combined template',()=>{
  const plan=planFor('Os dois'),action=actionFor('Os dois',plan);
  const partial={decision:{replyCode:'LIFTING-PRICE-RANGE-01',suggestedReply:'Faixa aprovada'}};
  assert.equal(deterministicReplyCoversPatientQuestions(partial,action),false);
  assert.equal(typeof price.buildAcceptedProcedurePriceReply,'function');
  const full=price.buildAcceptedProcedurePriceReply({plan,currentText:'Os dois',recentConversation:history});
  assert.equal(deterministicReplyCoversPatientQuestions(full,action),true);
  assert.equal(deterministicReplyCoversPatientQuestions(full,{replyContract:{unresolvedIntents:['price_surgery','recovery']}}),false);
});

test('the combined compositor requires approved facts, approved price, latest offer and semantic validation',()=>{
  assert.equal(typeof price.buildAcceptedProcedurePriceReply,'function');
  for (const [text,turns] of [['Os dois',[]],['Não quero os dois',history],['Os dois',[patient('Quero rinoplastia'),clinic(offer)]]]) {
    assert.equal(price.buildAcceptedProcedurePriceReply({plan:planFor(text,turns),currentText:text,recentConversation:turns}),null);
  }
});

test('cervical information uses its own approved explanation and range without inheriting facial amounts',()=>{
  const turns=[patient('Quero saber sobre lifting cervical.'),clinic(offer.replace('lifting facial','lifting cervical'))];
  const text='Ambos',plan=planFor(text,turns),candidate=price.buildAcceptedProcedurePriceReply({plan,currentText:text,recentConversation:turns});
  assert.equal(plan.procedure,'lifting_cervical');
  const body=candidate.decision.suggestedReply;
  assert.match(body,/platisma/);assert.match(body,/R\$ 18 mil e R\$ 26 mil/);assert.doesNotMatch(body,/42 mil/);
  const action=actionFor(text,plan,turns);
  assert.equal(deterministicReplyCoversPatientQuestions(candidate,action),true);
  assert.equal(validateOutboundReply({body,currentText:text,conversationAction:action,recentConversation:turns}).allowed,true);
});
