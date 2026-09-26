import { detectNamedProcedure, hasUnresolvedNamedProcedure } from './procedure-context.mjs';
// Numeric permission is independent of the internal reference table.
const AUTOMATIC_PROCEDURES = new Set(['lifting_facial', 'lifting_cervical', 'otoplastia']);
export function isAutomaticSurgicalPriceProcedure(procedure) {
  return AUTOMATIC_PROCEDURES.has(procedure);
}

// A lay request to reduce an ear does not establish the scope of otoplasty.
// The latest relevant patient clarification wins over acquisition context.
export function earPriceScope(currentText, recentConversation = []) {
  const patientTexts = (Array.isArray(recentConversation) ? recentConversation : [])
    .filter(t => t?.role === 'user' || ['patient', 'paciente'].includes(t?.source))
    .map(t => String(t.text || ''));
  const texts = [String(currentText || ''), ...patientTexts.reverse()];
  const earContext = texts.some(t => /orelha|otoplastia|macrotia/i.test(t));
  if (!earContext) return '';
  for (const raw of texts) {
    const text = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/\b(?:tamanho|macrotia)\b/.test(text) && !/\bnao\b.{0,25}\b(?:tamanho|diminuir|reduzir)\b/.test(text)) return 'size';
    if (/afastamento|projecao|abano|encostad|mais perto da cabeca/.test(text)) return '';
    if (/\b(?:reducao|reduzir|diminuir|menores|grandes)\b.{0,50}\borelhas?\b|\borelhas?\b.{0,50}\b(?:reducao|reduzir|diminuir|menores|grandes)\b/.test(text)) return 'ambiguous';
  }
  return '';
}

export function resolveSurgicalPricePlan(plan, recentConversation = []) {
  if (!plan || !['price_initial_information', 'surgical_price_review',
    'price_without_confirmed_procedure', 'lifting_price_range_direct', 'otoplasty_price_range_direct'].includes(plan.reason)) return plan;
  const scope = !plan.procedure || plan.procedure === 'otoplastia'
    ? earPriceScope(plan.currentText, recentConversation) : '';
  if (scope) return {...plan, route:'human_review', reason:'surgical_price_review',
    procedure:plan.procedure || 'otoplastia', priceClarification:scope, automaticAllowed:false, replyCode:null};
  if (!isAutomaticSurgicalPriceProcedure(plan.procedure)) return plan;
  const requestsAmount = plan.priceRequestKind === 'amount' || /price_range_direct$/.test(plan.reason);
  if (!requestsAmount) return plan;
  const sent = recentConversation.some(t => (t?.role === 'assistant' ||
    ['bruna','human','human_team','equipe_humana'].includes(t?.source)) && containsApprovedSurgicalRange(t.text, plan.procedure));
  const prefix = plan.procedure === 'otoplastia' ? 'otoplasty' : 'lifting';
  return {...plan, route:sent ? 'human_review' : 'standard_reply',
    reason:sent ? `${prefix}_price_range_already_sent_review` : `${prefix}_price_range_direct`,
    replyCode:sent ? null : plan.procedure === 'otoplastia' ? 'OTOPLASTY-PRICE-RANGE-01' : 'LIFTING-PRICE-RANGE-01',
    automaticAllowed:!sent};
}

export const APPROVED_SURGICAL_RANGE_PATTERNS = Object.freeze({
  mini: /minilifting[^\d\n]{0,100}R\$\s*18\s*mil\s+e\s+R\$\s*25\s*mil/i,
  facial: /lifting\s+facial[^\d\n]{0,100}R\$\s*26\s*mil\s+e\s+R\$\s*42\s*mil/i,
  cervical: /cervicoplastia(?:\s*\(lifting\s+cervical\))?[^\d\n]{0,180}R\$\s*18\s*mil\s+e\s+R\$\s*26\s*mil/i,
  otoplasty: /otoplastia[^\d\n]{0,180}R\$\s*8\s*mil\s+e\s+R\$\s*14\s*mil/i,
});

export function containsApprovedSurgicalRange(body, procedure) {
  const p = APPROVED_SURGICAL_RANGE_PATTERNS;
  if (procedure === 'lifting_facial') return p.mini.test(body) || p.facial.test(body);
  if (procedure === 'lifting_cervical') return p.cervical.test(body);
  if (procedure === 'otoplastia') return p.otoplasty.test(body);
  return false;
}

export function hasOnlyApprovedSurgicalAmounts(body, { allowConsultationPrice = false } = {}) {
  // Remove at most one of each authorized range; every remaining monetary value
  // is rejected, including duplicated ranges and amounts without the R$ prefix.
  let remaining = String(body || '');
  if (allowConsultationPrice) {
    // Only the canonical consultation fact, once. No standalone 500, surgical
    // fee of 500, duplicate, alternative price or extension of numeric policy.
    remaining = remaining.replace(/A consulta presencial com a Dra\. Amanda custa R\$ 500\./, '');
  }
  const groups = ['lifting_facial', 'lifting_cervical', 'otoplastia']
    .filter(procedure => containsApprovedSurgicalRange(remaining, procedure));
  if (groups.length !== 1) return false;
  for (const pattern of Object.values(APPROVED_SURGICAL_RANGE_PATTERNS)) {
    remaining = remaining.replace(pattern, '');
  }
  return !/R\$|\b\d[\d.,]*\s*(?:mil|reais)\b/i.test(remaining);
}

export function resolveBundledSurgicalPricePlan(text, topics, recentConversation = []) {
  if (!topics.includes('price_surgery')) return null;
  let named = detectNamedProcedure(text);
  const unresolved = hasUnresolvedNamedProcedure(text) || /lifting\s+(?:facial\s+(?:e|ou)\s+cervical|cervical\s+(?:e|ou)\s+facial)/i.test(text);
  // A bare lifting request does not identify a facial rather than neck surgery.
  if (!named && !unresolved && !/\blifting\b/i.test(text)) {
    for (const turn of [...recentConversation].reverse()) {
      if (turn?.role !== 'user' && !['patient', 'paciente'].includes(turn?.source)) continue;
      if (hasUnresolvedNamedProcedure(turn.text)) break;
      named = detectNamedProcedure(turn.text);
      if (named) break;
    }
  }
  const procedure = unresolved ? null : named?.key || null;
  return resolveSurgicalPricePlan({route:'human_review', reason:procedure ? 'surgical_price_review' : 'price_without_confirmed_procedure',
    professional:'amanda', procedure, currentText:text, priceRequestKind:'amount', automaticAllowed:false}, recentConversation);
}

export function facialPriceLines(currentText, recentConversation = []) {
  const patientTurns = (Array.isArray(recentConversation) ? recentConversation : [])
    .filter(t => t?.role === 'user' || t?.source === 'paciente');
  const context = [String(currentText || ''), ...patientTurns.slice().reverse().map(t => String(t.text || ''))]
    .find(t => /\bminilifting\b|\blifting\s+facial\b/i.test(t)) || '';
  const mini = /\bminilifting\b/i.test(context);
  const facial = /\blifting\s+facial\b/i.test(context);
  return [
    (!facial || mini) && '• Minilifting: entre R$ 18 mil e R$ 25 mil',
    (!mini || facial) && '• Lifting facial: entre R$ 26 mil e R$ 42 mil',
  ].filter(Boolean);
}
