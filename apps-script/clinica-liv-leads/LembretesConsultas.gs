const LEMBRETES_CONSULTAS_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Consultas",
  timezone: "America/Sao_Paulo",
  startHour: 9,
  endHour: 19,
  primaryReminderDaysBefore: 2,
  primaryReminderTime: "10:00",
  confirmationDaysBefore: 1,
  confirmationTime: "16:30",
  minimumHoursForPrimaryReminder: 24,
  endpoint:
    "https://draamandaschroeder.com.br/.netlify/functions/appointment-reminder",
  secretProperty: "LEADS_INGEST_SECRET",
  enabledProperty: "LEMBRETES_CONSULTA_ATIVOS",
  endpointProperty: "LEMBRETES_CONSULTA_ENDPOINT",
  triggerFunction: "processarLembretesConsultas",
});

const LEMBRETES_CONSULTAS_HEADERS = Object.freeze({
  id: "ID da consulta",
  phone: "Telefone (E.164)",
  name: "Nome do paciente",
  professional: "Profissional",
  location: "Local / modalidade",
  date: "Data agendada",
  time: "Horário agendado",
  status: "Status",
  consent: "Consentimento para contato",
  patientConfirmedAt: "Confirmação da paciente",
  suppressionReason: "Motivo de supressão",
  reminder48h: "Lembrete 48h enviado",
  reminderSameDay: "Lembrete no dia enviado",
  lastAttempt: "Última tentativa de lembrete",
  lastError: "Erro do lembrete",
  monitoredAppointment: "Agendamento monitorado",
});

function prepararLembretesConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    LEMBRETES_CONSULTAS_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    LEMBRETES_CONSULTAS_CONFIG.sheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaLembretesConsultas_(sheet);

  return {
    ok: true,
    active:
      PropertiesService.getScriptProperties().getProperty(
        LEMBRETES_CONSULTAS_CONFIG.enabledProperty,
      ) === "true",
  };
}

function ativarLembretesConsultas() {
  prepararLembretesConsultas();

  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(
    LEMBRETES_CONSULTAS_CONFIG.enabledProperty,
    "true",
  );
  instalarGatilhoLembretesConsultas_();

  return { ok: true, active: true };
}

function desativarLembretesConsultas() {
  PropertiesService.getScriptProperties().setProperty(
    LEMBRETES_CONSULTAS_CONFIG.enabledProperty,
    "false",
  );
  removerGatilhosLembretesConsultas_();

  return { ok: true, active: false };
}

function instalarGatilhoLembretesConsultas_() {
  removerGatilhosLembretesConsultas_();
  ScriptApp.newTrigger(
    LEMBRETES_CONSULTAS_CONFIG.triggerFunction,
  )
    .timeBased()
    .everyMinutes(15)
    .create();
}

function removerGatilhosLembretesConsultas_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (
      trigger.getHandlerFunction() ===
      LEMBRETES_CONSULTAS_CONFIG.triggerFunction
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function processarLembretesConsultas() {
  const properties = PropertiesService.getScriptProperties();

  if (
    properties.getProperty(
      LEMBRETES_CONSULTAS_CONFIG.enabledProperty,
    ) !== "true"
  ) {
    return { ok: true, active: false, sent: 0 };
  }

  if (!estaNoHorarioLembretesConsultas_(new Date())) {
    return {
      ok: true,
      active: true,
      sent: 0,
      reason: "outside_send_window",
    };
  }

  const secret = properties.getProperty(
    LEMBRETES_CONSULTAS_CONFIG.secretProperty,
  );

  if (!secret) {
    throw new Error(
      "A propriedade LEADS_INGEST_SECRET não está configurada.",
    );
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    return { ok: false, sent: 0, error: "busy_retry" };
  }

  try {
    return processarLembretesConsultasInterno_(
      new Date(),
      secret,
      properties,
    );
  } finally {
    lock.releaseLock();
  }
}

function processarLembretesConsultasInterno_(
  now,
  secret,
  properties,
) {
  const spreadsheet = SpreadsheetApp.openById(
    LEMBRETES_CONSULTAS_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    LEMBRETES_CONSULTAS_CONFIG.sheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaLembretesConsultas_(sheet);

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return { ok: true, active: true, sent: 0 };
  }

  const columns = mapearColunasLembretesConsultas_(values[0]);
  let sent = 0;
  let failed = 0;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const appointment = combinarDataHorarioLembretesConsultas_(
      row[columns.date],
      row[columns.time],
    );

    if (!appointment) continue;

    const appointmentKey = formatarDataLembretesConsultas_(
      appointment,
      "yyyy-MM-dd HH:mm",
    );
    const storedAppointmentKey = String(
      row[columns.monitoredAppointment] || "",
    ).trim();

    if (storedAppointmentKey !== appointmentKey) {
      sheet
        .getRange(rowIndex + 1, columns.reminder48h + 1)
        .clearContent();
      sheet
        .getRange(rowIndex + 1, columns.reminderSameDay + 1)
        .clearContent();
      sheet
        .getRange(rowIndex + 1, columns.lastError + 1)
        .clearContent();
      sheet
        .getRange(
          rowIndex + 1,
          columns.monitoredAppointment + 1,
        )
        .setValue(appointmentKey);
      row[columns.reminder48h] = "";
      row[columns.reminderSameDay] = "";
      row[columns.monitoredAppointment] = appointmentKey;
    }

    if (
      !statusPermiteLembreteConsulta_(row[columns.status]) ||
      !consentimentoPermiteLembreteConsulta_(
        row[columns.consent],
      ) ||
      Boolean(row[columns.suppressionReason])
    ) {
      continue;
    }

    const reminderKind = definirTipoLembreteConsulta_({
      now,
      appointment,
      reminder48hSent: row[columns.reminder48h],
      sameDaySent: row[columns.reminderSameDay],
      patientConfirmed:
        Boolean(row[columns.patientConfirmedAt]) ||
        statusIndicaConfirmacaoDaPaciente_(row[columns.status]),
    });

    if (!reminderKind) continue;

    const appointmentId =
      String(row[columns.id] || "").trim() ||
      `consulta-linha-${rowIndex + 1}`;
    const response = enviarLembreteConsulta_(
      {
        appointmentId,
        reminderKind,
        patientPhone: row[columns.phone],
        patientName: primeiroNomeLembretesConsultas_(
          row[columns.name],
        ),
        professional:
          String(row[columns.professional] || "").trim() ||
          "Dra. Amanda",
        appointmentDate: formatarDataLembretesConsultas_(
          appointment,
          "dd/MM/yyyy",
        ),
        appointmentTime: formatarDataLembretesConsultas_(
          appointment,
          "HH:mm",
        ),
        location:
          String(row[columns.location] || "").trim() ||
          "na Clínica LIV Faria Lima",
      },
      secret,
      properties,
    );

    sheet
      .getRange(rowIndex + 1, columns.lastAttempt + 1)
      .setValue(now);

    if (response.ok && response.sent) {
      const sentColumn =
        reminderKind === "same_day"
          ? columns.reminderSameDay
          : columns.reminder48h;
      sheet
        .getRange(rowIndex + 1, sentColumn + 1)
        .setValue(now);
      sheet
        .getRange(rowIndex + 1, columns.lastError + 1)
        .clearContent();
      sent += 1;
    } else {
      sheet
        .getRange(rowIndex + 1, columns.lastError + 1)
        .setValue(
          String(response.error || "delivery_failed").slice(
            0,
            180,
          ),
        );
      failed += 1;
    }
  }

  return { ok: failed === 0, active: true, sent, failed };
}

function enviarLembreteConsulta_(
  payload,
  secret,
  properties,
) {
  const endpoint =
    properties.getProperty(
      LEMBRETES_CONSULTAS_CONFIG.endpointProperty,
    ) || LEMBRETES_CONSULTAS_CONFIG.endpoint;
  let response;

  try {
    response = UrlFetchApp.fetch(endpoint, {
      method: "post",
      contentType: "application/json; charset=utf-8",
      headers: {
        "x-liv-secret": secret,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (error) {
    return {
      ok: false,
      sent: false,
      error: "request_failed",
    };
  }

  let body = {};

  try {
    body = JSON.parse(response.getContentText() || "{}");
  } catch (error) {
    body = {};
  }

  return {
    ok:
      response.getResponseCode() >= 200 &&
      response.getResponseCode() < 300 &&
      body.ok === true,
    sent: body.sent === true,
    error:
      body.error ||
      `http_${String(response.getResponseCode())}`,
  };
}

function definirTipoLembreteConsulta_(input) {
  const now = input.now;
  const appointment = input.appointment;

  if (
    !(now instanceof Date) ||
    !(appointment instanceof Date) ||
    appointment.getTime() <= now.getTime()
  ) {
    return "";
  }

  const confirmationTarget =
    horarioAlvoConfirmacaoConsulta_(appointment);

  const hoursUntilAppointment =
    (appointment.getTime() - now.getTime()) / (60 * 60 * 1000);

  if (
    !input.patientConfirmed &&
    !input.sameDaySent &&
    now.getTime() >= confirmationTarget.getTime()
  ) {
    return "same_day";
  }

  if (input.sameDaySent) return "";

  const primaryReminderTarget =
    horarioAlvoLembretePrincipalConsulta_(
      appointment,
    );

  if (
    !input.reminder48hSent &&
    hoursUntilAppointment >=
      LEMBRETES_CONSULTAS_CONFIG.minimumHoursForPrimaryReminder &&
    now.getTime() >= primaryReminderTarget.getTime() &&
    now.getTime() < confirmationTarget.getTime()
  ) {
    return "48h";
  }

  return "";
}

function horarioAlvoLembretePrincipalConsulta_(appointment) {
  const previousDate = new Date(
    appointment.getTime() -
      LEMBRETES_CONSULTAS_CONFIG.primaryReminderDaysBefore *
        24 *
        60 *
        60 *
        1000,
  );

  return criarDataSaoPauloLembretesConsultas_(
    formatarDataLembretesConsultas_(
      previousDate,
      "yyyy-MM-dd",
    ),
    LEMBRETES_CONSULTAS_CONFIG.primaryReminderTime,
  );
}

function horarioAlvoConfirmacaoConsulta_(appointment) {
  const previousDate = new Date(
    appointment.getTime() -
      LEMBRETES_CONSULTAS_CONFIG.confirmationDaysBefore *
        24 *
        60 *
        60 *
        1000,
  );

  return criarDataSaoPauloLembretesConsultas_(
    formatarDataLembretesConsultas_(
      previousDate,
      "yyyy-MM-dd",
    ),
    LEMBRETES_CONSULTAS_CONFIG.confirmationTime,
  );
}

function estaNoHorarioLembretesConsultas_(date) {
  const hour = Number(
    formatarDataLembretesConsultas_(date, "H"),
  );

  return (
    hour >= LEMBRETES_CONSULTAS_CONFIG.startHour &&
    hour < LEMBRETES_CONSULTAS_CONFIG.endHour
  );
}

function statusPermiteLembreteConsulta_(value) {
  const normalized = normalizarTextoLembretesConsultas_(value);

  return [
    "agendada",
    "confirmada",
    "consulta agendada",
    "consulta confirmada",
  ].includes(normalized);
}

function statusIndicaConfirmacaoDaPaciente_(value) {
  return [
    "consulta confirmada",
    "confirmada pela paciente",
  ].includes(normalizarTextoLembretesConsultas_(value));
}

function consentimentoPermiteLembreteConsulta_(value) {
  const normalized = normalizarTextoLembretesConsultas_(value);

  return ![
    "nao",
    "nao autorizado",
    "sem consentimento",
    "false",
    "falso",
    "0",
  ].includes(normalized);
}

function combinarDataHorarioLembretesConsultas_(
  dateValue,
  timeValue,
) {
  const datePart =
    extrairDataLembretesConsultas_(dateValue);
  const timePart =
    extrairHorarioLembretesConsultas_(timeValue);

  if (!datePart || !timePart) return null;

  const combined = criarDataSaoPauloLembretesConsultas_(
    datePart,
    timePart,
  );

  return Number.isNaN(combined.getTime()) ? null : combined;
}

function extrairDataLembretesConsultas_(value) {
  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return formatarDataLembretesConsultas_(
      value,
      "yyyy-MM-dd",
    );
  }

  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) return "";

  return [
    match[3],
    String(match[2]).padStart(2, "0"),
    String(match[1]).padStart(2, "0"),
  ].join("-");
}

function extrairHorarioLembretesConsultas_(value) {
  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return formatarDataLembretesConsultas_(value, "HH:mm");
  }

  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);

  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(
    minute,
  ).padStart(2, "0")}`;
}

function criarDataSaoPauloLembretesConsultas_(
  datePart,
  timePart,
) {
  return new Date(`${datePart}T${timePart}:00-03:00`);
}

function garantirEstruturaLembretesConsultas_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });
  const required = [
    LEMBRETES_CONSULTAS_HEADERS.reminder48h,
    LEMBRETES_CONSULTAS_HEADERS.reminderSameDay,
    LEMBRETES_CONSULTAS_HEADERS.lastAttempt,
    LEMBRETES_CONSULTAS_HEADERS.lastError,
    LEMBRETES_CONSULTAS_HEADERS.monitoredAppointment,
    LEMBRETES_CONSULTAS_HEADERS.patientConfirmedAt,
    LEMBRETES_CONSULTAS_HEADERS.suppressionReason,
  ];

  required.forEach(function (header) {
    if (!headers.includes(header)) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header);
    }
  });
}

function mapearColunasLembretesConsultas_(headers) {
  const normalizedHeaders = headers.map(function (value) {
    return String(value || "").trim();
  });
  const result = {};

  Object.keys(LEMBRETES_CONSULTAS_HEADERS).forEach(function (
    key,
  ) {
    const header = LEMBRETES_CONSULTAS_HEADERS[key];
    const index = normalizedHeaders.indexOf(header);

    if (index === -1) {
      throw new Error(`Coluna obrigatória ausente: ${header}`);
    }

    result[key] = index;
  });

  return result;
}

function primeiroNomeLembretesConsultas_(value) {
  return String(value || "").trim().split(/\s+/)[0] || "Olá";
}

function normalizarTextoLembretesConsultas_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarDataLembretesConsultas_(date, format) {
  return Utilities.formatDate(
    date,
    LEMBRETES_CONSULTAS_CONFIG.timezone,
    format,
  );
}
