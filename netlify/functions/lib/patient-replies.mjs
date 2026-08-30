import { usableProfileFirstName } from "./profile-name.mjs";
import {
  CONTEXT_CLARIFICATION_CODE,
  CONTEXT_CONTINUATION_CODE,
} from "./semantic-reply-policy.mjs";
import { procedureOpeningMicrovalue } from "./bruna-conversion-experience.mjs";

const PROCEDURE_LABELS = Object.freeze({
  lifting_facial: "lifting facial",
  lifting_cervical: "cervicoplastia (lifting cervical)",
  blefaroplastia: "blefaroplastia",
  frontoplastia: "frontoplastia",
  otoplastia: "otoplastia",
  avaliacao_facial: "avaliação facial",
  lip_lifting: "lifting labial",
  lipo_papada: "lipo de papada",
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

const SENSITIVE_PROCEDURES = new Set([
  "ninfoplastia",
]);

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

export const AMANDA_INSTAGRAM_URL =
  "https://www.instagram.com/dra.amanda_plastica/";
export const AMANDA_SITE_URL =
  "https://draamandaschroeder.com.br/";
const CLINIC_ADDRESS =
  "R. Pais Leme, 215, cj. 710 — Pinheiros, São Paulo, CEP 05424-150";
const CLINIC_MAPS_URL =
  "https://maps.app.goo.gl/yDFBmbcn5oDpHSM46";
const CLINIC_LOCATION_PATTERNS = Object.freeze([
  /\bpais\s+leme\b/i,
  /\b05424[\s-]?150\b/i,
  /maps\.app\.goo\.gl\/yDFBmbcn5oDpHSM46/i,
  /\bthera\s+office\b/i,
  /\b(?:atend(?:emos|imento)|cl[ií]nica)\b.{0,80}\bpinheiros\b|\bpinheiros\b.{0,80}\b(?:atend(?:emos|imento)|cl[ií]nica)\b/i,
]);
const CONSULTATION_EXPLANATION_PATTERNS = Object.freeze([
  /\b(?:na|durante\s+a)\s+(?:consulta|avalia[cç][aã]o)\b.{0,220}\b(?:entende|conversa|examina|avalia|explica)\b/i,
  /\b(?:consulta|avalia[cç][aã]o)\b.{0,220}\b(?:possibilidades|limites|recupera[cç][aã]o|planejamento|pr[oó]ximos\s+passos)\b/i,
  /\bn[aã]o\s+(?:é\s+preciso|precisa)\s+decidir\s+nada\b/i,
]);
export const LIFTING_FACIAL_URL =
  "https://draamandaschroeder.com.br/lifting-facial/";

export const REACTIVATION_REPLY = [
  "Olá! Obrigada por retomar o contato.",
  "Como já faz alguns dias desde nossa última conversa, vou direcionar sua mensagem à equipe para retomarmos seu atendimento com o contexto correto.",
  "Em breve, continuaremos por aqui.",
].join(" ");

function firstName(value) {
  return usableProfileFirstName(value);
}

function greeting(name) {
  const rawName = firstName(name);
  const normalizedName =
    rawName &&
    (rawName === rawName.toLowerCase() ||
      rawName === rawName.toUpperCase())
      ? rawName.charAt(0).toUpperCase() +
        rawName.slice(1).toLowerCase()
      : rawName;
  return normalizedName ? `Olá, ${normalizedName}!` : "Olá!";
}

export function hasClinicLocationInConversation(
  recentConversation = [],
) {
  return (Array.isArray(recentConversation)
    ? recentConversation
    : []
  ).some((turn) => {
    const text = typeof turn === "string"
      ? turn
      : String(turn?.text || turn?.content || "");
    return CLINIC_LOCATION_PATTERNS.some((pattern) =>
      pattern.test(text),
    );
  });
}

export function hasConsultationExplanationInConversation(
  recentConversation = [],
) {
  return (Array.isArray(recentConversation)
    ? recentConversation
    : []
  ).some((turn) => {
    const text = typeof turn === "string"
      ? turn
      : String(turn?.text || turn?.content || "");
    return CONSULTATION_EXPLANATION_PATTERNS.some((pattern) =>
      pattern.test(text),
    );
  });
}

export function buildOfficialChannelsReply({
  patientName,
  introduceBruna = false,
}) {
  const opening = introduceBruna
    ? `${greeting(patientName)} Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Claro!`
    : "Claro!";

  return `${opening} Este é o Instagram oficial da Dra. Amanda:\n${AMANDA_INSTAGRAM_URL}`;
}

export function buildCampaignReferenceExplanationReply({
  patientName,
  introduceBruna = false,
}) {
  const opening = introduceBruna
    ? `${greeting(patientName)} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`
    : "";

  return [
    opening,
    "Pode desconsiderar essa referência. Ela não muda seu atendimento.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildMarketingPrefilledOpeningReply({
  patientName,
  procedure,
  introduceBruna = true,
  conversionExperienceEnabled = false,
}) {
  const procedureLabel = PROCEDURE_LABELS[procedure] || "";
  const hasUsableName = Boolean(firstName(patientName));
  const introduction = introduceBruna
    ? `${greeting(patientName)} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`
    : "Claro.";
  const microvalue = conversionExperienceEnabled
    ? procedureOpeningMicrovalue(procedure)
    : "";
  const context = procedureLabel
    ? microvalue
      ? `Posso te orientar sobre ${procedureLabel}. ${microvalue}`
      : SENSITIVE_PROCEDURES.has(procedure)
        ? `Posso te orientar sobre ${procedureLabel}. Essa conversa é tratada com privacidade e cuidado.`
        : `Posso te orientar sobre ${procedureLabel}.`
    : "Posso te orientar.";
  const question = introduceBruna && !hasUsableName
    ? "Como posso te chamar?"
    : conversionExperienceEnabled && procedureLabel
      ? SENSITIVE_PROCEDURES.has(procedure)
        ? "Qual é a sua principal dúvida sobre a avaliação?"
        : `O que você gostaria de entender primeiro sobre ${procedureLabel}?`
      : procedure === "lifting_cervical"
        ? "O que mais chamou sua atenção no pescoço quando decidiu procurar uma avaliação?"
        : "O que você gostaria de entender primeiro?";

  return `${introduction} ${context} ${question}`;
}

export function buildInsuranceCoverageReply({ text, procedure }) {
  const normalizedText = String(text || "");
  const mentionsInsurance =
    /\b(?:conv[eê]nio|plano\s+de\s+sa[uú]de|cobertura)\b/i.test(
      normalizedText,
    );
  const asksAboutCoverage =
    /\b(?:cobr(?:e|ir|iria)|pag(?:a|ar|aria)|aceit(?:a|am)|autoriz(?:a|ar|aria)|realiz(?:ar|ado|ada)|faz(?:er)?|pelo|atrav[eé]s)\b/i.test(
      normalizedText,
    ) || /\?\s*$/.test(normalizedText);

  if (
    !mentionsInsurance ||
    !asksAboutCoverage ||
    procedure !== "blefaroplastia"
  ) {
    return null;
  }

  return [
    "Pode ser avaliado, sim. Na consulta, a Dra. Amanda verifica se há indicação funcional além da estética, como possível impacto no campo visual. A autorização e a eventual cobertura dependem da análise do convênio.",
    "A consulta é particular e emitimos a documentação necessária quando houver indicação.",
  ].join("\n\n");
}

export function buildInsuranceAcceptanceReply({
  text,
  patientName,
  professional,
  introduceBruna = true,
}) {
  const normalizedText = String(text || "");
  const insurerMatch = normalizedText.match(
    /\b(amil|unimed|bradesco\s+sa[uú]de|sul(?:am[eé]rica| america)|porto\s+sa[uú]de|omint|care\s+plus|notredame|hapvida)\b/i,
  );
  const mentionsInsurance =
    Boolean(insurerMatch) ||
    /\b(?:conv[eê]nio|plano\s+de\s+sa[uú]de)\b/i.test(normalizedText);
  const asksAcceptance =
    /\b(?:aceit(?:a|am)|atend(?:e|em)|trabalh(?:a|am)|passa)\b/i.test(
      normalizedText,
    );

  if (!mentionsInsurance || !asksAcceptance) return null;

  const insurer = insurerMatch
    ? insurerMatch[1]
        .split(/\s+/)
        .map((part) =>
          part.length <= 3
            ? part.toUpperCase()
            : part[0].toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join(" ")
    : "";
  const insurerDestination = insurer
    ? `ao plano ${insurer}`
    : "ao seu plano de saúde";
  const introduction = introduceBruna
    ? `${greeting(patientName)} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`
    : "Claro.";

  if (professional === "amanda") {
    return `${introduction} A consulta com a Dra. Amanda é particular. Emitimos nota fiscal, que pode ser apresentada ${insurerDestination} para uma eventual solicitação de reembolso, conforme as regras do contrato e a análise do próprio plano.`;
  }

  if (professional === "daniel") {
    return `${introduction} A consulta com o Dr. Daniel é particular. Emitimos nota fiscal para que você possa solicitar reembolso ${insurerDestination}, conforme as regras do seu contrato. Vou direcionar seu atendimento de cardiologia para a equipe.`;
  }

  return `${introduction} Os atendimentos da clínica são particulares. Emitimos nota fiscal para que você possa solicitar reembolso ${insurerDestination}, conforme as regras do seu contrato. Seu interesse é em cirurgia plástica ou estética com a Dra. Amanda, ou em cardiologia com o Dr. Daniel?`;
}

function consultationDescription(procedure, procedureLabel) {
  if (procedure === "lifting_facial") {
    return [
      "A avaliação de lifting facial começa com uma conversa sobre o que você percebe no rosto e o que gostaria de melhorar ou preservar.",
      "A Dra. Amanda examina a face e o pescoço em repouso e em movimento para entender se a questão está mais relacionada à flacidez, aos volumes, à pele ou ao contorno.",
      "Depois, explica se o lifting facial faz sentido, quais são as possibilidades, os limites e como seria a recuperação.",
      "Você não precisa decidir nada nesse momento.",
    ].join(" ");
  }

  if (SENSITIVE_PROCEDURES.has(procedure)) {
    return [
      `A avaliação de ${procedureLabel} é feita de forma individual e reservada.`,
      "A Dra. Amanda começa entendendo o que você busca, avalia a região com cuidado e explica as possibilidades, os limites e como seria a recuperação.",
      "Você não precisa decidir nada nesse momento.",
    ].join(" ");
  }

  if (procedureLabel) {
    return [
      `A avaliação de ${procedureLabel} começa com uma conversa sobre o que você percebe e o que gostaria de melhorar ou preservar.`,
      `A Dra. Amanda avalia a região com cuidado e, a partir disso, explica se ${procedureLabel} faz sentido, quais são as possibilidades, os limites e como seria a recuperação.`,
      "Você não precisa decidir nada nesse momento.",
    ].join(" ");
  }

  return [
    "A avaliação começa com uma conversa sobre o que você percebe e o que gostaria de melhorar ou preservar.",
    "A Dra. Amanda avalia a região com cuidado e depois explica as possibilidades, os limites e como seria a recuperação.",
    "Você não precisa decidir nada nesse momento.",
  ].join(" ");
}

export function buildConsultationInformationReply({
  patientName,
  siteResource,
  procedure,
  availabilityRequested = false,
  consultationContextPreviouslyShared = false,
  consultationPriceRequested = false,
  conversionExperienceEnabled = false,
  introduceBruna = false,
  locationRequested = false,
  locationPreviouslyShared = false,
  siteRequested = false,
}) {
  const procedureLabel = PROCEDURE_LABELS[procedure] || "";
  const introduction = introduceBruna
    ? [
        greeting(patientName),
        "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      ].join(" ")
    : "Claro.";
  const consultationContext = consultationPriceRequested
    ? conversionExperienceEnabled || consultationContextPreviouslyShared
      ? ""
      : "Na avaliação, a Dra. Amanda entende o que você busca, examina com cuidado e explica as possibilidades e os próximos passos, sem obrigação de decidir nada nesse momento."
    : consultationDescription(
        procedure,
        procedureLabel,
      );
  const opening = consultationPriceRequested
    ? `${introduction} A consulta presencial com a Dra. Amanda custa R$ 500.`
    : `${introduction} ${consultationContext}`;
  const paymentInformation = consultationPriceRequested
    ? "O pagamento pode ser feito por Pix, débito ou parcelamento, com emissão de nota fiscal."
    : "";
  const resourceUrl = /^https:\/\/draamandaschroeder\.com\.br\//i.test(
    String(siteResource?.url || ""),
  )
    ? siteResource.url
    : "";
  const shouldIncludeLocation =
    !locationPreviouslyShared &&
    !siteRequested &&
    (
      availabilityRequested ||
      (
        consultationPriceRequested &&
        (!conversionExperienceEnabled || locationRequested)
      )
    );
  const location = shouldIncludeLocation
    ? [
        `A consulta presencial acontece na Clínica LIV, ${CLINIC_ADDRESS}.`,
        availabilityRequested && !consultationPriceRequested
          ? `Google Maps: ${CLINIC_MAPS_URL}`
          : "",
      ].filter(Boolean).join("\n")
    : "";
  const nextStep = availabilityRequested
    ? [
        "Quais dias da semana e qual período — manhã ou tarde — costumam funcionar melhor para você?",
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
      : consultationPriceRequested
        ? conversionExperienceEnabled
          ? "Se quiser, posso verificar opções de horário."
          : "Se fizer sentido para você, posso verificar opções de horário."
        : "";
  const explorationQuestion =
    !availabilityRequested &&
    !consultationPriceRequested &&
    !siteRequested
      ? procedureLabel
        ? `O que seria mais útil entender agora sobre ${procedureLabel}?`
        : "O que seria mais útil entender agora sobre essa avaliação?"
      : "";

  return [
    opening,
    consultationPriceRequested ? consultationContext : "",
    paymentInformation,
    location,
    nextStep,
    explorationQuestion,
  ].filter(Boolean).join("\n\n");
}

export function buildImageAcknowledgementReply({
  patientName,
  greetPatient = true,
  introduceBruna = true,
}) {
  const opening = [
    greetPatient ? greeting(patientName) : "",
    introduceBruna
      ? "Eu sou a Bruna, concierge da Clínica LIV Faria Lima."
      : "",
  ].filter(Boolean).join(" ");
  const acknowledgement = [
    "Obrigada por compartilhar sua foto e confiar na gente.",
    "Entendo que você queira saber o que pode ser feito, e acredito que temos boas abordagens que podem ajudar a tratar esse tipo de queixa.",
    "Vou mostrar a foto à Dra. Amanda para que ela veja o que você gostaria de melhorar.",
    "Em uma avaliação, ela poderá observar todos os detalhes com cuidado e conversar com você sobre o caminho que faça mais sentido, sempre respeitando suas características.",
  ].join(" ");

  return [opening, acknowledgement].filter(Boolean).join(" ");
}

export function buildMissingInboundTextClarificationReply({
  patientName,
} = {}) {
  return [
    `${greeting(patientName)} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`,
    "Sua primeira mensagem não carregou para mim.",
    "Pode me reenviar sua dúvida em uma frase?",
    "Assim já consigo te orientar por aqui.",
  ].join(" ");
}

export function buildContextRoutingClarificationReply({
  patientName,
  introduceBruna = false,
} = {}) {
  const opening = introduceBruna
    ? `${greeting(patientName)} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`
    : "";
  return [
    opening,
    "Quero entender direitinho para te orientar.",
    "Você pode me explicar um pouco melhor qual atendimento ou dúvida gostaria de tratar conosco?",
  ].filter(Boolean).join(" ");
}

export function buildAppearanceDistressReviewReply({ patientName }) {
  return [
    greeting(patientName),
    "Obrigada por confiar em nós e compartilhar algo tão sensível.",
    "Sinto muito que isso esteja sendo difícil.",
    "Quero acolher você com cuidado e sem julgamentos; antes de falarmos sobre qualquer procedimento, posso entender um pouco melhor como você está se sentindo?",
  ].join(" ");
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
      "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      "Você procura uma avaliação com a Dra. Amanda ou uma consulta de cardiologia com o Dr. Daniel?",
    ].join(" ");
  }

  if (replyCode === "DANIEL-ENC-01") {
    return [
      hello,
      "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      "Recebemos sua procura pela cardiologia com o Dr. Daniel.",
      "Em breve continuaremos o atendimento por aqui.",
    ].join(" ");
  }

  if (replyCode === "AMANDA-HOSPITAL-01") {
    const procedureLabel =
      procedure === "lifting_facial"
        ? "o lifting facial"
        : procedure === "lifting_cervical"
          ? "a cervicoplastia (lifting cervical)"
          : "o lifting cervical e o lifting facial";
    return [
      hello,
      "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      `Sim. Com a equipe da Dra. Amanda, ${procedureLabel} ${
        procedure ? "é uma cirurgia realizada" : "são cirurgias realizadas"
      } em hospital, com anestesista e equipe cirúrgica.`,
      "Antes, a Dra. Amanda faz uma avaliação individual para confirmar a indicação e definir o planejamento adequado ao caso.",
    ].filter(Boolean).join(" ");
  }

  if (replyCode === "P-PRECO-01") {
    const procedureLabel =
      PROCEDURE_LABELS[procedure] || "uma cirurgia específica";

    return [
      hello,
      "Faz sentido querer entender o preço antes de decidir.",
      "Como cada cirurgia é planejada individualmente, a Dra. Amanda confirma o valor exato depois da avaliação.",
      procedure
        ? ""
        : `Qual cirurgia você está pesquisando?`,
    ].filter(Boolean).join(" ");
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
  allowHumanContextContinuation = false,
}) {
  const continuationDecision =
    decision?.replyCode === CONTEXT_CONTINUATION_CODE &&
    String(decision?.reviewReason || "").startsWith(
      "context_continue:",
    );
  const clarificationDecision =
    decision?.replyCode === CONTEXT_CLARIFICATION_CODE &&
    String(decision?.reviewReason || "").startsWith(
      "context_clarification:",
    );
  const validatedHumanContextContinuation = Boolean(
    allowHumanContextContinuation === true &&
      humanTakeoverToday === true &&
      plan?.humanContextContinuationCandidate === true &&
      (continuationDecision || clarificationDecision),
  );

  if (
    mode !== "active" ||
    (humanTakeoverToday && !validatedHumanContextContinuation) ||
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
