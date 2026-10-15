# Bruna — API essencial, 15/10/2026

Candidato testado localmente; sem publicação, alteração do Drive ou mensagens reais. Baseline Git `fc9a0294ec65fd1fe37bcde54a81785ec95a6852`; execução publicada `7242d54df4e4487aeb59e1f7ec37c0f0c4dc6788`, deploy `6ad0b88d46ff84caa6a749e7`.

## Alteração e evidência

1. Removida a requisição de diagnóstico de até 45 segundos após timeout do teste hospedado. O resultado original continua bloqueando; a verificação independente dos três áudios permanece. Dois testes falharam no baseline por observar duas requisições em vez de uma e passaram após o corte. Os 19 testes do harness usam mocks; não executam inferência externa.
2. As mesmas verificações de remetente, chave YCloud e template aplicável passam para antes da revisão semântica em `scheduled-followup.mjs`. Nenhuma mudança de política, payload, elegibilidade ou transporte. Duas regressões de inferência indevida e uma asserção da ordem de leitura falharam contra o baseline carregado em memória; 35 testes do endpoint, revisão e cuidados passaram com dependências simuladas. Texto válido dispensa template; veto semântico e timeout ainda bloqueiam.

A revisão independente dos quatro arquivos de código/testes não encontrou bloqueio; confirmou que o cuidado mantém seu ramo próprio e que autenticação, elegibilidade e janela precedem as novas precondições.

## Preflight e limites

Leitura autenticada da Netlify confirmou deploy ready e apontamento atual, com 15 funções e seis rotinas. Saúde pública GET respondeu HTTP 200, modo active, entrada em background e assinatura ativa. Recibo: `PREFLIGHT.json`. Não foram lidos valores de segredos, pacientes ou filas; presença detalhada da configuração deve ser revalidada antes da publicação. Apps Script v164 é o recibo anterior preservado, sem nova publicação. Nenhuma chamada paga de modelo/áudio foi executada.

A atualização separada do plugin privado Bruna — Gestão e Conversão 1.0.1 foi confirmada pelo responsável da tarefa em recibo privado. Revisões, rascunhos, cálculos e propostas usam a conta/conectores existentes sem fallback pago; isso não altera a hospedagem do atendimento. Não foi medida economia financeira. Classificação, caches e extração automática de conhecimento ficaram fora deste pacote. A extração administrativa paga ainda existe: sem proposta, o registro de aprendizagem pode continuar pendente antes de capturar a resposta humana. Retirá-la isoladamente degradaria a continuidade; uma migração futura precisa preservar captura, vínculo, revisões, estado e idempotência antes de qualquer processamento posterior. O plugin prepara propostas assistidas e não é um gateway de produção ou consumidor automático posterior.

## Validação e próximos gates

Passaram 2.209/2.209 testes integrais, 840/840 na união dos 40 arquivos exigidos pelos contratos/comandos (com sobreposição) e 19/19 do harness hospedado com mocks. `change:check` aprovou o escopo exato de 12 arquivos; arquitetura e diff passaram. Build: 193 arquivos, 54 URLs e zero erro; `site:check` também sem erros. O candidato está em `tested_local`; nenhum gate de modelo/áudio foi executado externamente. `ops:check` deve manter SYNC_PENDING enquanto publicação e documentação estiverem pendentes. Depois do commit: autorização do SHA exato, preflight fresco, build hospedado com 21 cenários, dois históricos e três áudios, verificação de produção e readback das mesmas projeções documentais.

## Monitoramento e reversão

Observar primeiro build e primeira retomada natural elegível, depois 48 horas. Falha semântica, configuração ausente e timeout continuam impedindo o efeito. Qualquer bypass, duplicidade ou perda de prioridade humana exige reverter somente estes deltas por novo commit/build ao comportamento de `7242d54` / `6ad0b88d46ff84caa6a749e7`, preservando dados, filas, flags, recibos e Apps Script, sem replay. Antes de publicar, basta abandonar/reverter somente este candidato.
