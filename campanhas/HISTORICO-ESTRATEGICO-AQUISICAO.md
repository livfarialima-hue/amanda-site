# Histórico estratégico de aquisição e conversão

**Status:** registro histórico subordinado

**Fonte canônica das decisões vigentes:** `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`

Este arquivo preserva o motivo, a evidência, a hipótese, a métrica, a revisão e a regra de manutenção ou reversão de mudanças estratégicas e operacionais. Ele não cria um norte concorrente. Se uma entrada antiga divergir da decisão vigente, prevalece o documento canônico.

## 30 de agosto de 2026 — correção da mensuração e contenção de tráfego sem intenção cirúrgica

- **Status:** implementação local validada; publicação autorizada em curso. Recibos externos, versão do Apps Script, deploy do site e alterações do Google Ads devem ser preenchidos somente depois da verificação ao vivo.
- **Área/campanhas:** agregado Google e fila de ajustes; primeira conversa de cervicoplastia; página `/lifting-cervical/`; `S_BR_SP_LIFTING_CERVICAL` e `S_BR_SP_CIRURGIA_FACIAL`. BLEF, OTO, LIFT e MARCA foram relidas e permanecem sem mudança de lance, orçamento ou texto nesta etapa.
- **Evidência:** o relatório integral de 31/07 a 29/08 registrou 1.650 cliques, 27.231 impressões e R$ 2.450,35. CERV teve 347 cliques e R$ 405,06; há procura explícita por `cervicoplastia`, `lifting de pescoço`, cirurgia do pescoço e lipo de papada, mas também cliques pagos em `enzimática`, `sem corte` e `sem cirurgia`. FACE teve 130 cliques e R$ 235,74; a frase `cirurgiã plástica em são paulo` gerou 654 termos visíveis, 51 cliques, R$ 91,52 e zero conversão exibida, quase todos em buscas por outros profissionais ou localidades. O agregado de 30 dias registrou 21 contatos, porém só quatro com código canônico porque os aliases removidos em 22/08 ainda eram tratados como desconhecidos. As duas retrações de falsos qualificados continuavam sendo reprojetadas mesmo depois de o histórico do Google confirmar `Essa conversão não existe` para ambas.
- **Mudança preparada:** registrar recibo durável e retirar da fila ativa somente as duas retrações confirmadas como inexistentes; impedir que voltem a ser projetadas; resolver os cinco aliases históricos exatos em coluna separada; preservar códigos ambíguos como N/D; tornar a primeira pergunta cervical aberta e centrada no contexto da paciente; alinhar o texto dos CTAs cervicais ativos à conversa sobre avaliação; excluir apenas intenções explicitamente não cirúrgicas em CERV; pausar a frase genérica de FACE se o agregado v2 confirmar zero contato válido depois de mais de 30 cliques.
- **Hipótese:** eliminar filas falsas, recuperar a campanha histórica sem maquiar a captura canônica e reduzir tráfego inequivocamente incompatível melhora a capacidade de decidir por contato válido, qualificado e consulta, sem comprar mais cliques nem pressionar a primeira conversa.
- **Métricas:** cobertura canônica e por alias; recibos de importação/ajuste; contatos válidos, qualificados, agendados e realizados por campanha; custo por qualificado e consulta; termos não cirúrgicos; continuidade depois da primeira resposta cervical; opt-out e revisão humana.
- **Guardrails:** nenhuma PII nos agregados ou arquivos de mídia; nenhuma inferência por página ou procedimento; orçamento total de R$ 87/dia e todos os lances preservados; nada de `Aplicar tudo`, PMax ou ampla; negativas apenas para intenção incompatível inequívoca; uma mudança material de tráfego por campanha; nenhuma mensagem real de teste.
- **Revisão:** saúde em 24 horas; primeira leitura em 06/09/2026; decisão em 13/09/2026, respeitando latência e volume downstream.
- **Regra para manter:** filas sem repetição, cobertura resolvida sem falsa atribuição, zero alias novo depois da persistência esperada, queda de termos incompatíveis e manutenção ou melhora de contatos válidos/qualificados.
- **Regra para reverter:** restaurar a versão anterior do Apps Script ou reativar a palavra de FACE diante de falsa atribuição, perda de fila válida, queda relevante de contato útil, aumento de custo qualificado ou bloqueio de intenção cirúrgica legítima; remover individualmente qualquer negativa que bloqueie termo aderente.

## 22 de agosto de 2026 — separação estrita das faixas automáticas por procedimento

- **Status:** publicado e verificado em 23/08/2026 no código funcional `dc3d6054e895968e98f369e39a3905fca5559227`, deploy Netlify `6a8b399c98d6cf000824079f` e Apps Script v125; nenhuma mensagem real foi enviada.
- **Área/campanha:** atendimento de preço da Bruna no WhatsApp; nenhuma alteração de campanha, orçamento, lance, palavra-chave, anúncio ou página.
- **Mudança:** cervicoplastia passa a usar exclusivamente R$ 18 mil a R$ 26 mil depois de aceite claro da oferta ou novo pedido explícito; lifting facial/minilifting e otoplastia mantêm suas faixas próprias. Uma resposta cervical nunca mostra valores de lifting facial ou minilifting. Qualquer pergunta de preço de outro procedimento gera alerta interno com resposta sugerida desde o primeiro pedido. A frase `As condições exatas dependem da confirmação humana` e suas variantes deixam de aparecer nas mensagens à paciente, embora detalhes não aprovados permaneçam bloqueados internamente.
- **Motivo e evidência:** uma resposta real de contexto cervical misturou as faixas de minilifting e lifting facial, criando risco de informação comercial errada e perda de confiança.
- **Hipótese:** separar faixa por procedimento e antecipar o alerta dos demais preços reduz erro de contexto sem aumentar silêncio operacional.
- **Métricas:** zero faixa cruzada; alertas de preço emitidos para 100% dos procedimentos fora das três exceções; sugestão copiável presente; continuidade depois da resposta; reclamações e revisões humanas.
- **Guardrails:** uma faixa automática por contexto; sem orçamento, proposta ou garantia; valor final individual; nenhuma repetição; nenhuma condição comercial exata inventada; nenhuma mensagem real de teste.
- **Revisão:** sete dias após eventual publicação ou imediatamente diante de faixa cruzada, alerta ausente ou resposta automática fora das exceções.
- **Regra para manter:** manter se não houver mistura de procedimentos, os alertas forem completos e a continuidade permanecer segura.
- **Regra para reverter:** desativar todas as faixas automáticas e encaminhar preço integralmente para revisão humana se qualquer resposta cruzar procedimento ou romper as ressalvas.

## 22 de agosto de 2026 — sinalização pública de faixa privada no guia de lifting

- **Status:** publicado e verificado em 23/08/2026 no código funcional `dc3d6054e895968e98f369e39a3905fca5559227` e deploy Netlify `6a8b399c98d6cf000824079f`; monitoramento posterior obrigatório.
- **Área/campanha:** página `conteudos/quanto-custa-lifting-facial-sao-paulo/` e continuidade privada pelo WhatsApp; nenhuma alteração em campanha, orçamento, lance, palavra-chave ou anúncio.
- **Mudança:** o guia continua sem faixa ou valor numérico da cirurgia, mas passa a explicar, no primeiro bloco e no FAQ, que a pessoa pode conversar pelo WhatsApp sobre uma faixa geral de valores como ponto de partida. O CTA usa a promessa precisa `Conversar sobre uma faixa geral`; a página esclarece que a referência é informativa, não é orçamento, proposta nem garantia, e que o valor final pode ficar fora da faixa conforme avaliação e planejamento individual.
- **Motivo e evidência:** retirar os números reduziu exposição regulatória, mas também pode frustrar quem chega pela intenção explícita de preço. De 23/07 a 21/08, `AG_LIFTING_FACIAL_PRECO` apresentou 93 cliques, 750 impressões, CTR de 12,40%, R$ 147,55 de gasto e zero conversão exibida no Google Ads. No GA4 de 25/07 a 21/08, o grupo teve 39 sessões, 22 segundos de engajamento médio e taxa de eventos principais de 5,13%, contra 107 sessões, 38 segundos e 7,48% no grupo geral. A atribuição do funil permanece insuficiente, portanto esses dados justificam reduzir frustração, não provam causalidade nem autorizam consolidação.
- **Hipótese:** explicitar a disponibilidade de uma referência privada, sem números públicos, reduz a sensação de resposta evasiva e aumenta conversas úteis sem transformar a página em anúncio de preço cirúrgico.
- **Métricas:** cliques nos CTAs `price_range_reference`, `final_price_range_reference` e `sticky_price_range_reference`; contatos identificados e válidos; pedidos pessoais de faixa; aceite da referência; lead qualificado; consulta agendada/realizada; reclamações, confusão entre referência e orçamento e envio fora dos guardrails.
- **Guardrails:** zero número cirúrgico na página e no schema; não prometer faixa individual, orçamento ou preço antes da avaliação; faixa privada somente para procedimentos e contextos aprovados, depois de aceite claro ou novo pedido explícito, uma única vez e com ressalvas; orientação Codame/jurídica contrária suspende a oferta; nenhuma mudança de mídia neste teste.
- **Revisão:** 7, 14 e 28 dias depois de eventual publicação, condicionada a volume suficiente e atribuição validada.
- **Regra para manter:** manter se o contato sobre preço aumentar ou avançar com qualidade, sem faixa pública, expectativa de preço garantido, reclamação ou quebra de contexto.
- **Regra para reverter:** restaurar o CTA anterior de avaliação e retirar a sinalização de faixa se houver interpretação recorrente de preço prometido, aumento de contatos exclusivamente por menor preço, resposta privada indevida ou orientação regulatória contrária.

## 22 de agosto de 2026 — auditoria ao vivo das cinco campanhas sem mudança madura

- **Status:** auditoria concluída; nenhuma alteração de campanha, anúncio, palavra, negativa, recurso, lance, meta, orçamento, site ou WhatsApp foi publicada.
- **Área/campanhas:** `G26BLEF`, `G26CERV`, `G26OTO`, `G26FACE` e `G26MARCA`; `G26LIFT` permaneceu protegida e foi consultada apenas no pós-voo.
- **Evidência:** em 15–21/08, as cinco campanhas somaram 264 cliques e R$ 422,56, ante 278 cliques e R$ 439,85 nos sete dias anteriores. O agregado Google recente tinha 7 contatos identificados, somente 2 com campanha canônica — ambos OTO —, 5 com campanha desconhecida e nenhum classificado. Em 30 dias, somente 2 de 17 contatos tinham campanha canônica. A ação principal `Lead qualificado GCLID` estava em `Requer atenção`, sem conversão posterior a 12/08.
- **Achados retidos como proposta:** duplicidade por capitalização no RSA adulto OTO; revisão futura de logos/imagens e da copy de marca; revisão governada de `"projeto orelhinha"`, atualmente bloqueado em frase por lista compartilhada que também alcança `G26LIFT`. A leitura final de `blefaroplastia preço popular` mostrou 12 cliques e R$ 16,00 em 30 dias. O histórico prova que a lista foi associada a BLEF em 09/08 e o inventário atual contém `"preço popular"`, mas a data de entrada da negativa e a cronologia dos cliques são `N/D`; criar outra negativa exata seria redundante. Nenhum achado passou o gate downstream e de isolamento nesta data.
- **Motivo e hipótese:** preservar a conta evita atribuir efeito a cliques, conversões agregadas ou termos sem qualidade reconciliada. Com 1–2 ciclos limpos, campanha canônica e classificação suficiente, o primeiro teste OTO poderá ser iniciado e medido isoladamente.
- **Métrica:** cobertura de campanha canônica, contatos classificados, válidos e qualificados, consultas, frescor/aceite da conversão principal e divergência entre Google Ads, agregado, LEADS e CRM.
- **Guardrails:** orçamento total R$ 87/dia; nenhuma exclusão etária em OTO/MARCA; preservar `Desconhecida`; uma mudança RSA por vez; negativas no menor nível seguro após downstream, sem editar lista compartilhada que afete LIFT; zero PII; nenhuma alteração de site nesta execução e mudanças preexistentes do worktree preservadas.
- **Rollback:** não aplicável, pois nenhuma mudança foi executada. Propostas futuras devem preservar o inventário anterior e registrar rollback próprio no momento da publicação.
- **Revisão:** saúde técnica em 27/08; primeira leitura completa em 30/08; elegibilidade OTO em 03/09; leitura de 14 dias em 06/09. Janelas editoriais contam somente da publicação real.
- **Regra para avançar:** tracking saudável, divergências explicadas, baseline registrado, downstream atribuível e nenhuma mudança material concorrente. Sem isso, manter a conta intacta.

## 20–21 de agosto de 2026 — auditoria das conversas e qualificação com evidência pessoal

- **Status:** versão `2026-08-20.4` publicada e verificada no commit funcional `dd93f1cebf5c218672d1bf84d6d3b39ca3c9ff74`, deploy Netlify `6a879f71c5efe0ad12609a3d`, saneamento `88cdbd0` e Apps Script v110; **940/940 testes**, build de 178 arquivos e 44 URLs sem erro.
- **Mudança:** prefill, referência de campanha e primeira pergunta de preço isolada permanecem contexto; qualificação e conversão offline exigem evidência pessoal posterior. A origem Meta usa referência canônica exata somente quando o provedor omite `source_id`, sem inferência por frase. Uma rotina humana, limitada por `Opportunity ID` e com pré-voo integral, permite corrigir fases e invalidar eventos derivados sem edição manual fragmentada.
- **Motivo e evidência:** 54 exportações/53 conversas únicas foram reconciliadas. Não havia conversa identificável de aquisição ausente da LEADS, mas quatro oportunidades estavam prematuramente `Qualificado`, uma consulta confirmada ainda não estava em `Consulta agendada`, uma conversa interna aparecia como paciente e duas qualificações falsas estavam na fila local do Google.
- **Resultado:** quatro fases passaram a `Novo`, uma a `Consulta agendada`, a conversa interna foi arquivada e as duas conversões foram marcadas `invalidated_not_qualified` e retiradas de `IMPORT_GOOGLE_ADS`. Como a conexão do Google tinha última atualização em 15/08, os eventos de 18–19/08 não foram importados.
- **Hipótese e métricas:** um sinal mais restrito melhora otimização e leitura do funil; acompanhar avanço real de `Novo`, decisões humanas, qualificados aceitos, consultas e divergências entre LEADS, CRM e Google.
- **Guardrails:** nenhuma frase automática qualifica; nenhuma correção sem estado e fase esperados; nenhuma campanha, orçamento, lance ou configuração da ação foi alterada; dados clínicos e PII não entram no relatório.
- **Revisão e regra:** revisar em 28/08/2026 ou após dez novas decisões humanas. Manter com zero falsa qualificação automática; reverter somente o complemento de origem diante de atribuição incorreta, sem voltar a qualificar por template.

## 20 de agosto de 2026 — comparação de lifting, ação humana útil e oferta elegante de faixa

- **Status:** versão `2026-08-20.2` publicada e verificada no commit funcional `46f7c91ea5cc00c2181fd3f7d564f61a880cdb11`, deploy Netlify `6a8762898c14302d7062b1f9` e Apps Script v107; **923/923 testes**, build de 178 arquivos e 44 URLs sem erro. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Nenhuma mensagem real, campanha ou configuração de anúncios foi alterada. Rollback: deploy `6a8701bb1ae7b60008c3a8ac`, commit `afa230263288bba88fb0cb61f4fb55e5903d4dca` e Apps Script v106.
- **Mudança:** responder diretamente à comparação geral entre minilifting e lifting facial com a diferença de extensão já aprovada; preservar rascunho seguro quando a IA encaminhar uma dúvida não mapeada à equipe e projetá-lo em `Revisões do Bot`, Central e e-mail; substituir a oferta mecânica de faixa no primeiro pedido de preço de lifting facial, cervicoplastia e otoplastia por `Se, depois desse contexto, você quiser uma referência mais concreta, também posso te passar uma faixa geral de valores como ponto de partida.`
- **Motivo e evidência:** uma pergunta contextual simples sobre minilifting e lifting facial foi classificada e registrada, mas terminou em revisão sem resposta nem sugestão útil. A primeira mensagem de preço também podia encerrar sem mostrar, com naturalidade, que existe uma referência geral autorizada no passo seguinte.
- **Hipótese:** responder comparações gerais cobertas por fatos aprovados e oferecer uma faixa de modo progressivo reduz silêncio e abandono sem antecipar indicação, orçamento ou pressão por agenda; quando a resposta automática não for segura, um rascunho interno associado à mensagem reduz o tempo humano de resposta.
- **Métricas:** resolução da pergunta, continuidade depois da primeira resposta de preço, aceite da faixa, tempo até resposta humana, uso do rascunho, lead qualificado, consulta, repetição indevida, sugestão sem base e quebra de guardrail.
- **Guardrails:** a IA continua confirmando contexto e a cópia determinística; nenhuma técnica é indicada individualmente; a faixa numérica só aparece no segundo passo e uma única vez para os procedimentos aprovados; risco alto e conteúdo clínico individual ficam sem rascunho; agenda, urgência, opt-out, takeover, mensagem mais nova e deduplicação permanecem autoritativos.
- **Revisão:** primeiras ocorrências reais e leitura em sete dias.
- **Regra para manter ou reverter:** manter se houver menos silêncio e menor tempo humano sem resposta clínica/comercial indevida; reverter a oferta ou a automação específica diante de faixa prematura, sugestão insegura, competição com humano ou repetição sistemática.

## 20 de agosto de 2026 — cobertura semântica antes da criação da oportunidade

- **Status:** versão `2026-08-20.1` publicada e verificada no commit funcional `afa230263288bba88fb0cb61f4fb55e5903d4dca`, deploy Netlify `6a8701bb1ae7b60008c3a8ac` e Apps Script v106; **912/912 testes**, build de 178 arquivos e 44 URLs sem erro. As mesmas projeções do manual e do Plano Executivo foram substituídas no Drive. Nenhuma mensagem real, campanha ou configuração de anúncios foi alterada. Rollback: deploy `6a864d9a75c1bc0008b26c3b`, commit `204aff23d27ed262f21ed66b448609ad838998b6` e Apps Script v104.
- **Mudança:** todo texto elegível já persistido recebe avaliação semântica de mensagem e histórico mesmo quando a rota está pendente, a ação final é revisão humana ou existe takeover. O contexto durável passa a incorporar falas humanas disponíveis mesmo antes de existir oportunidade. Em modo ativo, somente alta confiança recupera Amanda ou Daniel de forma idempotente; ambiguidade segura recebe uma pergunta; revisão humana recebe rascunho somente quando seguro. Em `shadow`, a rota não é alterada.
- **Motivo e evidência:** uma paciente respondeu à pergunta anterior da clínica com queixas faciais legíveis e contextuais, mas o evento terminou em `route_pending`; como a elegibilidade antiga exigia oportunidade roteada, a IA nunca foi chamada, não houve resposta e a Central criou apenas uma ação manual genérica.
- **Hipótese:** deslocar a interpretação semântica para logo depois da persistência reduz silêncios incorretos e produz respostas ou sugestões mais coerentes sem ampliar autorização automática.
- **Métricas:** percentual de textos elegíveis avaliados, `route_pending` recuperados, esclarecimentos respondidos, tempo até primeira resposta, utilidade das sugestões internas, duplicidade, roteamento profissional incorreto, competição com humano e incidentes clínicos ou comerciais.
- **Guardrails:** exclusões objetivas continuam antes do modelo; avaliação não implica envio; alta confiança e contexto não baixo são exigidos para recuperar rota; mensagens mais novas e intervenção humana cancelam a resposta; agenda, urgência, cuidado ativo, preço não aprovado e opt-out permanecem fechados; `shadow` não envia nem altera agenda; `off` preserva a entrada e bloqueia IA, respostas, agenda e disparos programados.
- **Revisão:** regressões completas antes de qualquer publicação, primeiras entradas reais depois do release e leitura operacional em sete dias.
- **Regra para manter ou reverter:** manter se cair o silêncio incorreto sem roteamento errado ou quebra das travas; reverter diante de recuperação profissional incorreta recorrente, resposta insegura, intrusão em conversa humana ou aumento material de latência/custo sem benefício observável.

## 19 de agosto de 2026 — guia de composição por região na primeira pergunta de preço

- **Status:** versão `2026-08-19.2` publicada e verificada no commit funcional `97da5c3a289062c9face0313418fe1beb7e3accf` e deploy Netlify `6a8599b25b653800085f9f95`; Apps Script v101 preservado, **865/865 testes**, build de 178 arquivos e 44 URLs aprovados. Nenhuma mensagem real, campanha ou configuração do Google Ads foi alterada.
- **Mudança:** manter a primeira resposta sem faixa numérica e acrescentar uma única vez o guia que explica a composição do orçamento conforme o procedimento confirmado: facial para face e pescoço, mama para cirurgias mamárias e corporal para lipoaspiração, abdômen, braços, cirurgia íntima, contorno e combinações corporais. O guia não se repete na conversa; na faixa aprovada de lifting, a página específica de lifting entra somente como fallback quando nenhum guia facial tiver sido compartilhado.
- **Motivo e evidência:** a primeira pergunta de preço precisa ser útil sem parecer evasiva, mas uma página facial em uma conversa sobre corpo ou mama produziria desalinhamento evidente. O site já possui três guias regionais distintos e aprovados, permitindo responder à intenção sem antecipar orçamento individual.
- **Hipótese:** uma explicação regional curta reduz incerteza e melhora a continuidade da conversa sem induzir faixa prematura, diagnóstico ou pressão por agenda.
- **Métricas:** continuidade depois da primeira resposta, nova pergunta de preço, aceite da faixa cervical, lead qualificado e consulta; monitorar link incorreto, repetição, silêncio e avanço prematuro.
- **Guardrails:** no máximo um link; nenhum guia sem procedimento confiável; nunca usar o guia facial para mama, corpo ou cirurgia íntima; nenhuma faixa no primeiro turno; valores de outros procedimentos permanecem humanos; urgência, agenda, cuidado ativo e tomada humana continuam protegidos.
- **Revisão:** sete dias após eventual publicação, ou antes diante de link incorreto, repetição ou resposta fora de contexto.
- **Regra para manter ou reverter:** manter com zero roteamento regional incorreto e continuidade sem aumento de reclamação ou repetição; reverter para a resposta anterior diante de qualquer envio sistemático do guia errado, faixa prematura ou quebra das travas.

## 19 de agosto de 2026 — cervicoplastia como ponte para lifting cervical

- **Status:** publicada e verificada em 19/08/2026 no site e na Bruna; nenhuma configuração do Google Ads foi alterada.
- **Mudança:** apresentar `cervicoplastia (lifting cervical)` na entrada da página cervical, nos metadados, no FAQ, no prefill identificado e na primeira resposta da Bruna, preservando a URL canônica `/lifting-cervical/` e o planejamento individual.
- **Motivo e evidência:** pacientes usam espontaneamente `cervicoplastia` com mais facilidade. A auditoria registrada da conta já encontrou `"cervicoplastia"` e `[cervicoplastia]` no grupo `AG_CERVICOPLASTIA`; adicionar novas palavras-chave agora duplicaria intenção sem evidência incremental.
- **Hipótese:** a mesma linguagem em busca, página e conversa reduz dúvida terminológica e melhora continuidade sem prometer indicação.
- **Métricas:** contatos cervicais válidos, continuidade após a primeira resposta, qualificados, consultas, termos de pesquisa e CTR; monitorar confusão com lipo de papada.
- **Guardrails:** nenhuma mudança de orçamento, lance, campanha, grupo ou palavra-chave; cervicoplastia e lifting cervical identificam o contexto, não uma técnica ou indicação individual.
- **Revisão:** 7 e 14 dias após publicação, quando houver volume suficiente; verificar o RSA vivo antes de qualquer teste de texto no Google Ads.
- **Regra para manter ou reverter:** manter se compreensão e continuidade melhorarem sem perda de qualidade; reverter a ênfase se houver aumento consistente de tráfego não aderente, confusão clínica ou piora material da qualificação.

## 19 de agosto de 2026 — prefill neutro e intenção pessoal antes de agenda ou qualificação

- **Status:** publicada e verificada em 19/08/2026 no commit funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`, deploy Netlify `6a858294fc30270008e0964a` e Apps Script v101, com 851/851 testes, build estático de 178 arquivos e 44/44 URLs aprovadas; nenhuma mensagem retroativa foi enviada e nenhuma configuração do Google Ads foi alterada.
- **Mudança:** substituir o prefill por uma abertura neutra, identificá-lo somente por `template_id=procedure_evaluation_v1`, responder perguntando o que a pessoa deseja entender primeiro e exigir uma manifestação pessoal posterior para qualificação, conversão offline ou agenda. Perfis de empresa ou marca não recebem nome na saudação. Otoplastia permanece coberta por regressão futura, sem resposta ao contato já atendido manualmente.
- **Motivo e evidência:** três conversas reais mostraram um silêncio indevido em otoplastia e saltos mecânicos para agenda em lipo de papada e lifting, porque textos automáticos continham expressões de disponibilidade. Outro caso mostrou personalização inadequada com nome de marca.
- **Hipótese:** separar tecnicamente contexto automático de intenção pessoal melhora naturalidade e reduz falsos sinais de prontidão sem perder respostas elegíveis.
- **Métricas:** resposta ao primeiro contato elegível, continuidade após a abertura, qualificação com evidência pessoal, entrada válida em agenda, conversão offline válida, silêncios, saltos prematuros e uso indevido de nome comercial.
- **Guardrails:** prefill isolado permanece `Novo`; nenhum horário, preferência, conversão ou qualificação nasce do template; agenda depende de pedido pessoal, aceite ou preferência; nenhum envio real em testes.
- **Revisão:** conferir regressões antes do release e acompanhar os próximos contatos reais após eventual publicação.
- **Regra para manter ou reverter:** manter com zero avanço indevido e resposta consistente nos três cenários; reverter diante de bloqueio recorrente de intenção pessoal clara, perda de resposta elegível ou regressão de atribuição.

## 18 de agosto de 2026 — IA como primeira instância de compreensão no WhatsApp

- **Status:** versão `2026-08-18.3` publicada e verificada em produção no commit funcional `c392a743b2f00d751bf6dca8da54b991db0439ff`, deploy Netlify `6a84dea1cf780e00086eed7e`; **814/814 testes**, build local de 178 arquivos e 12 funções publicadas sem erros. A projeção ativa do Drive foi substituída no mesmo ID e conferida byte a byte pelo SHA-256 `ca67a341f86e59190f9be8fe31501f1be6b5615e01154a0ae585d13358cc8db0`. Nenhuma mensagem real de paciente foi enviada. Rollback: commit `c789914991f409c81320090872ac50f4ebc86136`, deploy `6a84534923558b0008961936`.
- **Mudança:** toda mensagem textual elegível passa primeiro pela interpretação contextual da IA. Detectores mecânicos fornecem pistas e limites; não decidem sozinhos que uma pergunta não existe. Cópias aprovadas de agenda, preço e fatos institucionais só são usadas quando a IA confirma código, procedimento, profissional e cobertura integral dos pedidos seguros. Dúvida linguística segura recebe uma pergunta curta e específica, com contrato próprio de uma pergunta, nenhum link e nenhum CTA; dúvida clínica ou protegida continua em revisão humana. Depois de fala da equipe, somente reabertura, esclarecimento, coordenação ou cópia institucional explicitamente confirmados atravessam o bloqueio final.
- **Evidência:** uma pergunta coloquial sobre realização de cervicoplastia foi corretamente roteada como `known_procedure`, porém o controlador mecânico concluiu que não havia solicitação pendente por falta de interrogação e não chamou a IA. O caso foi convertido em regressão sintética sem dados identificáveis.
- **Hipótese:** usar compreensão semântica antes do padrão reduz silêncios indevidos e melhora continuidade da conversa, enquanto guardrails determinísticos preservam segurança, idempotência, opt-out, agenda e takeover humano.
- **Métricas:** taxa de resposta entre mensagens elegíveis, resolução no primeiro turno, adequação contextual, taxa e utilidade de esclarecimentos, duplicidade, resposta fora de contexto, competição com humano, confirmação indevida de agenda e incidentes clínicos ou comerciais.
- **Revisão:** acompanhar as próximas entradas reais após a publicação e revisar semanalmente os cenários sintéticos, sem declarar ganho por uma única conversa.
- **Regra para manter ou reverter:** manter se cair o silêncio incorreto sem aumento dos guardrails; reverter ao commit `c789914991f409c81320090872ac50f4ebc86136` e deploy `6a84534923558b0008961936` diante de resposta insegura, intrusão recorrente em conversa humana, esclarecimentos desnecessários em série ou degradação material de latência. Falha da IA continua fail-closed e não libera resposta mecânica por conta própria.

## 18 de agosto de 2026 — contrato contextual e proteção sem atrito no WhatsApp

- **Status:** versão `2026-08-18.2` publicada e verificada em produção no commit funcional `c789914`, deploy Netlify `6a84534923558b0008961936`; **792/792 testes**, build de 178 arquivos, 12 funções, 5 agendamentos e endpoint canônico HTTP 200. A projeção do Drive foi substituída no mesmo ID e conferida byte a byte. Nenhuma mensagem real de paciente foi enviada na validação. Rollback: commit `cdfa79e`, deploy `6a843bde9799d000087778a5`.
- **Mudança:** cada turno passa a ter contrato de resposta com responsável, silêncio e limites; preço conhecido, consulta, canal oficial, convênio e foto não recebem pergunta ou CTA obrigatório. Mensagens genéricas de espera deixam de ser sugestão copiável, e o validador final bloqueia confirmação indevida de agenda, diagnóstico remoto, promessa, valor ou condição não aprovada e excesso de menus, perguntas ou links.
- **Evidência:** amostra desidentificada de 20 exportações recentes e 484 turnos da pasta restrita do Drive mostrou perguntas antes da resposta, blocos extensos, interpretação quase clínica, links e CTA acumulados, retomadas após pausa e confirmações fora de contexto. As respostas existentes foram tratadas como material crítico, não como padrão de qualidade.
- **Hipótese:** respostas diretas e mais rápidas, somadas a silêncio correto e handoff específico, aumentam resolução e conversão qualificada sem elevar inconveniência, risco clínico ou competição com a equipe humana.
- **Métricas:** tempo até primeira resposta elegível, resolução no primeiro turno, continuidade qualificada, preferência de agenda capturada, consulta confirmada e comparecimento; guardrails de mensagem fora de contexto, repetição, pressão, diagnóstico, promessa, takeover atravessado e confirmação não verificada.
- **Revisão:** observar as próximas entradas reais e revisar semanalmente os cenários sintéticos; nenhuma conclusão de ganho antes de amostra suficiente e rastreável.
- **Regra para manter ou reverter:** manter se clareza e avanço qualificado melhorarem sem incidente de segurança; reverter o release diante de mensagem fora de contexto, duplicidade, atraso material novo, bloqueio de resposta legítima recorrente ou qualquer quebra de takeover. O modelo permanece `gpt-5.6-terra` em `medium`; comparação de modelo e jornada tardia ficam para fase posterior.

## 16 de agosto de 2026 — piloto Aqui Ads agendado para setembro

- **Status:** `Planejada`; decisão e pré-voo em 16/09/2026; nenhuma compra ou veiculação autorizada.
- **Responsável:** Codex pelo pré-voo e Daniel pela decisão de investimento/ativação.
- **Área/canal:** OOH hiperlocal pela plataforma Aqui Ads, complementar a Google, Meta, orgânico e Perfil da Empresa.
- **Mudança:** preparar teste de quatro semanas com dois edifícios residenciais premium e um salão/spa premium, priorizando Jardim Europa, Itaim Bibi, Vila Nova Conceição, Alto de Pinheiros e Pinheiros. Edifícios comerciais da Faria Lima ficam para uma segunda etapa.
- **Motivo e evidência:** o público pretendido para Amanda combina poder aquisitivo e idade 40+. Simulações consultadas em 16/08 indicaram possibilidade de compra hiperlocal; o envelope inicial estimado foi de R$ 1.206,20 antes da produção. Os números de exposição da plataforma ainda precisam de metodologia documentada e não serão tratados como pacientes ou retorno.
- **Hipótese:** repetição em ambientes premium próximos à clínica aumenta familiaridade e confiança e contribui para contatos qualificados e consultas, inclusive por busca de marca, acesso direto ou indicação tardia.
- **Métrica principal:** contatos válidos, qualificados e consultas agendadas atribuídos ao piloto; como apoio, QR/landing/WhatsApp exclusivos, `Como conheceu?`, busca de marca, direto e Perfil da Empresa.
- **Guardrails:** verba incremental sem retirada de Google/Meta; inventário, preço e audiência revalidados; criativo institucional aprovado, sem preço/promoção/garantia/vergonha/antes-depois; tracking canônico; cobertura esperada ≥80%; capacidade confirmada; nenhuma mudança material concorrente.
- **Data de revisão:** 16/09/2026 para decisão; se ativado, D+7, D+14, D+28 e D+35 contados da veiculação real.
- **Regra para manter/escala:** somente com cobertura ≥80%, sinal de negócio, custo aceitável e nova autorização. Menos de 80% é inconclusivo. Não renovar com zero qualificado atribuído, tracking saudável e ausência de sinal coerente de marca.
- **Plano executivo:** `docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md`.

## 16 de agosto de 2026 — revisão: experimento cervical Site versus WhatsApp

- **Status:** `Em observação`; publicação técnica, sonda e três campanhas concluídas seletivamente em 17/08/2026; início programado às 12h e término em 01/09/2026 às 12h.
- **Decisão de escopo:** manter `M26F01W` somente com `C06H01` e destino WhatsApp, não renovar `M26F02S`, interromper `M26O01W` e restringir ao lifting cervical a comparação Site versus WhatsApp.
- **Experimento:** `M26C01W/C07H01` — WhatsApp direto — versus `M26C02S/C07H01` — `/lifting-cervical/` → WhatsApp — em campanhas de Tráfego separadas, com o mesmo texto, público rígido 40–65+, São Paulo +20 km, posicionamentos Advantage+, R$ 300 total por braço e janela de 17/08/2026 às 12h a 01/09/2026 às 12h. O Feed usa o arquivo 1:1 e Reels/Stories usam o arquivo 9:16 enviado por Daniel, sem recorte automático.
- **Objetivo:** decidir qual rota operacional gera mais contatos válidos, qualificados e consultas de lifting cervical com orçamento equivalente. `M26F01W/C06H01` corre em paralelo como campanha contínua de lifting facial e não integra a comparação. LPV e conversa continuam proxies; como a otimização de entrega difere entre as rotas, não atribuir causalidade pura ao destino.
- **Gate P0:** não publicar nenhum braço sem sonda sintética que prove Meta → site → navegação → CTA → WhatsApp → webhook → LEADS → CRM para `M26C02S`, com campanha, criativo, landing, página do CTA, caminho, confiança e first touch corretos, zero PII e zero duplicidade.
- **Criativo:** as versões finais 1080×1080 e 1080×1920 corrigem `cervecoplastia` para `cervicoplastia`. Daniel decidiu manter e aceitou o CTA falado/embutido `Clique no link da bio`. O mesmo material será usado nos dois braços, com a proporção própria de cada posicionamento. O Reels orgânico ficou agendado para 20/08/2026 às 19h30, com leitura separada; o post não será reutilizado nos anúncios.
- **Objetos preparados:** braço direto — campanha `120251248762160627`, conjunto `120251248762180627`, anúncio `120251248762170627`; braço Site — campanha `120251249058750627`, conjunto `120251249058780627`, anúncio `120251249058760627`. Os anúncios herdados `120251248762190627` e `120251249058770627` ficaram desligados. Nenhum objeto foi publicado nesta preparação.
- **Atribuição:** os três IDs principais foram publicados no mapa canônico do webhook. Netlify publicou `2b5af19` e depois `436aff0`; Apps Script v97 habilitou o schema v1; `synthetic-integration-health` concluiu com HTTP 200 e `runId=synthetic_attribution_v2_20260817` antes do gasto.
- **Publicação Meta em 17/08:** `M26F01W` (`120251254720690627`), `M26C01W` (`120251248762160627`) e `M26C02S` (`120251249058750627`) foram publicados separadamente; em cada confirmação a Meta registrou uma campanha, um conjunto e um anúncio. Os anúncios herdados `120251254720710627`, `120251248762190627` e `120251249058770627` permaneceram desligados. Orçamento total autorizado: R$ 900; idade 40–65+, São Paulo +20 km; janela 17/08 12h–01/09 12h.
- **Métrica/regra:** sonda com 100% dos campos; cobertura ao vivo ≥80%; pausar um braço após ≥R$ 150 sem contato válido se o tracking estiver saudável; não escalar antes de cinco qualificados, uma consulta agendada e CPQL ≤R$ 75 na rota candidata. Sem amostra suficiente em D+15, registrar `N/D`.
- **Revisão:** D+3 em 20/08, D+7 em 24/08, D+15 em 01/09 e D+22 em 08/09, contados do início programado em 17/08 às 12h.
- **Plano:** `campanhas/PLANO-META-15-DIAS-2026-08-16.md`.

## 16 de agosto de 2026 — fechamento do ciclo Meta e proposta LIFT/CERV por 15 dias

- **Status:** análise concluída; plano local registrado; nenhuma campanha foi pausada, criada, renovada ou publicada por esta entrada.
- **Responsável:** Codex, com decisão de veiculação pendente de Daniel.
- **Área/conta:** Meta Ads `1643959806249995`, campanhas `M26F01W`, `M26F02S`, `M26O01W` e piloto reservado `M26C01W`.
- **Mudança proposta:** encerrar `M26F02S` sem renovação; continuar `M26F01W` somente com `C06H01`; interromper o saldo de `M26O01W`; iniciar `M26C01W/C07H01` como piloto separado de lifting cervical, WhatsApp direto, público rígido 40–65+, R$ 20/dia e 15 dias completos. O controle LIFT também usaria R$ 20/dia.
- **Motivo e evidência:** no período completo 17/07–15/08, `M26F01W` gastou R$ 598,45, gerou 86 conversas na Meta e foi ligado a 67 contatos, 12 qualificados ou posteriores e 2 agendados ou posteriores. `C06H01` gerou 85 conversas a R$ 6,65; `C01H01` gerou 1 a R$ 32,76. `M26F02S` gerou 2.020 LPVs a R$ 0,29, mas zero contatos pelo código exato. `M26O01W` tinha R$ 214,05 gastos, CTR link de 0,30%, uma conversa, um contato recente ainda novo e nenhuma consulta registrada; seu anúncio foi criado no Instagram e o contato chegou por Meta Ad ID sem código canônico.
- **Interpretação:** o vídeo de avaliação é eficiente para tráfego, mas não provou conversão pelo site; o vídeo de lifting é o controle mais promissor para conversa. Na otoplastia, a frequência de 1,38 torna fadiga improvável e sugere baixa aderência do conjunto criativo–promessa–público, sem isolar o vídeo como causa única.
- **Hipótese:** concentrar o controle no vídeo de lifting e testar cervical em campanha própria, mesma rota e orçamento estável permitirá comparar qualidade do funil sem repetir a falha de atribuição do site.
- **Métrica principal:** contato identificado, válido, qualificado e consulta agendada/realizada por campanha; custo por qualificado e por agendamento; cobertura conversa → contato. CTR, CPC, LPV e conversa permanecem diagnósticos.
- **Guardrails:** nenhum início sem WhatsApp Business aceito, `age_min=40`, código canônico, rotina/aggregate preparados e sonda sintética; não usar Site ou 25+ como atalho; não mudar outras variáveis durante a janela; cobertura mínima de 80%; pausar CERV após R$ 120 sem contato válido.
- **Revisão:** três, sete e quinze dias completos depois da ativação real, mais sete dias de latência para desfechos. Datas condicionais: 20/08, 24/08, 01/09 e 08/09 se o lançamento ocorrer em 16/08.
- **Regra para manter:** custo por qualificado até 1,5 vez o controle com qualidade compatível; manter sem escalar. Escala só pode ser reconsiderada com pelo menos cinco qualificados e uma consulta agendada no piloto, custo por qualificado até R$ 75 e nenhuma quebra operacional.
- **Regra para reverter:** idade efetiva abaixo de 40, código ausente, rota incorreta, duplicidade, perda de atendimento, cobertura abaixo de 80% ou gasto mínimo definido sem contato válido.
- **Plano detalhado:** `campanhas/PLANO-META-15-DIAS-2026-08-16.md`.

## 15 de agosto de 2026 — rotina automatizada de revisão e sugestões da Meta Ads

- **Status:** código e contrato locais validados; publicação, credencial de leitura e execução ao vivo ainda serão registradas neste item.
- **Responsável:** Codex, sob autorização explícita de Daniel para implementar e publicar a rotina.
- **Área/conta:** Meta Ads `1643959806249995`, Apps Script/LEADS e arquivo agregado anônimo já existente.
- **Mudança:** criação de rotina somente leitura com agregado Meta separado no mesmo arquivo de mídia. O agregado será atualizado aproximadamente às 08:25; a revisão rodará aproximadamente às 10:05. Dias comuns enviam somente alertas críticos; terça-feira envia sete dias, comparação anterior e 30 dias; o segundo dia útil acrescenta 90 dias. A rotina cobre mídia, criativo/vídeo, demografia, posicionamento, destino e funil e nunca aplica sugestão.
- **Motivo e evidência:** as campanhas Meta precisam ser reavaliadas como as do Google, mas LPV, conversa e CTR não demonstram contato válido ou consulta. A auditoria anterior mostrou boa entrega de tráfego em `M26F02S` sem atribuição comprovada e `M26F01W` como rota curta rastreável, porém não conciliada pessoa a pessoa.
- **Hipótese:** combinar Marketing API com contagens anônimas por caminho reduzirá decisões por proxy, detectará fadiga e falhas técnicas mais cedo e preparará testes menores sem expor a LEADS à Meta.
- **Métrica principal:** contato identificado, válido, qualificado, consulta e fechamento por `M26F01W`/`M26F02S`; secundárias: gasto, frequência, CTR link, LPV/clique, conversa, vídeo e entrega por segmento.
- **Guardrails:** `ads_read`; zero mutação automática; zero PII/ID de paciente no agregado ou e-mail; Meta facial 40+; `M26F01W` como controle; `M26F02S` sem verba nova até prova E2E; código conflitante permanece N/D; CAPI e coleta adicional fora do escopo.
- **Revisão:** conferir os três primeiros relatórios completos; primeira revisão estrutural em 15/09/2026 ou antes se houver alerta P0.
- **Regra para manter:** manter se fontes distinguirem `OK`/`N/D`, alertas forem acionáveis e nenhuma recomendação ou dado sensível for enviado/aplicado indevidamente.
- **Regra para reverter:** desabilitar a flag e remover o trigger diante de conta incorreta, falha de privacidade, falso zero recorrente, excesso de e-mail ou qualquer mutação; corrigir localmente antes de reativar.

## 15 de agosto de 2026 — ampliação da rotina de revisão do Google Ads

- **Responsável:** Codex, sob autorização explícita de Daniel para implementar, publicar e programar a ampliação.
- **Área/conta:** Google Ads `995-334-4486`, Apps Script/LEADS e arquivo agregado anônimo.
- **Mudança:** a rotina passa a validar saúde das fontes, metas de conversão, inventário completo de negativas, Quality Score, RSAs/recursos, segmentações, destinos, mudanças e funil. Alertas de gasto usam o mesmo dia da semana; falha de consulta vira `N/D`; repetição idêntica entra em cooldown de 48 horas. Foi criado o arquivo hoje renomeado para `LIV — Agregados de mídia paga — sem PII`, cuja aba `Agregados` é atualizada pela LEADS aproximadamente às 08:15 e lida pelo script do Ads entre 09:00 e 10:00.
- **Motivo e evidência:** a rotina inicial protegia termos leigos, mas ainda podia confundir consulta indisponível com zero e não conseguia calcular custo por etapa sem acessar dados de pacientes. Compartilhar a LEADS com a conta de Ads ampliaria exposição desnecessária; o agregado separado preserva somente contagens e campanha canônica.
- **Hipótese:** uma rotina orientada ao funil e com gates de fonte reduzirá falsos alarmes, evitará decisões por proxy e preparará alterações menores, isoladas e reversíveis.
- **Métrica principal:** cobertura de campanha canônica, contato válido classificado, lead qualificado, consulta agendada/realizada e marco de fechamento; secundárias: gasto, termos, Quality Score, política e parcela de impressões.
- **Guardrails:** nenhuma mutação automática; nenhuma PII ou ID técnico no agregado/e-mail; alias legado permanece N/D; faixa etária `UNKNOWN` é preservada; orçamento total de R$ 87/dia continua referência; fonte com erro ou mais de 36 horas não produz zero.
- **Revisão:** primeiro relatório semanal ampliado em 17/08/2026; gate de 20/08/2026; primeira janela operacional em 27/08/2026; três primeiros relatórios serão conferidos para falsos positivos.
- **Regra para manter/reverter:** manter se as fontes aparecerem corretamente como `OK`/`N/D`, sem PII e com sugestões acionáveis; pausar a programação ou voltar à versão anterior se houver exposição, falso zero, excesso de e-mail ou consulta instável.
- **Resultado de publicação:** Apps Script versão `92` publicado no deployment canônico; agregado schema v1 gerado às 21:23 BRT; trigger diário criado; Google Ads Script `12117745` salvo, programado diariamente entre 09:00 e 10:00 e executado com sucesso às 21:35, sem alterações. O primeiro agregado mostrou 16 contatos Google em 30 dias e todos permaneceram em campanha desconhecida por referências legadas/ambíguas; não houve inferência retroativa. Como era sábado e não havia alerta crítico, nenhum e-mail foi enviado nessa execução; o primeiro relatório semanal ampliado fica para 17/08.

## 15 de agosto de 2026 — rotina automatizada de revisão e sugestões do Google Ads

- **Status:** ativo na conta, somente leitura, com programação diária verificada.
- **Responsável:** Codex, sob solicitação de Daniel.
- **Área/conta:** Google Ads `995-334-4486 — Dra Amanda Schroeder`.
- **Mudança:** criação de uma rotina somente leitura com execução diária entre 09:00 e 10:00. Ela envia apenas alertas críticos nos dias comuns, um relatório completo toda segunda-feira e uma leitura ampliada de 90 dias no primeiro dia útil do mês. O relatório cobre campanhas, termos, positivas, negativas diretas, ações de conversão, políticas, mudanças recentes, parcela de impressões e sugestões priorizadas. Nenhuma recomendação é aplicada automaticamente.
- **Motivo e evidência:** termos e palavras precisam de observação recorrente, mas o orçamento de R$ 87/dia e o baixo volume de conversões qualificadas tornam decisões diárias ruidosas. A documentação oficial do Google recomenda relatório semanal na segunda-feira com a semana anterior e reconhece atraso de até aproximadamente três horas nas estatísticas; por isso o horário escolhido é depois das 09:00 e a rotina diária serve apenas à saúde.
- **Hipótese:** uma revisão semanal consistente reduzirá desperdício e atraso de diagnóstico sem excluir linguagem legítima nem contaminar experimentos com ajustes reativos.
- **Métrica principal:** sugestões revisadas por semana; negativas aprovadas/rejeitadas; termos novos convertidos em positivas; custo evitado por irrelevância confirmada; contatos válidos, qualificados e consultas após as mudanças humanas.
- **Guardrails:** zero mutação automática; negativas inicialmente exatas e no menor nível; preservar linguagem leiga e preço legítimo; não pausar por zero de conversão com mensuração insuficiente; não decidir por CTR/CPC isolados; não misturar mudanças materiais; listas compartilhadas e funil permanecem sujeitos a reconciliação humana.
- **Data de revisão:** conferir os três primeiros relatórios completos; primeira revisão estrutural em 1º de setembro de 2026.
- **Regra para manter:** manter se o relatório chegar no prazo, não gerar falso positivo recorrente e ajudar decisões rastreáveis sem alterar a conta.
- **Regra para reverter:** pausar a programação diante de e-mail indevido, consulta de conta errada, sugestão sistematicamente perigosa, falha de privacidade ou qualquer mutação; corrigir localmente antes de reativar.
- **Resultado atual:** código versionado e publicado na conta como script `12117745 — LIV — Revisão Google Ads — somente leitura`; autorização concluída; visualização de 15/08/2026 às 20:45 BRT finalizada em 10 segundos, sem mudanças na conta; registro confirmou envio do relatório para `daniel.added@gmail.com`; programação diária `09:00–10:00` visível e ativa. A primeira revisão semanal automática ocorrerá em 17/08/2026.

## 15 de agosto de 2026 — manutenção de Meta facial em 40+ e programação da decisão etária no Google

- **Status:** decisão Meta vigente; nenhuma campanha alterada neste registro; avaliação Google programada.
- **Responsável:** Daniel, com registro e programação pelo Codex.
- **Área/campanhas:** Meta facial `M26F01W` e `M26F02S`; Google `S_BR_SP_LIFTING_FACIAL`, `S_BR_SP_BLEFAROPLASTIA`, `S_BR_SP_LIFTING_CERVICAL` e `S_BR_SP_CIRURGIA_FACIAL`.
- **Mudança:** manter a referência operacional de 40+ nas campanhas faciais do Meta. Não alterar idade no Google agora; incluir no gate de 20/08 a decisão sobre excluir apenas `18–24` e `25–34` nas quatro campanhas faciais não otoplastia, sempre preservando `Desconhecida`. Otoplastia, marca e futura rinoplastia ficam fora desse escopo.
- **Motivo e evidência:** segundo a operação, pacientes das cirurgias faciais, exceto otoplastia e rinoplastia, têm pelo menos 35 anos. Na conta Google, entre 16/07 e 14/08, 18–34 acumulou 65 cliques, R$ 92,77 e cerca de 4,7% do gasto das quatro frentes; as duas conversões exibidas misturam proxy de WhatsApp e qualificação, e consulta/procedimento por idade continuam N/D. No Meta, a configuração facial visível usa referência 40+, mas o efeito real do Advantage+ abaixo desse piso ainda deve ser conferido.
- **Hipótese:** manter Meta em 40+ preserva a estratégia já adotada; no Google, excluir somente as duas faixas conhecidas abaixo de 35 pode reduzir gasto improvável sem bloquear 35–39 nem idade desconhecida.
- **Métrica principal:** contatos válidos, leads qualificados, consultas agendadas/realizadas e gasto por faixa etária; distribuição efetiva de idade no Meta.
- **Guardrails:** nenhuma exclusão de `Desconhecida`; nenhuma mudança em otoplastia, marca ou rinoplastia; nenhuma mudança etária junto com orçamento, lance, palavras, anúncios ou página; confirmar comportamento efetivo do Advantage+; N/D não vira zero.
- **Data de revisão:** decisão Google em 20/08/2026; se aplicada, checagem em 27/08/2026 e leitura após 14 dias completos.
- **Regra para manter:** manter Meta 40+ enquanto houver coerência operacional e ausência de perda comprovada; manter eventual exclusão Google se reduzir gasto abaixo de 35 sem perda material de contatos válidos/consultas em 35+.
- **Regra para reverter:** restaurar as faixas Google se houver queda material de volume/qualidade, classificação inconsistente ou rastreamento insuficiente; revisar o piso Meta se a entrega real não respeitar a intenção ou surgir evidência de demanda qualificada abaixo de 40.
- **Resultado atual:** cronograma e lembretes atualizados; nenhuma configuração de mídia alterada.

## 15 de agosto de 2026 — aceitação do risco residual do JID

- **Status:** risco formalmente aceito; feature e schema permanecem desligados.
- **Responsável:** Daniel, com registro técnico pelo Codex.
- **Área:** atribuição Meta/Google por passagem no site e transporte site → WhatsApp.
- **Mudança:** deixa de ser obrigatório criar um transportador oculto antes de propor a ativação da jornada rica. A operação aceita que a linha técnica `JID: J1_<token opaco>` seja visível e editável na mensagem pré-preenchida e que possa ser encaminhada antes do primeiro resgate.
- **Motivo e evidência:** o claim C1 impede que outro evento assuma o token depois do primeiro resgate, o webhook remove o JID antes do bot, Apps Script, Sheets, CRM, logs e modelos, e o token não contém PII nem código de campanha. O risco residual não eliminado é temporal: edição/remoção causa perda de resolução e encaminhamento pré-claim pode associar a jornada ao primeiro destinatário que a enviar.
- **Hipótese:** aceitar esse risco controlado permite testar a atribuição rica sem acrescentar outra arquitetura de transporte, preservando atendimento legado e rollback imediato.
- **Métrica principal:** percentual de JID resolvido, fallback por JID ausente/alterado/expirado, divergência LEADS–CRM, duplicidade e qualquer atribuição incorreta comprovada.
- **Guardrails:** `attributionJourneyEnabled=false` e schema off até autorização própria; zero PII ou JID persistido; first touch imutável; nenhum aumento Meta; teste em janela isolada; atendimento nunca depende da resolução.
- **Data de revisão:** 24 horas, 7 dias e 14 dias após eventual ativação.
- **Regra para manter:** manter somente se não houver atribuição incorreta, persistência indevida, duplicidade, overwrite ou regressão do atendimento e se fallback permanecer explicitamente mensurável.
- **Regra para reverter:** desligar imediatamente a feature e usar o caminho legado diante de encaminhamento atribuído à pessoa errada, JID fora do resolvedor, first touch alterado, duplicidade ou perda operacional. A aceitação do risco não impede esse rollback.
- **Resultado atual:** gate de aceitação do risco concluído; ativação, schema, migração, privacidade, purge observado e sonda E2E continuam pendentes e exigem autorizações próprias.

## 15 de agosto de 2026 — retirada das faixas cirúrgicas públicas e preservação da intenção de preço

- **Status:** site, bot, backend e Apps Script publicados em 15/08/2026; Google Ads permaneceu sem alteração ao vivo até o fechamento técnico.
- **Responsável:** Codex, sob solicitação de Daniel para reduzir o risco da divulgação pública de faixas e preservar uma resposta útil para quem pesquisa preço.
- **Área/campanha:** páginas públicas de lifting e custos, atendimento privado no WhatsApp e campanha `S_BR_SP_LIFTING_FACIAL`.
- **Mudança:** as faixas numéricas de minilifting e lifting foram retiradas da página específica de custos, do FAQ e schema da página principal de lifting, do guia geral de custos faciais e dos cards públicos relacionados. O guia específico permanece ativo para explicar equipe médica, hospital, anestesia, materiais, exames, eventual pernoite, acompanhamento, extensão e necessidades clínicas. No WhatsApp, a primeira pergunta sobre preço recebe composição e orçamento individual; somente diante de pedido explícito reiterado pode ser enviada uma faixa aprovada, no mesmo texto que informa ser estimativa geral, não orçamento, proposta ou garantia, que o valor final pode ficar fora da faixa e que depende da avaliação, com link para o guia. A faixa não é repetida automaticamente na mesma conversa e outros procedimentos seguem para revisão humana.
- **Decisão de mídia:** manter `AG_LIFTING_FACIAL` e `AG_LIFTING_FACIAL_PRECO` separados. O grupo geral atende técnica, indicação e recuperação; o grupo de preço atende `preço`, `valor` e `quanto custa` com página própria, mesmo sem números públicos. Permanecem as negativas exatas `[lifting facial preço]` e `[mini lifting facial preço]` no grupo geral. Ficam planejadas, mas não aplicadas sem autorização específica, `[preço mini lifting facial]`, `[quanto custa lifting facial]` e `[valor lifting facial]`, também somente no grupo geral. Não negativar raízes genéricas de preço em campanha ou lista compartilhada.
- **Motivo e evidência:** a orientação comentada do CFM para procedimentos individualizados reforça a necessidade de avaliação anterior à definição do orçamento (`https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-4`); a retirada é uma escolha conservadora de redução de risco e não uma conclusão jurídica definitiva. No Google Ads, o grupo de preço tinha somente cerca de cinco dias de histórico, 39 cliques, 315 impressões, CTR de 12,38%, gasto de R$ 50,67 e nenhum evento de conversão visível. O grupo geral tinha 450 cliques, R$ 627,27 e 17 conversões misturadas — 16 proxies de clique no WhatsApp e apenas um lead qualificado GCLID. Consultas e procedimentos por grupo eram N/D.
- **Hipótese:** explicar publicamente os componentes preserva a utilidade para buscas de preço com menor exposição regulatória; responder a faixa apenas de forma privada, condicionada e contextualizada reduz abandono sem tratá-la como orçamento individual.
- **Métrica principal:** contatos válidos, leads qualificados, consultas agendadas e realizadas por grupo e página; taxa de avanço do grupo de preço; incidentes de resposta automática inadequada; zero faixa cirúrgica numérica nas páginas públicas.
- **Guardrails:** não afirmar que a solução garante conformidade; não publicar faixa cirúrgica; não divulgar faixa na primeira pergunta; não tratar estimativa como orçamento, proposta ou garantia; explicitar que o valor final pode ficar fora da faixa; não repetir automaticamente; manter outros procedimentos em revisão humana; não alterar Google Ads sem autorização específica.
- **Data de revisão:** leitura preliminar após 28 dias completos da publicação; decisão de manter, pausar ou testar consolidação somente com rastreamento até o funil validado e, preferencialmente, pelo menos 100 cliques no grupo de preço. Revisão Codame/jurídica quando disponível.
- **Regra para manter:** manter as duas intenções separadas se o grupo de preço gerar contatos válidos, qualificados ou consultas com custo aceitável e o atendimento permanecer seguro; manter a política privada se não houver faixa pública nem respostas fora dos guardrails.
- **Regra para reverter:** interromper a resposta automática com faixa diante de mensagem ambígua, erro de contexto, repetição, reclamação ou orientação jurídica contrária; testar consolidação somente depois da amostra e da mensuração mínimas, removendo antes as cinco negativas exatas de roteamento. Não restaurar números públicos sem nova decisão formal e autorização específica.
- **Resultado:** publicado no commit candidato `50d7ea1`, deploy Netlify `6a80bef31b7d69000853db97` e Apps Script versão 91, preservando o deployment canônico. A página pública ficou sem faixas cirúrgicas; o bot mantém a resposta privada condicionada; a jornada rica e o schema novo permaneceram desligados. Nenhuma mudança foi executada no Google Ads até este registro.

## 15 de agosto de 2026 — execução autorizada da auditoria de Google Ads de 14/08

- **Status:** correções imediatas publicadas; importação offline em contenção; experimentos editoriais programados de forma sequencial.
- **Responsável:** Codex, sob autorização de Daniel para executar todas as etapas da primeira auditoria de Google Ads.
- **Área/campanhas:** conta Google Ads 995-334-4486, Apps Script de LEADS, Data Manager, planilha e documentação canônica.
- **Mudança:** a conexão diária `LEADS` foi pausada; IDs de transação passaram a usar HMAC-SHA256 opaco `LIV-QL-v1`; cinco eventos legados foram quarentenados e 102 IDs visíveis legados foram removidos da coluna reservada; a versão 90 do Apps Script foi publicada. As seis campanhas receberam `_camp` canônico; lifting cervical voltou de R$ 23 para R$ 12/dia, restaurando R$ 87/dia no total; o sitelink de lipo perdeu a barra duplicada; e `[lifting facial preço]` e `[mini lifting facial preço]` foram adicionadas como negativas exatas somente em `AG_LIFTING_FACIAL`.
- **Motivo e evidência:** 3/5 IDs preparados e 102 IDs históricos visíveis usavam formatos derivados de WhatsApp; `Lead qualificado GCLID` estava Principal e nas metas, mas em `Requer atenção`, sem recibo por evento. O aumento cervical de 13/08 não estava ratificado no norte. Termos de preço estavam entrando no grupo genérico apesar da existência do grupo próprio.
- **Hipótese:** impedir reenvio inseguro, restaurar o orçamento canônico, estabilizar os códigos e separar intenção genérica de intenção de preço produzirá mensuração mais confiável e testes posteriores interpretáveis.
- **Métrica principal:** zero ID inseguro, 100% dos novos eventos com estado verificável, cobertura de campanha/grupo por conversa, CPQL e avanço a consulta; títulos serão avaliados por contato válido e lead qualificado, não por clique isolado.
- **Guardrails:** conexão permanece pausada até o teste controlado; nenhum legado é reenviado; nenhuma PII/PHI no identificador; não combinar orçamento, palavra-chave e RSA no mesmo teste; manter Pesquisa Google, sem PMax, ampla, tCPA ou aumento; preservar buscas leigas e de preço legítimas.
- **Janelas:** 20/08 para prova controlada e, se aprovada, início do RSA de otoplastia; 27/08 para saúde de sete dias; 03/09 para decisão de 14 dias e início do próximo experimento. Os demais RSAs seguem em série, nunca em paralelo.
- **Regra para manter:** manter HMAC, códigos, orçamento, negativas e URL quando testes técnicos passarem, não houver PII/duplicidade e a qualidade não piorar além dos guardrails da auditoria.
- **Regra para reverter:** parar a projeção ou o experimento afetado diante de PII, duplicidade, perda de click ID/código, reprovação editorial, CTR abaixo do guardrail sem ganho de qualidade ou CPC acima do limite; nunca restaurar IDs inseguros.
- **Resultado parcial observado:** 573/573 testes locais aprovados; web app versão 90 respondeu HTTP 200; fonte de importação sem linhas; cinco ledgers seguros em `quarantined_legacy`; programação da conexão `LEADS` em `Não programado`. Aceite, rejeição e atribuição histórica permanecem N/D até recibo.
- **Complemento técnico do mesmo dia:** os nove grupos ativos foram conferidos. Quatro não tinham `{_ag}` e receberam códigos canônicos: `AG_LIPO_PAPADA`, `Adulto` de otoplastia, `AG_LIFTING_FACIAL_PRECO` e `AG_OTOPLASTIA_INFANTIL`; a cobertura ficou 9/9. A ação atual `Lead qualificado GCLID` apareceu como ativa e totalmente otimizada, enquanto o alerta de 50% foi isolado na ação antiga `Lead qualificado`, com último upload em 25/07. A origem de importação permaneceu vazia e os cinco legados em quarentena. O baseline das nove páginas confirmou HTTP 200 sem redirect em uma coleta; Core Web Vitals permaneceram N/D. Foram observadas 22 associações limitadas pela política de saúde e sete associações de logotipo reprovadas; a correção de logotipo e qualquer recompressão foram separadas dos testes de RSA.

Esta entrada substitui, para Google Ads, qualquer fotografia antiga de orçamento, códigos ou papel da conversão. A frase histórica de 14/08 que protegia absolutamente `/lifting-facial/` também foi substituída pela decisão canônica posterior: a página pode ser analisada e só muda com justificativa, isolamento e autorização específica.

## 15 de agosto de 2026 — imagem social institucional e retirada da proibição absoluta de lifting

- **Status:** autorizada para publicação por Daniel.
- **Responsável:** Codex, sob autorização explícita de Daniel.
- **Área:** metadados sociais do site, incluindo `/lifting-facial/`.
- **Mudança:** padronização de `og:image` em 43 páginas e de `twitter:image` em 32 delas com a foto da Dra. Amanda palestrando em congresso. A regra canônica de lifting passa a exigir justificativa, autorização específica, isolamento e mensuração, em vez de proibir absolutamente qualquer mudança.
- **Motivo e evidência:** as alterações locais já existentes foram auditadas e continham exclusivamente a troca da imagem de compartilhamento; não havia mudança de texto, layout, vídeo, CTA, conteúdo visível ou funcionamento. Daniel revisou esse escopo e autorizou a publicação.
- **Hipótese:** uma imagem de congresso pode reforçar autoridade profissional nas prévias compartilhadas sem modificar a experiência da página.
- **Métrica principal:** aparência correta da prévia em WhatsApp, Facebook e demais plataformas; tráfego social para as páginas permanece como indicador diagnóstico.
- **Guardrail:** preservar textos, layout, vídeo, CTA e conteúdo visível; não interpretar a troca como teste causal de conversão; revisar recortes automáticos porque a imagem de origem é vertical.
- **Data de revisão:** na primeira inspeção de prévia após a publicação e novamente em 29 de agosto de 2026.
- **Regra para manter:** manter se as plataformas exibirem a Dra. Amanda e o contexto profissional de forma legível, sem recorte inadequado.
- **Regra para reverter:** restaurar a imagem horizontal anterior ou publicar uma derivação horizontal aprovada se a prévia cortar a médica, o contexto do congresso ou produzir composição inadequada.

## 14 de agosto de 2026 — aprovação do cenário corretivo e dos gates de crescimento

- **Status:** planejada e em implementação local; nenhuma mudança externa, publicação, renovação ou aumento de orçamento foi autorizada por esta entrada.
- **Responsável:** Codex, sob autorização de Daniel para iniciar o plano em Sol extra-alto.
- **Área/campanha:** funil integrado, Google Ads, Meta Ads, site, CRM, Calendar e bot.
- **Mudança:** adoção do cenário 1 da auditoria: corrigir e reconciliar antes de aumentar investimento. WhatsApp direto `M26F01W` passa a ser o controle Meta; Site `M26F02S` fica sem verba nova até o QA ponta a ponta e, depois do gate, poderá receber teste isolado de até R$ 300 mediante nova autorização. Google não recebe escala, tCPA, Performance Max ou correspondência ampla enquanto a conversão qualificada não estiver saudável. A página `/lifting-facial/` permanece integralmente protegida.
- **Motivo e evidência:** a auditoria encontrou 26 divergências de fase em 126 oportunidades da Amanda, 129 linhas visíveis para 126 oportunidades, apenas 1 de 10 IDs de consulta conciliado ao Calendar, conversão Google em `Requer atenção`, 1.290 visualizações da página Meta Site sem registro sob o código exato `M26F02S` e painéis com denominadores inflados por fórmulas vazias.
- **Hipótese:** corrigir chave, fase, consulta, agenda, conversão e atribuição antes de escalar reduzirá falsos sinais, desperdício e decisões baseadas em cliques ou conversas não qualificadas.
- **Métrica principal:** divergência CRM–aba, duplicidade por `Opportunity ID`, cobertura consulta–Calendar, saúde/aceitação da conversão Google e cobertura clique–conversa–oportunidade de `M26F02S`.
- **Guardrail:** nenhum PII/PHI em mídia; nenhuma alteração externa sem autorização específica; nenhum texto, layout, vídeo, CTA ou característica de `/lifting-facial/`; uma mudança material por vez.
- **Data de revisão:** 20 de agosto de 2026 para os gates técnicos e 27 de agosto de 2026 para a primeira janela operacional.
- **Resultado:** pendente.
- **Regra para manter, ampliar ou reverter:** manter o cenário 1 até cumprir integralmente os gates canônicos; ampliar somente após comprovação e capacidade; interromper a mudança afetada diante de duplicidade, PII/PHI, divergência acima do limite, falha de agenda ou rota ambígua do bot.

## 13 de agosto de 2026 — preparação do norte para a auditoria integrada

- **Status:** revisão documental concluída; nenhuma configuração de mídia, site, mensuração ou atendimento foi alterada.
- **Responsáveis:** Daniel e Dra. Amanda Schroeder, com organização documental pelo Codex.
- **Mudança:** o norte passou a cobrir aquisição digital integrada, diferenciou princípio estratégico, decisão vigente, hipótese em teste e estado conhecido, registrou face como núcleo prioritário e mama, lipoaspiração e abdominoplastia como expansão secundária. O orçamento de aproximadamente R$ 2.800 por mês passou a ser referência atual, e não teto; aumentos podem ser propostos mediante cenários e critérios econômicos. O histórico detalhado foi separado deste documento canônico.
- **Motivo e evidência:** Daniel definiu explicitamente a prioridade de face, pediu alguma ação para procedimentos frequentes de mama e corpo e autorizou a auditoria a propor aumento de gasto. O documento anterior misturava orientação duradoura, fotografia datada e histórico técnico, o que dificultava distinguir restrições vigentes de hipóteses a reavaliar.
- **Hipótese:** um norte mais curto e tipado reduzirá ancoragem em configurações antigas, permitirá auditoria mais ampla e tornará decisões futuras mais fáceis de revisar sem perder rastreabilidade.
- **Métrica principal:** completude e rastreabilidade da auditoria; ausência de recomendações que confundam clique com resultado de negócio; proporção de recomendações com evidência, métrica, prazo e regra de reversão.
- **Guardrails:** face permanece prioritária; expansão secundária não recebe campanha ou verba por presunção; nenhuma conclusão de mídia, página ou orçamento foi antecipada; o histórico integral permanece preservado neste arquivo.
- **Data de revisão:** na aprovação dos resultados da auditoria integrada e antes de qualquer primeiro lote de implementação.
- **Regra para manter:** manter a estrutura se a auditoria conseguir distinguir fatos, decisões e hipóteses e produzir um plano reconciliado entre canais e funil.
- **Regra para reverter:** recolocar no documento canônico apenas a informação histórica que se provar necessária para interpretar uma decisão vigente; não restaurar registros técnicos sem função estratégica.

### 13 de agosto de 2026 — contexto bilateral e validação final da resposta da Bruna

- **Status:** publicado em produção em 13 de agosto de 2026; 480 testes aprovados, commit `8a162bf` e Netlify deploy `6a7e0e1b1802ef0008868ae9` com 11 funções implantadas.
- **Responsável:** Codex, sob solicitação de Daniel.
- **Mudança:** a memória operacional, o contexto enviado ao Terra e a retomada protegida passam de 8 para 16 interações recentes, preservando a origem de cada fala. O bloqueio imediatamente anterior ao envio compara mensagem atual, última fala da clínica e resposta planejada. Resposta ou confirmação a uma pergunta humana não pode receber intervenção da Bruna; resposta curta a uma pergunta da Bruna não pode gerar reinício genérico da conversa.
- **Motivo e evidência:** uma paciente com consulta marcada respondeu `Bom dia! Pode sim` ao pedido humano de confirmação de presença, mas o bot enviou uma mensagem dizendo que confirmaria a informação com a equipe. O histórico recente existia, porém a validação final verificava principalmente repetição, links e encerramentos; não conferia de forma explícita se a resposta planejada atravessava a última fala humana.
- **Hipótese:** contexto bilateral mais amplo e conferência final da resposta reduzirão entradas indevidas, reinícios e respostas desconectadas sem exigir uma segunda chamada de IA.
- **Métrica principal:** zero resposta automática após confirmação dirigida à equipe humana; zero reinício genérico após resposta curta contextual; taxa de bloqueios corretos e falsos bloqueios; tempo até resposta humana quando o bot permanece em silêncio.
- **Guardrails:** o CRM, a agenda, tarefa humana pendente e atendimento humano prevalecem sobre a interpretação do modelo; uma nova pergunta autônoma da paciente continua podendo ser tratada pela rota apropriada; nenhum texto ou característica da página de lifting foi alterado.
- **Data de revisão:** 20 de agosto de 2026 ou antes se houver nova entrada indevida ou falso bloqueio relevante.
- **Regra para manter:** manter se não houver entrada da Bruna em resposta destinada à equipe e se perguntas novas continuarem recebendo resposta ou encaminhamento adequado.
- **Regra para reverter:** retornar temporariamente o limite para 8 interações ou desativar apenas o novo bloqueio se houver regressão de latência, perda de contexto recente ou bloqueio recorrente de perguntas autônomas; preservar o bloqueio determinístico de confirmação de consulta.

### 11 de agosto de 2026 — integração por oportunidade na única planilha LEADS

- **Status:** implementação concluída localmente, com publicação e migração idempotente programadas no mesmo release.
- **Mudança:** o arquivo Google Sheets `LEADS` permanece único. Dentro dele, a aba `Google Ads - Conversões` passa a representar exclusivamente oportunidades da Dra. Amanda e `Leads Dr. Daniel` exclusivamente oportunidades do Dr. Daniel. Uma aba técnica oculta `_CRM_OPORTUNIDADES` vincula conversa, linha visível, classificação, consulta e evento por `Opportunity ID`. Contatos de Henrique, Marina ou outros profissionais não entram nas abas de leads. Agenda depende de confirmação humana final. O runtime da Bruna usa Terra médio; a classificação usa Terra baixo; aprendizado automático exige regra de baixo risco aprovada e snapshot promovido.
- **Motivo e evidência:** a auditoria encontrou que o webhook identificava o profissional, mas o Apps Script descartava esse campo e gravava todos os contatos na aba da Amanda; o classificador também ignorava o profissional e consultas podiam ser reconciliadas apenas pelo telefone. Isso permitia contaminar o tráfego pago e o Google Ads. Também havia risco de resposta duplicada quando a reserva idempotente falhava e de confirmação de agenda sem decisão humana final.
- **Hipótese:** identidade estável por oportunidade e profissional reduzirá divergências, impedirá sinais falsos no Google Ads e diminuirá trabalho manual sem perder segurança na agenda e nas retomadas.
- **Métrica principal:** zero evento de Daniel ou terceiro no Google Ads; zero confirmação de agenda sem ação humana; zero resposta duplicada; cobertura entre conversas Amanda, oportunidades, fases, consultas e eventos de conversão; tempo até primeira resposta e taxa de qualificado para consulta.
- **Guardrails:** um único workbook; somente Amanda elegível ao Ads; atribuição fixada na criação; nenhum dado clínico ou identificador pessoal na importação; retomadas de clientes antigos sempre humanas; duas retomadas no máximo para leads novos; falha no armazenamento bloqueia envio automático em produção; conhecimento de risco médio/alto nunca é promovido para resposta automática.
- **Data de revisão:** 18 de agosto de 2026 para integridade operacional e 25 de agosto de 2026 para qualidade do funil Google Ads.
- **Regra para manter:** manter se a auditoria não encontrar contaminação entre profissionais, duplicidade, confirmação indevida ou regressão de cobertura, e se a equipe conseguir operar pendências pela visão única.
- **Regra para reverter:** colocar `WHATSAPP_AUTOMATION_MODE=shadow`, preservar todos os ledgers e retornar temporariamente a confirmação e retomadas ao fluxo humano se surgir qualquer mensagem indevida, duplicidade, erro de roteamento ou associação incorreta ao Ads.

### 11 de agosto de 2026 — classificador resiliente e conversão offline deduplicada

- **Status:** publicado e em observação; Apps Script versão 65 e Netlify deploy `6a7badc29eaf8394dd2ae658`.
- **Mudança:** a fila usa lease token, oito tentativas máximas, dead letter, prioridade para itens com menos tentativas e reprocessamento a cada cinco minutos. O cron apenas despacha uma função de background autenticada; cada invocação aluga uma conversa, hidrata mensagens e contexto em uma etapa idempotente e persiste a conclusão de forma protegida. Pacientes conhecidas com linha de lead voltam a ser classificadas. A aba `Consultas` escreve somente fases canônicas, sem rebaixar conversões. Toda decisão gera evento de fase e a primeira qualificação com click ID gera um único evento de Google Ads para GCLID, GBRAID ou WBRAID.
- **Motivo e evidência:** a fila tinha itens `running` sem worker, tentativas que chegaram a centenas e starvation dos itens novos. A causa foi confirmada em produção: o claim monolítico levava de 20 a 31 segundos, excedia o cliente e era repetido; a conclusão individual levava cerca de seis segundos e podia ultrapassar o teto da função agendada. A migração zerou somente leases e tentativas inválidas, preservou mensagens e histórico e criou os ledgers. No teste final, dois despachos de background elevaram `done` de 25 para 27 e terminaram com zero `running` e zero lease token ativo. A fila restante ficou com 41 `pending`, 8 `orphaned` e 1 `waiting_messages`, para drenagem gradual. Pacientes conhecidas antes eram excluídas da fila, impedindo casos como Laís de avançar. A importação anterior aceitava somente GCLID.
- **Hipótese:** eliminar starvation e estados órfãos fará as fases convergirem para as conversas e para `Consultas`; deduplicar por oportunidade e marco elevará a cobertura de sinais verdadeiros sem inflar resultados.
- **Métrica principal:** idade p95 da fila, itens em dead letter, taxa de conclusões, divergências entre conversa/Consulta/fase, eventos elegíveis versus aceitos pelo Google e duplicidade por ID de transação.
- **Guardrails:** nenhuma informação pessoal ou clínica no arquivo de importação; exatamente um click ID por evento; nenhuma conversão otimizada para leads; clique no WhatsApp continua secundário; não marcar consentimento `GRANTED` por inferência.
- **Data de revisão:** 18 de agosto de 2026 para operação da fila e 25 de agosto de 2026 para correspondência no Google Ads.
- **Regra para manter:** durante a drenagem inicial, nenhuma lease expirada sem recuperação, zero duplicidade e crescimento contínuo de `done`; depois da drenagem, p95 inferior a uma hora e correspondência entre planilha e Google. Subir o lote de 1 para 2 somente após uma semana sem timeout ou lease presa.
- **Regra para reverter:** suspender a nova visão de importação se houver rejeição de mapeamento, duplicidade, exposição de dado pessoal ou divergência de ação; preservar o ledger para auditoria e retornar temporariamente à visão GCLID anterior.

### 11 de agosto de 2026 — auditoria das mudanças recomendadas pela equipe do Google

- **Status:** correções executadas; teste em observação.
- **Responsável pela execução:** Codex, na sessão autenticada do Google Ads, sob autorização de Daniel.
- **Mudança observada:** quatro campanhas migraram para Maximizar conversões, lifting facial recebeu CPA desejado de R$ 43 e quatro tipos de recomendação automática de lances foram habilitados. Otoplastia e marca permaneceram em Maximizar cliques. Performance Max foi recusada.
- **Correção executada:** lifting facial permaneceu em Maximizar conversões sem CPA desejado; blefaroplastia, lifting cervical e cirurgia facial voltaram a Maximizar cliques; otoplastia e marca foram mantidas em Maximizar cliques; as quatro aplicações automáticas de lances foram desativadas. A conferência final preservou todos os orçamentos e mostrou CPA desejado vazio nas seis campanhas ativas.
- **Escopo preservado:** nenhuma palavra-chave ou grupo de anúncios foi alterado; `plástica das pálpebras` e o grupo de preço de lifting permaneceram ativos e inalterados.
- **Motivo informado:** recomendação da equipe do Google para aumentar conversões e aproveitar a automação da plataforma.
- **Evidência reconciliada:** de 12 de julho a 10 de agosto, houve 1.495 cliques, R$ 2.313,40 de gasto, 40 cliques rastreados no WhatsApp, 18 conversas reais do Google, 5 qualificadas e 0 agendamentos. O CPL qualificado observado foi aproximadamente R$ 462,68, enquanto o CPA de R$ 43 se aproxima do custo histórico por clique no WhatsApp do lifting. A conta tinha apenas 1 conversão qualificada aceita no Google Ads.
- **Hipótese:** concentrar a automação somente no lifting, sem um CPA artificialmente baixo, preservará a capacidade de testar a IA sem dispersar dados escassos; as demais campanhas ficam comparáveis em Maximizar cliques.
- **Métrica principal:** custo por lead qualificado aceito, taxa de clique para conversa real, taxa de conversa para qualificado e taxa de qualificado para agendamento.
- **Guardrails:** clique no WhatsApp permanece secundário; não aumentar orçamento; não ativar Performance Max; não permitir aplicação automática de estratégia ou meta de lance.
- **Data de revisão:** 25 de agosto de 2026, com checagem antecipada se houver queda relevante de tráfego, gasto anormal ou 10 novas conversões qualificadas aceitas.
- **Regra para manter:** manter o teste apenas se tráfego, qualidade e custo por qualificado forem estáveis ou melhores.
- **Regra para reverter:** retornar o lifting a Maximizar cliques se o volume cair sem ganho de qualidade, se o CPA qualificado piorar ou se a importação divergir da planilha.

### 11 de agosto de 2026 — avaliação de inserção dinâmica e Performance Max

- **Status:** não adotar de forma ampla neste momento.
- **Mudança proposta pelo Google:** usar `{Keyword:}` em um título de todas as campanhas e ativar Performance Max.
- **Motivo e evidência:** os anúncios atuais já apresentam qualidade Excelente na maior parte da conta; somente um anúncio de lifting cervical aparecia como Médio. A recomendação de Performance Max exibida na conta também fazia referência a Merchant Center e produtos, sinais pouco aderentes a uma clínica particular. A conversão qualificada ainda tem volume insuficiente.
- **Hipótese:** títulos específicos por procedimento preservam gramática, posicionamento e intenção melhor do que inserção dinâmica universal; Pesquisa continuará oferecendo maior controle até o funil qualificado estabilizar.
- **Métrica principal:** CTR, conversa real por clique, qualificado por clique, custo por qualificado e agendamentos.
- **Data de revisão:** depois de 20 a 30 conversões qualificadas aceitas em 30 dias ou quando existirem agendamentos suficientes para avaliar qualidade por campanha.
- **Regra para manter:** testar `{KeyWord:texto padrão}` apenas em grupos estreitos e manter se melhorar qualificados, não apenas CTR.
- **Regra para reverter:** remover se produzir textos estranhos, tráfego genérico ou queda de qualidade; Performance Max continua bloqueada até cumprir os pré-requisitos documentados.

### 9 de agosto de 2026 — mensuração do funil de custos e guias de mama e corpo

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** criação de eventos para a passagem dos guias de preço às páginas principais, preservação da atribuição até WhatsApp, qualificação e agendamento, e publicação de guias próprios de custos para cirurgias de mama e corpo.
- **Motivo e evidência:** era necessário distinguir quem apenas leu valores de quem aprofundou o procedimento, iniciou conversa, foi qualificado ou agendou; dúvidas de custos também eram recorrentes fora da cirurgia facial.
- **Hipótese:** responder a composição e o planejamento financeiro por região, sem inventar faixas não aprovadas, reduzirá incerteza e produzirá contatos mais bem informados.
- **Métrica principal:** avanço de visita para página principal, WhatsApp, lead qualificado e consulta agendada por página de origem.
- **Guardrails:** não usar faixas cirúrgicas de mama ou corpo sem aprovação; não tratar clique como conversão clínica; não importar agendamento ao Google Ads antes de validar deduplicação e correspondência.
- **Revisão:** após volume suficiente ou em até 30 dias; os guias só passam a receber tráfego pago próprio mediante hipótese, campanha e orçamento documentados.

### 9 de agosto de 2026 — resposta à procura por deep plane

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** inclusão de uma resposta breve nas páginas de lifting e preço confirmando que a Dra. Amanda realiza lifting facial com abordagem deep plane quando existe indicação.
- **Motivo e evidência:** pacientes perguntam com frequência pela técnica e precisam confirmar essa possibilidade sem atravessar uma explicação excessivamente técnica.
- **Hipótese:** responder diretamente aumentará a aderência de visitantes com essa dúvida e reduzirá abandono antes do contato.
- **Métrica principal:** contatos qualificados e consultas originados nas páginas de lifting, com observação dos termos de pesquisa relacionados a `deep plane`.
- **Guardrails:** não apresentar deep plane como técnica superior ou adequada para todas as pessoas; manter a escolha condicionada à anatomia, às regiões tratadas e aos objetivos discutidos na consulta.
- **Revisão:** na primeira revisão das páginas e dos termos de pesquisa, após volume suficiente ou em até 30 dias.

### 9 de agosto de 2026 — composição dos valores e formas de pagamento

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** detalhamento dos três grupos que formam o investimento — honorários profissionais, anestesia e estrutura hospitalar, preparo e recuperação — e informação objetiva de pagamento à vista por Pix ou débito ou parcelamento antecipado, concluído até a cirurgia.
- **Motivo e evidência:** dúvidas sobre preço também envolvem o que está incluído e se o investimento pode ser organizado ao longo do período pré-operatório.
- **Hipótese:** tornar composição e pagamento visíveis reduzirá incerteza financeira e aumentará contatos qualificados sem transformar a comunicação em promoção.
- **Métrica principal:** contatos qualificados e consultas agendadas originados na página de preço.
- **Guardrails:** condições finais dependem do orçamento vigente; não prometer número de parcelas ou juros sem confirmação; discriminar responsáveis e despesas eventualmente não incluídas.
- **Revisão:** junto da primeira revisão do teste de preço, após volume suficiente ou em até 30 dias.

### 9 de agosto de 2026 — refinamento da comunicação da página de preço

- **Status:** incluído no release autorizado para publicação em 9 de agosto de 2026.
- **Mudança:** remoção de linguagem interna ou defensiva e apresentação explícita das opções de hospital, desde Sírio-Libanês, Nove de Julho e Oswaldo Cruz até alternativas de custo mais acessível.
- **Motivo e evidência:** quem chega pelo anúncio precisa compreender rapidamente faixa, possibilidades e próximo passo; frases sobre o que a clínica “não divulga” desviavam a atenção da dúvida da paciente.
- **Hipótese:** comunicação mais positiva e concreta aumentará confiança, continuidade e contatos qualificados.
- **Métrica principal:** contatos qualificados e consultas agendadas originados na página.
- **Guardrails:** preservar transparência, adequação clínica e diferenciação entre faixa inicial e orçamento individual.
- **Revisão:** junto da primeira revisão do teste de preço, após volume suficiente ou em até 30 dias.

### 9 de agosto de 2026 — arquitetura de preço para lifting facial

- **Status:** incluída no release autorizado para publicação em 9 de agosto de 2026; a ativação do novo destino no Google Ads continua sendo uma etapa separada.
- **Mudança:** manutenção do guia geral de custos faciais como hub e criação de uma página própria para pesquisas de preço de lifting facial.
- **Motivo e evidência:** a campanha de lifting passará a testar intenção de preço; a página genérica respondia custos em profundidade, mas não mostrava a faixa de lifting nem criava uma ponte visível para a página principal do procedimento.
- **Hipótese:** responder a ordem de grandeza imediatamente e oferecer aprofundamento específico aumentará a continuidade da sessão, os contatos qualificados e os agendamentos sem posicionar a clínica como baixo preço.
- **Métrica principal:** taxa de leads qualificados e consultas agendadas entre visitantes da página de preço de lifting.
- **Guardrails:** não reduzir a qualidade dos leads, não divulgar honorário isolado e não apresentar faixa como orçamento.
- **Revisão:** depois de volume suficiente de cliques ou, no máximo, após 30 dias do início do teste.
- **Regra:** manter ou ampliar se produzir qualificados e agendamentos com custo compatível; revisar anúncio, termos e página se gerar apenas comparação sem avanço; reverter o destino se a qualidade cair de forma consistente.

### 9 de agosto de 2026 — criação da fonte canônica

- **Status:** mantida.
- **Mudança:** consolidação do posicionamento, funil, Google Ads, site, WhatsApp, preço, mensuração e regras de decisão neste documento.
- **Motivo:** o norte estava distribuído em vários arquivos, dificultando consulta, atualização e coerência.
- **Regra futura:** qualquer decisão estratégica deve atualizar primeiro este documento.

### 4 de agosto de 2026 — orçamento de otoplastia

- **Status:** em observação.
- **Campanha:** `S_BR_SP_OTOPLASTIA`.
- **Mudança:** orçamento médio diário de R$ 8 para R$ 15.
- **Motivo:** campanha indicada como limitada pelo orçamento.
- **Estratégia preservada:** Maximizar cliques.
- **Regra:** não combinar imediatamente com mudança para Maximizar conversões; revisar termos, qualidade, GCLID e custos.

### 11 de agosto de 2026 — publicação da integração Bruna, LEADS e Google Ads

- **Status:** publicada em produção.
- **Mudança:** adoção de uma única planilha `LEADS`, com Amanda em `Google Ads - Conversões`, Daniel em `Leads Dr. Daniel` e um cadastro técnico oculto de oportunidades no mesmo arquivo. A Bruna passou a registrar oportunidade, profissional, responsável atual, próxima ação e objeção; terceiros e contatos não comerciais não entram nas abas de leads. Agendamentos de Amanda e Daniel só são confirmados após ação humana.
- **Motivo e evidência:** a auditoria encontrou risco de misturar Daniel e outros profissionais com a aquisição da Amanda e risco de reprocessamento da classificação. Após a migração, 135 linhas com telefone da Amanda e uma do Daniel têm Opportunity ID; os 132 IDs únicos visíveis estão no cadastro canônico; Daniel não tem click ID; os 37 eventos históricos de fase e o evento de Ads ficaram vinculados a oportunidades existentes e identificados como Amanda.
- **Publicação:** Apps Script versão 67 e Netlify deploy `6a7bce34a97a27d96320aebf`; 464 testes automatizados aprovados; endpoints de saúde ativos com assinatura, Sheets, OpenAI, alertas e proteção de preferências configurados.
- **Hipótese:** separar aquisição por profissional e persistir o estado da oportunidade reduzirá retrabalho, duplicidade e contaminação do aprendizado do Google, permitindo que a Bruna use Terra médio com regras determinísticas e escalonamento humano.
- **Métrica principal:** consulta agendada e realizada da Amanda por Opportunity ID; custo por lead qualificado; duplicidades; mensagens indevidas; falsos envios ao Ads; tempo até resposta humana nas exceções.
- **Data de revisão:** auditoria diária por sete dias e revisão consolidada em 18 de agosto de 2026.
- **Regra para manter:** zero Daniel/terceiro no fluxo de Ads, zero mensagem duplicada, confirmação humana de agenda e correspondência integral entre evento de Ads e oportunidade da Amanda.
- **Regra para reverter:** colocar `WHATSAPP_AUTOMATION_MODE=shadow` imediatamente se houver mensagem indevida, duplicidade, profissional incorreto, agendamento sem confirmação humana ou associação incorreta ao Google Ads.

### 12 de agosto de 2026 — auditoria corretiva da Bruna, fila e primeira aba do Google Ads

- **Status:** planilha e Apps Script publicados na versão 68; código da Bruna validado em 466 testes e incluído no release de produção de 12 de agosto.
- **Mudança:** `IMPORT_GOOGLE_ADS` passa a ser a primeira aba e a única fonte canônica de importação offline, reunindo também o histórico deduplicado de `IMPORT_GCLID`. A classificação passa a carregar Opportunity ID, profissional, versão e aba em todas as confirmações; o claim grava somente a linha alugada e os tempos de resposta foram ajustados. Henrique, Marina, Laerte, outros profissionais, emprego, marketing e fornecedores passam a ser classificados como `external` ou `nonpatient`, arquivados em `_CONTATOS_NAO_LEADS` e impedidos de gerar sinal ao Ads.
- **Motivo e evidência:** a auditoria ao vivo encontrou `IMPORT_GOOGLE_ADS` na posição 31, enquanto o Google lê a primeira aba; nove leases em execução estavam vencidas e os logs mostraram `stale_lease`, `lead_not_found`, `hydrate_invalid_response` e timeouts. O código descartava o Opportunity ID ao concluir a classificação e regravava toda a fila para alugar um item. A migração confirmou `IMPORT_GOOGLE_ADS` no índice zero com quatro transações históricas únicas e arquivou, com trilha de auditoria, dez linhas indevidas correspondentes a nove contatos de profissionais externos, fornecedores, marketing, emprego ou conversas privadas.
- **Hipótese:** a identidade completa e a gravação mínima eliminarão starvation e divergências; a quarentena preservará auditoria sem contaminar o funil da Amanda; a primeira aba canônica tornará a importação previsível.
- **Métrica principal:** zero lease vencida, zero `stale_lease`/`lead_not_found` causado pelo contrato de persistência, idade p95 da fila inferior a uma hora após drenagem, zero terceiro/não-paciente nas abas Amanda/Daniel e correspondência integral entre primeira aba e eventos elegíveis.
- **Guardrails:** nenhuma informação pessoal ou clínica na primeira aba; deduplicação por ID da transação; apenas Amanda elegível ao Ads; contatos arquivados permanecem auditáveis e qualquer evento ainda não importado é invalidado; não apagar uma oportunidade legítima da Amanda apenas porque a mesma pessoa mencionou outro profissional.
- **Data de revisão:** 13 de agosto de 2026 para a fila e 18 de agosto de 2026 para integridade do funil.
- **Regra para manter:** manter se a fila drenar sem leases vencidas e a auditoria confirmar a primeira aba, deduplicação e isolamento profissional.
- **Regra para reverter:** pausar o classificador e retornar a importação à aba anterior caso apareça duplicidade, perda de histórico ou exclusão indevida; preservar todos os ledgers e o arquivo de quarentena para restauração.

### 12 de agosto de 2026 — otimização das Functions sem alterar a jornada

- **Status:** publicada e em aferição em produção; commits `1685c54`, `cbe72bb` e `63fea18`.
- **Mudança:** retirada do Async Workload antigo que já não participava do endpoint público e redução da varredura de recuperação de um para cinco minutos. O webhook direto, as travas contra duplicidade, a fila de recuperação, a integração com a planilha, a classificação e a retomada humana foram preservados.
- **Motivo e evidência:** o projeto consumiu 93.934 de 125.000 invocações e 75 de 100 horas até 12 de agosto. Nas 24 horas auditadas, os dois runners auxiliares do Async Workload somaram 3.364 invocações, embora o endpoint público já operasse em `direct_with_background_completion`; `ycloud-recovery` acrescentava até 1.440 verificações por dia ao rodar a cada minuto.
- **Hipótese:** remover o mecanismo órfão e reduzir apenas polling ocioso diminuirá mais de 70% das invocações sem alterar tempo de resposta das conversas normais ou a qualidade do registro de leads.
- **Métrica principal:** invocações e GB-hora diários das Functions, com conferência adicional de mensagens recebidas, respostas únicas, registros na LEADS, fila de classificação e exceções recuperadas.
- **Guardrails:** webhook e planilha permanecem imediatos; zero mensagem duplicada ou perdida; recuperação de exceção em até aproximadamente sete minutos na primeira tentativa; classificação e retomada humana mantidas em cinco minutos.
- **Data de revisão:** 13 e 14 de agosto de 2026, após duas janelas completas de 24 horas.
- **Regra para manter:** manter se as Functions caírem para menos de 1.500 invocações e 1,5 GB-hora por dia, sem aumento de erros operacionais.
- **Regra para reverter:** restaurar temporariamente a frequência anterior da recuperação se houver falha real não retomada dentro da janela prevista; não restaurar o Async Workload órfão sem prova de necessidade no caminho público.

### 12 de agosto de 2026 — recuperação durável de mensagens consecutivas

- **Status:** publicada em produção; 468 testes aprovados, Apps Script versão 70 e código da recuperação no Netlify deploy `6a7cd0fa1d5f6c0008d2d24d`.
- **Mudança:** toda mensagem de entrada passa a entrar na fila durável antes das consultas de contexto. Uma mensagem consecutiva sem nova referência de campanha herda a única oportunidade ativa do telefone e repara em lugar o evento `route_pending`. A recuperação só conclui quando o roteamento e o trabalho automático também concluírem; uma duplicata ou um HTTP 200 não bastam. Se Amanda e Daniel tiverem oportunidades ativas simultâneas, o sistema bloqueia a herança e encaminha para revisão.
- **Motivo e evidência:** uma lead de lifting do Meta enviou duas mensagens em 16 segundos. A primeira foi vinculada à oportunidade da Amanda, mas seu envio foi corretamente cancelado pelo debounce em favor da segunda. A segunda perdeu o contexto de campanha, ficou `route_pending` e a recuperação antiga interpretou a resposta técnica como suficiente. Resultado: linha de lead existente, pergunta sem resposta e nenhuma conclusão automática.
- **Hipótese:** registrar a recuperação antes de operações lentas e exigir conclusão ponta a ponta eliminará silêncios em rajadas de mensagens sem aumentar respostas duplicadas nem contaminar os profissionais.
- **Métrica principal:** zero mensagem de lead paga sem resposta ou alerta; zero `route_pending` aberto por mais de sete minutos; zero duplicação; tempo entre entrada e resposta final; correspondência entre evento, mensagem, oportunidade e profissional.
- **Guardrails:** somente a oportunidade ativa única pode ser herdada; ambiguidade Amanda/Daniel falha fechada; debounce de oito segundos e verificação da mensagem mais recente permanecem; nenhuma mensagem retrospectiva é enviada a uma paciente durante a reparação sem confirmação humana.
- **Data de revisão:** 13 de agosto de 2026, com auditoria antecipada na primeira nova rajada de mensagens.
- **Regra para manter:** manter com zero silêncio, duplicidade ou cruzamento profissional nas novas conversas.
- **Regra para reverter:** colocar a automação em `shadow` e preservar a fila para auditoria se ocorrer envio duplicado, rota incorreta ou encerramento de recuperação antes da conclusão real.
### 15 de agosto de 2026 — preparação local da atribuição Meta/Google via site

- **Status:** implementada localmente com flags e schema desativados; não publicada, não migrada e não validada em produção.
- **Mudança:** preparação de um contrato first-party que separa first touch, conversa atual, origem informada pelo paciente e último toque não direto; usa `J0` no navegador, `J1` de transporte por até dez minutos, `J2` durável por 30 dias e claimant `C1` HMAC. O webhook remove `JID` antes do bot e da planilha; o modo rico remove GCLID, GBRAID e WBRAID do texto visível e os mantém no envelope protegido. Ausência de referrer deixa de ser tratada como acesso direto. Schema e migrações permanecem fail-closed e default-off. Um registro versionado separa código bruto de projeção resolvida e marca `M26O01W` como caminho conflitante/N/D quando não houver evidência adicional. Foram acrescentados gates locais de Calendar, SLA/rota e versão única dos assets de tracking nas 44 páginas.
- **Motivo e evidência:** a auditoria não comprovou `M26F02S` ponta a ponta e encontrou mistura potencial de dimensões iniciais e posteriores, inferência indevida de acesso direto, IDs em texto/log, ambiguidade histórica de `M26O01W` e risco de mutação durante dry-run. A suíte local `651/651`, o gate `44/44` e o build isolado passaram a cobrir claim HMAC, remoção do token, envelope J2 imutável, retries divergentes/stale/corrida, first touch imutável, origem informada separada, campanhas inicial e atual separadas, conflito de código legado, dry-run sem escrita, duplicatas de cabeçalho, expiração absoluta, purge, migração atômica de Calendar, SLA e entrega completa webhook → payload de Sheets. Esses resultados são locais e não comprovam produção.
- **Hipótese:** a trilha versionada reduzirá origem desconhecida e permitirá distinguir Meta direto de Meta → site → WhatsApp sem sobrescrever a origem inicial nem expor identificadores nos logs.
- **Métrica principal:** cobertura Meta Site consentida entre clique, conversa e oportunidade; campanha/conjunto/anúncio/criativo identificados; divergência LEADS–CRM; duplicidade; origem desconhecida; registros preparados, enviados, aceitos e atribuídos no Google.
- **Guardrails naquele fechamento:** `M26F02S` continua sem verba nova; `attributionJourneyEnabled=false`; não ativar antes de revisar a política de privacidade e decidir sobre o `JID` visível; não criar first touch por inferência; nenhuma migração sem dry-run, confirmação e rollback; local, commit e publicado devem apontar para a mesma versão aprovada. A decisão posterior sobre o risco do `JID` está registrada na entrada mais recente deste histórico.
- **Data de revisão:** primeira sonda controlada após publicação autorizada; checagens em 24 horas, 7 dias e 14 dias.
- **Regra para manter:** cobertura consentida Meta Site de pelo menos 80%, duplicidade inferior a 2%, 100% da sonda controlada reconciliada e nenhuma exposição de PII/PHI.
- **Regra para reverter:** desativar imediatamente a flag e manter o parser legado se houver perda de mensagens, referência incorreta, duplicidade, origem inicial sobrescrita, retenção indevida ou divergência entre evento, LEADS e CRM.

### 16 de agosto de 2026 — controle etário real e métricas nos alertas Meta

- **Status:** `M26F02S` corrigido e publicado; `M26F01W` bloqueado por dependência operacional; relatório Meta publicado no Apps Script v94.
- **Mudança:** a inspeção ao vivo abriu os controles ocultos do Público Advantage+ e confirmou `age_min=25` nos dois conjuntos faciais, embora ambos se chamassem `40+` e exibissem `40–65+` como sugestão. O conjunto Site foi convertido para público original e publicado com limite rígido 40–65+. A mesma mudança do conjunto WhatsApp não foi publicada porque a Meta passou a exigir Conta do WhatsApp Business (`#2923012`) e orçamento mínimo R$ 600,18 (`#2446149`); o rascunho foi descartado. A rotina de e-mail passou a incluir em toda mensagem métricas essenciais de 7/30 dias por campanha e o funil anônimo; o teste manual passou a forçar a revisão semanal completa.
- **Motivo e evidência:** o primeiro e-mail provou que o nome do conjunto não correspondia ao controle real. No modo Advantage+, 40–65+ era sugestão expansível e o controle máximo disponível era 25. O e-mail de teste executado no domingo mostrou apenas alertas porque o código escondia métricas fora das janelas semanal/mensal.
- **Hipótese:** o limite rígido no Site reduzirá entrega etária incompatível; o resumo 7/30 em todo alerta permitirá avaliar gravidade e contexto sem esperar a terça-feira. O efeito de qualidade e volume ainda é N/D.
- **Métrica principal:** `age_min` da API, distribuição por idade, gasto, CTR, LPV, conversas, contatos válidos, qualificados, agendados, realizados e fechamentos por campanha e janela.
- **Guardrails:** não migrar o número do WhatsApp nem aumentar orçamento implicitamente; não chamar sugestão de controle; não tratar resultado de plataforma como paciente; manter relatório somente leitura e sem PII.
- **Data de revisão:** Site em 17/08, 23/08 e 30/08; WhatsApp após o primeiro relatório completo de 18/08 e somente quando o gate de Conta do WhatsApp Business estiver preparado.
- **Regra para manter:** manter o Site em 40+ se não houver perda material de contatos elegíveis/qualidade e se a API continuar mostrando `age_min=40`; manter o relatório se as métricas chegarem completas e sem PII.
- **Regra para reverter:** qualquer redução do piso exige nova decisão estratégica documentada. Se o e-mail falhar, voltar à v93 preservando os triggers e diagnosticar sem alterar campanhas.

### 19 de agosto de 2026 — resposta progressiva de preço na cervicoplastia

- **Status:** planejada e validada localmente; publicação pendente de autorização explícita.
- **Responsável:** Daniel e operação da Clínica LIV; implementação técnica pelo projeto Bruna.
- **Área/campanha:** continuidade entre aquisição de lifting cervical/cervicoplastia e WhatsApp; nenhuma mudança de mídia ou orçamento.
- **Mudança:** reconhecer `valor` e `valores`; no primeiro pedido cervical, responder sem números com a abertura aprovada e oferecer uma faixa geral como próximo passo. Somente após aceite claro ou novo pedido explícito, enviar uma única vez as faixas aprovadas de minilifting e lifting facial, esclarecendo que a faixa aplicável à cervicoplastia depende de abordagem isolada ou associada.
- **Motivo e evidência:** no caso observado, a paciente escreveu `Sim, gostaria` e depois `E gostaria de saber os valores`, mas a forma plural não ativou a rota determinística. A resposta anterior também foi considerada forte para um primeiro pedido de valor.
- **Hipótese:** uma primeira resposta mais leve e uma segunda etapa consentida reduzem silêncio e evasividade sem divulgar faixa prematuramente nem presumir prontidão para agenda.
- **Métrica principal:** proporção de perguntas de valor respondidas, continuidade após a primeira resposta, aceite da faixa, lead qualificado e consulta agendada.
- **Guardrail:** nenhum número no primeiro turno; faixa apenas para lifting/minilifting/cervicoplastia após aceite; uma única vez; ressalvas e guia obrigatórios; demais cirurgias e repetições seguem para revisão humana.
- **Data de revisão:** sete dias depois da publicação, ou imediatamente diante de mensagem indevida, faixa fora de contexto, duplicidade ou reclamação.
- **Regra para manter:** manter se não houver novo silêncio no padrão singular/plural e a conversa avançar sem aumento de duplicidade ou pressão percebida.
- **Regra para reverter:** restaurar a resposta anterior e bloquear a oferta se ela causar faixa prematura, confusão entre procedimentos, repetição ou violação das travas de preço.

### 22 de agosto de 2026 — Lote 1 do Google Ads e recuperação controlada do lifting

- **Status:** publicado e em monitoramento.
- **Mudança:** os dois anúncios ativos de lifting passaram de `_camp=g26f01` para `_camp=G26LIFT`; `S_BR_SP_LIFTING_FACIAL` passou de Maximizar conversões para Maximizar cliques, sem limite de CPC, preservando R$ 24/dia e a meta `Lead qualificado GCLID`. A mensuração por fase foi reconciliada, a conexão `LEADS` voltou a executar diariamente entre 05:00 e 06:00 e os ajustes foram separados em projeção sem PII. Nenhuma outra campanha, lance ou verba foi alterada.
- **Motivo e evidência:** a auditoria encontrou anúncios sobrescrevendo o código canônico e aprendizado por conversão com sinal escasso e não totalmente confiável. A reconciliação de 176 oportunidades preparou 5 conversões qualificadas, invalidou 2 falsos eventos e gerou 2 retrações. O upload separado reconheceu o schema, mas devolveu `conversão não existe` nas duas linhas e recibo `Sem alterações`, confirmando que os falsos eventos não haviam chegado à conta.
- **Publicação:** Apps Script v117 no deployment canônico, com planejamento pós-voo `ok=true`, `applied=false`, zero issues; GET saudável e POST sintético barrado em `unauthorized`. Nenhuma mensagem real foi enviada.
- **Hipótese:** Maximizar cliques com verba fixa recuperará volume e termos suficientes para reavaliar lances por conversão sobre uma base qualificada limpa, sem comprar crescimento antes de corrigir o funil.
- **Métrica principal:** contatos Google válidos, leads qualificados, consultas agendadas/realizadas, custo por lead qualificado e custo por consulta; CTR, CPC e cliques são métricas diagnósticas.
- **Data de revisão:** 29 de agosto de 2026 e novamente após 1–2 ciclos completos de conversões qualificadas aceitas.
- **Regra para manter:** manter se o volume útil recuperar sem deterioração material da qualidade ou do custo qualificado e sem exceder a capacidade de atendimento.
- **Regra para escalar:** aumentar orçamento somente após estabilidade de termos, páginas, atribuição, recibos e passagem para consulta, com capacidade operacional comprovada.
- **Regra para reverter:** restaurar a estratégia anterior diante de tráfego irrelevante, piora material de qualidade/custo, falha de atribuição, duplicidade ou saturação; retornar a Maximizar conversões apenas quando houver histórico limpo e aceito suficiente.

### 22 de agosto de 2026 — complemento: aliases de anúncio corrigidos nas demais campanhas

- **Status:** publicado no Google Ads e verificado por entidade; monitoramento iniciado.
- **Escopo:** `S_BR_SP_BLEFAROPLASTIA`, `S_BR_SP_LIFTING_CERVICAL`, `S_BR_SP_CIRURGIA_FACIAL` e `S_BR_SP_MARCA`; `S_BR_SP_OTOPLASTIA` e `S_BR_SP_LIFTING_FACIAL` permaneceram sem edição.
- **Mudança:** cinco anúncios deixaram de sobrescrever os códigos canônicos com aliases legados. BLEF deixou `g26f03`; os dois anúncios CERV deixaram `g26f02`, e `AG_LIPO_PAPADA` deixou também o `_ag` cervical incorreto; FACE deixou `g26f00` e `ag_cirurgia_facial_sp`; MARCA deixou `g26b01`. Depois do salvamento, o Google Ads normalizou os pares redundantes e os anúncios passaram a herdar `G26BLEF`, `G26CERV`, `G26FACE`, `G26MARCA` e os grupos canônicos já existentes.
- **Motivo e evidência:** entre 17 e 20/08, cinco de sete contatos Google chegaram ao agregado com `G26F01` ou `G26F02`, embora o ledger operacional mostrasse os eventos como `resolved`, `google_coded` e sem fallback. A inspeção ao vivo provou a precedência dos parâmetros do anúncio sobre os níveis canônicos.
- **Hipótese:** retirar as sobrescritas fará os novos contatos resolverem campanha e grupo corretos sem mudar entrega.
- **Métrica principal:** proporção de novos contatos Google com código `G26...` canônico e `_ag` correto; downstream por contato válido, qualificado e consulta somente depois de volume e janela mínimos.
- **Guardrails:** orçamento total preservado em R$ 87/dia; zero mudança de lance, meta, ação de conversão, rede, texto, URL, site ou WhatsApp; zero backfill dos aliases históricos; zero PII.
- **Revisão:** primeiro contato Google elegível após a correção; leitura de sete dias completos em 30/08 e de 14 dias completos em 06/09.
- **Regra para manter:** manter se os novos contatos chegarem com códigos canônicos, sem perda de click ID, duplicidade ou efeito lateral.
- **Regra para reverter:** restaurar exatamente os overrides anteriores dos cinco anúncios somente diante de perda de atribuição ou efeito colateral comprovado; não reverter por oscilação de CTR, clique ou volume isolado.

### 22 de agosto de 2026 — calibração das recomendações semanais do Google Ads

- **Status:** publicada e verificada em 31/08/2026.
- **Área:** rotina somente leitura `12117745` e triagem do e-mail semanal de 17/08; nenhuma mudança de orçamento, lance, meta, site ou WhatsApp.
- **Mudança:** o commit `ee5df71` consolidou variações de preço por campanha/grupo, preservou seis negativas de roteamento confirmadas ao vivo, manteve acionável o autobloqueio cervical por `"lipoaspiração de papada"`, passou a validar metas personalizadas e corrigiu duas consultas que retornavam `N/D`. A versão viva atual também inclui o suporte ao agregado v2 incorporado depois dessa calibração. O e-mail agora declara truncamento.
- **Motivo e evidência:** o assunto contava 100 sugestões, mas o corpo mostrava 50; 39 das 40 linhas visíveis em `Aguardar dados` eram o mesmo problema de preço em BLEF. O alerta de seis campanhas com `biddable=false` ignorava que todas exibem `Lead qualificado GCLID — campanhas (personalizada)`. Seis das sete negativas P0 eram roteamentos intencionais; somente a negativa cervical conflita com o próprio `AG_LIPO_PAPADA`.
- **Validação:** a versão final passou em `19/19` testes locais. A proprietária `aschroeder.br@gmail.com` salvou o script `12117745` às 00:25 de 31/08; a releitura coincidiu com o repositório no SHA-256 normalizado `31c79e957f58664317da92960ced718957ff4813fa37d785479495fc5fd346d7`. A prévia das 00:27 concluiu em 22 segundos, mostrou `Sem alterações`, enviou o relatório a `daniel.added@gmail.com`, registrou zero alertas críticos, 23/23 fontes `OK` e nenhuma limitação técnica adicional. Nome, proprietário e programação diária `09:00–10:00` foram preservados; nenhuma entidade de campanha foi modificada.
- **Hipótese:** reduzir falsos P0 e duplicação fará o relatório concentrar a revisão humana em problemas técnicos distintos, sem esconder linguagem legítima nem confundir meta personalizada com configuração inativa.
- **Métrica principal:** proporção de alertas acionáveis e fontes `OK`/`N/D`; secundariamente, cobertura canônica e passagem de qualificado para consulta.
- **Guardrails:** rotina somente leitura; nenhuma recomendação aplicada automaticamente; orçamento total R$ 87/dia; site e `S_BR_SP_LIFTING_FACIAL` inalterados; remoção da negativa cervical somente de forma isolada e reversível.
- **Revisão:** acompanhar a primeira execução programada posterior à publicação e repetir a leitura de 14 dias completos em 06/09; o gate OTO em 03/09 não encerra teste inexistente.
- **Regra para manter:** manter a calibração se a prévia e os relatórios distinguirem corretamente meta personalizada, roteamento, intenção de preço e `N/D`, sem perder alertas reais.
- **Regra para reverter:** restaurar a versão anterior do script se a execução falhar ou omitir uma fonte real; não remover a programação existente como atalho de publicação.

### 26 de agosto de 2026 — preferência humana de dez minutos com retomada contextual

- **Status:** publicada e verificada no Netlify; nenhuma campanha, verba, lance, página, planilha ou Apps Script foi alterado.
- **Mudança:** depois de uma saída humana, a Bruna aguarda no mínimo dez minutos desde a entrada mais recente da paciente. Nova entrada reinicia o prazo e nova saída humana cancela a pendência. Ao vencer, a rotina relê os 20 turnos atuais e pode responder uma nova dúvida segura e autônoma sem depender da redação exata anterior da equipe.
- **Motivo e evidência:** uma pergunta objetiva sobre valor ficou sem continuidade porque o takeover exigia um convite humano literal, embora o contexto completo permitisse uma resposta segura. A resposta imediata também não seria desejável, pois tiraria da equipe a preferência de condução.
- **Hipótese:** a janela prática de dez a quinze minutos preserva a prioridade humana e reduz silêncios incorretos sem ampliar preço, agenda ou risco clínico.
- **Métrica principal:** taxa de perguntas seguras respondidas após takeover, tempo até resposta e cancelamentos corretos por nova atividade humana.
- **Guardrails:** zero resposta antes de dez minutos; cada nova entrada reinicia o prazo; qualquer nova saída humana cancela; no máximo uma retomada automática por geração; agenda final, cuidado clínico, opt-out, encerramento, preço sem contrato e duplicidade continuam fechados.
- **Publicação:** código funcional `7507365726e354a4c3a447c06c552990e6667228`, deploy Netlify `6a8f8650e288813cf709de85`, 1099/1099 testes integrais, arquitetura, build de 178 arquivos e 44 URLs aprovados; domínio e URL imutável HTTP 200, webhook `active` e assinatura inválida recusada com HTTP 401. Nenhuma mensagem real foi enviada.
- **Data de revisão:** primeiras ocorrências elegíveis e consolidação em 2 de setembro de 2026.
- **Regra para manter:** manter com zero competição ou duplicidade e queda de perguntas seguras sem resposta.
- **Regra para reverter:** restaurar o código `6e16f20a966a979b082ed20f249f382bb8fbbd4e` e o deploy `6a8f6edc9cf872000807c45c` diante de resposta precoce, competição humana, procedimento ou preço incorreto, ou quebra de proteção clínica/operacional.

### 31 de agosto de 2026 — correção de demanda cervical e conteúdo preparado para busca com IA

- **Status:** execução autorizada; candidato local aprovado nos testes focais e publicação pendente do preflight do commit exato.
- **Área/campanha:** `S_BR_SP_LIFTING_CERVICAL`, grupos `AG_CERVICOPLASTIA` e `AG_LIPO_PAPADA`, páginas `/lifting-cervical/` e `/lipo-de-papada/`.
- **Evidência:** em 01–30/08 a campanha teve 339 cliques, R$ 393,02 de gasto e 2 leads qualificados importados. Cervicoplastia respondeu pelas duas conversões; lipo de papada teve 159 cliques e R$ 181,89 sem conversão qualificada. A lista viva continha duas negativas de frase que bloqueavam `lipoaspiração de papada`, e o sitelink compartilhado de consulta levava a um fragmento de resultados.
- **Mudança autorizada:** remover somente as duas negativas conflitantes; corrigir somente o destino do sitelink `Agende Sua Consulta`; publicar nas duas páginas uma resposta curta e textual, sinônimos cirúrgicos visíveis, autoria/revisão médica datada e dados estruturados coerentes. Preservar os seis CTAs e a atribuição de WhatsApp de cada página.
- **Motivo:** recuperar procura cirúrgica bloqueada, manter a promessa do sitelink e facilitar a compreensão do conteúdo por pessoas, Google e sistemas de busca com IA sem recorrer a arquivos ou marcações sem suporte.
- **Hipótese:** mais cobertura de consultas cirúrgicas aderentes e melhor continuidade sem ampliar tráfego não cirúrgico nem promessa clínica.
- **Métrica principal:** contatos válidos, leads qualificados, consultas agendadas/realizadas e custo por etapa em CERV e LIPO; termos, impressões, cliques e sitelinks apenas como diagnóstico.
- **Guardrails:** R$ 12/dia, Maximizar cliques, meta qualificada, redes, cidade, agenda, dispositivos, RSAs e as 12 negativas não cirúrgicas permanecem inalterados; nenhuma mensagem real; nenhum Apps Script, LEADS ou CRM.
- **Data de revisão:** integridade em 24 horas; leitura de negócio em 7 e 14 dias após a publicação real.
- **Regra para manter:** manter se a cobertura cirúrgica aumentar sem piora consistente da qualidade downstream e se páginas, CTAs, canonical e rastreamento permanecerem íntegros.
- **Regra para reverter:** restaurar apenas o componente defeituoso diante de destino incorreto, perda de tracking, tráfego incompatível consistente ou regressão editorial/médica; não reverter por CTR ou oscilação de clique isolada.
