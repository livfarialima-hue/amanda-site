# Bruna — API essencial, 15/10/2026

Publicado e verificado em produção: commit autorizado `3b66195b8b13a896ccdd63740e3f67398f7d7d4c`, deploy `6ad0c377e0be1096575458ca`, publicação 2026-10-15T12:17:05.865Z, verificação 2026-10-15T12:18:04.837Z. Baseline Git `fc9a0294ec65fd1fe37bcde54a81785ec95a6852`; rollback funcional `7242d54df4e4487aeb59e1f7ec37c0f0c4dc6788` / `6ad0b88d46ff84caa6a749e7`. O estado do fechamento documental está em `PUBLICACAO.json`.

## Alteração e evidência

1. Removida a requisição de diagnóstico de até 45 segundos após timeout do teste hospedado. O resultado original continua bloqueando; a verificação independente dos três áudios permanece. Dois testes falharam no baseline por observar duas requisições em vez de uma e passaram após o corte. Os 19 testes do harness usam mocks; não executam inferência externa.
2. As mesmas verificações de remetente, chave YCloud e template aplicável passam para antes da revisão semântica em `scheduled-followup.mjs`. Nenhuma mudança de política, payload, elegibilidade ou transporte. Duas regressões de inferência indevida e uma asserção da ordem de leitura falharam contra o baseline carregado em memória; 35 testes do endpoint, revisão e cuidados passaram com dependências simuladas. Texto válido dispensa template; veto semântico e timeout ainda bloqueiam.

A revisão independente dos quatro arquivos de código/testes não encontrou bloqueio; confirmou que o cuidado mantém seu ramo próprio e que autenticação, elegibilidade e janela precedem as novas precondições.

## Preparação local — registro histórico

Leitura autenticada da Netlify confirmou deploy ready e apontamento atual, com 15 funções e seis rotinas. Saúde pública GET respondeu HTTP 200, modo active, entrada em background e assinatura ativa. Recibo: `PREFLIGHT.json`. Na preparação inicial não foram lidos valores de segredos, pacientes ou filas. O preflight posterior do SHA autorizado está registrado em `PREFLIGHT.json` e `PUBLICACAO.json`. Apps Script v164 é o recibo anterior preservado, sem nova publicação. A preparação inicial não executou chamadas pagas; a publicação posterior executou exclusivamente os gates hospedados sintéticos descritos abaixo.

A atualização separada do plugin privado Bruna — Gestão e Conversão 1.0.1 foi confirmada pelo responsável da tarefa em recibo privado. Revisões, rascunhos, cálculos e propostas usam a conta/conectores existentes sem fallback pago; isso não altera a hospedagem do atendimento. Não foi medida economia financeira. Classificação, caches e extração automática de conhecimento ficaram fora deste pacote. A extração administrativa paga ainda existe: sem proposta, o registro de aprendizagem pode continuar pendente antes de capturar a resposta humana. Retirá-la isoladamente degradaria a continuidade; uma migração futura precisa preservar captura, vínculo, revisões, estado e idempotência antes de qualquer processamento posterior. O plugin prepara propostas assistidas e não é um gateway de produção ou consumidor automático posterior.

## Validação local e hospedada

Passaram 2.209/2.209 testes integrais, 840/840 na união dos 40 arquivos exigidos pelos contratos/comandos (com sobreposição) e 19/19 do harness hospedado com mocks. `change:check` aprovou o escopo exato de 12 arquivos; arquitetura e diff passaram. Build: 193 arquivos, 54 URLs e zero erro; `site:check` também sem erros. Esses resultados locais pertencem ao commit aprovado. A publicação posterior passou em 21/21 cenários, com dois históricos, e 3/3 áudios; saúde e inventário de 15 funções e seis programações foram verificados. Nenhuma mensagem real foi enviada como teste. A reconciliação das mesmas projeções documentais exige igualdade real entre arquivos locais, commit fonte e releitura autenticada; o estado e a evidência ficam em `PUBLICACAO.json`.

## Monitoramento e reversão

Observar primeiro build e primeira retomada natural elegível, depois 48 horas. Falha semântica, configuração ausente e timeout continuam impedindo o efeito. Qualquer bypass, duplicidade ou perda de prioridade humana exige reverter somente estes deltas por novo commit/build ao comportamento de `7242d54` / `6ad0b88d46ff84caa6a749e7`, preservando dados, filas, flags, recibos e Apps Script, sem replay. O histórico de preparação e os recibos anteriores permanecem preservados.
