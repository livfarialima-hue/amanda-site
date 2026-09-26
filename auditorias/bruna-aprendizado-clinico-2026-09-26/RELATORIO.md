# Aprendizado de dúvidas frequentes sobre papada e cervicoplastia

Status: publicado e verificado em produção às 18:21 BRT de 26/09/2026. Projeções no Drive em fechamento.

## Evidência e causa

A exportação mais recente de 26/09/2026 foi lida e comparada com a LEADS canônica. Uma resposta inicial era da Bruna; oito respostas posteriores eram humanas, inclusive as assinadas como Bruna. As duas perguntas iniciais estavam registradas em Revisões do Bot, sem rascunho seguro. Não há evidência de falha de transporte nesse caso.

Foram reproduzidas três lacunas: o substantivo “custo” não ativava a política de preço; a associação explícita de lipo de papada com cervicoplastia era tratada como procedimento indefinido; as explicações gerais sobre as estruturas tratadas e a recuperação da lipo não estavam disponíveis como fatos aprovados ao modelo. Além disso, concordar com o código de preço podia selecionar uma resposta pronta e descartar a explicação contextual do modelo.

## Mudança delimitada

- Reconhecer custo e custos, respeitando recusa, “a todo custo” e “custo-benefício”.
- Reconhecer somente a associação explícita entre lipo de papada e cervicoplastia como contexto cervical. Comparações, alternativas, perguntas separadas e correções continuam protegidas.
- Oferecer ao modelo explicações educativas, com fonte e limites: gordura, pele e platisma; recuperação geral da lipo; ambiente hospitalar e anestesista sem definir a anestesia individual.
- Conservar a resposta contextual quando preço vier acompanhado de outra pergunta. Os valores e todas as ressalvas continuam passando pelo mesmo gate de saída.
- Preservar revisão para lipo isolada sem preço aprovado, internação, alta e prazo individual. Não reaproveitar uma resposta humana específica como autorização geral.

Fontes públicas verificadas: [lipo de papada](https://draamandaschroeder.com.br/lipo-de-papada/) e [lifting cervical](https://draamandaschroeder.com.br/lifting-cervical/). A solicitação de fotos já seleciona a página cervical com casos públicos; não foi alterada nem transformada em previsão de resultado.

## Contribuições da clínica

Documento nativo criado e conferido: [Bruna — Complementos da clínica e perguntas frequentes](https://docs.google.com/document/d/1pIhpbnnbddkqBWQPJZKxc2f6SWAudv5MzasyzphzlxU/edit), na pasta ativa da Bruna. Recebe pergunta, resposta confirmada, procedimento, exceções e fonte. Não contém dados de pacientes e não é lido automaticamente pelo bot. Integração exige conferência, teste e publicação; o manual versionado continua canônico.

Pendente de confirmação de Daniel: rotina de observação hospitalar para lipo isolada, faixa própria de preço e aplicabilidade da referência de 7 a 14 dias. Esses pontos não entram como fatos automáticos neste pacote.

## Validação e limites

Regressões sintéticas reproduziram as lacunas antes da correção. Os testes conferem fatos enviados ao modelo, perguntas preservadas no contrato e corpo efetivamente enviado pelos dois consumidores (webhook e retomada). Chamadas externas são simuladas; nenhum paciente recebeu mensagem de teste. A consulta às plataformas foi somente leitura, exceto a criação do documento de contribuições.

Sem mudança em Apps Script v161, valores aprovados, modelos, cadência, filas, takeover, prioridade da mensagem recente ou assinatura. Sem replay da conversa, alteração das revisões abertas ou envio à paciente.

## Acompanhamento

Daniel/equipe: primeiras conversas naturais, 48 horas e sete dias. Observar cobertura das perguntas, intervenções humanas, explicações sem indicação individual e eventual preço indevido. Consultas qualificadas/confirmadas e realizadas são resultados posteriores; não foi medido ganho de conversão.

Rollback: restaurar Netlify 6ab7dbe15ccd459069e61eac, commit funcional 624d7e65abe867fe1556fbfdd788fe9a8dd81358, preservando Apps Script v161, filas e recibos. Conter diante de faixa indevida, indicação clínica individual, duplicidade ou interferência no atendimento humano.

Validação concluída em 2026-09-26T21:18:43.844Z: 1.808 testes integrais, 14 novos casos de regressão e 32 comandos contratuais/build sem falha. Gate operacional em SYNC_PENDING até publicação e equivalência das projeções.

## Recibo de produção

**Pacote 2026-09-26.6 — PUBLICADO E VERIFICADO em produção em 26/09/2026, 18:21 BRT.** Commit funcional 012692d69a3148ac2a2cccfe78309337122ccb62; Netlify 6ab8370595a6f500088ea9e1; Apps Script v161 preservado. Reconhecimento de custo, contexto de associação explícita de lipo de papada com cervicoplastia, explicações do site sobre pele/gordura/platisma e recuperação da lipo, com preservação das demais perguntas quando há preço. Comparações e lipo isolada não herdam faixa cervical. As mesmas ressalvas de preço e proteções clínicas continuam obrigatórias. Validação: 1.808 testes integrais, 14 novos casos, 32 comandos de validação/build sem falha; domínio e URL imutável com bot ativo e POST sem assinatura rejeitado com 401. Quatorze funções publicadas; nenhuma mensagem real de teste ou nova conversa natural foi observada após a publicação. Rollback: Netlify 6ab7dbe15ccd459069e61eac / 624d7e65abe867fe1556fbfdd788fe9a8dd81358, preservando filas e Apps Script v161. Evidência: auditorias/bruna-aprendizado-clinico-2026-09-26/RELATORIO.md.

A publicação automática foi temporariamente bloqueada para conferir a URL imutável antes da promoção. O mesmo deploy foi promovido e a configuração de publicação automática foi restaurada. Nenhuma flag, credencial ou dado operacional de paciente foi alterado. O horário de publicação tem precisão de minuto; a verificação HTTP foi registrada às 21:21:38.060Z.
