import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { grammarLessons } from '../src/data/grammar-lessons.ts';
import alphabet from '../src/data/alphabet.json' with { type: 'json' };

const lessonPath = '/grammar/present-auxiliary';
const exercises = grammarLessons.flatMap((lesson) =>
  lesson.blocks.flatMap((block) => block.exercises ?? []),
);
const plurals = grammarLessons.flatMap((lesson) =>
  lesson.blocks.flatMap((block) => (block.exercises ? [] : block.examples)),
);

async function grammarQuestion(page: Page) {
  await expect(page.getByRole('region', { name: 'Практика грамматики' })).toBeVisible();
  if (await page.getByRole('group', { name: 'Слова для сборки' }).isVisible()) {
    const ru = await page.locator('.grammar-translation').innerText();
    const colloquial = await page.locator('.question-card > .colloquial').isVisible();
    const exercise = exercises.find(
      (item) => item.type === 'build' && item.ru === ru && Boolean(item.variant) === colloquial,
    );
    if (!exercise || exercise.type !== 'build') throw new Error('Unknown build question');
    return {
      kind: 'build' as const,
      key: exercise.id,
      words: exercise.words,
      correct: '',
      wrong: '',
    };
  }
  const prompt = await page.locator('.grammar-prompt').innerText();
  const exercise = exercises.find((item) => item.type === 'choice' && item.prompt === prompt);
  if (exercise?.type === 'choice') {
    return {
      kind: 'choice' as const,
      key: exercise.id,
      correct: exercise.answers[0],
      wrong: exercise.options.find((option) => !exercise.answers.includes(option))!,
      words: [],
    };
  }
  const plural = plurals.find((item) => item.singular === prompt);
  if (!plural) throw new Error('Unknown plural question');
  return {
    kind: 'plural' as const,
    key: plural.singular,
    correct: plural.plural,
    wrong: plural.wrong,
    words: [],
  };
}

async function answerGrammar(page: Page, wrong = false) {
  const question = await grammarQuestion(page);
  if (question.kind === 'build') {
    const bank = page.getByRole('group', { name: 'Слова для сборки' });
    const words = wrong ? [...question.words].reverse() : question.words;
    for (const word of words)
      await bank
        .getByRole('button', { name: 'Добавить слово ' + word, exact: true })
        .and(bank.locator('button:enabled'))
        .first()
        .click();
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
  } else
    await page
      .getByRole('button', { name: wrong ? question.wrong : question.correct, exact: true })
      .click();
  await expect(page.locator('.feedback')).toHaveClass(wrong ? /bad/ : /good/);
  await expect(page.locator('.next-row button')).toBeFocused();
  return question;
}

async function nextGrammar(page: Page) {
  const next = page.locator('.next-row button');
  const finishing = (await next.innerText()) === 'Посмотреть результат';
  await next.click();
  if (finishing) await expect(page.getByRole('heading', { name: 'Практика завершена' })).toBeVisible();
  else await expect(page.locator('.feedback')).toBeEmpty();
}

test('прямые ссылки открывают и восстанавливают материалы после обновления', async ({ page }) => {
  const routes = [
    { path: '/', heading: 'Выбери буквы для тренировки' },
    { path: '/alphabet', heading: 'Выбери буквы для тренировки' },
    { path: '/grammar', heading: 'Уроки армянского языка' },
    ...grammarLessons.map((lesson) => ({ path: '/grammar/' + lesson.id, heading: lesson.title })),
    ...grammarLessons.flatMap((lesson) =>
      lesson.blocks.map((block) => ({
        path: '/grammar/' + lesson.id + '/blocks/' + block.id,
        heading: block.title,
      })),
    ),
  ];
  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeFocused();
    await page.reload();
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeFocused();
    expect(new URL(page.url()).hash).toBe('');
  }
});

for (const path of ['/missing', '/grammar/missing', lessonPath + '/blocks/missing']) {
  test('неизвестный материал: ' + path, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Материал не найден' })).toBeFocused();
    await expect(page).toHaveTitle('Материал не найден — Արմատ');
    await page.getByRole('link', { name: '← К урокам' }).click();
    await expect(page).toHaveURL('/grammar');
  });
}

test('ссылки разделов, уроков и блоков работают с историей браузера', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('link', { name: 'Грамматика', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Грамматика', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('link', { name: /Множественное число существительных/ }).click();
  await page.getByRole('link', { name: 'Изменение основы', exact: true }).click();
  await expect(page).toHaveURL('/grammar/plural-nouns/blocks/stem');
  await expect(page.getByRole('heading', { name: 'Изменение основы' })).toBeFocused();
  expect(
    await page
      .getByRole('heading', { name: 'Изменение основы' })
      .evaluate((element) => element.getBoundingClientRect().top),
  ).toBeLessThan(50);
  await expect(page.getByRole('heading', { name: 'Основное правило' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/grammar/plural-nouns');
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Изменение основы' })).toBeFocused();
});

test('выбор букв, тренировка, результат и возврат сохраняют выбор', async ({ page }) => {
  await page.goto('/alphabet');
  const start = page.getByRole('button', { name: /Начать тренировку/ });
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: 'Выбрать все', exact: true }).click();
  await expect(page.locator('.letter-card[aria-pressed="true"]')).toHaveCount(alphabet.length);
  await page.getByRole('button', { name: 'Снять выбор' }).click();
  await expect(start).toBeDisabled();
  await page.locator('.letter-card').first().click();
  await page.getByRole('link', { name: 'Грамматика', exact: true }).click();
  await page.goBack();
  await expect(page.locator('.counter')).toHaveText('Выбрано: 1');
  await start.click();
  await expect(page).toHaveURL('/alphabet');
  await page.getByRole('button', { name: alphabet[0].sound, exact: true }).click();
  await expect(page.locator('.feedback')).toHaveText('Верно! Отлично.');
  await expect(page.locator('.options button:enabled')).toHaveCount(0);
  await page.getByRole('button', { name: 'Посмотреть результат' }).click();
  await expect(page.getByRole('heading', { name: 'Тренировка завершена' })).toBeFocused();
  await expect(page.getByText('Правильных ответов: 1 из 1.')).toBeVisible();
  await page.getByRole('link', { name: 'Выбрать буквы снова' }).click();
  await expect(page.locator('.counter')).toHaveText('Выбрано: 1');
});

test('практика множественного числа повторяет только ошибочный вопрос', async ({ page }) => {
  await page.goto('/grammar/plural-nouns');
  await page
    .getByRole('region', { name: 'Нерегулярные формы', exact: true })
    .getByRole('button', { name: /Практика/ })
    .click();
  const first = await answerGrammar(page, true);
  await nextGrammar(page);
  while (await page.getByRole('region', { name: 'Практика грамматики' }).isVisible()) {
    await answerGrammar(page);
    await nextGrammar(page);
  }
  await page.getByRole('button', { name: 'Повторить ошибки' }).click();
  expect((await grammarQuestion(page)).key).toBe(first.key);
  await expect(page.locator('.progress')).toContainText('1 из 1');
  await answerGrammar(page);
  await page.getByRole('button', { name: 'Посмотреть результат' }).click();
  await expect(page.getByText('Правильных ответов: 1 из 1.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Повторить ошибки' })).toHaveCount(0);
});

test('выбор формы принимает разговорную альтернативу', async ({ page }) => {
  await page.goto(lessonPath);
  await page
    .getByRole('region', { name: 'Это…', exact: true })
    .getByRole('button', { name: 'Выбрать форму' })
    .click();
  const alternatives = page.locator('.options').getByRole('button', { name: /^(ա|չի)$/ });
  await expect(alternatives).toHaveCount(1);
  const answer = await alternatives.innerText();
  await alternatives.click();
  await expect(page.locator('.feedback')).toHaveText('Верно!');
  await expect(page.locator('.grammar-answer')).toContainText(answer);
  await expect(page.locator('.option.correct')).toHaveCount(2);
});

test('сборка поддерживает возврат, сброс и восстановление по истории', async ({
  page,
  context,
}) => {
  const path = lessonPath + '/blocks/affirmative';
  await page.goto(path);
  await page
    .getByRole('region', { name: 'Утверждение', exact: true })
    .getByRole('button', { name: 'Собрать предложение' })
    .click();
  const bank = page.getByRole('group', { name: 'Слова для сборки' });
  const answer = page.getByRole('group', { name: 'Собранное предложение' });
  const bankOrder = await bank.getByRole('button').allTextContents();
  await bank.getByRole('button').first().click();
  await expect(page.getByRole('button', { name: 'Проверить', exact: true })).toBeDisabled();
  await answer.getByRole('button').click();
  await expect(bank.getByRole('button').first()).toBeFocused();
  await bank.getByRole('button').first().click();
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(answer.getByRole('button')).toHaveCount(0);
  expect(await bank.getByRole('button').allTextContents()).toEqual(bankOrder);
  await bank.getByRole('button').first().click();
  const partial = await answer.innerText();
  const translation = await page.locator('.grammar-translation').innerText();
  await page.getByRole('link', { name: 'Буквы', exact: true }).click();
  await page.goBack();
  await expect(answer).toHaveText(partial);
  await expect(page.locator('.grammar-translation')).toHaveText(translation);
  expect(await bank.getByRole('button').allTextContents()).toEqual(bankOrder);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('heading', { name: 'Утверждение', exact: true })).toBeFocused();
  await expect(other.getByRole('region', { name: 'Практика грамматики' })).toHaveCount(0);
  await other.close();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Утверждение', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Практика грамматики' })).toHaveCount(0);
});

test('смешанная практика проходит оба формата и сохраняет образец ошибки при повторе', async ({
  page,
}) => {
  await page.goto(lessonPath);
  await page.getByRole('button', { name: /Смешанная тренировка/ }).click();
  await expect(page.getByRole('region', { name: 'Практика грамматики' })).toBeVisible();
  const formats = new Set<string>();
  let wrongKey = '';
  while (await page.getByRole('region', { name: 'Практика грамматики' }).isVisible()) {
    const question = await grammarQuestion(page);
    const wrong = question.kind === 'build' && !wrongKey;
    if (wrong) wrongKey = question.key;
    formats.add(question.kind);
    await answerGrammar(page, wrong);
    if (question.kind === 'build') {
      await expect(page.locator('.grammar-build button:enabled')).toHaveCount(0);
      if (wrong)
        await expect(page.locator('.feedback')).toHaveText('Порядок слов отличается от образца');
    }
    await nextGrammar(page);
  }
  expect([...formats].sort()).toEqual(['build', 'choice']);
  await page.getByRole('button', { name: 'Повторить ошибки' }).click();
  expect((await grammarQuestion(page)).key).toBe(wrongKey);
  await answerGrammar(page);
  await page.getByRole('button', { name: 'Посмотреть результат' }).click();
  await expect(page.getByText('Правильных ответов: 1 из 1.')).toBeVisible();
});

test('старую сессию нельзя восстановить после запуска новой', async ({ page }) => {
  await page.goto('/alphabet');
  await page.locator('.letter-card').first().click();
  await page.getByRole('button', { name: /Начать тренировку/ }).click();
  await page.getByRole('link', { name: '← К выбору букв' }).click();
  await page.getByRole('button', { name: /Начать тренировку/ }).click();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Выбери буквы для тренировки' })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Тренировка букв' })).toHaveCount(0);
});

test('выбор букв и ответы доступны с клавиатуры, результаты объявляются', async ({ page }) => {
  await page.goto('/alphabet');
  const letter = page.locator('.letter-card').first();
  await letter.focus();
  await page.keyboard.press('Space');
  await expect(letter).toHaveAttribute('aria-pressed', 'true');
  const start = page.getByRole('button', { name: /Начать тренировку/ });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.option').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByRole('button', { name: 'Посмотреть результат' })).toBeFocused();
});

test('история восстанавливает проверенный ответ и результат занятия', async ({ page }) => {
  await page.goto('/alphabet');
  await page.locator('.letter-card').first().click();
  await page.getByRole('button', { name: /Начать тренировку/ }).click();
  await page.getByRole('button', { name: alphabet[0].sound, exact: true }).click();
  await page.getByRole('link', { name: 'Грамматика', exact: true }).click();
  await page.goBack();
  await expect(page.locator('.feedback')).toHaveText('Верно! Отлично.');
  await expect(page.locator('.options button:enabled')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Посмотреть результат' })).toBeFocused();
  await page.getByRole('button', { name: 'Посмотреть результат' }).click();
  await page.getByRole('link', { name: 'Грамматика', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Тренировка завершена' })).toBeFocused();
  await expect(page.getByText('Правильных ответов: 1 из 1.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Выбери буквы для тренировки' })).toBeFocused();
  await expect(page.locator('.counter')).toHaveText('Выбрано: 0');
});

test('при возврате к собранному предложению фокус переходит к проверке', async ({ page }) => {
  await page.goto(lessonPath);
  await page
    .getByRole('region', { name: 'Вопросы', exact: true })
    .getByRole('button', { name: 'Собрать предложение' })
    .click();
  const question = await grammarQuestion(page);
  const bank = page.getByRole('group', { name: 'Слова для сборки' });
  for (const word of question.words) {
    await bank
      .getByRole('button', { name: 'Добавить слово ' + word, exact: true })
      .and(bank.locator('button:enabled'))
      .first()
      .click();
  }
  await page.getByRole('link', { name: 'Буквы', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Проверить', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback')).toHaveText('Верно!');
});

for (const width of [390, 1280]) {
  test('адаптация и шрифты на ширине ' + width, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    for (const [path, name] of [
      ['/alphabet', 'alphabet'],
      [lessonPath, 'lesson'],
    ]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect(
        await page.evaluate(
          () =>
            document.fonts.check('16px Onest') &&
            document.fonts.check('16px "Noto Serif Armenian"'),
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(name + '-' + width + '.png'),
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  });
}
