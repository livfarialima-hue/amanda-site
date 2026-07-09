(function () {
  var config = window.AMANDA_TRACKING_CONFIG || {};

  function getStoredAttribution() {
    try {
      return JSON.parse(localStorage.getItem('amanda_attribution') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function storeAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
    var found = {};
    keys.forEach(function (key) {
      var value = params.get(key);
      if (value) found[key] = value;
    });
    if (Object.keys(found).length) {
      found.landing_page = window.location.pathname;
      found.landing_time = new Date().toISOString();
      try { localStorage.setItem('amanda_attribution', JSON.stringify(found)); } catch (e) {}
    }
  }

  function decodeCampaign(url) {
    try {
      var parsed = new URL(url, window.location.href);
      var text = parsed.searchParams.get('text') || '';
      var decoded = decodeURIComponent(text.replace(/\+/g, ' '));
      var match = decoded.match(/utm_campaign=([^\s|]+)/i);
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
    if (anchor.classList.contains('whatsapp-float')) return 'float';
    if (anchor.classList.contains('nav-cta')) return 'navigation';
    if (anchor.closest('.hero')) return 'hero';
    if (anchor.closest('.cta')) return 'final_cta';
    if (anchor.closest('.first-contact-section')) return 'first_contact';
    if (anchor.closest('.internal-page-nav')) return 'internal_nav';
    return 'inline';
  }

  function consentAllowsPixels() {
    try { return localStorage.getItem('amanda_tracking_consent') === 'granted' || !config.requireConsent; }
    catch (e) { return !config.requireConsent; }
  }

  function trackWhatsAppClick(anchor) {
    var campaign = decodeCampaign(anchor.href);
    var attribution = getStoredAttribution();
    var pageType = pageTypeFromPath(window.location.pathname);
    var location = ctaLocation(anchor);
    var ctaText = (anchor.textContent || '').replace(/\s+/g, ' ').trim();

    var payload = {
      event: 'lead_whatsapp_click',
      lead_type: 'whatsapp',
      lead_source: 'site',
      event_category: 'lead',
      event_label: campaign || pageType,
      page_campaign: campaign,
      page_type: pageType,
      cta_location: location,
      cta_text: ctaText,
      page_path: window.location.pathname,
      page_title: document.title,
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      landing_page: attribution.landing_page || '',
      link_domain: 'wa.me'
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === 'function' && consentAllowsPixels()) {
      window.gtag('event', 'whatsapp_click', {
        event_category: 'lead',
        event_label: payload.event_label,
        page_campaign: payload.page_campaign,
        page_type: payload.page_type,
        cta_location: payload.cta_location,
        cta_text: payload.cta_text,
        page_path: payload.page_path,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign
      });

      window.gtag('event', 'generate_lead', {
        method: 'whatsapp',
        page_type: payload.page_type,
        cta_location: payload.cta_location,
        page_campaign: payload.page_campaign
      });

      if (config.googleAdsId && config.googleAdsConversionLabel) {
        window.gtag('event', 'conversion', {
          send_to: config.googleAdsId + '/' + config.googleAdsConversionLabel
        });
      }
    }

    if (typeof window.fbq === 'function' && consentAllowsPixels()) {
      // Não enviamos texto de WhatsApp, telefone, nome ou conteúdo clínico livre.
      window.fbq('track', 'Lead', {
        content_name: 'whatsapp_consultation_request',
        content_category: 'site_lead',
        cta_location: payload.cta_location
      });
      window.fbq('trackCustom', 'WhatsAppClick', {
        page_type: payload.page_type,
        cta_location: payload.cta_location
      });
    }
  }

  storeAttribution();

  document.addEventListener('click', function (event) {
    var anchor = event.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]');
    if (!anchor) return;
    trackWhatsAppClick(anchor);
  });
})();
