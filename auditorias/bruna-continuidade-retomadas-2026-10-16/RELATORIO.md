# Continuidade após retomadas — 16/10/2026

Estado: testes locais aprovados; publicação ainda pendente.

Validação:239/239 testes focados e2307/2307 integrais; arquitetura, escopo exato e artefato193arquivos/54páginas aprovados. Os quatro novos cenários cobrem resposta canônica, valor inválido no rascunho, veto semântico e nova atividade humana.

O worker foi executado, mas uma pergunta sobre o valor da avaliação terminou em unapproved_monetary_amount. O alerta entregue confirma a pergunta e o motivo; não preserva o rascunho bruto, portanto a redação exata que disparou o gate permanece desconhecida.

A regressão sintética confirmou uma lacuna: human-resume não oferecia a prévia AMANDA-CONSULTA-INFO-01 já usada no webhook. A correção consome o proprietário patient-replies e o seletor semântico existente, preservando o gate monetário. Valores, espera humana, janela, preferências, pendências, novas mensagens, mídia e agenda mantêm as proteções anteriores.

Três dúvidas administrativas foram respondidas individualmente no WhatsApp Business oficial, com entrega observada. Evidência privada, separada das 76 retomadas. Recusas e encerramentos não autorizam nova insistência. A continuidade única do lote permanece PAUSED. Nenhuma classificação ou conversão de Ads foi inferida dessas respostas.

Validação e publicação: ver PUBLICACAO.json e candidato ativo. Rollback por novo commit/build restrito, sem replay.
