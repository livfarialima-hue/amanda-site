/**
 * LIV — revisão automatizada do Google Ads (somente leitura)
 *
 * Execução recomendada na conta 995-334-4486:
 * - agendar diariamente entre 09:00 e 10:00, no fuso da conta;
 * - de terça a domingo, enviar somente alertas críticos;
 * - toda segunda-feira, enviar a revisão completa da semana anterior;
 * - no primeiro dia útil do mês, acrescentar a leitura de 90 dias.
 *
 * Este script nunca altera campanhas. Ele consulta dados, produz sugestões e
 * envia o relatório para revisão humana. N/D não é convertido em zero.
 */

const CONFIG = Object.freeze({
  accountId: "995-334-4486",
  accountTimeZone: "America/Sao_Paulo",
  recipientEmail: "daniel.added@gmail.com",
  senderName: "Clínica LIV — revisão Google Ads",
  weeklyDayIso: 1,
  qualifiedConversionName: "Lead qualificado GCLID",
  whatsappProxyName: "Clique no WhatsApp - proxy temporária",
  minClicksForPositiveSuggestion: 3,
  minCostForNegativeSuggestion: 5,
  minCostForNoResultObservation: 20,
  minAccountCostForSignalAlert: 100,
  maxRowsPerSection: 40,
  aggregateSpreadsheetId: "1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0",
  aggregateSheetName: "Agregados",
  aggregateMaxAgeHours: 36,
  alertCooldownHours: 48,
  anomalyLookbackWeeks: 8,
  minAbsoluteAnomalyCost: 30,
  minClicksForSegmentDecision: 30,
  totalDailyBudgetReference: 87,
});

const IRRELEVANT_TERM_RULES = Object.freeze([
  { category: "emprego ou formação", regex: /\b(vaga|vagas|emprego|trabalhar|sal[aá]rio|curso|faculdade|resid[eê]ncia|especializa[cç][aã]o|prova)\b/i },
  { category: "gratuito, SUS ou convênio", regex: /\b(gr[aá]tis|gratuit[oa]|sus|conv[eê]nio|unimed|amil|bradesco sa[uú]de)\b/i },
  { category: "solução caseira ou produto", regex: /\b(caseir[oa]|em casa|creme|pomada|fita|massageador|aparelho para|produto para)\b/i },
]);

const PROTECTED_LAY_TERMS = Object.freeze([
  "plastica das palpebras",
  "plastica de palpebras",
  "cirurgia de palpebras",
  "orelha de abano",
  "cirurgia de orelha de abano",
  "papada",
  "pele sobrando no pescoco",
]);

const PROCEDURE_TOKENS = Object.freeze([
  "blefaroplastia",
  "palpebra",
  "lifting facial",
  "mini lifting",
  "ritidoplastia",
  "lifting cervical",
  "lifting de pescoco",
  "cervicoplastia",
  "platismoplastia",
  "lipo de papada",
  "papada",
  "otoplastia",
  "orelha de abano",
  "cirurgia facial",
  "cirurgiao plastico facial",
]);

// Negativas verificadas ao vivo em 2026-08-22 e mantidas como roteamento
// intencional entre campanhas ou grupos. A lista e deliberadamente especifica:
// um termo novo ou em outro nivel continua sendo sinalizado para revisao.
const INTENTIONAL_ROUTING_NEGATIVES = Object.freeze([
  { campaign: "S_BR_SP_BLEFAROPLASTIA", adGroup: "—", text: "lipo de papada", matchType: "PHRASE" },
  { campaign: "S_BR_SP_OTOPLASTIA", adGroup: "—", text: "lipo de papada", matchType: "PHRASE" },
  { campaign: "S_BR_SP_CIRURGIA_FACIAL", adGroup: "—", text: "cirurgia de palpebras", matchType: "PHRASE" },
  { campaign: "S_BR_SP_LIFTING_FACIAL", adGroup: "—", text: "cirurgia de palpebras", matchType: "PHRASE" },
  { campaign: "S_BR_SP_OTOPLASTIA", adGroup: "Adulto", text: "orelha de abano crianca", matchType: "PHRASE" },
  { campaign: "S_BR_SP_LIFTING_FACIAL", adGroup: "AG_LIFTING_FACIAL", text: "valor", matchType: "PHRASE" },
]);

function main() {
  const now = new Date();
  const context = createRunContext(now);
  const account = AdsApp.currentAccount();
  const liveAccountId = String(account.getCustomerId() || "").replace(/\D/g, "");
  const expectedAccountId = CONFIG.accountId.replace(/\D/g, "");

  if (liveAccountId !== expectedAccountId) {
    throw new Error(`Conta incorreta: esperado ${CONFIG.accountId}; observado ${account.getCustomerId()}.`);
  }

  try {
    const report = buildReviewReport(context, account);
    const criticalNotification = report.criticalAlerts.length > 0 && shouldNotifyCriticalAlerts(report, context);
    const shouldSend = context.isWeekly || context.isMonthly || criticalNotification;

    if (!shouldSend) {
      console.log("Rotina concluída sem alerta crítico; nenhum e-mail enviado.");
      return;
    }

    MailApp.sendEmail({
      to: CONFIG.recipientEmail,
      subject: buildSubject(report, context),
      body: buildPlainTextEmail(report, context),
      htmlBody: buildHtmlEmail(report, context),
      name: CONFIG.senderName,
    });
    rememberCriticalAlertDigest(report, context);

    console.log(`Relatório enviado para ${CONFIG.recipientEmail}.`);
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error);
    MailApp.sendEmail({
      to: CONFIG.recipientEmail,
      subject: `[Google Ads] ERRO na revisão automatizada — ${context.today}`,
      body: `A rotina somente leitura falhou. Nenhuma campanha foi alterada.\n\n${message}`,
      name: CONFIG.senderName,
    });
    throw error;
  }
}

function buildReviewReport(context, account) {
  const warnings = [];
  const weeklyCampaigns = safeQuery(
    "campanhas — semana anterior",
    campaignPerformanceQuery(context.week.start, context.week.end),
    warnings,
  );
  const thirtyDayCampaigns = safeQuery(
    "campanhas — 30 dias",
    campaignPerformanceQuery(context.thirtyDays.start, context.thirtyDays.end),
    warnings,
  );
  const previousSevenCampaigns = safeQuery(
    "campanhas — sete dias anteriores a ontem",
    campaignPerformanceQuery(context.previousSevenDays.start, context.previousSevenDays.end),
    warnings,
  );
  const yesterdayCampaigns = safeQuery(
    "campanhas — ontem",
    campaignPerformanceQuery(context.yesterday.start, context.yesterday.end),
    warnings,
  );
  const searchTerms = context.isWeekly || context.isMonthly
    ? safeQuery(
        "termos de pesquisa — 30 dias",
        searchTermsQuery(context.thirtyDays.start, context.thirtyDays.end),
        warnings,
      )
    : [];
  const keywords = context.isWeekly || context.isMonthly
    ? safeQuery(
        "palavras-chave positivas — 30 dias",
        keywordPerformanceQuery(context.thirtyDays.start, context.thirtyDays.end),
        warnings,
      )
    : [];
  const directNegatives = context.isWeekly || context.isMonthly
    ? readDirectNegatives(warnings)
    : [];
  const conversionActions = safeQuery(
    "ações de conversão — 30 dias",
    conversionActionQuery(context.thirtyDays.start, context.thirtyDays.end),
    warnings,
  );
  const policyIssues = safeQuery(
    "políticas dos anúncios ativos",
    policyIssuesQuery(),
    warnings,
  );
  const changes = context.isWeekly || context.isMonthly
    ? safeQuery(
        "mudanças recentes",
        recentChangesQuery(context.fourteenDays.start, context.fourteenDays.end),
        warnings,
      )
    : [];
  const ninetyDayCampaigns = context.isMonthly
    ? safeQuery(
        "campanhas — 90 dias",
        campaignPerformanceQuery(context.ninetyDays.start, context.ninetyDays.end),
        warnings,
      )
    : [];
  const dailyCampaigns = safeQuery(
    "campanhas por dia — oito semanas",
    dailyCampaignPerformanceQuery(context.fiftySixDays.start, context.fiftySixDays.end),
    warnings,
  );
  const conversionSettings = safeQuery(
    "configuração das ações de conversão",
    conversionSettingsQuery(),
    warnings,
  );
  const campaignGoals = safeQuery(
    "metas de conversão por campanha",
    campaignConversionGoalsQuery(),
    warnings,
  );
  const campaignGoalConfigs = safeQuery(
    "configuração efetiva de metas por campanha",
    conversionGoalCampaignConfigQuery(),
    warnings,
  );
  const customConversionGoals = safeQuery(
    "metas personalizadas de conversão",
    customConversionGoalsQuery(),
    warnings,
  );
  const activeAds = context.isWeekly || context.isMonthly
    ? safeQuery("RSAs e URLs finais ativos", activeAdsQuery(), warnings)
    : [];
  const assetPerformance = context.isWeekly || context.isMonthly
    ? safeQuery(
        "recursos dos anúncios — 30 dias",
        assetPerformanceQuery(context.thirtyDays.start, context.thirtyDays.end),
        warnings,
      )
    : [];
  const deviceSegments = context.isWeekly || context.isMonthly
    ? safeQuery("segmentação por dispositivo", devicePerformanceQuery(context.thirtyDays.start, context.thirtyDays.end), warnings)
    : [];
  const ageSegments = context.isWeekly || context.isMonthly
    ? safeQuery("segmentação por idade", agePerformanceQuery(context.thirtyDays.start, context.thirtyDays.end), warnings)
    : [];
  const timeSegments = context.isWeekly || context.isMonthly
    ? safeQuery("segmentação por dia e hora", timePerformanceQuery(context.thirtyDays.start, context.thirtyDays.end), warnings)
    : [];
  const networkSegments = context.isWeekly || context.isMonthly
    ? safeQuery("segmentação por rede", networkPerformanceQuery(context.thirtyDays.start, context.thirtyDays.end), warnings)
    : [];
  const funnelAggregates = readFunnelAggregates(warnings, context);
  const sharedNegatives = context.isWeekly || context.isMonthly
    ? readSharedNegatives(warnings)
    : [];
  const landingHealth = context.isWeekly || context.isMonthly
    ? readLandingHealth(activeAds, warnings)
    : [];

  const normalized = {
    weeklyCampaigns: weeklyCampaigns.map(normalizeCampaignRow),
    thirtyDayCampaigns: thirtyDayCampaigns.map(normalizeCampaignRow),
    previousSevenCampaigns: previousSevenCampaigns.map(normalizeCampaignRow),
    yesterdayCampaigns: yesterdayCampaigns.map(normalizeCampaignRow),
    searchTerms: searchTerms.map(normalizeSearchTermRow),
    keywords: keywords.map(normalizeKeywordRow),
    directNegatives,
    conversionActions: conversionActions.map(normalizeConversionRow),
    policyIssues: policyIssues.map(normalizePolicyRow),
    changes: changes.map(normalizeChangeRow),
    ninetyDayCampaigns: ninetyDayCampaigns.map(normalizeCampaignRow),
    dailyCampaigns: dailyCampaigns.map(normalizeDailyCampaignRow),
    conversionSettings: conversionSettings.map(normalizeConversionSettingRow),
    campaignGoals: campaignGoals.map(normalizeCampaignGoalRow),
    campaignGoalConfigs: campaignGoalConfigs.map(normalizeCampaignGoalConfigRow),
    customConversionGoals: customConversionGoals.map(normalizeCustomConversionGoalRow),
    activeAds: activeAds.map(normalizeActiveAdRow),
    assetPerformance: assetPerformance.map(normalizeAssetRow),
    deviceSegments: deviceSegments.map(normalizeSegmentRow("device.type")),
    ageSegments: ageSegments.map(normalizeAgeRow),
    timeSegments: timeSegments.map(normalizeTimeRow),
    networkSegments: networkSegments.map(normalizeSegmentRow("segments.adNetworkType")),
    funnelAggregates,
    sharedNegatives,
    landingHealth,
    sourceStatus: {
      weeklyCampaigns: sourceOk(weeklyCampaigns),
      thirtyDayCampaigns: sourceOk(thirtyDayCampaigns),
      yesterdayCampaigns: sourceOk(yesterdayCampaigns),
      dailyCampaigns: sourceOk(dailyCampaigns),
      searchTerms: sourceOk(searchTerms),
      keywords: sourceOk(keywords),
      directNegatives: sourceOk(directNegatives),
      sharedNegatives: sourceOk(sharedNegatives),
      conversionActions: sourceOk(conversionActions),
      conversionSettings: sourceOk(conversionSettings),
      campaignGoals: sourceOk(campaignGoals),
      campaignGoalConfigs: sourceOk(campaignGoalConfigs),
      customConversionGoals: sourceOk(customConversionGoals),
      policyIssues: sourceOk(policyIssues),
      changes: sourceOk(changes),
      activeAds: sourceOk(activeAds),
      assetPerformance: sourceOk(assetPerformance),
      deviceSegments: sourceOk(deviceSegments),
      ageSegments: sourceOk(ageSegments),
      timeSegments: sourceOk(timeSegments),
      networkSegments: sourceOk(networkSegments),
      funnelAggregates: sourceOk(funnelAggregates),
      landingHealth: sourceOk(landingHealth),
    },
  };

  const criticalAlerts = buildCriticalAlerts(normalized);
  const suggestions = context.isWeekly || context.isMonthly
    ? buildSuggestions(normalized)
    : [];

  return {
    accountName: account.getName(),
    accountId: account.getCustomerId(),
    accountTimeZone: account.getTimeZone ? account.getTimeZone() : CONFIG.accountTimeZone,
    generatedAt: Utilities.formatDate(new Date(), CONFIG.accountTimeZone, "yyyy-MM-dd HH:mm:ss"),
    ...normalized,
    criticalAlerts,
    suggestions,
    warnings,
  };
}

function safeQuery(label, query, warnings) {
  try {
    const iterator = AdsApp.search(query);
    const rows = [];
    while (iterator.hasNext()) rows.push(iterator.next());
    return markSource(rows, true, label);
  } catch (error) {
    warnings.push(`${label}: N/D — ${compactError(error)}`);
    return markSource([], false, label, compactError(error));
  }
}

function readDirectNegatives(warnings) {
  const rows = [];
  let ok = true;
  const queries = [
    {
      level: "campanha",
      query: `
        SELECT campaign.name, campaign_criterion.keyword.text,
          campaign_criterion.keyword.match_type
        FROM campaign_criterion
        WHERE campaign.status = 'ENABLED'
          AND campaign_criterion.type = 'KEYWORD'
          AND campaign_criterion.negative = TRUE
      `,
    },
    {
      level: "grupo",
      query: `
        SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type
        FROM ad_group_criterion
        WHERE campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.negative = TRUE
      `,
    },
  ];

  queries.forEach((item) => {
    const source = safeQuery(`negativas em nível de ${item.level}`, item.query, warnings);
    ok = ok && sourceOk(source);
    source.forEach((row) => {
      const criterion = item.level === "campanha" ? row.campaignCriterion : row.adGroupCriterion;
      rows.push({
        level: item.level,
        campaign: valueAt(row, "campaign.name", "N/D"),
        adGroup: item.level === "grupo" ? valueAt(row, "adGroup.name", "N/D") : "—",
        text: valueAt(criterion, "keyword.text", "N/D"),
        matchType: valueAt(criterion, "keyword.matchType", "N/D"),
      });
    });
  });

  return markSource(rows, ok, "negativas diretas");
}

function readSharedNegatives(warnings) {
  const rows = [];
  try {
    const lists = AdsApp.negativeKeywordLists().get();
    while (lists.hasNext()) {
      const list = lists.next();
      const campaigns = [];
      const campaignIterator = list.campaigns().get();
      while (campaignIterator.hasNext()) campaigns.push(campaignIterator.next().getName());
      const keywords = list.negativeKeywords().get();
      while (keywords.hasNext()) {
        const keyword = keywords.next();
        campaigns.forEach((campaign) => rows.push({
          level: "lista compartilhada",
          list: list.getName(),
          campaign,
          adGroup: "—",
          text: keyword.getText(),
          matchType: keyword.getMatchType(),
        }));
      }
    }
    return markSource(rows, true, "listas compartilhadas de negativas");
  } catch (error) {
    warnings.push(`listas compartilhadas de negativas: N/D — ${compactError(error)}`);
    return markSource([], false, "listas compartilhadas de negativas", compactError(error));
  }
}

function readFunnelAggregates(warnings, context) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.aggregateSpreadsheetId);
    const sheet = spreadsheet.getSheetByName(CONFIG.aggregateSheetName);
    if (!sheet) throw new Error("aba Agregados ausente");
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) throw new Error("agregado ainda sem dados");
    const headers = values[0].map((value) => String(value || "").trim());
    const required = ["schema_version", "generated_at", "window_days", "campaign", "contacts_identified", "qualified_or_later", "scheduled_or_later", "completed_or_later", "procedure_closed_milestone"];
    const indexes = required.reduce((map, header) => {
      const index = headers.indexOf(header);
      if (index < 0) throw new Error(`coluna ausente: ${header}`);
      map[header] = index;
      return map;
    }, {});
    const rows = values.slice(1).map((row) => ({
      schemaVersion: String(row[indexes.schema_version] || ""),
      generatedAt: row[indexes.generated_at],
      windowDays: Number(row[indexes.window_days]),
      campaign: String(row[indexes.campaign] || "N/D"),
      contacts: nullableNumber(row[indexes.contacts_identified]),
      classified: nullableNumber(row[headers.indexOf("contacts_classified")]),
      validContacts: nullableNumber(row[headers.indexOf("valid_contacts_classified")]),
      qualified: nullableNumber(row[indexes.qualified_or_later]),
      scheduled: nullableNumber(row[indexes.scheduled_or_later]),
      completed: nullableNumber(row[indexes.completed_or_later]),
      converted: nullableNumber(row[headers.indexOf("patient_converted")]),
      procedureClosed: nullableNumber(row[indexes.procedure_closed_milestone]),
      canonicalAttribution: nullableNumber(row[headers.indexOf("canonical_campaign_attribution")]),
      legacyAliasAttribution: nullableNumber(row[headers.indexOf("legacy_alias_resolved_attribution")]),
      unknownAttribution: nullableNumber(row[headers.indexOf("unknown_campaign_attribution")]),
    })).filter((row) => [7, 30, 90].includes(row.windowDays));
    const newest = rows.reduce((max, row) => Math.max(max, parseDateTime(row.generatedAt)), 0);
    const ageHours = newest ? (new Date().getTime() - newest) / 3600000 : Infinity;
    if (!Number.isFinite(ageHours) || ageHours > CONFIG.aggregateMaxAgeHours) {
      throw new Error(`agregado desatualizado (${Number.isFinite(ageHours) ? ageHours.toFixed(1) : "N/D"} h)`);
    }
    rows.freshnessHours = ageHours;
    return markSource(rows, true, "funil anônimo da planilha");
  } catch (error) {
    warnings.push(`funil anônimo da planilha: N/D — ${compactError(error)}. Métricas de negócio e custos por etapa não devem ser inferidos.`);
    return markSource([], false, "funil anônimo da planilha", compactError(error));
  }
}

function readLandingHealth(adRows, warnings) {
  if (!sourceOk(adRows)) return markSource([], false, "saúde das páginas", "URLs finais indisponíveis");
  const urls = dedupeObjects(
    adRows.map(normalizeActiveAdRow).flatMap((row) => row.finalUrls).filter(Boolean),
    (url) => url,
  ).slice(0, 30);
  if (!urls.length) return markSource([], true, "saúde das páginas");
  try {
    const responses = UrlFetchApp.fetchAll(urls.map((url) => ({ url, muteHttpExceptions: true, followRedirects: true })));
    const rows = responses.map((response, index) => {
      const body = String(response.getContentText() || "");
      return {
        url: urls[index],
        status: response.getResponseCode(),
        hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(body),
        hasTrackedWhatsapp: /data-track=["']whatsapp["']/i.test(body),
        bytes: body.length,
      };
    });
    return markSource(rows, true, "saúde das páginas");
  } catch (error) {
    warnings.push(`saúde das páginas: N/D — ${compactError(error)}`);
    return markSource([], false, "saúde das páginas", compactError(error));
  }
}

function buildCriticalAlerts(data) {
  const alerts = [];
  const sourceStatus = data.sourceStatus || {};
  const yesterday = sourceStatus.yesterdayCampaigns === false ? null : sumCampaignMetrics(data.yesterdayCampaigns || []);
  const anomaly = sourceStatus.dailyCampaigns === false
    ? null
    : accountSameWeekdayAnomaly(data.dailyCampaigns || []);

  if (anomaly && anomaly.isAnomaly) {
    alerts.push({
      priority: "P0",
      title: "Gasto diário muito acima da referência recente",
      evidence: `Ontem: ${brl(anomaly.observed)}; média do mesmo dia da semana nas ${anomaly.samples} semanas anteriores: ${brl(anomaly.mean)}; limite: ${brl(anomaly.threshold)}.`,
      action: "Conferir mudanças, termos e distribuição por campanha; não alterar orçamento automaticamente.",
      signature: "account_cost_same_weekday",
      severity: anomaly.observed,
    });
  }

  if (sourceStatus.yesterdayCampaigns !== false && sourceStatus.dailyCampaigns !== false) {
    (data.yesterdayCampaigns || []).forEach((campaign) => {
      const baseline = campaignSameWeekdayBaseline(data.dailyCampaigns || [], campaign.campaign);
      if (campaign.impressions === 0 && baseline.samples >= 2 && baseline.meanImpressions > 20) {
        alerts.push({
          priority: "P0",
          title: `Campanha sem impressões: ${campaign.campaign}`,
          evidence: `Ontem: 0 impressões; média do mesmo dia da semana em ${baseline.samples} semanas: ${integer(baseline.meanImpressions)}.`,
          action: "Verificar status, orçamento, reprovação e segmentação na conta.",
          signature: `no_impressions|${campaign.campaign}`,
          severity: baseline.meanImpressions,
        });
      }
    });
  }

  if (sourceStatus.policyIssues !== false) (data.policyIssues || []).forEach((issue) => {
    alerts.push({
      priority: "P0",
      title: `Anúncio ativo com política ${issue.approvalStatus}`,
      evidence: `${issue.campaign} / ${issue.adGroup}; anúncio ${issue.adId}.`,
      action: "Abrir o motivo editorial e avaliar correção; não duplicar ou publicar anúncio automaticamente.",
      signature: `policy|${issue.campaign}|${issue.adGroup}|${issue.adId}|${issue.approvalStatus}`,
      severity: 100,
    });
  });

  if (sourceStatus.thirtyDayCampaigns !== false && sourceStatus.conversionActions !== false) {
    const account30 = sumCampaignMetrics(data.thirtyDayCampaigns || []);
    const qualified = sumConversionsByName(data.conversionActions || [], CONFIG.qualifiedConversionName);
    if (account30.cost >= CONFIG.minAccountCostForSignalAlert && qualified === 0) {
      alerts.push({
        priority: "P0",
        title: "Nenhum lead qualificado visível na janela de 30 dias",
        evidence: `${brl(account30.cost)} de gasto; ação '${CONFIG.qualifiedConversionName}' com 0 ocorrências visíveis no Google Ads. Isso não prova zero leads reais.`,
        action: "Validar Data Manager, receipt e reconciliação LEADS/CRM antes de mudar lances ou escalar.",
        signature: "qualified_signal_zero",
        severity: account30.cost,
      });
    }
  }

  if (sourceStatus.conversionSettings !== false) {
    const qualifiedSetting = (data.conversionSettings || []).find((row) => row.name === CONFIG.qualifiedConversionName);
    if (!qualifiedSetting || qualifiedSetting.status !== "ENABLED" || qualifiedSetting.primaryForGoal !== true) {
      alerts.push({
        priority: "P0",
        title: "Objetivo qualificado indisponível ou fora do papel principal",
        evidence: qualifiedSetting
          ? `Status ${qualifiedSetting.status}; primary_for_goal=${qualifiedSetting.primaryForGoal}.`
          : `Ação '${CONFIG.qualifiedConversionName}' não retornou na consulta concluída.`,
        action: "Conferir a ação, meta de campanha e diagnóstico antes de confiar em Maximizar conversões.",
        signature: "qualified_conversion_configuration",
        severity: 100,
      });
    }
  }

  if (sourceStatus.landingHealth !== false) (data.landingHealth || []).forEach((page) => {
    if (page.status >= 400 || !page.hasCanonical || !page.hasTrackedWhatsapp) {
      alerts.push({
        priority: "P0",
        title: "Página final com falha técnica verificável",
        evidence: `${page.url}: HTTP ${page.status}; canonical=${page.hasCanonical}; CTA rastreado=${page.hasTrackedWhatsapp}.`,
        action: "Confirmar no navegador e corrigir a página antes de aumentar tráfego.",
        signature: `landing|${page.url}|${page.status}|${page.hasCanonical}|${page.hasTrackedWhatsapp}`,
        severity: page.status >= 400 ? 100 : 80,
      });
    }
  });

  return dedupeObjects(alerts, (row) => `${row.title}|${row.evidence}`);
}

function buildSuggestions(data) {
  const suggestions = [];
  const sourceStatus = data.sourceStatus || {};
  const priceIntentGroups = new Map();
  const keywordIndex = new Set(
    data.keywords.map((row) => `${row.campaign}|${row.adGroup}|${normalizeText(row.keyword)}|${row.matchType}`),
  );

  data.searchTerms.forEach((term) => {
    const classification = classifySearchTerm(term.searchTerm);
    const evidence = `${integer(term.clicks)} cliques; ${brl(term.cost)}; ${formatNumber(term.conversions)} conversões exibidas.`;

    if (
      classification.kind === "negative_candidate" &&
      term.cost >= CONFIG.minCostForNegativeSuggestion
    ) {
      suggestions.push({
        priority: "P1",
        decision: "testar",
        area: `${term.campaign} / ${term.adGroup}`,
        problem: `Termo incompatível (${classification.category})`,
        evidence,
        change: `Revisar e, se confirmado, adicionar [${term.searchTerm}] como negativa exata no menor nível seguro.`,
        guardrail: "Confirmar que a exclusão não bloqueia linguagem leiga ou outro procedimento legítimo; nunca aplicar automaticamente.",
        confidence: "média",
      });
      return;
    }

    if (classification.kind === "protected_lay_term") {
      suggestions.push({
        priority: "P2",
        decision: "não alterar",
        area: `${term.campaign} / ${term.adGroup}`,
        problem: "Linguagem leiga compatível que pode parecer genérica",
        evidence,
        change: `Preservar '${term.searchTerm}' e avaliar qualidade do lead antes de qualquer negativa.`,
        guardrail: "Não excluir apenas por ausência de jargão médico.",
        confidence: "alta",
      });
      return;
    }

    if (classification.kind === "price_intent") {
      addPriceIntentTerm(priceIntentGroups, term);
      return;
    }

    if (classification.kind === "relevant" && (term.clicks >= CONFIG.minClicksForPositiveSuggestion || term.conversions > 0)) {
      const exactKey = `${term.campaign}|${term.adGroup}|${normalizeText(term.searchTerm)}|EXACT`;
      if (!keywordIndex.has(exactKey)) {
        suggestions.push({
          priority: "P2",
          decision: "testar",
          area: `${term.campaign} / ${term.adGroup}`,
          problem: "Termo compatível com volume e sem palavra exata identificada",
          evidence,
          change: `Avaliar adicionar [${term.searchTerm}] como positiva exata no mesmo grupo.`,
          guardrail: "Confirmar ausência de canibalização e coerência termo → anúncio → página; uma mudança material por vez.",
          confidence: term.conversions > 0 ? "média" : "baixa",
        });
      }
    }

    if (term.cost >= CONFIG.minCostForNoResultObservation && term.conversions === 0) {
      suggestions.push({
        priority: "P2",
        decision: "observar",
        area: `${term.campaign} / ${term.adGroup}`,
        problem: "Gasto relevante sem conversão exibida",
        evidence,
        change: `Reconciliar o termo '${term.searchTerm}' com contato válido e lead qualificado antes de pausar ou negativar.`,
        guardrail: "Ausência de conversão com tracking incompleto não prova ausência de paciente.",
        confidence: "baixa",
      });
    }
  });

  priceIntentGroups.forEach((group) => {
    const examples = group.terms
      .slice()
      .sort((left, right) => right.cost - left.cost)
      .slice(0, 3)
      .map((term) => `'${term.searchTerm}'`)
      .join(", ");
    suggestions.push({
      priority: "P1",
      decision: "observar",
      area: group.area,
      problem: "Intenção explícita de preço exige roteamento, não exclusão genérica",
      evidence: `${group.terms.length} consulta(s); ${integer(group.clicks)} cliques; ${brl(group.cost)}; ${formatNumber(group.conversions)} conversões exibidas. Exemplos: ${examples}.`,
      change: "Conferir o roteamento do conjunto para o grupo e a página específicos de preço; preservar a intenção.",
      guardrail: "Não negativar preço, valor, custo ou quanto custa em nível de campanha/conta.",
      confidence: "alta",
    });
  });

  [...(data.directNegatives || []), ...(data.sharedNegatives || [])].forEach((negative) => {
    if (isIntentionalRoutingNegative(negative)) return;
    const normalized = normalizeText(negative.text);
    const riskyPrice = /(^|\s)(preco|valor|custo|quanto custa|valor medio)(\s|$)/.test(normalized) && negative.matchType !== "EXACT";
    const riskyLay = PROTECTED_LAY_TERMS.some((term) => normalized.includes(term));
    if (riskyPrice || riskyLay) {
      suggestions.push({
        priority: "P0",
        decision: "corrigir",
        area: `${negative.campaign} / ${negative.adGroup}`,
        problem: "Negativa com risco de bloquear busca legítima",
        evidence: `${negative.level}; ${negative.matchType}; '${negative.text}'.`,
        change: "Revisar impacto e remover ou restringir a correspondência se o bloqueio legítimo for confirmado.",
        guardrail: "Simular consultas afetadas antes da remoção; preservar negativas comerciais inequívocas.",
        confidence: "alta",
      });
    }
  });

  data.thirtyDayCampaigns.forEach((campaign) => {
    if (campaign.searchBudgetLostShare !== null && campaign.searchBudgetLostShare >= 0.2) {
      suggestions.push({
        priority: "P2",
        decision: "observar",
        area: campaign.campaign,
        problem: "Parcela relevante perdida por orçamento",
        evidence: `${percent(campaign.searchBudgetLostShare)} perdida por orçamento; ${brl(campaign.cost)} de gasto; ${formatNumber(campaign.conversions)} conversões mistas.`,
        change: "Avaliar realocação apenas depois de reconciliar lead qualificado e consulta; não aumentar automaticamente.",
        guardrail: "Preservar orçamento total e não combinar orçamento com lance, palavra, RSA ou página.",
        confidence: "média",
      });
    }
    if (campaign.searchRankLostShare !== null && campaign.searchRankLostShare >= 0.5) {
      suggestions.push({
        priority: "P2",
        decision: "observar",
        area: campaign.campaign,
        problem: "Perda alta por classificação",
        evidence: `${percent(campaign.searchRankLostShare)} perdida por classificação; CTR ${percent(campaign.ctr)}; CPC ${brl(campaign.averageCpc)}.`,
        change: "Revisar termos, coerência do RSA e página antes de considerar aumento de lance.",
        guardrail: "Não usar força do anúncio ou CTR como resultado final.",
        confidence: "média",
      });
    }
  });

  const proxyConversions = sumConversionsByName(data.conversionActions, CONFIG.whatsappProxyName);
  const qualifiedConversions = sumConversionsByName(data.conversionActions, CONFIG.qualifiedConversionName);
  if (proxyConversions > qualifiedConversions) {
    suggestions.push({
      priority: "P0",
      decision: "corrigir",
      area: "Conversões e lances",
      problem: "Conversão intermediária domina o número agregado",
      evidence: `${formatNumber(proxyConversions)} proxies de WhatsApp versus ${formatNumber(qualifiedConversions)} leads qualificados visíveis em 30 dias.`,
      change: "Apresentar as ações separadamente e não orientar lances ou orçamento pelo total misto.",
      guardrail: "Manter o lead qualificado como objetivo de negócio somente quando receipt e reconciliação estiverem saudáveis.",
      confidence: "alta",
    });
  }

  if (data.changes.length > 0) {
    const readiness = evaluateChangeReadiness(data.changes);
    suggestions.push({
      priority: "P1",
      decision: "Aguardar dados",
      area: "Conta",
      problem: "Mudanças recentes podem contaminar comparação",
      evidence: `${data.changes.length} eventos de mudança visíveis nos últimos 14 dias; estado: ${readiness.status}.`,
      change: `Separar janelas anteriores e posteriores; próxima leitura não contaminada estimada: ${readiness.nextReview}.`,
      guardrail: "Registrar data/hora e aguardar a janela mínima do experimento vigente.",
      confidence: "alta",
      minimum: "7 dias completos após a última mudança material; 14 dias para decisão de eficiência",
      metric: "lead qualificado, consulta e custo por etapa",
      rollback: "não aplicável: observação",
    });
  }

  (data.keywords || []).forEach((keyword) => {
    if (keyword.qualityScore !== null && keyword.impressions >= 30 && keyword.qualityScore <= 4) {
      suggestions.push({
        priority: "P1",
        decision: "Pode testar",
        area: `${keyword.campaign} / ${keyword.adGroup}`,
        problem: `Palavra com qualidade baixa (${keyword.qualityScore}/10)`,
        evidence: `${integer(keyword.impressions)} impr.; ${integer(keyword.clicks)} cliques; ${brl(keyword.cost)}; CTR esperado ${keyword.expectedCtr}; relevância ${keyword.adRelevance}; página ${keyword.landingPageExperience}.`,
        change: `Revisar coerência de '${keyword.keyword}' com termo, RSA e página; testar uma correção isolada, sem aumentar lance primeiro.`,
        guardrail: "Não pausar por Quality Score isolado; exigir dados de lead/consulta e preservar linguagem leiga.",
        confidence: "média",
        minimum: "30 impressões e ao menos 14 dias após a última mudança",
        metric: "lead qualificado e taxa termo → contato",
        rollback: "repor RSA/página/keyword anterior se piorar qualidade de lead ou volume elegível",
      });
    }
    if (keyword.impressions === 0) {
      suggestions.push({
        priority: "P3",
        decision: "Aguardar dados",
        area: `${keyword.campaign} / ${keyword.adGroup}`,
        problem: "Palavra ativa sem impressão em 30 dias",
        evidence: `'${keyword.keyword}' (${keyword.matchType}) teve 0 impressão na consulta concluída.`,
        change: "Verificar redundância, volume de busca e bloqueios; não remover automaticamente.",
        guardrail: "Ausência de impressão pode ser sazonal ou causada por outra correspondência.",
        confidence: "média",
        minimum: "30 dias completos",
        metric: "impressões elegíveis e termos cobertos",
        rollback: "manter a palavra se sua remoção reduzir cobertura legítima",
      });
    }
  });

  if (
    sourceStatus.conversionSettings !== false &&
    sourceStatus.campaignGoals !== false &&
    sourceStatus.campaignGoalConfigs !== false &&
    sourceStatus.customConversionGoals !== false
  ) {
    const setting = (data.conversionSettings || []).find((row) => row.name === CONFIG.qualifiedConversionName);
    const nonBiddable = setting ? findCampaignsMissingQualifiedGoal(data, setting) : [];
    if (setting && nonBiddable.length) {
      suggestions.push({
        priority: "P0",
        decision: "Corrigir agora",
        area: "Conversões e lances",
        problem: "Meta qualificada ausente da configuração efetiva de campanha",
        evidence: `${nonBiddable.length} campanha(s) sem cobertura efetiva confirmada: ${nonBiddable.join(", ")}.`,
        change: "Conferir a meta personalizada ou a meta padrão das campanhas afetadas antes de confiar no lance por conversão.",
        guardrail: "Não alterar o papel da conversão proxy e qualificada na mesma janela.",
        confidence: "alta",
        minimum: "correção de configuração, sem janela estatística",
        metric: "cobertura da meta e receipt de conversão qualificada",
        rollback: "restaurar a meta anterior se a ação qualificada deixar de receber sinais válidos",
      });
    }
  }

  (data.activeAds || []).forEach((ad) => {
    if (ad.type === "RESPONSIVE_SEARCH_AD" && (ad.headlineCount < 8 || ad.descriptionCount < 3)) {
      suggestions.push({
        priority: "P2",
        decision: "Pode testar",
        area: `${ad.campaign} / ${ad.adGroup}`,
        problem: "RSA com pouca variedade útil",
        evidence: `${ad.headlineCount} títulos e ${ad.descriptionCount} descrições; força ${ad.adStrength}.`,
        change: "Preparar variante que cubra intenção, segurança, localização, objeção e próximo passo sem repetição nem promessa médica.",
        guardrail: "Um RSA por vez; respeitar 30/90 caracteres e política médica; não usar força como resultado final.",
        confidence: "média",
        minimum: "14 dias e volume comparável por grupo",
        metric: "lead qualificado e contato válido, com CTR/CPC apenas diagnósticos",
        rollback: "reativar o RSA anterior se a qualidade ou volume elegível cair",
      });
    }
  });

  const assetProblems = (data.assetPerformance || []).filter((asset) => asset.performanceLabel === "LOW");
  if (assetProblems.length) {
    suggestions.push({
      priority: "P1",
      decision: "Pode testar",
      area: "RSAs e recursos",
      problem: "Recursos com desempenho baixo",
      evidence: `${assetProblems.length} vínculo(s) com performance_label=LOW; políticas são verificadas separadamente no anúncio ativo.`,
      change: "Revisar o ativo no contexto do grupo e substituir somente quando houver alternativa distinta e aprovada.",
      guardrail: "Não remover todos os ativos de um tipo; preservar cobertura e conformidade.",
      confidence: "média",
      minimum: "30 dias ou rótulo LOW estável com volume",
      metric: "lead qualificado e cobertura de ativos elegíveis",
      rollback: "restaurar ativo anterior se a cobertura ou qualidade cair",
    });
  }

  addSegmentSuggestions(suggestions, data.deviceSegments || [], "dispositivo");
  addSegmentSuggestions(suggestions, data.ageSegments || [], "idade");
  addSegmentSuggestions(suggestions, data.networkSegments || [], "rede");
  addTimeSuggestions(suggestions, data.timeSegments || []);

  (data.landingHealth || []).forEach((page) => {
    if (page.status === 200 && page.hasCanonical && page.hasTrackedWhatsapp) return;
    suggestions.push({
      priority: "P0",
      decision: "Corrigir agora",
      area: page.url,
      problem: "Destino final não passou no gate técnico",
      evidence: `HTTP ${page.status}; canonical=${page.hasCanonical}; CTA WhatsApp rastreado=${page.hasTrackedWhatsapp}.`,
      change: "Confirmar no navegador e corrigir apenas o componente técnico afetado.",
      guardrail: "Não mudar texto/layout durante uma correção puramente técnica sem autorização específica.",
      confidence: "alta",
      minimum: "gate binário",
      metric: "HTTP 200, canonical e CTA rastreado",
      rollback: "republicar o commit anterior se o smoke test falhar",
    });
  });

  if (sourceStatus.funnelAggregates !== false) addFunnelSuggestions(suggestions, data);
  else suggestions.push({
    priority: "P0",
    decision: "Corrigir agora",
    area: "Mensuração do funil",
    problem: "Agregado anônimo da LEADS indisponível ou desatualizado",
    evidence: "Custo por contato válido, lead, consulta e procedimento = N/D; nenhuma ausência deve ser tratada como zero.",
    change: "Restaurar a atualização do arquivo agregado sem conceder acesso à planilha com PII.",
    guardrail: "Nunca compartilhar a planilha LEADS com a conta de anúncios.",
    confidence: "alta",
    minimum: "agregado com menos de 36 horas",
    metric: "freshness e cobertura de atribuição",
    rollback: "desligar a leitura do agregado se o schema ou a privacidade divergirem",
  });

  return dedupeObjects(suggestions, (row) => `${row.area}|${row.problem}|${row.change}`)
    .map(finalizeSuggestion)
    .sort(compareSuggestions)
    .slice(0, 100);
}

function addPriceIntentTerm(groups, term) {
  const area = `${term.campaign} / ${term.adGroup}`;
  if (!groups.has(area)) groups.set(area, { area, terms: [], clicks: 0, cost: 0, conversions: 0 });
  const group = groups.get(area);
  group.terms.push(term);
  group.clicks += Number(term.clicks || 0);
  group.cost += Number(term.cost || 0);
  group.conversions += Number(term.conversions || 0);
}

function isIntentionalRoutingNegative(negative) {
  return INTENTIONAL_ROUTING_NEGATIVES.some((route) =>
    route.campaign === negative.campaign &&
    route.adGroup === negative.adGroup &&
    normalizeText(route.text) === normalizeText(negative.text) &&
    route.matchType === negative.matchType
  );
}

function findCampaignsMissingQualifiedGoal(data, setting) {
  const qualifiedResource = setting.resourceName;
  const customGoals = new Map((data.customConversionGoals || []).map((goal) => [goal.resourceName, goal]));
  const configs = data.campaignGoalConfigs || [];
  const categoryGoals = data.campaignGoals || [];
  const campaigns = new Set([
    ...configs.map((row) => row.campaign),
    ...categoryGoals.map((row) => row.campaign),
  ]);
  const missing = [];

  campaigns.forEach((campaign) => {
    const config = configs.find((row) => row.campaign === campaign);
    const customGoal = config && config.customConversionGoal
      ? customGoals.get(config.customConversionGoal)
      : null;
    if (config && config.goalConfigLevel === "CAMPAIGN" && config.customConversionGoal) {
      if (!customGoal || customGoal.status !== "ENABLED" || !customGoal.conversionActions.includes(qualifiedResource)) {
        missing.push(campaign);
      }
      return;
    }
    const categoryGoal = categoryGoals.find((row) =>
      row.campaign === campaign && row.category === setting.category && row.origin === setting.origin
    );
    if (!categoryGoal || categoryGoal.biddable !== true) missing.push(campaign);
  });

  return [...new Set(missing)].sort();
}

function classifySearchTerm(term) {
  const normalized = normalizeText(term);
  if (PROTECTED_LAY_TERMS.some((protectedTerm) => normalized.includes(protectedTerm))) {
    return { kind: "protected_lay_term", category: "linguagem leiga legítima" };
  }
  const irrelevant = IRRELEVANT_TERM_RULES.find((rule) => rule.regex.test(term));
  if (irrelevant) return { kind: "negative_candidate", category: irrelevant.category };
  if (/\b(preco|valor|custo|quanto custa|valor medio)\b/.test(normalized)) {
    return { kind: "price_intent", category: "preço" };
  }
  if (PROCEDURE_TOKENS.some((token) => normalized.includes(token))) {
    return { kind: "relevant", category: "procedimento compatível" };
  }
  return { kind: "ambiguous", category: "ambíguo" };
}

function campaignPerformanceQuery(start, end) {
  return `
    SELECT campaign.id, campaign.name, campaign.status,
      campaign.advertising_channel_type, campaign.bidding_strategy_type,
      campaign_budget.amount_micros, metrics.impressions, metrics.clicks,
      metrics.cost_micros, metrics.ctr, metrics.average_cpc,
      metrics.conversions, metrics.all_conversions,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share,
      metrics.search_top_impression_share,
      metrics.search_absolute_top_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
    ORDER BY metrics.cost_micros DESC
  `;
}

function searchTermsQuery(start, end) {
  return `
    SELECT campaign.name, ad_group.name, search_term_view.search_term,
      search_term_view.status, segments.keyword.info.text,
      segments.keyword.info.match_type, metrics.impressions, metrics.clicks,
      metrics.cost_micros, metrics.ctr, metrics.conversions,
      metrics.all_conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND metrics.impressions > 0
    ORDER BY metrics.cost_micros DESC
    LIMIT 5000
  `;
}

function keywordPerformanceQuery(start, end) {
  return `
    SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type, ad_group_criterion.status,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.ctr, metrics.conversions, metrics.all_conversions,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.search_predicted_ctr,
      ad_group_criterion.quality_info.creative_quality_score,
      ad_group_criterion.quality_info.post_click_quality_score
    FROM keyword_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group_criterion.negative = FALSE
    ORDER BY metrics.cost_micros DESC
  `;
}

function conversionActionQuery(start, end) {
  return `
    SELECT campaign.name, segments.conversion_action_name,
      metrics.conversions, metrics.all_conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND segments.conversion_action_name != ''
    ORDER BY metrics.all_conversions DESC
  `;
}

function policyIssuesQuery() {
  return `
    SELECT campaign.name, ad_group.name, ad_group_ad.ad.id,
      ad_group_ad.status, ad_group_ad.policy_summary.approval_status
    FROM ad_group_ad
    WHERE campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_ad.status = 'ENABLED'
      AND ad_group_ad.policy_summary.approval_status != 'APPROVED'
    LIMIT 1000
  `;
}

function recentChangesQuery(start, end) {
  return `
    SELECT change_event.change_date_time,
      change_event.change_resource_type,
      change_event.resource_change_operation,
      change_event.change_resource_name,
      change_event.client_type
    FROM change_event
    WHERE change_event.change_date_time BETWEEN '${start} 00:00:00' AND '${end} 23:59:59'
    ORDER BY change_event.change_date_time DESC
    LIMIT 1000
  `;
}

function dailyCampaignPerformanceQuery(start, end) {
  return `
    SELECT segments.date, campaign.name, metrics.impressions, metrics.clicks,
      metrics.cost_micros, metrics.conversions, metrics.all_conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
    ORDER BY segments.date DESC
  `;
}

function conversionSettingsQuery() {
  return `
    SELECT conversion_action.resource_name, conversion_action.name, conversion_action.status,
      conversion_action.primary_for_goal, conversion_action.category,
      conversion_action.origin, conversion_action.type,
      conversion_action.counting_type,
      conversion_action.click_through_lookback_window_days,
      conversion_action.attribution_model_settings.attribution_model
    FROM conversion_action
    WHERE conversion_action.name IN ('${CONFIG.qualifiedConversionName}', '${CONFIG.whatsappProxyName}')
  `;
}

function campaignConversionGoalsQuery() {
  return `
    SELECT campaign.name, campaign_conversion_goal.category,
      campaign_conversion_goal.origin, campaign_conversion_goal.biddable
    FROM campaign_conversion_goal
    WHERE campaign.status = 'ENABLED'
  `;
}

function conversionGoalCampaignConfigQuery() {
  return `
    SELECT campaign.name, conversion_goal_campaign_config.goal_config_level,
      conversion_goal_campaign_config.custom_conversion_goal
    FROM conversion_goal_campaign_config
    WHERE campaign.status = 'ENABLED'
  `;
}

function customConversionGoalsQuery() {
  return `
    SELECT custom_conversion_goal.resource_name, custom_conversion_goal.name,
      custom_conversion_goal.status, custom_conversion_goal.conversion_actions
    FROM custom_conversion_goal
  `;
}

function activeAdsQuery() {
  return `
    SELECT campaign.name, ad_group.name, ad_group_ad.ad.id,
      ad_group_ad.ad.type, ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad_strength,
      ad_group_ad.policy_summary.approval_status
    FROM ad_group_ad
    WHERE campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_ad.status = 'ENABLED'
  `;
}

function assetPerformanceQuery(start, end) {
  return `
    SELECT campaign.name, ad_group.name, asset.id, asset.type,
      ad_group_ad_asset_view.field_type,
      ad_group_ad_asset_view.performance_label,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.all_conversions
    FROM ad_group_ad_asset_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_ad_asset_view.enabled = TRUE
  `;
}

function devicePerformanceQuery(start, end) {
  return segmentPerformanceQuery(start, end, "segments.device");
}

function networkPerformanceQuery(start, end) {
  return segmentPerformanceQuery(start, end, "segments.ad_network_type");
}

function segmentPerformanceQuery(start, end, dimension) {
  return `
    SELECT campaign.name, ${dimension}, metrics.impressions, metrics.clicks,
      metrics.cost_micros, metrics.conversions, metrics.all_conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
    ORDER BY metrics.cost_micros DESC
  `;
}

function agePerformanceQuery(start, end) {
  return `
    SELECT campaign.name, ad_group_criterion.age_range.type,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.all_conversions
    FROM age_range_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
  `;
}

function timePerformanceQuery(start, end) {
  return `
    SELECT campaign.name, segments.day_of_week, segments.hour,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.all_conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
    ORDER BY metrics.cost_micros DESC
  `;
}

function normalizeCampaignRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    biddingStrategy: valueAt(row, "campaign.biddingStrategyType", "N/D"),
    budget: microsToMoney(valueAt(row, "campaignBudget.amountMicros", null)),
    impressions: numberAt(row, "metrics.impressions"),
    clicks: numberAt(row, "metrics.clicks"),
    cost: microsToMoney(valueAt(row, "metrics.costMicros", 0)),
    ctr: numberOrNull(valueAt(row, "metrics.ctr", null)),
    averageCpc: microsToMoney(valueAt(row, "metrics.averageCpc", 0)),
    conversions: numberAt(row, "metrics.conversions"),
    allConversions: numberAt(row, "metrics.allConversions"),
    searchImpressionShare: numberOrNull(valueAt(row, "metrics.searchImpressionShare", null)),
    searchBudgetLostShare: numberOrNull(valueAt(row, "metrics.searchBudgetLostImpressionShare", null)),
    searchRankLostShare: numberOrNull(valueAt(row, "metrics.searchRankLostImpressionShare", null)),
    searchTopImpressionShare: numberOrNull(valueAt(row, "metrics.searchTopImpressionShare", null)),
    searchAbsoluteTopImpressionShare: numberOrNull(valueAt(row, "metrics.searchAbsoluteTopImpressionShare", null)),
  };
}

function normalizeSearchTermRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    adGroup: valueAt(row, "adGroup.name", "N/D"),
    searchTerm: valueAt(row, "searchTermView.searchTerm", "N/D"),
    targetingStatus: valueAt(row, "searchTermView.status", "N/D"),
    matchedKeyword: valueAt(row, "segments.keyword.info.text", "N/D"),
    matchedKeywordType: valueAt(row, "segments.keyword.info.matchType", "N/D"),
    impressions: numberAt(row, "metrics.impressions"),
    clicks: numberAt(row, "metrics.clicks"),
    cost: microsToMoney(valueAt(row, "metrics.costMicros", 0)),
    ctr: numberOrNull(valueAt(row, "metrics.ctr", null)),
    conversions: numberAt(row, "metrics.conversions"),
    allConversions: numberAt(row, "metrics.allConversions"),
  };
}

function normalizeKeywordRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    adGroup: valueAt(row, "adGroup.name", "N/D"),
    keyword: valueAt(row, "adGroupCriterion.keyword.text", "N/D"),
    matchType: valueAt(row, "adGroupCriterion.keyword.matchType", "N/D"),
    impressions: numberAt(row, "metrics.impressions"),
    clicks: numberAt(row, "metrics.clicks"),
    cost: microsToMoney(valueAt(row, "metrics.costMicros", 0)),
    conversions: numberAt(row, "metrics.conversions"),
    qualityScore: numberOrNull(valueAt(row, "adGroupCriterion.qualityInfo.qualityScore", null)),
    expectedCtr: valueAt(row, "adGroupCriterion.qualityInfo.searchPredictedCtr", "N/D"),
    adRelevance: valueAt(row, "adGroupCriterion.qualityInfo.creativeQualityScore", "N/D"),
    landingPageExperience: valueAt(row, "adGroupCriterion.qualityInfo.postClickQualityScore", "N/D"),
  };
}

function normalizeConversionRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    action: valueAt(row, "segments.conversionActionName", "N/D"),
    conversions: numberAt(row, "metrics.conversions"),
    allConversions: numberAt(row, "metrics.allConversions"),
    value: numberAt(row, "metrics.conversionsValue"),
  };
}

function normalizePolicyRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    adGroup: valueAt(row, "adGroup.name", "N/D"),
    adId: valueAt(row, "adGroupAd.ad.id", "N/D"),
    approvalStatus: valueAt(row, "adGroupAd.policySummary.approvalStatus", "N/D"),
  };
}

function normalizeChangeRow(row) {
  return {
    dateTime: valueAt(row, "changeEvent.changeDateTime", "N/D"),
    resourceType: valueAt(row, "changeEvent.changeResourceType", "N/D"),
    operation: valueAt(row, "changeEvent.resourceChangeOperation", "N/D"),
    clientType: valueAt(row, "changeEvent.clientType", "N/D"),
  };
}

function normalizeDailyCampaignRow(row) {
  return {
    date: valueAt(row, "segments.date", "N/D"),
    campaign: valueAt(row, "campaign.name", "N/D"),
    impressions: numberAt(row, "metrics.impressions"),
    clicks: numberAt(row, "metrics.clicks"),
    cost: microsToMoney(valueAt(row, "metrics.costMicros", 0)),
    conversions: numberAt(row, "metrics.conversions"),
    allConversions: numberAt(row, "metrics.allConversions"),
  };
}

function normalizeConversionSettingRow(row) {
  return {
    resourceName: valueAt(row, "conversionAction.resourceName", "N/D"),
    name: valueAt(row, "conversionAction.name", "N/D"),
    status: valueAt(row, "conversionAction.status", "N/D"),
    primaryForGoal: valueAt(row, "conversionAction.primaryForGoal", null),
    category: valueAt(row, "conversionAction.category", "N/D"),
    origin: valueAt(row, "conversionAction.origin", "N/D"),
    type: valueAt(row, "conversionAction.type", "N/D"),
    countingType: valueAt(row, "conversionAction.countingType", "N/D"),
    lookbackDays: numberOrNull(valueAt(row, "conversionAction.clickThroughLookbackWindowDays", null)),
    attributionModel: valueAt(row, "conversionAction.attributionModelSettings.attributionModel", "N/D"),
  };
}

function normalizeCampaignGoalRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    category: valueAt(row, "campaignConversionGoal.category", "N/D"),
    origin: valueAt(row, "campaignConversionGoal.origin", "N/D"),
    biddable: valueAt(row, "campaignConversionGoal.biddable", null),
  };
}

function normalizeCampaignGoalConfigRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    goalConfigLevel: valueAt(row, "conversionGoalCampaignConfig.goalConfigLevel", "N/D"),
    customConversionGoal: valueAt(row, "conversionGoalCampaignConfig.customConversionGoal", ""),
  };
}

function normalizeCustomConversionGoalRow(row) {
  const conversionActions = valueAt(row, "customConversionGoal.conversionActions", []);
  return {
    resourceName: valueAt(row, "customConversionGoal.resourceName", "N/D"),
    name: valueAt(row, "customConversionGoal.name", "N/D"),
    status: valueAt(row, "customConversionGoal.status", "N/D"),
    conversionActions: Array.isArray(conversionActions) ? conversionActions.map(String) : [],
  };
}

function normalizeActiveAdRow(row) {
  const headlines = valueAt(row, "adGroupAd.ad.responsiveSearchAd.headlines", []);
  const descriptions = valueAt(row, "adGroupAd.ad.responsiveSearchAd.descriptions", []);
  const finalUrls = valueAt(row, "adGroupAd.ad.finalUrls", []);
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    adGroup: valueAt(row, "adGroup.name", "N/D"),
    adId: valueAt(row, "adGroupAd.ad.id", "N/D"),
    type: valueAt(row, "adGroupAd.ad.type", "N/D"),
    finalUrls: Array.isArray(finalUrls) ? finalUrls.map(String) : [],
    headlineCount: Array.isArray(headlines) ? headlines.length : 0,
    descriptionCount: Array.isArray(descriptions) ? descriptions.length : 0,
    adStrength: valueAt(row, "adGroupAd.adStrength", "N/D"),
    policy: valueAt(row, "adGroupAd.policySummary.approvalStatus", "N/D"),
  };
}

function normalizeAssetRow(row) {
  return {
    campaign: valueAt(row, "campaign.name", "N/D"),
    adGroup: valueAt(row, "adGroup.name", "N/D"),
    assetId: valueAt(row, "asset.id", "N/D"),
    assetType: valueAt(row, "asset.type", "N/D"),
    fieldType: valueAt(row, "adGroupAdAssetView.fieldType", "N/D"),
    performanceLabel: valueAt(row, "adGroupAdAssetView.performanceLabel", "N/D"),
    impressions: numberAt(row, "metrics.impressions"),
    clicks: numberAt(row, "metrics.clicks"),
    cost: microsToMoney(valueAt(row, "metrics.costMicros", 0)),
    conversions: numberAt(row, "metrics.conversions"),
  };
}

function normalizeSegmentRow(path) {
  return function normalize(row) {
    return {
      campaign: valueAt(row, "campaign.name", "N/D"),
      segment: valueAt(row, path, "N/D"),
      impressions: numberAt(row, "metrics.impressions"),
      clicks: numberAt(row, "metrics.clicks"),
      cost: microsToMoney(valueAt(row, "metrics.costMicros", 0)),
      conversions: numberAt(row, "metrics.conversions"),
      allConversions: numberAt(row, "metrics.allConversions"),
    };
  };
}

function normalizeAgeRow(row) {
  return normalizeSegmentRow("adGroupCriterion.ageRange.type")(row);
}

function normalizeTimeRow(row) {
  const normalized = normalizeSegmentRow("segments.dayOfWeek")(row);
  normalized.hour = numberOrNull(valueAt(row, "segments.hour", null));
  normalized.segment = `${normalized.segment} ${normalized.hour === null ? "N/D" : `${pad2(normalized.hour)}h`}`;
  return normalized;
}

function createRunContext(now) {
  const today = formatYmd(now);
  const isoDay = isoDayFromYmd(today);
  return {
    today,
    isWeekly: isoDay === CONFIG.weeklyDayIso,
    isMonthly: isFirstBusinessDay(today),
    yesterday: dateRangeBefore(today, 1, 1),
    week: dateRangeBefore(today, 7, 1),
    previousSevenDays: dateRangeBefore(today, 7, 2),
    fourteenDays: dateRangeBefore(today, 14, 1),
    thirtyDays: dateRangeBefore(today, 30, 1),
    fiftySixDays: dateRangeBefore(today, 56, 1),
    ninetyDays: dateRangeBefore(today, 90, 1),
  };
}

function formatYmd(date) {
  return Utilities.formatDate(date, CONFIG.accountTimeZone, "yyyy-MM-dd");
}

function dateRangeBefore(todayYmd, length, endOffset) {
  const end = shiftYmd(todayYmd, -endOffset);
  return { start: shiftYmd(end, -(length - 1)), end };
}

function shiftYmd(ymd, deltaDays) {
  const parts = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + deltaDays));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function isoDayFromYmd(ymd) {
  const parts = ymd.split("-").map(Number);
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
  return day === 0 ? 7 : day;
}

function isFirstBusinessDay(ymd) {
  const parts = ymd.split("-").map(Number);
  const currentDay = parts[2];
  if (isoDayFromYmd(ymd) >= 6) return false;
  for (let day = 1; day < currentDay; day += 1) {
    const candidate = `${parts[0]}-${pad2(parts[1])}-${pad2(day)}`;
    if (isoDayFromYmd(candidate) <= 5) return false;
  }
  return true;
}

function addSegmentSuggestions(suggestions, rows, label) {
  const grouped = groupBy(rows, (row) => row.campaign);
  Object.keys(grouped).forEach((campaign) => {
    const eligible = grouped[campaign].filter((row) => row.clicks >= CONFIG.minClicksForSegmentDecision);
    if (!eligible.length) return;
    const best = eligible.slice().sort((left, right) => segmentOutcomeScore(right) - segmentOutcomeScore(left))[0];
    const worst = eligible.slice().sort((left, right) => segmentOutcomeScore(left) - segmentOutcomeScore(right))[0];
    if (!best || !worst || best.segment === worst.segment) return;
    suggestions.push({
      priority: "P2",
      decision: "Aguardar dados",
      area: campaign,
      problem: `Diferença direcional por ${label}`,
      evidence: `${best.segment}: ${integer(best.clicks)} cliques/${formatNumber(best.conversions)} conversões mistas; ${worst.segment}: ${integer(worst.clicks)}/${formatNumber(worst.conversions)}.`,
      change: `Reconciliar contato válido e consulta por ${label}; só então testar ajuste de ${label} isoladamente.`,
      guardrail: label === "idade" ? "Manter sempre a faixa Desconhecida; preservar otoplastia e marca da regra facial." : "Não excluir segmento por CTR/CPC isolado.",
      confidence: "baixa",
      minimum: `${CONFIG.minClicksForSegmentDecision} cliques por segmento e ao menos 2 resultados de negócio`,
      metric: "custo por lead qualificado/consulta por segmento",
      rollback: "restaurar cobertura anterior se reduzir volume ou qualidade elegível",
    });
  });
}

function addTimeSuggestions(suggestions, rows) {
  const eligible = rows.filter((row) => row.clicks >= CONFIG.minClicksForSegmentDecision);
  if (!eligible.length) return;
  suggestions.push({
    priority: "P3",
    decision: "Aguardar dados",
    area: "Dias e horários",
    problem: "Distribuição horária requer funil, não apenas clique",
    evidence: `${eligible.length} combinação(ões) dia/hora atingiram ${CONFIG.minClicksForSegmentDecision}+ cliques em 30 dias.`,
    change: "Cruzar com contatos válidos e tempo de resposta antes de restringir a programação.",
    guardrail: "Não cortar horários em que a equipe pode responder depois e converter.",
    confidence: "baixa",
    minimum: "30 cliques e 2 consultas por faixa candidata",
    metric: "consulta realizada e SLA de resposta",
    rollback: "restaurar programação anterior se cair o volume elegível",
  });
}

function addFunnelSuggestions(suggestions, data) {
  const total30 = (data.funnelAggregates || []).find((row) => row.windowDays === 30 && row.campaign === "__TOTAL__");
  if (!total30) return;
  const total7 = (data.funnelAggregates || []).find((row) => row.windowDays === 7 && row.campaign === "__TOTAL__");
  const account30 = sumCampaignMetrics(data.thirtyDayCampaigns || []);
  const resolvedAttribution = Number(total30.canonicalAttribution || 0) + Number(total30.legacyAliasAttribution || 0);
  const coverage = safeRatio(resolvedAttribution, total30.contacts);
  if (coverage !== null && coverage < 0.8) {
    suggestions.push({
      priority: "P0",
      decision: "Corrigir agora",
      area: "Atribuição Google → LEADS",
      problem: "Campanha conhecida em menos de 80% dos contatos Google",
      evidence: `${integer(resolvedAttribution)} de ${integer(total30.contacts)} contatos com campanha resolvida: ${integer(total30.canonicalAttribution)} canônicos e ${integer(total30.legacyAliasAttribution)} aliases históricos documentados; cobertura ${percent(coverage)}.`,
      change: "Corrigir captura/códigos; resolver somente aliases do registro versionado e manter qualquer outro código como N/D.",
      guardrail: "Não usar página, procedimento ou nome do paciente para inventar campanha.",
      confidence: "alta",
      minimum: "gate técnico de 80% de cobertura resolvida",
      metric: "cobertura de campanha e divergência LEADS/CRM",
      rollback: "reverter o resolvedor se surgir falsa atribuição",
    });
  }
  if (total7 && Number(total7.legacyAliasAttribution || 0) > 0) {
    suggestions.push({
      priority: "P1",
      decision: "Corrigir agora",
      area: "Captura recente Google → LEADS",
      problem: "Alias legado ainda aparece em contatos recentes",
      evidence: `${integer(total7.legacyAliasAttribution)} contato(s) dos últimos 7 dias foram resolvidos por alias legado, separados dos ${integer(total7.canonicalAttribution)} canônicos.`,
      change: "Inspecionar parâmetros remanescentes em anúncio, asset, sitelink e first touch; preservar a resolução histórica, mas exigir código canônico nas novas entradas.",
      guardrail: "Não apagar first touch válido nem reatribuir código fora do registro versionado.",
      confidence: "alta",
      minimum: "zero alias novo após a janela de persistência e correção dos parâmetros",
      metric: "aliases legados por data do contato",
      rollback: "restaurar apenas o parâmetro comprovadamente necessário se a cobertura cair",
    });
  }
  const costPerQualified = safeCost(account30.cost, total30.qualified);
  const costPerScheduled = safeCost(account30.cost, total30.scheduled);
  suggestions.push({
    priority: "P1",
    decision: total30.scheduled > 0 ? "Aguardar dados" : "Corrigir agora",
    area: "Funil Google Ads — 30 dias",
    problem: "Eficiência até o resultado de negócio",
    evidence: `${integer(total30.contacts)} contatos; ${integer(total30.validContacts)} válidos classificados; ${integer(total30.qualified)} qualificados+; ${integer(total30.scheduled)} agendados+; ${integer(total30.completed)} realizados+; custo/qualificado ${brl(costPerQualified)}; custo/agendado ${brl(costPerScheduled)}.`,
    change: "Priorizar a etapa com maior perda verificável e manter mídia estável enquanto a mensuração estiver incompleta.",
    guardrail: "Fases refletem estado atual da coorte; ausência de marco de fechamento não prova ausência real.",
    confidence: coverage !== null && coverage >= 0.8 ? "média" : "baixa",
    minimum: "30 dias e agregado com menos de 36 horas",
    metric: "contato válido → qualificado → consulta realizada → fechamento registrado",
    rollback: "não aplicar mudança de mídia sem isolar a intervenção",
  });
}

function segmentOutcomeScore(row) {
  return row.clicks ? row.conversions / row.clicks : -1;
}

function safeCost(cost, outcomes) {
  return outcomes && Number.isFinite(Number(cost)) ? Number(cost) / Number(outcomes) : null;
}

function evaluateChangeReadiness(changes) {
  const timestamps = (changes || []).map((row) => parseDateTime(row.dateTime)).filter((value) => value > 0);
  if (!timestamps.length) return { status: "Pode decidir agora, sem mudança material datada na consulta", nextReview: "hoje" };
  const latest = Math.max(...timestamps);
  const ageDays = (new Date().getTime() - latest) / 86400000;
  const next = new Date(latest + 7 * 86400000);
  return {
    status: ageDays < 7 ? "janela contaminada — aguardar" : "pode decidir com cautela",
    nextReview: formatYmd(next),
  };
}

function accountSameWeekdayAnomaly(rows) {
  if (!rows.length) return null;
  const latestDate = rows.map((row) => row.date).filter((value) => value && value !== "N/D").sort().slice(-1)[0];
  if (!latestDate) return null;
  const observed = rows.filter((row) => row.date === latestDate).reduce((sum, row) => sum + row.cost, 0);
  const baselines = [];
  for (let week = 1; week <= CONFIG.anomalyLookbackWeeks; week += 1) {
    const date = shiftYmd(latestDate, -7 * week);
    const matching = rows.filter((row) => row.date === date);
    if (matching.length) baselines.push(matching.reduce((sum, row) => sum + row.cost, 0));
  }
  if (baselines.length < 3) return null;
  const mean = baselines.reduce((sum, value) => sum + value, 0) / baselines.length;
  const variance = baselines.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / baselines.length;
  const threshold = Math.max(mean * 2, mean + 3 * Math.sqrt(variance));
  return { observed, mean, threshold, samples: baselines.length, isAnomaly: observed - mean >= CONFIG.minAbsoluteAnomalyCost && observed > threshold };
}

function campaignSameWeekdayBaseline(rows, campaign) {
  const filtered = rows.filter((row) => row.campaign === campaign);
  if (!filtered.length) return { samples: 0, meanImpressions: 0 };
  const latestDate = filtered.map((row) => row.date).sort().slice(-1)[0];
  const values = [];
  for (let week = 1; week <= CONFIG.anomalyLookbackWeeks; week += 1) {
    const date = shiftYmd(latestDate, -7 * week);
    const matching = filtered.filter((row) => row.date === date);
    if (matching.length) values.push(matching.reduce((sum, row) => sum + row.impressions, 0));
  }
  return { samples: values.length, meanImpressions: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 };
}

function finalizeSuggestion(row) {
  return {
    priority: row.priority || "P3",
    decision: normalizeDecision(row.decision),
    area: row.area || "Conta",
    problem: row.problem || "N/D",
    evidence: row.evidence || "N/D",
    change: row.change || "Observar sem alteração.",
    impact: row.impact || "melhor decisão e menor risco de desperdício",
    risk: row.risk || "mudança prematura ou interpretação de proxy como resultado",
    confidence: row.confidence || "baixa",
    metric: row.metric || "lead qualificado e consulta",
    guardrail: row.guardrail || "uma mudança por vez; não automatizar",
    minimum: row.minimum || "14 dias e amostra de negócio suficiente",
    rollback: row.rollback || "restaurar a configuração anterior se o guardrail falhar",
    nextReview: row.nextReview || "próxima revisão semanal",
  };
}

function normalizeDecision(value) {
  const normalized = normalizeText(value);
  if (normalized === "corrigir" || normalized === "corrigir agora") return "Corrigir agora";
  if (normalized === "testar" || normalized === "pode testar") return "Pode testar";
  if (normalized === "nao alterar") return "Não alterar";
  return "Aguardar dados";
}

function groupBy(rows, keyFn) {
  return (rows || []).reduce((groups, row) => {
    const key = keyFn(row);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
    return groups;
  }, {});
}

function markSource(rows, ok, label, error) {
  rows.sourceOk = ok === true;
  rows.sourceLabel = label || "N/D";
  rows.sourceError = error || "";
  return rows;
}

function sourceOk(rows) {
  return Boolean(rows && rows.sourceOk === true);
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function shouldNotifyCriticalAlerts(report, context) {
  if (context.isWeekly || context.isMonthly) return true;
  try {
    const properties = PropertiesService.getScriptProperties();
    const previous = JSON.parse(properties.getProperty("LIV_GADS_ALERT_STATE_V2") || "{}");
    const current = criticalAlertState(report, context);
    if (!previous.fingerprint || previous.fingerprint !== current.fingerprint) return true;
    if (current.severity > Number(previous.severity || 0)) return true;
    return current.generatedAt - Number(previous.generatedAt || 0) >= CONFIG.alertCooldownHours * 3600000;
  } catch (error) {
    console.log(`Cooldown N/D: ${compactError(error)}`);
    return true;
  }
}

function rememberCriticalAlertDigest(report, context) {
  if (!report.criticalAlerts.length) return;
  try {
    PropertiesService.getScriptProperties().setProperty(
      "LIV_GADS_ALERT_STATE_V2",
      JSON.stringify(criticalAlertState(report, context)),
    );
  } catch (error) {
    console.log(`Persistência do cooldown N/D: ${compactError(error)}`);
  }
}

function criticalAlertState(report, context) {
  const signatures = report.criticalAlerts.map((row) => row.signature || row.title).sort();
  const severity = report.criticalAlerts.reduce((max, row) => Math.max(max, Number(row.severity || 0)), 0);
  return { fingerprint: signatures.join("|"), severity, generatedAt: new Date().getTime(), day: context.today };
}

function buildSubject(report, context) {
  const high = report.suggestions.filter((row) => row.priority === "P0" || row.priority === "P1").length;
  if (!context.isWeekly && !context.isMonthly) {
    return `[Google Ads] ALERTA — ${report.criticalAlerts.length} item(ns) crítico(s) — ${context.today}`;
  }
  const monthly = context.isMonthly ? " + mensal" : "";
  return `[Google Ads] Revisão semanal${monthly} — ${report.suggestions.length} sugestões (${high} prioritárias) — ${context.today}`;
}

function buildPlainTextEmail(report, context) {
  const lines = [
    `Conta: ${report.accountName} (${report.accountId})`,
    `Gerado em: ${report.generatedAt} (${report.accountTimeZone})`,
    `Janela semanal: ${context.week.start} a ${context.week.end}`,
    "",
    "Este relatório é somente leitura. Nenhuma alteração foi aplicada.",
    "Sugestões exigem revisão humana e autorização específica.",
    "",
    `Alertas críticos: ${report.criticalAlerts.length}`,
  ];
  report.criticalAlerts.forEach((row) => lines.push(`- ${row.priority} ${row.title}: ${row.evidence} Ação: ${row.action}`));
  ["Corrigir agora", "Pode testar", "Aguardar dados", "Não alterar"].forEach((decision) => {
    const rows = report.suggestions.filter((row) => row.decision === decision);
    const omitted = Math.max(0, rows.length - CONFIG.maxRowsPerSection);
    lines.push("", `${decision}: ${rows.length}${omitted ? ` (exibindo ${CONFIG.maxRowsPerSection}; ${omitted} omitida(s))` : ""}`);
    rows.slice(0, CONFIG.maxRowsPerSection).forEach((row) => {
      lines.push(`- ${row.priority} ${row.area}: ${row.problem}. Evidência: ${row.evidence} Ação: ${row.change} Mínimo: ${row.minimum}. Métrica: ${row.metric}. Guardrail: ${row.guardrail}. Rollback: ${row.rollback}.`);
    });
  });
  const funnel30 = report.funnelAggregates.find((row) => row.windowDays === 30 && row.campaign === "__TOTAL__");
  lines.push("", "Funil anônimo — 30 dias:");
  lines.push(funnel30
    ? `- contatos ${integer(funnel30.contacts)}; válidos classificados ${integer(funnel30.validContacts)}; qualificados+ ${integer(funnel30.qualified)}; agendados+ ${integer(funnel30.scheduled)}; realizados+ ${integer(funnel30.completed)}; fechamentos por marco ${integer(funnel30.procedureClosed)}.`
    : "- N/D. Não interpretar como zero.");
  if (report.warnings.length) {
    lines.push("", "Limitações/N/D:");
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  return lines.join("\n");
}

function buildHtmlEmail(report, context) {
  const weeklyTotals = sumCampaignMetrics(report.weeklyCampaigns);
  const thirtyTotals = sumCampaignMetrics(report.thirtyDayCampaigns);
  const criticalRows = report.criticalAlerts.length
    ? report.criticalAlerts.map((row) => `<tr><td>${html(row.priority)}</td><td>${html(row.title)}</td><td>${html(row.evidence)}</td><td>${html(row.action)}</td></tr>`).join("")
    : "<tr><td colspan='4'>Nenhum alerta crítico observado nas consultas concluídas.</td></tr>";
  const suggestionBlocks = ["Corrigir agora", "Pode testar", "Aguardar dados", "Não alterar"].map((decision) => {
    const allRows = report.suggestions.filter((row) => row.decision === decision);
    const rows = allRows.slice(0, CONFIG.maxRowsPerSection);
    const omitted = Math.max(0, allRows.length - rows.length);
    const body = rows.length
      ? rows.map((row) => `<tr><td>${html(row.priority)}</td><td>${html(row.area)}</td><td>${html(row.problem)}</td><td>${html(row.evidence)}</td><td>${html(row.change)}</td><td>${html(row.minimum)}</td><td>${html(row.metric)}</td><td>${html(row.guardrail)}</td><td>${html(row.rollback)}</td><td>${html(row.confidence)}</td></tr>`).join("")
      : "<tr><td colspan='10'>Nenhum item.</td></tr>";
    const disclosure = omitted ? `<p><strong>${omitted} item(ns) omitido(s) desta seção por limite de exibição.</strong></p>` : "";
    return `<h2>${html(decision)} (${allRows.length})</h2>${disclosure}<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Prioridade</th><th>Área</th><th>Problema</th><th>Evidência</th><th>Mudança exata</th><th>Amostra/janela</th><th>Métrica</th><th>Guardrail</th><th>Rollback</th><th>Confiança</th></tr>${body}</table>`;
  }).join("");
  const campaignRows = report.thirtyDayCampaigns.map((row) => `<tr><td>${html(row.campaign)}</td><td>${integer(row.impressions)}</td><td>${integer(row.clicks)}</td><td>${percent(row.ctr)}</td><td>${brl(row.averageCpc)}</td><td>${brl(row.cost)}</td><td>${formatNumber(row.conversions)}</td><td>${percent(row.searchImpressionShare)}</td><td>${percent(row.searchBudgetLostShare)}</td><td>${percent(row.searchRankLostShare)}</td></tr>`).join("");
  const warningRows = report.warnings.length
    ? `<ul>${report.warnings.map((warning) => `<li>${html(warning)}</li>`).join("")}</ul>`
    : "<p>Nenhuma limitação técnica adicional registrada.</p>";
  const monthlyBlock = context.isMonthly
    ? `<h2>Leitura mensal ampliada</h2><p>Janela de 90 dias: ${html(context.ninetyDays.start)} a ${html(context.ninetyDays.end)}. Total observado: ${brl(sumCampaignMetrics(report.ninetyDayCampaigns).cost)} de gasto. Reavaliar eficiência do funil, correspondências, cenários de realocação dentro de ${brl(CONFIG.totalDailyBudgetReference)}/dia, sobreposição e prontidão de novos testes; mudanças recentes devem ser separadas.</p>`
    : "";
  const sourceRows = Object.keys(report.sourceStatus).map((key) => `<tr><td>${html(key)}</td><td>${report.sourceStatus[key] ? "OK" : "N/D"}</td></tr>`).join("");
  const funnelRows = report.funnelAggregates.filter((row) => row.windowDays === 30).map((row) => {
    const campaign = row.campaign === "__TOTAL__" ? "Conta" : row.campaign === "__UNKNOWN_CAMPAIGN__" ? "Campanha N/D" : row.campaign;
    const media = row.campaign === "__TOTAL__" ? thirtyTotals : report.thirtyDayCampaigns.find((item) => item.campaign === row.campaign);
    const resolvedAttribution = Number(row.canonicalAttribution || 0) + Number(row.legacyAliasAttribution || 0);
    return `<tr><td>${html(campaign)}</td><td>${integer(row.contacts)}</td><td>${integer(row.validContacts)}</td><td>${integer(row.qualified)}</td><td>${integer(row.scheduled)}</td><td>${integer(row.completed)}</td><td>${integer(row.procedureClosed)}</td><td>${integer(row.canonicalAttribution)}</td><td>${integer(row.legacyAliasAttribution)}</td><td>${percent(safeRatio(resolvedAttribution,row.contacts))}</td><td>${brl(media ? safeCost(media.cost,row.qualified) : null)}</td><td>${brl(media ? safeCost(media.cost,row.scheduled) : null)}</td></tr>`;
  }).join("");

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.45">
    <h1 style="color:#14532d">Revisão automatizada do Google Ads</h1>
    <p><strong>Conta:</strong> ${html(report.accountName)} (${html(report.accountId)})<br>
    <strong>Gerado:</strong> ${html(report.generatedAt)} (${html(report.accountTimeZone)})</p>
    <p style="background:#ecfdf5;padding:12px;border-left:4px solid #15803d"><strong>Somente leitura.</strong> Nenhuma campanha, palavra, negativa, anúncio, lance ou orçamento foi alterado. Toda sugestão depende de revisão humana e autorização específica.</p>
    <h2>Resumo</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><th>Janela</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>Gasto</th><th>Conversões exibidas</th></tr>
      <tr><td>${html(context.week.start)} a ${html(context.week.end)}</td><td>${integer(weeklyTotals.impressions)}</td><td>${integer(weeklyTotals.clicks)}</td><td>${percent(safeRatio(weeklyTotals.clicks, weeklyTotals.impressions))}</td><td>${brl(weeklyTotals.cost)}</td><td>${formatNumber(weeklyTotals.conversions)}</td></tr>
      <tr><td>${html(context.thirtyDays.start)} a ${html(context.thirtyDays.end)}</td><td>${integer(thirtyTotals.impressions)}</td><td>${integer(thirtyTotals.clicks)}</td><td>${percent(safeRatio(thirtyTotals.clicks, thirtyTotals.impressions))}</td><td>${brl(thirtyTotals.cost)}</td><td>${formatNumber(thirtyTotals.conversions)}</td></tr>
    </table>
    <h2>Alertas críticos</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Prioridade</th><th>Alerta</th><th>Evidência</th><th>Ação</th></tr>${criticalRows}</table>
    ${suggestionBlocks}
    <h2>Campanhas ativas — 30 dias</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Campanha</th><th>Impr.</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Gasto</th><th>Conversões</th><th>IS</th><th>Perda orçamento</th><th>Perda rank</th></tr>${campaignRows || "<tr><td colspan='10'>N/D</td></tr>"}</table>
    <h2>Funil anônimo da LEADS — coorte de 30 dias</h2>
    <p>O arquivo agregado não contém nome, telefone, mensagem, click ID ou Opportunity ID. Fases refletem o estado atual da coorte. N/D nunca é convertido em zero.</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Campanha</th><th>Contatos</th><th>Válidos classificados</th><th>Qualificados+</th><th>Agendados+</th><th>Realizados+</th><th>Fechamento por marco</th><th>Código canônico</th><th>Alias legado</th><th>Cobertura resolvida</th><th>Custo/qualificado</th><th>Custo/agendado</th></tr>${funnelRows || "<tr><td colspan='12'>N/D — fonte indisponível; não interpretar como zero.</td></tr>"}</table>
    <h2>Saúde das fontes</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse"><tr><th>Fonte</th><th>Status</th></tr>${sourceRows}</table>
    ${monthlyBlock}
    <h2>Limitações e N/D</h2>${warningRows}
    <p><strong>Regra operacional:</strong> não aceitar recomendação do Google, adicionar negativa, pausar palavra, consolidar grupo, alterar orçamento ou lance a partir deste e-mail isoladamente. A decisão deve considerar contato válido, lead qualificado, consulta e mudanças recentes.</p>
  </body></html>`;
}

function sumCampaignMetrics(rows) {
  return rows.reduce((sum, row) => ({
    impressions: sum.impressions + row.impressions,
    clicks: sum.clicks + row.clicks,
    cost: sum.cost + row.cost,
    conversions: sum.conversions + row.conversions,
    allConversions: sum.allConversions + row.allConversions,
  }), { impressions: 0, clicks: 0, cost: 0, conversions: 0, allConversions: 0 });
}

function sumConversionsByName(rows, name) {
  return rows.filter((row) => row.action === name).reduce((sum, row) => sum + row.allConversions, 0);
}

function valueAt(object, path, fallback) {
  let value = object;
  const parts = String(path).split(".");
  for (let index = 0; index < parts.length; index += 1) {
    if (value == null || typeof value !== "object" || !(parts[index] in value)) return fallback;
    value = value[parts[index]];
  }
  return value == null ? fallback : value;
}

function numberAt(object, path) {
  const value = Number(valueAt(object, path, 0));
  return Number.isFinite(value) ? value : 0;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "" || value === "--") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function microsToMoney(value) {
  const number = numberOrNull(value);
  return number === null ? 0 : number / 1000000;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactError(error) {
  return String(error && error.message ? error.message : error).replace(/\s+/g, " ").slice(0, 300);
}

function dedupeObjects(rows, keyFn) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareSuggestions(left, right) {
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return (order[left.priority] ?? 9) - (order[right.priority] ?? 9) || left.area.localeCompare(right.area);
}

function safeRatio(numerator, denominator) {
  return denominator ? numerator / denominator : null;
}

function brl(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/D";
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function percent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/D";
  return `${(Number(value) * 100).toFixed(2).replace(".", ",")}%`;
}

function integer(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/D";
  return String(Math.round(Number(value)));
}

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/D";
  return Number(value).toFixed(2).replace(".", ",");
}

function html(value) {
  return String(value == null ? "N/D" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}
