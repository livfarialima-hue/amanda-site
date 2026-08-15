# Parecer P0 — Meta Ads → site → WhatsApp → LEADS → CRM

**Convenção de evidência:** descrições literais de código, URL, configuração ou planilha são **fatos observados**; percentuais derivados são **cálculos**; efeitos prováveis são **inferências**; mudanças futuras são **hipóteses/propostas**; ausência de prova é **N/D**.

## Veredito

**Não comprovado ponta a ponta. Manter `M26F02S` sem verba nova.**

**[Fato observado | confiança alta]** A instrumentação prospectiva consegue transportar `M26F02S` e `utm_content` pela navegação da mesma sessão até uma referência no WhatsApp, e o webhook reconhece/persiste a referência. **[Fato observado | confiança alta]** Ela não preserva IDs separados de conjunto e anúncio, não registra landing page/página do CTA e não cobre retorno posterior. **[Fato observado | confiança alta]** A amostra viva após a criação das novas colunas não contém M26F02S.

O critério de aceite solicitado exige: origem inicial Meta Ads; caminho site→WhatsApp; campanha; conjunto/anúncio/criativo quando fornecidos; landing; página do CTA; LEADS/CRM consistentes; confiança explícita. O estado atual não satisfaz esse conjunto.

## Parâmetros atuais observados

### M26F02S — Meta → site

Na URL pública observada em 15/08/2026:

| Dimensão | Parâmetro/valor observado | Parecer |
|---|---|---|
| origem interna | `origem=M26F02S` | estável e capturada |
| plataforma | `utm_source=meta` | capturada |
| meio | `utm_medium=paid_social` | capturada |
| campanha | `utm_campaign=M26F02S` | código estável; não é o ID numérico da Meta |
| criativo | `utm_content=C01H01` | código editorial estável; não é um campo/ID de criativo separado |
| conjunto | ausente | não identificado |
| anúncio | ausente | não identificado |
| `utm_id` | ausente | não identificado |
| landing | implícita na URL acessada, mas não persistida no contrato | perdida no CTA/CRM |
| página do CTA | disponível no navegador, mas não transportada | perdida no CTA/CRM |
| posição do CTA | `data-cta-location` existe para mensuração consentida | não entra na mensagem/LEADS |

**[Fato observado | confiança alta]** O código lê somente `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` e `origem`. Mesmo que a Meta entregue `utm_id`, `adset`, `ad` ou outros campos, eles são descartados hoje.

### M26F01W — Meta → WhatsApp direto

| Evidência | Tratamento atual | Limitação |
|---|---|---|
| mensagem predefinida | `Ref. M26F01W-<criativo>` | usuário pode editar/remover |
| referral Meta com `source_id` | dois IDs de anúncio mapeados para campanha+criativo | conjunto não é armazenado; mapa manual fica obsoleto |
| anúncio não mapeado | referência técnica `META-AD-<id>`, categoria `meta_ad_id` | campanha/criativo ficam desconhecidos até atualizar mapa |
| retomada sem referência | herda oportunidade ativa única pelo telefone | conserva rota, não a origem da conversa atual |

**[Fato observado | confiança alta]** Um evento agregado real recente caiu em `meta_ad_id` sem mapeamento, comprovando que o mapa de dois anúncios não cobre todo o tráfego atual.

## Diferenciação operacional atual

| Caminho desejado | Como é identificado hoje | Confiabilidade |
|---|---|---|
| Meta Ads — WhatsApp direto | `M26F01W` no texto ou referral de anúncio mapeado | média/alta quando código/referral existe |
| Meta Ads — site → WhatsApp | `M26F02S` no texto; o site WhatsApp normalmente não traz referral do anúncio Meta | média na mesma sessão; baixa ponta a ponta |
| Meta Ads — site → retorno posterior → WhatsApp | não há persistência além da sessão | não funcional/não comprovado |
| Meta Ads — detalhes incompletos | `meta_ad_id`, `meta_uncoded` ou código sem todas as dimensões | explicitado parcialmente |
| Meta Ads — atribuição inferida | não há campo canônico de confiança/inferência no CRM | não modelado |
| origem desconhecida | `whatsapp_uncoded`/fallback no evento prospectivo | não chega como dimensão completa ao CRM |

**[Inferência | confiança alta]** O sistema distingue os dois caminhos apenas pelo significado do código (`M26F01W` versus `M26F02S`). Não existe campo próprio e independente `conversion_path`; se a referência for editada, essa distinção se perde.

## Avaliação dos 14 pontos obrigatórios

| # | Critério | Evidência observada | Estado |
|---:|---|---|---|
| 1 | parâmetros adicionados ao anúncio | URL M26F02S tem origem/source/medium/campaign/content | Parcial |
| 2 | campanha, conjunto, anúncio e criativo estáveis | campanha e código de criativo; conjunto/anúncio ausentes | Reprovado |
| 3 | parâmetros chegam à landing | URL pública observada contém os cinco parâmetros | Aprovado para os cinco |
| 4 | permanecem durante navegação | `sessionStorage` e teste local cobrem mesma aba | Parcial |
| 5 | permanecem ao trocar página | sim na mesma aba/origem; nova aba/retorno não | Parcial |
| 6 | chegam ao CTA WhatsApp | referência recebe campanha+`utm_content`+página | Aprovado tecnicamente; live anterior 6/6 |
| 7 | interferência do consentimento | código Meta fica na sessão mesmo com recusa; tags não carregam; após aceite o GA4 pode enviar parâmetros semânticos da página/CTA | Parcial; bloqueio funciona, payload/minimização requer contenção |
| 8 | mensagem carrega código confiável | M26F02S é inserido em texto visível | Parcial; texto editável |
| 9 | código permanece se texto é personalizado | somente se a referência não for removida/alterada | Reprovado |
| 10 | webhook reconhece | parser reconhece referência estruturada M26F02S | Aprovado localmente |
| 11 | bot interpreta | testes classificam jornada Meta Site | Aprovado localmente |
| 12 | planilha registra | novas colunas de evento recebem categoria/ref/fallback/plataforma | Aprovado prospectivamente; sem coorte real M26F02S |
| 13 | CRM preserva | CRM congela referência/plataforma iniciais, mas não dimensões/caminho completo | Parcial |
| 14 | retomadas não alteram origem inicial | CRM não altera campos iniciais; linha visível pode ser sobrescrita por prioridade | Parcial/inconsistente |

## Evidência viva após a instrumentação

- **[Fato observado]** `_WHATSAPP_EVENTOS` contém 689 eventos datados entre 26/07 e 14/08.
- **[Fato observado]** Somente 16 linhas têm as quatro novas colunas de atribuição preenchidas, pois a instrumentação é recente e não teve backfill.
- **[Cálculo]** Nessas 16: 14 `whatsapp_uncoded` (87,5%), 1 `meta_ad_id` sem mapping (6,25%), 1 `meta_coded` (6,25%) e 0 M26F02S.
- **[Limitação]** Isso não significa 16 eventos totais nem zero histórico Meta Site. Significa ausência de prova M26F02S no pequeno recorte prospectivo instrumentado.
- **[Fato observado]** Documentação de 14/08 registra teste sintético `meta_attribution_contract_ok` e 6/6 CTAs com referência M26F02S. Essa prova técnica não equivale a contato real, oportunidade ou consulta.

## Ponto exato de perda

1. **Anúncio:** conjunto e anúncio não são enviados como dimensões separadas na URL M26F02S observada.
2. **Captura web:** a allowlist descarta qualquer dimensão não listada.
3. **Armazenamento:** um único objeto de sessão é sobrescrito, sem first/last/path/timestamp.
4. **Retorno:** encerrada/perdida a sessão, não há lookup de jornada.
5. **CTA:** landing, página do clique e `data-cta-location` não entram no transporte.
6. **Mensagem:** referência e click IDs são texto visível/editável; não existe metadado oculto no deep link do WhatsApp.
7. **Webhook:** sem código/referral seguro, classifica como direto/desconhecido; não pode reconstruir o site.
8. **LEADS:** o terceiro sufixo da referência é armazenado no campo “CTA”, mesmo quando representa página/procedimento.
9. **CRM:** só fixa referência/plataforma/click IDs iniciais; não possui campos do caminho nem da conversa atual.
10. **Merge:** a linha visível pode mudar por prioridade de plataforma, sem evento cronológico que explique a mudança.

## Mudança proposta, sem implementação

### Contrato mínimo Meta

| Campo | Meta → site | Meta → WhatsApp direto | Regra |
|---|---|---|---|
| `initial_origin` | `Meta Ads` | `Meta Ads` | imutável |
| `conversion_path` | `meta_site_whatsapp` | `meta_whatsapp_direct` | enum canônico |
| `campaign_code` | M26F02S | M26F01W | código interno versionado |
| `meta_campaign_id` | parâmetro dinâmico | resolvido pelo anúncio/referral | opaco; não usar nome livre |
| `meta_adset_id` | parâmetro dinâmico | lookup canônico | obrigatório quando fornecido |
| `meta_ad_id` | parâmetro dinâmico | referral `source_id` | obrigatório quando fornecido |
| `creative_code` | código editorial | código editorial/mapping | separado do ad ID |
| `landing_page` | path canônico | N/A | sem query e sem dado sensível |
| `cta_page` | path canônico | N/A | separado da landing |
| `cta_location` | enum técnico | N/A | sem texto livre |
| `first_touch_at` | timestamp BRT/UTC normalizado | timestamp da conversa | imutável |
| `last_touch_at` | atualizado por evento | atualizado por evento | nunca substitui first touch |
| `confidence` | `observed`, `partial`, `inferred`, `reported`, `unknown` | idem | obrigatório |
| `fallback_reason` | enum limitado | enum limitado | obrigatório quando incompleto |

### Transporte recomendado

**[Proposta]** Substituir o payload semântico visível por um token opaco de jornada, mantendo dual-read dos códigos atuais durante a migração:

- gerar `journey_id` UUIDv4 no primeiro evento elegível, sem telefone, mensagem, campanha ou procedimento embutidos;
- registrar no endpoint first-party, no clique voluntário do CTA, a associação entre `journey_id` e o envelope normalizado;
- colocar no WhatsApp apenas uma referência curta opaca e versionada;
- resolver no webhook e gravar as dimensões canônicas; se o lookup falhar, preservar `unknown` + motivo, sem inventar;
- TTL proposto: 90 dias somente após aprovação de necessidade/retensão; sem aprovação, usar TTL menor e documentado;
- não enviar à Meta/Google o token interno, telefone, mensagem, página sensível ou procedimento;
- não usar HMAC no cliente. Segredo somente no servidor/Script Properties, versionado e rotacionável.

## Teste de aceite controlado

O teste real deve usar campanha/ambiente autorizado e contato técnico claramente isolado; não deve simular paciente nem gerar lead de produção sem marcação de teste.

| Campo | Esperado obrigatório |
|---|---|
| origem inicial | Meta Ads |
| caminho | site → WhatsApp |
| campanha | identificada |
| conjunto | identificado quando fornecido |
| anúncio | identificado quando fornecido |
| criativo | identificado quando fornecido |
| landing | identificada |
| página/posição do CTA | identificada |
| LEADS | consistente com envelope e sem PII em logs/mídia |
| CRM | mesma origem inicial + caminho, sem sobrescrita |
| confiança | `observed` ou justificativa explícita |
| duplicidade | <2% no gate e zero duplicação no caso de teste |

### Cenários necessários

| Cenário | Esperado | Estado nesta auditoria |
|---|---|---|
| Meta direto | M26F01W + ad/creative quando mapeado | local aprovado; real parcial |
| Meta site, mesma página | M26F02S + landing/CTA | código local aprovado; campos incompletos |
| Meta site, outra página | first touch preservado; CTA page distinta | sessão funciona; campos não existem |
| Meta site, retorno posterior | first touch preservado e caminho “retorno” | reprovado |
| consentimento aceito/recusado | tags respeitam escolha; atribuição mínima documentada | local aprovado; base legal N/D |
| parâmetros incompletos/inválidos | `partial/unknown` + motivo | fallback parcial aprovado |
| link encaminhado | não atribuir automaticamente ao destinatário como clique original | pendente |
| múltiplas campanhas/abas | first/last separados, sem corrida | reprovado/pendente |
| edição/remoção do código | fallback explícito; não inventar site | parser falha corretamente, mas perde caminho |
| perda de armazenamento | lookup/fallback, não “direto” automático | pendente |
| código legado | dual-read; write somente novo | parser aprovado; migração pendente |

## Regras de decisão

- **Manter `M26F02S` em R$ 0 de verba nova** até teste real e cobertura consentida ≥80% clique→conversa→oportunidade, duplicidade <2%.
- Não usar LPV, clique, mensagem aberta ou código sintético como prova de lead/consulta.
- Não alterar M26F01W e M26F02S ao mesmo tempo; M26F01W permanece controle.
- Reverter/pausar o teste se houver PII em logs/mídia, origem sobrescrita, divergência LEADS/CRM, código sem resolução ou duplicidade ≥2%.

## Evidências e limitações

| Fonte | Data/hora/fuso | Método | Limitação | Confiança |
|---|---|---|---|---|
| URL Meta Site pública observada | 15/08/2026, hora exata N/D, BRT | inspeção de URL em sessão autenticada | não prova todos os anúncios/criativos | Alta para o anúncio/URL observado |
| Meta Ads auditado em 13/08 | 13/08/2026 22:22–23:47 BRT | editor autenticado somente leitura | snapshot histórico; conta pode ter mudado | Média/alta |
| site e `conversion-tracking.js` | 15/08/2026 09:50 BRT | leitura de código/testes | execução pública interativa não concluída nesta frente | Alta para contrato local |
| webhook e Apps Script | 15/08/2026 09:50 BRT | leitura de parser e persistência | sem disparo real | Alta |
| `_WHATSAPP_EVENTOS` | 15/08/2026, hora exata N/D, BRT | agregação anonimizada | só 16 eventos após instrumentação; sem backfill | Alta para contagens |

**Nenhuma alteração de anúncio, página, mensagem, planilha, CRM ou bot foi executada.**
