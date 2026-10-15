import { detectNamedProcedure, hasUnresolvedNamedProcedure } from './procedure-context.mjs';

// One disclosure contract for automatic replies and human-reviewed suggestions.
export const SURGICAL_PRICE_DISCLOSURE = 'É uma referência para planejamento, não é um orçamento fechado. O valor individual é definido após avaliação, conforme o plano cirúrgico, a equipe, o hospital, a anestesia e os materiais.';

export function hasApprovedSurgicalPriceDisclosure(value) {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // An approved amount does not authorize a fixed quote or unconfirmed inclusions.
  if (/\b(?:tudo incluido|inclui tudo|orcamento (?:e|esta|ja esta) fechado|preco (?:e )?garantido|valor (?:e )?garantido|preco fechado|nunca ultrapassa|nao passa de)\b|\b(?:apenas|somente|so) (?:os )?honorarios\b/.test(text)) return false;
  const concise = /e uma referencia para planejamento nao e um orcamento fechado/.test(text) &&
    /o valor individual e definido apos avaliacao conforme o plano cirurgico a equipe o hospital a anestesia e os materiais/.test(text);
  // Existing, already-approved replies may still appear in delayed reviews/history.
  const legacy = /nao e orcamento proposta nem garantia de preco/.test(text) &&
    /valor final e definido apos avaliacao e planejamento e pode ficar fora dessa faixa/.test(text) &&
    /nao representa honorarios isolados/.test(text);
  return concise || legacy;
}
// Numeric permission is independent of the internal reference table.
const AUTOMATIC_PROCEDURES = new Set(['lifting_facial', 'lifting_cervical', 'otoplastia', 'lipo_papada']);
export function isAutomaticSurgicalPriceProcedure(procedure) {
  return AUTOMATIC_PROCEDURES.has(procedure);
}

// The new authorization is for isolated submental liposuction only. A campaign,
// CRM label or clinic suggestion does not establish the patient's scope.
export function hasIsolatedLipoPapadaScope(currentText, recentConversation = []) {
  const texts = [String(currentText || ''), ...[...recentConversation].reverse()
    .filter(t => t?.role === 'user' || ['patient', 'paciente'].includes(t?.source)).map(t => String(t.text || ''))];
  for (const raw of texts) {
    const value = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (/\b(?:platisma|platismoplastia|plastimoplastia|musculo|muscular|associad[ao]|combinad[ao])\b/.test(value)) return false;
    if (/\b(?:com|e|mais|junto\s+com)\s+(?:(?:a|o|uma?|tambem)\s+)?(?:retirada|remocao|tratamento|correcao|preenchimento|botox|toxina|fios|laser|enzimas)\b/.test(value)) return false;
    const lipoMention = value.match(/\blipo(?:aspiracao)?\s+(?:de\s+)?papada\b/);
    if (lipoMention) {
      const prefix = value.slice(0,lipoMention.index);
      const connector = prefix.match(/(?:\b(?:e|com|mais|junto(?:\s+(?:com|d[aeo]))?)\b|\+)\s*(?:(?:a|o|da|do)\s+)?$/);
      if (connector) {
        const before = prefix.slice(0,connector.index).trim();
        if (!/^e\b/.test(connector[0]) || !/\b(?:consulta|avaliacao|valor(?:es)?|preco(?:s)?|custo(?:s)?|recuperacao|procedimento)\s*$/.test(before)) return false;
      }
      const tail = value.slice(lipoMention.index + lipoMention[0].length);
      // Association names are open-ended: never try to authorize them through
      // a catalogue. Conjunctions of informational questions remain eligible.
      for (const match of tail.matchAll(/\+|\b(?:com|junto|mais|e)\b/g)) {
        const rest = tail.slice(match.index + match[0].length).trim();
        if (match[0] === 'mais' && /^(?:ou\s+menos|sobre|informacoes?|detalhes)\b/.test(rest)) continue;
        if (match[0] === 'com' && /^(?:(?:a\s+)?(?:dra\.?|doutora|amanda)\b|quanto\s+tempo\b)/.test(rest)) continue;
        if (match[0] === 'e' && /^(?:(?:o|a|os|as|do|da|dos|das|sobre|tambem)\s+)*(?:qual|quanto|como|valor(?:es)?|preco(?:s)?|custo(?:s)?|recuperacao|procedimento|consulta|avaliacao|anestesia|hospital|pagamento|parcelamento|prazo|tempo|obrigad[ao]|gostaria\s+de\s+saber|quero\s+saber)\b/.test(rest)) continue;
        return false;
      }
    }
    if (hasUnresolvedNamedProcedure(raw)) return false;
    const named = detectNamedProcedure(raw);
    if (named) return named.key === 'lipo_papada';
  }
  return false;
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
    'price_without_confirmed_procedure', 'lifting_price_range_direct', 'otoplasty_price_range_direct', 'lipo_papada_price_range_direct'].includes(plan.reason)) return plan;
  const scope = !plan.procedure || plan.procedure === 'otoplastia'
    ? earPriceScope(plan.currentText, recentConversation) : '';
  if (scope) return {...plan, route:'human_review', reason:'surgical_price_review',
    procedure:plan.procedure || 'otoplastia', priceClarification:scope, automaticAllowed:false, replyCode:null};
  if (!isAutomaticSurgicalPriceProcedure(plan.procedure)) return plan;
  if (plan.procedure === 'lipo_papada' && !hasIsolatedLipoPapadaScope(plan.currentText, recentConversation)) {
    return {...plan, route:'human_review', reason:'surgical_price_review', automaticAllowed:false, replyCode:null};
  }
  const requestsAmount = plan.priceRequestKind === 'amount' || /price_range_direct$/.test(plan.reason);
  if (!requestsAmount) return plan;
  const sent = recentConversation.some(t => (t?.role === 'assistant' ||
    ['bruna','human','human_team','equipe_humana'].includes(t?.source)) &&
    (containsApprovedSurgicalRange(t.text, plan.procedure) ||
      (plan.procedure === 'lipo_papada' && containsPreviouslySharedLipoPapadaRange(t.text))));
  const prefix = plan.procedure === 'otoplastia' ? 'otoplasty' : plan.procedure === 'lipo_papada' ? 'lipo_papada' : 'lifting';
  return {...plan, route:sent ? 'human_review' : 'standard_reply',
    reason:sent ? `${prefix}_price_range_already_sent_review` : `${prefix}_price_range_direct`,
    replyCode:sent ? null : plan.procedure === 'otoplastia' ? 'OTOPLASTY-PRICE-RANGE-01' : plan.procedure === 'lipo_papada' ? 'LIPO-PAPADA-PRICE-RANGE-01' : 'LIFTING-PRICE-RANGE-01',
    automaticAllowed:!sent};
}

export const APPROVED_SURGICAL_RANGE_PATTERNS = Object.freeze({
  mini: /minilifting[^\d\n]{0,100}R\$\s*18\s*mil\s+e\s+R\$\s*25\s*mil/i,
  facial: /lifting\s+facial[^\d\n]{0,100}R\$\s*26\s*mil\s+e\s+R\$\s*42\s*mil/i,
  cervical: /cervicoplastia(?:\s*\(lifting\s+cervical\))?[^\d\n]{0,180}R\$\s*18\s*mil\s+e\s+R\$\s*26\s*mil/i,
  otoplasty: /otoplastia[^\d\n]{0,180}R\$\s*8\s*mil\s+e\s+R\$\s*14\s*mil/i,
  lipoPapada: /lipo\s+de\s+papada\s+isolada[^\d\n]{0,100}R\$\s*12\s*mil\s+e\s+R\$\s*18\s*mil/i,
});

// Historical team wording may use numerals or omit the procedure name in a
// contextual answer. Callers already require the lipo plan and clinic authorship.
// This blocks repetition only; outgoing money still needs the strict pattern.
export function containsPreviouslySharedLipoPapadaRange(body) {
  const text = String(body || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return /(?:r\$\s*)?12(?:[.,]000(?:,00)?|\s*mil)?\s*(?:a|ate|e|[-–])\s*(?:r\$\s*)?18(?:[.,]000(?:,00)?|\s*mil)\b/.test(text);
}

export function containsApprovedSurgicalRange(body, procedure) {
  const p = APPROVED_SURGICAL_RANGE_PATTERNS;
  if (procedure === 'lifting_facial') return p.mini.test(body) || p.facial.test(body);
  if (procedure === 'lifting_cervical') return p.cervical.test(body);
  if (procedure === 'otoplastia') return p.otoplasty.test(body);
  if (procedure === 'lipo_papada') return p.lipoPapada.test(body);
  return false;
}

export function hasOnlyApprovedSurgicalAmounts(body, { allowConsultationPrice = false } = {}) {
  // Remove at most one of each authorized range; every remaining monetary value
  // is rejected, including duplicated ranges and amounts without the R$ prefix.
  let remaining = String(body || '');
  if (allowConsultationPrice) {
    // Only the canonical consultation fact, once. No standalone 500, surgical
    // fee of 500, duplicate, alternative price or extension of numeric policy.
    remaining = remaining.replace(/A consulta (?:presencial|online) com a Dra\. Amanda custa R\$ 500\./, '');
  }
  const groups = ['lifting_facial', 'lifting_cervical', 'otoplastia', 'lipo_papada']
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
