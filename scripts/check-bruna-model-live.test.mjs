import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBrunaModelLive } from './check-bruna-model-live.mjs';

const manifest = { pendingRelease: { liveModelCheckRequired: true } };
const env = { NETLIFY: 'true', CONTEXT: 'production', OPENAI_API_KEY: 'synthetic-secret-not-for-logs' };
test('unmarked and non-production builds never consume the API', async () => {
  for (const options of [{ env: {}, manifest }, { env: { ...env, CONTEXT: 'deploy-preview' }, manifest }, { env, manifest: {} }]) {
    const result = await checkBrunaModelLive({ ...options, fetchImpl: () => { throw new Error('Unexpected API request'); } });
    assert.equal(result.status, 'skipped');
  }
});
test('missing and masked production secrets fail before network access', async () => {
  for (const key of ['', '****************abcd']) {
    const result = await checkBrunaModelLive({ env: { ...env, OPENAI_API_KEY: key }, manifest, fetchImpl: () => { throw new Error('Unexpected API request'); } });
    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'production_key_unavailable');
  }
});
test('provider authentication failure blocks deployment without leaking error text or credentials', async () => {
  let calls = 0;
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (url, request) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(JSON.parse(request.body).model, 'gpt-6.1-sol');
    return new Response(JSON.stringify({ error: { code: 'invalid_api_key', message: env.OPENAI_API_KEY } }), { status: 401 });
  } });
  assert.equal(result.status, 'failed'); assert.equal(calls, 1);
  assert.equal(result.results[0].requests[0].errorCode, 'invalid_api_key');
  assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY), false);
});
test('incomplete model output blocks the build instead of accepting HTTP success', async () => {
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async () => new Response(JSON.stringify({ model: 'gpt-6.1-sol', status: 'incomplete', output_text: '{}' })) });
  assert.equal(result.status, 'failed');
  assert.equal(result.results[0].errorCode, 'incomplete_response');
});

test('all five synthetic scenarios use the real adapters and pass the outbound protections', async () => {
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (url, request) => {
    const body = JSON.parse(request.body), input = JSON.parse(body.input);
    let decision;
    if (body.text.format.name === 'scheduled_followup_context_review') {
      assert.match(input.recentConversation.at(-1).text, /não receber/);
      decision = { decision: 'cancel_for_review', reasonCode: 'patient_paused', confidence: 'high' };
    } else if (body.text.format.name === 'liv_whatsapp_shadow_decision') {
      const hints = input.policyHints;
      const urgent = !hints?.deterministicReplyCode;
      if (!urgent) assert.ok(hints.deterministicReplyPreview.length > 30);
      decision = { route: urgent ? 'human_review' : 'standard_reply', confidence: 'high', automaticAllowed: !urgent,
        urgent, professional: 'amanda', procedure: input.procedureContext || 'unknown', replyCode: hints?.deterministicReplyCode || '',
        replyWording: 'contextual', suggestedReply: hints?.deterministicReplyCode === 'AMANDA-CONSULTA-INFO-01'
          ? 'A consulta presencial com a Dra. Amanda custa R$ 500. Você pode esclarecer suas dúvidas sem precisar decidir pela cirurgia agora.'
          : hints?.deterministicReplyPreview || '', reviewReason: urgent ? 'possible_urgent_symptoms' : '',
        conversationState: { activeTopic: 'consulta', patientAct: 'question', refersToEventId: '', lastClinicQuestion: '', lastClinicOffer: '',
          unresolvedQuestions: [], factsAlreadyProvided: [], owner: 'bruna', nextExpectedAction: 'aguardar', ambiguity: '', contextConfidence: 'high' } };
    } else {
      decision = { recommendedStatus: 'Novo', confidence: 'high', professional: 'amanda', procedure: 'unknown', summary: 'Dúvida sobre avaliação.',
        nextAction: 'Aguardar paciente.', expectedParty: 'patient', commercialReason: 'Em andamento', evidence: 'Pergunta informativa.', appointmentOutcome: 'none', procedureMilestone: 'none' };
    }
    return new Response(JSON.stringify({ model: 'gpt-6.1-sol', status: 'completed', output_text: JSON.stringify(decision) }));
  } });
  assert.equal(result.status, 'passed', JSON.stringify(result));
  assert.equal(result.results.length, 5);
  assert.equal(result.patientMessagesSent, 0);
});
