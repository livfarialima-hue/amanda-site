# Primeiro pedido de faixa com marcador do site — 16/10/2026

## Resultado da investigação

**Falha reproduzida no adaptador:** no primeiro contato sem nome pessoal utilizável, o guard de apresentação acrescentava “Como posso te chamar?” mesmo com maxQuestions=0. Essa pergunta criada pelo próprio código provocava revisão de estilo e podia impedir a resposta aprovada. O guard passa a respeitar o contrato ao acrescentar perguntas, mantendo saudação e apresentação. A regressão usa a prévia integral, sem ajustar o mock para esconder a falha. O motivo bruto do evento natural não foi recuperado; essa reprodução prova o defeito, sem atribuir ao modelo bruto uma decisão não observada.

A mensagem foi ingerida, vinculada à LEADS/CRM e classificada como Novo, com atribuição Google íntegra. Novo é adequado para texto preparado isolado, ainda que seu pedido informativo possa ser respondido. Não há correção de dado nem exportação qualificada indicada.

Na execução natural, a entrada durável foi aceita às02h55Z; o worker concluiu às02h56Z. O resultado do adaptador semântico, após seus guards, foi human_review/high/automaticAllowed=false; a resposta bruta do modelo não foi recuperada. O wrapper gerou deterministic_context_mismatch e encerrou o evento revisado; não tentou resposta à pessoa. Um e-mail de revisão foi entregue. O alerta interno WhatsApp foi aceito inicialmente e depois falhou. Isso é independente de uma resposta à pessoa, que não foi tentada. Não houve bloqueio de madrugada ou tomada humana.

O motivo específico anterior ao wrapper não foi preservado, portanto não se afirma divergência de procedimento. A inspeção comprovou um conflito de instruções: o marcador procedure_evaluation_v1, usado também pelo CTA que pede faixa, induzia abertura genérica sempre, enquanto o proprietário autorizava a faixa pedida. A política estratégica já permitia esse atendimento; não é mudança de preço nem de qualificação. O teste hospedado anterior não cobria esse primeiro contato com template e histórico vazio.

## Correção delimitada

Preservar o marcador de proveniência, transmitir marketingPrefill como booleano do plano e esclarecer no prompt que abertura genérica se aplica à entrada genérica. Pedido explícito só recebe faixa quando o proprietário a aprovou para o procedimento correto, e o modelo ainda precisa confirmar contexto, segurança e completude. Não forçar human_review para envio. Não alterar classificador, thresholds, preço, transporte, janela, recovery ou Apps Script.

O teste de aceitação hospedado acrescenta o primeiro contato e controles genéricos, com fontes sintéticas e adaptador real. Regressões locais verificam os dados transmitidos, a manutenção de Novo e o veto semântico. Pacote novo separado dos recibos15/10; checkout isolado reutilizado e trabalho paralelo revalidado antes da promoção.

## Validação e publicação

Validação local:2303/2303 testes integrais,133 focados e228 independentes sobrepostos. Build/check193arquivos/54URLs; arquitetura e escopo exato15paths aprovados. O modelo real25cenários e áudio3 permanecem no gate hospedado obrigatório. Consultar PREFLIGHT.json, ops/CHANGE-CANDIDATE.json e PUBLICACAO.json. Só recibos externos e readback encerram o pacote. Nenhuma mensagem real de teste, replay ou alteração operacional foi executada. O contato original depende de resposta humana contextual e deve ser conferido novamente antes de contato no horário combinado.

## Monitoramento e reversão

Conferir primeira entrada natural e integridade em48h; revisão22/10 por respostas pertinentes, silêncio, revisão indevida, duplicidade e consultas comprovadas. Não atribuir causalidade com uma observação. Reverter somente este delta em novo commit/build para o baseline funcional4a21792, preservando v165, dados, atribuição e recibos. Pausa global, recarga, envio de retomadas e novos agendamentos não integram a correção.
