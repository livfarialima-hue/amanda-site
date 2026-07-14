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

  function integrateDoctorStoryOnMobile() {
    var section = document.getElementById('video-amanda');
    var doctorCard = document.querySelector('#quem-conduz .doctor-card');
    if (!section || !doctorCard || section.dataset.doctorStoryReady === 'true') return;

    var head = section.querySelector(':scope > .container > .section-head');
    var toggle = section.querySelector('.mobile-disclosure-toggle');
    var panel = section.querySelector('.mobile-disclosure-panel');
    if (!head || !toggle || !panel) return;

    function sync(event) {
      var mobile = typeof event.matches === 'boolean' ? event.matches : mobileQuery.matches;
      if (mobile) {
        toggle.classList.add('doctor-story-toggle');
        panel.classList.add('doctor-story-panel');
        doctorCard.appendChild(toggle);
        doctorCard.appendChild(panel);
        section.classList.add('doctor-story-integrated');
      } else {
        head.insertAdjacentElement('afterend', toggle);
        toggle.insertAdjacentElement('afterend', panel);
        toggle.classList.remove('doctor-story-toggle');
        panel.classList.remove('doctor-story-panel');
        section.classList.remove('doctor-story-integrated');
      }
    }

    sync(mobileQuery);
    mobileQuery.addEventListener('change', sync);
    section.dataset.doctorStoryReady = 'true';
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
      hint.textContent = 'Deslize para ver mais resultados';
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

  function installAuxiliaryResultCarousels() {
    var pageType = document.documentElement.dataset.pageType || '';
    if (pageType === 'home') return;

    var selectors = [
      '.result-grid',
      '.lf2-results-grid',
      '.lc2-results-grid',
      '.lc2-real-results-grid',
      '.bf2-results-grid',
      '.lp2-results-grid',
      '.ot2-results-grid',
      '.ota2-results-grid',
      '.oti2-results-grid'
    ].join(',');

    document.querySelectorAll([
      '.result-card img',
      '.lf2-result-card img',
      '.lc2-result-card img',
      '.bf2-result-card img',
      '.lp2-result-card img',
      '.ot2-result-card img',
      '.ota2-result-card img',
      '.oti2-result-card img',
      '.clinic-photo img',
      '.liv-photo img',
      '.lf2-clinic-photo img',
      '.lc2-clinic-photo img',
      '.bf2-clinic-photo img',
      '.lp2-clinic-photo img',
      '.ot2-clinic-photo img',
      '.ota2-clinic-photo img',
      '.oti2-clinic-photo img'
    ].join(',')).forEach(function (image) {
      var width = Number(image.getAttribute('width'));
      var height = Number(image.getAttribute('height'));
      if (width > 0 && height > 0) {
        image.style.setProperty('--auxiliary-image-ratio', width + ' / ' + height);
        image.style.setProperty('aspect-ratio', width + ' / ' + height, 'important');
      }
      image.style.setProperty('height', 'auto', 'important');
      image.style.setProperty('max-height', 'none', 'important');
      image.style.setProperty('object-fit', 'contain', 'important');
      image.style.setProperty('object-position', 'center', 'important');
    });

    document.querySelectorAll(selectors).forEach(function (row) {
      if (row.matches('[data-carousel]')) return;
      if (row.dataset.auxiliaryCarouselEnhanced === 'true') return;
      var cards = row.querySelectorAll(':scope > article, :scope > figure');
      if (cards.length < 2) return;

      row.classList.add('auxiliary-results-carousel');
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'region');
      row.setAttribute('aria-label', 'Resultados; deslize horizontalmente para ver mais');

      if (!row.previousElementSibling || !row.previousElementSibling.classList.contains('auxiliary-scroll-hint')) {
        var hint = document.createElement('span');
        hint.className = 'auxiliary-scroll-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = 'Deslize para ver mais resultados';
        row.parentNode.insertBefore(hint, row);
      }

      row.dataset.auxiliaryCarouselEnhanced = 'true';
    });
  }

  function installMobileMenu() {
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

    var updateCompactHeader = function () {
      header.classList.toggle('mobile-header-condensed', window.scrollY > 32);
    };
    window.addEventListener('scroll', updateCompactHeader, { passive: true });
    updateCompactHeader();
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

  function installImageLightbox() {
    var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-image-lightbox]'));
    if (!triggers.length) return;

    var modal = document.createElement('div');
    modal.className = 'image-lightbox';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-label', 'Imagem ampliada');
    modal.innerHTML = '<div class="image-lightbox-dialog"><button class="image-lightbox-close" type="button" aria-label="Fechar imagem ampliada">×</button><img alt=""></div>';
    document.body.appendChild(modal);

    var image = modal.querySelector('img');
    var closeButton = modal.querySelector('.image-lightbox-close');
    var lastFocus = null;

    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('image-lightbox-open');
      image.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        var preview = trigger.querySelector('img');
        lastFocus = trigger;
        image.src = trigger.href;
        image.alt = preview ? preview.alt : 'Imagem ampliada';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('image-lightbox-open');
        closeButton.focus();
      });
    });

    closeButton.addEventListener('click', close);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  function installDetailedFooterMap() {
    var navigation = document.querySelector('footer .footer-navigation');
    if (!navigation || navigation.dataset.sitemapEnhanced === 'true') return;

    navigation.setAttribute('aria-label', 'Mapa do site');
    navigation.classList.remove('footer-navigation-compact');
    navigation.innerHTML = '' +
      '<div class="footer-nav-group"><strong>Face e pescoço</strong>' +
        '<a href="/lifting-facial/">Lifting facial</a><a href="/lifting-cervical/">Lifting cervical</a><a href="/blefaroplastia/">Blefaroplastia</a><a href="/otoplastia/">Otoplastia</a><a href="/lipo-de-papada/">Lipo de papada</a><a href="/injetaveis/">Injetáveis</a>' +
      '</div>' +
      '<div class="footer-nav-group"><strong>Mamas</strong>' +
        '<a href="/mama/">Cirurgias de mama</a><a href="/mastopexia/">Mastopexia</a><a href="/mastopexia-com-protese/">Mastopexia com prótese</a><a href="/protese-de-mama/">Prótese de mama</a><a href="/mamoplastia-redutora/">Mamoplastia redutora</a>' +
      '</div>' +
      '<div class="footer-nav-group"><strong>Corpo e cirurgia íntima</strong>' +
        '<a href="/contorno-corporal/">Contorno corporal</a><a href="/abdominoplastia/">Abdominoplastia</a><a href="/lipoaspiracao/">Lipoaspiração</a><a href="/pos-bariatrica/">Pós-bariátrica</a><a href="/ninfoplastia/">Cirurgia íntima</a>' +
      '</div>' +
      '<div class="footer-nav-group footer-nav-group-compact"><strong>Conteúdos</strong><a href="/conteudos/">Conteúdos educativos</a></div>';
    var exploreGroup = navigation.querySelector('.footer-nav-group-compact');
    if (exploreGroup) {
      var exploreTitle = exploreGroup.querySelector('strong');
      if (exploreTitle) exploreTitle.textContent = 'Explore';
      var proceduresLink = document.createElement('a');
      proceduresLink.href = '/procedimentos/';
      proceduresLink.textContent = 'Todos os procedimentos';
      exploreGroup.insertBefore(proceduresLink, exploreGroup.querySelector('a'));
    }
    navigation.dataset.sitemapEnhanced = 'true';
  }

  document.addEventListener('DOMContentLoaded', function () {
    keepInternalLinksInSameTab();
    installMobileMenu();
    installSectionDisclosures();
    integrateDoctorStoryOnMobile();
    installTargetDisclosures();
    installScrollRows();
    installAuxiliaryResultCarousels();
    installAnchorAwareness();
    trackInternalNavigation();
    installImageLightbox();
    installDetailedFooterMap();
  });
})();

/* Sistema comum para páginas auxiliares de mama e contorno corporal. */
(function () {
  'use strict';

  var pages = {
    'mastopexia': {
      suppressResults: true,
      contents: [
        ['Cirurgias de mama', 'Compare as possibilidades antes de decidir a técnica.', '../mama/'],
        ['Queda e volume', 'Mastopexia com prótese: quando a associação entra na conversa.', '../mastopexia-com-protese/'],
        ['Volume e proporção', 'Prótese de mama: medidas e objetivos antes dos mililitros.', '../protese-de-mama/']
      ]
    },
    'mastopexia-com-protese': {
      suppressResults: true,
      contents: [
        ['Queda sem implante', 'Mastopexia: quando o volume existente pode ser suficiente.', '../mastopexia/'],
        ['Cirurgias de mama', 'Compare queda, volume, cicatriz e proporção.', '../mama/'],
        ['Volume e proporção', 'Prótese de mama: o que o implante busca resolver.', '../protese-de-mama/']
      ]
    },
    'protese-de-mama': {
      suppressResults: true,
      contents: [
        ['Queda e remodelação', 'Mastopexia: quando elevar a mama faz parte da decisão.', '../mastopexia/'],
        ['Cirurgias de mama', 'Compare as possibilidades antes de escolher uma técnica.', '../mama/'],
        ['Peso e proporção', 'Mamoplastia redutora: conforto, volume e cicatriz.', '../mamoplastia-redutora/']
      ]
    },
    'mamoplastia-redutora': {
      suppressResults: true,
      contents: [
        ['Cirurgias de mama', 'Compare redução, mastopexia, prótese e associações.', '../mama/'],
        ['Queda e remodelação', 'Mastopexia: o que muda quando a queixa é principalmente queda.', '../mastopexia/'],
        ['Queda e volume', 'Mastopexia com prótese: uma associação para casos selecionados.', '../mastopexia-com-protese/']
      ]
    },
    'contorno-corporal': {
      suppressResults: true,
      contents: [
        ['Pele e parede abdominal', 'Abdominoplastia: o que pode ser avaliado no abdome.', '../abdominoplastia/'],
        ['Gordura localizada', 'Lipoaspiração: limites e quando a pele muda a indicação.', '../lipoaspiracao/'],
        ['Após grande perda de peso', 'Cirurgia pós-bariátrica: prioridades, etapas e recuperação.', '../pos-bariatrica/']
      ]
    },
    'abdominoplastia': {
      contents: [
        ['Contorno corporal', 'Entenda como gordura, pele e parede abdominal mudam o plano.', '../contorno-corporal/'],
        ['Gordura localizada', 'Lipoaspiração: quando pode complementar ou não o tratamento.', '../lipoaspiracao/'],
        ['Após grande perda de peso', 'Cirurgia pós-bariátrica: planejamento por prioridades.', '../pos-bariatrica/']
      ]
    },
    'lipoaspiracao': {
      contents: [
        ['Contorno corporal', 'Compare gordura localizada, pele e parede abdominal.', '../contorno-corporal/'],
        ['Pele e abdome', 'Abdominoplastia: quando a retirada de pele entra na conversa.', '../abdominoplastia/'],
        ['Braços', 'Braquioplastia: quando a queixa é excesso de pele.', '../braquioplastia/']
      ]
    },
    'pos-bariatrica': {
      contents: [
        ['Contorno corporal', 'Entenda como as prioridades são organizadas por região.', '../contorno-corporal/'],
        ['Pele e abdome', 'Abdominoplastia: uma das possibilidades após perda importante de peso.', '../abdominoplastia/'],
        ['Braços', 'Braquioplastia: quando a pele dos braços permanece como queixa.', '../braquioplastia/']
      ]
    },
    'braquioplastia': {
      contents: [
        ['Após grande perda de peso', 'Cirurgia pós-bariátrica: prioridades, etapas e recuperação.', '../pos-bariatrica/'],
        ['Contorno corporal', 'Pele, gordura e proporção em uma avaliação integrada.', '../contorno-corporal/'],
        ['Gordura localizada', 'Lipoaspiração: quando pode ou não ser suficiente.', '../lipoaspiracao/']
      ]
    }
  };

  function carouselControls(row) {
    if (!row || row.dataset.auxiliaryCarouselReady === 'true') return;
    var controls = document.createElement('div');
    controls.className = 'auxiliary-carousel-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Controles do carrossel');
    controls.innerHTML = '<button type="button" aria-label="Conteúdo anterior">←</button><button type="button" aria-label="Próximo conteúdo">→</button>';
    row.insertAdjacentElement('afterend', controls);

    var previous = controls.querySelector('button:first-child');
    var next = controls.querySelector('button:last-child');
    function update() {
      var first = row.firstElementChild;
      var last = row.lastElementChild;
      var bounds = row.getBoundingClientRect();
      var atStart = !first || first.getBoundingClientRect().left >= bounds.left - 4;
      var atEnd = !last || last.getBoundingClientRect().right <= bounds.right + 4;
      previous.disabled = atStart;
      next.disabled = atEnd;
      next.classList.toggle('is-end', atEnd);
    }
    previous.addEventListener('click', function () { row.scrollBy({ left: -Math.min(row.clientWidth * .86, 330), behavior: 'smooth' }); });
    next.addEventListener('click', function () { row.scrollBy({ left: Math.min(row.clientWidth * .86, 330), behavior: 'smooth' }); });
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    row.dataset.auxiliaryCarouselReady = 'true';
    window.setTimeout(update, 0);
  }

  function normalizeCtas(main) {
    var navCta = document.querySelector('.nav-cta[data-track="whatsapp"]');
    var heroCta = main.querySelector('.hero-actions a[data-track="whatsapp"]');
    var floating = document.querySelector('.whatsapp-float[data-track="whatsapp"]');
    var finalCta = main.querySelector('.cta a[data-track="whatsapp"]');
    if (navCta) { navCta.textContent = 'Falar com a equipe'; navCta.dataset.ctaLocation = 'header'; }
    if (heroCta) { heroCta.textContent = 'Falar com a equipe'; heroCta.dataset.ctaLocation = 'hero'; }
    if (floating) { floating.textContent = 'Falar com a equipe'; floating.dataset.ctaLocation = 'floating'; floating.setAttribute('aria-label', 'Falar com a equipe pelo WhatsApp'); }
    if (finalCta) { finalCta.textContent = 'Agendar avaliação'; finalCta.dataset.ctaLocation = 'final_cta'; }
    main.querySelectorAll('.hero-actions .ghost').forEach(function (link) { link.hidden = true; });
    document.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
      if (link.dataset.ctaLocation) return;
      var section = link.closest('section');
      link.dataset.ctaLocation = section && (section.dataset.section || section.id) || 'page';
    });
  }

  function buildSections(main, config) {
    if (main.querySelector('#auxiliary-team')) return;
    var anchor = main.querySelector('#faq') || main.querySelector('.cta');
    if (!anchor) return;

    var team = document.createElement('section');
    team.className = 'auxiliary-team-section';
    team.id = 'auxiliary-team';
    team.innerHTML = '<div class="container"><div class="section-head"><span class="eyebrow">Equipe e ambiente cirúrgico</span><h2>O cuidado é planejado por uma equipe, não apenas por uma técnica.</h2><p>Dra. Amanda com parte de sua equipe cirúrgica. Ambiente, anestesia e composição da equipe são organizados conforme o plano e as necessidades de cada caso.</p></div><div class="auxiliary-team-carousel" aria-label="Equipe e ambiente cirúrgico"><figure class="auxiliary-team-card auxiliary-team-card--video"><video aria-label="Dra. Amanda em ambiente cirúrgico" controls controlslist="nodownload" muted playsinline poster="../campanhas/assets/amanda-operando.jpg" preload="metadata"><source src="../campanhas/assets/equipe/amanda-operando-centro-cirurgico.mp4" type="video/mp4"></video><figcaption>Dra. Amanda em centro cirúrgico.</figcaption></figure><figure class="auxiliary-team-card"><img src="../campanhas/assets/blefaroplastia/equipe-cirurgica-01.jpg" alt="Dra. Amanda com parte de sua equipe cirúrgica" loading="lazy" decoding="async"><figcaption>Parte da equipe cirúrgica que participa do cuidado em casos selecionados.</figcaption></figure></div><p class="auxiliary-hospital-note">Quando indicado, o procedimento pode ser realizado no Hospital Sírio-Libanês, Hospital Nove de Julho, Hospital Oswaldo Cruz ou em outra instituição criteriosamente selecionada.</p></div>';

    var contents = document.createElement('section');
    contents.className = 'auxiliary-content-section';
    contents.id = 'conteudos';
    var cards = config.contents.map(function (item) {
      return '<a class="auxiliary-content-card" href="' + item[2] + '"><span>' + item[0] + '</span><strong>' + item[1] + '</strong><em>Entender melhor →</em></a>';
    }).join('');
    contents.innerHTML = '<div class="container"><div class="section-head"><span class="eyebrow">Conteúdos selecionados</span><h2>Escolha a pergunta que mais ajuda a sua decisão.</h2><p>As páginas relacionadas aprofundam alternativas sem antecipar a indicação antes do exame.</p></div><div class="auxiliary-content-grid">' + cards + '</div></div>';

    var clinic = document.createElement('section');
    clinic.className = 'auxiliary-clinic-section';
    clinic.id = 'clinica-liv';
    clinic.innerHTML = '<div class="container auxiliary-clinic-grid"><div><span class="eyebrow">Clínica LIV Faria Lima</span><h2>Consulta particular com privacidade para conversar e decidir.</h2><p>A consulta acontece em Pinheiros, com espaço para entender a queixa, examinar as estruturas envolvidas e discutir possibilidades, cicatrizes, recuperação e próximos passos.</p><p class="auxiliary-clinic-address">R. Pais Leme, 215 — cj. 710 — Pinheiros, São Paulo · Nota fiscal para reembolso.</p></div><div class="auxiliary-clinic-media"><img src="../campanhas/assets/amanda-clinica-consultorio-desktop.webp" alt="Dra. Amanda Schroeder no consultório da Clínica LIV Faria Lima" loading="lazy" decoding="async"><button type="button" class="auxiliary-clinic-video" data-curated-video data-content-id="clinica-liv-apresentacao" data-video-disclaimer="" data-video-eyebrow="Clínica LIV Faria Lima" data-video-title="Conheça a Clínica LIV Faria Lima" data-video-summary="Um passeio breve pelo prédio e pelos ambientes de atendimento da Clínica LIV Faria Lima, em Pinheiros." data-video-poster="../campanhas/assets/amanda-clinica-consultorio-desktop.webp" data-video-src="../campanhas/assets/video-apresentacao-clinica-liv.mp4"><span aria-hidden="true">▶</span><span><strong>Conheça a Clínica LIV</strong><small>Veja o prédio e os ambientes de atendimento</small></span></button></div></div>';

    anchor.insertAdjacentElement('beforebegin', team);
    anchor.insertAdjacentElement('beforebegin', contents);
    anchor.insertAdjacentElement('beforebegin', clinic);
    carouselControls(team.querySelector('.auxiliary-team-carousel'));
  }

  function refineResults(main, config) {
    var results = main.querySelector('#resultados');
    var resultsNav = document.querySelector('nav a[href="#resultados"]');
    if (config.suppressResults && results) {
      results.hidden = true;
      if (resultsNav) resultsNav.remove();
      return;
    }
    if (results && document.documentElement.dataset.procedure === 'abdominoplastia') {
      var head = results.querySelector('.section-head');
      if (head) {
        var title = head.querySelector('h2');
        var text = head.querySelector('p');
        if (title) title.textContent = 'Um caso combinado de mama e abdome para orientar a leitura — não para prometer uma técnica isolada.';
        if (text) text.textContent = 'Este caso reúne procedimentos de mama e abdome. As imagens ajudam a observar contorno e proporção, mas a indicação e a evolução variam de pessoa para pessoa.';
      }
      var disclaimer = results.querySelector('.disclaimer');
      if (disclaimer) disclaimer.textContent = 'Caso real autorizado de cirurgia combinada de mama e abdome. As imagens não garantem resultado semelhante: anatomia, indicação, cicatrização e cuidados influenciam a evolução. Riscos e possibilidade de revisão são discutidos na consulta.';
    }
  }

  function install() {
    var procedure = document.documentElement.dataset.procedure || '';
    var config = pages[procedure];
    if (!config) return;
    var main = document.querySelector('main');
    if (!main) return;
    document.documentElement.dataset.auxiliaryStandard = 'true';
    normalizeCtas(main);
    refineResults(main, config);
    buildSections(main, config);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
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
    var triggers = [];

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
    var eyebrow = modal.querySelector('.eyebrow');
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
        eyebrow.textContent = trigger.dataset.videoEyebrow || 'Conteúdo educativo';
        if (trigger.hasAttribute('data-video-disclaimer')) {
          disclaimer.textContent = trigger.dataset.videoDisclaimer || '';
          disclaimer.hidden = !trigger.dataset.videoDisclaimer;
        } else {
          disclaimer.textContent = 'O vídeo traz informação geral e não substitui avaliação médica individualizada.';
          disclaimer.hidden = false;
        }
        video.poster = trigger.dataset.videoPoster || '';
        video.src = trigger.dataset.videoSrc || '';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('curated-video-open');
        close.focus();
        pushVideoEvent('native_video_open', { content_id: currentId });
      });
    });

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest && event.target.closest('[data-curated-video]');
      if (!trigger || !document.body.contains(trigger)) return;
      event.preventDefault();
      lastFocus = trigger;
      currentId = trigger.dataset.contentId || '';
      sent = {};
      title.textContent = trigger.dataset.videoTitle || 'Conteúdo educativo';
      summary.textContent = trigger.dataset.videoSummary || '';
      eyebrow.textContent = trigger.dataset.videoEyebrow || 'Conteúdo educativo';
      if (trigger.hasAttribute('data-video-disclaimer')) {
        disclaimer.textContent = trigger.dataset.videoDisclaimer || '';
        disclaimer.hidden = !trigger.dataset.videoDisclaimer;
      } else {
        disclaimer.textContent = 'O vídeo traz informação geral e não substitui avaliação médica individualizada.';
        disclaimer.hidden = false;
      }
      video.poster = trigger.dataset.videoPoster || '';
      video.src = trigger.dataset.videoSrc || '';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('curated-video-open');
      close.focus();
      pushVideoEvent('native_video_open', { content_id: currentId });
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


/* No mobile, qualquer vídeo editorial vira um botão que abre o visualizador em tela cheia. */
(function () {
  'use strict';

  var defaultVideoPoster = '/campanhas/assets/blefaroplastia/equipe-cirurgica-01.jpg';
  var amandaVideoPoster = '/campanhas/assets/amanda-operando.jpg';

  function installVideoPosters() {
    var procedure = document.documentElement.dataset.procedure || '';
    if (document.documentElement.dataset.auxiliaryStandard !== 'true' && procedure !== 'mama') return;
    document.querySelectorAll('video:not([poster])').forEach(function (video) {
      if (video.closest('.curated-video-modal')) return;
      var label = (video.getAttribute('aria-label') || '').toLowerCase();
      video.setAttribute('poster', label.indexOf('amanda') !== -1 ? amandaVideoPoster : defaultVideoPoster);
    });
  }

  function getVideoSource(video) {
    var source = video.getAttribute('src') || '';
    if (!source) {
      var sourceNode = video.querySelector('source[src]');
      source = sourceNode ? sourceNode.getAttribute('src') : '';
    }
    return source;
  }

  function getVideoTitle(video) {
    var label = video.getAttribute('aria-label');
    if (label) return label;
    var heading = video.parentElement && video.parentElement.querySelector('h3, h4');
    if (heading) return heading.textContent.trim();
    var caption = video.parentElement && video.parentElement.querySelector('figcaption');
    return caption ? caption.textContent.trim() : 'Vídeo educativo';
  }

  function installMobileVideoTriggers() {
    installVideoPosters();
    document.querySelectorAll('video:not([data-mobile-video-enhanced])').forEach(function (video, index) {
      if (video.closest('.curated-video-modal')) return;
      var source = getVideoSource(video);
      if (!source) return;

      var titleText = getVideoTitle(video);
      var container = video.closest('article, figure, .article-media, section') || video.parentElement;
      var heading = container && container.querySelector('h3, h4');
      var summaryNode = container && container.querySelector('p, figcaption');
      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'mobile-curated-video-trigger';
      trigger.setAttribute('aria-label', 'Assistir ao vídeo: ' + titleText);
      trigger.dataset.curatedVideo = '';
      trigger.dataset.contentId = 'mobile-video-' + (index + 1);
      trigger.dataset.videoEyebrow = 'Conteúdo educativo';
      trigger.dataset.videoTitle = titleText;
      trigger.dataset.videoSummary = summaryNode ? summaryNode.textContent.trim() : (heading ? heading.textContent.trim() : '');
      trigger.dataset.videoSrc = source;
      if (video.getAttribute('poster')) trigger.dataset.videoPoster = video.getAttribute('poster');
      if (video.getAttribute('poster')) {
        trigger.classList.add('has-video-poster');
        trigger.style.setProperty('--mobile-video-poster', 'url("' + video.getAttribute('poster') + '")');
      }
      trigger.innerHTML = '<span class="mobile-curated-video-trigger-media"><span class="mobile-curated-video-play" aria-hidden="true">▶</span><span>Assistir ao vídeo</span></span>';
      video.setAttribute('data-mobile-video-enhanced', 'true');
      video.parentNode.insertBefore(trigger, video);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    installMobileVideoTriggers();
    new MutationObserver(installMobileVideoTriggers).observe(document.body, { childList: true, subtree: true });
  });
})();


/* Navegação contextual: preserva a página que iniciou a jornada nesta aba. */
(function () {
  'use strict';

  var storageKey = 'amanda_journey_origin_v1';
  var returnPendingKey = 'amanda_journey_return_pending_v1';
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

  function installJourneyPositionMemory() {
    document.addEventListener('click', function (event) {
      var anchor = event.target.closest('a[href]');
      if (!anchor || anchor.classList.contains('journey-return-link')) return;

      var destination = safeUrl(anchor.href);
      var currentUrl = safeUrl(window.location.href);
      var origin = readOrigin();
      if (!destination || !currentUrl || !origin || !isSameSite(destination)) return;
      if (normalizePath(currentUrl.pathname) !== origin.path || normalizePath(destination.pathname) === origin.path) return;

      origin.sourcePath = normalizePath(destination.pathname);
      origin.sourceText = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
      origin.sourceScrollY = Math.max(0, Math.round(window.scrollY + anchor.getBoundingClientRect().top - 96));
      saveOrigin(origin);
    });
  }

  function restoreJourneyPosition() {
    var pending = false;
    try {
      pending = window.sessionStorage.getItem(returnPendingKey) === 'true';
      if (pending) window.sessionStorage.removeItem(returnPendingKey);
    } catch (error) {}
    if (!pending) return;

    var currentUrl = safeUrl(window.location.href);
    var origin = readOrigin();
    if (!currentUrl || !origin || normalizePath(currentUrl.pathname) !== origin.path) return;

    window.setTimeout(function () {
      var source = null;
      if (origin.sourcePath) {
        source = Array.prototype.find.call(document.querySelectorAll('a[href]'), function (anchor) {
          var url = safeUrl(anchor.href);
          var text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
          return url && normalizePath(url.pathname) === origin.sourcePath && (!origin.sourceText || text === origin.sourceText);
        });
      }

      if (source) {
        source.scrollIntoView({ behavior: 'auto', block: 'center' });
        source.focus({ preventScroll: true });
      } else if (typeof origin.sourceScrollY === 'number') {
        window.scrollTo({ top: origin.sourceScrollY, behavior: 'auto' });
      }
    }, 100);
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
    returnLink.addEventListener('click', function () {
      try { window.sessionStorage.setItem(returnPendingKey, 'true'); } catch (error) {}
    });
    inner.appendChild(returnLink);

    nav.appendChild(inner);
    var breadcrumb = document.querySelector('.breadcrumb');
    var header = document.querySelector('header');
    var anchor = breadcrumb || header;
    if (anchor) anchor.insertAdjacentElement('afterend', nav);
  }

  function installFaceFocusPositioning() {
    var procedure = document.documentElement.getAttribute('data-procedure');
    var messages = {
      'lifting-facial': {
        eyebrow: 'Cirurgia plástica com foco principal na face · Lifting facial',
        text: 'A avaliação integra face, olhar e pescoço para entender a causa da queixa e decidir se cirurgia, tratamento complementar ou acompanhamento fazem sentido.'
      },
      'lifting-cervical': {
        eyebrow: 'Cirurgia plástica com foco principal na face · Pescoço e contorno',
        text: 'Pescoço e linha mandibular são avaliados em conjunto com a face para diferenciar pele, gordura, músculos e estrutura antes de indicar uma técnica.'
      },
      blefaroplastia: {
        eyebrow: 'Cirurgia plástica com foco principal na face · Blefaroplastia',
        text: 'A avaliação do olhar não se limita às pálpebras: sobrancelhas, volume, pele e expressão são considerados dentro do conjunto facial.'
      },
      'lipo-de-papada': {
        eyebrow: 'Cirurgia plástica com foco principal na face · Contorno cervical',
        text: 'Nem toda papada é apenas gordura: a avaliação integrada identifica quando a lipo é suficiente e quando pele, músculos ou estrutura também precisam ser considerados.'
      },
      otoplastia: {
        eyebrow: 'Cirurgia plástica com foco principal na face · Otoplastia',
        text: 'A proporção das orelhas é avaliada dentro do conjunto facial, com atenção à anatomia e ao objetivo de preservar naturalidade.'
      },
      injetaveis: {
        eyebrow: 'Planejamento facial · Tratamentos não cirúrgicos',
        text: 'A formação em cirurgia plástica orienta a leitura de pele, volume e sustentação — inclusive para reconhecer quando o tratamento não cirúrgico não é a melhor indicação.'
      }
    };
    var message = messages[procedure];
    if (!message) return;

    var heroInner = document.querySelector('.hero .hero-inner');
    if (!heroInner) return;
    var eyebrow = heroInner.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = message.eyebrow;

    var lead = heroInner.querySelector('.lead');
    if (!lead || heroInner.querySelector('.hero-focus')) return;
    var focus = document.createElement('p');
    focus.className = 'hero-focus';
    focus.innerHTML = '<strong>Foco principal na face.</strong> ' + message.text;
    lead.insertAdjacentElement('afterend', focus);
  }

  function installEducationalVideos() {
    var path = window.location.pathname.replace(/\/+$/, '/') || '/';
    var galleries = {
      '/blefaroplastia/': {
        eyebrow: 'Explicações em vídeo',
        title: 'Entenda o envelhecimento do olhar e o planejamento da blefaroplastia.',
        intro: 'Conteúdos curtos para visualizar anatomia, indicação, naturalidade e cicatrizes antes da consulta.',
        items: [
          ['envelhecimento-do-olho.mp4', 'Como o olhar envelhece', 'Pálpebras, bolsas e estruturas ao redor dos olhos mudam de maneiras diferentes.'],
          ['blefaroplastia-em-jovens.mp4', 'Blefaroplastia em jovens', 'Idade isolada não define indicação; anatomia, queixa e função precisam ser avaliadas.'],
          ['como-e-feita-a-blefaroplastia.mp4', 'Como é feita a blefaroplastia', 'Uma explicação visual das estruturas consideradas no planejamento cirúrgico.'],
          ['sobrancelha-elevada-naturalidade.mp4', 'Sobrancelha elevada nem sempre é natural', 'Posição, formato e expressão devem ser analisados em conjunto.'],
          ['cicatrizes-blefaroplastia-desenho.mp4', 'Onde ficam as cicatrizes', 'O desenho mostra como as incisões acompanham dobras e limites naturais.'],
          ['olhar-envelhecido-blefaroplastia.mp4', 'Queixa e possíveis soluções', 'Nem todo aspecto cansado tem a mesma causa ou pede a mesma abordagem.'],
          ['cicatriz-blefaroplastia.mp4', 'Evolução da cicatriz', 'A aparência muda ao longo dos meses e depende da resposta individual.']
        ]
      },
      '/lifting-facial/': {
        eyebrow: 'Planejamento em vídeo',
        title: 'Recursos para entender volume, contorno e naturalidade.',
        intro: 'Simulações e explicações ajudam a separar queixas diferentes antes de discutir uma técnica.',
        items: [
          ['lifting-com-enxertia-de-gordura.mp4', 'Lifting e enxertia de gordura', 'Uma simulação para diferenciar reposicionamento dos tecidos e recuperação de volume.'],
          ['queixa-e-solucao-face.mp4', 'Da queixa ao plano facial', 'Cada incômodo precisa ser relacionado à estrutura que realmente o produz.'],
          ['medo-de-resultados-exagerados.mp4', 'Medo de um resultado exagerado', 'Naturalidade depende de indicação, proporção e respeito à identidade facial.']
        ]
      },
      '/conteudos/cuidados-cicatrizacao-cirurgia/': {
        eyebrow: 'Explicação em vídeo',
        title: 'Fatores que influenciam a cicatrização.',
        intro: 'Técnica, biologia, hábitos e cuidados pós-operatórios participam da evolução.',
        items: [['fatores-cicatrizacao.mp4', 'Cicatrização é multifatorial', 'Uma visão prática dos fatores que podem favorecer ou dificultar a recuperação.']]
      },
      '/conteudos/consulta-cirurgia-plastica/': {
        eyebrow: 'Antes da avaliação',
        title: 'Como é uma consulta com a Dra. Amanda.',
        intro: 'Queixa, anatomia, expectativas e segurança entram na conversa antes de qualquer decisão.',
        items: [['como-funciona-a-consulta.mp4', 'Eu e você em consulta', 'A consulta organiza dúvidas e possibilidades antes de qualquer decisão sobre tratamento.']]
      }
    };
    var gallery = galleries[path];
    var main = document.querySelector('main');
    if (!gallery || !main || main.querySelector('.educational-videos, .bf2-video-section, .lc2-content-section, #conteudos-selecionados')) return;

    var section = document.createElement('section');
    var headingId = 'videos-educativos-' + path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    section.className = 'educational-videos';
    section.setAttribute('aria-labelledby', headingId);
    section.innerHTML = '<div class="container"><div class="section-head"><span class="eyebrow"></span><h2 id="' + headingId + '"></h2><p class="educational-video-intro"></p></div><div class="educational-video-grid"></div><p class="educational-video-note">Conteúdo educativo. Os vídeos não substituem exame físico nem definem indicação individual.</p></div>';
    section.querySelector('.eyebrow').textContent = gallery.eyebrow;
    section.querySelector('h2').textContent = gallery.title;
    section.querySelector('.educational-video-intro').textContent = gallery.intro;

    var grid = section.querySelector('.educational-video-grid');
    gallery.items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'educational-video-card';
      card.innerHTML = '<video controls playsinline preload="metadata" aria-label="' + item[1] + '"><source type="video/mp4"></video><div class="educational-video-copy"><h3></h3><p></p></div>';
      card.querySelector('source').src = '/campanhas/assets/conteudos/videos/' + item[0];
      card.querySelector('h3').textContent = item[1];
      card.querySelector('p').textContent = item[2];
      grid.appendChild(card);
    });

    var faq = main.querySelector('#faq');
    if (faq) faq.insertAdjacentElement('beforebegin', section);
    else main.appendChild(section);
  }

  function installConsultationArticleHeroImage() {
    var path = window.location.pathname.replace(/\/+$/, '/') || '/';
    if (path !== '/conteudos/consulta-cirurgia-plastica/') return;

    var hero = document.querySelector('.article-page > .article-hero');
    if (!hero || hero.querySelector('.consultation-hero-media')) return;

    var copy = document.createElement('div');
    copy.className = 'consultation-hero-copy';
    while (hero.firstChild) copy.appendChild(hero.firstChild);

    var media = document.createElement('div');
    media.className = 'consultation-hero-media';
    var photo = document.createElement('img');
    photo.src = '/campanhas/assets/conteudos/amanda-atendendo-consulta.png';
    photo.alt = 'Dra. Amanda Schroeder durante atendimento em consulta';
    photo.width = 1146;
    photo.height = 1400;
    photo.decoding = 'async';
    photo.loading = 'eager';
    photo.setAttribute('fetchpriority', 'high');
    media.appendChild(photo);

    hero.classList.add('consultation-article-hero');
    hero.appendChild(copy);
    hero.appendChild(media);
  }

  function installAuxiliaryProfessionalHero() {
    var path = window.location.pathname.replace(/\/+$/, '/') || '/';
    var pageType = document.documentElement.dataset.pageType || '';
    if (pageType === 'home' || /\/conteudos\/consulta-cirurgia-plastica\/$/.test(path)) return;

    var photo = document.querySelector([
      '.hero-media img',
      '.lf2-hero-media img',
      '.lc2-hero-media img',
      '.bf2-hero-media img',
      '.lp2-hero-media img',
      '.ot2-hero-media img',
      '.ota2-hero-media img',
      '.oti2-hero-media img'
    ].join(','));
    if (photo) {
      photo.src = '/campanhas/assets/amanda-profissional-hero.webp';
      photo.removeAttribute('srcset');
      photo.width = 1200;
      photo.height = 1020;
      photo.alt = 'Dra. Amanda Schroeder em ambiente profissional';
      photo.classList.add('auxiliary-professional-hero');
      return;
    }

    var articleHero = document.querySelector('.article-page > .article-hero');
    if (!articleHero || articleHero.querySelector('.professional-hero-media')) return;
    var copy = document.createElement('div');
    copy.className = 'professional-hero-copy';
    while (articleHero.firstChild) copy.appendChild(articleHero.firstChild);
    var media = document.createElement('div');
    media.className = 'professional-hero-media';
    var articlePhoto = document.createElement('img');
    articlePhoto.src = '/campanhas/assets/amanda-profissional-hero.webp';
    articlePhoto.alt = 'Dra. Amanda Schroeder em ambiente profissional';
    articlePhoto.width = 1200;
    articlePhoto.height = 1020;
    articlePhoto.decoding = 'async';
    articlePhoto.loading = 'eager';
    articlePhoto.setAttribute('fetchpriority', 'high');
    media.appendChild(articlePhoto);
    articleHero.classList.add('professional-article-hero');
    articleHero.appendChild(copy);
    articleHero.appendChild(media);
  }

  installAuxiliaryProfessionalHero();

  document.addEventListener('click', function (event) {
    var reviewLink = event.target.closest('a[data-google-review-tabs]');
    if (!reviewLink || event.defaultPrevented) return;

    event.preventDefault();

    var doctorWindow = window.open(reviewLink.href, '_blank');
    if (doctorWindow) doctorWindow.opener = null;

    var clinicUrl = reviewLink.dataset.clinicReviewUrl;
    var clinicWindow = clinicUrl && window.open(clinicUrl, '_blank');
    if (clinicWindow) clinicWindow.opener = null;
  });

  document.addEventListener('DOMContentLoaded', function () {
    installConsultationArticleHeroImage();
    installEducationalVideos();
    installFaceFocusPositioning();
    installJourneyReturn();
    installJourneyPositionMemory();
    restoreJourneyPosition();
  });
})();
