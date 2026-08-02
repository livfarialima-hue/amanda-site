const CONSULTATION_PRICE = 500;
const PRICE_GUIDE_PATH =
  "/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/";
const PRICE_GUIDE_URL =
  `https://draamandaschroeder.com.br${PRICE_GUIDE_PATH}` +
  "?utm_source=whatsapp&utm_medium=atendimento" +
  "&utm_campaign=guia_custos_face" +
  "&utm_content=resposta_preco_cirurgia";
const PRICE_RANGE_LOWER_FACTOR = 0.9;
const PRICE_RANGE_UPPER_FACTOR = 1.1;

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
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function limitText(value, maximumLength) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
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
      /refer[eê]ncia:\s*custos de cirurgia facial/i.test(text) ||
      /li o conte[uú]do sobre custos de cirurgia facial/i.test(text)
    );
  });
}

function shouldIncludePriceGuide(procedure, recentConversation) {
  return (
    FACIAL_PRICE_GUIDE_PROCEDURES.has(procedure) &&
    !conversationContainsPriceGuide(recentConversation)
  );
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
    return `${hello} A consulta presencial com a Dra. Amanda custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. Emitimos nota fiscal, e esse valor é abatido se a cirurgia for realizada com a equipe. A nota pode ser usada como comprovante de despesa médica na declaração do Imposto de Renda, conforme as regras aplicáveis. Você gostaria de entender como funciona a consulta?`;
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
      (reference.cashProfessional + reference.hospitalReference) *
        PRICE_RANGE_LOWER_FACTOR,
    ),
    rangeMaximum: roundedThousands(
      (
        reference.installmentProfessional +
        reference.hospitalReference
      ) * PRICE_RANGE_UPPER_FACTOR,
    ),
  };
}

export function buildSurgicalPriceSuggestedReply({
  patientName,
  procedure,
  recentConversation = [],
}) {
  const reference = getSurgicalPriceReference(procedure);
  if (!reference) return clarificationFor(procedure, patientName);

  const priceContext = [
    waitingGreeting(patientName),
    `Como referência, ${reference.label} costuma ficar entre ${formatBRL(reference.rangeMinimum)} e ${formatBRL(reference.rangeMaximum)}.`,
    priceVariation(procedure),
  ].join(" ");
  const budgetContext =
    "O orçamento separa equipe médica, anestesia, hospital, materiais e acompanhamento, para você comparar o conjunto.";
  const careAndPayment = [
    "Há condição à vista e pagamento antecipado até a cirurgia.",
    `A consulta custa R$ ${CONSULTATION_PRICE}, aceita Pix, débito ou parcelamento e é abatida se houver cirurgia com a equipe.`,
  ].join(" ");
  const guide = shouldIncludePriceGuide(
    procedure,
    recentConversation,
  )
    ? `Guia sobre o que comparar além do preço: ${PRICE_GUIDE_URL}`
    : "";
  const callToAction =
    "Se a faixa fizer sentido, posso verificar um horário para a avaliação.";

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

  return [
    opening,
    `Consigo te passar uma faixa de referência${procedureContext} e também as possibilidades de pagamento.`,
    `Vou confirmar os valores atuais com a equipe e te retorno ${returnTiming}.`,
  ].join(" ");
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
}) {
  const suggestion = buildSurgicalPriceSuggestedReply({
    patientName,
    procedure,
    recentConversation,
  });

  return [
    "PREÇO CIRÚRGICO — REVISAR",
    `Pergunta: ${limitText(patientMessage, 80) || "Mensagem sem texto."}`,
    "VALOR NÃO ENVIADO. Revise e copie manualmente:",
    suggestion,
  ].join("\n");
}
