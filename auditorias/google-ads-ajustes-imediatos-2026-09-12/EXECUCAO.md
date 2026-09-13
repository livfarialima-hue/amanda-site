# Ajustes imediatos Google Ads — 12/09/2026

Status: configurações Google Ads aplicadas e relidas; encerramento documental em andamento. Janela de aplicação: 12/09/2026 à noite até 13/09/2026 00h00 BRT (03h00 UTC).

## Escopo e autorização

Daniel autorizou executar os ajustes imediatos propostos, sem ampliar gastos. O pacote limita-se a seis pares de parâmetros de anúncio, dois mapeamentos de identificador de clique na conexão LEADS e ao teste de Presença em lifting facial/cervical. Plano exato em `PLANO.json`; site, Netlify, Apps Script, mensagens, conteúdo e dados de pacientes ficam fora.

## Baseline e risco

Conta autenticada 995-334-4486. Oito campanhas ativas, R$103/dia, Pesquisa Google e Maximizar cliques relidos em 12/09 à noite. Seis parâmetros divergentes revalidados na tabela por ID de anúncio/grupo; primeiro editor confirma valores anteriores e texto médico preservado. Localização das duas campanhas foi lida na avaliação imediatamente anterior; será revalidada antes de salvar. Mapeamentos serão relidos na conexão canônica antes da escrita. A projeção do Plano no Drive, ID 18iUqY6HttJwPusSAA1VGmrMqqRluyjTO, é equivalente à base 73d6877 após normalização de finais de linha, modified 2026-09-13T02:09:13.838Z.

A mudança geográfica é hipótese de concentração, não prova de desperdício fora de São Paulo. Pessoas que frequentam a cidade continuam elegíveis. Há risco de perder demanda externa viável; acompanhar cidade/deslocamento informado e consultas, sem inferir renda ou excluir bairros/cidades adicionais. Não foram reauditas todas as despesas por local.

## Limites da mensuração

O candidato anterior 0ff0dd2 continua separado e não é publicado por este pacote. As correções técnicas de sessão/utm_adgroup/transporte do site continuam pendentes. Mapear braid não prova aceitação de uma conversão; seis linhas históricas repetidas não são seis eventos novos por execução. Não enviar teste artificial, alterar transaction ID, conceder consentimento ou mapear PII. O agendamento da conexão permanece 05–06h BRT e não será executado manualmente.

## Verificação e recibos

Commit do plano aplicado: `da367845af5de8b76b93b4c58c9c9aea4c200cfe`. Autorização por escopo textual desta conversa, não por uma afirmação de que Daniel digitou o SHA. Preflight de publicação passou em 2026-09-13T02:50:25Z, worktree limpo, vinculando esse HEAD ao pedido expresso de execução imediata. Antes da aplicação passaram 153/153 testes focados, 1444/1444 integrais, arquitetura, escopo exato de nove arquivos, diff e build/check de 193 arquivos/54 rotas. A primeira suíte encontrou dependências ausentes no worktree novo; `npm ci` recompôs o ambiente sem alterar lockfile; nenhuma correção ampla de dependências foi aplicada.

### Resultado relido na plataforma

| Anúncio | Grupo final | Campanha final | Estado |
|---|---|---|---|
| 816479308278 | ag_blefaroplastia | G26BLEF | Qualificada |
| 816580854431 | ag_cirurgia_facial | G26FACE | Qualificada |
| 816477682074 | ag_lifting_cervical | G26CERV | Qualificada |
| 817459414056 | ag_lipo_papada | G26CERV | Qualificada |
| 820414650683 | ag_lifting_facial_preco | G26LIFT | Qualificada |
| 816570038294 | ag_marca | G26MARCA | Qualificada |

Os IDs de anúncio/grupo e os sufixos explícitos ou herdados foram preservados. Somente os campos de parâmetro foram digitados nos editores; nenhum título, descrição, fixação, destino ou status foi alterado. A primeira tentativa de BLEF não persistiu: releitura após atualizar confirmou o valor antigo; nova digitação e saída do campo salvaram G26BLEF, depois relido na tabela. O total continuou em 17 anúncios ativos, todos Qualificada. A coluna de força de alguns anúncios ficou Pendente durante recálculo, distinta de reprovação/status de veiculação.

Conexão LEADS: confirmação “O mapeamento dos campos de conexão foi atualizado”, sete campos mapeados. Reabertura confirmou GBRAID→GBRAID e WBRAID→WBRAID, sem transformação; Data_e_hora_da_convers_o, ID_da_transa_o, GCLID, Valor_R_ e Moeda preservados. E-mail, telefone, IP e consentimento não mapeados. Agenda diária 05–06h GMT-03 e próxima execução 13/09 05h05 mantidas; não acionado Executar agora. Último ciclo anterior: seis linhas/zero erro, sem inferir conversões novas ou aceitas.

Geografia: IDs 24028216444 (LIFT, R$24) e 24023843174 (CERV, R$12) revalidados antes de salvar, ambos antes em Presença ou interesse e só São Paulo cidade. Reabertura após salvar confirmou Presença marcada e mesma cidade/verba. Não adicionados locais ou exclusões.

### Reconciliação com trabalho paralelo

Durante a tarefa a branch canônica avançou de `73d6877` para `1e638ef` com a política de preços publicada por outra tarefa (código `24a6f19`, Netlify `6aa60d89d5920c0008dc059e`, Apps Script150 herdado). A projeção Drive mudou às 02:45:07.695Z e foi relida equivalente ao novo Plano local; a cópia antiga NÃO foi sobrescrita. Merge mantém todos os arquivos dessa publicação; a decisão de preço permanece seção31 do Norte e os ajustes Google passam à seção32. Os IDs de Netlify/Apps Script no recibo são estado herdado, não publicação deste pacote. A versão técnica de atribuição `0ff0dd2` continua fora do merge.

Pendente neste ponto: regressão da reconciliação e substituição/verificação da mesma projeção Drive. Fechamento só será registrado após essas confirmações.

## Monitoramento e rollback

Daniel/equipe: primeiro ciclo e 48h para integridade; leituras em 20/09 e 27/09, decisão em 13/10 ou mais tarde se a amostra for insuficiente. Comparar qualificados aceitos e consultas agendadas/realizadas da mesma coorte, com gasto compatível e maturação. Reverter somente o componente com regressão; não sobrescrever registros históricos, código publicado por outras tarefas ou configuração de campanhas fora deste pacote.
