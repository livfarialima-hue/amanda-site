# Bruna: continuidade comercial, cuidado humano e precisão da LEADS

**Estado: código publicado e cuidados após aprovação ativos; aniversário submetido e ainda em análise.** A autorização final de Daniel foi usada para publicar e migrar a estrutura aditiva. Os capítulos intermediários abaixo registram a sequência local; o recibo final prevalece sobre estados históricos. Nenhuma mensagem real foi usada como teste.

**Pacote final integrado:** 1.444/1.444 testes e 188/188 focados; 121 arquivos funcionais de integração (53 Bruna, restante da publicação SEO preservada), mais recibos de fechamento. Inclui contexto, cooperação humana, LEADS, resumo diário, decisões persistentes e entrega dos cuidados aprovados.

## Resultado da análise

A estratégia existente é adequada em sua base: responder à intenção atual, explicar o valor da avaliação sem prometer resultado, permitir preço dentro das regras aprovadas e manter situações clínicas com pessoas. Os problemas mais importantes estavam na continuidade da conversa e na tradução dessa conversa para a operação. A Bruna podia repetir uma pergunta já respondida; o classificador podia perder mensagens recentes e autoria; o e-mail podia cortar ou substituir um rascunho; e informações incertas podiam alcançar marcos administrativos.

As mudanças mantêm o objetivo de facilitar a decisão de consultar e reduzir trabalho repetitivo. Não há evidência nesta auditoria de aumento de conversão já produzido pelas mudanças. O resultado comercial depende da publicação, da resposta humana aos casos encaminhados e da observação de contatos válidos, consultas e comparecimento.

## Evidência e limites

Leitura autenticada da LEADS canônica em 12/09/2026: 302 registros de mensagens, entre 07/09 às 08:08:15 e 12/09 às 20:03:44, fuso de São Paulo, cruzados com oportunidades, autoria, filas e cabeçalhos. O recorte contém 27 contatos distintos: 11 com origem de marketing identificada no CRM e seis em fase de consulta ou cuidado estabelecido. Essas categorias descrevem o recorte e não constituem coortes independentes ou uma taxa de conversão.

| Autoria registrada na fonte | Mensagens |
|---|---:|
| Paciente | 158 |
| Equipe humana | 124 |
| Bruna | 20 |

A avaliação da Bruna não atribui a ela as 124 mensagens humanas. As conversas extensas não foram tratadas como jornadas completas: foram confrontados trechos relevantes, a origem e o estado operacional. Áudios/imagens sem texto não foram interpretados. Não foram copiados nomes, telefones, mensagens, identificadores de pacientes ou conteúdo clínico para este relatório ou os testes.

No cruzamento, 17 contatos com saída efetivamente humana continuavam com responsável `bruna` no CRM; 18 contatos tinham relacionamento `unknown`. Esses números indicam problemas de projeção, não provam falha clínica ou abandono. A ausência de mensagem da Bruna também não foi tratada como falha: takeover, silêncio solicitado e cuidado ativo podem legitimamente impedir resposta automática.

Baseline técnico observado:

- Netlify autenticado: commit `de53af57c2d17d2fb5912379dc05f38f024dc7de`, deploy `6aa5e68f41e08e0008a76b33`, produção pronta; endpoint de saúde ativo.
- Apps Script autenticado: versão 149, descrição vinculada a `79d456e`, deployment canônico terminado em `ZuBUKX79A`. Projeto, implantação e planilha coincidem com `production-target.json`.
- A aba Consultas já contém `Opportunity ID` na coluna BM. Notas históricas de versões anteriores sobre sua ausência não representam este retrato atual.
- O trabalho foi isolado em `codex/bruna-conversao-leads-20260912`, sem alterar a tarefa de Meta nem o trabalho paralelo de conteúdo.

No fechamento, a produção avançou para `fd76cf86fc8ce8e0ed05e8590fca51bdd1e167c5`, deploy `6aa5ec483ca1f7000909ff0a`. Essa base foi incorporada integralmente antes do commit: preservados 20 arquivos do trabalho paralelo de conteúdo, campanhas e governança, sem alteração nas funções da Bruna no intervalo. O Plano foi recomposto a partir da versão mais recente, acrescentando somente esta pendência; o registro de impacto preservou as adições paralelas. A base final do candidato é `fd76cf8`.

## Correções e implicação prática

| Problema | Correção | Limite preservado |
|---|---|---|
| Resposta curta ao assunto gera a mesma pergunta de descoberta | Reconhecer procedimento/região e respostas como “tudo”; quando a saída apenas repete a pergunta, usar a explicação aprovada do procedimento | Sem diagnóstico, preço novo ou convite automático para agenda |
| Conversa segura termina sem continuidade útil | Permitir uma continuação informativa em contexto de procedimento conhecido | Cuidado ativo, foto, preço protegido, agenda e intervenção humana continuam nos gates próprios |
| Foto sugere que a clínica já tem uma solução apropriada | Remover a antecipação de benefício; agradecer, encaminhar e explicar a finalidade da avaliação | Nunca afirmar que a médica já analisou a foto |
| Histórico extenso perde a pergunta ou o compromisso recente | Ordenar antes de limitar; priorizar as últimas mensagens e preservar início e fim de textos longos | Máximo de 24 mensagens e 16 mil caracteres; histórico parcial não vira prova completa |
| Classificador não distingue Bruna e equipe | Preservar `source`; reler autoria no Apps Script antes da gravação | Uma fala automática não comprova ação humana realizada |
| Contato humano reaparece sob Bruna no CRM | Projetar `human_team` quando houver autoria humana recente, cuidado ativo, baixa confiança ou responsável humano já registrado | Classificação não libera takeover nem retoma conversa automaticamente |
| Prefill sem resposta aparece aguardando paciente | Manter Novo e registrar a resposta inicial como pendência da clínica | Prefill não qualifica; promessa humana posterior continua registrada |
| Mídia sem texto some do histórico | Manter marcador de conteúdo indisponível; se só houver prefill/mídia, impedir promoção e pedir revisão | Não inferir aceite, desinteresse ou fechamento a partir de mídia não lida |
| Baixa confiança pode promover consulta/fechamento | Preservar fase; bloquear escrita em agenda e marco de procedimento; encaminhar revisão | Sem conversão financeira ou comercial fundada em evidência incerta |
| Mensagem nova chega durante a classificação | Invalidar o resultado antigo antes da sincronização e deixar o trabalho pendente | Não aplicar decisão de uma versão anterior da conversa |
| Identificador de oportunidade é aceito sem conferir a linha da mensagem | Conferir também telefone e profissional ao coletar mensagens vinculadas | Teste preventivo; não foi encontrada mistura real de pacientes no recorte |
| E-mail herda limite do template WhatsApp e corta rascunho | Separar limites: e-mail até 10 mil caracteres; alerta WhatsApp até 1.024; rascunho antes do contexto | Rascunho acima do limite próprio não é apresentado truncado como pronto |
| “Sem sugestão” vira resposta genérica, às vezes para outro profissional | Preservar ausência explícita; reconhecer rascunhos já preparados, inclusive orçamento hospitalar | Sem resposta fabricada apenas para preencher o e-mail |
| Takeover/configuração do alerta WhatsApp suprime e-mail | Manter e-mail como canal independente, deduplicado pelo evento | Cooldown do WhatsApp permanece; e-mail não significa mensagem enviada ao paciente |

## Condução comercial recomendada e implementada

1. **Responder antes de perguntar.** Identificar o procedimento e a dúvida já trazidos. Entregar uma informação concreta e curta; não reabrir descoberta quando a pessoa já respondeu.
2. **Conectar a avaliação à decisão da pessoa.** Explicar o que será examinado e como isso ajuda a discutir possibilidades, limites e expectativas. O convite depende do contexto e pode ser recusado.
3. **Tratar objeções como informação.** Preço pede transparência dentro das faixas autorizadas; distância pede conferência da logística; receio pede acolhimento e esclarecimento. Não usar escassez, pressão, vergonha corporal, garantia de resultado ou insistência.
4. **Aproveitar preferências já fornecidas.** Dias, períodos e disponibilidade informados não devem ser perguntados novamente. Horário sugerido não é reserva, e reserva só é confirmada pelo mecanismo canônico.
5. **Separar aquisição de cuidado.** Retorno, documento e acompanhamento de paciente conhecida pedem resolução administrativa ou clínica; não são nova aquisição nem oportunidade de insistir em cirurgia.
6. **Respeitar quem deve agir.** “Eu retorno quando decidir” deixa a iniciativa com a pessoa. “Vou conferir e te retorno na segunda” mantém a pendência com a clínica. A classificação não cria uma retomada por conta própria.

Esses critérios são consistentes com decisão compartilhada, que considera preferências, opções e a possibilidade de não realizar uma intervenção ([NICE NG197](https://www.nice.org.uk/guidance/ng197/chapter/Recommendations)), e com os limites da publicidade médica brasileira quanto a promessa de resultados e exposição persuasiva de resultados ([CFM, Resolução 2.336/2023](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2023/2336), [manual prático](https://publicidademedica.cfm.org.br/manual/aplicacao-pratica/capitulo-12)). São fundamentos de comunicação; não prova de eficácia comercial desta implementação.

## LEADS: precisão sem reorganização

Os cabeçalhos existentes são suficientes. Não foram criadas, removidas, movidas ou renomeadas colunas/abas, nem aplicadas correções retroativas por inferência.

| Campo/camada existente | Regra aplicada |
|---|---|
| Origem, campanha, identificadores de clique e Opportunity ID | Preservação; conversa não reatribui origem inicial |
| Situação do lead | Interesse genérico/preço isolado = Novo; intenção prática pessoal pode qualificar; marcos exigem evidência; baixa confiança não avança |
| Relacionamento | `new_lead`/`engaged_lead` para aquisição; estados de cuidado existentes preservados |
| Responsável atual | Equipe humana quando houver intervenção/cuidado/revisão; Bruna apenas quando apropriado |
| Aguardando ação de | Quem tem a próxima ação real, não simplesmente quem enviou a última mensagem |
| Resumo automático e próxima ação | Síntese administrativa objetiva, sem detalhes clínicos; compromisso/data somente quando informados |
| Objeção principal | Motivo comercial explícito; silêncio não prova desinteresse |
| Revisões do Bot/e-mail | Incerteza e decisões sensíveis para humano; rascunho seguro ou ausência explícita |

A correção de responsabilidade será aplicada nos ciclos normais após a publicação. Reparar registros históricos em lote é uma etapa distinta: primeiro simular e comparar uma lista precisa de diferenças, preservando fases humanas, agenda, origem e conversões; depois executar somente o conjunto conferido. Não foi usada reclassificação em massa como atalho nesta auditoria.

## Validação, publicação e monitoramento

Os testes novos usam apenas conversas sintéticas. Quinze falhas foram reproduzidas antes da respectiva correção, além das verificações cruzadas de versão da conversa e aplicação dos marcos. A suíte nova cobre 20 cenários, incluindo o caminho real de conclusão do classificador: o trabalhador devolve identificadores e resultado, e a autoria precisa ser relida no proprietário da gravação.

**Resultados da etapa inicial:** 1.363/1.363 testes aprovados, incluindo 20 cenários novos da integração; arquitetura e escopo exato de 24 arquivos aprovados; artefato de 192 arquivos e 53/53 rotas válidas, sem auditoria empacotada; IDs canônicos confirmados; revisão do diff sem erro. A suíte foi repetida após incorporar a publicação paralela e alinhar as regras de rascunho administrativo. O fechamento documental `a9f03ab` também foi preservado, sem mudança funcional adicional. O teste semântico adicional com chamada real ao modelo não foi concluído: a API administrativa do provedor de hospedagem devolve a credencial protegida mascarada. A rejeição dessa representação não demonstra falha da chave usada na produção. Não houve avaliação nova do modelo sobre conversas reais nem uso de dados clínicos em serviço adicional.

O Plano executivo foi reconciliado com o fechamento atual e substituído no mesmo arquivo do Drive, registrando este candidato como local. A releitura em 12/09 às 21:28:25 confirmou igualdade integral dos 155.021 caracteres, SHA-256 `0e0ad5963165a1cdd8787cc59a6c7716871aeb1fd127fc3c78cb0a04f04b475e`. Esta foi a única escrita externa da preparação e não alterou a operação. A projeção do manual operacional será atualizada junto da publicação para não apresentar regras novas como ativas.

Publicação pendente: validar novamente a produção e preservar mudanças paralelas; publicar somente o commit aprovado nos destinos canônicos; reler os dois arquivos Apps Script e o deployment existente; publicar as funções; conferir saúde, assinatura e filas sem enviar mensagens; atualizar recibos e projeções existentes do Plano e do manual. `ops:check` deve permanecer `SYNC_PENDING` enquanto esse pós-voo não estiver concluído.

Monitoramento após publicação: primeiro ciclo, 24h, 48h e D+7. Conferir autoria/responsável, pendências da clínica, Novo versus Qualificado, preservação de cuidado/agenda, rascunho integral, duplicidades e consultas por origem. Comparar por oportunidade e autoria; não otimizar pelo número de mensagens. Conter a mudança se aparecer orientação clínica indevida, troca de profissional, avanço sem evidência, perda de handoff ou duplicidade. Rollback somente dos arquivos deste pacote, preservando histórico e trabalho posterior.

**Fechamento operacional observado:** `ops:check` retornou `SYNC_PENDING`, com publicação do candidato pendente, projeção do manual ainda na versão ativa anterior e branch isolada diferente de `reestruturacao-site`. Esses três itens devem ser reconciliados no release autorizado. O worktree do candidato está limpo; validação local e projeção do Plano não significam atualização da Bruna em produção.


## Ampliação: conversa compartilhada com a equipe

A conversa compartilhada passa a usar a entrada mais recente e uma janela protegida de dez minutos, processada a cada cinco minutos. Antes de responder, relê histórico, compromissos e preferências; nova atividade humana ou da paciente invalida a tentativa, inclusive depois de reservar o envio. Dúvida segura pode ter uma resposta pontual, mantendo qualquer tarefa humana anterior. Solicitação que depende da equipe recebe no máximo uma confirmação de recebimento por geração, somente após entrega do alerta; não promete horário ou resultado. Alertas de novas mensagens são consolidados por trinta minutos, com exceção de urgência, e falhas continuam recuperáveis. Agradecimento, encerramento e ciência de compromisso humano não criam trabalho artificial. O aviso de recebimento mantém a LEADS aguardando a clínica.

Problemas reproduzidos antes da mudança: repetição de evento reiniciava o prazo; o estado de espera bloqueava dúvidas posteriores; conclusão da rotina podia sobrescrever uma nova intervenção humana; falha de leitura permitia usar contexto antigo; falha do alerta encerrava a pendência; pedido concreto não recebia ciência tardia; e uma decisão de pensar gerava alerta sem trabalho útil. A fila, o processador, o envio e a LEADS são verificados em conjunto com dados sintéticos.

O e-mail de agenda oferece um rascunho administrativo sem inventar horários. Casos clínicos sem resposta segura ficam com ausência explícita de sugestão; a tarefa e o contexto continuam visíveis. Reconhecimento de urgência prevalece mesmo com paciente em pós-operatório e fora do horário habitual. Nenhuma geração de texto ou entrega real foi testada com pacientes. A janela final ainda depende de o evento humano chegar pelo provedor: se alguém enviar no mesmo instante após a última conferência, não existe exclusão atômica entre o aplicativo humano e o provedor; o sistema reduz essa possibilidade relendo a atividade depois da reserva e imediatamente antes da chamada.

**Baseline ampliado:** produção do site `996f4dacaddce0195befc960242ddc94cfd0682e`, deploy `6aa5f068ff6f6f00084695c0`, conferida por API autenticada em 13/09 às 00:47 UTC. O fechamento `05d99ef` foi incorporado, preservando páginas, testes, linguagem de segurança e o Plano paralelo. A fila aceita registros anteriores e passa a isolar novos registros por evento; rollback não apaga conversas nem exige migração da planilha. Apps Script permanece v149 até publicação autorizada.

**Validação da etapa Bruna/equipe anterior aos cuidados:** 1.386/1.386 testes, arquitetura, 34 arquivos com escopo declarado, construção de 192 arquivos e 53/53 rotas sem erro. O teste integrado percorre fila persistente, processador, reserva final de envio, alerta e confirmação única; a classificação mantém a pendência com a clínica. Não foram enviadas mensagens ou alertas reais. O estado continua local e a publicação depende de aprovação do novo commit candidato.

## Ampliação local — retomadas de cuidado e decisões persistentes, 12/09/2026

Este capítulo descreve o candidato local ampliado. A produção continua no Apps Script v149 e no Netlify 996f4dac; publicar e ativar exige o commit final aprovado.

A leitura autenticada da LEADS, limitada a Consultas A2:CB200, encontrou 57 registros, 31 consultas realizadas, 28 datas de nascimento, nenhum aniversário habilitado e seis consentimentos preenchidos. Há 17 registros com vínculo de Calendar. A consulta à Sala 1 canônica retornou 17 eventos entre 1 e 19/09; os quatro vínculos de consultas dessa sala com data dentro da janela foram encontrados no Calendar, sem divergência de data. Os outros seis vínculos estão fora da janela e não foram classificados como falha. Na Central A2:Z100 há 56 itens: dez pendências vencidas, quatro respostas imediatas, onze ações manuais, dois cuidados futuros e 29 esperas. O recorte A2:R150 de retomadas contém 62 ações manuais; não é uma contagem de toda a fila.

A revisão encontrou aniversários apenas sugeridos, cuidados identificados pela data do e-mail (o que reabria a mesma sugestão), aprovações limitadas ao marketing e um resumo construído com sugestões novas que não representava diretamente toda a fila persistida da Central. O novo resumo usa a Central após registrar os planos novos, mantém todas as linhas dessa visão e exibe seis decisões com mensagem no corpo; as outras mensagens completas ficam no painel. Ele informa o número de itens representados. A Central continua elegendo a ação principal por contato, com pendências humanas antes de propostas de retomada.

- **Dispensar esta sugestão:** guarda a decisão por consulta, profissional, categoria e data do marco. A sugestão não reaparece amanhã. Não muda Nunca retomar nem Nunca responder com robô. Novo marco tem identidade própria.
- **Adiar revisão:** persiste a data sem enviar. Revisões vencidas não desaparecem quando a janela inicial do marco termina.
- **Aprovar com a Bruna:** programa o texto mostrado; o painel mostra também o horário e, nos cuidados, o prefixo e o encerramento reais do modelo. A assinatura da decisão muda se texto, contexto ou horário mudar. Texto clínico ou editado fora do rascunho seguro continua com envio humano.
- **Antes do envio:** reler cadastro, consentimento, preferências das abas Amanda e Daniel, últimas mensagens com autoria, compromissos e o vínculo Calendar de consultas quando existente. Nova atividade humana/paciente, evento removido ou movido, pausa, dúvida clínica recente ou ausência de identidade bloqueiam o envio. Passagem da data no Calendar não prova consulta ou cirurgia realizada.
- **Horário:** atividade em pelo menos três dias distintos na mesma faixa dá uma preferência individual; sem esse histórico, 10h30 ou 16h30, em dias úteis, sempre antes de 18h e com pelo menos quinze minutos de antecedência. Não se promete que a faixa seja estatisticamente ótima. Aniversário admite todos os dias, apenas na data, sem envio tardio no dia seguinte.
- **Aniversário:** mensagem fixa de carinho, sem oferta, idade, procedimento ou convite comercial. Exige nascimento válido, paciente com consulta registrada como realizada, consentimento explícito, Aniversário pelo bot habilitado, profissional reconhecido, conversa disponível e ausência de contato recente/pendência. Um envio por telefone/ano, inclusive entre consultas duplicadas. Não reprocessa o dia da ativação nem aniversários antigos. 29/02 segue a normalização já existente para 01/03 em ano não bissexto; confirmar preferência com a paciente se necessário.
- **Marcos humanos:** pós-consulta mantém D+3 e D+14 quando pertinente; cirurgia confirmada gera sugestões D+2 e D+14 ou a checagem explicitamente registrada; orçamento enviado gera D+3 e, apenas se ainda em decisão, D+10. São propostas administrativas para revisão, não um protocolo médico nem mensagens clínicas automáticas. Resultado comercial concluído/negativo e cirurgia registrada retiram a retomada de orçamento.
- **Falha e duplicidade:** reserva de envio não expira em nova tentativa; resultado incerto exige conferir recibo. A reconciliação consulta o recibo sem enviar. Aceitação, registro no histórico e confirmação de entrega não são tratados como sinônimos.

A migração acrescenta somente três colunas no fim de Consultas — Data da cirurgia realizada, Data do orçamento enviado e Próxima checagem após cirurgia — e a aba interna _CUIDADOS_PROGRAMADOS. Não usa as lacunas históricas, não reordena colunas, não altera fórmulas e não infere datas a partir de textos vagos. As flags novas começam desligadas; não houve alteração de célula, agenda, gatilho ou mensagem de paciente nesta preparação.

A política do WhatsApp exige permissão para contatos posteriores e modelos aprovados para iniciar conversas; a automação de aniversário depende de um modelo próprio, com corpo idêntico ao texto preparado, confirmado como aprovado antes de habilitar a flag. Fontes primárias consultadas: [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/) e [YCloud — Enqueue a message](https://docs.ycloud.com/reference/whatsapp_message-send). O modelo de aniversário ainda não foi submetido/confirmado nesta tarefa; a configuração permanece bloqueada até essa confirmação.

Próximos gates: autorização do commit exato, comparação viva, publicar sem ativar, migração aditiva, verificar modelo e ativar cada mecanismo aprovado separadamente. Medir dispensas que reaparecem (meta zero), contatos repetidos, envios bloqueados por mudança, concordância do texto aprovado/enviado, recibos incertos, consentimentos válidos e consultas originadas de conversas qualificadas. Reverter efeitos novos pelas flags, preservando filas e recibos.

Aprovação de cuidado também confirma que o Opportunity ID pertence ao mesmo telefone e profissional no CRM. Ausência ou divergência do vínculo fica para revisão. Cadastros duplicados com nascimento divergente ou recusa explícita bloqueiam aniversário.

Prévia com dados fictícios: [e-mail](PREVIA-EMAIL.html) e [painel](PREVIA-PAINEL.html). Conferidos no navegador: texto legível, sem rolagem horizontal, nenhuma opção pré-selecionada; os controles da prévia não enviam mensagens.


**Fechamento local dos cuidados:** 1.425/1.425 testes, 34 testes próprios de cuidados, arquitetura, escopo exato de 46 arquivos e diff sem erro. Artefato: 192 arquivos, 53/53 rotas, zero auditoria publicada. A revisão paralela Google Ads do fechamento a9a7ea6 foi incorporada; a API Netlify confirmou produção 996f4dac no deploy 6aa5f068ff6f6f00084695c0. Um adiamento além da janela inicial conserva o rascunho e reconstrói o marco usando o cadastro atual, exigindo nova aprovação. Mudança de consulta impede a recuperação. Revisão interna de fechamento não recebe dispensa de contato. O transporte também bloqueia execução após 18h e marcos em fins de semana; aniversário pode ocorrer na própria data. Nenhuma execução com pacientes foi feita.


## Revisão contextual e autorização de publicação — 12/09/2026

Daniel autorizou expressamente estudar e ajustar o contexto e, após isso, publicar o pacote pendente desta conversa. A autorização abrange a migração aditiva e o transporte dos cuidados já descritos, sem aprovar mensagens humanas individuais nem preencher consentimentos por inferência. O estado efetivamente publicado será registrado no recibo de fechamento abaixo; capítulos anteriores são histórico das etapas locais.

Recorte complementar autenticado: _WHATSAPP_MENSAGENS A2090:L2313, 224 mensagens de 21 contatos: 117 recebidas, 88 humanas e 19 da Bruna. Das recebidas, 74 tinham menos de 30 caracteres; nenhuma excedia 1.200. Esses números descrevem só o recorte, não medem eficácia de vendas. Nenhuma mensagem identificável foi adicionada ao repositório.

Oito regressões sintéticas reproduziram falhas antes do ajuste: perda de uma fala em gravações simultâneas, sobrescrita por resumo atrasado, perda de eco humano durante recuperação, sucesso falso diante de conflito de gravação, autoria humana/desconhecida convertida incorretamente, procedimento recusado ainda selecionado, comparação convertida em escolha e histórico antigo ressuscitado após recusa. Um teste integrado adicional confirmou que o enriquecimento do funil também precisava respeitar a recusa e a comparação, sobretudo para não escolher uma faixa de preço arbitrária.

A memória agora mescla por versão com até quatro tentativas; conflitos persistentes permanecem falha, sem gravação incondicional. O resumo semântico só é salvo se o evento de origem ainda for válido e nenhuma fala posterior do paciente ou humano tiver chegado. Mensagens longas preservam início e final, com indicação de corte; os limites não autorizam presumir o conteúdo omitido. A mesma adaptação de histórico preserva autoria, evento e marcador de prefill. O modelo recebe explicitamente que o resumo anterior é apenas apoio e que ausência no histórico limitado não prova ausência de atendimento. Um “sim” deve ser relacionado à oferta concreta e não vira autorização genérica de agenda, preço ou cirurgia. Fonte técnica da concorrência: [Netlify Blobs — conditional writes](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).

Removida a instrução contraditória que proibia todo rascunho em cuidado ativo: é permitido apenas o administrativo seguro para revisão, com ausência explícita de sugestão quando necessário. Não houve mudança de modelo, diagnóstico, regra de preço ou decisão clínica. Os testes de IA validam contrato e conteúdo enviado ao modelo com respostas simuladas; não representam avaliação adicional do modelo vivo.

Validação integrada: 1.444/1.444 testes e 188/188 na seleção contextual/cuidados. A publicação paralela de descoberta/identidade 56fc749 e o fechamento e5384eb foram incorporados integralmente. O escopo de integração tem 121 arquivos por incluir esse trabalho já publicado; 53 pertencem ao pacote Bruna. Antes de escrever no Apps Script, comparar seis arquivos existentes com a base viva e criar somente CuidadosProgramados.gs. diagnosticarCuidadosProgramados é uma leitura sem planejamento, aprovação ou envio, destinada a verificar migração, flags, ledger e gatilho.


## Publicação e pós-voo da v150

**Bruna contextual, LEADS e cuidados — PUBLICADOS E VERIFICADOS em 12/09/2026:** commit `6c38ca5859f86c2224646f88607f554f8dd4fbe4`, Netlify `6aa6038eb31161000809495b` (23h00) e Apps Script v150 no deployment canônico existente (22h59). Sete arquivos Apps Script salvos, recarregados e comparados integralmente; webhook ativo, assinatura ausente recusada e web app saudável. A LEADS recebeu três campos no fim de Consultas (80 → 83 colunas); os 80 cabeçalhos anteriores, formatos, notas e validações foram relidos idênticos. A nova fila interna guarda decisões e recibos. Envio de cuidados após aprovação individual ativo desde 23h05; diagnóstico às 23h06: um gatilho, fila vazia, nenhuma mensagem de teste. Modelo de aniversário `aniversario_clinica_liv_v1`, pt_BR/Marketing, submetido às 23h05 com validade de 12 horas, ainda em análise; aniversário automático permanece desligado até aprovação. Nenhum consentimento ou aniversário individual foi habilitado por inferência. Validação: 1.444/1.444 testes, 188/188 focados, arquitetura, build e 54 rotas; testes do modelo usam respostas simuladas. Rollback: Apps Script v149, commit `f63d2fd7738df64d8916256a78ef7f72cf6c4300` e Netlify `6aa60074bdfc8c0008aab53c`, preservando dados e recibos. Evidência: `auditorias/bruna-conversao-leads-2026-09-12/PUBLICACAO.json`.

**Uso diário:** no e-mail, abrir o painel, conferir o texto e o horário e escolher **Aprovar com a Bruna**, **Dispensar esta sugestão** ou **Adiar revisão**. Não há seleção prévia. A dispensa fica registrada para aquele marco e não reaparece no dia seguinte; adiamento exige nova revisão. A Bruna relê conversa, cadastro, consentimento, preferências e agenda antes de enviar; mudanças bloqueiam o texto antigo. Sintomas, condutas clínicas e situações sem resposta segura continuam com a equipe, com contexto e rascunho administrativo seguro ou **SEM SUGESTÃO PRONTA**. Cirurgia e orçamento dependem das datas confirmadas pela equipe nos novos campos; Calendar não comprova realização.

**Pendência externa — aniversário:** aguardar aprovação do modelo no WhatsApp, conferir o texto aprovado e então habilitar a flag Netlify, republicar a configuração e executar a ativação canônica. A autorização desta conversa já cobre essa sequência; não precisa ser pedida novamente. Ainda assim, cada paciente exige nascimento válido, consentimento e Aniversário pelo bot habilitado. Não recuperar o dia da ativação nem datas antigas. Responsável: Daniel/equipe; verificar no próximo ciclo. Cuidados aprovados e demais melhorias já estão ativos.

Os cabeçalhos anteriores foram comparados como CellData completos, não apenas pelo texto. Os três novos campos conservaram o estilo do cabeçalho e usam data brasileira. O diagnóstico não planeja contatos nem envia mensagens. A ativação dos cuidados exigiu resposta autenticada de saúde do transporte antes de ligar a propriedade e preservou um único gatilho compartilhado. Mensagens já existentes na operação não são atribuídas a este pós-voo. A validade de 12 horas limita a tentativa do provedor; não é garantia do horário de recebimento.
