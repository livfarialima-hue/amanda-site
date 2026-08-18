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
  return label || "seu atendimento";
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

  return `${opening} Anotei sua mensagem sobre ${topic}. Como já é madrugada, retomaremos por aqui pela manhã.`;
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

  if (asksConsultationPrice && /papada/.test(text)) {
    return `${opening} Como combinamos, retomando suas dúvidas: a consulta com a Dra. Amanda custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. Sobre o procedimento para papada, a Dra. precisa avaliar se predomina gordura, flacidez de pele ou ambos; depois disso, a equipe prepara o orçamento individual. Quer que eu te explique como funciona essa avaliação?`;
  }
  if (asksConsultationPrice) {
    return `${opening} Como combinamos, retomando pela manhã: a consulta com a Dra. Amanda custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. Nela, a Dra. examina sua queixa e explica as opções com segurança. Quer que eu também explique como funciona a avaliação?`;
  }
  if (/papada/.test(text) && /valor|preco|orcamento/.test(text)) {
    return `${opening} Como combinamos, estou retomando sua conversa sobre papada e valores. Para eu começar pelo ponto certo: sua dúvida principal é sobre o valor da consulta ou sobre o orçamento do procedimento?`;
  }
  if (label) {
    return `${opening} Como combinamos, estou retomando nossa conversa sobre ${label}. Você prefere começar por indicação, recuperação ou valores?`;
  }
  return `${opening} Como combinamos, estou retomando sua mensagem sobre ${topic}. Qual ponto você prefere esclarecer primeiro?`;
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
    return `${opening} Obrigada por compartilhar a foto. Há boas opções que podem ajudar, mas não é possível definir indicação ou diagnóstico com segurança somente à distância. Me conta qual ponto mais te incomoda e há quanto tempo você percebe isso?`;
  }
  if (/valor da consulta|consulta.*(?:valor|preco)|quanto.*consulta/.test(text)) {
    return `${opening} A consulta com a Dra. Amanda custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. Nela, a Dra. examina sua queixa e explica as opções com segurança. Você prefere verificar horários pela manhã ou à tarde?`;
  }
  if (/papada/.test(text) && /valor|preco|orcamento/.test(text)) {
    return `${opening} Vi que sua dúvida é sobre papada e valores. A Dra. Amanda precisa avaliar se predomina gordura, flacidez de pele ou ambos para indicar a melhor opção e definir o orçamento. Sua dúvida agora é sobre o valor da consulta ou da cirurgia?`;
  }
  if (/valor|preco|quanto custa|orcamento|parcel/.test(text)) {
    const subject = label ? ` de ${label}` : " do procedimento";
    return `${opening} Vi sua dúvida sobre valores${subject}. O valor exato depende da avaliação e do planejamento individual. Para eu te orientar pelo caminho certo, você quer saber sobre a consulta ou sobre o orçamento cirúrgico?`;
  }
  if (/agenda|agendar|horario|disponibilidade|marcar/.test(text)) {
    return `${opening} Vi que você quer organizar uma avaliação com a Dra. Amanda. Quais dias costumam funcionar melhor e você prefere manhã ou tarde?`;
  }
  if (/recuper|afast|trabalho|inchaco/.test(text)) {
    const subject = label ? ` de ${label}` : " do procedimento";
    return `${opening} Vi sua dúvida sobre a recuperação${subject}. O tempo varia conforme a indicação e o planejamento individual. Existe alguma data, viagem ou compromisso que você precise considerar?`;
  }
  if (label) {
    return `${opening} Vi sua mensagem sobre ${label}. Para retomar pelo ponto mais útil, você prefere entender indicação, recuperação ou valores?`;
  }
  return `${opening} Li sua mensagem e quero retomar pelo ponto certo. Qual informação você precisa esclarecer agora?`;
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
    "Sugestão para copiar pela manhã:",
    suggestedReply,
  ].join("\n");
}
