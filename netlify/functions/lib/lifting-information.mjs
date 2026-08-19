import { usableProfileFirstName } from "./profile-name.mjs";

export const LIFTING_FACIAL_INFORMATION_REPLY_CODE =
  "LIFTING-FACIAL-INFORMATION-01";

const DURATION_PATTERN =
  /\b(?:quanto\s+tempo\s+(?:leva|dura)|dura[cç][aã]o|tempo\s+(?:da\s+)?cirurgia|tempo\s+cir[uú]rgico)\b/i;
const RECOVERY_PATTERN =
  /\b(?:recupera[cç][aã]o|p[oó]s[-\s]?operat[oó]rio|afastamento|repouso|incha[cç]o|roxos?|hematomas?|retomar\s+(?:o\s+)?trabalho|voltar\s+(?:ao\s+)?trabalho|voltar\s+[àa]\s+rotina)\b/i;
const INDICATION_PATTERN =
  /\b(?:indica[cç](?:[aã]o|[oõ]es)|indicado|indicada|(?:se|talvez|acho\s+que)\s+(?:eu\s+)?(?:ainda\s+)?(?:n[aã]o\s+)?precis[oa]|necess[aá]rio|necess[aá]ria|faz\s+sentido|idade\s+certa|momento\s+de\s+operar)\b/i;

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
  if (String(procedure || "") !== "lifting_facial") return [];

  const value = String(text || "");
  const topics = [];
  if (DURATION_PATTERN.test(value)) topics.push("duration");
  if (RECOVERY_PATTERN.test(value)) topics.push("recovery");
  if (INDICATION_PATTERN.test(value)) topics.push("indication");
  return topics;
}

export function approvedLiftingFacialFacts({ text, procedure } = {}) {
  const topics = liftingFacialInformationTopics({ text, procedure });
  if (!topics.length) return null;

  const facts = [];
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
