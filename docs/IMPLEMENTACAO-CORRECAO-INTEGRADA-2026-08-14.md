# Implementação da correção integrada — 14 de agosto de 2026

**Estado:** base do Apps Script publicada na versão 77; deduplicação reversível aplicada e validada; Netlify e site publicados no commit `bf95bb4`; teste sintético aprovado; fases históricas, funil, consultas, atribuição e fórmulas ainda não migrados

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

O procedimento de publicação, migração e rollback está em `docs/RUNBOOK-CORRECAO-INTEGRADA-2026-08-14.md`. O inventário exato do pacote está em `docs/PACOTE-PUBLICACAO-CORRECAO-INTEGRADA-2026-08-14.md`.

## Gates que permanecem externos

A aprovação deste trabalho local não prova os gates de produção. Depois da autorização de publicação, a observação deve demonstrar: sete dias de conversão Google saudável; 14 dias sem nova divergência CRM–aba; pelo menos 95% de reconciliação de novas consultas com Calendar; pelo menos 80% de cobertura consentida para `M26F02S`; SLA calculável em pelo menos 95% das novas conversas e nenhum P0/P1 vencido.

## Publicação e validação do Netlify — 14/08/2026

- A branch pública `reestruturacao-site` foi atualizada de `3955095` para `bf95bb4` após confirmação explícita do escopo; o worktree local e a origem ficaram iguais.
- O Netlify publicou o deploy de produção `6a7f2c57550d2700084f51f3` a partir do commit `bf95bb4`.
- O diagnóstico público confirmou `ok`, automação ativa, Sheets, secret, OpenAI e alerta de revisão configurados.
- Página inicial, avaliação facial, otoplastia adulta, otoplastia infantil, lifting facial e `robots.txt` responderam HTTP 200.
- `/lifting-facial/` permaneceu idêntica ao arquivo local depois de normalizar somente quebras de linha; nenhum texto, layout, vídeo, CTA ou característica mudou.
- O monitor `synthetic-integration-health` foi executado manualmente porque o horário diário já havia passado. A aba oculta `_INTEGRATION_HEALTH_SYNTHETIC` registrou um único teste sem PII/PHI, com persistência, contrato de classificação, handoff e resultado final `ok`.
- A publicação não alterou campanhas, Calendar, fases históricas, atribuição histórica ou fórmulas dos painéis.

### Checkpoint agregado após a publicação

- O CRM contém 141 oportunidades: 128 de Amanda, 3 de Daniel e 10 arquivadas ou de outros fluxos. As abas visíveis contêm exatamente 128 e 3 IDs únicos, respectivamente, sem nova duplicidade.
- Permanecem 27 divergências de fase entre CRM e aba visível; nenhuma foi corrigida neste checkpoint.
- `Consultas` contém 43 registros: 10 com `Opportunity ID` e ID de evento Google; 33 sem `Opportunity ID`, sendo 22 encerrados e 11 ativos ou sem desfecho inequívoco.
- `_FUNIL_CANONICO` ainda não existe. `Saúde das Integrações` continua referenciando `IMPORT_GCLID` e contém uma fórmula `#VALUE!` por intervalos de tamanhos diferentes.
- No recorte de sete dias, `Painel do Bot` registra 198 mensagens recebidas, 41 pessoas, 173 mensagens humanas, 2 pendências vencidas e 8 erros de classificação. A métrica antiga “Conversas assumidas” ainda lê `_WHATSAPP_ATENDIMENTO` e mostra zero, portanto não deve ser usada.
- Esses números foram lidos diretamente da planilha em `America/Sao_Paulo`, sem exportação de nome, telefone, e-mail, conversa ou dado clínico. Eles confirmam a ordem do próximo bloco, mas não autorizam as escritas históricas.
