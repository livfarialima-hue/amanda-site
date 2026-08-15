# Runbook de publicação e migração — auditoria SEO, IA e atribuição

**Estado:** plano local; nenhuma etapa externa foi executada por este documento.

**Snapshot:** 2026-08-15T18:00:00-03:00, America/Sao_Paulo.

**Norte canônico:** `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`.

**Contrato técnico subordinado:** `campanhas/CONTRATO-ATRIBUICAO-ORIGEM.md`.

## 1. Escopo e regra de autorização

Este runbook coordena uma publicação futura do código técnico preparado na segunda auditoria. Ele não autoriza commit, push, deploy, mudança de segredo, migração, alteração de planilha, ativação de feature flag, alteração de URL na Meta ou teste que gere contato.

As autorizações são independentes. Publicar código não autoriza:

- provisionar ou trocar segredo;
- habilitar `ATTRIBUTION_SCHEMA_VERSION`;
- executar migração de identidade ou schema;
- tornar a linha `JID` visível na mensagem do WhatsApp;
- alterar parâmetros, orçamento, público, criativo ou veiculação na Meta;
- executar purge manual;
- criar lead ou contato sintético em produção.

Todo registro operacional desta execução deve conter apenas data, versão, commit, contagens, estados, erros enumerados e identificadores opacos. Não registrar nome, telefone, e-mail, mensagem, procedimento, informação clínica, Event ID bruto, `wamid`, token J1/J2 ou valor de segredo.

## 2. Estado observado e itens N/D

| Item | Classificação | Estado no snapshot | Gate |
|---|---|---|---|
| Branch local | Fato observado | `reestruturacao-site` | deve continuar igual ao `productionBranch` do registro canônico |
| HEAD local | Fato observado | `84a16ca466d1a55fe2d10ecee563b7e1d2d18a55` | não é candidato publicável enquanto o worktree estiver sujo |
| Worktree | Fato observado | possui vários arquivos modificados e não rastreados | bloquear qualquer publicação até haver diff aprovado e commit intencional |
| Publish do site | Fato observado | `netlify.toml` publica `tmp/netlify-deploy`, gerado por `node scripts/build-static-site.mjs` | não publicar a raiz do repositório |
| Funções Netlify | Fato observado | permanecem em `netlify/functions` | validar no deploy aprovado |
| Flag local da jornada | Fato observado | `campanhas/tracking-config.js`: `attributionJourneyEnabled: false` | deve permanecer `false` no primeiro deploy |
| Schema local | Fato observado | o Apps Script só considera v1 ativo quando `ATTRIBUTION_SCHEMA_VERSION` é exatamente `v1`; falha de leitura resulta em off | publicação do código não pode alterar a propriedade |
| Registro de produção do Apps Script | Fato observado | `production-target.json` registra versão verificada 90 em 2026-08-15 | versão realmente ativa deve ser verificada ao vivo; até lá, N/D |
| Alvo Apps Script | Fato observado | projeto, deployment e planilha canônicos estão registrados em `production-target.json` | não copiar IDs para este runbook; validar pela ferramenta canônica |
| Teste focal de journey store | Fato observado | 13/13 | verde local; não prova execução live |
| Suíte integral corrente | Fato observado | 651/651 | verde local; repetir sobre o commit candidato |
| Implementação do purge | Fato observado | preparada localmente, com função agendada diária, endpoint manual autenticado e testes verdes | não está comprovada em produção |
| CI versionada | Fato observado | não foi encontrado workflow em `.github/workflows` | aprovação não pode presumir gate remoto inexistente |
| Deploy/commit Netlify ativo | N/D | não consultado em sessão autenticada | capturar antes de publicar |
| Flag efetiva em produção | N/D | não consultada no artefato publicado | comprovar antes e depois |
| Presença dos novos segredos em produção | N/D | valores e presença não foram consultados | verificar apenas presença/fingerprint, nunca valor |
| `ATTRIBUTION_SCHEMA_VERSION` ao vivo | ausente em 15/08/2026 16:20 BRT | Script Properties no alvo canônico, antes do deploy | modo default-off confirmado |
| URLs/parâmetros atuais dos objetos Meta | N/D | conta não consultada neste snapshot | inventariar em modo somente leitura antes de qualquer edição |
| Estado live de LEADS e CRM para o schema novo | N/D | nenhuma sonda ponta a ponta foi executada | não afirmar funcionamento nem taxa zero |
| Comando efetivo de deploy Netlify | N/D | não há script de deploy no `package.json` nem workflow versionado | usar somente o fluxo operacional já aprovado e registrar o método |

O pacote satisfaz os gates locais observados, mas isso não prova deploy, configuração de segredos, execução agendada, migração, Calendar, LEADS/CRM ou atribuição em produção.

## 3. Autorizações que devem ser pedidas separadamente

| ID | Autorização exata | Inclui | Não inclui |
|---|---|---|---|
| AUT-01 | Configurar segredos técnicos | criar/configurar os segredos nomeados na seção 5, sem revelar valores e somente depois de validar o alvo do sistema correspondente | deploy, migração, ativação de flag |
| AUT-02 | Publicar site/backend default-off | publicar o commit aprovado com `attributionJourneyEnabled=false`, incluindo funções e agendamento do purge | Apps Script, schema, JID visível, Meta |
| AUT-03 | Publicar código do Apps Script com schema off | atualizar o deployment canônico preservado, sem mudar Script Properties nem planilha | migrações, habilitação do schema |
| AUT-04 | Executar dry-runs externos | executar somente as leituras/simulações explicitamente aprovadas | qualquer `apply:true` |
| AUT-05 | Migrar pseudônimos de identidade | aplicar HMAC k1 após backup e dry-run revisado | schema de atribuição, flag do site |
| AUT-06 | Migrar e habilitar schema v1 | adicionar/projetar campos e definir `ATTRIBUTION_SCHEMA_VERSION=v1` | flag do site, Meta, backfill não descrito |
| AUT-07 | Executar smoke live com escrita técnica | somente sonda aprovada, sem paciente e sem envio de WhatsApp | lead falso, campanha, importação de conversão |
| AUT-08 | Ativar a jornada e exibir `JID` | alterar a flag para `true` e publicar em janela isolada | parâmetros Meta e verba |
| AUT-09 | Alterar parâmetros dos objetos Meta | editar somente URLs/parâmetros dos objetos explicitamente inventariados | flag, público, orçamento, criativo, nome, posicionamento |
| AUT-10 | Executar purge manual | chamar o endpoint autenticado com limite aprovado | apagar Sheets, CRM, backups ou logs externos |

Se a autorização recebida misturar ações, registrar cada ID aceito e executar apenas o subconjunto explícito.

## 4. Fase 0 — baseline antes da primeira escrita externa

### 4.1 Repositório e artefato

Executar e guardar a saída sem segredos:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
git diff --check
npm.cmd run site:check
npm.cmd run site:build
node scripts/check-site-technical.mjs --root tmp/netlify-deploy --artifact --summary
npm.cmd test
```

Critérios obrigatórios:

1. branch `reestruturacao-site`;
2. worktree limpo depois da criação do commit candidato;
3. diff restrito ao pacote autorizado;
4. 100% dos testes verdes — o snapshot local está verde, mas o resultado deve ser repetido sobre o commit candidato;
5. artefato em `tmp/netlify-deploy`;
6. `auditorias/**` e `.netlify/**` ausentes do artefato;
7. sitemap, canonical, robots, H1, órfãs, redirects e recursos locais aprovados pelo gate offline;
8. checksum ou manifesto do artefato associado ao commit candidato.

Não resolver uma falha desativando o gate. Corrigir o pacote, revisar o diff e repetir todo o baseline.

### 4.2 Produção em modo somente leitura

Antes de qualquer mudança, registrar:

- ID do deploy Netlify, commit associado, horário, publish directory efetivo e lista de funções;
- valor efetivo da flag no JavaScript publicado, sem depender apenas do arquivo local;
- status HTTP de `robots.txt`, `sitemap.xml`, URLs canônicas e de uma sentinela sob `/auditorias/`, que deve responder 404;
- versão ativa do Apps Script e deployment ID canônico;
- presença, sem valor, das Script Properties relevantes;
- estado de `ATTRIBUTION_SCHEMA_VERSION`;
- cabeçalhos e contagens agregadas das abas afetadas, sem copiar linhas ou PII;
- última execução e estado das funções agendadas pertinentes;
- URLs e parâmetros atuais dos objetos Meta em escopo, sem editar;
- ausência de outra migração, importação ou manutenção simultânea.

Campos que não puderem ser confirmados devem ficar como `N/D`; não assumir o estado local como prova de produção.

### 4.3 Backup e rollback congelado

Antes de migração de planilha:

- criar cópia datada da planilha canônica após AUT-05 ou AUT-06, conforme a etapa;
- registrar somente o ID opaco do backup no log restrito da execução;
- exportar cabeçalhos, fórmulas e contagens das abas afetadas;
- registrar a versão anterior do Apps Script e o deploy anterior do Netlify;
- confirmar que o deployment do Apps Script será preservado;
- definir os responsáveis e o canal de incidente.

Backup não autoriza migração. Se o backup não puder ser validado, parar.

## 5. Segredos e propriedades obrigatórias

| Nome | Sistema | Estado exigido | Fato do código | Registro permitido |
|---|---|---|---|---|
| `LEAD_IDENTITY_HMAC_SECRET` | Apps Script Properties | obrigatório antes de produzir/migrar pseudônimos de identidade | o código exige pelo menos 43 caracteres; `provisionarSegredoIdentidadeLead()` cria 43 caracteres e `k1` | presença, key version e fingerprint curto já devolvido pela função; nunca o valor |
| `LEAD_IDENTITY_HMAC_KEY_VERSION` | Apps Script Properties | congelar em `k1` nesta migração | ausente ou inválido cai para `k1` | somente `k1` |
| `ATTRIBUTION_CLAIM_SECRET` | ambiente Netlify | obrigatório e dedicado antes do deploy do backend de atribuição | gera C1 por HMAC-SHA256 com separação de domínio; o código atual possui fallback para outros segredos | registrar somente presença; este runbook proíbe depender do fallback |
| `ATTRIBUTION_JOURNEY_PURGE_SECRET` | ambiente Netlify | opcional; necessário apenas para purge manual | o endpoint manual rejeita segredo configurado com menos de 32 caracteres | presença, nunca valor |
| `ATTRIBUTION_SCHEMA_VERSION` | Apps Script Properties | ausente ou diferente de `v1` durante os deploys default-off | somente `v1` habilita novas colunas/gravações | `off` ou `v1` |

Regras:

1. não colocar segredo em arquivo, commit, planilha, log, captura de tela ou relatório;
2. não reutilizar o valor do Event ID, telefone, e-mail ou outro identificador como segredo;
3. não rotacionar `LEAD_IDENTITY_HMAC_SECRET` durante a migração: isso mudaria os pseudônimos;
4. presença e política de rotação atuais são N/D até consulta autenticada;
5. o código atual não impõe comprimento mínimo para `ATTRIBUTION_CLAIM_SECRET`; o requisito de entropia/rotação deve ser aprovado pela operação de segredos antes do deploy;
6. provisionar segredo é escrita externa e exige AUT-01; no Apps Script isso só pode ocorrer depois do `verify-target` da seção 7;
7. a função agendada `attribution-journey-purge` não depende do segredo manual; publicar o backend publica também esse comportamento agendado e precisa estar explicitamente dentro da AUT-02.

## 6. Fase 1 — publicar site/backend com a jornada desligada

### 6.1 Pré-condições

- AUT-01 concluída para `ATTRIBUTION_CLAIM_SECRET`; o segredo de identidade ainda não pode ser escrito no Apps Script antes do `verify-target`;
- AUT-02 recebida;
- suíte integral verde;
- `campanhas/tracking-config.js` contém exatamente `attributionJourneyEnabled: false`;
- o artefato aprovado também contém a flag false;
- commit candidato limpo e identificado;
- método/target Netlify confirmados. Como o comando de deploy é N/D no snapshot, não improvisar CLI, site ou conta;
- aprovação reconhece que a função agendada de purge será publicada, embora a produção de jornadas permaneça desligada.

### 6.2 Publicação

Publicar exatamente o commit aprovado pelo fluxo operacional confirmado. Não editar arquivos pela UI e não publicar a raiz do repositório. Confirmar no Deploy File Explorer que o publish é `tmp/netlify-deploy` e que `auditorias/**` não existe.

### 6.3 Smoke default-off

Sem gerar lead ou mensagem:

- páginas canônicas, `robots.txt` e `sitemap.xml` respondem como no baseline;
- uma rota sentinela em `/auditorias/` responde 404;
- o JavaScript público mantém `attributionJourneyEnabled=false`;
- abrir uma página com parâmetros de teste locais/controlados não acrescenta `JID` ao CTA;
- nenhum POST para `/.netlify/functions/attribution-journey` é disparado pelo site com a flag off;
- GET no endpoint de atribuição responde `405 method_not_allowed`, sem gravar jornada;
- funções antigas do webhook permanecem saudáveis;
- logs não contêm telefone, mensagem, Event ID, J1 ou J2;
- Meta Ads não foi alterada.

O primeiro ciclo do purge agendado e sua retenção física permanecem `N/D` até execução observada. Não usar o endpoint manual para “comprovar” o purge sem AUT-10.

## 7. Fase 2 — verificar o alvo canônico do Apps Script

Ler novamente `apps-script/clinica-liv-leads/production-target.json` e `apps-script/clinica-liv-leads/README.md`. Abrir diretamente o `projectUrl` registrado; nunca escolher projeto por título, posição ou data.

Copiar da interface os três alvos visíveis e executar:

```powershell
npm.cmd run apps-script:verify-target -- --project "URL_DO_EDITOR" --deployment "URL_DO_WEB_APP" --spreadsheet "URL_DA_PLANILHA"
```

Somente continuar se a saída terminar em `ALVO CANÔNICO CONFIRMADO`. Qualquer divergência bloqueia a escrita; não editar, renomear, arquivar ou excluir o alvo divergente.

Registrar branch, commit candidato, versão ativa, `lastVerifiedVersion` e `lastVerifiedAt`. A versão ativa é N/D até essa verificação.

Depois de `ALVO CANÔNICO CONFIRMADO`, e somente com AUT-01, verificar a presença de `LEAD_IDENTITY_HMAC_SECRET` nas Script Properties. Se já existir, não trocar; registrar apenas presença e, quando a função estiver disponível, fingerprint/key version. Se estiver ausente, configurar um valor válido de pelo menos 43 caracteres sem exibi-lo ou registrá-lo. Não usar `provisionarSegredoIdentidadeLead()` antes de confirmar que a função pertence ao código publicado no alvo canônico.

## 8. Fase 3 — publicar Apps Script com schema off

### 8.1 Gate

- AUT-03 recebida;
- alvo canônico confirmado;
- `LEAD_IDENTITY_HMAC_SECRET` presente sem rotação e `LEAD_IDENTITY_HMAC_KEY_VERSION` congelada em `k1`;
- `ATTRIBUTION_SCHEMA_VERSION` ao vivo verificado como ausente/diferente de `v1`;
- se a propriedade já estiver `v1`, parar: desabilitá-la é outra escrita e não pode ser feita silenciosamente;
- nenhum executor de migração aberto no editor;
- backup e versão anterior registrados.

### 8.2 Publicação

Salvar somente os arquivos Apps Script do commit aprovado. Em `Gerenciar implantações`, editar o deployment existente; nunca criar outro. Não chamar:

```javascript
provisionarSegredoIdentidadeLead();
migrarPseudonimosIdentidadeLead({ apply: true });
migrarSchemaAtribuicaoV1({ apply: true });
habilitarSchemaAtribuicaoV1({ apply: true });
desabilitarSchemaAtribuicaoV1({ apply: true });
```

Confirmar HTTP 200 do endpoint canônico e que o schema continua off. Publicar código deve ser uma operação compatível com o caminho legado, sem coluna ou backfill espontâneo.

Após obter a nova versão, atualizar `lastVerifiedVersion` e `lastVerifiedAt` no registro canônico e registrar a versão no manual operacional, conforme `AGENTS.md`. Como essa atualização cria um commit de fechamento posterior, conferir que:

1. os fontes `.gs`/`.html` do commit de fechamento têm o mesmo checksum do que foi publicado no Apps Script;
2. o Netlify/site é republicado, ainda default-off, a partir do commit de fechamento;
3. local limpo, commit de fechamento e deploy Netlify final voltam a coincidir;
4. a versão Apps Script registrada aponta para fontes idênticos aos do commit de fechamento.

Se houver qualquer mudança funcional entre os dois commits, reiniciar o ciclo de QA e publicação; não chamá-la de atualização de registro.

## 9. Fase 4 — dry-runs e pré-voos externos

### 9.1 Schema de atribuição

Com AUT-04 e schema ainda off, executar uma das formas equivalentes de preflight, sem `apply:true`:

```javascript
habilitarSchemaAtribuicaoV1({ apply: false });
// ou, para o diagnóstico interno direto:
migrarSchemaAtribuicaoV1({ apply: false });
```

Registrar apenas:

- `enabled`, que deve continuar false;
- `ok`, `blocked` e `mode`;
- abas encontradas;
- quantidade de cabeçalhos duplicados não suportados;
- contagens de cabeçalhos a adicionar e linhas a projetar/backfill;
- duração e erro enumerado, se houver.

Reprovar se faltar aba obrigatória, existir duplicidade não suportada, o modo não for `dry_run`, a propriedade mudar ou as contagens divergirem da inspeção de baseline.

### 9.2 Identidade HMAC — dry-run sem escrita

`migrarPseudonimosIdentidadeLead({ apply: false })` foi separado do caminho de criação/alteração de schema. Testes locais exigem zero chamada a criação de aba, inserção de coluna, escrita de cabeçalho, `setValue`, `setValues`, `appendRow` ou `flush`.

Com AUT-04:

1. inventariar em leitura a existência da aba e dos cabeçalhos;
2. executar somente o modo abaixo;

```javascript
migrarPseudonimosIdentidadeLead({ apply: false });
```

Resultado esperado: `mode: "dry_run"`, key version `k1`, contagens de linhas inspecionadas e a atualizar, zero escrita e nenhum PII. Se faltar aba/cabeçalho ou se a existência do segredo for N/D/ausente, parar; não criar estrutura nem gerar segredo implicitamente dentro do dry-run.

## 10. Fase 5 — migração de identidade, em janela própria

Pré-condições:

- AUT-05 recebida com contagens aprovadas;
- `LEAD_IDENTITY_HMAC_SECRET` presente e fingerprint registrado;
- key version congelada em `k1`;
- backup validado;
- nenhuma edição/importação concorrente;
- dry-run revisado e sem conflito.

Aplicação exata:

```javascript
migrarPseudonimosIdentidadeLead({
  apply: true,
  confirmation: "APLICAR_HMAC_IDENTIDADE_K1"
});
```

O snapshot mostra que essa função planeja/atualiza `Telefone hash` nas oportunidades e no ledger de fases relacionado. Ela não autoriza outras migrações.

Pós-voo:

- repetir o dry-run e exigir zero linha pendente;
- confirmar prefixo/versionamento opaco sem registrar os valores;
- reconciliar somente contagens por `Opportunity ID`;
- confirmar que nenhuma linha foi perdida ou duplicada;
- manter o segredo original disponível no cofre; não rotacionar;
- se o segundo dry-run não for idempotente, parar e avaliar rollback pela cópia datada.

## 11. Fase 6 — migração e habilitação do schema, em janela própria

Pré-condições:

- AUT-06 recebida com totais e abas aprovados;
- identidade concluída ou decisão documentada de independência;
- backup atualizado;
- preflight de schema com `ok:true`, `blocked:false`;
- site ainda com `attributionJourneyEnabled=false`;
- Meta inalterada.

Aplicação protegida:

```javascript
habilitarSchemaAtribuicaoV1({
  apply: true,
  confirmation: "HABILITAR_SCHEMA_ATRIBUICAO_V1"
});
```

A função faz novo preflight, chama a migração com a confirmação interna `APLICAR_SCHEMA_ATRIBUICAO_V1` e somente então define `ATTRIBUTION_SCHEMA_VERSION=v1`.

Pós-voo:

- `attributionSchemaEnabled_()` retorna true;
- novo dry-run retorna sem itens pendentes inesperados;
- cabeçalhos existentes não mudaram de posição ou significado;
- campos legados preenchidos não foram sobrescritos;
- first touch preexistente não foi reescrito;
- abas visíveis e canônicas preservam o mesmo número de oportunidades;
- endpoint Apps Script continua HTTP 200;
- caminho legado continua processando evento sem jornada;
- nenhum JID aparece, pois a flag do site continua off.

## 12. Fase 7 — smoke tests antes de qualquer JID visível

### 12.1 Testes permitidos sem contato falso

- suíte local integral e gates do artefato;
- HTTP/canonical/robots/sitemap e sentinela de auditoria;
- endpoint de atribuição com método não mutante, esperando 405;
- `run_synthetic_health_check` já existente, somente com AUT-07, reconhecendo que grava uma linha técnica diária em `_INTEGRATION_HEALTH_SYNTHETIC` mas não contém paciente e não envia WhatsApp;
- dry-runs pós-migração e reconciliação de contagens;
- inspeção de logs por campos bloqueados, sem copiar payloads;
- verificação de que o caminho legado continua funcionando com schema v1 e site off.

### 12.2 Lacuna de teste ponta a ponta

O snapshot não oferece um harness live comprovadamente isolado que resgate J1 no webhook e projete LEADS/CRM sem criar contato/evento operacional semelhante a lead. Portanto a demonstração live completa permanece `N/D`.

Não criar lead falso para fechar esse gate. Antes da AUT-08, escolher explicitamente uma alternativa:

1. autorizar e implementar um harness sintético isolado, com namespace e expurgo auditável; ou
2. ativar em janela controlada e observar o primeiro contato real consentido, sem alterar Meta, com plano de rollback imediato.

A escolha é decisão externa; este runbook não presume autorização.

## 13. Fase 8 — decisão explícita sobre flag e linha JID

AUT-08 deve declarar que a pessoa verá uma linha técnica `JID: J1_<token opaco>` na mensagem pré-preenchida do WhatsApp. Isso é mudança de comunicação não clínica, embora não contenha PII nem código de campanha.

Só ativar quando:

- suíte e purge estiverem QA-green;
- segredos, backend, webhook, Apps Script e schema estiverem comprovados;
- a remoção do JID antes de bot, `lead.text`, Apps Script, Sheets, CRM, logs e modelos estiver testada;
- claim concorrente/retry, expiração absoluta e fallback estiverem aprovados;
- houver opção de teste live autorizada;
- Meta continuar inalterada e `M26F02S` sem verba nova.

Alteração única da janela:

```javascript
attributionJourneyEnabled: true
```

Publicar novo commit isolado. Não alterar textos, CTA, layout, schema semântico ou parâmetros Meta nesse commit. Observar erro do endpoint, fallback, duplicidade e vazamento. Qualquer JID persistido fora do resolvedor é P0 e exige rollback imediato.

## 14. Fase 9 — decisão separada sobre parâmetros Meta

AUT-09 ocorre somente depois da janela da flag. Antes de editar, exportar em leitura cada campanha, conjunto, anúncio, criativo, URL e parâmetro vigente. O template dinâmico exato da plataforma está N/D até esse inventário; não inventar macro.

O código local reconhece, quando fornecidos e válidos:

- `origem` e `utm_campaign` para o código estável, como `M26F02S`;
- `utm_source`, `utm_medium` e `utm_content`;
- `utm_adgroup` para código de grupo/conjunto;
- `utm_id` como fallback de campaign ID Meta;
- `meta_campaign_id`, `meta_adset_id` e `meta_ad_id` como IDs numéricos separados.

O pacote de alteração deve:

1. nomear os objetos exatos;
2. preservar `M26F01W` como controle;
3. não mudar público, posicionamento, criativo, nome, orçamento ou lance;
4. manter `M26F02S` com R$ 0 de verba nova;
5. validar em preview/teste que cada macro expande para valor permitido;
6. reprovar parâmetro vazio, literal não expandido ou ID atribuído ao nível errado;
7. registrar URL anterior para rollback;
8. executar a sonda autorizada antes de qualquer decisão de mídia.

Alterar parâmetros não autoriza o teste pago. O Norte só admite considerar teste isolado de até R$ 300 depois do gate ponta a ponta e mediante nova autorização própria.

## 15. Métricas e gates de manutenção

| Área | Métrica/gate | Janela |
|---|---|---|
| Segurança | zero PII/PHI, Event ID bruto, J1/J2 ou mensagem em logs e projeções indevidas | imediato e contínuo |
| Purge | suíte verde; execução agendada observada; expirados removidos sem varredura não limitada | antes da AUT-08 e diariamente |
| Atribuição | 100% dos campos esperados na sonda; LEADS=CRM; first touch imutável; confiança explícita | antes de Meta; depois por evento |
| Meta Site | cobertura consentida de pelo menos 80% entre clique, conversa e oportunidade; duplicidade abaixo de 2% | janela mínima operacional definida no Norte |
| CRM/aba | zero nova divergência | 14 dias |
| Consultas/Calendar | pelo menos 95% das novas consultas com Opportunity ID e evento válido | janela operacional do Norte |
| Google offline | preparados, enviados, aceitos/rejeitados e atribuídos separados; sem alerta | 7 dias antes de escala |
| Rota/SLA | rota válida em pelo menos 99%; SLA calculável em pelo menos 95%; nenhum P0/P1 vencido | contínuo/14 dias |

Ausência de medição é `N/D`, não zero. Clique ou mensagem iniciada não substitui lead qualificado, consulta ou procedimento.

## 16. Rollback

### 16.1 Gatilhos imediatos

- PII/PHI, Event ID bruto, JID ou mensagem em local proibido;
- claimant diferente conseguindo repetir o resgate depois do primeiro claim, ou encaminhamento pré-claim produzindo atribuição indevida;
- first touch sobrescrito ou TTL renovado;
- duplicidade ou perda de oportunidade;
- LEADS e CRM divergentes;
- rota/profissional errado;
- erro material no caminho legado;
- purge ilimitado, falho ou deletando registro não expirado;
- macro Meta literal, vazia ou mapeada ao nível errado.

### 16.2 Ordem

1. interromper a janela e preservar somente evidência opaca;
2. restaurar o deploy Netlify flag-off anterior e confirmar que não há JID novo;
3. restaurar URLs/parâmetros Meta anteriores, sem alterar o controle ou liberar verba;
4. se necessário, executar com autorização de incidente:

```javascript
desabilitarSchemaAtribuicaoV1({
  apply: true,
  confirmation: "DESABILITAR_SCHEMA_ATRIBUICAO_V1"
});
```

Essa ação desliga coleta v1 e preserva colunas/dados; não é rollback de dados.

5. restaurar a versão Apps Script anterior no mesmo deployment;
6. para identidade, não trocar o segredo como resposta automática. Restaurar células somente pela cópia datada e por linhas exatas após reconciliação; a função de migração não fornece rollback próprio;
7. não executar purge manual, expurgo de planilha ou limpeza de CRM como parte implícita do rollback;
8. repetir baseline, dry-runs e smoke default-off antes de reabrir.

Se o segredo de identidade for perdido ou alterado, tratar como incidente de consistência; não gerar outro e continuar silenciosamente.

## 17. Fechamento e igualdade local = commit = publicado

A execução só termina quando o registro comprova:

- worktree limpo;
- commit final aprovado;
- artefato reconstruído a partir desse commit;
- deploy Netlify final associado ao mesmo commit;
- fontes Apps Script publicados com checksum idêntico aos do commit final;
- `production-target.json` atualizado com versão e horário verificados;
- deployment Apps Script preservado;
- versões anterior e nova registradas;
- flags e propriedades efetivas registradas;
- testes, dry-runs, smokes, métricas e eventuais N/D documentados;
- nenhum arquivo fora do pacote autorizado alterado;
- nenhuma PII/PHI nos registros;
- nenhuma mudança Meta, flag ou migração executada sem seu ID de autorização.

Se local, commit e produção divergirem, a publicação permanece aberta e nenhuma próxima fase pode começar.

## 18. Checklist de decisão

| Ordem | Fase | Entrada obrigatória | Saída para continuar |
|---|---|---|---|
| 1 | baseline | snapshot local e produção read-only | diff aprovado, backup e versões registrados |
| 2 | segredo Netlify e inventário | AUT-01 | `ATTRIBUTION_CLAIM_SECRET` presente; segredo Apps apenas inventariado |
| 3 | site/backend off | AUT-02; suíte verde | deploy exato, flag false, sem JID |
| 4 | verify-target | três URLs/IDs da interface | `ALVO CANÔNICO CONFIRMADO` |
| 5 | segredo Apps e deploy schema off | AUT-01 + AUT-03 | segredo presente, versão nova, deployment preservado, property off |
| 6 | dry-runs | AUT-04 | planos revisados, sem conflito e sem escrita inesperada |
| 7 | identidade | AUT-05 | migração idempotente e reconciliada |
| 8 | schema | AUT-06 | v1 habilitado, legado saudável, site ainda off |
| 9 | smoke | AUT-07 quando houver escrita | evidência segura ou lacuna mantida como N/D |
| 10 | flag/JID | AUT-08 | janela isolada, remoção de JID comprovada |
| 11 | Meta params | AUT-09 | objetos exatos, controle preservado, sem verba nova |
| 12 | fechamento | todos os pós-voos | local = commit = publicado |
