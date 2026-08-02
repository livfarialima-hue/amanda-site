const EXPERIENCE_DETAIL_PATTERN =
  /\b(?:h[aá]\s+quanto\s+tempo|quanto\s+tempo|quantos?\s+anos?|desde\s+quando|em\s+que\s+ano|quando)\b[\s\S]{0,120}\b(?:atua|atende|trabalha|formou|formada|concluiu|terminou|resid[eê]ncia|cirurgia\s+pl[aá]stica|experi[eê]ncia)\b|\b(?:tempo|anos?)\s+(?:de\s+)?(?:atua[cç][aã]o|experi[eê]ncia)\b/i;

const LIFTING_PATTERN = /\blifting\s+(?:facial|da\s+face)|\britidoplastia\b/i;

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function greeting(value) {
  const name = firstName(value);
  return name ? `Olá, ${name}!` : "Olá!";
}

export function isProfessionalExperienceDetailRequest(value) {
  return EXPERIENCE_DETAIL_PATTERN.test(String(value || ""));
}

function unresolvedExperienceQuestion(currentText, recentConversation = []) {
  if (isProfessionalExperienceDetailRequest(currentText)) {
    return String(currentText || "").trim();
  }

  const turns = Array.isArray(recentConversation)
    ? recentConversation
    : [];

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.role === "assistant") return "";
    if (
      turn?.role === "patient" &&
      isProfessionalExperienceDetailRequest(turn.text)
    ) {
      return String(turn.text || "").trim();
    }
  }

  return "";
}

function liftingIsInContext({ currentText, recentConversation, procedure }) {
  if (procedure === "lifting_facial") return true;

  const context = [
    currentText,
    ...(Array.isArray(recentConversation)
      ? recentConversation.map((turn) => turn?.text)
      : []),
  ].join(" ");

  return LIFTING_PATTERN.test(context);
}

export function buildProfessionalFactPartialReview({
  currentText,
  recentConversation = [],
  patientName,
  procedure,
}) {
  const pendingQuestion = unresolvedExperienceQuestion(
    currentText,
    recentConversation,
  );

  if (!pendingQuestion) return null;

  const lifting = liftingIsInContext({
    currentText,
    recentConversation,
    procedure,
  });
  const hasPreviousClinicReply = (
    Array.isArray(recentConversation) ? recentConversation : []
  ).some((turn) => turn?.role === "assistant");
  const name = firstName(patientName);
  const opening = hasPreviousClinicReply
    ? name
      ? `${name},`
      : ""
    : greeting(patientName);
  const verifiedFact = lifting
    ? "Sim, a Dra. Amanda realiza lifting facial. Ela é médica cirurgiã plástica, com residência médica em Cirurgia Plástica pela Unicamp, RQE 110472, membro da Sociedade Brasileira de Cirurgia Plástica (SBCP) e atuação com foco em cirurgias da face."
    : "A Dra. Amanda é médica cirurgiã plástica, com residência médica em Cirurgia Plástica pela Unicamp, RQE 110472, membro da Sociedade Brasileira de Cirurgia Plástica (SBCP) e atuação com foco em cirurgias da face.";
  const safeReply = [
    opening,
    verifiedFact,
    "Sobre o tempo exato de atuação, vou confirmar essa informação com a equipe para te responder com precisão.",
  ].filter(Boolean).join(" ");

  return {
    safeReply,
    pendingQuestion,
    pendingDetail:
      "Confirmar o ano de conclusão da formação em Cirurgia Plástica e o tempo exato de atuação.",
    suggestedCompletion: name
      ? `${name}, confirmei com a equipe: a Dra. Amanda atua em Cirurgia Plástica desde [ANO CONFIRMADO], o que corresponde a [TEMPO CONFIRMADO].`
      : "Confirmei com a equipe: a Dra. Amanda atua em Cirurgia Plástica desde [ANO CONFIRMADO], o que corresponde a [TEMPO CONFIRMADO].",
  };
}

export function buildProfessionalFactReviewAlert({
  review,
  patientMessage,
  safeReplySent,
}) {
  if (!review) return String(patientMessage || "").trim();

  return [
    "PERGUNTA PARCIALMENTE RESPONDÍVEL",
    `Pergunta recebida: ${String(patientMessage || review.pendingQuestion).trim()}`,
    safeReplySent
      ? "Resposta segura já enviada automaticamente:"
      : "Resposta segura preparada; o envio automático não foi confirmado:",
    review.safeReply,
    `Pendente para a equipe: ${review.pendingDetail}`,
    "Sugestão de complemento após confirmar:",
    review.suggestedCompletion,
  ].join("\n");
}
