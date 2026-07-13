/*
  Configuração central de mensuração do site da Dra. Amanda Schroeder.

  Para ativar em produção, preencher os IDs abaixo e publicar novamente.
  Deixe vazio o que não for usar. O script não carrega tags com ID vazio.

  Recomendações:
  - GA4 direto: preencher ga4Id.
  - GTM: preencher gtmId e configurar tags/eventos no Google Tag Manager.
  - Meta Ads: preencher metaPixelId se houver campanhas no Instagram/Meta.
  - Google Ads: googleAdsId mantém a tag base. Conversões clínicas devem ser importadas pelo CRM/agenda.
*/
window.AMANDA_TRACKING_CONFIG = {
  ga4Id: "G-49S7FB3PMV",        // Google Analytics 4 - Dra. Amanda Schroeder
  gtmId: "",                     // Ex.: "GTM-XXXXXXX". Use preferencialmente OU GTM OU GA4 direto para evitar duplicidade.
  metaPixelId: "1501288525098716",               // Pixel Meta oficial. Carregado somente após consentimento.
  googleAdsId: "AW-17157418677",               // Ex.: "AW-123456789"
  googleAdsConversionLabel: "Hc43CM7-qvsaELXdpfU_",  // Conversão de clique no WhatsApp.
  advancedConsentMode: true,
  trackMetaPageViews: true,
  sanitizePreConsentMeasurement: true,
  allowAdStorageAfterConsent: true,
  allowAdUserDataAfterConsent: true,
  allowAdPersonalization: false,
  allowGoogleSignals: false,
  loadMetaOnlyAfterConsent: true,
  requireConsent: true,
  debug: false
};
