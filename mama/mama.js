(function () {
  'use strict';

  function installCarousel(target) {
    var id = target.dataset.mamaCarousel;
    if (!id || target.dataset.mamaCarouselReady === 'true') return;

    var controls = document.querySelector('[data-mama-carousel-controls="' + id + '"]');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'mama-carousel-controls';
      controls.dataset.mamaCarouselControls = id;
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Controles do carrossel');
      controls.innerHTML = '<button aria-label="Conteúdo anterior" data-mama-carousel-action="previous" type="button">←</button><button aria-label="Próximo conteúdo" data-mama-carousel-action="next" type="button">→</button>';
      target.insertAdjacentElement('afterend', controls);
    }

    var previous = controls.querySelector('[data-mama-carousel-action="previous"]');
    var next = controls.querySelector('[data-mama-carousel-action="next"]');
    if (!previous || !next) return;

    function update() {
      var first = target.firstElementChild;
      var last = target.lastElementChild;
      var targetBounds = target.getBoundingClientRect();
      var atStart = !first || first.getBoundingClientRect().left >= targetBounds.left - 4;
      var atEnd = !last || last.getBoundingClientRect().right <= targetBounds.right + 4;
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
    target.scrollLeft = 0;
    update();
    window.setTimeout(function () {
      target.scrollLeft = 0;
      update();
    }, 0);
  }

  function refineCopyAndCtas() {
    var eyebrow = document.querySelector('.hero .eyebrow');
    if (eyebrow) eyebrow.textContent = 'Cirurgia Plástica da Mama · São Paulo';

    var heroCta = document.querySelector('.hero-actions a[data-track="whatsapp"]');
    if (heroCta) {
      heroCta.textContent = 'Falar com a equipe';
      heroCta.dataset.ctaLocation = 'hero';
    }

    var navCta = document.querySelector('.nav-cta[data-track="whatsapp"]');
    if (navCta) {
      navCta.textContent = 'Falar com a equipe';
      navCta.dataset.ctaLocation = 'header';
    }

    var heroSecondary = document.querySelector('.hero-actions .ghost');
    if (heroSecondary) heroSecondary.hidden = true;

    var procedureHead = document.querySelector('.procedure-hub-section .section-head');
    if (procedureHead) {
      var procedureTitle = procedureHead.querySelector('h2');
      var procedureText = procedureHead.querySelector('p');
      if (procedureTitle) procedureTitle.textContent = 'O que você quer mudar ajuda a organizar as possibilidades.';
      if (procedureText) procedureText.textContent = 'Queda, esvaziamento, excesso de volume e combinação de queixas pedem decisões diferentes. Abra apenas a opção que se aproxima da sua dúvida; a técnica é confirmada depois do exame.';
    }

    var resultHead = document.querySelector('#resultados .section-head');
    if (resultHead) {
      var resultEyebrow = resultHead.querySelector('.eyebrow');
      var resultTitle = resultHead.querySelector('h2');
      var resultText = resultHead.querySelector('p');
      if (resultEyebrow) resultEyebrow.textContent = 'Resultado real com contexto';
      if (resultTitle) resultTitle.textContent = 'Um caso combinado para orientar a leitura — não para prometer uma técnica isolada.';
      if (resultText) resultText.textContent = 'Este caso reúne cirurgia de mama e abdome. Observe proporção, posição e coerência entre frente, oblíqua e perfil; a indicação e a evolução variam de pessoa para pessoa.';
    }

    var resultDisclaimer = document.querySelector('#resultados .disclaimer');
    if (resultDisclaimer) {
      resultDisclaimer.textContent = 'Caso real autorizado, de cirurgia combinada de mama e abdome. As imagens não garantem resultado semelhante: anatomia, indicação, cicatrização e cuidados influenciam a evolução. Riscos e possibilidade de revisão são discutidos na consulta.';
    }

    document.querySelectorAll('a[data-track="whatsapp"]').forEach(function (link) {
      if (!link.dataset.ctaLocation) {
        var section = link.closest('[data-section], section');
        link.dataset.ctaLocation = section && (section.dataset.section || section.id) || 'page';
      }
    });

    var float = document.querySelector('.whatsapp-float');
    if (float) {
      float.textContent = 'Falar com a equipe';
      float.dataset.ctaLocation = 'floating';
      float.setAttribute('aria-label', 'Falar com a equipe pelo WhatsApp');
    }

    var finalCta = document.querySelector('.cta a[data-track="whatsapp"]');
    if (finalCta) {
      finalCta.textContent = 'Agendar avaliação';
      finalCta.dataset.ctaLocation = 'final_cta';
    }
  }

  refineCopyAndCtas();
  var complaintRow = document.querySelector('.patient-language-grid');
  if (complaintRow) complaintRow.dataset.mamaCarousel = 'queixas';
  document.querySelectorAll('[data-mama-carousel]').forEach(installCarousel);
})();
