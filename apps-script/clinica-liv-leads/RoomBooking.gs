const ROOM_BOOKING_CONFIG = Object.freeze({
  accessTokenSha256:
    "0b1dd5dd0ba3a24d8d37533c9c45f81ee55de249436edbb539ff344e553026a7",
  allowedProfessionalKeys: Object.freeze([
    "amanda",
    "henrique",
    "marina",
    "laerte",
    "daniel",
  ]),
  allowedDurations: Object.freeze([30, 60, 90, 120]),
  allowedConsultationTypes: Object.freeze([
    "Primeira consulta",
    "Retorno",
    "Pré-operatório",
    "Pós-operatório",
    "Outro",
  ]),
  maximumAdvanceDays: 365,
});

function renderFormularioReservaSalas_(accessToken) {
  if (!tokenFormularioReservaSalasValido_(accessToken)) {
    return HtmlService.createHtmlOutput(
      "<!doctype html><html lang=\"pt-BR\"><head>" +
        "<meta charset=\"utf-8\"><meta name=\"viewport\" " +
        "content=\"width=device-width,initial-scale=1\">" +
        "<title>Link inválido</title></head><body style=\"font-family:" +
        "Arial,sans-serif;padding:32px;color:#25312c\">" +
        "<h1 style=\"font-size:24px\">Link inválido</h1>" +
        "<p>Peça à Clínica LIV o link atualizado para reservar uma sala.</p>" +
        "</body></html>",
    ).setTitle("Link inválido — Clínica LIV");
  }

  const template = HtmlService.createTemplateFromFile(
    "RoomBookingForm",
  );
  template.accessToken = String(accessToken || "");

  return template
    .evaluate()
    .setTitle("Reserva de sala — Clínica LIV")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function tokenFormularioReservaSalasValido_(value) {
  const actual = hashSha256FormularioReservaSalas_(value);
  const expected = ROOM_BOOKING_CONFIG.accessTokenSha256;

  if (!actual || actual.length !== expected.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

function hashSha256FormularioReservaSalas_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ""),
    Utilities.Charset.UTF_8,
  );

  return bytes
    .map(function (byte) {
      return (byte < 0 ? byte + 256 : byte)
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}

function profissionalFormularioReservaSalas_(value) {
  const key = chaveProfissionalConsulta_(value);
  const names = {
    amanda: "Dra. Amanda",
    henrique: "Dr. Henrique",
    marina: "Dra. Marina",
    laerte: "Dr. Laerte",
    daniel: "Dr. Daniel",
  };

  return ROOM_BOOKING_CONFIG.allowedProfessionalKeys.includes(key)
    ? names[key]
    : "";
}

function duracaoFormularioReservaSalas_(value) {
  const duration = Number(value);
  return ROOM_BOOKING_CONFIG.allowedDurations.includes(duration)
    ? duration
    : 60;
}

function tipoConsultaFormularioReservaSalas_(value) {
  const type = textoConsultasSync_(value, 60);
  return ROOM_BOOKING_CONFIG.allowedConsultationTypes.includes(type)
    ? type
    : "Outro";
}

function validarHorarioFormularioReservaSalas_(input, now) {
  const scheduledDate = extrairDataConsultasSync_(
    input && input.scheduledDate,
  );
  const scheduledTime = extrairHorarioConsultasSync_(
    input && input.scheduledTime,
  );
  const durationMinutes = duracaoFormularioReservaSalas_(
    input && input.durationMinutes,
  );
  const interval = intervaloConsultaAgenda_(
    scheduledDate,
    scheduledTime,
    durationMinutes,
  );

  if (!interval) {
    return { ok: false, error: "invalid_schedule" };
  }

  const reference = now instanceof Date ? now : new Date();
  const maximum = new Date(
    reference.getTime() +
      ROOM_BOOKING_CONFIG.maximumAdvanceDays * 24 * 60 * 60 * 1000,
  );

  if (interval.start.getTime() <= reference.getTime()) {
    return { ok: false, error: "past_schedule" };
  }
  if (interval.start.getTime() > maximum.getTime()) {
    return { ok: false, error: "schedule_too_far" };
  }

  return {
    ok: true,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    start: interval.start,
    end: interval.end,
  };
}

function reservarSalaPeloFormulario(input) {
  if (!tokenFormularioReservaSalasValido_(input && input.accessToken)) {
    return { ok: false, error: "invalid_link" };
  }

  const professional = profissionalFormularioReservaSalas_(
    input && input.professional,
  );
  if (!professional) {
    return { ok: false, error: "invalid_professional" };
  }

  const schedule = validarHorarioFormularioReservaSalas_(
    input || {},
    new Date(),
  );
  if (!schedule.ok) return schedule;

  const consultationType = tipoConsultaFormularioReservaSalas_(
    input && input.consultationType,
  );
  const patientName = textoConsultasSync_(
    input && input.patientName,
    120,
  );

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, error: "busy_retry" };
  }

  let event = null;

  try {
    const selection = escolherSalaDisponivelConsulta_({
      professional,
      consultationType,
      location: "Clínica LIV",
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      durationMinutes: schedule.durationMinutes,
    });

    if (!selection.ok) {
      return { ok: false, error: selection.error };
    }

    event = selection.calendar.createEvent(
      "Consulta — " + professional,
      selection.start,
      selection.end,
      {
        description:
          "Reserva realizada pelo formulário da Clínica LIV. " +
          "Nenhum dado de paciente é incluído no Google Agenda.",
        location: "Clínica LIV Faria Lima — " + selection.room,
      },
    );

    const spreadsheet = SpreadsheetApp.openById(
      CONSULTAS_SYNC_CONFIG.spreadsheetId,
    );
    const sheet = spreadsheet.getSheetByName(
      CONSULTAS_SYNC_CONFIG.consultationsSheetName,
    );
    if (!sheet) throw new Error("consultations_sheet_missing");

    garantirEstruturaSincronizacaoConsultas_(sheet);
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0];
    const columns = mapearCabecalhosConsultas_(headers);
    const rowNumber = primeiraLinhaLivreConsultas_(sheet, columns);
    const appointmentId =
      "sala_form_" + Utilities.getUuid().replace(/-/g, "");
    const notes = textoConsultasSync_(
      input && input.notes,
      240,
    );

    [
      [CONSULTAS_SYNC_HEADERS.id, appointmentId],
      [CONSULTAS_SYNC_HEADERS.professional, professional],
      [CONSULTAS_SYNC_HEADERS.room, selection.room],
      [CONSULTAS_SYNC_HEADERS.name, patientName],
      [CONSULTAS_SYNC_HEADERS.consultationType, consultationType],
      [CONSULTAS_SYNC_HEADERS.topic, "Reserva de sala"],
      [
        CONSULTAS_SYNC_HEADERS.location,
        "Clínica LIV",
      ],
      [
        CONSULTAS_SYNC_HEADERS.scheduledDate,
        schedule.scheduledDate,
      ],
      [
        CONSULTAS_SYNC_HEADERS.scheduledTime,
        schedule.scheduledTime,
      ],
      [
        CONSULTAS_SYNC_HEADERS.durationMinutes,
        schedule.durationMinutes,
      ],
      [CONSULTAS_SYNC_HEADERS.status, "Agendada"],
      [
        CONSULTAS_SYNC_HEADERS.source,
        "WhatsApp direto",
      ],
      [CONSULTAS_SYNC_HEADERS.notes, notes],
      [CONSULTAS_SYNC_HEADERS.calendarId, selection.calendarId],
      [CONSULTAS_SYNC_HEADERS.calendarEventId, event.getId()],
      [
        CONSULTAS_SYNC_HEADERS.calendarSyncStatus,
        "Sincronizado",
      ],
      [CONSULTAS_SYNC_HEADERS.calendarSyncError, ""],
    ].forEach(function (entry) {
      definirValorConsulta_(
        sheet,
        rowNumber,
        columns,
        entry[0],
        entry[1],
      );
    });
    SpreadsheetApp.flush();

    return {
      ok: true,
      appointmentId,
      professional,
      room: selection.room,
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      durationMinutes: schedule.durationMinutes,
      formattedDate: Utilities.formatDate(
        selection.start,
        CONSULTAS_SYNC_CONFIG.timezone,
        "dd/MM/yyyy",
      ),
    };
  } catch (error) {
    if (event) {
      try {
        event.deleteEvent();
      } catch (rollbackError) {
        console.error(rollbackError);
      }
    }
    console.error(error && error.stack ? error.stack : error);
    return { ok: false, error: "reservation_failed" };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
