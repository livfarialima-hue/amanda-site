(function () {
  'use strict';

  var root = document.documentElement;
  if (!root || root.dataset.marketingRefresh !== 'true') return;

  function moveResultsNearHero() {
    var main = document.querySelector('main');
    var results = main && main.querySelector(':scope > #resultados');
    var trust = main && main.querySelector(':scope > .trust');
    var hero = main && main.querySelector(':scope > .hero');
    if (!main || !results || (!trust && !hero)) return;

    var anchor = trust || hero;
    if (anchor.nextElementSibling !== results) {
      anchor.insertAdjacentElement('afterend', results);
    }

    results.dataset.marketingPosition = 'early';
    results.querySelectorAll('.result-grid').forEach(function (grid) {
      grid.classList.remove('mobile-carousel');
      grid.classList.add('marketing-results-complete');
      grid.removeAttribute('tabindex');
    });

    var hint = results.previousElementSibling;
    if (hint && hint.classList.contains('mobile-scroll-hint')) hint.remove();
  }

  function labelResultImages() {
    document.querySelectorAll('#resultados img').forEach(function (image) {
      image.dataset.completeResult = 'true';
    });
  }

  moveResultsNearHero();
  labelResultImages();
})();
