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
  var marketingPrefillTemplateId = 'procedure_evaluation_v1';
  var procedureLabels = {
    'abdominoplastia': 'abdominoplastia',
    'avaliacao-facial': 'avaliação facial',
    'blefaroplastia': 'blefaroplastia',
    'braquioplastia': 'braquioplastia',
    'cirurgia-facial-preco': 'cirurgia plástica facial',
    'contorno-corporal': 'contorno corporal',
    'custos-cirurgia-corporal': 'cirurgia plástica corporal',
    'custos-cirurgia-mama': 'cirurgia plástica das mamas',
    'injetaveis': 'procedimentos injetáveis',
    'lifting-cervical': 'cervicoplastia (lifting cervical)',
    'lifting-facial': 'lifting facial',
    'lifting-facial-preco': 'lifting facial',
    'lip-lifting': 'lip lifting',
    'lipo-de-papada': 'lipo de papada',
    'lipoaspiracao': 'lipoaspiração',
    'mama': 'cirurgia plástica das mamas',
    'mamoplastia-redutora': 'mamoplastia redutora',
    'mastopexia': 'mastopexia',
    'mastopexia-com-protese': 'mastopexia com prótese',
    'ninfoplastia': 'ninfoplastia',
    'otoplastia': 'otoplastia',
    'otoplastia-adulto': 'otoplastia em adultos',
    'otoplastia-infantil': 'otoplastia para criança ou adolescente',
    'pos-bariatrica': 'cirurgia pós-bariátrica',
    'protese-de-mama': 'prótese de mama'
  };

  function neutralPrefillMessage(link) {
    var procedure = String(link.dataset.procedure || '').trim().toLowerCase();
    var label = procedureLabels[procedure] || 'cirurgia plástica';
    return 'Olá! Tenho interesse em ' + label + ' com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.';
  }

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

      // A referência genérica continua útil para leitura operacional, enquanto
      // o click ID exato segue separadamente na sessão e no clique voluntário.
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

    var searchParams;
    try { searchParams = new URLSearchParams(window.location.search); }
    catch (error) { searchParams = null; }

    clickIdParams.forEach(function (param) {
      var value = normalizeClickId(searchParams ? searchParams.get(param) : '');
      if (value) {
        storeSessionValue(clickIdStoragePrefix + param, value);
      } else {
        value = readSessionValue(clickIdStoragePrefix + param, normalizeClickId);
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
  var marketingClickIdParams = ['gclid', 'gbraid', 'wbraid'];
  var journeyStorageKey = 'amanda_attribution_journey_v1';
  var journeySessionIdKey = 'amanda_attribution_session_v1';
  var journeyTtlMs = 30 * 24 * 60 * 60 * 1000;
  var journeyEndpoint = '/.netlify/functions/attribution-journey';
  var journeyMetaParams = ['meta_campaign_id', 'meta_adset_id', 'meta_ad_id'];

  function attributionJourneyEnabled() {
    return config.attributionJourneyEnabled === true;
  }

  function randomBase64Url(prefix) {
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') return '';
    try {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      var output = '';
      var buffer = 0;
      var bits = 0;
      bytes.forEach(function (byte) {
        buffer = (buffer << 8) | byte;
        bits += 8;
        while (bits >= 6) {
          bits -= 6;
          output += alphabet[(buffer >>> bits) & 63];
        }
      });
      if (bits > 0) output += alphabet[(buffer << (6 - bits)) & 63];
      return prefix + output;
    } catch (error) {
      return '';
    }
  }

  function normalizeMetaId(value) {
    value = typeof value === 'string' ? value.trim() : '';
    return /^\d{5,30}$/.test(value) ? value : '';
  }

  function normalizePagePath(value) {
    value = typeof value === 'string' ? value.trim() : '';
    return /^\/[A-Za-z0-9%/_~.-]{0,180}$/.test(value) ? value : '';
  }

  function currentJourneySessionId() {
    try {
      var current = sessionStorage.getItem(journeySessionIdKey) || '';
      if (/^S1_[A-Za-z0-9_-]{22}$/.test(current)) return current;
      current = randomBase64Url('S1_');
      if (current) sessionStorage.setItem(journeySessionIdKey, current);
      return current;
    } catch (error) {
      return '';
    }
  }

  function referrerClassification() {
    var referrer = String(document.referrer || '').trim();
    // Referrer can be absent for many reasons (privacy controls, apps, copied
    // links, redirects). Absence alone is not evidence of a direct visit.
    if (!referrer) return { origin: 'Desconhecida', channel: 'unknown', referrer_type: 'missing' };
    try {
      var host = new URL(referrer).hostname.toLowerCase();
      if (/(^|\.)google\./.test(host)) return { origin: 'Google orgânico', channel: 'organic_search', referrer_type: 'google' };
      if (/(^|\.)bing\.com$/.test(host)) return { origin: 'Bing orgânico', channel: 'organic_search', referrer_type: 'bing' };
      if (/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/.test(host)) return { origin: 'ChatGPT', channel: 'ai_referral', referrer_type: 'chatgpt', ai_source: 'chatgpt' };
      if (/(^|\.)perplexity\.ai$/.test(host)) return { origin: 'Perplexity', channel: 'ai_referral', referrer_type: 'perplexity', ai_source: 'perplexity' };
      if (/(^|\.)copilot\.microsoft\.com$/.test(host)) return { origin: 'Copilot', channel: 'ai_referral', referrer_type: 'copilot', ai_source: 'copilot' };
      if (/(^|\.)gemini\.google\.com$/.test(host)) return { origin: 'Gemini', channel: 'ai_referral', referrer_type: 'gemini', ai_source: 'gemini' };
      if (/(^|\.)instagram\.com$/.test(host)) return { origin: 'Instagram orgânico', channel: 'social_organic', referrer_type: 'instagram' };
      if (host === window.location.hostname) return { origin: 'Desconhecida', channel: 'unknown', referrer_type: 'internal' };
      return { origin: 'Desconhecida', channel: 'referral', referrer_type: 'external' };
    } catch (error) {
      return { origin: 'Desconhecida', channel: 'unknown', referrer_type: 'invalid' };
    }
  }

  function classifyJourneyOrigin(attribution) {
    var source = String(attribution.utm_source || '').toLowerCase();
    var medium = String(attribution.utm_medium || '').toLowerCase();
    var campaign = String(attribution.utm_campaign || attribution.origem || '').toUpperCase();
    if (/^M26/.test(campaign) || /^(?:meta|facebook|instagram)$/.test(source) && /paid|cpc/.test(medium)) {
      return { origin: 'Meta Ads', channel: 'meta_ads', referrer_type: 'meta_paid' };
    }
    if (/^G26/.test(campaign) || marketingClickIdParams.some(function (field) { return !!attribution[field]; }) || source === 'google' && medium === 'cpc') {
      return { origin: 'Google Ads', channel: 'google_ads', referrer_type: 'google_paid' };
    }
    if (/^(?:chatgpt|openai)$/.test(source)) return { origin: 'ChatGPT', channel: 'ai_referral', referrer_type: 'chatgpt', ai_source: 'chatgpt' };
    if (source === 'perplexity') return { origin: 'Perplexity', channel: 'ai_referral', referrer_type: 'perplexity', ai_source: 'perplexity' };
    if (source === 'copilot') return { origin: 'Copilot', channel: 'ai_referral', referrer_type: 'copilot', ai_source: 'copilot' };
    if (source === 'gemini') return { origin: 'Gemini', channel: 'ai_referral', referrer_type: 'gemini', ai_source: 'gemini' };
    return referrerClassification();
  }

  function touchFromCurrentPage(attribution) {
    var classification = classifyJourneyOrigin(attribution);
    var searchParams;
    try { searchParams = new URLSearchParams(window.location.search); }
    catch (error) { searchParams = null; }
    var metaCampaignId = normalizeMetaId(searchParams ? searchParams.get('meta_campaign_id') : '');
    if (!metaCampaignId && classification.channel === 'meta_ads') {
      metaCampaignId = normalizeMetaId(searchParams ? searchParams.get('utm_id') : '');
    }
    return {
      occurred_at: new Date().toISOString(),
      session_id: currentJourneySessionId(),
      origin: classification.origin,
      channel: classification.channel,
      source: sanitizeTrackingValue(attribution.utm_source || ''),
      medium: sanitizeTrackingValue(attribution.utm_medium || ''),
      campaign_code: sanitizeTrackingValue(attribution.utm_campaign || attribution.origem || '').toUpperCase(),
      adgroup_code: sanitizeTrackingValue(searchParams ? searchParams.get('utm_adgroup') : '').toUpperCase(),
      creative_code: sanitizeTrackingValue(attribution.utm_content || '').toUpperCase(),
      meta_campaign_id: metaCampaignId,
      meta_adset_id: normalizeMetaId(searchParams ? searchParams.get('meta_adset_id') : ''),
      meta_ad_id: normalizeMetaId(searchParams ? searchParams.get('meta_ad_id') : ''),
      page_path: normalizePagePath(window.location.pathname),
      referrer_type: classification.referrer_type || '',
      ai_source: classification.ai_source || ''
    };
  }

  function validJourneyState(value) {
    return value && typeof value === 'object' && value.version === 1 &&
      /^J0_[A-Za-z0-9_-]{22}$/.test(String(value.journey_id || '')) &&
      Number(value.expires_at || 0) > Date.now() && value.first_touch;
  }

  function readJourneyState() {
    var candidate = null;
    try { candidate = JSON.parse(sessionStorage.getItem(journeyStorageKey) || 'null'); }
    catch (error) { candidate = null; }
    if (validJourneyState(candidate)) return candidate;
    if (fullConsentGranted()) {
      try { candidate = JSON.parse(localStorage.getItem(journeyStorageKey) || 'null'); }
      catch (error) { candidate = null; }
      if (validJourneyState(candidate)) {
        try { sessionStorage.setItem(journeyStorageKey, JSON.stringify(candidate)); } catch (error) {}
        return candidate;
      }
    }
    return null;
  }

  function writeJourneyState(state) {
    if (!validJourneyState(state)) return;
    try { sessionStorage.setItem(journeyStorageKey, JSON.stringify(state)); } catch (error) {}
    try {
      if (fullConsentGranted()) localStorage.setItem(journeyStorageKey, JSON.stringify(state));
      else localStorage.removeItem(journeyStorageKey);
    } catch (error) {}
  }

  function nonDirectTouch(touch) {
    return touch && ['direct', 'unknown'].indexOf(touch.channel) === -1;
  }

  function updateJourneyFromCurrentPage() {
    if (!attributionJourneyEnabled()) return null;
    var attributionFromUrl = readAttributionFromUrl();
    var currentTouch = touchFromCurrentPage(attributionFromUrl);
    var state = readJourneyState();
    if (!state) {
      var journeyId = randomBase64Url('J0_');
      if (!journeyId) return null;
      state = {
        version: 1,
        journey_id: journeyId,
        created_at: Date.now(),
        expires_at: Date.now() + journeyTtlMs,
        first_touch: currentTouch,
        last_touch: currentTouch,
        last_non_direct_touch: nonDirectTouch(currentTouch) ? currentTouch : null,
        pages: []
      };
    } else {
      state.last_touch = currentTouch;
      if (nonDirectTouch(currentTouch)) state.last_non_direct_touch = currentTouch;
    }
    state.pages = Array.isArray(state.pages) ? state.pages : [];
    var previousPage = state.pages[state.pages.length - 1];
    if (!previousPage || previousPage.page_path !== currentTouch.page_path || previousPage.session_id !== currentTouch.session_id) {
      state.pages.push({
        occurred_at: currentTouch.occurred_at,
        session_id: currentTouch.session_id,
        page_path: currentTouch.page_path
      });
      state.pages = state.pages.slice(-12);
    }
    writeJourneyState(state);
    return state;
  }

  function conversionPathForJourney(state) {
    var first = state && state.first_touch || {};
    var paid = state && state.last_non_direct_touch || first;
    var returning = Boolean(first.session_id && currentJourneySessionId() && first.session_id !== currentJourneySessionId());
    if (paid.channel === 'meta_ads') return returning ? 'meta_site_return_whatsapp' : 'meta_site_whatsapp';
    if (paid.channel === 'google_ads') return 'google_site_whatsapp';
    if (paid.channel === 'ai_referral') return 'ai_site_whatsapp';
    if (paid.channel === 'organic_search' || paid.channel === 'social_organic' || paid.channel === 'referral') return 'organic_site_whatsapp';
    if (paid.channel === 'direct') return 'direct_whatsapp';
    return 'unknown';
  }

  function journeyConfidence(state) {
    var paid = state && (state.last_non_direct_touch || state.first_touch) || {};
    if (paid.channel === 'meta_ads') {
      return paid.campaign_code && paid.meta_campaign_id && paid.meta_adset_id && paid.meta_ad_id ? 'observed' : 'partial';
    }
    if (paid.channel === 'google_ads') return paid.campaign_code ? 'observed' : 'partial';
    return paid.channel && paid.channel !== 'unknown' ? 'observed' : 'unknown';
  }

  function journeyFallbackReason(state) {
    var paid = state && (state.last_non_direct_touch || state.first_touch) || {};
    if (paid.channel === 'meta_ads' && !(paid.meta_campaign_id && paid.meta_adset_id && paid.meta_ad_id)) return 'meta_dimensions_incomplete';
    if (paid.channel === 'google_ads' && !paid.campaign_code) return 'google_campaign_missing';
    if (!paid.channel || paid.channel === 'unknown') return 'origin_unknown';
    return '';
  }

  function journeyEnvelopeForLink(link, rotateTransportToken) {
    if (!attributionJourneyEnabled()) return null;
    var state = updateJourneyFromCurrentPage();
    if (!state) return null;
    var token = sanitizeTrackingValue(link.dataset.attributionJourneyToken || '');
    if (rotateTransportToken === true || !/^J1_[A-Za-z0-9_-]{22}$/.test(token)) {
      token = randomBase64Url('J1_');
      if (!token) return null;
      link.dataset.attributionJourneyToken = token;
    }
    var attribution = loadStoredAttribution();
    var clickIds = {};
    marketingClickIdParams.forEach(function (field) {
      if (attribution[field]) clickIds[field] = attribution[field];
    });
    return {
      token: token,
      first_touch: state.first_touch,
      last_touch: state.last_touch,
      last_non_direct_touch: state.last_non_direct_touch || state.first_touch,
      conversion_path: conversionPathForJourney(state),
      cta: {
        page_path: normalizePagePath(window.location.pathname),
        location: sanitizeTrackingValue(link.dataset.ctaLocation || 'unknown').toLowerCase(),
        template_id: sanitizeTrackingValue(link.dataset.templateId || marketingPrefillTemplateId).toLowerCase()
      },
      click_ids: clickIds,
      confidence: journeyConfidence(state),
      fallback_reason: journeyFallbackReason(state)
    };
  }

  function appendJourneyTokenToMessage(message, token) {
    var cleaned = String(message || '').replace(/(?:\r?\n)+JID\s*:\s*J1_[A-Za-z0-9_-]{22}/gi, '');
    return cleaned.replace(/\s+$/, '') + '\nJID: ' + token;
  }

  function addJourneyTokenToLink(link, rotateTransportToken) {
    var envelope = journeyEnvelopeForLink(link, rotateTransportToken);
    if (!envelope) return null;
    try {
      var url = new URL(link.href, window.location.href);
      var message = url.searchParams.get('text');
      if (!message) return envelope;
      url.searchParams.set('text', appendJourneyTokenToMessage(message, envelope.token));
      link.href = url.toString();
      return envelope;
    } catch (error) {
      return null;
    }
  }

  function registerAttributionJourney(link) {
    if (!attributionJourneyEnabled()) return false;
    // J1 is a short transport credential, not the durable journey ID. Rotate
    // it for every user-initiated attempt so a second click never reuses an
    // already claimed token.
    var envelope = addJourneyTokenToLink(link, true);
    if (!envelope) return false;
    var body = JSON.stringify(envelope);
    try {
      if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
        return window.navigator.sendBeacon(journeyEndpoint, body);
      }
    } catch (error) {}
    try {
      if (typeof window.fetch === 'function') {
        window.fetch(journeyEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'text/plain;charset=UTF-8' },
          body: body,
          credentials: 'same-origin',
          keepalive: true
        }).catch(function () {});
        return true;
      }
    } catch (error) {}
    return false;
  }

  function sanitizeTrackingValue(value) {
    value = typeof value === 'string' ? value.trim() : '';
    return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : '';
  }

  function sanitizeMarketingAttributionValue(param, value) {
    if (marketingClickIdParams.indexOf(param) !== -1) {
      // Click IDs are case-sensitive and must remain unchanged.
      return normalizeClickId(value);
    }
    return sanitizeTrackingValue(value);
  }

  function readAttributionFromUrl() {
    var attribution = {};
    try {
      var searchParams = new URLSearchParams(window.location.search);
      // GCLID, GBRAID e WBRAID acompanham somente a sessão e a mensagem
      // voluntária do WhatsApp. Essa atribuição técnica independe do aceite
      // dado a cookies, pixels, pageviews e demais sinais de marketing.
      var allowedParams = marketingAttributionParams.concat(marketingClickIdParams);
      allowedParams.forEach(function (param) {
        var value = sanitizeMarketingAttributionValue(param, searchParams.get(param));
        if (value) attribution[param] = value;
      });

      // A referência de origem não depende do consentimento de marketing.
      // Quando a marcação automática identifica um clique do Google, mas a
      // campanha não trouxe um código estável, usamos o código G26ADS junto
      // do click ID de sessão para manter a origem legível e reconciliável.
      var hasGoogleClickId = marketingClickIdParams.some(function (param) {
        return !!normalizeClickId(searchParams.get(param) || '');
      });
      var isGooglePaidVisit = attribution.utm_source === 'google' && attribution.utm_medium === 'cpc';
      if (!attribution.utm_campaign && !attribution.origem && (hasGoogleClickId || isGooglePaidVisit)) {
        attribution.origem = normalizeCampaignOriginCode(config.googleAdsFallbackOriginCode || 'G26ADS') || 'G26ADS';
      }
    } catch (error) {}
    return attribution;
  }

  function removeMarketingClickIds(attribution) {
    attribution = attribution && typeof attribution === 'object' ? attribution : {};
    marketingClickIdParams.forEach(function (param) {
      delete attribution[param];
    });
    return attribution;
  }

  function clearStoredMarketingClickIds() {
    try {
      var stored = JSON.parse(sessionStorage.getItem(marketingAttributionStorageKey) || '{}');
      stored = removeMarketingClickIds(stored);
      if (Object.keys(stored).length) {
        sessionStorage.setItem(marketingAttributionStorageKey, JSON.stringify(stored));
      } else {
        sessionStorage.removeItem(marketingAttributionStorageKey);
      }
    } catch (error) {
      try { sessionStorage.removeItem(marketingAttributionStorageKey); } catch (storageError) {}
    }
  }

  function saveAttribution(attribution) {
    if (!Object.keys(attribution).length) return;
    var mergedAttribution = loadStoredAttribution();
    Object.keys(attribution).forEach(function (param) {
      // An absent parameter never removes an ID already captured in this session.
      if (attribution[param]) mergedAttribution[param] = attribution[param];
    });
    try { sessionStorage.setItem(marketingAttributionStorageKey, JSON.stringify(mergedAttribution)); }
    catch (error) {}
  }

  function loadStoredAttribution() {
    try {
      var stored = JSON.parse(sessionStorage.getItem(marketingAttributionStorageKey) || '{}');
      if (!stored || typeof stored !== 'object') return {};
      var attribution = {};
      var allowedParams = marketingAttributionParams.concat(marketingClickIdParams);
      allowedParams.forEach(function (param) {
        var value = sanitizeMarketingAttributionValue(param, stored[param]);
        if (value) attribution[param] = value;
      });
      return attribution;
    } catch (error) {
      return {};
    }
  }

  function getOriginalReference(link, message, attribution) {
    var originalReference = sanitizeTrackingValue(link.dataset.originalReference || '');
    if (originalReference) return originalReference;

    var referenceMatch = message.match(/\bRef\.\s*([A-Za-z0-9_-]{1,80})(?=\s|$)/i);
    if (referenceMatch) originalReference = sanitizeTrackingValue(referenceMatch[1]);

    // A maioria das páginas usa uma referência descritiva e legível, como
    // "Referência: Lifting facial". O data-procedure é o código estável e
    // fechado que permite transformar qualquer CTA do site em uma referência
    // técnica sem depender da redação visível da mensagem.
    if (!originalReference) {
      originalReference = sanitizeTrackingValue(link.dataset.procedure || '');
    }
    if (!originalReference) return '';

    var attributionPrefix = [attribution.utm_campaign || attribution.origem || '', attribution.utm_content || '']
      .filter(function (value) { return !!value; })
      .join('-');
    if (attributionPrefix && originalReference.indexOf(attributionPrefix + '-') === 0) {
      originalReference = originalReference.slice(attributionPrefix.length + 1);
    }
    if (originalReference) link.dataset.originalReference = originalReference;
    return originalReference;
  }

  function buildReference(attribution, originalReference) {
    var referenceParts = [];
    var campaign = attribution.utm_campaign || attribution.origem || '';
    if (campaign) referenceParts.push(campaign);
    if (attribution.utm_content) referenceParts.push(attribution.utm_content);
    if (!referenceParts.length) referenceParts.push('SITE');
    referenceParts.push(originalReference);
    return referenceParts.join('-');
  }

  function updateWhatsAppLink(link, attribution) {
    if (!link.matches('a[data-track="whatsapp"]')) return;
    try {
      var url = new URL(link.href, window.location.href);
      var message = url.searchParams.get('text');
      if (!message) return;

      var originalReference = getOriginalReference(link, message, attribution);
      if (!originalReference) return;

      var reference = buildReference(attribution, originalReference);
      link.dataset.templateId = marketingPrefillTemplateId;
      var updatedMessage = neutralPrefillMessage(link) + '\n\nRef. ' + reference;

      // Legacy/default-off path keeps the current operational contract. Once
      // the first-party journey is explicitly enabled, click IDs travel only
      // inside the short-lived server envelope and never in visible WhatsApp
      // text.
      if (!attributionJourneyEnabled()) {
        marketingClickIdParams.forEach(function (param) {
          if (attribution[param]) updatedMessage += '\n' + param.toUpperCase() + ': ' + attribution[param];
        });
      }
      if (updatedMessage === message) return;
      url.searchParams.set('text', updatedMessage);
      link.href = url.toString();
    } catch (error) {}
  }

  function updateAllWhatsAppLinks() {
    var attributionFromUrl = readAttributionFromUrl();
    if (Object.keys(attributionFromUrl).length) saveAttribution(attributionFromUrl);
    updateJourneyFromCurrentPage();
    var attribution = loadStoredAttribution();
    document.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
      updateWhatsAppLink(link, attribution);
      addJourneyTokenToLink(link);
    });
  }

  function observeWhatsAppCtas() {
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(function (mutations) {
      var attribution = loadStoredAttribution();
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('a[data-track="whatsapp"]')) {
            updateWhatsAppLink(node, attribution);
            addJourneyTokenToLink(node);
            bindWhatsAppLink(node);
          }
          if (node.querySelectorAll) node.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
            updateWhatsAppLink(link, attribution);
            addJourneyTokenToLink(link);
            bindWhatsAppLink(link);
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
    var mode = consented ? 'consented' : 'attribution_only';

    // Sem consentimento, o click ID segue somente na mensagem voluntária do
    // WhatsApp. Nenhuma tag, pageview, pixel ou conversão externa é disparada.
    if (consented && googleMeasurementAvailable()) {
      // Keep this event generic. Page, procedure and CTA semantics are handled
      // by the first-party attribution contract, not sent as GA4 custom data.
      window.gtag('event', 'whatsapp_click', {
        event_category: 'engagement',
        contact_channel: 'whatsapp',
        measurement_state: 'consented',
        transport_type: 'beacon',
        send_to: config.ga4Id
      });

      // Conversão genérica e deduplicada. Nunca inclui procedimento,
      // página, diagnóstico, texto da mensagem ou dado pessoal.
      if (config.googleAdsId && config.googleAdsConversionLabel && conversionNotYetSent('whatsapp_click')) {
        window.gtag('event', 'conversion', sanitizePreConsentParams({
          send_to: config.googleAdsId + '/' + config.googleAdsConversionLabel,
          non_personalized_ads: false,
          transport_type: 'beacon'
        }, preConsentConversionAllowedParams));
      }
    }

    // Não enviamos eventos de contato à Meta neste site médico. A própria
    // plataforma restringe esses eventos para esta categoria. O clique segue
    // mensurado pelo Google e pelo contador técnico local acima.
    recordDebug('whatsapp_click', mode);
  }

  function trackContentDepthClick(link) {
    if (!fullConsentGranted() || !googleMeasurementAvailable() || !config.ga4Id) return;

    var trackId = String(link.dataset.trackId || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,60}$/.test(trackId)) return;

    var root = document.documentElement;
    var pageType = root.dataset.pageType || 'content';
    window.gtag('event', 'content_depth_click', {
      event_category: 'navigation',
      link_role: trackId,
      page_type: pageType,
      cta_location: link.dataset.ctaLocation || 'content',
      transport_type: 'beacon',
      send_to: config.ga4Id
    });
  }

  function handleTrackedNavigationClick(event) {
    var target = event && event.target;
    if (!target || typeof target.closest !== 'function') return;
    var link = target.closest('a[data-track="content-depth"]');
    if (link) trackContentDepthClick(link);
  }

  function bindWhatsAppLink(link) {
    if (!link || link.dataset.amandaMeasurementBound === 'true') return;
    link.dataset.amandaMeasurementBound = 'true';
    // O listener fica no próprio link e em captura para cobrir também
    // botões flutuantes e componentes que interrompam a propagação do clique.
    link.addEventListener('click', function () {
      updateAllWhatsAppLinks();
      registerAttributionJourney(link);
      trackWhatsAppClick(link);
    }, true);
  }

  function bindWhatsAppTracking() {
    document.querySelectorAll(whatsappSelector).forEach(bindWhatsAppLink);
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
  document.addEventListener('amanda:consent-denied', updateAllWhatsAppLinks);
  document.addEventListener('click', handleTrackedNavigationClick, true);

  if (config.debug) {
    window.AmandaAttributionDebug = {
      readAttributionFromUrl: readAttributionFromUrl,
      loadStoredAttribution: loadStoredAttribution,
      clearStoredMarketingClickIds: clearStoredMarketingClickIds,
      updateAllWhatsAppLinks: updateAllWhatsAppLinks,
      updateJourneyFromCurrentPage: updateJourneyFromCurrentPage,
      journeyEnvelopeForLink: journeyEnvelopeForLink,
      registerAttributionJourney: registerAttributionJourney
    };
  }
})();
