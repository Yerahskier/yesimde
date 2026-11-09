// Yesimde: выбор языка страницы. Без счётчиков и сторонних скриптов.
// Язык берётся из адреса (#kk, #ru, #en), потом из прошлого выбора, потом из
// языка браузера. Без скрипта страница показывает все три раздела подряд.
(function () {
  var langs = ['kk', 'ru', 'en'];
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem('lang'); } catch (e) { return null; }
  }
  function remember(lang) {
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  function fromBrowser() {
    var list = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i]).slice(0, 2).toLowerCase();
      if (langs.indexOf(code) >= 0) return code;
    }
    return 'en';
  }
  function fromHash() {
    var h = location.hash.slice(1);
    return langs.indexOf(h) >= 0 ? h : null;
  }

  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var links = document.querySelectorAll('.langs a');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('aria-current', links[i].hash === '#' + lang ? 'true' : 'false');
    }
    // Ссылки между страницами сайта держат выбранный язык.
    var pages = document.querySelectorAll('a[data-page]');
    for (var j = 0; j < pages.length; j++) {
      pages[j].setAttribute('href', pages[j].getAttribute('data-page') + '#' + lang);
    }
    var title = document.querySelector('meta[name="title-' + lang + '"]');
    if (title) document.title = title.content;
  }

  // Кнопки Google Play: пока приложение в закрытом тесте, у всех, кто не в тесте,
  // страница Play пустая. Тогда кнопка без ссылки и с подписью «скоро»
  // (data-soon). После выхода рабочей версии поставить true.
  var PLAY_OPEN = false;
  if (!PLAY_OPEN) {
    var play = document.querySelectorAll('a[data-play]');
    for (var p = 0; p < play.length; p++) {
      play[p].removeAttribute('href');
      play[p].setAttribute('aria-disabled', 'true');
      play[p].classList.add('soon');
    }
  }

  var hashLang = fromHash();
  var lang = hashLang || stored();
  if (langs.indexOf(lang) < 0) lang = fromBrowser();
  if (hashLang) remember(hashLang);
  apply(lang);

  window.addEventListener('hashchange', function () {
    var h = fromHash();
    if (h) { remember(h); apply(h); window.scrollTo(0, 0); }
  });
})();
