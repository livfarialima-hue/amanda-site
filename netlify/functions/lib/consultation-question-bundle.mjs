import { consultationQuestionTopics } from './patient-turn-context.mjs';
import { resolveBundledSurgicalPricePlan } from './surgical-price-policy.mjs';
import { AMANDA_CONSULTATION_PRICE_REPLY, AMANDA_CONSULTATION_PAYMENT_REPLY, AMANDA_PRIVATE_REIMBURSEMENT_REPLY } from './patient-replies.mjs';
import { buildSurgicalPriceSuggestedReply } from './surgical-price-review.mjs';
import { usableProfileFirstName } from './profile-name.mjs';

export const CONSULTATION_BUNDLE_REASON = 'consultation_question_bundle';
export const CONSULTATION_BUNDLE_CODE = 'AMANDA-CONSULTA-BUNDLE-01';

// Shared pure composition for the webhook and delayed human-context processor.
// The caller still requires a matching high-confidence semantic decision and
// delivered human alert for pending details before making a patient promise.
export function buildConsultationQuestionBundle({plan, text = '', recentConversation = [], patientName = '', introduceBruna = false}) {
  if (plan?.reason !== CONSULTATION_BUNDLE_REASON) return null;
  const topics = consultationQuestionTopics(text);
  if (topics.length < 2) return null;
  const pricePlan = resolveBundledSurgicalPricePlan(text, topics, recentConversation);
  const pendingDetails = [];
  if (topics.includes('remote_consultation')) pendingDetails.push('a possibilidade de consulta online e, se disponível, seu valor');
  if (topics.includes('reimbursement_document')) pendingDetails.push('a emissão do relatório para solicitar reembolso, além da nota fiscal');
  const needsPriceClarification = Boolean(pricePlan && !pricePlan.procedure);
  const priceAllowed = Boolean(pricePlan?.automaticAllowed && /price_range_direct$/.test(pricePlan.reason));
  if (pricePlan && !needsPriceClarification && !priceAllowed) pendingDetails.push('a referência de valor para a cirurgia solicitada, considerando o que já foi conversado');
  const name = usableProfileFirstName(patientName);
  const opening = introduceBruna ? `Olá${name ? ', ' + name : ''}! Eu sou a Bruna, da equipe da Dra. Amanda na Clínica LIV.` : '';
  const concern = /pesco[cç]o[\s\S]{0,100}(?:mais me incomoda|mais incomoda)|(?:mais me incomoda|maior inc[oô]modo)[\s\S]{0,60}pesco[cç]o/i.test(text)
    ? 'Entendi que o pescoço é o que mais incomoda neste momento.' : '';
  const priceBody = priceAllowed ? buildSurgicalPriceSuggestedReply({procedure:pricePlan.procedure, currentText:text,
    recentConversation, directToPatient:true, introduceBruna:false, offerNextStep:false, includeGreeting:false}) : '';
  const pendingBody = pendingDetails.length ? `Vou confirmar com a equipe ${pendingDetails.join(' e ')}.` : '';
  const clarification = needsPriceClarification
    ? /\blifting\b/i.test(text)
      ? /pesco[cç]o/i.test(text)
        ? 'Sobre o lifting: você quer uma referência para o pescoço apenas ou também para o rosto?'
        : 'Sobre o lifting: você se refere ao rosto, ao pescoço ou aos dois?'
      : 'Sobre o valor da cirurgia: qual procedimento você está pesquisando?'
    : '';
  const body = [opening, concern,
    topics.includes('price_consultation') && `${AMANDA_CONSULTATION_PRICE_REPLY} ${AMANDA_CONSULTATION_PAYMENT_REPLY}`,
    (topics.includes('insurance') || topics.includes('reimbursement_document')) && AMANDA_PRIVATE_REIMBURSEMENT_REPLY,
    priceBody, pendingBody, clarification,
  ].filter(Boolean).join('\n\n');
  return {body, topics, pricePlan, priceAllowed, needsPriceClarification, pendingDetails,
    candidate:{status:'completed', model:'deterministic-consultation-bundle', decision:{route:'standard_reply',confidence:'high',
      automaticAllowed:true,urgent:false,professional:'amanda',procedure:pricePlan?.procedure || plan.procedure || '',
      replyCode:CONSULTATION_BUNDLE_CODE,suggestedReply:body,reviewReason:''}}};
}
