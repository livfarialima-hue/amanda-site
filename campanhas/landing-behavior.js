(function () {
  'use strict';

  function pushEvent(name, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  function pageContext() {
    var root = document.documentElement;
    return {
      page_type: root.dataset.pageType || 'procedure',
      content_group: root.dataset.contentGroup || '',
      procedure: root.dataset.procedure || '',
      page_path: window.location.pathname
    };
  }

  function openProcedure(id, shouldScroll) {
    if (!id) return;
    var target = document.getElementById(id);
    if (!target || target.tagName !== 'DETAILS') return;

    target.open = true;
    target.classList.add('campaign-target');
    window.setTimeout(function () { target.classList.remove('campaign-target'); }, 5000);

    if (shouldScroll) {
      window.setTimeout(function () {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }

  function openCampaignProcedure() {
    var params = new URLSearchParams(window.location.search || '');
    var id = params.get('procedimento') || (window.location.hash || '').replace('#', '');
    if (!id) return;
    openProcedure(id, true);
    pushEvent('campaign_procedure_view', Object.assign(pageContext(), {
      selected_procedure: id,
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || ''
    }));
  }

  function normalizeText(value) {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function installContentSearch() {
    var input = document.querySelector('[data-content-search]');
    if (!input) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.category-card'));
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.category-block'));
    var status = document.querySelector('[data-content-search-status]');
    var noResults = document.querySelector('[data-content-no-results]');
    var debounce;

    function applyFilter() {
      var query = normalizeText(input.value);
      var visible = 0;

      cards.forEach(function (card) {
        var match = !query || normalizeText(card.textContent).indexOf(query) !== -1;
        card.hidden = !match;
        if (match) visible += 1;
      });

      blocks.forEach(function (block) {
        var hasVisible = !!block.querySelector('.category-card:not([hidden])');
        block.hidden = !hasVisible;
      });

      if (status) status.textContent = visible + (visible === 1 ? ' conteúdo encontrado.' : ' conteúdos encontrados.');
      if (noResults) noResults.hidden = visible !== 0;

      window.clearTimeout(debounce);
      if (query.length >= 3) {
        debounce = window.setTimeout(function () {
          pushEvent('content_search', Object.assign(pageContext(), {
            search_term: query.substring(0, 80),
            results_count: visible
          }));
        }, 700);
      }
    }

    input.addEventListener('input', applyFilter);
    applyFilter();
  }

  function installContentLinkTracking() {
    document.querySelectorAll('a[data-track="instagram-content"]').forEach(function (link) {
      link.addEventListener('click', function () {
        pushEvent('educational_content_click', Object.assign(pageContext(), {
          content_topic: link.dataset.contentTopic || '',
          outbound_domain: 'instagram.com'
        }));
      });
    });
  }

  function enrichWhatsAppLinks() {
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem('amanda_attribution') || '{}') || {}; } catch (e) {}
    if (!stored.utm_campaign && !stored.utm_content && !stored.utm_source) return;

    document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]').forEach(function (anchor) {
      try {
        var url = new URL(anchor.href, window.location.href);
        var current = url.searchParams.get('text') || '';
        var attribution = [];
        if (stored.utm_source) attribution.push('source=' + stored.utm_source);
        if (stored.utm_campaign) attribution.push('campaign=' + stored.utm_campaign);
        if (stored.utm_content) attribution.push('content=' + stored.utm_content);
        if (!attribution.length || current.indexOf('Atribuição:') !== -1) return;
        url.searchParams.set('text', current + '\nAtribuição: ' + attribution.join(' | '));
        anchor.href = url.toString();
      } catch (e) {}
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    pushEvent('page_context', pageContext());
    enrichWhatsAppLinks();
    openCampaignProcedure();
    installContentSearch();
    installContentLinkTracking();

    document.querySelectorAll('[data-open-procedure]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var id = link.getAttribute('data-open-procedure');
        var target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        openProcedure(id, true);
        history.replaceState(null, '', '#'+id);
        pushEvent('procedure_interest_click', Object.assign(pageContext(), { selected_procedure: id }));
      });
    });

    document.querySelectorAll('details.procedure-disclosure').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        pushEvent('procedure_details_open', Object.assign(pageContext(), {
          selected_procedure: details.dataset.procedure || details.id || ''
        }));
      });
    });

    document.querySelectorAll('details.faq-item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        var heading = details.querySelector('h3');
        pushEvent('faq_open', Object.assign(pageContext(), {
          faq_question: heading ? heading.textContent.trim() : ''
        }));
      });
    });

    document.querySelectorAll('[data-privacy-settings]').forEach(function (button) {
      button.addEventListener('click', function () {
        try { localStorage.removeItem('amanda_tracking_consent'); } catch (e) {}
        window.location.reload();
      });
    });
  });
})();
