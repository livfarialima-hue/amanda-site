# Auditoria das conversas do WhatsApp e da planilha LEADS

Data da leitura: 11/09/2026

Escopo: 23 conversas enviadas em 11/09/2026, cruzadas por `Opportunity ID` com CRM, `Funil Comercial`, `Consultas`, marcos, compromissos, retomadas e Google Calendar.

Privacidade: os contatos foram substituídos por C01–C23; este relatório não contém nome de paciente, telefone, CPF, e-mail nem transcrição integral.

## Resumo executivo

- As 23 conversas têm oportunidade canônica, mas a projeção operacional ainda não é confiável para decidir campanha somente pelo funil visível.
- Entre oito casos com agenda, consulta ou fechamento relevantes, três não têm linha em `Consultas` (C02, C04 e C08).
- C04 e C08 têm horário correspondente no Calendar, mas não em `Consultas`; C01 está em `Consultas`, porém sem vínculo com evento no Calendar.
- C15 pediu remarcação, mas continuou como `Consulta agendada` e com o horário antigo ocupado.
- C06 e C12 tiveram `Data realizada` preenchida pela data em que o classificador rodou ou reencontrou o marco, e não pela data real comprovada na conversa.
- O mesmo `quote_sent` foi registrado repetidamente: seis vezes em C06 e treze vezes em C12. O problema é o uso da última mensagem processada como identidade do marco antigo.
- Datas de agendamento, consulta realizada e fechamento estão em branco no `Funil Comercial` mesmo quando há evidência estruturada. Hoje esses campos são preservados como manuais e não recebem backfill seguro.
- Promessas futuras e ações operacionais aparecem no resumo textual, mas quase nunca viram compromisso ou retomada durável. Assim, a descrição está correta em vários casos, mas a ação pode simplesmente não acontecer.

## Correções de dados a executar somente após aprovação

1. C01: confirmar o horário de 12/09 às 09:00 e vincular ou criar exatamente um evento na Sala 1; hoje a linha de `Consultas` não possui vínculo de Calendar.
2. C02: registrar `Reagendamento solicitado`, remover o horário anterior se ele ainda estiver reservado e manter a oportunidade em `Qualificado` até a nova escolha.
3. C03: vincular a linha de `Consultas` à oportunidade e preencher 10/09/2026 como data realizada.
4. C04: criar a linha de `Consultas` vinculada ao evento já existente de 13/10 às 09:00, sem criar um segundo evento.
5. C06: corrigir a data realizada para 27/08/2026 e preservar apenas um marco de orçamento por evidência real.
6. C08: transformar a pendência humana na linha canônica de `Consultas`, vinculando o evento já existente de 17/09 às 11:00; depois promover para `Consulta agendada`.
7. C12: corrigir a data realizada para 13/08/2026, registrar 03/09/2026 como fechamento e manter o valor em branco até confirmação humana; preservar um único orçamento e o aceite real.
8. C15: marcar o agendamento de 02/09 como `Reagendamento solicitado`, liberar o evento antigo e voltar a oportunidade para `Qualificado`.
9. Preencher no `Funil Comercial`, somente em células vazias, datas verificadas de qualificação, agendamento, consulta e fechamento. Valor contratado continua dependente de registro comercial explícito.

Nenhuma dessas correções foi aplicada ao vivo nesta tarefa.

## Plano das 23 conversas

| Caso | Situação verificada | Plano | Modo | Quando |
|---|---|---|---|---|
| C01 | Consulta de 12/09 confirmada; vínculo com Calendar ausente | Reconciliar agenda; depois usar apenas lembretes de consulta | Automático, após correção | Imediato |
| C02 | Pediu remarcação | Liberar horário anterior e oferecer novas opções | Humano | Imediato |
| C03 | Consulta realizada; documentos pendentes | Confirmar recebimento de documentos | Humano | 14/09 |
| C04 | Evento futuro existe; `Consultas` ausente | Vincular evento e concluir cadastro; depois lembretes | Humano + automático de consulta | Imediato |
| C05 | Disse que avaliaria e retornaria | Respeitar pausa e fazer um único contato leve | Humano | 17/09 |
| C06 | Consulta e orçamento concluídos; obstáculo logístico pessoal | Retomar planejamento sem pressão | Humano | 21/09 |
| C07 | Resposta inicial genérica, sem pergunta concreta respondida | Uma recuperação contextual; não automatizar o histórico | Humano | 14/09 |
| C08 | Evento futuro existe; pendência não materializada | Reconciliar primeiro; depois lembretes regulares | Automático, após correção | Imediato |
| C09 | Contato inicial sem continuidade | Uma recuperação contextual; não automatizar o histórico | Humano | 14/09 |
| C10 | Pediu contato depois de chegar a São Paulo | Cumprir a data combinada | Humano | 21/09 |
| C11 | Pergunta direta de preço de otoplastia ficou sem resposta direta | Responder a faixa permitida uma vez e oferecer avaliação | Humano | Imediato |
| C12 | Procedimento aceito e data combinada; pendências operacionais | Alinhar exames, reserva e pagamento, sem retomada comercial genérica | Humano | Imediato |
| C13 | Duas tentativas planejadas e conversa já fria | Encerrar a cadência; aguardar nova iniciativa | Nenhum envio | Agora |
| C14 | Faixa de valor informada; sem resposta | Uma única retomada ligada à dúvida real | Humano | 14/09 |
| C15 | Horário antigo ainda tratado como ativo após pedido de remarcação | Corrigir agenda e oferecer nova data | Humano | Imediato |
| C16 | Pediu para retomar no fim do mês | Registrar compromisso e cumprir a data | Humano | 28–29/09 |
| C17 | Convite inicial sem resposta; retomada antiga foi bloqueada por falso positivo | Manter como item humano do backlog; a nova automação vale só para contatos posteriores à ativação | Humano | 14/09 |
| C18 | Pediu valores do procedimento e recebeu somente valor da consulta | Reconhecer a omissão e explicar o próximo passo | Humano | 14/09 |
| C19 | Convite inicial sem resposta; retomada antiga foi bloqueada por falso positivo | Manter como item humano do backlog; a nova automação vale só para contatos posteriores à ativação | Humano | 14/09 |
| C20 | Resposta “fazemos teleconsulta” ficou incompleta | Enviar explicação curta, valor e próximo passo | Humano | Imediato |
| C21 | Interesse inicial em valor, sem continuidade | Pedir permissão para detalhar a faixa; não repetir mensagem genérica | Humano | 15/09 |
| C22 | Faixa de valor já informada; sem resposta | Uma retomada leve sobre dúvida ou avaliação | Humano | 15/09 |
| C23 | Disse que voltaria para agendar | Aguardar alguns dias e fazer um único contato respeitoso | Humano | 15/09 |

### Regra automática proposta

Para novos casos posteriores à ativação, somente a primeira retomada de uma pergunta ou convite comercial simples, sem preço, agenda, contexto clínico, opt-out, takeover ou compromisso de data, pode ser automática. Casos antigos não entram retroativamente. Lembretes de consultas continuam em fluxo próprio e só são elegíveis quando `Consultas` e Calendar estão reconciliados.

## Mensagens humanas sugeridas

Os campos entre colchetes devem ser completados pela equipe. As mensagens são propostas; não foram instaladas na Bruna nem enviadas.

### C02 e C15 — remarcação

> Oi, [nome]. Sem problema 😊 Posso te ajudar a remarcar. Para você costuma ser melhor de manhã ou à tarde? A partir disso eu vejo as próximas opções com a Dra. Amanda.

### C03 — documentos após consulta

> Oi, [nome]! Passando só para confirmar se você conseguiu enviar a carteirinha e os exames por e-mail. Se precisar, te passo o endereço certinho por aqui.

### C04 — cadastro do horário já reservado

> Oi, [nome]! O horário de 13/10 às 9h está reservado. Ficou faltando apenas concluir um dado cadastral; posso te orientar por aqui ou você pode informar na clínica.

### C05 — decisão sem pressão

> Oi, [nome]! Passando com calma para saber se ficou alguma dúvida sobre a avaliação ou sobre as possibilidades que conversamos. Se eu puder esclarecer algo, estou por aqui.

### C06 — planejamento após obstáculo logístico

> Oi, [nome]! Espero que esteja tudo bem por aí. Quando você estiver mais tranquila com a questão dos documentos, posso te ajudar a retomar os próximos passos do planejamento, sem pressa.

### C07 — interesse em cervical

> Oi, [nome]! Vi que você chegou até nós buscando informações sobre o pescoço. Para eu te orientar melhor, você prefere entender primeiro como funciona a avaliação ou ter uma noção de valores?

### C09 — interesse em lifting facial

> Oi, [nome]! Vi que você procurou informações sobre lifting facial. O que seria mais útil para você agora: entender como funciona a avaliação ou tirar uma dúvida específica sobre o procedimento?

### C10 — após chegada a São Paulo

> Oi, [nome]! Bem-vinda a São Paulo 😊 Como você comentou que decidiria depois da chegada, estou passando para ver se quer que eu confira opções de avaliação para os próximos dias.

### C11 — preço de otoplastia

> Oi, [nome]! Vi que sua pergunta sobre o valor da otoplastia ficou sem uma resposta direta. Em geral, a cirurgia costuma ficar entre R$ 8 mil e R$ 14 mil, mas o valor exato depende da avaliação e do planejamento. Se fizer sentido, posso verificar opções de consulta com a Dra. Amanda.

### C12 — planejamento do procedimento

> Oi, [nome]! Para mantermos o planejamento de 3 de dezembro organizado, queria alinhar com você os próximos passos de exames e reserva hospitalar. Posso te enviar a sequência certinha e o que ainda falta?

### C14 — após faixa de valor

> Oi, [nome]! Passando só para saber se ficou alguma dúvida sobre a lipo de papada ou sobre como funciona a avaliação. Se quiser, posso te ajudar a entender qual seria o próximo passo.

### C16 — data pedida pela paciente

> Oi, [nome]! Você comentou que ficaria melhor retomar no fim do mês, então passei por aqui. Quer que eu confira as opções de avaliação para outubro?

### C17 e C19 — recuperação humana do backlog

> Oi, [nome]! Vi que nossa conversa ficou no começo e não quero deixar sua dúvida sem resposta. Se ainda fizer sentido, me conta o que seria mais útil agora: entender a avaliação, valores ou opções de horário?

### C18 — pergunta de cirurgia não respondida

> Oi, [nome]! Percebi que você queria entender também os valores do procedimento, e eu acabei falando só da consulta. Como o valor da cirurgia depende do planejamento individual, a avaliação é o passo para chegar a uma estimativa segura. Se quiser, posso te ajudar a ver horários, sem compromisso.

### C20 — teleconsulta

> Oi, [nome]! Sim, a Dra. Amanda também faz teleconsulta. Ela custa R$ 500 e permite conversar sobre o que você busca e os próximos passos; se o exame presencial for indispensável, a equipe orienta. Se essa opção facilitar, posso verificar horários.

### C21 — antes de repetir uma faixa de cervical

> Oi, [nome]! Vi que você queria ter uma noção mais concreta de valores. Posso te explicar a faixa usual e o que faz ela variar ou, se preferir, te conto primeiro como funciona a avaliação.

### C22 — depois da faixa de cervical

> Oi, [nome]! Ficou alguma dúvida sobre a faixa de valores ou sobre como a Dra. Amanda avalia o pescoço? Se quiser, posso te orientar sobre o próximo passo sem compromisso.

### C23 — promessa de retorno

> Oi, [nome]! Passando só para deixar meu contato à mão, como você comentou que voltaria para agendar. Quando for conveniente, posso conferir os horários para você.

## Mudanças sugeridas para a abordagem da Bruna

Estas alterações são apenas propostas e não foram implementadas.

1. Responder a pergunta concreta na primeira frase; contexto vem depois. C11 e C18 mostram perda de confiança quando a paciente pergunta preço e recebe outra informação.
2. Usar uma única pergunta por mensagem. Perguntas múltiplas parecem roteiro e aumentam a chance de silêncio.
3. Não repetir apresentação, nome da clínica nem “como posso ajudar?” em continuação. Retomar a última fala da paciente diretamente.
4. Fazer mensagens de duas a quatro frases, com uma ideia central e um único próximo passo.
5. Trocar retomada genérica por referência à barreira real: preço, data, viagem, documentos, teleconsulta ou decisão.
6. Quando houver uma data prometida pela paciente, ficar em silêncio até essa data e transformar a promessa em compromisso durável.
7. Em agenda, refletir a preferência informada e oferecer poucas opções; só dizer “agendado” depois da gravação em `Consultas` e Calendar.
8. Em preço, seguir o contrato específico de cada procedimento e reconhecer explicitamente quando uma pergunta ficou sem resposta.
9. Usar link somente quando ele resolve o pedido atual; não enviar material antes de responder nem repetir link já enviado.
10. Após takeover humano, a Bruna não deve reabrir o roteiro nem voltar a perguntar dados que já estão no histórico.

## Mudanças técnicas preparadas localmente

- Marco administrativo ancorado no turno exato da conversa, com data e identificador de evidência validados pelo servidor.
- Novo resultado `reschedule_requested`, separado de falta e cancelamento definitivo.
- Promoção para consulta agendada, realizada ou paciente convertido bloqueada quando o registro canônico correspondente não existe.
- Pedido de remarcação pode fazer apenas a transição controlada de `Consulta agendada` para `Qualificado` e liberar o evento antigo.
- Consulta realizada passa a usar a data estruturada do agendamento vinculado, depois de o comparecimento estar ancorado em uma mensagem real; sem essa data, usa a data da evidência. Fechamentos usam a data da evidência, nunca a hora em que o classificador foi executado.
- Identidade de marco de procedimento passa a usar a mensagem que o provou, eliminando a repetição causada por mensagens posteriores.
- O `Funil Comercial` passa a preencher células vazias com marcos verificados, sem sobrescrever decisões manuais.
- `Data agendamento` usa o momento em que o agendamento foi registrado ou confirmado, e não a data futura em que a consulta acontecerá; marcos de baixa confiança ainda pendentes de revisão não entram no backfill.
- Comprovantes estruturados com dia da semana por extenso passam a ser rejeitados quando a data e o dia divergem.

As mudanças estão somente em branch local isolada. Não houve publicação de Apps Script ou Netlify, alteração de planilha, remoção/criação de evento, envio de WhatsApp nem mudança da política da Bruna.
