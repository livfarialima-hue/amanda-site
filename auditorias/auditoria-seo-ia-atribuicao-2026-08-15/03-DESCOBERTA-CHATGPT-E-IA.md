# Descoberta por ChatGPT e outros mecanismos de IA

Data da coleta: 2026-08-15, entre 09:20 e 10:01, UTC-03:00 (America/Sao_Paulo)
Escopo: acesso técnico de crawlers, indexação em buscadores, entidades, dados estruturados, conteúdo citável, consultas públicas diagnósticas e documentação oficial.
Regra: **acessível** significa que as regras e a resposta HTTP observadas permitem acesso técnico; não significa indexado, escolhido, citado ou recomendado.

## Parecer

**[Fato observado | confiança alta]** O domínio atual oferece conteúdo principal em HTML estático e permite tecnicamente Googlebot, Bingbot, OAI-SearchBot, GPTBot e PerplexityBot. O mesmo HTML inicial da home foi servido a user agents representativos. O site, portanto, é tecnicamente acessível aos crawlers avaliados no nível de `robots.txt` e resposta HTTP.

**[Inferência | confiança alta]** A base técnica favorece compreensão da médica, clínica, localização e procedimentos: IDs estáveis de `Physician` e `MedicalClinic` são reutilizados, as credenciais estão consistentes e as páginas têm títulos/H1s específicos. Isso melhora elegibilidade, mas não garante citação por ChatGPT, Copilot, Gemini, Perplexity ou qualquer outro mecanismo.

**[Fato observado | confiança média-alta]** O domínio Wix antigo ainda aparece em superfície pública de busca de marca e mantém snapshot com conteúdo que compete com o domínio `.com.br`. A consulta direta ao host antigo falhou por DNS nesta coleta. A presença no índice e a disponibilidade atual da origem são estados distintos.

**[N/D]** Citações atuais e estáveis por ChatGPT, Copilot, Gemini e Perplexity. Não houve acesso aos relatórios de AI Performance do Bing, logs verificados de crawlers nem sessões reproduzíveis e neutralizadas de cada assistente.

## Separação obrigatória dos mecanismos

| Camada | O que significa | Controle principal | Estado observado | O que não se pode concluir |
|---|---|---|---|---|
| Indexação Google | URL descoberta, rastreada, consolidada e selecionada no índice | Googlebot, canonical, sitemap, links, qualidade | acessível; presença pública parcial observada | que as 44 URLs estejam indexadas ou ranqueiem |
| Recursos de IA do Google Search | AI Overviews/AI Mode usam a base de Search | Googlebot e controles de snippet/noindex | acessível no nível técnico | aparição/citação em qualquer pergunta |
| Gemini fora da Search | treinamento/grounding em sistemas Google cobertos por política própria | `Google-Extended` | acessível via grupo `User-agent: *` | inclusão, treinamento efetivo ou citação |
| ChatGPT Search | descoberta e exibição de links em respostas de busca | `OAI-SearchBot` | explicitamente acessível | que o site será mostrado ou citado |
| Treinamento OpenAI | conteúdo que pode ser usado para melhorar modelos | `GPTBot` | explicitamente acessível | que o conteúdo foi ou será usado; isso não controla Search |
| Ação direta no ChatGPT | busca solicitada pelo usuário/Custom GPT | `ChatGPT-User` | HTTP 200 por user agent de teste; acesso genuíno N/D | que `robots.txt` controle a ação; a OpenAI diz que pode não se aplicar |
| Bing/Copilot | índice e grounding da Microsoft | Bingbot, sitemap, IndexNow e controles meta | acessível; resultados de marca/procedimento observados | citação atual no Copilot |
| Perplexity Search | rastreamento para resultados | `PerplexityBot` | acessível pelo grupo `*`; HTTP 200 por user agent de teste | indexação ou citação atual |
| Ação direta Perplexity | visita acionada por pergunta | `Perplexity-User` | política oficial diz que geralmente ignora robots; acesso genuíno N/D | que uma página foi buscada numa resposta real |

## Matriz de acessibilidade

| Mecanismo/agente | Finalidade oficial | Regra encontrada | Resposta pública observada | Classificação | Confiança/limitação |
|---|---|---|---|---|---|
| Googlebot Smartphone/Desktop | Search, incluindo recursos de IA da Search | `User-agent: *` + `Allow: /` | 200 e HTML principal na home com UA de teste | acessível | alta para regra/HTTP; IP genuíno não verificado |
| Google-Extended | controle de treinamento de futuros Gemini e grounding em produtos descritos pelo Google; não afeta Google Search | herda `User-agent: *` + `Allow: /`; não há grupo específico | não possui UA HTTP próprio | acessível por política | alta para robots; uso real N/D |
| OAI-SearchBot | resultados de busca do ChatGPT | grupo explícito `Allow: /` | 200 e HTML principal com UA de teste | acessível | alta para regra/HTTP; presença/citação N/D |
| GPTBot | treinamento de modelos da OpenAI | grupo explícito `Allow: /` | 200 e HTML principal com UA de teste | acessível | alta para regra/HTTP; ingestão N/D |
| ChatGPT-User | ações iniciadas pelo usuário | sem grupo específico; OpenAI informa que robots pode não se aplicar | 200 e HTML principal com UA de teste | parcialmente acessível | UA/IP real não verificado; não controla Search |
| Bingbot | Bing Search e base usada pelas experiências Copilot | `User-agent: *` + `Allow: /` | 200 e HTML principal com UA de teste | acessível | alta para regra/HTTP; cobertura do índice N/D |
| PerplexityBot | busca da Perplexity, não treinamento de modelo-base | `User-agent: *` + `Allow: /` | 200 e HTML principal com UA de teste | acessível | alta para regra/HTTP; indexação N/D |
| Perplexity-User | ação solicitada pelo usuário | sem grupo específico; documentação diz que geralmente ignora robots | não testado como requisição genuína | N/D operacional | finalidade/regra alta; acesso real N/D |
| Claude/Anthropic e outros não solicitados nominalmente | variam | grupo `*` permitiria agentes compatíveis, salvo tratamento fora de robots | não testado | N/D | não presumir agentes nem políticas sem documentação específica |

## O que cada controle realmente faz

- **[Fato oficial]** OpenAI trata `OAI-SearchBot` e `GPTBot` como preferências independentes. Permitir Search e bloquear treinamento é possível; bloquear treinamento não bloqueia automaticamente a busca.
- **[Fato oficial]** `ChatGPT-User` não é crawler automático de Search e não determina inclusão no ChatGPT Search; ações iniciadas por usuário podem não seguir `robots.txt`.
- **[Fato oficial]** Googlebot controla inclusão nos recursos de IA do Google Search. `Google-Extended` não afeta a inclusão nem funciona como sinal de ranking na Search.
- **[Fato oficial]** Bing e Copilot compartilham a base central de crawling/indexação; sitemaps, links, canonicals e IndexNow ajudam descoberta/frescor, sem garantir grounding ou citação.
- **[Fato oficial]** `PerplexityBot` é destinado a resultados de busca e não a treinamento de modelos-base; `Perplexity-User` atende ações iniciadas pelo usuário e geralmente ignora robots.

## Entidade médica e clínica

| Elemento | Observado | Classificação | Parecer/limitação |
|---|---|---|---|
| Nome | Dra. Amanda Schroeder | Fato observado | consistente nas páginas e schema |
| Registro profissional | CRM-SP 191605; RQE 110472 | Fato observado | consistente internamente; verificação independente em cadastro oficial atual é N/D |
| Especialidade | cirurgia plástica / `PlasticSurgery` | Fato observado | consistente internamente |
| Formação declarada | UNICAMP e Hospital Israelita Albert Einstein | Fato observado | schema e conteúdo; verificação independente atual é N/D |
| Sociedade profissional | Sociedade Brasileira de Cirurgia Plástica | Fato observado | aparece no schema; vínculo atual independente é N/D |
| Clínica | Clínica LIV Faria Lima | Fato observado | `worksFor` aponta `/#clinic`; endereço consistente nos templates auditados |
| Cidade/bairro | São Paulo, Pinheiros | Fato observado | conteúdo e `PostalAddress` consistentes |
| Entidade médica | `https://draamandaschroeder.com.br/#physician` | Fato observado | 43 páginas usam o mesmo ID |
| Entidade clínica | `https://draamandaschroeder.com.br/#clinic` | Fato observado | 20 páginas usam o mesmo ID |
| `sameAs` | somente perfil oficial do Instagram | Fato observado | não adicionar fontes não verificadas nem o domínio antigo |
| Autoria de artigos | nome da médica aparece em 19/19 artigos; JSON-LD usa `author`/`reviewedBy` no conjunto auditado | Cálculo | adequação editorial deve ser confirmada por conteúdo |
| Revisão visível | 13/19 artigos têm marcador textual de revisão médica detectável | Cálculo | 6/19 precisam decisão editorial, não preenchimento automático |
| Data visível | 14/19 artigos têm data/`time` detectável | Cálculo | consistência com schema/sitemap precisa de fonte editorial verdadeira |
| Links de fontes externas | 13/19 artigos apontam a pelo menos um domínio de referência além de fontes técnicas/social/WhatsApp | Cálculo | presença de link não comprova qualidade ou que sustenta cada afirmação |

**[Inferência | confiança alta]** O grafo interno reduz ambiguidade entre médica e clínica, mas a entidade externa ainda pode ser fragmentada pelo domínio legado e por poucos identificadores independentes no `sameAs`.

**[Hipótese | confiança média]** Uma página institucional dedicada à médica e um conjunto pequeno de referências oficiais verificadas poderiam facilitar desambiguação. Isso exige mudança textual/semântica e validação de credenciais; não pertence ao pacote técnico inicial.

## Dados estruturados para compreensão e citação

| Tipo | Situação | Classificação | Recomendação |
|---|---|---|---|
| `Physician` | presente e estável em 43 páginas | Fato observado | manter; validar fatos antes de expandir propriedades |
| `MedicalClinic` | presente em 20 páginas | Fato observado | manter relação com `Physician`; não confundir serviços da clínica com atuação individual sem evidência |
| `Organization` | presente em templates | Fato observado | usar somente quando a organização é de fato o sujeito/publisher |
| `WebSite` | presente na home | Fato observado | suficiente como nó do site; não duplicar IDs |
| `WebPage`/`MedicalWebPage` | presente conforme template | Fato observado | manter alinhado ao conteúdo visível |
| `BreadcrumbList` | 34 páginas | Cálculo | validar percurso real; não adicionar à home apenas por cobertura |
| `Article` | 19 páginas | Cálculo | alinhar `dateModified` e revisão com verdade editorial |
| `FAQPage` | 27 páginas | Cálculo | não há garantia de rich result; conteúdo deve permanecer visível e verdadeiro |
| `VideoObject` | ausente | Cálculo | avaliar somente para vídeos principais com URL/thumbnail/data/duração/descrição reais e página de exibição apropriada |
| `ImageObject` | ausente | Cálculo | não adicionar apenas para validador; usar se a imagem for entidade editorial relevante |

**[Fato observado | alta]** Todos os 43 blocos JSON-LD existentes são parseáveis.
**[Fato observado | alta]** O Google exige que dados estruturados representem o conteúdo visível e não sejam enganosos.
**[Inferência | alta]** A correção sintática não prova elegibilidade para rich results nem compreensão/citação por sistemas de IA.

## Conteúdo acessível e isoladamente compreensível

- **[Fato observado | alta]** páginas têm H1 específico, seções H2/H3, FAQ, autoria e CTAs no HTML inicial; não dependem de interação para exibir o texto principal.
- **[Cálculo | alta]** existem 19 artigos e quatro guias de preço com intenções explícitas; 13/19 artigos têm links a fontes externas identificáveis, enquanto seis não têm fonte externa editorial detectada.
- **[Cálculo | alta]** 33 vídeos em 16 páginas não têm `<track>` de legenda. Não foi encontrada transcrição explícita associada por varredura.
- **[Inferência | média-alta]** trechos textuais claros e específicos aumentam a chance de recuperação, mas fontes, datas e revisão mais consistentes podem melhorar confiança e desambiguação. A decisão de alterar conteúdo exige pacote E/F e revisão médica.

## Sitemap, IndexNow e `llms.txt`

- **[Fato observado | alta]** o sitemap contém as 44 URLs canônicas do repositório e é anunciado no robots.
- **[Cálculo | alta]** 19 de 30 páginas com `dateModified` têm `<lastmod>` diferente. Sinais de atualização precisam de reconciliação factual.
- **[Fato observado | alta]** o repositório tem chave IndexNow e plugin pós-deploy que seleciona URLs pelo diff Git ou pelo `lastmod` mais recente.
- **[N/D]** submissão, aceitação, crawl e indexação da última publicação; sem recibo/log/painel.
- **[Fato observado | alta]** `https://draamandaschroeder.com.br/llms.txt` retornou a página 404 da Netlify.
- **[Inferência | alta]** a ausência de `llms.txt` não é bloqueio de Search ou de IA. Não existe requisito oficial consolidado, nos mecanismos auditados, que o torne substituto de robots, sitemap, indexação ou conteúdo.
- **[Não alterar | P3]** não criar `llms.txt` antes de resolver os controles canônicos; se futuramente testado, tratá-lo como complemento experimental, com fonte e rollback.

## Buscas diagnósticas

| Data/fuso | Mecanismo | Consulta | Observado | Classificação | Limitação/confiança |
|---|---|---|---|---|---|
| 2026-08-15 09:52–09:56 UTC-03 | Google público | `site:draamandaschroeder.com.br` | home e ao menos nove URLs adicionais do domínio atual na primeira página | Fato observado | não conta índice total; média |
| 2026-08-15 09:52–09:56 UTC-03 | Google público | `"Dra Amanda Schroeder" cirurgia plástica` | home atual e outras fontes relacionadas apareceram; domínio antigo não apareceu na primeira página desta sessão | Fato observado | localizado/personalizado; média |
| 2026-08-15 09:52–09:56 UTC-03 | Google público | `lifting facial São Paulo Dra Amanda Schroeder` | home e página de lifting do domínio atual apareceram | Fato observado | uma sessão, sem estabilidade; média |
| 2026-08-15 09:52–09:56 UTC-03 | Google público | `quanto custa lifting facial Dra Amanda Schroeder` | a página de lifting apareceu; o guia de preço não foi observado entre os títulos extraídos da primeira página | Fato observado | não prova ausência no índice; média |
| 2026-08-15 09:56–09:59 UTC-03 | Bing público | marca e lifting facial | home, conteúdos e página de lifting do domínio atual apareceram | Fato observado | uma sessão; média |
| 2026-08-15 09:56–09:59 UTC-03 | Bing público | operador `site:` | resultados não relacionados; teste descartado | N/D | comportamento da sessão/consulta; baixa |
| 2026-08-15 UTC-03 | superfície pública de busca + coordenação | busca de marca | domínio Wix antigo ainda apareceu como resultado; snapshot disponível havia sido rastreado meses antes | Fato observado | resposta direta do host falhou por DNS nesta frente; média-alta |
| 2026-08-15 UTC-03 | ChatGPT | nome, especialidade, localização, procedimentos e perguntas comuns | não executado em sessão controlada/reproduzível | N/D | uma resposta isolada também não seria medição estável |
| 2026-08-15 UTC-03 | Copilot | mesmas intenções | não executado em sessão controlada/reproduzível | N/D | usar AI Performance/BWT e protocolo repetível |
| 2026-08-15 UTC-03 | Gemini | mesmas intenções | não executado em sessão controlada/reproduzível | N/D | separar Gemini de Google Search |
| 2026-08-15 UTC-03 | Perplexity | mesmas intenções | não executado em sessão controlada/reproduzível | N/D | crawl técnico não prova resposta/citação |

Nenhuma posição ou citação foi tratada como estável. A ausência de teste nos assistentes não foi convertida em “não aparece”.

## Conflito do domínio Wix antigo

| Afirmação | Classificação | Evidência | Limitação | Confiança |
|---|---|---|---|---|
| o domínio antigo ainda é exibido em consulta pública de marca | Fato observado | busca pública de 2026-08-15 e snapshot do índice | variação por sessão/mecanismo | média-alta |
| a origem antiga respondeu ao acesso direto desta frente | N/D | tentativa resultou em `ERR_NAME_NOT_RESOLVED` | DNS pode variar e o índice pode manter cache | N/D |
| o conteúdo antigo difere do domínio atual | Fato observado | snapshot público do Wix versus HTML atual | snapshot do antigo não é necessariamente a versão live | alta |
| há fragmentação de entidade/canonical | Inferência | dois domínios associados à mesma médica em superfície de busca | impacto quantitativo não medido | média-alta |
| 301 resolverá o problema | Hipótese condicional | prática de migração se houver propriedade e equivalentes | exige controle do domínio, mapa URL-a-URL e recrawl | média |

## Recomendações — não implementar nesta etapa

| ID | Pri. | Trilha | Pacote/fase | Alvo | Problema/evidência | Mudança exata proposta | Texto | Schema | Externa | Impacto/confiança | Esforço/risco | Teste/guardrail | Rollback/regra |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IA-T01 | P1 | T6 | G / Fase 8 | domínio `.com`/Wix | resultado antigo compete; origem atual N/D | validar propriedade, DNS, inventário indexado e equivalências; se controlado, 301 direto por URL e remoção apenas do que não tiver equivalente | possivelmente | não | sim | entidade alto; média-alta | médio / alto | uma cadeia, destino equivalente, query preservada, sem loop; monitorar 90 dias | restaurar rota se houver serviço legítimo sem destino correto |
| IA-T02 | P1 | T2 | E / Fase 7 | grafo `#physician`/`#clinic` | sameAs limitado e credenciais não revalidadas externamente | montar registro canônico de entidade; verificar CRM/RQE, vínculos e perfis oficiais; só então expandir `sameAs`/identificadores | possivelmente | sim | possivelmente | compreensão alta; alta | médio / médio | cada afirmação sustentada por conteúdo visível e fonte oficial; Rich Results/parser | reverter propriedade sem fonte ou divergente |
| IA-T03 | P1 | T5 | E/F / Fase 7 | 19 artigos | 6 sem revisão visível, 5 sem data visível, 6 sem domínio de fonte editorial | revisão médica individual, data verdadeira e fontes primárias por afirmação relevante; não inserir texto automático | sim | sim | não | confiança/citação alta; média-alta | alto / médio-alto | aprovação médica, links válidos, alinhamento `dateModified` e histórico editorial | restaurar versão aprovada se houver imprecisão |
| IA-T04 | P1 | T1/T2 | B/E / Fases 3 e 7 | datas de sitemap/schema | 19/30 divergências | criar fonte editorial única; fase técnica alinha sinais não visíveis somente após verdade aprovada; data visível fica no pacote E | possivelmente | sim | não | frescor médio-alto; alta | médio / médio | mudança significativa comprovada; não usar data do deploy | voltar às datas documentadas anteriores |
| IA-T05 | P2 | T7 | G / Fase 2 | Bing Webmaster AI Performance | citações Copilot N/D | habilitar/consultar relatório em modo somente leitura; exportar páginas citadas, consultas e período | não | não | sim | observabilidade alta; alta | baixo / baixo | guardar export bruto, período/fuso; não inferir causalidade | não aplicável |
| IA-T06 | P2 | T7 | B/G / Fase 2 | logs de crawlers | UA de teste não valida bot | criar observabilidade anonimizada e validar IP/rDNS/ranges oficiais antes de classificar acesso | não | não | possivelmente | evidência alta; alta | médio / baixo | sem query/ID/PII; retenção e acesso mínimos | desativar log fora de finalidade |
| IA-T07 | P2 | T2 | B / Fase 3 | `robots.txt` | Search e training estão ambos permitidos | registrar decisão separada para OAI Search/GPTBot e Googlebot/Google-Extended; manter como está até decisão de política | não | não | não | governança média; alta | baixo / médio | parser robots por agente; smoke HTTP; nenhuma promessa de citação | restaurar arquivo atual se acesso desejado for bloqueado |
| IA-T08 | P2 | T2/T5 | E / Fase 7 | 33 vídeos em 16 páginas | zero `VideoObject` e zero `<track>` | selecionar vídeos principais; fornecer legenda/transcrição e metadados verdadeiros; marcar apenas os elegíveis | sim | sim | não | acessibilidade/descoberta média; média | alto / médio | conteúdo visível, thumbnail estável, duração/data válidas; não marcar duplicata irrelevante | remover schema/track incorreto mantendo mídia |
| IA-T09 | P2 | T7 | B/G / Fase 2 | teste de respostas de IA | citações atuais N/D | protocolo mensal com consultas fixas, sessão/idioma/localidade registrados, captura de URL citada e variação; separar presença de tráfego atribuído | não | não | sim | mensuração média; média-alta | médio / baixo | não tratar resposta única como estabilidade; amostra mínima repetida | encerrar se não reproduzível ou violar termos |
| IA-T10 | P2 | T6/T7 | G / Fase 8 | IndexNow/Bing | plugin existe, recibos N/D | verificar submissão, aceitação, crawl, indexação e citações como estados separados | não | não | sim | frescor médio; alta | baixo / baixo | recibos e painel; URL canônica apenas | suspender envio se houver URL incorreta |
| IA-T11 | P3 | T2 | B / observar | `llms.txt` | arquivo ausente; nenhum bloqueio observado | não criar agora; somente experimento futuro complementar, após baseline e fonte canônica | possivelmente | não | não | impacto incerto; alta | baixo / baixo | não substituir robots/sitemap/conteúdo; medir acesso real | remover se não houver consumidor/benefício |
| IA-T12 | P2 | T5 | E/F / Fase 7 | links internos fracos | duas páginas têm só um inlink | revisão editorial de contexto e âncoras úteis, sem engenharia artificial de palavras-chave | sim | não | não | descoberta média; alta | baixo / baixo | clique/crawl e experiência; aprovação de comunicação | remover link se artificial ou confuso |

## O que não deve ser alterado

- não bloquear `OAI-SearchBot` supondo que isso apenas bloqueia treinamento;
- não liberar `GPTBot` supondo que isso garante Search ou citação;
- não bloquear ou liberar `Google-Extended` supondo impacto em ranking do Google;
- não adicionar `sameAs`, credencial, serviço, formação ou vínculo sem fonte verificável;
- não adicionar `FAQPage`, `VideoObject` ou `ImageObject` só para cobrir um validador;
- não publicar `llms.txt` como substituto de robots, sitemap, canonical, conteúdo, links ou fontes;
- não tratar tráfego sem referrer como ChatGPT/IA;
- não alterar title, description, headings, alt, anchors, FAQ, autoria, data ou conteúdo nesta fase técnica;
- não prometer aparição ou citação em qualquer mecanismo.

## Plano de medição específico de IA

| Métrica | Baseline | Fonte | Janela/frequência | Sucesso | Falha/guardrail |
|---|---|---|---|---|---|
| acessibilidade de crawler | regras permitem; bot genuíno N/D | robots + logs verificados | semanal e após deploy | respostas 2xx e conteúdo canônico para agentes desejados | 4xx/5xx/bloqueio não intencional; não confiar só no UA |
| URLs citadas em Copilot | N/D | Bing AI Performance | 28/90 dias, mensal | crescimento de URLs/consultas citadas com consistência | não prometer causalidade; manter tráfego/funil como guardrail |
| referências ChatGPT/Perplexity/Gemini | N/D | protocolo diagnóstico + logs | conjunto fixo, mensal, ≥3 repetições por consulta | maior consistência e URLs canônicas | resposta única não é sucesso; nenhuma PII na consulta |
| sessões atribuídas a IA | N/D nesta frente | analytics/atribuição | 28/90 dias | origem conhecida com evidência técnica ou UTM explícita | ausência de referrer não vira IA/direto automaticamente |
| consistência da entidade | conflito com domínio antigo observado | buscas, schema, fontes oficiais | mensal por 90 dias após ação | domínio atual e fatos canônicos predominam nas superfícies auditadas | divergência factual ou domínio antigo volta a competir |
| frescor | 19 divergências sitemap/schema | sitemap, JSON-LD, histórico editorial | a cada publicação | datas justificadas por mudança significativa | data do deploy usada sem mudança editorial |

## Fontes oficiais primárias

- OpenAI — crawlers (`OAI-SearchBot`, `GPTBot`, `ChatGPT-User`): https://developers.openai.com/api/docs/bots
- Google Search Central — recursos de IA e website: https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central — otimização para recursos generativos: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google — `Google-Extended`: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Google — Googlebot: https://developers.google.com/search/docs/crawling-indexing/googlebot
- Google — structured data: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Bing Webmaster Guidelines — Bing/Copilot: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Bing — robots meta e controles para Copilot: https://www.bing.com/webmasters/help/robots-meta-tags-and-attributes-that-bing-supports-5198d240
- Bing — IndexNow: https://www.bing.com/webmasters/help/indexnow-0z209wby
- Bing — AI Performance: https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
- Perplexity — crawlers: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Schema.org — Physician: https://schema.org/Physician
- Schema.org — MedicalClinic: https://schema.org/MedicalClinic
- Schema.org — MedicalProcedure: https://schema.org/MedicalProcedure

## Limitações finais

Não houve acesso autenticado a GSC, Bing Webmaster Tools/AI Performance, Gemini, Copilot, Perplexity ou logs CDN. Não foram feitas solicitações externas de remoção, submissão, recrawl, IndexNow, mudança de crawler, publicação, commit ou deploy. Nenhuma recomendação de conteúdo, schema ou plataforma foi implementada.
