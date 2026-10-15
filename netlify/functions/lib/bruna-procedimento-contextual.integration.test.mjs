import assert from 'node:assert/strict';
import test from 'node:test';
import { planAutomation, enrichAutomationPlanFromConversation } from './whatsapp-automation.mjs';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { buildSurgicalPriceSuggestedReply } from './surgical-price-review.mjs';
import { validateOutboundReply } from './outbound-reply-gate.mjs';

const patient = (text, extra = {}) => ({role:'user',source:'patient',text,...extra});
const clinic = text => ({role:'assistant',source:'human_team',text});
const history = [
  patient('Olá! Tenho interesse em cervicoplastia (lifting cervical) com a Dra. Amanda. Ref. SITE-lifting-cervical'),
  clinic('Posso orientar sobre cervicoplastia. O que gostaria de saber?'),
  patient('Lipoaspiração de papada'),
];
function planned(text, conversation = history) {
  return enrichAutomationPlanFromConversation(planAutomation({
    text,messageType:'text',reference:'G26CERV',recentConversation:conversation,
  }),conversation);
}

test('a joint question retains the patient procedure despite the acquired cervical route', () => {
  const text='Gostaria de saber sobre o procedimento, valor e recuperação. É para minha esposa.';
  const plan=planned(text);
  assert.equal(plan.procedure,'lipo_papada');
  assert.equal(plan.reason,'lipo_papada_price_range_direct');
  const action=decideConversationAction({text,plan,recentConversation:history,messageType:'text',conversionExperienceEnabled:true});
  assert.equal(action.replyContract.procedure,'lipo_papada');
  const body=buildSurgicalPriceSuggestedReply({procedure:plan.procedure,directToPatient:true,currentText:text,recentConversation:history,introduceBruna:false});
  assert.match(body,/lipo de papada isolada.*R\$ 12 mil e R\$ 18 mil/s);
  assert.doesNotMatch(body,/cervicoplastia|R\$ 26 mil/);
  assert.equal(validateOutboundReply({body,currentText:text,recentConversation:history,conversationAction:action}).allowed,true);
});

test('a later generic patient turn carrying acquisition data cannot replace the clarified procedure', () => {
  const conversation=[...history,patient('É para minha esposa.',{reference:'G26CERV'}),clinic('Vou confirmar a informação e retornar.')];
  assert.equal(planned('Qual o valor?',conversation).procedure,'lipo_papada');
});

test('a clinic answer about another procedure cannot replace what the patient asked for', () => {
  const conversation=[...history,patient('Gostaria de saber o procedimento e a recuperação para minha esposa.'),clinic('A cervicoplastia é discutida na consulta.')];
  assert.equal(planned('Vocês fazem?',conversation).procedure,'lipo_papada');
});

test('a campaign-specific opening code follows the resolved patient procedure', () => {
  const plan=enrichAutomationPlanFromConversation(planAutomation({text:'Vocês fazem?',messageType:'text',reference:'G26LIFT'}),history);
  assert.equal(plan.procedure,'lipo_papada');
  assert.equal(plan.replyCode,'X-LIPOPAP-01');
});

for (const text of ['Não quero lipo de papada.','Quero comparar lipo de papada e cervicoplastia.']) {
  test('an unresolved latest clarification blocks the old acquired range: '+text, () => {
    const plan=planned('Qual o valor?',[...history,patient(text)]);
    assert.equal(plan.procedure,null);
    assert.doesNotMatch(plan.reason,/price_range_direct$/);
    assert.equal(plan.automaticAllowed,false);
  });
}

test('a new explicit cervical request still replaces the earlier lipo question', () => {
  const plan=planned('Na verdade, qual o valor da cervicoplastia?');
  assert.equal(plan.procedure,'lifting_cervical');
});

for (const text of ['Lipoaspiração de papada','Lipo de papada aceita convênio?']) {
  test('the actual current turn wins before it has been appended to memory: '+text, () => {
    const plan=planned(text,history.slice(0,2));
    assert.equal(plan.procedure,'lipo_papada');
    assert.equal(plan.currentText,text);
  });
}

for (const [text,conversation] of [
  ['É realizado em hospital?',history],
  ['A lipo de papada é realizada em hospital?',history.slice(0,2)],
]) {
  test('a corrected procedure cannot inherit a hospital fact approved only for lifting: '+text, () => {
    const plan=planned(text,conversation);
    assert.equal(plan.procedure,'lipo_papada');
    assert.equal(plan.reason,'hospital_setting_context_required');
    assert.equal(plan.replyCode,null);
    assert.equal(plan.automaticAllowed,false);
  });
}

for (const [text,reason,replyCode] of [
  ['Estou com falta de ar','possible_urgent_symptoms','ALERT-URG-01'],
  ['Quero consulta com o Dr. Daniel','cardiology_or_dr_daniel','DANIEL-ENC-01'],
]) {
  test('a previous surgical refusal cannot erase an independently selected route: '+reason, () => {
    const conversation=[...history,patient('Não quero lipo de papada')];
    const base=planAutomation({text,messageType:'text'});
    assert.equal(base.reason,reason);
    assert.equal(base.replyCode,replyCode);
    for (const turns of [conversation,[...conversation,patient(text)]]) {
      assert.deepEqual(enrichAutomationPlanFromConversation(base,turns),base);
    }
  });
}
