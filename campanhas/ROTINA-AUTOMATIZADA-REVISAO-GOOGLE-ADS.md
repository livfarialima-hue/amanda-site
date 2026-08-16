# Rotina automatizada de revisão do Google Ads

**Status:** ativo na conta; contrato operacional subordinado ao Norte Estratégico

**Conta:** `995-334-4486 — Dra Amanda Schroeder`

**Fuso:** `America/Sao_Paulo`

**Destinatário operacional:** Daniel

**Código versionado:** `google-ads-scripts/google-ads-search-review-email.js`

**Script na conta:** `12117745 — LIV — Revisão Google Ads — somente leitura`

**Programação verificada:** diariamente, entre `09:00` e `10:00`, no fuso da conta

**Fonte anônima do funil:** `1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0 — LIV — Agregados Google Ads — sem PII`

**Ativação:** 15/08/2026; visualização concluída sem mudanças e e-mail de teste enviado para `daniel.added@gmail.com`

## 1. Objetivo

Produzir uma leitura recorrente e somente leitura da conta, transformar sinais em sugestões priorizadas e enviar o relatório por e-mail sem alterar campanhas, palavras, negativas, anúncios, públicos, lances ou orçamentos.

O relatório ajuda a identificar o que merece revisão. Ele não substitui a decisão que reconcilia Google Ads, LEADS, CRM, consultas e mudanças recentes.

## 2. Periodicidade aprovada

| Ritmo | Quando | Conteúdo | Envio |
|---|---|---|---|
| Agregado do funil | diariamente, aproximadamente 08:15 | coortes anônimas de 7, 30 e 90 dias; contato, classificação, qualificação, consulta e marco de fechamento | não envia e-mail; atualiza somente a planilha agregada sem PII |
| Saúde técnica | diariamente, entre 09:00 e 10:00 | gasto comparado ao mesmo dia da semana, campanha que deixou de entregar, política, destino final, ação/meta qualificada e frescor do funil | somente quando houver alerta crítico novo, piora, persistência por 48 h ou erro |
| Revisão tática | toda segunda-feira, entre 09:00 e 10:00 | semana anterior fechada, contexto de 30 dias, termos, positivas, inventário completo de negativas, conversões/metas, RSAs/recursos, segmentações, páginas, orçamento, ranking e funil | sempre |
| Revisão estratégica | primeiro dia útil do mês, no mesmo disparo diário | tudo da revisão semanal mais contexto de 90 dias, cenários de realocação dentro do orçamento e prontidão de testes | sempre, combinada com o relatório do dia |
| Pós-mudança | 7 e 14 dias completos depois de mudança material | métrica e guardrail específicos do experimento | permanece no Plano Executivo e no Calendar; não é substituída pelo e-mail recorrente |

Não se deve decidir diariamente sobre termos e palavras. Com o orçamento e o volume atuais, uma leitura diária seria ruidosa e aumentaria o risco de excluir linguagem legítima ou reagir a atraso de conversão. O diário serve apenas para saúde; a segunda-feira usa a semana anterior completa.

## 3. O que a automação consulta

- campanhas de Pesquisa ativas;
- impressões, cliques, CTR, CPC, gasto e conversões exibidas;
- parcela de impressões, topo/topo absoluto e perda por orçamento e classificação, quando disponíveis;
- termos de pesquisa dos últimos 30 dias que o Google disponibilizar;
- palavras positivas, correspondência, volume, gasto e componentes de Quality Score;
- negativas diretas e listas compartilhadas, associações e risco de conflito com buscas legítimas;
- ações de conversão por nome, papel principal, status, janela, contagem, atribuição e cobertura biddable das metas de campanha;
- RSAs, quantidade de títulos/descrições, força diagnóstica, políticas e rótulos de recursos;
- dispositivo, idade — mantendo `UNKNOWN` visível —, rede, dia e horário;
- URLs finais, HTTP, canonical e CTA WhatsApp rastreado;
- eventos de mudança dos últimos 14 dias e prontidão da janela para decisão;
- agregado anônimo da LEADS para contatos, classificados, válidos classificados, qualificados, consultas e marcos de fechamento;
- contexto de 90 dias no primeiro dia útil do mês.

Termos ocultos por privacidade e qualquer etapa sem fonte íntegra permanecem `N/D`. A falha de uma consulta invalida as conclusões derivadas daquela fonte: nunca vira zero. Fechamento conta apenas marco canônico registrado; ausência de marco não prova ausência real.

### Separação de privacidade

- A planilha `LEADS` continua restrita e não é compartilhada com a conta do Google Ads.
- O Apps Script lê internamente `_FUNIL_CANONICO` e `_OPORTUNIDADE_MARCOS` e grava somente contagens por janela/campanha no arquivo agregado separado.
- O agregado não contém nome, telefone, e-mail, mensagem, click ID, `Opportunity ID`, `Event ID` ou informação clínica.
- A conta `aschroeder.br@gmail.com` recebe somente leitura do agregado.
- O Google Ads Script rejeita o agregado quando o schema diverge ou a atualização tem mais de 36 horas.

## 4. Sugestões produzidas

Cada sugestão contém prioridade, uma das quatro filas (`Corrigir agora`, `Pode testar`, `Aguardar dados`, `Não alterar`), campanha/grupo, problema, evidência, mudança exata, impacto, risco, confiança, amostra/janela mínima, métrica, guardrail, rollback e próxima revisão.

### Negativas

- Só sugere candidata negativa quando a consulta corresponde a categoria inequívoca — emprego/formação, gratuidade/SUS/convênio ou solução caseira/produto — e já acumulou pelo menos R$ 5 de gasto.
- A sugestão inicial é sempre de correspondência exata e no menor nível seguro.
- Nunca aplica a negativa.
- Protege linguagem leiga legítima, inclusive `plástica das pálpebras`, `cirurgia de pálpebras`, `orelha de abano` e `papada`.
- Trata `preço`, `valor`, `custo` e `quanto custa` como intenção de roteamento; não como irrelevância.

### Positivas

- Pode sugerir uma palavra exata quando o termo é compatível, tem pelo menos três cliques ou uma conversão exibida e não há palavra exata igual identificada no mesmo grupo.
- A inclusão continua sujeita à conferência de canibalização, anúncio e página.

### Campanhas e conversões

- Perda por orçamento gera observação, não aumento automático.
- Perda por classificação gera revisão de termo, RSA e página antes de lance.
- Gasto sem conversão gera pedido de reconciliação; não pausa automática.
- Clique no WhatsApp e lead qualificado são mostrados separadamente quando o proxy domina o agregado.
- Mudanças recentes bloqueiam conclusões causais sobre janelas contaminadas.
- Orçamento e lance só entram em cenário de realocação quando a ação qualificada e o funil estão saudáveis; a referência total permanece R$ 87/dia.
- A anomalia diária compara ontem ao mesmo dia da semana nas oito semanas anteriores e exige também diferença absoluta; não usa a média simples dos sete dias anteriores.
- Segmentações só viram teste com amostra mínima e resultado de negócio. `UNKNOWN` nunca é excluído automaticamente.
- Alertas iguais não são reenviados diariamente: voltam se mudarem, piorarem ou persistirem por 48 horas.

## 5. Regras de envio

- Segunda-feira: e-mail completo, mesmo sem alerta.
- Primeiro dia útil do mês: e-mail completo com bloco de 90 dias.
- Demais dias: nenhum e-mail se a saúde estiver normal.
- Erro da rotina: e-mail explícito informando que nenhuma campanha foi alterada.
- Limite visual: até 40 sugestões por seção no e-mail; a coleta e a priorização podem examinar mais linhas.

## 6. O que fazer ao receber o e-mail

1. Corrigir primeiro qualquer alerta P0 de política, entrega ou mensuração.
2. Comparar sugestões de termos com LEADS/CRM e com as mudanças dos últimos 14 dias.
3. Aprovar alterações em lotes pequenos e homogêneos.
4. Registrar no Norte e no histórico quando a decisão afetar estratégia, estrutura, orçamento, lance, conversão ou página.
5. Executar uma mudança material por vez e preservar a janela prevista no Plano Executivo.

O e-mail não autoriza clicar em recomendações automáticas do Google e não autoriza a rotina a escrever na conta.

## 7. Teste, monitoramento e rollback

Gates de ativação concluídos em 15/08/2026:

- testes locais verdes;
- conta validada pelo ID;
- prévia do Google Ads Script sem chamada de mutação;
- e-mail de teste enviado pelo script;
- programação diária visível na conta.

Gates da ampliação de 15/08/2026:

- arquivo agregado separado criado dentro de `02 — Campanhas — Google Ads e Meta Ads` e compartilhado somente como leitor para a conta de Ads;
- publicação diária do agregado às 08:15 deve ocorrer antes da leitura do Ads;
- Google Ads Script precisa concluir a prévia sem mutação e reconhecer o agregado com menos de 36 horas;
- o primeiro e-mail ampliado deve mostrar status `OK`/`N/D` por fonte e nunca produzir falso zero.

Após ativar:

- conferir os três primeiros relatórios completos;
- confirmar que consultas N/D permanecem N/D;
- ajustar regras se houver falso positivo;
- revisar o destinatário quando mudar o responsável.

Rollback:

- pausar a programação ou o script na conta;
- preservar o código e o último e-mail para auditoria;
- corrigir e testar localmente;
- publicar novamente somente após autorização.

## 8. Fontes oficiais

- Google Ads Scripts — `AdsApp.search`: https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp
- Google Ads Scripts — envio com `MailApp`: https://developers.google.com/google-ads/scripts/docs/examples/mailapp
- Google Ads Scripts — exemplo oficial de relatório semanal às segundas-feiras: https://developers.google.com/google-ads/scripts/docs/solutions/ad-performance
- Google Ads Scripts — recomendação de aguardar a latência diária dos dados: https://developers.google.com/google-ads/scripts/docs/solutions/account-summary
- Google Ads Scripts — detector de anomalias por dia comparável: https://developers.google.com/google-ads/scripts/docs/solutions/account-anomaly-detector
- Google Ads API — mudanças recentes: https://developers.google.com/google-ads/api/docs/change-event
- Google Ads API — Quality Score: https://developers.google.com/google-ads/api/fields/v23/ad_group_criterion
- Google Ads API — metas de conversão: https://developers.google.com/google-ads/api/fields/v24/campaign_conversion_goal
