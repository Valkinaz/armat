import { vocabularyEntries, vocabularySets } from '../data/vocabulary.ts';
import type {
  VocabularyDirection,
  VocabularyEntry,
  VocabularySet,
  VocabularySettings,
} from '../data/types.ts';
import { shuffled } from '../training/model.ts';
import type { Random } from '../training/model.ts';

export const vocabularyDirectionLabels: Record<VocabularyDirection, string> = {
  'hy-ru': 'Армянский → русский',
  'ru-hy': 'Русский → армянский',
};

export interface VocabularyQuestion {
  kind: 'vocabulary';
  direction: VocabularyDirection;
  prompt: string;
  answers: string[];
  entries: VocabularyEntry[];
  options: string[];
}

export function selectedVocabularyEntries(
  setIds: readonly string[],
  entries: readonly VocabularyEntry[] = vocabularyEntries,
  sets: readonly VocabularySet[] = vocabularySets,
): VocabularyEntry[] {
  const ids = new Set(sets.filter((set) => setIds.includes(set.id)).flatMap((set) => set.entryIds));
  return entries.filter((entry) => ids.has(entry.id));
}

function vocabularyItems(
  entries: readonly VocabularyEntry[],
  direction: VocabularyDirection,
): Omit<VocabularyQuestion, 'options'>[] {
  if (direction === 'hy-ru')
    return entries.map((entry) => ({
      kind: 'vocabulary',
      direction,
      prompt: entry.hy,
      answers: [entry.meanings.join('; ')],
      entries: [entry],
    }));
  return [...new Set(entries.flatMap((entry) => entry.meanings))].map((meaning) => {
    const matching = entries.filter((entry) => entry.meanings.includes(meaning));
    return {
      kind: 'vocabulary',
      direction,
      prompt: meaning,
      answers: matching.map((entry) => entry.hy),
      entries: matching,
    };
  });
}

export function vocabularyQuestionCount(settings: VocabularySettings): number {
  const count = vocabularyItems(selectedVocabularyEntries(settings.setIds), settings.direction).length;
  return settings.size === 'all' ? count : Math.min(settings.size, count);
}

export function vocabularyQuestions(
  settings: VocabularySettings,
  random: Random = Math.random,
  entries: readonly VocabularyEntry[] = vocabularyEntries,
  sets: readonly VocabularySet[] = vocabularySets,
): VocabularyQuestion[] {
  const selected = selectedVocabularyEntries(settings.setIds, entries, sets);
  const items = shuffled(vocabularyItems(selected, settings.direction), random);
  return (settings.size === 'all' ? items : items.slice(0, settings.size)).map((item) => {
    const meanings = item.direction === 'hy-ru' ? item.entries[0].meanings : [item.prompt];
    const sameTopicIds = new Set(
      sets.filter((set) =>
        settings.setIds.includes(set.id) &&
        item.entries.some((entry) => set.entryIds.includes(entry.id)),
      )
        .flatMap((set) => set.entryIds),
    );
    // Даже частично совпадающий перевод не может быть отвлекающим вариантом.
    const wrong = selected.filter((entry) =>
      !entry.meanings.some((meaning) => meanings.includes(meaning)),
    );
    const candidates = [
      ...shuffled(wrong.filter((entry) => sameTopicIds.has(entry.id)), random),
      ...shuffled(wrong.filter((entry) => !sameTopicIds.has(entry.id)), random),
    ].map((entry) => (item.direction === 'hy-ru' ? entry.meanings.join('; ') : entry.hy));
    const distractors = [...new Set(candidates)].filter((value) => !item.answers.includes(value));
    return {
      ...item,
      options: shuffled(
        [...item.answers, ...distractors.slice(0, Math.max(0, 4 - item.answers.length))],
        random,
      ),
    };
  });
}
