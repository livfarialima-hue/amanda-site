import { usableProfileFirstName } from "./profile-name.mjs";

const KNOWLEDGE_PREFIX = "KB:";

export const UNKNOWN_CLARIFICATION_CODE = "UNKNOWN-CLARIFY-01";
export const UNKNOWN_REVIEW_CODE = "UNKNOWN-REVIEW-01";

const HIGH_RISK_PATTERNS = [
  /\b(?:urg[eê]ncia|emerg[eê]ncia|samu|pronto\s+socorro)\b/i,
  /\b(?:dor\s+forte|falta\s+de\s+ar|desmaio|hemorragia|sangramento\s+intenso)\b/i,
  /\b(?:foto|imagem|exame|laudo|diagn[oó]stico|prescri[cç][aã]o|receita|medicamento)\b/i,
  /\b(?:complica[cç][aã]o|infec[cç][aã]o|febre|secre[cç][aã]o|p[oó]s[- ]operat[oó]rio)\b/i,
  /\b(?:valor\s+exato|or[cç]amento\s+final|negociar|desconto|condi[cç][aã]o\s+especial)\b/i,
];

const MEDIUM_RISK_PATTERNS = [
  /\b(?:cirurgia|procedimento|t[eé]cnica|anestesia|hospital|interna[cç][aã]o)\b/i,
  /\b(?:recupera[cç][aã]o|cicatriz|resultado|risco|retorno|afastamento)\b/i,
  /\b(?:lifting|mini\s*lifting|blefaroplastia|rinoplastia|lipoaspira[cç][aã]o)\b/i,
];

function limitText(value, maximumLength = 1_200) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizeMode(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function normalizeKnowledgeContext(value) {
  const candidates = Array.isArray(value?.candidates)
    ? value.candidates
        .slice(0, 8)
        .map((candidate) => ({
          id: limitText(candidate?.id, 80),
          subject: limitText(candidate?.subject, 160),
          answer: limitText(candidate?.answer, 1_200),
          mode: limitText(candidate?.mode, 80),
          risk: limitText(candidate?.risk, 40),
          boundaries: limitText(candidate?.boundaries, 500),
          keywords: limitText(
            candidate?.keywords || candidate?.examples,
            500,
          ),
        }))
        .filter((candidate) => candidate.id && candidate.answer)
    : [];
  const pending = value?.pendingQuestion;

  return {
    candidates,
    pendingQuestion:
      pending && typeof pending === "object"
        ? {
            id: limitText(pending.id, 80),
            subject: limitText(pending.subject, 160),
            question: limitText(pending.question, 500),
            clarificationCount: Math.max(
              0,
              Number(pending.clarificationCount) || 0,
            ),
          }
        : null,
  };
}

export function knowledgeRuleId(decision) {
  const replyCode = String(decision?.replyCode || "").trim();
  return replyCode.startsWith(KNOWLEDGE_PREFIX)
    ? replyCode.slice(KNOWLEDGE_PREFIX.length).trim()
    : "";
}

export function isKnowledgeDecision(decision) {
  return Boolean(knowledgeRuleId(decision));
}

export function isUnknownClarificationDecision(decision) {
  return decision?.replyCode === UNKNOWN_CLARIFICATION_CODE;
}

export function isUnknownReviewDecision(decision) {
  return decision?.replyCode === UNKNOWN_REVIEW_CODE;
}

export function shouldDigestLearningDecision(decision) {
  return (
    isUnknownReviewDecision(decision) ||
    String(decision?.reviewReason || "").startsWith("unknown_digest:")
  );
}

export function learningSubject(decision, fallback = "Dúvida não mapeada") {
  const reviewReason = String(decision?.reviewReason || "");
  const separator = reviewReason.indexOf(":");
  const raw = separator >= 0 ? reviewReason.slice(separator + 1) : "";

  return (
    limitText(raw.replaceAll("_", " "), 160) ||
    limitText(decision?.procedure, 160) ||
    fallback
  );
}

export function classifyLearningRisk({ text, reviewReason, procedure } = {}) {
  const combined = [text, reviewReason, procedure].filter(Boolean).join(" ");
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(combined))) {
    return "Alto";
  }
  if (MEDIUM_RISK_PATTERNS.some((pattern) => pattern.test(combined))) {
    return "Médio";
  }
  return "Baixo";
}

function invalidKnowledgeDecision(decision, reason) {
  return {
    ...decision,
    route: "human_review",
    confidence: "low",
    automaticAllowed: false,
    replyCode: UNKNOWN_REVIEW_CODE,
    suggestedReply: "",
    reviewReason: `unknown_digest:${reason}`,
  };
}

export function applyKnowledgeDecisionGuard(decision, rawContext) {
  const context = normalizeKnowledgeContext(rawContext);
  const ruleId = knowledgeRuleId(decision);

  if (ruleId) {
    const candidate = context.candidates.find(
      (item) => item.id.toLowerCase() === ruleId.toLowerCase(),
    );
    const automaticMode = normalizeMode(candidate?.mode) === "automatica";
    const lowRisk = normalizeMode(candidate?.risk) === "baixo";

    if (!candidate || !automaticMode || !lowRisk) {
      return invalidKnowledgeDecision(decision, "resposta_aprovada_invalida");
    }

    return {
      ...decision,
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      suggestedReply: candidate.answer,
      reviewReason: `knowledge:${candidate.id}`,
    };
  }

  if (isUnknownClarificationDecision(decision)) {
    if ((context.pendingQuestion?.clarificationCount || 0) >= 1) {
      return invalidKnowledgeDecision(decision, "esclarecimento_ja_solicitado");
    }

    const question = limitText(decision?.suggestedReply, 300);
    if (!question || !question.includes("?")) {
      return invalidKnowledgeDecision(decision, "esclarecimento_invalido");
    }

    return {
      ...decision,
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      suggestedReply: question,
      reviewReason:
        String(decision?.reviewReason || "").startsWith(
          "unknown_clarification:",
        )
          ? decision.reviewReason
          : "unknown_clarification:duvida_nao_mapeada",
    };
  }

  if (isUnknownReviewDecision(decision)) {
    return invalidKnowledgeDecision(
      decision,
      learningSubject(decision, "duvida_nao_mapeada").replaceAll(" ", "_"),
    );
  }

  return decision;
}

export function buildUnknownHoldingReply({ patientName, introduceBruna } = {}) {
  const firstName = usableProfileFirstName(patientName);
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const introduction = introduceBruna
    ? " Eu sou a Bruna, concierge da Clínica LIV Faria Lima."
    : "";

  return `${greeting}${introduction} Vou confirmar essa informação com a equipe para te responder com segurança. Assim que tivermos a orientação, seguimos por aqui.`;
}
