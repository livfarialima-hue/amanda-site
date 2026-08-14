# Qualidade dos leads e confiabilidade do funil

**Data de referência:** 13 de agosto de 2026<br>
**Coleta principal:** 13/08/2026, 22:41–22:58 BRT (`America/Sao_Paulo`)<br>
**Modo:** auditoria somente leitura; nenhum dado ou sistema externo foi alterado<br>
**Privacidade:** resultados agregados e exemplos abstratos; nenhum nome de paciente, telefone, e-mail, conversa, diagnóstico, foto ou documento pessoal foi persistido<br>
**Parecer:** a planilha é útil para atendimento individual e para reconstruções auditáveis por oportunidade, mas **ainda não é confiável como funil executivo ponta a ponta, nem para atribuição causal de mídia a consulta, cirurgia ou receita**.

## Resumo executivo

Os identificadores centrais estão em condição melhor que os painéis: o CRM contém 139 oportunidades sem `Opportunity ID` duplicado, e as 126 oportunidades da Dra. Amanda apontam para linhas existentes da aba operacional. A atribuição de origem está travada e preenchida nessas 126 oportunidades. Isso permite auditoria e recuperação.

O problema está na atualização e na derivação do funil. Em 26 de 126 oportunidades da Dra. Amanda (20,6%), a fase no CRM diverge do status exibido na aba operacional. A aba visível contém 129 linhas para 126 oportunidades: três linhas excedentes, concentradas em dois grupos duplicados; em um deles há statuses concorrentes para a mesma oportunidade. O painel econômico conta fórmulas vazias como leads e mostra 499 em vez de 129 registros preenchidos. A tabela por plataforma soma 102 porque omite 27 contatos de WhatsApp direto.

A etapa consulta é o rompimento mais grave da cadeia. Das 43 linhas em `Consultas`, somente 10 têm `Opportunity ID` (23,3%). Dos 10 registros com identificador de evento, apenas um foi conciliado com os 19 eventos encontrados ao vivo nos dois calendários de sala entre 01/07 e 30/09. Assim, “agendada”, “confirmada” e “realizada” não podem ser usados com segurança para calcular conversão por campanha.

Nas duas campanhas Meta ativas, a janela harmonizada produz evidência pequena e incompleta. Para `M26F01W`, entre 28/07 e 12/08, há 41 contatos com oportunidade e código de campanha, seis oportunidades atualmente em estágio qualificado ou posterior, três datas de qualificação preenchidas, uma consulta marcada como agendada/confirmada na planilha e nenhuma realizada. Para `M26F02S`, desde 24/07, não há linha com o código exato. Isso é evidência de ausência de atribuição no CRM, não prova isolada de que a campanha não gerou contatos.

## Escopo, fontes e método

| Fonte | Uso na auditoria | Recorte | Confiança para este uso |
|---|---|---|---|
| Planilha Google `LEADS` ao vivo, ID previamente conhecido | Grão, completude, deduplicação, atribuição, fases, consultas, importação offline e painéis | 33 abas; leitura em 13/08/2026, cerca de 22:41 BRT | Alta para valores observados; variável para significado gerencial |
| Google Calendar ao vivo | Reconciliação de eventos das duas salas | 01/07/2026 a 30/09/2026; leitura em 13/08/2026 | Alta para eventos acessíveis; baixa para vínculo com oportunidade |
| Repositório local | Contratos de dados, rotas e testes | estado disponível em 13/08/2026 | Alta para o contrato local; não comprova execução ao vivo |
| `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` | Definições e estratégia canônica | documento integral | Alta para estratégia declarada |
| Dados de plataforma auditados nas demais frentes | Status das campanhas e janelas comparáveis | somente campanhas ativas | Alta para status de plataforma; reconciliação tratada aqui |

Método aplicado:

1. Identificação do grão declarado e do grão observado em CRM, aba operacional, consultas e tabelas derivadas.
2. Contagem de chaves, linhas preenchidas, duplicidades, campos críticos e cobertura entre fontes.
3. Reconciliação por `Opportunity ID` e, para agenda, por identificador de evento; identificadores brutos não foram copiados para este artefato.
4. Comparação entre fase canônica do CRM, status visível e marcos datados.
5. Segmentação somente das campanhas Meta confirmadas ativas, usando códigos estáveis e janelas solicitadas.
6. Separação explícita entre fato observado, inferência e recomendação. Contagens pequenas não foram projetadas.

### Grãos usados

| Objeto | Grão esperado | Grão observado | Julgamento |
|---|---|---|---|
| CRM | uma linha por oportunidade | 139 linhas e 139 IDs únicos | Conforme no identificador |
| Aba operacional da Dra. Amanda | uma linha por oportunidade | 129 linhas, 126 IDs únicos | Não conforme: três linhas excedentes |
| Mensuração de campanha | uma oportunidade com origem travada | origem preenchida e travada nas 126 oportunidades | Conforme no preenchimento; cobertura semântica ainda limitada |
| Consulta | uma consulta vinculada à oportunidade e ao evento | 43 consultas; 10 com oportunidade; 10 com evento | Não conforme para funil ponta a ponta |
| Painel | agregação somente de linhas de negócio | fórmulas em 499 linhas, inclusive vazias | Não conforme |

## Qualidade da base operacional

### CRM e aba da Dra. Amanda

| Métrica | Resultado | Evidência / interpretação |
|---|---:|---|
| Oportunidades no CRM | 139 | 126 da Dra. Amanda, 3 de outro profissional, 7 não pacientes e 3 externas |
| IDs de oportunidade duplicados no CRM | 0 | Chave canônica íntegra no conjunto lido |
| Oportunidades da Dra. Amanda no CRM | 126 | Todas com ponteiro válido para uma linha operacional |
| Linhas na aba operacional | 129 | Três linhas excedentes em relação às 126 oportunidades únicas |
| Grupos duplicados na aba operacional | 2 | Mesma oportunidade repetida; um grupo apresenta status conflitante |
| Fases CRM divergentes do status visível | 26/126 (20,6%) | O CRM está estruturalmente ligado, mas desatualizado como fonte de fase |
| Campos críticos ausentes na aba operacional | 0 | Telefone operacional, ID, plataforma e trava de atribuição presentes nas 129 linhas |
| Preferências restritivas explícitas | 2 | Uma de não retomar contato e uma de não usar bot; preservar como guardrail |

A divergência de fase não é ruído marginal. Entre as 26 diferenças, há 17 oportunidades que aparecem qualificadas na aba operacional enquanto o CRM ainda mostra `Novo`, seis exibidas como não qualificadas enquanto o CRM mostra `Novo`, duas exibidas como consulta agendada enquanto o CRM mostra `Novo`, e uma exibida como consulta realizada enquanto o CRM ainda mostra consulta agendada. Portanto, contar fases a partir do CRM ou da aba produz respostas diferentes.

### Distribuição atual por estágio — Dra. Amanda

A distribuição abaixo usa **uma linha canônica por `Opportunity ID`**, escolhida pelo ponteiro do CRM, para neutralizar as três linhas excedentes da aba visível.

| Estágio operacional exibido | Oportunidades únicas | % de 126 |
|---|---:|---:|
| Novo | 91 | 72,2% |
| Qualificado | 20 | 15,9% |
| Não qualificado | 7 | 5,6% |
| Consulta agendada | 5 | 4,0% |
| Consulta realizada | 1 | 0,8% |
| Paciente convertido | 2 | 1,6% |
| **Total** | **126** | **100,0%** |

Essa é uma fotografia de status, não uma coorte. Ela não informa tempo até avanço, nem garante que todos os marcos anteriores foram registrados.

### Origem e identificadores de clique

Nas 129 linhas visíveis, a origem registrada é Meta em 80, WhatsApp direto em 27, Google em 17, orgânico/conteúdo em duas e não identificada em três. Entre as 17 linhas Google, 12 possuem exatamente um identificador de clique e cinco não possuem. Nenhuma linha Meta contém identificador de clique Google, e não foi encontrado caso com dois identificadores concorrentes.

O preenchimento é suficiente para auditar a presença da origem, mas não para afirmar incrementalidade. Em particular:

- o código `M26F02S` não aparece nas oportunidades do recorte, embora a campanha esteja ativa ao vivo;
- a origem “WhatsApp direto” pode absorver contatos cujo clique pago perdeu parâmetros antes da criação da oportunidade;
- a planilha não contém um campo canônico de “consulta solicitada”;
- somente 22 de 129 linhas têm data de qualificação, enquanto 28 oportunidades únicas estão atualmente qualificadas ou em estágio posterior.

### Conversão offline Google

As abas `IMPORT_GOOGLE_ADS` e `IMPORT_GCLID`, os cinco flags visíveis de envio e o conjunto de transações observado contêm os mesmos cinco registros agregados; não há transação duplicada nem identificador de clique conflitante nesse conjunto. O ledger novo contém duas dessas cinco transações, sem evento líquido adicional.

Há, porém, dois nomes de ação em circulação: dois registros usam `Lead qualificado GCLID` e três usam `Lead qualificado`, enquanto a aba operacional ainda marca os cinco com o nome antigo. A integridade técnica do arquivo não confirma que todos chegam à mesma ação principal no Google Ads. Essa confirmação deve ocorrer do lado da conta antes de usar a importação como sinal de lance.

**Atualização pós-auditoria — 14/08/2026:** o bloco `DAT-08` foi executado com backup e identidade exata. As 5 transações passaram a usar `Lead qualificado GCLID`, o ledger ficou em 5/5 após reconstruir 3 registros ausentes e o pós-voo terminou com zero divergência, duplicidade, ausência, linha inválida ou revisão. A conexão do Google Ads iniciou uma importação manual de verificação. O achado técnico está corrigido; o gate gerencial continua aberto até aceite/rejeição reconciliados e sete dias com a ação saudável.

## Painéis e derivados

### `Funil Comercial` e `Painel Econômico`

`Funil Comercial` tem fórmulas até a linha 500, 140 chaves exibidas e somente 129 linhas com plataforma e status preenchidos. Onze chaves são artefatos de fórmula aplicada a linhas vazias. O painel econômico usa `COUNTA` sobre essa área e, por isso, exibe 499 leads. O denominador correto de linhas operacionais preenchidas naquele momento era 129; o denominador deduplicado por oportunidade da Dra. Amanda era 126.

A tabela por plataforma do painel soma 102 porque apresenta Google, Meta, orgânico e não identificada, mas omite 27 linhas de WhatsApp direto. Também mistura data de qualificação com status corrente: mostra 22 qualificações datadas, enquanto o snapshot por status contém 28 oportunidades únicas em qualificado ou estágio posterior. Essas métricas respondem a perguntas diferentes e não estão rotuladas como tal.

Conclusão: os painéis atuais não devem ser usados para orçamento, taxa de conversão ou acompanhamento executivo até que denominador, coorte, evento e janela sejam explicitados.

### Saúde das integrações

O painel de saúde contém um erro `#VALUE!` causado por intervalos de tamanhos incompatíveis. Ele ainda testa a aba legada `IMPORT_GCLID` como primeira aba, embora a implementação atual use corretamente `IMPORT_GOOGLE_ADS` nessa posição. A revisão estrutural registrada é de 02/08/2026. O painel detecta três linhas duplicadas na aba operacional, mas sua fórmula de importação está obsoleta. O julgamento deve ser feito campo a campo, não pelo indicador geral.

## Reconciliação das campanhas Meta ativas

Somente as duas campanhas confirmadas ativas foram incluídas. Campanhas Meta inativas foram excluídas de todas as contagens.

### Definições desta reconciliação

- **Contato com oportunidade atribuída:** oportunidade na aba da Dra. Amanda com código exato da campanha. É o melhor proxy disponível para contato válido; não substitui uma auditoria semântica de cada conversa.
- **Qualificado atual:** status `Qualificado` ou qualquer estágio posterior. Também é mostrada separadamente a presença de data de qualificação.
- **Consulta solicitada:** não disponível. Não existe campo canônico nem aba pendente materializada na planilha no momento da coleta.
- **Consulta agendada/confirmada:** status registrado na planilha; a confirmação ao vivo no Calendar não foi validada de modo suficiente.
- **Consulta realizada:** status de comparecimento registrado na oportunidade.

### Janela harmonizada pós-criativos ativos

| Campanha ativa | Janela CRM | Contatos com oportunidade atribuída | Qualificado atual ou posterior | Com data de qualificação | Consulta solicitada | Agendada/confirmada na planilha | Realizada |
|---|---|---:|---:|---:|---:|---:|---:|
| `M26F01W` | 28/07–12/08 | 41 | 6 (14,6%) | 3 (7,3%) | N/D | 1 (2,4%) | 0 |
| `M26F02S` | 24/07–12/08 | 0 | 0 | 0 | N/D | 0 | 0 |

Para `M26F01W`, os 41 contatos da janela pertencem ao segmento/criativo codificado disponível; os statuses são 34 novos, cinco qualificados, um agendado e um não qualificado. A diferença entre seis oportunidades em estágio qualificado ou posterior e apenas três datas de qualificação demonstra que o marco não é preenchido de forma retrospectiva ou consistente.

Para contexto apenas, fora da janela harmonizada `M26F01W` soma 65 contatos, 11 em qualificado ou estágio posterior, oito datas de qualificação, duas consultas marcadas como agendadas/confirmadas e nenhuma realizada. **O agregado 65/8/2 cobre janela não harmonizada e não deve ser usado para projeção causal.**

O zero de `M26F02S` significa “nenhuma oportunidade com esse código exato na planilha”, não “zero contato gerado pela plataforma”. É necessário reconciliar parâmetros de entrada, fallback de atribuição e resultados Meta antes de qualquer decisão sobre eficiência da campanha.

### Parecer causal

Não há base para declarar vencedor, perdedor, CPL qualificado real, custo por consulta ou retorno dessas campanhas a partir da planilha. O volume é pequeno, “consulta solicitada” não é mensurável, metade dos qualificados da janela não tem data de qualificação, e o vínculo consulta–Calendar está rompido. A evidência serve para diagnosticar instrumentação, não para realocar orçamento isoladamente.

## Amostra semântica recente — classificação e continuidade

### Método e composição

Foi feita uma QA somente leitura de **15 conversas com atividade entre 07/08 e 13/08/2026**, selecionadas intencionalmente de 48 conversas com atividade no período. Para cada conversa foram confrontadas as últimas mensagens disponíveis de entrada e da equipe, a autoria reconciliável, a classificação automática, o resumo/próxima ação e o estado da oportunidade. Doze conversas tinham ao menos uma saída conciliada ao ledger humano; três tinham apenas entrada no recorte. Nenhum identificador, mensagem literal ou detalhe clínico foi copiado para a auditoria.

A amostra cobriu cinco aquisições pagas identificáveis, três continuidades de atendimento já conhecido, duas jornadas de escolha/confirmação de horário, três conversas privadas ou de não paciente, um handoff que exigia tratamento de segurança e uma entrada ambígua. Também incluiu objeção de preço, intenção de longo prazo, continuidade após atendimento e passagem entre automação e equipe. Não havia no recorte um não comparecimento conciliado nem um aceite de orçamento tipado; esses estratos permanecem `N/D`.

Esta é uma **amostra diagnóstica estratificada, não aleatória**. “Acerto” significa concordância com o contexto completo disponível nas duas direções e com as definições desta auditoria; não é uma taxa populacional de acurácia.

#### Cobertura dos estratos obrigatórios

A seleção original preservou somente resultados agregados e não reteve uma chave de caso, por privacidade. Assim, é possível confirmar presença ou ausência de cobertura já documentada, mas não repartir retroativamente os 15 casos sem inferência. Nenhum caso foi acrescentado nesta revalidação.

| Dimensão | Estrato | Cobertura na amostra original (`n=15`) | Limitação |
|---|---|---:|---|
| Origem | Google ativo | Presente; `n` individual não persistido | Google e Meta somam cinco aquisições pagas identificáveis, mas a repartição entre plataformas não foi preservada. |
| Origem | Meta ativo | Presente; `n` individual não persistido | Mesma limitação; não preencher por diferença ou inferência. |
| Origem | Orgânico | `N/D` | Presença e quantidade não foram preservadas na amostra documentada. |
| Profissional | Amanda | `N/D` | Houve 12 casos com rota avaliável e três `N/D`, mas a repartição Amanda/Daniel/outros não foi preservada. |
| Profissional | Daniel | `N/D` | Não inferir a partir do conjunto recente nem das abas de destino. |
| Profissional | Outros profissionais | `N/D` | Conversa privada/não paciente não equivale automaticamente a outro profissional. |
| Estado | Qualificado | `N/D` | A distribuição por estado não foi persistida como estrato independente. |
| Estado | Não qualificado | `N/D` | Não deduzir a partir de exclusões, erro de etapa ou decisão de silêncio. |
| Estado | Ambíguo | 1 | Uma entrada ambígua foi explicitamente incluída na composição original. |

Esta lacuna limita a leitura de cobertura, não altera os escores por dimensão abaixo. `N/D` significa **não determinado na amostra preservada**, nunca zero.

### Resultado por dimensão

| Dimensão | Avaliáveis | Acertos | Erros | N/D | Leitura |
|---|---:|---:|---:|---:|---|
| Profissional/rota | 12 | 12 | 0 | 3 | Bom sinal nos casos com intenção explícita; os três `N/D` não permitiam determinar profissional com segurança. |
| Origem/campanha paga | 5 | 5 | 0 | 10 | Os códigos de Meta/Google observáveis concordaram com a conversa; não extrapolar para origens sem código. |
| Procedimento ou intenção explícita | 5 | 5 | 0 | 10 | O tema registrado concordou nos cinco casos em que a conversa permitia verificá-lo. |
| Lead, não lead ou continuidade conhecida | 14 | 12 | 2 | 1 | Duas conversas reais de continuidade ficaram órfãs, sem oportunidade/rota operacional. |
| Etapa/status e coerência entre fontes | 14 | 7 | 7 | 1 | Houve etapa desatualizada, status automático residual em exclusões e divergência classificador↔CRM. |
| Contexto consolidado e próxima ação | 15 | 9 | 6 | 0 | Resumos funcionam em casos simples, mas perderam contexto recente ou ação necessária em 40% da amostra. |
| Decisão de responder, silenciar ou fazer handoff | 15 | 12 | 3 | 0 | Três decisões exigiam resposta/handoff diferente; as exclusões legítimas e esperas explícitas foram respeitadas. |
| Continuidade da intenção entre paciente e equipe | 15 | 9 | 6 | 0 | O principal defeito é usar estado/summary antigo depois de a conversa avançar. |

Os denominadores variam porque origem, profissional, procedimento e etapa não são observáveis em toda conversa. Os erros se sobrepõem; eles não devem ser somados como conversas distintas.

### Padrões confirmados

- Duas conversas em continuidade de atendimento ficaram como `orphaned`; uma delas coincide com a anomalia de 170 tentativas já identificada. O atendimento humano existia, mas o sistema não preservou a rota.
- Uma conversa ainda constava como consulta agendada apesar de o contexto já demonstrar continuidade posterior ao atendimento; outra permaneceu apenas como qualificada quando havia escolha de horário aguardando confirmação.
- Duas exclusões corretas de conversa privada/não paciente mantinham um último status automático incompatível com o estado final. O silêncio comercial estava correto, mas o campo residual não pode alimentar painel.
- Uma objeção de orçamento foi compreendida corretamente pelo classificador, porém o CRM continuava em `Novo`.
- Em um caso com sinal de potencial urgência assistencial, o resumo/próxima ação tratou a conversa como pedido rotineiro de informações e agenda. O caso exigia handoff humano de segurança, sem orientação clínica automática.
- Uma aquisição paga com intenção inicial explícita recebeu como próxima ação “aguardar”, quando o fluxo deveria solicitar a informação mínima para avançar.
- Como controles positivos, a amostra confirmou roteamento de profissional nos casos avaliáveis, códigos pagos observáveis, exclusão de pedido de emprego/contato privado, confirmação de horário, espera após recusa por orçamento e continuidade de uma intenção de planejamento de longo prazo.

### Parecer

A classificação é **utilizável apenas com revisão humana e não está pronta para automação autônoma ou KPI de etapa**. A amostra não encontrou contaminação de profissional nem de campanha nos casos avaliáveis, mas mostrou falsos negativos de continuidade, status residuais e perda do contexto mais recente. O estado final deve ser calculado de uma fonte canônica reconciliada, e mensagens com possível urgência devem sair do fluxo comercial comum para uma fila humana de segurança.

## Consultas e Calendar

### Cobertura da aba `Consultas`

| Métrica | Resultado |
|---|---:|
| Consultas registradas | 43 |
| Com `Opportunity ID` | 10 (23,3%) |
| Sem `Opportunity ID` | 33 (76,7%) |
| Com data e hora agendadas | 13 (30,2%) |
| Com identificador de evento | 10 (23,3%) |
| Status `Realizada` | 27 |
| Status `Confirmada` | 5 |
| Status `Agendada` | 7 |
| Aguardando confirmação | 1 |
| Status vazio | 3 |

Dos 43 registros, 36 pertencem à profissional em escopo. A baixa cobertura de oportunidade impede atribuir com segurança as 27 consultas realizadas a canal ou campanha. Não foram encontrados campos populados de falta/não comparecimento; isso pode significar ausência de evento ou ausência de registro, e não deve ser tratado automaticamente como taxa zero.

### Reconciliação ao vivo

Foram encontrados 19 eventos nos dois calendários de sala no intervalo 01/07–30/09: dez em uma sala e nove na outra. Quinze têm categoria genérica de consulta. Apenas um dos dez identificadores da planilha corresponde a evento acessível ao vivo e, nesse caso, data e hora coincidem. Os outros nove não resolveram na janela e apresentam formato diferente do identificador do evento conciliado. Dos 19 eventos ao vivo, 18 não têm correspondência por identificador na aba `Consultas`.

Três linhas registram erro de sincronização `room_not_available`. Uma delas é justamente a única com evento conciliado ao vivo. Isso sugere que “sincronizado”, “confirmado” e “evento existente” são estados distintos e hoje não estão representados por uma máquina de estados única.

Parecer: **o Calendar não fecha a reconciliação de consulta**. Não é seguro validar comparecimento, falta ou confirmação por campanha até que o vínculo seja reparado e retroprocessado.

## Novos marcos comerciais

Os marcos `quote_sent`, `accepted`, `completed` e `payment_confirmed` fazem parte do contrato local publicado em 13/08, mas não aparecem como campos tipados persistidos no ledger de estágios lido. O ledger contém 79 eventos e começa em 11/08; não houve retroprocessamento do histórico anterior. No dia civil 13/08 aparecem oito eventos de estágio, porém o horário exato da publicação não está disponível e nenhum deles permite contar com segurança os quatro marcos comerciais solicitados.

Conclusão: a contagem pós-publicação é **não mensurável**, e não zero. Receita, aceite de orçamento, cirurgia concluída e pagamento confirmado permanecem fora do funil auditável.

## Parecer de confiabilidade por uso

| Uso | Parecer | Confiança | Motivo principal |
|---|---|---|---|
| Atender uma oportunidade individual | Utilizável com conferência da linha | Média/alta | Chave e ponteiro íntegros; duplicidades visíveis precisam ser evitadas |
| Contar contatos por origem ampla | Utilizável com ressalvas | Média | Origem preenchida e travada; risco de fallback e perda de parâmetros |
| Contar oportunidades por estágio atual | Utilizável somente a partir da aba deduplicada | Média | CRM e status divergem em 20,6% |
| Medir qualificação por coorte/data | Não confiável | Baixa | Datas de qualificação incompletas |
| Medir solicitação de consulta | Não mensurável | Alta confiança nessa limitação | Campo canônico ausente |
| Medir consulta agendada/confirmada | Não confiável | Baixa | Vínculo Calendar–planilha quase ausente |
| Medir comparecimento/falta | Não confiável | Baixa | Reconciliação e campos de falta insuficientes |
| Atribuir consulta à campanha | Não confiável | Baixa | 76,7% das consultas sem oportunidade |
| Medir cirurgia, aceite, pagamento ou receita | Não mensurável | Alta confiança nessa limitação | Marcos novos sem persistência tipada e sem backfill |
| Otimizar Google por conversão offline | Parcial; validar na conta | Média/baixa | Transações íntegras, nomes de ação divergentes |
| Realocar orçamento Meta pelo funil | Não recomendado | Alta | Janela curta, baixa amostra e funil downstream incompleto |

## Recomendações rastreáveis

As ações abaixo são propostas; nenhuma foi executada nesta auditoria.

| ID | Prioridade | Mudança proposta | Evidência que resolve | Métrica de aceite | Guardrail / regra de decisão | Dono sugerido | Esforço |
|---|---|---|---|---|---|---|---|
| `DAT-01` | P0 | Eleger uma única fase canônica e atualizar CRM e aba operacional na mesma transação idempotente | 26/126 divergências; na amostra semântica, 7/14 etapas/status estavam incoerentes | 0 divergência em amostra diária e 100% dos writes idempotentes | Não regredir fase automaticamente; preservar override humano | Engenharia + operação | Médio |
| `DAT-02` | P0 | Deduplicar de forma reversível as três linhas excedentes e impedir nova linha para `Opportunity ID` já existente | 129 linhas para 126 oportunidades | 126 linhas para 126 IDs; zero duplicidade nova por 30 dias | Nunca mesclar oportunidades distintas da mesma pessoa | Engenharia | Baixo/médio |
| `DAT-03` | P0 | Tornar `Opportunity ID` obrigatório em toda nova consulta e retroprocessar vínculos históricos por regras auditáveis | 33/43 consultas sem oportunidade | 100% novas; ≥95% no histórico reconciliável | Casos ambíguos ficam em fila humana, sem associação automática | Engenharia + agenda | Médio/alto |
| `DAT-04` | P0 | Unificar o ciclo de agenda: solicitado → escolhido → confirmado → realizado/falta/cancelado, com `event_id` real e status de sync separado | 1/10 IDs conciliado; 18/19 eventos sem vínculo | ≥95% eventos conciliados e zero “confirmado” sem evidência | Não enviar confirmação clínica automática; manter aprovação humana | Engenharia + atendimento | Alto |
| `DAT-05` | P1 | Persistir timestamps imutáveis para qualificação e cada etapa downstream, com retroprocessamento explicitamente marcado | 28 em estágio qualificado+ versus 22 datas; novos marcos não mensuráveis | ≥95% completude em 14 dias; campo `backfilled` separado | Nunca fabricar horário histórico; data desconhecida permanece nula | Engenharia | Médio |
| `DAT-06` | P1 | Corrigir painéis para intervalos ocupados, oportunidade deduplicada, coorte e janela explícitas; incluir WhatsApp direto | 499 exibidos versus 129; tabela omite 27 | Totais batem com query de controle em todas as dimensões | Painel bloqueia publicação se reconciliação falhar | Dados/engenharia | Médio |
| `DAT-07` | P1 | Preservar código de campanha/criativo na entrada e registrar motivo de fallback de atribuição | zero `M26F02S`; 27 WhatsApp direto | ≥95% contatos pagos com código esperado ou motivo explícito | Atribuição travada não pode ser sobrescrita sem evento de auditoria | Engenharia + mídia | Médio |
| `DAT-08` | P1 | Consolidar um único ledger de conversão offline e alinhar o nome da ação com a ação principal ao vivo | cinco transações íntegras, dois nomes de ação | 100% ACK ou estado final; zero nome divergente | Exigir exatamente um click ID elegível, base/política aplicável e zero PII/PHI; o consentimento manual de contato não é gate e nunca deve ser marcado artificialmente | Engenharia + Google Ads | Médio |
| `DAT-09` | P2 | Corrigir o painel de saúde e fazê-lo testar a aba/importador atual | `#VALUE!` e referência legada | zero erro de fórmula; checks cobrem a fonte vigente | Check obsoleto deve falhar explicitamente, não ficar verde | Engenharia | Baixo |
| `DAT-10` | P1 | Criar reconciliação diária agregada por campanha ativa: contato, qualificação, solicitação, confirmação, realização e fechamento | funil Meta incompleto e não causal | diferença entre origem e CRM <2%; completude de marcos ≥95% | Sem projeção causal abaixo do volume mínimo ou com cobertura abaixo do limite | Dados + mídia + operação | Médio |

### Ordem recomendada

1. `DAT-01` a `DAT-04`: reparar identidade, fase e consulta antes de usar o funil para decisão.
2. `DAT-05`, `DAT-07` e `DAT-08`: completar eventos e atribuição.
3. `DAT-06`, `DAT-09` e `DAT-10`: republicar indicadores somente depois que queries de controle fecharem.

Regra de manutenção: considerar o funil apto para decisão de orçamento apenas após 14 dias consecutivos com zero duplicidade de oportunidade, ≥95% dos marcos críticos preenchidos nas novas oportunidades, ≥95% de reconciliação Calendar–consulta e diferença inferior a 2% entre tabelas canônicas e painéis. Reverter a nova derivação se qualquer guardrail quebrar por dois dias consecutivos.

## Limitações

- A QA semântica leu 15 conversas recentes somente no sistema e persistiu apenas contagens e paráfrases anônimas. Ainda assim, “contato válido” no funil completo continua sendo proxy operacional porque a amostra é intencional, pequena e não cobre toda a população.
- Não havia no recorte uma verdade-terreno conciliada para falta/não comparecimento ou aceite de orçamento; esses estratos não foram tratados como zero.
- Contagens por campanha dependem do código persistido no CRM. Perda de parâmetro pode deslocar contatos para WhatsApp direto ou origem não identificada.
- O Calendar inspecionado contém os dois calendários de sala acessíveis; eventos fora da janela, em outro calendário ou removidos podem não ter sido observados.
- O status `Realizada` foi lido da planilha, não de prontuário ou sistema financeiro.
- Não há base segura para calcular receita, cirurgia indicada, orçamento aceito, pagamento ou retorno sobre gasto.
- O pacote local publicado em 13/08 e seus 486 testes aprovados comprovam o contrato do código disponível, não retroprocessamento nem execução histórica em produção.

## Conclusão

Há uma espinha dorsal recuperável: IDs únicos no CRM, ponteiros válidos e atribuição preenchida. A prioridade não é trocar de ferramenta, mas fechar a transação entre oportunidade, fase e agenda. Até isso ocorrer, a operação pode usar a planilha para atuar caso a caso, porém mídia e gestão devem tratar qualificação datada, confirmação, comparecimento, fechamento e receita como métricas incompletas. As duas campanhas Meta ativas não têm evidência CRM suficiente para uma decisão causal de orçamento.
