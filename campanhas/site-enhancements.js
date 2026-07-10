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
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, context(), data || {}));
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
      var button = createToggle(section.dataset.mobileCollapse, panel, sectionName);
      head.insertAdjacentElement('afterend', button);
      button.insertAdjacentElement('afterend', panel);
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
      var button = createToggle(label, target, sectionName);
      target.parentNode.insertBefore(button, target);
      target.dataset.mobileEnhanced = 'true';
    });
  }

  function installScrollRows() {
    document.querySelectorAll('[data-mobile-scroll]').forEach(function (row) {
      if (row.dataset.mobileScrollEnhanced === 'true' || row.children.length < 2) return;
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
        if (!tracked && row.scrollLeft > 24) {
          tracked = true;
          pushEvent('mobile_horizontal_scroll', {
            section_name: row.dataset.mobileScrollLabel || 'Opções relacionadas'
          });
        }
      }, { passive: true });
    });
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
  }
  document.addEventListener('DOMContentLoaded', installFloatingCtaBehavior);
})();
