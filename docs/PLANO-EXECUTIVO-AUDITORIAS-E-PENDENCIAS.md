# Plano executivo — auditorias, pendências e prazos

**Status:** fonte canônica executiva para decidir o que fazer, quando executar e quando publicar

**Atualizado em:** 23 de agosto de 2026, 20:03, America/Sao_Paulo

**Escopo:** auditoria Google Ads de 14/08/2026, execução ao vivo de BLEF, CERV, OTO, FACE e MARCA em 22/08/2026 e auditoria SEO, IA e atribuição de 15/08/2026

**Projeção de leitura no Drive:** [00 — PLANO EXECUTIVO — pendências, prazos e publicações.md](https://drive.google.com/file/d/18iUqY6HttJwPusSAA1VGmrMqqRluyjTO/view)

## 1. Como usar este arquivo

Este arquivo existe para que Daniel e Amanda não precisem interpretar matrizes técnicas, commits, flags ou relatórios extensos.

Quando chegar uma data, basta pedir:

> Execute a próxima etapa vencida do Plano Executivo de Auditorias. Confirme os gates ao vivo, faça somente o que estiver maduro, atualize o plano local, o mesmo arquivo no Drive e os lembretes. Não publique sem minha autorização explícita.

O responsável técnico deve:

1. verificar o estado ao vivo antes de agir;
2. executar apenas a etapa madura;
3. pedir autorização quando houver publicação, migração, gasto ou escrita externa relevante;
4. atualizar este plano no mesmo trabalho;
5. reagendar janelas dependentes quando a data real mudar;
6. não exigir que Daniel interprete os 59 itens da matriz.

## 2. Legenda simples

| Estado | Significado para vocês |
|---|---|
| `CONCLUÍDO` | já foi executado e verificado; não repetir |
| `ATIVO` | rotina recorrente publicada, testada e em execução; acompanhar resultados |
| `AGENDADO` | existe data, mas só será executado se os gates estiverem verdes |
| `AGUARDAR DADOS` | mexer antes contaminaria a análise ou produziria decisão insegura |
| `DEPENDE DE VOCÊS` | precisa de documento, parecer ou autorização humana |
| `BLOQUEADO` | não executar até resolver a dependência indicada |
| `NÃO ALTERAR` | decisão consciente de manter como está |

## 3. Situação atual em linguagem direta

### Operação do WhatsApp — Bruna

**Estado geral:** a Central prática e a Bruna estão publicadas no Apps Script v128 e no Netlify `6a8b7b253e598c00083ee441`, preservando os deployments canônicos e a arquitetura modular. A fila abre diretamente o WhatsApp, preserva texto e horário editados, sugere a janela de maior resposta ao aprovar sem enviar, reorganiza-se depois do processamento e mantém por 24 horas o histórico recente. Uma retomada manual só exibe `Aprovar com a Bruna` quando existe uma janela segura atual do WhatsApp; caso contrário permanece humana e informa explicitamente `Fora da janela atual do WhatsApp — ação humana necessária`. Um cancelamento marcado sai das ações manuais na atualização seguinte e passa para `Cancelado recentemente`, em cinza, sem gravar `Nunca retomar`; conflito com aprovação permanece ativo para correção. A primeira retomada passa pelas travas determinísticas e por um veto semântico dos turnos recentes; a segunda e última somente reutiliza essa revisão quando o silêncio e a identidade da última retomada estão comprovados, sem qualquer fala posterior. Respostas seguras da paciente à retomada voltam ao fluxo ativo sem reapresentação. Primeiras respostas de site, Google, Meta e WhatsApp direto agora mantêm o mesmo padrão de personalização em todos os procedimentos reconhecidos; ninfoplastia destaca privacidade e avaliação individual sem perguntas sensíveis. Código funcional da Bruna `b4ff895b2cfe29fbe1780fc78348f37593421861`; **235/235 testes focados** e **1045/1045 testes integrais**. Nenhuma mensagem real foi enviada.

**Atualização da Central — Apps Script v126 — PUBLICADA E VERIFICADA:** publica somente `CentralAtendimento.gs` do commit `4f32332`, depois de confirmar os três IDs canônicos e provar que o arquivo vivo coincidia com a v125. Na atualização seguinte, a caixa `Cancelar retomada` usa a rotina idempotente existente, retira o plano das filas ativas e o conserva por 24 horas como `Cancelado recentemente`, em cinza e abaixo das ações que exigem atenção. Não grava `Nunca retomar`; conflito com `Aprovar com a Bruna` falha fechado e permanece visível; aprovação não é processada automaticamente. O arquivo salvo foi relido com o SHA-256 normalizado `4c29621f075cd03c1039a5aee1eebd7c3e2ec2f0ce196261231fbeb18382e441`. O mesmo deployment foi atualizado para v126, web app e token sintético inválido responderam HTTP 200 sem mutação. Validação: **44/44**, **96/96**, **1016/1016** e `git diff --check`. Nenhuma função, trigger ou mensagem real foi executada. Rollback: Apps Script v125 no mesmo deployment.

**Correção da aprovação manual — Apps Script v128 — PUBLICADA, EXECUTADA E VERIFICADA:** a causa do checkbox que se desmarcava era a validação fail-closed da janela de 24 horas: as cinco retomadas do incidente tinham interações antigas, mas a Central ainda as classificava incorretamente como elegíveis. A v128 inclui a mesma validação já na montagem da fila, remove o checkbox impossível e mostra o motivo humano, preservando integralmente o texto editado. O arquivo vivo anterior coincidiu com a v127 e o salvo foi relido no SHA-256 normalizado `d58090ed0db6bf10c6698de1cc2daf1bc3c12a186dbb1d93a8d2e7c4bf007031`. O mesmo deployment foi atualizado para v128. A atualização concluída às 18:19:35 confirmou as cinco linhas sem aprovação disponível, com textos preservados; a fila técnica permaneceu em `Manual` / `Ação manual`, sem programação, tentativa ou envio. Web app e token inválido responderam HTTP 200 sem cancelamento ou mudança de preferência. Validação: **45/45**, **1043/1043** e `git diff --check`. Nenhuma mensagem real foi enviada. Rollback: Apps Script v127 no mesmo deployment.

**Release da Bruna `2026-08-23.6` — PUBLICADO E VERIFICADO:** aplica a mesma qualidade de primeira resposta a site, Google, Meta e WhatsApp direto e personaliza todos os procedimentos reconhecidos, independentemente do volume de procura. Ninfoplastia passa a destacar privacidade e avaliação individual sem pedir foto, descrição corporal ou detalhe íntimo; quando não existe outro pedido objetivo, a resposta termina com uma única pergunta simples e não presume agenda. Classificação, takeover, preços, agenda, retomadas, opt-out e gate de saída permaneceram inalterados. Código funcional `b4ff895b2cfe29fbe1780fc78348f37593421861`, deploy Netlify `6a8b7b253e598c00083ee441`, checksum do webhook `2f65ec5c010964e17a25da7e1766c90d8bc87511d5f36248b98193fed4de0eaf`, **235/235 testes focados**, **1045/1045 integrais**, arquitetura e build aprovados. Domínio, URL imutável e webhook responderam HTTP 200 em modo `active`; zero segredo detectado e nenhuma mensagem real enviada. Rollback: código `f10b70b48c3e9ec47855c303e83f7fb76f783c4a` e deploy `6a8b64f751610e0008507fc5`; Apps Script v128 preservado.

**Release `2026-08-23.5` — PUBLICADO, EXECUTADO E ATIVO:** o novo `FunnelReconciliation.gs` mantém `_CRM_OPORTUNIDADES` e as abas visíveis como origem da verdade, confere as projeções por `Opportunity ID` e fase a cada 15 minutos e reaplica somente o projetor incremental existente. A simulação excluiu 66 falsos positivos de formatação de data e confirmou uma única oportunidade realmente divergente. A execução autorizada reparou somente essa oportunidade; o pós-voo terminou com 198 linhas canônicas, 195 linhas comerciais, zero divergências, zero duplicidades e zero bloqueios. A comparação de segurança confirmou **0 alterações nas 1.950 células manuais protegidas** de `J:O` e `Q:T`. Exatamente um trigger ficou ativo, limitado a 25 reparos por rodada; a primeira rodada periódica foi saudável e idempotente, sem reparo nem alerta. Apps Script v127 no deployment canônico preservado, arquivo salvo com SHA-256 `3081887b6f7f49d6f733115e3fecafae75b0fda6d48e3acb7b9f413dc750200c`, web app e token inválido HTTP 200, **16/16 testes focados** e **1028/1028 integrais**. Nenhuma mensagem real, campanha ou orçamento foi alterado. Rollback: desativar a rotina pela função autorizada e retornar o deployment à v126.

**Release `2026-08-23.3` — PUBLICADO E VERIFICADO:** publica somente os dois arquivos aprovados do Apps Script e o pacote delimitado da Bruna. Os arquivos vivos coincidiam com a v123 antes da escrita e foram relidos com os hashes locais depois do salvamento; o mesmo deployment foi atualizado para v124. O Netlify publicou o deploy `6a8b2f26fc9c880f38e8e745`; domínio, URL imutável, webhook e web app responderam HTTP 200 em modo ativo. O endpoint programado recusou segredo inválido com `401 unauthorized`, e o link sintético inválido confirmou que nenhuma mensagem foi cancelada e nenhuma preferência mudou. Rollback: Apps Script v123, deploy Netlify `6a89fab3f44a1578bd9c9f41` e código `6a27731a5bef23427b749a726ddab468aea56d16`.

**Release `2026-08-23.2` — PUBLICADO, EXECUTADO E VERIFICADO:** publica somente `CentralAtendimento.gs` e `Retomadas.gs`, depois de confirmar os três IDs canônicos e comparar os arquivos vivos com a base v118. O mesmo deployment foi atualizado progressivamente até a v122. A primeira migração expôs uma validação posicional antiga em `J2` e falhou antes de qualquer envio; a v120 limpou validações e notas somente quando o layout ainda não era o atual. A v121 limitou planos antigos à janela de 10 dias sem ocultar agendamentos futuros, e a v122 moveu a marca técnica para uma coluna oculta. A atualização final terminou às 12:11:02. O caso fornecido ficou `Aguardando paciente`, `Suspenso`, sem aprovação ou horário de envio, e com o link direto correto. O endpoint com token inválido afirmou que nenhuma mensagem foi programada. Rollback: Apps Script v118 no mesmo deployment.

**Release `2026-08-23.1` — PUBLICADO E VERIFICADO:** publica somente `CentralAtendimento.gs` e `Retomadas.gs` do commit `ec6d5e9`, após testar a conexão autenticada e confirmar projeto, deployment e planilha pelos três IDs canônicos. Os arquivos vivos coincidiam com o pai do commit antes da escrita e com o commit aprovado depois do salvamento. O deployment existente foi atualizado da v117 para a v118; o endpoint retornou `ok:true`, e o token inválido confirmou `Link inválido ou expirado`, que nenhuma mensagem foi cancelada e que nenhuma preferência foi alterada. Não houve execução da Central, gatilho ou envio real. Rollback: Apps Script v117 no mesmo deployment.

**Release `2026-08-23.4` — PUBLICADO E VERIFICADO:** preserva integralmente a v124 e acrescenta dois comportamentos delimitados. A segunda e última retomada aprovada pode reutilizar a revisão semântica anterior somente quando o silêncio e a identidade da última retomada estiverem comprovados; qualquer atividade ou falta de prova chama a IA novamente e falha fechada. As respostas automáticas de preço ficam estritamente separadas: lifting facial preserva sua faixa própria; cervicoplastia informa exclusivamente **R$ 18 mil a R$ 26 mil**; otoplastia permanece automática em **R$ 8 mil a R$ 14 mil**. Perguntas de preço de qualquer outra cirurgia seguem para revisão humana desde a primeira ocorrência, com alerta interno e resposta sugerida, e nenhum texto à paciente expõe linguagem de confirmação operacional interna. Código funcional `dc3d6054e895968e98f369e39a3905fca5559227`, deploy Netlify `6a8b399c98d6cf000824079f` e Apps Script v125 no deployment canônico. O arquivo vivo de `Retomadas.gs` coincidiu com a v124 antes da escrita e foi relido com o hash aprovado; domínio, URL imutável, webhook e web app responderam HTTP 200, e segredo/token inválidos falharam sem envio, cancelamento ou mudança de preferência. Validação: **313/313 testes focados**, **1015/1015 testes integrais**, build de 178 arquivos e 44 URLs. Nenhuma função, trigger ou mensagem real foi executada. Rollback: Apps Script v124, Netlify `6a8b322b31e9e0000873b91c` e código funcional `f3966f76d281056fc1abf5198a9a97ea519ed6ff`.

**Página de preço do lifting — PUBLICADA E VERIFICADA:** o guia continua sem qualquer faixa numérica pública e oferece, no WhatsApp, uma conversa privada sobre faixa geral informativa como ponto de partida, sempre distinguida de orçamento, proposta ou garantia. O prefill estruturado `price_range_reference`, os três CTAs principais e o rastreamento foram validados no domínio e na URL imutável; os três assets de tracking usam a versão única `20260823-price-range-1` nas 44 páginas públicas para evitar cache divergente. Publicação no código funcional `dc3d6054e895968e98f369e39a3905fca5559227` e deploy Netlify `6a8b399c98d6cf000824079f`. Nenhuma campanha, orçamento, lance, palavra-chave ou anúncio foi alterado por este pacote.

**Release `2026-08-22.1` — PUBLICADO E VERIFICADO:** o incidente ao vivo foi entregue pela YCloud como `unsupported`, sem corpo textual ou referência utilizável, embora o aplicativo exibisse a mensagem. A correção preserva `route_pending` e revisão humana, mas envia uma única pergunta neutra para recuperar procedimento ou dúvida, com mensagem mais recente, deduplicação, opt-out, horário e takeover intactos. Não reconstrói texto, não presume anúncio, não cria oportunidade por inferência e registra somente códigos técnicos anônimos. Código funcional `5c08be94a7382c9f2c2bbd56c510277541b19169`, deploy `6a89f0e9f4f19fa8ec16b8e6`, checksum da função `97f6ea16f2443c575d093786903f821101e602934a23b818f96557f533aedc3b`, **635/635 testes do Netlify**, build de 178 arquivos, 44 URLs e endpoint `active`; nenhuma mensagem real enviada. Rollback: deploy `6a89b867a85c5f00085ae691` e código funcional `dd93f1cebf5c218672d1bf84d6d3b39ca3c9ff74`. As projeções canônicas do manual e deste Plano foram substituídas nos mesmos IDs do Drive, sem criar cópias, e o manual remoto foi conferido byte a byte no SHA-256 `f44c9f453fe62a09b6554036a558fa431bab230b356a687c1e8d56a3a0ea8161`.

**Release `2026-08-22.2` — PUBLICADO E VERIFICADO:** o incidente seguinte não foi falha de entrada: três mensagens textuais rápidas foram registradas e roteadas para a mesma oportunidade Amanda. Uma fala humana anterior havia aberto takeover; a exceção semântica não aceitava pergunta direta, o contexto de resposta era congelado antes do fim do debounce e o envelope de takeover removia o caminho de preço cervical já aprovado. A versão relê o ledger durável depois de confirmar a mensagem mais recente, agrupa somente falas consecutivas da paciente em até 45 segundos, responde a pergunta informativa que a própria equipe convidou e preserva o envelope inicial de preço sem liberar agenda, confirmação, cuidado clínico, tarefa administrativa ou corrida com nova fala humana. Código funcional `6a27731a5bef23427b749a726ddab468aea56d16`, deploy `6a89fab3f44a1578bd9c9f41`, checksum `4ebc57f12ed40b34b158381af84ddb2ff913734c10345f439a1b62d4fe79041d`, **642/642 testes do Netlify**, build de 178 arquivos e 44 URLs; endpoints canônico e imutável HTTP 200 em modo `active`. A suíte ampla ficou em 957/958 por uma falha preexistente de tracking fora do commit. Baseline `3 entradas / 0 resposta automática`; métrica `1 resposta para o conjunto`; guardrails `0 resposta após nova saída humana`, `0 agenda`, `0 preço fora do contrato` e `0 reenvio da conversa real`. Rollback: deploy `6a89f0e9f4f19fa8ec16b8e6` e código `5c08be94a7382c9f2c2bbd56c510277541b19169`. Checkpoints: 23/08 e 29/08.

**Release `2026-08-21.1` — PUBLICADO E VERIFICADO:** publica somente `Retomadas.gs` e `AgendaCuidados.gs` do commit `6551f0f`, preserva o deployment e transforma cancelamento permanente em ação separada do cancelamento de um plano. Aprovação para a Bruna exige confirmação e não ultrapassa opt-out, takeover, janela, nova mensagem, segurança ou falta de contexto. O endpoint retornou `ok: true`; o token inválido confirmou que nenhuma mensagem foi cancelada e nenhuma preferência foi alterada. Rollback: Apps Script v110 no mesmo deployment.

**Release `2026-08-20.4` — PUBLICADO, EXECUTADO E VERIFICADO:** substitui inferência frágil por contexto estruturado e evidência pessoal, impede prefill isolado e pergunta inicial de preço de gerar falsa qualificação, preserva a origem Meta canônica quando `source_id` vier omitido e adiciona saneamento humano fail-closed por `Opportunity ID`. O pós-flight confirmou todas as cinco fases, o arquivamento interno, as duas invalidações, a retirada da fila Google e a eliminação da aba temporária. A v109 continha a rotina; a v110 corrigiu somente o pré-voo `active`→`open`, com regressão, antes da execução bem-sucedida. Rollback de código: Netlify `6a879160d29a140008a20503`, commit `27f07856e43cf90f898132ddf11913210818f2c4` e Apps Script v109; não reverter automaticamente as correções humanas de dados.

**Release `2026-08-20.3` — PUBLICADO E VERIFICADO:** corrige a confirmação humana fora da grade, mantém Amanda na Sala 1 mesmo em conflito, envia alerta somente para conflito real, elimina linhas parciais e relê a reserva após timeout antes de declarar falha. O caso real autorizado foi reconciliado sem duplicidade e sem mensagem à paciente. Commit funcional, Netlify, Apps Script e as mesmas projeções do Drive foram reconciliados no estado geral acima. Rollback: deploy `6a8762898c14302d7062b1f9`, commit `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11` e Apps Script v107.

**Release `2026-08-20.2` — PUBLICADO E VERIFICADO:** responde diretamente à comparação geral entre minilifting e lifting facial; transforma uma revisão segura em ação idempotente com rascunho contextual para conferência na Central/e-mail; e substitui a oferta mecânica da primeira resposta de preço de lifting facial, cervicoplastia e otoplastia pela proposta leve de faixa geral no passo seguinte. A faixa numérica continua somente no aceite ou novo pedido explícito e os temas protegidos permanecem sem rascunho copiável.

**Release de 20/08/2026 — PUBLICADO E VERIFICADO:** todo texto elegível já persistido passa pela avaliação semântica mesmo sem oportunidade ou rota resolvida. O caso real de queixas faciais mostrou a lacuna: o texto estava legível e contextual, mas `route_pending` impediu a chamada à IA. A versão recupera histórico pré-oportunidade e falas humanas, permite recuperação idempotente de Amanda/Daniel somente com alta confiança em modo ativo, pergunta uma vez quando a dúvida for segura e produz sugestão interna apenas quando houver rascunho seguro. `Shadow` não envia nem altera rota ou agenda; `off` preserva a entrada e bloqueia IA, mensagens, agenda e disparos programados. Código, produção e projeções do Drive foram reconciliados no fechamento descrito acima.

**Projeção deste Plano Executivo no Drive:** o mesmo arquivo canônico remoto `18iUqY6HttJwPusSAA1VGmrMqqRluyjTO` foi substituído no fechamento do Apps Script v128; nenhuma cópia concorrente foi criada.

- `HOTFIX-APPSSCRIPT-2026-08-19` está `CONCLUÍDO E VERIFICADO`: a v102 restaurou `Retomadas.gs`; a v103 restaurou `LeadClassification.gs` e repôs apenas o bloco `templateId` aprovado em `Code.gs`, sempre no mesmo deployment. Os 22 arquivos foram comparados; quatro diferenças eram somente fim de linha, e nenhuma outra corrupção foi encontrada. O teste de token inválido confirmou `Nenhuma preferência foi alterada`;
- `SYNC-CENTRAL-ATENDIMENTO` está `CONCLUÍDO E VERIFICADO`: após autorização específica, `CentralAtendimento.gs` foi publicado integralmente na v104 conforme o commit `7e37eb3`. Ofertas comerciais antigas ficam em revisão silenciosa e só são encerradas por ação humana; `21/21` testes focados e `865/865` integrais passaram. Não houve atualização ao vivo da Central nem mensagem real;

- `BRUNA-CONTEXTO-PRECO-2026-08-20` está `PUBLICADO E EM OBSERVAÇÃO`: diferença geral entre minilifting e lifting facial coberta sem indicação individual, rascunho interno seguro ligado à revisão e oferta progressiva de faixa somente para lifting facial, cervicoplastia e otoplastia. Regressões do caso real, Central, e-mail, risco alto e fluxo de preço passaram em **923/923**; publicação no commit `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11`, deploy `6a8762898c14302d7062b1f9` e Apps Script v107; revisar as primeiras ocorrências reais e a leitura em sete dias;

- `AGENDAMENTO-HUMANO-FORA-GRADE-2026-08-20` está `CONCLUÍDO E VERIFICADO`: confirmação humana fora de `Datas Consulta` aceita sem criar linha artificial na grade; Amanda preservada na Sala 1; conflito real transforma-se somente em alerta por e-mail; escrita única impede linha parcial; timeout usa releitura por ID antes de alertar. O caso operacional autorizado foi reconciliado em Consultas, LEADS, CRM e Agenda, com lembrete elegível e sem mensagem à paciente. Publicação no commit `27f07856e43cf90f898132ddf11913210818f2c4`, deploy `6a879160d29a140008a20503` e Apps Script v108; **932/932** testes;

- `AUDITORIA-CONVERSAS-E-QUALIFICACAO-2026-08-20` está `CONCLUÍDA E VERIFICADA`: 54 arquivos/53 conversas únicas do Drive reconciliados; zero conversa identificável de aquisição ausente da LEADS; quatro falsos `Qualificado` corrigidos para `Novo`, um agendamento humano promovido para `Consulta agendada`, uma conversa interna arquivada e duas conversões falsas invalidadas antes de qualquer importação pelo Google. Publicação funcional `dd93f1cebf5c218672d1bf84d6d3b39ca3c9ff74`, deploy `6a879f71c5efe0ad12609a3d`, saneamento `88cdbd0`, Apps Script v110 e **940/940 testes**;

- `RETOMADAS-DIARIAS-2026-08-21` está `CONCLUÍDO E VERIFICADO`: cancelamento limitado ao plano selecionado, aprovação individual para a Bruna com confirmação e revalidação, cadência 24h/72h sensível a pausa e engajamento e sugestões de cuidado mais contextuais. Publicação Apps Script v111 no commit `6551f0fadd21f25ee238cc0fb903495ec7af6ce6`; **948/948** testes, foco **41/41**, HTTP 200 e token inválido não mutante; nenhuma mensagem real;

- `SEMANTIC-ROUTE-2026-08-20` está `PUBLICADO E EM OBSERVAÇÃO`: avalia textos legíveis antes da exigência de oportunidade, recupera contexto pré-rota e falas humanas, não envia nem muta agenda em `shadow`, exige alta confiança para Amanda/Daniel e preserva todas as travas. O modo `off` também bloqueia filas e disparos já planejados. Regressões específicas cobrem a resposta contextual ao caso real, uma única pergunta segura, decisão não autorizada mantida em revisão humana, prefill sem agenda, takeover sem envio e observação sem mutação. Publicação no commit funcional `afa230263288bba88fb0cb61f4fb55e5903d4dca`, deploy Netlify `6a8701bb1ae7b60008c3a8ac` e Apps Script v106; acompanhar as primeiras entradas reais e revisar em sete dias;

- `2026-08-19.6` está `PUBLICADA E VERIFICADA`: o incidente das 20:50:31 foi persistido como texto vazio e terminou em `route_pending`, sem oportunidade nem resposta automática. A correção lê envelopes textuais alternativos conhecidos e, quando o corpo realmente não existe, envia uma única pergunta neutra protegida por mensagem mais recente, deduplicação, preferência de contato, horário extremo e corrida humana. Código funcional `204aff23d27ed262f21ed66b448609ad838998b6`, deploy Netlify `6a864d9a75c1bc0008b26c3b`, Apps Script v104 preservado, **899/899 testes**, build de 178 arquivos e 44 URLs aprovados; nenhuma mensagem real enviada e nenhum Google Ads alterado;
- `2026-08-19.5` está `PUBLICADA E VERIFICADA`: preserva o primeiro pedido de preço de otoplastia sem números e libera R$ 8 mil a R$ 14 mil uma única vez somente depois de aceite claro ou novo pedido explícito. Faixa divergente, ausência de ressalvas, repetição ou contexto humano bloqueiam o envio. Perguntas compostas de otoplastia são respondidas antes do preço; `otomodelação` não define técnica, duração ou indicação. Código funcional `9a4a4082e5e4ad3e0bcf1e32dbbfe01af58eab22`, deploy Netlify `6a8641c07b71ac00088337f8`, Apps Script v104 preservado, **896/896 testes**, build de 178 arquivos e 44 URLs aprovados; nenhuma mensagem real enviada e nenhum Google Ads alterado;
- `2026-08-19.4` está `PUBLICADA E VERIFICADA`: a IA decompõe perguntas compostas de lifting facial e recebe fatos gerais aprovados sobre duração variável, recuperação gradual e critérios usuais; a resposta delimitada só é usada após confirmação semântica. Duração exata, indicação individual, agenda e demais travas clínicas continuam protegidas. O ledger durável recuperado deixa de ser descartado quando a memória auxiliar falha. Código funcional `5f9e247b7a38698d5a9d79836f14e7b4a25ec3c0`, deploy Netlify `6a861fab62e3fc00085b847f`, Apps Script v104 preservado, **876/876 testes**, build de 178 arquivos e 44 URLs aprovados; nenhuma mensagem real enviada;
- `2026-08-19.3` está `PUBLICADA E VERIFICADA`: respostas em turnos com `maxLinks: 0` retiram a frase que contém um link espontâneo e passam novamente por todas as travas; o texto entregue é o mesmo persistido, e conteúdo vazio ou ainda incompatível continua em revisão humana. Código funcional `5bb65664798b1d5ca5885fc75b07ec45dbf18833`, deploy Netlify `6a85e288a72ee70008cc87b2`, Apps Script v104 preservado, **867/867 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-19.1` está `PUBLICADA E VERIFICADA`: prefill estruturado neutro sem qualificação, conversão ou agenda pelo template isolado; primeira resposta sem salto prematuro; perfil comercial sem nome; resposta humana a foto; equivalência comunicacional `cervicoplastia (lifting cervical)`; e aprovação manual de retomada corrigida. Código funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`, deploy Netlify `6a858294fc30270008e0964a`, Apps Script v101 no deployment preservado, **851/851 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-19.2` está `PUBLICADA E VERIFICADA`: a pergunta `E gostaria de saber os valores` aciona a resposta inicial cervical aprovada, sem números; toda primeira pergunta de preço com procedimento confiável recebe no máximo um guia regional — facial para face/pescoço, mama para cirurgias mamárias e corporal para corpo/íntima — e esse link não se repete no turno da faixa. O aceite cervical posterior autoriza uma única faixa com ressalvas; sem guia facial anterior, a página específica de lifting entra como fallback. Outras faixas, repetição, agenda e contexto humano permanecem protegidos. Código funcional `97da5c3a289062c9face0313418fe1beb7e3accf`, deploy Netlify `6a8599b25b653800085f9f95`, Apps Script v101 preservado, **865/865 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-18.5` está `PUBLICADA E VERIFICADA`: histórico durável da oportunidade, autoria explícita, 32 turnos recentes, reidratação do cache, estado semântico entre turnos e interpretação contextual de respostas curtas; código funcional `6fd37c3227e6fee1ca4ea1686248cb22733040f1`, deploy Netlify `6a84facdbed81175d2df0107`, Apps Script v100, **843/843 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-18.4` ficou preservada como antecessora: respostas curtas que aceitam uma oferta informativa após fala humana passaram a exigir `CONTEXT-CONTINUE-01` ou esclarecimento seguro, mantendo barreira de agenda e proteção contra corrida com a equipe;
- mensagens textuais elegíveis agora são compreendidas contextualmente pela IA antes da decisão de resposta; mensagem curta, pontuação informal ou ausência de memória local não bastam para encaminhar ao humano;
- o contexto operacional durável fica na aba `_WHATSAPP_MENSAGENS` da planilha canônica, não em um banco ou pasta paralela no Drive; cada turno distingue `paciente`, `bruna` e `equipe_humana`, e respostas entregues pela Bruna são registradas sem abrir uma segunda classificação;
- a diretriz publicada exige que toda mensagem textual elegível passe primeiro pela IA, inclusive perguntas coloquiais sem `?`; o release `SEMANTIC-ROUTE-2026-08-20` fechou a lacuna anterior à oportunidade em que `route_pending` ainda podia impedir a chamada. Padrões mecânicos continuam como pistas, e cópias determinísticas só são usadas após confirmação semântica de código, procedimento, profissional e cobertura integral do pedido;
- se a IA não tiver segurança sobre o significado e a ambiguidade for linguística e segura, a Bruna pede uma única explicação curta e específica; urgência, cuidado ativo, risco clínico, opt-out, duplicidade, agenda não validada e takeover humano continuam bloqueando a resposta automática;
- na produção `2026-08-18.5`, depois de uma fala da equipe, a IA avalia imediatamente se a resposta curta aceita uma oferta informativa e exige continuação ou esclarecimento semanticamente codificados, mantendo agenda e temas protegidos com a equipe;
- o cache mantém até 32 turnos por sete dias e é reidratado pelo ledger quando estiver vazio ou expirado; o estado semântico preserva assunto, referente, última pergunta/oferta, pendências, fatos já dados, responsável, próxima ação, ambiguidade e confiança, sem substituir o texto nem ultrapassar travas;
- quando o histórico confirma interação anterior, a Bruna preserva o contexto e não repete apresentação nem pergunta de nome; o caso “Eu tenho o pescoço flácido” ficou coberto como obrigação de resposta;
- lifting cervical e lifting facial continuam respondendo diretamente que são cirurgias realizadas em hospital, com anestesista e equipe cirúrgica; “este procedimento” é resolvido pelo contexto mais recente e pelo código da campanha;
- travas clínicas, urgência, segurança, agenda, preço cirúrgico fora da política, falha técnica e intervenção humana continuam fail-closed e podem bloquear a IA;
- o valor da consulta permanece R$ 500, com Pix, débito ou parcelamento e emissão de nota fiscal; é proibido afirmar que os R$ 500 serão reembolsados, devolvidos, descontados ou abatidos de uma cirurgia;
- o ARC adaptativo passou a orientar a resposta pelo contexto completo, estágio, barreira e segurança; exemplos são repertório, não scripts, e acolhimento ou CTA só entram quando forem pertinentes;
- a identidade autorizada é somente Bruna, concierge da Clínica LIV Faria Lima; qualquer resposta gerada que a rotule como automação, bot, robô, IA, assistente ou secretária virtual é bloqueada em fail-closed antes do envio;
- fotos de rosto ou corpo recebem agradecimento pela confiança, reconhecimento cuidadoso de que há boas abordagens que podem ajudar e informação clara de que a imagem será mostrada à Dra. Amanda; a resposta convida à avaliação sem interpretar a imagem, diagnosticar, concluir indicação ou prometer resultado;
- `cervicoplastia` e `lifting cervical` são apresentados como nomes do mesmo contexto de atendimento, sem concluir técnica ou indicação individual; o site preserva `/lifting-cervical/` e o Google Ads não recebeu alteração de orçamento, lance, campanha, grupo ou palavra-chave;
- o prefill `procedure_evaluation_v1` serve somente como contexto: isoladamente não qualifica, não gera conversão offline e não autoriza agenda; pedido de dias ou período exige intenção pessoal posterior, e perfis comerciais não recebem saudação nominal;
- localização foi padronizada para R. Pais Leme, 215, cj. 710, CEP 05424-150, com o link aprovado do Google Maps; cirurgia pode ser parcelada antecipadamente, com quitação antes do procedimento, e tem desconto à vista, enquanto número de parcelas, juros e percentual continuam humanos;
- na candidata `2026-08-19.5`, a primeira pergunta sobre preço de otoplastia continua sem número e pode oferecer uma faixa geral depois do guia facial; somente o aceite ou um novo pedido explícito libera uma única resposta de R$ 8 mil a R$ 14 mil, com ressalvas e sem CTA. A versão `2026-08-19.2` continua definindo a mesma progressão geral de preço: resposta breve, sem lista técnica ou faixa, e um único guia de composição conforme a região confirmada; nunca se usa o guia facial para mama, corpo ou cirurgia íntima, e o material não é repetido no turno da faixa. A pergunta sobre o que mais incomoda continua proibida nesse momento, e as travas de revisão humana foram preservadas;
- cada turno agora define estágio, responsável, intenções pendentes, motivo de silêncio e limites de pergunta, link, CTA e confirmação; quando a resposta já resolveu o pedido, a Bruna não cria uma continuação artificial;
- o validador final bloqueia diagnóstico ou indicação à distância, promessa, valor ou condição não aprovada, confirmação não verificada de agenda, abatimento da consulta, identidade de automação, menu e excesso incompatível com o contexto;
- depois de orçamento, confirmação, despedida ou outra mensagem conclusiva enviada pela equipe, agradecimentos, concordâncias, reações e encerramentos ficam sem resposta automática; a Bruna não abre um novo assunto, não confirma agendamento sem validação humana e não transforma o cumprimento do atendente em pergunta pendente da paciente;
- entre 00:00 e 05:59, a primeira mensagem não urgente e acionável recebe no máximo um reconhecimento curto e contextual, com retomada pela manhã; mensagens seguintes apenas atualizam a fila, e sinais explícitos de que está tarde, de que a conversa ficou para amanhã ou de que a pessoa vai dormir encerram imediatamente qualquer envio noturno;
- no horário noturno extremo são bloqueados textos longos, faixas de preço, links, CTA, oferta de horário e handoff genérico; a retomada começa a partir das 08:00, responde ao pedido concreto e respeita o que a equipe já informou; urgências mantêm o fluxo seguro próprio;
- o e-mail interno só contém sugestão pronta quando o assunto pendente é identificável; contexto insuficiente gera `SEM SUGESTÃO PRONTA`, nunca a antiga frase genérica; se a pessoa já perguntou o preço da consulta, o rascunho responde R$ 500 diretamente e separa consulta de orçamento cirúrgico;
- o site funciona como apoio contextual: responder primeiro, usar no máximo o recurso mais específico quando ele acrescentar utilidade e não devolver a página de origem;
- duas aberturas reais de anúncio, às 19:25 e 19:58, não apareceram nas mensagens, eventos, classificação, CRM, tomada humana ou recuperação da planilha canônica; os registros exatos da YCloud continuam indisponíveis sem acesso autenticado ao console do provedor;
- o consumo mensal observado no Netlify estava em aproximadamente 95 mil de 125 mil requisições, abaixo do limite; a cota não explica essas duas ausências;
- a abertura determinística de anúncio evita a consulta de conhecimento e reutiliza a relação de paciente já devolvida por `append_lead`, removendo até duas chamadas redundantes de planilha; a consolidação agora usa base de três segundos para resposta determinística e cinco para IA, limitada entre dois e oito, sem retirar a regra de mensagem mais recente nem as travas `neverBotReply` e `fail-closed`;
- entradas inválidas ou não reconhecidas passam a registrar motivo operacional seguro (`configuration_missing`, `invalid_signature`, `invalid_json`, `unsupported_event_type`, `invalid_inbound_phone` ou `missing_inbound_event_id`) sem expor telefone, mensagem ou ID bruto;
- código ativo no commit funcional `5f9e247b7a38698d5a9d79836f14e7b4a25ec3c0`, deploy Netlify `6a861fab62e3fc00085b847f` e Apps Script v104 no deployment preservado, com **876/876 testes aprovados**, build local de 178 arquivos, 44 URLs sem erro, domínio, URL imutável e webhook HTTP 200 com automação ativa e metadados de versão `.4` efetivos; rollback imediato do Netlify para deploy `6a85e288a72ee70008cc87b2`, commit `5bb65664798b1d5ca5885fc75b07ec45dbf18833`;
- fonte ativa única no Drive: https://drive.google.com/file/d/17eOwn4Z7v7josBnnPJhBHn31wY-2P1YF/view; projeção substituída no mesmo ID e igual ao manual local pelo SHA-256 `34441c512b6bd2c07095349ac8479fd1abacbfbe4cee0281ed0eedb396e48419`; auditoria comparativa fechada: https://drive.google.com/file/d/1Fw12uukeIa2qKx-a-teI9BQhobNUdHVB/view; os três planos de origem foram preservados e rotulados em `99 — Histórico operacional`;
- a pasta restrita `90.1 — Exportações brutas do WhatsApp` (`1Y_Cn4vAkN0mV_k8RV1VvAtYMSVScF7qS`) é a entrada contínua de evidências; respostas reais não são padrão, dados identificáveis não saem do Drive e somente padrões desidentificados aprovados viram cenários sintéticos versionados;
- nenhuma mensagem de teste nem sonda de paciente foi disparada por nós; na observação passiva, a sequência real seguinte chegou às 20:57, sofreu `timeout`/`busy_retry` no roteamento, foi recuperada por retentativas, suprimiu corretamente a abertura Meta mais antiga e concluiu a resposta à mensagem mais recente com entrega HTTP 200 às 20:58:30;
- essa evidência confirma o funcionamento do webhook, da recuperação e da entrega da Bruna após a publicação; ainda não existe garantia absoluta para eventos que a YCloud deixe de entregar ao Netlify, hipótese que exige o log bruto do provedor;
- rollback imediato do estado atual: deploy `6a85e288a72ee70008cc87b2`, commit `5bb65664798b1d5ca5885fc75b07ec45dbf18833`.
- governança de versões consolidada em 18/08: commit `1c3f556`, deploy Netlify `6a842ffa9399100008f5a827`, PR `#6`, com **760/760 testes aprovados**; o release adicionou gate de consistência, reconciliação segura do checkout, recibo único no manifesto, normalização de fim de linha e bloqueio de duplicatas/pacotes transitórios, sem alterar respostas ou regras da Bruna;
- o índice único do Drive foi atualizado no mesmo arquivo `1nOzoVrL1TwK-oFLyOC_uO5gy01Cf14If`, sem criar cópia; ele aponta para a projeção ativa, para a pasta restrita contínua `90.1` e explicita que respostas reais são evidência crítica, não padrão. A projeção ativa da Bruna permaneceu idêntica ao manual local, com três fontes históricas, uma auditoria fechada e a pasta de mudanças em andamento vazia;
- a reconciliação do checkout principal foi concluída em 18/08 após a liberação de escrita em `.git`: HEAD local e remoto ficaram idênticos ao commit de produção `4eb5fb5`, deploy Netlify `6a843b14f04aa60008570fdf`, PR `#8`; o gate final retornou `OPS_CHECK_STATUS=OK` e **760/760 testes aprovados**. O release normalizou exclusivamente CRLF para LF em 13 arquivos legados, com diff funcional vazio e sem alterar respostas, regras ou integrações da Bruna.

### Auditoria 1 — Google Ads

**Estado geral:** Lote 1 concluído em 22/08; auditoria ao vivo de BLEF, CERV, OTO, FACE e MARCA encerrada no mesmo dia sem nova alteração, porque mensuração e downstream ainda não passaram os gates. Lifting permanece em sua janela controlada de recuperação de tráfego.

Já foi feito:

- importação insegura pausada e eventos legados colocados em quarentena;
- IDs opacos, códigos canônicos, URLs e orçamento corrigidos;
- orçamento total retornado a R$ 87/dia e lifting cervical a R$ 12/dia;
- negativas de preço genéricas perigosas foram evitadas;
- nenhuma campanha nova, Performance Max, ampla, tCPA ou aumento foi aplicado;
- testes de anúncios foram colocados em sequência para não misturar efeitos.
- rotina somente leitura de revisão do Google Ads publicada como script `12117745`, autorizada, testada sem mudanças e com programação diária `09:00–10:00` ativa;
- agregado anônimo do funil publicado pelo Apps Script versão `92`, com trigger diário aproximadamente às `08:15` e sem PII.
- auditoria de fases aplicada em 176 oportunidades: 5 conversões qualificadas com click ID foram preparadas, 2 falsos eventos foram invalidados e 2 `RETRACT` idempotentes foram projetados em arquivo separado sem PII;
- conexão `LEADS` do Data Manager reativada diariamente entre `05:00–06:00` BRT, com próxima execução marcada para `23/08 05:05`; a execução manual de `22/08 11:25` processou um arquivo de 5 linhas sem erro de arquivo, com correspondência individual ainda `N/D`;
- upload separado dos 2 ajustes validou o schema e o fuso `-0300`; ambos retornaram `conversão não existe` e o recibo final ficou `Sem alterações`, coerente com a evidência de que os falsos eventos não chegaram à conta; o arquivo dedicado ficou com horário ativo diariamente às `06:00` BRT, depois da importação principal;
- os dois anúncios ativos de lifting passaram a usar `_camp=G26LIFT`, eliminando a sobrescrita de anúncio `_camp=g26f01`; nenhuma evidência histórica foi reinterpretada;
- `S_BR_SP_LIFTING_FACIAL` passou de Maximizar conversões para Maximizar cliques, sem limite de CPC, preservando R$ 24/dia e a meta específica `Lead qualificado GCLID`; nenhuma outra campanha ou orçamento foi alterado.
- auditoria ao vivo de `G26BLEF`, `G26CERV`, `G26OTO`, `G26FACE` e `G26MARCA` concluída em 22/08: URLs e códigos íntegros, nenhuma mudança publicada, orçamentos antes/depois idênticos e total operacional preservado em R$ 87/dia. O agregado de 15–21/08 tinha 7 contatos Google, somente 2 com campanha canônica — ambos OTO — e nenhum classificado. A duplicidade do RSA OTO ficou condicionada ao tracking; nenhuma negativa BLEF foi criada porque `"preço popular"` já está bloqueado na lista compartilhada. A mesma lista bloqueia `"projeto orelhinha"` e alcança `G26LIFT`, exigindo revisão isolada de governança antes de qualquer alteração.

Ainda falta:

- acompanhar os primeiros ciclos diários; somente eventos aceitos e reconciliados podem voltar a alimentar decisões de lance;
- revisar volume, termos, contatos válidos, qualificados e consultas após 7 dias, sem retornar a Maximizar conversões enquanto o histórico aceito continuar escasso;
- confirmar ao vivo e, se ainda ausentes, aplicar as três negativas exatas de roteamento do grupo geral de lifting;
- normalizar novos contatos com códigos G26 canônicos: no primeiro agregado, os 16 contatos Google de 30 dias permaneceram em campanha desconhecida por usarem referências antigas/ambíguas; não reinterpretar o histórico por inferência;
- manter Meta facial em 40+; a decisão etária do Google foi adiada porque não há downstream atribuível por idade. Preservar sempre `Desconhecida` e não alterar OTO ou MARCA;
- executar os testes de RSA um por vez, começando por OTO somente depois de registrar a data real de início e confirmar tracking saudável; as datas antigas não contam como janela de um teste que não começou;
- medir desempenho mobile/vídeos antes de otimizar;
- obter decisão Codame/jurídica sobre galerias, imagens e consentimentos.

### Rotina recorrente — Meta Ads

**Estado geral:** `ATIVO` desde 16/08. O código somente leitura está preservado na produção canônica v104, o agregado anônimo e o acesso à API foram testados ao vivo e existe um único trigger diário para cada função. Todo e-mail enviado inclui métricas essenciais de 7 e 30 dias; a análise detalhada permanece semanal. A rotina não autoriza mudança automática na Meta.

Escopo aprovado:

- agregado `Meta_Agregados` no mesmo arquivo anônimo de mídia, sem criar uma planilha redundante;
- alerta diário de saúde aproximadamente às 10:05;
- revisão completa toda terça-feira, com 7/30 dias e comparação com os sete dias anteriores;
- leitura de 90 dias no segundo dia útil do mês;
- campanha, conjunto, anúncio, criativo/vídeo, demografia, posicionamento, destino e funil;
- filas `Corrigir agora`, `Pode testar`, `Aguardar dados` e `Não alterar`;
- zero mutação automática e zero PII.

Correção etária de 16/08:

- o alerta estava correto: `M26F01W` e `M26F02S` tinham `age_min=25`; o `40–65+` era sugestão expansível;
- `M26F02S` foi publicado com limite rígido `40–65+`;
- a tentativa de republicar o objeto histórico `M26F01W` ficou bloqueada pela Conta do WhatsApp Business e pelo mínimo de R$ 600,18; esse rascunho foi descartado e a campanha histórica não será reativada;
- em 17/08 a nova campanha de Tráfego → WhatsApp foi publicada com piso rígido 40–65+, São Paulo +20 km, R$ 300 total e somente `C06H01`; início programado às 12h e término em 01/09 às 12h.

Gate de ativação concluído em 16/08:

- Apps Script canônico na versão 94;
- `publicarAgregadosFunilMetaAds` executado às 08:27 BRT, com 0% de erro no painel de triggers;
- token permanente de usuário do sistema, limitado a `ads_read`, guardado somente nas propriedades do projeto;
- Graph API fixada em `v26.0` e conta `1643959806249995` validada às 12:06;
- teste real concluído às 12:20 e entregue por e-mail com duas sinalizações críticas e garantia de zero mutação;
- um único trigger `executarRevisaoMetaAds` criado às 12:23, além do único trigger do agregado.

Decisão de encerramento e próximo ciclo — 16/08:

- o fechamento de 30 dias confirmou que `M26F01W` é a única rota com resultado de negócio rastreável: 67 contatos, 12 qualificados ou posteriores e 2 agendados ou posteriores, com gasto de R$ 598,45;
- `C06H01` — Lifting concentrou 85 das 86 conversas do WhatsApp, a R$ 6,65 por conversa; `C01H01` — Avaliação teve 1 conversa a R$ 32,76. No site, a ordem se inverteu para tráfego: `C01H01` gerou LPV a R$ 0,27, mas sem resultado de negócio atribuído;
- `M26F02S` encerra sem renovação proposta: 2.020 LPVs a R$ 0,29 e 0 contatos sob o código exato significam atribuição não comprovada, não zero contato real;
- `M26O01W` termina em 19/08, não em 16/08. Com R$ 214,05 gastos, 0,30% de CTR link, 1 conversa e nenhuma consulta registrada, a proposta é interromper o saldo e não reutilizar o criativo atual;
- decisão revisada: manter `M26F01W` somente com `C06H01` e destino WhatsApp, não renovar `M26F02S`, interromper `M26O01W` e restringir a comparação de rota ao lifting cervical em `M26C01W` — WhatsApp direto — versus `M26C02S` — site → WhatsApp —, com 40–65+ rígido, R$ 300 total por braço e janela preparada de 17/08 às 12h a 01/09 às 12h;
- os vídeos finais cervicais 1:1 e 9:16 corrigem `cervicoplastia`; o quadrado fica no Feed e o arquivo 9:16 já enviado ocupa Reels/Stories, sem recorte automático. Daniel aceitou manter o CTA falado/embutido `Clique no link da bio`. O orgânico foi agendado para 20/08/2026 às 19h30 e será separado dos anúncios, sem reutilização do post;
- o pacote técnico foi publicado nos commits `2b5af19` e `436aff0`; o Apps Script canônico foi atualizado no mesmo deployment para v97, o schema v1 foi habilitado e a sonda sintética `synthetic_attribution_v2_20260817` concluiu com HTTP 200 antes do gasto;
- os dois braços cervicais foram publicados no Ads Manager: `M26C01W` — campanha `120251248762160627`, conjunto `120251248762180627`, anúncio `120251248762170627`; `M26C02S` — campanha `120251249058750627`, conjunto `120251249058780627`, anúncio `120251249058760627`. A Meta confirmou um conjunto e um anúncio por campanha; herdados desligados;
- o lifting facial foi reconstruído e publicado: campanha `120251254720690627`, conjunto `120251254720700627`, anúncio C06 `120251254720680627`, R$ 300 total, 17/08 12h–01/09 12h, São Paulo +20 km e controle rígido 40–65+; o anúncio C01 herdado `120251254720710627` permaneceu desligado;
- o ciclo entra em monitoramento com D+3 em 20/08, D+7 em 24/08, D+15 em 01/09 e D+22 em 08/09. O dia parcial de 17/08 não será usado para escolher rota.

### Piloto futuro — Aqui Ads (OOH hiperlocal)

**Estado geral:** `AGENDADO PARA DECISÃO EM 16/09/2026; COMPRA NÃO AUTORIZADA`. O papel do canal é aumentar familiaridade e presença local entre pessoas de maior poder aquisitivo, especialmente 40+, sem tratar exposição estimada como paciente, lead ou consulta.

- **Desenho inicial:** quatro semanas, com shortlist de dois edifícios residenciais premium e um salão/spa premium. Priorizar Jardim Europa, Itaim Bibi, Vila Nova Conceição, Alto de Pinheiros e Pinheiros; deixar edifícios comerciais da Faria Lima para uma segunda etapa.
- **Envelope indicativo:** aproximadamente `R$ 1.206,20` por quatro semanas, antes da produção da peça, com base nas simulações consultadas em 16/08. Revalidar inventário, preço, perfil do local e metodologia de audiência em 16/09. A verba deve ser incremental e não pode sair do Google ou da Meta.
- **Criativo:** uma peça institucional, sem preço, promoção, promessa, vergonha ou antes/depois; Dra. Amanda como anunciante principal, com nome, `MÉDICA`, `CRM-SP 191605` e `RQE 110472`, sujeito ao gate Codame/jurídico e às regras finais do local.
- **Mensuração:** QR e landing/WhatsApp exclusivos registrados no catálogo canônico de atribuição, pergunta `Como conheceu?`, busca de marca, acesso direto, interações do Perfil da Empresa, contatos válidos, qualificados e consultas agendadas. Não inventar código antes do pré-voo.
- **Gate de ativação:** cobertura de atribuição esperada de pelo menos 80%, capacidade de atendimento confirmada, orçamento incremental autorizado, peça aprovada e nenhuma mudança material de Google, Meta ou atribuição na mesma janela. Se houver conflito, o OOH espera a primeira janela limpa após 16/09.
- **Decisão:** D+7 técnico, D+14 sinal intermediário, D+28 fechamento e D+35 latência. Menos de 80% de cobertura torna o teste inconclusivo. Não renovar se houver zero qualificado atribuído com tracking saudável e nenhum sinal coerente de marca; qualquer renovação ou escala exige nova autorização e custo por qualificado/agendamento aceitável.

### Auditoria 2 — SEO, IA e atribuição

**Estado geral:** atribuição rica e schema v1 publicados e ativados sob autorização integral; sonda sintética aprovada; fase atual é monitoramento e reconciliação ao vivo.

Já foi feito:

- commit técnico `50d7ea1` publicado no Netlify;
- Apps Script versão 91 publicou o pacote default-off; a produção atual é a versão 104, que preserva as rotinas anônimas, somente leitura, os códigos cervicais e o schema v1 habilitado, além da correção operacional dos comprovantes de agendamento, da regra de salas do formulário, do ledger contextual do WhatsApp, do prefill estruturado e da exclusão segura de contatos comerciais na Central;
- smoke tests públicos aprovados;
- auditorias excluídas do artefato do site;
- logs e IDs endurecidos;
- estrutura de atribuição rica preparada;
- página de custo do lifting sem faixas públicas;
- feature `attributionJourneyEnabled=true` publicada no commit `436aff0` e schema v1 habilitado no Apps Script v97;
- risco residual do `JID` visível/editável aceito por Daniel em 15/08/2026.

Ainda falta para manter a atribuição rica após a ativação:

- observar o purge e validar retenção/acesso dos sistemas externos em produção;
- confirmar a política de privacidade publicada e o comportamento real do consentimento;
- reconciliar a sonda aprovada com os primeiros eventos reais, sem usar paciente como teste;
- reconciliar LEADS/CRM, Calendar, rotas e SLA;
- validar GSC, domínio Wix antigo, CWV e fontes externas;
- manter rollback pronto: desligar a feature e o schema diante de PII, duplicidade, first touch sobrescrito ou regressão de atendimento.

**Importante:** a ativação ocorreu em 17/08 após autorização integral. O bloco de 20/08 passa a ser a saúde D+3: não repetir a migração nem reativar o que já está ativo; verificar eventos, cobertura e rollback.

## 4. O que vocês precisam fazer agora

| Até quando | Responsável | Ação humana | Se não for possível |
|---|---|---|---|
| 17/08, antes das 17:30 | Daniel | participar da reunião de suporte de tags do Google; não aceitar mudanças amplas ou automáticas sem registro e revisão | coletar a recomendação e não aplicar na hora |
| 20/08, antes das 14:00 | Amanda/equipe | localizar autorizações/consentimentos das imagens e separar dúvidas para Codame/jurídico, sem subir documentos pessoais no repositório | manter congelado novo uso/reuso das galerias |
| 20/08, durante 15:00–16:00 | Daniel/equipe | acompanhar a saúde D+3 da atribuição; nenhuma nova autorização é necessária para o que já foi publicado | se houver PII, atribuição incorreta, first touch sobrescrito ou regressão, autorizar somente o rollback já planejado |
| quando houver parecer | Amanda/jurídico/Codame | registrar decisão sobre galerias, imagens sensíveis/menores, consentimentos, retenção e comunicação de preços | não alterar/publicar esses itens por inferência |

Fora dessas ações, não há tarefa técnica que Daniel precise executar manualmente. O restante deve ser conduzido e documentado pelo responsável técnico.

## 5. Cronograma mestre

Todas as datas usam America/Sao_Paulo. Uma data não é autorização automática: primeiro se confirmam os gates.

| Data e hora | Bloco | Estado | O que será feito | Publicação ou escrita externa | Condição para avançar |
|---|---|---|---|---|---|
| diariamente, aproximadamente 08:15 | LEADS → Google Ads: agregado anônimo | `ATIVO` desde 15/08; Apps Script v92 | atualizar coortes de 7/30/90 dias na aba `Agregados` do arquivo `LIV — Agregados de mídia paga — sem PII` | grava somente contagens no arquivo agregado; nenhum dado de paciente | schema v1, zero PII, atualização <36 h e conta Ads somente leitora |
| diariamente, 09:00–10:00 | Google Ads: saúde automatizada | `ATIVO`; calibração local no commit `ee5df71`, publicação proprietária agendada para 24/08 | gasto por mesmo dia da semana, entrega, políticas, páginas, meta qualificada efetiva, fontes e funil; cooldown de 48 h | e-mail automático; zero mutação na conta | salvar e visualizar como `aschroeder.br@gmail.com`; preservar a programação existente e declarar cada fonte `OK` ou `N/D` |
| toda segunda, 09:00–10:00 | Google Ads: revisão tática automatizada | `ATIVO`; primeiro envio de 17/08 auditado e calibrado localmente | semana + 30 dias; termos, positivas, negativas completas, Quality Score, metas personalizadas, RSAs/recursos, segmentos, páginas, mudanças e funil | e-mail automático; alterações continuam manuais e autorizadas | 39 variações de preço consolidadas; seis roteamentos verificados deixam de ser falsos P0; autobloqueio cervical continua acionável |
| primeiro dia útil do mês, 09:00–10:00 | Google Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 01/09 | acrescentar 90 dias, eficiência do funil, cenários dentro de R$ 87/dia e prontidão de testes | e-mail automático; nenhuma execução de recomendação | fontes íntegras, mudanças datadas e funil reconciliado antes de decidir |
| diariamente, aproximadamente 08:25 | LEADS → Meta Ads: agregado anônimo | `ATIVO` desde 16/08; Apps Script v104 | atualizar 7/30/90 dias por caminho, campanha e criativo conhecido na aba `Meta_Agregados` | grava somente contagens no arquivo agregado; nenhum dado de paciente | schema v1, zero PII, atualização <36 h e códigos conflitantes como N/D |
| diariamente, aproximadamente 10:05 | Meta Ads: saúde automatizada | `ATIVO` desde 16/08; Apps Script v104 | gasto no mesmo dia da semana, entrega/status, idade facial, páginas, fonte e funil; todo e-mail enviado inclui resumo 7/30 de mídia e funil | e-mail somente para alerta crítico; zero mutação | token `ads_read` protegido, conta validada, Graph `v26.0` e execução real sem escrita |
| toda terça-feira, aproximadamente 10:05 | Meta Ads: revisão tática automatizada | `ATIVO`; primeiro envio completo em 18/08 | 7 dias, sete anteriores e 30 dias; campanha, conjunto, anúncio, criativo/vídeo, segmentos, páginas e funil | e-mail automático; alterações continuam manuais e autorizadas | conferir os três primeiros relatórios e calibrar apenas falso positivo comprovado |
| 17/08, após gates técnicos | Meta Ads: lifting facial contínuo + experimento cervical Site × WhatsApp | `PUBLICADO; INÍCIO 12H` | `M26F01W/C06H01`, `M26C01W` direto e `M26C02S` via `/lifting-cervical/`; R$ 300 total por campanha, 17/08 12h–01/09 12h; Feed 1:1 e Reels/Stories 9:16 | código/Apps v97/schema/sonda publicados primeiro; depois três publicações seletivas, cada uma com 1 campanha + 1 conjunto + 1 anúncio | conferir a entrega real, idade efetiva e primeiros eventos; não mudar público, orçamento, destino ou criativo durante a janela |
| 20/08 19:30–19:50 | Instagram orgânico: Reels de lifting cervical | `AGENDADO` | publicar o vídeo 9:16 aprovado; manter `Clique no link da bio`; conferir link da bio e separar origem orgânica | publicação manual no Instagram | não reutilizar o post como anúncio nem atribuir o tráfego orgânico aos braços pagos |
| 18/08, após o relatório Meta | Meta WhatsApp: confirmar entrega etária | `CONDICIONAL À PUBLICAÇÃO` | conferir `age_min=40` e distribuição real por idade nos três novos conjuntos; não reabrir a migração do objeto histórico se o novo desenho funcionar | leitura e eventual correção só com autorização | novo `M26F01W` publicado seletivamente e sem expansão abaixo de 40 |
| segundo dia útil do mês, aproximadamente 10:05 | Meta Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 02/09 | acrescentar 90 dias, eficiência até consulta e prontidão de testes | e-mail automático; nenhuma recomendação aplicada | fontes íntegras; o cálculo considera segunda a sexta e não infere feriados |
| 25/08 17:30–18:00 | Suporte de tags do Google | `AGENDADO; REAGENDADO PELO GOOGLE` | diagnóstico da implementação; registrar recomendações e evitar mudanças não planejadas | não aplicar mudança ampla durante a chamada | backup, acesso correto e escopo registrado |
| 20/08 12:30–13:15 | Cervical Site × WhatsApp: saúde D+3 | `AGENDADO` | conferir equilíbrio de gasto, idade efetiva, códigos, LPV, CTA, conversas e contatos identificados | corrigir somente falha técnica; pausar ambos se o Site não for rastreável | três dias desde o início programado; dia parcial de lançamento excluído da leitura de desempenho |
| 22/08 09:00–12:00 | Google Ads: Lote 1 — mensuração, atribuição e LIFT | `CONCLUÍDO` | reconciliar conversões por fase; reativar importação diária; tentar retrações separadas; corrigir `_camp`; abrir janela de Maximizar cliques no LIFT | Apps Script v117; 5 conversões preparadas; 2 retrações sem alteração porque as conversões não existiam; orçamento R$ 24/dia preservado | zero PII, zero mensagem real, deployment canônico preservado, outras campanhas intactas |
| 22/08 10:00–22:06 | Google Ads: auditoria ao vivo BLEF, CERV, OTO, FACE e MARCA | `CONCLUÍDO; REABERTA E CORRIGIDA NA MENSURAÇÃO` | comparar mídia e funil; depois remover cinco sobrescritas legadas de anúncio em BLEF, CERV, FACE e MARCA | cinco correções factuais de parâmetros; nenhuma edição de orçamento, lance, site, texto ou OTO/LIFT | pós-voo por entidade confirmou herança canônica; medir novos contatos em 7 e 14 dias |
| 24/08 08:30–09:00 | Google Ads: publicar calibração da rotina | `AGENDADO; DEPENDE DA PROPRIETÁRIA` | salvar o commit `ee5df71` no script `12117745`, executar prévia e verificar fontes | código somente leitura; não remover/recriar a programação | login `aschroeder.br@gmail.com`, prévia sem mutação e campos `OK`/`N/D` |
| 20/08 11:15–12:00 | CWV, vídeos e recursos | `AGENDADO` | medir laboratório/campo e 4G; abrir causas reais de recursos/logotipos | nenhuma otimização automática | baseline reproduzível; uma classe de ativo por futuro teste |
| 20/08 14:00–14:45 | Compliance e imagens | `DEPENDE DE VOCÊS` | revisar inventário, consentimentos, galerias, imagens sensíveis/menores e Codame | nenhuma remoção/publicação sem parecer | documento/parecer humano e escopo registrado |
| 18/08 15:30–16:00 | Atribuição rica: checagem de 24 horas | `AGENDADO` | erros, logs sem PII, purge, JID fora do resolvedor, perda de origem, LEADS/CRM e sinais de rollback | nenhuma nova expansão | ativação em 17/08; reverter diante de PII, atribuição incorreta, first touch sobrescrito ou regressão de atendimento |
| 20/08 15:00–16:00 | Atribuição rica: saúde D+3 e retenção | `AGENDADO` | purge, consentimento, resolução/fallback, origem, LEADS/CRM, Calendar, rota e SLA | não repetir deploy ou migração | correlacionar com a saúde Meta sem misturar métricas |
| 24/08 12:30–13:15 | Cervical Site × WhatsApp: primeira decisão D+7 | `AGENDADO` | comparar contatos identificados, válidos, qualificados e agendados por rota | manter ou pausar segundo o plano; não trocar criativo | cobertura ≥80%; pausar um braço se gastar ≥R$ 150 sem contato válido com tracking saudável |
| 27/08 09:00–10:00 | Google Ads: saúde técnica da mensuração e recomendações | `AGENDADO; CALENDAR ATUALIZADO` | histórico de alterações, receipts, frescor, códigos, cobertura, classificação e primeiro e-mail após a calibração | não iniciar RSA, idade, lance ou orçamento por calendário | pelo menos 1–2 ciclos limpos; fontes `OK`/`N/D`; zero PII e duplicidade |
| 24/08 14:00–14:30 | Atribuição rica: 7 dias | `AGENDADO` | erros, resolução/fallback, origem, LEADS/CRM, Calendar/SLA e logs | manter ou reverter; nenhuma expansão | janela iniciada em 17/08 |
| 27/08 11:00–11:30 | Atualização executiva | `AGENDADO` | atualizar este plano, Drive, datas e decisões | nenhuma | checkpoints anteriores encerrados |
| 01/09 12:30–13:30 | Cervical Site × WhatsApp: decisão D+15 | `AGENDADO` | fechar contatos, qualificados, agendados e custos por rota; declarar N/D se a amostra não separar | eventual continuidade exige nova autorização | orçamento encerrado às 12h, cobertura ≥80% e nenhuma quebra operacional |
| 30/08 09:00–10:00 | Google Ads: leitura de 7 dias da mensuração | `AGENDADO; CALENDAR CRIADO` | ler `23–29/08` por campanha até contato válido, qualificado e consulta; confirmar orçamento e proteção | nenhuma mudança simultânea; ausência = `N/D` | cobertura canônica, classificação e receipts saudáveis |
| 03/09 09:00–10:00 | Google Ads: gate de elegibilidade do primeiro teste OTO | `AGUARDAR DADOS; CALENDAR CORRIGIDO` | decidir apenas se o RSA adulto OTO pode começar; não encerrar um teste inexistente | um RSA por vez; janela começa somente na publicação real | 1–2 ciclos limpos, baseline registrado, downstream atribuível e nenhuma mudança concorrente |
| 06/09 09:00–10:00 | Google Ads: leitura de 14 dias e decisão de estabilidade | `AGENDADO; CALENDAR CRIADO` | ler `23/08–05/09`, comparar janelas completas e decidir manter, rollback factual ou inconclusivo | nenhuma mudança de orçamento, lance, idade, rede ou site | funil atribuível, receipts saudáveis e nenhuma intervenção concorrente |
| 31/08 14:00–14:30 | Atribuição rica: 14 dias | `AGUARDAR DADOS` | avaliar estabilidade, reconciliação, purge, consentimento e incidentes | manter ou reverter | janela iniciada em 17/08 |
| 08/09 12:30–13:15 | Cervical Site × WhatsApp: latência D+22 | `AGENDADO` | incorporar classificações, comparecimentos e agendamentos tardios | nenhuma nova mudança simultânea | sete dias após o fechamento do ciclo |
| 16/09 10:00–11:00 | Aqui Ads: decisão e pré-voo do piloto OOH | `AGENDADO; COMPRA NÃO AUTORIZADA` | revalidar shortlist de dois residenciais premium e um salão/spa, preço, audiência, peça, compliance, rastreamento e capacidade | nenhuma compra sem autorização específica no momento | Meta/atribuição encerradas ou estáveis, sem outra mudança material; verba incremental de aproximadamente R$ 1.206,20 confirmada |
| D+7 do piloto Aqui Ads | OOH: saúde técnica | `CONDICIONAL À ATIVAÇÃO` | validar QR, landing/WhatsApp, classificação de origem e disponibilidade dos pontos | corrigir apenas falha técnica; nenhuma troca de local/peça por amostra precoce | sete dias completos desde a veiculação real e cobertura de atribuição mensurável |
| D+14 do piloto Aqui Ads | OOH: leitura intermediária | `CONDICIONAL À ATIVAÇÃO` | ler busca de marca, direto, Perfil da Empresa, contatos válidos, qualificados e consultas | nenhuma renovação ou escala | tracking saudável e nenhuma mudança concorrente |
| D+28 do piloto Aqui Ads | OOH: decisão de continuidade | `CONDICIONAL À ATIVAÇÃO` | encerrar quatro semanas e classificar manter, não renovar ou inconclusivo | renovação somente com nova autorização | cobertura ≥80% e sinal de negócio; métricas da plataforma são apenas diagnóstico |
| D+35 do piloto Aqui Ads | OOH: latência | `CONDICIONAL À ATIVAÇÃO` | incorporar qualificações e agendamentos tardios e fechar o registro | nenhuma nova mudança simultânea | sete dias após o término da veiculação |
| D+14 do início real de OTO | Google Ads: decisão OTO; possível início CERV | `AGUARDAR DADOS` | decidir OTO e iniciar CERV somente se elegível | um teste por vez | OTO com 14 dias, preferencialmente ≥50 cliques, downstream legível e tracking saudável |
| 14/09 14:00–14:30 | SEO/IA/atribuição: 28 dias | `AGUARDAR DADOS` | GSC, GA4, CWV, crawlers, origem e funil | nenhuma nova hipótese no mesmo momento | janela pós-ativação completa desde 17/08 |
| D+14 do início real de CERV | Google Ads: decisão CERV; possível início BLEF | `AGUARDAR DADOS` | decidir CERV e, se elegível, iniciar BLEF | um teste por vez | CERV encerrado e tracking saudável |
| D+14 do início real de BLEF | Google Ads: decisão BLEF; possível início FACE | `AGUARDAR DADOS` | decidir BLEF e iniciar FACE somente se elegível | um teste por vez | BLEF encerrado; manter linguagem leiga legítima |
| 15/10 09:00–10:00 | Decisão FACE; possível teste LIFT preço | `AGUARDAR DADOS` | decidir FACE e testar composição/orçamento individual no grupo de preço | sem voltar a publicar faixa cirúrgica | FACE encerrado; tracking estável |
| 12/11 09:00–10:00 | Decisão LIFT preço | `AGUARDAR DADOS` | avaliar contato válido, qualificado e consulta; decidir manter ou consolidar | nenhuma decisão por CTR isolado | 28 dias e, preferencialmente, ≥100 cliques |
| 18/11 09:00–09:30 | SEO/IA/atribuição: 90 dias | `AGUARDAR DADOS` | leitura longa de SEO, IA, atribuição e funil | planejar próximo ciclo | fontes reconciliadas e data-base válida |

## 6. Gates de publicação e ativação

### Pode publicar quando

- o escopo estiver isolado e aprovado;
- suíte, diff e artefato estiverem verdes;
- local = commit aprovado;
- alvo canônico estiver confirmado;
- backup e rollback existirem;
- nenhuma PII aparecer em logs, IDs ou relatórios;
- a mudança tiver métrica, janela e regra de reversão;
- houver autorização explícita no momento da publicação.

### Não publicar quando

- o relatório diz `N/D` para um gate crítico;
- houve outra mudança material na mesma janela;
- a planilha, CRM ou Calendar não podem ser reconciliados;
- falta receipt de conversão offline;
- a alteração depende de parecer jurídico/Codame ainda inexistente;
- o worktree contém arquivos fora do escopo;
- o evento de Calendar está desatualizado em relação a este plano.

### Regra especial para a atribuição rica

A aceitação do risco do `JID` resolveu apenas uma decisão. A ativação continua exigindo:

1. política de privacidade e retenção coerentes;
2. purge observado;
3. schema e migração aprovados;
4. sonda E2E segura;
5. reconciliação LEADS/CRM;
6. monitoramento e rollback;
7. autorização própria de ativação.

## 7. Backlog agrupado

| Pacote | Prioridade | Estado | Próxima decisão |
|---|---|---|---|
| Conversão offline Google e receipts | P0 | `CONCLUÍDO` somente quanto à configuração do Lote 1 de 22/08; arquivo de 5 linhas processado sem erro de arquivo, correspondência individual `N/D`, conexão principal diária e ajustes separados ativos às 06:00, com recibo `Sem alterações` | acompanhar os ciclos diários; não otimizar por evento rejeitado ou não correspondido |
| Meta → site → WhatsApp → LEADS/CRM | P0 | sonda sintética aprovada; ciclo real `EM MONITORAMENTO` | conferir cobertura e consistência em D+3/D+7 antes de declarar o caminho funcional ao vivo |
| Atribuição rica J0/J1/J2 | P0 | `ATIVA` desde 17/08; risco JID aceito | monitorar resolução, fallback, encaminhamento, duplicidade e rollback |
| Schema/identidade da LEADS | P0 | schema v1 habilitado no Apps Script v97 | reconciliar LEADS/CRM e não repetir migração sem novo preflight |
| Calendar, rotas e SLA | P0/P1 | `AGUARDAR DADOS` | reconciliar após migração/sonda |
| Experimentos Google Ads | P1 | LIFT em Maximizar cliques desde 22/08; RSA OTO não iniciado; demais campanhas preservadas | revisar mensuração em 27/08 e reavaliar OTO em 03/09; toda janela editorial começa somente na publicação real |
| Rotina automatizada Google Ads | P1 | `ATIVO` desde 15/08; script `12117745`, diário 09:00–10:00 | revisar os três primeiros relatórios e calibrar somente falsos positivos comprovados |
| Rotina automatizada Meta Ads | P1 | `ATIVO` desde 16/08; Apps Script v104; somente leitura | conferir os três primeiros relatórios completos e calibrar somente falsos positivos comprovados |
| Meta — LIFT contínuo + CERV Site × WhatsApp | P1 | `PUBLICADO; EM MONITORAMENTO` desde 17/08 | manter somente `M26F01W/C06H01` no WhatsApp e analisar separadamente; comparar apenas `M26C01W` × `M26C02S`; nenhuma troca de criativo, rota, público ou orçamento durante a janela |
| Idade das campanhas faciais | P1 | Meta 40+ mantido; Google `AGUARDAR DADOS`, sem exclusão aplicada | reconsiderar somente com downstream atribuível por idade; manter `Desconhecida` e não alterar OTO/marca/rino |
| SEO técnico/CWV | P1/P2 | baseline parcial | medir 20/08; otimizar só com gargalo comprovado |
| GSC, Wix antigo, Bing e IA | P1/P2 | dependência externa | validar acesso/estado; não prometer ranking ou citação |
| Aqui Ads — piloto OOH hiperlocal | P2 | `AGENDADO PARA DECISÃO EM 16/09`; nenhuma compra autorizada | revalidar dois residenciais premium + um salão/spa, orçamento incremental, metodologia de audiência, peça e tracking; ativar apenas na primeira janela limpa |
| Galerias, imagens e consentimentos | P0 | `DEPENDE DE VOCÊS` | Codame/jurídico e inventário restrito |
| Comunicação e CRO | P1/P2 | adiada | somente depois da base técnica/atribuição e aprovação textual |

## 8. O que não deve ser alterado agora

- não aumentar o orçamento total por causa da pontuação de otimização;
- não ativar Performance Max, ampla, Display ou parceiros automaticamente;
- não reduzir o piso de 40+ do Meta facial; confirmar a entrega efetiva do Advantage+ antes de concluir que o piso foi obedecido;
- não excluir idade `Desconhecida` no Google nem aplicar a regra etária a otoplastia, marca ou futura rinoplastia;
- não colocar verba nova na rota facial histórica `M26F02S`; o único teste Site ativo é o cervical `M26C02S` já sondado;
- não reduzir o piso 40+ nem alterar a equivalência de `M26C01W` e `M26C02S` durante a janela;
- não renovar `M26F02S`, não reativar `C01H01`, não criar versão Site para lifting facial e não publicar o vídeo cervical organicamente antes da janela;
- não publicar o rascunho pendente de `M26O01W` como se fosse cervical e não gastar o saldo da otoplastia sem decisão específica;
- não executar vários RSAs simultaneamente;
- não remover termos leigos legítimos, como “plástica das pálpebras”;
- não consolidar os grupos de lifting geral e preço antes da janela definida;
- não reintroduzir faixa cirúrgica pública na página de custo;
- não alterar galerias/imagens por inferência antes do parecer;
- não ativar feature/schema apenas porque o código já foi publicado;
- não comprar ou ativar Aqui Ads antes do gate de 16/09, nem retirar a verba do Google/Meta ou sobrepor o piloto a outra mudança material;
- não usar a matriz `17-STATUS-RECOMENDACOES.csv` isoladamente: ela preserva o estado anterior ao deploy default-off.

## 9. Calendário e conflitos

O Calendar é lembrete, não fonte de decisão. Este plano prevalece.

O checkpoint técnico de 27/08 foi preservado. As decisões editoriais posteriores passaram a depender da data real de início: o RSA OTO não começou em 20/08, portanto 03/09 apenas reavalia sua elegibilidade e não encerra um teste inexistente. Meta facial permanece em 40+; idade Google continua sem exclusão e só volta ao gate quando houver downstream atribuível por faixa.

A rotina do Google Ads não cria três automações concorrentes. Um único script roda diariamente: fica silencioso quando a saúde está normal, envia a revisão completa às segundas-feiras e acrescenta 90 dias no primeiro dia útil do mês. Os checkpoints de 7 e 14 dias continuam no Calendar porque dependem da data real de cada mudança.

A rotina da Meta Ads também usa um único revisor diário: fica silenciosa sem alerta crítico, envia a revisão completa às terças-feiras e acrescenta 90 dias no segundo dia útil do mês. O agregado anônimo roda separadamente antes do relatório. Ambos estão preservados e ativos na v104 e continuam incapazes de alterar campanhas.

O experimento Meta proposto em 16/08 tem checkpoints relativos em D+3, D+7, D+15 e D+22. Eles só devem virar lembretes ativos depois de registrar a hora real da veiculação; se qualquer gate impedir o início, nenhum lembrete absoluto será criado e o plano continua em espera.

O gate do Aqui Ads fica fixado em 16/09. A veiculação e os checkpoints D+7, D+14, D+28 e D+35 só recebem datas absolutas depois da compra autorizada. Se o experimento Meta ainda estiver em latência ou se a decisão de Google Ads de 17/09 iniciar outra mudança, o OOH é adiado para preservar uma janela interpretável.

Se a ativação não ocorrer em 20/08, todas as janelas de 24 horas, 7, 14, 28 e 90 dias devem ser recalculadas a partir da data real.

## 10. Regra de manutenção deste plano

Após qualquer execução:

1. atualizar estado, evidência e próxima data neste arquivo local;
2. commitar a atualização;
3. substituir o mesmo arquivo de planejamento no Drive;
4. corrigir os lembretes afetados;
5. registrar publicação/deploy quando houver;
6. nunca criar outro `plano final`, `plano novo` ou planilha paralela.

## 11. Fontes técnicas subordinadas

- `auditorias/auditoria-google-ads-2026-08-14/EXECUCAO-2026-08-15.md`;
- `auditorias/auditoria-google-ads-2026-08-14/TAREFAS-PROGRAMADAS.md`;
- `auditorias/auditoria-seo-ia-atribuicao-2026-08-15/16-REGISTRO-DE-EXECUCAO.md`;
- `auditorias/auditoria-seo-ia-atribuicao-2026-08-15/17-STATUS-RECOMENDACOES.csv`, somente como baseline anterior ao deploy;
- `docs/auditoria-seo-ia-atribuicao-publicacao.md`;
- `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`;
- `campanhas/HISTORICO-ESTRATEGICO-AQUISICAO.md`.
- `campanhas/ROTINA-AUTOMATIZADA-REVISAO-GOOGLE-ADS.md`.
- `campanhas/ROTINA-AUTOMATIZADA-REVISAO-META-ADS.md`.

Se uma fonte técnica divergir deste painel sobre o que já foi publicado ou sobre a próxima data, interromper a execução, confirmar o estado ao vivo e atualizar ambos. Não escolher silenciosamente uma das versões.

## 12. Atualização operacional — mensuração das cinco campanhas em 22/08/2026

**Estado:** `PUBLICADO; EM MONITORAMENTO`. Cinco sobrescritas legadas foram removidas dos anúncios de BLEF, CERV, FACE e MARCA. O pós-voo atualizado contra o servidor confirmou herança dos códigos canônicos e orçamento total idêntico de R$ 87/dia. OTO e LIFTING FACIAL não receberam edição; site, WhatsApp, lances, metas e ações de conversão permaneceram intactos.

**Saúde do caminho:** a fila de classificação estava sem itens pendentes, em execução ou falhos; o trigger `sincronizarConsultasAoEditar` estava ativo com 0% de erro; o agregado Google do dia foi gerado sem PII; testes focais 143/143 e `site:check` 44/44. A ausência de lead novo qualificável e de agendamento não deve ser convertida em evento artificial nem tratada como falha técnica.

**Próximos gates:**

1. no primeiro contato Google posterior à correção, verificar campanha, grupo, click ID, Opportunity ID e ausência de fallback, sem copiar PII;
2. em `27/08`, conferir o ciclo de importação e a materialização do Histórico de alterações;
3. em `30/08`, ler os sete dias completos `23–29/08` e calcular cobertura canônica, contato válido, qualificado e consulta;
4. em `06/09`, repetir para 14 dias completos; não iniciar outro experimento material se o tracking ainda não estiver estável.
5. em `24/08`, publicar como proprietária a calibração do script `12117745` do commit `ee5df71`; não remover nem recriar a programação existente como atalho.

**Rollback:** restaurar os cinco pares de parâmetros legados registrados em `auditorias/auditoria-google-ads-2026-08-22/EXECUCAO-2026-08-22.md` apenas se houver perda de atribuição ou efeito colateral comprovado. Não reinterpretar `G26F00/F01/F02/F03` ou `G26B01` históricos como campanhas canônicas sem evidência determinística.

## 13. Atualização operacional — revisão das recomendações por e-mail em 22/08/2026

**Estado:** `DIAGNÓSTICO CONCLUÍDO; CÓDIGO LOCAL VALIDADO; PUBLICAÇÃO PENDENTE DA PROPRIETÁRIA`.

O e-mail de 17/08 trazia 100 sugestões, mas exibia somente 50 por causa do limite de 40 linhas por seção sem aviso; 39 das 40 linhas visíveis em `Aguardar dados` eram variações da mesma intenção de preço em BLEF. Seis negativas P0 foram confirmadas ao vivo como roteamento intencional entre campanhas/grupos. Em 23/08, a releitura proprietária das 79 negativas de `S_BR_SP_LIFTING_CERVICAL` confirmou que a frase `lipoaspiração de papada` já não estava presente; por isso nenhuma exclusão, recriação ou reversão foi executada. A campanha cervical permaneceu ativa com R$ 12/dia e `S_BR_SP_LIFTING_FACIAL` permaneceu ativa com R$ 24/dia.

O alerta de seis campanhas com `biddable=false` era falso positivo: a rotina lia apenas categoria/origem e ignorava a meta personalizada. O commit `ee5df71` passou a consultar `conversion_goal_campaign_config` e `custom_conversion_goal`, removeu duas consultas inválidas observadas, consolidou preço por campanha/grupo, preservou os roteamentos verificados e declara truncamento. Testes locais: `18/18`.

**Limite de publicação:** a sessão `daniel.added@gmail.com` não pode modificar o script porque ele foi criado e agendado por `aschroeder.br@gmail.com`. A interface determinou remover a programação para salvar; esse atalho foi recusado para preservar o job atual. O Calendar recebeu um gate em `24/08 08:30`, e a primeira prévia como proprietária deve manter zero mutação na conta.
