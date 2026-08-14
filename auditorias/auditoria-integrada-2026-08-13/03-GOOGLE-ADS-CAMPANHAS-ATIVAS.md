# Google Ads — campanhas ativas

**Auditoria somente leitura:** nenhuma recomendação foi aplicada, nenhum orçamento, lance, anúncio, palavra-chave, meta ou status foi alterado.

**Coleta ao vivo:** 13 de agosto de 2026, aproximadamente 22:43–22:57, com follow-up de configurações detalhadas em torno de 23:50, horário de Brasília (`GMT-03:00`).

**Conta:** Dra. Amanda Schroeder, cliente Google Ads `995-334-4486` (`ocid=7207273888`).

**Conclusão principal:** seis campanhas de Pesquisa estavam ativadas ao vivo. O estado atual, porém, não possui uma janela comparável útil: em 13/08 houve inclusão de palavras-chave exatas em quatro campanhas, remoções em uma lista de negativas e aumento de 91,7% no orçamento de lifting cervical. A ação que orienta a meta personalizada, `Lead qualificado GCLID`, estava **Principal**, incluída nas metas e com status **Requer atenção**. Portanto, clique, CPC ou limitação de orçamento não sustentam escala neste momento.

## 1. Fontes, filtros e confiabilidade

| Fonte ao vivo | URL | Filtro/período | Granularidade | Coleta | Confiança/limitação |
|---|---|---|---|---|---|
| Campanhas | `https://ads.google.com/aw/campaigns?ocid=7207273888&authuser=3` | visualização `Todas as campanhas`, 2 filtros da visualização; total explicitamente rotulado `todas as campanhas ativadas`; 12/08 e 13/08 inspecionados | campanha e dispositivo | 13/08, 22:43–22:55 BRT | Alta para status, orçamento, lance, meta e métricas exibidas; IDs numéricos das campanhas não foram expostos pelo DOM |
| Histórico de alterações | `https://ads.google.com/aw/changehistory?ocid=7207273888&authuser=3` | 14/07–12/08 e 13/08 isolado; todas as alterações | conta/campanha/grupo | 13/08, 22:49–22:53 BRT | Alta; relatório adverte que não é em tempo real |
| Ações de conversão | `https://ads.google.com/aw/conversions?ocid=7207273888&authuser=3` | ações ativadas; data 12/08 | ação de conversão | 13/08, 22:56 BRT | Alta para configuração/status; volume recente pode sofrer atraso |
| Norte estratégico | `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` | revisão de 13/08 | decisão vigente | leitura em 13/08 | Fonte canônica, subordinada à configuração ao vivo para estado factual |
| Follow-up de configurações detalhadas | aba autenticada em `https://ads.google.com/aw/productlinks/analyticsappweb?ocid=7207273888&authuser=3`; tentativa de abrir `https://ads.google.com/aw/campaigns?ocid=7207273888&authuser=3` | seis campanhas ativas; URLs finais, localizações, idiomas, programação, termos de pesquisa e negativas atuais | 13/08, em torno de 23:50 BRT | **Inacessível nesta passada:** duas tentativas de leitura/navegação excederam 30 s e interromperam a conexão de controle antes de qualquer tabela de configuração carregar. Nenhum valor foi inferido |

O Google Ads exibiu um aviso de bloqueador de anúncios, mas as tabelas de campanhas, histórico e conversões carregaram e foram lidas. Nenhum dado pessoal foi incluído neste relatório.

## 2. Inventário fechado das campanhas ativas

Os códigos `G26*` são os identificadores estáveis do contrato interno de atribuição. O ID numérico nativo não ficou disponível na interface acessível e, por isso, **não foi inventado**.

| Campanha ativa | Código estável | Orçamento atual | Tipo/lance atual | Meta exibida na campanha | Estrutura ativa/qualificada | Status observado | Última mudança material confirmada | Janela comparável atual |
|---|---|---:|---|---|---|---|---|---|
| `S_BR_SP_BLEFAROPLASTIA` | `G26BLEF` | R$ 23/dia | Pesquisa; Maximizar cliques | `Lead qualificado GCLID — campanhas (personalizada)` | 1 grupo; 1 RSA; 11 palavras-chave qualificadas | Ativada; em 12/08 aparecia `Qualificada (limitada)`/limitada por orçamento | 13/08 17:47: 3 exatas adicionadas; alterações subsequentes na lista `NEG_FACE_SP_2026` podem afetar elegibilidade | Nenhum dia completo pós-mudança; evidência insuficiente |
| `S_BR_SP_LIFTING_CERVICAL` | `G26CERV` | **R$ 23/dia** | Pesquisa; Maximizar cliques | mesma meta personalizada | 2 grupos; 2 RSAs; 11 palavras-chave qualificadas | Ativada; `Qualificada (aprendizado)` na leitura de 12/08 | **13/08 18:50: orçamento R$ 12 → R$ 23**; 2 exatas adicionadas às 17:55 | Nenhum dia completo; evidência insuficiente |
| `S_BR_SP_OTOPLASTIA` | `G26OTO` | R$ 15/dia | Pesquisa; Maximizar cliques | mesma meta personalizada | 2 grupos; 2 RSAs; 21 palavras-chave qualificadas | Ativada; `Qualificada` | 13/08 18:09: 3 exatas adicionadas ao grupo `Adulto` | Nenhum dia completo; evidência insuficiente |
| `S_BR_SP_CIRURGIA_FACIAL` | `G26FACE` | R$ 8/dia | Pesquisa; Maximizar cliques | mesma meta personalizada | 1 grupo; 1 RSA; 6 palavras-chave qualificadas | Ativada; `Qualificada (limitada)`/limitada por orçamento | 11/08 18:35: lance de Maximizar conversões → Maximizar cliques; escopo da lista negativa alterada em 13/08 não confirmado | 12/08 é 1 dia limpo; 13/08 tem possível contaminação; evidência insuficiente |
| `S_BR_SP_LIFTING_FACIAL` | `G26LIFT` | R$ 24/dia | Pesquisa; **Maximizar conversões, sem CPA desejado visível** | mesma meta personalizada | 2 grupos; 2 RSAs; 27 palavras-chave qualificadas | Ativada; `Qualificada` | 13/08 17:52: 3 exatas adicionadas; em 11/08 o lance foi alterado e o CPA desejado retirado conforme histórico/norte | Nenhum dia completo pós-mudança; evidência insuficiente |
| `S_BR_SP_MARCA` | `G26MARCA` | R$ 5/dia | Pesquisa; Maximizar cliques | mesma meta personalizada | 1 grupo; 1 RSA; 3 palavras-chave qualificadas | Ativada; entrega muito baixa | 11/08 17:41: 1 RSA alterado | 12–13/08, somente 2 dias e praticamente sem entrega; evidência insuficiente |

**Orçamento diário total ao vivo:** R$ 98/dia. Isso equivale a aproximadamente R$ 2.940 em 30 dias, antes de variações de entrega.

**Divergência confirmada com a fonte canônica:** o norte registrava lifting cervical em R$ 12/dia e total implícito de R$ 87/dia. Em 13/08 às 18:50 uma recomendação aumentou lifting cervical para R$ 23/dia. A mudança adiciona até R$ 330 por 30 dias e ocorreu no mesmo dia da expansão de palavras-chave, sem uma janela causal limpa. O documento canônico não foi alterado, conforme o escopo somente leitura.

## 3. Snapshot diagnóstico de 12/08

O dia 12/08 é posterior às mudanças de lance de 11/08 e anterior às mudanças de palavras-chave/orçamento de 13/08. Ele é útil apenas como **snapshot intermediário de um dia**, não como avaliação da configuração atual.

| Campanha | Impressões | Cliques | CTR | Custo | CPC médio | Conversões | Observação |
|---|---:|---:|---:|---:|---:|---:|---|
| Blefaroplastia | 235 | 12 | 5,11% | R$ 16,76 | R$ 1,40 | 0,00 | limitada por orçamento; configuração já mudou em 13/08 |
| Lifting cervical | 218 | 11 | 5,05% | R$ 13,13 | R$ 1,19 | 0,00 | em aprendizado; orçamento atual é diferente |
| Lifting facial | 45 | 9 | 20,00% | R$ 22,94 | R$ 2,55 | 0,00 | único teste em Maximizar conversões; volume mínimo |
| Otoplastia | 127 | 8 | 6,30% | R$ 16,60 | R$ 2,07 | 0,00 | configuração já mudou em 13/08 |
| Cirurgia facial | 79 | 4 | 5,06% | R$ 8,06 | R$ 2,02 | 0,00 | limitada por orçamento |
| Marca | 0 | 0 | — | R$ 0,00 | — | 0,00 | ativa sem entrega no dia |
| **Total ativadas** | **704** | **44** | **6,25%** | **R$ 77,49** | **R$ 1,76** | **0,00** | amostra de 1 dia |

Em 13/08, durante a coleta, o total do dia era dinâmico e chegou a 725 impressões, 42 cliques, R$ 66,11 e 0 conversões. Quase todo o dia antecede as mudanças das 17:47–18:50; esse total não é desempenho pós-mudança e não foi usado para recomendar escala.

## 4. Conversões e sinal de lances

### Fatos ao vivo

- As seis campanhas exibiam a meta personalizada `Lead qualificado GCLID — campanhas (personalizada)`.
- `Lead qualificado GCLID`: origem `Site (Importar de cliques)`, **Principal**, contagem `Uma`, janela de clique 90 dias, incluída nas metas (`Sim`), status **Requer atenção**, 0,00 em `Todas as conv.` no dia 12/08.
- `Lead qualificado`: ação legada, `Inativo`, Secundário, não incluída nas metas, 0,00.
- `Clique no WhatsApp - proxy temporária`: ativa, Secundário, contagem `Uma`, janela 30 dias, não incluída nas metas, 0,00.
- Duas ações antigas de chamadas e uma de rota continuam como ações principais em categorias de conta, mas a tabela de campanhas ativa mostrou a meta personalizada qualificada; seu efeito exato fora das seis campanhas não foi analisado.

### Interpretação

**Fato:** o evento de negócio desejado está configurado como principal, mas requer atenção e não gerou conversão no snapshot.

**Inferência:** Maximizar conversões em lifting facial pode estar operando com sinal escasso ou degradado. A interface não mostrou erro detalhado suficiente para afirmar se a causa é upload, correspondência de click ID, atraso, falta de elegíveis ou outra falha.

**Conclusão:** não há base para CPA desejado, escala por conversão ou comparação de CPL qualificado até reconciliar `IMPORT_GOOGLE_ADS`/CRM com os uploads aceitos.

## 5. Mudanças materiais e contaminação

### 13/08 — configuração atual

- 17:47: 3 palavras-chave exatas adicionadas em blefaroplastia.
- 17:49–17:51: três palavras-chave negativas removidas da lista `NEG_FACE_SP_2026`; não foi possível confirmar ao vivo todas as campanhas anexadas à lista.
- 17:52: 3 exatas adicionadas em lifting facial.
- 17:55: 2 exatas adicionadas em lifting cervical.
- 18:06: preferências de quatro recomendações autoaplicadas de lance foram `atualizadas`; a direção final (ligada/desligada) não ficou exposta no detalhe lido e deve ser reconfirmada.
- 18:09: 3 exatas adicionadas em otoplastia/adulto.
- 18:50: recomendação aplicada aumentou lifting cervical de R$ 12 para R$ 23/dia.

### 11/08 — base do teste anterior

- Cirurgia facial: Maximizar conversões → Maximizar cliques às 18:35.
- Lifting cervical, blefaroplastia e lifting facial: campanhas alteradas entre 18:33 e 18:35; a configuração final ao vivo coincide com o norte (Maximizar cliques nas duas primeiras; Maximizar conversões sem tCPA em lifting facial).
- RSAs de lifting facial, marca e otoplastia foram alterados entre 17:39 e 17:43.

**Risco de causalidade alto:** orçamento, cobertura de palavras-chave, negativas e preferências automáticas mudaram no mesmo dia. Um recorte de 30/60/90 dias misturaria configurações incompatíveis.

## 6. Parecer por campanha

| Campanha | Parecer | Evidência | Confiança | Regra de avaliação |
|---|---|---|---|---|
| Blefaroplastia | **Corrigir/observar** | limitada por orçamento, mas keywords e negativas mudaram em 13/08; 0 conversões em 12/08 | Média para configuração; baixa para desempenho | não ampliar até 7 dias completos sem nova mudança e reconciliação de conversões |
| Lifting cervical | **Corrigir** | orçamento +91,7% após recomendação e exatas novas no mesmo dia; conversão requer atenção | Alta | validar autorização e intenção; se não houver justificativa escrita ou se gasto/termos piorarem, propor retorno a R$ 12 com aprovação |
| Otoplastia | **Manter em observação** | exatas novas em 13/08; 8 cliques/0 conv. no único dia intermediário | Média | revisar termos e CRM após 7 dias; nenhuma escala pela métrica de clique |
| Cirurgia facial | **Manter em observação** | Max cliques desde 11/08, limitada; apenas 4 cliques em 12/08 | Média | avaliar perda por orçamento somente depois de validar intenção e qualificação |
| Lifting facial | **Corrigir/validar teste** | Max conversões usando ação `Requer atenção`; 9 cliques/0 conv. em 12/08 | Alta para risco, baixa para resultado | manter o teste apenas se upload voltar a saudável e não houver supressão relevante de tráfego; não definir tCPA |
| Marca | **Manter** | ativa, quase sem entrega; 0 impressões em 12/08 e 3 em recorte de 13/08 observado | Média | monitorar cobertura de marca; não aumentar orçamento por ausência de volume |

## 7. Achados prioritários

1. **Gasto e automação mudaram sem uma janela limpa (severidade alta, confiança alta).** O total ao vivo subiu para R$ 98/dia após aumento de cervical, divergindo do norte.
2. **O sinal de negócio está degradado (crítica, alta).** `Lead qualificado GCLID` orienta a meta, é principal e requer atenção.
3. **Recomendação automática foi aplicada (alta, alta).** O aumento de cervical foi registrado como recomendação aplicada, apesar da política estratégica de julgar recomendações pelo lead qualificado/consulta.
4. **A cobertura de busca mudou em quatro campanhas no mesmo dia (alta, alta).** Não é válido comparar 30 dias com a configuração atual.
5. **Limitação por orçamento não prova oportunidade econômica (média, alta).** Blefaroplastia e cirurgia facial estavam limitadas, mas não havia conversões qualificadas no snapshot.

## 8. Recomendações rastreáveis

### GAD-01 — restaurar a confiabilidade da conversão qualificada

- **Problema:** ação principal `Lead qualificado GCLID` em `Requer atenção`.
- **Mudança proposta:** auditar diagnóstico/upload, comparar eventos elegíveis do `IMPORT_GOOGLE_ADS` com aceitos/rejeitados e confirmar deduplicação e click IDs; nenhuma informação pessoal ou clínica deve ser enviada.
- **Impacto esperado:** recuperar o único sinal de qualidade utilizado pelas campanhas.
- **Confiança/urgência/esforço:** alta/crítica/médio.
- **Métrica principal:** eventos elegíveis, enviados, aceitos e rejeitados por dia; taxa de correspondência.
- **Guardrails:** zero duplicação por oportunidade; zero PII/PHI; proxy de WhatsApp permanece secundária.
- **Duração/revisão:** diagnóstico em 48 h; revisar novamente após 7 dias de importação saudável.
- **Manter/ampliar/reverter:** manter se CRM e Ads reconciliarem; só usar para Smart Bidding com volume estável; reverter qualquer automação nova se o status piorar ou houver divergência.
- **Responsável/aprovação:** Daniel + responsável técnico; não requer mudança de mídia para diagnosticar, mas qualquer alteração de meta requer aprovação expressa.

**Atualização pós-auditoria — 14/08/2026:** a reconciliação técnica de `GAD-01` + `DAT-08` foi aplicada com backup, trava e pós-voo. `IMPORT_GOOGLE_ADS`, ledger e linhas visíveis fecharam em 5/5, com nome canônico único, exatamente um click ID por evento e zero PII/PHI. A conexão `LEADS` manteve cinco campos mapeados; a execução automática anterior e a importação manual após o reparo registraram 5 linhas e 0 erros. A ação ainda aparece como `Requer atenção`, portanto o diagnóstico de 48 horas e o gate de sete dias permanecem; não houve mudança de meta, campanha, lance ou orçamento.

### GAD-02 — congelar novas mudanças materiais e iniciar nova janela

- **Problema:** palavras-chave, negativas e orçamento mudaram em poucas horas.
- **Mudança proposta:** não aplicar novas recomendações, lances, orçamento ou grandes mudanças criativas até pelo menos 20/08, salvo gasto anormal/erro; registrar a configuração atual como baseline.
- **Impacto esperado:** preservar causalidade.
- **Confiança/urgência/esforço:** alta/alta/baixo.
- **Métrica:** gasto, termos de alta intenção, cliques válidos, contatos/qualificados por campanha.
- **Guardrail:** alerta diário de gasto; revisão técnica em 48 h; não esperar se houver tráfego evidentemente incompatível.
- **Regra:** decisão preliminar após 7 dias completos; decisão estratégica em 14 dias ou ao atingir volume útil.
- **Responsável/aprovação:** gestão de mídia; aprovação necessária para qualquer exceção.

### GAD-03 — revisar o aumento de lifting cervical

- **Problema:** R$ 12 → R$ 23/dia (+91,7%) via recomendação, sem evidência qualificada e junto de novas keywords.
- **Mudança proposta:** bloquear novo aumento; confirmar quem aprovou e qual dado sustentou. Propor retorno a R$ 12/dia se a mudança não tiver aprovação estratégica documentada ou se gasto/qualidade falharem.
- **Impacto esperado:** limitar desperdício e alinhar governança.
- **Confiança/urgência/esforço:** alta/alta/baixo.
- **Métrica/guardrail:** custo por contato válido/qualificado; gasto diário; termos incompatíveis.
- **Duração:** checagem imediata; 7 dias para observação se a mudança for deliberadamente mantida.
- **Manter:** somente com demanda de alta intenção e qualidade estável; **ampliar:** não antes de mensuração confiável; **reverter:** sem aprovação, gasto anormal ou piora de qualidade.
- **Responsável/aprovação:** Daniel e Dra. Amanda; alteração exige atualizar norte e histórico no trabalho de implementação.

### GAD-04 — validar preferências de autoaplicação

- **Problema:** quatro preferências de recomendações de lance foram `atualizadas` em 13/08; a direção final não ficou visível.
- **Mudança proposta:** confirmar ao vivo que migração para Maximizar conversões/valor, definição de tCPA e ajuste de tCPA estão desativadas; não aplicar o cartão `+5%`.
- **Confiança/urgência/esforço:** alta/alta/baixo.
- **Guardrail:** nenhuma autoaplicação de orçamento/lance sem log e aprovação.
- **Responsável/aprovação:** gestor da conta; qualquer mudança exige aprovação.

### GAD-05 — condicionar o teste de Maximizar conversões em lifting facial

- **Problema:** lance usa uma ação principal com alerta e volume zero no snapshot.
- **Mudança proposta:** manter apenas como teste controlado enquanto se corrige GAD-01; não adicionar tCPA.
- **Métrica:** tráfego, lead qualificado aceito e custo por qualificado.
- **Guardrail:** reverter a Maximizar cliques se o volume cair sem ganho de qualidade ou se a importação continuar inconsistente.
- **Duração:** até 25/08, conforme revisão canônica, ou antes em caso de supressão/gasto anormal.
- **Confiança/urgência/esforço:** média/alta/baixo.
- **Responsável/aprovação:** gestão de mídia + Daniel/Dra. Amanda.

## 9. Limitações

### Campos obrigatórios do follow-up ao vivo

| Campanha ativa | URL final | Localização | Idiomas | Programação | Termos de pesquisa atuais | Negativas atuais |
|---|---|---|---|---|---|---|
| `S_BR_SP_BLEFAROPLASTIA` | N/D* | N/D* | N/D* | N/D* | N/D* | N/D* |
| `S_BR_SP_LIFTING_CERVICAL` | N/D* | N/D* | N/D* | N/D* | N/D* | N/D* |
| `S_BR_SP_OTOPLASTIA` | N/D* | N/D* | N/D* | N/D* | N/D* | N/D* |
| `S_BR_SP_CIRURGIA_FACIAL` | N/D* | N/D* | N/D* | N/D* | N/D* | N/D* |
| `S_BR_SP_LIFTING_FACIAL` | N/D* | N/D* | N/D* | N/D* | N/D* | N/D* |
| `S_BR_SP_MARCA` | N/D* | N/D* | N/D* | N/D* | N/D* | N/D* |

\* **Motivo comum e verificável:** a sessão autenticada continuou presente, porém a aba disponível estava em vínculos GA4. Ao tentar abrir/ler Campanhas, o Google Ads não entregou o DOM em duas tentativas de mais de 30 s e a conexão de controle foi reiniciada. Sem a superfície correspondente carregada, esses campos não podem ser confirmados; nomes de campanha, nomes de grupo ou o norte não foram usados como substitutos factuais. Termos e negativas, portanto, **não sustentam nenhum cálculo ou recomendação deste relatório**.

- IDs numéricos de campanha não foram expostos pela camada DOM; o inventário usa os códigos estáveis verificáveis. Obter IDs exigiria exportação/API adicional, não necessária para confirmar escopo ativo.
- URLs finais, programação, localização, idiomas, termos e negativas por campanha permanecem N/D pelo bloqueio detalhado acima; não são assumidos como corretos.
- O histórico informa que relatórios não são em tempo real; mudanças muito recentes podem aparecer com atraso.
- A lista `NEG_FACE_SP_2026` foi alterada, mas a interface lida não mostrou todas as campanhas anexadas.
- Um único dia não sustenta comparação de desempenho; números de 12/08 são diagnósticos.

## 10. Ações que não devem ser executadas agora

- Não aumentar orçamento por `Limitada pelo orçamento` sem qualidade/consulta reconciliada.
- Não aplicar `+5%`, tCPA, Performance Max ou outra recomendação automática.
- Não julgar as novas palavras-chave com dados anteriores a 13/08.
- Não usar clique no WhatsApp como substituto do lead qualificado.
- Não reverter nem manter definitivamente o aumento de cervical sem decisão explícita e registro estratégico.
