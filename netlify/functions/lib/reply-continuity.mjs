import { classifyBrunaCta } from "./bruna-conversion-experience.mjs";

export const REPLY_CONTINUITY_VERSION = "reply-continuity-v1";

function fold(value) {
  return String(value || "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

function sentences(value) {
  return String(value || "").replace(/\b(Dr|Dra)\./gi, "$1\uE000")
    .split(/(?:\r?\n)+|(?<=[.!?])\s+/u).map(s => s.replaceAll("\uE000", ".").trim()).filter(Boolean);
}

function clinic(turn) {
  return turn?.role === "assistant" || ["bruna", "human", "equipe_humana"].includes(turn?.source);
}

function patient(turn) {
  return ["user", "patient"].includes(turn?.role) || ["patient", "paciente"].includes(turn?.source);
}

function topics(value) {
  const text = fold(value), found = [];
  const consultation = /\b(?:consulta|avaliacao)\b/.test(text);
  if (consultation && /\b(?:examina|exame|observa|considera|conversa|entende|possibilidades|planejamento|limites)\b/.test(text)) found.push("consultation_process");
  if (consultation && /\b(?:indicacao|indicad[oa]|faz sentido|precisa de cirurgia)\b/.test(text)) found.push("individual_assessment");
  if (/\b(?:sem (?:obrigacao|compromisso) de decidir|nao precisa (?:decidir|escolher)|nao precisa chegar com a decisao)\b/.test(text)) found.push("decision_freedom");
  if (/\bconsulta\b/.test(text) && /R\$|\bcusta\b|\bvalor\b/i.test(text)) found.push("consultation_price");
  if (/\b(?:pix|debito|parcelamento|nota fiscal)\b/.test(text)) found.push("payment_terms");
  if (/\b(?:rua|endereco|cep|thera office|maps|conjunto \d)\b/.test(text)) found.push("clinic_location");
  if (/\b(?:rqe|crm|formacao|especialista em cirurgia plastica)\b/.test(text)) found.push("credentials");
  return found;
}

function discoveryQuestion(value) {
  return /\?/.test(value) && /(?:o que (?:voce )?(?:gostaria|quer) (?:de )?(?:entender|saber|melhorar|preservar)|o que mais (?:te |lhe )?incomoda|o que mais chamou (?:sua |a sua )?atencao|como posso (?:te |lhe )?ajudar)/.test(fold(value));
}

function isSubstantiveAnswer(value) {
  const text = fold(value);
  return text.length > 2 && !/^(?:sim|nao|ok|certo|entendi|obrigad[oa]|perfeito|combinado)[.!\s]*$/.test(text);
}

export function patientRequestsRepetition(currentMessage) {
  const text = fold(currentMessage);
  if (/\bnao\s+(?:precisa\s+(?:explicar|repetir)|repita|repete|explique)\b/.test(text)) return false;
  return /\b(?:rep(?:ete|etir|ita)|reenvia|reenviar|nao entendi|nao compreendi|como assim|explica melhor|explique melhor)\b|\b(?:explic\w*|mand\w*|envi\w*|cont\w*|mostr\w*)\b.{0,45}\b(?:de novo|novamente)\b/.test(text);
}

function requestedTopics(value) {
  const text = fold(value), requested = [];
  if (/\b(?:como funciona|como e|o que acontece|o que inclui|o que e feito)\b.{0,50}\b(?:consulta|avaliacao)\b|\b(?:consulta|avaliacao)\b.{0,40}\bcomo funciona\b/.test(text)) requested.push("consultation_process");
  if (/\b(?:indicacao|indicado|indicada|meu caso|pra mim|para mim|preciso operar|preciso de cirurgia)\b/.test(text)) requested.push("individual_assessment");
  if (/\b(?:preco|valor|custa|cobrada|cobrado|cobram|cobrar)\b/.test(text)) requested.push("consultation_price");
  if (/\b(?:pagamento|pagar|pix|debito|parcela|parcelar|parcelamento|nota fiscal)\b/.test(text)) requested.push("payment_terms");
  if (/\b(?:onde|endereco|localizacao|como chegar|maps|cep)\b/.test(text)) requested.push("clinic_location");
  if (/\b(?:formacao|rqe|crm|experiencia|especialista)\b/.test(text)) requested.push("credentials");
  return requested;
}

export function buildReplyContinuityContext({ currentMessage, recentConversation } = {}) {
  const history = (Array.isArray(recentConversation) ? recentConversation : []).slice(-16);
  const clinicTurns = history.filter(clinic);
  const lastClinicIndex = history.findLastIndex(clinic);
  const answers = lastClinicIndex >= 0 ? history.slice(lastClinicIndex + 1).filter(patient).map(t => String(t.text || "")) : [];
  const current = String(currentMessage || "").trim();
  if (current && !answers.includes(current)) answers.push(current);
  const patientAnswer = answers.join("\n").slice(-1500);
  const previousQuestions = clinicTurns.flatMap(t => sentences(t.text).filter(s => s.includes("?"))).slice(-4);
  return {
    version: REPLY_CONTINUITY_VERSION,
    previouslyExplained: [...new Set(clinicTurns.flatMap(t => topics(t.text)))],
    previousQuestions,
    previousOffers: clinicTurns.flatMap(t => sentences(t.text).filter(s => classifyBrunaCta(s))).slice(-4),
    patientAnswer,
    answeredDiscovery: lastClinicIndex >= 0 && discoveryQuestion(history[lastClinicIndex].text) && isSubstantiveAnswer(patientAnswer),
    repeatRequested: patientRequestsRepetition(current),
    requestedTopics: requestedTopics(current),
    historyIsPartial: true,
  };
}

function similarity(left, right) {
  const tokens = v => new Set(fold(v).match(/[a-z0-9]+/g) || []);
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter(x => b.has(x)).length / new Set([...a, ...b]).size;
}

function isBareAcknowledgement(value) {
  return /^(?:claro|entendi|entendo|compreendo|certo|obrigad[oa])\b[^.!?]{0,150}[.!]?$/i.test(String(value || "").trim());
}

// Omission is conservative: an unfamiliar content word may be a new clinical
// or practical fact. Keep that sentence for the existing safety gates.
const BOILERPLATE_WORDS = new Set(("avaliacao consulta presencial individual individualmente indicacao indicada indicado depende depender permite permitir entender entende compreender avaliar examina examinar exame observa observar considera considerar considerada considerado possibilidades possibilidade limites limite planejamento planejar caso regiao conversa conversar explica explicar discute discutir cuidado cuidadosa adequado adequada sentido tambem sobre depois antes durante somente apenas precisa necessario necessaria forma maneira saber saberemos definir definida definido decidir decisao escolha escolher objetivos busca busca-se busca preservar melhorar mudancas temos vamos podemos pode feita feito realiza realizada realizado isso essa esse esta este suas seus para como mais quais qual tudo voce dela dele nessa nesse aquela aquele seria gostaria primeiro chamou atencao incomoda incomodo posso ajudar entende entende-la" ).split(/\s+/));

function hasNovelMeaning(sentence, previousSentences) {
  const previousWords = new Set(fold(previousSentences.join(" ")).match(/[a-z]+/g) || []);
  const words = fold(sentence).match(/[a-z]{4,}/g) || [];
  return words.some(word => !BOILERPLATE_WORDS.has(word) && !previousWords.has(word));
}

export function assessReplyContinuity({ body, currentMessage, recentConversation } = {}) {
  const context = buildReplyContinuityContext({ currentMessage, recentConversation });
  const clinicTurns = (Array.isArray(recentConversation) ? recentConversation : []).slice(-16).filter(clinic);
  const previousSentences = clinicTurns.flatMap(t => sentences(t.text));
  const known = new Set(context.previouslyExplained);
  const requested = new Set(context.requestedTopics);
  const removed = [], kept = [];
  const previousEmpathy = clinicTurns.slice(-2).some(t => /^(?:entendo|compreendo)\b/i.test(String(t.text || "").trim()));
  for (const sentence of sentences(body)) {
    const value = fold(sentence), sentenceTopics = topics(sentence);
    let reason = "";
    if (!context.repeatRequested && clinicTurns.length) {
      // These are generic conversational explanations, not clinical instructions,
      // amounts, deadlines or new recovery information.
      const genericTopics = sentenceTopics.filter(t => ["consultation_process", "individual_assessment", "decision_freedom"].includes(t));
      const protectedDetail = /\d|R\$|https?:|\b(?:dor|febre|sangramento|urgencia|medicamento|remedio|recuperacao|repouso|retorno|risco|anestesia|hospital|cirurgia anterior|outra regiao)\b/i.test(value);
      const novelMeaning = hasNovelMeaning(sentence, previousSentences);
      if (!sentence.includes("?") && !protectedDetail && !novelMeaning && genericTopics.length &&
          genericTopics.every(t => known.has(t)) && !genericTopics.some(t => requested.has(t))) reason = "repeated_explanation";
      if (context.answeredDiscovery && !novelMeaning && discoveryQuestion(sentence)) reason = "answered_discovery_question";
      const cta = classifyBrunaCta(sentence);
      if (cta && /\b(?:consulta|avaliacao)\b/.test(value) && /\b(?:explicar|explique|contar|conte)\b/.test(value) && known.has("consultation_process")) reason = "already_explained_offer";
      if (cta && context.previousOffers.some(previous => classifyBrunaCta(previous) === cta && similarity(previous, sentence) >= 0.65)) reason = "repeated_offer";
      if (!protectedDetail && !sentence.includes("?") && sentenceTopics.length &&
          !sentenceTopics.some(t => requested.has(t)) && previousSentences.some(previous => similarity(previous, sentence) >= 0.86)) reason ||= "repeated_sentence";
      if (previousEmpathy && /^(?:entendo|compreendo)\b/.test(value) && isBareAcknowledgement(sentence)) reason = "repeated_empathy_formula";
    }
    if (reason) removed.push(reason); else kept.push(sentence);
  }
  const text = kept.join(" ").trim();
  const hasProgress = kept.some(s => !isBareAcknowledgement(s));
  return { body: removed.length ? text : String(body || "").trim(), removed: [...new Set(removed)], needsRevision: removed.length > 0 && !hasProgress, context };
}
