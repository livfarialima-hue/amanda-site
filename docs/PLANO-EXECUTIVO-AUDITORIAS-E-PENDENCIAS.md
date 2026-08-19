# Plano executivo — auditorias, pendências e prazos

**Status:** fonte canônica executiva para decidir o que fazer, quando executar e quando publicar

**Atualizado em:** 19 de agosto de 2026, 18:18, America/Sao_Paulo

**Escopo:** auditoria Google Ads de 14/08/2026 e auditoria SEO, IA e atribuição de 15/08/2026

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

**Estado geral:** produção contextual `2026-08-19.3` publicada e verificada. A versão `2026-08-19.4` foi autorizada e está em publicação para responder, no mesmo turno, as partes gerais de perguntas compostas sobre duração, recuperação e possíveis indicações de lifting facial, sem concluir duração exata ou indicação individual. O incidente de integridade foi corrigido nas versões 102/103 e a última divergência funcional do Apps Script foi encerrada na v104 com a sincronização autorizada de `CentralAtendimento.gs`. Os 22 arquivos do Apps Script estão funcionalmente alinhados ao repositório; as quatro diferenças remanescentes são somente ausência de quebra de linha final e não alteram execução. **876/876 testes** passaram e nenhuma mensagem real foi enviada. A projeção deste plano no Drive deve permanecer no mesmo arquivo e reproduzir este conteúdo após o fechamento.

- `HOTFIX-APPSSCRIPT-2026-08-19` está `CONCLUÍDO E VERIFICADO`: a v102 restaurou `Retomadas.gs`; a v103 restaurou `LeadClassification.gs` e repôs apenas o bloco `templateId` aprovado em `Code.gs`, sempre no mesmo deployment. Os 22 arquivos foram comparados; quatro diferenças eram somente fim de linha, e nenhuma outra corrupção foi encontrada. O teste de token inválido confirmou `Nenhuma preferência foi alterada`;
- `SYNC-CENTRAL-ATENDIMENTO` está `CONCLUÍDO E VERIFICADO`: após autorização específica, `CentralAtendimento.gs` foi publicado integralmente na v104 conforme o commit `7e37eb3`. Ofertas comerciais antigas ficam em revisão silenciosa e só são encerradas por ação humana; `21/21` testes focados e `865/865` integrais passaram. Não houve atualização ao vivo da Central nem mensagem real;

- `2026-08-19.4 — PUBLICAÇÃO AUTORIZADA E EM ANDAMENTO`: a IA decompõe perguntas compostas de lifting facial e recebe fatos gerais aprovados sobre duração variável, recuperação gradual e critérios usuais; a resposta delimitada só é usada após confirmação semântica. Duração exata, indicação individual, agenda e demais travas clínicas continuam protegidas. O ledger durável recuperado deixa de ser descartado quando a memória auxiliar falha. **876/876 testes** locais aprovados; Apps Script v104 preservado e nenhuma mensagem real enviada;
- `2026-08-19.3` está `PUBLICADA E VERIFICADA`: respostas em turnos com `maxLinks: 0` retiram a frase que contém um link espontâneo e passam novamente por todas as travas; o texto entregue é o mesmo persistido, e conteúdo vazio ou ainda incompatível continua em revisão humana. Código funcional `5bb65664798b1d5ca5885fc75b07ec45dbf18833`, deploy Netlify `6a85e288a72ee70008cc87b2`, Apps Script v104 preservado, **867/867 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-19.1` está `PUBLICADA E VERIFICADA`: prefill estruturado neutro sem qualificação, conversão ou agenda pelo template isolado; primeira resposta sem salto prematuro; perfil comercial sem nome; resposta humana a foto; equivalência comunicacional `cervicoplastia (lifting cervical)`; e aprovação manual de retomada corrigida. Código funcional `35b4b5a3d7f5e33cdebfe9d904a75843264ac5fe`, deploy Netlify `6a858294fc30270008e0964a`, Apps Script v101 no deployment preservado, **851/851 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-19.2` está `PUBLICADA E VERIFICADA`: a pergunta `E gostaria de saber os valores` aciona a resposta inicial cervical aprovada, sem números; toda primeira pergunta de preço com procedimento confiável recebe no máximo um guia regional — facial para face/pescoço, mama para cirurgias mamárias e corporal para corpo/íntima — e esse link não se repete no turno da faixa. O aceite cervical posterior autoriza uma única faixa com ressalvas; sem guia facial anterior, a página específica de lifting entra como fallback. Outras faixas, repetição, agenda e contexto humano permanecem protegidos. Código funcional `97da5c3a289062c9face0313418fe1beb7e3accf`, deploy Netlify `6a8599b25b653800085f9f95`, Apps Script v101 preservado, **865/865 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-18.5` está `PUBLICADA E VERIFICADA`: histórico durável da oportunidade, autoria explícita, 32 turnos recentes, reidratação do cache, estado semântico entre turnos e interpretação contextual de respostas curtas; código funcional `6fd37c3227e6fee1ca4ea1686248cb22733040f1`, deploy Netlify `6a84facdbed81175d2df0107`, Apps Script v100, **843/843 testes**, build de 178 arquivos e 44 URLs aprovados;
- `2026-08-18.4` ficou preservada como antecessora: respostas curtas que aceitam uma oferta informativa após fala humana passaram a exigir `CONTEXT-CONTINUE-01` ou esclarecimento seguro, mantendo barreira de agenda e proteção contra corrida com a equipe;
- mensagens textuais elegíveis agora são compreendidas contextualmente pela IA antes da decisão de resposta; mensagem curta, pontuação informal ou ausência de memória local não bastam para encaminhar ao humano;
- o contexto operacional durável fica na aba `_WHATSAPP_MENSAGENS` da planilha canônica, não em um banco ou pasta paralela no Drive; cada turno distingue `paciente`, `bruna` e `equipe_humana`, e respostas entregues pela Bruna são registradas sem abrir uma segunda classificação;
- na produção atual, toda mensagem textual elegível passa primeiro pela IA, inclusive perguntas coloquiais sem `?`; padrões mecânicos servem como pistas, e cópias determinísticas só são usadas após confirmação semântica de código, procedimento, profissional e cobertura integral do pedido;
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
- na versão `2026-08-19.2`, a primeira pergunta sobre preço cirúrgico recebe resposta breve e empática, sem lista técnica ou faixa, mais um único guia de composição conforme a região confirmada; nunca se usa o guia facial para mama, corpo ou cirurgia íntima, e o material não é repetido no turno da faixa. A pergunta sobre o que mais incomoda continua proibida nesse momento, e as travas de revisão humana foram preservadas;
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
- código ativo no commit funcional `5bb65664798b1d5ca5885fc75b07ec45dbf18833`, deploy Netlify `6a85e288a72ee70008cc87b2` e Apps Script v104 no deployment preservado, com **867/867 testes aprovados**, build local de 178 arquivos, 44 URLs sem erro, domínio, URL imutável e webhook HTTP 200 com automação ativa e metadados de versão `.3` efetivos; rollback imediato do Netlify para deploy `6a8599b25b653800085f9f95`, commit `97da5c3a289062c9face0313418fe1beb7e3accf`;
- fonte ativa única no Drive: https://drive.google.com/file/d/17eOwn4Z7v7josBnnPJhBHn31wY-2P1YF/view; projeção substituída no mesmo ID e igual ao manual local pelo SHA-256 `34441c512b6bd2c07095349ac8479fd1abacbfbe4cee0281ed0eedb396e48419`; auditoria comparativa fechada: https://drive.google.com/file/d/1Fw12uukeIa2qKx-a-teI9BQhobNUdHVB/view; os três planos de origem foram preservados e rotulados em `99 — Histórico operacional`;
- a pasta restrita `90.1 — Exportações brutas do WhatsApp` (`1Y_Cn4vAkN0mV_k8RV1VvAtYMSVScF7qS`) é a entrada contínua de evidências; respostas reais não são padrão, dados identificáveis não saem do Drive e somente padrões desidentificados aprovados viram cenários sintéticos versionados;
- nenhuma mensagem de teste nem sonda de paciente foi disparada por nós; na observação passiva, a sequência real seguinte chegou às 20:57, sofreu `timeout`/`busy_retry` no roteamento, foi recuperada por retentativas, suprimiu corretamente a abertura Meta mais antiga e concluiu a resposta à mensagem mais recente com entrega HTTP 200 às 20:58:30;
- essa evidência confirma o funcionamento do webhook, da recuperação e da entrega da Bruna após a publicação; ainda não existe garantia absoluta para eventos que a YCloud deixe de entregar ao Netlify, hipótese que exige o log bruto do provedor;
- rollback imediato do estado atual: deploy `6a8599b25b653800085f9f95`, commit `97da5c3a289062c9face0313418fe1beb7e3accf`.
- governança de versões consolidada em 18/08: commit `1c3f556`, deploy Netlify `6a842ffa9399100008f5a827`, PR `#6`, com **760/760 testes aprovados**; o release adicionou gate de consistência, reconciliação segura do checkout, recibo único no manifesto, normalização de fim de linha e bloqueio de duplicatas/pacotes transitórios, sem alterar respostas ou regras da Bruna;
- o índice único do Drive foi atualizado no mesmo arquivo `1nOzoVrL1TwK-oFLyOC_uO5gy01Cf14If`, sem criar cópia; ele aponta para a projeção ativa, para a pasta restrita contínua `90.1` e explicita que respostas reais são evidência crítica, não padrão. A projeção ativa da Bruna permaneceu idêntica ao manual local, com três fontes históricas, uma auditoria fechada e a pasta de mudanças em andamento vazia;
- a reconciliação do checkout principal foi concluída em 18/08 após a liberação de escrita em `.git`: HEAD local e remoto ficaram idênticos ao commit de produção `4eb5fb5`, deploy Netlify `6a843b14f04aa60008570fdf`, PR `#8`; o gate final retornou `OPS_CHECK_STATUS=OK` e **760/760 testes aprovados**. O release normalizou exclusivamente CRLF para LF em 13 arquivos legados, com diff funcional vazio e sem alterar respostas, regras ou integrações da Bruna.

### Auditoria 1 — Google Ads

**Estado geral:** correções imediatas concluídas; experimentos e provas futuras estão programados.

Já foi feito:

- importação insegura pausada e eventos legados colocados em quarentena;
- IDs opacos, códigos canônicos, URLs e orçamento corrigidos;
- orçamento total retornado a R$ 87/dia e lifting cervical a R$ 12/dia;
- negativas de preço genéricas perigosas foram evitadas;
- nenhuma campanha nova, Performance Max, ampla, tCPA ou aumento foi aplicado;
- testes de anúncios foram colocados em sequência para não misturar efeitos.
- rotina somente leitura de revisão do Google Ads publicada como script `12117745`, autorizada, testada sem mudanças e com programação diária `09:00–10:00` ativa;
- agregado anônimo do funil publicado pelo Apps Script versão `92`, com trigger diário aproximadamente às `08:15` e sem PII.

Ainda falta:

- provar a conversão offline e a jornada anúncio → site → WhatsApp → LEADS/CRM;
- confirmar ao vivo e, se ainda ausentes, aplicar as três negativas exatas de roteamento do grupo geral de lifting;
- normalizar novos contatos com códigos G26 canônicos: no primeiro agregado, os 16 contatos Google de 30 dias permaneceram em campanha desconhecida por usarem referências antigas/ambíguas; não reinterpretar o histórico por inferência;
- manter Meta facial em 40+ e, no gate de 20/08, decidir se o Google deve excluir apenas `18–24` e `25–34` nas campanhas faciais não otoplastia; preservar sempre a idade `Desconhecida`;
- executar os testes de RSA um por vez;
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
| diariamente, 09:00–10:00 | Google Ads: saúde automatizada | `ATIVO` desde 15/08; execução real concluída às 21:35 | gasto por mesmo dia da semana, entrega, políticas, páginas, meta qualificada, fontes e funil; cooldown de 48 h | e-mail automático; zero mutação na conta | script `12117745` concluiu sem mudanças; nenhum e-mail no sábado porque não havia alerta crítico |
| toda segunda, 09:00–10:00 | Google Ads: revisão tática automatizada | `ATIVO`; primeiro envio ampliado em 17/08 | semana + 30 dias; termos, positivas, negativas completas, Quality Score, conversões/metas, RSAs/recursos, segmentos, páginas, mudanças e funil | e-mail automático; alterações continuam manuais e autorizadas | revisar os três primeiros relatórios ampliados e calibrar falsos positivos comprovados |
| primeiro dia útil do mês, 09:00–10:00 | Google Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 01/09 | acrescentar 90 dias, eficiência do funil, cenários dentro de R$ 87/dia e prontidão de testes | e-mail automático; nenhuma execução de recomendação | fontes íntegras, mudanças datadas e funil reconciliado antes de decidir |
| diariamente, aproximadamente 08:25 | LEADS → Meta Ads: agregado anônimo | `ATIVO` desde 16/08; Apps Script v104 | atualizar 7/30/90 dias por caminho, campanha e criativo conhecido na aba `Meta_Agregados` | grava somente contagens no arquivo agregado; nenhum dado de paciente | schema v1, zero PII, atualização <36 h e códigos conflitantes como N/D |
| diariamente, aproximadamente 10:05 | Meta Ads: saúde automatizada | `ATIVO` desde 16/08; Apps Script v104 | gasto no mesmo dia da semana, entrega/status, idade facial, páginas, fonte e funil; todo e-mail enviado inclui resumo 7/30 de mídia e funil | e-mail somente para alerta crítico; zero mutação | token `ads_read` protegido, conta validada, Graph `v26.0` e execução real sem escrita |
| toda terça-feira, aproximadamente 10:05 | Meta Ads: revisão tática automatizada | `ATIVO`; primeiro envio completo em 18/08 | 7 dias, sete anteriores e 30 dias; campanha, conjunto, anúncio, criativo/vídeo, segmentos, páginas e funil | e-mail automático; alterações continuam manuais e autorizadas | conferir os três primeiros relatórios e calibrar apenas falso positivo comprovado |
| 17/08, após gates técnicos | Meta Ads: lifting facial contínuo + experimento cervical Site × WhatsApp | `PUBLICADO; INÍCIO 12H` | `M26F01W/C06H01`, `M26C01W` direto e `M26C02S` via `/lifting-cervical/`; R$ 300 total por campanha, 17/08 12h–01/09 12h; Feed 1:1 e Reels/Stories 9:16 | código/Apps v97/schema/sonda publicados primeiro; depois três publicações seletivas, cada uma com 1 campanha + 1 conjunto + 1 anúncio | conferir a entrega real, idade efetiva e primeiros eventos; não mudar público, orçamento, destino ou criativo durante a janela |
| 20/08 19:30–19:50 | Instagram orgânico: Reels de lifting cervical | `AGENDADO` | publicar o vídeo 9:16 aprovado; manter `Clique no link da bio`; conferir link da bio e separar origem orgânica | publicação manual no Instagram | não reutilizar o post como anúncio nem atribuir o tráfego orgânico aos braços pagos |
| 18/08, após o relatório Meta | Meta WhatsApp: confirmar entrega etária | `CONDICIONAL À PUBLICAÇÃO` | conferir `age_min=40` e distribuição real por idade nos três novos conjuntos; não reabrir a migração do objeto histórico se o novo desenho funcionar | leitura e eventual correção só com autorização | novo `M26F01W` publicado seletivamente e sem expansão abaixo de 40 |
| segundo dia útil do mês, aproximadamente 10:05 | Meta Ads: revisão estratégica automatizada | `ATIVO`; primeira leitura em 02/09 | acrescentar 90 dias, eficiência até consulta e prontidão de testes | e-mail automático; nenhuma recomendação aplicada | fontes íntegras; o cálculo considera segunda a sexta e não infere feriados |
| 17/08 17:30–18:00 | Suporte de tags do Google | `AGENDADO` | diagnóstico da implementação; registrar recomendações e evitar mudanças não planejadas | não aplicar mudança ampla durante a chamada | backup, acesso correto e escopo registrado |
| 20/08 12:30–13:15 | Cervical Site × WhatsApp: saúde D+3 | `AGENDADO` | conferir equilíbrio de gasto, idade efetiva, códigos, LPV, CTA, conversas e contatos identificados | corrigir somente falha técnica; pausar ambos se o Site não for rastreável | três dias desde o início programado; dia parcial de lançamento excluído da leitura de desempenho |
| 20/08 09:00–11:00 | Google Ads: prova segura e decisão etária | `AGENDADO` | testar conversão offline e E2E; confirmar negativas exatas; manter Meta facial em 40+; decidir se exclui `18–24` e `25–34` somente em LIFT, BLEF, CERV e FACE; iniciar somente RSA adulto de otoplastia se tudo passar | possível escrita em Ads/importação, somente após autorização no momento | zero PII, zero duplicidade, receipt por evento, origem preservada e idade `Desconhecida` mantida |
| 20/08 11:15–12:00 | CWV, vídeos e recursos | `AGENDADO` | medir laboratório/campo e 4G; abrir causas reais de recursos/logotipos | nenhuma otimização automática | baseline reproduzível; uma classe de ativo por futuro teste |
| 20/08 14:00–14:45 | Compliance e imagens | `DEPENDE DE VOCÊS` | revisar inventário, consentimentos, galerias, imagens sensíveis/menores e Codame | nenhuma remoção/publicação sem parecer | documento/parecer humano e escopo registrado |
| 18/08 15:30–16:00 | Atribuição rica: checagem de 24 horas | `AGENDADO` | erros, logs sem PII, purge, JID fora do resolvedor, perda de origem, LEADS/CRM e sinais de rollback | nenhuma nova expansão | ativação em 17/08; reverter diante de PII, atribuição incorreta, first touch sobrescrito ou regressão de atendimento |
| 20/08 15:00–16:00 | Atribuição rica: saúde D+3 e retenção | `AGENDADO` | purge, consentimento, resolução/fallback, origem, LEADS/CRM, Calendar, rota e SLA | não repetir deploy ou migração | correlacionar com a saúde Meta sem misturar métricas |
| 24/08 12:30–13:15 | Cervical Site × WhatsApp: primeira decisão D+7 | `AGENDADO` | comparar contatos identificados, válidos, qualificados e agendados por rota | manter ou pausar segundo o plano; não trocar criativo | cobertura ≥80%; pausar um braço se gastar ≥R$ 150 sem contato válido com tracking saudável |
| 27/08 09:00–10:00 | Google Ads: saúde de 7 dias | `AGENDADO` | receipts, duplicidade, códigos, funil e qualidade; se a decisão etária tiver sido aplicada, comparar volume/gasto/qualidade por idade sem confundir com outras mudanças | não decidir RSA nem idade por amostra insuficiente | sete dias reais desde a prova; mudança etária isolada e data efetiva registrada |
| 24/08 14:00–14:30 | Atribuição rica: 7 dias | `AGENDADO` | erros, resolução/fallback, origem, LEADS/CRM, Calendar/SLA e logs | manter ou reverter; nenhuma expansão | janela iniciada em 17/08 |
| 27/08 11:00–11:30 | Atualização executiva | `AGENDADO` | atualizar este plano, Drive, datas e decisões | nenhuma | checkpoints anteriores encerrados |
| 01/09 12:30–13:30 | Cervical Site × WhatsApp: decisão D+15 | `AGENDADO` | fechar contatos, qualificados, agendados e custos por rota; declarar N/D se a amostra não separar | eventual continuidade exige nova autorização | orçamento encerrado às 12h, cobertura ≥80% e nenhuma quebra operacional |
| 03/09 09:00–10:00 | Google Ads: decisão OTO; possível início CERV; idade em 14 dias | `AGUARDAR DADOS` | encerrar OTO e iniciar CERV somente se elegível; se a idade Google mudou em 20/08, avaliar 14 dias de gasto, contatos válidos e qualidade por faixa | mudança de um RSA por vez; não ampliar a exclusão etária | 14 dias e, preferencialmente, ≥50 cliques; data efetiva da mudança etária registrada |
| 31/08 14:00–14:30 | Atribuição rica: 14 dias | `AGUARDAR DADOS` | avaliar estabilidade, reconciliação, purge, consentimento e incidentes | manter ou reverter | janela iniciada em 17/08 |
| 08/09 12:30–13:15 | Cervical Site × WhatsApp: latência D+22 | `AGENDADO` | incorporar classificações, comparecimentos e agendamentos tardios | nenhuma nova mudança simultânea | sete dias após o fechamento do ciclo |
| 16/09 10:00–11:00 | Aqui Ads: decisão e pré-voo do piloto OOH | `AGENDADO; COMPRA NÃO AUTORIZADA` | revalidar shortlist de dois residenciais premium e um salão/spa, preço, audiência, peça, compliance, rastreamento e capacidade | nenhuma compra sem autorização específica no momento | Meta/atribuição encerradas ou estáveis, sem outra mudança material; verba incremental de aproximadamente R$ 1.206,20 confirmada |
| D+7 do piloto Aqui Ads | OOH: saúde técnica | `CONDICIONAL À ATIVAÇÃO` | validar QR, landing/WhatsApp, classificação de origem e disponibilidade dos pontos | corrigir apenas falha técnica; nenhuma troca de local/peça por amostra precoce | sete dias completos desde a veiculação real e cobertura de atribuição mensurável |
| D+14 do piloto Aqui Ads | OOH: leitura intermediária | `CONDICIONAL À ATIVAÇÃO` | ler busca de marca, direto, Perfil da Empresa, contatos válidos, qualificados e consultas | nenhuma renovação ou escala | tracking saudável e nenhuma mudança concorrente |
| D+28 do piloto Aqui Ads | OOH: decisão de continuidade | `CONDICIONAL À ATIVAÇÃO` | encerrar quatro semanas e classificar manter, não renovar ou inconclusivo | renovação somente com nova autorização | cobertura ≥80% e sinal de negócio; métricas da plataforma são apenas diagnóstico |
| D+35 do piloto Aqui Ads | OOH: latência | `CONDICIONAL À ATIVAÇÃO` | incorporar qualificações e agendamentos tardios e fechar o registro | nenhuma nova mudança simultânea | sete dias após o término da veiculação |
| 17/09 09:00–10:00 | Google Ads: decisão CERV; possível início BLEF | `AGUARDAR DADOS` | decidir CERV e, se elegível, iniciar BLEF | um teste por vez | CERV encerrado e tracking saudável |
| 14/09 14:00–14:30 | SEO/IA/atribuição: 28 dias | `AGUARDAR DADOS` | GSC, GA4, CWV, crawlers, origem e funil | nenhuma nova hipótese no mesmo momento | janela pós-ativação completa desde 17/08 |
| 01/10 09:00–10:00 | Decisão BLEF; possível início FACE | `AGUARDAR DADOS` | decidir BLEF e iniciar FACE somente se elegível | um teste por vez | BLEF encerrado; manter linguagem leiga legítima |
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
| Conversão offline Google e receipts | P0 | `AGENDADO` para 20/08 | religar somente com receipt e reconciliação por evento |
| Meta → site → WhatsApp → LEADS/CRM | P0 | sonda sintética aprovada; ciclo real `EM MONITORAMENTO` | conferir cobertura e consistência em D+3/D+7 antes de declarar o caminho funcional ao vivo |
| Atribuição rica J0/J1/J2 | P0 | `ATIVA` desde 17/08; risco JID aceito | monitorar resolução, fallback, encaminhamento, duplicidade e rollback |
| Schema/identidade da LEADS | P0 | schema v1 habilitado no Apps Script v97 | reconciliar LEADS/CRM e não repetir migração sem novo preflight |
| Calendar, rotas e SLA | P0/P1 | `AGUARDAR DADOS` | reconciliar após migração/sonda |
| Experimentos Google Ads | P1 | sequência agendada | OTO → CERV → BLEF → FACE → LIFT preço |
| Rotina automatizada Google Ads | P1 | `ATIVO` desde 15/08; script `12117745`, diário 09:00–10:00 | revisar os três primeiros relatórios e calibrar somente falsos positivos comprovados |
| Rotina automatizada Meta Ads | P1 | `ATIVO` desde 16/08; Apps Script v104; somente leitura | conferir os três primeiros relatórios completos e calibrar somente falsos positivos comprovados |
| Meta — LIFT contínuo + CERV Site × WhatsApp | P1 | `PUBLICADO; EM MONITORAMENTO` desde 17/08 | manter somente `M26F01W/C06H01` no WhatsApp e analisar separadamente; comparar apenas `M26C01W` × `M26C02S`; nenhuma troca de criativo, rota, público ou orçamento durante a janela |
| Idade das campanhas faciais | P1 | Meta 40+ mantido; Google `AGENDADO` para decisão em 20/08 | considerar excluir apenas `18–24` e `25–34` em LIFT/BLEF/CERV/FACE; manter `Desconhecida` e não alterar OTO/marca/rino |
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

Os compromissos sobrepostos de 27/08 e 17/09 foram escalonados. O evento de 20/08 foi corrigido para não repetir a publicação default-off, e foram criadas as checagens condicionais de 24 horas e 14 dias. Os lembretes de lifting também foram alinhados à decisão de explicar composição e orçamento individual sem reintroduzir faixa cirúrgica pública. A decisão etária ficou no mesmo gate: Meta facial permanece em 40+; Google será decidido em 20/08 e, se alterado, observado em 27/08 e após 14 dias completos.

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
