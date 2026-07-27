const URGENT_PATTERNS = [
  /\b(?:dor|aperto|press[aã]o|peso)\s+(?:forte\s+)?no\s+peito\b/i,
  /\bfalta\s+de\s+ar\b/i,
  /\b(?:desmai(?:ei|ou|ando)?|perda\s+de\s+consci[eê]ncia)\b/i,
  /\b(?:hemorragia|sangramento\s+(?:forte|intenso|que\s+n[aã]o\s+para))\b/i,
  /\b(?:confus[aã]o\s+mental|fala\s+enrolada|fraqueza\s+de\s+um\s+lado)\b/i,
  /\b(?:rea[cç][aã]o\s+al[eé]rgica|incha[cç]o\s+(?:no\s+)?(?:rosto|l[aá]bios|garganta))\b/i,
  /\b(?:urg[eê]ncia|emerg[eê]ncia|samu|pronto\s+socorro)\b/i,
  /\b(?:piora\s+r[aá]pida|sintomas?\s+(?:muito\s+)?intensos?)\b/i,
  /\b(?:febre|secre[cç][aã]o|dor|sangramento|falta\s+de\s+ar).{0,50}\b(?:cirurgia|p[oó]s[- ]operat[oó]rio|pr[oó]tese)\b/i,
  /\b(?:cirurgia|p[oó]s[- ]operat[oó]rio|pr[oó]tese).{0,50}\b(?:febre|secre[cç][aã]o|dor|sangramento|falta\s+de\s+ar|assimetria\s+s[uú]bita)\b/i,
];

const DANIEL_PATTERNS = [
  /\b(?:dr\.?|doutor)\s+daniel\b/i,
  /\bcardiolog(?:ia|ista)\b/i,
  /\bconsulta\s+(?:de\s+)?cardio\b/i,
  /\b(?:cora[cç][aã]o|card[ií]aco|card[ií]aca)\b/i,
];

const AMANDA_PATTERNS = [
  /\b(?:dra\.?|doutora)\s+amanda\b/i,
  /\bcirurg(?:ia|i[aã])\s+pl[aá]stica\b/i,
  /\bprocedimento\s+est[eé]tico\b/i,
];

const PRICE_PATTERN =
  /\b(?:pre[cç]o|valor|quanto\s+custa|quanto\s+fica|m[eé]dia|or[cç]amento)\b/i;

const SCHEDULING_PATTERN =
  /\b(?:agend(?:a|ar|amento)|marcar\s+(?:uma\s+)?consulta|hor[aá]rios?|disponibilidade|avalia[cç][aã]o|datas?)\b/i;

const SIMPLE_GREETING_PATTERN =
  /^\s*(?:oi+|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem)[!,.?\s]*$/i;

const COMMERCIAL_SOLICITATION_PATTERNS = [
  /\b(?:proposta|contato)\s+(?:comercial|de\s+parceria)\b/i,
  /\b(?:propor|fazer)\s+(?:uma\s+)?parceria\b/i,
  /\b(?:gostaria|queria|venho)\s+(?:de\s+)?(?:apresentar|oferecer)\s+(?:nossos?|meus?)\s+(?:servi[cç]os?|produtos?|solu[cç][oõ]es?)\b/i,
  /\b(?:somos|falo\s+da)\s+(?:uma\s+)?(?:ag[eê]ncia|empresa|fornecedora?|representante)\b/i,
  /\b(?:gest[aã]o\s+de\s+tr[aá]fego|social\s+media|marketing\s+digital|seo|cria[cç][aã]o\s+de\s+sites?)\b/i,
  /\b(?:aumentar|captar)\s+(?:seus?\s+)?(?:seguidores|clientes|pacientes|vendas)\b/i,
  /\b(?:publipost|permuta|patroc[ií]nio|parceria\s+(?:paga|comercial|de\s+divulga[cç][aã]o))\b/i,
  /\b(?:maquininha|m[aá]quina)\s+de\s+cart[aã]o\b/i,
];

const PROCEDURES = [
  {
    key: "lifting_facial",
    code: "M-C06-WA-01",
    patterns: [
      /\blifting\s+facial\b/i,
      /\brejuvenescimento\s+facial\b/i,
      /\britidoplastia\b/i,
    ],
  },
  {
    key: "lifting_cervical",
    code: "G-LIFT-CERV-01",
    patterns: [
      /\blifting\s+(?:de\s+)?(?:pesco[cç]o|cervical)\b/i,
      /\bcervicoplastia\b/i,
    ],
  },
  {
    key: "blefaroplastia",
    code: "G-BLEF-01",
    patterns: [/\bblefaroplastia\b/i, /\bcirurgia\s+d[ao]s?\s+p[aá]lpebras?\b/i],
  },
  {
    key: "otoplastia",
    code: "G-OTO-01",
    patterns: [/\botoplastia\b/i, /\borelha\s+(?:de\s+)?abano\b/i],
  },
  {
    key: "avaliacao_facial",
    code: "M-C01-WA-01",
    patterns: [/\bavalia[cç][aã]o\s+facial\b/i, /\bharmoniza[cç][aã]o\s+facial\b/i],
  },
  {
    key: "lip_lifting",
    code: "X-LIPLIFT-01",
    patterns: [/\blip\s*lift(?:ing)?\b/i, /\blifting\s+labial\b/i],
  },
  {
    key: "lipo_papada",
    code: "X-LIPOPAP-01",
    patterns: [/\blipo(?:aspira[cç][aã]o)?\s+(?:de\s+)?papada\b/i],
  },
  {
    key: "rinoplastia",
    code: "X-RINO-01",
    patterns: [/\brinoplastia\b/i, /\bcirurgia\s+(?:do|no)\s+nariz\b/i],
  },
  {
    key: "lipoaspiracao",
    code: "X-LIPO-01",
    patterns: [/\blipoaspira[cç][aã]o\b/i, /\blipo\s+(?:de\s+)?(?:abd[oô]men|barriga|costas|flancos)\b/i],
  },
  {
    key: "abdominoplastia",
    code: "X-ABD-01",
    patterns: [/\babdominoplastia\b/i, /\bcirurgia\s+(?:do|no)\s+abd[oô]men\b/i],
  },
  {
    key: "mastopexia",
    code: "X-MASTO-01",
    patterns: [/\bmastopexia\b/i, /\blifting\s+(?:de\s+)?mamas?\b/i],
  },
  {
    key: "protese_mama",
    code: "X-PROTESE-01",
    patterns: [/\bpr[oó]tese\s+(?:de\s+)?mama\b/i, /\bsilicone\s+(?:nos?\s+)?seios?\b/i],
  },
  {
    key: "mamoplastia_redutora",
    code: "X-REDUTORA-01",
    patterns: [/\bmamoplastia\s+redutora\b/i, /\bredu[cç][aã]o\s+(?:de\s+)?mamas?\b/i],
  },
  {
    key: "braquioplastia",
    code: "X-BRAQ-01",
    patterns: [/\bbraquioplastia\b/i, /\blifting\s+(?:de\s+)?bra[cç]os?\b/i],
  },
  {
    key: "ninfoplastia",
    code: "X-NINFO-01",
    patterns: [/\bninfoplastia\b/i, /\blabioplastia\b/i],
  },
  {
    key: "contorno_corporal",
    code: "X-CONTORNO-01",
    patterns: [/\bcontorno\s+corporal\b/i, /\bp[oó]s[- ]bari[aá]trica\b/i],
  },
  {
    key: "cirurgias_combinadas",
    code: "X-COMB-01",
    patterns: [/\bmommy\s+makeover\b/i, /\bcirurgias?\s+combinadas?\b/i],
  },
];

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectProcedure(text, reference) {
  const combined = `${reference || ""} ${text || ""}`;

  if (/\bC06H\d{2}\b/i.test(combined)) {
    return { key: "lifting_facial", code: "M-C06-WA-01" };
  }

  if (/\bC01H\d{2}\b/i.test(combined)) {
    return { key: "avaliacao_facial", code: "M-C01-WA-01" };
  }

  if (/\bLF\d{2}\b/i.test(combined)) {
    return { key: "lifting_facial", code: "G-LIFT-FAC-01" };
  }

  if (/\bLC\d{2}\b/i.test(combined)) {
    return { key: "lifting_cervical", code: "G-LIFT-CERV-01" };
  }

  if (/\bBF\d{2}\b/i.test(combined)) {
    return { key: "blefaroplastia", code: "G-BLEF-01" };
  }

  for (const procedure of PROCEDURES) {
    if (matchesAny(text, procedure.patterns)) {
      return { key: procedure.key, code: procedure.code };
    }
  }

  return null;
}

export function normalizeAutomationMode(value) {
  const mode = String(value || "shadow").trim().toLowerCase();
  return ["off", "shadow", "active"].includes(mode) ? mode : "shadow";
}

export function isSchedulingRequest(text) {
  return SCHEDULING_PATTERN.test(String(text || ""));
}

export function enrichAutomationPlanFromConversation(
  plan,
  recentConversation = [],
) {
  if (!plan || !Array.isArray(recentConversation) || !recentConversation.length) {
    return plan;
  }

  const hasClinicTurn = recentConversation.some(
    (turn) =>
      turn?.role === "assistant" ||
      ["bruna", "equipe_humana"].includes(turn?.source),
  );

  if (!hasClinicTurn) return plan;

  const contextText = recentConversation
    .map((turn) => String(turn?.text || "").trim())
    .filter(Boolean)
    .join(" ");
  const context = planAutomation({
    text: contextText,
    messageType: "text",
    reference: "",
    platform: "WhatsApp direto",
  });
  const mayContinueWithAI =
    plan.route === "human_review" &&
    ["outside_conservative_rules", "price_without_confirmed_procedure"]
      .includes(plan.reason);

  return {
    ...plan,
    route: mayContinueWithAI ? "standard_reply" : plan.route,
    reason: mayContinueWithAI
      ? "known_conversation_continuation"
      : plan.reason,
    replyCode: plan.replyCode || context.replyCode,
    professional: plan.professional || context.professional,
    procedure: plan.procedure || context.procedure,
    automaticAllowed: mayContinueWithAI ? true : plan.automaticAllowed,
  };
}

export function planAutomation({
  text,
  messageType,
  reference,
  platform,
}) {
  const normalizedText = String(text || "").trim();
  const normalizedType = String(messageType || "text").toLowerCase();
  const procedure = detectProcedure(normalizedText, reference);

  if (normalizedType !== "text" || !normalizedText) {
    return {
      route: "human_review",
      reason: "unsupported_or_empty_message",
      replyCode: null,
      professional: null,
      procedure: procedure?.key || null,
      automaticAllowed: false,
    };
  }

  if (matchesAny(normalizedText, COMMERCIAL_SOLICITATION_PATTERNS)) {
    return {
      route: "ignore",
      reason: "commercial_solicitation_or_partnership",
      replyCode: null,
      professional: null,
      procedure: null,
      automaticAllowed: false,
    };
  }

  if (matchesAny(normalizedText, URGENT_PATTERNS)) {
    return {
      route: "human_review",
      reason: "possible_urgent_symptoms",
      replyCode: "ALERT-URG-01",
      professional: null,
      procedure: procedure?.key || null,
      automaticAllowed: false,
    };
  }

  if (matchesAny(normalizedText, DANIEL_PATTERNS)) {
    return {
      route: "daniel_greeting_and_alert",
      reason: "cardiology_or_dr_daniel",
      replyCode: "DANIEL-ENC-01",
      professional: "daniel",
      procedure: null,
      automaticAllowed: true,
    };
  }

  const mentionsAmanda = matchesAny(normalizedText, AMANDA_PATTERNS);
  const asksPrice = PRICE_PATTERN.test(normalizedText);
  const asksScheduling = SCHEDULING_PATTERN.test(normalizedText);

  if (asksPrice && procedure) {
    return {
      route: "standard_reply",
      reason: "first_surgical_price_question",
      replyCode: "P-PRECO-01",
      professional: "amanda",
      procedure: procedure.key,
      automaticAllowed: true,
    };
  }

  if (procedure) {
    return {
      route: "standard_reply",
      reason: "known_procedure",
      replyCode: procedure.code,
      professional: "amanda",
      procedure: procedure.key,
      automaticAllowed: true,
    };
  }

  if (asksScheduling && mentionsAmanda) {
    return {
      route: "standard_reply",
      reason: "amanda_scheduling_without_procedure",
      replyCode: "AMANDA-AGENDA-01",
      professional: "amanda",
      procedure: null,
      automaticAllowed: true,
    };
  }

  if (SIMPLE_GREETING_PATTERN.test(normalizedText)) {
    return {
      route: "standard_reply",
      reason: "simple_greeting",
      replyCode: "ORG-DIR-01",
      professional: null,
      procedure: null,
      automaticAllowed: true,
    };
  }

  if (
    String(reference || "").startsWith("WHATSAPP-DIRETO") &&
    normalizedText.length <= 80
  ) {
    return {
      route: "standard_reply",
      reason: "short_direct_initial_inquiry",
      replyCode: "ORG-DIR-01",
      professional: null,
      procedure: null,
      automaticAllowed: true,
    };
  }

  return {
    route: "human_review",
    reason: asksPrice
      ? "price_without_confirmed_procedure"
      : "outside_conservative_rules",
    replyCode: null,
    professional: mentionsAmanda ? "amanda" : null,
    procedure: null,
    automaticAllowed: false,
    platform: platform || null,
  };
}
