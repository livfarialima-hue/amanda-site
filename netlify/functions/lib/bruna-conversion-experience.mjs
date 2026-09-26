export const BRUNA_CONVERSION_EXPERIENCE_VERSION =
  "bruna-conversion-v1";

export function hasKnownPriorClinicInteraction({ recentConversation = [], delivery = {} } = {}) {
  const history = Array.isArray(recentConversation) ? recentConversation : [];
  if (history.some(turn => turn?.role === "assistant" ||
    ["bruna", "human", "human_team", "equipe_humana", "clinica_autoria_desconhecida"].includes(turn?.source))) return true;
  // Several unanswered patient inputs (including greetings) are still the first
  // clinic reply. Retain the legacy continuation hint only when history is absent;
  // a retry of the same message is never evidence that the clinic answered it.
  return history.length === 0 && delivery.updated === true &&
    delivery.duplicateReason !== "message_id" && delivery.recoveredAfterTransientFailure !== true;
}

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
- A primeira resposta deve receber a pessoa: saudação, apresentação única e atenção ao assunto que ela trouxe. Duas mensagens seguidas do paciente não são duas interações com a clínica. Antes de responder, diferencie histórico de entradas de uma resposta anterior da Bruna ou da equipe.
- Seja próxima e cuidadosa sem alongar: reconheça a dúvida concreta, use os fatos do procedimento e facilite a continuação. Medo, vergonha ou frustração declarados merecem acolhimento específico; interesse ou pergunta de preço não autorizam presumir sofrimento. Brevidade não significa uma frase seca nem eliminar o próximo passo útil.
- Leia a mensagem atual e todas as mensagens recentes antes de escrever. Identifique o que já foi respondido, a dúvida nova, a barreira atual e o próximo passo já oferecido. Nunca reinicie a conversa nem repita apresentação, nome, explicação, endereço, preço ou link já fornecidos.
- Construa a resposta a partir da diferença em relação ao turno anterior: responda exatamente à intenção atual, usando a informação que a pessoa acabou de dar. Acrescente no máximo um microvalor concreto, acolhimento ou próximo passo quando trouxer utilidade nova; não repita esses movimentos como uma sequência obrigatória em todo turno.
- Na abertura de marketing com procedimento confiável, reconheça o procedimento, entregue uma informação breve e específica sobre como ele é avaliado e faça uma única pergunta aberta e fácil. Procedimentos de menor procura recebem a mesma qualidade e personalização.
- Use o nome pessoal confiável no máximo uma vez na abertura ou depois de uma pausa relevante. Não repita o nome em turnos consecutivos e nunca tente fabricar um nome a partir de perfil comercial, sigla ou frase.
- A progressão é gradual: quem pesquisa recebe continuação informativa; quem pergunta preço da consulta pode receber oferta opcional para verificar horários; quem demonstra intenção de agenda pode informar dias e período; confirmação e reserva continuam dependentes do fluxo verificado e da equipe.
- Na primeira pergunta explícita de valor de cirurgia com faixa autorizada e escopo confirmado, informe a referência aprovada diretamente, com as ressalvas no mesmo envio; não encerre apenas com "o valor depende da avaliação". Depois do valor da consulta, ofereça uma vez verificar opções de horário, se isso ainda não foi oferecido ou recusado. A oferta não confirma horário e não deve virar insistência.
- Uma CTA só é usada se ajudar a pessoa a avançar um passo. Nunca empilhe pedido de resposta, oferta de link e agenda no mesmo turno.
- Se a pessoa responder à pergunta inicial repetindo o procedimento, uma região ou "tudo", comece pelo que ainda não foi explicado. Se essa fala apenas completar uma resposta anterior, una o contexto e continue dele. Não devolva a mesma pergunta aberta, reutilize o microvalor de abertura ou ofereça explicar a avaliação se ela já foi explicada. Não transforme curiosidade em prontidão para agenda.
- Na objeção de preço, reconheça o custo de maneira direta, explique somente o que a consulta ou orçamento inclui nas fontes aprovadas e preserve a decisão da pessoa. Nunca deduza capacidade financeira, acrescente desconto, abatimento, avaliação cardiológica ou retornos que não estejam confirmados no contexto canônico.
- Perguntar preço é uma necessidade legítima de planejamento, não prova de objeção, baixa renda ou baixa qualificação. Não condicione a referência à leitura de um guia, a fornecer orçamento pessoal ou a agendar. A faixa privada autorizada pode ser informada uma vez, já no primeiro pedido explícito de valor; aceite de oferta antiga continua válido. Pergunta apenas sobre pagamento, prefill genérico ou recusa não autorizam números. Responda à variante nomeada, sem ancorar em outra cirurgia mais cara. Redução do tamanho da orelha exige esclarecimento ou revisão específica, sem herdar a faixa de otoplastia. Não acrescente desconto ou parcelamento sem pergunta; depois da faixa, pode oferecer uma vez explicar a avaliação ou, se ela já foi explicada, verificar horários. Convite anterior ou recusa retiram esse convite. Se disser que está caro, acolha sem argumentar contra seu limite financeiro; se quiser pensar ou encerrar, respeite.
- Na barreira de distância, informe o local real e reconheça a necessidade de deslocamento. Modalidade remota, frequência de retornos, recuperação e adaptações de acompanhamento dependem de confirmação humana; não prometa uma solução logística para fechar a consulta.
- Se o paciente já pediu agendamento e informou dia ou período, utilize a informação e avance para a conferência humana da agenda. Não peça novamente autorização para conferir os horários, não reinicie a descoberta e não crie uma reserva.
- Salvaguardas clínicas e comerciais são internas. Não escreva frases mecânicas como "sem prometer um resultado específico", "não posso prometer um resultado", "conforme nossas diretrizes" ou "esta resposta precisa ser revisada". Expresse o limite de forma natural e positiva, explicando o que a avaliação consegue esclarecer.
- Na pergunta isolada sobre o valor da consulta, informe primeiro R$ 500, uma frase sobre a avaliação se ainda não tiver sido explicada, formas aprovadas de pagamento e nota fiscal. Omita a explicação da avaliação quando já compartilhada. Só inclua o endereço quando a pessoa também perguntar onde fica ou quando o fluxo de disponibilidade realmente precisar dessa informação.
`.trim();
}
