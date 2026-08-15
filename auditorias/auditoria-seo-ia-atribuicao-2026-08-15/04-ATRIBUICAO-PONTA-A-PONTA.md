# Atribuição ponta a ponta

**Escopo:** origem → anúncio/referência → URL → site → CTA → WhatsApp → YCloud/webhook → bot → `LEADS` → `_CRM_OPORTUNIDADES` → qualificação → consulta → procedimento → conversão offline.

**Data de corte:** 15/08/2026, `America/Sao_Paulo`. **Repositório:** branch `reestruturacao-site`, commit observado `ea00bd2ab0f9`; havia arquivos de auditoria não rastreados, sem alteração de produto nesta frente. **Modo:** leitura de código/documentos, leitura agregada e anonimizada da planilha canônica, inspeção autenticada somente leitura e testes locais sem contato real.

**Convenção de evidência:** descrições literais de código, configuração, documento ou planilha são **fatos observados**; razões matemáticas são **cálculos**; conclusões sobre efeito são **inferências**; desenhos futuros são **hipóteses/propostas**; ausência de prova é **N/D**. A classe explícita prevalece quando indicada.

## Parecer

- **[Fato observado | confiança alta]** O caminho técnico preserva, na mesma sessão, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `origem` e um entre `gclid`/`gbraid`/`wbraid`; o CTA acrescenta uma referência e os click IDs disponíveis ao texto do WhatsApp.
- **[Fato observado | confiança alta]** Não há campos distintos e ponta a ponta para `first_touch`, `last_touch`, `last_non_direct_touch`, caminho, landing page, página do CTA, primeiro acesso, campanha/conjunto/anúncio/criativo Meta em IDs separados, confiança e motivo de perda.
- **[Fato observado | confiança alta]** A atribuição web fica em `sessionStorage`, sem envelope com data/TTL e com sobrescrita campo a campo. Funciona na navegação da mesma aba; não comprova retorno posterior, nova sessão ou nova aba.
- **[Fato observado | confiança alta]** A linha visível pode ter a atribuição substituída por prioridade de plataforma (`Google > Meta > Orgânico/Conteúdo > WhatsApp direto`), enquanto o CRM congela somente referência, plataforma e click IDs iniciais. Não é um modelo cronológico de primeiro/último toque e pode produzir divergência semântica entre as fontes.
- **[Fato observado | confiança alta]** As cinco conversões offline observadas estão apenas em estado interno `ready`. Duas usam transação opaca atual e três usam formatos legados potencialmente pessoais ou derivados. Sem recibo do Google, `enviado`, `aceito`, `rejeitado` e `atribuído` são **N/D**.
- **[Inferência | confiança alta]** A atribuição serve hoje para diagnóstico de uma conversa quando o código permanece intacto; não sustenta, com confiança, a origem de cada paciente ao longo de múltiplas sessões e sistemas.

**Confiabilidade atual:** **baixa para atribuição ponta a ponta e retorno posterior; média para classificação prospectiva de uma conversa codificada na mesma sessão; alta apenas para os contratos locais exercitados pela suíte.**

## Fluxo observado e ponto de perda

| Etapa | Fato observado | Preservado | Ponto de perda/ambiguidade | Confiança |
|---|---|---|---|---|
| Anúncio → URL | Meta Site observado com `origem`, `utm_source`, `utm_medium`, `utm_campaign` e `utm_content`; Google documentado com ValueTrack mais amplo | campanha e código de criativo Meta; código G26 e click ID Google quando presentes | site não lê `utm_id`, `utm_adgroup`, `utm_term`, `matchtype`, `device`, `network`, `loc_physical_ms`; Meta não entrega IDs separados de conjunto/anúncio | Alta para contrato; média para todas as campanhas ao vivo |
| URL → armazenamento | `readAttributionFromUrl()` usa lista fechada; `saveAttribution()` mescla e sobrescreve parâmetros recebidos | UTMs limitadas e click ID | sem timestamps, TTL efetivo, primeiro/último toque ou histórico; campanha posterior substitui campos anteriores | Alta |
| Navegação | `sessionStorage` mantém dados na mesma aba/origem | mesma sessão e mesma aba | nova aba, novo navegador e retorno posterior não comprovados; expira ao encerrar contexto de sessão | Alta |
| CTA → WhatsApp | somente `a[data-track="whatsapp"]`; mensagem recebe `Ref.` e click ID | campanha/código, criativo em `utm_content`, código da página | `data-cta-location` não entra na referência; landing e página real do clique não entram; texto é editável | Alta |
| WhatsApp direto Meta | webhook usa referral `source_id`; dois anúncios têm mapa explícito | anúncio conhecido → M26F01W + criativo | anúncio novo/não mapeado vira `meta_ad_id`; conjunto não é preservado | Alta |
| WhatsApp → webhook | parser reconhece M26, G26, códigos legados e click IDs rotulados | referência, plataforma, categoria, fallback, click ID | remoção/edição do código; ausência de referral no caminho pelo site | Alta |
| Webhook → LEADS | `writeLead_` grava plataforma, campanha, criativo, campo chamado CTA, destino e referência completa | uma fotografia de atribuição na linha visível | o sufixo de página pode ser rotulado como CTA; não há caminho/landing/CTA-page/first/last | Alta |
| Recontato/merge | dedupe por evento/mensagem e resolução por telefone/oportunidade | evita inserção duplicada em casos cobertos | prioridade de plataforma sobrescreve linha visível; click ID é preenchido apenas se os três estiverem vazios | Alta |
| LEADS → CRM | CRM cria oportunidade e congela referência/plataforma/click IDs iniciais | origem inicial simplificada | não guarda origem atual, caminho, campanha/conjunto/anúncio/criativo normalizados, confiança ou perda | Alta |
| Qualificação → Google | gera evento `qualified_lead`, nome canônico e exatamente um click ID | transação determinística nova por oportunidade+marco | IDs legados são preservados quando a linha já está marcada; estado só `ready` | Alta |
| Google Ads | conexão/importação anterior documentada sem erro de linha | arquivo preparado | recibo por transação, aceite e atribuição não foram observados neste corte | N/D |

## First touch, last touch e caminho

| Conceito | Estado atual | Risco |
|---|---|---|
| Origem inicial | referência/plataforma/click IDs congelados no CRM ao criar a oportunidade | não contém dimensões suficientes e pode nascer já incompleta |
| Origem da conversa atual | inferida no webhook a cada mensagem, mas não modelada como campo canônico no CRM | retomada direta pode parecer origem da oportunidade ou desaparecer |
| Last touch | inexistente como registro cronológico | uma prioridade fixa de canal é usada no lugar de tempo |
| Last non-direct touch | inexistente | retorno direto não pode ser relacionado com confiança à última campanha conhecida |
| Caminho de conversão | inexistente | Meta direto e Meta→site dependem do significado do código, não de campo próprio |
| Confiança/fallback | existe prospectivamente no ledger de eventos do WhatsApp; não chega como dimensão canônica ao CRM | operação não distingue observado, inferido e desconhecido em todo o funil |

**[Inferência | confiança alta]** Um contato direto posterior não sobrescreve a referência inicial no CRM, o que é positivo, mas a linha visível pode mudar por prioridade e não existe um registro separado da conversa atual. A reconciliação entre as duas fontes não é explicável sem consultar histórico técnico.

## Google Ads, G26 e conversão offline

### Contrato observado

- **[Fato observado]** O código aceita exatamente um entre GCLID, GBRAID e WBRAID, com precedência de ingestão nessa ordem quando mais de um valor chega.
- **[Fato observado]** `Lead qualificado GCLID` é o nome canônico exato, embora aceite os três tipos de click ID.
- **[Fato observado]** O ID atual é `LIV-` + digest truncado de `Opportunity ID|milestone`, determinístico e sem PII evidente.
- **[Fato observado]** Linhas antigas já marcadas para envio preservam o transaction ID existente; por isso três dos cinco registros ao vivo continuam em formatos legados potencialmente pessoais/derivados.
- **[Cálculo]** 3/5 = **60%** das transações preparadas observadas exigem contenção e decisão de migração; 2/5 = **40%** usam o padrão opaco atual. A amostra é o universo atual do staging observado, não uma taxa histórica geral.
- **[Fato observado]** Os cinco eventos estão em `ready`, sem erro local. **[Limitação]** `ready` significa preparado, não enviado/aceito/atribuído.
- **[Fato observado]** GBRAID/WBRAID têm suporte em código e testes, mas os cinco registros vivos observados eram GCLID; prova real para os demais tipos é **N/D**.

### Códigos inventariados

| Família | Significado confirmado | Estado |
|---|---|---|
| `G26...` | Google Ads/campanha; `G26ADS` é fallback quando há clique pago sem código resolvido | atual |
| `M26F01W` | Meta Ads → WhatsApp direto; controle estratégico | atual |
| `M26F02S` | Meta Ads → site → WhatsApp; orçamento novo bloqueado até gate | atual, atribuição real não comprovada |
| `LC##`, `LF##`, `BF##` | referências Google legadas reconhecidas pelo webhook | legado; manter dual-read durante migração |
| `WA-...` / `wamid` em transaction ID | identidade técnica histórica ligada ao transporte WhatsApp | legado crítico; não reutilizar em novos eventos |

## Testes executados com segurança

| Teste | Entrada/método | Esperado | Observado | Status/limitação |
|---|---|---|---|---|
| Suíte local | `npm.cmd test` em 15/08/2026 | contratos sem regressão | 570/570 aprovados | fato observado; não prova produção externa |
| Meta Site sem consentimento | teste automatizado com M26F02S e navegação na mesma sessão | código permanece no CTA | passa e evita prefixo duplicado | prova local |
| Meta com criativo e página | parser/webhook local | campanha, criativo e página separáveis | passa | prova local; “página” ainda cai no campo visível CTA |
| Meta direto conhecido | referral sintético com anúncio mapeado | M26F01W + criativo | passa | prova local; mapa cobre só dois IDs |
| Meta direto desconhecido | referral sintético não mapeado | `meta_ad_id` + fallback | passa | prova local; um caso agregado real foi observado |
| Google GCLID/GBRAID/WBRAID | testes locais | exatamente um ID, evento único | passa | produção real observada apenas com GCLID |
| Duplicidade de webhook | testes de retry/event ID | sem segunda linha/envio | passa | contrato local; taxa real longitudinal N/D |
| Retorno posterior | nova sessão/armazenamento perdido | origem inicial recuperável | não há mecanismo | reprovado por inspeção de código |
| First/last touch | duas campanhas em sequência | campos separados e cronológicos | sobrescrita de sessão/prioridade de plataforma | reprovado por inspeção de código |
| Aceite no Google | recibo por transação | `accepted`/`rejected`/`attributed` | não observado | pendente/N/D |
| Meta Site real até CRM | clique real autorizado sem lead falso | campanha+conjunto+anúncio+criativo+landing+CTA em LEADS/CRM | nenhuma coorte real instrumentada suficiente | pendente; não executar sem autorização |

## Perdas críticas e recomendações

| ID | Prioridade | Trilha/pacote/fase | Problema e evidência | Mudança exata proposta | Teste/guardrail | Rollback |
|---|---|---|---|---|---|---|
| `A3-PRIV-01` | P0 | T3/A/1 | logs registram fragmento de telefone, IDs do provedor e, em um fluxo, procedimento correlacionado ao evento | substituir logs por `correlation_id` opaco; remover `patientLast4`/`senderLast4`; não logar `messageId`/`eventId` brutos nem procedimento/interesse | varredura automatizada e teste de log sem PII/PHI; raw provider ID só em armazenamento protegido indispensável | feature flag do logger e retorno à versão anterior sem reintroduzir campos proibidos |
| `A3-GADS-01` | P0 | T3+A/1 | 3/5 transaction IDs legados potencialmente pessoais/derivados; recibos N/D | conter exportação, reconciliar recibos por transação; substituir apenas itens não aceitos por ID `LIV-` opaco; nunca reenviar item aceito | dry-run, cardinalidade 1:1, zero duplicidade, recibo antes/depois | mapa de alias restrito e restauração somente por ID exato |
| `A3-PRIV-06` | P0 | T3/A/1 | GA4 `whatsapp_click` inclui path/tipo/grupo/texto/posição potencialmente semânticos; política afirma não enviar procedimento | reduzir payload a evento genérico não semântico e alinhar política após revisão de privacidade | captura de rede/DebugView sem paciente; zero path/procedure/CTA text | reverter evento inteiro, não restaurar parâmetros sensíveis |
| `A3-ATTR-01` | P0 | T3/C/4 | first/last/path ausentes; merge por prioridade | criar envelope versionado com `first_touch`, `last_touch`, `last_non_direct_touch`, `conversation_origin`, `conversion_path`, timestamps, confiança e fallback; escrita append-only | matriz de 25 cenários; direto posterior nunca altera first touch | dual-read e flag para voltar a ler schema anterior |
| `A3-META-01` | P0 | T3/C+G/4 | Meta Site não leva conjunto/anúncio nem prova caminho completo | parâmetros Meta estáveis para campaign/adset/ad/creative; capturar e transportar de modo minimizado; campo explícito `meta_site_to_whatsapp` | teste controlado com todos os IDs fornecidos e consistência LEADS/CRM | manter M26F01W controle e pausar M26F02S |
| `A3-META-02` | P0 | T3/C/4 | sessão não cobre retorno posterior/nova aba | persistência first-party com TTL documentado e consentimento/base definidos; conservar first touch sem sobrescrita | mesma aba, outra página, nova aba, retorno, recusa, perda de storage | desligar persistência nova e manter leitura de sessão |
| `A3-DATA-01` | P1 | T4/D/6 | CRM inicial é reduzido e a linha visível pode divergir | aprovar contrato de dados antes de colunas; CRM guarda dimensões canônicas e eventos de toque | reconciliação 100% por `Opportunity ID`; nenhuma coluna duplicada | migração reversível por versão do schema |
| `A3-DATA-02` | P1 | T3+C/4 | prioridade de canal substitui cronologia | retirar regra de sobrescrita como fonte de verdade; materializar visões derivadas separadas | teste Google→Meta, Meta→direto, orgânico→pago e retorno | manter rotina antiga atrás de flag somente durante dual-write |
| `A3-GADS-02` | P1 | T3/C+G/5 | ValueTrack amplo chega à URL, mas o site ignora várias dimensões | capturar `utm_id`, `utm_adgroup`, `utm_term` e dimensões técnicas necessárias, com validação e minimização | GCLID/GBRAID/WBRAID, parâmetros incompletos e código inválido | ignorar novos campos mantendo click ID canônico |
| `A3-OBS-01` | P1 | T7/B+G/2 | `ready` não distingue envio/aceite/atribuição | ledger com estados `prepared`, `sent`, `accepted`, `rejected`, `duplicate`, `attributed`, recibo e erro limitado | reconciliar totais e transições válidas; ausência nunca vira zero | parar consumidor e preservar staging/ledger |
| `A3-CONS-01` | P1 | T7/B/2 | guia de tráfego contradiz Norte, política e código sobre click ID sem consentimento | decidir base e contrato com revisão jurídica/LGPD; alinhar documentação e testes sem burlar consentimento | teste antes/aceite/recusa/revogação; nenhuma tag antes do aceite | restaurar versão documental anterior se a implementação não mudar |

## Ordem recomendada

1. **Conter PII/IDs legados e logs** (`A3-PRIV-01`, `A3-GADS-01`).
2. **Criar observabilidade e recibos** (`A3-OBS-01`) antes de migrar ou reenviar qualquer conversão.
3. **Aprovar contrato de dados** e o modelo cronológico (`A3-ATTR-01`, `A3-DATA-01`, `A3-DATA-02`).
4. **Implementar e testar Meta Site isoladamente** (`A3-META-01`, `A3-META-02`), mantendo verba nova em zero.
5. **Completar Google/ValueTrack** e só depois avaliar lances ou escala.

## Evidências

| ID | Fonte | Data/hora/fuso | Método/período | Limitação | Confiança |
|---|---|---|---|---|---|
| `E-A3-01` | `campanhas/conversion-tracking.js`, `tracking-loader.js`, `tracking-config.js` | 15/08/2026 09:50 BRT | leitura estática do commit observado | produção pode divergir; documentos indicam publicação recente compatível | Alta |
| `E-A3-02` | `netlify/functions/ycloud-webhook.mjs` | 15/08/2026 09:50 BRT | leitura de parser, classificação, logs e transporte | não dispara provedor real | Alta |
| `E-A3-03` | Apps Script canônico `Code.gs`, `OpportunityStore.gs`, `LeadClassification.gs` | 15/08/2026 09:50 BRT | leitura integral dirigida das rotinas | sem escrita/execução ao vivo | Alta |
| `E-A3-04` | `LEADS`: `IMPORT_GOOGLE_ADS`, `_GOOGLE_ADS_EVENTOS`, `_CRM_OPORTUNIDADES`, `_WHATSAPP_EVENTOS`, `Saúde das Integrações` | 15/08/2026, hora exata N/D, BRT | leitura agregada/anonimizada do estado atual | sem conteúdo de paciente; recibos de plataforma ausentes | Alta para contagens/estado local |
| `E-A3-05` | `NORTE-ESTRATEGICO-GOOGLE-ADS.md`, runbook e implementação de 14/08 | 15/08/2026 09:50 BRT | leitura documental; fatos históricos nos períodos declarados | documentação não substitui estado ao vivo | Alta para decisões; média para execução histórica |
| `E-A3-06` | suíte local | 15/08/2026 09:51 BRT | `npm.cmd test`, 570 testes | teste local não prova Meta/YCloud/Google/CRM reais | Alta para contrato local |

## Limitações

- Nenhuma conversa real, CTA de WhatsApp, webhook, lead ou conversão foi gerado nesta auditoria.
- O painel Meta autenticado não expôs de forma estável todos os campos durante esta leitura; os parâmetros atuais da URL Meta Site foram observados, e a configuração detalhada de 13/08 foi usada como evidência histórica complementar.
- Não houve recibo por transação do Google Ads; aceitação e atribuição permanecem **N/D**.
- Não há coorte real suficiente após a instrumentação de 14/08 para medir cobertura do Meta Site.
- Ausência de registro não foi convertida em zero.

**Nenhuma recomendação foi implementada.**
