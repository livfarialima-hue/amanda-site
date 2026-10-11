# Margem de inferência da Bruna — 11/10/2026

Estado: testado localmente; publicação e validação real hospedada pendentes. Baseline local/origem 4879bf47a8e3fb1d1ca83eb4aa03f769ebebde15; produção df5af166b0c61dcc49bba1b769721a45d4f36898, deploy 6acbc8ea817d3600075f6270.

## Problema e decisão

A chamada da conversa ainda terminava em 8 segundos embora o modelo agora use esforço médio; o caso real mais lento do pacote anterior demorou 7.612 ms. O teto de saída já era 4.096, com saída incompleta rejeitada. A correção amplia a margem temporal sem mudar modelo, esforço, contexto clínico ou política de envio.

- Conversa e retomada humana: 20.000 ms totais, incluindo uma eventual revisão; pelo menos 8.000 ms restantes para iniciá-la.
- Classificação: 15.000 ms, abaixo do envelope externo de 20.000 ms já existente.
- Revisão de retomada: 12.000 ms, preservando envio exato e recusa.
- Teto comum 4.096 tokens, incluindo raciocínio; verbosidade baixa agora também na classificação.
- Sem retries de erro/timeout, novo tier pago, prewarm pago, mudança de cobrança, corte de histórico, redução de fatos ou duplicação de efeito.

Teto é limite, não tempo de espera obrigatório nem cota a ser consumida. O ganho esperado é menos cortes prematuros e menos segundas chamadas sem margem. Não há evidência de redução da latência média em produção ou melhora de conversão. Os casos reais do pacote anterior tiveram 19,4 mil tokens de entrada na conversa, com aproximadamente 18,9 mil já em cache; preservar o prefixo estável evita uma otimização especulativa que descarte contexto.

## Falha e consumidores

Saída incompleta/timeout não autoriza resposta. Rascunho sem avanço e sem margem recebe revisão humana com contexto; nunca se reenvia o evento. Os adaptadores continuam compartilhados pelo webhook, retomada humana, classificador e endpoint de retomada. Classificação e retomada humana usam processamento em background; flags conferidas no Netlify, entrada em durable_background_intake. O endpoint de retomada é síncrono e conserva margem para gates e entrega. As funções em background admitem até 15 minutos; síncronas até 60 segundos conforme [configuração Netlify](https://docs.netlify.com/build/functions/configuration/). Nenhuma programação foi alterada.

## Validação

32 testes focados passaram: nove novos com relógio controlado, continuidade, modelo fixo, webhook real interceptado e gate hospedado. Verificam respostas completas após o limite antigo, encerramento exato no novo, liberação do timer, revisão sem reiniciar prazo e nenhum retry de API. Passaram também 183 testes dos consumidores diretos, 1.943 testes integrais e 43 adicionais obrigatórios. Incluindo os cinco testes do gate hospedado, são 1.991 testes distintos e 98 arquivos obrigatórios cobertos. Escopo exato de 18 arquivos, arquitetura, build/check com 193 arquivos e 54 URLs e diff aprovados. O recibo pendente recebeu o campo de versão exigido pela regressão de governança, e a suíte integral repetida passou sem falhas. Validação real hospedada ainda pendente.

## Fontes e limites

[Sol 6.1](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [latência](https://developers.openai.com/api/docs/guides/latency-optimization) e [cache de prompt](https://developers.openai.com/api/docs/guides/prompt-caching), consultados em 11/10/2026. A documentação favorece menos saída desnecessária e menos chamadas; reduzir entrada isoladamente costuma ter benefício menor. Não houve mudança de parâmetros de cache ou compressão de instruções.

Daniel autorizou Publique e a continuação para otimizar estas configurações. Validação real limitada a cinco cenários sintéticos pela API paga no build já autorizado. Nenhuma mensagem real de teste, replay, alteração de LEADS/CRM, Apps Script, preços ou agenda.

Rollback: Restaurar Netlify 6acbc8ea817d3600075f6270 (commit df5af166b0c61dcc49bba1b769721a45d4f36898), preservando Apps Script v161, filas e recibos; sem replay.
Monitoramento: primeiras conversas naturais, 48 horas e sete dias (13/10 e 18/10), Daniel/equipe. Revisar timeouts, incompletas, latência, revisões sem contexto, repetição e custo por conversa; conter diante de envio indevido, duplicidade ou interferência humana. Sem tarefa agendada criada.
