# Mensagens fragmentadas — 26/09/2026

Status: testada localmente; publicação pendente.

Cada fragmento autenticado passa a entrar na memória compartilhada antes do despacho para processamento, mantendo a fila assinada e LEADS canônicos. Depois da pausa existente, o controlador relê e reúne as entradas pendentes antes da decisão semântica. O marcador usa escrita condicional para impedir que processamento antigo substitua mensagem nova; reprocessamento do mesmo evento não reinicia a pausa, e empate no segundo do provedor não devolve a vez ao evento antigo. Leitura ou gravação indisponível permanece recuperável. Sem nova cadência, alteração de preço, agenda, takeover, opt-out, Apps Script ou envio de testes a pacientes.

## Evidência

O exemplo enviado já era anterior à publicação 2026-09-26.3; a imagem não permite atribuir a demora a um motivo operacional específico. A investigação encontrou fragilidades reproduzíveis no código: contexto preenchido somente após append_lead, contexto inicial anterior à pausa, marcador sujeito a concorrência e reinício da pausa em retry. Quatro regressões falharam antes da implementação (38/42 passaram) e passaram após a correção. Casos adicionais cobrem empate de timestamp, conflito persistente, limites de histórico, autoria humana e integração completa com a resposta de perguntas conjuntas.

## Critérios

Preservar todas as entradas aceitas no cache existente antes do despacho; ordenar pelo evento; manter política de bloco até 8 turnos/1900 caracteres e histórico restante até 32 turnos, sem mudar limites nesta correção; uma resposta consolidada quando as entradas ainda estiverem sem resposta; nova entrada cancela a resposta antiga pelos gates existentes. O bloco não cruza uma resposta da clínica, campanha ou adiamento. Sem transformar aceite HTTP em prova de entrega à paciente.

## Rollback e acompanhamento

Restaurar Netlify 6ab7c11ced13e90009556ee4 / d3df40c136c51c0c83bc2a07e3145f99c1032f09, sem apagar filas, histórico ou dados. Conferir nas próximas conversas naturais cobertura, ausência de repetição e de respostas atrasadas. Daniel/equipe LIV: primeiras conversas, 48 horas e sete dias; conter se ocorrer duplicidade, perda de contexto ou conflito com humano. Nenhuma automação de monitoramento criada.

## Validação local

1.778 testes passaram, incluindo 15 novos casos. 30 comandos exigidos concluídos sem falhas. Build e verificação do site passaram. ops:check retorna SYNC_PENDING até a publicação e igualdade das projeções.
