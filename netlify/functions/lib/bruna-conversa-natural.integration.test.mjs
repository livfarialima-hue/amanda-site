import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assessReplyContinuity, buildReplyContinuityContext } from "./reply-continuity.mjs";
import { approvedProcedureInformationFacts } from "./lifting-information.mjs";
import { runOpenAIShadow } from "./openai-shadow.mjs";
import { validateOutboundReply } from "./outbound-reply-gate.mjs";

// Synthetic conversation: no patient identity, operational IDs or export.
const history = [
  { role: "assistant", source: "bruna", text: "Olá! Sou a Bruna, da Clínica LIV. Qual é a sua principal dúvida?" },
  { role: "user", text: "Não estou gostando do meu rosto" },
  { role: "assistant", source: "bruna", text: "Na avaliação, a Dra. Amanda considera o que você gostaria de mudar e preservar. O que mais chama sua atenção hoje?" },
  { role: "user", text: "Excesso de pele" },
];
const current = "Olhar caído";
const redundant = "Entendi. O excesso de pele e a sensação de olhar caído podem envolver regiões diferentes. Isso chama mais sua atenção nas pálpebras ou no rosto como um todo?";
const useful = "Entendi. Na avaliação, a Dra. Amanda observa as pálpebras, as sobrancelhas e o rosto em conjunto para conversar sobre as possibilidades. Você não precisa chegar sabendo qual cirurgia fazer.";
const action = { action: "respond", replyContract: { maxLinks: 0, maxQuestions: 1, allowCta: false } };
const assess = (body, overrides={}) => assessReplyContinuity({body,currentMessage:current,recentConversation:history,...overrides});

test("recognizes present-tense discovery and the complete fragmented answer", () => {
  const context=buildReplyContinuityContext({currentMessage:current,recentConversation:history});
  assert.equal(context.answeredDiscovery,true);
  assert.equal(context.patientAnswer,"Excesso de pele\nOlhar caído");
});
test("principal doubt opening is answered even by a short region", () => {
  assert.equal(buildReplyContinuityContext({currentMessage:"Rosto",recentConversation:history.slice(0,1)}).answeredDiscovery,true);
});
test("generic rediscovery cannot masquerade as progress by adding hoje", () => {
  const result=assess("O que mais chama sua atenção hoje?");
  assert.equal(result.needsRevision,true);
  assert.ok(result.removed.includes("answered_discovery_question"));
});
test("broad eye-versus-face sorting after the description requires a useful new draft", () => {
  const result=assess(redundant);
  assert.equal(result.needsRevision,true);
  assert.ok(result.removed.includes("redundant_region_discovery"));
});
test("final outbound consumer blocks the unhelpful anatomical fork", () => {
  assert.equal(validateOutboundReply({body:redundant,currentText:current,recentConversation:history,conversationAction:action}).allowed,false);
  assert.equal(validateOutboundReply({body:useful,currentText:current,recentConversation:history,conversationAction:action}).allowed,true);
});
test("specific new clarification and an unknown initial region remain available", () => {
  const question="Você fala das pálpebras superiores ou inferiores?";
  assert.equal(assess(question).body,question);
  assert.equal(assess(redundant,{recentConversation:[]}).body,redundant);
  assert.equal(assess("Você quer saber o valor da consulta ou da cirurgia?").body,"Você quer saber o valor da consulta ou da cirurgia?");
});
test("appearance alone does not justify telling someone their perception weighs on them", () => {
  const result=assess("Entendo como essa percepção do rosto pode pesar. "+useful);
  assert.ok(result.removed.includes("assumed_distress"));
  assert.doesNotMatch(result.body,/pode pesar/);
});
test("explicit distress remains acknowledged and safety information stays intact", () => {
  const body="Entendo como isso pode pesar. Procure atendimento urgente se houver dor ou alteração da visão.";
  assert.equal(assess(body,{currentMessage:"Isso me deixa triste e afeta minha autoestima"}).body,body);
});
test("educational eye assessment facts use the current burst without prescribing a procedure", () => {
  const result=approvedProcedureInformationFacts({text:current,procedure:"lifting_facial",recentConversation:history});
  const fact=result?.facts.find(f=>f.topic==="eye_face_assessment");
  assert.ok(fact);
  assert.equal(fact.source,"blefaroplastia/index.html");
  assert.match(fact.statement,/sobrancelhas/);
  assert.match(result.boundaries.join(" "),/Não.*(?:indica|escolh)/);
  assert.doesNotMatch(fact.statement,/você precisa|indico|melhor cirurgia|blefaroplastia.*indicada/i);
});
test("eye facts do not leak from an old topic or unrelated procedure", () => {
  assert.equal(approvedProcedureInformationFacts({text:"Aceita Pix?",procedure:"lifting_facial",recentConversation:[...history,{role:"user",text:current},{role:"assistant",text:useful}]}),null);
  assert.equal(approvedProcedureInformationFacts({text:current,procedure:"otoplastia"}),null);
});

function decision(suggestedReply){return {route:"standard_reply",confidence:"high",automaticAllowed:true,urgent:false,professional:"amanda",procedure:"lifting_facial",replyCode:"",suggestedReply,reviewReason:"",conversationState:{activeTopic:"avaliação facial",patientAct:"answer",refersToEventId:"",lastClinicQuestion:"",lastClinicOffer:"",unresolvedQuestions:[],factsAlreadyProvided:[],owner:"bruna",nextExpectedAction:"responder",ambiguity:"",contextConfidence:"high"}};}
async function modelRun(replies){
  const calls=[],signals=[];
  const result=await runOpenAIShadow({phone:"+5511900000000",text:current,procedure:"lifting_facial",recentConversation:history,replyContract:action.replyContract},{env:{OPENAI_API_KEY:"synthetic",BRUNA_CONVERSION_EXPERIENCE_V1:"enabled"},fetchImpl:async(_url,options)=>{
    calls.push(JSON.parse(options.body));signals.push(options.signal);
    const reply=replies[Math.min(calls.length-1,replies.length-1)];
    if(reply instanceof Error)throw reply;
    return new Response(JSON.stringify({model:"test",output_text:JSON.stringify(typeof reply==="string"?decision(reply):reply)}));
  }});
  return {result,calls,signals};
}
test("shared model consumer receives facts and corrects once within the same deadline", async()=>{
  const {result,calls,signals}=await modelRun([redundant,useful]);
  assert.equal(calls.length,2);assert.equal(signals[0],signals[1]);
  assert.match(calls[0].input,/eye_face_assessment/);
  assert.match(calls[1].input,/redundant_region_discovery/);
  assert.equal(result.decision.suggestedReply,useful);
  assert.equal(result.decision.automaticAllowed,true);
});
test("useful first draft makes no extra model call", async()=>{
  const {result,calls}=await modelRun([useful]);
  assert.equal(calls.length,1);assert.equal(result.decision.suggestedReply,useful);
});
test("a failed revision never sends a partial draft or retries the inbound event", async()=>{
  const error=new Error("synthetic timeout");error.name="AbortError";
  const {result,calls}=await modelRun([redundant,error]);
  assert.equal(calls.length,2);assert.equal(result.decision.automaticAllowed,false);
  assert.equal(result.decision.suggestedReply,"");assert.equal(result.decision.route,"human_review");
});
test("revision cannot override clinical or human review veto", async()=>{
  const veto={...decision(""),route:"human_review",automaticAllowed:false,reviewReason:"clinical_review",urgent:true};
  const {result,calls}=await modelRun([redundant,veto]);
  assert.equal(calls.length,2);assert.equal(result.decision.automaticAllowed,false);assert.equal(result.decision.urgent,true);
});
test("instructions require proportional empathy and useful progress without obligatory questions",()=>{
  const prompt=readFileSync(new URL("./conversation-guidelines.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(prompt,/Prefira "Entendo como essa percepção pode pesar/);
  assert.match(prompt,/Não presuma sofrimento/);
  assert.match(prompt,/Não transforme.*descrição.*triagem anatômica/);
});
