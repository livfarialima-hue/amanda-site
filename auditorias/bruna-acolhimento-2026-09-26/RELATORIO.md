# Bruna — acolhimento e continuidade, 26/09/2026

<!-- BRUNA-ACOLHIMENTO-2026-09-26 -->
**Pacote 2026-09-26.1 — PUBLICADO E VERIFICADO em 26/09/2026, 07:52 BRT.** Commit funcional dd2dcfe63efc0dec4a982133b1e28459aeb3a421, Netlify 6ab7a3b5dda1f60008f631fe, Apps Script v161 preservado. Validação: 1.718 testes integrais, 12 regressões do incidente, 225 entre consumidores e 28 comandos obrigatórios sem falhas. Domínio e URL imutável ativos, assinatura protegida e pedido sem assinatura rejeitado com 401; 13 funções, cinco programações e 192 arquivos conferidos. A primeira conversa natural após esta publicação ainda não foi observada. Daniel pediu uma conversa mais acolhedora e cuidadosa e autorizou a publicação após validação. A hipótese de modificar a recuperação foi cancelada antes de qualquer alteração; transporte, timeouts, fila, cadência e Apps Script v161 permanecem fora da mudança.

A primeira resposta mantém saudação e apresentação mesmo se a pessoa enviar prefill e uma saudação em mensagens separadas. Histórico de entradas não comprova resposta anterior da clínica. Continuação real não repete apresentação; na ausência de histórico, mantém-se o indício legado de cadastro atualizado, exceto na repetição da mesma mensagem ou recuperação de gravação. Perguntas como “quanto é a cirurgia” e “quanto fica a consulta” usam a mesma interpretação no planejamento e no envio. A primeira resposta cirúrgica preserva a oferta aprovada de faixa sem números; a consulta informa R$ 500 e pode oferecer uma vez conferir horários. Recusa, adiamento e convite anterior evitam insistência. A avaliação de otoplastia explica o cuidado com as orelhas de forma específica, sem indicação individual.

Tom: atenção à dúvida concreta, acolhimento de receios realmente declarados e um próximo passo pertinente. Sem empatia decorativa, pressão, currículo ou explicação repetidos. Preço, aceite, envio único, preferência humana, opt-out, urgência, agenda verificada e prioridade da mensagem recente continuam obrigatórios. Sem replay, reescrita da conversa ou envio real de teste.

Hipótese: clareza e acolhimento facilitam a continuidade até a consulta; aumento de conversão ainda não medido. Acompanhar apresentações únicas, resolução das perguntas, ofertas pertinentes, respostas qualificadas e consultas confirmadas/realizadas. Responsável Daniel/equipe: primeiras conversas naturais e revisão até 28/09/2026 às 07:52 BRT; conter diante de pressão, perda de contexto, valor indevido ou duplicidade. Rollback: commit 1920658fa469b640099d3d4908e01945097cbaf3, Netlify 6ab6ea73cea89200081ef8d5, preservando Apps Script v161 e dados. Evidência: auditorias/bruna-acolhimento-2026-09-26/RELATORIO.md e PUBLICACAO.json.
<!-- /BRUNA-ACOLHIMENTO-2026-09-26 -->

## Evidência e causa

O print foi confrontado com as respostas automáticas da YCloud e do Netlify, às 07:36, 07:38 e 07:40 BRT. A resposta inicial ocorreu antes de qualquer alteração nesta tarefa. Os textos de entrada estavam completos. Daniel cancelou o ajuste de recuperação; não houve edição ou publicação de transporte, timeout, fila ou Apps Script.

1. O indício anterior de continuidade usava qualquer turno do histórico, inclusive apenas entradas do paciente. Isso podia impedir a apresentação na primeira resposta após uma saudação complementar. A nova regra exige fala da clínica quando há histórico, preserva a continuidade legada apenas sem histórico e não usa repetição da mesma mensagem como prova de resposta.
2. “Quanto é” não entrava no plano de preço; “quanto fica a consulta” era reconhecido no planejador, mas não no contrato final. O resultado podia ser uma resposta vaga ou uma oferta removida. Ambos agora consomem a mesma regra linguística; nenhuma nova faixa ou permissão de preço foi criada.
3. O tom foi ajustado para atenção ao pedido, acolhimento de emoção declarada e uma continuação útil. A avaliação de otoplastia usa fatos já aprovados sobre projeção, dobras e assimetrias, preservando a decisão individual. Pergunta factual não é convite a insistir.

## Validação

Seis cenários falharam antes da correção. Doze regressões finais aprovadas, incluindo primeiro contato em várias mensagens, repetição idempotente, continuidade real, preço cirúrgico sem número, aceite posterior, consulta com convite opcional, perguntas sobre tempo/risco, recusa e convite já feito. 225 testes entre consumidores diretos e suíte final de 1.718 testes sem falhas. Os 28 comandos declarados, arquitetura, escopo, build e site:check foram executados. ops:check permanece SYNC_PENDING até concluir os recibos das projeções documentais. Nenhum teste envia mensagem real.

## Limites e reversão

Texto sintético e teste de integração não comprovam aumento de conversão nem resposta real após publicação. Nenhuma conversa histórica foi reaberta. A latência HTTP observada permanece fora desta mudança por orientação do usuário. Qualquer revisão natural posterior deve distinguir autoria da Bruna e da equipe. Rollback e acompanhamento constam do bloco acima e do candidato. Drive mantém os mesmos IDs de Plano e manual; recibos finais virão após conferência dos bytes publicados.
