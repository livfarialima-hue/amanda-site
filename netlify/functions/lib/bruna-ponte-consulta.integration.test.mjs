import test from 'node:test';
import assert from 'node:assert/strict';
import { decideConversationAction } from './conversation-action-controller.mjs';
import { buildConsultationInformationReply } from './patient-replies.mjs';
import { classifyBrunaCta } from './bruna-conversion-experience.mjs';
import { isAppointmentOfferAcceptance, hasAppointmentPreferenceInConversation } from './appointment-suggestions.mjs';
import { validateOutboundReply } from './outbound-reply-gate.mjs';
import { runOpenAIShadow } from './openai-shadow.mjs';

// Synthetic context only. An invitation is not a reservation or qualification.
const plan={route:'standard_reply',reason:'known_procedure',professional:'amanda',procedure:'lifting_facial',automaticAllowed:true};
const clinic=text=>({role:'assistant',source:'bruna',text});
const patient=text=>({role:'user',text});
const explanation=clinic('Na avaliação, a Dra. Amanda examina a região e conversa sobre possibilidades e limites. O que mais chama sua atenção hoje?');
const history=[patient('O contorno do meu rosto me incomoda'),explanation];
const offer='Se quiser, posso verificar opções de horário com a equipe.';
const act=(text='Excesso de pele',options={})=>decideConversationAction({text,plan,recentConversation:history,conversionExperienceEnabled:true,...options});

test('a personal answer after consultation explanation permits one optional availability offer',()=>{
 const a=act();assert.equal(a.action,'respond');assert.equal(a.replyContract.consultationNextStep,'offer_availability');
 assert.ok(a.replyContract.allowedCtaTypes.includes('availability_exploration'));
 assert.equal(a.replyContract.stage,'consideration');assert.equal(a.replyContract.allowAppointmentConfirmation,false);
 assert.ok(!a.replyContract.allowedCtaTypes.includes('preference_capture'));
});
test('an explicit consultation explanation has a concrete next step, not generic rediscovery',()=>{
 const a=act('Como funciona a avaliação?',{plan:{...plan,reason:'consultation_information_request'},recentConversation:[]});
 const body=buildConsultationInformationReply({procedure:'lifting_facial',conversionExperienceEnabled:true,consultationNextStep:a.replyContract.consultationNextStep});
 assert.match(body,/avaliação/);assert.match(body,/verificar opções de horário/);assert.doesNotMatch(body,/O que seria mais útil|Quais dias/);
 assert.equal(validateOutboundReply({body,currentText:'Como funciona a avaliação?',conversationAction:a}).allowed,true);
});
test('a previous availability offer suppresses another offer even with different wording',()=>{
 for(const previous of [offer,'Quer que eu confira os próximos horários?','Se quiser, posso ver a disponibilidade.']){
 const a=act('Como funciona a avaliação?',{plan:{...plan,reason:'consultation_information_request'},recentConversation:[...history,clinic(previous)]});
 assert.equal(a.replyContract.consultationNextStep,'answer_only');assert.ok(!a.replyContract.allowedCtaTypes.includes('availability_exploration'));
 }
});
test('a prior decline or research preference blocks proactive availability while answering a new question',()=>{
 for(const decline of ['Vou pensar com calma','Não quero agendar agora','Só estou pesquisando']){
 const a=act('Como funciona a avaliação?',{plan:{...plan,reason:'consultation_information_request'},recentConversation:[...history,patient(decline),clinic('Tudo bem.')]});
 assert.equal(a.replyContract.consultationNextStep,'answer_only');
 }
});
test('prefill, generic research, price alone and acknowledgements do not establish the new bridge',()=>{
 for(const [text,options] of [['Excesso de pele',{plan:{...plan,marketingPrefill:true}}],['Lifting facial',{recentConversation:[]}],['Quanto custa o lifting facial?',{}],['Obrigada',{}],['Só estou pesquisando',{}]]){
 assert.notEqual(act(text,options).replyContract.consultationNextStep,'offer_availability');
 }
});
test('unknown procedure, clinical review, photos, takeover and feature disabled remain bounded',()=>{
 for(const options of [{plan:{...plan,procedure:null}},{plan:{...plan,route:'human_review',automaticAllowed:false}},{messageType:'image'},{humanTakeoverActive:true},{conversionExperienceEnabled:false}]){
 assert.notEqual(act('Excesso de pele',options).replyContract.consultationNextStep,'offer_availability');
 }
});
test('a new consultation price answer does not repeat an earlier availability invitation',()=>{
 const a=act('Quanto custa a consulta?',{plan:{...plan,reason:'consultation_information_request'},recentConversation:[...history,clinic(offer)]});
 const body=buildConsultationInformationReply({procedure:'lifting_facial',conversionExperienceEnabled:true,consultationPriceRequested:true,consultationContextPreviouslyShared:true,consultationNextStep:a.replyContract.consultationNextStep});
 assert.match(body,/R\$ 500/);assert.doesNotMatch(body,/horário|O que seria mais útil/);
});
test('availability wording is recognized without classifying an informational offer as scheduling',()=>{
 for(const text of ['Quer que eu confira os próximos horários?','Se quiser, posso ver a disponibilidade.']) {
 assert.equal(classifyBrunaCta(text),'availability_exploration');assert.equal(isAppointmentOfferAcceptance('Pode sim',[clinic(text)]),true);
 }
 assert.equal(classifyBrunaCta('Posso explicar como funciona a avaliação?'),'informational_continuation');
});
test('short acceptance refers to the last clinic offer, not an older invitation to book',()=>{
 assert.equal(isAppointmentOfferAcceptance('Sim',[clinic(offer)]),true);
 assert.equal(isAppointmentOfferAcceptance('Sim',[clinic(offer),patient('Antes disso tenho uma dúvida'),clinic('Posso explicar como funciona a avaliação?')]),false);
 assert.equal(isAppointmentOfferAcceptance('Sim',[clinic(offer),patient('Não quero marcar agora')]),false);
});
test('preferences already supplied remain available when the patient accepts the offer',()=>{
 assert.equal(hasAppointmentPreferenceInConversation('Sim',[patient('Para mim só funciona quarta de manhã'),clinic(offer)]),true);
 assert.equal(isAppointmentOfferAcceptance('Por favor',[clinic(offer)]),true);
});
test('final gate accepts a contextual invitation but never a claimed booking',()=>{
 const a=act();const body='Na avaliação, a Dra. Amanda observa o rosto em conjunto. '+offer;
 assert.equal(validateOutboundReply({body,currentText:'Excesso de pele',recentConversation:history,conversationAction:a}).allowed,true);
 assert.equal(validateOutboundReply({body:'Sua consulta está confirmada para quarta às 9h.',currentText:'Excesso de pele',recentConversation:history,conversationAction:a}).allowed,false);
});
test('the shared model consumer receives the same next-step permission without another request',async()=>{
 const a=act(),calls=[];
 await runOpenAIShadow({phone:'+5511900000000',text:'Excesso de pele',procedure:'lifting_facial',recentConversation:history,replyContract:a.replyContract},{env:{OPENAI_API_KEY:'synthetic',BRUNA_CONVERSION_EXPERIENCE_V1:'enabled'},fetchImpl:async(_url,options)=>{calls.push(JSON.parse(options.body));return new Response('{}');}});
 assert.equal(calls.length,1);assert.match(calls[0].input,/"consultationNextStep":"offer_availability"/);
});
