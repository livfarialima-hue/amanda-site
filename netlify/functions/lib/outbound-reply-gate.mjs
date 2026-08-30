import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import {
  CONVERSATION_ACTIONS,
  isExplicitDeferralWithoutRequest,
  isReplyToHumanContextWithoutStandaloneRequest,
  isSimpleConversationClosing,
} from "./conversation-action-controller.mjs";
import { sendYCloudPatientText } from "./ycloud-patient-message.mjs";
import { recordDurableConversationTurn } from "./conversation-ledger.mjs";
import { hasInternalReferenceExposure } from "./internal-reference-guard.mjs";

const STORE_NAME = "liv-whatsapp-outbound-replies-v1";
const CLAIM_TTL_MS = 2 * 60 * 1_000;
const MAX_REPLY_LENGTH = 1_500;
const LIFTING_PRICE_GUIDE_PATTERN =
  /^https:\/\/draamandaschroeder\.com\.br\/conteudos\/quanto-custa-lifting-facial-sao-paulo\/?$/i;
const FACIAL_PRICE_GUIDE_PATTERN =
  /^https:\/\/draamandaschroeder\.com\.br\/conteudos\/quanto-custa-cirurgia-plastica-facial-sao-paulo\/?$/i;
const FULL_LIFTING_RANGE_PATTERN =
  /minilifting[\s\S]{0,120}R\$\s*18\s*mil\s+e\s+R\$\s*25\s*mil[\s\S]{0,500}lifting\s+facial[\s\S]{0,120}R\$\s*26\s*mil\s+e\s+R\$\s*42\s*mil/i;
const FULL_CERVICAL_RANGE_PATTERN =
  /cervicoplastia(?:\s*\(lifting\s+cervical\))?[\s\S]{0,180}R\$\s*18\s*mil\s+e\s+R\$\s*26\s*mil/i;
const FULL_OTOPLASTY_RANGE_PATTERN =
  /otoplastia[\s\S]{0,180}R\$\s*8\s*mil\s+e\s+R\$\s*14\s*mil/i;

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : "";
}

function limited(value, maximumLength = 1_500) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizedText(value) {
  return limited(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function urls(value) {
  return limited(value).match(/https?:\/\/[^\s)]+/gi) || [];
}

function withoutLinkBearingSentences(value) {
  const linkMarker = "\uE000LIV_LINK\uE001";
  const marked = String(value || "").replace(
    /https?:\/\/[^\s)]+/gi,
    (match) => `${linkMarker}${/[.!?]$/.test(match) ? match.slice(-1) : ""}`,
  );
  const kept = marked
    .split(/(?:\r?\n)+|(?<=[.!?])\s+/u)
    .filter((sentence) => !sentence.includes(linkMarker))
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return kept
    .join(" ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function conformOutboundReplyToContract({
  body,
  conversationAction,
}) {
  const reply = String(body || "").trim();
  const maxLinks = conversationAction?.replyContract?.maxLinks;
  if (
    ![0, "0"].includes(maxLinks) ||
    urls(reply).length === 0
  ) {
    return reply;
  }

  return withoutLinkBearingSentences(reply);
}

function conversationContainsFacialPriceGuide(recentConversation) {
  return (Array.isArray(recentConversation)
    ? recentConversation
    : []
  ).some((turn) =>
    urls(turn?.text).some(
      (url) =>
        FACIAL_PRICE_GUIDE_PATTERN.test(url) ||
        LIFTING_PRICE_GUIDE_PATTERN.test(url),
    ),
  );
}

function isProtectedLiftingRangeReply(value, recentConversation = []) {
  const text = normalizedText(value);
  const replyUrls = urls(value);
  const hasRequiredGuide = replyUrls.length === 1
    ? LIFTING_PRICE_GUIDE_PATTERN.test(replyUrls[0])
    : replyUrls.length === 0 &&
      conversationContainsFacialPriceGuide(recentConversation);
  return (
    FULL_LIFTING_RANGE_PATTERN.test(String(value || "")) &&
    /nao e orcamento proposta nem garantia de preco/.test(text) &&
    /valor final e definido apos avaliacao e planejamento e pode ficar fora dessa faixa/.test(
      text,
    ) &&
    /nao representa honorarios isolados/.test(text) &&
    hasRequiredGuide
  );
}

function isProtectedOtoplastyRangeReply(value, recentConversation = []) {
  const text = normalizedText(value);
  const replyUrls = urls(value);
  const hasRequiredGuide = replyUrls.length === 1
    ? FACIAL_PRICE_GUIDE_PATTERN.test(replyUrls[0])
    : replyUrls.length === 0 &&
      conversationContainsFacialPriceGuide(recentConversation);
  return (
    FULL_OTOPLASTY_RANGE_PATTERN.test(String(value || "")) &&
    /nao e orcamento proposta nem garantia de preco/.test(text) &&
    /valor final e definido apos avaliacao e planejamento e pode ficar fora dessa faixa/.test(
      text,
    ) &&
    /nao representa honorarios isolados/.test(text) &&
    hasRequiredGuide
  );
}

function isProtectedCervicalRangeReply(value, recentConversation = []) {
  const text = normalizedText(value);
  const replyUrls = urls(value);
  const hasRequiredGuide = replyUrls.length === 1
    ? FACIAL_PRICE_GUIDE_PATTERN.test(replyUrls[0])
    : replyUrls.length === 0 &&
      conversationContainsFacialPriceGuide(recentConversation);
  return (
    FULL_CERVICAL_RANGE_PATTERN.test(String(value || "")) &&
    /nao e orcamento proposta nem garantia de preco/.test(text) &&
    /valor final e definido apos avaliacao e planejamento e pode ficar fora dessa faixa/.test(
      text,
    ) &&
    /nao representa honorarios isolados/.test(text) &&
    hasRequiredGuide
  );
}

function questionCount(value) {
  return (String(value || "").match(/\?+/g) || []).length;
}

function semanticUnsafeReplyReason(
  value,
  conversationAction = {},
  recentConversation = [],
) {
  const raw = String(value || "");
  const text = normalizedText(raw);
  const contract = conversationAction?.replyContract || {};
  const protectedLiftingRange = isProtectedLiftingRangeReply(
    raw,
    recentConversation,
  );
  const protectedOtoplastyRange = isProtectedOtoplastyRangeReply(
    raw,
    recentConversation,
  );
  const protectedCervicalRange = isProtectedCervicalRangeReply(
    raw,
    recentConversation,
  );
  const protectedApprovedRange =
    protectedLiftingRange || protectedCervicalRange || protectedOtoplastyRange;

  if (
    /\b(?:sou|aqui\s+e|este\s+atendimento\s+e)\s+(?:uma?\s+)?(?:automa[cç][aã]o|rob[oô]|bot|intelig[eê]ncia\s+artificial|assistente\s+virtual)\b/i.test(raw) ||
    /\b(?:como|enquanto)\s+(?:uma?\s+)?(?:automa[cç][aã]o|rob[oô]|bot|intelig[eê]ncia\s+artificial|assistente\s+virtual)\b/i.test(raw)
  ) {
    return "automation_identity_disclosure";
  }

  const genericTeamCheck =
    /\b(?:vou|vamos)\s+(?:conferir|confirmar|alinhar|verificar)\s+(?:essa|esta|a)\s+(?:informa[cç][aã]o|quest[aã]o|ponto)\s+com\s+(?:a\s+)?equipe\b/i.test(raw);
  const namesConcreteTeamCheck =
    /\b(?:sobre\s+(?!(?:isso|essa\s+quest[aã]o)\b).{3,80}|o\s+tempo\s+exato|a\s+(?:faixa|quantidade|data|disponibilidade)|as\s+condi[cç][oõ]es)\b[\s\S]{0,100}\b(?:vou|vamos)\s+(?:conferir|confirmar|alinhar|verificar)\b/i.test(raw);
  if (
    (genericTeamCheck && !namesConcreteTeamCheck) ||
    /\brecebi\s+sua\s+mensagem(?:\s+sobre\s+(?:isso|essa\s+quest[aã]o))?\s*[.!]?$/i.test(raw)
  ) {
    return "generic_holding_reply";
  }

  if (
    /\b(?:valor|pre[cç]o|investimento)\s+da\s+consulta\b[\s\S]{0,100}\b(?:abatid[oa]|descontad[oa]|creditad[oa]|devolvid[oa]|reembolsad[oa])\b/i.test(raw) ||
    /\bconsulta\b[\s\S]{0,100}\b(?:vira|entra\s+como|fica\s+como)\s+(?:cr[eé]dito|desconto)\b/i.test(raw)
  ) {
    return "consultation_credit_claim";
  }

  if (/\b(?:abatimento|abater|deduzir|dedu[cç][aã]o)\b[\s\S]{0,60}\b(?:ir|imposto\s+de\s+renda)\b/i.test(raw)) {
    return "tax_benefit_claim";
  }

  if (
    /\b(?:garant(?:e|ido)|certamente|com\s+certeza)\b[\s\S]{0,60}\breembolso\b/i.test(raw) ||
    /\breembolso\b[\s\S]{0,60}\b(?:garant(?:e|ido)|integral|total)\b/i.test(raw)
  ) {
    return "reimbursement_promise";
  }

  if (
    /\b(?:em\s+)?\d{1,2}\s*x\b/i.test(raw) ||
    /\b\d{1,2}\s*%\s+(?:de\s+)?desconto\b/i.test(raw) ||
    /\b(?:sem\s+juros|sem\s+acr[eé]scimo|juros\s+zero)\b/i.test(raw)
  ) {
    return "unapproved_payment_specifics";
  }

  if (
    /\bcondi[cç][oõ]es\s+(?:exatas|comerciais|de\s+pagamento)?\s*dependem\s+d[ae]\s+confirma[cç][aã]o\s+humana\b/i.test(
      raw,
    )
  ) {
    return "internal_confirmation_language";
  }

  if (!protectedApprovedRange) {
    const amounts = raw.match(/R\$\s*\d[\d.\s]*(?:,\d{1,2})?(?:\s*mil)?/gi) || [];
    for (const amount of amounts) {
      const compact = amount.replace(/[.\s]/g, "").toLowerCase();
      const consultation500 =
        /^r\$500(?:,00)?$/.test(compact) && /\bconsulta\b/i.test(raw);
      const danielConsultation =
        /^r\$(?:350|700)(?:,00)?$/.test(compact) &&
        /\b(?:dr\.?\s+daniel|cardiolog|consulta\s+cardiol[oó]gica)\b/i.test(raw);
      if (!consultation500 && !danielConsultation) {
        return "unapproved_monetary_amount";
      }
    }
  }

  if (
    /\b(?:consulta|agendamento|hor[áa]rio|data|vaga)\b[\s\S]{0,100}\b(?:confirmad[oa]|marcad[oa]|agendad[oa]|reservad[oa])\b/i.test(raw) &&
    contract.allowAppointmentConfirmation !== true
  ) {
    return "unverified_appointment_confirmation";
  }

  if (
    /\b(?:no\s+seu\s+caso|pela\s+(?:sua\s+)?foto|olhando\s+(?:sua|a)\s+foto)\b[\s\S]{0,100}\b(?:voc[eê]\s+tem|[ée]\s+|indica|precisa|predomina|melhor\s+op[cç][aã]o)\b/i.test(raw) ||
    /\bpredomina\s+(?:gordura|flacidez|pele|m[úu]sculo)\b/i.test(raw) ||
    /\b(?:a|o)\s+melhor\s+(?:cirurgia|procedimento|op[cç][aã]o)\s+para\s+voc[eê]\s+[ée]\b/i.test(raw)
  ) {
    return "remote_diagnosis_or_indication";
  }

  if (
    /\b(?:resultado\s+garantido|sem\s+risco|n[aã]o\s+vai\s+ficar\s+cicatriz|n[aã]o\s+deixa\s+cicatriz|n[aã]o\s+ter[aá]\s+hematoma|recupera[cç][aã]o\s+sem\s+dor|vai\s+ficar\s+natural\s+com\s+certeza)\b/i.test(raw)
  ) {
    return "medical_or_result_promise";
  }

  if (
    /\b(?:voc[eê]\s+quer|quer\s+saber|prefere\s+falar)\b[\s\S]{0,100}\b(?:indica[cç][aã]o|recupera[cç][aã]o|valores?|agenda(?:mento)?)\b[\s\S]{0,50}\bou\b/i.test(raw)
  ) {
    return "menu_like_continuation";
  }

  const maxQuestions = Number.isFinite(Number(contract.maxQuestions))
    ? Number(contract.maxQuestions)
    : null;
  if (maxQuestions !== null && questionCount(raw) > maxQuestions) {
    return "too_many_questions_for_context";
  }

  const maxLinks = Number.isFinite(Number(contract.maxLinks))
    ? Number(contract.maxLinks)
    : null;
  if (maxLinks !== null && urls(raw).length > maxLinks) {
    return "too_many_links_for_context";
  }

  const ctaPattern =
    /\b(?:se\s+(?:fizer\s+sentido|quiser)|quer\s+que\s+eu|posso\s+(?:te|lhe)\s+ajudar|podemos\s+agendar|prefere\s+(?:manh[aã]|tarde))\b/i;
  const containsCta = ctaPattern.test(raw);
  if (contract.allowCta === false && containsCta) {
    return "cta_not_allowed_for_context";
  }

  if (
    containsCta &&
    contract.sourceReason === "price_initial_information"
  ) {
    const approvedCervicalOffer =
      /(?:Se voc[eê] quiser, posso (?:te|lhe) passar uma faixa geral como refer[eê]ncia inicial|Se, depois desse contexto, voc[eê] quiser uma refer[eê]ncia mais concreta, tamb[eé]m posso (?:te|lhe) passar uma faixa geral de valores como ponto de partida)\./i;
    const withoutApprovedOffer = raw.replace(approvedCervicalOffer, "");
    if (
      !approvedCervicalOffer.test(raw) ||
      ctaPattern.test(withoutApprovedOffer)
    ) {
      return "cta_not_allowed_for_context";
    }
  }

  if (contract.requirePhotoDistanceLimit === true) {
    const hasAcknowledgement =
      /\b(?:obrigad[ao]\s+por\s+(?:enviar|compartilhar|confiar)|agrade[cç]o\s+por\s+(?:enviar|compartilhar|confiar))\b/i.test(raw);
    const hasHumanPath =
      /\bDra\.?\s+Amanda\b[\s\S]{0,120}\bavaliar\s+pessoalmente\b/i.test(raw) ||
      /\b(?:mostrar|encaminhar)\b[\s\S]{0,60}\bfoto\b[\s\S]{0,60}\bDra\.?\s+Amanda\b[\s\S]{0,240}\b(?:avalia[cç][aã]o|observar|conversar)\b/i.test(raw) ||
      /\bmensagem\b[\s\S]{0,80}\b(?:sinalizad[ao]|encaminhad[ao])\b[\s\S]{0,100}\b(?:equipe|acompanh)/i.test(raw) ||
      /\b(?:equipe|Dra\.?\s+Amanda)\b[\s\S]{0,100}\b(?:acompanhar|avaliar|revisar)\b/i.test(raw);
    const exposesMechanicalDisclaimer =
      /\bsem\s+concluir\s+(?:diagn[oó]stico|indica[cç][aã]o)\b/i.test(raw) ||
      /\b(?:diagn[oó]stico|indica[cç][aã]o)\b[\s\S]{0,60}\bapenas\s+pela\s+imagem\b/i.test(raw);
    if (exposesMechanicalDisclaimer) {
      return "mechanical_photo_disclaimer";
    }
    if (!hasAcknowledgement || !hasHumanPath) {
      return "incomplete_photo_safety_reply";
    }
  }

  if (!text) return "empty_semantic_reply";
  return "";
}

function unsafeReplyContentReason(value) {
  const text = String(value || "");

  if (hasInternalReferenceExposure(text)) {
    return "internal_reference_exposure";
  }

  if (/BEGIN:VCARD|END:VCARD|VERSION:3\.0|(?:item\d+\.)?TEL(?:;|:)/i.test(text)) {
    return "contact_card_content";
  }
  if (/\[(?:nome|name|primeiro nome)\]|\{\{\s*(?:nome|name)\s*\}\}|<nome>/i.test(text)) {
    return "unresolved_placeholder";
  }
  if (/https?:\/\/(?:www\.)?draamandaschroeder(?!\.com\.br)(?:[\s/]|$)/i.test(text)) {
    return "malformed_clinic_url";
  }
  if (/\b(\d{1,2}(?::\d{2}|h(?:\d{2})?))\b\s*[,;\/-]\s*\1\b/i.test(text)) {
    return "duplicated_time";
  }

  return "";
}

function tokens(value) {
  return new Set(
    normalizedText(value)
      .split(" ")
      .filter((token) => token.length >= 3),
  );
}

function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size < 6 || b.size < 6) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / new Set([...a, ...b]).size;
}

function lastAssistantTurn(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .slice()
    .reverse()
    .find((turn) => turn?.role === "assistant");
}

function lastConversationTurn(recentConversation) {
  const turns = Array.isArray(recentConversation)
    ? recentConversation
    : [];
  return turns.length ? turns[turns.length - 1] : null;
}

function hasClinicQuestion(turn) {
  const text = normalizedText(turn?.text);
  return (
    /\?/.test(String(turn?.text || "")) ||
    /\b(?:posso|podemos|pode|confirma|confirmar|prefere|gostaria|consegue|qual|quando|onde|como|quanto|horario|periodo|dia)\b/.test(
      text,
    )
  );
}

function patientIntroducesNewQuestion(value) {
  const raw = limited(value);
  const text = normalizedText(value)
    .replace(
      /^(?:(?:oi|ola|bom dia|boa tarde|boa noite)\s+)+/,
      "",
    )
    .trim();

  return (
    /\?/.test(raw) ||
    /^(?:como|qual|quais|quanto|quantos|quando|onde|por que|porque|quem|tem|ha|custa|atende|faz)\b/.test(
      text,
    ) ||
    /\b(?:pode|poderia|consegue|conseguem)\s+(?:me\s+)?(?:explicar|explica|informar|informa|dizer|diz|enviar|envia|confirmar|confirma|verificar|verifica|ajudar|ajuda)\b/.test(
      text,
    )
  );
}

function isContextualPatientAnswer(currentText, previousClinicTurn) {
  if (!hasClinicQuestion(previousClinicTurn)) return false;
  return !patientIntroducesNewQuestion(currentText);
}

function genericContextResetReason(reply) {
  const text = normalizedText(reply);

  if (
    /\b(?:como|em que) posso (?:te |lhe )?ajudar\b/.test(text) ||
    /\bqual (?:e )?(?:a )?sua (?:duvida|pergunta)\b/.test(text) ||
    /\bo que (?:voce )?gostaria de (?:saber|entender)\b/.test(text) ||
    /\bpoderia (?:me )?(?:explicar|dizer) (?:melhor )?\b/.test(text)
  ) {
    return "planned_reply_restarts_context";
  }

  return "";
}

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

function replyKey(phone, eventId) {
  return createHash("sha256")
    .update(
      `liv-outbound-v1:${normalizedPhone(phone)}:${limited(eventId, 200)}`,
    )
    .digest("hex");
}

export function validateOutboundReply({
  body,
  currentText,
  recentConversation = [],
  conversationAction,
}) {
  const rawReply = String(body || "").trim();
  if (Array.from(rawReply).length > MAX_REPLY_LENGTH) {
    return { allowed: false, reason: "reply_too_long" };
  }

  const reply = limited(rawReply, MAX_REPLY_LENGTH);
  if (!reply) return { allowed: false, reason: "empty_reply" };

  const unsafeReason = unsafeReplyContentReason(reply);
  if (unsafeReason) {
    return { allowed: false, reason: unsafeReason };
  }

  if (
    conversationAction?.pendingHumanCommitmentAcknowledged === true
  ) {
    return {
      allowed: false,
      reason: "pending_human_commitment_acknowledged",
    };
  }

  const action = conversationAction?.action;
  const permitted =
    action === CONVERSATION_ACTIONS.RESPOND ||
    (
      action === CONVERSATION_ACTIONS.WAIT_TEAM &&
      conversationAction?.allowHoldingReply === true
    );

  if (!permitted) {
    return {
      allowed: false,
      reason: "conversation_action_blocks_reply",
    };
  }

  const semanticContextContinuation = Boolean(
    conversationAction?.semanticReplyAuthorized === true &&
      [
        "CONTEXT-CONTINUE-01",
        "CONTEXT-CLARIFY-01",
      ].includes(String(conversationAction?.semanticReplyCode || "")),
  );

  if (
    (
      isSimpleConversationClosing(currentText) ||
      isExplicitDeferralWithoutRequest(currentText)
    ) &&
    conversationAction?.followupPolicy !== "morning_resume" &&
    !semanticContextContinuation
  ) {
    return {
      allowed: false,
      reason: "patient_closed_or_deferred",
    };
  }

  const previousTurn = (Array.isArray(recentConversation)
    ? recentConversation
    : [])
    .slice()
    .reverse()
    .find(
      (turn) =>
        turn?.role === "assistant" ||
        ["bruna", "human", "equipe_humana"].includes(
          String(turn?.source || ""),
        ),
    ) || lastConversationTurn(recentConversation);
  const contextualPatientAnswer =
    previousTurn?.role === "assistant" &&
    isContextualPatientAnswer(currentText, previousTurn);

  if (
    isReplyToHumanContextWithoutStandaloneRequest(
      currentText,
      recentConversation,
    ) &&
    conversationAction?.semanticHumanContextReplyAuthorized !== true
  ) {
    return {
      allowed: false,
      reason: "patient_answer_belongs_to_human_context",
    };
  }

  if (contextualPatientAnswer) {
    const contextResetReason = genericContextResetReason(reply);
    if (contextResetReason) {
      return {
        allowed: false,
        reason: contextResetReason,
      };
    }
  }

  const semanticUnsafeReason = semanticUnsafeReplyReason(
    reply,
    conversationAction,
    recentConversation,
  );
  if (semanticUnsafeReason) {
    return { allowed: false, reason: semanticUnsafeReason };
  }

  const previousAssistant = lastAssistantTurn(recentConversation);
  const previousText = String(previousAssistant?.text || "");
  if (
    previousText &&
    (
      normalizedText(previousText) === normalizedText(reply) ||
      similarity(previousText, reply) >= 0.82
    )
  ) {
    return {
      allowed: false,
      reason: "substantially_repeated_reply",
    };
  }

  const previousUrls = new Set(
    (Array.isArray(recentConversation) ? recentConversation : [])
      .flatMap((turn) => urls(turn?.text))
      .map((url) => url.toLowerCase()),
  );
  const repeatedUrls = urls(reply).filter((url) =>
    previousUrls.has(url.toLowerCase()),
  );
  if (repeatedUrls.length > 0) {
    return {
      allowed: false,
      reason: "repeated_resource",
    };
  }

  return { allowed: true, reason: "allowed", body: reply };
}

export async function claimOutboundReply(
  { phone, eventId },
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  const recipient = normalizedPhone(phone);
  const normalizedEventId = limited(eventId, 200);
  if (!recipient || !normalizedEventId) {
    return { status: "skipped", reason: "invalid_identity" };
  }

  try {
    const replyStore = store(getStoreImpl);
    const key = replyKey(recipient, normalizedEventId);
    const entry = await replyStore.getWithMetadata(key, {
      type: "json",
      consistency: "strong",
    });
    const existing = entry?.data;

    if (existing?.status === "sent") {
      return { status: "duplicate", reason: "already_sent" };
    }
    if (
      existing?.status === "processing" &&
      Number(existing.claimUntil || 0) > now
    ) {
      return { status: "duplicate", reason: "already_processing" };
    }

    const claimToken = randomUUID();
    const next = {
      version: 1,
      status: "processing",
      claimToken,
      claimUntil: now + CLAIM_TTL_MS,
      updatedAt: new Date(now).toISOString(),
    };
    const write = entry?.etag
      ? await replyStore.setJSON(
          key,
          next,
          { onlyIfMatch: entry.etag },
        )
      : await replyStore.setJSON(
          key,
          next,
          { onlyIfNew: true },
        );

    return write.modified
      ? {
          status: "completed",
          key,
          claimToken,
        }
      : {
          status: "duplicate",
          reason: "concurrent_claim",
        };
  } catch {
    if (
      getStoreImpl === getStore &&
      process.env.NETLIFY !== "true" &&
      !process.env.CONTEXT
    ) {
      return {
        status: "completed",
        key: `local-development:${replyKey(recipient, normalizedEventId)}`,
        claimToken: "local-development",
      };
    }
    return { status: "failed", reason: "storage_failed" };
  }
}

async function updateClaim(
  claim,
  status,
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  if (!claim?.key || !claim?.claimToken) {
    return { status: "skipped" };
  }

  try {
    const replyStore = store(getStoreImpl);
    const entry = await replyStore.getWithMetadata(claim.key, {
      type: "json",
      consistency: "strong",
    });
    if (
      entry?.data?.claimToken !== claim.claimToken ||
      !entry?.etag
    ) {
      return { status: "superseded" };
    }

    const write = await replyStore.setJSON(
      claim.key,
      {
        ...entry.data,
        status,
        claimUntil: 0,
        updatedAt: new Date(now).toISOString(),
      },
      { onlyIfMatch: entry.etag },
    );
    return {
      status: write.modified ? "completed" : "superseded",
    };
  } catch {
    return { status: "failed" };
  }
}

export async function sendControlledPatientReply(
  {
    from,
    to,
    eventId,
    body,
    currentText,
    recentConversation,
    conversationAction,
    opportunityId = "",
    professional = "",
  },
  {
    sendYCloudPatientTextImpl = sendYCloudPatientText,
    recordDurableConversationTurnImpl = recordDurableConversationTurn,
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  const conformedBody = conformOutboundReplyToContract({
    body,
    conversationAction,
  });
  const validation = validateOutboundReply({
    body: conformedBody,
    currentText,
    recentConversation,
    conversationAction,
  });
  if (!validation.allowed) {
    return {
      status: "blocked",
      errorCode: validation.reason,
    };
  }

  const claim = await claimOutboundReply(
    { phone: to, eventId },
    { getStoreImpl, now },
  );
  if (claim.status === "duplicate") {
    return {
      status: "duplicate",
      errorCode: claim.reason,
    };
  }
  if (claim.status !== "completed") {
    return {
      status: "blocked",
      errorCode: "reply_claim_unavailable",
    };
  }

  const delivery = await sendYCloudPatientTextImpl({
    from,
    to,
    eventId,
    body: validation.body,
  });
  await updateClaim(
    claim,
    delivery.status === "completed" ? "sent" : "released",
    { getStoreImpl, now },
  );

  if (delivery.status === "completed") {
    const ledger = await recordDurableConversationTurnImpl({
      phone: to,
      eventId: `${eventId}:bruna`,
      messageId: `bruna:${eventId}`,
      text: validation.body,
      at: new Date(now).toISOString(),
      source: "bruna",
      opportunityId,
      professional,
    });
    return {
      ...delivery,
      body: validation.body,
      conversationLedgerStatus: ledger.status,
    };
  }

  return delivery;
}

export { similarity as outboundReplySimilarity };
