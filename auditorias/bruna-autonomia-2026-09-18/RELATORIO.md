# Bruna — continuidade, autonomia administrativa e classificação

Status: publicação intermediária 49ebec0 / Apps Script v156 concluída; ajuste de busca por reserva exata em validação. Fechamento operacional e projeções ainda pendentes.

## Diagnóstico verificado

A comparação das 333 linhas visíveis com o CRM mostrou igualdade de etapa, responsável e parte aguardada. A fila tinha 338 registros: quatro falhas terminais após oito tentativas com `max_attempts_exceeded:reaper_requeued:expired_lease`, cinco órfãos históricos e uma espera por conteúdo. A biblioteca revisável estava vazia. Havia 26 compromissos pendentes; em 11 oportunidades a indicação de espera era da paciente, o que exige contexto individual e não autoriza encerramento automático.

Testes simulados comprovaram a reabertura de pergunta comercial antiga após pausa, ausência de proteção contra objeção financeira superada, falha de reconhecimento de aceites usuais e permanência de responsável humano em perguntas administrativas sem obrigação ativa. Os 27 arquivos Apps Script foram comparados integralmente à produção e coincidiram. O estado vivo foi consultado por conectores; não foram incluídas transcrições ou identificadores de pacientes neste relatório.

## Implementação

1. Reserva com request ID temporário, reutilizado na tentativa após timeout, e resposta com a mesma lease. O cliente antigo continua aceito. O caminho novo evita reler o arquivo de incidentes sob a trava da reserva; o reaper completo continua disponível. Uma migração única, delimitada por datas, erro, identidade e estado canônico, pode reabrir até os quatro registros técnicos conhecidos. Fase e campos manuais são relidos pela classificação normal, sem reescrita em massa.
2. Intenção recente: pausa explícita substitui ação comercial antiga; agradecimento posterior não reabre a conversa. Restrição financeira pode ser retirada por declaração posterior de resolução e reaparece se houver nova barreira. Pergunta isolada de parcelamento não confirma prontidão para agenda.
3. Contexto de pendências chega ao classificador e é relido antes da gravação. Pergunta administrativa isolada pode recuperar elegibilidade da Bruna após contexto operacional conferido, sem cuidado ativo, compromisso pendente ou humano recente. A fase incerta não avança. Responsável explicitamente manual continua humano. Elegibilidade não equivale a envio: preferências, janela, takeover e todos os gates de saída seguem vigentes.
4. Compromissos ganham Opportunity ID, Profissional e Request ID em colunas adicionais. O vínculo recebido é conferido no CRM. Deduplicação usa evento ou solicitação exata, preservando pedidos diferentes no mesmo telefone. Dados legados ficam intactos; compromisso sem vínculo permanece conservador. Resolução continua exigindo identificador exato e motivo, sem baixar uma tarefa por agradecimento.
5. Aceites naturais cumprem a oferta anterior com os fatos aprovados do procedimento correto. Condição, correção, nova pergunta ou recusa não são aceites. A pausa na retomada sobrevive à cortesia posterior. Cadência, templates e número máximo de contatos permanecem no contrato existente.
6. Cinco respostas administrativas versionadas, derivadas do contrato vigente em `patient-replies.mjs`, são projetadas em Respostas Aprovadas: localização, valor, pagamento da consulta, funcionamento da avaliação e atendimento particular/reembolso. A inicialização relê o conteúdo, aceita repetição idempotente e falha diante de edição ou regra concorrente. Não acrescenta indicação, orçamento cirúrgico ou condição de parcelamento nova.

A Central separa revisão técnica da obrigação de responder e preserva ambas quando coexistem. Retomadas.gs foi normalizado para LF conforme a política do repositório; as diferenças semânticas são as descritas acima.

## Validação e publicação

237 testes focados, 1.607 testes integrais e 16 grupos de consumidores aprovados. Arquitetura, contrato de mudança, build e conferência do artefato passaram. O estado e os recibos finais serão registrados em PUBLICACAO.json.

Ordem: Apps Script compatível no deployment existente; cliente Netlify do mesmo commit; biblioteca e extensão dos compromissos; recuperação técnica limitada; leitura de verificação; sincronização dos documentos no Drive.

## Limites e reversão

Não se promete redução medida de intervenção ou aumento de conversão antes de observar novas conversas. Não se encerra por inferência nenhuma das 26 tarefas humanas antigas. Falhas órfãs de agosto e conteúdo ausente permanecem conferência operacional, fora da recuperação delimitada.

Rollback: Apps Script v155 e Netlify 6aac860da2c8aa0008212017. Colunas adicionais são compatíveis com o leitor antigo. A biblioteca nova pode ser retirada do snapshot ativo sem apagar dados. Não há replay de mensagens. Revisar primeira execução e em 48 horas; conter diante de identidade incorreta, perda de compromisso real, mensagem após recusa ou duplicidade.

## Falha revelada pelo primeiro ciclo

Os registros de execução, disponibilizados com atraso pelo provedor, mostraram conclusão do modelo em menos de um minuto, seguida de `stale_lease`. Cada uma das quatro oportunidades tinha uma linha histórica anterior e uma posterior já concluída. A reserva selecionava a primeira; a conclusão e a liberação buscavam a última por oportunidade. O ajuste exige correspondência única de token, oportunidade, telefone e profissional, preservando os gates de versão e revisão da conversa. Testes reproduziram a escolha da linha errada antes da correção e conferem a preservação da linha histórica. Limites totais de espera e registros por etapa são proteção adicional, sem dados de pacientes nos logs. A migração única não será repetida.
