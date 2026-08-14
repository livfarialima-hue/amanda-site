# Auditoria de site e conversão

**Data de referência:** 13 de agosto de 2026<br>
**Timezone de coleta:** America/Sao_Paulo, salvo quando a interface não o exibiu<br>
**Escopo:** site público, código local, CTAs, consentimento, tracking e GA4<br>
**Modo:** auditoria somente leitura; nenhuma página, tag ou configuração externa foi alterada<br>
**Proteção explícita:** a página `/lifting-facial/` não foi modificada. As recomendações abaixo não autorizam mudança de texto, layout, mídia, CTA ou outra característica dessa página.

## Resposta executiva

O site tem uma base técnica melhor do que o volume de negócio hoje mensurado sugere. O inventário local e público fecha em **44 URLs**, todas presentes no sitemap, com canonical coerente, uma H1, descrição e resposta HTTP 200. Há **213 links de WhatsApp**, todos marcados para tracking, e nenhum formulário. Credenciais, localização em Pinheiros, contexto da consulta, recuperação, riscos e limites estão presentes nas páginas comerciais prioritárias. Os seis testes de tracking e consistência executados somaram **33 casos aprovados e zero falha**.

O principal gargalo de conversão não é a ausência de CTA; é a falta de visibilidade após o clique. O GA4 mede `whatsapp_click`, mas não comprova conversa iniciada, lead válido, consulta ou cirurgia. Além disso, a implementação bloqueia as tags Google até o consentimento. Isso é coerente com o comportamento de **Consent Mode básico**, embora a configuração interna use o rótulo `advancedConsentMode: true`. Portanto, GA4 representa apenas visitantes que consentiram e não deve ser usado como denominador de todo o tráfego.

Nos 28 dias de 16/07 a 12/08/2026, o GA4 mostrou **519 sessões**, **2.436 eventos**, **49 ocorrências de `whatsapp_click`** e **35 eventos principais**, todos `whatsapp_click`. A diferença 49 versus 35 está confirmada, mas a causa não. Entre páginas com volume utilizável, `/avaliacao-facial/` teve o sinal direcional mais forte; `/lipo-de-papada/` teve 35 sessões e nenhum evento principal. Esses números são diagnóstico de clique consentido, não taxa de lead nem de consulta.

Não existe evidência suficiente para afirmar que o site é rápido ou lento em Core Web Vitals. O Search Console não tem dados de campo para mobile nem desktop, e a tentativa de PageSpeed Insights recebeu HTTP 429 por falta de cota. Há, porém, risco técnico verificável: 33 vídeos em 16 páginas, 31 com `preload="metadata"`, e ativos locais que chegam a 42,64 MB em páginas não protegidas. A medição de campo deve preceder uma conclusão de performance.

## Como ler as evidências

- **Fato:** observado diretamente em código, HTTP ou interface autenticada.
- **Derivação:** cálculo simples sobre valores observados.
- **Inferência:** interpretação provável, ainda não comprovada por desfecho comercial.
- **Hipótese:** explicação a testar.
- **Recomendação:** ação futura sujeita à aprovação indicada.

## Fontes e qualidade dos dados

| Fonte | Propriedade/escopo | Período e filtro | Coleta | Grão | Limitações | Confiança |
|---|---|---|---|---|---|---|
| Repositório local | 44 `index.html`, `sitemap.xml`, `robots.txt`, `_redirects`, `_headers`, scripts e CSS | Estado observado em 13/08/2026 | 13/08/2026, 21h–23h BRT | Página, link, tag e arquivo | Estado local pode anteceder ou suceder deploy; reconciliado com respostas públicas para URLs | Alta |
| Site público | `https://draamandaschroeder.com.br/` e as 44 URLs do sitemap | Snapshot pontual | 13/08/2026, aproximadamente 22h41 BRT | URL e resposta HTTP | Teste de uma origem, sem emulação de rede móvel; tempo de `curl` não é Core Web Vital | Alta para status; baixa para velocidade percebida |
| GA4 | `Dra. Amanda Schroeder — Site` | Últimos 28 dias, 16/07–12/08/2026, todos os usuários | 13/08/2026, aproximadamente 22h BRT | Sessão, canal, landing page e evento agregado | Fuso da propriedade não foi exibido; tags só carregam após consentimento; clique não prova conversa; atualização ao vivo variou de 519 para 520 sessões entre telas | Média-alta para tráfego consentido; baixa para funil completo |
| Testes locais | Seis suítes em `campanhas/*.test.mjs` | Código vigente | 13/08/2026 | Caso de teste | Cobrem regras codificadas, não execução em todos os navegadores reais | Alta para regressões testadas |
| Search Console/PSI | Core Web Vitals e tentativa de PageSpeed Insights | Estado em 13/08/2026 | 13/08/2026 | Propriedade/URL | Search Console sem dados de campo; API PSI retornou 429 `RESOURCE_EXHAUSTED` | Alta para a limitação; nenhuma conclusão de CWV |

## Inventário de páginas

O sitemap público e o conjunto local de páginas coincidem exatamente em 44 URLs.

| Grupo | URLs |
|---|---|
| Institucional e navegação | `/`, `/procedimentos/`, `/avaliacao-facial/`, `/privacidade/` |
| Face | `/injetaveis/`, `/blefaroplastia/`, `/lifting-facial/`, `/lifting-cervical/`, `/lipo-de-papada/`, `/lip-lifting/`, `/otoplastia/`, `/otoplastia-adulto/`, `/otoplastia-infantil/` |
| Mama | `/mama/`, `/mastopexia/`, `/mastopexia-com-protese/`, `/mamoplastia-redutora/`, `/protese-de-mama/` |
| Corpo | `/contorno-corporal/`, `/lipoaspiracao/`, `/abdominoplastia/`, `/pos-bariatrica/`, `/braquioplastia/`, `/ninfoplastia/` |
| Biblioteca e guias | `/conteudos/`, quatro guias de custo — facial geral, lifting facial, mama e corporal — e 15 conteúdos sobre decisão, recuperação, segurança, cicatrização, naturalidade e procedimentos |

### Inventário por URL

Legenda de eventos: `PV` = `page_view` do GA4 e `PageView` da Meta após consentimento; `WA` = `whatsapp_click` no GA4 e conversão Google Ads de clique deduplicada por sessão após consentimento; `CD` = `content_depth_click` somente onde o link possui a marcação correspondente. “Relação temática” não significa URL final confirmada: os destinos Google não foram expostos na coleta ao vivo.

| URL | Intenção | Procedimento | Campanha ativa relacionada | Origem de tráfego | CTA | Eventos | Indexabilidade | Função no funil |
|---|---|---|---|---|---|---|---|---|
| `/` | marca e visão geral | portfólio | `G26MARCA`, relação temática; final N/D | orgânico, direto, interno; pago N/D | WA (7) | PV; WA | elegível: 200, canonical, sitemap | descoberta e confiança |
| `/procedimentos/` | explorar alternativas | portfólio | nenhuma URL final ativa confirmada | orgânico, direto, interno | WA (3) | PV; WA; CD quando marcado | elegível | navegação e consideração |
| `/avaliacao-facial/` | entender a queixa antes da técnica | avaliação facial | `M26F02S` confirmada; `G26FACE` temático, final N/D | Meta pago confirmado; orgânico, direto e interno | WA (6) | PV; WA | elegível; GSC “detectada, não indexada” em 06/08 | landing de aquisição |
| `/mama/` | conhecer opções de mama | mama | nenhuma ativa; possível teste futuro | orgânico, direto, interno | WA (7) | PV; WA | elegível | hub de consideração |
| `/mastopexia/` | flacidez/queda mamária | mastopexia | nenhuma ativa | orgânico e interno | WA (5) | PV; WA | elegível | decisão de procedimento |
| `/mastopexia-com-protese/` | elevar e recuperar volume | mastopexia com prótese | nenhuma ativa | orgânico e interno | WA (5) | PV; WA | elegível | decisão de procedimento |
| `/mamoplastia-redutora/` | reduzir peso/volume | mamoplastia redutora | nenhuma ativa | orgânico e interno | WA (5) | PV; WA | elegível | decisão de procedimento |
| `/protese-de-mama/` | aumento e escolha de implante | prótese de mama | nenhuma ativa | orgânico e interno | WA (5) | PV; WA | elegível | decisão de procedimento |
| `/injetaveis/` | comparar tratamentos não cirúrgicos | injetáveis | nenhuma ativa | orgânico, direto e interno | WA (6) | PV; WA | elegível | consideração e conversão |
| `/blefaroplastia/` | tratar pálpebras/olhar | blefaroplastia | `G26BLEF`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (6) | PV; WA | elegível | landing de procedimento |
| `/lifting-facial/` | tratar flacidez facial | lifting facial | `G26LIFT`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (6) | PV; WA | elegível | landing protegida; nenhuma mudança autorizada |
| `/lifting-cervical/` | tratar flacidez/contorno cervical | lifting cervical | `G26CERV`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (6) | PV; WA | elegível | landing de procedimento |
| `/lipo-de-papada/` | avaliar gordura submentoniana | lipo de papada | `G26CERV`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (6) | PV; WA | elegível | landing de procedimento |
| `/lip-lifting/` | distância nariz–lábio | lip lifting | nenhuma ativa | orgânico e interno | WA (4) | PV; WA | elegível | consideração específica |
| `/otoplastia/` | entender correção de orelhas | otoplastia | `G26OTO`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (5) | PV; WA | elegível | roteamento de intenção |
| `/otoplastia-adulto/` | otoplastia para adulto | otoplastia adulta | `G26OTO`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (5) | PV; WA | elegível | landing segmentada |
| `/otoplastia-infantil/` | decisão familiar sobre otoplastia | otoplastia infantil | `G26OTO`, relação temática; final N/D | orgânico, interno; pago potencial N/D | WA (5) | PV; WA | elegível | landing segmentada |
| `/contorno-corporal/` | explorar queixas corporais | contorno corporal | nenhuma ativa; possível teste futuro | orgânico, direto e interno | WA (7) | PV; WA | elegível | hub de consideração |
| `/lipoaspiracao/` | gordura localizada | lipoaspiração | nenhuma ativa; possível teste futuro | orgânico e interno | WA (6) | PV; WA | elegível | decisão de procedimento |
| `/abdominoplastia/` | pele/parede abdominal | abdominoplastia | nenhuma ativa; possível teste futuro | orgânico e interno | WA (6) | PV; WA | elegível | decisão de procedimento |
| `/pos-bariatrica/` | organizar prioridades após emagrecimento | pós-bariátrica | nenhuma ativa | orgânico e interno | WA (6) | PV; WA | elegível | decisão de procedimento |
| `/braquioplastia/` | excesso de pele nos braços | braquioplastia | nenhuma ativa | orgânico e interno | WA (4) | PV; WA | elegível | decisão de procedimento |
| `/ninfoplastia/` | conforto íntimo e função | ninfoplastia | nenhuma ativa | orgânico e interno | WA (6) | PV; WA | elegível | decisão de procedimento |
| `/conteudos/` | pesquisar antes de decidir | biblioteca | nenhuma URL final ativa confirmada | orgânico, direto e interno | WA (5) | PV; WA; CD quando marcado | elegível | descoberta e navegação |
| `/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` | custo e composição | cirurgia facial | `G26FACE`, relação temática; final N/D | orgânico e interno; pago N/D | WA (5) | PV; WA; CD quando marcado | elegível; GSC “detectada, não indexada” em 06/08 | consideração de preço |
| `/conteudos/quanto-custa-lifting-facial-sao-paulo/` | custo e composição | lifting facial | `G26LIFT`, relação temática; final N/D | orgânico e interno; pago N/D | WA (6) | PV; WA; CD quando marcado | elegível | consideração de preço; página principal protegida não é alterada |
| `/conteudos/quanto-custa-cirurgia-plastica-mama-sao-paulo/` | custo e composição | mama | nenhuma ativa; possível teste futuro | orgânico e interno | WA (6) | PV; WA; CD quando marcado | elegível | consideração de preço |
| `/conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/` | custo e composição | corpo | nenhuma ativa; possível teste futuro | orgânico e interno | WA (6) | PV; WA; CD quando marcado | elegível | consideração de preço |
| `/conteudos/lifting-facial-ou-injetaveis/` | comparar abordagens | lifting/injetáveis | nenhuma URL final ativa confirmada | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e comparação |
| `/conteudos/blefaroplastia-quando-faz-sentido/` | entender indicação | blefaroplastia | nenhuma URL final ativa confirmada | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e objeção |
| `/conteudos/mastopexia-com-ou-sem-protese/` | comparar abordagens | mama | nenhuma ativa | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e comparação |
| `/conteudos/lipoaspiracao-ou-abdominoplastia/` | comparar abordagens | corpo | nenhuma ativa | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e comparação |
| `/conteudos/recuperacao-lifting-facial/` | planejar recuperação | lifting facial | nenhuma URL final ativa confirmada | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | objeção e preparo |
| `/conteudos/cicatrizes-cirurgia-de-mama/` | entender cicatrizes | mama | nenhuma ativa | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | objeção e preparo |
| `/conteudos/cirurgia-plastica-apos-emagrecimento/` | organizar prioridades | pós-bariátrica | nenhuma ativa | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e consideração |
| `/conteudos/como-escolher-protese-de-mama/` | entender escolha de implante | prótese de mama | nenhuma ativa | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e objeção |
| `/conteudos/botox-preenchimento-bioestimulador/` | comparar tratamentos | injetáveis | nenhuma ativa | orgânico e interno | WA (4) | PV; WA; CD quando marcado | elegível | educação e comparação |
| `/conteudos/consulta-cirurgia-plastica/` | entender a consulta | transversal | nenhuma URL final ativa confirmada | orgânico e interno | WA (5) | PV; WA; CD quando marcado | elegível | redução de fricção |
| `/conteudos/seguranca-cirurgia-plastica/` | avaliar segurança | transversal | nenhuma ativa | orgânico e interno | WA (5) | PV; WA; CD quando marcado | elegível | confiança e objeção |
| `/conteudos/naturalidade-envelhecimento/` | entender naturalidade | face | nenhuma ativa | orgânico e interno | WA (3) | PV; WA; CD quando marcado | elegível | posicionamento e confiança |
| `/conteudos/lipoenxertia-facial/` | entender restauração de volume | lipoenxertia facial | nenhuma ativa | orgânico e interno | WA (3) | PV; WA; CD quando marcado | elegível | educação de procedimento |
| `/conteudos/papada-contorno-cervical/` | diferenciar causas | cervical/papada | nenhuma URL final ativa confirmada | orgânico e interno | WA (3) | PV; WA; CD quando marcado | elegível | educação e comparação |
| `/conteudos/cuidados-cicatrizacao-cirurgia/` | preparar recuperação | transversal | nenhuma ativa | orgânico e interno | WA (3) | PV; WA; CD quando marcado | elegível | preparo e confiança |
| `/privacidade/` | entender dados e cookies | privacidade | nenhuma | orgânico, direto e interno | sem CTA WA | PV | elegível | conformidade e consentimento |

### Relação com aquisição e intenção

| Papel | Páginas principais | Conversão observável | Observação |
|---|---|---|---|
| Entrada ampla de face | `/avaliacao-facial/` | Clique no WhatsApp | Melhor sinal direcional entre landings com volume; não é prova de lead qualificado |
| Procedimentos faciais prioritários | `/lifting-facial/`, `/lifting-cervical/`, `/blefaroplastia/`, `/lipo-de-papada/`, rotas de otoplastia | Clique no WhatsApp | Mensagens carregam referência técnica de origem; lifting permanece protegido contra mudanças |
| Intenção de preço | Quatro guias em `/conteudos/quanto-custa-.../` | Clique para procedimento ou WhatsApp | Boa ponte entre dúvida financeira e avaliação; volume ainda desigual |
| Mama e corpo | Hubs e páginas específicas | Clique no WhatsApp | Tráfego de entrada orgânico/consentido muito baixo no período; não sustenta escala por si só |
| Educação | Biblioteca e artigos | Navegação interna e WhatsApp | Conteúdo revisado, com fontes em artigos; mensuração de profundidade existe após consentimento |

## Inventário de CTA, formulário e tracking

| Elemento | Evidência confirmada | Parecer |
|---|---|---|
| WhatsApp | 213/213 links `wa.me` têm `data-track="whatsapp"`; 43 páginas têm CTA, e só `/privacidade/` não tem | Cobertura técnica completa no HTML atual |
| Formulário | Zero formulários nas 44 páginas | Coerente com o norte de um caminho principal; não há rota alternativa se o WhatsApp falhar |
| Semântica | CTAs usam “ver horários”, “ver disponibilidade” ou “conversar com a equipe” | Adequado: não apresenta clique como agendamento confirmado |
| Atribuição | UTM/origem e `gclid`, `gbraid`, `wbraid` são mantidos na sessão e adicionados à mensagem voluntária; referências técnicas não contêm dado clínico | Bom desenho para preservar origem sem enviar evento externo antes do consentimento |
| Evento GA4 | `whatsapp_click` envia `page_type`, `content_group`, `cta_location`, `cta_text` e `page_path` após consentimento | Granularidade suficiente no código; falta confirmar dimensões e relatórios operacionais no GA4 |
| Google Ads | Conversão de clique é deduplicada uma vez por sessão | Evita repetição na mesma sessão, mas ainda é evento intermediário |
| Meta | PageView somente após consentimento; nenhum evento de contato médico enviado | Abordagem de minimização consistente com a sensibilidade do contexto |
| Consentimento | Estado padrão negado; tags Google e Meta só carregam após aceite | Na prática, Consent Mode básico; GA4 subconta não consentidores |
| Erros/regressão | 33/33 testes locais aprovados | Boa proteção do comportamento codificado, sem substituir QA de navegador e ponta a ponta |

### Inventário fechado de conversões e eventos

| Nome | Plataforma | Origem | Definição | Principal/secundário | Campanhas que utilizam | Volume e período | Deduplicação | Correspondência com CRM | Qualidade | Risco |
|---|---|---|---|---|---|---|---|---|---|---|
| `page_view` | GA4 | `tracking-loader.js`, após consentimento | uma visualização técnica da página | padrão, não evento principal | medição de todas as rotas; não confirmado como meta de lance | N/D isolado; 2.436 eventos totais GA4 em 16/07–12/08 | uma vez por carregamento na execução | nenhuma | boa para tráfego consentido; baixa para negócio | subcontar não consentidores |
| `PageView` | Meta Pixel | `tracking-loader.js`, após consentimento | carregamento de página enviado ao Pixel pelo navegador | evento-base; não é o resultado final das campanhas | suporte técnico à campanha Site; vínculo nominal com o conjunto ativo N/D | 873 em 16/07–12/08; 910 eventos totais do conjunto de dados nos 28 dias exibidos | uma vez por carregamento na execução; `event_id`/deduplicação de plataforma N/D | nenhuma | média para recepção browser; baixa para negócio | diagnóstico ativo de alguns dados do domínio bloqueados por possível contexto de saúde; CAPI não evidenciada; payload/deduplicação N/D |
| `whatsapp_click` | GA4 | `conversion-tracking.js`, clique voluntário | clique em CTA WhatsApp com página e posição | aparece como evento principal; 49 eventos versus 35 principais | todas as páginas com CTA; não é a meta qualificada Google | 49 ocorrências e 35 eventos principais, 16/07–12/08 | cada clique GA4; sem deduplicação por pessoa | nenhum vínculo nativo | média para intenção; baixa para lead | confundir clique com conversa/qualificado |
| `conversion` de clique WA | Google Ads | `conversion-tracking.js` e label configurado | sinal intermediário no primeiro clique WA consentido da sessão | ação correspondente não foi identificada ao vivo; N/D | vínculo com campanhas ativas N/D | N/D | uma vez por sessão pelo armazenamento local | nenhuma | baixa para negócio | competir com a conversão offline qualificada ou inflar metas |
| `content_depth_click` | GA4 | links `data-track="content-depth"` | navegação para conteúdo mais profundo | secundário/diagnóstico | páginas com marcação; não é meta de campanha | N/D | por clique marcado | nenhuma | boa para navegação; baixa para negócio | usar engajamento como conversão |
| Visualização da página de destino | Meta Ads | evento/resultado de plataforma | carregamento de landing após clique conforme definição Meta | evento de otimização da `M26F02S` | `M26F02S` | 1.290, 24/07–12/08 | definição/modelagem da plataforma; detalhe N/D | zero oportunidade com código exato `M26F02S` | alta para entrega; baixa para negócio | escalar tráfego sem atribuição |
| Conversa por mensagem iniciada | Meta Ads | resultado de mensagens | conversa atribuída conforme janela da Meta | evento de otimização da `M26F01W` | `M26F01W` | 48, 28/07–12/08 | pessoas únicas e modelagem N/D | 41 oportunidades codificadas, sem junção pessoa a pessoa | alta para plataforma; baixa/média para aquisição | chamar conversa de pessoa ou qualificado |
| `qualified_lead` → `Lead qualificado GCLID` | CRM/Google Ads | planilha e importação por um click ID | oportunidade qualificada importada sem PII/PHI | ação Google principal e incluída; `Requer atenção` | seis campanhas Google ativas | 0 no snapshot de 12/08; cinco transações na planilha, duas no ledger novo | transaction ID determinístico; exatamente um GCLID/GBRAID/WBRAID | parcial; dois nomes de ação circulam | conceito alto; execução atual baixa | rejeição, nome divergente ou duplicidade |
| `Lead qualificado` legado | Google Ads/planilha | ação e nome históricos | conversão qualificada antiga | secundária, inativa e fora das metas | nenhuma campanha ativa deve utilizá-la | 0 no snapshot; três dos cinco registros da planilha usam o nome curto | N/D | contamina nomenclatura do importador | baixa | upload na ação errada; uso permitido aqui só como contaminação técnica |
| consulta solicitada/agendada/confirmada/realizada/falta | CRM/Calendar | planilha `Consultas` e Calendar | estados da passagem para consulta | downstream; ainda não aptos para mídia | nenhuma campanha deve otimizar por eles hoje | solicitação N/D; 1 provisória e 0 realizada na coorte WA; reconciliação 1/10 IDs | identidade/estado não unificados | baixa | baixa | atribuição falsa, conflito de sala ou “zero” indevido |
| `quote_sent`, `accepted`, `completed`, `payment_confirmed` | contrato local/CRM | regras publicadas em 13/08 | marcos de orçamento, aceite, cirurgia e pagamento | downstream; não materializados | nenhuma | N/D; sem campos tipados e sem backfill | N/D | ausente | baixa | inventar cirurgia, receita ou ROAS |

### Testes executados

`node --test` foi executado sobre `conversion-tracking`, `site-whatsapp-attribution`, `cost-guides`, `footer-consistency`, `lifting-price-page` e `otoplasty-pages`: **33 aprovados, 0 falhas, 0 ignorados**. A suíte confirmou, entre outros, que CTAs recebem referência estável, click IDs sobrevivem na sessão sem disparo externo não consentido, a conversão Google só é enviada após consentimento e os guias estão ligados ao sitemap e aos hubs.

## Conteúdo, clareza e confiança

**Fato.** As páginas prioritárias amostradas apresentam CRM-SP 191605, RQE 110472, endereço correto na Rua Pais Leme, Pinheiros, explicação de consulta, estrutura hospitalar, recuperação, cicatrizes e riscos. A consulta de R$ 500 aparece em 18 páginas, incluindo as entradas comerciais de maior intenção. O texto diferencia avaliação de indicação e não promete cirurgia ou resultado.

**Fato.** A proposta converge com o norte canônico: atuação particular, naturalidade, participação direta da médica, segurança, custos explicados e um caminho principal para WhatsApp. Não foi encontrada promessa de “menor preço”, celebridade ou agendamento automático.

**Inferência.** O site já responde a muitas objeções; acrescentar mais blocos indiscriminadamente tende a aumentar comprimento antes de resolver a lacuna de mensuração. A prioridade deve ser provar onde há perda — CTA, abertura do WhatsApp, conversa, qualificação ou agenda — e só então mudar conteúdo.

### Leitura profunda das páginas prioritárias

A tabela cruza somente o HTML vigente com o recorte GA4 de 16/07 a 12/08 entre usuários consentidores. “Promessa” descreve a resposta editorial oferecida pela página, não garantia de resultado. Os códigos Google indicam relação temática; a URL final das campanhas não foi exposta e permanece `N/D`. Fricção e perda provável são inferências limitadas; quando o dado não isola a causa, ela fica `N/D`.

| Página | Intenção / campanha ativa | Promessa / resposta da página | Objeção principal | Prova disponível | CTA | Fricção / perda provável | Prontidão para mais investimento | Mudança proposta |
|---|---|---|---|---|---|---|---|---|
| `/avaliacao-facial/` | Entender a queixa antes de escolher técnica; `M26F02S` confirmada e `G26FACE` temático, destino final Google `N/D`. | A consulta examina a face como conjunto, compara cirurgia, tratamento em etapas ou acompanhamento e entrega próximos passos. | “Sei o que me incomoda, mas não sei qual procedimento”; segunda opinião e receio de indicação excessiva. | CRM/RQE, resultados de procedimentos, avaliações, Clínica LIV, equipe/hospital e consulta de R$ 500. | “Ver horários da consulta” / conversar com a equipe. | GSC a detectou, mas não a indexou no recorte; 61 sessões e 13 eventos principais são o melhor sinal direcional, porém perda depois do clique é `N/D`. | **Média:** boa resposta e clique, mas `M26F02S` ainda não aparece no CRM e não sustenta escala. | Manter conteúdo; priorizar indexação e QA ponta a ponta de campanha → clique → oportunidade antes de nova verba. |
| `/blefaroplastia/` | Entender se a queixa vem de pele, bolsas, sobrancelha, ptose ou sulcos; `G26BLEF` temático, destino final `N/D`. | Melhorar o olhar preservando expressão e formato; técnica definida após exame do conjunto periocular. | Resultado artificial, causa errada, função ocular, cicatriz e recuperação. | CRM/RQE, antes/depois, avaliações, planejamento, equipe/hospital e consulta de R$ 500. | “Ver horários para avaliação” / conversar com a equipe. | 69 sessões, 4 eventos principais e 5,80%; há intenção de clique, mas o desfecho comercial e a causa das saídas são `N/D`. | **Média:** HTML e CTA estão prontos para observação, não para aumento baseado em clique. | Confirmar destino Google e conciliar clique→qualificado; testar uma variável somente após janela e volume válidos. |
| `/lifting-facial/` **protegida** | Flacidez e sustentação facial; `G26LIFT` temático, destino final `N/D`. | Melhorar flacidez sem apagar expressão; explica limites, planos face/pescoço, abordagem deep plane, cicatrizes e recuperação. | Medo de rosto “puxado”, cicatrizes, recuperação e dúvida se cirurgia é a indicação correta. | CRM/RQE, antes/depois, avaliações, técnica declarada, equipe/hospital e consulta de R$ 500. | “Ver horários para avaliação de lifting” / conversar com a equipe. | 141 sessões e 7 eventos principais (4,96%); a causa de não clicar ou não avançar é `N/D`. | **Somente observação:** campanha e conversão mudaram; a página não pode ser usada como variável. | **Nenhuma mudança de texto, layout, vídeo, CTA ou característica.** Preservar tracking e baseline; qualquer revisão futura exige novo escopo e aprovação específica. |
| `/lifting-cervical/` | Distinguir flacidez, gordura, platisma e proporção facial; `G26CERV` temático, destino final `N/D`. | Definir o pescoço sem aparência de rosto puxado e escolher extensão suficiente, não maior que a necessária. | “É papada ou flacidez?”, medo de excesso de tratamento e organização da recuperação. | CRM/RQE, antes/depois, avaliações, explicação anatômica, equipe/hospital e consulta de R$ 500. | “Ver horários para avaliação” / conversar com a equipe. | 57 sessões e 3 eventos principais (5,26%); página separa causas, mas perda comercial é `N/D`. | **Baixa–média:** orçamento/keywords Google mudaram em 13/08 e não há janela comparável. | Não alterar durante a janela; confirmar destino, termos e desfecho. Só propor teste de página se a perda for localizada nela. |
| `/lipo-de-papada/` | Verificar se gordura localizada é realmente a causa; relação temática com `G26CERV`, destino final `N/D`. | Mais definição quando a gordura é a causa; diferencia pele, platisma, queixo/mandíbula e limites da lipo. | “A lipo resolve sozinha?”, retração da pele, segurança e recuperação mesmo em cirurgia menor. | CRM/RQE, antes/depois, avaliações, exame de quatro componentes, equipe/hospital e consulta de R$ 500. | “Ver horários para avaliação” / conversar com a equipe. | **35 sessões e zero evento principal**; a perda observável ocorre antes do clique, mas termo, dispositivo, consentimento, oferta ou CTA como causa são `N/D`. | **Baixa** até concluir diagnóstico de tráfego e QA mobile. | Executar `WEB-03`: segmentar termo, dispositivo, origem e consentimento; depois testar uma única variável, sem promessa nova. |
| `/otoplastia/` + `/otoplastia-adulto/` + `/otoplastia-infantil/` | Roteia intenção geral, adulta e decisão familiar; `G26OTO` temático, destinos finais `N/D`; nenhuma Meta de otoplastia ativa. | Reduzir projeção preservando curvas naturais; adapta decisão, escuta, anestesia e recuperação à idade. | Orelha “colada”, assimetria, idade/vontade da criança, anestesia e retorno à rotina. | CRM/RQE, casos/resultados, avaliações/depoimento, critérios de indicação, equipe/hospital e consulta de R$ 500. | “Ver horários para avaliação” / falar com a equipe. | Adulto teve 29 sessões e 2 eventos principais (6,90%); geral/infantil são `N/D`. O vídeo infantil de 42,64 MB é risco técnico, não causa comprovada de perda. | **Média para observação Google; baixa para expansão Meta.** | Confirmar roteamento e destinos; medir o peso/UX do vídeo infantil e otimizar só após baseline. Meta futura deve ser teste prospectivo, não reativação histórica. |
| Guias `/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` e `/conteudos/quanto-custa-lifting-facial-sao-paulo/` | Comparar composição de custo; relação temática com `G26FACE`/`G26LIFT`, destinos finais `N/D`. | Explica faixas, honorários, anestesia, hospital, preparo, recuperação, cobertura/reembolso e por que a consulta define o orçamento. | Custo oculto, propostas incomparáveis, cobertura do plano e receio de consulta sem clareza financeira. | CRM/RQE, faixas explícitas, decomposição do orçamento, equipe/hospital, links de aprofundamento e consulta de R$ 500. | “Ver horários” / avaliação / conversar com a equipe. | Guia de lifting: 15 sessões, 8s e zero evento principal; amostra insuficiente. Guia facial estava detectado, não indexado; performance GA4 própria `N/D`. | **Baixa para mídia; média para descoberta após indexação.** | Corrigir/validar indexação, medir `content_depth_click` e passagem ao procedimento; não mudar a página principal protegida nem escalar pelo baixo volume. |
| `/mama/` | Orientação entre mastopexia, prótese, redução ou combinação; nenhuma campanha ativa, apenas teste futuro possível. | Começar pelo que a pessoa quer sentir/preservar e combinar anatomia, rotina, cicatrizes, gestação e recuperação antes da técnica. | Escolha da técnica, naturalidade, cicatrizes, recuperação e efeito de gestação/amamentação. | CRM/RQE, antes/depois, critérios de indicação, equipe/hospital, conteúdos relacionados e consulta de R$ 500. | “Ver horários para avaliação” / conversar com a equipe. | Entrada e sinal GA4 próprios insuficientes no recorte; perda e taxa de clique são `N/D`. | **Baixa** para investimento atual; boa base editorial sem validação de demanda/qualidade. | Não mudar por suposição. Garantir indexação e tracking; eventual Search deve ser iniciativa isolada após os gates e com desfecho qualificado. |
| `/contorno-corporal/` | Distinguir gordura, pele e parede abdominal e rotear lipo/abdômen/pós-bariátrica; nenhuma campanha ativa, apenas teste futuro possível. | Explica que a mesma “barriga” pode exigir planos diferentes, que cirurgia não emagrece e que associação de áreas tem limites. | “É lipo ou abdominoplastia?”, cicatriz, diástase, recuperação, segurança e desejo de tratar tudo de uma vez. | CRM/RQE, antes/depois, critérios anatômicos, equipe/hospital, rotas específicas e consulta de R$ 500. | “Ver horários para avaliação” / conversar com a equipe. | Tráfego de entrada e clique próprios são insuficientes; perda provável e desempenho são `N/D`. | **Baixa** para escala; pronta apenas como hub de um teste futuro controlado. | Manter conteúdo; validar indexação/medição e testar lipo ou abdominoplastia separadamente, nunca ao mesmo tempo nem por proxy de clique. |

## Acessibilidade, mobile e mídia

### Evidência estática

- 44/44 páginas têm `lang="pt-BR"`, meta viewport e link de salto para o conteúdo.
- 146/146 imagens têm texto alternativo não vazio; 120 usam carregamento tardio.
- Não foram encontrados links ou botões sem nome acessível na inspeção estática.
- CSS compartilhado inclui foco visível e tratamento de `prefers-reduced-motion`.
- Há três imagens sem `width`/`height`: uma em `/avaliacao-facial/` e uma repetida nas duas rotas de otoplastia por público.
- Um vídeo em `/otoplastia-infantil/` não tem pôster.
- Há 33 elementos de vídeo em 16 páginas; nenhum usa autoplay. Trinta e um usam `preload="metadata"`.

Esses resultados são positivos, mas não equivalem a conformidade WCAG. Não foi concluído teste assistivo com leitor de tela, contraste em todos os estados, ordem de foco completa ou auditoria em aparelhos físicos.

### Performance

**Fato.** Todas as 44 URLs do sitemap responderam 200; HTTP redireciona 301 para HTTPS e `www` redireciona 301 para o host canônico sem `www`.<br>
**Fato.** Há ativos de vídeo locais acima de 40 MB; o vídeo de otoplastia infantil tem 42,64 MB e aparece em páginas com preload de metadados.<br>
**Limitação.** Search Console não tem CWV de campo e PageSpeed Insights ficou indisponível por cota.<br>
**Parecer.** O peso potencial merece medição e otimização, mas não autoriza dizer que LCP, INP ou CLS falham hoje.

## GA4 — tráfego e sinais de conversão

### Visão geral

| Métrica | Valor observado |
|---|---:|
| Sessões | 519 no relatório detalhado; 520 em cartão atualizado instantes depois |
| Usuários ativos | 413 |
| Novos usuários | 407 |
| Visualizações de página | 836 |
| Eventos | 2.436 |
| `whatsapp_click` | 49 eventos |
| Eventos principais | 35, todos `whatsapp_click` |
| Engajamento médio por usuário ativo | 1min05s |

### Canais

| Canal | Sessões | Engajadas | Taxa de engajamento | Engajamento médio/sessão | Eventos principais |
|---|---:|---:|---:|---:|---:|
| Paid Search | 400 | 205 | 51,25% | 46s | 28 |
| Direct | 54 | 35 | 64,81% | 1min39s | 5 |
| Paid Social | 24 | 11 | 45,83% | 8s | 0 |
| Organic Search | 22 | 16 | 72,73% | 56s | 2 |
| Referral | 10 | 7 | 70,00% | 2min08s | 0 |
| Outros, inclusive AI Assistant | 9 | — | — | — | 0 |

**Derivação.** Paid Search representou 77,07% das sessões observadas. Isso torna o diagnóstico de página dependente do mix de mídia e não permite tratar taxa de landing como qualidade orgânica pura.

**Limitação de reconciliação Meta.** Paid Social foi extraído no GA4 para 16/07–12/08, enquanto a janela comparável da campanha Meta Site começa em 24/07. As 24 sessões, 8s de engajamento médio e zero evento principal são apenas um sinal diagnóstico; não constituem reconciliação exata de magnitude com a Meta nem prova de falha da campanha.

### Landing pages mais úteis para decisão

| Landing page | Sessões | Engajamento médio | Eventos principais | Taxa de sessões com evento principal |
|---|---:|---:|---:|---:|
| `/lifting-facial` | 141 | 47s | 7 | 4,96% |
| `/blefaroplastia` | 69 | 46s | 4 | 5,80% |
| `/avaliacao-facial` | 61 | 24s | 13 | 14,75% |
| `/lifting-cervical` | 57 | 1min04s | 3 | 5,26% |
| `/` | 55 | 1min56s | 3 | 3,64% |
| `/lipo-de-papada` | 35 | 37s | 0 | 0% |
| `/otoplastia-adulto` | 29 | 41s | 2 | 6,90% |
| `/conteudos/consulta-cirurgia-plastica` | 17 | 37s | 2 | 11,76% |
| `/conteudos/quanto-custa-lifting-facial-sao-paulo` | 15 | 8s | 0 | 0% |
| `(not set)` | 14 | 27s | 0 | — |

**Fato.** `/avaliacao-facial/` tem o maior sinal direcional de clique entre landings com volume razoável.<br>
**Inferência.** A amplitude da proposta pode reduzir incerteza melhor que uma página muito específica, mas mix de palavra-chave, criativo, consentimento e público também podem explicar a diferença.<br>
**Fato.** `/lipo-de-papada/` teve zero evento principal em 35 sessões consentidas/observadas.<br>
**Hipótese.** Pode haver desalinhamento de intenção, oferta, tráfego ou CTA; o dado não determina qual.<br>
**Guardrail.** Os 15 acessos e zero evento no guia de preço de lifting são insuficientes para mudar essa página, e a proteção prévia impede alteração de qualquer característica da página principal de lifting.

## Achados priorizados

| ID | Achado | Evidência | Impacto potencial | Confiança |
|---|---|---|---|---|
| SC-F01 | O funil termina no clique, não no resultado comercial | Evento único observável é `whatsapp_click`; nenhum formulário; sem conversa/agenda no GA4 | Muito alto | Alta |
| SC-F02 | GA4 é uma amostra de consentidores | Tags bloqueadas até aceite; comportamento equivalente ao Consent Mode básico | Alto para interpretação | Alta |
| SC-F03 | Evento e evento principal não reconciliam | 49 `whatsapp_click` versus 35 eventos principais | Médio-alto | Alta para a diferença; baixa para a causa |
| SC-F04 | `/lipo-de-papada/` pede diagnóstico | 35 sessões, 37s, zero evento principal | Médio | Média |
| SC-F05 | Não há base de CWV | GSC sem dados e PSI 429 | Alto risco de decisão errada | Alta |
| SC-F06 | Pequenos débitos de estabilidade/acessibilidade | Três imagens sem dimensões e um vídeo sem pôster | Baixo-médio | Alta |
| SC-F07 | Mídia pesada pode gerar custo desnecessário | 33 vídeos; ativos acima de 40 MB em páginas não protegidas | Médio | Média, até medir transferência real |

## Recomendações rastreáveis

### WEB-01 — Fechar a ponte clique → conversa → consulta

- **Problema:** o clique no WhatsApp é tratado como conversão, mas não demonstra contato válido nem consulta.
- **Evidência e escopo:** 49 cliques GA4, 35 eventos principais; nenhuma ligação do GA4 com desfechos operacionais neste subestudo. Aplica-se a todas as páginas e campanhas.
- **Mudança proposta:** criar um identificador técnico não clínico por origem/sessão, conciliá-lo de forma agregada com conversa válida, lead qualificado e consulta confirmada, e importar somente o desfecho aprovado para as plataformas. Não gravar conteúdo de mensagem nem condição médica.
- **Impacto esperado:** alto; permite otimizar para resultado real e não para abertura de aplicativo. **Confiança:** alta. **Urgência:** P0. **Esforço:** médio-alto. **Risco:** privacidade e falsa associação se a deduplicação for fraca.
- **Dependências, dono e aprovação:** CRM/planilha e operação de WhatsApp; Engenharia de dados + Operação; aprovação de privacidade e responsável comercial/médico.
- **Métrica e guardrails:** `% de cliques conciliados`, conversa válida, lead qualificado, consulta confirmada; guardrails de zero PII/PHI em analytics, taxa de duplicidade <2% e nenhuma redução do consentimento.
- **Duração e decisão:** validar por 14 dias e pelo menos 30 desfechos conciliados. Manter se cobertura ≥80% e duplicidade <2%; expandir para valor somente após reconciliação financeira; reverter importação externa se houver vazamento, duplicidade ou atribuição não auditável.

**Checkpoint pós-auditoria — 14/08/2026:** a ponte técnica página → WhatsApp → Apps Script foi validada sem criar paciente nem enviar WhatsApp. Todos os 6 CTAs públicos mantiveram o código completo, o ledger ganhou categoria/motivo de fallback e a sonda registrou `meta_attribution_contract_ok`. Isso fecha o QA técnico inicial de `WEB-01`, não a conciliação de pessoas ou consultas: o gate de 14 dias, ≥30 desfechos, cobertura ≥80% e duplicidade <2% continua obrigatório.

### WEB-02 — Reconciliar `whatsapp_click` com o status de evento principal

- **Problema:** 49 eventos, mas apenas 35 eventos principais, o que torna relatórios e metas inconsistentes.
- **Evidência e escopo:** GA4, 16/07–12/08, todos os usuários; a diferença é fato, a hipótese de ativação tardia não foi confirmada.
- **Mudança proposta:** auditar data de criação/alteração do evento principal, filtros, streams, duplicação e `send_to`; preservar um único evento GA4 e documentar quando passou a ser principal. Não alterar a página de lifting.
- **Impacto esperado:** alto para comparabilidade. **Confiança:** alta no problema. **Urgência:** P0. **Esforço:** baixo. **Risco:** baixo, desde que não se edite a definição antes de exportar o histórico.
- **Dependências, dono e aprovação:** acesso administrador GA4; Analytics/Engenharia; aprovação do proprietário da mensuração.
- **Métrica e guardrails:** proporção evento principal/evento após data de corte; guardrail de zero duplicação e preservação dos parâmetros `page_path`/`cta_location`.
- **Duração e decisão:** sete dias após auditoria. Manter se novos cliques forem classificados de modo determinístico; reverter qualquer nova regra se gerar contagem duplicada ou retrointerpretação enganosa.

### WEB-03 — Diagnosticar a jornada de lipo de papada antes de ampliar tráfego

- **Problema:** a página recebeu volume observável sem sinal de clique.
- **Evidência e escopo:** `/lipo-de-papada/`, 35 sessões, 37s, zero evento principal nos 28 dias; benchmark direcional `/avaliacao-facial/`, sem pressupor causalidade.
- **Mudança proposta:** primeiro segmentar por termo, dispositivo, origem, consentimento e posição do CTA; executar QA do link em mobile; somente depois testar uma variável por vez em `/lipo-de-papada/` — por exemplo, ordem de prova ou CTA — sem copiar automaticamente outra landing.
- **Impacto esperado:** médio-alto se houver desalinhamento corrigível. **Confiança:** média. **Urgência:** P1. **Esforço:** médio. **Risco:** concluir com amostra pequena ou mudar várias variáveis.
- **Dependências, dono e aprovação:** dados de Ads/GA4 e QA mobile; Growth + Web; aprovação médica para qualquer texto e do owner de aquisição para teste.
- **Métrica e guardrails:** taxa de sessões com clique, conversa válida e lead qualificado; guardrails de engajamento, rejeição técnica, custo por lead qualificado e zero promessa clínica.
- **Duração e decisão:** 28 dias ou 50 sessões consentidas por variante, o que ocorrer depois. Manter com melhora direcional e sem piora de qualidade; expandir só após confirmação no funil; reverter se cair qualificação, houver erro ou a incerteza permanecer alta.

### WEB-04 — Declarar corretamente a modalidade de consentimento

- **Problema:** `advancedConsentMode: true` não corresponde ao comportamento: tags Google ficam bloqueadas até aceite, isto é, modalidade básica segundo a documentação Google.
- **Evidência e escopo:** `tracking-loader.js`, `tracking-config.js` e testes; [visão geral oficial do Consent Mode](https://developers.google.com/tag-platform/security/concepts/consent-mode?hl=en), consultada em 13/08/2026.
- **Mudança proposta:** renomear/documentar o estado atual como básico e adicionar esta limitação aos dashboards. Considerar modo avançado somente após análise jurídica/privacidade explícita; não é uma recomendação automática de enviar pings sem consentimento.
- **Impacto esperado:** alto para honestidade analítica; potencial médio para modelagem se uma futura decisão aprovar modo avançado. **Confiança:** alta. **Urgência:** P1. **Esforço:** baixo para documentação, médio para mudança técnica. **Risco:** alto se implementado sem governança.
- **Dependências, dono e aprovação:** Jurídico/privacidade, Analytics e Web; aprovação formal do controlador de dados.
- **Métrica e guardrails:** taxa de consentimento e cobertura mensurável; guardrails de nenhuma tag fora da política aprovada, nenhum dado sensível e validação por Consent Debugger.
- **Duração e decisão:** correção documental imediata; eventual piloto técnico de 14 dias apenas após aprovação. Manter só se conforme e auditável; reverter no primeiro sinal de envio indevido.

### WEB-05 — Medir Web Vitals em campo e reduzir mídia pesada fora da página protegida

- **Problema:** não há CWV de campo, enquanto há mídia potencialmente cara.
- **Evidência e escopo:** GSC sem dados de campo de Core Web Vitals; PSI 429; 33 vídeos, 31 com preload de metadados; vídeo de otoplastia infantil com 42,64 MB. Exclui qualquer alteração em `/lifting-facial/`.
- **Mudança proposta:** instrumentar LCP, INP e CLS agregados por template/dispositivo, executar Lighthouse controlado e verificar bytes realmente transferidos. Nas páginas não protegidas, recomprimir vídeos grandes, usar pôster e `preload="none"` quando a mídia estiver fora da primeira tela.
- **Impacto esperado:** médio em UX e custo de dados. **Confiança:** média até medir. **Urgência:** P1. **Esforço:** médio. **Risco:** perda de qualidade visual ou quebra de reprodução.
- **Dependências, dono e aprovação:** Web/Design/Analytics; aprovação de marca para compressão.
- **Métrica e guardrails:** p75 LCP ≤2,5s, INP ≤200ms, CLS ≤0,1, bytes por primeira visita e taxa de play; guardrails de qualidade visual aceita e zero regressão de CTA.
- **Duração e decisão:** baseline de 14 dias, mudança por template e acompanhamento de 28 dias. Manter se bytes caírem e UX não piorar; expandir a outras páginas apenas com evidência; reverter mídia que degradar legibilidade ou reprodução.

### WEB-06 — Fechar débitos objetivos de acessibilidade e estabilidade

- **Problema:** três imagens não reservam dimensões e um vídeo não tem pôster.
- **Evidência e escopo:** `/avaliacao-facial/`, `/otoplastia-adulto/`, `/otoplastia-infantil/`; pôster ausente em `/otoplastia-infantil/`.
- **Mudança proposta:** declarar dimensões intrínsecas, incluir pôster equivalente e validar foco, contraste, zoom 200%, leitor de tela e teclado nos templates prioritários.
- **Impacto esperado:** baixo-médio, com menor risco de deslocamento e melhor contexto. **Confiança:** alta. **Urgência:** P2. **Esforço:** baixo. **Risco:** baixo.
- **Dependências, dono e aprovação:** Web + Design; aprovação visual simples.
- **Métrica e guardrails:** zero imagem de conteúdo sem dimensões, zero controle sem nome, CLS de laboratório e checklist WCAG; guardrail de alt text factual e sem alegação clínica nova.
- **Duração e decisão:** QA em uma sprint. Manter após aprovação em mobile/desktop; reverter somente se o asset não corresponder ao conteúdo.

### WEB-07 — Tornar o relatório de landing acionável sem criar falsa precisão

- **Problema:** relatórios misturam 14 sessões `(not set)`, variantes históricas de títulos e tráfego de canais distintos.
- **Evidência e escopo:** GA4 de 28 dias; o relatório de páginas exibiu títulos variantes, embora o HTML atual não tenha títulos duplicados.
- **Mudança proposta:** usar `page_path` como chave, publicar dimensões `cta_location`, `page_type` e `cta_text`, separar canal/campanha/dispositivo e excluir `(not set)` de comparações até explicar sua origem.
- **Impacto esperado:** médio. **Confiança:** alta. **Urgência:** P2. **Esforço:** baixo-médio. **Risco:** baixo.
- **Dependências, dono e aprovação:** Analytics; aprovação do owner do dashboard.
- **Métrica e guardrails:** cobertura de `page_path` ≥99%, `(not set)` <1%, reconciliação com total de eventos; guardrail de não expor texto livre de mensagem.
- **Duração e decisão:** 14 dias. Manter se totais reconciliarem; reverter dimensões que elevem cardinalidade sem uso decisório.

## Ordem recomendada

1. WEB-01 e WEB-02: tornar o sinal confiável antes de otimizar página.
2. WEB-03 e WEB-04: diagnosticar lipo de papada e declarar corretamente a cobertura de consentimento.
3. WEB-05 e WEB-06: medir performance e fechar débitos objetivos fora da página protegida.
4. WEB-07: consolidar leitura por página e canal.

## Limitações finais

- Não houve acesso ao conteúdo de conversas, leads individuais, agenda ou receita neste subestudo; nenhuma conclusão de qualidade comercial foi inferida a partir de clique.
- Não houve teste físico em múltiplos aparelhos, leitor de tela completo ou medição CWV de campo.
- A UI do GA4 não exibiu o fuso da propriedade durante a coleta.
- Métricas são amostra de consentidores e podem sub-representar tráfego e cliques totais.
- Nenhuma recomendação autoriza alteração da página `/lifting-facial/`; qualquer revisão futura exigirá escopo e aprovação separados.

## Fontes técnicas primárias

- [Google — Consent Mode básico versus avançado](https://developers.google.com/tag-platform/security/concepts/consent-mode?hl=en), consultado em 13/08/2026.
- [Google — configuração do Consent Mode](https://developers.google.com/tag-platform/security/guides/consent), consultado em 13/08/2026.
- [web.dev — Web Vitals e limites de LCP, INP e CLS](https://web.dev/articles/vitals?hl=en), consultado em 13/08/2026.
- [Search Console — relatório de Core Web Vitals](https://support.google.com/webmasters/answer/9205520?hl=en), consultado em 13/08/2026.
