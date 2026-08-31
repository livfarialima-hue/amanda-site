const CENTRAL_ATENDIMENTO_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Central de Atendimento",
  consultationsSheetName: "Consultas",
  messagesSheetName: "_WHATSAPP_MENSAGENS",
  leadsSheetName: "Google Ads - Conversões",
  commitmentsSheetName: "_WHATSAPP_COMPROMISSOS",
  followUpsSheetName: "_WHATSAPP_RETOMADAS",
  reviewSheetName: "Revisões do Bot",
  triggerFunction: "atualizarCentralAtendimento",
  timezone: "America/Sao_Paulo",
  activeConversationDays: 14,
  pendingResponseHours: 36,
  completedVisibilityHours: 24,
  whatsappWindowMinutes: 1430,
  maximumRows: 300,
  followUpColumns: 17,
  layoutVersion: "central-liv-v5",
});

const CENTRAL_ATENDIMENTO_HEADERS = Object.freeze([
  "Fila",
  "Prioridade",
  "Agir até",
  "Paciente",
  "Abrir WhatsApp",
  "Próxima ação",
  "Mensagem final",
  "Programar para",
  "Aprovar com a Bruna",
  "Cancelar retomada",
  "Elegibilidade da Bruna",
  "Resposta sugerida",
  "Contexto",
  "Responsável",
  "Status operacional",
  "Adiar até",
  "Observação da equipe",
  "Última interação",
  "Relacionamento",
  "Origem",
  "Modo",
  "Última ação da equipe",
  "Atualizado em",
  "Fonte",
  "Chave operacional",
  "Telefone",
]);

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Central LIV")
    .addItem(
      "Atualizar Central de Atendimento",
      "atualizarCentralAtendimento",
    )
    .addItem(
      "Diagnosticar Central",
      "diagnosticarCentralAtendimento",
    )
    .addItem(
      "Como usar a Central",
      "comoUsarCentralAtendimento",
    )
    .addSeparator()
    .addItem(
      "Processar decisões marcadas",
      "processarDecisoesMarcadasCentral",
    )
    .addToUi();
}

function comoUsarCentralAtendimento() {
  SpreadsheetApp.getUi().alert(
    "Como usar a Central",
    [
      "1. Comece pelas linhas críticas ou de alta prioridade e abra a conversa pelo link do WhatsApp.",
      "2. Agir até é o limite para a equipe revisar ou resolver a linha. Essa coluna não programa mensagem.",
      "3. Se a paciente disse que vai pensar, conversar ou retornar, mantenha como Aguardando paciente. Adiar até apenas faz a linha voltar para revisão humana depois; também não envia mensagem.",
      "4. Para transformar um Aguardando paciente em retomada automática, escolha Programar retomada com a Bruna em Status operacional, escreva Mensagem final e preencha Programar para.",
      "5. Confira a elegibilidade e marque Aprovar com a Bruna. A Central sugere automaticamente a próxima faixa de maior resposta em Programar para; você pode ajustar o horário antes de usar Central LIV > Processar decisões marcadas.",
      "6. Para impedir somente uma retomada já registrada, marque Cancelar retomada. A próxima atualização automática processará a decisão; para aplicar na hora, use Central LIV > Processar decisões marcadas.",
      "7. A Bruna revalida conversa, procedimento, janela do WhatsApp, opt-out, takeover humano e segurança antes de qualquer envio.",
      "8. Depois do envio ou cancelamento, a Central se reorganiza automaticamente. Essas linhas descem para Concluído recentemente ou Cancelado recentemente e saem da visualização após 24 horas.",
    ].join("\n\n"),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function prepararCentralAtendimento() {
  const spreadsheet = SpreadsheetApp.openById(
    CENTRAL_ATENDIMENTO_CONFIG.spreadsheetId,
  );
  obterOuCriarPlanilhaCentral_(spreadsheet);

  return atualizarCentralAtendimentoInterno_(
    spreadsheet,
    new Date(),
  );
}

function ativarCentralAtendimento() {
  removerGatilhosCentralAtendimento_(
    CENTRAL_ATENDIMENTO_CONFIG.triggerFunction,
  );

  ScriptApp.newTrigger(
    CENTRAL_ATENDIMENTO_CONFIG.triggerFunction,
  )
    .timeBased()
    .everyMinutes(15)
    .create();

  const result = prepararCentralAtendimento();
  return {
    ...result,
    active: true,
    triggerInstalled: existeGatilhoCentralAtendimento_(
      CENTRAL_ATENDIMENTO_CONFIG.triggerFunction,
    ),
  };
}

function desativarCentralAtendimento() {
  removerGatilhosCentralAtendimento_(
    CENTRAL_ATENDIMENTO_CONFIG.triggerFunction,
  );
  return { ok: true, active: false };
}

function atualizarCentralAtendimento() {
  const spreadsheet = SpreadsheetApp.openById(
    CENTRAL_ATENDIMENTO_CONFIG.spreadsheetId,
  );
  return atualizarCentralAtendimentoInterno_(
    spreadsheet,
    new Date(),
  );
}

function diagnosticarCentralAtendimento() {
  const spreadsheet = SpreadsheetApp.openById(
    CENTRAL_ATENDIMENTO_CONFIG.spreadsheetId,
  );
  const result = atualizarCentralAtendimentoInterno_(
    spreadsheet,
    new Date(),
  );
  console.log(JSON.stringify(result));
  return result;
}

function atualizarCentralAtendimentoInterno_(
  spreadsheet,
  now,
) {
  const scheduleMaintenance =
    typeof expirarHorariosPassadosInterno_ === "function"
      ? expirarHorariosPassadosInterno_(spreadsheet, now, {
          apply: true,
        })
      : null;
  const sheet = obterOuCriarPlanilhaCentral_(spreadsheet);
  const automaticCancellations =
    processarCancelamentosPendentesNaAtualizacaoCentral_(
      spreadsheet,
      sheet,
      now,
    );
  const controls = carregarControlesCentral_(sheet);
  const consultationSheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.consultationsSheetName,
  );
  const messagesSheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.messagesSheetName,
  );
  const leadsSheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.leadsSheetName,
  );
  const profiles = consultationSheet
    ? carregarPerfisConsultasCentral_(consultationSheet, now)
    : {};
  const humanTakeovers =
    carregarAtendimentosHumanosCentral_(spreadsheet);
  const reviewSuggestions =
    carregarSugestoesRevisaoCentral_(spreadsheet);
  const conversations =
    messagesSheet &&
    typeof carregarConversasRetomadas_ === "function"
      ? carregarConversasRetomadas_(messagesSheet)
      : {};
  const leads =
    leadsSheet &&
    typeof carregarLeadsRetomadas_ === "function"
      ? carregarLeadsRetomadas_(leadsSheet)
      : {};
  const externalProfessionalPhones =
    identificarTelefonesProfissionaisExternosCentral_(conversations);
  Object.keys(externalProfessionalPhones).forEach(function (phone) {
    delete conversations[phone];
    delete leads[phone];
    delete profiles[phone];
  });
  const itemsByPatient = {};

  carregarCompromissosCentral_(
    spreadsheet,
    now,
    profiles,
    conversations,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  carregarRespostasPendentesCentral_(
    conversations,
    leads,
    profiles,
    humanTakeovers,
    now,
    reviewSuggestions,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  carregarCuidadosCentral_(
    consultationSheet,
    profiles,
    now,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  carregarRetomadasCentral_(
    spreadsheet,
    conversations,
    leads,
    profiles,
    now,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  carregarConsultasAgendadasCentral_(
    profiles,
    now,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  carregarAguardandoPacienteCentral_(
    conversations,
    leads,
    profiles,
    humanTakeovers,
    now,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  const items = Object.keys(itemsByPatient)
    .map(function (key) {
      return aplicarControleCentral_(
        itemsByPatient[key],
        controls,
        now,
      );
    })
    .filter(Boolean)
    .sort(compararItensCentral_)
    .slice(0, CENTRAL_ATENDIMENTO_CONFIG.maximumRows);

  escreverCentralAtendimento_(sheet, items, now);

  const sla = typeof atualizarResumoSlaOperacionalInterno_ === "function"
    ? atualizarResumoSlaOperacionalInterno_(spreadsheet, {
        periodDays: 7,
        now,
      })
    : null;

  const counts = items.reduce(function (result, item) {
    result[item.queue] = (result[item.queue] || 0) + 1;
    return result;
  }, {});

  return {
    ok: true,
    updatedAt: formatarDataCentral_(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    total: items.length,
    queues: counts,
    sheetName: CENTRAL_ATENDIMENTO_CONFIG.sheetName,
    sla,
    scheduleMaintenance,
    automaticCancellations,
  };
}

function identificarTelefonesProfissionaisExternosCentral_(conversations) {
  const result = {};

  Object.keys(conversations || {}).forEach(function (phone) {
    const text = (conversations[phone] || [])
      .map(function (message) {
        return String(message && message.texto || "");
      })
      .join(" ");
    const normalized = normalizarTextoCentral_(text);
    const namesDoctor = /\bdr\.? henrique(?: lane)? staniak\b/.test(
      normalized,
    );
    const structuredAppointment =
      /\b(?:agendamento confirmado|medico:)\b/.test(normalized) &&
      /\bdata:/.test(normalized) &&
      /\bhorario:/.test(normalized);

    if (namesDoctor && structuredAppointment) {
      result[phone] = true;
    }
  });

  return result;
}

function carregarCompromissosCentral_(
  spreadsheet,
  now,
  profiles,
  conversations,
) {
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.commitmentsSheetName,
  );

  if (!sheet || sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 10)
    .getValues()
    .reduce(function (items, row) {
      if (normalizarTextoCentral_(row[7]) !== "pendente") {
        return items;
      }

      const phone = normalizarTelefoneCentral_(row[1]);
      const dueAt = dataCentralValida_(row[6]);
      const profile = profiles[phone] || {};
      const overdue = dueAt && dueAt.getTime() < now.getTime();
      const eventId = textoCentral_(row[0], 180);
      const sourceMessage = mensagemOrigemCompromissoCentral_(
        conversations && conversations[phone],
        eventId,
        row[5],
      );
      const commercialContact = mensagemComercialNaoPacienteCentral_(
        sourceMessage,
      );
      const summary =
        textoCentral_(row[3], 300) ||
        "Solicitação aguardando retorno da equipe.";

      if (!phone) return items;

      items.push(criarItemCentral_({
        queue: commercialContact
          ? "Revisar exclusão comercial"
          : overdue
            ? "Pendência vencida"
            : "Ação manual hoje",
        dueAt: dueAt || now,
        name: profile.name,
        phone: phone,
        relationship: commercialContact
          ? "Não paciente"
          : profile.relationship,
        origin: commercialContact
          ? "WhatsApp — oferta comercial"
          : profile.origin || textoCentral_(row[9], 80),
        lastInteractionAt: profile.lastHumanAt,
        nextAction: commercialContact
          ? "Selecionar “Encerrar — comercial/não paciente”"
          : textoCentral_(row[2], 100) ||
            "Resolver pendência prometida à paciente",
        owner:
          textoCentral_(row[4], 80) || "Amanda/equipe",
        mode: commercialContact ? "Silêncio" : "Manual",
        suggestion: commercialContact
          ? ""
          : "",
        context: commercialContact
          ? "Oferta comercial detectada. Não responder. Confirme o encerramento para arquivar o contato e cancelar qualquer retomada pendente."
          : summary,
        status: "Aberto",
        source: "Compromisso humano",
        sourceKey: "commitment:" + eventId,
      }));

      return items;
    }, []);
}

function mensagemOrigemCompromissoCentral_(
  conversation,
  eventId,
  createdAtValue,
) {
  const messages = Array.isArray(conversation) ? conversation : [];
  const exact = messages.find(function (message) {
    return String(message && message.messageId || "").trim() === eventId;
  });
  if (exact) return String(exact.texto || "");

  const createdAt = dataCentralValida_(createdAtValue);
  if (!createdAt) return "";
  const minimum = createdAt.getTime() - 20 * 60 * 1000;
  const maximum = createdAt.getTime() + 2 * 60 * 1000;
  const closest = messages.reduce(function (best, message) {
    const messageAt = dataCentralValida_(message && message.dataHora);
    if (
      !messageAt ||
      (message && message.direcao === "OUT") ||
      messageAt.getTime() < minimum ||
      messageAt.getTime() > maximum
    ) {
      return best;
    }
    if (!best || messageAt.getTime() > best.dataHora.getTime()) {
      return {
        dataHora: messageAt,
        texto: String(message && message.texto || ""),
      };
    }
    return best;
  }, null);
  return closest ? closest.texto : "";
}

function carregarRespostasPendentesCentral_(
  conversations,
  leads,
  profiles,
  humanTakeovers,
  now,
  reviewSuggestions,
) {
  reviewSuggestions = reviewSuggestions || {};
  const minimumDate = new Date(
    now.getTime() -
      CENTRAL_ATENDIMENTO_CONFIG.activeConversationDays *
        24 *
        60 *
        60 *
        1000,
  );
  const pendingResponseDate = new Date(
    now.getTime() -
      CENTRAL_ATENDIMENTO_CONFIG.pendingResponseHours *
        60 *
        60 *
        1000,
  );

  return Object.keys(conversations).reduce(function (
    items,
    phone,
  ) {
    const conversation = conversations[phone] || [];
    const last = conversation[conversation.length - 1];
    const lastHuman = humanTakeovers[phone];

    if (
      !last ||
      last.direcao !== "IN" ||
      last.dataHora.getTime() < minimumDate.getTime() ||
      last.dataHora.getTime() < pendingResponseDate.getTime() ||
      !mensagemExigeRespostaCentral_(last.texto) ||
      (
        lastHuman &&
        lastHuman.dataHora.getTime() >=
          last.dataHora.getTime()
      )
    ) {
      return items;
    }

    const profile = profiles[phone] || {};
    const lead = leads[phone] || {};
    const relationship =
      profile.relationship ||
      relacionamentoLeadCentral_(lead.status);

    items.push(criarItemCentral_({
      queue: "Resposta agora",
      dueAt: prazoRespostaCentral_(last.dataHora),
      name: profile.name || lead.nome,
      phone: phone,
      relationship: relationship,
      origin:
        profile.origin ||
        lead.plataforma ||
        lead.origemEvento ||
        "",
      lastInteractionAt: last.dataHora,
      nextAction: proximaAcaoRespostaCentral_(last.texto),
      owner: relacionamentoExigeHumanoCentral_(relationship)
        ? "Amanda/equipe"
        : "Equipe",
      mode: "Manual",
      suggestion:
        selecionarSugestaoRevisaoCentral_(
          reviewSuggestions,
          phone,
          last.texto,
          last.dataHora,
        ) ||
        sugerirRespostaCentral_(
          last.texto,
          profile.name,
          relationship,
        ),
      context: textoCentral_(last.texto, 420),
      status: "Aberto",
      source: "WhatsApp — mensagem recebida",
      sourceKey:
        "conversation:" +
        textoCentral_(last.messageId, 220),
    }));

    return items;
  }, []);
}

function carregarSugestoesRevisaoCentral_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.reviewSheetName,
  );
  if (!sheet || sheet.getLastRow() < 2) return {};

  const rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 13)
    .getValues();
  const suggestions = {};

  rows.forEach(function (row) {
    const type = normalizarTextoCentral_(row[0]);
    const status = normalizarTextoCentral_(row[8]);
    const phone = normalizarTelefoneCentral_(row[4]);
    const suggestion = textoCentral_(row[6], 1200);
    const at = dataCentralValida_(row[2]) ||
      dataCentralValida_(row[12]);
    if (
      type !== "resposta" ||
      !["aberta", "aguardando aprovacao"].includes(status) ||
      !phone ||
      !suggestion ||
      !at
    ) {
      return;
    }

    if (!suggestions[phone]) suggestions[phone] = [];
    suggestions[phone].push({
      at: at,
      context: textoCentral_(row[5], 1600),
      suggestion: suggestion,
    });
  });

  Object.keys(suggestions).forEach(function (phone) {
    suggestions[phone].sort(function (left, right) {
      return right.at.getTime() - left.at.getTime();
    });
  });
  return suggestions;
}

function selecionarSugestaoRevisaoCentral_(
  reviewSuggestions,
  phone,
  message,
  messageAt,
) {
  const candidates = reviewSuggestions[
    normalizarTelefoneCentral_(phone)
  ] || [];
  const normalizedMessage = normalizarTextoCentral_(message);
  const receivedAt = dataCentralValida_(messageAt);
  if (!normalizedMessage || !receivedAt) return "";

  const minimumDraftAt = receivedAt.getTime() - 5 * 60 * 1000;
  const match = candidates.find(function (candidate) {
    return candidate.at.getTime() >= minimumDraftAt &&
      normalizarTextoCentral_(candidate.context).includes(
        normalizedMessage,
      );
  });
  return match ? match.suggestion : "";
}

function carregarCuidadosCentral_(
  consultationSheet,
  profiles,
  now,
) {
  if (
    !consultationSheet ||
    typeof criarAgendaCuidadosConsultas_ !== "function"
  ) {
    return [];
  }

  return criarAgendaCuidadosConsultas_(
    consultationSheet,
    now,
  ).map(function (care) {
    const phone = normalizarTelefoneCentral_(care.telefone);
    const profile = profiles[phone] || {};
    const dueAt = combinarDataHorarioCentral_(
      care.dataReferencia,
      care.horario,
    );
    const queue = care.futuro
      ? "Consultas e cuidados"
      : care.automatico
        ? "Automático hoje"
        : "Ação manual hoje";

    return criarItemCentral_({
      queue: queue,
      dueAt: dueAt,
      name: care.nome || profile.name,
      phone: phone,
      relationship: profile.relationship,
      origin: profile.origin,
      lastInteractionAt: profile.lastHumanAt,
      nextAction: care.categoria,
      owner: care.responsavel || (
        care.automatico ? "Bruna/bot" : "Equipe"
      ),
      mode: care.automatico ? "Automático" : "Manual",
      suggestion: care.sugestao,
      context: care.contexto,
      status: care.futuro ? "Programado" : "Aberto",
      source: "Jornada de cuidado",
      sourceKey: [
        "care",
        care.categoria,
        phone || care.nome,
        care.dataReferencia || "",
      ].join(":"),
    });
  });
}

function carregarRetomadasCentral_(
  spreadsheet,
  conversations,
  leads,
  profiles,
  now,
) {
  const logged = carregarRetomadasRegistradasCentral_(
    spreadsheet,
    profiles,
    now,
    conversations,
  );

  if (
    typeof criarCandidatoRetomada_ !== "function" ||
    typeof atribuirHorariosRetomadas_ !== "function"
  ) {
    return logged;
  }

  const localDate = formatarDataCentral_(now, "yyyy-MM-dd");
  const candidates = [];
  const activeLoggedPhones = new Set(
    logged
      .filter(function (item) {
        return normalizarTextoCentral_(item.status) === "programado";
      })
      .map(function (item) {
        return normalizarTelefoneCentral_(item.phone);
      })
      .filter(Boolean),
  );
  const pendingCommitmentPhones =
    telefonesComCompromissoPendenteCentral_(spreadsheet);

  Object.keys(conversations).forEach(function (phone) {
    const lead = leads[phone];

    if (
      !lead ||
      lead.neverFollowUp ||
      activeLoggedPhones.has(phone) ||
      pendingCommitmentPhones.has(phone) ||
      (
        typeof statusRetomadaEncerrado_ === "function" &&
        statusRetomadaEncerrado_(lead.status)
      )
    ) {
      return;
    }

    const candidate = criarCandidatoRetomada_(
      phone,
      lead,
      conversations[phone],
      now,
      localDate,
    );

    if (candidate) candidates.push(candidate);
  });

  candidates.sort(function (left, right) {
    if (left.prioritario !== right.prioritario) {
      return left.prioritario ? -1 : 1;
    }
    return left.ultimoContato.getTime() -
      right.ultimoContato.getTime();
  });
  atribuirHorariosRetomadas_(candidates, now);

  const generated = candidates
    .filter(function (candidate) {
      return Boolean(candidate.horario);
    })
    .filter(function (candidate) {
      const profile = profiles[candidate.telefone] || {};
      const relationship =
        profile.relationship ||
        relacionamentoLeadCentral_(
          candidate.lead.status,
        );

      return relacionamentoPermiteRetomadaMarketingCentral_(
        relationship,
      );
    })
    .slice(0, 50)
    .map(function (candidate) {
      const profile = profiles[candidate.telefone] || {};
      return criarItemCentral_({
        queue: "Ação manual hoje",
        dueAt: combinarDataHorarioCentral_(
          localDate,
          candidate.horario,
        ),
        name:
          profile.name ||
          (candidate.lead && candidate.lead.nome),
        phone: candidate.telefone,
        relationship:
          profile.relationship ||
          relacionamentoLeadCentral_(
            candidate.lead.status,
          ),
        origin:
          profile.origin ||
          candidate.lead.plataforma ||
          candidate.lead.origemEvento,
        lastInteractionAt: candidate.ultimoContato,
        nextAction: candidate.etapa.rotulo,
        owner: "Equipe",
        mode: "Manual",
        suggestion: candidate.sugestao,
        context:
          candidate.lead.resumo ||
          candidate.lead.proximaAcao,
        status: "Programado",
        approvalBrunaEligible: false,
        cancelFollowUpEligible: false,
        brunaEligibilityReason:
          "Plano ainda não registrado na fila diária",
        source: "Retomada de marketing",
        sourceKey:
          "followup:" + candidate.chaveDiaria,
      });
    });

  return logged.concat(generated);
}

function telefonesComCompromissoPendenteCentral_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.commitmentsSheetName,
  );
  const phones = new Set();
  if (!sheet || sheet.getLastRow() < 2) return phones;

  sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 8)
    .getValues()
    .forEach(function (row) {
      if (normalizarTextoCentral_(row[7]) !== "pendente") return;
      const phone = normalizarTelefoneCentral_(row[1]);
      if (phone) phones.add(phone);
    });
  return phones;
}

function carregarRetomadasRegistradasCentral_(
  spreadsheet,
  profiles,
  now,
  conversations,
) {
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.followUpsSheetName,
  );

  if (!sheet || sheet.getLastRow() < 2) return [];

  const today = formatarDataCentral_(now, "yyyy-MM-dd");
  const maximumActiveDays =
    typeof RETOMADAS_CONFIG !== "undefined"
      ? Number(RETOMADAS_CONFIG.maximoDiasSemResposta || 10)
      : 10;
  const activeSince = new Date(
    now.getTime() - maximumActiveDays * 24 * 60 * 60 * 1000,
  );
  const scheduledSince = new Date(
    now.getTime() - 4 * 60 * 60 * 1000,
  );
  return sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      CENTRAL_ATENDIMENTO_CONFIG.followUpColumns,
    )
    .getValues()
    .reduce(function (items, row) {
      const recordDate = dataCentralValida_(row[1]);
      if (!recordDate) return items;

      const phone = normalizarTelefoneCentral_(row[2]);
      const profile = profiles[phone] || {};
      const conversation =
        (conversations && conversations[phone]) || [];
      const lastConversationMessage =
        conversation[conversation.length - 1] || null;
      const lastConversationAt = dataCentralValida_(
        lastConversationMessage && lastConversationMessage.dataHora,
      );
      const relationship =
        profile.relationship ||
        relacionamentoLeadCentral_(row[6]);

      if (
        !relacionamentoPermiteRetomadaMarketingCentral_(
          relationship,
        )
      ) {
        return items;
      }

      const planMode = textoCentral_(row[9], 80);
      const sendStatus = textoCentral_(row[10], 120);
      const failureError = textoCentral_(row[14], 260);
      const normalizedMode = normalizarTextoCentral_(planMode);
      const normalizedStatus = normalizarTextoCentral_(sendStatus);
      const automaticPlan = normalizedMode.indexOf("automatico") === 0;
      const failureReview = statusFalhaRevisarCentral_(normalizedStatus);
      const terminalSemanticFailure =
        failureReview && falhaSemanticaTerminalCentral_(failureError);
      const retryableSemanticFailure =
        failureReview && falhaSemanticaReaprovavelCentral_(failureError);
      const automatic = automaticPlan && !failureReview;
      const sent = normalizedStatus === "enviada";
      const cancelled =
        normalizedStatus.indexOf("cancelada") === 0 ||
        terminalSemanticFailure;
      const active = [
        "programada",
        "acao manual",
        "suspensa na planilha",
      ].includes(normalizedStatus) ||
        (failureReview && !terminalSemanticFailure);
      const scheduledAt = dataCentralValida_(row[11]);
      const lastAttemptAt = dataCentralValida_(row[12]);
      const sentAt = dataCentralValida_(row[13]);
      const terminalAt = sent
        ? sentAt || lastAttemptAt || scheduledAt || recordDate
        : cancelled
          ? lastAttemptAt || scheduledAt || recordDate
          : null;
      const recordDay = formatarDataCentral_(
        recordDate,
        "yyyy-MM-dd",
      );

      const stillOperationallyRelevant =
        active &&
        (
          recordDate.getTime() >= activeSince.getTime() ||
          (
            scheduledAt &&
            scheduledAt.getTime() >= scheduledSince.getTime()
          )
        );
      const terminalRecently =
        Boolean(terminalAt) &&
        now.getTime() - terminalAt.getTime() <=
          CENTRAL_ATENDIMENTO_CONFIG.completedVisibilityHours *
            60 *
            60 *
            1000;

      if (
        recordDay !== today &&
        !stillOperationallyRelevant &&
        !terminalRecently
      ) {
        return items;
      }

      const rawSuggestion = textoCentral_(row[8], 900);
      const suggestion = rawSuggestion || "SEM SUGESTÃO PRONTA";
      const baseApprovalEligible =
        (
          (
            normalizedMode === "manual" &&
            normalizedStatus === "acao manual"
          ) ||
          retryableSemanticFailure
        ) &&
        Boolean(rawSuggestion);
      const nextSafeApprovalWindow =
        baseApprovalEligible && lastConversationAt
          ? sugerirProximaJanelaRespostaCentral_(
              now,
              lastConversationAt,
              { allowOutsideWhatsappWindow: true },
            )
          : null;
      const approvalEligible =
        baseApprovalEligible && Boolean(nextSafeApprovalWindow);
      const cancellationEligible = [
        "programada",
        "acao manual",
        "suspensa na planilha",
      ].includes(normalizedStatus) ||
        (failureReview && !terminalSemanticFailure);
      const terminalQueue = sent
        ? "Concluído recentemente"
        : cancelled
          ? "Cancelado recentemente"
          : "";

      items.push(criarItemCentral_({
        queue:
          terminalQueue ||
          (
            failureReview
              ? "Ação manual hoje"
              : automatic
                ? "Automático hoje"
                : "Ação manual hoje"
          ),
        dueAt: terminalQueue
          ? null
          : approvalEligible
            ? nextSafeApprovalWindow
            : scheduledAt ||
            combinarDataHorarioCentral_(recordDay, row[5]),
        programFor:
          approvalEligible
            ? nextSafeApprovalWindow
            : scheduledAt ||
              combinarDataHorarioCentral_(recordDay, row[5]),
        name: profile.name,
        phone: phone,
        relationship: relationship,
        origin: profile.origin,
        lastInteractionAt: sent
          ? terminalAt
          : lastConversationAt,
        lastTeamActionAt: terminalAt,
        nextAction: sent
          ? "Retomada enviada; aguardar resposta"
          : cancelled
            ? terminalSemanticFailure
              ? "Retomada cancelada após a revisão do contexto"
              : "Retomada cancelada; nenhuma mensagem será enviada"
            : failureReview
              ? "Revisar a mensagem e decidir se a retomada ainda faz sentido"
              : textoCentral_(row[4], 60) + "ª retomada",
        owner: automatic ? "Bruna/bot" : "Equipe",
        mode: automatic ? "Automático" : "Manual",
        suggestion: suggestion,
        context: [
          textoCentral_(row[7], 420),
          failureReview
            ? "Falha anterior: " + rotuloFalhaRetomadaCentral_(failureError)
            : "",
        ].filter(Boolean).join(" "),
        status: sent
          ? "Concluído"
          : cancelled
            ? "Cancelado"
            : failureReview
              ? "Falha — revisar"
              : "Programado",
        approvalBrunaEligible: approvalEligible,
        cancelFollowUpEligible: cancellationEligible,
        brunaEligibilityReason: motivoElegibilidadeBrunaCentral_({
          automatic: automatic,
          suggestion: rawSuggestion,
          normalizedStatus: normalizedStatus,
          baseApprovalEligible: baseApprovalEligible,
          lastInteractionAt: lastConversationAt,
          nextSafeApprovalWindow: nextSafeApprovalWindow,
          approvalEligible: approvalEligible,
          failureReview: failureReview,
          failureError: failureError,
          retryableSemanticFailure: retryableSemanticFailure,
        }),
        source: "Retomada de marketing",
        sourceKey:
          "followup:" + textoCentral_(row[0], 260),
      }));
      return items;
    }, []);
}

function motivoElegibilidadeBrunaCentral_(input) {
  const data = input || {};
  if (data.approvalEligible === true) {
    const ultimaInteracao = dataCentralValida_(
      data.lastInteractionAt,
    );
    const proximaJanela = dataCentralValida_(
      data.nextSafeApprovalWindow,
    );
    if (
      ultimaInteracao &&
      proximaJanela &&
      proximaJanela.getTime() - ultimaInteracao.getTime() >
        CENTRAL_ATENDIMENTO_CONFIG.whatsappWindowMinutes *
          60 *
          1000
    ) {
      return "Elegível para aprovação manual — envio por modelo do WhatsApp";
    }
    return "Elegível para aprovação";
  }
  if (data.automatic === true) {
    return "Já programada com a Bruna";
  }
  if (
    data.failureReview === true &&
    data.retryableSemanticFailure !== true
  ) {
    return (
      "Falha exige revisão humana — " +
      rotuloFalhaRetomadaCentral_(data.failureError)
    );
  }
  if (!String(data.suggestion || "").trim()) {
    return "Sem mensagem segura preenchida";
  }

  if (data.baseApprovalEligible === true) {
    if (!dataCentralValida_(data.lastInteractionAt)) {
      return "Sem interação recente segura para programação";
    }
    if (!dataCentralValida_(data.nextSafeApprovalWindow)) {
      return "Fora da janela atual do WhatsApp — ação humana necessária";
    }
  }

  const status = String(data.normalizedStatus || "").trim();
  if (status.indexOf("cancelada") === 0) {
    return "Retomada cancelada";
  }
  if (status === "enviada") {
    return "Mensagem já enviada";
  }
  if (status === "suspensa na planilha") {
    return "Automação suspensa na planilha";
  }
  return "Estado atual exige atendimento humano";
}

function statusFalhaRevisarCentral_(value) {
  return normalizarTextoCentral_(value)
    .replace(/[—–/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() === "falha revisar";
}

function codigoFalhaRetomadaCentral_(error) {
  const parts = String(error || "").trim().split(":");
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function falhaSemanticaTerminalCentral_(error) {
  if (
    String(error || "").indexOf(
      "semantic_context_review_required:",
    ) !== 0
  ) {
    return false;
  }

  return [
    "conversation_changed",
    "patient_paused",
    "patient_closed",
    "human_commitment_pending",
    "sensitive_or_clinical_context",
  ].includes(codigoFalhaRetomadaCentral_(error));
}

function falhaSemanticaReaprovavelCentral_(error) {
  if (
    String(error || "").indexOf(
      "semantic_context_review_required:",
    ) !== 0
  ) {
    return false;
  }

  return [
    "procedure_mismatch",
    "message_redundant",
    "insufficient_context",
  ].includes(codigoFalhaRetomadaCentral_(error));
}

function rotuloFalhaRetomadaCentral_(error) {
  const labels = {
    conversation_changed: "a conversa mudou",
    patient_paused: "a paciente pediu para aguardar",
    patient_closed: "a paciente encerrou a conversa",
    procedure_mismatch: "o texto não confere com o procedimento ou assunto",
    human_commitment_pending: "há uma promessa pendente da equipe",
    sensitive_or_clinical_context: "o contexto exige revisão humana",
    message_redundant: "a mensagem ficou redundante",
    insufficient_context: "faltou contexto seguro",
    timeout: "a revisão semântica não respondeu a tempo",
    configuration_missing: "a revisão semântica está indisponível",
  };
  const code = codigoFalhaRetomadaCentral_(error);
  return labels[code] || textoCentral_(error, 180) || "envio não concluído";
}

function statusProgramavelRetomadaCentral_(value) {
  const status = normalizarTextoCentral_(value)
    .replace(/[—–/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ["programado", "falha revisar"].includes(status);
}

function carregarConsultasAgendadasCentral_(profiles, now) {
  const limit = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  return Object.keys(profiles).reduce(function (items, phone) {
    const profile = profiles[phone];

    if (
      profile.relationship !== "appointment_scheduled" ||
      !profile.scheduledAt ||
      profile.scheduledAt.getTime() < now.getTime() ||
      profile.scheduledAt.getTime() > limit.getTime()
    ) {
      return items;
    }

    items.push(criarItemCentral_({
      queue: "Consultas e cuidados",
      dueAt: profile.scheduledAt,
      name: profile.name,
      phone: phone,
      relationship: profile.relationship,
      origin: profile.origin,
      lastInteractionAt: profile.lastHumanAt,
      nextAction: "Acompanhar consulta agendada",
      owner: "Bruna/bot",
      mode: "Automático",
      suggestion:
        "Lembretes serão conduzidos pela rotina de consultas, respeitando confirmação e horário adequado.",
      context: [
        profile.professional,
        profile.topic,
        profile.status,
      ].filter(Boolean).join(" — "),
      status: "Programado",
      source: "Consulta agendada",
      sourceKey:
        "appointment:" + textoCentral_(profile.id, 180),
    }));
    return items;
  }, []);
}

function carregarAguardandoPacienteCentral_(
  conversations,
  leads,
  profiles,
  humanTakeovers,
  now,
) {
  const minimumDate = new Date(
    now.getTime() -
      CENTRAL_ATENDIMENTO_CONFIG.activeConversationDays *
        24 *
        60 *
        60 *
        1000,
  );

  return Object.keys(conversations).reduce(function (
    items,
    phone,
  ) {
    const conversation = conversations[phone] || [];
    let last = conversation[conversation.length - 1];
    const lastHuman = humanTakeovers[phone];

    if (
      lastHuman &&
      (
        !last ||
        lastHuman.dataHora.getTime() >
          last.dataHora.getTime()
      )
    ) {
      last = {
        direcao: "OUT",
        dataHora: lastHuman.dataHora,
        messageId: lastHuman.messageId,
        texto: lastHuman.texto,
      };
    }

    const waitForPatient =
      Boolean(last) &&
      (
        mensagemIndicaPausaPacienteCentral_(last.texto) ||
        (
          typeof retornoFuturoRecente_ === "function" &&
          retornoFuturoRecente_(conversation, now)
        )
      );

    if (
      !last ||
      (
        last.direcao !== "OUT" &&
        !(last.direcao === "IN" && waitForPatient)
      ) ||
      last.dataHora.getTime() < minimumDate.getTime()
    ) {
      return items;
    }

    const profile = profiles[phone] || {};
    const lead = leads[phone] || {};

    items.push(criarItemCentral_({
      queue: "Aguardando paciente",
      dueAt: null,
      name: profile.name || lead.nome,
      phone: phone,
      relationship:
        profile.relationship ||
        relacionamentoLeadCentral_(lead.status),
      origin:
        profile.origin ||
        lead.plataforma ||
        lead.origemEvento,
      lastInteractionAt: last.dataHora,
      nextAction: waitForPatient
        ? "Aguardar iniciativa da paciente"
        : "Aguardar resposta; não retomar antes da regra aplicável",
      owner: "Bruna/bot",
      mode: "Silêncio",
      suggestion: "",
      context: textoCentral_(last.texto, 420),
      status: waitForPatient
        ? "Suspenso"
        : "Aguardando paciente",
      source: "WhatsApp — aguardando retorno",
      sourceKey:
        "conversation:" +
        textoCentral_(last.messageId, 220),
    }));
    return items;
  }, []);
}

function carregarAtendimentosHumanosCentral_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(
    typeof CONFIG !== "undefined"
      ? CONFIG.humanTakeoverSheetName
      : "_WHATSAPP_ATENDIMENTO_HUMANO",
  );
  const result = {};

  if (!sheet || sheet.getLastRow() < 2) return result;

  sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 6)
    .getValues()
    .forEach(function (row) {
      const phone = normalizarTelefoneCentral_(row[2]);
      const date = dataCentralValida_(row[3]);
      if (!phone || !date) return;

      if (
        !result[phone] ||
        date.getTime() >= result[phone].dataHora.getTime()
      ) {
        result[phone] = {
          messageId: textoCentral_(row[1] || row[0], 220),
          dataHora: date,
          texto: textoCentral_(row[5], 500),
        };
      }
    });

  return result;
}

function carregarPerfisConsultasCentral_(sheet, now) {
  if (!sheet || sheet.getLastRow() < 2) return {};

  const values = sheet.getDataRange().getValues();
  const columns = mapearCabecalhosCentral_(values[0]);
  const result = {};

  values.slice(1).forEach(function (row, index) {
    const phone = normalizarTelefoneCentral_(
      valorLinhaCentral_(row, columns, "telefone e 164"),
    );

    if (!phone) return;

    const completedAt = dataCentralValida_(
      valorLinhaCentral_(row, columns, "data realizada"),
    );
    const scheduledAt = combinarDataHorarioCentral_(
      valorLinhaCentral_(row, columns, "data agendada"),
      valorLinhaCentral_(row, columns, "horario agendado"),
    );
    const lastHumanAt = dataCentralValida_(
      valorLinhaCentral_(
        row,
        columns,
        "ultima interacao humana",
      ),
    );
    const timestamp = Math.max(
      completedAt ? completedAt.getTime() : 0,
      scheduledAt ? scheduledAt.getTime() : 0,
      lastHumanAt ? lastHumanAt.getTime() : 0,
      index + 1,
    );
    const status = normalizarTextoCentral_(
      valorLinhaCentral_(row, columns, "status"),
    );
    const nextAction = textoCentral_(
      valorLinhaCentral_(row, columns, "proxima acao"),
      260,
    );
    const relationship =
      typeof classificarEstadoRelacionamentoPaciente_ === "function"
        ? classificarEstadoRelacionamentoPaciente_({
          status: status,
          context: [status, nextAction].join(" "),
          completedAt: completedAt,
          scheduledAt: scheduledAt,
          now: now,
        })
        : relacionamentoConsultaCentral_(
          status,
          completedAt,
          now,
        );
    const profile = {
      id: textoCentral_(
        valorLinhaCentral_(row, columns, "id da consulta"),
        180,
      ),
      phone: phone,
      name: textoCentral_(
        valorLinhaCentral_(row, columns, "nome do paciente"),
        140,
      ),
      professional: textoCentral_(
        valorLinhaCentral_(row, columns, "profissional"),
        100,
      ),
      topic: textoCentral_(
        valorLinhaCentral_(
          row,
          columns,
          "tema procedimento",
        ),
        160,
      ),
      status: status,
      nextAction: nextAction,
      origin: textoCentral_(
        valorLinhaCentral_(row, columns, "origem do lead"),
        100,
      ),
      relationship: relationship,
      scheduledAt: scheduledAt,
      completedAt: completedAt,
      lastHumanAt: lastHumanAt,
      timestamp: timestamp,
    };

    if (!result[phone] || timestamp >= result[phone].timestamp) {
      result[phone] = profile;
    }
  });

  return result;
}

function criarItemCentral_(input) {
  const queue = input.queue || "Aguardando paciente";
  const suggestion = textoCentral_(input.suggestion, 900);
  const approvalBrunaEligible =
    input.approvalBrunaEligible === true;
  return {
    queue: queue,
    priority: prioridadeCentralPorFila_(queue),
    dueAt: dataCentralValida_(input.dueAt),
    name: textoCentral_(input.name, 140),
    phone: normalizarTelefoneCentral_(input.phone),
    relationship: input.relationship || "unknown",
    origin: textoCentral_(input.origin, 120),
    lastInteractionAt: dataCentralValida_(
      input.lastInteractionAt,
    ),
    nextAction: textoCentral_(input.nextAction, 260),
    owner: normalizarResponsavelCentral_(input.owner),
    mode: input.mode || "Manual",
    suggestion: suggestion,
    finalMessage: textoCentral_(
      input.finalMessage === undefined
        ? suggestion
        : input.finalMessage,
      900,
    ),
    programFor:
      dataCentralValida_(input.programFor) ||
      (approvalBrunaEligible
        ? dataCentralValida_(input.dueAt)
        : null),
    context: textoCentral_(input.context, 700),
    status: input.status || "Aberto",
    deferUntil: null,
    teamNote: "",
    lastTeamActionAt: dataCentralValida_(
      input.lastTeamActionAt,
    ),
    updatedAt: new Date(),
    approvalBrunaEligible: approvalBrunaEligible,
    approveBruna: false,
    cancelFollowUpEligible:
      input.cancelFollowUpEligible === true,
    cancelFollowUp: false,
    brunaEligibilityReason: textoCentral_(
      input.brunaEligibilityReason ||
        (input.approvalBrunaEligible === true
          ? "Elegível para aprovação"
          : "Não se aplica"),
      180,
    ),
    source: textoCentral_(input.source, 100),
    sourceKey:
      textoCentral_(input.sourceKey, 300) ||
      [
        input.source || "item",
        input.phone || input.name || "",
        input.nextAction || "",
      ].join(":"),
  };
}

function adicionarItemCentral_(itemsByPatient, item) {
  if (!item) return;

  const key =
    normalizarTelefoneCentral_(item.phone) ||
    normalizarTextoCentral_(item.name);
  if (!key) return;

  const current = itemsByPatient[key];
  if (!current) {
    itemsByPatient[key] = item;
    return;
  }

  const better = compararItensCentral_(item, current) < 0;
  const main = better ? item : current;
  const secondary = better ? current : item;
  const complementary = textoCentral_(
    secondary.nextAction,
    180,
  );
  const secondaryIsTerminal =
    secondary.priority && secondary.priority.rank >= 7;
  const activeFollowUpSupersedesWaiting =
    normalizarTextoCentral_(main.source) ===
      "retomada de marketing" &&
    ["acao manual hoje", "automatico hoje"].includes(
      normalizarTextoCentral_(main.queue),
    ) &&
    normalizarTextoCentral_(secondary.queue) ===
      "aguardando paciente";

  if (
    complementary &&
    !secondaryIsTerminal &&
    !activeFollowUpSupersedesWaiting &&
    normalizarTextoCentral_(main.nextAction) !==
      normalizarTextoCentral_(complementary)
  ) {
    main.context = textoCentral_(
      [
        main.context,
        "Também previsto: " + complementary + ".",
      ].filter(Boolean).join(" "),
      700,
    );
  }

  itemsByPatient[key] = main;
}

function aplicarControleCentral_(item, controls, now) {
  const control = controls[item.sourceKey];

  if (!control) return item;

  const generatedStatus = item.status;

  item.owner = control.owner || item.owner;
  item.teamNote = control.teamNote || "";
  item.lastTeamActionAt =
    control.lastTeamActionAt || item.lastTeamActionAt;
  item.deferUntil = control.deferUntil;
  if (control.finalMessageDefined) {
    item.finalMessage = control.finalMessage;
  }
  if (control.programForDefined) {
    item.programFor = control.programFor;
  }
  item.approveBruna =
    item.approvalBrunaEligible && control.approveBruna === true;
  item.cancelFollowUp =
    item.cancelFollowUpEligible && control.cancelFollowUp === true;

  const sourceStatusIsFinal =
    normalizarTextoCentral_(item.source) ===
      "retomada de marketing" &&
    ["concluido", "cancelado"].includes(
      normalizarTextoCentral_(item.status),
    );
  if (control.status && !sourceStatusIsFinal) {
    item.status = control.status;
  }

  const retomadaManualDeEspera =
    fonteAguardandoPacienteCentral_(item.source) &&
    [
      "programar retomada com a bruna",
      "programado",
    ].includes(normalizarTextoCentral_(item.status));

  if (retomadaManualDeEspera) {
    item.queue = "Ação manual hoje";
    item.priority = prioridadeCentralPorFila_(item.queue);
    item.dueAt = item.programFor || now;
    item.nextAction =
      "Revisar mensagem e horário; depois aprovar com a Bruna";
    item.owner = "Equipe";
    item.mode = "Manual";
    item.status = "Programado";
    item.deferUntil = null;
    item.approvalBrunaEligible = true;
    item.approveBruna = control.approveBruna === true;
    item.cancelFollowUpEligible = false;
    item.cancelFollowUp = false;
    item.brunaEligibilityReason =
      avaliarProgramacaoEsperaCentral_(item, now, {
        allowOutsideWhatsappWindow: true,
      });
  }

  if (item.status === "Aguardando paciente") {
    item.queue = "Aguardando paciente";
    item.priority = prioridadeCentralPorFila_(item.queue);
    item.dueAt = null;
    item.mode = "Silêncio";
    item.approveBruna = false;
  }

  if (
    ["concluido", "cancelado"].includes(
      normalizarTextoCentral_(item.status),
    ) &&
    item.lastTeamActionAt &&
    now.getTime() - item.lastTeamActionAt.getTime() >
      CENTRAL_ATENDIMENTO_CONFIG.completedVisibilityHours *
        60 *
        60 *
        1000
  ) {
    return null;
  }

  if (
    !retomadaManualDeEspera &&
    item.deferUntil &&
    item.deferUntil.getTime() > now.getTime()
  ) {
    item.queue = "Aguardando paciente";
    item.priority = prioridadeCentralPorFila_(item.queue);
    item.dueAt = item.deferUntil;
    item.status = "Suspenso";
    item.mode = "Silêncio";
  } else if (
    !retomadaManualDeEspera &&
    item.deferUntil &&
    normalizarTextoCentral_(control.status) === "suspenso" &&
    !sourceStatusIsFinal
  ) {
    item.status = generatedStatus;
  }

  return item;
}

function avaliarProgramacaoEsperaCentral_(item, now, options) {
  const mensagem = textoCentral_(item && item.finalMessage, 900);
  const programadaPara = dataCentralValida_(item && item.programFor);
  const ultimaInteracao = dataCentralValida_(
    item && item.lastInteractionAt,
  );
  const instante = dataCentralValida_(now) || new Date();
  const allowOutsideWhatsappWindow =
    options && options.allowOutsideWhatsappWindow === true;

  if (!mensagem) return "Preencha Mensagem final";
  if (
    normalizarTextoCentral_(mensagem).indexOf(
      "sem sugestao pronta",
    ) === 0
  ) {
    return "Substitua a mensagem provisória por um texto seguro";
  }
  if (!programadaPara) return "Preencha Programar para";
  if (programadaPara.getTime() <= instante.getTime()) {
    return "Escolha um horário futuro";
  }

  const hora = Number(formatarDataCentral_(programadaPara, "H"));
  if (hora < 9 || hora >= 19) {
    return "Use um horário entre 09:00 e 18:59";
  }
  if (
    !allowOutsideWhatsappWindow &&
    ultimaInteracao &&
    programadaPara.getTime() - ultimaInteracao.getTime() >
      CENTRAL_ATENDIMENTO_CONFIG.whatsappWindowMinutes * 60 * 1000
  ) {
    return "Horário fora da janela atual do WhatsApp";
  }

  return "Elegível após conferência da mensagem e do procedimento";
}

function sugerirProximaJanelaRespostaCentral_(
  now,
  lastInteractionAt,
  options,
) {
  const instant = dataCentralValida_(now) || new Date();
  const lastInteraction = dataCentralValida_(lastInteractionAt);
  const allowOutsideWhatsappWindow =
    options && options.allowOutsideWhatsappWindow === true;
  const earliest = new Date(
    instant.getTime() + 15 * 60 * 1000,
  );
  const deadline = allowOutsideWhatsappWindow
    ? new Date(instant.getTime() + 7 * 24 * 60 * 60 * 1000)
    : lastInteraction
      ? new Date(
          lastInteraction.getTime() +
            CENTRAL_ATENDIMENTO_CONFIG.whatsappWindowMinutes *
              60 *
              1000,
        )
      : new Date(instant.getTime() + 24 * 60 * 60 * 1000);
  const currentDay = formatarDataCentral_(
    instant,
    "yyyy-MM-dd",
  );
  const sameDayPreferences = [
    "17:30",
    "18:15",
    "15:30",
    "10:30",
  ];

  for (let index = 0; index < sameDayPreferences.length; index += 1) {
    const candidate = combinarDataHorarioCentral_(
      currentDay,
      sameDayPreferences[index],
    );
    if (
      candidate &&
      candidate.getTime() >= earliest.getTime() &&
      candidate.getTime() <= deadline.getTime()
    ) {
      return candidate;
    }
  }

  const quarterHour = 15 * 60 * 1000;
  let nearby = new Date(
    Math.ceil(earliest.getTime() / quarterHour) * quarterHour,
  );
  let nearbyHour = Number(
    formatarDataCentral_(nearby, "H"),
  );
  if (nearbyHour >= 19) {
    const fiveMinutes = 5 * 60 * 1000;
    nearby = new Date(
      Math.ceil(earliest.getTime() / fiveMinutes) * fiveMinutes,
    );
    nearbyHour = Number(formatarDataCentral_(nearby, "H"));
  }
  if (
    formatarDataCentral_(nearby, "yyyy-MM-dd") === currentDay &&
    nearbyHour >= 9 &&
    nearbyHour < 19 &&
    nearby.getTime() <= deadline.getTime()
  ) {
    return nearby;
  }

  const nextDayBase = new Date(
    instant.getTime() + 24 * 60 * 60 * 1000,
  );
  const nextDay = formatarDataCentral_(
    nextDayBase,
    "yyyy-MM-dd",
  );
  const nextMorning = combinarDataHorarioCentral_(
    nextDay,
    "10:30",
  );
  if (
    nextMorning &&
    nextMorning.getTime() >= earliest.getTime() &&
    nextMorning.getTime() <= deadline.getTime()
  ) {
    return nextMorning;
  }

  return null;
}

function fonteAguardandoPacienteCentral_(value) {
  return normalizarTextoCentral_(value)
    .replace(/[—–/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() === "whatsapp aguardando retorno";
}

function carregarControlesCentral_(sheet) {
  const result = {};
  if (!sheet || sheet.getLastRow() < 2) return result;

  const values = sheet
    .getRange(
      1,
      1,
      sheet.getLastRow(),
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getValues();
  const columns = mapearCabecalhosCentral_(values[0]);
  const finalMessageColumn = columns["mensagem final"];
  const programForColumn = columns["programar para"];

  values.slice(1).forEach(function (row) {
    const sourceKey = textoCentral_(
      valorLinhaCentral_(
        row,
        columns,
        "chave operacional",
      ),
      300,
    );

    if (!sourceKey) return;

    result[sourceKey] = {
      owner: textoCentral_(
        valorLinhaCentral_(row, columns, "responsavel"),
        80,
      ),
      status: textoCentral_(
        valorLinhaCentral_(
          row,
          columns,
          "status operacional",
        ),
        80,
      ),
      deferUntil: dataCentralValida_(
        valorLinhaCentral_(row, columns, "adiar ate"),
      ),
      teamNote: textoCentral_(
        valorLinhaCentral_(
          row,
          columns,
          "observacao da equipe",
        ),
        500,
      ),
      lastTeamActionAt: dataCentralValida_(
        valorLinhaCentral_(
          row,
          columns,
          "ultima acao da equipe",
        ),
      ),
      approveBruna: valorCheckboxCentral_(
        valorLinhaCentral_(
          row,
          columns,
          "aprovar com a bruna",
        ),
      ),
      cancelFollowUp: valorCheckboxCentral_(
        valorLinhaCentral_(
          row,
          columns,
          "cancelar retomada",
        ),
      ),
      finalMessageDefined: finalMessageColumn !== undefined,
      finalMessage: textoCentral_(
        finalMessageColumn === undefined
          ? ""
          : row[finalMessageColumn],
        900,
      ),
      programForDefined: programForColumn !== undefined,
      programFor: dataCentralValida_(
        programForColumn === undefined
          ? null
          : row[programForColumn],
      ),
    };
  });

  return result;
}

function processarEdicaoCentralAtendimento_(event) {
  if (!event || !event.range) {
    return { ok: false, error: "missing_edit_event" };
  }

  const sheet = event.range.getSheet();
  if (
    sheet.getName() !==
    CENTRAL_ATENDIMENTO_CONFIG.sheetName
  ) {
    return { ok: true, ignored: true };
  }

  const row = event.range.getRow();
  if (row < 2) return { ok: true, ignored: true };

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getDisplayValues()[0];
  const columns = mapearCabecalhosCentral_(headers);
  const statusColumn = columns["status operacional"];
  const ownerColumn = columns.responsavel;
  const deferColumn = columns["adiar ate"];
  const noteColumn = columns["observacao da equipe"];
  const finalMessageColumn = columns["mensagem final"];
  const programForColumn = columns["programar para"];
  const approvalColumn = columns["aprovar com a bruna"];
  const actionColumn = columns["ultima acao da equipe"];
  const keyColumn = columns["chave operacional"];
  const phoneColumn = columns.telefone;
  const editedColumn = event.range.getColumn() - 1;

  if (
    ![
      statusColumn,
      ownerColumn,
      deferColumn,
      noteColumn,
      finalMessageColumn,
      programForColumn,
      approvalColumn,
    ].includes(editedColumn)
  ) {
    return { ok: true, ignored: true };
  }

  const now = new Date();
  sheet.getRange(row, actionColumn + 1).setValue(now);

  const status = normalizarTextoCentral_(
    sheet.getRange(row, statusColumn + 1).getValue(),
  );
  const statusAction = status
    .replace(/[—–/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sourceKey = textoCentral_(
    sheet.getRange(row, keyColumn + 1).getValue(),
    300,
  );
  const source = textoCentral_(
    sheet.getRange(row, columns.fonte + 1).getValue(),
    100,
  );
  const phone = normalizarTelefoneCentral_(
    sheet.getRange(row, phoneColumn + 1).getValue(),
  );

  if (status === "aguardando paciente") {
    const modeColumn = columns.modo;
    const approvalColumn = columns["aprovar com a bruna"];
    if (modeColumn !== undefined) {
      sheet.getRange(row, modeColumn + 1).setValue("Silêncio");
    }
    if (approvalColumn !== undefined) {
      const approvalCell = sheet.getRange(row, approvalColumn + 1);
      approvalCell.setValue(false);
      if (typeof approvalCell.clearDataValidations === "function") {
        approvalCell.clearDataValidations();
      }
    }
  }

  const reclassificarEspera =
    fonteAguardandoPacienteCentral_(source) &&
    sourceKey.indexOf("conversation:") === 0 &&
    [
      "programar retomada com a bruna",
      "programado",
    ].includes(statusAction);

  if (reclassificarEspera) {
    const programFor = dataCentralValida_(
      sheet.getRange(row, programForColumn + 1).getValue(),
    );
    const finalMessage = textoCentral_(
      sheet.getRange(row, finalMessageColumn + 1).getValue(),
      900,
    );
    const lastInteractionColumn = columns["ultima interacao"];
    const lastInteractionAt = lastInteractionColumn === undefined
      ? null
      : dataCentralValida_(
          sheet.getRange(row, lastInteractionColumn + 1).getValue(),
        );
    const eligibilityReason = avaliarProgramacaoEsperaCentral_(
      {
        finalMessage: finalMessage,
        programFor: programFor,
        lastInteractionAt: lastInteractionAt,
      },
      now,
    );

    sheet.getRange(row, statusColumn + 1).setValue("Programado");
    sheet.getRange(row, columns.fila + 1).setValue("Ação manual hoje");
    sheet.getRange(row, columns.prioridade + 1).setValue("Alta");
    const actionDueColumn = columns["agir ate"] === undefined
      ? columns.prazo
      : columns["agir ate"];
    if (actionDueColumn !== undefined) {
      sheet
        .getRange(row, actionDueColumn + 1)
        .setValue(programFor || now);
    }
    sheet
      .getRange(row, columns["proxima acao"] + 1)
      .setValue(
        "Revisar mensagem e horário; depois aprovar com a Bruna",
      );
    sheet.getRange(row, ownerColumn + 1).setValue("Equipe");
    sheet.getRange(row, columns.modo + 1).setValue("Manual");
    sheet.getRange(row, deferColumn + 1).setValue("");
    sheet
      .getRange(row, columns["elegibilidade da bruna"] + 1)
      .setValue(eligibilityReason);

    const approvalColumn = columns["aprovar com a bruna"];
    if (approvalColumn !== undefined) {
      const approvalCell = sheet.getRange(row, approvalColumn + 1);
      if (typeof approvalCell.insertCheckboxes === "function") {
        approvalCell.insertCheckboxes();
      }
      approvalCell.setValue(false);
    }
  }

  if (
    approvalColumn !== undefined &&
    editedColumn === approvalColumn
  ) {
    const approvalCell = sheet.getRange(
      row,
      approvalColumn + 1,
    );
    const approvalChecked = valorCheckboxCentral_(
      approvalCell.getValue(),
    );

    if (approvalChecked) {
      const mode = normalizarTextoCentral_(
        sheet.getRange(row, columns.modo + 1).getValue(),
      );
      const currentStatus = normalizarTextoCentral_(
        sheet.getRange(row, statusColumn + 1).getValue(),
      );
      const finalMessage = textoCentral_(
        sheet.getRange(row, finalMessageColumn + 1).getValue(),
        900,
      );
      const safeMessage =
        Boolean(finalMessage) &&
        normalizarTextoCentral_(finalMessage).indexOf(
          "sem sugestao pronta",
        ) !== 0;
      const registeredFollowUp =
        normalizarTextoCentral_(source) ===
          "retomada de marketing" &&
        sourceKey.indexOf("followup:") === 0;
      const waitingConversion =
        fonteAguardandoPacienteCentral_(source) &&
        sourceKey.indexOf("conversation:") === 0;
      const lastInteractionColumn = columns["ultima interacao"];
      const lastInteractionAt = lastInteractionColumn === undefined
        ? null
        : dataCentralValida_(
            sheet
              .getRange(row, lastInteractionColumn + 1)
              .getValue(),
          );
      const suggestedAt =
        mode === "manual" &&
        statusProgramavelRetomadaCentral_(currentStatus) &&
        safeMessage &&
        (registeredFollowUp || waitingConversion)
          ? sugerirProximaJanelaRespostaCentral_(
              now,
              lastInteractionAt,
              { allowOutsideWhatsappWindow: true },
            )
          : null;
      let eligibilityReason =
        "Linha não elegível para programação automática";

      if (suggestedAt) {
        sheet
          .getRange(row, programForColumn + 1)
          .setValue(suggestedAt);
        eligibilityReason = waitingConversion
          ? avaliarProgramacaoEsperaCentral_(
              {
                finalMessage: finalMessage,
                programFor: suggestedAt,
                lastInteractionAt: lastInteractionAt,
              },
              now,
              { allowOutsideWhatsappWindow: true },
            )
          : lastInteractionAt &&
              suggestedAt.getTime() - lastInteractionAt.getTime() >
                CENTRAL_ATENDIMENTO_CONFIG.whatsappWindowMinutes *
                  60 *
                  1000
            ? "Elegível — horário sugerido; envio por modelo do WhatsApp"
            : "Elegível — horário sugerido automaticamente";
      }

      const eligible =
        Boolean(suggestedAt) &&
        (
          registeredFollowUp ||
          eligibilityReason ===
            "Elegível após conferência da mensagem e do procedimento"
        );
      if (!eligible) {
        approvalCell.setValue(false);
        if (
          safeMessage &&
          (registeredFollowUp || waitingConversion) &&
          !suggestedAt
        ) {
          eligibilityReason =
            "Sem horário seguro dentro da janela atual do WhatsApp";
        }
      }

      sheet
        .getRange(
          row,
          columns["elegibilidade da bruna"] + 1,
        )
        .setValue(eligibilityReason);
    }
  }

  if (
    (
      status === "concluido" ||
      statusAction === "encerrar comercial nao paciente"
    ) &&
    sourceKey.indexOf("commitment:") === 0
  ) {
    const spreadsheet = typeof sheet.getParent === "function"
      ? sheet.getParent()
      : null;
    resolverCompromissoCentral_(
      sourceKey.slice("commitment:".length),
      now,
      spreadsheet,
      statusAction === "encerrar comercial nao paciente"
        ? "Contato comercial/marketing — não paciente. Encerrado sem resposta."
        : "Concluído pela equipe na Central de Atendimento.",
    );

    if (statusAction === "encerrar comercial nao paciente") {
      encerrarContatoComercialCentral_(spreadsheet, {
        phone: phone,
        eventId: sourceKey.slice("commitment:".length),
        now: now,
      });
      const noteCell = sheet.getRange(row, noteColumn + 1);
      if (!textoCentral_(noteCell.getValue(), 500)) {
        noteCell.setValue(
          "Contato comercial/marketing — não paciente. Encerrado sem resposta.",
        );
      }
    }
  }

  return {
    ok: true,
    updated: true,
    sourceKey: sourceKey,
  };
}

function processarDecisoesMarcadasCentral() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.sheetName,
  );
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert("A aba Central de Atendimento não foi encontrada.");
    return { ok: false, error: "central_not_found" };
  }

  const approvals = coletarRetomadasMarcadasCentral_(sheet);
  const cancellations = coletarCancelamentosMarcadosCentral_(sheet);
  const approvalRows = new Set(
    approvals.map(function (item) {
      return item.rowNumber;
    }),
  );
  const conflicts = cancellations.filter(function (item) {
    return approvalRows.has(item.rowNumber);
  });

  if (conflicts.length) {
    ui.alert(
      "Há " +
        conflicts.length +
        " linha(s) marcadas ao mesmo tempo para a Bruna e para cancelamento. Desmarque uma das decisões antes de continuar.",
    );
    return {
      ok: false,
      error: "conflicting_decisions",
      conflicts: conflicts.map(function (item) {
        return item.rowNumber;
      }),
    };
  }

  if (!approvals.length && !cancellations.length) {
    ui.alert(
      "Marque pelo menos uma caixa em “Aprovar com a Bruna” ou “Cancelar retomada”.",
    );
    return { ok: true, approved: 0, cancelled: 0, skipped: 0 };
  }

  const confirmation = ui.alert(
    "Processar decisões marcadas?",
    approvals.length +
      " retomada(s) serão avaliadas para a Bruna e " +
      cancellations.length +
      " serão avaliadas para cancelamento. Cada conversa será revalidada antes da alteração.",
    ui.ButtonSet.YES_NO,
  );

  if (confirmation !== ui.Button.YES) {
    return {
      ok: true,
      cancelledByUser: true,
      approved: 0,
      cancelled: 0,
      skipped: 0,
    };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    ui.alert(
      "A Central está sendo atualizada. Tente novamente em alguns segundos.",
    );
    return { ok: false, error: "busy_retry" };
  }

  try {
    const now = new Date();
    const approvalResult = approvals.length
      ? aprovarRetomadasMarcadasCentralInterno_(
          spreadsheet,
          sheet,
          now,
          approvals,
        )
      : { ok: true, approved: 0, skipped: 0, results: [] };
    const cancellationResult = cancellations.length
      ? cancelarRetomadasMarcadasCentralInterno_(
          spreadsheet,
          sheet,
          now,
          cancellations,
        )
      : { ok: true, cancelled: 0, skipped: 0, results: [] };

    atualizarCentralAtendimentoInterno_(spreadsheet, new Date());

    const skipped =
      Number(approvalResult.skipped || 0) +
      Number(cancellationResult.skipped || 0);
    ui.alert(
      "Decisões processadas",
      Number(approvalResult.approved || 0) +
        " retomada(s) programada(s) com a Bruna, " +
        Number(cancellationResult.cancelled || 0) +
        " cancelada(s) e " +
        skipped +
        " mantida(s) sem alteração.",
      ui.ButtonSet.OK,
    );

    return {
      ok: approvalResult.ok && cancellationResult.ok,
      approved: Number(approvalResult.approved || 0),
      cancelled: Number(cancellationResult.cancelled || 0),
      skipped: skipped,
      approvalResults: approvalResult.results || [],
      cancellationResults: cancellationResult.results || [],
    };
  } finally {
    lock.releaseLock();
  }
}

function processarCancelamentosPendentesNaAtualizacaoCentral_(
  spreadsheet,
  sheet,
  now,
) {
  const selected = coletarCancelamentosMarcadosCentral_(sheet);
  if (!selected.length) {
    return {
      ok: true,
      selected: 0,
      cancelled: 0,
      skipped: 0,
      conflicts: [],
    };
  }

  const approvalRows = new Set(
    coletarRetomadasMarcadasCentral_(sheet).map(function (item) {
      return item.rowNumber;
    }),
  );
  const conflicts = selected.filter(function (item) {
    return approvalRows.has(item.rowNumber);
  });
  const conflictRows = new Set(
    conflicts.map(function (item) {
      return item.rowNumber;
    }),
  );
  const cancellable = selected.filter(function (item) {
    return !conflictRows.has(item.rowNumber);
  });
  const result = cancellable.length
    ? cancelarRetomadasMarcadasCentralInterno_(
        spreadsheet,
        sheet,
        now,
        cancellable,
      )
    : {
        ok: true,
        selected: 0,
        cancelled: 0,
        skipped: 0,
        results: [],
      };

  return {
    ...result,
    ok: result.ok === true && conflicts.length === 0,
    selected: selected.length,
    skipped: Number(result.skipped || 0) + conflicts.length,
    conflicts: conflicts.map(function (item) {
      return item.rowNumber;
    }),
  };
}

function aprovarRetomadasMarcadasCentral() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.sheetName,
  );
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert("A aba Central de Atendimento não foi encontrada.");
    return { ok: false, error: "central_not_found" };
  }

  const selected = coletarRetomadasMarcadasCentral_(sheet);
  if (!selected.length) {
    ui.alert(
      "Marque pelo menos uma caixa em “Aprovar com a Bruna”.",
    );
    return { ok: true, approved: 0, skipped: 0 };
  }

  const confirmation = ui.alert(
    "Aprovar retomadas com a Bruna?",
    "Você selecionou " +
      selected.length +
      " mensagem(ns). Elas serão programadas exatamente como aparecem em “Mensagem final”, para “Programar para”, e serão revalidadas antes do disparo.",
    ui.ButtonSet.YES_NO,
  );

  if (confirmation !== ui.Button.YES) {
    return {
      ok: true,
      cancelled: true,
      approved: 0,
      skipped: 0,
    };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    ui.alert(
      "A Central está sendo atualizada. Tente novamente em alguns segundos.",
    );
    return { ok: false, error: "busy_retry" };
  }

  try {
    const result = aprovarRetomadasMarcadasCentralInterno_(
      spreadsheet,
      sheet,
      new Date(),
      selected,
    );

    atualizarCentralAtendimentoInterno_(spreadsheet, new Date());

    ui.alert(
      "Aprovação concluída",
      result.approved +
        " retomada(s) programada(s) com a Bruna. " +
        result.skipped +
        " retomada(s) não programada(s) e mantida(s) com a equipe.",
      ui.ButtonSet.OK,
    );
    return result;
  } finally {
    lock.releaseLock();
  }
}

function coletarRetomadasMarcadasCentral_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getDisplayValues()[0];
  const columns = mapearCabecalhosCentral_(headers);
  const approvalColumn = columns["aprovar com a bruna"];

  if (approvalColumn === undefined) return [];

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getValues();

  return rows.reduce(function (selected, row, index) {
    if (!valorCheckboxCentral_(row[approvalColumn])) {
      return selected;
    }

    const sourceKey = textoCentral_(
      valorLinhaCentral_(
        row,
        columns,
        "chave operacional",
      ),
      300,
    );
    const source = normalizarTextoCentral_(
      valorLinhaCentral_(row, columns, "fonte"),
    );
    const mode = normalizarTextoCentral_(
      valorLinhaCentral_(row, columns, "modo"),
    );
    const status = normalizarTextoCentral_(
      valorLinhaCentral_(
        row,
        columns,
        "status operacional",
      ),
    );
    const finalMessage = textoCentral_(
      valorLinhaCentral_(
        row,
        columns,
        "mensagem final",
      ),
      900,
    );
    const programFor = dataCentralValida_(
      valorLinhaCentral_(
        row,
        columns,
        "programar para",
      ),
    );
    const safeSuggestion =
      Boolean(finalMessage) &&
      normalizarTextoCentral_(finalMessage).indexOf(
        "sem sugestao pronta",
      ) !== 0;
    const registeredFollowUp =
      source === "retomada de marketing" &&
      sourceKey.indexOf("followup:") === 0 &&
      mode === "manual" &&
      statusProgramavelRetomadaCentral_(status);
    const waitingConversion =
      fonteAguardandoPacienteCentral_(
        valorLinhaCentral_(row, columns, "fonte"),
      ) &&
      sourceKey.indexOf("conversation:") === 0 &&
      mode === "manual" &&
      status === "programado";
    const phone = normalizarTelefoneCentral_(
      valorLinhaCentral_(row, columns, "telefone"),
    );
    const lastInteractionAt = dataCentralValida_(
      valorLinhaCentral_(
        row,
        columns,
        "ultima interacao",
      ),
    );
    const waitingReason = waitingConversion
      ? avaliarProgramacaoEsperaCentral_(
          {
            finalMessage: finalMessage,
            programFor: programFor,
            lastInteractionAt: lastInteractionAt,
          },
          new Date(),
          { allowOutsideWhatsappWindow: true },
        )
      : "";
    const eligible =
      safeSuggestion &&
      Boolean(programFor) &&
      (
        registeredFollowUp ||
        (
          waitingConversion &&
          waitingReason ===
            "Elegível após conferência da mensagem e do procedimento"
        )
      );

    selected.push({
      rowNumber: index + 2,
      sourceKey: sourceKey,
      planKey:
        sourceKey.indexOf("followup:") === 0
          ? sourceKey.slice("followup:".length)
          : "",
      finalMessage: finalMessage,
      programFor: programFor,
      phone: phone,
      messageId: waitingConversion
        ? sourceKey.slice("conversation:".length)
        : "",
      waitingConversion: waitingConversion,
      eligible: eligible,
    });
    return selected;
  }, []);
}

function coletarCancelamentosMarcadosCentral_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getDisplayValues()[0];
  const columns = mapearCabecalhosCentral_(headers);
  const cancellationColumn = columns["cancelar retomada"];

  if (cancellationColumn === undefined) return [];

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getValues();

  return rows.reduce(function (selected, row, index) {
    if (!valorCheckboxCentral_(row[cancellationColumn])) {
      return selected;
    }

    const sourceKey = textoCentral_(
      valorLinhaCentral_(
        row,
        columns,
        "chave operacional",
      ),
      300,
    );
    const source = normalizarTextoCentral_(
      valorLinhaCentral_(row, columns, "fonte"),
    );
    const status = normalizarTextoCentral_(
      valorLinhaCentral_(
        row,
        columns,
        "status operacional",
      ),
    );
    const planKey = sourceKey.indexOf("followup:") === 0
      ? sourceKey.slice("followup:".length)
      : "";

    selected.push({
      rowNumber: index + 2,
      sourceKey: sourceKey,
      planKey: planKey,
      eligible:
        source === "retomada de marketing" &&
        Boolean(planKey) &&
        statusProgramavelRetomadaCentral_(status),
    });
    return selected;
  }, []);
}

function aprovarRetomadasMarcadasCentralInterno_(
  spreadsheet,
  sheet,
  now,
  selected,
) {
  const rows = selected || coletarRetomadasMarcadasCentral_(sheet);
  const headers = sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getDisplayValues()[0];
  const columns = mapearCabecalhosCentral_(headers);
  let approved = 0;
  let skipped = 0;
  const results = [];

  rows.forEach(function (item) {
    let result = { ok: false, reason: "plan_not_eligible" };
    let planKey = item.planKey;
    let planReady = !item.waitingConversion;

    if (
      item.eligible &&
      typeof assinaturaAprovacaoRetomadaBot_ === "function" &&
      typeof aprovarPlanoRetomadaParaBot_ === "function"
    ) {
      if (item.waitingConversion) {
        const registered =
          typeof registrarPlanoManualRetomadaCentral_ === "function"
            ? registrarPlanoManualRetomadaCentral_(
                spreadsheet,
                {
                  phone: item.phone,
                  messageId: item.messageId,
                  suggestion: item.finalMessage,
                  scheduledAt: item.programFor,
                },
                now,
              )
            : { ok: false, reason: "approval_unavailable" };
        if (!registered.ok) {
          result = registered;
        } else {
          planKey = registered.planKey;
          planReady = true;
        }
      }

      if (planReady && planKey) {
        const token = assinaturaAprovacaoRetomadaBot_(planKey);
        result = token
          ? aprovarPlanoRetomadaParaBot_(
              spreadsheet,
              token,
              now,
              {
                suggestion: item.finalMessage,
                scheduledAt: item.programFor,
                origin: "Central de Atendimento",
              },
            )
          : { ok: false, reason: "approval_token_missing" };
      }
    }

    const note = result.ok
      ? "Retomada aprovada em lote para a Bruna em " +
        formatarDataCentral_(now, "yyyy-MM-dd") +
        "."
      : "Retomada não programada: " +
        rotuloFalhaAprovacaoCentral_(result.reason) +
        ".";

    sheet
      .getRange(
        item.rowNumber,
        columns["aprovar com a bruna"] + 1,
      )
      .setValue(false);
    sheet
      .getRange(
        item.rowNumber,
        columns["observacao da equipe"] + 1,
      )
      .setValue(note);
    sheet
      .getRange(
        item.rowNumber,
        columns["ultima acao da equipe"] + 1,
      )
      .setValue(now);

    if (result.ok) {
      sheet
        .getRange(item.rowNumber, columns.responsavel + 1)
        .setValue("Bruna/bot");
      sheet
        .getRange(item.rowNumber, columns.modo + 1)
        .setValue("Automático");
      approved += 1;
    } else {
      skipped += 1;
    }

    results.push({
      rowNumber: item.rowNumber,
      ok: result.ok === true,
      reason: result.reason || "",
    });
  });

  return {
    ok: skipped === 0,
    selected: rows.length,
    approved: approved,
    skipped: skipped,
    results: results,
  };
}

function cancelarRetomadasMarcadasCentralInterno_(
  spreadsheet,
  sheet,
  now,
  selected,
) {
  const rows = selected || coletarCancelamentosMarcadosCentral_(sheet);
  const headers = sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getDisplayValues()[0];
  const columns = mapearCabecalhosCentral_(headers);
  let cancelled = 0;
  let skipped = 0;
  const results = [];

  rows.forEach(function (item) {
    let result = { ok: false, reason: "plan_not_eligible" };

    if (
      item.eligible &&
      item.planKey &&
      typeof assinaturaCancelamentoRetomadas_ === "function" &&
      typeof cancelarPlanoRetomadaPorToken_ === "function"
    ) {
      const token = assinaturaCancelamentoRetomadas_(item.planKey);
      result = token
        ? cancelarPlanoRetomadaPorToken_(spreadsheet, token, now)
        : { ok: false, reason: "cancellation_token_missing" };
    }

    const note = result.ok
      ? "Retomada cancelada pela equipe em " +
        formatarDataCentral_(now, "yyyy-MM-dd") +
        "."
      : "Retomada não cancelada: " +
        rotuloFalhaCancelamentoCentral_(result.reason) +
        ".";

    sheet
      .getRange(
        item.rowNumber,
        columns["cancelar retomada"] + 1,
      )
      .setValue(false);
    sheet
      .getRange(
        item.rowNumber,
        columns["observacao da equipe"] + 1,
      )
      .setValue(note);
    sheet
      .getRange(
        item.rowNumber,
        columns["ultima acao da equipe"] + 1,
      )
      .setValue(now);

    if (result.ok) {
      sheet
        .getRange(
          item.rowNumber,
          columns["status operacional"] + 1,
        )
        .setValue("Cancelado");
      sheet
        .getRange(item.rowNumber, columns.modo + 1)
        .setValue("Silêncio");
      cancelled += 1;
    } else {
      skipped += 1;
    }

    results.push({
      rowNumber: item.rowNumber,
      ok: result.ok === true,
      reason: result.reason || "",
    });
  });

  return {
    ok: skipped === 0,
    selected: rows.length,
    cancelled: cancelled,
    skipped: skipped,
    results: results,
  };
}

function rotuloFalhaCancelamentoCentral_(reason) {
  const labels = {
    plan_not_found: "plano não encontrado",
    plan_not_eligible: "item não elegível",
    cancellation_token_missing: "cancelamento indisponível",
  };
  return labels[reason] || "estado da conversa alterado";
}

function rotuloFalhaAprovacaoCentral_(reason) {
  const labels = {
    automation_disabled: "automação desligada",
    outside_send_window: "fora do horário permitido",
    invalid_schedule: "data ou horário inválido",
    schedule_must_be_future: "o horário precisa estar no futuro",
    unsafe_message: "mensagem final vazia ou insegura",
    plan_not_found: "plano não encontrado",
    plan_not_eligible: "item não elegível",
    missing_context: "contexto incompleto",
    approval_token_missing: "aprovação indisponível",
    approval_unavailable: "aprovação indisponível",
    whatsapp_window_closed: "janela atual do WhatsApp encerrada",
    conversation_changed: "a conversa mudou depois da programação",
    procedure_mismatch: "o procedimento da mensagem não confere com a conversa",
    followup_not_appropriate: "a retomada deixou de ser apropriada",
    sensitive_context: "contexto exige revisão humana",
  };
  return labels[reason] || "estado da conversa alterado";
}

function resolverCompromissoCentral_(
  eventId,
  now,
  spreadsheetOverride,
  resolutionReason,
) {
  if (!eventId) return { ok: false, error: "missing_event_id" };

  const spreadsheet = spreadsheetOverride || SpreadsheetApp.openById(
    CENTRAL_ATENDIMENTO_CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.commitmentsSheetName,
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: false, error: "commitment_not_found" };
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 9)
    .getValues();
  let resolved = 0;

  values.forEach(function (row, index) {
    if (
      textoCentral_(row[0], 180) !== eventId ||
      normalizarTextoCentral_(row[7]) !== "pendente"
    ) {
      return;
    }

    sheet.getRange(index + 2, 8).setValue("Resolvido");
    sheet.getRange(index + 2, 9).setValue(now);
    if (resolutionReason) {
      if (
        typeof sheet.getMaxColumns === "function" &&
        sheet.getMaxColumns() < 11 &&
        typeof sheet.insertColumnsAfter === "function"
      ) {
        sheet.insertColumnsAfter(
          sheet.getMaxColumns(),
          11 - sheet.getMaxColumns(),
        );
      }
      sheet.getRange(1, 11).setValue("Motivo da resolução");
      sheet.getRange(index + 2, 11).setValue(
        textoCentral_(resolutionReason, 300),
      );
    }
    resolved += 1;
  });

  return { ok: true, resolved: resolved };
}

function encerrarContatoComercialCentral_(spreadsheetOverride, input) {
  const spreadsheet = spreadsheetOverride || SpreadsheetApp.openById(
    CENTRAL_ATENDIMENTO_CONFIG.spreadsheetId,
  );
  const phone = normalizarTelefoneCentral_(input && input.phone);
  const eventId = textoCentral_(input && input.eventId, 180);
  const now = dataCentralValida_(input && input.now) || new Date();

  if (!phone) return { ok: false, error: "invalid_phone" };

  const cancelledFollowUps =
    typeof cancelarPlanosPendentesRetomadas_ === "function"
      ? cancelarPlanosPendentesRetomadas_(spreadsheet, phone, now)
      : 0;
  const archiveResult =
    typeof arquivarContatoNaoLead_ === "function"
      ? arquivarContatoNaoLead_(spreadsheet, {
          phone: phone,
          professional: "commercial",
          reason: "Contato comercial/marketing confirmado pela Central de Atendimento",
          eventId: eventId,
          at: now,
        })
      : { archivedLeadRows: 0 };

  return {
    ok: true,
    phone: phone,
    cancelledFollowUps: cancelledFollowUps,
    archivedLeadRows: Number(archiveResult.archivedLeadRows || 0),
  };
}

function escreverCentralAtendimento_(sheet, items, now) {
  garantirDimensoesCentral_(sheet);
  const structureReady = estruturaCentralPronta_(sheet);
  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();

  if (!structureReady) {
    sheet
      .getRange(
        1,
        1,
        sheet.getMaxRows(),
        CENTRAL_ATENDIMENTO_HEADERS.length,
      )
      .clearDataValidations();
    sheet
      .getRange(1, 1, 1, CENTRAL_ATENDIMENTO_HEADERS.length)
      .clearNote();
  }

  sheet.clearContents();
  sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .setValues([Array.from(CENTRAL_ATENDIMENTO_HEADERS)]);

  if (items.length) {
    const rows = items.map(function (item) {
      return [
        item.queue,
        item.priority.label,
        item.dueAt || "",
        item.name || "Não informado",
        item.phone ? "Abrir conversa" : "",
        item.nextAction,
        item.finalMessage,
        item.programFor || "",
        item.approvalBrunaEligible
          ? item.approveBruna === true
          : "",
        item.cancelFollowUpEligible
          ? item.cancelFollowUp === true
          : "",
        item.brunaEligibilityReason,
        item.suggestion,
        item.context,
        normalizarResponsavelCentral_(item.owner),
        item.status,
        item.deferUntil || "",
        item.teamNote,
        item.lastInteractionAt || "",
        rotuloRelacionamentoCentral_(item.relationship),
        item.origin,
        item.mode,
        item.lastTeamActionAt || "",
        now,
        item.source,
        item.sourceKey,
        item.phone,
      ];
    });

    sheet
      .getRange(
        2,
        1,
        rows.length,
        CENTRAL_ATENDIMENTO_HEADERS.length,
      )
      .setValues(rows);

    aplicarLinksWhatsappCentral_(sheet, items);
  }

  if (structureReady) {
    const filterRows = Math.max(items.length + 1, 2);
    sheet
      .getRange(
        1,
        1,
        filterRows,
        CENTRAL_ATENDIMENTO_HEADERS.length,
      )
      .createFilter();
  } else {
    formatarCentralAtendimento_(sheet, items.length);
  }

  configurarDecisoesRetomadasCentral_(sheet, items);
}

function aplicarLinksWhatsappCentral_(sheet, items) {
  if (
    !sheet ||
    !items ||
    !items.length ||
    typeof SpreadsheetApp === "undefined" ||
    typeof SpreadsheetApp.newRichTextValue !== "function"
  ) {
    return;
  }

  const columns = mapearCabecalhosCentral_(
    Array.from(CENTRAL_ATENDIMENTO_HEADERS),
  );
  const linkColumn = columns["abrir whatsapp"];
  if (linkColumn === undefined) return;

  const richTexts = items.map(function (item) {
    const digits = String(item.phone || "").replace(/\D/g, "");
    const builder = SpreadsheetApp.newRichTextValue();
    if (!digits) return [builder.setText("").build()];
    return [
      builder
        .setText("Abrir conversa")
        .setLinkUrl("https://wa.me/" + digits)
        .build(),
    ];
  });

  const range = sheet.getRange(
    2,
    linkColumn + 1,
    richTexts.length,
    1,
  );
  if (typeof range.setRichTextValues === "function") {
    range.setRichTextValues(richTexts);
  }
}

function configurarDecisoesRetomadasCentral_(sheet, items) {
  const headers = mapearCabecalhosCentral_(
    Array.from(CENTRAL_ATENDIMENTO_HEADERS),
  );
  const approvalColumn = headers["aprovar com a bruna"];
  const cancellationColumn = headers["cancelar retomada"];
  if (
    approvalColumn === undefined ||
    cancellationColumn === undefined
  ) {
    return;
  }

  const approvalSheetColumn = approvalColumn + 1;
  const cancellationSheetColumn = cancellationColumn + 1;
  const validationRows = Math.max(
    CENTRAL_ATENDIMENTO_CONFIG.maximumRows,
    (items || []).length + 1,
  );
  sheet.showColumns(approvalSheetColumn, 2);
  sheet
    .getRange(2, approvalSheetColumn, validationRows - 1, 2)
    .clearDataValidations();

  const approvalRanges = [];
  const cancellationRanges = [];
  (items || []).forEach(function (item, index) {
    if (item.approvalBrunaEligible) {
      approvalRanges.push(
        sheet
          .getRange(index + 2, approvalSheetColumn)
          .getA1Notation(),
      );
    }
    if (item.cancelFollowUpEligible) {
      cancellationRanges.push(
        sheet
          .getRange(index + 2, cancellationSheetColumn)
          .getA1Notation(),
      );
    }
  });

  if (approvalRanges.length) {
    sheet.getRangeList(approvalRanges).insertCheckboxes();
  }
  if (cancellationRanges.length) {
    sheet.getRangeList(cancellationRanges).insertCheckboxes();
  }
}

function estruturaCentralPronta_(sheet) {
  if (
    !sheet ||
    sheet.getMaxColumns() <
      CENTRAL_ATENDIMENTO_HEADERS.length
  ) {
    return false;
  }

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      CENTRAL_ATENDIMENTO_HEADERS.length,
    )
    .getDisplayValues()[0];

  const headersReady = CENTRAL_ATENDIMENTO_HEADERS.every(function (
    header,
    index,
  ) {
    return headers[index] === header;
  });

  if (!headersReady) return false;

  const layoutMarkerColumn =
    CENTRAL_ATENDIMENTO_HEADERS.indexOf("Fonte") + 1;
  return sheet
    .getRange(1, layoutMarkerColumn)
    .getNote() === CENTRAL_ATENDIMENTO_CONFIG.layoutVersion;
}

function formatarCentralAtendimento_(sheet, itemCount) {
  const columnCount = CENTRAL_ATENDIMENTO_HEADERS.length;
  const columns = mapearCabecalhosCentral_(
    Array.from(CENTRAL_ATENDIMENTO_HEADERS),
  );
  const validationRows = Math.max(
    CENTRAL_ATENDIMENTO_CONFIG.maximumRows,
    itemCount + 1,
  );
  const dataRows = Math.max(itemCount, 1);
  const visibleColumnCount = columns.fonte;

  sheet.setFrozenRows(1);
  if (typeof sheet.setFrozenColumns === "function") {
    sheet.setFrozenColumns(5);
  }
  sheet.showColumns(1, columnCount);
  sheet
    .getRange(1, 1, 1, columnCount)
    .setBackground("#356854")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 38);

  sheet
    .getRange(2, 1, dataRows, columnCount)
    .setBackground("#ffffff")
    .setVerticalAlignment("top");
  if (typeof sheet.setRowHeights === "function") {
    sheet.setRowHeights(2, dataRows, 72);
  }

  [
    "agir ate",
    "programar para",
    "adiar ate",
    "ultima interacao",
    "ultima acao da equipe",
    "atualizado em",
  ].forEach(function (header) {
    sheet
      .getRange(2, columns[header] + 1, dataRows, 1)
      .setNumberFormat("dd/mm/yyyy hh:mm");
  });
  [
    "proxima acao",
    "mensagem final",
    "elegibilidade da bruna",
    "resposta sugerida",
    "contexto",
    "observacao da equipe",
  ].forEach(function (header) {
    sheet
      .getRange(2, columns[header] + 1, dataRows, 1)
      .setWrap(true);
  });

  sheet
    .getRange(
      2,
      columns.responsavel + 1,
      validationRows - 1,
      1,
    )
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(
          ["Bruna/bot", "Amanda", "Daniel", "Equipe", "Amanda/equipe"],
          true,
        )
        .setAllowInvalid(false)
        .build(),
    );
  sheet
    .getRange(
      2,
      columns.modo + 1,
      validationRows - 1,
      1,
    )
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(
          ["Automático", "Manual", "Silêncio"],
          true,
        )
        .setAllowInvalid(false)
        .build(),
    );
  sheet
    .getRange(
      2,
      columns["status operacional"] + 1,
      validationRows - 1,
      1,
    )
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(
          [
            "Aberto",
            "Programado",
            "Em andamento",
            "Aguardando paciente",
            "Programar retomada com a Bruna",
            "Concluído",
            "Cancelado",
            "Falha — revisar",
            "Encerrar — comercial/não paciente",
            "Suspenso",
          ],
          true,
        )
        .setAllowInvalid(false)
        .build(),
    );

  const widths = [
    160, 85, 140, 175, 115, 220, 360, 145, 125, 130,
    215, 300, 300, 115, 145, 145, 235, 145, 155, 130,
    95, 145, 145, 150, 220, 135,
  ];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  sheet
    .getRange(
      2,
      columns["mensagem final"] + 1,
      validationRows - 1,
      2,
    )
    .setBackground("#fff2cc");
  sheet
    .getRange(
      2,
      columns["aprovar com a bruna"] + 1,
      validationRows - 1,
      1,
    )
    .setBackground("#d9ead3")
    .setHorizontalAlignment("center");
  sheet
    .getRange(
      2,
      columns["cancelar retomada"] + 1,
      validationRows - 1,
      1,
    )
    .setBackground("#f4cccc")
    .setHorizontalAlignment("center");
  sheet
    .getRange(
      2,
      columns.responsavel + 1,
      validationRows - 1,
      4,
    )
    .setBackground("#fff8e1");
  sheet.hideColumns(columns.fonte + 1, 3);
  sheet
    .getRange(1, columns.fila + 1)
    .setNote(
      "As filas ativas ficam no topo. Retomadas enviadas ou canceladas descem para o histórico recente e desaparecem após 24 horas.",
    );
  sheet
    .getRange(1, columns["agir ate"] + 1)
    .setNote(
      "Limite para a equipe agir ou revisar a linha. Não programa envio. Para a Bruna enviar, use Programar para.",
    );
  sheet
    .getRange(1, columns["mensagem final"] + 1)
    .setNote(
      "Edite aqui o texto exato que a Bruna deverá enviar. A edição é preservada nas atualizações da Central.",
    );
  sheet
    .getRange(1, columns.fonte + 1)
    .setNote(CENTRAL_ATENDIMENTO_CONFIG.layoutVersion);
  sheet
    .getRange(1, columns["programar para"] + 1)
    .setNote(
      "Data e hora exatas do envio pela Bruna. Use um horário futuro entre 09:00 e 18:59 e ainda dentro da janela do WhatsApp. O envio será revalidado.",
    );
  sheet
    .getRange(1, columns["aprovar com a bruna"] + 1)
    .setNote(
      "Ao marcar, a Central sugere em Programar para a próxima faixa com maior chance observada de resposta, respeitando a janela do WhatsApp. Revise ou ajuste o horário e depois use Central LIV > Processar decisões marcadas. Marcar a caixa sozinho não envia mensagem.",
    );
  sheet
    .getRange(1, columns["cancelar retomada"] + 1)
    .setNote(
      "Cancela somente esta retomada, sem marcar Nunca retomar. A próxima atualização automática processa a decisão e move a linha para Cancelado recentemente, com destaque reduzido; para aplicar na hora, use Central LIV > Processar decisões marcadas.",
    );
  sheet
    .getRange(1, columns["adiar ate"] + 1)
    .setNote(
      "Adia a revisão pela equipe e não envia mensagem. Para envio pela Bruna, use Programar para.",
    );

  const filterRows = Math.max(itemCount + 1, 2);
  sheet
    .getRange(1, 1, filterRows, columnCount)
    .createFilter();

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=OR($A2="Pendência vencida",$O2="Falha — revisar",AND($C2<>"",$C2<NOW(),OR($O2="Aberto",$O2="Programado",$O2="Em andamento")))',
      )
      .setBackground("#f4cccc")
      .setFontColor("#990000")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=AND($C2<>"",$C2>=NOW(),$C2<=NOW()+1,$X2="Retomada de marketing",$U2="Manual",$O2="Programado")',
      )
      .setBackground("#d9d2e9")
      .setFontColor("#351c75")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Resposta agora"')
      .setBackground("#fce5cd")
      .setFontColor("#783f04")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Ação manual hoje"')
      .setBackground("#fff2cc")
      .setFontColor("#7f6000")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Automático hoje"')
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Aguardando paciente"')
      .setBackground("#eeeeee")
      .setFontColor("#666666")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Concluído recentemente"')
      .setBackground("#e2f0d9")
      .setFontColor("#38761d")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Cancelado recentemente"')
      .setBackground("#f3f3f3")
      .setFontColor("#777777")
      .setRanges([
        sheet.getRange(
          2,
          1,
          validationRows - 1,
          visibleColumnCount,
        ),
      ])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Concluído")
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setRanges([
        sheet.getRange(
          2,
          columns["status operacional"] + 1,
          validationRows - 1,
          1,
        ),
      ])
      .build(),
  ];
  sheet.setConditionalFormatRules(rules);
}

function obterOuCriarPlanilhaCentral_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.sheetName,
  );

  if (!sheet) {
    sheet = spreadsheet.insertSheet(
      CENTRAL_ATENDIMENTO_CONFIG.sheetName,
      0,
    );
  }

  garantirDimensoesCentral_(sheet);
  return sheet;
}

function garantirDimensoesCentral_(sheet) {
  const missingColumns =
    CENTRAL_ATENDIMENTO_HEADERS.length -
    sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      missingColumns,
    );
  }

  const missingRows =
    CENTRAL_ATENDIMENTO_CONFIG.maximumRows +
    1 -
    sheet.getMaxRows();
  if (missingRows > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), missingRows);
  }
}

function existeGatilhoCentralAtendimento_(handler) {
  return ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === handler;
  });
}

function removerGatilhosCentralAtendimento_(handler) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function prioridadeCentralPorFila_(queue) {
  const priorities = {
    "Pendência vencida": { rank: 0, label: "Crítica" },
    "Resposta agora": { rank: 1, label: "Alta" },
    "Ação manual hoje": { rank: 2, label: "Alta" },
    "Automático hoje": { rank: 3, label: "Normal" },
    "Consultas e cuidados": { rank: 4, label: "Normal" },
    "Aguardando paciente": { rank: 6, label: "Baixa" },
    "Concluído recentemente": { rank: 7, label: "Resolvida" },
    "Cancelado recentemente": { rank: 8, label: "Arquivada" },
  };
  return priorities[queue] || { rank: 5, label: "Normal" };
}

function compararItensCentral_(left, right) {
  const rankDifference =
    left.priority.rank - right.priority.rank;
  if (rankDifference) return rankDifference;

  if (left.priority.rank >= 7) {
    const leftAction = left.lastTeamActionAt
      ? left.lastTeamActionAt.getTime()
      : 0;
    const rightAction = right.lastTeamActionAt
      ? right.lastTeamActionAt.getTime()
      : 0;
    if (leftAction !== rightAction) {
      return rightAction - leftAction;
    }
  }

  const leftDue = left.dueAt
    ? left.dueAt.getTime()
    : Number.MAX_SAFE_INTEGER;
  const rightDue = right.dueAt
    ? right.dueAt.getTime()
    : Number.MAX_SAFE_INTEGER;
  if (leftDue !== rightDue) return leftDue - rightDue;

  return String(left.name || left.phone).localeCompare(
    String(right.name || right.phone),
    "pt-BR",
  );
}

function sugerirRespostaCentral_(
  message,
  name,
  relationship,
) {
  const normalized = normalizarTextoCentral_(message);
  const firstName =
    textoCentral_(name, 120).split(/\s+/)[0] || "";
  const greeting = firstName ? "Oi, " + firstName + "! " : "Olá! ";

  const withoutMiniLifting = normalized.replace(
    /\bmini\s*lifting\b/g,
    " ",
  );
  if (
    /\bmini\s*lifting\b/.test(normalized) &&
    /\blifting\b/.test(withoutMiniLifting) &&
    /\b(?:diferenca|diferenciam|qual|comparar|comparacao|ambos|cada um|versus|vs)\b/.test(
      normalized,
    )
  ) {
    const opening = firstName
      ? "Claro, " + firstName + "."
      : "Claro.";
    return opening +
      " A principal diferença está na extensão do tratamento. O minilifting costuma ser considerado quando as alterações são mais localizadas e a anatomia permite uma abordagem de menor extensão. O lifting facial possibilita um planejamento mais amplo, podendo envolver bochechas, contorno da mandíbula, terço inferior do rosto e, conforme o caso, o pescoço.\n\n" +
      "A melhor opção não é definida apenas pelo nome da cirurgia, mas pelo que a Dra. Amanda identifica durante a avaliação. Quer que eu te explique como essa escolha é feita na consulta?";
  }

  if (
    /valor|preco|quanto custa|orcamento|pagamento/.test(
      normalized,
    )
  ) {
    return greeting +
      "Obrigada pela pergunta. Vou confirmar a faixa atual e as condições de pagamento para te responder com clareza.";
  }

  if (
    /horario|agenda|disponibilidade|dia|data/.test(
      normalized,
    )
  ) {
    return greeting +
      "Claro. Vou consultar os horários disponíveis e já te envio as opções mais adequadas.";
  }

  if (relacionamentoExigeHumanoCentral_(relationship)) {
    return greeting +
      "Obrigada por nos avisar. Vou conferir seu histórico e essa informação com a equipe para dar continuidade com segurança.";
  }

  return "SEM SUGESTÃO PRONTA — leia o histórico completo antes de responder e trate exatamente a dúvida atual. Se ainda houver ambiguidade, peça uma única explicação específica à paciente.";
}

function mensagemExigeRespostaCentral_(message) {
  const normalized = normalizarTextoCentral_(message);

  if (!normalized) return false;

  if (mensagemInicialAutomatizadaCentral_(normalized)) {
    return false;
  }

  if (mensagemEncerramentoCentral_(normalized)) {
    return false;
  }

  if (mensagemIndicaPausaPacienteCentral_(normalized)) {
    return false;
  }

  if (mensagemComercialNaoPacienteCentral_(normalized)) {
    return false;
  }

  return true;
}

function mensagemIndicaPausaPacienteCentral_(message) {
  const normalized = normalizarTextoCentral_(message);
  if (!normalized) return false;

  return /(?:vou|irei|preciso) (?:falar|conversar) com (?:(?:meu|minha) (?:espos[oa]|marido|mulher|familia|filh[oa]|mae|pai|companheir[oa])|(?:a|o) (?:familia|espos[oa]|marido|mulher))|(?:vou|preciso) (?:pensar|avaliar|ver com calma)|(?:entro|entrarei|retorno|retornarei|chamo|falarei|procuro|procurarei) (?:em contato|depois|mais tarde|voces|quando)|(?:te|lhes?) (?:chamo|aviso|procuro)|mais pra frente|quando (?:eu )?(?:decidir|puder|conseguir)/.test(
    normalized,
  );
}

function mensagemInicialAutomatizadaCentral_(normalized) {
  return (
    /\bref\.?\s*[a-z0-9-]{5,}/.test(normalized) &&
    /quero saber|gostaria de saber|gostaria de agendar|consultar disponibilidade/.test(
      normalized,
    )
  );
}

function mensagemEncerramentoCentral_(normalized) {
  const compact = normalized
    .replace(/[!.,;:()[\]{}'"`~_\-\/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /^(?:ok|okay|certo|perfeito|entendi|combinado|beleza|show|legal|otimo|excelente|que maravilha|valeu|agradeco|muito obrigad[oa]+|obrigad[oa]+|brigad[oa]+)(?:\s+(?:viu|mesmo|pela ajuda|pelo retorno|por tudo|obrigad[oa]+|brigad[oa]+))*$/.test(
      compact,
    )
  ) {
    return true;
  }

  return /^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\s]+$/u.test(
    compact,
  );
}

function mensagemComercialNaoPacienteCentral_(normalized) {
  const text = normalizarTextoCentral_(normalized);
  return [
    /(?:proposta|contato) (?:comercial|de parceria)/,
    /(?:propor|fazer) (?:uma )?parceria/,
    /(?:gostaria|queria|venho) (?:de )?(?:apresentar|oferecer) (?:nossos?|meus?) (?:servicos?|produtos?|solucoes?)/,
    /(?:estamos|estou) com (?:uma )?oferta especial/,
    /(?:somos|falo da) (?:uma )?(?:empresa|agencia|fornecedor|representante)/,
    /servico de (?:marketing|trafego|divulgacao)/,
    /(?:gestao de trafego|social media|marketing digital|seo|criacao de sites?)/,
    /apresentar (?:uma )?(?:proposta|solucao comercial)/,
    /parceria comercial/,
    /aumentar (?:seus|os) (?:clientes|agendamentos|resultados)/,
    /(?:gestao|otimizacao) (?:e (?:gestao|otimizacao) )?d[oa] (?:perfil da empresa|google meu negocio|google business profile)/,
    /(?:perfil da empresa no google|google meu negocio|google business profile)/,
    /(?:google|google maps).{0,90}(?:visibilidade|posicionamento|captacao|atrair|conquistar).{0,55}(?:clientes|pacientes|agendamentos)/,
    /(?:visibilidade|posicionamento|captacao|atrair|conquistar).{0,55}(?:clientes|pacientes|agendamentos).{0,90}(?:google|google maps|buscas)/,
    /(?:sou|somos) fundador(?:a|es)? d[oa].{0,120}(?:temos paciente buscando|pagina de agendamento|portal)/,
    /temos paciente buscando.{0,120}(?:enviar|mandar|compartilhar) (?:a )?pagina de agendamento/,
    /presenca digital.{0,160}(?:novos? pacientes?|pacientes? pelo google)/,
    /(?:novos? pacientes?|pacientes? pelo google).{0,160}(?:presenca digital|google)/,
    /(?:publipost|permuta|patrocinio|parceria (?:paga|comercial|de divulgacao))/,
    /(?:maquininha|maquina) de cartao/,
    /(?:trabalho|represento|atuo) com (?:seguros?|planos? de saude)/,
    /(?:quero|gostaria|posso) (?:de )?(?:vender|oferecer|apresentar) (?:um )?(?:seguro|plano de saude)/,
    /(?:procuro|busco|quero|gostaria de) (?:uma )?(?:vaga|emprego|oportunidade de trabalho)/,
    /(?:estao|tem|ha) (?:com )?(?:vaga|vagas|contratando)/,
    /(?:posso|gostaria de|quero) (?:enviar|mandar|encaminhar) (?:meu )?curriculo/,
    /curriculo.{0,60}(?:vaga|emprego|trabalho|contratacao)/,
  ].some(function (pattern) {
    return pattern.test(text);
  });
}

function proximaAcaoRespostaCentral_(message) {
  const normalized = normalizarTextoCentral_(message);

  if (/valor|preco|quanto custa|orcamento/.test(normalized)) {
    return "Confirmar faixa de valor e responder";
  }
  if (/horario|agenda|disponibilidade|dia|data/.test(normalized)) {
    return "Consultar agenda e oferecer horários válidos";
  }
  if (/hospital|exame|laudo|document/.test(normalized)) {
    return "Conferir informação com a equipe e responder";
  }
  return "Responder diretamente à última mensagem";
}

function prazoRespostaCentral_(messageDate) {
  const base = new Date(
    messageDate.getTime() + 20 * 60 * 1000,
  );
  const hour = Number(
    formatarDataCentral_(base, "H"),
  );

  if (hour >= 9 && hour < 19) return base;

  const localDate = formatarDataCentral_(
    base,
    "yyyy-MM-dd",
  );
  if (hour < 9) {
    return new Date(localDate + "T09:00:00-03:00");
  }

  const next = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  return new Date(
    formatarDataCentral_(next, "yyyy-MM-dd") +
      "T09:00:00-03:00",
  );
}

function relacionamentoExigeHumanoCentral_(relationship) {
  return [
    "appointment_scheduled",
    "consultation_completed",
    "surgical_planning",
    "active_postop",
  ].includes(relationship);
}

function relacionamentoPermiteRetomadaMarketingCentral_(
  relationship,
) {
  return ["new_lead", "engaged_lead", "unknown"].includes(
    relationship || "unknown",
  );
}

function relacionamentoLeadCentral_(status) {
  const normalized = normalizarTextoCentral_(status);
  if (/qualificad|agend|interessad/.test(normalized)) {
    return "engaged_lead";
  }
  return "new_lead";
}

function relacionamentoConsultaCentral_(
  status,
  completedAt,
  now,
) {
  const normalized = normalizarTextoCentral_(status);
  if (/agendada|confirmada/.test(normalized)) {
    return "appointment_scheduled";
  }
  if (/realizada/.test(normalized)) {
    if (
      completedAt &&
      now.getTime() - completedAt.getTime() <=
        45 * 24 * 60 * 60 * 1000
    ) {
      return "consultation_completed";
    }
    return "former_patient";
  }
  return "known_patient";
}

function rotuloRelacionamentoCentral_(relationship) {
  const labels = {
    new_lead: "Lead novo",
    engaged_lead: "Lead engajado",
    appointment_scheduled: "Consulta agendada",
    consultation_completed: "Consulta recente",
    surgical_planning: "Planejamento cirúrgico",
    active_postop: "Pós-operatório ativo",
    former_patient: "Paciente antigo",
    known_patient: "Paciente conhecido",
    unknown: "Não identificado",
  };
  return labels[relationship] || labels.unknown;
}

function combinarDataHorarioCentral_(dateValue, timeValue) {
  const date = dataCentralValida_(dateValue);
  if (!date) return null;

  let hours = 9;
  let minutes = 0;

  if (timeValue instanceof Date) {
    hours = Number(formatarDataCentral_(timeValue, "H"));
    minutes = Number(formatarDataCentral_(timeValue, "m"));
  } else {
    const match = String(timeValue || "").match(
      /(?:^|\D)(\d{1,2}):(\d{2})(?:\D|$)/,
    );
    if (match) {
      hours = Number(match[1]);
      minutes = Number(match[2]);
    }
  }

  const localDate = formatarDataCentral_(
    date,
    "yyyy-MM-dd",
  );
  return new Date(
    localDate +
      "T" +
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":00-03:00",
  );
}

function mapearCabecalhosCentral_(headers) {
  return headers.reduce(function (result, header, index) {
    const normalized = normalizarTextoCentral_(header)
      .replace(/[()/.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (normalized) result[normalized] = index;
    return result;
  }, {});
}

function valorLinhaCentral_(row, columns, header) {
  const normalized = normalizarTextoCentral_(header)
    .replace(/[()/.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const index = columns[normalized];
  return index === undefined ? "" : row[index];
}

function valorCheckboxCentral_(value) {
  if (value === true) return true;
  return ["true", "sim", "1", "yes"].includes(
    normalizarTextoCentral_(value),
  );
}

function normalizarTelefoneCentral_(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return "+" + digits;
}

function normalizarTextoCentral_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarResponsavelCentral_(value) {
  const original = textoCentral_(value, 80);
  const normalized = normalizarTextoCentral_(original);

  if (!normalized) return "Equipe";
  if (normalized.includes("bruna")) return "Bruna/bot";
  if (
    normalized.includes("amanda") &&
    normalized.includes("equipe")
  ) {
    return "Amanda/equipe";
  }
  if (normalized === "amanda") return "Amanda";
  if (normalized === "daniel") return "Daniel";
  if (normalized.includes("equipe")) return "Equipe";
  return "Equipe";
}

function textoCentral_(value, limit) {
  return Array.from(String(value || "").trim())
    .slice(0, limit || 500)
    .join("");
}

function dataCentralValida_(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const isoLocalDate = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );
    if (isoLocalDate) {
      return new Date(
        Number(isoLocalDate[1]),
        Number(isoLocalDate[2]) - 1,
        Number(isoLocalDate[3]),
        0,
        0,
        0,
        0,
      );
    }
    const brazilian = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?$/,
    );
    if (brazilian) {
      return new Date(
        Number(brazilian[3]),
        Number(brazilian[2]) - 1,
        Number(brazilian[1]),
        Number(brazilian[4] || 0),
        Number(brazilian[5] || 0),
        0,
        0,
      );
    }
  }
  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatarDataCentral_(date, format) {
  return Utilities.formatDate(
    date,
    CENTRAL_ATENDIMENTO_CONFIG.timezone,
    format,
  );
}
