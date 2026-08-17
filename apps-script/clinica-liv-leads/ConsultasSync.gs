const CONSULTAS_SYNC_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  consultationsSheetName: "Consultas",
  leadSheetNames: Object.freeze([
    "Google Ads - ConversÃµes",
    "Leads Dr. Daniel",
  ]),
  timezone: "America/Sao_Paulo",
  startHour: 9,
  endHour: 19,
  postConsultDelayMinutes: 180,
  postConsultMaxAgeDays: 7,
  postConsultRetryMinutes: 30,
  postConsultDisabledRetryMinutes: 360,
  noShowDelayMinutes: 120,
  noShowManualDelayDays: 5,
  noShowWhatsappWindowMinutes: 1430,
  postConsultEndpoint:
    "https://draamandaschroeder.com.br/.netlify/functions/post-consult-followup",
  secretProperty: "LEADS_INGEST_SECRET",
  postConsultEndpointProperty: "POS_CONSULTA_ENDPOINT",
  noShowEndpoint:
    "https://draamandaschroeder.com.br/api/scheduled-followup",
  noShowEndpointProperty: "NAO_COMPARECEU_ENDPOINT",
  syncTriggerFunction: "sincronizarConsultasAoEditar",
  postConsultTriggerFunction: "processarPosConsulta",
  defaultAppointmentDurationMinutes: 60,
  roomCalendars: Object.freeze({
    "Sala 1":
      "257c2b41ddae349c5187ad3e422a19bd57b515435f14fa7ac4f933cdac8cb164@group.calendar.google.com",
    "Sala 2":
      "8ba6ec7ba5cfca4acf42ed4ea8fb2ceb99b31ddd88e6e36da868037374d9e0bd@group.calendar.google.com",
  }),
});

const CONSULTAS_SYNC_HEADERS = Object.freeze({
  id: "ID da consulta",
  opportunityId: "Opportunity ID",
  phone: "Telefone (E.164)",
  name: "Nome do paciente",
  professional: "Profissional",
  room: "Sala",
  consultationType: "Tipo de consulta",
  topic: "Tema / procedimento",
  location: "Local / modalidade",
  scheduledDate: "Data agendada",
  scheduledTime: "HorÃ¡rio agendado",
  status: "Status",
  completedDate: "Data realizada",
  consent: "Consentimento para contato",
  source: "Origem do registro",
  notes: "ObservaÃ§Ãµes administrativas",
  postEligibleAt: "PÃ³s-consulta elegÃ­vel em",
  postSentAt: "PÃ³s-consulta enviado",
  postLastAttempt: "Ãšltima tentativa pÃ³s-consulta",
  postLastError: "Erro pÃ³s-consulta",
  postSuppressedAt: "PÃ³s-consulta suprimido em",
  patientConfirmedAt: "ConfirmaÃ§Ã£o da paciente",
  lastHumanInteractionAt: "Ãšltima interaÃ§Ã£o humana",
  nextAction: "PrÃ³xima aÃ§Ã£o",
  suppressionReason: "Motivo de supressÃ£o",
  durationMinutes: "DuraÃ§Ã£o (min)",
  calendarId: "ID da agenda Google",
  calendarEventId: "ID do evento Google",
  calendarSyncStatus: "SincronizaÃ§Ã£o Google Agenda",
  calendarSyncError: "Erro Google Agenda",
  noShowAt: "NÃ£o comparecimento registrado em",
  noShowEligibleAt: "Retomada de ausÃªncia elegÃ­vel em",
  noShowSentAt: "Retomada de ausÃªncia enviada",
  noShowLastAttempt: "Ãšltima tentativa de retomada de ausÃªncia",
  noShowLastError: "Erro na retomada de ausÃªncia",
  noShowSuppressedAt: "Retomada de ausÃªncia suprimida em",
  noShowManualAt: "Retomada manual de ausÃªncia sugerida em",
});

const CONSULTAS_SYNC_CALENDAR_TRIGGER_HEADERS = Object.freeze([
  CONSULTAS_SYNC_HEADERS.opportunityId,
  CONSULTAS_SYNC_HEADERS.professional,
  CONSULTAS_SYNC_HEADERS.room,
  CONSULTAS_SYNC_HEADERS.consultationType,
  CONSULTAS_SYNC_HEADERS.location,
  CONSULTAS_SYNC_HEADERS.scheduledDate,
  CONSULTAS_SYNC_HEADERS.scheduledTime,
  CONSULTAS_SYNC_HEADERS.durationMinutes,
  CONSULTAS_SYNC_HEADERS.status,
]);

const CONSULTAS_SYNC_LEAD_HEADERS = Object.freeze({
  opportunityId: "Opportunity ID",
  phone: "Telefone (E.164)",
  status: "SituaÃ§Ã£o do lead",
  statusDate: "Data da situaÃ§Ã£o",
  reference: "ReferÃªncia da campanha",
  platform: "Plataforma de aquisiÃ§Ã£o",
  campaign: "Campanha",
  creative: "Criativo",
  notes: "ObservaÃ§Ã£o administrativa",
  appointmentDate: "Data da consulta",
  appointmentTime: "HorÃ¡rio da consulta",
  appointmentProfessional: "Profissional da consulta",
  appointmentRoom: "Sala da consulta",
  appointmentOutcome: "Resultado do Ãºltimo agendamento",
  lastNoShowAt: "Ãšltimo nÃ£o comparecimento",
  noShowCount: "Total de nÃ£o comparecimentos",
});

function chaveProfissionalConsulta_(value) {
  const normalized = normalizarTextoConsultasSync_(value);

  if (normalized.includes("amanda")) return "amanda";
  if (normalized.includes("henrique")) return "henrique";
  if (normalized.includes("marina")) return "marina";
  if (normalized.includes("laerte")) return "laerte";
  if (normalized.includes("daniel")) return "daniel";

  return "";
}

function salasPermitidasProfissional_(professional) {
  const key = chaveProfissionalConsulta_(professional);

  if (key === "amanda") return ["Sala 1"];
  if (key === "henrique" || key === "daniel") {
    return ["Sala 2"];
  }
  if (key === "marina" || key === "laerte") {
    return ["Sala 1", "Sala 2"];
  }

  return [];
}

function profissionalPermitidoAutomacaoConsulta_(professional) {
  const key = chaveProfissionalConsulta_(professional);
  return key === "amanda" || key === "daniel";
}

function normalizarSalaConsulta_(value) {
  const normalized = normalizarTextoConsultasSync_(value);
  if (/\bsala\s*1\b/.test(normalized)) return "Sala 1";
  if (/\bsala\s*2\b/.test(normalized)) return "Sala 2";
  return "";
}

function consultaOcupaSala_(input) {
  const context = normalizarTextoConsultasSync_(
    [input && input.consultationType, input && input.location].join(" "),
  );

  return !/teleconsulta|online|videochamada/.test(context);
}

function duracaoConsultaMinutos_(value) {
  const duration = Number(value);
  if (Number.isFinite(duration)) {
    return Math.max(15, Math.min(480, Math.round(duration)));
  }

  return CONSULTAS_SYNC_CONFIG.defaultAppointmentDurationMinutes;
}

function intervaloConsultaAgenda_(dateValue, timeValue, durationValue) {
  const date = extrairDataConsultasSync_(dateValue);
  const time = extrairHorarioConsultasSync_(timeValue);
  if (!date || !time) return null;

  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  if (
    dateParts.length !== 3 ||
    timeParts.length !== 2 ||
    dateParts.some((part) => !Number.isInteger(part)) ||
    timeParts.some((part) => !Number.isInteger(part)) ||
    dateParts[1] < 1 ||
    dateParts[1] > 12 ||
    dateParts[2] < 1 ||
    dateParts[2] > 31 ||
    timeParts[0] < 0 ||
    timeParts[0] > 23 ||
    timeParts[1] < 0 ||
    timeParts[1] > 59
  ) {
    return null;
  }
  const start = new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0],
    timeParts[1],
    0,
    0,
  );

  if (
    Number.isNaN(start.getTime()) ||
    start.getFullYear() !== dateParts[0] ||
    start.getMonth() !== dateParts[1] - 1 ||
    start.getDate() !== dateParts[2] ||
    start.getHours() !== timeParts[0] ||
    start.getMinutes() !== timeParts[1]
  ) {
    return null;
  }

  const durationMinutes = duracaoConsultaMinutos_(durationValue);
  const end = new Date(
    start.getTime() + durationMinutes * 60 * 1000,
  );

  return { start, end, durationMinutes };
}

function salaEstaLivreConsulta_(
  room,
  start,
  end,
  ignoredEventId,
) {
  const calendarId = CONSULTAS_SYNC_CONFIG.roomCalendars[room];
  const calendar = CalendarApp.getCalendarById(calendarId);

  if (!calendar) {
    throw new Error("calendar_not_accessible_" + room.replace(/\s/g, "_"));
  }

  const events = calendar.getEvents(start, end);
  const ignored = textoConsultasSync_(ignoredEventId, 240);
  const conflict = events.some(function (event) {
    return !ignored || event.getId() !== ignored;
  });

  return {
    free: !conflict,
    calendar,
    calendarId,
  };
}

function escolherSalaDisponivelConsulta_(input) {
  if (!consultaOcupaSala_(input || {})) {
    return { ok: true, room: "", remote: true };
  }

  const interval = intervaloConsultaAgenda_(
    input && input.scheduledDate,
    input && input.scheduledTime,
    input && input.durationMinutes,
  );
  if (!interval) return { ok: false, error: "invalid_schedule" };

  const allowed = salasPermitidasProfissional_(
    input && input.professional,
  );
  if (!allowed.length) {
    return { ok: false, error: "professional_room_rule_missing" };
  }

  const preferred = normalizarSalaConsulta_(
    input && (input.room || input.preferredRoom),
  );
  const ordered = allowed.slice();
  if (preferred && allowed.includes(preferred)) {
    ordered.splice(ordered.indexOf(preferred), 1);
    ordered.unshift(preferred);
  }

  for (let index = 0; index < ordered.length; index += 1) {
    const room = ordered[index];
    const ignoredEventId =
      normalizarSalaConsulta_(input && input.currentRoom) === room
        ? input && input.calendarEventId
        : "";
    const availability = salaEstaLivreConsulta_(
      room,
      interval.start,
      interval.end,
      ignoredEventId,
    );

    if (!availability.free) continue;

    return {
      ok: true,
      room,
      calendar: availability.calendar,
      calendarId: availability.calendarId,
      start: interval.start,
      end: interval.end,
      durationMinutes: interval.durationMinutes,
    };
  }

  return { ok: false, error: "room_not_available" };
}

function prepararAutomacaoConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas nÃ£o foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);
  CONSULTAS_SYNC_CONFIG.leadSheetNames.forEach(function (sheetName) {
    const leadSheet = spreadsheet.getSheetByName(sheetName);
    if (leadSheet) garantirEstruturaAgendaVisivelLeads_(leadSheet);
  });

  return {
    ok: true,
    syncTriggerInstalled: existeGatilhoConsultas_(
      CONSULTAS_SYNC_CONFIG.syncTriggerFunction,
    ),
    postConsultTriggerInstalled: existeGatilhoConsultas_(
      CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
    ),
  };
}

function diagnosticarAgendaSalas() {
  const calendars = Object.keys(
    CONSULTAS_SYNC_CONFIG.roomCalendars,
  ).map(function (room) {
    const calendarId =
      CONSULTAS_SYNC_CONFIG.roomCalendars[room];
    const calendar = CalendarApp.getCalendarById(calendarId);

    return {
      room,
      calendarId,
      accessible: Boolean(calendar),
      calendarName: calendar ? calendar.getName() : "",
    };
  });

  return {
    ok: calendars.every(function (calendar) {
      return calendar.accessible;
    }),
    calendars,
    roomRules: {
      Amanda: salasPermitidasProfissional_("Dra. Amanda"),
      Henrique: salasPermitidasProfissional_("Dr. Henrique"),
      Marina: salasPermitidasProfissional_("Dra. Marina"),
      Laerte: salasPermitidasProfissional_("Dr. Laerte"),
      Daniel: salasPermitidasProfissional_("Dr. Daniel"),
    },
  };
}

function diagnosticarCabecalhosConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas nÃ£o foi encontrada.");
  }

  const headers = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getDisplayValues()[0];
  const diagnostic = headers.map(function (header, index) {
    return {
      column: index + 1,
      displayed: String(header || ""),
      normalized: normalizarCabecalhoConsultas_(header),
    };
  });

  console.log(JSON.stringify(diagnostic));
  return diagnostic;
}

function repararCabecalhosConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas nÃ£o foi encontrada.");
  }

  sheet.getRange("A1").setValue("ID da consulta");
  sheet.getRange("B1").setValue("Telefone (E.164)");
  sheet
    .getRange("AM1")
    .setValue("Agendamento monitorado");
  SpreadsheetApp.flush();

  return { ok: true, repaired: ["A1", "B1", "AM1"] };
}

function ativarAutomacaoConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas nÃ£o foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);
  removerGatilhosConsultas_(
    CONSULTAS_SYNC_CONFIG.syncTriggerFunction,
  );
  removerGatilhosConsultas_(
    CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
  );

  ScriptApp.newTrigger(
    CONSULTAS_SYNC_CONFIG.syncTriggerFunction,
  )
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  ScriptApp.newTrigger(
    CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
  )
    .timeBased()
    .everyMinutes(15)
    .create();

  return prepararAutomacaoConsultas();
}

function desativarAutomacaoConsultas() {
  removerGatilhosConsultas_(
    CONSULTAS_SYNC_CONFIG.syncTriggerFunction,
  );
  removerGatilhosConsultas_(
    CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
  );

  return { ok: true, active: false };
}

function ativarPosConsulta() {
  removerGatilhosConsultas_(
    CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
  );

  ScriptApp.newTrigger(
    CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
  )
    .timeBased()
    .everyMinutes(15)
    .create();

  return {
    ok: true,
    active: existeGatilhoConsultas_(
      CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
    ),
  };
}

function desativarPosConsulta() {
  removerGatilhosConsultas_(
    CONSULTAS_SYNC_CONFIG.postConsultTriggerFunction,
  );

  return { ok: true, active: false };
}

function existeGatilhoConsultas_(handler) {
  return ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === handler;
  });
}

function removerGatilhosConsultas_(handler) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function sincronizarConsultasAoEditar(e) {
  if (!e || !e.range) {
    return { ok: false, error: "missing_edit_event" };
  }

  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  if (
    typeof CENTRAL_ATENDIMENTO_CONFIG !== "undefined" &&
    sheetName === CENTRAL_ATENDIMENTO_CONFIG.sheetName &&
    typeof processarEdicaoCentralAtendimento_ === "function"
  ) {
    return processarEdicaoCentralAtendimento_(e);
  }

  if (
    sheetName ===
    CONSULTAS_SYNC_CONFIG.consultationsSheetName
  ) {
    return processarEdicaoNaAbaConsultas_(e);
  }

  if (
    !CONSULTAS_SYNC_CONFIG.leadSheetNames.includes(sheetName)
  ) {
    return { ok: true, ignored: true };
  }

  if (typeof normalizarNomeConversaoGoogleAdsAoEditar_ === "function") {
    normalizarNomeConversaoGoogleAdsAoEditar_(e);
  }

  return processarEdicaoNaAbaLeads_(e);
}

function processarEdicaoNaAbaLeads_(e) {
  const sheet = e.range.getSheet(ß]øÖÚ$z{-®éÜj×4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æö–çFÖVçEF–ÖRÀ¢W‡G&—$†÷&&–ô6öç7VÇF57–æ5ò†ö–çFÖVçBç66†VGVÆVEF–ÖR’À¢ÒÀ¢°¢4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æö–çFÖVçE&öfW76–öæÂÀ¢&öfW76–öæÂÀ¢ÒÀ¢°¢4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æö–çFÖVçE&ööÒÀ¢æ÷&ÖÆ—¦%6Æ6öç7VÇFò†ö–çFÖVçBç&ööÒ’À¢ÒÀ¢Ó° ¢fÇVW2æf÷$V6‚†gVæ7F–öâ†VçG'’’°¢–b†VçG'•³ÒÓÓÒ""’&WGW&ã°¢6†VW@¢ævWE&ævR‡&÷tçVÖ&W"Â6öÇVÖç5¶VçG'•³ÕÒ²¢ç6WEfÇVR†VçG'•³Ò“°¢Ò“°¢&WGW&âG'VS°§Ð ¦gVæ7F–öâGVÆ—¦%&W7VÖôæô6ö×&V6–ÖVçFôæôÆVEò€¢7&VG6†VWBÀ¢6öç7VÇFF–öå6†VWBÀ¢†öæUfÇVRÀ¢&öfW76–öæÂÀ¢÷÷'GVæ—G”–BÀ¢’°¢6öç7B†öæRÒæ÷&ÖÆ—¦%FVÆVföæT6öç7VÇF57–æ5ò‡†öæUfÇVR“°¢6öç7B&VfW'&VE6†VWBÒæöÖUÆæ–Æ†ÆVE&öf—76–öæÅò‡&öfW76–öæÂ“°¢–b‚†öæRÇÂ&VfW'&VE6†VWB’&WGW&âfÇ6S° ¢6öç7BÆVE6†VWBÒ7&VG6†VWBævWE6†VWD'”æÖR‡&VfW'&VE6†VWB“°¢–b‚ÆVE6†VWBÇÂÆVE6†VWBævWDÆ7E&÷r‚’Â"’&WGW&âfÇ6S° ¢6öç7B6öç7VÇFF–öä†VFW'2Ò6öç7VÇFF–öå6†VW@¢ævWE&ævRƒÂÂÂ6öç7VÇFF–öå6†VWBævWDÆ7D6öÇVÖâ‚’¢ævWDF—7Æ•fÇVW2‚•³Ó°¢6öç7B6öç7VÇFF–öä6öÇVÖç2ÒÖV$6&V6Æ†÷46öç7VÇF5ò€¢6öç7VÇFF–öä†VFW'2À¢“°¢6öç7B6÷VçBÒ6öçF$æô6ö×&V6–ÖVçF÷46öç7VÇFò€¢6öç7VÇFF–öå6†VWBÀ¢6öç7VÇFF–öä6öÇVÖç2À¢†öæRÀ¢&öfW76–öæÂÀ¢÷÷'GVæ—G”–BÀ¢“°¢6öç7B&÷w2Ò6öç7VÇFF–öå6†VWBævWDÆ7E&÷r‚’ãÒ ¢ò6öç7VÇFF–öå6†VW@¢ævWE&ævR€¢"À¢À¢6öç7VÇFF–öå6†VWBævWDÆ7E&÷r‚’ÒÀ¢6öç7VÇFF–öå6†VWBævWDÆ7D6öÇVÖâ‚’À¢¢ævWEfÇVW2‚¢¢µÓ°¢ÆWBÆFW7BÒçVÆÃ° ¢&÷w2æf÷$V6‚†gVæ7F–öâ‡&÷r’°¢–b€¢æ÷&ÖÆ—¦%FVÆVföæT6öç7VÇF57–æ5ò€¢&÷u¶6öç7VÇFF–öä6öÇVÖç5´4ôå5TÅD5õ5”ä5ô„TDU%2ç†öæUÕÒÀ¢’ÓÒ†öæRÇÀ¢6†fU&öf—76–öæÄ6öç7VÇFò€¢&÷u¶6öç7VÇFF–öä6öÇVÖç5´4ôå5TÅD5õ5”ä5ô„TDU%2ç&öfW76–öæÅÕÒÀ¢’ÓÒ6†fU&öf—76–öæÄ6öç7VÇFò‡&öfW76–öæÂ’ÇÀ¢†÷÷'GVæ—G”–Bbb7G&–ær€¢&÷u¶6öç7VÇFF–öä6öÇVÖç5´4ôå5TÅD5õ5”ä5ô„TDU%2æ÷÷'GVæ—G”–EÕÒÇÂ""À¢’ÓÒ7G&–ær†÷÷'GVæ—G”–B’’ÇÀ¢7FGW4æô6ö×&V6WT6öç7VÇFò€¢&÷u¶6öç7VÇFF–öä6öÇVÖç5´4ôå5TÅD5õ5”ä5ô„TDU%2ç7FGW5ÕÒÀ¢¢’°¢&WGW&ã°¢Ð ¢6öç7B6æF–FFRÐ¢FF6öç7VÇF57–æ5ò€¢&÷u¶6öç7VÇFF–öä6öÇVÖç5´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tEÕÒÀ¢’ÇÀ¢FF6öç7VÇF57–æ5ò€¢&÷u¶6öç7VÇFF–öä6öÇVÖç5´4ôå5TÅD5õ5”ä5ô„TDU%2ç66†VGVÆVDFFUÕÒÀ¢“°¢–b†6æF–FFRbb‚ÆFW7BÇÂ6æF–FFRævWEF–ÖR‚’âÆFW7BævWEF–ÖR‚’’’°¢ÆFW7BÒ6æF–FFS°¢Ð¢Ò“° ¢6öç7B6öÇVÖç2Òv&çF—$W7G'WGW&vVæFf—6—fVÄÆVG5ò†ÆVE6†VWB“°¢6öç7BÆVE&W7VÇBÒG—Vöb&W6öÇfW$Æ–æ†ÆVD6æöæ–6òÓÓÒ&gVæ7F–öâ ¢ò&W6öÇfW$Æ–æ†ÆVD6æöæ–6ò†ÆVE6†VWBÂ÷÷'GVæ—G”–BÂ†öæR¢¢²ö³¢fÇ6RÂ&V6öã¢&6æöæ–6ÅöÆVE÷&W6öÇfW%÷Væf–Æ&ÆR"Ó°¢–b‚ÆVE&W7VÇBæö²’&WGW&âfÇ6S°¢6öç7B&÷tçVÖ&W"ÒÆVE&W7VÇBç&÷s°¢ÆVE6†VW@¢ævWE&ævR€¢&÷tçVÖ&W"À¢6öÇVÖç5´4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æö–çFÖVçD÷WF6öÖUÒ²À¢¢ç6WEfÇVR‚$ì:6ò6ö×&V6WR"“°¢ÆVE6†VW@¢ævWE&ævR€¢&÷tçVÖ&W"À¢6öÇVÖç5´4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2ææõ6†÷t6÷VçEÒ²À¢¢ç6WEfÇVR†6÷VçB“°¢–b†ÆFW7B’°¢ÆVE6†VW@¢ævWE&ævR€¢&÷tçVÖ&W"À¢6öÇVÖç5´4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æÆ7Dæõ6†÷tEÒ²À¢¢ç6WEfÇVR†ÆFW7B“°¢Ð¢&WGW&âG'VS°§Ð ¦gVæ7F–öâv&çF—$W7G'WGW&6–æ7&öæ—¦6ô6öç7VÇF5ò‡6†VWB’°¢6öç7BÆ7D6öÇVÖâÒÖF‚æÖ‚‡6†VWBævWDÆ7D6öÇVÖâ‚’Â“°¢6öç7B†VFW'2Ò6†VW@¢ævWE&ævRƒÂÂÂÆ7D6öÇVÖâ¢ævWDF—7Æ•fÇVW2‚•³Ð¢æÖ†gVæ7F–öâ‡fÇVR’°¢&WGW&â7G&–ær‡fÇVRÇÂ""’çG&–Ò‚“°¢Ò“°¢6öç7B6öÇVÖç2ÒÖV$6&V6Æ†÷46öç7VÇF5ò††VFW'2“°¢6öç7B&WV—&VDW†—7F–ærÒ°¢4ôå5TÅD5õ5”ä5ô„TDU%2æ–BÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç†öæRÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç&öfW76–öæÂÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç7FGW2À¢Ó° ¢&WV—&VDW†—7F–æræf÷$V6‚†gVæ7F–öâ††VFW"’°¢–b†6öÇVÖç5¶†VFW%ÒÓÓÒVæFVf–æVB’°¢F‡&÷ræWrW'&÷"€¢6öÇVæö'&–vL;7&–W6VçFRVÒ6öç7VÇF3¢G¶†VFW'ÖÀ¢“°¢Ð¢Ò“° ¢°¢4ôå5TÅD5õ5”ä5ô„TDU%2æ÷÷'GVæ—G”–BÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç&ööÒÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2æGW&F–öäÖ–çWFW2À¢4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF$–BÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF$WfVçD–BÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF%7–æ57FGW2À¢4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF%7–æ4W'&÷"À¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tVÆ–v–&ÆTBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷u6VçDBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tÆ7DGFV×BÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tÆ7DW'&÷"À¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷u7W&W76VDBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tÖçVÄBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7DVÆ–v–&ÆTBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7E6VçDBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7DÆ7DGFV×BÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7DÆ7DW'&÷"À¢4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7E7W&W76VDBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2çF–VçD6öæf—&ÖVDBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2æÆ7D‡VÖä–çFW&7F–öäBÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ææW‡D7F–öâÀ¢4ôå5TÅD5õ5”ä5ô„TDU%2ç7W&W76–öå&V6öâÀ¢Òæf÷$V6‚†gVæ7F–öâ††VFW"’°¢–b†6öÇVÖç5¶†VFW%ÒÓÓÒVæFVf–æVB’°¢–b€¢G—Vöb6†VWBævWDÖ„6öÇVÖç2ÓÓÒ&gVæ7F–öâ"b`¢G—Vöb6†VWBæ–ç6W'D6öÇVÖç4gFW"ÓÓÒ&gVæ7F–öâ"b`¢†VFW'2æÆVæwF‚ãÒ6†VWBævWDÖ„6öÇVÖç2‚¢’°¢6†VWBæ–ç6W'D6öÇVÖç4gFW"‡6†VWBævWDÖ„6öÇVÖç2‚’Â“°¢Ð¢†VFW'2çW6‚††VFW"“°¢6†VWBævWE&ævRƒÂ†VFW'2æÆVæwF‚’ç6WEfÇVR††VFW"“°¢6öÇVÖç5¶†VFW%ÒÒ†VFW'2æÆVæwF‚Ò°¢Ð¢Ò“° ¢6öç7B6öçG&öÅv–GF‡2Ò°¢´4ôå5TÅD5õ5”ä5ô„TDU%2æ÷÷'GVæ—G”–EÓ¢“À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç&ööÕÓ¢“À¢´4ôå5TÅD5õ5”ä5ô„TDU%2æGW&F–öäÖ–çWFW5Ó¢RÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF$–EÓ¢#À¢´4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF$WfVçD–EÓ¢#À¢´4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF%7–æ57FGW5Ó¢#À¢´4ôå5TÅD5õ5”ä5ô„TDU%2æ6ÆVæF%7–æ4W'&÷%Ó¢##À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tEÓ¢“À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tVÆ–v–&ÆTEÓ¢#À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷u6VçDEÓ¢“À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tÆ7DGFV×EÓ¢##À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tÆ7DW'&÷%Ó¢#À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷u7W&W76VDEÓ¢#À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææõ6†÷tÖçVÄEÓ¢#3À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7DVÆ–v–&ÆTEÓ¢sÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7E6VçDEÓ¢SRÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7DÆ7DGFV×EÓ¢“RÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7DÆ7DW'&÷%Ó¢ƒÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç÷7E7W&W76VDEÓ¢ƒÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2çF–VçD6öæf—&ÖVDEÓ¢sÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2æÆ7D‡VÖä–çFW&7F–öäEÓ¢ƒÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææW‡D7F–öåÓ¢##À¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç7W&W76–öå&V6öåÓ¢#cÀ¢Ó° ¢ö&¦V7Bæ¶W—2†6öçG&öÅv–GF‡2’æf÷$V6‚†gVæ7F–öâ††VFW"’°¢6öç7B6öÇVÖâÒ6öÇVÖç5¶†VFW%Ó°¢–b†6öÇVÖâÓÒVæFVf–æVB’°¢6†VWBç6WD6öÇVÖåv–GF‚€¢6öÇVÖâ²À¢6öçG&öÅv–GF‡5¶†VFW%ÒÀ¢“°¢Ð¢Ò“°§Ð ¦gVæ7F–öâÖV$6&V6Æ†÷46öç7VÇF5ò††VFW'2’°¢6öç7B&W7VÇBÒ·Ó°¢6öç7Bæ÷&ÖÆ—¦VD–æFW†W2Ò·Ó° ¢†VFW'2æf÷$V6‚†gVæ7F–öâ‡fÇVRÂ–æFW‚’°¢6öç7B†VFW"Ò7G&–ær‡fÇVRÇÂ""’çG&–Ò‚“°¢–b††VFW"bb&W7VÇE¶†VFW%ÒÓÓÒVæFVf–æVB’°¢&W7VÇE¶†VFW%ÒÒ–æFWƒ°¢Ð¢6öç7Bæ÷&ÖÆ—¦VBÒæ÷&ÖÆ—¦$6&V6Æ†ô6öç7VÇF5ò††VFW"“°¢–b€¢æ÷&ÖÆ—¦VBb`¢æ÷&ÖÆ—¦VD–æFW†W5¶æ÷&ÖÆ—¦VEÒÓÓÒVæFVf–æV@¢’°¢æ÷&ÖÆ—¦VD–æFW†W5¶æ÷&ÖÆ—¦VEÒÒ–æFWƒ°¢Ð¢Ò“° ¢°¢ââäö&¦V7BçfÇVW2„4ôå5TÅD5õ5”ä5ô„TDU%2’À¢ââäö&¦V7BçfÇVW2„4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2’À¢Òæf÷$V6‚†gVæ7F–öâ†6æöæ–6Ä†VFW"’°¢–b‡&W7VÇE¶6æöæ–6Ä†VFW%ÒÓÒVæFVf–æVB’&WGW&ã° ¢6öç7Bæ÷&ÖÆ—¦VBÒæ÷&ÖÆ—¦$6&V6Æ†ô6öç7VÇF5ò€¢6æöæ–6Ä†VFW"À¢“°¢6öç7B–æFW‚Òæ÷&ÖÆ—¦VD–æFW†W5¶æ÷&ÖÆ—¦VEÓ° ¢–b†–æFW‚ÓÒVæFVf–æVB’°¢&W7VÇE¶6æöæ–6Ä†VFW%ÒÒ–æFWƒ°¢Ð¢Ò“° ¢6öç7BÆ–6W2Ò°¢´4ôå5TÅD5õ5”ä5ô„TDU%2ç6÷W&6UÓ¢°¢&÷&–vVÒFòÆVB"À¢&föçFRF6–æ7&öæ—¦6ò"À¢ÒÀ¢´4ôå5TÅD5õ5”ä5ô„TDU%2ææ÷FW5Ó¢°¢'&W7VÖòFÖ–æ—7G&F—fò"À¢ÒÀ¢Ó° ¢ö&¦V7Bæ¶W—2†Æ–6W2’æf÷$V6‚†gVæ7F–öâ†6æöæ–6Ä†VFW"’°¢–b‡&W7VÇE¶6æöæ–6Ä†VFW%ÒÓÒVæFVf–æVB’&WGW&ã° ¢f÷"†ÆWB–æFW‚Ò²–æFW‚ÂÆ–6W5¶6æöæ–6Ä†VFW%ÒæÆVæwFƒ²–æFW‚³Ò’°¢6öç7BÆ–2ÒÆ–6W5¶6æöæ–6Ä†VFW%Õ¶–æFW…Ó°¢–b†æ÷&ÖÆ—¦VD–æFW†W5¶Æ–5ÒÓÒVæFVf–æVB’°¢&W7VÇE¶6æöæ–6Ä†VFW%ÒÐ¢æ÷&ÖÆ—¦VD–æFW†W5¶Æ–5Ó°¢'&V³°¢Ð¢Ð¢Ò“° ¢&WGW&â&W7VÇC°§Ð ¦gVæ7F–öâæ÷&ÖÆ—¦$6&V6Æ†ô6öç7VÇF5ò‡fÇVR’°¢&WGW&â6÷'&–v—$Öö¦–&¶T6&V6Æ†ô6öç7VÇF5ò‡fÇVR¢ææ÷&ÖÆ—¦R‚$ädB"¢ç&WÆ6R‚õµÇS3ÕÇS3feÒörÂ""¢ç&WÆ6R‚õµæ×¤Õ£Ó•Ò²örÂ""¢çG&–Ò‚¢çFôÆ÷vW$66R‚“°§Ð ¦gVæ7F–öâ6÷'&–v—$Öö¦–&¶T6&V6Æ†ô6öç7VÇF5ò‡fÇVR’°¢&WGW&â7G&–ær‡fÇVRÇÂ""¢ç&WÆ6R‚ü8<*örÂ,:"¢ç&WÆ6R‚ü8<*"örÂ,:""¢ç&WÆ6R‚ü8<*2örÂ,:2"¢ç&WÆ6R‚ü8<*’örÂ,:’"¢ç&WÆ6R‚ü8<*¢örÂ,:¢"¢ç&WÆ6R‚ü8<*ÒörÂ,:Ò"¢ç&WÆ6R‚ü8<+2örÂ,;2"¢ç&WÆ6R‚ü8<+BörÂ,;B"¢ç&WÆ6R‚ü8<+RörÂ,;R"¢ç&WÆ6R‚ü8<+¢örÂ,;¢"¢ç&WÆ6R‚ü8<*rörÂ,:r"¢ç&WÆ6R‚ü8"örÂ""“°§Ð ¦gVæ7F–öâFVf–æ—%fÆ÷$6öç7VÇFò€¢6†VWBÀ¢&÷rÀ¢6öÇVÖç2À¢†VFW"À¢fÇVRÀ¢’°¢6öç7B6öÇVÖâÒ6öÇVÖç5¶†VFW%Ó°¢–b†6öÇVÖâÓÓÒVæFVf–æVB’&WGW&ã°¢6öç7B6fUfÇVRÐ¢†VFW"ÓÓÒ4ôå5TÅD5õ5”ä5ô„TDU%2ç7FGW0¢ò7FGW46æöæ–6ô6öç7VÇF5ò‡fÇVR¢¢fÇVS°¢6†VWBævWE&ævR‡&÷rÂ6öÇVÖâ²’ç6WEfÇVR‡6fUfÇVR“°§Ð ¦gVæ7F–öâ7FGW46æöæ–6ô6öç7VÇF5ò‡fÇVR’°¢6öç7Bæ÷&ÖÆ—¦VBÒæ÷&ÖÆ—¦%FW‡Fô6öç7VÇF57–æ5ò‡fÇVR“°¢6öç7B7FGW6W2Ò°¢&wV&FæFò6öæf—&Ö6ò#¢$wV&FæFò6öæf—&Ö:|:6ò"À¢vVæFF¢$vVæFF"À¢&6öç7VÇFvVæFF#¢$vVæFF"À¢6öæf—&ÖF¢$6öæf—&ÖF"À¢&6öç7VÇF6öæf—&ÖF#¢$6öæf—&ÖF"À¢&VÆ—¦F¢%&VÆ—¦F"À¢&6öç7VÇF&VÆ—¦F#¢%&VÆ—¦F"À¢&VÖ&6F¢%&VÖ&6F"À¢'&VvVæFÖVçFò6öÆ–6—FFò#¢%&VÖ&6F"À¢6æ6VÆF¢$6æ6VÆF"À¢&æò6ö×&V6WR#¢$ì:6ò6ö×&V6WR"À¢Ó° ¢&WGW&â7FGW6W5¶æ÷&ÖÆ—¦VEÒÇÂfÇVS°§Ð ¦gVæ7F–öâfÆ÷$FÆ–æ†6öç7VÇF5ò‡&÷rÂ6öÇVÖç2Â†VFW"’°¢6öç7B6öÇVÖâÒ6öÇVÖç5¶†VFW%Ó°¢&WGW&â6öÇVÖâÓÓÒVæFVf–æVBò""¢&÷u¶6öÇVÖåÓ°§Ð ¦gVæ7F–öâÖöçF$ö'6W'f6ôÆVD6öç7VÇF5ò€¢&÷rÀ¢6öÇVÖç2À¢6†VWDæÖRÀ¢’°¢6öç7BFWF–Ç2Ò°¢÷&–vVÓ¢G·6†VWDæÖWÖÀ¢fÆ÷$FÆ–æ†6öç7VÇF5ò€¢&÷rÀ¢6öÇVÖç2À¢4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2ç&VfW&Væ6RÀ¢’À¢fÆ÷$FÆ–æ†6öç7VÇF5ò€¢&÷rÀ¢6öÇVÖç2À¢4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2çÆFf÷&ÒÀ¢’À¢fÆ÷$FÆ–æ†6öç7VÇF5ò€¢&÷rÀ¢6öÇVÖç2À¢4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æ6×–vâÀ¢’À¢fÆ÷$FÆ–æ†6öç7VÇF5ò€¢&÷rÀ¢6öÇVÖç2À¢4ôå5TÅD5õ5”ä5ôÄTEô„TDU%2æ7&VF—fRÀ¢’À¢Ð¢æÖ†gVæ7F–öâ‡fÇVR’°¢&WGW&â7G&–ær‡fÇVRÇÂ""’çG&–Ò‚“°¢Ò¢æf–ÇFW"„&ööÆVâ“° ¢&WGW&âFWF–Ç2æ¦ö–â‚"Â"’ç6Æ–6RƒÂS“°§Ð ¦gVæ7F–öâ6öç7G'V—$–D6öç7VÇFò‡†öæRÂ–çWBÂ&÷rÂæ÷r’°¢6öç7BFFRÐ¢W‡G&—$FF6öç7VÇF57–æ5ò†–çWBç66†VGVÆVDFFR’ÇÀ¢WF–Æ—F–W2æf÷&ÖDFFR€¢æ÷rÀ¢4ôå5TÅD5õ5”ä5ô4ôäd”rçF–ÖW¦öæRÀ¢'———”ÔÖFB"À¢“°¢6öç7BF–ÖRÐ¢W‡G&—$†÷&&–ô6öç7VÇF57–æ5ò†–çWBç66†VGVÆVEF–ÖR’ÇÀ¢7G&–ær‡&÷r“° ¢&WGW&â€¢&6öç7VÇFÒ"°¢†öæRç&WÆ6R‚õÄBörÂ""’°¢"Ò"°¢FFRç&WÆ6R‚õÄBörÂ""’°¢"Ò"°¢F–ÖRç&WÆ6R‚õÄBörÂ""¢’ç6Æ–6RƒÂƒ“°§Ð ¦gVæ7F–öâÖW6ÖFF6öç7VÇFò†ÆVgBÂ&–v‡B’°¢&WGW&â€¢W‡G&—$FF6öç7VÇF57–æ5ò†ÆVgB’b`¢W‡G&—$FF6öç7VÇF57–æ5ò†ÆVgB’ÓÓÐ¢W‡G&—$FF6öç7VÇF57–æ5ò‡&–v‡B¢“°§Ð ¦gVæ7F–öâÖW6Öô†÷&&–ô6öç7VÇFò†ÆVgBÂ&–v‡B’°¢&WGW&â€¢W‡G&—$†÷&&–ô6öç7VÇF57–æ5ò†ÆVgB’b`¢W‡G&—$†÷&&–ô6öç7VÇF57–æ5ò†ÆVgB’ÓÓÐ¢W‡G&—$†÷&&–ô6öç7VÇF57–æ5ò‡&–v‡B¢“°§Ð ¦gVæ7F–öâW‡G&—$FF6öç7VÇF57–æ5ò‡fÇVR’°¢–b‡fÇVR–ç7Fæ6VöbFFRbbçVÖ&W"æ—4æâ‡fÇVRævWEF–ÖR‚’’’°¢&WGW&âWF–Æ—F–W2æf÷&ÖDFFR€¢fÇVRÀ¢4ôå5TÅD5õ5”ä5ô4ôäd”rçF–ÖW¦öæRÀ¢'———’ÔÔÒÖFB"À¢“°¢Ð ¢6öç7BFW‡BÒ7G&–ær‡fÇVRÇÂ""’çG&–Ò‚“°¢ÆWBÖF6‚ÒFW‡BæÖF6‚‚õâ…ÆG³GÒ’Ò…ÆG³'Ò’Ò…ÆG³'Ò’ò“°¢–b†ÖF6‚’&WGW&âG¶ÖF6…³×ÒÒG¶ÖF6…³%×ÒÒG¶ÖF6…³5×Ö° ¢ÖF6‚ÒFW‡BæÖF6‚‚õâ…ÆG³Ã'Ò•Âò…ÆG³Ã'Ò•Âò…ÆG³GÒ’ò“°¢–b‚ÖF6‚’&WGW&â"#° ¢&WGW&â°¢ÖF6…³5ÒÀ¢7G&–ær†ÖF6…³%Ò’çE7F'Bƒ"Â#"’À¢7G&–ær†ÖF6…³Ò’çE7F'Bƒ"Â#"’À¢Òæ¦ö–â‚"Ò"“°§Ð ¦gVæ7F–öâW‡G&—$†÷&&–ô6öç7VÇF57–æ5ò‡fÇVR’°¢–b‡fÇVR–ç7Fæ6VöbFFRbbçVÖ&W"æ—4æâ‡fÇVRævWEF–ÖR‚’’’°¢&WGW&âWF–Æ—F–W2æf÷&ÖDFFR€¢fÇVRÀ¢4ôå5TÅD5õ5”ä5ô4ôäd”rçF–ÖW¦öæRÀ¢$„ƒ¦ÖÒ"À¢“°¢Ð ¢6öç7BÖF6‚Ò7G&–ær‡fÇVRÇÂ""¢çG&–Ò‚¢æÖF6‚‚õâ…ÆG³Ã'Ò“¢…ÆG³'Ò’ò“° ¢–b‚ÖF6‚’&WGW&â"#° ¢&WGW&â€¢7G&–ær„çVÖ&W"†ÖF6…³Ò’’çE7F'Bƒ"Â#"’°¢#¢"°¢ÖF6…³%Ð¢“°§Ð ¦gVæ7F–öâFF6öç7VÇF57–æ5ò‡fÇVR’°¢–b‡fÇVR–ç7Fæ6VöbFFRbbçVÖ&W"æ—4æâ‡fÇVRævWEF–ÖR‚’’’°¢&WGW&âfÇVS°¢Ð ¢6öç7BFFRÒæWrFFR‡fÇVR“°¢&WGW&âçVÖ&W"æ—4æâ†FFRævWEF–ÖR‚’’òçVÆÂ¢FFS°§Ð ¦gVæ7F–öâæ÷&ÖÆ—¦%FVÆVföæT6öç7VÇF57–æ5ò‡fÇVR’°¢6öç7BF–v—G2Ò7G&–ær‡fÇVRÇÂ""’ç&WÆ6R‚õÄBörÂ""“°¢&WGW&âF–v—G2æÆVæwF‚ãÒbbF–v—G2æÆVæwF‚ÃÒP¢ò²G¶F–v—G7Ö ¢¢"#°§Ð ¦gVæ7F–öâFW‡Fô6öç7VÇF57–æ5ò‡fÇVRÂÖ†–×VÔÆVæwF‚’°¢&WGW&â7G&–ær‡fÇVRÇÂ""¢çG&–Ò‚¢ç6Æ–6RƒÂÖ†–×VÔÆVæwF‚“°§Ð ¦gVæ7F–öâ÷÷'GVæ—G”–EfÆ–Fô6öç7VÇFò‡fÇVR’°¢6öç7B÷÷'GVæ—G”–BÒ7G&–ær‡fÇVRÇÂ""’çG&–Ò‚“°¢&WGW&â€¢÷÷'GVæ—G”–BæÆVæwF‚âb`¢÷÷'GVæ—G”–BæÆVæwF‚ÃÒƒb`¢õå´Õ¦×£Ó•Õ´Õ¦×£Ó’åó¢ÕÒ¢BòçFW7B†÷÷'GVæ—G”–B¢“°§Ð ¦gVæ7F–öâæ÷&ÖÆ—¦%FW‡Fô6öç7VÇF57–æ5ò‡fÇVR’°¢&WGW&â7G&–ær‡fÇVRÇÂ""¢ææ÷&ÖÆ—¦R‚$ädB"¢ç&WÆ6R‚õµÇS3ÕÇS3feÒörÂ""¢çG&–Ò‚¢çFôÆ÷vW$66R‚“°§Ð ¦gVæ7F–öâ7FGW4vVæF6öç7VÇFò‡7FGW2’°¢&WGW&â°¢&vVæFF"À¢&6öæf—&ÖF"À¢&6öç7VÇFvVæFF"À¢&6öç7VÇF6öæf—&ÖF"À¢'&VÆ—¦F"À¢&6öç7VÇF&VÆ—¦F"À¢Òæ–æ6ÇVFW2‡7FGW2“°§Ð ¦gVæ7F–öâ7FGW46öç7VÇF&VÆ—¦Fò‡7FGW2’°¢&WGW&â²'&VÆ—¦F"Â&6öç7VÇF&VÆ—¦F%Òæ–æ6ÇVFW2‡7FGW2“°§Ð ¦gVæ7F–öâ6öç6VçF–ÖVçFõW&Ö—FT6öçFFô6öç7VÇF5ò‡fÇVRÂ6÷W&6R’°¢6öç7Bæ÷&ÖÆ—¦VEfÇVRÒæ÷&ÖÆ—¦%FW‡Fô6öç7VÇF57–æ5ò‡fÇVR“°¢6öç7Bæ÷&ÖÆ—¦VE6÷W&6RÒæ÷&ÖÆ—¦%FW‡Fô6öç7VÇF57–æ5ò‡6÷W&6R“°¢6öç7BW‡Æ–6—DæVvF—fRÒ°¢&æò"À¢&æòWF÷&—¦Fò"À¢'6VÒ6öç6VçF–ÖVçFò"À¢&fÇ6R"À¢&fÇ6ò"À¢#"À¢Ó°¢6öç7BW‡Æ–6—E÷6—F—fRÒ°¢'6–Ò"À¢&WF÷&—¦Fò"À¢&WF÷&—¦F"À¢'W&Ö—F–Fò"À¢'W&Ö—F–F"À¢'G'VR"À¢'fW&FFV—&ò"À¢#"À¢Ó° ¢–b†W‡Æ–6—DæVvF—fRæ–æ6ÇVFW2†æ÷&ÖÆ—¦VEfÇVR’’&WGW&âfÇ6S°¢–b†W‡Æ–6—E÷6—F—fRæ–æ6ÇVFW2†æ÷&ÖÆ—¦VEfÇVR’’&WGW&âG'VS° ¢&WGW&â€¢æ÷&ÖÆ—¦VE6÷W&6Ræ–æ6ÇVFW2‚'&öçGV&–ò"’b`¢æ÷&ÖÆ—¦VE6÷W&6Ræ–æ6ÇVFW2‚&vöövÆRG&—fR"¢“°§Ð ¦gVæ7F–öâW7Fæô†÷&&–ô6öç7VÇF57–æ5ò†FFR’°¢6öç7B†÷W"ÒçVÖ&W"€¢WF–Æ—F–W2æf÷&ÖDFFR€¢FFRÀ¢4ôå5TÅD5õ5”ä5ô4ôäd”rçF–ÖW¦öæRÀ¢$‚"À¢’À¢“° ¢&WGW&â€¢†÷W"ãÒ4ôå5TÅD5õ5”ä5ô4ôäd”rç7F'D†÷W"b`¢†÷W"Â4ôå5TÅD5õ5”ä5ô4ôäd”ræVæD†÷W ¢“°§Ð