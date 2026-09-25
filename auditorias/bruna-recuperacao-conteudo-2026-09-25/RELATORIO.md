# Recuperacao de conteudo — 25/09/2026

<!-- BRUNA-RECUPERACAO-CONTEUDO-2026-09-25 -->
**Candidata local em validacao — ainda nao publicada.** Corrige a perda local de texto entregue depois de uma entrada indisponivel da mesma mensagem. A fila preserva separadamente os corpos assinados indisponivel/texto; a conclusao antiga nao apaga a versao recuperada. O historico canonico preenche apenas corpo antes vazio, mantendo telefone, direcao, identificador e horario originais; a memoria substitui o marcador indisponivel, sem sobrescrever fala valida. A recuperacao consulta o envio do evento original e nao autoriza resposta repetida, inclusive quando o provedor usa outro event ID para o mesmo wamid. Tomada humana, assinatura, janelas, precos e encaminhamentos preservados. A Meta/YCloud entregou o caso real como unsupported/131060; nao foi comprovado reenvio com texto nesse incidente. A correcao local nao recria conteudo nunca entregue. Registros legados concluidos sem recibo de disponibilidade permanecem fechados; nenhum replay ou saneamento historico. Baseline Netlify 6ab6dae04b46000008d93fec / 1358a1d e Apps Script v160. Evidencias: auditorias/bruna-recuperacao-conteudo-2026-09-25/RELATORIO.md. Revisao das primeiras recuperacoes naturais e em 48 horas, responsavel Daniel/equipe LIV, sem nova automacao.
<!-- /BRUNA-RECUPERACAO-CONTEUDO-2026-09-25 -->

## Evidencia e responsabilidade

A primeira entrega observada no provedor nao continha o corpo textual, com erro 131060. Isso comprova ausencia antes do nosso processamento, nao exclui responsabilidade da integracao. Foram reproduzidas duas falhas na fila (entrada pendente e concluida), duas na memoria (append e hidratacao) e uma no ledger (texto vazio nunca preenchido). Cinco testes falharam antes das respectivas correcoes. O tratamento antigo tambem descartava duplicatas em Code.gs antes de consultar o ledger.

Os cenarios sao sinteticos; nenhum identificador ou conteudo de paciente foi incluído. Nao ha prova de reenvio enriquecido nesse caso real. A origem da omissao na coexistencia permanece dependente de investigacao do provedor. Chamado nao enviado sem autorizacao.

## Validacao

1706/1706 testes integrais e 121 focados passaram, com 18 comandos contratuais, arquitetura, build de 192 arquivos e site:check. ops:check permanece SYNC_PENDING ate publicacao e reconciliacao. Foram conferidas as 27 fontes Apps Script contra o baseline, os tres IDs canonicos e os bytes das duas projecoes do Drive. Nenhuma escrita externa realizada.

## Reversao compativel

Conter a recuperacao se houver regressao. Reverter Code.gs/LeadClassification.gs ao Apps Script v160 e os demais modulos Netlify ao baseline 1358a1d, mantendo o leitor inbound-recovery.mjs desta candidata ate drenar as entradas pending/<hash>/text e /unavailable. Nao restaurar isoladamente o deploy antigo enquanto existirem essas chaves; o leitor antigo nao as reconhece. Preservar historico, assinaturas, recibos e pausas; sem replay manual.

A recuperacao aguarda o lease do worker anterior para impedir duas respostas concorrentes. Consulta tambem recibos das perguntas de esclarecimento e do atendimento fora do horario. Falha nessa leitura mantem a entrada pendente; nenhum envio e autorizado por falta de recibo.
