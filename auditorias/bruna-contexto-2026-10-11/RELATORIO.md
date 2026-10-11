# Bruna: contexto atual e dúvidas que exigem a equipe

Estado: publicado e verificado em produção; projeções no Drive em reconciliação.

## Problemas e correções

- O guard de memória aprovada convertia um código KB ou UNKNOWN-CLARIFY em resposta automática mesmo quando a decisão semântica vetava o envio, pedia humano, agenda, cardiologia ou silêncio. Agora exige rota standard_reply, confiança alta e permissão explícita; urgência continua protegida. Um veto de conhecimento vai à revisão imediata existente, preservando o tema concreto. KB válido continua literal e limitado ao risco baixo.
- O modelo recebia templateId dos turnos anteriores, mas não o da mensagem atual. Agora recebe currentTemplateId. Referência de campanha isolada não transforma pergunta pessoal em prefill.
- O prompt recomendava CONTEXT-CONTINUE fora da elegibilidade que o próprio guard exige. Agora reserva esse código à continuação humana identificada; aceitações comuns usam o código factual pertinente ou uma resposta contextual, sem reabrir uma oferta já aceita.
- Removidas duas orientações antigas de pedir nova permissão para faixa de preço, em conflito com a política direta vigente. Nenhuma faixa, número, exceção, CTA ou permissão comercial foi ampliada.
- O prompt diferencia dúvida do paciente de dado que só Daniel/equipe pode confirmar, registra cada pendência no estado da conversa e impede que uma coincidência com KB apague outra pergunta. Responder antes de convidar, não insistir após recusa e não repetir informação continuam obrigatórios.

## Ciência e aplicação

Foram consultados a revisão Cochrane 2024 sobre auxílios à decisão e o estudo de Heritage et al. sobre preocupações não atendidas em consultas. As fontes e seus limites foram incorporados a `docs/REFERENCIAS-ABORDAGEM-BRUNA.md`. Aplicação operacional: cobrir a solicitação concreta, respeitar preferências, esclarecer só o necessário e facilitar a decisão informada. Não há demonstração de aumento de conversão da Bruna. O norte de aquisição e as regras clínicas/comerciais permanecem inalterados.

A documentação oficial do Sol 6.1 orienta contexto relevante e instruções coerentes: https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6.1-sol. Modelo, esforço médio e orçamento de inferência permanecem iguais ao pacote 2026-10-11.2; não há migração para plugin ou consumo da assinatura.

## Validação e limites

Antes da correção: 16 falhas novas reproduzidas, entre guard, transporte do contexto atual e webhook completo com alerta interno. Após a correção inicial: 138 testes focados/consumidores passaram. O gate de API paga foi ampliado de cinco para nove cenários sintéticos, incluindo pergunta com referência, aceite curto, correção de procedimento e conhecimento parcial com pendência específica. Seu próprio teste rejeita o caso que responde só sobre estacionamento e omite equipamento.

Transportes locais são simulados; não comprovam qualidade de inferência real. A execução real permanece restrita ao build hospedado de produção marcado e exige que os nove cenários passem antes da publicação. Não há envio de mensagem real, replay ou escrita em dados de paciente nesses testes. Suíte integral: 1.959/1.959. Adicionais contratuais: 49/49, total 2.008 distintos, incluindo 17 novas regressões. Cruzados: 165/165. Todos os 99 arquivos obrigatórios cobertos; change:check, architecture:check, build de 193 arquivos/54 URLs, site:check e diff sem erros. Inferência real e publicação aprovadas, conforme recibo abaixo.

## Efeitos e retorno

Risco máximo: silêncio indevido por encaminhamento excessivo ou resposta sem confirmação se o veto fosse perdido. O guard falha fechado, sem mexer nos mecanismos de entrega e deduplicação. UNKNOWN-REVIEW mantém alerta imediato verificável e só permite ciência contextual após o recibo; falha no alerta permanece recuperável. Não foi criada nova automação, fila, função ou agenda.

Baseline: c7fbe767a07e9a1320b5e26f00e0daa574b34128; produção funcional 6c6507983012a0cff63cf712f7b3709a0b4d5f99 / Netlify 6acbccab46983900087c5159. Rollback reverte o commit candidato e publica pelo Git o código equivalente a esse deploy, preservando Apps Script v161, filas e recibos, sem reenvio. Preflight em `PREFLIGHT.json`.

Daniel/equipe devem observar primeiras conversas naturais, 48 horas e sete dias após publicação: cobertura dos pedidos, repetição, correção de assunto, pendência com responsável, latência, consulta agendada e comparecimento. Conter ou reverter diante de fato inventado, veto ignorado, envio duplicado ou degradação persistente. Não se criou tarefa agendada.

## Publicação e verificação

Commit funcional 590121d96c02bbfbb5bb01c53b30ab83a6a658b8; build 6acbd59e31a918000966a0ad; Netlify 6acbd59e31a918000966a0af, publicado em 2026-10-11T18:31:21.722Z, verificado em 2026-10-11T18:32:35.869Z. Nove cenários reais aprovados, nove chamadas, 1,8–10,6 segundos, Sol 6.1 medium confirmado e nenhuma saída incompleta. O aceite curto respeitou a recusa de horários; a correção para otoplastia prevaleceu; o equipamento desconhecido virou pendência da equipe sem resposta inventada. São cenários sintéticos, não prova de desempenho em conversas naturais.

Saúde do backend 200 e POST sem assinatura 401 no domínio, na branch e na URL imutável. As 14 funções, modos de execução e cinco agendas coincidem com o baseline. Nenhum paciente recebeu mensagem de teste, nenhuma escrita em LEADS/CRM/Apps Script e nenhum replay. Recibo integral: `PUBLICACAO.json`.
