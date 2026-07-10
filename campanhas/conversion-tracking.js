(function () {
  'use strict';

  var config = window.AMANDA_TRACKING_CONFIG || {};
  var attributionKey = 'amanda_attribution';
  var firstTouchKey = 'amanda_first_touch';

  function safeParse(value) {
    try { return JSON.parse(value || '{}') || {}; } catch (e) { return {}; }
  }

  function getStoredAttribution() {
    try { return safeParse(localStorage.getItem(attributionKey)); } catch (e) { return {}; }
  }

  function pageContext() {
    var root = document.documentElement;
    return {
      page_type: root.dataset.pageType || pageTypeFromPath(window.location.pathname),
      content_group: root.dataset.contentGroup || '',
      procedure: root.dataset.procedure || pageTypeFromPath(window.location.pathname),
      page_path: window.location.pathname,
      page_title: document.title
    };
  }

  function storeAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
    var found = {};
    keys.forEach(function (key) {
      var value = params.get(key);
      if (value) found[key] = value.substring(0, 250);
    });

    if (!Object.keys(found).length) return;

    found.landing_page = window.location.pathname;
    found.landing_time = new Date().toISOString();
    try {
      if (!localStorage.getItem(firstTouchKey)) localStorage.setItem(firstTouchKey, JSON.stringify(found));
      localStorage.setItem(attributionKey, JSON.stringify(found));
    } catch (e) {}
  }

  function decodeCampaign(url) {
    try {
      var parsed = new URL(url, window.location.href);
      var text = parsed.searchParams.get('text') || '';
      var match = text.match(/utm_campaign=([^\s|]+)/i);
      return match ? match[1] : '';
    } catch (error) {
      return '';
    }
  }

  function pageTypeFromPath(path) {
    if (path === '/' || path === '/index.html') return 'home';
    return path.replace(/^\//, '').replace(/\/$/, '') || 'home';
  }

  function ctaLocation(anchor) {
    if (anchor.classList.contains('whatsapp-float')) return 'sticky_mobile';
    if (anchor.classList.contains('nav-cta')) return 'navigation';
    if (anchor.closest('.hero')) return 'hero';
    if (anchor.closest('.procedure-detail')) return 'procedure_details';
    if (anchor.closest('.fit-check')) return 'intent_bridge';
    if (anchor.closest('.cta')) return 'final_cta';
    if (anchor.closest('.contact-flow')) return 'first_contact';
    if (anchor.closest('.internal-page-nav')) return 'internal_nav';
    return 'inline';
  }

  function consentAllowsPixels() {
    try { return localStorage.getItem('amanda_tracking_consent') === 'granted' || !config.requireConsent; }
    catch (e) { return !config.requireConsent; }
  }

  function pushDataLayer(payload) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  function conversionNotYetSent(key) {
    try {
      var storageKey = 'amanda_conversion_' + key;
      if (sessionStorage.getItem(storageKey)) return false;
      sessionStorage.setItem(storageKey, '1');
      return true;
    } catch (e) {
      return true;
    }
  }

  function trackWhatsAppClick(anchor) {
    var campaign = decodeCampaign(anchor.href);
    var attribution = getStoredAttribution();
    var context = pageContext();
    var location = ctaLocation(anchor);
    var ctaText = (anchor.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 100);
    var selectedProcedure = anchor.dataset.procedure || context.procedure;

    var payload = Object.assign({
      event: 'whatsapp_click_intent',
      lead_type: 'whatsapp',
      lead_source: 'site',
      event_category: 'engagement',
      event_label: campaign || context.procedure,
      page_campaign: campaign,
      selected_procedure: selectedProcedure,
      cta_location: location,
      cta_text: ctaText,
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      landing_page: attribution.landing_page || '',
      link_domain: 'wa.me'
    }, context);

    pushDataLayer(payload);

    // Clique no WhatsApp é um sinal de intenção, não uma conversão clínica confirmada.
    if (typeof window.gtag === 'function' && consentAllowsPixels()) {
      window.gtag('event', 'whatsapp_click', {
        event_category: 'engagement',
        event_label: payload.event_label,
        page_campaign: payload.page_campaign,
        page_type: payload.page_type,
        content_group: payload.content_group,
        cta_location: payload.cta_location,
        cta_text: payload.cta_text,
        page_path: payload.page_path,
        transport_type: 'beacon'
      });
    }

    if (typeof window.fbq === 'function' && consentAllowsPixels()) {
      window.fbq('trackCustom', 'WhatsAppClick', {
        cta_location: payload.cta_location,
        page_group: payload.content_group || 'procedure'
      });
    }
  }

  /*
    Pontos de integração para CRM/WhatsApp. Use somente identificadores internos e
    eventos genéricos; nunca envie diagnóstico, texto livre ou dado clínico.
  */
  window.AmandaTracking = window.AmandaTracking || {};
  window.AmandaTracking.trackLeadStage = function (stage, metadata) {
    var allowed = ['conversation_started', 'qualified_lead', 'appointment_booked', 'appointment_attended', 'surgery_closed'];
    if (allowed.indexOf(stage) === -1) return false;
    var context = pageContext();
    var payload = Object.assign({ event: stage }, context, metadata || {});
    pushDataLayer(payload);
    if (typeof window.gtag === 'function' && consentAllowsPixels()) {
      window.gtag('event', stage, Object.assign({}, metadata || {}, { transport_type: 'beacon' }));
    }
    return true;
  };

  function trackContactLink(anchor, type) {
    var context = pageContext();
    pushDataLayer(Object.assign({
      event: type === 'tel' ? 'phone_click' : 'email_click',
      contact_type: type,
      cta_location: ctaLocation(anchor)
    }, context));

    if (typeof window.gtag === 'function' && consentAllowsPixels()) {
      window.gtag('event', type === 'tel' ? 'phone_click' : 'email_click', {
        page_type: context.page_type,
        content_group: context.content_group,
        cta_location: ctaLocation(anchor),
        transport_type: 'beacon'
      });
    }
  }

  function installEngagementTracking() {
    var context = pageContext();
    var fired = {};

    function fire(name, extra) {
      if (fired[name]) return;
      fired[name] = true;
      var payload = Object.assign({ event: name }, context, extra || {});
      pushDataLayer(payload);
      if (typeof window.gtag === 'function' && consentAllowsPixels()) {
        var params = Object.assign({}, context, extra || {}, { transport_type: 'beacon' });
        window.gtag('event', name, params);
      }
    }

    window.setTimeout(function () { fire('engaged_30_seconds'); }, 30000);

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        var depth = Math.round((window.scrollY / max) * 100);
        if (depth >= 50) fire('scroll_50', { scroll_depth: 50 });
        if (depth >= 90) fire('scroll_90', { scroll_depth: 90 });
        ticking = false;
      });
    }, { passive: true });
  }

  storeAttribution();

  document.addEventListener('DOMContentLoaded', function () {
    pushDataLayer(Object.assign({ event: 'landing_page_ready' }, pageContext(), getStoredAttribution()));
    installEngagementTracking();
  });

  document.addEventListener('click', function (event) {
    var anchor = event.target.closest('a');
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (/wa\.me\/|api\.whatsapp\.com\//i.test(href)) {
      trackWhatsAppClick(anchor);
    } else if (href.indexOf('tel:') === 0) {
      trackContactLink(anchor, 'tel');
    } else if (href.indexOf('mailto:') === 0) {
      trackContactLink(anchor, 'email');
    }
  });
})();
