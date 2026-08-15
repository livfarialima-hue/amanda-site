# Auditoria de SEO técnico e Google

Data da coleta: 2026-08-15, entre 09:39 e 10:01, UTC-03:00 (America/Sao_Paulo)
Escopo: repositório local, 44 URLs do `sitemap.xml`, navegação pública não autenticada, buscas diagnósticas e documentação oficial vigente.
Regra de leitura: cada conclusão está identificada como **fato observado**, **cálculo**, **inferência**, **hipótese** ou **N/D**. Ausência de dado não foi tratada como zero.

## Parecer

**[Fato observado | confiança alta]** O site atual é uma aplicação estática em HTML, publicada em Netlify, e oferece ao Google conteúdo principal legível na resposta inicial. Na amostra pública completa, 44 de 44 URLs canônicas retornaram HTTP 200, sem `noindex` e sem `X-Robots-Tag` impeditivo; todas tinham canonical autorreferente, title, meta description e exatamente um H1. O `robots.txt` permite Googlebot e referencia o sitemap.

**[Inferência | confiança alta]** Não foi identificado bloqueio técnico global que, sozinho, impeça rastreamento, renderização ou indexação. Isso não prova que todas as páginas estejam indexadas, nem promete posicionamento: a seleção canônica e a indexação efetiva pertencem aos buscadores.

**[Fato observado | confiança alta]** A busca pública do Google encontrou páginas do domínio atual para marca e procedimentos. Uma consulta `site:` mostrou ao menos dez URLs do domínio atual na primeira página de resultados. Esse teste prova presença de URLs, não o total indexado nem posição estável.

**[N/D]** O estado atual por URL no Google Search Console, os canonicals escolhidos pelo Google, os relatórios de indexação, as consultas de 28 e 90 dias e os Core Web Vitals de campo não puderam ser consultados com acesso autenticado nesta frente.

**[Fato observado | confiança alta]** Não há medição de laboratório utilizável nesta coleta: a API oficial do PageSpeed Insights respondeu HTTP 429. Logo, LCP, INP, CLS, TBT e Speed Index de laboratório são N/D. Tempos de resposta HTTP observados não foram usados como sinônimo de experiência real.

## Compatibilidade com o Norte Estratégico

**[Fato observado | confiança alta]** Esta auditoria preserva `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` como fonte canônica. Não foi criado norte concorrente. O diagnóstico técnico sustenta a estratégia de múltiplas portas de descoberta e um caminho principal de conversão, sem prometer ranking ou citação.

## Método e cobertura

| ID | Classificação | Fonte | Data/hora e fuso | Método | Período | Limitação | Confiança |
|---|---|---|---|---|---|---|---|
| SEO-E01 | Fato observado | repositório local, commit de trabalho `ea00bd2`, branch `reestruturacao-site` | 2026-08-15 09:20–10:01 UTC-03 | leitura integral de configuração, HTML, CSS/JS, sitemap, robots, headers, redirects, scripts e histórico Git relevante | snapshot | a árvore recebeu arquivos de auditoria não rastreados de outros agentes durante a coleta; produto não foi alterado | alta |
| SEO-E02 | Fato observado | `https://draamandaschroeder.com.br/` e 44 URLs do sitemap | 2026-08-15 09:39–09:48 UTC-03 | GET público, inspeção de status, headers e HTML inicial | snapshot | não equivale a rastreamento real do Googlebot nem a inspeção de URL no GSC | alta |
| SEO-E03 | Fato observado | Chrome, viewport 390 × 844 | 2026-08-15 09:50 UTC-03 | renderização da home, DOM, console e largura do documento | uma sessão | cobertura mobile visual completa apenas da home; sessão já continha estado de consentimento | média-alta |
| SEO-E04 | Fato observado | Google público, `pws=0` | 2026-08-15 09:52–09:56 UTC-03 | buscas de marca, `site:` e procedimentos | uma rodada | resultados localizados/personalizados; não são um rank tracker | média |
| SEO-E05 | Fato observado | Bing público | 2026-08-15 09:56–09:59 UTC-03 | buscas de marca e procedimento | uma rodada | a consulta `site:` retornou resultados incoerentes e foi descartada | média |
| SEO-E06 | N/D | Google Search Console e CrUX | 2026-08-15 | sem acesso autenticado atual | 28/90 dias solicitados | dado atual indisponível | N/D |
| SEO-E07 | N/D | PageSpeed Insights | 2026-08-15 | API oficial | snapshot | HTTP 429; nenhum resultado de laboratório aproveitável | N/D |

## Inventário de arquitetura

| Item | Resultado | Classificação | Evidência/limitação |
|---|---|---|---|
| Stack | HTML, CSS e JavaScript estáticos, sem framework de renderização | Fato observado | arquivos HTML por rota e `package.json` |
| Hospedagem | Netlify | Fato observado | `netlify.toml`, `_headers`, `_redirects` e resposta pública |
| Build | não há comando de build nem `build.publish` em `netlify.toml`; o único plugin de produção é local e envia IndexNow após sucesso | Fato observado | configuração local; o diretório efetivo de publicação da UI do Netlify é N/D |
| Dependências | `@netlify/blobs` 10.7.10 é a única dependência declarada | Fato observado | `package.json` |
| Branches | `main`, `reestruturacao-site`, dois backups/branches locais e remotas correspondentes | Fato observado | `git branch -a` |
| Branch auditada | `reestruturacao-site`, HEAD `ea00bd2` | Fato observado | Git local às 10:01 UTC-03 |
| Geração de páginas | arquivos `index.html` manuais por diretório | Fato observado | 44 arquivos correspondentes às 44 URLs do sitemap |
| JavaScript | 263 tags de script externo nas 44 páginas; todas com `defer`, `async` ou módulo; nenhuma carga externa síncrona observada | Cálculo | varredura estática; contagem de tags, não de arquivos únicos |
| Fontes | 43/44 páginas referenciam Google Fonts; nenhuma página usa `preload` | Cálculo | dependência externa pode afetar renderização; impacto real N/D sem laboratório/campo |
| Publicação | `.netlifyignore` exclui várias pastas operacionais, mas não `auditorias/` | Fato observado | a exposição pública atual desses arquivos é N/D; a consequência depende do publish dir real |
| IndexNow | plugin lê sitemap, chave pública, diff Git e envia URLs após deploy; aceita HTTP 200/202 | Fato observado | envio/aceitação do último deploy é N/D sem recibo/log da plataforma |

**[Fato observado | confiança alta]** A suíte local executada após a auditoria concluiu 570/570 testes com sucesso em 2026-08-15. Isso valida os contratos cobertos pelos testes existentes, mas não substitui testes públicos, GSC, Core Web Vitals ou revisão das lacunas apontadas.

## Rastreamento, indexabilidade e URLs

### Resultado completo

**[Cálculo | confiança alta]** 44/44 URLs listadas no sitemap foram verificadas. O detalhe integral está em `01-INVENTARIO-DE-URLS.csv`.

| Controle | Resultado | Classificação |
|---|---:|---|
| URLs no sitemap | 44 | Cálculo |
| URLs HTML canônicas no repositório | 44 | Cálculo |
| URLs canônicas públicas com HTTP 200 | 44/44 | Cálculo |
| Canonicals autorreferentes | 44/44 | Cálculo |
| Sem `noindex` no HTML | 44/44 | Cálculo |
| Sem `X-Robots-Tag` impeditivo | 44/44 | Cálculo |
| Title presente | 44/44 | Cálculo |
| Meta description presente | 44/44 | Cálculo |
| Exatamente um H1 | 44/44 | Cálculo |
| Imagens sem `alt` | 0 | Cálculo |
| Imagens sem dimensões declaradas | 0 | Cálculo |
| CTAs de WhatsApp sem `data-track` | 0 | Cálculo |
| Páginas HTML fora do sitemap | 0 | Cálculo |
| URLs do sitemap sem arquivo HTML | 0 | Cálculo |
| Páginas órfãs | 0 | Cálculo |
| Titles duplicados | 0 | Cálculo |
| Descriptions duplicadas | 0 | Cálculo |

### Robots, redirects, HTTPS e erros

- **[Fato observado | alta]** `robots.txt` permite explicitamente `OAI-SearchBot` e `GPTBot`, permite os demais agentes por `User-agent: *` e anuncia `https://draamandaschroeder.com.br/sitemap.xml`.
- **[Fato observado | alta]** `http://draamandaschroeder.com.br/` redirecionou uma vez para HTTPS sem `www`; `https://www.draamandaschroeder.com.br/` redirecionou uma vez para HTTPS sem `www`.
- **[Fato observado | alta]** uma URL sem barra, `/lifting-facial`, redirecionou uma vez para `/lifting-facial/`.
- **[Fato observado | alta]** `/conteudos/instagram/` redirecionou uma vez para `/conteudos/`, conforme `_redirects`.
- **[Fato observado | alta]** uma rota aleatória inexistente retornou 404; não foi detectado soft 404 nessa amostra única.
- **[Fato observado | alta]** HSTS `max-age=31536000`, compressão gzip e cache de um ano para imagens foram observados. HTML usa `max-age=0, must-revalidate`; CSS usa sete dias mais `stale-while-revalidate`.
- **[Fato observado | média]** o mesmo HTML inicial e o mesmo status 200 foram obtidos na home com user agents Mozilla, Googlebot, bingbot, OAI-SearchBot, GPTBot, ChatGPT-User e PerplexityBot. O teste não verificou IP de origem e, portanto, não prova que o CDN trataria do mesmo modo um crawler genuíno.

### Rotas fracas e domínio legado

- **[Cálculo | alta]** `/braquioplastia/` e `/conteudos/papada-contorno-cervical/` têm apenas um link interno de entrada cada. Isso não as torna órfãs, mas representa a menor conectividade do grafo.
- **[Fato observado | média-alta]** o domínio Wix antigo apareceu em superfície pública de busca para consulta de marca e ainda havia snapshot indexado com conteúdo divergente. Na execução direta desta frente, `www.draamandaschroeder.com` e o apex retornaram `ERR_NAME_NOT_RESOLVED`/falha DNS.
- **[Inferência | média-alta]** o resultado antigo pode fragmentar sinais de entidade, confundir usuários e prolongar referências desatualizadas, mesmo quando o host não responde na origem.
- **[N/D]** propriedade do domínio antigo, configuração Wix/DNS atual, URLs indexadas do domínio antigo e capacidade de aplicar redirects.

## Resposta inicial, JavaScript, semântica e mobile

- **[Fato observado | alta]** title, description, H1, conteúdo principal, links, CTAs e JSON-LD estão no HTML inicial; eles não dependem de JavaScript para existir.
- **[Fato observado | alta]** a home renderizou em 390 × 844 com `lang="pt-BR"`, um `<main>`, um H1, duas navegações e sete CTAs de WhatsApp. Não houve erro nem aviso no console.
- **[Fato observado | alta]** na home, `scrollWidth` e largura do documento eram 375 px; não houve overflow horizontal da página. Elementos fora da viewport pertenciam ao carrossel.
- **[Fato observado | média]** somente uma das dez imagens da home estava completa no instante do teste; as outras nove eram lazy e estavam fora da viewport. Nenhuma imagem já concluída estava quebrada.
- **[N/D]** comportamento mobile visual individual das outras 43 páginas, navegação por teclado completa, leitores de tela e contraste calculado em todos os estados.

## Metadados, headings, imagens e conteúdo técnico

- **[Cálculo | alta]** 44/44 páginas têm `lang="pt-BR"`, viewport, Open Graph title/description/image e Twitter card.
- **[Cálculo | alta]** todas as imagens HTML têm `alt`, `width` e `height`. A adequação semântica de cada `alt` exige revisão de comunicação e não foi alterada.
- **[Cálculo | alta]** não há title nem meta description duplicados no conjunto de 44 páginas.
- **[Inferência | média-alta]** a arquitetura de títulos e H1s diferencia bem as intenções principais, mas mudanças de palavras, headings, anchors ou `alt` pertencem ao pacote textual, fora da primeira fase técnica.

## Dados estruturados

| Item | Resultado | Classificação | Parecer |
|---|---:|---|---|
| Páginas com JSON-LD parseável | 43/44 | Cálculo | `privacidade/` não possui JSON-LD; ausência não é erro por si só |
| Blocos JSON-LD inválidos | 0 | Cálculo | validação sintática local, não substitui Rich Results Test |
| `Physician` | 43 páginas | Cálculo | `@id` estável `/#physician` |
| `MedicalClinic` | 20 páginas | Cálculo | `@id` estável `/#clinic` |
| `MedicalProcedure` | 23 páginas | Cálculo | uso deve continuar limitado ao procedimento realmente descrito |
| `FAQPage` | 27 páginas | Cálculo | não há garantia de rich result; Google restringe FAQ a casos específicos |
| `BreadcrumbList` | 34 páginas | Cálculo | ausência em home/algumas páginas não é automaticamente erro |
| `Article` + `MedicalWebPage` | 19 páginas | Cálculo | autor/revisor apontam para a entidade `Physician` |
| `VideoObject` | 0 | Cálculo | 33 vídeos existem em 16 páginas; só avaliar marcação após metadados e conteúdo visível verdadeiros |
| `ImageObject` | 0 | Cálculo | não deve ser adicionado apenas para preencher validador |

**[Fato observado | alta]** nome, CRM-SP 191605, RQE 110472, especialidade, relação com Clínica LIV, endereço e identificadores de `Physician`/`MedicalClinic` são consistentes nos templates auditados.

**[Cálculo | alta]** 30 páginas trazem `dateModified` no JSON-LD; 19 delas têm data diferente de `<lastmod>` no sitemap. Diferença não é erro automático, mas os sinais precisam derivar da mesma verdade editorial. O Google declara que usa `lastmod` quando o valor é consistente e verificavelmente preciso e representa alteração significativa.

**[Fato observado | alta]** as páginas com vídeo têm 33 elementos `<video>`, todos com poster e nenhum `<track>` de legenda. A inclusão de legenda/transcrição é mudança de comunicação e acessibilidade, não correção puramente técnica.

## Desempenho

### O que foi observado

- **[Fato observado | alta]** HTML público comprimido variou de aproximadamente 7,6 KB a 91,7 KB na coleta; as duas maiores respostas foram `/otoplastia-adulto/` e `/otoplastia-infantil/`.
- **[Cálculo | alta]** arquivos locais referenciados por `/otoplastia-infantil/` somam 63,07 MB de mídia; `/otoplastia/`, 54,78 MB; `/lifting-cervical/`, 25,12 MB; `/otoplastia-adulto/`, 21,36 MB. São bytes dos arquivos referenciados, não bytes necessariamente transferidos em uma visita.
- **[Fato observado | alta]** os vídeos usam `preload="metadata"` nas páginas de procedimento; um vídeo individual chega a 42,64 MB. Posters e lazy loading de imagens reduzem risco, mas não estabelecem o custo real de rede.
- **[Fato observado | alta]** o maior CSS comum (`site-enhancements.css`) tem 113.430 bytes e o maior JavaScript comum (`site-enhancements.js`) tem 65.612 bytes antes de compressão. Todos os scripts externos são diferidos/assíncronos.
- **[Inferência | média]** mídia e fonte externa são candidatos de risco para LCP, consumo de dados e concorrência de rede em mobile, sobretudo nas páginas de otoplastia. O impacto precisa ser medido antes de escolher a otimização.

### O que não foi medido

- **[N/D]** LCP, INP e CLS de campo no percentil 75, separados por mobile/desktop.
- **[N/D]** LCP, CLS, TBT e Speed Index de laboratório por template.
- **[N/D]** bytes transferidos por visita, cache hit rate, p95 de TTFB e reprodução de vídeo em rede móvel.
- **[Fato observado | alta]** tempos de uma requisição HTTP e o TTFB/HTML inicial não foram usados para concluir que uma página é rápida.

Os limites oficiais atuais dos Core Web Vitals são LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 no percentil 75, com avaliação separada por mobile e desktop. Esses limites são referência de medição, não valores observados neste site.

## Search Console e presença no Google

| Item | Resultado | Classificação | Limitação |
|---|---|---|---|
| Cobertura/indexação atual | N/D | N/D | sem acesso autenticado nesta frente |
| Canonical escolhido por URL | N/D | N/D | exige URL Inspection/GSC |
| Sitemap lido/processado | N/D atual | N/D | o sitemap público existe; recibo GSC não foi consultado |
| Desempenho 28 dias | N/D atual | N/D | sem exportação atual |
| Desempenho 90 dias | N/D atual | N/D | sem exportação atual |
| Branded vs non-branded | N/D atual | N/D | exige consulta por regex/conjunto canônico |
| Presença pública | domínio e páginas apareceram nas buscas diagnósticas | Fato observado | não mede cobertura total nem posição fixa |
| Registro histórico disponível | 39 indexadas e 8 não indexadas em 2026-08-06; 11 cliques, 409 impressões, CTR 2,7%, posição média 21 entre 2026-07-09 e 2026-08-11 | Fato documentado, não revalidado | fonte secundária: auditoria interna anterior; não deve substituir coleta atual |

## Risco de publicação acidental da auditoria

**[Fato observado | alta]** `.netlifyignore` não exclui `auditorias/`, embora exclua outras pastas operacionais. `netlify.toml` não registra o publish dir.
**[Hipótese | média]** se a publicação empacotar a raiz e respeitar apenas esse ignore, relatórios futuros podem entrar no artefato.
**[N/D]** a exposição pública atual dos arquivos de auditoria; tentativas ficaram inconclusivas por bloqueio do navegador a download e falha transitória de rede.
**Parecer:** tratar como P0 preventivo antes de qualquer deploy, sem afirmar vazamento atual.

## Recomendações técnicas — não implementar nesta etapa

| ID | Pri. | Trilha | Pacote/fase | Alvo | Classificação da afirmação | Problema/evidência | Mudança exata proposta | Texto visível | Schema | Externa | Impacto/confiança | Esforço/risco | Teste e guardrail | Rollback/regra |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SEO-T01 | P0 | T1 | A / Fase 1 | `.netlifyignore`, configuração de publish | Fato + hipótese | `auditorias/` não está excluída; exposição atual N/D | confirmar publish dir/manifest e excluir `auditorias/**` e outros artefatos operacionais após inventário | não | não | não | proteção alta; confiança média | baixo / baixo | build dry-run; manifesto sem arquivos; URLs-amostra 404; não remover ativos do site | reverter a regra se excluir arquivo público legítimo, após mover esse ativo para diretório canônico |
| SEO-T02 | P1 | T1 | B / Fase 3 | `sitemap.xml` + fonte de datas | Cálculo | 19/30 páginas com `dateModified` têm `lastmod` diferente | adotar uma única fonte editorial e atualizar `lastmod` somente em mudança significativa; validar sitemap/schema | não | possivelmente | não | frescor/consolidação médios; alta | médio / médio | diff de conteúdo; parser XML; comparar datas; não atualizar em massa por deploy | restaurar último sitemap aprovado se a data não for verificável |
| SEO-T03 | P1 | T7 | G / Fases 0–2 | GSC | N/D | cobertura atual, canonicals e 28/90 dias indisponíveis | exportar Page Indexing, Sitemaps, URL Inspection amostral, Search Results 28/90 dias e CWV, somente leitura | não | não | sim | reduz incerteza; alta | baixo / baixo | preservar export bruto, filtros, fuso e data | não aplicável; não alterar propriedade |
| SEO-T04 | P1 | T7 | B / Fase 2 | templates de home, categoria, procedimento, artigo e preço | N/D | PSI 429; campo N/D | executar Lighthouse/PSI reproduzível em mobile e desktop, três rodadas por template, e cruzar com CrUX/GSC | não | não | não | diagnóstico alto; alta | médio / baixo | guardar JSON, mediana e condições; não chamar laboratório de campo | não aplicável |
| SEO-T05 | P1 | T1 | B / Fase 3 | páginas com mídia, sobretudo otoplastia | Fato + inferência | até 63,07 MB de mídia referenciada; impacto real N/D | depois do baseline, testar poster otimizado, `preload="none"` fora da dobra, carregamento sob interação, compressão e variantes; não remover conteúdo | não | não | não | performance potencial alta; média | médio-alto / médio | LCP/CLS/TBT, bytes e início de reprodução; guardrail de acessibilidade e disponibilidade | restaurar atributos/arquivos anteriores se LCP, reprodução ou qualidade piorarem |
| SEO-T06 | P1 | T6 | G / Fase 8 | domínio `.com` antigo | Fato + inferência | resultado antigo concorre em busca; DNS direto falhou nesta coleta | validar propriedade, DNS, mapa URL-a-URL e, se controlado, aplicar 301 para equivalentes; solicitar recrawl/remoção apenas quando cabível | não | não | sim | entidade alta; média-alta | médio / alto | testar cada URL, cadeia única, preservação de path/query e ausência de loop | restaurar DNS/roteamento anterior se houver tráfego legítimo sem equivalente |
| SEO-T07 | P1 | T1 | B / Fase 3 | sitemap/grafo/CI | Fato observado | inventário hoje está consistente, mas manual | criar verificação read-only de sitemap↔arquivos, canonical, noindex, H1, links 404, redirects e órfãs em CI | não | não | não | prevenção alta; alta | médio / baixo | fixture de erro deve falhar; nenhum crawl externo destrutivo | remover etapa se gerar falso bloqueio; manter teste unitário |
| SEO-T08 | P2 | T1 | B / Fase 3 | `/braquioplastia/`, `/conteudos/papada-contorno-cervical/` | Cálculo | menor número de links internos de entrada | não alterar tecnicamente nesta fase; levar oportunidades de links/âncoras para pacote E/F | sim | não | não | descoberta média; alta | baixo / baixo | novo link deve ser editorialmente útil e rastreável; comparar crawl | reverter link se prejudicar navegação ou for artificial |
| SEO-T09 | P2 | T2 | E / Fase 7 | vídeos elegíveis | Cálculo | 33 vídeos, zero `VideoObject`, zero `<track>` | selecionar apenas vídeos com página de exibição, thumbnail, duração/data e descrição verdadeiras; avaliar `VideoObject`, legenda e transcrição aprovadas | sim | sim | não | acessibilidade/descoberta média; média | alto / médio | validar conteúdo visível, Rich Results e player; não marcar duplicatas irrelevantes | remover marcação/legenda incorreta, preservando vídeo |
| SEO-T10 | P2 | T7 | G / Fase 8 | Bing Webmaster/IndexNow | N/D | plugin existe; recibos do deploy e painel N/D | conferir chave, URLs submetidas, HTTP 200/202, rastreadas/indexadas e erros no painel | não | não | sim | frescor médio; alta | baixo / baixo | distinguir preparado, enviado, aceito e indexado | suspender automação se enviar URLs erradas; restaurar plugin aprovado |
| SEO-T11 | P2 | T1 | B / Fase 3 | fontes/CSS comuns | Fato + inferência | 43 páginas dependem de stylesheet externo de fontes; impacto real N/D | após baseline, testar subset/localização de fontes e CSS crítico por template | não | não | não | performance potencial média; média | médio / médio | LCP, CLS, peso, cache, rendering e licença | voltar ao carregamento atual se legibilidade ou métricas piorarem |
| SEO-T12 | P2 | T7 | B/G / Fase 2 | logs CDN | N/D | teste por user agent não valida bot genuíno | registrar acessos anonimizados e verificar IP/rDNS/ranges oficiais para Google/Bing/OpenAI/Perplexity | não | não | possivelmente | observabilidade média; alta | médio / baixo | nenhum IP/URL com PII em relatório; retenção definida | desativar log se exceder finalidade/retensão |

## Recomendações de comunicação separadas

Não pertencem ao pacote técnico inicial:

- revisão de titles, descriptions, headings, anchors, `alt`, aria-labels e Open Graph textual;
- fortalecimento de links internos de `/braquioplastia/` e `/conteudos/papada-contorno-cervical/` por âncoras editoriais;
- legenda, transcrição, data visível, autoria/revisão e fontes médicas;
- qualquer mudança semântica em FAQ, `MedicalProcedure`, `VideoObject`, `ImageObject` ou `sameAs`.

## Itens que não devem ser alterados agora

- **[Não alterar]** não remover canonicals, sitemap ou permissões atuais de Googlebot sem evidência de conflito.
- **[Não alterar]** não adicionar schema apenas para preencher validadores.
- **[Não alterar]** não atualizar todos os `<lastmod>` para a data do deploy.
- **[Não alterar]** não tratar a ausência de dados atuais do GSC/CWV como cobertura completa ou desempenho bom.
- **[Não alterar]** não trocar titles, descriptions, headings, `alt`, anchors, CTA ou layout no pacote técnico.
- **[Não alterar]** não prometer ranking; presença diagnóstica de uma consulta não é posição fixa.

## Fontes oficiais primárias

- Google Search Central — Googlebot: https://developers.google.com/search/docs/crawling-indexing/googlebot
- Google Search Central — sitemaps e `lastmod`: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central — canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search Central — dados estruturados: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google Search Central — recursos de IA na busca: https://developers.google.com/search/docs/appearance/ai-features
- web.dev — Core Web Vitals: https://web.dev/articles/vitals
- Schema.org — Physician: https://schema.org/Physician
- Schema.org — MedicalClinic: https://schema.org/MedicalClinic
- Schema.org — MedicalProcedure: https://schema.org/MedicalProcedure
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Bing IndexNow: https://www.bing.com/webmasters/help/indexnow-0z209wby

## Limitações finais

O rastreamento público foi um snapshot e não substitui logs verificados dos crawlers, URL Inspection, GSC, Bing Webmaster Tools, CrUX ou dados de usuários reais. A auditoria não realizou escrita externa, lead de teste, publicação, mudança de robots/sitemap/schema, commit ou deploy.
