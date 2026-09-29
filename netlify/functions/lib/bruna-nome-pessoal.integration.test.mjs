import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveContactIdentity, usableProfileName, usableProfileFirstName, usableKnownPatientName } from './profile-name.mjs';
import { buildMarketingPrefilledOpeningReply } from './patient-replies.mjs';
import { buildSurgicalPriceSuggestedReply } from './surgical-price-review.mjs';
import { buildSimpleCoordinationReply } from './human-resume-policy.mjs';
import { buildExtremeNightAcknowledgement, buildMorningProcedureInterestOpening } from './extreme-night-policy.mjs';
import { buildAppointmentPreferenceCollectionReply } from './appointment-suggestions.mjs';
import { applyFirstReplyGreetingGuard, runOpenAIShadow } from './openai-shadow.mjs';

// Synthetic profiles only. No patient identity or external effects.
const businessProfiles = ['Imoveis', 'IMÓVEIS', 'Imo\u0301veis', '🏡 Imóveis', 'Imóveis 🏠', 'Helena Imóveis', 'Corretora', 'Helena Corretora', 'Consultoria', 'Seguros', 'Construções', 'Engenharia', 'Transportes', 'Confeitaria', 'Cosméticos'];

test('commercial profiles remain unnamed across case, accent and decorations', () => {
  for (const profileName of businessProfiles) {
    assert.equal(usableProfileName(profileName), '', profileName);
    assert.equal(usableProfileFirstName(profileName), '', profileName);
    assert.equal(resolveContactIdentity({ profileName }).nameSource, 'unknown', profileName);
  }
});

test('a generic first contact introduces Bruna and asks only how to address the person', () => {
  const body = buildMarketingPrefilledOpeningReply({ patientName:'Imóveis', procedure:'lifting_cervical', introduceBruna:true, conversionExperienceEnabled:true });
  assert.match(body, /^Olá! Eu sou a Bruna/);
  assert.match(body, /cervicoplastia/);
  assert.match(body, /Como posso te chamar\?/);
  assert.equal((body.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(body, /Im[oó]veis/i);
});

test('a price question is answered without a commercial vocative or mandatory name collection', () => {
  const body = buildSurgicalPriceSuggestedReply({ patientName:'Imoveis', procedure:'lifting_cervical', currentText:'Qual o valor do lifting cervical?', directToPatient:true, introduceBruna:false, offerNextStep:false });
  assert.match(body, /^Claro\./);
  assert.match(body, /R\$ 18 mil e R\$ 26 mil/);
  assert.match(body, /orçamento fechado/);
  assert.doesNotMatch(body, /Im[oó]veis|Como posso te chamar|seu nome/i);
});

test('coordination after human care uses the shared name policy', () => {
  for (const patientName of businessProfiles) {
    assert.equal(buildSimpleCoordinationReply({kind:'send_exams_later',patientName}), 'Perfeito. Pode nos enviar os exames quando conseguir.');
  }
  assert.match(buildSimpleCoordinationReply({kind:'send_exams_later',patientName:'Helena'}), /^Perfeito, Helena\./);
});

test('night, morning and appointment copy retain neutral greetings', () => {
  const args={patientName:'Imóveis',procedure:'lifting_cervical',currentText:'Quero saber sobre lifting cervical'};
  for (const body of [buildExtremeNightAcknowledgement(args),buildMorningProcedureInterestOpening(args),buildAppointmentPreferenceCollectionReply(args)]) {
    assert.ok(body);
    assert.doesNotMatch(body,/Im[oó]veis/i);
  }
});

test('a self-declared personal name overrides a business profile, without changing clinical identity', () => {
  const identity=resolveContactIdentity({profileName:'Imóveis',currentText:'Me chamo Helena. Quero saber sobre a consulta.'});
  assert.equal(identity.name,'Helena');
  assert.equal(identity.nameSource,'self_declared');
  assert.equal(usableKnownPatientName('Maria das Graças de Souza Lima'),'Maria das Graças de Souza Lima');
  for (const profileName of ['Íris','João','Cris','ANA','D\u2019Ávila','Conceição','Maria das Graças','Helena 🥰']) assert.ok(usableProfileName(profileName),profileName);
  assert.equal(resolveContactIdentity({profileName:'Imóveis',currentText:'Sou corretora e gostaria de uma consulta'}).name,'');
});

test('the first semantic reply keeps an existing question instead of adding name collection', () => {
  const result=applyFirstReplyGreetingGuard({route:'standard_reply',suggestedReply:'Posso te orientar sobre cervicoplastia. Qual é sua principal dúvida?'},{patientProfileName:'Imóveis',recentConversation:[]});
  assert.match(result.suggestedReply,/^Olá! Eu sou a Bruna/);
  assert.doesNotMatch(result.suggestedReply,/Im[oó]veis|Como posso te chamar/i);
  assert.equal((result.suggestedReply.match(/\?/g)||[]).length,1);
});

test('semantic input does not expose the business profile as an approved personal name', async () => {
  let input;
  await runOpenAIShadow({phone:'synthetic-contact',text:'Qual o valor da consulta?',patientProfileName:'Imóveis',recentConversation:[]}, {
    env:{OPENAI_API_KEY:'synthetic-key'},
    fetchImpl:async(_url,options)=>{input=JSON.parse(JSON.parse(options.body).input);return new Response('{}',{status:429});},
  });
  assert.equal(input.whatsappProfileName,'');
});
