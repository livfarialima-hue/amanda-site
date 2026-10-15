# Plano executivo — auditorias, pendências e prazos

Versão pública revisada em 14/10/2026 com autorização do responsável. O conteúdo integral anterior foi preservado como histórico fechado em área restrita. Esta edição remove contatos, gastos, identificadores de contas/campanhas e registros operacionais detalhados; não cancela decisões ou pendências anteriores. Não altera permissões de arquivos nem apaga o histórico Git já existente.

## Execução autorizada pendente

### Google Ads — comunicação e destinos, 15/10/2026

**Testado localmente; publicação autorizada pelo usuário, preflight vivo concluído e aplicação pendente.** Lote limitado a três destinos de sitelinks, 13 campos de três anúncios e duas URLs de palavras existentes de preço de blefaroplastia. Sem mudança de orçamento, lance, meta, segmentação, palavras novas/negativas, site ou atendimento. Recibos e escopo exato: `auditorias/google-ads-comunicacao-2026-10-15/`. Identidade, campos anteriores, consumidores dos recursos e estado das campanhas foram relidos; destinos públicos conferidos e 13 campos de RSA comparados independentemente. Os limites constam no recibo de preflight. Não há escrita externa nem equivalência de produção declarada.

Próxima ação: concluir commit/gate para o escopo validado, aplicar somente o delta e reler, preservando o baseline vivo; interromper o objeto se surgir alteração concorrente. Depois substituir a mesma projeção deste Plano no Drive, com igualdade comprovada. Essa sincronização continua pendente. Daniel/equipe: integridade imediatamente/D+2 e contatos válidos, qualificados e consultas em D+14/D+28 da aplicação real, com maturação comparável. Reversão restrita ao before vivo do campo afetado; nenhuma automação nova. Publicações anteriores abaixo ficam preservadas.

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
| Comunicação e destinos no Google Ads | Lote específico testado e autorizado; preflight concluído | Commit/gate, aplicação dos campos declarados e readback; preservar orçamentos e lances |
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
