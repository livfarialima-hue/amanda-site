# Planilha LEADS e CRM

**Convenção de evidência:** leituras de schema, código e agregados são **fatos observados**; proporções são **cálculos**; riscos derivados são **inferências**; ações futuras são **hipóteses/propostas**; campos sem prova são **N/D**.

## Parecer

**[Fato observado | confiança alta]** A planilha canônica tem boas proteções estruturais — uma oportunidade por `Opportunity ID`, click IDs separados, deduplicação e ledgers —, mas ainda não representa atribuição cronológica completa. O risco principal não é uma fórmula isolada: é a coexistência de três significados diferentes sem campos próprios:

1. referência/plataforma inicial congelada no CRM;
2. atribuição visível potencialmente substituída por prioridade de canal;
3. origem da conversa atual calculada no webhook.

**[Inferência | confiança alta]** Relatórios que usam só a aba visível ou só o CRM podem chegar a respostas diferentes e ambas parecerem tecnicamente válidas.

## Inventário observado

| Aba/fonte | Grão | Campos de atribuição relevantes | Parecer |
|---|---|---|---|
| `Google Ads - Conversões` | linha visível de lead/oportunidade Amanda | referência, plataforma, campanha, criativo, CTA, destino, referência completa, GCLID/GBRAID/WBRAID, transaction ID, Opportunity ID | rica operacionalmente, mas pode ser sobrescrita por prioridade e mistura página com CTA |
| `_CRM_OPORTUNIDADES` | uma oportunidade/profissional | Opportunity ID, telefone/hash, aba/linha, estado/fase, referência inicial, plataforma inicial, três click IDs, data da trava, first/last Event ID, versão | congela origem inicial simplificada; não contém caminho, first/last touch completos ou confiança |
| `_WHATSAPP_EVENTOS` | evento de WhatsApp | Message/Event ID, rota e, nas colunas novas, categoria, fallback, referência e plataforma | melhor fonte prospectiva para perdas; instrumentação recente sem backfill |
| `IMPORT_GOOGLE_ADS` | uma conversão preparada por transaction ID | transaction ID, GCLID, GBRAID, WBRAID, nome, horário, valor, moeda | staging de importação; não é recibo de aceite |
| `_GOOGLE_ADS_EVENTOS` | evento de marco offline | Event/Opportunity/milestone, tipo/valor do click ID, conversão, transaction ID, estado, erro, timestamps | ledger interno; todos os cinco eventos vivos estavam `ready` |
| `Funil Comercial` | visão derivada por oportunidade | plataforma, campanha, criativo, CTA, destino e marcos comerciais | útil após migração canônica; herda limitações da atribuição visível |
| `Saúde das Integrações` | checks agregados | diferenças, conflitos e datas de última captura/preparo | saúde estrutural local, não Google externo nem atribuição causal |

## Evidência agregada viva

| Afirmação | Classe | Evidência | Limitação | Confiança |
|---|---|---|---|---|
| há 5 linhas em `IMPORT_GOOGLE_ADS` | fato observado | leitura da primeira aba | snapshot 15/08 | Alta |
| há 5 eventos `qualified_lead` em `_GOOGLE_ADS_EVENTOS`, todos `ready` | fato observado | leitura agregada do ledger | não comprova envio | Alta |
| 2/5 transaction IDs usam padrão opaco atual | cálculo | contagem por formato sem expor valor | universo atual pequeno | Alta |
| 3/5 usam formatos legados potencialmente pessoais/derivados | cálculo | 1 provider message ID + 2 IDs derivados legados | reversibilidade exata não foi testada para não expor dados | Alta para risco; média para reversibilidade |
| nome de conversão é exatamente `Lead qualificado GCLID` em 5/5 | fato observado | staging/ledger | nome correto não prova aceite | Alta |
| checks internos exibem zero diferença/conflito nos itens observados | fato observado | `Saúde das Integrações` | checks não incluem recibo Google nem first/last/path | Alta |
| `_WHATSAPP_EVENTOS` tem 689 eventos datados, mas só 16 com novas dimensões | fato observado | leitura agregada | sem backfill | Alta |
| nas 16 linhas instrumentadas há 14 uncoded, 1 ad Meta não mapeado, 1 Meta codificado e 0 M26F02S | cálculo | agregação por categoria | não usar como taxa histórica geral | Alta |

## Falha de consistência first/last

### CRM

Na criação, `_CRM_OPORTUNIDADES` grava `Referência inicial`, `Plataforma inicial`, GCLID/GBRAID/WBRAID e `Atribuição fixada em`. Em eventos posteriores, a rotina atualiza ponteiros/versão, não as dimensões iniciais. Isso é um bom guardrail contra sobrescrita silenciosa da origem inicial.

### Aba visível

`mergeLeadIntoExistingRow_()` compara uma prioridade fixa:

`Google (4) > Meta (3) > Orgânico/Conteúdo (2) > WhatsApp direto (1)`.

Se a entrada nova tiver prioridade maior, referência, plataforma, campanha, criativo, CTA e destino da linha visível são substituídos. Se não houver click ID ainda, o primeiro click ID recebido é preenchido.

**[Fato observado | confiança alta]** Essa regra não é first touch, last touch nem last non-direct touch. **[Inferência | confiança alta]** É possível ter referência visual de uma campanha posterior, click ID de outro momento e CRM com a referência inicial; a planilha não guarda o evento que explica essa composição.

### Correção proposta

- linha visível deixa de ser fonte mutável de verdade de atribuição;
- eventos de toque são append-only e ligados ao `Opportunity ID`;
- CRM materializa campos separados: inicial, conversa atual, último toque e último não direto;
- o funil escolhe explicitamente qual modelo exibir;
- acesso direto posterior nunca substitui origem paga anterior;
- mudança manual exige `source=human`, timestamp, motivo e versão.

## Qualidade dos campos atuais

| Campo atual | Problema | Decisão proposta |
|---|---|---|
| `Plataforma de aquisição` | granularidade insuficiente; valor pode mudar por prioridade | conservar como visão derivada, não fonte canônica |
| `Campanha` | existe na linha visível, ausente no CRM | persistir `campaign_code` no CRM/evento |
| `Criativo` | recebe C##H##, mas não ad ID | separar `creative_code`, `meta_ad_id`, `google_creative_id` |
| `CTA` | recebe o restante da referência, muitas vezes slug de página | separar `landing_page`, `cta_page`, `cta_location` e `page_code` |
| `Destino` | frequentemente “WhatsApp” | substituir/acompanhar por `conversion_path` enum |
| `Referência completa` | útil para auditoria, mas texto semântico/editável | manter somente durante dual-read; escrever token opaco novo |
| três colunas click ID | permitem leitura simples, mas exigem cardinalidade 1 | constraint e campo derivado `click_id_type` |
| `ID da transação` | mistura transporte WhatsApp e conversão de mídia em histórico | proibir provider/message IDs; somente ID opaco por marco |
| `Consentimento para contato` | conceito operacional distinto de consentimento de mensuração | nunca reutilizar como consentimento de analytics/ads |

## Google offline: preparado ≠ enviado ≠ aceito

| Estado | Evidência atual | Pode ser afirmado? |
|---|---|---|
| preparado | linha no staging e ledger `ready` | sim, 5 |
| enviado | execução/conexão histórica documentada; sem recibo por transação no corte | N/D no estado atual |
| aceito | sem receipt/status por transação | N/D |
| rejeitado | sem receipt/status por transação | N/D |
| duplicado pelo Google | sem receipt/status por transação | N/D |
| atribuído a campanha/conversão | sem diagnóstico externo por transação | N/D |

**P0:** suspender qualquer novo uso externo dos três transaction IDs legados até reconciliar recibos. Não simplesmente apagá-los ou gerar novos IDs: isso pode duplicar uma conversão já aceita.

## Migração segura proposta

1. **Baseline:** exportar apenas schema, contagens e hashes HMAC de controle; registrar versão/commit e recibos externos.
2. **Dry-run:** classificar cada transação em `accepted`, `rejected`, `not_sent`, `pending` ou `N/D`; N/D bloqueia a alteração.
3. **Contenção:** impedir que novos `wamid`, provider IDs, telefone ou derivação de telefone entrem em `ID da transação`.
4. **Novo write:** somente `LIV-<id opaco determinístico>` por oportunidade+marco.
5. **Legado não aceito:** substituir staging/ledger/linha visível atomicamente, com mapa de alias restrito.
6. **Legado aceito:** não reenviar; preservar somente no registro interno estritamente necessário e mascarado nas telas/logs.
7. **Schema:** criar tabela/aba de eventos de atribuição append-only antes de adicionar colunas duplicadas às abas visíveis.
8. **Dual-read:** ler referências antigas, escrever apenas contrato novo; medir cobertura por 14 dias.
9. **Cutover:** só após 100% de reconciliação por `Opportunity ID`, zero divergência nova e rollback ensaiado.

### Rollback

- backup nativo anterior, IDs exatos das linhas e versão do schema;
- nunca restaurar por posição de aba ou intervalo amplo;
- reverter consumidor/visão antes de reverter dados;
- transação aceita pelo Google nunca é reenviada;
- restauração por `Opportunity ID` + `transaction_id` exatos;
- reexecutar dry-run e checagens de cardinalidade após rollback.

## Fórmulas, enumerações e dashboards

**[Fato observado]** Os checks atuais informam zero diferença entre marcado/exportado, zero conflito de click IDs, zero telefone duplicado e zero diferença de oportunidades ativas versus funil canônico. **[Limitação]** Essas reconciliações validam estrutura e cardinalidade atuais, não a correção semântica da origem.

Propostas:

- enums com validação de dados, sem texto livre para origem/caminho/confiança/fallback/estado;
- fórmulas por cabeçalho, nunca por posição fixa de aba;
- `COUNTA`/filtros somente em IDs realmente preenchidos, sem fórmulas vazias;
- painel de perda por etapa: URL→CTA→conversa→evento→oportunidade→CRM→qualificação→consulta→procedimento;
- reconciliação diária por `Opportunity ID` e por transaction ID opaco;
- indicadores distintos: origem conhecida, campanha conhecida, caminho conhecido, Meta Site identificado, divergência LEADS/CRM, duplicidade e desconhecido;
- origem desconhecida é categoria, não zero e não “direto”.

## Recomendações autorizáveis

| ID | Prioridade | Pacote/fase | Mudança exata | Dependência | Teste | Guardrail/rollback |
|---|---|---|---|---|---|---|
| `A3-DAT-01` | P0 | A/1 | bloquear novos IDs de transação não opacos | recibos Google | teste de formato e cardinalidade | nunca reenviar aceito; flag de bloqueio |
| `A3-DAT-02` | P0 | D/6 | aprovar contrato do CSV antes de criar colunas | A3-ATTR-01 | revisão de duplicidade semântica | schema versionado/backup nativo |
| `A3-DAT-03` | P0 | C+D/4–6 | eventos append-only de toque + visões first/last/path | arquitetura aprovada | matriz multicanal e retorno | dual-write/dual-read |
| `A3-DAT-04` | P1 | D/6 | remover prioridade de plataforma como regra canônica | eventos de toque disponíveis | quatro sequências cruzadas | manter visão antiga comparativa 14 dias |
| `A3-DAT-05` | P1 | B+D/2–6 | estados externos e receipts no ledger Google | acesso Google Ads | reconciliação por transaction ID | não transformar ausência em rejeição/zero |
| `A3-DAT-06` | P1 | D/6 | enumerações e dashboards por Opportunity ID | contrato aprovado | QA de fórmulas/cabeçalhos | não depender da posição fixa da aba |

## Evidências

| Fonte | Data/hora/fuso | Método/período | Limitação | Confiança |
|---|---|---|---|---|
| planilha canônica LEADS | 15/08/2026, hora exata N/D, BRT | leitura somente leitura de metadados, cabeçalhos e agregados | nenhum dado pessoal foi reproduzido | Alta |
| Apps Script canônico v89 registrado | alvo verificado em 14/08; código lido 15/08 09:50 BRT | leitura de `production-target.json`, README e fontes | sem execução/escrita | Alta |
| documentos de execução de 14/08 | 14–15/08/2026 BRT | leitura documental | fatos históricos não substituem receipt atual | Média/alta |
| suíte local | 15/08/2026 09:51 BRT | 570/570 | não prova produção externa | Alta para contrato |

**Nenhuma coluna, fórmula, validação, aba, dado ou configuração foi alterada.**
