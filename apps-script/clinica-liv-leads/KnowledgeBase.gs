const BOT_KNOWLEDGE_CONFIG = Object.freeze({
  approvedSheetName: "Respostas Aprovadas",
  questionsSheetName: "_WHATSAPP_DUVIDAS",
  usageSheetName: "_WHATSAPP_USO_RESPOSTAS",
  reviewSheetName: "Revisões do Bot",
  timezone: "America/Sao_Paulo",
  maximumCandidates: 5,
  maximumOpenQuestionsInDigest: 12,
  maximumRulesInDigest: 8,
});

const BOT_KNOWLEDGE_HEADERS = Object.freeze([
  "ID da regra",
  "Status",
  "Modo de uso",
  "Risco",
  "Assunto",
  "Perguntas equivalentes",
  "Resposta aprovada",
  "Limites / quando não usar",
  "Procedimento",
  "Aprovado por",
  "Aprovado em",
  "Válida até",
  "Usos",
  "Último uso",
  "Correções",
  "Origem",
  "Versão da regra",
  "Estado de promoção",
  "Versão do snapshot",
  "Aprovador da promoção",
  "Promovida em",
  "Substitui",
]);

const BOT_UNKNOWN_HEADERS = Object.freeze([
  "Event ID",
  "Telefone",
  "Paciente",
  "Recebida em",
  "Pergunta",
  "Assunto",
  "Contexto",
  "Risco",
  "Esclarecimentos feitos",
  "Status",
  "Resposta humana",
  "ID da regra candidata",
  "Atualizada em",
  "Prioridade",
  "Procedimento",
]);

const BOT_USAGE_HEADERS = Object.freeze([
  "Data e hora",
  "Event ID",
  "Telefone",
  "ID da regra",
  "Pergunta",
  "Resposta enviada",
  "Resultado",
]);

const BOT_REVIEW_HEADERS = Object.freeze([
  "Tipo",
  "Prioridade",
  "Data e hora",
  "Paciente",
  "Telefone",
  "Contexto",
  "Sugestão do bot",
  "Confiança",
  "Status",
  "Decisão da equipe",
  "Observação da equipe",
  "Chave",
  "Atualizado em",
]);

function normalizarTextoConhecimento_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textoSeguroConhecimento_(value, maximumLength) {
  const text = Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function normalizarTelefoneConhecimento_(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? "+" + digits : "";
}

function garantirPlanilhaConhecimento_(spreadsheet, name, headers, hidden) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    if (hidden) sheet.hideSheet();
  }
  return sheet;
}

function obterPlanilhaRespostasAprovadas_(spreadsheet) {
  return garantirPlanilhaConhecimento_(
    spreadsheet,
    BOT_KNOWLEDGE_CONFIG.approvedSheetName,
    BOT_KNOWLEDGE_HEADERS,
    false,
  );
}

function obterPlanilhaDuvidasBot_(spreadsheet) {
  return garantirPlanilhaConhecimento_(
    spreadsheet,
    BOT_KNOWLEDGE_CONFIG.questionsSheetName,
    BOT_UNKNOWN_HEADERS,
    true,
  );
}

function obterPlanilhaUsoRespostas_(spreadsheet) {
  return garantirPlanilhaConhecimento_(
    spreadsheet,
    BOT_KNOWLEDGE_CONFIG.usageSheetName,
    BOT_USAGE_HEADERS,
    true,
  );
}

function obterPlanilhaRevisoesBot_(spreadsheet) {
  return garantirPlanilhaConhecimento_(
    spreadsheet,
    BOT_KNOWLEDGE_CONFIG.reviewSheetName,
    BOT_REVIEW_HEADERS,
    false,
  );
}

function garantirEstruturaAprendizadoBot() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  obterPlanilhaRespostasAprovadas_(spreadsheet);
  obterPlanilhaDuvidasBot_(spreadsheet);
  obterPlanilhaUsoRespostas_(spreadsheet);
  obterPlanilhaRevisoesBot_(spreadsheet);
  return {
    ok: true,
    sheets: [
      BOT_KNOWLEDGE_CONFIG.approvedSheetName,
      BOT_KNOWLEDGE_CONFIG.questionsSheetName,
      BOT_KNOWLEDGE_CONFIG.usageSheetName,
      BOT_KNOWLEDGE_CONFIG.reviewSheetName,
    ],
  };
}

function tokensConhecimento_(value) {
  const stopWords = new Set([
    "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do",
    "dos", "e", "em", "eu", "me", "na", "nas", "no", "nos", "o",
    "os", "para", "por", "que", "se", "sobre", "tem", "uma", "voce",
    "voces",
  ]);
  return new Set(
    normalizarTextoConhecimento_(value)
      .split(" ")
      .filter(function (token) {
        return token.length >= 3 && !stopWords.has(token);
      }),
  );
}

function pontuarConhecimento_(question, subject, examples, procedure) {
  const questionTokens = tokensConhecimento_(question);
  const ruleTokens = tokensConhecimento_(
    [subject, examples, procedure].filter(Boolean).join(" "),
  );
  if (!questionTokens.size || !ruleTokens.size) return 0;

  let intersection = 0;
  questionTokens.forEach(function (token) {
    if (ruleTokens.has(token)) intersection += 1;
  });
  const normalizedSubject = normalizarTextoConhecimento_(subject);
  const normalizedQuestion = normalizarTextoConhecimento_(question);
  const subjectBonus = normalizedSubject &&
    normalizedQuestion.indexOf(normalizedSubject) >= 0 ? 0.4 : 0;
  return intersection / Math.max(questionTokens.size, 1) + subjectBonus;
}

function dataConhecimentoValida_(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function snapshotConhecimentoAtivo_() {
  return String(
    PropertiesService.getScriptProperties().getProperty(
      "BRUNA_KB_SNAPSHOT",
    ) || "",
  ).trim();
}

function regraConhecimentoAtiva_(row, now, activeSnapshot) {
  const status = normalizarTextoConhecimento_(row[1]);
  const mode = normalizarTextoConhecimento_(row[2]);
  const risk = normalizarTextoConhecimento_(row[3]);
  const validUntil = dataConhecimentoValida_(row[11]);
  const promotionState = normalizarTextoConhecimento_(row[17]);
  const snapshotVersion = String(row[18] || "").trim();
  return status === "aprovada" &&
    ["automatica", "sugestao interna"].includes(mode) &&
    risk !== "alto" &&
    promotionState === "active" &&
    Boolean(activeSnapshot) &&
    snapshotVersion === activeSnapshot &&
    String(row[6] || "").trim() &&
    (!validUntil || validUntil.getTime() >= now.getTime());
}

function obterDuvidaPendentePorTelefone_(sheet, phone) {
  if (!sheet || sheet.getLastRow() < 2 || !phone) return null;
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, BOT_UNKNOWN_HEADERS.length)
    .getValues();
  const pendingStatuses = new Set([
    "aguardando esclarecimento",
    "aguardando resposta humana",
  ]);

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (
      normalizarTelefoneConhecimento_(values[index][1]) === phone &&
      pendingStatuses.has(normalizarTextoConhecimento_(values[index][9]))
    ) {
      return { row: index + 2, values: values[index] };
    }
  }
  return null;
}

function obterContextoConhecimentoBot_(input) {
  const question = textoSeguroConhecimento_(input && input.question, 2000);
  const phone = normalizarTelefoneConhecimento_(input && input.phone);
  const procedure = textoSeguroConhecimento_(input && input.procedure, 120);
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const approvedSheet = obterPlanilhaRespostasAprovadas_(spreadsheet);
  const questionsSheet = obterPlanilhaDuvidasBot_(spreadsheet);
  const now = new Date();
  const activeSnapshot = snapshotConhecimentoAtivo_();
  const candidates = [];

  if (approvedSheet.getLastRow() >= 2 && question) {
    const rows = approvedSheet
      .getRange(
        2,
        1,
        approvedSheet.getLastRow() - 1,
        BOT_KNOWLEDGE_HEADERS.length,
      )
      .getValues();

    rows.forEach(function (row) {
      if (!regraConhecimentoAtiva_(row, now, activeSnapshot)) return;
      const score = pontuarConhecimento_(question, row[4], row[5], row[8]);
      if (score <= 0) return;
      candidates.push({
        id: String(row[0] || "").trim(),
        mode: String(row[2] || "").trim(),
        risk: String(row[3] || "").trim(),
        subject: String(row[4] || "").trim(),
        examples: String(row[5] || "").trim(),
        answer: String(row[6] || "").trim(),
        boundaries: String(row[7] || "").trim(),
        procedure: String(row[8] || "").trim(),
        version: String(row[16] || "").trim(),
        snapshotVersion: String(row[18] || "").trim(),
        score: Math.round(score * 100) / 100,
      });
    });
  }

  candidates.sort(function (left, right) {
    return right.score - left.score;
  });
  const pending = obterDuvidaPendentePorTelefone_(questionsSheet, phone);

  return {
    snapshotVersion: activeSnapshot,
    candidates: candidates.slice(0, BOT_KNOWLEDGE_CONFIG.maximumCandidates),
    pendingQuestion: pending ? {
      eventId: String(pending.values[0] || "").trim(),
      question: String(pending.values[4] || "").trim(),
      subject: String(pending.values[5] || "").trim(),
      risk: String(pending.values[7] || "Médio").trim(),
      clarificationCount: Number(pending.values[8] || 0),
      status: String(pending.values[9] || "").trim(),
      procedure: String(pending.values[14] || "").trim(),
    } : null,
  };
}

function encontrarDuvidaPorEvento_(sheet, eventId) {
  if (!eventId || !sheet || sheet.getLastRow() < 2) return null;
  const match = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(eventId))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function rascunhoInternoAprendizadoSeguro_(input, risk) {
  if (normalizarTextoConhecimento_(risk) === "alto") return "";
  return textoSeguroConhecimento_(
    input && input.suggestedReply,
    1200,
  );
}

function registrarRevisaoDuvidaBot_(
  spreadsheet,
  input,
  risk,
  question,
  context,
  now,
) {
  if (
    normalizarTextoConhecimento_(input && input.status) !==
      "aguardando resposta humana"
  ) {
    return { ok: true, skipped: true };
  }

  const suggestion = rascunhoInternoAprendizadoSeguro_(input, risk);
  const subject = textoSeguroConhecimento_(
    input && input.subject || "Dúvida ainda não mapeada",
    160,
  );
  const reviewContext = [
    "Assunto: " + subject,
    "Pergunta da paciente: " +
      textoSeguroConhecimento_(question, 2000),
    context
      ? "Histórico recente:\n" +
        textoSeguroConhecimento_(context, 1000)
      : "",
  ].filter(Boolean).join("\n");

  return registrarRevisaoBot_(spreadsheet, {
    type: "Resposta",
    priority:
      normalizarTextoConhecimento_(risk) === "baixo"
        ? "Normal"
        : "Alta",
    at: dataConhecimentoValida_(input && input.receivedAt) || now,
    patientName: input && input.patientName,
    phone: input && input.phone,
    context: reviewContext,
    suggestion: suggestion,
    confidence: suggestion
      ? textoSeguroConhecimento_(input && input.confidence || "low", 40)
      : "Sem rascunho seguro",
    status: "Aberta",
    key: "unknown-response:" +
      textoSeguroConhecimento_(input && input.eventId, 200),
  });
}

function registrarDuvidaBot_(input) {
  const eventId = textoSeguroConhecimento_(input && input.eventId, 200);
  const phone = normalizarTelefoneConhecimento_(input && input.phone);
  const question = textoSeguroConhecimento_(input && input.question, 2000);
  if (!eventId || !phone || !question) {
    return { ok: false, error: "invalid_learning_question" };
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = obterPlanilhaDuvidasBot_(spreadsheet);
  const now = new Date();
  const risk = textoSeguroConhecimento_(input.risk || "Médio", 40);
  const context = textoSeguroConhecimento_(input.context, 1000);
  function finalizarRegistro_(result, recordedQuestion) {
    const review = registrarRevisaoDuvidaBot_(
      spreadsheet,
      input,
      risk,
      recordedQuestion,
      context,
      now,
    );
    return { ...result, review: review };
  }
  const duplicateRow = encontrarDuvidaPorEvento_(sheet, eventId);
  if (duplicateRow) {
    return finalizarRegistro_(
      { ok: true, duplicate: true, row: duplicateRow },
      question,
    );
  }

  const pending = obterDuvidaPendentePorTelefone_(sheet, phone);
  const clarificationCount = Math.min(
    Math.max(Number(input.clarificationCount || 0), 0),
    1,
  );
  const status = textoSeguroConhecimento_(
    input.status || "Aguardando resposta humana",
    80,
  );

  if (pending && normalizarTextoConhecimento_(pending.values[9]) ===
      "aguardando esclarecimento") {
    const originalQuestion = String(pending.values[4] || "").trim();
    const recordedQuestion = textoSeguroConhecimento_(
      originalQuestion + "\nEsclarecimento: " + question,
      3000,
    );
    sheet.getRange(pending.row, 5, 1, 11).setValues([[
      recordedQuestion,
      textoSeguroConhecimento_(input.subject || pending.values[5], 160),
      context || textoSeguroConhecimento_(pending.values[6], 1000),
      risk || textoSeguroConhecimento_(pending.values[7] || "Médio", 40),
      1,
      status,
      "",
      "",
      now,
      textoSeguroConhecimento_(input.priority || "Resumo diário", 40),
      textoSeguroConhecimento_(input.procedure || pending.values[14], 120),
    ]]);
    return finalizarRegistro_(
      { ok: true, updated: true, row: pending.row },
      recordedQuestion,
    );
  }

  sheet.appendRow([
    eventId,
    phone,
    textoSeguroConhecimento_(input.patientName, 120),
    dataConhecimentoValida_(input.receivedAt) || now,
    question,
    textoSeguroConhecimento_(input.subject || "Dúvida ainda não mapeada", 160),
    context,
    risk,
    clarificationCount,
    status,
    "",
    "",
    now,
    textoSeguroConhecimento_(input.priority || "Resumo diário", 40),
    textoSeguroConhecimento_(input.procedure, 120),
  ]);
  return finalizarRegistro_(
    { ok: true, created: true, row: sheet.getLastRow() },
    question,
  );
}

function idRegraConhecimento_(eventId, now) {
  const compact = normalizarTextoConhecimento_(eventId)
    .replace(/\s/g, "")
    .slice(-8)
    .toUpperCase();
  return "KB-" + Utilities.formatDate(now, BOT_KNOWLEDGE_CONFIG.timezone, "yyyyMMdd") +
    "-" + (compact || Utilities.getUuid().slice(0, 8).toUpperCase());
}

function limitesPadraoConhecimento_(risk) {
  const normalized = normalizarTextoConhecimento_(risk);
  if (normalized === "alto") {
    return "Nunca responder automaticamente. Caso individual, clínico, urgente ou negociado.";
  }
  if (normalized === "medio") {
    return "Usar somente quando a pergunta tiver o mesmo sentido. Não aplicar a indicação individual, técnica, recuperação pessoal, preço exato ou condição negociada.";
  }
  return "Usar somente quando a pergunta tiver o mesmo sentido e não houver informação contraditória no histórico.";
}

function modoPadraoConhecimento_(risk) {
  const normalized = normalizarTextoConhecimento_(risk);
  if (normalized === "alto") return "Nunca automática";
  if (normalized === "medio") return "Sugestão interna";
  return "Automática";
}

function registrarRevisaoBot_(spreadsheet, input) {
  const sheet = obterPlanilhaRevisoesBot_(spreadsheet);
  const key = textoSeguroConhecimento_(input && input.key, 240);
  if (key && sheet.getLastRow() >= 2) {
    const duplicate = sheet
      .getRange(2, 12, sheet.getLastRow() - 1, 1)
      .createTextFinder(key)
      .matchEntireCell(true)
      .findNext();
    if (duplicate) return { ok: true, duplicate: true, row: duplicate.getRow() };
  }

  const now = new Date();
  sheet.appendRow([
    textoSeguroConhecimento_(input.type || "Resposta", 80),
    textoSeguroConhecimento_(input.priority || "Normal", 40),
    dataConhecimentoValida_(input.at) || now,
    textoSeguroConhecimento_(input.patientName, 120),
    normalizarTelefoneConhecimento_(input.phone),
    textoSeguroConhecimento_(input.context, 1600),
    textoSeguroConhecimento_(input.suggestion, 1200),
    textoSeguroConhecimento_(input.confidence, 40),
    textoSeguroConhecimento_(input.status || "Aberta", 60),
    textoSeguroConhecimento_(input.teamDecision, 600),
    textoSeguroConhecimento_(input.teamNote, 600),
    key,
    now,
  ]);
  return { ok: true, created: true, row: sheet.getLastRow() };
}

function registrarRespostaHumanaAprendizado_(input) {
  const phone = normalizarTelefoneConhecimento_(input && input.phone);
  const answer = textoSeguroConhecimento_(input && input.answer, 2000);
  if (!phone || !answer) {
    return { ok: false, error: "invalid_human_learning_answer" };
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const questionsSheet = obterPlanilhaDuvidasBot_(spreadsheet);
  const pending = obterDuvidaPendentePorTelefone_(questionsSheet, phone);
  const now = dataConhecimentoValida_(input.at) || new Date();

  if (pending) {
    const eventId = String(pending.values[0] || "").trim();
    const ruleId = idRegraConhecimento_(eventId, now);
    const risk = String(pending.values[7] || "Médio").trim();
    questionsSheet.getRange(pending.row, 10, 1, 4).setValues([[
      "Resposta capturada",
      answer,
      ruleId,
      now,
    ]]);

    const approvedSheet = obterPlanilhaRespostasAprovadas_(spreadsheet);
    approvedSheet.appendRow([
      ruleId,
      "Revisar",
      modoPadraoConhecimento_(risk),
      risk,
      textoSeguroConhecimento_(pending.values[5], 160),
      textoSeguroConhecimento_(pending.values[4], 2000),
      answer,
      limitesPadraoConhecimento_(risk),
      textoSeguroConhecimento_(pending.values[14], 120),
      "",
      "",
      "",
      0,
      "",
      0,
      "Resposta humana no WhatsApp",
    ]);
    registrarRevisaoBot_(spreadsheet, {
      type: "Regra de resposta",
      priority: risk === "Alto" ? "Alta" : "Normal",
      at: now,
      patientName: pending.values[2],
      phone: phone,
      context: pending.values[4],
      suggestion: answer,
      confidence: "Resposta humana capturada",
      status: "Aguardando aprovação",
      key: "knowledge:" + ruleId,
    });
    return { ok: true, captured: true, ruleId: ruleId };
  }

  const correction = registrarCorrecaoRecenteConhecimento_(
    spreadsheet,
    phone,
    answer,
    now,
  );
  return { ok: true, captured: false, correction: correction };
}

function registrarCorrecaoRecenteConhecimento_(spreadsheet, phone, answer, now) {
  const usageSheet = obterPlanilhaUsoRespostas_(spreadsheet);
  if (usageSheet.getLastRow() < 2) return false;
  const values = usageSheet
    .getRange(2, 1, usageSheet.getLastRow() - 1, BOT_USAGE_HEADERS.length)
    .getValues();
  const maximumAge = 45 * 60 * 1000;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const usedAt = dataConhecimentoValida_(values[index][0]);
    if (!usedAt || now.getTime() - usedAt.getTime() > maximumAge) break;
    if (normalizarTelefoneConhecimento_(values[index][2]) !== phone) continue;
    const ruleId = String(values[index][3] || "").trim();
    if (!ruleId) return false;
    const approvedSheet = obterPlanilhaRespostasAprovadas_(spreadsheet);
    if (approvedSheet.getLastRow() >= 2) {
      const match = approvedSheet
        .getRange(2, 1, approvedSheet.getLastRow() - 1, 1)
        .createTextFinder(ruleId)
        .matchEntireCell(true)
        .findNext();
      if (match) {
        const corrections = Number(approvedSheet.getRange(match.getRow(), 15).getValue() || 0) + 1;
        approvedSheet.getRange(match.getRow(), 15).setValue(corrections);
      }
    }
    usageSheet.getRange(index + 2, 7).setValue("Resposta humana posterior — revisar");
    registrarRevisaoBot_(spreadsheet, {
      type: "Correção de resposta",
      priority: "Alta",
      at: now,
      phone: phone,
      context: "A equipe respondeu após o uso da regra " + ruleId + ".",
      suggestion: answer,
      confidence: "Possível correção",
      status: "Aberta",
      key: "correction:" + ruleId + ":" + now.getTime(),
    });
    return true;
  }
  return false;
}

function registrarUsoConhecimentoBot_(input) {
  const ruleId = textoSeguroConhecimento_(input && input.ruleId, 120);
  const eventId = textoSeguroConhecimento_(input && input.eventId, 200);
  if (!ruleId || !eventId) return { ok: false, error: "invalid_knowledge_usage" };

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const usageSheet = obterPlanilhaUsoRespostas_(spreadsheet);
  if (usageSheet.getLastRow() >= 2) {
    const duplicate = usageSheet
      .getRange(2, 2, usageSheet.getLastRow() - 1, 1)
      .createTextFinder(eventId)
      .matchEntireCell(true)
      .findNext();
    if (duplicate) return { ok: true, duplicate: true };
  }

  const now = dataConhecimentoValida_(input.at) || new Date();
  usageSheet.appendRow([
    now,
    eventId,
    normalizarTelefoneConhecimento_(input.phone),
    ruleId,
    textoSeguroConhecimento_(input.question, 1200),
    textoSeguroConhecimento_(input.answer, 1200),
    textoSeguroConhecimento_(input.result || "Enviada", 80),
  ]);

  const approvedSheet = obterPlanilhaRespostasAprovadas_(spreadsheet);
  if (approvedSheet.getLastRow() >= 2) {
    const match = approvedSheet
      .getRange(2, 1, approvedSheet.getLastRow() - 1, 1)
      .createTextFinder(ruleId)
      .matchEntireCell(true)
      .findNext();
    if (match) {
      const row = match.getRow();
      const uses = Number(approvedSheet.getRange(row, 13).getValue() || 0) + 1;
      approvedSheet.getRange(row, 13, 1, 2).setValues([[uses, now]]);
    }
  }
  return { ok: true, recorded: true };
}

function registrarRevisaoClassificacaoBot_(input) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  return registrarRevisaoBot_(spreadsheet, {
    type: "Classificação",
    priority: input && input.confidence === "low" ? "Alta" : "Normal",
    at: new Date(),
    phone: input && input.phone,
    context: input && input.context,
    suggestion: input && input.suggestion,
    confidence: input && input.confidence,
    status: "Aberta",
    key: "classification:" + String(input && input.key || ""),
  });
}

function carregarOrientacoesClassificacaoBot_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(BOT_KNOWLEDGE_CONFIG.reviewSheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, BOT_REVIEW_HEADERS.length)
    .getDisplayValues();
  return values
    .filter(function (row) {
      return normalizarTextoConhecimento_(row[0]) === "classificacao" &&
        normalizarTextoConhecimento_(row[8]) === "concluida" &&
        String(row[9] || "").trim();
    })
    .slice(-8)
    .map(function (row) {
      return {
        context: textoSeguroConhecimento_(row[5], 600),
        teamDecision: textoSeguroConhecimento_(row[9], 300),
        note: textoSeguroConhecimento_(row[10], 300),
      };
    });
}

function carregarRascunhosRespostaAprendizado_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(
    BOT_KNOWLEDGE_CONFIG.reviewSheetName,
  );
  if (!sheet || sheet.getLastRow() < 2) return {};

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, BOT_REVIEW_HEADERS.length)
    .getValues();
  return values.reduce(function (drafts, row) {
    if (
      normalizarTextoConhecimento_(row[0]) !== "resposta" ||
      !["aberta", "aguardando aprovacao"].includes(
        normalizarTextoConhecimento_(row[8]),
      ) ||
      !String(row[6] || "").trim()
    ) {
      return drafts;
    }
    const phone = normalizarTelefoneConhecimento_(row[4]);
    if (!phone) return drafts;
    drafts[phone] = drafts[phone] || [];
    drafts[phone].push({
      at: dataConhecimentoValida_(row[2]) ||
        dataConhecimentoValida_(row[12]) || new Date(0),
      context: String(row[5] || ""),
      suggestion: String(row[6] || "").trim(),
    });
    return drafts;
  }, {});
}

function rascunhoRespostaParaDuvida_(drafts, phone, question) {
  const normalizedQuestion = normalizarTextoConhecimento_(question);
  const candidates = drafts[normalizarTelefoneConhecimento_(phone)] || [];
  const match = candidates
    .filter(function (candidate) {
      return normalizedQuestion &&
        normalizarTextoConhecimento_(candidate.context).includes(
          normalizedQuestion,
        );
    })
    .sort(function (left, right) {
      return right.at.getTime() - left.at.getTime();
    })[0];
  return match ? match.suggestion : "";
}

function carregarAgendaAprendizadoBot_(spreadsheet, now) {
  const items = [];
  const responseDrafts =
    carregarRascunhosRespostaAprendizado_(spreadsheet);
  const questionsSheet = spreadsheet.getSheetByName(
    BOT_KNOWLEDGE_CONFIG.questionsSheetName,
  );
  if (questionsSheet && questionsSheet.getLastRow() >= 2) {
    const questions = questionsSheet
      .getRange(2, 1, questionsSheet.getLastRow() - 1, BOT_UNKNOWN_HEADERS.length)
      .getValues();
    questions.forEach(function (row) {
      if (items.length >= BOT_KNOWLEDGE_CONFIG.maximumOpenQuestionsInDigest) return;
      if (normalizarTextoConhecimento_(row[9]) !== "aguardando resposta humana") return;
      const responseDraft = rascunhoRespostaParaDuvida_(
        responseDrafts,
        row[1],
        row[4],
      );
      items.push({
        categoria: "Dúvida aguardando resposta",
        telefone: normalizarTelefoneConhecimento_(row[1]),
        nome: String(row[2] || ""),
        horario: "",
        dataReferencia: Utilities.formatDate(
          dataConhecimentoValida_(row[3]) || now,
          BOT_KNOWLEDGE_CONFIG.timezone,
          "yyyy-MM-dd",
        ),
        contexto: String(row[5] || "Dúvida nova") + " — " + String(row[4] || ""),
        responsavel: "Amanda/equipe",
        automatico: false,
        futuro: false,
        prioridade: normalizarTextoConhecimento_(row[7]) === "alto" ? 0 : 2,
        sugestao: responseDraft ||
          "SEM SUGESTÃO PRONTA — leia o histórico completo antes de responder; a resposta humana poderá virar regra candidata depois de revisão.",
      });
    });
  }

  const approvedSheet = spreadsheet.getSheetByName(
    BOT_KNOWLEDGE_CONFIG.approvedSheetName,
  );
  if (approvedSheet && approvedSheet.getLastRow() >= 2) {
    const rules = approvedSheet
      .getRange(2, 1, approvedSheet.getLastRow() - 1, BOT_KNOWLEDGE_HEADERS.length)
      .getValues();
    let included = 0;
    rules.forEach(function (row) {
      if (included >= BOT_KNOWLEDGE_CONFIG.maximumRulesInDigest) return;
      if (normalizarTextoConhecimento_(row[1]) !== "revisar") return;
      included += 1;
      items.push({
        categoria: "Regra aguardando aprovação",
        telefone: "",
        nome: "",
        horario: "",
        dataReferencia: Utilities.formatDate(now, BOT_KNOWLEDGE_CONFIG.timezone, "yyyy-MM-dd"),
        contexto: String(row[4] || "Resposta nova") + " — " + String(row[5] || ""),
        responsavel: "Amanda/equipe",
        automatico: false,
        futuro: false,
        prioridade: 3,
        sugestao: "Revisar a resposta na aba Respostas Aprovadas, escolher o Modo de uso e alterar o Status para Aprovada ou Descartada.",
      });
    });
  }
  return items;
}

function promoverSnapshotConhecimentoBot(snapshotVersion, ruleIds) {
  const version = textoSeguroConhecimento_(snapshotVersion, 80);
  const selectedIds = new Set(
    (Array.isArray(ruleIds) ? ruleIds : [])
      .map(function normalizeId(value) {
        return String(value || "").trim();
      })
      .filter(Boolean),
  );
  if (!version || !selectedIds.size) {
    throw new Error("Informe a versão do snapshot e ao menos uma regra.");
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("busy_retry");
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const sheet = obterPlanilhaRespostasAprovadas_(spreadsheet);
    if (sheet.getLastRow() < 2) throw new Error("Nenhuma regra disponível.");
    const rows = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, BOT_KNOWLEDGE_HEADERS.length)
      .getValues();
    const now = new Date();
    let promoted = 0;
    rows.forEach(function promote(row, index) {
      const id = String(row[0] || "").trim();
      const approved = normalizarTextoConhecimento_(row[1]) === "aprovada";
      const selected = selectedIds.has(id);
      if (selected && !approved) {
        throw new Error("A regra " + id + " ainda não está aprovada.");
      }
      row[16] = row[16] || "1";
      row[17] = selected ? "active" : row[17] === "active" ? "retired" : row[17];
      if (selected) {
        row[18] = version;
        row[19] = Session.getActiveUser().getEmail() || "revisão humana";
        row[20] = now;
        promoted += 1;
      }
      sheet
        .getRange(index + 2, 17, 1, 5)
        .setValues([[row[16], row[17], row[18], row[19], row[20]]]);
    });
    if (promoted !== selectedIds.size) {
      throw new Error("Uma ou mais regras selecionadas não foram encontradas.");
    }
    PropertiesService.getScriptProperties().setProperty(
      "BRUNA_KB_SNAPSHOT",
      version,
    );
    return { ok: true, snapshotVersion: version, promoted };
  } finally {
    lock.releaseLock();
  }
}
