# Google Ads — comunicação e destinos, 15/10/2026

**Estado: testado localmente, com publicação autorizada pelo usuário e preflight vivo concluído com limites explícitos. Commit e gate de publicação pendentes; nenhuma mudança externa foi aplicada.**

O pacote executa somente o lote prioritário apresentado para revisão: corrigir três destinos de sitelinks, ajustar 13 campos de três anúncios de blefaroplastia/cervicoplastia/lipo de papada e levar duas palavras exatas existentes de preço de blefaroplastia ao guia correspondente. O antes exportado e o depois exato estão em `PLANO.json`; a execução depende de comparar cada objeto ao vivo antes de salvar.

## Motivo e hipótese

Os sitelinks de consulta e segurança devem abrir conteúdo pertinente à sua promessa. Os anúncios devem explicar o próprio procedimento e suas limitações sem repetir os mesmos diferenciais em todos os campos. A busca explícita de preço deve encontrar composição do orçamento e avaliação, sem prometer faixa automática privada ou orçamento individual remoto. A hipótese é reduzir atrito até contato útil; ainda não há ganho comercial demonstrado.

## Limites preservados

Preservar orçamento, lance, status de campanha/grupo/palavra, metas e conversões, públicos, geografia, redes, horários e recomendações automáticas. Sem palavras novas, negativas ou exclusões. Manter identificação médica e descrição fixada, demais títulos/descrições, URLs de RSA, parâmetros e sufixos. As propostas de reserva para lifting facial, otoplastia e destaques não integram a autorização deste lote. Site, atendimento, dados e demais plataformas permanecem fora do pacote.

## Fonte e divergências

A proposta deriva dos exports fornecidos para 14/07–13/10/2026 e da estratégia canônica. Eles provam apenas o snapshot: não permitem identificar associações atuais de recursos nem substituir o before vivo. A releitura atual confirmou seis campanhas ativas e duas finalizadas, coerentes com a proposta; isso explica a diferença diante do total do registro histórico. Preservar o estado vivo confirmado e os valores documentados privadamente, sem restaurar orçamento ou reativar campanhas. A exata histórica de preço de blefaroplastia ausente no export não será recriada por suposição.

O coordenador concluiu o preflight da conta e de todos os objetos do lote. Os três recursos cobrem quatro associações existentes; os 13 campos dos três RSAs passaram por comparação independente e as duas palavras foram conferidas com opções de URL/rastreamento. `PREFLIGHT.json` registra os limites, inclusive ausência de nova auditoria da mensuração herdada ou de dados privados. Identificadores privados, relatórios brutos e dados comerciais não são incorporados ao material público. Nenhuma observação nova de LEADS/CRM é afirmada.

## Aplicação e reversão

Confirmar identidade, hierarquia e todos os consumidores do recurso compartilhado. Antes igual ao depois: não escrever de novo. Before diferente da proposta: registrar a divergência e revisar antes de salvar. Não reativar associação cervical pausada em otoplastia, multiplicar sitelinks equivalentes ou ampliar associação. Preservar todo campo fora do delta. Timeout exige releitura antes de repetição. Salvar e reabrir cada objeto; aprovação de política, elegibilidade e veiculação são estados posteriores distintos.

Reverter somente o campo responsável ao before vivo, incluindo campo de URL vazio, sem apagar palavra, anúncio, histórico ou alterações paralelas. A documentação e o commit registram a configuração aprovada, mas não comprovam escrita ou exibição na plataforma.

## Verificação e acompanhamento

O recibo local `REVISAO.json` distingue verificações executadas de pendentes. `change:check` verifica escopo e cobertura; um resultado local verde não sana preflight ausente. O candidato está `tested_local`, e o fechamento operacional deve manter `SYNC_PENDING` enquanto faltarem publicação/readback e igualdade da projeção existente do Plano no Drive.

Daniel/equipe: integridade e política imediatamente e em D+2 após aplicação real; comparar contatos válidos, qualificados, consultas agendadas e realizadas em D+14 e D+28 por coortes com maturação e cobertura de classificação equivalentes. Baixa amostra permanece inconclusiva. Cliques, CTR, CPC e força do anúncio são diagnósticos. Mudanças simultâneas do site e atendimento impedem atribuir causalidade isolada a uma frase. Nenhuma automação nova foi criada.

Validação local em 15/10/2026: 2.175 testes integrais e 192 focados (incluídos no total) aprovados; contrato com nove arquivos exatos, arquitetura, diff, build de 193 arquivos/54 URLs e verificação do artefato aprovados. Nenhum arquivo de auditoria integra o artefato do site. `ops:check` retorna `SYNC_PENDING`, com candidato testado localmente, branch de desenvolvimento e worktree ainda sem commit. Esses resultados não comprovam publicação no Ads nem autorização do Google.
