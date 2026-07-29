const TIMEZONE = "America/Sao_Paulo";

const WEEKDAYS = Object.freeze({
  domingo: 0,
  segunda: 1,
  "segunda feira": 1,
  terca: 2,
  "terca feira": 2,
  quarta: 3,
  "quarta feira": 3,
  quinta: 4,
  "quinta feira": 4,
  sexta: 5,
  "sexta feira": 5,
  sabado: 6,
});

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}:/]+/gu, " ")
    .trim()
    .toLowerCase();
}

function localParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type) =>
    parts.find((part) => part.type === type)?.value;

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
  };
}

function dateAtNoon(parts) {
  return new Date(
    `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
      parts.day,
    ).padStart(2, "0")}T12:00:00-03:00`,
  );
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function extractExplicitDate(text, baseDate) {
  const match = normalize(text).match(
    /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
  );

  if (!match) return null;

  const base = localParts(baseDate);
  let year = match[3] ? Number(match[3]) : base.year;
  if (year < 100) year += 2000;

  let candidate = dateAtNoon({
    year,
    month: Number(match[2]),
    day: Number(match[1]),
  });

  if (!match[3] && candidate.getTime() < baseDate.getTime()) {
    candidate = dateAtNoon({
      year: year + 1,
      month: Number(match[2]),
      day: Number(match[1]),
    });
  }

  return Number.isNaN(candidate.getTime())
    ? null
    : formatDate(candidate);
}

function extractRelativeDate(text, baseDate) {
  const comparable = normalize(text);
  const base = dateAtNoon(localParts(baseDate));

  if (/\bamanha\b/.test(comparable)) {
    return formatDate(addDays(base, 1));
  }

  if (/\bhoje\b/.test(comparable)) {
    return formatDate(base);
  }

  for (const [label, weekday] of Object.entries(WEEKDAYS)) {
    if (!new RegExp(`\\b${label}\\b`).test(comparable)) {
      continue;
    }

    const currentWeekday = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        weekday: "short",
      })
        .formatToParts(base)
        .find((part) => part.type === "weekday")
        ?.value === "Sun"
        ? 0
        : base.getUTCDay(),
    );
    let delta = (weekday - currentWeekday + 7) % 7;
    if (delta === 0) delta = 7;
    return formatDate(addDays(base, delta));
  }

  return null;
}

function extractDate(text, baseDate) {
  return (
    extractExplicitDate(text, baseDate) ||
    extractRelativeDate(text, baseDate)
  );
}

function extractTime(text) {
  const comparable = normalize(text);
  const matches = [
    ...comparable.matchAll(
      /\b(?:as\s+)?(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)\b/g,
    ),
  ];

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const hour = Number(matches[index][1]);
    const minute = Number(
      matches[index][2] || matches[index][3] || 0,
    );

    if (
      hour >= 7 &&
      hour <= 21 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(hour).padStart(2, "0")}:${String(
        minute,
      ).padStart(2, "0")}`;
    }
  }

  return null;
}

function isConfirmation(text) {
  const comparable = normalize(text);

  return [
    /\bconfirmad[oa]?\b/,
    /\bagendad[oa]?\b/,
    /\breservad[oa]?\b/,
    /\bficou (?:marcad[oa]|agendad[oa]|combinad[oa])\b/,
    /\bte esperamos?\b/,
    /\bvamos te receber\b/,
    /\bda pra te receber\b/,
  ].some((pattern) => pattern.test(comparable));
}

function detectProfessional(text) {
  const comparable = normalize(text);
  return /\bdr\.?\s*daniel\b|\bdaniel\b.*\bcardio/.test(
    comparable,
  )
    ? "Dr. Daniel"
    : "Dra. Amanda";
}

function detectConsultationType(text) {
  const comparable = normalize(text);

  if (/\bteleconsulta\b|\bonline\b|\bvideo\b/.test(comparable)) {
    return "Teleconsulta";
  }

  return "Consulta presencial";
}

function hasConfirmedAppointmentContext(recentConversation, at) {
  const turns = Array.isArray(recentConversation)
    ? recentConversation.slice(-10)
    : [];
  const outgoingConfirmation = turns.some((turn) => {
    if (turn?.role === "user") return false;
    return isConfirmation(turn?.text);
  });

  if (!outgoingConfirmation) return null;

  let scheduledDate = null;
  let scheduledTime = null;

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const text = turns[index]?.text;
    if (!scheduledDate) scheduledDate = extractDate(text, at);
    if (!scheduledTime) scheduledTime = extractTime(text);
    if (scheduledDate && scheduledTime) break;
  }

  return scheduledDate && scheduledTime
    ? { scheduledDate, scheduledTime }
    : null;
}

function isPatientConfirmation(text) {
  const comparable = normalize(text);

  return [
    /^(?:sim|confirmo|confirmada|confirmado|combinado|perfeito|tudo certo|ok(?: obrigada)?|ok(?: obrigado)?|estarei la|estarei aí)$/,
    /\b(?:pode manter|pode confirmar|esta confirmado|está confirmado)\b/,
  ].some((pattern) => pattern.test(comparable));
}

function isRescheduleRequest(text) {
  const comparable = normalize(text);

  if (/\bnao quero cancelar\b/.test(comparable)) return false;

  return /\b(?:remarcar|reagendar|outro horario|outro dia|nao consigo ir|nao vou conseguir|cancelar|desmarcar)\b/.test(
    comparable,
  );
}

export function detectPatientAppointmentReply({
  currentText,
  recentConversation = [],
  at = new Date(),
} = {}) {
  const baseDate = new Date(at);
  if (Number.isNaN(baseDate.getTime())) return null;

  const context = hasConfirmedAppointmentContext(
    recentConversation,
    baseDate,
  );
  if (!context) return null;

  if (isRescheduleRequest(currentText)) {
    return {
      ...context,
      state: "reschedule_requested",
    };
  }

  if (isPatientConfirmation(currentText)) {
    return {
      ...context,
      state: "confirmed",
    };
  }

  return null;
}

export function detectConfirmedAppointment({
  currentText,
  recentConversation = [],
  at = new Date(),
} = {}) {
  if (!isConfirmation(currentText)) return null;

  const baseDate = new Date(at);
  if (Number.isNaN(baseDate.getTime())) return null;

  const texts = [
    ...(Array.isArray(recentConversation)
      ? recentConversation.map((turn) => turn?.text)
      : []),
    currentText,
  ]
    .filter(Boolean)
    .slice(-10);
  let scheduledDate = null;
  let scheduledTime = null;

  for (let index = texts.length - 1; index >= 0; index -= 1) {
    if (!scheduledDate) {
      scheduledDate = extractDate(texts[index], baseDate);
    }
    if (!scheduledTime) {
      scheduledTime = extractTime(texts[index]);
    }
    if (scheduledDate && scheduledTime) break;
  }

  if (!scheduledDate || !scheduledTime) return null;

  const context = texts.join(" ");
  const professional = detectProfessional(context);
  const consultationType = detectConsultationType(context);

  return {
    scheduledDate,
    scheduledTime,
    professional,
    consultationType,
    location:
      consultationType === "Teleconsulta"
        ? "Teleconsulta"
        : "Clínica LIV Faria Lima",
    status: "Consulta agendada",
    source: "WhatsApp — confirmação de agendamento detectada",
  };
}
