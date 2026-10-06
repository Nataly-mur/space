/* ===== Бургер-меню: вставка разметки, логика, скрытие кнопок ===== */
(function(){
  "use strict";

  // ---------- HTML бургера ----------
  var html =
    '<button class="burger-btn" id="burgerBtn" aria-label="Меню">&#9776;</button>' +
    '<div class="burger-overlay" id="burgerOverlay"></div>' +
    '<nav class="burger-panel" id="burgerPanel" aria-label="Навигация">' +
      '<div class="burger-header">' +
        '<span>Меню</span>' +
        '<button class="burger-close" id="burgerClose" aria-label="Закрыть">&times;</button>' +
      '</div>' +

      '<div class="burger-group" data-group="math">' +
        '<div class="burger-group-title">Математика</div>' +
        '<div class="burger-group-list">' +
          '<a href="NOK NOD na krugah 36.html">Дроби на кругах</a>' +
          '<a href="DZ NOK NOD.html">Тренажёр НОК НОД</a>' +
          '<a href="oge_trainer_.html">Тренажёр Дроби, степени ОГЭ</a>' +
        '</div>' +
      '</div>' +

      '<div class="burger-group" data-group="algebra">' +
        '<div class="burger-group-title">Алгебра</div>' +
        '<div class="burger-group-list">' +
          '<a href="pryamaya kx 1.html">Линейная</a>' +
          '<a href="giperbola.html">Обратная пропорц. (Гипербола)</a>' +
          '<a href="Parabola + teorema Vieta new.html">Квадратичная (Парабола) + Теорема Виета</a>' +
          '<a href="Kubicheskaya f.html">Кубическая</a>' +
          '<a href="kornevaya f.html">Корневая</a>' +
          '<a href="vse func.html">Степень аргумента Х</a>' +
          '<a href="trenazher vidy func.html">Тренажёр виды функций</a>' +
          '<a href="parabola tren.html">Тренажёр парабола</a>' +
        '</div>' +
      '</div>' +

      '<div class="burger-group" data-group="geometry">' +
        '<div class="burger-group-title">Геометрия</div>' +
        '<div class="burger-group-list">' +
          '<a href="Vpisanny ugol.html">Вписанный угол</a>' +
          '<a href="vpisannaya okr v treug.html">Вписанная окружность в треугольник</a>' +
          '<a href="Vpisanny 4h ugolnik.html">Вписанный четырёхугольник</a>' +
          '<a href="Teorema cosinusov.html">Теорема косинусов</a>' +
        '</div>' +
      '</div>' +
    '</nav>';

  document.body.insertAdjacentHTML('beforeend', html);

  var btn = document.getElementById('burgerBtn');
  var panel = document.getElementById('burgerPanel');
  var overlay = document.getElementById('burgerOverlay');
  var closeBtn = document.getElementById('burgerClose');
  if (!btn || !panel) return;

  function open(){
    panel.classList.add('open');
    overlay.classList.add('open');
  }
  function close(){
    panel.classList.remove('open');
    overlay.classList.remove('open');
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') close();
  });

  // ---------- Аккордеон ----------
  var groups = panel.querySelectorAll('.burger-group');
  groups.forEach(function(group){
    var title = group.querySelector('.burger-group-title');
    if (!title) return;
    title.addEventListener('click', function(){
      var wasOpen = group.classList.contains('open');
      groups.forEach(function(g){ g.classList.remove('open'); });
      if (!wasOpen) group.classList.add('open');
    });
  });

  // ---------- Скрытие кнопки бургера ----------
  // Появление: при возврате в самое начало страницы.
  // Скрытие: мгновенно при скролле вниз или через 3 секунды бездействия.
  (function(){
    var hideTimer = null;
    var lastY = window.pageYOffset || document.documentElement.scrollTop;
    var TOP_ZONE = 30;
    var HIDE_DELAY = 3000;

    function hideNow(){
      if (panel.classList.contains('open')) return;
      btn.classList.add('hidden');
    }

    function showWithTimer(){
      btn.classList.remove('hidden');
      if (hideTimer) clearTimeout(hideTimer);
      if (panel.classList.contains('open')) return;
      hideTimer = setTimeout(hideNow, HIDE_DELAY);
    }

    function onScroll(){
      var y = window.pageYOffset || document.documentElement.scrollTop;

      if (y <= TOP_ZONE) {
        if (btn.classList.contains('hidden')) {
          showWithTimer();
        }
        lastY = y;
        return;
      }

      if (y > lastY) {
        if (hideTimer) clearTimeout(hideTimer);
        hideNow();
      }

      lastY = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    if (lastY <= TOP_ZONE) showWithTimer();
  })();

  // ---------- Скрытие кнопки «назад» ----------
  // Появление: у верхнего или нижнего края страницы.
  // Скрытие: через 3 секунды. Уезжает вправо.
  (function(){
    var backBtn = document.querySelector('.back-btn');
    if (!backBtn) return;

    var hideTimer = null;
    var EDGE_ZONE = 30;
    var HIDE_DELAY = 3000;

    function hideNow(){
      backBtn.classList.add('hidden');
    }

    function showWithTimer(){
      backBtn.classList.remove('hidden');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hideNow, HIDE_DELAY);
    }

    function onScroll(){
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var maxY = (document.documentElement.scrollHeight || document.body.scrollHeight)
                 - window.innerHeight;

      var atTop = y <= EDGE_ZONE;
      var atBottom = y >= maxY - EDGE_ZONE;

      if (atTop || atBottom) {
        if (backBtn.classList.contains('hidden')) {
          showWithTimer();
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    var y0 = window.pageYOffset || document.documentElement.scrollTop;
    var maxY0 = (document.documentElement.scrollHeight || document.body.scrollHeight)
                - window.innerHeight;
    if (y0 <= EDGE_ZONE || y0 >= maxY0 - EDGE_ZONE) {
      showWithTimer();
    }
  })();

})();