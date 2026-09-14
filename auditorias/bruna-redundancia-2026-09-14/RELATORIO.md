# Bruna — continuidade sem repetição

A principal correção é geral: cada resposta deve aproveitar o que a pessoa informou e acrescentar algo útil. O caso apresentado é uma regressão de uma sequência mais ampla, não uma regra exclusiva para pescoço.

O histórico vivo confirma três explicações sobre avaliação e uma resposta da paciente dividida em duas mensagens. A defesa anterior comparava similaridade textual principalmente com a última resposta; a reformulação do mesmo conteúdo passava. O prompt também sugeria repetir a sequência de microvalor e próximo passo.

A nova política pura resume assuntos já explicados, última pergunta, resposta complementar e ofertas anteriores. A geração usa esse contexto; a saída remove redundância conhecida preservando fatos novos, valores, prazos e ressalvas necessárias. Um rascunho integralmente repetitivo admite uma única revisão, dentro do mesmo timeout de oito segundos. Se não houver resposta útil segura, mantém contexto para revisão humana sem enviar texto vazio ou repetir o evento.

Validação local: 1573/1573 testes integrais, 19/19 do proprietário e 399/399 entre consumidores; change:check e architecture:check OK. Build com 193 arquivos e 54 URLs; site:check OK. A reprodução inicial apresentou oito falhas em dez cenários. Publicação pendente. Nenhuma mensagem real de teste ou replay.

A mesma informação continua permitida quando a pessoa pede uma nova explicação. Pedido explícito de reenvio de link do site passa também no gate final; envio espontâneo de recurso repetido continua bloqueado. Essa exceção não libera faixas cirúrgicas repetidas.

Limites: o índice usa histórico limitado e famílias conservadoras de conteúdo, não comprova compreensão integral nem elimina toda repetição semântica. A revisão opcional compartilha o prazo de oito segundos e pode encaminhar para humano quando não sobra tempo ou não há resposta segura útil. Os testes de geração e envio usam respostas simuladas; a publicação não mede ganho de conversão.

Rollback: commit b924bc0854a79929f09136936b90e9457c1c1288, deploy 6aa854c90a4310d49417bd44; dados e Apps Script v153 preservados. Revisões em 16/09 e 21/09 às 19h BRT: repetição, dúvidas atendidas, perda de informação, revisões, latência, takeover, duplicidade e consultas com evidência.
