# Instruções permanentes do projeto

## Fonte canônica da estratégia

Antes de analisar, propor ou executar qualquer mudança que afete Google Ads, posicionamento de aquisição, público, orçamento, estrutura de campanhas, conversões, lances, páginas de destino, qualificação, preço ou passagem do lead para consulta, leia:

`campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`

Se a decisão estratégica for alterada, atualize esse documento no mesmo trabalho. Registre a mudança no histórico com motivo, evidência, hipótese, métrica, data de revisão e regra para manter ou reverter.

Os outros arquivos de campanhas, site e WhatsApp são documentos de execução ou histórico. Eles podem detalhar a implementação, mas não devem criar um norte estratégico concorrente. Em caso de divergência, o documento canônico prevalece e a inconsistência deve ser corrigida.

## Alvos canônicos de produção

Antes de editar, executar ou publicar o Apps Script da Clínica LIV, leia:

- `apps-script/clinica-liv-leads/production-target.json`
- `apps-script/clinica-liv-leads/README.md`

É obrigatório validar os três IDs canônicos com `npm.cmd run apps-script:verify-target -- --project <URL-ou-ID> --deployment <URL-ou-ID> --spreadsheet <URL-ou-ID>` antes da primeira escrita externa da tarefa.

Nunca escolha um projeto pelo título, pela posição na lista ou pela data da última modificação. Existem cópias com o mesmo título. Se o ID do projeto, do deployment ou da planilha divergir do registro canônico, interrompa a publicação e não edite, renomeie, arquive ou exclua o alvo divergente.

Toda publicação autorizada deve preservar o deployment canônico, atualizar `lastVerifiedVersion` e `lastVerifiedAt` no registro, registrar a versão no manual operacional, executar os testes pertinentes e manter código local, commit e produção equivalentes. Publicação continua exigindo autorização explícita do usuário.
