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

async function syntheticResponse(url, request) {
    const body = JSON.parse(request.body), input = JSON.parse(body.input);
    let decision;
    if (body.text.format.name === 'scheduled_followup_context_review') {
      assert.match(input.recentConversation.at(-1).text, /não receber/);
      decision = { decision: 'cancel_for_review', reasonCode: 'patient_paused', confidence: 'high' };
    } else if (body.text.format.name === 'liv_whatsapp_shadow_decision') {
      const hints = input.policyHints;
      const unknown = /equipamento específico/.test(input.currentMessage);
      const urgent = /falta de ar/.test(input.currentMessage);
      if (!urgent && !unknown) assert.ok(hints.deterministicReplyPreview.length > 30);
      if (!urgent && !unknown) {
        assert.equal(input.replyContract.allowedResponseKind, 'direct_answer');
        assert.equal(input.replyContract.owner, 'bruna');
        assert.notEqual(input.replyContract.risk, 'red');
      }
      if (hints?.deterministicReplyCode === 'AMANDA-CONSULTA-INFO-01' && input.replyContract.consultationNextStep === 'answer_only') {
        assert.doesNotMatch(hints.deterministicReplyPreview, /horário|agenda/i, 'the preview must honor the answer-only consultation contract');
      }
      assert.equal(input.currentTemplateId, '');
      decision = { route: urgent || unknown ? 'human_review' : 'standard_reply', confidence: 'high', automaticAllowed: !urgent && !unknown,
        urgent, professional: 'amanda', procedure: input.procedureContext || 'unknown', replyCode: unknown ? 'UNKNOWN-REVIEW-01' : hints?.deterministicReplyCode || '',
        replyWording: 'contextual', suggestedReply: hints?.deterministicReplyCode === 'AMANDA-CONSULTA-INFO-01'
          ? 'A consulta presencial com a Dra. Amanda custa R$ 500. Você pode esclarecer suas dúvidas sem precisar decidir pela cirurgia agora.'
          : hints?.deterministicReplyPreview || '', reviewReason: unknown ? 'unknown_digest:equipamento_lifting' : urgent ? 'possible_urgent_symptoms' : '',
        conversationState: { activeTopic: 'consulta', patientAct: 'question', refersToEventId: '', lastClinicQuestion: '', lastClinicOffer: '',
          unresolvedQuestions: unknown ? ['Qual equipamento específico é usado?'] : [], factsAlreadyProvided: [], owner: unknown ? 'human_team' : 'bruna', nextExpectedAction: unknown ? 'Equipe confirmar equipamento' : 'aguardar', ambiguity: '', contextConfidence: 'high' } };
    } else {
      decision = { recommendedStatus: 'Novo', confidence: 'high', professional: 'amanda', procedure: 'unknown', summary: 'Dúvida sobre avaliação.',
        nextAction: 'Aguardar paciente.', expectedParty: 'patient', commercialReason: 'Em andamento', evidence: 'Pergunta informativa.', appointmentOutcome: 'none', procedureMilestone: 'none' };
    }
    return new Response(JSON.stringify({ model: 'gpt-6.1-sol', status: 'completed', output_text: JSON.stringify(decision) }));
}

test('all nine synthetic scenarios use the real adapters and pass the outbound protections', async () => {
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: syntheticResponse });
  assert.equal(result.status, 'passed', JSON.stringify(result));
  assert.equal(result.results.length, 9);
  assert.deepEqual(result.results.map(r => r.timeoutMs), [20000, 20000, 20000, 20000, 20000, 20000, 20000, 15000, 12000]);
  assert.equal(result.maxOutputTokens, 4096);
  assert.equal(result.verbosity, 'low');
  assert.equal(result.patientMessagesSent, 0);
});

test('a partial known answer cannot make the live quality gate accept an unresolved clinic fact', async () => {
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (url, request) => {
    const response = await syntheticResponse(url, request);
    const data = await response.json();
    const input = JSON.parse(JSON.parse(request.body).input);
    if (input.currentMessage?.includes('equipamento específico')) {
      const decision = JSON.parse(data.output_text);
      Object.assign(decision, { route: 'standard_reply', automaticAllowed: true, replyCode: 'KB:SYNTHETIC-PARKING', suggestedReply: 'Há estacionamento no local.', reviewReason: '' });
      data.output_text = JSON.stringify(decision);
    }
    return Response.json(data);
  } });
  assert.equal(result.status, 'failed');
  assert.equal(result.results.at(-1).name, 'unknown_clinic_fact');
  assert.equal(result.results.at(-1).passed, false);
  assert.equal(result.patientMessagesSent, 0);
});
