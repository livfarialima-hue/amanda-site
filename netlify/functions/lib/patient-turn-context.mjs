// Pure linguistic signals. Acceptance needs an explicit offer in the caller;
// it never authorizes a procedure, payment, booking or clinical recommendation.
export const UNAVAILABLE_PATIENT_TEXT = "[Mensagem de texto indisponível na integração.]";

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
