import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const errors = [];

const alphabet = JSON.parse(read('dist/alphabet.json'));
const html = read('dist/index.html');
const match = html.match(/const starterAlphabet\s*=\s*(\[[\s\S]*?\]);/);
if (!match) {
  errors.push('Не найден starterAlphabet в dist/index.html.');
} else {
  const starterAlphabet = vm.runInNewContext(match[1]);
  if (alphabet.length !== starterAlphabet.length) {
    errors.push(`Число букв различается: JSON — ${alphabet.length}, starterAlphabet — ${starterAlphabet.length}.`);
  }
  const keys = ['upper', 'lower', 'sound'];
  for (let index = 0; index < Math.max(alphabet.length, starterAlphabet.length); index++) {
    const jsonLetter = alphabet[index];
    const starterLetter = starterAlphabet[index];
    if (!jsonLetter || !starterLetter) continue;
    if (keys.some(key => jsonLetter[key] !== starterLetter[key]) ||
        Object.keys(jsonLetter).sort().join() !== keys.slice().sort().join() ||
        Object.keys(starterLetter).sort().join() !== keys.slice().sort().join()) {
      errors.push(`Буква ${index + 1} различается между JSON и starterAlphabet или имеет неверные поля.`);
    }
  }
}

const sounds = new Set();
for (const [index, letter] of alphabet.entries()) {
  if (typeof letter.sound !== 'string' || !letter.sound.trim()) {
    errors.push(`У буквы ${index + 1} нет произношения.`);
  } else if (sounds.has(letter.sound)) {
    errors.push(`Повторяется произношение «${letter.sound}».`);
  }
  sounds.add(letter.sound);
}

const sandbox = { window: {} };
vm.runInNewContext(read('dist/grammar-lessons.js'), sandbox);
const lessons = sandbox.window.grammarLessons;
if (!Array.isArray(lessons) || lessons.length === 0) {
  errors.push('В grammar-lessons.js нет уроков.');
} else {
  for (const lesson of lessons) {
    for (const block of lesson.blocks ?? []) {
      for (const example of block.examples ?? []) {
        if (typeof example.plural !== 'string' || !example.plural ||
            typeof example.wrong !== 'string' || !example.wrong ||
            example.wrong === example.plural) {
          errors.push(`Неверный вариант ответа для «${example.singular ?? '?'}» в блоке «${block.title ?? '?'}».`);
        }
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exitCode = 1;
} else {
  console.log(`✓ Данные согласованы: ${alphabet.length} букв, ${lessons.length} грамматический урок.`);
}
