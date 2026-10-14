/* ============================================================
   inject-drawing.js — вставка блока рисования в HTML-страницы
   Запуск: node inject-drawing.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

// === Настройки ===
const DIR = '.';
const SKIP_FILES = ['index.html', 'menu.html', 'drawing-block-template.html'];

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function log(msg, color) { console.log((color || '') + msg + c.reset); }
function logOk(msg) { log('  ✓ ' + msg, c.green); }
function logWarn(msg) { log('  ⚠ ' + msg, c.yellow); }
function logErr(msg) { log('  ✗ ' + msg, c.red); }
function logInfo(msg) { log('  · ' + msg, c.gray); }

// === Размеры canvas для разных viewBox ===
// Ключ — "ширина_высота" из viewBox, значение — {w, h} для canvas
function calcCanvasSize(viewBoxW, viewBoxH) {
  return { w: viewBoxW * 2, h: viewBoxH * 2 };
}

// === HTML блока рисования (внутри .board-wrap) ===
function buildCanvasHTML(canvasW, canvasH) {
  return `
    <canvas id="drawCanvas" width="${canvasW}" height="${canvasH}"></canvas>

    <button class="draw-toggle" id="drawToggle" title="Режим рисования">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20 L4.5 16 L16.5 4 L20 7.5 L8 19.5 Z"/>
        <path d="M14.5 6 L18 9.5"/>
      </svg>
    </button>

    <div class="hotkeys-hint" id="hotkeysHint">
      <b>P</b> перо · <b>E</b> ластик · <b>1–6</b> цвета · <b>[ / ]</b> размер ·
      <b>L</b> прямая · <b>R</b> прямоугольник · <b>D</b> дуга · <b>C</b> окружность ·
      <b>Shift</b>+перо — прямая · <b>Alt</b>+перо — временные ·
      <b>Esc</b> — отменить фигуру · <b>Ctrl+Z</b> / <b>Ctrl+Shift+Z</b>
    </div>`;
}

// === HTML панели инструментов (в конец body) ===
const TOOLBAR_HTML = `
<div class="draw-toolbar" id="toolbar" title="Перетащите за любое место. Двойной клик — сброс.">
  <button class="tool-btn" id="colorBtn" title="Цвет: клик — перо, двойной — палитра (1–6)">
    <span class="color-circle" id="colorCircle" style="background:#d32f2f"></span>
  </button>
  <button class="tool-btn size-btn" id="sizeBtn" title="Размер ( [ / ] )">
    <span class="size-icon">✒</span>
    <span class="size-num" id="sizeBtnLabel">4</span>
  </button>
  <button class="tool-btn" id="eraserBtn" title="Ластик (E)">🧽</button>
  <button class="tool-btn" id="shapesBtn" title="Фигуры (L / R / D / C)">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <rect x="3" y="13" width="8" height="8"/>
      <circle cx="17" cy="17" r="4"/>
      <path d="M3 10 L10 3 L17 10 Z"/>
    </svg>
  </button>
  <button class="tool-btn" id="undoBtn" title="Отменить (Ctrl+Z)">↶</button>
  <button class="tool-btn" id="redoBtn" title="Повторить (Ctrl+Shift+Z)">↷</button>

  <div class="dropdown color-dropdown" id="colorDropdown">
    <button class="color-swatch" data-color="#000000" style="background:#000000" title="Чёрный (1)"></button>
    <button class="color-swatch" data-color="#1565c0" style="background:#1565c0" title="Синий (2)"></button>
    <button class="color-swatch" data-color="#2e7d32" style="background:#2e7d32" title="Зелёный (3)"></button>
    <button class="color-swatch" data-color="#fbc02d" style="background:#fbc02d" title="Жёлтый (4)"></button>
    <button class="color-swatch" data-color="#d32f2f" style="background:#d32f2f" title="Красный (5)"></button>
    <button class="color-swatch" data-color="#757575" style="background:#757575" title="Серый (6)"></button>
  </div>

  <div class="dropdown size-dropdown" id="sizeDropdown">
    <div class="row">
      <span class="row-label">✒ Перо:</span>
      <input type="range" id="sizeRange" min="1" max="30" step="1" value="4">
      <span class="size-num-val" id="sizeLabel">4</span>
    </div>
    <div class="row">
      <span class="row-label">🧽 Ластик:</span>
      <input type="range" id="eraserRange" min="4" max="120" step="1" value="8">
      <span class="size-num-val" id="eraserLabel">8</span>
    </div>
  </div>

  <div class="dropdown shapes-dropdown" id="shapesDropdown">
    <button class="shape-btn" data-shape="line" title="Прямая (L)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="4" y1="20" x2="20" y2="4"/>
      </svg>
      <span class="hotkey">L</span>
    </button>
    <button class="shape-btn" data-shape="rect" title="Прямоугольник (R)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="6" width="16" height="12"/>
      </svg>
      <span class="hotkey">R</span>
    </button>
    <button class="shape-btn" data-shape="arc" title="Дуга (D) — два клика + протяжка">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M3 19 Q12 3 21 19"/>
      </svg>
      <span class="hotkey">D</span>
    </button>
    <button class="shape-btn" data-shape="circle" title="Окружность (C)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="8"/>
      </svg>
      <span class="hotkey">C</span>
    </button>
  </div>
</div>`;

// === Уже вставлено? ===
function alreadyInjected(html) {
  return html.includes('id="drawCanvas"') && html.includes('drawing/drawing-block.js');
}

// === Получить размеры viewBox из SVG ===
function getViewBox(html) {
  const m = html.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!m) return null;
  return { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
}

// === Вставить <link> в head ===
function injectCSSLink(html) {
  if (html.includes('drawing/drawing-block.css')) return html;
  if (html.includes('</title>')) {
    return html.replace('</title>', '</title>\n<link rel="stylesheet" href="drawing/drawing-block.css">');
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', '<head>\n<link rel="stylesheet" href="drawing/drawing-block.css">');
  }
  return html;
}

// === Вставить canvas + toggle + hint внутрь .board-wrap (после SVG) ===
function injectCanvasIntoBoardWrap(html, canvasW, canvasH) {
  // Ищем закрывающий </svg> внутри .board-wrap и вставляем после него
  const boardWrapIdx = html.indexOf('class="board-wrap"');
  if (boardWrapIdx === -1) {
    return { html, ok: false, reason: 'не найден .board-wrap' };
  }

  // Находим </svg> после board-wrap
  const svgCloseIdx = html.indexOf('</svg>', boardWrapIdx);
  if (svgCloseIdx === -1) {
    return { html, ok: false, reason: 'не найден </svg> внутри .board-wrap' };
  }

  const insertPos = svgCloseIdx + '</svg>'.length;
  const canvasBlock = buildCanvasHTML(canvasW, canvasH);

  const newHtml = html.slice(0, insertPos) + canvasBlock + html.slice(insertPos);
  return { html: newHtml, ok: true };
}

// === Вставить toolbar + script перед </body> ===
function injectToolbarAndScript(html) {
  let result = html;
  const block = TOOLBAR_HTML + '\n<script src="drawing/drawing-block.js"></script>';
  if (result.includes('</body>')) {
    result = result.replace('</body>', block + '\n</body>');
  }
  return result;
}

// === Обработка одного файла ===
function processFile(filePath) {
  const fileName = path.basename(filePath);
  log('\n📄 ' + c.bold + fileName + c.reset, c.cyan);

  const html = fs.readFileSync(filePath, 'utf8');

  if (alreadyInjected(html)) {
    logInfo('Блок рисования уже вставлен — пропуск');
    return { skipped: true };
  }

  // Проверим наличие .board-wrap
  if (!html.includes('class="board-wrap"')) {
    logWarn('Не найден .board-wrap — пропуск');
    return { skipped: true };
  }

  // Получим viewBox
  const vb = getViewBox(html);
  if (!vb) {
    logWarn('Не найден viewBox — пропуск');
    return { skipped: true };
  }

  const canvasSize = calcCanvasSize(vb.w, vb.h);
  logInfo(`viewBox: ${vb.w}×${vb.h} → canvas: ${canvasSize.w}×${canvasSize.h}`);

  let current = html;

  // 1. <link> на CSS
  current = injectCSSLink(current);
  logOk('CSS-модуль подключён в <head>');

  // 2. Canvas внутрь .board-wrap
  const canvasResult = injectCanvasIntoBoardWrap(current, canvasSize.w, canvasSize.h);
  if (!canvasResult.ok) {
    logErr('Не удалось вставить canvas: ' + canvasResult.reason);
    return { failed: true };
  }
  current = canvasResult.html;
  logOk('Canvas + кнопка + hint вставлены в .board-wrap');

  // 3. Toolbar + <script> перед </body>
  current = injectToolbarAndScript(current);
  logOk('Панель инструментов и <script> модуля добавлены');

  // Сохранить
  fs.writeFileSync(filePath + '.bak', html, 'utf8');
  fs.writeFileSync(filePath, current, 'utf8');
  logOk(`Сохранено (резервная копия: ${fileName}.bak)`);

  return { ok: true };
}

// === Основная функция ===
function main() {
  log('\n' + c.bold + '🔧 Вставка блока рисования в HTML-страницы' + c.reset, c.cyan);
  log('Папка: ' + path.resolve(DIR));

  const files = fs.readdirSync(DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => !SKIP_FILES.includes(f));

  if (files.length === 0) {
    logErr('HTML-файлы не найдены');
    return;
  }

  log(`\nНайдено файлов: ${files.length}\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (const file of files) {
    try {
      const r = processFile(path.join(DIR, file));
      if (r.skipped) skipped++;
      else if (r.failed) failed++;
      else ok++;
    } catch (e) {
      logErr('Ошибка: ' + e.message);
      failed++;
    }
  }

  log('\n' + c.bold + '📊 Итог:' + c.reset);
  log(`  Вставлено: ${ok}`, c.green);
  log(`  Пропущено: ${skipped}`, c.gray);
  if (failed) log(`  Ошибок: ${failed}`, c.red);

  if (ok > 0) {
    log('\n💡 Проверьте 2–3 страницы в браузере.', c.yellow);
    log('💡 Если что-то сломалось — восстановите из *.bak (node restore.js)\n', c.yellow);
  }
}

main();