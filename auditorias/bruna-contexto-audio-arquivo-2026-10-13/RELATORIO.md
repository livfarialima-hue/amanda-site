# Contexto, áudio e arquivo de conversas

Estado: implementação local, ainda não publicada. Baseline remoto `872665ea0f0b04a6639034a8a67af1957861c3a7`; produção Netlify `6acebbd4a25f1e95fc6d90d3`, Apps Script v162. A publicação anterior de autonomia está concluída e permanece preservada.

## Evidência e limite da análise

Após o usuário autenticar a YCloud, a conversa correta foi conferida no provedor e reconciliada com o contato na LEADS. A busca inicial havia encontrado um homônimo; as quatro mensagens de 05–07/10 não pertencem ao caso indicado e foram descartadas desta análise. O contato correto tem 45 mensagens no ledger (36 em 10/09 e nove em 12–13/10), além de 22 registros de atendimento humano. Nome, telefone, IDs do contato e conteúdo integral permanecem fora do repositório público.

A conversa inicial de 10/09 foi atendida principalmente pela equipe no WhatsApp Business App: uma assinatura “Bruna” no texto não prova autoria automática. A escolha inicial de profissional era pertinente ao pedido genérico. Em 12/10, um pedido de endereço com erros de digitação recebeu resposta humana; o matcher local não reconhecia essa variante. Em 13/10, a equipe concordou com um novo horário às 05:59, houve aceite às 06:04 e uma resposta da API às 08:16 ainda informou que a equipe verificaria o pedido. Há mensagens dessas etapas visíveis na YCloud e ausentes no ledger, inclusive a confirmação humana. Não há áudio no trecho conferido.

Logs do endpoint canônico, consultados em 13/10 às 21:36 BRT, mostram tentativas repetidas de entrega de echoes humanos com REQUEST_EXCEPTION / Client.Timeout exceeded while awaiting headers, inclusive de um turno deste contato que já aparece no ledger. Isso comprova timeout de resposta ao provedor, mas não prova que todas as gravações falharam ou explica, sozinho, cada lacuna anterior. Nenhum evento foi reenviado manualmente.

Correções de preço/fotos já preparadas na worktree preservada `df072a3` foram incorporadas seletivamente ao baseline atual, mantendo as melhorias de autonomia publicadas. Os cenários sintéticos não são apresentados como transcrição do caso real.

## Comportamento implementado

- Pedido de preço com preocupações pessoais e fotos é tratado em conjunto. Planejamento financeiro não significa recusa. O modelo pode contextualizar a faixa já aprovada, preservando números e limites; não confirma indicação ou orçamento individual por foto.
- Fragmentos recebidos são colocados na memória antes do processamento lento. A fala humana autenticada também entra na memória antes da gravação secundária em Sheets, após a pausa humana; um timeout posterior não deve esconder uma resposta já recebida. Pedidos administrativos isolados reconhecem as variantes de digitação reproduzidas, sem liberar respostas a perguntas clínicas ou reagendamento misturados.
- Áudio autenticado é recebido pela fila durável. O arquivo fica somente em memória, é conferido por origem HTTPS, tipo, limite de tamanho e SHA-256 antes da transcrição. A API gpt-4o-transcribe produz texto e indicadores de qualidade. Conteúdo incerto é rotulado no histórico e excluído do contexto que pode autorizar resposta automática.
- Texto e áudio consecutivos aguardam a transcrição pendente. O texto confirmado atravessa as mesmas regras de contexto, autoria, urgência, recusa e prioridade humana. Áudio não confirma agendamentos nem transforma voz da equipe em conhecimento aprovado; sua proveniência permanece após hidratação e nos turnos ignorados, impedindo confirmação indireta em mensagens futuras.
- Backup de texto em pasta restrita do Drive, capturado antes da classificação do contato. Uma fila durável independente do ledger conserva entrada, echo humano, texto efetivo dos transportes automáticos, status e revisões de transcrição. Inclui direção, autoria disponível, horários, IDs, tipo e mensagem citada. Não baixa fotos nem copia áudio ao Drive. Cada revisão tem um arquivo JSONL imutável, hash e releitura privada antes de receber recibo; falha ou timeout mantêm a evidência pendente. Os estados preparado, aceito e entregue permanecem distintos. Falha de arquivo após aceitação pelo provedor nunca autoriza repetir um envio.
- Um agendamento Netlify de cinco em cinco minutos, inicialmente desligado; nenhum acionador Apps Script novo e nenhuma migração de planilha. A escrita no Drive usa lease próprio e libera o lock do atendimento durante I/O.

## Limites explícitos

O arquivo cobre eventos autenticados que chegam à integração e os transportes automáticos cobertos, independentemente de classificação ou gravação na LEADS. Não recupera mensagens que a YCloud deixou de fornecer, períodos anteriores ao início configurado ou mídias omitidas. Não se afirma cobertura de todo o aplicativo WhatsApp. Revisões/status não devem ser contados como novas mensagens: reconciliar por identidade, direção e origem. O exportador limita-se a três revisões a cada cinco minutos; acompanhar a idade da fila. Heurísticas de transcrição não são probabilidade calibrada de acerto, e um teste sintético não comprova desempenho com vozes reais.

## Validação e publicação

Testes focados de segurança de áudio, deduplicação, respostas, memória e arquivo; suíte integral; gates de arquitetura e candidato; build estático. O build de produção mantém os 12 cenários reais existentes e acrescenta preço/fotos e um áudio sintético em português. Sem chave válida ou falha do teste real, publicação bloqueada. Preview não pode ser promovido.

Antes da publicação: concluir revisão independente dos ajustes, commit exato e release:preflight. Publicar Code.gs, KnowledgeBase.gs e ConversationArchive.gs primeiro no deployment Apps Script existente, conferir hash, autorização de Drive e versão. Depois integrar Git na branch de produção e observar novo build. Ativar áudio/arquivo somente após equivalência e verificação. Registrar início exato do arquivo e primeiro recibo real; ausência de mensagens novas é ausência de lote, não backup comprovado.

Rollback: desligar as duas flags; restaurar Netlify `6acebbd4a25f1e95fc6d90d3` e Apps Script v162 no mesmo deployment. Preservar filas, dados, transcrições, arquivos e recibos; sem replay. Revisar primeiras conversas naturais, 48 horas e sete dias após ativação, sem enviar mensagens de teste nem disparar rotinas operacionais.
