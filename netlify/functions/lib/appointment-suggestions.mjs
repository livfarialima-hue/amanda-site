const MAX_ALERT_TEXT_LENGTH = 650;

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

export function buildAppointmentSuggestion({
  patientName,
  professional,
  procedure,
  slots,
}) {
  const clinician = displayProfessional(professional);
  const normalizedSlots = Array.isArray(slots) ? slots.slice(0, 3) : [];
  const procedureLabel = String(procedure || "").trim();
  const subject = procedureLabel
    ? `a avaliação de ${procedureLabel.replaceAll("_", " ")}`
    : "a avaliação";

  if (!normalizedSlots.length) {
    return limitText(
      [
        "AGENDAMENTO — revisão necessária",
        `${patientName || "Paciente"} pediu horários para ${subject} com ${clinician}.`,
        "Não há horários disponíveis cadastrados em Datas Consulta.",
      ].join("\n"),
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
      "Sugestão para copiar ao paciente:",
      `${patientGreeting} Para ${subject} com ${clinician}, temos estas opções:`,
      options,
      "Se nenhum destes horários for possível, posso procurar outras opções.",
    ].join("\n"),
  );
}

export function isAppointmentAlertEnabled(env = process.env) {
  return String(env.WHATSAPP_APPOINTMENT_REVIEW_ENABLED || "")
    .trim()
    .toLowerCase() === "true";
}
