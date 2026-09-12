const WHATSAPP_COST_HEADERS = Object.freeze([
  "Chave da mensagem",
  "External ID",
  "Status",
  "Tipo",
  "Template",
  "Categoria",
  "Modelo de cobrança",
  "Tipo de cobrança",
  "Preço",
  "Moeda",
  "Região",
  "Número comercial (hash)",
  "Origem da conversa",
  "Preço final?",
  "Enviado em",
  "Entregue em",
  "Lido em",
  "Atualizado em",
  "Finalidade",
  "Opportunity ID",
  "Profissional",
  "Campanha",
  "Fonte",
  "Criado em",
]);

const WHATSAPP_TEMPLATE_EVENT_HEADERS = Object.freeze([
  "Chave do evento",
  "Tipo",
  "Template",
  "Idioma",
  "Categoria",
  "Categoria anterior",
  "Status",
  "Qualidade",
  "Evento de atualização",
  "Requer ação?",
  "Ocorrido em",
  "Fonte",
  "Criado em",
]);

const WHATSAPP_MESSAGE_STATUS_RANK = Object.freeze({
  sent: 1,
  failed: 2,
  delivered: 3,
  read: 4,
});

function textoTecnicoCustoWhatsApp_(value, maximumLength) {
  const normalized = String(value || "").trim();
  if (!normalized || !/^[A-Za-z0-9_.:@/-]+$/.test(normalized)) return "";
  return normalized.slice(0, maximumLength || 160);
}

function chaveHashCustoWhatsApp_(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^sha256:[a-f0-9]{64}$/.test(normalized) ? normalized : "";
}

function dataIsoCustoWhatsApp_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function enumCustoWhatsApp_(value, allowed, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.indexOf(normalized) >= 0
    ? normalized
    : String(fallback || "");
}

function normalizarStatusMensagemYCloud_(input) {
  const providerMessageKey = chaveHashCustoWhatsApp_(
    input.providerMessageKey,
  );
  const status = enumCustoWhatsApp_(
    input.status,
    ["failed", "sent", "delivered", "read"],
    "",
  );
  if (!providerMessageKey || !status) {
    return { ok: false, error: "invalid_ycloud_message_status" };
  }

  const priceCandidate = Number(input.totalPrice);
  const hasPrice =
    input.totalPrice !== null &&
    input.totalPrice !== "" &&
    Number.isFinite(priceCandidate) &&
    priceCandidate >= 0 &&
    priceCandidate <= 1000000;
  const currency = String(input.currency || "").trim().toUpperCase();
  const finalPrice =
    input.finalPrice === true &&
    (status === "delivered" || status === "read") &&
    hasPrice;

  return {
    ok: true,
    providerMessageKey,
    externalId: textoTecnicoCustoWhatsApp_(input.externalId, 128),
    status,
    messageType: textoTecnicoCustoWhatsApp_(input.messageType, 40)
      .toLowerCase(),
    templateName: textoTecnicoCustoWhatsApp_(input.templateName, 160),
    pricingCategory: enumCustoWhatsApp_(
      input.pricingCategory,
      [
        "authentication",
        "authentication_international",
        "marketing",
        "otp",
        "service",
        "transactional",
        "utility",
        "unknown",
      ],
      "unknown",
    ),
    pricingModel: enumCustoWhatsApp_(
      input.pricingModel,
      ["cbp", "pmp", "unknown"],
      "unknown",
    ),
    pricingType: enumCustoWhatsApp_(
      input.pricingType,
      ["free_customer_service", "free_entry_point", "regular", "unknown"],
      "unknown",
    ),
    totalPrice: hasPrice ? priceCandidate : "",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "",
    regionCode: textoTecnicoCustoWhatsApp_(input.regionCode, 20)
      .toUpperCase(),
    businessNumberKey: chaveHashCustoWhatsApp_(input.businessNumberKey),
    conversationOrigin: textoTecnicoCustoWhatsApp_(
      input.conversationOrigin,
      80,
    ).toLowerCase(),
    finalPrice,
    sentAt: dataIsoCustoWhatsApp_(input.sentAt),
    deliveredAt: dataIsoCustoWhatsApp_(input.deliveredAt),
    readAt: dataIsoCustoWhatsApp_(input.readAt),
    updatedAt: dataIsoCustoWhatsApp_(input.updatedAt) ||
      new Date().toISOString(),
    purpose: enumCustoWhatsApp_(
      input.purpose,
      [
        "appointment_reminder",
        "internal_review_alert",
        "other_outbound",
        "patient_reply",
        "post_consult_care",
        "scheduled_followup",
      ],
      "other_outbound",
    ),
    source: input.source === "ycloud_message_updated"
      ? "ycloud_message_updated"
      : "ycloud_message_updated",
  };
}

function objetoLinhaCustoWhatsApp_(headers, row) {
  return (headers || []).reduce(function mapValue(result, header, index) {
    result[String(header || "").trim()] = row[index];
    return result;
  }, {});
}

function mesclarStatusMensagemYCloud_(existing, incoming, context, now) {
  const current = existing || {};
  const currentStatus = String(current["Status"] || "").toLowerCase();
  const incomingRank = WHATSAPP_MESSAGE_STATUS_RANK[incoming.status];
  const currentRank = Object.prototype.hasOwnProperty.call(
    WHATSAPP_MESSAGE_STATUS_RANK,
    currentStatus,
  )
    ? WHATSAPP_MESSAGE_STATUS_RANK[currentStatus]
    : -1;
  const keepsCurrentStatus = currentRank > incomingRank;
  const alreadyFinal = current["Preço final?"] === true ||
    String(current["Preço final?"]).toLowerCase() === "true";
  const acceptsIncomingPrice = incoming.finalPrice || !alreadyFinal;

  function preferIncoming(field, value) {
    return value !== "" && value !== null && value !== undefined
      ? value
      : Object.prototype.hasOwnProperty.call(current, field)
        ? current[field]
        : "";
  }
  const currentPrice = Object.prototype.hasOwnProperty.call(current, "Preço")
    ? current["Preço"]
    : "";
  const mergedCategory =
    incoming.pricingCategory === "unknown" &&
    current["Categoria"] &&
    current["Categoria"] !== "unknown"
      ? current["Categoria"]
      : incoming.pricingCategory;

  return {
    "Chave da mensagem": incoming.providerMessageKey,
    "External ID": preferIncoming("External ID", incoming.externalId),
    "Status": keepsCurrentStatus ? currentStatus : incoming.status,
    "Tipo": preferIncoming("Tipo", incoming.messageType),
    "Template": preferIncoming("Template", incoming.templateName),
    "Categoria": preferIncoming("Categoria", mergedCategory),
    "Modelo de cobrança": preferIncoming(
      "Modelo de cobrança",
      incoming.pricingModel === "unknown" ? "" : incoming.pricingModel,
    ),
    "Tipo de cobrança": preferIncoming(
      "Tipo de cobrança",
      incoming.pricingType === "unknown" ? "" : incoming.pricingType,
    ),
    "Preço": acceptsIncomingPrice && incoming.totalPrice !== ""
      ? incoming.totalPrice
      : currentPrice,
    "Moeda": preferIncoming("Moeda", incoming.currency),
    "Região": preferIncoming("Região", incoming.regionCode),
    "Número comercial (hash)": preferIncoming(
      "Número comercial (hash)",
      incoming.businessNumberKey,
    ),
    "Origem da conversa": preferIncoming(
      "Origem da conversa",
      incoming.conversationOrigin,
    ),
    "Preço final?": alreadyFinal || incoming.finalPrice,
    "Enviado em": preferIncoming("Enviado em", incoming.sentAt),
    "Entregue em": preferIncoming("Entregue em", incoming.deliveredAt),
    "Lido em": preferIncoming("Lido em", incoming.readAt),
    "Atualizado em": preferIncoming("Atualizado em", incoming.updatedAt),
    "Finalidade": preferIncoming("Finalidade", incoming.purpose),
    "Opportunity ID": preferIncoming(
      "Opportunity ID",
      context.opportunityId,
    ),
    "Profissional": preferIncoming("Profissional", context.professional),
    "Campanha": preferIncoming("Campanha", context.campaign),
    "Fonte": incoming.source,
    "Criado em": current["Criado em"] || dataIsoCustoWhatsApp_(now),
  };
}

function garantirPlanilhaTecnicaCustoWhatsApp_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns(),
    );
  }
  if (typeof garantirCabecalhosAditivos_ === "function") {
    garantirCabecalhosAditivos_(sheet, headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function encontrarLinhaPorChaveCustoWhatsApp_(sheet, key) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0] || "").trim() === key) return index + 2;
  }
  return 0;
}

function contextoEventoCustoWhatsApp_(spreadsheet, externalId) {
  const result = { opportunityId: "", professional: "", campaign: "" };
  const normalized = String(externalId || "");
  if (!normalized.startsWith("liv-reply-")) return result;
  const eventId = normalized.slice("liv-reply-".length);
  if (!eventId || eventId.startsWith("scheduled-followup-")) return result;
  const sheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);
  if (!sheet || sheet.getLastRow() < 2) return result;
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(function trimHeader(value) { return String(value || "").trim(); });
  const eventColumn = headers.indexOf("Event ID");
  if (eventColumn < 0) return result;
  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getDisplayValues();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (String(rows[index][eventColumn] || "").trim() !== eventId) continue;
    const row = objetoLinhaCustoWhatsApp_(headers, rows[index]);
    result.opportunityId = String(row["Opportunity ID"] || "").trim();
    result.professional = String(row["Profissional"] || "").trim();
    result.campaign = String(
      row["Campanha inicial da jornada"] ||
        row["Campanha da conversa atual"] ||
        "",
    ).trim();
    return result;
  }
  return result;
}

function contextoConsultaCustoWhatsApp_(spreadsheet, externalId) {
  const result = { opportunityId: "", professional: "", campaign: "" };
  const normalized = String(externalId || "");
  let appointmentId = "";
  if (normalized.startsWith("liv-post-consult-")) {
    appointmentId = normalized.slice("liv-post-consult-".length);
  } else if (normalized.startsWith("liv-appointment-")) {
    appointmentId = normalized
      .slice("liv-appointment-".length)
      .replace(/-(48h|same_day)$/, "");
  }
  if (!appointmentId) return result;
  const sheet = spreadsheet.getSheetByName("Consultas");
  if (!sheet || sheet.getLastRow() < 2) return result;
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(function trimHeader(value) { return String(value || "").trim(); });
  const idColumn = headers.indexOf("ID da consulta");
  if (idColumn < 0) return result;
  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getDisplayValues();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (String(rows[index][idColumn] || "").trim() !== appointmentId) continue;
    const row = objetoLinhaCustoWhatsApp_(headers, rows[index]);
    result.opportunityId = String(row["Opportunity ID"] || "").trim();
    result.professional = String(row["Profissional"] || "").trim();
    return result;
  }
  return result;
}

function resolverContextoCustoWhatsApp_(spreadsheet, externalId) {
  const eventContext = contextoEventoCustoWhatsApp_(spreadsheet, externalId);
  if (
    eventContext.opportunityId ||
    eventContext.professional ||
    eventContext.campaign
  ) return eventContext;
  return contextoConsultaCustoWhatsApp_(spreadsheet, externalId);
}

function registrarStatusMensagemYCloud_(input, spreadsheetOverride) {
  const normalized = normalizarStatusMensagemYCloud_(input || {});
  if (!normalized.ok) return normalized;
  const spreadsheet = spreadsheetOverride || SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = garantirPlanilhaTecnicaCustoWhatsApp_(
    spreadsheet,
    CONFIG.whatsappCostSheetName || "_WHATSAPP_CUSTOS",
    WHATSAPP_COST_HEADERS,
  );
  const rowNumber = encontrarLinhaPorChaveCustoWhatsApp_(
    sheet,
    normalized.providerMessageKey,
  );
  const existing = rowNumber
    ? objetoLinhaCustoWhatsApp_(
        WHATSAPP_COST_HEADERS,
        sheet
          .getRange(rowNumber, 1, 1, WHATSAPP_COST_HEADERS.length)
          .getValues()[0],
      )
    : {};
  const context = resolverContextoCustoWhatsApp_(
    spreadsheet,
    normalized.externalId,
  );
  const merged = mesclarStatusMensagemYCloud_(
    existing,
    normalized,
    context,
    new Date(),
  );
  const values = WHATSAPP_COST_HEADERS.map(function valueForHeader(header) {
    return merged[header];
  });

  if (rowNumber) {
    sheet
      .getRange(rowNumber, 1, 1, WHATSAPP_COST_HEADERS.length)
      .setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return {
    ok: true,
    inserted: !rowNumber,
    updated: Boolean(rowNumber),
    duplicate: Boolean(rowNumber),
    finalPrice: merged["Preço final?"] === true,
  };
}

function normalizarEventoTemplateYCloud_(input) {
  const eventKey = chaveHashCustoWhatsApp_(input.eventKey);
  const type = enumCustoWhatsApp_(input.type, [
    "whatsapp.template.category_updated",
    "whatsapp.template.quality_updated",
    "whatsapp.template.reviewed",
  ], "");
  const templateName = textoTecnicoCustoWhatsApp_(input.templateName, 160);
  if (!eventKey || !type || !templateName) {
    return { ok: false, error: "invalid_ycloud_template_event" };
  }
  return {
    ok: true,
    eventKey,
    type,
    templateName,
    language: textoTecnicoCustoWhatsApp_(input.language, 24),
    category: textoTecnicoCustoWhatsApp_(input.category, 40).toLowerCase(),
    previousCategory: textoTecnicoCustoWhatsApp_(
      input.previousCategory,
      40,
    ).toLowerCase(),
    status: textoTecnicoCustoWhatsApp_(input.status, 40).toLowerCase(),
    qualityRating: textoTecnicoCustoWhatsApp_(
      input.qualityRating,
      40,
    ).toLowerCase(),
    statusUpdateEvent: textoTecnicoCustoWhatsApp_(
      input.statusUpdateEvent,
      80,
    ).toLowerCase(),
    actionRequired: input.actionRequired === true,
    occurredAt: dataIsoCustoWhatsApp_(input.occurredAt),
    source: "ycloud_template_event",
  };
}

function registrarEventoTemplateYCloud_(input, spreadsheetOverride) {
  const normalized = normalizarEventoTemplateYCloud_(input || {});
  if (!normalized.ok) return normalized;
  const spreadsheet = spreadsheetOverride || SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = garantirPlanilhaTecnicaCustoWhatsApp_(
    spreadsheet,
    CONFIG.whatsappTemplateEventSheetName || "_WHATSAPP_TEMPLATE_EVENTOS",
    WHATSAPP_TEMPLATE_EVENT_HEADERS,
  );
  const rowNumber = encontrarLinhaPorChaveCustoWhatsApp_(
    sheet,
    normalized.eventKey,
  );
  if (rowNumber) {
    return { ok: true, inserted: false, duplicate: true };
  }
  const createdAt = new Date().toISOString();
  const values = {
    "Chave do evento": normalized.eventKey,
    "Tipo": normalized.type,
    "Template": normalized.templateName,
    "Idioma": normalized.language,
    "Categoria": normalized.category,
    "Categoria anterior": normalized.previousCategory,
    "Status": normalized.status,
    "Qualidade": normalized.qualityRating,
    "Evento de atualização": normalized.statusUpdateEvent,
    "Requer ação?": normalized.actionRequired,
    "Ocorrido em": normalized.occurredAt,
    "Fonte": normalized.source,
    "Criado em": createdAt,
  };
  sheet.appendRow(WHATSAPP_TEMPLATE_EVENT_HEADERS.map(function value(header) {
    return values[header];
  }));
  return { ok: true, inserted: true, duplicate: false };
}

function resumirCustosWhatsAppLinhas_(headers, rows, options) {
  const period = String(options && options.month || "").trim();
  const unique = {};
  (rows || []).forEach(function keepLatest(row) {
    const item = objetoLinhaCustoWhatsApp_(headers, row);
    const key = String(item["Chave da mensagem"] || "").trim();
    if (key) unique[key] = item;
  });
  const groups = {};
  Object.keys(unique).forEach(function aggregate(key) {
    const item = unique[key];
    const occurredAt = String(
      item["Entregue em"] || item["Atualizado em"] || "",
    );
    if (period && occurredAt.slice(0, 7) !== period) return;
    const status = String(item["Status"] || "").toLowerCase();
    if (status !== "delivered" && status !== "read") return;
    const business = String(item["Número comercial (hash)"] || "unknown");
    const category = String(item["Categoria"] || "unknown").toLowerCase();
    const pricingModel = String(
      item["Modelo de cobrança"] || "unknown",
    ).toLowerCase();
    const pricingType = String(
      item["Tipo de cobrança"] || "unknown",
    ).toLowerCase();
    const currency = String(item["Moeda"] || "N/D").toUpperCase();
    const groupKey = [
      business,
      category,
      pricingModel,
      pricingType,
      currency,
    ].join("|");
    if (!groups[groupKey]) {
      groups[groupKey] = {
        businessNumberKey: business,
        category,
        pricingModel,
        pricingType,
        currency,
        deliveredMessages: 0,
        finalCost: 0,
        missingFinalPrice: 0,
      };
    }
    const group = groups[groupKey];
    group.deliveredMessages += 1;
    const price = Number(item["Preço"]);
    const finalPrice = item["Preço final?"] === true ||
      String(item["Preço final?"]).toLowerCase() === "true";
    if (finalPrice && Number.isFinite(price) && price >= 0) {
      group.finalCost += price;
    } else {
      group.missingFinalPrice += 1;
    }
  });
  const output = Object.keys(groups).sort().map(function finalize(key) {
    const group = groups[key];
    return {
      ...group,
      serviceFreeTierReference: group.category === "service" ? 1000 : 0,
      serviceMessagesAboveReference:
        group.category === "service"
          ? Math.max(0, group.deliveredMessages - 1000)
          : 0,
    };
  });
  return { ok: true, month: period || "all", groups: output };
}

function diagnosticarCustosWhatsApp(options) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(
    CONFIG.whatsappCostSheetName || "_WHATSAPP_CUSTOS",
  );
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: true, month: String(options && options.month || "all"), groups: [] };
  }
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];
  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getValues();
  return resumirCustosWhatsAppLinhas_(headers, rows, options || {});
}
