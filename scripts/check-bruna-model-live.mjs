import fs from 'node:fs';
import { checkBrunaAudioLive } from './check-bruna-audio-live.mjs';
import { pathToFileURL } from 'node:url';
import { runOpenAIShadow } from '../netlify/functions/lib/openai-shadow.mjs';
import { runLeadClassifier } from '../netlify/functions/lib/lead-classifier.mjs';
import { reviewScheduledFollowupContext } from '../netlify/functions/lib/scheduled-followup-context-review.mjs';
import { buildConsultationInformationReply, buildAdministrativeSideAnswer } from '../netlify/functions/lib/patient-replies.mjs';
import { approvedPartialAnswer } from '../netlify/functions/lib/knowledge-learning.mjs';
import { buildLiftingFacialInformationReply } from '../netlify/functions/lib/lifting-information.mjs';
import { selectConfirmedReplyText, semanticDecisionConfirmsDeterministicReply, deterministicReplyCoversPatientQuestions } from '../netlify/functions/lib/semantic-reply-policy.mjs';
import { buildSurgicalPriceSuggestedReply } from '../netlify/functions/lib/surgical-price-review.mjs';
import { enrichAutomationPlanFromConversation, planAutomation } from '../netlify/functions/lib/whatsapp-automation.mjs';
import { validateOutboundReply } from '../netlify/functions/lib/outbound-reply-gate.mjs';
import { decideConversationAction } from '../netlify/functions/lib/conversation-action-controller.mjs';
import {
  BRUNA_MODEL, BRUNA_REASONING_EFFORT, BRUNA_MAX_OUTPUT_TOKENS, BRUNA_TEXT_VERBOSITY,
  BRUNA_CONVERSATION_TIMEOUT_MS, BRUNA_CLASSIFICATION_TIMEOUT_MS, BRUNA_FOLLOWUP_REVIEW_TIMEOUT_MS,
} from '../netlify/functions/lib/bruna-model-config.mjs';

// Run only during an explicitly marked release, inside the hosted production
// build. Netlify injects the secret; it never leaves the runtime except as the
// Authorization header sent to the existing OpenAI endpoint.
export async function checkBrunaModelLive({ env = process.env, manifest, fetchImpl = fetch } = {}) {
  if (env.NETLIFY !== 'true' || env.CONTEXT !== 'production' || manifest?.pendingRelease?.liveModelCheckRequired !== true) {
    return { status: 'skipped', reason: 'not_a_marked_hosted_production_release' };
  }
  if (!env.OPENAI_API_KEY || /\*{3,}|•{3,}/u.test(env.OPENAI_API_KEY)) {
    return { status: 'failed', reason: 'production_key_unavailable' };
  }
  const adapterEnv = { OPENAI_API_KEY: env.OPENAI_API_KEY, BRUNA_CONVERSION_EXPERIENCE_V1: 'enabled', WHATSAPP_FULL_HISTORY_ENABLED: 'true', CONTEXT: 'production' };
  const history = [
    { direction: 'IN', role: 'user', text: 'Gostaria de entender a avaliação.', at: '2026-10-11T13:00:00Z' },
    { direction: 'OUT', role: 'assistant', source: 'bruna', text: 'A avaliação é individual. O que você gostaria de esclarecer?', at: '2026-10-11T13:01:00Z' },
  ];
  const longHistory = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', source: i % 2 ? 'human' : 'patient',
    text: i === 0 ? 'Meu nome no perfil é Helena, mas me chame de Elisa, por favor.' : i === 1 ? 'Claro, Elisa.' :
      i % 2 ? 'Entendido.' : `Estou apenas pesquisando e organizando minhas dúvidas, etapa ${i}.`,
    eventId: `synthetic-long-${i}`, at: new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString() }));
  const scenarios = [
    { name: 'consultation_contextual', text: 'Quanto custa a consulta com a Dra. Amanda? Ainda estou só pesquisando.', procedure: 'unknown', code: 'AMANDA-CONSULTA-INFO-01', reason: 'consultation_information_request' },
    { name: 'lifting_information', text: 'Onde ficam as cicatrizes do lifting facial?', procedure: 'lifting_facial', code: 'LIFTING-FACIAL-INFORMATION-01', reason: 'lifting_facial_information_request' },
    { name: 'personal_question_with_reference', text: 'Quanto custa a consulta? Ref. G26LIFT. Ainda estou pesquisando.', procedure: 'lifting_facial', code: 'AMANDA-CONSULTA-INFO-01', reason: 'consultation_information_request',
      recentConversation: [{ role: 'user', source: 'patient', text: 'Quero entender a avaliação.', templateId: 'procedure_evaluation_v1' }, history[1]] },
    { name: 'accepted_information_offer', text: 'Pode sim. Não quero ver horários agora.', procedure: 'lifting_facial', code: 'AMANDA-CONSULTA-INFO-01', reason: 'consultation_information_request',
      recentConversation: [history[0], { role: 'assistant', source: 'bruna', text: 'Posso te passar o valor da consulta presencial?', eventId: 'synthetic-consultation-offer' }] },
    { name: 'corrected_procedure', text: 'Na verdade não quero lifting facial, quero otoplastia. Quanto custa a consulta? Ainda estou pesquisando.', procedure: 'otoplastia', code: 'AMANDA-CONSULTA-INFO-01', reason: 'consultation_information_request',
      previousConversationState: { activeTopic: 'lifting facial', patientAct: 'question', refersToEventId: '', lastClinicQuestion: '', lastClinicOffer: '', unresolvedQuestions: [], factsAlreadyProvided: [], owner: 'bruna', nextExpectedAction: 'explicar lifting', ambiguity: '', contextConfidence: 'high' } },
    { name: 'unknown_clinic_fact', text: 'Tem estacionamento? E qual equipamento específico a médica usa nessa técnica?', procedure: 'lifting_facial', review: true,
      learningContext: { candidates: [{ id: 'SYNTHETIC-PARKING', subject: 'Estacionamento', answer: 'Há estacionamento no local.', mode: 'Automática', risk: 'Baixo', boundaries: 'Somente estacionamento; não cobre equipamento, técnica ou atendimento clínico.' }] } },
    { name: 'semantic_approved_knowledge', text: 'Vocês fornecem o comprovante fiscal da avaliação?', procedure: 'unknown', code: 'KB:SYNTHETIC-INVOICE', knowledge: true,
      learningContext: { candidates: [{ id: 'SYNTHETIC-INVOICE', subject: 'Nota fiscal', answer: 'Emitimos nota fiscal da consulta.', mode: 'Automática', risk: 'Baixo', boundaries: 'Somente emissão de nota; não confirmar reembolso, cobertura ou benefício fiscal.' }] } },
    { name: 'human_clinical_task_administrative_question', text: 'Pode me passar o endereço?', procedure: 'unknown', code: 'ADMIN-SIDE-LOCATION-01', reason: 'administrative_side_question', administrative: true,
      patientRelationship: { state: 'active_postop', professional: 'amanda', hasPendingHumanTask: true },
      recentConversation: [{ role: 'assistant', source: 'human', text: 'A médica vai conferir sua dúvida clínica e responder por aqui.' }] },
    { name: 'consultation_preparation', text: 'O que devo levar para a primeira consulta?', procedure: 'unknown', educational: true },
    { name: 'clinical_urgency', text: 'Estou no pós-operatório e com falta de ar agora.', procedure: 'unknown', urgent: true },
    { name: 'approved_price_with_photo_request', text: 'Sou Helena. Gostaria de informações de lifting facial; tenho flacidez nas bochechas e linhas perto da boca. Vou mandar fotos minhas para avaliar e ter um orçamento. Estou planejando os gastos.', procedure: 'lifting_facial', code: 'LIFTING-PRICE-RANGE-01', priceWithPhotos: true },
    { name: 'full_history_name_correction', text: 'Pode usar o nome que pedi no início e me dizer quanto custa a consulta presencial? Ainda estou pesquisando.', procedure: 'unknown', code: 'AMANDA-CONSULTA-INFO-01', reason: 'consultation_information_request',
      fullHistory: longHistory, recentConversation: longHistory.slice(-32), fullHistoryName: true },
    { name: 'full_history_resolved_human_task', text: 'Obrigada, recebi o documento. Era só isso.', procedure: 'unknown', fullHistoryResolved: true,
      recentConversation: longHistory.slice(-32), fullHistory: [...longHistory, { role: 'assistant', source: 'human', text: 'O documento solicitado já foi enviado por e-mail. Está resolvido.', eventId: 'synthetic-resolved', at: '2026-10-13T13:00:00Z' }] },
    { name: 'classification', classification: true },
    { name: 'followup_declined', followup: true },
  ];
  const results = [];
  for (const scenario of scenarios) {
    const scenarioHistory = scenario.recentConversation || history;
    const requests = [];
    const startedAt = Date.now();
    const auditedFetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (url !== 'https://api.openai.com/v1/responses' || body.model !== BRUNA_MODEL || body.reasoning?.effort !== BRUNA_REASONING_EFFORT || body.store !== false ||
          body.max_output_tokens !== BRUNA_MAX_OUTPUT_TOKENS || body.text?.verbosity !== BRUNA_TEXT_VERBOSITY) {
        throw new Error('model_request_contract_mismatch');
      }
      const start = Date.now();
      const response = await fetchImpl(url, options);
      const data = await response.clone().json();
      // Never log headers, credentials, or provider error text (which can echo a key).
      let syntheticDraft;
      if (response.ok && data.status === 'completed') {
        try {
          const output = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
          const draft = JSON.parse(output).suggestedReply;
          if (typeof draft === 'string') syntheticDraft = draft.slice(0, 4000).replaceAll(env.OPENAI_API_KEY, '[redacted]');
        } catch { /* A malformed response still fails in the real adapter. */ }
      }
      requests.push({ httpStatus: response.status, elapsedMs: Date.now() - start, model: data.model,
        status: data.status, usage: data.usage, errorCode: data.error?.code, syntheticDraft });
      return response;
    };
    // Synthetic source only: the hosted gate must never query a real patient's
    // ledger or send a WhatsApp message while exercising full-history loading.
    const options = { env: adapterEnv, fetchImpl: auditedFetch, getDurableConversationContextImpl: async () => ({
      status: 'completed', historyMode: 'full', turns: scenario.fullHistory || scenarioHistory,
      coverage: { availableTurns: (scenario.fullHistory || scenarioHistory).length, omittedTurns: 0 },
    }) };
    let result, selectedReply, gate;
    if (scenario.classification) {
      result = await runLeadClassifier({ phone: '+5511900000000', currentStatus: 'Novo', currentProfessional: 'amanda', messages: history }, options);
    } else if (scenario.followup) {
      result = await reviewScheduledFollowupContext({ patientPhone: '+5511900000000', body: 'Ficou alguma dúvida sobre a avaliação?', humanApproved: true,
        recentConversation: [...history, { direction: 'IN', role: 'user', text: 'Prefiro não receber mais mensagens.', at: '2026-10-11T13:02:00Z' }] }, options);
    } else {
      // Reuse the actual owner of the reply contract. A hand-written partial
      // contract normalizes to risk=red/allowedResponseKind=none in the adapter.
      const plan = scenario.priceWithPhotos ? enrichAutomationPlanFromConversation(planAutomation({text:scenario.text,messageType:'text'}),scenarioHistory) :
        { route: scenario.fullHistoryResolved ? 'ignore' : scenario.urgent || scenario.review ? 'human_review' : 'standard_reply', professional: 'amanda', procedure: scenario.procedure,
        automaticAllowed: !scenario.urgent && !scenario.review, replyCode: scenario.code, reason: scenario.reason };
      const conversationAction = decideConversationAction({ text: scenario.text, plan, recentConversation: scenarioHistory, conversionExperienceEnabled: true });
      const replyContract = conversationAction.replyContract;
      const preview = scenario.administrative ? buildAdministrativeSideAnswer({ text: scenario.text, professional: 'amanda' }).decision.suggestedReply : scenario.priceWithPhotos
        ? buildSurgicalPriceSuggestedReply({patientName:'Helena',procedure:plan.procedure,currentText:scenario.text,recentConversation:scenarioHistory,directToPatient:true,introduceBruna:false})
        : scenario.code === 'AMANDA-CONSULTA-INFO-01'
        ? buildConsultationInformationReply({ consultationPriceRequested: true, conversionExperienceEnabled: true, consultationNextStep: replyContract.consultationNextStep })
        : buildLiftingFacialInformationReply({ text: scenario.text, procedure: scenario.procedure });
      const policyHints = scenario.code && !scenario.knowledge ? { route: 'standard_reply', reason: scenario.reason, professional: 'amanda', procedure: scenario.procedure, automaticAllowed: true,
        deterministicReplyCode: scenario.code, deterministicReplyProfessional: 'amanda', deterministicReplyProcedure: scenario.procedure, deterministicReplyPreview: preview } : undefined;
      result = await runOpenAIShadow({ phone: '+5511900000000', opportunityId: 'synthetic-only-opportunity', professional: 'amanda', text: scenario.text, procedure: scenario.procedure, recentConversation: scenarioHistory,
        previousConversationState: scenario.previousConversationState, learningContext: scenario.learningContext,
        patientRelationship: scenario.patientRelationship,
        priorInteractionKnown: true, policyHints, replyContract, deterministicUrgent: !!scenario.urgent }, options);
      if ((scenario.code || scenario.educational) && result.status === 'completed') {
        const candidate = {status:'completed', decision: { route: 'standard_reply', confidence: 'high', automaticAllowed: true, urgent: false,
          professional: 'amanda', procedure: scenario.procedure, replyCode: scenario.code, suggestedReply: preview } };
        const confirmed = semanticDecisionConfirmsDeterministicReply(result,candidate);
        selectedReply = scenario.knowledge || scenario.educational ? result.decision?.suggestedReply : confirmed && deterministicReplyCoversPatientQuestions(candidate,conversationAction)
          ? selectConfirmedReplyText(result,candidate) : result.decision?.suggestedReply || '';
        gate = validateOutboundReply({ body: selectedReply, currentText: scenario.text, recentConversation: scenarioHistory,
          conversationAction: { ...conversationAction, semanticReplyAuthorized: true, semanticReplyCode: scenario.code } });
      }
    }
    const modelConfirmed = requests.length > 0 && requests.every(r => r.httpStatus === 200 &&
      (r.model === BRUNA_MODEL || r.model?.startsWith(`${BRUNA_MODEL}-`)) && r.status === 'completed');
    // An administrative knowledge answer can leave an unspecified procedure
    // empty. This is equivalent to unknown only in that scenario; an invented
    // named procedure and every procedure-specific scenario still fail closed.
    const procedureMatches = result.decision?.procedure === scenario.procedure ||
      (scenario.knowledge === true && scenario.procedure === 'unknown' && result.decision?.procedure === '');
    const behaviorPassed = scenario.classification ? true : scenario.followup ? result.allowed === false :
      scenario.fullHistoryResolved ? result.decision?.route === 'ignore' && result.decision?.automaticAllowed === false && !result.decision?.suggestedReply :
      scenario.urgent ? result.decision?.automaticAllowed === false :
      scenario.review ? result.decision?.route === 'human_review' && result.decision?.automaticAllowed === false &&
        result.decision?.replyCode === 'UNKNOWN-REVIEW-01' && /equipamento/i.test(result.decision?.conversationState?.unresolvedQuestions?.join(' ')) &&
        approvedPartialAnswer(result.decision, scenario.learningContext)?.knowledgeIds.includes('SYNTHETIC-PARKING') :
      scenario.educational ? gate?.allowed === true && result.decision?.automaticAllowed === true && /exames|dúvidas|medicamentos/i.test(selectedReply) && !/suspend|solicit.*exame/i.test(selectedReply) :
      gate?.allowed === true && result.decision?.route === 'standard_reply' && result.decision?.automaticAllowed === true &&
        result.decision?.confidence === 'high' && result.decision?.urgent !== true &&
        result.decision?.replyCode === scenario.code && procedureMatches &&
        (!scenario.fullHistoryName || (/Elisa/.test(selectedReply) && !/Helena|qual.*nome/i.test(selectedReply))) &&
        (!scenario.priceWithPhotos || (/Helena/i.test(selectedReply) && /bochechas/i.test(selectedReply) && /boca/i.test(selectedReply) &&
          /R\$ 26 mil e R\$ 42 mil/.test(selectedReply) && /fotos/i.test(selectedReply) && !/confirmar.*valor|recebi.*foto|R\$ 500/i.test(selectedReply))) &&
        !/qual.*(?:dia|período)|quer.*(?:horário|agendar)/i.test(selectedReply);
    const passed = result.status === 'completed' && modelConfirmed && behaviorPassed;
    const timeoutMs = scenario.classification ? BRUNA_CLASSIFICATION_TIMEOUT_MS : scenario.followup ? BRUNA_FOLLOWUP_REVIEW_TIMEOUT_MS : BRUNA_CONVERSATION_TIMEOUT_MS;
    results.push({ name: scenario.name, passed, elapsedMs: Date.now() - startedAt, timeoutMs, requests, status: result.status,
      errorCode: result.errorCode, decision: result.decision, replyCode: result.decision?.replyCode, replyWording: result.decision?.replyWording, selectedReply, gate });
    if (!passed) break;
  }
  const audioCheck = results.length === scenarios.length && results.every(r => r.passed)
    ? await checkBrunaAudioLive({ env, manifest, fetchImpl }) : { status: 'skipped', reason: 'conversation_gate_failed' };
  return { status: results.length === scenarios.length && results.every(r => r.passed) && audioCheck.status !== 'failed' ? 'passed' : 'failed',
    checkedAt: new Date().toISOString(), model: BRUNA_MODEL, effort: BRUNA_REASONING_EFFORT,
    maxOutputTokens: BRUNA_MAX_OUTPUT_TOKENS, verbosity: BRUNA_TEXT_VERBOSITY,
    billingMode: 'api_paid_authorized', syntheticOnly: true, patientMessagesSent: 0, results, audioCheck };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(fs.readFileSync(new URL('../netlify/functions/lib/bruna-policy/manifest.json', import.meta.url), 'utf8'));
  const result = await checkBrunaModelLive({ manifest });
  console.log(`BRUNA_MODEL_PREFLIGHT=${JSON.stringify(result)}`);
  if (result.status === 'failed') process.exitCode = 1;
}
