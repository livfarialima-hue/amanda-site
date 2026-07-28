# WhatsApp Clínica LIV — rotina operacional

## Estado de produção

- Endpoint: `https://draamandaschroeder.com.br/api/ycloud/webhook`
- Automação: `active`
- Secretária virtual: Bruna
- Template de alerta: `alerta_revisao_liv_v1`
- Destino dos alertas: WhatsApp pessoal do Daniel
- Agenda: revisão humana obrigatória antes de oferecer horários
- Resumo de retomadas: e-mail diário para `daniel.added@gmail.com`

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
- Valor da consulta da Dra. Amanda: R$ 500, abatido se a cirurgia for realizada com a equipe.
- Faixa cirúrgica somente quando houver um valor atual expressamente aprovado nas regras.
- Apresentação correta da Dra. Amanda: residência médica em Cirurgia Plástica pela Unicamp, pós-graduação em Cosmiatria pelo Einstein, CRM-SP 191605, RQE 110472 e atuação com foco em cirurgias da face.
- Esclarecimento sutil de barreiras como segurança, experiência, resultado artificial, preço, localização e pressão para decidir.
- Oferta cuidadosa da página do procedimento, seção de resultados ou artigo específico sobre recuperação, segurança, cicatriz e comparações — ou da página geral quando o procedimento ainda não estiver definido — para quem não veio do site.

A abordagem deve ser acolhedora, breve e progressiva: apresentação, estágio da pesquisa, dúvida ou objetivo principal e convite para avaliação. A Bruna não abre perguntando “o que incomoda”; depois de criar contexto, pode perguntar “o que você gostaria de entender ou melhorar?”.

Google, Meta e WhatsApp direto seguem a mesma estratégia. A mensagem e o histórico prevalecem sobre a origem. No Meta, a abertura pode reconhecer o anúncio; no Google, o procedimento ou a página pesquisada. O bot nunca presume que alguém está pronto para agendar apenas porque veio do Google.

O site não deve ser enviado na primeira resposta por rotina. Ele entra depois da primeira resposta significativa ou quando a pessoa pedir material, fotos, casos ou antes e depois. O endereço deve aparecer por extenso no WhatsApp. O sistema envia apenas um material proativamente; um segundo link diferente exige pedido explícito. Não enviar junto de preço, urgência ou pedido de agenda, nem repetir uma página já enviada.

Mensagens consecutivas da mesma pessoa usam uma janela de silêncio de oito segundos. Depois de elaborar a resposta, o sistema confere novamente qual foi a mensagem mais recente. Se outra mensagem tiver chegado durante a elaboração, a resposta anterior é cancelada e somente a intenção mais nova pode responder usando o histórico completo. Uma pergunta explícita, como preço, localização ou consulta, sempre prevalece sobre o roteiro do anúncio.

## Quando não responder automaticamente

- Pedido de preço cirúrgico sem faixa atual aprovada.
- Preferência de data, dia, período ou horário para agendamento.
- Situação potencialmente urgente.
- Cardiologia ou procura pelo Dr. Daniel.
- Dúvida fora do padrão ou que exija decisão humana.
- Atendimento humano assumido no mesmo dia.

Nesses casos, o sistema envia um alerta ao WhatsApp pessoal do Daniel quando aplicável. Em agendamento, o alerta contém até três opções da aba `Datas Consulta`; nenhuma opção é enviada à paciente sem aprovação.

## Informações comerciais e localização

- Consulta presencial com a Dra. Amanda: R$ 500.
- O valor da consulta é abatido se a cirurgia for realizada com a equipe.
- Existem opções de parcelamento, mas quantidade de parcelas, juros, meios, desconto à vista, parcelamento antecipado, cancelamento e reembolso não devem ser informados até serem aprovados e incluídos nas regras.
- A planilha de preços do Dr. João de 2025 é referência histórica e não deve ser usada pelo bot como tabela atual da Dra. Amanda.
- Nome correto: Clínica LIV Faria Lima.
- Localização correta: Rua Pais Leme, 215, Pinheiros, próxima à Av. Faria Lima, São Paulo. Não dizer que a clínica fica na própria Avenida Faria Lima.

## Quando ignorar

- Venda de produtos ou serviços.
- Proposta comercial ou parceria sem interesse assistencial.
- Convite pessoal, conversa imprópria ou assunto alheio à clínica.
- Mensagem claramente impertinente depois de esclarecido o contexto.

Esses contatos devem consumir o mínimo possível e não receber resposta automática.

## Atendimento humano

Quando uma mensagem é enviada pelo WhatsApp Business da clínica para a pessoa, o sistema registra atendimento humano. As mensagens seguintes daquela pessoa, no mesmo dia, não recebem resposta do bot.

## Retomada após sete dias

Na primeira mensagem após mais de sete dias, a Bruna informa que está direcionando o atendimento para a equipe. Depois disso, permanece em silêncio até uma resposta humana.

## Planilhas

- Leads da Dra. Amanda: uma linha visível por telefone, atualizada conforme a conversa evolui.
- Leads do Dr. Daniel: aba separada, sem contaminar as métricas da Dra. Amanda.
- Agenda semanal: aba `Datas Consulta`.
- Histórico e controles técnicos: abas internas iniciadas por `_WHATSAPP_`.

## Rotinas

### Toda semana

1. Atualizar somente os horários válidos na aba `Datas Consulta`.
2. Marcar dias indisponíveis como bloqueados.
3. Conferir se a profissional e as datas estão corretas.

### Todos os dias

1. Conferir o e-mail de retomadas manuais enviado por volta das 8h.
2. Revisar o histórico antes de usar cada mensagem sugerida.
3. Não retomar quem respondeu por outro canal, pediu interrupção ou não faz mais sentido comercial.
4. Acompanhar alertas de preço, agenda, cardiologia e situações fora do padrão.

### Quando assumir uma conversa

Responder pelo WhatsApp Business da clínica. O eco da mensagem registra automaticamente a tomada humana e bloqueia o bot naquele dia.

## Pausa de emergência

Se houver comportamento inesperado, alterar no Netlify:

`WHATSAPP_AUTOMATION_MODE=shadow`

Nesse modo, a IA continua sendo avaliada nos registros, mas não envia respostas aos pacientes. Para desligar também a avaliação, usar:

`WHATSAPP_AUTOMATION_MODE=off`
