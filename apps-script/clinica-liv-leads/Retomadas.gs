const RETOMADAS_CONFIG = Object.freeze({
  destinatario: "daniel.added@gmail.com",
  planilhaMensagens: "_WHATSAPP_MENSAGENS",
  planilhaLeads: "Google Ads - Conversões",
  planilhaControle: "_WHATSAPP_RETOMADAS",
  fusoHorario: "America/Sao_Paulo",
  horaEmail: 8,
  minutoEmail: 0,
  intervaloMesmoContatoHoras: 6,
  maximoDiasSemResposta: 14,
  maximoPacientesPorEmail: 50,
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

const RETOMADAS_ETAPAS = Object.freeze([
  Object.freeze({
    numero: 1,
    diasMinimos: 1,
    diasMaximos: 2,
    rotulo: "1ª retomada",
  }),
  Object.freeze({
    numero: 2,
    diasMinimos: 3,
    diasMaximos: 5,
    rotulo: "2ª retomada",
  }),
  Object.freeze({
    numero: 3,
    diasMinimos: 7,
    diasMaximos: 9,
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

function enviarEmailDiarioRetomadas() {
  return enviarEmailDiarioRetomadasInterno_(new Date());
}

function testarEmailDiarioRetomadas() {
  return enviarEmailDiarioRetomadasInterno_(new Date());
}

function enviarEmailDiarioRetomadasInterno_(agora) {
  const arquivo = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const planilhaLeads = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaLeads,
  );
  const planilhaMensagens = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaMensagens,
  );

  if (!planilhaLeads) {
    throw new Error("Aba de leads da Dra. Amanda não encontrada.");
  }

  if (!planilhaMensagens) {
    throw new Error("Histórico de mensagens não encontrado.");
  }

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

    if (!lead || statusRetomadaEncerrado_(lead.status)) {
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

  const selecionados = candidatos.slice(
    0,
    RETOMADAS_CONFIG.maximoPacientesPorEmail,
  );

  atribuirHorariosRetomadas_(selecionados);

  const dataApresentacao = formatarDataRetomadas_(
    agora,
    "dd/MM/yyyy",
  );
  const assunto =
    "Clínica LIV — retomadas manuais de " +
    dataApresentacao +
    " (" +
    selecionados.length +
    ")";
  const corpoTexto = montarTextoEmailRetomadas_(
    selecionados,
    dataApresentacao,
  );
  const corpoHtml = montarHtmlEmailRetomadas_(
    selecionados,
    dataApresentacao,
  );

  MailApp.sendEmail({
    to: RETOMADAS_CONFIG.destinatario,
    subject: assunto,
    body: corpoTexto,
    htmlBody: corpoHtml,
    name: "Clínica LIV — Retomadas",
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

  const valores = planilha
    .getRange(2, 1, ultimaLinha - 1, 25)
    .getDisplayValues();

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
      plataforma: String(linha[19] || "").trim(),
      campanha: String(linha[20] || "").trim(),
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

  if (
    quantidadeContatos < 1 ||
    quantidadeContatos > RETOMADAS_ETAPAS.length
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

  const contexto = normalizarTextoRetomadas_([
    lead.status,
    lead.resumo,
    lead.proximaAcao,
    lead.referencia,
    ultimaMensagem.texto,
  ].join(" "));
  const prioritario =
    /agend|horar|consulta|avaliacao|valor|preco|orcamento|pagamento|parcel|ferias|data disponivel/.test(
      contexto,
    );

  return {
    telefone: telefone,
    lead: lead,
    ultimaMensagem: ultimaMensagem,
    ultimoContato: ultimaMensagem.dataHora,
    diasSemResposta: diasSemResposta,
    etapa: etapa,
    prioritario: prioritario,
    horario: "",
    sugestao: sugerirMensagemRetomada_(
      etapa.numero,
      prioritario,
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
  let indicePrioritario = 0;
  let indiceRegular = 0;

  candidatos.forEach(function (candidato) {
    if (candidato.prioritario) {
      candidato.horario = horarioRetomadaPorIndice_(
        RETOMADAS_CONFIG.horariosPrioritarios,
        indicePrioritario,
      );
      indicePrioritario += 1;
      return;
    }

    candidato.horario = horarioRetomadaPorIndice_(
      RETOMADAS_CONFIG.horariosRegulares,
      indiceRegular,
    );
    indiceRegular += 1;
  });
}

function horarioRetomadaPorIndice_(horarios, indice) {
  if (indice < horarios.length) {
    return horarios[indice];
  }

  const ultimo = horarios[horarios.length - 1];
  const partes = ultimo.split(":");
  const minutosBase =
    Number(partes[0]) * 60 + Number(partes[1]);
  const minutos = minutosBase + (indice - horarios.length + 1) * 15;
  const hora = Math.floor(minutos / 60) % 24;
  const minuto = minutos % 60;

  return (
    String(hora).padStart(2, "0") +
    ":" +
    String(minuto).padStart(2, "0")
  );
}

function sugerirMensagemRetomada_(etapa, prioritario) {
  if (etapa === 1 && prioritario) {
    return "Olá! Passando para dar continuidade ao seu atendimento. Posso verificar as opções de horário para sua avaliação com a Dra. Amanda e te ajudar a escolher a mais confortável?";
  }

  if (etapa === 1) {
    return "Olá! Passando para saber se ficou alguma dúvida sobre o procedimento e se posso ajudar você a dar o próximo passo com tranquilidade.";
  }

  if (etapa === 2) {
    return "Olá! Retomando seu atendimento com cuidado: se ainda fizer sentido para você, posso esclarecer o que ficou pendente ou verificar possibilidades de avaliação com a Dra. Amanda.";
  }

  return "Olá! Faço só um último contato para não deixar sua solicitação sem retorno. Se quiser retomar a conversa sobre o procedimento, estou à disposição para ajudar.";
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

function statusRetomadaEncerrado_(status) {
  const normalizado = normalizarTextoRetomadas_(status);

  return RETOMADAS_STATUS_ENCERRADOS.indexOf(normalizado) >= 0;
}

function obterPlanilhaControleRetomadas_(arquivo) {
  let planilha = arquivo.getSheetByName(
    RETOMADAS_CONFIG.planilhaControle,
  );

  if (planilha) {
    return planilha;
  }

  planilha = arquivo.insertSheet(
    RETOMADAS_CONFIG.planilhaControle,
  );
  planilha
    .getRange(1, 1, 1, 9)
    .setValues([[
      "Chave diária",
      "Data do e-mail",
      "Telefone",
      "Message ID",
      "Etapa",
      "Horário planejado",
      "Status do lead",
      "Resumo",
      "Sugestão",
    ]]);
  planilha.setFrozenRows(1);
  planilha.hideSheet();

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
    ];
  });

  planilha
    .getRange(
      planilha.getLastRow() + 1,
      1,
      linhas.length,
      9,
    )
    .setValues(linhas);
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

function montarTextoEmailRetomadas_(candidatos, dataApresentacao) {
  const linhas = [
    "Clínica LIV — retomadas manuais de " + dataApresentacao,
    "",
  ];

  if (!candidatos.length) {
    linhas.push("Nenhuma retomada manual planejada para hoje.");
  }

  candidatos.forEach(function (candidato, indice) {
    linhas.push(
      String(indice + 1) +
        ". " +
        candidato.horario +
        " — telefone " +
        candidato.telefone,
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

    linhas.push("Mensagem sugerida: " + candidato.sugestao);
    linhas.push(
      "Abrir WhatsApp: https://wa.me/" +
        candidato.telefone.replace(/\D/g, ""),
    );
    linhas.push("");
  });

  linhas.push(
    "Antes de enviar, confira o histórico. Não retome se a paciente respondeu por outro canal, pediu para não receber mensagens ou se o caso deixou de fazer sentido.",
  );

  return linhas.join("\n");
}

function montarHtmlEmailRetomadas_(candidatos, dataApresentacao) {
  let conteudo = "";

  if (!candidatos.length) {
    conteudo =
      '<p style="font-size:16px;color:#374151;">' +
      "Nenhuma retomada manual planejada para hoje." +
      "</p>";
  } else {
    conteudo =
      '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">' +
      '<thead><tr style="background:#f3f4f6;text-align:left;">' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Horário</th>' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Paciente</th>' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Contexto</th>' +
      '<th style="padding:10px;border:1px solid #e5e7eb;">Mensagem sugerida</th>' +
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

      conteudo +=
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
        contexto +
        "</td>" +
        '<td style="padding:10px;border:1px solid #e5e7eb;vertical-align:top;">' +
        escaparHtmlRetomadas_(candidato.sugestao) +
        "</td>" +
        "</tr>";
    });

    conteudo += "</tbody></table>";
  }

  return (
    '<div style="max-width:980px;margin:auto;font-family:Arial,sans-serif;color:#111827;">' +
    '<h2 style="color:#075e54;">Clínica LIV — retomadas manuais</h2>' +
    '<p style="color:#4b5563;">Planejamento de ' +
    escaparHtmlRetomadas_(dataApresentacao) +
    ". Nenhuma mensagem foi enviada automaticamente aos pacientes.</p>" +
    conteudo +
    '<p style="margin-top:20px;padding:12px;background:#fff7ed;color:#9a3412;border-radius:8px;">' +
    "Antes de enviar, confira o histórico. Não retome se a paciente respondeu por outro canal, pediu para não receber mensagens ou se o caso deixou de fazer sentido." +
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
