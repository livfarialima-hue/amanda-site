# Bruna: experiência e processo — 14/09/2026

Estado: **publicado e ativo**, após autorização de Daniel “Pode publicar sim” para o commit `bef9c1e1e4ef49e6bd604688adddebc1be69eb02`. Apps Script v153 e Netlify `6aa7e218d56b0f48420dcd98`. Conferências históricas individuais permanecem explicitadas abaixo.

Baseline: `28f07a8c5e436fd38ca30372dc0fb66ac2397b31`. Desenvolvimento isolado na branch `codex/bruna-experiencia-processo-20260914`.

## Evidência e escopo

As 24 exportações anexadas em 14/09 incluem 23 conversas comerciais e um atendimento de paciente conhecido, separado da aquisição. As falas históricas não são scripts aprovados e não foram copiadas para o repositório. Leitura canônica da LEADS nesta tarefa confirmou pergunta de consulta pendente no CRM e espera pela paciente na Central; recusa financeira encerrada no CRM e sugestão de preço na Central; nome informado não propagado; resposta visível em exportação ausente do ledger; conteúdo indisponível sem tipo; compromisso datado presente somente no resumo.

Fontes: pasta restrita de exportações registrada no manifesto; LEADS canônica, `_CRM_OPORTUNIDADES` (cabeçalhos A1:Z1 e G297:N307), `Central de Atendimento` (A1:Z12, A39:Z41), fila `_WHATSAPP_CLASSIFICACAO` (cabeçalhos A1:Z1). Nenhum dado pessoal ou transcrição é incluído neste registro.

GET público do webhook em 14/09 confirmou serviço saudável, `active`, `bruna-conversion-v1` e assinatura ativa. Isso não comprova integridade do histórico nem equivalência do código Apps Script vivo. Antes de publicação: conferir versão, arquivos e três IDs do alvo canônico.

## Contratos a corrigir

1. Projetar pendência, responsável e encerramento canônicos na Central e seus consumidores; não inferir quitação pela última direção/emoji.
2. Separar pergunta de preço de objeção, interesse de prontidão para agenda e pagamento de consulta de fechamento cirúrgico.
3. Usar identificação explícita para o nome de tratamento, preservando cadastro clínico e distinguindo interlocutor de beneficiário.
4. Persistir saídas de modo idempotente, invalidar classificação anterior quando o histórico muda e expor lacunas como pendência.
5. Preservar tipo de evento e submeter anexos à conferência apropriada sem inventar conteúdo.
6. Projetar compromissos datados para ação humana verificável; preservar pausas e tarefas de cuidado.
7. Responder à dúvida concreta com acolhimento específico, brevidade e um próximo passo proporcional à intenção.

## Limites e validação

Testes sintéticos, sem mensagens, pacientes, conversões ou compromissos reais de teste. Nenhuma atualização em lote por telefone, inferência de pagamento ou alteração de dado clínico. Correções históricas exigem releitura por oportunidade e não são comprovadas por testes locais.

Resultados, pré-voo e publicação estão em `PREFLIGHT.json` e `PUBLICACAO.json`. A igualdade das projeções no Drive é registrada no recibo; `ops:check` é o gate final de reconciliação.

## Comportamento implementado

- Nome declarado pela própria pessoa pode corrigir apenas o cadastro de aquisição. Cadastro clínico permanece protegido; menção a familiar distingue contato de paciente, sem abrir ou fundir oportunidades por suposição.
- Pergunta inicial de preço/pesquisa genérica não qualifica automaticamente e não autoriza horários. Valor perguntado só vira motivo Preço quando houver barreira explícita. Agradecimento com pergunta ainda pendente não transfere a responsabilidade à paciente.
- Anexo, inclusive com legenda de comprovante, não confirma pagamento, consulta ou cirurgia. Reação fica identificada como reação; conteúdo ausente permanece desconhecido.
- A Central usa estado, responsável e próxima ação da oportunidade. Mensagem mais recente que a decisão ou identidade ambígua gera revisão manual. Recusa remove rascunho comercial antigo; tarefa de cuidado/compromisso continua protegida. Os consumidores de painel e e-mail mantêm a mesma projeção.
- Retorno humano explícito ou aceite de pedido datado vira compromisso manual. Datas vagas ou ambíguas não viram promessa automática. Prazo sem hora termina às 18h como referência interna; nunca é horário prometido ou autorização de envio. Cada conclusão exige identificar a tarefa e registrar motivo.
- Toda nova saída persistida invalida a visão anterior de classificação. Replay não incrementa a contagem; chegada atrasada não move a última atividade para trás. A revisão do histórico inclui texto, direção, autoria, tipo e referência. O evento original preserva a oportunidade da resposta recuperada.
- Antes do envio controlado, um recibo privado registra a intenção. Depois do aceite pelo provedor, tenta-se persistir o turno. Falha de planilha permite recuperar apenas o registro, pelo job existente de classificação. Entrega incerta exige conferência humana e não admite nova tentativa automática do mesmo evento. Persistência concluída elimina a cópia do texto, deixando somente chave opaca de deduplicação. Recibos não resolvidos ficam disponíveis para conferência; contagens de falha/incerteza precisam ser acompanhadas na operação. O caminho de desenvolvimento local já existente continua sem garantia de durabilidade; testes específicos com armazenamento injetado exercitam a proteção de produção.
- Resposta a procedimento repetido após pergunta de descoberta passa a explicar o tema, sem reiniciar a apresentação. Agradecimento de foto e abertura de preço ficam mais curtos. O prompt exige acolhimento específico, resposta a todas as dúvidas e no máximo um próximo passo compatível.

## Orientação para o atendimento humano

Antes de encerrar, conferir se há pergunta ainda sem resposta e quem ficou de agir. Responder primeiro à dúvida; depois propor agenda somente quando houver intenção compatível. Na pergunta simples sobre consulta, a base vigente permite informar R$ 500, meios aprovados de pagamento e nota fiscal. Não acrescentar crédito cirúrgico, benefício cardiológico, garantia de resultado ou disponibilidade não conferida.

Uma recusa explícita por orçamento deve encerrar a ação comercial. “Vou pensar” pede espaço; “me chame na segunda” aceito pela equipe pede tarefa com data. “Obrigada” sozinha pode encerrar a conversa, mas não comprova que a clínica entregou um retorno prometido. Ao receber comprovante, conferir o destinatário, a pessoa atendida e o marco correto antes de registrar pagamento.

## Base de comunicação e limite da evidência

A adaptação usa a identificação de necessidades explícitas do [SPIN Selling, na fonte da Huthwaite](https://www.huthwaiteinternational.com/blog/spin-selling-questions): informação e benefício devem responder ao que a pessoa expressou. Não transportar perguntas de implicação para aprofundar insegurança corporal.

Escuta e comunicação adaptativa têm apoio na [meta-análise de Itani, Goad e Jaramillo (2019)](https://scholarworks.utrgv.edu/marketing_fac/98/). Isso fundamenta ouvir e responder ao conteúdo concreto; não permite estimar um ganho de conversão para esta clínica.

O respeito à autonomia e à ambivalência é inspirado em [Miller e Rollnick, Motivational Interviewing, 4ª edição](https://cms.guilford.com/books/Motivational-Interviewing/Miller-Rollnick/9781462552795). A aplicação aqui é comunicacional, sem apresentar o bot como terapia ou usar escuta para pressionar uma cirurgia.

Instruções, limites e exemplos sintéticos ficam versionados e avaliados separadamente, seguindo a [documentação oficial de engenharia de prompts](https://developers.openai.com/api/docs/guides/prompt-engineering). Testes determinísticos comprovam contratos locais; resposta semântica e impacto comercial exigem avaliação após publicação. A amostra não suporta conclusão causal ou percentual esperado de aumento de vendas.

## Conferência histórica individual

Os números de linha são localizadores da leitura, não identidade permanente. Reler Opportunity ID, profissional, versão, mensagens e autoria antes de qualquer correção. Se a conversa mudou, descartar a proposta antiga.

| Evidência da leitura | Correção permitida após conferência | Proteção |
| --- | --- | --- |
| CRM 303 / Central 39: preço da consulta pendente | Projetar pendência da clínica e preparar resposta atual | Despedida não comprova resposta; não enviar automaticamente |
| CRM 297 / Central 12: recusa financeira | Remover ação comercial e sugestão de preço da Central | Preservar eventual cuidado e não reativar prospecção |
| CRM 307 / cadastro visível 286: nome próprio corrigido | Ajustar nome de tratamento se declaração própria e vínculo forem inequívocos | Não sobrescrever nome clínico ou confundir familiar |
| CRM 306 / mensagens: saída ausente no ledger | Conferir ID do provedor, autoria, horário e oportunidade antes de inserir registro idempotente | Exportação sozinha não comprova ID nem causa da lacuna; jamais reenviar |
| CRM 305 / Central 41: saída sem texto | Conferir tipo real e referência no evento original | Não inventar reação, imagem ou resposta |
| CRM 285: imagem depois do Pix | Deixar conferência financeira com a equipe | Não presumir pagamento nem cirurgia contratada |
| CRM 95: retorno combinado para segunda | Conferir se já foi cumprido; se pendente, criar tarefa humana identificada | Não enviar retomada histórica retroativa |
| Conversa de duas pessoas no mesmo contato | Confirmar beneficiário de cada atendimento e criar vínculos próprios pela equipe | Preservar a pausa até o fim do mês; não duplicar conversão por telefone |

## Sequência de publicação adotada

1. Concluir gates locais e obter autorização para o SHA completo do candidato.
2. Revalidar controle autenticado, três IDs Apps Script, deployment vigente, arquivos e cabeçalhos. A leitura de M1:N2407 em 14/09 foi vazia; a expansão é aditiva. Não escolher alvo por título.
3. Aplicar contenção temporária dos envios e classificações pelos controles vigentes, registrar estado anterior e publicar Apps Script/funções do mesmo commit. Não criar novo deployment Apps Script. Comparar arquivos/versões antes da ativação e preservar as filas.
4. Verificar sem mensagens reais de teste: saúde, assinatura, configuração, colunas, leitura da Central, revisão do histórico e disponibilidade do armazenamento privado. Só reativar o escopo autorizado após equivalência.
5. Atualizar recibos, versão real do Apps Script, manual, manifesto e a mesma projeção do plano no Drive. Correções históricas seguem a conferência individual acima e terão recibo próprio; este código não as executa em lote.
6. No primeiro ciclo, em 48 horas e sete dias, verificar pendências sem responsável, divergências CRM–Central, recibos aceitos não persistidos, entregas incertas, correções de nome/fase, recusas respeitadas, agendamentos e comparecimentos. Denominador comercial: 23 conversas do recorte inicial; cuidado conhecido excluído.

Rollback: conter a função afetada e retornar código/deploy anteriores verificados, sem apagar mensagens, recibos, tarefas ou dados clínicos. Qualquer identidade trocada, contato após recusa ou envio duplicado exige contenção imediata. Publicação concluída; reparo histórico individual depende da evidência específica de cada registro.

## Resultado da validação local

Validação final: **1.512/1.512 testes integrais** e **220/220 cenários no conjunto cruzado de processo**, sem falhas. Os 11 comandos de testes exigidos pelos contratos selecionados foram executados e passaram; o conjunto cruzado foi repetido após os últimos ajustes de data e separação de cardiologia. Três cenários executáveis foram acrescentados à baseline bloqueada, sem retirar os anteriores. Reproduções sintéticas de continuidade, identidade e persistência acusaram falhas durante o desenvolvimento antes das correções; os novos testes de integração verificam chegada fora de ordem, replay, vínculo original, tipo de anexo, prazo futuro e conclusão de tarefa exata.

change:check e architecture:check aprovados; build e site:check aprovados; git diff --check sem erros. O recibo resumido e hashes dos logs locais estão em ops/CHANGE-CANDIDATE.json. Na fase local, ops:check retornou SYNC_PENDING por publicação/projeção Drive pendentes e desenvolvimento isolado. Naquela fase não houve publicação, mensagem real, teste de modelo com paciente ou reparo histórico. Estes testes validam os contratos; percepção do atendimento e impacto em consultas dependem do acompanhamento.

## Recibo da publicação e primeiro ciclo

Commit funcional `bef9c1e1e4ef49e6bd604688adddebc1be69eb02`, Netlify `6aa7e218d56b0f48420dcd98`, Apps Script **v153** no deployment canônico preservado. Ativo desde 14/09/2026 às 09h02 BRT. Aprovação registrada às 08h17 BRT. O pré-voo autenticado comparou os 27 arquivos Apps Script ao baseline; os quatro arquivos alterados foram salvos, publicados no mesmo deployment e recarregados com hashes iguais ao aprovado. Netlify conferido por API: 12 funções, cinco programações e 192 arquivos estáticos preservados. Domínio e URL imutável responderam 200 com modo active; webhook sem assinatura e retomadas sem autorização responderam 401. Apps Script GET 200 e POST com segredo inválido recusado. A sonda inicial recebeu página Google 404; a repetição sem cache retornou JSON válido. O endpoint background devolve 202 no transporte, por isso essa sonda não é prova do resultado de autenticação do handler.

O primeiro ciclo real do job registrou recuperação do ledger concluída e uma classificação concluída sem erro; outro ciclo processou zero trabalho. Não houve disparo manual. A Central foi atualizada automaticamente: a pergunta de consulta fica com a equipe, a recusa financeira aparece Suspenso/Silêncio e sem rascunho, e o anexo desconhecido continua manual. O caso de retorno antigo teve nova classificação no ciclo (versão 16), mas isso não comprova cumprimento do compromisso; precisa da conferência humana indicada na tabela. Ausência do caso financeiro na Central não comprova quitação.

Escritas técnicas na LEADS: apenas os cabeçalhos M/N e a revogação de um lease já expirado após a vida máxima do job, com estado pending e tentativas preservadas. Nenhuma correção histórica de CRM, cadastro clínico, pagamento, consulta, beneficiário ou mensagem foi feita em lote. Nenhuma mensagem ou e-mail real de teste foi enviado.

**Incidente na contenção:** o pacote temporário `6aa7dc0a77fe2f1c53e54d1f` omitiu @netlify/blobs por empacotamento de dependências via junction e respondeu 502 entre 08h38m25s e 08h39m33s BRT (68,722 segundos). O deploy anterior foi restaurado imediatamente. A correção usou dependências físicas, validação de importação dos 12 pacotes e teste de saúde do draft; a contenção corrigida `6aa7deb53b851e330002d2ee` entrou às 08h48m45s, antes da troca Apps Script/Netlify. Impacto sobre pacientes na janela não foi estabelecido; não afirmar ausência de perda ou recontato.

Rollback: commit `6e5d6587c72e558fd9bb8ef921d3c25eefd9f36f`, Netlify `6aa72fd3ff58fc000803e345` e Apps Script v152, preservando dados e recibos. O arquivo PUBLICACAO.json contém os recibos de cada destino e a igualdade dos bytes do plano/manual no Drive. O commit posterior de recibos usa [skip netlify], conforme [documentação oficial de gestão de deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/), para preservar o SHA funcional aprovado. Revisões: 16/09 às 09h02 BRT para integridade e 21/09 às 09h02 BRT para consultas/comparecimento e qualidade. Nenhuma automação nova.
