# Recuperacao de conteudo — 25/09/2026

<!-- BRUNA-RECUPERACAO-CONTEUDO-2026-09-25 -->
**PUBLICADO E VERIFICADO em 25/09/2026, 18:41 BRT.** Commit funcional 1920658fa469b640099d3d4908e01945097cbaf3, Netlify 6ab6ea73cea89200081ef8d5 e Apps Script v161 no deployment canonico. Corrige falhas locais reproduzidas na fila, na memoria e no historico: texto entregue depois para a mesma mensagem pode preencher apenas conteudo antes indisponivel, conservando identidade e horario originais. Os corpos assinados sao preservados separadamente; a conclusao antiga nao apaga a versao recuperada. A recuperacao aguarda o processamento anterior e consulta seus recibos para nao repetir resposta, inclusive quando o provedor usa outro event ID para o mesmo wamid. Texto valido, atendimento humano, assinaturas, janelas e precos preservados.

Validacao: 1.706 testes integrais e 121 focados sem falhas; 18 comandos contratuais, arquitetura, build e verificacoes publicas. Treze funcoes, cinco programacoes e 192 arquivos preservados. Dominio e URL imutavel respondem 200, automacao active, entrada duravel e assinatura ativa; pedido sem assinatura retorna 401. Apps Script v161 e fontes salvas conferidos; requisicao sem segredo rejeitada. Nenhuma mensagem real de teste, replay ou reescrita de conversas antigas. Registros legados concluidos sem recibo de disponibilidade permanecem fechados.

Limite da evidencia: a entrega original na Meta/YCloud veio como unsupported/131060, sem corpo; nao foi comprovado reenvio enriquecido nesse incidente. A correcao local nao recria texto nunca entregue. Primeira recuperacao natural ainda nao observada. Conferir os primeiros casos e revisar ate 27/09/2026, 18:41 BRT, responsavel Daniel/equipe LIV. Chamado ao provedor nao enviado sem autorizacao especifica.

Rollback: baseline 1358a1d / Netlify 6ab6dae04b46000008d93fec e Apps Script v160, com restricao obrigatoria: manter o leitor inbound-recovery.mjs deste pacote ate drenar as novas chaves pending/<hash>/text e /unavailable. Nao restaurar isoladamente o deploy antigo enquanto existirem essas entradas. Preservar assinaturas, recibos e pausas, sem replay manual. Evidencias e recibos: auditorias/bruna-recuperacao-conteudo-2026-09-25/RELATORIO.md e PUBLICACAO.json. Plano e manual sao projetados nos mesmos IDs do Drive e comparados byte a byte antes do fechamento.
<!-- /BRUNA-RECUPERACAO-CONTEUDO-2026-09-25 -->

## Evidencia e responsabilidade

A primeira entrega observada no provedor nao continha o corpo textual, com erro 131060. Isso comprova ausencia antes do nosso processamento, nao exclui responsabilidade da integracao. Foram reproduzidas duas falhas na fila (entrada pendente e concluida), duas na memoria (append e hidratacao) e uma no ledger (texto vazio nunca preenchido). Cinco testes falharam antes das respectivas correcoes. O tratamento antigo tambem descartava duplicatas em Code.gs antes de consultar o ledger.

Os cenarios sao sinteticos; nenhum identificador ou conteudo de paciente foi incluído. Nao ha prova de reenvio enriquecido nesse caso real. A origem da omissao na coexistencia permanece dependente de investigacao do provedor. Chamado nao enviado sem autorizacao.

## Validacao

1706/1706 testes integrais e 121 focados passaram, com 18 comandos contratuais, arquitetura, build de 192 arquivos e site:check. ops:check permanece SYNC_PENDING ate concluir a reconciliacao documental. Foram conferidas as 27 fontes Apps Script contra o baseline, os tres IDs canonicos e os bytes das duas projecoes do Drive. Publicacao autorizada realizada somente depois do commit e preflight; nenhum envio real ou alteracao manual de dados de pacientes.

## Reversao compativel

Conter a recuperacao se houver regressao. Reverter Code.gs/LeadClassification.gs ao Apps Script v160 e os demais modulos Netlify ao baseline 1358a1d, mantendo o leitor inbound-recovery.mjs desta candidata ate drenar as entradas pending/<hash>/text e /unavailable. Nao restaurar isoladamente o deploy antigo enquanto existirem essas chaves; o leitor antigo nao as reconhece. Preservar historico, assinaturas, recibos e pausas; sem replay manual.

A recuperacao aguarda o lease do worker anterior para impedir duas respostas concorrentes. Consulta tambem recibos das perguntas de esclarecimento e do atendimento fora do horario. Falha nessa leitura mantem a entrada pendente; nenhum envio e autorizado por falta de recibo.
