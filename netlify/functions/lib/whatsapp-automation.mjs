import { isProfessionalExperienceDetailRequest } from "./professional-fact-review.mjs";
import { isCommercialSolicitation } from "./commercial-contact.mjs";

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

const PRICE_AMOUNT_PATTERN =
  /\b(?:pre[cç]o|valor|quanto\s+custa|quanto\s+fica|m[eé]dia|or[cç]amento|faixa(?:\s+de\s+pre[cç]o)?)\b/i;

const PRICE_TERMS_PATTERN =
  /\b(?:parcel(?:am|amento|ar)|quantas?\s+vezes|formas?\s+de\s+pagamento)\b|\b(?:inclu[ií](?:do|da|dos|das)?|inclus[oa]s?)\b.{0,55}\b(?:hospital|anestes(?:ia|ista))\b|\b(?:hospital|anestes(?:ia|ista))\b.{0,55}\b(?:inclu[ií](?:do|da|dos|das)?|inclus[oa]s?)\b/i;

const INITIAL_PRICE_REPLY_PATTERN =
  /quanto-custa-(?:cirurgia-plastica-facial|lifting-facial)-sao-paulo|valores\s+cir[uú]rgicos\s+s[aã]o\s+definidos\s+individualmente|valor\s+exato\s+ap[oó]s\s+a\s+avalia[cç][aã]o|trabalhamos\s+com\s+valores\s+competitivos/i;

const LIFTING_PRICE_RANGE_REPLY_PATTERN =
  /minilifting[\s\S]{0,120}R\$\s*18\s*mil\s+e\s+R\$\s*25\s*mil[\s\S]{0,500}lifting\s+facial[\s\S]{0,120}R\$\s*26\s*mil\s+e\s+R\$\s*42\s*mil/i;

const SCHEDULING_PATTERN =
  /\b(?:agend(?:a|ar|amento)|marcar\s+(?:uma\s+)?consulta|hor[aá]rios?|disponibilidade|avalia[cç][aã]o|datas?)\b/i;

const CONSULTATION_INFORMATION_PATTERN =
  /\b(?:(?:como|de\s+que\s+forma)\s+(?:funciona|[eé])|o\s+que\s+(?:acontece|[eé]\s+feito)|quer(?:o|ia)\s+entender\s+como\s+funciona).{0,50}\b(?:consulta|avalia[cç][aã]o)\b|\b(?:consulta|avalia[cç][aã]o)\b.{0,50}\b(?:como\s+funciona|passo\s+a\s+passo)\b/i;

const CONSULTATION_ACCESS_PATTERN =
  /\bcomo\s+(?:eu\s+)?fa[cç]o\s+para\s+(?:passar|marcar|agendar)\s+(?:em|uma)?\s*(?:consulta|avalia[cç][aã]o)\b/i;

const CONSULTATION_PRICE_PATTERN =
  /\b(?:pre[cç]o|valor|quanto\s+custa|quanto\s+fica)\b.{0,45}\b(?:da\s+)?(?:consulta|avalia[cç][aã]o)\b|\b(?:consulta|avalia[cç][aã]o)\b.{0,45}\b(?:pre[cç]o|valor|quanto\s+custa|quanto\s+fica)\b/i;

const AVAILABILITY_REQUEST_PATTERN =
  /\b(?:consultar|conferir|ver|saber)\s+(?:a\s+)?disponibilidade\b|\b(?:quais?|ver|consultar|conferir|saber)\b.{0,35}\b(?:hor[aá]rios?|datas?)\b|\b(?:agendar|marcar)\s+(?:uma\s+)?(?:consulta|avalia[cç][aã]o)\b/i;

const STANDARD_PRICE_AVAILABILITY_TEMPLATE_PATTERN =
  /^ola,?\s+li sobre (?:os\s+)?(?:valor(?:es)?|precos?) (?:de|do|da) .{2,120}? e gostaria de (?:consultar|ver) (?:os\s+)?horarios para uma avaliacao com a dra\.? amanda\.?(?:\s+ref(?:erencia)?\.?\s*:?\s*[a-z0-9-]+)?(?:\s+jid\s*:\s*[a-z0-9_-]+)?$/i;

const SIMPLE_GREETING_PATTERN =
  /^\s*(?:oi+|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem)[!,.?\s]*$/i;

const OPEN_CLINIC_QUESTION_PATTERN =
  /\b(?:cl[ií]nica|consulta|avalia[cç][aã]o|cirurgia|procedimento|doutor[ae]?|dra\.?|dr\.?|paciente|acompanhante|endere[cç]o|estacionamento|acessibilidade|nota\s+fiscal|recibo|pagamento|pix|cart[aã]o|hor[aá]rio|atendimento|retorno)\b/i;

const OFFICIAL_INSTAGRAM_REQUEST_PATTERN =
  /\b(?:instagram|insta|perfil\s+(?:oficial|da\s+dra\.?\s+amanda)|rede(?:s)?\s+social(?:is)?|arroba\s+da\s+dra\.?\s+amanda)\b/i;

const CAMPAIGN_REFERENCE_QUESTION_PATTERN =
  /\b(?:n[aã]o\s+entendi|o\s+que\s+(?:[eé]|significa)|que\s+c[oó]digo\s+[eé]\s+esse|para\s+que\s+serve|pra\s+que\s+serve)\b.{0,55}\b(?:ref\.?|refer[eê]ncias?|c[oó]digo)\b|\b(?:ref\.?|refer[eê]ncias?|c[oó]digo)\b.{0,55}\b(?:n[aã]o\s+entendi|o\s+que\s+(?:[eé]|significa)|para\s+que\s+serve|pra\s+que\s+serve)\b/i;

const CAMPAIGN_REFERENCE_CODE_PATTERN =
  /\b(?:M26|G26)[A-Z0-9_-]+\b/i;

const LEGACY_ADMINISTRATIVE_REQUEST_PATTERN =
  /\b(?:nota\s+fiscal|recibo|documento|cadastro)\b.{0,50}\b(?:antig[oa]|anterior|corrigir|alterar|segunda\s+via)\b|\b(?:antig[oa]|anterior)\b.{0,50}\b(?:nota\s+fiscal|recibo|documento|cadastro)\b/i;

const EXISTING_PATIENT_FOLLOW_UP_PATTERNS = [
  /\b(?:segue|envio|encaminho|anexo).{0,60}\b(?:documentos?|exames?|termos?|contratos?)\b/i,
  /\b(?:documentos?|exames?|termos?|contratos?).{0,50}\bassinad[oa]s?\b/i,
  /\b(?:dar|dando|para\s+dar)\s+seguimento.{0,60}\b(?:cirurgia|procedimento|tr[âa]mite)\b/i,
  /\b(?:tr[âa]mite|andamento).{0,60}\b(?:cirurgia|procedimento)\b/i,
];

const PENDING_HOSPITAL_QUOTE_PATTERNS = [
  /\b(?:valor|pre[c\u00e7]o|custo|or[c\u00e7]amento).{0,45}\b(?:do|de|referente\s+ao)\s+hospital\b/i,
  /\bhospital.{0,45}\b(?:valor|pre[c\u00e7]o|custo|or[c\u00e7]amento)\b/i,
  /\b(?:quando|assim\s+que).{0,40}\b(?:tiver|souber|confirmar).{0,40}\b(?:valor|or[c\u00e7]amento).{0,40}\bhospital\b/i,
];

const HOSPITAL_SETTING_QUESTION_PATTERN =
  /\b(?:feito|feita|realizad[oa]|operad[oa]|acontece|ocorre)\b.{0,35}\b(?:em|no|num)\s+(?:um\s+)?(?:hospital|ambiente\s+hospitalar)\b|\b(?:[eé]|acontece|ocorre)\s+(?:em|no|num)\s+(?:um\s+)?(?:hospital|ambiente\s+hospitalar)\b/i;

const APPROVED_HOSPITAL_LIFTING_PROCEDURES = new Set([
  "lifting_facial",
  "lifting_cervical",
]);

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

const APPEARANCE_DISTRESS_PATTERNS = [
  /\b(?:minha\s+)?apar[eê]ncia.{0,45}\b(?:arruinou|acabou\s+com)\s+(?:a\s+)?minha\s+vida\b/i,
  /\b(?:meu\s+rosto|minha\s+face|meu\s+corpo).{0,45}\b(?:arruinou|acabou\s+com)\s+(?:a\s+)?minha\s+vida\b/i,
  /\b(?:odeio|detesto)\s+(?:o\s+)?(?:meu\s+rosto|minha\s+face|minha\s+apar[eê]ncia|meu\s+corpo)\b/i,
  /\bpreciso\s+(?:operar|fazer\s+(?:a\s+)?cirurgia).{0,60}\b(?:salvar|manter)\s+(?:meu|minha|o|a)\s+(?:casamento|relacionamento|emprego|trabalho)\b/i,
  /\b(?:preciso|quero|tenho\s+que)\s+ser\s+perfeit[oa]\b/i,
  /\bnunca\s+(?:vou|irei)\s+ficar\s+satisfeit[oa]\b/i,
];

const RECENT_GREETING_SUPPRESSION_MS = 3 * 60 * 1_000;

const IRRELEVANT_PERSONAL_PATTERNS = [
  /\b(?:vamos|quer|queria|gostaria|topa|aceita)\s+(?:ir\s+)?(?:almo[cç]ar|jantar|tomar\s+(?:um\s+)?caf[eé]|sair\s+comigo|dar\s+uma\s+volta)\b/i,
  /\b(?:posso|queria|gostaria)\s+(?:te|lhe|a\s+dra\.?\s+amanda)\s+convidar\s+para\b/i,
  /\b(?:dra\.?\s+amanda|voc[eê])\s+(?:est[aá]|[eé])\s+(?:solteira|casada|namorando)\b/i,
  /\b(?:achei|acho)\s+(?:voc[eê]|a\s+dra\.?\s+amanda)\s+(?:linda|gata|bonita)\b/i,
  /\bme\s+passa\s+(?:seu|o\s+seu)\s+(?:instagram|insta|telefone|whatsapp)\s+pessoal\b/i,
  /\b(?:manda|envia)\s+(?:uma\s+)?(?:foto\s+sua|selfie|nude)\b/i,
  /\b(?:o\s+que|onde)\s+(?:voc[eê]|a\s+dra\.?\s+amanda)\s+(?:vai\s+)?(?:almo[cç]ar|jantar)\b/i,
  /\b(?:vamos|bora)\s+(?:beber|tomar\s+uma|pro\s+bar|para\s+o\s+bar)\b/i,
  /\b(?:qual\s+(?:[eé]\s+)?(?:o\s+)?seu\s+signo|voc[eê]\s+acredita\s+em\s+astrologia)\b/i,
  /\b(?:como\s+est[aá]\s+o\s+tempo|vai\s+chover|qual\s+a\s+previs[aã]o\s+do\s+tempo)\b/i,
];

const GENERIC_CLINIC_INTENT_PATTERN =
  /\b(?:cl[ií]nica|consulta|atendimento|procedimento|cirurgia|tratamento|avalia[cç][aã]o|m[eé]dic[ao]|doutor[ae]?|dra?\.?|paciente|conv[eê]nio|particular|p[oó]s[- ]operat[oó]rio|recupera[cç][aã]o|cicatriz|endere[cç]o|localiza[cç][aã]o|informa[cç][oõ]es?|saber\s+mais)\b/i;

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

function detectNamedProcedure(text) {
  const normalizedText = String(text || "");
  for (const procedure of PROCEDURES) {
    if (matchesAny(normalizedText, procedure.patterns)) {
      return { key: procedure.key, code: procedure.code };
    }
  }

  return null;
}

function detectCampaignProcedure(text) {
  const normalizedText = String(text || "");
  for (const campaign of CAMPAIGN_PROCEDURE_RULES) {
    if (campaign.pattern.test(normalizedText)) {
      return { key: campaign.key, code: campaign.code };
    }
  }

  return null;
}

function detectProcedure(text, reference, referralContext) {
  const referralText =
    referralContext && typeof referralContext === "object"
      ? Object.values(referralContext).join(" ")
      : String(referralContext || "");
  const combined = `${reference || ""} ${referralText} ${text || ""}`;

  // O procedimento dito pela própria pessoa prevalece sobre uma referência
  // antiga ou divergente que ainda esteja anexada à conversa.
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

  // Em conversas sobre cirurgia da face, pacientes frequentemente usam apenas
  // "lifting" para se referir ao lifting facial. As variações com região
  // (cervical, mamas, braços ou lábios) já foram resolvidas acima.
  if (/\blifting\b/i.test(combined)) {
    return { key: "lifting_facial", code: "M-C06-WA-01" };
  }

  return null;
}

function detectRecentPatientProcedure(recentConversation) {
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

export function normalizeAutomationMode(value) {
  const mode = String(value || "shadow").trim().toLowerCase();
  return ["off", "shadow", "active"].includes(mode) ? mode : "shadow";
}

export function isSchedulingRequest(text) {
  const normalizedText = String(text || "");
  return (
    !isConsultationInformationRequest(normalizedText) &&
    SCHEDULING_PATTERN.test(normalizedText)
  );
}

export function isConsultationInformationRequest(text) {
  const value = String(text || "");
  return (
    CONSULTATION_INFORMATION_PATTERN.test(value) ||
    CONSULTATION_ACCESS_PATTERN.test(value) ||
    CONSULTATION_PRICE_PATTERN.test(value)
  );
}

export function isConsultationPriceRequest(text) {
  return CONSULTATION_PRICE_PATTERN.test(String(text || ""));
}

export function isAvailabilityRequest(text) {
  const value = String(text || "");
  return (
    AVAILABILITY_REQUEST_PATTERN.test(value) ||
    CONSULTATION_ACCESS_PATTERN.test(value)
  );
}

function foldMarketingText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isSiteServicePickerPrefill(text) {
  const normalizedText = foldMarketingText(text);
  return (
    /\borigem do contato\s*:\s*site liv faria lima\b/i.test(
      normalizedText,
    ) &&
    /\bgostaria de (?:agendar|marcar) uma consulta\b/i.test(
      normalizedText,
    ) &&
    /\bcirurgia plastica\/estetica\b/i.test(normalizedText) &&
    /\bcardiologia\b/i.test(normalizedText)
  );
}

export function inboundReplyPriority(text) {
  const normalizedText = foldMarketingText(text);
  if (isSiteServicePickerPrefill(normalizedText)) return 10;
  if (/^(?:oi|ola|bom dia|boa tarde|boa noite)[!.\s]*$/i.test(normalizedText)) {
    return 30;
  }
  return 100;
}

export function isInsuranceAcceptanceRequest(text) {
  const normalizedText = foldMarketingText(text);
  const mentionsInsurance =
    /\b(?:convenio|plano de saude|amil|unimed|bradesco saude|sulamerica|sul america|porto saude|omint|care plus|notredame|hapvida)\b/i.test(
      normalizedText,
    );
  const asksAcceptance =
    /\b(?:aceita|aceitam|atende|atendem|trabalha|trabalham|passa)\b/i.test(
      normalizedText,
    );
  return mentionsInsurance && asksAcceptance;
}

export function isLikelyMarketingPrefilledMessage({
  text,
  reference,
  platform,
  referralContext,
} = {}) {
  const normalizedText = foldMarketingText(text);
  const sourceContext = foldMarketingText(
    [
      platform,
      reference,
      referralContext && typeof referralContext === "object"
        ? JSON.stringify(referralContext)
        : referralContext,
    ].join(" "),
  );
  const hasEmbeddedAttribution =
    /\bgbraid\s*:|\bref\.?(?:\s*:)?\s*[a-z0-9-]{5,}|\breferencia\s*:|\borigem do contato\s*:\s*site liv faria lima/i.test(
      normalizedText,
    );
  const hasMarketingSource =
    hasEmbeddedAttribution ||
    /\b(?:google|meta|facebook|instagram)\b/i.test(sourceContext) ||
    /\b(?:g26|m26|(?:lf|lc|bf|ot)\d{2}|c0[16])\b/i.test(
      sourceContext,
    );

  if (!hasMarketingSource) return false;

  const googleConsultationTemplate =
    /\bgostaria de saber como funciona a consulta com a dra\.? amanda\b/i.test(
      normalizedText,
    ) &&
    /\bconsultar a disponibilidade\b/i.test(normalizedText);
  const metaProcedureTemplate =
    /\b(?:quero|gostaria de) saber sobre .{2,100}\bcom a dra\.? amanda\b/i.test(
      normalizedText,
    );
  const siteConsultationTemplate =
    /\bgostaria de (?:consultar os horarios|ver horarios)\b/i.test(
      normalizedText,
    ) &&
    /\b(?:consulta|avaliacao|dra\.? amanda)\b/i.test(normalizedText);
  const siteServicePickerTemplate =
    isSiteServicePickerPrefill(normalizedText);

  return (
    googleConsultationTemplate ||
    metaProcedureTemplate ||
    siteConsultationTemplate ||
    siteServicePickerTemplate
  );
}

export function enrichAutomationPlanFromConversation(
  plan,
  recentConversation = [],
  now = Date.now(),
) {
  if (!plan || !Array.isArray(recentConversation) || !recentConversation.length) {
    return plan;
  }

  const hasClinicTurn = recentConversation.some(
    (turn) =>
      turn?.role === "assistant" ||
      ["bruna", "equipe_humana"].includes(turn?.source),
  );

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
  const recentPatientProcedure = detectRecentPatientProcedure(recentConversation);

  if (plan.reason === "hospital_setting_context_required") {
    if (
      APPROVED_HOSPITAL_LIFTING_PROCEDURES.has(recentPatientProcedure?.key)
    ) {
      return {
        ...plan,
        route: "standard_reply",
        reason: "hospital_setting_request",
        replyCode: "AMANDA-HOSPITAL-01",
        professional: "amanda",
        procedure: recentPatientProcedure.key,
        automaticAllowed: true,
      };
    }

    if (recentPatientProcedure) {
      return {
        ...plan,
        procedure: recentPatientProcedure.key,
      };
    }
  }

  if (!hasClinicTurn) return plan;

  if (plan.reason === "simple_greeting") {
    const lastClinicTurn = [...recentConversation]
      .reverse()
      .find(
        (turn) =>
          turn?.role === "assistant" ||
          ["bruna", "equipe_humana"].includes(turn?.source),
      );
    const lastClinicTurnAt = new Date(lastClinicTurn?.at || 0).getTime();

    if (
      Number.isFinite(lastClinicTurnAt) &&
      now - lastClinicTurnAt >= 0 &&
      now - lastClinicTurnAt <= RECENT_GREETING_SUPPRESSION_MS
    ) {
      return {
        ...plan,
        route: "ignore",
        reason: "repeated_greeting_after_recent_reply",
        automaticAllowed: false,
      };
    }
  }

  const priceRequest =
    plan.reason === "price_initial_information";

  if (priceRequest) {
    const procedure = plan.procedure || context.procedure;
    const previousInitialPriceReply = recentConversation.some(
      (turn) =>
        (
          turn?.role === "assistant" ||
          ["bruna", "equipe_humana"].includes(turn?.source)
        ) &&
        INITIAL_PRICE_REPLY_PATTERN.test(String(turn?.text || "")),
    );
    const previousLiftingRangeReply = recentConversation.some(
      (turn) =>
        (
          turn?.role === "assistant" ||
          ["bruna", "equipe_humana"].includes(turn?.source)
        ) &&
        LIFTING_PRICE_RANGE_REPLY_PATTERN.test(
          String(turn?.text || ""),
        ),
    );

    if (!previousInitialPriceReply) {
      return {
        ...plan,
        professional: plan.professional || "amanda",
        procedure,
      };
    }

    const asksForAmount = plan.priceRequestKind === "amount";
    const directLiftingRange =
      asksForAmount && procedure === "lifting_facial";
    if (directLiftingRange && previousLiftingRangeReply) {
      return {
        ...plan,
        route: "human_review",
        reason: "lifting_price_range_already_sent_review",
        professional:
          plan.professional || context.professional || "amanda",
        procedure,
        automaticAllowed: false,
      };
    }
    return {
      ...plan,
      route: directLiftingRange
        ? "standard_reply"
        : "human_review",
      reason: directLiftingRange
        ? "lifting_price_range_direct"
        : asksForAmount
          ? procedure
            ? "surgical_price_range_review"
            : "price_range_without_confirmed_procedure"
          : "surgical_price_terms_review",
      replyCode: plan.replyCode || context.replyCode,
      professional:
        plan.professional || context.professional || "amanda",
      procedure,
      automaticAllowed: directLiftingRange,
    };
  }

  const mayContinueWithAI =
    plan.route === "human_review" &&
    plan.reason === "outside_conservative_rules";

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
  referralContext,
}) {
  const normalizedText = String(text || "").trim();
  const normalizedType = String(messageType || "text").toLowerCase();
  const procedure = detectProcedure(
    normalizedText,
    reference,
    referralContext,
  );
  const siteServicePickerPrefill =
    isSiteServicePickerPrefill(normalizedText);

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

  if (isCommercialSolicitation(normalizedText)) {
    return {
      route: "ignore",
      reason: "commercial_solicitation_or_partnership",
      replyCode: null,
      professional: null,
      procedure: null,
      automaticAllowed: false,
    };
  }

  if (matchesAny(normalizedText, IRRELEVANT_PERSONAL_PATTERNS)) {
    return {
      route: "ignore",
      reason: "irrelevant_or_personal_contact",
      replyCode: null,
      professional: null,
      procedure: null,
      automaticAllowed: false,
    };
  }

  if (matchesAny(normalizedText, PENDING_HOSPITAL_QUOTE_PATTERNS)) {
    return {
      route: "human_review",
      reason: "pending_hospital_quote_followup",
      replyCode: null,
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: false,
    };
  }

  if (matchesAny(normalizedText, EXISTING_PATIENT_FOLLOW_UP_PATTERNS)) {
    return {
      route: "human_review",
      reason: "existing_patient_administrative_followup",
      replyCode: null,
      professional: null,
      procedure: procedure?.key || null,
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

  if (matchesAny(normalizedText, APPEARANCE_DISTRESS_PATTERNS)) {
    return {
      route: "human_review",
      reason: "intense_appearance_distress",
      replyCode: null,
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: false,
    };
  }

  if (
    !siteServicePickerPrefill &&
    matchesAny(normalizedText, DANIEL_PATTERNS)
  ) {
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
  const asksPriceAmount = PRICE_AMOUNT_PATTERN.test(normalizedText);
  const asksPriceTerms = PRICE_TERMS_PATTERN.test(normalizedText);
  const asksPrice = asksPriceAmount || asksPriceTerms;
  const asksScheduling = SCHEDULING_PATTERN.test(normalizedText);
  const marketingPrefilledMessage =
    isLikelyMarketingPrefilledMessage({
      text: normalizedText,
      reference,
      platform,
      referralContext,
    });
  const priceMentionIsTemplateContext =
    marketingPrefilledMessage &&
    STANDARD_PRICE_AVAILABILITY_TEMPLATE_PATTERN.test(
      foldMarketingText(normalizedText),
    );
  const asksConsultationInformation =
    !marketingPrefilledMessage &&
    isConsultationInformationRequest(normalizedText);
  const asksInsuranceAcceptance =
    isInsuranceAcceptanceRequest(normalizedText);

  if (asksInsuranceAcceptance) {
    return {
      route: "standard_reply",
      reason: "insurance_acceptance_request",
      replyCode: "INSURANCE-ACCEPTANCE-01",
      professional: mentionsAmanda ? "amanda" : null,
      procedure: procedure?.key || null,
      automaticAllowed: true,
    };
  }

  if (CAMPAIGN_REFERENCE_QUESTION_PATTERN.test(normalizedText)) {
    return {
      route: "standard_reply",
      reason: "campaign_reference_explanation",
      replyCode: "CAMPAIGN-REFERENCE-01",
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: true,
    };
  }

  if (OFFICIAL_INSTAGRAM_REQUEST_PATTERN.test(normalizedText)) {
    return {
      route: "standard_reply",
      reason: "official_instagram_request",
      replyCode: "AMANDA-OFFICIAL-LINKS-01",
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: true,
    };
  }

  if (LEGACY_ADMINISTRATIVE_REQUEST_PATTERN.test(normalizedText)) {
    return {
      route: "human_review",
      reason: "existing_patient_administrative_followup",
      replyCode: null,
      professional: null,
      procedure: procedure?.key || null,
      automaticAllowed: false,
    };
  }

  if (HOSPITAL_SETTING_QUESTION_PATTERN.test(normalizedText)) {
    const approvedProcedure =
      APPROVED_HOSPITAL_LIFTING_PROCEDURES.has(procedure?.key);
    return {
      route: approvedProcedure ? "standard_reply" : "human_review",
      reason: approvedProcedure
        ? "hospital_setting_request"
        : "hospital_setting_context_required",
      replyCode: approvedProcedure ? "AMANDA-HOSPITAL-01" : null,
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: approvedProcedure,
    };
  }

  if (isProfessionalExperienceDetailRequest(normalizedText)) {
    return {
      route: "human_review",
      reason: "professional_experience_detail_review",
      replyCode: "AMANDA-EXPERIENCE-PARTIAL-01",
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: false,
    };
  }

  if (asksConsultationInformation) {
    return {
      route: "standard_reply",
      reason: "consultation_information_request",
      replyCode: "AMANDA-CONSULTA-INFO-01",
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: true,
      consultationPriceRequested:
        isConsultationPriceRequest(normalizedText),
    };
  }

  // Marketing templates can mention "valores" as source context without the
  // patient having written a new price question. Keep the template on its
  // procedure-opening route so the webhook can collect the scheduling
  // preference promised by the standard message.
  if (asksPrice && !priceMentionIsTemplateContext) {
    return {
      route: "standard_reply",
      reason: "price_initial_information",
      replyCode: null,
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: true,
      priceRequestKind: asksPriceTerms ? "terms" : "amount",
      platform: platform || null,
    };
  }

  if (marketingPrefilledMessage && !procedure) {
    return {
      route: "standard_reply",
      reason: "marketing_prefilled_without_procedure",
      replyCode: "ORG-DIR-01",
      professional: null,
      procedure: null,
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
      priceMentionIsTemplateContext,
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
    String(platform || "").trim().toLowerCase() === "meta" &&
    referralContext &&
    typeof referralContext === "object"
  ) {
    return {
      route: "standard_reply",
      reason: "meta_referral_initial_inquiry",
      replyCode: procedure?.code || "META-DIR-01",
      professional: "amanda",
      procedure: procedure?.key || null,
      automaticAllowed: true,
    };
  }

  if (
    String(reference || "").startsWith("WHATSAPP-DIRETO") &&
    normalizedText.length <= 80 &&
    GENERIC_CLINIC_INTENT_PATTERN.test(normalizedText)
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

  const openClinicQuestion =
    OPEN_CLINIC_QUESTION_PATTERN.test(normalizedText) &&
    (/\?/.test(normalizedText) ||
      /\b(?:como|onde|qual|quais|quanto|tem|pode|aceita|funciona)\b/i.test(
        normalizedText,
      ));

  return {
    // Hard safety, care, scheduling, commercial and administrative cases were
    // already handled above. Everything else reaches the AI so it can decide
    // from meaning and context instead of treating missing punctuation or an
    // unexpected phrasing as an automatic human handoff.
    route: "standard_reply",
    reason: openClinicQuestion
      ? "open_question_for_ai"
      : "ai_safety_triage",
    replyCode: null,
    professional: mentionsAmanda ? "amanda" : null,
    procedure: null,
    automaticAllowed: true,
    platform: platform || null,
  };
}

export function hasCampaignReferenceCode(value) {
  return CAMPAIGN_REFERENCE_CODE_PATTERN.test(String(value || ""));
}
