# Execução das simulações da correção integrada — 14 de agosto de 2026

**Autorização:** o usuário autorizou iniciar a etapa em 14/08/2026 e, depois de revisar o plano, autorizou a deduplicação, a reconciliação das fases históricas e, em bloco posterior, a reconciliação segura de consultas e Calendar. Funil, atribuição, fórmulas e mídia continuam fora dessa autorização.

**Resultado:** Apps Script versão 83 publicado; nove simulações iniciais concluídas; deduplicação, fases históricas, subconjunto seguro de consultas, reconciliação offline do Google Ads, observabilidade prospectiva Meta Site e painel humano/SLA aplicados em blocos separados, com backups, travas e pós-voos. Casos históricos ambíguos de consultas/atribuição e funil permanecem pendentes; Google, cobertura Meta e cobertura do SLA seguem em observação.

## Versões e backup

- Apps Script anterior registrado: versão 72, de 13/08/2026 às 22:24.
- Versões intermediárias publicadas durante a preparação: 73, 74 e 75.
- Versão usada nas simulações iniciais: **76**, de 14/08/2026 às 08:27.
- Versão publicada para a deduplicação auditável: **77**, de 14/08/2026 às 10:03.
- Versão publicada para a reconciliação protegida das fases: **78**, de 14/08/2026 às 12:21.
- Versão intermediária da reconciliação de consultas: **79**.
- Versão publicada após corrigir a comparação Unicode e validar a reconciliação segura: **80**, de 14/08/2026 às 13:15.
- Versão publicada para a reconciliação offline Google Ads: **81**.
- Versão publicada para a observabilidade prospectiva Meta Site: **82**.
- Versão publicada para o painel humano e o resumo de SLA: **83**.
- Deployment ID preservado: `AKfycby-ylkJVFEcq5cfABOkazHBIszpissNJh2P8CEqYFMo0Hog5XP-e5KT3bcbSZuBUKX79A`.
- Endpoint validado por HTTP: status 200, `ok: true`, serviço `clinica-liv-leads`.
- Commits de diagnóstico: `0cba7a7`, `6b9e676` e `fe7cd27`.
- Commit da deduplicação com trava, rollback e IDs de restauração: `b0da4b6`.
- Commit da reconciliação segura de consultas: `fc0785a`.
- Backup nativo criado antes da etapa: [LEADS — backup antes da correção integrada — 2026-08-14](https://docs.google.com/spreadsheets/d/1OxPqMNNJCAifcbPxz9dMFmqw3vJxjWz7WvrdfcjMOj4/edit).
- Backup nativo criado imediatamente antes da reconciliação segura: [LEADS — backup antes da reconciliação segura de consultas — 2026-08-14 13h07](https://docs.google.com/spreadsheets/d/1xaBUZNczhRn8AVH3v8a-YQYyPNKoLWVMwMpx601PJfA/edit).
- Integridade estrutural do backup: 33 abas; `IMPORT_GOOGLE_ADS` permanece na primeira posição.
- Backup nativo imediatamente anterior à escrita: [LEADS — backup antes da deduplicação reversível — 2026-08-14 09-58](https://docs.google.com/spreadsheets/d/1vurtQrmroJNvYvavoh4bl5v6UNDpsv2R34omJQ2a-xU/edit).
- Backup nativo criado antes do painel/SLA: [LEADS — backup antes do painel SLA — 2026-08-14 15h05](https://docs.google.com/spreadsheets/d/1OuEDNiSizZQC9jVGR17uVSw9eGX12R6trcNg7ekS080/edit?usp=drivesdk).
- Integridade estrutural do backup pré-escrita: 34 abas; `IMPORT_GOOGLE_ADS` permanece na primeira posição.
- Antes da reconciliação das fases, foi criada outra cópia nativa privada. Fonte e cópia tinham 36 abas e IDs distintos; o identificador da cópia não é persistido neste repositório.

## Resultado consolidado das simulações

| Verificação | Resultado somente leitura | Decisão |
|---|---|---|
| Integridade do funil | 133 linhas operacionais; 130 oportunidades únicas; 2 grupos duplicados; 3 linhas excedentes; 27 divergências de fase; 2 oportunidades sem linha visível única; 36 consultas, das quais 26 sem `Opportunity ID` e 1 sem evento de Calendar | corrigir duplicidades antes de fases e funil |
| Deduplicação reversível | 2 grupos e 3 linhas excedentes; 2 ações planejadas; zero conflito de escolha | elegível para aplicação isolada após autorização |
| Fases históricas | 130 inspecionadas; 101 consistentes; 27 reparáveis; 2 bloqueadas pelas duplicidades | repetir após deduplicação |
| Consultas históricas | 36 inspecionadas; 26 sem identidade; nenhuma das 26 encontrou oportunidade única; 8 fases e 3 vínculos de Calendar potencialmente reparáveis | não aplicar em lote; investigar as 26 identidades ausentes |
| Atribuição histórica | 133 inspecionadas; 120 completas; 11 reparáveis; 2 conflitos de atribuição congelada; zero linha `M26F02S` identificada | não aplicar até revisar os 2 conflitos |
| Google Ads | 5 linhas de importação; 2 no ledger; zero linha inválida ou transação duplicada; 3 nomes de conversão divergentes; 3 registros sem ledger | reparo técnico elegível após autorização e nova conferência |
| Funil canônico | 128 linhas geráveis; 2 bloqueios causados pelas duplicidades | reconstruir somente após deduplicação e nova simulação |
| Reaper da classificação | 87 itens inspecionados; zero refileirável ou dead-letter automático; 8 exigem atenção | revisar os 8 casos antes de fechar o gate operacional |
| SLA operacional | Baseline: 13 entradas e nenhuma resposta mensurável. Pós-versão 83: 19 entradas, 4 respostas vinculadas, cobertura 21,1%, mediana 11,1 min úteis e p95 276,8 min úteis | medição publicada; gate reprovado até cobertura ≥95% e estabilidade por 14 dias |

## Deduplicação autorizada e verificações posteriores

- Execução: `aplicarDeduplicacaoReversivelAutorizada`, em 14/08/2026 às 10:05.
- Resultado: 2 grupos tratados, 3 linhas excedentes arquivadas, zero caso para revisão, zero erro e zero grupo revertido.
- IDs opacos de restauração: `dup_a6629b54-c231-4f20-89ca-e8b08de45241`, `dup_50a5f0f4-d4d7-4fc8-bde1-c5abae5a0096` e `dup_d67ddcf2-bb67-4566-b7fa-6207413fdbb7`.
- Leitura independente no Google Sheets confirmou os três IDs em `_LEADS_DUPLICADOS_ARQUIVO`, todos com estado `archived`; nenhum dado pessoal foi copiado para este registro.
- Nova simulação da deduplicação: 0 grupos duplicados, 0 linhas excedentes, 0 ações e 0 problemas.
- Integridade após a deduplicação: 130 linhas operacionais e 130 oportunidades únicas; 0 duplicidades, 0 linhas visíveis ausentes e 27 divergências de fase ainda pendentes.
- Fases históricas após a deduplicação: 130 inspecionadas, 103 consistentes, 27 reparáveis, 0 bloqueadas e 0 problemas.
- Funil canônico após a deduplicação: 130 linhas geráveis, 0 revisões e 0 problemas.
- Suíte local após o endurecimento: **508 de 508 testes aprovados**.

## Fases históricas autorizadas e verificações posteriores

- Executor: `aplicarReconciliacaoFasesHistoricasAutorizada`, registrado no commit `d6cb72d`, com trava exclusiva, pré-voo fixado em 131 oportunidades/27 reparos/zero conflito e retorno inócuo quando já reconciliado.
- Simulação imediatamente anterior: 131 inspecionadas, 104 consistentes, 27 reparáveis, 0 revisão e 0 problema.
- Escrita: 27 reparáveis, 27 reparadas, 0 revisão e 0 erro.
- Pós-voo interno: 131 inspecionadas, 131 consistentes, 0 reparável, 0 revisão e 0 problema.
- Verificação independente no Google Sheets: 141 oportunidades totais, 131 ativas, 10 encerradas/arquivadas, 131 vínculos visíveis comparados, 0 linha ausente, 0 divergência de fase, 0 divergência de ponteiro e 0 ID duplicado.
- Estruturas não autorizadas: os valores ou fórmulas informados de `Consultas`, atribuição, `Saúde das Integrações`, `Funil Comercial`, `Painel Econômico` e `Painel do Bot` conservaram o mesmo hash do baseline; `_FUNIL_CANONICO` permaneceu ausente.
- Validação técnica: endpoint versão 78 com HTTP 200 e `ok: true`; **516 de 516 testes locais aprovados**; formatação e validação das células de fase preservadas.

## Decisão do gate

A aplicação integral continua reprovada por identidades de consultas não reconciliadas, conflitos de atribuição congelada e cobertura de SLA ainda insuficiente. Deduplicação, fases, subconjunto seguro de consultas e Google Ads foram concluídos como blocos isolados. O próximo bloco deve ser escolhido e autorizado separadamente entre revisão manual das consultas bloqueadas, atribuição, funil canônico/painéis ou reaper operacional. O Google permanece em observação por sete dias, sem escala.

## Painel humano e SLA operacional

- O commit `e941390` foi publicado no Apps Script versão 83 e no Netlify, com o deployment do Apps Script preservado. A suíte integral passou com **528/528 testes**.
- O painel passou de zero “Conversas assumidas” em fonte legada para 43 `Pessoas com ação humana` na fonte vigente; a fórmula ao vivo reconciliou com a query de controle.
- O resumo `_BOT_METRICAS` usa eventos tipados e o mesmo `Parent Event ID` para ligar entrada à primeira resposta. A janela de minutos úteis é 08:00–20:00, todos os dias.
- No recorte de sete dias: 19 entradas roteadas, 4 respostas mensuráveis, cobertura 21,1%, 0 primeiras respostas automáticas, 4 humanas, mediana 11,1 min, p95 276,8 min, 9 pausas, 0 handoffs tipados e 0 fechamentos tipados.
- A comparação com o backup confirmou que `Média de mensagens/pessoa`, `Nunca retomar`, `Compromissos abertos` e `Taxa de qualificação` foram preservados; a nova leitura ocupa a linha antes do gráfico.
- Decisão: `BOT-03` concluído. `BOT-04` instrumentado, mas reprovado no gate; não ampliar autonomia nem volume com cobertura abaixo de 95%.

## Reconciliação segura de consultas e Calendar

- Pré-voo: 43 registros inspecionados; 36 elegíveis à identidade e 7 não aplicáveis; 9 identidades já consistentes; 26 sem oportunidade correspondente; 1 vínculo incompatível com o profissional; nenhum vínculo de identidade era seguro para preenchimento automático.
- Fase: 8 registros elegíveis, 5 já consistentes e 3 reparáveis. A execução avançou as 3 fases pelo caminho canônico e acrescentou 3 eventos de auditoria, sem rebaixamento de estágio.
- Calendar: 11 registros elegíveis; 9 eventos tinham data/hora corretas e somente metadados operacionais legados, por isso foram atualizados no mesmo ID. Um evento com divergência de horário e metadados e uma consulta sem link válido permaneceram bloqueados.
- Integridade externa: 18 eventos continuaram distribuídos entre as duas agendas; nenhum evento foi criado, excluído ou duplicado e nenhuma data/hora foi alterada.
- Diferença exata contra o backup: 9 células em `_CRM_OPORTUNIDADES`, 9 em `Google Ads - Conversões`, 9 em `Consultas` e 3 novas linhas em `_LEAD_FASE_EVENTOS`; `Leads Dr. Daniel` ficou sem alteração.
- O primeiro retorno pós-escrita marcou `ok: false` porque literais Unicode inválidos fizeram a mesma execução classificar novamente os 9 metadados já corrigidos. A escrita havia sido aplicada corretamente; o código foi corrigido antes de qualquer nova ação. Uma auditoria fresca confirmou 9 eventos consistentes, 0 reparo seguro pendente e 2 bloqueios; a repetição protegida retornou `alreadyReconciled: true` e não escreveu novamente.
- Validação final: Apps Script versão 80, endpoint HTTP 200 com `ok: true`, **520 de 520 testes locais aprovados** e inspeção visual da aba `Consultas` sem dano a cabeçalhos, filtros, congelamento ou layout.
- Nenhum alerta por e-mail foi disparado: os reparos executados eram estruturados e de alta confiança; os casos de baixa confiança não foram modificados e permaneceram na revisão humana.

## Limites preservados

- Somente a deduplicação, as fases e os reparos seguros de consultas autorizados foram executados com escrita; cada linha removida foi arquivada antes da limpeza e possui `Backup ID` exato.
- Nenhuma fórmula, atribuição, conversão do Google Ads ou campanha foi alterada no bloco de consultas; datas/horários das consultas e dos eventos permaneceram intactos.
- A versão 80 do Apps Script foi publicada; Netlify e site não receberam código funcional novo neste bloco.
- `/lifting-facial/` não foi alterada.
- Nenhum identificador de paciente, telefone, mensagem ou dado clínico foi persistido neste registro.

## Reconciliação offline Google Ads

- Pré-voo protegido: 5 linhas na primeira aba, 2 registros no ledger, 3 nomes de ação divergentes, 5 nomes visíveis divergentes, 3 registros de ledger ausentes e zero linha inválida, duplicada ou em revisão.
- Backup nativo imediatamente anterior: [LEADS — backup antes da reconciliação Google Ads — 2026-08-14 13h45](https://docs.google.com/spreadsheets/d/189twUMP5jeE6eTU0F4-xqqDbpvz2nWqG7AOtEPOiL6M/edit?usp=drivesdk), com 36 abas e `IMPORT_GOOGLE_ADS` preservada como primeira aba.
- Aplicação protegida: 3 registros de ledger reconstruídos; nenhum registro de importação criado; nomes normalizados somente nas 5 transações elegíveis da Dra. Amanda.
- Diferença exata contra o backup: 3 células em `IMPORT_GOOGLE_ADS` (linhas 3–5, coluna do nome da conversão), 3 novas linhas em `_GOOGLE_ADS_EVENTOS` (campos operacionais previstos) e 5 células em `Google Ads - Conversões` (linhas elegíveis, coluna do nome da conversão). Nenhuma outra célula planejada mudou.
- Pós-voo interno e simulação fresca: 5 linhas de importação, 5 registros no ledger, zero nome divergente, duplicidade, ausência, conflito de identidade, linha inválida ou revisão pendente. A repetição é inócua.
- Google Ads ao vivo: ação `Lead qualificado GCLID` permaneceu Principal e oriunda de importação de cliques; a ação antiga permaneceu Secundária/Inativa. A conexão `LEADS` manteve cinco campos mapeados e execução diária. A importação manual iniciada às 13:59 após o reparo concluiu 5 linhas com 0 erros, repetindo o resultado íntegro da execução automática anterior. O status da ação ainda exige observação e não autoriza Smart Bidding ou escala.
- Validação local: Apps Script versão 81 no mesmo deployment, endpoint HTTP 200 com `ok: true`, commit `8dbe985`, **522 de 522 testes aprovados**, inspeção visual da primeira aba e nenhuma alteração em campanhas, orçamento, palavras-chave, atribuição histórica, painéis ou `/lifting-facial/`.

### Bloco prospectivo Meta Site — `WEB-01` + `MAD-01` + `DAT-07`

- O caminho público da landing foi testado com a URL ativa: os 6 CTAs produziram `M26F02S-C01H01-avaliacao-facial` sem alteração de texto, layout, vídeo ou CTA.
- O commit `7480022` adicionou categorias e motivos de fallback limitados ao webhook e quatro colunas prospectivas no ledger de eventos. Nenhuma atribuição congelada ou linha histórica foi reescrita.
- O Apps Script versão 82 preservou o deployment. O Netlify publicou o mesmo commit no deploy `6a7f54a074e9be0008883571`; endpoint e sonda responderam HTTP 200.
- A execução sintética sem paciente, telefone, mensagem ou envio de WhatsApp terminou com `meta_attribution_contract_ok`. O cabeçalho do ledger foi confirmado com 13 colunas e os registros anteriores permaneceram intactos.
- A suíte passou com **526 de 526 testes**; `/lifting-facial/` continuou fora do diff. O bloco fecha a instrumentação prospectiva, não a atribuição histórica nem o gate de cobertura/amostra para verba.
- Nenhum alerta por e-mail foi disparado: todas as escritas foram estruturadas e de alta confiança; qualquer caso fora da identidade exata teria bloqueado o lote inteiro.
