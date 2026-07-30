const MAX_ALERT_TEXT_LENGTH = 650;
const SCHEDULING_CONTEXT_PATTERN =
  /\b(?:agend|horari|disponib|periodo|dia|data|avaliacao|consulta)\w*/i;
const PERIODS = {
  morning: ["manha", "matutino"],
  afternoon: ["tarde", "vespertino"],
  evening: ["noite", "noturno"],
};
const WEEKDAYS = [
  { value: 0, names: ["domingo", "dom"] },
  { value: 1, names: ["segunda", "segunda-feira", "seg"] },
  { value: 2, names: ["terca", "terca-feira", "ter"] },
  { value: 3, names: ["quarta", "quarta-feira", "qua"] },
  { value: 4, names: ["quinta", "quinta-feira", "qui"] },
  { value: 5, names: ["sexta", "sexta-feira", "sex"] },
  { value: 6, names: ["sabado", "sab"] },
];

function limitText(value, maximumLength = MAX_ALERT_TEXT_LENGTH) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function displayProfessional(value) {
  return value === "daniel" ? "Dr. Daniel" : "Dra. Amanda";
}

function displaySlot(slot) {
  const day = String(slot?.day || "").trim().toLowerCase();
  const date = String(slot?.date || "").trim();
  const time = String(slot?.time || "").trim();

  return [day, date && `(${date})`, time && `às ${time}`]
    .filter(Boolean)
    .join(" ");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function includesWord(text, word) {
  return new RegExp(`\\b${word.replace("-", "[- ]?")}\\b`, "i").test(text);
}

function slotWeekday(slot) {
  const normalizedDay = normalize(slot?.day);

  for (const weekday of WEEKDAYS) {
    if (weekday.names.some((name) => includesWord(normalizedDay, name))) {
      return weekday.value;
    }
  }

  const match = String(slot?.date || "").match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  );

  if (!match) return null;

  return new Date(
    Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12),
  ).getUTCDay();
}

function slotMinutes(slot) {
  const match = String(slot?.time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function periodForMinutes(minutes) {
  if (!Number.isFinite(minutes)) return null;
  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "evening";
}

export function extractAppointmentPreferences(value) {
  const text = normalize(value);
  const days = WEEKDAYS.filter((weekday) =>
    weekday.names.some((name) => includesWord(text, name)),
  ).map((weekday) => weekday.value);
  const periods = Object.entries(PERIODS)
    .filter(([, names]) => names.some((name) => includesWord(text, name)))
    .map(([period]) => period);
  const hours = [];

  for (const match of text.matchAll(/\b([01]?\d|2[0-3])(?::|h)([0-5]\d)?\b/g)) {
    hours.push(Number(match[1]) * 60 + Number(match[2] || 0));
  }

  for (const match of text.matchAll(/\b([01]?\d|2[0-3])\s*horas?\b/g)) {
    const minutes = Number(match[1]) * 60;
    if (!hours.includes(minutes)) hours.push(minutes);
  }

  return { days, periods, hours };
}

export function hasAppointmentPreference(value) {
  const preferences = extractAppointmentPreferences(value);
  return Boolean(
    preferences.days.length ||
      preferences.periods.length ||
      preferences.hours.length,
  );
}

export function isAppointmentPreferenceReply(
  value,
  recentConversation = [],
) {
  const current = normalize(value);

  if (!hasAppointmentPreference(current)) return false;

  return recentConversation.some((turn) => {
    const isClinic =
      turn?.role === "assistant" ||
      ["bruna", "equipe_humana"].includes(turn?.source);

    return (
      isClinic &&
      SCHEDULING_CONTEXT_PATTERN.test(normalize(turn?.text))
    );
  });
}

export function selectAppointmentSlots(slots, preferenceText = "") {
  const normalizedSlots = Array.isArray(slots) ? slots : [];
  const preferences = extractAppointmentPreferences(preferenceText);

  return normalizedSlots
    .map((slot, index) => {
      const weekday = slotWeekday(slot);
      const minutes = slotMinutes(slot);
      let score = 0;

      if (preferences.days.length) {
        score += preferences.days.includes(weekday) ? 0 : 20;
      }

      if (preferences.periods.length) {
        score += preferences.periods.includes(periodForMinutes(minutes))
          ? 0
          : 10;
      }

      if (preferences.hours.length) {
        score += preferences.hours.includes(minutes) ? 0 : 30;
      }

      return { slot, index, score };
    })
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, 3)
    .map(({ slot }) => slot);
}

function displayPreference(value) {
  const preferences = extractAppointmentPreferences(value);
  const dayNames = preferences.days.map((day) => {
    const names = WEEKDAYS.find((weekday) => weekday.value === day)?.names;
    return names?.[0] || "";
  });
  const periodNames = preferences.periods.map((period) => ({
    morning: "manhã",
    afternoon: "tarde",
    evening: "noite",
  })[period]);
  const parts = [];

  if (dayNames.length) parts.push(dayNames.join(" e "));
  if (periodNames.length) parts.push(`período da ${periodNames.join(" ou ")}`);

  return parts.length ? `Preferência: ${parts.join(", ")}.` : "";
}

export function buildAppointmentSuggestion({
  patientName,
  professional,
  procedure,
  slots,
  preferenceText = "",
}) {
  const clinician = displayProfessional(professional);
  const normalizedSlots = selectAppointmentSlots(slots, preferenceText);
  const procedureLabel = String(procedure || "").trim();
  const subject = procedureLabel
    ? `a avaliação de ${procedureLabel.replaceAll("_", " ")}`
    : "a avaliação";

  if (!normalizedSlots.length) {
    const patientGreeting = patientName
      ? `Olá, ${String(patientName).trim().split(/\s+/)[0]}!`
      : "Olá!";
    const fallbackReply = String(preferenceText || "").trim()
      ? `${patientGreeting} Vou conferir outras opções compatíveis com essa preferência e retorno por aqui assim que possível.`
      : `${patientGreeting} Vou conferir os horários disponíveis com a equipe e retorno por aqui. Se puder me dizer quais dias e se manhã ou tarde costumam funcionar melhor, isso ajuda a buscar opções mais adequadas.`;

    return limitText(
      [
        "AGENDAMENTO — revisão necessária",
        `${patientName || "Paciente"} pediu horários para ${subject} com ${clinician}.`,
        displayPreference(preferenceText),
        "Não há horários disponíveis cadastrados em Datas Consulta.",
        "Sugestão para copiar ao paciente:",
        fallbackReply,
      ].filter(Boolean).join("\n"),
    );
  }

  const options = normalizedSlots
    .map((slot, index) => `${index + 1}. ${displaySlot(slot)}`)
    .join("\n");
  const patientGreeting = patientName
    ? `Olá, ${String(patientName).trim().split(/\s+/)[0]}!`
    : "Olá!";

  return limitText(
    [
      `AGENDAMENTO — ${clinician}`,
      displayPreference(preferenceText),
      "Sugestão para copiar ao paciente:",
      `${patientGreeting} Para ${subject} com ${clinician}, temos estas opções:`,
      options,
      "Se nenhum destes horários for possível, posso procurar outras opções.",
    ].filter(Boolean).join("\n"),
  );
}

export function isAppointmentAlertEnabled(env = process.env) {
  return String(env.WHATSAPP_APPOINTMENT_REVIEW_ENABLED || "")
    .trim()
    .toLowerCase() === "true";
}
