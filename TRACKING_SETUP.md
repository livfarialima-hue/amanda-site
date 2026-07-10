# Mensuração das páginas de campanha

Atualizado em 10/07/2026.

## Estado atual

Configuração central em `campanhas/tracking-config.js`:

- GA4: `G-49S7FB3PMV`
- Meta Pixel: `1407471497197720`
- Google Ads: `AW-17157418677`
- Google Tag Manager: não configurado
- Consentimento prévio: obrigatório (`requireConsent: true`)

As tags são carregadas somente após consentimento. O estado inicial do Google Consent Mode permanece negado para armazenamento analítico e publicitário.

## Evento de WhatsApp

O clique no WhatsApp é tratado como **sinal de intenção**, não como lead confirmado.

Eventos enviados após consentimento:

- `whatsapp_click_intent` ao `dataLayer`;
- `whatsapp_click` ao GA4;
- `WhatsAppClick` como evento personalizado do Meta.

O clique não dispara automaticamente `generate_lead`, conversão do Google Ads nem `Lead` do Meta.

## Conversões recomendadas

- `conversation_started`: conversa efetivamente iniciada;
- `qualified_lead`: paciente com interesse e perfil compatíveis;
- `appointment_booked`: consulta marcada — conversão principal inicial;
- `appointment_attended`: consulta realizada;
- `surgery_closed`: cirurgia contratada, preferencialmente com valor de receita.

O site expõe `window.AmandaTracking.trackLeadStage(stage, metadata)` para integrações futuras com CRM, agenda ou atendimento. Não enviar diagnóstico, fotografias, texto livre, procedimento íntimo, telefone em claro ou qualquer informação clínica às plataformas de anúncios.

## Eventos auxiliares

| Evento | Finalidade |
|---|---|
| `landing_page_ready` | carregamento e contexto da página |
| `campaign_procedure_view` | abertura de procedimento por URL de campanha |
| `procedure_interest_click` | clique em queixa ou procedimento |
| `procedure_details_open` | abertura de informações detalhadas |
| `faq_open` | abertura de dúvida frequente |
| `content_search` | busca na biblioteca, sem dados pessoais |
| `engaged_30_seconds` | permanência mínima de 30 segundos |
| `scroll_50` / `scroll_90` | profundidade de leitura |
| `mobile_details_open` / `mobile_details_close` | uso dos blocos recolhíveis |
| `mobile_horizontal_scroll` | descoberta de cards por gesto horizontal |
| `internal_navigation_click` | navegação interna |

## Atribuição

Quando presentes, são preservados no navegador:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`;
- `gclid`, `gbraid`, `wbraid`, `fbclid`;
- página e horário de entrada.

A mensagem visível no WhatsApp foi simplificada para não exibir UTMs ou códigos técnicos. A atribuição permanece disponível para a mensuração do site.

## Destinos de campanha

Use páginas específicas para cada intenção:

- `/lifting-facial/`
- `/blefaroplastia/`
- `/mama/`
- `/mastopexia/`
- `/mastopexia-com-protese/`
- `/protese-de-mama/`
- `/mamoplastia-redutora/`
- `/abdominoplastia/`
- `/lipoaspiracao/`
- `/injetaveis/`
- `/otoplastia/`
- `/pos-bariatrica/`

A página `/mama/` permanece como hub comparativo. As páginas específicas foram restauradas para buscas e campanhas de intenção direta.

## Validação após publicar

1. Testar consentimento aceito e recusado no Google Tag Assistant.
2. Confirmar no GA4 DebugView: `landing_page_ready`, `whatsapp_click` e eventos de engajamento.
3. Confirmar no Meta Events Manager: `PageView` e `WhatsAppClick`.
4. Configurar consulta marcada como conversão principal assim que a integração com atendimento estiver disponível.
5. Testar UTMs e abertura do WhatsApp em celular real.
6. Validar que nenhum dado clínico ou texto digitado pela paciente é enviado aos pixels.

## Meta Conversions API e conversões offline

Não foram adicionadas diretamente porque o site é estático e não possui backend seguro. Quando houver CRM, agenda ou integração server-side, importar consulta marcada, consulta realizada e cirurgia fechada, com deduplicação e sem transmissão de dados clínicos.
