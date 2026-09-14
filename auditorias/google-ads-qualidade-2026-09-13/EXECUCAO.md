# Qualidade dos anúncios — 13/09/2026

Pedido de Daniel: aplicar as sugestões específicas de cada anúncio. Preparação concluída para 17 RSAs em oito campanhas: onze deltas de texto, seis textos preservados e quatro associações de recursos existentes em duas campanhas.

O banco REVISAO.json contém antes/depois e os IDs vivos. PUBLICACAO.json receberá o SHA do candidato, leituras de cada anúncio salvo, recursos associados e comparação da mesma projeção do plano no Drive.

Sem mutação externa neste estado inicial. A primeira gravação depende dos gates locais e release preflight vinculado ao pedido explícito já recebido. Aprovação de política e resultado comercial são verificados separadamente.

## Primeira passagem e refinamento

Onze RSAs salvos e relidos e quatro associações existentes confirmadas. Os textos dos dois anúncios de lifting facial, blefaroplastia, três preços MAMA/CORPO e otoplastia infantil alcançaram Excelente. CERV e Adulto foram de Médio para Bom; a expansão dos termos mostrou flacidez/platismoplastia e preço/valor de orelha ainda ausentes. Dois complementos foram testados em rascunhos, ambos Excelente, e registrados no banco antes do segundo save. Os dois anúncios gerais de prótese e lipoaspiração mantêm avaliação Ruim apesar dos termos específicos incorporados e não mostram a lista de palavras-chave no editor; investigar o contexto antes de alterar qualquer segmentação.

## Resultado verificado

Onze anúncios alterados e relidos integralmente; seis textos preservados. Quatro associações de sitelinks existentes salvas em duas campanhas. Os complementos CERV/Adulto passaram a Excelente e foram novamente salvos/relidos. Total dos editores:15 Excelente e2 Ruim. Dois grupos gerais de mama/lipo têm zero palavras-chave qualificadas e exigem revisão própria, registrada no plano; não foi alterada segmentação.

Primeiro preflight:8abe57d8fc3cc8355a84c5868da7d02301627137, 00:33:40Z. Complementos:bd2ca37eff20e2607b787d0752ffd16975d133f2, 00:53:00Z. Ambos vinculados ao pedido explícito já recebido, gates OK. Novo teste editorial5/5, regressões164/164, suíte1481/1481, arquitetura e changecheck OK, build193arquivos/54rotas sem erro. Sem deploy de site ou Apps Script.

Releitura final dos oito orçamentos:105/dia, LIFT30. Aprovação de política e resultados clínicos/comerciais permanecem medições separadas. Mesmo arquivo do plano no Drive será substituído e relido; não criar nova fonte.

## Rechecagem em 13/09, 22h10 BRT

Daniel pediu tentar deixar todos Excelente. A tabela dos 17 anúncios mostrou onze Excelente, três Bom e três Pendente. Os quatro editores de redução mamária e preço de lipo/prótese/mastopexia foram abertos: todos Excelente, com as cinco categorias altas. Os dois gerais de prótese e lipo continuam Ruim; as palavras de cada grupo foram conferidas com filtro ativadas/pausadas. Há somente duas frases pausadas em cada um, correspondentes aos termos de preço já roteados aos grupos próprios. O seletor de ideias não fornece palavras para o geral de prótese. Isso não prova a causa matemática da nota, mas elimina a hipótese de apenas faltar copiar uma sugestão específica. Nenhum anúncio ou palavra foi alterado, reativado, pausado ou excluído nesta rechecagem. Quinze Excelente confirmados por tabela/editor; dezessete Excelente não alcançados.

Para a pergunta sobre Maximizar conversões no cervical, o relatório de 14/08 a 12/09 mostrou 5.724 impressões, 321 cliques, R$377,22 e uma conversão no modelo atual, rotulada Lead qualificado (Site). Configurações abertas confirmaram Maximizar cliques, R$12/dia e meta Lead qualificado GCLID — campanhas. Recomenda-se manter o lance atual enquanto o piloto facial e o sinal qualificado são acompanhados. Isso não declara um mínimo obrigatório do Google nem converte registro da plataforma em consulta ou aceite de toda a fila LEADS. A conta foi relida em R$105/dia, LIFT R$30.

Pendência de inspeção das palavras concluída, sem reabrir segmentação. Integridade em14–15/09 e métricas de negócio em21/09 e28/09 preservadas; nenhuma automação nova. O pacote atual é apenas o registro desta leitura e a substituição da mesma projeção do plano no Drive. O recibo estruturado está em PUBLICACAO.json → readOnlyRecheck.

Registro validado:164/164 testes focados e de consumidores, 1.481/1.481 integrais, arquitetura/escopo/diff OK, build com193 arquivos e54 rotas sem erro. O candidato 58ab543d1b60b45e10dc25bd92180d8366cdc0c6 passou pelo preflight documental. A mesma projeção do Drive foi substituída às 2026-09-14T01:13:48.542Z e relida integralmente equivalente, 182213 bytes, SHA-256 local b34a5828cd64f305c6100950531bcaacd328bae47949e7992b303a294cb2f0e8. Nenhuma nova escrita no Google Ads ou publicação de site/Apps Script. Fechamento depende apenas da reconciliação da branch canônica e ops:check.
