# Mensuração das páginas de campanha

Atualizado em 10/07/2026.

## Estado atual

As páginas auxiliares usam uma configuração central em `campanhas/tracking-config.js`:

- GA4: `G-49S7FB3PMV`
- Meta Pixel: `1407471497197720`
- Google Ads: `AW-17157418677`
- Ação de conversão Google Ads: `XxykCLiY7s0cELXdpfU_`
- Google Tag Manager: não configurado
- Consentimento prévio: obrigatório (`requireConsent: true`)

As tags são carregadas por `tracking-loader.js` somente após consentimento. O padrão inicial do Google Consent Mode é negado para `analytics_storage`, `ad_storage`, `ad_user_data` e `ad_personalization`.

## Conversão principal

A conversão de campanha é o primeiro clique em WhatsApp por página/procedimento durante a sessão.

Esse clique envia:

- `lead_whatsapp_click` ao `dataLayer`;
- `whatsapp_click` ao GA4;
- `generate_lead` ao GA4, apenas uma vez por sessão/página/procedimento;
- `conversion` ao Google Ads, apenas uma vez por sessão/página/procedimento;
- `Lead` ao Meta Pixel, apenas uma vez;
- `WhatsAppClick` como evento personalizado do Meta em cada clique.

A trava por sessão evita que vários cliques do mesmo visitante inflem a conversão principal.

## Eventos auxiliares

| Evento | Finalidade |
|---|---|
| `landing_page_ready` | carregamento e contexto da landing page |
| `page_context` | grupo de conteúdo, procedimento e caminho |
| `campaign_procedure_view` | abertura automática de um procedimento em `/mama/` pela URL de campanha |
| `procedure_interest_click` | clique em uma queixa ou procedimento na página de mama |
| `procedure_details_open` | abertura das informações detalhadas de um procedimento |
| `faq_open` | abertura de uma dúvida frequente |
| `educational_content_click` | saída para um conteúdo educativo no Instagram |
| `content_search` | busca na biblioteca de conteúdos, sem dados pessoais |
| `engaged_30_seconds` | permanência mínima de 30 segundos |
| `scroll_50` / `scroll_90` | profundidade de leitura |
| `phone_click` / `email_click` | clique em telefone ou e-mail |
| `tracking_consent_granted` / `tracking_consent_denied` | escolha de privacidade |

## Atribuição

São preservados no navegador, quando presentes:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`;
- `gclid`, `gbraid`, `wbraid`, `fbclid`;
- página e horário de entrada.

A origem é acrescentada à mensagem pré-preenchida do WhatsApp. Não são enviados às plataformas de anúncios nomes, telefones, fotografias, texto livre digitado pela paciente ou dados clínicos.

## Estrutura recomendada de campanhas

A página consolidada de mama aceita links profundos:

- `/mama/?procedimento=mastopexia`
- `/mama/?procedimento=protese`
- `/mama/?procedimento=redutora`
- `/mama/?procedimento=mastopexia-protese`

Acrescente UTMs normalmente. Exemplo conceitual:

`/mama/?procedimento=mastopexia&utm_source=meta&utm_medium=paid_social&utm_campaign=mama_mastopexia&utm_content=video_01`

A página abre automaticamente o bloco correto e registra o interesse. As antigas URLs de mama têm fallback HTML/JavaScript e foram incluídas em regras de redirecionamento 301 para servidores Apache (`.htaccess`) e hosts compatíveis com `_redirects`.

## Validação antes de publicar campanhas

1. Publicar primeiro em ambiente de homologação.
2. Confirmar se o host aplica `.htaccess` ou `_redirects`; manter apenas o mecanismo compatível.
3. Testar consentimento aceito e recusado no Google Tag Assistant.
4. Confirmar no GA4 DebugView: `landing_page_ready`, `whatsapp_click` e `generate_lead`.
5. Confirmar em Meta Events Manager > Test Events: `PageView`, `Lead` e `WhatsAppClick`.
6. Confirmar no Google Ads que a ação recebe somente um evento no primeiro clique da sessão.
7. Testar links com UTM e verificar se a mensagem do WhatsApp inclui a atribuição.
8. Validar todos os anúncios em celular real, especialmente abertura do WhatsApp.

## Meta Conversions API

A Conversions API não foi adicionada porque o projeto entregue é estático e não possui backend seguro. Implementá-la no navegador exporia credenciais e não é adequado.

Quando houver backend, CRM ou integração server-side, enviar o mesmo `event_id` pelo navegador e pelo servidor para deduplicação. Uma conversão mais forte do que clique seria “consulta agendada” ou “consulta realizada”, importada do sistema de agenda/CRM, sem transmitir dado clínico.

## Observação sobre a página principal

A página principal foi preservada, conforme solicitado. Ela deve passar por uma auditoria separada antes de unificar toda a arquitetura de tags, pois o escopo atual se restringiu às páginas auxiliares.
