# WhatsApp Clínica LIV — rotina operacional

> **Governança:** este arquivo descreve a operação técnica do atendimento. O norte estratégico de aquisição e conversão fica em `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`.

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

> **Correção publicada — 16/08/2026:** o `Retomadas.gs` foi sincronizado com o commit `3152ee9` após autorização explícita para incluir também as mudanças anteriores dos commits `7e37eb3`, `ddf0b30` e `6480a3a`. Os links de `Não retomar mais` e de aprovação da Bruna agora usam exclusivamente o deployment canônico registrado em `production-target.json`; uma URL divergente devolvida pelo ambiente ou mantida em Script Properties não pode mais substituir esse alvo. O cancelamento preserva token HMAC e confirmação em duas etapas, marca somente `Nunca retomar` e cancela apenas planos pendentes do telefone selecionado. Apps Script versão **93**, no mesmo deployment público. Validação: **691/691 testes aprovados** e pós-voo HTTP 200 com telefone sintético e token inválido, retornando `Link inválido` e confirmando que nenhuma preferência foi alterada. Rollback: versão 92 no mesmo deployment.

> **Correção publicada — 14/08/2026:** os registros de produção mostraram que uma pergunta válida sobre acesso e valor da consulta ficou sem resposta porque `append_lead` no Apps Script ultrapassou o timeout de 8 segundos. A planilha concluiu a gravação depois, mas o webhook já havia falhado de forma fechada; a recuperação repetiu o mesmo caminho lento. O deploy `6a7f2efadac1ed0008dffffa` reserva até 20 segundos apenas para `append_lead` (limite configurável entre 8 e 25 segundos), desconta do debounce o tempo já gasto no roteamento, classifica “como passar em consulta e o valor” como informação de consulta — não preço cirúrgico — e prioriza o nome informado pela própria pessoa sobre um nome de perfil incompatível.

> **Correção publicada — 15/08/2026:** uma nova abertura de anúncio Meta sobre lifting foi registrada, roteada e classificada, mas ficou sem resposta, handoff ou alerta. A análise confirmou que não havia bloqueio noturno, preferência de silêncio, tomada humana ou exclusão comercial. O defeito estava no ciclo técnico: uma repetição exata podia ser silenciada porque a entrada já existia na planilha, mesmo sem prova de conclusão da resposta, e o sucesso de uma tarefa deferida não encerrava imediatamente a recuperação durável. A correção só silencia a repetição quando o ciclo durável comprova conclusão, deixa falhas pendentes para nova tentativa e fecha a fila assim que o trabalho deferido termina. Aberturas determinísticas de anúncio passam a ser enviadas antes da confirmação HTTP do webhook; se o armazenamento durável falhar, qualquer resposta ativa também permanece dentro da execução principal. O envio continua idempotente pelo ID do evento. Validação local: **570/570 testes aprovados**. Código publicado no commit `c7695cf`, deploy Netlify `6a8052125175820008998f77`; o endpoint público respondeu HTTP 200 com automação `active` e proteções configuradas.

- Endpoint: `https://draamandaschroeder.com.br/api/ycloud/webhook`
- Automação: `active`
- Secretária virtual: Bruna
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

## O que a Bruna pode responder automaticamente

- Procura inicial por cirurgia plástica ou procedimento conhecido.
- Continuação curta e coerente da conversa.
- Dúvidas gerais seguras sobre avaliação e procedimentos.
- Perguntas informativas como “como funciona a consulta?” ou “como funciona a avaliação?”, sem confundi-las com pedido de agenda.
- Valor da consulta da Dra. Amanda: R$ 500, abatido se a cirurgia for realizada com a equipe.
- A primeira pergunta sobre preço cirúrgico recebe uma resposta institucional curta, sem faixa: o valor é individual e só é definido após avaliação e planejamento; técnica, complexidade, necessidades da pessoa, equipe, hospital, anestesia, materiais e acompanhamento podem compor e alterar o total. O orçamento final discrimina os itens aplicáveis, sem apresentar honorário isolado como preço total. Para lifting/minilifting, a resposta inclui uma vez o guia específico de composição. Somente se a pessoa insistir ou repetir explicitamente o pedido por média/faixa, a Bruna pode enviar as faixas aprovadas com a ressalva de que são estimativas gerais informativas, não orçamento, proposta ou garantia; a mensagem deve dizer que o valor final pode ficar fora da faixa, explicar os fatores de variação e incluir o URL completo do guia específico, ainda que ele já tenha aparecido. A faixa completa não é enviada automaticamente duas vezes no mesmo contexto. Os demais procedimentos seguem para revisão humana.
- Apresentação correta da Dra. Amanda: residência médica em Cirurgia Plástica pela Unicamp, pós-graduação em Cosmiatria e Procedimentos pelo Einstein, CRM-SP 191605, RQE 110472 e atuação com foco em cirurgias da face.
- Esclarecimento sutil de barreiras como segurança, experiência, resultado artificial, preço, localização e pressão para decidir.
- Oferta cuidadosa da página do procedimento, seção de resultados ou artigo específico sobre recuperação, segurança, cicatriz e comparações — ou da página geral quando o procedimento ainda não estiver definido — para quem não veio do site.

A abordagem deve ser acolhedora, breve e progressiva: apresentação, estágio da pesquisa, dúvida ou objetivo principal e convite para avaliação. A Bruna não abre perguntando “o que incomoda”; depois de criar contexto, pode perguntar “o que você gostaria de entender ou melhorar?”.

Google, Meta e WhatsApp direto seguem a mesma estratégia. A mensagem e o histórico prevalecem sobre a origem. No Meta, a abertura pode reconhecer o anúncio; no Google, o procedimento ou a página pesquisada. O bot nunca presume que alguém está pronto para agendar apenas porque veio do Google.

O site não deve ser enviado na primeira resposta por rotina. A exceção é a primeira resposta institucional sobre preço cirúrgico, que pode trazer o guia específico de composição dos custos. A única mensagem que efetivamente divulga a faixa de lifting também deve repetir o URL completo desse guia. Nos demais temas, o site entra depois da primeira resposta significativa ou quando a pessoa pedir material, fotos, casos ou antes e depois. O endereço deve aparecer por extenso no WhatsApp. O sistema envia apenas um material proativamente; um segundo link diferente exige pedido explícito. Não enviar junto de urgência ou pedido de agenda.

Mensagens consecutivas da mesma pessoa usam uma janela de silêncio de oito segundos. Depois de elaborar a resposta, o sistema confere novamente qual foi a mensagem mais recente. Se outra mensagem tiver chegado durante a elaboração, a resposta anterior é cancelada e somente a intenção mais nova pode responder usando as últimas 16 interações, com identificação de paciente, Bruna e equipe humana. Uma pergunta explícita, como preço, localização ou consulta, sempre prevalece sobre o roteiro do anúncio.

Imediatamente antes do envio, a resposta planejada é confrontada com a mensagem atual e com a última fala da clínica. Se a paciente estiver apenas respondendo ou confirmando uma pergunta da equipe humana, a Bruna não entra. Se estiver respondendo de forma curta a uma pergunta da própria Bruna, a resposta deve continuar daquele ponto e não pode reiniciar com perguntas genéricas como `Como posso ajudar?`. Uma nova pergunta autônoma da paciente continua seguindo a rota normal.

## Quando não responder automaticamente

- Segunda pergunta por média de cirurgia que não seja lifting/minilifting, ou pedido de quantidade de parcelas, desconto, juros e composição exata do orçamento.
- Preferência de data, dia, período ou horário para agendamento.
- Situação potencialmente urgente.
- Cardiologia ou procura pelo Dr. Daniel.
- Dúvida fora do padrão ou que exija decisão humana.
- Atendimento humano assumido e ainda dentro da janela protegida de 20 minutos.

Nesses casos, o sistema envia um alerta ao WhatsApp pessoal da Amanda quando aplicável. Em agendamento, a Bruna primeiro pergunta quais dias e se manhã ou tarde funcionam melhor. O alerta só é criado depois que a preferência existe e contém até três opções da aba `Datas Consulta`. A primeira pergunta sobre preço é respondida diretamente sem faixa. Se houver insistência explícita por média/faixa de lifting/minilifting, a paciente pode receber uma única vez R$ 18 mil a R$ 25 mil e R$ 26 mil a R$ 42 mil como estimativas gerais informativas, não orçamento, proposta ou garantia. A mesma mensagem diz explicitamente que o valor final é definido após avaliação e planejamento e pode ficar fora dessa faixa; explica que técnica, complexidade, necessidades individuais, equipe, hospital, anestesia, materiais e acompanhamento alteram o total; não apresenta honorários isolados; e inclui https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/. Nova repetição da faixa no mesmo contexto vai para revisão humana. Para outro procedimento, a paciente recebe apenas uma confirmação curta e a equipe recebe uma sugestão em faixa baseada na tabela de referência quando houver correspondência confiável. A faixa interna usa 10% abaixo da referência à vista e 10% acima da referência parcelada, arredondada em milhares. Amanda revisa e envia manualmente se estiver de acordo.

## Informações comerciais e localização

- Consulta presencial com a Dra. Amanda: R$ 500.
- O valor da consulta é abatido se a cirurgia for realizada com a equipe.
- Existem opções de parcelamento, mas quantidade de parcelas, juros, meios, desconto à vista, parcelamento antecipado, cancelamento e reembolso não devem ser informados até serem aprovados e incluídos nas regras.
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

- dúvidas simples e respostas de alta confiança podem ser retomadas pela Bruna em qualquer horário, pois são continuação de uma conversa ativa;
- uma nova mensagem humana cancela a retomada, inclusive durante a elaboração da resposta;
- agradecimentos e encerramentos simples não provocam nova mensagem;
- a resposta inicial de preço e a única resposta com faixa após insistência explícita sobre lifting/minilifting podem ser enviadas em conversa ativa a qualquer horário; média de outras cirurgias, condições exatas de pagamento, agenda e confirmação continuam dependendo da equipe e, à noite ou de madrugada, recebem uma única mensagem curta informando que haverá retorno pela manhã;
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

Quando a paciente escolhe uma das duas datas sugeridas, a seleção entra na aba interna `_AGENDAMENTOS_PENDENTES`. Isso não confirma a consulta e não cria evento. A equipe recebe a resposta sugerida e somente a confirmação humana finaliza o registro em `Consultas` e na Google Agenda.

### Comprovante estruturado de agendamento

Uma mensagem humana com o cabeçalho `Comprovante de Agendamento` passa a valer como confirmação explícita somente quando trouxer, na própria mensagem, os quatro campos obrigatórios: `Nome`, `Data`, `Horário` e `Médico`. O médico deve ser identificado inequivocamente como Dra. Amanda Schroeder ou Dr. Daniel Added; a data precisa ser válida, não pode estar no passado e, quando o dia da semana for informado, ele deve coincidir com a data.

Quando esses critérios forem atendidos, o sistema usa o nome escrito no comprovante, registra ou atualiza a consulta pelo fluxo canônico, projeta o agendamento na planilha e sincroniza a Google Agenda. O identificador da mensagem, a oportunidade, o telefone, a data, o horário e o profissional preservam a deduplicação: o mesmo comprovante processado novamente não deve criar uma segunda consulta nem um segundo evento.

`Endereço`, `Retorno`, `Valor da consulta` e `Formas de pagamento` são informativos e não participam da decisão automática. Esses dados financeiros não são copiados para a Google Agenda. Comprovante incompleto, data impossível, divergência de dia da semana ou profissional não suportado não altera planilha nem agenda e deve seguir para conferência humana.

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

Essa restrição vale para retomadas iniciadas pela clínica depois de silêncio. Quando a própria paciente inicia ou mantém uma conversa à noite, a Bruna pode continuar respondendo até o encerramento natural, respeitando os limites de preço, agenda, confirmação e segurança descritos acima.

As mensagens sugeridas devem parecer continuação de uma conversa: reconhecer a dúvida, retirar pressão por decisão e permitir que a pessoa responda no próprio ritmo. A primeira retomada continua a objeção específica registrada. A segunda e última acrescenta uma única prova pertinente, como material específico, explicação da consulta, credencial verificável ou composição de custos, sem repetir link já usado. Depois disso, os contatos proativos são encerrados. Sofrimento intenso relacionado à aparência e pedidos explícitos de interrupção excluem automaticamente o contato da lista.

### Quando assumir uma conversa

Responder pelo WhatsApp Business da clínica. O eco registra automaticamente uma nova tomada humana, cancela qualquer resposta pendente da Bruna e inicia a janela protegida.

## Pausa de emergência

Se houver comportamento inesperado, alterar no Netlify:

`WHATSAPP_AUTOMATION_MODE=shadow`

Nesse modo, a IA continua sendo avaliada nos registros, mas não envia respostas aos pacientes. Para desligar também a avaliação, usar:

`WHATSAPP_AUTOMATION_MODE=off`

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
