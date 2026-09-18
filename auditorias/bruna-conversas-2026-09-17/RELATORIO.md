# Diagnóstico das conversas e melhoria da Bruna — 17/09/2026

Estado: candidato local; publicação e verificações finais pendentes.

## Evidência e limites

Foram baixadas e conferidas as 76 exportações adicionadas hoje à pasta restrita de conversas do Drive. Há 75 transcrições distintas e uma duplicata integral. Os históricos incluem conversas antigas; exportar hoje não significa que a falha ocorreu na versão atual. Saudações automáticas, avisos do WhatsApp, anexos sem conteúdo e mensagens editadas não foram usados como falas pessoais equivalentes.

A análise cruzou as transcrições com os registros atuais de mensagens e eventos da LEADS, 73 memórias de conversa localizáveis e as filas técnicas. Autoria da Bruna e autoria humana foram separadas pelo registro operacional, não pelo estilo ou pela assinatura. Conversas de cuidado anterior, orçamento individual, menores, revisão cirúrgica, sintomas e agenda continuam exigindo a equipe.

Nenhum telefone, nome, transcrição literal de paciente ou anexo clínico integra este relatório, os testes ou o commit. As provas originais permanecem no Drive. Os exemplos de regressão são sintéticos. Não foi calculada taxa de conversão ou de sucesso do bot a partir dessa amostra de exportações.

## Causas confirmadas e correções

| Achado | Causa e efeito | Correção |
|---|---|---|
| Pergunta repetida após aceite de informação | Há respostas da Bruna confirmadas no histórico durável e ausentes da memória rápida. A gravação da memória vinha depois de chamadas externas de registro. Uma memória não vazia impedia a recuperação do histórico. | Gravar o texto exato aceito pelo provedor antes das chamadas externas lentas; recuperar o histórico também nas continuações com cache preenchido; recibos aceitos recompõem memória com autoria e horário originais, sem reenviar. |
| Aceites coloquiais mal reconhecidos | Variações de aceite com gentileza ou confirmação adicional escapavam ao reconhecedor de faixa. | Reconhecer aceites curtos apenas contra a última oferta concreta; não repetir o convite. Negação, condição, desconto, outro procedimento e agenda não são aceites de faixa. |
| Novo pedido de valor reiniciava a explicação | Quando o procedimento vinha do histórico, uma saída antecipada retornava à primeira etapa e pulava a verificação da oferta anterior. | Continuar no mesmo procedimento e aplicar a regra existente: faixa aprovada uma vez após aceite ou novo pedido; preços, ressalvas e limites inalterados. |
| Nome de empresa, sigla ou frase em saudação | Validação aceitava palavras de perfil que não eram nome pessoal; certas siglas com Y escapavam. | Validação conservadora na conversa e na retomada. Autodeclaração de estado civil/ocupação não substitui o nome. Não reescrever identidades históricas. |
| Retomada gerava uma escolha confusa | A oferta de procedimento ou recuperação foi interpretada em conversa como dois procedimentos. | Um convite concreto para explicar a recuperação, com uma única pergunta. Aceitar leva ao assunto oferecido, sem reabrir a descoberta ou oferecer outra vez a consulta. Cópias antigas continuam aceitas pelos gates. |
| Dúvida segura podia ficar sem base factual no turno curto | O seletor buscava o tema apenas no texto atual; um aceite não contém a palavra recuperação. | Recuperar o assunto da oferta informativa e disponibilizar os fatos educativos já publicados nas páginas canônicas de lifting cervical e otoplastia, além dos fatos faciais existentes. Nunca aplicar os fatos de um procedimento a outro ou liberar conduta individual. |
| Resposta automática de conta comercial parecia interesse | Mensagem de ausência/agradecimento podia ser tratada como fala pessoal. | Silêncio no atendimento e exclusão desse sinal como evidência de qualificação ou marco comercial, sem desqualificar pessoa nem alterar oportunidade existente. Pergunta pessoal ou sintoma prevalece. |
| Conteúdo visível no export chega vazio à integração | Há entradas sem texto na LEADS; o export por si só não prova qual corpo chegou no webhook. | Acolhimento curto e transparente quando o conteúdo vem indisponível. Não inventar a mensagem a partir do anúncio. A origem exata da omissão no provedor permanece indeterminada. |

## Continuidade e intervenção humana

Perguntas sobre informações aprovadas, aceite de explicação e esclarecimento linguístico seguro devem prosseguir. Uma saudação ou agradecimento em mensagem separada não apaga pergunta pendente. Esse último comportamento já estava implementado e ganhou regressão cruzada; não se atribuiu uma nova correção a um caminho que já funcionava.

O prazo de prioridade humana, as corridas com mensagens novas, a pausa do contato, os compromissos pendentes e as confirmações de agenda continuam protegidos. A melhora não consiste em baixar a exigência de segurança. A equipe ainda assume preços sem faixa aprovada, condições específicas, tecnologias não confirmadas, diagnóstico, conduta e cuidado em andamento.

Mensagens longas, indicações individuais e condições financeiras vistas em alguns exports eram de autoria humana. Não foram incorporadas à base automática nem tratadas como comportamento do bot. A revisão da equipe pode usar esse achado para padronizar orientação, mas nenhuma mensagem foi enviada pela auditoria.

## Retomada

Exemplo de nova sugestão para interesse cervical ainda sem resposta pessoal:

> Olá! Sobre lifting cervical, posso te ajudar com uma dúvida prática: como se organizar para a recuperação. Quer que eu te explique?

Preço, agenda e objeção explícita mantêm os caminhos específicos existentes. Elegibilidade, horário, cadência, consentimento, cancelamento e aprovação permanecem iguais. Não há atualização em massa de textos já preparados. Uma retomada deve acrescentar um ponto útil; se esse ponto já tiver sido esclarecido ou houver pergunta pendente, a revisão de contexto deve vetar o envio.

## Base factual

Fatos educativos de recuperação reutilizados das páginas canônicas: `lifting-cervical/index.html#recuperacao` e `otoplastia/index.html#recuperacao`. Não foram introduzidos prazos novos, prescrição, cuidados individuais ou promessa de resultado. Conferência complementar: [ASPS — recuperação do neck lift](https://www.plasticsurgery.org/cosmetic-procedures/neck-lift/recovery) e [ASPS — recuperação da otoplastia](https://www.plasticsurgery.org/cosmetic-procedures/ear-surgery/recovery).

A preservação explícita das entradas e saídas no contexto segue a [documentação de estado de conversa da OpenAI](https://developers.openai.com/api/docs/guides/conversation-state). O esquema público do provedor distingue texto da mensagem e referência do anúncio: [YCloud — exemplos de entrada](https://docs.ycloud.com/reference/whatsapp-inbound-message-webhook-examples). A referência do anúncio não substitui conteúdo ausente.

## Verificação, publicação e acompanhamento

Baseline: repositório `f6b60264d44862b75cbbe13206327218e1aae8a5`; produção funcional `9be771eda78e79e27b0a1730c62c8d43fc473572`, deploy `6aa86fc2b2999d0009b2d245`, Apps Script v154. Os 27 arquivos do editor canônico coincidem com o baseline após normalização de quebras de linha finais.

No pré-voo havia 38 recibos aceitos pendentes de confirmação de persistência e cinco preparados de resultado incerto. Isso não significa 43 mensagens perdidas: alguns registros já existem na planilha. Somente aceite confirmado permite recomposição da memória; recibo preparado nunca autoriza reenvio. O saldo e a latência devem ser observados no ciclo normal, sem executar replay manual.

Testes: regressões sintéticas de preço, aceite, identidade, mensagem fragmentada, recuperação de contexto, ordem de gravação e timeout; consumidores de retomada, cuidado, agendamento e classificação; suíte integral, arquitetura, mudança, build e consistência operacional. Resultados finais serão registrados em `PUBLICACAO.json` e no candidato.

Publicar primeiro o consumidor Netlify compatível com textos antigos e novos; depois atualizar somente Retomadas.gs no deployment canônico. Validar SHA, versão, código e sondas que não enviam mensagens. Rollback: Netlify anterior e Apps Script v154, preservando dados, filas e preferências.

Revisar as primeiras conversas elegíveis e em 48 horas: respostas úteis, perguntas repetidas, aceite não cumprido, passagem humana indevida, latência, integridade da memória e duplicidade. O ganho comercial e a redução real de intervenção humana exigem observação após a publicação; testes não provam melhora de conversão.

A validação encontrou um teste de recuperação dependente do relógio real: a mensagem sintética de 14/09 passou a ser antiga em 17/09. O relógio já injetável foi fixado no próprio teste, preservando o bloqueio de replay antigo em produção. Recibos antigos continuam sendo conciliados no histórico sem reativar a memória expirada.
