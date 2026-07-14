(function () {
  'use strict';

  var config = window.AMANDA_TRACKING_CONFIG || {};
  var preConsentAllowedParams = [
    'contact_channel',
    'measurement_state',
    'non_personalized_ads',
    'send_to',
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
      var trustedDestination = key === 'send_to' && (
        value === config.ga4Id ||
        value === config.googleAdsId + '/' + config.googleAdsConversionLabel
      );
      if (key === 'send_to' && !trustedDestination) return;
      if (!trustedDestination && unsafeValue(value)) return;
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

  function campaignOriginCode() {
    var value = '';
    try { value = new URLSearchParams(window.location.search).get('origem') || ''; }
    catch (error) { return ''; }
    value = value.trim().toUpperCase();
    return /^[A-Z][A-Z0-9]{4,15}$/.test(value) ? value : '';
  }

  function applyCampaignOriginCode() {
    var code = campaignOriginCode();
    if (!code) return;

    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach(function (link) {
      try {
        var url = new URL(link.href, window.location.href);
        var message = url.searchParams.get('text');
        if (!message) return;
        message = message.replace(/\s+Ref(?:er[eê]ncia)?\.?\s*:?\s*[A-Z0-9-]+\.?\s*$/i, '');
        url.searchParams.set('text', message.trim() + ' Ref. ' + code);
        link.href = url.toString();
      } catch (error) {}
    });
  }

  function trackWhatsAppClick(link) {
    var consented = fullConsentGranted();
    var mode = consented ? 'consented' : 'cookieless';

    // Sem consentimento, a tag é carregada somente neste clique voluntário.
    // Não há PageView, carregamento na entrada da página ou contexto clínico.
    if (!consented && window.AmandaConsent && window.AmandaConsent.prepareMinimalWhatsAppMeasurement) {
      window.AmandaConsent.prepareMinimalWhatsAppMeasurement();
    }
    if (!googleMeasurementAvailable()) return;

    var root = document.documentElement;
    var pageType = root.dataset.pageType || 'procedure';
    var section = link.closest('[data-section]');
    var location = link.dataset.ctaLocation || (section && section.dataset.section) || 'unknown';
    var text = (link.textContent || '').trim();

    if (consented) {
      window.gtag('event', 'whatsapp_click', {
        event_category: 'engagement',
        event_label: pageType,
        page_type: pageType,
        content_group: pageType,
        cta_location: location,
        cta_text: text,
        page_path: window.location.pathname,
        transport_type: 'beacon',
        send_to: config.ga4Id
      });
    } else {
      window.gtag('event', 'whatsapp_click', sanitizePreConsentParams({
        contact_channel: 'whatsapp',
        measurement_state: 'cookieless',
        non_personalized_ads: true,
        transport_type: 'beacon',
        send_to: config.ga4Id
      }));
    }

    // Conversão genérica e deduplicada. Nunca inclui procedimento,
    // página, diagnóstico, texto da mensagem ou dado pessoal.
    if (config.googleAdsId && config.googleAdsConversionLabel && conversionNotYetSent('whatsapp_click')) {
      window.gtag('event', 'conversion', sanitizePreConsentParams({
        send_to: config.googleAdsId + '/' + config.googleAdsConversionLabel,
        non_personalized_ads: !consented,
        transport_type: 'beacon'
      }, preConsentConversionAllowedParams));
    }

    if (metaConsentGranted() && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'WhatsAppContactClick', { contact_channel: 'whatsapp' });
    }
    recordDebug('whatsapp_click', mode);
  }

  document.addEventListener('DOMContentLoaded', applyCampaignOriginCode);

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
