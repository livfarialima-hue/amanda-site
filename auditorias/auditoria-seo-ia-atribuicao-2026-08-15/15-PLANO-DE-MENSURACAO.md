# Plano de mensuração

Data-base: 15/08/2026
Fuso: America/Sao_Paulo
Princípio: medir resultados de negócio sem somar eventos de naturezas diferentes. Ausência de medida é N/D, nunca zero.

## Definições canônicas

| Métrica | Definição | Fonte principal | Observação |
|---|---|---|---|
| Contato válido | Nova oportunidade que atende à regra operacional de lead/paciente e não é marketing, fornecedor, spam ou continuidade sem nova demanda | LEADS + ledger de classificação | Deduplicar por Opportunity ID, não por telefone isolado |
| Lead qualificado | Oportunidade que atingiu o marco canônico de qualificação, com timestamp/evento | ledger de fases + CRM | Status atual e evento de qualificação são medidas distintas |
| Consulta agendada | Compromisso conciliado a Opportunity ID e evento real de agenda | Consultas + Calendar + CRM | Sem vínculo verificável: N/D |
| Consulta realizada | Marco confirmado por evento operacional, não apenas data passada | Consultas + CRM | Cancelamento/falta devem permanecer distintos |
| Procedimento fechado | Marco comercial canônico aceito, com trilha humana | CRM/ledger comercial | Não inferir por envio de orçamento |
| Origem conhecida | Oportunidade com origem sustentada por evidência técnica ou informação explícita, método e confiança | ledger de touchpoints | `WhatsApp` ou `site` sozinhos não bastam |
| Meta → site identificado | Oportunidade com first touch Meta, caminho site→WhatsApp, campanha e páginas de entrada/CTA reconciliadas | site + webhook + LEADS + CRM | Exige sonda E2E antes de ser declarada funcional |
| Estado offline | `prepared`, `sent`, `accepted`, `rejected`, `duplicate`, `attributed` | ledger + recibo Google | Uma linha pode avançar; não colapsar estados |

## Baseline disponível

Snapshot de 15/08/2026, somente leitura:

- 130 oportunidades da Dra. Amanda na aba operacional e 130 no CRM, sem divergência atual de fase/plataforma no recorte reconciliado;
- plataformas na aba visível: Google 17, Meta 83, Orgânico/Conteúdo 2, WhatsApp direto 25 e Não identificada 3;
- 84/130 com campo de campanha, 46/130 com criativo, 3/130 com CTA e 127/130 com destino operacional preenchido;
- entre 83 oportunidades Meta, 77 usam M26F01W e nenhuma usa o código exato M26F02S; isso não prova zero contatos Meta via site;
- 5 eventos Google qualificados estão `ready`; envio, aceite, rejeição e atribuição individual permanecem N/D;
- 3/5 transaction IDs legados presentes no staging/ledger podem conter identificador pessoal derivado/reversível;
- `_WHATSAPP_EVENTOS` tem 689 eventos no recorte observado, mas os novos campos de categoria/fallback/referência/plataforma estão preenchidos em apenas 16; é cobertura recente de instrumentação, não taxa histórica válida;
- 570 testes locais passaram; não equivalem a prova live.

Esses valores são baseline operacional, não efeitos da futura implementação.

## Matriz por fase

| Fase | Baseline a congelar | Métrica principal | Secundárias | Guardrails | Fonte | Janela/frequência | Amostra mínima | Sucesso | Falha/rollback | Revisão |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 — baseline | commit, produção, 44 URLs/sitemap, testes, schema, 130 oportunidades, códigos | cobertura das fontes e reconciliação | mudanças recentes, N/D por campo | nenhuma write; zero PII no snapshot | Git, site, Sheets, plataformas RO | uma captura antes de cada pacote | 100% do inventário em escopo | baseline reproduzível | qualquer fonte sem timestamp/método bloqueia comparação | antes de toda fase |
| 1 — P0 privacidade | 3/5 IDs inseguros e logs com fragmentos/IDs brutos | novos identificadores externos conformes | legados em quarentena, segredos versionados | zero PII/PHI; zero reenvio duplicado | testes de payload, logs e ledger | cada build + revisão diária por 7 dias | 100% dos novos eventos | 0 novo ID inseguro e histórico classificado | qualquer vazamento: bloquear fluxo e reverter feature | 24 h, 7 d, 30 d |
| 2 — observabilidade | eventos `ready` sem recibos; campos novos cobrem só 16 eventos | % eventos com estado verificável | erros por etapa, fallback, latência, duplicidade | logs opacos; falhas não viram sucesso | ledger/recibos/monitor técnico | diário; coorte semanal | ≥30 eventos ou 14 dias, o que vier depois | ≥95% com estado e motivo; duplicidade <1% | cobertura <90% por 2 dias ou PII: rollback | semanal |
| 3 — SEO técnico | inventário completo do agente, indexação e CWV registrados | páginas válidas/indexáveis e erros técnicos | exclusões, canonical, sitemap, LCP/INP/CLS | não alterar significado; zero 404 novo | crawl, Search Console, CrUX/lab | diário 7 d; 28 e 90 d | 100% das URLs; CWV de campo quando houver | zero regressão crítica e tendência técnica estável | 4xx/5xx/noindex/canonical errado: reverter | 24 h, 7 d, 28 d |
| 3 — descoberta IA | crawlers e entidade por mecanismo | acessibilidade técnica por bot | páginas citadas/referidas, consistência de entidade | crawler permitido não é citação; sem promessa | robots/logs/buscas diagnósticas | mensal e após mudança | todas as páginas prioritárias + consultas diagnósticas fixas | ausência de bloqueio técnico e entidade consistente | conflito/duplicidade nova: reverter mudança | 30/90 d |
| 4 — Meta Site | 0 M26F02S exato e trilha não comprovada; isso não equivale a zero contatos Meta Site | % contatos Meta Site com caminho completo | campanha/conjunto/anúncio/criativo, landing, CTA, first/last | origem falsa = falha; M26F02S sem novo gasto até gate | site, webhook, LEADS, CRM | por sonda; depois diário/14 d | 1 sonda completa antes de mídia; depois janela consentida suficiente | 100% da sonda; depois cobertura ≥80% entre clique, conversa e oportunidade, duplicidade <2%, LEADS=CRM | cobertura <80%, duplicidade ≥2%, perda crítica ou divergência: parar teste e rollback | imediato, 7 d, 14 d |
| 5 — Google offline | 5 ready; aceitos N/D; ação requer atenção | % eventos elegíveis com todos os estados reconciliados | CPQL, rejeição, duplicidade, tempo até upload | zero PII, zero duplicidade, não escalar por proxy | ledger + Google Data Manager/Ads | por job; 7 e 30 d | todos os eventos elegíveis atuais; depois coortes completas | 100% dos elegíveis atuais com prepared/sent/accepted/rejected reconciliados, sem alerta por 7 dias | qualquer evento N/D, PII, duplicidade ou alerta: manter bloqueio/rollback | por upload, semanal |
| 6 — LEADS/CRM | 130=130 no recorte atual; schema ainda reduzido/duplicado em pontos | divergência entre LEADS e CRM | cobertura first/last/path, campos inválidos, filas | nunca regredir fase; sem backfill incerto | Sheets/CRM/ledger | diário 14 d; semanal 30 d | 100% novas oportunidades | 0 divergência nova; ≥95% campos obrigatórios | qualquer corrupção/sobrescrita: parar migração | diário na migração |
| 7 — comunicação | métricas por página/campanha antes do teste | taxa de contato válido ou avanço downstream | CTA→conversa, qualificação, agendamento, realização | sem promessa; sem piora de qualidade/segurança | GA4 consentido + LEADS/CRM | janela mínima 14–28 d | volume calculado por página; se insuficiente, observar | melhoria downstream com guardrails estáveis | piora relevante ou alerta ético: reverter | semanal, decisão ao fim |
| 8 — plataformas | export/config anterior | resultado específico da configuração | cobertura/erros | mudança unitária; recomendação automática desligada | plataforma + log de mudança | 24 h, 7 d, 30 d | conforme evento/configuração | comportamento esperado e reconciliado | alerta, perda de tráfego ou dado: reverter | por mudança |
| 9 — publicação | commit aprovado, testes e produção anterior | local = commit = produção | smoke, erros, métricas de saúde | publicar só o commit autorizado | Git/host/monitor | imediato, 1 h, 24 h, 7 d | 100% checks críticos | igualdade e zero regressão | desigualdade ou regressão crítica: rollback | cada deploy |

Gates canônicos adicionais antes de escala:

- pelo menos 95% das novas consultas com `Opportunity ID` e evento válido no Calendar, sem confirmação sem sala ou equipe;
- SLA calculável em pelo menos 95% das novas conversas, rota válida em pelo menos 99% e nenhum P0/P1 operacional vencido;
- papel atual de `Lead qualificado GCLID` confirmado em cada campanha e recibos reconciliados; snapshot histórico não substitui a checagem atual.

## SEO e Google Search

Medir separadamente:

- URLs válidas enviadas, indexadas e excluídas, com motivo;
- canonical declarado versus escolhido;
- impressões, cliques, CTR e posição média para 28 e 90 dias;
- branded versus non-branded por consulta, sem tratar posição média como ranking fixo;
- páginas órfãs e URLs antigas ainda presentes no índice;
- LCP, INP e CLS de campo; laboratório serve para diagnóstico, não para declarar experiência real;
- mudanças por dispositivo e país quando o volume permitir.

Gate: nenhuma conclusão de ganho orgânico antes de uma janela suficiente de recrawl/indexação e sem anotação da data da mudança.

## Descoberta por IA

Medir por mecanismo e sem transformar uma busca isolada em série estável:

- acesso permitido/bloqueado/N/D para OAI-SearchBot, GPTBot, ChatGPT-User, Googlebot, Google-Extended, Bingbot e agentes relevantes;
- presença de logs de crawler válidos por IP/user-agent quando houver observabilidade;
- consultas diagnósticas fixas sobre médica, especialidade, localização e procedimentos;
- páginas efetivamente referenciadas/citadas e consistência de nome/CRM/RQE/clínica/endereço;
- sessões com referrer ou UTM explícita de ChatGPT/Copilot/Perplexity/Gemini;
- origem desconhecida permanece desconhecida.

Gate: permissão de bot e indexação são condições técnicas, não promessa de citação.

## Atribuição e funil

Funil mínimo por origem/caminho:

```text
contato válido → lead qualificado → consulta agendada → consulta realizada → procedimento fechado
```

Para cada seta, calcular coortes por data do evento e também retrato por status atual, sem misturá-los. Denominadores devem ser Opportunity IDs únicos. Reportar:

- taxa de origem conhecida;
- taxa de campanha/caminho/landing/CTA conhecidos;
- Meta WhatsApp direto versus Meta Site;
- divergência LEADS/CRM;
- duplicidade de webhook/oportunidade;
- tempo entre etapas;
- custo por contato/qualificado/agendado/realizado/fechado somente quando gasto e atribuição estiverem reconciliados.

## Regras para manter, ampliar ou reverter

- **Manter:** métrica principal atinge o limiar, guardrails passam e a evidência reconcilia ponta a ponta.
- **Ampliar:** após uma janela completa sem alterações concorrentes e amostra mínima; uma variável por teste.
- **Observar:** amostra insuficiente, causa não isolada ou plataforma sem recibo.
- **Reverter:** vazamento, falsa atribuição, sobrescrita de first touch, duplicidade, regressão técnica ou divergência de dados.

## Calendário de revisão proposto

Não foi criado lembrete externo. Cadência proposta:

- diariamente durante migração/publicação;
- 7 dias após cada pacote técnico;
- 14 dias para estabilidade de Meta Site/LEADS/CRM;
- 28 dias para efeitos iniciais de SEO/comunicação;
- 90 dias para tendência orgânica e entidade;
- revisão extraordinária após qualquer alerta de privacidade, política médica ou inconsistência entre local, commit e produção.
