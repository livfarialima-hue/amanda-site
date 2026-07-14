(function () {
  'use strict';

  function pushEvent(name, params) {
    // Mensuração comportamental desativada: somente cliques no WhatsApp são medidos.
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

    var cards = Array.prototype.slice.call(document.querySelectorAll('.category-card, .content-intent-card'));
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
            query_length: query.length,
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

    document.querySelectorAll('a[data-track="educational-content"]').forEach(function (link) {
      link.addEventListener('click', function () {
        pushEvent('educational_content_click', Object.assign(pageContext(), {
          content_topic: link.dataset.contentTopic || '',
          destination_path: new URL(link.href, window.location.href).pathname
        }));
      });
    });
  }

  function normalizeArticleCtas() {
    if (document.documentElement.dataset.pageType !== 'article') return;
    var headerCta = document.querySelector('.nav-cta[data-track="whatsapp"]');
    if (headerCta) {
      headerCta.textContent = 'Falar com a equipe';
      headerCta.dataset.ctaLocation = 'header';
    }
    var heroCta = document.querySelector('.article-hero [data-track="whatsapp"], .hero[data-section="hero"] [data-track="whatsapp"]');
    if (heroCta) {
      heroCta.textContent = 'Falar com a equipe';
      heroCta.dataset.ctaLocation = 'hero';
    }
    var finalCta = document.querySelector('.cta a.btn[data-track="whatsapp"]');
    if (finalCta) {
      finalCta.textContent = 'Agendar avaliação';
      finalCta.dataset.ctaLocation = 'final';
    }
  }

  function identifyWhatsAppCtaOrigins() {
    var fallbackIndex = 0;
    document.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
      if (link.dataset.ctaLocation) return;

      var container = link.closest('[data-section], header, footer, .hero, .hero-section, .whatsapp-float, .floating-whatsapp, .cta, .article-aside, .article-hero');
      if (container && container.dataset.section) {
        link.dataset.ctaLocation = container.dataset.section;
      } else if (container && container.matches('header')) {
        link.dataset.ctaLocation = 'header';
      } else if (container && container.matches('footer')) {
        link.dataset.ctaLocation = 'footer';
      } else if (container && container.matches('.hero, .hero-section, .article-hero')) {
        link.dataset.ctaLocation = 'hero';
      } else if (container && container.matches('.whatsapp-float, .floating-whatsapp')) {
        link.dataset.ctaLocation = 'floating';
      } else if (container && container.matches('.cta')) {
        link.dataset.ctaLocation = 'final';
      } else if (container && container.matches('.article-aside')) {
        link.dataset.ctaLocation = 'article_aside';
      } else {
        fallbackIndex += 1;
        link.dataset.ctaLocation = 'cta_' + fallbackIndex;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    pushEvent('page_context', pageContext());
    openCampaignProcedure();
    installContentSearch();
    installContentLinkTracking();
    normalizeArticleCtas();
    identifyWhatsAppCtaOrigins();

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

    document.querySelectorAll('details.faq-item').forEach(function (details, index) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        pushEvent('faq_open', Object.assign(pageContext(), {
          faq_position: index + 1
        }));
      });
    });

  });
})();
