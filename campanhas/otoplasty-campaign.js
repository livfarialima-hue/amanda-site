(function () {
  'use strict';

  var journeys = {
    'otoplastia-infantil': {
      actionLabel: 'Entender a avaliação',
      reference: 'OT02',
      message: 'Olá! Tenho interesse em otoplastia para criança ou adolescente com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.\n\nRef. OT02'
    },
    'otoplastia-adulto': {
      actionLabel: 'Entender a avaliação',
      reference: 'OT01',
      message: 'Olá! Tenho interesse em otoplastia em adultos com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.\n\nRef. OT01'
    }
  };

  function prepareWhatsAppJourney() {
    var procedure = document.documentElement.dataset.procedure || '';
    var journey = journeys[procedure];
    if (!journey) return;

    document.querySelectorAll('a[data-track="whatsapp"][data-procedure="' + procedure + '"]').forEach(function (link) {
      try {
        var url = new URL(link.href, window.location.href);
        url.searchParams.set('text', journey.message);
        link.dataset.procedure = procedure;
        link.dataset.originalReference = journey.reference;
        link.dataset.templateId = 'procedure_evaluation_v1';
        link.href = url.toString();
        if (['hero', 'consulta', 'final'].indexOf(link.dataset.ctaLocation || '') !== -1 && !link.querySelector('svg')) {
          link.textContent = journey.actionLabel;
        }
      } catch (error) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareWhatsAppJourney);
  } else {
    prepareWhatsAppJourney();
  }
})();
