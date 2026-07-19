(function () {
  'use strict';

  var config = window.AMANDA_TRACKING_CONFIG || {};
  var storageKey = 'amanda_tracking_consent';
  var attributionKeys = [
    'amanda_attribution',
    'amanda_first_touch',
    'amanda_campaign_origin',
    'amanda_click_id_gclid',
    'amanda_click_id_gbraid',
    'amanda_click_id_wbraid'
  ];
  var googleScriptId = 'amanda-google-gtag';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  window.gtag('set', 'ads_data_redaction', true);

  function getConsent() {
    try {
      var value = localStorage.getItem(storageKey);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function setConsent(value) {
    try { localStorage.setItem(storageKey, value === 'granted' ? 'granted' : 'denied'); } catch (error) {}
  }

  function updateGoogleConsent(granted) {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: granted && config.allowAdStorageAfterConsent ? 'granted' : 'denied',
      ad_user_data: granted && config.allowAdUserDataAfterConsent ? 'granted' : 'denied',
      ad_personalization: 'denied'
    });
  }

  function sendGa4PageView() {
    if (!config.ga4Id || window.__amandaGa4PageViewSent) return;
    window.gtag('event', 'page_view', {
      send_to: config.ga4Id,
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title
    });
    window.__amandaGa4PageViewSent = true;
  }

  function loadGoogleTags(options) {
    options = options || {};
    if (!config.ga4Id && !config.googleAdsId) return;

    if (!document.getElementById(googleScriptId) && !document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      var script = document.createElement('script');
      script.id = googleScriptId;
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.googleAdsId || config.ga4Id);
      document.head.appendChild(script);
    }

    if (!window.__amandaGoogleConfigured) {
      window.__amandaGoogleConfigured = true;
      window.gtag('set', 'allow_ad_personalization_signals', false);
      window.gtag('js', new Date());
      if (config.ga4Id) {
        window.gtag('config', config.ga4Id, {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false
        });
      }
      if (config.googleAdsId) {
        window.gtag('config', config.googleAdsId, {
          send_page_view: false,
          allow_ad_personalization_signals: false
        });
      }
    }
    if (options.sendPageView && getConsent() === 'granted') sendGa4PageView();
  }

  function loadMetaPixel() {
    if (!config.metaPixelId || getConsent() !== 'granted' || window.fbq) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', config.metaPixelId);
    if (config.trackMetaPageViews !== false && !window.__amandaMetaPageViewSent) {
      window.fbq('track', 'PageView');
      window.__amandaMetaPageViewSent = true;
    }
    window.__amandaMetaLoaded = true;
  }

  function clearSiteAttribution() {
    attributionKeys.forEach(function (key) {
      try { localStorage.removeItem(key); } catch (error) {}
      try { sessionStorage.removeItem(key); } catch (error) {}
    });
  }

  function rootCookieDomain() {
    var parts = window.location.hostname.split('.');
    if (parts.length < 2) return '';
    var usesCountryCodeSecondLevel = parts.length >= 3 && parts[parts.length - 1].length === 2 && /^(com|org|net|gov|edu)$/i.test(parts[parts.length - 2]);
    return '.' + parts.slice(usesCountryCodeSecondLevel ? -3 : -2).join('.');
  }

  function deleteMeasurementCookies() {
    var prefixes = ['_ga', '_gid', '_gat', '_gcl_', '_fbp', '_fbc'];
    var domains = ['', window.location.hostname, rootCookieDomain()];
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (!prefixes.some(function (prefix) { return name.indexOf(prefix) === 0; })) return;
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
      });
    });
  }

  function removeBanner() {
    var banner = document.querySelector('.cookie-consent');
    if (banner) banner.remove();
  }

  function injectConsentBanner(force) {
    if (!force && getConsent()) return;
    removeBanner();

    if (!document.getElementById('amanda-consent-style')) {
      var style = document.createElement('style');
      style.id = 'amanda-consent-style';
      style.textContent = '.cookie-consent{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9999;max-width:760px;margin:0 auto;padding:16px;background:#fffaf7;border:1px solid rgba(80,55,48,.18);box-shadow:0 20px 60px rgba(55,35,28,.18);border-radius:18px;color:#392720;font-size:13px;line-height:1.4}.cookie-consent strong{display:block;margin:0 0 4px;font-size:15px}.cookie-consent p{margin:0;color:rgba(57,39,32,.78)}.cookie-consent-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.cookie-consent button{border:1px solid #51362f;background:#fffaf7;color:#392720;border-radius:999px;padding:9px 12px;font:inherit;font-weight:600;cursor:pointer}.cookie-consent .privacy-policy{grid-column:1/-1;color:inherit;text-decoration:underline;padding:4px 2px}@media(max-width:760px){.cookie-consent{left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));padding:13px;font-size:12.5px}.cookie-consent button{padding:9px 7px}}';
      document.head.appendChild(style);
    }

    var banner = document.createElement('div');
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferências de privacidade');
    banner.innerHTML = '<strong>Privacidade e mensuração</strong><p> Usamos ferramentas para avaliar o desempenho de nossas comunicações. Se você recusar, cookies analíticos e de publicidade não serão ativados. Garantia de privacidade: dados clínicos nunca são compartilhados. </p><div class="cookie-consent-actions"><button class="accept" type="button">Aceitar cookies</button><button class="reject" type="button">Continuar sem aceitar</button><a class="privacy-policy" href="/privacidade/">Política de privacidade</a></div>';
    document.body.appendChild(banner);

    banner.querySelector('.accept').addEventListener('click', function () {
      setConsent('granted');
      updateGoogleConsent(true);
      document.dispatchEvent(new CustomEvent('amanda:consent-granted'));
      loadGoogleTags({ sendPageView: true });
      loadMetaPixel();
      removeBanner();
      updateDebugState();
    });

    banner.querySelector('.reject').addEventListener('click', function () {
      setConsent('denied');
      clearSiteAttribution();
      updateGoogleConsent(false);
      removeBanner();
      updateDebugState();
    });
  }

  function revokeConsent() {
    setConsent('denied');
    updateGoogleConsent(false);
    clearSiteAttribution();
    deleteMeasurementCookies();
    updateDebugState();
  }

  function updateDebugState() {
    if (!config.debug) return;
    var cookies = document.cookie || '';
    window.AmandaConsentDebug = {
      consent: getConsent() || 'undecided',
      googleLoaded: !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'),
      metaLoaded: !!window.__amandaMetaLoaded,
      hasGoogleCookies: /(?:^|;\s*)_(?:ga|gid|gat|gcl_)/.test(cookies),
      hasMetaCookies: /(?:^|;\s*)_(?:fbp|fbc)/.test(cookies),
      sessionClicks: window.__amandaWhatsAppClicks || 0,
      conversionDeduplicated: !!window.__amandaWhatsAppConversionSent,
      lastEvent: window.__amandaLastMeasurementEvent || null,
      mode: getConsent() === 'granted' ? 'consented' : 'cookieless'
    };
    if (window.console) console.info('[Amanda Consent Debug]', window.AmandaConsentDebug);
  }

  window.AmandaConsent = {
    getState: getConsent,
    fullConsentGranted: function () { return getConsent() === 'granted'; },
    loadMetaPixel: loadMetaPixel,
    prepareMinimalWhatsAppMeasurement: function () {
      loadGoogleTags({ sendPageView: false });
    },
    openPreferences: function () {
      revokeConsent();
      injectConsentBanner(true);
    },
    revoke: revokeConsent,
    updateDebugState: updateDebugState
  };

  var initialConsent = getConsent();
  updateGoogleConsent(initialConsent === 'granted');
  if (initialConsent === 'granted') {
    loadGoogleTags({ sendPageView: true });
    loadMetaPixel();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!getConsent()) injectConsentBanner(false);
    document.querySelectorAll('[data-privacy-settings], [data-consent-open]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        window.AmandaConsent.openPreferences();
      });
    });
    updateDebugState();
  });
})();
