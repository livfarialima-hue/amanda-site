# Bruna — timeout após reconexão, 24/09/2026

Estado: código publicado e ativado; verificação de uma nova resposta real ainda pendente. Nenhum envio manual de teste pelo agente, replay manual ou alteração direta de LEADS.

## Evidência operacional

- YCloud: número reconectado, entrada nova recebida, entrega do webhook repetida por timeout.
- Apps Script canônico v160: execução de entrada em 21:03 BRT durou 27,65 segundos e concluiu. LEADS confirmou a entrada.
- Netlify: webhook com execuções de 30.039, 30.359 e 30.000 ms. Log do evento indicou falha após duas tentativas de registro, ambas com timeout, sem resposta ativa enfileirada. O limite do cliente era 20 segundos mais repetição de 8 segundos, além de outras operações.
- Equipe assumiu a conversa posteriormente. O controlador identificou a tomada humana na repetição seguinte. A pausa deve ser preservada.
- Blobs consultado em 25/09/2026 00:25 UTC: a raiz da fila de recuperação expôs apenas `completed/`, sem `pending/`.
- Falha da validação “Falha — revisar” na Central é uma pendência separada, sem evidência de ser a causa da resposta imediata. Nenhuma célula foi alterada.

Este registro não contém telefone, nome, mensagem, referência comercial ou identificador individual do contato. Detalhes permanecem nos sistemas operacionais.

## Escopo e falhas

Reutilizar a fila e o worker existentes. A nova entrada fica desligada por padrão e exige a flag `WHATSAPP_INBOUND_BACKGROUND_ENABLED=true` no modo `active`. Validar assinatura, telefone externo e evento, guardar o corpo integral, registrar o marcador e despachar o worker antes de retornar 202. Falha de persistência ou despacho retorna 503. Um recibo terminal permite encerrar a repetição sem mudar o marcador nem disparar novo trabalho.

No worker, a confirmação do registro admite 45 segundos e uma repetição idempotente de 30 segundos. O contexto que permite esse orçamento é passado internamente; cabeçalhos externos não o selecionam. Uma mensagem primária deve chegar ao registro mesmo quando outra mensagem mais recente já tiver chegado; a guarda final de saída preserva a supressão de resposta desatualizada. Assinatura, identidade, preferência, preços, agenda, pausa humana e regras de envio único permanecem nos proprietários existentes. Corpo maior que o limite é recusado sem truncamento.

Baseline local `375de1c2a0ccf9502cf560fc610f19c4db995c1e`: contém o código funcional do deploy `6aaffd4954313500081bc6a2`, commit `cf90c398ac45575eb044bfccf401296e1ea03368`, seguido somente de recibos e reconciliação documental. Worktree isolada. Esse baseline foi preservado como rollback; a versão aprovada foi publicada conforme o registro abaixo.

## Verificação

A regressão “signed inbound is persisted and acknowledged before slow downstream work starts” falhou no baseline: HTTP 502 em vez de 202. Após a implementação, passaram 26 testes focados de entrada/timeout, 16 de execução do worker e 435 verificações nos grupos de consumidores registrados (há sobreposição com a suíte). O teste cruzado executou o controlador real pelo worker com confirmação de LEADS em 27,65 segundos simulados e tomada humana, sem resposta de paciente ou recursão do despacho.

Suíte integral: **1.658/1.658**, sem falhas, cancelamentos ou testes ignorados. `change:check`, `architecture:check`, build, verificação do site e revisão de whitespace aprovados. Build local: 193 arquivos, 54 URLs no sitemap, nenhum arquivo de auditoria no artefato. O repositório principal continua limpo no baseline; todo o candidato está na worktree isolada. O fechamento operacional exige o recibo da projeção do Plano no Drive e reconciliação da branch local; até concluir essas etapas o gate permanece `SYNC_PENDING`.

Resultados, comandos e hashes dos logs locais estão em `ops/CHANGE-CANDIDATE.json`. Nenhuma alteração nas regras de preço, agenda, cuidado ou preferência; o manifesto continua descrevendo a última produção efetivamente verificada.

## Publicação e retorno

Obter autorização do commit exato e da ativação. Renovar o preflight; confirmar fila e modo atuais. Publicar Netlify com flag desligada, comparar artefatos e saúde, ativar somente conforme a autorização. Observar a próxima mensagem natural: chegada, registro confirmado, resposta aceita pelo provedor e entrega, sem interpretar 202 como atendimento concluído. Não criar mensagem artificial nem reprocessar a queda. Conferir o primeiro ciclo de recuperação e 48 horas.

Rollback: desligar a flag, preservando os trabalhos já reservados e os recibos; restaurar `6aaffd4954313500081bc6a2` se necessário. A flag devolve o caminho anterior e não cancela trabalho em curso. Se houver risco de envio indevido, usar a contenção operacional existente em modo `off` conforme a autorização de rollback e observar as execuções já iniciadas. Não apagar a fila. Apps Script permanece v160. Reconciliar recibos e a mesma projeção do Plano no Drive somente depois da publicação verificada. Até lá, `ops:check` deve indicar `SYNC_PENDING`.

## Referências técnicas

A YCloud aceita respostas 2xx e recomenda confirmar rapidamente, deixando o processamento em fila: [guia oficial de webhooks](https://docs.ycloud.com/reference/webhook-integration-guide). A Netlify oferece execução de background com resposta inicial 202 e duração maior: [documentação oficial](https://docs.netlify.com/build/functions/background-functions/). Os 30 segundos citados acima são observados neste incidente; não representam uma afirmação geral sobre todos os planos ou funções Netlify.

## Publicação executada

Daniel autorizou “Pode publicar” e “E ativar” nesta tarefa. Preflight do commit exato passou em 25/09/2026 00:34:09 UTC. O push foi avanço direto de 375de1c para `64a289a0bb2ffc4c1fea57b160f2bb1be353a25a`. Primeiro deploy `6ab5c1949a9a3b00080aed17`, concluído às 21:34:59 BRT, ainda com flag ausente. Em seguida foi criada a flag: produção `true`, previews/branches/desenvolvimento `false`. A republicação do mesmo commit gerou `6ab5c206aaaf04e7e71dd958`, concluída às 21:36:48 BRT, com 13 funções e 192 arquivos no painel.

Readback público em 25/09 00:37 UTC: `ok:true`, `automationMode:active`, `processingMode:durable_background_intake`, assinatura ativa e contatos internos protegidos. POST sem assinatura retornou 401 antes de qualquer processamento. Nenhuma mensagem enviada pelo agente. As duas respostas observadas às 21:32 e 21:35 pertencem a entradas anteriores à ativação e não comprovam o novo caminho. Aguardando a próxima entrada após 21:36:48 para conferir resposta real. A conversa original continua sob atendimento humano.

A projeção do Plano no Drive foi lida antes da escrita e era byte a byte idêntica ao baseline local (SHA-256 aba6a9c468ff474b458b4b39a8a2f6d1a718af6d2230773e83315df7ab7ef44c). A mesma projeção foi substituída e relida às 00:41:47 UTC; 202.255 bytes e SHA-256 1cc328c9ea6639dfa7ecd924a144b2c6ed7a41ae3298adeb1750b42c1b9bbb01, idênticos ao Plano local do commit documental 6c94c9b. Nenhum arquivo concorrente criado. A verificação de entrega após a ativação continua pendente e não é substituída por essa reconciliação documental.
