const AGENDA_CUIDADOS_CONFIG = Object.freeze({
  diasAntecedenciaAniversario: 7,
  diasAntecedenciaAgenda: 7,
  horarioAniversario: "10:30",
  horarioChecagemPosConsulta: "11:00",
  horarioRevisaoComercial: "11:30",
  diasRevisaoComercial: 15,
  diasAntecedenciaRevisaoComercial: 7,
  diasMaximosBackfillRevisaoComercial: 45,
  horarioFollowUpDecisao: "16:30",
  horarioRetomadaCirurgica: "10:30",
  horarioRetomadaRegular: "16:30",
  horarioClienteAntigo: "16:30",
  horarioOrganizarJornada: "17:00",
  postConsultAutomaticEnabled: false,
});

function diagnosticarAgendaCuidados() {
  const arquivo = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const planilha = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaConsultas,
  );

  if (!planilha) {
    throw new Error("A aba Consultas não foi encontrada.");
  }

  const agenda = criarAgendaCuidadosConsultas_(
    planilha,
    new Date(),
  );
  const resultado = {
    ok: true,
    cuidadosHoje: agenda.filter(function (item) {
      return !item.futuro;
    }).length,
    proximosSeteDias: agenda.filter(function (item) {
      return item.futuro;
    }).length,
    categorias: agenda.reduce(function (contagem, item) {
      contagem[item.categoria] =
        (contagem[item.categoria] || 0) + 1;
      return contagem;
    }, {}),
  };

  console.log(JSON.stringify(resultado));
  return resultado;
}

function criarAgendaCuidadosConsultas_(planilha, agora) {
  if (!planilha || planilha.getLastRow() < 2) return [];

  const valores = planilha.getDataRange().getValues();
  const colunas = mapearCabecalhosAgendaCuidados_(valores[0]);
  const hoje = formatarDataRetomadas_(agora, "yyyy-MM-dd");
  const inicioHoje = new Date(`${hoje}T09:00:00-03:00`);
  const fimHoje = new Date(`${hoje}T19:00:00-03:00`);
  const itens = [];
  const chaves = new Set();
  let preferencesByPhone = {};

  if (
    typeof carregarPreferenciasContatoPorTelefone_ ===
      "function" &&
    typeof planilha.getParent === "function"
  ) {
    const parent = planilha.getParent();
    const leadsSheet = parent
      ? parent.getSheetByName(RETOMADAS_CONFIG.planilhaLeads)
      : null;
    preferencesByPhone =
      carregarPreferenciasContatoPorTelefone_(leadsSheet);
  }

  function adicionar(item) {
    const chave = [
      item.categoria,
      item.telefone || item.nome,
      item.dataReferencia || hoje,
    ].join("|");

    if (chaves.has(chave)) return;
    chaves.add(chave);
    itens.push(item);
  }

  valores.slice(1).forEach(function (linha) {
    const telefone = normalizarTelefoneRetomadas_(
      valorAgendaCuidados_(linha, colunas, [
        "telefone e 164",
        "telefone",
      ]),
    );
    const nomeCompleto = textoAgendaCuidados_(
      valorAgendaCuidados_(linha, colunas, [
        "nome do paciente",
        "paciente",
        "nome",
      ]),
    );

    if (!telefone && !nomeCompleto) return;

    const contactPreferences = telefone
      ? preferencesByPhone[telefone] || {}
      : {};

    const consentimento = valorAgendaCuidados_(
      linha,
      colunas,
      ["consentimento para contato"],
    );
    const motivoSupressao = textoAgendaCuidados_(
      valorAgendaCuidados_(linha, colunas, [
        "motivo de supressao",
      ]),
    );
    const status = normalizarTextoRetomadas_(
      valorAgendaCuidados_(linha, colunas, ["status"]),
    );
    const naoCompareceu = [
      "nao compareceu",
      "consulta nao compareceu",
    ].includes(status);
    const primeiroNome =
      nomeCompleto.split(/\s+/)[0] || "paciente";
    const profissional =
      textoAgendaCuidados_(
        valorAgendaCuidados_(linha, colunas, [
          "profissional",
        ]),
      ) || "Dra. Amanda";
    const tema = textoAgendaCuidados_(
      valorAgendaCuidados_(linha, colunas, [
        "tema procedimento",
      ]),
    );
    const proximaAcao = textoAgendaCuidados_(
      valorAgendaCuidados_(linha, colunas, [
        "proxima acao",
      ]),
    );
    const retomadasEncerradas = normalizarTextoRetomadas_(
      valorAgendaCuidados_(linha, colunas, [
        "retomadas encerradas",
      ]),
    );
    const retomadaEncerrada = [
      "sim",
      "true",
      "verdadeiro",
      "encerrada",
      "encerrado",
    ].includes(retomadasEncerradas);
    const identidade = nomeCompleto || telefone;

    adicionarRevisaoComercialAgendaCuidados_({
      linha: linha,
      colunas: colunas,
      agora: agora,
      hoje: hoje,
      telefone: telefone,
      nome: identidade,
      tema: tema,
      status: status,
      adicionar: adicionar,
    });

    if (
      !contatoPermitidoAgendaCuidados_(consentimento) ||
      (motivoSupressao && !naoCompareceu)
    ) {
      return;
    }

    if (contactPreferences.neverFollowUp !== true) {
      adicionarAniversarioAgendaCuidados_({
        linha: linha,
        colunas: colunas,
        agora: agora,
        hoje: hoje,
        telefone: telefone,
        nome: identidade,
        primeiroNome: primeiroNome,
        adicionar: adicionar,
      });
    }

    adicionarLembretesConsultaAgendaCuidados_({
      linha: linha,
      colunas: colunas,
      agora: agora,
      hoje: hoje,
      inicioHoje: inicioHoje,
      fimHoje: fimHoje,
      telefone: telefone,
      nome: identidade,
      nomePaciente: nomeCompleto,
      profissional: profissional,
      status: status,
      neverBotReply:
        contactPreferences.neverBotReply === true,
      adicionar: adicionar,
    });

    if (contactPreferences.neverFollowUp !== true) {
      adicionarNaoComparecimentoAgendaCuidados_({
        linha: linha,
        colunas: colunas,
        agora: agora,
        hoje: hoje,
        telefone: telefone,
        nome: identidade,
        primeiroNome: primeiroNome,
        profissional: profissional,
        status: status,
        neverBotReply:
          contactPreferences.neverBotReply === true,
        adicionar: adicionar,
      });

      adicionarPosConsultaAgendaCuidados_({
        linha: linha,
        colunas: colunas,
        agora: agora,
        hoje: hoje,
        inicioHoje: inicioHoje,
        fimHoje: fimHoje,
        telefone: telefone,
        nome: identidade,
        primeiroNome: primeiroNome,
        tema: tema,
        status: status,
        adicionar: adicionar,
      });

      adicionarFollowUpConsultaAgendaCuidados_({
        linha: linha,
        colunas: colunas,
        agora: agora,
        hoje: hoje,
        telefone: telefone,
        nome: identidade,
        primeiroNome: primeiroNome,
        tema: tema,
        status: status,
        proximaAcao: proximaAcao,
        retomadaEncerrada: retomadaEncerrada,
        adicionar: adicionar,
      });

      adicionarRetomadaPlanejadaAgendaCuidados_({
        linha: linha,
        colunas: colunas,
        hoje: hoje,
        telefone: telefone,
        nome: identidade,
        primeiroNome: primeiroNome,
        status: status,
        proximaAcao: proximaAcao,
        retomadaEncerrada: retomadaEncerrada,
        adicionar: adicionar,
      });

      adicionarClienteAntigoAgendaCuidados_({
        linha: linha,
        colunas: colunas,
        agora: agora,
        hoje: hoje,
        telefone: telefone,
        nome: identidade,
        primeiroNome: primeiroNome,
        tema: tema,
        status: status,
        retomadaEncerrada: retomadaEncerrada,
        adicionar: adicionar,
      });
    }
  });

  return itens.sort(function (a, b) {
    if (a.futuro !== b.futuro) return a.futuro ? 1 : -1;
    if (a.prioridade !== b.prioridade) {
      return a.prioridade - b.prioridade;
    }
    return String(a.horario).localeCompare(String(b.horario));
  });
}

function adicionarAniversarioAgendaCuidados_(entrada) {
  const dataNascimento = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data de nascimento"],
    ),
  );
  const aniversarioAtivo = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["aniversario pelo bot"],
  );
  const ultimoAniversario = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["ultimo aniversario contatado"],
    ),
  );

  if (
    !dataNascimento ||
    !valorExplicitamenteAtivoAgendaCuidados_(
      aniversarioAtivo,
    )
  ) {
    return;
  }

  const proximoAniversario =
    proximoAniversarioAgendaCuidados_(
      dataNascimento,
      entrada.agora,
    );
  const diasAte = diferencaDiasLocaisRetomadas_(
    entrada.agora,
    proximoAniversario,
  );
  const jaContatadoNesteAno =
    ultimoAniversario &&
    formatarDataRetomadas_(ultimoAniversario, "yyyy") ===
      formatarDataRetomadas_(proximoAniversario, "yyyy");

  if (
    jaContatadoNesteAno ||
    diasAte < 0 ||
    diasAte >
      AGENDA_CUIDADOS_CONFIG.diasAntecedenciaAniversario
  ) {
    return;
  }

  entrada.adicionar({
    categoria: "Aniversário",
    telefone: entrada.telefone,
    nome: entrada.nome,
    horario:
      diasAte === 0
        ? AGENDA_CUIDADOS_CONFIG.horarioAniversario
        : "",
    dataReferencia: formatarDataRetomadas_(
      proximoAniversario,
      "yyyy-MM-dd",
    ),
    contexto:
      diasAte === 0
        ? "Mensagem de cuidado, sem oferta comercial."
        : "Aniversário em " +
          formatarDataRetomadas_(
            proximoAniversario,
            "dd/MM",
          ) +
          " — preparar uma mensagem pessoal.",
    responsavel: "Amanda/equipe",
    automatico: false,
    futuro: diasAte > 0,
    prioridade: diasAte === 0 ? 4 : 9,
    sugestao:
      "Oi, " +
      entrada.primeiroNome +
      "! Passando para desejar um feliz aniversário. Que seu novo ciclo seja leve, saudável e cheio de bons momentos. Um carinho da equipe da Clínica LIV.",
  });
}

function adicionarLembretesConsultaAgendaCuidados_(entrada) {
  const consulta = combinarDataHorarioAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data agendada"],
    ),
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["horario agendado"],
    ),
  );

  if (
    !consulta ||
    consulta.getTime() <= entrada.agora.getTime() ||
    !statusPermiteAgendaConsulta_(entrada.status)
  ) {
    return;
  }

  const lembretePrincipalEnviado = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["lembrete 48h enviado"],
  );
  const lembreteNoDiaEnviado = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["lembrete no dia enviado"],
  );
  const ultimaTentativa = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["ultima tentativa de lembrete"],
  );
  const erroLembrete = textoAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["erro do lembrete"],
    ),
  );
  const appointmentKey = formatarDataRetomadas_(
    consulta,
    "yyyy-MM-dd HH:mm",
  );
  const cancelledAppointment =
    normalizarChaveAgendamentoMonitorado_(
      valorAgendaCuidados_(entrada.linha, entrada.colunas, [
        "agendamento do lembrete cancelado",
      ]),
    );

  if (
    lembretePrincipalEnviado ||
    lembreteNoDiaEnviado ||
    cancelledAppointment === appointmentKey
  ) {
    return;
  }

  const alvo = horarioAlvoLembretePrincipalConsulta_(consulta);
  const limiteAgenda = new Date(
    entrada.fimHoje.getTime() +
      AGENDA_CUIDADOS_CONFIG.diasAntecedenciaAgenda *
        24 *
        60 *
        60 *
        1000,
  );

  if (alvo.getTime() > limiteAgenda.getTime()) return;

  const patientData = validarDadosPacienteLembreteConsulta_({
    phone: entrada.telefone,
    name: entrada.nomePaciente,
  });

  if (ultimaTentativa) {
    entrada.adicionar({
      categoria: "Lembrete de consulta — revisão humana",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: "",
      dataReferencia: entrada.hoje,
      contexto:
        "Já existe uma tentativa registrada" +
        (erroLembrete ? ` (${erroLembrete})` : "") +
        ". Não reenviar automaticamente; conferir o provedor e o histórico antes de decidir.",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: false,
      prioridade: 1,
      sugestao: "",
    });
    return;
  }

  if (!patientData.ok) {
    entrada.adicionar({
      categoria: "Lembrete de consulta — completar cadastro",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: "",
      dataReferencia:
        alvo.getTime() > entrada.fimHoje.getTime()
          ? formatarDataRetomadas_(alvo, "yyyy-MM-dd")
          : entrada.hoje,
      contexto:
        "Automação bloqueada: " +
        (patientData.reason === "missing_valid_phone"
          ? "telefone E.164 ausente ou inválido."
          : "nome confiável da paciente ausente.") +
        " Corrigir o cadastro e reconciliar Consultas/Calendar antes de qualquer envio.",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: alvo.getTime() > entrada.fimHoje.getTime(),
      prioridade: 1,
      sugestao: "",
    });
    return;
  }

  const calendarId = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["id da agenda google"],
  );
  const calendarEventId = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["id do evento google"],
  );
  const scheduleVerification =
    validarVinculoAgendaLembreteConsulta_(
      {
        appointment: consulta,
        consultationType: valorAgendaCuidados_(
          entrada.linha,
          entrada.colunas,
          ["tipo de consulta"],
        ),
        location: valorAgendaCuidados_(
          entrada.linha,
          entrada.colunas,
          ["local modalidade"],
        ),
        calendarId: calendarId,
        calendarEventId: calendarEventId,
        calendarSyncStatus: valorAgendaCuidados_(
          entrada.linha,
          entrada.colunas,
          ["sincronizacao google agenda"],
        ),
      },
      typeof CalendarApp !== "undefined" ? CalendarApp : null,
    );

  if (!scheduleVerification.ok) {
    entrada.adicionar({
      categoria: "Lembrete de consulta — reconciliar agenda",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: "",
      dataReferencia:
        alvo.getTime() > entrada.fimHoje.getTime()
          ? formatarDataRetomadas_(alvo, "yyyy-MM-dd")
          : entrada.hoje,
      contexto:
        "Automação bloqueada: a data e o horário de Consultas não têm vínculo vivo e coincidente comprovado no Google Agenda (" +
        descreverBloqueioAgendaLembreteConsulta_(
          scheduleVerification.reason,
        ) +
        "). Reconciliar os dois sistemas antes de qualquer envio.",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: alvo.getTime() > entrada.fimHoje.getTime(),
      prioridade: 1,
      sugestao: "",
    });
    return;
  }

  const manualOnly = entrada.neverBotReply === true;
  const reminderCancellationUrl =
    linkCancelamentoLembreteConsulta_({
      appointmentId: valorAgendaCuidados_(
        entrada.linha,
        entrada.colunas,
        ["id da consulta"],
      ),
      appointmentKey: appointmentKey,
      calendarId: calendarId,
      calendarEventId: calendarEventId,
    });
  const reminderSuggestion =
    "Oi, " +
    patientData.firstName +
    "! Passando para lembrar da sua consulta com " +
    entrada.profissional +
    " em " +
    formatarDataRetomadas_(consulta, "dd/MM/yyyy") +
    " às " +
    formatarDataRetomadas_(consulta, "HH:mm") +
    ". O endereço é Rua Pais Leme, 215, Pinheiros, São Paulo. " +
    "Google Maps: https://maps.google.com/?q=Rua+Pais+Leme,+215,+Pinheiros,+Sao+Paulo. " +
    "Se precisar de alguma orientação antes, estamos por aqui.";

  const lembretes = planejarLembretesConsultaHoje_({
    agora: entrada.agora,
    consulta: consulta,
    inicioHoje: entrada.inicioHoje,
    fimHoje: entrada.fimHoje,
    lembretePrincipalEnviado: lembretePrincipalEnviado,
    lembreteNoDiaEnviado: lembreteNoDiaEnviado,
    ultimaTentativa: ultimaTentativa,
  });

  if (lembretes.length) {
    entrada.adicionar({
      categoria: "Lembrete de consulta",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: lembretes[0].horario,
      dataReferencia: entrada.hoje,
      contexto:
        formatarDataRetomadas_(
          consulta,
          "dd/MM/yyyy HH:mm",
        ) +
        " com " +
        entrada.profissional +
        " — " +
        lembretes
          .map(function (lembrete) {
            return lembrete.rotulo + " às " + lembrete.horario;
          })
          .join("; "),
      responsavel: manualOnly
        ? "Amanda/equipe"
        : "Bruna/automação",
      automatico: !manualOnly,
      futuro: false,
      prioridade: 2,
      sugestao: reminderSuggestion,
      cancelamentoLembreteUrl: reminderCancellationUrl,
    });
  }

  planejarLembretesConsultaFuturos_({
    agora: entrada.agora,
    consulta: consulta,
    fimHoje: entrada.fimHoje,
    lembretePrincipalEnviado: lembretePrincipalEnviado,
    lembreteNoDiaEnviado: lembreteNoDiaEnviado,
    ultimaTentativa: ultimaTentativa,
  }).forEach(function (lembrete) {
    entrada.adicionar({
      categoria: "Lembrete de consulta programado",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: lembrete.horario,
      dataReferencia: lembrete.dataReferencia,
      contexto:
        lembrete.rotulo +
        " em " +
        formatarDataRetomadas_(
          lembrete.dataHora,
          "dd/MM/yyyy",
        ) +
        " às " +
        lembrete.horario +
        " — consulta em " +
        formatarDataRetomadas_(
          consulta,
          "dd/MM/yyyy HH:mm",
        ) +
        " com " +
        entrada.profissional +
        ".",
      responsavel: manualOnly
        ? "Amanda/equipe"
        : "Bruna/automação",
      automatico: !manualOnly,
      futuro: true,
      prioridade: 8,
      sugestao: reminderSuggestion,
      cancelamentoLembreteUrl: reminderCancellationUrl,
    });
  });
}

function adicionarNaoComparecimentoAgendaCuidados_(entrada) {
  if (
    ![
      "nao compareceu",
      "consulta nao compareceu",
    ].includes(entrada.status)
  ) {
    return;
  }

  const noShowAt = dataAgendaCuidados_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "nao comparecimento registrado em",
    ]),
  );
  const eligibleAt = dataAgendaCuidados_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "retomada de ausencia elegivel em",
    ]),
  );
  const sentAt = dataAgendaCuidados_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "retomada de ausencia enviada",
    ]),
  );
  const suppressedAt = dataAgendaCuidados_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "retomada de ausencia suprimida em",
    ]),
  );
  const manualAt = dataAgendaCuidados_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "retomada manual de ausencia sugerida em",
    ]),
  );
  const lastHumanAt = dataAgendaCuidados_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "ultima interacao humana",
    ]),
  );
  const lastError = normalizarTextoRetomadas_(
    valorAgendaCuidados_(entrada.linha, entrada.colunas, [
      "erro na retomada de ausencia",
    ]),
  );

  if (
    suppressedAt ||
    (noShowAt &&
      lastHumanAt &&
      lastHumanAt.getTime() >= noShowAt.getTime())
  ) {
    return;
  }

  const manualRequired = Boolean(
    manualAt ||
      entrada.neverBotReply ||
      /manual|whatsapp window closed/.test(lastError),
  );
  if (sentAt && !manualAt) return;

  const target = manualAt || eligibleAt;
  if (!target) return;

  const targetDate = formatarDataRetomadas_(target, "yyyy-MM-dd");
  const future = targetDate > entrada.hoje;
  const professionalArticle =
    normalizarTextoRetomadas_(entrada.profissional).includes("daniel")
      ? "o "
      : "a ";
  const suggestion =
    "Oi, " +
    entrada.primeiroNome +
    ". Sentimos sua falta na consulta e esperamos que esteja tudo bem. " +
    "Se ainda fizer sentido para você, posso te ajudar a encontrar um novo horário com " +
    professionalArticle +
    entrada.profissional +
    ", com calma.";

  entrada.adicionar({
    categoria: manualRequired
      ? "Não comparecimento — retomada humana"
      : "Não comparecimento — acolhimento",
    telefone: entrada.telefone,
    nome: entrada.nome,
    horario: future
      ? ""
      : formatarDataRetomadas_(target, "HH:mm"),
    dataReferencia: targetDate,
    contexto: sentAt
      ? "Não houve resposta após o primeiro acolhimento; avaliar uma última retomada manual para reagendamento."
      : manualRequired
        ? "Retomar manualmente, sem cobrança e sem mencionar penalidade."
        : "Primeiro acolhimento após ausência; o sistema revalida a janela do WhatsApp antes do envio.",
    responsavel: manualRequired
      ? "Amanda/equipe"
      : "Bruna/automação",
    automatico: !manualRequired,
    futuro: future,
    prioridade: manualRequired ? 2 : 3,
    sugestao: suggestion,
  });
}

function adicionarPosConsultaAgendaCuidados_(entrada) {
  if (!statusConsultaRealizadaAgenda_(entrada.status)) return;

  const dataRealizada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data realizada", "data da consulta realizada"],
    ),
  );
  const posElegivelEm = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["pos consulta elegivel em"],
    ),
  );
  const posEnviado = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["pos consulta enviado"],
  );
  const posSuprimido = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["pos consulta suprimido em"],
  );
  const erroPosConsulta = textoAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["erro pos consulta"],
    ),
  );
  const aguardandoAtivacao =
    !AGENDA_CUIDADOS_CONFIG.postConsultAutomaticEnabled ||
    /disabled|template|configuration|http_400/i.test(
      erroPosConsulta,
    );
  const horasDesdeElegibilidade = posElegivelEm
    ? (entrada.agora.getTime() - posElegivelEm.getTime()) /
      (60 * 60 * 1000)
    : null;
  const diasDesdeConsulta = dataRealizada
    ? diferencaDiasLocaisRetomadas_(
        dataRealizada,
        entrada.agora,
      )
    : null;

  if (
    dataRealizada &&
    diasDesdeConsulta >= 0 &&
    diasDesdeConsulta <= 1 &&
    posElegivelEm &&
    posElegivelEm.getTime() <= entrada.fimHoje.getTime() &&
    horasDesdeElegibilidade <= 48 &&
    !posEnviado &&
    !posSuprimido
  ) {
    entrada.adicionar({
      categoria: aguardandoAtivacao
        ? "Pós-consulta aguardando ativação"
        : "Pós-consulta automático",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: horarioSeguroAgendaCuidados_(
        posElegivelEm,
        entrada.inicioHoje,
        entrada.fimHoje,
      ),
      dataReferencia: entrada.hoje,
      contexto:
        "Checagem inicial de acolhimento após a consulta" +
        (entrada.tema ? " sobre " + entrada.tema : "") +
        (aguardandoAtivacao
          ? " — automação ainda indisponível; revisar para contato manual."
          : "."),
      responsavel: aguardandoAtivacao
        ? "Amanda/equipe"
        : "Bruna/automação",
      automatico: !aguardandoAtivacao,
      futuro: false,
      prioridade: aguardandoAtivacao ? 1 : 3,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Depois da sua avaliação" +
        (entrada.tema ? " sobre " + entrada.tema : "") +
        ", queria saber se surgiu alguma dúvida ao pensar com mais calma. Se houver algum ponto que você queira retomar, posso continuar por ele.",
    });
  }

  const checagemAtiva = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["checagem pos consulta"],
  );
  const dataChecagem = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data prevista da checagem"],
    ),
  );
  const checagemRealizada = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["data da checagem realizada"],
  );

  if (
    valorAtivoAgendaCuidados_(checagemAtiva) &&
    dataChecagem &&
    formatarDataRetomadas_(dataChecagem, "yyyy-MM-dd") <=
      entrada.hoje &&
    !checagemRealizada
  ) {
    entrada.adicionar({
      categoria: "Checagem humana pós-consulta",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario:
        AGENDA_CUIDADOS_CONFIG.horarioChecagemPosConsulta,
      dataReferencia: entrada.hoje,
      contexto:
        "Confirmar se ficaram dúvidas e se a paciente se sentiu bem orientada.",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: false,
      prioridade: 1,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Passando para saber como você ficou depois da consulta e se surgiu alguma dúvida. Queremos que você se sinta tranquila e bem orientada em cada etapa.",
    });
  }
}

function resultadoComercialAgendaCuidados_(value) {
  if (typeof resultadoComercialCanonicoConsulta_ === "function") {
    return resultadoComercialCanonicoConsulta_(value);
  }
  const normalized = normalizarTextoRetomadas_(value);
  const aliases = {
    "": "Pendente",
    pendente: "Pendente",
    "procedimento fechado": "Procedimento fechado",
    fechou: "Procedimento fechado",
    "nao fechou": "Não fechou",
    "ainda decidindo": "Ainda decidindo",
    "nao foi possivel confirmar": "Não foi possível confirmar",
  };
  return aliases[normalized] || "";
}

function calcularRevisaoComercialAgendaCuidados_(completedAt) {
  if (typeof calcularRevisaoComercialEm_ === "function") {
    return calcularRevisaoComercialEm_(completedAt);
  }
  const localDate = formatarDataRetomadas_(
    completedAt,
    "yyyy-MM-dd",
  );
  const localNoon = new Date(`${localDate}T12:00:00-03:00`);
  const target = new Date(
    localNoon.getTime() +
      AGENDA_CUIDADOS_CONFIG.diasRevisaoComercial *
        24 *
        60 *
        60 *
        1000,
  );
  return new Date(
    formatarDataRetomadas_(target, "yyyy-MM-dd") +
      "T" +
      AGENDA_CUIDADOS_CONFIG.horarioRevisaoComercial +
      ":00-03:00",
  );
}

function adicionarRevisaoComercialAgendaCuidados_(entrada) {
  if (!statusConsultaRealizadaAgenda_(entrada.status)) return;

  const dataRealizada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data realizada", "data da consulta realizada"],
    ),
  );
  if (!dataRealizada) return;

  const revisaoConcluida = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["revisao comercial concluida em"],
    ),
  );
  if (revisaoConcluida) return;

  const resultado = resultadoComercialAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["resultado comercial"],
    ),
  );
  const proximaRevisao = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["proxima revisao comercial"],
    ),
  );
  const revisaoPersistida = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["revisao comercial prevista em"],
    ),
  );
  const diasDesdeConsulta = diferencaDiasLocaisRetomadas_(
    dataRealizada,
    entrada.agora,
  );
  if (
    !revisaoPersistida &&
    diasDesdeConsulta >
      AGENDA_CUIDADOS_CONFIG.diasMaximosBackfillRevisaoComercial
  ) {
    return;
  }

  const target =
    resultado === "Ainda decidindo" && proximaRevisao
      ? proximaRevisao
      : revisaoPersistida ||
        calcularRevisaoComercialAgendaCuidados_(dataRealizada);
  if (!target) return;
  const targetDate = formatarDataRetomadas_(target, "yyyy-MM-dd");
  const daysUntilTarget = diferencaDiasLocaisRetomadas_(
    new Date(`${entrada.hoje}T12:00:00-03:00`),
    target,
  );
  if (
    daysUntilTarget >
      AGENDA_CUIDADOS_CONFIG.diasAntecedenciaRevisaoComercial
  ) {
    return;
  }

  const error = textoAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["erro da revisao comercial"],
    ),
  );
  const closedProcedure = textoAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["procedimento fechado"],
    ),
  );
  const contextParts = [
    "Checagem interna: confirmar se houve fechamento e registrar Resultado comercial, Procedimento fechado, Data do fechamento e Valor fechado (R$) na aba Consultas.",
    "Não enviar mensagem automática à paciente.",
  ];
  if (entrada.tema) {
    contextParts.push("Tema da consulta: " + entrada.tema + ".");
  }
  if (closedProcedure) {
    contextParts.push(
      "Procedimento informado no fechamento: " +
        closedProcedure +
        ".",
    );
  }
  if (resultado === "Ainda decidindo" && !proximaRevisao) {
    contextParts.push(
      "Como o resultado está em Ainda decidindo, informe uma Próxima revisão comercial.",
    );
  }
  if (error) contextParts.push("Pendência: " + error);

  entrada.adicionar({
    categoria: "Conferir fechamento pós-consulta — D+15",
    telefone: entrada.telefone,
    nome: entrada.nome,
    horario: formatarDataRetomadas_(target, "HH:mm") ||
      AGENDA_CUIDADOS_CONFIG.horarioRevisaoComercial,
    dataReferencia: targetDate,
    contexto: contextParts.join(" "),
    responsavel: "Amanda/equipe",
    automatico: false,
    // `futuro` separa dias futuros das ações do dia. Uma revisão marcada
    // para 11:30 precisa aparecer em "hoje" já no e-mail das 8h.
    futuro: targetDate > entrada.hoje,
    prioridade: 1,
    sugestao: "",
  });
}

function adicionarFollowUpConsultaAgendaCuidados_(entrada) {
  if (
    !statusConsultaRealizadaAgenda_(entrada.status) ||
    entrada.retomadaEncerrada
  ) {
    return;
  }

  const dataRealizada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data realizada", "data da consulta realizada"],
    ),
  );
  const checagemRealizada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data da checagem realizada"],
    ),
  );
  const checagemPlanejada =
    valorExplicitamenteAtivoAgendaCuidados_(
      valorAgendaCuidados_(
        entrada.linha,
        entrada.colunas,
        ["checagem pos consulta"],
      ),
    ) ||
    Boolean(
      dataAgendaCuidados_(
        valorAgendaCuidados_(
          entrada.linha,
          entrada.colunas,
          ["data prevista da checagem"],
        ),
      ),
    );
  const ultimaRetomada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["ultima retomada"],
    ),
  );
  const dataRetomadaExplicita = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data da proxima retomada"],
    ),
  );

  if (!dataRealizada || dataRetomadaExplicita) return;

  const diasDesdeConsulta = diferencaDiasLocaisRetomadas_(
    dataRealizada,
    entrada.agora,
  );
  const contatoDepoisDaConsulta =
    checagemRealizada ||
    (ultimaRetomada &&
      ultimaRetomada.getTime() >= dataRealizada.getTime());

  if (
    diasDesdeConsulta >= 3 &&
    diasDesdeConsulta <= 5 &&
    !checagemPlanejada &&
    !contatoDepoisDaConsulta
  ) {
    entrada.adicionar({
      categoria: "Follow-up pós-consulta — 3 dias",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario:
        AGENDA_CUIDADOS_CONFIG.horarioChecagemPosConsulta,
      dataReferencia: entrada.hoje,
      contexto:
        "Contato humano de acolhimento e esclarecimento" +
        (entrada.tema ? " sobre " + entrada.tema : "") +
        ".",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: false,
      prioridade: 2,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Depois da sua avaliação" +
        (entrada.tema ? " sobre " + entrada.tema : "") +
        ", queria saber se surgiu alguma dúvida ao pensar com mais calma. Se houver algum ponto que você queira retomar, posso continuar por ele.",
    });
    return;
  }

  const houveContatoRecente =
    ultimaRetomada &&
    diferencaDiasLocaisRetomadas_(
      ultimaRetomada,
      entrada.agora,
    ) < 7;
  const avaliandoProximoPasso =
    /pens|avali|decid|cirurg|orcament|proximo passo|retom/.test(
      normalizarTextoRetomadas_(entrada.proximaAcao),
    );

  if (
    diasDesdeConsulta >= 14 &&
    diasDesdeConsulta <= 17 &&
    !houveContatoRecente &&
    avaliandoProximoPasso
  ) {
    entrada.adicionar({
      categoria: "Follow-up pós-consulta — 14 dias",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario:
        AGENDA_CUIDADOS_CONFIG.horarioFollowUpDecisao,
      dataReferencia: entrada.hoje,
      contexto:
        "Retomada humana tardia, sem pressão, para dúvidas ou organização do próximo passo" +
        (entrada.tema ? " sobre " + entrada.tema : "") +
        ".",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: false,
      prioridade: 5,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Queria retomar nossa conversa" +
        (entrada.tema ? " sobre " + entrada.tema : "") +
        ". Ficou alguma dúvida ou algum ponto da avaliação que seria útil esclarecer? Se ainda estiver pensando, fique à vontade para responder quando fizer sentido.",
    });
  }
}

function adicionarRetomadaPlanejadaAgendaCuidados_(entrada) {
  const dataRetomada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data da proxima retomada"],
    ),
  );
  const retomadaAtiva = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["retomada pelo bot"],
  );
  const contextoCirurgico =
    /cirurg|hospital|pre.?oper|exame|retorno/.test(
      normalizarTextoRetomadas_(entrada.proximaAcao),
    );
  const diasAteRetomada = dataRetomada
    ? diferencaDiasLocaisRetomadas_(
        new Date(`${entrada.hoje}T12:00:00-03:00`),
        dataRetomada,
      )
    : null;

  if (
    dataRetomada &&
    diasAteRetomada > 0 &&
    diasAteRetomada <=
      AGENDA_CUIDADOS_CONFIG.diasAntecedenciaAgenda &&
    valorAtivoAgendaCuidados_(retomadaAtiva) &&
    !entrada.retomadaEncerrada
  ) {
    entrada.adicionar({
      categoria: contextoCirurgico
        ? "Jornada cirúrgica programada"
        : "Retomada manual programada",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: contextoCirurgico
        ? AGENDA_CUIDADOS_CONFIG.horarioRetomadaCirurgica
        : AGENDA_CUIDADOS_CONFIG.horarioRetomadaRegular,
      dataReferencia: formatarDataRetomadas_(
        dataRetomada,
        "yyyy-MM-dd",
      ),
      contexto:
        "Contato manual previsto para " +
        formatarDataRetomadas_(dataRetomada, "dd/MM/yyyy") +
        " às " +
        (contextoCirurgico
          ? AGENDA_CUIDADOS_CONFIG.horarioRetomadaCirurgica
          : AGENDA_CUIDADOS_CONFIG.horarioRetomadaRegular) +
        " — " +
        (entrada.proximaAcao ||
          "retomada registrada na aba Consultas") +
        ".",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: true,
      prioridade: contextoCirurgico ? 6 : 8,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Passando para acompanhar o próximo passo que combinamos na consulta. Se quiser, posso retomar os detalhes com você e organizar o que ainda falta, com calma.",
    });
  }

  if (
    dataRetomada &&
    formatarDataRetomadas_(dataRetomada, "yyyy-MM-dd") <=
      entrada.hoje &&
    valorAtivoAgendaCuidados_(retomadaAtiva) &&
    !entrada.retomadaEncerrada
  ) {
    entrada.adicionar({
      categoria: contextoCirurgico
        ? "Jornada cirúrgica"
        : "Retomada planejada",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario: contextoCirurgico
        ? AGENDA_CUIDADOS_CONFIG.horarioRetomadaCirurgica
        : AGENDA_CUIDADOS_CONFIG.horarioRetomadaRegular,
      dataReferencia: entrada.hoje,
      contexto:
        entrada.proximaAcao ||
        "Retomada registrada na aba Consultas.",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: false,
      prioridade: contextoCirurgico ? 1 : 5,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Queria retomar o próximo passo que combinamos na consulta. Ficou alguma dúvida ou há algum detalhe que você gostaria de organizar por aqui?",
    });
  }

  if (
    statusConsultaRealizadaAgenda_(entrada.status) &&
    entrada.proximaAcao &&
    contextoCirurgico &&
    !dataRetomada &&
    !entrada.retomadaEncerrada
  ) {
    entrada.adicionar({
      categoria: "Jornada cirúrgica — organizar",
      telefone: entrada.telefone,
      nome: entrada.nome,
      horario:
        AGENDA_CUIDADOS_CONFIG.horarioOrganizarJornada,
      dataReferencia: entrada.hoje,
      contexto:
        entrada.proximaAcao +
        " — falta registrar a data do próximo contato.",
      responsavel: "Amanda/equipe",
      automatico: false,
      futuro: false,
      prioridade: 6,
      sugestao:
        "Oi, " +
        entrada.primeiroNome +
        "! Queria retomar o próximo passo que conversamos na consulta. Antes de avançarmos, ficou alguma dúvida ou há algum detalhe que seria útil esclarecer?",
    });
  }
}

function adicionarClienteAntigoAgendaCuidados_(entrada) {
  if (
    !statusConsultaRealizadaAgenda_(entrada.status) ||
    entrada.retomadaEncerrada
  ) {
    return;
  }

  const dataRealizada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data realizada", "data da consulta realizada"],
    ),
  );
  const ultimaRetomada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["ultima retomada"],
    ),
  );
  const proximaRetomada = dataAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["data da proxima retomada"],
    ),
  );
  const retomadaAtiva = valorAgendaCuidados_(
    entrada.linha,
    entrada.colunas,
    ["retomada pelo bot"],
  );
  const periodicidade = textoAgendaCuidados_(
    valorAgendaCuidados_(
      entrada.linha,
      entrada.colunas,
      ["periodicidade da retomada"],
    ),
  );

  if (
    !dataRealizada ||
    proximaRetomada ||
    (!valorExplicitamenteAtivoAgendaCuidados_(
      retomadaAtiva,
    ) &&
      !periodicidade)
  ) {
    return;
  }

  const base = ultimaRetomada || dataRealizada;
  const diasDesdeBase = diferencaDiasLocaisRetomadas_(
    base,
    entrada.agora,
  );
  const intervalo =
    interpretarPeriodicidadeAgendaCuidados_(periodicidade) ||
    (ultimaRetomada ? null : 180);

  if (
    !intervalo ||
    diasDesdeBase < intervalo ||
    diasDesdeBase > intervalo + 7
  ) {
    return;
  }

  entrada.adicionar({
    categoria: "Cliente antigo — retomada humana",
    telefone: entrada.telefone,
    nome: entrada.nome,
    horario: AGENDA_CUIDADOS_CONFIG.horarioClienteAntigo,
    dataReferencia: entrada.hoje,
    contexto:
      "Reativação manual e personalizada após " +
      intervalo +
      " dias, sem oferta automática e sem expor o histórico clínico.",
    responsavel: "Amanda/equipe",
    automatico: false,
    futuro: false,
    prioridade: 7,
    sugestao:
      "Oi, " +
      entrada.primeiroNome +
      "! Tudo bem? Faz um tempo desde seu atendimento na Clínica LIV e quis deixar o canal aberto caso tenha surgido alguma dúvida ou você queira retomar seu acompanhamento. Se fizer sentido, posso continuar por aqui com calma.",
  });
}

function interpretarPeriodicidadeAgendaCuidados_(valor) {
  const texto = normalizarTextoRetomadas_(valor);
  if (!texto) return null;

  const numero = Number(
    (texto.match(/\d+/) || [])[0],
  );
  if (!numero) return null;

  if (/ano/.test(texto)) return numero * 365;
  if (/mes/.test(texto)) return numero * 30;
  if (/semana/.test(texto)) return numero * 7;
  if (/dia/.test(texto)) return numero;
  return null;
}

function mapearCabecalhosAgendaCuidados_(cabecalhos) {
  const resultado = {};

  cabecalhos.forEach(function (cabecalho, indice) {
    const normalizado = normalizarCabecalhoAgendaCuidados_(
      cabecalho,
    );

    if (
      normalizado &&
      resultado[normalizado] === undefined
    ) {
      resultado[normalizado] = indice;
    }
  });

  return resultado;
}

function valorAgendaCuidados_(linha, colunas, aliases) {
  for (let indice = 0; indice < aliases.length; indice += 1) {
    const coluna = colunas[aliases[indice]];
    if (coluna !== undefined) return linha[coluna];
  }
  return "";
}

function normalizarCabecalhoAgendaCuidados_(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function contatoPermitidoAgendaCuidados_(valor) {
  return ![
    "nao",
    "nao autorizado",
    "sem consentimento",
    "false",
    "falso",
    "0",
  ].includes(normalizarTextoRetomadas_(valor));
}

function valorAtivoAgendaCuidados_(valor) {
  return ![
    "nao",
    "false",
    "falso",
    "0",
    "inativo",
    "desativado",
  ].includes(normalizarTextoRetomadas_(valor));
}

function valorExplicitamenteAtivoAgendaCuidados_(valor) {
  return [
    "sim",
    "true",
    "verdadeiro",
    "1",
    "ativo",
    "ativado",
  ].includes(normalizarTextoRetomadas_(valor));
}

function textoAgendaCuidados_(valor) {
  return String(valor || "").trim();
}

function dataAgendaCuidados_(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }

  const texto = textoAgendaCuidados_(valor);
  let partes = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
  );

  if (partes) {
    return new Date(
      partes[3] +
        "-" +
        String(partes[2]).padStart(2, "0") +
        "-" +
        String(partes[1]).padStart(2, "0") +
        "T" +
        String(partes[4] || "12").padStart(2, "0") +
        ":" +
        String(partes[5] || "00").padStart(2, "0") +
        ":00-03:00",
    );
  }

  partes = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/,
  );

  if (!partes) return null;

  return new Date(
    partes[1] +
      "-" +
      partes[2] +
      "-" +
      partes[3] +
      "T" +
      String(partes[4] || "12").padStart(2, "0") +
      ":" +
      String(partes[5] || "00").padStart(2, "0") +
      ":00-03:00",
  );
}

function combinarDataHorarioAgendaCuidados_(data, horario) {
  const dataValida = dataAgendaCuidados_(data);
  if (!dataValida) return null;

  const partes = textoAgendaCuidados_(horario).match(
    /^(\d{1,2}):(\d{2})/,
  );

  if (!partes) return null;

  return new Date(
    formatarDataRetomadas_(dataValida, "yyyy-MM-dd") +
      "T" +
      String(partes[1]).padStart(2, "0") +
      ":" +
      partes[2] +
      ":00-03:00",
  );
}

function proximoAniversarioAgendaCuidados_(
  dataNascimento,
  agora,
) {
  const ano = Number(formatarDataRetomadas_(agora, "yyyy"));
  const mesDia = formatarDataRetomadas_(
    dataNascimento,
    "MM-dd",
  );
  let aniversario = new Date(
    `${ano}-${mesDia}T12:00:00-03:00`,
  );

  if (
    formatarDataRetomadas_(aniversario, "yyyy-MM-dd") <
    formatarDataRetomadas_(agora, "yyyy-MM-dd")
  ) {
    aniversario = new Date(
      `${ano + 1}-${mesDia}T12:00:00-03:00`,
    );
  }

  return aniversario;
}

function statusPermiteAgendaConsulta_(status) {
  return [
    "agendada",
    "confirmada",
    "consulta agendada",
    "consulta confirmada",
  ].includes(status);
}

function statusConsultaRealizadaAgenda_(status) {
  return ["realizada", "consulta realizada"].includes(status);
}

function planejarLembretesConsultaHoje_(entrada) {
  const resultados = [];
  const consulta = entrada.consulta;
  const alvos = alvosLembretesConsultaAgenda_(consulta);
  const alvoPrincipal = alvos.principal;

  if (
    !entrada.lembretePrincipalEnviado &&
    !entrada.lembreteNoDiaEnviado &&
    !entrada.ultimaTentativa &&
    alvoPrincipal.getTime() <= entrada.fimHoje.getTime() &&
    consulta.getTime() > entrada.agora.getTime()
  ) {
    const horarioPrincipal = new Date(
      Math.max(
        alvoPrincipal.getTime(),
        entrada.inicioHoje.getTime(),
        entrada.agora.getTime(),
      ),
    );

    if (
      horarioPrincipal.getTime() < entrada.fimHoje.getTime()
    ) {
      resultados.push({
        rotulo: "lembrete automático único",
        horario: formatarDataRetomadas_(
          horarioPrincipal,
          "HH:mm",
        ),
      });
    }
  }

  return resultados;
}

function planejarLembretesConsultaFuturos_(entrada) {
  const alvos = alvosLembretesConsultaAgenda_(
    entrada.consulta,
  );
  const limite = new Date(
    entrada.fimHoje.getTime() +
      AGENDA_CUIDADOS_CONFIG.diasAntecedenciaAgenda *
        24 *
        60 *
        60 *
        1000,
  );
  const resultados = [];

  if (
    !entrada.lembretePrincipalEnviado &&
    !entrada.lembreteNoDiaEnviado &&
    !entrada.ultimaTentativa &&
    alvos.principal.getTime() >
      entrada.fimHoje.getTime() &&
    alvos.principal.getTime() <= limite.getTime()
  ) {
    resultados.push({
      rotulo: "Lembrete automático principal",
      dataHora: alvos.principal,
      dataReferencia: formatarDataRetomadas_(
        alvos.principal,
        "yyyy-MM-dd",
      ),
      horario: formatarDataRetomadas_(
        alvos.principal,
        "HH:mm",
      ),
    });
  }

  return resultados;
}

function alvosLembretesConsultaAgenda_(consulta) {
  return {
    principal: horarioAlvoLembretePrincipalConsulta_(consulta),
  };
}

function horarioSeguroAgendaCuidados_(
  data,
  inicioHoje,
  fimHoje,
) {
  const segura = new Date(
    Math.max(data.getTime(), inicioHoje.getTime()),
  );

  if (segura.getTime() >= fimHoje.getTime()) return "09:00";
  return formatarDataRetomadas_(segura, "HH:mm");
}

function chaveContatoAgendaCuidados_(item, index) {
  const phone = String(item && item.telefone || "").replace(/\D/g, "");
  if (phone) return "phone:" + phone;

  const name = normalizarTextoRetomadas_(item && item.nome || "");
  return name
    ? "name:" + name + ":" + String(index)
    : "unknown:" + String(index);
}

function agruparCuidadosAgendaPorContato_(agendaCuidados) {
  const groupsByKey = {};
  const groups = [];

  (agendaCuidados || []).forEach(function (item, index) {
    const key = chaveContatoAgendaCuidados_(item, index);
    let group = groupsByKey[key];
    if (!group) {
      group = {
        key: key,
        nome: String(item && item.nome || "").trim(),
        telefone: String(item && item.telefone || "").trim(),
        itens: [],
      };
      groupsByKey[key] = group;
      groups.push(group);
    }
    group.itens.push(item);
  });

  groups.forEach(function (group) {
    group.itens.sort(function (left, right) {
      if (Boolean(left.futuro) !== Boolean(right.futuro)) {
        return left.futuro ? 1 : -1;
      }
      if (Boolean(left.automatico) !== Boolean(right.automatico)) {
        return left.automatico ? 1 : -1;
      }
      return String(left.horario || "99:99").localeCompare(
        String(right.horario || "99:99"),
      );
    });
  });

  return groups;
}

function classificarGruposAgendaCuidados_(groups) {
  return (groups || []).reduce(function (sections, group) {
    const manualItems = group.itens.filter(function (item) {
      return !item.futuro && !item.automatico;
    });
    const automaticItems = group.itens.filter(function (item) {
      return !item.futuro && item.automatico;
    });
    const futureItems = group.itens.filter(function (item) {
      return item.futuro;
    });
    if (manualItems.length) {
      sections.manuaisHoje.push(
        Object.assign({}, group, { itens: manualItems }),
      );
    }
    if (automaticItems.length) {
      sections.automaticosHoje.push(
        Object.assign({}, group, { itens: automaticItems }),
      );
    }
    if (futureItems.length) {
      sections.futuros.push(
        Object.assign({}, group, { itens: futureItems }),
      );
    }
    return sections;
  }, {
    manuaisHoje: [],
    automaticosHoje: [],
    futuros: [],
  });
}

function contarItensGruposAgendaCuidados_(groups) {
  return (groups || []).reduce(function (total, group) {
    return total + group.itens.length;
  }, 0);
}

function contarItensAgendaCuidadosPorTipo_(groups, type) {
  return (groups || []).reduce(function (total, group) {
    return total + group.itens.filter(function (item) {
      if (type === "manual") return !item.futuro && !item.automatico;
      if (type === "automatic") return !item.futuro && item.automatico;
      return item.futuro;
    }).length;
  }, 0);
}

function montarHtmlAgendaCuidados_(agendaCuidados) {
  const groups = agruparCuidadosAgendaPorContato_(agendaCuidados || []);
  const sections = classificarGruposAgendaCuidados_(groups);
  const manualActions = contarItensAgendaCuidadosPorTipo_(
    groups,
    "manual",
  );
  const automaticActions = contarItensAgendaCuidadosPorTipo_(
    groups,
    "automatic",
  );
  const futureActions = contarItensAgendaCuidadosPorTipo_(
    groups,
    "future",
  );

  return (
    '<h3 style="margin:26px 0 5px;color:#92400e;font-size:19px;">Ações humanas sugeridas hoje (' +
    manualActions +
    ") <span style=\"font-size:13px;font-weight:normal;color:#6b7280;\">" +
    sections.manuaisHoje.length +
    (sections.manuaisHoje.length === 1 ? " contato" : " contatos") +
    "</span></h3>" +
    '<p style="margin:0 0 12px;color:#4b5563;">Nada desta seção é enviado automaticamente sem aprovação. Revise o histórico; nas retomadas elegíveis, use <strong>Passar para a Bruna</strong> somente se a mensagem estiver apropriada.</p>' +
    montarCardsCuidadosAgenda_(sections.manuaisHoje, "manual") +
    '<h3 style="margin:28px 0 5px;color:#075e54;font-size:19px;">Envios automáticos previstos hoje (' +
    automaticActions +
    ") <span style=\"font-size:13px;font-weight:normal;color:#6b7280;\">" +
    sections.automaticosHoje.length +
    (sections.automaticosHoje.length === 1 ? " contato" : " contatos") +
    "</span></h3>" +
    '<p style="margin:0 0 12px;color:#4b5563;">Estes são os únicos itens programados para disparo sem ação da equipe.</p>' +
    montarCardsCuidadosAgenda_(sections.automaticosHoje, "automatic") +
    '<h3 style="margin:28px 0 5px;font-size:19px;">Próximos marcos de cuidado — 7 dias (' +
    futureActions +
    ") <span style=\"font-size:13px;font-weight:normal;color:#6b7280;\">" +
    sections.futuros.length +
    (sections.futuros.length === 1 ? " contato" : " contatos") +
    "</span></h3>" +
    montarCardsCuidadosAgenda_(sections.futuros, "future")
  );
}

function montarCardsCuidadosAgenda_(groups, tone) {
  if (!groups.length) {
    const empty = tone === "manual"
      ? "Nenhuma ação manual sugerida."
      : tone === "automatic"
        ? "Nenhum envio automático previsto."
        : "Nenhum marco futuro identificado.";
    return '<p style="font-size:15px;color:#6b7280;background:#f3f4f6;border-radius:12px;padding:12px;">' +
      empty +
      "</p>";
  }

  return groups.map(function (group) {
    const phone = String(group.telefone || "").replace(/\D/g, "");
    const patient = escaparHtmlRetomadas_(
      group.nome || group.telefone || "Nome não informado",
    );
    const whatsapp = phone
      ? '<a href="https://wa.me/' +
        phone +
        '" style="display:block;text-align:center;margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#e8f6ee;color:#176b43;text-decoration:none;font-size:14px;font-weight:bold;">Abrir WhatsApp</a>'
      : "";
    const itemsHtml = group.itens.map(function (item, index) {
      const label = item.futuro
        ? "FUTURO"
        : item.automatico
          ? "AUTOMÁTICO"
          : "MANUAL";
      const labelColor = item.futuro
        ? "#4b5563"
        : item.automatico
          ? "#047857"
          : "#92400e";
      const when = [
        item.dataReferencia || "",
        item.horario || "A definir",
      ].filter(Boolean).join(" • ");
      return (
        '<div style="padding:' +
        (index ? "14px 0 0" : "4px 0 0") +
        (index ? ";margin-top:14px;border-top:1px solid #e5e7eb" : "") +
        ';"><div style="font-size:11px;font-weight:bold;letter-spacing:.05em;color:' +
        labelColor +
        ';">' +
        label +
        " • " +
        escaparHtmlRetomadas_(when) +
        '</div><div style="margin-top:5px;font-weight:bold;">' +
        escaparHtmlRetomadas_(item.categoria || "Cuidado") +
        '</div><p style="margin:7px 0;color:#4b5563;line-height:1.5;">' +
        escaparHtmlRetomadas_(item.contexto || "Sem contexto adicional.") +
        '</p><p style="margin:7px 0;line-height:1.5;"><strong>Responsável:</strong> ' +
        escaparHtmlRetomadas_(item.responsavel || "Equipe") +
        '</p><div style="margin-top:9px;padding:10px;background:#f7f6f2;border-left:3px solid #9bb7aa;border-radius:8px;"><strong style="font-size:12px;color:#59645e;">Mensagem prevista ou sugerida</strong><div style="margin-top:5px;line-height:1.5;">' +
        escaparHtmlRetomadas_(mensagemSugeridaItemRetomada_(item)) +
        "</div></div>" +
        montarAcoesItemRetomadaHtml_(item, {
          includeWhatsapp: false,
        }) +
        "</div>"
      );
    }).join("");

    return (
      '<div style="margin:12px 0;padding:15px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;box-shadow:0 5px 18px rgba(17,24,39,.05);"><div style="font-size:18px;font-weight:bold;color:#1f2937;">' +
      patient +
      "</div>" +
      whatsapp +
      itemsHtml +
      "</div>"
    );
  }).join("");
}

function montarTabelaCuidadosAgenda_(items, automatic) {
  const groups = Array.isArray(items) &&
    items.length &&
    Array.isArray(items[0].itens)
    ? items
    : agruparCuidadosAgendaPorContato_(items || []);
  return montarCardsCuidadosAgenda_(
    groups,
    automatic ? "automatic" : "manual",
  );
}

function montarTabelaFuturosAgenda_(items) {
  const groups = Array.isArray(items) &&
    items.length &&
    Array.isArray(items[0].itens)
    ? items
    : agruparCuidadosAgendaPorContato_(items || []);
  return montarCardsCuidadosAgenda_(groups, "future");
}
