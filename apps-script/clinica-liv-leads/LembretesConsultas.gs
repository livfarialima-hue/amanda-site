const LEMBRETES_CONSULTAS_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Consultas",
  timezone: "America/Sao_Paulo",
  startHour: 9,
  endHour: 19,
  singleReminderDaysBefore: 1,
  singleReminderTime: "10:00",
  endpoint:
    "https://draamandaschroeder.com.br/.netlify/functions/appointment-reminder",
  webAppUrl:
    "https://script.google.com/macros/s/AKfycby-ylkJVFEcq5cfABOkazHBIszpissNJh2P8CEqYFMo0Hog5XP-e5KT3bcbSZuBUKX79A/exec",
  secretProperty: "LEADS_INGEST_SECRET",
  enabledProperty: "LEMBRETES_CONSULTA_ATIVOS",
  safeContractProperty:
    "LEMBRETES_CONSULTA_CONTRATO_SEGURO_ATIVO",
  endpointProperty: "LEMBRETES_CONSULTA_ENDPOINT",
  triggerFunction: "processarLembretesConsultas",
});

const LEMBRETES_CONSULTAS_LOCAL_CLINICA = Object.freeze({
  address: "Rua Pais Leme, 215, Pinheiros, São Paulo",
  mapsUrl:
    "https://maps.google.com/?q=Rua+Pais+Leme,+215,+Pinheiros,+Sao+Paulo",
});

const LEMBRETES_CONSULTAS_HEADERS = Object.freeze({
  id: "ID da consulta",
  phone: "Telefone (E.164)",
  name: "Nome do paciente",
  professional: "Profissional",
  consultationType: "Tipo de consulta",
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
  reminderCancelledAt: "Lembrete cancelado em",
  reminderCancellationReason:
    "Motivo do cancelamento do lembrete",
  reminderCancelledAppointment:
    "Agendamento do lembrete cancelado",
  calendarId: "ID da agenda Google",
  calendarEventId: "ID do evento Google",
  calendarSyncStatus: "Sincronização Google Agenda",
});

function chaveCancelamentoLembreteConsulta_(input) {
  const dados = input && typeof input === "object" ? input : {};
  const appointmentId = String(dados.appointmentId || "")
    .trim()
    .slice(0, 180);
  const appointmentKey = normalizarChaveAgendamentoMonitorado_(
    dados.appointmentKey,
  );
  const calendarId = String(dados.calendarId || "")
    .trim()
    .slice(0, 220);
  const calendarEventId = String(dados.calendarEventId || "")
    .trim()
    .slice(0, 220);

  if (!appointmentId || !appointmentKey) return "";

  return [
    appointmentId,
    appointmentKey,
    calendarId,
    calendarEventId,
  ].join("|");
}

function assinaturaCancelamentoLembreteConsulta_(input) {
  if (
    typeof PropertiesService === "undefined" ||
    typeof Utilities === "undefined"
  ) {
    return "";
  }

  const chave = chaveCancelamentoLembreteConsulta_(input);
  const segredo = PropertiesService.getScriptProperties().getProperty(
    LEMBRETES_CONSULTAS_CONFIG.secretProperty,
  );

  if (!chave || !segredo) return "";

  return Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(
      "cancelar_lembrete_consulta|" + chave,
      segredo,
    ),
  ).replace(/=+$/g, "");
}

function urlAplicativoLembretesConsultas_() {
  const candidata =
    typeof urlAplicativoRetomadas_ === "function"
      ? urlAplicativoRetomadas_()
      : LEMBRETES_CONSULTAS_CONFIG.webAppUrl;
  const url = String(candidata || "")
    .trim()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i.test(
    url,
  )
    ? url
    : "";
}

function linkCancelamentoLembreteConsulta_(input) {
  const token = assinaturaCancelamentoLembreteConsulta_(input);
  const baseUrl = urlAplicativoLembretesConsultas_();

  if (!token || !baseUrl) return "";

  return (
    baseUrl +
    "?view=cancelar_lembrete_consulta&cancel=" +
    encodeURIComponent(token)
  );
}

function localizarLembreteConsultaPorCancelamento_(sheet, token) {
  const recebido = String(token || "").trim();
  if (!sheet || sheet.getLastRow() < 2 || !recebido) return null;

  garantirEstruturaLembretesConsultas_(sheet);
  const values = sheet.getDataRange().getValues();
  const columns = mapearColunasLembretesConsultas_(values[0]);

  for (let index = values.length - 1; index >= 1; index -= 1) {
    const row = values[index];
    const appointment = combinarDataHorarioLembretesConsultas_(
      row[columns.date],
      row[columns.time],
    );
    if (!appointment) continue;

    const appointmentKey = formatarDataLembretesConsultas_(
      appointment,
      "yyyy-MM-dd HH:mm",
    );
    const input = {
      appointmentId: row[columns.id],
      appointmentKey,
      calendarId: row[columns.calendarId],
      calendarEventId: row[columns.calendarEventId],
    };
    const esperado = assinaturaCancelamentoLembreteConsulta_(input);

    if (
      esperado &&
      esperado.length === recebido.length &&
      esperado === recebido
    ) {
      return {
        rowNumber: index + 1,
        row,
        columns,
        appointment,
        appointmentKey,
      };
    }
  }

  return null;
}

function cancelarLembreteConsultaPorToken_(sheet, token, now) {
  const reminder = localizarLembreteConsultaPorCancelamento_(
    sheet,
    token,
  );
  if (!reminder) return { ok: false, reason: "reminder_not_found" };

  const row = reminder.row;
  const columns = reminder.columns;
  const cancelledAppointment =
    normalizarChaveAgendamentoMonitorado_(
      row[columns.reminderCancelledAppointment],
    );

  if (cancelledAppointment === reminder.appointmentKey) {
    return { ok: true, alreadyCancelled: true };
  }

  if (
    row[columns.reminder48h] ||
    row[columns.reminderSameDay] ||
    row[columns.lastAttempt]
  ) {
    return { ok: false, reason: "reminder_not_eligible" };
  }

  if (
    !statusPermiteLembreteConsulta_(row[columns.status]) ||
    reminder.appointment.getTime() <= now.getTime()
  ) {
    return { ok: false, reason: "reminder_not_eligible" };
  }

  sheet
    .getRange(
      reminder.rowNumber,
      columns.reminderCancelledAt + 1,
    )
    .setValue(now);
  sheet
    .getRange(
      reminder.rowNumber,
      columns.reminderCancellationReason + 1,
    )
    .setValue("Cancelado pela equipe no e-mail diário");
  const cancelledAppointmentRange = sheet.getRange(
    reminder.rowNumber,
    columns.reminderCancelledAppointment + 1,
  );
  cancelledAppointmentRange.setNumberFormat("@");
  cancelledAppointmentRange.setValue(reminder.appointmentKey);
  SpreadsheetApp.flush();

  return { ok: true, alreadyCancelled: false };
}

function confirmarCancelamentoLembreteConsulta(token) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return {
      ok: false,
      reason: "busy_retry",
      message:
        "A agenda está sendo atualizada. Tente novamente em alguns segundos.",
    };
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(
      LEMBRETES_CONSULTAS_CONFIG.spreadsheetId,
    );
    const sheet = spreadsheet.getSheetByName(
      LEMBRETES_CONSULTAS_CONFIG.sheetName,
    );
    const result = cancelarLembreteConsultaPorToken_(
      sheet,
      token,
      new Date(),
    );

    if (!result.ok) {
      const messages = {
        reminder_not_found:
          "Este lembrete não foi localizado. A consulta e os demais cuidados permaneceram inalterados.",
        reminder_not_eligible:
          "Este lembrete já foi tentado, enviado ou mudou de estado e não pode mais ser cancelado.",
      };
      return {
        ok: false,
        reason: result.reason,
        message:
          messages[result.reason] ||
          "Não foi possível cancelar este lembrete.",
      };
    }

    return {
      ok: true,
      alreadyCancelled: result.alreadyCancelled === true,
      message: result.alreadyCancelled
        ? "Este lembrete já estava cancelado. A consulta permanece agendada."
        : "Pronto. Apenas este lembrete foi cancelado; a consulta permanece agendada.",
    };
  } finally {
    lock.releaseLock();
  }
}

function renderCancelamentoLembreteConsulta_(parameters) {
  const token = String(
    parameters && parameters.cancel
      ? parameters.cancel
      : "",
  ).trim();
  const spreadsheet = SpreadsheetApp.openById(
    LEMBRETES_CONSULTAS_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    LEMBRETES_CONSULTAS_CONFIG.sheetName,
  );
  const reminder = localizarLembreteConsultaPorCancelamento_(
    sheet,
    token,
  );

  if (!reminder) {
    return HtmlService.createHtmlOutput(
      paginaCancelamentoLembreteConsulta_(
        "Link inválido ou expirado",
        "Não foi possível localizar este lembrete. A consulta e os demais cuidados permaneceram inalterados.",
        "",
      ),
    ).setTitle("Clínica LIV — lembrete de consulta");
  }

  return HtmlService.createHtmlOutput(
    paginaCancelamentoLembreteConsulta_(
      "Cancelar apenas este lembrete?",
      "A consulta continuará agendada. Esta ação impede somente o lembrete automático vinculado ao horário atual.",
      token,
    ),
  ).setTitle("Clínica LIV — confirmar cancelamento");
}

function paginaCancelamentoLembreteConsulta_(
  title,
  message,
  confirmToken,
) {
  const safeToken = JSON.stringify(
    String(confirmToken || ""),
  ).replace(/</g, "\\u003c");
  const button = confirmToken
    ? '<button id="confirmar-cancelamento" type="button" onclick="confirmarCancelamento()" style="border:0;margin-top:18px;padding:12px 18px;border-radius:8px;background:#9a3412;color:#fff;font-weight:bold;cursor:pointer;">Confirmar cancelamento do lembrete</button>'
    : "";
  const script = confirmToken
    ? '<script>function atualizarResultado(titulo,mensagem,sucesso){document.querySelector("h1").textContent=titulo;document.querySelector("#mensagem").textContent=mensagem;var botao=document.querySelector("#confirmar-cancelamento");if(botao){if(sucesso){botao.remove();}else{botao.disabled=false;botao.textContent="Tentar novamente";}}}function confirmarCancelamento(){var botao=document.querySelector("#confirmar-cancelamento");botao.disabled=true;botao.textContent="Cancelando...";google.script.run.withSuccessHandler(function(resultado){atualizarResultado(resultado&&resultado.ok?"Lembrete cancelado":"Não foi possível cancelar",resultado&&resultado.message?resultado.message:"Não foi possível concluir a ação.",Boolean(resultado&&resultado.ok));}).withFailureHandler(function(){atualizarResultado("Não foi possível cancelar","Houve uma falha temporária. Tente novamente em alguns segundos.",false);}).confirmarCancelamentoLembreteConsulta(' +
      safeToken +
      ");}</script>"
    : "";

  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;"><main style="max-width:560px;margin:48px auto;padding:28px;background:#fff;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.08);">' +
    '<div style="color:#075e54;font-size:14px;font-weight:bold;">CLÍNICA LIV</div><h1 style="font-size:24px;margin:10px 0 12px;">' +
    escaparHtmlLembretesConsultas_(title) +
    '</h1><p id="mensagem" style="line-height:1.6;color:#4b5563;">' +
    escaparHtmlLembretesConsultas_(message) +
    "</p>" +
    button +
    script +
    "</main></body></html>"
  );
}

function escaparHtmlLembretesConsultas_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
      ) === "true" &&
      PropertiesService.getScriptProperties().getProperty(
        LEMBRETES_CONSULTAS_CONFIG.safeContractProperty,
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
  properties.setProperty(
    LEMBRETES_CONSULTAS_CONFIG.safeContractProperty,
    "true",
  );
  instalarGatilhoLembretesConsultas_();

  return { ok: true, active: true };
}

function desativarLembretesConsultas() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(
    LEMBRETES_CONSULTAS_CONFIG.enabledProperty,
    "false",
  );
  properties.setProperty(
    LEMBRETES_CONSULTAS_CONFIG.safeContractProperty,
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

  // O código novo chega ao editor antes de a versão ser ativada. A segunda
  // chave mantém o efeito desligado durante esse intervalo e só é ligada
  // explicitamente depois do preflight coordenado com o Netlify.
  if (
    properties.getProperty(
      LEMBRETES_CONSULTAS_CONFIG.safeContractProperty,
    ) !== "true"
  ) {
    return {
      ok: true,
      active: false,
      sent: 0,
      reason: "safe_contract_not_activated",
    };
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
  const leadsSheet = spreadsheet.getSheetByName(
    typeof CONFIG !== "undefined"
      ? CONFIG.sheetName
      : "Google Ads - Conversões",
  );
  const preferencesByPhone =
    typeof carregarPreferenciasContatoPorTelefone_ ===
    "function"
      ? carregarPreferenciasContatoPorTelefone_(leadsSheet)
      : {};
  let sent = 0;
  let failed = 0;
  let blockedByPreference = 0;
  let blockedByInvalidPatientData = 0;
  let blockedByUnverifiedSchedule = 0;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const normalizedPhone =
      typeof normalizarTelefonePreferenciaContato_ ===
      "function"
        ? normalizarTelefonePreferenciaContato_(
            row[columns.phone],
          )
        : String(row[columns.phone] || "").replace(/\D/g, "");
    const contactPreferences =
      preferencesByPhone[normalizedPhone] || {};

    if (contactPreferences.neverBotReply === true) {
      blockedByPreference += 1;
      continue;
    }

    const patientData = validarDadosPacienteLembreteConsulta_({
      phone: row[columns.phone],
      name: row[columns.name],
    });

    // Falha fechada antes de qualquer escrita ou chamada externa. Linhas
    // usadas apenas para reservar sala podem não ter telefone, e um nome
    // ausente geraria uma saudação defeituosa no template aprovado.
    if (!patientData.ok) {
      blockedByInvalidPatientData += 1;
      continue;
    }

    const appointment = combinarDataHorarioLembretesConsultas_(
      row[columns.date],
      row[columns.time],
    );

    if (!appointment) continue;

    const appointmentKey = formatarDataLembretesConsultas_(
      appointment,
      "yyyy-MM-dd HH:mm",
    );
    const storedAppointmentKey =
      normalizarChaveAgendamentoMonitorado_(
        row[columns.monitoredAppointment],
      );
    const appointmentChanged =
      storedAppointmentKey !== appointmentKey;
    const reminderCancelledForCurrentAppointment =
      normalizarChaveAgendamentoMonitorado_(
        row[columns.reminderCancelledAppointment],
      ) === appointmentKey;

    if (
      !statusPermiteLembreteConsulta_(row[columns.status]) ||
      !consentimentoPermiteLembreteConsulta_(
        row[columns.consent],
      ) ||
      Boolean(row[columns.suppressionReason]) ||
      reminderCancelledForCurrentAppointment
    ) {
      continue;
    }

    const reminderKind = definirTipoLembreteConsulta_({
      now,
      appointment,
      reminder48hSent: appointmentChanged
        ? ""
        : row[columns.reminder48h],
      sameDaySent: appointmentChanged
        ? ""
        : row[columns.reminderSameDay],
      lastAttempt: appointmentChanged
        ? ""
        : row[columns.lastAttempt],
    });

    if (!reminderKind) continue;

    const scheduleVerification =
      validarVinculoAgendaLembreteConsulta_(
        {
          appointment,
          appointmentKey,
          consultationType: row[columns.consultationType],
          location: row[columns.location],
          calendarId: row[columns.calendarId],
          calendarEventId: row[columns.calendarEventId],
          calendarSyncStatus:
            row[columns.calendarSyncStatus],
        },
        typeof CalendarApp !== "undefined"
          ? CalendarApp
          : null,
      );

    // A data da planilha não basta para autorizar uma mensagem. Para
    // atendimento presencial, o evento vivo precisa existir no Calendar
    // vinculado e começar exatamente no mesmo horário. Qualquer ausência,
    // erro de leitura ou divergência falha fechada antes de escrever na
    // planilha ou chamar o provedor.
    if (!scheduleVerification.ok) {
      blockedByUnverifiedSchedule += 1;
      continue;
    }

    if (appointmentChanged) {
      sheet
        .getRange(rowIndex + 1, columns.reminder48h + 1)
        .clearContent();
      sheet
        .getRange(rowIndex + 1, columns.reminderSameDay + 1)
        .clearContent();
      sheet
        .getRange(rowIndex + 1, columns.lastAttempt + 1)
        .clearContent();
      sheet
        .getRange(rowIndex + 1, columns.lastError + 1)
        .clearContent();
      const monitoredAppointmentRange = sheet.getRange(
        rowIndex + 1,
        columns.monitoredAppointment + 1,
      );

      // Sem o formato de texto, o Sheets converte automaticamente
      // "2026-08-11 16:00" em Date. Na execução seguinte essa
      // conversão parecia uma alteração do agendamento, limpava a
      // marca de envio e liberava o mesmo lembrete novamente.
      monitoredAppointmentRange.setNumberFormat("@");
      monitoredAppointmentRange.setValue(appointmentKey);
      row[columns.reminder48h] = "";
      row[columns.reminderSameDay] = "";
      row[columns.lastAttempt] = "";
      row[columns.monitoredAppointment] = appointmentKey;
    }

    const appointmentId =
      String(row[columns.id] || "").trim() ||
      `consulta-linha-${rowIndex + 1}`;
    // Reserva a tentativa antes da chamada externa. Assim, mesmo que a
    // resposta da YCloud se perca ou a execução seja interrompida depois
    // do envio, nenhuma execução futura repete o lembrete. Uma falha fica
    // registrada para revisão humana e não é reenviada automaticamente.
    sheet
      .getRange(rowIndex + 1, columns.lastAttempt + 1)
      .setValue(now);
    row[columns.lastAttempt] = now;
    SpreadsheetApp.flush();

    const response = enviarLembreteConsulta_(
      {
        appointmentId,
        reminderKind,
        patientPhone: patientData.phone,
        patientName: patientData.firstName,
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
        location: formatarLocalLembreteConsulta_(
          row[columns.location],
        ),
      },
      secret,
      properties,
    );

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

  return {
    ok: failed === 0,
    active: true,
    sent,
    failed,
    blockedByPreference,
    blockedByInvalidPatientData,
    blockedByUnverifiedSchedule,
  };
}

function validarVinculoAgendaLembreteConsulta_(
  input,
  calendarApp,
) {
  const appointment = input && input.appointment;
  const appointmentKey =
    String((input && input.appointmentKey) || "").trim() ||
    (appointment instanceof Date &&
    !Number.isNaN(appointment.getTime())
      ? formatarDataLembretesConsultas_(
          appointment,
          "yyyy-MM-dd HH:mm",
        )
      : "");
  const locationAndType = normalizarTextoLembretesConsultas_(
    [
      input && input.location,
      input && input.consultationType,
    ].join(" "),
  );
  const syncStatus = normalizarTextoLembretesConsultas_(
    input && input.calendarSyncStatus,
  );
  const calendarId = String(
    (input && input.calendarId) || "",
  ).trim();
  const eventId = String(
    (input && input.calendarEventId) || "",
  ).trim();
  const remoteByModality =
    /teleconsulta|atendimento remoto|online|videochamada/.test(
      locationAndType,
    );
  const remoteBySyncStatus =
    /nao se aplica/.test(syncStatus) &&
    /atendimento remoto/.test(syncStatus);

  if (!appointmentKey) {
    return { ok: false, reason: "invalid_appointment_schedule" };
  }

  if (remoteByModality || remoteBySyncStatus) {
    if (
      !remoteByModality ||
      !remoteBySyncStatus ||
      calendarId ||
      eventId
    ) {
      return {
        ok: false,
        reason: "remote_schedule_not_verified",
      };
    }

    return { ok: true, mode: "remote" };
  }

  if (!calendarId || !eventId) {
    return { ok: false, reason: "calendar_link_missing" };
  }

  if (!/^sincronizado\b/.test(syncStatus)) {
    return {
      ok: false,
      reason: "calendar_sync_not_confirmed",
    };
  }

  if (
    !calendarApp ||
    typeof calendarApp.getCalendarById !== "function"
  ) {
    return { ok: false, reason: "calendar_unavailable" };
  }

  try {
    const calendar = calendarApp.getCalendarById(calendarId);
    if (!calendar || typeof calendar.getEventById !== "function") {
      return { ok: false, reason: "calendar_unavailable" };
    }

    let event = calendar.getEventById(eventId);
    if (!event && !/@/.test(eventId)) {
      event = calendar.getEventById(eventId + "@google.com");
    }
    if (!event || typeof event.getStartTime !== "function") {
      return { ok: false, reason: "calendar_event_missing" };
    }

    const eventStart = event.getStartTime();
    if (
      !(eventStart instanceof Date) ||
      Number.isNaN(eventStart.getTime())
    ) {
      return {
        ok: false,
        reason: "calendar_event_start_invalid",
      };
    }

    const eventKey = formatarDataLembretesConsultas_(
      eventStart,
      "yyyy-MM-dd HH:mm",
    );
    if (eventKey !== appointmentKey) {
      return {
        ok: false,
        reason: "calendar_start_mismatch",
        expected: appointmentKey,
        observed: eventKey,
      };
    }

    return { ok: true, mode: "in_person" };
  } catch (error) {
    return { ok: false, reason: "calendar_read_failed" };
  }
}

function descreverBloqueioAgendaLembreteConsulta_(reason) {
  const descriptions = {
    invalid_appointment_schedule:
      "data ou horário inválido em Consultas",
    remote_schedule_not_verified:
      "modalidade remota sem marcação canônica consistente",
    calendar_link_missing:
      "vínculo com o Google Agenda ausente ou incompleto",
    calendar_sync_not_confirmed:
      "sincronização com o Google Agenda não confirmada",
    calendar_unavailable:
      "agenda vinculada indisponível para conferência",
    calendar_event_missing:
      "evento vinculado não encontrado no Google Agenda",
    calendar_event_start_invalid:
      "horário do evento vinculado inválido",
    calendar_start_mismatch:
      "data ou horário divergente entre Consultas e Google Agenda",
    calendar_read_failed:
      "falha ao conferir o evento no Google Agenda",
  };

  return (
    descriptions[String(reason || "")] ||
    "agendamento sem comprovação suficiente"
  );
}

function formatarLocalLembreteConsulta_(value) {
  const location = String(value || "").trim();

  if (
    /maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl/i.test(
      location,
    )
  ) {
    return location;
  }

  if (/rua\s+pais\s+leme\s*,?\s*215/i.test(location)) {
    return (
      location +
      "\nGoogle Maps: " +
      LEMBRETES_CONSULTAS_LOCAL_CLINICA.mapsUrl
    );
  }

  if (
    !location ||
    /cl[ií]nica\s+liv|faria\s+lima/i.test(location)
  ) {
    return (
      (location || "na Clínica LIV Faria Lima") +
      ", " +
      LEMBRETES_CONSULTAS_LOCAL_CLINICA.address +
      "\nGoogle Maps: " +
      LEMBRETES_CONSULTAS_LOCAL_CLINICA.mapsUrl
    );
  }

  return location;
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

  // As duas colunas antigas permanecem como histórico. Qualquer uma
  // preenchida significa que este agendamento já recebeu seu único
  // lembrete e não deve receber outro.
  if (
    input.reminder48hSent ||
    input.sameDaySent ||
    input.lastAttempt
  ) {
    return "";
  }

  const singleReminderTarget =
    horarioAlvoLembretePrincipalConsulta_(
      appointment,
    );

  if (now.getTime() >= singleReminderTarget.getTime()) {
    // Mantém o identificador legado "48h" para compatibilidade com o
    // endpoint e com o template já aprovado na YCloud.
    return "48h";
  }

  return "";
}

function horarioAlvoLembretePrincipalConsulta_(appointment) {
  const previousDate = new Date(
    appointment.getTime() -
      LEMBRETES_CONSULTAS_CONFIG.singleReminderDaysBefore *
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
    LEMBRETES_CONSULTAS_CONFIG.singleReminderTime,
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

function normalizarChaveAgendamentoMonitorado_(value) {
  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return formatarDataLembretesConsultas_(
      value,
      "yyyy-MM-dd HH:mm",
    );
  }

  const text = String(value || "").trim();

  if (!text) return "";

  const isoMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/,
  );

  if (isoMatch) {
    return [
      `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
      `${String(Number(isoMatch[4])).padStart(2, "0")}:${isoMatch[5]}`,
    ].join(" ");
  }

  const brazilianMatch = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,T]+(\d{1,2}):(\d{2})/,
  );

  if (brazilianMatch) {
    return [
      [
        brazilianMatch[3],
        String(Number(brazilianMatch[2])).padStart(2, "0"),
        String(Number(brazilianMatch[1])).padStart(2, "0"),
      ].join("-"),
      `${String(Number(brazilianMatch[4])).padStart(2, "0")}:${brazilianMatch[5]}`,
    ].join(" ");
  }

  return text;
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
    LEMBRETES_CONSULTAS_HEADERS.reminderCancelledAt,
    LEMBRETES_CONSULTAS_HEADERS.reminderCancellationReason,
    LEMBRETES_CONSULTAS_HEADERS.reminderCancelledAppointment,
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
  const firstName = String(value || "")
    .trim()
    .split(/\s+/)[0]
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’-]/g, "");
  const normalized = normalizarTextoLembretesConsultas_(firstName);

  if (
    firstName.length < 2 ||
    [
      "nao",
      "informado",
      "paciente",
      "cliente",
      "desconhecido",
    ].includes(normalized)
  ) {
    return "";
  }

  return firstName;
}

function normalizarTelefoneLembretesConsultas_(value) {
  const digits = String(value || "").replace(/\D/g, "");

  return /^55\d{10,11}$/.test(digits) ? `+${digits}` : "";
}

function validarDadosPacienteLembreteConsulta_(input) {
  const phone = normalizarTelefoneLembretesConsultas_(
    input && input.phone,
  );
  const firstName = primeiroNomeLembretesConsultas_(
    input && input.name,
  );

  if (!phone) {
    return { ok: false, reason: "missing_valid_phone" };
  }

  if (!firstName) {
    return { ok: false, reason: "missing_valid_name" };
  }

  return { ok: true, phone, firstName };
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
