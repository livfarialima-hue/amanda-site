import { usableProfileFirstName } from "./profile-name.mjs";

export const LIFTING_FACIAL_INFORMATION_REPLY_CODE =
  "LIFTING-FACIAL-INFORMATION-01";
export const LIFTING_SCOPE_COMPARISON_REPLY_CODE =
  "LIFTING-SCOPE-COMPARISON-01";

const DURATION_PATTERN =
  /\b(?:quanto\s+tempo\s+(?:leva|dura)|dura[cç][aã]o|tempo\s+(?:da\s+)?cirurgia|tempo\s+cir[uú]rgico)\b/i;
const RECOVERY_PATTERN =
  /\b(?:recupera[cç][aã]o|p[oó]s[-\s]?operat[oó]rio|afastamento|repouso|incha[cç]o|roxos?|hematomas?|retomar\s+(?:o\s+)?trabalho|voltar\s+(?:ao\s+)?trabalho|voltar\s+[àa]\s+rotina)\b/i;
const INDICATION_PATTERN =
  /\b(?:indica[cç](?:[aã]o|[oõ]es)|indicado|indicada|(?:se|talvez|acho\s+que)\s+(?:eu\s+)?(?:ainda\s+)?(?:n[aã]o\s+)?precis[oa]|necess[aá]rio|necess[aá]ria|faz\s+sentido|idade\s+certa|momento\s+de\s+operar)\b/i;
const MINI_LIFTING_PATTERN = /\bmini\s*lifting\b/i;
const LIFTING_PATTERN = /\blifting(?:\s+facial)?\b/i;
const SCOPE_COMPARISON_PATTERN =
  /\b(?:diferen[cç]a|diferenciam?|qual|compar(?:ar|a[cç][aã]o)|ambos|cada\s+um|versus|vs\.?)\b/i;

function formattedFirstName(value) {
  const raw = usableProfileFirstName(value);
  if (!raw) return "";
  if (raw === raw.toLowerCase() || raw === raw.toUpperCase()) {
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  return raw;
}

export function liftingFacialInformationTopics({
  text,
  procedure,
} = {}) {
  const value = String(text || "");
  const procedureValue = String(procedure || "");
  const topics = [];
  const withoutMiniLifting = value.replace(MINI_LIFTING_PATTERN, " ");
  const comparesLiftingScopes =
    ["lifting_facial", "mini_lifting"].includes(procedureValue) &&
    MINI_LIFTING_PATTERN.test(value) &&
    LIFTING_PATTERN.test(withoutMiniLifting) &&
    SCOPE_COMPARISON_PATTERN.test(value);

  if (comparesLiftingScopes) topics.push("scope_comparison");
  if (procedureValue !== "lifting_facial") return topics;

  if (DURATION_PATTERN.test(value)) topics.push("duration");
  if (RECOVERY_PATTERN.test(value)) topics.push("recovery");
  if (INDICATION_PATTERN.test(value)) topics.push("indication");
  return topics;
}

export function liftingFacialInformationReplyCode({
  text,
  procedure,
} = {}) {
  return liftingFacialInformationTopics({ text, procedure }).includes(
    "scope_comparison",
  )
    ? LIFTING_SCOPE_COMPARISON_REPLY_CODE
    : LIFTING_FACIAL_INFORMATION_REPLY_CODE;
}

export function approvedLiftingFacialFacts({ text, procedure } = {}) {
  const topics = liftingFacialInformationTopics({ text, procedure });
  if (!topics.length) return null;

  const facts = [];
  if (topics.includes("scope_comparison")) {
    facts.push({
      topic: "scope_comparison",
      statement:
        "O minilifting costuma ser considerado quando as alterações são mais localizadas e a anatomia permite uma abordagem de menor extensão. O lifting facial possibilita um planejamento mais amplo, podendo envolver bochechas, contorno da mandíbula, terço inferior do rosto e, conforme o caso, o pescoço.",
    });
  }
  if (topics.includes("duration")) {
    facts.push({
      topic: "duration",
      statement:
        "A duração da cirurgia varia conforme o planejamento — somente face, face e pescoço ou algum procedimento associado — e é definida depois da avaliação.",
    });
  }
  if (topics.includes("recovery")) {
    facts.push({
      topic: "recovery",
      statement:
        "Na primeira semana, são comuns inchaço, roxos, curativos e necessidade de apoio. Alguns pacientes retomam atividades sociais leves em cerca de 10 a 14 dias e a rotina, progressivamente, entre 3 e 4 semanas. Inchaço residual, sensibilidade e cicatrizes ainda evoluem por alguns meses.",
    });
  }
  if (topics.includes("indication")) {
    facts.push({
      topic: "indication",
      statement:
        "Não existe uma idade única. Em geral, o lifting pode fazer sentido quando há queda das bochechas, perda da linha da mandíbula ou flacidez na parte inferior da face e no pescoço. Alterações discretas ou ligadas principalmente a textura, manchas, linhas finas ou perda isolada de volume podem indicar outro caminho — ou que ainda não seja o momento de operar.",
    });
  }

  return {
    procedure: "lifting_facial",
    topics,
    facts,
    boundaries: [
      "Não informar uma duração numérica exata sem uma referência aprovada.",
      "Não concluir indicação individual pelo WhatsApp.",
      "Não prometer que o minilifting terá cicatriz menor, recuperação mais rápida ou será suficiente para o caso individual.",
      "A avaliação pode inclusive concluir que a cirurgia ainda não está indicada.",
    ],
  };
}

export function buildLiftingFacialInformationReply({
  text,
  procedure,
  patientName,
  introduceBruna = false,
} = {}) {
  const approved = approvedLiftingFacialFacts({ text, procedure });
  if (!approved) return "";

  const name = formattedFirstName(patientName);
  if (
    approved.topics.length === 1 &&
    approved.topics[0] === "scope_comparison"
  ) {
    const opening = introduceBruna
      ? `${name ? `Olá, ${name}!` : "Olá!"} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`
      : name
        ? `Claro, ${name}.`
        : "Claro.";
    return [
      `${opening} A principal diferença está na extensão do tratamento. ${approved.facts[0].statement}`,
      "A melhor opção não é definida apenas pelo nome da cirurgia, mas pelo que a Dra. Amanda identifica durante a avaliação. Quer que eu te explique como essa escolha é feita na consulta?",
    ].join("\n\n");
  }

  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const opening = introduceBruna
    ? `${greeting} Eu sou a Bruna, concierge da Clínica LIV Faria Lima.`
    : greeting;
  const introduction = approved.topics.length > 1
    ? "Essas são dúvidas muito válidas, principalmente quando você ainda está entendendo se a cirurgia faz sentido."
    : approved.topics.includes("indication")
      ? "Essa é uma dúvida muito válida, porque a avaliação não pressupõe que você precise operar."
      : "Essa é uma dúvida importante para planejar a cirurgia com tranquilidade.";
  const paragraphs = [opening, introduction];

  for (const topic of approved.topics) {
    const fact = approved.facts.find((item) => item.topic === topic);
    if (fact?.statement) paragraphs.push(fact.statement);
  }

  paragraphs.push(
    "A avaliação com a Dra. Amanda serve para diferenciar essas possibilidades, sem compromisso de operar. Quer que eu te explique como funciona essa avaliação?",
  );

  return paragraphs.join("\n\n");
}
