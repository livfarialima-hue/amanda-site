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
  otoplastia: "otoplastia",
  lipo_papada: "tratamento da papada",
  abdominoplastia: "abdominoplastia",
  lipoaspiracao: "lipoaspiração",
  mamoplastia: "cirurgia das mamas",
});

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
    return `${opening} Obrigada por confiar em nós e compartilhar a foto. Há boas opções que podem ajudar, mas uma avaliação à distância não permite definir com segurança o melhor caminho. Como já é madrugada, retomaremos por aqui pela manhã.`;
  }

  return topic
    ? `${opening} Anotei sua mensagem sobre ${topic}. Como já é madrugada, retomaremos por aqui pela manhã.`
    : "";
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
  return "";
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
    return `${opening} Obrigada por confiar em nós e compartilhar a foto — sei que este é um momento pessoal. Há boas opções que podem ajudar a melhorar sua queixa, mas uma foto e uma avaliação à distância não permitem examinar tudo o que importa nem definir com segurança o melhor caminho.`;
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
