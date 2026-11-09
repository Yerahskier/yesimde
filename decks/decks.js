// Yesimde: страница «Колоды сообщества». Список строится из того же
// decks/catalog.json, что читает приложение; примеры карточек — поле samples,
// его пишет tool/make_deck_catalog.py. Формулы рисует KaTeX с этого сайта.
(function () {
  var TEXT = {
    kk: {
      cards: function (n) { return n + ' карточка'; },
      zip: 'ZIP жүктеу', kb: 'КБ', mb: 'МБ',
      samples: 'Карточкалар мысалы', error: 'Каталог жүктелмеді. Бетті кейінірек жаңартыңыз.'
    },
    ru: {
      cards: function (n) {
        var m10 = n % 10, m100 = n % 100;
        var w = m10 === 1 && m100 !== 11 ? 'карточка'
          : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'карточки' : 'карточек';
        return n + ' ' + w;
      },
      zip: 'Скачать ZIP', kb: 'КБ', mb: 'МБ',
      samples: 'Примеры карточек', error: 'Каталог не загрузился. Обновите страницу позже.'
    },
    en: {
      cards: function (n) { return n + (n === 1 ? ' card' : ' cards'); },
      zip: 'Download ZIP', kb: 'KB', mb: 'MB',
      samples: 'Sample cards', error: 'The catalog did not load. Please refresh the page later.'
    }
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function size(bytes, t, lang) {
    var kb = bytes / 1024;
    var num = function (v, d) { return v.toLocaleString(lang, { maximumFractionDigits: d }); };
    return kb < 1024 ? num(Math.max(1, Math.round(kb)), 0) + ' ' + t.kb
      : num(kb / 1024, 1) + ' ' + t.mb;
  }

  function languageName(code, lang) {
    try {
      var name = new Intl.DisplayNames([lang], { type: 'language' }).of(code);
      if (name && name !== code) return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
    } catch (e) {}
    return code;
  }

  // Текст с формулами по правилам docs/deck-format.md: $$…$$ — отдельной
  // строкой, $…$ — внутри текста (без пробела у знаков и без цифры сразу за
  // закрывающим), \$ — просто доллар.
  function rich(text) {
    var out = document.createDocumentFragment();
    var buf = '';
    function flush() { if (buf) { out.appendChild(document.createTextNode(buf)); buf = ''; } }
    function math(tex, display) {
      var span = el('span', display ? 'math math-block' : 'math');
      try {
        window.katex.render(tex, span, { displayMode: display, throwOnError: false });
      } catch (e) {
        span.textContent = tex;
      }
      out.appendChild(span);
    }
    var i = 0;
    while (i < text.length) {
      var c = text.charAt(i);
      if (c === '\\' && text.charAt(i + 1) === '$') { buf += '$'; i += 2; continue; }
      if (c === '$' && window.katex) {
        if (text.charAt(i + 1) === '$') {
          var end = text.indexOf('$$', i + 2);
          if (end > i + 2) { flush(); math(text.slice(i + 2, end), true); i = end + 2; continue; }
        } else {
          var close = -1;
          for (var j = i + 1; j < text.length; j++) {
            if (text.charAt(j) === '$' && text.charAt(j - 1) !== '\\') { close = j; break; }
          }
          var tex = close > 0 ? text.slice(i + 1, close) : '';
          if (tex && !/^\s|\s$/.test(tex) && !/\d/.test(text.charAt(close + 1))) {
            flush(); math(tex, false); i = close + 1; continue;
          }
        }
      }
      buf += c;
      i++;
    }
    flush();
    return out;
  }

  function richEl(tag, cls, text) {
    var node = el(tag, cls);
    node.appendChild(rich(String(text)));
    return node;
  }

  function sample(card, lang) {
    var box = el('div', 'sample');
    box.appendChild(richEl('div', 'sample-front', card.word || ''));
    var back = el('div', 'sample-back');
    var tr = card.translations || {};
    var keys = Object.keys(tr);
    if (keys.length) {
      var key = tr[lang] ? lang : keys[0];
      back.appendChild(richEl('div', 'sample-main', tr[key]));
    }
    (card.lines || []).forEach(function (line) {
      var row = el('div', 'sample-line');
      if (line.label) row.appendChild(el('span', 'sample-label', line.label));
      row.appendChild(richEl('span', 'sample-text', line.text));
      back.appendChild(row);
    });
    if (card.definition) back.appendChild(richEl('div', 'sample-def', card.definition));
    box.appendChild(back);
    return box;
  }

  function render(section, decks, lang) {
    var t = TEXT[lang];
    var list = section.querySelector('[data-decks]');
    list.textContent = '';
    // Колоды на языке страницы выше, остальное в порядке каталога (как в приложении).
    var sorted = decks.filter(function (d) { return d.language === lang; })
      .concat(decks.filter(function (d) { return d.language !== lang; }));
    sorted.forEach(function (deck) {
      var item = el('article', 'deck');
      item.appendChild(el('h2', null, deck.title));
      item.appendChild(el('p', 'deck-meta', [
        languageName(deck.language, lang), t.cards(deck.cards), size(deck.size, t, lang)
      ].join(' · ')));
      item.appendChild(el('p', 'deck-desc', deck.description));
      if (deck.samples && deck.samples.length) {
        var samples = el('div', 'samples');
        samples.setAttribute('aria-label', t.samples);
        deck.samples.forEach(function (card) { samples.appendChild(sample(card, lang)); });
        item.appendChild(samples);
      }
      var actions = el('p', 'actions');
      var zip = el('a', 'btn btn-quiet', t.zip);
      zip.href = '/decks/' + encodeURIComponent(deck.file);
      zip.setAttribute('download', '');
      actions.appendChild(zip);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function start() {
    var sections = document.querySelectorAll('.lang-section');
    fetch('/decks/catalog.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (catalog) {
        var decks = (catalog.decks || []).filter(function (d) {
          return d && d.title && d.file && /^[^/\\]+\.zip$/.test(d.file);
        });
        for (var i = 0; i < sections.length; i++) {
          render(sections[i], decks, sections[i].getAttribute('data-l'));
        }
      })
      .catch(function () {
        for (var i = 0; i < sections.length; i++) {
          var list = sections[i].querySelector('[data-decks]');
          list.textContent = '';
          list.appendChild(el('p', 'notice', TEXT[sections[i].getAttribute('data-l')].error));
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
