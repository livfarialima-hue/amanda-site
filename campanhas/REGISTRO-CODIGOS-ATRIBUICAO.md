# Registro versionado de códigos de atribuição

Versão do contrato: `v1`
Data de vigência documental: 15/08/2026
Fonte estratégica: `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`
Fonte operacional Google: `campanhas/GUIA-LINGUAGEM-TRAFEGO-PAGO.md`

Este registro impede que códigos históricos sejam reinterpretados como uma origem paga sem evidência. Ele não substitui o sinal bruto: a referência recebida deve permanecer imutável, e qualquer resolução deve registrar versão, regra, confiança e data.

## Regras invariantes

1. Normalizar caixa apenas para comparação; preservar o valor original separadamente.
2. Resolver somente correspondências exatas e determinísticas desta versão.
3. Código de página ou procedimento não prova canal, campanha, anúncio ou pagamento.
4. `G26...` prova família Google Ads; a importação offline exige ainda exatamente um `GCLID`, `GBRAID` ou `WBRAID` elegível.
5. `M26...W` representa campanha com destino direto ao WhatsApp somente quando o código exato estiver cadastrado como tal.
6. `M26...S` representa passagem pelo site somente quando o código exato estiver cadastrado como tal.
7. Alias desconhecido, ambíguo, incompleto ou colidente resulta em `N/D`/`unknown`, nunca em inferência por semelhança.
8. Backfill não usa nome, telefone, texto livre ou correspondência aproximada.

## Campanhas canônicas Google Ads

| Valor normalizado | Objeto externo | Canal resolvido | Status |
|---|---|---|---|
| `G26BLEF` | `S_BR_SP_BLEFAROPLASTIA` | `google_ads` | canônico |
| `G26FACE` | `S_BR_SP_CIRURGIA_FACIAL` | `google_ads` | canônico |
| `G26CERV` | `S_BR_SP_LIFTING_CERVICAL` | `google_ads` | canônico |
| `G26LIFT` | `S_BR_SP_LIFTING_FACIAL` | `google_ads` | canônico |
| `G26MARCA` | `S_BR_SP_MARCA` | `google_ads` | canônico |
| `G26OTO` | `S_BR_SP_OTOPLASTIA` | `google_ads` | canônico |
| `G26ADS` | fallback técnico quando há click ID Google e `_camp` ausente | `google_ads` | fallback parcial; não identifica campanha |

Os nove grupos `{_ag}` permanecem definidos no guia operacional. Grupo vazio não deve ser reconstruído a partir da página.

## Campanhas canônicas Meta

| Valor normalizado | Caminho resolvido | Status |
|---|---|---|
| `M26F01W` | `meta_whatsapp_direct` | canônico; controle atual |
| `M26F02S` | `meta_site_whatsapp` | canônico; sem verba nova até prova E2E |
| `M26C01W` | `meta_whatsapp_direct` | reservado para o piloto Meta de lifting cervical; não tratar como ativo antes de confirmar objeto externo, mensagem `M26C01W-C07H01`, mapa do Meta Ad ID e publicação autorizada |
| `M26O01W` | N/D pelo código isolado | campanha infantil conhecida, mas o guia também o reutiliza em uma URL de passagem pelo site; exigir evidência de landing/CTA para resolver o caminho |
| `M26O02W` | N/D | reservado/sugerido; não tratar como ativo sem confirmação externa |

O criativo só é resolvido quando aparece como segmento próprio ou em mapa explícito do anúncio. Um Meta Ad ID não mapeado permanece como sinal técnico não resolvido e não recebe campanha por aproximação.

## Códigos de página e aliases históricos

| Família/exemplo | Classificação v1 | Pode resolver canal pago? | Uso permitido |
|---|---|---|---|
| `SITE-*` | página/CTA do site | não | contexto da jornada |
| `OT01`, `OT02` | página de otoplastia | não | contexto da página |
| `LF01`, `BF01`, `LC01`, `LPP01` | código legado de página/procedimento | não | preservar como valor bruto; revisão histórica |
| `WHATSAPP-DIRETO-SEM-CODIGO` | canal operacional sem campanha | não | fallback explícito |
| `META-AD-<id>` | Meta Ad ID sem mapa canônico | não | preservar em campo técnico protegido; revisão de mapa |

Esses valores não são aliases de uma campanha nesta versão. Uma futura resolução exige evidência externa, ausência de colisão, teste e nova versão deste registro.

## Campos mínimos da resolução

Cada resolução deve manter:

- `raw_reference` imutável;
- `normalized_reference`;
- `resolved_campaign_code`, quando houver correspondência determinística;
- `resolution_status`: `canonical`, `fallback_partial`, `context_only`, `unknown` ou `conflict`;
- `registry_version`;
- `confidence`;
- `resolution_reason`;
- `resolved_at`;
- first touch e current touch separados.

O schema local preparado ainda preserva parte desses sinais em colunas distintas, mas não materializa todos esses campos como um ledger comum. A migração da planilha continua condicionada a autorização separada, backup, dry-run e reconciliação.

## Processo de alteração

Para incluir ou mudar um código:

1. confirmar o objeto externo e o nível correto (campanha, grupo/conjunto, anúncio ou criativo);
2. provar que o valor não colide com página, procedimento ou código legado;
3. atualizar este registro, o Norte e o histórico quando a estratégia mudar;
4. adicionar fixture positiva, negativa e ambígua;
5. publicar uma nova versão sem reescrever a evidência bruta;
6. medir conflitos e reverter a resolução nova se surgir qualquer falsa correspondência.
