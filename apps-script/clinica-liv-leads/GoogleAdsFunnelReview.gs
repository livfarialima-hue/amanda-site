const GOOGLE_ADS_FUNNEL_REVIEW_CONFIG = Object.freeze({
  sourceSheet: "_FUNIL_CANONICO",
  milestoneSheet: "_OPORTUNIDADE_MARCOS",
  aggregateSpreadsheetId: "1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0",
  aggregateSheet: "Agregados",
  timeZone: "America/Sao_Paulo",
  triggerHour: 8,
  triggerMinute: 15,
  windows: [7, 30, 90],
});

const GOOGLE_ADS_CAMPAIGN_REGISTRY = Object.freeze({
  G26BLEF: "S_BR_SP_BLEFAROPLASTIA",
  G26FACE: "S_BR_SP_CIRURGIA_FACIAL",
  G26CERV: "S_BR_SP_LIFTING_CERVICAL",
  G26LIFT: "S_BR_SP_LIFTING_FACIAL",
  G26MARCA: "S_BR_SP_MARCA",
  G26OTO: "S_BR_SP_OTOPLASTIA",
});

// Aliases removidos dos anúncios em 22/08/2026 após inspeção ao vivo da
// sobrescrita de parâmetros. Eles são resolvidos apenas para atribuição
// histórica e continuam separados dos códigos canônicos na métrica de saúde.
const GOOGLE_ADS_LEGACY_CAMPAIGN_ALIAS_REGISTRY = Object.freeze({
  G26F00: "S_BR_SP_CIRURGIA_FACIAL",
  G26F01: "S_BR_SP_LIFTING_FACIAL",
  G26F02: "S_BR_SP_LIFTING_CERVICAL",
  G26F03: "S_BR_SP_BLEFAROPLASTIA",
  G26B01: "S_BR_SP_MARCA",
});

const GOOGLE_ADS_FUNNEL_AGGREGATE_HEADERS = Object.freeze([
  "schema_version",
  "generated_at",
  "window_days",
  "window_start",
  "window_end",
  "campaign",
  "contacts_identified",
  "contacts_classified",
  "valid_contacts_classified",
  "qualified_or_later",
  "scheduled_or_later",
  "completed_or_later",
  "patient_converted",
  "procedure_closed_milestone",
  "canonical_campaign_attribution",
  "legacy_alias_resolved_attribution",
  "unknown_campaign_attribution",
  "source_rows",
  "definition_note",
]);

/**
 * Atualiza diariamente um arquivo separado, compartilhável e sem PII.
 * A rotina do Google Ads lê apenas este agregado; nunca recebe acesso à LEADS.
 */
function publicarAgregadosFunilGoogleAds() {
  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sourceSheet = sourceSpreadsheet.getSheetByName(
    GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.sourceSheet,
  );
  if (!sourceSheet) throw new Error("google_ads_funnel_source_missing");

  const milestoneSheet = sourceSpreadsheet.getSheetByName(
    GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.milestoneSheet,
  );
  const sourceValues = sourceSheet.getDataRange().getValues();
  const milestoneValues = milestoneSheet
    ? milestoneSheet.getDataRange().getValues()
    : [];
  const rows = construirAgregadosFunilGoogleAds_(
    sourceValues,
    milestoneValues,
    new Date(),
  );

  const targetSpreadsheet = SpreadsheetApp.openById(
    GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.aggregateSpreadsheetId,
  );
  let targetSheet = targetSpreadsheet.getSheetByName(
    GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.aggregateSheet,
  );
  if (!targetSheet) {
    targetSheet = targetSpreadsheet.insertSheet(
      GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.aggregateSheet,
    );
  }

  targetSheet.clearContents();
  targetSheet
    .getRange(1, 1, rows.length + 1, GOOGLE_ADS_FUNNEL_AGGREGATE_HEADERS.length)
    .setValues([GOOGLE_ADS_FUNNEL_AGGREGATE_HEADERS.slice(), ...rows]);
  targetSheet.setFrozenRows(1);
  SpreadsheetApp.flush();

  return {
    ok: true,
    rows: rows.length,
    generatedAt: rows.length ? rows[0][1] : null,
    containsPii: false,
  };
}

function configurarRotinaAgregadosFunilGoogleAds() {
  const handler = "publicarAgregadosFunilGoogleAds";
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === handler) ScriptApp.deleteTrigger(trigger);
  });
  const trigger = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyDays(1)
    .atHour(GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.triggerHour)
    .nearMinute(GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.triggerMinute)
    .inTimezone(GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.timeZone)
    .create();
  return {
    ok: true,
    handler,
    triggerId: trigger.getUniqueId(),
    schedule: "diário, aproximadamente 08:15 BRT",
  };
}

function construirAgregadosFunilGoogleAds_(sourceValues, milestoneValues, now) {
  if (!Array.isArray(sourceValues) || sourceValues.length < 1) {
    throw new Error("google_ads_funnel_source_unreadable");
  }
  const headers = sourceValues[0].map((value) => String(value || "").trim());
  const indexes = indexarCabecalhosAgregadoGoogleAds_(headers);
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
      throw new Error(`google_ads_funnel_header_missing:${header}`);
    }
  });

  const closedOpportunityIds = marcosFechamentoGoogleAds_(milestoneValues);
  const generatedAt = Utilities.formatDate(
    now,
    GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.timeZone,
    "yyyy-MM-dd'T'HH:mm:ssXXX",
  );
  const yesterday = inicioDiaGoogleAds_(new Date(now.getTime() - 86400000));
  const sourceRows = Math.max(0, sourceValues.length - 1);
  const results = [];

  GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.windows.forEach((windowDays) => {
    const start = inicioDiaGoogleAds_(
      new Date(yesterday.getTime() - (windowDays - 1) * 86400000),
    );
    const endExclusive = new Date(yesterday.getTime() + 86400000);
    const buckets = new Map();
    buckets.set("__TOTAL__", novoBucketFunilGoogleAds_());

    sourceValues.slice(1).forEach((row) => {
      if (!linhaAmandaGoogleAds_(row[indexes["Profissional"]])) return;
      if (!linhaGoogleAds_(row, indexes)) return;
      const contactDate = dataGoogleAds_(row[indexes["Data do contato"]]);
      if (!contactDate || contactDate < start || contactDate >= endExclusive) return;

      const attribution = resolverAtribuicaoCampanhaGoogleAds_(
        row[indexes.Campanha],
      );
      const campaign = attribution.campaign;
      const bucketName = campaign || "__UNKNOWN_CAMPAIGN__";
      if (!buckets.has(bucketName)) buckets.set(bucketName, novoBucketFunilGoogleAds_());
      const opportunityId = String(row[indexes["Opportunity ID"]] || "").trim();
      const phase = normalizarTextoAgregadoGoogleAds_(row[indexes.Fase]);
      const state = normalizarTextoAgregadoGoogleAds_(row[indexes.Estado]);
      [buckets.get("__TOTAL__"), buckets.get(bucketName)].forEach((bucket) => {
        acumularLinhaFunilGoogleAds_(
          bucket,
          phase,
          state,
          attribution,
          opportunityId,
          closedOpportunityIds,
        );
      });
    });

    Array.from(buckets.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .forEach(([campaign, bucket]) => {
        results.push([
          "google_ads_funnel_aggregate_v2",
          generatedAt,
          windowDays,
          formatarDiaGoogleAds_(start),
          formatarDiaGoogleAds_(yesterday),
          campaign,
          bucket.contacts,
          bucket.classified,
          bucket.valid,
          bucket.qualified,
          bucket.scheduled,
          bucket.completed,
          bucket.converted,
          bucket.closed,
          bucket.canonical,
          bucket.legacyAlias,
          bucket.unknown,
          sourceRows,
          "Coorte por data do contato; fases refletem o estado atual. Contato válido = classificado e não marcado como não qualificado. Aliases históricos resolvidos permanecem separados da captura canônica. Procedimento fechado = somente marco canônico registrado; ausência de marco não prova ausência real.",
        ]);
      });
  });
  return results;
}

function indexarCabecalhosAgregadoGoogleAds_(headers) {
  return headers.reduce((map, header, index) => {
    if (header && map[header] === undefined) map[header] = index;
    const normalized = normalizarTextoAgregadoGoogleAds_(header);
    // Algumas abas históricas preservam mojibake no cabeçalho de aquisição.
    // O alias canônico evita interromper a publicação sem aceitar um campo diferente.
    if (
      normalized.indexOf("plataforma de aquisi") === 0 &&
      map["Plataforma de aquisição"] === undefined
    ) {
      map["Plataforma de aquisição"] = index;
    }
    return map;
  }, {});
}

function linhaAmandaGoogleAds_(value) {
  return normalizarTextoAgregadoGoogleAds_(value) === "amanda";
}

function linhaGoogleAds_(row, indexes) {
  const platform = normalizarTextoAgregadoGoogleAds_(row[indexes["Plataforma de aquisição"]]);
  const campaign = String(row[indexes.Campanha] || "").trim().toUpperCase();
  return platform === "google" || platform === "google ads" || /^G26/.test(campaign);
}

function resolverCampanhaGoogleAds_(value) {
  return resolverAtribuicaoCampanhaGoogleAds_(value).campaign;
}

function resolverAtribuicaoCampanhaGoogleAds_(value) {
  const code = String(value || "").trim().toUpperCase();
  if (GOOGLE_ADS_CAMPAIGN_REGISTRY[code]) {
    return {
      campaign: GOOGLE_ADS_CAMPAIGN_REGISTRY[code],
      kind: "canonical",
      code,
    };
  }
  if (GOOGLE_ADS_LEGACY_CAMPAIGN_ALIAS_REGISTRY[code]) {
    return {
      campaign: GOOGLE_ADS_LEGACY_CAMPAIGN_ALIAS_REGISTRY[code],
      kind: "legacy_alias_resolved",
      code,
    };
  }
  return { campaign: null, kind: "unknown", code };
}

function novoBucketFunilGoogleAds_() {
  return { contacts: 0, classified: 0, valid: 0, qualified: 0, scheduled: 0, completed: 0, converted: 0, closed: 0, canonical: 0, legacyAlias: 0, unknown: 0 };
}

function acumularLinhaFunilGoogleAds_(bucket, phase, state, attribution, opportunityId, closedIds) {
  bucket.contacts += 1;
  if (phase && phase !== "novo") bucket.classified += 1;
  if (phase && phase !== "novo" && phase !== "nao qualificado") bucket.valid += 1;
  const rank = rankFaseGoogleAds_(phase);
  if (rank >= 1) bucket.qualified += 1;
  if (rank >= 2) bucket.scheduled += 1;
  if (rank >= 3) bucket.completed += 1;
  if (rank >= 4) bucket.converted += 1;
  if (opportunityId && closedIds.has(opportunityId)) bucket.closed += 1;
  if (attribution.kind === "canonical") bucket.canonical += 1;
  else if (attribution.kind === "legacy_alias_resolved") bucket.legacyAlias += 1;
  else bucket.unknown += 1;
  if (["closed", "voided", "encerrada"].includes(state) && rank < 1) {
    // O registro continua contado como contato; não é promovido no funil.
  }
}

function rankFaseGoogleAds_(phase) {
  if (phase === "qualificado") return 1;
  if (phase === "consulta agendada" || phase === "consulta confirmada") return 2;
  if (phase === "consulta realizada") return 3;
  if (phase === "paciente convertido") return 4;
  return 0;
}

function marcosFechamentoGoogleAds_(values) {
  const ids = new Set();
  if (!Array.isArray(values) || values.length < 2) return ids;
  const headers = values[0].map((value) => String(value || "").trim());
  const indexes = indexarCabecalhosAgregadoGoogleAds_(headers);
  if (indexes["Opportunity ID"] === undefined || indexes.Marco === undefined) return ids;
  values.slice(1).forEach((row) => {
    const state = indexes.Estado === undefined
      ? ""
      : normalizarTextoAgregadoGoogleAds_(row[indexes.Estado]);
    if (["voided", "invalid", "rejected"].includes(state)) return;
    const milestone = normalizarTextoAgregadoGoogleAds_(row[indexes.Marco]);
    if (!["accepted", "procedure_closed", "payment_confirmed", "completed"].includes(milestone)) return;
    const opportunityId = String(row[indexes["Opportunity ID"]] || "").trim();
    if (opportunityId) ids.add(opportunityId);
  });
  return ids;
}

function dataGoogleAds_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return inicioDiaGoogleAds_(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : inicioDiaGoogleAds_(parsed);
}

function inicioDiaGoogleAds_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatarDiaGoogleAds_(date) {
  return Utilities.formatDate(date, GOOGLE_ADS_FUNNEL_REVIEW_CONFIG.timeZone, "yyyy-MM-dd");
}

function normalizarTextoAgregadoGoogleAds_(value) {
  return repararMojibakeAgregadoGoogleAds_(String(value || ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function repararMojibakeAgregadoGoogleAds_(value) {
  return String(value || "")
    .replace(/\u00c3\u00a1/g, "\u00e1")
    .replace(/\u00c3\u00a2/g, "\u00e2")
    .replace(/\u00c3\u00a3/g, "\u00e3")
    .replace(/\u00c3\u00a9/g, "\u00e9")
    .replace(/\u00c3\u00aa/g, "\u00ea")
    .replace(/\u00c3\u00ad/g, "\u00ed")
    .replace(/\u00c3\u00b3/g, "\u00f3")
    .replace(/\u00c3\u00b4/g, "\u00f4")
    .replace(/\u00c3\u00b5/g, "\u00f5")
    .replace(/\u00c3\u00ba/g, "\u00fa")
    .replace(/\u00c3\u00a7/g, "\u00e7")
    .replace(/\u00c3\u0081/g, "\u00c1")
    .replace(/\u00c3\u0083/g, "\u00c3")
    .replace(/\u00c3\u0089/g, "\u00c9")
    .replace(/\u00c3\u0087/g, "\u00c7");
}
