# Google Ads — piloto de Maximizar conversões em lifting facial

**Estado:** aplicado e relido no Google Ads em 13/09/2026 às 21h04–21h05 BRT; candidato aprovado `ba7314888ddb8226a227c72328bf0374c5c3c05a`.

**Conta:** `995-334-4486 — Dra Amanda Schroeder`

**Campanha:** `S_BR_SP_LIFTING_FACIAL` (`G26LIFT`, ID `24028216444`)

## Alteração autorizada

Daniel autorizou executar os ajustes recomendados e, em seguida, definiu o orçamento exato: `pode aumentar para 30 o orçamento`.

O pacote fica limitado a:

- trocar `G26LIFT` de **Maximizar cliques** para **Maximizar conversões**;
- deixar **CPA desejado sem valor**;
- elevar o orçamento médio diário de **R$ 24 para R$ 30**;
- confirmar o total da conta de **R$ 99 para R$ 105/dia**.

A sugestão automática de **R$ 47/dia** não integra a autorização. Nenhuma outra campanha, recomendação automática, palavra, anúncio, recurso, meta, rede, público, local, horário, dispositivo, página, integração ou atendimento entra no pacote.

## Primeira tentativa — evidência histórica

A planilha LEADS canônica foi lida sem escrita. A saúde operacional apresentou diferença zero entre eventos marcados e exportados, zero conflito de click ID e zero divergência entre funil ativo e canônico. Há sete eventos em estado `ready`, mas o registro local não comprova que o Google Ads os aceitou ou atribuiu. Na coorte de `G26LIFT` de 14/08 a 12/09, os sete contatos identificados continuam em `Novo`, sem qualificado ou consulta registrada; ausência de classificação não equivale a perda.

O último recibo verificado da conta, de 13/09 às 20h15 BRT, registra oito campanhas e R$ 99/dia; `G26LIFT` permanece documentada em R$ 24/dia e Maximizar cliques. Esse recibo é baseline registrado, não substitui a releitura viva imediatamente anterior à mudança.

## Bloqueio da primeira tentativa, antes de qualquer escrita

O controlador autenticado falhou antes de inicializar a leitura do Google Ads, tanto pelo controlador CUA quanto pelo runtime `@oai/sky`, inclusive após reinicialização:

```text
failed to write kernel assets: The system cannot find the path specified. (os error 3)
```

Por isso, o preflight vivo da conta não foi concluído e **nenhuma escrita externa foi feita**. O ajuste não deve ser aplicado por outro navegador, CLI, API ou automação sem primeiro recuperar o controle autenticado e repetir a leitura completa.

## Sequência autorizada de retomada

A retomada executada em 13/09/2026 seguiu esta sequência:

1. confirmar conta e campanha pelos IDs;
2. reler status, orçamento, lance, ausência de CPA, meta qualificada, ação de conversão, gasto recente, recomendações automáticas e histórico de mudanças;
3. confirmar que os outros sete orçamentos somam R$ 75/dia;
4. aplicar somente as duas mudanças autorizadas;
5. reler `G26LIFT` em Maximizar conversões, sem CPA, R$ 30/dia, e a conta em R$ 105/dia;
6. registrar recibo, horário real de ativação e novas datas D+7, D+14 e D+28.

Rollback, caso algum guardrail falhe: restaurar somente `G26LIFT` para Maximizar cliques sem teto de CPC e R$ 24/dia, com releitura do total de R$ 99/dia. Não apagar histórico nem alterar outro objeto.

## Retomada aplicada e verificada

Daniel autorizou explicitamente retomar `ba73148`, testar o acesso e aplicar Maximizar conversões sem CPA desejado e R$ 30/dia. O Chrome autenticado voltou a funcionar. O preflight do SHA completo passou com worktree limpo e os nove arquivos aprovados antes da primeira escrita externa.

A releitura viva confirmou `G26LIFT` ativa em Maximizar cliques sem teto de CPC, orçamento individual de R$ 24/dia, meta específica `Lead qualificado GCLID — campanhas`, oito campanhas e R$ 99/dia. A ação `Lead qualificado GCLID` é principal e tem uma conversão registrada na conta entre 14/08 e 12/09; a última foi em 01/09. O aviso é `Requer atenção / Não há conversões recentes` e ausência de dados recentes em conversões otimizadas. Isso não prova aceite dos sete eventos ready da LEADS. No mesmo período, LIFT gastou R$ 750,13 em 574 cliques e 6.216 impressões. Zero rascunhos e aplicação automática em 0/7 e 0/14.

Foram salvos exclusivamente a estratégia **Maximizar conversões**, sem CPA desejado ou portfólio, e o orçamento médio de **R$ 30/dia**. Após salvar, o campo de lance foi reaberto e mostrou Maximizar conversões aplicado apenas à campanha, sem CPA. O orçamento apareceu em R$ 30 no editor e, após nova navegação, na tabela. O estado passou a **Qualificada (aprendizado)**. A meta permaneceu igual.

A releitura dos oito orçamentos confirmou: LIFT 30; BLEF 23; OTO 15; CERV 12; FACE 4; MARCA 5; CORPO 8; MAMA 8. **Total R$ 105/dia**, com os outros sete inalterados. O histórico foi consultado antes e depois; na atualização imediatamente posterior ainda exibia como último registro o pacote cervical de 20h07, por isso não se atribui a ele confirmação das novas duas entradas. A confirmação desta execução vem dos campos persistidos e da tabela recarregada; rever propagação do histórico na janela de integridade.

O piloto começou no horário verificado de 13/09 às 21h04 BRT. Integridade: 14 e 15/09. Leituras de negócio no mesmo horário em **20/09, 27/09 e 11/10**, por Daniel/equipe, sem nova automação. Usar contatos válidos, qualificados aceitos e consultas da mesma coorte; ainda não há resultado de negócio demonstrado. O aumento é de orçamento médio diário, não um teto de gasto por dia.

Recibo estruturado, preflight vivo e releitura da projeção existente do Drive: `PUBLICACAO.json`. Site, Netlify, Apps Script, LEADS, CRM, WhatsApp, Calendar, Meta, anúncios, palavras e recursos não foram alterados neste pacote.
