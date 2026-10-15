# Plano executivo — auditorias, pendências e prazos

## Publicação bloqueada — respostas e retomadas de 15/10

O commit 51e57c69 foi autorizado em 15/10, mas o preflight encontrou registros paralelos do Google Ads no remoto 20d4b5be antes de qualquer envio. A integração preserva esses registros e mantém código, testes e manifesto Bruna idênticos ao aprovado. Nenhum novo deploy foi iniciado; o commit integrado aguarda autorização exata. A produção anterior continua ativa.

A segunda tentativa autorizada, commit 94f066e / deploy 6ad0abedf8ca5991c929014d, foi bloqueada em 15/10/2026 às 07:35:39 (America/Sao_Paulo), antes de publicar. Passaram 15 dos 16 cenários executados, incluindo os dois históricos, e os três áudios; eram exigidos 21 cenários. A resposta de preço de teleconsulta estava correta, mas o modelo colocou consulta_online no campo procedure, cujo valor esperado era unknown. O gate de saída aceitou a mensagem, porém o gate de qualidade rejeitou a classificação. A correção explicita no prompt e no schema que modalidade pertence ao assunto da conversa e não substitui procedimento conhecido; parser, rótulos livres, prazos, retries e critérios de aprovação são preservados. A primeira tentativa e a limitação do diagnóstico anterior permanecem no recibo. Produção segue no deploy 6acff7b9dc7d30f39ad66b31 / commit cbda0cf. Recibo: auditorias/bruna-respostas-retomadas-2026-10-14/TENTATIVA-PUBLICACAO.json. A correção passou nos 2.207 testes integrais, nos 1.533 testes dos 74 arquivos de contratos e nos 19 testes simulados do gate, além do build e dos checks locais. O novo commit exato exige autorização antes da próxima publicação e ainda precisa passar pelos 21 cenários vivos.

Pacote 2026-10-14.5, ainda sem publicação. Corrigir perguntas conjuntas de procedimento/recuperação/preço e incorporar exclusivamente a faixa de lipo de papada isolada autorizada pelo responsável. Preservar oferta de informações úteis, revisão clínica, confirmação semântica e envio único. Baseline local b77b1d6 e deploy vigente 6acff7b9dc7d30f39ad66b31; Apps Script v164 preservado.

**15/10, manhã — Daniel/equipe:** conferir primeiro esclarecimentos administrativos de consulta iminente, retorno prometido para a manhã e promessas anteriores sem resposta. Validar com Amanda preço ou material individual pendente e entregar informação concreta. Após isso, considerar somente continuidades individuais justificadas; excluir pausa, recusa, cuidado ativo e convites recentes. Registros e identidades permanecem na Central/CRM privados. Não transformar cartões manuais antigos em lote automático. Não existe autorização de envio por este registro.

**Gates:** testes focados/cruzados/integrais e revisão independente; commit; autorização de publicação do pacote; preflight vivo; modelo/áudio/histórico; publicação e equivalência; projeção neste mesmo arquivo do Drive. Até lá, SYNC_PENDING. Relatório: auditorias/bruna-respostas-retomadas-2026-10-14/RELATORIO.md.

**Revisão:** 15/10 para obrigações; 48h após eventual publicação e 22/10 para completude, promessas, duplicidade e contato indevido. Manter abordagem somente com continuidade útil; corrigir qualquer mistura de preço/procedimento ou insistência. As orientações individuais foram registradas apenas em Observação da equipe na Central canônica, com identidade e histórico relidos antes da escrita e igualdade dos demais campos verificada depois. Pausas e recusa preservadas. Nenhuma campanha, flag, gatilho, fila, agenda ou mensagem foi alterada por esse planejamento.


Versão pública revisada em 14/10/2026 com autorização do responsável. O conteúdo integral anterior foi preservado como histórico fechado em área restrita. Esta edição remove contatos, gastos, identificadores de contas/campanhas e registros operacionais detalhados; não cancela decisões ou pendências anteriores. Não altera permissões de arquivos nem apaga o histórico Git já existente.

## Google Ads — configuração publicada e acompanhamento

### Comunicação e destinos, 15/10/2026

**Publicado e conferido no Google Ads em 15/10/2026.** Três destinos de sitelinks corrigidos em quatro associações existentes, 13 campos de três anúncios e duas URLs de palavras existentes de preço de blefaroplastia. Todos os campos foram salvos, reabertos e comparados ao lote aprovado; QA independente aprovada. Commit autorizado `2f5adbecb3712e99786cbf91acfa32510103b975`, com gate do HEAD exato antes das escritas. Recibos: `auditorias/google-ads-comunicacao-2026-10-15/REVISAO.json`.

Orçamentos, lances e estados das campanhas preservados; nenhuma palavra nova/negativa, associação adicional ou reativação. Identificação médica, fixações, demais textos, URLs de RSA e atribuição preservados. Sem alteração de site, atendimento ou dados. Três anúncios relidos Ativado/Qualificada, com indicador de qualidade Pendente, distinto do status de política. Duas palavras ativadas: ficaram Pendente/Em análise após editar o destino e, na releitura das 10:31 UTC, voltaram a Qualificada (limitada), raramente mostrado por baixo Índice de qualidade já preexistente. Não há alegação de exibição ou ganho comercial.

Daniel/equipe: conferir integridade e política em **17/10/2026**; avaliar contatos válidos, qualificados e consultas em **29/10/2026** e **12/11/2026**, com maturação e cobertura comparáveis. Baixa amostra continua inconclusiva. Restaurar somente o campo responsável ao before vivo diante de erro, reprovação atribuível ao delta ou regressão consistente, preservando histórico. Nenhuma automação nova.

O fechamento documental do componente Ads exige substituir esta mesma projeção no Drive, baixar novamente e comprovar igualdade; o resultado efetivo fica no recibo, sem criar planejamento concorrente. O candidato Bruna acima permanece sem publicação: a autorização Ads não o abrange, e o estado operacional global continua SYNC_PENDING até seu próprio fechamento autorizado. Publicações anteriores abaixo permanecem preservadas.

## Publicação verificada

### Site — continuidade e guia de preço, 14/10/2026

**Publicado e verificado em 14/10/2026; commit cbda0cf.** Pacote restrito ao site: convites e mensagens do WhatsApp coerentes, destinos de seção, navegação estrutural única e abertura breve do guia de preço de lifting. As mensagens não presumem leitura nem reserva; códigos, consentimento e distinção de intenção são preservados. Nenhuma alteração de campanhas, atendimento automático, preços, Apps Script ou dados.

Base: a2dc468942a74639bebb3f12489db79007ea4863, com produção funcional 4869b38a51d55b76176cf2b1cf8021c4f2ea46be / 6acfecf0d71ca630f8f9469a preservada. Novo deploy do site: 6acff7b9dc7d30f39ad66b31, publicado em 2026-10-14T21:47:42.198Z. Recibos técnicos: auditorias/site-continuidade-2026-10-14/. Os 61 arquivos públicos alterados foram verificados no domínio e na URL imutável: 55 por igualdade exata e seis com a mesma reescrita de URL da hospedagem comprovada no deploy anterior, sem mudar destino ou conteúdo. Passaram 2.175 testes integrais, quatro novos testes runtime, 19 cenários hospedados de modelo e três áudios sintéticos. Preservadas 15 funções e seis rotinas. Conferência mobile, links, mensagem inicial e navegação concluída; nenhuma mensagem enviada. A igualdade da projeção existente no Drive é registrada no recibo de publicação.

Daniel/equipe: integridade imediata e em 21/10/2026; avaliação comercial em 11/11/2026 por etapas reais, com maturação equivalente. Reparos e abertura compõem um pacote, sem prova causal individual. Reverter somente esse pacote via novo commit/build diante de destino errado, perda de atribuição, mensagem incompatível ou informação indevida. Nenhuma automação nova.

### Atendimento — publicação anterior preservada

**2026-10-14.4 — publicado e verificado em 14/10/2026 às 18:01:55, America/Sao_Paulo.** O pacote impede que contexto remoto se transforme em consulta presencial por omissão. A confirmação estruturada consulta o histórico antes da sincronização. Áudio pode bloquear uma reserva conflitante, mas não autoriza identidade, data, hora ou aceite. A mensagem remota informa o horário de São Paulo e que o acesso precisa ser confirmado pela equipe.

O código de atendimento permaneceu idêntico ao candidato já testado; a revisão adicional é documental. Passaram 2.170 testes integrais, 58 focados incluídos nesse total e a união de contratos de 1.572 testes, com sobreposição. Contrato, arquitetura, build e diff passaram. Os 19 cenários hospedados de modelo, incluindo histórico completo, e os três áudios sintéticos passaram e continuam obrigatórios no build de produção.

Commit funcional: 4869b38a51d55b76176cf2b1cf8021c4f2ea46be. Deploy funcional: 6acfecf0d71ca630f8f9469a. Produção, alias da branch e URL imutável responderam HTTP 200; webhook sem assinatura foi recusado com HTTP 401. Foram preservadas 15 funções e seis rotinas agendadas. Nenhuma mensagem a paciente foi enviada pelos testes. Apps Script v164 não foi alterado.

Nenhum envio a paciente, convite, mudança de preço, campanha, flag, schema ou Apps Script integra este pacote. Este registro contém somente escopo técnico e resultados de testes sintéticos.

## Baseline verificado

Os identificadores abaixo são referências de releases públicos de software, já presentes na versão pública anterior deste arquivo. Não são credenciais, IDs de contas privadas nem identificadores de pessoas. Foram conferidos por leitura HTTP sem autenticação do baseline Git público.

- Pacote publicado antes desta mudança: 2026-10-14.3.
- Commit funcional: bed7810a3dda4bbef39913edc48999b5a31aa06d.
- Deploy funcional: 6acf8f3d0c1fdf2d868cceb3.
- Apps Script: versão 164, sem alteração neste pacote.
- Baseline de reversão registrado pelo release anterior: bbf297da98946badd4460989064e4f2636f1211c / 6acf71e94079694bfc8221a4.
- Reversão desta mudança: novo commit equivalente ao baseline funcional acima, pela integração Git, preservando dados, filas, recibos e Apps Script; sem replay.

## Prioridades e próximas ações

| Tema | Estado | Próxima ação |
|---|---|---|
| Modalidade de consulta | Publicado e verificado | Observar primeira confirmação natural e revisar as 48 horas após a publicação |
| Integridade da agenda | Contrato preservado | Exigir identidade, consentimento e modalidade inequívocos antes de qualquer efeito |
| Outras pendências operacionais | Fora deste registro público | Consultar as fontes restritas antes de definir qualquer ação |
| Comunicação e destinos no Google Ads | Publicado e relido; análise e qualidade em estados distintos | Integridade/política em 17/10; etapas comerciais em 29/10 e 12/11; recibo de igualdade documental obrigatório |
| Conteúdos e imagens | Revisão conforme fonte | Preservar consentimento e revisão clínica, sem supor aprovação |
| Histórico anterior | Arquivo restrito fechado | Revalidar pendências nas fontes atuais antes de retomar a execução |

As decisões anteriores de aquisição, mídia, conteúdo, agenda e atribuição não são declaradas concluídas por esta limpeza documental. O norte estratégico e as plataformas ao vivo continuam sendo as fontes dos respectivos assuntos.

## Critérios de publicação

1. Escopo isolado, autorização explícita, worktree limpo e commit exato aprovado.
2. Testes do proprietário, consumidores e contratos; suíte integral, arquitetura, build e diff aprovados.
3. Alvo de produção revalidado; nenhuma mudança concorrente desconhecida.
4. Nenhuma informação pessoal, contato interno, credencial ou detalhe financeiro privado no payload público.
5. Gates hospedados preservados; falha impede publicação, sem ampliar prazo ou reduzir asserções para passar.
6. Verificação após publicar e recibos reais, incluindo equivalência das projeções documentais existentes.

Uma limitação que não é modificada pelo pacote continua explicitamente pendente. Identidade, consentimento, profissional, disponibilidade ou modalidade ambíguos impedem o efeito correspondente. Reserva não comprova comparecimento; saída registrada não comprova entrega; publicação não comprova melhora clínica ou de conversão.

## Monitoramento e reversão

Observar a primeira confirmação natural e revisar após 48 horas. Esperado: zero confirmação com modalidade conflitante, zero duplicidade e prioridade humana preservada. Encaminhamentos adicionais por ambiguidade são previstos. Interromper a aplicação do comportamento por correção via Git diante de regressão comprovada; não apagar dados, filas ou recibos.

## Manutenção

Este é o painel executivo ativo. Após execução, atualizar estado, evidência e próxima ação no mesmo arquivo; substituir a projeção existente no Drive e registrar a igualdade. O histórico restrito é uma cópia fechada de evidência, não um segundo planejamento editável. Não criar CRM, fila, calendário ou planejamento concorrente.

Contratos: docs/CONTRATO-DE-ALTERACAO-SEGURA.md e docs/ARQUITETURA-JORNADA-PACIENTE.md. Recibos deste pacote: auditorias/bruna-confirmacao-modalidade-2026-10-14/. Informações de pacientes e decisões individuais permanecem nas fontes privadas.
