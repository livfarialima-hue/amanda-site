const OPERATIONAL_EVENT_HEADERS = Object.freeze([
  "Event ID",
  "Parent Event ID",
  "Opportunity ID",
  "Tipo",
  "Autoria",
  "Data e hora",
  "Resultado",
  "Criado em",
]);

const OPERATIONAL_EVENT_TYPES = Object.freeze([
  "automatic_reply_sent",
  "human_reply_sent",
  "human_handoff_queued",
  "automation_paused",
  "processing_closed",
]);

function obterOuCriarEventosOperacionais_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.operationalEventSheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.operationalEventSheetName);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  garantirCabecalhosAditivos_(sheet, OPERATIONAL_EVENT_HEADERS);
  sheet
    .getRange(1, 1, 1, OPERATIONAL_EVENT_HEADERS.length)
    .setValues([[...OPERATIONAL_EVENT_HEADERS]]);
  return sheet;
}

function normalizarEventoOperacional_(input) {
  const eventId = boundedText_(input && input.eventId, 220);
  const parentEventId = boundedText_(input && input.parentEventId, 220);
  const type = boundedText_(input && input.type, 80);
  const source = boundedText_(input && input.source, 80);
  const outcome = boundedText_(input && input.outcome, 120);
  const at = new Date(input && input.at || Date.now());
  if (!eventId) return { ok: false, reason: "event_id_required" };
  if (OPERATIONAL_EVENT_TYPES.indexOf(type) < 0) {
    return { ok: false, reason: "invalid_operational_event_type" };
  }
  if (!source) return { ok: false, reason: "source_required" };
  if (Number.isNaN(at.getTime())) {
    return { ok: false, reason: "invalid_operational_event_date" };
  }
  return {
    ok: true,
    eventId,
    parentEventId,
    opportunityId: boundedText_(input && input.opportunityId, 120),
    phone: normalizePhone_(input && input.phone),
    professional: boundedText_(input && input.professional, 80),
    type,
    source,
    at,
    outcome,
  };
}

function resolverOportunidadeEventoOperacional_(spreadsheet, event) {
  if (event.opportunityId) {
    const resolution = resolverOportunidadeCanonica_(spreadsheet, {
      opportunityId: event.opportunityId,
    });
    return resolution.ok
      ? {
          ok: true,
          opportunityId: String(resolution.found.values[0] || ""),
          professional: normalizarProfissionalOportunidade_(
            resolution.found.values[3],
          ),
        }
      : resolution;
  }
  const context = localizarContextoRotaUnicoPorTelefone_(
    spreadsheet,
    event.phone,
  );
  if (!context) return { ok: false, reason: "opportunity_identity_required" };
  if (
    event.professional &&
    normalizarProfissionalOportunidade_(event.professional) !==
      context.professional
  ) {
    return { ok: false, reason: "professional_conflict" };
  }
  return {
    ok: true,
    opportunityId: context.opportunityId,
    professional: context.professional,
  };
}

function registrarEventoOperacionalInterno_(spreadsheet, input) {
  const event = normalizarEventoOperacional_(input || {});
  if (!event.ok) return event;
  const identity = resolverOportunidadeEventoOperacional_(
    spreadsheet,
    event,
  );
  if (!identity.ok) return identity;
  const sheet = obterOuCriarEventosOperacionais_(spreadsheet);
  const duplicateKey = event.eventId + "|" + event.type;
  if (sheet.getLastRow() >= 2) {
    const duplicate = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 4)
      .getDisplayValues()
      .some(function sameEvent(row) {
        return String(row[0] || "") + "|" + String(row[3] || "") ===
          duplicateKey;
      });
    if (duplicate) {
      return {
        ok: true,
        created: false,
        duplicate: true,
        opportunityId: identity.opportunityId,
      };
    }
  }
  sheet.appendRow([
    event.eventId,
    event.parentEventId,
    identity.opportunityId,
    event.type,
    event.source,
    event.at,
    event.outcome,
    new Date(),
  ]);
  return {
    ok: true,
    created: true,
    duplicate: false,
    opportunityId: identity.opportunityId,
  };
}

function registrarEventoOperacional_(input) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  return registrarEventoOperacionalInterno_(spreadsheet, input);
}

function encontrarUltimoEventoEntradaOportunidade_(
  spreadsheet,
  opportunityId,
  before,
) {
  const sheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);
  if (!sheet || sheet.getLastRow() < 2 || !opportunityId) return "";
  const limit = before instanceof Date ? before.getTime() : Date.now();
  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 9)
    .getValues();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const at = parseDataEventoOperacional_(row[3]);
    if (
      String(row[6] || "") === String(opportunityId) &&
      at &&
      at.getTime() <= limit
    ) {
      return String(row[1] || "");
    }
  }
  return "";
}

function parseDataEventoOperacional_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value || "").trim();
  const brazilian = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (brazilian) {
    const parsed = new Date(
      Number(brazilian[3]),
      Number(brazilian[2]) - 1,
      Number(brazilian[1]),
      Number(brazilian[4]),
      Number(brazilian[5]),
      Number(brazilian[6] || 0),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function percentileOperacional_(values, percentile) {
  if (!values.length) return null;
  const sorted = values.slice().sort(function ascending(left, right) {
    return left - right;
  });
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * percentile) - 1),
  );
  return sorted[index];
}

function auditarSlaOperacional() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const inboundSheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);
  const operationalSheet = spreadsheet.getSheetByName(
    CONFIG.operationalEventSheetName,
  );
  const result = {
    ok: true,
    inboundEvents: 0,
    measurableResponses: 0,
    coverage: 0,
    automaticResponses: 0,
    humanResponses: 0,
    medianMinutes: null,
    p95Minutes: null,
    handoffs: 0,
  };
  if (!inboundSheet || inboundSheet.getLastRow() < 2) return result;
  const inbound = {};
  inboundSheet
    .getRange(2, 1, inboundSheet.getLastRow() - 1, 9)
    .getValues()
    .forEach(function indexInbound(row) {
      const eventId = String(row[1] || "");
      const opportunityId = String(row[6] || "");
      const at = parseDataEventoOperacional_(row[3]);
      if (!eventId || !opportunityId || !at) return;
      inbound[eventId] = { opportunityId, at };
    });
  result.inboundEvents = Object.keys(inbound).length;
  if (!operationalSheet || operationalSheet.getLastRow() < 2) return result;
  const firstResponse = {};
  operationalSheet
    .getRange(
      2,
      1,
      operationalSheet.getLastRow() - 1,
      OPERATIONAL_EVENT_HEADERS.length,
    )
    .getValues()
    .forEach(function inspectEvent(row) {
      const parentEventId = String(row[1] || "");
      const type = String(row[3] || "");
      const at = parseDataEventoOperacional_(row[5]);
      if (type === "human_handoff_queued") result.handoffs += 1;
      if (
        !inbound[parentEventId] ||
        !at ||
        !["automatic_reply_sent", "human_reply_sent"].includes(type)
      ) return;
      const latency = Math.max(
        0,
        (at.getTime() - inbound[parentEventId].at.getTime()) / 60000,
      );
      if (
        !firstResponse[parentEventId] ||
        at < firstResponse[parentEventId].at
      ) {
        firstResponse[parentEventId] = { at, latency, type };
      }
    });
  const responses = Object.keys(firstResponse).map(function response(key) {
    return firstResponse[key];
  });
  result.measurableResponses = responses.length;
  result.coverage = result.inboundEvents
    ? responses.length / result.inboundEvents
    : 0;
  result.automaticResponses = responses.filter(function automatic(response) {
    return response.type === "automatic_reply_sent";
  }).length;
  result.humanResponses = responses.length - result.automaticResponses;
  const latencies = responses.map(function latency(response) {
    return response.latency;
  });
  result.medianMinutes = percentileOperacional_(latencies, 0.5);
  result.p95Minutes = percentileOperacional_(latencies, 0.95);
  return result;
}
