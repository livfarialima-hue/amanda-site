# Meta Ads — campanhas ativas

**Auditoria somente leitura:** nenhuma campanha, conjunto, anúncio, público, orçamento, evento, rascunho ou recomendação foi alterado. O rascunho pendente visto na conta não foi descartado nem publicado.

**Coleta ao vivo:** 13 de agosto de 2026, aproximadamente 22:22–22:42, com follow-up detalhado de campanha, conjunto, anúncio e Eventos em torno de 23:25–23:47, horário de Brasília.

**Conta:** Dra Amanda Schroeder, conta de anúncios `1643959806249995`, Business `1308068619887667`.

**Conclusão principal:** duas campanhas estavam ativas, cada uma com um conjunto ativo e dois anúncios ativos. Elas têm objetivos nominais e resultados incompatíveis para comparação direta: Site é `Tráfego` e otimiza visualização de página de destino; WhatsApp é `Leads` e otimiza conversa iniciada. O Meta reporta entrega eficiente no objetivo de plataforma, mas não há evidência nesta fonte de lead qualificado, consulta ou cirurgia. O Pixel do site envia `PageView` pelo navegador, porém há um diagnóstico ativo de bloqueio de alguns dados do site e nenhuma integração CAPI foi exibida. As duas campanhas terminam em 16/08; escalar ou estender sem reconciliação criaria uma nova configuração material.

## 1. Fontes e filtros

| Fonte ao vivo | URL | Período/filtro | Coleta | Confiança/limitação |
|---|---|---|---|---|
| Campanhas/conjuntos/anúncios | `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1643959806249995&business_id=1308068619887667` | filtro pelos conjuntos `120250448487430627` e `120250426987660627`; status conferido por switches e `Ativo` | 13/08, 22:22–22:42 BRT | Alta para status, estrutura, IDs, orçamento, atribuição e métricas exibidas |
| Janela Site | mesma conta, parâmetro de data equivalente a 24/07–12/08 | somente entidades ativas; após última edição material de 23/07 | 13/08 | Alta para plataforma; resultado é LPV, não negócio |
| Janela WhatsApp | mesma conta, parâmetro de data equivalente a 28/07–12/08 | somente entidades ativas; após edições de 27/07 | 13/08 | Alta para plataforma; conversas podem incluir modelagem e não equivalem a pessoas/qualificados |
| Histórico de atividade | painel `Ver histórico` da campanha selecionada | todas as mudanças, 16/07–13/08 | 13/08 | Alta; alterações de anúncio são registradas sem mostrar o campo exato alterado |
| Editor de campanha/conjunto/anúncio | `https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?act=1643959806249995&business_id=1308068619887667` | somente as duas campanhas, dois conjuntos e quatro anúncios ativos | 13/08, follow-up | Alta para objetivo nominal, conversão, público visível, agenda, destino WA e mensagens predefinidas; seleção individual de posicionamentos não ficou integralmente exposta |
| Gerenciador de Eventos — visão geral | `https://eventsmanager.facebook.com/events_manager2/?business_id=1308068619887667&act=1643959806249995&nav_source=ads_ecosystem_nav` | conjuntos de dados da conta; últimos 28 dias | 13/08, follow-up | Alta para integrações e totais exibidos |
| Gerenciador de Eventos — diagnóstico do conjunto ativo | `https://eventsmanager.facebook.com/events_manager2/list/dataset/1501288525098716/diagnostics?business_id=1308068619887667&act=1643959806249995` | conjunto `site da amanda`; diagnóstico ativo | 13/08, follow-up | Alta para Pixel, evento, diagnóstico e domínio afetado; payload, deduplicação e cobertura CAPI não foram abertos |

**Timezone:** os dois editores de conjunto exibiram explicitamente `GMT-3` ao lado das datas/horas de início e término. Esse é o fuso operacional confirmado da programação. O campo cadastral de timezone da conta não foi aberto separadamente e permanece N/D.

## 2. Inventário fechado

| Campanha | ID | Status | Objetivo/otimização | Orçamento e agenda | Conjunto ativo | Anúncios ativos | Atribuição | Última mudança material | Janela comparável | Destino |
|---|---:|---|---|---|---|---|---|---|---|---|
| `M26F02S | Facial SP | Site | 30 dias` | `120250448487420627` | Ativa, com entrega | `Tráfego`; local `Site`; maximizar LPV; `Volume mais alto` | R$ 600 total; 16/07–16/08; anúncios o tempo todo; editor `GMT-3` | `M26F02S | SP 20km | 40+ | SITE` (`120250448487430627`) | `C06H01 Lifting facial` (`120250469786500627`); `C01H01 Como funciona a avaliação` (`120250448487440627`) | clique 7 dias ou visualização 1 dia; `Todas as conversões` | C06 alterado em 23/07 18:39 e voltou a Ativo 18:42 | **24/07–12/08** | `https://draamandaschroeder.com.br/avaliacao-facial/` com `origem=M26F02S`, UTMs Meta e `utm_content` por criativo |
| `M26F01W | Facial SP | WhatsApp | 30 dias` | `120250426987670627` | Ativa, com entrega | `Leads`; local `WhatsApp`; maximizar conversas; `Volume mais alto` | R$ 600 total; 16/07–16/08; anúncios o tempo todo; editor `GMT-3` | `M26F01W | SP 20km | 40+ | WA` (`120250426987660627`) | `C01H01 Como funciona a avaliação WA` (`120250469052940627`); `C06H01 Lifting` (`120250446134900627`) | clique 7 dias ou visualização 1 dia; `Todas as conversões` | ambos os anúncios alterados em 27/07; última alteração 20:55 e aprovação 20:57 | **28/07–12/08** | WhatsApp Business direto; número conectado confirmado ao vivo e omitido deste artefato por privacidade |

### 2.1 Configurações detalhadas confirmadas

| Campo | Site (`M26F02S`) | WhatsApp (`M26F01W`) |
|---|---|---|
| Público | `Advantage+` ativado; controle de localização `Brasil: São Paulo (+20 km), São Paulo (state)`; sugestões de idade `40–65+`, todos os gêneros e direcionamento amplo (`todos os dados demográficos, interesses e comportamentos`) | mesma configuração visível: `Advantage+` ativado; São Paulo +20 km; sugestão 40–65+; todos os gêneros; direcionamento amplo |
| Exclusões de público | N/D: o editor não apresentou uma lista explícita de públicos excluídos; campo vazio de inclusão não prova ausência de exclusão | N/D pelo mesmo motivo |
| Posicionamentos | `Advantage+` desativado / seleção manual; todos os dispositivos; o seletor exibiu Facebook, Instagram, Audience Network, Messenger e Threads, além das categorias Feeds, Stories/Reels, Reels in-stream, Pesquisa e Apps/sites. O estado de cada opção individual não foi extraído. `Posicionamentos excluídos: Nenhum` | `Advantage+` desativado; a recomendação indicou menos de seis posicionamentos. A lista individual selecionada não foi renderizada no recorte. `Posicionamentos excluídos: Nenhum` |
| Agenda | campanha: `Veicular anúncios o tempo todo`; conjunto exibido em `GMT-3` | campanha: `Veicular anúncios o tempo todo`; conjunto exibido em `GMT-3` |
| Destino | Site e URL/UTMs descritas no inventário | WhatsApp Business conectado; o identificador telefônico foi deliberadamente omitido |
| Experiência de mensagem | não se aplica | ambos usam boas-vindas `Oi! Como podemos ajudar?`; C01 preenche `Olá! Quero saber da avaliação facial com a Dra. Amanda. Ref. M26F01W-C01H01`; C06 preenche `Olá! Quero saber sobre lifting facial com a Dra. Amanda. Ref. M26F01W-C06H01` |

**Estado de publicação:** a conta mostrava `Conferir e publicar (1)` e `Descartar rascunhos`. Isso prova a existência de um rascunho não publicado, não o seu conteúdo. O rascunho pode contaminar uma futura publicação em lote; deve ser revisado por um humano antes de qualquer publicação.

## 3. Métricas comparáveis pós-mudança

### 3.1 Site — 24/07 a 12/08

| Métrica | Valor | Definição/observação |
|---|---:|---|
| Gasto | R$ 396,51 | gasto Meta no período |
| Alcance | 19.846 | contas alcançadas |
| Impressões | 31.328 | entrega |
| Frequência | 1,58 | baixa no agregado; sem sinal forte de fadiga |
| CPM | R$ 12,66 | diagnóstico de entrega |
| Cliques no link | 1.639 | plataforma |
| CTR de link | **5,23% calculado** | 1.639 / 31.328; a interface mostrou contagens, cálculo local |
| CPC de link | R$ 0,24 | plataforma |
| Visualizações de página de destino | 1.290 | evento otimizado |
| LPV / clique no link | **78,7% calculado** | 1.290 / 1.639; perda de 21,3% entre clique e LPV |
| Custo por LPV | R$ 0,31 | resultado da campanha |

**Fato:** a campanha entrega tráfego barato e 78,7% dos cliques viram LPV reportada.

**Limitação:** LPV não é contato, pessoa, oportunidade, qualificado ou consulta. Sem junção com CRM, não há base para escalar.

### 3.2 WhatsApp — 28/07 a 12/08

| Métrica | Valor | Definição/observação |
|---|---:|---|
| Gasto | R$ 326,13 | gasto Meta no período |
| Alcance | 2.173 | contas alcançadas |
| Impressões | 4.118 | entrega |
| Frequência | 1,90 | sem fadiga agregada evidente |
| CPM | R$ 79,20 | 6,3x o CPM do Site; objetivos diferentes, não comparar custo final diretamente |
| Cliques no link | 60 | plataforma |
| CTR de link | **1,46% calculado** | 60 / 4.118 |
| CPC de link | R$ 5,44 | plataforma |
| Conversas por mensagem iniciadas | 48 | resultado Meta; inclui aviso de possível modelagem estatística |
| Custo por conversa | R$ 6,79 | não é CPL qualificado |
| Cliques (todos) | 208 | CTR todos 5,05%; CPC todos R$ 1,57 |

**Fato:** a Meta atribuiu 48 conversas a R$ 6,79 cada na janela pós-edição.

**Inferência:** a distância entre 60 cliques de link e 48 conversas reportadas é plausível, mas não prova 48 pessoas distintas; modelagem, janela de atribuição, contatos repetidos e definições podem explicar diferenças.

**Conclusão:** o custo por conversa não pode orientar orçamento sem reconciliar conversa → contato identificado → oportunidade → qualificado → consulta.

## 4. Criativos ativos

### Site — comparável 24/07–12/08

| Criativo | Gasto | CTR link | CPC link | Cliques todos | CTR todos | CPC todos | Leitura |
|---|---:|---:|---:|---:|---:|---:|---|
| `C01H01 Como funciona a avaliação SITE` | R$ 304,62 | 5,41% | R$ 0,22 | 1.648 | 6,58% | R$ 0,18 | melhor eficiência de tráfego entre os dois ativos |
| `C06H01 Lifting facial SITE` | R$ 91,89 | 4,53% | R$ 0,32 | 357 | 5,68% | R$ 0,26 | menor entrega e pior eficiência de clique; resultado comercial não reconciliado |

**Interpretação:** C01 é o vencedor de mídia para tráfego, mas ainda não é um vencedor de negócio. Sem qualificação/consulta por `utm_content`, não há justificativa para desligar C06 ou concentrar verba.

### WhatsApp — evidência insuficiente por criativo

O único recorte por anúncio disponível cruzava as edições de 27/07 e foi excluído da análise. A janela limpa de 28/07–12/08 foi confirmada apenas no agregado da campanha, não separadamente para `C01H01` e `C06H01`. Portanto, **não há ranking, benchmark nem hipótese de vencedor sustentada por desempenho atual por anúncio**. A validação necessária é um recorte limpo dentro do mesmo objetivo e destino, reconciliado com qualificados e consultas.

## 5. Histórico e comparabilidade

### Site

- Campanha/conjunto criados em 16/07; campanha ativada em 17/07.
- Otimização definida como LPV e lance de maior volume na criação.
- Anúncios sofreram edições em 18/07; C06 teve nova alteração em 23/07 às 18:39.
- Janela adotada: 24/07–12/08.

### WhatsApp

- Campanha ativada em 18/07.
- Várias edições ocorreram em 18/07 e 23/07.
- Ambos os anúncios foram alterados duas vezes em 27/07; última mudança 20:55, aprovação 20:57.
- Janela adotada: 28/07–12/08.

### Exclusões

- Nenhuma campanha inativa foi usada em cálculo, benchmark, criativo ou recomendação.
- Nenhum número, ranking ou hipótese por criativo WhatsApp do recorte que cruza 27/07 é reproduzido ou utilizado; o único agregado usado para WhatsApp é 28/07–12/08.

## 6. Tracking, atribuição e qualidade

### Confirmado

- UTM e código `M26F02S` estavam presentes no destino Site observado.
- Atribuição dos conjuntos: clique 7 dias ou visualização 1 dia.
- Meta mostra `Todas as conversões` e aviso de possível modelagem estatística.
- O conjunto de dados `site da amanda` (`1501288525098716`) estava integrado por `Meta Pixel`; a visão geral mostrou 910 eventos nos últimos 28 dias.
- No detalhe de 16/07–12/08, `PageView` aparecia `Ativo`, integração `Navegador`, com 873 eventos e último recebimento há cerca de uma hora.
- A configuração do Pixel estava em 50%; a visão geral da conta exibiu uma tarefa de configuração da API de Conversões em 0%. Nenhuma integração CAPI apareceu na lista lida, portanto CAPI é **não evidenciada**, não presumida.
- Havia um diagnóstico ativo: `Alguns dados do site foram bloqueados`, associado a possível conteúdo/relacionamento de saúde e com impacto declarado pela Meta na otimização por eventos dos sites afetados; `draamandaschroeder.com.br` estava na lista exibida.

### Não confirmado nesta fonte

- Vinculação nominal do conjunto de dados aos dois anúncios/conjuntos ativos, cobertura de servidor, `event_id`, deduplicação e conteúdo dos payloads.
- Correspondência de `fbclid`/identificadores Meta com oportunidade no CRM.
- Pessoas únicas versus conversas reportadas.
- Lead válido, lead qualificado, agendamento, comparecimento e cirurgia por campanha/anúncio.
- Ausência de dados sensíveis nos payloads.

**Parecer para decisão de mídia:** métricas de entrega são confiáveis para diagnóstico; métricas de negócio são **não confiáveis/indisponíveis** até reconciliação com LEADS.

## 7. Parecer por campanha

| Campanha | Parecer | Evidência | Confiança | Regra |
|---|---|---|---|---|
| Site | **Manter sem escalar; corrigir mensuração de negócio** | 1.290 LPVs a R$ 0,31, mas zero prova de qualidade/consulta nesta fonte | Alta para mídia; baixa para negócio | estender/renovar somente com CRM por campanha e capacidade operacional |
| WhatsApp | **Manter em observação; não tratar conversa como lead** | 48 conversas a R$ 6,79, com modelagem possível e sem pessoas/qualificação | Alta para plataforma; baixa para negócio | manter se contato válido/qualificado se confirmar; reduzir/parar se houver discrepância ou baixa intenção |

## 8. Recomendações rastreáveis

### MAD-01 — reconciliar Meta → CRM antes de qualquer escala

- **Problema:** resultados são LPV/conversa, não resultados clínicos/comerciais.
- **Mudança proposta:** agregar por campanha, conjunto e `utm_content`: conversas reportadas, contatos identificados, oportunidades, qualificados, consultas solicitadas/agendadas/realizadas.
- **Impacto esperado:** transformar custo de plataforma em custo por etapa real.
- **Confiança/urgência/esforço:** alta/crítica/médio.
- **Métrica:** taxa conversa→pessoa→oportunidade→qualificado→consulta.
- **Guardrails:** sem nomes, telefones, e-mails, conversas ou dados clínicos no relatório/evento; deduplicar pessoas e oportunidades.
- **Duração:** reconciliar 28/07–12/08 em até 48 h; revisar semanalmente.
- **Manter/ampliar/reverter:** manter se diferenças forem explicadas; ampliar só com CPL qualificado/consulta aceitável; interromper escala se correspondência for baixa.
- **Responsável/aprovação:** dados/CRM + mídia; implementação externa requer aprovação.

**Checkpoint pós-auditoria — 14/08/2026:** o defeito técnico observável foi corrigido sem alterar campanha, orçamento, público, criativo ou landing. Os 6 CTAs testados preservaram `M26F02S-C01H01-avaliacao-facial`; os novos eventos registram categoria e motivo de fallback; a sonda ao vivo concluiu com HTTP 200 e contrato de atribuição aprovado. `MAD-01` permanece parcialmente aberto até formar a coorte real clique → contato → oportunidade → qualificado → consulta; LPV histórico continua sendo proxy, não lead.

### MAD-02 — decidir o encerramento de 16/08 sem contaminar o teste

- **Problema:** as duas campanhas têm término em 16/08 e orçamento total quase consumido.
- **Mudança proposta:** antes de estender, fechar reconciliação mínima e capacidade; se a decisão for continuar, registrar extensão como nova mudança material e não alterar também objetivo, público ou criativo no mesmo dia.
- **Impacto:** evita renovação automática de tráfego sem qualidade comprovada.
- **Confiança/urgência/esforço:** alta/alta/baixo.
- **Métrica/guardrail:** qualificados e consultas; teto diário/total; tempo de resposta humano.
- **Regra:** manter somente com qualidade aceitável ou como verba explícita de aprendizado; ampliar após uma janela estável; encerrar se não houver rastreabilidade.
- **Responsável/aprovação:** Daniel e Dra. Amanda.

### MAD-03 — testar continuidade de intenção, não apenas hook

- **Problema:** C01 vence tráfego Site, mas não existe recorte WhatsApp limpo por anúncio; objetivos e destinos impedem comparação cruzada.
- **Mudança proposta:** após reconciliação, comparar `C01` e `C06` dentro do mesmo objetivo e destino, uma mudança por vez; preservar `utm_content`.
- **Hipótese:** mensagens específica e educativa podem atrair intenções diferentes; a direção e o tamanho do efeito ainda são desconhecidos.
- **Métrica:** custo por qualificado e consulta solicitada; CTR/LPV apenas diagnóstico.
- **Guardrail:** não concentrar verba com base em conversa/LPV; frequência <3 e qualidade estável.
- **Duração:** 7–14 dias ou amostra mínima pré-definida.
- **Confiança/urgência/esforço:** média/média/médio.
- **Responsável/aprovação:** mídia + operação; requer aprovação.

### MAD-04 — auditar Pixel/CAPI e deduplicação

- **Problema:** o Pixel envia apenas o evento visível `PageView` pelo navegador, o setup aparece 50% completo, CAPI não foi evidenciada e há um diagnóstico ativo de bloqueio de alguns dados do domínio por possível contexto de saúde.
- **Mudança proposta:** antes de ampliar tracking, revisar a categoria/restrição, testar somente eventos permitidos, documentar cobertura, `event_id`, duplicatas, UTMs e payloads e confirmar a base de privacidade; nunca enviar PHI/PII, conteúdo de conversa ou procedimento ligado a identificador.
- **Métrica:** cobertura de evento, deduplicação, diferença Meta↔site↔CRM.
- **Guardrail:** consentimento correto e nenhum conteúdo de conversa/procedimento associado a identificador pessoal.
- **Duração:** diagnóstico técnico em 48 h.
- **Confiança/urgência/esforço:** alta/crítica/médio.

### MAD-05 — revisar o rascunho pendente antes de publicar

- **Problema:** `Conferir e publicar (1)` estava presente.
- **Mudança proposta:** revisão humana do conteúdo e escopo; publicar ou descartar somente em trabalho autorizado.
- **Guardrail:** não permitir publicação em lote junto de uma extensão/orçamento sem saber o que o rascunho contém.
- **Confiança/urgência/esforço:** alta/alta/baixo.

## 9. Limitações

- Objetivos nominais, locais de conversão, público visível, posicionamentos em alto nível, agenda `GMT-3`, destino WhatsApp e mensagens predefinidas foram confirmados no editor das entidades ativas.
- Exclusões de público e a seleção individual completa de posicionamentos permaneceram N/D porque o editor não apresentou esses estados de forma verificável; a ausência de exclusão de posicionamento, sim, foi explícita.
- O fuso da programação foi confirmado como `GMT-3`; o campo cadastral de timezone da conta não foi aberto separadamente.
- Pixel, evento visível e diagnóstico foram acessados; Test Events, payloads, `event_id`, deduplicação, cobertura real CAPI e CRM não foram inspecionados.
- Rankings de criativo WhatsApp na janela limpa pós-27/07 não foram extraídos separadamente; **não existe vencedor WA sustentado neste relatório**.

## 10. Ações que não devem ser executadas agora

- Não publicar o rascunho, aplicar recomendações ou alterar orçamento durante a auditoria.
- Não comparar custo por LPV com custo por conversa como se fossem o mesmo objetivo.
- Não chamar conversa reportada de lead qualificado.
- Não estender as campanhas e trocar criativo/objetivo simultaneamente.
- Não enviar PII/PHI ao Pixel, CAPI ou conversões avançadas.

## Atualização ao vivo — 14/08/2026

- O Gerenciador mostrou um rascunho em `Conferir e publicar (1)`. A revisão identifica alterações de nome, posicionamento e público em um conjunto de anúncios. Como a autoria não foi comprovada, o rascunho não foi publicado nem descartado.
- A interface atual exibiu uma campanha de otoplastia infantil/WhatsApp ativa e o total “Resultados de 5 campanhas”. A tabela virtualizada não expôs todas as linhas de forma confiável no checkpoint; por isso o inventário de 13/08 deve ser tratado como snapshot histórico, não como prova do estado atual completo.
- Não houve mudança de orçamento, criativo, público, posicionamento, objetivo ou veiculação nesta atualização.
