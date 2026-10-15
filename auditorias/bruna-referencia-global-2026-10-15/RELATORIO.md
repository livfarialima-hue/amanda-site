# Bruna — referência global e composição transparente

## Estado

Pacote isolado `2026-10-15.4` publicado após Daniel aprovar explicitamente o SHA testado `2fae17f1e0c0903a7d282d93ac7467a786a1fb58`. Netlify `6ad140400f41025d3ef0a3f7`, contexto production, ready em 2026-10-15T21:09:42.941Z. Saúde 200 e assinatura 401 verificadas no domínio e URL imutável em 21:26:20Z. O fechamento documental conserva código e commit funcionais; nenhum novo release é disparado por esses registros.

Baseline funcional: `6c9cb7ee0129260dd0f9394b1d74c0bd49a05228`, Netlify `6ad120701654730b8c969605`, pacote `.2`. A HEAD operacional `458c99d78747f79dbc8f028d799f7c310f19fe1b`, com candidato `.3` bloqueado, foi preservada e relida na branch `codex/bruna-preservada-458c99d-20261015` antes da promoção por lease do SHA aprovado. Recibos de `.2/.3` preservados, sem código `.3` no runtime. O aviso posterior de Daniel sobre trabalho paralelo no desktop exige que o fechamento permaneça isolado até releitura do remoto e avanço compatível; o desktop não foi inspecionado.

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

Testes sintéticos foram acrescentados antes da implementação e falharam no baseline por falta do contrato global. Passaram 2260/2260 testes integrais com `TZ=America/Sao_Paulo`; 19/19 do harness hospedado com transporte simulado; arquitetura, escopo exato e diff. Build: 193 arquivos, 54 URLs, zero auditorias no artefato e zero erros; check técnico aprovado. A primeira execução herdava fuso de Nova York e apresentou cinco divergências temporais; o fuso correto resolveu-as sem alterar agenda/retomadas. Resultados e comandos em `ops/CHANGE-CANDIDATE.json`; as contagens de suítes sobrepostas não se somam. O fechamento exige `ops:check` em branch operacional limpa após reconciliação; a projeção do manual e do Plano foi relida e coincide integralmente com o commit documental registrado no recibo. Nenhuma chamada paga de modelo ou áudio foi executada localmente. O gate hospedado obrigatório participou do build do SHA autorizado, conforme os limites de evidência abaixo.

## Publicação, rollback e acompanhamento

O SHA exato aprovado foi publicado pelo Git/Netlify, sem upload manual ou bypass. O build de produção concluído confirma o gate obrigatório: o contrato desta versão só termina com sucesso após 21 cenários, dois históricos completos e três áudios. Essas contagens são deduzidas da dependência do build, não de leitura direta das linhas do log; latência, consumo e tentativas individuais são N/D. A tentativa de acesso ao painel pediu autenticação, mas o build já havia concluído, dispensando prosseguir no login e sem nova inferência. O sucesso deste candidato não resolve por causalidade o timeout anterior de `.3`. Recibo: `PUBLICACAO.json`. Ordem e pendências somente no Plano Executivo.

Rollback após publicação autorizada: novo commit/build restrito ao delta de referência global, restaurando comportamento `.2` sem apagar trabalho paralelo, recibos, dados, filas ou flags; sem replay. Smoke não destrutivo imediatamente, integridade em 24h, revisão em D+7. Conferir primeira conversa natural elegível sem induzir teste em paciente. Medir n/N de respostas úteis, dúvidas de composição e consulta, por coorte/procedimento e maturação comparáveis; baseline, efeito de conversão e causalidade atuais são N/D.

Este relatório não é fila de pacientes nem novo plano técnico. Não contém transcrição, nome ou identificador de pessoa.
