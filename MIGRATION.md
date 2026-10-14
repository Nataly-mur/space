# Миграция страниц на модуль рисования

## Структура папки после миграции

```
ОГЭ-Интерактивы/
├── index.html
├── 1-parabola-a.html
├── 2-parabola-ac.html
├── 3-parabola-am.html
├── 4-line.html
├── 5-hyperbola.html
├── 6-sqrt.html
├── 7-inscribed-angle.html
├── 8-cosine-theorem.html
├── 9-cubic.html
├── 10-vieta.html
├── 11-inscribed-quad.html
├── 13-trigonometry.html
├── MIGRATION.md
├── DRAWING-BLOCK-README.md
└── drawing/
    ├── drawing-block.css
    └── drawing-block.js
```

## Что делать для КАЖДОЙ страницы

### 1. В `<head>` добавить подключение CSS

Сразу после `<title>` и перед `<style>`:

```html
<link rel="stylesheet" href="drawing/drawing-block.css">
```

### 2. В `<style>` УДАЛИТЬ всё, что касается блока рисования

Удалить блоки стилей:
- `.board-wrap`
- `#drawCanvas`
- `.draw-toggle`
- `.draw-toolbar`
- `.tool-btn`
- `.color-circle`
- `.size-num`
- `.dropdown` и все `.dropdown.*`
- `.color-swatch`
- `.size-dropdown`, `.size-num-val`, `.row`, `.row-label`
- `.shapes-dropdown`, `.shape-btn`, `.hotkey`
- `.hotkeys-hint`
- Медиазапросы для этих элементов

**Оставить только:**
- Стили `body`, `.box`, `h2`, `p.desc`
- Стили `.controls`, `label`, `input`, `.value`, `button`
- Стили формул/контента страницы
- `.back-btn`
- Индивидуальные медиазапросы

### 3. В `<body>` — HTML блока рисования оставить как есть

Внутри `.board-wrap` — `<svg>`, `<canvas id="drawCanvas">`, кнопка-карандаш, `.hotkeys-hint`.

Панель инструментов (`<div class="draw-toolbar" id="toolbar">`) должна быть **вне** `.board-wrap` — сразу после него, в конце `<body>`.

### 4. В `<script>` — УДАЛИТЬ второй IIFE (логику рисования)

Оставить только **первый IIFE** — логику SVG.

### 5. В конце `<body>` добавить подключение JS

Перед `</body>`:

```html
<script src="drawing/drawing-block.js"></script>
```

### 6. Проверить canvas.width и canvas.height

Размеры canvas должны быть **в 2 раза больше viewBox SVG**:

```html
<!-- Если SVG viewBox="0 0 700 500" -->
<canvas id="drawCanvas" width="1400" height="1000"></canvas>
```

---

## Пошагово для каждой страницы

### Страница 1: `1-parabola-a.html`

1. В `<head>` добавить `<link rel="stylesheet" href="drawing/drawing-block.css">`.
2. В `<style>` удалить все стили блока рисования.
3. В `<body>`:
   - Оставить HTML блока рисования (canvas, кнопка, hint).
   - **Переместить** `<div class="draw-toolbar">` из `.board-wrap` в конец `<body>`.
4. В `<script>` удалить второй IIFE.
5. Перед `</body>` добавить `<script src="drawing/drawing-block.js"></script>`.
6. Открыть страницу, проверить:
   - Карандаш работает.
   - Панель появляется.
   - Перо, ластик, фигуры работают.
   - SVG-логика (ползунок, формулы) не сломалась.

### Страницы 2–13: то же самое

Повторить шаги для каждой.

---

## Проверка после миграции

На каждой странице проверить:

- [ ] Кнопка-карандаш видна вверху справа SVG.
- [ ] При клике появляется панель инструментов.
- [ ] Панель перетаскивается.
- [ ] Двойной клик по панели — сброс позиции.
- [ ] Перо рисует, цвета переключаются, размер меняется.
- [ ] Ластик стирает.
- [ ] Фигуры: L, R, D, C работают.
- [ ] Alt+перо — временные линии.
- [ ] Esc отменяет фигуру.
- [ ] Ctrl+Z / Ctrl+Shift+Z — отмена/повтор.
- [ ] SVG-логика работает (ползунки, формулы).
- [ ] Никаких ошибок в консоли браузера (F12).

---

## Если что-то не работает

### Ошибка 404 на `drawing/drawing-block.js`

**Причина:** файл не сохранён или путь неправильный.

**Решение:** убедитесь, что `drawing-block.js` лежит в подпапке `drawing/` рядом с HTML.

### Панель не появляется

**Причина:** не хватает какого-то элемента в HTML.

**Решение:** проверьте, что в HTML есть элементы с ID:
`drawCanvas`, `drawToggle`, `toolbar`, `colorBtn`, `colorCircle`, `sizeBtn`, `sizeBtnLabel`, `eraserBtn`, `shapesBtn`, `undoBtn`, `redoBtn`, `colorDropdown`, `sizeDropdown`, `shapesDropdown`, `sizeRange`, `sizeLabel`, `eraserRange`, `eraserLabel`, `hotkeysHint`.

### Рисование смещено

**Причина:** canvas имеет неверные размеры или SVG не внутри `.board-wrap`.

**Решение:** canvas.width = viewBox.width × 2, canvas.height = viewBox.height × 2. SVG — внутри `.board-wrap`.

### Блок работает, но появился «двойной» стиль

**Причина:** стили блока не удалены из `<style>` страницы.

**Решение:** удалите все стили `.board-wrap`, `.draw-*`, `.tool-btn`, `.dropdown*` из inline-стилей страницы.

---

## Почему это удобно

- **Одна правка — везде обновилось.** Нашли баг в логике — правите `drawing-block.js`, все 11 страниц работают.
- **HTML-страницы стали меньше** (~5 КБ вместо 40 КБ).
- **Легко добавлять новые интерактивы** — просто скопируйте HTML блока, подключите CSS/JS, готово.
- **Единый стиль и поведение** на всех страницах.