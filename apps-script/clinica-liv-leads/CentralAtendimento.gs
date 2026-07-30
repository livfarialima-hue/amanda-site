const CENTRAL_ATENDIMENTO_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Central de Atendimento",
  consultationsSheetName: "Consultas",
  messagesSheetName: "_WHATSAPP_MENSAGENS",
  leadsSheetName: "Google Ads - Conversões",
  commitmentsSheetName: "_WHATSAPP_COMPROMISSOS",
  followUpsSheetName: "_WHATSAPP_RETOMADAS",
  triggerFunction: "atualizarCentralAtendimento",
  timezone: "America/Sao_Paulo",
  activeConversationDays: 14,
  pendingResponseHours: 36,
  completedVisibilityHours: 24,
  maximumRows: 300,
});

const CENTRAL_ATENDIMENTO_HEADERS = Object.freeze([
  "Fila",
  "Prioridade",
  "Prazo",
  "Paciente",
  "Telefone",
  "Relacionamento",
  "Origem",
  "Última interação",
  "Próxima ação",
  "Responsável",
  "Modo",
  "Resposta sugerida",
  "Contexto",
  "Status operacional",
  "Adiar até",
  "Observação da equipe",
  "Última ação da equipe",
  "Atualizado em",
  "Fonte",
  "Chave operacional",
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
    .addToUi();
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
  const sheet = obterOuCriarPlanilhaCentral_(spreadsheet);
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
  const itemsByPatient = {};

  carregarCompromissosCentral_(
    spreadsheet,
    now,
    profiles,
  ).forEach(function (item) {
    adicionarItemCentral_(itemsByPatient, item);
  });

  carregarRespostasPendentesCentral_(
    conversations,
    leads,
    profiles,
    humanTakeovers,
    now,
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
  };
}

function carregarCompromissosCentral_(
  spreadsheet,
  now,
  profiles,
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
      const summary =
        textoCentral_(row[3], 300) ||
        "Solicitação aguardando retorno da equipe.";

      if (!phone) return items;

      items.push(criarItemCentral_({
        queue: overdue
          ? "Pendência vencida"
          : "Ação manual hoje",
        dueAt: dueAt || now,
        name: profile.name,
        phone: phone,
        relationship: profile.relationship,
        origin: profile.origin || textoCentral_(row[9], 80),
        lastInteractionAt: profile.lastHumanAt,
        nextAction:
          textoCentral_(row[2], 100) ||
          "Resolver pendência prometida à paciente",
        owner:
          textoCentral_(row[4], 80) || "Amanda/equipe",
        mode: "Manual",
        suggestion:
          "Oi! Retomando o ponto que ficou pendente: já conferimos a informação e podemos seguir por aqui. Obrigada por aguardar.",
        context: summary,
        status: "Aberto",
        source: "Compromisso humano",
        sourceKey:
          "commitment:" + textoCentral_(row[0], 180),
      }));

      return items;
    }, []);
}

function carregarRespostasPendentesCentral_(
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
      name: profile.name,
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
      suggestion: sugerirRespostaCentral_(
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
  );

  if (logged.length) return logged;

  if (
    typeof criarCandidatoRetomada_ !== "function" ||
    typeof atribuirHorariosRetomadas_ !== "function"
  ) {
    return [];
  }

  const localDate = formatarDataCentral_(now, "yyyy-MM-dd");
  const candidates = [];

  Object.keys(conversations).forEach(function (phone) {
    const lead = leads[phone];

    if (
      !lead ||
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
  atribuirHorariosRetomadas_(candidates);

  return candidates
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
        name: profile.name,
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
        source: "Retomada de marketing",
        sourceKey:
          "followup:" + candidate.chaveDiaria,
      });
    });
}

function carregarRetomadasRegistradasCentral_(
  spreadsheet,
  profiles,
  now,
) {
  const sheet = spreadsheet.getSheetByName(
    CENTRAL_ATENDIMENTO_CONFIG.followUpsSheetName,
  );

  if (!sheet || sheet.getLastRow() < 2) return [];

  const today = formatarDataCentral_(now, "yyyy-MM-dd");
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 9)
    .getValues()
    .reduce(function (items, row) {
      const recordDate = dataCentralValida_(row[1]);

      if (
        !recordDate ||
        formatarDataCentral_(recordDate, "yyyy-MM-dd") !== today
      ) {
        return items;
      }

      const phone = normalizarTelefoneCentral_(row[2]);
      const profile = profiles[phone] || {};
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

      items.push(criarItemCentral_({
        queue: "Ação manual hoje",
        dueAt: combinarDataHorarioCentral_(today, row[5]),
        name: profile.name,
        phone: phone,
        relationship: relationship,
        origin: profile.origin,
        lastInteractionAt: null,
        nextAction:
          textoCentral_(row[4], 60) + "ª retomada",
        owner: "Equipe",
        mode: "Manual",
        suggestion: textoCentral_(row[8], 700),
        context: textoCentral_(row[7], 420),
        status: "Programado",
        source: "Retomada de marketing",
        sourceKey:
          "followup:" + textoCentral_(row[0], 260),
      }));
      return items;
    }, []);
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

    if (
      !last ||
      last.direcao !== "OUT" ||
      last.dataHora.getTime() < minimumDate.getTime()
    ) {
      return items;
    }

    const profile = profiles[phone] || {};
    const lead = leads[phone] || {};
    const waitForPatient =
      typeof retornoFuturoRecente_ === "function" &&
      retornoFuturoRecente_(conversation, now);

    items.push(criarItemCentral_({
      queue: "Aguardando paciente",
      dueAt: null,
      name: profile.name,
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
    owner: textoCentral_(input.owner, 80) || "Equipe",
    mode: input.mode || "Manual",
    suggestion: textoCentral_(input.suggestion, 900),
    context: textoCentral_(input.context, 700),
    status: input.status || "Aberto",
    deferUntil: null,
    teamNote: "",
    lastTeamActionAt: null,
    updatedAt: new Date(),
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

  if (
    complementary &&
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

  item.owner = control.owner || item.owner;
  item.teamNote = control.teamNote || "";
  item.lastTeamActionAt = control.lastTeamActionAt;
  item.deferUntil = control.deferUntil;

  if (control.status) {
    item.status = control.status;
  }

  if (
    item.status === "Concluído" &&
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
    item.deferUntil &&
    item.deferUntil.getTime() > now.getTime()
  ) {
    item.queue = "Aguardando paciente";
    item.priority = prioridadeCentralPorFila_(item.queue);
    item.dueAt = item.deferUntil;
    item.status = "Suspenso";
    item.mode = "Silêncio";
  }

  return item;
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
  const actionColumn = columns["ultima acao da equipe"];
  const keyColumn = columns["chave operacional"];
  const editedColumn = event.range.getColumn() - 1;

  if (
    ![
      statusColumn,
      ownerColumn,
      deferColumn,
      noteColumn,
    ].includes(editedColumn)
  ) {
    return { ok: true, ignored: true };
  }

  const now = new Date();
  sheet.getRange(row, actionColumn + 1).setValue(now);

  const status = normalizarTextoCentral_(
    sheet.getRange(row, statusColumn + 1).getValue(),
  );
  const sourceKey = textoCentral_(
    sheet.getRange(row, keyColumn + 1).getValue(),
    300,
  );

  if (
    status === "concluido" &&
    sourceKey.indexOf("commitment:") === 0
  ) {
    resolverCompromissoCentral_(
      sourceKey.slice("commitment:".length),
      now,
    );
  }

  return {
    ok: true,
    updated: true,
    sourceKey: sourceKey,
  };
}

function resolverCompromissoCentral_(eventId, now) {
  if (!eventId) return { ok: false, error: "missing_event_id" };

  const spreadsheet = SpreadsheetApp.openById(
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
    resolved += 1;
  });

  return { ok: true, resolved: resolved };
}

function escreverCentralAtendimento_(sheet, items, now) {
  garantirDimensoesCentral_(sheet);
  const structureReady = estruturaCentralPronta_(sheet);
  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();

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
        item.phone,
        rotuloRelacionamentoCentral_(item.relationship),
        item.origin,
        item.lastInteractionAt || "",
        item.nextAction,
        item.owner,
        item.mode,
        item.suggestion,
        item.context,
        item.status,
        item.deferUntil || "",
        item.teamNote,
        item.lastTeamActionAt || "",
        now,
        item.source,
        item.sourceKey,
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

  return CENTRAL_ATENDIMENTO_HEADERS.every(function (
    header,
    index,
  ) {
    return headers[index] === header;
  });
}

function formatarCentralAtendimento_(sheet, itemCount) {
  const columnCount = CENTRAL_ATENDIMENTO_HEADERS.length;
  const validationRows = Math.max(
    CENTRAL_ATENDIMENTO_CONFIG.maximumRows,
    itemCount + 1,
  );
  const dataRows = Math.max(itemCount, 1);

  sheet.setFrozenRows(1);
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
    .setVerticalAlignment("top");
  sheet
    .getRange(2, 3, dataRows, 1)
    .setNumberFormat("dd/mm/yyyy hh:mm");
  sheet
    .getRange(2, 8, dataRows, 1)
    .setNumberFormat("dd/mm/yyyy hh:mm");
  sheet
    .getRange(2, 15, dataRows, 1)
    .setNumberFormat("dd/mm/yyyy hh:mm");
  sheet
    .getRange(2, 17, dataRows, 2)
    .setNumberFormat("dd/mm/yyyy hh:mm");
  sheet
    .getRange(2, 9, dataRows, 1)
    .setWrap(true);
  sheet
    .getRange(2, 12, dataRows, 2)
    .setWrap(true);
  sheet
    .getRange(2, 16, dataRows, 1)
    .setWrap(true);

  sheet
    .getRange(2, 10, validationRows - 1, 1)
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
    .getRange(2, 11, validationRows - 1, 1)
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
    .getRange(2, 14, validationRows - 1, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(
          [
            "Aberto",
            "Programado",
            "Em andamento",
            "Aguardando paciente",
            "Concluído",
            "Suspenso",
          ],
          true,
        )
        .setAllowInvalid(false)
        .build(),
    );

  const widths = [
    170, 90, 145, 190, 135, 165, 135, 145, 220, 115,
    95, 340, 320, 145, 145, 240, 145, 145, 150, 220,
  ];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  sheet.hideColumns(19, 2);

  const filterRows = Math.max(itemCount + 1, 2);
  sheet
    .getRange(1, 1, filterRows, columnCount)
    .createFilter();

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Pendência vencida")
      .setBackground("#f4cccc")
      .setFontColor("#990000")
      .setRanges([sheet.getRange(2, 1, validationRows - 1, 1)])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Resposta agora")
      .setBackground("#fce5cd")
      .setFontColor("#783f04")
      .setRanges([sheet.getRange(2, 1, validationRows - 1, 1)])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Automático hoje")
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setRanges([sheet.getRange(2, 1, validationRows - 1, 1)])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Aguardando paciente")
      .setBackground("#eeeeee")
      .setFontColor("#666666")
      .setRanges([sheet.getRange(2, 1, validationRows - 1, 1)])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Concluído")
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setRanges([sheet.getRange(2, 14, validationRows - 1, 1)])
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
  };
  return priorities[queue] || { rank: 5, label: "Normal" };
}

function compararItensCentral_(left, right) {
  const rankDifference =
    left.priority.rank - right.priority.rank;
  if (rankDifference) return rankDifference;

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

  return greeting +
    "Obrigada pela mensagem. Responda primeiro ao ponto que a paciente trouxe e, depois, faça no máximo uma pergunta útil para avançar.";
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

  if (mensagemComercialNaoPacienteCentral_(normalized)) {
    return false;
  }

  return true;
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
  return /(?:estamos|estou) com (?:uma )?oferta especial|(?:somos|falo) da (?:empresa|agencia)|servico de (?:marketing|trafego|divulgacao)|gestao de trafego|apresentar (?:uma )?(?:proposta|solucao comercial)|parceria comercial|aumentar (?:seus|os) (?:clientes|agendamentos|resultados)/.test(
    normalized,
  );
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
