/* ============================================================
   restore.js — восстановление HTML-файлов из .bak
   Запуск: node restore.js
   ============================================================ */

const fs = require('fs');

const c = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m' };

console.log(c.bold + '\n♻️  Восстановление из .bak\n' + c.reset);

const files = fs.readdirSync('.').filter(f => f.endsWith('.html.bak'));

if (files.length === 0) {
  console.log(c.yellow + 'Файлов .bak не найдено.' + c.reset);
  process.exit(0);
}

console.log(`Найдено: ${files.length}\n`);

let ok = 0;
for (const bak of files) {
  const original = bak.replace(/\.bak$/, '');
  try {
    fs.copyFileSync(bak, original);
    console.log(c.green + '  ✓ ' + original + c.reset);
    ok++;
  } catch (e) {
    console.log(c.red + '  ✗ ' + original + ': ' + e.message + c.reset);
  }
}

console.log(c.bold + `\nВосстановлено: ${ok}\n` + c.reset);