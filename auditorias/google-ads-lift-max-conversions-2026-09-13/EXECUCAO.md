# Google Ads — piloto de Maximizar conversões em lifting facial

**Estado:** candidato local; nenhuma alteração realizada no Google Ads

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

## Preflight realizado

A planilha LEADS canônica foi lida sem escrita. A saúde operacional apresentou diferença zero entre eventos marcados e exportados, zero conflito de click ID e zero divergência entre funil ativo e canônico. Há sete eventos em estado `ready`, mas o registro local não comprova que o Google Ads os aceitou ou atribuiu. Na coorte de `G26LIFT` de 14/08 a 12/09, os sete contatos identificados continuam em `Novo`, sem qualificado ou consulta registrada; ausência de classificação não equivale a perda.

O último recibo verificado da conta, de 13/09 às 20h15 BRT, registra oito campanhas e R$ 99/dia; `G26LIFT` permanece documentada em R$ 24/dia e Maximizar cliques. Esse recibo é baseline registrado, não substitui a releitura viva imediatamente anterior à mudança.

## Bloqueio antes de qualquer escrita

O controlador autenticado falhou antes de inicializar a leitura do Google Ads, tanto pelo controlador CUA quanto pelo runtime `@oai/sky`, inclusive após reinicialização:

```text
failed to write kernel assets: The system cannot find the path specified. (os error 3)
```

Por isso, o preflight vivo da conta não foi concluído e **nenhuma escrita externa foi feita**. O ajuste não deve ser aplicado por outro navegador, CLI, API ou automação sem primeiro recuperar o controle autenticado e repetir a leitura completa.

## Retomada obrigatória

Em uma tarefa ou processo novo:

1. confirmar conta e campanha pelos IDs;
2. reler status, orçamento, lance, ausência de CPA, meta qualificada, ação de conversão, gasto recente, recomendações automáticas e histórico de mudanças;
3. confirmar que os outros sete orçamentos somam R$ 75/dia;
4. aplicar somente as duas mudanças autorizadas;
5. reler `G26LIFT` em Maximizar conversões, sem CPA, R$ 30/dia, e a conta em R$ 105/dia;
6. registrar recibo, horário real de ativação e novas datas D+7, D+14 e D+28.

Rollback, caso algum guardrail falhe: restaurar somente `G26LIFT` para Maximizar cliques sem teto de CPC e R$ 24/dia, com releitura do total de R$ 99/dia. Não apagar histórico nem alterar outro objeto.
