# Registro de evidências

Data da coleta: 15/08/2026
Fuso principal: America/Sao_Paulo
Política: nenhuma amostra contém nome, telefone, e-mail, mensagem literal, dado clínico ou ID reversível de paciente.

## Escala de evidência

- **Fato observado:** leitura direta da fonte indicada.
- **Cálculo:** transformação reproduzível de fatos observados.
- **Inferência:** interpretação sustentada, mas não observação direta da causa.
- **Hipótese:** explicação ou melhoria a testar.
- **N/D:** fonte ausente, cobertura insuficiente ou medida não segura.

Confiança alta não transforma inferência em fato nem N/D em zero.

## Fontes e métodos

| ID | Fonte | Data/hora e fuso | Método/período | Evidência usada | Limitação | Confiança |
|---|---|---|---|---|---|---|
| EV-001 | Repositório local, branch `reestruturacao-site`, commit-base `ea00bd2` | 15/08/2026 BRT | inspeção somente leitura de Git, arquivos e histórico relevante | baseline limpo antes da pasta de auditoria; stack, rotas, tracking, bot, webhook, Apps Script e documentação | código local não prova versão pública sem comparação/deploy metadata | alta para o snapshot local |
| EV-002 | `AGENTS.md` e `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` | 15/08/2026 BRT | leitura integral | Norte canônico, gates M26F02S/Google offline, códigos, regras de publicação e ausência de trava absoluta em `/lifting-facial/` | estratégia pode mudar futuramente apenas com atualização canônica autorizada | alta |
| EV-003 | suíte local `npm.cmd test` | 15/08/2026 BRT | execução não destrutiva | 570 testes aprovados, zero falha | não inclui prova ponta a ponta em plataformas/produção | alta para contratos locais; baixa para live |
| EV-004 | site público `https://draamandaschroeder.com.br/` e URLs inventariadas | 15/08/2026 BRT | HTTP/HTML, navegador e inspeção mobile não destrutiva | status, canonical, robots, sitemap, metadados, CTA, schema e recursos por URL | laboratório/HTTP não substituem Core Web Vitals de campo | conforme `01-INVENTARIO-DE-URLS.csv` |
| EV-005 | Google Search público | 15/08/2026 BRT | consultas diagnósticas de marca/procedimentos | resultado antigo do domínio Wix ainda aparece na superfície de busca | o host antigo não resolveu no HTTP/Chrome durante a coleta; o resultado pode ser índice desatualizado; impacto é inferência | alta para o resultado; N/D para disponibilidade atual do host |
| EV-006 | Google Search Console | 15/08/2026 BRT | tentativa de acesso atual; sem sessão autenticada disponível para esta frente | cobertura, canonicals escolhidos, desempenho 28/90 dias e CWV atuais = N/D | existe snapshot autenticado anterior, mas não deve ser apresentado como coleta atual | N/D para o estado atual |
| EV-007 | GA4 | snapshot anterior de 13/08/2026 BRT, janela 16/07–12/08 | leitura autenticada anterior, usada apenas como sinal histórico em páginas específicas | sessões/eventos consentidos e landing pages do snapshot anterior | não é coleta de 15/08; subconta por consentimento; não reconcilia sozinho com CRM | média como contexto histórico |
| EV-008 | planilha LEADS live, ID canônico do ambiente de produção | 15/08/2026 BRT | conector Sheets, metadados e faixas sem PII | 40 abas; `IMPORT_GOOGLE_ADS` é a primeira; cabeçalhos, contagens e cobertura de campos | snapshot mutável; dados operacionais podem mudar após a coleta | alta para o instante |
| EV-009 | aba operacional da Dra. Amanda e CRM | 15/08/2026 BRT | agregação por Opportunity ID, plataforma, status e cobertura | 130 oportunidades em cada projeção; plataformas/status reconciliados no recorte; cobertura incompleta de campanha/criativo/CTA | reconciliação estrutural não prova correção semântica de cada origem | alta para contagens; média para semântica |
| EV-010 | `_GOOGLE_ADS_EVENTOS`, `IMPORT_GOOGLE_ADS` e `IMPORT_GCLID` | 15/08/2026 BRT | leitura somente leitura de schema/estado e análise de formato sem persistir valores | 5 eventos `ready`; nome canônico; 3/5 IDs legados potencialmente derivados/reversíveis | sem recibos por evento: enviado/aceito/rejeitado/atribuído = N/D | alta para staging; N/D para resultado externo |
| EV-011 | `_WHATSAPP_EVENTOS` | 15/08/2026 BRT | agregação não identificável | 689 eventos no recorte observado; novos campos de classificação/atribuição preenchidos em apenas 16 | instrumentação é recente e não tem backfill; não calcular taxa histórica a partir de 16/689 | alta |
| EV-012 | código `campanhas/conversion-tracking.js` e `tracking-loader.js` | 15/08/2026 BRT | revisão estática e testes existentes | captura reduzida de UTMs/código/click IDs em `sessionStorage`; lacunas de TTL, retorno, múltiplas abas, referrer, landing/CTA e first/last/path | comportamento de navegadores/plataformas reais requer sonda | alta para o código |
| EV-013 | `netlify/functions/ycloud-webhook.mjs` | 15/08/2026 BRT | revisão estática | parser G26/M26/SITE, mapa Meta parcial, fallbacks e logs com fragmento de telefone/IDs de provedor | incidência real em logs externos e retenção não foram quantificadas | alta para existência; N/D para volume |
| EV-014 | Apps Script `Code.gs`, `OpportunityStore.gs`, `LeadClassification.gs` | 15/08/2026 BRT | revisão estática + schema live | projeção reduzida de atribuição; ranking de plataforma pode atualizar aba visível; CRM conserva referência/plataforma inicial, mas não ledger rico de toques | comportamento exato sob concorrência requer teste em cópia | alta |
| EV-015 | `tracking-config.js`, página de privacidade e código de pixels | 15/08/2026 BRT | comparação documentação ↔ implementação | configuração se declara avançada, mas tags carregam só após aceite; texto sobre evento Meta/WhatsApp diverge do código | conclusão jurídica sobre base/necessidade exige revisão especializada | alta para drift técnico |
| EV-016 | Google Ads/Meta Ads autenticados | 15/08/2026 BRT | somente leitura, validação de parâmetros/URLs quando necessário | códigos/rotas e estado das conversões usados na análise de atribuição | objetos e histórico podem mudar; nenhuma configuração foi alterada | conforme relatórios 04/05 |
| EV-017 | Resolução CFM 2.336/2023 e exposição de motivos oficiais | 15/08/2026 BRT | leitura da fonte primária | regras de publicidade médica, imagens, antes/depois, anonimato, autorização e contextualização; discussão sobre preços individualizados | enquadramento de páginas concretas é inferência e deve ser validado por Codame/jurídico; art. 9 VII não deve ser citado isoladamente como proibição literal de preço | alta para o texto; média para aplicação jurídica |
| EV-018 | Documentação oficial da OpenAI sobre crawlers | 15/08/2026 BRT | leitura da página oficial vigente | OAI-SearchBot (pesquisa), GPTBot (treinamento) e ChatGPT-User (ação do usuário) têm finalidades distintas; controles são independentes | permitir crawler não garante indexação ou citação | alta |
| EV-019 | Documentação oficial Google Search Central | 15/08/2026 BRT | leitura de crawl/indexação/canonical/sitemap/CWV | critérios técnicos e distinção entre laboratório/campo | documentação não prova estado específico do site | alta |
| EV-020 | Documentação oficial Microsoft/Bing/IndexNow, Meta, Schema.org e demais mecanismos | 15/08/2026 BRT | consulta às fontes primárias listadas nos relatórios | finalidade de crawler/protocolo/schema e limitações | disponibilidade e comportamento mudam; verificar novamente antes de implementar | alta quando a fonte foi acessada; N/D quando não acessível |
| EV-021 | `.netlifyignore` e `netlify.toml` | 15/08/2026 BRT | revisão estática | `auditorias/` não está excluída e não há `build.publish` explícito no arquivo; a exposição depende do método/diretório real de deploy | exposição pública atual dos relatórios = N/D; nenhum deploy foi executado | alta para a lacuna; N/D para exposição |
| EV-022 | `conversion-tracking.js` e `privacidade/index.html` | 15/08/2026 BRT | comparação estática código ↔ política | o código é capaz de enviar `page_path`, tipo/grupo e texto/posição do CTA no evento GA4; a política afirma não enviar o nome do procedimento como parâmetro personalizado | payload efetivamente recebido no GA4 = N/D sem Network/DebugView; associação a interesse médico é inferência de risco | alta para capacidade/drift; N/D para receipt |

## Evidências quantitativas anonimizadas

### LEADS/CRM

| Medida | Valor observado | Tipo | Interpretação segura |
|---|---:|---|---|
| oportunidades Amanda na aba visível | 130 | fato | denominador operacional no snapshot |
| oportunidades Amanda no CRM | 130 | fato | reconcilia em quantidade e fase/plataforma no recorte atual |
| Google / Meta / Orgânico-Conteúdo / WhatsApp direto / Não identificada | 17 / 83 / 2 / 25 / 3 | fato | taxonomia atual; não representa necessariamente canal real completo |
| campo campanha preenchido | 84/130 | cálculo | 64,6% de cobertura aparente; códigos legados/semântica variam |
| campo criativo preenchido | 46/130 | cálculo | 35,4% de cobertura aparente |
| campo CTA preenchido | 3/130 | cálculo | 2,3%; o campo não equivale à página do CTA |
| Meta com M26F01W / M26F02S exato | 77 / 0 | fato | não comprova zero Meta Site; mostra ausência do código exato no snapshot |

### Conversões offline

| Medida | Valor observado | Tipo | Interpretação segura |
|---|---:|---|---|
| eventos qualificados no staging/ledger | 5 | fato | todos `ready`; não prova envio |
| IDs legados potencialmente pessoais/reversíveis | 3/5 | cálculo/formato | risco crítico; valores não foram persistidos |
| enviados/aceitos/rejeitados/atribuídos | N/D | N/D | recibo por evento ausente |

### WhatsApp/bot

| Medida | Valor observado | Tipo | Interpretação segura |
|---|---:|---|---|
| eventos no ledger observado | 689 | fato | volume no recorte; não é número de pacientes únicos |
| eventos com novos campos J:M preenchidos | 16 | fato | cobertura de instrumentação recente, sem backfill |
| `meta_ad_id` sem mapeamento entre os 16 | 1 | fato | prova pelo menos uma lacuna do mapa; não permite taxa histórica |

## Fontes oficiais principais

- OpenAI Crawlers: https://developers.openai.com/api/docs/bots
- Google Search — visão geral de crawling/indexação: https://developers.google.com/search/docs/crawling-indexing/overview
- Google Search — canonicalização: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search — sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google Search — Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Google consent mode: https://developers.google.com/tag-platform/security/concepts/consent-mode
- Google Ads — ValueTrack: https://support.google.com/google-ads/answer/6305348
- Google Ads — URLs e parâmetros: https://support.google.com/google-ads/answer/6080568
- Schema.org: https://schema.org/
- IndexNow: https://www.indexnow.org/documentation
- Resolução CFM 2.336/2023: https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf

## Limitações globais

Esta seção registra o corte histórico de encerramento da auditoria. A implementação local posterior e a única escrita externa autorizada — lembretes de projeto no Google Calendar — estão registradas em `16-REGISTRO-DE-EXECUCAO.md`; o estado atualizado dos 59 itens está em `17-STATUS-RECOMENDACOES.csv`. Não houve commit, deploy, migração ou ativação em produção.

- Nenhum lead sintético foi criado em produção; portanto Meta Site permanece não comprovado.
- Esta auditoria não enviou conversões. O envio histórico e o estado externo de cada evento permanecem N/D sem recibo.
- No corte original, não houve write em Search Console, GA4, Google Ads, Meta Ads, Sheets, CRM, bot, Calendar ou e-mail. Posteriormente foram criados apenas os lembretes de projeto descritos no adendo 16, sem dados de paciente.
- A pasta `auditorias/` não deve ser publicada; antes de qualquer deploy futuro, o manifesto/diretório de publicação precisa ser verificado e uma rota de teste deve retornar 404.
- Resultados de busca e respostas de IA são voláteis e não constituem medição estável isoladamente.
- Ausência de autorização de imagem no repositório não prova ausência de documento em outro sistema.
- A análise regulatória não substitui parecer formal Codame/jurídico.
