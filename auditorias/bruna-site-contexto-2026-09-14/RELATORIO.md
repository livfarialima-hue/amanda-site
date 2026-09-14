# Bruna — continuidade entre site e WhatsApp

**Pacote 2026-09-14.2 — PUBLICADO E ATIVO em 14/09/2026 às 17:11 BRT.** Commit funcional `b924bc0854a79929f09136936b90e9457c1c1288`, Netlify `6aa854c90a4310d49417bd44`; Apps Script v153 preservado. Ref. SITE deixa de ser interpretada como pedido de link; a passagem pelo site é mantida mesmo com origem comercial Google/Meta. A Bruna responde no WhatsApp e faz uma pergunta pertinente ao objetivo da pessoa, sem devolução espontânea à página de origem ou coleta prematura de horários. Pedido explícito de material, seção ou reenvio permite a URL pertinente; Maps e guias de preço aprovados permanecem aplicáveis. Gate final retira frase de página repetida não solicitada antes do envio e do histórico; resposta vazia continua bloqueada. Validação: 1.551/1.551 testes, 30/30 do proprietário e 360/360 entre consumidores; 13 funções, cinco programações e 192 arquivos estáticos conferidos. Domínio e URL imutável HTTP 200 em active; requisições sem autenticação HTTP 401. Pausa controlada da automação durante ativação: 75 segundos; impacto em contatos durante a pausa não foi estabelecido. Nenhuma mensagem real de teste ou replay. Recibo: `auditorias/bruna-site-contexto-2026-09-14/PUBLICACAO.json`. Rollback: `9c44c9389e63f4f4c6200c0cd059171488c3d890`, Netlify `6aa81deec1740500082bb22c`, preservando dados e Apps Script v153. Hipótese: reduzir atrito e favorecer continuidade; não há ganho de conversão medido. Revisões em 16/09 e 21/09 às 17h30 BRT: links repetidos, dúvidas respondidas, silêncio indevido, intervenção humana, qualificados e consultas com evidência própria. Manter se a repetição cair sem perda de resposta; conter diante de regressão de takeover, agenda ou entrega. Sem nova automação.

## Causa confirmada e alteração

O registro operacional de 14/09, às 16h51, confirma uma entrada com Ref. SITE e uma saída da Bruna contendo a mesma página. O detector tratava a palavra SITE do identificador como pedido explícito. Além disso, a recomendação dependia apenas da categoria de atribuição, que pode ser Google/Meta em uma visita ao site. A nova política distingue essas dimensões sem reclassificar campanhas ou leads.

A proteção é compartilhada pelo contexto enviado à IA, pela detecção de intenção, pelo fallback de consulta e pelo gate de saída. Referência SITE e histórico identificam páginas já conhecidas; normalização considera www, query, barra final, pontuação e âncoras. A frase removida não entra no histórico como entregue. O envio e a gravação usam o mesmo texto, com deduplicação preservada.

Exemplo de continuação adequada: explicar brevemente a avaliação individual e então perguntar “O que você gostaria de melhorar ou preservar no rosto?”. Se a preocupação já foi informada, responder à dúvida pendente sem repetir a pergunta. Isso não confirma indicação, preço, prontidão ou agendamento.

## Evidência e limites

A reprodução anterior apresentou 10 falhas em 11 cenários. Após correção: 30/30 do proprietário, 360/360 entre consumidores, 1.551/1.551 integrais. Gates de mudança e arquitetura OK; build com 193 arquivos/54 URLs, check técnico OK. Testes sintéticos confirmam preservação de pedido explícito, resposta útil, igualdade entre texto enviado e gravado, bloqueio de saída vazia e ausência de replay. O envio foi simulado; nenhum contato foi usado para testar.

Produção verificada por commit, hashes das funções, cinco programações, igualdade dos 192 arquivos estáticos e sondas HTTP. Não houve execução manual de rotinas de contato. A API administrativa apresentou respostas transitórias 429 e foi relida antes de prosseguir; nenhuma mutação incerta foi repetida.

Histórico é limitado; ausência de referência ou URL não autoriza inventar navegação. Não há comprovação de melhora de conversão nesta publicação. Não foi reenviada resposta ao contato do anexo.

## Destinos canônicos

Netlify: 6aa854c90a4310d49417bd44, SHA b924bc0854a79929f09136936b90e9457c1c1288. Apps Script v153 e deployment canônico preservados; nenhum código Apps Script foi alterado. Plano e manual são atualizados nos mesmos IDs do Drive, com releitura e igualdade byte a byte registradas no recibo. Esta é uma cópia fechada de evidência, não um segundo plano editável.
