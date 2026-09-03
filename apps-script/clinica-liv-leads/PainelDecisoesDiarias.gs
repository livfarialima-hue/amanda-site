const PAINEL_DECISOES_DIARIAS_CONFIG = Object.freeze({
  view: "decisoes_diarias",
  timezone: "America/Sao_Paulo",
  maximumDecisions: 300,
  maximumDeferDays: 30,
});

function segredoPainelDecisoesDiarias_() {
  if (typeof PropertiesService === "undefined") return "";
  return String(
    PropertiesService.getScriptProperties().getProperty(
      typeof RETOMADAS_CONFIG !== "undefined"
        ? RETOMADAS_CONFIG.propriedadeSegredo
        : "LEADS_INGEST_SECRET",
    ) || "",
  ).trim();
}

function assinaturaPainelDecisoesDiarias_(day) {
  if (typeof Utilities === "undefined") return "";
  const localDay = String(day || "").trim();
  const secret = segredoPainelDecisoesDiarias_();
  if (!secret || !/^\d{4}-\d{2}-\d{2}$/.test(localDay)) return "";

  const signature = Utilities.computeHmacSha256Signature(
    "painel_decisoes_diarias|" + localDay,
    secret,
  );
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, "");
}

function assinaturaItemPainelDecisoesDiarias_(day, sourceKey) {
  if (typeof Utilities === "undefined") return "";
  const localDay = String(day || "").trim();
  const key = String(sourceKey || "").trim().slice(0, 300);
  const secret = segredoPainelDecisoesDiarias_();
  if (
    !secret ||
    !key ||
    !/^\d{4}-\d{2}-\d{2}$/.test(localDay)
  ) {
    return "";
  }

  const signature = Utilities.computeHmacSha256Signature(
    "item_painel_decisoes_diarias|" + localDay + "|" + key,
    secret,
  );
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, "");
}

function tokensPainelIguais_(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (!a || a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function validarAcessoPainelDecisoesDiarias_(day, token, now) {
  const instant = now instanceof Date && !Number.isNaN(now.getTime())
    ? now
    : new Date();
  const localDay = String(day || "").trim();
  const expectedDay = formatarDataRetomadas_(instant, "yyyy-MM-dd");
  const expectedToken = assinaturaPainelDecisoesDiarias_(localDay);

  return (
    localDay === expectedDay &&
    Boolean(expectedToken) &&
    tokensPainelIguais_(expectedToken, token)
  );
}

function linkPainelDecisoesDiarias_(now) {
  const instant = now instanceof Date && !Number.isNaN(now.getTime())
    ? now
    : new Date();
  const day = formatarDataRetomadas_(instant, "yyyy-MM-dd");
  const token = assinaturaPainelDecisoesDiarias_(day);
  const baseUrl = typeof urlAplicativoRetomadas_ === "function"
    ? urlAplicativoRetomadas_()
    : "";

  if (!baseUrl || !token) return "";
  return (
    baseUrl +
    "?view=" +
    encodeURIComponent(PAINEL_DECISOES_DIARIAS_CONFIG.view) +
    "&day=" +
    encodeURIComponent(day) +
    "&token=" +
    encodeURIComponent(token)
  );
}

function renderPainelDecisoesDiarias_(parameters) {
  const params = parameters || {};
  const day = String(params.day || "").trim();
  const token = String(params.token || "").trim();
  const now = new Date();

  if (!validarAcessoPainelDecisoesDiarias_(day, token, now)) {
    return HtmlService.createHtmlOutput(
      paginaErroPainelDecisoesDiarias_(
        "Link inválido ou expirado",
        "Use o link do e-mail diário mais recente. Nenhuma decisão foi aplicada.",
      ),
    ).setTitle("Clínica LIV — decisões do dia");
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.sheetName,
  );
  const items = sheet &&
    typeof listarItensPainelDecisoesCentral_ === "function"
    ? listarItensPainelDecisoesCentral_(sheet, now)
    : [];
  const preparedItems = items.map(function (item) {
    return Object.assign({}, item, {
      itemToken: assinaturaItemPainelDecisoesDiarias_(
        day,
        item.sourceKey,
      ),
    });
  }).filter(function (item) {
    return Boolean(item.itemToken);
  });
  const centralUrl = typeof linkCentralAtendimentoRetomadas_ === "function"
    ? linkCentralAtendimentoRetomadas_(spreadsheet)
    : "";

  return HtmlService.createHtmlOutput(
    paginaPainelDecisoesDiarias_(
      preparedItems,
      day,
      token,
      centralUrl,
    ),
  ).setTitle("Clínica LIV — decisões do dia");
}

function paginaErroPainelDecisoesDiarias_(title, message) {
  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{margin:0;background:#f6f3ee;font:16px/1.5 Arial,sans-serif;color:#17231e}' +
    'main{max-width:560px;margin:40px auto;padding:24px}.card{background:#fff;border-radius:18px;padding:24px;box-shadow:0 10px 32px rgba(23,35,30,.08)}' +
    'h1{font-size:26px;line-height:1.15;margin:8px 0 14px}.brand{color:#356854;font-size:13px;font-weight:800;letter-spacing:.08em}</style></head>' +
    '<body><main><section class="card"><div class="brand">CLÍNICA LIV</div><h1>' +
    escaparHtmlRetomadas_(title) +
    '</h1><p>' +
    escaparHtmlRetomadas_(message) +
    "</p></section></main></body></html>"
  );
}

function dataPainelDecisoes_(date, format) {
  const valid = date instanceof Date && !Number.isNaN(date.getTime())
    ? date
    : null;
  return valid ? formatarDataRetomadas_(valid, format) : "";
}

function amanhaPainelDecisoes_(day, offset) {
  const base = combinarDataHorarioCentral_(day, "12:00");
  if (!base) return "";
  return formatarDataRetomadas_(
    new Date(base.getTime() + Number(offset || 1) * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd",
  );
}

function classificarItensPainelDecisoes_(items) {
  const groups = {
    manual: [],
    automatic: [],
    future: [],
  };
  (items || []).forEach(function (item) {
    if (item.future) {
      groups.future.push(item);
    } else if (item.automatic) {
      groups.automatic.push(item);
    } else {
      groups.manual.push(item);
    }
  });
  return groups;
}

function rotuloDataItemPainelDecisoes_(item) {
  if (!item || !item.dueAt) return "Sem horário definido";
  return item.future
    ? dataPainelDecisoes_(item.dueAt, "dd/MM 'às' HH:mm")
    : dataPainelDecisoes_(item.dueAt, "HH:mm");
}

function montarOpcoesItemPainelDecisoes_(item, day) {
  if (!item) return "";
  const token = escaparHtmlRetomadas_(item.itemToken);
  const tomorrow = amanhaPainelDecisoes_(day, 1);
  const maximum = amanhaPainelDecisoes_(
    day,
    PAINEL_DECISOES_DIARIAS_CONFIG.maximumDeferDays,
  );
  let options = "";

  if (item.approvalAvailable) {
    options +=
      '<label class="choice choice-approve"><input type="radio" name="decision-' +
      token +
      '" value="approve"> <span><strong>Passar para a Bruna</strong><small>Programa após nova validação; não envia agora.</small></span></label>';
  }
  if (item.cancellationAvailable) {
    options +=
      '<label class="choice choice-cancel"><input type="radio" name="decision-' +
      token +
      '" value="cancel"> <span><strong>Cancelar só esta retomada</strong><small>Não altera a preferência futura do contato.</small></span></label>';
  }
  if (item.deferAvailable) {
    options +=
      '<label class="choice choice-defer"><input type="radio" name="decision-' +
      token +
      '" value="defer"> <span><strong>Adiar revisão</strong><small>Nenhuma mensagem será enviada.</small></span></label>' +
      '<label class="defer-date">Rever em <input type="date" data-defer-for="' +
      token +
      '" min="' +
      escaparHtmlRetomadas_(tomorrow) +
      '" max="' +
      escaparHtmlRetomadas_(maximum) +
      '" value="' +
      escaparHtmlRetomadas_(tomorrow) +
      '"></label>';
  }

  return options
    ? '<fieldset class="choices"><legend>Escolha uma ação</legend>' +
        options +
        "</fieldset>"
    : '<p class="read-only">Item informativo: nenhuma decisão em lote está disponível.</p>';
}

function montarCardItemPainelDecisoes_(item, day) {
  const phone = String(item.phone || "").replace(/\D/g, "");
  const whatsapp = phone
    ? '<a class="button button-whatsapp" href="https://wa.me/' +
      phone +
      '" target="_blank" rel="noopener">Abrir WhatsApp</a>'
    : "";
  const message = String(item.finalMessage || "").trim();

  return (
    '<article class="item-card" data-item-token="' +
    escaparHtmlRetomadas_(item.itemToken) +
    '"><div class="card-head"><div><span class="priority">' +
    escaparHtmlRetomadas_(item.priority || item.queue || "Revisar") +
    '</span><h3>' +
    escaparHtmlRetomadas_(item.name || "Nome não informado") +
    '</h3></div><time>' +
    escaparHtmlRetomadas_(rotuloDataItemPainelDecisoes_(item)) +
    '</time></div><p class="action"><strong>' +
    escaparHtmlRetomadas_(item.nextAction || item.queue || "Revisar") +
    '</strong></p><p class="context">' +
    escaparHtmlRetomadas_(item.context || "Sem contexto adicional.") +
    '</p><div class="meta"><span>Responsável: ' +
    escaparHtmlRetomadas_(item.owner || "Equipe") +
    '</span><span>Modo: ' +
    escaparHtmlRetomadas_(item.mode || "Manual") +
    '</span></div>' +
    (message
      ? '<div class="message"><span>Mensagem prevista ou sugerida</span><p>' +
        escaparHtmlRetomadas_(message) +
        "</p></div>"
      : '<div class="message message-empty">SEM SUGESTÃO PRONTA</div>') +
    '<div class="links">' +
    whatsapp +
    '</div>' +
    montarOpcoesItemPainelDecisoes_(item, day) +
    '<div class="item-result" aria-live="polite"></div></article>'
  );
}

function montarSecaoPainelDecisoes_(title, description, items, day, tone) {
  const cards = (items || []).map(function (item) {
    return montarCardItemPainelDecisoes_(item, day);
  }).join("");

  return (
    '<section class="panel-section section-' +
    tone +
    '"><div class="section-title"><h2>' +
    escaparHtmlRetomadas_(title) +
    ' <span>(' +
    String((items || []).length) +
    ')</span></h2><p>' +
    escaparHtmlRetomadas_(description) +
    "</p></div>" +
    (cards || '<div class="empty">Nenhum item nesta seção.</div>') +
    "</section>"
  );
}

function paginaPainelDecisoesDiarias_(items, day, token, centralUrl) {
  const grouped = classificarItensPainelDecisoes_(items);
  const actionable = (items || []).filter(function (item) {
    return item.approvalAvailable ||
      item.cancellationAvailable ||
      item.deferAvailable;
  }).length;
  const safeDay = JSON.stringify(String(day || "")).replace(/</g, "\\u003c");
  const safeToken = JSON.stringify(String(token || "")).replace(/</g, "\\u003c");
  const centralButton = centralUrl
    ? '<a class="button button-secondary" href="' +
      escaparHtmlRetomadas_(centralUrl) +
      '" target="_blank" rel="noopener">Abrir Central completa</a>'
    : "";

  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f6f3ee;color:#17231e;font:15px/1.45 Arial,sans-serif}' +
    'main{max-width:720px;margin:0 auto;padding:18px 14px 120px}.top{background:#356854;color:#fff;border-radius:20px;padding:22px;box-shadow:0 12px 30px rgba(30,72,56,.18)}' +
    '.brand{font-size:12px;font-weight:800;letter-spacing:.12em;opacity:.88}.top h1{font-size:28px;line-height:1.12;margin:8px 0}.top p{margin:0;color:#e9f4ef}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}' +
    '.summary div{background:rgba(255,255,255,.13);border-radius:12px;padding:10px;text-align:center}.summary strong{display:block;font-size:22px}.summary span{font-size:11px}' +
    '.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border-radius:12px;text-decoration:none;font-weight:700;border:0;cursor:pointer}' +
    '.button-secondary{background:#fff;color:#2d5848}.button-whatsapp{background:#e9f7ef;color:#176b43;width:100%}.panel-section{margin-top:24px}.section-title h2{font-size:20px;margin:0}.section-title h2 span{color:#6b756f}.section-title p{margin:4px 0 12px;color:#59645e}' +
    '.item-card{background:#fff;border:1px solid #e4e1dc;border-radius:18px;padding:17px;margin:12px 0;box-shadow:0 7px 22px rgba(23,35,30,.06)}.card-head{display:flex;gap:12px;justify-content:space-between;align-items:flex-start}' +
    '.priority{display:inline-block;color:#7a4a10;background:#fff4df;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;text-transform:uppercase}.card-head h3{font-size:20px;margin:7px 0 0}.card-head time{font-weight:800;color:#356854;white-space:nowrap}' +
    '.action{margin:14px 0 6px}.context{margin:0;color:#4e5953}.meta{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.meta span{background:#f2f4f2;border-radius:999px;padding:5px 8px;font-size:12px}' +
    '.message{background:#f7f6f2;border-left:4px solid #9bb7aa;border-radius:9px;padding:11px 12px;margin:12px 0}.message span{display:block;color:#59645e;font-size:11px;font-weight:800;text-transform:uppercase}.message p{margin:5px 0 0;white-space:pre-wrap}.message-empty{color:#8a4f14;font-weight:800}' +
    '.links{margin:10px 0}.choices{border:0;border-top:1px solid #e5e7eb;margin:15px 0 0;padding:14px 0 0}.choices legend{font-size:12px;font-weight:800;color:#59645e;padding:0 6px 0 0}.choice{display:flex;gap:10px;align-items:flex-start;border:1px solid #dfe4e1;border-radius:12px;padding:11px;margin:8px 0;cursor:pointer}' +
    '.choice input{width:20px;height:20px;margin:1px 0 0}.choice span{display:block}.choice small{display:block;color:#65716b;margin-top:2px}.choice-approve{background:#f2f8f5}.choice-cancel{background:#fff6f2}.choice-defer{background:#f7f6f2}' +
    '.defer-date{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:7px 0 0;padding:9px 11px;color:#59645e}.defer-date input{min-height:40px;border:1px solid #ccd3cf;border-radius:9px;padding:7px;background:#fff}.read-only,.empty{color:#68736d;background:#f2f4f2;border-radius:12px;padding:12px}' +
    '.item-result{display:none;margin-top:12px;padding:10px;border-radius:10px}.item-result.ok{display:block;background:#e9f7ef;color:#176b43}.item-result.error{display:block;background:#fff2ed;color:#9a3412}.item-card.resolved{opacity:.68}' +
    '.sticky{position:fixed;z-index:10;left:0;right:0;bottom:0;background:rgba(255,255,255,.96);border-top:1px solid #dfe4e1;padding:10px 14px calc(10px + env(safe-area-inset-bottom));box-shadow:0 -10px 28px rgba(23,35,30,.09)}.sticky-inner{max-width:692px;margin:auto;display:flex;gap:10px;align-items:center}' +
    '.process{flex:1;background:#1d7a4c;color:#fff;font-size:16px}.process:disabled{opacity:.55;cursor:wait}.global-result{font-size:13px;color:#4e5953}.warning{margin:14px 0 0;background:#fff7e8;color:#795019;border-radius:12px;padding:11px}' +
    '@media(max-width:520px){main{padding-left:10px;padding-right:10px}.top{border-radius:16px;padding:18px}.top h1{font-size:24px}.summary{grid-template-columns:1fr 1fr}.summary div:last-child{grid-column:1/-1}.card-head{display:block}.card-head time{display:block;margin-top:8px}.sticky-inner{display:block}.global-result{margin-top:6px}.button{width:100%}}</style></head>' +
    '<body><main><header class="top"><div class="brand">CLÍNICA LIV</div><h1>Pendências e cuidados do dia</h1><p>Revise, escolha e confirme. Abrir esta página não altera nada.</p>' +
    '<div class="summary"><div><strong>' +
    String(actionable) +
    '</strong><span>com decisão</span></div><div><strong>' +
    String(grouped.automatic.length) +
    '</strong><span>automáticos hoje</span></div><div><strong>' +
    String(grouped.future.length) +
    '</strong><span>próximos 7 dias</span></div></div><div class="toolbar">' +
    centralButton +
    '</div><div class="warning"><strong>Importante:</strong> nenhuma opção está marcada. “Nunca retomar” não faz parte deste painel e continua sendo uma decisão separada.</div></header>' +
    montarSecaoPainelDecisoes_(
      "Decisões humanas de hoje",
      "Você pode abrir o WhatsApp, passar uma retomada elegível para a Bruna, cancelar só a retomada ou adiar a revisão.",
      grouped.manual,
      day,
      "manual",
    ) +
    montarSecaoPainelDecisoes_(
      "Envios automáticos previstos",
      "Confira o que está previsto. Retomadas canceláveis continuam limitadas ao plano escolhido; lembretes de consulta usam o cancelamento individual do e-mail.",
      grouped.automatic,
      day,
      "automatic",
    ) +
    montarSecaoPainelDecisoes_(
      "Próximos 7 dias",
      "Agenda futura completa dentro da janela de sete dias.",
      grouped.future,
      day,
      "future",
    ) +
    '</main><footer class="sticky"><div class="sticky-inner"><button id="process" class="button process" type="button" onclick="processarDecisoes()">Confirmar decisões selecionadas</button><div id="global-result" class="global-result" aria-live="polite"></div></div></footer>' +
    '<script>var painelDia=' +
    safeDay +
    ';var painelToken=' +
    safeToken +
    ';function coletarDecisoes(){var cards=document.querySelectorAll(".item-card");var decisions=[];cards.forEach(function(card){var selected=card.querySelector("input[type=radio]:checked");if(!selected){return;}var itemToken=card.getAttribute("data-item-token");var decision={itemToken:itemToken,action:selected.value};if(selected.value==="defer"){var date=card.querySelector("input[data-defer-for]");decision.deferDate=date?date.value:"";}decisions.push(decision);});return decisions;}function mensagemConfirmacao(decisions){var counts={approve:0,cancel:0,defer:0};decisions.forEach(function(item){if(counts[item.action]!==undefined){counts[item.action]+=1;}});return "Confirmar "+counts.approve+" aprovação(ões), "+counts.cancel+" cancelamento(s) e "+counts.defer+" adiamento(s)? Cada item será relido antes da alteração.";}function marcarResultados(result){var rows=(result&&result.results)||[];rows.forEach(function(row){var cards=document.querySelectorAll(".item-card");cards.forEach(function(card){if(card.getAttribute("data-item-token")!==row.itemToken){return;}var target=card.querySelector(".item-result");target.textContent=row.message|| (row.ok?"Decisão aplicada.":"Item mantido sem alteração.");target.className="item-result "+(row.ok?"ok":"error");if(row.ok){card.classList.add("resolved");card.querySelectorAll("input").forEach(function(input){input.disabled=true;});}});});var global=document.getElementById("global-result");global.textContent=(result&&result.summary)||"Processamento concluído.";}function processarDecisoes(){var decisions=coletarDecisoes();if(!decisions.length){alert("Selecione pelo menos uma ação.");return;}if(!confirm(mensagemConfirmacao(decisions))){return;}var button=document.getElementById("process");button.disabled=true;button.textContent="Revalidando...";google.script.run.withSuccessHandler(function(result){marcarResultados(result);button.disabled=false;button.textContent="Confirmar decisões selecionadas";}).withFailureHandler(function(){document.getElementById("global-result").textContent="Falha temporária. Nenhuma conclusão foi presumida; tente novamente.";button.disabled=false;button.textContent="Tentar novamente";}).processarDecisoesPainelDiario({day:painelDia,token:painelToken,decisions:decisions});}</script></body></html>'
  );
}

function dataAdiamentoPainelDecisoes_(day, now) {
  const localDay = String(day || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDay)) return null;
  const deferUntil = combinarDataHorarioCentral_(localDay, "09:00");
  const instant = now instanceof Date && !Number.isNaN(now.getTime())
    ? now
    : new Date();
  const today = formatarDataRetomadas_(instant, "yyyy-MM-dd");
  const minimumDay = amanhaPainelDecisoes_(today, 1);
  const maximumDay = amanhaPainelDecisoes_(
    today,
    PAINEL_DECISOES_DIARIAS_CONFIG.maximumDeferDays,
  );
  if (
    !deferUntil ||
    localDay < minimumDay ||
    localDay > maximumDay
  ) {
    return null;
  }
  return deferUntil;
}

function mensagemResultadoPainelDecisoes_(action, result) {
  if (result && result.ok) {
    if (action === "approve") {
      return "Retomada programada com a Bruna e ainda sujeita à validação final antes do envio.";
    }
    if (action === "cancel") {
      return "Somente esta retomada foi cancelada; a preferência futura não mudou.";
    }
    if (action === "defer") {
      return "Revisão adiada; nenhuma mensagem foi enviada.";
    }
  }

  const labels = {
    item_not_found: "O item não foi localizado na Central atual.",
    item_changed: "O contexto mudou desde o e-mail; o item foi mantido sem alteração.",
    item_not_eligible: "O item não está mais elegível.",
    plan_not_eligible: "A retomada não está mais elegível.",
    plan_not_found: "A retomada não foi localizada.",
    automation_disabled: "A automação está desligada; a ação permanece humana.",
    missing_context: "Falta contexto seguro para programar.",
    unsafe_message: "A mensagem não está segura para programação.",
    invalid_schedule: "O horário de envio não é válido.",
    schedule_must_be_future: "O horário precisa estar no futuro.",
    outside_send_window: "Não há horário seguro de envio nesta janela.",
    invalid_defer_date: "Escolha uma data válida entre amanhã e 30 dias.",
    automatic_item_not_deferable: "Envio automático não pode ser adiado por esta ação.",
    approval_unavailable: "A aprovação não está disponível.",
    approval_token_missing: "A aprovação segura não pôde ser validada.",
    cancellation_token_missing: "O cancelamento seguro não pôde ser validado.",
  };
  return labels[String(result && result.reason || "")] ||
    "O item foi mantido sem alteração após a revalidação.";
}

function processarDecisoesPainelDiario(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  const day = String(input.day || "").trim();
  const token = String(input.token || "").trim();
  const now = new Date();

  if (!validarAcessoPainelDecisoesDiarias_(day, token, now)) {
    return {
      ok: false,
      error: "invalid_or_expired_access",
      summary: "Link inválido ou expirado. Nenhuma decisão foi aplicada.",
      results: [],
    };
  }

  const decisions = Array.isArray(input.decisions)
    ? input.decisions.slice(0)
    : [];
  if (
    !decisions.length ||
    decisions.length > PAINEL_DECISOES_DIARIAS_CONFIG.maximumDecisions
  ) {
    return {
      ok: false,
      error: "invalid_decision_count",
      summary: "Quantidade de decisões inválida. Nenhuma decisão foi aplicada.",
      results: [],
    };
  }

  const normalized = [];
  const seen = {};
  for (let index = 0; index < decisions.length; index += 1) {
    const itemToken = String(decisions[index].itemToken || "").trim();
    const action = String(decisions[index].action || "").trim();
    if (
      !itemToken ||
      !["approve", "cancel", "defer"].includes(action) ||
      seen[itemToken]
    ) {
      return {
        ok: false,
        error: seen[itemToken]
          ? "conflicting_decisions"
          : "invalid_decision",
        summary: "Há uma decisão inválida ou duplicada. Nada foi aplicado.",
        results: [],
      };
    }
    seen[itemToken] = true;
    normalized.push({
      itemToken: itemToken,
      action: action,
      deferDate: String(decisions[index].deferDate || "").trim(),
    });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return {
      ok: false,
      error: "busy_retry",
      summary: "A Central está sendo atualizada. Tente novamente em alguns segundos.",
      results: [],
    };
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(
      CENTRAL_ATENDIMENTO_CONFIG.sheetName,
    );
    if (!sheet || typeof listarItensPainelDecisoesCentral_ !== "function") {
      return {
        ok: false,
        error: "central_not_found",
        summary: "A Central não está disponível. Nenhuma decisão foi aplicada.",
        results: [],
      };
    }

    const liveItems = listarItensPainelDecisoesCentral_(sheet, now);
    const liveByToken = {};
    liveItems.forEach(function (item) {
      const itemToken = assinaturaItemPainelDecisoesDiarias_(
        day,
        item.sourceKey,
      );
      if (itemToken) liveByToken[itemToken] = item;
    });

    const approvals = [];
    const cancellations = [];
    const deferrals = [];
    const pending = [];

    normalized.forEach(function (decision) {
      const item = liveByToken[decision.itemToken];
      if (!item) {
        pending.push({
          itemToken: decision.itemToken,
          action: decision.action,
          ok: false,
          reason: "item_changed",
        });
        return;
      }

      if (decision.action === "approve") {
        if (!item.approvalAvailable) {
          pending.push({
            itemToken: decision.itemToken,
            action: decision.action,
            ok: false,
            reason: "item_not_eligible",
          });
          return;
        }
        approvals.push({
          itemToken: decision.itemToken,
          action: decision.action,
          decision: item.approvalDecision,
        });
        return;
      }

      if (decision.action === "cancel") {
        if (!item.cancellationAvailable) {
          pending.push({
            itemToken: decision.itemToken,
            action: decision.action,
            ok: false,
            reason: "item_not_eligible",
          });
          return;
        }
        cancellations.push({
          itemToken: decision.itemToken,
          action: decision.action,
          decision: item.cancellationDecision,
        });
        return;
      }

      const deferUntil = dataAdiamentoPainelDecisoes_(
        decision.deferDate,
        now,
      );
      if (!item.deferAvailable || !deferUntil) {
        pending.push({
          itemToken: decision.itemToken,
          action: decision.action,
          ok: false,
          reason: !deferUntil
            ? "invalid_defer_date"
            : "item_not_eligible",
        });
        return;
      }
      deferrals.push({
        itemToken: decision.itemToken,
        action: decision.action,
        decision: {
          rowNumber: item.rowNumber,
          sourceKey: item.sourceKey,
          deferUntil: deferUntil,
        },
      });
    });

    function incorporarResultados(operationItems, operationResult) {
      const byRow = {};
      (operationResult && operationResult.results || []).forEach(
        function (result) {
          byRow[result.rowNumber] = result;
        },
      );
      operationItems.forEach(function (item) {
        const result = byRow[item.decision.rowNumber] || {
          ok: false,
          reason: "item_changed",
        };
        pending.push({
          itemToken: item.itemToken,
          action: item.action,
          ok: result.ok === true,
          reason: result.reason || "",
        });
      });
    }

    if (approvals.length) {
      incorporarResultados(
        approvals,
        aprovarRetomadasMarcadasCentralInterno_(
          spreadsheet,
          sheet,
          now,
          approvals.map(function (item) {
            return item.decision;
          }),
        ),
      );
    }
    if (cancellations.length) {
      incorporarResultados(
        cancellations,
        cancelarRetomadasMarcadasCentralInterno_(
          spreadsheet,
          sheet,
          now,
          cancellations.map(function (item) {
            return item.decision;
          }),
        ),
      );
    }
    if (deferrals.length) {
      incorporarResultados(
        deferrals,
        adiarItensCentralInterno_(
          sheet,
          now,
          deferrals.map(function (item) {
            return item.decision;
          }),
        ),
      );
    }

    const results = normalized.map(function (decision) {
      const result = pending.find(function (candidate) {
        return candidate.itemToken === decision.itemToken;
      }) || {
        itemToken: decision.itemToken,
        action: decision.action,
        ok: false,
        reason: "item_changed",
      };
      return Object.assign({}, result, {
        message: mensagemResultadoPainelDecisoes_(
          decision.action,
          result,
        ),
      });
    });
    const approved = results.filter(function (item) {
      return item.ok && item.action === "approve";
    }).length;
    const cancelled = results.filter(function (item) {
      return item.ok && item.action === "cancel";
    }).length;
    const deferred = results.filter(function (item) {
      return item.ok && item.action === "defer";
    }).length;
    const skipped = results.length - approved - cancelled - deferred;

    return {
      ok: true,
      allApplied: skipped === 0,
      approved: approved,
      cancelled: cancelled,
      deferred: deferred,
      skipped: skipped,
      summary:
        approved +
        " aprovada(s), " +
        cancelled +
        " cancelada(s), " +
        deferred +
        " adiada(s) e " +
        skipped +
        " mantida(s) sem alteração.",
      results: results,
    };
  } finally {
    lock.releaseLock();
  }
}
