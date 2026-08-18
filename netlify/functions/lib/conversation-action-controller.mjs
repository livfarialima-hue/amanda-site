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
  /\b(?:qualquer\s+coisa\s+(?:eu\s+)?volto|qlq(?:r)?\s+coisa\s+(?:eu\s+)?volto|depois\s+(?:eu\s+)?volto|entro\s+em\s+contato\s+(?:mais\s+)?(?:pra\s+frente|adiante|tarde)|quando\s+decidir\s+(?:eu\s+)?(?:volto|aviso|chamo)|se\s+eu\s+decidir\s+(?:eu\s+)?(?:volto|aviso|chamo))\b/i;

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
  if (
    !value ||
    isSimpleConversationClosing(value) ||
    isExplicitDeferralWithoutRequest(value)
  ) {
    return false;
  }

  if (hasDirectPatientRequest(value)) return true;

  const previousAssistant = lastAssistantTurn(recentConversation);
  return assistantQuestionBeyondSocialGreeting(previousAssistant);
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
      unresolvedRequest,
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

  if (exactDuplicate) {
    return result(
      CONVERSATION_ACTIONS.IGNORE_DUPLICATE,
      "exact_message_duplicate",
    );
  }

  if (type !== "text" || !value) {
    return result(
      CONVERSATION_ACTIONS.WAIT_TEAM,
      "unsupported_or_empty_message",
      {
        unresolvedRequest: true,
        humanTakeoverActive,
      },
    );
  }

  if (isSimpleConversationClosing(value)) {
    return result(
      CONVERSATION_ACTIONS.CLOSED,
      "simple_conversation_closing",
      { followupPolicy: "none" },
    );
  }

  if (isExplicitReturnLaterClosing(value)) {
    return result(
      CONVERSATION_ACTIONS.CLOSED,
      "patient_will_return",
      {
        followupPolicy: "patient_initiated",
        minimumFollowupDelayHours: 24,
      },
    );
  }

  if (isExplicitDeferralWithoutRequest(value)) {
    return result(
      CONVERSATION_ACTIONS.WAIT_PATIENT,
      "patient_deciding",
      {
        followupPolicy: "manual_after_cooldown",
        minimumFollowupDelayHours: 24,
      },
    );
  }

  if (plan?.route === "ignore") {
    return result(
      CONVERSATION_ACTIONS.CLOSED,
      plan.reason || "ignored_by_plan",
    );
  }

  const unresolvedRequest =
    hasUnresolvedPatientRequest(
      value,
      recentConversation,
    ) ||
    (
      plan?.route === "standard_reply" &&
      plan?.reason === "ai_safety_triage"
    );
  const needsTeam =
    schedulingRequest ||
    plan?.route === "appointment_review" ||
    plan?.route === "human_review";

  if (needsTeam) {
    return result(
      CONVERSATION_ACTIONS.WAIT_TEAM,
      plan.reason || "team_action_required",
      {
        unresolvedRequest: true,
        humanTakeoverActive,
      },
    );
  }

  if (humanTakeoverActive) {
    return result(
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
    return result(
      CONVERSATION_ACTIONS.RESPOND,
      plan.reason || "safe_response_required",
      {
        unresolvedRequest: true,
        allowAlert:
          plan?.route === "daniel_greeting_and_alert",
      },
    );
  }

  if (!unresolvedRequest) {
    return result(
      CONVERSATION_ACTIONS.WAIT_PATIENT,
      "no_current_response_obligation",
    );
  }

  return result(
    CONVERSATION_ACTIONS.WAIT_TEAM,
    plan.reason || "response_requires_review",
    { unresolvedRequest: true },
  );
}
