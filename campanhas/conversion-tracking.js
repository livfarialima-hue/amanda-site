(function () {
  'use strict';

  var config = window.AMANDA_TRACKING_CONFIG || {};
  var preConsentAllowedParams = [
    'contact_channel',
    'measurement_state',
    'non_personalized_ads',
    'transport_type'
  ];
  var preConsentConversionAllowedParams = [
    'send_to',
    'value',
    'currency',
    'non_personalized_ads',
    'transport_type'
  ];

  function googleMeasurementAvailable() {
    return typeof window.gtag === 'function';
  }

  function fullConsentGranted() {
    try { return localStorage.getItem('amanda_tracking_consent') === 'granted'; }
    catch (error) { return false; }
  }

  function metaConsentGranted() {
    return fullConsentGranted();
  }

  function unsafeValue(value) {
    if (typeof value !== 'string') return false;
    return value.length > 80 || /@|https?:|www\.|\?|utm_|gclid|gbraid|wbraid|fbclid|\+?\d[\d\s().-]{7,}|abdomin|blefaro|lifting|lipo|mamo|masto|ninfo|otoplast|bari[aá]tric|cirurg|diagn[oó]stic|paciente|mensagem/i.test(value);
  }

  function sanitizePreConsentParams(params, allowedParams) {
    var sanitized = {};
    (allowedParams || preConsentAllowedParams).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) return;
      var value = params[key];
      var trustedConversionDestination = key === 'send_to' && value === config.googleAdsId + '/' + config.googleAdsConversionLabel;
      if (!trustedConversionDestination && unsafeValue(value)) return;
      if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') sanitized[key] = value;
    });
    return sanitized;
  }

  function conversionNotYetSent(key) {
    var storageKey = 'amanda_conversion_sent_' + key;
    try {
      if (sessionStorage.getItem(storageKey) === '1') return false;
      sessionStorage.setItem(storageKey, '1');
      return true;
    } catch (error) {
      window.__amandaSentConversions = window.__amandaSentConversions || {};
      if (window.__amandaSentConversions[key]) return false;
      window.__amandaSentConversions[key] = true;
      return true;
    }
  }

  function recordDebug(eventName, mode) {
    window.__amandaWhatsAppClicks = (window.__amandaWhatsAppClicks || 0) + 1;
    window.__amandaWhatsAppConversionSent = true;
    window.__amandaLastMeasurementEvent = { name: eventName, mode: mode };
    if (window.AmandaConsent && window.AmandaConsent.updateDebugState) window.AmandaConsent.updateDebugState();
  }

  function trackWhatsAppClick() {
    if (!googleMeasurementAvailable() || !config.googleAdsId || !config.googleAdsConversionLabel) return;
    if (!conversionNotYetSent('whatsapp_click')) return;

    var consented = fullConsentGranted();
    var mode = consented ? 'consented' : 'cookieless';
    var clickParams = {
      contact_channel: 'whatsapp',
      measurement_state: mode,
      transport_type: 'beacon'
    };
    var conversionParams = {
      send_to: config.googleAdsId + '/' + config.googleAdsConversionLabel,
      value: 1.0,
      currency: 'BRL',
      transport_type: 'beacon'
    };

    if (!consented) {
      clickParams.non_personalized_ads = true;
      conversionParams.non_personalized_ads = true;
      clickParams = sanitizePreConsentParams(clickParams);
      conversionParams = sanitizePreConsentParams(conversionParams, preConsentConversionAllowedParams);
    }

    window.gtag('event', 'whatsapp_contact_click', clickParams);
    window.gtag('event', 'conversion', conversionParams);

    if (metaConsentGranted() && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'WhatsAppContactClick', { contact_channel: 'whatsapp' });
    }
    recordDebug('whatsapp_contact_click', mode);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest(
      'a[href*="wa.me"], ' +
      'a[href*="api.whatsapp.com"], ' +
      'a[href*="web.whatsapp.com"], ' +
      'a[href*="whatsapp.com"]'
    );
    if (!link) return;
    trackWhatsAppClick(link);
  });
})();
