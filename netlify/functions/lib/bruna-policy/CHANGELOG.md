# Histórico do pacote Bruna

## 2026-08-31.3 — publicada e verificada

- Prospecções B2B passam a ser reconhecidas por sinais combinados de alta precisão: apresentação em nome de marca, oferta para aumentar vendas ou captar pacientes, prova de resultado comercial e convite para reunião, demonstração ou analista.
- O webhook encerra esses contatos antes de Sheets, IA, alerta assistencial, lead e YCloud; a retomada protegida após fala humana aplica a mesma trava antes de IA, alerta ou resposta.
- Uma retomada programada é invalidada antes da revisão semântica e do envio quando a entrada mais recente se torna comercial; o contrato terminal já existente cancela o plano sem ampliar o Apps Script.
- Pedido pessoal e assistencial explícito continua no fluxo mesmo com vocabulário comercial, e uma mensagem pessoal posterior reabre normalmente a conversa.
- Estado desta versão: código funcional `1db16a54dcb4f306044aa6c07f447279a5e757f1`, deploy Netlify `6a95d4fa98cabc00088849a9`, 108/108 testes focados, 168/168 da jornada e 1228/1228 integrais. Domínio e URL imutável responderam HTTP 200 em `active`/`bruna-conversion-v1`; POST sem assinatura retornou HTTP 401 e nenhuma mensagem real foi enviada. Apps Script v139 foi preservado. Rollback: `8cca58388dcb46bc6721aa0c06634135a521854f` e `6a95ac8f4cd10f0009d9280e`.

## 2026-08-31.2 — publicada e verificada

- Até oito falas consecutivas da paciente ainda sem resposta são recompostas em um único bloco, limitado a dez minutos totais, antes de replanejar e redigir.
- Cada pedido seguro do bloco precisa ser atendido; uma prévia determinística parcial fornece os fatos aprovados, mas não pode apagar outra dúvida nem uma resposta significativa da paciente.
- `Cobram a consulta` é reconhecido como preço da avaliação, e cada linha continua sendo verificada separadamente para que qualquer pedido real de agenda mantenha a rota protegida.
- Saudações e `?` isolado não inflam a contagem. Fala da clínica, horário ausente, prefill, propaganda, pausa, recusa e retorno adiado encerram a recomposição.
- Abordagens comerciais e mídia promocional associada são ignoradas antes de IA, alerta, lead e retomada; fotos assistenciais continuam na revisão humana existente.
- Estado desta versão: código funcional `269f9042a87a3a68c14b560be21afd9fe672c840`, deploy Netlify `6a95aa3f6a986300080f0e5a`, 228/228 testes focados, 306/306 do contrato de conversão, 166/166 da jornada e 1223/1223 integrais. Domínio e URL imutável responderam HTTP 200 em `active`/`bruna-conversion-v1`; POST sem assinatura retornou HTTP 401 e nenhuma mensagem real foi enviada. Apps Script v139 foi preservado. Rollback: `b26062166cd176fbac910afbf00cc8c2bb6f2b8d` e `6a9552ad8c3abc00083c1237`.

## 2026-08-31.1 — publicada, ativada e verificada

- A experiência `bruna-conversion-v1` torna as aberturas mais contextualizadas, concisas e específicas, inclusive para procedimentos de menor procura, sem mudar fatos clínicos, preços ou propriedade da agenda.
- A resposta ao valor da consulta prioriza a informação solicitada e evita repetir explicação ou localização; a progressão usa somente uma CTA compatível com o estágio e o gate retira apenas a CTA final incompatível quando o restante continua seguro.
- O histórico recente evita reapresentação, repetição de nome, link, endereço e explicação. Linguagem mecânica de política permanece bloqueada sem expor frases operacionais à paciente.
- O código foi publicado primeiro com a chave desligada e somente depois ativado no contexto de produção. Estado desta versão: commit funcional `67f00a2a0c614f57a2fc1a70fdcc3c59c265d815`, deploy ativo `6a95502db8459ddb8876d56e`, 303/303 testes focados, 1210/1210 integrais, arquitetura, contrato, build de 180 arquivos e 44 URLs. Domínio e URL imutável reportaram `automationMode=active` e `conversionExperience=bruna-conversion-v1`; sondas sem assinatura retornaram HTTP 401 e nenhuma mensagem real foi enviada. Apps Script v139 foi preservado. Rollback: desligar a chave; se ainda necessário, código `e17fad2506e4ec19508a3472580c183bac3182ef` e deploy `6a94f6381f6a590008674bc4`.

## 2026-08-27.1 — publicada e verificada

- Turnos da paciente, da Bruna e da equipe são normalizados e ordenados pelo horário real do provedor antes de qualquer decisão; o desempate de registros legados permanece estável.
- Ecos humanos concluídos fora de ordem não invertem mais a conversa: uma resposta curta a uma pergunta explícita mais nova pode entrar na retomada protegida, e uma pergunta antiga atrasada não reabre uma fala posterior.
- Caches históricos já invertidos se autocorrigem na leitura sem perder turnos.
- Toda confirmação de madrugada que prometa retorno mantém uma pendência real para as 8h; procura genérica por procedimento conhecido usa continuação contextual determinística, e falha ou bloqueio vira revisão humana visível.
- Estado desta versão: código funcional `39227ac203a4a22b358734e8c37fad9f19274a12`, deploy Netlify `6a90650200aa2400081284ce`, `ycloud-webhook` `a532d1af94147e087492fe5bf2a61c9efdc61b210eedd51075f720c50ba1f132` e `human-resume` `e8a0a82ad9f44bde527c0ae7436a6545622e8274d7ba737ff9815e7ed3b7b395`; 131/131 testes focados, 1118/1118 integrais, arquitetura, build de 178 arquivos e 44 URLs aprovados. Domínio, URL imutável e webhook HTTP 200 em modo `active`; requisição sem assinatura HTTP 401, 12 funções, 5 agendas, zero segredo em 467 arquivos e nenhuma mensagem real. Rollback: `527e8890945c083cae82ecb2738aff8223617c31` e `6a8fff55f898e40008a97339`.

## 2026-08-26.4 — publicada e verificada

- Depois de qualquer saída humana, a Bruna aguarda no mínimo dez minutos desde a entrada mais recente da paciente; não há mais exceção de resposta imediata durante takeover.
- Uma nova entrada da paciente substitui a pendência e reinicia o prazo; qualquer nova saída humana cancela a retomada, inclusive durante a elaboração e antes do envio.
- Ao vencer, `human-resume` relê os 20 turnos atuais e pode responder uma nova dúvida segura e autônoma sem depender da redação exata anterior da equipe.
- Agenda e confirmação final, urgência e cuidado clínico, preço sem contrato aprovado, promessa humana, opt-out, encerramento, adiamento, mensagem mais recente e duplicidade continuam fechados.
- Estado desta versão: código funcional `7507365726e354a4c3a447c06c552990e6667228`, deploy Netlify `6a8f8650e288813cf709de85`; 172/172 testes focados, 1099/1099 integrais, arquitetura, build de 178 arquivos e 44 URLs aprovados. Domínio, URL imutável e webhook HTTP 200 em modo `active`; requisição sem assinatura HTTP 401, 12 funções, 5 agendas e nenhuma mensagem real. Rollback: `6e16f20a966a979b082ed20f249f382bb8fbbd4e` e `6a8f6edc9cf872000807c45c`.

## 2026-08-24.1 — publicada e verificada

- Imagens recebidas em sequência passam pela mesma janela silenciosa de cinco segundos e são tratadas como uma única rajada antes da confirmação automática.
- Uma reserva atômica por paciente e família de resposta permite somente uma confirmação concorrente e mantém as demais suprimidas por cinco minutos.
- Falha ou bloqueio no envio libera a reserva para nova tentativa; sucesso ou duplicidade comprovada preserva o intervalo de segurança.
- Mensagens de texto, interpretação da foto, classificação, takeover, agenda, retomadas, preços, opt-out e Apps Script v128 permaneceram inalterados.
- Estado desta versão: código funcional `2a5086ececd7b9aee618fb5a76f43493d69e4d19`, deploy Netlify `6a8c70614abd522baf51b3ba` e função `ycloud-webhook` no checksum `fddc33261ada215ec968cd063b26330ef4c815a1b232214d18f70c03d15c1c38`. Validação com 32/32 testes focados, 1059/1059 integrais, arquitetura, build de 178 arquivos e 44 URLs; 12 funções e 5 agendamentos publicados, endpoints canônico e imutável HTTP 200 em modo `active`. Nenhuma mensagem real foi enviada. Rollback: `eebb15c16a8a8d46691716700912ab047b8a213c` e `6a8b8bdf350050000854b869`.

## 2026-08-23.7 — publicada e verificada

- A resposta ao valor da consulta presencial informa primeiro R$ 500, depois Pix, débito ou parcelamento e emissão de nota fiscal, com oferta opcional e sem interrogação para verificar horários.
- A explicação breve sobre a avaliação só aparece se ainda não tiver sido informada; quando a conversa já contém esse contexto, a resposta fica restrita a preço, pagamento, localização ainda necessária e próximo passo.
- Endereço, CEP, Thera Office e Maps são reconhecidos também em falas humanas, evitando repetir a localização; pergunta apenas de preço continua sem link e sem coleta prematura de dias ou período.
- A sugestão da Central usa a mesma cópia contextual. Não foram adicionadas promessas sobre Imposto de Renda, reembolso, teleconsulta, estacionamento ou retornos.
- Preços cirúrgicos, agenda, takeover, retomadas, opt-out, outras funções Netlify e Apps Script v128 permaneceram inalterados.
- Estado desta versão: código funcional `d6c896a23edffa942b9dc34ba16c1f3a847dbb76`, deploy Netlify `6a8b89d97d701d000895f77f` e função `ycloud-webhook` no checksum `4c1cb9ec95fde9760f73560e1adc3acd61a0d97e82c3559d98f05b6de2aeaac8`. Validação com 159/159 testes focados, 1054/1054 integrais, arquitetura e build de 178 arquivos; 12 funções e 5 agendamentos publicados, endpoints canônico e imutável HTTP 200 em modo `active` e 463 arquivos verificados sem segredo detectado. Nenhuma mensagem real foi enviada. Rollback: `28d1238520e9fd98c215848f13c868a2a2112adb` e `6a8b7d212bc77a000868548e`.

## 2026-08-23.6 — publicada e verificada

- Primeiras respostas de site, Google, Meta e WhatsApp direto passam a seguir o mesmo padrão, independentemente do volume de procura do procedimento.
- Todo procedimento reconhecido é nomeado naturalmente e, quando não há outro pedido objetivo, recebe uma única pergunta de baixa fricção sem presumir agendamento.
- Ninfoplastia recebe uma abertura e uma explicação de avaliação reservadas e individuais, sem pedido de foto, descrição corporal ou detalhes íntimos.
- Classificação, takeover, agenda, preços, retomadas, opt-out e autorização de envio permanecem inalterados.
- Estado desta versão: código funcional `b4ff895b2cfe29fbe1780fc78348f37593421861`, deploy Netlify `6a8b7b253e598c00083ee441` e função `ycloud-webhook` no checksum `2f65ec5c010964e17a25da7e1766c90d8bc87511d5f36248b98193fed4de0eaf`. Validação com 235/235 testes focados, 1045/1045 integrais, arquitetura e build de 178 arquivos; domínio, URL imutável e webhook HTTP 200 em modo `active`, sem segredo detectado e sem mensagem real. Rollback: `f10b70b48c3e9ec47855c303e83f7fb76f783c4a` e `6a8b64f751610e0008507fc5`.

## 2026-08-23.4 — publicada e verificada

- A segunda e última retomada aprovada pela equipe reutiliza a revisão semântica da primeira somente quando a última interação durável continua sendo exatamente a primeira retomada automática e não houve fala posterior da paciente ou da equipe; qualquer incerteza exige nova revisão da IA e falha fechada.
- Cervicoplastia passa a ter faixa automática exclusiva de R$ 18 mil a R$ 26 mil depois de aceite claro da oferta ou novo pedido explícito; sua resposta nunca inclui os valores de minilifting ou lifting facial.
- Lifting facial preserva sua faixa própria e otoplastia permanece automática em R$ 8 mil a R$ 14 mil, cada uma com detecção de repetição independente.
- Toda pergunta de preço de outra cirurgia entra em revisão humana desde a primeira ocorrência, com alerta interno e resposta sugerida para conferência manual.
- As respostas à paciente deixam de expor linguagem de confirmação operacional interna; o gate de saída bloqueia essa formulação e continua bloqueando valores fora das três exceções.
- Estado desta versão: publicada no código funcional `dc3d6054e895968e98f369e39a3905fca5559227`, deploy Netlify `6a8b399c98d6cf000824079f` e Apps Script v125, com os deployments canônicos preservados. Os testes focados passaram em 313/313, a suíte ampla em 1015/1015 e o build em 178 arquivos e 44 URLs. Domínio, URL imutável, webhook e web app responderam HTTP 200; segredo/token inválidos falharam com segurança. Nenhuma função, trigger ou mensagem real foi executada. Rollback: código funcional `f3966f76d281056fc1abf5198a9a97ea519ed6ff`, deploy Netlify `6a8b322b31e9e0000873b91c` e Apps Script v124.

## 2026-08-22.1

- Eventos que chegam da YCloud como `unsupported`, sem corpo textual utilizável, deixam de terminar sem uma resposta ao paciente: recebem a mesma pergunta neutra de recuperação já aprovada para texto sem corpo.
- A rota permanece humana e pendente; o sistema não reconstrói a fala, não presume anúncio, profissional, procedimento, qualificação ou agenda e não registra uma mensagem que o provedor não entregou.
- A deduplicação por mensagem mais recente passa a cobrir também esse formato. O replay do payload `unsupported` não entra na fila durável de recuperação, porque repetir o mesmo envelope não recupera o corpo omitido.
- A observabilidade registra somente disponibilidade, subtipo e códigos técnicos saneados. O teste sintético confirma que título, detalhe, nome, telefone e conteúdo não entram no log.
- Estado desta versão: publicada e verificada no commit funcional `5c08be94a7382c9f2c2bbd56c510277541b19169` e deploy Netlify `6a89f0e9f4f19fa8ec16b8e6`; função `ycloud-webhook` no checksum `97f6ea16f2443c575d093786903f821101e602934a23b818f96557f533aedc3b`, **635/635 testes do Netlify**, build de 178 arquivos, 44 URLs e endpoint público `active`. Nenhuma mensagem real foi enviada. Rollback: deploy `6a89b867a85c5f00085ae691` e código funcional `dd93f1cebf5c218672d1bf84d6d3b39ca3c9ff74`.

## 2026-08-20.3

- A confirmação final feita pela equipe pode registrar um horário negociado fora de `Datas Consulta`; a grade continua delimitando apenas a oferta e a confirmação automáticas.
- A Dra. Amanda permanece obrigatoriamente na `Sala 1`. Uma sobreposição real não apaga nem muda a reserva confirmada: dispara somente um alerta por e-mail para resolução humana.
- A linha de `Consultas` é gravada de forma atômica, incluindo os campos que deixam o lembrete elegível. Comprovante incompleto não cria linha parcial nem evento e exige uma ação humana clara.
- O webhook usa um único caminho de reserva, aguarda até 20 segundos e, em timeout, relê pelo ID antes de alertar; não existe segundo `upsert` de fallback.
- A seleção humana `Quinta 24 às 14` é resolvida contra a opção previamente oferecida e preserva a data completa, sem reinterpretar a expressão como a próxima quinta-feira relativa.
- Estado desta versão: publicada e verificada no commit funcional `27f07856e43cf90f898132ddf11913210818f2c4`, deploy Netlify `6a879160d29a140008a20503` e Apps Script v108 no deployment canônico. O caso operacional autorizado foi reconciliado em Consultas, LEADS, CRM e Sala 1, sem mensagem à paciente; a rotina de lembretes permaneceu instalada e o registro ficou elegível. **932/932 testes**, build de 178 arquivos e 44 URLs sem erro. Rollback: deploy `6a8762898c14302d7062b1f9`, commit `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11` e Apps Script v107.

## 2026-08-20.2

- A comparação geral entre minilifting e lifting facial recebe uma resposta contextual sobre a extensão do tratamento, sem prometer cicatriz menor, recuperação mais rápida nem definir a técnica individual.
- Dúvidas seguras que ainda precisem de revisão humana preservam um rascunho interno quando ele puder ser escrito apenas com fatos confirmados. A ocorrência abre uma ação idempotente em `Revisões do Bot`, pode aparecer na Central e alimenta o e-mail diário; risco alto, urgência, cuidado ativo, diagnóstico, indicação, agenda final e preço sem base aprovada permanecem sem texto copiável.
- A primeira resposta sobre preço de lifting facial, cervicoplastia e otoplastia termina com a oferta aprovada `Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida.`, depois do guia facial e sem números. A faixa continua restrita ao aceite claro ou ao novo pedido explícito, uma única vez.
- As formas históricas da oferta continuam reconhecidas para que conversas já iniciadas não percam o segundo passo. Procedimentos sem faixa automática autorizada não recebem essa promessa.
- Regressões cobrem o caso exato da Brenda, a equivalência entre resposta automática e sugestão da Central, o rascunho humano seguro, o bloqueio de rascunhos de alto risco, a nova oferta, a aceitação posterior e a ausência de oferta fora dos procedimentos autorizados.
- Validação local: **923/923 testes**, build de 178 arquivos, 44 URLs verificadas e `git diff --check` sem erro. Nenhuma mensagem real foi enviada.
- Estado desta versão: publicada e verificada no commit funcional `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11`, deploy Netlify `6a8762898c14302d7062b1f9` e Apps Script v107 no deployment canônico preservado. O Netlify confirmou `ready`, 12 funções e publicação às 17:25 BRT; domínio, URL imutável e webhook `active` responderam HTTP 200. `KnowledgeBase.gs` e `CentralAtendimento.gs` foram relidos no editor e ficaram idênticos aos locais por SHA-256 normalizado; o web app respondeu HTTP 200 e o segredo inválido foi recusado antes de qualquer ação. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Nenhuma mensagem real foi enviada. Rollback: deploy `6a8701bb1ae7b60008c3a8ac`, commit `afa230263288bba88fb0cb61f4fb55e5903d4dca` e Apps Script v106.

## 2026-08-20.1

- Todo texto elegível já persistido recebe avaliação semântica mesmo quando ainda não existe oportunidade, a rota está `pending`, a ação final é revisão humana ou existe takeover; avaliação não significa autorização de envio.
- O contexto durável pré-oportunidade passa a reunir até 32 turnos de `_WHATSAPP_MENSAGENS` com os ecos de `_WHATSAPP_ATENDIMENTO_HUMANO`, mantendo autoria e ordem cronológica. Respostas humanas deixam de ser truncadas em 500 caracteres e passam a preservar até 4.000.
- Em modo ativo, uma decisão com alta confiança e contexto não baixo pode recuperar Amanda ou Daniel reprocessando idempotentemente o mesmo evento. Em `shadow`, o candidato é apenas observado e nunca altera a rota.
- Se a rota continuar incerta e o conteúdo for seguro, a Bruna faz uma única pergunta de esclarecimento. Quando o caso exigir a equipe, a avaliação semântica alimenta o alerta com uma sugestão contextual somente se houver rascunho seguro; urgência, cuidado ativo, diagnóstico, agenda final e informação não aprovada continuam sem texto inventado.
- Prefills estruturados deixam de contornar a IA: a abertura neutra aprovada só é usada quando o modelo confirma semanticamente o código, o profissional e o procedimento, sem transformar o template em intenção de agenda.
- O controle `WHATSAPP_AUTOMATION_MODE=off` passa a ser um desligamento global: preserva a entrada para a equipe, mas interrompe IA, mensagens ao paciente, mutações automáticas de agenda, retomadas, lembretes, pós-consulta e retomada após takeover. `shadow` também não altera agenda. O estado ao vivo pode ser conferido por `npm.cmd run bot:status` e a reativação depende de pedido explícito.
- Regressões cobrem o caso sintético de queixas faciais após pergunta humana, rota ambígua com uma pergunta, decisão completa porém não autorizada mantida em revisão humana, `shadow` sem mutação, takeover com avaliação sem resposta, prefill sem salto para agenda e bloqueio global dos disparos. Validação local: **912/912 testes**, build de 178 arquivos, 44 URLs verificadas e zero erro de sintaxe ou de `git diff --check`. Nenhuma mensagem real foi enviada.
- Estado desta versão: publicada e verificada no commit funcional `afa230263288bba88fb0cb61f4fb55e5903d4dca`, deploy Netlify `6a8701bb1ae7b60008c3a8ac` e Apps Script v106 no deployment canônico preservado; **912/912 testes**, build de 178 arquivos e 44 URLs sem erro. Domínio, URL imutável, webhook em modo `active` e web app responderam HTTP 200. A v105 do Apps Script foi intermediária e a releitura impediu o fechamento com `LeadClassification.gs` antigo; a v106 reconciliou o arquivo. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Nenhuma mensagem real foi enviada. Rollback: deploy `6a864d9a75c1bc0008b26c3b`, commit `204aff23d27ed262f21ed66b448609ad838998b6` e Apps Script v104.

## 2026-08-19.6

- Mensagens de texto recebidas sem corpo legível deixam de terminar silenciosamente em `route_pending`: a Bruna envia uma única pergunta neutra para recuperar o procedimento ou a dúvida, sem presumir contexto clínico, qualificação ou intenção de agenda.
- A extração aceita variações seguras conhecidas do envelope textual antes de declarar o conteúdo ausente; se o provedor tiver omitido o corpo de fato, a resposta degradada permanece protegida por mensagem mais recente, deduplicação, preferência de contato e corrida com atendimento humano.
- O texto vazio não é fabricado nem gravado como fala da paciente. Somente a resposta efetivamente entregue pela Bruna entra no histórico, e falha ou intervenção humana continuam bloqueando o envio.
- Estado desta versão: publicada e verificada no commit funcional `204aff23d27ed262f21ed66b448609ad838998b6` e deploy Netlify `6a864d9a75c1bc0008b26c3b`; Apps Script v104 preservado, **899/899 testes**, build de 178 arquivos e 44 URLs sem erro. O Netlify confirmou o deploy publicado e as 12 funções. A projeção ativa do manual e o Plano Executivo foram substituídos nos mesmos IDs do Drive e conferidos byte a byte; o manual usa SHA-256 `590a4ffc08fb28e32b79f6cdddee49f58bf3b98f1fa616234950acf8ac45dc46`. A sonda HTTP direta do webhook não foi repetida porque o cliente bloqueou o acesso técnico direto. Nenhuma mensagem real foi enviada. Rollback: deploy `6a8641c07b71ac00088337f8`, commit `9a4a4082e5e4ad3e0bcf1e32dbbfe01af58eab22`.

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
