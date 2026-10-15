# Bruna — procedimento definido pelo contexto, 15/10/2026

## Problema e comportamento esperado

Um contato pode chegar com referência de cervicoplastia e depois esclarecer que procura outro procedimento do pescoço. A origem ou a classificação anterior da fila não deve recuperar uma faixa antiga quando a pessoa já esclareceu o pedido. A resolução precisa conservar também perguntas conjuntas, recuperação e o contexto de quem pesquisa para outra pessoa.

A leitura autenticada das fontes privadas distinguiu autoria automática e humana e confirmou a relação de uma resposta curta com o pedido explícito anterior. A espera noturna foi da Bruna; os esclarecimentos da manhã foram humanos e precederam o deploy de referência. O incidente não deve ser atribuído integralmente à automação nem tratado como prova de falha posterior ao deploy. Nenhuma mensagem literal, contato, linha ou identificador individual foi copiado para este relatório.

## Alteração local

- procedure-context.mjs resolve turno atual explícito, último turno explícito da pessoa e origem, nessa ordem; recusa ou comparação ambígua conserva o estado indefinido.
- whatsapp-automation.mjs leva o turno atual a todas as rotas e recalcula a seleção de procedimento e a permissão de preço.
- human-resume.mjs usa a mesma resolução antes do enriquecimento e alinha o procedimento utilizado pelos consumidores posteriores.
- Regressões sintéticas cobrem origem desatualizada, esclarecimento posterior, recusa/comparação, pedido para outra pessoa, questões conjuntas e retomada. Um cenário de papada já existente no gate hospedado recebe o histórico conflitante, sem aumentar os 21 cenários.

Nenhum preço, fato clínico, fonte, prompt, modelo, esforço ou teto foi alterado. O pacote permanece 2026-10-14.5. Não há nova chamada de IA em produção nem no gate; o custo do atendimento não foi medido e nenhuma economia é alegada. A análise foi feita nesta conta e por ferramentas determinísticas.

## Baseline e limites

Base local 396511d1a0e6286a68427569b1164eb346d5434b. Produção funcional 3b66195b8b13a896ccdd63740e3f67398f7d7d4c, deploy 6ad0c377e0be1096575458ca; Apps Script v164 preservado. A fonte privada foi lida sem alterar registros. Funil, atribuição, prioridade humana, consentimento, política de preço, idempotência, revisão semântica e veto de conversa desatualizada permanecem. Os três componentes Google Ads e recibos anteriores são preservados integralmente no candidato e nos arquivos históricos.

## Validação

Passaram 2.232/2.232 testes integrais, 187/187 testes focados (incluindo as duas regressões de urgência e cardiologia identificadas na revisão), 88/88 de retomada e 19/19 testes simulados do gate hospedado. As suites se sobrepõem e não devem ser somadas. Os 59 arquivos de testes exigidos pelos contratos estão cobertos pela suíte integral e pelo harness. change:check passou com escopo exato de 17 arquivos; architecture:check e git diff --check passaram. Build/check aprovados: 193 arquivos e 54 URLs. A revisão independente foi concluída após corrigir o bloqueador; a nova execução integral passou. ops:check permanece SYNC_PENDING até publicação e readback. Nenhum teste vivo pago foi executado durante a preparação.

## Publicação e reversão

Candidato em tested_local, com preflight vivo registrado em PREFLIGHT.json. A solicitação atual deve ser vinculada ao SHA final no release:preflight, depois dos testes e da releitura viva. Não reutilizar autorização ou resultados de release anteriores para aprovar este candidato. A publicação autorizada deve executar os 21 cenários hospedados, os dois históricos completos e os três áudios já obrigatórios. Até publicação e readback das mesmas projeções documentais, o estado esperado é SYNC_PENDING.

Reverter apenas este delta por novo commit e build, retornando à resolução do baseline sem restaurar dados ou reaplicar filas. Preservar preços, fatos, Apps Script, configurações e alterações paralelas. Daniel/equipe acompanham primeira conversa e retomada natural elegíveis e 48 horas após publicação; troca indevida de procedimento, faixa incompatível, duplicidade ou interferência humana exigem contenção e revisão. Não criar automação nem disparar mensagem para provar funcionamento.
