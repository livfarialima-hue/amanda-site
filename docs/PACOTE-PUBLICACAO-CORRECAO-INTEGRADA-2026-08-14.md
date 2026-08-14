# Pacote de publicação da correção integrada — 14 de agosto de 2026

**Situação:** Apps Script publicado na versão 86; deduplicação, fases históricas, subconjunto seguro de consultas, reconciliação offline do Google Ads, observabilidade prospectiva Meta Site, painel humano/SLA, saúde das integrações, taxonomia de falhas e expiração segura da agenda aplicados; fonte canônica criada, mas Funil Comercial e Painel Econômico ainda não migrados; Google, cobertura Meta e cobertura do SLA permanecem em observação

Este manifesto separa o que está no repositório do que ainda depende de autorização e validação ao vivo.

## Commits que compõem o pacote

| Commit | Conteúdo |
|---|---|
| `f0ef62a` | gates estratégicos e contrato da correção |
| `60d9cc6` | identidade por oportunidade, fase canônica e consulta |
| `a8021e4` | reparos reversíveis, funil canônico, Google e atribuição Meta Site |
| `ec30d47` | bot fail-closed, eventos operacionais, SLA, filas, marcos e saúde sintética |
| `f5ffe76` | correções técnicas do site sem alteração de lifting facial |
| `0cba7a7` | executor agregado das simulações somente leitura |
| `6b9e676` | nove executores de diagnóstico para evitar o limite de tempo |
| `fe7cd27` | auditoria indexada, rápida e sem reparo implícito de cabeçalhos em `apply: false` |
| `b0da4b6` | deduplicação com trava exclusiva, rollback por grupo e IDs exatos de restauração |
| `d6cb72d` | executor autorizado de fases com trava, pré-voo fixo e pós-voo idempotente |
| `fc0785a` | auditoria e executor protegido da reconciliação segura de consultas e Calendar |
| `8dbe985` | reconciliação offline Google Ads com identidade exata, pré/pós-voo fixos e trava exclusiva |
| `7480022` | categoria e motivo de fallback na atribuição Meta Site, ledger prospectivo e sonda M26F02S sem PII |
| `e941390` | fonte humana vigente no painel e resumo operacional de primeira resposta, pausas e handoffs |
| `47ec00a` | funil canônico, saúde da integração na fonte vigente e classificação técnica separada de exclusões |
| `f40cc50` | expiração idempotente de horários passados e integração com a atualização periódica da Central |

O commit que contém este manifesto apenas fecha documentação e QA; ele também deve fazer parte do mesmo pacote aprovado.

## Componentes publicáveis

### Apps Script

**Publicado:** versão 86 em 14/08/2026. A versão 77 endureceu a deduplicação; a versão 78 acrescentou o executor protegido das fases; a versão 80 publicou o executor seguro de consultas; a versão 81 publicou a reconciliação offline Google Ads; a versão 82 preservou o deployment e publicou a observabilidade prospectiva Meta Site; a versão 83 tornou o painel humano e o SLA mensuráveis; a versão 85 preservou cabeçalhos e publicou funil canônico, saúde e taxonomia de falhas; a versão 86 publicou a expiração segura da agenda. O endpoint respondeu HTTP 200 com `ok: true` depois da publicação.

- identidade e fase canônicas;
- deduplicação arquivável/restaurável;
- reconciliações históricas e fonte `_FUNIL_CANONICO`;
- ledger/importação do Google Ads;
- persistência completa de `M26F02S`;
- eventos operacionais e auditoria de SLA;
- reaper e fila de exceções;
- marcos comerciais tipados;
- teste sintético sem dados de paciente.

### Netlify

- webhook que só responde automaticamente após rota única confirmada;
- remoção do fallback legado que autorizava resposta sem confirmação da planilha;
- registro dos eventos de resposta e handoff;
- execução diária do teste sintético de integração.

### Site estático

- dimensões explícitas de imagens;
- poster de vídeo nas páginas de otoplastia;
- diretiva explícita de GPTBot;
- teste de regressão técnica.

`/lifting-facial/` está excluída do lote e deve permanecer byte a byte sem alteração atribuível a este pacote.

### Planilha e Calendar — execução separada por bloco

A deduplicação foi autorizada e concluída isoladamente: 2 grupos, 3 linhas arquivadas e 3 IDs exatos de restauração, sem conflito ou rollback. Em outro bloco autorizado, 27 fases foram sincronizadas e a verificação independente confirmou zero divergência nas 131 oportunidades ativas. O bloco seguro de consultas seguinte avançou 3 fases e atualizou somente os metadados de 9 eventos existentes, sem alterar data/hora, criar eventos ou gerar duplicatas. Permaneceram bloqueados 26 registros sem oportunidade correspondente, 1 vínculo incompatível com o profissional, 1 evento com divergência de horário/metadados e 1 consulta sem link válido. O bloco Google Ads reconciliou 5/5 transações: normalizou 3 nomes na primeira aba, 5 nomes nas linhas visíveis elegíveis e reconstruiu 3 registros ausentes do ledger. O bloco do painel substituiu a fonte legada de autoria, preservou as métricas existentes e acrescentou uma linha de SLA ligada à nova aba oculta `_BOT_METRICAS`. O bloco posterior criou `_FUNIL_CANONICO` com 131 oportunidades ativas, corrigiu `Saúde das Integrações` e separou falha técnica das exclusões de negócio. Atribuição histórica, `Funil Comercial` e `Painel Econômico` não foram alterados.

### Plataformas de mídia — verificação separada

Não há neste pacote mudança de orçamento, palavra-chave, negativa, lance, público, criativo ou campanha. A conexão Google Sheets `LEADS` manteve cinco campos mapeados e importação diária. A execução automática anterior e a execução manual posterior à reconciliação concluíram 5 linhas com 0 erros. O status `Requer atenção` da ação não é considerado resolvido até o gate de sete dias, apesar do upload íntegro. Meta Site requer prova de rastreabilidade antes de qualquer teste de verba.

## QA concluído

- `npm.cmd test`: **535/535 aprovados** no estado final documentado.
- `git diff --check`: aprovado.
- `git diff --name-only -- lifting-facial`: vazio.
- fluxos ambíguos ou sem rota: silenciosos para o paciente e encaminhados à revisão;
- eventos novos de auditoria: sem texto de conversa, nome, telefone ou dado clínico;
- teste sintético: sem payload de paciente ou WhatsApp.

## Ordem de publicação quando autorizada

1. registrar versões e backups — **concluído**;
2. publicar Apps Script — **concluído na versão 85**;
3. executar e revisar todas as simulações — **concluído; lote integral reprovado antes de escrita**;
4. executar somente as migrações expressamente autorizadas — **deduplicação, fases, subconjunto seguro de consultas, Google Ads e expiração da agenda concluídos; demais blocos pendentes**;
5. reconciliar fórmulas célula a célula — **painel humano/SLA e Saúde concluídos; fonte canônica criada; Funil Comercial e Painel Econômico ainda pendentes**;
6. publicar Netlify e validar rotas/handoffs;
7. publicar o lote técnico do site e comprovar lifting intacto;
8. verificar Google Ads, Meta, Calendar, bot e painéis pelos gates do runbook.

## Limite da próxima autorização

A autorização deve declarar uma destas opções ou um subconjunto explícito: publicar Apps Script; executar migração de dados; alterar fórmulas; publicar Netlify; publicar site; importar conversões no Google; iniciar teste pago de Meta Site. Sem essa declaração, a ação permanece local.
