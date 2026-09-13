# Arquitetura da jornada da paciente

**Status:** contrato canônico de modularidade e responsabilidade

**Objetivo:** permitir ajuste fino do bot, funil, retomadas, agenda e atribuição sem ampliar silenciosamente o efeito de uma mudança local.

Este documento complementa a governança operacional. Ele não substitui o norte estratégico, os contratos clínicos, o manual da Bruna nem os registros canônicos do Apps Script.

**Extensão candidata Bruna/equipe — 12/09/2026:** `human-resume-policy.mjs` decide elegibilidade e texto determinístico de recebimento; `human-resume-queue.mjs` mantém geração, entrada atual, entrega de alerta e reserva única de aviso com escrita condicional. O processador relê histórico durável e preferências e conserva compromissos. `outbound-reply-gate.mjs` relê a autorização imediatamente depois de reservar o envio; não assume que a ausência de erro de IA permite responder. `LeadClassification.gs` mantém a confirmação de recebimento como pendência da clínica. Consumidores e regressão cruzada estão no contrato `bruna-conversation-safety`; filas e gatilhos existentes são reutilizados.

## Candidato de continuidade e classificação — 12/09/2026

Implementação testada localmente, pendente de publicação; evidência em `auditorias/bruna-conversao-leads-2026-09-12/RELATORIO.md`.

- `lead-classifier.mjs` preserva autoria e conteúdo indisponível, prioriza o contexto mais recente e impede qualificação por prefill/mídia sem evidência pessoal.
- `LeadClassification.gs` ordena antes de limitar, confere telefone/profissional mesmo com oportunidade vinculada e relê a autoria no momento de concluir a gravação. O worker não devolve a transcrição na conclusão. Baixa confiança não avança fase nem escreve marco administrativo; versão de conversa divergente volta à fila antes de qualquer sincronização.
- `Relacionamento`, `Responsável atual` e `Aguardando ação de` são dimensões distintas. Intervenção humana não libera takeover; cuidado ativo e responsável humano são preservados. Origem e colunas manuais não são inferidas novamente.
- `human-review-envelope.mjs` fornece ação necessária, responsável, rascunho seguro e contexto; `ycloud-review-alert.mjs` transporta o e-mail até 10 mil caracteres independentemente da disponibilidade/cooldown do alerta WhatsApp. Rascunho ausente ou excessivo não vira texto incompleto pronto para copiar. `Code.gs` mantém deduplicação por evento.
- A regressão cruzada `bruna-marketing-care.integration.test.mjs` cobre os consumidores de conversa, classificador, CRM, marcos e e-mail sem efetuar rede ou escrita reais.

## 1. Princípio central

Cada decisão deve ter um único dono. Módulos de política interpretam dados e devolvem decisões puras; módulos de efeito executam rede, persistência, agenda ou envio somente depois dos gates aplicáveis.

Uma alteração pequena não pode mudar ao mesmo tempo:

- o que a paciente quis dizer;
- qual oportunidade representa essa conversa;
- se o bot pode responder;
- o texto final enviado;
- a fase comercial;
- a agenda;
- e a conversão atribuída ao marketing.

Quando mais de uma dessas dimensões precisar mudar, cada contrato deve ser alterado e testado explicitamente.

## 2. Fluxo e proprietários

| Camada | Responsabilidade | Proprietário principal | Não deve decidir |
|---|---|---|---|
| Entrada | validar, normalizar e deduplicar o evento recebido | `ycloud-webhook.mjs` | conteúdo clínico, envio final ou fase comercial por suposição |
| Contexto de automação | normalizar `off`, `shadow` e `active` | `automation-mode.mjs` | enviar mensagens ou acessar ambiente/rede |
| Contexto de marketing | reconhecer template, prioridade de prefill e códigos Google/Meta | `marketing-prefill.mjs` | qualificar lead ou agendar consulta |
| Contexto de procedimento | resolver procedimento falado, campanha e histórico recente | `procedure-context.mjs` | prometer indicação, preço ou resultado |
| Permissão de faixa cirúrgica | lista autorizada, variante facial e validação exata de valores | `surgical-price-policy.mjs` | inferir autorização a partir da tabela interna ou de aprovação de cuidados |
| Rascunho de preço e fonte | gerar texto com ressalva e referência histórica compatível para revisão | `surgical-price-review.mjs` | enviar valores não autorizados ou transformar fonte histórica em orçamento atual |
| Identidade profissional | resolver menções de Amanda, Daniel e profissionais eventuais e declarar elegibilidade de automação | `professional-registry.mjs` | transformar profissional ausente ou eventual em Amanda |
| Planejamento de conversa | definir rota, motivo, profissional, procedimento e elegibilidade | `whatsapp-automation.mjs` | contornar takeover, opt-out ou gate de saída |
| Política semântica | revisar significado e contexto de respostas elegíveis | `semantic-reply-policy.mjs` e módulos especialistas | executar efeito diretamente |
| Ação conversacional | coordenar a ação permitida para o turno atual | `conversation-action-controller.mjs` | reaproveitar decisão de outro turno sem revalidação |
| Saída | impor o contrato final de segurança e conteúdo | `outbound-reply-gate.mjs` | inventar fatos para completar uma resposta |
| Revisão humana | padronizar motivo, responsável, relação, risco, contexto e existência de rascunho seguro | `human-review-envelope.mjs` | fabricar uma resposta apenas para preencher o alerta |
| Memória | guardar turnos e estado durável da conversa | módulos `conversation-*` | substituir a origem comercial canônica |
| Jornada comercial | manter oportunidade canônica e projetar o funil | `OpportunityStore.gs` | inferir qualificação apenas por campanha ou prefill |
| Reconciliação | conferir e reparar projeções por `Opportunity ID` e fase | `FunnelReconciliation.gs` | reescrever colunas manuais protegidas |
| Ledger de decisões | registrar códigos de decisão, rota, motivo, versões, gate e vínculo da oportunidade sem texto livre | `OperationalEvents.gs` | guardar nome, telefone, mensagem ou dado clínico |
| Ledger de entrega e custos | consolidar o estado final e o preço informado pela YCloud por chave opaca idempotente | `ycloud-message-observability.mjs` e `WhatsAppCosts.gs` | tratar aceite HTTP como entrega, persistir identificador bruto/telefone/conteúdo ou bloquear cuidado por custo |
| Retomadas | planejar cadência, elegibilidade, silêncio e limites | `Retomadas.gs` | enviar sem rechecagem do estado mais recente |
| Caixa diária de decisões | projetar a Central sem escrita, coletar escolhas explícitas e delegar cada efeito ao proprietário | `PainelDecisoesDiarias.gs` | preselecionar ação, redefinir elegibilidade ou criar um caminho próprio de envio/cancelamento |
| Execução de retomadas | revalidar e executar somente a ação ainda válida | `scheduled-followup.mjs` | criar um novo plano ou ignorar takeover/opt-out |
| Agenda | sugerir, reservar e sincronizar consultas com idempotência | módulos `appointment-*` e `ConsultasSync.gs` | confirmar horário sem prova da reserva |
| Lembretes de consulta | definir cadência, elegibilidade, identidade e reserva de tentativa | `LembretesConsultas.gs` | inventar nome/telefone ou criar uma cadência paralela no e-mail diário |
| Marcos de relacionamento | projetar aniversário, pós-consulta, ausência, jornada cirúrgica e cliente antigo para o responsável correto | `AgendaCuidados.gs` | automatizar um marco não aprovado ou atribuir atendimento eventual à Amanda |
| Atribuição | preservar origem, campanha e eventos da jornada | `attribution-journey-store.mjs` e agregações canônicas | usar clique ou prefill como consulta qualificada |

## 3. Regras de dependência

Os módulos `automation-mode.mjs`, `marketing-prefill.mjs` e `procedure-context.mjs` são política pura. Eles não podem usar `process.env`, rede, Netlify Blobs, memória de conversa, YCloud, OpenAI ou qualquer outro adaptador de efeito.

Os endpoints de webhook, retomada, lembrete e pós-consulta importam o modo de automação diretamente de `automation-mode.mjs`. Isso impede que uma mudança no planejador principal seja carregada por rotinas que só precisam saber se efeitos estão autorizados.

`whatsapp-automation.mjs` mantém reexportações de compatibilidade durante a transição. Assim, consumidores antigos continuam funcionando, enquanto novos consumidores devem importar do módulo proprietário.

O gate `npm run architecture:check` bloqueia regressões dessas fronteiras. Ele faz parte da suíte integral e deve passar antes de qualquer publicação.

## 4. Invariantes de comportamento

### Bot e segurança

- `off` não autoriza avaliação semântica, envio, agenda nem disparos programados.
- `shadow` pode avaliar, mas não pode produzir efeito para a paciente.
- somente `active`, junto dos demais gates, pode autorizar efeito para a paciente.
- urgência, risco clínico, takeover, opt-out, mensagem humana mais recente, evento desatualizado ou contexto insuficiente continuam falhando fechados.
- toda resposta final continua passando pelo contrato de saída; a extração de contexto não libera uma rota por conta própria.
- Bruna se apresenta somente como assistente ou concierge da Clínica LIV. A identidade pública não exige explicação tecnológica e nunca pode afirmar que Bruna é a médica.
- toda revisão humana informa responsável, motivo e contexto suficiente. Quando não houver texto seguro, o contrato declara `SEM SUGESTÃO PRONTA`; um holding genérico não substitui análise.

### Funil e rastreio

- `_CRM_OPORTUNIDADES` permanece a origem canônica da oportunidade.
- as abas visíveis permanecem projeções reparáveis, nunca uma segunda origem concorrente.
- `Opportunity ID` e fase governam a projeção; nome, telefone parcial ou posição da linha não substituem identidade.
- código de campanha ou template de marketing fornece contexto, mas não prova qualificação, agendamento, comparecimento ou receita.
- colunas manuais protegidas não podem ser modificadas pela reconciliação periódica.
- cada decisão operacional recebe identificador próprio e, quando disponível, `Opportunity ID`, profissional, relação, etapa, rota, motivo, versão de política/prompt/conhecimento/modelo, resultado do gate, latência e responsável pela revisão. Os campos aceitam somente códigos delimitados e nunca armazenam conteúdo da conversa ou identificadores pessoais.
- aceite HTTP do provedor significa apenas `accepted_not_delivered`. Entrega e custo só se tornam finais em `whatsapp.message.updated` com estado `delivered` ou `read` e preço numérico fornecido pela YCloud.
- eventos repetidos de `sent`, `delivered` e `read` atualizam uma única linha por hash do identificador do provedor. `_WHATSAPP_CUSTOS` nunca recebe `wamid`, telefone, nome, conteúdo, ID de conversa ou dado clínico; o vínculo com campanha, profissional e oportunidade é apenas uma resolução best-effort de chaves técnicas já canônicas, sem inferência.
- `_WHATSAPP_TEMPLATE_EVENTOS` registra apenas categoria, status e qualidade técnica dos modelos. Texto livre de motivo do provedor não é persistido. Falha na gravação devolve erro transitório ao webhook para permitir repetição segura.
- custo permanece em observação: não pode impedir resposta segura, handoff, lembrete de consulta ou cuidado pós-procedimento. Qualquer limite futuro de retomada comercial exige amostra real, decisão explícita e alteração separada do contrato proprietário.
- `Agregados` e `Google_Rotas` são duas projeções anônimas da mesma coorte Google e nunca devem ser somadas. A segunda só cruza `_FUNIL_CANONICO` e `_CRM_OPORTUNIDADES` por `Opportunity ID` exato, mas não publica esse identificador.
- grupo, landing e CTA só podem sair para o agregado por listas canônicas fechadas. Schema ausente, valor livre, lacuna ou conflito permanecem N/D; página, procedimento, pessoa e texto não autorizam backfill por inferência.

### Retomadas

- o planejamento e o envio são etapas distintas.
- abrir o e-mail diário, a Central ou o painel móvel é somente leitura e não equivale a aprovar, cancelar, adiar ou enviar.
- nenhuma decisão do painel móvel pode vir preselecionada; uma confirmação em lote só alcança os itens escolhidos e cada item deve ser relido pelo `sourceKey` opaco imediatamente antes do efeito.
- o painel móvel não possui regras concorrentes: aprovação e cancelamento reutilizam as funções proprietárias de `Retomadas.gs`/`CentralAtendimento.gs`; adiamento altera apenas os controles humanos persistentes da Central e nunca envia mensagem.
- `Nunca retomar` e `Nunca responder com robô` permanecem decisões permanentes separadas e não aparecem entre as escolhas rápidas do painel.
- o e-mail deve declarar itens encontrados, representados e omitidos. Não pode limitar silenciosamente a lista; falha de projeção deve aparecer como `ATENÇÃO` e manter acesso à Central completa.
- cada envio revalida opt-out, takeover, janela, atividade mais recente, identidade do plano, número máximo de tentativas e contrato semântico.
- uma nova fala da paciente ou da equipe invalida qualquer decisão reaproveitada que não continue comprovadamente atual.
- cancelamento de um plano não cria automaticamente proibição permanente de contato.
- a primeira retomada de um interesse genérico em procedimento pode usar o corredor determinístico de baixo risco somente quando a conversa contém exatamente o prefill inicial e uma pergunta da Bruna ainda sem resposta, o procedimento coincide nos três textos e não há preço, agenda, sintoma, exame, imagem, risco, urgência ou orientação clínica. Dentro da janela atual, o caminho legado continua em texto; fora dela, um modelo aprovado só pode ser usado automaticamente pelo contrato adicional descrito abaixo. Qualquer turno adicional ou sinal protegido devolve o caso à revisão humana ou semântica fail-closed.
- o contrato adicional por modelo é independente e desligado por padrão nos dois lados do efeito: `RETOMADAS_AUTOMATICAS_MODELO_ATIVAS` no Apps Script e `WHATSAPP_AUTOMATIC_FOLLOWUP_TEMPLATES_ENABLED` no Netlify. A publicação de código não pode ligar nenhuma dessas travas.
- a ativação por modelo reinstala o planejador diário e o processador de cinco minutos somente depois do preflight verde, registra `RETOMADAS_AUTOMATICAS_MODELO_ATIVADAS_EM` e então liga as flags; somente conversas cuja última saída e cujo plano sejam posteriores a esse instante podem usar a nova rota. Fila antiga, inclusive uma fila criada numa ativação anterior, não pode ser retomada retroativamente.
- o planejamento por modelo usa 24 horas corridas desde a última saída da clínica, arredonda para o próximo intervalo seguro de 15 minutos entre 09:00 e 19:00 e expira em 48 horas. A segunda retomada, preço, agenda, pós-consulta e demais contextos continuam manuais.
- Apps Script e `scheduled-followup.mjs` repetem o mesmo corredor determinístico estrito e o endpoint ainda exige modo global ativo, flag própria, modelo configurado, segredo válido, horário operacional e intervalo de 24 a 48 horas. A divergência entre os dois gates deve bloquear, nunca ampliar, o envio.
- `diagnosticarRetomadasAutomaticas` é somente leitura: agrega flags, triggers, fila, última tentativa, último envio e prontidão não sensível do endpoint, sem expor paciente nem alterar Central, LEADS, fila ou propriedades.

### Agenda

- sugestão não equivale a reserva; reserva não equivale a confirmação enviada.
- repetição do mesmo evento deve ser idempotente.
- timeout ou resposta ambígua exige releitura antes de declarar falha ou criar outra reserva.
- conflito real deve virar alerta ou revisão, não sobrescrita silenciosa.
- confirmação humana pode registrar horário fora de `Datas Consulta`, mas não pode contornar a ocupação real da sala; para a Dra. Amanda, qualquer outro evento na `Sala 1` durante o mesmo intervalo bloqueia o novo agendamento e mantém o caso em revisão.
- alertas e telas de revisão reutilizam, nesta ordem, o nome explícito do comprovante, o nome canônico já conhecido por telefone em Consultas/LEADS e um nome de perfil utilizável; revisões antigas sem nome repetem essa consulta antes de exibir ou confirmar, e `Não informado` só é permitido quando nenhuma dessas fontes é válida.
- `LembretesConsultas.gs` é o proprietário da cadência de lembrete. `AgendaCuidados.gs` apenas projeta esse mesmo alvo; não pode calcular D-2, confirmação adicional ou horário concorrente.
- nome confiável e telefone brasileiro E.164 são pré-condições do envio automático. Ausência de qualquer um bloqueia antes de reservar a tentativa e vira revisão humana; o endpoint e o adaptador do provedor repetem o mesmo bloqueio.
- para atendimento presencial, a linha de `Consultas` só autoriza lembrete quando o evento vivo vinculado no Google Agenda existe e começa exatamente na mesma data e hora. Vínculo ausente, sincronização não confirmada, evento apagado, erro de leitura ou horário divergente bloqueiam antes de qualquer escrita e viram reconciliação humana. Atendimento remoto só dispensa Calendar quando modalidade e estado canônico `Não se aplica — atendimento remoto` são simultaneamente explícitos e não há vínculo residual.
- confirmação e lembrete automáticos exigem profissional explicitamente reconhecido. Amanda e Daniel mantêm fluxos separados; profissional eventual ou ausente falha fechado e segue para a equipe correspondente, sem herdar Amanda como padrão.
- `diagnosticarReconciliacaoConsultasAgenda` lê os próximos 30 dias de `Consultas` e confere o vínculo vivo no Calendar sem escrever, corrigir ou enviar. O resultado agrega alinhamentos e motivos de bloqueio sem nome, telefone ou conteúdo clínico.
- `Última tentativa de lembrete` impede novo envio automático mesmo quando o provedor falhou ou a resposta foi ambígua. O e-mail diário deve exibir revisão humana, não um novo envio previsto.
- o e-mail diário projeta, na seção de envios automáticos do próprio dia, o mesmo lembrete único autorizado por `LembretesConsultas.gs`. Cada lembrete elegível oferece cancelamento HMAC com confirmação; a ação grava o horário exato cancelado e nunca cancela a consulta, bloqueia outro cuidado ou mantém a supressão depois de um reagendamento.

### Evolução e regressão

- `bruna-policy/regression-baseline.json` é o inventário mínimo dos cenários que não podem desaparecer durante uma mudança de modelo, prompt, regra ou implementação.
- todo incidente novo vira cenário sintético falhando antes da correção; a solução deve passar pelo teste novo, pela baseline bloqueada e pela suíte integral.
- uma atualização nunca pode fazer testes passarem removendo uma proteção anterior. Deprecação exige motivo, substituto equivalente ou superior e registro explícito no candidato de mudança.
- dados identificáveis de conversas reais permanecem fora de código, prompt, teste e telemetria; somente o padrão desidentificado pode alimentar aprendizado supervisionado.

### Google e Meta

- parâmetros e códigos de campanha são preservados como evidência de origem.
- otimização deve usar eventos qualificados da jornada, não clique, LPV ou abertura do WhatsApp isoladamente.
- mudanças no mapeamento de campanha exigem casos de regressão para Google, Meta e precedência da fala explícita da paciente.

## 5. Como fazer uma alteração futura pequena

1. Identificar o proprietário único da decisão nesta matriz.
2. Alterar primeiro o teste de contrato do comportamento desejado.
3. Modificar somente o módulo proprietário e, se necessário, seu adaptador direto.
4. Confirmar que nenhuma nova dependência de efeito entrou em módulo puro.
5. Executar testes focados, `npm run change:check`, `npm run architecture:check`, suíte integral, build e `npm run ops:check`.
6. Comparar o diff com o escopo aprovado e registrar qualquer alteração de contrato.
7. Commitar o candidato antes de escrever em plataforma externa.
8. Publicar somente com autorização explícita e verificar o estado vivo.

Mudança de cópia, regra clínica, preço, cadência, fase, agenda ou atribuição nunca deve ser tratada como simples reorganização de código.

## 6. Estratégia de evolução

As próximas separações devem ocorrer em pacotes independentes e testáveis:

1. reduzir o webhook a orquestração de entrada, delegando políticas puras já estabilizadas;
2. separar classificação de oportunidade, projeção do funil e efeitos externos no Apps Script sem alterar a origem canônica;
3. ampliar os testes sintéticos do contrato já consolidado entre sugestão, reserva, confirmação e lembrete;
4. criar testes ponta a ponta sintéticos para a mesma jornada atravessando anúncio, WhatsApp, oportunidade, funil, consulta e retomada;
5. aumentar a baseline bloqueada sempre que um erro real desidentificado revelar uma classe ainda não coberta;
6. retirar reexportações de compatibilidade somente depois que nenhum consumidor depender delas.

Não mover grandes blocos do Apps Script apenas para reduzir tamanho de arquivo. Como o runtime é global e a ordem/publicação de arquivos pode ampliar o risco, cada extração deve provar equivalência em um pacote próprio antes de chegar ao deployment canônico.

## 7. Rollback

Para a candidata integrada `EVOLUCAO-BRUNA-JORNADA-YCLOUD-2026-09-12`, o baseline vivo é a v143, com retomadas por modelo já ativas e em monitoramento. Antes da publicação, o rollback é abandonar ou reverter apenas os commits desta branch. Depois da publicação autorizada, conter primeiro apenas o efeito novo que apresentar divergência; preservar fila, histórico e eventos legitimamente criados e retornar os deployments aos recibos imediatamente anteriores se a contenção não bastar.

O baseline anterior a esta modularização é o commit `2862a6ddb61302430b40bb3b8e5702d310ef2dae`. O candidato foi desenvolvido na branch `codex/modularizacao-segura-jornada-20260823`.

- antes de publicação: abandonar a branch candidata restaura integralmente o baseline sem tocar produção;
- depois de publicação do Netlify: restaurar o deploy anterior e reverter o commit da modularização, preservando os registros operacionais gerados depois dela;
- Apps Script: esta primeira modularização não altera arquivos `.gs`, versão, deployment nem triggers; nenhuma reversão do Apps Script deve ser feita por causa dela;
- contenção imediata do bot: o modo `off` continua sendo a trava operacional fail-closed, mas sua alteração é uma ação externa separada e deve ser registrada;
- dados de pacientes, oportunidades, agenda e histórico não devem ser revertidos automaticamente junto com código.

O rollback precisa ser seguido de smoke tests, conferência do modo de automação, webhook, filas programadas, funil e agenda. A causa deve ser registrada antes de uma nova tentativa.

## Cuidados programados — candidato local 12/09/2026

CuidadosProgramados.gs é o proprietário de identidade de marco, decisão persistente, consentimento, planejamento de horário, validação do Calendar e recibo operacional dos cuidados. AgendaCuidados.gs gera as propostas; CentralAtendimento.gs e PainelDecisoesDiarias.gs projetam e recebem decisões explícitas; Retomadas.gs reutiliza o gatilho existente e o transporte autenticado, sem ampliar a regra de retomada automática de marketing. scheduled-care.mjs recebe apenas a identidade do plano e relê validate_care_send em Code.gs antes e depois da reserva. Seu recibo de reserva não expira em um novo disparo. Reconciliar recibo é somente leitura no provedor e escrita do registro local da operação.

Invariantes: GET do painel não escreve; dispensar não altera preferência permanente; dias decorridos no Calendar não significam atendimento realizado; nascimento/consentimento não são inferidos; aprovação liga texto, horário e contexto; cadastro/profissional/evento alterados invalidam o envio; falha ambígua nunca autoriza nova tentativa automática. A integração é coberta por CuidadosProgramados.test.mjs e scheduled-care.test.mjs, além dos consumidores existentes. O histórico usa o escritor canônico registrarTurnoConversa_, com Opportunity ID e profissional. A migração aditiva ocorre somente após publicação autorizada, sem deslocar índices existentes.


### Integridade contextual, revisão de 12/09/2026

conversation-memory é o proprietário da adaptação de histórico para IA e da gravação condicional por versão, incluindo recuperação e resumo semântico. openai-shadow reutiliza essa adaptação e preserva a cauda da mensagem atual quando há limite de tamanho. O webhook vincula o resumo ao evento de entrada: atividade posterior humana ou do paciente invalida o resultado antigo. procedure-context resolve correções e ambiguidades de nomes; whatsapp-automation importa a regra para não restaurar um procedimento recusado/comparado ao enriquecer pelo histórico. Essas regras não modificam atribuição, identidade, preços aprovados ou fatos clínicos.
