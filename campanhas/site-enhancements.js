(function () {
  'use strict';

  var mobileQuery = window.matchMedia('(max-width: 760px)');
  var counter = 0;

  function context() {
    var root = document.documentElement;
    return {
      page_type: root.dataset.pageType || '',
      content_group: root.dataset.contentGroup || '',
      procedure: root.dataset.procedure || '',
      page_path: window.location.pathname
    };
  }

  function pushEvent(name, data) {
    // Mensuração comportamental desativada: somente cliques no WhatsApp são medidos.
  }

  function uniqueId(prefix) {
    counter += 1;
    return prefix + '-' + counter;
  }

  function createToggle(label, target, sectionName) {
    var button = document.createElement('button');
    var targetId = target.id || uniqueId('mobile-details');
    target.id = targetId;
    button.type = 'button';
    button.className = 'mobile-disclosure-toggle';
    button.textContent = label || 'Ver detalhes';
    button.setAttribute('aria-controls', targetId);
    button.setAttribute('aria-expanded', 'false');
    button.dataset.sectionName = sectionName || '';

    function setOpen(open, track) {
      target.classList.toggle('is-collapsed', !open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (track) {
        pushEvent(open ? 'mobile_details_open' : 'mobile_details_close', {
          section_name: button.dataset.sectionName || button.textContent.trim()
        });
      }
    }

    button.addEventListener('click', function () {
      setOpen(button.getAttribute('aria-expanded') !== 'true', true);
    });

    button._setMobileDisclosureOpen = setOpen;
    setOpen(false, false);
    return button;
  }

  function installSectionDisclosures() {
    document.querySelectorAll('section[data-mobile-collapse]').forEach(function (section) {
      if (section.dataset.mobileEnhanced === 'true') return;
      var container = section.querySelector(':scope > .container') || section;
      var head = container.querySelector(':scope > .section-head');
      if (!head) return;

      var nodes = [];
      var current = head.nextSibling;
      while (current) {
        var next = current.nextSibling;
        nodes.push(current);
        current = next;
      }
      if (!nodes.some(function (node) { return node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()); })) return;

      var panel = document.createElement('div');
      panel.className = 'mobile-disclosure-panel';
      nodes.forEach(function (node) { panel.appendChild(node); });

      var heading = head.querySelector('h2, h3');
      var sectionName = section.id || (heading ? heading.textContent.trim() : section.dataset.mobileCollapse);
      var previewFirst = section.classList.contains('contact-flow');
      var label = previewFirst ? 'Ver os próximos passos' : section.dataset.mobileCollapse;
      var button = createToggle(label, panel, sectionName);

      if (previewFirst) {
        panel.classList.add('mobile-preview-first');
        head.insertAdjacentElement('afterend', panel);
        panel.insertAdjacentElement('afterend', button);
      } else {
        head.insertAdjacentElement('afterend', button);
        button.insertAdjacentElement('afterend', panel);
      }
      section.dataset.mobileEnhanced = 'true';
    });
  }

  function installTargetDisclosures() {
    document.querySelectorAll('[data-mobile-collapse-target]').forEach(function (target) {
      if (target.dataset.mobileEnhanced === 'true') return;
      var label = target.dataset.mobileLabel || 'Ver detalhes';
      var section = target.closest('section');
      var heading = section && section.querySelector('h2, h3');
      var sectionName = (section && section.id) || (heading ? heading.textContent.trim() : label);
      var previewFirst = target.classList.contains('contact-flow-grid');
      var button = createToggle(previewFirst ? 'Ver os próximos passos' : label, target, sectionName);
      if (previewFirst) {
        target.classList.add('mobile-preview-first');
        target.insertAdjacentElement('afterend', button);
      } else {
        target.parentNode.insertBefore(button, target);
      }
      target.dataset.mobileEnhanced = 'true';
    });
  }

  function installScrollRows() {
    var floatResumeTimer;

    function pauseFloatingCta() {
      if (!mobileQuery.matches) return;
      document.body.classList.add('mobile-gallery-active');
      window.clearTimeout(floatResumeTimer);
      floatResumeTimer = window.setTimeout(function () {
        document.body.classList.remove('mobile-gallery-active');
      }, 1800);
    }

    document.querySelectorAll('[data-mobile-scroll]').forEach(function (row) {
      var shouldCarousel = row.classList.contains('result-grid');
      if (!shouldCarousel) {
        row.classList.add('mobile-static-grid');
        return;
      }
      if (row.dataset.mobileScrollEnhanced === 'true' || row.children.length < 2) return;
      row.classList.add('mobile-carousel');
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'region');
      row.setAttribute('aria-label', row.dataset.mobileScrollLabel || 'Opções relacionadas');
      var hint = document.createElement('span');
      hint.className = 'mobile-scroll-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'Deslize para ver mais →';
      row.parentNode.insertBefore(hint, row);
      row.dataset.mobileScrollEnhanced = 'true';

      var tracked = false;
      row.addEventListener('scroll', function () {
        pauseFloatingCta();
        if (!tracked && row.scrollLeft > 24) {
          tracked = true;
          pushEvent('mobile_horizontal_scroll', {
            section_name: row.dataset.mobileScrollLabel || 'Opções relacionadas'
          });
        }
      }, { passive: true });
      row.addEventListener('touchstart', pauseFloatingCta, { passive: true });
      row.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') pauseFloatingCta();
      }, { passive: true });
    });
  }

  function installMobileMenu() {
    var root = document.documentElement;
    var pageType = root.dataset.pageType || '';
    var isContentPage = window.location.pathname.indexOf('/conteudos/') !== -1;
    var enabled = pageType === 'home' || pageType === 'content-library' || isContentPage;
    if (!enabled) return;

    var header = document.querySelector('body > header');
    var navWrap = header && header.querySelector(':scope > .container.nav');
    var nav = navWrap && navWrap.querySelector(':scope > nav');
    if (!header || !navWrap || !nav || nav.dataset.mobileMenuEnhanced === 'true') return;

    var button = document.createElement('button');
    var navId = nav.id || uniqueId('mobile-site-menu');
    nav.id = navId;
    button.type = 'button';
    button.className = 'mobile-menu-toggle';
    button.setAttribute('aria-controls', navId);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Abrir menu');
    button.innerHTML = '<span aria-hidden="true"></span><span class="mobile-menu-label">Menu</span>';

    function setOpen(open) {
      header.classList.toggle('mobile-menu-open', open);
      document.body.classList.toggle('mobile-site-menu-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }

    button.addEventListener('click', function () {
      setOpen(button.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', function (event) {
      if (button.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
      setOpen(false);
      button.focus();
    });

    window.matchMedia('(min-width: 901px)').addEventListener('change', function (event) {
      if (event.matches) setOpen(false);
    });

    header.classList.add('mobile-menu-enabled');
    navWrap.insertBefore(button, nav);
    nav.dataset.mobileMenuEnhanced = 'true';
  }

  function disclosureForElement(element) {
    if (!element) return null;
    var panel = element.closest('.mobile-disclosure-panel, [data-mobile-collapse-target]');
    if (!panel) return null;
    return document.querySelector('.mobile-disclosure-toggle[aria-controls="' + panel.id + '"]');
  }

  function openForTarget(target) {
    var button = disclosureForElement(target);
    if (button && button._setMobileDisclosureOpen) button._setMobileDisclosureOpen(true, false);

    if (target && target.matches('section[data-mobile-collapse]')) {
      var sectionButton = target.querySelector(':scope .mobile-disclosure-toggle');
      if (sectionButton && sectionButton._setMobileDisclosureOpen) sectionButton._setMobileDisclosureOpen(true, false);
    }
  }

  function installAnchorAwareness() {
    function openCurrentHash() {
      if (!mobileQuery.matches || !window.location.hash) return;
      var id = decodeURIComponent(window.location.hash.slice(1));
      var target = document.getElementById(id);
      openForTarget(target);
    }

    document.addEventListener('click', function (event) {
      var anchor = event.target.closest('a[href*="#"]');
      if (!anchor || !mobileQuery.matches) return;
      try {
        var url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
        var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        openForTarget(target);
      } catch (e) {}
    });

    window.addEventListener('hashchange', openCurrentHash);
    window.setTimeout(openCurrentHash, 40);
  }

  function keepInternalLinksInSameTab() {
    document.querySelectorAll('a[target="_blank"]').forEach(function (anchor) {
      try {
        var url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin) {
          anchor.removeAttribute('target');
          anchor.removeAttribute('rel');
        }
      } catch (e) {}
    });
  }

  function trackInternalNavigation() {
    document.addEventListener('click', function (event) {
      var anchor = event.target.closest('a');
      if (!anchor) return;
      try {
        var url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
        pushEvent('internal_navigation_click', {
          destination_path: url.pathname,
          link_text: (anchor.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 100)
        });
      } catch (e) {}
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    keepInternalLinksInSameTab();
    installMobileMenu();
    installSectionDisclosures();
    installTargetDisclosures();
    installScrollRows();
    installAnchorAwareness();
    trackInternalNavigation();
  });
})();

/* CTA flutuante: aparece apenas depois do hero e nunca disputa espaço com consentimento. */
(function () {
  function installFloatingCtaBehavior() {
    var hero = document.querySelector('.hero, .content-hub-hero, .article-hero');
    var float = document.querySelector('.whatsapp-float');
    if (!float) return;

    function setVisible(visible) {
      document.body.classList.toggle('show-whatsapp-float', !!visible);
    }

    if (!hero || !('IntersectionObserver' in window)) {
      setVisible(window.scrollY > 520);
      window.addEventListener('scroll', function () { setVisible(window.scrollY > 520); }, { passive: true });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
        });
      }, { threshold: 0 });
      observer.observe(hero);
    }

    function syncCookieState() {
      document.body.classList.toggle('has-cookie-consent', !!document.querySelector('.cookie-consent'));
    }
    syncCookieState();
    new MutationObserver(syncCookieState).observe(document.body, { childList: true, subtree: false });

    if ('IntersectionObserver' in window && window.matchMedia('(max-width: 760px)').matches) {
      var visibleMedia = new Set();
      var mediaObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visibleMedia.add(entry.target);
          else visibleMedia.delete(entry.target);
        });
        document.body.classList.toggle('mobile-media-viewing', visibleMedia.size > 0);
      }, { threshold: [0, .35, .7] });

      document.querySelectorAll('.doctor-photo, .image-frame img, .liv-photo, .results-section, .result-grid, .result-card > img, .instagram-video-shell').forEach(function (media) {
        mediaObserver.observe(media);
      });
    }
  }
  document.addEventListener('DOMContentLoaded', installFloatingCtaBehavior);
})();


/* Vídeos curados: modal local, sem saída para Instagram. */
(function () {
  'use strict';

  function pushVideoEvent(name, data) {
    // Eventos de vídeo permanecem desativados por política de mensuração mínima.
  }

  function installCuratedVideoModal() {
    var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-curated-video]'));
    if (!triggers.length) return;

    var modal = document.createElement('div');
    modal.className = 'curated-video-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-labelledby', 'curated-video-title');
    modal.setAttribute('aria-describedby', 'curated-video-summary curated-video-disclaimer');
    modal.innerHTML = '<div class="curated-video-dialog"><button class="curated-video-close" type="button" aria-label="Fechar vídeo">×</button><div class="curated-video-media"><video controls playsinline preload="metadata"></video></div><div class="curated-video-copy"><span class="eyebrow">Conteúdo educativo</span><h2></h2><p class="curated-video-summary"></p><p class="disclaimer">O vídeo traz informação geral e não substitui avaliação médica individualizada.</p></div></div>';
    document.body.appendChild(modal);

    var video = modal.querySelector('video');
    var title = modal.querySelector('h2');
    var summary = modal.querySelector('.curated-video-summary');
    var close = modal.querySelector('.curated-video-close');
    var disclaimer = modal.querySelector('.disclaimer');
    var currentId = '';
    var sent = {};
    var lastFocus = null;

    title.id = 'curated-video-title';
    summary.id = 'curated-video-summary';
    disclaimer.id = 'curated-video-disclaimer';

    function getFocusableElements() {
      return Array.prototype.slice.call(modal.querySelectorAll(
        'a[href], button:not([disabled]), video[controls], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(function (element) {
        return element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true';
      });
    }

    function closeModal() {
      if (!modal.classList.contains('is-open')) return;
      video.pause();
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('curated-video-open');
      window.setTimeout(function () {
        video.removeAttribute('src');
        video.removeAttribute('poster');
        video.load();
      }, 80);
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        lastFocus = trigger;
        currentId = trigger.dataset.contentId || '';
        sent = {};
        title.textContent = trigger.dataset.videoTitle || 'Conteúdo educativo';
        summary.textContent = trigger.dataset.videoSummary || '';
        video.poster = trigger.dataset.videoPoster || '';
        video.src = trigger.dataset.videoSrc || '';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('curated-video-open');
        close.focus();
        pushVideoEvent('native_video_open', { content_id: currentId });
      });
    });

    video.addEventListener('play', function () {
      if (sent.start) return;
      sent.start = true;
      pushVideoEvent('video_start', { content_id: currentId });
    });

    video.addEventListener('timeupdate', function () {
      if (!video.duration) return;
      var percent = Math.round((video.currentTime / video.duration) * 100);
      [25, 50, 75, 90].forEach(function (mark) {
        if (percent >= mark && !sent[mark]) {
          sent[mark] = true;
          pushVideoEvent('video_progress', { content_id: currentId, video_percent: mark });
        }
      });
    });

    video.addEventListener('ended', function () {
      pushVideoEvent('video_complete', { content_id: currentId });
    });
    close.addEventListener('click', closeModal);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (event) {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;

      var focusable = getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        close.focus();
        return;
      }

      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var focusIsOutside = !modal.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    });
  }

document.addEventListener('DOMContentLoaded', installCuratedVideoModal);
})();


/* Navegação contextual: preserva a página que iniciou a jornada nesta aba. */
(function () {
  'use strict';

  var storageKey = 'amanda_journey_origin_v1';
  var pageLabels = {
    '/': 'página inicial',
    '/lifting-facial/': 'Lifting facial',
    '/lifting-cervical/': 'Lifting cervical',
    '/blefaroplastia/': 'Blefaroplastia',
    '/lipo-de-papada/': 'Lipo de papada',
    '/mama/': 'Cirurgia de mama',
    '/mastopexia/': 'Mastopexia',
    '/mastopexia-com-protese/': 'Mastopexia com prótese',
    '/mamoplastia-redutora/': 'Mamoplastia redutora',
    '/protese-de-mama/': 'Prótese de mama',
    '/contorno-corporal/': 'Contorno corporal',
    '/abdominoplastia/': 'Abdominoplastia',
    '/lipoaspiracao/': 'Lipoaspiração',
    '/pos-bariatrica/': 'Cirurgia pós-bariátrica',
    '/ninfoplastia/': 'Ninfoplastia',
    '/otoplastia/': 'Otoplastia',
    '/injetaveis/': 'Tratamentos injetáveis',
    '/conteudos/': 'Conteúdos'
  };

  function normalizePath(pathname) {
    var path = pathname || '/';
    path = path.replace(/\/index\.html$/i, '/');
    if (path.charAt(0) !== '/') path = '/' + path;
    if (path !== '/' && path.charAt(path.length - 1) !== '/') path += '/';
    return path;
  }

  function safeUrl(value) {
    try {
      return new URL(value, window.location.href);
    } catch (error) {
      return null;
    }
  }

  function isSameSite(url) {
    return url && url.origin === window.location.origin;
  }

  function homeUrl() {
    var brand = document.querySelector('a.brand');
    var brandUrl = brand && safeUrl(brand.getAttribute('href'));
    return brandUrl || safeUrl('/');
  }

  function isHome(url) {
    var home = homeUrl();
    return Boolean(url && home && normalizePath(url.pathname) === normalizePath(home.pathname));
  }

  function shorten(text, limit) {
    var clean = (text || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
    if (clean.length <= limit) return clean;
    return clean.slice(0, limit - 1).replace(/\s+\S*$/, '') + '…';
  }

  function currentPageLabel(url) {
    var path = normalizePath(url.pathname);
    if (pageLabels[path]) return pageLabels[path];
    if (path.indexOf('/conteudos/') === 0) return 'conteúdo inicial';

    var breadcrumbItems = document.querySelectorAll('.breadcrumb span:not(.sep)');
    var breadcrumbLabel = breadcrumbItems.length ? breadcrumbItems[breadcrumbItems.length - 1].textContent : '';
    var heading = document.querySelector('main h1, h1');
    return shorten(breadcrumbLabel || (heading && heading.textContent) || 'página de entrada', 46);
  }

  function makeOrigin(url) {
    var cleanUrl = new URL(url.href);
    cleanUrl.hash = '';
    return {
      url: cleanUrl.href,
      path: normalizePath(cleanUrl.pathname),
      label: currentPageLabel(cleanUrl)
    };
  }

  function readOrigin() {
    try {
      var stored = JSON.parse(window.sessionStorage.getItem(storageKey));
      var url = stored && safeUrl(stored.url);
      if (!stored || !isSameSite(url) || !stored.path || !stored.label) return null;
      stored.path = normalizePath(url.pathname);
      stored.url = url.href;
      return stored;
    } catch (error) {
      return null;
    }
  }

  function saveOrigin(origin) {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(origin));
    } catch (error) {
      // A navegação principal continua funcionando se o armazenamento estiver indisponível.
    }
  }

  function journeyStartedHere() {
    if (!document.referrer) return true;
    var referrer = safeUrl(document.referrer);
    return !isSameSite(referrer);
  }

  function installJourneyReturn() {
    var currentUrl = safeUrl(window.location.href);
    if (!currentUrl) return;

    var origin = readOrigin();
    if (!origin || journeyStartedHere()) {
      var initialUrl = normalizePath(currentUrl.pathname) === '/privacidade/' ? homeUrl() : currentUrl;
      origin = makeOrigin(initialUrl || currentUrl);
      saveOrigin(origin);
    }

    if (origin.path === normalizePath(currentUrl.pathname)) return;

    var originUrl = safeUrl(origin.url);
    if (!isSameSite(originUrl)) return;

    var nav = document.createElement('nav');
    nav.className = 'journey-return';
    nav.setAttribute('aria-label', 'Retorno à página que iniciou sua navegação');

    var inner = document.createElement('div');
    inner.className = 'container journey-return-inner';

    var returnLink = document.createElement('a');
    returnLink.className = 'journey-return-link';
    returnLink.href = origin.url;
    returnLink.innerHTML = '<span class="journey-return-arrow" aria-hidden="true">←</span><span><small>Sua página de entrada</small><strong></strong></span>';
    returnLink.querySelector('strong').textContent = isHome(originUrl) ? 'Voltar à página inicial' : 'Voltar para ' + origin.label;
    inner.appendChild(returnLink);

    var home = homeUrl();
    if (home && !isHome(originUrl) && !isHome(currentUrl)) {
      var homeLink = document.createElement('a');
      homeLink.className = 'journey-home-link';
      homeLink.href = home.href;
      homeLink.textContent = 'Ir à página inicial';
      inner.appendChild(homeLink);
    }

    nav.appendChild(inner);
    var breadcrumb = document.querySelector('.breadcrumb');
    var header = document.querySelector('header');
    var anchor = breadcrumb || header;
    if (anchor) anchor.insertAdjacentElement('afterend', nav);
  }

  document.addEventListener('DOMContentLoaded', installJourneyReturn);
})();
