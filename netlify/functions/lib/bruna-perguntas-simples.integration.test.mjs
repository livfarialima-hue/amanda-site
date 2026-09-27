import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { approvedProcedureInformationFacts, buildLiftingFacialInformationReply } from './lifting-information.mjs';
import { runOpenAIShadow } from './openai-shadow.mjs';
import { handleYCloudWebhook } from '../ycloud-webhook.mjs';

const source = 'lifting-facial/index.html';
for (const [text, topic, expected] of [
  ['Vocês fazem deep plane?', 'deep_plane', /realiza lifting facial.*deep plane.*indicação/s],
  ['Como funciona o lifting facial?', 'procedure_explanation', /reposiciona.*tecidos/s],
  ['Onde ficam as cicatrizes?', 'scars', /orelhas/],
  ['Qual anestesia é usada?', 'anesthesia', /geral.*sedação|sedação.*geral/],
  ['Em qual hospital é realizada a cirurgia?', 'hospital', /Sírio-Libanês.*Oswaldo Cruz.*Nove de Julho/],
]) {
  test(`public lifting FAQ has a bounded source: ${topic}`, () => {
    const approved = approvedProcedureInformationFacts({ text, procedure: 'lifting_facial' });
    const fact = approved?.facts.find(f => f.topic === topic);
    assert.ok(fact, text);
    assert.equal(fact.source, source);
    assert.match(fact.statement, expected);
    assert.match(approved.boundaries.join(' '), /Não concluir indicação individual/);
    assert.doesNotMatch(fact.statement, /no seu caso|garantid|sem risco|vai precisar/);
  });
}

test('deep plane source matches the canonical page and reply answers before inviting', () => {
  const page = readFileSync(new URL('../../../lifting-facial/index.html', import.meta.url), 'utf8');
  assert.match(page, /realiza lifting facial com abordagem deep plane quando ela é indicada/);
  const body = buildLiftingFacialInformationReply({text:'Vocês fazem deep-plane?',procedure:'lifting_facial',patientName:'Pessoa Exemplo',introduceBruna:true});
  assert.match(body, /Eu sou a Bruna/);
  assert.match(body, /Sim, a Dra\. Amanda realiza/);
  assert.doesNotMatch(body, /Quer que|dúvida importante|dúvida muito válida/);
});

test('facial facts do not spread to another procedure or administrative question', () => {
  for (const procedure of ['', 'otoplastia', 'lipo_papada', 'lifting_cervical']) {
    const facts = approvedProcedureInformationFacts({text:'Vocês fazem deep plane?',procedure});
    assert.ok(!facts?.topics.includes('deep_plane'));
  }
  for (const text of ['Como funciona a consulta?', 'Como é feito o pagamento?']) {
    assert.equal(approvedProcedureInformationFacts({text,procedure:'lifting_facial'}), null);
  }
  assert.equal(approvedProcedureInformationFacts({text:'Cicatrizes de acne, flacidez no rosto e pescoço',procedure:'lifting_facial'}),null);
});

test('the shared semantic input receives facts for a fragmented FAQ and preserves another question', async () => {
  let input;
  await runOpenAIShadow({phone:'+5511900000040', text:'Vocês fazem deep plane? E como é a recuperação?',procedure:'lifting_facial',
    recentConversation:[{role:'user',source:'patient',text:'Quero saber sobre lifting facial.',eventId:'synthetic-faq-origin'}]},
  {env:{OPENAI_API_KEY:'synthetic'},fetchImpl:async(_url,options)=>{
    input=JSON.parse(JSON.parse(options.body).input);return new Response('{}',{status:200});
  }});
  assert.ok(input.approvedClinicalFacts?.topics.includes('deep_plane'));
  assert.ok(input.approvedClinicalFacts?.topics.includes('recovery'));
  assert.match(input.approvedClinicalFacts.boundaries.join(' '), /individual/);
});

const SECRET='synthetic-faq-secret';
const SHEETS='https://sheets.example.test/webhook';
const YCLOUD='https://api.ycloud.com/v2/whatsapp/messages';
function requestFor(payload) {
  const body=JSON.stringify(payload),timestamp='1721908800';
  const signature=createHmac('sha256',SECRET).update(`${timestamp}.${body}`).digest('hex');
  return new Request('http://localhost/api/ycloud/webhook',{method:'POST',headers:{'YCloud-Signature':`t=${timestamp},s=${signature}`},body});
}

const scenarios=['fragmented_faq','unknown_alert_delivered','unknown_alert_failed','unknown_holding_alert_failed','unknown_email_delivered_whatsapp_failed','semantic_veto','fragmented_correction'];
for (const [index,scenario] of scenarios.entries()) {
  test(`actual webhook FAQ and recovery contract: ${scenario}`,async t=>{
    const phone=`+55119000000${50+index}`;
    const settings={YCLOUD_WEBHOOK_SECRET:SECRET,YCLOUD_API_KEY:'synthetic',GOOGLE_SHEETS_WEBHOOK_URL:SHEETS,GOOGLE_SHEETS_WEBHOOK_SECRET:'synthetic',
      WHATSAPP_AUTOMATION_MODE:'active',WHATSAPP_INBOUND_BACKGROUND_ENABLED:'true',WHATSAPP_HUMAN_REPLY_GUARD_MS:'0',
      WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS:'0',WHATSAPP_REPLY_DEBOUNCE_AI_MS:'0',OPENAI_API_KEY:'synthetic',
      WHATSAPP_ALERT_NUMBER:'+5511900000099',YCLOUD_ALERT_TEMPLATE_NAME:'synthetic_review',YCLOUD_ALERT_TEMPLATE_LANGUAGE:'pt_BR'};
    const previous=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));Object.assign(process.env,settings);
    t.after(()=>{for(const[k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
    t.mock.method(console,'log',()=>{});
    const sent=[],actions=[];let semanticCalls=0,semanticInput;
    const unknown=scenario!=='fragmented_faq';
    const failure=['unknown_alert_failed','unknown_holding_alert_failed'].includes(scenario);
    const text=scenario==='fragmented_correction'?'Na verdade quero otoplastia. Vocês fazem deep plane?':scenario==='semantic_veto'?'Vocês fazem deep plane?':scenario==='unknown_holding_alert_failed'?'Qual é a anestesia da minha cirurgia?':
      unknown?'Qual equipamento específico é usado nessa técnica?':'Vocês fazem deep plane?';
    const turns=[{role:'user',source:'patient',eventId:`${scenario}-origin`,at:'2026-09-27T14:08:00Z',text:'Gostaria de saber sobre lifting facial.',messageType:'text'}];
    t.mock.method(globalThis,'fetch',async(url,options)=>{
      const data=JSON.parse(options.body);
      if(url===SHEETS){
        actions.push(data);
        if(data.action==='send_review_alert_email')return new Response(JSON.stringify(failure?{ok:false}:{ok:true,sent:true}),{status:failure?500:200});
        return new Response(JSON.stringify(data.action==='get_conversation_context'?{ok:true,turns,professional:'amanda',opportunityId:scenario}:
          {ok:true,updated:true,duplicate:false,routed:true,routeStatus:'resolved',professional:'amanda',opportunityId:scenario,humanTakeoverToday:false,patientRelationship:{found:false}}),{status:200});
      }
      if(url==='https://api.openai.com/v1/responses'){
        semanticCalls++;const input=JSON.parse(data.input);semanticInput=input;
        return new Response(JSON.stringify({model:'synthetic',output_text:JSON.stringify({route:unknown?'human_review':'standard_reply',confidence:unknown?'low':'high',automaticAllowed:!unknown,urgent:false,
          professional:'amanda',procedure:scenario==='fragmented_correction'?'otoplastia':'lifting_facial',replyCode:unknown?'UNKNOWN-REVIEW-01':'LIFTING-FACIAL-INFORMATION-01',
          suggestedReply:unknown?'':'Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.\n\nSim, a Dra. Amanda realiza lifting facial com abordagem deep plane quando há indicação. A escolha depende da avaliação, da anatomia e dos objetivos de cada pessoa.',
          reviewReason:unknown?'unknown_digest:equipamento_lifting':'',
          conversationState:{activeTopic:'dúvida sobre lifting facial',patientAct:'question',refersToEventId:'',lastClinicQuestion:'',lastClinicOffer:'',unresolvedQuestions:[text],factsAlreadyProvided:[],owner:unknown?'human_team':'bruna',nextExpectedAction:'responder a dúvida',ambiguity:'',contextConfidence:'high'}})}),{status:200});
      }
      assert.equal(url,YCLOUD,'every external call mocked');sent.push(data);
      return new Response('{"status":"accepted"}',{status:failure||scenario==='unknown_email_delivered_whatsapp_failed'?500:200});
    });
    const response=await handleYCloudWebhook(requestFor({id:`${scenario}-final`,type:'whatsapp.inbound_message.received',createTime:'2026-09-27T14:08:15Z',
      whatsappInboundMessage:{id:`${scenario}-message`,from:phone,to:'+5511900000098',sendTime:'2026-09-27T14:08:15Z',type:'text',text:{body:text}}}),
      {livInboundBackground:true},{registerInboundRecoveryImpl:async()=>({status:'completed'})});
    const result=await response.json(),replies=sent.filter(m=>m.to===phone),alerts=actions.filter(a=>a.action==='send_review_alert_email');
    assert.ok(semanticCalls>0,JSON.stringify(result));
    if(scenario==='fragmented_correction'){
      assert.equal(semanticInput.procedureContext,'otoplastia');
      assert.ok(!semanticInput.approvedClinicalFacts?.topics.includes('deep_plane'));
    }
    if(!unknown){
      assert.ok(semanticInput.approvedClinicalFacts?.topics.includes('deep_plane'),JSON.stringify(semanticInput));
      assert.equal(replies.length,1,JSON.stringify(result));assert.match(replies[0].text.body,/Bruna.*deep plane/s);assert.equal(alerts.length,0);return;
    }
    assert.ok(alerts.length>0,'unknown question must reach an immediate internal alert, not only the daily digest');
    if(failure){
      assert.equal(result.aiActiveStatus,'failed',JSON.stringify(result));
      assert.equal(result.automaticWorkFinished,false,'failed alert must stay recoverable');
      assert.equal(replies.length,0,'no promise of handoff before delivered alert');
    }else{
      assert.equal(result.aiActiveStatus,'awaiting_human_learning',JSON.stringify(result));
      assert.equal(result.automaticWorkFinished,true);
      assert.equal(replies.length,0,'no generic holding or unsupported clinical reply');
      assert.ok(actions.some(a=>JSON.stringify(a).includes('human_handoff_queued')),'handoff appears in operational evidence');
    }
  });
}
