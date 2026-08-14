# Runbook da correção integrada — 14 de agosto de 2026

**Estado:** etapas 1 e 2 executadas em 14/08/2026; Apps Script versão 78 publicado; deduplicação e fases históricas da etapa 3 concluídas; publicação técnica e teste sintético da etapa 5 concluídos no commit `fc433da`

**Norte canônico:** `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`

## Regras que não podem ser quebradas

1. Uma oportunidade é identificada por `Opportunity ID` e profissional. Telefone só pode ser usado quando resolver uma única oportunidade de modo inequívoco.
2. Toda correção de dados começa em simulação. `apply: true` só pode ser executado depois da revisão do resultado e de uma autorização explícita para a etapa ao vivo.
3. Nenhuma importação de mídia recebe nome, telefone, e-mail, conversa, procedimento ou dado clínico.
4. `IMPORT_GOOGLE_ADS` permanece como primeira aba e cada conversão contém exatamente um entre GCLID, GBRAID e WBRAID.
5. Nenhum evento de Calendar é criado ou excluído em massa. Qualquer reversão usa apenas IDs exatos registrados durante a execução.
6. A página `/lifting-facial/` não recebe mudança de texto, layout, vídeo, CTA ou característica.
7. Publicar código, migrar planilha, ajustar painel, importar conversões e alterar mídia são autorizações distintas. Uma não implica a outra.

## Pré-condições para iniciar ao vivo

- Obter uma nova autorização que nomeie explicitamente os componentes permitidos.
- Confirmar que o repositório está limpo e que o commit local aprovado é o mesmo que será publicado.
- Registrar versões atualmente publicadas do Apps Script, Netlify e site.
- Criar cópia datada da planilha e exportar as fórmulas atuais de `Funil`, `Painel Econômico`, `Painel do Bot` e `Saúde das Integrações`.
- Registrar as contagens atuais por aba, por fase e por tipo de click ID; não persistir PII no relatório técnico.
- Confirmar que não há outra manutenção, importação ou edição em lote acontecendo ao mesmo tempo.

Se qualquer pré-condição falhar, parar antes da primeira escrita.

## Etapa 1 — Publicar somente a base do Apps Script

Publicar a versão aprovada do Apps Script, sem ainda executar reparos. Confirmar que as funções novas estão disponíveis e que o endpoint continua autenticado. Não publicar Netlify antes de o Apps Script aceitar os novos eventos operacionais.

Critério de continuação: endpoint saudável, nenhum erro novo e nenhuma mudança espontânea de dados.

## Etapa 2 — Executar todas as simulações

Executar na ordem abaixo e salvar somente os totais, conflitos e identificadores opacos do relatório:

```javascript
auditarIntegridadeFunilLocal_();
executarDeduplicacaoReversivelLeads({ apply: false });
reconciliarFasesHistoricasLeads({ apply: false });
reconciliarConsultasHistoricas({ apply: false });
reconciliarAtribuicaoHistoricaLeads({ apply: false });
reconciliarGoogleAdsLedgerEImportacao({ apply: false });
reconstruirFonteFunilCanonico({ apply: false });
executarReaperFilaClassificacao({ apply: false });
auditarSlaOperacional();
```

Reprovar a migração se houver identidade ambígua, conflito de fase equivalente, atribuição já preenchida em desacordo, mais de um click ID, transação duplicada não resolvida, Calendar sem vínculo único ou diferença material não explicada em relação ao diagnóstico anterior.

**Resultado de 14/08/2026:** as nove simulações terminaram com `apply: false` e reprovaram a aplicação integral. A deduplicação reversível foi depois autorizada isoladamente e concluída: 2 grupos, 3 linhas arquivadas, 0 conflito e 0 rollback. Em um segundo bloco autorizado, uma nova simulação confirmou 131 oportunidades, 27 fases reparáveis e zero conflito; a aplicação corrigiu as 27 e o pós-voo ficou com zero divergência. Consultas e atribuição continuam separadas por seus bloqueios. Ver `docs/EXECUCAO-SIMULACOES-CORRECAO-INTEGRADA-2026-08-14.md`.

## Etapa 3 — Aplicar os reparos reversíveis

Somente depois da revisão das simulações e da autorização específica de migração:

1. `executarDeduplicacaoReversivelLeads({ apply: true })` — arquiva a linha integral em `_LEADS_DUPLICADOS_ARQUIVO` antes de retirar o excesso. Guardar todos os `Backup ID`.
2. `aplicarReconciliacaoFasesHistoricasAutorizada()` — exige contagem e conflito idênticos ao pré-voo autorizado, sincroniza CRM e aba visível pelo caminho canônico e repete a auditoria; qualquer desvio bloqueia antes da escrita.
3. `reconciliarConsultasHistoricas({ apply: true })` — preenche somente vínculos únicos. Consultas encerradas não recriam eventos antigos.
4. `reconciliarAtribuicaoHistoricaLeads({ apply: true })` — preenche apenas campos vazios; qualquer divergência bloqueia a linha.
5. `reconciliarGoogleAdsLedgerEImportacao({ apply: true })` — reconcilia ledger e primeira aba por transação, sem afirmar aceite pelo Google.
6. `reconstruirFonteFunilCanonico({ apply: true })` — gera `_FUNIL_CANONICO` com uma linha por oportunidade ativa e sem PII.
7. `executarReaperFilaClassificacao({ apply: true })` — recupera leases expirados e move órfãos/tentativas esgotadas para a fila de exceção sem zerar tentativas.

Depois de cada item, repetir sua simulação. Se o segundo resultado não for idempotente ou surgir erro, parar a sequência.

**Execução de 14/08/2026:** item 1 concluído por `aplicarDeduplicacaoReversivelAutorizada`; os 3 `Backup ID` estão no registro de execução e a repetição foi idempotente. Item 2 concluído por `aplicarReconciliacaoFasesHistoricasAutorizada`: 27 reparadas, zero conflito, zero divergência no pós-voo e endpoint versão 78 saudável. Itens 3 a 7 permanecem pendentes de autorização por bloco.

## Etapa 4 — Reconciliar os painéis

Antes de editar qualquer fórmula, comparar as fórmulas ao vivo com o backup. As mudanças planejadas são:

- `Funil` e `Painel Econômico`: usar `_FUNIL_CANONICO`, não linhas com fórmulas aparentemente vazias.
- `Painel do Bot`: atendimento humano vem de `_WHATSAPP_ATENDIMENTO_HUMANO`; respostas e SLA vêm de `_WHATSAPP_OPERACAO_EVENTOS`; exceções vêm de `_WHATSAPP_CLASSIFICACAO_EXCECOES`.
- `Saúde das Integrações`: usar `IMPORT_GOOGLE_ADS`, não a referência antiga `IMPORT_GCLID`.

Aplicar célula a célula, registrar intervalos alterados e verificar que os totais representam oportunidades únicas. Não sobrescrever fórmula cuja intenção não esteja confirmada pela inspeção ao vivo.

## Etapa 5 — Publicar Netlify e site

1. Publicar Netlify com o webhook fail-closed e o monitor sintético.
2. Testar uma aquisição sintética sem dados reais: rota válida deve ser registrada; rota ausente ou ambígua deve ficar silenciosa para o paciente e entrar em revisão.
3. Confirmar que o evento operacional não contém mensagem, telefone, nome ou dado clínico.
4. Publicar o site estático somente com o lote técnico aprovado.
5. Validar `robots.txt`, dimensões de imagem, poster de vídeo, páginas de avaliação e otoplastia.
6. Comparar checksum/diff de `/lifting-facial/` com a versão anterior: deve permanecer idêntico.

O monitor diário comprova Netlify → Apps Script, autenticação, persistência e contratos. Ele não substitui um teste separado do provedor YCloud.

**Resultado de 14/08/2026:** Netlify e site publicados no deploy `6a7f2efadac1ed0008dffffa`, commit `fc433da`. O diagnóstico ficou saudável, as páginas técnicas responderam HTTP 200, a página `/lifting-facial/` permaneceu idêntica e o teste sintético sem dados de paciente concluiu persistência, classificação e handoff com resultado `ok`. Isso valida o caminho Netlify → Apps Script, mas ainda não prova entrega do provedor YCloud nem os gates longitudinais.

O checkpoint agregado posterior confirmou zero nova duplicidade. O bloco de fases autorizado em seguida eliminou as 27 divergências sem tocar nas 33 consultas sem `Opportunity ID`, na ausência de `_FUNIL_CANONICO` ou nas fórmulas legadas dos painéis. Portanto, os itens 3 a 7 da etapa 3 e a etapa 4 continuam sujeitos a simulação atualizada e autorização específica de escrita.

## Etapa 6 — Verificações externas

- Google Ads: conferir que `Lead qualificado GCLID` continua Principal/incluída, importar apenas linhas válidas, registrar aceite/rejeição por transação e observar sete dias. Não ativar tCPA, Performance Max, correspondência ampla ou aumento de orçamento durante o gate.
- Meta Site `M26F02S`: manter orçamento em zero até a rastreabilidade consentida estar comprovada. Um teste isolado de R$ 300 depende de autorização futura própria.
- Meta WhatsApp `M26F01W`: permanece controle; conversa reportada pela Meta não equivale a lead qualificado ou consulta sem reconciliação no CRM.
- Calendar: conferir novas consultas pelo `Opportunity ID` e ID exato do evento.
- Bot: revisar rotas, handoffs, respostas humanas, exceções e SLA sem ler ou expor mais conteúdo do que o necessário.

## Gates de aceite em produção

- Google: conversões aceitas e ação saudável por sete dias.
- Fases: 14 dias sem nova divergência entre CRM e aba visível.
- Consultas: pelo menos 95% das novas consultas reconciliadas com Calendar.
- Meta Site: pelo menos 80% de cobertura consentida do código `M26F02S` do clique à oportunidade.
- Bot: rota válida em pelo menos 99% dos eventos elegíveis; SLA calculável em pelo menos 95%; nenhum P0/P1 vencido.
- Dados: nenhuma nova duplicidade ambígua, nenhuma PII nas fontes de mídia e reexecuções idempotentes.

Falhar em um gate impede escala; não autoriza esconder o problema ajustando o denominador.

## Incidentes e resposta

| Severidade | Exemplo | Ação imediata | Dono operacional | Prazo |
|---|---|---|---|---|
| P0 | resposta ao paciente errado; rota/profissional incorreto; vazamento de PII; evento de Calendar indevido | pausar automação afetada, preservar evidência opaca e reverter a versão | Daniel + responsável técnico | imediato |
| P1 | duplicidade nova; fase divergente; fila órfã; import inválido; SLA sem cobertura | parar migração/escala, abrir exceção e reconciliar antes de retomar | responsável técnico, com validação de Daniel | mesmo dia |
| P2 | painel atrasado ou diferença de relatório sem efeito operacional | registrar, corrigir a fonte e validar na próxima rotina | responsável pelo painel | até dois dias úteis |

## Rollback

- Apps Script/Netlify/site: restaurar a versão publicada anterior já registrada; não criar um novo comportamento durante o rollback.
- Duplicidades: usar `restaurarLeadDuplicadoArquivado({ backupId: "ID_EXATO" })` para cada `Backup ID`; nunca restaurar por intervalo amplo.
- Fases e atribuição: restaurar a cópia datada da linha somente após comparar versão e `Opportunity ID`.
- Painéis: recolocar as fórmulas copiadas nos mesmos intervalos exatos.
- Calendar: excluir apenas eventos criados nesta execução e identificados pelo ID registrado; nunca fazer exclusão por data, nome ou pesquisa ampla.
- Google Ads: não reenviar transação já aceita. Corrigir e reenviar apenas rejeições identificadas pelo ID de transação.

Após qualquer rollback, executar novamente as simulações, a auditoria de integridade e a suíte local antes de reabrir automações.

## Registro obrigatório do fechamento ao vivo

Documentar: autorização recebida, commit publicado, versões anterior/nova, horários, totais antes/depois, conflitos não aplicados, IDs opacos de backup/eventos, testes executados, resultado dos gates, eventual rollback e próxima data de revisão. Não incluir PII/PHI.
