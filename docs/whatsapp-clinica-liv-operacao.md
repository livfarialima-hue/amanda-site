# WhatsApp Clínica LIV — rotina operacional

> **Governança:** este arquivo descreve a operação técnica do atendimento. O norte estratégico de aquisição e conversão fica em `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`.

> **Controles de retomada diária publicados — 21/08/2026, 20:11:** `Retomadas.gs` passou a cancelar somente o plano selecionado por token opaco, sem marcar `Nunca retomar`, e toda retomada comercial humana elegível pode ser passada à Bruna por confirmação individual. Antes de qualquer envio, a conversa, a janela do WhatsApp, as preferências, a segurança e a elegibilidade do plano são revalidadas. A cadência continua limitada a 24h e 72h, com orçamento de tentativas proporcional ao engajamento e encerramento diante de pausa, recusa ou promessa de retorno da própria paciente; contexto insuficiente permanece `SEM SUGESTÃO PRONTA`. `AgendaCuidados.gs` recebeu textos pós-consulta e de continuidade mais contextuais, sem pressão. Apps Script v111 no mesmo deployment canônico, código funcional `6551f0fadd21f25ee238cc0fb903495ec7af6ce6`, **948/948 testes**, foco **41/41** e `git diff --check` aprovado. Os dois arquivos foram relidos após recarregar o editor e ficaram idênticos aos locais por SHA-256 normalizado. O web app respondeu HTTP 200 com `ok: true`; o token inválido respondeu HTTP 200 com `Link inválido ou expirado`, sem cancelar mensagem nem alterar preferência. Nenhuma função ou trigger foi executado e nenhuma mensagem real foi enviada. Rollback: Apps Script v110 no mesmo deployment.

> **Auditoria de classificação publicada e executada — 20–21/08/2026:** 54 exportações do Drive, representando 53 conversas únicas, foram reconciliadas com LEADS, CRM e eventos de conversão. Não houve conversa identificável de aquisição ausente da planilha. A regra passou a exigir manifestação pessoal posterior ao prefill para qualificar; referência ou frase automática é somente contexto, e a primeira pergunta de preço isolada pode permanecer `Novo`. O saneamento auditado corrigiu quatro oportunidades para `Novo`, uma para `Consulta agendada`, arquivou uma conversa interna e invalidou duas conversões qualificadas falsas, retirando as respectivas transações de `IMPORT_GOOGLE_ADS`. A execução é fail-closed e usa `Opportunity ID` opaco; a v110 corrigiu o pré-voo para o estado canônico `open` e continua recusando oportunidades encerradas. Produção funcional `dd93f1cebf5c218672d1bf84d6d3b39ca3c9ff74`, deploy Netlify `6a879f71c5efe0ad12609a3d`, saneamento `88cdbd0`, Apps Script v110 e **940/940 testes**. Nenhuma mensagem foi enviada e nenhuma campanha foi alterada.

## Correção de 14/08/2026 — nome da conversão do Google Ads

- A ação canônica permanece `Lead qualificado GCLID`; esse é o nome exato enviado por `IMPORT_GOOGLE_ADS` e reconhecido pela ação principal no Google Ads.
- O menu nativo da coluna `Nome da conversão`, na aba `Google Ads - Conversões`, passou a incluir essa opção sem remover os valores históricos.
- Linhas marcadas como `Enviar ao Google Ads? = Sim` e com exatamente um identificador entre GCLID, GBRAID e WBRAID são normalizadas automaticamente para o nome canônico após edição manual.
- Valores históricos como `Lead qualificado` podem continuar visíveis em linhas que não são enviadas. Eles não devem ser usados em uma linha marcada para envio.

> **Produção:** base do Apps Script na versão 89, com migração canônica de `Funil Comercial` e `Painel Econômico` vinculada ao commit `7f2a5a4` e aprovação segura de retomadas humanas vinculada aos commits `d9e3fd8` e `1d5b549`. A deduplicação reversível autorizada arquivou 3 linhas excedentes e ficou idempotente; o bloco posterior reconciliou 27 fases e deixou zero divergência nas oportunidades então ativas. Na reconciliação segura seguinte, 3 fases derivadas de consultas foram avançadas e 9 eventos existentes do Google Calendar tiveram somente metadados operacionais saneados, sem mudar data/hora nem criar duplicatas. O bloco Google Ads reconciliou as conversões elegíveis e sua importação; o bloco Meta Site passou a registrar categoria da referência, motivo de fallback, referência de origem e plataforma nos novos eventos. O painel operacional usa a fonte humana vigente e exibe cobertura, mediana, p95 e handoffs a partir de eventos tipados. A saúde das integrações usa a importação atual, o painel separa falha técnica de exclusão de negócio, a atualização da Central expira horários passados e os painéis gerenciais fecham em 128 oportunidades únicas. Permanecem bloqueados os casos históricos sem identidade inequívoca e os gates estatísticos de cobertura; `/lifting-facial/` não foi alterado.

### Painel humano e SLA operacional — `BOT-03` + `BOT-04`

- Antes da escrita foi criada a cópia nativa [LEADS — backup antes do painel SLA — 2026-08-14 15h05](https://docs.google.com/spreadsheets/d/1OuEDNiSizZQC9jVGR17uVSw9eGX12R6trcNg7ekS080/edit?usp=drivesdk).
- `Conversas assumidas`, que lia a aba legada e mostrava zero, foi substituída por `Pessoas com ação humana`, calculada na fonte vigente `_WHATSAPP_ATENDIMENTO_HUMANO`. A conferência ao vivo retornou 43 pessoas no período de sete dias.
- A aba oculta `_BOT_METRICAS` agrega somente identificadores opacos e eventos tipados. O painel preservou todas as métricas anteriores e ganhou uma linha própria para cobertura da primeira resposta, mediana, p95 e handoffs.
- No primeiro recorte de produção havia 19 entradas roteadas e 4 primeiras respostas vinculadas pelo mesmo `Parent Event ID`: cobertura **21,1%**, mediana **11,1 minutos úteis**, p95 **276,8 minutos úteis**, 9 pausas e zero `human_handoff_queued` tipado. A janela publicada é 08:00–20:00, todos os dias.
- `BOT-03` ficou tecnicamente concluído e reconciliado. `BOT-04` ficou instrumentado, mas o gate operacional foi **reprovado**: a cobertura está abaixo dos 95% exigidos e o p95 é incompatível com expansão. Zero handoff significa nenhum evento tipado registrado, não ausência de necessidade.
- Validação: Apps Script versão 83 no deployment preservado, endpoint HTTP 200 com `ok: true`, commit `e941390` e **528 de 528 testes aprovados**. Nenhuma campanha, orçamento, página ou característica de `/lifting-facial/` foi alterada.

### Saúde e taxonomia do painel — `DAT-09` + `BOT-06`

- Antes da escrita foi criada a cópia nativa [LEADS — backup antes de saúde e classificação — 2026-08-14 15h25](https://docs.google.com/spreadsheets/d/1TrI4-mvb84Z-q3lJvkDM9EyfR1AUC2lMmdUf68MaYj8/edit?usp=drivesdk).
- A aba oculta `_FUNIL_CANONICO` passou a materializar 131 oportunidades ativas de Amanda e Daniel, uma por `Opportunity ID`, sem nome, telefone, e-mail, mensagem ou dado clínico. O pré-voo não encontrou item em revisão.
- `Saúde das Integrações` passou a conferir a primeira aba vigente `IMPORT_GOOGLE_ADS`, intervalos compatíveis e a diferença entre CRM ativo e funil canônico. A leitura independente fechou com zero erro de fórmula e quatro reconciliações em `OK`; os 32 horários passados ainda disponíveis permanecem em `ATENÇÃO` e pertencem a `OPS-03`.
- O indicador do painel agora se chama `Falhas técnicas de classificação` e conta somente a categoria tipada `technical_failure`. A leitura atual é 9; exclusão de negócio, espera esperada e revisão humana não entram mais como erro técnico.
- `DAT-09` e a correção taxonômica de `BOT-06` estão concluídos. As falhas históricas continuam sendo incidentes operacionais a tratar, e não um falso verde. `DAT-06` foi concluído na versão 88: `Funil Comercial` e `Painel Econômico` usam a fonte canônica e devem permanecer sob reconciliação por 14 dias antes de qualquer escala.
- Validação: Apps Script versão 85 no deployment preservado, endpoint HTTP 200 com `ok: true`, commit `47ec00a` e **532 de 532 testes aprovados**. O título `REGRA DE EDIÇÃO`, a regra em `A14` e a data em `B15` foram conferidos célula a célula.

### Expiração segura da agenda — `OPS-03`

- Backup anterior à escrita: [LEADS — backup antes de expirar horários passados — 2026-08-14 15h50](https://docs.google.com/spreadsheets/d/1e8Z6zlbM4xLeJIQZJ8B9SUAJ6G2fJhOUR-J5KNu4pjE/edit?usp=drivesdk).
- A execução inspecionou 51 linhas e alterou 32 estados vencidos de `Disponível` para `Indisponível`. A comparação com o backup encontrou exatamente 32 diferenças, todas na coluna `Status`, sem apagar linhas ou mudar data, hora, profissional, observação ou semana.
- `Saúde das Integrações` passou de `ATENÇÃO / 32` para `OK / 0` no check de horários passados. A atualização já existente da Central, executada a cada 15 minutos, agora repete a manutenção de forma idempotente.
- Só expira um horário quando data e hora são válidas, o status ainda é `Disponível` e o instante é anterior ou igual ao momento da execução. Registro inválido, reservado, bloqueado ou futuro permanece intacto.
- Validação: Apps Script versão 86 no mesmo deployment, endpoint HTTP 200 com `ok: true`, commit `f40cc50` e **535 de 535 testes aprovados**. `OPS-03` está concluído; o check de saúde continua sendo o alerta de regressão.

### Reaper e fila de exceções — `BOT-05`

- Backup anterior à execução: [LEADS — backup antes do reaper de classificação — 2026-08-14 16h00](https://docs.google.com/spreadsheets/d/1F_PQ4NwLVIHGn-sEjQ9GeEV69SFkl_Z48UUJ1pGegCY/edit?usp=drivesdk).
- O dry-run inspecionou 88 jobs: zero lease vencido para requeue, zero item elegível a dead-letter e 8 estados históricos de atenção humana. Nenhum deles foi reprocessado ou enviado novamente ao paciente.
- A aplicação confirmou idempotência: `_WHATSAPP_CLASSIFICACAO` permaneceu 88/88 sem nenhuma célula alterada, e `_WHATSAPP_CLASSIFICACAO_EXCECOES` permaneceu 9/9 porque todos os oito incidentes já estavam registrados por chave estável.
- O contador histórico de 170 tentativas foi preservado como evidência; não foi convertido em 170 falhas nem zerado artificialmente. `BOT-05` está concluído no controle técnico. O backlog de 8 exceções continua aberto para revisão humana e não autoriza declarar a classificação saudável.

## Estado de produção

> **Agendamento humano fora da grade e reconciliação atômica publicados — 20/08/2026, 20:52:** a versão `2026-08-20.3` permite registrar uma confirmação humana mesmo quando o horário não aparece em `Datas Consulta`; a grade continua limitando somente a oferta e a confirmação automáticas. Para a Dra. Amanda, a reserva permanece na `Sala 1` mesmo quando houver sobreposição: o agendamento é preservado e somente um conflito real dispara alerta por e-mail. O comprovante completo grava uma única linha operacional, atualiza LEADS/CRM, sincroniza a Agenda e deixa o lembrete elegível; comprovante incompleto não cria linha parcial nem evento e informa a ação humana necessária. Timeout usa uma releitura idempotente pelo ID antes de declarar falha e nunca tenta um segundo `upsert`. Código funcional `27f07856e43cf90f898132ddf11913210818f2c4`, deploy Netlify `6a879160d29a140008a20503` em estado `ready` e Apps Script v108 no deployment canônico. `Code.gs` e `ConsultasSync.gs` foram relidos e ficaram equivalentes ao local por SHA-256 normalizado; o web app respondeu HTTP 200. **932/932 testes**, build de 178 arquivos, 44 URLs e diff aprovados. O caso operacional autorizado foi reconciliado em Consultas, LEADS, CRM e Sala 1, sem mensagem à paciente; a rotina diária de lembretes permanece instalada e o registro ficou elegível. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Rollback: deploy `6a8762898c14302d7062b1f9`, commit `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11` e Apps Script v107.

> **Comparação de lifting, revisão humana útil e oferta progressiva de faixa publicadas — 20/08/2026, 17:30:** a versão `2026-08-20.2` responde a comparação geral entre minilifting e lifting facial com a diferença de extensão já aprovada, sem decidir técnica individual. Quando uma dúvida segura terminar em revisão, um rascunho contextual pode ser projetado de forma idempotente em `Revisões do Bot`, Central e e-mail somente para conferência; temas de alto risco continuam sem texto copiável. Na primeira pergunta de preço de lifting facial, cervicoplastia ou otoplastia, o guia facial vem sem número e a Bruna oferece de modo leve uma faixa geral como próximo passo; apenas o aceite claro ou novo pedido explícito libera a referência já autorizada. Formas antigas da oferta seguem reconhecidas para não quebrar conversas em andamento. Código funcional `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11`, deploy Netlify `6a8762898c14302d7062b1f9` em estado `ready`, 12 funções e Apps Script v107 no deployment canônico. `KnowledgeBase.gs` e `CentralAtendimento.gs` foram comparados antes da escrita, relidos depois e ficaram equivalentes ao local por SHA-256 normalizado. O domínio, a URL imutável, o webhook `active` e o web app responderam HTTP 200; segredo inválido foi recusado sem ação. **923/923 testes**, build de 178 arquivos, 44 URLs e diff aprovados. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Nenhuma mensagem real foi enviada. Rollback: deploy `6a8701bb1ae7b60008c3a8ac`, commit `afa230263288bba88fb0cb61f4fb55e5903d4dca` e Apps Script v106.

> **Cobertura semântica antes da rota e pausa global publicadas — 20/08/2026, 10:50:** a análise do caso em que a paciente respondeu `Cicatrizes de acne, flacidez no rosto e pescoço, Mounjaro face` confirmou texto e evento legíveis, mas `route_pending`, sem oportunidade e sem chamada à IA. A versão `2026-08-20.1` move a avaliação semântica para depois da persistência e antes da exigência de rota: recupera até 32 turnos por telefone, mescla `_WHATSAPP_MENSAGENS` e os ecos de `_WHATSAPP_ATENDIMENTO_HUMANO`, pede à IA contexto, profissional, procedimento, ação e sugestão e só então tenta recuperar Amanda ou Daniel com alta confiança no modo ativo. Dúvida segura recebe uma pergunta; decisão semântica sem autorização permanece com a equipe; revisão humana pode receber rascunho interno; `shadow` não envia nem altera agenda. Prefill também deixa de pular a IA e só usa a abertura aprovada quando a decisão semântica a confirma. O modo `off` preserva a entrada para a equipe e bloqueia IA, mensagens ao paciente, agenda, retomadas, lembretes, pós-consulta e retomada após takeover. Código funcional `afa230263288bba88fb0cb61f4fb55e5903d4dca`, deploy Netlify `6a8701bb1ae7b60008c3a8ac` e Apps Script v106 no mesmo deployment canônico; **912/912 testes**, build de 178 arquivos, 44 URLs, sintaxe e diff aprovados. O Netlify publicou 12 funções; domínio, URL imutável, webhook canônico em modo `active` e web app responderam HTTP 200. A v105 do Apps Script foi intermediária: a releitura encontrou `LeadClassification.gs` anterior; a v106 reconciliou o arquivo e foi conferida novamente. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Nenhuma mensagem real foi enviada e nenhuma campanha foi alterada. Rollback: deploy `6a864d9a75c1bc0008b26c3b`, commit `204aff23d27ed262f21ed66b448609ad838998b6` e Apps Script v104.

> **Recuperação de texto ausente publicada — 19/08/2026, 21:44:** a versão `2026-08-19.6` trata o incidente real em que o evento foi persistido às 20:50:31, mas chegou sem `Texto`, `template_id` ou referência utilizável e terminou em `route_pending`, sem classificação, oportunidade ou resposta automática. A extração agora reconhece variações seguras do envelope textual; se o corpo continuar ausente, a Bruna envia uma única pergunta neutra para recuperar o procedimento ou a dúvida, sem inferir anúncio, qualificar ou encaminhar agenda. O fallback conserva as travas de mensagem mais recente, duplicidade, preferência de contato, horário extremo e corrida com atendimento humano, e não cria uma fala inexistente da paciente no histórico. Código funcional `204aff23d27ed262f21ed66b448609ad838998b6`, deploy Netlify `6a864d9a75c1bc0008b26c3b`; Apps Script v104 preservado; **899/899 testes**, build de 178 arquivos e 44 URLs sem erro. O Netlify confirmou o deploy publicado e as 12 funções. A projeção ativa do manual e o Plano Executivo foram substituídos nos mesmos IDs do Drive e conferidos byte a byte; o manual usa SHA-256 `590a4ffc08fb28e32b79f6cdddee49f58bf3b98f1fa616234950acf8ac45dc46`. A sonda HTTP direta do webhook não foi repetida porque o cliente bloqueou o acesso técnico direto. Nenhuma mensagem real foi enviada. Rollback: deploy `6a8641c07b71ac00088337f8`, commit `9a4a4082e5e4ad3e0bcf1e32dbbfe01af58eab22`.

> **Faixa de otoplastia publicada — 19/08/2026, 21:00:** a versão `2026-08-19.5` preserva o primeiro pedido de preço sem números, com um único guia facial e uma oferta leve de faixa. Somente o aceite claro dessa oferta ou um novo pedido explícito por valor, média ou faixa libera uma única resposta de R$ 8 mil a R$ 14 mil, sem CTA, com aviso de que não é orçamento, proposta nem garantia, que o valor final pode ficar fora do intervalo e que o total depende do planejamento. A faixa diferente, sem ressalvas ou repetida é barrada antes do envio. Perguntas compostas de otoplastia são respondidas antes do preço, e `otomodelação` não autoriza presumir injetáveis, ausência de cirurgia, duração temporária ou indicação. A construção genérica de convênio também foi corrigida para `ao seu plano de saúde`. Código funcional `9a4a4082e5e4ad3e0bcf1e32dbbfe01af58eab22`, deploy Netlify `6a8641c07b71ac00088337f8`; Apps Script v104 preservado; **896/896 testes**, build de 178 arquivos e 44 URLs sem erro. O Netlify confirmou o deploy publicado e as 12 funções; o domínio público respondeu normalmente. A sonda HTTP direta do webhook não foi repetida porque o cliente bloqueou o acesso técnico direto. Nenhuma mensagem real foi enviada e nenhuma configuração do Google Ads foi alterada. Rollback: deploy `6a861fab62e3fc00085b847f`, commit `5f9e247b7a38698d5a9d79836f14e7b4a25ec3c0`.

> **Perguntas compostas de lifting facial publicadas — 19/08/2026, 18:30:** a versão `2026-08-19.4` decompõe semanticamente perguntas sobre duração, recuperação e possíveis indicações. A IA recebe fatos gerais aprovados e só seleciona a resposta delimitada `LIFTING-FACIAL-INFORMATION-01` quando confirma procedimento, código e cobertura do pedido; duração exata e indicação individual continuam dependentes da avaliação. O ledger durável recuperado passa a sustentar o turno mesmo se a memória auxiliar não puder ser hidratada. Também foram corrigidos os falsos sinais de agenda por `boa tarde` e de credenciais por `cirurgia`. Código funcional `5f9e247b7a38698d5a9d79836f14e7b4a25ec3c0`, deploy Netlify `6a861fab62e3fc00085b847f`; Apps Script v104 preservado; **876/876 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável e webhook responderam HTTP 200 com automação `active`; nenhuma mensagem real foi enviada. Rollback: deploy `6a85e288a72ee70008cc87b2`, commit `5bb65664798b1d5ca5885fc75b07ec45dbf18833`.

> **Continuação sem link publicada — 19/08/2026, 14:10:** a versão `2026-08-19.3` corrige o caso em que uma resposta simples era compreendida e gerada, mas não chegava à paciente porque o modelo acrescentava espontaneamente um link em um turno com `maxLinks: 0`. Antes da validação final, o sistema agora retira a frase que contém o link e revalida a explicação útil restante; o texto efetivamente enviado é o mesmo gravado no ledger e na memória. Resposta composta apenas pelo link, texto vazio após a conformação ou qualquer outra violação continua bloqueada para revisão humana. Código funcional `5bb65664798b1d5ca5885fc75b07ec45dbf18833`, deploy Netlify `6a85e288a72ee70008cc87b2`; Apps Script v104 preservado; **867/867 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável e webhook responderam HTTP 200 com automação `active`; nenhuma mensagem real foi enviada. Rollback: deploy `6a8599b25b653800085f9f95`, commit `97da5c3a289062c9face0313418fe1beb7e3accf`.

> **Central de Atendimento sincronizada — 19/08/2026, 13:00:** após autorização específica, `CentralAtendimento.gs` foi publicado integralmente conforme o commit canônico `7e37eb3`, encerrando a última divergência funcional encontrada na auditoria. Ofertas comerciais antigas agora são rebaixadas para `Revisar exclusão comercial`, em modo `Silêncio` e sem resposta sugerida. A seleção humana `Encerrar — comercial/não paciente` resolve o compromisso, cancela retomadas pendentes, arquiva eventual linha como não paciente e registra o motivo, sem responder ao contato. Apps Script v104 no mesmo deployment canônico. Validação: SHA-256 do arquivo publicado igual ao local, **21/21 testes focados**, **865/865 testes integrais**, endpoint HTTP 200 com JSON `ok: true` e token inválido sem alteração de preferência. A atualização da Central ao vivo não foi executada no pós-voo; nenhuma mensagem real foi enviada.

> **Hotfix de integridade do Apps Script publicado — 19/08/2026, 12:49:** a pergunta simples de preço chegou ao Netlify e foi classificada para resposta, mas o Apps Script devolveu HTML de erro porque `Retomadas.gs` havia sido substituído por uma cópia de `Code.gs`; após a primeira restauração, a compilação revelou a mesma corrupção em `LeadClassification.gs`. As versões intermediária 102 e final 103 foram publicadas no deployment canônico preservado. A v103 deixou `Code.gs`, `LeadClassification.gs` e `Retomadas.gs` equivalentes ao estado local aprovado. A auditoria comparou os 22 arquivos do projeto: não restou duplicação ou truncamento; quatro diferenças eram apenas quebra de linha final. `CentralAtendimento.gs` conserva uma divergência histórica, sem sinal de corrupção, que ficou fora deste hotfix e depende de autorização separada. Validação: alvo canônico confirmado, **865/865 testes**, endpoint HTTP 200 com JSON `ok: true` e teste de token inválido confirmando que nenhuma preferência foi alterada. Nenhuma mensagem real foi enviada.

> **Orientação progressiva de preço e guias regionais publicados — 19/08/2026, 08:56:** a versão `2026-08-19.2` reconhece igualmente `valor` e `valores`, inclusive na sequência real `Sim, gostaria` seguida de `E gostaria de saber os valores`. Na primeira pergunta sobre preço cirúrgico, a Bruna responde sem faixa numérica e envia uma única vez o guia de composição coerente com o procedimento confirmado: facial para face e pescoço, mama para cirurgias mamárias e corporal para corpo ou cirurgia íntima. Sem procedimento confiável, nenhum guia é escolhido por suposição. Em cervicoplastia, a primeira resposta contextualiza a variação e oferece a faixa geral como próximo passo; somente um aceite claro ou novo pedido explícito libera uma única resposta com as faixas aprovadas e ressalvas. O link já enviado não se repete, e a página específica de lifting fica apenas como fallback quando nenhum guia facial apareceu no histórico. Outras cirurgias, repetição de faixa, agenda e contexto humano continuam protegidos. Código funcional `97da5c3a289062c9face0313418fe1beb7e3accf`, deploy Netlify `6a8599b25b653800085f9f95`; Apps Script v101 preservado sem nova publicação; **865/865 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável, webhook e os três guias responderam HTTP 200; automação permaneceu `active`. Nenhuma mensagem real de paciente foi enviada e nenhuma configuração do Google Ads foi alterada. Rollback: deploy `6a858294fc30270008e0964a`, commit `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`.

> **Prefill neutro, foto humana, cervicoplastia e retomada manual publicados — 19/08/2026, 07:29:** a versão `2026-08-19.1` trata `template_id=procedure_evaluation_v1` somente como contexto de origem; o template isolado não qualifica, não gera conversão offline, não abre agenda e não prova prontidão para marcar. A primeira resposta pergunta o que a pessoa deseja entender e só avança para dias ou período quando há intenção pessoal posterior. Perfis de empresa ou marca não recebem personalização nominal. Fotos recebem agradecimento pela confiança, reconhecimento cuidadoso de que existem boas abordagens, informação clara de que serão mostradas à Dra. Amanda e convite à avaliação, sem diagnóstico, indicação ou promessa pela imagem. `Cervicoplastia (lifting cervical)` passou a aparecer de forma coerente no site, prefill e conversa, mantendo planejamento individual e ambiente hospitalar com anestesista e equipe cirúrgica. O botão de aprovação manual da retomada no e-mail diário agora sai corretamente do frame do Apps Script; `não retomar` continua valendo apenas para aquela tentativa. Código funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`, deploy Netlify `6a858294fc30270008e0964a`, Apps Script v101 no mesmo deployment; **851/851 testes**, build de 178 arquivos e 44 URLs sem erro. Site, webhook e web app responderam HTTP 200; os três arquivos do Apps Script foram relidos e conferidos por SHA-256. Nenhuma mensagem real de paciente foi enviada e nenhuma configuração do Google Ads foi alterada. Rollback: Apps Script v100, deploy `6a84facdbed81175d2df0107`, commit `6fd37c3227e6fee1ca4ea1686248cb22733040f1`.

> **Contexto durável e estado semântico publicados — 18/08/2026, 21:44:** a causa recorrente das interrupções era a combinação de memória temporária curta, ausência de reconstrução durável após expiração e regras mecânicas que podiam interpretar `Sim`, `Certo`, `Ok` ou `Entendi` como fechamento antes de considerar a pergunta ou oferta imediatamente anterior. A versão `2026-08-18.5` mantém até 32 turnos no cache, reidrata o histórico pelo ledger canônico `_WHATSAPP_MENSAGENS` quando necessário e distingue autoria entre `paciente`, `bruna` e `equipe_humana`. Toda resposta entregue pela Bruna entra no ledger de forma idempotente e sem abrir uma segunda classificação. A IA recebe e devolve estado semântico estruturado com assunto, ato da paciente, referência por Event ID, última pergunta/oferta da clínica, pendências, fatos já informados, responsável, próxima ação, ambiguidade e confiança. Mensagens longas preservam início e final. Respostas curtas só ultrapassam o fechamento quando existe pergunta ou oferta concreta e a IA devolve `CONTEXT-CONTINUE-01` ou `CONTEXT-CLARIFY-01`; agradecimentos, encerramentos e todas as travas clínicas, de agenda, preço, opt-out, duplicidade e takeover permanecem protegidos. Não foi criado banco concorrente no Drive: a planilha `LEADS` continua sendo a fonte operacional, e a projeção ativa do manual permaneceu no mesmo arquivo. Código funcional `6fd37c3227e6fee1ca4ea1686248cb22733040f1`, deploy Netlify `6a84facdbed81175d2df0107`, Apps Script v100 no mesmo deployment; **843/843 testes**, build de 178 arquivos, 44 URLs sem erro, site, endpoint canônico e URL imutável HTTP 200, automação `active` e metadados `.5` confirmados. A projeção do Drive foi conferida byte a byte pelo SHA-256 `ded041b5f703b2a99167ccb402c2b6915f6ac1d8679cc3bae229a4882ef58258`. Nenhuma mensagem real de paciente foi enviada. Rollback: Apps Script v99, deploy `6a84eb15525edc0e071a0486`, commit `1b54e7e8937ee03a5679c894efd8d8dd53f0a2e5`.

> **Continuação contextual após fala humana publicada — 18/08/2026, 20:32:** o incidente analisado não foi perda de webhook nem falha de roteamento. A resposta curta chegou à cadeia canônica, mas a pergunta anterior da clínica havia ativado a tomada humana e a regra vigente tratava qualquer confirmação simples como pertencente exclusivamente à equipe. A versão `2026-08-18.4` abre uma exceção semântica delimitada: a IA interpreta imediatamente respostas como `Sim` ou `Pode sim` diante de uma oferta informativa concreta e só envia se devolver `CONTEXT-CONTINUE-01` com explicação direta, ou `CONTEXT-CLARIFY-01` com uma única pergunta específica. Continuação direta não admite pergunta, CTA, link nem confirmação de consulta. Aceite de horário, agenda, cuidado clínico, preço não aprovado, tarefa administrativa, opt-out, duplicidade e nova intervenção humana continuam bloqueados. Uma retomada atrasada permanece como fallback; a liberação da Bruna exige a mesma geração da tomada humana, evitando sobrescrever uma mensagem mais nova da equipe. Código funcional `1b54e7e8937ee03a5679c894efd8d8dd53f0a2e5`, deploy Netlify `6a84eb15525edc0e071a0486`; **826/826 testes**, build de 178 arquivos, domínio e endpoint canônicos HTTP 200, automação ativa, metadados de política/prompt/conhecimento alinhados à `.4` e rota sentinela de auditoria HTTP 404. A projeção ativa do Drive foi substituída no mesmo ID e conferida byte a byte pelo SHA-256 `7186ecebf6c391135f0d346aa7c07f0857bd4f506d9857774bb781cae3f732af`. Nenhuma mensagem real de paciente foi enviada. Rollback: deploy `6a84dea1cf780e00086eed7e`, commit `c392a743b2f00d751bf6dca8da54b991db0439ff`.

> **Compreensão semântica contextual publicada — 18/08/2026, 19:42:** a versão `2026-08-18.3` faz a IA interpretar primeiro toda mensagem textual elegível; sinais mecânicos de pontuação, palavras-chave, códigos, templates e classificações passam a ser pistas e guardrails. O caso coloquial `Aí fazem cervicoplastia` agora segue para a IA mesmo sem `?`. Agenda, preço e demais respostas determinísticas só substituem a redação do modelo quando ele confirma código, procedimento, profissional e cobertura integral do pedido. Depois de fala humana, autorização semântica genérica não basta: somente reabertura, esclarecimento, coordenação ou cópia institucional explicitamente confirmados atravessam o bloqueio final. Quando o significado realmente não estiver claro e a dúvida for segura, a Bruna faz uma única pergunta específica, sem link ou CTA; urgência, risco clínico, cuidado ativo, opt-out, duplicidade, agenda não validada e tomada humana permanecem fail-closed. Código funcional `c392a743b2f00d751bf6dca8da54b991db0439ff`, deploy Netlify `6a84dea1cf780e00086eed7e`; **814/814 testes aprovados**, build local com 178 arquivos e publicação de 12 funções sem erros. A projeção ativa do Drive foi substituída no mesmo ID e conferida byte a byte pelo SHA-256 `ca67a341f86e59190f9be8fe31501f1be6b5615e01154a0ae585d13358cc8db0`. Nenhuma mensagem real de paciente foi enviada na validação. Rollback: deploy `6a84534923558b0008961936`, commit `c789914991f409c81320090872ac50f4ebc86136`.

> **Contrato contextual e proteções semânticas publicados — 18/08/2026, 09:43:** cada turno da Bruna agora recebe um contrato único com estágio, responsável, intenções pendentes, motivo de silêncio e limites de perguntas, links, CTA e confirmação de agenda. A resposta resolve primeiro o pedido e pode terminar sem pergunta; preço cirúrgico com procedimento conhecido, consulta, convênio, canal oficial, localização e foto não ganham convite automático. Pausa, recusa por orçamento, decisão de retornar depois e respostas à equipe humana transferem corretamente a iniciativa, sem mensagem inconveniente ou retomada automática. Mensagens genéricas de espera foram removidas do paciente e do e-mail; somente um ponto concreto com encaminhamento real pode receber ciência, e contexto insuficiente gera `SEM SUGESTÃO PRONTA`. O validador final bloqueia identidade de automação, diagnóstico ou indicação à distância, promessa, condição ou valor não aprovado, abatimento da consulta, confirmação não verificada de agenda, menus e excesso de perguntas, links ou CTA. A janela passou a três segundos para respostas determinísticas e cinco para IA, limitada entre dois e oito segundos e ainda cancelada por mensagem mais nova ou intervenção humana. Uma base inicial de 18 cenários sintéticos foi criada a partir de padrões desidentificados de 20 exportações e 484 turnos da pasta restrita do Drive; as respostas reais continuam sendo evidência crítica, nunca padrão. O modelo permanece `gpt-5.6-terra` com raciocínio `medium`, e a ampliação das etapas tardias da jornada ficou para a segunda fase. Código funcional `c789914`, deploy Netlify `6a84534923558b0008961936`; **792/792 testes aprovados**, build com 178 arquivos, 12 funções e 5 agendamentos, endpoint canônico e URL imutável HTTP 200. A projeção ativa no Drive foi substituída no mesmo ID e conferida byte a byte. Nenhuma mensagem real de paciente foi enviada na validação. Rollback: deploy `6a843bde9799d000087778a5`, commit `cdfa79e`.

> **Correção contextual e contenção noturna publicadas — 18/08/2026, 05:48:** após envio humano de orçamento, confirmação, despedida ou outra mensagem conclusiva, a Bruna permanece em silêncio diante de agradecimentos, concordâncias, reações e encerramentos; não abre novo assunto, não confirma agendamento sem validação humana e não interpreta um cumprimento do atendente como pergunta pendente da paciente. Entre 00:00 e 05:59, horário de São Paulo, a primeira mensagem não urgente e realmente acionável recebe no máximo um reconhecimento curto e contextual, com retomada prevista para a manhã; mensagens seguintes apenas atualizam a fila, sem novo envio, e sinais como “está tarde”, “amanhã conversamos”, “vou dormir” ou equivalentes encerram imediatamente a atuação noturna. Nesse período ficam bloqueados textos longos, faixas de preço, links, CTA, oferta de horário e handoff genérico; urgências mantêm o fluxo seguro próprio. A retomada ocorre a partir das 08:00, respondendo ao pedido concreto e respeitando tudo o que a equipe já informou. O e-mail interno passou a trazer uma sugestão matinal específica e pronta para revisão humana, em vez de repetir ao operador uma mensagem genérica de espera; quando o valor de R$ 500 da consulta já foi perguntado, o rascunho o responde diretamente e o separa do orçamento cirúrgico. Fotos preservam acolhimento, reconhecimento de boas opções e os limites carinhosos da avaliação à distância. Código no commit `2310b82`, deploy Netlify `6a841c6173dcba000867c1af`; **757/757 testes aprovados** e build de produção concluído sem erros. Nenhuma mensagem real de teste foi enviada. Manual ativo na versão `2026-08-18.1`: https://drive.google.com/file/d/17eOwn4Z7v7josBnnPJhBHn31wY-2P1YF/view. Rollback: deploy `6a841429bcd1c6000730464c`, commit `86aa61e`.

> **Diretrizes adaptativas publicadas — 18/08/2026, 05:05:** o atendimento da Bruna passou a usar contexto, estágio, barreira observável e segurança antes de escolher tom, extensão, pergunta ou CTA. ARC é raciocínio, não roteiro: acolher somente quando pertinente, responder primeiro e conduzir apenas um passo útil — ou nenhum. A identidade autorizada é exclusivamente `Bruna, concierge da Clínica LIV Faria Lima`; qualquer resposta gerada que tente rotulá-la como automação, bot, robô, IA, assistente ou secretária virtual é bloqueada em fail-closed antes do envio. Fotos de rosto ou corpo recebem acolhimento da confiança e da vulnerabilidade, reconhecimento de que há boas opções que podem ajudar e limite carinhoso da avaliação à distância, sem interpretação ou promessa. Endereço, mapa, parcelamento antecipado quitado antes da cirurgia e desconto à vista foram padronizados. A primeira resposta de preço deixou de perguntar o que mais incomoda; faixas de minilifting e lifting permanecem restritas à insistência explícita, uma vez, com ressalvas e guia. Código no commit `48645e2`, deploy Netlify `6a8412401c7cf900084e20fe`; **736/736 testes aprovados**, 12 funções publicadas, 1 regra de redirect e 4 regras de header sem erro. Nenhuma mensagem real de teste foi enviada. Manual ativo: https://drive.google.com/file/d/17eOwn4Z7v7josBnnPJhBHn31wY-2P1YF/view. Auditoria fechada: https://drive.google.com/file/d/1Fw12uukeIa2qKx-a-teI9BQhobNUdHVB/view. Os três planos antigos foram preservados em `99 — Histórico operacional`. Rollback: deploy `6a83a0984b04f30008d1cd5f`, commit `44f6ea7`.

> **Correção publicada — 17/08/2026, 20:53:** duas aberturas reais de anúncio, às 19:25 e 19:58, não apareceram na cadeia canônica de mensagens, eventos, classificação, CRM, tomada humana ou recuperação. O consumo do Netlify estava abaixo do limite mensal e não explica as ausências; o log bruto da YCloud não pôde ser consultado sem autenticação no provedor. Para reduzir a latência, a abertura determinística de anúncio deixou de consultar conhecimento e passou a reutilizar a relação de paciente já devolvida por `append_lead`, eliminando até duas chamadas redundantes de planilha sem retirar a janela de oito segundos, a regra de mensagem mais recente nem as travas `neverBotReply` e `fail-closed`. O webhook agora registra com segurança o motivo de qualquer descarte inicial, sem expor telefone, mensagem ou ID bruto. Produção no commit `25bfb5a`, deploy Netlify `6a839ee556112000081461b4`; **734/734 testes aprovados**, 12 funções publicadas e `ycloud-webhook` ativo no endpoint canônico. O deploy intermediário `41aa4ad` falhou no build por corrupção de transferência e nunca entrou em produção. Nenhuma mensagem de teste ou sonda de paciente foi disparada por nós. Na observação passiva, a sequência real seguinte chegou às 20:57, sofreu `timeout`/`busy_retry` no roteamento, foi recuperada por retentativas, suprimiu corretamente a abertura Meta mais antiga e concluiu a resposta à mensagem mais recente com entrega HTTP 200 às 20:58:30. Isso confirma webhook, recuperação e envio da Bruna após a publicação; ausência de invocação futura ainda exige o log bruto da YCloud. Rollback: deploy `6a83817252a5620008759409`, commit `7348755`.

> **Correção publicada — 17/08/2026:** a primeira resposta a uma pergunta sobre preço cirúrgico ficou mais curta, empática e voltada à continuidade da conversa. A Bruna reconhece que é natural querer saber o valor, explica em uma frase que a Dra. Amanda confirma o valor exato após a avaliação individual e termina com uma pergunta simples sobre o que a pessoa deseja melhorar — no lifting facial, rosto ou pescoço; no cervical, pescoço. Essa primeira resposta não lista itens técnicos, não envia artigo e não divulga faixa. Quando a própria pergunta menciona parcelamento ou o que está incluído, acrescenta apenas que o orçamento é completo e há opções de pagamento. As travas, a faixa aprovada somente após insistência explícita em lifting/minilifting e a revisão humana dos demais casos foram preservadas. Código no commit `09ea3b8`, deploy Netlify `6a8380447e2e7d00080ea234`; **729/729 testes aprovados**. Pós-voo: função sintética acionada com sucesso e linha idempotente `synthetic_attribution_v2_20260817` confirmada na planilha canônica com persistência, classificação, handoff e atribuição em `ok`, sem telefone, mensagem ou envio de WhatsApp. Rollback: deploy `6a836ad3cd5cad000838bee6`, commit `a3d0279`.

> **Correção publicada — 17/08/2026:** a Bruna passou a usar IA como triagem padrão para mensagens estéticas de baixo risco e manter a conversa quando já existe contexto, sem repetir apresentação ou nome por falta de memória local e sem encaminhar ao humano apenas por mensagem curta ou pontuação informal. As travas clínicas, de segurança, agenda e operação continuam fail-closed. O valor da consulta permanece R$ 500, com Pix, débito ou parcelamento e nota fiscal, mas a Bruna não pode dizer que esse valor será reembolsado, devolvido, descontado ou abatido de uma cirurgia. Código no commit `ad97121`, deploy Netlify `6a83690d6be96500087261f3`; **727/727 testes aprovados**. Pós-voo sintético: a linha diária `synthetic_attribution_v2_20260817` confirmou persistência, classificação, handoff e atribuição em `ok`, sem telefone, mensagem ou envio de WhatsApp. Rollback: deploy `6a8356fcdac1ed0008259ff6`, commit `a8440a0`.

> **Correção publicada — 17/08/2026:** a expressão “este procedimento” agora é resolvida pelo contexto mais recente da paciente e pelo código do anúncio/campanha, sem ser tratada como sinônimo de lifting. `M26C...` identifica lifting cervical, `M26F...` identifica lifting facial e `M26O...` identifica otoplastia; uma menção explícita posterior prevalece sobre a referência antiga. A confirmação hospitalar automática permanece restrita a lifting cervical e facial, enquanto outros procedimentos continuam em revisão humana. Commit `86be3bd`, deploy Netlify `6a8355e01229780008678685`; **723/723 testes aprovados**. Pós-voo sintético idempotente: persistência, classificação, handoff e atribuição em `ok`, sem telefone, mensagem ou envio de WhatsApp. Rollback: deploy `6a8351223af85000083ceeea`, commit `9d950ce`.

> **Correção publicada — 17/08/2026:** perguntas objetivas sobre o ambiente do lifting cervical ou facial agora recebem resposta determinística: ambos são cirurgias realizadas em hospital, com anestesista e equipe cirúrgica. A frase “este procedimento” herda o lifting já identificado no histórico, inclusive antes da primeira resposta da clínica; outros procedimentos continuam em revisão humana. Commit publicado `d87fbc1`, deploy Netlify `6a834fc3a223280007cb423b`; **721/721 testes aprovados**. Pós-voo: a função sintética foi acionada com sucesso pelo Netlify; a linha diária idempotente `synthetic_attribution_v2_20260817` permaneceu com persistência, classificação, handoff e atribuição em `ok`, sem telefone, mensagem ou envio de WhatsApp. Rollback: deploy anterior `6a834a6a8064630008d91721`, commit `072dffb`.


> **Correção publicada — 17/08/2026:** os telefones internos configurados no segredo `WHATSAPP_INTERNAL_NUMBERS` são ignorados antes de qualquer persistência na planilha LEADS, CRM, memória, fila, tomada humana ou agendamento. O formulário privado passou a incluir `Matheus (ortop)`, sempre na `Sala 2`; se ela estiver ocupada, não há fallback para a `Sala 1`. A automação de consulta pelo WhatsApp continua limitada a Amanda e Daniel. Apps Script versão **99** no deployment canônico preservado; Netlify no commit `2d51398`, deploy `6a8347fcc5597904763a82ee`; **717/717 testes aprovados**. Pós-voo do formulário: opção e regra de Sala 2 conferidas sem enviar reserva. Rollback: Apps Script v98 e commit anterior ao `2d51398`.

> **Correção publicada — 17/08/2026:** comprovantes humanos com `Nome`, `Data`, `Horário` e `Médico` agora são processados antes da persistência secundária da tomada humana. O modelo de procedimento com `Retorno: não se aplica`, valor zero e pagamento não aplicável é registrado como `Procedimento`; Amanda ocupa sempre a `Sala 1`; um novo agendamento não sobrescreve atendimento já encerrado; e o mesmo comprovante continua idempotente. Apps Script versão **98** no deployment canônico preservado. Netlify publicada no commit `7c8f7d0`, deploy `6a8339ee0bd5ba0008b38d6f`, com **712/712 testes aprovados**. Pós-voo sintético: HTTP 200, `status=duplicate`, `runId=synthetic_attribution_v2_20260817`, sem mensagem real e sem dado de paciente. Rollback: Apps Script v97 e commit anterior `505472d` se for necessário desfazer exclusivamente esta correção.

> **Correção publicada — 16/08/2026:** o `Retomadas.gs` foi sincronizado com o commit `3152ee9` após autorização explícita para incluir também as mudanças anteriores dos commits `7e37eb3`, `ddf0b30` e `6480a3a`. Os links de `Não retomar mais` e de aprovação da Bruna agora usam exclusivamente o deployment canônico registrado em `production-target.json`; uma URL divergente devolvida pelo ambiente ou mantida em Script Properties não pode mais substituir esse alvo. O cancelamento preserva token HMAC e confirmação em duas etapas, marca somente `Nunca retomar` e cancela apenas planos pendentes do telefone selecionado. Apps Script versão **93**, no mesmo deployment público. Validação: **691/691 testes aprovados** e pós-voo HTTP 200 com telefone sintético e token inválido, retornando `Link inválido` e confirmando que nenhuma preferência foi alterada. Rollback: versão 92 no mesmo deployment.

> **Correção publicada — 14/08/2026:** os registros de produção mostraram que uma pergunta válida sobre acesso e valor da consulta ficou sem resposta porque `append_lead` no Apps Script ultrapassou o timeout de 8 segundos. A planilha concluiu a gravação depois, mas o webhook já havia falhado de forma fechada; a recuperação repetiu o mesmo caminho lento. O deploy `6a7f2efadac1ed0008dffffa` reserva até 20 segundos apenas para `append_lead` (limite configurável entre 8 e 25 segundos), desconta do debounce o tempo já gasto no roteamento, classifica “como passar em consulta e o valor” como informação de consulta — não preço cirúrgico — e prioriza o nome informado pela própria pessoa sobre um nome de perfil incompatível.

> **Correção publicada — 15/08/2026:** uma nova abertura de anúncio Meta sobre lifting foi registrada, roteada e classificada, mas ficou sem resposta, handoff ou alerta. A análise confirmou que não havia bloqueio noturno, preferência de silêncio, tomada humana ou exclusão comercial. O defeito estava no ciclo técnico: uma repetição exata podia ser silenciada porque a entrada já existia na planilha, mesmo sem prova de conclusão da resposta, e o sucesso de uma tarefa deferida não encerrava imediatamente a recuperação durável. A correção só silencia a repetição quando o ciclo durável comprova conclusão, deixa falhas pendentes para nova tentativa e fecha a fila assim que o trabalho deferido termina. Aberturas determinísticas de anúncio passam a ser enviadas antes da confirmação HTTP do webhook; se o armazenamento durável falhar, qualquer resposta ativa também permanece dentro da execução principal. O envio continua idempotente pelo ID do evento. Validação local: **570/570 testes aprovados**. Código publicado no commit `c7695cf`, deploy Netlify `6a8052125175820008998f77`; o endpoint público respondeu HTTP 200 com automação `active` e proteções configuradas.

- Endpoint: `https://draamandaschroeder.com.br/api/ycloud/webhook`
- Automação: `active`
- Identidade de atendimento: Bruna, concierge da Clínica LIV Faria Lima; nunca se apresenta como automação
- Template de alerta: `alerta_revisao_liv_v1`
- Destino dos alertas: WhatsApp pessoal da Amanda (`+55 19 99694-4518`)
- Agenda: revisão humana obrigatória antes de oferecer horários
- Resumo de retomadas: e-mail diário para `amandaschh@hotmail.com` e `daniel.added@gmail.com`

### Continuidade e consumo das Functions

O endpoint público processa cada evento da YCloud diretamente. O recebimento,
o registro na planilha e a resposta elegível da Bruna não dependem de uma
varredura periódica. Antes de qualquer resposta, as travas por evento,
conversa e atividade humana continuam impedindo duplicidade.

Cada mensagem de texto também cria um registro temporário na fila de
recuperação. Em operação normal, o próprio webhook conclui e remove esse
registro. Se houver falha de planilha, IA ou entrega, `ycloud-recovery` verifica
a fila a cada cinco minutos, tenta novamente com deduplicação e, depois do
limite seguro, envia a exceção para revisão humana. Portanto, o intervalo de
cinco minutos afeta somente falhas excepcionais; mensagens normais continuam
imediatas.

A recuperação só termina quando a mensagem estiver vinculada à oportunidade
correta e todo o trabalho automático aplicável tiver chegado a um estado final.
Uma resposta HTTP bem-sucedida, um evento duplicado ou um registro
`route_pending` isoladamente não encerram a fila. Se a pessoa enviar uma segunda
mensagem sem repetir o código do anúncio, o sistema herda a única oportunidade
ativa daquele telefone. Se existirem ao mesmo tempo oportunidades ativas de
Amanda e Daniel, falha de forma fechada e pede revisão, sem misturar os
profissionais. Ao recuperar uma rota pendente, atualiza o evento e o vínculo da
mensagem existentes, sem criar duplicidade.

O antigo Async Workload da Netlify foi retirado em 12/08/2026. Ele já não fazia
parte do caminho público, mas mantinha runners e schedulers auxiliares ativos e
gerava milhares de invocações ociosas. Classificação de leads e retomada após
intervenção humana continuam executadas a cada cinco minutos.

O diagnóstico público do endpoint deve indicar:

- `apiKeyConfigured: true`
- `signatureProtection: active`
- `sheetsWebhookConfigured: true`
- `sheetsSecretConfigured: true`
- `openAIConfigured: true`
- `reviewAlertConfigured: true`
- `appointmentReviewEnabled: true`
- `automationMode: active`
- `internalPhoneExclusionConfigured: true`

## O que a Bruna pode responder automaticamente

- Procura inicial por cirurgia plástica ou procedimento conhecido.
- Continuação curta e coerente da conversa.
- Dúvidas gerais seguras sobre avaliação e procedimentos.
- Foto de rosto ou corpo: agradecer de forma simples, dizer que há boas abordagens que podem ajudar esse tipo de queixa e informar que a foto será mostrada à Dra. Amanda para uma avaliação cuidadosa, sem presumir vulnerabilidade, prometer resultado ou expor a trava clínica em linguagem técnica. A interpretação da imagem continua bloqueada internamente.
- Perguntas informativas como “como funciona a consulta?” ou “como funciona a avaliação?”, sem confundi-las com pedido de agenda.
- Pergunta objetiva sobre o ambiente do lifting cervical ou facial: ambos são cirurgias realizadas em hospital, com anestesista e equipe cirúrgica. A comunicação apresenta o procedimento cervical como `cervicoplastia (lifting cervical)` e reconhece `cervicoplastia`, `lifting cervical` e `lifting de pescoço` como nomes do mesmo contexto, sem concluir técnica ou indicação. Se a pessoa disser apenas “este procedimento”, o bot resolve o procedimento pelo contexto mais recente da paciente e pelo código do anúncio/campanha (`M26C...` cervical, `M26F...` facial e `M26O...` otoplastia), sem transformar a expressão em sinônimo de lifting. A confirmação automática permanece restrita aos dois liftings; sem contexto confirmado ou para outro procedimento, mantém revisão humana.
- Mensagem automática de anúncio ou site: somente `template_id=procedure_evaluation_v1` identifica o prefill. Frases, referência e origem não bastam. O prefill é contexto e nunca qualifica o lead, gera conversão offline, encaminha agenda ou prova prontidão. A Bruna abre com o procedimento e pergunta o que a pessoa gostaria de entender primeiro; para o procedimento cervical, usa `cervicoplastia (lifting cervical)`. Dias e período só são pedidos após uma mensagem pessoal de agendamento, aceite explícito para consultar a agenda ou preferência informada.
- Valor da consulta da Dra. Amanda: R$ 500, com pagamento por Pix, débito ou parcelamento e emissão de nota fiscal. Não informar que os R$ 500 serão reembolsados, devolvidos, descontados ou abatidos de uma cirurgia.
- A primeira pergunta sobre preço cirúrgico recebe uma resposta breve, empática e sem faixa numérica, acompanhada uma única vez pelo guia de composição correspondente ao procedimento confirmado: facial para face e pescoço, mama para cirurgias mamárias e corporal para lipoaspiração, abdômen, braços, íntima, contorno e combinações corporais. Em cervicoplastia, a Bruna reconhece que uma noção de valor ajuda no planejamento, explica que o orçamento muda entre uma abordagem mais localizada e uma mais completa de pescoço e face e oferece enviar uma faixa geral como referência inicial. Em otoplastia, faz a mesma oferta somente depois de responder outras dúvidas seguras do turno; `otomodelação` é termo ambíguo e nunca sustenta, sozinho, afirmações sobre injetáveis, presença de cirurgia, duração ou indicação. Se a pessoa aceitar claramente a oferta — inclusive com `Sim` ou `Pode me passar` — ou voltar a pedir valor, média ou faixa, a Bruna pode enviar uma única vez as referências aprovadas: minilifting/lifting no contexto cervical e R$ 8 mil a R$ 14 mil para otoplastia. O link da primeira resposta não é repetido nesse segundo turno; sem guia anterior, entra o fallback correspondente. Para os demais procedimentos, a primeira resposta segue sem CTA; somente quando a cirurgia não estiver clara pergunta qual procedimento está sendo pesquisado e não escolhe um guia por suposição. Parcelamento e itens incluídos mantêm as condições já aprovadas. A faixa completa não é enviada automaticamente duas vezes no mesmo contexto, e os demais preços seguem para revisão humana.
- Apresentação correta da Dra. Amanda: residência médica em Cirurgia Plástica pela Unicamp, pós-graduação em Cosmiatria e Procedimentos pelo Einstein, CRM-SP 191605, RQE 110472 e atuação com foco em cirurgias da face.
- Esclarecimento sutil de barreiras como segurança, experiência, resultado artificial, preço, localização e pressão para decidir.
- Oferta cuidadosa da página do procedimento, seção de resultados ou artigo específico sobre recuperação, segurança, cicatriz e comparações — ou da página geral quando o procedimento ainda não estiver definido — para quem não veio do site.

A abordagem deve ser acolhedora, breve e progressiva: apresentação, estágio da pesquisa, dúvida ou objetivo principal e convite para avaliação. A Bruna não abre perguntando “o que incomoda”; depois de criar contexto, pode perguntar “o que você gostaria de entender ou melhorar?”.

Google, Meta e WhatsApp direto seguem a mesma estratégia. A mensagem e o histórico prevalecem sobre a origem. No Meta, a abertura pode reconhecer o anúncio; no Google, o procedimento ou a página pesquisada. O bot nunca presume que alguém está pronto para agendar apenas porque veio do Google.

O conteúdo textual de uma mensagem padrão nunca cria exceção de agenda. Mesmo que uma versão antiga contenha “consultar horários” ou “disponibilidade”, ela continua sendo apenas contexto enquanto vier marcada pelo `template_id` e não houver intenção pessoal posterior.

O site não deve ser enviado na primeira resposta por rotina. A exceção aprovada é a primeira pergunta sobre preço cirúrgico com procedimento confirmado: usar um único guia de composição da região correta — facial, mama ou corporal. A mensagem que efetivamente divulga uma faixa aprovada não repete esse link; se nenhum guia estiver no histórico, o lifting usa seu guia específico e a otoplastia usa o guia de cirurgia facial como fallback. Nos demais temas, o site entra depois da primeira resposta significativa ou quando a pessoa pedir material, fotos, casos ou antes e depois. O endereço deve aparecer por extenso no WhatsApp. O sistema envia apenas um material proativamente; um segundo link diferente exige pedido explícito. Não enviar junto de urgência ou pedido de agenda.

Mensagens consecutivas da mesma pessoa usam janela adaptativa: base de três segundos para resposta determinística e cinco para IA, limitada entre dois e oito segundos e ampliada para quatro ou seis quando a entrada é longa ou multipartida. Depois de elaborar a resposta, o sistema confere novamente qual foi a mensagem mais recente. Se outra mensagem tiver chegado durante a elaboração, a resposta anterior é cancelada e somente a intenção mais nova pode responder usando as últimas 16 interações, com identificação de paciente, Bruna e equipe humana. Uma pergunta explícita, como preço, localização ou consulta, sempre prevalece sobre o roteiro do anúncio.

Imediatamente antes do envio, a resposta planejada é confrontada com a mensagem atual e com a última fala da clínica. Se a paciente estiver apenas agradecendo, encerrando, adiando ou confirmando uma pergunta da equipe humana, a Bruna não entra. A única exceção durante a tomada humana é uma resposta curta que aceite claramente uma oferta informativa concreta: a IA pode cumprir exatamente a explicação prometida com `CONTEXT-CONTINUE-01`, sem nova pergunta, CTA, link ou confirmação de agenda; se o referente seguro ainda estiver ambíguo, pode fazer uma única pergunta específica com `CONTEXT-CLARIFY-01`. Se estiver respondendo de forma curta a uma pergunta da própria Bruna, a resposta deve continuar daquele ponto e não pode reiniciar com perguntas genéricas como `Como posso ajudar?`. Uma nova pergunta autônoma da paciente continua seguindo a rota normal.

## Quando não responder automaticamente

- Segunda pergunta por média de cirurgia que não seja lifting/minilifting, ou pedido de quantidade de parcelas, desconto, juros e composição exata do orçamento.
- Preferência de data, dia, período ou horário para agendamento.
- Situação potencialmente urgente.
- Cardiologia ou procura pelo Dr. Daniel.
- Dúvida fora do padrão ou que exija decisão humana.
- Atendimento humano assumido e ainda dentro da janela protegida de 20 minutos, salvo a continuação informativa semanticamente delimitada acima.

Nesses casos, o sistema envia um alerta ao WhatsApp pessoal da Amanda quando aplicável. Em agendamento, a Bruna primeiro pergunta quais dias e se manhã ou tarde funcionam melhor. O alerta só é criado depois que a preferência existe e contém até três opções da aba `Datas Consulta`. A primeira pergunta sobre preço é respondida diretamente sem faixa numérica e com o guia de composição da região confirmada. Se houver insistência explícita por média/faixa de lifting/minilifting ou aceite claro da oferta específica feita na primeira resposta de cervicoplastia, a paciente pode receber uma única vez R$ 18 mil a R$ 25 mil e R$ 26 mil a R$ 42 mil como estimativas gerais informativas, não orçamento, proposta ou garantia. No caso cervical, a mensagem também explica que a faixa aplicável depende de o procedimento ser isolado ou associado a outras abordagens da face e do pescoço. Para otoplastia, o aceite da oferta ou novo pedido explícito libera uma única vez R$ 8 mil a R$ 14 mil, também sem CTA e com as mesmas categorias de ressalva. A resposta diz explicitamente que o valor final é definido após avaliação e planejamento e pode ficar fora da faixa; explica os fatores aplicáveis e não apresenta honorários isolados. O guia enviado na primeira resposta não é repetido; na ausência dele, usa-se o fallback aprovado para o procedimento. Nova repetição da faixa no mesmo contexto vai para revisão humana. Para outro procedimento, a paciente só recebe uma ciência quando o ponto pendente puder ser nomeado e o encaminhamento existir; sem isso, permanece em silêncio. A equipe recebe uma sugestão em faixa baseada na tabela de referência quando houver correspondência confiável. A faixa interna usa 10% abaixo da referência à vista e 10% acima da referência parcelada, arredondada em milhares. Amanda revisa e envia manualmente se estiver de acordo.

## Informações comerciais e localização

- Consulta presencial com a Dra. Amanda: R$ 500.
- Não informar que os R$ 500 da consulta serão reembolsados, devolvidos, descontados ou abatidos de uma cirurgia.
- Para cirurgia, é aprovado informar parcelamento antecipado, com quitação antes do procedimento, e desconto à vista. Quantidade de parcelas, percentual do desconto, juros, meios adicionais, datas, cancelamento e reembolso dependem de confirmação humana.
- A planilha de preços do Dr. João de 2025 é referência histórica autorizada somente para preparar sugestões internas de preço. Ela não é apresentada como tabela atual da Dra. Amanda e não autoriza envio automático.
- Nome correto: Clínica LIV Faria Lima.
- Localização correta: Rua Pais Leme, 215, Pinheiros, próxima à Av. Faria Lima, São Paulo. Não dizer que a clínica fica na própria Avenida Faria Lima.

## Quando ignorar

- Venda de produtos ou serviços.
- Proposta comercial ou parceria sem interesse assistencial.
- Oferta de gestão ou otimização do Perfil da Empresa no Google, Google Meu Negócio, Google Business Profile, Google Maps, SEO, tráfego ou captação de clientes.
- Convite pessoal, conversa imprópria ou assunto alheio à clínica.
- Mensagem claramente impertinente depois de esclarecido o contexto.

Esses contatos devem consumir o mínimo possível e não receber resposta automática.

O detector comercial é aplicado antes da IA e novamente, de forma independente, antes da criação de qualquer compromisso humano. Assim, uma falha de roteamento isolada não pode transformar uma oferta comercial reconhecida em “Pendência vencida”. Perguntas reais de pacientes sobre endereço ou localização no Google Maps continuam permitidas porque localização, sozinha, não caracteriza venda.

## Atendimento humano

Quando uma mensagem é enviada pelo WhatsApp Business da clínica para a pessoa, o sistema registra atendimento humano e cancela qualquer retomada automática pendente.

Se a paciente responder depois de uma mensagem humana, uma rotina executada a cada cinco minutos reavalia a conversa. Assuntos administrativos e seguros podem voltar para a Bruna após cerca de 5 minutos; temas sensíveis preservam a janela de 20 minutos:

- entre 06:00 e 23:59, dúvidas simples e respostas de alta confiança podem continuar em conversa ativa, respeitando encerramentos, tomada humana e os demais limites;
- uma nova mensagem humana cancela a retomada, inclusive durante a elaboração da resposta;
- agradecimentos e encerramentos simples não provocam nova mensagem;
- entre 00:00 e 05:59, nenhum preço, faixa, link, CTA, resposta longa, qualificação ou confirmação de agenda é enviado: a primeira mensagem acionável recebe no máximo uma confirmação curta e contextual, e as seguintes apenas atualizam a retomada das 8h; se a paciente pedir para continuar amanhã, nenhuma nova mensagem é enviada naquela madrugada;
- fora da janela de 00:00 a 05:59, a resposta inicial de preço e a única resposta com faixa após insistência explícita sobre lifting/minilifting podem seguir em conversa ativa; média de outras cirurgias, condições exatas de pagamento, agenda e confirmação continuam dependendo da equipe;
- sintomas, possível urgência, segurança, documentos, pré ou pós-operatório, cardiologia, sofrimento intenso e demais temas reservados seguem para revisão humana; situações potencialmente urgentes nunca recebem promessa de aguardar até a manhã;
- se o tema não for reservado, mas a Bruna não tiver confiança para responder, a mensagem de espera só é enviada quando há uma pergunta, pedido ou resposta a uma pergunta da clínica realmente pendente;
- se não houver solicitação concreta pendente, a paciente não recebe uma mensagem artificial de espera: Amanda recebe o alerta para revisar a conversa;
- depois de uma resposta segura da Bruna, a automação volta a conduzir normalmente a conversa;
- depois da mensagem de espera ou de um bloqueio sensível, somente uma nova mensagem humana libera a conversa;
- o horário não interrompe uma conversa que a própria paciente iniciou ou manteve.

Cada tomada humana admite no máximo uma retomada automática. Uma nova mensagem enviada pelo WhatsApp Business inicia uma nova tomada e reinicia as proteções.

## Aprendizado supervisionado

Quando a Bruna recebe uma pergunta segura que ainda não sabe responder, ela segue esta ordem:

1. procura uma resposta com status `Aprovada` na aba `Respostas Aprovadas` e usa o texto exatamente como foi aprovado;
2. se faltar uma única informação essencial, faz uma pergunta curta de esclarecimento — no máximo uma vez;
3. se a dúvida continuar sem resposta, avisa que confirmará a informação e registra o caso para o resumo diário, sem gerar alerta imediato a cada dúvida segura;
4. quando Amanda ou a equipe responde pelo WhatsApp Business, a resposta humana é capturada como regra candidata com status `Revisar`;
5. somente depois de revisão da equipe e mudança para `Aprovada` uma regra de baixo risco pode responder automaticamente.

Regras de risco médio nascem como `Sugestão interna`. Regras de risco alto nascem como `Nunca automática`. Urgência, complicação, pós-operatório, diagnóstico, foto ou exame, prescrição, preço exato ou negociado, confirmação final de agenda e cardiologia nunca são liberados por esse aprendizado.

A aba `Revisões do Bot` reúne classificações de baixa confiança, regras novas e possíveis correções. Quando a equipe marca uma revisão de classificação como `Concluída` e registra a decisão correta, essa orientação passa a ser usada como exemplo nas classificações futuras. O e-mail diário inclui as dúvidas sem resposta e as regras aguardando aprovação.

### Marcos administrativos aprendidos da conversa

O classificador sempre lê as últimas mensagens da clínica e da paciente em conjunto. Ele pode atualizar o funil e a aba `Consultas` quando identificar:

- confirmação explícita de data e horário: `Consulta agendada` e consulta `Confirmada`;
- falta ou não comparecimento explícito: consulta `Não compareceu`, sem rebaixar o funil;
- comparecimento explícito: `Consulta realizada` e consulta `Realizada`;
- aceite, realização ou pagamento confirmado do procedimento: `Paciente convertido`;
- envio de orçamento pelo WhatsApp ou aviso de envio por e-mail: relacionamento em planejamento, sem considerar fechamento isoladamente.

Respostas curtas como “sim”, “deu tudo certo” e “pode seguir” só valem quando a pergunta ou afirmação imediatamente anterior deixa claro o que está sendo confirmado. Com baixa confiança, a planilha ainda é atualizada, a revisão fica aberta em `Revisões do Bot` e a equipe recebe um e-mail deduplicado. Essa atualização nunca dispara, por si só, mensagem automática ao paciente.

## Retomada após sete dias

Na primeira mensagem após mais de sete dias, a Bruna informa que está direcionando o atendimento para a equipe. Depois disso, permanece em silêncio até uma resposta humana.

## Planilha única e oportunidades

Há um único arquivo Google Sheets chamado `LEADS`, e somente ele é conectado ao Google Ads. As abas não são planilhas diferentes: são áreas internas do mesmo arquivo.

- Leads da Dra. Amanda: aba `Google Ads - Conversões`, com uma oportunidade identificada por `Opportunity ID`; é a única fonte elegível para o Google Ads.
- Leads do Dr. Daniel: aba `Leads Dr. Daniel`, no mesmo arquivo, sem click IDs elegíveis e sem contaminar as métricas da Dra. Amanda.
- Henrique, Marina e qualquer outro profissional: não são incluídos em nenhuma aba de leads; o contato vai para o registro interno de roteamento e para atendimento humano.
- Emprego, currículo, marketing, fornecedor e parceria comercial: são ignorados e não viram lead.
- Agenda semanal: aba `Datas Consulta`.
- Consultas agendadas e realizadas: aba `Consultas`, que também controla os lembretes operacionais.
- Respostas reutilizáveis: aba `Respostas Aprovadas`; somente linhas aprovadas e de baixo risco podem ser automáticas.
- Exceções e correções: aba `Revisões do Bot`; os campos amarelos são destinados à decisão da equipe.
- Histórico e controles técnicos: abas internas iniciadas por `_WHATSAPP_`.

A aba interna `_CRM_OPORTUNIDADES` é o vínculo canônico entre conversa, profissional, linha visível, classificação, consulta e eventual conversão offline. Ela não é um segundo arquivo de leads. A mesma pessoa pode ter uma oportunidade de Amanda e outra de Daniel, cada uma com profissional e histórico próprios. A atribuição da Amanda é fixada na criação e nunca é herdada por Daniel.

As colunas operacionais adicionadas às abas visíveis são auditáveis, mas não alteram a estrutura exigida pelo Google Ads: `Opportunity ID`, profissional responsável, versão, último evento, status operacional, resumo, próxima ação, objeção, relacionamento, responsável, parte aguardada, roteamento e data de fixação da atribuição.

### Conversão qualificada do Google Ads

A conversão offline canônica é `Lead qualificado GCLID`. O reparo protegido só altera uma transação quando `IMPORT_GOOGLE_ADS`, `_GOOGLE_ADS_EVENTOS`, a oportunidade da Dra. Amanda e a linha visível concordam exatamente sobre identidade, tipo, valor e o único identificador de clique. Qualquer duplicidade, ambiguidade, profissional diferente, mais de um click ID ou diferença de valor bloqueia o lote inteiro antes da primeira escrita.

Em 14/08/2026, uma cópia nativa da planilha foi criada antes da execução. A reconciliação normalizou 3 nomes na primeira aba, 5 nomes nas linhas visíveis elegíveis e reconstruiu 3 registros ausentes do ledger. O pós-voo e uma nova simulação ficaram com 5 linhas de importação, 5 registros de ledger e zero item inválido, duplicado, ausente, divergente ou em revisão. Nenhuma linha sem transação elegível foi modificada. A conexão `LEADS` do Google Ads permaneceu vinculada à primeira aba, com cinco campos mapeados e execução diária; tanto a importação automática anterior quanto a execução manual posterior concluíram 5 linhas com 0 erros.

Essa consistência não libera escala por si só. Enquanto a ação continuar em `Requer atenção`, deve-se acompanhar aceite/rejeição e correspondência por sete dias. Não ativar tCPA, Performance Max, correspondência ampla ou aumento de orçamento com base apenas nessa correção.

Quando a paciente escolhe uma das duas datas sugeridas, a seleção entra na aba interna `_AGENDAMENTOS_PENDENTES`. Isso não confirma a consulta e não cria evento. A equipe recebe a resposta sugerida e somente a confirmação humana finaliza o registro em `Consultas` e na Google Agenda. A grade `Datas Consulta` limita apenas a oferta e a confirmação automáticas: um horário negociado e confirmado pela equipe pode ser registrado mesmo quando não aparece nessa grade.

### Comprovante estruturado de agendamento

Uma mensagem humana com o cabeçalho `Comprovante de Agendamento` passa a valer como confirmação explícita somente quando trouxer, na própria mensagem, os quatro campos obrigatórios: `Nome`, `Data`, `Horário` e `Médico`. O médico deve ser identificado inequivocamente como Dra. Amanda Schroeder ou Dr. Daniel Added; a data precisa ser válida, não pode estar no passado e, quando o dia da semana for informado, ele deve coincidir com a data.

Quando esses critérios forem atendidos, o sistema usa o nome escrito no comprovante, grava de uma só vez a linha operacional completa em `Consultas`, sincroniza a Google Agenda, atualiza o lead e deixa o lembrete elegível. Se o horário existir em `Datas Consulta`, ele também é bloqueado; se não existir, o agendamento humano continua válido sem criar ou alterar uma linha artificial na grade. A escrita única evita uma linha parcial quando houver timeout. Depois de um timeout, o webhook relê o agendamento pelo ID antes de decidir se houve falha e não repete a escrita em um segundo caminho. O identificador da mensagem, a oportunidade, o telefone, a data, o horário e o profissional preservam a deduplicação: o mesmo comprovante processado novamente não deve criar um segundo registro nem um segundo evento.

Para a Dra. Amanda, todo atendimento presencial confirmado por esse fluxo ocupa exclusivamente a `Sala 1`. A confirmação humana não é recusada se já houver outro evento no mesmo intervalo: o registro e o evento são preservados, e a equipe recebe um alerta por e-mail específico para resolver o conflito. Sem conflito, o sucesso rotineiro não gera e-mail. Se houver um atendimento anterior já encerrado — realizado, cancelado ou com não comparecimento — o novo comprovante cria uma nova linha e um novo evento, sem apagar o histórico anterior. O tipo operacional usa o vocabulário válido da planilha (`Primeira consulta`, `Retorno`, `Pré-operatório`, `Pós-operatório` ou `Outro`); a agenda exibe somente o rótulo genérico e o profissional, sem dados clínicos ou identificação da paciente.

`Endereço`, `Retorno`, `Valor da consulta` e `Formas de pagamento` não participam da decisão de confirmar ou não o agendamento. A combinação exata `Retorno: não se aplica`, consulta com valor zero e pagamento não aplicável classifica o registro genericamente como `Outro`, compatível com a validação da planilha, e mantém o rótulo de agenda `Procedimento`. Esses dados financeiros não são copiados para a Google Agenda. A confirmação também grava `Canal preferido = WhatsApp`, `Consentimento para contato = Sim`, o momento da confirmação e a última interação humana; o gatilho de lembretes monitora a nova data e programa a única mensagem para 10h do dia anterior. Comprovante incompleto, data impossível, divergência de dia da semana ou profissional não suportado não altera planilha nem agenda e deve seguir para conferência humana.

### Números internos da equipe

Os telefones pessoais da equipe configurados em `WHATSAPP_INTERNAL_NUMBERS` na Netlify são excluídos antes de qualquer persistência. Uma mensagem recebida de um desses números, ou um eco enviado a um deles, não cria lead, oportunidade, memória de conversa, fila de recuperação, tomada humana ou agendamento e não chama a planilha LEADS. A resposta técnica usa `ignoreReason=internal_team_phone` sem devolver nem registrar o número.

Os valores ficam somente na variável de ambiente, separados por vírgula; não são copiados para o código, para este manual nem para a planilha. A publicação só pode ser considerada concluída quando o diagnóstico público mostrar `internalPhoneExclusionConfigured: true` e um teste sintético confirmar zero chamadas aos serviços downstream.

### Preferências permanentes de contato

Na aba `Google Ads - Conversões`, as três colunas administrativas após o cadastro normal do lead são:

- `Nunca retomar`: impede retomadas comerciais, aniversários, pós-consulta, reativações e demais contatos proativos. A equipe e a Bruna ainda podem responder quando a própria pessoa iniciar uma conversa. Lembretes operacionais de consulta confirmada continuam permitidos.
- `Nunca responder com robô`: impede toda mensagem automática ao paciente, inclusive respostas a mensagens recebidas, lembretes e pós-consulta. A conversa é encaminhada para atendimento humano e os alertas internos continuam funcionando.
- `Motivo / observação do bloqueio`: campo administrativo para registrar o contexto. O conteúdo não é enviado ao paciente nem incluído nas instruções da IA.

As duas primeiras colunas usam caixas de seleção. Em caso de dúvida, marcar `Nunca responder com robô`, pois é a opção mais restritiva. A preferência é lida novamente imediatamente antes de qualquer envio automático; assim, uma marcação feita enquanto a resposta está sendo elaborada também cancela o disparo.

Ao alterar `Situação do lead` para `Consulta agendada`, a automação cria ou atualiza a linha correspondente em `Consultas`, usando ID e telefone para evitar duplicidade. Se data e horário ainda não estiverem disponíveis, a linha é criada sem inventá-los e fica pronta para complemento. Uma confirmação explícita no WhatsApp também pode preencher a aba quando a conversa contiver data e horário inequívocos; sem os dois elementos, o sistema não presume um agendamento.

Ao alterar o status para `Consulta realizada`, a consulta é atualizada e o pós-consulta entra em uma fila única. O contato é feito somente uma vez, aproximadamente três horas depois da marcação e entre 09:00 e 19:00; se esse horário cair à noite, fica para a próxima manhã. Recusa de contato, cancelamento, ausência de telefone válido ou envio já registrado impedem novo disparo. Se houver interação humana posterior à consulta, o pós-consulta é suprimido e a razão fica registrada na própria linha.

O pós-consulta usa o modelo utilitário `pos_consulta_cuidado_liv_v1`:

> Olá! Aqui é a Bruna, concierge da Clínica LIV Faria Lima. Passando para saber se ficou alguma dúvida depois da sua consulta com {{1}}. Se quiser conversar sobre alguma orientação ou próximo passo, pode responder por aqui. Estamos à disposição.

O modelo deve estar aprovado antes de configurar `WHATSAPP_POST_CONSULT_ENABLED=true`. Até lá, a fila permanece registrada e nenhuma mensagem é enviada.

## Quando a paciente não comparece

Na aba `Consultas`, alterar o `Status` da consulta para `Não compareceu`. Esse é um desfecho próprio: não equivale a consulta realizada, cancelamento ou lead perdido. A linha permanece no histórico e o evento correspondente na Google Agenda é preservado com o resultado operacional `Não compareceu`, sem expor dados da paciente no calendário.

Ao registrar a ausência, o sistema:

1. interrompe lembretes e impede o fluxo de pós-consulta daquela marcação;
2. registra a data da ausência e o total de não comparecimentos da mesma pessoa com o mesmo profissional;
3. atualiza na aba de leads `Resultado do último agendamento`, `Último não comparecimento` e `Total de não comparecimentos`, sem substituir a situação comercial do lead;
4. mantém o agendamento encerrado, de modo que um reagendamento futuro seja criado em uma nova linha e não apague o histórico da falta;
5. programa um acolhimento aproximadamente três horas depois, sempre entre 09:00 e 19:00.

O primeiro acolhimento pode ser enviado automaticamente somente quando houver consentimento para contato, a janela de 24 horas do WhatsApp ainda estiver aberta, não existir interação posterior e nenhuma preferência de bloqueio estiver ativa. A mensagem não menciona multa, cobrança nem culpa; apenas demonstra cuidado e oferece ajuda para encontrar outro horário.

Se a janela do WhatsApp estiver fechada, o contato estiver marcado para atendimento humano ou já houver uma falta anterior, nada é forçado automaticamente. O e-mail diário apresenta a ação como manual, com a mensagem sugerida. Depois de um primeiro acolhimento automático sem resposta, uma eventual segunda tentativa aparece somente como sugestão humana, cinco dias depois. Qualquer resposta da paciente, atuação da equipe ou preferência `Nunca retomar`/`Nunca responder com robô` encerra a automação dessa ausência.

## Lembretes de consulta

Uma consulta com status `Agendada`, `Confirmada`, `Consulta agendada` ou `Consulta confirmada` pode receber:

1. a confirmação normal no momento do agendamento, dentro da própria conversa;
2. um único lembrete automático às 10h do dia anterior.

Nenhum lembrete é enviado antes das 9h ou a partir das 19h, no fuso de São Paulo. Se qualquer uma das colunas históricas de lembrete ou `Última tentativa de lembrete` já estiver preenchida, a consulta não recebe outra mensagem. A tentativa é registrada antes da chamada ao WhatsApp: mesmo que a resposta do provedor se perca, o sistema não repete automaticamente. Falhas ficam em `Erro do lembrete` para revisão humana. Assim, pacientes que receberam ou podem ter recebido um lembrete pelo fluxo anterior não recebem um segundo lembrete durante a migração.

Consultas canceladas, realizadas, vencidas, com pedido de reagendamento ou com recusa explícita de contato não recebem mensagens. Uma alteração de data ou horário reinicia apenas os controles daquele agendamento. As colunas `Confirmação da paciente`, `Última interação humana`, `Próxima ação` e `Motivo de supressão` deixam o contexto explícito; os controles de lembrete impedem duplicidade e permitem auditoria.

Os lembretes usam o modelo utilitário `lembrete_consulta_liv_v1`:

> Olá, {{1}}! Este é um lembrete da sua consulta com {{2}}, marcada para {{3}} às {{4}}, {{5}}. Se precisar ajustar o horário, responda por aqui.

No campo `{{5}}`, a clínica envia o local por extenso e o acesso direto ao mapa: `Clínica LIV Faria Lima, Rua Pais Leme, 215, Pinheiros, São Paulo` e `https://maps.google.com/?q=Rua+Pais+Leme,+215,+Pinheiros,+Sao+Paulo`. Registros antigos que trazem apenas o nome da clínica são enriquecidos automaticamente antes do envio. Localizações personalizadas, como teleconsulta, são preservadas e não recebem o endereço da clínica.

O disparo automático permanece desligado até o modelo estar aprovado no WhatsApp/YCloud. Depois da aprovação, configurar `WHATSAPP_APPOINTMENT_REMINDERS_ENABLED=true` no Netlify e executar `ativarLembretesConsultas()` uma vez no Apps Script. O remetente é aprendido pelos eventos recebidos do número comercial; `WHATSAPP_SENDER_NUMBER` funciona como substituição explícita, se necessária.

## Rotinas

### Toda semana

1. Atualizar somente os horários válidos na aba `Datas Consulta`.
2. Marcar dias indisponíveis como bloqueados.
3. Conferir se a profissional e as datas estão corretas.

### Todos os dias

1. Conferir o e-mail diário do plano de retomadas enviado por volta das 8h para Amanda e Daniel; ele também mostra dúvidas ainda sem resposta e regras novas aguardando aprovação.
2. Revisar o histórico antes de usar cada mensagem sugerida e decidir as linhas abertas em `Revisões do Bot`.
3. Não retomar quem respondeu por outro canal, pediu interrupção ou não faz mais sentido comercial.
4. Acompanhar alertas de preço, agenda, cardiologia e situações fora do padrão.

O e-mail organiza a agenda diária e separa com clareza:

1. os envios automáticos realmente programados, com horário;
2. as ações humanas sugeridas, com horário e mensagem pronta;
3. os marcos dos próximos sete dias, identificados como automáticos ou manuais.

Nas retomadas comerciais que aparecem como ação humana, o e-mail também pode mostrar o botão `Passar para a Bruna`. Ele não envia a mensagem no primeiro clique: abre uma página que repete o texto sugerido e exige confirmação explícita. Depois da confirmação, somente aquele plano entra na fila automática, com registro da data e da origem da aprovação.

Para aprovar várias de uma vez, usar a aba `Central de Atendimento`:

1. revisar o histórico e a coluna `Resposta sugerida` de cada retomada;
2. marcar `Aprovar com a Bruna` nas linhas desejadas;
3. abrir `Central LIV > Aprovar retomadas marcadas`;
4. conferir a quantidade exibida e confirmar uma única vez.

A marcação da caixa, isoladamente, nunca envia mensagem. O comando do menu processa somente linhas de `Retomada de marketing` que continuam em modo `Manual`, com status `Programado` e texto sugerido preenchido. Linhas marcadas por engano permanecem humanas e recebem uma observação com o motivo. As aprovadas passam a `Bruna/bot` e `Automático`, preservam o horário planejado e continuam sujeitas à validação final individual.

Quando um compromisso antigo puder ser reconciliado com uma oferta comercial, ele aparece como `Revisar exclusão comercial`, prioridade normal, modo `Silêncio` e sem resposta sugerida. Depois de conferir o histórico, selecionar `Encerrar — comercial/não paciente` em `Status operacional`. Essa única ação resolve o compromisso, cancela retomadas pendentes, arquiva eventual linha de lead como não paciente e registra a observação `Contato comercial/marketing — não paciente. Encerrado sem resposta.` Não responder ao contato e não marcar `Aprovar com a Bruna`.

Publicação de 14/08/2026: Apps Script versão 89 no deployment preservado. O endpoint respondeu HTTP 200 com `ok: true`; a atualização ao vivo da `Central de Atendimento` concluiu com 21 colunas, `Aprovar com a Bruna` na coluna 19, uma retomada elegível com caixa nativa e nenhuma caixa previamente marcada. Validação local: **549/549 testes aprovados**.

Antes de usar o botão:

1. abrir o WhatsApp e ler o histórico recente da paciente e da clínica;
2. confirmar que a mensagem sugerida continua adequada e que a equipe não respondeu por outro canal;
3. clicar em `Passar para a Bruna` e conferir novamente o texto na tela de confirmação;
4. confirmar somente se a mensagem puder ser enviada exatamente como está.

A aprovação humana não elimina as proteções técnicas. Imediatamente antes do disparo, o sistema verifica novamente se a conversa não mudou, se a paciente não respondeu, se nenhuma pessoa da equipe interveio, se a janela do WhatsApp continua aberta, se o lead ainda está elegível e se não existe `Nunca retomar`, `Nunca responder com robô`, suspensão automática ou contexto sensível. Se qualquer condição mudar, o plano é cancelado. O botão não aparece para aniversários, reativações de clientes antigos, jornada cirúrgica ou cuidados clínicos; esses itens continuam humanos.

Primeiras retomadas seguras, sem agenda ou decisão humana, aparecem como candidatas à Bruna, mas continuam sendo apenas planejamento enquanto não existir uma rotina específica e uma janela válida do WhatsApp. A resposta inicial de preço e a única faixa de lifting após insistência explícita seguem o fluxo automático aprovado. Agenda, repetição da faixa no mesmo contexto, demais preços e follow-ups tardios continuam dependendo de decisão humana; quando o botão estiver disponível, a equipe pode autorizar o bot apenas a entregar o texto exato já revisado. Aniversários, datas especiais e reativações de clientes antigos permanecem integralmente manuais.

### Cadência de relacionamento

1. Procura inicial: primeira retomada após cerca de 24 horas, retomando a objeção específica; segunda e última após cerca de 72 horas, com uma prova pertinente. Depois de duas tentativas sem resposta, não há novo contato proativo. Cada mensagem deve acrescentar utilidade ou reduzir uma dúvida, nunca apenas perguntar se a pessoa viu a mensagem.
2. Pós-consulta: acolhimento inicial cerca de três horas após a consulta quando a automação estiver habilitada; checagem humana no terceiro dia; contato humano no décimo quarto dia apenas se ainda fizer sentido e não houver interação recente.
3. Aniversário: mensagem humana às 10h30, sem oferta comercial e sem mencionar procedimento.
4. Datas especiais e jornada cirúrgica: somente quando registradas na aba `Consultas`, sempre com revisão humana.
5. Cliente antigo: reativação manual às 16h30, conforme a periodicidade registrada ou o primeiro marco de seis meses. Depois disso, o próximo contato deve ser registrado explicitamente; não existe sequência automática contínua.

Se a paciente disser que entrará em contato, que chamará a clínica, que falará mais tarde ou usar formulação equivalente, nenhuma retomada deve ser planejada nas 24 horas seguintes à mensagem. A regra usa horas corridas, não apenas a mudança da data no calendário.

Retomadas comerciais só podem ser planejadas entre 09:00 e 19:00, no fuso de São Paulo. Se o volume do dia ultrapassar os horários disponíveis, os contatos excedentes ficam para o próximo planejamento; nunca são deslocados para a noite ou madrugada.

Essa restrição vale para retomadas iniciadas pela clínica depois de silêncio. Quando a própria paciente inicia ou mantém uma conversa à noite, a Bruna pode continuar respondendo até o encerramento natural somente fora da janela de madrugada. Entre 00:00 e 05:59, vale a contenção específica: uma única confirmação curta por episódio, nenhuma nova mensagem após pedido de pausa e retomada contextual às 8h. Possível urgência segue imediatamente a rota de segurança.

O alerta por e-mail da madrugada deve trazer a mensagem mais recente e indicar se a paciente já recebeu a confirmação curta. Ele oferece resposta contextual pronta somente quando o assunto pendente puder ser identificado; caso contrário informa `SEM SUGESTÃO PRONTA` e exige leitura da conversa. A frase genérica `Recebi sua mensagem. Vou conferir essa informação com a equipe e retorno por aqui assim que possível.` não é uma sugestão humana válida em nenhum horário e não deve aparecer nesse fluxo.

As mensagens sugeridas devem parecer continuação de uma conversa: reconhecer a dúvida, retirar pressão por decisão e permitir que a pessoa responda no próprio ritmo. A primeira retomada continua a objeção específica registrada. A segunda e última acrescenta uma única prova pertinente, como material específico, explicação da consulta, credencial verificável ou composição de custos, sem repetir link já usado. Depois disso, os contatos proativos são encerrados. Sofrimento intenso relacionado à aparência e pedidos explícitos de interrupção excluem automaticamente o contato da lista.

### Quando assumir uma conversa

Responder pelo WhatsApp Business da clínica. O eco registra automaticamente uma nova tomada humana, cancela qualquer resposta pendente da Bruna e inicia a janela protegida.

## Pausa de emergência

O controle único de emergência é a variável de produção
`WHATSAPP_AUTOMATION_MODE` no site canônico do Netlify, identificado pelo
`siteId=c33facb6-eafc-4635-99d6-068bf8707227`. Título, posição na lista ou
data de modificação não identificam o alvo.

Estados permitidos:

- `active`: atendimento automático normal;
- `shadow`: a IA pode avaliar os turnos para auditoria, mas nenhuma mensagem
  automática é enviada e nenhuma escolha ou resposta da paciente altera a
  agenda automaticamente;
- `off`: a entrada continua sendo registrada para a equipe, mas ficam
  bloqueados a avaliação pela IA, a resposta ao paciente, a reserva ou mudança
  automática de agenda, a retomada programada, os lembretes de consulta, o
  pós-consulta e a retomada depois de atendimento humano.

Ao receber do responsável um pedido explícito para desligar o bot:

1. confirmar o `siteId` canônico antes da escrita;
2. alterar somente o contexto de produção para:

`WHATSAPP_AUTOMATION_MODE=shadow`

   quando o pedido for apenas interromper envios, ou para:

`WHATSAPP_AUTOMATION_MODE=off`

   quando o pedido for desligamento completo;
3. se a plataforma exigir nova publicação para aplicar a variável, republicar
   exatamente o último commit de produção verificado, nunca o estado mais novo
   da branch por suposição;
4. verificar o estado observado no endpoint público com:

```powershell
npm.cmd run bot:status -- --expect off
```

   ou `--expect shadow`, conforme o pedido;
5. registrar horário, modo observado e deploy. Não enviar mensagem real como
   teste e não reativar automaticamente.

A reativação exige novo pedido explícito, troca para
`WHATSAPP_AUTOMATION_MODE=active`, publicação do mesmo commit aprovado quando
necessária e verificação com:

```powershell
npm.cmd run bot:status -- --expect active
```

Os endpoints de retomada, lembrete e pós-consulta validam o mesmo controle no
momento do disparo e devolvem `automation_inactive` quando o modo não é
`active`. Assim, uma fila já existente não contorna a pausa.

## Publicação técnica default-off de 15/08/2026

- Alvo canônico confirmado por projeto, deployment e planilha antes da primeira escrita.
- Apps Script publicado como versão 91, preservando o deployment existente.
- Netlify publicado a partir do commit candidato `50d7ea1`, deploy `6a80bef31b7d69000853db97`.
- `LEAD_IDENTITY_HMAC_SECRET` foi provisionado sem registrar seu valor; a key version ficou em `k1`.
- `ATTRIBUTION_CLAIM_SECRET` foi provisionado apenas no contexto de produção do Netlify, sem registrar seu valor.
- `attributionJourneyEnabled=false` permaneceu no JavaScript público e `ATTRIBUTION_SCHEMA_VERSION` permaneceu ausente. Nenhuma migração, backfill, nova coluna ou lead sintético foi executado.
- Validação local: 657/657 testes, 44/44 URLs no gate técnico e artefato de 173 arquivos sem `auditorias/**`.
- Smoke live: páginas, tracking, `robots.txt`, `sitemap.xml` e web app HTTP 200; sentinela de auditoria HTTP 404; endpoint de jornada HTTP 405 em GET; nenhuma faixa antiga ou `JID` no HTML público.
- Rollback: Netlify para o deploy anterior `6a808fcc31dd650008489886`; Apps Script para a versão 90 no mesmo deployment.
