import type { Lesson, SentenceExercise, SentenceLessonSource } from './types.ts';

// Правила генерации сохраняют образцы канонического материала урока.
export function createSentenceLesson(source: SentenceLessonSource): Lesson {
  return {
    ...source,
    blocks: source.blocks.map((block) => ({
      ...block,
      exercises: block.examples.flatMap((example) => {
        const words = example.sentence.split(' ');
        const verbIndex = example.verbIndex ?? words.length - 1;
        const promptWords = [...words];
        promptWords[verbIndex] = promptWords[verbIndex].replace(example.form, '___');
        const answers =
          example.form === 'է' ? ['է', 'ա'] : example.form === 'չէ' ? ['չէ', 'չի'] : [example.form];
        const forms = example.form.startsWith('չ')
          ? ['չեմ', 'չես', 'չէ', 'չենք', 'չեք', 'չեն']
          : ['եմ', 'ես', 'է', 'ենք', 'եք', 'են'];
        const position = forms.indexOf(example.form);
        const distractors = [...forms.slice(position + 1), ...forms.slice(0, position)].filter(
          (form) => !answers.includes(form),
        );
        const shared = {
          exampleId: example.id,
          sentence: example.sentence,
          ru: example.ru,
          note: example.note,
          colloquial: example.colloquial,
        };
        const exercises: SentenceExercise[] = [
          {
            ...shared,
            id: example.id + '-choice',
            type: 'choice',
            prompt: promptWords.join(' '),
            answers,
            options: [...answers, ...distractors.slice(0, 4 - answers.length)],
          },
          { ...shared, id: example.id + '-build', type: 'build', words },
        ];
        if (example.colloquial) {
          exercises.push({
            ...shared,
            id: example.id + '-build-colloquial',
            type: 'build',
            variant: 'colloquial',
            sentence: example.colloquial,
            words: example.colloquial.split(' '),
          });
        }
        return exercises;
      }),
    })),
  };
}
