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

Cinco cenários novos reproduziram a diferença de comportamento antes da correção. Depois: 227/227 testes focados e cruzados aprovados. Suíte integral: 1.460/1.460. Arquitetura e escopo exato verdes. Após a liberação de espaço, a reconstrução local foi aprovada com 193 arquivos, 54 rotas, zero erro e nenhum arquivo operacional público. A publicação só fecha depois do build externo e do pós-voo.

## Publicação, rollback e monitoramento

Atualizar apenas três arquivos Apps Script e preservar o mesmo deployment; publicar o transporte Netlify do commit validado. Releitura integral e diagnóstico sem efeitos. Manter flags de aniversáriofalse. O modelo anteriormente submetido fica sem uso; eventual aprovação externa não pode reativar a rotina.

Rollback: Apps Script150 e Netlify6aa60d89, sempre com aniversário desligado. Monitoramento: primeiro lembrete diário e48horas, observando aniversários manuais, dispensa, duplicidade e cuidados aprovados. Sem nova automação de monitoramento ou teste com pacientes.
