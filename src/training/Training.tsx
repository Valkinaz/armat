import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useAppState } from '../app/AppState.tsx';
import { useStartPractice } from '../app/useStartPractice.ts';
import {
  selectedVocabularyEntries,
  vocabularyDirectionLabels,
  vocabularyQuestions,
} from '../vocabulary/model.ts';
import { VocabularyList } from '../vocabulary/VocabularyList.tsx';
import { Colloquial } from '../shared/Colloquial.tsx';
import { Feedback } from '../shared/Feedback.tsx';
import { Progress } from '../shared/Progress.tsx';
import { Result } from '../shared/Result.tsx';
import { acceptedAnswers, retryQuestions } from './model.ts';
import type { Session } from './model.ts';
import { BuildAnswer } from './BuildAnswer.tsx';

export function Training({ session }: { session: Session }) {
  const { dispatch } = useAppState();
  const startPractice = useStartPractice();
  const location = useLocation();
  const questionRoot = useRef<HTMLElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const alphabet = session.kind === 'alphabet';
  const vocabulary = session.kind === 'vocabulary';
  const vocabularySettings = session.vocabulary;
  const question = session.questions[session.current];
  const answer = session.answer;
  const answered = Boolean(answer);

  useLayoutEffect(() => {
    document.title =
      (session.completed
        ? alphabet || vocabulary
          ? 'Тренировка завершена'
          : 'Практика завершена'
        : alphabet
          ? 'Тренировка букв'
          : vocabulary
            ? 'Тренировка слов'
            : session.mode) + ' — Արմատ';
    if (session.completed) resultHeading.current?.focus();
    else if (answered) nextButton.current?.focus();
    else
      (
        questionRoot.current?.querySelector<HTMLButtonElement>(
          '.option, .word-bank button:not(:disabled), .build-actions .primary:not(:disabled)',
        ) || questionRoot.current
      )?.focus();
  }, [location.key, session.current, session.completed, session.mode, answered, alphabet, vocabulary]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.key]);

  if (session.completed)
    return (
      <Result
        kind={session.kind}
        headingRef={resultHeading}
        correct={session.correct}
        total={session.questions.length}
        originPath={session.originPath}
        onRestart={
          vocabularySettings
            ? () => startPractice('vocabulary', vocabularyQuestions(vocabularySettings), '', vocabularySettings)
            : undefined
        }
        onRetry={
          !alphabet && session.mistakes.length
            ? () => dispatch({ type: 'retry', questions: retryQuestions(session.mistakes) })
            : undefined
        }
      />
    );

  const building = question.kind === 'build';
  const sentenceQuestion = question.kind === 'choice' || building;
  const item =
    question.kind === 'plural' ? question.example : sentenceQuestion ? question.exercise : null;
  const prompt =
    question.kind === 'plural'
      ? question.example.singular
      : question.kind === 'choice'
        ? question.exercise.prompt
        : question.kind === 'vocabulary'
          ? question.prompt
          : '';
  const feedback = !answer
    ? ''
    : answer.good
      ? alphabet
        ? 'Верно! Отлично.'
        : 'Верно!'
      : question.kind === 'letter'
        ? 'Почти — правильный ответ: ' + question.letter.sound
        : question.kind === 'plural'
          ? 'Правильно: ' + question.example.plural
          : building
            ? 'Порядок слов отличается от образца'
            : vocabulary
              ? 'Правильный перевод:'
              : 'Правильный образец:';
  const progressWord = alphabet ? 'Буква' : vocabulary ? 'Вопрос' : sentenceQuestion ? 'Задание' : 'Слово';
  const wordQuestion = question.kind === 'vocabulary' ? question : null;
  const wordMeanings = wordQuestion?.direction === 'hy-ru' ? wordQuestion.entries[0].meanings : [prompt];
  const wordExplanation =
    wordQuestion?.direction === 'hy-ru'
      ? selectedVocabularyEntries(vocabularySettings?.setIds ?? []).filter((entry) =>
          entry.meanings.some((meaning) => wordMeanings.includes(meaning)),
        )
      : wordQuestion?.entries ?? [];
  const optionLanguage = alphabet || wordQuestion?.direction === 'hy-ru' ? 'ru' : 'hy';

  return (
    <section
      ref={questionRoot}
      tabIndex={-1}
      className={alphabet ? 'training active' : vocabulary ? 'vocabulary-training' : 'grammar-training'}
      aria-label={alphabet ? 'Тренировка букв' : vocabulary ? 'Тренировка слов' : 'Практика грамматики'}
    >
      <Link className="back" to={session.originPath} state={null}>
        {alphabet ? '← К выбору букв' : vocabulary ? '← К выбору наборов' : '← К уроку'}
      </Link>
      <Progress
        label={progressWord + ' ' + (session.current + 1) + ' из ' + session.questions.length}
        value={session.current + (!alphabet && answered ? 1 : 0)}
        total={session.questions.length}
      />
      <div className="question-card">
        {!alphabet && session.mode && <p className="eyebrow">{session.mode}</p>}
        {wordQuestion && (
          <p className="vocabulary-direction">{vocabularyDirectionLabels[wordQuestion.direction]}</p>
        )}
        <p className="prompt">
          {alphabet
            ? 'Как произносится эта буква?'
            : wordQuestion
              ? wordQuestion.answers.length > 1
                ? 'Выбери любой подходящий вариант'
                : 'Выбери перевод'
              : building
                ? 'Собери предложение по образцу урока'
                : question.kind === 'choice'
                  ? 'Выбери подходящую форму глагола'
                  : 'Выбери форму множественного числа'}
        </p>
        {building && question.exercise.variant === 'colloquial' && (
          <p className="colloquial">Разговорный вариант</p>
        )}
        {question.kind === 'letter' ? (
          <div className="training-glyph" lang="hy">
            {question.letter.upper} {question.letter.lower}
          </div>
        ) : (
          !building && (
            <div
              className={
                wordQuestion
                  ? 'vocabulary-prompt'
                  : 'grammar-prompt' + (sentenceQuestion ? ' sentence' : prompt.length > 6 ? ' long' : '')
              }
              lang={wordQuestion?.direction === 'ru-hy' ? 'ru' : 'hy'}
            >
              {prompt}
            </div>
          )
        )}
        {item && <p className="grammar-translation">{item.ru}</p>}
        {building ? (
          <BuildAnswer
            question={question}
            selectedWords={session.selectedWords}
            answered={answered}
            dispatch={dispatch}
          />
        ) : (
          <div className="options">
            {question.options.map((value) => (
              <button
                key={value}
                lang={optionLanguage}
                className={
                  'option' +
                  (answer
                    ? acceptedAnswers(question).includes(value)
                      ? ' correct'
                      : value === answer.value
                        ? ' wrong'
                        : ''
                    : '')
                }
                disabled={answered}
                onClick={() => dispatch({ type: 'choose', value })}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        <Feedback good={answer?.good}>{feedback}</Feedback>
        {answer && wordQuestion && (
          <div className="vocabulary-explanation">
            <VocabularyList entries={wordExplanation} />
          </div>
        )}
        {answer && item && (
          <>
            {answer.sentence && (
              <p className="grammar-answer" lang="hy">
                {answer.sentence}
              </p>
            )}
            <p className="grammar-explanation">{item.note}</p>
            {'colloquial' in item && <Colloquial sentence={item.colloquial} />}
          </>
        )}
      </div>
      {answered && (
        <div className="next-row">
          <button ref={nextButton} className="primary" onClick={() => dispatch({ type: 'next' })}>
            {session.current === session.questions.length - 1
              ? 'Посмотреть результат'
              : alphabet
                ? 'Следующая буква →'
                : vocabulary
                  ? 'Следующий вопрос →'
                  : sentenceQuestion
                    ? 'Следующее задание →'
                    : 'Следующее слово →'}
          </button>
        </div>
      )}
    </section>
  );
}
