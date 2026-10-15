# Bruna — procedimento definido pelo contexto, 15/10/2026

<!-- BRUNA-PROCEDIMENTO-CONTEXTUAL-2026-10-15-PUBLICACAO -->
Commit autorizado b7bad3c4e93f313993f8c9cb6b08b1a6ba7506f1; deploy 6ad0ca6cd91f0138092c5d88; publicado em 2026-10-15T12:46:37.032Z e verificado em 2026-10-15T12:47:27Z. Estado da igualdade documental em PUBLICACAO.json.

## Problema e comportamento esperado

Um contato pode chegar com referência de cervicoplastia e depois esclarecer que procura outro procedimento do pescoço. A origem ou a classificação anterior da fila não deve recuperar uma faixa antiga quando a pessoa já esclareceu o pedido. A resolução precisa conservar também perguntas conjuntas, recuperação e o contexto de quem pesquisa para outra pessoa.

A leitura autenticada das fontes privadas distinguiu autoria automática e humana e confirmou a relação de uma resposta curta com o pedido explícito anterior. A espera noturna foi da Bruna; os esclarecimentos da manhã foram humanos e precederam o deploy de referência. O incidente não deve ser atribuído integralmente à automação nem tratado como prova de falha posterior ao deploy. Nenhuma mensagem literal, contato, linha ou identificador individual foi copiado para este relatório.

## Alteração publicada

- procedure-context.mjs resolve turno atual explícito, último turno explícito da pessoa e origem, nessa ordem; recusa ou comparação ambígua conserva o estado indefinido.
- whatsapp-automation.mjs leva o turno atual a todas as rotas e recalcula a seleção de procedimento e a permissão de preço.
- human-resume.mjs usa a mesma resolução antes do enriquecimento e alinha o procedimento utilizado pelos consumidores posteriores.
- Regressões sintéticas cobrem origem desatualizada, esclarecimento posterior, recusa/comparação, pedido para outra pessoa, questões conjuntas e retomada. Um cenário de papada já existente no gate hospedado recebe o histórico conflitante, sem aumentar os 21 cenários.

Nenhum preço, fato clínico, fonte, prompt, modelo, esforço ou teto foi alterado. O pacote permanece 2026-10-14.5. Não há nova chamada de IA em produção nem no gate; o custo do atendimento não foi medido e nenhuma economia é alegada. A análise foi feita nesta conta e por ferramentas determinísticas.

## Baseline e limites

Base local 396511d1a0e6286a68427569b1164eb346d5434b. Produção funcional de referência anterior 3b66195b8b13a896ccdd63740e3f67398f7d7d4c, deploy 6ad0c377e0be1096575458ca; Apps Script v164 preservado. A fonte privada foi lida sem alterar registros. Funil, atribuição, prioridade humana, consentimento, política de preço, idempotência, revisão semântica e veto de conversa desatualizada permanecem. Os três componentes Google Ads e recibos anteriores são preservados integralmente no candidato e nos arquivos históricos.

## Validação

Passaram 2232/2232 testes integrais, 187/187 focados, 88/88 de retomada e 19/19 do harness simulado, com sobreposição; 59 arquivos de contratos estão cobertos. O build autorizado passou em 21/21 cenários hospedados, incluindo dois históricos completos, e 3/3 áudios. Saúde, proteção de assinatura, 15 funções e seis programações foram conferidas. O cenário contextual reforça um caso existente, sem aumentar chamadas. Nenhuma mensagem real foi enviada como teste.

Resultados finais vinculados ao SHA autorizado no recibo. Registros anteriores preservam sua proveniência. Pacote 2026-10-14.5, prompt, conhecimento, preços, fatos e fontes permanecem; Apps Script v164 não mudou. Não há prova de conversa natural posterior, ganho de conversão ou economia financeira. Os três componentes Ads e seus recibos são preservados.

## Publicação e reversão

Autorização, release:preflight do SHA exato, produção e inventários estão em PUBLICACAO.json. A publicação ocorreu antes desta preparação documental; o helper não executa rede, inferência, commit ou push.

Reversão por novo commit/build restrito ao delta para o comportamento de 3b66195b8b13a896ccdd63740e3f67398f7d7d4c / 6ad0c377e0be1096575458ca, preservando dados, filas, flags, Apps Script e trabalho paralelo; sem replay. Monitorar primeira conversa e retomada natural elegíveis e 48 horas, sem automação nova. A igualdade das mesmas projeções no Drive e o estado final constam em auditorias/bruna-procedimento-contextual-2026-10-15/PUBLICACAO.json; publicação técnica não substitui o fechamento documental.
