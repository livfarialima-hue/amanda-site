(function () {
  var config = window.AMANDA_TRACKING_CONFIG || {};
  var hasAnyTag = !!(config.ga4Id || config.gtmId || config.metaPixelId || config.googleAdsId);
  var storageKey = 'amanda_tracking_consent';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };

  function log() {
    if (config.debug && window.console) console.log.apply(console, arguments);
  }

  function loadScript(src, id) {
    if (!src || (id && document.getElementById(id))) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (id) s.id = id;
    document.head.appendChild(s);
  }

  function getConsent() {
    try { return localStorage.getItem(storageKey); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(storageKey, value); } catch (e) {}
  }

  function googleConsentDefault() {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500
    });
  }

  function googleConsentGranted() {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: config.googleAdsId ? 'granted' : 'denied',
      ad_user_data: config.googleAdsId ? 'granted' : 'denied',
      ad_personalization: config.googleAdsId ? 'granted' : 'denied'
    });
  }

  function loadGoogleTags() {
    var hasGoogleTag = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    var hasConfiguredDestination = function (id) {
      return window.dataLayer.some(function (entry) {
        return entry && entry[0] === 'config' && entry[1] === id;
      });
    };

    if (config.gtmId) {
      (function(w,d,s,l,i){
        w[l]=w[l]||[];
        w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0], j=d.createElement(s), dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;
        j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);
      })(window, document, 'script', 'dataLayer', config.gtmId);
      log('[tracking] GTM carregado', config.gtmId);
      return;
    }

    if (config.ga4Id) {
      if (!hasGoogleTag) {
        loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.ga4Id), 'ga4-gtag');
        hasGoogleTag = true;
      }
      if (!hasConfiguredDestination(config.ga4Id)) {
        window.gtag('js', new Date());
        window.gtag('config', config.ga4Id, {
          anonymize_ip: true,
          send_page_view: true
        });
      }
      log('[tracking] GA4 carregado', config.ga4Id);
    }

    if (config.googleAdsId) {
      if (!hasGoogleTag) {
        loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.googleAdsId), 'google-ads-gtag');
        hasGoogleTag = true;
      }
      if (!hasConfiguredDestination(config.googleAdsId)) {
        window.gtag('js', new Date());
        window.gtag('config', config.googleAdsId);
      }
      log('[tracking] Google Ads carregado', config.googleAdsId);
    }
  }

  function loadMetaPixel() {
    if (!config.metaPixelId || window.fbq) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', config.metaPixelId);
    window.fbq('track', 'PageView');
    log('[tracking] Meta Pixel carregado', config.metaPixelId);
  }

  function loadAllTags() {
    googleConsentGranted();
    loadGoogleTags();
    loadMetaPixel();
    window.dataLayer.push({ event: 'tracking_consent_granted' });
  }

  function injectConsentBanner() {
    if (!config.requireConsent || !hasAnyTag || getConsent()) return;

    var style = document.createElement('style');
    style.textContent = '\n.cookie-consent{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9999;max-width:760px;margin:0 auto;padding:18px 18px;background:#fffaf7;border:1px solid rgba(80,55,48,.18);box-shadow:0 20px 60px rgba(55,35,28,.18);border-radius:18px;color:#392720;font-size:14px;line-height:1.45}.cookie-consent strong{display:block;margin:0 0 5px;font-size:15px}.cookie-consent p{margin:0;color:rgba(57,39,32,.78)}.cookie-consent-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.cookie-consent button{border:1px solid rgba(80,55,48,.22);background:transparent;color:inherit;border-radius:999px;padding:9px 14px;font:inherit;cursor:pointer}.cookie-consent .accept{background:#51362f;color:#fff;border-color:#51362f}@media(max-width:760px){.cookie-consent{left:12px;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));font-size:13px}}\n';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferências de privacidade');
    banner.innerHTML = '<strong>Privacidade e mensuração</strong><p>Usamos cookies e tecnologias de mensuração para entender acessos ao site e melhorar a experiência. Não coletamos dados clínicos pelo site.</p><div class="cookie-consent-actions"><button class="accept" type="button">Aceitar mensuração</button><button class="reject" type="button">Continuar sem aceitar</button></div>';
    document.body.appendChild(banner);

    banner.querySelector('.accept').addEventListener('click', function () {
      setConsent('granted');
      banner.remove();
      loadAllTags();
    });

    banner.querySelector('.reject').addEventListener('click', function () {
      setConsent('denied');
      banner.remove();
      window.dataLayer.push({ event: 'tracking_consent_denied' });
    });
  }

  googleConsentDefault();

  document.addEventListener('DOMContentLoaded', function () {
    var consent = getConsent();
    if (!hasAnyTag) return;

    if (!config.requireConsent || consent === 'granted') {
      loadAllTags();
    } else if (consent === 'denied') {
      window.dataLayer.push({ event: 'tracking_consent_denied' });
    } else {
      injectConsentBanner();
    }
  });
})();
