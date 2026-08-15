# Rotina automatizada de revisão do Google Ads

**Status:** contrato operacional subordinado ao Norte Estratégico

**Conta:** `995-334-4486 — Dra Amanda Schroeder`

**Fuso:** `America/Sao_Paulo`

**Destinatário operacional:** Daniel

**Código versionado:** `google-ads-scripts/google-ads-search-review-email.js`

## 1. Objetivo

Produzir uma leitura recorrente e somente leitura da conta, transformar sinais em sugestões priorizadas e enviar o relatório por e-mail sem alterar campanhas, palavras, negativas, anúncios, públicos, lances ou orçamentos.

O relatório ajuda a identificar o que merece revisão. Ele não substitui a decisão que reconcilia Google Ads, LEADS, CRM, consultas e mudanças recentes.

## 2. Periodicidade aprovada

| Ritmo | Quando | Conteúdo | Envio |
|---|---|---|---|
| Saúde técnica | diariamente, entre 09:00 e 10:00 | gasto anormal, campanha que deixou de entregar, problema de política e ausência do sinal qualificado com gasto relevante | somente quando houver alerta crítico ou erro |
| Revisão tática | toda segunda-feira, entre 09:00 e 10:00 | semana anterior fechada, contexto de 30 dias, termos, positivas, negativas diretas, conversões, mudanças recentes, orçamento e ranking | sempre |
| Revisão estratégica | primeiro dia útil do mês, no mesmo disparo diário | tudo da revisão semanal mais contexto de 90 dias | sempre, combinada com o relatório do dia |
| Pós-mudança | 7 e 14 dias completos depois de mudança material | métrica e guardrail específicos do experimento | permanece no Plano Executivo e no Calendar; não é substituída pelo e-mail recorrente |

Não se deve decidir diariamente sobre termos e palavras. Com o orçamento e o volume atuais, uma leitura diária seria ruidosa e aumentaria o risco de excluir linguagem legítima ou reagir a atraso de conversão. O diário serve apenas para saúde; a segunda-feira usa a semana anterior completa.

## 3. O que a automação consulta

- campanhas de Pesquisa ativas;
- impressões, cliques, CTR, CPC, gasto e conversões exibidas;
- parcela de impressões e perda por orçamento e classificação, quando disponíveis;
- termos de pesquisa dos últimos 30 dias que o Google disponibilizar;
- palavras positivas ativas e tipos de correspondência;
- negativas diretas de campanha e grupo;
- ações de conversão segmentadas por nome;
- anúncios ativos com problema de política;
- eventos de mudança dos últimos 14 dias;
- contexto de 90 dias no primeiro dia útil do mês.

As listas compartilhadas de negativas continuam exigindo inspeção na interface. Termos ocultos por privacidade, contatos válidos, consultas, comparecimentos e procedimentos não são inferidos: permanecem `N/D` até reconciliação com a fonte correta.

## 4. Sugestões produzidas

Cada sugestão contém prioridade, decisão, campanha/grupo, problema, evidência, mudança sugerida, guardrail e confiança.

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

Antes de ativar:

- testes locais verdes;
- conta validada pelo ID;
- prévia do Google Ads Script sem chamada de mutação;
- e-mail de teste recebido;
- programação diária visível na conta.

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

