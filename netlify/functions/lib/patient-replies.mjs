const PROCEDURE_LABELS = Object.freeze({
  lifting_facial: "lifting facial",
  lifting_cervical: "lifting cervical",
  blefaroplastia: "blefaroplastia",
  frontoplastia: "frontoplastia",
  otoplastia: "otoplastia",
  avaliacao_facial: "avaliação facial",
  lip_lifting: "lifting labial",
  lipo_papada: "lipoaspiração de papada",
  rinoplastia: "rinoplastia",
  lipoaspiracao: "lipoaspiração",
  abdominoplastia: "abdominoplastia",
  mastopexia: "mastopexia",
  protese_mama: "prótese de mama",
  mamoplastia_redutora: "mamoplastia redutora",
  braquioplastia: "braquioplastia",
  ninfoplastia: "ninfoplastia",
  contorno_corporal: "cirurgia de contorno corporal",
  cirurgias_combinadas: "cirurgias combinadas",
});

const PROCEDURE_REPLY_CODES = new Set([
  "M-C06-WA-01",
  "G-LIFT-CERV-01",
  "G-BLEF-01",
  "X-FRONTO-01",
  "G-OTO-01",
  "M-C01-WA-01",
  "X-LIPLIFT-01",
  "X-LIPOPAP-01",
  "X-RINO-01",
  "X-LIPO-01",
  "X-ABD-01",
  "X-MASTO-01",
  "X-PROTESE-01",
  "X-REDUTORA-01",
  "X-BRAQ-01",
  "X-NINFO-01",
  "X-CONTORNO-01",
  "X-COMB-01",
  "G-LIFT-FAC-01",
]);

export const REACTIVATION_REPLY = [
  "Olá! Obrigada por retomar o contato.",
  "Como já faz alguns dias desde nossa última conversa, vou direcionar sua mensagem à equipe para retomarmos seu atendimento com o contexto correto.",
  "Em breve, continuaremos por aqui.",
].join(" ");

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function greeting(name) {
  const normalizedName = firstName(name);
  return normalizedName ? `Olá, ${normalizedName}!` : "Olá!";
}

function consultationDescription(procedure, procedureLabel) {
  if (procedure === "lifting_facial") {
    return [
      "A avaliação começa com uma conversa sobre o que você percebe no rosto e o que gostaria de melhorar ou preservar.",
      "A Dra. Amanda examina a face e o pescoço em repouso e em movimento para entender se a questão está mais relacionada à flacidez, aos volumes, à pele ou ao contorno.",
      "Depois, explica se o lifting faz sentido, quais são as possibilidades e como seria a recuperação.",
      "Nada precisa ser decidido nesse momento.",
    ].join(" ");
  }

  if (procedureLabel) {
    return [
      "A avaliação começa com uma conversa sobre o que você percebe e o que gostaria de melhorar ou preservar.",
      `A Dra. Amanda examina a região e, a partir disso, explica se ${procedureLabel} faz sentido, quais são as possibilidades e como seria a recuperação.`,
      "Nada precisa ser decidido nesse momento.",
    ].join(" ");
  }

  return [
    "A avaliação começa com uma conversa sobre o que você percebe e o que gostaria de melhorar ou preservar.",
    "A Dra. Amanda examina a região e depois explica as possibilidades, os limites e como seria a recuperação.",
    "Nada precisa ser decidido nesse momento.",
  ].join(" ");
}

function consultationExplorationQuestion(procedure, procedureLabel) {
  if (procedure === "lifting_facial") {
    return "O que despertou seu interesse pelo lifting: a flacidez do rosto, o contorno da mandíbula, o pescoço ou outro ponto?";
  }

  if (procedureLabel) {
    return `O que despertou seu interesse por ${procedureLabel}?`;
  }

  return "Você já tem algum procedimento em mente ou prefere começar entendendo as possibilidades da avaliação?";
}

export function buildConsultationInformationReply({
  patientName,
  siteResource,
  procedure,
  availabilityRequested = false,
  introduceBruna = false,
  siteRequested = false,
}) {
  const procedureLabel = PROCEDURE_LABELS[procedure] || "";
  const introduction = introduceBruna
    ? [
        greeting(patientName),
        "Eu sou a Bruna, da Clínica LIV Faria Lima.",
        "Claro.",
      ].join(" ")
    : "Claro.";
  const consultationContext = consultationDescription(
    procedure,
    procedureLabel,
  );
  const resourceUrl = /^https:\/\/draamandaschroeder\.com\.br\//i.test(
    String(siteResource?.url || ""),
  )
    ? siteResource.url
    : "";
  const nextStep = availabilityRequested
    ? [
        "Atendemos na Rua Pais Leme, 215, em Pinheiros, perto da Av. Faria Lima.",
        "Se quiser que eu busque opções, você prefere manhã ou tarde?",
      ].join(" ")
    : siteRequested && resourceUrl
      ? [
          /casos reais|antes e depois/i.test(
            String(siteResource?.context || ""),
          )
            ? "Esta página reúne explicações sobre o procedimento, a consulta, a recuperação e casos reais em contexto educativo:"
            : "Esta página reúne explicações sobre o procedimento e a consulta:",
          resourceUrl,
        ].join(" ")
      : consultationExplorationQuestion(procedure, procedureLabel);

  return `${introduction} ${consultationContext}\n\n${nextStep}`;
}

export function buildPatientReply({
  replyCode,
  patientName,
  procedure,
}) {
  const hello = greeting(patientName);

  if (replyCode === "MANUAL-RETURN-7D-01") {
    return REACTIVATION_REPLY;
  }

  if (replyCode === "ORG-DIR-01") {
    return [
      hello,
      "Seja bem-vindo(a) à Clínica LIV Faria Lima.",
      "Você procura uma avaliação com a Dra. Amanda ou uma consulta de cardiologia com o Dr. Daniel?",
    ].join(" ");
  }

  if (replyCode === "DANIEL-ENC-01") {
    return [
      hello,
      "Seja bem-vindo(a) à Clínica LIV Faria Lima.",
      "Recebemos sua procura pela cardiologia com o Dr. Daniel.",
      "Em breve continuaremos o atendimento por aqui.",
    ].join(" ");
  }

  if (replyCode === "P-PRECO-01") {
    const procedureLabel =
      PROCEDURE_LABELS[procedure] || "uma cirurgia específica";

    return [
      hello,
      "Faz sentido querer entender o preço antes de decidir.",
      "A consulta presencial com a Dra. Amanda custa R$ 500 e esse valor é abatido se a cirurgia for realizada com a equipe.",
      `Você quer saber da consulta ou da faixa atual de ${procedureLabel}?`,
    ].join(" ");
  }

  if (PROCEDURE_REPLY_CODES.has(replyCode)) {
    const procedureLabel =
      PROCEDURE_LABELS[procedure] || "esse procedimento";

    return [
      hello,
      `Obrigada pelo contato sobre ${procedureLabel}.`,
      "A Dra. Amanda realiza uma avaliação individual para entender seus objetivos e verificar as possibilidades para o seu caso.",
      "Posso te explicar como funciona a consulta?",
    ].join(" ");
  }

  return null;
}

export function hasPendingReactivationHandoff(recentConversation) {
  const turns = Array.isArray(recentConversation)
    ? recentConversation
    : [];
  const handoffIndex = turns.findLastIndex(
    (turn) =>
      turn?.role === "assistant" &&
      String(turn?.text || "").trim() === REACTIVATION_REPLY,
  );

  if (handoffIndex < 0) return false;

  return !turns
    .slice(handoffIndex + 1)
    .some((turn) => turn?.source === "equipe_humana");
}

export function shouldSendAutomaticPatientReply({
  mode,
  plan,
  humanTakeoverToday,
  exactDuplicate,
  schedulingRequest,
  reviewAlertConfigured,
}) {
  if (
    mode !== "active" ||
    humanTakeoverToday ||
    exactDuplicate ||
    schedulingRequest ||
    plan?.automaticAllowed !== true
  ) {
    return false;
  }

  if (
    ![
      "standard_reply",
      "daniel_greeting_and_alert",
      "reactivation_notice",
    ].includes(
      plan?.route,
    )
  ) {
    return false;
  }

  if (
    plan.route === "daniel_greeting_and_alert" &&
    !reviewAlertConfigured
  ) {
    return false;
  }

  return Boolean(plan.replyCode);
}

export function shouldSendOpenAIPatientReply({
  mode,
  plan,
  decision,
  humanTakeoverToday,
  exactDuplicate,
  schedulingRequest,
}) {
  if (
    mode !== "active" ||
    humanTakeoverToday ||
    exactDuplicate ||
    schedulingRequest ||
    plan?.automaticAllowed !== true ||
    plan?.route !== "standard_reply"
  ) {
    return false;
  }

  return Boolean(
    decision?.automaticAllowed === true &&
      decision?.urgent !== true &&
      decision?.route === "standard_reply" &&
      decision?.confidence === "high" &&
      String(decision?.suggestedReply || "").trim(),
  );
}
