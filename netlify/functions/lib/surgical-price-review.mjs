import { usableProfileFirstName } from "./profile-name.mjs";

const CONSULTATION_PRICE = 500;
const PRICE_GUIDES = Object.freeze({
  facial: Object.freeze({
    path: "/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/",
    label: "uma cirurgia facial",
  }),
  breast: Object.freeze({
    path: "/conteudos/quanto-custa-cirurgia-plastica-mama-sao-paulo/",
    label: "uma cirurgia da mama",
  }),
  body: Object.freeze({
    path: "/conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/",
    label: "uma cirurgia corporal",
  }),
});
const LIFTING_PRICE_GUIDE_PATH =
  "/conteudos/quanto-custa-lifting-facial-sao-paulo/";
const LIFTING_PRICE_GUIDE_URL =
  `https://draamandaschroeder.com.br${LIFTING_PRICE_GUIDE_PATH}`;
const INVISIBLE_LINK_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;
const PRICE_RANGE_LOWER_FACTOR = 0.9;
const PRICE_RANGE_UPPER_FACTOR = 1.1;
const CLINIC_LOCATION_REPLY = [
  "A Clínica LIV fica na R. Pais Leme, 215, cj. 710 — Pinheiros, São Paulo, CEP 05424-150.",
  "Google Maps: https://maps.app.goo.gl/yDFBmbcn5oDpHSM46",
].join("\n");
const LOCATION_REQUEST_PATTERN =
  /\b(?:onde\s+fica|qual\s+(?:e|é)\s+o\s+endere[cç]o|endere[cç]o|localiza[cç][aã]o|como\s+chegar)\b/i;
const INITIAL_PRICE_TERMS_PATTERN =
  /\b(?:parcel(?:am|amento|ar)|quantas?\s+vezes|formas?\s+de\s+pagamento)\b|\b(?:inclu[ií](?:do|da|dos|das)?|inclus[oa]s?)\b.{0,55}\b(?:hospital|anestes(?:ia|ista))\b|\b(?:hospital|anestes(?:ia|ista))\b.{0,55}\b(?:inclu[ií](?:do|da|dos|das)?|inclus[oa]s?)\b/i;
const OTOPLASTY_OVERVIEW_REQUEST_PATTERN =
  /\botomodela[cç][aã]o\b|\bdiferen[cç]a\b.{0,80}\botoplastia\b|\botoplastia\b.{0,80}\bdiferen[cç]a\b|^\s*tudo\b/i;
const OTOPLASTY_OVERVIEW_REPLY_PATTERN =
  /(?:o termo )?[“\"]?otomodela[cç][aã]o[”\"]? (?:[eé] usado|[eé] um nome usado) para (?:t[eé]cnicas|abordagens) diferentes|a dra\. amanda examina (?:cada|as duas) orelhas?/i;

const FACIAL_PRICE_GUIDE_PROCEDURES = new Set([
  "lifting_facial",
  "lifting_cervical",
  "blefaroplastia",
  "otoplastia",
  "rinoplastia",
  "frontoplastia",
  "lip_lifting",
  "lipo_papada",
]);
const BREAST_PRICE_GUIDE_PROCEDURES = new Set([
  "mastopexia",
  "protese_mama",
  "mamoplastia_redutora",
]);
const BODY_PRICE_GUIDE_PROCEDURES = new Set([
  "lipoaspiracao",
  "abdominoplastia",
  "braquioplastia",
  "ninfoplastia",
  "contorno_corporal",
  "cirurgias_combinadas",
]);

const PRICE_REFERENCES = Object.freeze({
  lifting_facial: Object.freeze({
    label: "o lifting facial",
    cashProfessional: 26422.2,
    installmentProfessional: 28435.32,
    hospitalReference: 10000,
    rangeMinimumOverride: 26000,
    source: "CIRURGIAS 2025!A14:C14 + Página7!A11:D11",
  }),
  blefaroplastia: Object.freeze({
    label: "a blefaroplastia completa",
    cashProfessional: 14401.8,
    installmentProfessional: 15499.08,
    hospitalReference: 5500,
    source: "CIRURGIAS 2025!A4:C4 + Página7!A2:D2",
  }),
  otoplastia: Object.freeze({
    label: "a otoplastia",
    cashProfessional: 14401.8,
    installmentProfessional: 15499.08,
    hospitalReference: 6000,
    rangeMinimumOverride: 8000,
    rangeMaximumOverride: 14000,
    source: "Faixa operacional autorizada em 19/08/2026",
  }),
  rinoplastia: Object.freeze({
    label: "a rinoplastia com a equipe completa",
    cashProfessional: 23530.5,
    installmentProfessional: 25323.3,
    hospitalReference: 8800,
    source: "CIRURGIAS 2025!A24:C24 + Página7!A18:D18",
  }),
  lipoaspiracao: Object.freeze({
    label: "a lipoaspiração",
    cashProfessional: 23133.6,
    installmentProfessional: 24896.16,
    hospitalReference: 8765,
    source: "CIRURGIAS 2025!A15:C15 + Página7!A12:D12",
  }),
  abdominoplastia: Object.freeze({
    label: "a abdominoplastia",
    cashProfessional: 17860.5,
    installmentProfessional: 19221.3,
    hospitalReference: 10245,
    source: "CIRURGIAS 2025!A6:C6 + Página7!A4:D4",
  }),
  protese_mama: Object.freeze({
    label: "a inclusão de prótese de mama",
    cashProfessional: 18601.8,
    installmentProfessional: 20019.08,
    hospitalReference: 7225,
    source: "CIRURGIAS 2025!A13:C13 + Página7!A10:D10",
  }),
  mamoplastia_redutora: Object.freeze({
    label: "a mamoplastia sem prótese",
    cashProfessional: 20128.5,
    installmentProfessional: 21662.1,
    hospitalReference: 9345,
    source: "CIRURGIAS 2025!A18:C18 + Página7!A14:D14",
  }),
  braquioplastia: Object.freeze({
    label: "a braquioplastia",
    cashProfessional: 15422.4,
    installmentProfessional: 16597.44,
    hospitalReference: 10000,
    source: "CIRURGIAS 2025!A8:C8 + Página7!A6:D6",
  }),
  ninfoplastia: Object.freeze({
    label: "a ninfoplastia em ambiente hospitalar",
    cashProfessional: 10773,
    installmentProfessional: 11593.8,
    hospitalReference: 4000,
    source: "CIRURGIAS 2025!A20:C20 + Página7!A16:D16",
  }),
});

const PROCEDURE_LABELS = Object.freeze({
  lifting_cervical: "lifting cervical",
  frontoplastia: "frontoplastia",
  avaliacao_facial: "avaliação facial",
  lip_lifting: "lifting labial",
  lipo_papada: "lipoaspiração de papada",
  mastopexia: "mastopexia",
  contorno_corporal: "cirurgia de contorno corporal",
  cirurgias_combinadas: "cirurgias combinadas",
});

function firstName(value) {
  const name = usableProfileFirstName(value);
  if (!name) return "";

  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`;
  }

  return name;
}

function limitText(value, maximumLength) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function safeLink(value) {
  return String(value || "")
    .replace(INVISIBLE_LINK_CHARACTERS, "")
    .trim();
}

function greeting(value) {
  const name = firstName(value);
  return name ? `Olá, ${name}!` : "Olá!";
}

function waitingGreeting(value) {
  const name = firstName(value);
  return name
    ? `${name}, obrigada por aguardar.`
    : "Obrigada por aguardar.";
}

function directPriceGreeting(value, recentConversation) {
  const name = firstName(value);
  const hasPriorClinicTurn = (Array.isArray(recentConversation)
    ? recentConversation
    : []
  ).some((turn) => turn?.role === "assistant");

  if (hasPriorClinicTurn) {
    return name ? `Claro, ${name}.` : "Claro.";
  }

  const hello = name ? `Olá, ${name}!` : "Olá!";
  return `${hello} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`;
}

function roundedThousands(value) {
  return Math.round(Number(value || 0) / 1000) * 1000;
}

function formatBRL(value) {
  return `R$ ${roundedThousands(value) / 1_000} mil`;
}

function priceGuideForProcedure(procedure) {
  if (FACIAL_PRICE_GUIDE_PROCEDURES.has(procedure)) {
    return PRICE_GUIDES.facial;
  }
  if (BREAST_PRICE_GUIDE_PROCEDURES.has(procedure)) {
    return PRICE_GUIDES.breast;
  }
  if (BODY_PRICE_GUIDE_PROCEDURES.has(procedure)) {
    return PRICE_GUIDES.body;
  }
  return null;
}

function priceGuideUrl(guide) {
  return guide
    ? `https://draamandaschroeder.com.br${guide.path}`
    : "";
}

function conversationContainsPriceGuide(recentConversation, guide) {
  if (!guide?.path) return false;
  const pathWithoutTrailingSlash = guide.path.replace(/\/$/, "");
  return (Array.isArray(recentConversation)
    ? recentConversation
    : []
  ).some((turn) => {
    const text = String(turn?.text || "");
    return text.includes(pathWithoutTrailingSlash);
  });
}

function conversationContainsFacialPriceGuide(recentConversation) {
  return (
    conversationContainsPriceGuide(
      recentConversation,
      PRICE_GUIDES.facial,
    ) ||
    conversationContainsPriceGuide(
      recentConversation,
      { path: LIFTING_PRICE_GUIDE_PATH },
    )
  );
}

function priceGuideParagraph(procedure, recentConversation) {
  const guide = priceGuideForProcedure(procedure);
  const alreadyShared = guide === PRICE_GUIDES.facial
    ? conversationContainsFacialPriceGuide(recentConversation)
    : conversationContainsPriceGuide(recentConversation, guide);
  if (!guide || alreadyShared) {
    return "";
  }
  return `Este conteúdo explica de forma simples o que costuma compor o valor de ${guide.label}: ${safeLink(priceGuideUrl(guide))}`;
}

function priceVariation(procedure) {
  if (procedure === "lifting_facial") {
    return "O valor final pode variar conforme o plano envolva face, pescoço ou ambos.";
  }

  return "O valor final pode variar conforme a extensão do procedimento.";
}

function otoplastyOverviewParagraphs({
  procedure,
  currentText,
  recentConversation,
}) {
  if (procedure !== "otoplastia") return [];

  const turns = Array.isArray(recentConversation)
    ? recentConversation.slice(-8)
    : [];
  const alreadyAnswered = turns.some(
    (turn) =>
      (
        turn?.role === "assistant" ||
        ["bruna", "human", "equipe_humana"].includes(
          String(turn?.source || ""),
        )
      ) &&
      OTOPLASTY_OVERVIEW_REPLY_PATTERN.test(String(turn?.text || "")),
  );
  if (alreadyAnswered) return [];

  const patientContext = turns
    .filter(
      (turn) =>
        turn?.role !== "assistant" &&
        !["bruna", "human", "equipe_humana"].includes(
          String(turn?.source || ""),
        ),
    )
    .map((turn) => String(turn?.text || ""))
    .concat(String(currentText || ""))
    .join(" ");
  if (!OTOPLASTY_OVERVIEW_REQUEST_PATTERN.test(patientContext)) return [];

  return [
    "Sobre a diferença: “otomodelação” é um nome usado para abordagens diferentes, então a comparação depende da técnica a que a pessoa se refere. Em geral, esse nome aparece associado a correções mais limitadas. Já a otoplastia permite um planejamento mais completo de projeção, dobras e assimetrias, de acordo com cada orelha.",
    "Na avaliação, a Dra. Amanda examina as duas orelhas, entende o resultado que você busca e explica qual possibilidade faz sentido, além de conversar sobre cicatrizes, anestesia e recuperação antes de qualquer decisão.",
  ];
}

function initialPriceDiscoveryQuestion(procedure) {
  return procedure
    ? ""
    : "Você está pesquisando qual cirurgia?";
}

function clarificationFor(procedure, patientName) {
  const hello = greeting(patientName);

  if (!procedure) {
    return `${hello} Para te passar a faixa correta, você me conta qual cirurgia está pesquisando? Os valores mudam conforme o procedimento.`;
  }

  if (procedure === "mastopexia") {
    return `${hello} Para eu te passar uma referência correta, você está pesquisando mastopexia com ou sem prótese? A tabela tem valores diferentes para cada opção, e o orçamento final depende da avaliação.`;
  }

  if (procedure === "cirurgias_combinadas") {
    return `${hello} Para eu te passar uma referência correta, quais cirurgias você está pensando em combinar? A tabela muda conforme a combinação, e o orçamento final depende da avaliação.`;
  }

  if (procedure === "contorno_corporal") {
    return `${hello} Para eu te passar uma referência correta, qual região ou cirurgia de contorno corporal você está pesquisando? A tabela varia conforme o procedimento.`;
  }

  if (procedure === "avaliacao_facial") {
    return `${hello} A consulta presencial com a Dra. Amanda custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. Emitimos nota fiscal. A nota pode ser usada como comprovante de despesa médica na declaração do Imposto de Renda, conforme as regras aplicáveis.`;
  }

  const label = PROCEDURE_LABELS[procedure] || "esse procedimento";
  return `${hello} É uma dúvida importante. Para ${label}, preciso confirmar a referência atual antes de te passar um valor responsável. Posso verificar e continuar por aqui.`;
}

export function getSurgicalPriceReference(procedure) {
  const reference = PRICE_REFERENCES[procedure];
  if (!reference) return null;

  return {
    ...reference,
    cashTotal:
      reference.cashProfessional + reference.hospitalReference,
    installmentTotal:
      reference.installmentProfessional +
      reference.hospitalReference,
    rangeMinimum: roundedThousands(
      reference.rangeMinimumOverride ||
        (
          reference.cashProfessional +
          reference.hospitalReference
        ) * PRICE_RANGE_LOWER_FACTOR,
    ),
    rangeMaximum: roundedThousands(
      reference.rangeMaximumOverride ||
        (
          reference.installmentProfessional +
          reference.hospitalReference
        ) * PRICE_RANGE_UPPER_FACTOR,
    ),
  };
}

export function buildSurgicalInitialPriceReply({
  patientName,
  procedure,
  recentConversation = [],
  currentText = "",
}) {
  const location = LOCATION_REQUEST_PATTERN.test(String(currentText || ""))
    ? CLINIC_LOCATION_REPLY
    : "";
  const asksAboutTerms = INITIAL_PRICE_TERMS_PATTERN.test(
    String(currentText || ""),
  );
  const paymentContext = asksAboutTerms
    ? "O orçamento reúne os itens aplicáveis. O pagamento pode ser parcelado antecipadamente, com quitação antes da cirurgia, e há desconto à vista."
    : "";
  const initialExplanation =
    procedure === "lifting_cervical"
      ? "Entendo — ter uma noção de valor ajuda bastante no planejamento. Na cervicoplastia, o orçamento pode variar porque o tratamento pode ser mais localizado ou envolver uma abordagem mais completa do pescoço e da face. A Dra. Amanda define isso após avaliar cada caso."
      : "Entendo — é natural querer saber o valor antes de decidir. Como cada cirurgia é planejada de forma individual, a Dra. Amanda confirma o valor exato após a avaliação.";
  const guide = priceGuideParagraph(procedure, recentConversation);
  const approvedRangeOffer = [
    "lifting_facial",
    "lifting_cervical",
    "otoplastia",
  ].includes(procedure)
    ? "Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida."
    : "";
  const otoplastyOverview = otoplastyOverviewParagraphs({
    procedure,
    currentText,
    recentConversation,
  });
  return [
    directPriceGreeting(patientName, recentConversation),
    location,
    ...otoplastyOverview,
    initialExplanation,
    guide,
    approvedRangeOffer,
    paymentContext,
    initialPriceDiscoveryQuestion(procedure),
  ].filter(Boolean).join("\n\n");
}

export function buildSurgicalPriceSuggestedReply({
  patientName,
  procedure,
  recentConversation = [],
  referenceCategory = "",
  sourceReference = "",
  directToPatient = false,
  currentText = "",
}) {
  if (procedure === "otoplastia" && directToPatient) {
    const guide = conversationContainsFacialPriceGuide(recentConversation)
      ? ""
      : `Entenda como o orçamento é composto: ${safeLink(priceGuideUrl(PRICE_GUIDES.facial))}`;
    return [
      directPriceGreeting(patientName, recentConversation),
      "Como estimativa geral, a otoplastia costuma ficar entre R$ 8 mil e R$ 14 mil. Essa faixa é apenas informativa: não é orçamento, proposta nem garantia de preço.",
      "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia conforme a anatomia, se a correção será em uma ou nas duas orelhas, técnica, equipe, hospital, anestesia, materiais e acompanhamento. Não representa honorários isolados.",
      "O pagamento pode ser parcelado antecipadamente, com quitação antes da cirurgia, e há desconto à vista.",
      guide,
    ].filter(Boolean).join("\n\n");
  }

  if (procedure === "lifting_cervical") {
    const guide = conversationContainsFacialPriceGuide(recentConversation)
      ? ""
      : `Veja o que compõe o valor: ${safeLink(priceGuideUrl(PRICE_GUIDES.facial))}`;
    const location =
      directToPatient &&
      LOCATION_REQUEST_PATTERN.test(String(currentText || ""))
        ? CLINIC_LOCATION_REPLY
        : "";
    return [
      directToPatient
        ? directPriceGreeting(patientName, recentConversation)
        : waitingGreeting(patientName),
      location,
      "Como estimativa geral, a cervicoplastia (lifting cervical) costuma ficar entre R$ 18 mil e R$ 26 mil. Essa faixa é apenas informativa: não é orçamento, proposta nem garantia de preço.",
      "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia conforme a extensão do procedimento, eventual associação a outras abordagens da face e do pescoço, equipe, hospital, anestesia, materiais e necessidades individuais. Não representa honorários isolados.",
      "O pagamento pode ser parcelado antecipadamente, com quitação antes da cirurgia, e há desconto à vista.",
      guide,
    ].filter(Boolean).join("\n\n");
  }

  if (procedure === "lifting_facial") {
    const guide = conversationContainsFacialPriceGuide(recentConversation)
      ? ""
      : `Veja o que compõe o valor: ${safeLink(LIFTING_PRICE_GUIDE_URL)}`;
    const location =
      directToPatient &&
      LOCATION_REQUEST_PATTERN.test(String(currentText || ""))
        ? CLINIC_LOCATION_REPLY
        : "";

    if (directToPatient) {
      return [
        directPriceGreeting(patientName, recentConversation),
        location,
        [
          "Estimativa geral, apenas informativa — não é orçamento, proposta nem garantia de preço:",
          "• Minilifting: entre R$ 18 mil e R$ 25 mil",
          "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
        ].join("\n"),
        "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia por técnica, complexidade, necessidades individuais, equipe, hospital, anestesia, materiais e acompanhamento. Não representa honorários isolados.",
        "O pagamento pode ser parcelado antecipadamente, com quitação antes da cirurgia, e há desconto à vista.",
        guide,
      ].filter(Boolean).join("\n\n");
    }

    return [
      waitingGreeting(patientName),
      location,
      [
        "Estimativas gerais, apenas informativas — não são orçamento, proposta nem garantia de preço:",
        "• Minilifting: entre R$ 18 mil e R$ 25 mil",
        "• Lifting facial: entre R$ 26 mil e R$ 42 mil",
      ].join("\n"),
      "O valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa. Varia por técnica, complexidade, necessidades individuais, equipe, hospital, anestesia, materiais e acompanhamento. Não representa honorários isolados.",
      "O pagamento pode ser parcelado antecipadamente, com quitação antes da cirurgia, e há desconto à vista.",
      guide,
    ].filter(Boolean).join("\n\n");
  }

  const priceReference = getSurgicalPriceReference(procedure);
  if (!priceReference) {
    return clarificationFor(procedure, patientName);
  }

  const priceContext = [
    waitingGreeting(patientName),
    `Como referência, ${priceReference.label} costuma ficar entre ${formatBRL(priceReference.rangeMinimum)} e ${formatBRL(priceReference.rangeMaximum)}.`,
    priceVariation(procedure),
  ].join(" ");
  const budgetContext =
    "A indicação e o valor final variam conforme o planejamento. A Dra. Amanda prioriza segurança, naturalidade e preservação das suas características.";
  const careAndPayment = [
    "Hospital, anestesista, auxiliar, instrumentador, materiais e acompanhamento variam por caso.",
    "Há desconto à vista e parcelamento antecipado, com quitação antes da cirurgia.",
  ].join(" ");
  const procedureGuide = priceGuideForProcedure(procedure);
  const guide = procedureGuide && !conversationContainsPriceGuide(
    recentConversation,
    procedureGuide,
  )
    ? `Entenda como funcionam esses gastos: ${safeLink(priceGuideUrl(procedureGuide))}`
    : "";
  return [
    priceContext,
    budgetContext,
    careAndPayment,
    guide,
  ].filter(Boolean).join("\n\n");
}

export function buildSurgicalPriceHoldingReply({
  patientName,
  procedure,
  overnight = false,
  currentText = "",
}) {
  const name = firstName(patientName);
  const opening = name ? `Claro, ${name}.` : "Claro.";
  const reference = PRICE_REFERENCES[procedure];
  const procedureContext = reference
    ? ` para ${reference.label}`
    : "";
  const returnTiming = overnight ? "pela manhã" : "por aqui";
  const text = String(currentText || "");
  const pendingTopic = /quantas?\s+vezes|parcel/i.test(text)
    ? "a quantidade de parcelas disponível"
    : /desconto|[àa]\s+vista/i.test(text)
      ? "a condição atual de desconto à vista"
      : /inclu[ií]|hospital|anestes/i.test(text)
        ? "quais itens se aplicam ao orçamento"
        : reference
          ? `a faixa atual de valor para ${reference.label}`
          : "a faixa atual de valor desse procedimento";
  const location = LOCATION_REQUEST_PATTERN.test(String(currentText || ""))
    ? CLINIC_LOCATION_REPLY
    : "";

  return [
    [opening, location].filter(Boolean).join(" "),
    `Vou confirmar ${pendingTopic}${procedureContext && !reference ? procedureContext : ""} com a equipe e te retorno ${returnTiming}. O pagamento cirúrgico pode ser parcelado antecipadamente, com quitação antes do procedimento, e há desconto à vista.`,
  ].filter(Boolean).join("\n\n");
}

export function isSurgicalPriceReview(decision, plan) {
  if (decision?.route !== "human_review") return false;

  const reason = [
    decision?.reviewReason,
    plan?.reason,
    plan?.requestReason,
  ]
    .filter(Boolean)
    .join(" ");
  if (/pending_hospital_quote_followup/i.test(reason)) return false;
  return /(?:price|preco|valor|orcamento)/i.test(reason);
}

export function buildPendingHospitalQuoteAlert({
  patientName,
  patientMessage,
}) {
  const hello = greeting(patientName);
  const suggestion = `${hello} Obrigada pela visita e pela mensagem. Estamos confirmando o valor do hospital e retornaremos assim que tivermos essa informa\u00e7\u00e3o.`;

  return [
    "OR\u00c7AMENTO HOSPITALAR \u2014 RESPOSTA HUMANA NECESS\u00c1RIA",
    `Paciente: ${limitText(patientMessage, 180) || "Mensagem sem texto."}`,
    "N\u00c3O RESPONDER AUTOMATICAMENTE. Sugest\u00e3o para revisar e copiar:",
    suggestion,
  ].join("\n");
}

export function buildPriceReviewAlert({
  patientName,
  patientMessage,
  procedure,
  recentConversation = [],
  referenceCategory = "",
  sourceReference = "",
}) {
  const suggestion = buildSurgicalPriceSuggestedReply({
    patientName,
    procedure,
    recentConversation,
    referenceCategory,
    sourceReference,
  });

  return [
    "PREÇO CIRÚRGICO — REVISAR",
    `Pergunta: ${limitText(patientMessage, 80) || "Mensagem sem texto."}`,
    "VALOR NÃO ENVIADO. Revise e copie manualmente:",
    suggestion,
  ].join("\n");
}
