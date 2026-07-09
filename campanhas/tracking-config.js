/*
  Configuração central de mensuração do site da Dra. Amanda Schroeder.

  Para ativar em produção, preencher os IDs abaixo e publicar novamente.
  Deixe vazio o que não for usar. O script não carrega tags com ID vazio.

  Recomendações:
  - GA4 direto: preencher ga4Id.
  - GTM: preencher gtmId e configurar tags/eventos no Google Tag Manager.
  - Meta Ads: preencher metaPixelId se houver campanhas no Instagram/Meta.
  - Google Ads: preencher googleAdsId e googleAdsConversionLabel quando houver conta/ação de conversão criada.
*/
window.AMANDA_TRACKING_CONFIG = {
  ga4Id: "G-49S7FB3PMV",        // Google Analytics 4 - Dra. Amanda Schroeder
  gtmId: "",                     // Ex.: "GTM-XXXXXXX". Use preferencialmente OU GTM OU GA4 direto para evitar duplicidade.
  metaPixelId: "",               // Ex.: "123456789012345"
  googleAdsId: "",               // Ex.: "AW-123456789"
  googleAdsConversionLabel: "",  // Ex.: "AbCdEfGhIjKlmNoPqRs"
  requireConsent: true,
  debug: false
};
