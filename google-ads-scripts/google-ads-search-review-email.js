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
    const shouldSend = context.isWeekly || context.isMonthly || report.criticalAlerts.length > 0;

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
    return rows;
  } catch (error) {
    warnings.push(`${label}: N/D — ${compactError(error)}`);
    return [];
  }
}

function readDirectNegatives(warnings) {
  const rows = [];
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
    safeQuery(`negativas em nível de ${item.level}`, item.query, warnings).forEach((row) => {
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

  warnings.push("Listas compartilhadas de negativas: revisar na interface; o script inventaria somente negativas diretas.");
  return rows;
}

function buildCriticalAlerts(data) {
  const alerts = [];
  const yesterday = sumCampaignMetrics(data.yesterdayCampaigns);
  const previous = sumCampaignMetrics(data.previousSevenCampaigns);
  const dailyAverageCost = previous.cost / 7;

  if (yesterday.cost >= 50 && dailyAverageCost > 0 && yesterday.cost > dailyAverageCost * 2) {
    alerts.push({
      priority: "P0",
      title: "Gasto diário muito acima da referência recente",
      evidence: `Ontem: ${brl(yesterday.cost)}; média dos sete dias anteriores: ${brl(dailyAverageCost)}.`,
      action: "Conferir mudanças, termos e distribuição por campanha; não alterar orçamento automaticamente.",
    });
  }

  data.yesterdayCampaigns.forEach((campaign) => {
    const baseline = data.previousSevenCampaigns.find((row) => row.campaign === campaign.campaign);
    if (campaign.impressions === 0 && baseline && baseline.impressions > 20) {
      alerts.push({
        priority: "P0",
        title: `Campanha sem impressões: ${campaign.campaign}`,
        evidence: `Ontem: 0 impressões; sete dias anteriores: ${integer(baseline.impressions)}.`,
        action: "Verificar status, orçamento, reprovação e segmentação na conta.",
      });
    }
  });

  data.policyIssues.forEach((issue) => {
    alerts.push({
      priority: "P0",
      title: `Anúncio ativo com política ${issue.approvalStatus}`,
      evidence: `${issue.campaign} / ${issue.adGroup}; anúncio ${issue.adId}.`,
      action: "Abrir o motivo editorial e avaliar correção; não duplicar ou publicar anúncio automaticamente.",
    });
  });

  const account30 = sumCampaignMetrics(data.thirtyDayCampaigns);
  const qualified = sumConversionsByName(data.conversionActions, CONFIG.qualifiedConversionName);
  if (account30.cost >= CONFIG.minAccountCostForSignalAlert && qualified === 0) {
    alerts.push({
      priority: "P0",
      title: "Nenhum lead qualificado visível na janela de 30 dias",
      evidence: `${brl(account30.cost)} de gasto; ação '${CONFIG.qualifiedConversionName}' sem ocorrência visível.`,
      action: "Validar Data Manager, receipt e reconciliação LEADS/CRM antes de mudar lances ou escalar.",
    });
  }

  return dedupeObjects(alerts, (row) => `${row.title}|${row.evidence}`);
}

function buildSuggestions(data) {
  const suggestions = [];
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
      suggestions.push({
        priority: "P1",
        decision: "observar",
        area: `${term.campaign} / ${term.adGroup}`,
        problem: "Intenção explícita de preço exige roteamento, não exclusão genérica",
        evidence,
        change: `Conferir se '${term.searchTerm}' chegou ao grupo e à página específicos de preço; preservar a intenção.`,
        guardrail: "Não negativar preço, valor, custo ou quanto custa em nível de campanha/conta.",
        confidence: "alta",
      });
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

  data.directNegatives.forEach((negative) => {
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
    suggestions.push({
      priority: "P1",
      decision: "observar",
      area: "Conta",
      problem: "Mudanças recentes podem contaminar comparação",
      evidence: `${data.changes.length} eventos de mudança visíveis nos últimos 14 dias.`,
      change: "Separar janelas anteriores e posteriores e não atribuir causalidade a mudanças simultâneas.",
      guardrail: "Registrar data/hora e aguardar a janela mínima do experimento vigente.",
      confidence: "alta",
    });
  }

  return dedupeObjects(suggestions, (row) => `${row.area}|${row.problem}|${row.change}`)
    .sort(compareSuggestions)
    .slice(0, 100);
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
      metrics.search_rank_lost_impression_share
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
      metrics.ctr, metrics.conversions, metrics.all_conversions
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
      metrics.conversions_value, metrics.cost_micros
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
  lines.push("", `Sugestões: ${report.suggestions.length}`);
  report.suggestions.slice(0, CONFIG.maxRowsPerSection).forEach((row) => {
    lines.push(`- ${row.priority} [${row.decision}] ${row.area}: ${row.problem}. ${row.change} Evidência: ${row.evidence}`);
  });
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
  const suggestionRows = report.suggestions.length
    ? report.suggestions.slice(0, CONFIG.maxRowsPerSection).map((row) => `<tr><td>${html(row.priority)}</td><td>${html(row.decision)}</td><td>${html(row.area)}</td><td>${html(row.problem)}</td><td>${html(row.evidence)}</td><td>${html(row.change)}</td><td>${html(row.guardrail)}</td><td>${html(row.confidence)}</td></tr>`).join("")
    : "<tr><td colspan='8'>Sem sugestões nesta execução.</td></tr>";
  const campaignRows = report.thirtyDayCampaigns.map((row) => `<tr><td>${html(row.campaign)}</td><td>${integer(row.impressions)}</td><td>${integer(row.clicks)}</td><td>${percent(row.ctr)}</td><td>${brl(row.averageCpc)}</td><td>${brl(row.cost)}</td><td>${formatNumber(row.conversions)}</td><td>${percent(row.searchImpressionShare)}</td><td>${percent(row.searchBudgetLostShare)}</td><td>${percent(row.searchRankLostShare)}</td></tr>`).join("");
  const warningRows = report.warnings.length
    ? `<ul>${report.warnings.map((warning) => `<li>${html(warning)}</li>`).join("")}</ul>`
    : "<p>Nenhuma limitação técnica adicional registrada.</p>";
  const monthlyBlock = context.isMonthly
    ? `<h2>Leitura mensal ampliada</h2><p>Janela de 90 dias: ${html(context.ninetyDays.start)} a ${html(context.ninetyDays.end)}. Total observado: ${brl(sumCampaignMetrics(report.ninetyDayCampaigns).cost)} de gasto. Use esta visão somente para estratégia; mudanças recentes devem ser separadas.</p>`
    : "";

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
    <h2>Sugestões para decisão</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Prioridade</th><th>Decisão</th><th>Campanha/grupo</th><th>Problema</th><th>Evidência</th><th>Mudança sugerida</th><th>Guardrail</th><th>Confiança</th></tr>${suggestionRows}</table>
    <h2>Campanhas ativas — 30 dias</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Campanha</th><th>Impr.</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Gasto</th><th>Conversões</th><th>IS</th><th>Perda orçamento</th><th>Perda rank</th></tr>${campaignRows || "<tr><td colspan='10'>N/D</td></tr>"}</table>
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
