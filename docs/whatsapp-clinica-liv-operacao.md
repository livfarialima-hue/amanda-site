# WhatsApp Clínica LIV — rotina operacional

> **Governança:** este arquivo descreve a operação técnica do atendimento. O norte estratégico de aquisição e conversão fica em `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`.

> **Produção:** base do Apps Script atualizada em 14/08/2026 para a versão 77, commit local `b0da4b6`. A deduplicação reversível autorizada arquivou 3 linhas excedentes e ficou idempotente. O webhook do Netlify permanece no deploy `6a7e6de85173db0008162365`, commit `1ada277`. Fases, fórmulas, Calendar, site e mídia não foram alterados nesta etapa.

## Estado de produção

> **Correção local pendente de publicação — 14/08/2026:** os registros de produção mostraram que uma pergunta válida sobre acesso e valor da consulta ficou sem resposta porque `append_lead` no Apps Script ultrapassou o timeout de 8 segundos. A planilha concluiu a gravação depois, mas o webhook já havia falhado de forma fechada; a recuperação repetiu o mesmo caminho lento. A correção local reserva até 20 segundos apenas para `append_lead` (limite configurável entre 8 e 25 segundos), desconta do debounce o tempo já gasto no roteamento, classifica “como passar em consulta e o valor” como informação de consulta — não preço cirúrgico — e prioriza o nome informado pela própria pessoa sobre um nome de perfil incompatível. Esta correção ainda não está no deploy de produção e só será publicada após autorização explícita.

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
- A primeira pergunta sobre preço cirúrgico recebe uma resposta institucional curta, sem faixa: valores variam conforme avaliação e planejamento, a clínica trabalha com valores competitivos, oferece condição à vista e parcelamento antecipado, discrimina equipe, hospital, anestesia, materiais e acompanhamento e envia uma vez o guia de composição dos custos. Se a pessoa voltar a pedir média, lifting/minilifting pode receber automaticamente as faixas aprovadas; os demais procedimentos seguem para revisão humana com resposta em faixa sugerida.
- Apresentação correta da Dra. Amanda: residência médica em Cirurgia Plástica pela Unicamp, pós-graduação em Cosmiatria e Procedimentos pelo Einstein, CRM-SP 191605, RQE 110472 e atuação com foco em cirurgias da face.
- Esclarecimento sutil de barreiras como segurança, experiência, resultado artificial, preço, localização e pressão para decidir.
- Oferta cuidadosa da página do procedimento, seção de resultados ou artigo específico sobre recuperação, segurança, cicatriz e comparações — ou da página geral quando o procedimento ainda não estiver definido — para quem não veio do site.

A abordagem deve ser acolhedora, breve e progressiva: apresentação, estágio da pesquisa, dúvida ou objetivo principal e convite para avaliação. A Bruna não abre perguntando “o que incomoda”; depois de criar contexto, pode perguntar “o que você gostaria de entender ou melhorar?”.

Google, Meta e WhatsApp direto seguem a mesma estratégia. A mensagem e o histórico prevalecem sobre a origem. No Meta, a abertura pode reconhecer o anúncio; no Google, o procedimento ou a página pesquisada. O bot nunca presume que alguém está pronto para agendar apenas porque veio do Google.

O site não deve ser enviado na primeira resposta por rotina. A exceção é a primeira resposta institucional sobre preço cirúrgico, que pode trazer o guia específico de composição dos custos. Nos demais temas, o site entra depois da primeira resposta significativa ou quando a pessoa pedir material, fotos, casos ou antes e depois. O endereço deve aparecer por extenso no WhatsApp. O sistema envia apenas um material proativamente; um segundo link diferente exige pedido explícito. Não enviar junto de urgência ou pedido de agenda, nem repetir uma página já enviada.

Mensagens consecutivas da mesma pessoa usam uma janela de silêncio de oito segundos. Depois de elaborar a resposta, o sistema confere novamente qual foi a mensagem mais recente. Se outra mensagem tiver chegado durante a elaboração, a resposta anterior é cancelada e somente a intenção mais nova pode responder usando as últimas 16 interações, com identificação de paciente, Bruna e equipe humana. Uma pergunta explícita, como preço, localização ou consulta, sempre prevalece sobre o roteiro do anúncio.

Imediatamente antes do envio, a resposta planejada é confrontada com a mensagem atual e com a última fala da clínica. Se a paciente estiver apenas respondendo ou confirmando uma pergunta da equipe humana, a Bruna não entra. Se estiver respondendo de forma curta a uma pergunta da própria Bruna, a resposta deve continuar daquele ponto e não pode reiniciar com perguntas genéricas como `Como posso ajudar?`. Uma nova pergunta autônoma da paciente continua seguindo a rota normal.

## Quando não responder automaticamente

- Segunda pergunta por média de cirurgia que não seja lifting/minilifting, ou pedido de quantidade de parcelas, desconto, juros e composição exata do orçamento.
- Preferência de data, dia, período ou horário para agendamento.
- Situação potencialmente urgente.
- Cardiologia ou procura pelo Dr. Daniel.
- Dúvida fora do padrão ou que exija decisão humana.
- Atendimento humano assumido e ainda dentro da janela protegida de 20 minutos.

Nesses casos, o sistema envia um alerta ao WhatsApp pessoal da Amanda quando aplicável. Em agendamento, a Bruna primeiro pergunta quais dias e se manhã ou tarde funcionam melhor. O alerta só é criado depois que a preferência existe e contém até três opções da aba `Datas Consulta`. A primeira pergunta sobre preço é respondida diretamente sem faixa. Se houver nova pergunta por média de lifting/minilifting, a paciente recebe as faixas aprovadas: R$ 18 mil a R$ 25 mil e R$ 26 mil a R$ 42 mil. Para outro procedimento, a paciente recebe apenas uma confirmação curta e a equipe recebe uma sugestão em faixa baseada na tabela de referência quando houver correspondência confiável. A faixa interna usa 10% abaixo da referência à vista e 10% acima da referência parcelada, arredondada em milhares. Amanda revisa e envia manualmente se estiver de acordo.

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
- Convite pessoal, conversa imprópria ou assunto alheio à clínica.
- Mensagem claramente impertinente depois de esclarecido o contexto.

Esses contatos devem consumir o mínimo possível e não receber resposta automática.

## Atendimento humano

Quando uma mensagem é enviada pelo WhatsApp Business da clínica para a pessoa, o sistema registra atendimento humano e cancela qualquer retomada automática pendente.

Se a paciente responder depois de uma mensagem humana, uma rotina executada a cada cinco minutos reavalia a conversa. Assuntos administrativos e seguros podem voltar para a Bruna após cerca de 5 minutos; temas sensíveis preservam a janela de 20 minutos:

- dúvidas simples e respostas de alta confiança podem ser retomadas pela Bruna em qualquer horário, pois são continuação de uma conversa ativa;
- uma nova mensagem humana cancela a retomada, inclusive durante a elaboração da resposta;
- agradecimentos e encerramentos simples não provocam nova mensagem;
- a resposta inicial de preço e a segunda resposta de lifting/minilifting podem ser enviadas em conversa ativa a qualquer horário; média de outras cirurgias, condições exatas de pagamento, agenda e confirmação continuam dependendo da equipe e, à noite ou de madrugada, recebem uma única mensagem curta informando que haverá retorno pela manhã;
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

Quando a paciente escolhe uma das duas datas sugeridas, a seleção entra na aba interna `_AGENDAMENTOS_PENDENTES`. Isso não confirma a consulta e não cria evento. A equipe recebe a resposta sugerida e somente a confirmação humana finaliza o registro em `Consultas` e na Google Agenda.

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

1. Conferir o e-mail informativo do plano de retomadas enviado por volta das 8h para Amanda e Daniel; ele também mostra dúvidas ainda sem resposta e regras novas aguardando aprovação.
2. Revisar o histórico antes de usar cada mensagem sugerida e decidir as linhas abertas em `Revisões do Bot`.
3. Não retomar quem respondeu por outro canal, pediu interrupção ou não faz mais sentido comercial.
4. Acompanhar alertas de preço, agenda, cardiologia e situações fora do padrão.

O e-mail é apenas informativo e separa com clareza:

1. os envios automáticos realmente programados, com horário;
2. as ações humanas sugeridas, com horário e mensagem pronta;
3. os marcos dos próximos sete dias, identificados como automáticos ou manuais.

Primeiras retomadas seguras, sem agenda ou decisão humana, aparecem como candidatas à Bruna, mas continuam sendo apenas planejamento enquanto não existir uma rotina específica e uma janela válida do WhatsApp. A resposta inicial de preço e a faixa repetida de lifting seguem o fluxo automático aprovado; agenda, demais preços, follow-ups tardios, aniversários, datas especiais e reativações de clientes antigos permanecem manuais.

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
