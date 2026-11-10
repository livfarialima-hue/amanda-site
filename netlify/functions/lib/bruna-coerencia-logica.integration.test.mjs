import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAutomationIdentityGuard } from './openai-shadow.mjs';
import { buildDelayedHumanReceipt } from './human-resume-policy.mjs';
import { reusablePriceCommitment } from './patient-relationship.mjs';
import webhook from '../ycloud-webhook.mjs';

test('truthful virtual identity is allowed; impersonation is blocked', () => {
  const reply = text => ({route:'standard_reply', automaticAllowed:true, suggestedReply:text});
  assert.equal(applyAutomationIdentityGuard(reply('Sou a Bruna, assistente virtual da Clínica LIV.')).route,'standard_reply');
  for (const text of ['Sou uma pessoa de verdade.', 'Não sou um robô.', 'Sou a médica responsável.']) {
    assert.equal(applyAutomationIdentityGuard(reply(text)).route,'human_review');
  }
});

test('unread media cannot attest receipt of material or team notification', () => {
  assert.equal(buildDelayedHumanReceipt({text:'[Áudio recebido; transcrição em andamento.]',messageType:'audio'}),'');
});

test('health reports the bundled versions despite stale environment values', async t => {
  const old=process.env.BRUNA_POLICY_VERSION; process.env.BRUNA_POLICY_VERSION='stale';
  t.after(()=>{if(old===undefined)delete process.env.BRUNA_POLICY_VERSION;else process.env.BRUNA_POLICY_VERSION=old;});
  const manifest=JSON.parse(readFileSync(new URL('./bruna-policy/manifest.json',import.meta.url)));
  const r=await (await webhook(new Request('https://example.test/api/ycloud/webhook'))).json();
  assert.equal(r.policyVersion,manifest.bundleVersion);
  assert.equal(r.promptVersion,manifest.promptVersion);
  assert.equal(r.knowledgeSnapshot,manifest.knowledgeSnapshot);
});

test('a correlated price fragment reuses only its exact unresolved obligation', () => {
  const pending={eventId:'synthetic-origin',requestId:'synthetic-origin',kind:'procedure_price',status:'pending',opportunityId:'synthetic-op',professional:'amanda',dueAt:'2026-11-10T20:00:00Z'};
  const input={text:'Inferior e superior?',procedure:'blefaroplastia',opportunityId:'synthetic-op',professional:'amanda',pendingCommitments:[pending],
    decision:{route:'human_review',confidence:'high',urgent:false,professional:'amanda',procedure:'blefaroplastia',conversationState:{contextConfidence:'high',ambiguity:'',refersToEventId:'synthetic-origin',patientAct:'question'}},
    recentConversation:[{eventId:'synthetic-origin',source:'patient',role:'user',text:'Qual o valor da blefaroplastia?'}]};
  assert.equal(reusablePriceCommitment(input),pending);
  for(const patch of [{text:'E quanto tempo dura a recuperação?'},{professional:'daniel'},{opportunityId:'another-op'},{pendingCommitments:[pending,{...pending,eventId:'another'}]},{decision:{...input.decision,urgent:true}},{recentConversation:[]}]) {
    assert.equal(reusablePriceCommitment({...input,...patch}),null);
  }
});
