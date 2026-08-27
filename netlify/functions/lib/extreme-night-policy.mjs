import { usableProfileFirstName } from "./profile-name.mjs";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_START_HOUR = 0;
const DEFAULT_END_HOUR = 6;
const EXTREME_NIGHT_ACK_PATTERN =
  /como j[áa] [ée] madrugada[\s\S]*retom(?:amos|ar|aremos)[\s\S]*pela manh[ãa]/i;

const PROCEDURE_LABELS = Object.freeze({
  lifting_cervical: "lifting cervical",
  lifting_facial: "lifting facial",
  blefaroplastia: "blefaroplastia",
  frontoplastia: "frontoplastia",
  otoplastia: "otoplastia",
  avaliacao_facial: "avaliação facial",
  lip_lifting: "lifting labial",
  lipo_papada: "tratamento da papada",
  rinoplastia: "rinoplastia",
  abdominoplastia: "abdominoplastia",
  lipoaspiracao: "lipoaspiração",
  mastopexia: "mastopexia",
  protese_mama: "prótese de mama",
  mamoplastia_redutora: "mamoplastia redutora",
  mamoplastia: "cirurgia das mamas",
  braquioplastia: "braquioplastia",
  ninfoplastia: "ninfoplastia",
  contorno_corporal: "cirurgia de contorno corporal",
  cirurgias_combinadas: "cirurgias combinadas",
});

const GENERIC_PROCEDURE_INTEREST_PATTERN =
  /\b(?:quero|gostaria|tenho\s+interesse|queria|preciso)\b[\s\S]{0,80}\b(?:saber|entender|conhecer|informa[cç][oõ]es?|orienta[cç][aã]o|fazer)\b|\b(?:saber|entender|conhecer)\s+mais\b/i;
const EVALUATION_INFORMATION_PATTERN =
  /\b(?:como\s+funciona|entender|saber|explicar|informa[cç][oõ]es?\s+sobre)\b[\s\S]{0,80}\bavalia[cç][aã]o\b|\bavalia[cç][aã]o\b[\s\S]{0,50}\b(?:como\s+funciona|entender|saber|explicar)\b/i;
const SPECIFIC_PROCEDURE_QUESTION_PATTERN =
  /\b(?:valor|pre[cç]o|quanto|or[cç]amento|parcel|recuper|p[oó]s[-\s]?oper|afast|trabalho|incha[cç]o|endere[cç]o|onde\s+fica|localiza[cç][aã]o|instagram|site|conv[eê]nio|anestesia|risco|hospital|agenda|agendar|hor[aá]rio|disponibilidade)\b/i;

function boundedHour(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23
    ? parsed
    : fallback;
}

function localMinutes(value, env = process.env) {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone:
      String(env.HUMAN_RESUME_TIME_ZONE || "").trim() ||
      DEFAULT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return values.hour * 60 + values.minute;
}

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function procedureLabel(procedure, text = "") {
  if (PROCEDURE_LABELS[procedure]) return PROCEDURE_LABELS[procedure];

  const value = normalized(text);
  if (/lifting cervical|cervicoplastia/.test(value)) {
    return "lifting cervical";
  }
  if (/lifting facial|minilifting/.test(value)) return "lifting facial";
  if (/blefaroplastia|palpebra/.test(value)) return "blefaroplastia";
  if (/otoplastia|orelha/.test(value)) return "otoplastia";
  if (/papada/.test(value)) return "tratamento da papada";
  if (/frontoplastia|reducao da testa/.test(value)) return "frontoplastia";
  if (/avaliacao facial|harmonizacao facial/.test(value)) {
    return "avaliação facial";
  }
  if (/lip lifting|lifting labial/.test(value)) return "lifting labial";
  if (/rinoplastia|cirurgia do nariz/.test(value)) return "rinoplastia";
  if (/lipoaspiracao/.test(value)) return "lipoaspiração";
  if (/abdominoplastia/.test(value)) return "abdominoplastia";
  if (/mastopexia|lifting de mamas/.test(value)) return "mastopexia";
  if (/protese de mama|silicone nos seios/.test(value)) {
    return "prótese de mama";
  }
  if (/mamoplastia redutora|reducao de mamas/.test(value)) {
    return "mamoplastia redutora";
  }
  if (/braquioplastia|lifting de bracos/.test(value)) {
    return "braquioplastia";
  }
  if (/ninfoplastia|labioplastia/.test(value)) return "ninfoplastia";
  if (/contorno corporal|pos bariatrica/.test(value)) {
    return "cirurgia de contorno corporal";
  }
  if (/mommy makeover|cirurgias combinadas/.test(value)) {
    return "cirurgias combinadas";
  }
  return "";
}

function topicDescription({ procedure, currentText, messageType }) {
  const text = normalized(currentText);
  const label = procedureLabel(procedure, currentText);

  if (String(messageType || "").toLowerCase() === "image") {
    return "a foto e a queixa que você compartilhou";
  }
  if (/valor da consulta|consulta.*(?:valor|preco)|quanto.*consulta/.test(text)) {
    return "o valor da consulta";
  }
  if (/valor|preco|quanto custa|orcamento|parcel/.test(text)) {
    return label ? `valores de ${label}` : "valores";
  }
  if (/recuper|pos operator|afast|trabalho|inchaco/.test(text)) {
    return label ? `a recuperação de ${label}` : "a recuperação";
  }
  if (/agenda|agendar|horario|disponibilidade|marcar/.test(text)) {
    return "o agendamento da avaliação";
  }
  return label;
}

function greeting(patientName, period = "Olá") {
  const firstName = usableProfileFirstName(patientName);
  return firstName ? `${period}, ${firstName}!` : `${period}!`;
}

export function isExtremeNight(value, env = process.env) {
  const minutes = localMinutes(value, env);
  if (minutes === null) return false;

  const start = boundedHour(
    env.EXTREME_NIGHT_START_HOUR,
    DEFAULT_START_HOUR,
  ) * 60;
  const end = boundedHour(
    env.EXTREME_NIGHT_END_HOUR,
    DEFAULT_END_HOUR,
  ) * 60;

  return start <= end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

export function isExtremeNightAcknowledgement(text) {
  return EXTREME_NIGHT_ACK_PATTERN.test(String(text || ""));
}

export function hasExtremeNightAcknowledgement(
  recentConversation = [],
  currentAt = null,
  env = process.env,
) {
  const currentTimestamp = currentAt
    ? new Date(currentAt).getTime()
    : 0;

  return (Array.isArray(recentConversation) ? recentConversation : [])
    .some(
      (turn) =>
        turn?.role === "assistant" &&
        isExtremeNightAcknowledgement(turn?.text) &&
        (
          !currentTimestamp ||
          !turn?.at ||
          (
            isExtremeNight(turn.at, env) &&
            currentTimestamp >= new Date(turn.at).getTime() &&
            currentTimestamp - new Date(turn.at).getTime() <=
              6 * 60 * 60 * 1_000
          )
        ),
    );
}

export function buildExtremeNightAcknowledgement({
  patientName,
  procedure,
  currentText,
  messageType = "text",
} = {}) {
  const opening = greeting(patientName);
  const topic = topicDescription({ procedure, currentText, messageType });

  if (String(messageType || "").toLowerCase() === "image") {
    return `${opening} Obrigada por compartilhar sua foto e confiar na equipe. Deixei sua mensagem sinalizada para acompanharmos com atenção. Como já é madrugada, seguimos por aqui pela manhã.`;
  }

  return topic
    ? `${opening} Anotei sua mensagem sobre ${topic}. Como já é madrugada, retomaremos por aqui pela manhã.`
    : "";
}

export function buildMorningProcedureInterestOpening({
  patientName,
  procedure,
  currentText,
} = {}) {
  const text = String(currentText || "").trim();
  const label = procedureLabel(procedure, text);
  const opening = greeting(patientName, "Bom dia");

  if (!label) return "";

  const asksEvaluation =
    EVALUATION_INFORMATION_PATTERN.test(text) &&
    !/\b(?:valor|pre[cç]o|quanto|or[cç]amento)\b/i.test(text);

  if (asksEvaluation) {
    if (procedure === "ninfoplastia" || /ninfoplastia|labioplastia/i.test(text)) {
      return `${opening} Como combinamos, retomando sua mensagem sobre ${label}: a avaliação é feita de forma individual e reservada. A Dra. Amanda conversa sobre o que você busca, avalia a região com cuidado e explica as possibilidades, os limites e a recuperação, sem exigir uma decisão nesse momento.`;
    }

    return `${opening} Como combinamos, retomando sua mensagem sobre ${label}: na avaliação, a Dra. Amanda conversa sobre o que você busca, examina a região com cuidado e explica as possibilidades, os limites e a recuperação. Você não precisa decidir nada nesse momento.`;
  }

  if (
    !GENERIC_PROCEDURE_INTEREST_PATTERN.test(text) ||
    SPECIFIC_PROCEDURE_QUESTION_PATTERN.test(text)
  ) {
    return "";
  }

  if (procedure === "ninfoplastia" || /ninfoplastia|labioplastia/i.test(text)) {
    return `${opening} Como combinamos, retomando sua mensagem sobre ${label}: essa conversa e a avaliação são tratadas de forma individual e reservada. Quer que eu te explique como funciona a avaliação com a Dra. Amanda?`;
  }

  return `${opening} Como combinamos, retomando sua mensagem sobre ${label}: a avaliação com a Dra. Amanda é o primeiro passo para entender o que você busca e quais possibilidades fazem sentido para o seu caso. Quer que eu te explique como ela funciona?`;
}

export function buildMorningResumeOpening({
  patientName,
  procedure,
  currentText,
  recentConversation = [],
} = {}) {
  const historyText = (Array.isArray(recentConversation)
    ? recentConversation
    : [])
    .filter((turn) => turn?.role !== "assistant")
    .slice(-6)
    .map((turn) => String(turn?.text || ""))
    .join(" ");
  const combined = `${historyText} ${currentText || ""}`;
  const topic = topicDescription({
    procedure,
    currentText: combined,
    messageType: "text",
  });
  const label = procedureLabel(procedure, combined);
  const text = normalized(combined);
  const opening = greeting(patientName, "Bom dia");
  const asksConsultationPrice =
    /valor da consulta|consulta.*(?:valor|preco)|quanto.*consulta/.test(
      text,
    );

  if (asksConsultationPrice) {
    return `${opening} Como combinamos, retomando pela manhã: a consulta presencial com a Dra. Amanda custa R$ 500, pode ser paga por Pix, débito ou parcelamento e tem emissão de nota fiscal.`;
  }
  if (/valor|preco|orcamento/.test(text) && label) {
    return `${opening} Como combinamos, retomando sua dúvida sobre o valor de ${label}: cada cirurgia é planejada individualmente, e a Dra. Amanda confirma o valor exato após a avaliação.`;
  }
  if (/valor|preco|orcamento/.test(text)) {
    return `${opening} Como combinamos, retomando sua dúvida sobre valores: você está pesquisando qual cirurgia?`;
  }
  if (/recuper|pos operator|afast|trabalho|inchaco/.test(text) && label) {
    return `${opening} Como combinamos, retomando sua dúvida sobre a recuperação de ${label}: o tempo varia conforme o planejamento individual, e a orientação aplicável ao seu caso é definida na avaliação.`;
  }
  return buildMorningProcedureInterestOpening({
    patientName,
    procedure,
    currentText: combined,
  });
}

export function buildContextualHumanSuggestion({
  patientName,
  messageText,
  procedure,
  urgent = false,
} = {}) {
  const opening = greeting(patientName);
  const text = normalized(messageText);
  const label = procedureLabel(procedure, messageText);

  if (urgent) {
    return `${opening} Li sua mensagem e quero priorizar sua segurança. Se os sintomas forem intensos, estiverem piorando rapidamente ou você se sentir em risco, procure atendimento médico de urgência. Sua mensagem também será revisada pela equipe.`;
  }
  if (/foto|imagem/.test(text)) {
    return `${opening} Obrigada por compartilhar sua foto e confiar na equipe. Entendo que você queira uma orientação cuidadosa. A Dra. Amanda poderá avaliar pessoalmente os detalhes importantes e conversar com você sobre as possibilidades que façam sentido.`;
  }
  if (/valor da consulta|consulta.*(?:valor|preco)|quanto.*consulta/.test(text)) {
    return `${opening} A consulta presencial com a Dra. Amanda custa R$ 500, pode ser paga por Pix, débito ou parcelamento e tem emissão de nota fiscal.`;
  }
  if (/valor|preco|quanto custa|orcamento|parcel/.test(text)) {
    if (label) {
      return `${opening} Vi sua dúvida sobre o valor de ${label}. Como cada cirurgia é planejada individualmente, a Dra. Amanda confirma o valor exato após a avaliação.`;
    }
    return `${opening} Vi sua dúvida sobre valores. Você está pesquisando qual cirurgia?`;
  }
  if (/agenda|agendar|horario|disponibilidade|marcar/.test(text)) {
    return `${opening} Vi que você quer organizar uma avaliação com a Dra. Amanda. Quais dias costumam funcionar melhor e você prefere manhã ou tarde?`;
  }
  if (/recuper|afast|trabalho|inchaco/.test(text)) {
    const subject = label ? ` de ${label}` : " do procedimento";
    return `${opening} Vi sua dúvida sobre a recuperação${subject}. O tempo varia conforme o planejamento individual, e a orientação aplicável ao seu caso é definida na avaliação.`;
  }
  return "";
}

export function buildExtremeNightEmailAlert({
  patientName,
  messageText,
  procedure,
  messageType = "text",
  recentConversation = [],
  acknowledgementSent = false,
} = {}) {
  const suggestedReply =
    String(messageType || "").toLowerCase() === "image"
      ? buildContextualHumanSuggestion({
          patientName,
          messageText: "A paciente compartilhou uma foto.",
          procedure,
        })
      : buildMorningResumeOpening({
          patientName,
          procedure,
          currentText: messageText,
          recentConversation,
        });

  return [
    "RETOMAR PELA MANHÃ — mensagem recebida entre 0h e 6h",
    `Mensagem mais recente: ${String(messageText || "Mensagem sem texto.").trim()}`,
    acknowledgementSent
      ? "A paciente já recebeu uma confirmação curta de recebimento. Não enviar outra mensagem durante a madrugada."
      : "Nenhuma mensagem foi enviada porque a paciente pediu para continuar pela manhã.",
    "Ação humana: revisar o contexto completo e retomar após o início do atendimento.",
    suggestedReply
      ? "Sugestão contextual para copiar após revisar:"
      : "SEM SUGESTÃO PRONTA: o contexto não permitiu identificar com segurança a informação pendente.",
    suggestedReply || "Revise a conversa completa e redija uma resposta específica antes de enviar.",
  ].join("\n");
}
