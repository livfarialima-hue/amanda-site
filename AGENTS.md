# Instruções permanentes do projeto

## Governança entre repositório, Drive e plataformas

Antes de qualquer trabalho que envolva campanhas, site, bot, WhatsApp, planilha LEADS, CRM, Apps Script, atribuição, auditoria, publicação ou monitoramento, leia:

`docs/GOVERNANCA-OPERACIONAL-LOCAL-E-DRIVE.md`

Esse documento define onde cada informação deve ser consultada e alterada. Em resumo:

- o repositório é a fonte canônica de código, estratégia, contratos, testes, runbooks e histórico de execução;
- o Google Drive guarda originais de mídia, exportações, evidências e cópias fechadas de auditorias, sem concorrer com o repositório;
- a planilha LEADS, os gerenciadores de anúncios, o Calendar, o GA4 e as demais plataformas ao vivo são a fonte do estado operacional atual de cada sistema;
- código, estratégia, contratos, planilhas ou auditorias em andamento não devem ser duplicados para criar uma segunda fonte editável;
- toda mudança deve seguir a sequência local, testes, commit intencional, autorização explícita, publicação do commit aprovado, verificação e registro.

Se houver divergência entre uma cópia no Drive e um documento versionado no repositório, o documento local commitado prevalece, salvo para dados operacionais que existam somente na plataforma ao vivo. A divergência deve ser registrada e corrigida, não reconciliada por suposição.

Antes de alterar bot, WhatsApp, funil, retomadas, agenda, atribuição ou integração de marketing, leia também:

`docs/ARQUITETURA-JORNADA-PACIENTE.md`

Antes de implementar qualquer mudança no repositório, leia também:

`docs/CONTRATO-DE-ALTERACAO-SEGURA.md`

Toda mudança deve atualizar `ops/CHANGE-CANDIDATE.json` com baseline, escopo exato, contratos, consumidores, invariantes, preflight vivo, rollback e monitoramento. O arquivo não autoriza publicação. Execute `npm.cmd run change:check` durante o desenvolvimento e novamente antes do commit. Arquivo não declarado, consumidor não coberto ou preflight pendente bloqueiam o avanço; não reduza o escopo no recibo para fazer o gate passar.

Antes de declarar conclusão, execute também `npm.cmd run ops:check`. Um candidato em estado local, testado ou commitado deve manter o resultado `SYNC_PENDING`; somente `published_verified`, acompanhado dos recibos de cada destino externo do pacote, permite afirmar que local, commit, publicação e documentação foram reconciliados.

Esse documento define o proprietário de cada decisão, as fronteiras entre política pura e efeitos externos e os invariantes da jornada. Novos consumidores devem importar cada regra de seu módulo proprietário; reexportações de compatibilidade existem apenas para transição. Toda mudança nesse escopo deve passar por `npm.cmd run change:check` e `npm.cmd run architecture:check` além dos testes pertinentes.

Antes de retomar recomendações de auditorias, executar uma tarefa agendada ou decidir se chegou o momento de publicar, leia também:

`docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md`

Esse é o único painel executivo de pendências, prazos e gates. Matrizes e registros individuais continuam sendo evidência técnica, mas não devem ser usados isoladamente para decidir a próxima execução. Ao concluir, adiar, bloquear ou reverter uma etapa, atualize o painel local e substitua a mesma projeção no Drive; nunca crie um segundo arquivo de planejamento concorrente.

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
