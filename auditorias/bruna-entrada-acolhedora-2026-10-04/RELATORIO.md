# Entrada sem conteúdo e acolhimento — 04/10/2026

Estado: em implementação local.

O ledger e o evento canônicos registram entrada sem texto e sem referência; o print mostra texto no aplicativo. O evento original na YCloud ainda requer sessão autenticada, portanto a causa upstream não está confirmada. A fila local reconhecia menos envelopes que o próprio extrator do webhook, podendo rejeitar uma versão enriquecida em formato já suportado.

Escopo: compartilhar exclusivamente a leitura pura já existente entre entrada e recuperação; manter identidade, horário, assinatura, corpo original e envio único. Se nada legível estiver disponível, acolher a primeira interação com apresentação breve e pergunta aberta, sem falar de falha técnica. Conversa conhecida e profissional diferente de Amanda mantêm seu contexto. Uma pergunta posterior de preço pede somente o procedimento faltante. Não extrair a fala da pessoa do texto do anúncio.

Validação e publicação pendentes. Sem PII, mensagem real, replay, mudança de valores, flags, estratégia, Apps Script ou dados de pacientes.

## Bloqueio de ambiente durante a validação

A suíte integral passou em 1.921/1.921 testes. Dos 49 comandos exigidos, 48 passaram; somente `site:build` permanece pendente por ENOSPC. Nenhum commit ou deploy deste pacote foi realizado. A exclusão da cópia temporária de build anterior foi autorizada por Daniel, mas a revisão automática continuou bloqueando essa ação. Não houve exclusão. Compressão transparente de arquivos gerados/dependências preservou todos os hashes conferidos e liberou aproximadamente 9 MB, insuficientes para concluir o build. Foi solicitada liberação manual de espaço. Os 24 arquivos do escopo foram conferidos e nenhum está vazio; os logs temporários interrompidos foram refeitos. Após liberar espaço, repetir o build, registrar o resultado e continuar preflight, commit, publicação e projeções.

## Validação local

1.921 testes integrais, 21 novos casos e 49 comandos do contrato aprovados; arquitetura, build de 193 arquivos/54 URLs, verificação técnica e diff aprovados. Doze falhas reproduziram antes da correção os seis casos de envelopes na recuperação e os comportamentos antigos de abertura/continuação. A validação completa também exigiu atualizar a expectativa antiga de reenvio no teste cruzado de preço em background.

Cobertura: webhook assinado com ausência de texto, perfil comercial, história já iniciada, paciente conhecida, profissional diferente, modo off/shadow, takeover, opt-out, cuidado ativo e conteúdo cervical disponível. SDK instalado verifica os três envelopes aninhados nos estados pendente/concluído, identidade divergente, preservação de texto conhecido, worker antigo e rejeição de mídia/reação/anúncio/erro como suposto texto recuperado. Nenhuma mensagem real ou replay foi enviado.

Projeções existentes do Drive coincidem com o baseline por leitura integral e SHA-256. A causa do incidente permanece não atribuída sem o evento original; a correção local não representa prova de recuperação desse contato. Não há mudança da estratégia comercial, regras clínicas, Apps Script, cadência ou valores. Produção e repositório só serão reconciliados após os recibos externos completos.

## Ambiente desbloqueado

Na retomada autorizada com “Publique”, o disco apresentou 1,3 GB livres e a cópia temporária antiga estava ausente. O agente não a excluiu. O build foi repetido com sucesso: 193 arquivos, 54 URLs, nenhum arquivo de auditoria no artefato e nenhum erro. Os 49 comandos exigidos estão aprovados. Nenhum arquivo do escopo foi truncado pelo ENOSPC. O bloqueio de ambiente está encerrado.
