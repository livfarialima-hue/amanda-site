# Contrato de atribuição de origem

**Status:** rascunho técnico local v1, não publicado e não ativado em produção.
**Data de referência:** 2026-08-15, America/Sao_Paulo.
**Escopo:** aquisição e mensuração; este documento não altera texto clínico, mensagem ao paciente, preço, público, orçamento, lances ou estratégia.

## 1. Autoridade e objetivo

O `NORTE-ESTRATEGICO-GOOGLE-ADS.md` continua sendo a fonte canônica para estratégia, campanha, público, orçamento, conversões e gates de escala. Este contrato é subordinado ao Norte e define somente como evidências de origem devem ser coletadas, transportadas, resolvidas e projetadas entre site, WhatsApp, webhook, LEADS e CRM.

Se uma implementação exigir mudança estratégica, ela deve ser interrompida e tratada em trabalho separado, com atualização do Norte e do seu histórico. Este rascunho, por si só, não autoriza publicação, ativação de flag, migração de planilha, alteração externa nem gasto.

O objetivo é permitir uma leitura auditável de origem sem converter clique em resultado, inferência em fato ou identificador técnico em identidade pessoal.

## 2. Estados operacionais

- `implementado_local_nao_publicado`: existe no worktree e possui evidência local, mas não há comprovação de commit aprovado, artefato publicado ou funcionamento live.
- `parcial_local_nao_publicado`: parte do contrato existe localmente, mas há requisito técnico, operacional, externo ou jurídico pendente.
- `bloqueado_externo_ou_juridico`: depende de acesso, leitura, decisão ou escrita fora do repositório, ou de validação médica, de privacidade, jurídica ou tributária.
- `planejado`: não há implementação material suficiente no estado local inspecionado.

Nenhum desses estados equivale a `live`, `aceito pela plataforma`, `indexado`, `atribuído causalmente` ou `conversão confirmada`.

## 3. Unidade de registro e vocabulário

### 3.1 Entidades

- **Touchpoint:** evidência observada em um instante e sessão, com origem, canal e metadados mínimos.
- **Jornada:** sequência limitada de touchpoints associada a um identificador aleatório e não pessoal.
- **First touch:** primeiro touchpoint válido da jornada. Depois de gravado, é imutável.
- **Last touch:** touchpoint válido mais recente, atualizado apenas por timestamp igual ou posterior ao atual.
- **Last non-direct touch:** touchpoint não direto mais recente, também monotônico por timestamp.
- **Conversa atual:** origem resolvida para o contato recebido agora; não reescreve first touch.
- **Origem informada:** declaração explícita da própria pessoa, sempre separada de evidência observada.
- **J0:** identificador aleatório do estado da jornada no navegador; permanece no cliente e não é chave canônica de LEADS ou CRM.
- **J1:** credencial de transporte curta, opaca, rotacionada a cada tentativa iniciada pela pessoa e resgatável uma única vez durante dez minutos.
- **J2:** identificador aleatório da jornada durável no backend, com prazo absoluto de 30 dias.
- **C1 claimant:** HMAC com separação de domínio derivado do provider Event ID para vincular de modo idempotente o resgate de J1 sem persistir o Event ID no claim.
- **Correlation ID:** pseudônimo HMAC versionado usado somente para correlacionar logs operacionais seguros.

### 3.2 Enum canônico de origem

O enum v1 deve distinguir, sem colapsar categorias:

`Google Ads`, `Meta Ads`, `Google orgânico`, `Bing orgânico`, `ChatGPT`, `Copilot`, `Perplexity`, `Gemini`, `Instagram orgânico`, `Indicação`, `Retorno de paciente`, `Acesso direto`, `Origem informada pelo paciente` e `Desconhecida`.

`Retorno de paciente`, `Acesso direto`, `Origem informada pelo paciente` e `Desconhecida` são estados diferentes. Na ausência de evidência suficiente, usar `Desconhecida`; nunca preencher por suposição.

`Origem informada pelo paciente` é reservada à projeção dedicada `reported_origin`. Ela não é um valor válido de first touch, last touch ou origem da conversa atual observados. O valor declarado usa a taxonomia fechada `Indicação`, `Instagram`, `Google`, `IA`, `Retorno`, `Outro` ou `Não sabe`.

### 3.3 Confiança e fallback

O nível de confiança deve usar lista fechada, como `observed`, `partial`, `inferred`, `patient_reported` e `unknown`. `patient_reported` é exclusivo da origem declarada explicitamente e não qualifica first/current touch observados. Toda atribuição parcial, inferida ou desconhecida deve carregar um motivo de fallback versionado e limitado. Valor ausente não é igual a inválido, e nenhum dos dois é igual a zero.

## 4. Contrato da jornada v1

### 4.1 Campos permitidos

A jornada pode conter somente:

- versão do contrato;
- identificadores aleatórios de jornada e sessão;
- `created_at` e `expires_at` em UTC/ISO 8601;
- first touch, last touch e last non-direct touch;
- caminho de conversão em enum fechado;
- códigos estáveis de campanha, grupo/conjunto e criativo;
- IDs Meta estritamente normalizados quando observados;
- `gclid`, `gbraid` ou `wbraid` quando necessários à atribuição permitida;
- caminho de página sem query string e localização controlada do CTA;
- confiança e motivo de fallback limitados.

Não são permitidos nome, telefone, e-mail, texto livre, mensagem, fotografia, diagnóstico, queixa, conteúdo clínico, URL completa com query, cabeçalhos do provedor ou payload bruto.

### 4.2 TTL absoluto por identificador

Os prazos v1 são absolutos e não deslizantes:

- **J0 no navegador:** estado local da jornada por até 30 dias desde `created_at`;
- **J1 para resgate:** janela máxima de dez minutos desde a criação do claim;
- **claim/tombstone de J1:** retenção máxima de 30 dias para impedir reuso ou rearmamento e permitir expurgo controlado;
- **J2 no backend:** jornada durável por 30 dias desde `created_at`.

O estado J0 no navegador pode atualizar current/last touch apenas dentro de seu prazo original, sem alterar first touch nem renovar a expiração. Cada tentativa de contato gera um J1 novo e congela um envelope J2 próprio; repetir o mesmo J1 ou resgatá-lo novamente com o mesmo claimant não altera esse envelope nem renova qualquer prazo. Jornada expirada exige novo estado; token vencido não pode ser rearmado. A resolução expirada devolve ausência controlada.

O purge físico diário de J1/claims e J2 expirados está preparado localmente com orçamento limitado por execução. Sua função agendada, configuração e execução em produção ainda precisam ser publicadas e verificadas. Retenções posteriores em Sheets, CRM, backups ou plataformas não são definidas por este contrato e dependem de inventário e decisão próprios.

### 4.3 First touch imutável

Depois do primeiro registro válido:

- `first_touch` e seus campos não podem ser sobrescritos por retorno, novo clique, nova conversa ou backfill ambíguo;
- campos de first touch vazios só podem ser preenchidos por evidência determinística da mesma jornada, sem copiar dimensão incompatível de toque posterior;
- last touch e conversa atual podem avançar com evidência mais recente, sem alterar first touch;
- backfill deve registrar método, confiança e data, ou permanecer `N/D`.

## 5. Token de transporte e regra `JID`

O token v1 deve ser curto, aleatório, opaco e versionado, no formato `J1_` seguido de material aleatório base64url. Ele não pode conter ou derivar de telefone, nome, mensagem, ID de mídia, provider Event ID ou código de campanha.

Uso permitido:

1. o navegador mantém J0 local e gera um novo J1 em cada tentativa iniciada pela pessoa;
2. o site registra no backend um envelope fechado; o backend associa J1 a um J2 durável sem aceitar J0 como chave de storage;
3. J1 acompanha o clique voluntário no WhatsApp como linha técnica `JID: <token>`;
4. o webhook deriva C1 por HMAC do provider Event ID e usa esse claimant para resgatar J1 atomicamente;
5. depois do primeiro resgate atômico, o mesmo C1 pode repetir a resolução idempotentemente, mas outro claimant não pode assumir o claim já vinculado;
6. a resolução respeita dez minutos para J1 e 30 dias absolutos para J2/claim;
7. falha, ausência ou expiração produzem fallback explícito e não bloqueiam o atendimento.

Uso proibido:

- usar o token como identidade da pessoa, chave de oportunidade, transaction ID ou correlation ID;
- registrar o token em console, alerta, e-mail ou telemetria;
- persistir a linha `JID` ou o token nas abas de mensagens, leads, eventos ou CRM;
- encaminhar a linha `JID` a modelos, respostas, classificadores de conteúdo ou mensagens humanas.

Após a extração transitória a partir do texto bruto, a linha `JID` deve ser removida antes do bot, do objeto `lead.text`, do Apps Script, de Sheets e de qualquer persistência ou consumo que não seja a resolução da jornada. A mensagem visível da pessoa deve permanecer idêntica, exceto pela remoção dessa linha técnica.

O claim atômico não impede encaminhamento antes do primeiro resgate. Se outra pessoa receber a linha `JID` e resgatá-la primeiro dentro da janela, o token fica vinculado ao C1 desse primeiro evento. Esse risco reduz a confiança da atribuição e bloqueia a ativação enquanto a operação não aceitar explicitamente o risco ou comprovar um transporte que preserve a associação sem expor uma credencial encaminhável.

## 6. Precedência e projeções

Quando existir jornada v1 resolvida e válida, suas dimensões normalizadas prevalecem para as projeções de jornada. A evidência legada permanece disponível para auditoria e fallback, sem sobrescrever first touch.

Na ausência de jornada resolvida, usar somente evidências observadas na ordem documentada pela implementação: referral estruturado do provedor; referência/código explícito e válido; click ID válido; código de CTA/site; por fim, desconhecida. A origem informada permanece em `reported_origin` e nunca é promovida a first/current touch. Uma referência incompleta não deve ganhar campanha por inferência.

As projeções mínimas são separadas:

- aquisição inicial;
- último toque e último toque não direto;
- origem da conversa atual;
- origem informada;
- caminho de conversão;
- campanha, grupo/conjunto, criativo, landing e CTA;
- confiança, fallback e versão do schema.

LEADS e CRM devem ser projeções do mesmo registro canônico, nunca fontes concorrentes. Divergência deve gerar alerta/revisão, não overwrite silencioso.

### 6.1 Joins canônicos

- **Provider Event ID:** chave exata de idempotência do evento recebido e de seus retries no ledger operacional. Pode ser mantida somente onde necessária ao processamento protegido; não entra em logs, mídia, J0, J1, J2 ou texto.
- **Opportunity ID:** chave canônica da oportunidade para reconciliar LEADS, CRM, fases, agenda e conversões downstream. Telefone pode ajudar na resolução controlada, mas não substitui o join por Opportunity ID.
- **C1 claimant:** derivação HMAC do provider Event ID usada apenas para o resgate atômico de J1. C1 não substitui Provider Event ID no ledger nem Opportunity ID no funil.
- J0, J1 e J2 são identificadores técnicos de atribuição e nunca se tornam identidade pessoal ou chave comercial.

## 7. Flags, schema e migração

O produtor no site e o consumidor no Apps Script são **default-off**:

- site: a jornada só é produzida quando a feature flag v1 for exatamente `true`;
- Apps Script: as colunas e gravações de atribuição só ficam ativas com a versão de schema explicitamente habilitada;
- ausência, erro de leitura ou valor desconhecido devem falhar fechados para a nova atribuição, sem impedir o atendimento legado.

Publicar código não habilita a feature nem aplica schema. A ativação do schema exige preflight, confirmação explícita e execução separada. Migração e backfill são pacotes próprios, posteriores, com autorização específica; não podem ser acoplados ao deploy do código.

## 8. Idempotência, logs e privacidade

- O primeiro registro congela o envelope J2 inteiro e sua expiração; retry do mesmo J1 só é aceito quando o payload normalizado é integralmente equivalente, sem regravação, e qualquer divergência falha fechada.
- O claim J1 é atômico e, depois do primeiro resgate, idempotente somente para o mesmo C1; antes disso, encaminhamento da credencial continua possível.
- Processamento de evento mantém a idempotência operacional existente; um retry não cria nova oportunidade ou novo evento de negócio.
- Logs usam envelope fechado de categoria, motivo, status, timestamp e correlation ID HMAC versionado.
- Sem segredo HMAC válido, o correlation ID usa fallback constante e não reversível; nunca usa last4, telefone, mensagem, evento, message ID ou ID do provedor.
- Logs não contêm conteúdo, procedimento, payload bruto ou identificadores técnicos da jornada.
- A política de retenção e acesso de logs e repositórios externos permanece pendente de decisão operacional/jurídica; este documento não inventa prazo externo.

## 9. Gate de ativação

A ativação só pode ser proposta quando todos os itens abaixo estiverem comprovados em ambiente autorizado:

1. contrato e decisão de privacidade aprovados;
2. TTL absoluto testado para J0/J2/claim em 30 dias e para resgate J1 em dez minutos;
3. linha `JID` removida antes de qualquer persistência em Sheets/CRM ou envio a modelo;
4. first touch imutável e last touch monotônico em testes de retorno, múltiplas abas e retry;
5. enum completo, incluindo retorno e origem informada;
6. feature e schema fechados por padrão e habilitados separadamente;
7. migração em dry-run, cópia/backup e rollback aprovados;
8. LEADS=CRM para a mesma oportunidade em sonda sintética/controlada;
9. logs sem PII, conteúdo ou IDs reversíveis;
10. ausência de regressão clínica, de mensagem, de roteamento e de idempotência;
11. risco de encaminhamento antes do primeiro resgate formalmente aceito ou mitigado por transporte comprovado; sem isso, a ativação permanece bloqueada e a confiança não pode ser `observed` apenas pelo J1;
12. publicação vinculada a commit e artefato aprovados;
13. smoke test live autorizado, sem confundir clique com lead qualificado.

Enquanto qualquer gate estiver aberto, a feature e o schema permanecem desligados e campanhas dependentes de atribuição ponta a ponta não podem escalar por proxy.

## 10. Rollback

Rollback técnico, nesta ordem:

1. desligar a feature flag do site;
2. desabilitar a versão do schema sem apagar colunas ou dados já gravados;
3. manter o caminho legado e o atendimento funcionando;
4. interromper novas gravações e resoluções v1, preservando evidência necessária à reconciliação autorizada;
5. não executar limpeza, migração reversa ou expurgo sem plano e autorização próprios;
6. registrar motivo, alcance, horário, versão, métricas afetadas e critério de reativação.

Rollback não reescreve first touch e não transforma dados ausentes em zero.

## 11. Snapshot local e lacunas conhecidas em 2026-08-15

O estado local inspecionado implementa, sem publicação:

- J0 no navegador, J1 rotacionado por tentativa, claim atômico e J2 durável;
- TTL absoluto: dez minutos para resgate J1 e 30 dias para J0, J2 e retenção do claim/tombstone;
- C1 HMAC derivado do provider Event ID, com separação de domínio e falha fechada sem segredo;
- remoção da linha `JID` antes de bot, `lead.text`, Apps Script e Sheets;
- allowlists de origem observada e de origem informada separadas; `reported_origin` aceita somente `Indicação`, `Instagram`, `Google`, `IA`, `Retorno`, `Outro` ou `Não sabe` e fixa confiança `patient_reported`;
- schema aditivo default-off e projeções dedicadas de origem informada/confiança em `_WHATSAPP_EVENTOS`, CRM e LEADS, sem sobrescrever first/current touch nem células de declaração já preenchidas;
- purge físico limitado e agendamento diário preparados localmente;
- feature do site e schema do Apps Script fechados por padrão.

Ainda permanecem abertos:

- a suíte integral local está verde (`651/651`) e o purge tem testes próprios aprovados, mas execução, retenção e remoção física em produção permanecem N/D;
- o agendamento diário, o segredo do purge e a remoção física não foram publicados, configurados ou observados em produção;
- ainda não há produtor de `reported_origin`: nenhum texto ou contexto é interpretado automaticamente, e o campo permanece vazio sem declaração estruturada explícita;
- J1 ainda depende de uma linha `JID` visível/editável no texto pré-preenchido; remover ou alterar a linha perde a resolução, e nenhum transportador oculto foi comprovado;
- o registro v1 considera `M26O01W` conflitante para o caminho quando não há landing/CTA, pois seu uso histórico inclui WhatsApp direto e site;
- o alerta agregado previsto em ATR-008 não foi comprovado;
- retenção, acesso, backups e expurgo de Sheets, CRM e sistemas externos não foram definidos;
- não houve publicação, ativação de flags/schema, migração, sonda live ou validação de estado de produção neste trabalho.

Esses itens são bloqueadores de ativação, não evidência de falha live, pois o estado live não foi inspecionado nem alterado.
