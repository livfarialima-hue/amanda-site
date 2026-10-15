# Bruna — referência global e composição transparente

## Estado

Candidato isolado `2026-10-15.4`, ainda não publicado. Daniel pediu referência global com componentes explicados e, em seguida, implementação/publicação. O contrato do projeto exige autorização do SHA testado antes do preflight de release; a autorização ampla não é registrada como aprovação de um SHA ainda inexistente.

Baseline funcional observado: `6c9cb7ee0129260dd0f9394b1d74c0bd49a05228`, Netlify `6ad120701654730b8c969605`, pacote `.2`, publicado em 15/10/2026 às 18:54:29.938Z. A branch operacional contém o candidato `.3` de consumo com publicação bloqueada; esta branch parte da produção e não incorpora suas alterações funcionais. Evidências/documentação posteriores devem ser preservadas na integração, que exige novo teste e autorização se mudar o SHA.

## Alteração revisável

Uma única ressalva, pertencente a `surgical-price-policy.mjs`, é usada pelo construtor de preço e importada pelo prompt:

> É uma referência para planejamento do valor global, não é um orçamento fechado. O valor individual é definido após avaliação, conforme o plano cirúrgico, a equipe, o hospital, a anestesia e os materiais. O orçamento discrimina esses componentes e o que é incluído ou cobrado à parte.

A referência vem antes da explicação. O prompt explica equipe cirúrgica, hospital, anestesia e materiais, sem atribuir preços, inventar inclusões ou somar a tabela histórica. Perguntas sobre componentes exatos, condições individuais e conflitos de valor/composição continuam com a equipe. Esta mudança não é validação financeira de cada orçamento ou de citações históricas humanas; não altera limites numéricos. Um orçamento divergente não pode ser reconciliado por suposição.

O seletor de redação contextual conserva a ressalva global quando ela pertence à prévia atual. O gate final exige a composição atual também quando uma resposta conjunta usa redação livre fora desse seletor. A ressalva histórica permanece reconhecível para memória/revisões atrasadas, mas não autoriza um novo envio sem a composição atual. Três cenários travados de preço conservam IDs, valores, guias, permissões e resultados esperados, atualizando apenas a cópia para o contrato mais estrito. Os dois cenários de preço já existentes no gate hospedado também exigem composição/global, sem aumentar chamadas. Nenhum cenário travado foi removido ou flexibilizado.

## Invariantes

- Valores e regras de permissão por procedimento, escopo de lipo de papada isolada, envio único e consulta separada permanecem.
- Nenhum preço numérico de componente, garantia de teto, “tudo incluído”, pressão, nova referência médica ou promessa de resultado.
- Agenda, confirmação humana, takeover, pausa, opt-out, cuidado ativo, história completa, cadência, modelo, timeout e áudio permanecem.
- Nenhuma mensagem real, replay, mudança de campanha, flag, Sheet, Calendar ou Apps Script. v164 é referência herdada, não inspeção atual do editor.
- A aprovação operacional não é parecer normativo; orçamento individual continua após avaliação e não há faixa pública nova. A ressalva não torna automaticamente regular qualquer mensagem pré-consulta. Limite regulatório já registrado no manual preservado.

## Validação

Testes sintéticos foram acrescentados antes da implementação e falharam no baseline por falta do contrato global. Passaram 2260/2260 testes integrais com `TZ=America/Sao_Paulo`; 19/19 do harness hospedado com transporte simulado; arquitetura, escopo exato e diff. Build: 193 arquivos, 54 URLs, zero auditorias no artefato e zero erros; check técnico aprovado. A primeira execução herdava fuso de Nova York e apresentou cinco divergências temporais; o fuso correto resolveu-as sem alterar agenda/retomadas. Resultados e comandos em `ops/CHANGE-CANDIDATE.json`; as contagens de suítes sobrepostas não se somam. `ops:check` deve manter `SYNC_PENDING` até publicação, verificação e Drive, sem mascarar branch isolada. Nenhuma chamada paga de modelo ou áudio foi executada localmente. Gates hospedados permanecem obrigatórios e pendentes de autorização do SHA.

## Publicação, rollback e acompanhamento

Não publicar a HEAD operacional `.3` como se fosse somente esta alteração. Preparar integração conservadora com recibos atuais, revalidar produção e executar novamente os gates do commit final. Não contornar timeout/release gate ou fazer upload manual de produção. A ordem e as pendências pertencem exclusivamente ao Plano Executivo.

Rollback após publicação autorizada: novo commit/build restrito ao delta de referência global, restaurando comportamento `.2` sem apagar trabalho paralelo, recibos, dados, filas ou flags; sem replay. Smoke não destrutivo imediatamente, integridade em 24h, revisão em D+7. Conferir primeira conversa natural elegível sem induzir teste em paciente. Medir n/N de respostas úteis, dúvidas de composição e consulta, por coorte/procedimento e maturação comparáveis; baseline, efeito de conversão e causalidade atuais são N/D.

Este relatório não é fila de pacientes nem novo plano técnico. Não contém transcrição, nome ou identificador de pessoa.
