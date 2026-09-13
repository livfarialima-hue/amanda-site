# Central de retomadas prática e contextual — 13/09/2026

## Resultado publicado

A página aberta pelo e-mail diário passa a oferecer **Copiar mensagem** em cada sugestão pronta. A cópia usa exatamente o texto exibido no cartão. Para marcos de cuidado, esse também é o rascunho que uma aprovação posterior programaria para a Bruna; um complemento exclusivo do e-mail não altera mais a mensagem mostrada no painel.

As retomadas comerciais usam o primeiro nome somente quando o cadastro contém um nome humano seguro e retomam o ponto já conhecido da conversa: procedimento, pergunta sobre valor, valor da consulta e endereço, intenção de agenda, objeção ou material pertinente. Os marcos de pós-cirurgia e orçamento seguem a mesma regra para o nome. Nome ausente, telefone no campo de nome, nome institucional ou outro valor inseguro mantém `Olá!`. A consulta de R$ 500 permanece separada de orçamento cirúrgico.

O painel também passa a oferecer **Cancelar retomadas definitivamente** em contatos proativos com telefone válido. A opção não vem marcada e exige confirmação explícita. Ao confirmar, o sistema relê o item, grava a preferência canônica `Nunca retomar` e só então cancela planos pendentes daquele telefone, inclusive os estados manual, suspenso e em revisão. Consultas e lembretes operacionais confirmados continuam preservados. Itens de lembrete de consulta não exibem a ação definitiva.

## Proteções verificadas

- Abrir o painel, abrir o WhatsApp ou copiar a mensagem não grava decisões.
- O texto copiado é o conteúdo visível, inclusive acentos e quebras de linha, com alternativa para navegadores sem acesso à área de transferência.
- Ações não vêm pré-selecionadas; cancelamento definitivo exige uma confirmação destacada.
- Tokens diários e por item continuam opacos. O servidor relê o item e rejeita telefone inválido, contato ausente, item alterado e ação incompatível.
- Duas decisões conflitantes para o mesmo contato no mesmo lote não são aplicadas silenciosamente.
- `Nunca retomar` bloqueia contato proativo; `Nunca responder` continua fora do painel e depende de revisão individual.
- Aniversário permanece somente como lembrete para envio humano no próprio dia.

## Pré-voo vivo, somente leitura

Em 13/09/2026, antes de qualquer gravação de código:

- projeto, deployment e planilha terminaram com `ALVO CANÔNICO CONFIRMADO`;
- o deployment ativo era a versão 151, descrição `Aniversários somente no lembrete diário para envio humano — 30c44f0`, com o mesmo ID canônico;
- `Retomadas.gs` vivo coincidiu com a base local no SHA-256 normalizado `872d3f4f75f53e05af22c9520860dc1fa398a098da3d84a95d32fb1aea069304`;
- `PainelDecisoesDiarias.gs` vivo coincidiu no SHA-256 normalizado `759b763d730816fcc5c3d0cd6a56443b161c4364e5875ba0aec22ade4219957c`;
- `CuidadosProgramados.gs` vivo coincidiu no SHA-256 normalizado `3a638a711ec0132c25c176686bbc7750b4ef91922db5e449a36192fa46f14589`;
- o diagnóstico de cuidados informou `readOnly=true`, cuidados ativos, aniversários automáticos desligados, modo `manual_daily_reminder`, 83 colunas, nenhum cabeçalho ausente, ledger presente e um gatilho compartilhado;
- o diagnóstico de retomadas informou endpoint HTTP 200, um gatilho de processamento e um de e-mail diário. Havia 328 linhas históricas e dois planos legados programados, ambos anteriores e preservados; zero plano de template automático seguro e zero plano manual aprovado.

Nenhuma conversa, planilha, preferência, consulta, Calendar, e-mail diário ou mensagem de paciente foi alterada por esse pré-voo.

## Publicação e pós-voo

O commit funcional `7a5cf98bebbe571014f0721ee8df1c85a99ecf79` foi publicado no mesmo deployment canônico como Apps Script v152, com a descrição `Central prática: copiar, personalizar e cancelar definitivamente — 7a5cf98`. Depois do salvamento, os três arquivos vivos foram recarregados e coincidiram com o código aprovado:

- `PainelDecisoesDiarias.gs`: `ea7532f9f1eb8e6b557073dbf7ce2019e806cfd5becc8a4baa0fbef59fe81ed4`;
- `Retomadas.gs`: `255be81e093eb635fd9754ee11932c792a38e707b2a3c9af141a2daeafcc748a`;
- `CuidadosProgramados.gs`: `ae74a369a2c951111105224d224d8ec31539a3f12cc05020fb676eec47f7a568`.

A URL canônica com token sintético inválido respondeu HTTP 200, mostrou link inválido e `Nenhuma decisão foi aplicada`. Às 10:27–10:28 (America/Sao_Paulo), os diagnósticos somente leitura confirmaram o mesmo endpoint saudável, um gatilho de processamento, um de e-mail diário, os dois planos legados preservados, zero plano de template automático seguro, zero plano manual aprovado, cuidados ativos, aniversários automáticos desligados em `manual_daily_reminder`, 83 colunas e nenhum cabeçalho ausente.

Esta publicação enviou zero mensagem, zero e-mail diário, mudou zero consulta, zero preferência e executou zero cancelamento de retomada.

## Validação local

A prévia sintética em `PREVIA-PAINEL.html` foi renderizada em 860 × 2400 e revisada visualmente. O botão de cópia aparece junto da mensagem; o cancelamento definitivo é destacado; `Dispensar esta sugestão` continua separado; e o lembrete de consulta não mostra a ação definitiva.

Os testes focados concluíram 131/131 após o alinhamento final. Eles cobrem cópia principal e alternativa, igualdade entre rascunho exibido e aprovável, primeiro nome seguro, contexto comercial, consulta versus preço cirúrgico, confirmação definitiva, isolamento por telefone, preservação de lembretes e falha fechada. A suíte integral concluiu 1.473/1.473, a arquitetura ficou íntegra e o artefato estático manteve 193 arquivos, 54 rotas, zero erro e nenhum arquivo operacional ou de auditoria público.

## Limites e rollback

O painel facilita a decisão humana; não transforma tema clínico, preço sem autorização, informação ambígua ou contexto sensível em envio automático. A publicação de código não aciona a Central, não envia o e-mail diário e não executa mensagens.

Rollback técnico: restaurar a versão 151 no mesmo deployment. Como não há migração de schema, o rollback preserva planilha, consultas, agenda, preferências, fila e recibos existentes.
