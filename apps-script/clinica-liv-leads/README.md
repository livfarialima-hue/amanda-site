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

## Agregado anônimo para a rotina do Google Ads

- Código: `GoogleAdsFunnelReview.gs`.
- Produção: Apps Script versão `92`, publicada no deployment canônico em 15/08/2026.
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
- Privacidade: nenhum nome, telefone, e-mail, mensagem, click ID, `Opportunity ID`, `Event ID` ou informação clínica no agregado/e-mail.
- Taxonomia: somente `M26F01W` resolve `meta_whatsapp_direct` e somente `M26F02S` resolve `meta_site_whatsapp` no contrato v1. `M26O01W`, `M26O02W` e aliases desconhecidos permanecem N/D.
- Manual completo: `campanhas/ROTINA-AUTOMATIZADA-REVISAO-META-ADS.md`.
