# Plano executivo — auditorias, pendências e prazos

**Status:** fonte canônica executiva para decidir o que fazer, quando executar e quando publicar

**Atualizado em:** 16 de agosto de 2026, 23:54, America/Sao_Paulo

**Escopo:** auditoria Google Ads de 14/08/2026 e auditoria SEO, IA e atribuição de 15/08/2026

**Projeção de leitura no Drive:** [00 — PLANO EXECUTIVO — pendências, prazos e publicações.md](https://drive.google.com/file/d/18iUqY6HttJwPusSAA1VGmrMqqRluyjTO/view)

## 1. Como usar este arquivo

Este arquivo existe para que Daniel e Amanda não precisem interpretar matrizes técnicas, commits, flags ou relatórios extensos.

Quando chegar uma data, basta pedir:

> Execute a próxima etapa vencida do Plano Executivo de Auditorias. Confirme os gates ao vivo, faça somente o que estiver maduro, atualize o plano local, o mesmo arquivo no Drive e os lembretes. Não publique sem minha autorização explícita.

O responsável técnico deve:

1. verificar o estado ao vivo antes de agir;
2. executar apenas a etapa madura;
3. pedir autorização quando houver publicação, migração, gasto ou escrita externa relevante;
4. atualizar este plano no mesmo trabalho;
5. reagendar janelas dependentes quando a data real mudar;
6. não exigir que Daniel interprete os 59 itens da matriz.

## 2. Legenda simples

| Estado | Significado para vocês |
|---|---|
| `CONCLUÍDO` | já foi executado e verificado; não repetir |
| `ATIVO` | rotina recorrente publicada, testada e em execução; acompanhar resultados |
| `AGENDADO` | existe data, mas só será executado se os gates estiverem verdes |
| `AGUARDAR DADOS` | mexer antes contaminaria a análise ou produziria decisão insegura |
| `DEPENDE DE VOCÊS` | precisa de documento, parecer ou autorização humana |
| `BLOQUEADO` | não executar até resolver a dependência indicada |
| `NÃO ALTERAR` | decisão consciente de manter como está |

## 3. Situação atual em linguagem direta

### Auditoria 1 — Google Ads

**Estado geral:** correções imediatas concluídas; experimentos e provas futuras estão programados.

Já foi feito:

- importação insegura pausada e eventos legados colocados em quarentena;
- IDs opacos, códigos canônicos, URLs e orçamento corrigidos;
- orçamento total retornado a R$ 87/dia e lifting cervical a R$ 12/dia;
- negativas de preço genéricas perigosas foram evitadas;
- nenhuma campanha nova, Performance Max, ampla, tCPA ou aumento foi aplicado;
- testes de anúncios foram colocados em sequência para não misturar efeitos.
- rotina somente leitura de revisão do Google Ads publicada como script `12117745`, autorizada, testada sem mudanças e com programação diária `09:00–10:00` ativa;
- agregado anônimo do funil publicado pelo Apps Script versão `92`, com trigger diário aproximadamente às `08:15` e sem PII.

Ainda falta:

- provar a conversão offline e a jornada anúncio → site → WhatsApp → LEADS/CRM;
- confirmar ao vivo e, se ainda ausentes, aplicar as três negativas exatas de roteamento do grupo geral de lifting;
- normalizar novos contatos com códigos G26 canônicos: no primeiro agregado, os 16 contatos Google de 30 dias permaneceram em campanha desconhecida por usarem referências antigas/ambíguas; não reinterpretar o histórico por inferência;
- manter Meta facial em 40+ e, no gate de 20/08, decidir se o Google deve excluir apenas `18–24` e `25–34` nas campanhas faciais não otoplastia; preservar sempre a idade `Desconhecida`;
- executar os testes de RSA um por vez;
- medir desempenho mobile/vídeos antes de otimizar;
- obter decisão Codame/jurídica sobre galerias, imagens e consentimentos.

### Rotina recorrente — Meta Ads

**Estado geral:** `ATIVO` desde 16/08. O código somente leitura está na produção canônica v94, o agregado anônimo e o acesso à API foram testados ao vivo e existe um único trigger diário para cada função. Todo e-mail enviado agora inclui métricas essenciais de 7 e 30 dias; a análise detalhada permanece semanal. A rotina não substitui o gate de atribuição de `M26F02S` nem autoriza qualquer mudança automática na Meta.

Escopo aprovado:

- agregado `Meta_Agregados` no mesmo arquivo anônimo de mídia, sem criar uma planilha redundante;
- alerta diário de saúde aproximadamente às 10:05;
- revisão completa toda terça-feira, com 7/30 dias e comparação com os sete dias anteriores;
- leitura de 90 dias no segundo dia útil do mês;
- campanha, conjunto, anúncio, criativo/vídeo, demografia, posicionamento, destino e funil;
- filas `Corrigir agora`, `Pode testar`, `Aguardar dados` e `Não alterar`;
- zero mutação automática e zero PII.

Correção etária de 16/08:

- o alerta estava correto: `M26F01W` e `M26F02S` tinham `age_min=25`; o `40–65+` era sugestão expansível;
- `M26F02S` foi publicado com limite rígido `40–65+`;
- `M26F01W` continua bloqueado em 25 porque a republicação passou a exigir Conta do WhatsApp Business e orçamento mínimo R$ 600,18. Nenhuma migração nem aumento foi feito; o rascunho foi descartado;
- resolver esse gate antes de qualquer extensão, reativação ou nova edição do conjunto WhatsApp.

Gate de ativação concluído em 16/08:

- Apps Script canônico na versão 94;
- `publicarAgregadosFunilMetaAds` executado às 08:27 BRT, com 0% de erro no painel de triggers;
- token permanente de usuário do sistema, limitado a `ads_read`, guardado somente nas propriedades do projeto;
- Graph API fixada em `v26.0` e conta `1643959806249995` validada às 12:06;
- teste real concluído às 12:20 e entregue por e-mail com duas sinalizações críticas e garantia de zero mutação;
- um único trigger `executarRevisaoMetaAds` criado às 12:23, além do único trigger do agregado.

Decisão de encerramento e próximo ciclo — 16/08:

- o fechamento de 30 dias confirmou que `M26F01W` é a única rota com resultado de negócio rastreável: 67 contatos, 12 qualificados ou posteriores e 2 agendados ou posteriores, com gasto de R$ 598,45;
- `C06H01` — Lifting concentrou 85 das 86 conversas do WhatsApp, a R$ 6,65 por conversa; `C01H01` — Avaliação teve 1 conversa a R$ 32,76. No site, a ordem se inverteu para tráfego: `C01H01` gerou LPV a R$ 0,27, mas sem resultado de negócio atribuído;
- `M26F02S` encerra sem renovação proposta: 2.020 LPVs a R$ 0,29 e 0 contatos sob o código exato significam atribuição não comprovada, não zero contato real;
- `M26O01W` termina em 19/08, não em 16/08. Com R$ 214,05 gastos, 0,30% de CTR link, 1 conversa e nenhuma consulta registrada, a proposta é interromper o saldo e não reutilizar o criativo atual;
- decisão revisada: manter `M26F01W` somente com `C06H01` e destino WhatsApp, não renovar `M26F02S`, interromper `M26O01W` e restringir a comparação de rota ao lifting cervical em `M26C01W` — WhatsApp direto — versus `M26C02S` — site → WhatsApp —, com 40–65+ rígido, R$ 300 total por braço e janela preparada de 17/08 às 12h a 01/09 às 12h;
- os vídeos finais cervicais 1:1 e 9:16 corrigem `cervicoplastia`; o quadrado fica no Feed e o arquivo 9:16 já enviado ocupa Reels/Stories, sem recorte automático. Daniel aceitou manter o CTA falado/embutido `Clique no link da bio`. O orgânico foi agendado para 20/08/2026 às 19h30 e será separado dos anúncios, sem reutilização do post;
- os dois braços cervicais estão em rascunho no Ads Manager, com anúncios principais `120251248762170627` e `120251249058760627`, anúncios herdados desligados e nenhum objeto publicado. O mapeamento local desses IDs foi preparado no webhook;
- a aprovação/publicação ficou para 17/08 e continua dependente de código/rotina publicados, schema v1, sonda que prove `M26C02S` até LEADS/CRM e revisão seletiva do lote Meta. Sem rastreamento comprovado, não ativar gasto. O plano detalhado está em `campanhas/PLANO-META-15-DIAS-2026-08-16.md`;
- a extensão facial foi preparada com `C06H01` e R$ 300 adicionais, mas seu conjunto atual mantém idade mínima observada em 25 e 40–65+ apenas como sugestão Advantage+. Antes de aprovar, aceitar essa exceção temporária ou adiar a extensão para reconstrução com piso rígido.

### Piloto futuro — Aqui Ads (OOH hiperlocal)

**Estado geral:** `AGENDADO PARA DECISÃO EM 16/09/2026; COMPRA NÃO AUTORIZADA`. O papel do canal é aumentar familiaridade e presença local entre pessoas de maior poder aquisitivo, especialmente 40+, sem tratar exposição estimada como paciente, lead ou consulta.

- **Desenho inicial:** quatro semanas, com shortlist de dois edifícios residenciais premium e um salão/spa premium. Priorizar Jardim Europa, Itaim Bibi, Vila Nova Conceição, Alto de Pinheiros e Pinheiros; deixar edifícios comerciais da Faria Lima para uma segunda etapa.
- **Envelope indicativo:** aproximadamente `R$ 1.206,20` por quatro semanas, antes da produção da peça, com base nas simulações consultadas em 16/08. Revalidar inventário, preço, perfil do local e metodologia de audiência em 16/09. A verba deve ser incremental e não pode sair do Google ou da Meta.
- **Criativo:** uma peça institucional, sem preço, promoção, promessa, vergonha ou antes/depois; Dra. Amanda como anunciante principal, com nome, `MÉDICA`, `CRM-SP 191605` e `RQE 110472`, sujeito ao gate Codame/jurídico e às regras finais do local.
- **Mensuração:** QR e landing/WhatsApp exclusivos registrados no catálogo canônico de atribuição, pergunta `Como conheceu?`, busca de marca, acesso direto, interações do Perfil da Empresa, contatos válidos, qualificados e consultas agendadas. Não inventar código antes do pré-voo.
- **Gate de ativação:** cobertura de atribuição esperada de pelo menos 80%, capacidade de atendimento confirmada, orçamento incremental autorizado, peça aprovada e nenhuma mudança material de Google, Meta ou atribuição na mesma janela. Se houver conflito, o OOH espera a primeira janela limpa após 16/09.
- **Decisão:** D+7 técnico, D+14 sinal intermediário, D+28 fechamento e D+35 latência. Menos de 80% de cobertura torna o teste inconclusivo. Não renovar se houver zero qualificado atribuído com tracking saudável e nenhum sinal coerente de marca; qualquer renovação ou escala exige nova autorização e custo por qualificado/agendamento aceitável.

### Auditoria 2 — SEO, IA e atribuição

**Estado geral:** pacote técnico publicado com os recursos novos desligados; próxima etapa é validar e só então decidir ativação/migração.

Já foi feito:

- commit técnico `50d7ea1` publicado no Netlify;
- Apps Script versão 91 publicou o pacote default-off; a produção atual é a versão 94, que mantém as rotinas anônimas e somente leitura de Google Ads e Meta Ads, acrescenta os resumos essenciais de 7/30 dias nos e-mails da Meta e não ativa a atribuição rica;
- smoke tests públicos aprovados;
- auditorias excluídas do artefato do site;
- logs e IDs endurecidos;
- estrutura de atribuição rica preparada;
- página de custo do lifting sem faixas públicas;
- feature `attributionJourneyEnabled=false` e schema de atribuição desligado;
- risco residual do `JID` visível/editável aceito por Daniel em 15/08/2026.

Ainda falta antes de ativar a atribuição rica:

- observar o purge e definir retenção/acesso dos sistemas externos;
- aprovar a política de privacidade coerente com o fluxo real;
- executar dry-runs realmente não mutantes e migrações autorizadas;
- provar a jornada Meta → site → WhatsApp → LEADS → CRM;
- reconciliar LEADS/CRM, Calendar, rotas e SLA;
- validar GSC, domínio Wix antigo, CWV e fontes externas;
- autorizar separadamente a ativação da feature e do schema.

**Importante:** a publicação default-off já ocorreu. Não deve ser repetida em 20/08. O bloco de 20/08 serve para pré-voos, decisões, migrações autorizadas e possível ativação isolada.

## 4. O que vocês precisam fazer agora

| Até quando | Responsável | Ação humana | Se não for possível |
|---|---|---|---|
| 17/08, antes das 17:30 | Daniel | participar da reunião de suporte de tags do Google; não aceitar mudanças amplas ou automáticas sem registro e revisão | coletar a recomendação e não aplicar na hora |
| 20/08, antes das 14:00 | Amanda/equipe | localizar autorizações/consentimentos das imagens e separar dúvidas para Codame/jurídico, sem subir documentos pessoais no repositório | manter congelado novo uso/reuso das galerias |
| 20/08, durante 15:00–17:00 | Daniel | fornecer uma autorização específica somente se todos os gates técnicos estiverem verdes | manter feature/schema desligados e reagendar |
| quando houver parecer | Amanda/jurídico/Codame | registrar decisão sobre galerias, imagens sensíveis/menores, consentimentos, retenção e comunicação de preços | não alterar/publicar esses itens por inferência |

Fora dessas ações, não há tarefa técnica que Daniel precise executar manualmente. O restante deve ser conduzido e documentado pelo responsável técnico.

## 5. Cronograma mestre

Todas as datas usam America/Sao_Paulo. Uma data não é autorização automática: primeiro se confirmam os gates.

| Data e hora | Bloco | Estado | O que será feito | Publicação ou escrita externa | Condição para avançar |
|---|---|---|---|---|---|
| diariamente, aproximadamente 08:15 | LEADS → Google Ads: agregado anônimo | `ATIVO` desde 15/08; Apps Script v92 | atualizar coortes de 7/30/90 dias na aba `Agregados` do arquivo `LIV — Agregados de mídia paga — sem PII` | grava somente contagens no arquivo agregado; nenhum dado de paciente | schema v1, zero PII, atualização <36 h e conta Ads somente leitora |
| diariamente, 09:00–10:00 | Google Ads: saúde automatizada | `ATIVO` desde 15/08; execução real concluída às 21:35 | gasto por mesmo dia da semana, entrega, políticas, páginas, meta qualificada, fontes e funil; cooldown de 48 h | e-mail automático; zero mutação na conta | script `12117745` concluiu sem mudanças; nenhum e-mail no sábado porque não havia alerta crítico |
| toda segunda, 09:00–10:00 | Google Ads: revisão tática automatizada | `ATIVO`; primeiro envio ampliado em 17/08 | semana + 30 dias; termos, positivas, negativas completas, Quality Score, conversões/metas, RSAs/recursos, segmentos, páginas, mudanças e funil | e-mail automático; alterações continuam manuais e autorizadas | revisar os três primeiros relatórios ampliados e calibrar falsos positivos comprovados |
| primeiro dia útil do mês, 09:00–10:00 | Google Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 01/09 | acrescentar 90 dias, eficiência do funil, cenários dentro de R$ 87/dia e prontidão de testes | e-mail automático; nenhuma execução de recomendação | fontes íntegras, mudanças datadas e funil reconciliado antes de decidir |
| diariamente, aproximadamente 08:25 | LEADS → Meta Ads: agregado anônimo | `ATIVO` desde 16/08; Apps Script v94; última execução 08:27 com 0% de erro | atualizar 7/30/90 dias por caminho, campanha e criativo conhecido na aba `Meta_Agregados` | grava somente contagens no arquivo agregado; nenhum dado de paciente | schema v1, zero PII, atualização <36 h e códigos conflitantes como N/D |
| diariamente, aproximadamente 10:05 | Meta Ads: saúde automatizada | `ATIVO` desde 16/08; Apps Script v94 | gasto no mesmo dia da semana, entrega/status, idade facial, páginas, fonte e funil; todo e-mail enviado inclui resumo 7/30 de mídia e funil | e-mail somente para alerta crítico; zero mutação | token `ads_read` protegido, conta validada, Graph `v26.0` e execução real sem escrita |
| toda terça-feira, aproximadamente 10:05 | Meta Ads: revisão tática automatizada | `ATIVO`; primeiro envio completo em 18/08 | 7 dias, sete anteriores e 30 dias; campanha, conjunto, anúncio, criativo/vídeo, segmentos, páginas e funil | e-mail automático; alterações continuam manuais e autorizadas | conferir os três primeiros relatórios e calibrar apenas falso positivo comprovado |
| 17/08, após gates técnicos | Meta Ads: lifting facial contínuo + experimento cervical Site × WhatsApp | `RASCUNHOS PRONTOS; NÃO PUBLICADOS` | revisar extensão `M26F01W/C06H01`; publicar somente `M26C01W` direto e `M26C02S` via `/lifting-cervical/`, R$ 300 total por braço, 17/08 12h–01/09 12h; Feed 1:1 e Reels/Stories 9:16 | publicação técnica, sonda E2E e só então publicação seletiva Meta; não usar `Publicar tudo` | 40–65+ rígido nos braços cervicais, IDs reais mapeados, sonda Site até LEADS/CRM, códigos/rotina e baseline salvos; decisão explícita sobre exceção etária de F01 |
| 20/08 19:30–19:50 | Instagram orgânico: Reels de lifting cervical | `AGENDADO` | publicar o vídeo 9:16 aprovado; manter `Clique no link da bio`; conferir link da bio e separar origem orgânica | publicação manual no Instagram | não reutilizar o post como anúncio nem atribuir o tráfego orgânico aos braços pagos |
| 18/08, após o relatório Meta | Meta WhatsApp: tornar 40+ efetivo | `BLOQUEADO` | decidir e preparar a conexão/migração do número para Conta do WhatsApp Business; confirmar backup/preservação; só então corrigir o piso para 40–65+ e o mínimo orçamentário exigido se o conjunto continuar | exige autorização específica no momento; pode afetar WhatsApp e gasto | acesso ao aparelho/número, plano de preservação, erro `#2923012` resolvido e orçamento `R$ 600,18` aceito somente se houver nova veiculação |
| segundo dia útil do mês, aproximadamente 10:05 | Meta Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 02/09 | acrescentar 90 dias, eficiência até consulta e prontidão de testes | e-mail automático; nenhuma recomendação aplicada | fontes íntegras; o cálculo considera segunda a sexta e não infere feriados |
| 17/08 17:30–18:00 | Suporte de tags do Google | `AGENDADO` | diagnóstico da implementação; registrar recomendações e evitar mudanças não planejadas | não aplicar mudança ampla durante a chamada | backup, acesso correto e escopo registrado |
| D+3 do experimento Meta | Cervical Site × WhatsApp: saúde técnica | `CONDICIONAL À ATIVAÇÃO` | conferir equilíbrio de gasto, idade efetiva, códigos, LPV, CTA, conversas e contatos identificados | corrigir somente falha técnica; pausar ambos se o Site não for rastreável | três dias completos depois da ativação real |
| 20/08 09:00–11:00 | Google Ads: prova segura e decisão etária | `AGENDADO` | testar conversão offline e E2E; confirmar negativas exatas; manter Meta facial em 40+; decidir se exclui `18–24` e `25–34` somente em LIFT, BLEF, CERV e FACE; iniciar somente RSA adulto de otoplastia se tudo passar | possível escrita em Ads/importação, somente após autorização no momento | zero PII, zero duplicidade, receipt por evento, origem preservada e idade `Desconhecida` mantida |
| 20/08 11:15–12:00 | CWV, vídeos e recursos | `AGENDADO` | medir laboratório/campo e 4G; abrir causas reais de recursos/logotipos | nenhuma otimização automática | baseline reproduzível; uma classe de ativo por futuro teste |
| 20/08 14:00–14:45 | Compliance e imagens | `DEPENDE DE VOCÊS` | revisar inventário, consentimentos, galerias, imagens sensíveis/menores e Codame | nenhuma remoção/publicação sem parecer | documento/parecer humano e escopo registrado |
| 20/08 15:00–17:00 | SEO/IA/atribuição: pré-voos e decisão | `AGENDADO` | verificar default-off, purge, privacidade, GSC/Wix, dry-runs e migrações; decidir ativação isolada | somente após autorização específica no momento | todos os gates verdes; rollback pronto; nenhuma PII |
| 21/08 15:30–16:00 | Checagem de 24 horas | `AGUARDAR DADOS` | somente se algo for ativado em 20/08: erros, logs, perda de origem e rollback | nenhuma nova mudança junto | data real da ativação conhecida |
| D+7 do experimento Meta | Cervical Site × WhatsApp: primeira decisão | `CONDICIONAL À ATIVAÇÃO` | comparar contatos identificados, válidos, qualificados e agendados por rota | manter ou pausar segundo o plano; não trocar criativo | cobertura ≥80%; pausar um braço se gastar ≥R$ 150 sem contato válido com tracking saudável |
| 27/08 09:00–10:00 | Google Ads: saúde de 7 dias | `AGENDADO` | receipts, duplicidade, códigos, funil e qualidade; se a decisão etária tiver sido aplicada, comparar volume/gasto/qualidade por idade sem confundir com outras mudanças | não decidir RSA nem idade por amostra insuficiente | sete dias reais desde a prova; mudança etária isolada e data efetiva registrada |
| 27/08 10:15–10:45 | SEO/IA/atribuição: 7 dias | `AGENDADO` | erros, origem, LEADS/CRM, Calendar/SLA e logs | manter ou reverter; nenhuma expansão | feature ativada em 20/08; senão registrar N/D e reagendar |
| 27/08 11:00–11:30 | Atualização executiva | `AGENDADO` | atualizar este plano, Drive, datas e decisões | nenhuma | checkpoints anteriores encerrados |
| D+15 do experimento Meta | Cervical Site × WhatsApp: decisão | `CONDICIONAL À ATIVAÇÃO` | fechar contatos, qualificados, agendados e custos por rota; declarar N/D se a amostra não separar | eventual continuidade exige nova autorização | 15 dias completos, cobertura ≥80% e nenhuma quebra operacional |
| 03/09 09:00–10:00 | Google Ads: decisão OTO; possível início CERV; idade em 14 dias | `AGUARDAR DADOS` | encerrar OTO e iniciar CERV somente se elegível; se a idade Google mudou em 20/08, avaliar 14 dias de gasto, contatos válidos e qualidade por faixa | mudança de um RSA por vez; não ampliar a exclusão etária | 14 dias e, preferencialmente, ≥50 cliques; data efetiva da mudança etária registrada |
| 03/09 10:15–10:45 | Atribuição: 14 dias | `AGUARDAR DADOS` | avaliar estabilidade e reconciliação | manter ou reverter | ativação real em 20/08; senão reagendar |
| D+22 do experimento Meta | Cervical Site × WhatsApp: latência | `CONDICIONAL À ATIVAÇÃO` | incorporar classificações, comparecimentos e agendamentos tardios | nenhuma nova mudança simultânea | sete dias após o fechamento do ciclo |
| 16/09 10:00–11:00 | Aqui Ads: decisão e pré-voo do piloto OOH | `AGENDADO; COMPRA NÃO AUTORIZADA` | revalidar shortlist de dois residenciais premium e um salão/spa, preço, audiência, peça, compliance, rastreamento e capacidade | nenhuma compra sem autorização específica no momento | Meta/atribuição encerradas ou estáveis, sem outra mudança material; verba incremental de aproximadamente R$ 1.206,20 confirmada |
| D+7 do piloto Aqui Ads | OOH: saúde técnica | `CONDICIONAL À ATIVAÇÃO` | validar QR, landing/WhatsApp, classificação de origem e disponibilidade dos pontos | corrigir apenas falha técnica; nenhuma troca de local/peça por amostra precoce | sete dias completos desde a veiculação real e cobertura de atribuição mensurável |
| D+14 do piloto Aqui Ads | OOH: leitura intermediária | `CONDICIONAL À ATIVAÇÃO` | ler busca de marca, direto, Perfil da Empresa, contatos válidos, qualificados e consultas | nenhuma renovação ou escala | tracking saudável e nenhuma mudança concorrente |
| D+28 do piloto Aqui Ads | OOH: decisão de continuidade | `CONDICIONAL À ATIVAÇÃO` | encerrar quatro semanas e classificar manter, não renovar ou inconclusivo | renovação somente com nova autorização | cobertura ≥80% e sinal de negócio; métricas da plataforma são apenas diagnóstico |
| D+35 do piloto Aqui Ads | OOH: latência | `CONDICIONAL À ATIVAÇÃO` | incorporar qualificações e agendamentos tardios e fechar o registro | nenhuma nova mudança simultânea | sete dias após o término da veiculação |
| 17/09 09:00–10:00 | Google Ads: decisão CERV; possível início BLEF | `AGUARDAR DADOS` | decidir CERV e, se elegível, iniciar BLEF | um teste por vez | CERV encerrado e tracking saudável |
| 17/09 10:15–10:45 | SEO/IA/atribuição: 28 dias | `AGUARDAR DADOS` | GSC, GA4, CWV, crawlers, origem e funil | nenhuma nova hipótese no mesmo momento | janela pós-ativação completa |
| 01/10 09:00–10:00 | Decisão BLEF; possível início FACE | `AGUARDAR DADOS` | decidir BLEF e iniciar FACE somente se elegível | um teste por vez | BLEF encerrado; manter linguagem leiga legítima |
| 15/10 09:00–10:00 | Decisão FACE; possível teste LIFT preço | `AGUARDAR DADOS` | decidir FACE e testar composição/orçamento individual no grupo de preço | sem voltar a publicar faixa cirúrgica | FACE encerrado; tracking estável |
| 12/11 09:00–10:00 | Decisão LIFT preço | `AGUARDAR DADOS` | avaliar contato válido, qualificado e consulta; decidir manter ou consolidar | nenhuma decisão por CTR isolado | 28 dias e, preferencialmente, ≥100 cliques |
| 18/11 09:00–09:30 | SEO/IA/atribuição: 90 dias | `AGUARDAR DADOS` | leitura longa de SEO, IA, atribuição e funil | planejar próximo ciclo | fontes reconciliadas e data-base válida |

## 6. Gates de publicação e ativação

### Pode publicar quando

- o escopo estiver isolado e aprovado;
- suíte, diff e artefato estiverem verdes;
- local = commit aprovado;
- alvo canônico estiver confirmado;
- backup e rollback existirem;
- nenhuma PII aparecer em logs, IDs ou relatórios;
- a mudança tiver métrica, janela e regra de reversão;
- houver autorização explícita no momento da publicação.

### Não publicar quando

- o relatório diz `N/D` para um gate crítico;
- houve outra mudança material na mesma janela;
- a planilha, CRM ou Calendar não podem ser reconciliados;
- falta receipt de conversão offline;
- a alteração depende de parecer jurídico/Codame ainda inexistente;
- o worktree contém arquivos fora do escopo;
- o evento de Calendar está desatualizado em relação a este plano.

### Regra especial para a atribuição rica

A aceitação do risco do `JID` resolveu apenas uma decisão. A ativação continua exigindo:

1. política de privacidade e retenção coerentes;
2. purge observado;
3. schema e migração aprovados;
4. sonda E2E segura;
5. reconciliação LEADS/CRM;
6. monitoramento e rollback;
7. autorização própria de ativação.

## 7. Backlog agrupado

| Pacote | Prioridade | Estado | Próxima decisão |
|---|---|---|---|
| Conversão offline Google e receipts | P0 | `AGENDADO` para 20/08 | religar somente com receipt e reconciliação por evento |
| Meta → site → WhatsApp → LEADS/CRM | P0 | `BLOQUEADO` para escala | provar tecnicamente antes de colocar verba nova em M26F02S |
| Atribuição rica J0/J1/J2 | P0 | código publicado, feature off | pré-voos e possível ativação em 20/08 |
| Schema/identidade da LEADS | P0 | código publicado, schema off | dry-run, backup e migração separados |
| Calendar, rotas e SLA | P0/P1 | `AGUARDAR DADOS` | reconciliar após migração/sonda |
| Experimentos Google Ads | P1 | sequência agendada | OTO → CERV → BLEF → FACE → LIFT preço |
| Rotina automatizada Google Ads | P1 | `ATIVO` desde 15/08; script `12117745`, diário 09:00–10:00 | revisar os três primeiros relatórios e calibrar somente falsos positivos comprovados |
| Rotina automatizada Meta Ads | P1 | `ATIVO` desde 16/08; Apps Script v94; somente leitura | conferir os três primeiros relatórios completos e calibrar somente falsos positivos comprovados |
| Meta — LIFT contínuo + CERV Site × WhatsApp | P1 | `RASCUNHOS PRONTOS; NÃO PUBLICADOS`; aprovação final em 17/08 | manter somente `M26F01W/C06H01` no WhatsApp e analisá-la separadamente; pausar avaliação/Site facial e OTO; usar o mesmo `C07H01` com Feed 1:1 e Reels/Stories 9:16 em `M26C01W` e `M26C02S`; não iniciar sem release técnico e sonda Site até LEADS/CRM |
| Idade das campanhas faciais | P1 | Meta 40+ mantido; Google `AGENDADO` para decisão em 20/08 | considerar excluir apenas `18–24` e `25–34` em LIFT/BLEF/CERV/FACE; manter `Desconhecida` e não alterar OTO/marca/rino |
| SEO técnico/CWV | P1/P2 | baseline parcial | medir 20/08; otimizar só com gargalo comprovado |
| GSC, Wix antigo, Bing e IA | P1/P2 | dependência externa | validar acesso/estado; não prometer ranking ou citação |
| Aqui Ads — piloto OOH hiperlocal | P2 | `AGENDADO PARA DECISÃO EM 16/09`; nenhuma compra autorizada | revalidar dois residenciais premium + um salão/spa, orçamento incremental, metodologia de audiência, peça e tracking; ativar apenas na primeira janela limpa |
| Galerias, imagens e consentimentos | P0 | `DEPENDE DE VOCÊS` | Codame/jurídico e inventário restrito |
| Comunicação e CRO | P1/P2 | adiada | somente depois da base técnica/atribuição e aprovação textual |

## 8. O que não deve ser alterado agora

- não aumentar o orçamento total por causa da pontuação de otimização;
- não ativar Performance Max, ampla, Display ou parceiros automaticamente;
- não reduzir o piso de 40+ do Meta facial; confirmar a entrega efetiva do Advantage+ antes de concluir que o piso foi obedecido;
- não excluir idade `Desconhecida` no Google nem aplicar a regra etária a otoplastia, marca ou futura rinoplastia;
- não colocar verba nova em `M26F02S` antes da prova E2E;
- não lançar `M26C01W` ou `M26C02S` com 25+, sem divisão equivalente ou sem a sonda `M26C02S` chegar corretamente a LEADS/CRM;
- não renovar `M26F02S`, não reativar `C01H01`, não criar versão Site para lifting facial e não publicar o vídeo cervical organicamente antes da janela;
- não publicar o rascunho pendente de `M26O01W` como se fosse cervical e não gastar o saldo da otoplastia sem decisão específica;
- não executar vários RSAs simultaneamente;
- não remover termos leigos legítimos, como “plástica das pálpebras”;
- não consolidar os grupos de lifting geral e preço antes da janela definida;
- não reintroduzir faixa cirúrgica pública na página de custo;
- não alterar galerias/imagens por inferência antes do parecer;
- não ativar feature/schema apenas porque o código já foi publicado;
- não comprar ou ativar Aqui Ads antes do gate de 16/09, nem retirar a verba do Google/Meta ou sobrepor o piloto a outra mudança material;
- não usar a matriz `17-STATUS-RECOMENDACOES.csv` isoladamente: ela preserva o estado anterior ao deploy default-off.

## 9. Calendário e conflitos

O Calendar é lembrete, não fonte de decisão. Este plano prevalece.

Os compromissos sobrepostos de 27/08 e 17/09 foram escalonados. O evento de 20/08 foi corrigido para não repetir a publicação default-off, e foram criadas as checagens condicionais de 24 horas e 14 dias. Os lembretes de lifting também foram alinhados à decisão de explicar composição e orçamento individual sem reintroduzir faixa cirúrgica pública. A decisão etária ficou no mesmo gate: Meta facial permanece em 40+; Google será decidido em 20/08 e, se alterado, observado em 27/08 e após 14 dias completos.

A rotina do Google Ads não cria três automações concorrentes. Um único script roda diariamente: fica silencioso quando a saúde está normal, envia a revisão completa às segundas-feiras e acrescenta 90 dias no primeiro dia útil do mês. Os checkpoints de 7 e 14 dias continuam no Calendar porque dependem da data real de cada mudança.

A rotina da Meta Ads também usa um único revisor diário: fica silenciosa sem alerta crítico, envia a revisão completa às terças-feiras e acrescenta 90 dias no segundo dia útil do mês. O agregado anônimo roda separadamente antes do relatório. Ambos estão ativos na v94 e continuam incapazes de alterar campanhas.

O experimento Meta proposto em 16/08 tem checkpoints relativos em D+3, D+7, D+15 e D+22. Eles só devem virar lembretes ativos depois de registrar a hora real da veiculação; se qualquer gate impedir o início, nenhum lembrete absoluto será criado e o plano continua em espera.

O gate do Aqui Ads fica fixado em 16/09. A veiculação e os checkpoints D+7, D+14, D+28 e D+35 só recebem datas absolutas depois da compra autorizada. Se o experimento Meta ainda estiver em latência ou se a decisão de Google Ads de 17/09 iniciar outra mudança, o OOH é adiado para preservar uma janela interpretável.

Se a ativação não ocorrer em 20/08, todas as janelas de 24 horas, 7, 14, 28 e 90 dias devem ser recalculadas a partir da data real.

## 10. Regra de manutenção deste plano

Após qualquer execução:

1. atualizar estado, evidência e próxima data neste arquivo local;
2. commitar a atualização;
3. substituir o mesmo arquivo de planejamento no Drive;
4. corrigir os lembretes afetados;
5. registrar publicação/deploy quando houver;
6. nunca criar outro `plano final`, `plano novo` ou planilha paralela.

## 11. Fontes técnicas subordinadas

- `auditorias/auditoria-google-ads-2026-08-14/EXECUCAO-2026-08-15.md`;
- `auditorias/auditoria-google-ads-2026-08-14/TAREFAS-PROGRAMADAS.md`;
- `auditorias/auditoria-seo-ia-atribuicao-2026-08-15/16-REGISTRO-DE-EXECUCAO.md`;
- `auditorias/auditoria-seo-ia-atribuicao-2026-08-15/17-STATUS-RECOMENDACOES.csv`, somente como baseline anterior ao deploy;
- `docs/auditoria-seo-ia-atribuicao-publicacao.md`;
- `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`;
- `campanhas/HISTORICO-ESTRATEGICO-AQUISICAO.md`.
- `campanhas/ROTINA-AUTOMATIZADA-REVISAO-GOOGLE-ADS.md`.
- `campanhas/ROTINA-AUTOMATIZADA-REVISAO-META-ADS.md`.

Se uma fonte técnica divergir deste painel sobre o que já foi publicado ou sobre a próxima data, interromper a execução, confirmar o estado ao vivo e atualizar ambos. Não escolher silenciosamente uma das versões.
