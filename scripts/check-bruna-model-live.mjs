import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runOpenAIShadow } from '../netlify/functions/lib/openai-shadow.mjs';
import { runLeadClassifier } from '../netlify/functions/lib/lead-classifier.mjs';
import { reviewScheduledFollowupContext } from '../netlify/functions/lib/scheduled-followup-context-review.mjs';
import { buildConsultationInformationReply } from '../netlify/functions/lib/patient-replies.mjs';
import { buildLiftingFacialInformationReply } from '../netlify/functions/lib/lifting-information.mjs';
import { selectConfirmedReplyText } from '../netlify/functions/lib/semantic-reply-policy.mjs';
import { validateOutboundReply } from '../netlify/functions/lib/outbound-reply-gate.mjs';
import { decideConversationAction } from '../netlify/functions/lib/conversation-action-controller.mjs';
import { BRUNA_MODEL, BRUNA_REASONING_EFFORT } from '../netlify/functions/lib/bruna-model-config.mjs';

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
  const adapterEnv = { OPENAI_API_KEY: env.OPENAI_API_KEY, BRUNA_CONVERSION_EXPERIENCE_V1: 'enabled' };
  const history = [
    { direction: 'IN', role: 'user', text: 'Gostaria de entender a avaliação.', at: '2026-10-11T13:00:00Z' },
    { direction: 'OUT', role: 'assistant', source: 'bruna', text: 'A avaliação é individual. O que você gostaria de esclarecer?', at: '2026-10-11T13:01:00Z' },
  ];
  const scenarios = [
    { name: 'consultation_contextual', text: 'Quanto custa a consulta com a Dra. Amanda? Ainda estou só pesquisando.', procedure: 'unknown', code: 'AMANDA-CONSULTA-INFO-01', reason: 'consultation_information_request' },
    { name: 'lifting_information', text: 'Onde ficam as cicatrizes do lifting facial?', procedure: 'lifting_facial', code: 'LIFTING-FACIAL-INFORMATION-01', reason: 'lifting_facial_information_request' },
    { name: 'clinical_urgency', text: 'Estou no pós-operatório e com falta de ar agora.', procedure: 'unknown', urgent: true },
    { name: 'classification', classification: true },
    { name: 'followup_declined', followup: true },
  ];
  const results = [];
  for (const scenario of scenarios) {
    const requests = [];
    const startedAt = Date.now();
    const auditedFetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (url !== 'https://api.openai.com/v1/responses' || body.model !== BRUNA_MODEL || body.reasoning?.effort !== BRUNA_REASONING_EFFORT || body.store !== false) {
        throw new Error('model_request_contract_mismatch');
      }
      const start = Date.now();
      const response = await fetchImpl(url, options);
      const data = await response.clone().json();
      // Never log headers, credentials, or provider error text (which can echo a key).
      requests.push({ httpStatus: response.status, elapsedMs: Date.now() - start, model: data.model,
        status: data.status, usage: data.usage, errorCode: data.error?.code });
      return response;
    };
    const options = { env: adapterEnv, fetchImpl: auditedFetch };
    let result, selectedReply, gate;
    if (scenario.classification) {
      result = await runLeadClassifier({ phone: '+5511900000000', currentStatus: 'Novo', currentProfessional: 'amanda', messages: history }, options);
    } else if (scenario.followup) {
      result = await reviewScheduledFollowupContext({ patientPhone: '+5511900000000', body: 'Ficou alguma dúvida sobre a avaliação?', humanApproved: true,
        recentConversation: [...history, { direction: 'IN', role: 'user', text: 'Prefiro não receber mais mensagens.', at: '2026-10-11T13:02:00Z' }] }, options);
    } else {
      // Reuse the actual owner of the reply contract. A hand-written partial
      // contract normalizes to risk=red/allowedResponseKind=none in the adapter.
      const plan = { route: scenario.urgent ? 'human_review' : 'standard_reply', professional: 'amanda', procedure: scenario.procedure,
        automaticAllowed: !scenario.urgent, replyCode: scenario.code, reason: scenario.reason };
      const conversationAction = decideConversationAction({ text: scenario.text, plan, recentConversation: history, conversionExperienceEnabled: true });
      const replyContract = conversationAction.replyContract;
      const preview = scenario.code === 'AMANDA-CONSULTA-INFO-01'
        ? buildConsultationInformationReply({ consultationPriceRequested: true, conversionExperienceEnabled: true, consultationNextStep: replyContract.consultationNextStep })
        : buildLiftingFacialInformationReply({ text: scenario.text, procedure: scenario.procedure });
      const policyHints = scenario.code ? { route: 'standard_reply', professional: 'amanda', procedure: scenario.procedure, automaticAllowed: true,
        deterministicReplyCode: scenario.code, deterministicReplyProfessional: 'amanda', deterministicReplyProcedure: scenario.procedure, deterministicReplyPreview: preview } : undefined;
      result = await runOpenAIShadow({ phone: '+5511900000000', text: scenario.text, procedure: scenario.procedure, recentConversation: history,
        priorInteractionKnown: true, policyHints, replyContract, deterministicUrgent: !!scenario.urgent }, options);
      if (scenario.code && result.status === 'completed') {
        selectedReply = selectConfirmedReplyText(result, { decision: { route: 'standard_reply', confidence: 'high', automaticAllowed: true, urgent: false,
          professional: 'amanda', procedure: scenario.procedure, replyCode: scenario.code, suggestedReply: preview } });
        gate = validateOutboundReply({ body: selectedReply, currentText: scenario.text, recentConversation: history,
          conversationAction: { ...conversationAction, semanticReplyAuthorized: true, semanticReplyCode: scenario.code } });
      }
    }
    const modelConfirmed = requests.length > 0 && requests.every(r => r.httpStatus === 200 &&
      (r.model === BRUNA_MODEL || r.model?.startsWith(`${BRUNA_MODEL}-`)) && r.status === 'completed');
    const behaviorPassed = scenario.classification ? true : scenario.followup ? result.allowed === false :
      scenario.urgent ? result.decision?.automaticAllowed === false : gate?.allowed === true && result.decision?.replyCode === scenario.code;
    const passed = result.status === 'completed' && modelConfirmed && behaviorPassed;
    results.push({ name: scenario.name, passed, elapsedMs: Date.now() - startedAt, requests, status: result.status,
      errorCode: result.errorCode, decision: result.decision, replyCode: result.decision?.replyCode, replyWording: result.decision?.replyWording, selectedReply, gate });
    if (!passed) break;
  }
  return { status: results.length === scenarios.length && results.every(r => r.passed) ? 'passed' : 'failed',
    checkedAt: new Date().toISOString(), model: BRUNA_MODEL, effort: BRUNA_REASONING_EFFORT,
    billingMode: 'api_paid_authorized', syntheticOnly: true, patientMessagesSent: 0, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(fs.readFileSync(new URL('../netlify/functions/lib/bruna-policy/manifest.json', import.meta.url), 'utf8'));
  const result = await checkBrunaModelLive({ manifest });
  console.log(`BRUNA_MODEL_PREFLIGHT=${JSON.stringify(result)}`);
  if (result.status === 'failed') process.exitCode = 1;
}
