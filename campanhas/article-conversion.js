(() => {
  'use strict';

  const root = document.documentElement;
  const slug = location.pathname.split('/').filter(Boolean).pop() || '';
  const articles = {
    'botox-preenchimento-bioestimulador': {
      summary: [
        ['Movimento', 'A toxina atua em músculos selecionados e objetivos específicos.'],
        ['Volume', 'O preenchimento acrescenta suporte ou volume onde há indicação.'],
        ['Qualidade', 'Bioestimuladores trabalham a resposta de colágeno dos tecidos.']
      ],
      asideTitle: 'Comece pela causa da queixa, não pelo nome do produto.',
      asideText: 'Na avaliação, movimento, perda de volume, proporções e qualidade da pele são analisados antes de escolher um tratamento.'
    },
    'naturalidade-envelhecimento': {
      summary: [
        ['Identidade', 'O tratamento deve respeitar expressão e características pessoais.'],
        ['Proporção', 'Mais produto não significa necessariamente mais rejuvenescimento.'],
        ['Limite', 'Saber quando não tratar também faz parte do planejamento.']
      ],
      asideTitle: 'Construa um plano que preserve o que reconhece em você.',
      asideText: 'Na avaliação, prioridades, proporções e limites são discutidos antes de qualquer produto, quantidade ou procedimento.',
      hubHref: '../../injetaveis/',
      hubLabel: 'Ver página de tratamentos injetáveis'
    },
    'cuidados-cicatrizacao-cirurgia': {
      summary: [
        ['Biologia', 'Cada organismo tem um ritmo e um padrão de cicatrização.'],
        ['Cuidados', 'Tabagismo, sol, tensão e rotina podem interferir na evolução.'],
        ['Sinais de alerta', 'Mudanças inesperadas devem ser comunicadas à equipe.']
      ],
      asideTitle: 'Inclua a cicatrização no planejamento da cirurgia.',
      asideText: 'Na avaliação, histórico, hábitos, medicamentos e recuperação disponível ajudam a antecipar cuidados individualizados.',
      hubHref: '../seguranca-cirurgia-plastica/',
      hubLabel: 'Ver conteúdo sobre segurança cirúrgica'
    },
    'lifting-facial-ou-injetaveis': {
      summary: [
        ['Estrutura', 'Cirurgia e injetáveis atuam em componentes diferentes.'],
        ['Indicação', 'Flacidez, volume, pele e movimento precisam ser separados.'],
        ['Naturalidade', 'O objetivo é tratar a causa sem apagar a identidade.']
      ],
      asideTitle: 'Entenda qual abordagem conversa com a causa da sua queixa.',
      asideText: 'Na avaliação, sustentação, volume, pele e movimento são examinados antes de comparar cirurgia, injetáveis ou uma combinação planejada.'
    },
    'blefaroplastia-quando-faz-sentido': {
      summary: [
        ['Pálpebras', 'Pele e bolsas podem contribuir para o aspecto cansado.'],
        ['Entorno dos olhos', 'Sobrancelha, sulcos e pele também entram na análise.'],
        ['Planejamento', 'Cicatrizes e recuperação dependem do exame individual.']
      ],
      asideTitle: 'Descubra de onde vem o aspecto cansado no seu olhar.',
      asideText: 'Na avaliação, pálpebras, sobrancelhas, bolsas e estruturas ao redor dos olhos são analisadas em conjunto antes de indicar uma técnica.'
    },
    'recuperacao-lifting-facial': {
      summary: [
        ['Primeiros dias', 'Edema, repouso e apoio precisam ser organizados.'],
        ['Retorno social', 'A evolução varia e não deve ser tratada como promessa.'],
        ['Acompanhamento', 'Retornos e cuidados fazem parte do tratamento.']
      ],
      asideTitle: 'Planeje a cirurgia junto com a sua recuperação.',
      asideText: 'Na avaliação, rotina, trabalho, rede de apoio e condições de saúde ajudam a construir um cronograma realista e seguro.'
    },
    'lipoenxertia-facial': {
      summary: [
        ['Volume', 'A gordura pode restaurar áreas selecionadas do rosto.'],
        ['Estrutura', 'Acrescentar volume não substitui reposicionar tecidos.'],
        ['Evolução', 'Integração e retenção variam entre pacientes e regiões.']
      ],
      asideTitle: 'Entenda se a sua queixa é de volume, sustentação ou ambos.',
      asideText: 'Na avaliação, proporções, qualidade dos tecidos e regiões de perda de volume são analisadas antes de considerar a lipoenxertia.',
      hubHref: '../../lifting-facial/',
      hubLabel: 'Ver página de rejuvenescimento facial'
    },
    'papada-contorno-cervical': {
      summary: [
        ['Gordura', 'Volume abaixo do queixo é apenas uma das possibilidades.'],
        ['Estruturas', 'Pele, músculo e projeção do queixo mudam o diagnóstico.'],
        ['Contorno', 'A estratégia deve preservar a transição natural do pescoço.']
      ],
      asideTitle: 'Identifique o que está reduzindo a definição do seu pescoço.',
      asideText: 'Na avaliação, gordura, pele, musculatura e projeção facial são examinadas separadamente para construir uma indicação coerente.',
      hubHref: '../../lifting-facial/',
      hubLabel: 'Ver página de lifting facial e pescoço'
    },
    'cicatrizes-cirurgia-de-mama': {
      summary: [
        ['Formato', 'Depende da pele, da aréola e da remodelação necessária.'],
        ['Evolução', 'Tensão, biologia e cuidados influenciam a maturação.'],
        ['Decisão', 'A cicatriz é ponderada junto do benefício esperado.']
      ],
      asideTitle: 'Entenda qual cicatriz faz sentido no seu caso.',
      asideText: 'Na avaliação, a anatomia e o objetivo são examinados antes de definir técnica, extensão e posição das cicatrizes.'
    },
    'como-escolher-protese-de-mama': {
      summary: [
        ['Base', 'A largura do tórax orienta as opções proporcionais.'],
        ['Tecidos', 'Pele e cobertura mudam como o implante se comporta.'],
        ['Preferência', 'Volume e projeção são decididos com objetivos realistas.']
      ],
      asideTitle: 'Escolha proporção, não apenas mililitros.',
      asideText: 'Na avaliação, medidas, tecidos e preferência de resultado são combinados para comparar opções coerentes com o seu corpo.'
    },
    'mastopexia-com-ou-sem-protese': {
      summary: [
        ['Objetivo', 'Elevar a mama não exige implante em todos os casos.'],
        ['Volume', 'A prótese pode complementar o colo, mas não substitui sustentação.'],
        ['Cicatriz', 'O excesso de pele define parte importante do planejamento.']
      ],
      asideTitle: 'Descubra se o seu objetivo pede volume, elevação ou ambos.',
      asideText: 'Na avaliação, queda, volume existente, qualidade da pele e proporção desejada são analisados em conjunto.'
    },
    'lipoaspiracao-ou-abdominoplastia': {
      summary: [
        ['Gordura', 'A lipoaspiração trata depósitos localizados.'],
        ['Pele', 'A abdominoplastia trata sobra de pele quando indicada.'],
        ['Parede abdominal', 'Diástase exige diagnóstico e planejamento próprios.']
      ],
      asideTitle: 'Identifique o que realmente altera o seu abdome.',
      asideText: 'Na avaliação, gordura, elasticidade da pele e parede abdominal são examinadas separadamente antes de indicar uma técnica.'
    },
    'cirurgia-plastica-apos-emagrecimento': {
      summary: [
        ['Momento', 'Peso estável e preparo clínico vêm antes da cirurgia.'],
        ['Prioridade', 'Incômodo, função e recuperação orientam por onde começar.'],
        ['Etapas', 'Nem todas as áreas devem ser tratadas ao mesmo tempo.']
      ],
      asideTitle: 'Organize um plano seguro por prioridades.',
      asideText: 'Na avaliação, histórico de peso, condição clínica, áreas de maior incômodo e recuperação disponível orientam cada etapa.'
    }
  };

  const config = articles[slug];
  if (!config) return;
  root.dataset.articleModern = 'true';

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const hero = document.querySelector('.article-hero');
  const lead = hero?.querySelector('.lead');
  if (hero && lead && !hero.querySelector('.article-summary')) {
    const summary = makeElement('section', 'article-summary');
    summary.setAttribute('aria-label', 'Pontos principais deste conteúdo');

    config.summary.forEach(([label, copy]) => {
      const item = makeElement('div', 'article-summary-item');
      item.append(makeElement('strong', '', label), makeElement('span', '', copy));
      summary.append(item);
    });

    lead.insertAdjacentElement('afterend', summary);
  }

  const aside = document.querySelector('.article-aside-card');
  if (aside) {
    const eyebrow = aside.querySelector('.eyebrow');
    const title = aside.querySelector('h2');
    const copy = aside.querySelector(':scope > p');
    const button = aside.querySelector('.btn');

    if (eyebrow) eyebrow.textContent = 'Avaliação individual';
    if (title) title.textContent = config.asideTitle;
    if (copy) copy.textContent = config.asideText;

    if (button && !aside.querySelector('.article-consultation-details')) {
      const details = makeElement('div', 'article-consultation-details');
      details.setAttribute('aria-label', 'Informações da consulta');
      [
        'Consulta particular: R$ 500',
        'Pix, débito ou cartão de crédito em até 2x',
        'Clínica LIV, em Pinheiros · nota fiscal disponível'
      ].forEach((text) => details.append(makeElement('span', '', text)));
      button.insertAdjacentElement('beforebegin', details);
    }

    if (button) {
      button.textContent = 'Ver horários para avaliação';
      button.setAttribute('aria-label', 'Ver horários para avaliação pelo WhatsApp');
    }

    if (config.hubHref && !aside.querySelector('.text-link')) {
      const hubLink = makeElement('a', 'text-link', config.hubLabel);
      hubLink.href = config.hubHref;
      aside.append(hubLink);
    }
  }

  let finalCta = document.querySelector('main > .cta');
  if (!finalCta) {
    const main = document.querySelector('main');
    const sourceButton = aside?.querySelector('.btn');
    if (main && sourceButton) {
      finalCta = makeElement('section', 'cta');
      const wrap = makeElement('div', 'container cta-wrap');
      const copyWrap = makeElement('div');
      copyWrap.append(makeElement('h2'), makeElement('p'));
      const finalButton = sourceButton.cloneNode(false);
      finalButton.removeAttribute('aria-label');
      wrap.append(copyWrap, finalButton);
      finalCta.append(wrap);
      main.append(finalCta);
    }
  }

  if (finalCta) {
    const title = finalCta.querySelector('h2');
    const copy = finalCta.querySelector('p');
    const button = finalCta.querySelector('.btn');
    if (title) title.textContent = 'Saia da pesquisa com um plano para o seu caso.';
    if (copy) copy.textContent = 'A consulta conecta suas queixas, anatomia, prioridades e segurança. A indicação só é definida após avaliação médica individual.';
    if (button) button.textContent = 'Ver horários para avaliação';
  }

  const navCta = document.querySelector('.nav-cta');
  if (navCta) navCta.textContent = 'Ver horários';

  const floatingCta = document.querySelector('.whatsapp-float');
  if (floatingCta) {
    floatingCta.textContent = 'Ver horários no WhatsApp';
    floatingCta.setAttribute('aria-label', 'Ver horários para avaliação pelo WhatsApp');
  }

  document.querySelectorAll('a[data-track="whatsapp"]').forEach((link) => {
    let locationName = 'article';
    if (link.matches('.nav-cta')) locationName = 'navigation';
    else if (link.closest('.article-aside-card')) locationName = 'article_context';
    else if (link.closest('main > .cta')) locationName = 'article_final';
    else if (link.matches('.whatsapp-float')) locationName = 'floating';
    link.dataset.ctaLocation = locationName;
  });
})();
