import { liftingFacialInformationTopics } from "./lifting-information.mjs";
import { isDirectSiteRequest } from "./site-content.mjs";
import { buildReplyContinuityContext } from "./reply-continuity.mjs";
import { isClearInformationAcceptance, isPersonalAppearanceConcern, isPatientPhotoAssessmentRequest, isPriceAmountInquiry, isConsultationCostInquiry, isProcedureExplanationInquiry, resolveOfferedInformationChoice, withoutNegatedSchedulingMentions } from "./patient-turn-context.mjs";
import {
  BRUNA_CONVERSION_EXPERIENCE_VERSION,
  BRUNA_CTA_TYPES,
  classifyBrunaCta,
  procedureOpeningMicrovalue,
} from "./bruna-conversion-experience.mjs";

export const CONVERSATION_ACTIONS = Object.freeze({
  RESPOND: "respond",
  WAIT_TEAM: "wait_team",
  WAIT_PATIENT: "wait_patient",
  CLOSED: "closed",
  IGNORE_DUPLICATE: "ignore_duplicate",
});

const SIMPLE_CLOSING_PATTERN =
  /^(?:(?:(?:muito\s+)?obrigad[ao](?:\s+pela\s+ajuda)?|agrade[cç]o|grata|valeu|ok(?:ay)?|t[áa]\s+bom|tudo bem|entendi|perfeito|combinado|certo|beleza|j[áa]\s+entendi|sem problemas|at[ée](?:\s+(?:mais|logo|amanh[ãa]|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo))?)[,!.?\s]*)+$/i;
const AGREEMENT_CLOSING_PATTERN =
  /^(?:(?:sim|claro)[,!.\s]+)?(?:podemos(?:\s+sim)?|vamos)[,!.\s]+(?:combinado|fechado|perfeito)(?:[,!.\s]+(?:obrigad[ao]|at[ée]\s+(?:l[áa]|logo)))?[,!.\s]*$/i;
const SHORT_AFFIRMATIVE_REPLY_PATTERN =
  /^(?:sim|claro|isso|pode\s+sim|pode\s+ser|quero\s+sim|por\s+favor|sim[,!]?\s+por\s+favor)[.!\s]*$/i;
const SHORT_CONTEXTUAL_RESPONSE_PATTERN =
  /^(?:sim|claro|isso|pode(?:\s+sim|\s+ser)?|quero\s+sim|por\s+favor|ok(?:ay)?|t[áa]\s+bom|entendi|perfeito|combinado|certo|beleza)[,!.?\s]*$/i;
const POLITE_ACKNOWLEDGEMENT_CLOSING_PATTERN =
  /^(?:(?:oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite|ok(?:ay)?|t[áa]\s+bom|tudo\s+bem|entendi|certo|perfeito|combinado|vamos\s+v(?:e|ê|er)(?:\s+l[áa])?|vou\s+v(?:e|ê|er)(?:\s+l[áa])?|obg|obrigad[ao]|valeu|[óo]timo\s+descanso|bom\s+descanso|at[ée]\s+(?:mais|logo)|pra\s+voc[eê]s?|para\s+voc[eê]s?)[,!.?\s]*)+$/i;
const PENDING_HUMAN_COMMITMENT_ACKNOWLEDGEMENT_PATTERN =
  /^(?:(?:tudo\s+bem|ok(?:ay)?|certo|combinado|perfeito|entendi|obg|obrigad[ao]|grata|valeu)[,!.;\s]*)*(?:(?:fico|estou|vou\s+ficar)\s+(?:no\s+)?aguardo|aguardo|vou\s+aguardar|aguardarei)(?:\s+(?:(?:o|seu|um)\s+)?retorno|\s+por\s+not[ií]cias)?(?:[,!.;\s]*(?:tudo\s+bem|ok(?:ay)?|certo|combinado|perfeito|obg|obrigad[ao]|grata|valeu))*[,!.;\s]*$/i;
const DIRECT_QUESTION_PATTERN =
  /(?:\?|^(?:como|qual|quais|quanto|quantos|quando|onde|por\s+que|porque|quem|voc[êe]s|tem|h[áa]|pode|posso|ser[áa]|custa|atende|faz)\b)/i;
const DIRECT_REQUEST_PATTERN =
  /\b(?:quero|queria|gostaria|preciso|poderia|consegue|conseguem|pode|podem|tenho\s+(?:uma\s+)?d[úu]vida|me\s+(?:explica|explique|diz|diga|informa|informe|manda|mande|envia|envie|avisa|avise|confirma|confirme|ajuda|ajude|passa|passe)|verifica|verifique|confirma|confirme|agenda|agende|marca|marque|reserva|reserve)\b/i;
const EXPLICIT_DEFERRAL_PATTERN =
  /\b(?:ainda\s+estou\s+(?:pensando|avaliando|decidindo)|vou\s+(?:pensar|avaliar|analisar|decidir)(?:\s+com\s+calma)?|por\s+enquanto\s+(?:vou\s+)?(?:pensar|avaliar|analisar)|qualquer\s+coisa\s+(?:eu\s+)?volto|qlq(?:r)?\s+coisa\s+(?:eu\s+)?volto|depois\s+(?:eu\s+)?volto|entro\s+em\s+contato\s+(?:mais\s+)?(?:pra\s+frente|adiante|tarde)|quando\s+decidir\s+(?:eu\s+)?(?:volto|aviso|chamo)|se\s+eu\s+decidir\s+(?:eu\s+)?(?:volto|aviso|chamo))\b/i;
const EXPLICIT_NIGHT_PAUSE_PATTERN =
  /\b(?:(?:j[áa]\s+)?(?:est[áa]|t[áa]|ficou|muito)\s+(?:muito\s+)?tarde|amanh[ãa]\s+(?:a gente\s+)?(?:conversa|conversamos|continuamos|retomamos)|(?:conversa|conversamos|continuamos|retomamos)\s+amanh[ãa])\b/i;
const EXPLICIT_RETURN_LATER_PATTERN =
  /\b(?:qualquer\s+coisa\s+(?:eu\s+)?volto|qlq(?:r)?\s+coisa\s+(?:eu\s+)?volto|depois\s+(?:eu\s+)?volto|entro\s+em\s+contato\s+(?:mais\s+)?(?:pra\s+frente|adiante|tarde)|quando\s+decidir\s*[,]?\s*(?:eu\s+)?(?:volto|retorno|aviso|chamo)|se\s+eu\s+decidir\s*[,]?\s*(?:eu\s+)?(?:volto|retorno|aviso|chamo)|vou\s+(?:pensar|avaliar|analisar|decidir)(?:\s+com\s+calma)?\s+e\s+(?:depois\s+)?(?:volto|retorno|aviso|chamo))\b/i;
const PATIENT_DECLINE_PATTERN =
  /\b(?:n[ãa]o\s+(?:tenho\s+)?interesse|prefiro\s+n[ãa]o|n[ãa]o\s+quero|desisti|vou\s+deixar\s+(?:pra|para)\s+(?:depois|mais\s+pra\s+frente)|fora\s+do\s+meu\s+or[cç]amento|acima\s+do\s+meu\s+or[cç]amento|n[ãa]o\s+cabe\s+no\s+meu\s+or[cç]amento|muito\s+car[oa]\s+(?:pra|para)\s+mim|vou\s+me\s+programar\s+e\s+(?:retorno|volto))\b/i;
const DECISION_TIME_PATTERN = /\b(?:(?:estou|t[oô])\s+precisando|preciso|quero|necessito)\s+(?:de\s+)?(?:um\s+pouco\s+(?:de\s+)?)?mais\s+(?:de\s+)?tempo(?:\s+(?:para|pra)\s+(?:pensar|avaliar|decidir|me\s+programar))?\b/i;
const DECISION_DECLINE_PATTERN = /^(?:n[ãa]o\s+quero|prefiro\s+n[ãa]o)\s+(?:agendar|marcar|ver\s+hor[áa]rios?)(?:\s+(?:agora|por\s+enquanto))?[,!.\s]*(?:(?:obrigad[ao]|obg)[,!.\s]*)?$/i;
const CONTEXTUAL_NOT_READY_PATTERN = /^(?:ainda\s+n[ãa]o|agora\s+n[ãa]o|por\s+enquanto\s+n[ãa]o|n[ãa]o(?:\s+agora)?)[,!.\s]*(?:(?:obrigad[ao]|obg)[,!.\s]*)?$/i;
const DECISION_PAUSE_ACK_PATTERN = /^(?:(?:tamb[ée]m|sim|isso|pois\s+[ée]|[ée]|ainda\s+n[ãa]o|agora\s+n[ãa]o|por\s+enquanto\s+n[ãa]o|n[ãa]o|(?:estou\s+precisando|preciso)(?:\s+de)?\s+um\s+pouco\s+mais)[,!.\s]*)+$/i;
const DECISION_INVITATION_PATTERN = /\b(?:quer|gostaria|posso|podemos|vamos|voc[êe]\s+(?:j[áa]\s+)?decidiu)\b[\s\S]{0,150}\b(?:agendar|agendamento|marcar|hor[áa]rios?|datas?|decidir|decis[ãa]o)\b/i;
const KNOWN_PROCEDURE_PATTERN =
  /\b(?:lifting|mini[-\s]?lifting|cervicoplastia|lipo(?:aspira[cç][ãa]o)?(?:\s+de\s+papada)?|papada|blefaroplastia|p[áa]lpebra|otoplastia|orelha|rinoplastia|mamoplastia|mastopexia|pr[óo]tese|abdominoplastia|braquioplastia|cruroplastia|ninfoplastia|ginecomastia)\b/i;
const PAYMENT_PATTERN =
  /\b(?:parcel(?:a|ado|amento|ar)|cart[ãa]o|pix|desconto|[àa]\s+vista|forma(?:s)?\s+de\s+pagamento)\b/i;
const SCHEDULING_PATTERN =
  /\b(?:agenda|agendar|agendamento|marcar|hor[áa]rios?|disponibilidade|vagas?|data|dia|manh[ãa]|tarde)\b/i;
const LOCATION_PATTERN =
  /\b(?:endere[cç]o|onde\s+fica|localiza[cç][ãa]o|como\s+chegar|maps|pinheiros|pais\s+leme|estacionamento)\b|\bmetr[oô](?=\s|[?.!,;:]|$)/i;
const RECOVERY_PATTERN =
  /\b(?:recupera[cç][ãa]o|p[óo]s[-\s]?operat[óo]rio|afastamento|repouso|incha[cç]o|retomar\s+(?:o\s+)?trabalho)\b/i;
const CREDENTIALS_PATTERN =
  /\b(?:crm|rqe|forma[cç][ãa]o|especialista|cirurgi(?:ã|[ãa]o)|curr[íi]culo|experi[eê]ncia)\b/i;
const INSURANCE_PATTERN =
  /\b(?:conv[eê]nio|plano\s+de\s+sa[úu]de|reembolso)\b/i;
const PROCEDURE_INFORMATION_PATTERN =
  /(?:\b(?:saber|entender|explicar|explique|informa[cç][oõ]es?|como\s+funciona)\b[\s\S]{0,180}\b(?:flacidez|papada|pesco[cç]o|p[áa]lpebras?|blefaroplastia|lifting|cervicoplastia|otoplastia|rinoplastia|ninfoplastia|lipo(?:aspira[cç][ãa]o)?)\b|\b(?:flacidez|papada|pesco[cç]o|p[áa]lpebras?|blefaroplastia|lifting|cervicoplastia|otoplastia|rinoplastia|ninfoplastia|lipo(?:aspira[cç][ãa]o)?)\b[\s\S]{0,180}\b(?:como\s+funciona|saber|entender|explicar|informa[cç][oõ]es?)\b)/i;
const APPEARANCE_CONCERN_PATTERN =
  /\b(?:flacidez|papada|pesco[cç]o|p[áa]lpebras?)\b/i;

function normalized(value) {
  return String(value || "").trim();
}

function latestMatchingTurn(recentConversation, predicate) {
  let latest = null;
  let latestAt = null;

  for (const turn of Array.isArray(recentConversation)
    ? recentConversation
    : []) {
    if (!predicate(turn)) continue;

    const parsedAt = new Date(turn?.at || "").getTime();
    const candidateAt = Number.isFinite(parsedAt) ? parsedAt : null;

    if (!latest) {
      latest = turn;
      latestAt = candidateAt;
      continue;
    }

    if (candidateAt !== null && latestAt !== null) {
      if (candidateAt >= latestAt) {
        latest = turn;
        latestAt = candidateAt;
      }
      continue;
    }

    // Históricos legados sem horário preservam a regra anterior: o último
    // item recebido vence. Quando ambos têm horário, prevalece o instante real
    // informado pelo provedor, mesmo que os webhooks terminem fora de ordem.
    latest = turn;
    latestAt = candidateAt;
  }

  return latest;
}

function lastAssistantTurn(recentConversation) {
  return latestMatchingTurn(
    recentConversation,
    (turn) => turn?.role === "assistant",
  );
}

function assistantQuestionBeyondSocialGreeting(turn) {
  const value = normalized(turn?.text)
    .replace(
      /^(?:(?:oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite)[,!\s]*)?(?:(?:[^?\n]{0,80},?\s*)?(?:tudo\s+bem|como\s+vai)\s*\?+\s*)/i,
      "",
    )
    .trim();
  return /\?/.test(value);
}

export function clinicTurnInvitesResponse(turn) {
  const value = normalized(turn?.text)
    .replace(
      /^(?:(?:oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite)[,!\s]*)?/i,
      "",
    )
    .trim();
  return Boolean(
    value &&
      (
        assistantQuestionBeyondSocialGreeting(turn) ||
        /\b(?:posso|podemos)\s+(?:te|lhe)?\s*(?:explicar|contar|mostrar|enviar|passar|orientar|detalhar|ajudar)\b/i.test(value) ||
        /\b(?:quer|gostaria)\s+que\s+eu\s+(?:te|lhe)?\s*(?:explique|conte|mostre|envie|oriente|detalhe|ajude)\b/i.test(value)
      ),
  );
}

export function introducesStandalonePatientRequest(text) {
  const raw = normalized(text);
  const value = raw
    .replace(
      /^(?:(?:oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite)[,!\s]*)+/i,
      "",
    )
    .trim();

  return (
    /\?/.test(raw) ||
    /^(?:como|qual|quais|quanto|quantos|quando|onde|por\s+que|porque|quem|tem|h[áa]|custa|atende|faz)\b/i.test(
      value,
    ) ||
    /\b(?:pode|poderia|consegue|conseguem)\s+(?:me\s+)?(?:explicar|explique|informar|informe|dizer|diga|enviar|envie|confirmar|confirme|verificar|verifique|ajudar|ajude)\b/i.test(
      value,
    ) ||
    /\b(?:quero|queria|gostaria|preciso)\s+(?:de\s+)?(?:agendar|marcar|saber|entender|confirmar|verificar|receber|falar)\b/i.test(
      value,
    )
  );
}

function hasProcedureInformationRequest(value) {
  if (isProcedureExplanationInquiry(value)) return true;
  return String(value || "")
    .split(/\n+/)
    .some(
      (part) =>
        PROCEDURE_INFORMATION_PATTERN.test(part) &&
        (
          APPEARANCE_CONCERN_PATTERN.test(part) ||
          (!isPriceAmountInquiry(part) && !PAYMENT_PATTERN.test(part))
        ),
    );
}

function hasPendingHumanCommitment(commitments) {
  return (Array.isArray(commitments) ? commitments : []).some(
    (commitment) => {
      if (!commitment || typeof commitment !== "object") return false;
      const status = String(commitment.status || "pending")
        .trim()
        .toLowerCase();
      return !["resolved", "cancelled", "canceled"].includes(status);
    },
  );
}

export function isPendingHumanCommitmentAcknowledgement(
  text,
  pendingCommitments = [],
) {
  const value = normalized(text);
  return Boolean(
    value &&
      hasPendingHumanCommitment(pendingCommitments) &&
      !introducesStandalonePatientRequest(value) &&
      PENDING_HUMAN_COMMITMENT_ACKNOWLEDGEMENT_PATTERN.test(value),
  );
}

function latestClinicTurn(recentConversation) {
  return latestMatchingTurn(
    recentConversation,
    (turn) =>
      turn?.role === "assistant" ||
      ["bruna", "human", "equipe_humana"].includes(
        String(turn?.source || ""),
      ),
  );
}

export function isReplyToHumanContextWithoutStandaloneRequest(
  text,
  recentConversation = [],
) {
  const clinicTurn = latestClinicTurn(recentConversation);
  const humanOwned =
    clinicTurn?.role === "assistant" &&
    ["human", "equipe_humana"].includes(
      String(clinicTurn?.source || ""),
    );

  return Boolean(
    humanOwned &&
      normalized(text) &&
      !introducesStandalonePatientRequest(text),
  );
}

export function isShortAffirmativeReplyToHumanQuestion(
  text,
  recentConversation = [],
) {
  const clinicTurn = latestClinicTurn(recentConversation);
  const humanOwned =
    clinicTurn?.role === "assistant" &&
    ["human", "equipe_humana"].includes(
      String(clinicTurn?.source || ""),
    );

  return Boolean(
    humanOwned &&
      assistantQuestionBeyondSocialGreeting(clinicTurn) &&
      (SHORT_AFFIRMATIVE_REPLY_PATTERN.test(normalized(text)) || isClearInformationAcceptance(text)),
  );
}

export function isStandaloneRequestInvitedByHuman(
  text,
  recentConversation = [],
) {
  const clinicTurn = latestClinicTurn(recentConversation);
  const humanOwned =
    clinicTurn?.role === "assistant" &&
    ["human", "equipe_humana"].includes(
      String(clinicTurn?.source || ""),
    );

  return Boolean(
    humanOwned &&
      clinicTurnInvitesResponse(clinicTurn) &&
      introducesStandalonePatientRequest(text),
  );
}

export function hasDirectPatientRequest(text) {
  const value = normalized(text);
  return (
    Boolean(value) &&
    (
      DIRECT_QUESTION_PATTERN.test(value) ||
      DIRECT_REQUEST_PATTERN.test(value) ||
      /\b(?:passa|passe|informa|informe|manda|mande|envia|envie)\s+(?:(?:o|a|os|as)\s+)?(?:valor(?:es)?|pre[cç]os?|endere[cç]o|informa[cç][oõ]es?|faixa)\b/i.test(value)
    )
  );
}

export function isSimpleConversationClosing(text) {
  const value = normalized(text);
  const politeAcknowledgementClosing =
    POLITE_ACKNOWLEDGEMENT_CLOSING_PATTERN.test(value) &&
    /\b(?:ok(?:ay)?|t[áa]\s+bom|tudo\s+bem|entendi|certo|perfeito|combinado|vamos\s+v(?:e|ê|er)|vou\s+v(?:e|ê|er)|obg|obrigad[ao]|valeu|descanso|at[ée]\s+(?:mais|logo))\b/i.test(
      value,
    );
  return (
    SIMPLE_CLOSING_PATTERN.test(value) ||
    AGREEMENT_CLOSING_PATTERN.test(value) ||
    politeAcknowledgementClosing
  );
}

export function isExplicitDeferralWithoutRequest(text) {
  const value = normalized(text);
  const explicitNightPause = isExplicitNightPause(value);
  // "Preciso de mais tempo" asks for a pause, not for further information.
  const remaining = value.replace(DECISION_TIME_PATTERN, "").replace(/^[,!.;\s]+|[,!.;\s]+$/g, "");
  const timeRequest = DECISION_TIME_PATTERN.test(value) &&
    (!remaining || isSimpleConversationClosing(remaining));
  return (
    Boolean(value) &&
    (EXPLICIT_DEFERRAL_PATTERN.test(value) || explicitNightPause || timeRequest) &&
    (
      explicitNightPause || timeRequest ||
      !hasDirectPatientRequest(value)
    )
  );
}

// A clinic question cannot reopen a pause chosen by the patient. Only new
// substantive patient content can do that; short acknowledgements cannot.
// Also accepts the IN/OUT envelope used by the existing follow-up endpoint.
export function isPatientDecisionPause(text, recentConversation = []) {
  const turns = Array.isArray(recentConversation) ? [...recentConversation] : [];
  if (turns.length && turns.every(turn => Number.isFinite(Date.parse(turn?.at)))) {
    turns.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  }
  let paused = false;
  let clinicText = "";
  const readPatientTurn = value => {
    if (!value) return;
    const deferred = !isExplicitNightPause(value) && (
      isExplicitDeferralWithoutRequest(value) ||
      isExplicitReturnLaterClosing(value) || isPatientDeclineWithoutRequest(value) || DECISION_DECLINE_PATTERN.test(value)
    );
    // Inbound bursts can join "not yet" with the next fragmented sentence.
    const parts = value.split(/\n+/).map(part => part.trim()).filter(Boolean);
    const notReady = DECISION_INVITATION_PATTERN.test(clinicText) &&
      CONTEXTUAL_NOT_READY_PATTERN.test(parts[0] || "") &&
      parts.slice(1).every(part => DECISION_PAUSE_ACK_PATTERN.test(part) || isExplicitDeferralWithoutRequest(part));
    if (deferred || notReady) paused = true;
    else if (!isSimpleConversationClosing(value) && !DECISION_PAUSE_ACK_PATTERN.test(value)) paused = false;
  };
  for (const turn of turns) {
    if (turn?.role === "assistant" || turn?.direction === "OUT" ||
        ["bruna", "human", "equipe_humana"].includes(turn?.source)) {
      clinicText = normalized(turn.text);
    } else if (["user", "patient"].includes(turn?.role) || turn?.direction === "IN" ||
        ["patient", "paciente"].includes(turn?.source)) {
      readPatientTurn(normalized(turn.text));
    }
  }
  // Empty current text queries the accumulated pause for scheduled follow-ups.
  readPatientTurn(normalized(text));
  return paused;
}

export function isExplicitNightPause(text) {
  const value = normalized(text);
  if (!value || !EXPLICIT_NIGHT_PAUSE_PATTERN.test(value)) return false;

  const remaining = value
    .replace(
      new RegExp(EXPLICIT_NIGHT_PAUSE_PATTERN.source, "gi"),
      " ",
    )
    .replace(
      /[,!.?\s]*(?:(?:[ée]|seria)\s+)?melhor(?:\s+n[ée])?|pode\s+ser|t[áa]\s+bom|combinado|ok(?:ay)?[,!.?\s]*$/i,
      " ",
    )
    .replace(/[,!.?\s]+/g, " ")
    .trim();

  return !remaining || !hasDirectPatientRequest(remaining);
}

export function isExplicitReturnLaterClosing(text) {
  const value = normalized(text);
  return (
    Boolean(value) &&
    EXPLICIT_RETURN_LATER_PATTERN.test(value) &&
    !hasDirectPatientRequest(value)
  );
}

export function hasUnresolvedPatientRequest(
  text,
  recentConversation = [],
) {
  const value = normalized(text);
  if (!value || isExplicitDeferralWithoutRequest(value) || isPatientDecisionPause(value, recentConversation)) {
    return false;
  }

  if (hasDirectPatientRequest(value)) return true;

  const previousAssistant = lastAssistantTurn(recentConversation);
  const invitedResponse = clinicTurnInvitesResponse(previousAssistant);
  if (isSimpleConversationClosing(value)) {
    return Boolean(
      invitedResponse && SHORT_CONTEXTUAL_RESPONSE_PATTERN.test(value),
    );
  }
  return invitedResponse;
}

export function isPatientDeclineWithoutRequest(text) {
  const value = normalized(text);
  return Boolean(
    value &&
      PATIENT_DECLINE_PATTERN.test(value) &&
      !hasDirectPatientRequest(value),
  );
}

function inferUnresolvedIntents({
  text,
  messageType,
  schedulingRequest,
  plan,
}) {
  const value = normalized(text);
  const valueWithoutSocialGreeting = value.replace(
    /^(?:(?:oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite)[,!\s]*)+/i,
    "",
  );
  const intents = [];
  const add = (intent) => {
    if (!intents.includes(intent)) intents.push(intent);
  };
  if (plan?.reason === 'consultation_question_bundle') {
    for (const topic of plan.questionTopics || []) add(topic);
  }

  if (String(messageType || "").toLowerCase() === "image") add("photo");
  else if (isPatientPhotoAssessmentRequest(value)) {
    add("photo_assessment_request");
    if (isPersonalAppearanceConcern(value)) add("appearance_concerns");
  }
  const consultationPriceRequest = isConsultationCostInquiry(value);
  if (
    (isPriceAmountInquiry(value) || consultationPriceRequest) &&
    plan?.priceMentionIsTemplateContext !== true
  ) {
    add(consultationPriceRequest ? "price_consultation" : "price_surgery");
  }
  if (
    [
      "price_initial_information",
      "lifting_price_range_direct",
      "otoplasty_price_range_direct",
      "lipo_papada_price_range_direct",
    ].includes(
      plan?.reason,
    ) &&
    !intents.includes("price_consultation")
  ) {
    add("price_surgery");
  }
  if (PAYMENT_PATTERN.test(value)) add("payment_terms");
  const schedulingText = withoutNegatedSchedulingMentions(valueWithoutSocialGreeting);
  if (
    (schedulingRequest && (schedulingText === valueWithoutSocialGreeting || /\b(?:remarcar|reagendar)\b/i.test(schedulingText))) ||
    (SCHEDULING_PATTERN.test(schedulingText) &&
      (plan?.reason !== 'consultation_question_bundle' || /\b(?:agendar|marcar|hor[aá]rio|disponibilidade)\b/i.test(schedulingText)))
  ) {
    add("scheduling");
  }
  if (LOCATION_PATTERN.test(value)) add("location");
  if (RECOVERY_PATTERN.test(value)) add("recovery");
  if (CREDENTIALS_PATTERN.test(value)) add("credentials");
  if (INSURANCE_PATTERN.test(value)) add("insurance");
  if (isDirectSiteRequest(value) || /\binstagram\b/i.test(value)) add("resource");
  if (
    plan?.marketingPrefill !== true &&
    hasProcedureInformationRequest(value)
  ) {
    add("procedure_information");
  }
  for (const topic of liftingFacialInformationTopics({
    text: value,
    procedure: plan?.procedure,
  })) {
    add(`lifting_${topic}`);
  }
  if (plan?.reason === "consultation_information_request" && intents.length === 0) add("consultation_information");
  if (hasDirectPatientRequest(value) && intents.length === 0) add("clinical_or_general");
  return intents;
}

function buildReplyContract({
  action,
  reason,
  details,
  text,
  messageType,
  plan,
  recentConversation,
  schedulingRequest,
  conversionExperienceEnabled,
}) {
  const value = normalized(text);
  const intents = inferUnresolvedIntents({
    text: resolveOfferedInformationChoice({text:value,recentConversation})?.requestText || value,
    messageType,
    schedulingRequest,
    plan,
  });
  const priceIntent = intents.includes("price_surgery") ||
    intents.includes("price_consultation");
  const unknownSurgicalProcedure =
    intents.includes("price_surgery") &&
    !KNOWN_PROCEDURE_PATTERN.test(value) &&
    (!plan?.procedure || plan.procedure === "avaliacao_facial");
  const humanContext = isReplyToHumanContextWithoutStandaloneRequest(
    value,
    recentConversation,
  );
  const canWrite =
    action === CONVERSATION_ACTIONS.RESPOND ||
    (
      action === CONVERSATION_ACTIONS.WAIT_TEAM &&
      details.allowHoldingReply === true
    );

  let stage = "consideration";
  if (action === CONVERSATION_ACTIONS.CLOSED) stage = "closed";
  else if (action === CONVERSATION_ACTIONS.WAIT_PATIENT) stage = "pause";
  else if (humanContext || details.humanTakeoverActive) stage = "active_care";
  else if (intents.includes("scheduling")) stage = "scheduling";
  else if (!Array.isArray(recentConversation) || recentConversation.length === 0) {
    stage = "discovery";
  }

  let risk = "green";
  if (
    action === CONVERSATION_ACTIONS.WAIT_TEAM ||
    intents.includes("photo") ||
    intents.includes("clinical_or_general")
  ) {
    risk = "red";
  } else if (priceIntent || intents.includes("scheduling")) {
    risk = "yellow";
  }

  let maxQuestions = 1;
  if (
    !canWrite ||
    intents.some((intent) => [
      "photo",
      "price_consultation",
      "insurance",
      "resource",
    ].includes(intent)) ||
    (intents.includes("location") && !unknownSurgicalProcedure) ||
    (intents.includes("price_surgery") && !unknownSurgicalProcedure && plan?.priceClarification !== 'ambiguous')
  ) {
    maxQuestions = 0;
  }
  const questionBundle = plan?.reason === 'consultation_question_bundle';
  if (canWrite && questionBundle && plan.questionTopics?.includes('price_surgery') && !plan.bundledPricePlan?.procedure) maxQuestions = 1;

  const protectedApprovedRange = [
    "lifting_price_range_direct",
    "otoplasty_price_range_direct",
    "lipo_papada_price_range_direct",
  ].includes(plan?.reason);
  const approvedLiftingInformation =
    plan?.procedure === "lifting_facial" &&
    intents.some((intent) => intent.startsWith("lifting_"));
  const approvedGeneralInformation = conversionExperienceEnabled &&
    action === CONVERSATION_ACTIONS.RESPOND &&
    plan?.route === "standard_reply" && plan?.automaticAllowed !== false &&
    plan?.marketingPrefill !== true && !humanContext && !details.humanTakeoverActive &&
    Boolean(procedureOpeningMicrovalue(plan?.procedure)) &&
    Array.isArray(recentConversation) && recentConversation.some(turn => turn?.role === "assistant") &&
    !intents.some(intent => ["photo", "clinical_or_general", "price_surgery", "price_consultation",
      "payment_terms", "scheduling", "location", "insurance", "resource"].includes(intent));
  const maxLinks =
    !canWrite || intents.includes("photo") ||
    (
      isPersonalAppearanceConcern(value) &&
      !intents.some(intent => ["resource", "location"].includes(intent)) &&
      !intents.includes('resource')
    ) ||
    (
      priceIntent &&
      !intents.includes('resource') &&
      !intents.includes("location")
    )
      ? 0
      : 1;
  const silenceReason = canWrite ? "" : reason || "reply_not_authorized";
  const allowedCtaTypes = [];
  const declinesAvailability = withoutNegatedSchedulingMentions(value) !== value || /\b(?:n[aã]o\s+(?:quero|pretendo|vou)|sem\s+(?:querer|intenc[aã]o\s+de))\s+(?:agendar|marcar)|\b(?:vou\s+pensar|prefiro\s+pensar|s[oó]\s+(?:estou\s+)?pesquisando)\b/i.test(value);
  const history = (Array.isArray(recentConversation) ? recentConversation : []).slice(-16);
  const clinicTurn = turn => turn?.role === "assistant" || ["bruna", "human", "equipe_humana"].includes(turn?.source);
  const priorAvailabilityOffer = history.filter(clinicTurn).some(turn =>
    classifyBrunaCta(turn?.text) === BRUNA_CTA_TYPES.AVAILABILITY ||
    classifyBrunaCta(turn?.text) === BRUNA_CTA_TYPES.PREFERENCE);
  const declinedEarlier = history.filter(turn => !clinicTurn(turn)).some(turn =>
    withoutNegatedSchedulingMentions(String(turn?.text || "")) !== String(turn?.text || "") ||
    EXPLICIT_DEFERRAL_PATTERN.test(String(turn?.text || "")) ||
    /\b(?:n[aã]o\s+(?:quero|pretendo|vou)\s+(?:agendar|marcar)|s[oó]\s+(?:estou\s+)?pesquisando|sem\s+interesse)\b/i.test(String(turn?.text || "")));
  const mayOfferAvailability = !declinesAvailability && !declinedEarlier && !priorAvailabilityOffer;
  const continuity = buildReplyContinuityContext({currentMessage:text,recentConversation:history});
  const personalAnswer = isPersonalAppearanceConcern(continuity.patientAnswer) ||
    (continuity.answeredDiscovery && /\b(?:excesso de pele|flacidez|olhar ca[ií]do|p[aá]lpebras? ca[ií]d[ao]s?)\b/i.test(continuity.patientAnswer));
  const consultationNextStep = conversionExperienceEnabled && mayOfferAvailability &&
    action === CONVERSATION_ACTIONS.RESPOND && plan?.route === "standard_reply" &&
    plan?.automaticAllowed !== false && plan?.professional === "amanda" &&
    plan?.marketingPrefill !== true && !humanContext && !details.humanTakeoverActive && !questionBundle &&
    Boolean(procedureOpeningMicrovalue(plan?.procedure)) &&
    !intents.some(intent => ["photo", "clinical_or_general", "price_surgery", "price_consultation",
      "payment_terms", "scheduling", "location", "insurance", "resource", "recovery"].includes(intent)) &&
    (plan?.reason === "consultation_information_request" ||
      (personalAnswer && continuity.previouslyExplained.includes("consultation_process")))
      ? "offer_availability" : "answer_only";
  if (canWrite && conversionExperienceEnabled) {
    if (intents.includes("scheduling")) {
      allowedCtaTypes.push(BRUNA_CTA_TYPES.PREFERENCE);
    }
    if (intents.includes("price_consultation") && mayOfferAvailability) {
      allowedCtaTypes.push(BRUNA_CTA_TYPES.AVAILABILITY);
    }
    if (protectedApprovedRange && !declinesAvailability) {
      allowedCtaTypes.push(BRUNA_CTA_TYPES.INFORMATION);
      if (mayOfferAvailability) allowedCtaTypes.push(BRUNA_CTA_TYPES.AVAILABILITY);
    }
    if (approvedLiftingInformation || approvedGeneralInformation) {
      allowedCtaTypes.push(BRUNA_CTA_TYPES.INFORMATION);
    }
    if (consultationNextStep === "offer_availability") allowedCtaTypes.push(BRUNA_CTA_TYPES.AVAILABILITY);
  }
  const allowCta =
    canWrite &&
    (
      intents.includes("scheduling") ||
      (intents.includes("price_consultation") && mayOfferAvailability) ||
      (protectedApprovedRange && !declinesAvailability) ||
      approvedLiftingInformation || approvedGeneralInformation || consultationNextStep === "offer_availability"
    );

  return Object.freeze({
    version: conversionExperienceEnabled
      ? "reply-contract-v2"
      : "reply-contract-v1",
    stage,
    risk,
    owner:
      action === CONVERSATION_ACTIONS.RESPOND
        ? "bruna"
        : action === CONVERSATION_ACTIONS.WAIT_TEAM
          ? "human_team"
          : action === CONVERSATION_ACTIONS.WAIT_PATIENT
            ? "patient"
            : "none",
    allowedResponseKind: canWrite
      ? action === CONVERSATION_ACTIONS.WAIT_TEAM
        ? "specific_acknowledgement"
        : "direct_answer"
      : "none",
    unresolvedIntents: intents,
    silenceReason,
    maxQuestions,
    maxLinks,
    allowCta: questionBundle ? false : allowCta,
    allowAppointmentConfirmation: false,
    requirePhotoDistanceLimit: intents.includes("photo"),
    sourceReason: plan?.reason || reason || "",
    procedure: plan?.procedure || null,
    ...(questionBundle ? {questionBundle:true, surgicalPriceReason:plan.bundledPricePlan?.reason || ''} : {}),
    ...(conversionExperienceEnabled
      ? {
          experienceVersion: BRUNA_CONVERSION_EXPERIENCE_VERSION,
          allowedCtaTypes: questionBundle ? [] : allowedCtaTypes,
          consultationNextStep: !questionBundle && !protectedApprovedRange &&
            allowedCtaTypes.includes(BRUNA_CTA_TYPES.AVAILABILITY)
              ? "offer_availability" : "answer_only",
          preferredMaxCharacters: priceIntent ? 650 : 420,
        }
      : {}),
  });
}

function result(action, reason, details = {}) {
  const unresolvedRequest =
    details.unresolvedRequest === true;
  const canonical = {
    [CONVERSATION_ACTIONS.RESPOND]: {
      state: "bot_active",
      owner: "bruna",
      nextAction: "send_patient_message",
    },
    [CONVERSATION_ACTIONS.WAIT_TEAM]: {
      state: "waiting_team",
      owner: "human_team",
      nextAction: "alert_team",
    },
    [CONVERSATION_ACTIONS.WAIT_PATIENT]: {
      state: "waiting_patient",
      owner: "patient",
      nextAction: "none",
    },
    [CONVERSATION_ACTIONS.CLOSED]: {
      state: "closed",
      owner: "none",
      nextAction: "none",
    },
    [CONVERSATION_ACTIONS.IGNORE_DUPLICATE]: {
      state: "duplicate_ignored",
      owner: "none",
      nextAction: "none",
    },
  }[action] || {
    state: "waiting_team",
    owner: "human_team",
    nextAction: "alert_team",
  };

  const replyContract = details.replyContract || null;
  return {
    action,
    reason,
    state: canonical.state,
    owner: canonical.owner,
    nextAction: details.nextAction || canonical.nextAction,
    unresolvedRequest,
    allowAutomaticReply:
      action === CONVERSATION_ACTIONS.RESPOND,
    allowHoldingReply:
      action === CONVERSATION_ACTIONS.WAIT_TEAM &&
      unresolvedRequest &&
      details.forceNoHoldingReply !== true,
    allowAlert:
      details.forceNoAlert !== true &&
      (
        action === CONVERSATION_ACTIONS.WAIT_TEAM ||
        details.allowAlert === true
      ),
    scheduleHumanResume:
      action === CONVERSATION_ACTIONS.WAIT_TEAM &&
      unresolvedRequest &&
      details.humanTakeoverActive === true,
    followupPolicy:
      details.followupPolicy || "none",
    minimumFollowupDelayHours:
      Number(details.minimumFollowupDelayHours || 0),
    replyContract,
    silenceReason:
      replyContract?.silenceReason || "",
    pendingHumanCommitmentAcknowledged:
      details.pendingHumanCommitmentAcknowledged === true,
  };
}

export function decideConversationAction({
  text,
  messageType = "text",
  plan = {},
  recentConversation = [],
  humanTakeoverActive = false,
  exactDuplicate = false,
  schedulingRequest = false,
  pendingCommitments = [],
  conversionExperienceEnabled = false,
}) {
  const value = normalized(text);
  const type = normalized(messageType).toLowerCase() || "text";
  const decide = (action, reason, details = {}) => {
    const provisional = {
      ...details,
      allowHoldingReply:
        action === CONVERSATION_ACTIONS.WAIT_TEAM &&
        details.unresolvedRequest === true &&
        details.forceNoHoldingReply !== true,
    };
    return result(action, reason, {
      ...details,
      replyContract: buildReplyContract({
        action,
        reason,
        details: provisional,
        text: value,
        messageType: type,
        plan,
        recentConversation,
        schedulingRequest,
        conversionExperienceEnabled,
      }),
    });
  };

  if (exactDuplicate) {
    return decide(
      CONVERSATION_ACTIONS.IGNORE_DUPLICATE,
      "exact_message_duplicate",
    );
  }

  // A known ignored context remains closed even if the next envelope has no
  // readable content. It must not become an obligation to alert or reply.
  if (plan?.route === "ignore") {
    return decide(CONVERSATION_ACTIONS.CLOSED, plan.reason || "ignored_by_plan");
  }

  if (type !== "text" || !value) {
    return decide(
      CONVERSATION_ACTIONS.WAIT_TEAM,
      "unsupported_or_empty_message",
      {
        unresolvedRequest: true,
        humanTakeoverActive,
      },
    );
  }

  if (isPatientDecisionPause(value, recentConversation) &&
      !isExplicitReturnLaterClosing(value) && !isPatientDeclineWithoutRequest(value)) {
    return decide(CONVERSATION_ACTIONS.WAIT_PATIENT, "patient_deciding", {
      followupPolicy: "patient_initiated",
      minimumFollowupDelayHours: 24,
    });
  }

  if (
    isPendingHumanCommitmentAcknowledgement(
      value,
      pendingCommitments,
    )
  ) {
    return decide(
      CONVERSATION_ACTIONS.WAIT_TEAM,
      "pending_human_commitment_acknowledged",
      {
        unresolvedRequest: false,
        forceNoHoldingReply: true,
        forceNoAlert: true,
        nextAction: "await_human_commitment_resolution",
        pendingHumanCommitmentAcknowledged: true,
        followupPolicy: "none",
      },
    );
  }

  const contextualResponsePending = hasUnresolvedPatientRequest(
    value,
    recentConversation,
  );

  if (isSimpleConversationClosing(value) && !contextualResponsePending) {
    return decide(
      CONVERSATION_ACTIONS.CLOSED,
      "simple_conversation_closing",
      { followupPolicy: "none" },
    );
  }

  if (isExplicitReturnLaterClosing(value)) {
    return decide(
      CONVERSATION_ACTIONS.CLOSED,
      "patient_will_return",
      {
        followupPolicy: "patient_initiated",
        minimumFollowupDelayHours: 24,
      },
    );
  }

  if (isExplicitDeferralWithoutRequest(value)) {
    return decide(
      CONVERSATION_ACTIONS.WAIT_PATIENT,
      "patient_deciding",
      {
        followupPolicy: "manual_after_cooldown",
        minimumFollowupDelayHours: 24,
      },
    );
  }

  if (isPatientDeclineWithoutRequest(value)) {
    return decide(
      CONVERSATION_ACTIONS.WAIT_PATIENT,
      "patient_declined_or_budget_pause",
      {
        followupPolicy: "patient_initiated",
        minimumFollowupDelayHours: 0,
      },
    );
  }

  const patternSuggestsResponse = contextualResponsePending;
  const semanticEvaluationRequired =
    plan?.route === "standard_reply" &&
    plan?.automaticAllowed === true;
  const unresolvedRequest =
    patternSuggestsResponse || semanticEvaluationRequired;
  const needsTeam =
    schedulingRequest ||
    plan?.route === "appointment_review" ||
    plan?.route === "human_review";

  if (needsTeam) {
    return decide(
      CONVERSATION_ACTIONS.WAIT_TEAM,
      plan.reason || "team_action_required",
      {
        unresolvedRequest: true,
        humanTakeoverActive,
      },
    );
  }

  if (humanTakeoverActive) {
    return decide(
      unresolvedRequest
        ? CONVERSATION_ACTIONS.WAIT_TEAM
        : CONVERSATION_ACTIONS.WAIT_PATIENT,
      unresolvedRequest
        ? "human_conversation_has_pending_request"
        : "human_conversation_waiting_patient",
      {
        unresolvedRequest,
        humanTakeoverActive,
      },
    );
  }

  const routeStartsConversation = [
    "reactivation_notice",
    "daniel_greeting_and_alert",
  ].includes(plan?.route);
  const automaticRoute = [
    "standard_reply",
    "reactivation_notice",
    "daniel_greeting_and_alert",
  ].includes(plan?.route);

  if (
    automaticRoute &&
    plan?.automaticAllowed === true &&
    (unresolvedRequest || routeStartsConversation)
  ) {
    return decide(
      CONVERSATION_ACTIONS.RESPOND,
      plan.reason || "safe_response_required",
      {
        unresolvedRequest: true,
        allowAlert:
          plan?.route === "daniel_greeting_and_alert",
        semanticEvaluationRequired,
        patternSuggestsResponse,
      },
    );
  }

  if (!unresolvedRequest) {
    return decide(
      CONVERSATION_ACTIONS.WAIT_PATIENT,
      "no_current_response_obligation",
    );
  }

  return decide(
    CONVERSATION_ACTIONS.WAIT_TEAM,
    plan.reason || "response_requires_review",
    { unresolvedRequest: true },
  );
}
