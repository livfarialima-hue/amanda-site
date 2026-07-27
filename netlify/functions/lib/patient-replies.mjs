const PROCEDURE_LABELS = Object.freeze({
  lifting_facial: "lifting facial",
  lifting_cervical: "lifting cervical",
  blefaroplastia: "blefaroplastia",
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

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function greeting(name) {
  const normalizedName = firstName(name);
  return normalizedName ? `Olá, ${normalizedName}!` : "Olá!";
}

export function buildPatientReply({
  replyCode,
  patientName,
  procedure,
}) {
  const hello = greeting(patientName);

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
    return [
      hello,
      "O valor de uma cirurgia depende da avaliação individual e do planejamento indicado para cada paciente.",
      "A consulta com a Dra. Amanda é o primeiro passo para entender seus objetivos e as possibilidades com segurança.",
      "Posso te explicar como funciona a avaliação?",
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
    !["standard_reply", "daniel_greeting_and_alert"].includes(
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
