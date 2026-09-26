# Bruna — perguntas conjuntas

<!-- BRUNA-PERGUNTAS-CONJUNTAS-2026-09-26 -->
**Pacote 2026-09-26.3 — CANDIDATO LOCAL; publicação autorizada por Daniel, ainda pendente.** Cada pergunta do bloco sobre consulta, cirurgia, convênio, atendimento online e relatório de reembolso recebe uma resposta confirmada, um esclarecimento essencial ou uma pendência específica. Consulta presencial R$ 500 e atendimento particular com nota fiscal são fatos confirmados. Atendimento online, seu valor e emissão de relatório exigem confirmação da equipe; nenhuma garantia de reembolso. Essas pendências só podem gerar promessa ao paciente depois do alerta entregue.

Consulta e cirurgia podem ter seus valores na mesma resposta exclusivamente quando ambas foram pedidas, com procedimento confirmado, faixa já aprovada, ressalvas e envio único. Lifting sem especificação não é convertido em facial pela idade ou pela flacidez: esclarecer rosto/pescoço, respeitando a prioridade descrita. Perguntas não contempladas pela prévia impedem sua seleção automática. Webhook e retomada após atendimento humano usam o mesmo compositor, com avaliação semântica, janela, preferência humana e gate final preservados.

Evidência: exemplo do usuário anonimizado; reprodução local de seleção isolada do convênio, bloqueio de consulta junto da faixa cirúrgica e inferência de lifting facial. Não auditamos autoria ou entrega da conversa original ao vivo. Hipótese: responder cada ponto evita intervenção e favorece continuidade; conversão ainda não medida. Daniel/equipe: conferir primeiras conversas naturais, rever em 28/09 e 03/10/2026. Medir perguntas cobertas, pendências resolvidas, intervenções, qualificados e consultas confirmadas/realizadas. Conter diante de valor indevido, promessa não confirmada, pergunta perdida, duplicidade ou perda de prioridade humana.

Rollback: Netlify 6ab7b1e5c8225e00080535dd / fe879a6093d97a405320665fde667fb254dde4aa; preservar Apps Script v161, dados, filas e pausas. Sem replay, conversa artificial ou contato antigo. Recibos: auditorias/bruna-perguntas-conjuntas-2026-09-26/.
<!-- /BRUNA-PERGUNTAS-CONJUNTAS-2026-09-26 -->


## Diagnóstico e limites

O bloco de cinco mensagens estava completo no coalescedor sintético, mas o plano escolhia insurance_acceptance_request e podia omitir consulta, online, relatório e cirurgia. A resposta com consulta R$500 junto da faixa cervical aprovada era bloqueada como unapproved_monetary_amount. A palavra lifting sozinha podia herdar lifting_facial mesmo com relato prioritário de pescoço. Não há evidência de que o texto deste print tenha sido truncado pelo provedor ou de que essa tenha sido a causa exata do silêncio ao vivo.

## Verificação

Validação local concluída em 2026-09-26T12:55:46.598Z: 1.763/1.763 testes integrais, incluindo 26 novas regressões (17 de política/composição/gate, cinco do processador de retomada e quatro do webhook real com rede simulada). 28 comandos obrigatórios aprovados, mais ops:check em SYNC_PENDING antes da publicação. Build: 193 arquivos, 54 URLs no sitemap, zero erros e zero auditorias no artefato. Revisão integral do diff e escopo de 29 arquivos verificados. Falha de aviso à equipe conserva aiActiveStatus=failed no webhook e alert_retry_pending na retomada; a recuperação existente repete de forma controlada, sem promessa nem mensagem parcial. Nenhuma mensagem real de teste, replay ou reescrita de conversa. Primeiro caso natural e resultado de conversão ainda não observados.
