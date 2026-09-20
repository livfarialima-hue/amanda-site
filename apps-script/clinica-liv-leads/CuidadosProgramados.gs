// Owner of care decisions and their delivery receipts. Marketing follow-ups keep
// their existing owner in Retomadas.gs. Merely reading this module never writes.
const CUIDADOS_PROGRAMADOS = Object.freeze({
  sheet: "_CUIDADOS_PROGRAMADOS",
  enabled: "LIV_CUIDADOS_PROGRAMADOS_ATIVOS",
  birthdays: "LIV_ANIVERSARIOS_AUTOMATICOS_ATIVOS",
  activatedAt: "LIV_ANIVERSARIOS_ATIVADOS_EM",
  birthdayText: "A equipe da Clínica LIV deseja um feliz aniversário! Que seu novo ciclo traga saúde e bons momentos. Receba nosso carinho.",
  headers: ["Chave do cuidado", "Estado", "Rever em", "Telefone", "Profissional", "Opportunity ID", "ID da consulta", "Tipo", "Data do marco", "Mensagem aprovada", "Programado para", "Aprovado em", "Contexto aprovado", "Última mensagem", "Registrado em", "Tentado em", "Enviado em", "Erro", "Texto efetivo", "Origem da decisão", "Categoria do marco", "Dia da sugestão"],
  consultationHeaders: ["Data da cirurgia realizada", "Data do orçamento enviado", "Próxima checagem após cirurgia"],
});

// A public review is a separate, optional relationship milestone. This owner
// supplies the exact text; neither sentiment nor a sale is an eligibility input.
const AVALIACAO_GOOGLE_AMANDA = Object.freeze({
  url: "https://search.google.com/local/writereview?placeid=ChIJ7-dPJgtXzpQRMfKy91PM_qs",
  category: "Convite para avaliação no Google",
  minimumDays: 7,
  maximumDays: 30,
});

function textoConviteAvaliacaoGoogle_() {
  return "Obrigada pela confiança na Dra. Amanda. Foi um prazer receber você!\n\n" +
    "Se quiser contar como foi sua experiência, deixo aqui o link para avaliar o atendimento no Google: " +
    AVALIACAO_GOOGLE_AMANDA.url + "\nSeu relato pode ajudar quem também está escolhendo com quem se cuidar.";
}

function adicionarConviteAvaliacaoGoogle_(entrada) {
  if (entrada.retomadaEncerrada || !entrada.telefone || chaveProfissionalAgendaCuidados_(entrada.profissional) !== "amanda") return;
  const val = function (name) { return valorAgendaCuidados_(entrada.linha, entrada.colunas, [name]); };
  if (!["realizada", "consulta realizada"].includes(normalizarTextoRetomadas_(val("status")))) return;
  const attended = dataAgendaCuidados_(val("data realizada"));
  if (!attended || attended > entrada.agora || !String(val("id da consulta") || "").trim() || !String(val("opportunity id") || "").trim()) return;
  const age = diferencaDiasLocaisRetomadas_(attended, entrada.agora);
  if (age < AVALIACAO_GOOGLE_AMANDA.minimumDays || age > AVALIACAO_GOOGLE_AMANDA.maximumDays) return;
  if (valorExplicitamenteAtivoAgendaCuidados_(val("ficaram duvidas"))) return;
  if (/duvida|queixa|exame|intercorr|sintoma|pos.?oper|pre.?oper|cirurg|retorno pendente/.test(normalizarTextoRetomadas_(val("proxima acao")))) return;
  const surgery = dataAgendaCuidados_(val("data da cirurgia realizada"));
  if (surgery && diferencaDiasLocaisRetomadas_(surgery, entrada.agora) < 30) return;
  entrada.adicionar({ categoria: AVALIACAO_GOOGLE_AMANDA.category,
    telefone: entrada.telefone, nome: entrada.nome, dataReferencia: entrada.hoje,
    horario: "16:30", responsavel: "Amanda/equipe — conferir momento do convite",
    automatico: false, futuro: false, prioridade: 6,
    contexto: "Atendimento realizado com Amanda. Convite único e opcional, sem selecionar por satisfação. Conferir se o atendimento está resolvido e se já houve convite, recusa ou avaliação; não cobrar resposta nem detalhes clínicos.",
    sugestao: textoConviteAvaliacaoGoogle_(),
  });
}

function mensagemConviteAvaliacaoGoogle_(value) {
  const text = normalizarTextoRetomadas_(value);
  return (/google/.test(text) && /avali|resenha|experiencia/.test(text)) ||
    /local\/writereview|g\.page\/[^\s]+\/review|share\.google\/ggguczihc6eolco4e/.test(text);
}

function avaliacaoGoogleJaAbordada_(conversation) {
  return conversation.some(function (message) {
    const text = normalizarTextoRetomadas_(message.texto);
    const review = /google/.test(text) && /avali|resenha|experiencia/.test(text);
    if (message.direcao === "OUT") return mensagemConviteAvaliacaoGoogle_(message.texto);
    return review && /ja (?:fiz|deixei|escrevi|publiquei|avaliei)|nao (?:quero|vou|desejo)|prefiro nao|nao (?:me )?(?:peca|mande|envie)|pare de pedir/.test(text);
  });
}

function hashCuidado_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8,
  )).replace(/=+$/g, "");
}

function entregaCuidadoAtiva_(purpose) {
  if (purpose === "birthday") return false;
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(CUIDADOS_PROGRAMADOS.enabled) === "true" && (purpose !== "birthday" || props.getProperty(CUIDADOS_PROGRAMADOS.birthdays) === "true");
}

function janelaEnvioCuidadoPermitida_(date, purpose) {
  if (purpose === "birthday") return false;
  const hour = Number(formatarDataRetomadas_(date, "H"));
  const day = new Date(formatarDataRetomadas_(date, "yyyy-MM-dd") + "T12:00:00-03:00").getUTCDay();
  return hour >= 9 && hour < 18 && (purpose === "birthday" || ![0, 6].includes(day));
}

function dispensaCuidadoPermitida_(category) {
  const text = normalizarTextoRetomadas_(category);
  return !/conferir fechamento|confirmar profissional|lembrete/.test(text) && /retomada|follow.up|cliente antigo|aniversario|pos.consulta|pos.cirurg|jornada cirurgica|convite para avaliacao no google/.test(text);
}

function dataNascimentoCuidado_(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const day = iso ? text : local ? local[3] + "-" + local[2] + "-" + local[1] : "";
  if (!day) return null;
  const parsed = new Date(day + "T12:00:00-03:00");
  return !Number.isNaN(parsed.getTime()) && formatarDataRetomadas_(parsed, "yyyy-MM-dd") === day ? parsed : null;
}

function tabelaCuidados_(spreadsheet, create) {
  let sheet = spreadsheet.getSheetByName(CUIDADOS_PROGRAMADOS.sheet);
  if (!sheet && create) {
    sheet = spreadsheet.insertSheet(CUIDADOS_PROGRAMADOS.sheet);
    sheet.getRange(1, 1, 1, CUIDADOS_PROGRAMADOS.headers.length).setValues([CUIDADOS_PROGRAMADOS.headers]);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  if (sheet) {
    const headers = sheet.getRange(1, 1, 1, CUIDADOS_PROGRAMADOS.headers.length).getValues()[0];
    if (JSON.stringify(headers) !== JSON.stringify(CUIDADOS_PROGRAMADOS.headers)) throw new Error("care_schema_mismatch");
  }
  return sheet;
}

function carregarDecisoesCuidados_(spreadsheet) {
  const sheet = tabelaCuidados_(spreadsheet, false);
  const result = {};
  if (!sheet || sheet.getLastRow() < 2) return result;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, CUIDADOS_PROGRAMADOS.headers.length).getValues().forEach(function (row, i) {
    if (row[0]) result[row[0]] = { row: row, rowNumber: i + 2 };
  });
  return result;
}

function gravarDecisaoCuidado_(spreadsheet, row) {
  const sheet = tabelaCuidados_(spreadsheet, true);
  const existing = carregarDecisoesCuidados_(spreadsheet)[row[0]];
  sheet.getRange(existing ? existing.rowNumber : sheet.getLastRow() + 1, 1, 1, CUIDADOS_PROGRAMADOS.headers.length).setValues([row]);
  SpreadsheetApp.flush();
}

// Explicit, additive migration. Existing columns, formulas, validation and IDs
// are left in place, including the intentionally empty legacy columns 75–77.
function prepararEstruturaCuidadosProgramados() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaConsultas);
  if (!sheet) throw new Error("consultations_missing");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  CUIDADOS_PROGRAMADOS.consultationHeaders.forEach(function (header) {
    if (headers.includes(header)) return;
    const column = headers.length + 1;
    if (column > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    sheet.getRange(1, column).setValue(header);
    sheet.getRange(2, column, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy");
    sheet.getRange(1, column).setNote("Registro administrativo confirmado pela equipe. Não inferir pela passagem da data no Calendar nem por classificação automática do WhatsApp.");
    headers.push(header);
  });
  tabelaCuidados_(spreadsheet, true);
  return { ok: true, addedOnly: true, active: false };
}

// Read-only release/operations check. Does not plan, approve or send contact.
function diagnosticarCuidadosProgramados() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const consultations = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaConsultas);
  const headers = consultations ? consultations.getRange(1, 1, 1, consultations.getLastColumn()).getValues()[0] : [];
  const ledger = tabelaCuidados_(spreadsheet, false);
  const states = {};
  const decisions = carregarDecisoesCuidados_(spreadsheet);
  Object.keys(decisions).forEach(function (key) {
    const state = String(decisions[key].row[1] || "Sem estado");
    states[state] = (states[state] || 0) + 1;
  });
  const result = { ok: true, readOnly: true, active: entregaCuidadoAtiva_("post_consult"),
    birthdaysActive: entregaCuidadoAtiva_("birthday"),
    birthdayDeliveryMode: "manual_daily_reminder",
    missingHeaders: CUIDADOS_PROGRAMADOS.consultationHeaders.filter(function (header) { return !headers.includes(header); }),
    consultationColumns: headers.length, ledgerPresent: Boolean(ledger), states: states,
    existingFollowupTriggers: ScriptApp.getProjectTriggers().filter(function (trigger) { return trigger.getHandlerFunction() === "processarRetomadasAutomaticas"; }).length,
  };
  console.log(JSON.stringify(result));
  return result;
}

function enriquecerMarcoCuidado_(item, row, columns) {
  const val = function (name) { return valorAgendaCuidados_(row, columns, [name]); };
  const date = function (name) { return dataAgendaCuidados_(val(name)); };
  const category = normalizarTextoRetomadas_(item.categoria);
  let purpose = "";
  let reference = null;
  if (category === "aniversario") { purpose = "birthday"; reference = dataAgendaCuidados_(item.dataReferencia); }
  else if (category === normalizarTextoRetomadas_(AVALIACAO_GOOGLE_AMANDA.category)) { purpose = "google_review"; reference = date("data realizada"); }
  else if (/orcamento/.test(category)) { purpose = "quote"; reference = date("data do orcamento enviado"); }
  else if (/pos.cirurg/.test(category)) { purpose = "post_surgery"; reference = date("data da cirurgia realizada"); }
  else if (/pos.consulta/.test(category) && !/conferir fechamento/.test(category)) { purpose = "post_consult"; reference = date("data realizada"); }
  const identity = String(val("id da consulta") || "").trim();
  const professional = chaveProfissionalAgendaCuidados_(val("profissional"));
  const anchor = reference || date("data da proxima retomada") || date("data realizada") || date("data agendada");
  const sourceKey = "care:" + hashCuidado_(purpose === "google_review" ? ["google_review", item.telefone].join("|") : purpose === "birthday" ? ["birthday", item.telefone, formatarDataRetomadas_(reference, "yyyy")].join("|") : [
    item.telefone || item.nome, professional, identity, item.categoria,
    anchor ? formatarDataRetomadas_(anchor, "yyyy-MM-dd") : String(val("proxima acao") || ""),
  ].join("|"));
  return Object.assign({}, item, {
    sourceKey: sourceKey,
    care: {
      purpose: purpose, consultationId: identity, professional: professional,
      opportunityId: String(val("opportunity id") || "").trim(),
      referenceDate: reference ? formatarDataRetomadas_(reference, "yyyy-MM-dd") : "",
      consent: valorExplicitamenteAtivoAgendaCuidados_(val("consentimento para contato")),
      preferredChannel: normalizarTextoRetomadas_(val("canal preferido")),
      birthdayEnabled: valorExplicitamenteAtivoAgendaCuidados_(val("aniversario pelo bot")),
      birthDate: dataNascimentoCuidado_(val("data de nascimento")) ? formatarDataRetomadas_(dataNascimentoCuidado_(val("data de nascimento")), "yyyy-MM-dd") : "",
      calendarId: String(val("id da agenda google") || ""),
      calendarEventId: String(val("id do evento google") || ""),
      calendarSyncStatus: String(val("sincronizacao google agenda") || ""),
      consultationType: String(val("tipo de consulta") || ""),
      location: String(val("local modalidade") || ""),
      appointmentAt: combinarDataHorarioAgendaCuidados_(val("data agendada"), val("horario agendado")),
      status: normalizarTextoRetomadas_(val("status")),
      lastHumanAt: date("ultima interacao humana"),
      outcome: normalizarTextoRetomadas_(val("resultado comercial")),
      nextAction: String(val("proxima acao") || ""),
      nextSurgeryCheck: String(val("proxima checagem apos cirurgia") || ""),
    },
  });
}

function adicionarMarcosCirurgiaOrcamento_(entrada) {
  if (entrada.retomadaEncerrada) return;
  const val = function (name) { return valorAgendaCuidados_(entrada.linha, entrada.colunas, [name]); };
  const primeiroNome = typeof primeiroNomeSeguroRetomada_ === "function"
    ? primeiroNomeSeguroRetomada_(entrada.nome)
    : "";
  const saudacao = primeiroNome ? "Oi, " + primeiroNome + "!" : "Olá!";
  const outcome = normalizarTextoRetomadas_(resultadoComercialAgendaCuidados_(val("resultado comercial")));
  const surgery = dataAgendaCuidados_(val("data da cirurgia realizada"));
  const quote = dataAgendaCuidados_(val("data do orcamento enviado"));
  const explicitCheck = dataAgendaCuidados_(val("proxima checagem apos cirurgia"));
  const lastContact = dataAgendaCuidados_(val("ultima retomada"));
  function add(purpose, reference, days, label, message, window) {
    if (!reference || reference.getTime() > entrada.agora.getTime()) return;
    const age = diferencaDiasLocaisRetomadas_(reference, entrada.agora);
    if (age < days || age > days + window) return;
    if (lastContact && diferencaDiasLocaisRetomadas_(lastContact, entrada.agora) < 7) return;
    entrada.adicionar({ categoria: label, telefone: entrada.telefone, nome: entrada.nome,
      dataReferencia: formatarDataRetomadas_(new Date(reference.getTime() + days * 86400000), "yyyy-MM-dd"),
      horario: "10:30", responsavel: responsavelAgendaCuidados_(entrada.profissional),
      automatico: false, futuro: false, prioridade: purpose === "post_surgery" ? 2 : 5,
      contexto: "Marco registrado pela equipe. Conferir a conversa antes de aprovar; dúvidas clínicas permanecem com o profissional.",
      sugestao: message,
    });
  }
  if (surgery) {
    if (explicitCheck) add("post_surgery", explicitCheck, 0, "Checagem pós-cirúrgica combinada", saudacao + " A equipe da Clínica LIV está à disposição para ajudar com a organização do seu acompanhamento. Há algo que você gostaria de encaminhar ao profissional?", 3);
    else {
      add("post_surgery", surgery, 2, "Checagem pós-cirúrgica — D+2", saudacao + " Passando para saber se há alguma dúvida que você gostaria de encaminhar à equipe responsável pelo seu acompanhamento. Estamos à disposição por aqui.", 2);
      add("post_surgery", surgery, 14, "Checagem pós-cirúrgica — D+14", saudacao + " A equipe da Clínica LIV está à disposição para ajudar com a organização do seu acompanhamento. Há algo que você gostaria de encaminhar ao profissional?", 3);
    }
  }
  if (quote && !surgery && !/fechado|nao fechou|encerrado|desist/.test(outcome)) {
    add("quote", quote, 3, "Retomada do orçamento — D+3", saudacao + " Ficou alguma dúvida sobre o orçamento que a equipe enviou? Se algum ponto precisar de esclarecimento, podemos ajudar com calma.", 2);
    if (/avali|pens|decid|orcament/.test(normalizarTextoRetomadas_(entrada.proximaAcao))) {
      add("quote", quote, 10, "Retomada do orçamento — D+10", saudacao + " Se ainda fizer sentido conversar sobre o planejamento, a equipe está à disposição para esclarecer dúvidas. Fique à vontade para retomar quando for um bom momento para você.", 3);
    }
  }
}

function assinaturaContextoCuidado_(care, conversation) {
  const last = conversation[conversation.length - 1];
  return hashCuidado_(JSON.stringify({ care: care.care, suggestion: care.sugestao,
    lastId: last ? last.messageId : "", lastAt: last ? String(last.dataHora) : "",
    // Include authorship/content so corrected/imported rows also invalidate approval.
    turns: conversation.slice(-20).map(function (m) { return [m.messageId, String(m.dataHora), m.direcao, m.source || m.autor || "", m.texto]; }),
  }));
}

function janelaRespostaCuidado_(now, conversation, purpose, requestedAt) {
  if (purpose === "birthday") return null;
  const earliest = new Date(Math.max(now.getTime() + 15 * 60000, requestedAt ? requestedAt.getTime() : 0));
  const buckets = {};
  (conversation || []).filter(function (m) {
    return m.direcao === "IN" && m.dataHora && now - m.dataHora >= 0 && now - m.dataHora <= 60 * 86400000;
  }).forEach(function (m) {
    const hour = Number(formatarDataRetomadas_(m.dataHora, "H"));
    if (hour >= 9 && hour < 18) { buckets[hour] = buckets[hour] || new Set(); buckets[hour].add(formatarDataRetomadas_(m.dataHora, "yyyy-MM-dd")); }
  });
  const preferred = Object.keys(buckets).filter(function (hour) { return buckets[hour].size >= 3; }).sort(function (a, b) { return buckets[b].size - buckets[a].size || Number(a) - Number(b); });
  const hours = purpose === "birthday" ? ["10:30", "14:30", "16:30"] : preferred.map(function (h) { return String(h).padStart(2, "0") + ":30"; }).concat(["10:30", "16:30"]);
  for (let day = 0; day < 4; day += 1) {
    const date = new Date(earliest.getTime() + day * 86400000);
    const local = formatarDataRetomadas_(date, "yyyy-MM-dd");
    const weekday = new Date(local + "T12:00:00-03:00").getUTCDay();
    if (purpose !== "birthday" && [0, 6].includes(weekday)) continue;
    for (let i = 0; i < hours.length; i += 1) {
      const target = new Date(local + "T" + hours[i] + ":00-03:00");
      if (target >= earliest) return target;
    }
    if (purpose === "birthday") return null;
  }
  return null;
}

function motivoBloqueioCuidado_(item, conversation, preferences, now, approvedAt) {
  const care = item.care || {};
  if (!care.purpose || !care.consultationId || !care.opportunityId || !item.telefone || !["amanda", "daniel"].includes(care.professional)) return "identity_requires_review";
  if (!care.consent || (care.preferredChannel && !/whatsapp/.test(care.preferredChannel))) return "contact_consent_required";
  if (preferences.neverFollowUp || preferences.neverBotReply || preferences.suspendAutomaticFollowUp) return "contact_suspended";
  if (!conversation.length) return "conversation_missing";
  const last = conversation[conversation.length - 1];
  if (!last.messageId || !last.dataHora) return "conversation_missing";
  if (care.purpose === "google_review") {
    if (care.professional !== "amanda" || !["realizada", "consulta realizada"].includes(care.status) || !care.referenceDate || item.sugestao !== textoConviteAvaliacaoGoogle_()) return "google_review_not_eligible";
    if (avaliacaoGoogleJaAbordada_(conversation)) return "google_review_already_addressed";
    if (!Number.isFinite(last.dataHora.getTime()) || now - last.dataHora < 48 * 3600000 || (care.lastHumanAt && now - care.lastHumanAt < 48 * 3600000)) return "google_review_recent_contact";
  }
  if (approvedAt && (last.dataHora > approvedAt || (care.lastHumanAt && care.lastHumanAt > approvedAt))) return "conversation_changed";
  const recent = conversation.filter(function (m) { return now - m.dataHora <= 30 * 86400000; });
  if (recent.some(function (m) { return m.direcao === "IN" && (mensagemSemRetomada_(m.texto) || mensagemIndicaRetornoFuturo_(m.texto)); })) return "patient_requested_pause";
  if (conversaTemPromessaHumanaPendente_(conversation)) return "pending_human_commitment";
  if (last.direcao === "IN" && mensagemExigeRespostaCentral_(last.texto)) return "patient_waiting_for_reply";
  if (recent.some(function (m) { return m.direcao === "IN" && now - m.dataHora < 48 * 3600000 && contextoSensivelRetomada_(normalizarTextoRetomadas_(m.texto)); })) return "sensitive_context";
  if (care.purpose === "birthday") {
    const birth = dataAgendaCuidados_(care.birthDate);
    if (!birth || birth > now || now - birth > 120 * 366 * 86400000 || !care.birthdayEnabled || !["realizada", "consulta realizada"].includes(care.status)) return "birthday_not_eligible";
    if (care.referenceDate !== formatarDataRetomadas_(now, "yyyy-MM-dd")) return "birthday_not_today";
    if (recent.some(function (m) { return contextoSensivelRetomada_(normalizarTextoRetomadas_(m.texto)); })) return "sensitive_context";
    if (now - last.dataHora < 24 * 3600000) return "recent_contact";
  }
  return "";
}

function validarCalendarioCuidado_(item) {
  const care = item.care || {};
  if (!["post_consult", "google_review"].includes(care.purpose)) return "";
  if (!care.calendarId && !care.calendarEventId) return ""; // Attended legacy record; no Calendar event was asserted.
  if (!care.calendarId || !care.calendarEventId || !care.appointmentAt) return "calendar_link_incomplete";
  if (typeof validarVinculoAgendaLembreteConsulta_ !== "function") return "calendar_unavailable";
  const verification = validarVinculoAgendaLembreteConsulta_({
    appointment: care.appointmentAt, calendarId: care.calendarId,
    calendarEventId: care.calendarEventId, calendarSyncStatus: care.calendarSyncStatus,
    consultationType: care.consultationType, location: care.location,
  }, typeof CalendarApp !== "undefined" ? CalendarApp : null);
  return verification.ok ? "" : verification.reason;
}

function validarOportunidadeCuidado_(spreadsheet, item) {
  if (typeof localizarOportunidadePorId_ !== "function" || typeof OPPORTUNITY_STORE_CONFIG === "undefined") return "opportunity_unavailable";
  const record = localizarOportunidadePorId_(spreadsheet.getSheetByName(OPPORTUNITY_STORE_CONFIG.sheetName), item.care.opportunityId);
  if (!record || normalizarTelefoneRetomadas_(record.values[1]) !== item.telefone || chaveProfissionalAgendaCuidados_(record.values[3]) !== item.care.professional || /void|duplic|invalid/.test(normalizarTextoRetomadas_(record.values[6]))) return "opportunity_identity_mismatch";
  return "";
}

function validarCadastroAniversario_(spreadsheet, item) {
  if (!item.care || item.care.purpose !== "birthday") return "";
  const sheet = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaConsultas);
  const rows = sheet.getDataRange().getValues();
  const columns = mapearCabecalhosAgendaCuidados_(rows[0]);
  const birthDates = new Set();
  let denied = false;
  let contacted = false;
  rows.slice(1).forEach(function (row) {
    if (normalizarTelefoneRetomadas_(valorAgendaCuidados_(row, columns, ["telefone e 164"])) !== item.telefone) return;
    const birth = dataNascimentoCuidado_(valorAgendaCuidados_(row, columns, ["data de nascimento"]));
    if (birth) birthDates.add(formatarDataRetomadas_(birth, "yyyy-MM-dd"));
    if (!contatoPermitidoAgendaCuidados_(valorAgendaCuidados_(row, columns, ["consentimento para contato"]))) denied = true;
    if (String(valorAgendaCuidados_(row, columns, ["motivo de supressao"]) || "").trim()) denied = true;
    const last = dataAgendaCuidados_(valorAgendaCuidados_(row, columns, ["ultimo aniversario contatado"]));
    if (last && formatarDataRetomadas_(last, "yyyy") === String(item.care.referenceDate).slice(0, 4)) contacted = true;
  });
  return denied ? "contact_suspended" : birthDates.size !== 1 ? "birthday_identity_conflict" : contacted ? "birthday_already_contacted" : "";
}

function rotuloFalhaCuidado_(reason) {
  const labels = { birthday_manual_only: "Aniversário: envio manual pela equipe", conversation_changed: "A conversa mudou", care_context_changed: "A conversa ou o cadastro mudou", patient_waiting_for_reply: "A paciente está aguardando uma resposta", sensitive_context: "Há assunto delicado para a equipe avaliar", contact_consent_required: "Falta confirmar a permissão de contato", contact_suspended: "Contato suspenso no cadastro", identity_requires_review: "Conferir consulta, profissional e vínculo com a LEADS", birthday_identity_conflict: "Há datas de nascimento divergentes no cadastro", calendar_changed: "O compromisso foi alterado no Calendar", care_schedule_expired: "O horário previsto passou", birthday_template_missing: "O modelo de aniversário ainda não está disponível", pending_human_commitment: "Há uma tarefa humana pendente", request_failed: "O resultado do envio precisa ser conferido" };
  return labels[String(reason || "")] || "Conferir a conversa e o registro do envio antes de qualquer novo contato";
}

function contextoOperacionalCuidados_(spreadsheet) {
  const leads = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaLeads);
  const messages = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaMensagens);
  if (!leads || !messages) throw new Error("care_context_unavailable");
  const preferences = carregarPreferenciasContatoPorTelefone_(leads);
  const secondary = spreadsheet.getSheetByName(CONFIG.danielSheetName);
  const extra = carregarPreferenciasContatoPorTelefone_(secondary);
  Object.keys(extra).forEach(function (phone) {
    const previous = preferences[phone] || {};
    preferences[phone] = { neverFollowUp: previous.neverFollowUp || extra[phone].neverFollowUp, neverBotReply: previous.neverBotReply || extra[phone].neverBotReply, suspendAutomaticFollowUp: previous.suspendAutomaticFollowUp || extra[phone].suspendAutomaticFollowUp };
  });
  return { preferences: preferences, conversations: carregarConversasRetomadas_(messages, { includeAuthorship: true }) };
}

function projetarDecisoesCuidados_(spreadsheet, items, now) {
  const states = carregarDecisoesCuidados_(spreadsheet);
  const projected = items.map(function (item) {
    const state = states[item.sourceKey];
    if (!state) return item;
    const row = state.row;
    if (["Dispensado", "Enviado"].includes(row[1])) return null;
    if (item.care && item.care.purpose === "birthday") return Object.assign({}, item, { automatico: false, approvalBlocked: true, responsavel: "Equipe Clínica LIV — envio manual" });
    if (row[1] === "Adiado" && dataAgendaCuidados_(row[2]) > now) return null;
    if (["Programado", "Enviando"].includes(row[1])) return Object.assign({}, item, { automatico: true, responsavel: "Bruna/automação", sugestao: row[9], dataReferencia: formatarDataRetomadas_(row[10], "yyyy-MM-dd"), horario: formatarDataRetomadas_(row[10], "HH:mm"), futuro: formatarDataRetomadas_(row[10], "yyyy-MM-dd") > formatarDataRetomadas_(now, "yyyy-MM-dd") });
    if (["Revisar", "Incerto", "Reconciliar"].includes(row[1])) return Object.assign({}, item, { automatico: false, approvalBlocked: true, contexto: item.contexto + " " + rotuloFalhaCuidado_(row[17]) + "." });
    return item;
  }).filter(Boolean);
  // An unfinished decision must not vanish when its short suggestion window
  // ends. Conversely a dismissal is independent of the regenerable Central.
  const present = new Set(items.map(function (item) { return item.sourceKey; }));
  Object.keys(states).forEach(function (key) {
    const row = states[key].row;
    if (present.has(key) || ["Dispensado", "Enviado"].includes(row[1]) || (row[1] === "Adiado" && dataAgendaCuidados_(row[2]) > now)) return;
    if (row[7] === "birthday" && !["Enviando", "Incerto", "Reconciliar"].includes(row[1])) return;
    const restored = row[1] === "Adiado" ? obterMarcoCuidado_(spreadsheet, key, now) : null;
    projected.push(Object.assign({}, restored || {}, { sourceKey: key, telefone: row[3], nome: restored ? restored.nome : "", categoria: restored ? restored.categoria : "Retomada de cuidado — " + row[1], dataReferencia: formatarDataRetomadas_(now, "yyyy-MM-dd"), horario: "", automatico: ["Programado", "Enviando"].includes(row[1]), futuro: false, prioridade: 1, responsavel: responsavelAgendaCuidados_(row[4]), sugestao: restored ? restored.sugestao : row[9], contexto: "Conferir o marco original e o histórico. " + (row[17] ? rotuloFalhaCuidado_(row[17]) : "Revisão adiada pela equipe."), care: restored ? restored.care : { purpose: "" } }));
  });
  return projected;
}

function obterMarcoCuidado_(spreadsheet, sourceKey, now) {
  const sheet = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaConsultas);
  const stored = carregarDecisoesCuidados_(spreadsheet)[sourceKey];
  const find = function (date) { return criarAgendaCuidadosConsultas_(sheet, date, { raw: true }).find(function (item) {
    return item.sourceKey === sourceKey && (!stored || stored.row[7] !== "google_review" ||
      (item.care.consultationId === stored.row[6] && item.care.opportunityId === stored.row[5] && item.care.referenceDate === stored.row[8]));
  }); };
  const current = find(now);
  if (current) return current;
  // A postponed invitation cannot turn into a new solicitation months later.
  if (stored && stored.row[7] === "google_review") return null;
  if (!stored || !["Adiado", "Programado", "Enviando"].includes(stored.row[1]) || !stored.row[7] || stored.row[7] === "birthday") return null;
  const day = dataAgendaCuidados_(stored.row[21]);
  // Re-run the owner against TODAY'S consultation data using the original
  // suggestion day only for its window. Changed dates/statuses keep invalidating
  // the key; patient context and consent are always validated at the current time.
  const restored = day ? find(day) : null;
  return restored && restored.categoria === stored.row[20] ? Object.assign({}, restored, { futuro: false }) : null;
}

function decidirCuidadoCentral_(spreadsheet, item, action, now) {
  const existing = carregarDecisoesCuidados_(spreadsheet)[item.sourceKey];
  if (existing && ["Enviando", "Enviado", "Incerto", "Reconciliar"].includes(existing.row[1])) return { ok: false, reason: "delivery_requires_reconciliation" };
  const care = obterMarcoCuidado_(spreadsheet, item.sourceKey, now);
  if (!care && existing && action === "dismiss" && !["Enviando", "Incerto", "Enviado"].includes(existing.row[1])) {
    if (!dispensaCuidadoPermitida_(existing.row[20])) return { ok: false, reason: "care_requires_human_resolution" };
    const dismissed = existing.row.slice(); dismissed[1] = "Dispensado"; gravarDecisaoCuidado_(spreadsheet, dismissed); return { ok: true };
  }
  if (!care) return { ok: false, reason: "item_changed" };
  if (care.care.purpose === "birthday" && action !== "dismiss") return { ok: false, reason: "birthday_manual_only" };
  if (action === "dismiss" && !dispensaCuidadoPermitida_(care.categoria)) return { ok: false, reason: "care_requires_human_resolution" };
  let row = existing ? existing.row.slice() : Array(CUIDADOS_PROGRAMADOS.headers.length).fill("");
  row[0] = item.sourceKey; row[3] = care.telefone; row[4] = care.care.professional;
  row[5] = care.care.opportunityId; row[6] = care.care.consultationId; row[7] = care.care.purpose; row[8] = care.care.referenceDate;
  row[14] = row[14] || now; row[19] = "Painel / Central — decisão explícita";
  row[9] = row[9] || care.sugestao; row[20] = care.categoria;
  row[21] = row[21] || formatarDataRetomadas_(now, "yyyy-MM-dd");
  if (action === "dismiss") { row[1] = "Dispensado"; row[2] = ""; }
  else if (action === "defer") { row[1] = "Adiado"; row[2] = item.deferUntil; }
  else if (action === "approve") {
    if (!entregaCuidadoAtiva_(care.care.purpose)) return { ok: false, reason: "care_disabled" };
    if (existing && ["Dispensado", "Programado", "Revisar", "Reconciliar"].includes(existing.row[1])) return { ok: false, reason: "care_already_decided" };
    const operational = contextoOperacionalCuidados_(spreadsheet);
    const conversation = operational.conversations[care.telefone] || [];
    const reason = motivoBloqueioCuidado_(care, conversation, operational.preferences[care.telefone] || {}, now, null) || validarOportunidadeCuidado_(spreadsheet, care) || validarCalendarioCuidado_(care) || validarCadastroAniversario_(spreadsheet, care);
    if (reason) return { ok: false, reason: reason };
    const suggestion = String(item.finalMessage || care.sugestao || "").trim();
    // Care messages are deliberately administrative. Clinical/custom texts stay
    // human; approval grants delivery of this exact reviewed suggestion only.
    if (!suggestion || suggestion !== care.sugestao || suggestion.length > 900) return { ok: false, reason: "care_message_requires_human_send" };
    const due = care.futuro ? combinarDataHorarioAgendaCuidados_(care.dataReferencia, care.horario || "10:30") : null;
    const schedule = item.programFor || janelaRespostaCuidado_(now, conversation, care.care.purpose, due);
    if (!schedule || schedule <= now || schedule - now > 4 * 86400000) return { ok: false, reason: "invalid_schedule" };
    if (!janelaEnvioCuidadoPermitida_(schedule, care.care.purpose) || (due && schedule < due)) return { ok: false, reason: "outside_send_window" };
    row[1] = "Programado"; row[9] = suggestion; row[10] = schedule; row[11] = now;
    row[12] = assinaturaContextoCuidado_(care, conversation); row[13] = conversation[conversation.length - 1].messageId;
  } else return { ok: false, reason: "invalid_decision" };
  gravarDecisaoCuidado_(spreadsheet, row);
  return { ok: true, scheduledAt: row[10] || null };
}

function dispensarItensCentralInterno_(spreadsheet, sheet, now, selected) {
  const live = listarItensPainelDecisoesCentral_(sheet, now);
  const results = selected.map(function (decision) {
    const item = live.find(function (value) { return value.sourceKey === decision.sourceKey && value.rowNumber === decision.rowNumber; });
    let result = { ok: false, reason: "item_changed" };
    if (item && item.dismissAvailable) {
      if (item.sourceKey.indexOf("care:") === 0) result = decidirCuidadoCentral_(spreadsheet, item, "dismiss", now);
      else if (item.cancellationAvailable) {
        const operation = cancelarRetomadasMarcadasCentralInterno_(spreadsheet, sheet, now, [item.cancellationDecision]);
        result = operation.results[0] || result;
      }
    }
    return { rowNumber: decision.rowNumber, ok: result.ok === true, reason: result.reason || "" };
  });
  return { ok: results.every(function (r) { return r.ok; }), results: results };
}

function validarEnvioCuidado_(input) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(CUIDADOS_PROGRAMADOS.enabled) !== "true") return { ok: false, error: "care_disabled" };
  const state = carregarDecisoesCuidados_(spreadsheet)[String(input.planId || "")];
  if (!state || state.row[1] !== "Enviando") return { ok: false, error: "care_not_claimed" };
  const row = state.row;
  if (row[7] === "birthday") return { ok: false, error: "birthday_manual_only" };
  const now = new Date();
  if (!janelaEnvioCuidadoPermitida_(now, row[7])) return { ok: false, error: "care_outside_send_window" };
  if (!row[11] || !row[10] || now - row[10] < 0 || now - row[10] > 60 * 60000) return { ok: false, error: "care_schedule_expired" };
  const care = obterMarcoCuidado_(spreadsheet, row[0], now);
  if (!care) return { ok: false, error: "care_changed" };
  const operational = contextoOperacionalCuidados_(spreadsheet);
  const conversation = operational.conversations[care.telefone] || [];
  const reason = motivoBloqueioCuidado_(care, conversation, operational.preferences[care.telefone] || {}, now, row[11]) || validarOportunidadeCuidado_(spreadsheet, care) || validarCalendarioCuidado_(care) || validarCadastroAniversario_(spreadsheet, care);
  if (reason) return { ok: false, error: reason };
  if (assinaturaContextoCuidado_(care, conversation) !== row[12] || row[9] !== care.sugestao) return { ok: false, error: "care_context_changed" };
  if (row[7] === "birthday" && props.getProperty(CUIDADOS_PROGRAMADOS.birthdays) !== "true") return { ok: false, error: "birthday_disabled" };
  const pending = typeof listarCompromissosPendentesPaciente_ === "function" ? listarCompromissosPendentesPaciente_(spreadsheet, care.telefone) : [];
  if (pending.length) return { ok: false, error: "pending_human_commitment" };
  return { ok: true, planId: row[0], patientPhone: row[3], professional: row[4], opportunityId: row[5], purpose: row[7], referenceDate: row[8], body: row[9], approvedAt: row[11].toISOString(), contextSignature: row[12], contextAnchorMessageId: row[13], checkedAt: now.toISOString() };
}

// Compatibility entry point: birthdays are internal reminders, never queue plans.
function planejarAniversariosCuidados_() {
  return 0;
}

function processarCuidadosProgramados_(now, secret, props) {
  if (props.getProperty(CUIDADOS_PROGRAMADOS.enabled) !== "true") return { ok: true, active: false, sent: 0 };
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  planejarAniversariosCuidados_(spreadsheet, now, props);
  const states = carregarDecisoesCuidados_(spreadsheet);
  let sent = 0;
  let reviewed = 0;
  Object.keys(states).slice(0).forEach(function (key) {
    if (sent + reviewed >= 10) return;
    const row = states[key].row;
    if (row[1] !== "Programado" || !row[10] || row[10] > now) return;
    if (row[7] === "birthday") { row[1] = "Revisar"; row[17] = "birthday_manual_only"; reviewed += 1; gravarDecisaoCuidado_(spreadsheet, row); return; }
    row[1] = "Enviando"; row[15] = now;
    gravarDecisaoCuidado_(spreadsheet, row);
    const validation = validarEnvioCuidado_({ planId: key });
    if (!validation.ok) { row[1] = "Revisar"; row[17] = validation.error; reviewed += 1; gravarDecisaoCuidado_(spreadsheet, row); return; }
    const result = enviarRetomadaAutomatica_({ purpose: "patient_care", planId: key }, secret, props);
    if (result.ok && result.sent) {
      row[1] = "Enviado"; row[16] = now; row[18] = result.effectiveBody || row[9]; row[17] = "";
      // Persist acceptance before secondary records; failure here must never
      // produce another patient send.
      gravarDecisaoCuidado_(spreadsheet, row);
      try {
        const recorded = registrarMensagemCuidado_(spreadsheet, row, now);
        if (!recorded || recorded.ok !== true) throw new Error("care_ledger_record_failed");
        if (row[7] === "birthday") registrarAniversarioContatado_(spreadsheet, row[3], now);
      } catch (error) { row[1] = "Reconciliar"; row[17] = "Envio aceito; conferir registro do histórico"; }
      sent += 1;
    } else { row[1] = result.uncertain ? "Incerto" : "Revisar"; row[17] = result.error; reviewed += 1; }
    gravarDecisaoCuidado_(spreadsheet, row);
  });
  return { ok: reviewed === 0, active: true, sent: sent, review: reviewed };
}

function registrarMensagemCuidado_(spreadsheet, row, now) {
  if (typeof registrarTurnoConversa_ === "function") {
    return registrarTurnoConversa_({ phone: row[3], eventId: "care-" + hashCuidado_(row[0]), messageId: "care-" + hashCuidado_(row[0]), text: row[18] || row[9], source: "bruna", at: now.toISOString(), opportunityId: row[5], professional: row[4] });
  }
  throw new Error("care_ledger_writer_missing");
}

function textoPrevistoCuidado_(item) {
  const text = String(item.finalMessage || item.sugestao || "").trim();
  if (!text || /anivers.rio/i.test(item.nextAction || item.categoria || "")) return text;
  return "Retomando nosso contato pela Clínica LIV:\n\n" + text + "\n\nSe preferir não receber novas mensagens, é só me avisar.";
}

function montarResumoPraticoCuidados_(items, day, panelUrl, centralUrl, warnings) {
  const isBirthday = function (item) { return normalizarTextoRetomadas_(item.nextAction) === "aniversario"; };
  const birthdays = items.filter(function (item) { return isBirthday(item) && !item.future; });
  const manual = items.filter(function (item) { return item.manualToday && !isBirthday(item); });
  const automatic = items.filter(function (item) { return item.automatic && !item.future && !isBirthday(item); });
  const future = items.filter(function (item) { return item.future; });
  const manualCount = manual.length + birthdays.length;
  const esc = escaparHtmlRetomadas_;
  const instruction = "Aniversários: envio manual por você; a Bruna não envia. Nos demais itens elegíveis, aprovar programa o envio. Dispensar retira somente a sugestão escolhida; adiar muda a revisão.";
  const lines = ["Clínica LIV — " + day, manualCount + " decisões hoje; " + automatic.length + " envios previstos; " + future.length + " próximos.", "Revisar e decidir: " + panelUrl, instruction];
  let html = '<div style="font:15px/1.5 Arial,sans-serif;max-width:660px;margin:auto;color:#243d31"><h2>Cuidados e decisões — ' + esc(day) + '</h2><p><strong>' + manualCount + ' decisões hoje</strong> · ' + automatic.length + ' envios previstos · ' + future.length + ' próximos</p><p><a style="display:block;background:#356854;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px" href="' + esc(panelUrl) + '">Revisar as sugestões do dia</a></p><p>' + esc(instruction) + ' <strong>Dispensar esta sugestão</strong> preserva os futuros marcos.</p>';
  if ((warnings || []).length) { html += '<p style="color:#9a3412"><strong>ATENÇÃO:</strong> ' + esc(warnings.join(" ")) + '</p>'; lines.push("ATENÇÃO: " + warnings.join(" ")); }
  [["Decidir hoje", manual], ["Aniversariantes de hoje — envio manual", birthdays], ["Envios previstos", automatic], ["Próximos dias", future]].forEach(function (section) {
    html += '<h3>' + esc(section[0]) + ' (' + section[1].length + ')</h3>';
    lines.push(section[0]);
    section[1].forEach(function (item, index) {
      const birthday = isBirthday(item);
      const message = item.sourceKey.indexOf("care:") === 0 ? textoPrevistoCuidado_(item) : item.finalMessage;
      const when = birthday ? "Envio manual por você" : item.programFor ? formatarDataRetomadas_(item.programFor, "dd/MM HH:mm") : item.dueAt ? formatarDataRetomadas_(item.dueAt, "dd/MM HH:mm") : "Revisar";
      lines.push(item.name + " — " + item.nextAction + " — " + when + " — " + item.owner, item.context || "", message || "SEM SUGESTÃO PRONTA");
      html += '<div style="border-top:1px solid #dde5df;padding:10px 0"><strong>' + esc(item.name) + '</strong> · ' + esc(when) + '<br>' + esc(item.nextAction) + '<br><small>' + esc(item.owner) + '</small>';
      if (birthday || (section[0] === "Decidir hoje" && index < 6)) html += '<p style="margin:7px 0">' + esc(item.context) + '</p><blockquote style="margin:8px 0;padding:10px;background:#f3f6f3">' + esc(message || "SEM SUGESTÃO PRONTA") + '</blockquote>';
      html += '</div>';
    });
  });
  html += '<p>Todos os ' + items.length + ' itens estão listados. Todos os aniversários e as primeiras seis decisões trazem o texto aqui; os demais textos completos estão no painel.</p><p><a href="' + esc(centralUrl) + '">Abrir Central de Atendimento</a></p></div>';
  return { html: html, text: lines.join("\n\n"), manual: manualCount, automatic: automatic.length, future: future.length, represented: items.length };
}

function ativarCuidadosProgramados() {
  const props = PropertiesService.getScriptProperties();
  const health = consultarSaudeEndpointRetomadasAutomaticas_(props, props.getProperty(RETOMADAS_CONFIG.propriedadeSegredo));
  if (!health || health.careEnabled !== true || !health.patientSideEffectsAllowed) throw new Error("care_endpoint_not_ready");
  prepararEstruturaCuidadosProgramados();
  props.setProperty(CUIDADOS_PROGRAMADOS.enabled, "true");
  instalarGatilhoRetomadasAutomaticas_();
  return { ok: true, birthdayActive: false };
}

// Retained for old operator links. A legacy flag/template cannot restore sending.
function ativarAniversariosAutomaticos() {
  return { ok: false, active: false, reason: "birthday_manual_only" };
}

function registrarAniversarioContatado_(spreadsheet, phone, now) {
  const sheet = spreadsheet.getSheetByName(RETOMADAS_CONFIG.planilhaConsultas);
  const rows = sheet.getDataRange().getValues();
  const cols = mapearCabecalhosAgendaCuidados_(rows[0]);
  const index = cols[normalizarCabecalhoAgendaCuidados_("Último aniversário contatado")];
  if (index === undefined) return;
  rows.slice(1).forEach(function (row, i) {
    if (normalizarTelefoneRetomadas_(valorAgendaCuidados_(row, cols, ["telefone e 164"])) === phone) sheet.getRange(i + 2, index + 1).setValue(now);
  });
}

function desativarCuidadosProgramados() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CUIDADOS_PROGRAMADOS.enabled, "false");
  props.setProperty(CUIDADOS_PROGRAMADOS.birthdays, "false");
  return { ok: true, active: false };
}

function reconciliarRecibosCuidadosProgramados() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, error: "busy_retry" };
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const props = PropertiesService.getScriptProperties();
    const now = new Date();
    const states = carregarDecisoesCuidados_(spreadsheet);
    let reconciled = 0;
    Object.keys(states).forEach(function (key) {
      const row = states[key].row;
      if (!["Incerto", "Reconciliar", "Enviando"].includes(row[1])) return;
      // The endpoint's statusOnly branch can only read an existing receipt.
      const receipt = enviarRetomadaAutomatica_({ purpose: "patient_care", planId: key, statusOnly: true }, props.getProperty(RETOMADAS_CONFIG.propriedadeSegredo), props);
      if (!receipt.ok || !receipt.sent) return;
      row[18] = receipt.effectiveBody || row[18] || row[9];
      const sentAt = row[16] || row[15] || now;
      const recorded = registrarMensagemCuidado_(spreadsheet, row, sentAt);
      if (!recorded || !recorded.ok) return;
      if (row[7] === "birthday") registrarAniversarioContatado_(spreadsheet, row[3], sentAt);
      row[1] = "Enviado"; row[16] = sentAt; row[17] = "";
      gravarDecisaoCuidado_(spreadsheet, row); reconciled += 1;
    });
    return { ok: true, reconciled: reconciled, patientMessagesSent: 0 };
  } finally { lock.releaseLock(); }
}
