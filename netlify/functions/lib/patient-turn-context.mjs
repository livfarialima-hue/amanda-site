// Pure linguistic signals. Acceptance needs an explicit offer in the caller;
// it never authorizes a procedure, payment, booking or clinical recommendation.
export const UNAVAILABLE_PATIENT_TEXT = "[Mensagem de texto indisponível na integração.]";

// Same linguistic signal for planning and the outbound contract. It identifies a
// question about cost, not consent to a range, a booking, or a price objection.
const PRICE_AMOUNT_PATTERN = /\b(?:precos?|valor(?:es)?|investimento|media|orcamento|faixa|quanto\s+(?:custa|fica|sai|e)(?!\s+(?:(?:o|a|um|uma)\s+)?(?:tempo|prazo|periodo|risco|tamanho|inchaco|inchad[oa]|vermelh[oa]|dolorid[oa]|sensivel|afastad[oa]|internad[oa])\b))\b/i;
const CONSULTATION_COST_PATTERN = new RegExp(
  `(?:${PRICE_AMOUNT_PATTERN.source}|\\b(?:tem\\s+custo|cobr(?:a|am|ado|ada|ados|adas|ar))\\b).{0,45}\\b(?:consulta|avalia[cç][aã]o)\\b|` +
  `\\b(?:consulta|avalia[cç][aã]o)\\b.{0,45}(?:${PRICE_AMOUNT_PATTERN.source}|\\b(?:tem\\s+custo|cobr(?:a|am|ado|ada|ados|adas|ar))\\b)`, "i");

export function isPriceAmountInquiry(text) {
  return PRICE_AMOUNT_PATTERN.test(String(text || "").normalize("NFD").replace(/\p{M}/gu, ""));
}

export function isConsultationCostInquiry(text) {
  return CONSULTATION_COST_PATTERN.test(String(text || "").normalize("NFD").replace(/\p{M}/gu, ""));
}

// Independent questions in one unanswered block; this supplies topics, never
// medical facts or numeric permission. A consultation *for* a procedure does
// not also ask for that surgery's price.
export function consultationQuestionTopics(text) {
  const value = String(text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const clauses = value.split(/[\n.!?;]+/).filter(Boolean);
  const active = clauses.filter(c => !/\b(?:nao quero|nao preciso|sem interesse em)\b.{0,30}\b(?:precos?|valor(?:es)?|faixa|orcamento)\b/.test(c));
  const consultationPrice = active.some(isConsultationCostInquiry);
  const surgeryWord = /\b(?:cirurgia|lifting|cervicoplastia|otoplastia|blefaroplastia|rinoplastia|mastopexia|abdominoplastia|lipoaspiracao|ninfoplastia|mamoplastia|minilifting|procedimento)\b/;
  const surgeryPrice = active.some(c => {
    if (!surgeryWord.test(c)) return false;
    if (!isPriceAmountInquiry(c)) return consultationPrice && /^\s*e\s+(?:[oa]|d[oa])\s+(?:lifting|cervicoplastia|otoplastia|cirurgia)\b/.test(c);
    if (!isConsultationCostInquiry(c)) return true;
    // A shared price question: "preço da consulta e do lifting", in either order.
    return /\b(?:consulta|avaliacao)\s*(?:presencial\s*)?(?:,|e|ou)\s*(?:(?:tambem|d[oa]|[oa])\s+)*(?:cirurgia|lifting|cervicoplastia|otoplastia|blefaroplastia|rinoplastia|minilifting)\b/.test(c) ||
      /\b(?:cirurgia|lifting(?: facial| cervical)?|cervicoplastia|otoplastia|blefaroplastia|rinoplastia|minilifting)\s*(?:,|e|ou)\s*(?:d[ae]|a|da minha)?\s*(?:consulta|avaliacao)\b/.test(c) ||
      /\b(?:e|tambem)\s+(?:qual\s+(?:e\s+)?(?:o\s+)?|quanto\s+|[oa]\s+)?(?:preco|valor|faixa|media|custa|fica)\b.{0,45}\b(?:cirurgia|lifting|cervicoplastia|otoplastia|blefaroplastia|rinoplastia|minilifting)\b/.test(c);
  });
  return [
    consultationPrice && 'price_consultation',
    surgeryPrice && 'price_surgery',
    /\b(?:convenio|plano de saude|bradesco|unimed|sulamerica|amil)\b/.test(value) && 'insurance',
    /\b(?:online|on-line|teleconsulta|videochamada|videoconsulta|consulta (?:por video|remota|a distancia))\b/.test(value) && 'remote_consultation',
    /\b(?:relatorio|laudo|documentacao|documentos?)\b[\s\S]{0,120}\breembolso\b|\breembolso\b[\s\S]{0,120}\b(?:relatorio|laudo|documentacao|documentos?)\b/.test(value) && 'reimbursement_document',
  ].filter(Boolean);
}

// A conversational signal, never a diagnosis or evidence of surgical intent.
export function isPersonalAppearanceConcern(text) {
  const value = String(text || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const appearance = "(?:papada|pescoco|rosto|face|pele|flacidez|flacid[oa]|gordura|peso|aparencia|olhar|bolsas|palpebras?|orelhas?|abdome|barriga|mamas?|seios|contorno|rugas?)";
  const possessive = new RegExp("\\b(?:minha|minhas|meu|meus)\\s+" + appearance + "\\b");
  const selfDescription = new RegExp("\\btenho\\s+(?:(?:o|a|um|uma|muita|muito)\\s+)?" + appearance + "\\b");
  const personal = /\b(?:me incomoda|me incomodam|quero melhorar|queria melhorar|estou (?:acima|abaixo|com))\b/.test(value);
  return possessive.test(value) || selfDescription.test(value) || /\b(?:emagreci|engordei)\b/.test(value) ||
    (personal && new RegExp("\\b" + appearance + "\\b").test(value));
}

export function hasUnansweredUnavailablePatientText(recentConversation = []) {
  // Only the current unanswered block counts; an old failure must not explain
  // a new conversation. The marker is supplied by the inbound/ledger adapters.
  for (const turn of [...recentConversation].reverse()) {
    if (turn?.role === "assistant" || ["bruna", "human", "human_team", "equipe_humana", "clinica_autoria_desconhecida"].includes(turn?.source)) return false;
    if (["user", "patient"].includes(turn?.role) && turn?.text === UNAVAILABLE_PATIENT_TEXT) return true;
  }
  return false;
}

export function isClearInformationAcceptance(text) {
  const value = String(text || "").trim()
    .replace(/^(?:oi|ol[áa]|bom dia|boa tarde|boa noite)[,!\s]+/i, "")
    .replace(/[,!\s]+(?:por favor|por gentileza|obrigad[ao])[.!\s]*$/i, "")
    .replace(/,\s*/g, " ")
    .trim();
  // A standalone polite request accepts the concrete offer in the caller's
  // context. It does not establish what was offered or authorize any new step.
  if (/^(?:por\s*favor|por\s+gentileza|pfvr?|(?:manda|mande|envia|envie)(?:\s+sim)?)[.!?\s]*$/i.test(value)) return true;
  return /^(?:sim|claro|pode(?:\s+(?:sim|ser|(?:me\s+)?(?:mandar|enviar)))?|sim\s+pode|(?:quero|gostaria)(?:\s+sim)?|(?:sim\s+)?(?:eu\s+)?(?:quero|gostaria de)\s+(?:saber|entender)(?:\s+mais)?|(?:pode\s+)?(?:me\s+)?explica(?:r)?(?:\s+sim)?|(?:pode\s+)?(?:me\s+)?passa(?:r)?(?:\s+(?:a\s+faixa|os\s+valores|essa\s+refer[eê]ncia))?)[.!\s]*$/i.test(value);
}

export function isAutomatedBusinessReply(text) {
  const value = String(text || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // A personal request, clinical symptom or correction overrides an away notice.
  if (/\?|\b(?:quero|gostaria|preciso|minha|meu|cirurgia|consulta|febre|dor|sangramento|remedio|medicamento)\b/.test(value)) return false;
  const acknowledgement = /\b(?:agradecemos|obrigad[oa])\b.{0,45}\bcontato\b/.test(value);
  const unavailable = /\b(?:estamos|encontramos|estaremos)\b.{0,40}\b(?:indisponiveis|ausentes|fora)\b|fora do (?:nosso )?horario/.test(value);
  const businessResponse = /\b(?:nosso horario|horario de atendimento|retornaremos|responderemos|retornamos|assim que possivel)\b/.test(value);
  return acknowledgement && (unavailable || businessResponse);
}

export function informationRequestText({ text, recentConversation = [] }) {
  if (!isClearInformationAcceptance(text)) return String(text || "");
  const lastClinic = [...recentConversation].reverse().find(turn => turn.role === "assistant");
  const offer = String(lastClinic?.text || "");
  return /\b(?:posso|quer|gostaria)\b.{0,90}\b(?:explic|cont|ajud|informa)|quer que eu te explique/i.test(offer)
    ? offer : String(text || "");
}
