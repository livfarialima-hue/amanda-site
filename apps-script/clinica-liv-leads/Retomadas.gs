const RETOMADAS_CONFIG = Object.freeze({
  destinatario:
    "amandaschh@hotmail.com, daniel.added@gmail.com",
  planilhaMensagens: "_WHATSAPP_MENSAGENS",
  planilhaLeads: "Google Ads - Conversões",
  planilhaConsultas: "Consultas",
  planilhaControle: "_WHATSAPP_RETOMADAS",
  planilhaCompromissos: "_WHATSAPP_COMPROMISSOS",
  fusoHorario: "America/Sao_Paulo",
  horaEmail: 8,
  minutoEmail: 0,
  horaInicioRetomadas: 9,
  horaFimRetomadas: 19,
  intervaloMesmoContatoHoras: 6,
  minimoHorasAposPromessaRetorno: 24,
  maximoDiasSemResposta: 10,
  maximoPacientesPorEmail: 50,
  maximoAtrasoAutomaticoMinutos: 240,
  janelaWhatsAppMinutos: 1430,
  endpointRetomadaAutomatica:
    "https://draamandaschroeder.com.br/.netlify/functions/scheduled-followup",
  propriedadeEndpointRetomadaAutomatica:
    "RETOMADAS_AUTOMATICAS_ENDPOINT",
  propriedadeSegredo: "LEADS_INGEST_SECRET",
  propriedadeAtiva: "RETOMADAS_AUTOMATICAS_ATIVAS",
  funcaoGatilhoAutomatico: "processarRetomadasAutomaticas",
  horariosPrioritarios: [
    "10:30",
    "10:45",
    "11:00",
    "11:15",
    "11:30",
    "11:45",
  ],
  horariosRegulares: [
    "16:30",
    "16:45",
    "17:00",
    "17:15",
    "17:30",
    "17:45",
  ],
});

const RETOMADAS_CONTROLE_HEADERS = Object.freeze([
  "Chave diária",
  "Data do e-mail",
  "Telefone",
  "Message ID",
  "Etapa",
  "Horário planejado",
  "Status do lead",
  "Resumo",
  "Sugestão",
  "Modo",
  "Status do envio",
  "Data/hora programada",
  "Última tentativa",
  "Enviado em",
  "Erro do envio",
]);

const RETOMADAS_ETAPAS = Object.freeze([
  Object.freeze({
    numero: 1,
    diasMinimos: 1,
    diasMaximos: 2,
    rotulo: "1ª retomada",
  }),
  Object.freeze({
    numero: 2,
    diasMinimos: 4,
    diasMaximos: 5,
    rotulo: "2ª retomada",
  }),
  Object.freeze({
    numero: 3,
    diasMinimos: 9,
    diasMaximos: 10,
    rotulo: "última retomada",
  }),
]);

const RETOMADAS_STATUS_ENCERRADOS = Object.freeze([
  "consulta agendada",
  "consulta realizada",
  "paciente convertido",
  "nao qualificado",
  "sem interesse",
  "perdido",
]);

const RETOMADAS_MATERIAIS = Object.freeze([
  Object.freeze({
    padrao:
      /artificial|esticad|exagerad|naturalidade|expressao|identidade|nao parecer eu/,
    sobre: "sobre naturalidade, identidade e planejamento facial",
    descricao:
      "Ele explica como proporções, limites e preservação da expressão entram no planejamento",
    url:
      "https://draamandaschroeder.com.br/conteudos/naturalidade-envelhecimento/",
  }),
  Object.freeze({
    padrao:
      /(recuperacao|pos operatorio|incha|voltar ao trabalho).*(lifting|face|facial|pescoco)|(lifting|face|facial|pescoco).*(recuperacao|pos operatorio|incha|voltar ao trabalho)/,
    sobre: "sobre recuperação do lifting facial e cervical",
    descricao:
      "Ele explica edema, rotina, apoio e retornos com calma",
    url:
      "https://draamandaschroeder.com.br/conteudos/recuperacao-lifting-facial/",
  }),
  Object.freeze({
    padrao: /seguranca|medo da cirurgia|risco|anestesia|hospital/,
    sobre: "sobre segurança em cirurgia plástica",
    descricao:
      "Ele explica avaliação, estrutura, equipe e planejamento de segurança",
    url:
      "https://draamandaschroeder.com.br/conteudos/seguranca-cirurgia-plastica/",
  }),
  Object.freeze({
    padrao:
      /(cicatriz|cicatrizes|marca).*(mama|seio|mastopexia|protese|reducao)|(mama|seio|mastopexia|protese|reducao).*(cicatriz|cicatrizes|marca)/,
    sobre: "sobre cicatrizes em cirurgia de mama",
    descricao:
      "Ele explica os padrões de cicatriz e os fatores que influenciam sua evolução",
    url:
      "https://draamandaschroeder.com.br/conteudos/cicatrizes-cirurgia-de-mama/",
  }),
  Object.freeze({
    padrao: /cicatriz|cicatrizes|cicatrizacao|queloide/,
    sobre: "sobre cuidados com a cicatrização",
    descricao:
      "Ele explica a evolução e os cuidados gerais com cicatrizes cirúrgicas",
    url:
      "https://draamandaschroeder.com.br/conteudos/cuidados-cicatrizacao-cirurgia/",
  }),
  Object.freeze({
    padrao:
      /(lifting|cirurgia).*(botox|toxina|preenchimento|bioestimulador|injetavel)|(botox|toxina|preenchimento|bioestimulador|injetavel).*(lifting|cirurgia)/,
    sobre: "comparando lifting facial e procedimentos injetáveis",
    descricao:
      "Ele mostra o que cada abordagem consegue tratar e por que a avaliação continua importante",
    url:
      "https://draamandaschroeder.com.br/conteudos/lifting-facial-ou-injetaveis/",
  }),
  Object.freeze({
    padrao: /blefaroplastia|palpebra|bolsa nos olhos|olhar cansado/,
    sobre: "sobre blefaroplastia",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url: "https://draamandaschroeder.com.br/blefaroplastia/",
  }),
  Object.freeze({
    padrao: /lifting cervical|pescoco|papada|contorno cervical/,
    sobre: "sobre contorno do pescoço e lifting cervical",
    descricao:
      "A página explica as estruturas envolvidas e as possibilidades avaliadas em consulta",
    url:
      "https://draamandaschroeder.com.br/conteudos/papada-contorno-cervical/",
  }),
  Object.freeze({
    padrao: /lifting facial|facelift|ritidoplastia/,
    sobre: "sobre lifting facial",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url: "https://draamandaschroeder.com.br/lifting-facial/",
  }),
  Object.freeze({
    padrao: /otoplastia|orelha/,
    sobre: "sobre otoplastia",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url: "https://draamandaschroeder.com.br/otoplastia/",
  }),
  Object.freeze({
    padrao: /lip lifting|lifting labial|labio/,
    sobre: "sobre lifting labial",
    descricao:
      "A página explica o procedimento, a avaliação e dúvidas frequentes",
    url: "https://draamandaschroeder.com.br/lip-lifting/",
  }),
  Object.freeze({
    padrao: /lipo de papada|papada/,
    sobre: "sobre papada e contorno cervical",
    descricao:
      "O material explica por que estruturas diferentes podem alterar esse contorno",
    url:
      "https://draamandaschroeder.com.br/conteudos/papada-contorno-cervical/",
  }),
  Object.freeze({
    padrao: /abdominoplastia/,
    sobre: "sobre abdominoplastia",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url: "https://draamandaschroeder.com.br/abdominoplastia/",
  }),
  Object.freeze({
    padrao: /lipoaspiracao|\blipo\b/,
    sobre: "sobre lipoaspiração",
    descricao:
      "A página explica o procedimento, recuperação e dúvidas frequentes",
    url: "https://draamandaschroeder.com.br/lipoaspiracao/",
  }),
  Object.freeze({
    padrao: /mastopexia|mama caida|seio caido/,
    sobre: "sobre mastopexia",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url: "https://draamandaschroeder.com.br/mastopexia/",
  }),
  Object.freeze({
    padrao: /protese de mama|silicone|implante mamario/,
    sobre: "sobre prótese de mama",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url:
      "https://draamandaschroeder.com.br/protese-de-mama/",
  }),
  Object.freeze({
    padrao: /mamoplastia redutora|reducao de mama|reduzir (a )?mama/,
    sobre: "sobre mamoplastia redutora",
    descricao:
      "A página reúne explicações, dúvidas frequentes e casos reais em contexto educativo",
    url:
      "https://draamandaschroeder.com.br/mamoplastia-redutora/",
  }),
  Object.freeze({
    padrao: /braquioplastia|braco/,
    sobre: "sobre braquioplastia",
    descricao:
      "A página explica o procedimento, a recuperação e dúvidas frequentes",
    url: "https://draamandaschroeder.com.br/braquioplastia/",
  }),
  Object.freeze({
    padrao: /ninfoplastia/,
    sobre: "sobre ninfoplastia",
    descricao:
      "A página explica o procedimento, a avaliação e dúvidas frequentes",
    url: "https://draamandaschroeder.com.br/ninfoplastia/",
  }),
  Object.freeze({
    padrao: /contorno corporal|pos bariatrica|emagreci|emagrecimento/,
    sobre: "sobre cirurgia plástica após emagrecimento",
    descricao:
      "O material explica prioridades, etapas e planejamento depois da perda de peso",
    url:
      "https://draamandaschroeder.com.br/conteudos/cirurgia-plastica-apos-emagrecimento/",
  }),
  Object.freeze({
    padrao: /avaliacao facial|rosto|face|facial|dra amanda/,
    sobre: "sobre o trabalho facial da Dra. Amanda",
    descricao:
      "A página explica como funciona a avaliação facial e as possibilidades discutidas em consulta",
    url:
      "https://draamandaschroeder.com.br/avaliacao-facial/",
  }),
]);

const RETOMADAS_MATERIAL_GERAL = Object.freeze({
  sobre: "sobre o trabalho da Dra. Amanda",
  descricao:
    "O site reúne sua formação, foco de atuação e acesso aos procedimentos",
  url: "https://draamandaschroeder.com.br/",
});

function instalarEmailDiarioRetomadas() {
  const nomeFuncao = "enviarEmailDiarioRetomadas";

  ScriptApp.getProjectTriggers()
    .filter(function (acionador) {
      return acionador.getHandlerFunction() === nomeFuncao;
    })
    .forEach(function (acionador) {
      ScriptApp.deleteTrigger(acionador);
    });

  ScriptApp.newTrigger(nomeFuncao)
    .timeBased()
    .everyDays(1)
    .atHour(RETOMADAS_CONFIG.horaEmail)
    .nearMinute(RETOMADAS_CONFIG.minutoEmail)
    .inTimezone(RETOMADAS_CONFIG.fusoHorario)
    .create();

  return {
    ok: true,
    funcao: nomeFuncao,
    horarioAproximado:
      String(RETOMADAS_CONFIG.horaEmail).padStart(2, "0") +
      ":" +
      String(RETOMADAS_CONFIG.minutoEmail).padStart(2, "0"),
    destinatario: RETOMADAS_CONFIG.destinatario,
  };
}

function ativarRetomadasAutomaticas() {
  const arquivo = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const planilhaLeads = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaLeads,
  );

  if (!planilhaLeads) {
    throw new Error("Aba de leads da Dra. Amanda não encontrada.");
  }

  if (typeof garantirEstruturaPreferenciasContato_ === "function") {
    garantirEstruturaPreferenciasContato_(planilhaLeads);
  }

  obterPlanilhaControleRetomadas_(arquivo);
  PropertiesService.getScriptProperties().setProperty(
    RETOMADAS_CONFIG.propriedadeAtiva,
    "true",
  );
  instalarGatilhoRetomadasAutomaticas_();

  return {
    ok: true,
    active: true,
    intervalMinutes: 5,
  };
}

function desativarRetomadasAutomaticas() {
  PropertiesService.getScriptProperties().setProperty(
    RETOMADAS_CONFIG.propriedadeAtiva,
    "false",
  );
  removerGatilhosRetomadasAutomaticas_();
  return { ok: true, active: false };
}

function instalarGatilhoRetomadasAutomaticas_() {
  removerGatilhosRetomadasAutomaticas_();
  ScriptApp.newTrigger(
    RETOMADAS_CONFIG.funcaoGatilhoAutomatico,
  )
    .timeBased()
    .everyMinutes(5)
    .create();
}

function removerGatilhosRetomadasAutomaticas_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (
      trigger.getHandlerFunction() ===
      RETOMADAS_CONFIG.funcaoGatilhoAutomatico
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function enviarEmailDiarioRetomadas() {
  return enviarEmailDiarioRetomadasInterno_(new Date());
}

function testarEmailDiarioRetomadas() {
  return enviarEmailDiarioRetomadasInterno_(new Date());
}

function obterPlanilhaCompromissos_(arquivo) {
  let planilha = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaCompromissos,
  );

  if (planilha) return planilha;

  planilha = arquivo.insertSheet(
    RETOMADAS_CONFIG.planilhaCompromissos,
  );
  planilha
    .getRange(1, 1, 1, 10)
    .setValues([[
      "Event ID",
      "Telefone",
      "Tipo",
      "Resumo operacional",
      "Responsável",
      "Criado em",
      "Prazo",
      "Status",
      "Resolvido em",
      "Origem",
    ]]);
  planilha.setFrozenRows(1);
  planilha.hideSheet();

  return planilha;
}

function registrarCompromissoPaciente_(input) {
  const telefone = normalizarTelefoneRetomadas_(
    input.phone,
  );
  const eventId = String(input.eventId || "").trim();

  if (!telefone || !eventId) {
    return { ok: false, error: "invalid_commitment" };
  }

  const arquivo = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const planilha = obterPlanilhaCompromissos_(arquivo);
  const ultimaLinha = planilha.getLastRow();
  const kind = textoCompromissoPaciente_(
    input.kind,
    80,
  );

  if (ultimaLinha >= 2) {
    const compromissos = planilha
      .getRange(2, 1, ultimaLinha - 1, 8)
      .getDisplayValues();
    const duplicado = compromissos.some(function (linha) {
      return (
        String(linha[0] || "").trim() === eventId ||
        (
          normalizarTelefoneRetomadas_(linha[1]) === telefone &&
          normalizarTextoRetomadas_(linha[2]) ===
            normalizarTextoRetomadas_(kind) &&
          normalizarTextoRetomadas_(linha[7]) === "pendente"
        )
      );
    });

    if (duplicado) {
      return { ok: true, duplicate: true };
    }
  }

  const agora = new Date();
  const prazo =
    dataRetomadaValida_(input.dueAt) ||
    new Date(agora.getTime() + 4 * 60 * 60 * 1000);
  planilha.appendRow([
    eventId,
    telefone,
    kind,
    textoCompromissoPaciente_(input.summary, 180),
    textoCompromissoPaciente_(
      input.owner || "Amanda/equipe",
      80,
    ),
    agora,
    prazo,
    "Pendente",
    "",
    textoCompromissoPaciente_(
      input.source || "WhatsApp",
      80,
    ),
  ]);

  return { ok: true, created: true };
}

function resolverCompromissosPaciente_(input) {
  const telefone = normalizarTelefoneRetomadas_(
    input.phone,
  );

  if (!telefone) {
    return { ok: false, error: "invalid_phone" };
  }

  const arquivo = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const planilha = obterPlanilhaCompromissos_(arquivo);

  if (planilha.getLastRow() < 2) {
    return { ok: true, resolved: 0 };
  }

  const valores = planilha
    .getRange(
      2,
      1,
      planilha.getLastRow() - 1,
      10,
    )
    .getValues();
  let resolvidos = 0;
  const agora =
    dataRetomadaValida_(input.at) || new Date();

  valores.forEach(function (linha, indice) {
    if (
      normalizarTelefoneRetomadas_(linha[1]) !== telefone ||
      normalizarTextoRetomadas_(linha[7]) !== "pendente"
    ) {
      return;
    }

    planilha.getRange(indice + 2, 8).setValue("Resolvido");
    planilha.getRange(indice + 2, 9).setValue(agora);
    resolvidos += 1;
  });

  return { ok: true, resolved: resolvidos };
}

function carregarAgendaCompromissosPendentes_(arquivo, agora) {
  const planilha = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaCompromissos,
  );

  if (!planilha || planilha.getLastRow() < 2) return [];

  const hoje = formatarDataRetomadas_(agora, "yyyy-MM-dd");
  const valores = planilha
    .getRange(
      2,
      1,
      planilha.getLastRow() - 1,
      10,
    )
    .getValues();

  return valores.reduce(function (itens, linha) {
    if (normalizarTextoRetomadas_(linha[7]) !== "pendente") {
      return itens;
    }

    const prazo = dataRetomadaValida_(linha[6]);
    if (!prazo) return itens;

    const diasAte = diferencaDiasLocaisRetomadas_(
      agora,
      prazo,
    );
    if (diasAte > 7) return itens;

    const tipo = String(linha[2] || "pendência");
    const resumo =
      String(linha[3] || "").trim() ||
      "Solicitação aguardando retorno humano.";
    const primeiroNome = "paciente";

    itens.push({
      categoria:
        diasAte < 0
          ? "Pendência humana atrasada"
          : "Pendência humana",
      telefone: normalizarTelefoneRetomadas_(linha[1]),
      nome: "",
      horario: formatarDataRetomadas_(prazo, "HH:mm"),
      dataReferencia: formatarDataRetomadas_(
        prazo,
        "yyyy-MM-dd",
      ),
      contexto: tipo + " — " + resumo,
      responsavel:
        String(linha[4] || "").trim() || "Amanda/equipe",
      automatico: false,
      futuro:
        formatarDataRetomadas_(prazo, "yyyy-MM-dd") > hoje,
      prioridade: diasAte < 0 ? 0 : 1,
      sugestao:
        "Oi! Retomando o ponto que ficou pendente: já conferimos a informação e podemos seguir por aqui. Obrigada por aguardar.",
    });

    return itens;
  }, []);
}

function textoCompromissoPaciente_(valor, limite) {
  return Array.from(String(valor || "").trim())
    .slice(0, limite)
    .join("");
}

function enviarEmailDiarioRetomadasInterno_(agora) {
  const arquivo = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  if (
    typeof atualizarCentralAtendimentoInterno_ === "function"
  ) {
    try {
      atualizarCentralAtendimentoInterno_(arquivo, agora);
    } catch (error) {
      console.error(
        "Não foi possível atualizar a Central de Atendimento antes do e-mail diário.",
        error,
      );
    }
  }
  const planilhaLeads = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaLeads,
  );
  const planilhaMensagens = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaMensagens,
  );
  const planilhaConsultas = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaConsultas,
  );

  if (!planilhaLeads) {
    throw new Error("Aba de leads da Dra. Amanda não encontrada.");
  }

  if (!planilhaMensagens) {
    throw new Error("Histórico de mensagens não encontrado.");
  }

  if (typeof garantirEstruturaPreferenciasContato_ === "function") {
    garantirEstruturaPreferenciasContato_(planilhaLeads);
  }

  const agendaCuidadosConsultas = planilhaConsultas
    ? criarAgendaCuidadosConsultas_(planilhaConsultas, agora)
    : [];
  const agendaCuidados = agendaCuidadosConsultas.concat(
    carregarAgendaCompromissosPendentes_(arquivo, agora),
  );
  const telefonesComCompromisso = new Set(
    agendaCuidados
      .filter(function (item) {
        return /^Pendência humana/.test(item.categoria);
      })
      .map(function (item) {
        return item.telefone;
      }),
  );
  const planilhaControle = obterPlanilhaControleRetomadas_(arquivo);
  const dataLocal = formatarDataRetomadas_(agora, "yyyy-MM-dd");
  const chavesEnviadasHoje = obterChavesRetomadasEnviadas_(
    planilhaControle,
    dataLocal,
  );
  const leadsPorTelefone = carregarLeadsRetomadas_(planilhaLeads);
  const conversasPorTelefone = carregarConversasRetomadas_(
    planilhaMensagens,
  );
  const candidatos = [];

  Object.keys(conversasPorTelefone).forEach(function (telefone) {
    const lead = leadsPorTelefone[telefone];

    if (
      !lead ||
      lead.neverFollowUp ||
      statusRetomadaEncerrado_(lead.status) ||
      telefonesComCompromisso.has(telefone)
    ) {
      return;
    }

    const conversa = conversasPorTelefone[telefone];
    const candidato = criarCandidatoRetomada_(
      telefone,
      lead,
      conversa,
      agora,
      dataLocal,
    );

    if (!candidato || chavesEnviadasHoje.has(candidato.chaveDiaria)) {
      return;
    }

    candidatos.push(candidato);
  });

  candidatos.sort(function (a, b) {
    if (a.prioritario !== b.prioritario) {
      return a.prioritario ? -1 : 1;
    }

    if (a.etapa.numero !== b.etapa.numero) {
      return b.etapa.numero - a.etapa.numero;
    }

    return a.ultimoContato.getTime() - b.ultimoContato.getTime();
  });

  let selecionados = candidatos.slice(
    0,
    RETOMADAS_CONFIG.maximoPacientesPorEmail,
  );

  atribuirHorariosRetomadas_(selecionados);
  selecionados = selecionados.filter(function (candidato) {
    return Boolean(candidato.horario);
  });

  selecionados.forEach(function (candidato) {
    candidato.responsavel = responsavelRetomada_(candidato);
    candidato.automatico =
      candidato.responsavel === "bruna" &&
      !candidato.lead.suspendAutomaticFollowUp;
    candidato.modo = candidato.lead.suspendAutomaticFollowUp
      ? "Suspensa na planilha"
      : candidato.automatico
        ? "Automático"
        : "Manual";
  });

  const sugeridosParaEquipe = selecionados.filter(function (candidato) {
    return candidato.responsavel === "equipe";
  });
  const dataApresentacao = formatarDataRetomadas_(
    agora,
    "dd/MM/yyyy",
  );
  const assunto =
    "Clínica LIV — agenda de cuidado de " +
    dataApresentacao +
    " (" +
    selecionados.length +
    " retomadas • " +
    agendaCuidados.filter(function (item) {
      return !item.futuro;
    }).length +
    " cuidados hoje)";
  const corpoTexto = montarTextoEmailRetomadas_(
    selecionados,
    sugeridosParaEquipe,
    dataApresentacao,
    agendaCuidados,
  );
  const corpoHtml = montarHtmlEmailRetomadas_(
    selecionados,
    sugeridosParaEquipe,
    dataApresentacao,
    agendaCuidados,
  );

  MailApp.sendEmail({
    to: RETOMADAS_CONFIG.destinatario,
    subject: assunto,
    body: corpoTexto,
    htmlBody: corpoHtml,
    name: "Clínica LIV — Agenda de cuidado",
  });

  registrarRetomadasEnviadas_(
    planilhaControle,
    selecionados,
    agora,
  );
  limparControleRetomadasAntigo_(planilhaControle, agora);

  return {
    ok: true,
    enviados: selecionados.length,
    ignoradosPorLimite: Math.max(
      0,
      candidatos.length - selecionados.length,
    ),
    sugeridosParaEquipe: sugeridosParaEquipe.length,
    cuidadosHoje: agendaCuidados.filter(function (item) {
      return !item.futuro;
    }).length,
    cuidadosFuturos: agendaCuidados.filter(function (item) {
      return item.futuro;
    }).length,
    destinatario: RETOMADAS_CONFIG.destinatario,
    assunto: assunto,
  };
}

function carregarLeadsRetomadas_(planilha) {
  const ultimaLinha = planilha.getLastRow();
  const resultado = {};

  if (ultimaLinha < 2) {
    return resultado;
  }

  const totalColumns = Math.max(
    typeof planilha.getLastColumn === "function"
      ? planilha.getLastColumn()
      : 25,
    25,
  );
  const headers = planilha
    .getRange(1, 1, 1, totalColumns)
    .getDisplayValues()[0];
  const valores = planilha
    .getRange(2, 1, ultimaLinha - 1, totalColumns)
    .getDisplayValues();
  const neverFollowUpColumn =
    typeof indiceCabecalhoPreferenciaContato_ === "function"
      ? indiceCabecalhoPreferenciaContato_(
          headers,
          "Nunca retomar",
        )
      : -1;
  const neverBotReplyColumn =
    typeof indiceCabecalhoPreferenciaContato_ === "function"
      ? indiceCabecalhoPreferenciaContato_(
          headers,
          "Nunca responder com robô",
        )
      : -1;
  const suspendAutomaticFollowUpColumn =
    typeof indiceCabecalhoPreferenciaContato_ === "function"
      ? indiceCabecalhoPreferenciaContato_(
          headers,
          "Suspender retomada automática",
        )
      : -1;

  valores.forEach(function (linha, indice) {
    const telefone = normalizarTelefoneRetomadas_(linha[2]);

    if (!telefone) {
      return;
    }

    resultado[telefone] = {
      linha: indice + 2,
      referencia: String(linha[1] || "").trim(),
      status: String(linha[4] || "Novo").trim(),
      resumo: String(linha[16] || "").trim(),
      proximaAcao: String(linha[17] || "").trim(),
      origemEvento: String(linha[18] || "").trim(),
      plataforma: String(linha[19] || "").trim(),
      campanha: String(linha[20] || "").trim(),
      criativo: String(linha[21] || "").trim(),
      destino: String(linha[23] || "").trim(),
      referenciaCompleta: String(linha[24] || "").trim(),
      neverFollowUp:
        neverFollowUpColumn >= 0 &&
        typeof valorAtivoPreferenciaContato_ === "function" &&
        valorAtivoPreferenciaContato_(
          linha[neverFollowUpColumn],
        ),
      neverBotReply:
        neverBotReplyColumn >= 0 &&
        typeof valorAtivoPreferenciaContato_ === "function" &&
        valorAtivoPreferenciaContato_(
          linha[neverBotReplyColumn],
        ),
      suspendAutomaticFollowUp:
        suspendAutomaticFollowUpColumn >= 0 &&
        typeof valorAtivoPreferenciaContato_ === "function" &&
        valorAtivoPreferenciaContato_(
          linha[suspendAutomaticFollowUpColumn],
        ),
    };
  });

  return resultado;
}

function carregarConversasRetomadas_(planilha) {
  const ultimaLinha = planilha.getLastRow();
  const resultado = {};

  if (ultimaLinha < 2) {
    return resultado;
  }

  const valores = planilha
    .getRange(2, 1, ultimaLinha - 1, 7)
    .getValues();

  valores.forEach(function (linha) {
    const telefone = normalizarTelefoneRetomadas_(linha[0]);
    const dataHora = dataRetomadaValida_(linha[2]);
    const texto = String(linha[5] || "").trim();
    const messageId = String(linha[3] || "").trim();

    if (!telefone || !dataHora || !messageId) {
      return;
    }

    if (!resultado[telefone]) {
      resultado[telefone] = [];
    }

    resultado[telefone].push({
      direcao:
        String(linha[1] || "").toUpperCase() === "OUT"
          ? "OUT"
          : "IN",
      dataHora: dataHora,
      messageId: messageId,
      texto: texto,
    });
  });

  Object.keys(resultado).forEach(function (telefone) {
    resultado[telefone].sort(function (a, b) {
      return a.dataHora.getTime() - b.dataHora.getTime();
    });
  });

  return resultado;
}

function criarCandidatoRetomada_(
  telefone,
  lead,
  conversa,
  agora,
  dataLocal,
) {
  if (!conversa.length) {
    return null;
  }

  const ultimaMensagem = conversa[conversa.length - 1];

  if (
    ultimaMensagem.direcao !== "OUT" ||
    !ultimaMensagem.texto ||
    mensagemSemRetomada_(ultimaMensagem.texto)
  ) {
    return null;
  }

  if (retornoFuturoRecente_(conversa, agora)) {
    return null;
  }

  if (conversaTemPromessaHumanaPendente_(conversa)) {
    return null;
  }

  const diasSemResposta = diferencaDiasLocaisRetomadas_(
    ultimaMensagem.dataHora,
    agora,
  );

  if (
    diasSemResposta < 1 ||
    diasSemResposta > RETOMADAS_CONFIG.maximoDiasSemResposta
  ) {
    return null;
  }

  const quantidadeContatos = contarContatosSaidaRetomadas_(conversa);
  const engajamento = classificarEngajamentoRetomada_(conversa);
  const maximoContatos =
    engajamento === "engajado" ? 3 : 2;

  if (
    quantidadeContatos < 1 ||
    quantidadeContatos > maximoContatos
  ) {
    return null;
  }

  const etapa = RETOMADAS_ETAPAS[Math.min(
    quantidadeContatos,
    RETOMADAS_ETAPAS.length,
  ) - 1];

  if (
    diasSemResposta < etapa.diasMinimos ||
    diasSemResposta > etapa.diasMaximos
  ) {
    return null;
  }

  const contextoPaciente = normalizarTextoRetomadas_([
    lead.status,
    lead.resumo,
    lead.proximaAcao,
    lead.referencia,
    lead.plataforma,
    lead.campanha,
    lead.criativo,
    lead.destino,
    lead.referenciaCompleta,
    conversa
      .filter(function (mensagem) {
        return mensagem.direcao === "IN";
      })
      .map(function (mensagem) {
        return mensagem.texto;
      })
      .join(" "),
  ].join(" "));
  const contextoAgenda =
    /agend|horar|consulta|avaliacao|ferias|data disponivel/.test(
      contextoPaciente,
    );
  const contextoPreco =
    /valor|preco|orcamento|pagamento|parcel/.test(
      contextoPaciente,
    );

  if (!retomadaComercialPermitida_(contextoPaciente)) {
    return null;
  }

  const prioritario = contextoAgenda || contextoPreco;
  const material = selecionarMaterialRetomada_(
    lead,
    conversa,
    contextoPaciente,
    etapa.numero,
    prioritario,
  );

  return {
    telefone: telefone,
    lead: lead,
    ultimaMensagem: ultimaMensagem,
    ultimoContato: ultimaMensagem.dataHora,
    diasSemResposta: diasSemResposta,
    etapa: etapa,
    prioritario: prioritario,
    contextoAgenda: contextoAgenda,
    contextoPreco: contextoPreco,
    engajamento: engajamento,
    horario: "",
    sugestao: sugerirMensagemRetomada_(
      etapa.numero,
      prioritario,
      material,
      contextoAgenda,
      contextoPreco,
    ),
    chaveDiaria: [
      dataLocal,
      telefone,
      ultimaMensagem.messageId,
      etapa.numero,
    ].join("|"),
  };
}

function contarContatosSaidaRetomadas_(conversa) {
  let ultimaEntrada = -1;

  for (let indice = conversa.length - 1; indice >= 0; indice -= 1) {
    if (conversa[indice].direcao === "IN") {
      ultimaEntrada = indice;
      break;
    }
  }

  const saidas = conversa
    .slice(ultimaEntrada + 1)
    .filter(function (mensagem) {
      return mensagem.direcao === "OUT";
    });

  if (!saidas.length) {
    return 0;
  }

  const limiteMesmoContato =
    RETOMADAS_CONFIG.intervaloMesmoContatoHoras *
    60 *
    60 *
    1000;
  let contatos = 1;
  let inicioContato = saidas[0].dataHora.getTime();

  for (let indice = 1; indice < saidas.length; indice += 1) {
    const instante = saidas[indice].dataHora.getTime();

    if (instante - inicioContato > limiteMesmoContato) {
      contatos += 1;
      inicioContato = instante;
    }
  }

  return contatos;
}

function atribuirHorariosRetomadas_(candidatos) {
  let indiceAutomatico = 0;
  let indiceManual = 0;

  candidatos.forEach(function (candidato) {
    candidato.responsavel = responsavelRetomada_(candidato);

    if (candidato.responsavel === "bruna") {
      candidato.horario = horarioRetomadaPorIndice_(
        RETOMADAS_CONFIG.horariosPrioritarios,
        indiceAutomatico,
      );
      indiceAutomatico += 1;
      return;
    }

    candidato.horario = horarioRetomadaPorIndice_(
      RETOMADAS_CONFIG.horariosRegulares,
      indiceManual,
    );
    indiceManual += 1;
  });
}

function responsavelRetomada_(candidato) {
  if (
    candidato.etapa.numero === 1 &&
    !candidato.contextoAgenda &&
    !candidato.contextoPreco
  ) {
    return "bruna";
  }

  return "equipe";
}

function horarioRetomadaPorIndice_(horarios, indice) {
  let minutos;

  if (indice < horarios.length) {
    const partes = horarios[indice].split(":");
    minutos = Number(partes[0]) * 60 + Number(partes[1]);
  } else {
    const ultimo = horarios[horarios.length - 1];
    const partes = ultimo.split(":");
    const minutosBase =
      Number(partes[0]) * 60 + Number(partes[1]);
    minutos =
      minutosBase + (indice - horarios.length + 1) * 15;
  }

  const inicio = RETOMADAS_CONFIG.horaInicioRetomadas * 60;
  const fim = RETOMADAS_CONFIG.horaFimRetomadas * 60;

  if (minutos < inicio || minutos >= fim) {
    return "";
  }

  const hora = Math.floor(minutos / 60);
  const minuto = minutos % 60;

  return (
    String(hora).padStart(2, "0") +
    ":" +
    String(minuto).padStart(2, "0")
  );
}

function sugerirMensagemRetomada_(
  etapa,
  prioritario,
  material,
  contextoAgenda,
  contextoPreco,
) {
  if (etapa === 1 && material) {
    return (
      "Olá! Lembrei da sua dúvida e separei um material da Dra. Amanda " +
      material.sobre +
      ". " +
      material.descricao +
      ". Talvez ele ajude você a pensar com calma: " +
      material.url +
      " Se quiser, pode me contar o que ainda ficou em dúvida."
    );
  }

  if (etapa === 1 && contextoPreco) {
    return "Olá! Lembrei que você queria entender melhor os valores. É uma dúvida importante e não queria deixá-la sem resposta. Se ainda fizer sentido para você, posso retomar exatamente desse ponto e te ajudar por aqui.";
  }

  if (etapa === 1 && contextoAgenda) {
    return "Olá! Passei para saber se você conseguiu pensar com calma sobre a avaliação. Se ainda quiser, posso ajudar a encontrar um dia que fique confortável para você, sem compromisso.";
  }

  if (etapa === 1) {
    return "Olá! Passei para saber se ficou alguma dúvida da nossa conversa. Você não precisa decidir nada agora; se quiser continuar pesquisando ou entender melhor a avaliação, estou por aqui.";
  }

  if (etapa === 2) {
    if (contextoPreco) {
      return "Olá! Deixo o canal aberto para retomarmos sua dúvida sobre valores, caso ela ainda esteja pesando na sua pesquisa. Se quiser continuar, responda no seu tempo e seguimos exatamente desse ponto.";
    }

    if (contextoAgenda) {
      return "Olá! Se a avaliação ainda fizer sentido para você, posso retomar a conversa sobre um dia possível, sem pressa. Se preferir deixar para outro momento, está tudo bem.";
    }

    return "Olá! Só queria deixar o canal aberto caso você ainda esteja pensando no procedimento. Se quiser, posso retomar do ponto em que paramos, sem pressa.";
  }

  return "Olá! Vou encerrar meus contatos por aqui para não ser inconveniente. Se em outro momento quiser retomar a conversa, será um prazer ajudar você.";
}

function selecionarMaterialRetomada_(
  lead,
  conversa,
  contexto,
  etapa,
  prioritario,
) {
  if (
    etapa !== 1 ||
    prioritario ||
    origemSiteRetomada_(lead) ||
    conversaTemLinkSiteRetomada_(conversa) ||
    contextoSensivelRetomada_(contexto)
  ) {
    return null;
  }

  for (
    let indice = 0;
    indice < RETOMADAS_MATERIAIS.length;
    indice += 1
  ) {
    if (RETOMADAS_MATERIAIS[indice].padrao.test(contexto)) {
      return RETOMADAS_MATERIAIS[indice];
    }
  }

  return RETOMADAS_MATERIAL_GERAL;
}

function origemSiteRetomada_(lead) {
  const contexto = normalizarTextoRetomadas_([
    lead.plataforma,
    lead.referencia,
    lead.referenciaCompleta,
  ].join(" "));

  return (
    contexto.indexOf("organico/conteudo") >= 0 ||
    contexto.indexOf("site-") >= 0 ||
    contexto.indexOf("site_") >= 0
  );
}

function conversaTemLinkSiteRetomada_(conversa) {
  return conversa.some(function (mensagem) {
    return /https?:\/\/(?:www\.)?draamandaschroeder\.com\.br\//i.test(
      String(mensagem.texto || ""),
    );
  });
}

function contextoSensivelRetomada_(contexto) {
  return /arruinou minha vida|acabou com minha vida|salvar (meu |o )?(casamento|relacionamento|emprego|trabalho)|preciso ser perfeita|nunca vou ficar satisfeita|odeio meu rosto|nao aguento mais minha aparencia/.test(
    contexto,
  );
}

function retomadaComercialPermitida_(contexto) {
  if (contextoSensivelRetomada_(contexto)) {
    return false;
  }

  return !/nao (?:quero|tenho) mais interesse|nao me (?:envie|mande) mensagens|nao entre mais em contato|pare de (?:me )?(?:enviar|mandar|ligar|contatar)|pode encerrar (?:o )?(?:atendimento|contato)/.test(
    contexto,
  );
}

function mensagemSemRetomada_(texto) {
  const normalizado = normalizarTextoRetomadas_(texto);

  return (
    /samu|pronto atendimento|ligue 192|emergencia/.test(normalizado) ||
    /nao entraremos mais em contato|encerramos por aqui/.test(
      normalizado,
    )
  );
}

function retornoFuturoRecente_(conversa, agora) {
  const entradas = conversa.filter(function (mensagem) {
    return mensagem.direcao === "IN";
  });

  if (!entradas.length) return false;

  const ultimaEntrada = entradas[entradas.length - 1];

  if (mensagemIndicaRetornoFuturo_(ultimaEntrada.texto)) {
    return true;
  }

  if (!mensagemIndicaReflexao_(ultimaEntrada.texto)) {
    return false;
  }

  const instante = dataRetomadaValida_(
    ultimaEntrada.dataHora,
  );
  if (!instante) return false;

  const limite = 96 * 60 * 60 * 1000;
  const tempoDecorrido =
    agora.getTime() - instante.getTime();

  return tempoDecorrido >= 0 && tempoDecorrido < limite;
}

function mensagemIndicaRetornoFuturo_(texto) {
  const normalizado = normalizarTextoRetomadas_(texto);

  return /(?:vou|irei|pretendo) (?:entrar em contato|chamar|falar|retornar|procurar)|(?:entro|entrarei|retorno|retornarei|chamo|falarei|procuro|procurarei) (?:em contato|depois|mais tarde|voces|quando)|(?:te|lhes?) (?:chamo|aviso|procuro)|(?:falo|volto a falar) com (?:voces|a clinica)|mais pra frente|quando (?:eu )?(?:decidir|puder|conseguir)/.test(
    normalizado,
  );
}

function mensagemIndicaReflexao_(texto) {
  const normalizado = normalizarTextoRetomadas_(texto);

  return /vou (?:pensar|avaliar|ver com calma|conversar com)|preciso (?:pensar|avaliar|conversar com)|ainda estou (?:pensando|avaliando)/.test(
    normalizado,
  );
}

function conversaTemPromessaHumanaPendente_(conversa) {
  if (!conversa.length) return false;

  const ultima = conversa[conversa.length - 1];
  if (ultima.direcao !== "OUT") return false;

  const texto = normalizarTextoRetomadas_(ultima.texto);

  return /vou (?:confirmar|verificar|checar|alinhar)|estou (?:confirmando|verificando|checando)|retorn(?:o|aremos?) (?:assim que|com|pela manha)|vou falar com a equipe/.test(
    texto,
  );
}

function classificarEngajamentoRetomada_(conversa) {
  const entradas = conversa.filter(function (mensagem) {
    return (
      mensagem.direcao === "IN" &&
      String(mensagem.texto || "").trim()
    );
  });
  const caracteres = entradas.reduce(function (total, mensagem) {
    return total + String(mensagem.texto || "").trim().length;
  }, 0);
  const contexto = normalizarTextoRetomadas_(
    entradas
      .map(function (mensagem) {
        return mensagem.texto;
      })
      .join(" "),
  );

  if (
    entradas.length >= 2 ||
    caracteres >= 80 ||
    /valor|preco|orcamento|agenda|horario|disponibilidade/.test(
      contexto,
    )
  ) {
    return "engajado";
  }

  return "passivo";
}

function statusRetomadaEncerrado_(status) {
  const normalizado = normalizarTextoRetomadas_(status);

  return RETOMADAS_STATUS_ENCERRADOS.indexOf(normalizado) >= 0;
}

function obterPlanilhaControleRetomadas_(arquivo) {
  let planilha = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaControle,
  );

  if (!planilha) {
    planilha = arquivo.insertSheet(
      RETOMADAS_CONFIG.planilhaControle,
    );
    planilha.setFrozenRows(1);
    planilha.hideSheet();
  }

  planilha
    .getRange(1, 1, 1, RETOMADAS_CONTROLE_HEADERS.length)
    .setValues([RETOMADAS_CONTROLE_HEADERS]);

  return planilha;
}

function obterChavesRetomadasEnviadas_(planilha, dataLocal) {
  const resultado = new Set();
  const ultimaLinha = planilha.getLastRow();

  if (ultimaLinha < 2) {
    return resultado;
  }

  const valores = planilha
    .getRange(2, 1, ultimaLinha - 1, 2)
    .getValues();

  valores.forEach(function (linha) {
    const data = dataRetomadaValida_(linha[1]);
    const chave = String(linha[0] || "").trim();

    if (
      chave &&
      data &&
      formatarDataRetomadas_(data, "yyyy-MM-dd") === dataLocal
    ) {
      resultado.add(chave);
    }
  });

  return resultado;
}

function registrarRetomadasEnviadas_(planilha, candidatos, agora) {
  if (!candidatos.length) {
    return;
  }

  const linhas = candidatos.map(function (candidato) {
    return [
      candidato.chaveDiaria,
      agora,
      candidato.telefone,
      candidato.ultimaMensagem.messageId,
      candidato.etapa.numero,
      candidato.horario,
      candidato.lead.status,
      candidato.lead.resumo,
      candidato.sugestao,
      candidato.modo || "Manual",
      candidato.automatico
        ? "Programada"
        : candidato.lead.suspendAutomaticFollowUp
          ? "Suspensa na planilha"
          : "Ação manual",
      candidato.automatico
        ? dataHoraProgramadaRetomada_(agora, candidato.horario)
        : "",
      "",
      "",
      "",
    ];
  });

  planilha
    .getRange(
      planilha.getLastRow() + 1,
      1,
      linhas.length,
      RETOMADAS_CONTROLE_HEADERS.length,
    )
    .setValues(linhas);
}

function processarRetomadasAutomaticas() {
  const propriedades = PropertiesService.getScriptProperties();

  if (
    propriedades.getProperty(
      RETOMADAS_CONFIG.propriedadeAtiva,
    ) !== "true"
  ) {
    return { ok: true, active: false, sent: 0 };
  }

  const agora = new Date();

  if (!estaNoHorarioRetomadasAutomaticas_(agora)) {
    return {
      ok: true,
      active: true,
      sent: 0,
      reason: "outside_send_window",
    };
  }

  const segredo = propriedades.getProperty(
    RETOMADAS_CONFIG.propriedadeSegredo,
  );

  if (!segredo) {
    throw new Error(
      "A propriedade LEADS_INGEST_SECRET não está configurada.",
    );
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    return { ok: false, active: true, sent: 0, error: "busy_retry" };
  }

  try {
    return processarRetomadasAutomaticasInterno_(
      agora,
      segredo,
      propriedades,
    );
  } finally {
    lock.releaseLock();
  }
}

function estaNoHorarioRetomadasAutomaticas_(data) {
  const partes = formatarDataRetomadas_(data, "HH:mm")
    .split(":")
    .map(Number);
  const minutos = partes[0] * 60 + partes[1];

  return (
    minutos >= RETOMADAS_CONFIG.horaInicioRetomadas * 60 &&
    minutos < RETOMADAS_CONFIG.horaFimRetomadas * 60
  );
}

function processarRetomadasAutomaticasInterno_(
  agora,
  segredo,
  propriedades,
) {
  const arquivo = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const planilhaControle = obterPlanilhaControleRetomadas_(arquivo);
  const planilhaLeads = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaLeads,
  );
  const planilhaMensagens = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaMensagens,
  );

  if (!planilhaLeads || !planilhaMensagens) {
    throw new Error("Estrutura de leads ou mensagens não encontrada.");
  }

  if (typeof garantirEstruturaPreferenciasContato_ === "function") {
    garantirEstruturaPreferenciasContato_(planilhaLeads);
  }

  const ultimaLinha = planilhaControle.getLastRow();

  if (ultimaLinha < 2) {
    return { ok: true, active: true, sent: 0, cancelled: 0 };
  }

  const linhas = planilhaControle
    .getRange(
      2,
      1,
      ultimaLinha - 1,
      RETOMADAS_CONTROLE_HEADERS.length,
    )
    .getValues();
  const leadsPorTelefone = carregarLeadsRetomadas_(planilhaLeads);
  const conversasPorTelefone = carregarConversasRetomadas_(
    planilhaMensagens,
  );
  let enviados = 0;
  let cancelados = 0;
  let falhas = 0;

  for (let indice = 0; indice < linhas.length; indice += 1) {
    if (enviados + falhas >= 10) break;

    const linha = linhas[indice];
    const numeroLinha = indice + 2;
    const modo = String(linha[9] || "").trim();
    const statusEnvio = String(linha[10] || "").trim();
    const programadaPara = dataRetomadaValida_(linha[11]);

    if (
      modo !== "Automático" ||
      statusEnvio !== "Programada" ||
      !programadaPara ||
      programadaPara.getTime() > agora.getTime()
    ) {
      continue;
    }

    const atrasoMinutos = Math.floor(
      (agora.getTime() - programadaPara.getTime()) / 60000,
    );
    const telefone = normalizarTelefoneRetomadas_(linha[2]);
    const lead = leadsPorTelefone[telefone];
    const conversa = conversasPorTelefone[telefone] || [];
    const validacao = validarRetomadaAutomatica_(
      {
        telefone: telefone,
        messageIdBase: String(linha[3] || "").trim(),
        etapa: Number(linha[4] || 0),
        sugestao: String(linha[8] || "").trim(),
        atrasoMinutos: atrasoMinutos,
      },
      lead,
      conversa,
      agora,
    );

    if (!validacao.ok) {
      planilhaControle
        .getRange(numeroLinha, 11, 1, 5)
        .setValues([[
          "Cancelada — " + validacao.reason,
          programadaPara,
          agora,
          "",
          validacao.reason,
        ]]);
      cancelados += 1;
      continue;
    }

    planilhaControle
      .getRange(numeroLinha, 11, 1, 5)
      .setValues([[
        "Enviando",
        programadaPara,
        agora,
        "",
        "",
      ]]);
    SpreadsheetApp.flush();

    const resultado = enviarRetomadaAutomatica_(
      {
        planId: String(linha[0] || "").trim(),
        patientPhone: telefone,
        body: validacao.sugestao,
      },
      segredo,
      propriedades,
    );

    if (!resultado.ok || !resultado.sent) {
      planilhaControle
        .getRange(numeroLinha, 11, 1, 5)
        .setValues([[
          "Falha — revisar",
          programadaPara,
          agora,
          "",
          resultado.error || "send_failed",
        ]]);
      falhas += 1;
      continue;
    }

    planilhaControle
      .getRange(numeroLinha, 11, 1, 5)
      .setValues([[
        "Enviada",
        programadaPara,
        agora,
        agora,
        "",
      ]]);
    registrarMensagemRetomadaAutomatica_(
      arquivo,
      lead,
      telefone,
      String(linha[0] || "").trim(),
      validacao.sugestao,
      agora,
    );
    enviados += 1;
  }

  return {
    ok: falhas === 0,
    active: true,
    sent: enviados,
    cancelled: cancelados,
    failed: falhas,
  };
}

function validarRetomadaAutomatica_(plano, lead, conversa, agora) {
  if (!lead) return { ok: false, reason: "lead_not_found" };
  if (plano.etapa !== 1) {
    return { ok: false, reason: "only_first_followup" };
  }
  if (
    lead.neverFollowUp ||
    lead.neverBotReply ||
    lead.suspendAutomaticFollowUp
  ) {
    return { ok: false, reason: "suspended_in_leads" };
  }
  if (statusRetomadaEncerrado_(lead.status)) {
    return { ok: false, reason: "lead_closed" };
  }
  if (
    plano.atrasoMinutos < 0 ||
    plano.atrasoMinutos >
      RETOMADAS_CONFIG.maximoAtrasoAutomaticoMinutos
  ) {
    return { ok: false, reason: "stale_schedule" };
  }
  if (!plano.sugestao || !conversa.length) {
    return { ok: false, reason: "missing_context" };
  }

  const ultima = conversa[conversa.length - 1];

  if (
    ultima.direcao !== "OUT" ||
    ultima.messageId !== plano.messageIdBase
  ) {
    return { ok: false, reason: "conversation_changed" };
  }
  if (
    mensagemSemRetomada_(ultima.texto) ||
    retornoFuturoRecente_(conversa, agora) ||
    conversaTemPromessaHumanaPendente_(conversa)
  ) {
    return { ok: false, reason: "followup_not_appropriate" };
  }

  const ultimaEntrada = conversa
    .slice()
    .reverse()
    .find(function (mensagem) {
      return mensagem.direcao === "IN";
    });

  if (!ultimaEntrada) {
    return { ok: false, reason: "no_inbound_message" };
  }

  const minutosDesdeEntrada = Math.floor(
    (agora.getTime() - ultimaEntrada.dataHora.getTime()) / 60000,
  );

  if (
    minutosDesdeEntrada < 0 ||
    minutosDesdeEntrada > RETOMADAS_CONFIG.janelaWhatsAppMinutos
  ) {
    return { ok: false, reason: "whatsapp_window_closed" };
  }

  const contexto = normalizarTextoRetomadas_([
    lead.status,
    lead.resumo,
    lead.proximaAcao,
    conversa.map(function (mensagem) {
      return mensagem.texto;
    }).join(" "),
  ].join(" "));

  if (!retomadaComercialPermitida_(contexto)) {
    return { ok: false, reason: "sensitive_context" };
  }
  if (/valor|preco|orcamento|pagamento|parcel|agend|horar/.test(contexto)) {
    return { ok: false, reason: "human_review_required" };
  }

  return { ok: true, sugestao: plano.sugestao };
}

function enviarRetomadaAutomatica_(payload, segredo, propriedades) {
  const endpoint =
    propriedades.getProperty(
      RETOMADAS_CONFIG.propriedadeEndpointRetomadaAutomatica,
    ) || RETOMADAS_CONFIG.endpointRetomadaAutomatica;
  let resposta;

  try {
    resposta = UrlFetchApp.fetch(endpoint, {
      method: "post",
      contentType: "application/json; charset=utf-8",
      headers: { "x-liv-secret": segredo },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (error) {
    return { ok: false, sent: false, error: "request_failed" };
  }

  let corpo = {};

  try {
    corpo = JSON.parse(resposta.getContentText() || "{}");
  } catch (error) {
    corpo = {};
  }

  return {
    ok:
      resposta.getResponseCode() >= 200 &&
      resposta.getResponseCode() < 300 &&
      corpo.ok === true,
    sent: corpo.sent === true,
    error:
      corpo.error ||
      "http_" + String(resposta.getResponseCode()),
  };
}

function registrarMensagemRetomadaAutomatica_(
  arquivo,
  lead,
  telefone,
  planId,
  texto,
  agora,
) {
  const identificador =
    "scheduled-followup-" +
    String(planId || agora.getTime())
      .replace(/[^A-Za-z0-9_-]/g, "-")
      .slice(0, 120);

  if (typeof recordLeadMessageAndQueue_ === "function") {
    recordLeadMessageAndQueue_(
      arquivo,
      lead.linha,
      {
        phone: telefone,
        messageId: identificador,
        eventId: identificador,
        contactAt: agora,
        text: texto,
      },
      "OUT",
    );
    return;
  }

  const planilha = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaMensagens,
  );
  planilha.appendRow([
    telefone,
    "OUT",
    agora,
    identificador,
    identificador,
    texto,
    lead.linha,
  ]);
}

function dataHoraProgramadaRetomada_(dataBase, horario) {
  const dataLocal = formatarDataRetomadas_(dataBase, "yyyy-MM-dd");
  const partesData = dataLocal.split("-").map(Number);
  const partesHora = String(horario || "").split(":").map(Number);

  if (
    partesData.length !== 3 ||
    partesHora.length !== 2 ||
    partesData.concat(partesHora).some(function (valor) {
      return !Number.isFinite(valor);
    })
  ) {
    return "";
  }

  return new Date(
    partesData[0],
    partesData[1] - 1,
    partesData[2],
    partesHora[0],
    partesHora[1],
    0,
    0,
  );
}

function limparControleRetomadasAntigo_(planilha, agora) {
  const ultimaLinha = planilha.getLastRow();

  if (ultimaLinha < 2) {
    return;
  }

  const datas = planilha
    .getRange(2, 2, ultimaLinha - 1, 1)
    .getValues();
  const limite = agora.getTime() - 90 * 24 * 60 * 60 * 1000;
  const linhasExcluir = [];

  datas.forEach(function (linha, indice) {
    const data = dataRetomadaValida_(linha[0]);

    if (data && data.getTime() < limite) {
      linhasExcluir.push(indice + 2);
    }
  });

  for (let indice = linhasExcluir.length - 1; indice >= 0; indice -= 1) {
    planilha.deleteRow(linhasExcluir[indice]);
  }
}

function montarTextoEmailRetomadas_(
  candidatos,
  sugeridosParaEquipe,
  dataApresentacao,
  agendaCuidados,
) {
  const cuidados = agendaCuidados || [];
  const automaticosHoje = cuidados.filter(function (item) {
    return !item.futuro && item.automatico;
  }).concat(
    candidatos
      .filter(function (candidato) {
        return candidato.automatico;
      })
      .map(converterRetomadaParaCuidadoEmail_),
  );
  const manuaisHoje = cuidados.filter(function (item) {
    return !item.futuro && !item.automatico;
  });
  const cuidadosFuturos = cuidados.filter(function (item) {
    return item.futuro;
  });
  const linhas = [
    "Clínica LIV — agenda de cuidado de " + dataApresentacao,
    "",
    "Este e-mail informa os envios do dia. A primeira retomada simples será enviada automaticamente no horário indicado, salvo se estiver suspensa na planilha Leads.",
    "",
    "ENVIOS AUTOMÁTICOS PREVISTOS HOJE (" +
      automaticosHoje.length +
      ")",
  ];

  if (!automaticosHoje.length) {
    linhas.push("Nenhum envio automático previsto.");
  }

  automaticosHoje.forEach(function (item, indice) {
    linhas.push("");
    linhas.push(
      String(indice + 1) +
        ". " +
        (item.horario || "A definir") +
        " — " +
        item.categoria +
        " — " +
        (item.nome || item.telefone),
    );
    linhas.push("Responsável: " + item.responsavel);
    linhas.push("Contexto: " + item.contexto);
    linhas.push("Mensagem que será enviada: " + item.sugestao);
  });

  linhas.push("");
  linhas.push(
    "AÇÕES HUMANAS SUGERIDAS HOJE (" +
      manuaisHoje.length +
      ")",
  );
  linhas.push(
    "Nada desta seção é enviado automaticamente. Revise o histórico antes de usar a mensagem.",
  );

  if (!manuaisHoje.length) {
    linhas.push("Nenhuma ação manual sugerida.");
  }

  manuaisHoje.forEach(function (item, indice) {
    linhas.push("");
    linhas.push(
      String(indice + 1) +
        ". " +
        (item.horario || "A definir") +
        " — " +
        item.categoria +
        " — " +
        (item.nome || item.telefone),
    );
    linhas.push("Responsável: " + item.responsavel);
    linhas.push("Contexto: " + item.contexto);
    linhas.push("Mensagem sugerida: " + item.sugestao);
    if (item.telefone) {
      linhas.push(
        "Abrir WhatsApp: https://wa.me/" +
          item.telefone.replace(/\D/g, ""),
      );
    }
  });

  linhas.push("");
  linhas.push(
    "PRÓXIMOS MARCOS DE CUIDADO — 7 DIAS (" +
      cuidadosFuturos.length +
      ")",
  );

  if (!cuidadosFuturos.length) {
    linhas.push("Nenhum marco futuro identificado.");
  }

  cuidadosFuturos.forEach(function (item) {
    linhas.push(
      "- [" +
        (item.automatico ? "AUTOMÁTICO" : "MANUAL") +
        "] " +
        item.contexto +
        " — " +
        (item.nome || item.telefone),
    );
  });

  linhas.push("");
  linhas.push(
    "PLANO DO DIA (" + candidatos.length + ")",
  );

  if (!candidatos.length) {
    linhas.push("Nenhuma retomada planejada para hoje.");
  }

  candidatos.forEach(function (candidato, indice) {
    linhas.push(
      String(indice + 1) +
        ". " +
        candidato.horario +
        " — telefone " +
        candidato.telefone,
    );
    linhas.push(
      "Responsável sugerido: " +
        (candidato.responsavel === "bruna"
          ? candidato.automatico
            ? "Bruna — envio automático programado"
            : candidato.lead.suspendAutomaticFollowUp
              ? "Suspensa na planilha — não enviar"
              : "Bruna — revisar"
          : "Amanda/equipe — conferir e enviar manualmente"),
    );
    linhas.push("Etapa: " + candidato.etapa.rotulo);
    linhas.push("Status: " + candidato.lead.status);
    linhas.push(
      "Último contato: " +
        formatarDataRetomadas_(
          candidato.ultimoContato,
          "dd/MM/yyyy HH:mm",
        ),
    );

    if (candidato.lead.resumo) {
      linhas.push("Resumo: " + candidato.lead.resumo);
    }

    if (candidato.lead.proximaAcao) {
      linhas.push("Próxima ação: " + candidato.lead.proximaAcao);
    }

    linhas.push(
      "Abrir WhatsApp: https://wa.me/" +
        candidato.telefone.replace(/\D/g, ""),
    );
    linhas.push("");
  });

  linhas.push(
    "AÇÃO SUGERIDA PARA AMANDA/EQUIPE (" +
      sugeridosParaEquipe.length +
      ")",
  );

  if (!sugeridosParaEquipe.length) {
    linhas.push("Nenhuma retomada manual sugerida para hoje.");
  }

  sugeridosParaEquipe.forEach(function (candidato, indice) {
    linhas.push("");
    linhas.push(
      String(indice + 1) +
        ". " +
        candidato.horario +
        " — telefone " +
        candidato.telefone,
    );
    linhas.push("Motivo: " + candidato.etapa.rotulo);
    linhas.push("Mensagem sugerida: " + candidato.sugestao);
    linhas.push(
      "Abrir WhatsApp: https://wa.me/" +
        candidato.telefone.replace(/\D/g, ""),
    );
  });

  linhas.push("");
  linhas.push(
    "Somente os itens expressamente listados em ENVIOS AUTOMÁTICOS PREVISTOS são disparados sem ação humana. A rotina revalida a conversa e as preferências imediatamente antes do envio; se houver resposta nova, bloqueio, suspensão, tema sensível ou janela inválida do WhatsApp, o disparo é cancelado. As retomadas tardias continuam manuais. Para suspender, marque “Suspender retomada automática” na linha da pessoa na aba Google Ads - Conversões.",
  );

  return linhas.join("\n");
}

function converterRetomadaParaCuidadoEmail_(candidato) {
  return {
    futuro: false,
    automatico: true,
    horario: candidato.horario,
    categoria: candidato.etapa.rotulo,
    nome: candidato.lead.referencia || candidato.telefone,
    telefone: candidato.telefone,
    responsavel: "Bruna — envio automático",
    contexto:
      candidato.lead.resumo ||
      "Primeira retomada simples após contato inicial",
    sugestao: candidato.sugestao,
  };
}

function montarHtmlEmailRetomadas_(
  candidatos,
  sugeridosParaEquipe,
  dataApresentacao,
  agendaCuidados,
) {
  let planoDoDia = "";
  let acaoEquipe = "";
  const agendaHtml = montarHtmlAgendaCuidados_(
    (agendaCuidados || []).concat(
      candidatos
        .filter(function (candidato) {
          return candidato.automatico;
        })
        .map(converterRetomadaParaCuidadoEmail_),
    ),
  );

  if (!candidatos.length) {
    planoDoDia =
      '<p style="font-size:16px;color:#374151;">' +
      "Nenhuma retomada planejada para hoje." +
      "</p>";
  } else {
    planoDoDia =
      '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">' +
      '<thead><tr style="background:#f3f4f6;text-align:left;">' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Horário</th>' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Paciente</th>' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Responsável sugerido</th>' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Contexto</th>' +
      "</tr></thead><tbody>";

    candidatos.forEach(function (candidato) {
      const ultimosDigitos = candidato.telefone.slice(-4);
      const link =
        "https://wa.me/" +
        candidato.telefone.replace(/\D/g, "");
      const contexto = [
        "<strong>" +
          escaparHtmlRetomadas_(candidato.etapa.rotulo) +
          "</strong>",
        escaparHtmlRetomadas_(candidato.lead.status),
        candidato.lead.resumo
          ? escaparHtmlRetomadas_(candidato.lead.resumo)
          : "",
        candidato.lead.proximaAcao
          ? "Próxima ação: " +
            escaparHtmlRetomadas_(candidato.lead.proximaAcao)
          : "",
      ].filter(Boolean).join("<br>");
      const responsavel =
        candidato.responsavel === "bruna"
          ? candidato.automatico
            ? "Bruna<br><span style=\"color:#166534;font-size:12px;\">envio automático programado; mensagem exibida acima</span>"
            : candidato.lead.suspendAutomaticFollowUp
              ? "Suspensa na planilha<br><span style=\"color:#9a3412;font-size:12px;\">nenhum envio será feito</span>"
              : "Bruna<br><span style=\"color:#6b7280;font-size:12px;\">revisar</span>"
          : "Amanda/equipe<br><span style=\"color:#6b7280;font-size:12px;\">conferir e enviar manualmente</span>";

      planoDoDia +=
        "<tr>" +
        '<td style="padding:10px;border:1px solid #e5e7eb;vertical-align:top;"><strong>' +
        escaparHtmlRetomadas_(candidato.horario) +
        "</strong></td>" +
        '<td style="padding:10px;border:1px solid #e5e7eb;vertical-align:top;">' +
        '<a href="' +
        link +
        '" style="color:#075e54;font-weight:bold;">Abrir WhatsApp • ' +
        escaparHtmlRetomadas_(ultimosDigitos) +
        "</a><br>" +
        '<span style="color:#6b7280;font-size:12px;">' +
        escaparHtmlRetomadas_(candidato.telefone) +
        "</span></td>" +
        '<td style="padding:10px;border:1px solid #e5e7eb;vertical-align:top;">' +
        responsavel +
        "</td>" +
        '<td style="padding:10px;border:1px solid #e5e7eb;vertical-align:top;">' +
        contexto +
        "</td>" +
        "</tr>";
    });

    planoDoDia += "</tbody></table>";
  }

  if (!sugeridosParaEquipe.length) {
    acaoEquipe =
      '<p style="font-size:16px;color:#374151;">' +
      "Nenhuma retomada manual sugerida para hoje." +
      "</p>";
  } else {
    acaoEquipe =
      '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">' +
      '<thead><tr style="background:#ecfdf5;text-align:left;">' +
      '<th style="padding:10px;border:1px solid #d1fae5;">Horário</th>' +
      '<th style="padding:10px;border:1px solid #d1fae5;">Paciente</th>' +
      '<th style="padding:10px;border:1px solid #d1fae5;">Mensagem sugerida</th>' +
      "</tr></thead><tbody>";

    sugeridosParaEquipe.forEach(function (candidato) {
      const ultimosDigitos = candidato.telefone.slice(-4);
      const link =
        "https://wa.me/" +
        candidato.telefone.replace(/\D/g, "");

      acaoEquipe +=
        "<tr>" +
        '<td style="padding:10px;border:1px solid #d1fae5;vertical-align:top;"><strong>' +
        escaparHtmlRetomadas_(candidato.horario) +
        "</strong><br>" +
        '<span style="color:#6b7280;font-size:12px;">' +
        escaparHtmlRetomadas_(candidato.etapa.rotulo) +
        "</span></td>" +
        '<td style="padding:10px;border:1px solid #d1fae5;vertical-align:top;">' +
        '<a href="' +
        link +
        '" style="color:#075e54;font-weight:bold;">Abrir WhatsApp • ' +
        escaparHtmlRetomadas_(ultimosDigitos) +
        "</a></td>" +
        '<td style="padding:10px;border:1px solid #d1fae5;vertical-align:top;">' +
        escaparHtmlRetomadas_(candidato.sugestao) +
        "</td>" +
        "</tr>";
    });

    acaoEquipe += "</tbody></table>";
  }

  return (
    '<div style="max-width:980px;margin:auto;font-family:Arial,sans-serif;color:#111827;">' +
    '<h2 style="color:#075e54;">Clínica LIV — agenda de cuidado</h2>' +
    '<p style="color:#4b5563;">Resumo operacional de ' +
    escaparHtmlRetomadas_(dataApresentacao) +
    ". A primeira retomada simples será enviada automaticamente no horário indicado, salvo se estiver suspensa na planilha Leads.</p>" +
    agendaHtml +
    '<h3 style="margin-top:24px;">Plano do dia (' +
    candidatos.length +
    ")</h3>" +
    planoDoDia +
    '<h3 style="margin-top:28px;color:#075e54;">Ação sugerida para Amanda/equipe (' +
    sugeridosParaEquipe.length +
    ")</h3>" +
    acaoEquipe +
    '<p style="margin-top:20px;padding:12px;background:#fff7ed;color:#9a3412;border-radius:8px;">' +
    "Somente os itens expressamente listados em <strong>Envios automáticos previstos</strong> são disparados sem ação humana. A conversa e as preferências são revalidadas imediatamente antes do envio. Para suspender, marque <strong>Suspender retomada automática</strong> na linha da pessoa em <strong>Google Ads - Conversões</strong>. Retomadas tardias continuam manuais." +
    "</p></div>"
  );
}

function normalizarTelefoneRetomadas_(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  return digitos ? "+" + digitos : "";
}

function normalizarTextoRetomadas_(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function dataRetomadaValida_(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataRetomadas_(data, formato) {
  return Utilities.formatDate(
    data,
    RETOMADAS_CONFIG.fusoHorario,
    formato,
  );
}

function diferencaDiasLocaisRetomadas_(inicio, fim) {
  const chaveInicio = formatarDataRetomadas_(inicio, "yyyy-MM-dd");
  const chaveFim = formatarDataRetomadas_(fim, "yyyy-MM-dd");
  const partesInicio = chaveInicio.split("-").map(Number);
  const partesFim = chaveFim.split("-").map(Number);
  const utcInicio = Date.UTC(
    partesInicio[0],
    partesInicio[1] - 1,
    partesInicio[2],
  );
  const utcFim = Date.UTC(
    partesFim[0],
    partesFim[1] - 1,
    partesFim[2],
  );

  return Math.floor((utcFim - utcInicio) / (24 * 60 * 60 * 1000));
}

function escaparHtmlRetomadas_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
