export interface Letter {
  upper: string;
  lower: string;
  sound: string;
}

export interface PluralExample {
  singular: string;
  plural: string;
  wrong: string;
  ru: string;
  note: string;
}

export interface SentenceExample {
  id: string;
  person?: string;
  form: string;
  sentence: string;
  ru: string;
  note: string;
  colloquial?: string;
  verbIndex?: number;
}

interface ExerciseBase {
  id: string;
  exampleId: string;
  sentence: string;
  ru: string;
  note: string;
  colloquial?: string;
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  prompt: string;
  answers: string[];
  options: string[];
}

export interface BuildExercise extends ExerciseBase {
  type: 'build';
  words: string[];
  variant?: 'colloquial';
}

export type SentenceExercise = ChoiceExercise | BuildExercise;

interface BlockBase {
  id: string;
  title: string;
  rule: string;
  detail: string;
}

export interface PluralBlock extends BlockBase {
  examples: PluralExample[];
  exercises?: never;
}

export interface SentenceBlock extends BlockBase {
  examples: SentenceExample[];
  exercises: SentenceExercise[];
}

export type LessonBlock = PluralBlock | SentenceBlock;

export interface Lesson {
  id: string;
  title: string;
  lead: string;
  intro?: string;
  blocks: LessonBlock[];
}

export type SentenceLessonSource = Omit<Lesson, 'blocks'> & {
  blocks: Omit<SentenceBlock, 'exercises'>[];
};
