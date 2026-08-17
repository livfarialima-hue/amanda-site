import { usableProfileFirstName } from "./profile-name.mjs";

const CONSULTATION_PRICE = 500;
const PRICE_GUIDE_PATH =
  "/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/";
const PRICE_GUIDE_URL =
  `https://draamandaschroeder.com.br${PRICE_GUIDE_PATH}`;
const LIFTING_PRICE_GUIDE_PATH =
  "/conteudos/quanto-custa-lifting-facial-sao-paulo/";
const LIFTING_PRICE_GUIDE_URL =
  `https://draamandaschroeder.com.br${LIFTING_PRICE_GUIDE_PATH}`;
const INVISIBLE_LINK_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;
const PRICE_RANGE_LOWER_FACTOR = 0.9;
const PRICE_RANGE_UPPER_FACTOR = 1.1;
const LOCATION_REQUEST_PATTERN =
  /\b(?:onde\s+fica|qual\s+(?:e|é)\s+o\s+endere[cç]o|endere[cç]o|localiza[cç][aã]o|como\s+chegar)\b/i;

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
    label: "a otoplastia com anestesia geral",
    cashProfessional: 14401.8,
    installmentProfessional: 15499.08,
    hospitalReference: 6000,
    source: "CIRURGIAS 2025!A22:C22 + Página7!A17:D17",
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

function conversationContainsPriceGuide(recentConversation) {
  return (Array.isArray(recentConversation)
    ? recentConversation
    : []
  ).some((turn) => {
    const text = String(turn?.text || "");
    return (
      text.includes(PRICE_GUIDE_PATH.slice(0, -1)) ||
      text.includes(LIFTING_PRICE_GUIDE_PATH.slice(0, -1)) ||
      /refer[eê]ncia:\s*custos de cirurgia facial/i.test(text) ||
      /li o conte[uú]do sobre custos de cirurgia facial/i.test(text) ||
      /li o conte[uú]do sobre (?:o )?valor do lifting facial/i.test(text)
    );
  });
}

function shouldIncludePriceGuide(procedure, recentConversation) {
  return (
    FACIAL_PRICE_GUIDE_PROCEDURES.has(procedure) &&
    !conversationContainsPriceGuide(recentConversation)
  );
}

function priceGuideUrlFor(procedure) {
  return procedure === "lifting_facial"
    ? LIFTING_PRICE_GUIDE_URL
    : PRICE_GUIDE_URL;
}

function priceVariation(procedure) {
  if (procedure === "lifting_facial") {
    return "O valor final pode variar conforme o plano envolva face, pescoço ou ambos.";
  }

  return "O valor final pode variar conforme a extensão do procedimento.";
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
    return `${hello} A consulta presencial com a Dra. Amanda custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. Emitimos nota fiscal. A nota pode ser usada como comprovante de despesa médica na declaração do Imposto de Renda, conforme as regras aplicáveis. Você gostaria de entender como funciona a consulta?`;
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
    ? "A Clínica LIV Faria Lima fica na Rua Pais Leme, 215, em Pinheiros, próxima à Av. Faria Lima, em São Paulo."
    : "";
  const guide =
    shouldIncludePriceGuide(procedure, recentConversation)
      ? `Veja o que compõe o valor: ${safeLink(priceGuideUrlFor(procedure))}`
      : "";
  const procedureLabel =
    PRICE_REFERENCES[procedure]?.label ||
    PROCEDURE_LABELS[procedure] ||
    "";
  const nextStep = procedureLabel
    ? "Se quiser, posso explicar como funciona a avaliação."
    : "Qual cirurgia você está pesquisando?";
  return [
    directPriceGreeting(patientName, recentConversation),
    location,
    "Os valores cirúrgicos são definidos individualmente após a avaliação e o planejamento.",
    "O total pode variar conforme a técnica, a complexidade, as necessidades de cada pessoa, a equipe, o hospital, a anestesia, os materiais e o acompanhamento.",
    "O orçamento final discrimina os itens aplicáveis ao caso; não apresentamos um honorário isolado como se fosse o valor total.",
    guide,
    nextStep,
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
  const priceReference = getSurgicalPriceReference(procedure);
  if (!priceReference) {
    return clarificationFor(procedure, patientName);
  }

  if (procedure === "lifting_facial") {
    const guide =
      `Veja o que compõe o valor: ${safeLink(LIFTING_PRICE_GUIDE_URL)}`;
    const location =
      directToPatient &&
      LOCATION_REQUEST_PATTERN.test(String(currentText || ""))
        ? "A Clínica LIV Faria Lima fica na Rua Pais Leme, 215, em Pinheiros, próxima à Av. Faria Lima, em São Paulo."
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
        guide,
        "Se fizer sentido, explico a avaliação.",
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
      guide,
      "Se fizer sentido, explico a avaliação.",
    ].filter(Boolean).join("\n\n");
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
    "Há condição à vista e parcelamento antecipado até a cirurgia.",
  ].join(" ");
  const guide = shouldIncludePriceGuide(
    procedure,
    recentConversation,
  )
    ? `Entenda como funcionam esses gastos: ${safeLink(PRICE_GUIDE_URL)}`
    : "";
  const callToAction =
    "Se a faixa fizer sentido, posso verificar horários para a avaliação. Prefere manhã ou tarde?";

  return [
    priceContext,
    budgetContext,
    careAndPayment,
    guide,
    callToAction,
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
  const returnTiming = overnight
    ? "pela manhã"
    : "por aqui";
  const location = LOCATION_REQUEST_PATTERN.test(String(currentText || ""))
    ? "A Clínica LIV Faria Lima fica em Pinheiros, na Rua Pais Leme, 215, próxima à Av. Faria Lima, em São Paulo."
    : "";

  return [
    [opening, location].filter(Boolean).join(" "),
    [
      `Consigo te passar uma faixa de referência${procedureContext} e também as possibilidades de pagamento.`,
      `Vou confirmar os valores atuais com a equipe e te retorno ${returnTiming}.`,
    ].join(" "),
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
