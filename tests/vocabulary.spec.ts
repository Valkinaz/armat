import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { vocabularyEntries, vocabularySets } from '../src/data/vocabulary.ts';
import type { VocabularyDirection } from '../src/data/types.ts';

const heading = 'Выбери наборы для тренировки';
const directionLabels = { 'hy-ru': 'Армянский → русский', 'ru-hy': 'Русский → армянский' };
const setEntries = (id: string) => vocabularyEntries.filter((entry) =>
  vocabularySets.find((set) => set.id === id)!.entryIds.includes(entry.id));

async function startWords(page: Page, title: string, direction: VocabularyDirection) {
  await page.goto('/words');
  await page.getByRole('button', { name: title, exact: true }).click();
  await page.getByRole('radio', { name: directionLabels[direction], exact: true }).check();
  await page.getByRole('radio', { name: 'Все', exact: true }).check();
  await page.getByRole('button', { name: /Начать тренировку/ }).click();
  await expect(page.getByRole('region', { name: 'Тренировка слов' })).toBeVisible();
}

async function currentWord(page: Page, direction: VocabularyDirection) {
  const prompt = await page.locator('.vocabulary-prompt').innerText();
  const entries = vocabularyEntries.filter((entry) =>
    direction === 'hy-ru' ? entry.hy === prompt : entry.meanings.includes(prompt));
  expect(entries.length).toBeGreaterThan(0);
  const answers = direction === 'hy-ru' ? [entries[0].meanings.join('; ')] : entries.map((entry) => entry.hy);
  return { prompt, entries, answers };
}

async function answerWord(page: Page, direction: VocabularyDirection, wrong = false) {
  const question = await currentWord(page, direction);
  const options = await page.locator('.option').allTextContents();
  const value = wrong ? options.find((option) => !question.answers.includes(option))!
    : direction === 'ru-hy' ? (question.entries.find((entry) => entry.colloquial)?.hy ?? question.answers[0])
    : question.answers[0];
  await page.locator('.options').getByRole('button', { name: value, exact: true }).click();
  await expect(page.locator('.feedback')).toHaveClass(wrong ? /bad/ : /good/);
  await expect(page.locator('.option.correct')).toHaveCount(question.answers.length);
  await expect(page.locator('.options button:enabled')).toHaveCount(0);
  await expect(page.locator('.next-row button')).toBeFocused();
  return question;
}

test('наборы раскрываются независимо от выбора, настройки и счётчик сохраняются до перезагрузки', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('link', { name: 'Слова', exact: true }).click();
  await expect(page).toHaveURL('/words');
  await expect(page.getByRole('heading', { name: heading })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Слова', exact: true })).toHaveAttribute('aria-current', 'page');
  const start = page.getByRole('button', { name: /Начать тренировку/ });
  await expect(start).toBeDisabled();
  const week = page.getByRole('region', { name: 'Дни недели', exact: true });
  await week.getByText('Посмотреть слова', { exact: true }).click();
  await expect(week.getByText('неделя; суббота', { exact: true })).toBeVisible();
  await expect(week.getByRole('button', { name: 'Дни недели' })).toHaveAttribute('aria-pressed', 'false');
  await expect(start).toBeDisabled();
  await week.getByRole('button', { name: 'Дни недели' }).focus();
  await page.keyboard.press('Space');
  await expect(week.getByRole('button', { name: 'Дни недели' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Приветствия', exact: true }).click();
  await expect(page.locator('.counter')).toHaveText('Выбрано наборов: 2');
  await expect(start).toHaveText(`Начать тренировку · ${Math.min(20, setEntries('weekdays').length + setEntries('greetings').length)}`);
  await page.getByRole('button', { name: 'Выбрать все', exact: true }).click();
  await expect(page.locator('.vocabulary-select[aria-pressed="true"]')).toHaveCount(vocabularySets.length);
  await page.getByRole('button', { name: 'Снять выбор', exact: true }).click();
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: 'Семья', exact: true }).click();
  await page.getByRole('radio', { name: directionLabels['ru-hy'], exact: true }).check();
  await expect(start).toHaveText('Начать тренировку · 20');
  await page.getByRole('radio', { name: 'Все', exact: true }).check();
  const count = new Set(setEntries('family').flatMap((entry) => entry.meanings)).size;
  await expect(start).toHaveText(`Начать тренировку · ${count}`);
  await page.getByRole('link', { name: 'Грамматика', exact: true }).click();
  await page.getByRole('link', { name: 'Слова', exact: true }).click();
  await expect(page.getByRole('radio', { name: directionLabels['ru-hy'], exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Все', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Семья', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(start).toBeDisabled();
  await expect(page.getByRole('radio', { name: directionLabels['hy-ru'], exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: '20 вопросов', exact: true })).toBeChecked();
});

for (const direction of ['hy-ru', 'ru-hy'] as const) {
  test(`${direction}: полный проход, повтор ошибки и новый запуск с исходными настройками`, async ({ page }) => {
    await startWords(page, 'Дни недели', direction);
    const expectedCount = direction === 'hy-ru' ? setEntries('weekdays').length
      : new Set(setEntries('weekdays').flatMap((entry) => entry.meanings)).size;
    const seen: string[] = [];
    const training = page.getByRole('region', { name: 'Тренировка слов' });
    while (await training.isVisible()) {
      await expect(page.locator('.teacher-acknowledgment')).toHaveCount(0);
      await expect(page.locator('.vocabulary-direction')).toHaveText(directionLabels[direction]);
      await expect(page.locator('.vocabulary-explanation')).toHaveCount(0);
      await expect(page.locator('.option').first()).toBeFocused();
      const question = await answerWord(page, direction, seen.length === 0);
      seen.push(question.prompt);
      await expect(page.locator('.vocabulary-explanation')).toContainText(question.entries[0].hy);
      await page.locator('.next-row button').click();
    }
    expect(seen).toHaveLength(expectedCount);
    expect(new Set(seen).size).toBe(expectedCount);
    await expect(page.getByText(`Правильных ответов: ${expectedCount - 1} из ${expectedCount}.`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Тренировка завершена' })).toBeFocused();
    await expect(page.locator('.teacher-acknowledgment')).toHaveCount(0);
    await page.getByRole('button', { name: 'Повторить ошибки' }).click();
    await expect(page.locator('.vocabulary-prompt')).toHaveText(seen[0]);
    await expect(page.locator('.vocabulary-direction')).toHaveText(directionLabels[direction]);
    await expect(page.locator('.progress')).toContainText('Вопрос 1 из 1');
    await answerWord(page, direction);
    await page.getByRole('button', { name: 'Посмотреть результат' }).click();
    await expect(page.getByRole('button', { name: 'Повторить ошибки' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'К выбору наборов', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.locator('.teacher-acknowledgment')).toBeVisible();
    await page.getByRole('button', { name: 'Дни недели', exact: true }).click();
    await page.getByRole('button', { name: 'Приветствия', exact: true }).click();
    const otherDirection = direction === 'hy-ru' ? 'ru-hy' : 'hy-ru';
    await page.getByRole('radio', { name: directionLabels[otherDirection], exact: true }).check();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Тренировка завершена' })).toBeFocused();
    await page.getByRole('button', { name: 'Пройти ещё раз' }).click();
    await expect(page.locator('.progress')).toContainText(`Вопрос 1 из ${expectedCount}`);
    await expect(page.locator('.vocabulary-direction')).toHaveText(directionLabels[direction]);
    expect(seen).toContain(await page.locator('.vocabulary-prompt').innerText());
    await page.goBack();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(training).toHaveCount(0);
  });
}

test('обратная тренировка принимает разговорные формы и показывает все правильные варианты', async ({ page }) => {
  await startWords(page, 'Семья', 'ru-hy');
  let alternatives = 0;
  while (await page.getByRole('region', { name: 'Тренировка слов' }).isVisible()) {
    const question = await currentWord(page, 'ru-hy');
    if (question.answers.length > 1) {
      await expect(page.locator('.prompt')).toHaveText('Выбери любой подходящий вариант');
      alternatives++;
    }
    await answerWord(page, 'ru-hy');
    if (question.entries.some((entry) => entry.colloquial))
      await expect(page.locator('.vocabulary-explanation')).toContainText('(разг.)');
    await page.locator('.next-row button').click();
  }
  expect(alternatives).toBeGreaterThan(0);
  const count = new Set(setEntries('family').flatMap((entry) => entry.meanings)).size;
  await expect(page.getByText(`Правильных ответов: ${count} из ${count}.`)).toBeVisible();
});

test('история восстанавливает ответы, вопросы не создают шагов, новая вкладка и перезагрузка сбрасывают сессию', async ({ page, context }) => {
  await startWords(page, 'Месяцы', 'hy-ru');
  const first = await answerWord(page, 'hy-ru');
  await page.getByRole('link', { name: 'Грамматика', exact: true }).click();
  await page.goBack();
  await expect(page.locator('.vocabulary-prompt')).toHaveText(first.prompt);
  await expect(page.locator('.feedback')).toHaveText('Верно!');
  await expect(page.locator('.options button:enabled')).toHaveCount(0);
  await expect(page.locator('.next-row button')).toBeFocused();
  await page.locator('.next-row button').click();
  const second = await page.locator('.vocabulary-prompt').innerText();
  await page.goBack();
  await expect(page.getByRole('heading', { name: heading })).toBeFocused();
  await page.goForward();
  await expect(page.locator('.vocabulary-prompt')).toHaveText(second);
  await expect(page.locator('.feedback')).toBeEmpty();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('heading', { name: heading })).toBeFocused();
  await expect(other.getByRole('button', { name: /Начать тренировку/ })).toBeDisabled();
  await other.close();
  await page.reload();
  await expect(page.getByRole('heading', { name: heading })).toBeFocused();
  await expect(page.getByRole('button', { name: /Начать тренировку/ })).toBeDisabled();
});

test('клавиатурные ответы объявляются; новая тренировка букв заменяет словарную сессию', async ({ page }) => {
  await page.goto('/words');
  await page.getByRole('button', { name: 'Месяцы', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: /Начать тренировку/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.option').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.next-row button')).toBeFocused();
  await page.getByRole('link', { name: 'Буквы', exact: true }).click();
  await page.locator('.letter-card').first().click();
  await page.getByRole('button', { name: /Начать тренировку/ }).click();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole('heading', { name: heading })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Тренировка слов' })).toHaveCount(0);
});

for (const width of [390, 1280]) {
  test(`словарь и длинные вопросы помещаются на ширине ${width}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/words');
    await page.getByRole('region', { name: 'Дни недели', exact: true }).getByText('Посмотреть слова').click();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`words-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const [direction, set, target] of [
      ['hy-ru', 'Приветствия', 'Շնորհակալություն'],
      ['ru-hy', 'Семья', 'тётя (папина сестра)'],
    ] as const) {
      await startWords(page, set, direction);
      while (await page.locator('.vocabulary-prompt').innerText() !== target) {
        await answerWord(page, direction);
        await page.locator('.next-row button').click();
      }
      await expect(page.locator('.vocabulary-prompt')).toHaveAttribute('lang', direction === 'hy-ru' ? 'hy' : 'ru');
      await expect(page.locator('.option').first()).toHaveAttribute('lang', direction === 'hy-ru' ? 'ru' : 'hy');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.locator('.option').evaluateAll((options) => options.every((option) => option.scrollWidth <= option.clientWidth + 1))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`question-${direction}-${width}.png`), fullPage: true });
      await answerWord(page, direction);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`answer-${direction}-${width}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
