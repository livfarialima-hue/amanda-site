# Contexto, áudio e arquivo de conversas

Estado: implementação local, ainda não publicada. Baseline remoto `872665ea0f0b04a6639034a8a67af1957861c3a7`; produção Netlify `6acebbd4a25f1e95fc6d90d3`, Apps Script v162. A publicação anterior de autonomia está concluída e permanece preservada.

## Evidência e limite da análise

O usuário forneceu imagem de uma conversa e depois identificou o contato. A imagem recebida tem largura insuficiente para transcrição fiel. A busca autenticada localizou o contato, mas o ledger integrado contém somente quatro mensagens, entre 05 e 07/10. A resposta de abertura registrada pede que a pessoa escolha novamente o assunto após pedido de informações; isso é evidência de resposta pouco útil, mas não permite atribuir todas as intervenções da imagem à Bruna. A sessão YCloud exige login/CAPTCHA. A leitura completa permanece pendente. Nome, telefone e conteúdo integral não entram neste repositório.

Correções de preço/fotos já preparadas na worktree preservada `df072a3` foram incorporadas seletivamente ao baseline atual, mantendo as melhorias de autonomia publicadas. Os cenários sintéticos não são apresentados como transcrição do caso real.

## Comportamento implementado

- Pedido de preço com preocupações pessoais e fotos é tratado em conjunto. Planejamento financeiro não significa recusa. O modelo pode contextualizar a faixa já aprovada, preservando números e limites; não confirma indicação ou orçamento individual por foto.
- Áudio autenticado é recebido pela fila durável. O arquivo fica somente em memória, é conferido por origem HTTPS, tipo, limite de tamanho e SHA-256 antes da transcrição. A API gpt-4o-transcribe produz texto e indicadores de qualidade. Conteúdo incerto é rotulado no histórico e excluído do contexto que pode autorizar resposta automática.
- Texto e áudio consecutivos aguardam a transcrição pendente. O texto confirmado atravessa as mesmas regras de contexto, autoria, urgência, recusa e prioridade humana. Áudio não confirma agendamentos nem transforma voz da equipe em conhecimento aprovado.
- Backup de texto do ledger canônico em pasta restrita do Drive. Inclui direção, autoria disponível, horários, IDs, tipos e transcrições. Não baixa fotos nem copia áudio ao Drive. Arquivos JSONL imutáveis por lote, hash e releitura antes de avançar cursor; falha ou timeout não apagam evidência.
- Um agendamento Netlify de cinco em cinco minutos, inicialmente desligado; nenhum acionador Apps Script novo e nenhuma migração de planilha. A escrita no Drive usa lease próprio e libera o lock do atendimento durante I/O.

## Limites explícitos

O arquivo cobre mensagens capturadas pela integração e persistidas em `_WHATSAPP_MENSAGENS`. Não recupera mensagens que a YCloud deixou de fornecer, períodos anteriores ao início configurado ou mídias omitidas. A diferença entre a imagem e o ledger ainda exige conferência no provedor; não se pode afirmar cobertura de todo o aplicativo WhatsApp. Heurísticas de transcrição não são probabilidade calibrada de acerto, e um teste sintético não comprova desempenho com vozes reais.

## Validação e publicação

Testes focados de segurança de áudio, deduplicação, respostas, memória e arquivo; suíte integral; gates de arquitetura e candidato; build estático. O build de produção mantém os 12 cenários reais existentes e acrescenta preço/fotos e um áudio sintético em português. Sem chave válida ou falha do teste real, publicação bloqueada. Preview não pode ser promovido.

Antes da publicação: finalizar diagnóstico possível, revisão independente exigida para risco crítico, commit exato e release:preflight. Publicar Code.gs e ConversationArchive.gs primeiro no deployment Apps Script existente, conferir hash, autorização de Drive e versão. Depois integrar Git na branch de produção e observar novo build. Ativar áudio/arquivo somente após equivalência e verificação. Registrar início exato do arquivo e primeiro recibo real; ausência de mensagens novas é ausência de lote, não backup comprovado.

Rollback: desligar as duas flags; restaurar Netlify `6acebbd4a25f1e95fc6d90d3` e Apps Script v162 no mesmo deployment. Preservar filas, dados, transcrições, arquivos e recibos; sem replay. Revisar primeiras conversas naturais, 48 horas e sete dias após ativação, sem enviar mensagens de teste nem disparar rotinas operacionais.
