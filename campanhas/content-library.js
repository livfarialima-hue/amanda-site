(function () {
  'use strict';

  var input = document.getElementById('content-search');
  var results = document.getElementById('content-search-results');
  var status = document.getElementById('content-search-status');
  var empty = document.getElementById('content-search-empty');
  var clear = document.getElementById('content-search-clear');

  if (!input || !results || !status || !empty || !clear) return;

  var normalize = function (value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  var synonymGroups = [
    ['preco', 'valor', 'valores', 'custo', 'custos', 'orcamento'],
    ['botox', 'toxina', 'toxina botulinica'],
    ['silicone', 'protese', 'implante'],
    ['papada', 'pescoco', 'cervical', 'queixo'],
    ['barriga', 'abdomen', 'abdominal', 'abdominoplastia', 'diastase'],
    ['gordura', 'lipo', 'lipoaspiracao', 'lipoenxertia'],
    ['olho', 'olhos', 'olhar', 'palpebra', 'palpebras', 'blefaroplastia'],
    ['cansado', 'cansados', 'cansada', 'cansadas'],
    ['pos-operatorio', 'pos operatorio', 'recuperacao', 'edema'],
    ['cicatriz', 'cicatrizes', 'cicatrizacao'],
    ['peito', 'seio', 'seios', 'mama', 'mamas'],
    ['rosto', 'face', 'facial', 'rejuvenescimento'],
    ['flacidez', 'queda', 'sustentacao', 'lifting']
  ];

  var articles = [];
  var seen = {};

  Array.prototype.forEach.call(document.querySelectorAll('.cl-article'), function (card) {
    var href = card.getAttribute('href');
    if (!href || seen[href]) return;
    seen[href] = true;

    var section = card.closest('.cl-section');
    var titleNode = card.querySelector('h3');
    var descriptionNode = card.querySelector('p');
    var labelNode = card.querySelector('.cl-eyebrow');
    var groupNode = section && section.querySelector('.cl-section-head .cl-eyebrow');
    var title = titleNode ? titleNode.textContent.trim() : '';
    var description = descriptionNode ? descriptionNode.textContent.trim() : '';
    var label = labelNode ? labelNode.textContent.trim() : 'Conteúdo';
    var group = groupNode ? groupNode.textContent.trim() : 'Conteúdos';
    var pathTerms = href.replace(/[\/-]/g, ' ');

    articles.push({
      href: href,
      title: title,
      description: description,
      label: label,
      group: group,
      titleSearch: normalize(title),
      labelSearch: normalize(label + ' ' + group),
      bodySearch: normalize(description + ' ' + pathTerms)
    });
  });

  var variantsFor = function (token) {
    for (var i = 0; i < synonymGroups.length; i += 1) {
      if (synonymGroups[i].indexOf(token) > -1) return synonymGroups[i];
    }
    return [token];
  };

  var scoreArticle = function (article, query) {
    var tokens = normalize(query).split(' ').filter(Boolean);
    var score = 0;

    for (var i = 0; i < tokens.length; i += 1) {
      var variants = variantsFor(tokens[i]);
      var matched = false;
      var best = 0;

      for (var j = 0; j < variants.length; j += 1) {
        var term = variants[j];
        if (article.titleSearch.indexOf(term) > -1) {
          best = Math.max(best, 6);
          matched = true;
        } else if (article.labelSearch.indexOf(term) > -1) {
          best = Math.max(best, 3);
          matched = true;
        } else if (article.bodySearch.indexOf(term) > -1) {
          best = Math.max(best, 1);
          matched = true;
        }
      }

      if (!matched) return 0;
      score += best;
    }

    if (article.titleSearch.indexOf(normalize(query)) > -1) score += 8;
    return score;
  };

  var createResult = function (article, position, query) {
    var link = document.createElement('a');
    link.className = 'cl-search-result';
    link.href = article.href;
    link.setAttribute('data-search-result-position', String(position + 1));
    link.innerHTML =
      '<span class="cl-search-result-meta">' + article.group + ' · ' + article.label + '</span>' +
      '<strong>' + article.title + '</strong>' +
      '<span class="cl-search-result-description">' + article.description + '</span>' +
      '<b>Ler conteúdo <span aria-hidden="true">→</span></b>';

    link.addEventListener('click', function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'content_search_result_click',
        search_term: normalize(query),
        content_title: article.title,
        result_position: position + 1
      });
    });

    return link;
  };

  var render = function (value) {
    var query = value.trim();
    var hasQuery = Boolean(query);
    clear.hidden = !hasQuery;
    results.replaceChildren();

    if (!hasQuery) {
      results.hidden = true;
      empty.hidden = true;
      status.textContent = 'Digite um tema ou escolha uma busca comum.';
      return;
    }

    var matches = articles
      .map(function (article) {
        return { article: article, score: scoreArticle(article, query) };
      })
      .filter(function (item) {
        return item.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || a.article.title.localeCompare(b.article.title, 'pt-BR');
      });

    if (!matches.length) {
      results.hidden = true;
      empty.hidden = false;
      status.textContent = 'Nenhum conteúdo encontrado para “' + query + '”.';
      return;
    }

    empty.hidden = true;
    results.hidden = false;
    matches.forEach(function (item, index) {
      results.appendChild(createResult(item.article, index, query));
    });

    var noun = matches.length === 1 ? 'conteúdo encontrado' : 'conteúdos encontrados';
    status.textContent = matches.length + ' ' + noun + ' para “' + query + '”. Escolha uma leitura abaixo.';
  };

  input.addEventListener('input', function () {
    render(input.value);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      render('');
    }
  });

  clear.addEventListener('click', function () {
    input.value = '';
    render('');
    input.focus();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-search-query]'), function (button) {
    button.addEventListener('click', function () {
      input.value = button.getAttribute('data-search-query') || '';
      render(input.value);
      input.focus();
    });
  });
})();
