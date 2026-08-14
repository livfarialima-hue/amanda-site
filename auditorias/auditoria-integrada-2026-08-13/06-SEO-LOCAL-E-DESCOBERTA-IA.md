# Auditoria de SEO, presença local e descoberta por IA

**Data de referência:** 13 de agosto de 2026<br>
**Mercado:** São Paulo, com foco em cirurgia facial e leitura controlada de mama/corpo<br>
**Escopo:** rastreamento, indexação, arquitetura, entidades, Perfil da Empresa, concorrência e descoberta por sistemas de IA<br>
**Modo:** somente leitura; nenhum perfil, página, sitemap, domínio ou regra de crawler foi alterado<br>
**Proteção explícita:** nenhuma recomendação autoriza mudar texto ou característica de `/lifting-facial/`.

## Resposta executiva

A base técnica do domínio atual é consistente: as **44 URLs do sitemap respondem 200**, apontam canonical para si próprias e têm título, descrição e uma H1. HTTP e `www` redirecionam 301 para HTTPS sem `www`; `robots.txt` permite crawling e declara o sitemap. Não há órfãos reais no conjunto atual. A maior lacuna de SEO não é um erro de HTML, mas a consolidação incompleta da entidade e da autoridade.

O Search Console confirma que o domínio começou a ganhar visibilidade, porém ainda tem escala pequena: entre 09/07 e 11/08/2026 houve **11 cliques, 409 impressões, CTR de 2,7% e posição média 21**. O relatório de indexação, atualizado em 06/08, mostra **39 URLs indexadas e 8 não indexadas**. Entre as duas “detectadas, mas não indexadas” estão `/avaliacao-facial/` e o guia geral de custo facial, ambas 200 e hoje presentes no sitemap. O relatório está defasado em sete dias e não deve ser tratado como estado instantâneo.

O achado estratégico mais importante é um domínio antigo ainda ativo: `draamandaschroeder.com` apareceu antes do domínio atual em uma busca de marca realizada nesta auditoria, com título truncado/antigo e conteúdo diferente. Isso divide sinais de marca, oferece caminhos de contato paralelos e aumenta a chance de buscadores e sistemas de IA associarem versões conflitantes da mesma profissional. A ação prioritária é confirmar controle e propósito desse domínio e, se não houver razão para mantê-lo, consolidá-lo por redirecionamentos 301 página a página.

No Google Business Profile, o gerenciador autenticado mostrou o perfil compartilhado e verificado **“Liv Faria Lima - Cardiologia e Cirurgia Plástica”**, mas nenhum perfil individual da Dra. Amanda nessa conta. Isso não prova que um perfil individual não exista em outro gerenciador. O perfil da clínica exibe nota 5,0 em 14 avaliações, endereço correto e site da LIV; sua categoria visível é genérica (“Clínica especializada”). A interface mostrou 220 visualizações do perfil no mês anterior e 283 interações com clientes, sem período explícito para este último cartão. Há uma inconsistência semântica a resolver: o perfil informa 05h–00h todos os dias, enquanto o site comunica disponibilidade da equipe 07h–23h. Pode ser horário físico versus atendimento remoto, mas a diferença precisa ser esclarecida e rotulada corretamente.

Para descoberta por IA, `OAI-SearchBot` está explicitamente permitido. `GPTBot` também fica permitido pela regra curinga, mas não há uma decisão independente documentada. A OpenAI distingue OAI-SearchBot, usado para descoberta em Search, de GPTBot, associado a possível treinamento; a política deve ser deliberada por bot. Permitir crawling e usar dados estruturados aumenta legibilidade, mas **não garante ranking, painel local ou citação por IA**.

## Como ler as evidências

- **Fato:** observado em código, HTTP, Search Console, Perfil da Empresa ou resultado público.
- **Derivação:** cálculo sobre valores observados.
- **Inferência:** interpretação provável, ainda não comprovada.
- **Hipótese:** explicação ou oportunidade a testar.
- **Recomendação:** ação futura, com aprovação e regra de decisão.

## Fontes e qualidade dos dados

| Fonte | Propriedade/escopo | Período/filtro | Coleta | Grão | Limitações | Confiança |
|---|---|---|---|---|---|---|
| Código e site público | 44 páginas, sitemap, robots, redirects, headers e JSON-LD | Snapshot atual | 13/08/2026, 21h–23h BRT | URL/tag/resposta | Não substitui renderização do Googlebot nem Rich Results Test ao vivo em todas as páginas | Alta |
| Search Console | Domínio `draamandaschroeder.com.br` | Performance exibida como 3 meses, com dados efetivos de 09/07–11/08/2026; todos os tipos padrão | 13/08/2026, aproximadamente 22h BRT | Consulta, página e dispositivo agregados | Baixo volume, queries raras omitidas por privacidade; indexação atualizada em 06/08 | Alta para a propriedade; média para generalização |
| Perfil da Empresa | Gerenciador autenticado; perfil compartilhado da Clínica LIV | Estado atual e cartões da interface | 13/08/2026, aproximadamente 22h45 BRT | Perfil agregado | Não foi encontrado perfil individual nessa conta; ausência no gerenciador não prova ausência global; período de “283 interações” não foi exibido | Alta para o perfil observado |
| GA4 | Canal `AI Assistant` e Organic Search | 16/07–12/08/2026, todos os usuários | 13/08/2026 | Canal agregado | Apenas consentidores; clique, não desfecho comercial | Média |
| Pesquisa pública | Buscas de marca, procedimento, preço e localização em São Paulo | Snapshot | 13/08/2026 | Resultado/página pública | SERPs variam por localização, personalização e tempo; não é geogrid nem estimativa de participação | Média |
| Documentação primária | Google Search Central, Business Profile, web.dev e OpenAI Help | Versões disponíveis | Consultada em 13/08/2026 | Regra/documentação | Documentação pode mudar; URLs e data registradas ao final | Alta |

## SEO técnico e arquitetura

| Controle | Resultado | Evidência/limitação | Parecer |
|---|---|---|---|
| Status HTTP | 44/44 URLs do sitemap em 200; sem redirecionamento interno no sitemap | `curl -L` público em 13/08 | Bom |
| Host e HTTPS | HTTP → HTTPS 301; `www` → sem `www` 301; HSTS de 1 ano | Headers públicos | Bom |
| Sitemap | 44 URLs absolutas e canônicas; conjunto idêntico ao HTML local | `sitemap.xml`; também aparece como filtro conhecido no GSC | Bom; status de envio no painel de Sitemaps não foi coletado |
| Robots | `OAI-SearchBot Allow: /`; `User-agent: * Allow: /`; sitemap declarado | `robots.txt` público | Google e OAI liberados; política de GPTBot apenas implícita |
| Canonical | 44/44 presentes e coerentes | Parser local | Bom |
| Indexação explícita | Nenhuma página com `noindex` | Parser local | Bom, salvo intenção futura |
| Título/H1/descrição | Nenhuma ausência; uma H1 por página; nenhum título ou descrição duplicado no estado atual | Parser local | Bom; há comprimentos a revisar, não erros críticos |
| Links internos | Nenhum órfão real | Resolução de links relativos | Bom; duas páginas têm só uma origem interna |
| Dados estruturados | JSON-LD válido localmente em 43/44 páginas; `/privacidade/` é a exceção | Validação sintática, não elegibilidade Google | Bom ponto de partida |
| Autoridade médica | CRM, RQE, autoria/revisão e endereço recorrentes | HTML e JSON-LD | Forte consistência interna |
| Core Web Vitals | Sem dados mobile e desktop no GSC | Relatório autenticado | Evidência insuficiente; não classificar como bom ou ruim |

### Metadados e links internos

Não há duplicatas atuais. Sete títulos ultrapassam 65 caracteres:

- `/conteudos/cuidados-cicatrizacao-cirurgia/` — 82 caracteres;
- `/conteudos/lipoenxertia-facial/` — 82;
- `/conteudos/naturalidade-envelhecimento/` — 94;
- `/conteudos/papada-contorno-cervical/` — 84;
- `/conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/` — 71;
- `/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` — 69;
- `/conteudos/seguranca-cirurgia-plastica/` — 88.

Uma meta description tem 167 caracteres, em `/conteudos/cuidados-cicatrizacao-cirurgia/`. Comprimento isolado não é penalidade; a oportunidade é tornar a informação principal visível antes de eventual truncamento. `/braquioplastia/` e `/conteudos/papada-contorno-cervical/` recebem link de apenas uma página no grafo local, portanto são as rotas mais frágeis de descoberta interna.

### Dados estruturados e entidade

O inventário sintático encontrou, entre outros, `Physician` em 43 páginas, `MedicalWebPage` em 40, `BreadcrumbList` em 34, `FAQPage` em 27, `MedicalProcedure` em 23, `MedicalClinic` em 20, `Article` em 19, `Organization` em 16 e `WebSite` na home. Vinte páginas declaram `sameAs`, todas apontando somente para o Instagram profissional.

**Fato.** O grafo é amplo e válido sintaticamente.<br>
**Limitação.** Validade JSON não garante elegibilidade nem exibição. O Google afirma que dados estruturados não garantem rich result.<br>
**Fato temporal.** O próprio registro de anomalias do Search Console informa que, desde 07/05/2026, resultados ricos de FAQ deixaram de aparecer no Google Search. Assim, `FAQPage` pode permanecer se refletir perguntas visíveis e corretas, mas não deve receber investimento esperando expansão visual na SERP.

## Search Console

### Desempenho

| Métrica | Valor |
|---|---:|
| Cliques | 11 |
| Impressões | 409 |
| CTR | 2,7% |
| Posição média | 21 |

#### Consultas com sinal

| Consulta | Cliques | Impressões | Leitura |
|---|---:|---:|---|
| `amanda schroeder` | 2 | 21 | Marca ainda dispersa entre domínios/perfis |
| `cirurgiao plastico perto de mim` | 1 | 2 | Sinal local inicial; amostra mínima |
| `lifting cervical em são paulo` | 0 | 16 | Relevância descoberta, sem clique |
| `lifting facial em são paulo` | 0 | 15 | Relevância descoberta, sem clique |
| `lifting cervical no interior de são paulo` | 0 | 14 | Alcance geográfico, intenção possivelmente diferente |
| `cirurgia de lifting cervical em são paulo` | 0 | 11 | Variação de alta intenção |
| `neck lift em são paulo` | 0 | 10 | Termo em inglês com demanda pequena |
| `lifting facial valor` | 0 | 8 | Intenção de custo |
| `blefaroplastia em são paulo` | 0 | 6 | Prioridade facial com espaço de CTR |

Esses dados identificam vocabulário, mas não autorizam mudar páginas protegidas nem criar texto médico sem revisão. O volume é insuficiente para estimar posição estável por consulta.

#### Páginas

| Página | Cliques | Impressões |
|---|---:|---:|
| `/` | 6 | 138 |
| `/procedimentos/` | 3 | 66 |
| `/blefaroplastia/` | 1 | 44 |
| `/injetaveis/` | 1 | 10 |
| `/lifting-cervical/` | 0 | 70 |
| Guia de preço de lifting | 0 | 62 |
| `/lifting-facial/` | 0 | 29 |
| `/lip-lifting/` | 0 | 20 |
| Guia de custo de mama | 0 | 18 |
| `/lipo-de-papada/` | 0 | 18 |

**Dispositivo:** mobile gerou 7 cliques/186 impressões; desktop, 4/202; tablet, 0/21. Não há volume para afirmar vantagem de CTR por dispositivo.

### Indexação

O relatório atualizado em 06/08/2026 mostra:

- 39 páginas indexadas;
- 8 não indexadas;
- 3 “página com redirecionamento”;
- 1 “não encontrada (404)”;
- 2 “detectada, mas não indexada no momento”;
- 2 “rastreada, mas não indexada no momento”.

Exemplos visíveis em “detectada, mas não indexada”:

1. `https://draamandaschroeder.com.br/avaliacao-facial/` — último rastreamento N/D;
2. `https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` — último rastreamento N/D.

**Fato.** Ambas hoje respondem 200, são canônicas e constam no sitemap.<br>
**Inferência.** A publicação/revisão recente e a defasagem do relatório podem explicar parte do estado.<br>
**Limitação.** Os exemplos das duas rastreadas e não indexadas, da 404 e dos redirecionamentos não foram capturados; não se deve presumir que sejam URLs atuais do sitemap.

## Perfil da Empresa e consistência local

### Perfil observado

- Perfil compartilhado: **Liv Faria Lima - Cardiologia e Cirurgia Plástica**.
- Status no gerenciador: confirmado/verificado.
- Endereço: Rua Pais Leme, 215, Pinheiros, São Paulo — consistente com o site atual.
- Site do perfil: `livfarialima.com.br`, não o domínio individual.
- Categoria exibida publicamente: “Clínica especializada em São Paulo”. A categoria primária técnica não foi aberta no editor.
- Avaliação pública agregada: 5,0/5 em 14 avaliações.
- Horário exibido: 05h–00h, todos os dias.
- Indicadores agregados mostrados: 220 pessoas viram o perfil no mês anterior; 283 interações com clientes em cartão sem período visível.
- O gerenciador autenticado mostrou dois perfis da clínica/estrutura, mas nenhum perfil individual da Dra. Amanda nessa conta.

Nenhum nome ou conteúdo individual de avaliação foi registrado neste relatório.

### Parecer local

**Fato.** Há um perfil de local verificado, com avaliações positivas e endereço coerente.<br>
**Lacuna.** A profissional não tem uma entidade individual observável nesse gerenciador. Como há mais de um médico público na localização, as diretrizes do Google admitem um perfil da organização separado do perfil de cada profissional elegível, desde que a profissional possa ser contatada diretamente no local durante o horário declarado.<br>
**Cuidado.** Criar perfil duplicado ou nome com palavras-chave viola diretrizes e pode gerar suspensão. Antes de criar qualquer perfil, é necessário pesquisar duplicatas, confirmar sinalização/atendimento e verificar se já existe sob outro proprietário.<br>
**Inconsistência a esclarecer.** Site: equipe disponível 07h–23h; GBP: estabelecimento 05h–00h. A diferença pode ser legítima, mas os rótulos precisam distinguir atendimento por mensagem, consulta e funcionamento físico.

## Descoberta por IA

### Controle de crawler

O `robots.txt` público é:

```text
User-agent: OAI-SearchBot
Allow: /

User-agent: *
Allow: /

Sitemap: https://draamandaschroeder.com.br/sitemap.xml
```

- **OAI-SearchBot:** explicitamente permitido, adequado ao objetivo de descoberta no ChatGPT Search.
- **GPTBot:** permitido pelo curinga, mas sem decisão explícita. A OpenAI orienta que GPTBot seja bloqueado nos conteúdos que o publicador queira excluir de possível treinamento, enquanto OAI-SearchBot precisa estar liberado para inclusão em resumos e snippets de Search.
- **Evidência de tráfego:** GA4 classificou 2 sessões como `AI Assistant`, ambas engajadas, com 3min05s de engajamento médio e nenhum evento principal. É apenas um indício inicial, afetado por consentimento e classificação de canal.

### Legibilidade e citabilidade

Pontos fortes atuais:

- conteúdo em HTML, sem depender de JavaScript para o texto principal;
- autoria e revisão médica visíveis em artigos;
- CRM/RQE, endereço e páginas de procedimento consistentes;
- respostas diretas sobre preço como composição, consulta, recuperação, risco e limites;
- sitemap, canonical e dados estruturados válidos.

Oportunidades:

- consolidar a identidade entre domínio atual, domínio antigo, clínica, perfil profissional e perfis controlados;
- ampliar `sameAs` apenas com fontes verificadas e controladas;
- manter respostas curtas e factuais no início de seções, seguidas de contexto e fonte;
- registrar data de revisão real e responsável médico em todo conteúdo clínico de decisão;
- separar claramente cirurgia de tratamentos não cirúrgicos quando a SERP mistura os dois sentidos de “lifting”.

Não foi encontrada documentação primária que torne `llms.txt` requisito de OpenAI ou Google. Portanto, ele não é prioridade frente a robots, indexação, entidade, conteúdo visível e links verificáveis.

## Mercado e concorrentes atuais

Pesquisa pública realizada em 13/08/2026 para marca, lifting/facelift, blefaroplastia, cirurgia plástica em Pinheiros, preço de mama, lipoaspiração e abdominoplastia. A amostra não é exaustiva nem uma medição de market share.

| Cluster | Concorrentes/resultados representativos | Padrão observado | Implicação para Amanda |
|---|---|---|---|
| Marca própria | [Domínio antigo `.com`](https://www.draamandaschroeder.com/), [domínio atual `.com.br`](https://draamandaschroeder.com.br/), [Linktree](https://linktr.ee/draamandaschroeder) | O `.com` antigo apareceu primeiro na busca de marca, com título “Dra Amanda Schroede” e conteúdo/canais diferentes | Consolidar a entidade é mais urgente que publicar novas páginas genéricas |
| Lifting e preço | [Clínica SER](https://www.sercirurgiaplastica.com.br/artigo/quanto-custa-um-lifting-facial), [Plástica do Sonho](https://www.plasticadosonho.com.br/blog/lifting-facial/), [preço Plástica do Sonho](https://www.plasticadosonho.com.br/blog/lifting-facial-preco/amp/), [José Carvalho](https://josecarvalho.com.br/deep-plane-facelift/), [Eliza Minami](https://elizaminami.com.br/tratamentos-clinica-eliza-minami/facelifting/), [Doctoralia](https://www.doctoralia.com.br/servicos-de-tratamento/lifting-facial/sao-paulo) | Métodos nomeados, deep plane, anos de atuação, hospital, recuperação detalhada, faixas explícitas de preço e marketplace | Diferenciar por fatos verificáveis: formação, participação direta, quando não operar e composição de custo; não copiar método ou promessa |
| Blefaroplastia | [Dra. Karla Caetano](https://drakarlacaetano.com.br/), [Clínica Sculpté](https://clinicasculpte.com.br/especialidades/cirurgia-plastica-facial/) | Especialização estreita, prova quantitativa, técnica nomeada e mapeamento queixa→procedimento | Reforçar prova verificável e clareza diagnóstica; evitar alegações numéricas sem fonte |
| Local Pinheiros | [Clínica Aldunate](https://clinicaaldunate.com.br/), [Sainte Claire](https://www.sainteclaire.com.br/), [Clínica Aquarium](https://clinicaaquarium.com.br/cirurgia-plastica-estetica-e-reparadora/) | Forte associação ao bairro e catálogo amplo; mensagens genéricas de excelência/humanização | Amanda pode competir com entidade médica mais específica e atendimento direto, desde que conecte site e GBP |
| Mama e corpo | [Clínica SER — mastopexia](https://www.sercirurgiaplastica.com.br/artigo/quanto-custa-uma-mastopexia-com-protese-em-sp-entenda-os-valores-em-2026), [Plástica do Sonho — lipoabdominoplastia](https://www.plasticadosonho.com.br/blog/valor-abdominoplastia-com-lipo/), [Hospital Samaritano — preços](https://www.hospitalsamaritano.com.br/precos-de-procedimentos-sp/) | Preço, itens incluídos, tecnologia, estrutura e autoridade dominam consultas transacionais | Manter expansão controlada; ganhar clareza de custo e segurança antes de ampliar mídia |

### Meta Ad Library Brasil — snapshot não disponível

Em 13/08/2026 foi feita uma tentativa somente leitura na [Meta Ad Library Brasil](https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR), com filtro de anúncios ativos e buscas pelos nomes públicos já presentes nesta amostra — Plástica do Sonho, Clínica SER, Dra. Karla Caetano e José Carvalho/cirurgia plástica. A biblioteca não carregou os resultados no ambiente de coleta, e a busca pública complementar não retornou registros da Ad Library que pudessem ser atribuídos com segurança a essas identidades.

Assim, quantidade de anúncios ativos, temas atuais e identidade do anunciante ficam **`N/D`**. Isso **não significa ausência de anúncios**. Nenhum texto de peça, métrica ou sinal da biblioteca foi usado em benchmark de desempenho ou nas recomendações desta auditoria.

### Leitura competitiva

**Fato no snapshot público amostrado.** “Naturalidade”, “segurança”, “excelência” e “atendimento humanizado” apareceram repetidamente; isoladamente, são mensagens pouco distintivas nesse recorte.<br>
**Inferência competitiva.** As páginas observadas que tornam a proposta mais concreta combinam esses conceitos com prova, como técnica específica, volume/tempo de atuação, hospital, cronograma ou preço; a amostra não mede conversão nem permite chamá-las de vencedoras.<br>
**Oportunidade.** A combinação mais defensável para Amanda é formação verificável + participação direta da cirurgiã + transparência sobre o que compõe custo e recuperação + critérios para não indicar.<br>
**Risco.** A SERP de “lifting” mistura cirurgia e procedimentos não cirúrgicos; páginas precisam declarar cedo o que é e o que não é tratado, sem ampliar promessa.

## Achados priorizados

| ID | Achado | Evidência | Impacto potencial | Confiança |
|---|---|---|---|---|
| SEO-F01 | Entidade dividida entre `.com` antigo e `.com.br` atual | Busca de marca exibiu o domínio antigo antes do atual | Muito alto | Alta para o snapshot; média para recorrência |
| SEO-F02 | Páginas estratégicas ainda não indexadas no último GSC | `/avaliacao-facial/` e guia de custo facial em “detectada” | Alto | Alta, com defasagem de 7 dias |
| SEO-F03 | Presença local é da clínica, não da profissional no gerenciador observado | Perfil LIV verificado; nenhum perfil Amanda na conta | Alto | Alta para a conta; baixa para ausência global |
| SEO-F04 | Horários públicos não têm o mesmo significado/valor | GBP 05h–00h; site 07h–23h para equipe | Médio-alto | Alta para a diferença; média para ser erro |
| SEO-F05 | Política OpenAI está parcialmente explícita | OAI dedicado; GPTBot coberto apenas por `*` | Médio | Alta |
| SEO-F06 | Autoridade semântica pode ser consolidada | `sameAs` somente Instagram em 20 páginas | Médio | Alta |
| SEO-F07 | FAQ markup não gera mais oportunidade visual regular no Google | 27 páginas; fim dos FAQ rich results em 07/05/2026 | Baixo-médio | Alta |
| SEO-F08 | Mama/corpo têm demanda, mas sinal próprio é insuficiente | guia de mama 18 impressões/0 cliques; GA4 quase sem entradas | Médio, controlado | Média |

## Recomendações rastreáveis

### SEO-01 — Consolidar o domínio antigo com a entidade atual

- **Problema:** dois domínios oficiais aparentes competem pela busca de marca e exibem conteúdo diferente.
- **Evidência e escopo:** `draamandaschroeder.com` apareceu antes de `.com.br` no snapshot de marca; o domínio antigo permanece acessível. Afeta marca, backlinks, local e IA.
- **Mudança proposta:** inventariar URLs/backlinks/controle do `.com`; se não houver função legítima independente, criar mapeamento 301 página a página para `.com.br`, atualizar links controlados e manter domínio renovado. Se houver razão para manter, atualizar conteúdo/canonical e explicar sua função sem duplicar oferta.
- **Impacto esperado:** muito alto. **Confiança:** alta. **Urgência:** P0. **Esforço:** médio. **Risco:** perda de URL com backlink ou serviço do Wix se redirecionado sem inventário.
- **Dependências, dono e aprovação:** acesso ao registrador/Wix, exportação de URLs e backlinks; Web/SEO + owner da marca; aprovação da proprietária do domínio.
- **Métrica e guardrails:** cobertura de 301, erros 404, cliques/impressões de marca e domínio escolhido no Google; guardrails de zero loop, zero perda de e-mail/serviço e preservação de rotas relevantes.
- **Duração e decisão:** preparação 1 semana, monitoramento 8–12 semanas. Manter se o domínio atual absorver marca e erros ficarem próximos de zero; expandir redirecionamentos conforme logs; reverter apenas mapeamentos incorretos, não a consolidação validada.

### SEO-02 — Fechar a fila de indexação com evidência por URL

- **Problema:** 8 URLs não indexadas no relatório, incluindo duas páginas comerciais/editoriais atuais.
- **Evidência e escopo:** GSC atualizado em 06/08; 2 detectadas, 2 rastreadas, 3 redirects e 1 404; 44 URLs atuais respondem 200.
- **Mudança proposta:** exportar os oito exemplos, classificar “atual, legado ou intencional”, inspecionar URL ao vivo, comparar canonical renderizada, linkagem e sitemap; solicitar validação/recrawl somente depois de corrigir causa real.
- **Impacto esperado:** alto. **Confiança:** alta. **Urgência:** P0. **Esforço:** baixo-médio. **Risco:** enviar repetidamente sem corrigir ou ressuscitar URL legada.
- **Dependências, dono e aprovação:** Search Console + Web/SEO; aprovação operacional simples, sem mudança clínica.
- **Métrica e guardrails:** URLs estratégicas indexadas, “detectada/rastreada não indexada”, 404 no sitemap; guardrail de sitemap só com canônicas 200 e zero soft-404.
- **Duração e decisão:** checagem semanal por 6 semanas. Manter se estratégicas entrarem no índice; ampliar linkagem somente onde houver valor; reverter inclusão de URL que não deve ranquear.

### SEO-03 — Reconciliar NAP, horário físico e disponibilidade da equipe

- **Problema:** GBP mostra 05h–00h diariamente; site comunica equipe disponível 07h–23h.
- **Evidência e escopo:** perfil LIV autenticado e rodapé/conteúdo do domínio atual.
- **Mudança proposta:** confirmar horário real de recepção, consulta e WhatsApp; rotular cada um explicitamente; alinhar GBP, site da LIV, site da médica e dados estruturados aplicáveis. Usar horários especiais em feriados.
- **Impacto esperado:** alto para confiança local. **Confiança:** alta na diferença. **Urgência:** P0. **Esforço:** baixo. **Risco:** usuário chegar com a clínica fechada ou Google suspender alteração inconsistente.
- **Dependências, dono e aprovação:** Operação da clínica + administradores GBP/Web; aprovação da direção da LIV.
- **Métrica e guardrails:** zero divergência factual, chamadas fora de horário e solicitações de rota; guardrail de nunca apresentar disponibilidade de chat como porta física aberta.
- **Duração e decisão:** correção após confirmação em até 7 dias; revisão trimestral e antes de feriados. Reverter qualquer horário que não reflita operação real.

### SEO-04 — Auditar elegibilidade e duplicatas antes de um perfil individual

- **Problema:** o perfil verificado é da clínica; a entidade da profissional não aparece no gerenciador observado.
- **Evidência e escopo:** dois perfis verificados no gerenciador, nenhum individual da Dra. Amanda; [diretriz oficial para profissionais individuais](https://support.google.com/business/answer/3038177?hl=en).
- **Mudança proposta:** pesquisar duplicatas no Maps e em outros proprietários, confirmar atendimento público e contato direto no local. Se elegível e inexistente, planejar um único perfil com nome real da profissional, categoria específica disponível e domínio individual; manter separado do perfil da organização.
- **Impacto esperado:** alto para intenção “cirurgiã plástica perto de mim”. **Confiança:** média, pois a ausência global não foi provada. **Urgência:** P1. **Esforço:** médio. **Risco:** suspensão por duplicata, nome promocional ou endereço não elegível.
- **Dependências, dono e aprovação:** sinalização, telefone/site direto, acesso de proprietária; SEO local + médica; aprovação da médica e direção da clínica.
- **Métrica e guardrails:** perfil verificado, impressões por categoria, ações e buscas de marca; guardrails de um perfil por profissional, nome real, categoria factual e nenhuma avaliação incentivada.
- **Duração e decisão:** auditoria de duplicatas em 1 semana; se criado, acompanhar 12 semanas. Manter apenas em conformidade; contestar/mesclar se surgir duplicata; não expandir por especialização.

### SEO-05 — Unificar o grafo de entidade e fontes controladas

- **Problema:** o JSON-LD identifica médica e clínica, mas `sameAs` se limita ao Instagram em 20 páginas; o domínio antigo reforça ambiguidade.
- **Evidência e escopo:** inventário de schema das 44 páginas.
- **Mudança proposta:** manter `@id` estáveis para `Physician`, `MedicalClinic`, `Organization` e `WebSite`; conectar `worksFor`/local de atendimento; adicionar somente perfis oficiais verificados e páginas institucionais controladas em `sameAs`; remover/redirectar fonte antiga conflitante.
- **Impacto esperado:** médio-alto para compreensão de entidade, sem garantia de rich result. **Confiança:** média-alta. **Urgência:** P1. **Esforço:** médio. **Risco:** declarar vínculo ou credencial não verificável.
- **Dependências, dono e aprovação:** lista de perfis oficiais e validação médica; SEO/Web; aprovação da marca e responsável médica.
- **Métrica e guardrails:** zero erro no Schema Markup Validator/Rich Results Test, consistência de nome/endereço/credencial em amostra; guardrail de todo dado ser visível, atual e verificável.
- **Duração e decisão:** implementar por template e observar 8 semanas. Manter se válido; expandir apenas a fontes controladas; reverter propriedade que não possa ser provada.

### SEO-06 — Priorizar páginas indexáveis e links internos, sem tocar lifting

- **Problema:** duas rotas têm apenas um link interno e sete títulos podem truncar; algumas páginas com impressões ainda não geram clique.
- **Evidência e escopo:** grafo local, metadados e GSC. Exclui `/lifting-facial/` e qualquer mudança em páginas de lifting protegidas.
- **Mudança proposta:** adicionar links contextuais para `/braquioplastia/` e `/conteudos/papada-contorno-cervical/`; revisar primeiro os títulos longos não relacionados a lifting, preservando intenção e autoria; validar snippets após recrawl.
- **Impacto esperado:** médio. **Confiança:** média. **Urgência:** P2. **Esforço:** baixo. **Risco:** título genérico ou canibalização.
- **Dependências, dono e aprovação:** SEO editorial + revisão médica para textos; aprovação de conteúdo.
- **Métrica e guardrails:** impressões, CTR por URL, links internos e consulta-alvo; guardrail de zero mudança clínica não revisada e zero alteração nas páginas protegidas.
- **Duração e decisão:** 6–8 semanas. Manter se indexação/CTR melhorarem sem perda de consultas relevantes; expandir por cluster; reverter título se cair relevância ou marca.

### SEO-07 — Formalizar política separada para OAI-SearchBot e GPTBot

- **Problema:** descoberta está explicitamente permitida, mas a decisão de treinamento é implícita pelo curinga.
- **Evidência e escopo:** `robots.txt`; [FAQ oficial da OpenAI para publishers](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq), consultada em 13/08/2026.
- **Mudança proposta:** manter `OAI-SearchBot Allow: /` se descoberta/citação forem desejadas; definir bloco próprio de `GPTBot` como `Allow` ou `Disallow` conforme decisão da proprietária; testar resposta e CDN por user-agent. Não prometer citação.
- **Impacto esperado:** médio para governança; descoberta já está liberada. **Confiança:** alta. **Urgência:** P1. **Esforço:** baixo. **Risco:** bloquear o bot errado.
- **Dependências, dono e aprovação:** Jurídico/Marca + Web; aprovação explícita da proprietária do conteúdo.
- **Métrica e guardrails:** acesso 200 ao OAI, logs de crawler e referrals `utm_source=chatgpt.com`; guardrail de manter Googlebot e OAI acessíveis se busca for objetivo.
- **Duração e decisão:** decisão e teste em 1 semana; revisão semestral. Reverter imediatamente regra que bloquear descoberta desejada.

### SEO-08 — Criar rotina ética de avaliações para a clínica e, se elegível, para a profissional

- **Problema:** 14 avaliações positivas oferecem prova inicial, mas volume é pequeno e pertence à clínica compartilhada.
- **Evidência e escopo:** GBP LIV, 5,0/14; Google informa que avaliações e respostas ajudam o perfil a se destacar, sem garantir ranking.
- **Mudança proposta:** solicitar avaliação de forma uniforme após atendimento, sem incentivo nem seleção por satisfação; responder sem confirmar relação clínica ou revelar procedimento; separar destino clínica/profissional conforme quem prestou o atendimento e a elegibilidade do perfil.
- **Impacto esperado:** médio-alto. **Confiança:** média. **Urgência:** P1. **Esforço:** baixo recorrente. **Risco:** privacidade, review gating ou respostas com informação médica.
- **Dependências, dono e aprovação:** Operação + Compliance + responsável pelos perfis; aprovação médica/privacidade.
- **Métrica e guardrails:** novas avaliações legítimas, tempo de resposta e temas agregados; guardrails de zero incentivo, zero gating, zero PII/PHI e respostas neutras.
- **Duração e decisão:** piloto de 8 semanas. Manter se processo for uniforme e seguro; expandir somente com compliance; suspender ao primeiro desvio.

### SEO-09 — Expandir mama e corpo apenas por prova orgânica controlada

- **Problema:** mercado de preço é competitivo, enquanto o domínio tem pouco sinal próprio nessas áreas.
- **Evidência e escopo:** guia de mama com 18 impressões e zero clique no GSC; GA4 com volume de landing quase nulo; concorrentes exibem custo, estrutura e itens incluídos.
- **Mudança proposta:** primeiro garantir indexação dos hubs/guias atuais, conectar páginas de decisão e medir conversa qualificada por cluster. Publicar somente lacunas reais — por exemplo, itens de custo, recuperação e diferença entre procedimentos — com revisão médica; não ampliar mídia com base só em impressões.
- **Impacto esperado:** médio e de prazo maior. **Confiança:** média-baixa. **Urgência:** P2. **Esforço:** médio. **Risco:** dispersar autoridade e orçamento.
- **Dependências, dono e aprovação:** SEO editorial, médica, Analytics e aquisição; aprovação estratégica antes de mídia.
- **Métrica e guardrails:** páginas indexadas, consultas não-marca, cliques, conversas válidas e leads qualificados do cluster; guardrails de não reduzir share de face prioritária e não usar preço desatualizado.
- **Duração e decisão:** 12 semanas orgânicas. Manter com crescimento de consulta e qualidade; expandir apenas após desfecho comercial; reverter páginas redundantes/canibalizantes.

## Ordem recomendada

1. SEO-01, SEO-02 e SEO-03: consolidar domínio, indexação e fatos locais.
2. SEO-04 e SEO-05: decidir a entidade profissional e unificar o grafo.
3. SEO-07 e SEO-08: formalizar política de IA e rotina ética de avaliações.
4. SEO-06 e SEO-09: ganhos editoriais controlados, sem tocar lifting e sem dispersar prioridade facial.

## Limitações finais

- A pesquisa de mercado é um snapshot, não geogrid, share of voice ou ranking garantido.
- O Search Console tinha apenas 409 impressões e 11 cliques; conclusões por consulta têm grande incerteza.
- A cobertura de indexação estava atualizada em 06/08, enquanto o site foi conferido em 13/08.
- O painel de Sitemaps não foi concluído; o sitemap aparece como origem conhecida no relatório, mas seu status de envio não foi registrado.
- O perfil individual da Dra. Amanda não apareceu no gerenciador autenticado observado; isso não prova ausência em outra conta ou propriedade.
- Nenhuma avaliação individual, e-mail, telefone pessoal, conversa ou dado de paciente foi registrado.
- Não há promessa de ranking, painel local, rich result ou citação por IA.

## Fontes técnicas primárias

Consultadas em 13/08/2026:

- [Google Search Central — como o Google rastreia, indexa e serve resultados](https://developers.google.com/search/docs/fundamentals/how-search-works)
- [Google Search Central — introdução ao robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google Search Central — criação e envio de sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central — sinais de canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google Search Central — políticas gerais de dados estruturados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Search Central — `LocalBusiness`](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Search Console — relatório de indexação](https://support.google.com/webmasters/answer/7440203?hl=en)
- [Search Console — limitações e diferenças de dados](https://support.google.com/webmasters/answer/96568?hl=en)
- [Search Console — anomalias; fim de FAQ rich results em 07/05/2026](https://support.google.com/webmasters/answer/6211453?hl=en)
- [Google Business Profile — fatores de resultado local](https://support.google.com/business/answer/7091?hl=en-en)
- [Google Business Profile — representação de empresas e profissionais individuais](https://support.google.com/business/answer/3038177?hl=en)
- [Google Business Profile — categorias](https://support.google.com/business/answer/7249669?hl=en)
- [OpenAI — Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
