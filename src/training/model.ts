import type { Letter, LessonBlock, PluralExample, SentenceExercise } from '../data/types.ts';

export type Random = () => number;
export function shuffled<T>(items: readonly T[], random: Random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type GrammarItem = PluralExample | SentenceExercise;
export type Question =
  | { kind: 'letter'; letter: Letter; options: string[] }
  | { kind: 'plural'; example: PluralExample; options: string[] }
  | { kind: 'choice'; exercise: Extract<SentenceExercise, { type: 'choice' }>; options: string[] }
  | { kind: 'build'; exercise: Extract<SentenceExercise, { type: 'build' }>; wordOrder: number[] };

export function prepareGrammarQuestion(item: GrammarItem, random: Random = Math.random): Question {
  if ('singular' in item)
    return { kind: 'plural', example: item, options: shuffled([item.plural, item.wrong], random) };
  if (item.type === 'choice')
    return { kind: 'choice', exercise: item, options: shuffled(item.options, random) };
  const wordOrder = shuffled(
    item.words.map((_, index) => index),
    random,
  );
  if (wordOrder.length > 1 && wordOrder.every((index, position) => index === position))
    wordOrder.push(wordOrder.shift()!);
  return { kind: 'build', exercise: item, wordOrder };
}

export function alphabetQuestions(
  selected: readonly Letter[],
  alphabet: readonly Letter[],
  random: Random = Math.random,
): Question[] {
  return shuffled(selected, random).map((letter) => ({
    kind: 'letter',
    letter,
    options: shuffled(
      [
        letter.sound,
        ...shuffled(
          alphabet.filter((other) => other.sound !== letter.sound),
          random,
        )
          .slice(0, 3)
          .map((other) => other.sound),
      ],
      random,
    ),
  }));
}

export function blockItems(
  block: LessonBlock,
  mode: 'choice' | 'build' = 'choice',
  random: Random = Math.random,
): GrammarItem[] {
  return shuffled<GrammarItem>(
    block.exercises ? block.exercises.filter((item) => item.type === mode) : block.examples,
    random,
  ).slice(0, 6);
}

export function mixedBlockItems(block: LessonBlock, random: Random = Math.random): GrammarItem[] {
  if (!block.exercises) return shuffled(block.examples, random).slice(0, 3);
  const picked: SentenceExercise[] = [];
  for (const type of ['choice', 'build']) {
    const item = shuffled(
      block.exercises.filter(
        (exercise) =>
          exercise.type === type && !picked.some((other) => other.exampleId === exercise.exampleId),
      ),
      random,
    )[0];
    if (item) picked.push(item);
  }
  const remaining = shuffled(
    block.exercises.filter((item) => !picked.some((other) => other.exampleId === item.exampleId)),
    random,
  );
  for (const item of remaining) {
    if (picked.length >= 3) break;
    if (!picked.some((other) => other.exampleId === item.exampleId)) picked.push(item);
  }
  return picked;
}

export function grammarQuestions(
  items: readonly GrammarItem[],
  random: Random = Math.random,
): Question[] {
  return items.map((item) => prepareGrammarQuestion(item, random));
}

export function retryQuestions(
  mistakes: readonly Question[],
  random: Random = Math.random,
): Question[] {
  return shuffled(mistakes, random).map((question) => {
    if (question.kind === 'letter')
      return { ...question, options: shuffled(question.options, random) };
    return prepareGrammarQuestion(
      question.kind === 'plural' ? question.example : question.exercise,
      random,
    );
  });
}

export function acceptedAnswers(question: Exclude<Question, { kind: 'build' }>): string[] {
  if (question.kind === 'letter') return [question.letter.sound];
  if (question.kind === 'plural') return [question.example.plural];
  return question.exercise.answers;
}

export interface Answer {
  good: boolean;
  value: string;
  sentence: string;
}
export function evaluateAnswer(question: Question, value: string): Answer {
  const good =
    question.kind === 'build'
      ? value === question.exercise.sentence
      : acceptedAnswers(question).includes(value);
  const sentence =
    question.kind === 'choice'
      ? good
        ? question.exercise.prompt.replace('___', value)
        : question.exercise.sentence
      : question.kind === 'build'
        ? question.exercise.sentence
        : '';
  return { good, value, sentence };
}

export interface Session {
  id: string;
  originPath: string;
  kind: 'alphabet' | 'grammar';
  mode: string;
  questions: Question[];
  current: number;
  correct: number;
  mistakes: Question[];
  selectedWords: number[];
  answer: Answer | null;
  completed: boolean;
}
export type SessionSetup = Pick<Session, 'id' | 'originPath' | 'kind' | 'mode' | 'questions'>;
export function createSession(setup: SessionSetup): Session {
  return {
    ...setup,
    current: 0,
    correct: 0,
    mistakes: [],
    selectedWords: [],
    answer: null,
    completed: false,
  };
}

export type SessionAction =
  | { type: 'start'; session: Session }
  | { type: 'choose'; value: string }
  | { type: 'add-word' | 'remove-word'; index: number }
  | { type: 'reset-words' | 'check-build' | 'next' }
  | { type: 'retry'; questions: Question[] };

function recordAnswer(session: Session, question: Question, value: string): Session {
  const answer = evaluateAnswer(question, value);
  return {
    ...session,
    answer,
    correct: session.correct + Number(answer.good),
    mistakes: answer.good ? session.mistakes : [...session.mistakes, question],
  };
}

export function sessionReducer(session: Session | null, action: SessionAction): Session | null {
  if (action.type === 'start') return action.session.questions.length ? action.session : session;
  if (!session) return session;
  if (action.type === 'retry') {
    if (!session.completed || !session.mistakes.length || !action.questions.length) return session;
    return createSession({ ...session, mode: 'Повторение ошибок', questions: action.questions });
  }
  if (session.completed) return session;
  const question = session.questions[session.current];
  if (action.type === 'next') {
    if (!session.answer) return session;
    return session.current === session.questions.length - 1
      ? { ...session, completed: true }
      : { ...session, current: session.current + 1, selectedWords: [], answer: null };
  }
  if (session.answer) return session;
  if (action.type === 'choose') {
    return question.kind !== 'build' && question.options.includes(action.value)
      ? recordAnswer(session, question, action.value)
      : session;
  }
  if (question.kind !== 'build') return session;
  if (action.type === 'add-word') {
    if (
      !Number.isInteger(action.index) ||
      action.index < 0 ||
      action.index >= question.exercise.words.length ||
      session.selectedWords.includes(action.index)
    )
      return session;
    return { ...session, selectedWords: [...session.selectedWords, action.index] };
  }
  if (action.type === 'remove-word')
    return {
      ...session,
      selectedWords: session.selectedWords.filter((index) => index !== action.index),
    };
  if (action.type === 'reset-words') return { ...session, selectedWords: [] };
  if (
    action.type === 'check-build' &&
    session.selectedWords.length === question.exercise.words.length
  ) {
    return recordAnswer(
      session,
      question,
      session.selectedWords.map((index) => question.exercise.words[index]).join(' '),
    );
  }
  return session;
}
