# Bruna — consumo por categoria, sem inferência adicional

Data: 15/10/2026, America/Sao_Paulo. Candidato BRUNA-CONSUMO-CATEGORIAS-2026-10-15, pacote 2026-10-15.3. Baseline local 426ea79829045dc85b2eee0563097e4e0be95e3d; produção 6c9cb7ee0129260dd0f9394b1d74c0bd49a05228, deploy 6ad120701654730b8c969605. Apps Script 164 preservado por recibo anterior; editor não reinspecionado. Desenvolvimento local autorizado; publicação deste pacote não autorizada.

## Objetivo

Tornar mensuráveis duas categorias antes de decidir onde a conta/plugin pode substituir API. Não há economia demonstrada nesta entrega. A skill da Bruna determinou reutilizar os recibos existentes, sem inferência paga para medir consumo e sem desativar execução operacional antes de provar substituição.

## Escopo

- knowledge-candidate.mjs: uma tentativa real de extração administrativa, sem alterar aceitação/rejeição nem captura canônica.
- scheduled-followup-context-review.mjs: uma tentativa real de revisão, sem transformar log em autorização de envio.
- ai-usage.mjs e operational-log.mjs reutilizados, sem mudança de schema ou persistência.
- Testes dedicados com fetch/logger simulados; nenhuma mensagem, replay, agenda, CRM, LEADS ou inferência paga executada para testar o candidato.

## Contrato de medição

category=ai_usage, reason=execution_recorded; source=knowledge_inference ou followup_review_inference. Model é a constante existente. UUID aleatório passa pelo correlacionador existente. Campos permitidos: estágio, resultado enumerado, duração, HTTP e contadores numéricos retornados pelo provedor. Não registrar pergunta, resposta, rascunho, erro bruto, procedimento, nome, telefone, oportunidade, request ID do provedor ou URL.

Tentativa começa imediatamente antes de fetch. Pré-condições ou serialização inválidas antes da chamada não contam. Capturar usage antes de validar o conteúdo. HTTP, rede, timeout, JSON inválido e incompleto preservam uso desconhecido/parcial. Log síncrono ou assíncrono falho não muda retorno ou provoca retry; não é aguardado.

No adaptador de conhecimento, completed significa resposta com status completed cujo JSON foi parseado e passou pelo validador sem exceção; inclui rejeições por conteúdo não reutilizável ou envelope insuficiente (por exemplo, {}). Não é prova de schema válido, qualidade, aprovação ou conhecimento aplicado. Na revisão de retomada, completed exige decisão normalizada válida, podendo ser um veto; nunca significa mensagem enviada. A decisão operacional permanece intacta. Os códigos legados retornados pela revisão permanecem, mesmo quando o recibo numérico distingue melhor um TimeoutError ou JSON externo inválido.

## Leitura pelo plugin

A versão 1.0.1 já prioriza a conta para revisão e propostas. Reutilizar somente recibos realmente disponíveis, agregados deterministicamente por source/model/janela. Somar knownUsage OU attempts, nunca ambos. Deduplicar apenas correlação válida; lc1-k1-unavailable não identifica todos como uma mesma execução. Separar logs de build/testes e runtime. Medição dos casos dispensados, disponibilidade, retenção, completude de logs e valor monetário faturado são N/D até verificação operacional específica. Não prometer coleta automática, persistência durável ou painel já existente.

## Verificação planejada

Sucesso com uso completo, parcial e ausente; HTTP não-OK (429); fetch/corpo com erro comum, AbortError e TimeoutError; JSON externo/interno inválido; resposta incompleta; rejeição de conhecimento e veto de retomada; logger que lança/rejeita; pré-condições sem chamada; exatamente um fetch por tentativa; payloads/retornos preservados e recibos sem conteúdo sensível. Executar proprietários, consumidores e suíte integral, change:check, architecture:check, site e ops:check.

## Resultado verificado localmente

Conferido em 2026-10-15T19:04:34Z: 2287/2287 testes integrais, 106/106 focados e 73/73 da revisão independente; 33 testes novos. As contagens se sobrepõem e não devem ser somadas. Harness offline 19/19, sem API real. Comparação SHA-256 do request.body contra baseline 426ea798, headers e timers confirma preservação nos cenários sintéticos. Os retornos legados são comparados separadamente dos outcomes de telemetria.

change:check: escopo exato de 11 arquivos; architecture:check e diff limpos. Build de 193 arquivos, 54 URLs, 0 arquivos de auditoria/operacionais expostos; site:check OK. Revisão independente sem bloqueadores. Testes sintéticos não provam retenção/cobertura dos logs em produção.

Candidato tested_local, entrega restrita a commit local intencional no worktree codex/bruna-coerencia-conta-20261015. Commit não equivale a publicação. A branch canônica reestruturacao-site permanece no fechamento 426ea798 e na publicação anterior reconciliada. Não fazer push/merge/deploy desta fatia sem aprovação do novo SHA; ops:check desta fatia deve permanecer pendente.

## Próximo passo e limites

Não alterar classificação de cinco minutos, áudio, modelo, esforço, história, mensagens, plugin ou automações nesta fatia. Áudio exige recibo por unidade adequada, não tokens fictícios. Aprendizado pela conta depende de separar captura durável da resposta humana da extração; proposta hoje é pré-condição do capture. Ponte futura exige identidade opaca, revisão, expiração, idempotência, autenticação, revalidação no servidor e ausência de fallback pago silencioso. Não ativada.

## Publicação e reversão

Nova autorização do commit é obrigatória. Futuro release mantém gates hospedados e verifica produção antes de registrar economia ou migração. Rollback por novo revert/build restrito à telemetria; não apagar logs, dados, conhecimento, filas ou recibos. Após futura publicação, revisar 24h e 7 dias com janelas/volume comparáveis; divergência operacional ou dado sensível exige interromper o pacote. Ordem executiva permanece exclusivamente no Plano Executivo.
