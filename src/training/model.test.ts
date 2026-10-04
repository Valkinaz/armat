import { describe, expect, it } from 'vitest';
import alphabet from '../data/alphabet.json';
import { grammarLessons } from '../data/grammar-lessons.ts';
import type { BuildExercise, SentenceBlock } from '../data/types.ts';
import {
  acceptedAnswers,
  alphabetQuestions,
  blockItems,
  createSession,
  evaluateAnswer,
  grammarQuestions,
  mixedBlockItems,
  prepareGrammarQuestion,
  retryQuestions,
  sessionReducer,
} from './model.ts';
import type { Question, Session } from './model.ts';

const auxiliary = grammarLessons.find((lesson) => lesson.id === 'present-auxiliary')!;
const sentenceBlock = auxiliary.blocks[0] as SentenceBlock;
const constantRandom = () => 0.25;
function session(questions: Question[]): Session {
  return createSession({
    id: 'session',
    originPath: '/grammar/present-auxiliary',
    kind: 'grammar',
    mode: 'Утверждение',
    questions,
  });
}
const repeated: BuildExercise = {
  id: 'repeated',
  exampleId: 'example',
  type: 'build',
  words: ['слово', 'слово', 'ещё'],
  sentence: 'слово слово ещё',
  ru: 'Тест повторяющихся слов',
  note: 'Тест',
};

describe('подготовка вопросов', () => {
  it('включает только выбранные буквы, с правильным ответом и разными вариантами', () => {
    const questions = alphabetQuestions(alphabet.slice(2, 5), alphabet, constantRandom);
    expect(
      questions.map((question) => question.kind === 'letter' && question.letter.upper).sort(),
    ).toEqual(
      alphabet
        .slice(2, 5)
        .map((letter) => letter.upper)
        .sort(),
    );
    for (const question of questions) {
      if (question.kind !== 'letter') throw new Error('Expected letter');
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options).toContain(question.letter.sound);
    }
  });

  it('раздельная практика содержит только выбранный формат и не меняет источник', () => {
    const before = structuredClone(sentenceBlock);
    for (const mode of ['choice', 'build'] as const) {
      const items = blockItems(sentenceBlock, mode, constantRandom);
      expect(items.length).toBeLessThanOrEqual(6);
      expect(items.every((item) => 'type' in item && item.type === mode)).toBe(true);
    }
    expect(sentenceBlock).toEqual(before);
  });

  it('смешанная практика сочетает форматы без повторения одного примера', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let value = seed;
      const random = () => {
        value = (value * 16807) % 2147483647;
        return value / 2147483647;
      };
      for (const block of auxiliary.blocks) {
        const items = mixedBlockItems(block, random);
        expect(items).toHaveLength(Math.min(3, block.examples.length));
        const exercises = items.filter((item) => 'type' in item);
        expect(exercises.map((item) => item.type)).toContain('choice');
        expect(exercises.map((item) => item.type)).toContain('build');
        expect(new Set(exercises.map((item) => item.exampleId)).size).toBe(exercises.length);
      }
    }
  });

  it('сохраняет практику множественного числа и небольшие блоки', () => {
    const block = grammarLessons[0].blocks[0];
    expect(mixedBlockItems(block, constantRandom)).toHaveLength(3);
    expect(
      grammarQuestions(blockItems(block, 'choice', constantRandom)).every(
        (item) => item.kind === 'plural',
      ),
    ).toBe(true);
    const small = { ...block, examples: block.examples.slice(0, 1) } as typeof block;
    expect(mixedBlockItems(small)).toHaveLength(1);
  });

  it('в начале сборки меняет исходный порядок слов даже при неизменённой перестановке', () => {
    const question = prepareGrammarQuestion(repeated, () => 0.999);
    expect(question.kind).toBe('build');
    if (question.kind === 'build') expect(question.wordOrder).not.toEqual([0, 1, 2]);
  });

  it('принимает все разговорные альтернативы и показывает выбранную форму в образце', () => {
    for (const block of auxiliary.blocks) {
      for (const exercise of block.exercises ?? []) {
        if (exercise.type !== 'choice') continue;
        const question = prepareGrammarQuestion(exercise);
        for (const answer of exercise.answers) {
          expect(evaluateAnswer(question, answer)).toEqual({
            good: true,
            value: answer,
            sentence: exercise.prompt.replace('___', answer),
          });
        }
      }
    }
  });
});

describe('состояние занятия', () => {
  it('не позволяет перейти до ответа или начислить один ответ повторно', () => {
    const question = alphabetQuestions([alphabet[0]], alphabet)[0];
    const initial = session([question]);
    expect(sessionReducer(initial, { type: 'next' })).toBe(initial);
    const answered = sessionReducer(initial, { type: 'choose', value: alphabet[0].sound })!;
    expect(answered.correct).toBe(1);
    expect(sessionReducer(answered, { type: 'choose', value: alphabet[0].sound })).toBe(answered);
    const completed = sessionReducer(answered, { type: 'next' })!;
    expect(completed.completed).toBe(true);
    expect(sessionReducer(completed, { type: 'next' })).toBe(completed);
  });

  it('не принимает значение, которого нет среди вариантов', () => {
    const initial = session(alphabetQuestions([alphabet[0]], alphabet));
    expect(sessionReducer(initial, { type: 'choose', value: 'invalid' })).toBe(initial);
  });

  it('работает с одинаковыми словами по отдельным позициям, поддерживает возврат и сброс', () => {
    let current = session([prepareGrammarQuestion(repeated)]);
    const questions = current.questions;
    current = sessionReducer(current, { type: 'add-word', index: 0 })!;
    expect(sessionReducer(current, { type: 'add-word', index: 0 })).toBe(current);
    expect(sessionReducer(current, { type: 'add-word', index: 99 })).toBe(current);
    expect(sessionReducer(current, { type: 'check-build' })).toBe(current);
    current = sessionReducer(current, { type: 'add-word', index: 1 })!;
    current = sessionReducer(current, { type: 'remove-word', index: 0 })!;
    expect(current.selectedWords).toEqual([1]);
    current = sessionReducer(current, { type: 'reset-words' })!;
    expect(current.selectedWords).toEqual([]);
    for (const index of [0, 1, 2]) current = sessionReducer(current, { type: 'add-word', index })!;
    current = sessionReducer(current, { type: 'check-build' })!;
    expect(current.answer?.good).toBe(true);
    expect(current.questions).toBe(questions);
    expect(sessionReducer(current, { type: 'remove-word', index: 0 })).toBe(current);
    expect(sessionReducer(current, { type: 'reset-words' })).toBe(current);
  });

  it('проверяет конкретный порядок слов и сохраняет ошибочный образец для повтора', () => {
    let current = session([prepareGrammarQuestion(repeated)]);
    for (const index of [2, 0, 1]) current = sessionReducer(current, { type: 'add-word', index })!;
    current = sessionReducer(current, { type: 'check-build' })!;
    expect(current.answer).toMatchObject({ good: false, sentence: repeated.sentence });
    expect(current.mistakes).toEqual(current.questions);
  });

  it('повтор ошибок сохраняет формат и разговорный образец, сбрасывая счёт занятия', () => {
    const exercise = sentenceBlock.exercises.find(
      (item) => item.type === 'build' && item.variant === 'colloquial',
    )!;
    const original = prepareGrammarQuestion(exercise);
    const repeatedQuestions = retryQuestions([original], constantRandom);
    expect(repeatedQuestions[0].kind).toBe('build');
    if (repeatedQuestions[0].kind === 'build') expect(repeatedQuestions[0].exercise).toBe(exercise);
    const previous = { ...session([original]), completed: true, mistakes: [original], correct: 0 };
    const retried = sessionReducer(previous, { type: 'retry', questions: repeatedQuestions })!;
    expect(retried).toMatchObject({
      id: previous.id,
      originPath: previous.originPath,
      completed: false,
      current: 0,
      correct: 0,
      mistakes: [],
      answer: null,
      mode: 'Повторение ошибок',
    });
  });

  it('переходит к следующему вопросу без перестановки очереди', () => {
    const questions = alphabetQuestions(alphabet.slice(0, 2), alphabet);
    const first = questions[0];
    if (first.kind === 'build') throw new Error('Expected choice');
    let current = sessionReducer(session(questions), {
      type: 'choose',
      value: acceptedAnswers(first)[0],
    })!;
    current = sessionReducer(current, { type: 'next' })!;
    expect(current.current).toBe(1);
    expect(current.answer).toBeNull();
    expect(current.questions).toBe(questions);
    expect(current.correct).toBe(1);
  });
});
