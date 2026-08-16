# Governança operacional — repositório, Drive e plataformas

**Status:** fonte canônica de organização do ecossistema digital

**Atualizado em:** 15 de agosto de 2026

**Escopo:** campanhas, site, bot, WhatsApp, LEADS, CRM, Apps Script, criativos, auditorias, publicação e monitoramento

## 1. Objetivo

Este documento define onde procurar, onde alterar e onde arquivar cada tipo de informação. O objetivo é permitir mudanças futuras sem trabalhar em arquivos errados, criar cópias concorrentes, perder decisões ou publicar uma versão diferente da aprovada.

A regra central é:

> Cada assunto tem uma fonte canônica. Os demais locais podem apontar para ela ou guardar evidências, mas não disputar sua autoridade.

## 2. Mapa de autoridade

| Assunto | Fonte canônica para decisão ou edição | Fonte do estado atual | Papel do Drive | Regra em caso de divergência |
|---|---|---|---|---|
| Código do site e páginas | repositório local | site público e Netlify | nenhum código editável; apenas evidências | o commit aprovado define o que deveria estar publicado; verificar produção antes de concluir |
| Bot e funções do WhatsApp | `netlify/functions/`, testes e documentação local | funções Netlify, provedor do WhatsApp e filas ao vivo | evidências anonimizadas e releases fechados | não corrigir pela cópia do Drive; corrigir o código local e publicar o commit aprovado |
| Apps Script e lógica da LEADS | `apps-script/clinica-liv-leads/` | deployment canônico e planilha LEADS | evidências, exports e backups controlados | validar IDs canônicos; nunca escolher projeto ou planilha pelo título |
| Dados dos pacientes e operação | planilha LEADS e CRM canônicos | planilha/CRM ao vivo | somente exportações necessárias, em área restrita | o dado ao vivo prevalece; divergências exigem reconciliação por ID e regra documentada |
| Estratégia de aquisição | `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` | não se aplica | consulta e evidência; nenhum norte concorrente | o Norte local commitado prevalece |
| Decisões e mudanças de aquisição | Norte + `campanhas/HISTORICO-ESTRATEGICO-AQUISICAO.md` | configuração ao vivo de Google Ads e Meta Ads | exports datados e auditorias | separar estratégia pretendida de configuração observada; corrigir a divergência explicitamente |
| Códigos e atribuição | contratos e registros em `campanhas/` + código/testes | parâmetros, eventos, LEADS e CRM ao vivo | evidências anonimizadas | não inferir significado de código; usar contrato e registro canônicos |
| Criativos originais | Drive, em `04 — Criativos e biblioteca de mídia` | ativo associado na plataforma de anúncios | biblioteca original e aprovada | o arquivo no Drive é o original; a variante publicada deve ter identificação verificável |
| Ativos otimizados do site | repositório local | site público | original pode permanecer no Drive | a versão do site deve sair do commit, não de upload manual avulso |
| Auditorias em andamento | pasta `auditorias/` no repositório | fontes consultadas ao vivo | nenhum rascunho concorrente | trabalhar e revisar localmente |
| Auditorias concluídas | versão local commitada | não se aplica | cópia fechada para consulta em `05 — Auditorias...` | se divergir, regenerar o arquivo do Drive a partir do commit; não editar os dois separadamente |
| Pendências e prazos das auditorias | `docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md` | Calendar apenas como lembrete | projeção executiva atualizada no mesmo arquivo | o plano local prevalece; evento ou matriz desatualizada deve ser corrigido |
| SEO, analytics e descoberta por IA | código, contratos e planos locais | GSC, GA4, Bing e site público | snapshots e evidências datadas | fatos atuais vêm das plataformas; mudanças técnicas nascem no repositório |
| Agenda e consultas | regras locais do Apps Script | Calendar e LEADS ao vivo | evidência somente quando necessária | reconciliar Calendar e Opportunity ID; não usar export antigo como agenda atual |
| Segredos e credenciais | gerenciador seguro da plataforma | variáveis configuradas no ambiente | nenhum segredo | nunca salvar valores secretos no repositório ou Drive |

## 3. O que deve ficar no repositório local

O repositório é o lugar de trabalho e versionamento. Devem permanecer aqui:

- código do site, bot, funções serverless e Apps Script;
- testes automatizados, fixtures sintéticas e gates de publicação;
- estratégia canônica e histórico de decisões;
- contratos de dados, códigos, atribuição e integrações;
- runbooks de publicação, migração, monitoramento e rollback;
- auditorias enquanto estão sendo produzidas ou executadas;
- registros de execução que precisam acompanhar o código;
- documentação técnica necessária para outra pessoa reproduzir a mudança.

Diretórios de entrada:

| Necessidade | Começar por |
|---|---|
| Google Ads, Meta Ads, orçamento, campanhas, palavras, páginas e conversões | `AGENTS.md`, este documento, `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` e `campanhas/HISTORICO-ESTRATEGICO-AQUISICAO.md` |
| Rotina automatizada de revisão do Google Ads | `campanhas/ROTINA-AUTOMATIZADA-REVISAO-GOOGLE-ADS.md` e `google-ads-scripts/google-ads-search-review-email.js` |
| Agregado anônimo usado pela rotina do Google Ads | contrato no repositório e arquivo ao vivo `LIV — Agregados Google Ads — sem PII` dentro de `02 — Campanhas`; nunca duplicar a planilha LEADS nem adicionar PII ao agregado |
| Atribuição e códigos | `campanhas/CONTRATO-ATRIBUICAO-ORIGEM.md`, `campanhas/REGISTRO-CODIGOS-ATRIBUICAO.md` e código correspondente |
| Bot e atendimento | `docs/whatsapp-clinica-liv-operacao.md`, `netlify/functions/` e testes correspondentes |
| LEADS, CRM e Apps Script | `apps-script/clinica-liv-leads/README.md`, `production-target.json` e arquivos `.gs` |
| Site, SEO e publicação Netlify | páginas/componentes, `docs/seo-technical-quality-gates.md`, `netlify.toml` e testes técnicos |
| Auditoria ativa | `auditorias/<auditoria-datada>/` e as fontes vivas descritas no escopo |
| Próxima etapa, prazo ou momento de publicação | `docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md` |
| Publicação da auditoria SEO/IA/atribuição | `docs/auditoria-seo-ia-atribuicao-publicacao.md` |

Não devem entrar no repositório:

- exportações brutas de conversas;
- listas com nomes, telefones, e-mails ou informações clínicas;
- segredos, tokens ou credenciais;
- arquivos grandes de mídia que existam apenas como originais de produção;
- cópias manuais da planilha LEADS;
- downloads de relatórios que não tenham função de teste, auditoria ou reprodução.

## 4. O que deve ficar no Google Drive

Pasta principal: [LIV AMANDA MARKETING](https://drive.google.com/drive/folders/1-pBl3C2XpvOHJ09Skvdqs-6hbPgpx9nq)

Índice do Drive: [00 — LEIA-ME — organização e regras.md](https://drive.google.com/file/d/1nOzoVrL1TwK-oFLyOC_uO5gy01Cf14If/view)

Planilha canônica: [LEADS](https://docs.google.com/spreadsheets/d/1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU/edit)

O Drive é a área de consulta humana, arquivos originais, exportações e evidências. Deve conter:

- originais aprovados de imagens e vídeos;
- exportações datadas de Google Ads, Meta Ads, GA4, Search Console e outros sistemas;
- cópias fechadas de auditorias concluídas e respectivos anexos;
- evidências de publicação e monitoramento que não pertençam ao código;
- uma projeção de leitura do plano executivo de pendências, sempre atualizada no mesmo arquivo;
- materiais operacionais que precisem ser compartilhados com a equipe;
- exportações sensíveis somente na área restrita e com permissões revisadas.

O Drive não deve conter:

- uma segunda cópia editável do código;
- uma segunda estratégia de campanhas;
- outra planilha operacional chamada LEADS;
- rascunhos duplicados da mesma auditoria;
- documentos chamados `final`, `final 2`, `novo` ou `cópia` para representar versões;
- segredos ou credenciais;
- dados pessoais fora da pasta restrita.

### Estrutura do Drive

| Pasta | Uso correto |
|---|---|
| `00 — Governança e fontes canônicas` | links, padrões, contratos compartilháveis e histórico substituído |
| `01 — Operação — Bot, WhatsApp, LEADS e CRM` | evidências operacionais, mudanças em andamento e releases fechados |
| `02 — Campanhas — Google Ads e Meta Ads` | exports e materiais por plataforma; planos substituídos vão para `99 — Histórico` |
| `03 — Site — SEO, IA e atribuição` | evidências técnicas e exports de plataformas; nunca código editável |
| `04 — Criativos e biblioteca de mídia` | originais, versões aprovadas e atalhos para acervos antigos |
| `05 — Auditorias, execuções e monitoramento` | uma pasta datada por auditoria ou pacote executado |
| `90 — Dados sensíveis — acesso restrito` | conversas e exportações com dados pessoais, com acesso mínimo |

As pastas legadas `04.1`, `04.2`, `04.3` e `90.1` permanecem também na raiz porque movê-las poderia alterar permissões herdadas. Os atalhos dentro de `04` e `90` são o caminho organizado de acesso; novos arquivos devem entrar na pasta temática correta, não nas pastas legadas da raiz.

## 5. O que deve ser consultado diretamente nas plataformas

O estado ao vivo não deve ser reconstruído a partir de um export antigo. Consultar diretamente:

- Google Ads e Meta Ads para campanhas, anúncios, orçamentos, lances, palavras, públicos, status, rascunhos e conversões configuradas;
- LEADS e CRM para situação atual do contato e do funil;
- Calendar para compromissos atuais;
- GA4, Search Console e Bing para métricas e diagnósticos atuais;
- Netlify para deploy, variáveis, logs e funções ativas;
- Apps Script para deployment e versão ativos;
- provedor do WhatsApp para entrega e eventos, quando necessário.

Todo fato extraído de plataforma deve registrar data, hora, fuso, conta/propriedade, período e limitação. Um export no Drive é um snapshot, não o estado atual.

## 6. Ordem obrigatória para começar um trabalho

1. Ler `AGENTS.md` e este documento.
2. Identificar a área e ler a fonte canônica local indicada na seção 3.
3. Conferir código, testes e histórico relacionados.
4. Consultar a plataforma ao vivo em modo somente leitura para confirmar o estado atual.
5. Usar o Drive para buscar evidências, originais ou exports necessários.
6. Registrar divergências antes de propor ou executar mudanças.
7. Definir escopo, dependências, teste, guardrail e rollback.

Não começar por um arquivo do Drive apenas porque ele parece recente. Data, título ou posição na pasta não provam que seja a fonte vigente.

## 7. Fluxos por tipo de trabalho

### 7.1 Criar, ajustar ou reavaliar campanhas

1. Ler o Norte, o histórico estratégico e os registros de códigos.
2. Confirmar a configuração ao vivo da conta correta.
3. Reconciliar métricas com LEADS/CRM e marcar N/D quando a jornada não puder ser ligada.
4. Salvar exports de evidência no Drive, com data e período.
5. Registrar decisões estratégicas no Norte e no histórico local.
6. Executar alterações externas apenas após autorização específica.
7. Registrar exatamente o que mudou, horário, conta, baseline e data de revisão.

### 7.2 Alterar o bot ou a comunicação do WhatsApp

1. Ler o manual operacional e localizar a regra no código.
2. Avaliar o contexto completo necessário e usar apenas exemplos anonimizados.
3. Alterar localmente e adicionar teste de regressão.
4. Executar a suíte pertinente e revisar privacidade, handoff e idempotência.
5. Commitar, solicitar autorização, publicar no Netlify e fazer smoke test.
6. Registrar o release no manual e, quando necessário, guardar evidência fechada no Drive.

### 7.3 Alterar LEADS, CRM ou Apps Script

1. Ler o README do Apps Script e `production-target.json`.
2. Validar projeto, deployment e planilha pelos IDs canônicos.
3. Inventariar cabeçalhos e fórmulas antes de escrever.
4. Desenvolver e testar localmente; migração deve ter preflight/dry-run realmente não mutante.
5. Obter autorização específica para escrita ou migração em produção.
6. Publicar preservando o deployment canônico, verificar a versão e reconciliar LEADS/CRM/Calendar.
7. Registrar versão, horário, testes, efeitos e rollback.

Nunca editar uma cópia da LEADS como se fosse produção.

### 7.4 Alterar site, SEO, atribuição ou analytics

1. Trabalhar no repositório e preservar a separação entre técnica e comunicação.
2. Usar originais do Drive somente como fonte de mídia; gerar a versão publicável no repositório.
3. Executar testes, build restrito e inspeção do artefato.
4. Commitar o escopo aprovado.
5. Publicar exatamente esse commit e verificar site, tracking, consentimento e rotas.
6. Registrar evidência e janela de monitoramento.

### 7.5 Produzir ou executar uma auditoria

1. Criar uma única pasta local datada em `auditorias/`.
2. Manter resumo, matriz, evidências e execução dentro dessa pasta, sem relatórios concorrentes.
3. Revisar, remover PII e commitá-la.
4. Salvar no Drive uma cópia fechada sob `05 — Auditorias, execuções e monitoramento`.
5. Se a auditoria continuar sendo executada, atualizar o registro local e substituir a cópia fechada no Drive; não criar `versão final 2`.
6. Atualizar o plano executivo local e sua projeção única no Drive, inclusive quando a próxima data mudar.

## 8. Estados de uma mudança

Toda mudança deve passar, na ordem aplicável, por:

1. `planejada`;
2. `em implementação local`;
3. `testada localmente`;
4. `commitada`;
5. `autorizada para publicação`;
6. `publicada`;
7. `verificada em produção`;
8. `em monitoramento`;
9. `mantida`, `revertida` ou `encerrada`.

Não usar “pronto” para misturar implementação, publicação e verificação. Código default-off publicado também não significa função ativada.

## 9. Regra de igualdade e publicação

Antes da publicação:

- versão local = commit aprovado;
- worktree sem alterações fora do escopo;
- testes e gates aprovados;
- autorização explícita registrada.

Depois da publicação:

- versão local = commit aprovado = versão publicada;
- smoke tests aprovados;
- plataforma externa e número de versão/deploy registrados;
- documentação canônica atualizada;
- janela de monitoramento e regra de rollback definidas.

Alterações manuais em Google Ads, Meta Ads, Sheets, Calendar, GA4 ou outra plataforma não aparecem no Git. Por isso, devem ser registradas no histórico ou registro de execução local com conta, data, mudança exata, evidência e autorização.

## 10. Convenções de nomes

### Local

- documento canônico: nome estável e descritivo, sem sufixo `final`;
- auditoria: `auditorias/<assunto>-AAAA-MM-DD/` ou o padrão já iniciado pela auditoria correspondente;
- teste: próximo do componente ou na suíte de domínio existente;
- histórico: arquivo próprio de histórico, sem duplicar o documento vigente.

### Drive

- pasta de auditoria/execução: `AAAA-MM-DD — área — assunto`;
- exportação: `AAAA-MM-DD — plataforma — relatório — período`;
- evidência de release: `AAAA-MM-DD — sistema — versão ou commit`;
- backup: `SISTEMA — backup antes de <mudança> — AAAA-MM-DD HHhMM`;
- material substituído: mover para `99 — Histórico`.

## 11. Regras contra redundância

- Preferir links e atalhos a cópias.
- Atualizar o arquivo existente em vez de criar outro com o mesmo propósito.
- Não copiar o repositório para o Drive.
- Não baixar a LEADS para virar uma base paralela.
- Não editar auditoria simultaneamente no Drive e no repositório.
- Não manter dois contratos de atribuição, dois registros de códigos ou dois nortes estratégicos.
- Se um arquivo foi substituído, registrar o sucessor e arquivar o anterior.
- Se o Drive estiver indisponível, marcar a sincronização como pendente; não criar um “Drive alternativo”.

## 12. Privacidade e segurança

- Dados de pacientes ficam somente nos sistemas operacionais canônicos e, quando estritamente necessário, na área restrita do Drive.
- Auditorias, repositório, campanhas e criativos não devem conter nome, telefone, e-mail, mensagem literal, click ID, `wamid`, ID reversível ou informação clínica.
- Exemplos de testes devem ser sintéticos e marcados como tais.
- Antes de mover arquivos no Drive, revisar o efeito das permissões herdadas.
- Não excluir backups, conversas ou exports sensíveis sem comparar conteúdo, retenção e necessidade legal.
- Segredos ficam no gerenciador seguro da plataforma, nunca em arquivo do Drive ou commit.

## 13. Checklist de encerramento

Antes de declarar um trabalho concluído, registrar:

- escopo executado;
- arquivos locais alterados;
- fonte canônica atualizada;
- testes e resultados;
- commit;
- autorização recebida;
- plataformas alteradas e versões/deploys;
- smoke tests;
- evidências salvas no local correto do Drive;
- métricas, janela e responsável pelo monitoramento;
- rollback;
- confirmação de que não existe cópia concorrente;
- confirmação de igualdade entre local, commit e produção, quando houve publicação.

## 14. Regra de decisão rápida

Quando houver dúvida sobre onde colocar algo:

- **é código, regra, estratégia, contrato, teste ou runbook?** Repositório local;
- **é dado operacional atual?** Sistema ao vivo canônico;
- **é original de mídia, export, anexo ou evidência fechada?** Drive;
- **contém dado pessoal?** Sistema canônico ou `90 — Dados sensíveis`, com acesso mínimo;
- **é apenas outra cópia do que já existe?** Não criar.
