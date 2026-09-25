# Bruna — aceite de cortesia, 25/09/2026

**Estado: testado localmente, publicação autorizada e pendente.** Baseline local 43b978dfb180a2ee9e3d942fcfcbf71b0de2cadd; produção 38f4a0d9ce94ae80c3df91425e8e4260c3b1bcb8 / Netlify 6ab6d50398c196000844f21a.

## Diagnóstico observado

A LEADS canônica confirma a oferta de faixa enviada pela Bruna e a entrada “Por favor” em 25/09 às 16:57:21 BRT, sem saída posterior no histórico consultado. A mensagem chegou normalmente; não foi uma nova desconexão. O log da função ycloud-recovery-background mostra processamento com dois turnos de histórico, resposta semântica human_review / low, alerta interno concluído e completed_no_reply às 16:58:09. O log não revela o raciocínio interno do modelo.

Reprodução local: o reconhecedor aceitava “Sim, por favor”, mas não a cortesia isolada. O plano ficava ai_safety_triage, sem a prévia determinística da faixa oferecida. A correção anterior de relatos pessoais não incluía esse aceite. Nos testes de proteção, também se reproduziu que a expressão “não quero valores” podia contar como nova pergunta de valor devido à presença da palavra valores.

## Correção e fronteiras

- patient-turn-context reconhece formas estritas de pedido cortês. O consumidor continua exigindo a última oferta concreta; a cortesia não inventa o assunto nem uma autorização.
- O plano recupera a faixa do procedimento confirmado, somente quando autorizada e ainda não enviada. A prévia correta chega ao modelo e ao transporte existente. O prompt explica o vínculo de Por favor/Por gentileza à oferta, sem exigir nova permissão ou repetição do procedimento.
- whatsapp-automation exclui a cláusula explícita de recusa de valor ao detectar pedido de quantia, mantendo outra pergunta verdadeira que apareça no mesmo turno.
- Sem oferta, após outro assunto, com recusa, desconto, procedimento diferente ou faixa já enviada, não se libera uma faixa nova. Obrigada isolado não se torna aceite. Informação não confirma consulta, cirurgia ou pagamento.
- A avaliação semântica, a revisão clínica, o cuidado ativo, a prioridade humana, o opt-out, a reserva de envio, a mensagem mais recente e a deduplicação continuam obrigatórios. Não se força resposta quando o modelo identifica risco ou ambiguidade real.

Não há mudança de valores, consultas, agenda, campanhas, Apps Script v160, filas ou cadência. Manual único e política sobem para 2026-09-25.2; modelo e esforço preservados.

## Validação

Dois testes de aceite falharam antes da alteração: enriquecimento do plano e fluxo completo do webhook com provedor simulado. O teste de recusa também falhou antes da correção correspondente. Depois: **152/152 testes focados e 1.694/1.694 integrais**. Dezessete comandos técnicos passaram; ops:check apresentou SYNC_PENDING esperado até publicação, Drive e reconciliação final.

O teste do webhook verifica a prévia LIFTING-PRICE-RANGE-01 fornecida ao modelo, a faixa aprovada facial e uma única resposta, sem repetir apresentação, guia ou pergunta de permissão. Controles negativos cobrem ausência de oferta, última pergunta de outro assunto, recusa, negociação, procedimento não autorizado e faixa já entregue. Aceite de explicação de recuperação também é preservado. Seis cenários adicionais entram na baseline bloqueada. Regressões existentes cobrem humano, cuidado, duplicidade, mudança de procedimento e consumidores.

Os serviços externos são simulados nos testes. Isso prova o contrato e o percurso do código, não garante toda saída de um modelo probabilístico. Nenhuma mensagem real de teste, replay ou intervenção na conversa antiga foi executada.

## Publicação, acompanhamento e reversão

Destino: Netlify canônico, branch reestruturacao-site. Autoridade: solicitação atual de correção em continuidade à autorização de publicação desta tarefa; SHA exato vinculado no preflight externo. PUBLICACAO.json registra o resultado. Plano e manual atualizam os mesmos IDs do Drive, após igualdade do baseline e com releitura/hash após substituição.

Responsável: Daniel/equipe, primeiros aceites elegíveis e revisão em 48 horas. Observar se a oferta aceita é cumprida sem nova pergunta, se a faixa é única e compatível e se recusas continuam respeitadas. Ainda não há observação de um novo caso natural após este pacote. Nenhuma automação de monitoramento criada.

Reverter para Netlify 6ab6d50398c196000844f21a / commit 38f4a0d9ce94ae80c3df91425e8e4260c3b1bcb8 se ocorrer aceite falso, faixa indevida, repetição ou quebra dos controles. Preservar registros, filas e as correções anteriores.
