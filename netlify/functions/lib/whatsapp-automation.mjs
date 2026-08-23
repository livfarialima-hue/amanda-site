import { isProfessionalExperienceDetailRequest } from "./professional-fact-review.mjs";
import { isCommercialSolicitation } from "./commercial-contact.mjs";
import {
  foldMarketingText,
  isLikelyMarketingPrefilledMessage,
  isSiteServicePickerPrefill,
  MARKETING_PREFILL_TEMPLATE_ID,
  normalizeMarketingPrefillTemplateId,
} from "./marketing-prefill.mjs";
import {
  detectProcedure,
  detectRecentClinicProcedure,
  detectRecentPatientProcedure,
} from "./procedure-context.mjs";

export { normalizeAutomationMode } from "./automation-mode.mjs";
export {
  hasCampaignReferenceCode,
  inboundReplyPriority,
  isLikelyMarketingPrefilledMessage,
  isSiteServicePickerPrefill,
  MARKETING_PREFILL_TEMPLATE_ID,
  normalizeMarketingPrefillTemplateId,
} from "./marketing-prefill.mjs";
export {
  detectCampaignProcedure,
  detectNamedProcedure,
  detectProcedure,
  detectRecentClinicProcedure,
  detectRecentPatientProcedure,
} from "./procedure-context.mjs";

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
  /\b(?:pre[cç]os?|valor(?:es)?|quanto\s+custa|quanto\s+fica|m[eé]dia|or[cç]amento|faixa(?:\s+de\s+pre[cç]os?)?)\b/i;

const PRICE_TERMS_PATTERN =
  /\b(?:parcel(?:am|amento|ar)|quantas?\s+vezes|formas?\s+de\s+pagamento)\b|\b(?:inclu[ií](?:do|da|dos|das)?|inclus[oa]s?)\b.{0,55}\b(?:hospital|anestes(?:ia|ista))\b|\b(?:hospital|anestes(?:ia|ista))\b.{0,55}\b(?:inclu[ií](?:do|da|dos|das)?|inclus[oa]s?)\b/i;

const INITIAL_PRICE_REPLY_PATTERN =
  /quanto-custa-(?:cirurgia-plastica-(?:facial|mama|corporal)|lifting-facial)-sao-paulo|valores\s+cir[uú]rgicos\s+s[aã]o\s+definidos\s+individualmente|valor\s+exato\s+ap[oó]s\s+a\s+avalia[cç][aã]o|trabalhamos\s+com\s+valores\s+competitivos|posso\s+(?:te|lhe)\s+passar\s+uma\s+faixa\s+geral(?:\s+de\s+valores)?\s+(?:como\s+refer[eê]ncia\s+inicial|como\s+ponto\s+de\s+partida)/i;

const PRICE_RANGE_OFFER_PATTERN =
  /posso\s+(?:te|lhe)\s+passar\s+uma\s+faixa\s+geral(?:\s+de\s+valores)?\s+(?:como\s+refer[eê]ncia\s+inicial|como\s+ponto\s+de\s+partida)/i;

const PRICE_RANGE_OFFER_ACCEPTANCE_PATTERN =
  /^\s*(?:(?:sim|claro|pode(?:\s+sim)?|sim[,\s]+pode|gostaria|quero)(?:[,!\s]+(?:por\s+favor|pode\s+me\s+passar|me\s+passa|a\s+faixa|essa\s+faixa|os\s+valores|essa\s+refer[eê]ncia))*|(?:pode\s+)?me\s+passa(?:r)?(?:\s+(?:a\s+faixa|os\s+valores))?(?:[,\s]+sim)?)[.!\s]*$/i;

const DIRECT_LIFTING_PRICE_PROCEDURES = new Set([
  "lifting_facial",
  "lifting_cervical",
]);
const DIRECT_OTOPLASTY_PRICE_PROCEDURES = new Set(["otoplastia"]);

const LIFTING_FACIAL_PRICE_RANGE_REPLY_PATTERN =
  /minilifting[\s\S]{0,120}R\$\s*18\s*mil\s+e\s+R\$\s*25\s*mil[\s\S]{0,500}lifting\s+facial[\s\S]{0,120}R\$\s*26\s*mil\s+e\s+R\$\s*42\s*mil/i;
const LIFTING_CERVICAL_PRICE_RANGE_REPLY_PATTERN =
  /cervicoplastia(?:\s*\(lifting\s+cervical\))?[\s\S]{0,180}R\$\s*18\s*mil\s+e\s+R\$\s*26\s*mil/i;
const OTOPLASTY_PRICE_RANGE_REPLY_PATTERN =
  /otoplastia[\s\S]{0,180}R\$\s*8\s*mil\s+e\s+R\$\s*14\s*mil/i;

function isAutomaticSurgicalPriceProcedure(procedure) {
  return (
    DIRECT_LIFTING_PRICE_PROCEDURES.has(procedure) ||
    DIRECT_OTOPLASTY_PRICE_PROCEDURES.has(procedure)
  );
}

function hasPreviousLiftingRangeReply(recentConversation, procedure) {
  if (!DIRECT_LIFTING_PRICE_PROCEDURES.has(procedure)) return false;
  const pattern = procedure === "lifting_cervical"
    ? LIFTING_CERVICAL_PRICE_RANGE_REPLY_PATTERN
    : LIFTING_FACIAL_PRICE_RANGE_REPLY_PATTERN;
  return (Array.isArray(recentConversation) ? recentConversation : []).some(
    (turn) =>
      (
        turn?.role === "assistant" ||
        ["bruna", "equipe_humana"].includes(turn?.source)
      ) && pattern.test(String(turn?.text || "")),
  );
}

const SCHEDULING_PATTERN =
  /\b(?:agend(?:a|ar|amento)|marcar\s+(?:uma\s+)?consulta|hor[aá]rios?|disponibilidade|avalia[cç][aã]o|datas?)\b/i;

const CONSULTATION_INFORMATION_PATTERN =
  /\b(?:(?:como|de\s+que\s+forma)\s+(?:funciona|[eé])|o\s+que\s+(?:acontece|[eé]\s+feito)|quer(?:o|ia)\s+entender\s+como\s+funciona).{0,50}\b(?:consulta|avalia[cç][aã]o)\b|\b(?:consulta|avalia[cç][aã]o)\b.{0,50}\b(?:como\s+funciona|passo\s+a\s+passo)\b/i;

const CONSULTATION_EXPLANATION_REQUEST_PATTERN =
  /\b(?:(?:me\s+)?(?:explica|explique|explicar|explicasse)|explique-me)\s+(?:como\s+(?:funciona|[eé])\s+)?(?:a\s+)?(?:consulta|avalia[cç][aã]o)\b/i;

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

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
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
    CONSULTATION_EXPLANATION_REQUEST_PATTERN.test(value) ||
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
    .filter(
      (turn) =>
        turn?.role !== "assistant" &&
        !["bruna", "human", "equipe_humana"].includes(
          String(turn?.source || ""),
        ),
    )
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
  const recentClinicProcedure = detectRecentClinicProcedure(recentConversation);
  const lastClinicTurn = [...recentConversation]
    .reverse()
    .find(
      (turn) =>
        turn?.role === "assistant" ||
        ["bruna", "equipe_humana"].includes(turn?.source),
    );
  const latestPatientTurn = [...recentConversation]
    .reverse()
    .find(
      (turn) =>
        turn?.role === "user" ||
        ["patient", "paciente"].includes(String(turn?.source || "")),
    );
  const acceptedPriceRangeOffer = Boolean(
    PRICE_RANGE_OFFER_PATTERN.test(String(lastClinicTurn?.text || "")) &&
      PRICE_RANGE_OFFER_ACCEPTANCE_PATTERN.test(
        String(plan.currentText || latestPatientTurn?.text || ""),
      ),
  );

  if (acceptedPriceRangeOffer) {
    const procedure =
      plan.procedure ||
      recentPatientProcedure?.key ||
      recentClinicProcedure?.key ||
      context.procedure;
    const previousLiftingRangeReply = hasPreviousLiftingRangeReply(
      recentConversation,
      procedure,
    );
    const previousOtoplastyRangeReply = recentConversation.some(
      (turn) =>
        (
          turn?.role === "assistant" ||
          ["bruna", "equipe_humana"].includes(turn?.source)
        ) &&
        OTOPLASTY_PRICE_RANGE_REPLY_PATTERN.test(
          String(turn?.text || ""),
        ),
    );

    if (
      DIRECT_LIFTING_PRICE_PROCEDURES.has(procedure) &&
      !previousLiftingRangeReply
    ) {
      return {
        ...plan,
        route: "standard_reply",
        reason: "lifting_price_range_direct",
        replyCode: "LIFTING-PRICE-RANGE-01",
        professional: "amanda",
        procedure,
        automaticAllowed: true,
      };
    }

    if (
      DIRECT_OTOPLASTY_PRICE_PROCEDURES.has(procedure) &&
      !previousOtoplastyRangeReply
    ) {
      return {
        ...plan,
        route: "standard_reply",
        reason: "otoplasty_price_range_direct",
        replyCode: "OTOPLASTY-PRICE-RANGE-01",
        professional: "amanda",
        procedure,
        automaticAllowed: true,
      };
    }

    return {
      ...plan,
      route: "human_review",
      reason: previousLiftingRangeReply
        ? "lifting_price_range_already_sent_review"
        : previousOtoplastyRangeReply
          ? "otoplasty_price_range_already_sent_review"
          : "surgical_price_range_review",
      professional: plan.professional || context.professional || "amanda",
      procedure: procedure || null,
      automaticAllowed: false,
    };
  }

  if (
    [
      "surgical_price_review",
      "price_without_confirmed_procedure",
    ].includes(plan.reason)
  ) {
    const procedure =
      plan.procedure ||
      recentPatientProcedure?.key ||
      recentClinicProcedure?.key ||
      context.procedure;
    if (isAutomaticSurgicalPriceProcedure(procedure)) {
      return {
        ...plan,
        route: "standard_reply",
        reason: "price_initial_information",
        professional: "amanda",
        procedure,
        automaticAllowed: true,
      };
    }
    return {
      ...plan,
      professional: plan.professional || context.professional || "amanda",
      procedure: procedure || null,
    };
  }

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
    const previousLiftingRangeReply = hasPreviousLiftingRangeReply(
      recentConversation,
      procedure,
    );
    const previousOtoplastyRangeReply = recentConversation.some(
      (turn) =>
        (
          turn?.role === "assistant" ||
          ["bruna", "equipe_humana"].includes(turn?.source)
        ) &&
        OTOPLASTY_PRICE_RANGE_REPLY_PATTERN.test(
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
      asksForAmount && DIRECT_LIFTING_PRICE_PROCEDURES.has(procedure);
    const directOtoplastyRange =
      asksForAmount && DIRECT_OTOPLASTY_PRICE_PROCEDURES.has(procedure);
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
    if (directOtoplastyRange && previousOtoplastyRangeReply) {
      return {
        ...plan,
        route: "human_review",
        reason: "otoplasty_price_range_already_sent_review",
        professional:
          plan.professional || context.professional || "amanda",
        procedure,
        automaticAllowed: false,
      };
    }
    return {
      ...plan,
      route: directLiftingRange || directOtoplastyRange
        ? "standard_reply"
        : "human_review",
      reason: directLiftingRange
        ? "lifting_price_range_direct"
        : directOtoplastyRange
          ? "otoplasty_price_range_direct"
        : asksForAmount
          ? procedure
            ? "surgical_price_range_review"
            : "price_range_without_confirmed_procedure"
          : "surgical_price_terms_review",
      replyCode: plan.replyCode || context.replyCode,
      professional:
        plan.professional || context.professional || "amanda",
      procedure,
      automaticAllowed: directLiftingRange || directOtoplastyRange,
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
    procedure:
      plan.procedure ||
      context.procedure ||
      recentPatientProcedure?.key ||
      recentClinicProcedure?.key,
    automaticAllowed: mayContinueWithAI ? true : plan.automaticAllowed,
  };
}

export function planAutomation({
  text,
  messageType,
  reference,
  platform,
  referralContext,
  templateId,
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
      templateId,
    });
  const prefillTemplateId = normalizeMarketingPrefillTemplateId(templateId);
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

  // A mensagem automática é somente contexto de origem. Nenhuma palavra do
  // template conta como pergunta pessoal de preço ou intenção de agenda.
  if (asksPrice && !priceMentionIsTemplateContext) {
    const procedureKey = procedure?.key || null;
    const automaticPrice = isAutomaticSurgicalPriceProcedure(procedureKey);
    return {
      route: automaticPrice ? "standard_reply" : "human_review",
      reason: automaticPrice
        ? "price_initial_information"
        : procedureKey
          ? "surgical_price_review"
          : "price_without_confirmed_procedure",
      replyCode: null,
      professional: "amanda",
      procedure: procedureKey,
      automaticAllowed: automaticPrice,
      priceRequestKind: asksPriceTerms ? "terms" : "amount",
      platform: platform || null,
      currentText: normalizedText,
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
      marketingPrefill: true,
      prefillTemplateId,
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
      marketingPrefill: marketingPrefilledMessage,
      prefillTemplateId,
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
    currentText: normalizedText,
  };
}
