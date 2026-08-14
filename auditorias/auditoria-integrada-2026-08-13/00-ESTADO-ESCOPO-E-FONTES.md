# Estado, escopo e fontes da auditoria integrada

**Data de referência:** 13 de agosto de 2026<br>
**Timezone analítico:** America/Sao_Paulo<br>
**Modo:** somente leitura fora deste diretório de auditoria<br>
**Estado atual:** fases 0 a 5 concluídas; auditoria encerrada sem alteração de produção

## Decisão que esta auditoria deve apoiar

Determinar o que precisa ser corrigido, testado, mantido, realocado ou escalado para aumentar contatos válidos, leads qualificados, consultas e cirurgias de forma sustentável, sem confundir sinais de plataforma com resultados clínicos ou comerciais.

## Escopo fixado

- Mídia paga: exclusivamente campanhas confirmadas como ativas ao vivo em Google Ads e Meta Ads; entidades inativas não entram em cálculos, comparações ou decisões.
- Jornada: anúncio ou descoberta → página/WhatsApp → conversa → oportunidade → qualificação → consulta → cirurgia, até onde houver dados confiáveis.
- Canais e sistemas: Google Ads, Meta Ads, GA4, Search Console, Perfil da Empresa, site, tracking, planilha LEADS, Calendar, bot Bruna, WhatsApp e operação.
- Mercado: pesquisa pública atual e limitada às principais intenções em São Paulo.
- Privacidade: resultados agregados e exemplos abstratos; nenhum dado pessoal, conteúdo de conversa ou informação clínica será salvo.
- Produção: nenhuma configuração, campanha, página, planilha, automação, mensagem ou publicação será alterada nesta auditoria.

## Regra de comparabilidade

O período de cada campanha será definido somente após a confirmação ao vivo de seu status e de sua última mudança material. Dados anteriores e posteriores a configurações incompatíveis não serão misturados. Quando a janela válida for curta ou o volume insuficiente, a conclusão será `evidência insuficiente`.

## Definições de trabalho — sujeitas à validação na fase 1

| Termo | Definição operacional inicial |
|---|---|
| Pessoa | Contato humano deduplicado pelo identificador operacional permitido, sem expô-lo no relatório. |
| Conversa | Sequência de mensagens associada a uma pessoa e a um contexto de atendimento. |
| Contato válido | Conversa assistencial real, excluídos spam, emprego, fornecedor, teste e terceiros não elegíveis. |
| Oportunidade | Unidade comercial identificada por `Opportunity ID`, vinculada a um profissional, uma origem e uma intenção. |
| Lead qualificado | Oportunidade da Dra. Amanda classificada como compatível com atendimento/procedimento e com possibilidade real de avançar. |
| Horário escolhido | Preferência de horário ainda dependente de confirmação humana. A fonte canônica específica não está materializada hoje. |
| Consulta agendada | Registro com data e hora na planilha; é um marco operacional provisório, não prova confirmação nem existência no Calendar. |
| Consulta confirmada | Confirmação humana registrada e evento correspondente conciliado no Calendar. Sem os dois elementos, o dado é provisório. |
| Consulta realizada | Comparecimento explicitamente registrado, vinculado à oportunidade e à consulta reconciliada. |
| Não comparecimento | Consulta confirmada em que o comparecimento não ocorreu. |
| Cirurgia indicada | Procedimento recomendado após avaliação médica. |
| Cirurgia aceita | Paciente aceitou o plano/orçamento, ainda que a realização possa ser futura. |
| Cirurgia realizada | Procedimento concluído e registrado. |
| Receita | Valor financeiro efetivamente atribuível e conciliado; ausente ou não confiável não será estimado como fato. |

## Fontes consultadas

| Fonte | Escopo | Período/filtro | Coleta | Confiança inicial | Limitação atual |
|---|---|---|---|---|---|
| `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` | Norte canônico e decisões vigentes | Documento integral; revisão de 13/08/2026 | 13/08/2026 | Alta para estratégia declarada | Não comprova configuração ao vivo. |
| Briefing anexado da auditoria | Escopo, regras e critérios de conclusão | Documento integral | 13/08/2026 | Alta para instruções | Não é fonte de desempenho. |
| Repositório local | Implementação, testes e documentação operacional | Branch `reestruturacao-site`, estado inicial limpo | 13/08/2026 | Alta para versão local | Deve ser reconciliado com produção e dados ao vivo. |
| Google Ads | Conta Dra. Amanda; campanhas, metas, histórico e desempenho | Status `Ativada`; conferência em 13/08/2026 | 13/08/2026, antes de 22:59 BRT | Alta para configuração atual | Mudanças materiais em 13/08 deixam a janela atual sem desempenho comparável útil. |
| Meta Ads | Conta de anúncios 1643959806249995; campanhas, conjuntos, anúncios e desempenho | Campanhas/conjuntos/anúncios ativos; dados até 12/08/2026 | 13/08/2026, antes de 22:59 BRT | Alta para status e métricas de plataforma | Resultados da plataforma ainda precisam ser reconciliados com CRM; períodos terminam em 12/08. |
| LEADS e Calendar | Funil, qualidade, atribuição e desfechos | Snapshot LEADS de 13/08; Calendar de 01/07 a 30/09 | 13/08/2026, 22:41–22:58 BRT | Alta para contagens; baixa para funil derivado e vínculo de agenda | Uso somente agregado; 26/126 fases divergem e apenas 1/10 IDs de consulta concilia. |
| GA4, Search Console e Perfil da Empresa | Tráfego, descoberta, páginas e presença local | GA4 16/07–12/08; GSC efetivo 09/07–11/08 e indexação de 06/08; GBP atual | 13/08/2026, aproximadamente 22h–22h45 BRT | Média/alta para os recortes observados | GA4 inclui somente consentidores; GSC tem baixo volume; ausência de perfil individual no gerenciador não prova ausência global. |
| Site público e código | Páginas, CTA, tracking, SEO técnico e arquitetura | Snapshot vigente em 13/08/2026; 44 URLs do sitemap | 13/08/2026, 21h–23h BRT | Alta para HTTP, marcação e código local; baixa para CWV | Local e público reconciliados para URLs; sem dados de campo e PSI indisponível por cota. |

## Campanhas ativas incluídas

### Google Ads — confirmadas ao vivo

- `S_BR_SP_BLEFAROPLASTIA` — R$ 23/dia, Maximizar cliques.
- `S_BR_SP_LIFTING_CERVICAL` — R$ 23/dia, Maximizar cliques.
- `S_BR_SP_OTOPLASTIA` — R$ 15/dia, Maximizar cliques.
- `S_BR_SP_CIRURGIA_FACIAL` — R$ 8/dia, Maximizar cliques.
- `S_BR_SP_LIFTING_FACIAL` — R$ 24/dia, Maximizar conversões.
- `S_BR_SP_MARCA` — R$ 5/dia, Maximizar cliques.

As seis usam a meta personalizada `Lead qualificado GCLID — campanhas`. A ação homônima está como principal, incluída nas metas e com status `Requer atenção`; o volume visto em 12/08 foi zero. Em 13/08 houve mudança de orçamento em lifting cervical, inclusão de palavras exatas em quatro campanhas, remoção de negativas e atualização de preferências de aplicação automática. Por isso, **nenhuma campanha Google possui ainda uma janela comparável útil na configuração atual**.

### Meta Ads — confirmadas ao vivo

- Campanha Site, ID `120250448487420627` — um conjunto ativo e dois anúncios ativos; janela comparável 24/07 a 12/08, posterior à última alteração dos criativos ativos.
- Campanha WhatsApp, ID `120250426987670627` — um conjunto ativo e dois anúncios ativos; janela comparável 28/07 a 12/08, posterior à última alteração dos criativos ativos.

Ambas estavam programadas de 16/07 a 16/08 e usam orçamento total de R$ 600 cada para o período. Isso equivale a cerca de R$ 19,35/dia por campanha se a entrega fosse uniforme, mas **não é um orçamento diário configurado**. Os nomes e demais campos do inventário fechado ficam em `INVENTARIO-CAMPANHAS-ATIVAS.csv`.

## Campanhas excluídas

Campanhas pausadas, encerradas, excluídas, arquivadas, rascunhos, experimentos concluídos e entidades não aptas foram excluídas. Em particular, nenhuma campanha Meta de otoplastia estava ativa no momento da conferência; ela não entra em desempenho, benchmark, escolha de criativo ou orçamento desta auditoria.

## Registro das fases

### Fase 0 — Escopo e estado atual

- **Status:** concluída em 13/08/2026.
- **Fontes utilizadas:** briefing, norte canônico, histórico e guias locais, repositório, Google Ads e Meta Ads autenticados.
- **Campanhas incluídas:** as seis Google e duas Meta confirmadas ativas e enumeradas acima.
- **Definições:** `ativa` exige status ao vivo elegível; janela comparável começa após a última mudança material; volume insuficiente é `evidência insuficiente`.
- **Concluído:** escopo, privacidade, regra de comparabilidade e definições iniciais fixados; oito campanhas ativas confirmadas ao vivo; últimas mudanças materiais identificadas; janelas comparáveis Meta definidas; Google classificado como sem janela comparável útil após mudanças de 13/08.
- **Achados confirmados:** seis campanhas Google e duas Meta ativas; orçamento diário ativo observado de R$ 98 no Google e orçamento total programado de R$ 1.200 na Meta entre 16/07 e 16/08; a conversão qualificada do Google requer atenção; nenhuma campanha Meta de otoplastia estava ativa; o repositório estava limpo no início; nenhum sistema de produção foi alterado.
- **Campanhas excluídas:** toda entidade paga que não estava ativa; nenhuma delas entra nos cálculos.
- **Arquivos produzidos:** `00-ESTADO-ESCOPO-E-FONTES.md` e `INVENTARIO-CAMPANHAS-ATIVAS.csv`.
- **Limitações:** IDs numéricos das campanhas Google não foram expostos pela interface inspecionada; códigos estáveis `G26*` serão usados. O dia 13/08 não serve para avaliar a configuração Google atual.
- **Próxima fase:** verificar confiabilidade, granularidade e reconciliação do funil antes de usar qualquer resultado para orçamento.

### Fase 1 — Confiabilidade dos dados e funil

- **Status:** concluída em 13/08/2026.
- **Fontes utilizadas:** planilha LEADS ao vivo, Calendar ao vivo, código local, documentos operacionais e janelas comparáveis das duas campanhas Meta ativas.
- **Campanhas incluídas:** `M26F01W` de 28/07 a 12/08 e `M26F02S` de 24/07 a 12/08; Google não recebeu cálculo de desempenho porque sua configuração atual não possui janela comparável.
- **Campanhas excluídas:** toda campanha inativa; resultados Google anteriores às mudanças não entraram em reconciliação causal.
- **Definições:** oportunidade é a unidade deduplicada; qualificação datada exige timestamp; consulta confirmada exige registro humano e evento conciliado; campo inexistente é `N/D`.
- **Achados confirmados:** 139 oportunidades e IDs únicos no CRM; 126 da Dra. Amanda; 26/126 fases divergentes; 129 linhas visíveis para 126 oportunidades; painel econômico exibe 499 ao contar fórmulas vazias; `M26F01W` tem 41 contatos atribuídos, seis em estágio qualificado ou posterior, três datas de qualificação, uma consulta provisória e zero realizada; `M26F02S` tem zero registro com código exato; somente 1/10 IDs de consulta foi conciliado com Calendar.
- **Parecer:** atendimento individual é utilizável com conferência; funil executivo, coortes, agenda, cirurgia, receita e atribuição causal são não confiáveis ou não mensuráveis.
- **Limitações:** não existe campo canônico de consulta solicitada; 33/43 consultas não têm oportunidade; novos marcos comerciais não têm persistência tipada nem backfill.
- **Arquivo produzido:** `02-QUALIDADE-LEADS-E-FUNIL.md`.
- **Próxima fase:** interpretar mídia ativa sem usar métricas downstream frágeis.

### Fase 2 — Google Ads e Meta Ads ativos

- **Status:** concluída em 13/08/2026.
- **Fontes utilizadas:** Google Ads e Meta Ads Manager autenticados, histórico de alterações e ações de conversão; somente entidades ativas.
- **Campanhas incluídas:** as seis Google e as duas Meta listadas no inventário. Todas as demais entidades foram excluídas; nenhuma campanha inativa entrou em cálculo, benchmark ou escolha de criativo.
- **Campanhas excluídas:** toda campanha, grupo, conjunto, anúncio, criativo ou rascunho que não estava ativo; histórico inativo serviu apenas para detectar possível contaminação técnica.
- **Definições:** clique, LPV e conversa são resultados de plataforma; nenhum deles equivale sozinho a contato válido, qualificado ou consulta.
- **Achados confirmados:** Google em R$ 98/dia, sem dia completo pós-mudanças de 13/08; `Lead qualificado GCLID` principal e `Requer atenção`; Meta Site com 1.290 LPVs a R$ 0,31 e Meta WhatsApp com 48 conversas a R$ 6,79 nas respectivas janelas comparáveis; `C01H01` lidera tráfego Site, mas não existe recorte WhatsApp limpo por anúncio para escolher um vídeo; o Pixel `site da amanda` recebia `PageView` pelo navegador e mostrava diagnóstico ativo de bloqueio de alguns dados do domínio por possível contexto de saúde.
- **Limitações:** IDs numéricos e destinos finais Google não ficaram expostos; o vínculo nominal do Pixel com as campanhas, payloads, `event_id`, deduplicação e cobertura CAPI não foram confirmados; CAPI não foi evidenciada na lista lida; conversa Meta não equivale a pessoa ou qualificado.
- **Arquivos produzidos:** `03-GOOGLE-ADS-CAMPANHAS-ATIVAS.md`, `04-META-ADS-CAMPANHAS-ATIVAS.md` e `INVENTARIO-CAMPANHAS-ATIVAS.csv`.
- **Próxima fase:** verificar se páginas e descoberta explicam ou agravam a perda pós-clique.

### Fase 3 — Site, SEO, local e descoberta por IA

- **Status:** concluída em 13/08/2026.
- **Fontes utilizadas:** site público, repositório, GA4, Search Console, Perfil da Empresa, pesquisa pública atual e documentação oficial Google/OpenAI.
- **Campanhas incluídas:** somente as oito campanhas ativas ao relacionar canal e landing page; os recortes GA4 foram tratados como diagnóstico, não como reconciliação exata de mídia.
- **Campanhas excluídas:** campanhas inativas e agregados que misturassem estados incompatíveis não foram usados para julgar página, criativo ou orçamento.
- **Definições:** sessão e evento GA4 representam somente consentidores; `whatsapp_click` não prova conversa; URL indexada segue a data do relatório GSC; descoberta por IA não equivale a citação garantida.
- **Achados confirmados:** 44/44 URLs do sitemap em 200, canonical coerente e 213/213 CTAs de WhatsApp marcados; GA4 de 16/07 a 12/08 registra 519 sessões, 49 `whatsapp_click` e 35 eventos principais; GSC registra 11 cliques, 409 impressões, 39 URLs indexadas e oito não indexadas; domínio antigo `.com` ainda compete pela marca; perfil LIV verificado exibe horário diferente do site e nenhum perfil individual da médica apareceu no gerenciador observado; `OAI-SearchBot` está permitido.
- **Limitações:** GA4 mede somente consentidores; Paid Social 16/07–12/08 não é reconciliação exata da Meta Site 24/07–12/08; sem dados de campo de Core Web Vitals; PSI indisponível por cota; ausência de perfil individual no gerenciador não prova ausência global.
- **Arquivos produzidos:** `05-SITE-E-CONVERSAO.md` e `06-SEO-LOCAL-E-DESCOBERTA-IA.md`.
- **Próxima fase:** avaliar continuidade, handoff e operação depois do contato.

### Fase 4 — Bot, WhatsApp e operação

- **Status:** concluída em 13/08/2026.
- **Fontes utilizadas:** endpoint público sanitizado, planilha LEADS, Calendar, código e 486 testes locais aprovados.
- **Campanhas incluídas:** `M26F01W` e `M26F02S` apenas quando a origem ativa era necessária para reconciliar operação; nenhuma métrica de campanha inativa foi usada.
- **Campanhas excluídas:** toda origem paga inativa e todo registro sem vínculo comprovável foram excluídos de atribuição causal.
- **Definições:** pessoa é contato deduplicado; mensagem é evento individual; resposta humana exige autoria; tempo aproximado do ledger é proxy, não SLA; consulta exige reconciliação conforme a fase 1.
- **Achados confirmados:** contrato técnico defensivo e endpoint saudável; 813 mensagens e 83 pessoas no ledger; painel mostra zero conversas humanas embora a fonte vigente tenha atividade de 43 pessoas nos últimos sete dias; SLA oficial não mensurável; duas pendências vencidas, oito jobs órfãos, um job antigo aguardando mensagens e uma anomalia de 170 tentativas; em amostra estratificada de 15 conversas, rota foi correta em 12/12 casos avaliáveis, mas etapa/status em apenas 7/14, contexto/próxima ação em 9/15 e decisão de resposta/silêncio/handoff em 12/15; marcos de orçamento/aceite/conclusão/pagamento ainda não são contáveis.
- **Limitações:** testes provam o contrato local, não execução contínua; a amostra semântica é pequena, intencional e não estima acurácia populacional; Google e Meta estavam presentes, mas a cobertura independente de orgânico, Amanda, Daniel, outros profissionais e qualificado/não qualificado não foi preservada e ficou `N/D`; nenhuma mensagem literal, identificador ou detalhe clínico foi persistido; proxy de resposta não é SLA; falta/não comparecimento e aceite tipado ficaram `N/D`; Calendar continua sem reconciliação suficiente.
- **Arquivo produzido:** `07-BOT-WHATSAPP-E-OPERACAO.md`.
- **Próxima fase:** integrar bloqueadores, cenários, recomendações e regras de decisão.

**Atualização pós-auditoria em 14/08/2026:** o commit `e941390` e o Apps Script versão 83 corrigiram a fonte humana do painel e materializaram o SLA operacional. O painel reconciliou 43 pessoas com ação humana; o primeiro recorte mensurável teve 4/19 respostas vinculadas (21,1%), mediana 11,1 min úteis e p95 276,8 min úteis. `BOT-03` está concluído; `BOT-04` está instrumentado, mas reprovado até cobertura ≥95% e estabilidade por 14 dias. O proxy histórico permanece apenas como baseline e não deve ser misturado com a nova definição.

**Atualização de qualidade em 14/08/2026:** o commit `47ec00a` e o Apps Script versão 85 criaram `_FUNIL_CANONICO` com 131 oportunidades ativas e zero item em revisão, corrigiram `Saúde das Integrações` para a fonte `IMPORT_GOOGLE_ADS` e separaram falha técnica de exclusão de negócio no painel. A leitura independente encontrou zero erro de fórmula, 9 falhas técnicas tipadas e 32 slots passados ainda disponíveis. `DAT-09` e a fórmula/taxonomia de `BOT-06` estão concluídos; `DAT-06` permanece parcial, `OPS-03` permanece aberto e os 9 incidentes técnicos não devem ser ocultados.

### Fase 5 — Estratégia e crescimento

- **Status:** concluída em 13/08/2026.
- **Fontes utilizadas:** todos os artefatos das fases 0–4, norte canônico, inventário fechado, métricas ao vivo e queries de reconciliação agregadas.
- **Campanhas incluídas:** somente as seis campanhas Google e duas Meta confirmadas ativas e listadas no inventário; nenhuma campanha inativa entrou em cálculo, benchmark, escolha de criativo ou orçamento.
- **Campanhas excluídas:** todas as pausadas, encerradas, arquivadas, rascunhos e entidades inativas; histórico antigo foi citado apenas para bloquear contaminação técnica, nunca como evidência de desempenho.
- **Definições finais:** contato de plataforma não equivale a pessoa; qualificação exige oportunidade e marco; consulta confirmada exige registro humano e Calendar conciliado; ausência de campo ou cobertura insuficiente é `N/D`, não zero; receita exige conciliação financeira.
- **Achados confirmados:** recomendação de cenário 1 sem aumento líquido, com envelope de planejamento de até R$ 4.140 — run-rate Google de 30 dias mais o flight Meta atual, não gasto histórico harmonizado; WhatsApp direto como controle Meta; Site condicionado ao QA de `M26F02S`; Google condicionado à saúde da conversão e a uma janela pós-13/08; cenários 2–4 vinculados a gates de mensuração e capacidade.
- **Limitações:** não há custo confiável da configuração Google atual, consulta Calendar-validada por campanha, cirurgia, receita ou ROAS; não há vencedor criativo por resultado comercial; não é possível atribuir eventual problema de otoplastia ao vídeo atual.
- **Arquivos produzidos:** `01-RESUMO-EXECUTIVO.md`, `08-CENARIOS-E-PLANO-PRIORIZADO.md` e `MATRIZ-RECOMENDACOES.csv`.
- **Validação final:** 11/11 entregáveis presentes; inventário com oito campanhas ativas e nenhuma inativa; matriz com 58 recomendações e IDs únicos; CSVs parseáveis; cálculos reexecutados; nenhuma ocorrência de e-mail ou telefone de paciente; `git diff --check` sem erro; 486/486 testes locais aprovados; página `/lifting-facial/` e todos os sistemas externos permaneceram inalterados.
- **Próxima fase:** nenhuma. A auditoria para aqui; implementar qualquer recomendação exige aprovação expressa e um trabalho separado.
