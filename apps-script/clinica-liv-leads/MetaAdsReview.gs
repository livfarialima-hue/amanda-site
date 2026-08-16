/**
 * LIV — revisão automatizada da Meta Ads (somente leitura).
 *
 * Propriedades obrigatórias do projeto:
 * - META_MARKETING_API_TOKEN: token de leitura com ads_read;
 * - META_GRAPH_VERSION: versão vigente, no formato vNN.N;
 * - META_ADS_REVIEW_ENABLED: true somente depois do teste de acesso.
 *
 * A rotina usa apenas GET na Marketing API, lê o agregado anônimo do funil e
 * envia sugestões para revisão humana. Nunca altera campanha, anúncio, público,
 * orçamento, lance ou status.
 */

const META_ADS_REVIEW_CONFIG = Object.freeze({
  accountId: "1643959806249995",
  adAccountId: "act_1643959806249995",
  accountTimeZone: "America/Sao_Paulo",
  recipientEmail: "daniel.added@gmail.com",
  senderName: "Clínica LIV — revisão Meta Ads",
  weeklyDayIso: 2,
  triggerHour: 10,
  triggerMinute: 5,
  aggregateSpreadsheetId: "1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0",
  aggregateSheetName: "Meta_Agregados",
  aggregateMaxAgeHours: 36,
  maxPages: 30,
  maxRowsPerSection: 50,
  alertCooldownHours: 48,
  anomalyLookbackWeeks: 8,
  minAbsoluteAnomalyCost: 30,
  minImpressionsForFatigue: 1000,
  minLinkClicksForLandingSignal: 50,
  minResultsForCostComparison: 5,
  facialCampaignCodes: Object.freeze(["M26F01W", "M26F02S"]),
});

const META_ADS_ACTION_KEYS = Object.freeze({
  conversations: Object.freeze([
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
    "messaging_first_reply",
  ]),
  landingPageViews: Object.freeze([
    "landing_page_view",
    "omni_landing_page_view",
  ]),
  linkClicks: Object.freeze(["link_click", "outbound_click"]),
});

function executarRevisaoMetaAds() {
  const properties = PropertiesService.getScriptProperties();
  if (String(properties.getProperty("META_ADS_REVIEW_ENABLED") || "").toLowerCase() !== "true") {
    console.log("Rotina Meta Ads desabilitada por feature flag; nenhuma consulta ou alteração foi feita.");
    return { ok: false, enabled: false };
  }

  const context = criarContextoRevisaoMetaAds_(new Date());
  try {
    const report = construirRelatorioRevisaoMetaAds_(context, properties);
    const criticalNotification = report.criticalAlerts.length > 0 && deveNotificarAlertasMeta_(report, context, properties);
    const shouldSend = context.isWeekly || context.isMonthly || criticalNotification;
    if (!shouldSend) {
      console.log("Rotina Meta Ads concluída sem alerta crítico; nenhum e-mail enviado.");
      return { ok: true, sent: false, alerts: 0 };
    }

    MailApp.sendEmail({
      to: META_ADS_REVIEW_CONFIG.recipientEmail,
      subject: assuntoRevisaoMetaAds_(report, context),
      body: emailTextoRevisaoMetaAds_(report, context),
      htmlBody: emailHtmlRevisaoMetaAds_(report, context),
      name: META_ADS_REVIEW_CONFIG.senderName,
    });
    lembrarAlertasMeta_(report, context, properties);
    console.log(`Relatório Meta Ads enviado para ${META_ADS_REVIEW_CONFIG.recipientEmail}.`);
    return { ok: true, sent: true, alerts: report.criticalAlerts.length };
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error);
    MailApp.sendEmail({
      to: META_ADS_REVIEW_CONFIG.recipientEmail,
      subject: `[Meta Ads] ERRO na revisão automatizada — ${context.today}`,
      body: `A rotina somente leitura falhou. Nenhuma campanha foi alterada.\n\n${message}`,
      name: META_ADS_REVIEW_CONFIG.senderName,
    });
    throw error;
  }
}

/**
 * Executa uma leitura completa e envia um e-mail de validação mesmo fora das
 * janelas semanal/mensal. Use apenas no go-live ou em diagnóstico autorizado.
 */
function executarTesteRevisaoMetaAds() {
  const properties = PropertiesService.getScriptProperties();
  const context = criarContextoRevisaoMetaAds_(new Date());
  const report = construirRelatorioRevisaoMetaAds_(context, properties);
  MailApp.sendEmail({
    to: META_ADS_REVIEW_CONFIG.recipientEmail,
    subject: `[TESTE] ${assuntoRevisaoMetaAds_(report, context)}`,
    body: emailTextoRevisaoMetaAds_(report, context),
    htmlBody: emailHtmlRevisaoMetaAds_(report, context),
    name: META_ADS_REVIEW_CONFIG.senderName,
  });
  console.log("Teste Meta Ads enviado. A rotina fez somente leituras e nenhuma campanha foi alterada.");
  return {
    ok: true,
    sent: true,
    test: true,
    campaignsRead: report.campaigns.length,
    alerts: report.criticalAlerts.length,
    mutations: 0,
  };
}

function validarAcessoRevisaoMetaAds() {
  const properties = PropertiesService.getScriptProperties();
  const credentials = credenciaisMetaAds_(properties);
  const campaigns = buscarMetaAds_("campaigns", {
    fields: "id,name,status,effective_status,objective,updated_time",
    limit: 100,
  }, credentials);
  return {
    ok: true,
    accountId: META_ADS_REVIEW_CONFIG.accountId,
    graphVersion: credentials.graphVersion,
    campaignsRead: campaigns.length,
    mutations: 0,
  };
}

function configurarRotinaRevisaoMetaAds() {
  validarAcessoRevisaoMetaAds();
  const handler = "executarRevisaoMetaAds";
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === handler) ScriptApp.deleteTrigger(trigger);
  });
  const trigger = ScriptApp.newTrigger(handler)
    .timeBased()
    .everyDays(1)
    .atHour(META_ADS_REVIEW_CONFIG.triggerHour)
    .nearMinute(META_ADS_REVIEW_CONFIG.triggerMinute)
    .inTimezone(META_ADS_REVIEW_CONFIG.accountTimeZone)
    .create();
  return {
    ok: true,
    handler,
    triggerId: trigger.getUniqueId(),
    schedule: "diário, aproximadamente 10:05 BRT",
  };
}

function construirRelatorioRevisaoMetaAds_(context, properties) {
  const credentials = credenciaisMetaAds_(properties);
  const warnings = [];
  const campaigns = consultaMetaSegura_("campanhas", "campaigns", {
    fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,updated_time,special_ad_categories,buying_type",
    limit: 200,
  }, credentials, warnings);
  const adsets = consultaMetaSegura_("conjuntos", "adsets", {
    fields: "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,bid_strategy,start_time,end_time,attribution_spec,targeting,updated_time,promoted_object",
    limit: 300,
  }, credentials, warnings);
  const ads = consultaMetaSegura_("anúncios e criativos", "ads", {
    fields: "id,name,campaign_id,adset_id,status,effective_status,updated_time,creative{id,name,video_id,thumbnail_url,object_story_spec,asset_feed_spec}",
    limit: 500,
  }, credentials, warnings);
  const seven = insightsMetaSeguros_("desempenho — 7 dias", context.sevenDays, {}, credentials, warnings);
  const previousSeven = insightsMetaSeguros_("desempenho — 7 dias anteriores", context.previousSevenDays, {}, credentials, warnings);
  const thirty = insightsMetaSeguros_("desempenho — 30 dias", context.thirtyDays, {}, credentials, warnings);
  const ninety = context.isMonthly
    ? insightsMetaSeguros_("desempenho — 90 dias", context.ninetyDays, {}, credentials, warnings)
    : marcarFonteMeta_([], true, "desempenho — 90 dias não solicitado");
  const daily = insightsMetaSeguros_("desempenho diário — 8 semanas", context.fiftySixDays, { time_increment: 1, level: "campaign" }, credentials, warnings);
  const ageGender = context.isWeekly || context.isMonthly
    ? insightsMetaSeguros_("idade e gênero — 30 dias", context.thirtyDays, { breakdowns: "age,gender", level: "campaign" }, credentials, warnings)
    : marcarFonteMeta_([], true, "idade e gênero não solicitado");
  const placements = context.isWeekly || context.isMonthly
    ? insightsMetaSeguros_("plataforma e posicionamento — 30 dias", context.thirtyDays, { breakdowns: "publisher_platform,platform_position,impression_device", level: "campaign" }, credentials, warnings)
    : marcarFonteMeta_([], true, "posicionamentos não solicitados");
  const funnel = lerAgregadosFunilMeta_(warnings);
  const landingHealth = context.isWeekly || context.isMonthly
    ? verificarDestinosMeta_(ads, warnings)
    : marcarFonteMeta_([], true, "destinos não solicitados");

  const data = {
    campaigns,
    adsets,
    ads,
    seven: seven.map(normalizarInsightMeta_),
    previousSeven: previousSeven.map(normalizarInsightMeta_),
    thirty: thirty.map(normalizarInsightMeta_),
    ninety: ninety.map(normalizarInsightMeta_),
    daily: daily.map(normalizarInsightMeta_),
    ageGender: ageGender.map(normalizarInsightMeta_),
    placements: placements.map(normalizarInsightMeta_),
    funnel,
    landingHealth,
    warnings,
    sourceStatus: {
      campaigns: fonteMetaOk_(campaigns),
      adsets: fonteMetaOk_(adsets),
      ads: fonteMetaOk_(ads),
      seven: fonteMetaOk_(seven),
      previousSeven: fonteMetaOk_(previousSeven),
      thirty: fonteMetaOk_(thirty),
      daily: fonteMetaOk_(daily),
      ageGender: fonteMetaOk_(ageGender),
      placements: fonteMetaOk_(placements),
      funnel: fonteMetaOk_(funnel),
      landingHealth: fonteMetaOk_(landingHealth),
    },
  };
  data.criticalAlerts = construirAlertasCriticosMeta_(data);
  data.suggestions = context.isWeekly || context.isMonthly
    ? construirSugestoesMeta_(data)
    : [];
  data.generatedAt = Utilities.formatDate(new Date(), META_ADS_REVIEW_CONFIG.accountTimeZone, "yyyy-MM-dd HH:mm:ss");
  data.graphVersion = credentials.graphVersion;
  return data;
}

function credenciaisMetaAds_(properties) {
  const token = String(properties.getProperty("META_MARKETING_API_TOKEN") || "").trim();
  const graphVersion = String(properties.getProperty("META_GRAPH_VERSION") || "").trim();
  if (!token) throw new Error("meta_marketing_api_token_missing");
  if (!/^v\d+\.\d+$/.test(graphVersion)) throw new Error("meta_graph_version_missing_or_invalid");
  return { token, graphVersion };
}

function consultaMetaSegura_(label, edge, params, credentials, warnings) {
  try {
    return marcarFonteMeta_(buscarMetaAds_(edge, params, credentials), true, label);
  } catch (error) {
    warnings.push(`${label}: N/D — ${erroCompactoMeta_(error)}`);
    return marcarFonteMeta_([], false, label, erroCompactoMeta_(error));
  }
}

function insightsMetaSeguros_(label, range, extra, credentials, warnings) {
  const fields = [
    "date_start", "date_stop", "campaign_id", "campaign_name", "adset_id", "adset_name",
    "ad_id", "ad_name", "spend", "impressions", "reach", "frequency", "cpm", "clicks",
    "inline_link_clicks", "ctr", "cpc", "actions", "cost_per_action_type", "video_play_actions",
    "video_thruplay_watched_actions", "video_p25_watched_actions", "video_p50_watched_actions",
    "video_p75_watched_actions", "video_p95_watched_actions", "video_p100_watched_actions",
  ].join(",");
  return consultaMetaSegura_(label, "insights", Object.assign({
    fields,
    level: "ad",
    time_range: JSON.stringify({ since: range.start, until: range.end }),
    limit: 500,
  }, extra || {}), credentials, warnings);
}

function buscarMetaAds_(edge, params, credentials) {
  const base = `https://graph.facebook.com/${credentials.graphVersion}/${META_ADS_REVIEW_CONFIG.adAccountId}/${edge}`;
  let url = `${base}?${queryStringMeta_(params || {})}`;
  const rows = [];
  let pages = 0;
  while (url) {
    pages += 1;
    if (pages > META_ADS_REVIEW_CONFIG.maxPages) throw new Error(`meta_pagination_limit:${edge}`);
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${credentials.token}` },
      muteHttpExceptions: true,
      followRedirects: true,
    });
    const status = response.getResponseCode();
    const body = String(response.getContentText() || "");
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      throw new Error(`meta_invalid_json:${edge}:http_${status}`);
    }
    if (status < 200 || status >= 300 || parsed.error) {
      const code = parsed && parsed.error ? parsed.error.code : status;
      const subcode = parsed && parsed.error ? parsed.error.error_subcode : "N/D";
      throw new Error(`meta_api_error:${edge}:code_${code}:subcode_${subcode}`);
    }
    (parsed.data || []).forEach((row) => rows.push(row));
    url = parsed.paging && parsed.paging.next ? parsed.paging.next : null;
  }
  return rows;
}

function queryStringMeta_(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join("&");
}

function normalizarInsightMeta_(row) {
  const actions = mapaAcoesMeta_(row.actions);
  const costs = mapaAcoesMeta_(row.cost_per_action_type);
  const conversations = somaChavesMeta_(actions, META_ADS_ACTION_KEYS.conversations);
  const landingPageViews = somaChavesMeta_(actions, META_ADS_ACTION_KEYS.landingPageViews);
  const linkClicksFromActions = somaChavesMeta_(actions, META_ADS_ACTION_KEYS.linkClicks);
  const linkClicks = numeroMeta_(row.inline_link_clicks) ?? linkClicksFromActions;
  const campaignCode = codigoCampanhaMeta_(row.campaign_name);
  const primaryResults = campaignCode === "M26F01W" ? conversations
    : campaignCode === "M26F02S" ? landingPageViews
      : null;
  const primaryCost = campaignCode === "M26F01W"
    ? somaChavesMeta_(costs, META_ADS_ACTION_KEYS.conversations)
    : campaignCode === "M26F02S"
      ? somaChavesMeta_(costs, META_ADS_ACTION_KEYS.landingPageViews)
      : null;
  return {
    dateStart: row.date_start || null,
    dateStop: row.date_stop || null,
    campaignId: row.campaign_id || null,
    campaign: row.campaign_name || "N/D",
    campaignCode,
    adsetId: row.adset_id || null,
    adset: row.adset_name || "N/D",
    adId: row.ad_id || null,
    ad: row.ad_name || "N/D",
    spend: numeroMeta_(row.spend),
    impressions: numeroMeta_(row.impressions),
    reach: numeroMeta_(row.reach),
    frequency: numeroMeta_(row.frequency),
    cpm: numeroMeta_(row.cpm),
    clicks: numeroMeta_(row.clicks),
    linkClicks,
    ctrAll: numeroMeta_(row.ctr),
    linkCtr: numeroMeta_(row.impressions) && linkClicks !== null ? (100 * linkClicks / numeroMeta_(row.impressions)) : null,
    cpcAll: numeroMeta_(row.cpc),
    cpcLink: linkClicks ? numeroMeta_(row.spend) / linkClicks : null,
    landingPageViews,
    conversations,
    primaryResults,
    primaryCost,
    videoPlays: primeiraAcaoMeta_(row.video_play_actions),
    thruPlays: primeiraAcaoMeta_(row.video_thruplay_watched_actions),
    video25: primeiraAcaoMeta_(row.video_p25_watched_actions),
    video50: primeiraAcaoMeta_(row.video_p50_watched_actions),
    video75: primeiraAcaoMeta_(row.video_p75_watched_actions),
    video95: primeiraAcaoMeta_(row.video_p95_watched_actions),
    video100: primeiraAcaoMeta_(row.video_p100_watched_actions),
    age: row.age || null,
    gender: row.gender || null,
    publisherPlatform: row.publisher_platform || null,
    platformPosition: row.platform_position || null,
    impressionDevice: row.impression_device || null,
  };
}

function lerAgregadosFunilMeta_(warnings) {
  try {
    const spreadsheet = SpreadsheetApp.openById(META_ADS_REVIEW_CONFIG.aggregateSpreadsheetId);
    const sheet = spreadsheet.getSheetByName(META_ADS_REVIEW_CONFIG.aggregateSheetName);
    if (!sheet) throw new Error("aba Meta_Agregados ausente");
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) throw new Error("agregado Meta ainda sem dados");
    const headers = values[0].map((value) => String(value || "").trim());
    const required = ["schema_version", "generated_at", "window_days", "journey_path", "campaign_code", "creative_code", "contacts_identified", "qualified_or_later", "scheduled_or_later", "completed_or_later", "procedure_closed_milestone"];
    const indexes = {};
    required.forEach((header) => {
      const index = headers.indexOf(header);
      if (index < 0) throw new Error(`coluna ausente: ${header}`);
      indexes[header] = index;
    });
    const rows = values.slice(1).map((row) => ({
      schemaVersion: String(row[indexes.schema_version] || ""),
      generatedAt: row[indexes.generated_at],
      windowDays: Number(row[indexes.window_days]),
      path: String(row[indexes.journey_path] || "N/D"),
      campaignCode: String(row[indexes.campaign_code] || "N/D"),
      creativeCode: String(row[indexes.creative_code] || "N/D"),
      contacts: numeroNuloMeta_(row[indexes.contacts_identified]),
      classified: numeroNuloMeta_(row[headers.indexOf("contacts_classified")]),
      validContacts: numeroNuloMeta_(row[headers.indexOf("valid_contacts_classified")]),
      qualified: numeroNuloMeta_(row[indexes.qualified_or_later]),
      scheduled: numeroNuloMeta_(row[indexes.scheduled_or_later]),
      completed: numeroNuloMeta_(row[indexes.completed_or_later]),
      converted: numeroNuloMeta_(row[headers.indexOf("patient_converted")]),
      procedureClosed: numeroNuloMeta_(row[indexes.procedure_closed_milestone]),
      canonicalAttribution: numeroNuloMeta_(row[headers.indexOf("canonical_path_attribution")]),
      unknownAttribution: numeroNuloMeta_(row[headers.indexOf("unknown_path_attribution")]),
    })).filter((row) => [7, 30, 90].includes(row.windowDays));
    const newest = rows.reduce((max, row) => Math.max(max, dataHoraMeta_(row.generatedAt)), 0);
    const ageHours = newest ? (new Date().getTime() - newest) / 3600000 : Infinity;
    if (!Number.isFinite(ageHours) || ageHours > META_ADS_REVIEW_CONFIG.aggregateMaxAgeHours) {
      throw new Error(`agregado desatualizado (${Number.isFinite(ageHours) ? ageHours.toFixed(1) : "N/D"} h)`);
    }
    rows.freshnessHours = ageHours;
    return marcarFonteMeta_(rows, true, "funil anônimo Meta");
  } catch (error) {
    warnings.push(`funil anônimo Meta: N/D — ${erroCompactoMeta_(error)}. Não inferir contato válido, qualificado ou consulta.`);
    return marcarFonteMeta_([], false, "funil anônimo Meta", erroCompactoMeta_(error));
  }
}

function verificarDestinosMeta_(ads, warnings) {
  if (!fonteMetaOk_(ads)) return marcarFonteMeta_([], false, "saúde das páginas", "anúncios indisponíveis");
  const urls = [];
  (ads || []).forEach((ad) => extrairUrlsCriativoMeta_(ad.creative).forEach((url) => {
    if (url && !urls.includes(url)) urls.push(url);
  }));
  if (!urls.length) return marcarFonteMeta_([], true, "saúde das páginas");
  try {
    const responses = UrlFetchApp.fetchAll(urls.slice(0, 30).map((url) => ({ url, muteHttpExceptions: true, followRedirects: true })));
    const rows = responses.map((response, index) => {
      const body = String(response.getContentText() || "");
      return {
        url: urls[index],
        status: response.getResponseCode(),
        hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(body),
        hasTrackedWhatsapp: /data-track=["']whatsapp["']/i.test(body),
      };
    });
    return marcarFonteMeta_(rows, true, "saúde das páginas");
  } catch (error) {
    warnings.push(`saúde das páginas Meta: N/D — ${erroCompactoMeta_(error)}`);
    return marcarFonteMeta_([], false, "saúde das páginas", erroCompactoMeta_(error));
  }
}

function extrairUrlsCriativoMeta_(creative) {
  const urls = [];
  const story = creative && creative.object_story_spec ? creative.object_story_spec : {};
  const candidates = [
    story.link_data && story.link_data.link,
    story.video_data && story.video_data.call_to_action && story.video_data.call_to_action.value && story.video_data.call_to_action.value.link,
  ];
  candidates.forEach((value) => {
    if (/^https?:\/\//i.test(String(value || ""))) urls.push(String(value));
  });
  return urls;
}

function construirAlertasCriticosMeta_(data) {
  const alerts = [];
  if (data.sourceStatus.daily) {
    const anomaly = anomaliaMesmoDiaMeta_(data.daily);
    if (anomaly && anomaly.isAnomaly) {
      alerts.push(alertaMeta_("P0", "Gasto Meta muito acima do mesmo dia da semana", `Ontem: ${brlMeta_(anomaly.observed)}; média de ${anomaly.samples} dias comparáveis: ${brlMeta_(anomaly.mean)}; limite: ${brlMeta_(anomaly.threshold)}.`, "Conferir histórico, distribuição e orçamento; não alterar automaticamente.", "meta_cost_same_weekday", anomaly.observed));
    }
  }

  if (data.sourceStatus.campaigns) {
    data.campaigns.forEach((campaign) => {
      if (String(campaign.status || "").toUpperCase() === "ACTIVE" && String(campaign.effective_status || "").toUpperCase() !== "ACTIVE") {
        alerts.push(alertaMeta_("P0", `Campanha ativa com entrega ${campaign.effective_status || "N/D"}`, `${campaign.name} está configurada como ativa, mas o status efetivo diverge.`, "Abrir o diagnóstico de veiculação/política e corrigir somente após revisão humana.", `meta_delivery|${campaign.id}`, 1));
      }
    });
  }

  if (data.sourceStatus.campaigns && data.sourceStatus.daily && data.sourceStatus.thirty) {
    const activeIds = new Set(data.campaigns
      .filter((campaign) => String(campaign.status || "").toUpperCase() === "ACTIVE")
      .map((campaign) => String(campaign.id || "")));
    const latestDate = (data.daily || []).map((row) => row.dateStart).filter(Boolean).sort().pop();
    const latestByCampaign = agruparInsightsMeta_((data.daily || []).filter((row) => row.dateStart === latestDate), "campaignId", true).__rows;
    const thirtyByCampaign = agruparInsightsMeta_(data.thirty || [], "campaignId", true).__rows;
    thirtyByCampaign.forEach((baseline) => {
      if (!activeIds.has(String(baseline.campaignId || "")) || baseline.impressions < 100) return;
      const latest = latestByCampaign.find((row) => String(row.campaignId || "") === String(baseline.campaignId || ""));
      if (!latest || latest.impressions === 0) {
        alerts.push(alertaMeta_("P0", `Campanha sem entrega no último dia disponível: ${baseline.campaign}`, `Último dia retornado pela API: ${latestDate || "N/D"}; 30 dias: ${inteiroMeta_(baseline.impressions)} impressões.`, "Conferir programação, orçamento, status efetivo e política; não reativar automaticamente.", `meta_no_delivery|${baseline.campaignId}`, baseline.impressions));
      }
    });
  }

  if (data.sourceStatus.ads) {
    data.ads.forEach((ad) => {
      const effective = String(ad.effective_status || "").toUpperCase();
      if (String(ad.status || "").toUpperCase() === "ACTIVE" && ["DISAPPROVED", "WITH_ISSUES", "ERROR"].includes(effective)) {
        alerts.push(alertaMeta_("P0", `Anúncio ativo com status ${effective}`, `${ad.name || ad.id}: a configuração está ativa, mas o status efetivo exige revisão.`, "Abrir o detalhe de política/veiculação; não substituir nem publicar criativo automaticamente.", `meta_ad_status|${ad.id}`, 1));
      }
    });
  }

  if (data.sourceStatus.adsets) {
    data.adsets.forEach((adset) => {
      const code = codigoCampanhaMeta_(adset.name);
      const targeting = adset.targeting || {};
      if (META_ADS_REVIEW_CONFIG.facialCampaignCodes.includes(code) && numeroMeta_(targeting.age_min) !== null && numeroMeta_(targeting.age_min) < 40) {
        alerts.push(alertaMeta_("P0", `Piso etário abaixo de 40 em ${adset.name}`, `age_min observado: ${targeting.age_min}. A decisão vigente para Meta facial é 40+.`, "Conferir se Advantage+ trata idade como controle ou sugestão; não editar automaticamente.", `meta_age_floor|${adset.id}`, 40 - numeroMeta_(targeting.age_min)));
      }
    });
  }

  if (data.sourceStatus.thirty && data.sourceStatus.funnel) {
    const siteSpend = somarInsightsMeta_(data.thirty.filter((row) => row.campaignCode === "M26F02S")).spend;
    const siteFunnel = linhaFunilMeta_(data.funnel, 30, "M26F02S", "__TOTAL__");
    if (siteSpend > 0 && siteFunnel && siteFunnel.contacts === 0) {
      alerts.push(alertaMeta_("P0", "Meta Site gastou, mas não apareceu no funil identificado", `Gasto em 30 dias: ${brlMeta_(siteSpend)}; contatos com M26F02S: 0 no agregado. Isso não prova zero contatos reais.`, "Manter sem nova verba e auditar Meta → site → WhatsApp → LEADS/CRM.", "meta_site_zero_attributed_contacts", siteSpend));
    }
  }

  if (!data.sourceStatus.funnel) {
    alerts.push(alertaMeta_("P0", "Agregado anônimo do funil Meta indisponível", "Contato válido, qualificado, consulta e procedimento ficaram N/D.", "Restaurar a publicação do agregado antes de decidir campanha por resultado de negócio.", "meta_funnel_unavailable", 1));
  }

  if (data.sourceStatus.landingHealth) {
    data.landingHealth.forEach((row) => {
      if (row.status < 200 || row.status >= 400 || !row.hasCanonical || !row.hasTrackedWhatsapp) {
        alerts.push(alertaMeta_("P0", "Destino da Meta com falha técnica", `${row.url}: HTTP ${row.status}; canonical ${row.hasCanonical ? "sim" : "não"}; CTA rastreado ${row.hasTrackedWhatsapp ? "sim" : "não"}.`, "Corrigir o destino no código/site após confirmação; não editar a campanha automaticamente.", `meta_landing|${row.url}`, row.status));
      }
    });
  }
  return alerts;
}

function construirSugestoesMeta_(data) {
  const suggestions = [];
  const sevenByAd = agruparInsightsMeta_(data.seven, "adId");
  const previousByAd = agruparInsightsMeta_(data.previousSeven, "adId");
  Object.keys(sevenByAd).forEach((adId) => {
    const current = sevenByAd[adId];
    const previous = previousByAd[adId];
    if (!previous || current.impressions < META_ADS_REVIEW_CONFIG.minImpressionsForFatigue) return;
    const ctrDrop = quedaRelativaMeta_(current.linkCtr, previous.linkCtr);
    const frequencyRise = aumentoRelativoMeta_(current.frequency, previous.frequency);
    const costRise = aumentoRelativoMeta_(current.costPerPrimaryResult, previous.costPerPrimaryResult);
    if ((current.frequency >= 2.5 || frequencyRise >= 0.2) && ctrDrop >= 0.2 && (costRise >= 0.2 || current.primaryResults === 0)) {
      suggestions.push(sugestaoMeta_("P1", "Pode testar", current.campaign, current.ad, "Sinal combinado de fadiga criativa", `${inteiroMeta_(current.impressions)} impressões; frequência ${decimalMeta_(current.frequency)}; CTR link caiu ${percentualMeta_(ctrDrop)}; custo/resultado ${dinheiroOuNdMeta_(current.costPerPrimaryResult)}.`, "Preparar uma variação do criativo, mantendo público, orçamento e objetivo estáveis.", "Recuperar CTR e resultado de negócio sem elevar frequência.", "média", "Não pausar o controle antes de a variação acumular amostra comparável.", "CTR link, conversa/LPV e lead qualificado", "7–14 dias e ≥1.000 impressões por versão", "Manter se melhorar resultado principal sem piorar qualificação; reverter se piorar custo/lead qualificado."));
    }
  });

  agruparInsightsMeta_(data.thirty, "campaignId", true).__rows.forEach((row) => {
    if (row.linkClicks >= META_ADS_REVIEW_CONFIG.minLinkClicksForLandingSignal && row.campaignCode === "M26F02S") {
      const ratio = row.linkClicks ? row.landingPageViews / row.linkClicks : null;
      if (ratio !== null && ratio < 0.7) {
        suggestions.push(sugestaoMeta_("P1", "Corrigir agora", row.campaign, "Todos", "Perda relevante entre clique e visualização da página", `${inteiroMeta_(row.linkClicks)} cliques no link; ${inteiroMeta_(row.landingPageViews)} LPVs; passagem ${percentualMeta_(ratio)}.`, "Auditar velocidade, redirecionamento, consentimento e URL em mobile antes de testar criativo.", "Recuperar visitas reais sem aumentar gasto.", "alta para a perda; baixa para a causa", "Não culpar a página ou o anúncio sem teste técnico.", "LPV/clique e contato Meta Site identificado", "7 dias após correção isolada", "Manter correção se LPV/clique subir sem queda de contato válido; reverter se houver regressão técnica."));
      }
    }
  });

  const direct30 = linhaFunilMeta_(data.funnel, 30, "M26F01W", "__TOTAL__");
  const site30 = linhaFunilMeta_(data.funnel, 30, "M26F02S", "__TOTAL__");
  const perf30 = agruparInsightsMeta_(data.thirty, "campaignId", true).__rows;
  perf30.forEach((row) => {
    const funnel = row.campaignCode === "M26F01W" ? direct30 : row.campaignCode === "M26F02S" ? site30 : null;
    const queue = row.campaignCode === "M26F02S" && (!funnel || funnel.contacts === 0) ? "Não alterar" : "Aguardar dados";
    suggestions.push(sugestaoMeta_("P1", queue, row.campaign, "Todos", "Decisão deve usar funil, não somente resultado da plataforma", `30 dias: ${brlMeta_(row.spend)}; ${inteiroMeta_(row.primaryResults)} resultados da plataforma; ${funnel ? inteiroMeta_(funnel.contacts) : "N/D"} contatos identificados; ${funnel ? inteiroMeta_(funnel.qualified) : "N/D"} qualificados.`, row.campaignCode === "M26F02S" ? "Manter sem nova verba até prova E2E e comparar com o controle WhatsApp direto." : "Manter como controle e reconciliar conversa → contato válido → consulta.", "Evitar otimização por proxy.", "média", "Resultados Meta não equivalem a pessoas únicas ou pacientes.", "Custo/lead qualificado e custo/consulta realizada", "30 dias ou ≥10 leads qualificados", "Manter/realocar somente com atribuição confiável e diferença de negócio; não decidir por CTR isolado."));
  });

  if (data.sourceStatus.ageGender) {
    suggestions.push(sugestaoMeta_("P2", "Aguardar dados", "Meta facial", "Públicos", "Idade 40+ precisa ser validada pela entrega real", "A rotina coletou idade e gênero quando a API os disponibilizou; segmentação demográfica continua diagnóstico, não critério clínico.", "Comparar gasto, contato válido, qualificação e consulta por faixa; confirmar se houve entrega abaixo de 40.", "Evitar ampliar/reduzir público por impressão ou CTR.", "média", "Não excluir faixas nem alterar Advantage+ automaticamente.", "Custo/lead qualificado e consultas por faixa", "30 dias e volume suficiente", "Manter 40+ enquanto não houver evidência de negócio e configuração inequívoca em sentido contrário."));
  }
  return suggestions;
}

function criarContextoRevisaoMetaAds_(now) {
  const today = Utilities.formatDate(now, META_ADS_REVIEW_CONFIG.accountTimeZone, "yyyy-MM-dd");
  const local = new Date(`${today}T12:00:00-03:00`);
  const yesterday = adicionarDiasMeta_(local, -1);
  const isoDay = local.getDay() === 0 ? 7 : local.getDay();
  const previousSunday = adicionarDiasMeta_(local, -isoDay);
  const previousMonday = adicionarDiasMeta_(previousSunday, -6);
  return {
    today,
    isWeekly: isoDay === META_ADS_REVIEW_CONFIG.weeklyDayIso,
    isMonthly: segundoDiaUtilMeta_(today),
    sevenDays: intervaloMeta_(adicionarDiasMeta_(yesterday, -6), yesterday),
    previousSevenDays: intervaloMeta_(adicionarDiasMeta_(yesterday, -13), adicionarDiasMeta_(yesterday, -7)),
    week: intervaloMeta_(previousMonday, previousSunday),
    thirtyDays: intervaloMeta_(adicionarDiasMeta_(yesterday, -29), yesterday),
    ninetyDays: intervaloMeta_(adicionarDiasMeta_(yesterday, -89), yesterday),
    fiftySixDays: intervaloMeta_(adicionarDiasMeta_(yesterday, -55), yesterday),
  };
}

function segundoDiaUtilMeta_(isoDate) {
  const date = new Date(`${isoDate}T12:00:00-03:00`);
  let count = 0;
  for (let day = 1; day <= date.getDate(); day += 1) {
    const cursor = new Date(date.getFullYear(), date.getMonth(), day, 12);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
  }
  return count === 2 && date.getDay() !== 0 && date.getDay() !== 6;
}

function anomaliaMesmoDiaMeta_(rows) {
  if (!rows || rows.length < 2) return null;
  const dates = {};
  rows.forEach((row) => {
    if (!row.dateStart) return;
    dates[row.dateStart] = (dates[row.dateStart] || 0) + (row.spend || 0);
  });
  const ordered = Object.keys(dates).sort();
  if (!ordered.length) return null;
  const observedDate = ordered[ordered.length - 1];
  const observedDay = new Date(`${observedDate}T12:00:00-03:00`).getDay();
  const samples = ordered.slice(0, -1).filter((date) => new Date(`${date}T12:00:00-03:00`).getDay() === observedDay).slice(-META_ADS_REVIEW_CONFIG.anomalyLookbackWeeks).map((date) => dates[date]);
  if (samples.length < 3) return { observed: dates[observedDate], samples: samples.length, isAnomaly: false };
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const variance = samples.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / samples.length;
  const threshold = Math.max(mean + 3 * Math.sqrt(variance), mean * 1.8, mean + META_ADS_REVIEW_CONFIG.minAbsoluteAnomalyCost);
  return { observed: dates[observedDate], mean, threshold, samples: samples.length, isAnomaly: dates[observedDate] > threshold };
}

function agruparInsightsMeta_(rows, key, returnRows) {
  const grouped = {};
  (rows || []).forEach((row) => {
    const id = row[key] || "N/D";
    if (!grouped[id]) grouped[id] = novoResumoInsightMeta_(row);
    acumularInsightMeta_(grouped[id], row);
  });
  Object.keys(grouped).forEach((id) => finalizarResumoInsightMeta_(grouped[id]));
  if (returnRows) grouped.__rows = Object.keys(grouped).filter((id) => id !== "__rows").map((id) => grouped[id]);
  return grouped;
}

function somarInsightsMeta_(rows) {
  const summary = novoResumoInsightMeta_((rows || [])[0] || {});
  (rows || []).forEach((row) => acumularInsightMeta_(summary, row));
  finalizarResumoInsightMeta_(summary);
  return summary;
}

function novoResumoInsightMeta_(row) {
  return { campaignId: row.campaignId || null, campaign: row.campaign || "N/D", campaignCode: row.campaignCode || null, adId: row.adId || null, ad: row.ad || "N/D", spend: 0, impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0, conversations: 0, primaryResults: 0, videoPlays: 0, video25: 0, video50: 0, video75: 0, video100: 0, frequencyWeighted: 0, linkCtr: null, frequency: null, costPerPrimaryResult: null };
}

function acumularInsightMeta_(summary, row) {
  summary.spend += row.spend || 0;
  summary.impressions += row.impressions || 0;
  summary.reach += row.reach || 0;
  summary.linkClicks += row.linkClicks || 0;
  summary.landingPageViews += row.landingPageViews || 0;
  summary.conversations += row.conversations || 0;
  summary.primaryResults += row.primaryResults || 0;
  summary.videoPlays += row.videoPlays || 0;
  summary.video25 += row.video25 || 0;
  summary.video50 += row.video50 || 0;
  summary.video75 += row.video75 || 0;
  summary.video100 += row.video100 || 0;
  summary.frequencyWeighted += (row.frequency || 0) * (row.reach || 0);
}

function finalizarResumoInsightMeta_(summary) {
  summary.linkCtr = summary.impressions ? 100 * summary.linkClicks / summary.impressions : null;
  summary.frequency = summary.reach ? summary.impressions / summary.reach : null;
  summary.costPerPrimaryResult = summary.primaryResults ? summary.spend / summary.primaryResults : null;
  return summary;
}

function linhaFunilMeta_(rows, days, campaignCode, creativeCode) {
  return (rows || []).find((row) => row.windowDays === days && row.campaignCode === campaignCode && row.creativeCode === creativeCode) || null;
}

function assuntoRevisaoMetaAds_(report, context) {
  const mode = context.isMonthly ? "estratégica 90d" : context.isWeekly ? "semanal" : "alerta";
  return `[Meta Ads] Revisão ${mode} — ${context.today}${report.criticalAlerts.length ? ` — ${report.criticalAlerts.length} alerta(s)` : ""}`;
}

function emailTextoRevisaoMetaAds_(report, context) {
  const lines = [
    "REVISÃO META ADS — SOMENTE LEITURA",
    `Gerado em: ${report.generatedAt} BRT`,
    `Modo: ${context.isMonthly ? "mensal" : context.isWeekly ? "semanal" : "saúde diária"}`,
    "Nenhuma campanha foi alterada.",
    "",
    "ALERTAS CRÍTICOS",
  ];
  if (!report.criticalAlerts.length) lines.push("Nenhum alerta crítico.");
  report.criticalAlerts.forEach((row) => lines.push(`- ${row.priority} | ${row.title} | ${row.evidence} | Ação: ${row.action}`));
  if (context.isWeekly || context.isMonthly) {
    lines.push("", "DESEMPENHO POR CAMPANHA — 7 E 30 DIAS");
    const campaign7 = agruparInsightsMeta_(report.seven, "campaignId", true).__rows;
    const campaign30 = agruparInsightsMeta_(report.thirty, "campaignId", true).__rows;
    campaign30.forEach((row30) => {
      const row7 = campaign7.find((item) => item.campaignId === row30.campaignId);
      lines.push(`- ${row30.campaign}: 7d ${row7 ? `${brlMeta_(row7.spend)}, ${inteiroMeta_(row7.linkClicks)} cliques link, ${inteiroMeta_(row7.primaryResults)} resultados` : "N/D"}; 30d ${brlMeta_(row30.spend)}, alcance ${inteiroMeta_(row30.reach)}, frequência ${decimalMeta_(row30.frequency)}, CTR link ${percentualPontosMeta_(row30.linkCtr)}, LPV ${inteiroMeta_(row30.landingPageViews)}, conversas ${inteiroMeta_(row30.conversations)}, resultado principal ${inteiroMeta_(row30.primaryResults)}.`);
    });
    lines.push("", "CRIATIVOS — 7 DIAS");
    agruparInsightsMeta_(report.seven, "adId", true).__rows.sort((a, b) => b.spend - a.spend).slice(0, META_ADS_REVIEW_CONFIG.maxRowsPerSection).forEach((row) => {
      lines.push(`- ${row.campaign} / ${row.ad}: ${brlMeta_(row.spend)}; ${inteiroMeta_(row.impressions)} imp.; frequência ${decimalMeta_(row.frequency)}; CTR link ${percentualPontosMeta_(row.linkCtr)}; LPV ${inteiroMeta_(row.landingPageViews)}; conversas ${inteiroMeta_(row.conversations)}; vídeo 50% ${inteiroMeta_(row.video50)}; 100% ${inteiroMeta_(row.video100)}.`);
    });
    lines.push("", "SUGESTÕES");
    if (!report.suggestions.length) lines.push("Nenhuma sugestão com evidência suficiente.");
    report.suggestions.slice(0, META_ADS_REVIEW_CONFIG.maxRowsPerSection).forEach((row) => lines.push(`- ${row.priority} | ${row.queue} | ${row.campaign} / ${row.entity} | ${row.problem} | ${row.change}`));
    lines.push("", "FUNIL ANÔNIMO");
    [7, 30, 90].forEach((days) => {
      ["M26F01W", "M26F02S"].forEach((code) => {
        const row = linhaFunilMeta_(report.funnel, days, code, "__TOTAL__");
        if (row) lines.push(`- ${days}d ${code}: contatos ${row.contacts}; qualificados ${row.qualified}; agendados ${row.scheduled}; realizados ${row.completed}; fechamentos ${row.procedureClosed}.`);
      });
    });
  }
  if (report.warnings.length) lines.push("", "FONTES N/D", ...report.warnings.map((row) => `- ${row}`));
  const recent = entidadesMetaRecentes_(report, 14);
  if (recent.length) lines.push("", "ENTIDADES ALTERADAS NOS ÚLTIMOS 14 DIAS", ...recent.slice(0, META_ADS_REVIEW_CONFIG.maxRowsPerSection).map((row) => `- ${row.type}: ${row.name} — ${row.updatedTime}`));
  return lines.join("\n");
}

function emailHtmlRevisaoMetaAds_(report, context) {
  const alertRows = report.criticalAlerts.length ? report.criticalAlerts.map((row) => `<tr><td>${htmlMeta_(row.priority)}</td><td>${htmlMeta_(row.title)}</td><td>${htmlMeta_(row.evidence)}</td><td>${htmlMeta_(row.action)}</td></tr>`).join("") : '<tr><td colspan="4">Nenhum alerta crítico.</td></tr>';
  const suggestions = (context.isWeekly || context.isMonthly) ? report.suggestions.slice(0, META_ADS_REVIEW_CONFIG.maxRowsPerSection) : [];
  const suggestionRows = suggestions.length ? suggestions.map((row) => `<tr><td>${htmlMeta_(row.priority)}</td><td>${htmlMeta_(row.queue)}</td><td>${htmlMeta_(row.campaign)}<br>${htmlMeta_(row.entity)}</td><td>${htmlMeta_(row.problem)}<br><small>${htmlMeta_(row.evidence)}</small></td><td>${htmlMeta_(row.change)}<br><small>Guardrail: ${htmlMeta_(row.guardrail)}</small></td></tr>`).join("") : '<tr><td colspan="5">Nenhuma sugestão com evidência suficiente.</td></tr>';
  const funnelRows = [7, 30, 90].flatMap((days) => ["M26F01W", "M26F02S"].map((code) => ({ days, code, row: linhaFunilMeta_(report.funnel, days, code, "__TOTAL__") }))).filter((item) => item.row).map((item) => `<tr><td>${item.days}d</td><td>${htmlMeta_(item.code)}</td><td>${inteiroMeta_(item.row.contacts)}</td><td>${inteiroMeta_(item.row.qualified)}</td><td>${inteiroMeta_(item.row.scheduled)}</td><td>${inteiroMeta_(item.row.completed)}</td><td>${inteiroMeta_(item.row.procedureClosed)}</td></tr>`).join("") || '<tr><td colspan="7">N/D</td></tr>';
  const campaignTable = tabelaCampanhasHtmlMeta_(report);
  const creativeTable = tabelaCriativosHtmlMeta_(report);
  const recent = entidadesMetaRecentes_(report, 14);
  const recentHtml = recent.length ? `<h3>Entidades alteradas nos últimos 14 dias</h3><ul>${recent.slice(0, META_ADS_REVIEW_CONFIG.maxRowsPerSection).map((row) => `<li>${htmlMeta_(row.type)}: ${htmlMeta_(row.name)} — ${htmlMeta_(row.updatedTime)}</li>`).join("")}</ul>` : "";
  return `<div style="font-family:Arial,sans-serif;color:#202124;line-height:1.45"><h2>Revisão Meta Ads — somente leitura</h2><p><strong>Gerado:</strong> ${htmlMeta_(report.generatedAt)} BRT<br><strong>Modo:</strong> ${context.isMonthly ? "mensal" : context.isWeekly ? "semanal" : "saúde diária"}<br><strong>Conta:</strong> ${htmlMeta_(META_ADS_REVIEW_CONFIG.accountId)}<br><strong>Garantia:</strong> nenhuma campanha foi alterada.</p><h3>Alertas críticos</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Prioridade</th><th>Alerta</th><th>Evidência</th><th>Ação</th></tr>${alertRows}</table>${context.isWeekly || context.isMonthly ? `<h3>Campanhas — 7 e 30 dias</h3>${campaignTable}<h3>Criativos — 7 dias</h3>${creativeTable}<h3>Sugestões para revisão humana</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Prioridade</th><th>Fila</th><th>Escopo</th><th>Problema</th><th>Mudança sugerida</th></tr>${suggestionRows}</table><h3>Funil anônimo</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse"><tr><th>Janela</th><th>Código</th><th>Contatos</th><th>Qualificados+</th><th>Agendados+</th><th>Realizados+</th><th>Fechamentos</th></tr>${funnelRows}</table>${recentHtml}` : ""}${report.warnings.length ? `<h3>Fontes N/D</h3><ul>${report.warnings.map((row) => `<li>${htmlMeta_(row)}</li>`).join("")}</ul>` : ""}<p><small>Resultados da Meta, LPV e conversas são sinais de plataforma; não equivalem automaticamente a contato válido, paciente ou consulta. Qualquer ajuste permanece manual e depende de autorização.</small></p></div>`;
}

function tabelaCampanhasHtmlMeta_(report) {
  const seven = agruparInsightsMeta_(report.seven, "campaignId", true).__rows;
  const thirty = agruparInsightsMeta_(report.thirty, "campaignId", true).__rows;
  const rows = thirty.map((row30) => {
    const row7 = seven.find((item) => item.campaignId === row30.campaignId);
    return `<tr><td>${htmlMeta_(row30.campaign)}</td><td>${row7 ? brlMeta_(row7.spend) : "N/D"}</td><td>${row7 ? inteiroMeta_(row7.primaryResults) : "N/D"}</td><td>${brlMeta_(row30.spend)}</td><td>${inteiroMeta_(row30.reach)}</td><td>${decimalMeta_(row30.frequency)}</td><td>${percentualPontosMeta_(row30.linkCtr)}</td><td>${inteiroMeta_(row30.landingPageViews)}</td><td>${inteiroMeta_(row30.conversations)}</td><td>${inteiroMeta_(row30.primaryResults)}</td></tr>`;
  }).join("") || '<tr><td colspan="10">N/D</td></tr>';
  return `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Campanha</th><th>Gasto 7d</th><th>Resultado 7d</th><th>Gasto 30d</th><th>Alcance</th><th>Freq.</th><th>CTR link</th><th>LPV</th><th>Conversas</th><th>Resultado principal</th></tr>${rows}</table>`;
}

function tabelaCriativosHtmlMeta_(report) {
  const rows = agruparInsightsMeta_(report.seven, "adId", true).__rows.sort((a, b) => b.spend - a.spend).slice(0, META_ADS_REVIEW_CONFIG.maxRowsPerSection).map((row) => `<tr><td>${htmlMeta_(row.campaign)}</td><td>${htmlMeta_(row.ad)}</td><td>${brlMeta_(row.spend)}</td><td>${inteiroMeta_(row.impressions)}</td><td>${decimalMeta_(row.frequency)}</td><td>${percentualPontosMeta_(row.linkCtr)}</td><td>${inteiroMeta_(row.landingPageViews)}</td><td>${inteiroMeta_(row.conversations)}</td><td>${inteiroMeta_(row.video50)}</td><td>${inteiroMeta_(row.video100)}</td></tr>`).join("") || '<tr><td colspan="10">N/D</td></tr>';
  return `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Campanha</th><th>Anúncio</th><th>Gasto</th><th>Imp.</th><th>Freq.</th><th>CTR link</th><th>LPV</th><th>Conversas</th><th>Vídeo 50%</th><th>Vídeo 100%</th></tr>${rows}</table>`;
}

function entidadesMetaRecentes_(report, days) {
  const cutoff = new Date().getTime() - days * 86400000;
  return [
    ...(report.campaigns || []).map((row) => ({ type: "Campanha", name: row.name || row.id, updatedTime: row.updated_time })),
    ...(report.adsets || []).map((row) => ({ type: "Conjunto", name: row.name || row.id, updatedTime: row.updated_time })),
    ...(report.ads || []).map((row) => ({ type: "Anúncio", name: row.name || row.id, updatedTime: row.updated_time })),
  ].filter((row) => row.updatedTime && new Date(row.updatedTime).getTime() >= cutoff).sort((a, b) => String(b.updatedTime).localeCompare(String(a.updatedTime)));
}

function deveNotificarAlertasMeta_(report, context, properties) {
  if (context.isWeekly || context.isMonthly) return true;
  const digest = digestAlertasMeta_(report.criticalAlerts);
  const prior = String(properties.getProperty("META_ADS_LAST_ALERT_DIGEST") || "");
  const priorAt = Number(properties.getProperty("META_ADS_LAST_ALERT_AT") || 0);
  const ageHours = priorAt ? (new Date().getTime() - priorAt) / 3600000 : Infinity;
  return digest !== prior || ageHours >= META_ADS_REVIEW_CONFIG.alertCooldownHours;
}

function lembrarAlertasMeta_(report, context, properties) {
  if (!report.criticalAlerts.length) return;
  properties.setProperty("META_ADS_LAST_ALERT_DIGEST", digestAlertasMeta_(report.criticalAlerts));
  properties.setProperty("META_ADS_LAST_ALERT_AT", String(new Date().getTime()));
}

function digestAlertasMeta_(alerts) {
  const text = (alerts || []).map((row) => `${row.signature}|${Math.round(row.severity || 0)}`).sort().join("\n");
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, "").slice(0, 32);
}

function alertaMeta_(priority, title, evidence, action, signature, severity) {
  return { priority, title, evidence, action, signature, severity };
}

function sugestaoMeta_(priority, queue, campaign, entity, problem, evidence, change, impact, confidence, risk, metric, minimum, decisionRule) {
  return { priority, queue, campaign, entity, problem, evidence, change, impact, confidence, risk, metric, guardrail: risk, minimum, decisionRule, rollback: "Repor a configuração anterior documentada e reiniciar a janela; nenhuma reversão é automática." };
}

function mapaAcoesMeta_(rows) {
  const map = {};
  (rows || []).forEach((row) => { map[row.action_type] = (map[row.action_type] || 0) + (numeroMeta_(row.value) || 0); });
  return map;
}

function somaChavesMeta_(map, keys) {
  const values = keys.map((key) => map[key]).filter((value) => value !== undefined);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : 0;
}

function primeiraAcaoMeta_(rows) {
  if (!rows || !rows.length) return null;
  return numeroMeta_(rows[0].value);
}

function codigoCampanhaMeta_(value) {
  const match = String(value || "").toUpperCase().match(/\b(M26[A-Z]\d{2}[WS])\b/);
  return match ? match[1] : null;
}

function marcarFonteMeta_(rows, ok, label, error) {
  Object.defineProperties(rows, {
    __sourceOk: { value: Boolean(ok), enumerable: false },
    __sourceLabel: { value: label || "N/D", enumerable: false },
    __sourceError: { value: error || null, enumerable: false },
  });
  return rows;
}

function fonteMetaOk_(rows) {
  return Boolean(rows && rows.__sourceOk !== false);
}

function numeroMeta_(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numeroNuloMeta_(value) {
  return numeroMeta_(value);
}

function dataHoraMeta_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function erroCompactoMeta_(error) {
  return String(error && error.message ? error.message : error).replace(/\s+/g, " ").slice(0, 240);
}

function adicionarDiasMeta_(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function intervaloMeta_(start, end) {
  return { start: formatarDataMeta_(start), end: formatarDataMeta_(end) };
}

function formatarDataMeta_(date) {
  return Utilities.formatDate(date, META_ADS_REVIEW_CONFIG.accountTimeZone, "yyyy-MM-dd");
}

function quedaRelativaMeta_(current, previous) {
  return previous && current !== null ? Math.max(0, (previous - current) / previous) : 0;
}

function aumentoRelativoMeta_(current, previous) {
  return previous && current !== null ? Math.max(0, (current - previous) / previous) : 0;
}

function brlMeta_(value) {
  return value === null || value === undefined ? "N/D" : `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function dinheiroOuNdMeta_(value) {
  return value === null || value === undefined ? "N/D" : brlMeta_(value);
}

function inteiroMeta_(value) {
  return value === null || value === undefined ? "N/D" : String(Math.round(Number(value)));
}

function decimalMeta_(value) {
  return value === null || value === undefined ? "N/D" : Number(value).toFixed(2).replace(".", ",");
}

function percentualMeta_(value) {
  return value === null || value === undefined ? "N/D" : `${(100 * Number(value)).toFixed(1).replace(".", ",")}%`;
}

function percentualPontosMeta_(value) {
  return value === null || value === undefined ? "N/D" : `${Number(value).toFixed(2).replace(".", ",")}%`;
}

function htmlMeta_(value) {
  return String(value === null || value === undefined ? "N/D" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
