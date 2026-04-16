/**
 * Генератор иконок SmartBook
 *
 * Запуск:
 *   npm install --save-dev sharp
 *   node scripts/generate-icons.js
 *
 * Генерирует:
 *   assets/icon.png          — 1024×1024, основная иконка (iOS / web)
 *   assets/adaptive-icon.png — 1024×1024, иконка Android (adaptive)
 *   assets/splash-icon.png   — 512×512,   splash screen
 *   assets/favicon.png       — 64×64,     браузерная вкладка
 */

const path = require('path');
const fs   = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('❌  sharp не установлен. Выполни: npm install --save-dev sharp');
  process.exit(1);
}

const SVG    = path.join(__dirname, 'icon.svg');
const ASSETS = path.join(__dirname, '..', 'assets');

async function gen(buf, size, file) {
  await sharp(buf).resize(size, size).png().toFile(path.join(ASSETS, file));
  console.log(`  ✔  ${file}  (${size}×${size})`);
}

async function main() {
  const buf = fs.readFileSync(SVG);
  console.log('\n🎨  Генерируем иконки SmartBook...\n');
  await gen(buf, 1024, 'icon.png');
  await gen(buf, 1024, 'adaptive-icon.png');
  await gen(buf, 512,  'splash-icon.png');
  await gen(buf,  64,  'favicon.png');
  console.log('\n✅  Готово! Перезапусти Expo: npx expo start --clear\n');
}

main().catch(err => {
  console.error('\n❌  Ошибка:', err.message);
  process.exit(1);
});
