import { describe, expect, it } from 'vitest';
import { vocabularyEntries, vocabularySets } from '../data/vocabulary.ts';
import type { VocabularyDirection, VocabularyEntry, VocabularySet, VocabularySettings } from '../data/types.ts';
import { acceptedAnswers, createSession, evaluateAnswer, retryQuestions, sessionReducer } from '../training/model.ts';
import { selectedVocabularyEntries, vocabularyQuestionCount, vocabularyQuestions } from './model.ts';

const random = () => 0.3;
function settings(direction: VocabularyDirection, setIds = vocabularySets.map((set) => set.id)): VocabularySettings {
  return { setIds, direction, size: 'all' };
}

describe('словарные вопросы', () => {
  for (const direction of ['hy-ru', 'ru-hy'] as const) {
    it(`${direction}: полный проход охватывает выбранный материал без повторов и изменения источника`, () => {
      const before = structuredClone({ vocabularyEntries, vocabularySets });
      const setup = settings(direction, ['weekdays', 'family']);
      const entries = selectedVocabularyEntries(setup.setIds);
      const questions = vocabularyQuestions(setup, random);
      const expected = direction === 'hy-ru' ? entries.map((entry) => entry.hy)
        : [...new Set(entries.flatMap((entry) => entry.meanings))];
      expect(questions.map((question) => question.prompt).sort()).toEqual(expected.sort());
      expect(vocabularyQuestionCount(setup)).toBe(questions.length);
      expect(questions.every((question) => question.direction === direction)).toBe(true);
      expect({ vocabularyEntries, vocabularySets }).toEqual(before);
    });

    it(`${direction}: варианты уникальны, принимаются все допустимые формы, неправильные не пересекаются по смыслу`, () => {
      for (const question of vocabularyQuestions(settings(direction), random)) {
        expect(new Set(question.options).size).toBe(question.options.length);
        expect(question.options).toHaveLength(4);
        for (const answer of question.answers) {
          expect(question.options).toContain(answer);
          expect(evaluateAnswer(question, answer).good).toBe(true);
        }
        const sourceMeanings = direction === 'hy-ru' ? question.entries[0].meanings : [question.prompt];
        for (const option of question.options.filter((value) => !question.answers.includes(value))) {
          expect(evaluateAnswer(question, option).good).toBe(false);
          const candidates = vocabularyEntries.filter((entry) =>
            (direction === 'hy-ru' ? entry.meanings.join('; ') : entry.hy) === option);
          expect(candidates.length).toBeGreaterThan(0);
          expect(candidates.some((entry) => entry.meanings.some((meaning) => sourceMeanings.includes(meaning)))).toBe(false);
        }
      }
    });

    it(`${direction}: короткая сессия ограничена 20 вопросами и не дополняет небольшой набор`, () => {
      const setup = { ...settings(direction), size: 20 as const };
      const complete = vocabularyQuestions(settings(direction), random);
      const short = vocabularyQuestions(setup, random);
      expect(short).toHaveLength(20);
      expect(new Set(short.map((question) => question.prompt)).size).toBe(short.length);
      expect(short.every((question) => complete.some((item) => item.prompt === question.prompt))).toBe(true);
      expect(vocabularyQuestionCount(setup)).toBe(short.length);
      const small = { ...setup, setIds: ['weekdays'] };
      expect(vocabularyQuestions(small, random)).toHaveLength(vocabularyQuestionCount(small));
      expect(vocabularyQuestions({ ...setup, setIds: [] }, random)).toEqual([]);
      expect(vocabularyQuestionCount({ ...setup, setIds: [] })).toBe(0);
    });
  }

  it('сохраняет оба значения շաբաթ и задаёт их отдельно в обратном направлении', () => {
    const forward = vocabularyQuestions(settings('hy-ru', ['weekdays']), random);
    expect(forward.filter((question) => question.prompt === 'շաբաթ')).toHaveLength(1);
    expect(forward.find((question) => question.prompt === 'շաբաթ')?.answers).toEqual(['неделя; суббота']);
    const reverse = vocabularyQuestions(settings('ru-hy', ['weekdays']), random);
    for (const meaning of ['неделя', 'суббота'])
      expect(reverse.find((question) => question.prompt === meaning)?.answers).toEqual(['շաբաթ']);
  });

  it('принимает оба перевода для ներեցեք и կներեք в обоих направлениях', () => {
    const forward = vocabularyQuestions(settings('hy-ru', ['greetings']), random);
    for (const hy of ['ներեցեք', 'կներեք']) {
      const question = forward.find((item) => item.prompt === hy)!;
      expect(question.entries[0].meanings).toEqual(expect.arrayContaining(['Простите', 'Извините']));
      expect(question.answers[0]).toContain('Простите');
      expect(question.answers[0]).toContain('Извините');
    }

    const reverse = vocabularyQuestions(settings('ru-hy', ['greetings']), random);
    for (const meaning of ['Простите', 'Извините']) {
      const question = reverse.find((item) => item.prompt === meaning)!;
      expect(question.answers).toEqual(expect.arrayContaining(['ներեցեք', 'կներեք']));
      for (const hy of ['ներեցեք', 'կներեք'])
        expect(evaluateAnswer(question, hy).good).toBe(true);
    }
  });

  it('объединяет разговорные формы по значению и сохраняет уточнения родства', () => {
    const reverse = vocabularyQuestions(settings('ru-hy', ['family', 'extended-family']), random);
    expect(reverse.filter((question) => question.prompt === 'брат')).toHaveLength(1);
    expect(reverse.find((question) => question.prompt === 'брат')?.answers).toEqual(['եղբայր', 'ախպեր']);
    expect(reverse.find((question) => question.prompt === 'тётя (папина сестра)')?.answers)
      .toEqual(['հորաքույր', 'հորքուր']);
    expect(reverse.find((question) => question.prompt === 'тётя (мамина сестра)')?.answers)
      .toEqual(['մորաքույր', 'մորքուր']);
    const forward = vocabularyQuestions(settings('hy-ru', ['family', 'extended-family']), random);
    for (const entry of selectedVocabularyEntries(['family', 'extended-family']).filter((entry) => entry.colloquial)) {
      const question = forward.find((question) => question.prompt === entry.hy)!;
      expect(question.entries).toContain(entry);
      expect(question.answers).toEqual([entry.meanings.join('; ')]);
      const back = reverse.find((question) => question.prompt === entry.meanings[0])!;
      expect(back.answers).toContain(entry.hy);
      expect(back.entries).toContain(entry);
      expect(back.answers.length).toBeGreaterThan(1);
    }
  });

  it('берёт неправильные варианты из той же темы, когда их достаточно', () => {
    for (const direction of ['hy-ru', 'ru-hy'] as const) {
      for (const question of vocabularyQuestions(settings(direction), random)) {
        const topic = vocabularySets.find((set) => set.entryIds.includes(question.entries[0].id))!;
        const topicEntries = selectedVocabularyEntries([topic.id]);
        const values = topicEntries.map((entry) => direction === 'hy-ru' ? entry.meanings.join('; ') : entry.hy);
        expect(question.options.every((option) => values.includes(option))).toBe(true);
      }
    }
  });

  it('дополняет маленькую тему только из выбранных наборов и не дублирует общие записи', () => {
    const entries: VocabularyEntry[] = [
      { id: 'a', hy: 'ա', meanings: ['один', 'первый'] },
      { id: 'overlap', hy: 'բ', meanings: ['первый', 'начальный'] },
      { id: 'b', hy: 'գ', meanings: ['два'] },
      { id: 'c', hy: 'դ', meanings: ['три'] },
      { id: 'd', hy: 'ե', meanings: ['четыре'] },
    ];
    const sets: VocabularySet[] = [
      { id: 'one', title: 'Один', entryIds: ['a', 'overlap', 'b'] },
      { id: 'two', title: 'Два', entryIds: ['a', 'c'] },
      { id: 'unused', title: 'Не выбран', entryIds: ['d'] },
    ];
    const setup = settings('hy-ru', ['one', 'two']);
    const questions = vocabularyQuestions(setup, random, entries, sets);
    expect(questions).toHaveLength(4);
    expect(questions.filter((question) => question.prompt === 'ա')).toHaveLength(1);
    expect(questions.find((question) => question.prompt === 'ա')?.options.sort())
      .toEqual(['один; первый', 'два', 'три'].sort());
    const small = vocabularyQuestions(settings('hy-ru', ['one']), random, entries, sets);
    expect(small.find((question) => question.prompt === 'ա')?.options.sort()).toEqual(['один; первый', 'два'].sort());
  });

  it('новый запуск перемешивает порядок и может обновить короткую выборку', () => {
    const setup = { ...settings('hy-ru'), size: 20 as const };
    const first = vocabularyQuestions(setup, () => 0.1).map((question) => question.prompt);
    const second = vocabularyQuestions(setup, () => 0.9).map((question) => question.prompt);
    expect(first).not.toEqual(second);
    expect([...first].sort()).not.toEqual([...second].sort());
  });
});

describe('словарная сессия', () => {
  it('сохраняет снимок настроек, направление и ответы при повторении ошибки', () => {
    const setup = settings('ru-hy', ['family']);
    const question = vocabularyQuestions(setup, random).find((item) => item.prompt === 'брат')!;
    const original = createSession({ id: 'words', originPath: '/words', kind: 'vocabulary', mode: '',
      questions: [question], vocabulary: setup });
    setup.setIds.push('months');
    setup.direction = 'hy-ru';
    expect(original.vocabulary).toEqual(settings('ru-hy', ['family']));
    const wrong = question.options.find((option) => !acceptedAnswers(question).includes(option))!;
    const answered = sessionReducer(original, { type: 'choose', value: wrong })!;
    expect(sessionReducer(answered, { type: 'choose', value: question.answers[0] })).toBe(answered);
    const completed = sessionReducer(answered, { type: 'next' })!;
    const questions = retryQuestions(completed.mistakes, random);
    const retried = sessionReducer(completed, { type: 'retry', questions })!;
    expect(retried.vocabulary).toEqual(original.vocabulary);
    expect(retried).toMatchObject({ id: original.id, current: 0, correct: 0, answer: null, completed: false });
    expect(retried.questions[0]).toMatchObject({ direction: 'ru-hy', prompt: 'брат', answers: question.answers, entries: question.entries });
    const fixed = sessionReducer(retried, { type: 'choose', value: 'ախպեր' })!;
    expect(fixed.correct).toBe(1);
    expect(fixed.mistakes).toEqual([]);
  });
});


describe('наборы местоимений', () => {
  const ids = ['personal-pronouns', 'possessive-pronouns'];
  it('содержат только согласованные формы и разделяют направления перевода', () => {
    const forward = vocabularyQuestions(settings('hy-ru', ids), random);
    expect(forward).toHaveLength(16);
    expect(forward.find((q) => q.prompt === 'նա')?.answers).toEqual(['он; она']);
    expect(forward.find((q) => q.prompt === 'նրա')?.answers).toEqual(['его; её']);
    const reverse = vocabularyQuestions(settings('ru-hy', ids), random);
    expect(reverse).toHaveLength(14);
    for (const meaning of ['он', 'она'])
      expect(reverse.find((q) => q.prompt === meaning)?.answers).toEqual(['նա', 'ինքը']);
    for (const meaning of ['его', 'её'])
      expect(reverse.find((q) => q.prompt === meaning)?.answers).toEqual(['նրա', 'իրա']);
    expect(reverse.find((q) => q.prompt === 'они')?.answers).toEqual(['նրանք', 'իրանք']);
    expect(reverse.find((q) => q.prompt === 'их')?.answers).toEqual(['նրանց', 'իրանց']);
    expect(selectedVocabularyEntries(ids).filter((entry) => entry.colloquial)).toHaveLength(4);
    expect(new Set(forward.map((q) => q.prompt)).size).toBe(16);
  });
});

describe('расширенные тематические наборы', () => {
  it('сохраняет все прежние семейные записи, разделяя их без дубликатов', () => {
    const close = vocabularySets.find((set) => set.id === 'family')!;
    const other = vocabularySets.find((set) => set.id === 'extended-family')!;
    expect(close.entryIds.filter((id) => other.entryIds.includes(id))).toEqual([]);
    expect([...close.entryIds, ...other.entryIds].sort()).toEqual([
      'family', 'father', 'mother', 'sister', 'brother', 'brother-colloquial',
      'daughter', 'daughter-colloquial', 'son', 'son-colloquial', 'grandmother', 'grandfather',
      'paternal-aunt', 'paternal-aunt-colloquial', 'maternal-aunt', 'maternal-aunt-colloquial',
      'paternal-uncle', 'paternal-uncle-colloquial', 'maternal-uncle', 'maternal-uncle-colloquial',
      'son-in-law', 'daughter-in-law', 'wifes-father', 'wifes-mother',
      'husbands-mother', 'husbands-mother-colloquial', 'husbands-father', 'husbands-father-colloquial',
      'godfather', 'godfather-colloquial', 'godmother', 'godmother-colloquial',
      'husband', 'wife', 'grandchild', 'parent',
    ].sort());
    const forward = vocabularyQuestions(settings('hy-ru', ['family', 'extended-family']), random);
    for (const [hy, answer] of [
      ['ամուսին', 'муж'], ['կին', 'жена; женщина'], ['թոռ', 'внук; внучка'], ['ծնող', 'родитель'],
      ['հարս', 'невеста; невестка'], ['տղա', 'сын; мальчик'], ['աղջիկ', 'дочь; девочка; девушка'],
    ]) expect(forward.find((q) => q.prompt === hy)?.answers).toEqual([answer]);
    expect(selectedVocabularyEntries(['family', 'extended-family']).filter((entry) => entry.colloquial))
      .toHaveLength(11);
  });

  it('принимает оба перевода «красивый» и исключает их из неправильных вариантов', () => {
    const reverse = vocabularyQuestions(settings('ru-hy', ['qualities']), random);
    const beautiful = reverse.find((q) => q.prompt === 'красивый')!;
    expect(beautiful.answers).toEqual(['գեղեցիկ', 'սիրուն']);
    for (const answer of beautiful.answers) expect(evaluateAnswer(beautiful, answer).good).toBe(true);
    const forward = vocabularyQuestions(settings('hy-ru', ['qualities']), random);
    for (const hy of beautiful.answers) {
      const question = forward.find((q) => q.prompt === hy)!;
      expect(question.answers).toEqual(['красивый']);
      expect(question.options.filter((option) => option === 'красивый')).toHaveLength(1);
    }
    for (const meaning of ['правильный', 'прав'])
      expect(reverse.find((q) => q.prompt === meaning)?.answers).toEqual(['ճիշտ']);
  });

  it('сохраняет армянскую вопросительную пунктуацию и пометки разговорных указательных слов', () => {
    const ids = ['demonstratives-and-questions'];
    const reverse = vocabularyQuestions(settings('ru-hy', ids), random);
    expect(reverse.find((q) => q.prompt === 'кто')?.answers).toEqual(['ո՞վ']);
    expect(reverse.find((q) => q.prompt === 'что')?.answers).toEqual(['ի՞նչ']);
    for (const [meaning, standard, colloquial] of [['этот', 'այս', 'էս'], ['тот', 'այն', 'էն']]) {
      const question = reverse.find((q) => q.prompt === meaning)!;
      expect(question.answers).toEqual([standard, colloquial]);
      expect(question.entries.find((entry) => entry.hy === colloquial)?.colloquial).toBe(true);
      expect(question.entries.find((entry) => entry.hy === standard)?.colloquial).toBeUndefined();
    }
  });
});
