# Registro de execução — publicação coordenada default-off

**Data de corte:** 2026-08-15, America/Sao_Paulo.
**Commit candidato publicado:** `50d7ea175cd5e1f5bb60c6afed8912da50931d42`.
**Estado:** pacote técnico versionado e publicado em modo default-off.
**Netlify:** deploy de produção `6a80bef31b7d69000853db97`, concluído e publicado.
**Apps Script:** versão 91 no deployment canônico preservado `AKfycby-ylkJVFEcq5cfABOkazHBIszpissNJh2P8CEqYFMo0Hog5XP-e5KT3bcbSZuBUKX79A`.
**Produção:** inspecionada por smoke tests não destrutivos após a publicação.

## Resultado

O pacote técnico de contenção de IDs, logs seguros, gate de artefato, jornada de atribuição, schema aditivo, projeções de first/current touch, origem informada separada, reconciliação segura de Calendar e gates operacionais de SLA/rota foi publicado. O JavaScript público permanece com `attributionJourneyEnabled=false`, e a propriedade `ATTRIBUTION_SCHEMA_VERSION` permaneceu ausente; portanto a jornada rica, a linha `JID`, as novas colunas e as migrações não foram ativadas. O código publicado remove `JID` antes de bot/Sheets quando o modo rico vier a ser autorizado, preserva TTLs absolutos, vincula o resgate a claimant HMAC e impede que `M26O01W` seja retropreenchido como WhatsApp direto sem evidência.

Os smoke tests observaram: home, página de custo, `robots.txt`, `sitemap.xml`, tracking e web app com HTTP 200; arquivo sentinela de auditoria com HTTP 404; endpoint de jornada com HTTP 405 para GET; flag pública desligada; nenhuma faixa antiga na página de custo; nenhum `JID` no HTML público; e versão canônica de cache `20260815-attribution4` carregada.

As pendências materiais que ainda impedem a ativação são:

1. o purge agendado foi publicado, mas a primeira execução física e a retenção live ainda não foram observadas; o segredo manual de purge continua propositalmente ausente porque nenhum expurgo manual foi autorizado;
2. retenção e acesso de Sheets, CRM, backups e plataformas externas continuam sem decisão;
3. a origem informada possui campo e projeção separados, mas ainda não tem produtor estruturado; nenhum texto é interpretado automaticamente;
4. a trilha rica ainda depende de uma linha `JID` visível/editável no texto pré-preenchido e não pode ser ativada antes de decisão de comunicação/privacidade ou de um transportador alternativo comprovado;
5. alerta agregado de ATR-008, reconciliação live LEADS=CRM, estado real de Calendar/SLA e prova Meta → site não foram comprovados.

O contrato técnico está em `campanhas/CONTRATO-ATRIBUICAO-ORIGEM.md`. O arquivo `17-STATUS-RECOMENDACOES.csv` preserva o estado imediatamente anterior à publicação; este registro é a fonte de verdade para o deploy default-off de 15/08/2026.

## Fontes e método

Foram confrontados:

- `AGENTS.md`;
- `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`;
- relatórios `00` a `15` e `EVIDENCIAS.md` desta auditoria;
- os 59 IDs de `10-MATRIZ-DE-MUDANCAS.csv` e suas dependências em `13-MATRIZ-DE-EXECUCAO.csv`;
- estado local e diffs do site, tracking, Netlify, Apps Script e testes relacionados;
- suíte local do repositório.

A classificação é conservadora: presença de código e teste local não prova configuração, migração, dado histórico, recibo de plataforma ou comportamento em produção.

## Legenda de status

- `implementado_local_nao_publicado`: o núcleo local da recomendação foi observado e coberto por teste local, sem publicação ou prova live.
- `parcial_local_nao_publicado`: existe trabalho local, mas ainda falta requisito material.
- `bloqueado_externo_ou_juridico`: a próxima evidência ou decisão depende de sistema/parte externa, acesso ou parecer.
- `planejado`: nenhuma implementação material suficiente foi confirmada no recorte.

## Pacotes locais observados

### Segurança e privacidade

- **SEC-001, parcial:** geração HMAC v1 de transaction ID, rejeição de formato legado inseguro, quarentena e rotinas separadas de dry-run/aplicação aparecem no Apps Script local. Leitura do histórico Google, escrita e migração continuam não executadas.
- **SEC-002, parcial:** os caminhos de webhook, recuperação, retomada humana e review-alert usam envelope operacional fechado e correlation ID HMAC versionado, com fallback constante quando o segredo falta. Política externa de retenção e acesso segue pendente.
- **SEC-003, implementado local:** o artefato estático exclui `auditorias/**` e há gate offline para a rota sentinela. Não houve deploy nem smoke live.
- **SEC-005, parcial:** o clique de WhatsApp enviado ao Google foi reduzido a payload genérico no código local. A leitura de GA4/DebugView, a decisão jurídica e a validação live não ocorreram.
- **SEC-006, parcial:** há pseudônimo HMAC versionado e migração separada/dry-run no Apps Script local. Aliases protegidos, rotação operacional e estado externo não foram verificados.
- **CNS-001, parcial:** a configuração local está fechada para modo básico e há ajuste textual de privacidade no worktree. Não houve parecer nem publicação; não se declara a política atual live como reconciliada.

### Atribuição e dados

- **ATR-002/ATR-003/DAT-003:** existem estrutura de jornada e projeções separadas; testes locais preservam first touch e avançam current touch somente por evidência mais recente. O ledger E2E e a equivalência live LEADS=CRM não foram comprovados.
- **ATR-004:** os prazos locais são absolutos: J0 no navegador por 30 dias, resgate J1 por dez minutos e J2/claim por 30 dias. Repetir save ou resolve não renova os prazos. O primeiro registro congela o envelope J2 inteiro; retry equivalente não o regrava e retry divergente, vencido ou perdedor de corrida falha fechado.
- **ATR-005, parcial:** J1 é rotacionado por tentativa, associado no backend a J2 e resgatado atomicamente por C1, um claimant HMAC derivado do provider Event ID. Depois do primeiro resgate, apenas o mesmo C1 pode repetir a resolução. O webhook usa o texto bruto somente para a resolução e remove a linha `JID` antes do bot, de `lead.text`, Apps Script e Sheets. A ativação permanece bloqueada porque a linha técnica ainda é visível, editável e encaminhável no WhatsApp; remoção ou edição impede a resolução e encaminhamento antes do primeiro resgate pode atribuir a jornada ao destinatário.
- **ATR-007, parcial:** as allowlists locais incluem fontes pagas, orgânicas, IA, indicação, direto e desconhecida. `reported_origin` agora é campo próprio, aceita apenas enum fechado, recebe confiança fixa `patient_reported` e é projetado separadamente em eventos, CRM e LEADS sem sobrescrever first/current observados. Ainda não há produtor estruturado ou operação live.
- **ATR-008:** logs locais têm categorias, motivos, timestamps, correlation ID e testes de sanitização; idempotência operacional preexistente é preservada. Não foi comprovado alerta agregado.
- **ATR-009, parcial:** foi criado um registro versionado de códigos e a separação entre valor bruto e projeção resolvida foi desenhada e parcialmente materializada. Ainda não existe ledger comum que prove essa separação ponta a ponta. O backfill trata `M26O01W` como caminho conflitante/N/D, pois o mesmo código foi documentado para WhatsApp direto e passagem pelo site. Aliases externos e reconciliação histórica ainda dependem de evidência determinística.
- **DAT-002:** existe schema aditivo v1 com ativação explícita e default-off. Publicação de código, ativação e migração são etapas separadas e nenhuma foi executada.
- **DAT-000:** este trabalho cria somente um rascunho do contrato. Aprovação campo a campo ainda é necessária antes de migração.

### Calendar, SLA e operação

- **CAL-001, parcial:** sincronização local só cria/atualiza com Opportunity ID válido, status elegível, profissional, data/hora, sala permitida e Calendar correspondente. Cancelamento, falta e migração para remoto só limpam vínculos após deleção confirmada. Troca de Calendar remove o evento anterior antes de criar o substituto e falha fechada evita duplicidade ou vínculo falso. O estado real do Calendar e a cobertura ≥95% continuam N/D até reconciliação autorizada.
- **SLA-001, parcial:** o denominador inclui inbound elegível mesmo com rota pendente, rejeita datas/respostas inválidas e não transforma denominador vazio em zero. O gate exige cobertura de SLA ≥95%, rota válida ≥99% e ausência comprovada de P0/P1 vencido. Como ainda não existe fonte runtime verificada para o último componente, o gate composto permanece N/D em vez de verde por presunção.

### Programação externa autorizada

Foram criados no Google Calendar, sem paciente, telefone, e-mail clínico ou identificador reversível:

- **20/08/2026, 15:00–17:00:** publicação segura e decisões pendentes, com lembrete por e-mail 24 horas antes e popup 30 minutos antes;
- **27/08/2026, 09:00–09:30:** checkpoint técnico de 7 dias;
- **17/09/2026, 09:00–09:30:** revisão de 28 dias;
- **18/11/2026, 09:00–09:30:** revisão de 90 dias.

As três janelas de revisão são condicionais à publicação em 20/08. Se a publicação ocorrer em outra data, o resultado deve ser registrado como N/D e os eventos precisam ser reagendados a partir da data real, sem fingir uma janela pós-mudança inexistente.

### SEO e descoberta

- **SEO-002/SEC-003:** há build estático e gate offline para 200 esperado, canonical, robots, H1, sitemap, orfandade, redirects e exclusão do diretório de auditoria.
- Os três assets de tracking usam a versão única `20260815-attribution4` em 132 referências nas 44 páginas públicas; o gate falha se houver versão ausente, antiga ou divergente.
- **AI-001:** `robots.txt` mantém regras separadas para OAI-SearchBot e GPTBot e o teste local cobre essa separação. Isso demonstra acessibilidade técnica local, não indexação, citação ou recomendação.
- Leituras GSC, Bing, Meta, GA4, Google Ads, CDN e demais verificações externas não foram executadas neste trabalho.

## Flags e migrações

O estado local observado é fail-closed para a nova atribuição:

- `attributionJourneyEnabled` está `false` no tracking local;
- `ATTRIBUTION_SCHEMA_VERSION` só ativa o schema quando o valor é exatamente `v1`;
- ausência ou erro ao ler a propriedade mantém o schema inerte;
- aplicação e desativação de schema exigem confirmações explícitas;
- rotinas de migração e higiene têm modos dry-run/confirmações próprios.

Não há evidência, nesta execução, de que qualquer flag ou propriedade equivalente tenha sido alterada em produção.

## Identificadores e joins canônicos observados

- **J0:** estado aleatório da jornada no navegador; não é enviado como chave do storage backend nem usado para join comercial.
- **J1:** credencial curta e single-use, rotacionada por tentativa; resgate limitado a dez minutos.
- **J2:** ID aleatório da jornada durável no backend; TTL absoluto de 30 dias e envelope integral congelado no primeiro registro.
- **C1:** claimant HMAC do provider Event ID com separação de domínio; depois do primeiro resgate permite retry do mesmo evento e bloqueia claimant diferente sem expor o Event ID no claim. Não impede encaminhamento antes do primeiro resgate.
- **Provider Event ID:** join de idempotência do evento e dos retries no ledger operacional.
- **Opportunity ID:** join canônico entre LEADS, CRM, fases e conversões downstream. Telefone não substitui esse vínculo.

O claim/tombstone de J1 permanece no máximo 30 dias para impedir reuso/rearmamento e permitir purge. Nenhum desses IDs técnicos é enviado a logs operacionais como valor bruto.

## QA local executado

Comandos executados novamente em 2026-08-15 após a estabilização do pacote:

```text
npm.cmd test
npm.cmd run site:check
npm.cmd run site:build
git diff --check
```

Resultado observado no worktree daquele instante:

```text
tests 651
pass 651
fail 0
cancelled 0
skipped 0
todo 0
```

A suíte inclui testes de transaction ID HMAC, pseudônimo HMAC, first touch imutável, origem informada separada, conflito `M26O01W`, flag de schema desligada, jornada sem PII, J1 single-use, C1 HMAC, envelope J2 imutável, retry divergente/stale/corrida, TTL não deslizante, purge limitado, descarte de `JID`, logs operacionais seguros, migração atômica de Calendar, SLA, payload genérico de clique, cache-busting, gate SEO e exclusão de auditorias do artefato.

O gate técnico encontrou 44/44 URLs esperadas, 44 self-canonicals, 44 páginas indexáveis com um H1, zero órfãs, um redirect permanente, 173 arquivos no artefato e zero arquivo de auditoria no artefato. O build publicou somente em `tmp/netlify-deploy` no ambiente local.

Limites do QA:

- a suíte é local e não prova deploy, configuração de segredo, persistência real, passagem real de dez minutos/30 dias ou comportamento de plataforma;
- suíte e build locais não comprovam funcionamento do purge, secrets, Calendar, Apps Script ou atribuição em produção;
- o worktree é compartilhado e pode mudar depois deste registro; o resultado se refere ao instante acima.

## Correções locais necessárias antes de qualquer ativação

1. Definir o alerta agregado de ATR-008 sem incluir PII, conteúdo ou IDs reversíveis.
2. Definir um produtor estruturado para `reported_origin`, sem inferência por texto e sem substituir origem observada.
3. Aprovar o contrato, a linha técnica `JID`, a decisão de privacidade e a política externa de retenção/acesso antes de habilitar feature/schema.
4. Configurar segredo e agendamento do purge somente no pacote de publicação autorizado; depois verificar a primeira execução sem dados pessoais nos logs.
5. Executar reconciliação live de Calendar, SLA/rota e Meta → site somente após publicação e migração autorizadas.

## Sequência de publicação futura — não executada

1. preservar a suíte integral verde e revisar o diff final;
2. aprovar contrato e decisões externas;
3. criar commit intencional e revisar o diff por pacote;
4. publicar código com a feature e o schema ainda desligados;
5. confirmar artefato/hash e smoke técnico autorizado;
6. executar preflight e migração em dry-run no alvo canônico, em trabalho separado;
7. ativar schema com confirmação explícita;
8. executar sonda sintética/controlada e reconciliar site → WhatsApp → LEADS → CRM;
9. ativar a feature em canário somente se todos os gates estiverem verdes;
10. registrar resultados como preparados, publicados, aceitos e observados separadamente.

## Rollback preparado

O rollback documental previsto é: desligar primeiro a feature do site; depois desabilitar a versão do schema sem apagar colunas; manter o caminho legado; preservar dados para reconciliação; e tratar limpeza/migração reversa em pacote autorizado separado. Nenhuma etapa de rollback foi necessária ou executada, pois não houve publicação.

## Declarações que este registro não faz

- não afirma que o estado local está em produção;
- não afirma que GA4, Meta, Google Ads, GSC, Bing ou CRM aceitaram dados;
- não afirma que ausência observada é zero;
- não atribui causalidade a cliques, origem, queda de funil ou resultado clínico/comercial;
- registra no Norte, guia e histórico apenas o estado local/default-off e o catálogo de códigos; não declara mudança live;
- não autoriza commit, push, deploy, migração, nova escrita externa ou mudança de gasto além dos lembretes de projeto já solicitados.
