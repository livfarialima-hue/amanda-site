# Rotina automatizada de revisão da Meta Ads

**Status:** `ATIVO` desde 16/08/2026; Apps Script canônico v94, agregado e acesso somente leitura testados ao vivo

**Conta:** `1643959806249995`

**Fuso:** `America/Sao_Paulo`

**Destinatário operacional:** Daniel

**Código versionado:** `apps-script/clinica-liv-leads/MetaAdsReview.gs`

**Agregado anônimo:** planilha `1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0`, aba `Meta_Agregados`

## 1. Objetivo e limite

A rotina identifica problemas, reúne sinais de mídia e funil e envia sugestões para revisão humana. Ela usa somente consultas `GET` da Marketing API e não pode alterar campanhas, conjuntos, anúncios, públicos, criativos, orçamento, lance, programação ou status.

Resultados da plataforma — conversa, visualização da página, clique ou reprodução — não são chamados de paciente, contato válido, qualificado ou consulta. Essas etapas entram somente pelo agregado anônimo da LEADS.

## 2. Periodicidade

| Ritmo | Quando | Conteúdo | Envio |
|---|---|---|---|
| Agregado do funil | diariamente, aproximadamente 08:25 | coortes 7/30/90 dias por caminho, campanha e criativo conhecido | atualiza somente `Meta_Agregados`; sem e-mail e sem PII |
| Saúde técnica | diariamente, aproximadamente 10:05 | gasto anômalo no mesmo dia da semana, entrega, política/status, idade facial, destino e frescor do funil; todo e-mail enviado traz resumo 7/30 dias de mídia e funil | somente alerta novo, piora ou persistência de 48 h |
| Revisão tática | toda terça-feira | últimos 7 dias, sete dias anteriores e 30 dias; campanhas, conjuntos, anúncios, criativos, vídeo, idade/gênero, plataforma/posicionamento, páginas e funil | sempre |
| Revisão estratégica | segundo dia útil do mês | acrescenta 90 dias e prontidão de testes/realocação | sempre, no relatório do dia |
| Pós-mudança | 7 e 14 dias completos | hipótese, métrica e guardrail da mudança específica | permanece no Plano Executivo e no Calendar |

O segundo dia útil é calculado como o segundo dia de segunda a sexta; feriados locais não são inferidos pelo código. Se coincidir com feriado operacional, o relatório continua seguro, mas a revisão humana pode ocorrer no dia útil seguinte.

O teste manual `executarTesteRevisaoMetaAds()` sempre gera a versão semanal completa, mesmo quando executado fora da terça-feira. Isso evita validar o layout com um e-mail diário incompleto. A rotina diária, por sua vez, só envia quando existe alerta novo, piora ou persistência após o cooldown; quando envia, nunca omite o resumo essencial de 7 e 30 dias.

## 3. O que é analisado

- campanhas, conjuntos, anúncios e criativos;
- status configurado e efetivo, objetivo, otimização, lance, orçamento e datas;
- gasto, alcance, impressões, frequência, CPM, cliques, CTR e CPC;
- visualização de página e passagem LPV/clique;
- conversa iniciada e custo por conversa quando a ação estiver disponível;
- vídeo: início, ThruPlay e retenções 25%, 50%, 75%, 95% e 100% quando disponíveis;
- idade, gênero, plataforma, posicionamento e dispositivo quando a API aceitar a combinação;
- integridade de páginas finais observáveis no criativo;
- fadiga somente por sinais combinados, nunca por frequência isolada;
- contato identificado, classificado, válido, qualificado, agendado, realizado, convertido e marco de fechamento pelo agregado anônimo;
- diferença entre `M26F01W` — Meta → WhatsApp direto — e `M26F02S` — Meta → site → WhatsApp;
- código/criativo desconhecido ou conflitante como `N/D`, sem inferência.

## 4. Filas de decisão

Toda sugestão entra em uma fila:

- `Corrigir agora`: falha técnica, mensuração, política ou quebra de jornada;
- `Pode testar`: hipótese isolável, amostra mínima e rollback definidos;
- `Aguardar dados`: sinal insuficiente ou janela contaminada;
- `Não alterar`: controle, gate fechado ou proposta que deve ser preservada.

Fadiga criativa exige, no mínimo, 1.000 impressões na janela e combinação de aumento de frequência com queda de CTR link e piora de custo/resultado ou ausência de resultado. Mesmo assim, a rotina sugere uma variação; nunca pausa o controle.

## 5. Regras estratégicas incorporadas

- manter `M26F01W/C06H01` como referência operacional contínua de lifting facial no WhatsApp, sem tratá-la como controle causal do teste cervical;
- não colocar verba nova em `M26F02S` antes da prova Meta → site → WhatsApp → LEADS/CRM;
- manter as campanhas faciais em 40+ e alertar se `age_min` observado ficar abaixo de 40;
- tratar a idade do Público Advantage+ como sugestão até que `age_min` prove o limite; nome do conjunto não prova controle etário;
- não decidir por CTR, CPM ou conversa isoladamente;
- não confundir zero código identificado com zero contato real;
- não ativar CAPI ou ampliar dados enviados como consequência automática do relatório;
- preservar os checkpoints de 7 e 14 dias de qualquer mudança material.

## 6. Privacidade e credenciais

O token não pode entrar no repositório, Drive, e-mail ou planilha. Ele deve existir apenas nas propriedades do projeto canônico do Apps Script:

- `META_MARKETING_API_TOKEN`: token de leitura com `ads_read` e menor escopo possível;
- `META_GRAPH_VERSION`: versão vigente explicitamente confirmada, como `vNN.N`;
- `META_ADS_REVIEW_ENABLED`: `true` somente depois de `validarAcessoRevisaoMetaAds()` concluir sem erro.

O agregado não contém nome, telefone, e-mail, mensagem, click ID, `Opportunity ID`, `Event ID` ou informação clínica. Campanha e criativo aparecem apenas associados a contagens agregadas.

## 7. Ativação e rollback

Ativação concluída em 16/08/2026:

- usuário do sistema com acesso mínimo de desempenho à conta;
- token permanente limitado a `ads_read`, armazenado somente nas propriedades do projeto;
- `META_GRAPH_VERSION=v26.0` e `META_ADS_REVIEW_ENABLED=true`;
- `validarAcessoRevisaoMetaAds()` concluído às 12:06 BRT;
- `executarTesteRevisaoMetaAds()` concluído às 12:20 BRT; e-mail recebido com duas sinalizações críticas e nenhuma mutação;
- `publicarAgregadosFunilMetaAds` ativo aproximadamente às 08:25, última execução observada às 08:27 com 0% de erro;
- `executarRevisaoMetaAds` ativo aproximadamente às 10:05, com uma única instância do trigger criada às 12:23.
- versão 94 publicada às 15:15 BRT no deployment canônico; `validarAcessoRevisaoMetaAds()` concluiu às 15:16 sem mutação. Desde essa versão, qualquer e-mail inclui métricas essenciais de 7/30 dias e o teste manual força a revisão completa.

Auditoria etária ao vivo de 16/08/2026:

- `M26F02S` tinha controle real 25 e sugestão 40–65+; foi publicado com público original e limite rígido 40–65+;
- `M26F01W` também tinha controle real 25. A correção não foi publicada porque a Meta exigiu Conta do WhatsApp Business (`#2923012`) e orçamento total mínimo de R$ 600,18 (`#2446149`). O rascunho foi descartado para não deixar edição parcial;
- a rotina deve manter o alerta P0 para `M26F01W` até o gate operacional ser resolvido. Nenhum aumento de orçamento ou migração do WhatsApp foi feito.

Próximas conferências: revisar os relatórios completos de 18/08, 25/08 e 01/09 antes de calibrar qualquer limiar. Alterações de campanha continuam manuais e exigem autorização específica.

Plano condicional revisado em 16/08:

- manter `M26F01W` somente com `C06H01` e destino WhatsApp; não renovar `M26F02S`; interromper `M26O01W`; e testar a rota exclusivamente dentro de cervical, em `M26C01W/C07H01` — WhatsApp direto — versus `M26C02S/C07H01` — site → WhatsApp — por 15 dias;
- a rotina atual não deve chamar o experimento de acompanhado antes de os dois códigos entrarem em `META_ADS_CAMPAIGN_REGISTRY`, na regra de resultado principal, no agregado e nos testes;
- o onboarding de cada braço exige código canônico, caminho, criativo, mensagem, Meta Ad ID, destino, idade efetiva, data/hora de ativação e teste de chegada ao agregado;
- o braço Site só pode ser liberado depois de sonda ponta a ponta com campanha, criativo, landing, página do CTA, caminho e confiança corretos em LEADS/CRM;
- checkpoints condicionais: D+3, D+7, D+15 e D+22 a partir da ativação real; as datas do calendário só serão fixadas depois da publicação;
- os arquivos cervicais finais corrigem `cervicoplastia`; Daniel aceitou manter `Clique no link da bio`. A rotina deve tratar o Reels orgânico agendado para 20/08 às 19h30 como fonte separada e nunca somá-lo aos braços pagos; o post orgânico não será reutilizado nos anúncios;
- o plano executável e os critérios de manter/reverter estão em `campanhas/PLANO-META-15-DIAS-2026-08-16.md`.

Ordem obrigatória:

1. publicar o código no projeto e deployment canônicos;
2. publicar `Meta_Agregados` e verificar cabeçalhos, contagens e ausência de PII;
3. configurar o token e a versão somente nas propriedades do projeto;
4. executar `validarAcessoRevisaoMetaAds()`;
5. executar uma revisão manual e conferir o e-mail;
6. criar o trigger com `configurarRotinaRevisaoMetaAds()`;
7. conferir os três primeiros relatórios completos.

Rollback:

- definir `META_ADS_REVIEW_ENABLED=false`;
- remover somente o trigger `executarRevisaoMetaAds`;
- preservar código e último relatório para diagnóstico;
- corrigir localmente, testar e reativar somente após autorização.

## 8. Fontes oficiais

- Meta Marketing API — Insights: https://developers.facebook.com/docs/marketing-api/insights/
- Meta Marketing API — acesso: https://developers.facebook.com/docs/marketing-api/access/
- Meta Graph API — versionamento: https://developers.facebook.com/docs/graph-api/overview/versioning/
- Meta — status de veiculação: https://www.facebook.com/help/messenger-app/650774041651557/
- Meta — histórico de atividade: https://www.facebook.com/help/messenger-app/289211751238030
- Meta — análise e revisão de anúncios: https://www.facebook.com/business/ads/review-policy-guidelines
