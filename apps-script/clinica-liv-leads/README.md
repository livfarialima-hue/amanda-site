# Apps Script da Clínica LIV

## Fonte e alvo canônicos

- Código local: `apps-script/clinica-liv-leads`
- Registro de produção: `production-target.json`
- Projeto de produção: usar somente o `scriptId` registrado
- Deployment público: atualizar somente o `deploymentId` registrado
- Planilha operacional: usar somente o `spreadsheetId` registrado

Há projetos no Google Apps Script com o mesmo título. Título, ordem da lista e horário de modificação não identificam produção.

A cópia inativa confirmada no trabalho de 14/08/2026 está registrada em `knownNonProductionProjects` e foi rotulada como `ARQUIVO — NÃO PUBLICAR — Clínica LIV (sem deployment)`. Nenhuma outra cópia foi renomeada, arquivada ou excluída sem confirmação individual.

## Pré-voo obrigatório

Antes de qualquer escrita no editor do Apps Script, copiar os IDs visíveis e executar:

```powershell
npm.cmd run apps-script:verify-target -- --project "URL_DO_EDITOR" --deployment "URL_DO_WEB_APP" --spreadsheet "URL_DA_PLANILHA"
```

O comando precisa terminar com `ALVO CANÔNICO CONFIRMADO`. Qualquer divergência bloqueia a escrita.

## Publicação

1. confirmar que o branch é `reestruturacao-site` e que somente arquivos intencionais estão no commit;
2. executar a suíte integral;
3. obter autorização explícita para publicar;
4. abrir diretamente o `projectUrl` do registro, sem usar a lista de projetos;
5. executar novamente o pré-voo com os três IDs copiados da interface;
6. salvar apenas os arquivos `.gs` ou `.html` alterados;
7. em `Gerenciar implantações`, editar o deployment existente; nunca criar outro;
8. confirmar que o código de implantação continua igual ao canônico;
9. validar HTTP 200, executar o pós-voo necessário e inspecionar a planilha sem acionar mensagens reais;
10. atualizar `lastVerifiedVersion`, `lastVerifiedAt` e o manual operacional no mesmo trabalho.

### Registro da produção atual

- Versão canônica: `117`, publicada no deployment existente em 22/08/2026.
- Escopo da v96: `MetaAdsFunnelReview.gs`, `MetaAdsReview.gs`, `OpportunityStore.gs` e `SyntheticHealth.gs`, com os códigos cervicais `M26C01W/M26C02S`, monitoramento Meta e sonda sintética de atribuição; deployment canônico preservado.
- Escopo da v97: `Code.gs` acrescentou o habilitador administrativo idempotente do schema v1. `aplicarSchemaAtribuicaoV1Autorizado` foi executada com sucesso e não cria um segundo deployment.
- Escopo da v98: `ConsultasSync.gs` reconhece o comprovante estruturado de procedimento, retorno ou consulta, mantém a Dra. Amanda sempre na `Sala 1`, cria novo registro quando o atendimento anterior já está encerrado e preserva a idempotência do mesmo comprovante. O título da Google Agenda contém somente o tipo genérico e o profissional. O deployment canônico foi preservado; código e testes estão no commit técnico `7c8f7d0`.
- Escopo da v99: `ConsultasSync.gs`, `RoomBooking.gs` e `RoomBookingForm.html` incluem `Matheus (ortop)` no formulário privado e limitam suas reservas à `Sala 2`. Se a sala estiver ocupada, a operação falha de forma fechada e nunca usa a `Sala 1`. A automação de WhatsApp continua limitada a Amanda e Daniel. O deployment canônico foi preservado; o estado técnico está no commit `2d51398`.
- Escopo da v100: `Code.gs`, `LeadClassification.gs`, `ConsultasSync.gs` e `Retomadas.gs` expõem o contexto durável da oportunidade a partir de `_WHATSAPP_MENSAGENS`, registram a autoria `paciente`, `bruna` ou `equipe_humana` e gravam as saídas da Bruna sem abrir uma segunda classificação. O deployment canônico foi preservado; o estado técnico está no commit funcional `6fd37c3227e6fee1ca4ea1686248cb22733040f1`.
- Pós-voo da v100: o mesmo deployment respondeu HTTP 200 com `ok: true`; o webhook canônico e a URL imutável do deploy Netlify `6a84facdbed81175d2df0107` responderam HTTP 200 em modo `active`, com planilha, assinatura e OpenAI configurados. A suíte concluiu com `843/843` testes; nenhuma mensagem real foi enviada.
- Escopo da v101: `Code.gs`, `LeadClassification.gs` e `Retomadas.gs` distinguem o prefill estruturado `procedure_evaluation_v1` da intenção pessoal, impedem qualificação, conversão offline e agenda pelo template isolado, preservam perfis comerciais sem saudação nominal e corrigem a aprovação manual de retomadas aberta pelo e-mail diário. O deployment canônico foi preservado; o estado técnico está no commit funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`.
- Pós-voo da v101: os três arquivos publicados foram relidos no editor e ficaram idênticos aos locais por SHA-256; o mesmo deployment permaneceu com o ID canônico e respondeu HTTP 200. O webhook canônico e a URL imutável do deploy Netlify `6a858294fc30270008e0964a` responderam HTTP 200 em modo `active`, com planilha, assinatura, OpenAI, revisão, agenda e exclusão de números internos configuradas. A suíte concluiu com `851/851` testes, build de 178 arquivos e 44 URLs sem erro; nenhuma mensagem real foi enviada.
- Incidente e escopo da v102/v103: a v102 restaurou `Retomadas.gs`, mas a compilação expôs uma segunda substituição indevida em `LeadClassification.gs`. A v103 restaurou integralmente `LeadClassification.gs`, preservou `Retomadas.gs` canônico e repôs em `Code.gs` somente o bloco `templateId` aprovado na v101. O deployment público e todos os três IDs canônicos foram preservados.
- Auditoria integral da v103: os 22 arquivos do projeto foram comparados com o repositório. Não restou arquivo duplicado ou truncado; quatro diferenças eram somente ausência de quebra de linha final. `CentralAtendimento.gs` mantém uma divergência histórica anterior, sem indício de corrupção, e não foi publicado por exigir autorização separada. A suíte concluiu com `865/865` testes, o endpoint respondeu HTTP 200 com JSON válido e o teste de token inválido confirmou que nenhuma preferência foi alterada. Nenhuma mensagem real foi enviada.
- Escopo e pós-voo da v104: após autorização específica, `CentralAtendimento.gs` foi sincronizado integralmente com o estado canônico do commit `7e37eb3`. Ofertas comerciais antigas passam a aparecer como revisão de exclusão em modo `Silêncio`, sem sugestão de resposta, e o encerramento humano resolve o compromisso, cancela retomadas pendentes e arquiva eventual linha como não paciente. O arquivo publicado foi conferido por SHA-256; `21/21` testes focados e `865/865` testes integrais passaram. O endpoint respondeu HTTP 200 com JSON válido e o teste de token inválido confirmou que nenhuma preferência foi alterada. Nenhuma atualização da Central, mensagem real ou contato sintético foi executado.
- Escopo e pós-voo da v105/v106: `Code.gs` ampliou para 4.000 caracteres o eco humano usado na recuperação contextual e `LeadClassification.gs` passou a reunir, antes da criação da oportunidade, mensagens do paciente e falas da equipe em ordem cronológica. A v105 foi intermediária: a releitura detectou `LeadClassification.gs` ainda no conteúdo anterior. O arquivo foi substituído novamente e relido após recarregar o editor, ficando idêntico ao local; a v106 corrigiu a divergência no mesmo deployment canônico. `Code.gs` foi conferido no editor com `safeText_(input.text, 4000)`. O web app respondeu HTTP 200 com JSON `ok: true`; a suíte concluiu com **912/912 testes**, build de 178 arquivos e 44 URLs sem erro. Nenhuma mensagem real foi enviada.
- Escopo e pós-voo da v107: `KnowledgeBase.gs` transforma dúvidas seguras ainda não respondidas em revisões idempotentes com contexto e rascunho somente para conferência humana; `CentralAtendimento.gs` associa esse rascunho à mensagem pendente e mantém `SEM SUGESTÃO PRONTA` quando não houver texto seguro. A comparação geral entre minilifting e lifting facial usa a mesma resposta aprovada no bot e na Central. Os dois arquivos vivos foram comparados antes da escrita com o commit anterior e relidos depois do salvamento, ficando idênticos aos arquivos locais por SHA-256 após normalizar somente CRLF/LF. O mesmo deployment foi atualizado para v107; o web app respondeu HTTP 200 com JSON `ok: true` e um POST com segredo inválido retornou `unauthorized` antes de qualquer ação. A suíte concluiu com **923/923 testes**, build de 178 arquivos e 44 URLs sem erro. Nenhuma atualização manual da Central nem mensagem real foi executada.
- Escopo e pós-voo da v108: `ConsultasSync.gs` aceita a confirmação final de um horário negociado por humano mesmo fora de `Datas Consulta`, mantém a Dra. Amanda exclusivamente na `Sala 1` e transforma conflito real da sala em alerta por e-mail sem cancelar o agendamento confirmado. A linha de `Consultas` é gravada de uma só vez, com canal, consentimento, chave monitorada e estado suficiente para lembretes; comprovante incompleto não cria linha parcial nem evento e exige uma ação humana clara. `Code.gs` expõe a releitura idempotente do agendamento para que o webhook recupere um timeout sem repetir a escrita. Os dois arquivos publicados foram relidos e ficaram idênticos aos locais por SHA-256 normalizado; o deployment canônico foi preservado e o web app respondeu HTTP 200 com JSON `ok: true`. O caso operacional autorizado foi reconciliado em `Consultas`, LEADS, CRM e Sala 1 sem enviar mensagem à paciente; a rotina diária de lembretes permaneceu instalada e o registro ficou elegível. A suíte concluiu com **932/932 testes**, build de 178 arquivos e 44 URLs sem erro. Código funcional `27f07856e43cf90f898132ddf11913210818f2c4`; deploy Netlify `6a879160d29a140008a20503`.
- Escopo e pós-voo da v109/v110: a v109 publicou a auditoria humana limitada por `Opportunity ID`, com pré-voo integral, correção sincronizada de fases, invalidação de conversões qualificadas falsas e arquivamento de contato interno sem apagar histórico técnico. A primeira execução bloqueou todas as escritas porque o pré-voo de arquivamento esperava o estado legado `active`, enquanto o CRM canônico usa `open`. A v110 corrigiu somente esse contrato, preservando falha fechada para estados encerrados, e a regressão correspondente elevou a suíte para **940/940 testes**. A execução então concluiu quatro rebaixamentos para `Novo`, uma promoção para `Consulta agendada`, um arquivamento interno e duas invalidações `invalidated_not_qualified`; as duas transações deixaram `IMPORT_GOOGLE_ADS` e a aba temporária foi removida. O deployment canônico foi preservado. Código do saneamento `88cdbd0`; código funcional da classificação `dd93f1cebf5c218672d1bf84d6d3b39ca3c9ff74`; deploy Netlify `6a879f71c5efe0ad12609a3d`.
- Escopo e pós-voo da v111: `Retomadas.gs` passa a cancelar somente o plano selecionado por token opaco, sem transformar o contato em `Nunca retomar`, oferece confirmação individual para passar à Bruna toda retomada humana elegível e revalida conversa, janela do WhatsApp, preferências e segurança antes de qualquer envio. A cadência comercial permanece limitada a 24h e 72h, ajusta o orçamento de tentativas ao engajamento e encerra diante de pausa, recusa ou promessa de retorno da própria paciente. `AgendaCuidados.gs` recebeu sugestões pós-consulta e de continuidade mais contextuais, sem pressão. Os dois arquivos publicados foram relidos após recarregar o editor e ficaram idênticos aos locais por SHA-256 normalizado; o deployment canônico foi preservado. O web app respondeu HTTP 200 com JSON `ok: true`, e o token inválido respondeu HTTP 200 com `Link inválido ou expirado`, sem cancelar mensagem nem alterar preferência. A suíte concluiu com **948/948 testes**, o foco de retomadas com **41/41** e `git diff --check` sem erro. Nenhuma função ou trigger foi executado e nenhuma mensagem real foi enviada. Código funcional `6551f0fadd21f25ee238cc0fb903495ec7af6ce6`.
- Escopo e pós-voo da v112–v117: `Code.gs`, `LeadClassification.gs`, `OpportunityStore.gs` e `DataQualityRepair.gs` centralizam a conversão qualificada por fase, preparam `IMPORT_GOOGLE_ADS` somente com exatamente um identificador de clique, invalidam o ledger quando uma auditoria rebaixa para `Novo` ou `Não qualificado` e enfileiram retrações idempotentes em `AJUSTES_GOOGLE_ADS`. Requalificação posterior usa novo ciclo de transação. A v115 corrigiu a sinalização `applied` do dry-run; a v116 projetou somente as seis colunas técnicas de cada `RETRACT` no arquivo dedicado `LIV — Ajustes Google Ads — sem PII` (`1hTZJKQOh1QEkKwQMBbdVRSiFwWsqjfOfUK-bDmkuqbU`); e a v117 adotou o fuso `-0300` exigido pelo upload de ajustes. O mesmo deployment canônico foi preservado. O pré-voo confirmou os três IDs; **70/70 testes focados** e o subconjunto de classificação **28/28** passaram. A suíte geral chegou a **949/950**, com a única falha fora deste lote no asset versionado da página de preço já alterada localmente. A aplicação inspecionou 176 oportunidades, preparou 5 conversões, invalidou 2 eventos, enfileirou 2 retrações e encerrou com pós-voo sintético `ok=true`, `applied=false`, zero issues. As abas canônica e projetada foram verificadas com 5 conversões qualificadas e exatamente 2 linhas `RETRACT`, sem PII e com igualdade de conteúdo. A conexão `LEADS` ficou programada diariamente entre 05:00 e 06:00 BRT; a execução manual de 22/08 às 11:25 concluiu com **5 linhas importadas e 0 erros**, e a próxima execução está marcada para 23/08 às 05:05. O upload separado dos dois ajustes reconheceu o formato e respondeu `conversão não existe`; o recibo ficou `Sem alterações`, confirmando que os falsos eventos não haviam chegado à conta. O web app respondeu HTTP 200 com `ok:true`; o POST com segredo inválido respondeu `unauthorized` antes de qualquer escrita. Nenhuma mensagem real foi enviada. Commits técnicos `0899c31`, `f7cc8e8`, `548040f`, `c598f05`, `88efe8c` e `4edf02a`.
- Rollback técnico deste hotfix: Apps Script v101 no mesmo deployment; o rollback funcional do pacote Bruna `.5` continua sendo Apps Script v100, deploy Netlify `6a84facdbed81175d2df0107` e commit `6fd37c3227e6fee1ca4ea1686248cb22733040f1`.

## Agregado anônimo para a rotina do Google Ads

- Código: `GoogleAdsFunnelReview.gs`.
- Produção atual: Apps Script versão `117`, publicada no deployment canônico em 22/08/2026. O agregado Google foi introduzido na v92 e preservado nas versões seguintes.
- Destino: planilha separada `1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0`, aba `Agregados`.
- Trigger: `publicarAgregadosFunilGoogleAds`, diariamente aproximadamente às 08:15 BRT, configurado por `configurarRotinaAgregadosFunilGoogleAds()`.
- Fontes internas: `_FUNIL_CANONICO` e `_OPORTUNIDADE_MARCOS`.
- Saída: somente contagens por janela e campanha canônica; sem nome, telefone, mensagem, click ID, Opportunity ID, Event ID ou informação clínica.
- O arquivo agregado pode ser lido pela conta do Google Ads; a planilha LEADS nunca deve ser compartilhada com essa conta.
- Alias legado/ambíguo permanece em `__UNKNOWN_CAMPAIGN__`; não inferir campanha por procedimento ou página.
- Primeira publicação validada: schema v1, zero PII, 16 contatos Google na coorte de 30 dias e os 16 em campanha desconhecida por falta de código G26 canônico; isso é uma limitação de atribuição, não zero de resultado.

Projetos divergentes não devem ser editados, renomeados, arquivados ou excluídos sem autorização específica. Em caso de dúvida, parar antes da escrita externa.

## Agregado anônimo e revisão da Meta Ads

- Agregador: `MetaAdsFunnelReview.gs`; destino no mesmo arquivo de mídia, aba `Meta_Agregados`.
- Revisor: `MetaAdsReview.gs`; somente consultas `GET` da Marketing API e envio de e-mail.
- Segredos: `META_MARKETING_API_TOKEN` e `META_GRAPH_VERSION` somente nas propriedades do projeto. Nunca versionar ou copiar para Drive/planilha.
- Flag: `META_ADS_REVIEW_ENABLED=true` somente depois de `validarAcessoRevisaoMetaAds()`.
- Triggers: `publicarAgregadosFunilMetaAds` aproximadamente às 08:25 e `executarRevisaoMetaAds` aproximadamente às 10:05 BRT.
- Ativação validada em 16/08/2026: agregado com 0% de erro, token permanente limitado a `ads_read`, Graph API `v26.0`, teste recebido por e-mail e uma única instância de cada trigger.
- Versão `97`: todo e-mail enviado pela rotina inclui métricas essenciais de 7 e 30 dias por campanha e o funil anônimo; `M26C01W` e `M26C02S` entram no agregado e nos alertas do ciclo cervical. A validação somente leitura permanece limitada a `ads_read` e sem mutação da conta.
- Privacidade: nenhum nome, telefone, e-mail, mensagem, click ID, `Opportunity ID`, `Event ID` ou informação clínica no agregado/e-mail.
- Taxonomia: `M26F01W` e `M26C01W` resolvem `meta_whatsapp_direct`; `M26F02S` e `M26C02S` resolvem `meta_site_whatsapp`. `M26O01W`, `M26O02W` e aliases desconhecidos permanecem N/D até evidência canônica.
- Manual completo: `campanhas/ROTINA-AUTOMATIZADA-REVISAO-META-ADS.md`.
