# Retomada prometida pela manhã — 26/09/2026

**Pacote 2026-09-26.5 — retomada da manhã, TESTADO LOCALMENTE, PUBLICAÇÃO PENDENTE.** Corrige o retorno prometido que ficava pendente após falhas de consulta e interrupção do processamento. A programação de cinco minutos passa a despachar um worker autenticado, mediante ativação exclusiva em produção, que reserva um atendimento por vez. Consultas ao contexto têm até 20 segundos no worker. Falha antes de qualquer tentativa de envio continua recuperável em cinco minutos; após três falhas de contexto, um alerta técnico por evento torna o atraso visível sem encerrar a fila nem mudar o responsável. As checagens de contexto antecedem o marcador de tentativa. Recibo apenas preparado pode ser substituído somente com reserva de saída atual e ainda não tentada; enviado, aceito, incerto ou tentativa legada em andamento permanecem bloqueados. Assinatura, janela, pausa, atendimento humano, mensagens novas, preços e agenda preservados. Não reabre automaticamente os casos já encerrados em revisão humana. Evidência: `auditorias/bruna-retomada-manha-2026-09-26/RELATORIO.md`. Apps Script v161 preservado; publicação e ativação ainda pendentes.

## Evidência e desenho de falha

Consulta autenticada de produção, registros canônicos e alerta técnico confirmaram falhas desde 08h, execução de 30 segundos sem conclusão às 08h30 e revisão por entrega incerta às 09h35. Não há prova de qual chamada interrompeu a primeira tentativa. Duas regressões sintéticas reproduziram o bloqueio por entrega incerta após veto ou exceção na conferência anterior ao provedor. Não foram armazenados dados da paciente.

A maior falha potencial é duplicar resposta ou responder após intervenção. Por isso a publicação não limpa reservas antigas, não reabre filas encerradas e não simula conversa. Recibos de aceitação e tentativa permanecem fechados. Os testes precisam demonstrar recuperação apenas antes do efeito, concorrência, consulta lenta, nova mensagem, opt-out e modo inativo.

## Publicação, rollback e monitoramento

Publicar o commit validado com o worker desativado. Conferir a função e depois ativar a flag somente em produção, seguida de deploy do mesmo commit. Conferir o primeiro ciclo automático, sem chamada manual. Restaurar o deploy 6ab7cb3dd904e20008eabd38 e desligar a flag se houver duplicidade, perda de domínio humano ou falha de autenticação; preservar filas e recibos. Daniel/equipe: primeiras retomadas, 48 horas e sete dias. Pendência antiga continua exigindo conferência da entrega real antes de qualquer ação.

## Validação local

1.793 testes integrais aprovados, incluindo 15 novas regressões; 135 testes focados aprovados. Os 38 comandos de testes, contratos, arquitetura e build passaram. O 39º comando, ops:check, mantém SYNC_PENDING até publicação, ativação e conciliação do Drive. Build: 193 arquivos e 54 URLs, nenhum arquivo de auditoria no artefato. Nenhuma mensagem real de teste ou replay foi enviado.

Revisão do diff: a mudança do marcador de envio mantém as duas conferências de contexto; a segunda ocorre antes da reserva final de tentativa. Recibo aceito/persistido não é substituído. Falha no preparo não prova aceite. Ativação usa o modo global e segredo existentes, com flag específica apenas em produção; o handler anterior permanece como fallback desligado da migração. Não houve alteração dos valores aprovados ou da estratégia de aquisição.
