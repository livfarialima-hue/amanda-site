const CAMPAIGN_PROCEDURE_RULES = [
  {
    pattern: /\bM26F(?:01W|02S)\b/i,
    key: "lifting_facial",
    code: "M-C06-WA-01",
  },
  {
    pattern: /\bM26C(?:01W|02S)\b/i,
    key: "lifting_cervical",
    code: "G-LIFT-CERV-01",
  },
  {
    pattern: /\bM26O01W\b/i,
    key: "otoplastia",
    code: "G-OTO-01",
  },
];

const PROCEDURES = [
  {
    key: "lifting_facial",
    code: "M-C06-WA-01",
    patterns: [
      /\blifting\s+facial\b/i,
      /\bmini[\s-]*lifting\b/i,
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
    key: "frontoplastia",
    code: "X-FRONTO-01",
    patterns: [
      /\bfrontoplastia\b/i,
      /\bredu[cç][aã]o\s+(?:da\s+)?testa\b/i,
      /\bavan[cç]o\s+(?:da\s+)?linha\s+capilar\b/i,
    ],
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

export function detectNamedProcedure(text) {
  const normalizedText = String(text || "");
  for (const procedure of PROCEDURES) {
    if (matchesAny(normalizedText, procedure.patterns)) {
      return { key: procedure.key, code: procedure.code };
    }
  }
  return null;
}

export function detectCampaignProcedure(text) {
  const normalizedText = String(text || "");
  for (const campaign of CAMPAIGN_PROCEDURE_RULES) {
    if (campaign.pattern.test(normalizedText)) {
      return { key: campaign.key, code: campaign.code };
    }
  }
  return null;
}

export function detectProcedure(text, reference, referralContext) {
  const referralText =
    referralContext && typeof referralContext === "object"
      ? Object.values(referralContext).join(" ")
      : String(referralContext || "");
  const combined = `${reference || ""} ${referralText} ${text || ""}`;

  const namedInCurrentMessage = detectNamedProcedure(text);
  if (namedInCurrentMessage) return namedInCurrentMessage;

  if (/\bC06(?:H\d{2})?\b/i.test(combined)) {
    return { key: "lifting_facial", code: "M-C06-WA-01" };
  }
  if (/\bC01(?:H\d{2})?\b/i.test(combined)) {
    return { key: "avaliacao_facial", code: "M-C01-WA-01" };
  }

  const campaignProcedure = detectCampaignProcedure(combined);
  if (campaignProcedure) return campaignProcedure;

  if (/\b(?:G26LIFT|LF\d{2})\b/i.test(combined)) {
    return { key: "lifting_facial", code: "G-LIFT-FAC-01" };
  }
  if (/\b(?:G26CERV|LC\d{2})\b/i.test(combined)) {
    return { key: "lifting_cervical", code: "G-LIFT-CERV-01" };
  }
  if (/\b(?:G26BLEF|BF\d{2})\b/i.test(combined)) {
    return { key: "blefaroplastia", code: "G-BLEF-01" };
  }
  if (/\b(?:G26OTO|OT\d{2})\b/i.test(combined)) {
    return { key: "otoplastia", code: "G-OTO-01" };
  }
  if (/\bG26FACE\b/i.test(combined)) {
    return { key: "avaliacao_facial", code: "M-C01-WA-01" };
  }

  const namedInContext = detectNamedProcedure(combined);
  if (namedInContext) return namedInContext;

  if (/\blifting\b/i.test(combined)) {
    return { key: "lifting_facial", code: "M-C06-WA-01" };
  }
  return null;
}

export function detectRecentPatientProcedure(recentConversation) {
  const turns = Array.isArray(recentConversation)
    ? recentConversation.slice(-16)
    : [];
  const patientTurns = turns.filter(
    (turn) =>
      turn?.role !== "assistant" &&
      !["bruna", "equipe_humana"].includes(turn?.source),
  );

  for (const turn of patientTurns.reverse()) {
    const procedure = detectProcedure(
      turn?.text,
      turn?.reference,
      turn?.referralContext,
    );
    if (procedure) return procedure;
  }
  return null;
}

export function detectRecentClinicProcedure(recentConversation) {
  const turns = Array.isArray(recentConversation)
    ? recentConversation.slice(-16)
    : [];
  const clinicTurns = turns.filter(
    (turn) =>
      turn?.role === "assistant" ||
      ["bruna", "human", "equipe_humana"].includes(
        String(turn?.source || ""),
      ),
  );
  for (const turn of clinicTurns.reverse()) {
    const procedure = detectProcedure(turn?.text, "", null);
    if (procedure) return procedure;
  }
  return null;
}
