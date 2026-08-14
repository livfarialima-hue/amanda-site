# Bot, WhatsApp e operação

**Data de referência:** 13 de agosto de 2026<br>
**Coleta:** planilha e Calendar em 13/08/2026, cerca de 22:41 BRT; endpoint público em 13/08/2026, 22:58 BRT<br>
**Modo:** somente leitura; nenhuma mensagem, planilha, agenda, configuração ou sistema externo foi alterado<br>
**Privacidade:** somente contagens e padrões abstratos; nenhum nome de paciente, telefone, e-mail, conteúdo de conversa, informação clínica, foto ou documento pessoal foi persistido<br>
**Parecer:** o bot tem um contrato local defensivo e a configuração pública responde como saudável, mas a **observabilidade operacional está fragmentada**. É possível confirmar recebimento, roteamento e atividade humana e fazer uma leitura diagnóstica da qualidade em uma amostra recente; não é possível medir SLA oficial, acurácia populacional do bot, confirmação de agenda ou fechamento ponta a ponta com confiança.

## Resumo executivo

O webhook público respondeu com os componentes críticos habilitados: validação de assinatura, planilha e segredo configurados, modelo configurado, alertas, revisão de agenda, modo ativo, guardas de preferência e fallback restrito à aquisição. O repositório local também passou 486 de 486 testes em 13/08, cobrindo marcos administrativos, contexto humano, deduplicação e agenda. Esses sinais provam que existe um contrato técnico coerente; não provam que cada caminho assíncrono executou em produção.

A telemetria principal mostra 813 mensagens, 83 pessoas e identificadores de mensagem sem duplicidade. Nos últimos sete dias, foram recebidas 206 mensagens e registradas 197 mensagens humanas. O painel, porém, mostra zero conversas humanas porque consulta uma aba legada sem atividade recente; a aba vigente registra atividade humana de 43 pessoas no mesmo período. Assim, o painel subestima o handoff e mistura métricas não comparáveis.

O SLA oficial não é mensurável: há somente seis timestamps de primeira resposta no funil e nenhum SLA calculado. Uma aproximação pelo ledger encontra resposta posterior para 57 oportunidades, mediana de 29,9 minutos, percentil 90 próximo de 599 minutos e 16 oportunidades com entrada sem saída no mesmo ledger. Isso é um diagnóstico de cobertura, não um SLA, porque horário comercial, pausas, retomadas, mensagens automáticas e vínculos incompletos não estão normalizados.

A fila está operante, mas não totalmente limpa: há duas pendências vencidas entre 45 compromissos, cinco revisões abertas, oito jobs órfãos antigos, um job parado aguardando mensagens e uma anomalia de 170 tentativas em um registro antigo. Não havia job vencido pronto nem lease expirado na coleta. O ledger de estágios começou em 11/08 e não retroprocessou o histórico; por isso os novos marcos comerciais não podem ser contados com segurança após a publicação de 13/08.

## Fontes e método

| Fonte | Evidência usada | Recorte | Confiança |
|---|---|---|---|
| Planilha `LEADS` ao vivo | mensagens, eventos, atendimento humano, classificação, compromissos, central, revisões, consultas e painéis | snapshot de 13/08/2026 | Alta para contagens; variável para derivadas |
| Endpoint público `GET /api/ycloud/webhook` | estado sanitizado de configuração | 13/08/2026, 22:58 BRT | Alta para flags expostas; não prova execução fim a fim |
| Repositório local | arquitetura, guardrails, tempos e contratos | estado disponível em 13/08/2026 | Alta para código local |
| Testes locais | 486 aprovados, zero falhas | execução em 13/08/2026 | Alta para comportamento testado; não prova produção |
| Google Calendar ao vivo | existência e vínculo de eventos | 01/07–30/09/2026 | Alta para eventos acessíveis; baixa para reconciliação |
| Documentação operacional local | fluxo esperado e responsabilidades | leitura integral dos guias aplicáveis | Média/alta; há divergências internas apontadas abaixo |

O método foi contar registros e chaves, avaliar completude, cruzar ledgers por identificadores técnicos sem copiá-los, comparar janelas consistentes e confrontar painéis com suas fontes. Para a QA semântica, foram avaliadas no próprio sistema 15 conversas recentes em amostra intencional e estratificada; somente contagens e paráfrases anônimas foram persistidas. Qualidade de resposta, sensibilidade de handoff e precisão do classificador foram julgadas apenas nesse recorte, sem generalização para toda a população.

## Arquitetura e guardrails observados

O contrato local implementa uma sequência defensiva:

1. valida assinatura e normaliza o evento;
2. resolve identidade e rota profissional antes de responder;
3. registra mensagem/evento de forma idempotente;
4. respeita preferência de não usar bot e atendimento humano ativo;
5. espera uma janela curta para agrupar mensagens;
6. usa memória limitada e contexto humano permitido;
7. gera resposta com guarda final de conteúdo;
8. escala casos sensíveis, dúvidas e agenda para humano;
9. persiste classificações e eventos administrativos;
10. em falha crítica, evita ampliar a conversa automática.

Parâmetros relevantes encontrados no código e nos testes:

- memória recente limitada a 16 turnos;
- janela de silêncio de oito segundos antes da resposta agrupada;
- retomada do bot após atendimento humano sujeita a tempo e tipo de caso;
- agenda requer confirmação humana;
- preferências de não retomar contato e não usar bot são guardrails explícitos;
- sincronização de Calendar foi desenhada sem dados pessoais no título/descrição do evento;
- roteamento ambíguo falha fechado e pode ir para revisão humana;
- conversão offline usa identificador de clique quando a oportunidade se torna qualificada.

Os 486 testes aprovados incluem deduplicação, contexto humano, agenda e novos marcos administrativos. Essa cobertura reduz risco de regressão local, mas não mede latência real, permissões, quotas, falhas de rede, concorrência multi-instância ou jobs interrompidos em produção.

## Estado público da integração

O endpoint de leitura respondeu `ok` e expôs como ativos: assinatura, webhook da planilha, segredo, modelo, alerta de revisão, revisão de agendamento, modo de operação, execução direta/em segundo plano, guarda de preferências, fallback restrito e exigência de e-mail em falha de lead. Nenhum segredo ou identificador sensível foi registrado neste relatório.

Julgamento: o endpoint é um **check de configuração**, não de resultado. Ele não verifica se uma mensagem de teste percorre WhatsApp → planilha → classificação → resposta/handoff → agenda, nem se o processador em segundo plano está drenando todos os jobs.

## Mensagens, pessoas e cobertura

### Ledger principal

| Métrica | Total | Últimos 7 dias |
|---|---:|---:|
| Mensagens | 813 | 369 |
| Recebidas | 455 | 206 |
| Enviadas | 358 | 163 |
| Pessoas únicas | 83 | — |
| IDs de mensagem duplicados | 0 | 0 |
| Mensagens sem oportunidade e sem aba | 174 | — |
| Mensagens sem profissional atribuído | 124 | — |

O evento mais recente observado era de 13/08, aproximadamente 20:49 BRT, demonstrando frescor no dia da auditoria. A ausência de duplicidade de `Message ID` é positiva. A incompletude de oportunidade/rota está concentrada em eventos legados e pendentes, mas impede que todas as mensagens alimentem métricas por funil.

Há 660 registros no ledger de eventos. Os IDs são únicos; 455 correspondem a mensagens recebidas no ledger principal, e 205 não têm par ali. Esses 205 podem representar eventos não textuais, técnicos ou históricos. Sem uma tipagem canônica, não é seguro chamá-los de mensagens perdidas.

A distribuição agregada de resultados de roteamento inclui 121 inserções, 124 atualizações/ações ligadas a telefone ou profissional conhecido, 227 eventos de identidade, 15 pacientes conhecidos, 49 rotas pendentes e uma rota recuperada. A maior parte do histórico antigo não carrega oportunidade ou profissional, o que reduz comparabilidade temporal.

### Atendimento humano

O ledger vigente contém 421 mensagens humanas, 78 pessoas no histórico e 197 mensagens de 43 pessoas nos últimos sete dias. Destas 421 mensagens, 272 têm ID também presente no ledger principal e 149 não têm correspondência. Isso pode refletir backfill, eco parcial ou caminhos de captura distintos; precisa de explicação por `source` e versão.

A aba legada de atendimento contém apenas 26 registros, não recebe evento desde 28/07 e não contém atividade nos últimos sete dias. O `Painel do Bot` ainda a usa para “conversas assumidas”, resultando em zero, enquanto a fonte vigente comprova atividade humana relevante. Essa métrica do painel deve ser retirada de uso imediato.

Não existe campo confiável que classifique a autoria de toda mensagem enviada como bot ou humano. Um cruzamento por eco humano sugere 272 saídas humanas e 86 saídas não conciliadas no histórico; nos últimos sete dias, 161 saídas conciliadas com humano e duas não conciliadas. **Esse cruzamento não mede automação**, porque cobertura de eco e rotas históricas são incompletas.

## Resposta e SLA

O funil contém somente seis timestamps de primeira resposta e zero medições de SLA, portanto o indicador oficial não existe na prática.

Como diagnóstico exploratório, foi calculado o intervalo entre entrada e primeira saída posterior dentro da mesma oportunidade:

| Proxy | Resultado |
|---|---:|
| Oportunidades com intervalo calculável | 57 |
| Mediana até alguma saída | 29,9 min |
| Percentil 90 aproximado | 599 min |
| Respostas em até 5 min | 9 |
| Respostas em até 30 min | 29 |
| Entrada sem saída no mesmo ledger | 16 oportunidades |
| Com saída humana identificável | 43; mediana 29,5 min; P90 aproximado 556 min |

Esses números não controlam horário comercial, mensagem automática de acolhimento, pausa humana, nova intenção em conversa antiga ou vínculos ausentes. São adequados para localizar lacunas de instrumentação, mas **não devem virar meta de equipe nem comparação de desempenho**.

## Classificação e mudança de estágio

### Fila de classificação

| Estado | Quantidade |
|---|---:|
| Concluído | 67 |
| Excluído/arquivado como não lead | 10 |
| Órfão | 8 |
| Aguardando mensagens | 1 |
| **Total** | **86** |

Na coleta não havia job vencido pronto para execução nem lease expirado. Os oito órfãos são antigos; um registro aguardava mensagens desde julho. Um registro antigo contém `attempts=170`, enquanto 82 dos 86 têm zero tentativa e três têm uma. Isso é uma anomalia de contador ou repetição histórica e não deve ser somado como 170 falhas independentes.

Treze linhas trazem motivo/erro, mas dez são exclusões esperadas de não leads e três são órfãs; o painel que as trata como “erros” mistura decisão de negócio com falha técnica.

### Ledger de estágios

Foram observados 79 eventos: 78 originados do classificador e um de edição humana. As decisões agregadas são 52 `no_change`, 20 `applied`, cinco `review_required`, uma exclusão de não lead e um override humano. Há 74 classificações de alta confiança, quatro de baixa confiança e uma decisão humana.

O ledger começou em 11/08 e não retroprocessou o histórico. No dia 13/08 aparecem oito eventos — cinco `Novo`, dois `Consulta agendada` e um `Consulta realizada` —, porém sem um timestamp de deploy confiável não se pode atribuí-los à publicação daquele dia.

Os marcos `quote_sent`, `accepted`, `completed` e `payment_confirmed` não estão persistidos como colunas tipadas nesse ledger. Portanto, a contagem segura após a publicação de 13/08 é **não disponível**, não zero. A mudança não retroprocessou o histórico.

### Qualidade do classificador

As nove revisões disponíveis são selecionadas pelo próprio sistema e não formam amostra aleatória: cinco permanecem abertas e quatro foram concluídas. Para reduzir essa lacuna, foi executada uma QA somente leitura de **15 conversas com atividade entre 07/08 e 13/08**, escolhidas de forma estratificada entre 48 conversas recentes. Foram comparadas as últimas mensagens de entrada e da equipe, a autoria reconciliável, a classificação, o resumo/próxima ação e o CRM. Doze conversas incluíam saída conciliada ao ledger humano; três tinham somente entrada no recorte. Nenhuma mensagem literal, identificador ou detalhe clínico foi persistido.

#### Cobertura dos estratos obrigatórios

A amostra original não reteve uma chave por conversa, por privacidade. A cobertura abaixo usa somente o que ficou documentado para os mesmos 15 casos; não houve nova seleção nem inclusão de caso nesta revalidação.

| Dimensão | Estrato | Cobertura na amostra original (`n=15`) | Limitação |
|---|---|---:|---|
| Origem | Google ativo | Presente; `n` individual não persistido | Google e Meta somam cinco aquisições pagas identificáveis, sem repartição preservada. |
| Origem | Meta ativo | Presente; `n` individual não persistido | Não preencher por diferença ou inferência. |
| Origem | Orgânico | `N/D` | Presença e quantidade não foram preservadas. |
| Profissional | Amanda | `N/D` | Houve 12 rotas avaliáveis e três `N/D`, mas não foi preservada a repartição Amanda/Daniel/outros. |
| Profissional | Daniel | `N/D` | Não inferir a partir da aba ou do estado atual. |
| Profissional | Outros profissionais | `N/D` | Conversa privada/não paciente não prova rota para outro profissional. |
| Estado | Qualificado | `N/D` | O estrato independente não foi persistido. |
| Estado | Não qualificado | `N/D` | Exclusão, silêncio correto e incoerência de etapa não são substitutos para essa contagem. |
| Estado | Ambíguo | 1 | Uma entrada ambígua foi explicitamente incluída na composição original. |

`N/D` significa não determinado na amostra preservada, e não zero. A limitação impede estimar cobertura ou acurácia por esses estratos, mas não altera os resultados agregados abaixo.

| Dimensão | Acerto | Erro | N/D |
|---|---:|---:|---:|
| Profissional/rota | 12 | 0 | 3 |
| Origem/campanha paga | 5 | 0 | 10 |
| Procedimento ou intenção explícita | 5 | 0 | 10 |
| Lead, não lead ou continuidade | 12 | 2 | 1 |
| Etapa/status e coerência entre fontes | 7 | 7 | 1 |
| Contexto e próxima ação | 9 | 6 | 0 |
| Responder, silenciar ou fazer handoff | 12 | 3 | 0 |

Os principais erros foram duas continuidades reais em estado órfão, etapa atrasada depois de a conversa avançar, status automático residual em exclusões, divergência classificador↔CRM e uma decisão de handoff insuficiente diante de sinal de potencial urgência assistencial. Em outro caso, uma aquisição paga com intenção inicial explícita recebeu orientação interna de apenas aguardar, em vez de solicitar o próximo dado necessário. Como controles positivos, rotas de profissional, códigos pagos observáveis, exclusões legítimas e confirmações de horário ficaram corretos nos casos avaliáveis.

Não é uma taxa populacional: a amostra é pequena, intencional e não possui verdade-terreno independente para todos os campos. Ainda assim, ela demonstra que a classificação não deve alimentar automação autônoma, painel de etapa ou retomada sem reconciliação e revisão humana. Falsos negativos de continuidade ocorreram em 2/14 casos avaliáveis; dois registros excluídos preservavam status automático residual, embora a decisão final de silêncio estivesse correta.

## Conhecimento supervisionado

Há três dúvidas e nove itens de revisão, mas `Respostas Aprovadas` e `_WHATSAPP_USO_RESPOSTAS` estão vazias. As quatro revisões concluídas tratam de regras administrativas gerais e não formam uma biblioteca de respostas aprovada com uso mensurável.

O desenho de conhecimento supervisionado existe, porém ainda não há ciclo operacional comprovado de:

`dúvida → revisão → resposta aprovada → reutilização → avaliação de resultado`.

Até esse ciclo existir, não é seguro afirmar que o bot aprende com a operação ou que reduz carga humana por reaproveitamento aprovado.

## Agenda, confirmação e pós-consulta

A agenda depende de confirmação humana por desenho, o que é coerente com o risco operacional. No snapshot:

- a aba de escolhas pendentes descrita na documentação não estava materializada; isso não permite concluir que houve zero solicitação;
- 43 consultas estavam registradas, mas somente dez tinham `Opportunity ID`;
- dez tinham identificador de evento e apenas um foi conciliado ao Calendar ao vivo;
- três registravam `room_not_available`;
- havia um caso elegível para pós-consulta, nenhum envio registrado, nenhum erro e nenhuma supressão;
- campos de não comparecimento estavam vazios.

A documentação diverge sobre o atraso do pós-consulta: um trecho menciona aproximadamente duas horas, enquanto o código e outro trecho usam 180 minutos. O contrato executável indica três horas; a documentação deve ter uma única fonte numérica.

Sem reconciliação de evento, não é possível afirmar que a automação de confirmação, comparecimento ou pós-consulta está completa. O fato de os títulos do Calendar serem privacy-safe nos testes é positivo, mas separado da cobertura de sincronização.

## Filas e carga operacional

### Compromissos

| Tipo | Quantidade |
|---|---:|
| Jornada de cuidado | 30 |
| Agendamento | 6 |
| Revisão humana | 8 |
| Preço de procedimento | 1 |
| **Total** | **45** |

Quarenta e três compromissos estavam resolvidos e dois pendentes/vencidos. Os IDs são únicos. Ambos os abertos têm responsabilidade da equipe da profissional em escopo.

### Central operacional

| Categoria | Quantidade |
|---|---:|
| Aguardando paciente | 33 |
| Pendência vencida | 2 |
| Responder agora | 2 |
| Manual hoje | 2 |
| Consulta/cuidado | 1 |
| **Total** | **40** |

Há duas prioridades críticas, quatro altas, uma normal e 33 baixas. O campo bruto de prazos conta seis itens passados, pois inclui agendados e outros estados; a fila operacional explicitamente classificada como vencida contém dois. O nome da métrica deve distinguir “data passada” de “pendência vencida acionável”.

Também foram observados 26 horários de agenda marcados como disponíveis embora já estivessem no passado. Isso aumenta ruído para seleção e saúde da integração.

## Avaliação do `Painel do Bot`

O painel exibe, para sete dias, 206 mensagens recebidas, 45 pessoas, 197 mensagens humanas, zero conversas humanas, 18 alertas, nove “erros”, 21 leads capturados, seis qualificados, 12 agendados e dois realizados.

Parte dos números está correta isoladamente, mas o conjunto não é comparável:

- 206 coincide com entradas do ledger de mensagens;
- 197 coincide com mensagens do ledger humano;
- zero conversas humanas vem da aba legada, enquanto a fonte vigente tem 43 pessoas com atividade humana;
- 12 agendados é acumulado da aba `Consultas`, enquanto dois realizados usa janela de sete dias;
- seis qualificados usa status atual recente, não uma coorte de qualificação;
- nove “erros” mistura tipos e não corresponde aos 13 motivos da fila de classificação;
- “leads capturados” usa uma data, enquanto as outras etapas usam outras datas ou estoque atual.

Conclusão: o painel não representa um funil de sete dias e não deve embasar dimensionamento de equipe ou automação.

## Matriz de risco operacional

| Risco | Severidade | Probabilidade | Evidência | Efeito possível |
|---|---|---|---|---|
| Conversa fica sem oportunidade/rota | Alta | Alta | 174 mensagens sem oportunidade e aba; na amostra, 2 continuidades recentes ficaram órfãs | perda de contexto, segurança e atribuição |
| Handoff humano invisível no painel | Alta | Alta | zero no painel versus 43 pessoas na fonte vigente | gestão subestima carga e tempo de resposta |
| Consulta confirmada sem evento reconciliável | Crítica | Alta | 1/10 IDs conciliado | conflito de sala, falha de confirmação e atribuição |
| Job órfão ou preso não retorna à fila | Alta | Média | oito órfãos e um aguardando desde julho | atendimento não processado |
| Falso alarme de erro | Média | Alta | exclusões de não leads agregadas como erro | fadiga de alerta e prioridade errada |
| Aprendizado supervisionado não fecha ciclo | Média | Alta | zero respostas aprovadas/uso | dúvidas se repetem e exigem humano |
| SLA gerencial incorreto | Alta | Alta | seis timestamps e nenhum SLA válido | gestão e promessa de atendimento sem evidência |
| Marcos financeiros presumidos | Crítica | Alta | campos tipados ausentes, sem backfill | ROI e receita incorretos |
| Sinal de urgência segue fluxo comercial comum | Crítica | Média | 1/15 na amostra teve próxima ação/handoff insuficiente | atraso de avaliação humana e resposta inadequada |

## Recomendações rastreáveis

As ações abaixo são propostas; nenhuma foi executada.

| ID | Prioridade | Mudança proposta | Evidência | Métrica de aceite | Guardrail / regra de decisão | Dono sugerido | Esforço |
|---|---|---|---|---|---|---|---|
| `BOT-01` | P0 | Criar teste sintético diário, sem dado pessoal, do webhook até persistência, classificação e handoff | health atual valida configuração, não fluxo | 100% dos passos com ACK e latência; alerta em quebra | Nunca enviar para número real; ambiente/contato técnico controlado | Engenharia | Médio |
| `BOT-02` | P0 | Tornar oportunidade e rota obrigatórias antes de resposta automática; fila explícita para ambiguidade e sinal de urgência | 174 mensagens sem oportunidade/aba; 2 continuidades órfãs e 3/15 decisões de resposta/handoff inadequadas na amostra | ≥99% das novas entradas roteadas; zero resposta em rota ambígua; 100% dos sinais de urgência em fila humana | Falhar fechado; não orientar clinicamente; preservar atendimento humano e priorizar segurança | Engenharia + operação clínica | Médio |
| `BOT-03` | P0 | Substituir a aba legada no painel pelo ledger humano vigente e definir “conversa” | 0 exibido versus 43 pessoas ativas | painel reconcilia 100% com query de controle | Não inferir autoria quando eco estiver ausente | Dados + engenharia | Baixo/médio |
| `BOT-04` | P0 | Instrumentar SLA por evento: recebido, primeira automação, primeira resposta humana, pausa e fechamento | só seis timestamps e zero SLA | ≥95% das novas conversas com tempos calculáveis | Excluir fora do horário por regra publicada; não usar proxy histórico como meta | Engenharia + operação | Médio |
| `BOT-05` | P0 | Implementar reaper e fila de exceção para órfãos, espera antiga e tentativas anômalas | oito órfãos; a amostra confirmou 2 continuidades recentes órfãs, uma com contador 170 | zero job vencido >15 min; 100% anomalias com motivo | limite de tentativas e escalonamento humano; sem loop infinito | Engenharia | Médio |
| `BOT-06` | P1 | Separar decisão de negócio, revisão e falha técnica nos estados/alertas | dez exclusões contam como erro | erro técnico mede somente falhas; taxa por classe publicada | Não silenciar falhas reais ao reclassificar | Engenharia + operação | Baixo |
| `BOT-07` | P1 | Fechar ciclo de conhecimento supervisionado com versão, aprovador, validade e uso | zero respostas aprovadas e zero usos | ≥1 resposta aprovada por tema recorrente; uso e resultado rastreáveis | Sem diagnóstico, prescrição ou aprendizado automático sem aprovação | Operação clínica + engenharia | Médio |
| `BOT-08` | P1 | Persistir `source`/autoria para toda saída e reconciliar eco humano | 149 mensagens humanas sem par e 86 saídas não conciliadas | ≥98% das saídas com autoria inequívoca | “desconhecido” é preferível a inferência automática | Engenharia | Médio |
| `OPS-01` | P0 | Fechar diariamente pendências vencidas e revisar compromissos críticos/altos | duas vencidas; seis itens acionáveis não baixos | zero P0/P1 vencido no fechamento diário | Não retomar quem optou por não contato; registrar resolução | Atendimento | Baixo |
| `OPS-02` | P0 | Unificar escolha, confirmação humana e evento Calendar em uma máquina de estados auditável | aba pendente ausente e 1/10 eventos conciliado | ≥95% das novas consultas com oportunidade e evento válidos | Sem confirmação ao paciente antes de sala e equipe confirmarem | Engenharia + atendimento | Alto |
| `OPS-03` | P1 | Expirar/arquivar slots passados e monitorar disponibilidade real | 26 slots passados ainda disponíveis | zero slot passado ofertável; alerta diário | Nunca apagar histórico; alterar somente estado | Agenda | Baixo |
| `OPS-04` | P1 | Padronizar atraso de pós-consulta em uma configuração única | documentação diz 2h e 3h; código usa 180 min | documentação, teste e config idênticos | Mensagem depende de consulta reconciliada e elegibilidade | Operação + engenharia | Baixo |
| `OPS-05` | P1 | Persistir novos marcos comerciais como eventos tipados e retroprocessar somente quando comprovável | `quote_sent` etc. não mensuráveis | ≥95% dos novos casos com timestamps; cobertura histórica rotulada | Não inferir pagamento/aceite; histórico desconhecido fica nulo | Operação + engenharia | Médio/alto |
| `OPS-06` | P2 | Publicar runbook de incidentes com fila, responsável, prazo e evidência de encerramento | fontes e estados fragmentados | 100% alertas P0/P1 com owner e SLA; teste trimestral | Sem conteúdo clínico/pessoal no alerta | Operação | Médio |

### Ordem de execução sugerida

1. `BOT-02`, `BOT-05`, `OPS-01` e `OPS-02`: evitar perda de atendimento e conflito de agenda.
2. `BOT-03`, `BOT-04`, `BOT-06` e `BOT-08`: tornar a operação mensurável.
3. `BOT-07`, `OPS-03`, `OPS-04` e `OPS-05`: melhorar escala e fechar o funil.
4. `BOT-01` e `OPS-06`: manter prevenção e resposta contínuas; o teste sintético pode ser antecipado se houver ambiente seguro.

Critério para manter/expandir automação: por 14 dias, ≥99% das novas entradas com rota válida, zero resposta em rota ambígua, zero job P0/P1 vencido, ≥95% das consultas novas conciliadas e ≥95% dos tempos de resposta calculáveis. Pausar expansão automática se ocorrer mensagem em preferência proibitiva, roteamento incorreto, confirmação sem sala ou falha repetida sem handoff.

## Limitações

- Uma amostra de 15 conversas recentes foi lida somente no sistema para avaliar classificação, contexto e handoff; nenhum conteúdo literal, identificador ou detalhe clínico foi reproduzido. A amostra não autoriza concluir acurácia populacional nem correção clínica geral.
- Não houve caso conciliado de não comparecimento nem aceite de orçamento tipado na amostra; esses estratos permanecem `N/D`.
- “Pessoa” foi contada por identificador técnico anonimizado; mudanças de número ou identidades fundidas podem alterar o total real.
- O cruzamento de autoria é incompleto e não mede participação real do bot.
- O proxy de tempo de resposta ignora horário de atendimento e pausas; não é SLA oficial.
- O endpoint público informa configuração, não disponibilidade de dependências downstream.
- O Calendar acessível não reconciliou a planilha; eventos externos, removidos ou fora da janela podem não ter sido observados.
- Testes locais comprovam comportamento esperado no repositório, não execução contínua em produção.
- Os novos marcos administrativos não possuem backfill nem persistência tipada suficiente para contagem pós-publicação.

## Conclusão

O desenho do bot é prudente — idempotência, rota antes de resposta, guarda final, pausa humana e agenda confirmada por pessoa — e a saúde pública indica configuração ativa. A lacuna principal não é um único bug de resposta, mas a distância entre contrato, execução e medição: ledgers não totalmente conciliados, painel em fonte legada, fila histórica com exceções e agenda quase sem vínculo verificável. A prioridade é recuperar observabilidade e fechar o handoff antes de aumentar autonomia ou usar o painel para dimensionar equipe, avaliar campanha ou calcular retorno.
