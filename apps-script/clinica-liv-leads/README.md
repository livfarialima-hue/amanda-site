# Apps Script da Clínica LIV

## Fonte e alvo canônicos

- Código local: `apps-script/clinica-liv-leads`
- Registro de produção: `production-target.json`
- Projeto de produção: usar somente o `scriptId` registrado
- Deployment público: atualizar somente o `deploymentId` registrado
- Planilha operacional: usar somente o `spreadsheetId` registrado

Há projetos no Google Apps Script com o mesmo título. Título, ordem da lista e horário de modificação não identificam produção.

A cópia inativa confirmada no trabalho de 14/08/2026 está registrada em `knownNonProductionProjects` e foi rotulada como `ARQUIVO — NÃO PUBLICAR — Clínica LIV (sem deployment)`. Nenhuma outra cópia foi renomeada, arquivada ou excluída sem confirmação individual.

## Pré-voo obrigatório

Antes de qualquer escrita no editor do Apps Script, copiar os IDs visíveis e executar:

```powershell
npm.cmd run apps-script:verify-target -- --project "URL_DO_EDITOR" --deployment "URL_DO_WEB_APP" --spreadsheet "URL_DA_PLANILHA"
```

O comando precisa terminar com `ALVO CANÔNICO CONFIRMADO`. Qualquer divergência bloqueia a escrita.

## Publicação

1. confirmar que o branch é `reestruturacao-site` e que somente arquivos intencionais estão no commit;
2. executar a suíte integral;
3. obter autorização explícita para publicar;
4. abrir diretamente o `projectUrl` do registro, sem usar a lista de projetos;
5. executar novamente o pré-voo com os três IDs copiados da interface;
6. salvar apenas os arquivos `.gs` ou `.html` alterados;
7. em `Gerenciar implantações`, editar o deployment existente; nunca criar outro;
8. confirmar que o código de implantação continua igual ao canônico;
9. validar HTTP 200, executar o pós-voo necessário e inspecionar a planilha sem acionar mensagens reais;
10. atualizar `lastVerifiedVersion`, `lastVerifiedAt` e o manual operacional no mesmo trabalho.

### Registro da produção atual

- Versão canônica: `101`, publicada no deployment existente em 19/08/2026.
- Escopo da v96: `MetaAdsFunnelReview.gs`, `MetaAdsReview.gs`, `OpportunityStore.gs` e `SyntheticHealth.gs`, com os códigos cervicais `M26C01W/M26C02S`, monitoramento Meta e sonda sintética de atribuição; deployment canônico preservado.
- Escopo da v97: `Code.gs` acrescentou o habilitador administrativo idempotente do schema v1. `aplicarSchemaAtribuicaoV1Autorizado` foi executada com sucesso e não cria um segundo deployment.
- Escopo da v98: `ConsultasSync.gs` reconhece o comprovante estruturado de procedimento, retorno ou consulta, mantém a Dra. Amanda sempre na `Sala 1`, cria novo registro quando o atendimento anterior já está encerrado e preserva a idempotência do mesmo comprovante. O título da Google Agenda contém somente o tipo genérico e o profissional. O deployment canônico foi preservado; código e testes estão no commit técnico `7c8f7d0`.
- Escopo da v99: `ConsultasSync.gs`, `RoomBooking.gs` e `RoomBookingForm.html` incluem `Matheus (ortop)` no formulário privado e limitam suas reservas à `Sala 2`. Se a sala estiver ocupada, a operação falha de forma fechada e nunca usa a `Sala 1`. A automação de WhatsApp continua limitada a Amanda e Daniel. O deployment canônico foi preservado; o estado técnico está no commit `2d51398`.
- Escopo da v100: `Code.gs`, `LeadClassification.gs`, `ConsultasSync.gs` e `Retomadas.gs` expõem o contexto durável da oportunidade a partir de `_WHATSAPP_MENSAGENS`, registram a autoria `paciente`, `bruna` ou `equipe_humana` e gravam as saídas da Bruna sem abrir uma segunda classificação. O deployment canônico foi preservado; o estado técnico está no commit funcional `6fd37c3227e6fee1ca4ea1686248cb22733040f1`.
- Pós-voo da v100: o mesmo deployment respondeu HTTP 200 com `ok: true`; o webhook canônico e a URL imutável do deploy Netlify `6a84facdbed81175d2df0107` responderam HTTP 200 em modo `active`, com planilha, assinatura e OpenAI configurados. A suíte concluiu com `843/843` testes; nenhuma mensagem real foi enviada.
- Escopo da v101: `Code.gs`, `LeadClassification.gs` e `Retomadas.gs` distinguem o prefill estruturado `procedure_evaluation_v1` da intenção pessoal, impedem qualificação, conversão offline e agenda pelo template isolado, preservam perfis comerciais sem saudação nominal e corrigem a aprovação manual de retomadas aberta pelo e-mail diário. O deployment canônico foi preservado; o estado técnico está no commit funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`.
- Pós-voo da v101: os três arquivos publicados foram relidos no editor e ficaram idênticos aos locais por SHA-256; o mesmo deployment permaneceu com o ID canônico e respondeu HTTP 200. O webhook canônico e a URL imutável do deploy Netlify `6a858294fc30270008e0964a` responderam HTTP 200 em modo `active`, com planilha, assinatura, OpenAI, revisão, agenda e exclusão de números internos configuradas. A suíte concluiu com `851/851` testes, build de 178 arquivos e 44 URLs sem erro; nenhuma mensagem real foi enviada.
- Rollback: Apps Script v100, deploy Netlify `6a84facdbed81175d2df0107` e commit `6fd37c3227e6fee1ca4ea1686248cb22733040f1` para retornar ao pacote Bruna `.5`.

## Agregado anônimo para a rotina do Google Ads

- Código: `GoogleAdsFunnelReview.gs`.
- Produção atual: Apps Script versão `101`, publicada no deployment canônico em 19/08/2026. O agregado Google foi introduzido na v92 e preservado nas versões seguintes.
- Destino: planilha separada `1ofyZRGRyo8S90u1Na9FnVUBjVCjoRGicBCkdw4yQOz0`, aba `Agregados`.
- Trigger: `publicarAgregadosFunilGoogleAds`, diariamente aproximadamente às 08:15 BRT, configurado por `configurarRotinaAgregadosFunilGoogleAds()`.
- Fontes internas: `_FUNIL_CANONICO` e `_OPORTUNIDADE_MARCOS`.
- Saída: somente contagens por janela e campanha canônica; sem nome, telefone, mensagem, click ID, Opportunity ID, Event ID ou informação clínica.
- O arquivo agregado pode ser lido pela conta do Google Ads; a planilha LEADS nunca deve ser compartilhada com essa conta.
- Alias legado/ambíguo permanece em `__UNKNOWN_CAMPAIGN__`; não inferir campanha por procedimento ou página.
- Primeira publicação validada: schema v1, zero PII, 16 contatos Google na coorte de 30 dias e os 16 em campanha desconhecida por falta de código G26 canônico; isso é uma limitação de atribuição, não zero de resultado.

Projetos divergentes não devem ser editados, renomeados, arquivados ou excluídos sem autorização específica. Em caso de dúvida, parar antes da escrita externa.

## Agregado anônimo e revisão da Meta Ads

- Agregador: `MetaAdsFunnelReview.gs`; destino no mesmo arquivo de mídia, aba `Meta_Agregados`.
- Revisor: `MetaAdsReview.gs`; somente consultas `GET` da Marketing API e envio de e-mail.
- Segredos: `META_MARKETING_API_TOKEN` e `META_GRAPH_VERSION` somente nas propriedades do projeto. Nunca versionar ou copiar para Drive/planilha.
- Flag: `META_ADS_REVIEW_ENABLED=true` somente depois de `validarAcessoRevisaoMetaAds()`.
- Triggers: `publicarAgregadosFunilMetaAds` aproximadamente às 08:25 e `executarRevisaoMetaAds` aproximadamente às 10:05 BRT.
- Ativação validada em 16/08/2026: agregado com 0% de erro, token permanente limitado a `ads_read`, Graph API `v26.0`, teste recebido por e-mail e uma única instância de cada trigger.
- Versão `97`: todo e-mail enviado pela rotina inclui métricas essenciais de 7 e 30 dias por campanha e o funil anônimo; `M26C01W` e `M26C02S` entram no agregado e nos alertas do ciclo cervical. A validação somente leitura permanece limitada a `ads_read` e sem mutação da conta.
- Privacidade: nenhum nome, telefone, e-mail, mensagem, click ID, `Opportunity ID`, `Event ID` ou informação clínica no agregado/e-mail.
- Taxonomia: `M26F01W` e `M26C01W` resolvem `meta_whatsapp_direct`; `M26F02S` e `M26C02S` resolvem `meta_site_whatsapp`. `M26O01W`, `M26O02W` e aliases desconhecidos permanecem N/D até evidência canônica.
- Manual completo: `campanhas/ROTINA-AUTOMATIZADA-REVISAO-META-ADS.md`.
