# Ajustes de campanhas Google Ads — 13/09/2026

Status: publicado e verificado no Google Ads; Plano canônico projetado e relido no Drive.

## Escopo autorizado

Daniel autorizou aplicar as modificações julgadas necessárias nas campanhas Google. O pacote foi limitado às duas campanhas com evidência mais clara e foi isolado do trabalho paralelo em LEADS: conter a compra genérica de `G26FACE`, reduzir seu teto de R$ 8 para R$ 4/dia e tornar explícitas quatro buscas cervicais de preço já observadas, sem elevar `G26CERV` nem qualquer outra verba.

O plano exato e o rollback estão em `PLANO.json`. Site, textos dos anúncios, lances, metas, redes, públicos, geografia, Apps Script, LEADS, CRM, WhatsApp, Calendar e Meta ficam fora.

## Evidência e limites

No recorte de 14/08 a 12/09, `G26FACE` gastou R$ 239,81 em 131 cliques e nenhum lead qualificado atribuído. A frase `cirurgiã plástica em são paulo` concentrou 118 cliques e R$ 215,61, ou 89,9% do gasto da campanha, sem qualificado. Entre os termos pagos divulgados da campanha, a procura nominal por terceiros predominou; contudo, o relatório não traz a palavra acionadora e cobre apenas parte do custo. A decisão é reversível e não transforma a parcela oculta em “tráfego ruim”.

Em `G26CERV`, as quatro novas palavras exatas reproduzem buscas literais que já tiveram de 3 a 11 cliques no período. Elas não ampliam o orçamento de R$ 12/dia, não garantem novo volume e não mudam o destino. Servem para controlar e ler com mais precisão intenções de preço coerentes com a campanha. Perguntar preço continua legítimo e não desqualifica a paciente.

As sugestões automáticas `[procedimento para papada]`, `[estetica papada]` e `[gordura queixo]` não integram o pacote. Também não entram aumento de orçamento, Display, parceiros, Performance Max, Merchant Center, Maximizar conversões, orçamento compartilhado ou remoção em massa de palavras exatas.

## Preflight vivo

Conta autenticada `995-334-4486`, relida em 13/09/2026 às 19h49 BRT. Oito campanhas ativas; total de R$ 103/dia. `S_BR_SP_CIRURGIA_FACIAL` apareceu ativa/qualificada, R$ 8/dia, 131 cliques, R$ 239,81 e zero resultado no recorte. `S_BR_SP_LIFTING_CERVICAL` apareceu ativa/qualificada limitada por volume, R$ 12/dia, 321 cliques, R$ 377,22 e zero resultado. Nenhuma escrita externa ocorreu durante essa leitura.

## Aplicação e readback

Aplicação encerrada e relida em 13/09/2026 às 20h15 BRT, na conta `995-334-4486`:

- `S_BR_SP_CIRURGIA_FACIAL` (`24028168714`) passou de R$ 8 para R$ 4/dia; a própria tabela de campanhas mostrou R$ 4/dia após o salvamento;
- a frase `cirurgiã plástica em são paulo`, em `AG_CIRURGIA_FACIAL`, foi pausada sem exclusão e reapareceu na tabela com status `Pausada`;
- `[lipo de papada valor]` e `[lipo de papada preço]` foram criadas em `AG_LIPO_PAPADA`, correspondência exata, e relidas como `Pendente / Em análise`;
- `[cervicoplastia valor]` foi criada em `AG_CERVICOPLASTIA`, correspondência exata, e relida como `Pendente / Em análise`;
- `[cirurgia de papada preço]` não foi criada: o Google Ads a bloqueou em `Health in personalized advertising`. Nenhuma exceção foi solicitada e nenhum termo mais amplo foi usado como substituto;
- `S_BR_SP_LIFTING_CERVICAL` permaneceu em R$ 12/dia; a tabela final mostrou oito campanhas ativas e total de R$ 99/dia;
- as três recomendações genéricas do Google e todas as demais expansões recusadas no plano continuaram sem aplicação.

O status `Pendente / Em análise` comprova a criação dos três objetos, não a aprovação futura pelo Google. A integridade e a política desses termos precisam ser relidas no ciclo de 24–48 horas. Site, anúncios, URLs, lances, metas, redes, geografia, negativas, LEADS, CRM, Apps Script, WhatsApp, Calendar e Meta não foram alterados. Nenhuma mensagem, consulta, conversão ou linha de lead foi criada por esta execução.

O recibo estruturado está em `PUBLICACAO.json`. A projeção do Plano foi reconciliada com a auditoria paralela de LEADS, substituída no mesmo arquivo Drive `18iUqY6HttJwPusSAA1VGmrMqqRluyjTO` e relida com igualdade exata: 178.082 bytes, SHA-256 `002ec1abe2f287257d3a8fe7519e7258460519557a8ba45106210daa8f78de54`, modificação `2026-09-13T23:17:43.485Z`. Nenhuma segunda cópia de planejamento foi criada.

## Monitoramento e rollback

Integridade em 24–48 horas; leitura de sete dias completos em 21/09 e 14 dias completos em 28/09. A decisão usa termos, contatos válidos, qualificados aceitos e consultas agendadas/realizadas da mesma coorte. Cliques, CTR, CPC e pontuação de otimização são diagnósticos.

Rollback estrito: restaurar somente `G26FACE` para R$ 8/dia, reativar somente a frase pausada e/ou pausar a nova palavra exata que demonstre regressão. Não apagar palavras, histórico, conversões ou dados.
