export const BRUNA_CONVERSION_EXPERIENCE_VERSION =
  "bruna-conversion-v1";

export const BRUNA_CTA_TYPES = Object.freeze({
  INFORMATION: "informational_continuation",
  PRICE_REFERENCE: "price_reference_offer",
  AVAILABILITY: "availability_exploration",
  PREFERENCE: "preference_capture",
});

const ENABLED_VALUES = new Set([
  "1",
  "true",
  "enabled",
  "on",
  "yes",
]);

const PROCEDURE_OPENING_MICROVALUES = Object.freeze({
  lifting_facial:
    "Na avaliação, a Dra. Amanda considera o rosto e o pescoço em conjunto para entender quais possibilidades fazem sentido para você.",
  lifting_cervical:
    "Na avaliação, a Dra. Amanda observa pele, volumes e contorno do pescoço para entender quais possibilidades fazem sentido.",
  blefaroplastia:
    "Na avaliação, a Dra. Amanda considera as pálpebras superiores e inferiores e sua relação com o restante da face.",
  frontoplastia:
    "Na avaliação, a Dra. Amanda considera a testa, a posição das sobrancelhas e sua relação com o restante da face.",
  otoplastia:
    "Na avaliação, a Dra. Amanda observa projeção, dobras e assimetrias de cada orelha.",
  avaliacao_facial:
    "A avaliação considera o rosto como um todo e o que você deseja melhorar ou preservar.",
  lip_lifting:
    "Na avaliação, a Dra. Amanda considera as proporções entre o lábio, o nariz e o sorriso.",
  lipo_papada:
    "Na avaliação, a Dra. Amanda considera volume, pele e contorno do pescoço antes de explicar as possibilidades.",
  rinoplastia:
    "Na avaliação, a Dra. Amanda considera forma, proporção e função nasal em conjunto.",
  lipoaspiracao:
    "Na avaliação, a Dra. Amanda considera a distribuição de volume, a pele e o contorno corporal.",
  abdominoplastia:
    "Na avaliação, a Dra. Amanda considera pele, parede abdominal e contorno de forma conjunta.",
  mastopexia:
    "Na avaliação, a Dra. Amanda considera posição, volume e proporções das mamas.",
  protese_mama:
    "Na avaliação, a Dra. Amanda conversa sobre volume, proporções e as possibilidades de planejamento.",
  mamoplastia_redutora:
    "Na avaliação, a Dra. Amanda considera volume, proporções e os sintomas que a pessoa relata.",
  braquioplastia:
    "Na avaliação, a Dra. Amanda considera pele, volume e contorno dos braços.",
  ninfoplastia:
    "A conversa é reservada, e a avaliação é conduzida de forma individual e cuidadosa.",
  contorno_corporal:
    "A avaliação considera as regiões que mais importam para você e como planejar o contorno de forma integrada.",
  cirurgias_combinadas:
    "A combinação só é considerada depois de entender suas prioridades e avaliar um planejamento seguro.",
});

const MECHANICAL_POLICY_PATTERNS = Object.freeze([
  {
    reason: "mechanical_result_disclaimer",
    pattern:
      /\b(?:sem\s+prometer|n[aã]o\s+posso\s+prometer|n[aã]o\s+podemos\s+prometer)\s+(?:um\s+)?resultado(?:\s+espec[ií]fico)?\b/i,
  },
  {
    reason: "mechanical_safety_disclaimer",
    pattern:
      /\bpor\s+seguran[cç]a\s*(?:,|eu|n[oó]s)?\s*n[aã]o\s+(?:posso|podemos)\b/i,
  },
  {
    reason: "internal_policy_disclosure",
    pattern:
      /\b(?:conforme|seguindo|para\s+cumprir)\s+(?:as\s+|nossas\s+)?(?:diretrizes|pol[ií]ticas|regras\s+internas)\b/i,
  },
  {
    reason: "internal_review_disclosure",
    pattern:
      /\b(?:esta|essa|a)\s+resposta\s+(?:precisa|deve)\s+ser\s+(?:revisada|aprovada)\b/i,
  },
]);

function normalized(value) {
  return String(value || "").trim();
}

export function isBrunaConversionExperienceEnabled(env = {}) {
  return ENABLED_VALUES.has(
    normalized(env.BRUNA_CONVERSION_EXPERIENCE_V1).toLowerCase(),
  );
}

export function procedureOpeningMicrovalue(procedure) {
  return PROCEDURE_OPENING_MICROVALUES[normalized(procedure)] || "";
}

export function patientFacingPolicyLanguageReason(value) {
  const text = normalized(value);
  if (!text) return "";

  return (
    MECHANICAL_POLICY_PATTERNS.find(({ pattern }) => pattern.test(text))
      ?.reason || ""
  );
}

export function classifyBrunaCta(value) {
  const text = normalized(value);
  if (!text) return "";

  if (
    /\b(?:faixa|refer[eê]ncia)\s+(?:geral\s+)?(?:de\s+valores?|como\s+ponto\s+de\s+partida)\b/i.test(
      text,
    ) &&
    /\b(?:posso|podemos)\s+(?:te|lhe)?\s*passar\b/i.test(text)
  ) {
    return BRUNA_CTA_TYPES.PRICE_REFERENCE;
  }

  if (
    /\b(?:quais?\s+dias?|qual\s+per[ií]odo|manh[aã]\s+ou\s+tarde|prefere\s+(?:de\s+)?manh[aã]|prefere\s+(?:[àa]\s+)?tarde)\b/i.test(
      text,
    )
  ) {
    return BRUNA_CTA_TYPES.PREFERENCE;
  }

  if (
    /\b(?:verificar|ver|consultar)\s+(?:as\s+)?(?:op[cç][oõ]es\s+de\s+)?hor[aá]rios?\b/i.test(
      text,
    ) ||
    /\b(?:podemos|posso)\s+agendar\b/i.test(text)
  ) {
    return BRUNA_CTA_TYPES.AVAILABILITY;
  }

  if (
    /\b(?:quer\s+que\s+eu\s+(?:te|lhe)?|se\s+quiser,?\s+posso\s+(?:te|lhe)?|posso\s+(?:te|lhe)?)\s*(?:explicar|explique|contar|conte|detalhar|detalhe|mostrar|mostre)\b/i.test(
      text,
    )
  ) {
    return BRUNA_CTA_TYPES.INFORMATION;
  }

  return "";
}

function questionCount(value) {
  return (normalized(value).match(/\?+/g) || []).length;
}

function hasPressureLanguage(value) {
  return /\b(?:[uú]ltimas?\s+vagas?|aproveite|n[aã]o\s+perca|imperd[ií]vel|realize\s+seu\s+sonho|cabe\s+no\s+seu\s+bolso)\b/i.test(
    normalized(value),
  );
}

export function assessBrunaReplyExperience({
  body,
  procedure = "",
  kind = "standard",
}) {
  const text = normalized(body);
  const ctaType = classifyBrunaCta(text);
  const policyLanguageReason = patientFacingPolicyLanguageReason(text);
  const preferredMaximum = kind === "approved_price_range" ? 650 : 420;
  const procedureToken = normalized(procedure)
    .replaceAll("_", " ")
    .split(/\s+/)
    .filter((token) => token.length >= 5)
    .some((token) => text.toLowerCase().includes(token));
  const hasConcreteDetail = /\b(?:R\$\s*500|p[aá]lpebras?|rosto\s+e\s+(?:o\s+)?pesco[cç]o|pele,?\s+(?:os\s+)?volumes?|proje[cç][aã]o,?\s+dobras?|l[aá]bio,?\s+(?:o\s+)?nariz|parede\s+abdominal|nota\s+fiscal|Pix|d[eé]bito|parcelamento)\b/i.test(
    text,
  );
  const toneScore = Math.max(
    0,
    2 - Number(hasPressureLanguage(text)) - Number(Boolean(policyLanguageReason)),
  );
  const specificityScore = Math.min(
    2,
    Number(procedureToken || /\bconsulta\b/i.test(text)) +
      Number(hasConcreteDetail),
  );

  return Object.freeze({
    characterCount: Array.from(text).length,
    questionCount: questionCount(text),
    ctaType,
    conversionOutcome: ctaType || (questionCount(text) === 1
      ? "contextualized_discovery"
      : "direct_answer"),
    policyLanguageReason,
    toneScore,
    specificityScore,
    withinPreferredLength:
      Array.from(text).length <= preferredMaximum,
  });
}

export function brunaConversionGuidelinesAppendix() {
  return `
Experiência conversacional de conversão v1:
- Leia a mensagem atual e todas as mensagens recentes antes de escrever. Identifique o que já foi respondido, a dúvida nova, a barreira atual e o próximo passo já oferecido. Nunca reinicie a conversa nem repita apresentação, nome, explicação, endereço, preço ou link já fornecidos.
- Construa a resposta nesta ordem: responda exatamente à intenção atual; acrescente no máximo um microvalor concreto e pertinente; reduza a pressão de decisão quando necessário; proponha no máximo um próximo passo compatível com o estágio.
- Na abertura de marketing com procedimento confiável, reconheça o procedimento, entregue uma informação breve e específica sobre como ele é avaliado e faça uma única pergunta aberta e fácil. Procedimentos de menor procura recebem a mesma qualidade e personalização.
- Use o nome pessoal confiável no máximo uma vez na abertura ou depois de uma pausa relevante. Não repita o nome em turnos consecutivos e nunca tente fabricar um nome a partir de perfil comercial, sigla ou frase.
- A progressão é gradual: quem pesquisa recebe continuação informativa; quem pergunta preço da consulta pode receber oferta opcional para verificar horários; quem demonstra intenção de agenda pode informar dias e período; confirmação e reserva continuam dependentes do fluxo verificado e da equipe.
- Uma CTA só é usada se ajudar a pessoa a avançar um passo. Nunca empilhe pedido de resposta, oferta de link e agenda no mesmo turno.
- Salvaguardas clínicas e comerciais são internas. Não escreva frases mecânicas como "sem prometer um resultado específico", "não posso prometer um resultado", "conforme nossas diretrizes" ou "esta resposta precisa ser revisada". Expresse o limite de forma natural e positiva, explicando o que a avaliação consegue esclarecer.
- Na pergunta isolada sobre o valor da consulta, informe primeiro R$ 500, formas aprovadas de pagamento e nota fiscal. Omita a explicação da avaliação se ela não resolver uma dúvida nova. Só inclua o endereço quando a pessoa também perguntar onde fica ou quando o fluxo de disponibilidade realmente precisar dessa informação.
`.trim();
}
