# Privacidade e consentimento

**Convenção de evidência:** comportamento e campos encontrados em código/documentos/dados são **fatos observados**; proporções são **cálculos**; avaliação de risco é **inferência**; arquitetura sugerida é **hipótese/proposta**; base jurídica ou estado externo não verificado é **N/D**.

## Parecer

Há três riscos prioritários independentes:

1. **[Fato observado | confiança alta]** funções Netlify registram fragmentos de telefone (`patientLast4`/`senderLast4`) e IDs brutos de evento/mensagem em logs operacionais;
2. **[Fato observado | confiança alta]** três dos cinco transaction IDs preparados para Google Ads usam formatos legados potencialmente pessoais/derivados, incluindo ID bruto de provedor ou derivação do transporte WhatsApp.
3. **[Fato observado | confiança alta]** após consentimento, o código do evento GA4 `whatsapp_click` inclui `page_path`, `page_type`, `content_group`, `cta_location` e `cta_text`. Em páginas médicas, esses parâmetros podem revelar interesse/procedimento. A política pública afirma que o evento não envia nome de procedimento como parâmetro personalizado. O envio efetivo/recebimento no GA4 neste corte é **N/D**.

O carregamento de tags respeita a escolha: Google e Meta só são carregados após aceite. A atribuição mínima da sessão e click IDs Google são tratados separadamente das tags e podem acompanhar o contato voluntário pelo WhatsApp. Esse comportamento está descrito na política pública e no Norte, mas contradiz o guia interno de tráfego pago. A base jurídica, necessidade e prazo de retenção exigem validação especializada; esta auditoria técnica não emite parecer jurídico.

## Comportamento real por estado

| Estado | Google/GA4 | Meta Pixel | armazenamento | WhatsApp | Parecer |
|---|---|---|---|---|---|
| antes da escolha | consent default `denied`; script não carregado | não carregado | UTMs/código/click IDs podem entrar em `sessionStorage` | referência e click ID disponível podem ser inseridos no link | tags bloqueadas; atribuição mínima separada da mensuração |
| aceito | script Google carrega; `whatsapp_click` pode enviar página/tipo/texto/posição do CTA; conversão Ads genérica não leva esses campos | Pixel carrega e PageView pode ocorrer; não há evento de contato Meta no código atual | preferência em `localStorage`; atribuição continua na sessão | CTA pode disparar eventos consentidos e abrir mensagem | bloqueio prévio funciona; payload GA4 semântico conflita com minimização/política |
| recusado | não carrega; cookies de medição são apagados | não carrega; cookies apagados | persistência opcional/local é removida; click IDs da sessão atual são preservados | contato continua e click ID pode acompanhar mensagem | comportamento deliberado; requer consistência documental e minimização |
| revogado | consent volta a denied; cookies/persistência opcional removidos | idem | mantém click IDs da sessão atual | novo clique voluntário pode transportá-los | testes locais confirmam |
| nova sessão/retorno | tags seguem preferência persistida | idem | atribuição de marketing anterior não é recuperada | código/click ID anterior se perde | reduz rastreabilidade; não autoriza fingerprinting |

**[Fato observado]** Embora haja configuração chamada `advancedConsentMode`, a implementação carrega as bibliotecas Google/Meta somente após aceite. Na prática, o comportamento é de bloqueio prévio das tags, não o envio de pings cookieless antes do consentimento.

## Inconsistência documental

| Fonte | Regra declarada | Compatibilidade |
|---|---|---|
| Norte Estratégico | click IDs podem ser preservados na sessão e registrados no atendimento sem PII/texto clínico | compatível com código atual |
| política pública de privacidade | click ID permanece na sessão e acompanha o WhatsApp voluntário mesmo sem aceite de mensuração | compatível com código atual |
| política pública sobre evento de clique | afirma não enviar nome de procedimento como parâmetro personalizado | incompatível com `page_path`/`page_type`/`content_group`/`cta_text` potencialmente semânticos no GA4 |
| testes locais | preservam click ID de sessão após recusa/revogação | compatível com código atual |
| Guia de Linguagem de Tráfego Pago | afirma que click IDs só são anexados após consentimento e não são copiados sem aceite | incompatível/desatualizado |

**Mudança proposta:** decidir e registrar uma única regra canônica, com revisão LGPD/jurídica, e alinhar documentação e testes. Não alterar silenciosamente a implementação para “melhorar atribuição” nem remover transparência pública sem análise.

## P0 — payload semântico do GA4

**[Fato observado]** `trackWhatsAppClick()` envia ao GA4, após consentimento, `event_label`, `page_type`, `content_group`, `cta_location`, `cta_text` e `page_path`. O Google Ads recebe separadamente uma conversão genérica sem esses campos. **[Inferência | confiança alta]** path/tipo/texto podem identificar o procedimento ou interesse médico e ficam associados aos identificadores/cookies permitidos após o aceite.

**Contenção proposta:** até revisão de finalidade e base, limitar `whatsapp_click` a nome genérico, timestamp técnico e página categorizada de forma não semântica; não enviar path, texto do CTA, procedimento ou slug. Preservar a análise detalhada somente em first-party aggregate sem identificador de pessoa, se aprovada. Verificar DebugView/Tag Assistant/Network em ambiente de teste, sem paciente, e registrar o payload efetivo. Se já houver dados recebidos, retenção/exclusão na plataforma exige autorização externa específica.

## P0 — PII e identificadores nos logs

### Escopo observado

| Arquivo | Evidência | Risco |
|---|---|---|
| `netlify/functions/ycloud-webhook.mjs` | múltiplos logs com `patientLast4`/`senderLast4`; log final inclui `eventId` e `messageId` brutos; preparação de agenda registra procedimento junto do event ID | fragmento de telefone, provider IDs e interesse/procedimento ficam correlacionáveis em plataforma externa de logs |
| `netlify/functions/human-resume.mjs` | resultado do job contém `patientLast4` e `eventId` antes de `console.log` | mesma exposição em rotina agendada |
| `netlify/functions/ycloud-recovery.mjs` | resultado contém `patientLast4` e `eventId` antes de `console.log` | mesma exposição em recuperação |

**[Fato observado | confiança alta]** O briefing considera fragmento de telefone e ID reversível como PII proibida nos relatórios/saídas externas. Os logs atuais violam esse guardrail técnico. Nenhum valor real foi reproduzido nesta auditoria.

### Contenção proposta

- remover todos os campos `patientLast4` e `senderLast4`;
- não logar `messageId`, `wamid` ou `eventId` bruto do provedor;
- gerar `correlation_id` opaco por evento, diferente do transaction ID de mídia;
- manter ID bruto do provedor somente no armazenamento operacional protegido quando necessário para deduplicação/consulta ao provedor;
- limitar erro a código enumerado, status, duração, versão e contadores; nunca mensagem, telefone, nome, URL de referral, procedimento/interesse, disponibilidade individual ou texto clínico;
- adicionar teste estático e teste de captura de `console.*` que falhem com telefone, e-mail, `wamid`, fragmento de quatro dígitos associado a paciente ou chaves proibidas;
- revisar retenção e acesso dos logs Netlify existentes; exclusão/expurgo requer autorização externa específica e preservação de evidência mínima.

## P0 — transaction IDs legados

| Fato/cálculo | Resultado |
|---|---|
| total preparado observado | 5 |
| padrão opaco atual | 2/5 (40%) |
| legado potencialmente pessoal/derivado | 3/5 (60%) |
| estado interno | 5 `ready` |
| enviado/aceito/rejeitado/atribuído | N/D sem recibo |

O risco não se resolve apagando ou substituindo imediatamente. Se uma transação legada já tiver sido aceita, um novo ID pode causar duplicidade.

**Sequência segura:** conter novos legados → obter recibo por transação → classificar estado externo → migrar somente `not_sent`/`rejected` inequivocamente → preservar alias restrito para histórico → nunca reenviar `accepted`.

## Outros riscos de minimização

### Click ID no texto do WhatsApp

**[Fato observado]** GCLID/GBRAID/WBRAID podem ser anexados literalmente à mensagem. Isso envia o identificador ao ecossistema WhatsApp/YCloud e o grava no fluxo de atendimento. A política pública informa esse comportamento.

**[Risco/inferência | confiança média]** Click IDs são identificadores pseudônimos de publicidade, e a combinação com telefone/conversa em um contexto de saúde eleva o impacto de vazamento ou acesso indevido. A necessidade de offline attribution não justifica replicação ampla em texto, logs ou telas.

### Referência semântica

**[Fato observado]** A referência atual pode conter slug/página ou procedimento, visível na mensagem. **[Risco/inferência | confiança média]** Mesmo sem diagnóstico, isso pode revelar interesse relacionado à saúde quando ligado à identidade do WhatsApp.

**Proposta:** transportar apenas token opaco; resolver campanha/página no backend first-party e restringir a dimensão de página a códigos técnicos não semânticos.

### Hash de telefone

**[Fato observado]** `stableLeadHash_` usa SHA-256 truncado sem segredo. **[Inferência | confiança alta]** Para telefone, o espaço de busca é pequeno; um hash simples é pseudonimização fraca contra dicionário. Ele não deve ser tratado como anonimização nem enviado externamente.

## Desenho recomendado de HMAC/UUID

### 1. `journey_id` aleatório

- **Geração:** UUIDv4/128 bits aleatórios no servidor ou Web Crypto; nunca derivado de telefone, e-mail, IP, wamid, campanha ou procedimento.
- **Estabilidade:** um ID por jornada/first touch, preservado pelo prazo aprovado; novos IDs para novas jornadas conforme regra explícita.
- **Deduplicação:** chave idempotente `journey_id + event_type + event_version`; banco first-party com unique constraint.
- **Compatibilidade:** mensagem carrega somente token curto versionado; webhook mantém dual-read de M26/G26/SITE/legados.
- **Migração:** write-new/read-both; medir cobertura e falhas; backfill apenas quando há evidência inequívoca.
- **Testes:** aleatoriedade/formato, colisão, TTL, nova aba, retorno, recusa, token inválido, replay e link encaminhado.
- **Rollback:** feature flag para voltar ao código legível, preservando registros novos; não apagar mapping até terminar reconciliação.

### 2. HMAC para pseudônimo operacional

- **Geração:** `HMAC-SHA-256(secret_version, E164_normalizado)`, truncamento mínimo definido por análise de colisão, prefixo `h1_`.
- **Segredo:** somente em secret manager/Netlify env/Script Properties; nunca em JS cliente, planilha visível, código ou log.
- **Estabilidade:** estável dentro da versão da chave para reconciliação; não reutilizar como ID de mídia.
- **Rotação:** manter `key_version`, dual-compute durante janela curta e mapa de migração restrito; eliminar versão antiga após reconciliação e retenção aprovada.
- **Deduplicação:** unique constraint por `professional + phone_hmac + active_status`; colisão falha fechada.
- **Compatibilidade:** sistemas que precisam ligar pessoa usam HMAC; Google/Meta recebem somente seus click IDs e transaction ID opaco, nunca HMAC de telefone.
- **Testes:** vetores conhecidos, mesma entrada/mesma saída, chaves diferentes/saídas diferentes, ausência de raw phone em log/payload, colisão e rotação.
- **Rollback:** manter leitor de versão anterior temporariamente; não reverter para SHA simples como exportação externa.

### 3. `transaction_id` de mídia

- **Geração:** ID opaco determinístico por `Opportunity ID + milestone + conversion_version`, preferencialmente HMAC com segredo ou UUID persistido uma vez.
- **Estabilidade/dedupe:** a mesma oportunidade+marco retorna exatamente o mesmo ID; marcos diferentes retornam IDs diferentes.
- **Privacidade:** nenhum wamid, fragmento de telefone, nome, e-mail, campanha ou procedimento embutido.
- **Migração/rollback:** condicionado ao recibo externo, com alias restrito e nunca reenvio de aceito.

## Retenção e acesso

| Dado | Estado atual | Recomendação |
|---|---|---|
| preferência de consentimento | persiste até alteração/limpeza do navegador | manter; documentar versão/data da política |
| atribuição web | sessão; TTL declarado em outro helper não se aplica ao objeto atual | definir TTL real e testado |
| click ID | sessão no site; prazo downstream N/D | acesso restrito e retenção limitada ao ciclo de conversão/reconciliação |
| raw phone/message/provider ID | múltiplos sistemas operacionais; retenção N/D | inventariar e limitar por finalidade; não logar |
| logs Netlify | retenção/acesso N/D nesta auditoria | revisar configuração e expurgar com autorização |
| transaction ID | staging/ledger; histórico externo N/D | opaco e permanente somente para dedupe/receipts necessários |

## Testes de privacidade obrigatórios

| Teste | Esperado |
|---|---|
| visita antes do consentimento | nenhuma biblioteca Google/Meta ou cookie de mensuração |
| aceite | tags só após update; PageView único |
| recusa/revogação | cookies/persistência opcional removidos; comportamento mínimo igual à política aprovada |
| CTA com click ID | nenhum click ID em logs; transporte conforme contrato aprovado |
| logs de sucesso/erro/recovery/resume | somente correlation ID opaco e enums |
| transaction ID novo | formato opaco, estável, sem provider ID/telefone |
| rotação HMAC | dual-read sem duplicar pessoa/oportunidade |
| token encaminhado | não atribuir automaticamente ao novo destinatário; confiança rebaixada/fallback |
| URL/código com procedure | nenhum dado semântico em token/log/mídia |
| falha de storage/lookup | `unknown` + motivo; nunca inferir direto |

## Recomendações

| ID | Prioridade | Trilha/pacote/fase | Ação | Modelo/revisão sugeridos | Guardrail/rollback |
|---|---|---|---|---|---|
| `A3-PRIV-01` | P0 | T3/A/1 | redigir logs e introduzir correlation ID opaco | Sol extra-alto desenho; Sol alto implementação; Sol extra-alto revisão | teste automatizado sem PII; rollback por versão sem restaurar campos proibidos |
| `A3-PRIV-02` | P0 | T3+A/1 | conter/migrar transaction IDs legados após receipts | Sol máximo/extra-alto; revisão independente | nenhum reenvio sem estado externo; backup e alias restrito |
| `A3-PRIV-06` | P0 | T3+A/1 | retirar parâmetros semânticos do evento GA4 e reconciliar a política | Sol extra-alto + revisão privacidade/jurídica | evento genérico; payload de teste; rollback sem reintroduzir procedimento/path |
| `A3-PRIV-03` | P1 | T3/C/4 | token opaco de jornada e minimização de mensagem | Sol extra-alto; Ultra para site+webhook+CRM | dual-read; fail closed; não enviar PHI/PII |
| `A3-PRIV-04` | P1 | T4/D/6 | HMAC de telefone com key version | Sol extra-alto; revisão de segurança | segredo fora do cliente/planilha; rotação testada |
| `A3-CONS-01` | P1 | T7/B+G/2 | reconciliar Norte, política, guia e comportamento | Sol alto + revisão jurídica | não burlar consentimento; testes antes/depois/recusa |
| `A3-PRIV-05` | P1 | T7/G/2 | inventariar retenção/acessos de Netlify, YCloud, Sheets, CRM e Google | Terra alto inventário; Sol alto revisão | somente leitura primeiro; remoção externa separadamente autorizada |

## Evidências

| Fonte | Data/hora/fuso | Método | Limitação | Confiança |
|---|---|---|---|---|
| `tracking-loader.js`, `conversion-tracking.js`, `privacidade/index.html` | 15/08/2026 09:50 BRT | leitura estática | parecer jurídico N/D | Alta para comportamento declarado/código |
| `GUIA-LINGUAGEM-TRAFEGO-PAGO.md` e Norte | 15/08/2026 09:50 BRT | comparação documental | guia pode estar desatualizado | Alta |
| funções Netlify citadas | 15/08/2026 09:50 BRT | busca e leitura de todos os pontos de log relevantes | retenção/configuração dos logs não foi aberta | Alta para exposição em código |
| staging/ledger Google ao vivo | 15/08/2026, hora exata N/D, BRT | leitura agregada/anonimizada | recibos externos ausentes | Alta |
| suíte local | 15/08/2026 09:51 BRT | 570/570 testes | testes atuais também consolidam o comportamento de sessão sem consentimento | Alta |

**Nenhum dado pessoal foi incluído neste relatório e nenhuma configuração foi alterada.**
