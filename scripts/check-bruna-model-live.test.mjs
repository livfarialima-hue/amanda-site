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
test('conversation failure still collects audio confidence without allowing deployment', async () => {
  for (const logprob of [-0.1, 0.01]) {
    const destinations = [];
    let audioIndex = 0;
    const result = await checkBrunaModelLive({ env,
      manifest: { pendingRelease: { liveModelCheckRequired: true, audioTranscriptionCheckRequired: true } },
      fetchImpl: async (url) => {
        destinations.push(url);
        if (url === 'https://api.openai.com/v1/responses') {
          return Response.json({ status: 'incomplete', model: 'gpt-6.1-sol' });
        }
        assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
        const texts = audioIndex++ === 0 ? ['Qual é o endereço da Clínica LIV?'] :
          audioIndex === 2 ? ['Não desejo agendar uma consulta agora. Depois das quinze horas.', 'Meu nome é Elisa. Não procure horários.',
            'A equipe já confirmou que o documento foi enviado, então essa parte está resolvida.'] : [];
        return Response.json({ text: texts.join(' '), segments: texts.map(text =>
          ({ text, avg_logprob: logprob, no_speech_prob: 0.01, compression_ratio: 1.2 })) });
      },
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.results[0].passed, false);
    assert.deepEqual(destinations, ['https://api.openai.com/v1/responses', ...Array(3).fill('https://api.openai.com/v1/audio/transcriptions')]);
    assert.equal(result.audioCheck.status, logprob <= 0 ? 'passed' : 'failed');
    assert.equal(result.audioCheck.checks[0].quality.fieldsValid, logprob <= 0);
    assert.equal(result.patientMessagesSent, 0);
    assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY), false);
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

test('successful synthetic timeout measurement never converts a failed runtime gate into a pass', async () => {
  const calls = [];
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (url, request) => {
    calls.push({url, request});
    if (calls.length === 1) throw Object.assign(new Error('synthetic abort'), { name: 'AbortError' });
    return Response.json({ model: 'gpt-6.1-sol', status: 'completed', usage: {output_tokens: 700}, output_text: JSON.stringify({suggestedReply: env.OPENAI_API_KEY}) });
  }});
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, calls[0].url);
  assert.equal(calls[1].request.body, calls[0].request.body);
  assert.notEqual(calls[1].request.signal, calls[0].request.signal);
  assert.equal(result.status, 'failed');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].passed, false);
  assert.equal(result.results[0].timeoutMs, 20000);
  assert.equal(result.results[0].requests.length, 0);
  assert.equal(result.results[0].timeoutDiagnostic.diagnosticOnly, true);
  assert.equal(result.results[0].timeoutDiagnostic.deadlineMs, 45000);
  assert.equal(result.results[0].timeoutDiagnostic.status, 'completed');
  assert.equal(result.results[0].timeoutDiagnostic.usage.output_tokens, 700);
  assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY), false);
  assert.equal(result.patientMessagesSent, 0);
});

test('synthetic timeout diagnostics suppress provider errors and do not retry again', async () => {
  let calls = 0;
  const result = await checkBrunaModelLive({env,manifest,fetchImpl:async()=>{
    calls++;
    throw Object.assign(new Error(env.OPENAI_API_KEY),{name:calls === 1 ? 'AbortError' : 'Error'});
  }});
  assert.equal(calls,2);
  assert.equal(result.status,'failed');
  assert.equal(result.results[0].timeoutDiagnostic.errorCode,'diagnostic_request_failed');
  assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY),false);
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
      const resolved = /recebi o documento/.test(input.currentMessage);
      const remote = /Moro no exterior/.test(input.currentMessage) || ['E qual o valor da consulta?', 'Quanto custa?'].includes(input.currentMessage);
      if (hints?.deterministicReplyCode) assert.ok(hints.deterministicReplyPreview.length > 30);
      if (input.currentMessage.includes('comprovante fiscal')) assert.equal(input.approvedKnowledge[0].id, 'SYNTHETIC-INVOICE');
      if (input.currentMessage.includes('levar para a primeira consulta')) assert.ok(input.approvedClinicalFacts.topics.includes('consultation_preparation'));
      if (!urgent && !unknown && !resolved) {
        assert.equal(input.replyContract.allowedResponseKind, 'direct_answer');
        assert.equal(input.replyContract.owner, 'bruna');
        if (hints?.deterministicReplyCode) assert.notEqual(input.replyContract.risk, 'red');
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
      if (unknown) decision.partialAnswer = { knowledgeIds: ['SYNTHETIC-PARKING'], pendingQuestion: 'Qual equipamento específico é usado?' };
      if (remote) Object.assign(decision,{route:'standard_reply',automaticAllowed:true,replyCode:'',reviewReason:'',suggestedReply:'A Dra. Amanda atende por consulta online, inclusive quem está no exterior. A teleconsulta custa R$ 500. O orçamento individual da cirurgia depende da avaliação.'});
      if (input.currentMessage.includes('comprovante fiscal')) Object.assign(decision, { replyCode: 'KB:SYNTHETIC-INVOICE', suggestedReply: 'Sim, emitimos nota fiscal da consulta.' });
      if (input.currentMessage.includes('levar para a primeira consulta')) decision.suggestedReply = 'Leve os exames que já tiver e suas dúvidas.';
      if (input.currentMessage.includes('nome que pedi no início')) {
        assert.equal(input.fullConversation.turns.length, 80);
        assert.match(input.fullConversation.turns[0].text, /chame de Elisa/);
        decision.suggestedReply = `Elisa, ${decision.suggestedReply}`;
      }
      if (resolved) {
        assert.match(input.fullConversation.turns.at(-1).text, /Está resolvido/);
        Object.assign(decision, { route: 'ignore', automaticAllowed: false, suggestedReply: '' });
      }
      if (input.replyContract.unresolvedIntents.includes('photo_assessment_request')) {
        decision.suggestedReply = `Helena, entendi suas dúvidas sobre as bochechas e as linhas perto da boca. As fotos ajudam a contextualizar sua dúvida; a indicação e o orçamento individual são definidos na consulta.\n\n${hints.deterministicReplyPreview}`;
      }
    } else {
      decision = { recommendedStatus: 'Novo', confidence: 'high', professional: 'amanda', procedure: 'unknown', summary: 'Dúvida sobre avaliação.',
        nextAction: 'Aguardar paciente.', expectedParty: 'patient', commercialReason: 'Em andamento', evidence: 'Pergunta informativa.', appointmentOutcome: 'none', procedureMilestone: 'none' };
    }
    return new Response(JSON.stringify({ model: 'gpt-6.1-sol', status: 'completed', output_text: JSON.stringify(decision) }));
}

test('all eighteen synthetic scenarios use the real adapters and pass the outbound protections', async () => {
  const fixtureErrors = [];
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (...args) => {
    try { return await syntheticResponse(...args); } catch (error) { fixtureErrors.push(error.message); throw error; }
  } });
  assert.deepEqual(fixtureErrors, []);
  assert.equal(result.status, 'passed', JSON.stringify(result));
  assert.equal(result.results.length, 18);
  assert.deepEqual(result.results.map(r => r.timeoutMs), [...Array(16).fill(20000), 15000, 12000]);
  assert.equal(result.maxOutputTokens, 4096);
  assert.equal(result.verbosity, 'low');
  assert.equal(result.patientMessagesSent, 0);
  assert.match(result.results.find(r=>r.name==='consultation_contextual').requests[0].syntheticDraft, /consulta presencial/);
  assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY), false);
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

test('remote live gate rejects denied availability, obsolete holding, invented booking and wrong professional',async()=>{
  for(const patch of [
    {suggestedReply:'A Dra. Amanda não atende por consulta online, inclusive quem está no exterior.'},
    {suggestedReply:'A teleconsulta não está disponível para quem está no exterior.'},
    {suggestedReply:'Não é possível fazer consulta online, inclusive para quem está no exterior.'},
    {route:'human_review',automaticAllowed:false,replyCode:'UNKNOWN-REVIEW-01',suggestedReply:'Vou confirmar a possibilidade de avaliação online.'},
    {suggestedReply:'A consulta online já está confirmada para amanhã.'},
    {professional:'daniel'},
  ]) {
    const result=await checkBrunaModelLive({env,manifest,fetchImpl:async(url,request)=>{
      const data=await(await syntheticResponse(url,request)).json();
      const decision=JSON.parse(data.output_text);Object.assign(decision,patch);data.output_text=JSON.stringify(decision);return Response.json(data);
    }});
    assert.equal(result.status,'failed');assert.equal(result.results[0].passed,false);
  }
});

test('administrative knowledge accepts an empty unspecified procedure from the real model', async () => {
  const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (url, request) => {
    const data = await (await syntheticResponse(url, request)).json();
    const input = JSON.parse(JSON.parse(request.body).input);
    if (input.currentMessage?.includes('comprovante fiscal')) {
      const decision = JSON.parse(data.output_text);
      Object.assign(decision, { procedure: '', professional: 'unknown' });
      data.output_text = JSON.stringify(decision);
    }
    return Response.json(data);
  } });
  assert.equal(result.status, 'passed');
  assert.equal(result.results.length, 18);
  assert.equal(result.results.find(r => r.name === 'semantic_approved_knowledge').passed, true);
  assert.equal(result.patientMessagesSent, 0);
});

test('remote live gate accepts legitimate budget and availability boundaries beside the confirmed modality',async()=>{
  for(const boundary of [
    'Não podemos fechar o orçamento individual antes da consulta online.',
    'Não temos horários confirmados para a teleconsulta.',
  ]) {
    const result=await checkBrunaModelLive({env,manifest,fetchImpl:async(url,request)=>{
      const data=await(await syntheticResponse(url,request)).json();
      const input=JSON.parse(JSON.parse(request.body).input);
      if(input.currentMessage?.includes('Moro no exterior')) {
        const decision=JSON.parse(data.output_text);
        decision.suggestedReply=`A Dra. Amanda atende por consulta online, inclusive quem está no exterior. ${boundary}`;
        data.output_text=JSON.stringify(decision);
      }
      return Response.json(data);
    }});
    assert.equal(result.status,'passed');
    assert.equal(result.results.length,18);
    assert.equal(result.patientMessagesSent,0);
  }
});

test('procedure equivalence never accepts an invented procedure or drops a known correction', async () => {
  for (const [messageFragment, replacement, failingScenario] of [
    ['comprovante fiscal', 'lifting_facial', 'semantic_approved_knowledge'],
    ['Na verdade não quero lifting', '', 'corrected_procedure'],
  ]) {
    const result = await checkBrunaModelLive({ env, manifest, fetchImpl: async (url, request) => {
      const data = await (await syntheticResponse(url, request)).json();
      const input = JSON.parse(JSON.parse(request.body).input);
      if (input.currentMessage?.includes(messageFragment)) {
        const decision = JSON.parse(data.output_text);
        decision.procedure = replacement;
        data.output_text = JSON.stringify(decision);
      }
      return Response.json(data);
    } });
    assert.equal(result.status, 'failed');
    assert.equal(result.results.at(-1).name, failingScenario);
    assert.equal(result.results.at(-1).passed, false);
  }
});
for (const failure of ['drops_concerns', 'drops_photo_boundary', 'semantic_veto']) {
  test(`the release probe rejects a deficient price/photo response: ${failure}`,async()=>{
    const result=await checkBrunaModelLive({env,manifest,fetchImpl:async(url,request)=>{
      const response=await syntheticResponse(url,request), data=await response.json();
      const input=JSON.parse(JSON.parse(request.body).input);
      if(input.replyContract?.unresolvedIntents?.includes('photo_assessment_request')) {
        const decision=JSON.parse(data.output_text);
        if(failure==='drops_concerns')decision.suggestedReply=input.policyHints.deterministicReplyPreview;
        if(failure==='drops_photo_boundary')decision.suggestedReply=decision.suggestedReply.replace(/As fotos[^.]+\./, '');
        if(failure==='semantic_veto')Object.assign(decision,{route:'human_review',automaticAllowed:false});
        data.output_text=JSON.stringify(decision);
      }
      return Response.json(data);
    }});
    assert.equal(result.status,'failed');
    assert.equal(result.results.at(-1).name,'approved_price_with_photo_request');
    assert.equal(result.patientMessagesSent,0);
  });
}
