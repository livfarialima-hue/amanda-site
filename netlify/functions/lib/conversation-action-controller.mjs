import { liftingFacialInformationTopics } from "./lifting-information.mjs";

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
const DIRECT_QUESTION_PATTERN =
  /(?:\?|^(?:como|qual|quais|quanto|quantos|quando|onde|por\s+que|porque|quem|voc[êe]s|tem|h[áa]|pode|posso|ser[áa]|custa|atende|faz)\b)/i;
const DIRECT_REQUEST_PATTERN =
  /\b(?:quero|gostaria|preciso|poderia|consegue|conseguem|pode|podem|tenho\s+(?:uma\s+)?d[úu]vida|me\s+(?:explica|explique|diz|diga|informa|informe|manda|mande|envia|envie|avisa|avise|confirma|confirme|ajuda|ajude|passa|passe)|verifica|verifique|confirma|confirme|agenda|agende|marca|marque|reserva|reserve)\b/i;
const EXPLICIT_DEFERRAL_PATTERN =
  /\b(?:ainda\s+estou\s+(?:pensando|avaliando|decidindo)|vou\s+(?:pensar|avaliar|analisar|decidir)(?:\s+com\s+calma)?|por\s+enquanto\s+(?:vou\s+)?(?:pensar|avaliar|analisar)|qualquer\s+coisa\s+(?:eu\s+)?volto|qlq(?:r)?\s+coisa\s+(?:eu\s+)?volto|depois\s+(?:eu\s+)?volto|entro\s+em\s+contato\s+(?:mais\s+)?(?:pra\s+frente|adiante|tarde)|quando\s+decidir\s+(?:eu\s+)?(?:volto|aviso|chamo)|se\s+eu\s+decidir\s+(?:eu\s+)?(?:volto|aviso|chamo))\b/i;
const EXPLICIT_NIGHT_PAUSE_PATTERN =
  /\b(?:(?:j[áa]\s+)?(?:est[áa]|t[áa]|ficou|muito)\s+(?:muito\s+)?tarde|amanh[ãa]\s+(?:a gente\s+)?(?:conversa|conversamos|continuamos|retomamos)|(?:conversa|conversamos|continuamos|retomamos)\s+amanh[ãa])\b/i;
const EXPLICIT_RETURN_LATER_PATTERN =
  /\b(?:qualquer\s+coisa\s+(?:eu\s+)?volto|qlq(?:r)?\s+coisa\s+(?:eu\s+)?volto|depois\s+(?:eu\s+)?volto|entro\s+em\s+contato\s+(?:mais\s+)?(?:pra\s+frente|adiante|tarde)|quando\s+decidir\s*[,]?\s*(?:eu\s+)?(?:volto|retorno|aviso|chamo)|se\s+eu\s+decidir\s*[,]?\s*(?:eu\s+)?(?:volto|retorno|aviso|chamo)|vou\s+(?:pensar|avaliar|analisar|decidir)(?:\s+com\s+calma)?\s+e\s+(?:depois\s+)?(?:volto|retorno|aviso|chamo))\b/i;
const PATIENT_DECLINE_PATTERN =
  /\b(?:n[ãa]o\s+(?:tenho\s+)?interesse|prefiro\s+n[ãa]o|n[ãa]o\s+quero|desisti|vou\s+deixar\s+(?:pra|para)\s+(?:depois|mais\s+pra\s+frente)|fora\s+do\s+meu\s+or[cç]amento|acima\s+do\s+meu\s+or[cç]amento|n[ãa]o\s+cabe\s+no\s+meu\s+or[cç]amento|muito\s+car[oa]\s+(?:pra|para)\s+mim|vou\s+me\s+programar\s+e\s+(?:retorno|volto))\b/i;
const PRICE_PATTERN =
  /\b(?:valor(?:es)?|pre[cç]os?|quanto\s+custa|investimento|or[cç]amento|faixa)\b/i;
const CONSULTATION_PATTERN = /\bconsult(?:a|ar|as|inha)\b/i;
const KNOWN_PROCEDURE_PATTERN =
  /\b(?:lifting|mini[-\s]?lifting|cervicoplastia|lipo(?:aspira[cç][ãa]o)?(?:\s+de\s+papada)?|papada|blefaroplastia|p[áa]lpebra|otoplastia|orelha|rinoplastia|mamoplastia|mastopexia|pr[óo]tese|abdominoplastia|braquioplastia|cruroplastia|ninfoplastia|ginecomastia)\b/i;
const PAYMENT_PATTERN =
  /\b(?:parcel(?:a|ado|amento|ar)|cart[ãa]o|pix|desconto|[àa]\s+vista|forma(?:s)?\s+de\s+pagamento)\b/i;
const SCHEDULING_PATTERN =
  /\b(?:agenda|agendar|agendamento|marcar|hor[áa]rios?|disponibilidade|vagas?|data|dia|manh[ãa]|tarde)\b/i;
const LOCATION_PATTERN =
  /\b(?:endere[cç]o|onde\s+fica|localiza[cç][ãa]o|como\s+chegar|maps|pinheiros|pais\s+leme)\b/i;
const RECOVERY_PATTERN =
  /\b(?:recupera[cç][ãa]o|p[óo]s[-\s]?operat[óo]rio|afastamento|repouso|incha[cç]o|retomar\s+(?:o\s+)?trabalho)\b/i;
const CREDENTIALS_PATTERN =
  /\b(?:crm|rqe|forma[cç][ãa]o|especialista|cirurgi(?:ã|[ãa]o)|curr[íi]culo|experi[eê]ncia)\b/i;
const INSURANCE_PATTERN =
  /\b(?:conv[eê]nio|plano\s+de\s+sa[úu]de|reembolso)\b/i;
const RESOURCE_PATTERN =
  /\b(?:site|p[áa]gina|link|instagram|material|conte[úu]do)\b/i;

function normalized(value) {
  return String(value || "").trim();
}

function lastAssistantTurn(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .slice()
    .reverse()
    .find((turn) => turn?.role === "assistant");
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
        /\b(?:posso|podemos)\s+(?:te|lhe)?\s*(?:explicar|contar|mostrar|enviar|orientar|detalhar|ajudar)\b/i.test(value) ||
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
    /\b(?:quero|gostaria|preciso)\s+(?:de\s+)?(?:agendar|marcar|saber|entender|confirmar|verificar|receber|falar)\b/i.test(
      value,
    )
  );
}

function latestClinicTurn(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .slice()
    .reverse()
    .find(
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
      SHORT_AFFIRMATIVE_REPLY_PATTERN.test(normalized(text)),
  );
}

export function hasDirectPatientRequest(text) {
  const value = normalized(text);
  return (
    Boolean(value) &&
    (
      DIRECT_QUESTION_PATTERN.test(value) ||
      DIRECT_REQUEST_PATTERN.test(value)
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
  return (
    Boolean(value) &&
    (EXPLICIT_DEFERRAL_PATTERN.test(value) || explicitNightPause) &&
    (
      explicitNightPause ||
      !hasDirectPatientRequest(value)
    )
  );
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
  if (!value || isExplicitDeferralWithoutRequest(value)) {
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

  if (String(messageType || "").toLowerCase() === "image") add("photo");
  if (
    PRICE_PATTERN.test(value) &&
    plan?.priceMentionIsTemplateContext !== true
  ) {
    add(CONSULTATION_PATTERN.test(value) ? "price_consultation" : "price_surgery");
  }
  if (
    ["price_initial_information", "lifting_price_range_direct"].includes(
      plan?.reason,
    ) &&
    !intents.includes("price_consultation")
  ) {
    add("price_surgery");
  }
  if (PAYMENT_PATTERN.test(value)) add("payment_terms");
  if (
    schedulingRequest ||
    SCHEDULING_PATTERN.test(valueWithoutSocialGreeting)
  ) {
    add("scheduling");
  }
  if (LOCATION_PATTERN.test(value)) add("location");
  if (RECOVERY_PATTERN.test(value)) add("recovery");
  if (CREDENTIALS_PATTERN.test(value)) add("credentials");
  if (INSURANCE_PATTERN.test(value)) add("insurance");
  if (RESOURCE_PATTERN.test(value)) add("resource");
  for (const topic of liftingFacialInformationTopics({
    text: value,
    procedure: plan?.procedure,
  })) {
    add(`lifting_${topic}`);
  }
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
}) {
  const value = normalized(text);
  const intents = inferUnresolvedIntents({
    text: value,
    messageType,
    schedulingRequest,
    plan,
  });
  const priceIntent = intents.includes("price_surgery") ||
    intents.includes("price_consultation");
  const unknownSurgicalProcedure =
    intents.includes("price_surgery") &&
    !KNOWN_PROCEDURE_PATTERN.test(value) &&
    !plan?.procedure;
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
      "location",
      "insurance",
      "resource",
    ].includes(intent)) ||
    (intents.includes("price_surgery") && !unknownSurgicalProcedure)
  ) {
    maxQuestions = 0;
  }

  const protectedLiftingRange =
    plan?.reason === "lifting_price_range_direct";
  const approvedInitialCervicalRangeOffer =
    plan?.reason === "price_initial_information" &&
    plan?.procedure === "lifting_cervical";
  const approvedInitialSurgicalGuide =
    plan?.reason === "price_initial_information" &&
    !unknownSurgicalProcedure;
  const approvedLiftingInformation =
    plan?.procedure === "lifting_facial" &&
    intents.some((intent) => intent.startsWith("lifting_"));
  const maxLinks =
    !canWrite || intents.includes("photo") ||
    (
      priceIntent &&
      !protectedLiftingRange &&
      !approvedInitialSurgicalGuide &&
      !intents.includes("location")
    )
      ? 0
      : 1;
  const silenceReason = canWrite ? "" : reason || "reply_not_authorized";

  return Object.freeze({
    version: "reply-contract-v1",
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
    allowCta:
      canWrite &&
      (
        intents.includes("scheduling") ||
        approvedInitialCervicalRangeOffer ||
        approvedLiftingInformation
      ),
    allowAppointmentConfirmation: false,
    requirePhotoDistanceLimit: intents.includes("photo"),
    sourceReason: plan?.reason || reason || "",
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
    nextAction: canonical.nextAction,
    unresolvedRequest,
    allowAutomaticReply:
      action === CONVERSATION_ACTIONS.RESPOND,
    allowHoldingReply:
      action === CONVERSATION_ACTIONS.WAIT_TEAM &&
      unresolvedRequest &&
      details.forceNoHoldingReply !== true,
    allowAlert:
      action === CONVERSATION_ACTIONS.WAIT_TEAM ||
      details.allowAlert === true,
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
      }),
    });
  };

  if (exactDuplicate) {
    return decide(
      CONVERSATION_ACTIONS.IGNORE_DUPLICATE,
      "exact_message_duplicate",
    );
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

  if (plan?.route === "ignore") {
    return decide(
      CONVERSATION_ACTIONS.CLOSED,
      plan.reason || "ignored_by_plan",
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
