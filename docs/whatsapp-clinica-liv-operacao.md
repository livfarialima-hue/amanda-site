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
- Primeira pergunta sobre preço, sem fornecer faixa cirúrgica.
- Apresentação da Dra. Amanda e esclarecimento sutil de barreiras como segurança, experiência, pagamento e planejamento individual.
- Oferta cuidadosa de uma página pertinente do site quando a pessoa não veio do site.

A abordagem deve ser acolhedora, breve e progressiva: apresentação, nome da pessoa, objetivo ou incômodo principal e convite para avaliação.

## Quando não responder automaticamente

- Insistência por preço ou pedido de faixa cirúrgica.
- Preferência de data, dia, período ou horário para agendamento.
- Situação potencialmente urgente.
- Cardiologia ou procura pelo Dr. Daniel.
- Dúvida fora do padrão ou que exija decisão humana.
- Atendimento humano assumido no mesmo dia.

Nesses casos, o sistema envia um alerta ao WhatsApp pessoal do Daniel quando aplicável. Em agendamento, o alerta contém até três opções da aba `Datas Consulta`; nenhuma opção é enviada à paciente sem aprovação.

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
