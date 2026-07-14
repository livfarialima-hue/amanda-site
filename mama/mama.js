(function () {
  'use strict';

  function installCarousel(target) {
    var id = target.dataset.mamaCarousel;
    if (!id || target.dataset.mamaCarouselReady === 'true') return;

    var controls = document.querySelector('[data-mama-carousel-controls="' + id + '"]');
    if (!controls) return;

    var previous = controls.querySelector('[data-mama-carousel-action="previous"]');
    var next = controls.querySelector('[data-mama-carousel-action="next"]');
    if (!previous || !next) return;

    function update() {
      var atStart = target.scrollLeft <= 4;
      var atEnd = target.scrollLeft >= target.scrollWidth - target.clientWidth - 4;
      previous.disabled = atStart;
      next.disabled = atEnd;
      next.classList.toggle('is-end', atEnd);
      next.setAttribute('aria-label', atEnd ? 'Fim do carrossel' : 'Próximo conteúdo');
    }

    function move(direction) {
      target.scrollBy({ left: direction * Math.min(target.clientWidth * .86, 330), behavior: 'smooth' });
    }

    previous.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });
    target.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    target.dataset.mamaCarouselReady = 'true';
    update();
  }

  document.querySelectorAll('[data-mama-carousel]').forEach(installCarousel);
})();
