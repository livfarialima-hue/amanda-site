# Histórico estratégico de aquisição e conversão

**Status:** registro histórico subordinado

**Fonte canônica das decisões vigentes:** `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`

Este arquivo preserva o motivo, a evidência, a hipótese, a métrica, a revisão e a regra de manutenção ou reversão de mudanças estratégicas e operacionais. Ele não cria um norte concorrente. Se uma entrada antiga divergir da decisão vigente, prevalece o documento canônico.

## 15 de agosto de 2026 — ampliação da rotina de revisão do Google Ads

- **Responsável:** Codex, sob autorização explícita de Daniel para implementar, publicar e programar a ampliação.
- **Área/conta:** Google Ads `995-334-4486`, Apps Script/LEADS e arquivo agregado anônimo.
- **Mudança:** a rotina passa a validar saúde das fontes, metas de conversão, inventário completo de negativas, Quality Score, RSAs/recursos, segmentações, destinos, mudanças e funil. Alertas de gasto usam o mesmo dia da semana; falha de consulta vira `N/D`; repetição idêntica entra em cooldown de 48 horas. Foi criado o arquivo `LIV — Agregados Google Ads — sem PII`, atualizado pela LEADS aproximadamente às 08:15 e lido pelo script do Ads entre 09:00 e 10:00.
- **Motivo e evidência:** a rotina inicial protegia termos leigos, mas ainda podia confundir consulta indisponível com zero e não conseguia calcular custo por etapa sem acessar dados de pacientes. Compartilhar a LEADS com a conta de Ads ampliaria exposição desnecessária; o agregado separado preserva somente contagens e campanha canônica.
- **Hipótese:** uma rotina orientada ao funil e com gates de fonte reduzirá falsos alarmes, evitará decisões por proxy e preparará alterações menores, isoladas e reversíveis.
- **Métrica principal:** cobertura de campanha canônica, contato válido classificado, lead qualificado, consulta agendada/realizada e marco de fechamento; secundárias: gasto, termos, Quality Score, política e parcela de impressões.
- **Guardrails:** nenhuma mutação automática; nenhuma PII ou ID técnico no agregado/e-mail; alias legado permanece N/D; faixa etária `UNKNOWN` é preservada; orçamento total de R$ 87/dia continua referência; fonte com erro ou mais de 36 horas não produz zero.
- **Revisão:** primeiro relatório semanal ampliado em 17/08/2026; gate de 20/08/2026; primeira janela operacional em 27/08/2026; três primeiros relatórios serão conferidos para falsos positivos.
- **Regra para manter/reverter:** manter se as fontes aparecerem corretamente como `OK`/`N/D`, sem PII e com sugestões acionáveis; pausar a programação ou voltar à versão anterior se houver exposição, falso zero, excesso de e-mail ou consulta instável.
- **Resultado de publicação:** Apps Script versão `92` publicado no deployment canônico; agregado schema v1 gerado às 21:23 BRT; trigger diário criado; Google Ads Script `12117745` salvo, programado diariamente entre 09:00 e 10:00 e executado com sucesso às 21:35, sem alterações. O primeiro agregado mostrou 16 contatos Google em 30 dias e todos permaneceram em campanha desconhecida por referências legadas/ambíguas; não houve inferência retroativa. Como era sábado e não havia alerta crítico, nenhum e-mail foi enviado nessa execução; o primeiro relatório semanal ampliado fica para 17/08.

## 15 de agosto de 2026 — rotina automatizada de revisão e sugestões do Google Ads

- **Status:** ativo na conta, somente leitura, com programação diária verificada.
- **Responsável:** Codex, sob solicitação de Daniel.
- **Área/conta:** Google Ads `995-334-4486 — Dra Amanda Schroeder`.
- **Mudança:** criação de uma rotina somente leitura com execução diária entre 09:00 e 10:00. Ela envia apenas alertas críticos nos dias comuns, um relatório completo toda segunda-feira e uma leitura ampliada de 90 dias no primeiro dia útil do mês. O relatório cobre campanhas, termos, positivas, negativas diretas, ações de conversão, políticas, mudanças recentes, parcela de impressões e sugestões priorizadas. Nenhuma recomendação é aplicada automaticamente.
- **Motivo e evidência:** termos e palavras precisam de observação recorrente, mas o orçamento de R$ 87/dia e o baixo volume de conversões qualificadas tornam decisões diárias ruidosas. A documentação oficial do Google recomenda relatório semanal na segunda-feira com a semana anterior e reconhece atraso de até aproximadamente três horas nas estatísticas; por isso o horário escolhido é depois das 09:00 e a rotina diária serve apenas à saúde.
- **Hipótese:** uma revisão semanal consistente reduzirá desperdício e atraso de diagnóstico sem excluir linguagem legítima nem contaminar experimentos com ajustes reativos.
- **Métrica principal:** sugestões revisadas por semana; negativas aprovadas/rejeitadas; termos novos convertidos em positivas; custo evitado por irrelevância confirmada; contatos válidos, qualificados e consultas após as mudanças humanas.
- **Guardrails:** zero mutação automática; negativas inicialmente exatas e no menor nível; preservar linguagem leiga e preço legítimo; não pausar por zero de conversão com mensuração insuficiente; não decidir por CTR/CPC isolados; não misturar mudanças materiais; listas compartilhadas e funil permanecem sujeitos a reconciliação humana.
- **Data de revisão:** conferir os três primeiros relatórios completos; primeira revisão estrutural em 1º de setembro de 2026.
- **Regra para manter:** manter se o relatório chegar no prazo, não gerar falso positivo recorrente e ajudar decisões rastreáveis sem alterar a conta.
- **Regra para reverter:** pausar a programação diante de e-mail indevido, consulta de conta errada, sugestão sistematicamente perigosa, falha de privacidade ou qualquer mutação; corrigir localmente antes de reativar.
- **Resultado atual:** código versionado e publicado na conta como script `12117745 — LIV — Revisão Google Ads — somente leitura`; autorização concluída; visualização de 15/08/2026 às 20:45 BRT finalizada em 10 segundos, sem mudanças na conta; registro confirmou envio do relatório para `daniel.added@gmail.com`; programação diária `09:00–10:00` visível e ativa. A primeira revisão semanal automática ocorrerá em 17/08/2026.

## 15 de agosto de 2026 — manutenção de Meta facial em 40+ e programação da decisão etária no Google

- **Status:** decisão Meta vigente; nenhuma campanha alterada neste registro; avaliação Google programada.
- **Responsável:** Daniel, com registro e programação pelo Codex.
- **Área/campanhas:** Meta facial `M26F01W` e `M26F02S`; Google `S_BR_SP_LIFTING_FACIAL`, `S_BR_SP_BLEFAROPLASTIA`, `S_BR_SP_LIFTING_CERVICAL` e `S_BR_SP_CIRURGIA_FACIAL`.
- **Mudança:** manter a referência operacional de 40+ nas campanhas faciais do Meta. Não alterar idade no Google agora; incluir no gate de 20/08 a decisão sobre excluir apenas `18–24` e `25–34` nas quatro campanhas faciais não otoplastia, sempre preservando `Desconhecida`. Otoplastia, marca e futura rinoplastia ficam fora desse escopo.
- **Motivo e evidência:** segundo a operação, pacientes das cirurgias faciais, exceto otoplastia e rinoplastia, têm pelo menos 35 anos. Na conta Google, entre 16/07 e 14/08, 18–34 acumulou 65 cliques, R$ 92,77 e cerca de 4,7% do gasto das quatro frentes; as duas conversões exibidas misturam proxy de WhatsApp e qualificação, e consulta/procedimento por idade continuam N/D. No Meta, a configuração facial visível usa referência 40+, mas o efeito real do Advantage+ abaixo desse piso ainda deve ser conferido.
- **Hipótese:** manter Meta em 40+ preserva a estratégia já adotada; no Google, excluir somente as duas faixas conhecidas abaixo de 35 pode reduzir gasto improvável sem bloquear 35–39 nem idade desconhecida.
- **Métrica principal:** contatos válidos, leads qualificados, consultas agendadas/realizadas e gasto por faixa etária; distribuição efetiva de idade no Meta.
- **Guardrails:** nenhuma exclusão de `Desconhecida`; nenhuma mudança em otoplastia, marca ou rinoplastia; nenhuma mudança etária junto com orçamento, lance, palavras, anúncios ou página; confirmar comportamento efetivo do Advantage+; N/D não vira zero.
- **Data de revisão:** decisão Google em 20/08/2026; se aplicada, checagem em 27/08/2026 e leitura após 14 dias completos.
- **Regra para manter:** manter Meta 40+ enquanto houver coerência operacional e ausência de perda comprovada; manter eventual exclusão Google se reduzir gasto abaixo de 35 sem perda material de contatos válidos/consultas em 35+.
- **Regra para reverter:** restaurar as faixas Google se houver queda material de volume/qualidade, classificação inconsistente ou rastreamento insuficiente; revisar o piso Meta se a entrega real não respeitar a intenção ou surgir evidência de demanda qualificada abaixo de 40.
- **Resultado atual:** cronograma e lembretes atualizados; nenhuma configuração de mídia alterada.

## 15 de agosto de 2026 — aceitação do risco residual do JID

- **Status:** risco formalmente aceito; feature e schema permanecem desligados.
- **Responsável:** Daniel, com registro técnico pelo Codex.
- **Área:** atribuição Meta/Google por passagem no site e transporte site → WhatsApp.
- **Mudança:** deixa de ser obrigatório criar um transportador oculto antes de propor a ativação da jornada rica. A operação aceita que a linha técnica `JID: J1_<token opaco>` seja visível e editável na mensagem pré-preenchida e que possa ser encaminhada antes do primeiro resgate.
- **Motivo e evidência:** o claim C1 impede que outro evento assuma o token depois do primeiro resgate, o webhook remove o JID antes do bot, Apps Script, Sheets, CRM, logs e modelos, e o token não contém PII nem código de campanha. O risco residual não eliminado é temporal: edição/remoção causa perda de resolução e encaminhamento pré-claim pode associar a jornada ao primeiro destinatário que a enviar.
- **Hipótese:** aceitar esse risco controlado permite testar a atribuição rica sem acrescentar outra arquitetura de transporte, preservando atendimento legado e rollback imediato.
- **Métrica principal:** percentual de JID resolvido, fallback por JID ausente/alterado/expirado, divergência LEADS–CRM, duplicidade e qualquer atribuição incorreta comprovada.
- **Guardrails:** `attributionJourneyEnabled=false` e schema off até autorização própria; zero PII ou JID persistido; first touch imutável; nenhum aumento Meta; teste em janela isolada; atendimento nunca depende da resolução.
- **Data de revisão:** 24 horas, 7 dias e 14 dias após eventual ativação.
- **Regra para manter:** manter somente se não houver atribuição incorreta, persistência indevida, duplicidade, overwrite ou regressão do atendimento e se fallback permanecer explicitamente mensurável.
- **Regra para reverter:** desligar imediatamente a feature e usar o caminho legado diante de encaminhamento atribuído à pessoa errada, JID fora do resolvedor, first touch alterado, duplicidade ou perda operacional. A aceitação do risco não impede esse rollback.
- **Resultado atual:** gate de aceitação do risco concluído; ativação, schema, migração, privacidade, purge observado e sonda E2E continuam pendentes e exigem autorizações próprias.

## 15 de agosto de 2026 — retirada das faixas cirúrgicas públicas e preservação da intenção de preço

- **Status:** site, bot, backend e Apps Script publicados em 15/08/2026; Google Ads permaneceu sem alteração ao vivo até o fechamento técnico.
- **Responsável:** Codex, sob solicitação de Daniel para reduzir o risco da divulgação pública de faixas e preservar uma resposta útil para quem pesquisa preço.
- **Área/campanha:** páginas públicas de lifting e custos, atendimento privado no WhatsApp e campanha `S_BR_SP_LIFTING_FACIAL`.
- **Mudança:** as faixas numéricas de minilifting e lifting foram retiradas da página específica de custos, do FAQ e schema da página principal de lifting, do guia geral de custos faciais e dos cards públicos relacionados. O guia específico permanece ativo para explicar equipe médica, hospital, anestesia, materiais, exames, eventual pernoite, acompanhamento, extensão e necessidades clínicas. No WhatsApp, a primeira pergunta sobre preço recebe composição e orçamento individual; somente diante de pedido explícito reiterado pode ser enviada uma faixa aprovada, no mesmo texto que informa ser estimativa geral, não orçamento, proposta ou garantia, que o valor final pode ficar fora da faixa e que depende da avaliação, com link para o guia. A faixa não é repetida automaticamente na mesma conversa e outros procedimentos seguem para revisão humana.
- **Decisão de mídia:** manter `AG_LIFTING_FACIAL` e `AG_LIFTING_FACIAL_PRECO` separados. O grupo geral atende técnica, indicação e recuperação; o grupo de preço atende `preço`, `valor` e `quanto custa` com página própria, mesmo sem números públicos. Permanecem as negativas exatas `[lifting facial preço]` e `[mini lifting facial preço]` no grupo geral. Ficam planejadas, mas não aplicadas sem autorização específica, `[preço mini lifting facial]`, `[quanto custa lifting facial]` e `[valor lifting facial]`, também somente no grupo geral. Não negativar raízes genéricas de preço em campanha ou lista compartilhada.
- **Motivo e evidência:** a orientação comentada do CFM para procedimentos individualizados reforça a necessidade de avaliação anterior à definição do orçamento (`https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-4`); a retirada é uma escolha conservadora de redução de risco e não uma conclusão jurídica definitiva. No Google Ads, o grupo de preço tinha somente cerca de cinco dias de histórico, 39 cliques, 315 impressões, CTR de 12,38%, gasto de R$ 50,67 e nenhum evento de conversão visível. O grupo geral tinha 450 cliques, R$ 627,27 e 17 conversões misturadas — 16 proxies de clique no WhatsApp e apenas um lead qualificado GCLID. Consultas e procedimentos por grupo eram N/D.
- **Hipótese:** explicar publicamente os componentes preserva a utilidade para buscas de preço com menor exposição regulatória; responder a faixa apenas de forma privada, condicionada e contextualizada reduz abandono sem tratá-la como orçamento individual.
- **Métrica principal:** contatos válidos, leads qualificados, consultas agendadas e realizadas por grupo e página; taxa de avanço do grupo de preço; incidentes de resposta automática inadequada; zero faixa cirúrgica numérica nas páginas públicas.
- **Guardrails:** não afirmar que a solução garante conformidade; não publicar faixa cirúrgica; não divulgar faixa na primeira pergunta; não tratar estimativa como orçamento, proposta ou garantia; explicitar que o valor final pode ficar fora da faixa; não repetir automaticamente; manter outros procedimentos em revisão humana; não alterar Google Ads sem autorização específica.
- **Data de revisão:** leitura preliminar após 28 dias completos da publicação; decisão de manter, pausar ou testar consolidação somente com rastreamento até o funil validado e, preferencialmente, pelo menos 100 cliques no grupo de preço. Revisão Codame/jurídica quando disponível.
- **Regra para manter:** manter as duas intenções separadas se o grupo de preço gerar contatos válidos, qualificados ou consultas com custo aceitável e o atendimento permanecer seguro; manter a política privada se não houver faixa pública nem respostas fora dos guardrails.
- **Regra para reverter:** interromper a resposta automática com faixa diante de mensagem ambígua, erro de contexto, repetição, reclamação ou orientação jurídica contrária; testar consolidação somente depois da amostra e da mensuração mínimas, removendo antes as cinco negativas exatas de roteamento. Não restaurar números públicos sem nova decisão formal e autorização específica.
- **Resultado:** publicado no commit candidato `50d7ea1`, deploy Netlify `6a80bef31b7d69000853db97` e Apps Script versão 91, preservando o deployment canônico. A página pública ficou sem faixas cirúrgicas; o bot mantém a resposta privada condicionada; a jornada rica e o schema novo permaneceram desligados. Nenhuma mudança foi executada no Google Ads até este registro.

## 15 de agosto de 2026 — execução autorizada da auditoria de Google Ads de 14/08

- **Status:** correções imediatas publicadas; importação offline em contenção; experimentos editoriais programados de forma sequencial.
- **Responsável:** Codex, sob autorização de Daniel para executar todas as etapas da primeira auditoria de Google Ads.
- **Área/campanhas:** conta Google Ads 995-334-4486, Apps Script de LEADS, Data Manager, planilha e documentação canônica.
- **Mudança:** a conexão diária `LEADS` foi pausada; IDs de transação passaram a usar HMAC-SHA256 opaco `LIV-QL-v1`; cinco eventos legados foram quarentenados e 102 IDs visíveis legados foram removidos da coluna reservada; a versão 90 do Apps Script foi publicada. As seis campanhas receberam `_camp` canônico; lifting cervical voltou de R$ 23 para R$ 12/dia, restaurando R$ 87/dia no total; o sitelink de lipo perdeu a barra duplicada; e `[lifting facial preço]` e `[mini lifting facial preço]` foram adicionadas como negativas exatas somente em `AG_LIFTING_FACIAL`.
- **Motivo e evidência:** 3/5 IDs preparados e 102 IDs históricos visíveis usavam formatos derivados de WhatsApp; `Lead qualificado GCLID` estava Principal e nas metas, mas em `Requer atenção`, sem recibo por evento. O aumento cervical de 13/08 não estava ratificado no norte. Termos de preço estavam entrando no grupo genérico apesar da existência do grupo próprio.
- **Hipótese:** impedir reenvio inseguro, restaurar o orçamento canônico, estabilizar os códigos e separar intenção genérica de intenção de preço produzirá mensuração mais confiável e testes posteriores interpretáveis.
- **Métrica principal:** zero ID inseguro, 100% dos novos eventos com estado verificável, cobertura de campanha/grupo por conversa, CPQL e avanço a consulta; títulos serão avaliados por contato válido e lead qualificado, não por clique isolado.
- **Guardrails:** conexão permanece pausada até o teste controlado; nenhum legado é reenviado; nenhuma PII/PHI no identificador; não combinar orçamento, palavra-chave e RSA no mesmo teste; manter Pesquisa Google, sem PMax, ampla, tCPA ou aumento; preservar buscas leigas e de preço legítimas.
- **Janelas:** 20/08 para prova controlada e, se aprovada, início do RSA de otoplastia; 27/08 para saúde de sete dias; 03/09 para decisão de 14 dias e início do próximo experimento. Os demais RSAs seguem em série, nunca em paralelo.
- **Regra para manter:** manter HMAC, códigos, orçamento, negativas e URL quando testes técnicos passarem, não houver PII/duplicidade e a qualidade não piorar além dos guardrails da auditoria.
- **Regra para reverter:** parar a projeção ou o experimento afetado diante de PII, duplicidade, perda de click ID/código, reprovação editorial, CTR abaixo do guardrail sem ganho de qualidade ou CPC acima do limite; nunca restaurar IDs inseguros.
- **Resultado parcial observado:** 573/573 testes locais aprovados; web app versão 90 respondeu HTTP 200; fonte de importação sem linhas; cinco ledgers seguros em `quarantined_legacy`; programação da conexão `LEADS` em `Não programado`. Aceite, rejeição e atribuição histórica permanecem N/D até recibo.
- **Complemento técnico do mesmo dia:** os nove grupos ativos foram conferidos. Quatro não tinham `{_ag}` e receberam códigos canônicos: `AG_LIPO_PAPADA`, `Adulto` de otoplastia, `AG_LIFTING_FACIAL_PRECO` e `AG_OTOPLASTIA_INFANTIL`; a cobertura ficou 9/9. A ação atual `Lead qualificado GCLID` apareceu como ativa e totalmente otimizada, enquanto o alerta de 50% foi isolado na ação antiga `Lead qualificado`, com último upload em 25/07. A origem de importação permaneceu vazia e os cinco legados em quarentena. O baseline das nove páginas confirmou HTTP 200 sem redirect em uma coleta; Core Web Vitals permaneceram N/D. Foram observadas 22 associações limitadas pela política de saúde e sete associações de logotipo reprovadas; a correção de logotipo e qualquer recompressão foram separadas dos testes de RSA.

Esta entrada substitui, para Google Ads, qualquer fotografia antiga de orçamento, códigos ou papel da conversão. A frase histórica de 14/08 que protegia absolutamente `/lifting-facial/` também foi substituída pela decisão canônica posterior: a página pode ser analisada e só muda com justificativa, isolamento e autorização específica.

## 15 de agosto de 2026 — imagem social institucional e retirada da proibição absoluta de lifting

- **Status:** autorizada para publicação por Daniel.
- **Responsável:** Codex, sob autorização explícita de Daniel.
- **Área:** metadados sociais do site, incluindo `/lifting-facial/`.
- **Mudança:** padronização de `og:image` em 43 páginas e de `twitter:image` em 32 delas com a foto da Dra. Amanda palestrando em congresso. A regra canônica de lifting passa a exigir justificativa, autorização específica, isolamento e mensuração, em vez de proibir absolutamente qualquer mudança.
- **Motivo e evidência:** as alterações locais já existentes foram auditadas e continham exclusivamente a troca da imagem de compartilhamento; não havia mudança de texto, layout, vídeo, CTA, conteúdo visível ou funcionamento. Daniel revisou esse escopo e autorizou a publicação.
- **Hipótese:** uma imagem de congresso pode reforçar autoridade profissional nas prévias compartilhadas sem modificar a experiência da página.
- **Métrica principal:** aparência correta da prévia em WhatsApp, Facebook e demais plataformas; tráfego social para as páginas permanece como indicador diagnóstico.
- **Guardrail:** preservar textos, layout, vídeo, CTA e conteúdo visível; não interpretar a troca como teste causal de conversão; revisar recortes automáticos porque a imagem de origem é vertical.
- **Data de revisão:** na primeira inspeção de prévia após a publicação e novamente em 29 de agosto de 2026.
- **Regra para manter:** manter se as plataformas exibirem a Dra. Amanda e o contexto profissional de forma legível, sem recorte inadequado.
- **Regra para reverter:** restaurar a imagem horizontal anterior ou publicar uma derivação horizontal aprovada se a prévia cortar a médica, o contexto do congresso ou produzir composição inadequada.

## 14 de agosto de 2026 — aprovação do cenário corretivo e dos gates de crescimento

- **Status:** planejada e em implementação local; nenhuma mudança externa, publicação, renovação ou aumento de orçamento foi autorizada por esta entrada.
- **Responsável:** Codex, sob autorização de Daniel para iniciar o plano em Sol extra-alto.
- **Área/campanha:** funil integrado, Google Ads, Meta Ads, site, CRM, Calendar e bot.
- **Mudança:** adoção do cenário 1 da auditoria: corrigir e reconciliar antes de aumentar investimento. WhatsApp direto `M26F01W` passa a ser o controle Meta; Site `M26F02S` fica sem verba nova até o QA ponta a ponta e, depois do gate, poderá receber teste isolado de até R$ 300 mediante nova autorização. Google não recebe escala, tCPA, Performance Max ou correspondência ampla enquanto a conversão qualificada não estiver saudável. A página `/lifting-facial/` permanece integralmente protegida.
- **Motivo e evidência:** a auditoria encontrou 26 divergências de fase em 126 oportunidades da Amanda, 129 linhas visíveis para 126 oportunidades, apenas 1 de 10 IDs de consulta conciliado ao Calendar, conversão Google em `Requer atenção`, 1.290 visualizações da página Meta Site sem registro sob o código exato `M26F02S` e painéis com denominadores inflados por fórmulas vazias.
- **Hipótese:** corrigir chave, fase, consulta, agenda, conversão e atribuição antes de escalar reduzirá falsos sinais, desperdício e decisões baseadas em cliques ou conversas não qualificadas.
- **Métrica principal:** divergência CRM–aba, duplicidade por `Opportunity ID`, cobertura consulta–Calendar, saúde/aceitação da conversão Google e cobertura clique–conversa–oportunidade de `M26F02S`.
- **Guardrail:** nenhum PII/PHI em mídia; nenhuma alteração externa sem autorização específica; nenhum texto, layout, vídeo, CTA ou característica de `/lifting-facial/`; uma mudança material por vez.
- **Data de revisão:** 20 de agosto de 2026 para os gates técnicos e 27 de agosto de 2026 para a primeira janela operacional.
- **Resultado:** pendente.
- **Regra para manter, ampliar ou reverter:** manter o cenário 1 até cumprir integralmente os gates canônicos; ampliar somente após comprovação e capacidade; interromper a mudança afetada diante de duplicidade, PII/PHI, divergência acima do limite, falha de agenda ou rota ambígua do bot.

## 13 de agosto de 2026 — preparação do norte para a auditoria integrada

- **Status:** revisão documental concluída; nenhuma configuração de mídia, site, mensuração ou atendimento foi alterada.
- **Responsáveis:** Daniel e Dra. Amanda Schroeder, com organização documental pelo Codex.
- **Mudança:** o norte passou a cobrir aquisição digital integrada, diferenciou princípio estratégico, decisão vigente, hipótese em teste e estado conhecido, registrou face como núcleo prioritário e mama, lipoaspiração e abdominoplastia como expansão secundária. O orçamento de aproximadamente R$ 2.800 por mês passou a ser referência atual, e não teto; aumentos podem ser propostos mediante cenários e critérios econômicos. O histórico detalhado foi separado deste documento canônico.
- **Motivo e evidência:** Daniel definiu explicitamente a prioridade de face, pediu alguma ação para procedimentos frequentes de mama e corpo e autorizou a auditoria a propor aumento de gasto. O documento anterior misturava orientação duradoura, fotografia datada e histórico técnico, o que dificultava distinguir restrições vigentes de hipóteses a reavaliar.
- **Hipótese:** um norte mais curto e tipado reduzirá ancoragem em configurações antigas, permitirá auditoria mais ampla e tornará decisões futuras mais fáceis de revisar sem perder rastreabilidade.
- **Métrica principal:** completude e rastreabilidade da auditoria; ausência de recomendações que confundam clique com resultado de negócio; proporção de recomendações com evidência, métrica, prazo e regra de reversão.
- **Guardrails:** face permanece prioritária; expansão secundária não recebe campanha ou verba por presunção; nenhuma conclusão de mídia, página ou orçamento foi antecipada; o histórico integral permanece preservado neste arquivo.
- **Data de revisão:** na aprovação dos resultados da auditoria integrada e antes de qualquer primeiro lote de implementação.
- **Regra para manter:** manter a estrutura se a auditoria conseguir distinguir fatos, decisões e hipóteses e produzir um plano reconciliado entre canais e funil.
- **Regra para reverter:** recolocar no documento canônico apenas a informação histórica que se provar necessária para interpretar uma decisão vigente; não restaurar registros técnicos sem função estratégica.

### 13 de agosto de 2026 — contexto bilateral e validação final da resposta da Bruna

- **Status:** publicado em produção em 13 de agosto de 2026; 480 testes aprovados, commit `8a162bf` e Netlify deploy `6a7e0e1b1802ef0008868ae9` com 11 funções implantadas.
- **Responsável:** Codex, sob solicitação de Daniel.
- **Mudança:** a memória operacional, o contexto enviado ao Terra e a retomada protegida passam de 8 para 16 interações recentes, preservando a origem de cada fala. O bloqueio imediatamente anterior ao envio compara mensagem atual, última fala da clínica e resposta planejada. Resposta ou confirmação a uma pergunta humana não pode receber intervenção da Bruna; resposta curta a uma pergunta da Bruna não pode gerar reinício genérico da conversa.
- **Motivo e evidência:** uma paciente com consulta marcada respondeu `Bom dia! Pode sim` ao pedido humano de confirmação de presença, mas o bot enviou uma mensagem dizendo que confirmaria a informação com a equipe. O histórico recente existia, porém a validação final verificava principalmente repetição, links e encerramentos; não conferia de forma explícita se a resposta planejada atravessava a última fala humana.
- **Hipótese:** contexto bilateral mais amplo e conferência final da resposta reduzirão entradas indevidas, reinícios e respostas desconectadas sem exigir uma segunda chamada de IA.
- **Métrica principal:** zero resposta automática após confirmação dirigida à equipe humana; zero reinício genérico após resposta curta contextual; taxa de bloqueios corretos e falsos bloqueios; tempo até resposta humana quando o bot permanece em silêncio.
- **Guardrails:** o CRM, a agenda, tarefa humana pendente e atendimento humano prevalecem sobre a interpretação do modelo; uma nova pergunta autônoma da paciente continua podendo ser tratada pela rota apropriada; nenhum texto ou característica da página de lifting foi alterado.
- **Data de revisão:** 20 de agosto de 2026 ou antes se houver nova entrada indevida ou falso bloqueio relevante.
- **Regra para manter:** manter se não houver entrada da Bruna em resposta destinada à equipe e se perguntas novas continuarem recebendo resposta ou encaminhamento adequado.
- **Regra para reverter:** retornar temporariamente o limite para 8 interações ou desativar apenas o novo bloqueio se houver regressão de latência, perda de contexto recente ou bloqueio recorrente de perguntas autônomas; preservar o bloqueio determinístico de confirmação de consulta.

### 11 de agosto de 2026 — integração por oportunidade na única planilha LEADS

- **Status:** implementação concluída localmente, com publicação e migração idempotente programadas no mesmo release.
- **Mudança:** o arquivo Google Sheets `LEADS` permanece único. Dentro dele, a aba `Google Ads - Conversões` passa a representar exclusivamente oportunidades da Dra. Amanda e `Leads Dr. Daniel` exclusivamente oportunidades do Dr. Daniel. Uma aba técnica oculta `_CRM_OPORTUNIDADES` vincula conversa, linha visível, classificação, consulta e evento por `Opportunity ID`. Contatos de Henrique, Marina ou outros profissionais não entram nas abas de leads. Agenda depende de confirmação humana final. O runtime da Bruna usa Terra médio; a classificação usa Terra baixo; aprendizado automático exige regra de baixo risco aprovada e snapshot promovido.
- **Motivo e evidência:** a auditoria encontrou que o webhook identificava o profissional, mas o Apps Script descartava esse campo e gravava todos os contatos na aba da Amanda; o classificador também ignorava o profissional e consultas podiam ser reconciliadas apenas pelo telefone. Isso permitia contaminar o tráfego pago e o Google Ads. Também havia risco de resposta duplicada quando a reserva idempotente falhava e de confirmação de agenda sem decisão humana final.
- **Hipótese:** identidade estável por oportunidade e profissional reduzirá divergências, impedirá sinais falsos no Google Ads e diminuirá trabalho manual sem perder segurança na agenda e nas retomadas.
- **Métrica principal:** zero evento de Daniel ou terceiro no Google Ads; zero confirmação de agenda sem ação humana; zero resposta duplicada; cobertura entre conversas Amanda, oportunidades, fases, consultas e eventos de conversão; tempo até primeira resposta e taxa de qualificado para consulta.
- **Guardrails:** um único workbook; somente Amanda elegível ao Ads; atribuição fixada na criação; nenhum dado clínico ou identificador pessoal na importação; retomadas de clientes antigos sempre humanas; duas retomadas no máximo para leads novos; falha no armazenamento bloqueia envio automático em produção; conhecimento de risco médio/alto nunca é promovido para resposta automática.
- **Data de revisão:** 18 de agosto de 2026 para integridade operacional e 25 de agosto de 2026 para qualidade do funil Google Ads.
- **Regra para manter:** manter se a auditoria não encontrar contaminação entre profissionais, duplicidade, confirmação indevida ou regressão de cobertura, e se a equipe conseguir operar pendências pela visão única.
- **Regra para reverter:** colocar `WHATSAPP_AUTOMATION_MODE=shadow`, preservar todos os ledgers e retornar temporariamente a confirmação e retomadas ao fluxo humano se surgir qualquer mensagem indevida, duplicidade, erro de roteamento ou associação incorreta ao Ads.

### 11 de agosto de 2026 — classificador resiliente e conversão offline deduplicada

- **Status:** publicado e em observação; Apps Script versão 65 e Netlify deploy `6a7badc29eaf8394dd2ae658`.
- **Mudança:** a fila usa lease token, oito tentativas máximas, dead letter, prioridade para itens com menos tentativas e reprocessamento a cada cinco minutos. O cron apenas despacha uma função de background autenticada; cada invocação aluga uma conversa, hidrata mensagens e contexto em uma etapa idempotente e persiste a conclusão de forma protegida. Pacientes conhecidas com linha de lead voltam a ser classificadas. A aba `Consultas` escreve somente fases canônicas, sem rebaixar conversões. Toda decisão gera evento de fase e a primeira qualificação com click ID gera um único evento de Google Ads para GCLID, GBRAID ou WBRAID.
- **Motivo e evidência:** a fila tinha itens `running` sem worker, tentativas que chegaram a centenas e starvation dos itens novos. A causa foi confirmada em produção: o claim monolítico levava de 20 a 31 segundos, excedia o cliente e era repetido; a conclusão individual levava cerca de seis segundos e podia ultrapassar o teto da função agendada. A migração zerou somente leases e tentativas inválidas, preservou mensagens e histórico e criou os ledgers. No teste final, dois despachos de background elevaram `done` de 25 para 27 e terminaram com zero `running` e zero lease token ativo. A fila restante ficou com 41 `pending`, 8 `orphaned` e 1 `waiting_messages`, para drenagem gradual. Pacientes conhecidas antes eram excluídas da fila, impedindo casos como Laís de avançar. A importação anterior aceitava somente GCLID.
- **Hipótese:** eliminar starvation e estados órfãos fará as fases convergirem para as conversas e para `Consultas`; deduplicar por oportunidade e marco elevará a cobertura de sinais verdadeiros sem inflar resultados.
- **Métrica principal:** idade p95 da fila, itens em dead letter, taxa de conclusões, divergências entre conversa/Consulta/fase, eventos elegíveis versus aceitos pelo Google e duplicidade por ID de transação.
- **Guardrails:** nenhuma informação pessoal ou clínica no arquivo de importação; exatamente um click ID por evento; nenhuma conversão otimizada para leads; clique no WhatsApp continua secundário; não marcar consentimento `GRANTED` por inferência.
- **Data de revisão:** 18 de agosto de 2026 para operação da fila e 25 de agosto de 2026 para correspondência no Google Ads.
- **Regra para manter:** durante a drenagem inicial, nenhuma lease expirada sem recuperação, zero duplicidade e crescimento contínuo de `done`; depois da drenagem, p95 inferior a uma hora e correspondência entre planilha e Google. Subir o lote de 1 para 2 somente após uma semana sem timeout ou lease presa.
- **Regra para reverter:** suspender a nova visão de importação se houver rejeição de mapeamento, duplicidade, exposição de dado pessoal ou divergência de ação; preservar o ledger para auditoria e retornar temporariamente à visão GCLID anterior.

### 11 de agosto de 2026 — auditoria das mudanças recomendadas pela equipe do Google

- **Status:** correções executadas; teste em observação.
- **Responsável pela execução:** Codex, na sessão autenticada do Google Ads, sob autorização de Daniel.
- **Mudança observada:** quatro campanhas migraram para Maximizar conversões, lifting facial recebeu CPA desejado de R$ 43 e quatro tipos de recomendação automática de lances foram habilitados. Otoplastia e marca permaneceram em Maximizar cliques. Performance Max foi recusada.
- **Correção executada:** lifting facial permaneceu em Maximizar conversões sem CPA desejado; blefaroplastia, lifting cervical e cirurgia facial voltaram a Maximizar cliques; otoplastia e marca foram mantidas em Maximizar cliques; as quatro aplicações automáticas de lances foram desativadas. A conferência final preservou todos os orçamentos e mostrou CPA desejado vazio nas seis campanhas ativas.
- **Escopo preservado:** nenhuma palavra-chave ou grupo de anúncios foi alterado; `plástica das pálpebras` e o grupo de preço de lifting permaneceram ativos e inalterados.
- **Motivo informado:** recomendação da equipe do Google para aumentar conversões e aproveitar a automação da plataforma.
- **Evidência reconciliada:** de 12 de julho a 10 de agosto, houve 1.495 cliques, R$ 2.313,40 de gasto, 40 cliques rastreados no WhatsApp, 18 conversas reais do Google, 5 qualificadas e 0 agendamentos. O CPL qualificado observado foi aproximadamente R$ 462,68, enquanto o CPA de R$ 43 se aproxima do custo histórico por clique no WhatsApp do lifting. A conta tinha apenas 1 conversão qualificada aceita no Google Ads.
- **Hipótese:** concentrar a automação somente no lifting, sem um CPA artificialmente baixo, preservará a capacidade de testar a IA sem dispersar dados escassos; as demais campanhas ficam comparáveis em Maximizar cliques.
- **Métrica principal:** custo por lead qualificado aceito, taxa de clique para conversa real, taxa de conversa para qualificado e taxa de qualificado para agendamento.
- **Guardrails:** clique no WhatsApp permanece secundário; não aumentar orçamento; não ativar Performance Max; não permitir aplicação automática de estratégia ou meta de lance.
- **Data de revisão:** 25 de agosto de 2026, com checagem antecipada se houver queda relevante de tráfego, gasto anormal ou 10 novas conversões qualificadas aceitas.
- **Regra para manter:** manter o teste apenas se tráfego, qualidade e custo por qualificado forem estáveis ou melhores.
- **Regra para reverter:** retornar o lifting a Maximizar cliques se o volume cair sem ganho de qualidade, se o CPA qualificado piorar ou se a importação divergir da planilha.

### 11 de agosto de 2026 — avaliação de inserção dinâmica e Performance Max

- **Status:** não adotar de forma ampla neste momento.
- **Mudança proposta pelo Google:** usar `{Keyword:}` em um título de todas as campanhas e ativar Performance Max.
- **Motivo e evidência:** os anúncios atuais já apresentam qualidade Excelente na maior parte da conta; somente um anúncio de lifting cervical aparecia como Médio. A recomendação de Performance Max exibida na conta também fazia referência a Merchant Center e produtos, sinais pouco aderentes a uma clínica particular. A conversão qualificada ainda tem volume insuficiente.
- **Hipótese:** títulos específicos por procedimento preservam gramática, posicionamento e intenção melhor do que inserção dinâmica universal; Pesquisa continuará oferecendo maior controle até o funil qualificado estabilizar.
- **Métrica principal:** CTR, conversa real por clique, qualificado por clique, custo por qualificado e agendamentos.
- **Data de revisão:** depois de 20 a 30 conversões qualificadas aceitas em 30 dias ou quando existirem agendamentos suficientes para avaliar qualidade por campanha.
- **Regra para manter:** testar `{KeyWord:texto padrão}` apenas em grupos estreitos e manter se melhorar qualificados, não apenas CTR.
- **Regra para reverter:** remover se produzir textos estranhos, tráfego genérico ou queda de qualidade; Performance Max continua bloqueada até cumprir os pré-requisitos documentados.

### 9 de agosto de 2026 — mensuração do funil de custos e guias de mama e corpo

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** criação de eventos para a passagem dos guias de preço às páginas principais, preservação da atribuição até WhatsApp, qualificação e agendamento, e publicação de guias próprios de custos para cirurgias de mama e corpo.
- **Motivo e evidência:** era necessário distinguir quem apenas leu valores de quem aprofundou o procedimento, iniciou conversa, foi qualificado ou agendou; dúvidas de custos também eram recorrentes fora da cirurgia facial.
- **Hipótese:** responder a composição e o planejamento financeiro por região, sem inventar faixas não aprovadas, reduzirá incerteza e produzirá contatos mais bem informados.
- **Métrica principal:** avanço de visita para página principal, WhatsApp, lead qualificado e consulta agendada por página de origem.
- **Guardrails:** não usar faixas cirúrgicas de mama ou corpo sem aprovação; não tratar clique como conversão clínica; não importar agendamento ao Google Ads antes de validar deduplicação e correspondência.
- **Revisão:** após volume suficiente ou em até 30 dias; os guias só passam a receber tráfego pago próprio mediante hipótese, campanha e orçamento documentados.

### 9 de agosto de 2026 — resposta à procura por deep plane

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** inclusão de uma resposta breve nas páginas de lifting e preço confirmando que a Dra. Amanda realiza lifting facial com abordagem deep plane quando existe indicação.
- **Motivo e evidência:** pacientes perguntam com frequência pela técnica e precisam confirmar essa possibilidade sem atravessar uma explicação excessivamente técnica.
- **Hipótese:** responder diretamente aumentará a aderência de visitantes com essa dúvida e reduzirá abandono antes do contato.
- **Métrica principal:** contatos qualificados e consultas originados nas páginas de lifting, com observação dos termos de pesquisa relacionados a `deep plane`.
- **Guardrails:** não apresentar deep plane como técnica superior ou adequada para todas as pessoas; manter a escolha condicionada à anatomia, às regiões tratadas e aos objetivos discutidos na consulta.
- **Revisão:** na primeira revisão das páginas e dos termos de pesquisa, após volume suficiente ou em até 30 dias.

### 9 de agosto de 2026 — composição dos valores e formas de pagamento

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** detalhamento dos três grupos que formam o investimento — honorários profissionais, anestesia e estrutura hospitalar, preparo e recuperação — e informação objetiva de pagamento à vista por Pix ou débito ou parcelamento antecipado, concluído até a cirurgia.
- **Motivo e evidência:** dúvidas sobre preço também envolvem o que está incluído e se o investimento pode ser organizado ao longo do período pré-operatório.
- **Hipótese:** tornar composição e pagamento visíveis reduzirá incerteza financeira e aumentará contatos qualificados sem transformar a comunicação em promoção.
- **Métrica principal:** contatos qualificados e consultas agendadas originados na página de preço.
- **Guardrails:** condições finais dependem do orçamento vigente; não prometer número de parcelas ou juros sem confirmação; discriminar responsáveis e despesas eventualmente não incluídas.
- **Revisão:** junto da primeira revisão do teste de preço, após volume suficiente ou em até 30 dias.

### 9 de agosto de 2026 — refinamento da comunicação da página de preço

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** remoção de linguagem interna ou defensiva e apresentação explícita das opções de hospital, desde Sírio-Libanês, Nove de Julho e Oswaldo Cruz até alternativas de custo mais acessível.
- **Motivo e evidência:** quem chega pelo anúncio precisa compreender rapidamente faixa, possibilidades e próximo passo; frases sobre o que a clínica “não divulga” desviavam a atenção da dúvida da paciente.
- **Hipótese:** comunicação mais positiva e concreta aumentará confiança, continuidade e contatos qualificados.
- **Métrica principal:** contatos qualificados e consultas agendadas originados na página.
- **Guardrails:** preservar transparência, adequação clínica e diferenciação entre faixa inicial e orçamento individual.
- **Revisão:** junto da primeira revisão do teste de preço, após volume suficiente ou em até 30 dias.

### 9 de agosto de 2026 — arquitetura de preço para lifting facial

- **Status:** incluída no release autorizado para publicação em 9 de agosto de 2026; a ativação do novo destino no Google Ads continua sendo uma etapa separada.
- **Mudança:** manutenção do guia geral de custos faciais como hub e criação de uma página própria para pesquisas de preço de lifting facial.
- **Motivo e evidência:** a campanha de lifting passará a testar intenção de preço; a página genérica respondia custos em profundidade, mas não mostrava a faixa de lifting nem criava uma ponte visível para a página principal do procedimento.
- **Hipótese:** responder a ordem de grandeza imediatamente e oferecer aprofundamento específico aumentará a continuidade da sessão, os contatos qualificados e os agendamentos sem posicionar a clínica como baixo preço.
- **Métrica principal:** taxa de leads qualificados e consultas agendadas entre visitantes da página de preço de lifting.
- **Guardrails:** não reduzir a qualidade dos leads, não divulgar honorário isolado e não apresentar faixa como orçamento.
- **Revisão:** depois de volume suficiente de cliques ou, no máximo, após 30 dias do início do teste.
- **Regra:** manter ou ampliar se produzir qualificados e agendamentos com custo compatível; revisar anúncio, termos e página se gerar apenas comparação sem avanço; reverter o destino se a qualidade cair de forma consistente.

### 9 de agosto de 2026 — criação da fonte canônica

- **Status:** mantida.
- **Mudança:** consolidação do posicionamento, funil, Google Ads, site, WhatsApp, preço, mensuração e regras de decisão neste documento.
- **Motivo:** o norte estava distribuído em vários arquivos, dificultando consulta, atualização e coerência.
- **Regra futura:** qualquer decisão estratégica deve atualizar primeiro este documento.

### 4 de agosto de 2026 — orçamento de otoplastia

- **Status:** em observação.
- **Campanha:** `S_BR_SP_OTOPLASTIA`.
- **Mudança:** orçamento médio diário de R$ 8 para R$ 15.
- **Motivo:** campanha indicada como limitada pelo orçamento.
- **Estratégia preservada:** Maximizar cliques.
- **Regra:** não combinar imediatamente com mudança para Maximizar conversões; revisar termos, qualidade, GCLID e custos.

### 11 de agosto de 2026 — publicação da integração Bruna, LEADS e Google Ads

- **Status:** publicada em produção.
- **Mudança:** adoção de uma única planilha `LEADS`, com Amanda em `Google Ads - Conversões`, Daniel em `Leads Dr. Daniel` e um cadastro técnico oculto de oportunidades no mesmo arquivo. A Bruna passou a registrar oportunidade, profissional, responsável atual, próxima ação e objeção; terceiros e contatos não comerciais não entram nas abas de leads. Agendamentos de Amanda e Daniel só são confirmados após ação humana.
- **Motivo e evidência:** a auditoria encontrou risco de misturar Daniel e outros profissionais com a aquisição da Amanda e risco de reprocessamento da classificação. Após a migração, 135 linhas com telefone da Amanda e uma do Daniel têm Opportunity ID; os 132 IDs únicos visíveis estão no cadastro canônico; Daniel não tem click ID; os 37 eventos históricos de fase e o evento de Ads ficaram vinculados a oportunidades existentes e identificados como Amanda.
- **Publicação:** Apps Script versão 67 e Netlify deploy `6a7bce34a97a27d96320aebf`; 464 testes automatizados aprovados; endpoints de saúde ativos com assinatura, Sheets, OpenAI, alertas e proteção de preferências configurados.
- **Hipótese:** separar aquisição por profissional e persistir o estado da oportunidade reduzirá retrabalho, duplicidade e contaminação do aprendizado do Google, permitindo que a Bruna use Terra médio com regras determinísticas e escalonamento humano.
- **Métrica principal:** consulta agendada e realizada da Amanda por Opportunity ID; custo por lead qualificado; duplicidades; mensagens indevidas; falsos envios ao Ads; tempo até resposta humana nas exceções.
- **Data de revisão:** auditoria diária por sete dias e revisão consolidada em 18 de agosto de 2026.
- **Regra para manter:** zero Daniel/terceiro no fluxo de Ads, zero mensagem duplicada, confirmação humana de agenda e correspondência integral entre evento de Ads e oportunidade da Amanda.
- **Regra para reverter:** colocar `WHATSAPP_AUTOMATION_MODE=shadow` imediatamente se houver mensagem indevida, duplicidade, profissional incorreto, agendamento sem confirmação humana ou associação incorreta ao Google Ads.

### 12 de agosto de 2026 — auditoria corretiva da Bruna, fila e primeira aba do Google Ads

- **Status:** planilha e Apps Script publicados na versão 68; código da Bruna validado em 466 testes e incluído no release de produção de 12 de agosto.
- **Mudança:** `IMPORT_GOOGLE_ADS` passa a ser a primeira aba e a única fonte canônica de importação offline, reunindo também o histórico deduplicado de `IMPORT_GCLID`. A classificação passa a carregar Opportunity ID, profissional, versão e aba em todas as confirmações; o claim grava somente a linha alugada e os tempos de resposta foram ajustados. Henrique, Marina, Laerte, outros profissionais, emprego, marketing e fornecedores passam a ser classificados como `external` ou `nonpatient`, arquivados em `_CONTATOS_NAO_LEADS` e impedidos de gerar sinal ao Ads.
- **Motivo e evidência:** a auditoria ao vivo encontrou `IMPORT_GOOGLE_ADS` na posição 31, enquanto o Google lê a primeira aba; nove leases em execução estavam vencidas e os logs mostraram `stale_lease`, `lead_not_found`, `hydrate_invalid_response` e timeouts. O código descartava o Opportunity ID ao concluir a classificação e regravava toda a fila para alugar um item. A migração confirmou `IMPORT_GOOGLE_ADS` no índice zero com quatro transações históricas únicas e arquivou, com trilha de auditoria, dez linhas indevidas correspondentes a nove contatos de profissionais externos, fornecedores, marketing, emprego ou conversas privadas.
- **Hipótese:** a identidade completa e a gravação mínima eliminarão starvation e divergências; a quarentena preservará auditoria sem contaminar o funil da Amanda; a primeira aba canônica tornará a importação previsível.
- **Métrica principal:** zero lease vencida, zero `stale_lease`/`lead_not_found` causado pelo contrato de persistência, idade p95 da fila inferior a uma hora após drenagem, zero terceiro/não-paciente nas abas Amanda/Daniel e correspondência integral entre primeira aba e eventos elegíveis.
- **Guardrails:** nenhuma informação pessoal ou clínica na primeira aba; deduplicação por ID da transação; apenas Amanda elegível ao Ads; contatos arquivados permanecem auditáveis e qualquer evento ainda não importado é invalidado; não apagar uma oportunidade legítima da Amanda apenas porque a mesma pessoa mencionou outro profissional.
- **Data de revisão:** 13 de agosto de 2026 para a fila e 18 de agosto de 2026 para integridade do funil.
- **Regra para manter:** manter se a fila drenar sem leases vencidas e a auditoria confirmar a primeira aba, deduplicação e isolamento profissional.
- **Regra para reverter:** pausar o classificador e retornar a importação à aba anterior caso apareça duplicidade, perda de histórico ou exclusão indevida; preservar todos os ledgers e o arquivo de quarentena para restauração.

### 12 de agosto de 2026 — otimização das Functions sem alterar a jornada

- **Status:** publicada e em aferição em produção; commits `1685c54`, `cbe72bb` e `63fea18`.
- **Mudança:** retirada do Async Workload antigo que já não participava do endpoint público e redução da varredura de recuperação de um para cinco minutos. O webhook direto, as travas contra duplicidade, a fila de recuperação, a integração com a planilha, a classificação e a retomada humana foram preservados.
- **Motivo e evidência:** o projeto consumiu 93.934 de 125.000 invocações e 75 de 100 horas até 12 de agosto. Nas 24 horas auditadas, os dois runners auxiliares do Async Workload somaram 3.364 invocações, embora o endpoint público já operasse em `direct_with_background_completion`; `ycloud-recovery` acrescentava até 1.440 verificações por dia ao rodar a cada minuto.
- **Hipótese:** remover o mecanismo órfão e reduzir apenas polling ocioso diminuirá mais de 70% das invocações sem alterar tempo de resposta das conversas normais ou a qualidade do registro de leads.
- **Métrica principal:** invocações e GB-hora diários das Functions, com conferência adicional de mensagens recebidas, respostas únicas, registros na LEADS, fila de classificação e exceções recuperadas.
- **Guardrails:** webhook e planilha permanecem imediatos; zero mensagem duplicada ou perdida; recuperação de exceção em até aproximadamente sete minutos na primeira tentativa; classificação e retomada humana mantidas em cinco minutos.
- **Data de revisão:** 13 e 14 de agosto de 2026, após duas janelas completas de 24 horas.
- **Regra para manter:** manter se as Functions caírem para menos de 1.500 invocações e 1,5 GB-hora por dia, sem aumento de erros operacionais.
- **Regra para reverter:** restaurar temporariamente a frequência anterior da recuperação se houver falha real não retomada dentro da janela prevista; não restaurar o Async Workload órfão sem prova de necessidade no caminho público.

### 12 de agosto de 2026 — recuperação durável de mensagens consecutivas

- **Status:** publicada em produção; 468 testes aprovados, Apps Script versão 70 e código da recuperação no Netlify deploy `6a7cd0fa1d5f6c0008d2d24d`.
- **Mudança:** toda mensagem de entrada passa a entrar na fila durável antes das consultas de contexto. Uma mensagem consecutiva sem nova referência de campanha herda a única oportunidade ativa do telefone e repara em lugar o evento `route_pending`. A recuperação só conclui quando o roteamento e o trabalho automático também concluírem; uma duplicata ou um HTTP 200 não bastam. Se Amanda e Daniel tiverem oportunidades ativas simultâneas, o sistema bloqueia a herança e encaminha para revisão.
- **Motivo e evidência:** uma lead de lifting do Meta enviou duas mensagens em 16 segundos. A primeira foi vinculada à oportunidade da Amanda, mas seu envio foi corretamente cancelado pelo debounce em favor da segunda. A segunda perdeu o contexto de campanha, ficou `route_pending` e a recuperação antiga interpretou a resposta técnica como suficiente. Resultado: linha de lead existente, pergunta sem resposta e nenhuma conclusão automática.
- **Hipótese:** registrar a recuperação antes de operações lentas e exigir conclusão ponta a ponta eliminará silêncios em rajadas de mensagens sem aumentar respostas duplicadas nem contaminar os profissionais.
- **Métrica principal:** zero mensagem de lead paga sem resposta ou alerta; zero `route_pending` aberto por mais de sete minutos; zero duplicação; tempo entre entrada e resposta final; correspondência entre evento, mensagem, oportunidade e profissional.
- **Guardrails:** somente a oportunidade ativa única pode ser herdada; ambiguidade Amanda/Daniel falha fechada; debounce de oito segundos e verificação da mensagem mais recente permanecem; nenhuma mensagem retrospectiva é enviada a uma paciente durante a reparação sem confirmação humana.
- **Data de revisão:** 13 de agosto de 2026, com auditoria antecipada na primeira nova rajada de mensagens.
- **Regra para manter:** manter com zero silêncio, duplicidade ou cruzamento profissional nas novas conversas.
- **Regra para reverter:** colocar a automação em `shadow` e preservar a fila para auditoria se ocorrer envio duplicado, rota incorreta ou encerramento de recuperação antes da conclusão real.
### 15 de agosto de 2026 — preparação local da atribuição Meta/Google via site

- **Status:** implementada localmente com flags e schema desativados; não publicada, não migrada e não validada em produção.
- **Mudança:** preparação de um contrato first-party que separa first touch, conversa atual, origem informada pelo paciente e último toque não direto; usa `J0` no navegador, `J1` de transporte por até dez minutos, `J2` durável por 30 dias e claimant `C1` HMAC. O webhook remove `JID` antes do bot e da planilha; o modo rico remove GCLID, GBRAID e WBRAID do texto visível e os mantém no envelope protegido. Ausência de referrer deixa de ser tratada como acesso direto. Schema e migrações permanecem fail-closed e default-off. Um registro versionado separa código bruto de projeção resolvida e marca `M26O01W` como caminho conflitante/N/D quando não houver evidência adicional. Foram acrescentados gates locais de Calendar, SLA/rota e versão única dos assets de tracking nas 44 páginas.
- **Motivo e evidência:** a auditoria não comprovou `M26F02S` ponta a ponta e encontrou mistura potencial de dimensões iniciais e posteriores, inferência indevida de acesso direto, IDs em texto/log, ambiguidade histórica de `M26O01W` e risco de mutação durante dry-run. A suíte local `651/651`, o gate `44/44` e o build isolado passaram a cobrir claim HMAC, remoção do token, envelope J2 imutável, retries divergentes/stale/corrida, first touch imutável, origem informada separada, campanhas inicial e atual separadas, conflito de código legado, dry-run sem escrita, duplicatas de cabeçalho, expiração absoluta, purge, migração atômica de Calendar, SLA e entrega completa webhook → payload de Sheets. Esses resultados são locais e não comprovam produção.
- **Hipótese:** a trilha versionada reduzirá origem desconhecida e permitirá distinguir Meta direto de Meta → site → WhatsApp sem sobrescrever a origem inicial nem expor identificadores nos logs.
- **Métrica principal:** cobertura Meta Site consentida entre clique, conversa e oportunidade; campanha/conjunto/anúncio/criativo identificados; divergência LEADS–CRM; duplicidade; origem desconhecida; registros preparados, enviados, aceitos e atribuídos no Google.
- **Guardrails naquele fechamento:** `M26F02S` continua sem verba nova; `attributionJourneyEnabled=false`; não ativar antes de revisar a política de privacidade e decidir sobre o `JID` visível; não criar first touch por inferência; nenhuma migração sem dry-run, confirmação e rollback; local, commit e publicado devem apontar para a mesma versão aprovada. A decisão posterior sobre o risco do `JID` está registrada na entrada mais recente deste histórico.
- **Data de revisão:** primeira sonda controlada após publicação autorizada; checagens em 24 horas, 7 dias e 14 dias.
- **Regra para manter:** cobertura consentida Meta Site de pelo menos 80%, duplicidade inferior a 2%, 100% da sonda controlada reconciliada e nenhuma exposição de PII/PHI.
- **Regra para reverter:** desativar imediatamente a flag e manter o parser legado se houver perda de mensagens, referência incorreta, duplicidade, origem inicial sobrescrita, retenção indevida ou divergência entre evento, LEADS e CRM.
