const CONFIG = Object.freeze({
  spreadsheetId: "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Google Ads - Conversões",
  secretProperty: "LEADS_INGEST_SECRET",
  eventSheetName: "_WHATSAPP_EVENTOS",
  humanTakeoverSheetName: "_WHATSAPP_ATENDIMENTO_HUMANO",
  alertEmailSheetName: "_WHATSAPP_ALERTAS_EMAIL",
  messageSheetName: "_WHATSAPP_MENSAGENS",
  classificationSheetName: "_WHATSAPP_CLASSIFICACAO",
  reviewAlertEmail: "daniel.added@gmail.com",
  timezone: "America/Sao_Paulo",
  appointmentSlotsSheetName: "Datas Consulta",
  appointmentSlotsHeaderRow: 6,
  appointmentSlotsColumns: 7,
  totalColumns: 25,
  classificationDelayMinutes: 10,
});

const EXPECTED_HEADERS = Object.freeze([
  "Data do contato",
  "Referência da campanha",
  "Telefone (E.164)",
  "E-mail",
  "Situação do lead",
  "Data da situação",
  "Enviar ao Google Ads?",
  "Nome da conversão",
  "Valor (R$)",
  "Consentimento para medição",
  "GCLID",
  "GBRAID",
  "WBRAID",
  "Data e hora da conversão",
  "ID da transação",
  "Moeda",
  "Observação administrativa",
  "Planejamento Individual",
  "Origem do evento",
  "Plataforma de aquisição",
  "Campanha",
  "Criativo",
  "CTA",
  "Destino",
  "Referência completa",
]);

function doGet(e) {
  const view = String(
    e && e.parameter && e.parameter.view
      ? e.parameter.view
      : "",
  ).trim();

  if (
    view === "cancelar_retomadas" &&
    typeof renderCancelamentoRetomadas_ === "function"
  ) {
    return renderCancelamentoRetomadas_(
      e && e.parameter ? e.parameter : {},
    );
  }

  if (
    view === "salas" &&
    typeof renderFormularioReservaSalas_ === "function"
  ) {
    return renderFormularioReservaSalas_(
      e && e.parameter ? e.parameter.key : "",
    );
  }

  return json_({
    ok: true,
    service: "clinica-liv-leads",
    deduplication: "one_row_per_phone",
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let stage = "parse_body";

  try {
    const body = parseBody_(e);
    const expectedSecret = PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.secretProperty);

    if (!expectedSecret || body.secret !== expectedSecret) {
      return json_({ ok: false, error: "unauthorized" });
    }

    if (
      body.action !== "append_lead" &&
      body.action !== "mark_human_takeover" &&
      body.action !== "upsert_appointment" &&
      body.action !== "touch_appointment" &&
      body.action !== "update_appointment_status" &&
      body.action !== "get_available_slots" &&
      body.action !== "reserve_appointment_slot" &&
      body.action !== "send_review_alert_email" &&
      body.action !== "claim_due_classifications" &&
      body.action !== "complete_classification" &&
      body.action !== "fail_classification" &&
      body.action !== "get_patient_relationship" &&
      body.action !== "record_patient_commitment" &&
      body.action !== "resolve_patient_commitments" &&
      body.action !== "remove_external_professional_contact" &&
      body.action !== "get_bot_knowledge_context" &&
      body.action !== "record_bot_unknown_question" &&
      body.action !== "record_human_learning_answer" &&
      body.action !== "record_bot_knowledge_usage"
    ) {
      return json_({ ok: false, error: "unsupported_action" });
    }

    if (body.action === "claim_due_classifications") {
      stage = "claim_due_classifications";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const claimResult = claimDueLeadClassifications_(body.limit);
      return json_({ ok: true, ...claimResult });
    }

    if (body.action === "complete_classification") {
      stage = "complete_classification";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const completionResult = completeLeadClassification_(
        body.job || {},
        body.classification || {},
      );
      return json_({ ok: true, ...completionResult });
    }

    if (body.action === "fail_classification") {
      stage = "fail_classification";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const failureResult = failLeadClassification_(body.job || {});
      return json_({ ok: true, ...failureResult });
    }

    if (body.action === "mark_human_takeover") {
      stage = "mark_human_takeover";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const takeoverResult = registrarAtendimentoHumano_(
        body.takeover || {},
      );

      return json_({
        ...takeoverResult,
        ok: takeoverResult.ok === true,
      });
    }

    if (body.action === "get_available_slots") {
      stage = "get_available_slots";
      const slotsResult = getAvailableAppointmentSlots_({
        professional: body.professional,
        limit: body.limit,
      });

      return json_({
        ok: true,
        slots: slotsResult,
      });
    }

    if (body.action === "reserve_appointment_slot") {
      stage = "reserve_appointment_slot";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const reservationResult =
        reservarHorarioEAgendarConsulta_(
          body.appointment || {},
        );

      return json_({
        ...reservationResult,
        ok: reservationResult.ok === true,
      });
    }

    if (body.action === "upsert_appointment") {
      stage = "normalize_appointment";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      stage = "upsert_appointment";
      const appointmentResult = upsertConsultaRecebida_(
        body.appointment || {},
      );

      return json_({
        ok: appointmentResult.ok === true,
        ...appointmentResult,
      });
    }

    if (body.action === "touch_appointment") {
      stage = "touch_appointment";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const touchResult = registrarInteracaoHumanaDaConsulta_(
        body.appointment || {},
      );

      return json_({
        ok: touchResult.ok === true,
        ...touchResult,
      });
    }

    if (body.action === "update_appointment_status") {
      stage = "update_appointment_status";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const statusResult = registrarRespostaPacienteDaConsulta_(
        body.appointment || {},
      );

      return json_({
        ok: statusResult.ok === true,
        ...statusResult,
      });
    }

    if (body.action === "send_review_alert_email") {
      stage = "send_review_alert_email";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const emailResult = sendReviewAlertEmail_(
        body.alert || {},
      );

      return json_({
        ok: emailResult.ok === true,
        ...emailResult,
      });
    }

    if (body.action === "get_patient_relationship") {
      stage = "get_patient_relationship";
      const relationshipResult =
        obterRelacionamentoPaciente_(
          body.patient || {},
        );

      return json_({
        ok: true,
        relationship: relationshipResult,
      });
    }

    if (body.action === "record_patient_commitment") {
      stage = "record_patient_commitment";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const commitmentResult =
        registrarCompromissoPaciente_(
          body.commitment || {},
        );

      return json_({
        ok: commitmentResult.ok === true,
        ...commitmentResult,
      });
    }

    if (body.action === "resolve_patient_commitments") {
      stage = "resolve_patient_commitments";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const resolutionResult =
        resolverCompromissosPaciente_(
          body.resolution || {},
        );

      return json_({
        ok: resolutionResult.ok === true,
        ...resolutionResult,
      });
    }

    if (body.action === "get_bot_knowledge_context") {
      stage = "get_bot_knowledge_context";
      const knowledgeResult = obterContextoConhecimentoBot_(
        body.knowledge || {},
      );
      return json_({ ok: true, ...knowledgeResult });
    }

    if (body.action === "record_bot_unknown_question") {
      stage = "record_bot_unknown_question";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const learningResult = registrarDuvidaBot_(
        body.learning || {},
      );
      return json_({
        ...learningResult,
        ok: learningResult.ok === true,
      });
    }

    if (body.action === "record_human_learning_answer") {
      stage = "record_human_learning_answer";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const answerResult = registrarRespostaHumanaAprendizado_(
        body.learning || {},
      );
      return json_({
        ...answerResult,
        ok: answerResult.ok === true,
      });
    }

    if (body.action === "record_bot_knowledge_usage") {
      stage = "record_bot_knowledge_usage";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const usageResult = registrarUsoConhecimentoBot_(
        body.usage || {},
      );
      return json_({
        ...usageResult,
        ok: usageResult.ok === true,
      });
    }

    if (body.action === "remove_external_professional_contact") {
      stage = "remove_external_professional_contact";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const cleanupResult = removerContatoProfissionalExterno_(
        body.contact || {},
      );

      return json_({
        ok: cleanupResult.ok === true,
        ...cleanupResult,
      });
    }

    stage = "get_patient_relationship";
    const patientRelationship =
      typeof obterRelacionamentoPaciente_ === "function"
        ? obterRelacionamentoPaciente_({
            phone: body.lead && body.lead.phone,
          })
        : {
            found: false,
            relationshipState: "unknown",
          };

    stage = "normalize_lead";
    const lead = normalizeLead_(body.lead || {});

    stage = "acquire_lock";

    if (!lock.tryLock(5000)) {
      return json_({ ok: false, error: "busy_retry" });
    }

    stage = "open_spreadsheet";
    const spreadsheet = SpreadsheetApp.openById(
      CONFIG.spreadsheetId,
    );

    stage = "find_sheet";
    const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

    if (!sheet) {
      throw new Error("Aba configurada não encontrada.");
    }

    stage = "assert_headers";
    assertHeaders_(sheet);

    stage = "event_sheet";
    const eventSheet = getOrCreateEventSheet_(spreadsheet);
    const humanTakeoverToday =
      houveAtendimentoHumanoNoDia_(
        spreadsheet,
        lead.phone,
        lead.contactAt,
      );

    stage = "duplicate_check";
    const processedEvent = findProcessedEvent_(
      eventSheet,
      [lead.messageId, lead.eventId],
    );

    if (processedEvent) {
      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "message_id",
        row: processedEvent.leadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
      });
    }

    const legacyDuplicateRow = findExactDuplicateRow_(
      sheet,
      [lead.messageId, lead.eventId],
    );

    if (legacyDuplicateRow) {
      stage = "record_event";
      recordProcessedEvent_(
        eventSheet,
        lead,
        legacyDuplicateRow,
        "message_id_backfill",
      );

      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "message_id",
        row: legacyDuplicateRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
      });
    }

    stage = "phone_identity_check";
    const existingLeadRow = findLeadRowByPhone_(sheet, lead.phone);

    if (existingLeadRow) {
      if (!isKnownPatientRelationship_(patientRelationship)) {
        stage = "merge_existing_lead";
        mergeLeadIntoExistingRow_(sheet, existingLeadRow, lead);
      }

      stage = "record_event";
      recordProcessedEvent_(
        eventSheet,
        lead,
        existingLeadRow,
        "phone_identity",
      );

      stage = "queue_classification";
      if (isKnownPatientRelationship_(patientRelationship)) {
        recordLeadMessageOnly_(
          spreadsheet,
          existingLeadRow,
          lead,
          "IN",
        );
      } else {
        recordLeadMessageAndQueue_(
          spreadsheet,
          existingLeadRow,
          lead,
          "IN",
        );
      }

      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "phone_identity",
        updated: true,
        row: existingLeadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        knownPatient: isKnownPatientRelationship_(patientRelationship),
      });
    }

    if (isKnownPatientRelationship_(patientRelationship)) {
      stage = "known_patient_no_lead";
      recordProcessedEvent_(
        eventSheet,
        lead,
        "",
        "known_patient",
      );
      recordLeadMessageOnly_(spreadsheet, "", lead, "IN");

      return json_({
        ok: true,
        inserted: false,
        duplicate: false,
        duplicateReason: null,
        updated: false,
        row: null,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        knownPatient: true,
      });
    }

    stage = "find_row";
    const row = findFirstAvailableRow_(sheet);

    writeLead_(sheet, row, lead, function setStage(nextStage) {
      stage = nextStage;
    });

    stage = "record_event";
    recordProcessedEvent_(
      eventSheet,
      lead,
      row,
      "inserted",
    );

    stage = "queue_classification";
    recordLeadMessageAndQueue_(spreadsheet, row, lead, "IN");

    return json_({
      ok: true,
      inserted: true,
      duplicate: false,
      duplicateReason: null,
      row,
      eventId: lead.eventId,
      messageId: lead.messageId,
      humanTakeoverToday,
      patientRelationship,
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);

    const allowedStages = new Set([
      "parse_body",
      "normalize_lead",
      "normalize_appointment",
      "mark_human_takeover",
      "acquire_lock",
      "open_spreadsheet",
      "find_sheet",
      "assert_headers",
      "event_sheet",
      "duplicate_check",
      "phone_identity_check",
      "merge_existing_lead",
      "known_patient_no_lead",
      "queue_classification",
      "claim_due_classifications",
      "complete_classification",
      "fail_classification",
      "find_row",
      "write_identity",
      "write_contact",
      "write_status",
      "write_primary_consent",
      "write_click_id",
      "write_origin",
      "write_destination",
      "flush",
      "record_event",
      "upsert_appointment",
      "touch_appointment",
      "update_appointment_status",
      "get_available_slots",
      "reserve_appointment_slot",
      "send_review_alert_email",
      "get_bot_knowledge_context",
      "record_bot_unknown_question",
      "record_human_learning_answer",
      "record_bot_knowledge_usage",
    ]);

    const safeStage = allowedStages.has(stage) ? stage : "unknown";

    return json_({
      ok: false,
      error: `internal_error_${safeStage}`,
    });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function removerContatoProfissionalExterno_(input) {
  const phone = normalizePhone_(input && input.phone);
  if (!phone) {
    return { ok: false, error: "invalid_phone" };
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const leadSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  let leadRowsCleared = 0;

  if (leadSheet) {
    const leadRow = findLeadRowByPhone_(leadSheet, phone);
    if (leadRow) {
      leadSheet
        .getRange(leadRow, 1, 1, leadSheet.getLastColumn())
        .clearContent();
      leadRowsCleared = 1;
    }
  }

  const derivedSheetNames = [
    "Consultas",
    "_WHATSAPP_RETOMADAS",
    "_WHATSAPP_COMPROMISSOS",
    "_WHATSAPP_MENSAGENS",
    "_WHATSAPP_ATENDIMENTO_HUMANO",
    "_WHATSAPP_ALERTAS_EMAIL",
  ];
  const removedBySheet = {};

  derivedSheetNames.forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;
    const removed = removerLinhasPorTelefone_(sheet, phone);
    if (removed) removedBySheet[sheetName] = removed;
  });

  if (typeof atualizarCentralAtendimento === "function") {
    atualizarCentralAtendimento();
  }

  return {
    ok: true,
    professional:
      String(input && input.professional || "").trim() ||
      "Dr. Henrique Lane Staniak",
    leadRowsCleared,
    removedBySheet,
  };
}

function removerLinhasPorTelefone_(sheet, phone) {
  if (!sheet || sheet.getLastRow() < 2) return 0;

  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    });
  const phoneColumn = headers.findIndex(function (header) {
    return header === "telefone" || header.indexOf("telefone (") === 0;
  });

  if (phoneColumn < 0) return 0;

  const values = sheet
    .getRange(2, phoneColumn + 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();
  let removed = 0;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (normalizePhone_(values[index][0]) !== phone) continue;
    sheet.deleteRow(index + 2);
    removed += 1;
  }

  return removed;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Corpo da solicitação ausente.");
  }

  return JSON.parse(e.postData.contents);
}

function normalizeScheduleText_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseScheduleDateTime_(dateValue, timeValue) {
  const dateMatch = String(dateValue || "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = String(timeValue || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);

  if (!dateMatch || !timeMatch) return null;

  const dateTime = new Date(
    Number(dateMatch[3]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[1]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );

  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function findScheduleColumn_(headers, expectedName) {
  const normalizedExpected = normalizeScheduleText_(expectedName);

  for (let index = 0; index < headers.length; index += 1) {
    if (
      normalizeScheduleText_(headers[index]) === normalizedExpected
    ) {
      return index;
    }
  }

  return -1;
}

function getAvailableAppointmentSlots_(input) {
  const professional = normalizeScheduleText_(
    input && input.professional,
  );
  const requestedLimit = Number(input && input.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
    : 50;
  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONFIG.appointmentSlotsSheetName,
  );

  if (!sheet) {
    throw new Error("Aba Datas Consulta não encontrada.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.appointmentSlotsHeaderRow) return [];

  const values = sheet.getRange(
    CONFIG.appointmentSlotsHeaderRow,
    1,
    lastRow - CONFIG.appointmentSlotsHeaderRow + 1,
    CONFIG.appointmentSlotsColumns,
  ).getDisplayValues();
  const headers = values[0] || [];
  const columns = {
    date: findScheduleColumn_(headers, "Data"),
    day: findScheduleColumn_(headers, "Dia"),
    time: findScheduleColumn_(headers, "Horário"),
    status: findScheduleColumn_(headers, "Status"),
    professional: findScheduleColumn_(headers, "Profissional"),
  };

  if (Object.keys(columns).some(function missingColumn(key) {
    return columns[key] < 0;
  })) {
    throw new Error("Estrutura inesperada na aba Datas Consulta.");
  }

  const now = new Date();
  const slots = [];
  const expiredRows = [];

  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const status = normalizeScheduleText_(row[columns.status]);
    const rowProfessional = normalizeScheduleText_(
      row[columns.professional],
    );
    const dateTime = parseScheduleDateTime_(
      row[columns.date],
      row[columns.time],
    );

    if (
      status === "disponivel" &&
      dateTime &&
      dateTime.getTime() <= now.getTime()
    ) {
      expiredRows.push(CONFIG.appointmentSlotsHeaderRow + index);
      continue;
    }

    if (status !== "disponivel" || !dateTime) {
      continue;
    }

    if (
      professional &&
      !rowProfessional.includes(professional)
    ) {
      continue;
    }

    let room = "";
    if (
      typeof escolherSalaDisponivelConsulta_ === "function"
    ) {
      const roomSelection = escolherSalaDisponivelConsulta_({
        professional:
          String(row[columns.professional] || "").trim(),
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        scheduledDate: String(row[columns.date] || "").trim(),
        scheduledTime: String(row[columns.time] || "").trim(),
      });
      if (!roomSelection.ok) continue;
      room = roomSelection.room || "";
    }

    slots.push({
      date: String(row[columns.date] || "").trim(),
      day: String(row[columns.day] || "").trim(),
      time: String(row[columns.time] || "").trim().padStart(5, "0"),
      professional:
        String(row[columns.professional] || "").trim(),
      room,
      timestamp: dateTime.getTime(),
    });
  }

  slots.sort(function chronologicalOrder(left, right) {
    return left.timestamp - right.timestamp;
  });

  expiredRows.forEach(function expirePastSlot(row) {
    sheet.getRange(row, columns.status + 1).setValue("Indisponível");
  });
  if (expiredRows.length) SpreadsheetApp.flush();

  return slots.slice(0, limit).map(function publicSlot(slot) {
    const publicResult = {
      date: slot.date,
      day: slot.day,
      time: slot.time,
      professional: slot.professional,
    };
    if (slot.room) publicResult.room = slot.room;
    return publicResult;
  });
}

function diagnosticarHorariosDisponiveis() {
  const amanda = getAvailableAppointmentSlots_({
    professional: "amanda",
    limit: 50,
  });
  const daniel = getAvailableAppointmentSlots_({
    professional: "daniel",
    limit: 50,
  });
  const result = {
    ok: true,
    amanda: amanda.length,
    daniel: daniel.length,
    primeiraOpcaoAmanda: amanda[0] || null,
    primeiraOpcaoDaniel: daniel[0] || null,
  };

  console.log(JSON.stringify(result));
  return result;
}

function normalizeLead_(input) {
  const eventId = safeText_(input.eventId, 200);
  const messageId = safeText_(input.messageId || eventId, 500);
  const phone = normalizePhone_(input.phone);
  const contactAt = new Date(input.contactAt || Date.now());

  if (!eventId) {
    throw new Error("Event ID ausente.");
  }

  if (!messageId) {
    throw new Error("Message ID ausente.");
  }

  if (!phone) {
    throw new Error("Telefone ausente.");
  }

  if (Number.isNaN(contactAt.getTime())) {
    throw new Error("Data do contato inválida.");
  }

  const allowedPlatforms = new Set([
    "Google",
    "Meta",
    "Orgânico/Conteúdo",
    "WhatsApp direto",
    "Não identificada",
  ]);

  const platform = allowedPlatforms.has(input.platform)
    ? input.platform
    : "Não identificada";

  const gclid = safeText_(input.gclid, 500);
  const gbraid = gclid ? "" : safeText_(input.gbraid, 500);
  const wbraid = gclid || gbraid
    ? ""
    : safeText_(input.wbraid, 500);

  return {
    eventId,
    messageId,
    phone,
    contactAt,
    reference: safeText_(
      input.reference || "Não informada",
      200,
    ),
    platform,
    gclid,
    gbraid,
    wbraid,
    name: safeText_(input.name, 120),
    text: safeText_(input.text, 4000),
  };
}

function normalizePhone_(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function isKnownPatientRelationship_(value) {
  return Boolean(value && value.found === true);
}

function safeText_(value, maximumLength) {
  const text = boundedText_(value, maximumLength);

  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function boundedText_(value, maximumLength) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function sendReviewAlertEmail_(input) {
  const eventId = boundedText_(input.eventId, 200);

  if (!eventId) {
    throw new Error("Event ID do alerta ausente.");
  }

  const patientName =
    boundedText_(input.patientName, 120) || "Não informado";
  const patientPhone =
    normalizePhone_(input.patientPhone) || "Não informado";
  const messageText =
    boundedText_(input.messageText, 1024) || "Mensagem sem texto.";
  const recipient = CONFIG.reviewAlertEmail;
  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = getOrCreateAlertEmailSheet_(spreadsheet);
  const existingRow = findAlertEmailEvent_(
    sheet,
    eventId,
    recipient,
  );

  if (existingRow) {
    return {
      ok: true,
      sent: false,
      duplicate: true,
    };
  }

  MailApp.sendEmail({
    to: recipient,
    subject: "[Clínica LIV] Alerta para revisão",
    body: [
      "ALERTA DA CLÍNICA LIV",
      "",
      `Paciente: ${patientName}`,
      `WhatsApp: ${patientPhone}`,
      "",
      messageText,
    ].join("\n"),
    name: "Clínica LIV",
  });

  sheet.appendRow([
    safeText_(eventId, 200),
    recipient,
    new Date(),
    safeText_(patientName, 120),
    patientPhone,
  ]);

  return {
    ok: true,
    sent: true,
    duplicate: false,
  };
}

function getOrCreateAlertEmailSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    CONFIG.alertEmailSheetName,
  );

  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(CONFIG.alertEmailSheetName);
  sheet.getRange(1, 1, 1, 5).setValues([[
    "Event ID",
    "Destinatário",
    "Data do envio",
    "Paciente",
    "WhatsApp",
  ]]);
  sheet.setFrozenRows(1);
  sheet.hideSheet();

  return sheet;
}

function findAlertEmailEvent_(sheet, eventId, recipient) {
  if (sheet.getLastRow() < 2) return null;

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 2)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (
      String(values[index][0] || "").trim() === eventId &&
      String(values[index][1] || "").trim() === recipient
    ) {
      return index + 2;
    }
  }

  return null;
}

function assertHeaders_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, CONFIG.totalColumns)
    .getDisplayValues()[0];

  for (
    let index = 0;
    index < EXPECTED_HEADERS.length;
    index += 1
  ) {
    if (headers[index] !== EXPECTED_HEADERS[index]) {
      throw new Error(
        `Estrutura inesperada na coluna ${index + 1}: ` +
          `${headers[index]}`,
      );
    }
  }
}

function getOrCreateEventSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);

  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(CONFIG.eventSheetName);
  sheet.getRange(1, 1, 1, 6).setValues([[
    "Message ID",
    "Event ID",
    "Telefone",
    "Data do evento",
    "Linha do lead",
    "Resultado",
  ]]);
  sheet.setFrozenRows(1);
  sheet.hideSheet();

  return sheet;
}

function getOrCreateHumanTakeoverSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    CONFIG.humanTakeoverSheetName,
  );

  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(
    CONFIG.humanTakeoverSheetName,
  );
  sheet.getRange(1, 1, 1, 6).setValues([[
    "Event ID",
    "Message ID",
    "Telefone",
    "Data e hora",
    "Data local",
    "Mensagem",
  ]]);
  sheet.setFrozenRows(1);
  sheet.hideSheet();

  return sheet;
}

function registrarAtendimentoHumano_(input) {
  const eventId = boundedText_(input.eventId, 200);
  const messageId = boundedText_(
    input.messageId || eventId,
    500,
  );
  const phone = normalizePhone_(input.phone);
  const takenAt = new Date(input.takenAt || Date.now());

  if (!eventId || !messageId || !phone) {
    return { ok: false, error: "invalid_takeover" };
  }
  if (Number.isNaN(takenAt.getTime())) {
    return { ok: false, error: "invalid_takeover_date" };
  }

  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = getOrCreateHumanTakeoverSheet_(spreadsheet);
  const existing = sheet.getLastRow() >= 2
    ? sheet
        .getRange(2, 1, sheet.getLastRow() - 1, 2)
        .getDisplayValues()
        .some(function sameTakeover(row) {
          return (
            String(row[0] || "").trim() === eventId ||
            String(row[1] || "").trim() === messageId
          );
        })
    : false;

  if (existing) {
    return {
      ok: true,
      marked: true,
      created: false,
      duplicate: true,
    };
  }

  sheet.appendRow([
    safeText_(eventId, 200),
    safeText_(messageId, 500),
    phone,
    takenAt,
    Utilities.formatDate(
      takenAt,
      CONFIG.timezone,
      "yyyy-MM-dd",
    ),
    safeText_(input.text, 500),
  ]);

  const leadsSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  const leadRow = leadsSheet
    ? findLeadRowByPhone_(leadsSheet, phone)
    : null;

  if (leadRow) {
    recordLeadMessageAndQueue_(
      spreadsheet,
      leadRow,
      {
        phone,
        contactAt: takenAt,
        messageId,
        eventId,
        text: safeText_(input.text, 4000),
      },
      "OUT",
    );
  }

  return {
    ok: true,
    marked: true,
    created: true,
    duplicate: false,
  };
}

function houveAtendimentoHumanoNoDia_(
  spreadsheet,
  phoneValue,
  referenceDate,
) {
  const phone = normalizePhone_(phoneValue);
  const sheet = spreadsheet.getSheetByName(
    CONFIG.humanTakeoverSheetName,
  );

  if (!phone || !sheet || sheet.getLastRow() < 2) {
    return false;
  }

  const localDate = Utilities.formatDate(
    referenceDate instanceof Date
      ? referenceDate
      : new Date(referenceDate || Date.now()),
    CONFIG.timezone,
    "yyyy-MM-dd",
  );
  const values = sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 3)
    .getDisplayValues();

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (
      normalizePhone_(values[index][0]) === phone &&
      String(values[index][2] || "").trim() === localDate
    ) {
      return true;
    }
  }

  return false;
}

function findProcessedEvent_(sheet, identifiers) {
  const uniqueIdentifiers = Array.from(
    new Set(
      identifiers
        .map(function normalizeIdentifier(value) {
          return String(value || "").trim();
        })
        .filter(Boolean),
    ),
  );

  if (!uniqueIdentifiers.length || sheet.getLastRow() < 2) {
    return null;
  }

  const range = sheet.getRange(
    2,
    1,
    sheet.getLastRow() - 1,
    2,
  );

  for (let index = 0; index < uniqueIdentifiers.length; index += 1) {
    const match = range
      .createTextFinder(uniqueIdentifiers[index])
      .matchEntireCell(true)
      .findNext();

    if (!match) continue;

    const leadRow = Number(
      sheet.getRange(match.getRow(), 5).getValue(),
    );

    return {
      eventRow: match.getRow(),
      leadRow: Number.isFinite(leadRow) && leadRow > 0
        ? leadRow
        : null,
    };
  }

  return null;
}

function recordProcessedEvent_(
  sheet,
  lead,
  leadRow,
  result,
) {
  const processedAt = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm:ss",
  );

  sheet.appendRow([
    lead.messageId,
    lead.eventId,
    lead.phone,
    processedAt,
    leadRow,
    result,
  ]);
}

function findExactDuplicateRow_(sheet, identifiers) {
  const uniqueIdentifiers = Array.from(
    new Set(
      identifiers
        .map(function normalizeIdentifier(value) {
          return String(value || "").trim();
        })
        .filter(Boolean),
    ),
  );

  if (!uniqueIdentifiers.length) return null;

  const range = sheet.getRange(
    2,
    15,
    Math.max(sheet.getMaxRows() - 1, 1),
    1,
  );

  for (let index = 0; index < uniqueIdentifiers.length; index += 1) {
    const match = range
      .createTextFinder(uniqueIdentifiers[index])
      .matchEntireCell(true)
      .findNext();

    if (match) return match.getRow();
  }

  return null;
}

function findLeadRowByPhone_(sheet, phone) {
  const lastRow = Math.max(sheet.getLastRow(), 2);

  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues();

  const normalizedPhone = normalizePhone_(phone);
  for (let index = 0; index < values.length; index += 1) {
    const rowPhone = normalizePhone_(values[index][0]);

    if (rowPhone && rowPhone === normalizedPhone) return index + 2;
  }

  return null;
}

function findRecentLeadRow_(sheet, phone) {
  return findLeadRowByPhone_(sheet, phone);
}

function mergeLeadIntoExistingRow_(sheet, row, lead) {
  const values = sheet.getRange(row, 1, 1, CONFIG.totalColumns).getDisplayValues()[0];
  const existingPlatform = String(values[19] || "").trim();
  const platformPriority = {
    "": 0,
    "Não identificada": 0,
    "WhatsApp direto": 1,
    "Orgânico/Conteúdo": 2,
    Meta: 3,
    Google: 4,
  };
  const existingPriority = platformPriority[existingPlatform] || 0;
  const incomingPriority = platformPriority[lead.platform] || 0;

  if (incomingPriority > existingPriority) {
    sheet.getRange(row, 2).setValue(lead.reference);
    sheet.getRange(row, 20).setValue(lead.platform);
    sheet.getRange(row, 25).setValue(lead.reference);
  }

  if (!values[10] && !values[11] && !values[12]) {
    if (lead.gclid) sheet.getRange(row, 11).setValue(lead.gclid);
    else if (lead.gbraid) sheet.getRange(row, 12).setValue(lead.gbraid);
    else if (lead.wbraid) sheet.getRange(row, 13).setValue(lead.wbraid);
  }

  SpreadsheetApp.flush();
}

function parseSheetContactDate_(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/,
  );

  if (!match) return null;

  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0,
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function findFirstAvailableRow_(sheet) {
  const maximumRows = sheet.getMaxRows();
  const values = sheet
    .getRange(2, 1, maximumRows - 1, 1)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (!String(values[index][0] || "").trim()) {
      return index + 2;
    }
  }

  sheet.insertRowsAfter(maximumRows, 100);
  return maximumRows + 1;
}

function writeLead_(sheet, row, lead, setStage) {
  const contactDateTime = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm",
  );

  const statusDate = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy",
  );

  // Persist the stable WhatsApp message ID first. If a later write
  // fails and YCloud retries, the same message is not appended again.
  setStage("write_identity");
  sheet.getRange(row, 15, 1, 3).setValues([[
    lead.messageId,
    "BRL",
    "Contato inicial recebido automaticamente pelo WhatsApp.",
  ]]);

  setStage("write_contact");
  sheet.getRange(row, 1, 1, 3).setValues([[
    contactDateTime,
    lead.reference,
    lead.phone,
  ]]);

  setStage("write_status");
  sheet.getRange(row, 5, 1, 3).setValues([[
    "Novo",
    statusDate,
    "Não",
  ]]);

  setStage("write_primary_consent");
  sheet.getRange(row, 10).setValue("Não informado");

  setStage("write_click_id");

  if (lead.gclid) {
    sheet.getRange(row, 11).setValue(lead.gclid);
  } else if (lead.gbraid) {
    sheet.getRange(row, 12).setValue(lead.gbraid);
  } else if (lead.wbraid) {
    sheet.getRange(row, 13).setValue(lead.wbraid);
  }

  setStage("write_origin");
  sheet.getRange(row, 19, 1, 2).setValues([[
    "WHATSAPP",
    lead.platform,
  ]]);

  setStage("write_destination");
  sheet.getRange(row, 24, 1, 2).setValues([[
    "WhatsApp",
    lead.reference,
  ]]);

  setStage("flush");
  SpreadsheetApp.flush();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
