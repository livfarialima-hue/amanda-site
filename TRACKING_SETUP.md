# Tracking e conversões — Dra. Amanda Schroeder

Este pacote já está preparado para mensuração real, mas os pixels só carregam depois de preencher os IDs em:

```text
campanhas/tracking-config.js
```

## 1. IDs a preencher

```js
window.AMANDA_TRACKING_CONFIG = {
  ga4Id: "G-49S7FB3PMV",
  gtmId: "",
  metaPixelId: "123456789012345",
  googleAdsId: "AW-123456789",
  googleAdsConversionLabel: "LABEL_DA_CONVERSAO",
  requireConsent: true,
  debug: false
};
```

Use preferencialmente uma destas arquiteturas:

### Opção simples
- Preencher `ga4Id`.
- Preencher `metaPixelId` se houver Meta Ads.
- Preencher `googleAdsId` e `googleAdsConversionLabel` se houver Google Ads.
- Deixar `gtmId` vazio.

### Opção avançada com GTM
- Preencher `gtmId`.
- Configurar GA4, Meta Pixel e Google Ads dentro do Google Tag Manager.
- Deixar `ga4Id`, `metaPixelId`, `googleAdsId` e `googleAdsConversionLabel` vazios no arquivo, para evitar duplicidade.

## 2. Eventos enviados

### Clique em WhatsApp
Todo clique em `wa.me` dispara:

- `dataLayer.push({ event: "lead_whatsapp_click", ... })`
- GA4: `whatsapp_click`
- GA4: `generate_lead`
- Meta Pixel: `Lead`
- Meta Pixel: `WhatsAppClick`
- Google Ads: `conversion`, se `googleAdsId` e `googleAdsConversionLabel` estiverem preenchidos.

## 3. Parâmetros úteis

O evento envia parâmetros como:

- `page_type`
- `page_campaign`
- `cta_location`
- `cta_text`
- `page_path`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `landing_page`

Por privacidade, o script não envia:

- texto completo da mensagem de WhatsApp;
- telefone;
- nome;
- dados clínicos livres.

## 4. Consentimento

O arquivo está com:

```js
requireConsent: true
```

Com isso, pixels carregam apenas após aceite no banner. Para testes rápidos, você pode temporariamente usar:

```js
requireConsent: false
```

Depois volte para `true`.

## 5. Google Search Console

Preferência: verificar a propriedade de domínio por DNS. Depois enviar o sitemap:

```text
https://draamandaschroeder.com.br/sitemap.xml
```

Se preferir verificar por meta tag, cole a meta tag fornecida pelo Search Console no `<head>` da home (`index.html`).

## 6. Teste pós-publicação

Depois de publicar:

1. Abrir o site em aba anônima.
2. Aceitar mensuração no banner.
3. Clicar em um botão de WhatsApp.
4. Confirmar no GA4 Realtime/DebugView:
   - `page_view`
   - `whatsapp_click`
   - `generate_lead`
5. Confirmar no Meta Events Manager:
   - `PageView`
   - `Lead`
   - `WhatsAppClick`
6. Se houver Google Ads, testar a ação de conversão.
7. No Search Console, verificar propriedade e enviar sitemap.

## 7. Observação importante

Se você usar GTM e também preencher GA4/Meta/Google Ads diretamente neste arquivo, pode haver duplicidade de eventos. Escolha uma arquitetura e mantenha consistência.


## Status atual

- GA4 configurado: `G-49S7FB3PMV`
- GTM: não configurado
- Meta Pixel: não configurado
- Google Ads: não configurado

Após publicar, aceitar o banner de mensuração e testar cliques no WhatsApp no relatório em tempo real do GA4.
