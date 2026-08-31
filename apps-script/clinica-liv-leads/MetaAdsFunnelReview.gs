const META_ADS_FUNNEL_REVIEW_CONFIG = Object.freeze({
  sourceSheet: "_FUNIL_CANONICO",
  milestoneSheet: "_OPORTUNIDADE_MARCOS",
  aggregateSpreadsheetId: "1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0",
  aggregateSheet: "Meta_Agregados",
  timeZone: "America/Sao_Paulo",
  triggerHour: 8,
  triggerMinute: 25,
  windows: [7, 30, 90],
});

const META_ADS_CAMPAIGN_REGISTRY = Object.freeze({
  M26F01W: Object.freeze({ path: "meta_whatsapp_direct", campaign: "M26F01W" }),
  M26F02S: Object.freeze({ path: "meta_site_whatsapp", campaign: "M26F02S" }),
  M26C01W: Object.freeze({ path: "meta_whatsapp_direct", campaign: "M26C01W" }),
  M26C02S: Object.freeze({ path: "meta_site_whatsapp", campaign: "M26C02S" }),
});

const META_ADS_FUNNEL_AGGREGATE_HEADERS = Object.freeze([
  "schema_version",
  "generated_at",
  "window_days",
  "window_start",
  "window_end",
  "journey_path",
  "campaign_code",
  "creative_code",
  "contacts_identified",
  "contacts_classified",
  "valid_contacts_classified",
  "qualified_or_later",
  "scheduled_or_later",
  "completed_or_later",
  "patient_converted",
  "procedure_closed_milestone",
  "canonical_path_attribution",
  "unknown_path_attribution",
  "source_rows",
  "definition_note",
]);

/**
 * Publica somente contagens anônimas. Nenhum identificador de paciente deixa
 * a planilha operacional. Códigos desconhecidos ou conflitantes não são
 * reinterpretados por procedimento, texto ou semelhança.
 */
function publicarAgregadosFunilMetaAds() {
  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sourceSheet = sourceSpreadsheet.getSheetByName(
    META_ADS_FUNNEL_REVIEW_CONFIG.sourceSheet,
  );
  if (!sourceSheet) throw new Error("meta_ads_funnel_source_missing");

  const milestoneSheet = sourceSpreadsheet.getSheetByName(
    META_ADS_FUNNEL_REVIEW_CONFIG.milestoneSheet,
  );
  const rows = construirAgregadosFunilMetaAds_(
    sourceSheet.getDataRange().getValues(),
    milestoneSheet ? milestoneSheet.getDataRange().getValues() : [],
    new Date(),
  );

  const targetSpreadsheet = SpreadsheetApp.openById(
    META_ADS_FUNNEL_REVIEW_CONFIG.aggregateSpreadsheetId,
  );
  let targetSheet = targetSpreadsheet.getSheetByName(
    META_ADS_FUNNEL_REVIEW_CONFIG.aggregateSheet,
  );
  if (!targetSheet) {
    targetSheet = targetSpreadsheet.insertSheet(
      META_ADS_FUNNEL_REVIEW_CONFIG.aggregateSheet,
    );
  }

  targetSheet.clearContents();
  targetSheet
    .getRange(1, 1, rows.length + 1, META_ADS_FUNNEL_AGGREGATE_HEADERS.length)
    .setValues([META_ADS_FUNNEL_AGGREGATE_HEADERS.slice(), ...rows]);
  targetSheet.setFrozenRows(1);
  SpreadsheetApp.flush();

  return {
    ok: true,
    rows: rows.length,
    generatedAt: rows.length ? rows[0][1] : null,
    containsPii: false,
  };
}

function configurarRotinaAgregadosFunilMetaAds() {
  const handler = "publicarAgregadosFunilMetaAds";
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === handler) ScriptApp.deleteTrigger(trigger);
  });
  const trigger = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyDays(1)
    .atHour(META_ADS_FUNNEL_REVIEW_CONFIG.triggerHour)
    .nearMinute(META_ADS_FUNNEL_REVIEW_CONFIG.triggerMinute)
    .inTimezone(META_ADS_FUNNEL_REVIEW_CONFIG.timeZone)
    .create();
  return {
    ok: true,
    handler,
    triggerId: trigger.getUniqueId(),
    schedule: "diário, aproximadamente 08:25 BRT",
  };
}

function construirAgregadosFunilMetaAds_(sourceValues, milestoneValues, now) {
  if (!Array.isArray(sourceValues) || sourceValues.length < 1) {
    throw new Error("meta_ads_funnel_source_unreadable");
  }
  const headers = sourceValues[0].map((value) => String(value || "").trim());
  const indexes = indexarCabecalhosAgregadoMetaAds_(headers);
  [
    "Opportunity ID",
    "Profissional",
    "Estado",
    "Fase",
    "Data do contato",
    "Plataforma de aquisição",
    "Campanha",
  ].forEach((header) => {
    if (indexes[header] === undefined) {
      throw new Error(`meta_ads_funnel_header_missing:${header}`);
    }
  });

  const closedOpportunityIds = marcosFechamentoMetaAds_(milestoneValues);
  const generatedAt = Utilities.formatDate(
    now,
    META_ADS_FUNNEL_REVIEW_CONFIG.timeZone,
    "yyyy-MM-dd'T'HH:mm:ssXXX",
  );
  const yesterday = inicioDiaMetaAds_(new Date(now.getTime() - 86400000));
  const sourceRows = Math.max(0, sourceValues.length - 1);
  const results = [];

  META_ADS_FUNNEL_REVIEW_CONFIG.windows.forEach((windowDays) => {
    const start = inicioDiaMetaAds_(
      new Date(yesterday.getTime() - (windowDays - 1) * 86400000),
    );
    const endExclusive = new Date(yesterday.getTime() + 86400000);
    const buckets = new Map();
    buckets.set("__TOTAL__|__TOTAL__|__TOTAL__", novoBucketFunilMetaAds_());
    Object.keys(META_ADS_CAMPAIGN_REGISTRY).forEach((campaignCode) => {
      const registered = META_ADS_CAMPAIGN_REGISTRY[campaignCode];
      buckets.set(
        `${registered.path}|${registered.campaign}|__TOTAL__`,
        novoBucketFunilMetaAds_(),
      );
    });

    sourceValues.slice(1).forEach((row) => {
      if (!linhaAmandaMetaAds_(row[indexes["Profissional"]])) return;
      if (!linhaMetaAds_(row, indexes)) return;
      const contactDate = dataMetaAds_(row[indexes["Data do contato"]]);
      if (!contactDate || contactDate < start || contactDate >= endExclusive) return;

      const resolution = resolverCampanhaMetaAds_(row[indexes.Campanha]);
      const creative = resolverCriativoMetaAds_(
        indexes.Criativo === undefined ? "" : row[indexes.Criativo],
      );
      const path = resolution ? resolution.path : "__UNKNOWN_PATH__";
      const campaign = resolution ? resolution.campaign : "__UNKNOWN_CAMPAIGN__";
      const creativeBucket = creative || "__UNKNOWN_CREATIVE__";
      const keys = [
        "__TOTAL__|__TOTAL__|__TOTAL__",
        `${path}|${campaign}|__TOTAL__`,
        `${path}|${campaign}|${creativeBucket}`,
      ];
      const opportunityId = String(row[indexes["Opportunity ID"]] || "").trim();
      const phase = normalizarTextoAgregadoMetaAds_(row[indexes.Fase]);
      const state = normalizarTextoAgregadoMetaAds_(row[indexes.Estado]);

      keys.forEach((key) => {
        if (!buckets.has(key)) buckets.set(key, novoBucketFunilMetaAds_());
        acumularLinhaFunilMetaAds_(
          buckets.get(key),
          phase,
          state,
          Boolean(resolution),
          opportunityId,
          closedOpportunityIds,
        );
      });
    });

    Array.from(buckets.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .forEach(([key, bucket]) => {
        const [path, campaign, creative] = key.split("|");
        results.push([
          "meta_ads_funnel_aggregate_v1",
          generatedAt,
          windowDays,
          formatarDiaMetaAds_(start),
          formatarDiaMetaAds_(yesterday),
          path,
          campaign,
          creative,
          bucket.contacts,
          bucket.classified,
          bucket.valid,
          bucket.qualified,
          bucket.scheduled,
          bucket.completed,
          bucket.converted,
          bucket.closed,
          bucket.canonical,
          bucket.unknown,
          sourceRows,
          "Coorte por data do contato; fases refletem o estado atual. M26F01W/M26C01W = WhatsApp direto; M26F02S/M26C02S = site → WhatsApp. Código conflitante ou ausente permanece desconhecido. Contato válido = classificado e não marcado como não qualificado. Fechamento exige marco canônico; ausência de marco não prova ausência real.",
        ]);
      });
  });
  return results;
}

function indexarCabecalhosAgregadoMetaAds_(headers) {
  return headers.reduce((map, header, index) => {
    if (header && map[header] === undefined) map[header] = index;
    const normalized = normalizarTextoAgregadoMetaAds_(header);
    if (
      normalized.indexOf("plataforma de aquisi") === 0 &&
      map["Plataforma de aquisição"] === undefined
    ) {
      map["Plataforma de aquisição"] = index;
    }
    if (normalized === "criativo" && map.Criativo === undefined) map.Criativo = index;
    return map;
  }, {});
}

function linhaAmandaMetaAds_(value) {
  return normalizarTextoAgregadoMetaAds_(value) === "amanda";
}

function linhaMetaAds_(row, indexes) {
  const platform = normalizarTextoAgregadoMetaAds_(
    row[indexes["Plataforma de aquisição"]],
  );
  const campaign = String(row[indexes.Campanha] || "").trim().toUpperCase();
  return platform === "meta" || platform === "meta ads" || /^M26/.test(campaign);
}

function resolverCampanhaMetaAds_(value) {
  const code = String(value || "").trim().toUpperCase();
  return META_ADS_CAMPAIGN_REGISTRY[code] || null;
}

function resolverCriativoMetaAds_(value) {
  const text = String(value || "").trim().toUpperCase();
  const match = text.match(/(?:^|[^A-Z0-9])(C\d{2}H\d{2})(?:$|[^A-Z0-9])/);
  return match ? match[1] : null;
}

function novoBucketFunilMetaAds_() {
  return {
    contacts: 0,
    classified: 0,
    valid: 0,
    qualified: 0,
    scheduled: 0,
    completed: 0,
    converted: 0,
    closed: 0,
    canonical: 0,
    unknown: 0,
    seen: new Set(),
  };
}

function acumularLinhaFunilMetaAds_(bucket, phase, state, canonical, opportunityId, closedIds) {
  const dedupeKey = opportunityId || `anonymous_row_${bucket.contacts + 1}`;
  if (bucket.seen.has(dedupeKey)) return;
  bucket.seen.add(dedupeKey);
  bucket.contacts += 1;
  if (phase && phase !== "novo") bucket.classified += 1;
  if (phase && phase !== "novo" && phase !== "nao qualificado") bucket.valid += 1;
  const rank = rankFaseMetaAds_(phase);
  if (rank >= 1) bucket.qualified += 1;
  if (rank >= 2) bucket.scheduled += 1;
  if (rank >= 3) bucket.completed += 1;
  if (rank >= 4) bucket.converted += 1;
  if (opportunityId && closedIds.has(opportunityId)) bucket.closed += 1;
  if (canonical) bucket.canonical += 1;
  else bucket.unknown += 1;
  if (["closed", "voided", "encerrada"].includes(state) && rank < 1) {
    // Continua contado como contato, sem promoção artificial no funil.
  }
}

function rankFaseMetaAds_(phase) {
  if (phase === "qualificado") return 1;
  if (phase === "consulta agendada" || phase === "consulta confirmada") return 2;
  if (phase === "consulta realizada") return 3;
  if (phase === "paciente convertido") return 4;
  return 0;
}

function marcosFechamentoMetaAds_(values) {
  const ids = new Set();
  if (!Array.isArray(values) || values.length < 2) return ids;
  const headers = values[0].map((value) => String(value || "").trim());
  const indexes = indexarCabecalhosAgregadoMetaAds_(headers);
  if (indexes["Opportunity ID"] === undefined || indexes.Marco === undefined) return ids;
  values.slice(1).forEach((row) => {
    const state = indexes.Estado === undefined
      ? ""
      : normalizarTextoAgregadoMetaAds_(row[indexes.Estado]);
    if (["voided", "invalid", "rejected"].includes(state)) return;
    const milestone = normalizarTextoAgregadoMetaAds_(row[indexes.Marco]);
    if (!["accepted", "procedure_closed", "payment_confirmed", "completed"].includes(milestone)) return;
    const opportunityId = String(row[indexes["Opportunity ID"]] || "").trim();
    if (opportunityId) ids.add(opportunityId);
  });
  return ids;
}

function dataMetaAds_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return inicioDiaMetaAds_(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : inicioDiaMetaAds_(parsed);
}

function inicioDiaMetaAds_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatarDiaMetaAds_(date) {
  return Utilities.formatDate(date, META_ADS_FUNNEL_REVIEW_CONFIG.timeZone, "yyyy-MM-dd");
}

function normalizarTextoAgregadoMetaAds_(value) {
  return repararMojibakeAgregadoMetaAds_(String(value || ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function repararMojibakeAgregadoMetaAds_(value) {
  return String(value || "")
    .replace(/Ã¡/g, "á")
    .replace(/Ã£/g, "ã")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã§/g, "ç");
}
