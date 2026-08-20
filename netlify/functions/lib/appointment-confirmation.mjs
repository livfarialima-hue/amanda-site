import { usableProfileFirstName } from "./profile-name.mjs";

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

function extractDayOfMonthDate(text, baseDate) {
  const match = normalize(text).match(/\bdia\s+(\d{1,2})\b/);
  if (!match) return null;

  const requestedDay = Number(match[1]);
  if (requestedDay < 1 || requestedDay > 31) return null;

  const base = localParts(baseDate);
  let year = base.year;
  let month = base.month;
  let candidate = dateAtNoon({
    year,
    month,
    day: requestedDay,
  });

  if (
    Number.isNaN(candidate.getTime()) ||
    localParts(candidate).day !== requestedDay
  ) {
    return null;
  }

  if (candidate.getTime() < baseDate.getTime()) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    candidate = dateAtNoon({ year, month, day: requestedDay });
  }

  return Number.isNaN(candidate.getTime()) ||
    localParts(candidate).day !== requestedDay
    ? null
    : formatDate(candidate);
}

function extractDate(text, baseDate) {
  return (
    extractExplicitDate(text, baseDate) ||
    extractRelativeDate(text, baseDate) ||
    extractDayOfMonthDate(text, baseDate)
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
    /\bcombinado(?: entao)?\b/,
    /\bagradecemos e ate la\b/,
    /\b(?:este|esse|o) horario (?:esta|fica) (?:perfeito|disponivel)\b/,
    /\bpodemos combinar\b/,
  ].some((pattern) => pattern.test(comparable));
}

function detectProfessional(text) {
  const comparable = normalize(text);
  const genericSiteServicePicker =
    /cirurgia plastica\s*\/?\s*estetica/.test(comparable) &&
    /\bcardiologia\b/.test(comparable) &&
    /origem do contato:\s*site liv faria lima/.test(comparable);
  const explicitDaniel =
    /\bdr\.?\s*daniel\b|\bdaniel\b.*\bcardio/.test(comparable) ||
    (!genericSiteServicePicker &&
      /\bcardiologia\b|\bcardiologista\b/.test(comparable));

  return explicitDaniel
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

function cleanStructuredFieldValue(value) {
  return String(value || "")
    .trim()
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

function structuredAppointmentFields(text) {
  const lines = String(text || "").split(/\r?\n/);
  const hasReceiptHeading = lines.some(
    (line) =>
      normalize(line).replace(/:+$/, "") ===
      "comprovante de agendamento",
  );

  if (!hasReceiptHeading) return null;

  const fields = {};
  for (const line of lines) {
    const match = line.match(
      /^\s*\*?\s*([^:*]+?)\s*:\s*\*?\s*(.*?)\s*\*?\s*$/u,
    );
    if (!match) continue;

    const label = normalize(match[1]);
    if (!label || Object.hasOwn(fields, label)) continue;
    fields[label] = cleanStructuredFieldValue(match[2]);
  }

  return fields;
}

function validStructuredPatientName(value) {
  const name = cleanStructuredFieldValue(value);
  if (
    name.length < 2 ||
    name.length > 120 ||
    /\d|@|https?:|www\./i.test(name) ||
    !/^[\p{L}][\p{L}\s'.-]*$/u.test(name)
  ) {
    return null;
  }

  return name.replace(/\s+/g, " ");
}

function explicitStructuredProfessional(value) {
  const comparable = normalize(value);
  if (/\b(?:dr\s+)?daniel(?:\s+added)?\b/.test(comparable)) {
    return "Dr. Daniel";
  }
  if (/\b(?:dra\s+)?amanda(?:\s+schroeder)?\b/.test(comparable)) {
    return "Dra. Amanda";
  }
  return null;
}

function strictStructuredDate(value, baseDate) {
  const raw = cleanStructuredFieldValue(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/u);
  if (!match) return null;

  const requested = {
    year: Number(match[3]),
    month: Number(match[2]),
    day: Number(match[1]),
  };
  const candidate = dateAtNoon(requested);
  if (Number.isNaN(candidate.getTime())) return null;

  const actual = localParts(candidate);
  if (
    actual.year !== requested.year ||
    actual.month !== requested.month ||
    actual.day !== requested.day
  ) {
    return null;
  }

  const scheduledDate = formatDate(candidate);
  const today = formatDate(dateAtNoon(localParts(baseDate)));
  if (scheduledDate < today) return null;

  const declaredWeekday = normalize(match[4]).match(
    /\b([2-6])\s*(?:a|ª)?\s*feira\b/,
  );
  if (
    declaredWeekday &&
    weekdayForIsoDate(scheduledDate) !== Number(declaredWeekday[1]) - 1
  ) {
    return null;
  }

  return scheduledDate;
}

function structuredAppointmentReceipt(text, baseDate) {
  const fields = structuredAppointmentFields(text);
  if (!fields) return null;

  const patientName = validStructuredPatientName(fields.nome);
  const scheduledDate = strictStructuredDate(fields.data, baseDate);
  const scheduledTime = extractTime(fields.horario);
  const professional = explicitStructuredProfessional(fields.medico);

  if (
    !patientName ||
    !scheduledDate ||
    !scheduledTime ||
    !professional
  ) {
    return null;
  }

  const defaultConsultationType = detectConsultationType(
    `${fields.endereco || ""} ${text}`,
  );
  const noReturnApplies = /^nao se aplica\b/.test(
    normalize(fields.retorno),
  );
  const consultationValue = normalize(
    fields["valor da consulta"],
  );
  const zeroConsultationValue =
    Boolean(consultationValue) &&
    !/[1-9]/.test(consultationValue) &&
    /\b0(?:\s+00)?\b/.test(consultationValue);
  const noPaymentApplies = /^nao se aplica\b/.test(
    normalize(fields["formas de pagamento"]),
  );
  const consultationType =
    defaultConsultationType !== "Teleconsulta" &&
    noReturnApplies &&
    zeroConsultationValue &&
    noPaymentApplies
      ? "Procedimento"
      : defaultConsultationType;
  return {
    patientName,
    scheduledDate,
    scheduledTime,
    professional,
    consultationType,
    location:
      consultationType === "Teleconsulta"
        ? "Teleconsulta"
        : "Clínica LIV Faria Lima",
    status: "Consulta agendada",
    source: "WhatsApp - comprovante estruturado de agendamento",
    confidence: "confirmed",
  };
}

function publicAppointmentSlot(slot) {
  if (!slot) return null;
  const { _turnIndex, ...publicSlot } = slot;
  return publicSlot;
}

function manualAppointmentSlotsFromText(text, baseDate, turnIndex) {
  const fragments = String(text || "")
    .split(/\r?\n|\s+[•·]\s+|\s+[-–—]\s+(?=\D{0,24}\d{1,2}(?::\d{2}|h))/u)
    .map((fragment) => fragment.trim())
    .filter(Boolean);
  const slots = [];

  for (const fragment of fragments) {
    const scheduledDate = extractDate(fragment, baseDate);
    const scheduledTime = extractTime(fragment);

    if (!scheduledDate || !scheduledTime) continue;

    const professional = detectProfessional(fragment);
    const consultationType = detectConsultationType(fragment);
    slots.push({
      option: null,
      scheduledDate,
      scheduledTime,
      professional,
      consultationType,
      location:
        consultationType === "Teleconsulta"
          ? "Teleconsulta"
          : "Clínica LIV Faria Lima",
      _turnIndex: turnIndex,
    });
  }

  return slots;
}

function offeredAppointmentSlots(recentConversation, at = new Date()) {
  const turns = Array.isArray(recentConversation)
    ? recentConversation.slice(-12)
    : [];
  const baseDate = new Date(at);
  const slots = [];

  for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
    const turn = turns[turnIndex];
    if (
      turn?.role === "user" ||
      turn?.role === "patient"
    ) {
      continue;
    }

    const text = String(turn?.text || "");
    const matches = [
      ...text.matchAll(
        /(?:^|\n)\s*(\d{1,2})[.)-]\s*[^\n(]*\((\d{1,2})\/(\d{1,2})\/(\d{4})\)\s*(?:às|as)\s*(\d{1,2}):(\d{2})/giu,
      ),
    ];

    if (matches.length) {
      const professional = detectProfessional(text);
      const consultationType = detectConsultationType(text);

      slots.push(...matches.map((match) => ({
        option: Number(match[1]),
        scheduledDate: [
          match[4],
          String(match[3]).padStart(2, "0"),
          String(match[2]).padStart(2, "0"),
        ].join("-"),
        scheduledTime: [
          String(match[5]).padStart(2, "0"),
          match[6],
        ].join(":"),
        professional,
        consultationType,
        location:
          consultationType === "Teleconsulta"
            ? "Teleconsulta"
            : "Clínica LIV Faria Lima",
        _turnIndex: turnIndex,
      })));
      continue;
    }

    if (!Number.isNaN(baseDate.getTime())) {
      slots.push(
        ...manualAppointmentSlotsFromText(
          text,
          turn?.at ? new Date(turn.at) : baseDate,
          turnIndex,
        ),
      );
    }
  }

  const seen = new Set();
  return slots.filter((slot) => {
    const key = `${slot.scheduledDate}|${slot.scheduledTime}|${slot.professional}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectedOptionNumber(text) {
  const comparable = normalize(text);
  const numeric = comparable.match(
    /\b(?:opcao|horario|alternativa)\s*(?:numero\s*)?([1-9])\b/,
  );
  if (numeric) return Number(numeric[1]);

  if (/^[1-9]$/.test(comparable)) return Number(comparable);

  const ordinals = [
    ["primeira", 1],
    ["primeiro", 1],
    ["segunda opcao", 2],
    ["segundo", 2],
    ["terceira", 3],
    ["terceiro", 3],
  ];

  return ordinals.find(([label]) =>
    comparable.includes(label),
  )?.[1] || null;
}

function selectedWeekday(text) {
  const comparable = normalize(text);

  for (const [label, weekday] of Object.entries(WEEKDAYS)) {
    if (
      new RegExp(`\\b${label}\\b`).test(comparable) &&
      !new RegExp(`\\b${label}\\s+opcao\\b`).test(comparable)
    ) {
      return weekday;
    }
  }

  return null;
}

function weekdayForIsoDate(value) {
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime())
    ? null
    : date.getUTCDay();
}

function explicitOfferedDate(text, offeredSlots) {
  const comparable = normalize(text);
  const match = comparable.match(
    /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
  );

  if (!match) return null;

  return offeredSlots.find((slot) => {
    const [year, month, day] = slot.scheduledDate
      .split("-")
      .map(Number);
    const requestedYear = match[3]
      ? Number(match[3]) < 100
        ? Number(match[3]) + 2000
        : Number(match[3])
      : year;

    return (
      day === Number(match[1]) &&
      month === Number(match[2]) &&
      year === requestedYear
    );
  })?.scheduledDate || null;
}

function explicitOfferedDayOfMonth(text, offeredSlots) {
  const comparable = normalize(text);
  const weekday = selectedWeekday(text);
  const dayMatch = comparable.match(/\bdia\s+(\d{1,2})\b/) ||
    comparable.match(
      /\b(?:domingo|segunda(?: feira)?|terca(?: feira)?|quarta(?: feira)?|quinta(?: feira)?|sexta(?: feira)?|sabado)\s+(\d{1,2})\b/,
    );
  if (!dayMatch) return null;

  const requestedDay = Number(dayMatch[1]);
  if (requestedDay < 1 || requestedDay > 31) return null;
  const matchingDates = [
    ...new Set(
      offeredSlots
        .filter((slot) => {
          const day = Number(slot.scheduledDate.split("-")[2]);
          return (
            day === requestedDay &&
            (weekday === null ||
              weekdayForIsoDate(slot.scheduledDate) === weekday)
          );
        })
        .map((slot) => slot.scheduledDate),
    ),
  ];

  return matchingDates.length === 1 ? matchingDates[0] : null;
}

function hasSelectionIntent(text) {
  const comparable = normalize(text);

  return (
    /\b(?:pode ser|prefiro|fico com|quero|confirmo|essa|esse|serve|funciona|consigo|fechado|combinado)\b/.test(
      comparable,
    ) ||
    comparable.length <= 80
  );
}

function hasAttendanceConfirmationContext(recentConversation) {
  const latestAssistantText = (Array.isArray(recentConversation)
    ? recentConversation
    : [])
    .slice()
    .reverse()
    .find((turn) => turn?.role !== "user" && turn?.role !== "patient")
    ?.text;
  const comparable = normalize(latestAssistantText);

  return (
    /\b(?:confirmar|confirme|confirmacao)\b.{0,80}\b(?:presenca|comparecimento)\b/.test(
      comparable,
    ) ||
    /\b(?:presenca|comparecimento)\b.{0,80}\b(?:confirmar|confirme|confirmacao)\b/.test(
      comparable,
    ) ||
    /\blembrete\b.{0,180}\b(?:consulta|avaliacao)\b/.test(
      comparable,
    )
  );
}

export function detectPatientAppointmentSelection({
  currentText,
  recentConversation = [],
  at = new Date(),
} = {}) {
  if (!hasSelectionIntent(currentText)) return null;

  const baseDate = new Date(at);
  if (
    isPatientConfirmation(currentText) &&
    hasAttendanceConfirmationContext(recentConversation)
  ) {
    return null;
  }
  const acceptedNegotiatedAppointment =
    isPatientConfirmation(currentText) &&
    !Number.isNaN(baseDate.getTime())
      ? hasConfirmedAppointmentContext(
          recentConversation,
          baseDate,
        )
      : null;
  if (acceptedNegotiatedAppointment) {
    const contextText = (Array.isArray(recentConversation)
      ? recentConversation
      : [])
      .slice(-10)
      .map((turn) => String(turn?.text || ""))
      .join(" ");
    const professional = detectProfessional(contextText);
    const consultationType = detectConsultationType(contextText);

    return {
      ...acceptedNegotiatedAppointment,
      professional,
      consultationType,
      location:
        consultationType === "Teleconsulta"
          ? "Teleconsulta"
          : "Clínica LIV Faria Lima",
      status: "Consulta agendada",
      source:
        "WhatsApp — confirmação após acordo com a equipe humana",
      silentConfirmation: true,
    };
  }

  const slots = offeredAppointmentSlots(recentConversation, at);
  if (!slots.length) return null;

  const patientSelectionTexts = [
    currentText,
    ...recentConversation
      .slice(-6)
      .reverse()
      .filter((turn) => turn?.role === "user" || turn?.role === "patient")
      .map((turn) => turn?.text)
      .filter((text) => text && text !== currentText),
  ];
  const option = patientSelectionTexts
    .map(selectedOptionNumber)
    .find(Boolean);
  if (option) {
    const selected = slots.find(
      (slot) => slot.option === option,
    );
    return selected
      ? {
          ...publicAppointmentSlot(selected),
          status: "Consulta agendada",
          source:
            "WhatsApp — opção de horário escolhida pela paciente",
        }
      : null;
  }

  const requestedDate = patientSelectionTexts
    .map((text) =>
      explicitOfferedDate(text, slots) ||
      explicitOfferedDayOfMonth(text, slots) ||
      (!Number.isNaN(baseDate.getTime())
        ? extractRelativeDate(text, baseDate)
        : null),
    )
    .find(Boolean);
  const requestedTime = patientSelectionTexts
    .map(extractTime)
    .find(Boolean);
  const requestedWeekday =
    patientSelectionTexts
      .map(selectedWeekday)
      .find((value) => value !== null && value !== undefined) ?? null;
  const candidates = slots.filter((slot) => {
    if (
      requestedDate &&
      slot.scheduledDate !== requestedDate
    ) {
      return false;
    }
    if (
      requestedTime &&
      slot.scheduledTime !== requestedTime
    ) {
      return false;
    }
    if (
      requestedWeekday !== null &&
      weekdayForIsoDate(slot.scheduledDate) !==
        requestedWeekday
    ) {
      return false;
    }
    return true;
  });
  const suppliedSpecificChoice =
    Boolean(requestedDate || requestedTime) ||
    requestedWeekday !== null;

  if (!suppliedSpecificChoice || !candidates.length) {
    return null;
  }

  const newestTurnIndex = Math.max(
    ...candidates.map((candidate) => candidate._turnIndex),
  );
  const newestCandidates = candidates.filter(
    (candidate) => candidate._turnIndex === newestTurnIndex,
  );

  if (newestCandidates.length !== 1) return null;

  return {
    ...publicAppointmentSlot(newestCandidates[0]),
    status: "Consulta agendada",
    source:
      "WhatsApp — opção de horário escolhida pela paciente",
  };
}

function isExplicitManualConfirmation(text) {
  const comparable = normalize(text);
  return [
    /\bconfirmad[oa]?\b/,
    /\bagendad[oa]?\b/,
    /\breservad[oa]?\b/,
    /\bficou (?:marcad[oa]|agendad[oa]|combinad[oa])\b/,
    /\b(?:consulta|avaliacao)\b.{0,100}\bmarcad[oa]\b/,
    /\bmarcad[oa]\b.{0,80}\b(?:para|dia)\b/,
  ].some((pattern) => pattern.test(comparable));
}

export function isManualAppointmentSyncCommand(text) {
  return /^confirmado seu agendamento(?:\b|[!.:,])/i.test(
    normalize(text),
  );
}

function isManualClosingPhrase(text) {
  const comparable = normalize(text);
  return [
    /\bcombinado(?: entao)?\b/,
    /\bagradecemos e ate la\b/,
    /\bte esperamos?\b/,
    /\bvamos te receber\b/,
    /\bda pra te receber\b/,
  ].some((pattern) => pattern.test(comparable));
}

function hasAppointmentConversationContext(recentConversation) {
  const context = (Array.isArray(recentConversation)
    ? recentConversation.slice(-12)
    : [])
    .map((turn) => turn?.text)
    .filter(Boolean)
    .join(" ");
  const comparable = normalize(context);
  return /\b(?:consulta|avaliacao|agendar|agendamento|horario|dra amanda|dr daniel|cardiologia|cardiologista|recepcao|atender|funciona|funcionaria)\w*\b/.test(
    comparable,
  );
}

function recentPatientAccepted(recentConversation) {
  const patientTurns = (Array.isArray(recentConversation)
    ? recentConversation.slice(-6)
    : [])
    .filter((turn) => turn?.role === "user" || turn?.role === "patient")
    .map((turn) => normalize(turn?.text));

  return patientTurns.some((text) =>
    /^(?:sim|pode sim|pode ser|confirmo|combinado|perfeito|ok(?: obrigada| obrigado)?)$/.test(
      text,
    ) ||
    /\b(?:seria otimo|seria perfeito|fica otimo|funciona para mim|funcionaria para mim)\b/.test(
      text,
    ),
  );
}

function fallbackAppointmentFromConversation(recentConversation, at) {
  const turns = (Array.isArray(recentConversation)
    ? recentConversation.slice(-10)
    : []).filter((turn) => turn?.text);
  let scheduledDate = null;
  let scheduledTime = null;

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const text = turns[index].text;
    const turnDate = turns[index].at
      ? new Date(turns[index].at)
      : at;
    if (!scheduledDate) {
      scheduledDate = extractDate(
        text,
        Number.isNaN(turnDate.getTime()) ? at : turnDate,
      );
    }
    if (!scheduledTime) scheduledTime = extractTime(text);
    if (scheduledDate && scheduledTime) break;
  }

  if (!scheduledDate && !scheduledTime) return null;
  const context = turns.map((turn) => turn.text).join(" ");
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
  };
}

export function detectManualAppointment({
  currentText,
  recentConversation = [],
  at = new Date(),
} = {}) {
  const baseDate = new Date(at);
  if (Number.isNaN(baseDate.getTime())) return null;

  const structuredReceipt = structuredAppointmentReceipt(
    currentText,
    baseDate,
  );
  if (structuredReceipt) return structuredReceipt;

  const fullContext = [
    ...(Array.isArray(recentConversation)
      ? recentConversation.map((turn) => turn?.text)
      : []),
    currentText,
  ].join(" ");
  const normalizedFullContext = fullContext
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (
    /\b(?:dr\.?\s*henrique(?:\s+lane)?\s+staniak|dra\.?\s*marina|dr\.?\s*laerte)\b/i.test(
      normalizedFullContext,
    )
  ) {
    return null;
  }

  const explicit = isExplicitManualConfirmation(currentText);
  const closing = isManualClosingPhrase(currentText);
  if (!explicit && !closing) return null;

  const lastPatientText = [...recentConversation]
    .reverse()
    .find((turn) => turn?.role === "user" || turn?.role === "patient")
    ?.text;
  const selected = lastPatientText
    ? detectPatientAppointmentSelection({
        currentText: lastPatientText,
        recentConversation,
        at: baseDate,
      })
    : null;
  const appointment =
    selected ||
    fallbackAppointmentFromConversation(
      [...recentConversation, { role: "assistant", text: currentText }],
      baseDate,
    );

  if (!appointment) return null;
  const supportedProfessional = detectProfessional(fullContext);
  const appointmentContext = hasAppointmentConversationContext(
    recentConversation,
  );
  if (!explicit && !appointmentContext) return null;

  const accepted =
    explicit || (closing && recentPatientAccepted(recentConversation));
  const completeSchedule = Boolean(
    appointment.scheduledDate && appointment.scheduledTime,
  );
  const confidence = accepted
    ? completeSchedule
      ? "confirmed"
      : "confirmed_partial"
    : "possible";

  if (!completeSchedule && confidence === "possible") {
    return null;
  }

  return {
    ...publicAppointmentSlot(appointment),
    professional: supportedProfessional,
    status: "Consulta agendada",
    source: "WhatsApp — confirmação manual de agendamento detectada",
    confidence,
    ...(completeSchedule
      ? {}
      : {
          missingFields: [
            !appointment.scheduledDate ? "scheduledDate" : null,
            !appointment.scheduledTime ? "scheduledTime" : null,
          ].filter(Boolean),
        }),
  };
}

function displayAppointmentTime(value) {
  const [hour, minute] = String(value || "").split(":");
  return minute === "00"
    ? `${Number(hour)}h`
    : `${Number(hour)}h${minute}`;
}

export function buildBookedAppointmentReply({
  patientName,
  scheduledDate,
  scheduledTime,
  professional = "Dra. Amanda",
  location = "Clínica LIV Faria Lima",
} = {}) {
  const date = new Date(
    `${scheduledDate}T12:00:00-03:00`,
  );
  if (
    Number.isNaN(date.getTime()) ||
    !scheduledTime
  ) {
    return "";
  }

  const firstName = usableProfileFirstName(patientName);
  const greeting = firstName
    ? `Perfeito, ${firstName}!`
    : "Perfeito!";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const locationLabel =
    location === "Teleconsulta"
      ? "por teleconsulta"
      : `na ${location}`;

  return (
    `${greeting} Sua consulta com ${professional} ficou agendada ` +
    `para ${dateLabel}, às ${displayAppointmentTime(scheduledTime)}, ` +
    `${locationLabel}. Mais perto da data, enviaremos um lembrete por aqui.`
  );
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
  const comparable = normalize(text)
    .replace(
      /^(?:(?:oi|ola|bom dia|boa tarde|boa noite)\s+)+/,
      "",
    )
    .replace(/\s+(?:obrigad[oa]|agradeco)$/, "")
    .trim();

  return [
    /^(?:sim|pode sim|pode ser|confirmo|confirmada|confirmado|combinado|perfeito|tudo certo|ok(?: obrigada)?|ok(?: obrigado)?|estarei la|estarei aí)$/,
    /^(?:podemos(?: sim)?|vamos)\s+(?:combinado|fechado|perfeito)$/,
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
  appointmentScheduled = false,
} = {}) {
  const baseDate = new Date(at);
  if (Number.isNaN(baseDate.getTime())) return null;

  const context = hasConfirmedAppointmentContext(
    recentConversation,
    baseDate,
  );
  if (!context && !appointmentScheduled) return null;

  if (isRescheduleRequest(currentText)) {
    return {
      ...(context || {}),
      state: "reschedule_requested",
    };
  }

  if (isPatientConfirmation(currentText)) {
    return {
      ...(context || {}),
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
  const detection = detectManualAppointment({
    currentText,
    recentConversation,
    at,
  });
  if (!detection || detection.confidence !== "confirmed") {
    return null;
  }
  const { confidence, ...appointment } = detection;

  return {
    ...appointment,
    source: "WhatsApp — confirmação de agendamento detectada",
  };
}
