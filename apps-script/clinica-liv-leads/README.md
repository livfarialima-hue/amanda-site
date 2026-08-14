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

Projetos divergentes não devem ser editados, renomeados, arquivados ou excluídos sem autorização específica. Em caso de dúvida, parar antes da escrita externa.
