# Implementação da correção integrada — 14 de agosto de 2026

**Estado:** Apps Script publicado na versão 88; deduplicação, fases históricas, subconjunto seguro de consultas, reconciliação offline do Google Ads, observabilidade prospectiva de atribuição Meta Site, painel humano/SLA, saúde das integrações, taxonomia de falhas, expiração segura da agenda e migração canônica de `Funil Comercial`/`Painel Econômico` aplicados e validados; casos históricos ambíguos permanecem bloqueados e os gates longitudinais de Google, Meta Site e SLA seguem em observação

**Fonte estratégica:** `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`

**Evidência de origem:** `auditorias/auditoria-integrada-2026-08-13/`

## Contrato de execução

- O grão canônico é uma oportunidade por `Opportunity ID` e profissional.
- Telefone só pode substituir o identificador quando houver uma única correspondência ativa e inequívoca.
- Mudanças automáticas não rebaixam fase; uma correção humana explícita pode substituir a fase e deve deixar evento de auditoria.
- Consultas novas exigem `Opportunity ID`; backfill histórico deve ser conservador, reversível e produzir relatório de conflitos.
- Importações de mídia não recebem nome, telefone, e-mail, procedimento, conversa ou qualquer PII/PHI.
- Código local e commit devem representar o mesmo estado; publicação e migração ao vivo exigem autorização específica posterior.
- `/lifting-facial/` não pode sofrer alteração de texto, layout, vídeo, CTA ou característica.

## Etapas e critérios de aceite

| Etapa | Correção | Aceite local antes de publicação |
|---|---|---|
| 0 | Baseline, decisão estratégica e mapa de dependências | testes existentes aprovados; norte e histórico coerentes |
| 1 | Fase canônica e deduplicação | CRM e aba escritos pela mesma rotina; repetição idempotente; ambiguidade falha fechada |
| 2 | Consulta e Calendar | `Opportunity ID` obrigatório nos fluxos novos; evento Calendar persistido e reconciliável |
| 3 | Conversão offline Google | ledger e primeira aba reconciliados por transação; exatamente um click ID; zero PII |
| 4 | Atribuição Meta Site | `M26F02S` preservado de clique consentido até oportunidade; teste sintético sem dados reais |
| 5 | Bot e operação | contexto bilateral, silêncio/handoff e fila protegidos; SLA e exceções calculáveis |
| 6 | Site técnico seguro | somente correções técnicas aprovadas; regressão explícita garantindo lifting intocado |
| 7 | QA integrado e pacote de publicação | testes completos, auditoria de diff, migrações idempotentes, rollback e checklist externo |

## Baseline confirmado

- Branch local: `reestruturacao-site`.
- Estado inicial: árvore limpa, um commit local à frente da origem por causa da auditoria integrada.
- Testes antes das correções: **486 de 486 aprovados**.
- Publicação externa nesta implementação: **não autorizada**.

## Progresso local

- `f0ef62a`: decisão estratégica, gates e contrato de execução registrados.
- Fase canônica: CRM e aba visível agora usam uma rotina comum com trava, versão compartilhada, compensação em caso de falha, idempotência e precedência do `Opportunity ID`.
- Ingestão: uma identidade ambígua não cria uma nova linha; o evento falha fechado para revisão.
- Consulta: criação, reserva, fase, dados visíveis e não comparecimento propagam `Opportunity ID`; uma consulta nova sem identidade única é recusada.
- Classificador: fase e resumo operacional são persistidos pelo mesmo caminho canônico; falha de reconciliação vira revisão em vez de atualização parcial.
- Reparo histórico: deduplicação usa simulação por padrão, escolhe a linha canônica conservadoramente, arquiva a linha integral antes de limpá-la e oferece restauração por `Backup ID`; conflito de fase equivalente exige revisão humana.
- Consulta histórica: backfill de `Opportunity ID`, fase e Calendar foi preparado com simulação por padrão; consultas encerradas não recriam eventos passados.
- Google Ads: import e ledger agora podem ser reconciliados pela transação, exigem exatamente um click ID e não enviam PII; isso valida consistência local, não a aceitação do Google.
- Meta Site: o teste cobre `M26F02S` por duas páginas sem consentimento de marketing, recepção no webhook e persistência separada em `Campanha`, `Criativo`, `CTA` e `Referência completa`. O backfill histórico só preenche vazios e bloqueia conflito com atribuição já fixada.
- Funil: foi preparada uma fonte `_FUNIL_CANONICO`, sem PII e com exatamente uma linha por oportunidade ativa; a troca das fórmulas dos painéis depende da inspeção e autorização ao vivo.
- Testes após este lote: **498 de 498 aprovados**.
- Nenhuma simulação com `apply: true`, migração de planilha, alteração de Calendar, importação no Google ou publicação do site foi executada.

## Fechamento local

- Bot e operação: respostas automáticas agora dependem de rota única e confirmada pela planilha; ausência, ambiguidade ou profissional fora de Amanda/Daniel falham fechadas e preservam revisão humana. O fallback legado que permitia responder sem confirmação da planilha foi removido.
- Contexto: a decisão usa a janela bilateral recente e mantém `Opportunity ID`, profissional, origem e estado operacional; uma resposta humana pausa a automação.
- Auditoria operacional: `_WHATSAPP_OPERACAO_EVENTOS` registra apenas eventos tipados e identificadores opacos, sem texto de conversa, nome, telefone ou dado clínico. O SLA passa a ser calculável pelo vínculo entre entrada e resposta/handoff.
- Filas: o reaper separa espera esperada, exclusão comercial, revisão humana e falha técnica; tentativas esgotadas ou órfãs vão para `_WHATSAPP_CLASSIFICACAO_EXCECOES` sem reiniciar loops.
- Marcos comerciais: orçamento enviado, aceite, procedimento realizado e pagamento confirmado têm ledger tipado por oportunidade. Baixa confiança mantém a atualização marcada para revisão e envia o alerta interno já existente.
- Saúde sintética: foi preparado um teste diário Netlify → Apps Script sem paciente, telefone, mensagem ou envio de WhatsApp. Ele comprova autenticação, persistência e contratos; não deve ser descrito como teste integral do provedor YCloud.
- Pós-consulta: documentação e configuração foram reconciliadas em três horas.
- Site: dimensões ausentes de imagens, poster de vídeo e diretiva explícita para GPTBot foram corrigidos. O vídeo de otoplastia não foi recomprimido porque ainda não há evidência causal suficiente nem ferramenta de mídia instalada no ambiente.
- Proteção de lifting: `git diff --name-only -- lifting-facial` permaneceu vazio; nenhum texto, layout, vídeo, CTA ou característica foi alterado.
- Testes finais: **503 de 503 aprovados** depois da remoção do fallback legado; `git diff --check` sem erro.
- Commits locais deste fechamento: `ec30d47` (operação e SLA) e `f5ffe76` (estabilidade técnica do site).
- No fechamento local anterior, nenhuma função com `apply: true`, alteração de fórmula, criação/remoção de evento, upload ao Google Ads, mudança de campanha, push ou publicação havia sido executada. A seção seguinte atualiza esse estado apenas para a publicação autorizada do Apps Script.

## Execução autorizada em 14/08/2026

- Foi criada uma cópia nativa da planilha antes da execução e sua estrutura de 33 abas foi confirmada.
- A base do Apps Script foi publicada inicialmente na versão 76, vinculada ao commit local `fe7cd27`; o endpoint respondeu HTTP 200 com `ok: true`.
- O executor monolítico excedeu seis minutos sem produzir escrita. Ele foi dividido em nove verificações independentes, e as leituras repetidas das abas visíveis foram substituídas por um índice em memória. A auditoria equivalente caiu de aproximadamente 3min39s para menos de 8s e preservou exatamente as mesmas contagens.
- As nove verificações foram concluídas com `apply: false`. O lote integral foi reprovado antes da primeira escrita por 2 grupos duplicados/3 linhas excedentes, 26 consultas históricas sem oportunidade correspondente, 2 conflitos de atribuição congelada, 8 itens de classificação que exigem atenção e cobertura de SLA ainda igual a zero.
- Após autorização específica, a deduplicação recebeu trava exclusiva, rollback por grupo e retorno de IDs de restauração no commit `b0da4b6`; o Apps Script correspondente foi publicado na versão 77.
- A execução arquivou 3 linhas excedentes em 2 grupos, sem conflito nem rollback. A repetição encontrou zero duplicidade. Permanecem 27 fases reparáveis, ainda sem autorização de escrita.
- Testes após o endurecimento da deduplicação: **508 de 508 aprovados**.
- Registro detalhado: `docs/EXECUCAO-SIMULACOES-CORRECAO-INTEGRADA-2026-08-14.md`.

### Reconciliação histórica de fases autorizada

- Uma nova cópia nativa privada foi criada imediatamente antes deste bloco; a cópia e a fonte tinham 36 abas e IDs distintos.
- O executor protegido foi registrado no commit `d6cb72d` e publicado como Apps Script versão 78 às 12:21. Ele exige 131 oportunidades inspecionadas, exatamente 27 reparos e zero conflito antes de permitir a escrita; uma segunda execução sem pendências é inócua.
- A simulação imediatamente anterior à escrita confirmou 131 oportunidades, 104 já consistentes, 27 reparáveis, zero revisão e zero problema.
- A execução das 12:22 às 12:26 corrigiu 27 de 27 pares CRM–aba visível. O pós-voo interno encontrou 131 consistentes, zero reparável, zero revisão e zero erro.
- Uma leitura independente da planilha confirmou 141 oportunidades totais, sendo 131 ativas e 10 encerradas/arquivadas; as 131 ativas possuem linha visível única, zero divergência de fase, zero divergência de ponteiro e zero ID duplicado.
- Os valores ou fórmulas informados de `Consultas`, atribuição, `Saúde das Integrações`, `Funil Comercial`, `Painel Econômico` e `Painel do Bot` ficaram idênticos ao baseline. `_FUNIL_CANONICO` não foi criado e nenhum evento do Calendar foi alterado.
- O endpoint da versão 78 respondeu HTTP 200 com `ok: true`. A suíte local passou com **516 de 516 testes**.

O procedimento de publicação, migração e rollback está em `docs/RUNBOOK-CORRECAO-INTEGRADA-2026-08-14.md`. O inventário exato do pacote está em `docs/PACOTE-PUBLICACAO-CORRECAO-INTEGRADA-2026-08-14.md`.

### Reconciliação segura de consultas autorizada

- O executor protegido `aplicarReconciliacaoConsultasSegurasAutorizada`, no commit `fc0785a`, usa trava exclusiva, pré-voo fixado e resolução indexada por oportunidade, telefone e profissional. Profissionais externos não são convertidos em oportunidades de Amanda ou Daniel.
- Uma cópia nativa privada com 36 abas foi criada imediatamente antes da escrita. A comparação posterior com essa cópia confirmou o escopo exato das células alteradas.
- A aplicação avançou 3 fases apoiadas por status estruturado de consulta e registrou 3 eventos de fase. Atualizou no próprio evento os metadados operacionais de 9 vínculos do Google Calendar que já tinham data e hora corretas.
- Nenhum evento foi criado, removido ou duplicado; datas e horários permaneceram intactos. Um caso com divergência temporal e um link inválido foram bloqueados, assim como 26 registros sem oportunidade correspondente e 1 vínculo incompatível com o profissional.
- O primeiro pós-voo na mesma execução apresentou um falso negativo causado por literais Unicode inválidos na comparação de metadados. O código foi corrigido antes de nova tentativa; a auditoria fresca encontrou 0 reparo seguro pendente, e a repetição retornou `alreadyReconciled: true` sem nova escrita.
- A versão 80 foi publicada no mesmo deployment; o endpoint respondeu HTTP 200 com `ok: true`, a suíte local passou com **520 de 520 testes** e a aba `Consultas` foi inspecionada visualmente em produção.
- Atribuição, `_FUNIL_CANONICO`, fórmulas dos painéis, mídia e `/lifting-facial/` não foram alterados neste bloco.

### Reconciliação offline Google Ads autorizada

- O executor `aplicarReconciliacaoGoogleAdsSeguraAutorizada`, no commit `8dbe985`, usa trava exclusiva, pré-voo fixado, escrita em duas fases e pós-voo idempotente. A simulação não cria abas nem corrige cabeçalhos implicitamente.
- A identidade só é aceita quando primeira aba, ledger, oportunidade da Dra. Amanda e linha visível concordam exatamente, com um único GCLID, GBRAID ou WBRAID. Profissional divergente, valor ou tipo diferente, duplicidade ou mais de um click ID bloqueiam todo o lote antes da escrita.
- A cópia nativa imediatamente anterior tinha 36 abas e preservou `IMPORT_GOOGLE_ADS` como primeira aba. A execução normalizou 3 nomes na importação, 5 nomes nas linhas visíveis elegíveis e reconstruiu 3 registros ausentes do ledger.
- O pós-voo e uma auditoria fresca fecharam em 5 linhas de importação, 5 registros de ledger e zero item inválido, duplicado, ausente, divergente ou em revisão. Nenhuma linha sem transação elegível foi alterada.
- A comparação com o backup mostrou apenas 3 células alteradas em `IMPORT_GOOGLE_ADS`, 3 novas linhas em `_GOOGLE_ADS_EVENTOS` e 5 células alteradas em `Google Ads - Conversões`; a inspeção visual confirmou cabeçalho, congelamento, ordem e layout íntegros.
- O Apps Script versão 81 foi publicado no mesmo deployment e respondeu HTTP 200 com `ok: true`. A conexão Google Sheets `LEADS` manteve cinco campos mapeados e execução diária; a execução automática anterior e a importação manual posterior à reconciliação concluíram 5 linhas com 0 erros.
- A suíte final passou com **522 de 522 testes**. Nenhuma campanha, meta, lance, orçamento, palavra-chave, atribuição histórica, fórmula de painel, Calendar, Netlify, site ou `/lifting-facial/` foi modificada neste bloco.
- A ação permanece em observação: consistência e envio técnico não equivalem a ação saudável. O gate exige aceite/rejeição reconciliados e sete dias estáveis antes de qualquer ampliação de uso em lances.

### Observabilidade Meta Site autorizada

- O teste público da landing confirmou que os 6 CTAs de WhatsApp preservam `M26F02S`, `C01H01` e `avaliacao-facial`; a página, o texto e a mídia não foram alterados.
- O webhook agora classifica cada nova referência em uma categoria limitada e produz um motivo limitado de fallback quando não houver código de campanha mapeado. O Apps Script persiste categoria, motivo, referência e plataforma em `_WHATSAPP_EVENTOS`, sem ampliar o payload analítico com nome, mensagem, e-mail ou dado clínico.
- O monitor Netlify envia somente a referência técnica `M26F02S-C01H01-avaliacao-facial`. A execução ao vivo concluiu com HTTP 200 e a planilha registrou `persistence_ok`, `classification_contract_ok`, `handoff_contract_ok` e `meta_attribution_contract_ok`.
- O Apps Script versão 82 preservou o deployment anterior; o endpoint respondeu HTTP 200 com `ok: true`. O Netlify publicou o commit `7480022` no deploy `6a7f54a074e9be0008883571`.
- A suíte final passou com **526 de 526 testes**, `git diff --check` ficou limpo e `/lifting-facial/` permaneceu fora do diff.
- Essa prova fecha o defeito técnico prospectivo de cobertura, não o gate de negócio. As 1.290 LPVs históricas e o zero de oportunidades com código exato não podem ser reclassificados retroativamente; escala continua bloqueada até medir ≥80% de cobertura no teste e ≥95% de novos contatos pagos com código esperado ou motivo explícito, sem duplicidade ≥2%.

## Gates que permanecem externos

A aprovação deste trabalho local não prova os gates de produção. Depois da autorização de publicação, a observação deve demonstrar: sete dias de conversão Google saudável; 14 dias sem nova divergência CRM–aba; pelo menos 95% de reconciliação de novas consultas com Calendar; pelo menos 80% de cobertura consentida para `M26F02S`; SLA calculável em pelo menos 95% das novas conversas e nenhum P0/P1 vencido.

## Publicação e validação do Netlify — 14/08/2026

- Antes deste bloco, a branch pública `reestruturacao-site`, o worktree e a produção estavam alinhados no commit `fc433da`.
- O Netlify havia publicado o deploy de produção `6a7f2efadac1ed0008dffffa` a partir do commit `fc433da`.
- O diagnóstico público confirmou `ok`, automação ativa, Sheets, secret, OpenAI e alerta de revisão configurados.
- Página inicial, avaliação facial, otoplastia adulta, otoplastia infantil, lifting facial e `robots.txt` responderam HTTP 200.
- `/lifting-facial/` permaneceu idêntica ao arquivo local depois de normalizar somente quebras de linha; nenhum texto, layout, vídeo, CTA ou característica mudou.
- O monitor `synthetic-integration-health` foi executado manualmente porque o horário diário já havia passado. A aba oculta `_INTEGRATION_HEALTH_SYNTHETIC` registrou um único teste sem PII/PHI, com persistência, contrato de classificação, handoff e resultado final `ok`.
- A publicação não alterou campanhas, Calendar, fases históricas, atribuição histórica ou fórmulas dos painéis.

### Checkpoint agregado após a publicação

- O CRM contém 141 oportunidades: 128 de Amanda, 3 de Daniel e 10 arquivadas ou de outros fluxos. As abas visíveis contêm exatamente 128 e 3 IDs únicos, respectivamente, sem nova duplicidade.
- As 27 divergências de fase foram corrigidas no bloco autorizado posterior. A verificação independente passou a indicar zero divergência entre as 131 oportunidades ativas e suas linhas visíveis.
- `Consultas` contém 43 registros: 10 com `Opportunity ID` e ID de evento Google; 33 sem `Opportunity ID`, sendo 22 encerrados e 11 ativos ou sem desfecho inequívoco.
- Nesse checkpoint intermediário, `_FUNIL_CANONICO` ainda não existia e `Saúde das Integrações` ainda referenciava `IMPORT_GCLID`, com uma fórmula `#VALUE!`. O bloco `DAT-09` + `BOT-06` posterior, documentado abaixo, corrigiu esse estado.
- O checkpoint anterior do `Painel do Bot` registrava 198 mensagens recebidas, 41 pessoas, 173 mensagens humanas, 2 pendências vencidas e 8 erros de classificação; “Conversas assumidas” ainda lia `_WHATSAPP_ATENDIMENTO` e mostrava zero. Esse defeito foi corrigido no bloco `BOT-03` + `BOT-04` abaixo.
- Esses números foram lidos diretamente da planilha em `America/Sao_Paulo`, sem persistir nome, telefone, e-mail, conversa ou dado clínico no relatório. O subconjunto seguro de consultas foi executado depois e está documentado acima; os casos bloqueados, a atribuição, o funil e as fórmulas continuam exigindo autorização própria.

### Checkpoint `BOT-03` + `BOT-04`

- O commit `e941390` criou o resumo oculto `_BOT_METRICAS`, com cálculo testado da primeira resposta em minutos úteis dentro da janela publicada de 08:00–20:00, todos os dias. A atualização da Central também recalcula o resumo.
- Backup anterior à planilha: [LEADS — backup antes do painel SLA — 2026-08-14 15h05](https://docs.google.com/spreadsheets/d/1OuEDNiSizZQC9jVGR17uVSw9eGX12R6trcNg7ekS080/edit?usp=drivesdk).
- O painel passou a contar 43 pessoas únicas com ação humana na fonte vigente. As métricas preexistentes da linha seguinte foram restauradas exatamente em fórmula e rótulo após a comparação com o backup; o novo SLA ocupa uma linha própria.
- Primeira leitura ao vivo: 19 entradas roteadas, 4 respostas vinculadas, cobertura 21,1%, mediana 11,1 min úteis, p95 276,8 min úteis, 9 pausas e 0 handoffs tipados. A medição é válida para diagnosticar cobertura, mas ainda não sustenta meta de desempenho nem expansão.
- `BOT-03` está concluído. `BOT-04` está publicado e mensurável, porém permanece aberto no gate: exigir cobertura ≥95%, autoria/vínculo confiáveis e nenhum P0/P1 vencido por 14 dias.
- Apps Script versão 83 e Netlify no commit `e941390`; endpoint HTTP 200 com `ok: true`; **528/528 testes locais aprovados**; `/lifting-facial/` fora do diff.

### Checkpoint `DAT-09` + `BOT-06` e fonte de `DAT-06`

- O commit `47ec00a` adicionou uma aplicação protegida por trava e pré-voo. A execução recusa qualquer lote com item em revisão e retorna somente agregados opacos.
- Backup anterior à planilha: [LEADS — backup antes de saúde e classificação — 2026-08-14 15h25](https://docs.google.com/spreadsheets/d/1TrI4-mvb84Z-q3lJvkDM9EyfR1AUC2lMmdUf68MaYj8/edit?usp=drivesdk).
- A aba oculta `_FUNIL_CANONICO` foi criada com 131 oportunidades ativas de Amanda e Daniel e zero item em revisão. Ela é a fonte técnica para a próxima migração, mas `Funil Comercial` e `Painel Econômico` continuam nas fórmulas anteriores; `DAT-06` não está concluído.
- `Saúde das Integrações` foi migrada para `IMPORT_GOOGLE_ADS`, recebeu intervalos compatíveis e passou a comparar CRM ativo com o funil canônico. A leitura independente de `B5:C11` encontrou zero `#VALUE!` ou outro erro; quatro checks de reconciliação ficaram em `OK` e o check de agenda permaneceu em `ATENÇÃO` por 32 horários passados ainda disponíveis.
- O painel passou de uma mistura de exclusões com erros para `Falhas técnicas de classificação`, calculada exclusivamente pela categoria `technical_failure`. A leitura atual é 9. `BOT-06` encerra a correção de definição/fórmula, mas não encerra esses nove incidentes.
- A comparação célula a célula confirmou `REGRA DE EDIÇÃO` em `A13`, a regra atual em `A14`, a data em `B15`, o indicador técnico em `D8:E8` do painel e a nova aba oculta; nenhum cabeçalho ou métrica vizinha foi perdido.
- Apps Script versão 85 no mesmo deployment; endpoint HTTP 200 com `ok: true`; **532/532 testes locais aprovados**; nenhuma campanha, Calendar, atribuição histórica, conteúdo do site ou característica de `/lifting-facial/` foi alterada.

### Checkpoint `OPS-03`

- Backup anterior à planilha: [LEADS — backup antes de expirar horários passados — 2026-08-14 15h50](https://docs.google.com/spreadsheets/d/1e8Z6zlbM4xLeJIQZJ8B9SUAJ6G2fJhOUR-J5KNu4pjE/edit?usp=drivesdk).
- A aplicação da versão 86 inspecionou 51 linhas de `Datas Consulta` e expirou 32 horários vencidos. O pós-voo mostrou zero horário passado ofertável.
- A comparação contra o backup encontrou exatamente 32 mudanças, todas na coluna `Status`, de `Disponível` para `Indisponível`. Nenhuma linha foi apagada e nenhuma data, hora, profissional, observação ou semana mudou.
- A manutenção passou a rodar junto da Central a cada 15 minutos. A função é idempotente, falha se os cabeçalhos obrigatórios estiverem ausentes e nunca altera status reservado, bloqueado, inválido ou futuro.
- `Saúde das Integrações` fechou em `OK / 0`. Apps Script versão 86 no deployment preservado; endpoint HTTP 200 com `ok: true`; **535/535 testes locais aprovados**; `/lifting-facial/` fora do diff.

### Checkpoint `BOT-05`

- Backup anterior à planilha: [LEADS — backup antes do reaper de classificação — 2026-08-14 16h00](https://docs.google.com/spreadsheets/d/1F_PQ4NwLVIHGn-sEjQ9GeEV69SFkl_Z48UUJ1pGegCY/edit?usp=drivesdk).
- A simulação inspecionou 88 jobs e encontrou zero `requeueable`, zero `deadLetterable` e 8 `attentionRequired`. A regra não permite reprocessar automaticamente `orphaned` ou `dead_letter`; esses estados são encaminhados à revisão.
- A aplicação protegida foi inócua: a fila principal permaneceu com 88 linhas e zero diferença de célula contra o backup; a fila de exceções permaneceu com 9 linhas e zero diferença porque os incidentes já existiam com a mesma chave idempotente.
- `BOT-05` está concluído quanto a lease, limite de tentativas, dead-letter e registro único de exceção. Os oito casos históricos permanecem backlog humano; o contador 170 foi preservado e não deve ser interpretado como 170 incidentes independentes.

### Checkpoint final `DAT-06`, Calendar, Google e governança externa

- O commit `7f2a5a4` migrou `Funil Comercial` e `Painel Econômico` para a fonte canônica. A execução protegida da versão 88 foi precedida pelo backup [LEADS — backup antes da migração dos painéis — 2026-08-14 17h30](https://docs.google.com/spreadsheets/d/1uXvGIrocEmVIyIij0S7JLWV2vXSCcMPOX60mVBtbcC8/edit?usp=drivesdk).
- Pré-voo: 131 oportunidades canônicas, 128 linhas elegíveis para o funil da Dra. Amanda, zero item em revisão e 2 linhas manuais órfãs. Aplicação: 128 linhas únicas, 2 órfãs arquivadas de modo reversível em `_FUNIL_MANUAL_ORFAOS` e total do painel igual a 128.
- O painel passou a mostrar 128 oportunidades, 32 qualificadas, 11 agendadas, 7 realizadas e 2 convertidas. A distribuição por plataforma fecha no mesmo total e inclui 25 entradas de WhatsApp direto, antes omitidas.
- O Calendar foi relido em janela delimitada de 01/07 a 30/09: os 10 registros da planilha com `ID do evento Google` existem no calendário correto e fecham 10/10 por ID exato. Oito outros eventos das salas não têm ID de consulta nem menção inequívoca à Dra. Amanda; permaneceram sem vínculo para evitar associação histórica falsa.
- O SLA corrente registra 21 entradas, 5 primeiras respostas mensuráveis e cobertura de 23,8%. Os 12 eventos humanos novos têm `Parent Event ID` existente e dentro da janela, sem vínculo ausente. O denominador de sete dias ainda inclui entradas anteriores à instrumentação; por isso `BOT-04` exige uma janela limpa e não deve ser “corrigido” por inferência.
- Em Google Ads, as configurações de aplicação automática estão em 0/7 e 0/14. A ação principal `Lead qualificado GCLID` mostra 3 conversões, última em 12/08, qualidade dos dados importados “excelente” e aviso apenas por ausência recente de dados de conversões otimizadas. O gate de sete dias continua obrigatório.
- O orçamento de lifting cervical permanece em R$ 23/dia, dentro da alteração autorizada em 13/08; nenhum novo aumento foi feito. Na Meta, um rascunho segue sem publicação e contém alteração de nome, posicionamento e público de um conjunto. Sem autoria inequívoca, ele não foi publicado nem descartado.
- `robots.txt` já contém blocos explícitos e independentes para `OAI-SearchBot` e `GPTBot`; `SEO-07` está concluído. O domínio antigo `.com` não resolveu DNS no checkpoint de 14/08, portanto a consolidação 301 depende de acesso ao registrador/Wix. A divergência de horários depende da confirmação do horário físico pela direção da LIV e não foi alterada por suposição.
- Validação local: **542/542 testes aprovados**, `git diff --check` limpo e `/lifting-facial/` fora do diff. A publicação da versão 88 preservou o deployment existente.
