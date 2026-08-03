# WhatsApp Clínica LIV — rotina operacional

## Estado de produção

- Endpoint: `https://draamandaschroeder.com.br/api/ycloud/webhook`
- Automação: `active`
- Secretária virtual: Bruna
- Template de alerta: `alerta_revisao_liv_v1`
- Destino dos alertas: WhatsApp pessoal da Amanda (`+55 19 99694-4518`)
- Agenda: revisão humana obrigatória antes de oferecer horários
- Resumo de retomadas: e-mail diário para `amandaschh@hotmail.com` e `daniel.added@gmail.com`

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
- Nenhum valor cirúrgico é enviado automaticamente; pedidos de preço recebem uma confirmação curta de que os valores serão conferidos e seguem para revisão humana.
- Apresentação correta da Dra. Amanda: residência médica em Cirurgia Plástica pela Unicamp, pós-graduação em Cosmiatria e Procedimentos pelo Einstein, CRM-SP 191605, RQE 110472 e atuação com foco em cirurgias da face.
- Esclarecimento sutil de barreiras como segurança, experiência, resultado artificial, preço, localização e pressão para decidir.
- Oferta cuidadosa da página do procedimento, seção de resultados ou artigo específico sobre recuperação, segurança, cicatriz e comparações — ou da página geral quando o procedimento ainda não estiver definido — para quem não veio do site.

A abordagem deve ser acolhedora, breve e progressiva: apresentação, estágio da pesquisa, dúvida ou objetivo principal e convite para avaliação. A Bruna não abre perguntando “o que incomoda”; depois de criar contexto, pode perguntar “o que você gostaria de entender ou melhorar?”.

Google, Meta e WhatsApp direto seguem a mesma estratégia. A mensagem e o histórico prevalecem sobre a origem. No Meta, a abertura pode reconhecer o anúncio; no Google, o procedimento ou a página pesquisada. O bot nunca presume que alguém está pronto para agendar apenas porque veio do Google.

O site não deve ser enviado na primeira resposta por rotina. Ele entra depois da primeira resposta significativa ou quando a pessoa pedir material, fotos, casos ou antes e depois. O endereço deve aparecer por extenso no WhatsApp. O sistema envia apenas um material proativamente; um segundo link diferente exige pedido explícito. Não enviar junto de urgência ou pedido de agenda, nem repetir uma página já enviada. A resposta humana revisada sobre preço pode incluir o guia específico de custos, pois ele ajuda a explicar o orçamento total sem substituir a avaliação individual.

Mensagens consecutivas da mesma pessoa usam uma janela de silêncio de oito segundos. Depois de elaborar a resposta, o sistema confere novamente qual foi a mensagem mais recente. Se outra mensagem tiver chegado durante a elaboração, a resposta anterior é cancelada e somente a intenção mais nova pode responder usando o histórico completo. Uma pergunta explícita, como preço, localização ou consulta, sempre prevalece sobre o roteiro do anúncio.

## Quando não responder automaticamente

- Pedido de preço cirúrgico sem faixa atual aprovada.
- Preferência de data, dia, período ou horário para agendamento.
- Situação potencialmente urgente.
- Cardiologia ou procura pelo Dr. Daniel.
- Dúvida fora do padrão ou que exija decisão humana.
- Atendimento humano assumido e ainda dentro da janela protegida de 20 minutos.

Nesses casos, o sistema envia um alerta ao WhatsApp pessoal da Amanda quando aplicável. Em agendamento, o alerta contém até três opções da aba `Datas Consulta`. Em preço cirúrgico, a paciente recebe automaticamente apenas uma confirmação curta, sem valor, informando que a faixa atual será conferida. O alerta interno contém a pergunta e uma sugestão comercial completa em faixa baseada na tabela de referência quando houver correspondência confiável. A sugestão explica que o orçamento definitivo detalha equipe médica, anestesia, hospital, materiais e acompanhamento, informa consulta e pagamento já aprovados, oferece o guia de custos e termina com convite para avaliação. A faixa usa 10% abaixo da referência à vista e 10% acima da referência parcelada, arredondada em milhares. O valor final continua dependendo de avaliação individual; Amanda revisa e envia manualmente a resposta completa se estiver de acordo.

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

Se a paciente responder e não houver nova mensagem humana em 20 minutos, uma rotina executada a cada cinco minutos reavalia a conversa:

- dúvidas simples e respostas de alta confiança podem ser retomadas pela Bruna em qualquer horário, pois são continuação de uma conversa ativa;
- uma nova mensagem humana cancela a retomada, inclusive durante a elaboração da resposta;
- agradecimentos e encerramentos simples não provocam nova mensagem;
- preço cirúrgico, condições de pagamento, agenda e confirmação de horário continuam dependendo da equipe; à noite ou de madrugada recebem uma única mensagem curta informando que haverá retorno pela manhã, sem revelar valor ou disponibilidade;
- sintomas, possível urgência, segurança, documentos, pré ou pós-operatório, cardiologia, sofrimento intenso e demais temas reservados seguem para revisão humana; situações potencialmente urgentes nunca recebem promessa de aguardar até a manhã;
- se o tema não for reservado, mas a Bruna não tiver confiança para responder, a mensagem de espera só é enviada quando há uma pergunta, pedido ou resposta a uma pergunta da clínica realmente pendente;
- se não houver solicitação concreta pendente, a paciente não recebe uma mensagem artificial de espera: Amanda recebe o alerta para revisar a conversa;
- depois de uma resposta segura da Bruna, a automação volta a conduzir normalmente a conversa;
- depois da mensagem de espera ou de um bloqueio sensível, somente uma nova mensagem humana libera a conversa;
- o horário não interrompe uma conversa que a própria paciente iniciou ou manteve.

Cada tomada humana admite no máximo uma retomada automática. Uma nova mensagem enviada pelo WhatsApp Business inicia uma nova tomada e reinicia as proteções.

## Retomada após sete dias

Na primeira mensagem após mais de sete dias, a Bruna informa que está direcionando o atendimento para a equipe. Depois disso, permanece em silêncio até uma resposta humana.

## Planilhas

- Leads da Dra. Amanda: uma linha visível por telefone, atualizada conforme a conversa evolui.
- Leads do Dr. Daniel: aba separada, sem contaminar as métricas da Dra. Amanda.
- Agenda semanal: aba `Datas Consulta`.
- Consultas agendadas e realizadas: aba `Consultas`, que também controla os lembretes operacionais.
- Histórico e controles técnicos: abas internas iniciadas por `_WHATSAPP_`.

### Preferências permanentes de contato

Na aba `Google Ads - Conversões`, as três colunas administrativas após o cadastro normal do lead são:

- `Nunca retomar`: impede retomadas comerciais, aniversários, pós-consulta, reativações e demais contatos proativos. A equipe e a Bruna ainda podem responder quando a própria pessoa iniciar uma conversa. Lembretes operacionais de consulta confirmada continuam permitidos.
- `Nunca responder com robô`: impede toda mensagem automática ao paciente, inclusive respostas a mensagens recebidas, lembretes e pós-consulta. A conversa é encaminhada para atendimento humano e os alertas internos continuam funcionando.
- `Motivo / observação do bloqueio`: campo administrativo para registrar o contexto. O conteúdo não é enviado ao paciente nem incluído nas instruções da IA.

As duas primeiras colunas usam caixas de seleção. Em caso de dúvida, marcar `Nunca responder com robô`, pois é a opção mais restritiva. A preferência é lida novamente imediatamente antes de qualquer envio automático; assim, uma marcação feita enquanto a resposta está sendo elaborada também cancela o disparo.

Ao alterar `Situação do lead` para `Consulta agendada`, a automação cria ou atualiza a linha correspondente em `Consultas`, usando ID e telefone para evitar duplicidade. Se data e horário ainda não estiverem disponíveis, a linha é criada sem inventá-los e fica pronta para complemento. Uma confirmação explícita no WhatsApp também pode preencher a aba quando a conversa contiver data e horário inequívocos; sem os dois elementos, o sistema não presume um agendamento.

Ao alterar o status para `Consulta realizada`, a consulta é atualizada e o pós-consulta entra em uma fila única. O contato é feito somente uma vez, aproximadamente duas horas depois da marcação e entre 09:00 e 19:00; se esse horário cair à noite, fica para a próxima manhã. Recusa de contato, cancelamento, ausência de telefone válido ou envio já registrado impedem novo disparo. Se houver interação humana posterior à consulta, o pós-consulta é suprimido e a razão fica registrada na própria linha.

O pós-consulta usa o modelo utilitário `pos_consulta_cuidado_liv_v1`:

> Olá! Aqui é a Bruna, da Clínica LIV. Passando para saber se ficou alguma dúvida depois da sua consulta com {{1}}. Se quiser conversar sobre alguma orientação ou próximo passo, pode responder por aqui. Estamos à disposição.

O modelo deve estar aprovado antes de configurar `WHATSAPP_POST_CONSULT_ENABLED=true`. Até lá, a fila permanece registrada e nenhuma mensagem é enviada.

## Lembretes de consulta

Uma consulta com status `Agendada`, `Confirmada`, `Consulta agendada` ou `Consulta confirmada` pode receber:

1. a confirmação normal no momento do agendamento, dentro da própria conversa;
2. um único lembrete automático às 10h do dia anterior.

Nenhum lembrete é enviado antes das 9h ou a partir das 19h, no fuso de São Paulo. Se qualquer uma das colunas históricas de lembrete já estiver preenchida, a consulta não recebe outra mensagem. Assim, pacientes que receberam um lembrete pelo fluxo anterior não recebem um segundo lembrete durante a migração.

Consultas canceladas, realizadas, vencidas, com pedido de reagendamento ou com recusa explícita de contato não recebem mensagens. Uma alteração de data ou horário reinicia apenas os controles daquele agendamento. As colunas `Confirmação da paciente`, `Última interação humana`, `Próxima ação` e `Motivo de supressão` deixam o contexto explícito; os controles de lembrete impedem duplicidade e permitem auditoria.

Os lembretes usam o modelo utilitário `lembrete_consulta_liv_v1`:

> Olá, {{1}}! Este é um lembrete da sua consulta com {{2}}, marcada para {{3}} às {{4}}, {{5}}. Se precisar ajustar o horário, responda por aqui.

O disparo automático permanece desligado até o modelo estar aprovado no WhatsApp/YCloud. Depois da aprovação, configurar `WHATSAPP_APPOINTMENT_REMINDERS_ENABLED=true` no Netlify e executar `ativarLembretesConsultas()` uma vez no Apps Script. O remetente é aprendido pelos eventos recebidos do número comercial; `WHATSAPP_SENDER_NUMBER` funciona como substituição explícita, se necessária.

## Rotinas

### Toda semana

1. Atualizar somente os horários válidos na aba `Datas Consulta`.
2. Marcar dias indisponíveis como bloqueados.
3. Conferir se a profissional e as datas estão corretas.

### Todos os dias

1. Conferir o e-mail informativo do plano de retomadas enviado por volta das 8h para Amanda e Daniel.
2. Revisar o histórico antes de usar cada mensagem sugerida.
3. Não retomar quem respondeu por outro canal, pediu interrupção ou não faz mais sentido comercial.
4. Acompanhar alertas de preço, agenda, cardiologia e situações fora do padrão.

O e-mail é apenas informativo e separa com clareza:

1. os envios automáticos realmente programados, com horário;
2. as ações humanas sugeridas, com horário e mensagem pronta;
3. os marcos dos próximos sete dias, identificados como automáticos ou manuais.

Primeiras retomadas seguras, sem preço ou agenda, aparecem como candidatas à Bruna, mas continuam sendo apenas planejamento enquanto não existir uma rotina específica e uma janela válida do WhatsApp. Preço, agenda, follow-ups tardios, aniversários, datas especiais e reativações de clientes antigos permanecem manuais.

### Cadência de relacionamento

1. Procura inicial: primeira retomada no dia seguinte; segunda entre o quarto e o quinto dia; encerramento entre o nono e o décimo dia. Cada contato deve acrescentar utilidade ou reduzir uma dúvida, nunca apenas perguntar se a pessoa viu a mensagem.
2. Pós-consulta: acolhimento inicial cerca de três horas após a consulta quando a automação estiver habilitada; checagem humana no terceiro dia; contato humano no décimo quarto dia apenas se ainda fizer sentido e não houver interação recente.
3. Aniversário: mensagem humana às 10h30, sem oferta comercial e sem mencionar procedimento.
4. Datas especiais e jornada cirúrgica: somente quando registradas na aba `Consultas`, sempre com revisão humana.
5. Cliente antigo: reativação manual às 16h30, conforme a periodicidade registrada ou o primeiro marco de seis meses. Depois disso, o próximo contato deve ser registrado explicitamente; não existe sequência automática contínua.

Se a paciente disser que entrará em contato, que chamará a clínica, que falará mais tarde ou usar formulação equivalente, nenhuma retomada deve ser planejada nas 24 horas seguintes à mensagem. A regra usa horas corridas, não apenas a mudança da data no calendário.

Retomadas comerciais só podem ser planejadas entre 09:00 e 19:00, no fuso de São Paulo. Se o volume do dia ultrapassar os horários disponíveis, os contatos excedentes ficam para o próximo planejamento; nunca são deslocados para a noite ou madrugada.

Essa restrição vale para retomadas iniciadas pela clínica depois de silêncio. Quando a própria paciente inicia ou mantém uma conversa à noite, a Bruna pode continuar respondendo até o encerramento natural, respeitando os limites de preço, agenda, confirmação e segurança descritos acima.

As mensagens sugeridas devem parecer continuação de uma conversa: reconhecer a dúvida, retirar pressão por decisão e permitir que a pessoa responda no próprio ritmo. A primeira retomada pode entregar um conteúdo pertinente do site; a segunda continua especificamente o tema de preço ou agenda quando esse foi o ponto pendente e, nos demais casos, deixa o canal aberto sem pressa; a terceira encerra novos contatos de forma respeitosa. Sofrimento intenso relacionado à aparência e pedidos explícitos de interrupção excluem automaticamente o contato da lista.

### Quando assumir uma conversa

Responder pelo WhatsApp Business da clínica. O eco registra automaticamente uma nova tomada humana, cancela qualquer resposta pendente da Bruna e inicia a janela protegida.

## Pausa de emergência

Se houver comportamento inesperado, alterar no Netlify:

`WHATSAPP_AUTOMATION_MODE=shadow`

Nesse modo, a IA continua sendo avaliada nos registros, mas não envia respostas aos pacientes. Para desligar também a avaliação, usar:

`WHATSAPP_AUTOMATION_MODE=off`
