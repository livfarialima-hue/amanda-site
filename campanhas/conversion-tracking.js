(function () {
  'use strict';

  var config = window.AMANDA_TRACKING_CONFIG || {};
  var whatsappSelector = [
    'a[href*="wa.me"]',
    'a[href*="api.whatsapp.com"]',
    'a[href*="web.whatsapp.com"]',
    'a[href*="whatsapp.com"]'
  ].join(', ');
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

  var campaignOriginStorageKey = 'amanda_campaign_origin';
  var clickIdParams = ['gclid', 'gbraid', 'wbraid'];
  var clickIdStoragePrefix = 'amanda_click_id_';
  var attributionTtlMs = 90 * 24 * 60 * 60 * 1000;

  function storeSessionValue(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        value: value,
        expiresAt: Date.now() + attributionTtlMs
      }));
    } catch (error) {}
  }

  function readSessionValue(key, normalize) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return '';

      var stored;
      try { stored = JSON.parse(raw); }
      catch (error) { stored = null; }

      if (!stored || typeof stored !== 'object') {
        var legacyValue = normalize(raw);
        if (legacyValue) storeSessionValue(key, legacyValue);
        return legacyValue;
      }
      if (!stored.expiresAt || stored.expiresAt <= Date.now()) {
        sessionStorage.removeItem(key);
        return '';
      }
      return normalize(stored.value || '');
    } catch (error) {
      return '';
    }
  }

  function storePersistentValue(key, value) {
    if (!fullConsentGranted() || !value) return;
    try {
      localStorage.setItem(key, JSON.stringify({
        value: value,
        expiresAt: Date.now() + attributionTtlMs
      }));
    } catch (error) {}
  }

  function readPersistentValue(key, normalize) {
    if (!fullConsentGranted()) return '';
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return '';

      var stored;
      try { stored = JSON.parse(raw); }
      catch (error) { stored = null; }

      // Compatibilidade com um eventual valor simples salvo por uma versao anterior.
      if (!stored || typeof stored !== 'object') {
        var legacyValue = normalize(raw);
        if (legacyValue) storePersistentValue(key, legacyValue);
        return legacyValue;
      }
      if (!stored.expiresAt || stored.expiresAt <= Date.now()) {
        localStorage.removeItem(key);
        return '';
      }
      return normalize(stored.value || '');
    } catch (error) {
      return '';
    }
  }

  function storeAttributionValue(key, value) {
    if (!value) return;
    storeSessionValue(key, value);
    storePersistentValue(key, value);
  }

  function readAttributionValue(key, normalize) {
    var value = readSessionValue(key, normalize);
    if (value) return value;

    value = readPersistentValue(key, normalize);
    if (value) storeSessionValue(key, value);
    return value;
  }

  function normalizeCampaignOriginCode(value) {
    value = value.trim().toUpperCase();
    return /^[A-Z][A-Z0-9]{3,15}$/.test(value) ? value : '';
  }

  function campaignOriginCodeFromUrl() {
    try {
      var searchParams = new URLSearchParams(window.location.search);
      var explicitCode = normalizeCampaignOriginCode(searchParams.get('origem') || '');
      if (explicitCode) return explicitCode;

      // O sufixo das campanhas do Google Ads ja envia o parametro
      // utm_campaign={_camp}. Aceitamos esse codigo nao identificador como
      // referencia da campanha sem depender do GCLID ou de cookies.
      var utmCampaignCode = normalizeCampaignOriginCode(searchParams.get('utm_campaign') || '');
      if (utmCampaignCode) return utmCampaignCode;

      // Sem consentimento, nunca copiamos nem persistimos o identificador
      // individual do clique. Usamos somente uma referência genérica para
      // distinguir Google Ads de busca orgânica, acesso direto ou indicação.
      var hasGoogleAdsClick = clickIdParams.some(function (param) {
        return !!normalizeClickId(searchParams.get(param) || '');
      });
      return hasGoogleAdsClick ? normalizeCampaignOriginCode(config.googleAdsFallbackOriginCode || 'G26ADS') : '';
    } catch (error) {
      return '';
    }
  }

  function campaignOriginCode() {
    var code = campaignOriginCodeFromUrl();
    if (code) {
      storeAttributionValue(campaignOriginStorageKey, code);
      return code;
    }

    code = readAttributionValue(campaignOriginStorageKey, normalizeCampaignOriginCode);
    if (code) storePersistentValue(campaignOriginStorageKey, code);
    return code;
  }

  function normalizeClickId(value) {
    value = (value || '').trim();
    return /^[A-Za-z0-9._~-]{10,300}$/.test(value) ? value : '';
  }

  function clickAttributionIds() {
    var ids = {};
    if (!fullConsentGranted()) return ids;

    var searchParams;
    try { searchParams = new URLSearchParams(window.location.search); }
    catch (error) { searchParams = null; }

    clickIdParams.forEach(function (param) {
      var value = normalizeClickId(searchParams ? searchParams.get(param) : '');
      if (value) {
        storeAttributionValue(clickIdStoragePrefix + param, value);
      } else {
        value = readAttributionValue(clickIdStoragePrefix + param, normalizeClickId);
      }
      if (value) ids[param] = value;
    });

    return ids;
  }

  // A atribuição de marketing no WhatsApp é independente da mensuração.
  // Atua somente nos CTAs explicitamente marcados e usa uma lista fechada de
  // códigos neutros de marketing.
  var marketingAttributionStorageKey = 'amanda_marketing_attribution';
  var marketingAttributionParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'origem'];

  function sanitizeTrackingValue(value) {
    value = typeof value === 'string' ? value.trim() : '';
    return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : '';
  }

  function readAttributionFromUrl() {
    var attribution = {};
    try {
      var searchParams = new URLSearchParams(window.location.search);
      marketingAttributionParams.forEach(function (param) {
        var value = sanitizeTrackingValue(searchParams.get(param) || '');
        if (value) attribution[param] = value;
      });
    } catch (error) {}
    return attribution;
  }

  function saveAttribution(attribution) {
    if (!Object.keys(attribution).length) return;
    try { sessionStorage.setItem(marketingAttributionStorageKey, JSON.stringify(attribution)); }
    catch (error) {}
  }

  function loadStoredAttribution() {
    try {
      var stored = JSON.parse(sessionStorage.getItem(marketingAttributionStorageKey) || '{}');
      if (!stored || typeof stored !== 'object') return {};
      var attribution = {};
      marketingAttributionParams.forEach(function (param) {
        var value = sanitizeTrackingValue(stored[param]);
        if (value) attribution[param] = value;
      });
      return attribution;
    } catch (error) {
      return {};
    }
  }

  function getOriginalReference(link, message) {
    var originalReference = sanitizeTrackingValue(link.dataset.originalReference || '');
    if (originalReference) return originalReference;

    var referenceMatch = message.match(/\bRef\.\s*([A-Za-z0-9_-]{1,80})(?=\s|$)/i);
    if (!referenceMatch) return '';
    originalReference = sanitizeTrackingValue(referenceMatch[1]);
    if (originalReference) link.dataset.originalReference = originalReference;
    return originalReference;
  }

  function buildReference(attribution, originalReference) {
    var referenceParts = [];
    var campaign = attribution.utm_campaign || attribution.origem || '';
    if (campaign) referenceParts.push(campaign);
    if (attribution.utm_content) referenceParts.push(attribution.utm_content);
    referenceParts.push(originalReference);
    return referenceParts.join('-');
  }

  function updateWhatsAppLink(link, attribution) {
    if (!link.matches('a[data-track="whatsapp"]')) return;
    try {
      var url = new URL(link.href, window.location.href);
      var message = url.searchParams.get('text');
      if (!message) return;

      var originalReference = getOriginalReference(link, message);
      if (!originalReference) return;

      var reference = buildReference(attribution, originalReference);
      var updatedMessage = message.replace(/(\bRef\.\s*)[A-Za-z0-9_-]{1,80}(?=\s|$)/i, '$1' + reference);
      if (updatedMessage === message) return;
      url.searchParams.set('text', updatedMessage);
      link.href = url.toString();
    } catch (error) {}
  }

  function updateAllWhatsAppLinks() {
    var attributionFromUrl = readAttributionFromUrl();
    if (Object.keys(attributionFromUrl).length) saveAttribution(attributionFromUrl);
    var attribution = Object.keys(attributionFromUrl).length ? attributionFromUrl : loadStoredAttribution();
    document.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
      updateWhatsAppLink(link, attribution);
    });
  }

  function observeWhatsAppCtas() {
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(function (mutations) {
      var attribution = loadStoredAttribution();
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('a[data-track="whatsapp"]')) updateWhatsAppLink(node, attribution);
          if (node.querySelectorAll) node.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
            updateWhatsAppLink(link, attribution);
          });
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function applyCampaignOriginCode() {
    // A implementação anterior modificava todos os links de WhatsApp e não
    // preservava a referência-base do CTA. Ela foi desativada em favor da
    // rotina acima, delimitada por data-track="whatsapp".
    return;
    var code = campaignOriginCode();
    var clickIds = clickAttributionIds();
    if (!code && !Object.keys(clickIds).length) return;

    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach(function (link) {
      try {
        var url = new URL(link.href, window.location.href);
        var message = url.searchParams.get('text');
        if (!message) return;
        message = message.replace(/\s+Ref(?:er[eê]ncia)?\.?\s*:?\s*[A-Z0-9-]+\.?\s*$/i, '');
        message = message.replace(/\s+ID Ads:[^\r\n]*\s*$/i, '');
        var references = [];
        if (code) references.push('Ref. ' + code);
        clickIdParams.forEach(function (param) {
          if (clickIds[param]) references.push(param.toUpperCase() + '=' + clickIds[param]);
        });
        url.searchParams.set('text', message.trim() + (references.length ? '\n\nID Ads: ' + references.join('; ') : ''));
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
    if (googleMeasurementAvailable()) {
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
    }

    // Não enviamos eventos de contato à Meta neste site médico. A própria
    // plataforma restringe esses eventos para esta categoria. O clique segue
    // mensurado pelo Google e pelo contador técnico local acima.
    recordDebug('whatsapp_click', mode);
  }

  function bindWhatsAppTracking() {
    document.querySelectorAll(whatsappSelector).forEach(function (link) {
      if (link.dataset.amandaMeasurementBound === 'true') return;
      link.dataset.amandaMeasurementBound = 'true';
      // O listener fica no próprio link e em captura para cobrir também
      // botões flutuantes e componentes que interrompam a propagação do clique.
      link.addEventListener('click', function () {
        updateAllWhatsAppLinks();
        trackWhatsAppClick(link);
      }, true);
    });
  }

  function initializeWhatsAppTracking() {
    updateAllWhatsAppLinks();
    bindWhatsAppTracking();
    observeWhatsAppCtas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhatsAppTracking);
  } else {
    initializeWhatsAppTracking();
  }

  document.addEventListener('amanda:consent-granted', updateAllWhatsAppLinks);
})();
