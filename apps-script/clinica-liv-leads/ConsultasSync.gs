const CONSULTAS_SYNC_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  consultationsSheetName: "Consultas",
  leadSheetNames: Object.freeze([
    "Google Ads - Conversões",
    "Leads Dr. Daniel",
  ]),
  timezone: "America/Sao_Paulo",
  startHour: 9,
  endHour: 19,
  postConsultDelayMinutes: 180,
  postConsultRetryMinutes: 30,
  postConsultDisabledRetryMinutes: 360,
  postConsultEndpoint:
    "https://draamandaschroeder.com.br/.netlify/functions/post-consult-followup",
  secretProperty: "LEADS_INGEST_SECRET",
  postConsultEndpointProperty: "POS_CONSULTA_ENDPOINT",
  syncTriggerFunction: "sincronizarConsultasAoEditar",
  postConsultTriggerFunction: "processarPosConsulta",
});

const CONSULTAS_SYNC_HEADERS = Object.freeze({
  id: "ID da consulta",
  phone: "Telefone (E.164)",
  name: "Nome do paciente",
  professional: "Profissional",
  consultationType: "Tipo de consulta",
  topic: "Tema / procedimento",
  location: "Local / modalidade",
  scheduledDate: "Data agendada",
  scheduledTime: "Horário agendado",
  status: "Status",
  completedDate: "Data realizada",
  consent: "Consentimento para contato",
  source: "Origem do registro",
  notes: "Observações administrativas",
  postEligibleAt: "Pós-consulta elegível em",
  postSentAt: "Pós-consulta enviado",
  postLastAttempt: "Última tentativa pós-consulta",
  postLastError: "Erro pós-consulta",
  postSuppressedAt: "Pós-consulta suprimido em",
  patientConfirmedAt: "Confirmação da paciente",
  lastHumanInteractionAt: "Última interação humana",
  nextAction: "Próxima ação",
  suppressionReason: "Motivo de supressão",
});

const CONSULTAS_SYNC_LEAD_HEADERS = Object.freeze({
  phone: "Telefone (E.164)",
  status: "Situação do lead",
  statusDate: "Data da situação",
  reference: "Referência da campanha",
  platform: "Plataforma de aquisição",
  campaign: "Campanha",
  creative: "Criativo",
  notes: "Observação administrativa",
});

function prepararAutomacaoConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);

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

function diagnosticarCabecalhosConsultas() {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
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
    throw new Error("A aba Consultas não foi encontrada.");
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
    throw new Error("A aba Consultas não foi encontrada.");
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

  return processarEdicaoNaAbaLeads_(e);
}

function processarEdicaoNaAbaLeads_(e) {
  const sheet = e.range.getSheet();
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const statusColumn = columns[
    CONSULTAS_SYNC_LEAD_HEADERS.status
  ];

  if (
    statusColumn === undefined ||
    e.range.getRow() < 2 ||
    statusColumn + 1 < e.range.getColumn() ||
    statusColumn + 1 >
      e.range.getLastColumn()
  ) {
    return { ok: true, ignored: true };
  }

  const spreadsheet = sheet.getParent();
  const consultationSheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!consultationSheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(consultationSheet);

  const professional =
    sheet.getName() === "Leads Dr. Daniel"
      ? "Dr. Daniel"
      : "Dra. Amanda";
  let synced = 0;

  for (
    let rowNumber = Math.max(2, e.range.getRow());
    rowNumber <= e.range.getLastRow();
    rowNumber += 1
  ) {
    const row = sheet
      .getRange(rowNumber, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const status = normalizarTextoConsultasSync_(
      row[statusColumn],
    );

    if (!statusAgendaConsulta_(status)) continue;

    const completed = statusConsultaRealizada_(status);
    const now = new Date();
    const result = upsertConsulta_(consultationSheet, {
      appointmentId:
        "lead-" +
        normalizarTelefoneConsultasSync_(
          valorDaLinhaConsultas_(
            row,
            columns,
            CONSULTAS_SYNC_LEAD_HEADERS.phone,
          ),
        ).replace(/\D/g, "") +
        "-" +
        rowNumber,
      phone: valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_LEAD_HEADERS.phone,
      ),
      professional,
      status: completed
        ? "Consulta realizada"
        : "Consulta agendada",
      completedAt: completed ? now : "",
      source: "Sincronização manual da aba de leads",
      notes: montarObservacaoLeadConsultas_(
        row,
        columns,
        sheet.getName(),
      ),
      queuePostConsult: completed,
      now,
    });

    if (result.ok) synced += 1;
  }

  return { ok: true, synced };
}

function processarEdicaoNaAbaConsultas_(e) {
  const sheet = e.range.getSheet();
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const statusColumn =
    columns[CONSULTAS_SYNC_HEADERS.status];

  if (
    statusColumn === undefined ||
    e.range.getRow() < 2 ||
    statusColumn + 1 < e.range.getColumn() ||
    statusColumn + 1 >
      e.range.getLastColumn()
  ) {
    return { ok: true, ignored: true };
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);
  const refreshedHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const refreshedColumns =
    mapearCabecalhosConsultas_(refreshedHeaders);
  let queued = 0;

  for (
    let rowNumber = Math.max(2, e.range.getRow());
    rowNumber <= e.range.getLastRow();
    rowNumber += 1
  ) {
    const row = sheet
      .getRange(
        rowNumber,
        1,
        1,
        sheet.getLastColumn(),
      )
      .getValues()[0];
    const status = normalizarTextoConsultasSync_(
      row[refreshedColumns[CONSULTAS_SYNC_HEADERS.status]],
    );

    if (!statusConsultaRealizada_(status)) continue;

    prepararPosConsultaNaLinha_(
      sheet,
      rowNumber,
      refreshedColumns,
      row,
      new Date(),
    );
    queued += 1;
  }

  return { ok: true, queued };
}

function upsertConsultaRecebida_(input) {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);

  const result = upsertConsulta_(sheet, {
    appointmentId: input.appointmentId || input.eventId,
    phone: input.phone,
    name: input.name,
    professional: input.professional || "Dra. Amanda",
    consultationType: input.consultationType,
    topic: input.topic,
    location:
      input.location || "Clínica LIV Faria Lima",
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    status: input.status || "Consulta agendada",
    source:
      input.source ||
      "WhatsApp — confirmação de agendamento detectada",
    notes: input.notes,
    now: new Date(),
  });

  atualizarStatusLeadDaConsulta_(
    spreadsheet,
    input.phone,
    input.professional,
    input.status || "Consulta agendada",
  );

  return result;
}

function obterRelacionamentoPaciente_(input) {
  const phone = normalizarTelefoneConsultasSync_(
    input.phone,
  );

  if (!phone) {
    return relacionamentoPacienteDesconhecido_();
  }

  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return relacionamentoPacienteDesconhecido_();
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const values = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn(),
    )
    .getValues();
  let best = null;

  values.forEach(function (row, index) {
    const rowPhone = normalizarTelefoneConsultasSync_(
      valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.phone,
      ),
    );

    if (!rowPhone || rowPhone !== phone) return;

    const completedAt = dataConsultasSync_(
      valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.completedDate,
      ),
    );
    const scheduledAt = dataConsultasSync_(
      valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.scheduledDate,
      ),
    );
    const lastHumanAt = dataConsultasSync_(
      valorDaLinhaConsultas_(
        row,
        columns,
        CONSULTAS_SYNC_HEADERS.lastHumanInteractionAt,
      ),
    );
    const timestamp = Math.max(
      completedAt ? completedAt.getTime() : 0,
      scheduledAt ? scheduledAt.getTime() : 0,
      lastHumanAt ? lastHumanAt.getTime() : 0,
      index + 1,
    );

    if (!best || timestamp >= best.timestamp) {
      best = {
        row: row,
        timestamp: timestamp,
        completedAt: completedAt,
        scheduledAt: scheduledAt,
      };
    }
  });

  if (!best) {
    return relacionamentoPacienteDesconhecido_();
  }

  const status = normalizarTextoConsultasSync_(
    valorDaLinhaConsultas_(
      best.row,
      columns,
      CONSULTAS_SYNC_HEADERS.status,
    ),
  );
  const nextAction = textoConsultasSync_(
    valorDaLinhaConsultas_(
      best.row,
      columns,
      CONSULTAS_SYNC_HEADERS.nextAction,
    ),
    220,
  );
  const context = normalizarTextoConsultasSync_(
    [status, nextAction].join(" "),
  );
  const state = classificarEstadoRelacionamentoPaciente_({
    status: status,
    context: context,
    completedAt: best.completedAt,
    scheduledAt: best.scheduledAt,
    now: new Date(),
  });
  const pendingTaskType =
    classificarPendenciaRelacionamentoPaciente_(context);
  const normalizedNextAction =
    normalizarTextoConsultasSync_(nextAction);
  const hasPendingHumanTask =
    Boolean(normalizedNextAction) &&
    !/^(?:nenhuma|nenhum|sem pendencia|concluida|concluido|encerrada|encerrado)$/.test(
      normalizedNextAction,
    );

  return {
    found: true,
    relationshipState: state,
    patientName: textoConsultasSync_(
      valorDaLinhaConsultas_(
        best.row,
        columns,
        CONSULTAS_SYNC_HEADERS.name,
      ),
      120,
    ),
    professional: textoConsultasSync_(
      valorDaLinhaConsultas_(
        best.row,
        columns,
        CONSULTAS_SYNC_HEADERS.professional,
      ),
      80,
    ),
    hasPendingHumanTask: hasPendingHumanTask,
    pendingTaskType: hasPendingHumanTask
      ? pendingTaskType
      : "",
  };
}

function relacionamentoPacienteDesconhecido_() {
  return {
    found: false,
    relationshipState: "unknown",
    patientName: "",
    professional: "",
    hasPendingHumanTask: false,
    pendingTaskType: "",
  };
}

function classificarEstadoRelacionamentoPaciente_(input) {
  const context = normalizarTextoConsultasSync_(
    input.context,
  );

  if (
    /pos operatorio|pos cirurgia|operad|cirurgia realizada|curativo|dreno|retorno pos/.test(
      context,
    )
  ) {
    return "active_postop";
  }

  if (
    /planejamento|orcamento.{0,30}hospital|valor.{0,30}hospital|pre operatorio|exames pre|cirurgia agendada|aguardando cirurgia|programar cirurgia/.test(
      context,
    )
  ) {
    return "surgical_planning";
  }

  if (
    /consulta agendada|agendada|confirmada/.test(
      normalizarTextoConsultasSync_(input.status),
    )
  ) {
    return "appointment_scheduled";
  }

  if (
    statusConsultaRealizada_(
      normalizarTextoConsultasSync_(input.status),
    )
  ) {
    const completedAt = dataConsultasSync_(
      input.completedAt,
    );
    const now = dataConsultasSync_(input.now) || new Date();
    const recent =
      completedAt &&
      now.getTime() - completedAt.getTime() <=
        45 * 24 * 60 * 60 * 1000;

    return recent
      ? "consultation_completed"
      : "former_patient";
  }

  return "known_patient";
}

function classificarPendenciaRelacionamentoPaciente_(context) {
  const normalized = normalizarTextoConsultasSync_(context);

  if (/hospital|orcamento|valor/.test(normalized)) {
    return "quote_or_price";
  }
  if (/agenda|horario|data|confirm/.test(normalized)) {
    return "scheduling";
  }
  if (/document|exame|laudo|termo/.test(normalized)) {
    return "documents_or_exams";
  }
  if (/cirurg|pre operatorio|pos operatorio|retorno/.test(normalized)) {
    return "care_journey";
  }
  return normalized ? "other" : "";
}

function reservarHorarioEAgendarConsulta_(input) {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const scheduleSheet = spreadsheet.getSheetByName(
    CONFIG.appointmentSlotsSheetName,
  );
  const consultationSheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!scheduleSheet) {
    return { ok: false, error: "schedule_sheet_missing" };
  }
  if (!consultationSheet) {
    return { ok: false, error: "consultations_sheet_missing" };
  }

  garantirEstruturaSincronizacaoConsultas_(
    consultationSheet,
  );
  const requestedDate =
    extrairDataConsultasSync_(input.scheduledDate);
  const requestedTime =
    extrairHorarioConsultasSync_(input.scheduledTime);
  const requestedProfessional = normalizarTextoConsultasSync_(
    input.professional || "Dra. Amanda",
  );

  if (!requestedDate || !requestedTime) {
    return { ok: false, error: "invalid_schedule" };
  }

  const consultationHeaders = consultationSheet
    .getRange(
      1,
      1,
      1,
      consultationSheet.getLastColumn(),
    )
    .getDisplayValues()[0];
  const consultationColumns =
    mapearCabecalhosConsultas_(consultationHeaders);
  const existingAppointmentRow =
    localizarConsultaExistente_(
      consultationSheet,
      consultationColumns,
      {
        id: input.appointmentId || input.eventId,
        phone: input.phone,
        scheduledDate: requestedDate,
        scheduledTime: requestedTime,
        incomingStatus: "Consulta agendada",
      },
    );

  if (existingAppointmentRow) {
    const existingAppointment = consultationSheet
      .getRange(
        existingAppointmentRow,
        1,
        1,
        consultationSheet.getLastColumn(),
      )
      .getValues()[0];
    const sameSchedule =
      mesmaDataConsulta_(
        existingAppointment[
          consultationColumns[
            CONSULTAS_SYNC_HEADERS.scheduledDate
          ]
        ],
        requestedDate,
      ) &&
      mesmoHorarioConsulta_(
        existingAppointment[
          consultationColumns[
            CONSULTAS_SYNC_HEADERS.scheduledTime
          ]
        ],
        requestedTime,
      );

    if (sameSchedule) {
      return {
        ok: true,
        reserved: true,
        duplicate: true,
        appointmentRow: existingAppointmentRow,
        appointmentId:
          input.appointmentId || input.eventId,
        scheduledDate: requestedDate,
        scheduledTime: requestedTime,
      };
    }
  }

  const lastRow = scheduleSheet.getLastRow();
  if (lastRow <= CONFIG.appointmentSlotsHeaderRow) {
    return { ok: false, error: "slot_not_available" };
  }

  const values = scheduleSheet.getRange(
    CONFIG.appointmentSlotsHeaderRow,
    1,
    lastRow - CONFIG.appointmentSlotsHeaderRow + 1,
    CONFIG.appointmentSlotsColumns,
  ).getDisplayValues();
  const headers = values[0] || [];
  const columns = {
    date: findScheduleColumn_(headers, "Data"),
    time: findScheduleColumn_(headers, "Horário"),
    status: findScheduleColumn_(headers, "Status"),
    professional: findScheduleColumn_(
      headers,
      "Profissional",
    ),
    observation: findScheduleColumn_(
      headers,
      "Observação",
    ),
  };

  if (
    columns.date < 0 ||
    columns.time < 0 ||
    columns.status < 0 ||
    columns.professional < 0
  ) {
    return {
      ok: false,
      error: "unexpected_schedule_structure",
    };
  }

  let selectedRow = null;

  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const rowDate = extrairDataConsultasSync_(
      row[columns.date],
    );
    const rowTime = extrairHorarioConsultasSync_(
      row[columns.time],
    );
    const rowProfessional = normalizarTextoConsultasSync_(
      row[columns.professional],
    );

    if (
      rowDate !== requestedDate ||
      rowTime !== requestedTime ||
      (
        requestedProfessional &&
        !rowProfessional.includes(
          requestedProfessional.includes("daniel")
            ? "daniel"
            : "amanda",
        )
      )
    ) {
      continue;
    }

    if (
      normalizarTextoConsultasSync_(
        row[columns.status],
      ) !== "disponivel"
    ) {
      return { ok: false, error: "slot_not_available" };
    }

    selectedRow = {
      rowNumber:
        CONFIG.appointmentSlotsHeaderRow + index,
      status: row[columns.status],
      observation:
        columns.observation >= 0
          ? row[columns.observation]
          : "",
    };
    break;
  }

  if (!selectedRow) {
    return { ok: false, error: "slot_not_available" };
  }

  const statusRange = scheduleSheet.getRange(
    selectedRow.rowNumber,
    columns.status + 1,
  );
  const observationRange =
    columns.observation >= 0
      ? scheduleSheet.getRange(
          selectedRow.rowNumber,
          columns.observation + 1,
        )
      : null;

  statusRange.setValue("Bloqueado");
  if (observationRange) {
    observationRange.setValue(
      "Agendamento confirmado via WhatsApp em " +
        Utilities.formatDate(
          new Date(),
          CONSULTAS_SYNC_CONFIG.timezone,
          "dd/MM/yyyy HH:mm",
        ),
    );
  }
  SpreadsheetApp.flush();

  try {
    const consultationResult = upsertConsulta_(
      consultationSheet,
      {
        appointmentId:
          input.appointmentId || input.eventId,
        phone: input.phone,
        name: input.name,
        professional:
          input.professional || "Dra. Amanda",
        consultationType:
          input.consultationType ||
          "Consulta presencial",
        topic: input.topic,
        location:
          input.location || "Clínica LIV Faria Lima",
        scheduledDate: requestedDate,
        scheduledTime: requestedTime,
        status: "Consulta agendada",
        source:
          input.source ||
          "WhatsApp — opção de horário escolhida pela paciente",
        notes: input.notes,
        now: new Date(),
      },
    );

    if (!consultationResult.ok) {
      throw new Error(
        consultationResult.error || "consultation_upsert_failed",
      );
    }

    atualizarStatusLeadDaConsulta_(
      spreadsheet,
      input.phone,
      input.professional || "Dra. Amanda",
      "Consulta agendada",
    );
    SpreadsheetApp.flush();

    return {
      ok: true,
      reserved: true,
      scheduleRow: selectedRow.rowNumber,
      appointmentRow: consultationResult.row,
      appointmentId: consultationResult.appointmentId,
      scheduledDate: requestedDate,
      scheduledTime: requestedTime,
    };
  } catch (error) {
    statusRange.setValue(selectedRow.status || "Disponível");
    if (observationRange) {
      observationRange.setValue(
        selectedRow.observation || "",
      );
    }
    SpreadsheetApp.flush();
    throw error;
  }
}

function registrarInteracaoHumanaDaConsulta_(input) {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const now = dataConsultasSync_(input.at) || new Date();
  const rowNumber = localizarConsultaParaAtualizacao_(
    sheet,
    columns,
    input,
    now,
  );

  if (!rowNumber) {
    return { ok: true, updated: false, reason: "appointment_not_found" };
  }

  definirValorConsulta_(
    sheet,
    rowNumber,
    columns,
    CONSULTAS_SYNC_HEADERS.lastHumanInteractionAt,
    now,
  );

  return { ok: true, updated: true, row: rowNumber };
}

function registrarRespostaPacienteDaConsulta_(input) {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const now = dataConsultasSync_(input.at) || new Date();
  const rowNumber = localizarConsultaParaAtualizacao_(
    sheet,
    columns,
    input,
    now,
    true,
  );

  if (!rowNumber) {
    return { ok: true, updated: false, reason: "appointment_not_found" };
  }

  const state = normalizarTextoConsultasSync_(input.state);

  if (state === "confirmed") {
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.status,
      "Consulta confirmada",
    );
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.patientConfirmedAt,
      now,
    );
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.nextAction,
      "",
    );
  } else if (state === "reschedule_requested") {
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.status,
      "Reagendamento solicitado",
    );
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.nextAction,
      "Equipe: confirmar nova data e horário antes de nova mensagem.",
    );
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.suppressionReason,
      "Lembretes suspensos: paciente pediu reagendamento.",
    );
  } else {
    return { ok: true, updated: false, reason: "unsupported_state" };
  }

  atualizarStatusLeadDaConsulta_(
    spreadsheet,
    input.phone,
    input.professional || "Dra. Amanda",
    state === "confirmed"
      ? "Consulta confirmada"
      : "Reagendamento solicitado",
  );

  return { ok: true, updated: true, row: rowNumber, state };
}

function localizarConsultaParaAtualizacao_(
  sheet,
  columns,
  input,
  now,
  apenasAtiva,
) {
  if (sheet.getLastRow() < 2) return null;

  const appointmentId = textoConsultasSync_(
    input.appointmentId || input.eventId,
    180,
  );
  const phone = normalizarTelefoneConsultasSync_(input.phone);
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();
  let best = null;

  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    const rowNumber = index + 2;
    const rowId = textoConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.id]],
      180,
    );

    if (appointmentId && rowId === appointmentId) return rowNumber;
    if (
      !phone ||
      normalizarTelefoneConsultasSync_(
        row[columns[CONSULTAS_SYNC_HEADERS.phone]],
      ) !== phone
    ) {
      continue;
    }

    const status = normalizarTextoConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.status]],
    );
    const completed = statusConsultaRealizada_(status);
    if (apenasAtiva && completed) continue;

    const completedAt = dataConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.completedDate]],
    );
    const scheduledAt = dataConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.scheduledDate]],
    );
    const isRecentCompleted =
      completed &&
      completedAt &&
      now.getTime() - completedAt.getTime() <=
        7 * 24 * 60 * 60 * 1000;
    const score = apenasAtiva
      ? scheduledAt
        ? scheduledAt.getTime()
        : rowNumber
      : isRecentCompleted
        ? 10000000000000 + completedAt.getTime()
        : scheduledAt
          ? scheduledAt.getTime()
          : rowNumber;

    if (!best || score > best.score) {
      best = { rowNumber, score };
    }
  }

  return best ? best.rowNumber : null;
}

function upsertConsulta_(sheet, input) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const phone = normalizarTelefoneConsultasSync_(input.phone);

  if (!phone) {
    return { ok: false, error: "invalid_phone" };
  }

  const now =
    input.now instanceof Date ? input.now : new Date();
  const existingRow = localizarConsultaExistente_(
    sheet,
    columns,
    {
      id: input.appointmentId,
      phone,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      incomingStatus: input.status,
    },
  );
  const rowNumber =
    existingRow || primeiraLinhaLivreConsultas_(sheet, columns);
  const current = sheet
    .getRange(rowNumber, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const appointmentId =
    textoConsultasSync_(input.appointmentId, 180) ||
    textoConsultasSync_(
      current[columns[CONSULTAS_SYNC_HEADERS.id]],
      180,
    ) ||
    construirIdConsulta_(phone, input, rowNumber, now);

  definirValorConsulta_(
    sheet,
    rowNumber,
    columns,
    CONSULTAS_SYNC_HEADERS.id,
    appointmentId,
  );
  definirValorConsulta_(
    sheet,
    rowNumber,
    columns,
    CONSULTAS_SYNC_HEADERS.phone,
    phone,
  );

  [
    [CONSULTAS_SYNC_HEADERS.name, input.name],
    [
      CONSULTAS_SYNC_HEADERS.professional,
      input.professional || "Dra. Amanda",
    ],
    [
      CONSULTAS_SYNC_HEADERS.consultationType,
      input.consultationType,
    ],
    [CONSULTAS_SYNC_HEADERS.topic, input.topic],
    [CONSULTAS_SYNC_HEADERS.location, input.location],
    [
      CONSULTAS_SYNC_HEADERS.scheduledDate,
      input.scheduledDate,
    ],
    [
      CONSULTAS_SYNC_HEADERS.scheduledTime,
      input.scheduledTime,
    ],
    [CONSULTAS_SYNC_HEADERS.status, input.status],
    [CONSULTAS_SYNC_HEADERS.source, input.source],
    [CONSULTAS_SYNC_HEADERS.notes, input.notes],
  ].forEach(function (entry) {
    if (entry[1] !== undefined && entry[1] !== "") {
      definirValorConsulta_(
        sheet,
        rowNumber,
        columns,
        entry[0],
        entry[1],
      );
    }
  });

  const changedSchedule =
    input.scheduledDate &&
    input.scheduledTime &&
    (!mesmaDataConsulta_(
      current[columns[CONSULTAS_SYNC_HEADERS.scheduledDate]],
      input.scheduledDate,
    ) ||
      !mesmoHorarioConsulta_(
        current[columns[CONSULTAS_SYNC_HEADERS.scheduledTime]],
        input.scheduledTime,
      ));

  if (changedSchedule) {
    [
      CONSULTAS_SYNC_HEADERS.patientConfirmedAt,
      CONSULTAS_SYNC_HEADERS.nextAction,
      CONSULTAS_SYNC_HEADERS.suppressionReason,
    ].forEach(function (header) {
      definirValorConsulta_(sheet, rowNumber, columns, header, "");
    });
  }

  if (input.completedAt) {
    definirValorConsulta_(
      sheet,
      rowNumber,
      columns,
      CONSULTAS_SYNC_HEADERS.completedDate,
      input.completedAt,
    );
  }

  if (input.queuePostConsult) {
    const refreshed = sheet
      .getRange(rowNumber, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    prepararPosConsultaNaLinha_(
      sheet,
      rowNumber,
      columns,
      refreshed,
      now,
    );
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    created: !existingRow,
    updated: Boolean(existingRow),
    row: rowNumber,
    appointmentId,
  };
}

function localizarConsultaExistente_(sheet, columns, input) {
  if (sheet.getLastRow() < 2) return null;

  const values = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn(),
    )
    .getValues();
  const requestedId = textoConsultasSync_(input.id, 180);
  const requestedPhone =
    normalizarTelefoneConsultasSync_(input.phone);
  const incomingCompleted = statusConsultaRealizada_(
    normalizarTextoConsultasSync_(input.incomingStatus),
  );
  let latestActiveRow = null;
  let latestActiveTimestamp = -1;

  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    const rowNumber = index + 2;
    const rowId = textoConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.id]],
      180,
    );

    if (requestedId && rowId === requestedId) {
      return rowNumber;
    }

    const rowPhone = normalizarTelefoneConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.phone]],
    );

    if (!rowPhone || rowPhone !== requestedPhone) continue;

    if (
      input.scheduledDate &&
      input.scheduledTime &&
      mesmaDataConsulta_(
        row[columns[CONSULTAS_SYNC_HEADERS.scheduledDate]],
        input.scheduledDate,
      ) &&
      mesmoHorarioConsulta_(
        row[columns[CONSULTAS_SYNC_HEADERS.scheduledTime]],
        input.scheduledTime,
      )
    ) {
      return rowNumber;
    }

    const rowStatus = normalizarTextoConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.status]],
    );
    const active = ![
      "consulta realizada",
      "realizada",
      "cancelada",
      "consulta cancelada",
    ].includes(rowStatus);

    if (!active && !incomingCompleted) continue;
    if (!active && incomingCompleted) continue;

    const scheduledDate =
      row[columns[CONSULTAS_SYNC_HEADERS.scheduledDate]];
    const timestamp =
      scheduledDate instanceof Date
        ? scheduledDate.getTime()
        : rowNumber;

    if (timestamp >= latestActiveTimestamp) {
      latestActiveRow = rowNumber;
      latestActiveTimestamp = timestamp;
    }
  }

  return latestActiveRow;
}

function primeiraLinhaLivreConsultas_(sheet, columns) {
  const idColumn = columns[CONSULTAS_SYNC_HEADERS.id] + 1;
  const maximumRows = sheet.getMaxRows();
  const values = sheet
    .getRange(2, idColumn, Math.max(maximumRows - 1, 1), 1)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (!String(values[index][0] || "").trim()) {
      return index + 2;
    }
  }

  sheet.insertRowsAfter(maximumRows, 100);
  return maximumRows + 1;
}

function prepararPosConsultaNaLinha_(
  sheet,
  rowNumber,
  columns,
  row,
  now,
) {
  const sentColumn =
    columns[CONSULTAS_SYNC_HEADERS.postSentAt];
  const eligibleColumn =
    columns[CONSULTAS_SYNC_HEADERS.postEligibleAt];
  const completedColumn =
    columns[CONSULTAS_SYNC_HEADERS.completedDate];

  if (sentColumn === undefined || eligibleColumn === undefined) {
    return;
  }

  if (row[sentColumn]) return;

  if (!row[completedColumn]) {
    sheet
      .getRange(rowNumber, completedColumn + 1)
      .setValue(now);
  }

  if (!row[eligibleColumn]) {
    sheet
      .getRange(rowNumber, eligibleColumn + 1)
      .setValue(
        proximoHorarioDeCuidadoConsultas_(
          new Date(
            now.getTime() +
              CONSULTAS_SYNC_CONFIG.postConsultDelayMinutes *
                60 *
                1000,
          ),
        ),
      );
  }
}

function proximoHorarioDeCuidadoConsultas_(date) {
  if (estaNoHorarioConsultasSync_(date)) return date;

  const localDate = Utilities.formatDate(
    date,
    CONSULTAS_SYNC_CONFIG.timezone,
    "yyyy-MM-dd",
  );
  const hour = Number(
    Utilities.formatDate(
      date,
      CONSULTAS_SYNC_CONFIG.timezone,
      "H",
    ),
  );

  if (hour < CONSULTAS_SYNC_CONFIG.startHour) {
    return new Date(
      `${localDate}T${String(
        CONSULTAS_SYNC_CONFIG.startHour,
      ).padStart(2, "0")}:00:00-03:00`,
    );
  }

  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const nextLocalDate = Utilities.formatDate(
    nextDay,
    CONSULTAS_SYNC_CONFIG.timezone,
    "yyyy-MM-dd",
  );

  return new Date(
    `${nextLocalDate}T${String(
      CONSULTAS_SYNC_CONFIG.startHour,
    ).padStart(2, "0")}:00:00-03:00`,
  );
}

function processarPosConsulta() {
  const now = new Date();

  if (!estaNoHorarioConsultasSync_(now)) {
    return {
      ok: true,
      sent: 0,
      reason: "outside_send_window",
    };
  }

  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty(
    CONSULTAS_SYNC_CONFIG.secretProperty,
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
    return processarPosConsultaInterno_(
      now,
      secret,
      properties,
    );
  } finally {
    lock.releaseLock();
  }
}

function processarPosConsultaInterno_(
  now,
  secret,
  properties,
) {
  const spreadsheet = SpreadsheetApp.openById(
    CONSULTAS_SYNC_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONSULTAS_SYNC_CONFIG.consultationsSheetName,
  );

  if (!sheet) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  garantirEstruturaSincronizacaoConsultas_(sheet);

  if (sheet.getLastRow() < 2) {
    return { ok: true, sent: 0, failed: 0 };
  }

  const values = sheet.getDataRange().getValues();
  const columns = mapearCabecalhosConsultas_(values[0]);
  let sent = 0;
  let failed = 0;

  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const status = normalizarTextoConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.status]],
    );

    if (!statusConsultaRealizada_(status)) continue;
    if (row[columns[CONSULTAS_SYNC_HEADERS.postSentAt]]) {
      continue;
    }
    if (row[columns[CONSULTAS_SYNC_HEADERS.postSuppressedAt]]) {
      continue;
    }
    if (
      !consentimentoPermiteContatoConsultas_(
        row[columns[CONSULTAS_SYNC_HEADERS.consent]],
      )
    ) {
      continue;
    }

    const eligibleAt = dataConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.postEligibleAt]],
    );

    if (!eligibleAt || eligibleAt.getTime() > now.getTime()) {
      continue;
    }

    const completedAt = dataConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.completedDate]],
    );
    const humanInteractionAt = dataConsultasSync_(
      row[
        columns[CONSULTAS_SYNC_HEADERS.lastHumanInteractionAt]
      ],
    );

    if (
      completedAt &&
      humanInteractionAt &&
      humanInteractionAt.getTime() >= completedAt.getTime()
    ) {
      const rowNumber = index + 1;
      sheet
        .getRange(
          rowNumber,
          columns[CONSULTAS_SYNC_HEADERS.postSuppressedAt] + 1,
        )
        .setValue(now);
      sheet
        .getRange(
          rowNumber,
          columns[CONSULTAS_SYNC_HEADERS.suppressionReason] + 1,
        )
        .setValue(
          "Pós-consulta dispensado: houve interação humana posterior.",
        );
      continue;
    }

    const lastAttempt = dataConsultasSync_(
      row[columns[CONSULTAS_SYNC_HEADERS.postLastAttempt]],
    );
    const lastError = String(
      row[columns[CONSULTAS_SYNC_HEADERS.postLastError]] ||
        "",
    );
    const retryMinutes = /disabled|template|http_400/i.test(
      lastError,
    )
      ? CONSULTAS_SYNC_CONFIG.postConsultDisabledRetryMinutes
      : CONSULTAS_SYNC_CONFIG.postConsultRetryMinutes;

    if (
      lastAttempt &&
      now.getTime() - lastAttempt.getTime() <
        retryMinutes * 60 * 1000
    ) {
      continue;
    }

    const response = enviarPosConsulta_(
      {
        appointmentId:
          row[columns[CONSULTAS_SYNC_HEADERS.id]] ||
          `consulta-linha-${index + 1}`,
        patientPhone:
          row[columns[CONSULTAS_SYNC_HEADERS.phone]],
        patientName:
          row[columns[CONSULTAS_SYNC_HEADERS.name]],
        professional:
          row[columns[CONSULTAS_SYNC_HEADERS.professional]] ||
          "Dra. Amanda",
      },
      secret,
      properties,
    );
    const rowNumber = index + 1;

    sheet
      .getRange(
        rowNumber,
        columns[
          CONSULTAS_SYNC_HEADERS.postLastAttempt
        ] + 1,
      )
      .setValue(now);

    if (response.ok && response.sent) {
      sheet
        .getRange(
          rowNumber,
          columns[CONSULTAS_SYNC_HEADERS.postSentAt] + 1,
        )
        .setValue(now);
      sheet
        .getRange(
          rowNumber,
          columns[
            CONSULTAS_SYNC_HEADERS.postLastError
          ] + 1,
        )
        .clearContent();
      sent += 1;
    } else {
      sheet
        .getRange(
          rowNumber,
          columns[
            CONSULTAS_SYNC_HEADERS.postLastError
          ] + 1,
        )
        .setValue(
          String(
            response.error || "delivery_failed",
          ).slice(0, 180),
        );
      failed += 1;
    }
  }

  return { ok: failed === 0, sent, failed };
}

function enviarPosConsulta_(payload, secret, properties) {
  const endpoint =
    properties.getProperty(
      CONSULTAS_SYNC_CONFIG.postConsultEndpointProperty,
    ) || CONSULTAS_SYNC_CONFIG.postConsultEndpoint;
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

function atualizarStatusLeadDaConsulta_(
  spreadsheet,
  phoneValue,
  professional,
  status,
) {
  const phone = normalizarTelefoneConsultasSync_(phoneValue);

  if (!phone) return;

  const preferredSheet =
    normalizarTextoConsultasSync_(professional).includes(
      "daniel",
    )
      ? "Leads Dr. Daniel"
      : "Google Ads - Conversões";
  const sheet = spreadsheet.getSheetByName(preferredSheet);

  if (!sheet || sheet.getLastRow() < 2) return;

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const columns = mapearCabecalhosConsultas_(headers);
  const phoneColumn =
    columns[CONSULTAS_SYNC_LEAD_HEADERS.phone];
  const statusColumn =
    columns[CONSULTAS_SYNC_LEAD_HEADERS.status];
  const statusDateColumn =
    columns[CONSULTAS_SYNC_LEAD_HEADERS.statusDate];

  if (phoneColumn === undefined || statusColumn === undefined) {
    return;
  }

  const phones = sheet
    .getRange(2, phoneColumn + 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  for (let index = phones.length - 1; index >= 0; index -= 1) {
    if (
      normalizarTelefoneConsultasSync_(phones[index][0]) !==
      phone
    ) {
      continue;
    }

    const rowNumber = index + 2;
    sheet
      .getRange(rowNumber, statusColumn + 1)
      .setValue(status);

    if (statusDateColumn !== undefined) {
      sheet
        .getRange(rowNumber, statusDateColumn + 1)
        .setValue(
          Utilities.formatDate(
            new Date(),
            CONSULTAS_SYNC_CONFIG.timezone,
            "dd/MM/yyyy",
          ),
        );
    }
    return;
  }
}

function garantirEstruturaSincronizacaoConsultas_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });
  const columns = mapearCabecalhosConsultas_(headers);
  const requiredExisting = [
    CONSULTAS_SYNC_HEADERS.id,
    CONSULTAS_SYNC_HEADERS.phone,
    CONSULTAS_SYNC_HEADERS.professional,
    CONSULTAS_SYNC_HEADERS.status,
  ];

  requiredExisting.forEach(function (header) {
    if (columns[header] === undefined) {
      throw new Error(
        `Coluna obrigatória ausente em Consultas: ${header}`,
      );
    }
  });

  [
    CONSULTAS_SYNC_HEADERS.postEligibleAt,
    CONSULTAS_SYNC_HEADERS.postSentAt,
    CONSULTAS_SYNC_HEADERS.postLastAttempt,
    CONSULTAS_SYNC_HEADERS.postLastError,
    CONSULTAS_SYNC_HEADERS.postSuppressedAt,
    CONSULTAS_SYNC_HEADERS.patientConfirmedAt,
    CONSULTAS_SYNC_HEADERS.lastHumanInteractionAt,
    CONSULTAS_SYNC_HEADERS.nextAction,
    CONSULTAS_SYNC_HEADERS.suppressionReason,
  ].forEach(function (header) {
    if (columns[header] === undefined) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header);
      columns[header] = headers.length - 1;
    }
  });

  const controlWidths = {
    [CONSULTAS_SYNC_HEADERS.postEligibleAt]: 170,
    [CONSULTAS_SYNC_HEADERS.postSentAt]: 155,
    [CONSULTAS_SYNC_HEADERS.postLastAttempt]: 195,
    [CONSULTAS_SYNC_HEADERS.postLastError]: 180,
    [CONSULTAS_SYNC_HEADERS.postSuppressedAt]: 180,
    [CONSULTAS_SYNC_HEADERS.patientConfirmedAt]: 170,
    [CONSULTAS_SYNC_HEADERS.lastHumanInteractionAt]: 180,
    [CONSULTAS_SYNC_HEADERS.nextAction]: 220,
    [CONSULTAS_SYNC_HEADERS.suppressionReason]: 260,
  };

  Object.keys(controlWidths).forEach(function (header) {
    const column = columns[header];
    if (column !== undefined) {
      sheet.setColumnWidth(
        column + 1,
        controlWidths[header],
      );
    }
  });
}

function mapearCabecalhosConsultas_(headers) {
  const result = {};
  const normalizedIndexes = {};

  headers.forEach(function (value, index) {
    const header = String(value || "").trim();
    if (header && result[header] === undefined) {
      result[header] = index;
    }
    const normalized = normalizarCabecalhoConsultas_(header);
    if (
      normalized &&
      normalizedIndexes[normalized] === undefined
    ) {
      normalizedIndexes[normalized] = index;
    }
  });

  [
    ...Object.values(CONSULTAS_SYNC_HEADERS),
    ...Object.values(CONSULTAS_SYNC_LEAD_HEADERS),
  ].forEach(function (canonicalHeader) {
    if (result[canonicalHeader] !== undefined) return;

    const normalized = normalizarCabecalhoConsultas_(
      canonicalHeader,
    );
    const index = normalizedIndexes[normalized];

    if (index !== undefined) {
      result[canonicalHeader] = index;
    }
  });

  const aliases = {
    [CONSULTAS_SYNC_HEADERS.source]: [
      "fonte da sincronizacao",
      "origem do lead",
    ],
    [CONSULTAS_SYNC_HEADERS.notes]: [
      "resumo administrativo",
    ],
  };

  Object.keys(aliases).forEach(function (canonicalHeader) {
    if (result[canonicalHeader] !== undefined) return;

    for (let index = 0; index < aliases[canonicalHeader].length; index += 1) {
      const alias = aliases[canonicalHeader][index];
      if (normalizedIndexes[alias] !== undefined) {
        result[canonicalHeader] =
          normalizedIndexes[alias];
        break;
      }
    }
  });

  return result;
}

function normalizarCabecalhoConsultas_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function definirValorConsulta_(
  sheet,
  row,
  columns,
  header,
  value,
) {
  const column = columns[header];
  if (column === undefined) return;
  sheet.getRange(row, column + 1).setValue(value);
}

function valorDaLinhaConsultas_(row, columns, header) {
  const column = columns[header];
  return column === undefined ? "" : row[column];
}

function montarObservacaoLeadConsultas_(
  row,
  columns,
  sheetName,
) {
  const details = [
    `Origem: ${sheetName}`,
    valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_LEAD_HEADERS.reference,
    ),
    valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_LEAD_HEADERS.platform,
    ),
    valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_LEAD_HEADERS.campaign,
    ),
    valorDaLinhaConsultas_(
      row,
      columns,
      CONSULTAS_SYNC_LEAD_HEADERS.creative,
    ),
  ]
    .map(function (value) {
      return String(value || "").trim();
    })
    .filter(Boolean);

  return details.join(" | ").slice(0, 500);
}

function construirIdConsulta_(phone, input, row, now) {
  const date =
    extrairDataConsultasSync_(input.scheduledDate) ||
    Utilities.formatDate(
      now,
      CONSULTAS_SYNC_CONFIG.timezone,
      "yyyyMMdd",
    );
  const time =
    extrairHorarioConsultasSync_(input.scheduledTime) ||
    String(row);

  return (
    "consulta-" +
    phone.replace(/\D/g, "") +
    "-" +
    date.replace(/\D/g, "") +
    "-" +
    time.replace(/\D/g, "")
  ).slice(0, 180);
}

function mesmaDataConsulta_(left, right) {
  return (
    extrairDataConsultasSync_(left) &&
    extrairDataConsultasSync_(left) ===
      extrairDataConsultasSync_(right)
  );
}

function mesmoHorarioConsulta_(left, right) {
  return (
    extrairHorarioConsultasSync_(left) &&
    extrairHorarioConsultasSync_(left) ===
      extrairHorarioConsultasSync_(right)
  );
}

function extrairDataConsultasSync_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      CONSULTAS_SYNC_CONFIG.timezone,
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

function extrairHorarioConsultasSync_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      CONSULTAS_SYNC_CONFIG.timezone,
      "HH:mm",
    );
  }

  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);

  if (!match) return "";

  return (
    String(Number(match[1])).padStart(2, "0") +
    ":" +
    match[2]
  );
}

function dataConsultasSync_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizarTelefoneConsultasSync_(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15
    ? `+${digits}`
    : "";
}

function textoConsultasSync_(value, maximumLength) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function normalizarTextoConsultasSync_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function statusAgendaConsulta_(status) {
  return [
    "agendada",
    "confirmada",
    "consulta agendada",
    "consulta confirmada",
    "realizada",
    "consulta realizada",
  ].includes(status);
}

function statusConsultaRealizada_(status) {
  return ["realizada", "consulta realizada"].includes(status);
}

function consentimentoPermiteContatoConsultas_(value) {
  return ![
    "nao",
    "nao autorizado",
    "sem consentimento",
    "false",
    "falso",
    "0",
  ].includes(normalizarTextoConsultasSync_(value));
}

function estaNoHorarioConsultasSync_(date) {
  const hour = Number(
    Utilities.formatDate(
      date,
      CONSULTAS_SYNC_CONFIG.timezone,
      "H",
    ),
  );

  return (
    hour >= CONSULTAS_SYNC_CONFIG.startHour &&
    hour < CONSULTAS_SYNC_CONFIG.endHour
  );
}
