# Aniversários no lembrete diário — 13/09/2026

Pedido vigente: a equipe envia a saudação manualmente. A autorização anterior para ativar aniversário automático foi substituída por esta instrução.

## Alteração

- Aniversário de paciente com consulta realizada e nascimento válido aparece somente no próprio dia, em uma seção de envio manual com o texto completo. Não depende de “Aniversário pelo bot”, de modelo ou de autorização do provedor.
- Uma sugestão por telefone/ano, independentemente da quantidade de consultas. Recusa, supressão, nascimento conflitante, contato já registrado no ano e dispensa persistida impedem sugestão duplicada. A equipe confere a conversa e a permissão antes de enviar.
- O painel permite dispensar o aniversário; não oferece aprovação pela Bruna nem adiamento para outro dia. Datas/colunas da LEADS não são migradas ou reescritas.
- Planejador, aprovação, processador, validação e adaptador do WhatsApp recusam aniversário automático, mesmo com flags legadas habilitadas. Recibos antigos são preservados. Outros cuidados continuam exigindo aprovação individual e revalidação do histórico e Calendar.

## Evidência do baseline

13/09/2026, aproximadamente 08h37 BRT: Apps Script v150 no deployment canônico; CuidadosProgramados, AgendaCuidados e CentralAtendimento iguais ao repositório por SHA256. Diagnóstico somente leitura: cuidados ativos, aniversários inativos, 83 colunas, fila vazia e um gatilho existente. Netlify24a6f19 /6aa60d89 ready; flag de aniversáriofalse e de cuidados aprovadostrue.

Plano e manual nos mesmos IDs Drive relidos iguais ao baseline: 6cc4ab2917848b06e89f73b96b3857bd55d062dd1ec6db3a128f21691c4a76e4 e a9fd063a9d5445d0a15a102d45d4c9f28d56d4d3e6f4293d955f0309ab195f17. Trabalho paralelo Google Ads4ea1bae preservado. Nenhum calendário, paciente, consentimento, mensagem ou e-mail real de teste alterado.

## Validação

Cinco cenários novos reproduziram a diferença de comportamento antes da correção. Depois: 227/227 testes focados e cruzados aprovados. Suíte integral: 1.460/1.460. Arquitetura e escopo exato verdes. Após a liberação de espaço, a reconstrução local foi aprovada com 193 arquivos, 54 rotas, zero erro e nenhum arquivo operacional público. O build externo concluiu no deploy de produção `6aa6998a46297000089e1e5d`, associado ao commit aprovado `30c44f03a1308359acdc69f568deeb14b23ed7a1`.

## Publicação, rollback e monitoramento

Publicação concluída no Apps Script v151 e no Netlify `6aa6998a46297000089e1e5d`, preservando o mesmo deployment. Os três arquivos vivos foram recarregados e coincidiram com o commit pelos hashes normalizados `a82f3e1518a39b0bad4ebff7480a40c73060c944a328329f5ed606dfd54e1910`, `4c717fca1dcfe1736fbe57a97f19c492f24315340fb1788639a9763c2a5b5385` e `3a638a711ec0132c25c176686bbc7750b4ef91922db5e449a36192fa46f14589`. O diagnóstico sem efeitos confirmou `birthdayDeliveryMode=manual_daily_reminder`, aniversário automático desligado, 83 colunas, fila vazia e um gatilho. O domínio respondeu HTTP 200 e a rota sem credencial, 401. O modelo anteriormente submetido fica sem uso; eventual aprovação externa não pode reativar a rotina.

Rollback: Apps Script v150, commit `24a6f19ad5e29660653744c697ae6fbd356417e9` e Netlify `6aa60d89d5920c0008dc059e`, sempre com aniversário desligado. Monitoramento: primeiro lembrete diário e 48 horas, observando aniversários manuais, dispensa, duplicidade e cuidados aprovados. Sem nova automação de monitoramento ou teste com pacientes. Durante publicação e pós-voo foram enviadas zero mensagens para pacientes e zero mensagens de e-mail reais.
