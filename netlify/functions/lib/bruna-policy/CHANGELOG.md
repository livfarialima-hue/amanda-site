# Histórico do pacote Bruna

## 2026-08-19.6

- Mensagens de texto recebidas sem corpo legível deixam de terminar silenciosamente em `route_pending`: a Bruna envia uma única pergunta neutra para recuperar o procedimento ou a dúvida, sem presumir contexto clínico, qualificação ou intenção de agenda.
- A extração aceita variações seguras conhecidas do envelope textual antes de declarar o conteúdo ausente; se o provedor tiver omitido o corpo de fato, a resposta degradada permanece protegida por mensagem mais recente, deduplicação, preferência de contato e corrida com atendimento humano.
- O texto vazio não é fabricado nem gravado como fala da paciente. Somente a resposta efetivamente entregue pela Bruna entra no histórico, e falha ou intervenção humana continuam bloqueando o envio.
- Estado desta versão: candidata local validada com **899/899 testes**; nenhuma mensagem real foi enviada. A produção permanece em `2026-08-19.5` até a publicação autorizada.

## 2026-08-19.5

- A faixa de otoplastia de R$ 8 mil a R$ 14 mil passa a ser permitida uma única vez, somente após a primeira resposta sem números e depois de aceite claro da oferta ou novo pedido explícito por valor, média ou faixa.
- O envio exige todas as ressalvas aprovadas, não admite CTA, não repete o guia já compartilhado e é bloqueado se a faixa mudar, faltar contexto ou já tiver sido enviada no mesmo episódio.
- A retomada diferida preserva o procedimento já conhecido e aplica o mesmo fluxo de otoplastia, sem perder o contexto quando a mensagem atual for apenas uma aceitação curta.
- Perguntas compostas sobre otoplastia são respondidas antes do preço. `Otomodelação` é tratada como termo ambíguo: o sistema não presume injetáveis, ausência de cirurgia, duração temporária ou indicação a partir do nome.
- A resposta genérica de convênio foi corrigida para `ao seu plano de saúde`, eliminando a construção artificial observada no atendimento.
- Estado desta versão: publicada e verificada no commit funcional `9a4a4082e5e4ad3e0bcf1e32dbbfe01af58eab22` e deploy Netlify `6a8641c07b71ac00088337f8`; Apps Script v104 preservado, **896/896 testes**, build de 178 arquivos e 44 URLs sem erro. O Netlify confirmou o deploy publicado e as 12 funções; o domínio público respondeu normalmente. A sonda HTTP direta do webhook não foi repetida porque o cliente bloqueou o acesso técnico direto. Nenhuma mensagem real foi enviada e nenhuma configuração do Google Ads foi alterada. Rollback: deploy `6a861fab62e3fc00085b847f`, commit `5f9e247b7a38698d5a9d79836f14e7b4a25ec3c0`.

## 2026-08-19.4

- Perguntas compostas sobre lifting facial passam a ser decompostas semanticamente: duração geral, recuperação e critérios usuais recebem os fatos aprovados no mesmo turno, sem apagar a parte que depende da avaliação individual.
- A IA recebe os fatos revisados e continua sendo a primeira instância de decisão; a resposta delimitada só é usada quando o modelo confirma semanticamente o código, o procedimento e a cobertura do pedido.
- A resposta não inventa duração numérica da cirurgia nem conclui indicação pessoal. Ela informa que o tempo depende do planejamento, apresenta referências gerais de recuperação e explica que a avaliação pode inclusive concluir que ainda não é o momento de operar.
- O histórico durável recuperado passa a ser usado diretamente no turno quando a hidratação da memória auxiliar falhar, em vez de ser descartado. Saudações como `boa tarde` deixam de simular preferência de período, e `cirurgia` não é mais confundida com pergunta sobre credenciais da cirurgiã.
- Estado desta versão: publicada e verificada no commit funcional `5f9e247b7a38698d5a9d79836f14e7b4a25ec3c0` e deploy Netlify `6a861fab62e3fc00085b847f`; Apps Script v104 preservado, **876/876 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável e webhook responderam HTTP 200 com automação ativa. Nenhuma mensagem real foi enviada.

## 2026-08-19.3

- Respostas com contrato `maxLinks: 0` agora retiram a frase que contém um link espontâneo antes da validação final, preservando a explicação útil sem transformar uma continuação simples em silêncio.
- O texto efetivamente conformado é o mesmo enviado à paciente e gravado no ledger durável e na memória recente; a versão original com link não é persistida como se tivesse sido entregue.
- Se a resposta contiver somente o link, ficar vazia depois da conformação ou violar qualquer outra trava, o envio continua bloqueado e segue para revisão humana.
- Estado desta versão: publicada e verificada no commit funcional `5bb65664798b1d5ca5885fc75b07ec45dbf18833` e deploy Netlify `6a85e288a72ee70008cc87b2`; Apps Script v104 preservado, **867/867 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável e webhook responderam HTTP 200 com automação ativa. Nenhuma mensagem real foi enviada.

## 2026-08-19.2

- A primeira pergunta sobre preço cirúrgico passou a enviar, sem números, um único guia sobre a composição do orçamento conforme a região confirmada: facial para face e pescoço, mama para cirurgias mamárias e corporal para corpo e cirurgia íntima. Sem procedimento confiável, nenhum material é escolhido por suposição.
- A pergunta sobre valores de cervicoplastia usa a abertura aprovada, mais leve e contextual, oferece a faixa geral apenas como próximo passo e coloca o guia facial antes dessa oferta.
- `valor` e `valores` passam a ser reconhecidos igualmente; o caso real `Sim, gostaria` seguido de `E gostaria de saber os valores` permanece acionável e recebe a primeira resposta, em vez de depender da forma singular da palavra.
- O aceite claro da oferta cervical, inclusive `Sim` ou `Pode me passar`, autoriza uma única resposta com as faixas aprovadas e suas ressalvas. O link já enviado na primeira resposta não se repete; o guia específico de lifting permanece como fallback quando o histórico não contém um guia facial. A faixa não é repetida no mesmo contexto e outras cirurgias continuam sob revisão humana.
- Estado desta versão: publicada e verificada no commit funcional `97da5c3a289062c9face0313418fe1beb7e3accf` e deploy Netlify `6a8599b25b653800085f9f95`; Apps Script v101 preservado, **865/865 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável, webhook e os três guias regionais responderam HTTP 200. A projeção ativa do Drive usa o mesmo manual local no SHA-256 `05d933251d9b7b67ff5240fb9ef174fdcb4aa42c526ca359708e2f02d1c9d71c`. Nenhuma mensagem real foi enviada e nenhuma configuração do Google Ads foi alterada.

## 2026-08-19.1

- Prefills de site e anúncio passaram a usar uma abertura neutra identificada por `template_id=procedure_evaluation_v1`; isoladamente, o template não qualifica, não gera conversão offline e não encaminha agenda. A primeira resposta pergunta o que a pessoa deseja entender, sem presumir prontidão nem usar nome de empresa como nome pessoal.
- Fotos recebem uma resposta mais humana: agradecimento simples, confiança de que existem boas abordagens, informação clara de que a imagem será mostrada à Dra. Amanda e convite a uma avaliação cuidadosa, sem expor travas técnicas na mensagem à paciente.
- A confirmação manual de retomada aberta pelo e-mail diário passa a navegar no contexto superior, evitando a tela quebrada dentro do frame do Apps Script. A opção `não retomar` continua bloqueando somente aquela tentativa, sem impedir um novo contexto futuro.
- A jornada cervical usa `cervicoplastia (lifting cervical)` no site, no prefill e na primeira resposta, reconhecendo os dois nomes como o mesmo contexto sem concluir técnica ou indicação. A URL canônica e a estrutura do Google Ads foram preservadas; a conta já contém os termos de cervicoplastia no grupo correspondente.
- Estado desta versão: publicada e verificada no commit funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`, deploy Netlify `6a858294fc30270008e0964a` e Apps Script v101 no deployment canônico preservado, com **851/851 testes**, build de 178 arquivos e 44 URLs sem erro. O site, o webhook e o web app responderam HTTP 200; a projeção ativa do Drive usa o mesmo manual local no SHA-256 `363e3b887b9b50c8074e4a3e6ae8d30c4d240e2a41c65c19d88696295456b753`. Nenhuma mensagem real foi enviada e nenhuma configuração do Google Ads foi alterada.

## 2026-08-18.5

- A conversa recente passou de 16 para 32 turnos e deixou de depender somente do cache temporário da Netlify: quando a memória estiver vazia ou expirada, o bot reidrata o contexto a partir do ledger canônico `_WHATSAPP_MENSAGENS` da oportunidade.
- O ledger ganhou autoria explícita `paciente`, `bruna` ou `equipe_humana`; toda resposta efetivamente entregue pela Bruna é registrada de forma idempotente, sem criar uma segunda execução de classificação.
- A IA agora recebe e devolve estado semântico estruturado: assunto ativo, ato da paciente, referência por Event ID, última pergunta e oferta da clínica, questões abertas, fatos já informados, responsável, próxima ação, ambiguidade e confiança contextual.
- Mensagens longas preservam o início e o final, evitando que uma pergunta colocada no fim desapareça por truncamento. O histórico usado por regras mecânicas passou a respeitar o papel do autor, sem transformar palavras da clínica em intenção da paciente.
- Respostas curtas como `Sim`, `Certo`, `Ok` e `Entendi` só atravessam o fechamento mecânico quando a última fala da clínica contém pergunta ou oferta concreta. `CONTEXT-CONTINUE-01` e `CONTEXT-CLARIFY-01` continuam sendo as únicas exceções semânticas compatíveis; agradecimento ou encerramento real permanece silencioso.
- Não foi criada uma pasta paralela de conversas no Drive. A planilha operacional continua sendo a fonte ao vivo; o Drive preserva a mesma projeção de leitura do manual, conferida byte a byte.
- Estado desta versão: publicada e verificada no commit funcional `6fd37c3227e6fee1ca4ea1686248cb22733040f1`, deploy Netlify `6a84facdbed81175d2df0107` e Apps Script v100 no deployment canônico, com **843/843 testes**, build de 178 arquivos, 44 URLs sem erro e projeção ativa do Drive no SHA-256 `ded041b5f703b2a99167ccb402c2b6915f6ac1d8679cc3bae229a4882ef58258`.

## 2026-08-18.4

- Respostas curtas passaram a ser interpretadas contra a última pergunta da clínica mesmo durante a tomada humana. Quando a pessoa aceita uma oferta informativa concreta, a IA entrega imediatamente a explicação prometida em vez de tratar a mensagem como confirmação silenciosa.
- Criado `CONTEXT-CONTINUE-01`, autorizado somente para a candidata delimitada pelo webhook e validado novamente antes do envio. A resposta não pode acrescentar pergunta, CTA, link ou confirmação de consulta.
- Quando o referente seguro continuar ambíguo, a IA pode fazer uma única pergunta específica com `CONTEXT-CLARIFY-01`; baixa confiança, código genérico ou resposta incompatível mantêm a conversa com a equipe.
- Agenda, aceitação de horário, confirmação de consulta, cuidado clínico, preço não aprovado, tarefa administrativa, opt-out, duplicidade e corrida com atendente continuam fail-closed.
- A retomada imediata preserva um fallback atrasado e só libera a Bruna se a geração da tomada humana ainda for a mesma, impedindo que uma nova mensagem da equipe seja sobrescrita.
- Adicionado cenário sintético para `"Quer que eu te explique como funciona a consulta?" → "Sim"`, além de regressões de autorização, contrato, fila, corrida humana e fallback.
- Estado desta versão: publicada e verificada no commit funcional `1b54e7e8937ee03a5679c894efd8d8dd53f0a2e5`, deploy `6a84eb15525edc0e071a0486`, com **826/826 testes**, build de 178 arquivos e projeção ativa do Drive reconciliada com o manual do release.

## 2026-08-18.3

- A IA passou a ser a primeira instância de interpretação de toda mensagem textual elegível; padrões de pontuação, palavras-chave, códigos e templates ficaram restritos a pistas e guardrails.
- Perguntas coloquiais sem interrogação, como `Aí fazem cervicoplastia`, deixam de ser silenciadas por uma decisão mecânica e seguem para compreensão contextual.
- Respostas determinísticas de agenda, preço e fatos institucionais só substituem o texto gerado quando a IA confirma semanticamente o código, o procedimento, o profissional e que a prévia cobre todos os pedidos seguros do turno.
- Ambiguidade linguística segura passa a receber uma única pergunta curta e específica de esclarecimento, com contrato de uma pergunta, nenhum link e nenhum CTA; urgência, risco clínico, cuidado ativo, opt-out, duplicidade e tomada humana continuam fail-closed.
- O mesmo princípio foi aplicado à retomada após atendimento humano. Uma autorização genérica da IA não atravessa o bloqueio final: somente reabertura, esclarecimento, coordenação ou cópia institucional explicitamente confirmados permitem resposta.
- `CONTEXT-CLARIFY-01` identifica ambiguidade de linguagem ou referência conversacional; `UNKNOWN-CLARIFY-01` fica reservado à pergunta já compreendida cuja resposta aprovada depende de uma informação simples adicional.
- Estado desta versão: publicada e verificada no commit funcional `c392a743b2f00d751bf6dca8da54b991db0439ff`, deploy `6a84dea1cf780e00086eed7e`, com **814/814 testes**; projeção ativa do Drive reconciliada com o manual do release.

## 2026-08-18.2

- Criado contrato único por turno com estado, responsável, intenções pendentes, motivo de silêncio e limites de perguntas, links, CTA e confirmação de agenda.
- Removidas perguntas, menus e convites obrigatórios das respostas de preço, consulta, canal oficial e handoffs; respostas passaram a encerrar depois de resolver o pedido quando não há próximo passo útil.
- Mensagens genéricas de espera foram eliminadas do envio ao paciente e das sugestões internas; contexto insuficiente agora gera silêncio e aviso `SEM SUGESTÃO PRONTA` à equipe.
- Adicionado validador semântico final para bloquear diagnóstico remoto, promessa, valor ou condição não aprovada, confirmação de agenda não verificada, abatimento da consulta, alegação tributária ou de reembolso, menu, excesso de links/perguntas e CTA fora do estágio.
- Pausas, recusas por orçamento, respostas à equipe humana e sinais de que a paciente retornará transferem a iniciativa sem nova mensagem ou retomada automática.
- A janela de consolidação passou a três segundos para respostas determinísticas e cinco para IA, limitada entre dois e oito segundos, mantendo cancelamento por mensagem mais nova ou intervenção humana.
- Criado conjunto versionado de cenários sintéticos a partir de padrões desidentificados da pasta restrita de conversas do Drive; respostas reais continuam sendo evidência crítica, nunca padrão a copiar.
- Mantido `gpt-5.6-terra` com raciocínio `medium`; comparação de modelo e ampliação das etapas tardias da jornada ficaram fora desta versão.

## 2026-08-18.1

- Criada a contenção específica entre 00:00 e 05:59: uma única confirmação curta por episódio e retomada contextual às 8h.
- Pedido para continuar amanhã passou a ser sinal de pausa mesmo quando termina com uma pergunta de confirmação, como `melhor né?`.
- Bloqueados durante a madrugada preços, faixas, links, CTAs, respostas longas, novas qualificações e confirmações de agenda; possível urgência mantém a rota imediata de segurança.
- O e-mail interno da madrugada passou a trazer contexto, estado do aviso já enviado e uma sugestão pronta para a manhã; removido o placeholder genérico usado como falsa sugestão humana.

## 2026-08-17.1

- Tornado explícito que a Bruna se apresenta somente como concierge, com bloqueio fail-closed para qualquer resposta que a rotule como automação, bot, robô, IA, assistente ou secretária virtual.
- Incorporado o ARC adaptativo: contexto, estágio, barreira e segurança prevalecem sobre roteiros e origem do anúncio.
- Acolhimento de fotos passou a reconhecer a vulnerabilidade, apontar boas opções sem promessa e explicar o limite da avaliação à distância antes do handoff humano.
- Endereço padronizado com conjunto, CEP e link aprovado do Google Maps.
- Parcelamento antecipado e desconto à vista passaram a ser fatos institucionais; quantidade de parcelas, percentual e demais condições continuam humanas.
- Mantidas as faixas aprovadas somente após insistência explícita em lifting/minilifting, com ressalvas, guia e bloqueio de repetição.
- Consolidado o uso contextual do site e o aprendizado supervisionado, sem promoção automática de respostas humanas.

## 2026-08-11.1

- Consolidada a identidade da Bruna e a estratégia de conversão ética para consulta.
- Separadas oportunidades da Dra. Amanda e do Dr. Daniel dentro da única planilha `LEADS`.
- Bloqueada a inclusão de Henrique, Marina e outros profissionais nas abas de leads.
- Exigida confirmação humana para toda escolha final de horário.
- Tornado o envio de resposta idempotente e fechado em caso de falha de armazenamento em produção.
- Limitado o aprendizado automático a regras de baixo risco, aprovadas e promovidas em snapshot.
- Versionados prompt, esquema de dados, política e snapshot de conhecimento para rollback.
