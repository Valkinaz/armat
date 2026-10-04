import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { grammarLessons as lessons } from '../src/data/grammar-lessons.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const errors = [];

const alphabet = JSON.parse(read('src/data/alphabet.json'));
const keys = ['upper', 'lower', 'sound'];
for (const [index, letter] of alphabet.entries()) {
  if (
    Object.keys(letter).sort().join() !== keys.slice().sort().join() ||
    keys.some((key) => typeof letter[key] !== 'string' || !letter[key].trim())
  ) {
    errors.push(`У буквы ${index + 1} неверные или пустые поля.`);
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

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const lessonIds = new Set();
if (!Array.isArray(lessons) || lessons.length === 0) {
  errors.push('В grammar-lessons.ts нет уроков.');
} else {
  for (const lesson of lessons) {
    check(
      hasText(lesson.id) && !lessonIds.has(lesson.id),
      `Некорректный или повторный id урока: ${lesson.id}.`,
    );
    lessonIds.add(lesson.id);
    check(
      hasText(lesson.title) && hasText(lesson.lead) && lesson.blocks?.length > 0,
      `Нет описания или блоков в уроке ${lesson.id}.`,
    );
    const blockIds = new Set(),
      exampleIds = new Set(),
      exerciseIds = new Set();
    for (const block of lesson.blocks ?? []) {
      check(
        hasText(block.id) && !blockIds.has(block.id),
        `Некорректный или повторный id блока в ${lesson.id}.`,
      );
      blockIds.add(block.id);
      check(
        hasText(block.title) &&
          hasText(block.rule) &&
          hasText(block.detail) &&
          block.examples?.length > 0,
        `Пустой блок ${block.id}.`,
      );
      for (const example of block.examples ?? []) {
        check(
          hasText(example.ru) && hasText(example.note),
          `Нет перевода или объяснения в блоке ${block.id}.`,
        );
        if (!block.exercises) {
          check(
            hasText(example.singular) &&
              hasText(example.plural) &&
              hasText(example.wrong) &&
              example.wrong !== example.plural,
            `Неверный вариант ответа для «${example.singular ?? '?'}» в блоке «${block.title ?? '?'}».`,
          );
          continue;
        }
        check(
          hasText(example.id) && !exampleIds.has(example.id),
          `Некорректный или повторный id примера: ${example.id}.`,
        );
        exampleIds.add(example.id);
        check(
          hasText(example.sentence) && hasText(example.form),
          `Нет предложения или формы в ${example.id}.`,
        );
        check(
          example.colloquial === undefined || hasText(example.colloquial),
          `Пустой разговорный вариант в ${example.id}.`,
        );
        const words = (example.sentence || '').split(' '),
          index = example.verbIndex ?? words.length - 1;
        check(
          Number.isInteger(index) && words[index]?.replace(/։$/, '') === example.form,
          `Форма глагола не соответствует указанному слову в ${example.id}.`,
        );
        check(
          block.exercises.some((item) => item.exampleId === example.id && item.type === 'choice'),
          `Нет выбора формы для ${example.id}.`,
        );
        check(
          block.exercises.some(
            (item) => item.exampleId === example.id && item.type === 'build' && !item.variant,
          ),
          `Нет сборки основного образца для ${example.id}.`,
        );
        if (example.colloquial)
          check(
            block.exercises.some(
              (item) => item.exampleId === example.id && item.variant === 'colloquial',
            ),
            `Нет сборки разговорного образца для ${example.id}.`,
          );
      }
      for (const item of block.exercises ?? []) {
        const context = `Задание ${item.id}`;
        check(
          hasText(item.id) && !exerciseIds.has(item.id),
          `${context}: некорректный или повторный id.`,
        );
        exerciseIds.add(item.id);
        const example = block.examples.find((example) => example.id === item.exampleId);
        check(Boolean(example), `${context}: не найден исходный пример.`);
        if (!example) continue;
        check(
          item.ru === example.ru &&
            item.note === example.note &&
            item.colloquial === example.colloquial,
          `${context}: перевод, пояснение или разговорный пример расходятся с источником.`,
        );
        check(
          item.variant === undefined || item.variant === 'colloquial',
          `${context}: неизвестный вариант речи.`,
        );
        check(
          item.sentence === (item.variant === 'colloquial' ? example.colloquial : example.sentence),
          `${context}: неверный образец ответа.`,
        );
        if (item.type === 'choice') {
          check(item.variant === undefined, `${context}: выбор формы использует основной образец.`);
          check(
            hasText(item.prompt) && item.prompt.split('___').length === 2,
            `${context}: должен быть ровно один пропуск.`,
          );
          check(
            item.prompt?.replace('___', example.form) === example.sentence,
            `${context}: пропуск не соответствует исходному предложению.`,
          );
          const accepted =
            example.form === 'է'
              ? ['է', 'ա']
              : example.form === 'չէ'
                ? ['չէ', 'չի']
                : [example.form];
          check(
            Array.isArray(item.answers) &&
              item.answers.length === accepted.length &&
              accepted.every((form) => item.answers.includes(form)),
            `${context}: потеряна или добавлена допустимая форма.`,
          );
          check(
            Array.isArray(item.options) &&
              item.options.length === 4 &&
              new Set(item.options).size === 4 &&
              item.options.every(hasText),
            `${context}: нужны четыре разных варианта ответа.`,
          );
          check(
            accepted.every((form) => item.options?.includes(form)),
            `${context}: допустимая форма отсутствует среди вариантов.`,
          );
        } else if (item.type === 'build') {
          check(
            Array.isArray(item.words) &&
              item.words.length > 1 &&
              item.words.every(hasText) &&
              item.words.join(' ') === item.sentence,
            `${context}: слова не собираются в образец.`,
          );
        } else {
          errors.push(`${context}: неизвестный тип ${item.type}.`);
        }
      }
    }
  }
}

const auxiliary = lessons?.find((lesson) => lesson.id === 'present-auxiliary');
check(Boolean(auxiliary), 'Не найден урок о вспомогательном глаголе.');
if (auxiliary) {
  for (const [blockId, expected] of [
    ['affirmative', ['եմ', 'ես', 'է', 'ենք', 'եք', 'են']],
    ['negative', ['չեմ', 'չես', 'չէ', 'չենք', 'չեք', 'չեն']],
  ]) {
    const forms =
      auxiliary.blocks
        .find((block) => block.id === blockId)
        ?.examples.filter((example) => example.person)
        .map((example) => example.form) || [];
    check(
      forms.length === expected.length && expected.every((form) => forms.includes(form)),
      `В блоке ${blockId} не представлены все шесть лиц.`,
    );
  }
  // Ключ к заданиям «Перевести» из урока, согласованный при подготовке материала.
  const translations = [
    ['Я музыкант.', 'Ես երաժիշտ եմ։'],
    ['Он полицейский.', 'Նա ոստիկան է։'],
    ['Это вода.', 'Սա ջուր է։'],
    ['Нет, это не вода.', 'Ոչ, սա ջուր չէ։'],
    ['Мы студенты.', 'Մենք ուսանողներ ենք։'],
    ['Я не врач.', 'Ես բժիշկ չեմ։'],
    ['Они не русские.', 'Նրանք ռուսներ չեն։'],
    ['Я голоден.', 'Ես սոված եմ։'],
    ['Он хороший человек.', 'Նա լավ մարդ է։'],
    ['Они хорошие люди.', 'Նրանք լավ մարդիկ են։'],
    ['Уже темно.', 'Արդեն մութ է։'],
    ['Сегодня воскресенье.', 'Այսօր կիրակի է։'],
    ['Я не уставший.', 'Ես հոգնած չեմ։'],
    ['Ты уставший?', 'Դու հոգնա՞ծ ես։'],
    ['Ты прав.', 'Դու ճիշտ ես։'],
    ['Мы правы.', 'Մենք ճիշտ ենք։'],
    ['Я не больна.', 'Ես հիվանդ չեմ։'],
  ];
  const examples = auxiliary.blocks.flatMap((block) => block.examples);
  for (const [ru, sentence] of translations)
    check(
      examples.some((example) => example.ru === ru && example.sentence === sentence),
      `Нет согласованного перевода «${ru}».`,
    );
}

if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exitCode = 1;
} else {
  console.log(`✓ Данные согласованы: ${alphabet.length} букв; уроков — ${lessons.length}.`);
}
