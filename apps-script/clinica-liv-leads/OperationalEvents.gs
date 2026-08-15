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

const BOT_SLA_SUMMARY_SHEET = "_BOT_METRICAS";
const BOT_SLA_START_HOUR = 8;
const BOT_SLA_END_HOUR = 20;
const BOT_SLA_SUMMARY_HEADERS = Object.freeze([
  "Atualizado em",
  "Período (dias)",
  "Entradas inbound elegíveis",
  "Respostas mensuráveis",
  "Cobertura da primeira resposta",
  "Primeiras respostas automáticas",
  "Primeiras respostas humanas",
  "Mediana da primeira resposta (min úteis)",
  "P95 da primeira resposta (min úteis)",
  "Handoffs no período",
  "Pausas no período",
  "Fechamentos no período",
  "Janela do SLA",
  "Regra",
  "Entradas com rota válida",
  "Rotas pendentes",
  "Rotas inválidas",
  "Entradas não lead excluídas",
  "Cobertura de rota válida",
  "Gate cobertura SLA >=95%",
  "Gate rota válida >=99%",
  "P0/P1 vencidos",
  "Gate P0/P1",
  "Gate operacional",
  "Respostas anteriores ao inbound excluídas",
  "Respostas futuras excluídas",
  "Intervalos inválidos excluídos",
  "Entradas com data inválida excluídas",
]);

const BOT_SLA_VALID_ROUTE_STATUSES = Object.freeze([
  "resolved",
  "resolved_by_acquisition",
  "resolved_by_open_opportunity",
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

function minutosUteisSlaOperacional_(startedAt, finishedAt) {
  const start = parseDataEventoOperacional_(startedAt);
  const finish = parseDataEventoOperacional_(finishedAt);
  if (!start || !finish || finish.getTime() < start.getTime()) return null;
  if (finish.getTime() === start.getTime()) return 0;

  let totalMinutes = 0;
  const cursor = new Date(start.getTime());
  cursor.setHours(0, 0, 0, 0);
  const finalDay = new Date(finish.getTime());
  finalDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= finalDay.getTime()) {
    const windowStart = new Date(cursor.getTime());
    windowStart.setHours(BOT_SLA_START_HOUR, 0, 0, 0);
    const windowEnd = new Date(cursor.getTime());
    windowEnd.setHours(BOT_SLA_END_HOUR, 0, 0, 0);
    const overlapStart = Math.max(start.getTime(), windowStart.getTime());
    const overlapEnd = Math.min(finish.getTime(), windowEnd.getTime());
    if (overlapEnd > overlapStart) {
      totalMinutes += (overlapEnd - overlapStart) / 60000;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return totalMinutes;
}

function classificarRotaInboundSla_(row) {
  const result = String(row && row[5] || "").trim().toLowerCase();
  const opportunityId = String(row && row[6] || "").trim();
  const professional = String(row && row[7] || "").trim().toLowerCase();
  const routeStatus = String(row && row[8] || "").trim().toLowerCase();
  if (routeStatus === "nonlead" || result === "nonlead") return "nonlead";
  if (routeStatus === "pending" || result === "route_pending") return "pending";
  if (
    opportunityId &&
    ["amanda", "daniel"].includes(professional) &&
    BOT_SLA_VALID_ROUTE_STATUSES.includes(routeStatus)
  ) return "valid";
  return "invalid";
}

function gateCompostoSla_(states) {
  if (states.some(function failed(state) { return state === false; })) {
    return false;
  }
  return states.every(function passed(state) { return state === true; })
    ? true
    : null;
}

function rotuloGateSla_(value) {
  return value === true ? "APROVADO" : value === false ? "REPROVADO" : "N/D";
}

function valorMetricaSla_(value) {
  return value === null || value === undefined ||
    (typeof value === "number" && !Number.isFinite(value))
    ? "N/D"
    : value;
}

function auditarSlaOperacionalInterno_(spreadsheet, options) {
  const config = options && typeof options === "object" ? options : {};
  const now = parseDataEventoOperacional_(config.now) || new Date();
  const parsedDays = Number(config.periodDays);
  const periodDays = Number.isFinite(parsedDays) && parsedDays >= 1
    ? Math.min(90, Math.floor(parsedDays))
    : 7;
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const inboundSheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);
  const operationalSheet = spreadsheet.getSheetByName(
    CONFIG.operationalEventSheetName,
  );
  const result = {
    ok: true,
    inboundEvents: 0,
    validRouteEvents: 0,
    pendingRouteEvents: 0,
    invalidRouteEvents: 0,
    excludedNonLeadEvents: 0,
    invalidInboundDates: 0,
    routeCoverage: null,
    measurableResponses: 0,
    coverage: null,
    automaticResponses: 0,
    humanResponses: 0,
    medianMinutes: null,
    p95Minutes: null,
    handoffs: 0,
    pauses: 0,
    closures: 0,
    preInboundResponsesExcluded: 0,
    futureResponsesExcluded: 0,
    invalidResponseIntervals: 0,
    responseCoverageGate: null,
    routeCoverageGate: null,
    overdueP0P1: Number.isInteger(config.overdueP0P1) &&
      config.overdueP0P1 >= 0
      ? config.overdueP0P1
      : null,
    overdueP0P1Gate: null,
    operationalGate: null,
    periodDays,
    slaWindow: `${BOT_SLA_START_HOUR}:00-${BOT_SLA_END_HOUR}:00`,
  };
  result.overdueP0P1Gate = result.overdueP0P1 === null
    ? null
    : result.overdueP0P1 === 0;
  if (!inboundSheet || inboundSheet.getLastRow() < 2) {
    result.operationalGate = gateCompostoSla_([
      result.responseCoverageGate,
      result.routeCoverageGate,
      result.overdueP0P1Gate,
    ]);
    return result;
  }
  const inbound = {};
  inboundSheet
    .getRange(2, 1, inboundSheet.getLastRow() - 1, 9)
    .getValues()
    .forEach(function indexInbound(row) {
      const eventId = String(row[1] || "");
      const opportunityId = String(row[6] || "");
      const at = parseDataEventoOperacional_(row[3]);
      if (!eventId) return;
      if (!at) {
        result.invalidInboundDates += 1;
        return;
      }
      if (at.getTime() < cutoff.getTime() || at.getTime() > now.getTime()) {
        return;
      }
      const route = classificarRotaInboundSla_(row);
      if (route === "nonlead") {
        result.excludedNonLeadEvents += 1;
        return;
      }
      inbound[eventId] = { opportunityId, at, route };
    });
  result.inboundEvents = Object.keys(inbound).length;
  Object.keys(inbound).forEach(function countRoute(eventId) {
    const route = inbound[eventId].route;
    if (route === "valid") result.validRouteEvents += 1;
    else if (route === "pending") result.pendingRouteEvents += 1;
    else result.invalidRouteEvents += 1;
  });
  result.routeCoverage = result.inboundEvents
    ? result.validRouteEvents / result.inboundEvents
    : null;
  result.routeCoverageGate = result.routeCoverage === null
    ? null
    : result.routeCoverage >= 0.99;
  if (!operationalSheet) {
    result.coverage = null;
    result.responseCoverageGate = null;
    result.operationalGate = gateCompostoSla_([
      result.responseCoverageGate,
      result.routeCoverageGate,
      result.overdueP0P1Gate,
    ]);
    return result;
  }
  if (operationalSheet.getLastRow() < 2) {
    result.coverage = result.inboundEvents ? 0 : null;
    result.responseCoverageGate = result.coverage === null
      ? null
      : result.coverage >= 0.95;
    result.operationalGate = gateCompostoSla_([
      result.responseCoverageGate,
      result.routeCoverageGate,
      result.overdueP0P1Gate,
    ]);
    return result;
  }
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
      const inPeriod = at &&
        at.getTime() >= cutoff.getTime() &&
        at.getTime() <= now.getTime();
      if (inPeriod && type === "human_handoff_queued") result.handoffs += 1;
      if (inPeriod && type === "automation_paused") result.pauses += 1;
      if (inPeriod && type === "processing_closed") result.closures += 1;
      if (
        !inbound[parentEventId] ||
        !["automatic_reply_sent", "human_reply_sent"].includes(type)
      ) return;
      if (!at) {
        result.invalidResponseIntervals += 1;
        return;
      }
      if (at.getTime() > now.getTime()) {
        result.futureResponsesExcluded += 1;
        return;
      }
      if (at.getTime() < inbound[parentEventId].at.getTime()) {
        result.preInboundResponsesExcluded += 1;
        return;
      }
      const responseOpportunityId = String(row[2] || "").trim();
      if (
        responseOpportunityId &&
        inbound[parentEventId].opportunityId &&
        responseOpportunityId !== inbound[parentEventId].opportunityId
      ) {
        result.invalidResponseIntervals += 1;
        return;
      }
      const latency = minutosUteisSlaOperacional_(
        inbound[parentEventId].at,
        at,
      );
      if (latency === null) {
        result.invalidResponseIntervals += 1;
        return;
      }
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
    : null;
  result.responseCoverageGate = result.coverage === null
    ? null
    : result.coverage >= 0.95;
  result.automaticResponses = responses.filter(function automatic(response) {
    return response.type === "automatic_reply_sent";
  }).length;
  result.humanResponses = responses.length - result.automaticResponses;
  const latencies = responses.map(function latency(response) {
    return response.latency;
  });
  result.medianMinutes = percentileOperacional_(latencies, 0.5);
  result.p95Minutes = percentileOperacional_(latencies, 0.95);
  result.operationalGate = gateCompostoSla_([
    result.responseCoverageGate,
    result.routeCoverageGate,
    result.overdueP0P1Gate,
  ]);
  return result;
}

function auditarSlaOperacional(options) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  return auditarSlaOperacionalInterno_(spreadsheet, options || {});
}

function obterOuCriarResumoSlaOperacional_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(BOT_SLA_SUMMARY_SHEET);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(BOT_SLA_SUMMARY_SHEET);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  if (sheet.getMaxColumns() < BOT_SLA_SUMMARY_HEADERS.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      BOT_SLA_SUMMARY_HEADERS.length - sheet.getMaxColumns(),
    );
  }
  sheet
    .getRange(1, 1, 1, BOT_SLA_SUMMARY_HEADERS.length)
    .setValues([[...BOT_SLA_SUMMARY_HEADERS]]);
  return sheet;
}

function atualizarResumoSlaOperacionalInterno_(spreadsheet, options) {
  const audit = auditarSlaOperacionalInterno_(spreadsheet, options || {});
  const sheet = obterOuCriarResumoSlaOperacional_(spreadsheet);
  sheet.getRange(2, 1, 1, BOT_SLA_SUMMARY_HEADERS.length).setValues([[
    new Date(),
    audit.periodDays,
    audit.inboundEvents,
    audit.measurableResponses,
    valorMetricaSla_(audit.coverage),
    audit.automaticResponses,
    audit.humanResponses,
    valorMetricaSla_(audit.medianMinutes),
    valorMetricaSla_(audit.p95Minutes),
    audit.handoffs,
    audit.pauses,
    audit.closures,
    audit.slaWindow,
    "Denominador: inbound elegível, incluindo rota pendente e excluindo nonlead; intervalos inválidos são N/D; gates SLA >=95%, rota >=99% e P0/P1 vencidos = 0",
    audit.validRouteEvents,
    audit.pendingRouteEvents,
    audit.invalidRouteEvents,
    audit.excludedNonLeadEvents,
    valorMetricaSla_(audit.routeCoverage),
    rotuloGateSla_(audit.responseCoverageGate),
    rotuloGateSla_(audit.routeCoverageGate),
    valorMetricaSla_(audit.overdueP0P1),
    rotuloGateSla_(audit.overdueP0P1Gate),
    rotuloGateSla_(audit.operationalGate),
    audit.preInboundResponsesExcluded,
    audit.futureResponsesExcluded,
    audit.invalidResponseIntervals,
    audit.invalidInboundDates,
  ]]);
  return audit;
}

function atualizarResumoSlaOperacional(periodDays, overdueP0P1) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  return atualizarResumoSlaOperacionalInterno_(spreadsheet, {
    periodDays: periodDays || 7,
    overdueP0P1,
    now: new Date(),
  });
}
