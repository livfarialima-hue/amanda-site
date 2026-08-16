# Plano executivo — auditorias, pendências e prazos

**Status:** fonte canônica executiva para decidir o que fazer, quando executar e quando publicar

**Atualizado em:** 15 de agosto de 2026, America/Sao_Paulo

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

### Auditoria 2 — SEO, IA e atribuição

**Estado geral:** pacote técnico publicado com os recursos novos desligados; próxima etapa é validar e só então decidir ativação/migração.

Já foi feito:

- commit técnico `50d7ea1` publicado no Netlify;
- Apps Script versão 91 publicou o pacote default-off; a produção atual é a versão 92, que acrescenta somente o agregado anônimo da rotina Google Ads;
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
| diariamente, aproximadamente 08:15 | LEADS → Google Ads: agregado anônimo | `ATIVO` desde 15/08; Apps Script v92 | atualizar coortes de 7/30/90 dias no arquivo `LIV — Agregados Google Ads — sem PII` | grava somente contagens no arquivo agregado; nenhum dado de paciente | schema v1, zero PII, atualização <36 h e conta Ads somente leitora |
| diariamente, 09:00–10:00 | Google Ads: saúde automatizada | `ATIVO` desde 15/08; execução real concluída às 21:35 | gasto por mesmo dia da semana, entrega, políticas, páginas, meta qualificada, fontes e funil; cooldown de 48 h | e-mail automático; zero mutação na conta | script `12117745` concluiu sem mudanças; nenhum e-mail no sábado porque não havia alerta crítico |
| toda segunda, 09:00–10:00 | Google Ads: revisão tática automatizada | `ATIVO`; primeiro envio ampliado em 17/08 | semana + 30 dias; termos, positivas, negativas completas, Quality Score, conversões/metas, RSAs/recursos, segmentos, páginas, mudanças e funil | e-mail automático; alterações continuam manuais e autorizadas | revisar os três primeiros relatórios ampliados e calibrar falsos positivos comprovados |
| primeiro dia útil do mês, 09:00–10:00 | Google Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 01/09 | acrescentar 90 dias, eficiência do funil, cenários dentro de R$ 87/dia e prontidão de testes | e-mail automático; nenhuma execução de recomendação | fontes íntegras, mudanças datadas e funil reconciliado antes de decidir |
| 17/08 17:30–18:00 | Suporte de tags do Google | `AGENDADO` | diagnóstico da implementação; registrar recomendações e evitar mudanças não planejadas | não aplicar mudança ampla durante a chamada | backup, acesso correto e escopo registrado |
| 20/08 09:00–11:00 | Google Ads: prova segura e decisão etária | `AGENDADO` | testar conversão offline e E2E; confirmar negativas exatas; manter Meta facial em 40+; decidir se exclui `18–24` e `25–34` somente em LIFT, BLEF, CERV e FACE; iniciar somente RSA adulto de otoplastia se tudo passar | possível escrita em Ads/importação, somente após autorização no momento | zero PII, zero duplicidade, receipt por evento, origem preservada e idade `Desconhecida` mantida |
| 20/08 11:15–12:00 | CWV, vídeos e recursos | `AGENDADO` | medir laboratório/campo e 4G; abrir causas reais de recursos/logotipos | nenhuma otimização automática | baseline reproduzível; uma classe de ativo por futuro teste |
| 20/08 14:00–14:45 | Compliance e imagens | `DEPENDE DE VOCÊS` | revisar inventário, consentimentos, galerias, imagens sensíveis/menores e Codame | nenhuma remoção/publicação sem parecer | documento/parecer humano e escopo registrado |
| 20/08 15:00–17:00 | SEO/IA/atribuição: pré-voos e decisão | `AGENDADO` | verificar default-off, purge, privacidade, GSC/Wix, dry-runs e migrações; decidir ativação isolada | somente após autorização específica no momento | todos os gates verdes; rollback pronto; nenhuma PII |
| 21/08 15:30–16:00 | Checagem de 24 horas | `AGUARDAR DADOS` | somente se algo for ativado em 20/08: erros, logs, perda de origem e rollback | nenhuma nova mudança junto | data real da ativação conhecida |
| 27/08 09:00–10:00 | Google Ads: saúde de 7 dias | `AGENDADO` | receipts, duplicidade, códigos, funil e qualidade; se a decisão etária tiver sido aplicada, comparar volume/gasto/qualidade por idade sem confundir com outras mudanças | não decidir RSA nem idade por amostra insuficiente | sete dias reais desde a prova; mudança etária isolada e data efetiva registrada |
| 27/08 10:15–10:45 | SEO/IA/atribuição: 7 dias | `AGENDADO` | erros, origem, LEADS/CRM, Calendar/SLA e logs | manter ou reverter; nenhuma expansão | feature ativada em 20/08; senão registrar N/D e reagendar |
| 27/08 11:00–11:30 | Atualização executiva | `AGENDADO` | atualizar este plano, Drive, datas e decisões | nenhuma | checkpoints anteriores encerrados |
| 03/09 09:00–10:00 | Decisão OTO; possível início CERV; idade em 14 dias | `AGUARDAR DADOS` | encerrar OTO e iniciar CERV somente se elegível; se a idade Google mudou em 20/08, avaliar 14 dias de gasto, contatos válidos e qualidade por faixa | mudança de um RSA por vez; não ampliar a exclusão etária | 14 dias e, preferencialmente, ≥50 cliques; data efetiva da mudança etária registrada |
| 03/09 10:15–10:45 | Atribuição: 14 dias | `AGUARDAR DADOS` | avaliar estabilidade e reconciliação | manter ou reverter | ativação real em 20/08; senão reagendar |
| 17/09 09:00–10:00 | Decisão CERV; possível início BLEF | `AGUARDAR DADOS` | decidir CERV e, se elegível, iniciar BLEF | um teste por vez | CERV encerrado e tracking saudável |
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
| Idade das campanhas faciais | P1 | Meta 40+ mantido; Google `AGENDADO` para decisão em 20/08 | considerar excluir apenas `18–24` e `25–34` em LIFT/BLEF/CERV/FACE; manter `Desconhecida` e não alterar OTO/marca/rino |
| SEO técnico/CWV | P1/P2 | baseline parcial | medir 20/08; otimizar só com gargalo comprovado |
| GSC, Wix antigo, Bing e IA | P1/P2 | dependência externa | validar acesso/estado; não prometer ranking ou citação |
| Galerias, imagens e consentimentos | P0 | `DEPENDE DE VOCÊS` | Codame/jurídico e inventário restrito |
| Comunicação e CRO | P1/P2 | adiada | somente depois da base técnica/atribuição e aprovação textual |

## 8. O que não deve ser alterado agora

- não aumentar o orçamento total por causa da pontuação de otimização;
- não ativar Performance Max, ampla, Display ou parceiros automaticamente;
- não reduzir o piso de 40+ do Meta facial; confirmar a entrega efetiva do Advantage+ antes de concluir que o piso foi obedecido;
- não excluir idade `Desconhecida` no Google nem aplicar a regra etária a otoplastia, marca ou futura rinoplastia;
- não colocar verba nova em `M26F02S` antes da prova E2E;
- não executar vários RSAs simultaneamente;
- não remover termos leigos legítimos, como “plástica das pálpebras”;
- não consolidar os grupos de lifting geral e preço antes da janela definida;
- não reintroduzir faixa cirúrgica pública na página de custo;
- não alterar galerias/imagens por inferência antes do parecer;
- não ativar feature/schema apenas porque o código já foi publicado;
- não usar a matriz `17-STATUS-RECOMENDACOES.csv` isoladamente: ela preserva o estado anterior ao deploy default-off.

## 9. Calendário e conflitos

O Calendar é lembrete, não fonte de decisão. Este plano prevalece.

Os compromissos sobrepostos de 27/08 e 17/09 foram escalonados. O evento de 20/08 foi corrigido para não repetir a publicação default-off, e foram criadas as checagens condicionais de 24 horas e 14 dias. Os lembretes de lifting também foram alinhados à decisão de explicar composição e orçamento individual sem reintroduzir faixa cirúrgica pública. A decisão etária ficou no mesmo gate: Meta facial permanece em 40+; Google será decidido em 20/08 e, se alterado, observado em 27/08 e após 14 dias completos.

A rotina do Google Ads não cria três automações concorrentes. Um único script roda diariamente: fica silencioso quando a saúde está normal, envia a revisão completa às segundas-feiras e acrescenta 90 dias no primeiro dia útil do mês. Os checkpoints de 7 e 14 dias continuam no Calendar porque dependem da data real de cada mudança.

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

Se uma fonte técnica divergir deste painel sobre o que já foi publicado ou sobre a próxima data, interromper a execução, confirmar o estado ao vivo e atualizar ambos. Não escolher silenciosamente uma das versões.
